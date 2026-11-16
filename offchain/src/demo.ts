// Always-on demo for visitors: opens a small instant-tier order on Base Sepolia every DEMO_INTERVAL_S seconds,
// and on request from the dashboard ("Run one live order"), so anyone watching sees a real loop settle.
// Run it next to the solver (`pnpm solver`). Live testnets only. Keys come from offchain/.env, never printed.
//
//   SNAP_ENV=live DEMO_INTERVAL_S=900 DEMO_PORT=8787 DEMO_ORIGINS=https://snapsettle.aexiz.in pnpm demo
//
// HTTP:
//   GET  /status  → { env, address, lastOrder, nextHeartbeatInS, todayCount, cap }
//   POST /order   → { orderId, openTx }   (rate limited: one order per 40 s overall, 4 per hour per IP, a daily cap)
//   POST /relay   { order, user, validAfter, validBefore, signature } → { orderId, openTx }
//                 Gasless open: the visitor signed one EIP-3009 authorization in their wallet; this service submits
//                 `openFor` and pays the gas. Terms are checked here and again by the escrow; the signature binds them.
//   POST /drip    { address } → { tx, amount }   0.3 test USDC on Base Sepolia, once per address per day
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { getAddress, isAddress, maxUint256, parseEventLogs, type Address, type Hex } from "viem";
import { ENV, chains, pub, addr, abi, wallet, evidenceDir, appendJsonl, sleep, type OrderData } from "./common.ts";

if (ENV !== "live") throw new Error("demo runs against live testnets only (SNAP_ENV=live)");

const INTERVAL_S = Number(process.env.DEMO_INTERVAL_S ?? 900);
const PORT = Number(process.env.DEMO_PORT ?? 8787);
const ORIGINS = (process.env.DEMO_ORIGINS ?? "http://localhost:5199").split(",").map((s) => s.trim());
const DAILY_CAP = Number(process.env.DEMO_DAILY_CAP ?? 150);
const GLOBAL_GAP_MS = 40_000;
const PER_IP_PER_HOUR = 4;

const user = wallet("user", "origin");
const userDest = wallet("user", "dest");
const solverOrigin = wallet("solver", "origin");
const userAddr = user.account!.address;
const solverAddr = solverOrigin.account!.address;
const log = `${evidenceDir("demo")}/orders.jsonl`;

let amount = 250_000n; // replaced by half the first tier's cap at start
let busy = false;
let lastAt = 0;
let lastOrder: { orderId: Hex; openTx: Hex; at: string; source: string } | null = null;
let nextBeat = Date.now() + INTERVAL_S * 1000;
const day = { key: "", count: 0 };
const perIp = new Map<string, number[]>();
const relayLog = `${evidenceDir("demo")}/relayed.jsonl`;
const dripLog = `${evidenceDir("demo")}/drips.jsonl`;
const DRIP = 300_000n; // 0.3 USDC
const RELAY_MAX = 5_000_000n; // 5 USDC: covers every tier on testnet
const limits = { relayPerIpHour: 6, dripPerIpDay: 3, dripDaily: 60, relayDaily: 200 };
const hitsRelay = new Map<string, number[]>();
const hitsDrip = new Map<string, number[]>();
const dripped = new Map<string, number>(); // address → last drip
const daily = { key: "", relay: 0, drip: 0 };
const recent = (m: Map<string, number[]>, k: string, ms: number) => (m.get(k) ?? []).filter((t) => Date.now() - t < ms);
function rollDay() { const k = new Date().toISOString().slice(0, 10); if (daily.key !== k) Object.assign(daily, { key: k, relay: 0, drip: 0 }); }
/** One sender at a time from the service wallet, so its nonces never collide (heartbeat, relay, drip). */
let chain: Promise<unknown> = Promise.resolve();
const serial = <T>(f: () => Promise<T>): Promise<T> => { const p = chain.then(f, f); chain = p.catch(() => undefined); return p; };

async function readBody(req: IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const c of req) { raw += c; if (raw.length > 4096) throw new Error("body too large"); }
  return JSON.parse(raw || "{}");
}

