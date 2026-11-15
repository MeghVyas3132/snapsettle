# 05 · Finality policy: "true enough to act on", per order

Reactive's post *Intents, Solvers, and Borrowed Certainty* (3 Sep 2026) ends with a question:

> *"if everyone building across chains eventually needs a name for 'true enough to act on', should that be a per-protocol choice, or the next thing somebody tries to standardize?"*
> (https://blog.reactive.network/intents-solvers-and-borrowed-certainty/)

Snapsettle's answer, in working code: **make it a per-order property, written into the order the solver reads, and enforce it on Reactive.**

## The trade, stated plainly

- Reactive treats an event it observed on another chain as canonical, even if that chain later reorganises it away (the post calls this **origin finality**). That is what lets a reactive contract act in seconds.
- Acting in seconds on a fill that later disappears would pay a solver for a delivery the user never got. Waiting removes that risk and costs the solver capital time.
- Neither extreme is right for every order. A 0.50 USDC order and a 50,000 USDC order should not share one answer.

## What Snapsettle does

1. **The policy lives in the reactive contract.** `SnapsettleReactive` holds ordered tiers `(maxAmount, delay)`. When a matching fill is observed, `settleDelay(inputAmount)` picks the delay. `0` requests the settle callback in the same reactive transaction; a positive delay queues the order and settles it on the first Cron10 tick after `fill seen + delay` (`contracts/src/SnapsettleReactive.sol`).
2. **The policy is written into the order the solver reads.** `SnapsettleResolver` (ERC-7683, resolver-centric Draft) returns the payment with `estimatedDelaySeconds = tier delay + loop latency`. The ERC defines that field as the delay the payment "SHOULD" have "with high confidence" (https://eips.ethereum.org/EIPS/eip-7683).
3. **The trust is named, not implied.** ERC-7683 asks resolvers to surface conditions they cannot check on-chain as named assumptions. The resolver returns two:
   - `reactive-settlement`: `(Lasna chain id, reactive contract)`. The escrow only releases on that contract's callback.
   - `reactive-origin-finality`: the order's delay. Reactive acts on observed events, and this order waits this long first.
   The bundled solver refuses any order whose assumptions are not on its whitelist (`offchain/src/solver.ts`).

## Testnet tiers (deploy defaults)

| Order size (USDC) | Delay after the fill is observed | Why |
|---|---|---|
| ≤ 1 | 0 s | Loss on a vanished fill is tiny; speed is the product |
| ≤ 10 | 30 s | Several destination blocks of margin |
| > 10 | 300 s | The cautious end, still ~24× shorter than a 2 h optimistic window |

These thresholds are sized for faucet-funded testnet USDC (see DECISIONS.md). On mainnet they would be set per asset and per destination chain from that chain's observed reorg depth. The mechanism is the contribution; the numbers are a parameter.

## What is measured

The bench reports, per tier, `fill → solver repaid` against the tier's policy delay. The dashboard shows the overshoot ("+N s over policy"): the cost of Reactive's observation, the Cron10 tick granularity and callback delivery. Live results are in `evidence/live/` once the live runs complete.

## Limits, said first

- A tier bounds the exposure; it does not remove it. A destination reorg deeper than the tier's delay would still pay the solver for a vanished fill.
- The tiers are configured at deployment. A production version would let governance or the order itself choose within bounds.
- Delays drain on Cron10 (every 10 Lasna blocks), so a delayed order settles up to one tick (~10 s) after its due time.
