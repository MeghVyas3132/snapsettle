# PROGRESS

Resume here. Update after every milestone.

## Done
- 2026-11-15: Repo, docs (AGENTS, CLAUDE, docs/00–04, DECISIONS). Contracts `OriginEscrow`, `DestinationSettler`, `SnapsettleReactive` with 23 passing Foundry tests (512-run fuzz on exactly-once payout; react gas < 700k). Deploy scripts (4 steps) simulated on forks of all three chains: the real Lasna system contract accepts the constructor subscription.

- 2026-11-15: ERC-7683 resolver (`SnapsettleResolver`, resolver-centric Draft): one Call step (fill), PaymentRecipient variable, ERC20 payment from the escrow with `estimatedDelaySeconds` = tier + loop latency, named assumptions `reactive-settlement` and `reactive-origin-finality`. ERC-7930 interop addresses (matches spec example). Escrow now stores the terms hash. 28 tests pass, including a generic solver that executes only the resolved order and gets paid. Deploy step 5 added.

- 2026-11-15: Off-chain package `offchain/` (viem + tsx): generic ERC-7683 solver (resolves orders via the resolver, vets named assumptions, executes the resolved step), bench (per-segment block-ts + wall-clock p50/p95, tx hashes to evidence/), negative-case runner, local Reactive relay (LOCAL only). Local three-chain harness `scripts/local-up.sh` (anvil ×3, real chain IDs, Base 200 ms blocks). LOCAL results: tier 0 3/3 settled, tier 1 2/2 settled via Cron10, all 4 negative cases PASS. Tiers env-configurable; testnet defaults ≤1 USDC instant / ≤10 USDC 30 s / >10 USDC 300 s; refund grace 60 s.

- 2026-11-15: Dashboard (`dashboard/`, Vite + viem, static): chess-clock duel (Across 2 h vs measured fill→repaid p50), leg splits per tier on one log scale with policy delta, scoresheet (bench evidence + live chain polling, expandable to four tx links), on-chain refusals, contracts and sources. LIVE/LOCAL switch; LIVE empty state before deploy. Phone layout checked (no overflow). Pages + CI workflows. PRODUCT.md + Impeccable surface brief (chess clock/scoresheet direction, seed:872bee7c00692510). Finish review running.
- 2026-11-15: Docs: README (judge path), SECURITY.md (trust model, tested properties, limits), docs/05-finality-policy.md (answer to Reactive's question), LICENSE (MIT), `pnpm judge` generator for JUDGE.md from deployments + evidence. Local benches: tier0 8/8, tier1 4/4, tier2 3/3 settled (LOCAL).

- 2026-11-15: Finish review #1 = fix (8 items); all applied: readouts on the clock housing (no hero cards), p95 tick, bezels/seam/rocker; tier labels from each run's recorded policy (bench now records tierDelay/tierPolicy/contracts); column semantics; phone reflow (two-line moves, no sideways scroll); +N over policy; shared loop geometry on Leg splits; condensed-caps headings; live-empty planned tiers; mode-dependent source copy. Verdict pass requested.
- 2026-11-15: Video pipeline `pnpm record` (Playwright 1920×1080, captions injected as an overlay since this ffmpeg has no text filters, one real order mid-recording, h264_videotoolbox MP4 capped 2:55). docs/VIDEO.md script.

- 2026-11-15: DESIGN.md + .impeccable/design.json written by the documenter (Tournament Hall world). Row dimming changed to an AA-safe colour (it was 0.45 opacity); unused shadow token dropped. Submission draft in docs/SUBMISSION.md (placeholders «…» to fill from evidence/live).

- 2026-11-15: LIVE. Funded via Chrome (Google Sepolia faucet 0.05, PoW faucet 2.098 SepETH, Circle 20 USDC × 2), lREACT 31.5 via the Sepolia faucet, bridged 0.4 ETH → Base and 0.15 → Unichain (test deposits first). Deployed all 5 contracts; Sourcify exact match on all 4 addresses (evidence/live/DEPLOYMENT.md). First live loop: open → repaid in 34 Base blocks (6.8 s). Polling hardened (retrying block reads, log re-scan overlap, solver receipt time as the fill clock).

## Next
1. Live benches: tier 0 (running), tier 1 (n=50, concurrency 5), tier 2 (n=50, concurrency 6). Rebalancing is automatic.
2. Negative cases live (stop the solver bot first).
3. `SNAP_ENV=live pnpm judge` → JUDGE.md; set LOOP_LATENCY? (the resolver is already deployed with 10 s; compare with the measured p95 and note it in docs); rebuild dashboard data; record the live video.
4. Public repo + Pages (~28 Nov, or earlier if everything is done), then the submission (show the owner first).

## Blockers (owner)
- None for the live runs. Optional: the track-fit question in t.me/reactivedevs.
