// The scroll story: one scrubbed GSAP timeline over #story. Each chapter section, as it enters, moves the camera,
// takes the clock apart or puts it back, lights traces and fades its annotation group in.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { state } from "./scene";
import { vis } from "./notes";

gsap.registerPlugin(ScrollTrigger);

type View = { camX: number; camY: number; camZ: number; tgtX: number; tgtY: number; tgtZ: number };
const V: Record<string, View> = {
  intro: { camX: -40, camY: 34, camZ: 92, tgtX: -11, tgtY: 4, tgtZ: 0 },
  hero: { camX: -19, camY: 19, camZ: 48, tgtX: -8.6, tgtY: 2.4, tgtZ: 0 },
  open: { camX: -12, camY: 33, camZ: 28, tgtX: -6.8, tgtY: 2.6, tgtZ: -0.6 },
  loop: { camX: -6, camY: 34, camZ: 22, tgtX: -6.4, tgtY: 1.2, tgtZ: 0.4 },
  tiers: { camX: 4, camY: 22, camZ: 20, tgtX: -3.8, tgtY: 1.2, tgtZ: 1.2 },
  refuse: { camX: -8, camY: 32, camZ: 24, tgtX: -6.2, tgtY: 1.4, tgtZ: -0.2 },
  rest: { camX: -28, camY: 22, camZ: 54, tgtX: -12, tgtY: 3, tgtZ: 0 },
};
/** Portrait: text sits under the object, so centre it and aim below it. */
function view(name: string): View {
  const v = V[name];
  if (innerWidth / innerHeight >= 0.9) return v;
  const drop = name === "hero" || name === "intro" ? 9.4 : name === "rest" ? 4.2 : 3.4;
  return { ...v, tgtX: v.tgtX * 0.1 + 0.4, tgtY: v.tgtY - drop, camX: v.camX * 1.15, camY: v.camY * 1.2, camZ: v.camZ * 1.3 };
}

export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let lenis: Lenis | null = null;
let tl: gsap.core.Timeline | null = null;

