// On-chain negative cases. Stop the solver bot first: this script plays the solver itself.
//   pnpm negative [--case wrong-terms|late-fill|refund|refund-after-fill|all]
// Output: evidence/<env>/negative-<stamp>/{cases.jsonl,summary.md}
import { maxUint256, parseEventLogs, type Hex } from "viem";
import { writeFileSync } from "node:fs";
import { ENV, chains, pub, addr, abi, wallet, evidenceDir, appendJsonl, sleep, now, type OrderData } from "./common.ts";
import { EventHub } from "./hub.ts";

const argv = process.argv.slice(2);
const which = argv.includes("--case") ? argv[argv.indexOf("--case") + 1] : "all";
const user = wallet("user", "origin");
const solver = wallet("solver", "dest");
const userAddr = user.account!.address;
const solverAddr = solver.account!.address;
const dir = evidenceDir(`negative-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const file = `${dir}/cases.jsonl`;
const results: Array<{ name: string; pass: boolean; detail: string; tx: Record<string, string | undefined> }> = [];

async function tiers() {
  return (await pub.lasna.readContract({ address: addr.reactive, abi: abi.reactive, functionName: "tiers" })) as { maxAmount: bigint; delay: number }[];
}
const grace = async () => Number(await pub.origin.readContract({ address: addr.escrow, abi: abi.escrow, functionName: "refundGrace" }));

async function approvals() {
  for (const [w, token, spender, client, chain] of [
    [user, addr.tokenOrigin, addr.escrow, pub.origin, chains.origin],
    [solver, addr.tokenDest, addr.destinationSettler, pub.dest, chains.dest],
  ] as const) {
    const a = w.account!.address;
    const cur = (await client.readContract({ address: token, abi: abi.erc20, functionName: "allowance", args: [a, spender] })) as bigint;
    if (cur > 10n ** 30n) continue;
    const h = await w.writeContract({ address: token, abi: abi.erc20, functionName: "approve", args: [spender, maxUint256], chain, account: w.account! });
    await client.waitForTransactionReceipt({ hash: h });
  }
}

async function open(amount: bigint, deadlineIn: number): Promise<{ id: Hex; order: OrderData; tx: Hex }> {
  const order: OrderData = {
    inputToken: addr.tokenOrigin, inputAmount: amount, outputToken: addr.tokenDest, outputAmount: (amount * 999n) / 1000n || 1n,
    recipient: userAddr, destinationChainId: BigInt(chains.dest.id), destinationSettler: addr.destinationSettler,
    fillDeadline: Math.floor(Date.now() / 1000) + deadlineIn,
  };
  const tx = await user.writeContract({ address: addr.escrow, abi: abi.escrow, functionName: "open", args: [order], chain: chains.origin, account: user.account! });
  const r = await pub.origin.waitForTransactionReceipt({ hash: tx });
  const id = (parseEventLogs({ abi: abi.escrow, logs: r.logs, eventName: "Opened" })[0].args as { orderId: Hex }).orderId;
  return { id, order, tx };
}

async function fill(id: Hex, order: OrderData, forceGas = false): Promise<{ tx: Hex; status: string }> {
  const tx = await solver.writeContract({
    address: addr.destinationSettler, abi: abi.dest, functionName: "fill", args: [id, order, solverAddr],
    chain: chains.dest, account: solver.account!, ...(forceGas ? { gas: 300_000n } : {}),
  });
  const r = await pub.dest.waitForTransactionReceipt({ hash: tx });
  return { tx, status: r.status };
}

async function requestRefund(id: Hex): Promise<Hex> {
  const tx = await user.writeContract({ address: addr.escrow, abi: abi.escrow, functionName: "requestRefund", args: [id], chain: chains.origin, account: user.account! });
  await pub.origin.waitForTransactionReceipt({ hash: tx });
  return tx;
}

function record(name: string, pass: boolean, detail: string, tx: Record<string, string | undefined>) {
  results.push({ name, pass, detail, tx });
  appendJsonl(file, { name, pass, detail, tx, at: new Date().toISOString() });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

async function wrongTerms(hub: EventHub, smallAmt: bigint) {
  const o = await open(smallAmt, 600);
  await sleep(3000); // let Reactive observe the order first
  const bad = { ...o.order, outputAmount: 1n };
  const f1 = await fill(o.id, bad);
  const rejected = (await hub.waitFor("FillRejected", o.id, 120_000)) ?? undefined;
  const settledEarly = hub.get("Settled", o.id);
  const f2 = await fill(o.id, o.order); // the genuine fill still goes through
  const settled = await hub.waitFor("Settled", o.id, 180_000);
  record("wrong-terms fill is not settled, genuine fill still is", Boolean(rejected) && !settledEarly && Boolean(settled),
    `FillRejected on Lasna ${rejected ? "seen" : "missing"}; settled only after the genuine fill`,
    { open: o.tx, wrongFill: f1.tx, fillRejected: rejected?.tx, genuineFill: f2.tx, settle: settled?.tx });
}

async function lateFill(smallAmt: bigint) {
  const o = await open(smallAmt, 15);
  await sleep(20_000);
  let tx: Hex | undefined, status = "";
  try {
    const r = await fill(o.id, o.order, true);
    tx = r.tx;
    status = r.status;
  } catch (e) {
    status = `rejected before mining: ${(e as Error).message.split("\n")[0]}`;
  }
  record("late fill reverts on the destination", status !== "success", `fill status: ${status}`, { open: o.tx, lateFill: tx });
}

async function refundUnfilled(hub: EventHub, smallAmt: bigint) {
  const g = await grace();
  const o = await open(smallAmt, 15);
  await sleep((15 + g + 5) * 1000);
  const rr = await requestRefund(o.id);
  const refunded = await hub.waitFor("Refunded", o.id, 180_000);
  record("unfilled order is refunded", Boolean(refunded), `refund ${refunded ? "landed" : "missing"} after grace ${g}s`,
    { open: o.tx, requestRefund: rr, refund: refunded?.tx });
}

async function refundAfterFill(hub: EventHub, largeAmt: bigint, largeDelay: number) {
  const g = await grace();
  const o = await open(largeAmt, 15);
  const f = await fill(o.id, o.order);
  const accepted = await hub.waitFor("FillAccepted", o.id, 120_000);
  const waitMs = (15 + g + 5) * 1000 - 5000;
  await sleep(Math.max(0, waitMs));
  const rr = await requestRefund(o.id); // allowed by the escrow: settlement is still queued on Lasna
  const settled = await hub.waitFor("Settled", o.id, (largeDelay + 180) * 1000);
  const refunded = hub.get("Refunded", o.id) ?? hub.get("RefundCallbackRequested", o.id);
  record("refund request is ignored after a valid fill", Boolean(settled) && !refunded,
    `solver ${settled ? "paid" : "NOT paid"}; refund ${refunded ? "HAPPENED" : "not issued"}`,
    { open: o.tx, fill: f.tx, fillAccepted: accepted?.tx, requestRefund: rr, settle: settled?.tx });
}

async function main() {
  await approvals();
  const t = await tiers();
  const small = t[0].maxAmount / 2n || 1n;
  const large = t[t.length - 2].maxAmount + 1n;
  const hub = new EventHub();
  await hub.start();
  const all = which === "all";
  const t0 = now();
  await Promise.all([
    all || which === "wrong-terms" ? wrongTerms(hub, small) : null,
    all || which === "late-fill" ? lateFill(small) : null,
    all || which === "refund" ? refundUnfilled(hub, small) : null,
    all || which === "refund-after-fill" ? refundAfterFill(hub, large, t[t.length - 1].delay) : null,
  ]);
  hub.stop();
  const md = [
    `# Negative cases: ${ENV.toUpperCase()}`, "",
    ENV === "local" ? "> LOCAL harness (anvil + emulated Reactive relay)." : "> LIVE testnets.", "",
    "| Case | Result | Detail | Transactions |", "|---|---|---|---|",
    ...results.map((r) => `| ${r.name} | ${r.pass ? "PASS" : "FAIL"} | ${r.detail} | ${Object.entries(r.tx).map(([k, v]) => `${k}: \`${v ?? "-"}\``).join("<br>")} |`),
    "", `Ran ${Math.round((now() - t0) / 1000)} s, ${new Date().toISOString()}.`,
  ].join("\n");
  writeFileSync(`${dir}/summary.md`, md + "\n");
  console.log(`summary: ${dir}/summary.md`);
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
