import "./style.css";
import { createPublicClient, http, parseAbiItem, type Address, type Hex, type PublicClient } from "viem";
import { mountClock } from "./clock";

// ---------------------------------------------------------------- types

type Env = "live" | "local";
type Config = {
  env: Env;
  deployed: boolean;
  rpc: { origin: string; dest: string; lasna: string };
  chains: { origin: number; dest: number; lasna: number };
  explorers: { origin: string | null; dest: string | null; lasna: string | null };
  plannedTiers?: Array<{ maxAmount: string; delay: number }>;
  addresses: { escrow: Address | null; destinationSettler: Address | null; reactive: Address | null; resolver: Address | null; tokenOrigin: Address | null; tokenDest: Address | null };
};
type Stat = { n: number; min: number; p50: number; p95: number; max: number };
type Run = {
  run: string; env: Env; tier: number; tierDelay?: number; amount: string; n: number; ok: number;
  summary: Record<string, Stat>;
  loops: Array<{ i: number; orderId: Hex; ok: boolean; seg: Record<string, number | null>; tx: Record<string, Hex | undefined> }>;
};
type Negative = { run: string; name: string; pass: boolean; detail: string; tx: Record<string, string | undefined> };
type Evidence = { env: Env; runs: Run[]; negatives: Negative[] };
type Tier = { maxAmount: bigint; delay: number };

type Row = {
  orderId: Hex;
  amount: bigint | null;
  tier: number | null;
  delay?: number; // the policy delay this order ran under, in seconds
  t: { open?: number; fill?: number; seen?: number; repaid?: number }; // seconds (wall or block clock)
  tx: { open?: Hex; fill?: Hex; react?: Hex; settle?: Hex };
  state: "open" | "filled" | "waiting" | "repaid" | "refunded";
  source: "bench" | "chain";
  sortKey: number;
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
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

// Each leg uses its most RPC-independent clock; `fallback` covers runs recorded before that field existed.
const LEGS: Array<{ key: string; fallback?: string; name: string; sub: string; policy?: boolean }> = [
  { key: "fillToSettle_s", fallback: "fillToSettle_ms", name: "Fill → solver repaid", sub: "Reactive settlement · chain block times", policy: true },
  { key: "fullBase_ms", fallback: "full_ms", name: "Open → repaid", sub: "full loop · counted in Base blocks (200 ms)" },
  { key: "openToFill_ms", name: "Open → fill", sub: "solver picks up and fills · solver's receipt" },
  { key: "reactToSettle_s", fallback: "reactToSettle_ms", name: "Settle request → repaid", sub: "callback lands on Base · chain block times" },
  { key: "fillToReact_ms", name: "Fill → seen on Lasna", sub: "as an observer saw it via public RPC · upper bound" },
];
/** A segment's stat in milliseconds, from `*_s` (seconds) or `*_ms` keys. */
function statMs(run: Run, key: string, fallback?: string): Stat | undefined {
  const pick = run.summary[key]?.n ? key : fallback && run.summary[fallback]?.n ? fallback : undefined;
  if (!pick) return undefined;
  const s = run.summary[pick];
  const k = pick.endsWith("_s") ? 1000 : 1;
  return { n: s.n, min: s.min * k, p50: s.p50 * k, p95: s.p95 * k, max: s.max * k };
}

// ---------------------------------------------------------------- formatting

const fmtS = (s: number | null | undefined) => {
  if (s === null || s === undefined || !Number.isFinite(s)) return "—";
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
};
/** Cross-chain block clocks differ by about ±1 s: a difference under a second reads "<1 s", never negative. */
const crossChain = (s: number | undefined) => (s === undefined || !Number.isFinite(s) ? "—" : s < 1 ? "<1 s" : fmtS(s));
const fmtUsdc = (a: bigint | null) => (a === null ? "—" : (Number(a) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 6 }));
const short = (h?: string | null) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "—");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// ---------------------------------------------------------------- state