type RelayBody = { order: Record<string, string | number>; user: string; validAfter: string | number; validBefore: string | number; signature: string };
/** Checks a visitor's gasless order before spending gas on it. The escrow repeats the binding checks on-chain. */
function vetRelay(b: RelayBody): { order: OrderData; user: Address; validAfter: bigint; validBefore: bigint; signature: Hex } {
  const o = b.order ?? {};
  if (!isAddress(String(b.user))) throw new Error("bad user address");
  if (!/^0x[0-9a-fA-F]{130,}$/.test(String(b.signature))) throw new Error("bad signature");
  const order: OrderData = {
    inputToken: getAddress(String(o.inputToken)), inputAmount: BigInt(o.inputAmount), outputToken: getAddress(String(o.outputToken)),
    outputAmount: BigInt(o.outputAmount), recipient: getAddress(String(o.recipient)), destinationChainId: BigInt(o.destinationChainId),
    destinationSettler: getAddress(String(o.destinationSettler)), fillDeadline: Number(o.fillDeadline),
  };
  const now = Math.floor(Date.now() / 1000);
  if (order.inputToken !== getAddress(addr.tokenOrigin) || order.outputToken !== getAddress(addr.tokenDest)) throw new Error("wrong token pair");
  if (order.destinationSettler !== getAddress(addr.destinationSettler) || order.destinationChainId !== BigInt(chains.dest.id)) throw new Error("wrong destination");
  if (order.inputAmount > RELAY_MAX) throw new Error("relayed orders are capped at 5 USDC on testnet");
  if (order.outputAmount > order.inputAmount) throw new Error("output above input; no solver would fill it");
  if (order.fillDeadline < now + 60 || order.fillDeadline > now + 3600) throw new Error("deadline must be 1 to 60 minutes away");
  const validBefore = BigInt(b.validBefore);
  if (validBefore < BigInt(now + 30) || validBefore > BigInt(now + 1800)) throw new Error("authorization must be valid for 30 s to 30 min");
  return { order, user: getAddress(String(b.user)), validAfter: BigInt(b.validAfter), validBefore, signature: String(b.signature) as Hex };
}

async function relay(v: ReturnType<typeof vetRelay>, ip: string) {
  // Simulate first: a bad signature or a changed term fails here and costs nothing.
  const { request } = await pub.origin.simulateContract({ address: addr.escrow, abi: abi.escrow, functionName: "openFor", args: [v.order, v.user, v.validAfter, v.validBefore, v.signature], account: user.account! });
  const hash = await serial(() => user.writeContract({ ...request, chain: chains.origin, account: user.account! }));
  const rcpt = await pub.origin.waitForTransactionReceipt({ hash });
  if (rcpt.status !== "success") throw new Error(`openFor reverted: ${hash}`);
  const orderId = (parseEventLogs({ abi: abi.escrow, logs: rcpt.logs, eventName: "Opened" })[0].args as { orderId: Hex }).orderId;
  appendJsonl(relayLog, { at: new Date().toISOString(), orderId, openTx: hash, user: v.user, amount: v.order.inputAmount.toString(), ip: ip.replace(/\.\d+$/, ".x") });
  return { orderId, openTx: hash };
}

async function drip(to: Address, ip: string) {
  const have = await erc20Bal(addr.tokenOrigin, "origin", to);
  if (have >= DRIP) return { tx: null, amount: "0", note: "already holds enough test USDC" };
  const hash = await serial(() => user.writeContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "transfer", args: [to, DRIP], chain: chains.origin, account: user.account! }));
  await pub.origin.waitForTransactionReceipt({ hash });
  appendJsonl(dripLog, { at: new Date().toISOString(), to, amount: DRIP.toString(), tx: hash, ip: ip.replace(/\.\d+$/, ".x") });
  return { tx: hash, amount: DRIP.toString() };
}

const erc20Bal = (token: `0x${string}`, c: "origin" | "dest", who: `0x${string}`) =>
  pub[c].readContract({ address: token, abi: abi.erc20, functionName: "balanceOf", args: [who] }) as Promise<bigint>;

/** Keeps the loop funded: the solver's repayments on Base go back to the user, the user's outputs on Unichain to the solver. */
async function rebalance() {
  const [userBase, solverBase, userUni] = await Promise.all([
    erc20Bal(addr.tokenOrigin, "origin", userAddr),
    erc20Bal(addr.tokenOrigin, "origin", solverAddr),
    erc20Bal(addr.tokenDest, "dest", userAddr),
  ]);
  if (userBase >= amount * 4n) return;
  if (solverBase > 0n) {
    const h = await solverOrigin.writeContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "transfer", args: [userAddr, solverBase], chain: chains.origin, account: solverOrigin.account! });
    await pub.origin.waitForTransactionReceipt({ hash: h });
  }
  if (userUni > 0n) {
    const h = await userDest.writeContract({ address: addr.tokenDest, abi: abi.erc20, functionName: "transfer", args: [solverAddr, userUni], chain: chains.dest, account: userDest.account! });
    await pub.dest.waitForTransactionReceipt({ hash: h });
  }
}

