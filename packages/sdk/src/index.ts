// @snapsettle/sdk: open, sign (gasless), relay and track Snapsettle orders from an app.
// Snapsettle settles ERC-7683-style cross-chain orders with Reactive Network: the user's USDC waits in an escrow on
// Base Sepolia, a solver pays the user on Unichain Sepolia, and a Reactive contract on Lasna, which sees both chains,
// repays the solver. Testnet only.
import {
  createPublicClient,
  defineChain,
  encodeAbiParameters,
  http,
  keccak256,
  parseAbi,
  parseEventLogs,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { baseSepolia, unichainSepolia } from "viem/chains";
import { generated } from "./generated.js";

// ---------------------------------------------------------------- network

/** Reactive Network's Lasna testnet, where the settlement contract runs. */
export const lasna: Chain = defineChain({
  id: 5318007,
  name: "Reactive Lasna",
  nativeCurrency: { name: "lREACT", symbol: "lREACT", decimals: 18 },
  rpcUrls: { default: { http: ["https://lasna-rpc.rnk.dev/"] } },
  blockExplorers: { default: { name: "Reactscan", url: "https://lasna.reactscan.net" } },
});

/** The deployed testnet route and its contracts (generated from the repo's deployments). */
export const testnet: {
  version: string;
  chains: { origin: Chain; dest: Chain; lasna: Chain };
  addresses: typeof generated.addresses;
  abi: typeof generated.abi;
} = {
  version: generated.version,
  chains: { origin: baseSepolia, dest: unichainSepolia, lasna },
  addresses: generated.addresses,
  abi: generated.abi,
};

export type Clients = { origin: PublicClient; dest: PublicClient; lasna: PublicClient };

/** Read-only clients on public RPCs. Pass your own for production use. */
export function publicClients(rpc: Partial<Record<keyof Clients, string>> = {}): Clients {
  return {
    origin: createPublicClient({ chain: baseSepolia, transport: http(rpc.origin ?? "https://sepolia.base.org") }) as PublicClient,
    dest: createPublicClient({ chain: unichainSepolia, transport: http(rpc.dest ?? "https://sepolia.unichain.org") }) as PublicClient,
    lasna: createPublicClient({ chain: lasna, transport: http(rpc.lasna) }) as PublicClient,
  };
}

// ---------------------------------------------------------------- orders

export type OrderData = {
  inputToken: Address;
  inputAmount: bigint;
  outputToken: Address;
  outputAmount: bigint;
  recipient: Address;
  destinationChainId: bigint;
  destinationSettler: Address;
  fillDeadline: number;
};

const ORDER_COMPONENTS = [
  { name: "inputToken", type: "address" },
  { name: "inputAmount", type: "uint256" },
  { name: "outputToken", type: "address" },
  { name: "outputAmount", type: "uint256" },
  { name: "recipient", type: "address" },
  { name: "destinationChainId", type: "uint256" },
  { name: "destinationSettler", type: "address" },
  { name: "fillDeadline", type: "uint32" },
] as const;
const ORDER_TUPLE = { type: "tuple", components: ORDER_COMPONENTS } as const;

/**
 * Builds an order on the testnet route: `amount` USDC (6 decimals) in on Base Sepolia, `amount` minus the solver's
 * spread out on Unichain Sepolia to `recipient`. The escrow accepts 0.1 USDC at minimum.
 */
export function buildOrder(p: { amount: bigint; recipient: Address; spreadBps?: number; deadlineSeconds?: number; now?: number }): OrderData {
  const spread = BigInt(p.spreadBps ?? 10);
  return {
    inputToken: testnet.addresses.tokenOrigin,
    inputAmount: p.amount,
    outputToken: testnet.addresses.tokenDest,
    outputAmount: (p.amount * (10_000n - spread)) / 10_000n,
    recipient: p.recipient,
    destinationChainId: BigInt(unichainSepolia.id),
    destinationSettler: testnet.addresses.destinationSettler,
    fillDeadline: Math.floor((p.now ?? Date.now()) / 1000) + (p.deadlineSeconds ?? 600),
  };
}

/** The terms hash the destination emits with every fill (`OrderLib.hash`). */
export const orderHash = (d: OrderData): Hex => keccak256(encodeAbiParameters([ORDER_TUPLE], [d]));

/** The EIP-3009 nonce a user signs for a gasless order; computed locally, identical to `OriginEscrow.gaslessNonce`. */
export function gaslessNonce(d: OrderData, escrow: Address = testnet.addresses.originEscrow, chainId = baseSepolia.id): Hex {
  return keccak256(
    encodeAbiParameters([{ type: "string" }, { type: "uint256" }, { type: "address" }, { type: "bytes32" }], ["snapsettle.openFor", BigInt(chainId), escrow, orderHash(d)]),
  );
}

/** How long Snapsettle waits before repaying the solver for an order of this size (0 = on sight). */
export async function settleDelay(amount: bigint, clients: Clients = publicClients()): Promise<number> {
  return Number(await clients.origin.readContract({ address: testnet.addresses.resolver, abi: testnet.abi.resolver, functionName: "settleDelay", args: [amount] }));
}

const ERC20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function name() view returns (string)",
  "function version() view returns (string)",
]);