const params = new URLSearchParams(location.search);
let env: Env = (params.get("env") as Env) === "local" ? "local" : "live";
let config: Config;
let evidence: Evidence;
let tiers: Tier[] = [];
let activeTier = 0;
let openRow: Hex | null = null;
const chainRows = new Map<string, Row>();
let clients: { origin: PublicClient; dest: PublicClient; lasna: PublicClient } | null = null;
let pollTimer: number | undefined;
const clock = mountClock($("clock"));

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(path, { cache: "no-store" });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

const tx = (chain: "origin" | "dest" | "lasna", hash?: string) => {
  if (!hash) return "—";
  const base = config.explorers[chain];
  return base ? `<a href="${base}/tx/${hash}" target="_blank" rel="noopener">${short(hash)}</a>` : `<span class="mono">${short(hash)}</span>`;
};
const addrLink = (chain: "origin" | "dest" | "lasna", a: string | null) => {
  if (!a) return "not deployed";
  const base = config.explorers[chain];
  return base ? `<a href="${base}/address/${a}" target="_blank" rel="noopener">${short(a)}</a>` : `<span class="mono">${short(a)}</span>`;
};

function tierOf(amount: bigint | null): number | null {
  if (amount === null || !tiers.length) return null;
  const i = tiers.findIndex((t) => amount <= t.maxAmount);
  return i === -1 ? tiers.length - 1 : i;
}

// ---------------------------------------------------------------- render: env switch, notice

function renderEnvSwitch(available: Env[]) {
  const nav = $("env-switch");
  nav.innerHTML = "";
  for (const e of available) {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = e === "live" ? `Live<span class="long"> testnets</span>` : `Local<span class="long"> harness</span>`;
    b.setAttribute("aria-pressed", String(e === env));
    b.addEventListener("click", () => {
      if (e === env) return;
      env = e;
      const u = new URL(location.href);
      if (e === "local") u.searchParams.set("env", "local");
      else u.searchParams.delete("env");
      history.replaceState(null, "", u);
      void boot();
    });
    nav.appendChild(b);
  }
}

function renderNotice() {
  const n = $("notice");
  if (env === "local") {
    n.dataset.kind = "local";
    n.textContent = "Local harness: three anvil chains with an emulated Reactive relay. These numbers show the loop works; they are not Reactive Network latency.";
    n.hidden = false;
  } else if (!config.deployed) {
    n.dataset.kind = "live";
    n.textContent = "Live contracts are not deployed yet. Every panel below fills from Base Sepolia, Unichain Sepolia and Lasna once they are.";
    n.hidden = false;
  } else {
    n.hidden = true;
  }
}

// ---------------------------------------------------------------- render: duel + splits

function latestRun(tier: number): Run | undefined {
  return [...evidence.runs].filter((r) => r.tier === tier && r.ok > 0).sort((a, b) => a.run.localeCompare(b.run)).pop();
}

function renderDuel() {
  const run = latestRun(0);
  const st = run ? statMs(run, "fillToSettle_s", "fillToSettle_ms") : undefined;
  if (!run || !st || !Number.isFinite(st.p50)) {
    $("snap-src").textContent = env === "live" ? "Snapsettle's face fills from live bench runs once the contracts are deployed." : "No local bench runs yet.";
    clock.setSnap(null, null);
    return;
  }
  clock.setSnap(st.p50 / 1000, st.p95 / 1000);
  const wall = run.summary["fillToSettle_ms"];
  const where = env === "live" ? "live loops on Base Sepolia, Unichain Sepolia and Lasna" : "loops on the local harness (emulated relay)";
  const clockNote = run.summary["fillToSettle_s"]?.n
    ? `measured on the chains' own block clocks (1 s resolution)${wall?.n ? `; an observer polling public RPCs saw p50 ${fmtS(wall.p50 / 1000)}, p95 ${fmtS(wall.p95 / 1000)}, an upper bound` : ""}`
    : "measured by wall clock";
  $("snap-src").innerHTML = `Snapsettle face: fill → solver repaid over ${st.n} ${where}, orders settled on sight, ${clockNote}. Run <span class="mono">${esc(run.run)}</span>, every order in the <a href="#sheet-h">scoresheet</a>.`;
}

