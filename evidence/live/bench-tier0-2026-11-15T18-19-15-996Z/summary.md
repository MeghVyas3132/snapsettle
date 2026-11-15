# Bench: LIVE · tier 0 · 1/1 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-15T18:19:36.118Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 1 | -3251 | -3251 | -3251 | -3251 |
| open sent → solver repaid (full loop), wall ms | 1 | 9739 | 9739 | 9739 | 9739 |
| open mined → fill seen (solver), wall ms | 1 | 10439 | 10439 | 10439 | 10439 |
| fill seen → FillAccepted on Lasna, wall ms | 1 | -884 | -884 | -884 | -884 |
| settle requested → Settled on origin, wall ms | 1 | -2367 | -2367 | -2367 | -2367 |
| fill → repaid, block timestamps, s | 1 | 1 | 1 | 1 | 1 |
| open → repaid, block timestamps, s | 1 | 7 | 7 | 7 | 7 |
| fill → FillAccepted, block timestamps, s | 1 | -1 | -1 | -1 | -1 |
| settle requested → Settled, block timestamps, s | 1 | 2 | 2 | 2 | 2 |

Wall-clock segments are first-seen times on one machine, polling public RPCs every ~150 ms (an upper bound on the true latency). Block-timestamp segments use each chain's own clock (1 s granularity).

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x842828af` | 0xfa73c7cf | 0x73bf2bc9 | 0xf23e6cca | 0x54f5c751 |

Full hashes: `loops.jsonl`.
