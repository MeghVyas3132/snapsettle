# Security and limits

Snapsettle is a buildathon entry running on **testnets only**. It is **not audited**. Do not use it with real funds.

## Trust model

| Party | Trusted for | If it misbehaves |
|---|---|---|
| Reactive Network (Lasna validators, system contract, callback proxy) | Delivering real origin/destination logs to `react()`, and delivering callbacks with the requesting contract injected as the first argument | It could release escrow on a fill that never happened, or never release it. This is the `reactive-settlement` assumption the resolver surfaces to solvers. The escrow's outflow cap bounds the damage to `outflowCap` per `outflowWindow` (500 USDC per hour on testnet); the rest is deferred, not lost |
| `SnapsettleReactive` code | Matching fills to orders by terms hash, enforcing deadlines and tiers | Covered by tests (below) |
| Solver | Nothing. It fronts its own capital and is paid only for a fill whose terms match the order | It can only lose its own funds |
| User | Nothing beyond opening their own order | It can only refund its own order, after the deadline plus grace, and only if no valid fill was observed |

## Properties enforced in code (and where they are tested)

- The escrow pays out **exactly once**: the full input to the solver or back to the user, never both (`testFuzz_escrowPaysExactlyOnce`, 512 runs).
- Settle/refund callbacks are accepted only from the callback proxy **and** with this reactive contract as the injected sender (`test_callbacks_requireProxyAndReactiveSender`).
- `react()` accepts only the system contract (`test_react_onlySystem`) and ignores logs from any other emitter (`test_foreignLogs_areIgnored`).
- A fill with wrong terms never settles and cannot block the genuine fill (`test_fillWithWrongTerms_isRejected_andCannotBlockGenuineFill`, `test_wrongTermsParkedFirst_doesNotBlockGenuineParkedFill`).
- Late fills revert on the destination; double fills revert; duplicate deliveries settle once.
- A refund request after a valid, observed fill is ignored; the solver is still paid (`test_refundRequest_ignoredWhenFillWasSeen`).
- Every `react()` path stays under 700k gas, well inside the 900k cap (`test_reactGas_underCap`; the confirm → settle path measures ~254k).
- A delayed order settles only from `Confirmed`, which requires the fill to still be in the destination's state after the delay; a reorged fill cannot be confirmed and becomes refundable after `CONFIRM_WINDOW` (`test_reorgedFill_cannotBeConfirmed_andBecomesRefundable`); a re-fill by another solver is the one paid (`test_refillAfterReorg_paysTheConfirmedFill`); `confirm` works once per fill and not before the delay (`test_confirm_onlyOnce_andNotForOnSightOrders`, `test_mediumOrder_settlesOnlyAfterConfirm`).
- The escrow releases at most `outflowCap` per window; a settlement over it is deferred and released later by anyone; orders larger than the cap cannot be opened (`test_outflowCap_defersThenReleases`, `test_open_rejectsOrderAboveCap`).

The same failure cases were also run as on-chain transactions; see the dashboard's "Refusals" section and `evidence/`.

## Known limits

