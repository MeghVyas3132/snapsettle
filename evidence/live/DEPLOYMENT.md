# Live deployment (2026-11-15)

| Contract | Chain | Address | Source |
|---|---|---|---|
| DestinationSettler | Unichain Sepolia (1301) | [0xd1724a84919F31cf733bA0E4649054D9e85b3149](https://sepolia.uniscan.xyz/address/0xd1724a84919F31cf733bA0E4649054D9e85b3149) | [Sourcify exact match](https://repo.sourcify.dev/1301/0xd1724a84919F31cf733bA0E4649054D9e85b3149) |
| SnapsettleReactive | Reactive Lasna (5318007) | [0x01f1c7dAf43D0cEb14c39B867fa79d2e673C5D06](https://lasna.reactscan.net/address/0x01f1c7dAf43D0cEb14c39B867fa79d2e673C5D06) | [Sourcify exact match](https://repo.sourcify.dev/5318007/0x01f1c7dAf43D0cEb14c39B867fa79d2e673C5D06) |
| OriginEscrow | Base Sepolia (84532) | [0xd1724a84919F31cf733bA0E4649054D9e85b3149](https://sepolia.basescan.org/address/0xd1724a84919F31cf733bA0E4649054D9e85b3149) | [Sourcify exact match](https://repo.sourcify.dev/84532/0xd1724a84919F31cf733bA0E4649054D9e85b3149) |
| SnapsettleResolver (ERC-7683) | Base Sepolia (84532) | [0x5304Bf2BFCE10b32a961cfC9Ef7A52F9a4d74EA6](https://sepolia.basescan.org/address/0x5304Bf2BFCE10b32a961cfC9Ef7A52F9a4d74EA6) | [Sourcify exact match](https://repo.sourcify.dev/84532/0x5304Bf2BFCE10b32a961cfC9Ef7A52F9a4d74EA6) |

The escrow and the destination settler share an address because they are each the deployer's first contract on their chain.

Post-deploy checks (read on-chain):
- SnapsettleReactive balance 15 lREACT, debt 0; tiers `(≤0.5 USDC, 0 s)`, `(≤2 USDC, 30 s)`, `(above, 300 s)`; origin escrow wired.
- OriginEscrow `_CALLBACK_SENDER` = SnapsettleReactive, `_SERVICE_PROVIDER` = Base Sepolia callback proxy `0x476F44b11F5C942c58f4c8E3d0300E5710743585`, refund grace 60 s, 0.01 ETH callback float.
- Measured block times: Base Sepolia 0.200 s/block (3000 blocks in 600 s), Unichain Sepolia 1 s/block (600 blocks in 600 s).

Funding path: Ethereum Sepolia ETH (proof-of-work faucet + Google faucet) → lREACT via Reactive's Sepolia faucet `0x9b9B…f434` → OP Stack bridges to Base Sepolia (L1StandardBridge `0xfd0B…3120`, verified by a 0.002 ETH test deposit) and Unichain Sepolia (`0xea58…4Ce2`, from the superchain registry). Circle test USDC from faucet.circle.com.
