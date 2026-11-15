// Loop benchmark. Opens N orders in one finality tier as the user, waits for the solver's fill, Reactive's
// observation and the settle callback, and records every segment with block timestamps and wall clock.
//   pnpm bench --tier 0 --n 50 [--concurrency 3] [--gap 2000]
// Output: evidence/<env>/bench-tier<k>-<stamp>/{loops.jsonl,summary.json,summary.md}
import { maxUint256, parseEventLogs, type Hex } from "viem";
import { ENV, chains, pub, addr, abi, wallet, evidenceDir, appendJsonl, writeJson, sleep, now, txLink, type OrderData } from "./common.ts";
import { EventHub, type Sighting } from "./hub.ts";
import { summarize, renderSummaryMd, SEGMENTS, type LoopRow } from "./stats.ts";
import { writeFileSync, readFileSync, existsSync } from "node:fs";

/** The solver's own receipt time for a fill (same machine), more precise than a lagging public RPC. */
function solverFillMs(orderId: Hex): number | undefined {
  const f = `${evidenceDir("solver")}/fills.jsonl`;
  if (!existsSync(f)) return undefined;
  for (const l of readFileSync(f, "utf8").trim().split("\n").reverse()) {
    try {
      const r = JSON.parse(l) as { orderId: string; minedSeenAtMs?: number; status?: string };
      if (r.orderId.toLowerCase() === orderId.toLowerCase() && r.status === "success") return r.minedSeenAtMs;
    } catch {
      /* skip partial lines */
    }
  }
  return undefined;
}

const argv = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const TIER = Number(opt("tier", "0"));
const N = Number(opt("n", "5"));
const CONC = Number(opt("concurrency", "1"));
const GAP = Number(opt("gap", "1000"));
const DEADLINE_S = Number(opt("deadline", "600"));
const TIMEOUT_MS = Number(opt("timeout", String(15 * 60_000)));

const user = wallet("user", "origin");
const userAddr = user.account!.address;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = evidenceDir(`bench-tier${TIER}-${stamp}`);
const rowsFile = `${dir}/loops.jsonl`;

let tierPolicy: { maxAmount: bigint; delay: number }[] = [];
async function tierAmount(): Promise<bigint> {
  const tiers = (await pub.lasna.readContract({ address: addr.reactive, abi: abi.reactive, functionName: "tiers" })) as { maxAmount: bigint; delay: number }[];
  if (TIER >= tiers.length) throw new Error(`tier ${TIER} does not exist (${tiers.length} tiers)`);
  tierPolicy = tiers;
  // A round amount inside the tier: half the first tier, otherwise half a USDC above the previous tier's cap.
  const prev = TIER === 0 ? 0n : tiers[TIER - 1].maxAmount;
  const room = tiers[TIER].maxAmount - prev;
  const a = TIER === 0 ? tiers[0].maxAmount / 2n || 1n : prev + (room / 2n < 500_000n ? room / 2n || 1n : 500_000n);
  return a;
}

async function ensureAllowance() {
  const cur = (await pub.origin.readContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "allowance", args: [userAddr, addr.escrow] })) as bigint;
  if (cur > 10n ** 30n) return;
  const hash = await user.writeContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "approve", args: [addr.escrow, maxUint256], chain: chains.origin, account: user.account! });
  await pub.origin.waitForTransactionReceipt({ hash });
}

// Keeps loops running on small faucet balances: when the user runs short on Base, USDC flows back
// (solver's Base USDC → user, user's Unichain USDC → solver). Both wallets are the bench's own.
let rebalancing: Promise<void> | null = null;
async function ensureFunds(amount: bigint) {
  const bal = (await pub.origin.readContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "balanceOf", args: [userAddr] })) as bigint;
  if (bal >= amount) return;
  rebalancing ??= (async () => {
    const solverO = wallet("solver", "origin");
    const userD = wallet("user", "dest");
    const sBal = (await pub.origin.readContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "balanceOf", args: [solverO.account!.address] })) as bigint;
    if (sBal > 0n) {
      const h = await solverO.writeContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "transfer", args: [userAddr, sBal], chain: chains.origin, account: solverO.account! });
      await pub.origin.waitForTransactionReceipt({ hash: h });
    }
    const uBal = (await pub.dest.readContract({ address: addr.tokenDest, abi: abi.erc20, functionName: "balanceOf", args: [userAddr] })) as bigint;
    if (uBal > 0n) {
      const h = await userD.writeContract({ address: addr.tokenDest, abi: abi.erc20, functionName: "transfer", args: [solverO.account!.address, uBal], chain: chains.dest, account: userD.account! });
      await pub.dest.waitForTransactionReceipt({ hash: h });
    }
    console.log(`rebalanced: ${sBal} back to user on Base, ${uBal} back to solver on Unichain`);
  })().finally(() => (rebalancing = null));
  await rebalancing;
  // Settlements still in flight return funds later; wait for them rather than fail the loop.
  for (let i = 0; i < 120; i++) {
    const b = (await pub.origin.readContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "balanceOf", args: [userAddr] })) as bigint;
    if (b >= amount) return;
    await sleep(5000);
    if (i % 6 === 5) await ensureFunds(amount);
  }
  throw new Error("user has too little USDC on Base even after rebalancing");
}

const sec = (a?: Sighting, b?: Sighting) => (a && b ? Number(b.blockTs - a.blockTs) : null);
const ms = (a?: number, b?: number) => (a !== undefined && b !== undefined ? b - a : null);

