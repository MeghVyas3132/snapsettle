# Bench: LIVE · tier 2 · 49/49 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 2500000 (token base units). Generated 2026-11-16T21:44:46.527Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 49 | 304553 | 307324 | 310444 | 311206 |
| open sent → solver repaid (full loop), wall ms | 49 | 308122 | 310499 | 313987 | 314578 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 49 | 304400 | 306200 | 307800 | 308600 |
| open mined → fill seen (solver), wall ms | 49 | 410 | 1022 | 1290 | 2155 |
| fill seen → FillAccepted on Lasna, wall ms | 49 | 1535 | 3175 | 6695 | 7063 |
| settle requested → Settled on origin, wall ms | 49 | -3377 | -2354 | 3282 | 3479 |
| fill → repaid, block timestamps, s | 49 | 303 | 305 | 306 | 306 |
| open → repaid, block timestamps, s | 49 | 305 | 306 | 308 | 308 |
| fill → FillAccepted, block timestamps, s | 49 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 49 | 2 | 2 | 2 | 3 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0xf80d9df2` | 0x57ad6e82 | 0x1d4fa30d | 0x0aa3eca3 | 0x5a821805 |
| 1 | `0xabda6410` | 0x65a03245 | 0x3bd6e5e0 | 0x1166877f | 0x6af7b0f5 |
| 2 | `0x2906613d` | 0x81cf8c49 | 0x9da4860e | 0xca798bb0 | 0xbc2d3da8 |
| 3 | `0x2fb87c13` | 0x737b9213 | 0x7d44046e | 0x1259bcfb | 0x0f38da62 |
| 4 | `0x73ed2f1f` | 0xa6c4d16e | 0x88771e00 | 0xd84b0d45 | 0x54b93d94 |
| 6 | `0xb2b853ed` | 0xe90423ee | 0x31198352 | 0x29792d03 | 0x6d9093ae |
| 7 | `0xb93ee882` | 0x4037bbf9 | 0x8509cf09 | 0x1ade70d1 | 0x529d5ad9 |
| 8 | `0x42037c35` | 0x03df36a6 | 0xdc8968ec | 0xb79d2cd8 | 0xe00a2968 |
| 9 | `0xd3ad14c1` | 0x532532ce | 0xa300ddff | 0x85868ddb | 0x0d4c5000 |
| 10 | `0xab5386c1` | 0x83c6af38 | 0x8483af83 | 0x12168cc6 | 0x975e736a |
| 11 | `0xa8f1951c` | 0x88d0497b | 0x4f99db2f | 0x89fdefaa | 0x334d60e0 |
| 13 | `0xd2fab3d4` | 0xc7f2ca77 | 0xf649e903 | 0xc5931efa | 0x75ed8129 |
| 14 | `0x8a773450` | 0x70e07473 | 0x0694107e | 0x177a1bca | 0xb5cdfbab |
| 15 | `0x374e7bb9` | 0xbdc0f464 | 0x69149f1e | 0x024ac299 | 0x85b2d8b2 |
| 16 | `0x3eca426b` | 0x2d5137ce | 0x675a10a2 | 0x0233a8c6 | 0xdf2829de |
| 17 | `0x5a74a0e2` | 0xa7124772 | 0x27a3797f | 0xf19b3a48 | 0x24c7686b |
| 18 | `0x641cbb3d` | 0xc6acefcd | 0x89f34e06 | 0x513fd0ea | 0x77d0e0f1 |
| 19 | `0x85449db8` | 0x5db92c91 | 0xfd0b86dc | 0x863ec55d | 0xf9b8797f |
| 20 | `0xa8e16ceb` | 0xa5024b01 | 0x6aaf0911 | 0x824e5bdb | 0xb51b1845 |
| 21 | `0x689cc53a` | 0xa98fdb7c | 0xb7947fc2 | 0x6130faf9 | 0x33c1f565 |
| 22 | `0x5d5f39ac` | 0x0b438db1 | 0xc75d212f | 0x698f5478 | 0x0da649de |
| 23 | `0x8f972f1d` | 0x2ef7e0cd | 0x4b4fdb85 | 0x55957c91 | 0x8cdebc3d |
| 24 | `0xcfbc8b2d` | 0x408ba29e | 0xdb925cc6 | 0x737dead3 | 0x21976753 |
| 25 | `0xad27e9e5` | 0x262e3ba1 | 0x071395f3 | 0x6a107bb7 | 0xfc90ac4b |
| 26 | `0xf4bce07f` | 0x9d724b6c | 0xac5be071 | 0x6f25139c | 0x7f951f76 |
| 27 | `0x32a4ee94` | 0xcd8cca9b | 0x5ffcb680 | 0xea376252 | 0x0db1fab0 |
| 28 | `0x4b5df514` | 0x76db79d4 | 0x3c7acb7d | 0x72a14be1 | 0x7adee7be |
| 29 | `0xf38caad2` | 0xb2f0c5d6 | 0xdfea5408 | 0x696cad7c | 0xf66e1a8c |
| 30 | `0x7e05a7c8` | 0x63deac6d | 0x8c645c0b | 0x28d1ab0e | 0xf2a0aae8 |
| 31 | `0x6d45956f` | 0x973934ac | 0xdb94c861 | 0x0a106a2a | 0x09128820 |
| 32 | `0xf1cb02db` | 0xce641489 | 0xe2ed5a30 | 0x90f0bb14 | 0xad38672e |
| 33 | `0x7103bb8c` | 0xded47cc9 | 0xaedede68 | 0xe8020023 | 0x3c3867fc |
| 34 | `0x1e44268e` | 0x053baa23 | 0x1ad0942e | 0x3ba09232 | 0xef1deb63 |
| 35 | `0xefad7c51` | 0x75f6e691 | 0x5c8a8650 | 0xdee7f2a8 | 0x6c1cfeae |
| 36 | `0x7d42d42d` | 0xb95cbd80 | 0x35743e97 | 0xa9f57695 | 0x56d01203 |
| 37 | `0x17b2cb05` | 0xe1be7476 | 0x206587e2 | 0x734ed1e4 | 0x9fe3c76e |
| 38 | `0x1231e849` | 0x0ba6a60b | 0x6f6bb62f | 0xdc3ea690 | 0xfc34750b |
| 39 | `0x29cfeaaa` | 0xb6bcadd7 | 0x075edd5b | 0xca3505db | 0xd9bbbe77 |
| 40 | `0x82bbc8c0` | 0x7efa07e6 | 0x4763d1e7 | 0x859ffa6e | 0x3de5fe4d |
| 42 | `0xf774b2e1` | 0x56bfe9c4 | 0xa322db16 | 0x0559e29b | 0x344486ee |
| 43 | `0xd49d62a9` | 0x3ebc4e4e | 0x56593c3a | 0x9d2b4c88 | 0x5f11af7f |
| 44 | `0x541b85df` | 0x2c1ae33f | 0x462e3828 | 0x482a9ebb | 0x64236fd1 |
| 45 | `0xd42b5038` | 0xe69b4c2f | 0x95470eb5 | 0xcdf20f19 | 0x74bca7f0 |
| 46 | `0xb3715c7f` | 0xaea3204b | 0x9f104e3e | 0x7c4ce9ed | 0xe9595568 |
| 47 | `0x2bf528c1` | 0x72f4d438 | 0x151fc7ca | 0x467c23e5 | 0x6e6a40cc |
| 48 | `0x92f8beeb` | 0x926ee135 | 0x9720f620 | 0x42d86c07 | 0x9a1ab6e2 |
| 49 | `0x213cbfd3` | 0x9947d6f4 | 0xf5647633 | 0x83c7382f | 0xaf77740c |
| 50 | `0xa8d7edfa` | 0x9245fbc0 | 0xd1d077bc | 0x70ac9efc | 0xd04d6358 |
| 51 | `0x064dc72f` | 0x0426edcf | 0x6c8ca831 | 0x09c6a12a | 0x1795010a |

Full hashes: `loops.jsonl`.
