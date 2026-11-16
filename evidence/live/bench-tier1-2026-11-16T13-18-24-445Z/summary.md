# Bench: LIVE · tier 1 · 52/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 1000000 (token base units). Generated 2026-11-16T13:29:05.324Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 52 | 25028 | 33592 | 36924 | 37431 |
| open sent → solver repaid (full loop), wall ms | 52 | 38545 | 43863 | 47750 | 49372 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 52 | 36600 | 40000 | 42000 | 42800 |
| open mined → fill seen (solver), wall ms | 52 | 4318 | 8585 | 13763 | 16604 |
| fill seen → FillAccepted on Lasna, wall ms | 52 | -6956 | -90 | 1733 | 3660 |
| settle requested → Settled on origin, wall ms | 52 | -3441 | 37 | 4800 | 5834 |
| fill → repaid, block timestamps, s | 52 | 34 | 35 | 36 | 36 |
| open → repaid, block timestamps, s | 52 | 36 | 40 | 42 | 43 |
| fill → FillAccepted, block timestamps, s | 52 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 52 | 1 | 2 | 3 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x994d9fba` | 0x30183ec4 | 0x4eecc614 | 0x639781a1 | 0x5e29bd08 |
| 1 | `0xa5c783da` | 0x8273d115 | 0x9606b0d4 | 0x9700f108 | 0x44f34b18 |
| 3 | `0xa75465c8` | 0xc39ad438 | 0x27f5c05c | 0xdb52ef1d | 0x8ca99980 |
| 2 | `0xab25cb76` | 0xaf701bc6 | 0xa8492bac | 0xbd985a3a | 0x39f2c86c |
| 4 | `0x59908c21` | 0x79071340 | 0xeb30a55a | 0x38933b71 | 0x6791ead0 |
| 5 | `0x1626aba8` | 0x5739f65e | 0xd817ab9d | 0xf535d402 | 0xddd507d4 |
| 7 | `0x97351376` | 0x412ae7ed | 0xaf8441dd | 0x9b1128f6 | 0x73a9854c |
| 6 | `0x7ea277e8` | 0xe390ef9b | 0x17d7cf47 | 0x9993b433 | 0x59e1bd70 |
| 8 | `0x3fbca00a` | 0x415e98f4 | 0xf3e7d855 | 0x3f2abe7d | 0xd3c7a462 |
| 11 | `0xfa775f70` | 0xa21a0daa | 0xe815b9c3 | 0x196bc36c | 0x5289e758 |
| 9 | `0xb8c03166` | 0x88aaceb4 | 0x5e9d419a | 0x90e0ccf0 | 0xbee2bb6d |
| 10 | `0xe155a13b` | 0x18049613 | 0xdc8ab994 | 0x4613502e | 0x81f4172d |
| 12 | `0xc6a1e585` | 0xe0254f8b | 0x3c2cce44 | 0x872ceddb | 0xf485bc3e |
| 13 | `0x5c9cb875` | 0xa6451582 | 0x31bea84e | 0x991d586c | 0x1f15af55 |
| 14 | `0x16709809` | 0xabd61b95 | 0x588b8fa9 | 0x71872323 | 0xcbb0e2a0 |
| 15 | `0x85dc898a` | 0xc17bfe39 | 0xe6be477b | 0x11e96cb2 | 0x45287078 |
| 16 | `0xb7162cdb` | 0x2a1a32ef | 0x9bbc7ddb | 0x60f6b04f | 0x0f445d34 |
| 17 | `0xdd1e1375` | 0xd520047d | 0xabf69362 | 0x9470afb8 | 0xecf15a42 |
| 18 | `0x45fba94f` | 0x84e1068d | 0x8ff192d7 | 0xda3cb054 | 0xd8eb5942 |
| 19 | `0x94bb5b31` | 0x3f1acb6b | 0xcc85358f | 0x68c54279 | 0x1152abd1 |
| 20 | `0xedb6dce9` | 0x948fcc74 | 0x4190a1ff | 0x6674228a | 0xea81e080 |
| 21 | `0x0255d11b` | 0xbbd32cc7 | 0x89a8a072 | 0x7c46ab8b | 0x2cdebef5 |
| 22 | `0x5768f0e3` | 0x97b38af6 | 0x205c48be | 0xc91e65e8 | 0x7c69b569 |
| 23 | `0x9155b498` | 0x799792b8 | 0x20ad6ae4 | 0x94c037e8 | 0x69429d7d |
| 24 | `0x5ca46afe` | 0x15aa0d0e | 0x09200052 | 0x7a764de1 | 0xfb3ad954 |
| 25 | `0x7ff2991a` | 0x678711a4 | 0x04ed74a3 | 0xfc285bf8 | 0x016c7cd8 |
| 27 | `0xf5a30389` | 0x66fc9fbf | 0x17a21002 | 0x0b4f9d31 | 0x87f62993 |
| 26 | `0x61ee30b9` | 0x6779a1d7 | 0x0b0df00d | 0x52863818 | 0xfe5fe074 |
| 28 | `0xb65ce683` | 0xd8f2998b | 0x92f0f964 | 0x346190a3 | 0x8693a9b6 |
| 29 | `0xa478d34d` | 0x88289bd4 | 0xd7365b2b | 0x957224a5 | 0xc5bca04b |
| 31 | `0xf277ce02` | 0x0ad24643 | 0x607af4d0 | 0xa7cf9c39 | 0xd0ffbabc |
| 30 | `0x164b5561` | 0x67c3f069 | 0xd825ca1a | 0x13758d74 | 0xadeda937 |
| 32 | `0x8c6dd256` | 0xd5dd5ae3 | 0x796407ae | 0xfef5e821 | 0xfe117144 |
| 34 | `0xf24e0486` | 0x03932d8c | 0x0b5d31e8 | 0x31270f23 | 0x3ff7e87e |
| 33 | `0xed197f2e` | 0xb3a6c08d | 0xd57da695 | 0xc21b5ea5 | 0x1290aeee |
| 35 | `0xe6165394` | 0x54e5c048 | 0xafa7daa5 | 0x923ccacd | 0xae9b0307 |
| 36 | `0xb7f2e8d9` | 0x20cb3701 | 0x5ba4d763 | 0xcd75b88c | 0x5d447831 |
| 37 | `0x3b43b39e` | 0xee022f38 | 0x026b99f2 | 0xfe6266c2 | 0x461a46de |
| 38 | `0xf0ec77b0` | 0x190ed26c | 0x880e7442 | 0x70863e00 | 0xfab90087 |
| 39 | `0xb40f922b` | 0x9273f0af | 0x61e6e977 | 0x79bbe9b8 | 0xcc626da5 |
| 40 | `0x22328912` | 0x4ca04025 | 0x16fc341b | 0xfadb3b13 | 0xeed02aa7 |
| 41 | `0x97c81b47` | 0xe5452705 | 0x3efaf446 | 0x07732a2f | 0x15c5f62b |
| 42 | `0xca1f03dd` | 0xec18594a | 0xc2e54bdc | 0xd0942c5c | 0x6a4a0efb |
| 43 | `0x8e8f0990` | 0x0f11d05d | 0x0fc2c33d | 0xf1734dff | 0x604c4d7f |
| 44 | `0xe4d7097d` | 0xcab2253e | 0x7e6f258a | 0x6a40228b | 0xe111f889 |
| 46 | `0x83025fc2` | 0x604b63a7 | 0xbf9a6dae | 0x75162a28 | 0xf757cfd5 |
| 47 | `0xdee8e52d` | 0xca0881d1 | 0x45cb67b2 | 0xebbebc87 | 0xf16d4ab3 |
| 45 | `0x2338f424` | 0x5d321d90 | 0xd8127114 | 0x4902edb0 | 0x7dc13479 |
| 48 | `0x05e6b3d1` | 0xdc7edd2b | 0x81d27929 | 0x52b57c27 | 0x59436506 |
| 49 | `0x050aed39` | 0xeeb2f687 | 0xf643abdb | 0x9f5cb243 | 0xd2fa5a89 |
| 51 | `0xa453b21c` | 0x399dc37f | 0x366bbf8c | 0x1e2c010e | 0xd2640f1a |
| 50 | `0xf6d2b5f2` | 0xeb2335fc | 0xd01d8722 | 0x8736db00 | 0x9445fffc |

Full hashes: `loops.jsonl`.
