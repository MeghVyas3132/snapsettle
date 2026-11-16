# Bench: LIVE · tier 2 · 51/51 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 2500000 (token base units). Generated 2026-11-16T01:52:02.326Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 51 | 298609 | 303370 | 308739 | 309625 |
| open sent → solver repaid (full loop), wall ms | 51 | 309657 | 315497 | 319590 | 320726 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 51 | 307400 | 310800 | 313400 | 314800 |
| open mined → fill seen (solver), wall ms | 51 | 4297 | 9319 | 12797 | 14543 |
| fill seen → FillAccepted on Lasna, wall ms | 51 | -4512 | -102 | 2948 | 5222 |
| settle requested → Settled on origin, wall ms | 51 | -3686 | -2456 | 4197 | 5123 |
| fill → repaid, block timestamps, s | 51 | 304 | 306 | 307 | 307 |
| open → repaid, block timestamps, s | 51 | 307 | 311 | 313 | 314 |
| fill → FillAccepted, block timestamps, s | 51 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 51 | 1 | 2 | 3 | 4 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0xa0234af3` | 0xea7f417f | 0xaa1747e1 | 0xd3c8bf35 | 0x6897e2b6 |
| 1 | `0xdac418ec` | 0xc6978685 | 0x396c4c19 | 0xdfbb3db5 | 0xfee92307 |
| 3 | `0x407b7ae1` | 0xe9691021 | 0x58f2eef3 | 0x60ceee24 | 0xbc4be0ab |
| 2 | `0xd5ece5dc` | 0xbeb63ead | 0xa3a7329f | 0x2cc94688 | 0xb3c1ad36 |
| 4 | `0xd4d23391` | 0x1683c070 | 0xce2d64c8 | 0x9ae28a46 | 0x79906769 |
| 7 | `0x97180ca0` | 0xf579ec6e | 0xb4dc7524 | 0xd2b1c3a2 | 0xb8156a87 |
| 5 | `0x487d67e1` | 0x20fd8438 | 0xd6e77bfc | 0x09b2abb3 | 0x1d6c0440 |
| 6 | `0x7db2b866` | 0x94d03d36 | 0x75c97b86 | 0x918e380e | 0xe26b1804 |
| 8 | `0xcb110fc4` | 0x1df0f569 | 0x3120c4e9 | 0x376d3d5f | 0xda470201 |
| 9 | `0x902a850e` | 0x2f9d5532 | 0x7d606c01 | 0x0f693d19 | 0xb82b0dc7 |
| 10 | `0x57571924` | 0x72357074 | 0x030deacc | 0xf0d89596 | 0x4e33f619 |
| 12 | `0x25d5c7e2` | 0x508ed4f9 | 0xba4616d4 | 0xd013fec7 | 0x63e31710 |
| 13 | `0x991f2456` | 0xffb55f3b | 0xe3d4f48d | 0x3222e63d | 0x469fe8b5 |
| 14 | `0xae29746a` | 0x8aa43f90 | 0x9856745c | 0x3a8a3f4f | 0xbf6d4d41 |
| 15 | `0xa9edcd4d` | 0x6e7f7ee2 | 0xc98159c1 | 0x3dee16e2 | 0x21c7eff4 |
| 16 | `0xda6b823f` | 0x17d77d80 | 0x7f06278b | 0xf4ec3145 | 0x99f2ff80 |
| 17 | `0xd1619668` | 0x6f01d09d | 0xc29a9b59 | 0x9d44bb58 | 0xe492609b |
| 18 | `0x55ad82f2` | 0x04d751af | 0x021cb31d | 0xdafae1e6 | 0xc16748b5 |
| 19 | `0x376fb415` | 0xbedd0061 | 0x62d39a5a | 0xf051d98a | 0xf77f8bb7 |
| 20 | `0x972ac55c` | 0xf1a8fb63 | 0x7c11fd3e | 0xb6b3d5c3 | 0xca30cd28 |
| 21 | `0x4c139d9e` | 0x20e30dad | 0xc382c7f8 | 0x61858a55 | 0xb9a5bef0 |
| 22 | `0xc8f83102` | 0xf3767e0d | 0xfb5928d0 | 0xa5e74fcb | 0x38102428 |
| 23 | `0xddc1b731` | 0x7d659ad1 | 0xcf491377 | 0xfc1840bc | 0xe7fbb79d |
| 24 | `0x9f43127b` | 0xa76acf4b | 0xc35db0f0 | 0xf68f6bd1 | 0xbf902512 |
| 25 | `0x5a099133` | 0x34e01f22 | 0xf424f71f | 0x35ca4a20 | 0xb734de57 |
| 26 | `0xf2a34a6a` | 0xd2d68f0b | 0xbff69b09 | 0x13ba318d | 0x141b1be9 |
| 27 | `0xe3c36119` | 0x6d4973c8 | 0x62e0b406 | 0x3a50087a | 0xe4854c39 |
| 28 | `0x86929f57` | 0x73c5740d | 0xbe9f7a35 | 0x3b392074 | 0xfc4d1142 |
| 29 | `0x26ad7fc9` | 0x9bd92c2b | 0x09134f53 | 0xd1f9d0fc | 0x5752a370 |
| 30 | `0x19d8a5d2` | 0x3ccffe80 | 0x97edda9b | 0x0a3fcb0f | 0x1535c9df |
| 31 | `0x589f2636` | 0x73d07ea3 | 0x630c9078 | 0x48bba20a | 0x7fa1ee6b |
| 32 | `0xe6175465` | 0x4802cc66 | 0xe25d4ce1 | 0x4efe342c | 0x0f7c9b95 |
| 33 | `0xde388a8e` | 0xf48d6cbe | 0x0084bdaf | 0xc47135ea | 0x631e528b |
| 34 | `0x7cf3b8f7` | 0xc561b3e9 | 0xcec373db | 0x0c3e7236 | 0xa09ce4b9 |
| 35 | `0x7488f291` | 0xc4371c8a | 0x8518501c | 0xfcdc9da1 | 0x5a5c4f1a |
| 36 | `0xe45bf0d9` | 0x9af44f6e | 0xb22dacac | 0x581878d4 | 0xb7777647 |
| 37 | `0x77d1fa07` | 0xa71cbb46 | 0xbb79a1f0 | 0x3af4fd4c | 0xba5a5782 |
| 38 | `0x9da12c76` | 0x6e2f4ebb | 0x57164b27 | 0x82b16cd1 | 0xb221dc20 |
| 39 | `0x3e03d61c` | 0xb65159b4 | 0x34235f8d | 0x04b7288b | 0xe0db77a7 |
| 40 | `0xef8a1c7b` | 0xa54f80f1 | 0x313dfe29 | 0x98102ae0 | 0x6c669583 |
| 41 | `0xeda0c3c3` | 0xb88173b4 | 0xbe4e4997 | 0x4f887b0f | 0x082412c5 |
| 42 | `0xbf32cbc9` | 0xd440dd04 | 0x3d691449 | 0x3ee42313 | 0xa8a31dc4 |
| 43 | `0x62da8ab0` | 0x6040fde6 | 0x81c01a21 | 0xe6e8597f | 0x8afd632b |
| 44 | `0xbe9c6e6a` | 0xf128743c | 0xa31193ff | 0x7d00be5d | 0x642f34fa |
| 45 | `0xccad1a7e` | 0xe01de128 | 0xd3047e65 | 0xed8a7a2e | 0x9f2d0cb1 |
| 46 | `0xa407e5e4` | 0xe1c818b3 | 0xad3e3eac | 0x225d2994 | 0x02632571 |
| 47 | `0xd95e38f6` | 0x22b21a41 | 0x45ab3f0f | 0xb6442c5c | 0xc4dd55f7 |
| 48 | `0xe082a8bc` | 0x8c8186ae | 0x8ab72c05 | 0x63a88dd9 | 0x04327299 |
| 49 | `0x92bbc417` | 0x6d62b185 | 0x8a75232e | 0xaa5e4c10 | 0xbfd84045 |
| 50 | `0xcf7ac90a` | 0xfbbc45fd | 0xa2bb9b33 | 0x62c84002 | 0x7309b520 |
| 51 | `0xaaece05a` | 0x9075edfd | 0x5d1b17db | 0x6de1a317 | 0x0207dc79 |

Full hashes: `loops.jsonl`.
