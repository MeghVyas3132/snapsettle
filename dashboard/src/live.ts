// Live orders, on testnet: a visitor opens their own order from a browser wallet, or asks the demo service to
// open one; either way the clock and the circuit follow that real order through its four transactions.
import { createPublicClient, createWalletClient, custom, http, parseEventLogs, parseAbi, type Address, type Hex, type EIP1193Provider } from "viem";
import { baseSepolia } from "viem/chains";
import { store, link, short, fmtS, crossChain } from "./data";
import type { ClockScene } from "./scene";
import { state } from "./scene";

const ESCROW_ABI = parseAbi([
  "function open((address inputToken, uint256 inputAmount, address outputToken, uint256 outputAmount, address recipient, uint256 destinationChainId, address destinationSettler, uint32 fillDeadline) d) returns (bytes32)",
  "event Opened(bytes32 indexed orderId, address indexed user, (address inputToken, uint256 inputAmount, address outputToken, uint256 outputAmount, address recipient, uint256 destinationChainId, address destinationSettler, uint32 fillDeadline) order)",
]);
const ERC20_ABI = parseAbi(["function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)", "function approve(address,uint256) returns (bool)"]);
const FAUCETS = {
  usdc: "https://faucet.circle.com",
  eth: "https://docs.base.org/base-chain/tools/network-faucets",
};

type Deps = {
  scene: ClockScene | null;
  hms: (s: number, tenths?: boolean) => string;
  hold: (on: boolean) => void; // stops the idle LCD updates while a live order owns the clock
  open: (title: string, badge: "live" | "replay") => void; // shows the panel
  steps: (html: string) => void;
  note: (html: string) => void;
};

let deps: Deps;
let tracking: Hex | null = null;

export function initLive(d: Deps) {
  deps = d;
  // Anyone's order (the demo heartbeat, another judge) is followed live if nothing else is on the clock.
  store.onOpened((id) => {
    if (!tracking) void track(id, "An order just opened on Base Sepolia");
  });
}

const amount = () => (store.tiers[0] ? store.tiers[0].maxAmount / 2n || 1n : 250_000n);

// ------------------------------------------------------------ wallet

export async function openOwnOrder() {
  const eth = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
  deps.open("Your order, live on testnet", "live");
  const a = store.config.addresses;
  if (!eth) {
    deps.steps(`<li data-on="true"><span class="verify__t">—</span><span>No browser wallet found on this page. Install one that supports testnets, or use <b>Run one live order</b>.</span></li>`);
    return;
  }
  try {
    const wallet = createWalletClient({ chain: baseSepolia, transport: custom(eth) });
    deps.steps(`<li data-on="true"><span class="verify__t">1/4</span><span>Connect your wallet</span><span>…</span></li>`);
    const [account] = await wallet.requestAddresses();
    try {
      await wallet.switchChain({ id: baseSepolia.id });
    } catch {
      await wallet.addChain({ chain: baseSepolia });
      await wallet.switchChain({ id: baseSepolia.id });
    }
    const pub = createPublicClient({ chain: baseSepolia, transport: http(store.config.rpc.origin) });
    const need = amount();
    const [usdc, eth0] = await Promise.all([
      pub.readContract({ address: a.tokenOrigin!, abi: ERC20_ABI, functionName: "balanceOf", args: [account] }),
      pub.getBalance({ address: account }),
    ]);
    if (usdc < need || eth0 === 0n) {
      deps.steps(`<li data-on="true"><span class="verify__t">need</span><span>${usdc < need ? `${Number(need) / 1e6} test USDC on Base Sepolia (<a href="${FAUCETS.usdc}" target="_blank" rel="noopener">Circle faucet</a>)` : ""}${usdc < need && eth0 === 0n ? " and " : ""}${eth0 === 0n ? `a little Base Sepolia ETH for gas (<a href="${FAUCETS.eth}" target="_blank" rel="noopener">faucets</a>)` : ""}. Then press the button again.</span></li>`);
      return;
    }
    const allowance = await pub.readContract({ address: a.tokenOrigin!, abi: ERC20_ABI, functionName: "allowance", args: [account, a.escrow!] });
    if (allowance < need) {
      deps.steps(`<li data-on="true"><span class="verify__t">2/4</span><span>Approve ${Number(need) / 1e6} USDC to the escrow</span><span>…</span></li>`);
      const h = await wallet.writeContract({ account, address: a.tokenOrigin!, abi: ERC20_ABI, functionName: "approve", args: [a.escrow!, need], chain: baseSepolia });
      await pub.waitForTransactionReceipt({ hash: h });
    }
    deps.steps(`<li data-on="true"><span class="verify__t">3/4</span><span>Open the order: ${Number(need) / 1e6} USDC on Base Sepolia → ${(Number(need) * 0.999) / 1e6} USDC to you on Unichain Sepolia</span><span>…</span></li>`);
    const hash = await wallet.writeContract({
      account, address: a.escrow!, abi: ESCROW_ABI, functionName: "open", chain: baseSepolia,
      args: [{
        inputToken: a.tokenOrigin!, inputAmount: need, outputToken: a.tokenDest!, outputAmount: (need * 999n) / 1000n,
        recipient: account as Address, destinationChainId: BigInt(store.config.chains.dest), destinationSettler: a.destinationSettler!,
        fillDeadline: Math.floor(Date.now() / 1000) + 600,
      }],
    });
    const rcpt = await pub.waitForTransactionReceipt({ hash, pollingInterval: 250 });
    const ev = parseEventLogs({ abi: ESCROW_ABI, logs: rcpt.logs, eventName: "Opened" })[0];
    await track((ev.args as { orderId: Hex }).orderId, "Your order, live on testnet", true);
  } catch (e) {
    const msg = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "cancelled";
    deps.steps(`<li data-on="true"><span class="verify__t">stopped</span><span>${msg.split("\n")[0]}</span></li>`);
  }
}

