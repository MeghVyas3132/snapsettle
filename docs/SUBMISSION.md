# DoraHacks submission draft (fill «…» from evidence/live before submitting)

**Name:** Snapsettle

**One-liner (vision):** Cross-chain intents settled by Reactive: the solver is repaid «p50» after its fill on Unichain, not after a 2-hour challenge window.

**Track:** Every Second Counts

**Repository:** https://github.com/MeghVyas3132/snapsettle

**Demo video:** «link» (2:«ss», captions burned in)

**Dashboard:** https://meghvyas3132.github.io/snapsettle/

## Description

A solver that fills a cross-chain order fronts its own capital and is repaid afterwards. The origin chain cannot see the destination fill, so protocols either trust an attester or wait out an optimistic window: Across repays relayers after a challenge period of 2 hours by default (docs.across.to).

Snapsettle lets Reactive be the check:
- A user opens an order on **Base Sepolia**, and `OriginEscrow` escrows the USDC.
- A solver fills it on **Unichain Sepolia** from its own inventory, and `DestinationSettler` emits `Filled` with the order's terms hash.
- `SnapsettleReactive` on **Lasna** has seen both events. It compares the terms hash with the order, checks the deadline, applies the order's finality tier, and requests the callback that releases the escrow to the solver.

Measured over «N» live loops: fill → solver repaid p50 «x» s / p95 «y» s for orders settled on sight.

**Finality tiers.** These answer the question that ends Reactive's own post *Intents, Solvers, and Borrowed Certainty*. Reactive acts on what it observes even if a chain later reorganises, so each order carries an explicit policy: ≤ 1 USDC settles on sight, ≤ 10 USDC after 30 s, larger orders after 300 s. Solvers read it as `estimatedDelaySeconds` from our **ERC-7683 resolver** (resolver-centric Draft), next to the named assumptions `reactive-settlement` and `reactive-origin-finality`. Our solver bot is generic: it fills orders using only what the resolver returns.

**Refusals, on-chain:** a wrong-terms fill is not settled (the genuine fill still is), a late fill reverts, an unfilled order is refunded after its deadline, and a refund request after a valid fill is ignored.

## Required fields

**Deployed contract addresses, and which network:** Reactive **Lasna** testnet.
- SnapsettleReactive (Lasna 5318007): «addr»
- OriginEscrow (Base Sepolia 84532): «addr»
- SnapsettleResolver (Base Sepolia 84532): «addr»
- DestinationSettler (Unichain Sepolia 1301): «addr»

**Transaction hashes showing the full loop, from origin event to callback:** (one per tier, all in JUDGE.md)
- Open (Base Sepolia): «tx»
- Fill (Unichain Sepolia): «tx»
- Reactive transaction (Lasna): «tx»
- Settle callback (Base Sepolia): «tx»

**For Every Second Counts: what full-loop latency did you measure, and how?**
- Tier "on sight", «N» loops: fill → solver repaid p50 «x» s, p95 «y» s; open → repaid p50 «a» s, p95 «b» s.
- Per segment (open → fill, fill → seen on Lasna, settle request → repaid): see JUDGE.md.
- Measured by `offchain/src/bench.ts`. Each loop records block numbers and block timestamps on all three chains, plus the wall-clock time a single observer first saw each event while polling public RPCs every ~150 ms (so wall clock is an upper bound).
- Every tx hash is in `evidence/live/`.

**Was this your first time building with Reactive? Your first smart contract?** First time with Reactive; not my first smart contract.

**What was the hardest part of building with Reactive?**
- **Legacy material:** the official demos still use the legacy RVM API, and `reactive-test-lib` only mocks the legacy system contract. I wrote a small Omni mock (subscriptions + `requestCallbackV_1_0`) to test end to end in Foundry.
- **Gas cap:** sizing `react()` under the 900k reactive-transaction cap. Draining a delayed-settlement queue on Cron10 had to be capped at 3 settlements per tick.
- **Silent stops:** designing callbacks so a state mismatch emits an event instead of reverting, because a reverted callback is still billed and a contract in debt stops without an error.

**How did you hear about the buildathon?** DoraHacks.
