# 04 · Plan and status

Deadline 5 Dec 2026 20:00 UTC. Target submission **1 Dec**.

## Status (update at the end of every session)

- 2026-11-15: repo created; contracts and 23 Foundry tests; v1 deployed live (delayed tiers drained on Cron10).
- 2026-11-16: v2 deployed and verified on Sourcify: delayed tiers settle only from `Confirmed` (the solver's `confirm` re-reads the fill on Unichain), no cron, 500 USDC/hour outflow cap; 34 tests. Live evidence on v2: 52 loops per tier, 5 refusal cases passing, reorg check 0 of 1,578 transactions changed, 3 orders stranded by a solver bug refunded. `JUDGE.md` generated; site live on GitHub Pages. 
- 2026-11-16: pressure test of the judge path. Fixed: solver now refuses bad terms and orders beyond its inventory (a hostile order is refused live); the site showed no time for a visitor's settled order (race) and lost events when one RPC failed; phone layout. v3 deployed: `open()` takes one USDC route and a 0.1 USDC minimum, so spam reverts before an event. v3 evidence: 52/52 per tier, 6 refusal cases, reorg check 0 of 2,046 changed. **Next: record the video, keep the solver funded, then submit.**

## Schedule

| Dates | Milestone | Done |
|---|---|---|
| 15–16 Nov | Contracts, tests, live loop on all three chains | ✅ |
| 15–16 Nov | ERC-7683 resolver, refund path, solver, bench (50+ loops per tier), refusal cases on-chain | ✅ |
| 15–16 Nov | Site, README, JUDGE.md, v2 redeploy after review | ✅ |
| by 1 Dec | Video < 3 min, final review, **submit** (shown to the owner first) | |
| optional | Solver and demo service on an always-on server (needs the owner's go-ahead), CCTP rebalancing | |
| 2–5 Dec | Buffer: keep funded, re-check competitors, fixes | |

## Owner to-dos (cannot be done by an agent)

1. Create a fresh deployer and import it: `cast wallet new` then `cast wallet import snapsettle-deployer --interactive` (do not paste keys into chat or files).
2. Fund it: ~0.2 Base Sepolia ETH, ~0.1 Unichain Sepolia ETH, and ~1 SepETH sent from it to the Base Sepolia lREACT faucet (→ 100 lREACT on Lasna).
3. Circle test USDC on both chains (faucet.circle.com) for the user and solver wallets.
4. Post the track-fit question in https://t.me/reactivedevs (draft in the build plan).
