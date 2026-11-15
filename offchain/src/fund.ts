// Live testnet wallet operations. Only addresses and balances are ever printed.
//   SNAP_ENV=live pnpm fund status       balances of deployer / user / solver on all three chains
//   SNAP_ENV=live pnpm fund distribute   from the deployer: gas to user+solver, USDC to user (Base) and
//                                        solver (Unichain), and lREACT via the Base Sepolia faucet
//   SNAP_ENV=live pnpm fund from-sepolia lREACT via Reactive's Ethereum Sepolia faucet + bridge ETH to Base and
//                                        Unichain Sepolia (a small test deposit to each bridge first)
//   SNAP_ENV=live pnpm fund rebalance    return USDC so loops can keep running: solver's Base USDC → user,
//                                        user's Unichain USDC → solver
import { createPublicClient, createWalletClient, formatEther, formatUnits, http, parseEther, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia as sepoliaChain } from "viem/chains";
import { ENV, chains, pub, addr, abi, wallet } from "./common.ts";

if (ENV !== "live") throw new Error("fund runs against live testnets only (SNAP_ENV=live)");
const LREACT_FAUCET_BASE = "0x2afaFD298b23b62760711756088F75B7409f5967" as Address; // 1 ETH → 100 lREACT, max 5 ETH/tx
const LREACT_FAUCET_SEPOLIA = "0x9b9BB25f1A81078C544C829c5EB7822d747Cf434" as Address; // same rate, on Ethereum Sepolia
// OP Stack L1StandardBridge proxies on Ethereum Sepolia. Unichain: superchain-registry sepolia/unichain.toml.
// Base Sepolia: not in the registry; verified by a small test deposit before any larger amount.
const L1_BRIDGE = {
  dest: "0xea58fcA6849d79EAd1f26608855c2D6407d54Ce2" as Address,
  origin: "0xfd0Bf71F60660E2f608ed56e1659C450eB113120" as Address,
};
const BRIDGE_ABI = [{ type: "function", name: "depositETH", stateMutability: "payable", inputs: [{ name: "_minGasLimit", type: "uint32" }, { name: "_extraData", type: "bytes" }], outputs: [] }] as const;
const sepolia = createPublicClient({ chain: sepoliaChain, transport: http(process.env.SEPOLIA_RPC ?? "https://ethereum-sepolia-rpc.publicnode.com") });
const depL1 = createWalletClient({ account: privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as Hex), chain: sepoliaChain, transport: http(process.env.SEPOLIA_RPC ?? "https://ethereum-sepolia-rpc.publicnode.com") });
const FAUCET_ABI = [{ type: "function", name: "request", stateMutability: "payable", inputs: [{ name: "receiver", type: "address" }], outputs: [] }] as const;

const dep = { origin: wallet("deployer", "origin"), dest: wallet("deployer", "dest") };
const usr = { origin: wallet("user", "origin"), dest: wallet("user", "dest") };
const sol = { origin: wallet("solver", "origin"), dest: wallet("solver", "dest") };
const who = { deployer: dep.origin.account!.address, user: usr.origin.account!.address, solver: sol.origin.account!.address };

const usdc = (c: "origin" | "dest", a: Address) =>
  pub[c].readContract({ address: c === "origin" ? addr.tokenOrigin : addr.tokenDest, abi: abi.erc20, functionName: "balanceOf", args: [a] }) as Promise<bigint>;

async function status() {
  console.log(`deployer on Ethereum Sepolia: ${formatEther(await sepolia.getBalance({ address: who.deployer }))} ETH`);
  for (const [name, a] of Object.entries(who)) {
    const [bEth, uEth, lr, bU, uU] = await Promise.all([
      pub.origin.getBalance({ address: a }), pub.dest.getBalance({ address: a }), pub.lasna.getBalance({ address: a }), usdc("origin", a), usdc("dest", a),
    ]);
    console.log(`${name.padEnd(8)} ${a}  Base ${formatEther(bEth)} ETH, ${formatUnits(bU, 6)} USDC | Unichain ${formatEther(uEth)} ETH, ${formatUnits(uU, 6)} USDC | Lasna ${formatEther(lr)} lREACT`);
  }
}

async function sendEth(w: (typeof dep)["origin"], c: "origin" | "dest", to: Address, value: bigint) {
  const h = await w.sendTransaction({ to, value, chain: chains[c], account: w.account! });
  await pub[c].waitForTransactionReceipt({ hash: h });
  console.log(`  ${c}: ${formatEther(value)} ETH → ${to} (${h})`);
}