const openedId = (logs: Parameters<typeof parseEventLogs>[0]["logs"]): Hex =>
  (parseEventLogs({ abi: testnet.abi.escrow, logs, eventName: "Opened" })[0].args as { orderId: Hex }).orderId;

/** Opens an order the classic way: approve (if needed), then `open`. Two transactions, the user pays gas. */
export async function openOrder(p: { wallet: WalletClient; order: OrderData; clients?: Clients }): Promise<{ orderId: Hex; hash: Hex }> {
  const c = p.clients ?? publicClients();
  const account = p.wallet.account ?? (await p.wallet.requestAddresses())[0];
  const from = typeof account === "string" ? account : account.address;
  const allowance = await c.origin.readContract({ address: p.order.inputToken, abi: ERC20, functionName: "allowance", args: [from, testnet.addresses.originEscrow] });
  if (allowance < p.order.inputAmount) {
    const h = await p.wallet.writeContract({ account, chain: baseSepolia, address: p.order.inputToken, abi: ERC20, functionName: "approve", args: [testnet.addresses.originEscrow, p.order.inputAmount] });
    await c.origin.waitForTransactionReceipt({ hash: h });
  }
  const hash = await p.wallet.writeContract({ account, chain: baseSepolia, address: testnet.addresses.originEscrow, abi: testnet.abi.escrow, functionName: "open", args: [p.order] });
  const r = await c.origin.waitForTransactionReceipt({ hash });
  return { orderId: openedId(r.logs), hash };
}

export type SignedOrder = { order: OrderData; user: Address; validAfter: bigint; validBefore: bigint; signature: Hex };

/**
 * Gasless step 1: the user signs one EIP-3009 `ReceiveWithAuthorization` for exactly this order. No transaction,
 * no gas, no approval. Whoever submits it cannot change a term: the nonce is derived from the terms.
 */
