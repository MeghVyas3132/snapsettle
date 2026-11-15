// Generic ERC-7683 solver for Snapsettle. It knows nothing about Snapsettle's contracts: for every `Opened`
// order it asks the resolver (eth_call) for the standard order description, vets the named assumptions
// against its whitelist, builds the fill call from the resolved step, and executes it from its own inventory.
// Repayment arrives on the origin chain when Reactive observes the fill.
import { decodeFunctionData, encodeAbiParameters, hexToBigInt, maxUint256, size, slice, type Address, type Hex } from "viem";
import { ENV, chains, pub, addr, abi, wallet, ORDER_TUPLE, evidenceDir, appendJsonl, sleep, now, type OrderData } from "./common.ts";

const solverDest = wallet("solver", "dest");
const solverAddr = solverDest.account!.address;
const repayTo = (process.env.SOLVER_REPAY_TO as Address) ?? solverAddr;
const log = `${evidenceDir("solver")}/fills.jsonl`;

// Whitelisted assumptions: only fill orders settled by our reactive contract on Lasna.
const TRUSTED_SETTLEMENT = encodeAbiParameters([{ type: "uint256" }, { type: "address" }], [BigInt(chains.lasna.id), addr.reactive]).toLowerCase();

type Resolved = { steps: Hex[]; variables: Hex[]; payments: Hex[]; assumptions: { name: string; data: Hex }[] };

/** ERC-7930: version(2) | chainType(2) | refLen(1) | ref | addrLen(1) | addr */
function parseInterop(b: Hex): { chainId: bigint; address: Address } {
  const refLen = Number(hexToBigInt(slice(b, 4, 5)));
  const chainId = hexToBigInt(slice(b, 5, 5 + refLen));
  const addrLen = Number(hexToBigInt(slice(b, 5 + refLen, 6 + refLen)));
  return { chainId, address: slice(b, 6 + refLen, 6 + refLen + addrLen) as Address };
}

/** Strips the ERC-7683 framing ("", value) from a static value. */
const unframe = (framed: Hex): Hex => slice(framed, 32, size(framed) - 32);

async function fillOrder(orderId: Hex, order: OrderData, seenAt: number) {
  const resolved = (await pub.origin.readContract({
    address: addr.resolver, abi: abi.resolver, functionName: "resolve",
    args: [encodeAbiParameters([{ type: "bytes32" }, ORDER_TUPLE], [orderId, order])],
  })) as Resolved;

  const settlement = resolved.assumptions.find((a) => a.name === "reactive-settlement");
  if (!settlement || settlement.data.toLowerCase() !== TRUSTED_SETTLEMENT) throw new Error("untrusted settlement assumption");
  for (const a of resolved.assumptions) {
    if (!["reactive-settlement", "reactive-origin-finality"].includes(a.name)) throw new Error(`unknown assumption ${a.name}`);
  }

  const step = decodeFunctionData({ abi: abi.step, data: resolved.steps[0] });
  const [targetIa, selector, args] = step.args as [Hex, Hex, Hex[], Hex[]];
  const target = parseInterop(targetIa);
  if (target.chainId !== BigInt(chains.dest.id)) throw new Error("step targets an unexpected chain");

  // Variable 0 is PaymentRecipient: our repayment address on the origin chain.
  let data: Hex = selector;
  for (const a of args) {
    const piece = size(a) === 32 ? encodeAbiParameters([{ type: "address" }], [repayTo]) : unframe(a);
    data = (data + piece.slice(2)) as Hex;
  }

  const hash = await solverDest.sendTransaction({ to: target.address, data, chain: chains.dest, account: solverDest.account! });
  const r = await pub.dest.waitForTransactionReceipt({ hash, pollingInterval: 100 });
  const block = await pub.dest.getBlock({ blockNumber: r.blockNumber });
  appendJsonl(log, {
    orderId, status: r.status, fillTx: hash, fillBlock: r.blockNumber, fillBlockTs: block.timestamp,
    seenAtMs: seenAt, sentAtMs: now(), minedSeenAtMs: now(),
  });
  console.log(`filled ${orderId.slice(0, 10)} ${r.status} ${hash}`);
}

async function ensureAllowance() {
  const cur = (await pub.dest.readContract({ address: addr.tokenDest, abi: abi.erc20, functionName: "allowance", args: [solverAddr, addr.destinationSettler] })) as bigint;
  if (cur > 10n ** 30n) return;
  const hash = await solverDest.writeContract({ address: addr.tokenDest, abi: abi.erc20, functionName: "approve", args: [addr.destinationSettler, maxUint256], chain: chains.dest, account: solverDest.account! });
  await pub.dest.waitForTransactionReceipt({ hash });
}

async function main() {
  await ensureAllowance();
  console.log(`solver (${ENV}) ${solverAddr}, repay to ${repayTo}`);
  let from = await pub.origin.getBlockNumber();
  const queue: Array<{ id: Hex; order: OrderData; seenAt: number }> = [];
  let busy = false;

  for (;;) {
    const to = await pub.origin.getBlockNumber();
    if (to > from) {
      const logs = await pub.origin.getContractEvents({ address: addr.escrow, abi: abi.escrow, eventName: "Opened", fromBlock: from + 1n, toBlock: to });
      for (const l of logs) {
        const a = l.args as { orderId: Hex; order: OrderData };
        if (process.env.SOLVER_SKIP_ABOVE && a.order.inputAmount > BigInt(process.env.SOLVER_SKIP_ABOVE)) continue;
        queue.push({ id: a.orderId, order: a.order, seenAt: now() });
      }
      from = to;
    }
    if (!busy && queue.length) {
      busy = true;
      const job = queue.shift()!;
      fillOrder(job.id, job.order, job.seenAt)
        .catch((e) => console.error(`skip ${job.id.slice(0, 10)}: ${(e as Error).message.split("\n")[0]}`))
        .finally(() => (busy = false));
    }
    await sleep(100);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
