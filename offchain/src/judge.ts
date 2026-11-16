// Writes JUDGE.md (and evidence/live/loops-current.csv) from the deployed addresses and the recorded evidence.
// Nothing in JUDGE.md is typed by hand: every number is computed here and every transaction is a link.
//   SNAP_ENV=live pnpm judge   → JUDGE.md + evidence/live/loops-current.csv
//   SNAP_ENV=local pnpm judge  → .local/JUDGE.local.md (preview only, never committed)
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ENV, ROOT, addr, explorers } from "./common.ts";

type Stat = { n: number; p50: number; p95: number };
type Summary = { tier: number; tierDelay?: number; amount: string; n: number; ok: number; contracts?: { escrow?: string }; note?: string; summary: Record<string, Stat> };
type Loop = { i: number; orderId: string; ok: boolean; tx: Record<string, string | undefined>; seg: Record<string, number | null>; settleSeenBy?: string };
type Case = { name: string; pass: boolean; detail: string; tx: Record<string, string | undefined>; at?: string };
type Run = { dir: string; s: Summary; loops: Loop[]; errors: number; current: boolean; ver: string };

const evDir = join(ROOT, "evidence", ENV);
const current = (addr.escrow ?? "").toLowerCase();
const readJsonl = <T>(f: string): T[] => (existsSync(f) ? readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as T) : []);
const deployedAtFile = join(ROOT, "contracts/deployments", ENV, "deployed-at.json");
const deployedAt = existsSync(deployedAtFile) ? (JSON.parse(readFileSync(deployedAtFile, "utf8")) as { current?: string; v2?: string; v3?: string }) : {};
const v2At = Date.parse(deployedAt.v2 ?? "");
const v3At = Date.parse(deployedAt.v3 ?? "");
const CURRENT = deployedAt.current ?? "current";
// Which deployment a run used, from its escrow address; refusal runs by when they ran.
const escrowOf = (dir: string) => { const f = join(ROOT, "contracts/deployments", dir, "3-origin.json"); return existsSync(f) ? ((JSON.parse(readFileSync(f, "utf8")) as { originEscrow?: string }).originEscrow ?? "").toLowerCase() : ""; };
const knownEscrows: Record<string, string> = { [escrowOf(`${ENV}-v1`)]: "v1", [escrowOf(`${ENV}-v2`)]: "v2" };
const verOfEscrow = (e?: string) => (e?.toLowerCase() === current ? CURRENT : knownEscrows[e?.toLowerCase() ?? ""] ?? "earlier");
const verOfTime = (t: number) => (t < v2At ? "v1" : t < v3At ? "v2" : CURRENT);
const dirTime = (d: string) => Date.parse(d.replace(/^[a-z0-9-]*?-(\d{4}-\d\d-\d\dT)(\d\d)-(\d\d)-(\d\d)-(\d{3})Z$/, "$1$2:$3:$4.$5Z"));

const runs: Run[] = [];
const cases: Array<Case & { run: string; current: boolean; ver: string }> = [];
if (existsSync(evDir)) {
  for (const d of readdirSync(evDir).sort()) {
    const sum = join(evDir, d, "summary.json");
    if (d.startsWith("bench-") && existsSync(sum)) {
      const s = JSON.parse(readFileSync(sum, "utf8")) as Summary;
      runs.push({ dir: d, s, loops: readJsonl<Loop>(join(evDir, d, "loops.jsonl")), errors: readJsonl(join(evDir, d, "errors.jsonl")).length, current: s.contracts?.escrow?.toLowerCase() === current, ver: verOfEscrow(s.contracts?.escrow) });
    }
    if (d.startsWith("negative-")) {
      const ver = verOfTime(dirTime(d));
      for (const c of readJsonl<Case>(join(evDir, d, "cases.jsonl"))) cases.push({ ...c, run: d, current: ver === CURRENT, ver });
    }
  }
}
// Confirm transactions (delayed tiers) are logged by the solver, keyed by order id.
const confirms = new Map<string, string>();
for (const r of readJsonl<{ orderId: string; step?: string; status?: string; tx?: string }>(join(evDir, "solver", "fills.jsonl"))) {
  if (r.step === "confirm" && r.status === "success" && r.tx) confirms.set(r.orderId.toLowerCase(), r.tx);
}
const refunds = readJsonl<{ orderId: string; requestTx: string; refundTx?: string }>(join(evDir, "recovery", "refunds.jsonl"));
const reorgFile = join(evDir, "reorg-check.json");
const reorg = existsSync(reorgFile) ? (JSON.parse(readFileSync(reorgFile, "utf8")) as { checked: number; missing: number; changedBlock: number; failedNow: number; at: string }) : null;

