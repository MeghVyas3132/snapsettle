# DoraHacks submission draft

Numbers are from the current (v3) contracts, `evidence/live/`, as regenerated in `JUDGE.md`. «…» marks what is still open.

**Name:** Snapsettle

**One-liner:** ERC-7683 intent settlement verified by Reactive: the solver is repaid about 2 seconds after its fill on small orders, and larger orders choose how much reorg safety they buy.

**Track:** Every Second Counts

**Repository:** https://github.com/MeghVyas3132/snapsettle (judge path at the top of the README, all evidence in `JUDGE.md`)

**Live site:** https://meghvyas3132.github.io/snapsettle/ (open your own order from a wallet, or replay a recorded one)

**Demo video:** «link» («m:ss», captions burned in)

## Description

In an intent bridge the solver pays the user on the destination chain from its own inventory and is repaid later from the user's escrow on the origin chain. The origin chain cannot see the fill, so every protocol needs some way to learn about it, and that way decides how long the solver's capital is tied up. Across repays relayers in bundles, each with a challenge period that is 30 minutes on the live HubPool (`cast call 0xc186fA914353c44b2E33eBE05f21846F1048bEda "liveness()(uint32)"` returns 1800; older docs say 2 hours). That window is what makes fraud disputable, so anything faster has to trust something else.

Snapsettle makes Reactive that something else, and says so:
- A user opens an order on **Base Sepolia**; `OriginEscrow` holds the USDC.
- A solver fills it on **Unichain Sepolia** from its own inventory; `DestinationSettler` emits `Filled` with the order's terms hash.
- `SnapsettleReactive` on **Lasna** has seen both events, a pairing no contract on either chain can see. It checks the terms hash and the deadline, applies the order's finality tier, and calls back to release the escrow to the solver.

**Finality per order.** Reactive acts on what it observed even if that chain later reorganises. So orders ≤ 0.5 USDC settle on sight, and larger ones wait 30 s or 300 s and settle only after `DestinationSettler.confirm()` shows the fill is still in Unichain's state (the solver sends that one transaction; no cron). A fill removed by a reorg can't be confirmed, nobody is paid for it, and the user can be refunded. `OriginEscrow` also caps what the Reactive path can release at 500 USDC per hour (testnet setting). `open()` accepts only the one USDC route and orders of at least 0.1 USDC, so spam in other tokens or dust reverts before it costs the reactive contract anything. The tier is published per order through our **ERC-7683 resolver** (resolver-centric draft) as `estimatedDelaySeconds`, plus two named assumptions, `reactive-settlement` and `reactive-origin-finality`. Our solver is generic: it fills and confirms using only what the resolver returns.

This is our answer to the question Reactive's own post *Intents, Solvers, and Borrowed Certainty* ends on: "should that be a per-protocol choice, or the next thing somebody tries to standardize?" Our answer: per order, published through the standard's own fields.

