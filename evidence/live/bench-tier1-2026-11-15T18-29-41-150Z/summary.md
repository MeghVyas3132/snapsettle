# Bench: LIVE · tier 1 · 49/49 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 1000000 (token base units). Generated 2026-11-15T18:38:37.284Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 49 | 33372 | 40580 | 44435 | 46836 |
| open sent → solver repaid (full loop), wall ms | 49 | 39307 | 48460 | 53932 | 56925 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 49 | 35200 | 44200 | 48600 | 52800 |
| open mined → fill seen (solver), wall ms | 49 | 2896 | 5785 | 11035 | 14529 |
| fill seen → FillAccepted on Lasna, wall ms | 49 | 1000 | 4352 | 6312 | 8181 |
| settle requested → Settled on origin, wall ms | 49 | -3349 | 1724 | 3368 | 3742 |
| fill → repaid, block timestamps, s | 49 | 31 | 37 | 41 | 42 |
| open → repaid, block timestamps, s | 49 | 35 | 44 | 49 | 53 |
| fill → FillAccepted, block timestamps, s | 49 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 49 | 1 | 2 | 3 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x98cd27d8` | 0x5cd9fcb0 | 0x0f5b689b | 0xacefa960 | 0x1d7b96be |
| 1 | `0x485c2e49` | 0x5c1932f9 | 0xccef4dfc | 0x2a9acebc | 0xe56d5d10 |
| 3 | `0x84c11d77` | 0xd20192da | 0xf6377d95 | 0x7adef1f1 | 0x94b47ce8 |
| 2 | `0xfdba612b` | 0x592b48fd | 0xea630ab8 | 0x0633d5ec | 0x55e0ccd0 |
| 4 | `0x9c3fa466` | 0x66650cb9 | 0x0764776d | 0x30e98642 | 0x630d6b1d |
| 5 | `0x16133cb6` | 0xbdbbe439 | 0xe943cd3a | 0x60081fa6 | 0xc5d6e8c5 |
| 6 | `0xbf5dcc37` | 0xe47f1c54 | 0x64b9b7be | 0x53a70b45 | 0xc7ff4383 |
| 7 | `0x05bbf340` | 0x2d06cdee | 0xbaea47b6 | 0xfe8603b6 | 0xcac62df3 |
| 9 | `0xf3200c7b` | 0x283cb8b8 | 0xa4af27c7 | 0xcd95e143 | 0x13677a7d |
| 8 | `0x9c261eeb` | 0x282d14fb | 0xed1fcd04 | 0x8b0d02a9 | 0xb9167729 |
| 10 | `0x4d207301` | 0x2019687d | 0x0237f8c2 | 0x69802f50 | 0x806b8297 |
| 11 | `0xccc230cb` | 0xdeb44e95 | 0x5858658a | 0xcdc102e1 | 0x7a60330c |
| 12 | `0xf591d2a8` | 0x2097864d | 0x02738b88 | 0x2cff52a0 | 0x28453264 |
| 14 | `0x7dc70064` | 0x14f36f3e | 0x040b00b6 | 0x374fe1d6 | 0x887b4e81 |
| 13 | `0x71f6d7e3` | 0x7e162d62 | 0x9d336501 | 0x883469b0 | 0x2ffe183b |
| 15 | `0xa8fe1351` | 0x4bf86c7c | 0x23bbe071 | 0x88134056 | 0xd21530ec |
| 16 | `0x10a17f09` | 0x41d69886 | 0x3794f32f | 0xcb86692d | 0xe300ebd6 |
| 17 | `0x24192531` | 0xb53b38da | 0x156343a5 | 0x55d260ac | 0xa0c2e7e3 |
| 19 | `0x8d7e702e` | 0xaf0d378e | 0xcc7f9241 | 0xd42df5e9 | 0x85c342c3 |
| 18 | `0xf9f3c288` | 0x8fa3407c | 0x8c1720fb | 0x4c43b44d | 0x7dcc6ef9 |
| 20 | `0xc5362565` | 0x8ad4ccc5 | 0x8a48f9a1 | 0x416dfd52 | 0xbfca4034 |
| 21 | `0x8407be7e` | 0xb94222fb | 0x36a50e62 | 0xe598c64b | 0x861ecf3e |
| 22 | `0x38561f5e` | 0x37e08331 | 0x1c7a4cea | 0xd589a0f9 | 0xfc7755a0 |
| 23 | `0x76cfe2df` | 0x86d8104e | 0x38236471 | 0xdb1acffd | 0x58070ca8 |
| 25 | `0xbd7ebded` | 0x2a7adbe5 | 0x52b97d90 | 0x5c7fb525 | 0xe8fa6b44 |
| 26 | `0xfa02b712` | 0xa8c92a9c | 0x4ad1c4ba | 0x88899bc8 | 0x370d5556 |
| 27 | `0x54435b00` | 0x8bf2dc69 | 0x59126d54 | 0x4cbb9099 | 0x41586a02 |
| 28 | `0xe385a097` | 0xa54e06fc | 0xe2955cdb | 0xe04c1731 | 0x32be884e |
| 29 | `0xa01728bb` | 0x506de566 | 0x9060b0a5 | 0xd56fe9e5 | 0xa3c29c6a |
| 30 | `0x3773a7b1` | 0x3a29e524 | 0x737766be | 0x73ed24cf | 0x3d5e7df5 |
| 31 | `0x460e8c65` | 0xec6f6b30 | 0x7f65ac0b | 0x17829ab8 | 0x2fee57c8 |
| 32 | `0x974dd805` | 0x50ce952a | 0x20471426 | 0xabd0ca4e | 0x47981fc0 |
| 33 | `0xb08aed78` | 0x0e9bffa4 | 0x3cdb3569 | 0x98955b92 | 0x6733773e |
| 34 | `0x19ef7692` | 0x430dedf7 | 0xe83a53c8 | 0x745b4e7a | 0x3146c678 |
| 35 | `0xf89fe3b9` | 0xda9206fd | 0x926a932a | 0xa1ec93c2 | 0x0509f1dc |
| 36 | `0x1c113884` | 0x7243366b | 0x621d518d | 0xc2489126 | 0x2b0e0239 |
| 38 | `0xbba26db2` | 0x876c9858 | 0x8e8a6274 | 0x7e8edf15 | 0xdfa3d6aa |
| 37 | `0xc6425a43` | 0x003b6849 | 0x836ae739 | 0x50e0b4b6 | 0x12a112be |
| 40 | `0xb34706b2` | 0x61e54c88 | 0x179445bc | 0x27d4c1e1 | 0x9f5ec1cf |
| 39 | `0x80ebf387` | 0xebad39e6 | 0xf7fc6070 | 0xfe9344d3 | 0x5afdc70a |
| 41 | `0xc5548e37` | 0x344259f2 | 0x90d5a144 | 0x6e3be29a | 0xe0b4aca8 |
| 43 | `0x33977f1e` | 0x78a4c887 | 0xac12ec1d | 0xb49014f5 | 0x094627c4 |
| 42 | `0x3e13cfb2` | 0xab1c42fa | 0xbbd3ac4f | 0xc3e7d8f8 | 0xa043212e |
| 44 | `0xb5034992` | 0x19bdec73 | 0xe08f3e0a | 0x9e2d117b | 0x0541d653 |
| 45 | `0x397c2371` | 0xf952587e | 0x4137eb57 | 0x26e3d9bf | 0x9b3a7b0a |
| 46 | `0x091d8cb6` | 0x6f01be04 | 0xea0ddcdc | 0xf73bfac3 | 0x36467066 |
| 48 | `0x9b768766` | 0x8d45a56e | 0x72ecd961 | 0xef7433bf | 0xe2d8fac5 |
| 47 | `0xf4c86063` | 0xfa982334 | 0x6ad3cd83 | 0x9899518c | 0x165d1380 |
| 49 | `0x40ce6998` | 0x798025af | 0x6d09e1a7 | 0x68fd0fac | 0x91056231 |

Full hashes: `loops.jsonl`.
