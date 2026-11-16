// Live orders, on testnet: a visitor opens their own order from a browser wallet, or asks the demo service to
// open one; either way the clock and the circuit follow that real order through its four transactions.
import { createPublicClient, createWalletClient, custom, http, parseEventLogs, parseAbi, type Address, type Hex, type EIP1193Provider } from "viem";
import { baseSepolia } from "viem/chains";
import { store, link, short, fmtS, crossChain, esc } from "./data";
import type { ClockScene } from "./scene";
import { state } from "./scene";

const ORDER_T = "(address inputToken, uint256 inputAmount, address outputToken, uint256 outputAmount, address recipient, uint256 destinationChainId, address destinationSettler, uint32 fillDeadline)";
const ESCROW_ABI = parseAbi([
  `function gaslessNonce(${ORDER_T} d) view returns (bytes32)`,
  `function openFor(${ORDER_T} d, address user, uint256 validAfter, uint256 validBefore, bytes signature) returns (bytes32)`,
  "function open((address inputToken, uint256 inputAmount, address outputToken, uint256 outputAmount, address recipient, uint256 destinationChainId, address destinationSettler, uint32 fillDeadline) d) returns (bytes32)",
  "event Opened(bytes32 indexed orderId, address indexed user, (address inputToken, uint256 inputAmount, address outputToken, uint256 outputAmount, address recipient, uint256 destinationChainId, address destinationSettler, uint32 fillDeadline) order)",
]);
const ERC20_ABI = parseAbi(["function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)", "function approve(address,uint256) returns (bool)", "function name() view returns (string)", "function version() view returns (string)"]);
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