async function openOrder(source: string): Promise<{ orderId: Hex; openTx: Hex }> {
  await rebalance();
  const order: OrderData = {
    inputToken: addr.tokenOrigin,
    inputAmount: amount,
    outputToken: addr.tokenDest,
    outputAmount: (amount * 999n) / 1000n,
    recipient: userAddr,
    destinationChainId: BigInt(chains.dest.id),
    destinationSettler: addr.destinationSettler,
    fillDeadline: Math.floor(Date.now() / 1000) + 600,
  };
  const hash = await user.writeContract({ address: addr.escrow, abi: abi.escrow, functionName: "open", args: [order], chain: chains.origin, account: user.account! });
  const rcpt = await pub.origin.waitForTransactionReceipt({ hash, pollingInterval: 200 });
  if (rcpt.status !== "success") throw new Error(`open reverted: ${hash}`);
  const ev = parseEventLogs({ abi: abi.escrow, logs: rcpt.logs, eventName: "Opened" })[0];
  const orderId = (ev.args as { orderId: Hex }).orderId;
  lastOrder = { orderId, openTx: hash, at: new Date().toISOString(), source };
  appendJsonl(log, lastOrder);
  console.log(`${source}: opened ${orderId.slice(0, 10)} ${hash}`);
  return { orderId, openTx: hash };
}

function allowed(ip: string): string | null {
  const today = new Date().toISOString().slice(0, 10);
  if (day.key !== today) Object.assign(day, { key: today, count: 0 });
  if (day.count >= DAILY_CAP) return "daily demo cap reached; try tomorrow or open your own order";
  if (Date.now() - lastAt < GLOBAL_GAP_MS) return `an order opened ${Math.round((Date.now() - lastAt) / 1000)} s ago; watch that one`;
  const hits = (perIp.get(ip) ?? []).filter((t) => Date.now() - t < 3_600_000);
  if (hits.length >= PER_IP_PER_HOUR) return "a few per hour per visitor; open your own order to run more";
  return null;
}

async function guarded(source: string, ip?: string) {
  if (busy) throw new Error("an order is being opened right now");
  busy = true;
  try {
    const r = await serial(() => openOrder(source));
    lastAt = Date.now();
    day.count++;
    if (ip) perIp.set(ip, [...(perIp.get(ip) ?? []).filter((t) => Date.now() - t < 3_600_000), Date.now()]);
    nextBeat = Date.now() + INTERVAL_S * 1000;
    return r;
  } finally {
    busy = false;
  }
}

let fuelCache = { at: 0, lreact: NaN };
async function health() {
  let solverHeartbeatAgeS: number | null = null;
  try { solverHeartbeatAgeS = Math.round((Date.now() - Number(readFileSync(`${evidenceDir("solver")}/heartbeat`, "utf8"))) / 1000); } catch { /* no heartbeat yet */ }
  if (Date.now() - fuelCache.at > 60_000) {
    try { fuelCache = { at: Date.now(), lreact: Number(await pub.lasna.getBalance({ address: addr.reactive })) / 1e18 }; } catch { /* keep the last reading */ }
  }
  const fuelOrders = Number.isFinite(fuelCache.lreact) ? Math.floor(fuelCache.lreact / 0.045) : null;
  const healthy = solverHeartbeatAgeS !== null && solverHeartbeatAgeS < 120 && (fuelOrders === null || fuelOrders > 50);
  return { healthy, solverHeartbeatAgeS, fuelLreact: Number.isFinite(fuelCache.lreact) ? Number(fuelCache.lreact.toFixed(3)) : null, fuelOrders };
}

function send(req: IncomingMessage, res: ServerResponse, code: number, body: unknown) {
  const origin = req.headers.origin ?? "";
  if (ORIGINS.includes(origin) || ORIGINS.includes("*")) res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Content-Type", "application/json");
  res.writeHead(code);
  res.end(JSON.stringify(body));
}