async function oneLoop(i: number, amount: bigint, hub: EventHub): Promise<LoopRow> {
  if (ENV === "live") await ensureFunds(amount);
  const fillDeadline = Math.floor(Date.now() / 1000) + DEADLINE_S;
  const order: OrderData = {
    inputToken: addr.tokenOrigin,
    inputAmount: amount,
    outputToken: addr.tokenDest,
    outputAmount: (amount * 999n) / 1000n || 1n, // 0.1% solver spread
    recipient: userAddr,
    destinationChainId: BigInt(chains.dest.id),
    destinationSettler: addr.destinationSettler,
    fillDeadline,
  };
  const sentAt = now();
  const hash = await user.writeContract({ address: addr.escrow, abi: abi.escrow, functionName: "open", args: [order], chain: chains.origin, account: user.account! });
  const rcpt = await pub.origin.waitForTransactionReceipt({ hash, pollingInterval: 100 });
  const minedSeenAt = now();
  const ev = parseEventLogs({ abi: abi.escrow, logs: rcpt.logs, eventName: "Opened" })[0];
  const orderId = (ev.args as { orderId: Hex }).orderId;
  const openBlock = await pub.origin.getBlock({ blockNumber: rcpt.blockNumber });
  const opened: Sighting = { block: rcpt.blockNumber, blockTs: openBlock.timestamp, tx: hash, seenAtMs: minedSeenAt, args: {} };

  const filled = await hub.waitFor("Filled", orderId, TIMEOUT_MS);
  const accepted = filled && (await hub.waitFor("FillAccepted", orderId, TIMEOUT_MS));
  const requested = accepted && (await hub.waitFor("SettlementRequested", orderId, TIMEOUT_MS));
  const settled = requested && (await hub.waitFor("Settled", orderId, TIMEOUT_MS));
  const fillAt = solverFillMs(orderId) ?? filled?.seenAtMs;
  // Base Sepolia produces a block every 200 ms: block-count deltas on the origin are the finest clock we have.
  const baseBlocksFull = settled ? Number(settled.block - opened.block) : null;

  const row: LoopRow = {
    i, env: ENV, tier: TIER, orderId, amount: amount.toString(), ok: Boolean(settled),
    tx: { open: hash, fill: filled?.tx, react: accepted?.tx, settleRequest: requested?.tx, settle: settled?.tx },
    blocks: { open: opened.block, fill: filled?.block, react: accepted?.block, settleRequest: requested?.block, settle: settled?.block },
    blockTs: { open: opened.blockTs, fill: filled?.blockTs, react: accepted?.blockTs, settleRequest: requested?.blockTs, settle: settled?.blockTs },
    seenAtMs: { openSent: sentAt, open: minedSeenAt, fill: fillAt, fillRpc: filled?.seenAtMs, react: accepted?.seenAtMs, settleRequest: requested?.seenAtMs, settle: settled?.seenAtMs },
    seg: {
      // block-timestamp segments (seconds; each chain's own clock, 1 s granularity)
      openToFill_s: sec(opened, filled),
      fillToReact_s: sec(filled, accepted),
      reactToSettle_s: sec(requested, settled),
      fillToSettle_s: sec(filled, settled),
      full_s: sec(opened, settled),
      // wall-clock segments (ms; first seen by this machine via public RPC polling)
      openToFill_ms: ms(minedSeenAt, fillAt),
      fillToReact_ms: ms(fillAt, accepted?.seenAtMs),
      reactToSettle_ms: ms(requested?.seenAtMs, settled?.seenAtMs),
      fillToSettle_ms: ms(fillAt, settled?.seenAtMs),
      full_ms: ms(sentAt, settled?.seenAtMs),
      // open → repaid counted in Base Sepolia blocks (200 ms each), independent of any RPC lag
      fullBase_blocks: baseBlocksFull,
      fullBase_ms: baseBlocksFull === null ? null : baseBlocksFull * 200,
    },
  };
  appendJsonl(rowsFile, row);
  console.log(
    `#${i} ${orderId.slice(0, 10)} ${row.ok ? "settled" : "TIMEOUT"} fill→settle ${row.seg.fillToSettle_ms ?? "-"} ms, full ${row.seg.full_ms ?? "-"} ms`,
  );
  return row;
}

async function main() {
  const amount = await tierAmount();
  await ensureAllowance();
  const hub = new EventHub();
  await hub.start();
  console.log(`bench ${ENV}: tier ${TIER}, amount ${amount}, n=${N}, concurrency ${CONC} → ${dir}`);

  const rows: LoopRow[] = [];
  let next = 0;
  const worker = async () => {
    while (next < N) {
      const i = next++;
      rows.push(await oneLoop(i, amount, hub));
      await sleep(GAP);
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
  hub.stop();

  const summary = summarize(rows, SEGMENTS);
  writeJson(`${dir}/summary.json`, { env: ENV, tier: TIER, tierDelay: tierPolicy[TIER]?.delay, tierPolicy, contracts: { escrow: addr.escrow, reactive: addr.reactive, destinationSettler: addr.destinationSettler }, amount: amount.toString(), n: rows.length, ok: rows.filter((r) => r.ok).length, summary });
  writeFileSync(`${dir}/summary.md`, renderSummaryMd(ENV, TIER, amount, rows, summary, (h) => txLink("origin", h)));
  console.log(`done: ${rows.filter((r) => r.ok).length}/${rows.length} settled; summary in ${dir}/summary.md`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
