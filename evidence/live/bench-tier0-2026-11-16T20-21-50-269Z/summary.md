# Bench: LIVE · tier 0 · 51/51 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-16T20:25:46.670Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 51 | 1536 | 4506 | 7374 | 13375 |
| open sent → solver repaid (full loop), wall ms | 51 | 5012 | 7872 | 13073 | 17479 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 51 | 2400 | 3400 | 4400 | 6200 |
| open mined → fill seen (solver), wall ms | 51 | 689 | 1135 | 2033 | 2358 |
| fill seen → FillAccepted on Lasna, wall ms | 51 | 1227 | 3176 | 6552 | 6959 |
| settle requested → Settled on origin, wall ms | 51 | -3480 | 2 | 5427 | 10817 |
| fill → repaid, block timestamps, s | 51 | 1 | 1 | 2 | 2 |
| open → repaid, block timestamps, s | 51 | 2 | 3 | 5 | 6 |
| fill → FillAccepted, block timestamps, s | 51 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 51 | 1 | 2 | 2 | 2 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0xd11ccb17` | 0xd61475b5 | 0x17841a63 | 0x5cf53468 | 0xbf4314c2 |
| 1 | `0x4530c7b9` | 0x915cadb1 | 0x0487d333 | 0x3ec803a3 | 0xf6d89b5a |
| 2 | `0xfde1d173` | 0x061a53ea | 0x751ad371 | 0x51974bbf | 0xc285a41e |
| 3 | `0x4361afde` | 0x55b2d404 | 0xff67c72d | 0x924eb8df | 0xcb2883ce |
| 4 | `0x91fd6146` | 0x02bdab3d | 0x33207689 | 0x73c49a92 | 0x8fe72b51 |
| 5 | `0x480ca576` | 0x779144ab | 0x09db5fc1 | 0xc0f3078d | 0x5aab450a |
| 6 | `0x0890c086` | 0x143e6ce2 | 0x4fef8ac2 | 0x4fe43cc7 | 0x9752845a |
| 7 | `0xa7223003` | 0x89819380 | 0x2abcd642 | 0x424dcb46 | 0x7d8bd068 |
| 8 | `0x4185204e` | 0xb6c222c3 | 0x37e2fafd | 0xe9c07147 | 0x4aa096c7 |
| 9 | `0xa5cc5e4c` | 0xd66597f0 | 0xce4f40ce | 0xc539c04b | 0xe823f6b2 |
| 10 | `0xdb57fb19` | 0x497af4d0 | 0x4faf8df3 | 0x1b54e1e4 | 0x269048f2 |
| 11 | `0x3ae572c9` | 0x528f9f9f | 0xb31e0b32 | 0x26ca05a7 | 0x58cd06b3 |
| 12 | `0xd304845c` | 0x411f70aa | 0xc85a0693 | 0x573aac3e | 0x12196f06 |
| 13 | `0x30b40fe6` | 0x5295eda3 | 0x42b442fa | 0xb4f5cd81 | 0x38b3e811 |
| 14 | `0x12e75e94` | 0x8bdce561 | 0x85b8186e | 0x1c27521b | 0xb0617ba3 |
| 15 | `0x0e5ff01e` | 0x0137a52c | 0xa1cae500 | 0x71e8d245 | 0x83e694ee |
| 16 | `0x913f1a70` | 0xa570f0e8 | 0x40e33915 | 0x912e1dd8 | 0x5fdfc5f9 |
| 17 | `0xd53f8560` | 0x27d8a2d7 | 0x534dfa2a | 0xe178b348 | 0x8fe0f4a3 |
| 18 | `0x6c8fa785` | 0xc4b5d3ca | 0xdc715d15 | 0x731ae7ad | 0x404a1684 |
| 19 | `0xd19c8dc3` | 0xa9411b8b | 0x76d648fe | 0x341b47f3 | 0xaa8e7c7f |
| 20 | `0xe1820485` | 0xf7f1abd1 | 0x3a6c8a1e | 0x2a90bf0b | 0x2f8a31cb |
| 21 | `0x275a1fbf` | 0xa287d77e | 0x5a76f286 | 0xbcdc2805 | 0x7628a21e |
| 22 | `0xbb602f75` | 0x6cc6915c | 0xf4d096dc | 0x8dba8a9c | 0x6deff6b6 |
| 23 | `0xd03509f8` | 0xcdf5917f | 0x95c051bd | 0x26901f12 | 0x9d3d5fff |
| 24 | `0xecf13f71` | 0xfe2e1efb | 0xbdddbf37 | 0x9cda7735 | 0x06c913db |
| 25 | `0x6c8f6a79` | 0x52cda448 | 0xb431e4b1 | 0xf176c8d6 | 0x0b254d56 |
| 26 | `0x39eb65da` | 0x9e6ce008 | 0x96097f85 | 0xf62c2232 | 0x71a83cb7 |
| 27 | `0x844136e2` | 0xb8623655 | 0x5266d099 | 0x7c316ec4 | 0xf94b8c6d |
| 28 | `0xc8f118cb` | 0x877b9afd | 0xf7a29174 | 0x5329b696 | 0x7edc0cbb |
| 29 | `0xd462f8a4` | 0x1983ba33 | 0xc1f9d596 | 0xd2061d2e | 0x9fca09a7 |
| 30 | `0x927d6989` | 0x908d5492 | 0x587b4395 | 0x07b6fae0 | 0xef4341d8 |
| 31 | `0xce3ac45f` | 0xe91c0234 | 0x4930ed25 | 0xe9ace62b | 0xda2889cc |
| 32 | `0xf0745566` | 0x6a4ebfd0 | 0xd4d3605d | 0xfa6f6c5d | 0x3a4e2d01 |
| 34 | `0x4afbff68` | 0x06d2e7d6 | 0x8dca8fb9 | 0xafbdead1 | 0x4b5908fa |
| 35 | `0x65511cbb` | 0xf319e78d | 0x1a9a5ae2 | 0xd727edcc | 0x8f55a797 |
| 36 | `0xe99da0ba` | 0xf8631d54 | 0xcab2f8e3 | 0x0bbb3e11 | 0xd8377845 |
| 37 | `0x33ccacac` | 0xd5f2a091 | 0x2ceaac9d | 0xcf5a5036 | 0x54ff5bce |
| 38 | `0x67deb2af` | 0x9c910248 | 0x7f391c31 | 0xa0ed847f | 0x0a1031e3 |
| 39 | `0xe5be64dc` | 0x4bad8587 | 0x822439e1 | 0xe6fef537 | 0x48cf67c8 |
| 40 | `0x2f01b47d` | 0x56ed0640 | 0x5214e5e7 | 0x99cb6198 | 0x4038bd8f |
| 41 | `0xefaf9422` | 0x3207db61 | 0x3046e737 | 0x40965771 | 0xd944bd5e |
| 42 | `0x2f786c52` | 0x24511ded | 0xcfcb6c3c | 0x2b8f1bc3 | 0xa990caac |
| 43 | `0x9b1009d2` | 0xb506c3b7 | 0xf43e71fa | 0x9427d7b4 | 0x5992a3a9 |
| 45 | `0xb6925315` | 0xbbfbb110 | 0xe52c8ddb | 0xbec4c8a9 | 0xdfd5b8a8 |
| 44 | `0xa20b397c` | 0x3fe95de3 | 0xfa4e1e37 | 0xd5829bd6 | 0xeaf5cb8f |
| 46 | `0xeb4875b5` | 0x94b11c1f | 0x8a4587b3 | 0xba017225 | 0x102a7985 |
| 47 | `0x24672001` | 0x220b2cf9 | 0xed62df79 | 0x7edf27e3 | 0x2b37cbe8 |
| 49 | `0x1cc41bfc` | 0xb5a291dc | 0x6f946c2b | 0xdd111abe | 0xf3357eea |
| 48 | `0xbb73d50f` | 0xfcafe05a | 0xfce14d84 | 0xfcee4f4c | 0x4177d10b |
| 50 | `0x1e4c43f6` | 0x08783ea5 | 0x8293ca52 | 0x0bff649b | 0x6a16fae1 |
| 51 | `0xa715a234` | 0xf09f215e | 0x93a2fa53 | 0xe5cc2d4b | 0x07f60978 |

Full hashes: `loops.jsonl`.
