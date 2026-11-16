# Bench: LIVE · tier 0 · 2/2 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-16T00:14:37.100Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 2 | 2152 | 2152 | 6350 | 6350 |
| open sent → solver repaid (full loop), wall ms | 2 | 6759 | 6759 | 12185 | 12185 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 2 | 3400 | 3400 | 4400 | 4400 |
| open mined → fill seen (solver), wall ms | 2 | 1532 | 1532 | 2763 | 2763 |
| fill seen → FillAccepted on Lasna, wall ms | 2 | 2662 | 2662 | 5937 | 5937 |
| settle requested → Settled on origin, wall ms | 2 | -3785 | -3785 | 3688 | 3688 |
| fill → repaid, block timestamps, s | 2 | 1 | 1 | 2 | 2 |
| open → repaid, block timestamps, s | 2 | 3 | 3 | 5 | 5 |
| fill → FillAccepted, block timestamps, s | 2 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 2 | 2 | 2 | 2 | 2 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0xcea5f0c1` | 0x52ddbc5e | 0x6ca8075e | 0x8fa0e9d5 | 0x8f57cb82 |
| 1 | `0xb2b21f08` | 0x389733ae | 0x4e407e36 | 0x082ce1f3 | 0x7b70b5f0 |

Full hashes: `loops.jsonl`.