function renderTierTabs() {
  const host = $("tier-tabs");
  host.innerHTML = "";
  const count = tiers.length;
  if (!count) {
    host.innerHTML = "";
    return;
  }
  for (let i = 0; i < count; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(i === activeTier));
    b.textContent = tiers[i] ? (tiers[i].delay === 0 ? "On sight" : fmtS(tiers[i].delay)) : `Tier ${i}`;
    b.addEventListener("click", () => {
      activeTier = i;
      renderTierTabs();
      renderSplits();
    });
    host.appendChild(b);
  }
}

function renderSplits() {
  $("splits-loop").innerHTML = loopSvg({ open: true, fill: true, react: true, settle: true }, true);
  const body = $("splits-body");
  const t = tiers[activeTier];
  const MAX = 2n ** 256n - 1n;
  const prevMax = activeTier > 0 ? tiers[activeTier - 1]?.maxAmount : undefined;
  const range = !t ? "" : t.maxAmount === MAX ? `Orders above ${fmtUsdc(prevMax ?? 0n)} USDC` : prevMax !== undefined ? `Orders above ${fmtUsdc(prevMax)} and up to ${fmtUsdc(t.maxAmount)} USDC` : `Orders up to ${fmtUsdc(t.maxAmount)} USDC`;
  $("tier-policy").textContent = t
    ? `${range} settle ${t.delay === 0 ? "the moment the fill is seen" : `${fmtS(t.delay)} after the fill is seen`}. The delay is the order's finality policy, surfaced to solvers as estimatedDelaySeconds.`
    : "";
  const run = latestRun(activeTier);
  if (!run) {
    body.innerHTML = `<tr><td colspan="4" class="empty">No ${env === "live" ? "live" : "local"} bench run for this tier yet.</td></tr>`;
    $("splits-src").textContent = "";
    return;
  }
  // One fixed log scale for every bar in every tier: 0.5 s to 600 s.
  const scale = (ms: number) => Math.max(0, Math.min(1, Math.log10(ms / 500) / Math.log10(600_000 / 500)));
  const policyMs = (t?.delay ?? 0) * 1000;
  body.innerHTML = LEGS.map((leg) => {
    const s = statMs(run, leg.key, leg.fallback);
    if (!s || !s.n) return `<tr><td><span class="leg-name">${leg.name}</span><span class="leg-sub">${leg.sub}</span></td><td class="num">—</td><td class="num">—</td><td></td></tr>`;
    const over = leg.policy && policyMs > 0 ? ` <small>+${fmtS((s.p50 - policyMs) / 1000)} over policy</small>` : "";
    const policyMark = leg.policy && policyMs > 0 ? `<span class="bar-policy" style="left:${(scale(policyMs) * 100).toFixed(1)}%" title="policy delay"></span>` : "";
    return `<tr>
      <td><span class="leg-name">${leg.name}</span><span class="leg-sub">${leg.sub}</span></td>
      <td class="num">${fmtS(s.p50 / 1000)}${over}</td>
      <td class="num">${fmtS(s.p95 / 1000)}</td>
      <td class="scale"><div class="bar-track"><span class="bar-p95" style="width:${(scale(s.p95) * 100).toFixed(1)}%"></span><span class="bar-p50" style="width:${(scale(s.p50) * 100).toFixed(1)}%"></span>${policyMark}</div></td>
    </tr>`;
  }).join("");
  const how = env === "live" ? "wall clock from one observer polling public RPCs every ~150 ms, so an upper bound" : "wall clock on the local harness, polled every ~150 ms";
  $("splits-src").innerHTML = `${run.ok}/${run.n} loops settled · run <span class="mono">${esc(run.run)}</span> · ${how} · bars on one log scale, 0.5 s to 10 min`;
}

// ---------------------------------------------------------------- render: scoresheet

