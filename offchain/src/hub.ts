// One poller per chain that records, for every order id, when each lifecycle event was first seen:
// block number, block timestamp, tx hash and the local wall-clock time it was first observed.
// Shared by the bench and the negative-case runner so public RPCs are not hammered per order.
import { type Abi, type Address, type Hex, type PublicClient } from "viem";
import { pub, addr, abi, sleep, now } from "./common.ts";

export type Sighting = { block: bigint; blockTs: bigint; tx: Hex; seenAtMs: number; args: Record<string, unknown> };
type Key = string; // `${event}:${orderId}`

class ChainWatcher {
  private from = 0n;
  private tsCache = new Map<bigint, bigint>();
  constructor(
    private client: PublicClient,
    private address: Address,
    private abi: Abi,
    private events: string[],
    private sink: Map<Key, Sighting>,
  ) {}

  async start() {
    this.from = await this.client.getBlockNumber();
  }

  private async ts(block: bigint): Promise<bigint> {
    let t = this.tsCache.get(block);
    if (t === undefined) {
      t = (await this.client.getBlock({ blockNumber: block })).timestamp;
      this.tsCache.set(block, t);
    }
    return t;
  }

  async poll() {
    const head = await this.client.getBlockNumber();
    if (head <= this.from) return;
    const to = head - this.from > 500n ? this.from + 500n : head; // stay under getLogs range limits
    const seen = now();
    for (const eventName of this.events) {
      const logs = await this.client.getContractEvents({ address: this.address, abi: this.abi, eventName, fromBlock: this.from + 1n, toBlock: to });
      for (const l of logs) {
        const args = l.args as Record<string, unknown>;
        const id = (args.orderId as Hex | undefined)?.toLowerCase();
        if (!id) continue;
        const key = `${eventName}:${id}`;
        if (this.sink.has(key)) continue;
        this.sink.set(key, { block: l.blockNumber!, blockTs: await this.ts(l.blockNumber!), tx: l.transactionHash!, seenAtMs: seen, args });
      }
    }
    this.from = to;
  }
}

export class EventHub {
  readonly seen = new Map<Key, Sighting>();
  private watchers: ChainWatcher[];
  private running = false;

  constructor() {
    this.watchers = [
      new ChainWatcher(pub.origin, addr.escrow, abi.escrow, ["Opened", "Settled", "Refunded", "RefundRequested", "CallbackSkipped"], this.seen),
      new ChainWatcher(pub.dest, addr.destinationSettler, abi.dest, ["Filled"], this.seen),
      new ChainWatcher(pub.lasna, addr.reactive, abi.reactive, ["OrderObserved", "FillAccepted", "FillRejected", "SettlementRequested", "RefundCallbackRequested"], this.seen),
    ];
  }

  async start(intervalMs = 150) {
    await Promise.all(this.watchers.map((w) => w.start()));
    this.running = true;
    void (async () => {
      while (this.running) {
        await Promise.all(this.watchers.map((w) => w.poll().catch(() => undefined)));
        await sleep(intervalMs);
      }
    })();
  }

  stop() {
    this.running = false;
  }

  get(event: string, orderId: Hex): Sighting | undefined {
    return this.seen.get(`${event}:${orderId.toLowerCase()}`);
  }

  async waitFor(event: string, orderId: Hex, timeoutMs: number): Promise<Sighting | undefined> {
    const end = now() + timeoutMs;
    for (;;) {
      const s = this.get(event, orderId);
      if (s || now() > end) return s;
      await sleep(50);
    }
  }
}