async function sendUsdc(w: (typeof dep)["origin"], c: "origin" | "dest", to: Address, amount: bigint) {
  if (amount <= 0n) return;
  const h = await w.writeContract({ address: c === "origin" ? addr.tokenOrigin : addr.tokenDest, abi: abi.erc20, functionName: "transfer", args: [to, amount], chain: chains[c], account: w.account! });
  await pub[c].waitForTransactionReceipt({ hash: h });
  console.log(`  ${c}: ${formatUnits(amount, 6)} USDC → ${to} (${h})`);
}

async function distribute() {
  const gas = { userBase: parseEther("0.01"), userUni: parseEther("0.004"), solverBase: parseEther("0.004"), solverUni: parseEther("0.01") };
  const lreactEth = parseEther(process.env.LREACT_ETH ?? "0.12");
  console.log("gas to user and solver");
  await sendEth(dep.origin, "origin", who.user, gas.userBase);
  await sendEth(dep.dest, "dest", who.user, gas.userUni);
  await sendEth(dep.origin, "origin", who.solver, gas.solverBase);
  await sendEth(dep.dest, "dest", who.solver, gas.solverUni);
  console.log("USDC: Base → user, Unichain → solver");
  await sendUsdc(dep.origin, "origin", who.user, await usdc("origin", who.deployer));
  await sendUsdc(dep.dest, "dest", who.solver, await usdc("dest", who.deployer));
  if (lreactEth === 0n) return; // lREACT already bought via from-sepolia
  console.log(`lREACT: ${formatEther(lreactEth)} ETH to the Base Sepolia faucet for the deployer`);
  const h = await dep.origin.writeContract({ address: LREACT_FAUCET_BASE, abi: FAUCET_ABI, functionName: "request", args: [who.deployer], value: lreactEth, chain: chains.origin, account: dep.origin.account! });
  await pub.origin.waitForTransactionReceipt({ hash: h });
  console.log(`  faucet request ${h} (lREACT arrives on Lasna within minutes)`);
}

/** From Ethereum Sepolia: lREACT via Reactive's Sepolia faucet, then bridge ETH to Base and Unichain Sepolia. */
async function fromSepolia() {
  const lreact = parseEther(process.env.LREACT_ETH ?? "0.12");
  const toBase = parseEther(process.env.BRIDGE_BASE ?? "0.15");
  const toUni = parseEther(process.env.BRIDGE_UNI ?? "0.04");
  const send = async (label: string, to: Address, value: bigint, data?: { fn: "request" | "depositETH" }) => {
    const h = data?.fn === "request"
      ? await depL1.writeContract({ address: to, abi: FAUCET_ABI, functionName: "request", args: [who.deployer], value, chain: sepoliaChain, account: depL1.account! })
      : await depL1.writeContract({ address: to, abi: BRIDGE_ABI, functionName: "depositETH", args: [200_000, "0x"], value, chain: sepoliaChain, account: depL1.account! });
    const r = await sepolia.waitForTransactionReceipt({ hash: h });
    console.log(`  ${label}: ${formatEther(value)} ETH (${r.status}) ${h}`);
  };
  const waitArrive = async (c: "origin" | "dest", before: bigint, min: bigint) => {
    for (let i = 0; i < 60; i++) {
      const b = await pub[c].getBalance({ address: who.deployer });
      if (b - before >= min) return true;
      await new Promise((r) => setTimeout(r, 15_000));
    }
    return false;
  };
  console.log("lREACT via the Ethereum Sepolia faucet");
  await send("faucet", LREACT_FAUCET_SEPOLIA, lreact, { fn: "request" });
  for (const [c, total] of [["origin", toBase], ["dest", toUni]] as const) {
    const before = await pub[c].getBalance({ address: who.deployer });
    const probe = parseEther("0.002");
    await send(`${c} test deposit`, L1_BRIDGE[c], probe, { fn: "depositETH" });
    if (!(await waitArrive(c, before, probe / 2n))) throw new Error(`test deposit to ${c} did not arrive in 15 min; stopping before sending more`);
    await send(`${c} deposit`, L1_BRIDGE[c], total - probe, { fn: "depositETH" });
  }
}

async function rebalance() {
  await sendUsdc(sol.origin, "origin", who.user, await usdc("origin", who.solver));
  await sendUsdc(usr.dest, "dest", who.solver, await usdc("dest", who.user));
}

const cmd = process.argv[2] ?? "status";
const run = { status, distribute, rebalance, "from-sepolia": fromSepolia }[cmd as "status" | "distribute" | "rebalance" | "from-sepolia"];
if (!run) throw new Error(`unknown command ${cmd}`);
run()
  .then(() => (cmd !== "status" ? status() : undefined))
  .then(() => process.exit(0))
  .catch((e) => {
    console.error((e as Error).message.split("\n")[0]);
    process.exit(1);
  });
