# Bench: LIVE · tier 0 · 52/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-16T18:38:53.058Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 52 | 1339 | 4566 | 6061 | 7274 |
| open sent → solver repaid (full loop), wall ms | 52 | 3469 | 7075 | 8902 | 9551 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 52 | 2000 | 2800 | 3800 | 5200 |
| open mined → fill seen (solver), wall ms | 52 | 82 | 715 | 1488 | 1559 |
| fill seen → FillAccepted on Lasna, wall ms | 52 | 1274 | 3316 | 5942 | 6198 |
| settle requested → Settled on origin, wall ms | 52 | -3611 | 1719 | 2132 | 4057 |
| fill → repaid, block timestamps, s | 52 | 1 | 1 | 2 | 4 |
| open → repaid, block timestamps, s | 52 | 2 | 3 | 4 | 6 |
| fill → FillAccepted, block timestamps, s | 52 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 52 | 2 | 2 | 2 | 4 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0xfc6c2137` | 0xed21bf2e | 0x0379e5d0 | 0xeff41429 | 0x7f02cabf |
| 1 | `0xc1c9bdee` | 0xfb252bbc | 0x19f85a49 | 0x0d1d610a | 0x80a359df |
| 2 | `0xd19c1caa` | 0xe3d39fb5 | 0x5647ba8b | 0x0db0cbd2 | 0x48c765b5 |
| 3 | `0xdb0dfe4a` | 0x231be382 | 0x20f9e6bf | 0xc3647f3b | 0xf10f59ff |
| 4 | `0x8ae9d654` | 0x9fde93fc | 0x03826a33 | 0x5a4054c0 | 0x181c2173 |
| 5 | `0x2c58c740` | 0x9317af16 | 0x9e71595e | 0xe7e4ebef | 0x2da684aa |
| 6 | `0x530f0988` | 0x4ca90347 | 0xacc01eb1 | 0x247c99d5 | 0x036ee6fe |
| 7 | `0x6840e7ad` | 0xf5f4794e | 0x324ab461 | 0xa1dde19e | 0x18f60f19 |
| 8 | `0x10050d2d` | 0xb37d9409 | 0xaf06640c | 0xb3b509e7 | 0xa6b90c26 |
| 9 | `0xcb92a2bd` | 0xce090928 | 0x1db16baf | 0xe076a541 | 0xa73bfa3a |
| 11 | `0xa0c89cbc` | 0x5fc9472a | 0xed4ce582 | 0x30a23287 | 0xecf7b19d |
| 10 | `0x8f3065de` | 0xd0417681 | 0x207253f0 | 0x2a5be7e8 | 0xd8545e95 |
| 12 | `0xf4a67f35` | 0x6c488378 | 0xbeb61b2b | 0x8672a5e1 | 0xbe15e889 |
| 13 | `0xbfc809f5` | 0x60c9d550 | 0x06efe7a1 | 0xab4d1478 | 0x82c93914 |
| 14 | `0xfb2b65ac` | 0x36eb1189 | 0x6228d916 | 0xe8424c65 | 0x65aa39f5 |
| 15 | `0x6759e599` | 0x44adc6b0 | 0x224f3f9b | 0x1bf52f50 | 0x74ac8b49 |
| 16 | `0x9fdd7ca1` | 0x449e06e7 | 0x9db6ce36 | 0xf7537907 | 0x967dcdf6 |
| 17 | `0x84d3b743` | 0xaf037786 | 0x516e0e42 | 0x62afa656 | 0xf4c1bae1 |
| 18 | `0x1cec4d16` | 0x5de6e5ac | 0xd881ee4d | 0x9be7ef54 | 0x8117ca60 |
| 19 | `0x21b0caf3` | 0xec4d725e | 0xf2c4ae48 | 0xc58f630c | 0x85ef82ad |
| 20 | `0xa3a180ec` | 0x01cfae2c | 0xb1eb8d39 | 0xe2531714 | 0x793c42c7 |
| 21 | `0x0be8e425` | 0x1c7e83f1 | 0xade1cfb5 | 0x22e2191c | 0xc4fcf00f |
| 22 | `0x7486f32a` | 0x90ac2b42 | 0xfb74dddc | 0xbc67425b | 0x3d3df6cb |
| 23 | `0x28470c97` | 0x77075923 | 0x6aaf5a8c | 0x2a918baf | 0x2640187f |
| 24 | `0x68092ca6` | 0x8ec0136b | 0xa51ee048 | 0xe1048b57 | 0xd7046e4a |
| 25 | `0x3d2957d4` | 0x9083c2a5 | 0x9ffef2c4 | 0x7ae30c4c | 0x9b360ee8 |
| 26 | `0xb7889020` | 0x7218b4e7 | 0xd9bbf56d | 0x70529c76 | 0xad23acfd |
| 27 | `0x8cf73d01` | 0x792930c7 | 0x422d53cc | 0x286db2a2 | 0x653f3fee |
| 28 | `0x693ac769` | 0xd8756b0b | 0x49a6a76d | 0x2c5e456e | 0x70e5dccd |
| 29 | `0x66ba3190` | 0xb7b87f81 | 0xff987d06 | 0x8226eb61 | 0xb2447d1c |
| 30 | `0x9edfc870` | 0xbcbc09dc | 0xe5b5d82c | 0xb150f3b4 | 0x82663c48 |
| 31 | `0x59f67d99` | 0xf68f2fa9 | 0x467dab40 | 0x824680cb | 0x5f28c82e |
| 32 | `0xd2795b93` | 0xb50520f8 | 0x6e0ea913 | 0x738b329b | 0x04184d52 |
| 33 | `0xd050a951` | 0x12075de1 | 0xd3f3275b | 0xcb45a127 | 0x69952cbf |
| 34 | `0xd913aac5` | 0x6930c0db | 0x56cdea9e | 0x831db268 | 0x3a932c85 |
| 35 | `0x77f0baf1` | 0x689599c7 | 0xc54ae420 | 0x2a7e1cac | 0xd6dd31d3 |
| 36 | `0xd352edee` | 0x2c89fdb1 | 0xbc16179b | 0xa80dd20c | 0xa9e40928 |
| 37 | `0xbe75220a` | 0xd3fd5050 | 0xf848063e | 0x56a5a997 | 0x884f74ad |
| 38 | `0x5e5d29bc` | 0xd6fee339 | 0x7b96e25f | 0xf0dcdb90 | 0x19477177 |
| 39 | `0xa73c961d` | 0x4d4b5fcb | 0xc9f2f1ab | 0x0aba9fb5 | 0x77b599a3 |
| 40 | `0x9bb73f92` | 0xc3565d12 | 0xa7ba23ed | 0xcc8651d0 | 0x0688e7e3 |
| 41 | `0xae600dfc` | 0x40341302 | 0x3f510e0e | 0xdddc226e | 0x9cd326db |
| 42 | `0xd513e750` | 0x553a4be6 | 0xae74a276 | 0xd558f98c | 0x077db8e0 |
| 43 | `0x18de3743` | 0x3585726c | 0x418135b3 | 0x9f0cd63f | 0x6b423bd7 |
| 44 | `0x9fdd4b81` | 0x90b76e78 | 0x50aaf753 | 0x50613e5f | 0x968be652 |
| 45 | `0xf7feb64a` | 0xc1ec6444 | 0x35f0002e | 0xed18f081 | 0xcc272665 |
| 46 | `0xda5e3b28` | 0xe0c14f04 | 0x8e52bac8 | 0x1b55ead4 | 0xfe35e45d |
| 47 | `0xe347b9e3` | 0x04488e35 | 0xd25f78d3 | 0x04cf03a3 | 0xaf7ecfb6 |
| 48 | `0x9c2da347` | 0x1c1d2bd4 | 0x9bdb20e0 | 0x25bd5319 | 0x0a6eaa2b |
| 49 | `0xcab7cd47` | 0xa278fd08 | 0x599e22e7 | 0xd643dd23 | 0x460c30a9 |
| 50 | `0xb481d552` | 0x705cf91f | 0xa806418a | 0x64b01181 | 0x3f963ab9 |
| 51 | `0x39902eb4` | 0x102106b0 | 0x9bf1c808 | 0x32e6935b | 0xe29b3910 |

Full hashes: `loops.jsonl`.
