import "@fontsource-variable/funnel-display";
import "@fontsource-variable/martian-mono";
import "./style.css";
import dsegUrl from "dseg/fonts/DSEG7-Classic/DSEG7Classic-Bold.woff2?url";
import type { Hex } from "viem";
import { store, statMs, LEGS, fmtS, crossChain, fmtUsdc, short, esc, link, type Env, type Row } from "./data";
import { ClockScene, state, webglAvailable } from "./scene";
import { note, layoutNotes } from "./notes";
import { setupScroll, intro, buildStory, onResizeRebuild, goTo, reduced } from "./story";
import { marquee, tickers, headings, magnet, animateNewRows } from "./ui";
import { initLive, openOwnOrder, runDemoOrder } from "./live";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
/** Sets innerHTML only when it changed: live polls every few seconds must not rebuild (and re-animate) the page. */
const put = (id: string, html: string) => {
  const el = $(id);
  if (el.dataset.html === html) return false;
  el.dataset.html = html;
  el.innerHTML = html;
  return true;
};
/** A seconds value that rolls up when it comes into view (Number Ticker); minutes stay static. */
const tk = (sec: number, text: string) => text.startsWith("<") ? `&lt;${text.slice(1)}` : (sec < 60 && text.endsWith(" s") ? `<span data-tick="${sec}" data-dec="${sec < 10 && sec % 1 ? 1 : 0}" data-unit=" s">${text}</span>` : text);
const ACROSS_DOCS = "https://docs.across.to/introduction/refunds";
const HUBPOOL = "https://etherscan.io/address/0xc186fA914353c44b2E33eBE05f21846F1048bEda#readContract";
const REPO = "https://github.com/MeghVyas3132/snapsettle";

let scene: ClockScene | null = null;
let story: ReturnType<typeof buildStory> | null = null;
let replaying = false;

// ---------------------------------------------------------------- formatting for the LCDs

