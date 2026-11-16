// End-to-end check of the site's "Open your own order" button, the path a judge takes. A headless browser opens the
// site with an injected EIP-1193 wallet whose signing happens here, in Node, with the test user's key from
// offchain/.env (the page never sees the key). The script clicks the button and waits for the order to settle.
//   SNAP_ENV=live pnpm walletcheck [url]   (solver running)   → evidence/live/wallet-check.json
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Hex } from "viem";
import { ENV, ROOT, chains, pub, wallet } from "./common.ts";

const url = process.argv[2] ?? "https://meghvyas3132.github.io/snapsettle/";
const w = wallet("user", "origin");
const me = w.account!.address;
const sent: string[] = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });

await page.exposeFunction("__walletRequest", async (method: string, params: unknown[]) => {
  switch (method) {
    case "eth_requestAccounts":
    case "eth_accounts":
      return [me];
    case "eth_chainId":
      return `0x${chains.origin.id.toString(16)}`;
    case "wallet_switchEthereumChain":
    case "wallet_addEthereumChain":
      return null;
    case "eth_sendTransaction": {
      const tx = params[0] as { to: Hex; data?: Hex; value?: Hex; gas?: Hex };
      const hash = await w.sendTransaction({ account: w.account!, chain: chains.origin, to: tx.to, data: tx.data, value: tx.value ? BigInt(tx.value) : undefined });
      sent.push(hash);
      return hash;
    }
    default:
      return pub.origin.request({ method, params } as never);
  }
});
// A string, not a function: tsx would inject helpers into a serialized function that do not exist in the page.
await page.addInitScript(`window.ethereum = {
  isMetaMask: false,
  request: ({ method, params }) => window.__walletRequest(method, params ?? []),
  on: () => undefined,
  removeListener: () => undefined,
};`);

const t0 = Date.now();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(4000);
await page.click("#own-btn");
let panel = "";
let settled = false;
while (Date.now() - t0 < 180_000) {
  await page.waitForTimeout(1000);
  panel = (await page.evaluate(() => (document.querySelector("#verify") as HTMLElement | null)?.innerText ?? "")).replace(/\s+/g, " ");
  // Done when the closing sentence appears (with times) or the flow stops; the repaid row alone is not enough,
  // because a judge needs the measured time, not just the links.
  if (/fill → solver repaid .* on the chains' own block clocks/.test(panel) || /not settled within two minutes|stopped|No browser wallet/.test(panel)) { settled = /fill → solver repaid/.test(panel); break; }
}
const orderId = panel.match(/Order (0x[0-9a-f…]+)/)?.[1] ?? null;
const out = { at: new Date().toISOString(), env: ENV, url, wallet: me, txsSignedByWallet: sent, settled, seconds: Math.round((Date.now() - t0) / 1000), orderId, panel: panel.slice(0, 1200), pageErrors: errors };
writeFileSync(join(ROOT, "evidence", ENV, "wallet-check.json"), JSON.stringify(out, null, 2));
console.log(`${settled ? "PASS" : "FAIL"} in ${out.seconds}s; txs ${sent.join(", ")}; page errors ${errors.length}`);
console.log(panel.slice(0, 600));
await browser.close();
process.exit(settled ? 0 : 1);