const li = (t: string, body: string) => `<li data-on="true"><span class="verify__t">${t}</span><span>${body}</span></li>`;
async function post<T>(path: string, body: unknown): Promise<T & { error?: string }> {
  const r = await fetch(`${store.config.demoApi}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return (await r.json()) as T & { error?: string };
}

/**
 * The visitor's own order, with as few steps as the setup allows:
 *  - Demo service reachable: one signature in the wallet, no gas, no approval. The service relays `openFor`
 *    (and can send 0.3 test USDC first). No Base Sepolia ETH needed.
 *  - Not reachable: the same signature, then the visitor submits `openFor` themselves (needs a little ETH).
 * The signature is EIP-3009 `ReceiveWithAuthorization` on USDC, with a nonce the escrow derives from the exact
 * order, so whoever submits it cannot change a single term.
 */
export async function openOwnOrder() {
  const eth = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
  deps.open("Your order, live on testnet", "live");
  const a = store.config.addresses;
  const relayer = Boolean(store.config.demoApi);
  if (!eth) {
    deps.steps(li("—", "No browser wallet found on this page. Install one that supports testnets (MetaMask, Rabby), or press <b>Replay a recorded loop</b> to step through a real one."));
    return;
  }
  const done: string[] = [];
  const show = (t: string, body: string) => deps.steps(done.join("") + li(t, body));
  try {
    const wallet = createWalletClient({ chain: baseSepolia, transport: custom(eth) });
    show("1/3", "Connect your wallet …");
    const [account] = await wallet.requestAddresses();
    try {
      await wallet.switchChain({ id: baseSepolia.id });
    } catch {
      await wallet.addChain({ chain: baseSepolia });
      await wallet.switchChain({ id: baseSepolia.id });
    }
    done.push(li("1/3", `Connected ${short(account)} on Base Sepolia`));
    const pub = createPublicClient({ chain: baseSepolia, transport: http(store.config.rpc.origin) });
    const need = amount();
    const [usdc, eth0] = await Promise.all([
      pub.readContract({ address: a.tokenOrigin!, abi: ERC20_ABI, functionName: "balanceOf", args: [account] }),
      pub.getBalance({ address: account }),
    ]);

    if (usdc < need) {
      if (!relayer) {
        show("need", `${Number(need) / 1e6} test USDC on Base Sepolia (<a href="${FAUCETS.usdc}" target="_blank" rel="noopener">Circle faucet</a>), then press the button again.`);
        return;
      }
      show("2/3", "Sending you 0.3 test USDC on Base Sepolia …");
      const d = await post<{ tx: Hex | null }>("/drip", { address: account });
      if (d.error) {
        show("need", `${esc(d.error)}. Get test USDC from the <a href="${FAUCETS.usdc}" target="_blank" rel="noopener">Circle faucet</a>, then press the button again.`);
        return;
      }
      done.push(li("2/3", `0.3 test USDC sent ${d.tx ? link("origin", "tx", d.tx) : ""}`));
    }
    if (!relayer && eth0 === 0n) {
      show("need", `A little Base Sepolia ETH for gas (<a href="${FAUCETS.eth}" target="_blank" rel="noopener">faucets</a>), then press the button again.`);
      return;
    }

    const order = {
      inputToken: a.tokenOrigin!, inputAmount: need, outputToken: a.tokenDest!, outputAmount: (need * 999n) / 1000n,
      recipient: account as Address, destinationChainId: BigInt(store.config.chains.dest), destinationSettler: a.destinationSettler!,
      fillDeadline: Math.floor(Date.now() / 1000) + 600,
    };
    const [nonce, name, version] = await Promise.all([
      pub.readContract({ address: a.escrow!, abi: ESCROW_ABI, functionName: "gaslessNonce", args: [order] }),
      pub.readContract({ address: a.tokenOrigin!, abi: ERC20_ABI, functionName: "name" }),
      pub.readContract({ address: a.tokenOrigin!, abi: ERC20_ABI, functionName: "version" }),
    ]);
    const validBefore = BigInt(Math.floor(Date.now() / 1000) + 600);
    show("sign", `Sign once: ${Number(need) / 1e6} USDC from you to the escrow for this order. ${relayer ? "No gas, no approval." : "No approval."} …`);
    const signature = await wallet.signTypedData({
      account,
      domain: { name, version, chainId: baseSepolia.id, verifyingContract: a.tokenOrigin! },
      types: { ReceiveWithAuthorization: [
        { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
      ] },
      primaryType: "ReceiveWithAuthorization",
      message: { from: account, to: a.escrow!, value: need, validAfter: 0n, validBefore, nonce },
    });
    done.push(li("sign", `Signed: ${Number(need) / 1e6} USDC on Base Sepolia → ${(Number(need) * 0.999) / 1e6} USDC to you on Unichain Sepolia`));

    let orderId: Hex;
    if (relayer) {
      show("3/3", "Relaying your signed order (the demo service pays the gas) …");
      const r = await post<{ orderId: Hex; openTx: Hex }>("/relay", {
        order: Object.fromEntries(Object.entries(order).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v])),
        user: account, validAfter: "0", validBefore: validBefore.toString(), signature,
      });
      if (r.error) throw new Error(r.error);
      orderId = r.orderId;
    } else {
      show("3/3", "Open the order (one transaction) …");
      const hash = await wallet.writeContract({ account, address: a.escrow!, abi: ESCROW_ABI, functionName: "openFor", chain: baseSepolia, args: [order, account, 0n, validBefore, signature] });
      const rcpt = await pub.waitForTransactionReceipt({ hash, pollingInterval: 250 });
      orderId = (parseEventLogs({ abi: ESCROW_ABI, logs: rcpt.logs, eventName: "Opened" })[0].args as { orderId: Hex }).orderId;
    }
    await track(orderId, "Your order, live on testnet", true);
  } catch (e) {
    const msg = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "cancelled";
    deps.steps(done.join("") + li("stopped", esc(msg.split("\n")[0])));
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
      // Lasna's and Unichain's block clocks differ by about ±1 s, so Lasna can read a moment before the fill it saw.
      ["Seen and checked on Lasna", "lasna", r?.tx.react, t.seen !== undefined && t.fill !== undefined && t.seen < t.fill ? `≈${at(t.fill)}` : at(t.seen)],
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
  let settledAt = 0;
  await new Promise<void>((resolve) => {
    const iv = setInterval(() => {
      const r = render();
      // Stop once the repayment has its time, not merely its link: the time is what the visitor came to see.
      if (r?.tx.settle && !settledAt) settledAt = Date.now();
      // Lasna's block time is one more lookup; give it up to 10 s after the repayment shows.
      const timed = r?.t.repaid !== undefined && r.t.fill !== undefined && (r.t.seen !== undefined || Date.now() - settledAt > 10_000);
      const done = Boolean(r?.tx.settle && timed);
      if (done || r?.state === "refunded" || Date.now() > deadline || tracking !== id) {
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
  } else if (r?.tx.settle) {
    deps.note(`Order ${short(id)}: solver repaid on Base Sepolia. Live on testnet, not a replay; the transaction links above carry the block times.`);
  } else {
    deps.note(`Order ${short(id)} has not settled within two minutes, so our solver is probably offline. Your USDC stays in the escrow: about 11 minutes after opening, call requestRefund(${id}) on the escrow from the same wallet and Reactive sends it back.`);
  }
  store.setFast(false);
  setTimeout(() => {
    if (tracking === id) {
      tracking = null;
      deps.hold(false);
    }
  }, 6000);
}
