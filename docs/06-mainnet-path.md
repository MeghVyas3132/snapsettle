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

Plus one callback on the origin chain, paid from the escrow's callback balance, and, for delayed orders, one `confirm` transaction on the destination paid by the solver. On Lasna a reactive transaction cost about 0.0125 lREACT (measured from the contract's balance). The mainnet price in REACT, and REACT's price, are not known to us, so the dollar cost per settlement is open.

## Not known yet

- Whether Reactive's mainnet supports this architecture (Omni, `requestCallbackV_1_0`) with Base and Unichain as origin and destination. Reactive's blog announced its mainnet migration as complete (Oct 2026); support for these two chains in that setting is to be confirmed with the Reactive team.
- A solver market: on testnet the only solver is ours.
- An audit.

## Hardening before real funds

- Bonded fast settlement as a fallback to trusting Reactive ([07-bonded-settlement.md](07-bonded-settlement.md)).
- Monitoring of the reactive contract's lREACT/REACT balance and the escrow's callback balance; settlement stalls silently if either runs out (`coverDebt()` exists on both).
- Done in v3: one fixed token pair and a minimum order size in `OriginEscrow.open()`, so spam in other tokens or dust reverts before an event exists. Mainnet needs one escrow per route (or a fixed list per escrow), sized minimum and cap.
- The global outflow cap stays global on purpose (see SECURITY.md); size it to normal hourly flow so filling it costs real capital.
- Solver-side term checks stay mandatory whatever the escrow does: the reference solver refuses orders outside its token pair, above its inventory, or paying out more than they repay (`offchain/src/solver.ts`, tested live by `pnpm policycheck`).
