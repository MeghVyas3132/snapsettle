# Bench: LIVE · tier 1 · 52/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 1000000 (token base units). Generated 2026-11-16T00:42:09.559Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 52 | 29593 | 34100 | 36969 | 37682 |
| open sent → solver repaid (full loop), wall ms | 52 | 41574 | 46070 | 47922 | 49535 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 52 | 38000 | 40800 | 43000 | 43800 |
| open mined → fill seen (solver), wall ms | 52 | 6448 | 9010 | 12290 | 13053 |
| fill seen → FillAccepted on Lasna, wall ms | 52 | -3991 | -104 | 2323 | 4815 |
| settle requested → Settled on origin, wall ms | 52 | -208 | -1 | 309 | 5016 |
| fill → repaid, block timestamps, s | 52 | 34 | 36 | 37 | 37 |
| open → repaid, block timestamps, s | 52 | 38 | 41 | 43 | 44 |
| fill → FillAccepted, block timestamps, s | 52 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 52 | 2 | 2 | 3 | 4 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 1 | `0x267166e8` | 0xfab7611f | 0xc772e728 | 0x32cee8d1 | 0xf1613634 |
| 0 | `0x8bc073f4` | 0x6f9ea5fb | 0x08304d36 | 0xd9691dda | 0xfb869393 |
| 2 | `0x50fe22bd` | 0x671859a5 | 0x3cd5f3df | 0xce3bd5c6 | 0xd3998c91 |
| 3 | `0xdc7b7a34` | 0xe7427513 | 0xacc54705 | 0xbbfd77de | 0xbbbc24cd |
| 5 | `0xbba58e30` | 0x16192657 | 0x1b912a9f | 0x81bf2f66 | 0x45500cba |
| 4 | `0x55686dc3` | 0xb86301cc | 0xd88c6470 | 0x99c37109 | 0x0a5e3497 |
| 7 | `0xec8d1b97` | 0xd7e11ada | 0x8a350bdf | 0x0626e5b9 | 0xa901302d |
| 6 | `0x97ff6023` | 0x1f7ec2e6 | 0x00c75be6 | 0x2ec08523 | 0xcddabe6a |
| 9 | `0xa9b10ffb` | 0xc6328608 | 0x4c881e24 | 0xe41deea7 | 0xd76a47d6 |
| 8 | `0xb8926108` | 0xde63426c | 0xbbe06f06 | 0x0815432b | 0x17bf555e |
| 10 | `0xeddbe85e` | 0x0640b10c | 0xaea4b243 | 0x7e5fc2e9 | 0xd3c19698 |
| 11 | `0xc79af6a2` | 0xaa1b0920 | 0x403b06a0 | 0xbf4dbc39 | 0x77809299 |
| 12 | `0xbdadcd3f` | 0x6fecae47 | 0x8bcd3335 | 0xf34a83cf | 0x7709caff |
| 14 | `0x3b19c59c` | 0x40b5e57b | 0xdfa951e7 | 0xc8084cfa | 0x085bd696 |
| 13 | `0x8ec894c3` | 0xbc5ebaa3 | 0xf130a871 | 0xf9173525 | 0x95f14e13 |
| 15 | `0x845375ce` | 0x28ddc477 | 0x182ed54a | 0x90695186 | 0xf55c2d8d |
| 16 | `0x2ff66ef6` | 0x22362196 | 0x6c2f4699 | 0x6a89f727 | 0x19778634 |
| 17 | `0xf074925f` | 0x0bfef3b3 | 0x23a59f1e | 0x7e344c05 | 0xccaf948f |
| 18 | `0x69061b7f` | 0xea0752f7 | 0x95807808 | 0x744b59fc | 0xa125b2a5 |
| 19 | `0x9e0fba25` | 0xd968b367 | 0xa6016db4 | 0xe84e2a35 | 0x5627f130 |
| 20 | `0x58d38739` | 0xd7e8e03b | 0xdc40b894 | 0x252cd89f | 0x8b54e145 |
| 21 | `0x12f5a2c5` | 0x3549cc5c | 0x5a43b2e9 | 0x8c413988 | 0x2d77ae04 |
| 22 | `0x252357c3` | 0xdc40411c | 0x0c7ccda6 | 0x28c16b18 | 0x4bef5688 |
| 23 | `0xc968979f` | 0x6deaa72f | 0x94142636 | 0xb3a8a63d | 0xc0e91229 |
| 24 | `0xdd248292` | 0x013b2ad7 | 0x8984b647 | 0x475c6269 | 0xd38e1b24 |
| 25 | `0x6cd59ccd` | 0x09ab3ad4 | 0xa7b88e22 | 0xd1693e7e | 0x6cbefff7 |
| 26 | `0x87db68ca` | 0x0859e382 | 0xc692c84b | 0x46c9ed07 | 0x25d7918e |
| 27 | `0xec6f13af` | 0x025d7045 | 0x4a2364b7 | 0xf9e96d69 | 0x65e52315 |
| 28 | `0xb0517c9e` | 0xf3787dd1 | 0xc5f2d6ca | 0xd25c053f | 0x5d3976ca |
| 29 | `0x40803451` | 0x045883c9 | 0x15847e0a | 0xc387136f | 0x378dd883 |
| 30 | `0xd85170ea` | 0xcc2a7186 | 0xd4a436d5 | 0xbdd9aee7 | 0x64815440 |
| 31 | `0x1e9a0d7a` | 0xc64c03fe | 0x96e5d10e | 0xa11ba57c | 0x6859c20c |
| 32 | `0xe34d8d4f` | 0x6cdb9393 | 0x9fe67e2b | 0x7dca4af6 | 0x96cac13d |
| 33 | `0x55c9a923` | 0x3b304e4f | 0xf85f126e | 0x7805b68f | 0x3b5a7384 |
| 34 | `0x4c4e806e` | 0xa680e09b | 0x2aa5d17e | 0x568d7c18 | 0x22ccdabe |
| 35 | `0xc2adb9d2` | 0x9a8febcc | 0xc249b282 | 0xf283c53e | 0xc20adcf2 |
| 36 | `0x0f738f86` | 0x9df1085b | 0xba66cdec | 0xc027b5fe | 0x5b77ab1d |
| 37 | `0x502ff71b` | 0x81a62f33 | 0x8bc74e13 | 0x504a433f | 0xe91e2946 |
| 38 | `0x8cbcec1d` | 0xc202e7db | 0x6614d44a | 0x44a3a0d6 | 0x6bdd3180 |
| 39 | `0xc078089c` | 0xc62e286c | 0x4fcbbf78 | 0x6124e8ae | 0xddf31a5d |
| 40 | `0x37a4cd4d` | 0xa82e7801 | 0x4efd09be | 0x4faf0ddc | 0x8cc8e72e |
| 41 | `0xc5a9150c` | 0x453846ab | 0x54d34ac1 | 0x55edf649 | 0x177b19e6 |
| 42 | `0xb61de3d7` | 0xa5b0d2c0 | 0x34ad3bb9 | 0xfd95dd32 | 0xb6950da7 |
| 43 | `0x12c015c1` | 0x02bae68f | 0x28159386 | 0x86f862fb | 0xbfa99135 |
| 44 | `0x79ee914e` | 0x41b7dd5a | 0x32ab08ed | 0x9cd05e81 | 0x80738de8 |
| 45 | `0xbc0aa6f6` | 0x0bb4b068 | 0x6cd3d9c4 | 0x23635bf3 | 0x35ea9c53 |
| 46 | `0x5df8a415` | 0xdb1bc322 | 0xd4deea9f | 0x064362c5 | 0x8d061d5a |
| 47 | `0x59e6effd` | 0x4f1c2fde | 0x363eb4d6 | 0xda2012a7 | 0x13d9e8ef |
| 48 | `0x41305c2c` | 0x87c2b111 | 0x0c77c0bc | 0xd1b70203 | 0x66a6d25b |
| 49 | `0xbca9953a` | 0xda88ef4d | 0xfb6f10f5 | 0x7ea61b6d | 0x7b45d133 |
| 50 | `0xb63e6c57` | 0xe3e2ddfd | 0x140816ce | 0x21cbc961 | 0xd4663c9a |
| 51 | `0xa089ae4d` | 0x748d1824 | 0x2b0b49d8 | 0xa3ad1869 | 0x06ebe835 |

Full hashes: `loops.jsonl`.
