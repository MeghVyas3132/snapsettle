# 01 · Architecture

## The loop

```
Base Sepolia (origin)              Lasna (Reactive)                       Unichain Sepolia (destination)
─────────────────────              ────────────────                       ──────────────────────────────
user: OriginEscrow.open(d)
  escrow input, emit Opened ─────► SnapsettleReactive.react()
                                    store order (terms hash, amount,
                                    deadline, tier)
                                                                          solver: DestinationSettler.fill(id, d, repayTo)
                                                                            pay output to recipient, emit Filled
                                   react() ◄──────────────────────────────── Filled(orderId, solver, orderHash, repayTo, fillTime)
                                    check: hash == order terms,
                                           fillTime <= deadline
                                    tier 0: requestCallback(settle) now
                                    tier n: Queued until Confirmed
                                                                          anyone, after fillTime + delay: confirm(id, d)
                                   react() ◄──────────────────────────────── Confirmed (fill still in state)
                                    requestCallback(settle)
OriginEscrow.settle(rvm, id, repayTo) ◄── callback via proxy
  pay escrowed input to solver
```

Refund path: after `fillDeadline + refundGrace`, the user calls `requestRefund` → `RefundRequested` → if no valid fill was observed, `react()` requests a `refund` callback. A fill observed in time wins: the request is ignored and the solver is paid.

## Contracts

| Contract | Chain | Role |
|---|---|---|
| `OriginEscrow` | Base Sepolia | `open` escrows input and emits `Opened(id, user, OrderData)`; `requestRefund`; callbacks `settle`/`refund` (guarded by `onlyServiceProvider` + `onlyCallbackSender`); idempotent (duplicates emit `CallbackSkipped`) |
| `DestinationSettler` | Unichain Sepolia | `fill` pays output to the recipient, rejects late and duplicate fills, emits `Filled(id, solver, orderHash, repayTo, fillTime)`; `confirm` (delayed tiers) emits `Confirmed` once the delay has passed and the fill is still in state |
| `SnapsettleReactive` | Lasna | Subscribes to `Opened`, `RefundRequested`, `Filled`, `Confirmed`; matches; tiers; requests callbacks; no cron |

## Why the reactive contract does real work

The origin chain cannot see the destination chain. Without Reactive you need either an optimistic oracle (a challenge window of hours) or a trusted attester. Here the reactive contract observes both chains and **is** the check: it compares the fill's terms hash with the terms it saw in `Opened`, and only then releases the escrow.

## Finality policy (tiers)

`settleDelay(inputAmount)` picks the first tier whose `maxAmount` covers the order. Live testnet deployment:

| Order size (USDC) | Delay after fill is observed |
|---|---|
| ≤ 0.5 (testnet) | 0 s (settle on sight) |
| ≤ 2 (testnet) | 30 s, then confirm |
| above | 300 s, then confirm |

The delay is what a resolver surfaces to solvers as `estimatedDelaySeconds` (plus measured loop latency). Delayed orders settle from the destination's `Confirmed` event, which re-checks the fill after the delay; v1 drained a queue on Cron10 instead, which cost a reactive transaction per tick and re-checked nothing (see DECISIONS.md). `OriginEscrow` caps what the Reactive path can release per hour (`outflowCap`, `outflowWindow`); over the cap, a settlement is deferred and anyone can `releaseDeferred` it later.

## Safety properties (tested)

- Escrow pays out exactly once: all input to the solver or all input back to the user (fuzz `testFuzz_escrowPaysExactlyOnce`).
- A fill with wrong terms never settles, and cannot block the genuine fill: destination fills are keyed by (orderId, termsHash), and parked fills by the same key.
- A fill seen before its `Opened` (destination observed first) is parked and settled when the order appears.
- Late fills revert on the destination; double fills revert; duplicate `Filled` deliveries settle once.
- Callbacks are rejected unless they come from the proxy with this reactive contract as sender.
- `react()` only accepts the system contract; foreign logs fall through.
- Worst-case `react()` gas stays < 700k (`test_reactGas_underCap`).

## Failure modes and answers

| Failure | Effect | Answer |
|---|---|---|
| Escrow out of callback funds | settle callback not delivered | fund the escrow; `retry(id)` (owner) re-sends; the escrow ignores duplicates |
| Reactive contract in debt | stops reacting (silently) | float sized for bursts; public `coverDebt()`; top up before judging |
| Destination reorg after settle | solver paid for a vanished fill | finality tiers bound the exposure; documented, not hidden |
| Refund requested while a valid fill is in flight | race | `refundGrace` > worst observed fill-to-react latency; the destination rejects fills after the deadline |
