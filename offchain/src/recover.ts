// Recovery after an interrupted bench run. Live testnets only.
//   SNAP_ENV=live pnpm recover refund [--blocks 12000]
//       Finds this user's orders still Open on Base Sepolia (opened in the last N origin blocks). Once the refund
//       window is open it calls requestRefund; Reactive then sends the refund callback. Logged to
//       evidence/live/recovery/refunds.jsonl.
//   SNAP_ENV=live pnpm recover backfill <bench dir name>
//       For loops whose settle request was seen but whose `Settled` event the observer missed, reads `Settled`
//       from the chain and completes the row. Backfilled rows get settleSeenBy="backfill" and no wall-clock
//       settle time (nobody watched it happen); block-timestamp and Base-block segments are exact.
//       Rewrites loops.jsonl (the original is kept as loops.observed.jsonl) and writes summary.json/summary.md.
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { type Hex } from "viem";
import { ENV, chains, pub, addr, abi, wallet, evidenceDir, appendJsonl, writeJson, sleep, txLink, blockTs } from "./common.ts";
import { summarize, renderSummaryMd, SEGMENTS, type LoopRow } from "./stats.ts";

if (ENV !== "live") throw new Error("recover runs against live testnets only (SNAP_ENV=live)");
const RANGE = 190n; // Base Sepolia's public RPC rejects getLogs over 200 blocks

async function scanOrigin(eventName: string, from: bigint, to: bigint, args?: Record<string, unknown>) {
  const out = [];
  for (let a = from; a <= to; a += RANGE + 1n) {
    const b = a + RANGE > to ? to : a + RANGE;
    for (let attempt = 0; ; attempt++) {
      try {
        out.push(...(await pub.origin.getContractEvents({ address: addr.escrow, abi: abi.escrow, eventName, args, fromBlock: a, toBlock: b })));
        break;
      } catch (e) {
        if (attempt >= 4) throw e;
        await sleep(500 * (attempt + 1));
      }
    }
  }
  return out;
}

type OrderView = readonly [Hex, Hex, bigint, number, number, Hex];
const order = (id: Hex) => pub.origin.readContract({ address: addr.escrow, abi: abi.escrow, functionName: "orders", args: [id] }) as Promise<OrderView>;

async function refund() {
  const user = wallet("user", "origin");
  const me = user.account!.address.toLowerCase();
  const lookback = BigInt(process.argv[process.argv.indexOf("--blocks") + 1] && process.argv.includes("--blocks") ? process.argv[process.argv.indexOf("--blocks") + 1] : "12000");
  const head = await pub.origin.getBlockNumber();
  const grace = Number(await pub.origin.readContract({ address: addr.escrow, abi: abi.escrow, functionName: "refundGrace" }));
  const opened = await scanOrigin("Opened", head - lookback, head);
  const log = `${evidenceDir("recovery")}/refunds.jsonl`;
  let pending = 0;
  for (const l of opened) {
    const id = (l.args as { orderId: Hex }).orderId;
    const [u, , amount, deadline, status] = await order(id);
    if (status !== 1 || u.toLowerCase() !== me) continue;
    const head = await pub.origin.getBlock();
    const wait = deadline + grace - Number(head.timestamp) + 1;
    if (wait > 0) {
      console.log(`${id.slice(0, 10)} open, refund window opens in ${wait} s`);
      pending++;
      continue;
    }
    const hash = await user.writeContract({ address: addr.escrow, abi: abi.escrow, functionName: "requestRefund", args: [id], chain: chains.origin, account: user.account! });
    const r = await pub.origin.waitForTransactionReceipt({ hash });
    console.log(`${id.slice(0, 10)} requestRefund ${r.status} ${hash}`);
    let refundTx: Hex | undefined;
    for (let i = 0; i < 60 && !refundTx; i++) {
      await sleep(3000);
      const now = await pub.origin.getBlockNumber();
      const ev = await scanOrigin("Refunded", r.blockNumber, now, { orderId: id });
      refundTx = ev[0]?.transactionHash ?? undefined;
    }
    console.log(`  refunded by Reactive callback: ${refundTx ?? "not seen within 3 min"}`);
    appendJsonl(log, { orderId: id, amount, openTx: l.transactionHash, requestTx: hash, requestBlock: r.blockNumber, refundTx, at: new Date().toISOString() });
  }
  if (pending) console.log(`${pending} order(s) not yet refundable; run again later`);
}

