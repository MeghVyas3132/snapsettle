# DoraHacks submission draft

Numbers are from the current (v2) contracts, `evidence/live/`, as regenerated in `JUDGE.md`. «…» marks what is still open.

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

**Finality per order.** Reactive acts on what it observed even if that chain later reorganises. So orders ≤ 0.5 USDC settle on sight, and larger ones wait 30 s or 300 s and settle only after `DestinationSettler.confirm()` shows the fill is still in Unichain's state (the solver sends that one transaction; no cron). A fill removed by a reorg can't be confirmed, nobody is paid for it, and the user can be refunded. `OriginEscrow` also caps what the Reactive path can release at 500 USDC per hour (testnet setting). The tier is published per order through our **ERC-7683 resolver** (resolver-centric draft) as `estimatedDelaySeconds`, plus two named assumptions, `reactive-settlement` and `reactive-origin-finality`. Our solver is generic: it fills and confirms using only what the resolver returns.

This is our answer to the question Reactive's own post *Intents, Solvers, and Borrowed Certainty* ends on: "should that be a per-protocol choice, or the next thing somebody tries to standardize?" Our answer: per order, published through the standard's own fields.

**What is new, narrowly:** an ERC-7683 settlement where no application actor has to submit anything for small orders, and where the repayment delay is set per order by value. Existing resolvers publish a constant (the Open Intents Framework's `AcrossResolver` publishes 2 hours). We found no other Reactive-based intent settlement.

**Refusals, on-chain:** a wrong-terms fill is not settled (the genuine fill still is), a late fill reverts, a confirm before the delay reverts, an unfilled order is refunded after its deadline, and a refund request after a valid fill is ignored.

## Required fields

**Deployed contract addresses, and which network:** Reactive **Lasna** testnet, with Base Sepolia and Unichain Sepolia. All four verified on Sourcify.
- SnapsettleReactive (Lasna 5318007): `0xD9f2d6c285eb24152A2007cAd959cFD2376A4822`
- OriginEscrow (Base Sepolia 84532): `0xD9f2d6c285eb24152A2007cAd959cFD2376A4822` (same deployer and nonce on a different chain, hence the same address)
- SnapsettleResolver (Base Sepolia 84532): `0x6b3C3eA7b826467D2A666563cA3B4Fe25f940C19`
- DestinationSettler (Unichain Sepolia 1301): `0x5304Bf2BFCE10b32a961cfC9Ef7A52F9a4d74EA6`

**Transaction hashes showing the full loop, from origin event to callback** (the median loop of the on-sight run; every loop is in `JUDGE.md` and `evidence/live/loops-current.csv`):
- Open (Base Sepolia): `0x3cdd4629fb0eda40b21ceac25ee9b668920bb34e487370e70e63c0b52c411cf6`
- Fill (Unichain Sepolia): `0x043af5e17b500f2f70a4dfc16b19d7d18d80fd1cd0ccd8411c5149523629c796`
- Reactive transaction (Lasna): `0x4fbade7989fcc30fede5d6d8720a2eb3e98477779a6341034ba7485526647439`
- Settle callback (Base Sepolia): `0x2df4cfaf48dfc902ba4073166ade8aebe3014f6d7568fc70846c8db748f160ed`

A 30 s order, with its confirm step:
- Open `0xa680e09ba550f67f5270000b24a7046bf7c53ddce578047801f641d79c89dea0` → Fill `0x2aa5d17e9121191e43f7b64cbf94edceea0da8b5af33ea7bd00a4698f77ebc8c` → Lasna FillAccepted `0x568d7c184b1beba1197912833ec1797778334498b8a149165a8333f093222e49` → Confirm (Unichain) `0x4c1cb2e8336418d7ee8cbd63d32ad5f6dadedb0204e8e3d619b88d2231060604` → Lasna settle request `0x606ec8146111ff84d657d7917d226b30e12a27f2114500b340b2414d5547a31d` → Settle `0x22ccdabe0392c958a87d27224325e95407d1feef723886942bff847069834124`

**For Every Second Counts: what full-loop latency did you measure, and how?**

| Tier | Loops settled | Fill → solver repaid, p50 / p95 | Whole loop, open → repaid, p50 / p95 |
|---|---|---|---|
| On sight (≤ 0.5 USDC) | 49 of 52 (3 unfilled during a solver bug, refunded) | 2.2 s / 3.7 s | 6.8 s / 9.4 s |
| 30 s + confirm | 52 of 52 | 31.4 s / 34.2 s | 40.8 s / 42.8 s |
| 300 s + confirm | 51 of 51 opened (1 open reverted) | 301.6 s / 304.4 s | 310.8 s / 313.4 s |

- The whole loop is counted in Base Sepolia blocks between the open and the repayment (200 ms each), so it does not depend on any RPC's lag. Fill → repaid is that figure minus the solver's own open → fill time. Block timestamps (1 s resolution) give fill → repaid p50 1 s / p95 3 s on sight. On the delayed tiers the subtraction reads about 4 s low, because the fill receipts came back slowly at four orders at a time; block timestamps put them at 36 s and 5:06. `JUDGE.md` §3 shows all four clocks with the bias of each.
- The whole loop includes our solver's reaction time (p50 4.5 s in this run, which ran three orders at a time); a faster solver shortens it, and Reactive's part does not change.
- Measured by `offchain/src/bench.ts`, which records block numbers and timestamps on all three chains plus the wall-clock time a single observer first saw each event. Everything that failed is listed in `JUDGE.md` §5.

**Was this your first time building with Reactive? Your first smart contract?** First time with Reactive; not my first smart contract.

**What was the hardest part of building with Reactive?**
- **Origin finality.** Reactive acts on events it observed even if the chain later reorganises. The first version re-checked nothing and drained delayed orders on Cron10, which only waited instead of re-reading anything. The current version settles delayed orders only from a `Confirmed` event that a Unichain transaction emits after reading the fill from state.
- **Legacy material:** the official demos still use the legacy RVM API, and `reactive-test-lib` only mocks the legacy system contract. I wrote a small Omni mock (subscriptions and `requestCallbackV_1_0`) to test end to end in Foundry.
- **Silent stops:** callbacks are written so a state mismatch emits an event instead of reverting, because a reverted callback is still billed and a contract in debt stops without an error. `react()` stays well under the 900k cap (confirm → settle measured at 254k gas).

**How did you hear about the buildathon?** DoraHacks.