- **Reorgs.** On-sight orders pay on what Reactive observed: a fill reorganised away afterwards stays paid. Delayed orders re-check the destination with `confirm`, so a reorg during the wait is caught, but not one after `confirm`. Exposure is bounded by tier size and the hourly outflow cap (`docs/05-finality-policy.md`).
- **Confirm is an action.** Delayed orders need someone (the solver) to send `confirm` within a day of being ready; otherwise the user can be refunded.
- **Liveness.** If the reactive contract runs out of lREACT, or the escrow runs out of callback ETH, settlement stalls silently. Each order costs about 0.045 lREACT; `pnpm topup status` shows the balance and the orders it covers (on 2026-11-16 the contract fell to 0.36 lREACT after the v3 bench before we caught it, and was refilled). Both expose a public `coverDebt()`; the owner can `retry(id)` a callback that never landed (the escrow ignores duplicates).
- **Refund grace.** Refunds open at `fillDeadline + 60 s`. The grace must stay above the worst fill-to-observation lag; it is a deployment parameter.
- **Owner powers.** The reactive contract's owner can only wire the escrow once and re-send callbacks. It cannot move escrowed funds, change terms, or change tiers after deployment.
- **Single destination.** The escrow accepts orders for one destination chain and settler. More routes mean more deployments.
- **Testnet solver.** The only solver is our own bot running a generic ERC-7683 fill. There is no solver market on testnet.
- **Solvers must vet terms.** The escrow accepts any terms a user names, as an intent should: any input token, any output amount. A solver that fills blindly can be drained by an order like "1 worthless token in, 16 USDC out". Our solver refuses orders that are not our USDC pair, pay out more than they repay, exceed its inventory, or are within 10 s of their deadline; refusals go to `evidence/live/solver/skips.jsonl`, and `pnpm policycheck` tests this live (`evidence/live/policy-check.json`).
- **Origin reorgs are the solver's risk.** If Base Sepolia drops the block with `Opened` after the solver has filled, there is no escrow to repay from. Our solver fills within a few Base blocks, so it accepts that risk, as solvers in other intent systems do when they fill before origin finality.
- **Late observation.** If Reactive observed a fill more than the 60 s refund grace after the deadline, a refund requested in between would win and the solver would not be repaid. Observed fill → Lasna lag in the bench is seconds (`JUDGE.md` §3), well inside the grace.
- **Spam costs the operator.** Every `Opened` on the escrow costs the reactive contract a reactive transaction, and every refund one more plus a callback. Since v3, `open()` accepts only the one token pair (Circle test USDC in, Circle test USDC out) and orders of at least 0.1 USDC, so spam in worthless tokens or dust reverts before an event exists and costs the reactive contract nothing. Spam in real USDC above the minimum is still possible: it costs the spammer gas and locks their USDC until the refund, and costs us reactive transactions. Monitoring the reactive contract's balance remains necessary.
- **The outflow cap is shared, deliberately.** Anyone can open a USDC order, fill it themselves and be repaid, using up the hour's cap at the cost of gas and capital tied up for the window; other solvers' repayments are then deferred until the window has room (delayed, not lost). We keep one global cap anyway: its job is to bound what a faulty or compromised Reactive could release in total. A per-solver cap would let such an attacker invent solvers and lift the bound; a cap on small orders only would leave the large orders, where the value is, unbounded. On mainnet the cap is sized to normal flow, so filling it takes real capital.
- **Standard tokens only.** The escrow assumes a transfer moves exactly the amount asked. A fee-on-transfer or rebasing token would short other orders in that same token. The fixed token pair (v3) rules this out.
- **Gasless orders (v4).** `openFor` moves the user's USDC only through the user's own EIP-3009 signature, which the token checks. The signed nonce is `gaslessNonce(order)`, derived from the escrow, the chain and every term, so a submitter cannot change the amount, the recipient, the deadline or who owns the order (`test/Gasless.t.sol`; on-chain refusal case "a relayer cannot change a signed gasless order"). The token enforces single use and the validity window. What a submitter can do is hold a signature and submit it late, inside its window; the site signs for 10 minutes, and a user can cancel an unsubmitted authorization with USDC's `cancelAuthorization`. The demo relay checks terms before spending gas (our token pair, output not above input, at most 5 USDC, deadline 1 to 60 minutes away), simulates first, and never holds a visitor's funds.
- **Three copies of the tier table.** `DestinationSettler`, `SnapsettleReactive` and `SnapsettleResolver` each hold the tiers, set from one function in `Deploy.s.sol`. If the destination's delay were shorter than the reactive contract's, a confirm would be rejected on Lasna and the order could only be refunded. On the live deployment all three return the same delays at every boundary (0 · 30 · 300 s at 0.5 / 2 USDC).

## Reporting

Open an issue on the repository.
