# Bench: LIVE · tier 2 · 51/51 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 2500000 (token base units). Generated 2026-11-16T19:57:42.374Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 51 | 298798 | 303685 | 307022 | 308220 |
| open sent → solver repaid (full loop), wall ms | 51 | 305828 | 310651 | 313750 | 314158 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 51 | 304000 | 306400 | 307800 | 307800 |
| open mined → fill seen (solver), wall ms | 51 | 2517 | 5141 | 7673 | 7781 |
| fill seen → FillAccepted on Lasna, wall ms | 51 | -5019 | -102 | 3013 | 4911 |
| settle requested → Settled on origin, wall ms | 51 | -2968 | -1 | 3222 | 3474 |
| fill → repaid, block timestamps, s | 51 | 303 | 305 | 306 | 306 |
| open → repaid, block timestamps, s | 51 | 304 | 306 | 308 | 308 |
| fill → FillAccepted, block timestamps, s | 51 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 51 | 1 | 2 | 2 | 2 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0xeffd11c1` | 0xcf29dd7a | 0x0575dc86 | 0x0fe3d446 | 0x05b49b37 |
| 1 | `0xd97c414a` | 0x84aea20b | 0x8d6b8944 | 0x37721d0f | 0x25683c26 |
| 2 | `0xf3b41e44` | 0x39aa9f30 | 0x8de4ea3b | 0xfb81e54e | 0x81e6f881 |
| 3 | `0xd42821df` | 0x244b8de1 | 0x7b633523 | 0x38c49c30 | 0x2773df20 |
| 4 | `0xec411b58` | 0x36f978ce | 0x97348a58 | 0x8ab7a60c | 0x65cc428a |
| 5 | `0x335c6972` | 0x45e264c5 | 0xf09755c2 | 0x518e0313 | 0xc8ea346f |
| 6 | `0x850ef2ef` | 0x8d2b3f66 | 0x8a6b5629 | 0xa66bf4dd | 0x64c68b90 |
| 7 | `0x281fc21e` | 0xea78a349 | 0x1bc636b2 | 0x571ef12b | 0xf2f522e6 |
| 8 | `0x7fd1d823` | 0x4ca2cfc3 | 0x3c5c468c | 0x478eda5e | 0x73ccd28c |
| 9 | `0xe72ff3bb` | 0xe370f5d5 | 0x28944ff4 | 0xb0b981df | 0xb8c2b024 |
| 10 | `0x4e802174` | 0x18f77724 | 0x7edc9c47 | 0x442a159e | 0x3624ed2e |
| 11 | `0x7410f173` | 0x18445eca | 0x35bbb96d | 0x927d7b94 | 0xfb59cc76 |
| 12 | `0xefa2691f` | 0xdc4e9104 | 0xe3c476b7 | 0x6c17abac | 0xaf6c5aa2 |
| 13 | `0x6c14f132` | 0x47f37fba | 0xaff15a0e | 0x296d5603 | 0x3b271cf3 |
| 14 | `0x716bea4c` | 0x923de822 | 0xd713e67a | 0x936f43d7 | 0x6ae4f001 |
| 15 | `0x83420893` | 0x17bf354c | 0x085b6fe7 | 0x2880b79b | 0xde6b4cfd |
| 16 | `0x1aca24d5` | 0x731b51e5 | 0x949c4a2c | 0x1f8019d5 | 0x4c45fa0b |
| 17 | `0xa392ec95` | 0x478bd2ad | 0x5ad96e2e | 0xa474b5e0 | 0x8992e3a4 |
| 18 | `0x25c61a7d` | 0xbb143fb9 | 0xded2c62a | 0xbc0ef3d3 | 0x4dea7007 |
| 19 | `0x45494d20` | 0x39f42496 | 0xdae1a353 | 0x090ca56e | 0x7fb2a759 |
| 20 | `0xce7ccf48` | 0xd3a107b8 | 0x9f3a9249 | 0x9d76dc21 | 0x7fade93c |
| 21 | `0x14af4998` | 0xe4650330 | 0xada682e6 | 0x5127a4c6 | 0xd47fccb0 |
| 23 | `0xd6df0f24` | 0x2c5f85f2 | 0x4f13e62c | 0x28b75ce0 | 0x47b0d9f9 |
| 24 | `0x70f63c2d` | 0x81770b6b | 0x3faf96b1 | 0xc849eb29 | 0x41deaa64 |
| 26 | `0xb214c3cf` | 0x31f4d41d | 0xa22da041 | 0x8bbc4e66 | 0x38474a5d |
| 25 | `0x0718b57e` | 0x3b502869 | 0x1eced09f | 0x3a5d9602 | 0xaf27f12a |
| 27 | `0xecf24bb9` | 0x7ec504af | 0x2e628e28 | 0xac45c180 | 0xb7e0bd5d |
| 28 | `0xb8628ce2` | 0x0f267b20 | 0x0882b935 | 0xc372171a | 0x1050cb41 |
| 29 | `0x72883a63` | 0x156ad426 | 0x9a2b2649 | 0x3dcac130 | 0x96063ffd |
| 30 | `0xc7bd2255` | 0x7be63f74 | 0x948b612b | 0x478f44ee | 0x68d91eb1 |
| 31 | `0x820e6276` | 0x10cb5e2c | 0x5113b9a7 | 0xa6c48618 | 0xae1dcb25 |
| 32 | `0x6eac3786` | 0x991938a0 | 0x5d4160b4 | 0x596e261a | 0x403cd156 |
| 33 | `0x2dcb38e3` | 0x082ec91e | 0xaa69eb86 | 0x729fdde8 | 0x97e5c9be |
| 34 | `0xce5969c5` | 0x74fb1cab | 0xd71f9e36 | 0xf7445167 | 0xe032e87a |
| 35 | `0xfec606ae` | 0x11073ffd | 0x8f49c64d | 0x20b8d034 | 0x74c777c7 |
| 36 | `0x8f047e2e` | 0x5e67f1d3 | 0x330db963 | 0xcd526600 | 0x1b7be93e |
| 37 | `0xcc379c71` | 0x62ae89dd | 0xd447c18e | 0xcd665bda | 0xc51287a2 |
| 38 | `0x91d54b83` | 0xbb41446c | 0x48c3784d | 0x6b193363 | 0x49f55a47 |
| 39 | `0x748079fd` | 0xffb93102 | 0xb98e2cfa | 0xa5616d56 | 0x7f88ece8 |
| 40 | `0xb3401cda` | 0x5ae760be | 0xb1667b27 | 0xd70fd3cf | 0x93b44d5d |
| 41 | `0x56230621` | 0x4f467a2e | 0x014a5348 | 0xbe29e003 | 0x4f6e17a5 |
| 42 | `0x3c60c910` | 0xdad9cdb8 | 0x644211fd | 0x4ed27f4f | 0x25561695 |
| 43 | `0xc41ab4f6` | 0x3fc589df | 0xe4162d06 | 0x55aa1b77 | 0x25a8d195 |
| 44 | `0x6c0feca1` | 0xab5d4a72 | 0x15663776 | 0xb52eed55 | 0xfece88ef |
| 45 | `0xbd9b520d` | 0xafc35a51 | 0x642d5268 | 0xd5e0629b | 0x80b12efa |
| 46 | `0x2d4aaa2b` | 0x341f2fa0 | 0xb2158c3f | 0x69a49ecf | 0xf24cd2bc |
| 47 | `0xf16e7d70` | 0x568b5b16 | 0x55a74ef3 | 0x178bca76 | 0x1439dc3f |
| 48 | `0x6c258dd4` | 0xb70dd75e | 0x4e92d2c8 | 0x31fce8e5 | 0x8337c73b |
| 49 | `0xc68aba4d` | 0x57e93c51 | 0x4b2afc3e | 0xd8c79e3e | 0x421818b5 |
| 50 | `0x5e020cfa` | 0x31279468 | 0x3c8cb7aa | 0x9f6f5771 | 0xbab3adb0 |
| 51 | `0x0364be2a` | 0x8c2a8ab0 | 0x86285603 | 0x8aa135ae | 0x236d8cd3 |

Full hashes: `loops.jsonl`.
