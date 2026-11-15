# Bench: LIVE · tier 2 · 49/49 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 2500000 (token base units). Generated 2026-11-15T20:17:23.045Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 49 | 304027 | 309460 | 315464 | 317032 |
| open sent → solver repaid (full loop), wall ms | 49 | 310886 | 320309 | 331571 | 340379 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 49 | 307200 | 315400 | 324800 | 333200 |
| open mined → fill seen (solver), wall ms | 49 | 3780 | 7474 | 18021 | 25916 |
| fill seen → FillAccepted on Lasna, wall ms | 49 | 1336 | 3587 | 6654 | 6744 |
| settle requested → Settled on origin, wall ms | 49 | -3173 | 2254 | 3383 | 5731 |
| fill → repaid, block timestamps, s | 49 | 301 | 306 | 312 | 312 |
| open → repaid, block timestamps, s | 49 | 307 | 315 | 325 | 333 |
| fill → FillAccepted, block timestamps, s | 49 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 49 | 1 | 2 | 3 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0xc8f947ec` | 0x2d425c32 | 0x147ed41f | 0x4c875bb0 | 0x97a9b439 |
| 1 | `0xaa0bf414` | 0x906567a0 | 0x2e030248 | 0x932b0740 | 0x9475fd9a |
| 2 | `0x4280bdd6` | 0xe9d072a8 | 0x82e39b14 | 0x7977bc86 | 0x04f288bf |
| 4 | `0x01c40a04` | 0x168926f8 | 0x6c13c0f0 | 0xa5486e4e | 0xfb46daa3 |
| 3 | `0x67758615` | 0x41eea848 | 0x9f0b3394 | 0x237149d0 | 0xa7875a15 |
| 5 | `0x42453656` | 0xf9129dcf | 0x8496ecb3 | 0x804088cb | 0x04945da0 |
| 6 | `0xabe47913` | 0x4722df6b | 0x705936f5 | 0x444e93ca | 0x53c8e937 |
| 7 | `0x565d827e` | 0xab8f71fd | 0x8d729221 | 0x538551b5 | 0x27ec5cd7 |
| 9 | `0x81c56260` | 0x8ebe1c09 | 0x7d88ae41 | 0xa723df30 | 0x16bd8c96 |
| 10 | `0x0d2917cb` | 0x07d596df | 0xc2064372 | 0xfa7c61cc | 0xf94958cc |
| 11 | `0x0964967b` | 0x3e8e72b3 | 0x034e2aa1 | 0x3b5b4606 | 0x50b0eb4d |
| 12 | `0xd1c0f3b4` | 0x57d324af | 0x342eefd2 | 0xc4f2e088 | 0x09c3f099 |
| 13 | `0xc5ae77a4` | 0x59f66064 | 0xb28c3597 | 0x88f73b62 | 0x0891fcee |
| 14 | `0x37f24ee4` | 0xdcdaf022 | 0x395b4773 | 0x20c6ed83 | 0xd4a51f76 |
| 15 | `0x9a76c1a5` | 0x45ef2f31 | 0x90cecae7 | 0x23952047 | 0xb4c57d6c |
| 16 | `0xdf697b55` | 0x0f0ee837 | 0xd387b542 | 0x5bde4043 | 0xc6616552 |
| 18 | `0x5e6b9c2a` | 0x084a4a27 | 0xadf1292e | 0x20c4ce7d | 0x0ca8fc54 |
| 17 | `0x78dc0aae` | 0xab50101e | 0x1cf276b4 | 0x381c4e73 | 0x1147b2dc |
| 19 | `0x8314f6ac` | 0x3292ccac | 0x66634912 | 0x7a6dfa44 | 0xb3bb7b34 |
| 20 | `0x83a1e160` | 0x89cd7e8a | 0x92742688 | 0x2b98db0f | 0x473da27d |
| 21 | `0x4ef922e8` | 0x689f29ee | 0x0b3252ca | 0x506c2f85 | 0xa47219e0 |
| 23 | `0x05742385` | 0xb90c3d99 | 0x19672574 | 0x1242a980 | 0x75e47aa1 |
| 22 | `0x518aedbf` | 0x42d3fb0d | 0xb8f3e667 | 0x96b1f468 | 0x7fb77919 |
| 24 | `0xb1514454` | 0x81f39561 | 0x36042ba3 | 0x7208ca43 | 0x6f6387eb |
| 25 | `0xb5dfab28` | 0xa94f22ca | 0xd801f64b | 0x2dec4c2e | 0x3a07fff7 |
| 26 | `0xb93a7317` | 0x80273c2a | 0x4fb35425 | 0x675dabea | 0x5f5c4f96 |
| 27 | `0x316db009` | 0x71e2fab3 | 0x3381fd4f | 0x6076e34a | 0xf66ad184 |
| 28 | `0x4c4f92e5` | 0xc7793e73 | 0xc7d9cbb9 | 0xd40f0f91 | 0x3780b893 |
| 30 | `0xce8ea946` | 0x4c1a2ea5 | 0x2c64de20 | 0xbaa91734 | 0xd0d7f839 |
| 29 | `0x9cd13c85` | 0x6c115bd0 | 0xaf3176f3 | 0x61e5b3fd | 0xc216d42a |
| 31 | `0xe8abda3b` | 0xd51521b2 | 0xf341400b | 0xded33327 | 0x8e41e307 |
| 32 | `0x9a538a0c` | 0x16a63c0d | 0x71a27724 | 0x470304b2 | 0xfedc5bf4 |
| 33 | `0x673e8325` | 0x7f7f7501 | 0x7a3642e8 | 0x5fcca66b | 0x4cade940 |
| 34 | `0x9e7b9cbd` | 0x79c3e6b7 | 0xc767fbdc | 0x01eb4128 | 0x5f0c12a4 |
| 35 | `0xe04751f0` | 0x2446cab4 | 0x072515df | 0xbfe9c6d1 | 0x33a2c560 |
| 36 | `0x7c02b9d3` | 0x2272a3a1 | 0x028dd5e3 | 0x6b3d0c29 | 0x2e86e2be |
| 37 | `0x5c633648` | 0x7baf9a83 | 0xe22df8a7 | 0xd34f1c50 | 0xaddc02a0 |
| 38 | `0xbe505b44` | 0x321ebb55 | 0x7a97908f | 0x39e82c94 | 0xf1f68133 |
| 39 | `0xd5f54c37` | 0x5eae7653 | 0x92dd54a2 | 0x17a0e335 | 0xf03cc9ae |
| 40 | `0x857816d2` | 0xea2363ba | 0x176b44ad | 0x2cd9cd64 | 0x4f6078aa |
| 41 | `0x80ac69de` | 0xe61b168c | 0x0959b89f | 0x58fce247 | 0x333a88ea |
| 42 | `0xe35094fb` | 0x6264b52b | 0x55ffd155 | 0xf984b058 | 0x5b120f77 |
| 43 | `0xb79eaaa9` | 0x8d9ee0e7 | 0xea668603 | 0x60bbc1dd | 0x892bd2f1 |
| 44 | `0xd58d1e3f` | 0x0311e65a | 0xd4cd7ef4 | 0xd13b49b2 | 0xf919984b |
| 45 | `0xa828ccd4` | 0x4d5d5da8 | 0xcda1b760 | 0x89c696e3 | 0x0a7713bf |
| 47 | `0xe4ccc88d` | 0x047bf7b7 | 0x7e76e991 | 0xd12a81cb | 0x210b9b29 |
| 46 | `0xd1e92839` | 0x2cb276b8 | 0xf3b3a307 | 0x17560011 | 0xa725775f |
| 48 | `0x4431ca1e` | 0x78def4d0 | 0xe666999b | 0x6cb34a75 | 0x39099bb6 |
| 49 | `0x2fba6dd9` | 0x3842cf41 | 0x16908b18 | 0x9625baee | 0xd435498a |

Full hashes: `loops.jsonl`.
