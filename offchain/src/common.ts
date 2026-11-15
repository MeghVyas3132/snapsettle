// Shared config, ABIs and clients for the Snapsettle solver, bench and local relay.
// SNAP_ENV=local (anvil harness, default) or SNAP_ENV=live (Base Sepolia / Unichain Sepolia / Lasna).
import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Chain,
} from "viem";
import { privateKeyToAccount, nonceManager } from "viem/accounts";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const ENV = (process.env.SNAP_ENV ?? "local") as "local" | "live";
if (ENV !== "local" && ENV !== "live") throw new Error(`SNAP_ENV must be local or live, got ${ENV}`);

// ---------------------------------------------------------------- chains

const RPC = {
  local: { origin: "http://127.0.0.1:8545", dest: "http://127.0.0.1:8546", lasna: "http://127.0.0.1:8547" },
  live: {
    origin: process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org",
    dest: process.env.UNICHAIN_SEPOLIA_RPC ?? "https://sepolia.unichain.org",
    lasna: process.env.LASNA_RPC ?? "https://lasna-rpc.rnk.dev/",
  },
}[ENV];

const mk = (id: number, name: string, url: string): Chain =>
  defineChain({ id, name, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [url] } } });

export const chains = {
  origin: mk(84532, "Base Sepolia", RPC.origin),
  dest: mk(1301, "Unichain Sepolia", RPC.dest),
  lasna: mk(5318007, "Reactive Lasna", RPC.lasna),
};

export const explorers = {
  origin: "https://sepolia.basescan.org",
  dest: "https://sepolia.uniscan.xyz",
  lasna: "https://lasna.reactscan.net",
};

export const pub = {
  origin: createPublicClient({ chain: chains.origin, transport: http(RPC.origin) }) as PublicClient,
  dest: createPublicClient({ chain: chains.dest, transport: http(RPC.dest) }) as PublicClient,
  lasna: createPublicClient({ chain: chains.lasna, transport: http(RPC.lasna) }) as PublicClient,
};

// ---------------------------------------------------------------- addresses

function readDeployment(step: string, key: string): Address {
  const p = join(ROOT, "contracts/deployments", ENV, `${step}.json`);
  if (!existsSync(p)) throw new Error(`missing ${p}: deploy first (docs/03-deploy.md or scripts/local-up.sh)`);
  return JSON.parse(readFileSync(p, "utf8"))[key] as Address;
}

const CIRCLE_USDC = {
  origin: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address, // Base Sepolia
  dest: "0x31d0220469e10c4E71834a79b1f276d740d3768F" as Address, // Unichain Sepolia
};

export const addr = {
  destinationSettler: readDeployment("1-destination", "destinationSettler"),
  reactive: readDeployment("2-reactive", "snapsettleReactive"),
  escrow: readDeployment("3-origin", "originEscrow"),
  resolver: readDeployment("5-resolver", "snapsettleResolver"),
  tokenOrigin: ENV === "local" ? readDeployment("token-84532", "token") : (process.env.ORIGIN_TOKEN as Address) ?? CIRCLE_USDC.origin,
  tokenDest: ENV === "local" ? readDeployment("token-1301", "token") : (process.env.DEST_TOKEN as Address) ?? CIRCLE_USDC.dest,
  system: "0x8888888888888888888888888888888888888888" as Address,
  cronSource: "0x0000000000000000000000000000000000fffFfF" as Address,
  originCallbackProxy: "0x476F44b11F5C942c58f4c8E3d0300E5710743585" as Address,
};

export const CRON10_TOPIC = "0x04463f7c1651e6b9774d7f85c85bb94654e3c46ca79b0c16fb16d4183307b687" as Hex;

// ---------------------------------------------------------------- ABIs (from forge build output)

function abiOf(file: string, name = file): Abi {
  const p = join(ROOT, "contracts/out", `${file}.sol`, `${name}.json`);
  return JSON.parse(readFileSync(p, "utf8")).abi as Abi;
}

export const abi = {
  escrow: abiOf("OriginEscrow"),
  dest: abiOf("DestinationSettler"),
  reactive: abiOf("SnapsettleReactive"),
  resolver: abiOf("SnapsettleResolver"),
  erc20: abiOf("IERC20"),
  mockSystem: ENV === "local" ? abiOf("MockSystem") : ([] as Abi),
  step: abiOf("IERC7683", "IStep"),
  payment: abiOf("IERC7683", "IPayment"),
};

// ---------------------------------------------------------------- wallets

// Local: anvil's public dev keys. Live: keys come only from the environment (a .env the owner creates);
// this code never prints or stores them.
const ANVIL_KEYS = {
  user: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  solver: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
} as const;

function keyFor(role: "user" | "solver"): Hex {
  if (ENV === "local") return ANVIL_KEYS[role] as Hex;
  const k = process.env[role === "user" ? "USER_PRIVATE_KEY" : "SOLVER_PRIVATE_KEY"];
  if (!k) throw new Error(`set ${role === "user" ? "USER_PRIVATE_KEY" : "SOLVER_PRIVATE_KEY"} in offchain/.env (never commit it)`);
  return k as Hex;
}

export function wallet(role: "user" | "solver", chain: keyof typeof chains): WalletClient {
  const rpc = { origin: RPC.origin, dest: RPC.dest, lasna: RPC.lasna }[chain];
  return createWalletClient({ account: privateKeyToAccount(keyFor(role), { nonceManager }), chain: chains[chain], transport: http(rpc) });
}

// ---------------------------------------------------------------- order types

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

export const ORDER_TUPLE = {
  type: "tuple",
  components: [
    { name: "inputToken", type: "address" },
    { name: "inputAmount", type: "uint256" },
    { name: "outputToken", type: "address" },
    { name: "outputAmount", type: "uint256" },
    { name: "recipient", type: "address" },
    { name: "destinationChainId", type: "uint256" },
    { name: "destinationSettler", type: "address" },
    { name: "fillDeadline", type: "uint32" },
  ],
} as const;

// ---------------------------------------------------------------- evidence

export function evidenceDir(run: string): string {
  const d = join(ROOT, "evidence", ENV, run);
  mkdirSync(d, { recursive: true });
  return d;
}

export function appendJsonl(file: string, row: unknown): void {
  appendFileSync(file, JSON.stringify(row, (_, v) => (typeof v === "bigint" ? v.toString() : v)) + "\n");
}

export function writeJson(file: string, obj: unknown): void {
  writeFileSync(file, JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const now = () => Date.now();

export function txLink(chain: keyof typeof explorers, hash: string): string {
  return `${explorers[chain]}/tx/${hash}`;
}
