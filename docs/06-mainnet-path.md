# 06 · Mainnet path

What it would take to run Snapsettle with real funds, and what is not known yet.

## Same contracts, different parameters

The four contracts are chain-agnostic. A mainnet deployment changes parameters, not code:

| Parameter | Testnet | Mainnet (to be set from data) |
|---|---|---|
| Tier thresholds | 0.5 / 2 USDC | by value at risk per route, e.g. small orders on sight, larger ones after the destination's observed reorg depth |
| Tier delays | 0 / 30 / 300 s | from each destination chain's reorg and sequencer history |
| Outflow cap | 500 USDC per hour | sized to what the operator accepts losing if Reactive misbehaved for one window |
| Refund grace | 60 s | above the worst observed fill → observation lag |
| `LOOP_LATENCY` in the resolver | 5 s (measured whole-loop p95 ~4 s) | re-measured on mainnet |

Deployment is `scripts/deploy-live.sh` with those values in the environment.

## Cost per settlement, in reactive transactions

| Order type | Reactive transactions | What they are |
|---|---|---|
| On sight | 2 | `Opened` observed, `Filled` observed (settle requested in the same transaction) |
| Delayed | 3 | `Opened`, `Filled`, `Confirmed` (settle requested on `Confirmed`) |
| Unfilled, refunded | 2 | `Opened`, `RefundRequested` |

Plus one callback on the origin chain, paid from the escrow's callback balance, and, for delayed orders, one `confirm` transaction on the destination paid by the solver. On Lasna the v3 contract spent 7.64 lREACT on about 175 orders, roughly 460 reactive transactions: about 0.017 lREACT per reactive transaction and 0.045 per order across our tier mix (an estimate from the balance before and after; Lasna bills with a delay, so short windows mislead). The contract is topped up with `pnpm topup`. The mainnet price in REACT, and REACT's price, are not known to us, so the dollar cost per settlement is open.

## Mainnet support, checked

Reactive mainnet (chain 1597) supports this exact route, checked on 2026-11-17:

- Reactive's chain list ([origins and destinations](https://dev.reactive.network/origins-and-destinations)) has Base (8453) and Unichain (130) as mainnet origin and destination, with callback proxies `0xCc780DdE33f56f55dE778D42c930959374a4a068` (Base) and `0x754120EC7a6eF81E4c5c835AA603C63Da64693E6` (Unichain).
- Both proxies are deployed: 218 bytes of code each, the same size as the Base Sepolia proxy our escrow uses (`cast codesize <proxy> --rpc-url https://mainnet.base.org`, and `https://mainnet.unichain.org`).
- Reactive mainnet runs the same system contracts as Lasna, where all our evidence comes from: the code at `0x…fffFfF` and at `0x8888…8888` hashes identically on both (`cast code <addr> --rpc-url https://mainnet-rpc.rnk.dev/ | cast keccak`, and the same on Lasna).

So the contracts deploy to mainnet as they are, with mainnet addresses (callback proxies, USDC on both chains) and mainnet parameters (tiers, cap, minimum).

## Not known yet

- The cost in REACT per settlement on mainnet, and REACT's price.
- A solver market: on testnet the only solver is ours.
- An audit.

## Hardening before real funds

- Bonded fast settlement as a fallback to trusting Reactive ([07-bonded-settlement.md](07-bonded-settlement.md)).
- Monitoring of the reactive contract's lREACT/REACT balance and the escrow's callback balance; settlement stalls silently if either runs out (`coverDebt()` exists on both).
- Done in v3: one fixed token pair and a minimum order size in `OriginEscrow.open()`, so spam in other tokens or dust reverts before an event exists. Mainnet needs one escrow per route (or a fixed list per escrow), sized minimum and cap.
- The global outflow cap stays global on purpose (see SECURITY.md); size it to normal hourly flow so filling it costs real capital.
- Solver-side term checks stay mandatory whatever the escrow does: the reference solver refuses orders outside its token pair, above its inventory, or paying out more than they repay (`offchain/src/solver.ts`, tested live by `pnpm policycheck`).