const hms = (s: number, tenths = false) => {
  const neg = s < 0;
  s = Math.abs(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const ss = tenths ? sec.toFixed(1).padStart(4, "0") : String(Math.floor(sec)).padStart(2, "0");
  return `${neg ? "-" : ""}${h}:${String(m).padStart(2, "0")}:${ss}`;
};
const words = (s: number) => (s <= 1.05 ? "one second" : s < 10 ? `${s.toFixed(s % 1 ? 1 : 0)} seconds` : fmtS(s));

// ---------------------------------------------------------------- LCDs

const loadedAt = performance.now();
function tickLcds() {
  if (!scene) return;
  // Across's challenge period, read on-chain from the live HubPool: liveness() = 1800 s. Bundles add up to ~1.5 h on top.
  const left = 1800 - (performance.now() - loadedAt) / 1000;
  scene.lcdLeft.set(hms(Math.max(0, left)), { caption: "ACROSS · CHALLENGE" });
  if (replaying) return;
  // Idle, the right clock shows the recorded median fill → repaid (method B, 200 ms resolution): labelled P50, never LIVE.
  scene.lcdRight.set(heroP50Ms !== null ? hms(heroP50Ms / 1000, true) : "-:--:--", { caption: "SNAPSETTLE · P50" });
}

// ---------------------------------------------------------------- notes pinned to the object

function renderNotes() {
  const a = store.config.addresses;
  const run0 = store.latestRun(0);
  const f = statMs(run0, LEGS.fillToRepaid);
  const full = statMs(store.newestRun(0), LEGS.full);
  const o2f = statMs(store.newestRun(0), LEGS.openToFill);
  const f2s = statMs(run0, LEGS.fillToSeen);
  const r2r = statMs(run0, LEGS.requestToRepaid);
  const pp = (s?: { p50: number; p95: number }, cross = false) =>
    s ? `p50 <b>${cross ? crossChain(s.p50 / 1000) : fmtS(s.p50 / 1000)}</b> · p95 <b>${cross ? crossChain(s.p95 / 1000) : fmtS(s.p95 / 1000)}</b>` : "not measured yet";
  const where = store.env === "live" ? "live loops" : "local loops";

  note("across", "lcdLeft", "hero", -150, -118, `<span class="k">Across</span> challenge period, on-chain: <b>30 min</b><br>after a bundle of up to ~1.5 h · <a href="${HUBPOOL}" target="_blank" rel="noopener">HubPool</a> <code>liveness() = 1800</code>`);
  note("snap", "lcdRight", "hero", 120, -132, `<span class="k">Snapsettle</span> fill → solver repaid<br>${pp(f, true)} · ${f?.n ?? 0} ${where}`);

  note("escrow", "chipEscrow", "open", -30, 170, `<span class="k">OriginEscrow</span> · Base Sepolia<br>${link("origin", "address", a.escrow)} holds the user's USDC`);
  note("resolver", "chipResolver", "open", -60, -130, `<span class="k">SnapsettleResolver</span> · ERC-7683<br>${link("origin", "address", a.resolver)} tells any solver how to fill`, true);
  note("settler", "chipSettler", "open", 40, -150, `<span class="k">DestinationSettler</span> · Unichain Sepolia<br>${link("dest", "address", a.destinationSettler)} records the fill`);
  note("reactive", "chipReactive", "open", 30, -150, `<span class="k">SnapsettleReactive</span> · Lasna<br>${link("lasna", "address", a.reactive)} checks the fill, calls back`);

  note("leg0", "trace0", "loop", -60, -190, `<span class="k">open → fill</span><br>${pp(o2f)} · solver's receipt`);
  note("leg1", "trace1", "loop", 40, -150, `<span class="k">fill → seen on Lasna</span><br>${pp(f2s, true)} · observer, upper bound`);
  note("leg2", "trace2", "loop", -80, 80, `<span class="k">settle request → repaid</span><br>${pp(r2r, true)} · block times`);
  note("legFull", "chipReactive", "loop", 20, 150, `<span class="k">open → repaid, whole loop</span><br>${pp(full)} · counted in Base blocks`);

  const delays = store.tiers.map((t) => (t.delay === 0 ? "0 s" : `${t.delay} s`)).join(" / ") || "—";
  note("dip", "dip", "tiers", 40, 120, `<span class="k">Finality tier</span> · per order<br>${delays} · <code>estimatedDelaySeconds</code>`);
  note("confirm", "chipSettler", "tiers", 40, -130, `<span class="k">confirm()</span> after the delay<br>re-reads the fill on Unichain before any payout · no cron`, true);

  const neg = latestNegatives();
  const wrong = neg.find((n) => /wrong|terms/i.test(n.name));
  note("reject", "chipReactive", "refuse", -40, -150, wrong
    ? `<span class="k">FillRejected</span> · terms hash mismatch<br>no callback · ${Object.entries(wrong.tx).filter(([k]) => /reject/i.test(k)).map(([, v]) => link("lasna", "tx", v)).join(" ") || "on Lasna"}`
    : `<span class="k">FillRejected</span> · terms hash mismatch<br>no callback · contract tests, live run pending`);
}

function latestNegatives() {
  const m = new Map<string, (typeof store.evidence.negatives)[number]>();
  // Prefer cases run on the current contracts; fall back to the previous deployment's run until they exist.
  const cur = store.evidence.negatives.filter((n) => n.deployment !== "previous");
  for (const n of cur.length ? cur : store.evidence.negatives) m.set(n.name, n);
  return [...m.values()];
}

// ---------------------------------------------------------------- chapters

let heroP50Ms: number | null = null;
function renderHero() {
  const run = store.latestRun(0);
  // Fill → repaid, sub-second: the whole loop counted in Base blocks minus the solver's own fill time (method B).
  const b = (run?.loops ?? [])
    .filter((l) => l.ok && typeof l.seg.fullBase_ms === "number" && typeof l.seg.openToFill_ms === "number")
    .map((l) => (l.seg.fullBase_ms as number) - (l.seg.openToFill_ms as number))
    .sort((x, y) => x - y);
  const p = (q: number) => b[Math.min(b.length - 1, Math.max(0, Math.ceil((q / 100) * b.length) - 1))];
  heroP50Ms = b.length ? p(50) : null;
  const full = statMs(store.newestRun(0), LEGS.full);
  $("hero-p50").textContent = b.length ? `about ${words(Math.max(1, Math.round(p(50) / 1000)))}` : "in seconds";
  $("hero-src").innerHTML = !b.length
    ? store.env === "live" ? "Live numbers appear here once the bench has run on the current contracts." : "No local bench runs yet."
    : `${store.env === "local" ? "<b>Local harness, not Reactive Network latency.</b> " : ""}Fill on Unichain Sepolia to solver repaid on Base Sepolia: p50 ${fmtS(p(50) / 1000)}, p95 ${fmtS(p(95) / 1000)} over ${b.length} ${store.env} loops (the whole loop counted in Base blocks, minus the solver's own fill time). Whole loop, open to repaid: p50 ${fmtS((full?.p50 ?? NaN) / 1000)}. Across's challenge period: <code>cast call 0xc186…bEda "liveness()(uint32)"</code> on Ethereum returns 1800 (30 min), after bundles every ~1.5 h (<a href="${ACROSS_DOCS}" target="_blank" rel="noopener">docs</a>).`;
}

function renderLegs() {
  const run = store.latestRun(0);
  // Solver-dependent legs come from the newest run (current solver); Reactive's legs are pooled over every run.
  const cur = store.newestRun(0);
  const rows: Array<[string, string, ReturnType<typeof statMs>, boolean]> = [
    ["Open → fill", "our solver's own receipt · current solver", statMs(cur, LEGS.openToFill), false],
    ["Fill → seen on Lasna", "observer via public RPC, upper bound", statMs(run, LEGS.fillToSeen), true],
    ["Settle request → repaid", "chain block times", statMs(run, LEGS.requestToRepaid), true],
    ["Fill → solver repaid", "chain block times", statMs(run, LEGS.fillToRepaid), true],
    ["Open → repaid", "whole loop in Base blocks (200 ms) · current solver", statMs(cur, LEGS.full), false],
  ];
  const cell = (v: number, cross: boolean) => {
    const t = cross ? crossChain(v) : fmtS(v);
    return t.startsWith("<") ? t.replace("<", "&lt;") : tk(Number(v.toFixed(v < 10 ? 1 : 0)), t);
  };
  if (put("legs", rows
    .map(([name, how, s, cross]) => `<div class="leg"><dt>${name}<small>${how}</small></dt><dd><span>${s ? cell(s.p50 / 1000, cross) : "—"}</span><span class="p95">${s ? cell(s.p95 / 1000, cross) : "—"}</span></dd></div>`)
    .join(""))) tickers($("legs"));
  put("legs-src", run ? `p50 · p95 · Reactive legs pooled over ${run.ok}/${run.n} settled loops (${esc(run.run)}); solver legs from run <span class="mono">${esc(cur?.run ?? "")}</span>, ${cur?.ok}/${cur?.n} settled` : "");
}

let activeTier = -1;
function renderTiers(active = Math.round(state.tier)) {
  activeTier = active;
  const MAX = 2n ** 256n - 1n;
  const html = store.tiers
    .map((t, i) => {
      const prev = i > 0 ? store.tiers[i - 1].maxAmount : undefined;
      const range = t.maxAmount === MAX ? `above ${fmtUsdc(prev ?? 0n)} USDC` : prev !== undefined ? `${fmtUsdc(prev)}–${fmtUsdc(t.maxAmount)} USDC` : `up to ${fmtUsdc(t.maxAmount)} USDC`;
      const run = store.latestRun(i);
      const s = statMs(run, LEGS.fillToRepaid);
      const v = (ms: number) => tk(Number((ms / 1000).toFixed(ms < 10000 ? 1 : 0)), crossChain(ms / 1000));
      const measured = s ? `repaid p50 <b>${v(s.p50)}</b> · p95 <b>${v(s.p95)}</b> · ${s.n} loops` : "no run yet";
      return `<button type="button" class="tier" role="listitem" data-i="${i}">
        <span class="tier__delay">${t.delay === 0 ? "On sight" : `After ${fmtS(t.delay)}`}</span>
        <span class="tier__range">${range}</span>
        <span class="tier__m">${measured}</span>
      </button>`;
    })
    .join("");
  if (put("tier-list", html)) tickers($("tier-list"));
  // The active tier only flips an attribute: rebuilding would replay the number tickers.
  $("tier-list").querySelectorAll<HTMLElement>(".tier").forEach((b, i) => b.setAttribute("aria-current", String(i === active)));
}

function renderRefusals() {
  const neg = latestNegatives();
  const chainOf = (k: string) => (/Rejected|Accepted/.test(k) ? "lasna" : /fill|confirm/i.test(k) ? "dest" : "origin") as "origin" | "dest" | "lasna";
  const items = neg.map((n) => `<li><b>${esc(n.name.charAt(0).toUpperCase() + n.name.slice(1))}</b><span>${esc(n.detail)}</span><span class="tx">${Object.entries(n.tx).filter(([, v]) => v).map(([k, v]) => `${esc(k)} ${link(chainOf(k), "tx", v)}`).join(" · ")}</span></li>`);
  const refunds = store.evidence.refunds ?? [];
  if (refunds.length) {
    items.push(`<li><b>${refunds.length} unfilled orders refunded by Reactive</b><span>Our solver was down while these were open. After their deadline the user asked for a refund; Reactive's callback returned the USDC.</span><span class="tx">${refunds.slice(0, 3).map((r) => `request ${link("origin", "tx", r.requestTx)} → refund ${link("origin", "tx", r.refundTx)}`).join("<br>")}${refunds.length > 3 ? `<br>and ${refunds.length - 3} more in the evidence` : ""}</span></li>`);
  }
  const live = neg.length > 0;
  $("refuse-note").textContent = live
    ? "Each case below ran on the live testnets; the links are its transactions."
    : "The unfilled-order refunds below ran live. The wrong-terms and late-fill cases are covered by the contract tests; their live run is pending.";
  put("refusals", items.length ? items.join("") : `<li class="empty">The live refusal run is pending: wrong-terms fill, late fill, unfilled refund, refund after a valid fill. Each is covered by the contract tests.</li>`);
}

// ---------------------------------------------------------------- scoresheet

let sheetAll = false;
let openRow: string | null = null;
function renderSheet() {
  const rows = store.rows();
  const shown = sheetAll ? rows : rows.slice(0, 40);
  const policy = (r: Row) => {
    const d = r.delay ?? (r.tier !== null ? store.tiers[r.tier]?.delay : undefined);
    return d === undefined ? "—" : d === 0 ? "on sight" : `after ${fmtS(d)}`;
  };
  const label = { open: "Open", filled: "Filled", waiting: "Queued", repaid: "Repaid", refunded: "Refunded" };
  const html: string[] = [];
  shown.forEach((r, i) => {
    const toRepaid = r.t.repaid !== undefined && r.t.fill !== undefined ? r.t.repaid - r.t.fill : undefined;
    const isOpen = openRow === r.orderId.toLowerCase();
    const seen = r.t.seen !== undefined && r.t.fill !== undefined ? r.t.seen - r.t.fill : undefined;
    html.push(`<tr class="row${isOpen ? " is-open" : ""}${r.source === "chain" ? " is-live" : ""}" data-id="${r.orderId}" tabindex="0" aria-expanded="${isOpen}">
      <td class="no c-no">${String(rows.length - i).padStart(3, "0")}</td>
      <td class="mono c-ord">${short(r.orderId)}</td>
      <td class="num c-usdc">${fmtUsdc(r.amount)}</td>
      <td class="c-pol">${policy(r)}</td>
      <td class="num c-o2f">${fmtS(r.t.fill)}</td>
      <td class="num c-f2s" title="${r.source === "bench" ? "when one observer polling public RPCs first saw it: an upper bound" : "Lasna block time"}">${crossChain(seen)}${seen !== undefined ? `<small>${r.source === "bench" ? "obs" : "blk"}</small>` : ""}</td>
      <td class="num c-f2r">${crossChain(toRepaid)}</td>
      <td class="num c-tot">${fmtS(r.t.repaid)}</td>
      <td class="c-st"><span class="state" data-s="${r.state}">${label[r.state]}</span></td>
    </tr>`);
    if (isOpen) {
      html.push(`<tr class="detail"><td colspan="9"><ol class="detail__steps">
        <li><span>Opened on Base Sepolia</span>${link("origin", "tx", r.tx.open)}</li>
        <li><span>Filled on Unichain Sepolia</span>${link("dest", "tx", r.tx.fill)}</li>
        <li><span>Checked on Lasna</span>${link("lasna", "tx", r.tx.react)}</li>
        <li><span>Solver repaid on Base Sepolia</span>${link("origin", "tx", r.tx.settle)}</li>
      </ol></td></tr>`);
    }
  });
  if (put("sheet-body", html.join("") || `<tr><td colspan="9" class="empty">No orders recorded yet.</td></tr>`)) animateNewRows($("sheet-body"));
  const bench = rows.filter((r) => r.source === "bench").length;
  $("sheet-note").textContent = `${rows.length} orders · ${bench} from recorded bench runs${rows.length > bench ? `, ${rows.length - bench} read live from recent blocks` : ""} · fill → seen is "obs" (one observer's polling, an upper bound) or "blk" (Lasna block time) · select a row for its transactions`;
  renderTape(rows);
  const more = $("sheet-more");
  more.hidden = sheetAll || rows.length <= 40;
}

let tapeKey = "";
function renderTape(rows: Row[]) {
  const done = rows.filter((r) => r.state === "repaid" && r.tx.settle && r.t.fill !== undefined && r.t.repaid !== undefined).slice(0, 18);
  const key = done.map((r) => r.orderId).join();
  if (key === tapeKey) return;
  tapeKey = key;
  const policy = (r: Row) => {
    const d = r.delay ?? (r.tier !== null ? store.tiers[r.tier]?.delay : undefined);
    return d === undefined ? "" : d === 0 ? "ON SIGHT" : `AFTER ${fmtS(d).toUpperCase()}`;
  };
  marquee($("tape"), done.map((r) => `<b>${short(r.orderId)}</b><span>${policy(r)}</span><span>FILL → REPAID ${crossChain(r.t.repaid! - r.t.fill!).toUpperCase()}</span>${link("origin", "tx", r.tx.settle, "SETTLE TX")}`));
}

function toggleRow(id: string) {
  openRow = openRow === id.toLowerCase() ? null : id.toLowerCase();
  renderSheet();
  document.querySelector<HTMLElement>(`tr.row[data-id="${id}"]`)?.focus();
}

// ---------------------------------------------------------------- top bar and close

function renderHeads() {
  const names = { origin: "Base", dest: "Unichain", lasna: "Lasna" } as const;
  const host = $("heads");
  if (!host.children.length) {
    host.innerHTML = (Object.keys(names) as Array<keyof typeof names>).map((k) => `<li data-c="${k}"><i aria-hidden="true"></i>${names[k]} <b>…</b></li>`).join("");
  }
  for (const k of Object.keys(names) as Array<keyof typeof names>) {
    const h = store.heads[k];
    const li = host.querySelector<HTMLElement>(`[data-c="${k}"]`)!;
    if (!h) continue;
    li.dataset.ok = String(h.ok);
    const b = li.querySelector("b")!;
    const v = `#${h.block.toLocaleString("en-US")}`;
    if (b.textContent !== v) b.textContent = v;
  }
}

function renderEnv() {
  const nav = $("env");
  if (store.envs.length < 2) {
    nav.innerHTML = "";
    return;
  }
  nav.innerHTML = store.envs.map((e) => `<button type="button" data-env="${e}" aria-pressed="${e === store.env}">${e === "live" ? "Live" : "Local"}</button>`).join("");
}

function renderClose() {
  const a = store.config.addresses;
  put("close-cols", `
    <div><h3>Contracts</h3><ul>
      <li>OriginEscrow · Base Sepolia ${link("origin", "address", a.escrow)}</li>
      <li>SnapsettleResolver · Base Sepolia ${link("origin", "address", a.resolver)}</li>
      <li>DestinationSettler · Unichain Sepolia ${link("dest", "address", a.destinationSettler)}</li>
      <li>SnapsettleReactive · Lasna ${link("lasna", "address", a.reactive)}</li>
    </ul></div>
    <div><h3>Sources</h3><ul>
      <li><a href="${ACROSS_DOCS}" target="_blank" rel="noopener">Across: default challenge period</a></li>
      <li><a href="https://blog.reactive.network/intents-solvers-and-borrowed-certainty/" target="_blank" rel="noopener">Reactive: Intents, Solvers, and Borrowed Certainty</a></li>
      <li><a href="https://eips.ethereum.org/EIPS/eip-7683" target="_blank" rel="noopener">ERC-7683, resolver-centric draft</a></li>
      <li><a href="${REPO}" target="_blank" rel="noopener">Source code and evidence</a></li>
    </ul></div>
    <div><h3>How this is measured</h3><ul>
      <li>Every time on this page comes from transactions it links to. Where one observer's polling sets a time (when Lasna saw a fill), it is marked as an upper bound.</li>
      <li>Testnets only. The solver is our own bot running a generic ERC-7683 fill.</li>
      <li>Built for the Reactive Omni Buildathon, track Every Second Counts.</li>
    </ul></div>`);
}

function renderAll() {
  renderHero();
  renderLegs();
  renderTiers(activeTier < 0 ? 0 : activeTier);
  renderRefusals();
  renderSheet();
  renderEnv();
  renderClose();
  if (scene) renderNotes();
  tickLcds();
}

// ---------------------------------------------------------------- replay a real loop, and live settlements

function stepsHtml(active: number, t: number[], tx: Record<string, string | undefined>) {
  const steps: Array<[string, "origin" | "dest" | "lasna", string | undefined]> = [
    ["Opened on Base Sepolia", "origin", tx.open],
    ["Filled on Unichain Sepolia", "dest", tx.fill],
    ["Seen and checked on Lasna", "lasna", tx.react],
    ["Solver repaid on Base Sepolia", "origin", tx.settle],
  ];
  return steps
    // The Lasna time is when one observer first saw it, an upper bound; the chain's own order is fill → seen → repaid.
    .map(([name, c, h], i) => `<li data-on="${i <= active}"><span class="verify__t">${i === 2 && t[2] >= t[3] ? `&lt;+${t[3].toFixed(1)}` : `+${t[i].toFixed(1)}`} s</span><span>${name}</span>${link(c, "tx", h)}</li>`)
    .join("");
}

function openPanel(title: string, badge: "live" | "replay") {
  $("verify-title").textContent = title;
  $("verify-badge").textContent = badge === "live" ? "Live on testnet" : "Replay of a recorded loop";
  $("verify-badge").dataset.kind = badge;
  $("verify-src").textContent = "";
  $("verify").hidden = false;
}

async function replay() {
  const r = store.replayLoop();
  openPanel("A recorded loop, replayed at its real speed", "replay");
  if (!r) {
    $("verify-steps").innerHTML = `<li>No recorded loop to replay yet.</li>`;
    return;
  }
  if (replaying) return;
  replaying = true;
  const { loop, run } = r;
  const d0 = loop.seg.openToFill_ms as number;
  const total = loop.seg.fullBase_ms as number;
  // Pacing only: the pulse reaches Lasna before the repay, whatever the observer's lag was.
  const d1 = Math.max(200, Math.min((loop.seg.fillToReact_ms as number) ?? 1000, total - d0 - 600));
  const d2 = Math.max(300, total - d0 - d1);
  const marks = [0, d0 / 1000, (d0 + ((loop.seg.fillToReact_ms as number) ?? d1)) / 1000, total / 1000];
  $("verify-steps").innerHTML = stepsHtml(0, marks, loop.tx);
  $("verify-src").innerHTML = `Order ${short(loop.orderId)}, the median full loop of run <span class="mono">${esc(run.run)}</span>. Total counted in Base blocks; the Lasna step is when one observer first saw it, an upper bound.`;
  state.rocker = -1;
  const t0 = performance.now();
  let raf = 0;
  const count = () => {
    scene?.lcdRight.set(hms((performance.now() - t0) / 1000, true), { caption: `REPLAY · ${loop.orderId.slice(2, 6).toUpperCase()}` });
    raf = requestAnimationFrame(count);
  };
  count();
  const done = (s: number) => ($("verify-steps").innerHTML = stepsHtml(s, marks, loop.tx));
  if (scene) await scene.pulse([d0, d1, d2], (i) => done(i + 1 > 3 ? 3 : i + (i > 0 ? 1 : 0)));
  else await new Promise((res) => setTimeout(res, total));
  cancelAnimationFrame(raf);
  done(3);
  state.rocker = 1;
  scene?.lcdRight.set(hms(total / 1000, true), { caption: `REPLAY · ${loop.orderId.slice(2, 6).toUpperCase()}` });
  setTimeout(() => {
    replaying = false;
    tickLcds();
  }, 4000);
}

function liveSettled(_id: Hex) {
  // A settlement the live tracker is not following (e.g. it opened before this page loaded): press the rocker.
  if (replaying) return;
  state.rocker = -1;
  setTimeout(() => (state.rocker = 1), 380);
  scene?.legPulse(2);
}

// ---------------------------------------------------------------- events

$("verify-btn").addEventListener("click", () => void replay());
$("own-btn").addEventListener("click", () => void openOwnOrder());
$("demo-btn").addEventListener("click", () => void runDemoOrder());
$("verify-x").addEventListener("click", () => {
  $("verify").hidden = true;
  $("own-btn").focus();
});
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("verify").hidden) $("verify-x").click();
});
$("sheet-body").addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("a")) return;
  const tr = (e.target as HTMLElement).closest<HTMLElement>("tr.row");
  if (tr) toggleRow(tr.dataset.id!);
});
$("sheet-body").addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const tr = (e.target as HTMLElement).closest<HTMLElement>("tr.row");
  if (!tr) return;
  e.preventDefault();
  toggleRow(tr.dataset.id!);
});
$("sheet-more").addEventListener("click", () => {
  sheetAll = true;
  renderSheet();
});
$("tier-list").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>(".tier");
  if (b && story) goTo(story.tierScroll(Number(b.dataset.i)));
});
$("env").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-env]");
  if (!b || b.dataset.env === store.env) return;
  const u = new URL(location.href);
  if (b.dataset.env === "local") u.searchParams.set("env", "local");
  else u.searchParams.delete("env");
  history.replaceState(null, "", u);
  void store.boot(b.dataset.env as Env);
});
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    goTo(a.getAttribute("href")!);
  }),
);

