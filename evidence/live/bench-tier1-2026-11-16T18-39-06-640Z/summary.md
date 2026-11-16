# Bench: LIVE · tier 1 · 52/52 loops settled

> LIVE: Base Sepolia → Unichain Sepolia → Reactive Lasna → Base Sepolia.

Order input: 1000000 (token base units). Generated 2026-11-16T18:48:50.671Z.

| Segment | n | min | p50 | p95 | max |
|---|---|---|---|---|---|
| fill → solver repaid (Reactive settlement), wall ms | 52 | 28163 | 32916 | 36818 | 37471 |
| open sent → solver repaid (full loop), wall ms | 52 | 36671 | 39684 | 42224 | 42983 |
| open → repaid in Base Sepolia blocks × 200 ms (origin clock, no RPC lag) | 52 | 34400 | 35800 | 37200 | 37600 |
| open mined → fill seen (solver), wall ms | 52 | 2437 | 5468 | 7560 | 8442 |
| fill seen → FillAccepted on Lasna, wall ms | 52 | -3814 | -2015 | 3225 | 3601 |
| settle requested → Settled on origin, wall ms | 52 | -3618 | 1707 | 3616 | 4851 |
| fill → repaid, block timestamps, s | 52 | 33 | 34 | 35 | 36 |
| open → repaid, block timestamps, s | 52 | 34 | 36 | 37 | 38 |
| fill → FillAccepted, block timestamps, s | 52 | -1 | -1 | 0 | 0 |
| settle requested → Settled, block timestamps, s | 52 | 2 | 2 | 2 | 2 |

Wall-clock segments: the fill time is the solver's own transaction receipt; every other event is when this machine first saw it, polling public RPCs every ~150 ms. A lagging RPC can make a segment read short or even negative, so treat single loops with care and read p50/p95. Block-timestamp segments use each chain's own clock (1 s granularity; clocks across chains differ by about ±1 s). The Base-blocks row counts origin blocks between open and repay (200 ms each), the most RPC-independent measure.

## Loops

