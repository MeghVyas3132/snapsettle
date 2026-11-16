# Bench: LIVE · tier 2 · 52/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 2500000 (token base units). Generated 2026-11-16T14:38:41.699Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 52 | 300005 | 304344 | 307598 | 309271 |
| open sent → solver repaid (full loop), wall ms | 52 | 309086 | 313281 | 316089 | 317789 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 52 | 306200 | 309200 | 312200 | 313200 |
| open mined → fill seen (solver), wall ms | 52 | 3417 | 6654 | 12012 | 14034 |
| fill seen → FillAccepted on Lasna, wall ms | 52 | -8198 | 1180 | 3284 | 3696 |
| settle requested → Settled on origin, wall ms | 52 | -3012 | 57 | 3297 | 3743 |
| fill → repaid, block timestamps, s | 52 | 304 | 305 | 306 | 308 |
| open → repaid, block timestamps, s | 52 | 306 | 309 | 312 | 314 |
| fill → FillAccepted, block timestamps, s | 52 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 52 | 1 | 2 | 3 | 4 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 1 | `0x7695e067` | 0xb9b0be59 | 0xe9caa1ae | 0xa06ec922 | 0xfe8f4206 |
| 2 | `0xc3441059` | 0xb369b6f3 | 0x4c1e5fbc | 0x48cd41c5 | 0xbabbf2e3 |
| 0 | `0x4ef3dd01` | 0x8a72b128 | 0x5388dd89 | 0xae4a43bc | 0xa55ebb61 |
| 3 | `0xe808754b` | 0x3fffaaf5 | 0x616340d8 | 0xa66f6a08 | 0x1f696eda |
| 4 | `0x3efb2907` | 0xb7b68900 | 0x86438575 | 0xc7f5e745 | 0xa84a0c1c |
| 5 | `0x473d7811` | 0x55f714b7 | 0x7172186b | 0x6aad6e88 | 0x5f6a042f |
| 6 | `0x77aa9152` | 0x0c0f36ea | 0x5045fcfc | 0x7c2ba796 | 0x352d8509 |
| 7 | `0x8ea18eda` | 0x09de9119 | 0x88f4555c | 0xa3ef5956 | 0xe9fd2e6b |
| 9 | `0x97390deb` | 0x27ad6825 | 0x467a53fd | 0x50af395c | 0xf908bd81 |
| 8 | `0x4c67882d` | 0xf9a9fc45 | 0x0b8db135 | 0xc312809b | 0x0972d6bc |
| 10 | `0x742ed8b7` | 0xe41dbcb3 | 0x40a06475 | 0xdf4b2a68 | 0x984716c5 |
| 11 | `0xf74655e7` | 0x538c48db | 0xb873d76c | 0xe53cae84 | 0x98bd6daa |
| 12 | `0x4e1a3974` | 0x1f5296e1 | 0xd4c9fa11 | 0xab75f8f6 | 0x8e9be619 |
| 13 | `0x67e49c2d` | 0x1348784b | 0x468b2499 | 0xf2deae41 | 0x0219f19e |
| 14 | `0x32cae9c2` | 0x5f0bf625 | 0xb1fa54c2 | 0x8ec53878 | 0x6aff3e91 |
| 15 | `0x7bac2b60` | 0x7000be8e | 0xbaecc1f8 | 0x4dfe7254 | 0x77969a6d |
| 16 | `0xe6a8ca16` | 0xc82d9457 | 0xc72989a4 | 0xec7d551b | 0x51aa2ba6 |
| 17 | `0x6393a170` | 0x0cfbb64b | 0x9b8a0aa6 | 0xf06ca957 | 0x008d9c67 |
| 18 | `0xf4ab2435` | 0x369352e4 | 0x5a552982 | 0xb76243fc | 0x49590150 |
| 19 | `0xc293c5fb` | 0x280fd051 | 0x2f507d0d | 0x4eae3d23 | 0xdc27f9fb |
| 20 | `0xfd183c97` | 0xd1110526 | 0x220a1c4a | 0x5f14fb53 | 0x916a7c13 |
| 21 | `0xdb743751` | 0xa61a36be | 0x92ffa4d9 | 0x119fb60c | 0x0302cb44 |
| 22 | `0x452bcc07` | 0x186391dc | 0xcae26347 | 0xd933827f | 0x99f81dee |
| 23 | `0x4bda4e22` | 0xeae92ba1 | 0x6ea2c958 | 0xe48a102b | 0x982d7adb |
| 24 | `0xc3109945` | 0x234b5ac5 | 0xc6764eb3 | 0x26cf7fac | 0x0767e092 |
| 26 | `0xcfca78c3` | 0x32de1442 | 0x73d2ad5a | 0x558e9c60 | 0x9e344c12 |
| 25 | `0x9c7398d8` | 0xdb5dccf9 | 0xcf669b8b | 0xd8656c90 | 0xe4519ae0 |
| 27 | `0x8ff516d2` | 0xa7e32dfb | 0x1a2e7bc4 | 0xdf7cff7d | 0x5dd14066 |
| 28 | `0x3ecd5f98` | 0x64cffa6b | 0x6c52c156 | 0x0f52fa12 | 0x840ebab0 |
| 29 | `0x775ca1fb` | 0x33c757af | 0x8b7dc82c | 0x24c559e6 | 0xf9c58ea3 |
| 30 | `0xb00a5328` | 0x50eba84a | 0xf769a93b | 0x2db2066b | 0x6332ccf2 |
| 31 | `0xbb8afd35` | 0x85f3dca5 | 0xdace4852 | 0xd207e2e4 | 0xfdbb3041 |
| 32 | `0xe9848c3f` | 0x748980bb | 0xd6458f68 | 0xe074381d | 0x4b1d2fb7 |
| 33 | `0x15e80ee6` | 0x8804bb65 | 0xfa821d1d | 0x6d6f8e20 | 0xefaf1cf0 |
| 34 | `0x32a6b38c` | 0xa17cf46b | 0x01385d0b | 0x1d949185 | 0x67f846cd |
| 35 | `0x5ff0e1f1` | 0xce76acc2 | 0x234a8383 | 0x31348a37 | 0xdb0276e3 |
| 36 | `0x09b6108f` | 0x896e4f10 | 0xeaa8377a | 0xc0db061b | 0x530ff5f2 |
| 37 | `0xf002dc5d` | 0x1e966252 | 0x467facb8 | 0xea9d742c | 0xc99d7f07 |
| 38 | `0x956004ae` | 0x52956312 | 0x9d642e86 | 0x9a32742e | 0x14f99f9e |
| 39 | `0xa313c5d6` | 0x361759e0 | 0xf4a4505c | 0x84ef1541 | 0x22af1131 |
| 40 | `0xe8c91024` | 0x1b7a0aa7 | 0x7fe1e224 | 0x7795d468 | 0xa8bc24ab |
| 41 | `0x7131d9be` | 0x996842f9 | 0x9780784d | 0x4f825c46 | 0x1fa8b19d |
| 42 | `0xebba5a77` | 0xea05bb7f | 0xc40a124a | 0x6f36bb7b | 0x4ba11ba4 |
| 43 | `0x0ee934ef` | 0x1a1d5ac2 | 0xa9737458 | 0x2d62e2dd | 0x6454f3a1 |
| 44 | `0x1860bef1` | 0xe8a4d4df | 0x38bfa6b8 | 0x41cde261 | 0x9a0c494b |
| 45 | `0xa8237273` | 0x968beabe | 0xaa9f608c | 0x1b8cf986 | 0xa3a405f4 |
| 46 | `0xa8e8cfbe` | 0xd641f89c | 0x198a9095 | 0x4fad7355 | 0xcdfb19ad |
| 47 | `0x606d77b0` | 0x62358ea9 | 0xb13d9a1a | 0x73534e73 | 0xa2138fd2 |
| 48 | `0x8f3f259e` | 0x789018b0 | 0x23015c08 | 0xe134ba13 | 0x55d944c0 |
| 49 | `0x56de6329` | 0xd576c677 | 0xf920c7ed | 0x24489155 | 0x7be2d4dc |
| 50 | `0x4ec8637f` | 0x2c2b6c6a | 0x3f1c88ef | 0xb37b08f5 | 0x641c052b |
| 51 | `0x7666112b` | 0x4b67dc20 | 0x128b6dd8 | 0x5ec0761e | 0x533a097b |

Full hashes: `loops.jsonl`.
