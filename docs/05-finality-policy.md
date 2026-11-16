# 05 · Finality policy: "true enough to act on", per order

Reactive's post *Intents, Solvers, and Borrowed Certainty* (3 Sep 2026) ends with a question:

> *"if everyone building across chains eventually needs a name for 'true enough to act on', should that be a per-protocol choice, or the next thing somebody tries to standardize?"*
> (https://blog.reactive.network/intents-solvers-and-borrowed-certainty/)

Snapsettle's answer, in working code: **make it a per-order property, written into the order the solver reads, and re-check the destination before paying anything that waited.** It is one answer, not a proof that per-order is right; the post itself says neither approach is obviously right.

## The trade, stated plainly

- Reactive treats an event it observed on another chain as canonical, even if that chain later reorganises it away (the post calls this **origin finality**). That is what lets a reactive contract act in seconds.
- Acting in seconds on a fill that later disappears would pay a solver for a delivery the user never got. Waiting removes that risk and costs the solver capital time.
- Neither extreme is right for every order. A 0.50 USDC order and a 50,000 USDC order should not share one answer.

## What Snapsettle does

1. **The policy lives in two contracts that must agree.** `SnapsettleReactive` (Lasna) and `DestinationSettler` (Unichain) hold the same tiers `(maxAmount, delay)`. A delay of `0` settles in the same reactive transaction that sees the fill. A positive delay parks the order as `Queued`; once `fillTime + delay` has passed, anyone (in practice the solver) calls `DestinationSettler.confirm(orderId, order)`. It succeeds only if the fill is still recorded in Unichain's state, emits `Confirmed`, and the reactive contract settles from that event. So the wait is followed by a re-read of the destination, not just a timer. There is no cron.
1b. **A fill that vanished cannot be paid, and cannot strand the user.** If a reorg removed the fill during the wait, `confirm` reverts (`NotFilled`). If a different solver fills again, the fill that is confirmed is paid. If nothing is confirmed within a day of the order being ready, the user's refund request is honoured (`CONFIRM_WINDOW`). All three are tested (`test_reorgedFill_cannotBeConfirmed_andBecomesRefundable`, `test_refillAfterReorg_paysTheConfirmedFill`).
2. **The policy is written into the order the solver reads.** `SnapsettleResolver` (ERC-7683, resolver-centric Draft) returns the payment with `estimatedDelaySeconds = tier delay + loop latency`. The ERC defines that field as the delay the payment "SHOULD" have "with high confidence" (https://eips.ethereum.org/EIPS/eip-7683).
3. **The trust is named, not implied.** ERC-7683 asks resolvers to surface conditions they cannot check on-chain as named assumptions. The resolver returns two:
   - `reactive-settlement`: `(Lasna chain id, reactive contract)`. The escrow only releases on that contract's callback.
   - `reactive-origin-finality`: the order's delay. Reactive acts on observed events, and this order waits this long first.
   The bundled solver refuses any order whose assumptions are not on its whitelist (`offchain/src/solver.ts`).

## Testnet tiers (deploy defaults)

| Order size (USDC) | Delay after the fill is observed | Why |
|---|---|---|
| ≤ 0.5 | 0 s | Loss on a vanished fill is tiny; speed is the product |
| ≤ 2 | 30 s | Several destination blocks of margin |
| > 2 | 300 s + confirm | The cautious end: about 6–24× shorter than Across's 30 min challenge period plus bundle wait |

These thresholds are sized for faucet-funded testnet USDC (see DECISIONS.md). On mainnet they would be set per asset and per destination chain from that chain's observed reorg depth. The mechanism is the contribution; the numbers are a parameter.

## What is measured

The bench reports, per tier, `fill → solver repaid` against the tier's policy delay; the overshoot is the confirm transaction plus Reactive's observation and callback. Results, with four clocks and their biases, are in `JUDGE.md` §3.

## Limits, said first

- The on-sight tier still pays on what Reactive observed. Its protection is the size cap and the escrow's hourly outflow cap. Delayed tiers re-check the destination, so a reorg during the wait is caught; a reorg after `confirm` is not.
- The tiers are configured at deployment. A production version would let governance or the order itself choose within bounds.
- Delayed orders need the solver (or anyone) to send `confirm`. If no one does within a day of the order being ready, the user can be refunded, and a solver who filled loses its repayment. The resolver lists `confirm` as the order's second step so a generic solver runs it.
