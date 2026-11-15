// Live testnet wallet operations. Only addresses and balances are ever printed.
//   SNAP_ENV=live pnpm fund status       balances of deployer / user / solver on all three chains
//   SNAP_ENV=live pnpm fund distribute   from the deployer: gas to user+solver, USDC to user (Base) and
//                                        solver (Unichain), and lREACT via the Base Sepolia faucet
//   SNAP_ENV=live pnpm fund rebalance    return USDC so loops can keep running: solver's Base USDC → user,
//                                        user's Unichain USDC → solver
import { formatEther, formatUnits, parseEther, type Address } from "viem";
import { ENV, chains, pub, addr, abi, wallet } from "./common.ts";

if (ENV !== "live") throw new Error("fund runs against live testnets only (SNAP_ENV=live)");
const LREACT_FAUCET_BASE = "0x2afaFD298b23b62760711756088F75B7409f5967" as Address; // 1 ETH → 100 lREACT, max 5 ETH/tx
const FAUCET_ABI = [{ type: "function", name: "request", stateMutability: "payable", inputs: [{ name: "receiver", type: "address" }], outputs: [] }] as const;

const dep = { origin: wallet("deployer", "origin"), dest: wallet("deployer", "dest") };
const usr = { origin: wallet("user", "origin"), dest: wallet("user", "dest") };
const sol = { origin: wallet("solver", "origin"), dest: wallet("solver", "dest") };
const who = { deployer: dep.origin.account!.address, user: usr.origin.account!.address, solver: sol.origin.account!.address };

const usdc = (c: "origin" | "dest", a: Address) =>
  pub[c].readContract({ address: c === "origin" ? addr.tokenOrigin : addr.tokenDest, abi: abi.erc20, functionName: "balanceOf", args: [a] }) as Promise<bigint>;

async function status() {
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
  console.log(`lREACT: ${formatEther(lreactEth)} ETH to the Base Sepolia faucet for the deployer`);
  const h = await dep.origin.writeContract({ address: LREACT_FAUCET_BASE, abi: FAUCET_ABI, functionName: "request", args: [who.deployer], value: lreactEth, chain: chains.origin, account: dep.origin.account! });
  await pub.origin.waitForTransactionReceipt({ hash: h });
  console.log(`  faucet request ${h} (lREACT arrives on Lasna within minutes)`);
}

async function rebalance() {
  await sendUsdc(sol.origin, "origin", who.user, await usdc("origin", who.solver));
  await sendUsdc(usr.dest, "dest", who.solver, await usdc("dest", who.user));
}

const cmd = process.argv[2] ?? "status";
const run = { status, distribute, rebalance }[cmd as "status" | "distribute" | "rebalance"];
if (!run) throw new Error(`unknown command ${cmd}`);
run()
  .then(() => (cmd !== "status" ? status() : undefined))
  .then(() => process.exit(0))
  .catch((e) => {
    console.error((e as Error).message.split("\n")[0]);
    process.exit(1);
  });
