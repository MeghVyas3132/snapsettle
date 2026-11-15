// The chess-clock duel: Across's optimistic window on an hours dial, Snapsettle's measured repay time on a
// seconds dial. The Snapsettle button sits pressed (its clock stopped); `press()` replays the press when a
// live order settles.
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

function face(svg: SVGSVGElement, cx: number, cy: number, r: number, labels: string[], scale: string, cls: "across" | "snap") {
  const g = el("g", { class: `ck-${cls}` }, svg);
  el("circle", { cx, cy, r, class: "ck-face" }, g);
  const fill = el("path", { class: cls === "across" ? "ck-window" : "ck-sweep", d: "" }, g);
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const [x1, y1] = polar(cx, cy, r - 8, i / 60);
    const [x2, y2] = polar(cx, cy, r - (major ? 22 : 14), i / 60);
    el("line", { x1, y1, x2, y2, class: "ck-tick", "stroke-width": major ? 3 : 1.2 }, g);
  }
  labels.forEach((t, i) => {
    const [x, y] = polar(cx, cy, r - 40, i / labels.length);
    const tx = el("text", { x, y: y + 5, "text-anchor": "middle", class: "ck-num" }, g);
    tx.textContent = t;
  });
  const sc = el("text", { x: cx, y: cy + r * 0.42, "text-anchor": "middle", class: "ck-scale" }, g);
  sc.textContent = scale;
  // flag at twelve
  el("path", { d: `M ${cx - 2} ${cy - r + 26} l 0 -16 l 16 5 l -16 5 z`, class: "ck-flag" }, g);
  const hand = el("line", { x1: cx, y1: cy + 14, x2: cx, y2: cy - r + 30, class: `ck-hand ck-hand--${cls}`, "stroke-width": 5 }, g);
  hand.style.transformOrigin = `${cx}px ${cy}px`;
  hand.style.transformBox = "view-box";
  el("circle", { cx, cy, r: 8, class: "ck-hub" }, g);
  return { hand, fill };
}

export type ClockHandle = { setSnap: (seconds: number | null) => void; press: () => void };

export function mountClock(host: HTMLElement): ClockHandle {
  const svg = el("svg", { viewBox: "0 0 800 360", role: "img", "aria-label": "Chess clock: Across optimistic window of two hours against Snapsettle's measured repay time" }) as SVGSVGElement;
  // housing
  el("rect", { x: 24, y: 70, width: 752, height: 276, rx: 26, class: "ck-housing" }, svg);
  el("rect", { x: 24, y: 70, width: 752, height: 26, rx: 13, class: "ck-housing-top" }, svg);
  // buttons: Across up (its clock is still running), Snapsettle pressed (stopped)
  const left = el("g", { class: "ck-press" }, svg);
  el("rect", { x: 170, y: 34, width: 100, height: 40, rx: 8, class: "ck-button" }, left);
  el("rect", { x: 178, y: 28, width: 84, height: 14, rx: 6, class: "ck-button-cap" }, left);
  const right = el("g", { class: "ck-press" }, svg);
  el("rect", { x: 530, y: 50, width: 100, height: 24, rx: 8, class: "ck-button" }, right);
  el("rect", { x: 538, y: 44, width: 84, height: 12, rx: 6, class: "ck-button-cap" }, right);

  const across = face(svg, 220, 214, 118, ["12", "3", "6", "9"], "hours", "across");
  const snap = face(svg, 580, 214, 118, ["60", "15", "30", "45"], "seconds", "snap");

  // Across: two hours of a twelve-hour dial.
  across.fill.setAttribute("d", sector(220, 214, 112, 2 / 12));
  across.hand.style.transform = `rotate(${(2 / 12) * 360}deg)`;

  host.replaceChildren(svg);

  return {
    setSnap(seconds) {
      if (seconds === null || !Number.isFinite(seconds)) {
        snap.fill.setAttribute("d", "");
        snap.hand.style.transform = "rotate(0deg)";
        return;
      }
      const frac = Math.min(seconds, 60) / 60;
      snap.fill.setAttribute("d", sector(580, 214, 112, frac));
      snap.hand.style.transform = `rotate(${frac * 360}deg)`;
    },
    press() {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      right.style.transform = "translateY(10px)";
      setTimeout(() => (right.style.transform = ""), 260);
    },
  };
}