export async function signGaslessOrder(p: { wallet: WalletClient; order: OrderData; validForSeconds?: number; clients?: Clients }): Promise<SignedOrder> {
  const c = p.clients ?? publicClients();
  const account = p.wallet.account ?? (await p.wallet.requestAddresses())[0];
  const user = typeof account === "string" ? account : account.address;
  const [name, version] = await Promise.all([
    c.origin.readContract({ address: p.order.inputToken, abi: ERC20, functionName: "name" }),
    c.origin.readContract({ address: p.order.inputToken, abi: ERC20, functionName: "version" }),
  ]);
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + (p.validForSeconds ?? 600));
  const signature = await p.wallet.signTypedData({
    account,
    domain: { name, version, chainId: baseSepolia.id, verifyingContract: p.order.inputToken },
    types: {
      ReceiveWithAuthorization: [
        { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "ReceiveWithAuthorization",
    message: { from: user, to: testnet.addresses.originEscrow, value: p.order.inputAmount, validAfter: 0n, validBefore, nonce: gaslessNonce(p.order) },
  });
  return { order: p.order, user, validAfter: 0n, validBefore, signature };
}

/** Gasless step 2, option A: submit the signed order yourself (any account pays the gas, e.g. your app's relayer). */
export async function submitSignedOrder(p: { wallet: WalletClient; signed: SignedOrder; clients?: Clients }): Promise<{ orderId: Hex; hash: Hex }> {
  const c = p.clients ?? publicClients();
  const s = p.signed;
  const account = p.wallet.account ?? (await p.wallet.requestAddresses())[0];
  const hash = await p.wallet.writeContract({ account, chain: baseSepolia, address: testnet.addresses.originEscrow, abi: testnet.abi.escrow, functionName: "openFor", args: [s.order, s.user, s.validAfter, s.validBefore, s.signature] });
  const r = await c.origin.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`openFor reverted: ${hash}`);
  return { orderId: openedId(r.logs), hash };
}

/** Gasless step 2, option B: hand the signed order to a relay service (the Snapsettle demo service speaks this). */
export async function relayOrder(p: { api: string; signed: SignedOrder }): Promise<{ orderId: Hex; openTx: Hex }> {
  const s = p.signed;
  const body = {
    order: Object.fromEntries(Object.entries(s.order).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v])),
    user: s.user, validAfter: s.validAfter.toString(), validBefore: s.validBefore.toString(), signature: s.signature,
  };
  const r = await fetch(`${p.api.replace(/\/$/, "")}/relay`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json()) as { orderId?: Hex; openTx?: Hex; error?: string };
  if (!r.ok || !j.orderId || !j.openTx) throw new Error(j.error ?? `relay failed (${r.status})`);
  return { orderId: j.orderId, openTx: j.openTx };
}

// ---------------------------------------------------------------- tracking

export type OrderEvent =
  | { kind: "opened"; tx: Hex; block: bigint }
  | { kind: "filled"; tx: Hex; block: bigint; solver: Address }
  | { kind: "accepted"; tx: Hex; block: bigint; settleDelay: number }
  | { kind: "rejected"; tx: Hex; block: bigint; reason: string }
  | { kind: "confirmed"; tx: Hex; block: bigint }
  | { kind: "repaid"; tx: Hex; block: bigint; repayTo: Address }
  | { kind: "deferred"; tx: Hex; block: bigint }
  | { kind: "refunded"; tx: Hex; block: bigint };

const STATUS = ["none", "open", "settled", "refunded", "deferred"] as const;
export type OrderStatus = (typeof STATUS)[number];

/** The escrow's view of an order right now. */
export async function orderStatus(orderId: Hex, clients: Clients = publicClients()): Promise<OrderStatus> {
  const o = (await clients.origin.readContract({ address: testnet.addresses.originEscrow, abi: testnet.abi.escrow, functionName: "orders", args: [orderId] })) as readonly unknown[];
  return STATUS[Number(o[4])] ?? "none";
}

/**
 * Follows one order across the three chains and reports each step once: opened (Base), filled (Unichain),
 * accepted or rejected (Lasna), confirmed (Unichain, delayed orders), repaid or refunded (Base). Resolves with the
 * final event, or rejects on `timeoutMs`. Polls public RPCs; Base Sepolia's limits each log query to 190 blocks.
 */
