# Bench: LIVE · tier 0 · 20/20 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-16T18:35:17.180Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 20 | 2881 | 4954 | 7366 | 7436 |
| open sent → solver repaid (full loop), wall ms | 20 | 5391 | 7706 | 9581 | 9753 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 20 | 2200 | 3000 | 3600 | 4000 |
| open mined → fill seen (solver), wall ms | 20 | 181 | 718 | 1304 | 1455 |
| fill seen → FillAccepted on Lasna, wall ms | 20 | 1708 | 3773 | 6045 | 6800 |
| settle requested → Settled on origin, wall ms | 20 | -3764 | 2138 | 3396 | 3396 |
| fill → repaid, block timestamps, s | 20 | 1 | 2 | 2 | 2 |
| open → repaid, block timestamps, s | 20 | 2 | 3 | 4 | 4 |
| fill → FillAccepted, block timestamps, s | 20 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 20 | 2 | 2 | 3 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0xce2f6f5f` | 0xac025551 | 0x3e369f27 | 0xff43ce1d | 0xf57aa037 |
| 1 | `0xa21c9afb` | 0x1ed4cd48 | 0x6c255e95 | 0x1b12f0cb | 0x299b8ea7 |
| 2 | `0x05f7b021` | 0xa94b119b | 0x87cca1ef | 0x645d44d2 | 0x33d02db4 |
| 3 | `0x2cb0fa1e` | 0x6648968a | 0x0a38f18b | 0x73ca2d0b | 0x39e83e74 |
| 4 | `0x57be624c` | 0x6bb046a5 | 0x35e239df | 0x513b50f9 | 0x000ba224 |
| 5 | `0x2b9e3afb` | 0xfa157949 | 0x7510c454 | 0xfb95623b | 0x02c793e5 |
| 6 | `0x5fc637cb` | 0xa2af03bb | 0x8f80d51c | 0xa954456c | 0xb6402296 |
| 7 | `0x00f640c9` | 0x07aa8dfa | 0x1f884e59 | 0xbc608c23 | 0x03022798 |
| 8 | `0xe647a044` | 0x15eaeb9f | 0xec06ddb2 | 0x9901f763 | 0x71be5c1f |
| 9 | `0x2749aea1` | 0x09da05c1 | 0xb5dc316f | 0x8cd27dbf | 0x0bc2b61b |
| 10 | `0x616e4372` | 0x1afb681c | 0xdc5170e8 | 0x2328f3d3 | 0xdfba4fbb |
| 11 | `0x64f36561` | 0x4db43152 | 0xa3f025f6 | 0x019c8fee | 0x5bc974a9 |
| 12 | `0xd152e38b` | 0xc33b8c9a | 0xd6742fa8 | 0x0686873d | 0xfc5b70b8 |
| 13 | `0x1f0020a7` | 0x4b0766c5 | 0xce2e7d96 | 0x61a758d7 | 0xf2d95a28 |
| 14 | `0x5992cb7c` | 0xce557bfd | 0xa2026bca | 0x9a7dc288 | 0xc4c5f289 |
| 15 | `0xd9c04e27` | 0x944cb762 | 0x7efd699d | 0x276ee44f | 0x5d9ce688 |
| 16 | `0x906315ce` | 0xffedae71 | 0x5bc97cc4 | 0x5bfb4ecd | 0x52f4f48d |
| 17 | `0xa4a011b1` | 0x8dcf3ad7 | 0x59377c31 | 0xc540b2a4 | 0xb739a0cf |
| 18 | `0xa74aba05` | 0xacffcdc3 | 0x1f74e617 | 0x9ac256d4 | 0xa379fcb3 |
| 19 | `0x56805348` | 0xab0413ca | 0x73448492 | 0x6d828404 | 0x57adf754 |

Full hashes: `loops.jsonl`.
