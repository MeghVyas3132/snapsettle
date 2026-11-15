// Percentiles and the markdown table for bench summaries.
export type LoopRow = {
  i: number;
  env: string;
  tier: number;
  orderId: string;
  amount: string;
  ok: boolean;
  tx: Record<string, string | undefined>;
  blocks: Record<string, bigint | undefined>;
  blockTs: Record<string, bigint | undefined>;
  seenAtMs: Record<string, number | undefined>;
  seg: Record<string, number | null>;
};

export const SEGMENTS: Array<[key: string, label: string]> = [
  ["fillToSettle_ms", "fill → solver repaid (Reactive settlement), wall ms"],
  ["full_ms", "open sent → solver repaid (full loop), wall ms"],
  ["fullBase_ms", "open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag)"],
  ["openToFill_ms", "open mined → fill seen (solver), wall ms"],
  ["fillToReact_ms", "fill seen → FillAccepted on Lasna, wall ms"],
  ["reactToSettle_ms", "settle requested → Settled on origin, wall ms"],
  ["fillToSettle_s", "fill → repaid, block timestamps, s"],
  ["full_s", "open → repaid, block timestamps, s"],
  ["fillToReact_s", "fill → FillAccepted, block timestamps, s"],
  ["reactToSettle_s", "settle requested → Settled, block timestamps, s"],
];

export function pct(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export type Stat = { n: number; min: number; p50: number; p95: number; max: number };

export function summarize(rows: LoopRow[], segs: Array<[string, string]>): Record<string, Stat> {
  const out: Record<string, Stat> = {};
  for (const [k] of segs) {
    const v = rows.filter((r) => r.ok).map((r) => r.seg[k]).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
    out[k] = { n: v.length, min: v[0] ?? NaN, p50: pct(v, 50), p95: pct(v, 95), max: v[v.length - 1] ?? NaN };
  }
  return out;
}

export function renderSummaryMd(env: string, tier: number, amount: bigint, rows: LoopRow[], s: Record<string, Stat>, link: (h: string) => string): string {
  const ok = rows.filter((r) => r.ok).length;
  const lines = [
    `# Bench: ${env.toUpperCase()} · tier ${tier} · ${ok}/${rows.length} loops settled`,
    "",
    env === "local"
      ? "> LOCAL harness (anvil + emulated Reactive relay). Not evidence of live Reactive latency."
      : "> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.",
    "",
    `Order input: ${amount} (token base units). Generated ${new Date().toISOString()}.`,
    "",
    "| Segment | n | min | p50 | p95 | max |",
    "|---|---|---|---|---|---|",
    ...SEGMENTS.map(([k, label]) => `| ${label} | ${s[k].n} | ${s[k].min} | ${s[k].p50} | ${s[k].p95} | ${s[k].max} |`),
    "",
    "Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.",
    "",
    "## Loops",
    "",
    "| # | order | open | fill | react (Lasna) | settle |",
    "|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.i} | \`${r.orderId.slice(0, 10)}\` | ${r.tx.open?.slice(0, 10)} | ${r.tx.fill?.slice(0, 10) ?? "-"} | ${r.tx.react?.slice(0, 10) ?? "-"} | ${r.tx.settle?.slice(0, 10) ?? "-"} |`),
    "",
    "Full hashes: `loops.jsonl`.",
  ];
  void link;
  return lines.join("\n") + "\n";
}
