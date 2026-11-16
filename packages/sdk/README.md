# @snapsettle/sdk

Open, sign, relay and track [Snapsettle](https://github.com/MeghVyas3132/snapsettle) cross-chain orders from your app.

Snapsettle settles ERC-7683-style intents with Reactive Network. The user's USDC waits in an escrow on Base Sepolia, a solver pays the user on Unichain Sepolia, and a Reactive contract on Lasna, which sees both chains, repays the solver about two seconds later. **Testnet only.**

```bash
npm install @snapsettle/sdk viem
```

## One signature, no gas

The user signs one message: an EIP-3009 authorization for exactly this order. Anyone can submit it and pay the gas (your backend, or the Snapsettle demo relay). Whoever submits it cannot change a term, because the authorization's nonce is derived from the terms.

```ts
import { buildOrder, signGaslessOrder, relayOrder, trackOrder } from "@snapsettle/sdk";

const order = buildOrder({ amount: 250_000n, recipient: user }); // 0.25 USDC; minimum 0.1
const signed = await signGaslessOrder({ wallet, order });          // one wallet prompt, no transaction
const { orderId } = await relayOrder({ api: RELAY_URL, signed });  // or submitSignedOrder({ wallet: relayer, signed })

await trackOrder({
  orderId,
  onEvent: (e) => console.log(e.kind, e.tx), // opened → filled → accepted → repaid
});
```

## Classic (approve + open)

```ts
import { buildOrder, openOrder } from "@snapsettle/sdk";
const { orderId } = await openOrder({ wallet, order: buildOrder({ amount: 250_000n, recipient: user }) });
```

## Reference

| Function | What it does |
|---|---|
| `buildOrder({ amount, recipient, spreadBps?, deadlineSeconds? })` | An order on the testnet route (Base Sepolia USDC → Unichain Sepolia USDC). |
| `signGaslessOrder({ wallet, order })` | The user's single signature. |
| `submitSignedOrder({ wallet, signed })` / `relayOrder({ api, signed })` | Put the signed order on-chain, yourself or through a relay. |
| `openOrder({ wallet, order })` | Approve if needed, then `open`. |
| `trackOrder({ orderId, onEvent })` | Follows the order on all three chains until it is repaid or refunded. |
| `orderStatus(orderId)` | `open`, `settled`, `refunded` or `deferred`, from the escrow. |
| `settleDelay(amount)` | Seconds before the solver is repaid: 0 on sight, 30 or 300 for larger orders. |
| `gaslessNonce(order)`, `orderHash(order)` | Computed locally; identical to the contracts. |
| `fuel()` | The reactive contract's lREACT balance and the orders it covers. |
| `testnet` | Chains, addresses and ABIs, generated from the repository's deployments. |

## Trust

Small orders are repaid on what Reactive observed; larger ones wait and are re-checked on Unichain first. Every order publishes that choice. See the repository's [SECURITY.md](https://github.com/MeghVyas3132/snapsettle/blob/main/SECURITY.md) and [JUDGE.md](https://github.com/MeghVyas3132/snapsettle/blob/main/JUDGE.md) for the measurements and limits.

MIT
