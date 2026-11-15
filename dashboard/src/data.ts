// Data layer: deployment config and bench evidence (static JSON built by scripts/build-data.mjs) plus live
// reads of the three chains through public RPCs. No DOM here; the page subscribes to changes.
import { createPublicClient, http, parseAbiItem, type Address, type Hex, type PublicClient } from "viem";

export type Env = "live" | "local";
export type ChainKey = "origin" | "dest" | "lasna";
export type Config = {
  env: Env;
  deployed: boolean;
  rpc: { origin: string; dest: string; lasna: string };
  chains: { origin: number; dest: number; lasna: number };
  explorers: { origin: string | null; dest: string | null; lasna: string | null };
  plannedTiers?: Array<{ maxAmount: string; delay: number }>;
  addresses: { escrow: Address | null; destinationSettler: Address | null; reactive: Address | null; resolver: Address | null; tokenOrigin: Address | null; tokenDest: Address | null };
  demoApi?: string | null;
};
export type Stat = { n: number; min: number; p50: number; p95: number; max: number };
export type Loop = { i: number; orderId: Hex; ok: boolean; seg: Record<string, number | null>; tx: Record<string, Hex | undefined>; settleSeenBy?: string };
export type Run = { run: string; env: Env; tier: number; tierDelay?: number; amount: string; n: number; ok: number; note?: string; summary: Record<string, Stat>; loops: Loop[] };
export type Negative = { run: string; name: string; pass: boolean; detail: string; tx: Record<string, string | undefined> };
export type Refund = { orderId: Hex; amount: string; openTx: Hex; requestTx: Hex; refundTx?: Hex };
export type Evidence = { env: Env; runs: Run[]; negatives: Negative[]; refunds?: Refund[] };
export type Tier = { maxAmount: bigint; delay: number };

export type Row = {
  orderId: Hex;
  amount: bigint | null;
  tier: number | null;
  delay?: number; // the policy delay this order ran under, in seconds
  t: { open?: number; fill?: number; seen?: number; repaid?: number }; // seconds from the open
  tx: { open?: Hex; fill?: Hex; react?: Hex; settle?: Hex };
  state: "open" | "filled" | "waiting" | "repaid" | "refunded";
  source: "bench" | "chain";
  sortKey: number;
};

const DATA = "./data";
const ORIGIN_EVENTS = [
  parseAbiItem("event Opened(bytes32 indexed orderId, address indexed user, (address inputToken, uint256 inputAmount, address outputToken, uint256 outputAmount, address recipient, uint256 destinationChainId, address destinationSettler, uint32 fillDeadline) order)"),
  parseAbiItem("event Settled(bytes32 indexed orderId, address indexed repayTo, uint256 amount)"),
  parseAbiItem("event Refunded(bytes32 indexed orderId, address indexed user, uint256 amount)"),
];
const DEST_EVENTS = [parseAbiItem("event Filled(bytes32 indexed orderId, address indexed solver, bytes32 orderHash, address repayTo, uint32 fillTime)")];
const LASNA_EVENTS = [
  parseAbiItem("event FillAccepted(bytes32 indexed orderId, address repayTo, uint32 fillTime, uint32 settleDelay)"),
  parseAbiItem("event SettlementRequested(bytes32 indexed orderId, address repayTo)"),
];
const TIERS_ABI = [{ type: "function", name: "tiers", stateMutability: "view", inputs: [], outputs: [{ type: "tuple[]", components: [{ name: "maxAmount", type: "uint256" }, { name: "delay", type: "uint32" }] }] }] as const;

/** Each leg uses its most RPC-independent clock; `fallback` covers runs recorded before that field existed. */
export const LEGS = {
  fillToRepaid: { key: "fillToSettle_s", fallback: "fillToSettle_ms" },
  full: { key: "fullBase_ms", fallback: "full_ms" },
  openToFill: { key: "openToFill_ms" },
  fillToSeen: { key: "fillToReact_ms" },
  requestToRepaid: { key: "reactToSettle_s", fallback: "reactToSettle_ms" },
} as const;

