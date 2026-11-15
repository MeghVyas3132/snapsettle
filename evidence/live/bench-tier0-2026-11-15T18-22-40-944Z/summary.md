# Bench: LIVE · tier 0 · 49/49 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-15T18:29:06.047Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 49 | 1430 | 4230 | 6496 | 6882 |
| open sent → solver repaid (full loop), wall ms | 49 | 6091 | 11811 | 15609 | 16924 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 49 | 4200 | 7200 | 10200 | 11400 |
| open mined → fill seen (solver), wall ms | 49 | 1893 | 5073 | 8462 | 9179 |
| fill seen → FillAccepted on Lasna, wall ms | 49 | 559 | 4169 | 6674 | 7417 |
| settle requested → Settled on origin, wall ms | 49 | -3661 | 82 | 4060 | 5098 |
| fill → repaid, block timestamps, s | 49 | 1 | 1 | 2 | 2 |
| open → repaid, block timestamps, s | 49 | 4 | 7 | 10 | 11 |
| fill → FillAccepted, block timestamps, s | 49 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 49 | 1 | 2 | 2 | 2 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 1 | `0x3b952bc0` | 0x3a5f1675 | 0xd90c56b8 | 0x16b3915d | 0xbb9f426d |
| 0 | `0x352a40a7` | 0xb56f7893 | 0x919f529c | 0x5dc38579 | 0xff504452 |
| 2 | `0x1fcca040` | 0x18d139ad | 0x63d16276 | 0x9a86f4db | 0xa004bdeb |
| 3 | `0xe8cd3a66` | 0x822350fe | 0x5c692b4d | 0xd7b84e27 | 0xe3012621 |
| 4 | `0xdf8b7885` | 0x233c3ba3 | 0x1bddb23c | 0x03a26d3e | 0x6ea99560 |
| 5 | `0x322d33d9` | 0x537c4183 | 0x0bb1a6d6 | 0x5825aa0e | 0x6e3cb5f4 |
| 6 | `0x5c648c88` | 0xd8547ad7 | 0x53e91fcf | 0x0cc0422e | 0xcf0ede8b |
| 7 | `0x23a75505` | 0x67243371 | 0xc3faf939 | 0xde92a22b | 0x81049965 |
| 8 | `0xd0f7f908` | 0x1403a2a1 | 0xc4e59f86 | 0xa7b773f8 | 0xf2fa4b56 |
| 9 | `0x361510f1` | 0x297eb8aa | 0x33a60f73 | 0x20ac4e59 | 0x84a63de8 |
| 10 | `0xa1ffb492` | 0x9120f6e5 | 0xd44efe54 | 0xaccab360 | 0x8ca058f1 |
| 11 | `0xb4d6a1d1` | 0xff183bff | 0xd86e2569 | 0xdafbc69e | 0x28823148 |
| 12 | `0x6c5a6cee` | 0xe88e4d6a | 0x7157af7b | 0x52e4343f | 0x90c3c959 |
| 13 | `0xeffa1ed4` | 0x97284fe0 | 0xe59fe025 | 0x19d7988c | 0xb22981bf |
| 14 | `0x052ee554` | 0xee026261 | 0xb7d665ff | 0x41b836c8 | 0x04555e27 |
| 15 | `0xe3ba856d` | 0xded4599f | 0x56c5b45a | 0x65e3f246 | 0x532b7667 |
| 16 | `0xf2d61d7c` | 0x723c8c27 | 0xa6fe755d | 0x475e6976 | 0xa4364948 |
| 17 | `0x7766f4fe` | 0x3c5ab072 | 0xbc13aa4e | 0x8495fa48 | 0x74ba6545 |
| 18 | `0x1daf21ef` | 0x902a1382 | 0xc30ac78e | 0xe0c23baf | 0xc4b90769 |
| 19 | `0x2532ca14` | 0x83c71dde | 0x4bd09a93 | 0x97877d47 | 0x6fe7eb58 |
| 20 | `0xae72e488` | 0xd8fc35c7 | 0x20cc599d | 0x3e8fd42b | 0xabe82889 |
| 21 | `0x547f2d99` | 0xaf3c3e76 | 0x82fa2ab2 | 0x6a293d7a | 0x75124cbd |
| 22 | `0xa81e3c2a` | 0x63721da1 | 0x84402d37 | 0xae0e716c | 0x465a77b1 |
| 23 | `0x8df1a6d9` | 0x38e5a824 | 0x61d54e26 | 0x5f00dee1 | 0xbaf169fa |
| 24 | `0x57ca66e9` | 0x359aa2b1 | 0x3b7eae99 | 0x73def3f1 | 0x8c7c5954 |
| 25 | `0x0ab694ab` | 0xa125d8d6 | 0xa992fbc4 | 0x857ff521 | 0xa283d459 |
| 26 | `0xcde6c383` | 0x0d93f105 | 0xb77eb83e | 0x055083af | 0x0c773680 |
| 27 | `0x29904c18` | 0xeb9b870c | 0xa9f33a36 | 0x7e3c3a9e | 0xcd40a0cc |
| 28 | `0x5b900126` | 0x233a9007 | 0x5e3d0fcb | 0x4492f2a2 | 0x4ae9f069 |
| 30 | `0x47667d88` | 0xbb034b15 | 0xa12f63f6 | 0x9fa60659 | 0xed9b82e5 |
| 31 | `0x47c6a67d` | 0x7b55a4e4 | 0xcdcb10b6 | 0x3be26fe0 | 0xe9568ba7 |
| 32 | `0x14b58625` | 0x9ebdaaf0 | 0xdc3ffba3 | 0x45d16818 | 0xc2aa2092 |
| 33 | `0xe4141988` | 0x57717c56 | 0xe88ccb73 | 0xf7025ee5 | 0xcdd2cb29 |
| 34 | `0x96e05ca7` | 0xb9d6778b | 0xfdb765a1 | 0xc91cb19d | 0xaa20363f |
| 35 | `0x83744911` | 0xafdd9609 | 0x196c0d77 | 0x819bb753 | 0x7a8a9f9a |
| 36 | `0x9edba572` | 0x473a3d6a | 0x7ba5009f | 0xe9a3f5e9 | 0x1c6d15cb |
| 37 | `0x7c975788` | 0xa2fe193a | 0x00457b90 | 0x286394ee | 0x81c94183 |
| 38 | `0xc0afac91` | 0xa569bbd1 | 0x211b17bb | 0x39422d38 | 0xf81b411d |
| 39 | `0xd3993f96` | 0xa4e3c548 | 0xad766b1c | 0x11e6dce8 | 0xb6606cae |
| 40 | `0x67325c5d` | 0x835ac8e3 | 0x49de6691 | 0xae041011 | 0xb282f0a8 |
| 41 | `0x3013ac5a` | 0x45d7f686 | 0x4d4931b0 | 0x9d18bdbc | 0x1b7453b2 |
| 42 | `0xb42a0357` | 0x89ac66cf | 0xa0331509 | 0x221e1d66 | 0xb67f1b23 |
| 43 | `0x2bef061f` | 0xb23f0497 | 0x6f1af51d | 0x505398aa | 0x92123c12 |
| 44 | `0x38a39862` | 0x24113a4b | 0xd194c83f | 0x4ddc03e5 | 0x4e4dec7b |
| 45 | `0xd61af291` | 0xae3bd5df | 0xab9095ff | 0x92bebac1 | 0x53cda5b1 |
| 46 | `0xdc64786c` | 0x7e81ff52 | 0x81904aca | 0x6daa8bbc | 0x5048e81a |
| 47 | `0xe638047c` | 0x04f7085e | 0xd5f79ec9 | 0x18cacd1a | 0x0fca78e2 |
| 48 | `0xd8abb3bf` | 0x03d49f68 | 0x98c4d2c7 | 0x98981922 | 0x2e9b5986 |
| 49 | `0xbf9f6420` | 0x0af44f23 | 0xeda6bdac | 0x18f5e170 | 0x14db6a25 |

Full hashes: `loops.jsonl`.
