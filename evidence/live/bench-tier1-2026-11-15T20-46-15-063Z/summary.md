# Bench: LIVE · tier 1 · 52/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 1000000 (token base units). Generated 2026-11-15T20:58:24.125Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 52 | 32564 | 40653 | 44749 | 45988 |
| open sent → solver repaid (full loop), wall ms | 52 | 38911 | 49362 | 56493 | 63446 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 52 | 36400 | 44200 | 51600 | 58000 |
| open mined → fill seen (solver), wall ms | 52 | 3580 | 7476 | 13926 | 17586 |
| fill seen → FillAccepted on Lasna, wall ms | 52 | 1032 | 3275 | 6448 | 7268 |
| settle requested → Settled on origin, wall ms | 52 | -2970 | -1 | 2663 | 4612 |
| fill → repaid, block timestamps, s | 52 | 31 | 36 | 41 | 41 |
| open → repaid, block timestamps, s | 52 | 36 | 44 | 51 | 58 |
| fill → FillAccepted, block timestamps, s | 52 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 52 | 1 | 2 | 3 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x9b72c165` | 0x370d20cd | 0xf3848bfb | 0xc02d227f | 0x4ddeb434 |
| 1 | `0x95f1cc1d` | 0x3f719d6d | 0x4e5bf1af | 0xb48b0ea2 | 0x69109285 |
| 2 | `0x043c5fb1` | 0xf1c57c5b | 0x10f2052d | 0x5e96d544 | 0x6f79be2e |
| 3 | `0x12995112` | 0xc67f169f | 0x6feb09de | 0x1fc20a46 | 0x7c08fe14 |
| 4 | `0x95c4fee9` | 0x0f9791d8 | 0x533605f6 | 0x692f2374 | 0x815a2e03 |
| 5 | `0x7b3b5117` | 0xfec63796 | 0x8069e1d9 | 0xe6c1c90e | 0xb1b2e08e |
| 6 | `0x9c7297e0` | 0x0b66e20f | 0xdfe39241 | 0x6a2fe8d4 | 0x68f7c829 |
| 7 | `0x9d06fb17` | 0xc03e2cc7 | 0x7f629ea6 | 0xd352c2ed | 0xf8a9ae2f |
| 10 | `0x74630235` | 0x7df61e0c | 0xf2f4b6c8 | 0x3fda9515 | 0x9e501082 |
| 8 | `0x1f6b6a82` | 0xb51853f5 | 0x295c3bed | 0xf4d2ac15 | 0x57dc36dc |
| 9 | `0xb193ac43` | 0x4af18992 | 0xbeec29b0 | 0x9f661696 | 0x34e5f6e7 |
| 11 | `0x69fb5b03` | 0x6d92aef2 | 0xfa9dc34c | 0x2538c134 | 0x373f3b54 |
| 12 | `0x452f21b1` | 0x089b17a7 | 0x1fd09a9c | 0xc28b3310 | 0x93d81aee |
| 13 | `0x2c86d972` | 0x0429b073 | 0x13c4dbba | 0x5546e157 | 0x47448eca |
| 14 | `0xf25c8b16` | 0x33dc7297 | 0xf25c89c8 | 0x263401d7 | 0xdef2fbab |
| 15 | `0x5d396891` | 0x5252a6ba | 0x9f289f86 | 0x6657a401 | 0x3160650f |
| 16 | `0x12052542` | 0xc24b8675 | 0xa566bab7 | 0xd0068348 | 0x4958c0d2 |
| 18 | `0xb4552f60` | 0x0b2d2a78 | 0x38ef533b | 0x9a5dbfe8 | 0x4cbd9dc9 |
| 17 | `0x90d90ed4` | 0x67d8271d | 0x18c6d9a6 | 0xa00ee37f | 0x020042cd |
| 19 | `0x1a8b6069` | 0xee18337a | 0x8941d3ff | 0x63238a0d | 0x15ddfdb0 |
| 20 | `0xc246b85a` | 0xf3a2ca9c | 0xa4475aeb | 0x6e0be7d1 | 0xd9d32c65 |
| 22 | `0x6cd493e6` | 0x04b1bb16 | 0x4703a4e8 | 0x9601bc23 | 0x4d08e22b |
| 21 | `0xe81c9118` | 0x3468ff06 | 0x4ed807c5 | 0xb5a5fc3e | 0xff37f90f |
| 23 | `0x03a89da5` | 0xa1c342c6 | 0xce4ee2bd | 0x78cbb399 | 0xe0f3f762 |
| 24 | `0x82025712` | 0xdda98d09 | 0x8b6a8164 | 0x731738f5 | 0xb76e6957 |
| 25 | `0x069cb4fd` | 0x8db47474 | 0xd235ee10 | 0x117c9c93 | 0xc7861f49 |
| 26 | `0x7cbde3c1` | 0xb890f0f1 | 0xc1ad375f | 0x1b12999c | 0x985d70a1 |
| 27 | `0x354f4b7d` | 0xc6afbd5f | 0xef6a69b4 | 0x2eb9a690 | 0x1fd0d27a |
| 28 | `0x135cd926` | 0x04b9965c | 0xdbb33186 | 0x7d49d6f7 | 0xeb6cd3f9 |
| 29 | `0xf406df78` | 0x9f4d21b1 | 0xaeeb48ef | 0xdbe1f7cf | 0xd567f42b |
| 30 | `0x6c0ebae6` | 0x085f1288 | 0xf744ccc6 | 0x6a520b19 | 0x20833acf |
| 31 | `0xc7da301d` | 0xfb68841a | 0xbb97ddfb | 0x3ff61152 | 0x7ef3f0c3 |
| 32 | `0xc54ee448` | 0x86e75214 | 0x518e6b73 | 0x6c374bd3 | 0x4d3c3c89 |
| 33 | `0x88b41cb3` | 0x1dd8d28d | 0xca89d463 | 0x7b78031c | 0x2af088e1 |
| 34 | `0xe7434f0d` | 0x32a00209 | 0x402e0871 | 0x3c601ead | 0x10070071 |
| 35 | `0xae74b498` | 0x8e01ecb6 | 0xa4452e94 | 0x5adc878e | 0x957d3f8a |
| 36 | `0x83388a97` | 0xad47ea14 | 0xd2844e52 | 0x657d4418 | 0x70eed551 |
| 37 | `0x1316d1cc` | 0x273109c0 | 0xed2923d8 | 0x292e9c32 | 0x595a77ee |
| 39 | `0xf5c01637` | 0x6aca7bdf | 0xc7401dd0 | 0xf3743014 | 0x3e019b56 |
| 38 | `0x3736e025` | 0xd8083e21 | 0x240d84a6 | 0x4b0976d7 | 0x143a8828 |
| 40 | `0x7cbfff56` | 0xa2c53791 | 0xc814b4d8 | 0xb2c8d8e9 | 0xecc31ac1 |
| 41 | `0x9a481da0` | 0x90cef29b | 0xf54df2fd | 0x4c4f70b3 | 0xa688cfd5 |
| 42 | `0xcc6dcfc8` | 0x97210501 | 0xafd0a1c2 | 0x539c7341 | 0x1d8ec98e |
| 43 | `0x7cff2f35` | 0x545825a8 | 0x7cb73357 | 0x680f4bf2 | 0xae238512 |
| 44 | `0x3139fe94` | 0x6cd746f6 | 0x44b80569 | 0xab9d0148 | 0xb13cf449 |
| 45 | `0xac4a921e` | 0x95941894 | 0xc0a0579f | 0x19642956 | 0xf2859b7e |
| 46 | `0x2e158a53` | 0xc50041f2 | 0xab8551f1 | 0x44d666fe | 0xb0802a6a |
| 47 | `0xadeb1ede` | 0x2665b5d3 | 0xb7532347 | 0x85e45a72 | 0x70cf600a |
| 48 | `0x71bd288b` | 0xa92ae2a0 | 0x103473d8 | 0xb551333a | 0x7608d6ea |
| 49 | `0x29f3edc2` | 0x325834c3 | 0x6bd1cbcb | 0x44fadd0a | 0xbcc9e028 |
| 51 | `0x5041fc58` | 0xe2b1a2b6 | 0xc97212e7 | 0x0ef0c00e | 0x58c881f2 |
| 50 | `0x5eb2353a` | 0x7bba37bb | 0xc1f5c90e | 0x7ffb0ea5 | 0xc8dd6fdd |

Full hashes: `loops.jsonl`.
