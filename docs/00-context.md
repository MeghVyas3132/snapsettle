# 00 · Context: why Snapsettle

## The sponsor's own problem

Reactive Network, "Intents, Solvers, and Borrowed Certainty" (3 Sep 2026), https://blog.reactive.network/intents-solvers-and-borrowed-certainty/:
- In intent systems the solver fronts capital and is paid afterwards; how the origin chain learns that a fill happened is left to each protocol (Across: optimistic oracle; UniswapX: off-chain attestations).
- Reactive's answer to "act now or wait for the origin chain to be certain" is **origin finality**: an observed origin event is treated as canonical even if that chain later reorganises. "Neither approach is obviously right."
- The post ends: *"if everyone building across chains eventually needs a name for 'true enough to act on', should that be a per-protocol choice, or the next thing somebody tries to standardize?"*

Snapsettle answers with working code: Reactive observes the destination fill directly (no optimistic window), and each order carries an explicit, measured finality tier.

## The pain (sourced)

- Across repays relayers after an optimistic challenge period, **2 hours by default**, with bundles proposed every ~1.5 h; disputes go to UMA's Optimistic Oracle. https://docs.across.to/user-docs/how-across-works/speed, https://docs.across.to/guides/concepts/intents-architecture
- The relayer fee must cover the opportunity cost of capital over that window. https://across.to/blog/The-Intents-bridge-How-Across-uses-optimistic-verification-to-lower-costs
- ERC-7683 (Draft) is now resolver-centric: protocols keep their own settlement; payments carry `estimatedDelaySeconds` ("The payment SHOULD be delayed by `estimatedDelaySeconds` with high confidence"). https://eips.ethereum.org/EIPS/eip-7683

## What the judges look for

Official buildathon post (4 Nov 2026), https://blog.reactive.network/reactive-omni-buildathon-thirty-days-to-find-out-what-one-second-buys/:
- Every Second Counts: "DeFi where reaction time matters, built on Unichain Sepolia, Base Sepolia, or both", **runs on Lasna testnet**. "The strongest entries will show their latency numbers measured across the full loop, not just one leg of it."
- Four equal criteria, each 1–5: **Execution** (reactive txs and the callbacks they trigger, on-chain), **Integration** (does the reactive contract do real work?), **Usefulness**, **Craft**.
- Reactive Circuit (29 Oct 2026): a good integration "fits the project it sits in, beats the alternatives a team could have reached for, and runs"; they ask "whether the project would have been simpler without us".

Submission fields: public repo, deployed addresses and network, tx hashes for the full loop, latency measured and how, a video < 3 min.

## Competition (15 Nov 2026)

About 20 entries in Every Second Counts (submitted plus public repos): stop-loss ×8, arbitrage ×4 (TwinPool Arb is the most polished), circuit breakers ×5 (LedgerLock is the most polished), one withdrawal queue, one liquidation guardian. **None touches intents or settlement.**

## Honest limits (say these before the judges do)

- On testnet the solver is our own bot; there is no live solver market.
- The Across window is quoted from its docs, not measured here (Across is not deployed on these testnets).
- A destination reorg after settlement would pay a solver for a fill that no longer exists; the finality tiers bound this, they do not remove it.
- ERC-7683 is a Draft; Snapsettle is positioned as a settlement layer any resolver can point to, not as a new bridge.