function benchRows(): Row[] {
  const rows: Row[] = [];
  for (const run of evidence.runs) {
    const amt = BigInt(run.amount);
    for (const l of run.loops) {
      const s = (k: string) => (typeof l.seg[k] === "number" ? (l.seg[k] as number) / 1000 : undefined);
      const fill = s("openToFill_ms");
      const seen = fill !== undefined && s("fillToReact_ms") !== undefined ? fill + s("fillToReact_ms")! : undefined;
      const repaid = fill !== undefined && s("fillToSettle_ms") !== undefined ? fill + s("fillToSettle_ms")! : undefined;
      rows.push({
        orderId: l.orderId, amount: amt, tier: run.tier, delay: run.tierDelay,
        t: { open: 0, fill, seen, repaid },
        tx: { open: l.tx.open, fill: l.tx.fill, react: l.tx.react, settle: l.tx.settle },
        state: l.ok ? "repaid" : "waiting", source: "bench", sortKey: Date.parse(run.run.slice(-24).replace(/-(\d\d)-(\d\d)-(\d{3})Z$/, ":$1:$2.$3Z").replace(/T(\d\d)-/, "T$1:")) + l.i,
      });
    }
  }
  return rows;
}

function renderSheet() {
  const merged = new Map<string, Row>();
  for (const r of benchRows()) merged.set(r.orderId.toLowerCase(), r);
  for (const [k, r] of chainRows) {
    const prev = merged.get(k);
    // A row whose Opened fell outside the scanned window has no size or start time: show it only via its bench record.
    if (!r.tx.open && !prev) continue;
    // A bench record carries the precise per-leg timing; the chain read only adds orders the bench did not record.
    if (prev) continue;
    merged.set(k, r);
  }
  const rows = [...merged.values()].sort((a, b) => a.sortKey - b.sortKey);
  const body = $("sheet-body");
  body.classList.toggle("has-open", Boolean(openRow));
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="9" class="empty">${env === "live" && !config.deployed ? "Nothing yet. Each order opened on Base Sepolia is written here as a move, with its time per leg." : "No orders in the recorded runs or the recent blocks."}</td></tr>`;
    $("sheet-note").textContent = "";
    return;
  }
  const html: string[] = [];
  rows.reverse().forEach((r, idx) => {
    const no = rows.length - idx;
    const isOpen = openRow?.toLowerCase() === r.orderId.toLowerCase();
    const stateLabel = { open: "Open", filled: "Filled", waiting: "Queued", repaid: "Repaid", refunded: "Refunded" }[r.state];
    const delay = r.delay ?? (() => { const i = r.tier ?? tierOf(r.amount); return i === null ? undefined : tiers[i]?.delay; })();
    const policy = delay === undefined ? "—" : delay === 0 ? "on sight" : `after ${fmtS(delay)}`;
    const toRepaid = r.t.repaid !== undefined && r.t.fill !== undefined ? r.t.repaid - r.t.fill : undefined;
    const over = toRepaid !== undefined && delay ? `<small class="over">+${fmtS(toRepaid - delay)}</small>` : "";
    html.push(`<tr class="move${isOpen ? " is-open" : ""}" data-id="${r.orderId}" tabindex="0" aria-expanded="${isOpen}">
      <td class="move-no" data-l="Move">${String(no).padStart(3, "0")}</td>
      <td class="mono" data-l="Order">${short(r.orderId)}</td>
      <td class="num" data-l="USDC">${fmtUsdc(r.amount)}</td>
      <td data-l="Settles">${policy}</td>
      <td class="num" data-l="Open → fill">${fmtS(r.t.fill)}</td>
      <td class="num" data-l="Fill → seen">${crossChain(r.t.seen !== undefined && r.t.fill !== undefined ? r.t.seen - r.t.fill : undefined)}</td>
      <td class="num" data-l="Fill → repaid">${crossChain(toRepaid)}${over}</td>
      <td class="num" data-l="Total">${fmtS(r.t.repaid)}</td>
      <td data-l="State"><span class="state" data-s="${r.state}">${stateLabel}</span></td>
    </tr>`);
    if (isOpen) {
      const done = { open: Boolean(r.tx.open), fill: Boolean(r.tx.fill), react: Boolean(r.tx.react), settle: Boolean(r.tx.settle) };
      html.push(`<tr class="detail"><td colspan="9"><div class="detail__grid">
        <div class="loop">${loopSvg(done)}</div>
        <div class="detail__links">
          <div><span>Opened on Base Sepolia</span><br>${tx("origin", r.tx.open)}</div>
          <div><span>Filled on Unichain Sepolia</span><br>${tx("dest", r.tx.fill)}</div>
          <div><span>Checked on Lasna</span><br>${tx("lasna", r.tx.react)}</div>
          <div><span>Solver repaid on Base Sepolia</span><br>${tx("origin", r.tx.settle)}</div>
        </div></div></td></tr>`);
    }
  });
  body.innerHTML = html.join("");
  const bench = rows.filter((r) => r.source === "bench").length;
  const fromChain = rows.length - bench;
  $("sheet-note").textContent = `${rows.length} moves · ${bench} from recorded bench runs${fromChain > 0 ? `, ${fromChain} read from recent blocks` : ""} · fill → seen and fill → repaid count from the fill, +N is time over the order's policy delay · select a move for its transactions`;
}

