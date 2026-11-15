# Bench: LIVE · tier 2 · 24/24 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 2500000 (token base units). Generated 2026-11-15T19:25:05.844Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 18 | 304442 | 309904 | 315320 | 315320 |
| open sent → solver repaid (full loop), wall ms | 18 | 311092 | 319298 | 327699 | 327699 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 24 | 306200 | 312800 | 321000 | 323400 |
| open mined → fill seen (solver), wall ms | 24 | 2536 | 5917 | 12814 | 15181 |
| fill seen → FillAccepted on Lasna, wall ms | 24 | 1659 | 4656 | 6713 | 7014 |
| settle requested → Settled on origin, wall ms | 18 | -2405 | 1720 | 3854 | 3854 |
| fill → repaid, block timestamps, s | 24 | 301 | 306 | 310 | 311 |
| open → repaid, block timestamps, s | 24 | 307 | 313 | 321 | 323 |
| fill → FillAccepted, block timestamps, s | 24 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 24 | 1 | 2 | 3 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x3b0a82a3` | 0x30430572 | 0xdd7c9e41 | 0x1e1869cd | 0x1bd662cc |
| 1 | `0x65749e0a` | 0x2a3caea1 | 0x649ead7e | 0x8cf6de41 | 0x242f2b75 |
| 2 | `0xbb631faa` | 0xf375119a | 0x958fff1e | 0x57e6dd2d | 0x81060f3c |
| 3 | `0x89db47be` | 0xb88b2612 | 0x27e085e4 | 0x40eb4c00 | 0xe6521e5e |
| 4 | `0xcc96edad` | 0x7d22e0f0 | 0x3d7589cf | 0x11398588 | 0x83aaeb89 |
| 5 | `0x9b2ffcbf` | 0x3eb6e52d | 0x39b8798e | 0x867ad4d5 | 0x9af3d8c7 |
| 6 | `0x28027349` | 0x80415e8e | 0xb080dda5 | 0x48ea4747 | 0x7c198b44 |
| 7 | `0xd3b06586` | 0x2d1e4385 | 0xd74df9a2 | 0x9a6b68b4 | 0x7cbba5a9 |
| 8 | `0xa1e935f4` | 0xa5bd4774 | 0x89a21406 | 0x6789144a | 0x3b2c9154 |
| 9 | `0xcc4be681` | 0x11de2fc4 | 0x4a3f53a5 | 0x9b32db6a | 0x0abbe2d7 |
| 10 | `0x48374697` | 0xbc263627 | 0x5d21f765 | 0x2254b220 | 0x166f49f0 |
| 11 | `0x73eb993f` | 0x59b22ba6 | 0xeda8378b | 0x88245dc2 | 0x323f7996 |
| 12 | `0x6b6ac4f4` | 0x97525267 | 0xb1aeb0ff | 0x7e293ef8 | 0x6be8e6ac |
| 13 | `0x659e616b` | 0x3bf6536a | 0x51df6246 | 0xe7a034a4 | 0x345b53aa |
| 14 | `0x7fab10b3` | 0xad9b11e4 | 0x49af879b | 0x5cb3f280 | 0x57aee819 |
| 16 | `0xd5a89fc3` | 0xf102e1ed | 0xa7c68639 | 0xd8e6ff27 | 0xe674c6e3 |
| 17 | `0xdc19ab07` | 0xa66eee8e | 0x781f00cd | 0xf48484e2 | 0x8b3ffff7 |
| 18 | `0x50c9ec41` | 0x77006054 | 0x43cf284d | 0x4e7e4c78 | 0xa1a8ca2f |
| 19 | `0x47427d5a` | 0xd63dfea2 | 0x38c86890 | 0xbd7144c8 | 0x05895bbe |
| 20 | `0x83978670` | 0x962ad1f7 | 0x00ed0020 | 0x6cd43230 | 0xad5bbed0 |
| 21 | `0xfe331412` | 0xa755a2ca | 0x35aaa2c3 | 0xa52e274c | 0x9d6d5ae2 |
| 22 | `0xa8976b17` | 0x09c26d39 | 0x2e14d6d4 | 0x7f108ee5 | 0xb31c2d39 |
| 23 | `0x7d08f4ed` | 0x6afc5bc6 | 0x5bed53e7 | 0x271c1850 | 0x4d5ee127 |
| 25 | `0x75eaf806` | 0x96178124 | 0x6ba50c79 | 0x23ee20d0 | 0x603fe235 |

Full hashes: `loops.jsonl`.

> Run stopped early at 24 recorded loops (target 50): the observer's Base log scanner fell more than 200 blocks behind and the public RPC refused its catch-up range, so it stopped seeing events. 6 loops whose settlement it missed were completed from the chain afterwards (settleSeenBy="backfill"): their block-timestamp and Base-block segments are exact; they have no wall-clock settle time. Original observer output: loops.observed.jsonl. 2 open(s) reverted on Base before an order existed (errors.jsonl).
