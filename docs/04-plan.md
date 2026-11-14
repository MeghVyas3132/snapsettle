# 04 · Plan and status

Deadline 5 Dec 2026 20:00 UTC. Target submission **1 Dec**.

## Status (update at the end of every session)

- 2026-11-15: repo created. Contracts (`OriginEscrow`, `DestinationSettler`, `SnapsettleReactive`) and 23 Foundry tests passing (incl. 512-run fuzz on exactly-once payout, react gas < 700k). Deploy scripts written. **Next: owner funds a deployer + imports the keystore; then the live feasibility loop.**

## Schedule

| Dates | Milestone | Done |
|---|---|---|
| 15–16 Nov | Contracts + tests; **live loop**: one open on Base → fill on Unichain → react on Lasna → settle on Base, timed | contracts ✅ / live ⏳ |
| 17–21 Nov | ERC-7683 resolver (`estimatedDelaySeconds` = tier), refund path live, tests on real chain behaviour | |
| 22–25 Nov | Solver bot (viem), loop tracer + bench (50+ loops per tier), negative cases on-chain | |
| 26–28 Nov | Dashboard (live orders, per-segment latency, "Across would repay at…"), README, JUDGE.md | |
| 29 Nov–1 Dec | Video < 3 min, polish, **submit** | |
| 2–5 Dec | Buffer: keep funded, re-check competitors, fixes | |

## Owner to-dos (cannot be done by an agent)

1. Create a fresh deployer and import it: `cast wallet new` then `cast wallet import snapsettle-deployer --interactive` (do not paste keys into chat or files).
2. Fund it: ~0.2 Base Sepolia ETH, ~0.1 Unichain Sepolia ETH, and ~1 SepETH sent from it to the Base Sepolia lREACT faucet (→ 100 lREACT on Lasna).
3. Circle test USDC on both chains (faucet.circle.com) for the user and solver wallets.
4. Post the track-fit question in https://t.me/reactivedevs (draft in the build plan).