**What is new, narrowly:** an ERC-7683 settlement where no application actor has to submit anything for small orders, and where the repayment delay is set per order by value. Existing resolvers publish a constant (the Open Intents Framework's `AcrossResolver` publishes 2 hours). We found no other Reactive-based intent settlement.

**Refusals, on-chain:** a wrong-terms fill is not settled (the genuine fill still is), a late fill reverts, a confirm before the delay reverts, an unfilled order is refunded after its deadline, a refund request after a valid fill is ignored, and orders in another token or below 0.1 USDC revert at open. Our solver also refuses orders that would pay out more than they repay (tested live with a hostile order).

## Required fields

**Deployed contract addresses, and which network:** Reactive **Lasna** testnet, with Base Sepolia and Unichain Sepolia. All four verified on Sourcify.
- SnapsettleReactive (Lasna 5318007): `0xA6F93A883e188bCE11C3c039586BC798D17c3267`
- OriginEscrow (Base Sepolia 84532): `0xA6F93A883e188bCE11C3c039586BC798D17c3267` (same deployer and nonce on a different chain, hence the same address)
- SnapsettleResolver (Base Sepolia 84532): `0xa63a6FB814CEa62E093dC65F53585e044931F4F3`
- DestinationSettler (Unichain Sepolia 1301): `0xD9f2d6c285eb24152A2007cAd959cFD2376A4822`

**Transaction hashes showing the full loop, from origin event to callback** (the median loop of the on-sight run; every loop is in `JUDGE.md` and `evidence/live/loops-current.csv`):
- Open (Base Sepolia): `0x32b0eddf5acc382fc7ab1e1bad4a5cbe7040adc344b4d740ca2413e72459e993`
- Fill (Unichain Sepolia): `0x7c5cdd21981e26d3496f271075ccfb9dbe6b2d12c2656c7ec4beecb0117eb502`
- Reactive transaction (Lasna): `0xf3c2f97587462409488834c3e3de7a10ad361cfc8621d0095257ee7814da9bdc`
- Settle callback (Base Sepolia): `0x05bacbf3a25712eaa6175ed744157eef068d984e6dca8b087f5b75bc98719955`

A 30 s order, with its confirm step:
- Open `0xca0881d18d3aa4f9d853ebac76b3cb4e9229bd1ba3b4497c91dc5dddb2b695d6` → Fill `0x45cb67b2265b25a8e32998d7620981cbd0cb12a1edc5008aa199bdf5700fef20` → Lasna FillAccepted `0xebbebc879f4725c9868b1410314be8409fa956b1f6555f151ca6ad345e5e80ac` → Confirm (Unichain) `0x09446731692920f03e3a39f210615b76127db2339c77a4f879f740a73516df51` → Lasna settle request `0x2d5d989cfa51c81b117bbd7745a8ab3f615ef866b88c24ef20331ffd82d8268e` → Settle `0xf16d4ab3dff98bfd477e0a22bc42b0e2e5ffa7f0190c50d080d7c9e7b85321fa`

**For Every Second Counts: what full-loop latency did you measure, and how?**

| Tier | Loops settled | Fill → solver repaid, p50 / p95 | Whole loop, open → repaid, p50 / p95 |
|---|---|---|---|
| On sight (≤ 0.5 USDC) | 52 of 52 | 1.8 s / 2.9 s | 6.6 s / 8.6 s |
| 30 s + confirm | 52 of 52 | 31.7 s / 33.5 s | 40.0 s / 42.0 s |
| 300 s + confirm | 52 of 52 | 5:02 / 5:04 | 5:09 / 5:12 |

- The whole loop is counted in Base Sepolia blocks between the open and the repayment (200 ms each), so it does not depend on any RPC's lag. Fill → repaid is that figure minus the solver's own open → fill time. Block timestamps (1 s resolution) give fill → repaid p50 1 s / p95 2 s on sight. On the delayed tiers the policy delay dominates; block timestamps put them at 34 s and 5:05. The previous deployment (v2) gave the same figures within a few hundred milliseconds; its runs, including a solver bug that stranded three orders (refunded), are in `JUDGE.md` §5–6. `JUDGE.md` §3 shows all four clocks with the bias of each.
- The whole loop includes our solver's reaction time (p50 about 4.8 s at three orders at a time); a faster solver shortens it, and Reactive's part does not change.
- Measured by `offchain/src/bench.ts`, which records block numbers and timestamps on all three chains plus the wall-clock time a single observer first saw each event. Everything that failed is listed in `JUDGE.md` §5.

**Was this your first time building with Reactive? Your first smart contract?** First time with Reactive; not my first smart contract.

**What was the hardest part of building with Reactive?**
- **Origin finality.** Reactive acts on events it observed even if the chain later reorganises. The first version re-checked nothing and drained delayed orders on Cron10, which only waited instead of re-reading anything. The current version settles delayed orders only from a `Confirmed` event that a Unichain transaction emits after reading the fill from state.
- **Legacy material:** the official demos still use the legacy RVM API, and `reactive-test-lib` only mocks the legacy system contract. I wrote a small Omni mock (subscriptions and `requestCallbackV_1_0`) to test end to end in Foundry.
- **Silent stops:** callbacks are written so a state mismatch emits an event instead of reverting, because a reverted callback is still billed and a contract in debt stops without an error. `react()` stays well under the 900k cap (confirm → settle measured at 254k gas).

**How did you hear about the buildathon?** DoraHacks.
