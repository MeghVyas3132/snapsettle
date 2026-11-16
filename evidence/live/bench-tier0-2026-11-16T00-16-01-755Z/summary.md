# Bench: LIVE · tier 0 · 49/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-16T00:30:48.685Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 49 | 1842 | 4715 | 7989 | 8501 |
| open sent → solver repaid (full loop), wall ms | 49 | 6553 | 11980 | 16487 | 17293 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 49 | 4000 | 6800 | 9400 | 10600 |
| open mined → fill seen (solver), wall ms | 49 | 1944 | 4512 | 6861 | 7678 |
| fill seen → FillAccepted on Lasna, wall ms | 49 | 1021 | 3481 | 6858 | 7252 |
| settle requested → Settled on origin, wall ms | 49 | -102 | 2 | 5429 | 5849 |
| fill → repaid, block timestamps, s | 49 | 1 | 1 | 3 | 3 |
| open → repaid, block timestamps, s | 49 | 4 | 7 | 9 | 11 |
| fill → FillAccepted, block timestamps, s | 49 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 49 | 1 | 2 | 3 | 4 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x96014180` | 0x8f917ec4 | - | - | - |
| 1 | `0xf4fa70b7` | 0xda5dbed7 | - | - | - |
| 2 | `0x523d8ef8` | 0xc9b9593c | - | - | - |
| 3 | `0xfde134d8` | 0x3f0c5809 | 0xdd25f544 | 0x0d009e9b | 0xc68ab503 |
| 5 | `0xb1d1a0a2` | 0xcc30a8e3 | 0x0bf65a9e | 0x6430567c | 0xa9aeadd9 |
| 4 | `0xbcae3720` | 0x563aa805 | 0xdb785ba4 | 0x3d93eae3 | 0x48fc7608 |
| 7 | `0xddbfaf39` | 0xf0656f9c | 0x563cc05d | 0x457b23ce | 0xbb063377 |
| 8 | `0x9eef4d8d` | 0xcaa25449 | 0x803c6003 | 0xa0769562 | 0xeae1ea16 |
| 6 | `0x37287c1e` | 0x7fed2b2f | 0xbc36cdeb | 0x1272314b | 0xc246894f |
| 10 | `0x4921fd74` | 0x2a36b634 | 0x2ea63551 | 0x5d905ae3 | 0xaf8eae29 |
| 9 | `0x78fc6779` | 0x35b7b600 | 0x13c59671 | 0xb7f7fe33 | 0xd74ddbf2 |
| 11 | `0xb71504b2` | 0xe01e4bc2 | 0xce13d1e0 | 0xc02e540b | 0x8b4a83a7 |
| 12 | `0xe991d206` | 0x07e4b1c9 | 0xb3445103 | 0x0c7bdf36 | 0x83162281 |
| 13 | `0x132bf788` | 0x454a6c70 | 0xe7c0a753 | 0x99062851 | 0xedd7b0e2 |
| 14 | `0x8086bae3` | 0x9910b5f3 | 0x12c72eff | 0x9d76aba6 | 0x035175b0 |
| 15 | `0x3d809e44` | 0x963cc16d | 0x62b2c965 | 0xc27e62ec | 0x3e38197c |
| 16 | `0xba39cbc3` | 0xe0863ab1 | 0xece513fc | 0x2522d717 | 0x00369d38 |
| 17 | `0xc300644d` | 0x55f77cbe | 0x75682bf9 | 0xe80d2af3 | 0x35256a2c |
| 18 | `0x9f4ddd13` | 0x14aa68f7 | 0xaed56d5d | 0x36e4d4d5 | 0x7a1c941e |
| 19 | `0x861a0800` | 0x7a846f06 | 0xae423e4a | 0xb629dd9c | 0x75eb7c83 |
| 20 | `0x979e5448` | 0x1155c04d | 0x207af9fa | 0x83d2fbc2 | 0x8600440d |
| 21 | `0x1f055ba5` | 0x54db6310 | 0x11d11a05 | 0xd5e6d6f1 | 0x0235c803 |
| 22 | `0x6990d910` | 0xcd36a102 | 0x92614486 | 0xd905905a | 0xfa9c364c |
| 23 | `0xd7346ecb` | 0x6c19160f | 0x64a291da | 0xaac20aec | 0x300f4882 |
| 24 | `0x83ba888c` | 0x7eeefcd0 | 0xc64b8edc | 0xdccb1577 | 0xf0786e40 |
| 25 | `0xdbfd7fd9` | 0x69db52b5 | 0x048d144b | 0xe6a8da72 | 0x43c3cbe6 |
| 26 | `0xecda2b50` | 0xfb269573 | 0x08e6dd02 | 0x988cb1e2 | 0x11508a65 |
| 27 | `0xab04e6c4` | 0xc800e019 | 0x460b51c7 | 0xe0f76814 | 0xa64dacbb |
| 28 | `0xe7604b51` | 0x8a38714b | 0xcad456fe | 0x1146140a | 0x1f937847 |
| 29 | `0x189454d1` | 0x35078562 | 0xcd1a8fe6 | 0x789ae94a | 0x2bfdf829 |
| 30 | `0xf95f84df` | 0x3cdd4629 | 0x043af5e1 | 0x4fbade79 | 0x2df4cfaf |
| 31 | `0x51f1b2a0` | 0xba127067 | 0x2d89004d | 0xe9d08ba8 | 0xfed17d25 |
| 33 | `0x2d5ff4b7` | 0xad5821c5 | 0x6ee98eea | 0xcb816e8c | 0x886114cd |
| 32 | `0x9473a135` | 0x61200e7f | 0x46309240 | 0x02879cd6 | 0x8dd64293 |
| 34 | `0x5a1ec141` | 0xae7bb61c | 0x19effcf5 | 0xe1dd275a | 0xb99ef3b1 |
| 36 | `0x22cfe5ca` | 0xba81a53c | 0x6ff4f72c | 0xeb0b13cb | 0x668eb33b |
| 35 | `0xd761efaa` | 0x689134ee | 0x2fad0fbb | 0x45189b4c | 0xf914bc3a |
| 37 | `0x6a6bb435` | 0x5a94dee5 | 0x36d2f7fd | 0x2d420eea | 0xe7b435cd |
| 38 | `0x6f41eec2` | 0x745e20d1 | 0xcccbde5e | 0x576e35ab | 0xf75cb660 |
| 40 | `0x80e14091` | 0x1a822fef | 0x92d5215b | 0x284d1706 | 0x4d079f7c |
| 39 | `0x33fe9ea5` | 0x92adf6ab | 0x0da7579c | 0xc8a41dbd | 0xc4362c53 |
| 41 | `0x19285534` | 0xe1ca9ae7 | 0x0e52e819 | 0xb5832869 | 0xc2052d59 |
| 42 | `0xd0f2db8c` | 0x6e2da130 | 0x0065f1e4 | 0xee883c15 | 0x83910036 |
| 43 | `0x61d80dca` | 0xdc23c0b0 | 0x19018e8f | 0xa178a9db | 0x1edc42f1 |
| 44 | `0x3373b346` | 0x29573491 | 0x93e5c458 | 0x9f6659d4 | 0x5da7b6fd |
| 45 | `0x294b5230` | 0x6d8f534a | 0x61e18f61 | 0xe0149cc0 | 0x352601c8 |
| 46 | `0x1096593c` | 0xe727f539 | 0x15eec73b | 0x97ae062d | 0xe338c1cd |
| 47 | `0xbdd56b79` | 0x4c5590a9 | 0x26b460a4 | 0x61919ec0 | 0x3828930b |
| 49 | `0x9a6990d4` | 0xd6c3dc87 | 0x1803e3f8 | 0xd63e7ff6 | 0xdb6317a1 |
| 48 | `0x09eb73b8` | 0x145785ab | 0x587dc87b | 0xa4979682 | 0xbe40c588 |
| 51 | `0x1d3a3723` | 0x7c0c78b5 | 0xf944d54f | 0x23257e33 | 0x33966711 |
| 50 | `0xecf10dc2` | 0x075fcc92 | 0xafc443c3 | 0xd1b59b4d | 0x572f3992 |

Full hashes: `loops.jsonl`.
