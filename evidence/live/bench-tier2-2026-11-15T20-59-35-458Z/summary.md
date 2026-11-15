# Bench: LIVE · tier 2 · 36/39 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 2500000 (token base units). Generated 2026-11-15T21:43:04.829Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 36 | 302797 | 308953 | 316535 | 317540 |
| open sent → solver repaid (full loop), wall ms | 36 | 310766 | 322862 | 331569 | 339062 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 36 | 306200 | 317000 | 324200 | 330400 |
| open mined → fill seen (solver), wall ms | 36 | 3891 | 9723 | 17101 | 20070 |
| fill seen → FillAccepted on Lasna, wall ms | 36 | 1123 | 3888 | 6245 | 6760 |
| settle requested → Settled on origin, wall ms | 36 | -3 | 2456 | 5428 | 5530 |
| fill → repaid, block timestamps, s | 36 | 301 | 306 | 311 | 312 |
| open → repaid, block timestamps, s | 36 | 307 | 317 | 324 | 330 |
| fill → FillAccepted, block timestamps, s | 36 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 36 | 1 | 2 | 3 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x7fbee19f` | 0x1430f28d | 0x24623e1c | 0x631cbc3b | 0x495a567a |
| 2 | `0x63f64223` | 0xb8e3796f | 0x41509430 | 0x0886ff6a | 0x1bfec1ff |
| 3 | `0x10483bf3` | 0xb3b54120 | 0x7c176ae2 | 0x3976254e | 0xe0d0f805 |
| 4 | `0xbe394f7a` | 0x5bc46671 | 0x5f51fdb9 | 0xaed72be3 | 0xb65cb601 |
| 6 | `0xb1710a15` | 0xe365b537 | 0x6b193c5d | 0x10fe391e | 0x2306bfce |
| 5 | `0x6b00e69a` | 0x2cf32ad7 | 0x032eb0a8 | 0x4a90d446 | 0xe5720aa3 |
| 7 | `0x057b513c` | 0xc1ecd0fc | 0x99c71548 | 0x0d4a73b9 | 0x26ac5526 |
| 10 | `0x593a042f` | 0x552ab5a6 | 0x77443349 | 0x2b3645a0 | 0x5bcaa845 |
| 9 | `0x7e089d04` | 0xb2db9aeb | 0x46ddf494 | 0xdddf4b86 | 0xb0b59a30 |
| 12 | `0xb7724c72` | 0x60d2dec7 | 0x0d3231a5 | 0xc01c04f9 | 0x372880b5 |
| 13 | `0x6e939c34` | 0x8611082d | 0x49afa5c6 | 0x99df6a3b | 0x6a8e0013 |
| 17 | `0x27b4435b` | 0x5f667905 | 0x49dca871 | 0xa38aafd7 | 0x7bcdb4c5 |
| 14 | `0xbeec8978` | 0x6b5ba059 | 0xf134d62c | 0x170dbedc | 0xff679061 |
| 15 | `0xce6b5e3c` | 0xb45236e7 | 0x166347c8 | 0x85a5b8ee | 0x6b22a58d |
| 19 | `0xe85990de` | 0x537930f6 | 0x24f825c5 | 0xb5427b4e | 0xb28e7642 |
| 20 | `0x20617fce` | 0xdb044823 | 0x134a9027 | 0xb6d77a61 | 0x986649f2 |
| 21 | `0xadb43efc` | 0xade3f629 | 0x8ac6f4df | 0x6d4d4780 | 0x94d53b44 |
| 22 | `0xade51d49` | 0x61a4cd2a | 0xe5272962 | 0x9f29916f | 0xd698ffec |
| 24 | `0xa95a6c0b` | 0xa4ea6d01 | 0xfcb921c1 | 0xb1d7bd86 | 0xe8eb1837 |
| 25 | `0xe44b7e3e` | 0x9fceb3ca | 0x8fc1a02b | 0xdd3616d4 | 0xd0a1f0d4 |
| 26 | `0x07a3b8d7` | 0x8d51befe | 0x41fd5438 | 0xdfd9c1d4 | 0x83cce300 |
| 28 | `0x128fe36f` | 0x5131de25 | 0x8b0044ae | 0xe505b610 | 0xadce8775 |
| 29 | `0x7b854d8a` | 0x60e3e6b8 | 0x87365a81 | 0x1dc1a16a | 0x6e1faeec |
| 31 | `0x7a5a7c21` | 0xcc62a944 | 0x3b87890c | 0xa9285712 | 0xc08f389f |
| 32 | `0xdde63a82` | 0xa8ea6bb4 | 0xe5549942 | 0x2fbf95b1 | 0xe3ae2af8 |
| 35 | `0x60d3781f` | 0x950d3744 | 0xebf3f58e | 0x6b77334b | 0xa30ed82f |
| 34 | `0x266aeced` | 0x22459015 | 0x587e1aee | 0xf0c3e965 | 0xeeb55b46 |
| 37 | `0x8502abf1` | 0x41699510 | 0x24284a74 | 0xa9a34410 | 0xb3f2bb56 |
| 39 | `0x546ff468` | 0x755b81ef | 0xf2cb373a | 0xfb1a2d4c | 0x23b33950 |
| 40 | `0x53cb143a` | 0xec680bb2 | 0xddedee03 | 0xa2a215f6 | 0x214a4fa2 |
| 42 | `0x4e126968` | 0xef41088a | 0x40fa63fa | 0xa1c57d23 | 0x541b6d06 |
| 43 | `0x91ae43ec` | 0x25d5eb7d | 0x905d072f | 0x568c3662 | 0x136fbb2a |
| 30 | `0x55f73abb` | 0xa2cefeeb | - | - | - |
| 45 | `0xdeb9ce20` | 0x8d918cf2 | 0x500a833e | 0x639e43dd | 0xb120f99c |
| 48 | `0x12db236b` | 0x210d4ca5 | 0x42deb2b5 | 0x21784f18 | 0x2bc42e7b |
| 50 | `0xe0df6181` | 0xff1b08fb | 0xdf1ba25b | 0x709baf0e | 0x7d504a1e |
| 49 | `0x47c7dee2` | 0xb67e96d1 | 0x3ada390e | 0x85eff234 | 0x89d24aa4 |
| 38 | `0xa1b43e57` | 0xead787e8 | - | - | - |
| 46 | `0x096ae861` | 0xd36d432a | - | - | - |

Full hashes: `loops.jsonl`.