/** A segment's stat in milliseconds, from `*_s` (seconds) or `*_ms` keys. */
export function statMs(run: Run | undefined, leg: { key: string; fallback?: string }): Stat | undefined {
  if (!run) return undefined;
  const pick = run.summary[leg.key]?.n ? leg.key : leg.fallback && run.summary[leg.fallback]?.n ? leg.fallback : undefined;
  if (!pick) return undefined;
  const s = run.summary[pick];
  const k = pick.endsWith("_s") ? 1000 : 1;
  return { n: s.n, min: s.min * k, p50: s.p50 * k, p95: s.p95 * k, max: s.max * k };
}

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(path, { cache: "no-store" });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

type Listener = () => void;

class Store {
  env: Env = new URLSearchParams(location.search).get("env") === "local" ? "local" : "live";
  envs: Env[] = ["live"];
  config!: Config;
  evidence: Evidence = { env: "live", runs: [], negatives: [] };
  tiers: Tier[] = [];
  heads: Partial<Record<ChainKey, { block: bigint; ts: number; ok: boolean }>> = {};
  readonly chainRows = new Map<string, Row>();
  private clients: Record<ChainKey, PublicClient> | null = null;
  private cursors: Partial<Record<ChainKey, bigint>> = {};
  private timer: number | undefined;
  private polling = false;
  private listeners = { data: new Set<Listener>(), heads: new Set<Listener>(), settled: new Set<(id: Hex) => void>(), opened: new Set<(id: Hex) => void>() };

  on(kind: "data" | "heads", fn: Listener) {
    this.listeners[kind].add(fn);
  }
  onSettled(fn: (id: Hex) => void) {
    this.listeners.settled.add(fn);
  }
  onOpened(fn: (id: Hex) => void) {
    this.listeners.opened.add(fn);
  }
  /** While a live order is being watched, poll every 1.2 s instead of every 4 s. */
  setFast(on: boolean) {
    if (this.timer) clearInterval(this.timer);
    this.timer = window.setInterval(() => void this.poll(), on ? 1200 : this.env === "local" ? 1500 : 4000);
    if (on) void this.poll();
  }
  private emit(kind: "data" | "heads") {
    this.listeners[kind].forEach((f) => f());
  }

  async boot(env?: Env) {
    if (env) this.env = env;
    if (this.timer) clearInterval(this.timer);
    this.chainRows.clear();
    this.cursors = {};
    const manifest = await loadJson<{ envs: Array<{ env: Env }> }>(`${DATA}/manifest.json`);
    this.envs = (manifest?.envs ?? [{ env: "live" }]).map((e) => e.env);
    if (!this.envs.includes(this.env)) this.env = this.envs[0] ?? "live";
    this.config = (await loadJson<Config>(`${DATA}/config.${this.env}.json`))!;
    this.evidence = (await loadJson<Evidence>(`${DATA}/evidence.${this.env}.json`)) ?? { env: this.env, runs: [], negatives: [] };
    this.pooledCache.clear();
    const mk = (url: string) => createPublicClient({ transport: http(url, { batch: { batchSize: 20, wait: 50 }, retryCount: 4, retryDelay: 600 }) }) as PublicClient;
    this.clients = { origin: mk(this.config.rpc.origin), dest: mk(this.config.rpc.dest), lasna: mk(this.config.rpc.lasna) };
    this.tiers = [];
    if (this.config.addresses.reactive) {
      try {
        this.tiers = [...((await this.clients.lasna.readContract({ address: this.config.addresses.reactive, abi: TIERS_ABI, functionName: "tiers" })) as readonly Tier[])];
      } catch {
        this.tiers = [];
      }
    }
    if (!this.tiers.length && this.config.plannedTiers) this.tiers = this.config.plannedTiers.map((t) => ({ maxAmount: BigInt(t.maxAmount), delay: t.delay }));
    this.emit("data");
    void this.poll();
    this.timer = window.setInterval(() => void this.poll(), this.env === "local" ? 1500 : 4000);
  }

