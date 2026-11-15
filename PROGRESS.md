# PROGRESS

Resume here. Update after every milestone.

## Done
- 2026-11-15: Repo, docs (AGENTS, CLAUDE, docs/00–04, DECISIONS). Contracts `OriginEscrow`, `DestinationSettler`, `SnapsettleReactive` with 23 passing Foundry tests (512-run fuzz on exactly-once payout; react gas < 700k). Deploy scripts (4 steps) simulated on forks of all three chains: the real Lasna system contract accepts the constructor subscription.

- 2026-11-15: ERC-7683 resolver (`SnapsettleResolver`, resolver-centric Draft): one Call step (fill), PaymentRecipient variable, ERC20 payment from the escrow with `estimatedDelaySeconds` = tier + loop latency, named assumptions `reactive-settlement` and `reactive-origin-finality`. ERC-7930 interop addresses (matches spec example). Escrow now stores the terms hash. 28 tests pass, including a generic solver that executes only the resolved order and gets paid. Deploy step 5 added.

- 2026-11-15: Off-chain package `offchain/` (viem + tsx): generic ERC-7683 solver (resolves orders via the resolver, vets named assumptions, executes the resolved step), bench (per-segment block-ts + wall-clock p50/p95, tx hashes to evidence/), negative-case runner, local Reactive relay (LOCAL only). Local three-chain harness `scripts/local-up.sh` (anvil ×3, real chain IDs, Base 200 ms blocks). LOCAL results: tier 0 3/3 settled, tier 1 2/2 settled via Cron10, all 4 negative cases PASS. Tiers env-configurable; testnet defaults ≤1 USDC instant / ≤10 USDC 30 s / >10 USDC 300 s; refund grace 60 s.

- 2026-11-15: Dashboard (`dashboard/`, Vite + viem, static): chess-clock duel (Across 2 h vs measured fill→repaid p50), leg splits per tier on one log scale with policy delta, scoresheet (bench evidence + live chain polling, expandable to four tx links), on-chain refusals, contracts and sources. LIVE/LOCAL switch; LIVE empty state before deploy. Phone layout checked (no overflow). Pages + CI workflows. PRODUCT.md + Impeccable surface brief (chess clock/scoresheet direction, seed:872bee7c00692510). Finish review running.
- 2026-11-15: Docs: README (judge path), SECURITY.md (trust model, tested properties, limits), docs/05-finality-policy.md (answer to Reactive's question), LICENSE (MIT), `pnpm judge` generator for JUDGE.md from deployments + evidence. Local benches: tier0 8/8, tier1 4/4, tier2 3/3 settled (LOCAL).

## Next
1. Act on the finish review verdict for the dashboard; then DESIGN.md via the documenter.
2. Video script (docs/VIDEO.md) and a recording pipeline (Playwright video of the dashboard + ffmpeg captions).
3. LIVE (blocked on owner funding): deploy 5 steps (docs/03-deploy.md, env TIER0_MAX/TIER1_MAX defaults, REFUND_GRACE=60, LOOP_LATENCY = measured p95 later), verify sources, run solver + bench 50+ loops per tier, negative cases, `SNAP_ENV=live pnpm judge`, rebuild dashboard data.
4. Public repo MeghVyas3132/snapsettle (~28 Nov), Pages deploy, submission on DoraHacks.

## Blockers (owner)
- Deployer keystore `snapsettle-deployer` (`cast wallet new` → `cast wallet import snapsettle-deployer --interactive`) + funds: Base Sepolia ETH ~0.2, Unichain Sepolia ETH ~0.1, ~1 SepETH → lREACT faucet; Circle test USDC on both chains for a user wallet and a solver wallet (faucet.circle.com).
- Track-fit question in t.me/reactivedevs (draft in ~/Desktop/Larp/reactive-omni-build-plan.md).