function loopSvg(d: { open: boolean; fill: boolean; react: boolean; settle: boolean }, legs = false) {
  // One loop geometry: Base → Unichain → Lasna → Base.
  const n = [
    { x: 30, y: 70, label: "Base", on: d.open },
    { x: 110, y: 18, label: "Unichain", on: d.fill },
    { x: 190, y: 70, label: "Lasna", on: d.react },
  ];
  const edge = (a: (typeof n)[0], b: (typeof n)[0], on: boolean) => `<line class="edge${on ? " done" : ""}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
  return `<svg viewBox="${legs ? "-34 -14 288 134" : "0 -14 220 128"}" role="img" aria-label="${legs ? "The loop: open on Base, fill on Unichain, check on Lasna, repay on Base" : "Order progress around the loop"}">
    ${edge(n[0], n[1], d.fill)}${edge(n[1], n[2], d.react)}<path class="edge${d.settle ? " done" : ""}" d="M190 70 Q110 120 30 70"/>
    ${n.map((p) => `<circle class="node${p.on ? " done" : ""}" cx="${p.x}" cy="${p.y}" r="9"/><text x="${p.x}" y="${p.y + (p.y < 40 ? -14 : 26)}" text-anchor="middle">${p.label}</text>`).join("")}
    <circle class="node${d.settle ? " done" : ""}" cx="30" cy="70" r="5"/>
    ${legs ? `<text class="leg" x="58" y="36" text-anchor="end">open → fill</text><text class="leg" x="162" y="36">fill → seen</text><text class="leg" x="110" y="112" text-anchor="middle">repaid</text>` : ""}
  </svg>`;
}

$("sheet-body").addEventListener("click", (e) => {
  const tr = (e.target as HTMLElement).closest("tr.move") as HTMLElement | null;
  if (!tr) return;
  const id = tr.dataset.id as Hex;
  openRow = openRow === id ? null : id;
  renderSheet();
});
$("sheet-body").addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const tr = (e.target as HTMLElement).closest("tr.move") as HTMLElement | null;
  if (!tr) return;
  e.preventDefault();
  const id = tr.dataset.id as Hex;
  openRow = openRow === id ? null : id;
  renderSheet();
  (document.querySelector(`tr.move[data-id="${id}"]`) as HTMLElement | null)?.focus();
});

// ---------------------------------------------------------------- render: refusals + footer

function renderChecks() {
  const latest = new Map<string, Negative>();
  for (const n of evidence.negatives) latest.set(n.name, n);
  const host = $("checks");
  if (!latest.size) {
    host.innerHTML = `<li class="empty">No ${env} negative-case run recorded yet: wrong-terms fill, late fill, unfilled refund, refund after a valid fill.</li>`;
    return;
  }
  const chainOf = (k: string): "origin" | "dest" | "lasna" => (/fill/i.test(k) && !/Rejected|Accepted/.test(k) ? "dest" : /Rejected|Accepted/.test(k) ? "lasna" : "origin");
  host.innerHTML = [...latest.values()].map((n) => `<li>
      <b>${esc(n.name.charAt(0).toUpperCase() + n.name.slice(1))} <span class="verdict" data-v="${n.pass ? "pass" : "fail"}">${n.pass ? "held" : "failed"}</span></b>
      <span>${esc(n.detail)}</span>
      <span class="links">${Object.entries(n.tx).filter(([, v]) => v).map(([k, v]) => `${esc(k)} ${tx(chainOf(k), v)}`).join(" · ")}</span>
    </li>`).join("");
}

function renderFoot() {
  const a = config.addresses;
  $("foot").innerHTML = `
    <div><h3>Contracts</h3><ul>
      <li>OriginEscrow, Base Sepolia: ${addrLink("origin", a.escrow)}</li>
      <li>SnapsettleResolver (ERC-7683), Base Sepolia: ${addrLink("origin", a.resolver)}</li>
      <li>DestinationSettler, Unichain Sepolia: ${addrLink("dest", a.destinationSettler)}</li>
      <li>SnapsettleReactive, Lasna: ${addrLink("lasna", a.reactive)}</li>
    </ul></div>
    <div><h3>Sources</h3><ul>
      <li><a href="https://docs.across.to/user-docs/how-across-works/speed" target="_blank" rel="noopener">Across docs: default challenge period</a></li>
      <li><a href="https://blog.reactive.network/intents-solvers-and-borrowed-certainty/" target="_blank" rel="noopener">Reactive: Intents, Solvers, and Borrowed Certainty</a></li>
      <li><a href="https://eips.ethereum.org/EIPS/eip-7683" target="_blank" rel="noopener">ERC-7683 (Draft)</a></li>
    </ul></div>
    <div><h3>How to read this</h3><ul>
      <li>Every time is measured from transactions listed on this page; nothing is estimated.</li>
      <li>Testnet only. The solver is our own bot running a generic ERC-7683 fill.</li>
    </ul></div>`;
}

// ---------------------------------------------------------------- live chain reads

const blockTs = new Map<string, number>();
async function ts(c: PublicClient, chain: string, block: bigint): Promise<number> {
  const h = heads[chain];
  if (BLOCK_MS[chain] && h) return h.ts - (Number(h.block - block) * BLOCK_MS[chain]) / 1000;
  const k = `${chain}:${block}`;
  let v = blockTs.get(k);
  for (let i = 0; v === undefined && i < 6; i++) {
    try {
      v = Number((await c.getBlock({ blockNumber: block })).timestamp);
      blockTs.set(k, v);
    } catch {
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  if (v === undefined) throw new Error(`block ${block} unavailable`);
  return v;
}

const cursors: Record<string, bigint> = {};
const heads: Record<string, { block: bigint; ts: number }> = {};
// Base Sepolia makes a block every 200 ms and Unichain Sepolia every 1 s (both measured on-chain), so their block
// times follow from the block number without one RPC call per block. Lasna (~1.04 s) is fetched.
const BLOCK_MS: Record<string, number> = { origin: 200, dest: 1000 };
async function pollChain(name: "origin" | "dest" | "lasna", address: Address | null, events: readonly ReturnType<typeof parseAbiItem>[], lookback: bigint) {
  const c = clients![name];
  const head = await c.getBlockNumber();
  const latest = await c.getBlock({ blockNumber: head });
  heads[name] = { block: head, ts: Number(latest.timestamp) };
  const light = document.querySelector(`[data-chain="${name}"]`);
  if (light) {
    const age = Date.now() / 1000 - Number(latest.timestamp);
    light.querySelector(".light")!.setAttribute("data-state", age < 30 ? "ok" : "stale");
    light.querySelector("b")!.textContent = `#${head.toLocaleString("en-US")}`;
  }
  if (!address) return [];
  // sepolia.base.org rejects eth_getLogs wider than 200 blocks (HTTP 413); the others accept more.
  const span = name === "origin" ? 190n : 500n;
  type L = { eventName: string; args: Record<string, unknown>; blockNumber: bigint; transactionHash: Hex };
  const out: L[] = [];
  let from = cursors[name] ?? (head > lookback ? head - lookback : 0n);
  for (let i = 0; i < 12 && head > from; i++) {
    const to = head - from > span ? from + span : head;
    out.push(...((await c.getLogs({ address, events: events as never, fromBlock: from + 1n, toBlock: to })) as unknown as L[]));
    from = to;
  }
  // Re-scan the last few blocks next time: a load-balanced RPC can report a head its log index has not reached.
  cursors[name] = from > 10n ? from - 10n : 0n;
  return out;
}

