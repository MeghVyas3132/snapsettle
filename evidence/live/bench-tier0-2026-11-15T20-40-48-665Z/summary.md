# Bench: LIVE · tier 0 · 52/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-15T20:46:13.921Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 52 | 1535 | 4300 | 6756 | 6859 |
| open sent → solver repaid (full loop), wall ms | 52 | 7677 | 13108 | 19041 | 25908 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 52 | 4800 | 8400 | 15600 | 21800 |
| open mined → fill seen (solver), wall ms | 52 | 3072 | 6448 | 14032 | 18846 |
| fill seen → FillAccepted on Lasna, wall ms | 52 | 1429 | 3686 | 6452 | 7477 |
| settle requested → Settled on origin, wall ms | 52 | -3482 | 2253 | 2967 | 2971 |
| fill → repaid, block timestamps, s | 52 | 1 | 1 | 2 | 2 |
| open → repaid, block timestamps, s | 52 | 5 | 8 | 16 | 22 |
| fill → FillAccepted, block timestamps, s | 52 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 52 | 1 | 2 | 2 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0xec29c214` | 0x5067588c | 0x4a70f905 | 0x81680f25 | 0xd336d55e |
| 1 | `0x73081c97` | 0x8e215dd8 | 0xf6cd2925 | 0x7fd8d542 | 0x33508404 |
| 2 | `0x869b9f72` | 0x8c850474 | 0xf8b52a19 | 0xe7ae3f26 | 0x3420c6e1 |
| 3 | `0xff89fbbb` | 0x68a2853b | 0xef2b6877 | 0x802d8226 | 0x14b99659 |
| 4 | `0x5cbcf0d4` | 0x75088289 | 0xf57b002b | 0xfe12c74b | 0x1346f095 |
| 5 | `0x1d093be8` | 0x0a56c3b8 | 0x12478eba | 0x81af5d24 | 0x92ba0918 |
| 6 | `0xe908dbf1` | 0x1a6a3f1b | 0xa6ae03a2 | 0x7ff67635 | 0x4efc49e7 |
| 7 | `0xafa802a6` | 0x507cc82f | 0x8084ca23 | 0xd7e51019 | 0x5d7d5b22 |
| 8 | `0x21b2e7d0` | 0xbf9983e9 | 0x4b347b6c | 0x100f1345 | 0x980ed0a9 |
| 9 | `0x2bd3cea7` | 0x84f861cd | 0x6837fd54 | 0x2c7233bd | 0xc54d33a7 |
| 10 | `0x71adb382` | 0x83c669a9 | 0xfce16776 | 0x0178703c | 0x9fce1cb7 |
| 11 | `0x1e2d55ab` | 0x7b515d15 | 0x7fe0cac5 | 0xd110a377 | 0xfe0321eb |
| 12 | `0x91b97091` | 0xfebee3f7 | 0x66946646 | 0x2f4ac581 | 0xf7dc8512 |
| 13 | `0x86d19dd5` | 0xeabbb0af | 0x114e4ea5 | 0x4e9b54db | 0x1d69a854 |
| 14 | `0xb83ae8da` | 0x4a2d2252 | 0x5c3c5eb9 | 0x67c6707a | 0xa85943a6 |
| 15 | `0x75a61170` | 0x8a3f0719 | 0xa70dcf52 | 0xd3c371a5 | 0xe208032c |
| 16 | `0x397ef51e` | 0x0bb5b266 | 0xd0cdfb98 | 0x55950213 | 0xf4998132 |
| 17 | `0xc7a18456` | 0x094cd364 | 0x6d52d5e8 | 0xa3b4c396 | 0x9e892494 |
| 18 | `0x103d8f7d` | 0xa17e8903 | 0x671c5d21 | 0x9c6b2c79 | 0xc7fe0666 |
| 19 | `0x88a264eb` | 0x2df53270 | 0x5d187589 | 0xb8cc08ea | 0xe6a29bbf |
| 20 | `0x7b78ea76` | 0x07719556 | 0xb7b4627c | 0x2cb2c426 | 0xf195a0c8 |
| 21 | `0x928ab259` | 0x1a38e245 | 0xb657a2b4 | 0x8ed33da9 | 0xda998598 |
| 22 | `0xbd38737b` | 0x2ea28551 | 0x6cb773fb | 0xa657e044 | 0x0cd8b8a2 |
| 23 | `0x0c98a281` | 0xe93580a3 | 0xdc958aae | 0x636f7be8 | 0xc9536df1 |
| 24 | `0x1678fa0b` | 0x44607afc | 0x208a0613 | 0xa9e9893e | 0xd2bf9fca |
| 25 | `0xffa6beb5` | 0xdc9c6c4c | 0x1b66bb83 | 0x3f50934f | 0x22d5c851 |
| 26 | `0xb7742417` | 0x54ea3f7f | 0xb9b13aac | 0xbb3f0af2 | 0x6c454158 |
| 27 | `0xe6834af5` | 0x5a2686f8 | 0x49df0340 | 0xd039d5b6 | 0xd55e5200 |
| 28 | `0x891b12ac` | 0x162e5be5 | 0xa2e84e04 | 0x7b4bfbf7 | 0x0e852202 |
| 29 | `0x4582b870` | 0x0882831f | 0x4e785c35 | 0xe46f70f1 | 0x4a3a5062 |
| 30 | `0x7759da6b` | 0x0c9c0719 | 0x47bd242d | 0x879215b4 | 0x4bcb1213 |
| 31 | `0x08a31237` | 0x7b5f7f55 | 0x34be00ec | 0xfd471bc2 | 0xe3b807d2 |
| 32 | `0x0ce9d552` | 0x26cd2fde | 0x0d4ae011 | 0x44578104 | 0xce886a92 |
| 33 | `0x8375ed2e` | 0x72466716 | 0xc48c7fca | 0xe05754fd | 0x3afc0498 |
| 34 | `0x26ab37b5` | 0x1de089e7 | 0x34127bb9 | 0x9fdda413 | 0x768a9289 |
| 35 | `0x8d03ca21` | 0x76ad53e5 | 0x356af1ff | 0xdb8f9429 | 0xaa3a19e1 |
| 36 | `0xdf5399ae` | 0x196fb089 | 0x9abf3bfc | 0x0b5795b3 | 0x3fa77392 |
| 37 | `0x47e892d5` | 0x5b183480 | 0x03f582d2 | 0x9d2b86d5 | 0x6f80ad45 |
| 38 | `0x10072888` | 0xe2704ce4 | 0x58a6f00f | 0xda2624ea | 0x5256a64b |
| 39 | `0xf8b03c3f` | 0xc21a44d8 | 0x51fb6849 | 0x4a512bc0 | 0x3c683ff2 |
| 40 | `0x385450c5` | 0xd01c0825 | 0xad806b11 | 0xbbc9a0bd | 0x823ed133 |
| 41 | `0x572b523f` | 0x9fcff984 | 0xd42b1a4d | 0xbb586337 | 0xc532f69a |
| 42 | `0xc64e03fb` | 0x1362ddef | 0x669c3ac4 | 0x9501f293 | 0xc7c5f135 |
| 43 | `0xaf84897c` | 0xca0ead71 | 0xaa29425e | 0xa87fdc00 | 0xac0af63a |
| 44 | `0xdd916b94` | 0x333d125d | 0x9dedd7e6 | 0x63aaee38 | 0x603c841e |
| 45 | `0xc375e8d4` | 0xa0a7b814 | 0x0cff1d0c | 0x089b6749 | 0xda90aef7 |
| 46 | `0x8432a9ed` | 0x256b3399 | 0x55381e9f | 0x9b0492ea | 0x967b6dd5 |
| 47 | `0x0f162f63` | 0x52d439ab | 0xf068ec5a | 0x164a592b | 0x0324bb21 |
| 48 | `0x19af47fb` | 0x6fe85fe2 | 0x7797b553 | 0x32d8a88d | 0xa269ab0f |
| 49 | `0x82448d55` | 0xc4dfbcf6 | 0x85c99b6a | 0xbb816937 | 0x8fe7c2a0 |
| 50 | `0x670088dc` | 0xb4dc736f | 0x92b2de52 | 0x5a6ad5e3 | 0x1bc30069 |
| 51 | `0x125533a9` | 0xeec06c94 | 0xdaa14fe2 | 0x252115b6 | 0x41b6a0d7 |

Full hashes: `loops.jsonl`.
