# Bench: LIVE · tier 1 · 52/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 1000000 (token base units). Generated 2026-11-16T20:36:16.238Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 52 | 34201 | 37687 | 40753 | 42799 |
| open sent → solver repaid (full loop), wall ms | 52 | 37681 | 41167 | 44436 | 46279 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 52 | 34600 | 36600 | 37600 | 38400 |
| open mined → fill seen (solver), wall ms | 52 | 509 | 1122 | 1640 | 2350 |
| fill seen → FillAccepted on Lasna, wall ms | 52 | 816 | 3316 | 7103 | 7577 |
| settle requested → Settled on origin, wall ms | 52 | -2 | 2 | 4609 | 6115 |
| fill → repaid, block timestamps, s | 52 | 33 | 35 | 36 | 36 |
| open → repaid, block timestamps, s | 52 | 35 | 37 | 38 | 38 |
| fill → FillAccepted, block timestamps, s | 52 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 52 | 2 | 2 | 2 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0xf1427c9d` | 0x7a8256d2 | 0xd61641c4 | 0x6863f3d6 | 0x2c01c6d8 |
| 1 | `0xe6d0312e` | 0xac9b4070 | 0x4b0dd84a | 0x11de1917 | 0xf5d96378 |
| 2 | `0x76700e86` | 0xe7f4ad01 | 0x754b21db | 0xe76e92bd | 0xc25dd8c9 |
| 3 | `0x233a2eb6` | 0x92a1a826 | 0xecbb289e | 0x387daf67 | 0x957651cd |
| 4 | `0x67864bc7` | 0x53157e4d | 0xdb28fcb0 | 0x38510a3c | 0x1e2bec21 |
| 7 | `0x4e86de23` | 0x1e685f78 | 0x804e64a7 | 0x0f836112 | 0x9664f0e5 |
| 6 | `0x2d8631e0` | 0x264749be | 0x69f33c04 | 0x0045ba80 | 0x4458c035 |
| 5 | `0xd2305bfb` | 0xa4fda969 | 0x60b5878d | 0x820709dc | 0x491e3676 |
| 8 | `0x11655148` | 0xf7cd1114 | 0xa59e390a | 0x9440058d | 0x0d60fc37 |
| 9 | `0x6d93e9fb` | 0x930ac1a9 | 0xad6f7ca6 | 0xdfa316d6 | 0x082689a6 |
| 10 | `0x9bc6f2a3` | 0x2cee27b2 | 0xf1d3fd7c | 0x43256b9a | 0xac659ea9 |
| 11 | `0xdde46c24` | 0x2ca0202c | 0x95d8f628 | 0x2d4c4f7e | 0xc2ad0b45 |
| 12 | `0x7a9b5abb` | 0x13761536 | 0xade95087 | 0x7c22581a | 0x1bba79d2 |
| 13 | `0xc42f9f33` | 0x26bcb780 | 0xfcdcd2d5 | 0x8a9c732e | 0x99f1eef1 |
| 14 | `0x1d4c0626` | 0xec5ec53b | 0x0a06c875 | 0x1e8edb0d | 0xdeb2c215 |
| 15 | `0xe74882ea` | 0x85e9fbda | 0xf07112a3 | 0x182362f9 | 0xa9f0c69f |
| 16 | `0x832cf9b3` | 0x1c42e7ff | 0x084f8aeb | 0xcb5ba552 | 0x80226658 |
| 17 | `0x1a098bf8` | 0x4aef951f | 0x29acb9ec | 0x7fc35390 | 0xe0b7acee |
| 18 | `0xe0911f20` | 0xdc0482db | 0x8ca1ca4f | 0x331e2f34 | 0x36151923 |
| 19 | `0x6df4a9aa` | 0xbb3676dc | 0x1d0b9b1e | 0xfa267cd3 | 0x09c47913 |
| 21 | `0x3a6062d1` | 0xc290eeb3 | 0x7305f756 | 0x5613102a | 0x2aff3eac |
| 20 | `0xabf971cf` | 0x2fa7293f | 0x10d80620 | 0x12313226 | 0xb56df8dc |
| 22 | `0x7fc9a42c` | 0xbdc2e2fe | 0x8907e9a8 | 0xe7fb8b8e | 0xecd62886 |
| 23 | `0x9102107a` | 0x66c3fdf5 | 0x0f7ced3a | 0x5d6ec395 | 0xa6e07c6c |
| 25 | `0x6f2b0edc` | 0xb36ecfc4 | 0x1e41536d | 0xd52ad2dd | 0xdb91168c |
| 24 | `0xa8e43ca1` | 0x8c74a116 | 0x3a8c164b | 0x8f2182c4 | 0xa5141224 |
| 26 | `0xd3885002` | 0xb8fa5e7f | 0x56745267 | 0x3ada3b3a | 0x7419cefc |
| 27 | `0x2509eeca` | 0x1a199f6c | 0xfa9d7be6 | 0x655f105b | 0x3e918821 |
| 28 | `0x5640b32a` | 0x3516f388 | 0x1e711011 | 0xc87641ba | 0x734a3556 |
| 29 | `0x2806a7dd` | 0x4fdb7184 | 0xe9517ced | 0x3ecd26cf | 0x272dd99c |
| 30 | `0x6af2082a` | 0x96a62428 | 0x87f0d875 | 0x4986315c | 0x6c2a7251 |
| 31 | `0xb4f57b70` | 0xa28443f2 | 0xb36a2b78 | 0xa6eddd1b | 0x3ba63332 |
| 32 | `0xd11809f4` | 0x4d656f11 | 0x46ee605f | 0x5c383ade | 0x4d67a8e3 |
| 33 | `0xfdd54bbe` | 0xb4d6e960 | 0x93ea5f75 | 0x0a0f65de | 0xe064240e |
| 34 | `0xbe5c1d54` | 0x0f7f6f82 | 0xe1f64ae9 | 0xa3ba88e9 | 0x94e50a28 |
| 35 | `0xfbd96bb2` | 0x9701d120 | 0xf7511d0c | 0x4a18b625 | 0x732d3de2 |
| 36 | `0x6aaeafd7` | 0xee572180 | 0x840398a6 | 0xbc1155bc | 0x3d198ab0 |
| 37 | `0x82d51f43` | 0xcb235479 | 0xea30740c | 0xb04763b9 | 0x5df1e27a |
| 38 | `0x944c3d13` | 0xd55972f0 | 0xe8ada2b3 | 0x9c1a7ec5 | 0xe76497cf |
| 39 | `0x1ffc7ec3` | 0xa44f872a | 0x6ac99ba8 | 0x65e02fc5 | 0x5ba0a328 |
| 40 | `0x32d27b70` | 0x86798f49 | 0x798d0606 | 0x59b9a73d | 0xc15fc87a |
| 41 | `0x701eb05f` | 0x277a3612 | 0xb50e2eb1 | 0x1b4db887 | 0xb613765c |
| 42 | `0x2e34606e` | 0x37e0960e | 0xa105d195 | 0x95ad8fed | 0xc40a2106 |
| 43 | `0x4c93947f` | 0x2845f951 | 0x2bc36f5a | 0x4dcf6cc5 | 0xc0504941 |
| 44 | `0x5dff7615` | 0x70d50cf4 | 0x4bdbd620 | 0x35ceb550 | 0x5bc79caf |
| 45 | `0x1bd8d0eb` | 0x5e98d873 | 0xa47a1979 | 0xd448ae8e | 0x2ea0a445 |
| 46 | `0x4ac14c01` | 0x8aa5a8fd | 0x2079ebe6 | 0x5882df8e | 0x9c82c596 |
| 47 | `0x07c24ec0` | 0xb137c1ad | 0xa0bcd022 | 0x6f4e080a | 0x66f160c5 |
| 48 | `0x0ceb5210` | 0xaad0f92e | 0x88478fd3 | 0x3e69be95 | 0x77534d48 |
| 49 | `0x27a687c9` | 0xd8d88ab2 | 0x41163790 | 0x5070e911 | 0x25366ae7 |
| 50 | `0xa792f906` | 0xb4a72cdd | 0x079a1311 | 0x8223e7ec | 0x59f0e554 |
| 51 | `0xa3ae40e3` | 0x21d9e91a | 0x7b4d96f6 | 0x6eede47b | 0x0ab358bc |

Full hashes: `loops.jsonl`.