/** Headline lines rise out of a mask once the scene has arrived. */
function revealHero() {
  const lines = document.querySelectorAll<HTMLElement>(".hero__l1, .hero__l2, .hero__foot");
  lines.forEach((el, i) => {
    el.animate([{ transform: "translateY(36px)", opacity: 0, filter: "blur(6px)" }, { transform: "none", opacity: 1, filter: "blur(0)" }], {
      duration: reduced ? 1 : 1300, delay: reduced ? 0 : 900 + i * 160, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards",
    });
  });
}

// ---------------------------------------------------------------- boot

async function boot() {
  const count = $("loader-count");
  let shown = 0;
  let target = 12;
  const roll = setInterval(() => {
    shown += Math.max(1, Math.round((target - shown) * 0.25));
    shown = Math.min(shown, target);
    count.textContent = String(shown).padStart(2, "0");
  }, 40);

  const dseg = new FontFace("DSEG7", `url(${dsegUrl})`, { weight: "700" });
  document.fonts.add(dseg);
  const fontsReady = Promise.all([
    dseg.load(),
    document.fonts.load('500 40px "Martian Mono Variable"'),
    document.fonts.load('300 80px "Funnel Display Variable"'),
  ]).catch(() => undefined);
  await fontsReady;
  target = 45;
  store.on("data", renderAll);
  store.on("heads", renderHeads);
  store.onSettled(liveSettled);
  renderHeads();
  await store.boot();
  target = 80;

  const gl = webglAvailable();
  if (gl) {
    scene = new ClockScene($("stage"));
    scene.onFrame = () => layoutNotes(scene!);
    if (new URLSearchParams(location.search).has("debug")) Object.assign(window as unknown as object, { __scene: scene, __store: store });
    renderNotes();
  } else {
    document.documentElement.classList.add("no-gl");
  }
  tickLcds();
  setInterval(tickLcds, 250);
  target = 100;
  await new Promise((r) => setTimeout(r, reduced ? 0 : 420));
  clearInterval(roll);
  count.textContent = "100";
  document.documentElement.classList.add("is-ready");
  $("loader").setAttribute("aria-busy", "false");

  setupScroll();
  const top = document.querySelector(".top")!;
  const solid = () => top.classList.toggle("top--solid", scrollY > $("sheet").offsetTop - 64);
  addEventListener("scroll", solid, { passive: true });
  solid();
  const build = () => {
    story = buildStory((i) => {
      if (i !== activeTier) renderTiers(i);
    });
  };
  if (gl) intro(() => undefined);
  headings(".ch__text h2, .sheet__head h2, .close__line");
  magnet($("own-btn"));
  initLive({
    scene,
    hms,
    hold: (on) => {
      replaying = on;
      if (!on) tickLcds();
    },
    open: openPanel,
    steps: (html) => ($("verify-steps").innerHTML = html),
    note: (html) => ($("verify-src").innerHTML = html),
  });
  $("demo-btn").hidden = !store.config.demoApi;
  build();
  onResizeRebuild(build);
  revealHero();
}

void boot();
