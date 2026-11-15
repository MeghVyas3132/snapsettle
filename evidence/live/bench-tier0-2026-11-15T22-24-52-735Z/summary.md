# Bench: LIVE · tier 0 · 52/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 250000 (token base units). Generated 2026-11-15T22:28:20.394Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 52 | 1630 | 3894 | 6907 | 7318 |
| open sent → solver repaid (full loop), wall ms | 52 | 4222 | 7262 | 9959 | 10258 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 52 | 2600 | 3200 | 4000 | 4400 |
| open mined → fill seen (solver), wall ms | 52 | -488 | 1234 | 2009 | 2313 |
| fill seen → FillAccepted on Lasna, wall ms | 52 | 1609 | 3216 | 6754 | 6803 |
| settle requested → Settled on origin, wall ms | 52 | -3562 | 45 | 4661 | 5083 |
| fill → repaid, block timestamps, s | 52 | 1 | 1 | 2 | 2 |
| open → repaid, block timestamps, s | 52 | 2 | 3 | 4 | 5 |
| fill → FillAccepted, block timestamps, s | 52 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 52 | 1 | 2 | 2 | 2 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x1208b14a` | 0x389d46f5 | 0xae28ede0 | 0xd6aea178 | 0x0946d1fd |
| 1 | `0x465b90fd` | 0xe00c9caa | 0x07562541 | 0x09606dad | 0x09d86968 |
| 2 | `0x19ca4ea4` | 0x71977029 | 0x4c580f05 | 0xaf9f5e7b | 0x51632076 |
| 3 | `0x4761b250` | 0x31e0d79b | 0xfc64707c | 0x042c2803 | 0x4385f087 |
| 4 | `0xaa69662a` | 0xf3b2c8c8 | 0xefc56aef | 0xd490e7c5 | 0x40ca2fe8 |
| 5 | `0x80480b31` | 0x0b2c4703 | 0xa54ec7e2 | 0xfe6ffd85 | 0xc69fc01f |
| 7 | `0x68f42274` | 0x83cbde8c | 0x6b11c6fd | 0xbb614380 | 0x05515609 |
| 6 | `0x374d19af` | 0xb98fb417 | 0xebe1f0e7 | 0x6832e4a1 | 0xda0dddfc |
| 8 | `0x7c0c3682` | 0x266d4ca7 | 0x4adedc48 | 0x8c947595 | 0xdecc110c |
| 9 | `0x018499ac` | 0x1e9061f5 | 0xc079e204 | 0xf70e1038 | 0x42e58863 |
| 10 | `0x5973707d` | 0xb3621c8d | 0x4e5e72ea | 0x5079dbdf | 0x09672b02 |
| 11 | `0xc5187324` | 0x78d36b0b | 0x4ef6eb07 | 0x3c443c48 | 0x417bc1c4 |
| 12 | `0x559fe401` | 0x3161181d | 0x0bd0487c | 0x67afa42e | 0x50d69ae2 |
| 13 | `0xfca24f81` | 0x651a1b84 | 0xb5e35ac8 | 0x20e77280 | 0xd7c292c8 |
| 14 | `0x8ab3b89d` | 0x93df37e0 | 0x611950a1 | 0x498cbce6 | 0x411ac301 |
| 15 | `0xdcf21590` | 0xdd4255e7 | 0xc4d480be | 0xdf466348 | 0xe7a9cb0b |
| 16 | `0xf31247ab` | 0x04535c2d | 0x5b4fcdcc | 0x912ed8ce | 0x54860556 |
| 17 | `0x5e13ae3e` | 0x5517531b | 0xa7399bf1 | 0x8926fdc9 | 0x64120af1 |
| 18 | `0x5ebb3709` | 0x34fdbff3 | 0xc69300bc | 0xa4696c5e | 0xb8b6d1bc |
| 19 | `0x9a597da9` | 0x5f7218a2 | 0x207ebd34 | 0xf9d354a1 | 0xf336e432 |
| 20 | `0x38d5a163` | 0x2556fddd | 0x88d42d59 | 0xaf047de3 | 0xf9890f6b |
| 21 | `0x7dbde7ad` | 0xdca2608c | 0xeba958e1 | 0xb5ee6f82 | 0xf1726813 |
| 22 | `0x1d63be00` | 0x06a8bb38 | 0x01a5a7a0 | 0xe6ecf0ee | 0x71274f32 |
| 23 | `0x63f1520d` | 0x5bed752a | 0xed5dbd8b | 0x906c4e5b | 0x2467b559 |
| 24 | `0x1b64f170` | 0xd01cd467 | 0x2ef8193d | 0x1e9f68aa | 0xa08879d7 |
| 26 | `0x09b57f2a` | 0xd17ebb95 | 0xd1850304 | 0x3c0f5021 | 0x4f5a7b15 |
| 25 | `0x5401483d` | 0x8ff3da74 | 0xc75aedbc | 0x5283f399 | 0x26fc8e52 |
| 27 | `0x66aadcc8` | 0x8f3f7e8f | 0xef3e8609 | 0x7ee5636f | 0x8195f709 |
| 28 | `0x3b847526` | 0x94674424 | 0x1ecf2c4c | 0xef3eefb8 | 0x76788a5d |
| 29 | `0xe8a6f725` | 0xf5661150 | 0x19c8818a | 0x4416e8e1 | 0x8659f195 |
| 30 | `0x3875cde0` | 0xee9fb8d6 | 0xaf5a34cb | 0xe4b1c4a1 | 0x2422abf1 |
| 31 | `0x70b529a7` | 0x0f07f4c4 | 0x76fd18ce | 0x74557689 | 0x2eabf4dd |
| 32 | `0xb4e4390a` | 0x94ed6375 | 0x29698197 | 0xa761273d | 0x595d1bb4 |
| 33 | `0xb9d6ac53` | 0xe1d00187 | 0x9e429a46 | 0xbaa4d75d | 0xe541fbe1 |
| 34 | `0x0bc35af0` | 0x327097d1 | 0xe23a9527 | 0xb1b2fe27 | 0xec87633b |
| 35 | `0x73143939` | 0x53095e1e | 0x5db69b81 | 0xae058e95 | 0x649da09a |
| 36 | `0x42723b61` | 0x1a259539 | 0x86ade683 | 0x1775a84c | 0x196f9f30 |
| 37 | `0xa8709b1d` | 0x28ec6a62 | 0x4482b072 | 0x81d5f17d | 0x602c4471 |
| 38 | `0x55bfe491` | 0x0798a0b9 | 0x7d5373b6 | 0x4eba93d2 | 0xb5262bfc |
| 39 | `0xd4976168` | 0xefe40b5b | 0x7de117ba | 0xcb95fbdc | 0xdaaa1852 |
| 40 | `0x5ea1f35f` | 0x644e8dfd | 0x1b3c290f | 0xa0da164f | 0xe67bcf41 |
| 41 | `0x7d1e8083` | 0x1efc16de | 0x60f76932 | 0x4379b50b | 0x2a91b63c |
| 42 | `0x71c22137` | 0xf34fea8b | 0xab4ef37a | 0x7579098a | 0x5663ab86 |
| 43 | `0x4a199187` | 0x7f0ea321 | 0x3616f7be | 0xa8fb7f5f | 0xf861839f |
| 44 | `0x6d996e3a` | 0x098feb7f | 0x1d8a8ec8 | 0xa1b972e7 | 0xb3e35359 |
| 45 | `0xa80de64d` | 0xeef00dff | 0xde22249b | 0xe1c14776 | 0x9e21431f |
| 46 | `0x6f9299ab` | 0xa81b2b15 | 0xe164cc76 | 0x87f75dc8 | 0x0771f941 |
| 47 | `0x4b5fb70b` | 0x97d1349f | 0xa3d612a1 | 0x3c4cb3b9 | 0xae26f6a7 |
| 48 | `0xbf220342` | 0x917ac8d0 | 0x4006a6ce | 0xe98a1b09 | 0x1637ec58 |
| 49 | `0x43418437` | 0x84b307f7 | 0x3a744d8a | 0x3e98154f | 0x51f94efa |
| 50 | `0x9263dc33` | 0xf72b175d | 0xdeb3aa85 | 0x91231d8a | 0x99c3a55f |
| 51 | `0x2462052f` | 0xe0ce5d21 | 0xde900ef8 | 0xfbaf9f3b | 0xf2dc6303 |

Full hashes: `loops.jsonl`.