async function backfill() {
  const name = process.argv[3];
  if (!name) throw new Error("usage: recover backfill <bench dir name>");
  const dir = evidenceDir(name);
  const file = `${dir}/loops.jsonl`;
  const rows = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l) as LoopRow & { settleSeenBy?: string });
  if (!existsSync(`${dir}/loops.observed.jsonl`)) copyFileSync(file, `${dir}/loops.observed.jsonl`);
  const head = await pub.origin.getBlockNumber();
  const n = (v: unknown) => (v === undefined || v === null ? undefined : BigInt(v as string));
  for (const r of rows) {
    if (r.ok || !r.tx.settleRequest) continue;
    const from = n(r.blocks.open)!;
    const ev = await scanOrigin("Settled", from, from + 6000n > head ? head : from + 6000n, { orderId: r.orderId as Hex });
    if (!ev[0]) {
      console.log(`#${r.i} ${r.orderId.slice(0, 10)}: no Settled event found`);
      continue;
    }
    const s = ev[0];
    const ts = await blockTs(pub.origin, s.blockNumber!);
    r.ok = true;
    r.settleSeenBy = "backfill";
    r.tx.settle = s.transactionHash!;
    r.blocks.settle = s.blockNumber!;
    r.blockTs.settle = ts;
    r.seenAtMs.settle = undefined;
    const t = (k: string) => n(r.blockTs[k]);
    const sec = (a?: bigint, b?: bigint) => (a !== undefined && b !== undefined ? Number(b - a) : null);
    r.seg.reactToSettle_s = sec(t("settleRequest"), ts);
    r.seg.fillToSettle_s = sec(t("fill"), ts);
    r.seg.full_s = sec(t("open"), ts);
    r.seg.fullBase_blocks = Number(s.blockNumber! - from);
    r.seg.fullBase_ms = r.seg.fullBase_blocks * 200;
    console.log(`#${r.i} ${r.orderId.slice(0, 10)} settled on chain ${s.transactionHash} (fill → repaid ${r.seg.fillToSettle_s} s)`);
  }
  rows.sort((a, b) => a.i - b.i);
  const ser = (o: unknown) => JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  writeFileSync(file, rows.map(ser).join("\n") + "\n");

  const tier = rows[0].tier;
  const amount = BigInt(rows[0].amount);
  const tierPolicy = (await pub.lasna.readContract({ address: addr.reactive, abi: abi.reactive, functionName: "tiers" })) as { maxAmount: bigint; delay: number }[];
  const summary = summarize(rows, SEGMENTS);
  const ok = rows.filter((r) => r.ok).length;
  const nBack = rows.filter((r) => r.settleSeenBy === "backfill").length;
  const errs = existsSync(`${dir}/errors.jsonl`) ? readFileSync(`${dir}/errors.jsonl`, "utf8").trim().split("\n").filter(Boolean).length : 0;
  const note = `Run stopped early at ${rows.length} recorded loops (target 50): the observer's Base log scanner fell more than 200 blocks behind and the public RPC refused its catch-up range, so it stopped seeing events. ${nBack} loops whose settlement it missed were completed from the chain afterwards (settleSeenBy="backfill"): their block-timestamp and Base-block segments are exact; they have no wall-clock settle time. Original observer output: loops.observed.jsonl. ${errs} open(s) reverted on Base before an order existed (errors.jsonl).`;
  writeJson(`${dir}/summary.json`, { env: ENV, tier, tierDelay: tierPolicy[tier]?.delay, tierPolicy, contracts: { escrow: addr.escrow, reactive: addr.reactive, destinationSettler: addr.destinationSettler }, amount: amount.toString(), n: rows.length, ok, backfilled: nBack, partialRun: true, note, summary });
  writeFileSync(`${dir}/summary.md`, renderSummaryMd(ENV, tier, amount, rows, summary, (h) => txLink("origin", h)) + `\n> ${note}\n`);
  console.log(`${ok}/${rows.length} settled (${nBack} backfilled); summary in ${dir}/summary.md`);
}

const cmd = process.argv[2];
({ refund, backfill } as Record<string, () => Promise<void>>)[cmd ?? ""]?.()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error((e as Error).message.split("\n")[0]);
    process.exit(1);
  }) ?? (console.error("usage: recover refund|backfill <dir>"), process.exit(1));
