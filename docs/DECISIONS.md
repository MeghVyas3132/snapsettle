# 02 · Decisions (append-only)

## 2026-11-15
- **Idea: settlement for intents.** Chosen over a bridge circuit breaker (LedgerLock already covers it) and a LayerZero DVN (LayerZero's problem, not Reactive's) because it answers Reactive's own open question (docs/00).
- **Static `OrderData` (8 words), EVM addresses.** Cheap to decode inside `react()`; ERC-7683's resolver layer can describe it later without changing settlement.
- **The reactive contract validates fills by terms hash.** The destination cannot see the origin, so `fill` only enforces deadline, destination and once-per-(id, hash); the reactive contract compares the hash with `Opened`.
- **Fills keyed by (orderId, termsHash)** on the destination and for parked fills on Lasna: a griefer filling with fake terms cannot block the genuine fill.
- **Escrow restricted to one destination** (chain + settler, immutable). Otherwise an order the reactive contract ignores could never be refunded.
- **Callbacks are idempotent and never revert on state mismatch** (reverts are billed). `CallbackSkipped` is emitted instead.
- **`retry` is owner-only.** Every callback is billed to the escrow; an open retry would let anyone drain its callback budget.
- **Cron10 is subscribed on demand** and released when the queue empties (idle cron ticks are billed).
- **At most 3 settles per Cron tick.** Measured: 8 per tick = 1.59M gas with the mock system (over the 900k cap); 3 per tick ≈ 632k.
- **Refunds are user-initiated after `fillDeadline + refundGrace`.** No scanning loop on Lasna; `refundGrace` covers the observation lag of a last-second fill.
- **Omni mock system contract in tests**, because `reactive-test-lib` only models the legacy RVM system (`0x…fffFfF`, rvmId).

## 2026-11-15 (autonomous build)
- **Repo stays local until ~28 Nov, then goes public** as `MeghVyas3132/snapsettle` (authorised by the owner). Reason: the idea is uncontested today, and an early public repo lets ~20 track rivals see it for two weeks. The rules only require the repo to be public at submission.
- **Local three-chain harness first** (three anvil nodes with the real chain IDs + a TypeScript relay that emulates Reactive's subscribe/react/callback). Reason: the solver, bench and dashboard can be built and tested end to end before the owner funds a deployer. All local results are labelled LOCAL and never presented as live evidence.
- **Deployer wallet and faucets are the owner's job.** Agents must not create or handle keys, and faucets sit behind CAPTCHAs.
- **Testnet finality tiers: ≤ 1 USDC on sight, ≤ 10 USDC after 30 s, above after 300 s** (env-overridable in the deploy script). Reason: the bench must run 50+ loops per tier on faucet-funded Circle USDC; the shape of the policy (instant / short / long) is what the evidence needs to show, not mainnet-sized thresholds.
- **Refund grace 60 s.** It must exceed the worst fill→observation lag (seconds) with a wide margin, and it must be short enough to show "refund ignored after a valid fill" on-chain: a 300 s-tier order filled at once is still queued when the refund window opens.

## 2026-11-15 (live setup)
- **Agent-created testnet wallets** (owner approved in chat): deployer, user and solver generated with `cast wallet new`. Keys are only in gitignored files (`.secrets/deployer.env`, `offchain/.env`, mode 600) and are never printed. The owner funds the deployer alone; `pnpm fund distribute` hands gas and USDC to the user and solver and buys lREACT from the faucet.
- **Live tier thresholds lowered to ≤ 0.5 USDC on sight, ≤ 2 USDC after 30 s, above after 300 s** (bench amounts 0.25 / 1.25 / 2.5). Reason: 150+ live loops on faucet USDC. With automatic rebalancing (the solver's Base USDC goes back to the user, the user's Unichain USDC back to the solver), ~10 USDC per chain covers every tier.
