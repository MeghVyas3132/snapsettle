// Records the demo video (docs/VIDEO.md): drives the dashboard with Playwright at 1920×1080, runs one real
// order through the loop mid-recording, and burns captions into the frame with a fixed overlay injected at
// record time (the dashboard source is untouched). ffmpeg then transcodes to H.264 MP4.
//   SNAP_ENV=live DASH_URL=https://… pnpm record
// Output: video/snapsettle-demo-<env>.mp4
import { chromium, type Page } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ENV, ROOT, sleep } from "./common.ts";

const URL = process.env.DASH_URL ?? `http://localhost:5199/${ENV === "local" ? "?env=local" : ""}`;
const OUT = join(ROOT, "video");
const RAW = join(OUT, "raw");
mkdirSync(RAW, { recursive: true });

async function caption(page: Page, text: string) {
  await page.evaluate((t) => {
    let el = document.getElementById("__cap");
    if (!el) {
      el = document.createElement("div");
      el.id = "__cap";
      Object.assign(el.style, {
        position: "fixed", left: "50%", bottom: "44px", transform: "translateX(-50%)", maxWidth: "1180px",
        padding: "16px 28px", background: "rgba(46,30,20,0.94)", color: "#f8f8ea", borderRadius: "8px",
        font: "500 24px/1.35 Barlow, system-ui, sans-serif", textAlign: "center", zIndex: "9999",
        boxShadow: "0 18px 32px -18px rgba(0,0,0,0.6)", transition: "opacity 300ms ease-out",
      });
      document.body.appendChild(el);
    }
    el.style.opacity = t ? "1" : "0";
    if (t) el.textContent = t;
  }, text);
}

async function scrollTo(page: Page, selector: string, offset = 80) {
  await page.evaluate(
    ([s, o]) => {
      const el = document.querySelector(s as string);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (o as number), behavior: "smooth" });
    },
    [selector, offset],
  );
  await sleep(1200);
}

async function moves(page: Page): Promise<number> {
  return page.locator("#sheet-body tr.move").count();
}

async function main() {
  const browser = await chromium.launch();
  // A 1440×810 viewport (the dashboard's design width) upscaled into a 1080p frame fills the picture.
  const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2, recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await sleep(2500);

  const p50 = (await page.locator(".ck-readout--snap .ck-value").textContent())?.trim() ?? "";

  // 0:00 the duel
  await caption(page, "A solver just filled your cross-chain order with its own money. When does it get paid back?");
  await sleep(14_000);
  await caption(page, "With an optimistic bridge it waits out a challenge window: 2 hours by default on Across, per its docs.");
  await sleep(14_000);
  await caption(page, `With Snapsettle, a Reactive contract watches both chains and repays the solver seconds after the fill. Measured p50: ${p50}.`);
  await sleep(15_000);

  // 0:45 one real order through the loop
  await scrollTo(page, "#sheet-h");
  const before = await moves(page);
  await caption(page, "Live now: an order opens on Base Sepolia, our solver fills it on Unichain Sepolia…");
  const bench = spawn("npx", ["tsx", "src/bench.ts", "--tier", "0", "--n", "1", "--gap", "0"], { cwd: join(ROOT, "offchain"), env: { ...process.env, SNAP_ENV: ENV }, stdio: "ignore" });
  const t0 = Date.now();
  let shownFill = false;
  while (Date.now() - t0 < 38_000) {
    const n = await moves(page);
    const top = page.locator("#sheet-body tr.move").first();
    const state = n > before ? ((await top.locator(".state").textContent()) ?? "") : "";
    if (!shownFill && /Filled|Queued|Repaid/.test(state)) {
      await caption(page, "…Reactive checks the fill on Lasna, and a callback repays the solver on Base.");
      shownFill = true;
    }
    if (/Repaid/.test(state)) break;
    await sleep(500);
  }
  await sleep(3000);
  bench.kill();

  // 1:25 the four transactions
  await page.locator("#sheet-body tr.move").first().click();
  await caption(page, "Four transactions per order. On Lasna the fill's terms hash is checked against the order before anything is released.");
  await sleep(22_000);

  // 1:50 finality tiers
  await scrollTo(page, "#splits-h");
  await caption(page, "Reactive acts on what it sees, even if a chain later reorganises. So every order carries its own finality policy.");
  await sleep(8000);
  await page.locator("#tier-tabs button").nth(1).click();
  await caption(page, "Small orders settle on sight; larger ones wait. Solvers read the delay as estimatedDelaySeconds from our ERC-7683 resolver.");
  await sleep(8000);
  await page.locator("#tier-tabs button").nth(2).click();
  await sleep(8000);

  // 2:15 refusals
  await scrollTo(page, "#checks-h");
  await caption(page, "And it refuses: a fill with the wrong terms, a late fill, a refund after a valid fill. Each one ran on-chain.");
  await sleep(18_000);

  // 2:35 close
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await caption(page, "Snapsettle: intents settled by Reactive. Everything you saw links to a transaction.");
  await sleep(9000);

  await context.close();
  await browser.close();

  const webm = readdirSync(RAW).filter((f) => f.endsWith(".webm")).map((f) => join(RAW, f)).pop()!;
  const mp4 = join(OUT, `snapsettle-demo-${ENV}.mp4`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", webm, "-t", "175", "-c:v", "h264_videotoolbox", "-b:v", "6M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  renameSync(webm, join(RAW, `last-${ENV}.webm`));
  for (const f of readdirSync(RAW)) if (f.endsWith(".webm") && !f.startsWith("last-")) rmSync(join(RAW, f));
  const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]).toString().trim();
  console.log(`video: ${mp4} (${Number(dur).toFixed(1)} s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
