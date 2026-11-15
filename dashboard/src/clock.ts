// The chess-clock duel: Across's optimistic window on an hours dial, Snapsettle's measured repay time on a
// seconds dial, each readout lettered on the housing under its own face. The Snapsettle button sits pressed
// (its clock stopped); `press()` replays the press when a live order settles.
const NS = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  parent?.appendChild(n);
  return n;
}

const polar = (cx: number, cy: number, r: number, frac: number) => {
  const a = frac * 2 * Math.PI - Math.PI / 2;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
};

function sector(cx: number, cy: number, r: number, frac: number): string {
  if (frac <= 0) return "";
  const f = Math.min(frac, 0.9999);
  const [x, y] = polar(cx, cy, r, f);
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x} ${y} Z`;
}

const CY = 206;
const R = 112;

function face(svg: SVGSVGElement, cx: number, labels: string[], scale: string, cls: "across" | "snap") {
  const g = el("g", { class: `ck-${cls}` }, svg);
  el("circle", { cx, cy: CY, r: R + 9, class: "ck-bezel" }, g);
  el("circle", { cx, cy: CY, r: R, class: "ck-face" }, g);
  const fill = el("path", { class: cls === "across" ? "ck-window" : "ck-sweep", d: "" }, g);
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const [x1, y1] = polar(cx, CY, R - 7, i / 60);
    const [x2, y2] = polar(cx, CY, R - (major ? 21 : 13), i / 60);
    el("line", { x1, y1, x2, y2, class: "ck-tick", "stroke-width": major ? 3 : 1.2 }, g);
  }
  labels.forEach((t, i) => {
    const [x, y] = polar(cx, CY, R - 38, i / labels.length);
    const tx = el("text", { x, y, "text-anchor": "middle", "dominant-baseline": "central", class: "ck-num" }, g);
    tx.textContent = t;
  });
  const sc = el("text", { x: cx, y: CY + R * 0.46, "text-anchor": "middle", class: "ck-scale" }, g);
  sc.textContent = scale;
  el("path", { d: `M ${cx - 2} ${CY - R + 24} l 0 -15 l 15 5 l -15 5 z`, class: "ck-flag" }, g);
  const marker = el("line", { x1: cx, y1: CY - R + 2, x2: cx, y2: CY - R + 24, class: "ck-p95", visibility: "hidden" }, g);
  marker.style.transformOrigin = `${cx}px ${CY}px`;
  marker.style.transformBox = "view-box";
  // Hands stop short of the numerals so a parked hand never strikes one through.
  const hand = el("line", { x1: cx, y1: CY + 14, x2: cx, y2: CY - R + 56, class: `ck-hand ck-hand--${cls}`, "stroke-width": 5 }, g);
  hand.style.transformOrigin = `${cx}px ${CY}px`;
  hand.style.transformBox = "view-box";
  el("circle", { cx, cy: CY, r: 8, class: "ck-hub" }, g);
  return { hand, fill, marker };
}

function readout(svg: SVGSVGElement, cx: number, who: string, cls: "across" | "snap") {
  const g = el("g", { class: `ck-readout ck-readout--${cls}` }, svg);
  const w = el("text", { x: cx, y: 362, "text-anchor": "middle", class: "ck-who" }, g);
  w.textContent = who;
  const v = el("text", { x: cx, y: 412, "text-anchor": "middle", class: "ck-value" }, g);
  const s = el("text", { x: cx, y: 440, "text-anchor": "middle", class: "ck-sub" }, g);
  return { v, s, g };
}

export type ClockHandle = { setSnap: (p50: number | null, p95: number | null) => void; press: () => void };

export function mountClock(host: HTMLElement): ClockHandle {
  const svg = el("svg", {
    viewBox: "0 0 800 470",
    role: "img",
    "aria-label": "Chess clock. Left face, Across: a two-hour optimistic challenge window. Right face, Snapsettle: measured time from fill to solver repaid.",
  }) as SVGSVGElement;
  el("rect", { x: 24, y: 64, width: 752, height: 400, rx: 26, class: "ck-housing" }, svg);
  el("rect", { x: 24, y: 64, width: 752, height: 26, rx: 13, class: "ck-housing-top" }, svg);
  el("line", { x1: 400, y1: 104, x2: 400, y2: 448, class: "ck-seam" }, svg);
  // The rocker: Across's side up (its clock still runs), Snapsettle's pressed (stopped).
  el("path", { d: "M 220 52 L 580 70", class: "ck-rocker" }, svg);
  const left = el("g", { class: "ck-press" }, svg);
  el("rect", { x: 170, y: 28, width: 100, height: 40, rx: 8, class: "ck-button" }, left);
  el("rect", { x: 178, y: 22, width: 84, height: 14, rx: 6, class: "ck-button-cap" }, left);
  const right = el("g", { class: "ck-press" }, svg);
  el("rect", { x: 530, y: 46, width: 100, height: 22, rx: 8, class: "ck-button" }, right);
  el("rect", { x: 538, y: 40, width: 84, height: 12, rx: 6, class: "ck-button-cap" }, right);

  const across = face(svg, 220, ["12", "3", "6", "9"], "hours", "across");
  const snap = face(svg, 580, ["60", "15", "30", "45"], "seconds", "snap");
  across.fill.setAttribute("d", sector(220, CY, R - 6, 2 / 12));
  across.hand.style.transform = `rotate(${(2 / 12) * 360}deg)`;

  const a = readout(svg, 220, "ACROSS · CHALLENGE WINDOW", "across");
  a.v.textContent = "2:00:00";
  const link = el("a", { href: "https://docs.across.to/user-docs/how-across-works/speed", target: "_blank", rel: "noopener" }, a.g);
  const linkText = el("text", { x: 220, y: 440, "text-anchor": "middle", class: "ck-sub ck-link" }, link);
  linkText.textContent = "default, per Across docs";
  a.s.remove();
  const s = readout(svg, 580, "SNAPSETTLE · FILL → REPAID", "snap");

  host.replaceChildren(svg);

  const fmt = (x: number) => (x < 10 ? `${x.toFixed(1)} s` : x < 60 ? `${Math.round(x)} s` : `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, "0")}`);

  return {
    setSnap(p50, p95) {
      if (p50 === null || !Number.isFinite(p50)) {
        snap.fill.setAttribute("d", "");
        snap.hand.style.transform = "rotate(0deg)";
        snap.marker.setAttribute("visibility", "hidden");
        s.v.textContent = "—";
        s.s.textContent = "awaiting measured loops";
        return;
      }
      const frac = Math.min(p50, 60) / 60;
      snap.fill.setAttribute("d", sector(580, CY, R - 6, frac));
      snap.hand.style.transform = `rotate(${frac * 360}deg)`;
      if (p95 !== null && Number.isFinite(p95)) {
        snap.marker.setAttribute("visibility", "visible");
        snap.marker.style.transform = `rotate(${(Math.min(p95, 60) / 60) * 360}deg)`;
      }
      s.v.textContent = `${fmt(p50)}`;
      s.s.textContent = p95 !== null && Number.isFinite(p95) ? `p50 · p95 ${fmt(p95)}` : "p50";
    },
    press() {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      right.style.transform = "translateY(10px)";
      setTimeout(() => (right.style.transform = ""), 260);
    },
  };
}
