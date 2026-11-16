# Bench: LIVE · tier 0 · 20/20 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-16T18:33:51.772Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 20 | 2301 | 4468 | 6847 | 7157 |
| open sent → solver repaid (full loop), wall ms | 20 | 4651 | 6679 | 9301 | 9600 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 20 | 2200 | 3000 | 3800 | 3800 |
| open mined → fill seen (solver), wall ms | 20 | 227 | 743 | 1262 | 1451 |
| fill seen → FillAccepted on Lasna, wall ms | 20 | 2606 | 3676 | 6019 | 7190 |
| settle requested → Settled on origin, wall ms | 20 | -1905 | 63 | 3171 | 3386 |
| fill → repaid, block timestamps, s | 20 | 1 | 2 | 2 | 2 |
| open → repaid, block timestamps, s | 20 | 2 | 3 | 4 | 4 |
| fill → FillAccepted, block timestamps, s | 20 | -1 | 0 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 20 | 2 | 2 | 2 | 2 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x4dde5345` | 0x5535cd17 | 0xaf13e6b6 | 0x65f0b67d | 0x4ed2ce1c |
| 1 | `0xf3e74ece` | 0xcdbfff1d | 0xd0509408 | 0x13618cd9 | 0x07bcc469 |
| 2 | `0xe2aaa74a` | 0xf200990b | 0xee67aca3 | 0x8c86329b | 0x855aea66 |
| 3 | `0x707921af` | 0x4bc1e26b | 0x754866a7 | 0x2b727e22 | 0xaed7c1cd |
| 4 | `0x498a028b` | 0x20f7bd47 | 0x1af12daa | 0x79f9d728 | 0xdc006ce4 |
| 5 | `0xc0923031` | 0x41e37cb6 | 0x3912c5fc | 0x01fc08d0 | 0xd5fcd93b |
| 6 | `0x84b18502` | 0xe9235d4b | 0xd01fc37f | 0x2e961557 | 0x1825d14d |
| 7 | `0x38178353` | 0xb065a65c | 0x7ceda749 | 0x689b37a5 | 0x9ba1e8bd |
| 8 | `0x98b0d7b7` | 0xeb05e01c | 0xbe26eda8 | 0xe75ea644 | 0x686fc643 |
| 9 | `0x9abbcf04` | 0xc76d6d3e | 0x9136ad27 | 0xbffe2a44 | 0xbbdd0510 |
| 10 | `0x818492d9` | 0x13fecabe | 0x70bd6ec0 | 0xbac65702 | 0xc84717ed |
| 11 | `0xe55fd001` | 0x2de88225 | 0xc21e2d38 | 0xb322c1cf | 0x30000971 |
| 12 | `0x6eaff397` | 0x39f289a2 | 0x2a7a2a0a | 0x4745c563 | 0x0afbc73a |
| 13 | `0x277a4566` | 0x2e94f1ac | 0x46b816fc | 0xb3a92e5a | 0x06c2c52e |
| 14 | `0x1f353fb3` | 0xa701d2be | 0x8d42d88b | 0x92bd2dd0 | 0x014904b0 |
| 15 | `0xfa3d5f0a` | 0x18fe6c06 | 0x476817aa | 0x65bd35af | 0xf3864739 |
| 16 | `0xb2dc5343` | 0x28301e59 | 0x3079ccda | 0x2d2f3c76 | 0x660c2fba |
| 17 | `0x3fd7018d` | 0x679c9003 | 0x96f9ee89 | 0x8580b3ad | 0xccda70ad |
| 18 | `0x8a02c221` | 0xde3a0b99 | 0x46b87742 | 0x3a50ee85 | 0x4c631998 |
| 19 | `0x33307d99` | 0x2c43853e | 0x564a9667 | 0x15d6c915 | 0xd270345f |

Full hashes: `loops.jsonl`.