function rowFor(id: Hex): Row {
  const k = id.toLowerCase();
  let r = chainRows.get(k);
  if (!r) {
    r = { orderId: id, amount: null, tier: null, t: {}, tx: {}, state: "open", source: "chain", sortKey: Date.now() };
    chainRows.set(k, r);
  }
  return r;
}

let polling = false;
async function prefetchTs(c: PublicClient, chain: string, blocks: bigint[]) {
  const todo = [...new Set(blocks.map(String))].filter((b) => !blockTs.has(`${chain}:${b}`)).map((b) => BigInt(b));
  if (BLOCK_MS[chain]) return; // derived from the block number, nothing to fetch
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(todo.slice(i, i + 4).map((b) => ts(c, chain, b).catch(() => undefined)));
  }
}

async function poll() {
  if (!clients || polling) return;
  polling = true;
  const a = config.addresses;
  let settledNow = false;
  try {
    const [o, d, l] = await Promise.all([
      pollChain("origin", a.escrow, ORIGIN_EVENTS, 3000n),
      pollChain("dest", a.destinationSettler, DEST_EVENTS, 900n),
      pollChain("lasna", a.reactive, LASNA_EVENTS, 900n),
    ]);
    await Promise.all([
      prefetchTs(clients.origin, "origin", o.map((x) => x.blockNumber)),
      prefetchTs(clients.dest, "dest", d.map((x) => x.blockNumber)),
      prefetchTs(clients.lasna, "lasna", l.filter((x) => x.eventName === "FillAccepted").map((x) => x.blockNumber)),
    ]);
    const absolute: Record<string, { open?: number; fill?: number; seen?: number; repaid?: number }> = {};
    if (params.has("debug")) console.info(`poll: origin ${o.length}, dest ${d.length}, lasna ${l.length}, cursors ${JSON.stringify(Object.fromEntries(Object.entries(cursors).map(([k, v]) => [k, String(v)])))}`);
    for (const log of o) {
      const id = log.args.orderId as Hex;
      const r = rowFor(id);
      const at = await ts(clients.origin, "origin", log.blockNumber);
      if (log.eventName === "Opened") {
        const order = log.args.order as { inputAmount: bigint };
        r.amount = order.inputAmount;
        r.tier = tierOf(order.inputAmount);
        r.tx.open = log.transactionHash;
        r.sortKey = at * 1000;
        (absolute[id] ??= {}).open = at;
      } else if (log.eventName === "Settled") {
        if (!r.tx.settle) settledNow = true;
        r.tx.settle = log.transactionHash;
        r.state = "repaid";
        (absolute[id] ??= {}).repaid = at;
      } else if (log.eventName === "Refunded") {
        r.state = "refunded";
      }
    }
    for (const log of d) {
      const id = log.args.orderId as Hex;
      const r = rowFor(id);
      r.tx.fill = log.transactionHash;
      if (r.state === "open") r.state = "filled";
      (absolute[id] ??= {}).fill = await ts(clients.dest, "dest", log.blockNumber);
    }
    for (const log of l) {
      const id = log.args.orderId as Hex;
      const r = rowFor(id);
      if (log.eventName === "FillAccepted") {
        r.tx.react = log.transactionHash;
        if (r.state !== "repaid" && Number(log.args.settleDelay) > 0) r.state = "waiting";
        (absolute[id] ??= {}).seen = await ts(clients.lasna, "lasna", log.blockNumber);
      }
    }
    // Store absolute block times, then express them relative to the open (block clocks, 1 s granularity).
    for (const [id, abs] of Object.entries(absolute)) {
      const r = rowFor(id as Hex);
      const rec = ((r as Row & { abs?: Record<string, number> }).abs ??= {});
      Object.assign(rec, abs);
      if (rec.open !== undefined) {
        r.t = {
          open: 0,
          fill: rec.fill !== undefined ? rec.fill - rec.open : r.t.fill,
          seen: rec.seen !== undefined ? rec.seen - rec.open : r.t.seen,
          repaid: rec.repaid !== undefined ? rec.repaid - rec.open : r.t.repaid,
        };
      }
    }
  } catch (e) {
    console.warn("poll failed:", (e as Error).message?.split("\n")[0]);
    document.querySelectorAll("[data-chain] .light").forEach((x) => x.getAttribute("data-state") === "ok" || x.setAttribute("data-state", "down"));
  }
  polling = false;
  renderSheet();
  if (settledNow) clock.press();
}