export async function trackOrder(p: {
  orderId: Hex;
  onEvent?: (e: OrderEvent) => void;
  clients?: Clients;
  lookback?: { origin?: bigint; dest?: bigint; lasna?: bigint };
  pollMs?: number;
  timeoutMs?: number;
  /** After repaid/refunded, how long to keep reading for the Lasna step (default 15 s). */
  graceMs?: number;
}): Promise<OrderEvent> {
  const c = p.clients ?? publicClients();
  const seen = new Set<string>();
  const emit = (e: OrderEvent) => {
    const k = `${e.kind}:${e.tx}`;
    if (seen.has(k)) return;
    seen.add(k);
    p.onEvent?.(e);
  };
  const span = { origin: 190n, dest: 500n, lasna: 500n } as const;
  const cursor: Record<keyof Clients, bigint> = { origin: 0n, dest: 0n, lasna: 0n };
  for (const k of ["origin", "dest", "lasna"] as const) {
    const head = await c[k].getBlockNumber();
    const back = p.lookback?.[k] ?? (k === "origin" ? 180n : 120n);
    cursor[k] = head > back ? head - back : 0n;
  }
  const args = { orderId: p.orderId };
  const deadline = Date.now() + (p.timeoutMs ?? 15 * 60_000);
  let final: OrderEvent | undefined;
  const scan = async (k: keyof Clients, address: Address, abi: readonly unknown[], names: string[]) => {
    const head = await c[k].getBlockNumber();
    while (cursor[k] < head) {
      const to = head - cursor[k] > span[k] ? cursor[k] + span[k] : head;
      for (const name of names) {
        const logs = await c[k].getContractEvents({ address, abi: abi as never, eventName: name as never, args: args as never, fromBlock: cursor[k] + 1n, toBlock: to });
        for (const l of logs as unknown as Array<{ transactionHash: Hex; blockNumber: bigint; args: Record<string, unknown> }>) {
          const base = { tx: l.transactionHash, block: l.blockNumber };
          const e: OrderEvent | undefined =
            name === "Opened" ? { kind: "opened", ...base }
            : name === "Filled" ? { kind: "filled", ...base, solver: l.args.solver as Address }
            : name === "FillAccepted" ? { kind: "accepted", ...base, settleDelay: Number(l.args.settleDelay) }
            : name === "FillRejected" ? { kind: "rejected", ...base, reason: String(l.args.reason) }
            : name === "Confirmed" ? { kind: "confirmed", ...base }
            : name === "Settled" ? { kind: "repaid", ...base, repayTo: l.args.repayTo as Address }
            : name === "SettleDeferred" ? { kind: "deferred", ...base }
            : name === "Refunded" ? { kind: "refunded", ...base }
            : undefined;
          if (!e) continue;
          emit(e);
          if (e.kind === "repaid" || e.kind === "refunded") final = e;
        }
      }
      cursor[k] = to;
    }
  };
  const sawLasna = () => [...seen].some((k) => k.startsWith("accepted:") || k.startsWith("rejected:"));
  let finalAt = 0;
  // The repayment on Base can be seen before Lasna's RPC reports the reactive transaction that caused it, so after
  // the final event the tracker keeps reading for a short grace period to report every step.
  while (!final || (!sawLasna() && Date.now() - finalAt < (p.graceMs ?? 15_000))) {
    if (!final && Date.now() > deadline) throw new Error(`order ${p.orderId} not repaid or refunded within the timeout`);
    await Promise.allSettled([
      scan("origin", testnet.addresses.originEscrow, testnet.abi.escrow, ["Opened", "Settled", "SettleDeferred", "Refunded"]),
      scan("dest", testnet.addresses.destinationSettler, testnet.abi.settler, ["Filled", "Confirmed"]),
      scan("lasna", testnet.addresses.reactive, testnet.abi.reactive, ["FillAccepted", "FillRejected"]),
    ]);
    if (final && !finalAt) finalAt = Date.now();
    if (!final || !sawLasna()) await new Promise((r) => setTimeout(r, p.pollMs ?? 1000));
  }
  return final;
}

// ---------------------------------------------------------------- operator

/** The reactive contract's lREACT balance and how many orders it still covers (~0.045 lREACT each, measured). */
export async function fuel(clients: Clients = publicClients()): Promise<{ lreact: number; ordersCovered: number }> {
  const wei = await clients.lasna.getBalance({ address: testnet.addresses.reactive });
  const lreact = Number(wei) / 1e18;
  return { lreact, ordersCovered: Math.floor(lreact / 0.045) };
}
