# Bench: LIVE · tier 0 · 52/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-16T13:18:23.927Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 52 | 1397 | 4298 | 6767 | 7943 |
| open sent → solver repaid (full loop), wall ms | 52 | 7165 | 10469 | 14148 | 15053 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 52 | 4000 | 6600 | 8600 | 9000 |
| open mined → fill seen (solver), wall ms | 52 | 2355 | 4706 | 6112 | 6308 |
| fill seen → FillAccepted on Lasna, wall ms | 52 | 667 | 3584 | 6005 | 6239 |
| settle requested → Settled on origin, wall ms | 52 | -3793 | 1610 | 3585 | 4416 |
| fill → repaid, block timestamps, s | 52 | 1 | 1 | 2 | 3 |
| open → repaid, block timestamps, s | 52 | 4 | 7 | 9 | 9 |
| fill → FillAccepted, block timestamps, s | 52 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 52 | 2 | 2 | 3 | 4 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x8f5447f0` | 0x616ba9a2 | 0x6b5f4a4b | 0xba8538ea | 0x4bbc2e43 |
| 1 | `0x73cc7357` | 0x2bcd84cf | 0xee5969ed | 0xf67c5957 | 0x22eb373a |
| 2 | `0xb414dd46` | 0x16d83d62 | 0x8a2d363e | 0xd8889d47 | 0x2c85485b |
| 3 | `0x1db9c88d` | 0xb7fe4a11 | 0xda303e3a | 0x7b234b32 | 0xe45788e5 |
| 5 | `0x2d5ad952` | 0x7e4f0a95 | 0xd2d8403d | 0xc987b1a4 | 0xb17345bb |
| 4 | `0xb828e62b` | 0xc910ed2c | 0xa4a9185c | 0x2801c64b | 0x5105a437 |
| 6 | `0xd23347e8` | 0x6c0b5dba | 0xf4bf60a4 | 0x14fd4da7 | 0x5a008766 |
| 7 | `0xc4384e23` | 0x287926d4 | 0x631af3f8 | 0x6ca1270d | 0xbadf2a77 |
| 8 | `0x57b83d53` | 0x7deb4208 | 0x908f6b37 | 0x2437ecb5 | 0xa1d39f00 |
| 9 | `0xf1a7afa9` | 0x13acfd45 | 0xe2933d3e | 0x964ecfb4 | 0x263fd3ea |
| 11 | `0x9903259d` | 0x32b0eddf | 0x7c5cdd21 | 0xf3c2f975 | 0x05bacbf3 |
| 10 | `0x4a158dfe` | 0x64c17a67 | 0xbbdb92e6 | 0x7a72abf9 | 0xbabb754c |
| 12 | `0xcc9853d7` | 0xa036ff8d | 0xb70f594f | 0x7d2c411c | 0xd8109961 |
| 14 | `0x8c40bae9` | 0x41fdb687 | 0x11930c16 | 0x965dd0d8 | 0x96634670 |
| 13 | `0x7ac832ef` | 0xba2e7dc5 | 0x301c0f21 | 0x8eea097c | 0xfde55e27 |
| 15 | `0x5d5f6126` | 0x1efb35c7 | 0xa3c61328 | 0x05d3aed6 | 0x6d21bb1a |
| 17 | `0x1b53c85b` | 0x46ac92d7 | 0x47a4dc02 | 0xaa6031ce | 0xa9216e70 |
| 16 | `0xd7b56807` | 0x11b07edc | 0xf3171295 | 0x1be2ec09 | 0xa4a0c4ac |
| 18 | `0x6a59e099` | 0x9e1b3f86 | 0x9d9bb5fa | 0xf46fdd47 | 0x9951a3d2 |
| 20 | `0xdbf11b9b` | 0x0095a63d | 0x450c0103 | 0x3faecf07 | 0x03b11bfc |
| 19 | `0x4b2af663` | 0xb58040ab | 0xea852410 | 0x5fe74df6 | 0x6376a96d |
| 21 | `0xb03b68f4` | 0x0429a0ae | 0x69be5a2f | 0xbe323112 | 0x80d7a703 |
| 22 | `0x5c632bcd` | 0x2dbc1584 | 0x6b2570f9 | 0x49537fb4 | 0x5c229268 |
| 23 | `0x7f9fcb12` | 0x7b3d56e9 | 0xc550226d | 0x870aeedd | 0xacf5f90f |
| 24 | `0x4f56b81e` | 0xfa658683 | 0xf677a1a3 | 0x30872973 | 0x35320ca6 |
| 26 | `0x2dbb1397` | 0x6c3ac725 | 0xeedba843 | 0xf1eb71da | 0xc270e94a |
| 25 | `0x46514628` | 0xba590d8f | 0x79615ec5 | 0xdeea82c0 | 0x497d596e |
| 27 | `0xa91b5331` | 0x6f4cb941 | 0x031d453d | 0x77a7348b | 0xdb17461d |
| 28 | `0x28c2a870` | 0xcee9928e | 0x6dcd0106 | 0x5d663119 | 0xb378d9e9 |
| 29 | `0x564a1639` | 0x0e0a94b3 | 0xbbcf547e | 0x0c813064 | 0xbc75f4c2 |
| 30 | `0x95a47ff9` | 0x991a1a1d | 0xefa0ffb5 | 0x8bfd0a54 | 0x890dfafc |
| 32 | `0x5a53b671` | 0x11932362 | 0xb67e4426 | 0x556fc913 | 0xe89ffcd2 |
| 31 | `0x1b5df845` | 0xc416db2e | 0x27640923 | 0xc8cfc665 | 0xc685f139 |
| 33 | `0xbb7f45a0` | 0x31921c71 | 0x50c182bb | 0xd0824849 | 0xd78f9416 |
| 35 | `0x93eb7928` | 0x7839a2af | 0x7483ce4e | 0xa9f87ffa | 0x84cd0982 |
| 34 | `0x6e78ffff` | 0xd512e4a9 | 0x62d30521 | 0xe90666eb | 0x95e28bff |
| 36 | `0xa31d019a` | 0x0ac5eb33 | 0x41245dd4 | 0x72d2b766 | 0xced1a4ca |
| 37 | `0xd8958671` | 0x3e9abfe8 | 0xe1896ad5 | 0x9dbedfba | 0xd9bb523c |
| 38 | `0x480eb9df` | 0xb86fd3bf | 0x7ae9de61 | 0xa0577437 | 0xb1788bb9 |
| 39 | `0x4081bf2d` | 0xf865b5d1 | 0x2af10de3 | 0xe881241d | 0xba57bb0c |
| 40 | `0x9eeafea8` | 0x4943ede6 | 0xaf270bca | 0x7eb6961d | 0xad2271ad |
| 41 | `0x173391f1` | 0x0d408cfb | 0x567dfcb5 | 0xfa7889a8 | 0xeaffc97c |
| 42 | `0x42b1e62f` | 0xf6f28fe8 | 0xfdba1a28 | 0xc6c8521d | 0x4522daa6 |
| 43 | `0x8192deac` | 0x431e745d | 0x6fc15fcd | 0x96f60f36 | 0x29d8f12e |
| 44 | `0xae3b85d9` | 0x5ecd7635 | 0xa47355b5 | 0x8550d0b8 | 0xe671311d |
| 45 | `0xd159af91` | 0x80689728 | 0x77f477c8 | 0x74ef5a92 | 0xfb5219fa |
| 46 | `0x4660c7e5` | 0xd779fd98 | 0x8a08b03f | 0x4a037afd | 0x89e578a4 |
| 47 | `0x8c0a200a` | 0xf99e5cb5 | 0x6b760ca4 | 0x21fa3ba9 | 0x1e3d54e6 |
| 48 | `0x806a8ba4` | 0xff54252e | 0xc99eff7a | 0x9d8c37f8 | 0x160c3326 |
| 49 | `0x8f37877d` | 0xd09618ed | 0x4fd87965 | 0x1265b33f | 0x7d376f89 |
| 50 | `0x67e90f7c` | 0xaeb946c2 | 0x4ca82520 | 0x19891b08 | 0x370e4081 |
| 51 | `0xa0f2e15a` | 0x216f0ccb | 0xb6b3b049 | 0x9cbf89c4 | 0x11c79cf2 |

Full hashes: `loops.jsonl`.