| # | order | open | fill | react (Lasna) | settle |
|---|---|---|---|---|---|
| 0 | `0x496e13af` | 0x668ba4cd | 0xc7abb637 | 0x74c9fa6d | 0x8be68609 |
| 1 | `0xd5eae420` | 0x69f72b05 | 0x6a8df223 | 0xcd36da4b | 0x0ba6c4d6 |
| 2 | `0x92d5fc39` | 0xde32da71 | 0x8d037158 | 0x5a6b1d76 | 0xdb68c132 |
| 3 | `0x852d4c40` | 0x590b4589 | 0x91822878 | 0xe2210208 | 0xf96c3afa |
| 4 | `0x2bcb187d` | 0xc00371a4 | 0x603368b0 | 0x0196e1c9 | 0xa6411d90 |
| 5 | `0xaa71a2c1` | 0xd90771ee | 0x6b3e5e1a | 0xe31be537 | 0x32e958ad |
| 6 | `0x8424bf38` | 0x37756a52 | 0x014c128a | 0xef9f8ff4 | 0xfeaf6d23 |
| 7 | `0x32362fad` | 0x3f8057da | 0x41d6af20 | 0x70748457 | 0x0d2cdb48 |
| 8 | `0x28c811ea` | 0x02ce7b1f | 0x3a0d28a6 | 0x05ff214d | 0x1571e160 |
| 9 | `0x36634d43` | 0xdafe3406 | 0xc06c7978 | 0x9b4a8632 | 0xfc081065 |
| 10 | `0xc29eef95` | 0xf9b089e3 | 0x7cb3b2c5 | 0x69a4c82c | 0xda4831f0 |
| 11 | `0x90f3db55` | 0x70cdb0f1 | 0x76fbf07c | 0x23394c09 | 0x1aeb3de8 |
| 12 | `0x97803f21` | 0x2addb2fc | 0xfd54cd84 | 0xf77f10e0 | 0xec0bd945 |
| 13 | `0x02876096` | 0x3121d919 | 0x6e091b02 | 0x9ede06d0 | 0x78d98bcc |
| 14 | `0xc145b12a` | 0x011e156a | 0xb8ac79cf | 0x0d49c1c1 | 0xf3e718a0 |
| 15 | `0x2da0b101` | 0x41c6e5c9 | 0x77144eef | 0x7b8c28e5 | 0x0604ece6 |
| 16 | `0x644625f7` | 0xe196a2ce | 0x7417ad21 | 0x5aa7c48d | 0xaaf07cdd |
| 17 | `0x941258fe` | 0x48a9d0c6 | 0xa42bdf67 | 0x8fca89cb | 0xc0da0fc4 |
| 18 | `0x21d292a9` | 0x7ee6031d | 0x236134a4 | 0xdf409b5f | 0x77cfd4ac |
| 19 | `0x1ec17f58` | 0xcbcde65f | 0xde2f4ebf | 0xdab7baf4 | 0x7b8d6198 |
| 20 | `0x942caf61` | 0xad6b0916 | 0x77eb690b | 0xf1ebd531 | 0xa2efed10 |
| 21 | `0xf1f1bfac` | 0x1f566b53 | 0x1d1f30a9 | 0x4a32b834 | 0x5f18e0c0 |
| 22 | `0xf136379a` | 0xeec8f2fb | 0xf8f743f5 | 0x5cc85abb | 0x16521cd6 |
| 23 | `0x102955a8` | 0x8fa45e5f | 0xf36bb350 | 0xad4648e0 | 0x7c782fce |
| 24 | `0xf6569972` | 0x0a639b16 | 0xb972d130 | 0x76a232ab | 0xdd3752dc |
| 25 | `0x3e92baa3` | 0x5067625f | 0x0223bbf7 | 0xd0d21d50 | 0xd8a837cc |
| 26 | `0x49864678` | 0x144ce9ee | 0x30936ef7 | 0x84084871 | 0xec287a9f |
| 27 | `0x5a5d9c96` | 0x8cefbff1 | 0xc0394861 | 0x4ca0d2e9 | 0x8c0ac935 |
| 28 | `0x5e7a7a2c` | 0xea4124c6 | 0x3b722d00 | 0xedbd144f | 0x4c5deda2 |
| 29 | `0x2b09b202` | 0xde2bb20f | 0x3baf92f3 | 0x2ca2f337 | 0xdd5e78b4 |
| 30 | `0x1933a698` | 0xd9c30614 | 0xbd461349 | 0x0a956a88 | 0x8640f32a |
| 31 | `0xe81097dc` | 0x56166205 | 0x2b64cfd6 | 0x85808530 | 0x7ae0f454 |
| 32 | `0xfcfac3b5` | 0x155607b4 | 0x724a37ab | 0x01c4d804 | 0xf4e1195d |
| 33 | `0x9fc3658d` | 0x05ff0530 | 0x7c632806 | 0xd4973dd6 | 0xe920a926 |
| 34 | `0xb859bc33` | 0x2802c55c | 0x6a257af9 | 0x4d6f7a3a | 0xf6981b3e |
| 35 | `0x17a06a8d` | 0x90fdc62b | 0x4aa73418 | 0xa9bf7b6c | 0x7c433f72 |
| 36 | `0x431497be` | 0x9ab742e5 | 0xe91efcb7 | 0xbf75bd04 | 0x7ca6d2b6 |
| 37 | `0xdeaf2816` | 0xb7ae0133 | 0x13f09cab | 0xc44b3b3b | 0x9bca1d88 |
| 38 | `0xd7bdaf9f` | 0x458f141f | 0xdfaa2280 | 0x0f4da5c5 | 0xf2d18c31 |
| 39 | `0x614c9414` | 0xe4db30bb | 0x2dabb684 | 0xfdb2cb77 | 0x4e06fd11 |
| 40 | `0x55f7a9ca` | 0xf39b0e30 | 0x9f12f6fb | 0x872f829a | 0xc1d50614 |
| 41 | `0x38ca1340` | 0xf5f54d19 | 0x1ab286e8 | 0x3d18a48e | 0xc05c51be |
| 42 | `0x6eb6135e` | 0x305d13ca | 0xea391dff | 0xa91b2487 | 0x5b3acd7c |
| 43 | `0xb6b95a5e` | 0x11d74394 | 0x768bc184 | 0x0e90aba3 | 0x75ac0c46 |
| 44 | `0xae803985` | 0x60691f39 | 0xf1c03f4d | 0x81b5afa4 | 0xb68112a7 |
| 45 | `0x0ade0bb8` | 0x2a6f622c | 0xe0ee35ce | 0x66ae53c1 | 0x6a6d7648 |
| 46 | `0x40d1e2e8` | 0xa583e27a | 0xcc882ea3 | 0x6e082ad6 | 0x4e5c16eb |
| 47 | `0xdc6b3acf` | 0x94e221bf | 0xb0bbf998 | 0x580d72cb | 0x98930150 |
| 48 | `0x47e03498` | 0x1cdec9ee | 0x2e7a0dbf | 0xc1df3d24 | 0xfec80731 |
| 49 | `0x6db5782c` | 0x1379bfe3 | 0x5af2d610 | 0x071c3eed | 0x15d741b8 |
| 50 | `0x4bf966fc` | 0xb9645944 | 0x64f31907 | 0xaf331cc9 | 0xff72452a |
| 51 | `0x40d19ab4` | 0x2445e5c7 | 0x09538a06 | 0xdf8bed8b | 0x09bf401d |

Full hashes: `loops.jsonl`.