async function main() {
  const tiers = (await pub.lasna.readContract({ address: addr.reactive, abi: abi.reactive, functionName: "tiers" })) as { maxAmount: bigint }[];
  amount = tiers[0].maxAmount / 2n || 1n;
  const allowance = (await pub.origin.readContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "allowance", args: [userAddr, addr.escrow] })) as bigint;
  if (allowance < 10n ** 30n) {
    const h = await user.writeContract({ address: addr.tokenOrigin, abi: abi.erc20, functionName: "approve", args: [addr.escrow, maxUint256], chain: chains.origin, account: user.account! });
    await pub.origin.waitForTransactionReceipt({ hash: h });
  }

  createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET, POST");
      res.setHeader("Access-Control-Allow-Headers", "content-type");
      return send(req, res, 204, {});
    }
    // Behind Cloudflare (proxied DNS), the visitor's address arrives in CF-Connecting-IP; Caddy's X-Forwarded-For
    // would only show Cloudflare. Per-visitor limits use the first one present.
    const ip = String(req.headers["cf-connecting-ip"] ?? req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "?").split(",")[0].trim();
    if (req.method === "GET" && req.url === "/status") {
      return send(req, res, 200, { env: ENV, address: userAddr, amount: amount.toString(), lastOrder, nextHeartbeatInS: Math.max(0, Math.round((nextBeat - Date.now()) / 1000)), todayCount: day.count, cap: DAILY_CAP, ...(await health()) });
    }
    // Health for the container check and monitoring: 200 only if the solver is scanning and the reactive contract has fuel.
    if (req.method === "GET" && req.url === "/health") {
      const h = await health();
      return send(req, res, h.healthy ? 200 : 503, h);
    }
    if (req.method === "POST" && req.url === "/order") {
      const why = allowed(ip);
      if (why) return send(req, res, 429, { error: why, lastOrder });
      try {
        return send(req, res, 200, await guarded("visitor", ip));
      } catch (e) {
        return send(req, res, 503, { error: (e as Error).message.split("\n")[0], lastOrder });
      }
    }
    if (req.method === "POST" && req.url === "/relay") {
      rollDay();
      if (daily.relay >= limits.relayDaily) return send(req, res, 429, { error: "daily relay cap reached; open the order from your wallet instead" });
      if (recent(hitsRelay, ip, 3_600_000).length >= limits.relayPerIpHour) return send(req, res, 429, { error: "a few relayed orders per hour per visitor" });
      try {
        const v = vetRelay((await readBody(req)) as RelayBody);
        hitsRelay.set(ip, [...recent(hitsRelay, ip, 3_600_000), Date.now()]);
        daily.relay++;
        return send(req, res, 200, await relay(v, ip));
      } catch (e) {
        const m = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message;
        return send(req, res, 400, { error: m.split("\n")[0] });
      }
    }
    if (req.method === "POST" && req.url === "/drip") {
      rollDay();
      try {
        const b = (await readBody(req)) as { address?: string };
        if (!isAddress(String(b.address))) return send(req, res, 400, { error: "bad address" });
        const to = getAddress(String(b.address));
        if (daily.drip >= limits.dripDaily) return send(req, res, 429, { error: "daily drip cap reached; use faucet.circle.com" });
        if (Date.now() - (dripped.get(to) ?? 0) < 86_400_000) return send(req, res, 429, { error: "this address already got test USDC today" });
        if (recent(hitsDrip, ip, 86_400_000).length >= limits.dripPerIpDay) return send(req, res, 429, { error: "a few drips per visitor per day" });
        dripped.set(to, Date.now());
        hitsDrip.set(ip, [...recent(hitsDrip, ip, 86_400_000), Date.now()]);
        daily.drip++;
        return send(req, res, 200, await drip(to, ip));
      } catch (e) {
        return send(req, res, 503, { error: (e as Error).message.split("\n")[0] });
      }
    }
    send(req, res, 404, { error: "not found" });
  }).listen(PORT, () => console.log(`demo (${ENV}) on :${PORT}; heartbeat every ${INTERVAL_S}s; ${amount} per order; origins ${ORIGINS.join(" ")}`));

  for (;;) {
    await sleep(5_000);
    if (Date.now() < nextBeat || busy) continue;
    await guarded("heartbeat").catch((e) => {
      console.error(`heartbeat failed: ${(e as Error).message.split("\n")[0]}`);
      nextBeat = Date.now() + 60_000;
    });
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
