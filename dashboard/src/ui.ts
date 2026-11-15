// Small interface components, ported as native modules from the patterns in Magic UI (Marquee, Number Ticker,
// Animated List, Border Beam, Text Animate) and React Bits (Magnet). No framework: the page is vanilla.
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(SplitText, ScrollTrigger);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Marquee: a seamless horizontal tape. Content is duplicated once; CSS moves the track by half its width. */
export function marquee(host: HTMLElement, items: string[], secondsPerItem = 4.5) {
  if (!items.length) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  const run = items.map((i) => `<span class="tape__item">${i}</span>`).join("");
  host.innerHTML = `<div class="tape__track" style="--dur:${Math.max(30, items.length * secondsPerItem)}s">${run}<span aria-hidden="true" class="tape__dup">${run}</span></div>`;
}

/** Number Ticker: rolls numbers inside `[data-tick]` up from zero when they first come into view. */
export function tickers(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>("[data-tick]")) {
    if (el.dataset.ticked) continue;
    el.dataset.ticked = "1";
    const target = Number(el.dataset.tick);
    const decimals = Number(el.dataset.dec ?? 0);
    const unit = el.dataset.unit ?? "";
    if (!Number.isFinite(target) || reduced) continue;
    const final = el.textContent;
    const o = { v: 0 };
    el.textContent = `${(0).toFixed(decimals)}${unit}`;
    ScrollTrigger.create({
      trigger: el,
      start: "top 92%",
      once: true,
      onEnter: () =>
        gsap.to(o, {
          v: target,
          duration: 1.4,
          ease: "expo.out",
          onUpdate: () => (el.textContent = `${o.v.toFixed(decimals)}${unit}`),
          onComplete: () => (el.textContent = final),
        }),
    });
  }
}

/** Text Animate: headings rise in word by word from a mask as they arrive. */
export function headings(selector: string) {
  if (reduced) return;
  for (const h of document.querySelectorAll<HTMLElement>(selector)) {
    const split = SplitText.create(h, { type: "words,lines", mask: "lines", linesClass: "ln" });
    gsap.from(split.words, {
      yPercent: 110,
      duration: 1.1,
      ease: "expo.out",
      stagger: 0.05,
      scrollTrigger: { trigger: h, start: "top 85%", toggleActions: "play none none reverse" },
    });
  }
}

/** Magnet: an element leans toward the pointer while it is near. */
export function magnet(el: HTMLElement, strength = 0.28, radius = 120) {
  if (reduced || matchMedia("(pointer: coarse)").matches) return;
  const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.45)" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.45)" });
  addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const near = Math.hypot(dx, dy) < radius + Math.max(r.width, r.height) / 2;
    xTo(near ? dx * strength : 0);
    yTo(near ? dy * strength : 0);
  });
}

/** Animated List: rows whose ids were not on screen before slide in and flash once. */
const seen = new Set<string>();
let primed = false;
export function animateNewRows(body: HTMLElement) {
  const rows = body.querySelectorAll<HTMLElement>("tr.row");
  rows.forEach((r) => {
    const id = r.dataset.id!;
    if (!seen.has(id)) {
      seen.add(id);
      if (primed && !reduced) r.classList.add("row--new");
    }
  });
  primed = true;
}
