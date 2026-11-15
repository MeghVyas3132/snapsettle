# Negative cases: LIVE

> LIVE testnets.

| Case | Result | Detail | Transactions |
|---|---|---|---|
| late fill reverts on the destination | PASS | fill status: reverted | open: `0x51f4e58635d37b6ddb491fe8550ead17033541b424c7613d86bf5d32434993a0`<br>lateFill: `0xf8ec9623bafaad30348b6ded9bdeeb57b84250d8093c278ba2fb1bed1483598f` |
| wrong-terms fill is not settled, genuine fill still is | PASS | FillRejected on Lasna seen; settled only after the genuine fill | open: `0xc8298cb9621d0d6263c7c2f29f1525f74904d09104a175d84210b6f9fa3c0ab1`<br>wrongFill: `0x3680e6abf2de3d8c2af1b429c611b19a8cc239a54aa8248d78d3e54d5a6429da`<br>fillRejected: `0x7c84d146017eade9b6766ff2b92ce4f45865a993afbe46046e2cda32c9968125`<br>genuineFill: `0xeb4fbdf2756ddcf7c5b4454b8f265ee1439e05185fd8e71308b6bfe9f909506f`<br>settle: `0x03faa79e282b10f4a6e7daa63f0a427b4eba2fc75f0767a96f93b639a5d16e96` |
| unfilled order is refunded | PASS | refund landed after grace 60s | open: `0x8c211e49f090f13c8a71992026c9bb32a5b96e561dd4c6596e678465f6b7c0fa`<br>requestRefund: `0x9c69f87c313b412797248c85b00d1bdf8e124917cb958536f32655d54f10e27d`<br>refund: `0xaae0efd3b046a100e58e0b8e46d58100d6977400ba2d051acaf2daac754cacc5` |
| refund request is ignored after a valid fill | PASS | solver paid; refund not issued | open: `0xc1232d3e2c66b1ffb329f0a8f9204efced1ce31810700032216b6b0ddd8a25f8`<br>fill: `0x3af500431a1ac05327ab54957c3f9fbe89e73431add12448d6f72a57ef8e5301`<br>fillAccepted: `0x8b83007f453b78ad17f9f44678d42368848b0a1488772898d464fa2d83f4c9b6`<br>requestRefund: `0xc7c396e8888d9b516b5a2bdb7f1d9c37f3a211de84b8f1077a596d2d2e0ac02b`<br>settle: `0xc79578fe70ee1c975ec87bfc4ec4a15fd669defe22e076961c1ce7d909ca3868` |

Ran 322 s, 2026-11-15T20:40:05.422Z.