  // ------------------------------------------------------------ derived

  private pooledCache = new Map<number, Run | undefined>();
  /**
   * Every settled live loop of a tier, pooled across its bench runs (same contracts, same policy), with p50/p95
   * recomputed over the pooled loops. Each run stays listed in the evidence; `run` names how many were pooled.
   */
  latestRun(tier: number): Run | undefined {
    if (this.pooledCache.has(tier)) return this.pooledCache.get(tier);
    const runs = this.evidence.runs.filter((r) => r.tier === tier && r.ok > 0).sort((a, b) => a.run.localeCompare(b.run));
    let out: Run | undefined;
    if (runs.length) {
      const loops = runs.flatMap((r) => r.loops);
      const ok = loops.filter((l) => l.ok);
      const keys = new Set(runs.flatMap((r) => Object.keys(r.summary)));
      const summary: Record<string, Stat> = {};
      for (const k of keys) {
        const v = ok.map((l) => l.seg[k]).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
        const pct = (p: number) => v[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))];
        summary[k] = { n: v.length, min: v[0] ?? NaN, p50: v.length ? pct(50) : NaN, p95: v.length ? pct(95) : NaN, max: v[v.length - 1] ?? NaN };
      }
      const last = runs[runs.length - 1];
      out = { ...last, run: runs.length === 1 ? last.run : `${runs.length} runs pooled`, n: loops.length, ok: ok.length, summary, loops };
    }
    this.pooledCache.set(tier, out);
    return out;
  }

  /** The newest single run of a tier: for legs that depend on the solver's version (open → fill, whole loop). */
  newestRun(tier: number): Run | undefined {
    return this.evidence.runs.filter((r) => r.tier === tier && r.ok > 0 && !r.note).sort((a, b) => a.run.localeCompare(b.run)).pop();
  }

  tierOf(amount: bigint | null): number | null {
    if (amount === null || !this.tiers.length) return null;
    const i = this.tiers.findIndex((t) => amount <= t.maxAmount);
    return i === -1 ? this.tiers.length - 1 : i;
  }

  /** One recorded settled loop to replay at real speed: the median full-loop order of the instant tier. */
  replayLoop(): { loop: Loop; run: Run } | undefined {
    const run = this.latestRun(0);
    if (!run) return undefined;
    const ok = run.loops.filter((l) => l.ok && typeof l.seg.fullBase_ms === "number" && typeof l.seg.openToFill_ms === "number" && l.tx.settle);
    if (!ok.length) return undefined;
    const sorted = [...ok].sort((a, b) => (a.seg.fullBase_ms as number) - (b.seg.fullBase_ms as number));
    return { loop: sorted[Math.floor(sorted.length / 2)], run };
  }

  rows(): Row[] {
    const merged = new Map<string, Row>();
    for (const run of this.evidence.runs) {
      const amt = BigInt(run.amount);
      const stamp = Date.parse(run.run.slice(-24).replace(/-(\d\d)-(\d\d)-(\d{3})Z$/, ":$1:$2.$3Z").replace(/T(\d\d)-/, "T$1:"));
      for (const l of run.loops) {
        const s = (k: string) => (typeof l.seg[k] === "number" ? (l.seg[k] as number) : undefined);
        const fill = s("openToFill_ms") !== undefined ? s("openToFill_ms")! / 1000 : undefined;
        const seen = fill !== undefined && s("fillToReact_ms") !== undefined ? fill + s("fillToReact_ms")! / 1000 : undefined;
        const repaidFromFill = s("fillToSettle_s") ?? (s("fillToSettle_ms") !== undefined ? s("fillToSettle_ms")! / 1000 : undefined);
        const repaid = s("fullBase_ms") !== undefined ? s("fullBase_ms")! / 1000 : fill !== undefined && repaidFromFill !== undefined ? fill + repaidFromFill : undefined;
        merged.set(l.orderId.toLowerCase(), {
          orderId: l.orderId, amount: amt, tier: run.tier, delay: run.tierDelay,
          t: { open: 0, fill, seen, repaid },
          tx: { open: l.tx.open, fill: l.tx.fill, react: l.tx.react, settle: l.tx.settle },
          state: l.ok ? "repaid" : "waiting", source: "bench", sortKey: stamp + l.i,
        });
      }
    }
    for (const [k, r] of this.chainRows) {
      // A bench record carries the precise per-leg timing; the chain read only adds orders the bench did not record.
      if (merged.has(k) || !r.tx.open) continue;
      merged.set(k, r);
    }
    return [...merged.values()].sort((a, b) => b.sortKey - a.sortKey);
  }

  // ------------------------------------------------------------ live chain reads

  private blockTs = new Map<string, number>();
  // Base Sepolia makes a block every 200 ms and Unichain Sepolia every 1 s (both measured on-chain), so their block
  // times follow from the block number without one RPC call per block. Lasna (~1.04 s) is fetched.
  private BLOCK_MS: Partial<Record<ChainKey, number>> = { origin: 200, dest: 1000 };

  private async ts(chain: ChainKey, block: bigint): Promise<number> {
    const h = this.heads[chain];
    const ms = this.BLOCK_MS[chain];
    if (ms && h) return h.ts - (Number(h.block - block) * ms) / 1000;
    const k = `${chain}:${block}`;
    let v = this.blockTs.get(k);
    for (let i = 0; v === undefined && i < 6; i++) {
      try {
        v = Number((await this.clients![chain].getBlock({ blockNumber: block })).timestamp);
        this.blockTs.set(k, v);
      } catch {
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
      }
    }
    if (v === undefined) throw new Error(`block ${block} unavailable`);
    return v;
  }

  private async pollChain(name: ChainKey, address: Address | null, events: readonly ReturnType<typeof parseAbiItem>[], lookback: bigint) {
    const c = this.clients![name];
    const head = await c.getBlockNumber();
    const latest = await c.getBlock({ blockNumber: head });
    this.heads[name] = { block: head, ts: Number(latest.timestamp), ok: Date.now() / 1000 - Number(latest.timestamp) < 30 };
    this.emit("heads");
    if (!address) return [];
    // sepolia.base.org rejects eth_getLogs wider than 200 blocks (HTTP 413); the others accept more.
    const span = name === "origin" ? 190n : 500n;
    type L = { eventName: string; args: Record<string, unknown>; blockNumber: bigint; transactionHash: Hex };
    const out: L[] = [];
    let from = this.cursors[name] ?? (head > lookback ? head - lookback : 0n);
    for (let i = 0; i < 12 && head > from; i++) {
      const to = head - from > span ? from + span : head;
      out.push(...((await c.getLogs({ address, events: events as never, fromBlock: from + 1n, toBlock: to })) as unknown as L[]));
      from = to;
    }
    // Re-scan the last few blocks next time: a load-balanced RPC can report a head its log index has not reached.
    this.cursors[name] = from > 10n ? from - 10n : 0n;
    return out;
  }

  private rowFor(id: Hex): Row & { abs?: Record<string, number> } {
    const k = id.toLowerCase();
    let r = this.chainRows.get(k);
    if (!r) {
      r = { orderId: id, amount: null, tier: null, t: {}, tx: {}, state: "open", source: "chain", sortKey: Date.now() };
      this.chainRows.set(k, r);
    }
    return r;
  }

  private first = true;
  async poll() {
    if (!this.clients || this.polling) return;
    this.polling = true;
    const a = this.config.addresses;
    const settled: Hex[] = [];
    const opened: Hex[] = [];
    try {
      const [o, d, l] = await Promise.all([
        this.pollChain("origin", a.escrow, ORIGIN_EVENTS, 3000n),
        this.pollChain("dest", a.destinationSettler, DEST_EVENTS, 900n),
        this.pollChain("lasna", a.reactive, LASNA_EVENTS, 900n),
      ]);
      for (const log of o) {
        const id = log.args.orderId as Hex;
        const r = this.rowFor(id);
        const at = await this.ts("origin", log.blockNumber);
        r.abs ??= {};
        if (log.eventName === "Opened") {
          if (!r.tx.open && !this.first) opened.push(id);
          const order = log.args.order as { inputAmount: bigint };
          r.amount = order.inputAmount;
          r.tier = this.tierOf(order.inputAmount);
          r.tx.open = log.transactionHash;
          r.sortKey = at * 1000;
          r.abs.open = at;
        } else if (log.eventName === "Settled") {
          if (!r.tx.settle && !this.first) settled.push(id);
          r.tx.settle = log.transactionHash;
          r.state = "repaid";
          r.abs.repaid = at;
        } else if (log.eventName === "Refunded") {
          r.state = "refunded";
        }
      }
      for (const log of d) {
        const r = this.rowFor(log.args.orderId as Hex);
        r.tx.fill = log.transactionHash;
        if (r.state === "open") r.state = "filled";
        (r.abs ??= {}).fill = await this.ts("dest", log.blockNumber);
      }
      for (const log of l) {
        if (log.eventName !== "FillAccepted") continue;
        const r = this.rowFor(log.args.orderId as Hex);
        r.tx.react = log.transactionHash;
        if (r.state !== "repaid" && Number(log.args.settleDelay) > 0) r.state = "waiting";
        (r.abs ??= {}).seen = await this.ts("lasna", log.blockNumber);
      }
      for (const r of this.chainRows.values() as Iterable<Row & { abs?: Record<string, number> }>) {
        const abs = r.abs;
        if (abs?.open === undefined) continue;
        r.t = {
          open: 0,
          fill: abs.fill !== undefined ? abs.fill - abs.open : undefined,
          seen: abs.seen !== undefined ? abs.seen - abs.open : undefined,
          repaid: abs.repaid !== undefined ? abs.repaid - abs.open : undefined,
        };
      }
    } catch (e) {
      console.warn("poll failed:", (e as Error).message?.split("\n")[0]);
      for (const k of Object.keys(this.heads) as ChainKey[]) this.heads[k]!.ok = false;
      this.emit("heads");
    }
    this.first = false;
    this.polling = false;
    this.emit("data");
    opened.forEach((id) => this.listeners.opened.forEach((f) => f(id)));
    settled.forEach((id) => this.listeners.settled.forEach((f) => f(id)));
  }
}

export const store = new Store();

// ------------------------------------------------------------ formatting

export const fmtS = (s: number | null | undefined) => {
  if (s === null || s === undefined || !Number.isFinite(s)) return "—";
  if (s < 60) return `${s.toFixed(s < 10 && s % 1 !== 0 ? 1 : 0)} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
};
/** Cross-chain block clocks differ by about ±1 s: a difference under a second reads "<1 s", never negative. */
export const crossChain = (s: number | undefined) => (s === undefined || !Number.isFinite(s) ? "—" : s < 1 ? "<1 s" : fmtS(s));
export const fmtUsdc = (a: bigint | null) => (a === null ? "—" : (Number(a) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 6 }));
export const short = (h?: string | null) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "—");
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
export const explorer = (chain: ChainKey, kind: "tx" | "address", v?: string | null) => {
  const base = store.config?.explorers[chain];
  return base && v ? `${base}/${kind}/${v}` : null;
};
export const link = (chain: ChainKey, kind: "tx" | "address", v?: string | null, label?: string) => {
  if (!v) return "—";
  const u = explorer(chain, kind, v);
  return u ? `<a href="${u}" target="_blank" rel="noopener">${label ?? short(v)}</a>` : `<span>${label ?? short(v)}</span>`;
};
