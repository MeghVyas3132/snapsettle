// Generic ERC-7683 solver for Snapsettle. It knows nothing about Snapsettle's contracts: for every `Opened`
// order it asks the resolver (eth_call) for the standard order description, vets the named assumptions
// against its whitelist, builds the fill call from the resolved step, and executes it from its own inventory.
// Repayment arrives on the origin chain when Reactive observes the fill.
import { decodeFunctionData, encodeAbiParameters, hexToBigInt, maxUint256, size, slice, toFunctionSelector, type Address, type Hex } from "viem";
import { ENV, chains, pub, addr, abi, wallet, ORDER_TUPLE, evidenceDir, appendJsonl, sleep, now, blockTs, type OrderData } from "./common.ts";

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

// A fill uses ~88k gas on Unichain Sepolia; a fixed cap skips eth_estimateGas on the hot path.
const FILL_GAS = 160_000n;
// Fees are refreshed in the background so a fill never waits on fee lookups.
let fees: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } = { maxFeePerGas: 0n, maxPriorityFeePerGas: 0n };
async function refreshFees() {
  const f = await pub.dest.estimateFeesPerGas();
  // 2x headroom on the base fee so a cached value stays valid for a few blocks.
  fees = { maxFeePerGas: f.maxFeePerGas * 2n, maxPriorityFeePerGas: f.maxPriorityFeePerGas };
}

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

  // One round trip: gas, fees and nonce are already known, so viem only signs and sends.
  const hash = await solverDest.sendTransaction({ to: target.address, data, chain: chains.dest, account: solverDest.account!, gas: FILL_GAS, ...fees });
  const sentAt = now();
  const r = await pub.dest.waitForTransactionReceipt({ hash, pollingInterval: 100 });
  const minedAt = now(); // the solver's own receipt time: the most precise wall-clock fill time we have
  const fillTs = await blockTs(pub.dest, r.blockNumber).catch(() => undefined);
  appendJsonl(log, { orderId, status: r.status, fillTx: hash, fillBlock: r.blockNumber, fillBlockTs: fillTs, seenAtMs: seenAt, sentAtMs: sentAt, minedSeenAtMs: minedAt });
  console.log(`filled ${orderId.slice(0, 10)} ${r.status} ${hash}`);
  // Delayed tiers: the resolver adds a second step (confirm). Run it as soon as it simulates cleanly, i.e. once
  // the tier's delay has passed. Its arguments are all constants, so no variables to fill in.
  if (r.status === "success" && resolved.steps.length > 1) void runLaterStep(orderId, resolved.steps[1]);
}

// Errors after which retrying a later step is pointless (anything else, e.g. TooEarly, is retried).
const FINAL_ERRORS = ["AlreadyConfirmed()", "NotFilled()", "NoDelayTier()"].map((sig) => toFunctionSelector(sig));

async function runLaterStep(orderId: Hex, stepData: Hex) {
  const step = decodeFunctionData({ abi: abi.step, data: stepData });
  const [targetIa, selector, args] = step.args as [Hex, Hex, Hex[], Hex[]];
  const target = parseInterop(targetIa);
  if (target.chainId !== BigInt(chains.dest.id)) return;
  let data: Hex = selector;
  for (const a of args) data = (data + unframe(a).slice(2)) as Hex;
  const deadline = now() + 30 * 60_000;
  while (now() < deadline) {
    try {
      await pub.dest.call({ to: target.address, data, account: solverAddr });
      const hash = await solverDest.sendTransaction({ to: target.address, data, chain: chains.dest, account: solverDest.account!, gas: 120_000n, ...fees });
      const r = await pub.dest.waitForTransactionReceipt({ hash, pollingInterval: 200 });
      appendJsonl(log, { orderId, step: "confirm", status: r.status, tx: hash, at: new Date().toISOString() });
      console.log(`confirmed ${orderId.slice(0, 10)} ${r.status} ${hash}`);
      return;
    } catch (e) {
      const msg = (e as Error).message;
      // A raw eth_call revert carries the error selector, not its name.
      if (FINAL_ERRORS.some((sel) => msg.includes(sel)) || /AlreadyConfirmed|NotFilled|NoDelayTier/.test(msg)) return;
      await sleep(1500); // TooEarly: try again shortly
    }
  }
}

async function ensureAllowance() {
  const cur = (await pub.dest.readContract({ address: addr.tokenDest, abi: abi.erc20, functionName: "allowance", args: [solverAddr, addr.destinationSettler] })) as bigint;
  if (cur > 10n ** 30n) return;
  const hash = await solverDest.writeContract({ address: addr.tokenDest, abi: abi.erc20, functionName: "approve", args: [addr.destinationSettler, maxUint256], chain: chains.dest, account: solverDest.account! });
  await pub.dest.waitForTransactionReceipt({ hash });
}

async function main() {
  await ensureAllowance();
  await refreshFees();
  setInterval(() => void refreshFees().catch(() => undefined), 5_000);
  // Prime the nonce manager so the first fill does not pay for a nonce lookup.
  await pub.dest.getTransactionCount({ address: solverAddr, blockTag: "pending" });
  console.log(`solver (${ENV}) ${solverAddr}, repay to ${repayTo}; parallel fills, fixed gas, cached fees`);
  let from = await pub.origin.getBlockNumber();
  let head = from;
  const seen = new Set<Hex>();
  // The chain head is tracked in the background, so the hot loop stays one call and never asks for a range the
  // RPC refuses (Base Sepolia's public RPC rejects getLogs over 200 blocks).
  setInterval(() => void pub.origin.getBlockNumber().then((h) => { if (h > head) head = h; }).catch(() => undefined), 1000);

  // A failed RPC call skips this poll; it must never stop the solver.
  const scan = async () => {
    if (head <= from) return;
    const to = head - from > 190n ? from + 190n : head;
    const logs = await pub.origin.getContractEvents({ address: addr.escrow, abi: abi.escrow, eventName: "Opened", fromBlock: from + 1n, toBlock: to });
    for (const l of logs) {
      const a = l.args as { orderId: Hex; order: OrderData };
      if (seen.has(a.orderId)) continue;
      seen.add(a.orderId);
      if (process.env.SOLVER_SKIP_ABOVE && a.order.inputAmount > BigInt(process.env.SOLVER_SKIP_ABOVE)) continue;
      // Every order fills at once, in parallel: no queue behind a slower one.
      const seenAt = now();
      fillOrder(a.orderId, a.order, seenAt).catch((e) => console.error(`skip ${a.orderId.slice(0, 10)}: ${(e as Error).message.split("\n")[0]}`));
    }
    // Re-scan the last few blocks next time: a load-balanced RPC can report a head its log index has not reached.
    const next = to > 10n ? to - 10n : 0n;
    if (next > from) from = next;
  };

  for (;;) {
    await scan().catch((e) => console.error(`scan failed, retrying: ${(e as Error).message.split("\n")[0]}`));
    await sleep(100);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
