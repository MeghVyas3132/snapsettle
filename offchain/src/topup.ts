// Keeps the reactive contract funded. Lasna bills reactive transactions to the contract's lREACT balance, with a
// delay, and a contract that runs dry stops reacting without an error. Measured cost: ~0.045 lREACT per order
// (two to three reactive transactions plus callbacks), so the balance has to be watched.
//   SNAP_ENV=live pnpm topup status          balance of the reactive contract and the deployer, orders left
//   SNAP_ENV=live pnpm topup rc <lREACT>     deployer → reactive contract on Lasna
//   SNAP_ENV=live pnpm topup faucet <ETH>    Ethereum Sepolia ETH → Reactive's faucet → lREACT to the deployer (1 ETH → 100)
// Needs DEPLOYER_PRIVATE_KEY in the environment (from .secrets/deployer.env); the key is never printed.
import { createPublicClient, createWalletClient, formatEther, http, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { ENV, addr, chains, pub, wallet } from "./common.ts";

if (ENV !== "live") throw new Error("topup runs against live testnets only (SNAP_ENV=live)");
const PER_ORDER = parseEther("0.045"); // measured on v3: 7.64 lREACT over ~170 orders
const FAUCET_SEPOLIA = "0x9b9BB25f1A81078C544C829c5EB7822d747Cf434" as const;
const dep = wallet("deployer", "lasna");
const me = dep.account!.address;

const [cmd, arg] = process.argv.slice(2);
const rcBal = () => pub.lasna.getBalance({ address: addr.reactive });
if (cmd === "status" || !cmd) {
  const [rc, d] = await Promise.all([rcBal(), pub.lasna.getBalance({ address: me })]);
  console.log(`reactive contract ${addr.reactive}: ${formatEther(rc)} lREACT (~${rc / PER_ORDER} orders)`);
  console.log(`deployer ${me}: ${formatEther(d)} lREACT`);
  // The escrow pays for its callbacks on Base from its own balance at the callback proxy.
  const PROXY = "0x476F44b11F5C942c58f4c8E3d0300E5710743585" as const;
  const debtAbi = [{ type: "function", name: "debts", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }] as const;
  const [eth, debt] = await Promise.all([pub.origin.getBalance({ address: addr.escrow }), pub.origin.readContract({ address: PROXY, abi: debtAbi, functionName: "debts", args: [addr.escrow] })]);
  console.log(`escrow ${addr.escrow}: ${formatEther(eth)} Base Sepolia ETH for callbacks, debt ${formatEther(debt)}`);
} else if (cmd === "rc") {
  const value = parseEther(arg ?? "1");
  // Lasna refuses a zero priority fee, which is what viem estimates there.
  const base = (await pub.lasna.getBlock()).baseFeePerGas ?? 1_000_000_000n;
  const tip = 1_000_000_000n;
  const h = await dep.sendTransaction({ to: addr.reactive, value, chain: chains.lasna, account: dep.account!, maxPriorityFeePerGas: tip, maxFeePerGas: base * 2n + tip });
  const r = await pub.lasna.waitForTransactionReceipt({ hash: h });
  console.log(`sent ${formatEther(value)} lREACT to the reactive contract (${r.status}) ${h}; now ${formatEther(await rcBal())}`);
} else if (cmd === "faucet") {
  const value = parseEther(arg ?? "0.5");
  const l1 = createWalletClient({ account: privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as Hex), chain: sepolia, transport: http(process.env.SEPOLIA_RPC ?? "https://ethereum-sepolia-rpc.publicnode.com") });
  const l1pub = createPublicClient({ chain: sepolia, transport: http(process.env.SEPOLIA_RPC ?? "https://ethereum-sepolia-rpc.publicnode.com") });
  const abi = [{ type: "function", name: "request", stateMutability: "payable", inputs: [{ name: "receiver", type: "address" }], outputs: [] }] as const;
  const h = await l1.writeContract({ address: FAUCET_SEPOLIA, abi, functionName: "request", args: [me], value, chain: sepolia, account: l1.account! });
  const r = await l1pub.waitForTransactionReceipt({ hash: h });
  console.log(`faucet request ${formatEther(value)} SepETH (${r.status}) ${h}; lREACT arrives on Lasna within minutes`);
} else {
  throw new Error(`unknown command ${cmd}`);
}
process.exit(0);
