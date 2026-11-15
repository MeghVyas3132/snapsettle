# Bench: LOCAL · tier 0 · 3/3 loops settled

> LOCAL harness (anvil + emulated Reactive relay). Not evidence of live Reactive latency.

Order input: 50000000 (token base units). Generated 2026-11-14T23:59:22.067Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 3 | 4422 | 5189 | 5799 | 5799 |
| open sent → solver repaid (full loop), wall ms | 3 | 12452 | 12514 | 12692 | 12692 |
| open mined → fill seen (solver), wall ms | 3 | 6583 | 7073 | 7961 | 7961 |
| fill seen → FillAccepted on Lasna, wall ms | 3 | 4112 | 4122 | 4123 | 4123 |
| settle requested → Settled on origin, wall ms | 3 | 310 | 1066 | 1677 | 1677 |
| fill → repaid, block timestamps, s | 3 | 7 | 7 | 8 | 8 |
| open → repaid, block timestamps, s | 3 | 10 | 11 | 13 | 13 |
| fill → FillAccepted, block timestamps, s | 3 | 4 | 4 | 4 | 4 |
| settle requested → Settled, block timestamps, s | 3 | 3 | 3 | 4 | 4 |

Wall-clock segments are first-seen times on one machine, polling public RPCs every ~150 ms (an upper bound on the true latency). Block-timestamp segments use each chain's own clock (1 s granularity).

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x518aa722` | 0xd58f9368 | 0xe8a6dde9 | 0xf3a6b49d | 0xbb49c7a2 |
| 1 | `0x1e0b4590` | 0xcf1f3beb | 0xeaa97832 | 0xd5b7e63e | 0x53024c5b |
| 2 | `0xc1c016f3` | 0xd190cd4c | 0xfd605ec3 | 0x11eedbb4 | 0xd98ffefb |

Full hashes: `loops.jsonl`.
