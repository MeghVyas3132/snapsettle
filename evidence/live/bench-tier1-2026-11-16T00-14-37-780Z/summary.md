# Bench: LIVE · tier 1 · 2/2 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 1000000 (token base units). Generated 2026-11-16T00:15:30.960Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 2 | 32769 | 32769 | 38401 | 38401 |
| open sent → solver repaid (full loop), wall ms | 2 | 40856 | 40856 | 44545 | 44545 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 2 | 36200 | 36200 | 37800 | 37800 |
| open mined → fill seen (solver), wall ms | 2 | 3171 | 3171 | 5118 | 5118 |
| fill seen → FillAccepted on Lasna, wall ms | 2 | 2046 | 2046 | 2046 | 2046 |
| settle requested → Settled on origin, wall ms | 2 | 102 | 102 | 105 | 105 |
| fill → repaid, block timestamps, s | 2 | 34 | 34 | 36 | 36 |
| open → repaid, block timestamps, s | 2 | 36 | 36 | 38 | 38 |
| fill → FillAccepted, block timestamps, s | 2 | 0 | 0 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 2 | 2 | 2 | 3 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x346bba68` | 0x46a0fc77 | 0xffe4d879 | 0x2c43e909 | 0xa4728be8 |
| 1 | `0x45474b85` | 0x380beaee | 0x75f9622f | 0x02a82ff8 | 0x32886c5b |

Full hashes: `loops.jsonl`.