export function setupScroll() {
  if (reduced) return null;
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  (window as unknown as { __lenis?: Lenis }).__lenis = lenis; // lets the video recorder and screenshots scroll precisely
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function goTo(target: string | number) {
  if (lenis) lenis.scrollTo(target as never, { duration: 1.6 });
  else if (typeof target === "number") window.scrollTo({ top: target });
  else document.querySelector(target)?.scrollIntoView();
}

/** Plays the camera in from the fog and boots the clock. */
export function intro(done: () => void) {
  Object.assign(state, view("intro"), { fog: 0.024 });
  vis.hero = 0;
  gsap.to(state, { ...view("hero"), fog: 0.006, duration: reduced ? 0.01 : 2.6, ease: "expo.out", onComplete: done });
  gsap.to(vis, { hero: 1, duration: reduced ? 0.01 : 0.9, delay: reduced ? 0 : 1.4, ease: "power2.out" });
}

export function buildStory(onTier: (i: number) => void) {
  tl?.scrollTrigger?.kill();
  tl?.kill();
  const story = document.getElementById("story")!;
  const dist = () => story.offsetHeight - innerHeight;
  const at = (id: string, vh: number) => {
    const s = document.getElementById(id)!;
    return Math.max(0, Math.min(1, (s.offsetTop - story.offsetTop + vh * innerHeight) / dist()));
  };
  const span = (a: number, b: number) => ({ position: a, duration: Math.max(0.001, b - a) });
  tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: story, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true },
  });
  const cam = (from: string, to: string, a: number, b: number, extra: Record<string, number> = {}, fromExtra: Record<string, number> = {}) => {
    const s = span(a, b);
    tl!.fromTo(state, { ...view(from), ...fromExtra }, { ...view(to), ...extra, ease: "power2.inOut", duration: s.duration, immediateRender: false }, s.position);
  };
  const fade = (g: keyof typeof vis, a: number, b: number, to: number) => {
    const s = span(a, b);
    tl!.fromTo(vis, { [g]: 1 - to }, { [g]: to, duration: s.duration, immediateRender: false }, s.position);
  };
  const tween = (key: keyof typeof state, from: number, to: number, a: number, b: number, ease = "power1.inOut", onUpdate?: () => void) => {
    const s = span(a, b);
    tl!.fromTo(state, { [key]: from }, { [key]: to, ease, duration: s.duration, immediateRender: false, onUpdate }, s.position);
  };

  // Hero → open: the shell lifts, light comes on inside.
  fade("hero", at("open", -0.85), at("open", -0.45), 0);
  cam("hero", "open", at("open", -0.8), at("open", 0.05), { lift: 1, glow: 1, fog: 0.008 }, { lift: 0, glow: 0, fog: 0.006 });
  fade("open", at("open", -0.2), at("open", 0), 1);
  fade("open", at("loop", -0.75), at("loop", -0.45), 0);

  // Open → loop: the four traces light in loop order.
  cam("open", "loop", at("loop", -0.8), at("loop", 0), { lift: 1.9 }, { lift: 1 });
  tween("t3", 0, 1, at("loop", -0.5), at("loop", -0.3));
  tween("t0", 0, 1, at("loop", -0.35), at("loop", -0.05));
  tween("t1", 0, 1, at("loop", -0.05), at("loop", 0.25));
  tween("t2", 0, 1, at("loop", 0.25), at("loop", 0.55));
  fade("loop", at("loop", -0.3), at("loop", -0.1), 1);
  fade("loop", at("tiers", -0.7), at("tiers", -0.45), 0);

  // Tiers: the DIP switch steps through the three policies.
  cam("loop", "tiers", at("tiers", -0.8), at("tiers", 0));
  const tierUpdate = () => onTier(Math.round(state.tier));
  tween("tier", 0, 1, at("tiers", 0.12), at("tiers", 0.3), "power2.inOut", tierUpdate);
  tween("tier", 1, 2, at("tiers", 0.5), at("tiers", 0.68), "power2.inOut", tierUpdate);
  fade("tiers", at("tiers", -0.3), at("tiers", -0.1), 1);
  fade("tiers", at("refuse", -0.7), at("refuse", -0.45), 0);

  // Refusals: an order that does not match is stopped before the Reactive chip.
  cam("tiers", "refuse", at("refuse", -0.8), at("refuse", 0), { dim: 0.65 }, { dim: 0 });
  tween("reject", 0.001, 0.999, at("refuse", -0.1), at("refuse", 0.45), "power1.out");
  fade("refuse", at("refuse", -0.3), at("refuse", -0.1), 1);
  fade("refuse", at("rest", -0.75), at("rest", -0.45), 0);

  // Back together, stepping back into the fog for the scoresheet.
  cam("refuse", "rest", at("rest", -0.8), at("rest", 0.1), { lift: 0, glow: 0, dim: 1, fog: 0.02 }, { lift: 1.9, glow: 1, dim: 0.65, fog: 0.009 });

  // A fog scrim behind the chapter text, so copy never sits on a busy board.
  const scrim = document.getElementById("scrim")!;
  const sa = span(at("open", -0.7), at("open", -0.2));
  tl.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: sa.duration, immediateRender: false }, sa.position);
  const sb = span(at("rest", -0.6), at("rest", -0.2));
  tl.fromTo(scrim, { opacity: 1 }, { opacity: 0, duration: sb.duration, immediateRender: false }, sb.position);

  // Chapter text: each block rises in as its section arrives and leaves before the next one comes.
  const narrow = innerWidth <= 720;
  for (const el of document.querySelectorAll<HTMLElement>(".ch__text")) {
    if (narrow) {
      // On phones the text is a panel in the flow: it only needs to arrive.
      gsap.fromTo(el, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%", end: "top 62%", scrub: true } });
      continue;
    }
    gsap
      .timeline({ scrollTrigger: { trigger: el.parentElement, start: "top 72%", end: "bottom 88%", scrub: true } })
      .fromTo(el, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.22 })
      .to(el, { autoAlpha: 1, duration: 0.56 })
      .to(el, { autoAlpha: 0, y: -36, ease: "power2.in", duration: 0.22 });
  }
  // The top bar gets a ground once the page turns into reading (scoresheet, close).
  ScrollTrigger.refresh();
  return {
    /** Scroll position that shows tier i in the tiers chapter. */
    tierScroll(i: number) {
      const p = [at("tiers", 0), at("tiers", 0.4), at("tiers", 0.8)][i];
      return story.offsetTop + p * dist();
    },
  };
}

let resizeT: number | undefined;
export function onResizeRebuild(fn: () => void) {
  let portrait = innerWidth / innerHeight < 0.9;
  addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      const p = innerWidth / innerHeight < 0.9;
      if (p !== portrait) {
        portrait = p;
        fn();
      } else ScrollTrigger.refresh();
    }, 200);
  });
}