function renderChains() {
  const names = { origin: "Base Sepolia", dest: "Unichain Sepolia", lasna: "Lasna" } as const;
  $("chains").innerHTML = (Object.keys(names) as Array<keyof typeof names>)
    .map((k) => `<li data-chain="${k}"><span class="light" data-state="${config.deployed || env === "local" ? "stale" : "stale"}"></span>${names[k]} <b>…</b></li>`)
    .join("");
}

// ---------------------------------------------------------------- boot

async function boot() {
  if (pollTimer) clearInterval(pollTimer);
  chainRows.clear();
  for (const k of Object.keys(cursors)) delete cursors[k];
  openRow = null;
  const manifest = await loadJson<{ envs: Array<{ env: Env }> }>(`${DATA}/manifest.json`);
  const available = (manifest?.envs ?? [{ env: "live" }]).map((e) => e.env);
  if (!available.includes(env)) env = available[0] ?? "live";
  renderEnvSwitch(available);
  config = (await loadJson<Config>(`${DATA}/config.${env}.json`))!;
  evidence = (await loadJson<Evidence>(`${DATA}/evidence.${env}.json`)) ?? { env, runs: [], negatives: [] };
  renderNotice();
  renderChains();
  clients = {
    origin: createPublicClient({ transport: http(config.rpc.origin, { batch: { batchSize: 20, wait: 50 }, retryCount: 4, retryDelay: 600 }) }) as PublicClient,
    dest: createPublicClient({ transport: http(config.rpc.dest, { batch: { batchSize: 20, wait: 50 }, retryCount: 4, retryDelay: 600 }) }) as PublicClient,
    lasna: createPublicClient({ transport: http(config.rpc.lasna, { batch: { batchSize: 20, wait: 50 }, retryCount: 4, retryDelay: 600 }) }) as PublicClient,
  };
  tiers = [];
  if (config.addresses.reactive) {
    try {
      tiers = [...((await clients.lasna.readContract({ address: config.addresses.reactive, abi: TIERS_ABI, functionName: "tiers" })) as readonly Tier[])];
    } catch {
      tiers = [];
    }
  }
  if (!tiers.length && config.plannedTiers) {
    tiers = config.plannedTiers.map((t) => ({ maxAmount: BigInt(t.maxAmount), delay: t.delay }));
  }
  activeTier = 0;
  renderDuel();
  renderTierTabs();
  renderSplits();
  renderChecks();
  renderFoot();
  renderSheet();
  await poll();
  pollTimer = window.setInterval(() => void poll(), env === "local" ? 1500 : 4000);
}

void boot();