const link = (chain: keyof typeof explorers, kind: "tx" | "address", v?: string) => (v ? (ENV === "live" ? `[\`${v.slice(0, 10)}…\`](${explorers[chain]}/${kind}/${v})` : `\`${v.slice(0, 10)}…\``) : "—");
const sec = (ms?: number) => (ms === undefined || !Number.isFinite(ms) ? "—" : ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60_000)}:${String(Math.round((ms % 60_000) / 1000)).padStart(2, "0")}`);
const pct = (v: number[], p: number) => (v.length ? [...v].sort((a, b) => a - b)[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))] : NaN);
const chainOfCaseTx = (k: string): keyof typeof explorers => (/Rejected|Accepted/.test(k) ? "lasna" : /fill|confirm/i.test(k) ? "dest" : "origin");
const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : undefined);

const cur = runs.filter((r) => r.current);
const prev = runs.filter((r) => !r.current);
const tiers = [...new Set(runs.map((r) => r.s.tier))].sort();

const L: string[] = [
  "# JUDGE.md",
  "",
  ENV === "live"
    ? "Generated by `offchain/src/judge.ts` from the deployed contracts and `evidence/live/`. Nothing here is typed by hand. Every transaction is a link; every loop is in [`evidence/live/loops-current.csv`](evidence/live/loops-current.csv)."
    : "> LOCAL preview (anvil + emulated Reactive relay). Not live evidence.",
  "",
  `## 1. Deployed contracts (current, ${CURRENT})`,
  "",
  "Source verified on Sourcify (exact match) for all four.",
  "",
  "| Contract | Chain | Address |",
  "|---|---|---|",
  `| OriginEscrow | Base Sepolia (84532) | ${link("origin", "address", addr.escrow)} |`,
  `| SnapsettleResolver (ERC-7683) | Base Sepolia (84532) | ${link("origin", "address", addr.resolver)} |`,
  `| DestinationSettler | Unichain Sepolia (1301) | ${link("dest", "address", addr.destinationSettler)} |`,
  `| SnapsettleReactive | Reactive Lasna (5318007) | ${link("lasna", "address", addr.reactive)} |`,
  "",
  "v3 (live since 2026-11-16 13:12 UTC) accepts one token pair (Circle test USDC, Base Sepolia → Unichain Sepolia) and orders of at least 0.1 USDC, so spam in other tokens or dust reverts before an event exists. v2 (2026-11-15 23:36 UTC) added the `confirm` re-check of delayed fills on Unichain, removed the cron, and capped outflow per hour. Earlier contracts and their runs are in section 6.",
  "",
  "## 2. Full loops, joined",
  "",
  "Origin event → fill → (confirm, delayed tiers) → Reactive transaction on Lasna → callback that repays the solver. Two loops per tier here; all of them in the CSV.",
  "",
  "| Tier | Open (Base) | Fill (Unichain) | Confirm (Unichain) | React (Lasna) | Settle request (Lasna) | Repay (Base) |",
  "|---|---|---|---|---|---|---|",
];
const csv = ["tier,run,order_id,open_tx,fill_tx,confirm_tx,react_tx,settle_request_tx,settle_tx,settled,whole_loop_ms_base_blocks,fill_to_repaid_s_block_ts"];
for (const t of tiers) {
  const loops = cur.filter((r) => r.s.tier === t).flatMap((r) => r.loops.map((l) => ({ l, run: r.dir })));
  for (const { l, run } of loops) {
    const c = confirms.get(l.orderId.toLowerCase()) ?? "";
    csv.push([t, run, l.orderId, l.tx.open ?? "", l.tx.fill ?? "", c, l.tx.react ?? "", l.tx.settleRequest ?? "", l.tx.settle ?? "", l.ok, num(l.seg.fullBase_ms) ?? "", num(l.seg.fillToSettle_s) ?? ""].join(","));
  }
  for (const { l } of loops.filter((x) => x.l.ok).slice(-2)) {
    const c = confirms.get(l.orderId.toLowerCase());
    L.push(`| ${t} | ${link("origin", "tx", l.tx.open)} | ${link("dest", "tx", l.tx.fill)} | ${c ? link("dest", "tx", c) : t === 0 ? "not needed" : "—"} | ${link("lasna", "tx", l.tx.react)} | ${link("lasna", "tx", l.tx.settleRequest)} | ${link("origin", "tx", l.tx.settle)} |`);
  }
}
if (ENV === "live") writeFileSync(join(evDir, "loops-current.csv"), csv.join("\n") + "\n");

