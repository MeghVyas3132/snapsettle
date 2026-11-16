// Solver policy check, live: opens one order that asks for more out than it pays in (0.25 USDC in, 0.5 USDC out)
// and confirms that no fill appears on Unichain while the running solver logs a refusal. The order is refunded
// through Reactive after its deadline with `pnpm recover refund`.
//   SNAP_ENV=live pnpm policycheck   (with the solver running)   → evidence/live/policy-check.json
import { parseEventLogs, type Hex } from "viem";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ENV, ROOT, chains, pub, addr, abi, wallet, evidenceDir, sleep, type OrderData } from "./common.ts";

const user = wallet("user", "origin");
const inAmt = 250_000n;
const order: OrderData = {
  inputToken: addr.tokenOrigin,
  inputAmount: inAmt,
  outputToken: addr.tokenDest,
  outputAmount: inAmt * 2n, // the hostile part: the solver would pay out twice what it is repaid
  recipient: user.account!.address,
  destinationChainId: BigInt(chains.dest.id),
  destinationSettler: addr.destinationSettler,
  fillDeadline: Math.floor(Date.now() / 1000) + 120,
};
const allowance = (await pub.origin.readContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "allowance", args: [user.account!.address, addr.escrow] })) as bigint;
if (allowance < inAmt) {
  const h = await user.writeContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "approve", args: [addr.escrow, 2n ** 255n], chain: chains.origin, account: user.account! });
  await pub.origin.waitForTransactionReceipt({ hash: h });
}
const hash = await user.writeContract({ address: addr.escrow, abi: abi.escrow, functionName: "open", args: [order], chain: chains.origin, account: user.account! });
const rcpt = await pub.origin.waitForTransactionReceipt({ hash });
const orderId = (parseEventLogs({ abi: abi.escrow, logs: rcpt.logs, eventName: "Opened" })[0].args as { orderId: Hex }).orderId;
console.log(`opened hostile order ${orderId} (${hash}); watching for 60 s`);

const destFrom = await pub.dest.getBlockNumber();
await sleep(60_000);
const fills = await pub.dest.getContractEvents({ address: addr.destinationSettler, abi: abi.dest, eventName: "Filled", fromBlock: destFrom - 5n, toBlock: await pub.dest.getBlockNumber() });
const filled = fills.some((l) => (l.args as { orderId: Hex }).orderId === orderId);
const skips = join(evidenceDir("solver"), "skips.jsonl");
const refusal = existsSync(skips) ? readFileSync(skips, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((r) => r.orderId === orderId) : undefined;
const out = { at: new Date().toISOString(), env: ENV, orderId, openTx: hash, outputAmount: order.outputAmount.toString(), inputAmount: inAmt.toString(), filledOnUnichain: filled, solverRefusal: refusal?.reason ?? null, pass: !filled && !!refusal };
writeFileSync(join(ROOT, "evidence", ENV, "policy-check.json"), JSON.stringify(out, null, 2));
console.log(`${out.pass ? "PASS" : "FAIL"}: filled=${filled}, solver said: ${out.solverRefusal}`);
process.exit(out.pass ? 0 : 1);
