// Writes JUDGE.md from the deployed addresses and the recorded evidence, so every number in it is a link.
//   SNAP_ENV=live pnpm judge   → JUDGE.md
//   SNAP_ENV=local pnpm judge  → .local/JUDGE.local.md (preview only, never committed)
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ENV, ROOT, addr, explorers } from "./common.ts";

type Stat = { n: number; p50: number; p95: number };
type Summary = { tier: number; amount: string; n: number; ok: number; summary: Record<string, Stat> };
type Loop = { i: number; orderId: string; ok: boolean; tx: Record<string, string | undefined> };
type Case = { name: string; pass: boolean; detail: string; tx: Record<string, string | undefined> };

const evDir = join(ROOT, "evidence", ENV);
const runs: Array<{ dir: string; s: Summary; loops: Loop[] }> = [];
const cases = new Map<string, Case & { run: string }>();
if (existsSync(evDir)) {
  for (const d of readdirSync(evDir).sort()) {
    const sum = join(evDir, d, "summary.json");
    if (d.startsWith("bench-") && existsSync(sum)) {
      const loops = readFileSync(join(evDir, d, "loops.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as Loop);
      runs.push({ dir: d, s: JSON.parse(readFileSync(sum, "utf8")) as Summary, loops });
    }
    const c = join(evDir, d, "cases.jsonl");
    if (d.startsWith("negative-") && existsSync(c)) {
      for (const l of readFileSync(c, "utf8").trim().split("\n").filter(Boolean)) {
        const x = JSON.parse(l) as Case;
        cases.set(x.name, { ...x, run: d });
      }
    }
  }
}

const link = (chain: keyof typeof explorers, kind: "tx" | "address", v?: string) => (v ? (ENV === "live" ? `[\`${v.slice(0, 10)}…\`](${explorers[chain]}/${kind}/${v})` : `\`${v.slice(0, 10)}…\``) : "—");
const s = (ms?: number) => (ms === undefined || !Number.isFinite(ms) ? "—" : ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60_000)}:${String(Math.round((ms % 60_000) / 1000)).padStart(2, "0")}`);
const chainOfCaseTx = (k: string): keyof typeof explorers => (/Rejected|Accepted/.test(k) ? "lasna" : /fill/i.test(k) ? "dest" : "origin");

// Latest run per tier, and all loops per tier for the totals.
const byTier = new Map<number, Array<{ dir: string; s: Summary; loops: Loop[] }>>();
for (const r of runs) byTier.set(r.s.tier, [...(byTier.get(r.s.tier) ?? []), r]);

const lines: string[] = [
  "# JUDGE.md",
  "",
  ENV === "live"
    ? "Everything below was generated from the deployed contracts and `evidence/live/` by `offchain/src/judge.ts`. Every number links to transactions."
    : "> LOCAL preview (anvil + emulated Reactive relay). Not live evidence.",
  "",
  "## Deployed contracts",
  "",
  "| Contract | Chain | Address |",
  "|---|---|---|",
  `| OriginEscrow | Base Sepolia (84532) | ${link("origin", "address", addr.escrow)} |`,
  `| SnapsettleResolver (ERC-7683) | Base Sepolia (84532) | ${link("origin", "address", addr.resolver)} |`,
  `| DestinationSettler | Unichain Sepolia (1301) | ${link("dest", "address", addr.destinationSettler)} |`,
  `| SnapsettleReactive | Reactive Lasna (5318007) | ${link("lasna", "address", addr.reactive)} |`,
  "",
  "## One full loop per tier",
  "",
  "Origin event → fill → reactive transaction → callback that repays the solver.",
  "",
  "| Tier | Open (Base) | Fill (Unichain) | React (Lasna) | Repay callback (Base) |",
  "|---|---|---|---|---|",
];
for (const [tier, rs] of [...byTier.entries()].sort((a, b) => a[0] - b[0])) {
  const loop = rs.at(-1)!.loops.find((l) => l.ok);
  if (!loop) continue;
  lines.push(`| ${tier} | ${link("origin", "tx", loop.tx.open)} | ${link("dest", "tx", loop.tx.fill)} | ${link("lasna", "tx", loop.tx.react)} | ${link("origin", "tx", loop.tx.settle)} |`);
}
lines.push(
  "",
  "## Latency, measured",
  "",
  "Wall clock on one observer polling public RPCs every ~150 ms (an upper bound). Fill → repaid is the part Reactive performs, including the tier's policy delay.",
  "",
  "| Tier | Loops settled | Fill → repaid p50 | p95 | Full loop p50 | p95 | Run |",
  "|---|---|---|---|---|---|---|",
);
for (const [tier, rs] of [...byTier.entries()].sort((a, b) => a[0] - b[0])) {
  const r = rs.at(-1)!;
  const f = r.s.summary["fillToSettle_ms"];
  const full = r.s.summary["full_ms"];
  lines.push(`| ${tier} | ${r.s.ok}/${r.s.n} | ${s(f?.p50)} | ${s(f?.p95)} | ${s(full?.p50)} | ${s(full?.p95)} | \`evidence/${ENV}/${r.dir}\` |`);
}
lines.push("", "Reference: Across repays relayers after a challenge period of 2 hours by default ([Across docs](https://docs.across.to/user-docs/how-across-works/speed)).", "", "## Refused on-chain", "", "| Case | Result | Transactions |", "|---|---|---|");
for (const c of cases.values()) {
  const txs = Object.entries(c.tx).filter(([, v]) => v).map(([k, v]) => `${k}: ${link(chainOfCaseTx(k), "tx", v)}`).join("<br>");
  lines.push(`| ${c.name} | ${c.pass ? "held" : "FAILED"}: ${c.detail} | ${txs} |`);
}
lines.push("", "## How to check it yourself", "", "1. Open any repay callback above on the Base Sepolia explorer: `OriginEscrow.Settled` names the order and the solver.", "2. Open the Lasna transaction from the same row: `SnapsettleReactive` emitted `FillAccepted` and `SettlementRequested` for the same order id.", "3. Open the fill on Unichain Sepolia: `DestinationSettler.Filled` carries the order's terms hash, which the reactive contract compared with the `Opened` event.", "");

const out = ENV === "live" ? join(ROOT, "JUDGE.md") : join(ROOT, ".local", "JUDGE.local.md");
mkdirSync(join(out, ".."), { recursive: true });
writeFileSync(out, lines.join("\n"));
console.log(`wrote ${out}`);
