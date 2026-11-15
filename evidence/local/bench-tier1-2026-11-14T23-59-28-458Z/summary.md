# Bench: LOCAL · tier 1 · 2/2 loops settled

> LOCAL harness (anvil + emulated Reactive relay). Not evidence of live Reactive latency.

Order input: 100000001 (token base units). Generated 2026-11-15T00:00:26.571Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 2 | 49592 | 49592 | 49603 | 49603 |
| open sent → solver repaid (full loop), wall ms | 2 | 53728 | 53728 | 57847 | 57847 |
| open mined → fill seen (solver), wall ms | 2 | 3970 | 3970 | 8098 | 8098 |
| fill seen → FillAccepted on Lasna, wall ms | 2 | 8242 | 8242 | 8253 | 8253 |
| settle requested → Settled on origin, wall ms | 2 | 4277 | 4277 | 8396 | 8396 |
| fill → repaid, block timestamps, s | 2 | 48 | 48 | 51 | 51 |
| open → repaid, block timestamps, s | 2 | 52 | 52 | 56 | 56 |
| fill → FillAccepted, block timestamps, s | 2 | 8 | 8 | 11 | 11 |
| settle requested → Settled, block timestamps, s | 2 | 3 | 3 | 7 | 7 |

Wall-clock segments are first-seen times on one machine, polling public RPCs every ~150 ms (an upper bound on the true latency). Block-timestamp segments use each chain's own clock (1 s granularity).

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x6c1a4fd8` | 0x8bbcf333 | 0x7afbb698 | 0xe1472eca | 0xed801ef5 |
| 1 | `0x0a5b4675` | 0xc2133bfd | 0x26ec7af8 | 0x58dae552 | 0x0c2de383 |

Full hashes: `loops.jsonl`.
