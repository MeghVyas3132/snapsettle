// Always-on demo for visitors: opens a small instant-tier order on Base Sepolia every DEMO_INTERVAL_S seconds,
// and on request from the dashboard ("Run one live order"), so anyone watching sees a real loop settle.
// Run it next to the solver (`pnpm solver`). Live testnets only. Keys come from offchain/.env, never printed.
//
//   SNAP_ENV=live DEMO_INTERVAL_S=900 DEMO_PORT=8787 DEMO_ORIGINS=https://meghvyas3132.github.io pnpm demo
//
// HTTP:
//   GET  /status  → { env, address, lastOrder, nextHeartbeatInS, todayCount, cap }
//   POST /order   → { orderId, openTx }   (rate limited: one order per 40 s overall, 4 per hour per IP, a daily cap)
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { maxUint256, parseEventLogs, type Hex } from "viem";
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
    const r = await openOrder(source);
    lastAt = Date.now();
    day.count++;
    if (ip) perIp.set(ip, [...(perIp.get(ip) ?? []).filter((t) => Date.now() - t < 3_600_000), Date.now()]);
    nextBeat = Date.now() + INTERVAL_S * 1000;
    return r;
  } finally {
    busy = false;
  }
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
    const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "?").split(",")[0].trim();
    if (req.method === "GET" && req.url === "/status") {
      return send(req, res, 200, { env: ENV, address: userAddr, amount: amount.toString(), lastOrder, nextHeartbeatInS: Math.max(0, Math.round((nextBeat - Date.now()) / 1000)), todayCount: day.count, cap: DAILY_CAP });
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
