// Annotations pinned to the object: a crosshair on the part, a hairline leader, and a small mono label sitting
// on its own hairline. Labels are HTML (crisp, selectable, linkable); the scene only supplies screen positions.
import type { ClockScene } from "./scene";

export type Group = "hero" | "open" | "loop" | "tiers" | "refuse";
export const vis: Record<Group, number> = { hero: 0, open: 0, loop: 0, tiers: 0, refuse: 0 };

type Note = { id: string; anchor: string; group: Group; dx: number; dy: number; minor?: boolean; el: HTMLElement; line: SVGPolylineElement; cross: SVGGElement; shown: boolean; html: string; w: number; h: number; last: string };

const NS = "http://www.w3.org/2000/svg";
const notes = new Map<string, Note>();
const host = document.getElementById("notes")!;
const svg = document.getElementById("leaders") as unknown as SVGSVGElement;

const GLYPHS = "0123456789ABCDEFX/·:-";
/** Letters settle from noise into the final text, like a display finding its value. */
export function scramble(el: HTMLElement, ms = 520) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const nodes: Text[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) nodes.push(walk.currentNode as Text);
  const finals = nodes.map((n) => n.data);
  const start = performance.now();
  const tick = () => {
    const p = Math.min(1, (performance.now() - start) / ms);
    nodes.forEach((n, j) => {
      const f = finals[j];
      const keep = Math.floor(f.length * p);
      let s = f.slice(0, keep);
      for (let i = keep; i < f.length; i++) s += f[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      n.data = s;
    });
    if (p < 1) requestAnimationFrame(tick);
    else nodes.forEach((n, j) => (n.data = finals[j]));
  };
  tick();
}

export function note(id: string, anchor: string, group: Group, dx: number, dy: number, html: string, minor = false) {
  let n = notes.get(id);
  if (!n) {
    const el = document.createElement("div");
    el.className = "note";
    if (minor) el.classList.add("note--minor");
    host.appendChild(el);
    const line = document.createElementNS(NS, "polyline");
    const cross = document.createElementNS(NS, "g");
    cross.innerHTML = `<circle r="3.2"/><line x1="-8" x2="-4.5" y1="0" y2="0"/><line x1="4.5" x2="8" y1="0" y2="0"/><line y1="-8" y2="-4.5" x1="0" x2="0"/><line y1="4.5" y2="8" x1="0" x2="0"/>`;
    svg.append(line, cross);
    n = { id, anchor, group, dx, dy, minor, el, line, cross, shown: false, html: "", w: 0, h: 0, last: "" };
    notes.set(id, n);
  }
  if (n.html !== html) {
    n.html = html;
    // The part after the first line break is detail, dropped on narrow screens.
    const i = html.indexOf("<br>");
    n.el.innerHTML = i < 0 ? html : `${html.slice(0, i)}<br><span class="d">${html.slice(i + 4)}</span>`;
    measure(n);
    if (n.shown) scramble(n.el, 380);
  }
}

/** Label sizes are read once per content change (and on resize), never inside the frame loop. */
function measure(n: Note) {
  const v = n.el.style.visibility;
  n.el.style.visibility = "hidden";
  n.w = n.el.offsetWidth;
  n.h = n.el.offsetHeight;
  n.el.style.visibility = v;
}
addEventListener("resize", () => notes.forEach(measure));
document.fonts?.ready.then(() => notes.forEach(measure));

function hide(n: Note) {
  n.last = "";
  if (n.el.style.opacity !== "0") {
    n.el.style.opacity = "0";
    n.el.style.visibility = "hidden";
    n.line.style.opacity = "0";
    n.cross.style.opacity = "0";
  }
  n.shown = false;
}

/** Called every frame by the scene. */
export function layoutNotes(scene: ClockScene) {
  const narrow = innerWidth < 720;
  for (const n of notes.values()) {
    const a = scene.project(n.anchor);
    // Narrow screens keep the hero and the contract names; the chapter text carries the rest.
    const o = vis[n.group] * (narrow && (n.minor || n.group === "loop" || n.group === "tiers" || n.group === "refuse") ? 0 : 1);
    if (!a || !a.on || o < 0.01) {
      hide(n);
      continue;
    }
    const k = narrow ? 0.55 : 1;
    const lx = a.x + n.dx * k;
    const ly = a.y + n.dy * k;
    const w = n.w;
    const h = n.h;
    // In the chapters the left column holds the text: labels stay right of it.
    const minLeft = !narrow && n.group !== "hero" ? innerWidth * 0.43 : 12;
    const left = Math.max(minLeft, Math.min(innerWidth - w - 12, n.dx < 0 ? lx - w : lx));
    const top = Math.max(64, Math.min(innerHeight - h - 16, ly - h / 2));
    const key = `${left.toFixed(0)}|${top.toFixed(0)}|${o.toFixed(2)}`;
    if (key !== n.last) {
      n.last = key;
      n.el.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
      n.el.style.opacity = String(o);
      n.el.style.visibility = "visible";
      n.el.style.pointerEvents = o > 0.6 ? "auto" : "none";
    }

    // Every label sits on a hairline; the leader runs from the crosshair to the nearer end of it,
    // or straight into it when the part is right above or below the label.
    const baseY = top + h + 3;
    const x0 = left - 4;
    const x1 = left + w + 4;
    let pts: string;
    if (a.x >= x0 && a.x <= x1) {
      pts = `${a.x.toFixed(1)},${a.y.toFixed(1)} ${a.x.toFixed(1)},${baseY.toFixed(1)} ${x0.toFixed(1)},${baseY.toFixed(1)} ${x1.toFixed(1)},${baseY.toFixed(1)}`;
    } else {
      const near = a.x < x0 ? x0 : x1;
      const far = a.x < x0 ? x1 : x0;
      pts = `${a.x.toFixed(1)},${a.y.toFixed(1)} ${near.toFixed(1)},${baseY.toFixed(1)} ${far.toFixed(1)},${baseY.toFixed(1)}`;
    }
    n.line.setAttribute("points", pts);
    n.line.style.opacity = String(o * 0.9);
    n.cross.setAttribute("transform", `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)})`);
    n.cross.style.opacity = String(o);
    if (!n.shown && o > 0.3) {
      n.shown = true;
      scramble(n.el);
    }
  }
}