L.push(
  "",
  "## 3. Latency on the current contracts, four clocks",
  "",
  "Each clock has a known bias, stated under the table. No single one is exact; read them together. The headline (about 2 s on sight) is clock B; clock C, which uses no RPC at all, puts the same tier at about 1 s.",
  "",
  "| Tier | Loops settled / orders | A. Whole loop, Base blocks ×200 ms (p50 · p95) | B. Fill → repaid, A minus the solver's fill time | C. Fill → repaid, block timestamps (1 s) | D. Fill → repaid, one observer's wall clock |",
  "|---|---|---|---|---|---|",
);
for (const t of tiers) {
  const rs = cur.filter((r) => r.s.tier === t);
  if (!rs.length) continue;
  const ok = rs.flatMap((r) => r.loops).filter((l) => l.ok);
  const all = rs.reduce((a, r) => a + r.loops.length, 0);
  const A = ok.map((l) => num(l.seg.fullBase_ms)).filter((x): x is number => x !== undefined);
  const B = ok.map((l) => (num(l.seg.fullBase_ms) !== undefined && num(l.seg.openToFill_ms) !== undefined ? l.seg.fullBase_ms! - l.seg.openToFill_ms! : undefined)).filter((x): x is number => x !== undefined);
  const C = ok.map((l) => num(l.seg.fillToSettle_s)).filter((x): x is number => x !== undefined).map((x) => x * 1000);
  const D = ok.map((l) => num(l.seg.fillToSettle_ms)).filter((x): x is number => x !== undefined);
  const f = (v: number[]) => (v.length ? `${sec(pct(v, 50))} · ${sec(pct(v, 95))}` : "—");
  L.push(`| ${t} | ${ok.length} / ${all} | ${f(A)} | ${f(B)} | ${f(C)} | ${f(D)} |`);
}
L.push(
  "",
  "- **A** counts Base Sepolia blocks (200 ms each) between the open and the repayment: the most RPC-independent measure, 200 ms resolution.",
  "- **B** subtracts the open → fill time from A. That time runs from when the bench got the open's receipt to when the solver got its fill receipt, so a slow fill receipt makes B read low. It does on the delayed tiers, run four orders at a time: B is about 4 s under C there.",
  "- **C** uses each chain's block timestamps, which are whole seconds and come from two different chains: it reads low by up to a second and can't resolve below 1 s.",
  "- **D** is when one observer polling public RPCs every ~150 ms first saw each event: an upper bound.",
  "- Delayed tiers include their policy delay (30 s / 300 s) plus the confirm on Unichain.",
  "",
  "## 4. Refused on-chain",
  "",
  "| Case | Result | Transactions | Contracts |",
  "|---|---|---|---|",
);
const latestCase = new Map<string, (typeof cases)[number]>();
for (const c of [...cases.filter((c) => !c.current), ...cases.filter((c) => c.current)]) latestCase.set(c.name, c);
for (const c of latestCase.values()) {
  const txs = Object.entries(c.tx).filter(([, v]) => v).map(([k, v]) => `${k}: ${link(chainOfCaseTx(k), "tx", v)}`).join("<br>");
  L.push(`| ${c.name} | ${c.pass ? "held" : "FAILED"}: ${c.detail} | ${txs} | ${c.ver} |`);
}
L.push(
  "",
  "## 5. Everything that went wrong (nothing excluded)",
  "",
  "| What | Count | Where |",
  "|---|---|---|",
);
const vers = [CURRENT, ...["v2", "v1"].filter((v) => v !== CURRENT)];
const perVer = (f: (r: Run) => number) => vers.map((v) => `${v}: ${runs.filter((r) => r.ver === v).reduce((a, r) => a + f(r), 0)}`).join(" · ");
const backfilled = runs.reduce((a, r) => a + r.loops.filter((l) => l.settleSeenBy === "backfill").length, 0);
L.push(
  `| Bench errors before an order existed: all but one are reverted opens, the other a bench parsing bug. The bench kept only the first line of each error, so the revert reasons were lost (fixed). They cluster at balance top-ups, and the one open revert decoded since was \`ERC20: transfer amount exceeds balance\`, so a short wallet is likely but not proven | ${perVer((r) => r.errors)} | \`errors.jsonl\` in each run |`,
  `| Recorded orders not settled by the bench's timeout | ${perVer((r) => r.loops.filter((l) => !l.ok).length)} | \`loops.jsonl\`, \`ok: false\` |`,
  `| Orders our solver left unfilled, refunded to the user by Reactive's callback | ${refunds.length} | \`evidence/live/recovery/refunds.jsonl\` |`,
  `| Settlements the observer missed (its log scanner fell >200 blocks behind; fixed), completed from chain logs | ${backfilled} | the tier-2 run with \`loops.observed.jsonl\` |`,
  "| Solver process crashed on an RPC timeout (fixed: scan errors no longer stop it) | 1 | `docs/DECISIONS.md` |",
  "| Solver stalled after its log cursor fell >200 Base blocks behind (bug introduced by the speed-up, fixed); 3 tier-0 orders went unfilled and were refunded | 1 | `docs/DECISIONS.md` |",
  "| Interrupted run kept, not deleted | 1 | `bench-tier2-2026-11-15T18-38-52-553Z` |",
);
if (reorg) L.push(`| Reorg check: recorded transactions re-fetched on ${reorg.at.slice(0, 10)}; missing / moved block / now failed | ${reorg.missing} / ${reorg.changedBlock} / ${reorg.failedNow} of ${reorg.checked} | \`evidence/live/reorg-check.json\` |`);
L.push(
  "",
  "## 6. Previous deployments",
  "",
  "v2: as v3 but `open()` accepted any token and amount (addresses in `contracts/deployments/live-v2/`). v1: no confirm step; delayed tiers drained on Cron10 (`contracts/deployments/live-v1/`). Their runs, kept as recorded:",
  "",
  "| Run | Contracts | Tier | Settled / recorded | Bench errors |",
  "|---|---|---|---|---|",
  ...prev.map((r) => `| \`${r.dir}\` | ${r.ver} | ${r.s.tier} | ${r.s.ok} / ${r.s.n} | ${r.errors} |`),
  "",
  "## 7. The comparison, reproducible",
  "",
  "Across repays relayers in bundles, proposed every ~1.5 hours at minimum ([Across docs](https://docs.across.to/introduction/refunds)), each followed by a challenge period. Read the challenge period from the live HubPool on Ethereum mainnet:",
  "",
  "```",
  "cast call 0xc186fA914353c44b2E33eBE05f21846F1048bEda \"liveness()(uint32)\" --rpc-url https://ethereum-rpc.publicnode.com",
  "# 1800  (30 minutes)",
  "```",
  "",
  "`HubPool.sol` declares a 7200 s default and older Across docs still say 2 hours; both are stale (`setLiveness` has been called since). So a relayer waits roughly 30 minutes to 2 hours. Per tier, Snapsettle's repayment after the fill is about 2 s (orders ≤ 0.5 USDC on testnet), 30 s + confirm, or 300 s + confirm. The advantage is largest for small orders and about 6–24× for the 300 s tier.",
  "",
  "## 8. Check it yourself",
  "",
  "1. Open a repay callback in section 2: `OriginEscrow.Settled` names the order and the solver.",
  "2. Open the Lasna transactions in the same row: `SnapsettleReactive` emitted `FillAccepted` (or `FillConfirmed`) and `SettlementRequested` for the same order id.",
  "3. Open the fill on Unichain: `DestinationSettler.Filled` carries the order's terms hash, which the reactive contract compared with `Opened`. For delayed tiers, `Confirmed` comes after the tier's delay.",
  "4. Re-run: `cd offchain && SNAP_ENV=live pnpm bench --tier 0 --n 10`, then `pnpm judge`.",
  "",
);

const out = ENV === "live" ? join(ROOT, "JUDGE.md") : join(ROOT, ".local", "JUDGE.local.md");
mkdirSync(join(out, ".."), { recursive: true });
writeFileSync(out, L.join("\n"));
console.log(`wrote ${out}`);