// ------------------------------------------------------------ demo service

export async function runDemoOrder() {
  const api = store.config.demoApi;
  deps.open("A demo order, live on testnet", "live");
  if (!api) return deps.steps(`<li data-on="true"><span>The demo service is not running right now. Open your own order instead.</span></li>`);
  deps.steps(`<li data-on="true"><span class="verify__t">…</span><span>Asking the demo service to open a ${Number(amount()) / 1e6} USDC order on Base Sepolia</span></li>`);
  try {
    const r = await fetch(`${api}/order`, { method: "POST" });
    const j = (await r.json()) as { orderId?: Hex; error?: string; lastOrder?: { orderId: Hex } };
    if (j.orderId) return void track(j.orderId, "A demo order, live on testnet", true);
    if (j.lastOrder?.orderId) {
      deps.note(`${j.error}. Following the latest one.`);
      return void track(j.lastOrder.orderId, "The latest demo order, live on testnet", true);
    }
    deps.steps(`<li data-on="true"><span>${j.error ?? "The demo service did not answer."}</span></li>`);
  } catch {
    deps.steps(`<li data-on="true"><span>The demo service did not answer. Open your own order instead.</span></li>`);
  }
}

// ------------------------------------------------------------ tracking one real order

export async function track(id: Hex, title: string, force = false) {
  if (tracking && !force) return;
  tracking = id;
  deps.hold(true);
  deps.open(title, "live");
  store.setFast(true);
  state.rocker = -1;
  const t0 = performance.now();
  const lit = [false, false, false, false];
  let raf = 0;
  const tickLcd = () => {
    if (tracking !== id) return;
    deps.scene?.lcdRight.set(deps.hms((performance.now() - t0) / 1000, true), { caption: `LIVE · ${id.slice(2, 6).toUpperCase()}`, live: true });
    raf = requestAnimationFrame(tickLcd);
  };
  tickLcd();
  const render = () => {
    const r = store.chainRows.get(id.toLowerCase());
    const t = r?.t ?? {};
    const at = (v?: number) => (v === undefined ? "" : `+${fmtS(v)}`);
    const rows: Array<[string, "origin" | "dest" | "lasna", Hex | undefined, string]> = [
      ["Opened on Base Sepolia", "origin", r?.tx.open, r?.tx.open ? "+0 s" : ""],
      ["Filled on Unichain Sepolia", "dest", r?.tx.fill, at(t.fill)],
      ["Seen and checked on Lasna", "lasna", r?.tx.react, at(t.seen)],
      ["Solver repaid on Base Sepolia", "origin", r?.tx.settle, at(t.repaid)],
    ];
    deps.steps(rows.map(([name, c, h, when]) => `<li data-on="${Boolean(h)}"><span class="verify__t">${h ? when : "…"}</span><span>${name}</span>${h ? link(c, "tx", h) : `<span class="wait">waiting</span>`}</li>`).join(""));
    rows.forEach(([, , h], i) => {
      if (h && !lit[i]) {
        lit[i] = true;
        if (i >= 1) deps.scene?.legPulse(i - 1);
      }
    });
    return r;
  };
  const deadline = Date.now() + 120_000;
  await new Promise<void>((resolve) => {
    const iv = setInterval(() => {
      const r = render();
      if (r?.tx.settle || r?.state === "refunded" || Date.now() > deadline || tracking !== id) {
        clearInterval(iv);
        resolve();
      }
    }, 250);
  });
  cancelAnimationFrame(raf);
  const r = store.chainRows.get(id.toLowerCase());
  state.rocker = 1;
  if (r?.tx.settle && r.t.fill !== undefined && r.t.repaid !== undefined) {
    const f2r = Math.max(0, r.t.repaid - r.t.fill);
    deps.scene?.lcdRight.set(deps.hms(f2r), { caption: "LIVE · REPAID", live: true });
    deps.note(`Order ${short(id)}: fill → solver repaid ${crossChain(f2r)} on the chains' own block clocks (1 s resolution); open → repaid ${fmtS(r.t.repaid)}. Live on testnet, not a replay.`);
  } else if (!r?.tx.settle) {
    deps.note(`Order ${short(id)} has not settled within two minutes. If no solver filled it, the owner can request a refund after its deadline.`);
  }
  store.setFast(false);
  setTimeout(() => {
    if (tracking === id) {
      tracking = null;
      deps.hold(false);
    }
  }, 6000);
}
