# Security and limits

Snapsettle is a buildathon entry running on **testnets only**. It is **not audited**. Do not use it with real funds.

## Trust model

| Party | Trusted for | If it misbehaves |
|---|---|---|
| Reactive Network (Lasna validators, system contract, callback proxy) | Delivering real origin/destination logs to `react()`, and delivering callbacks with the requesting contract injected as the first argument | It could release escrow on a fill that never happened, or never release it. This is the `reactive-settlement` assumption the resolver surfaces to solvers |
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
- Every `react()` path stays under 700k gas, well inside the 900k cap (`test_reactGas_underCap`).

The same failure cases were also run as on-chain transactions; see the dashboard's "Refusals" section and `evidence/`.

## Known limits

- **Reorgs after settlement.** If a destination fill is reorganised away after the escrow was released, the solver keeps payment for a vanished fill. Finality tiers bound the exposure by order size; they do not remove it (`docs/05-finality-policy.md`).
- **Liveness.** If the reactive contract runs out of lREACT, or the escrow runs out of callback ETH, settlement stalls silently. Both expose a public `coverDebt()`; the owner can `retry(id)` a callback that never landed (the escrow ignores duplicates).
- **Refund grace.** Refunds open at `fillDeadline + 60 s`. The grace must stay above the worst fill-to-observation lag; it is a deployment parameter.
- **Owner powers.** The reactive contract's owner can only wire the escrow once and re-send callbacks. It cannot move escrowed funds, change terms, or change tiers after deployment.
- **Single destination.** The escrow accepts orders for one destination chain and settler. More routes mean more deployments.
- **Testnet solver.** The only solver is our own bot running a generic ERC-7683 fill. There is no solver market on testnet.

## Reporting

Open an issue on the repository.
