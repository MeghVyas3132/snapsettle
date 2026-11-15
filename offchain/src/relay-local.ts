// LOCAL HARNESS ONLY. Emulates Reactive Network between the three anvil chains so the solver, bench and
// dashboard can be built before the live deployment. It does what the network does, and nothing more:
//  - delivers origin/destination logs to react() only if the reactive contract subscribed to them
//    (subscriptions are read from the mock system contract at 0x8888…),
//  - emits Cron10 every 10 Lasna blocks while subscribed,
//  - delivers requested callbacks through the callback proxy address, injecting the requesting
//    reactive contract's address into the first argument.
// Latencies measured through this relay are LOCAL and are never reported as live evidence.
import { createTestClient, createWalletClient, http, encodeAbiParameters, type Address, type Hex, type Log } from "viem";
import { ENV, chains, pub, addr, abi, CRON10_TOPIC, sleep } from "./common.ts";

if (ENV !== "local") throw new Error("relay-local only runs against the local anvil harness");

const test = {
  origin: createTestClient({ mode: "anvil", chain: chains.origin, transport: http(chains.origin.rpcUrls.default.http[0]) }),
  lasna: createTestClient({ mode: "anvil", chain: chains.lasna, transport: http(chains.lasna.rpcUrls.default.http[0]) }),
};
const asSystem = createWalletClient({ account: addr.system, chain: chains.lasna, transport: http(chains.lasna.rpcUrls.default.http[0]) });
const asProxy = createWalletClient({ account: addr.originCallbackProxy, chain: chains.origin, transport: http(chains.origin.rpcUrls.default.http[0]) });

async function isSubscribed(chainId: number, contract: Address, topic0: Hex): Promise<boolean> {
  return (await pub.lasna.readContract({
    address: addr.system,
    abi: abi.mockSystem,
    functionName: "isSubscribed",
    args: [addr.reactive, BigInt(chainId), contract, BigInt(topic0)],
  })) as boolean;
}

function record(log: Log, chainId: number) {
  const t = log.topics.map((x) => BigInt(x ?? 0));
  return {
    chainId: BigInt(chainId),
    contractAddress: log.address,
    topic0: t[0] ?? 0n,
    topic1: t[1] ?? 0n,
    topic2: t[2] ?? 0n,
    topic3: t[3] ?? 0n,
    data: log.data,
    blockNumber: log.blockNumber ?? 0n,
    opCode: BigInt(log.topics.length),
    blockHash: BigInt(log.blockHash ?? 0),
    txHash: BigInt(log.transactionHash ?? 0),
    logIndex: BigInt(log.logIndex ?? 0),
  };
}

async function react(rec: ReturnType<typeof record>) {
  const hash = await asSystem.writeContract({ address: addr.reactive, abi: abi.reactive, functionName: "react", args: [rec], gas: 900_000n, chain: chains.lasna });
  await pub.lasna.waitForTransactionReceipt({ hash });
}

let callbacksDone = 0n;
async function deliverCallbacks() {
  const n = (await pub.lasna.readContract({ address: addr.system, abi: abi.mockSystem, functionName: "callbackCount" })) as bigint;
  for (; callbacksDone < n; callbacksDone++) {
    const c = (await pub.lasna.readContract({ address: addr.system, abi: abi.mockSystem, functionName: "callbackAt", args: [callbacksDone] })) as {
      sender: Address; chainId: bigint; recipient: Address; gasLimit: bigint; payload: Hex;
    };
    // Inject the requesting reactive contract into the first argument (bytes 4..36 of the payload).
    const injected = (c.payload.slice(0, 10) + encodeAbiParameters([{ type: "address" }], [c.sender]).slice(2) + c.payload.slice(74)) as Hex;
    const hash = await asProxy.sendTransaction({ to: c.recipient, data: injected, gas: c.gasLimit + 100_000n, chain: chains.origin });
    const r = await pub.origin.waitForTransactionReceipt({ hash });
    console.log(`callback #${callbacksDone} → ${c.recipient} ${r.status} ${hash}`);
  }
}

async function main() {
  await test.lasna.impersonateAccount({ address: addr.system });
  await test.lasna.setBalance({ address: addr.system, value: 10n ** 21n });
  await test.origin.impersonateAccount({ address: addr.originCallbackProxy });
  await test.origin.setBalance({ address: addr.originCallbackProxy, value: 10n ** 21n });
  callbacksDone = (await pub.lasna.readContract({ address: addr.system, abi: abi.mockSystem, functionName: "callbackCount" })) as bigint;

  let fromOrigin = await pub.origin.getBlockNumber();
  let fromDest = await pub.dest.getBlockNumber();
  let lastCron = await pub.lasna.getBlockNumber();
  console.log("relay-local up (LOCAL emulation of Reactive Network)");

  for (;;) {
    const [toOrigin, toDest, lasnaHead] = await Promise.all([pub.origin.getBlockNumber(), pub.dest.getBlockNumber(), pub.lasna.getBlockNumber()]);
    const legs: Array<[Log[], number]> = [];
    if (toOrigin > fromOrigin) {
      legs.push([await pub.origin.getLogs({ address: addr.escrow, fromBlock: fromOrigin + 1n, toBlock: toOrigin }), chains.origin.id]);
      fromOrigin = toOrigin;
    }
    if (toDest > fromDest) {
      legs.push([await pub.dest.getLogs({ address: addr.destinationSettler, fromBlock: fromDest + 1n, toBlock: toDest }), chains.dest.id]);
      fromDest = toDest;
    }
    for (const [logs, chainId] of legs) {
      for (const log of logs) {
        if (!log.topics[0] || !(await isSubscribed(chainId, log.address, log.topics[0]))) continue;
        await react(record(log, chainId));
      }
    }
    if (lasnaHead / 10n > lastCron / 10n) {
      lastCron = lasnaHead;
      if (await isSubscribed(chains.lasna.id, addr.cronSource, CRON10_TOPIC)) {
        await react({
          chainId: BigInt(chains.lasna.id), contractAddress: addr.cronSource, topic0: BigInt(CRON10_TOPIC), topic1: 0n, topic2: 0n, topic3: 0n,
          data: encodeAbiParameters([{ type: "uint256" }], [lasnaHead]), blockNumber: lasnaHead, opCode: 2n, blockHash: 0n, txHash: 0n, logIndex: 0n,
        });
      }
    }
    await deliverCallbacks();
    await sleep(100);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
