# Negative cases: LIVE

> LIVE testnets.

| Case | Result | Detail | Transactions |
|---|---|---|---|
| spam is refused at open (other token, dust) | PASS | other-token open: reverted; 0.099999 USDC open: reverted; orders created: 0 | otherTokenOpen: `0x2ff71dd7d09f0930dca4a742c19ceb1b1722ce45e78e9f6ed50861b7f84f0672`<br>dustOpen: `0x1f96f5bc596764a111e1df5e0b3450de0f0242e19912d7a8f002ecc09be5ce52` |
| wrong-terms fill is not settled, genuine fill still is | PASS | FillRejected on Lasna seen; settled only after the genuine fill | open: `0xb51a95be33fba84ae407336763cc9c5b7314724e464f05a899c66e5065f5cb21`<br>wrongFill: `0x16e4c32b0cfa0ed1c487531f2c73d4b6da91ba9151f3f5b9503089767927487b`<br>fillRejected: `0x4af1e0d1d081f9020ddcd00f6a110234ec49903bbda306c6d984a91bca088f2e`<br>genuineFill: `0xca02858aaf25e0aef09473feccf7674f137074bdd58c6ca68acdb38886863d8a`<br>settle: `0xcb22543c6b526bdc7440f3460eb50475aaa6835c403ca0c24e0e3501a505e389` |
| late fill reverts on the destination | PASS | fill status: reverted | open: `0x51fa76ab6dc5440fdac1c566bbf7723425ea67d8b68d4580d9dc7428b4bdf4c2`<br>lateFill: `0x64467440c3da0ae1896640530644b83b4c2b82e15b680a781797dd466e7f4492` |
| confirm before the delay is refused | PASS | early confirm status: reverted | open: `0x742e8042e53d05f89ce2b3243af3580700ea9711624a2a996863b97b8ccc647f`<br>fill: `0x5dc2c74092365ecc4d8029541c8b1dd0e74db6e6ce06a2f5f8e88d65b58367c3`<br>earlyConfirm: `0x111d26651b732e42ff65c50e71b3e948e960a0bc9f14ad7589fb404a9aba70da` |
| unfilled order is refunded | PASS | refund landed after grace 60s | open: `0x985b81e0264918030d5d9e9c448cd5b40313b38ff61e6ebcccb191de54f349e0`<br>requestRefund: `0x1d0e4dab280ac7a2b432a0ab9885179581ceb48c9f053f01b093dd4508e3d324`<br>refund: `0x446993bd46a49282a0eeab3551b10201de90a1eb31fe2c2b6d7d536608fa16db` |
| refund request is ignored after a valid fill | PASS | solver paid after confirm; refund not issued | open: `0x742e8042e53d05f89ce2b3243af3580700ea9711624a2a996863b97b8ccc647f`<br>fill: `0x5dc2c74092365ecc4d8029541c8b1dd0e74db6e6ce06a2f5f8e88d65b58367c3`<br>fillAccepted: `0xefe142021a7ca6bb951ba12bba6ea5c7b8ab014486761d469d443cd550751c9b`<br>requestRefund: `0x8b7a72a5e9cc2bed3660d262bfc2ed45378b669503a342d861d7e254397366c4`<br>confirm: `0x370219ae6037c882f4b5b419d11c0701de23f667d3f6c381f2ecc9d6a5456854`<br>settle: `0xf580864750744dbeb7bbbc63e84c9f5ca2262254babeae96e720993e462aed70` |

Ran 320 s, 2026-11-16T14:44:37.391Z.
