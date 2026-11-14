# 03 · Deploy

Testnets only. Run from `contracts/`. Never paste keys into files or chat; use a Foundry keystore.

## 0. One-time setup (owner)

```bash
cast wallet new                                   # note the address, keep the key private
cast wallet import snapsettle-deployer --interactive
```

Fund the deployer address:
- **Unichain Sepolia ETH**: ~0.05 (one contract deploy)
- **Base Sepolia ETH**: ~0.1 (escrow deploy + 0.01 ETH callback float + faucet gas)
- **lREACT on Lasna**: send ~1 SepETH to the Base Sepolia faucet (1 ETH → 100 lREACT; never more than 5 ETH per tx):
  ```bash
  cast send 0x2afaFD298b23b62760711756088F75B7409f5967 "request(address)" <DEPLOYER> \
    --value 1ether --rpc-url base_sepolia --account snapsettle-deployer
  ```
- **Circle test USDC** (faucet.circle.com) on Base Sepolia (user wallet) and Unichain Sepolia (solver wallet).

## 1–4. Deploy, in order

```bash
forge script script/Deploy.s.sol:DeployDestination --rpc-url unichain_sepolia --account snapsettle-deployer --broadcast
forge script script/Deploy.s.sol:DeployReactive    --rpc-url lasna            --account snapsettle-deployer --broadcast
forge script script/Deploy.s.sol:DeployOrigin      --rpc-url base_sepolia     --account snapsettle-deployer --broadcast
forge script script/Deploy.s.sol:WireReactive      --rpc-url lasna            --account snapsettle-deployer --broadcast
```

Addresses land in `contracts/deployments/{1-destination,2-reactive,3-origin}.json`.

Order matters: the escrow needs the reactive contract's address (immutable callback sender), and the reactive contract needs the escrow's address to subscribe. Step 4 closes the loop.

## Checks after deploy

```bash
# reactive contract funded and not in debt
cast balance <RC> --rpc-url lasna
cast call 0x8888888888888888888888888888888888888888 "debt(address)(uint256)" <RC> --rpc-url lasna
# escrow wired to the right callback sender and proxy
cast call <ESCROW> "_CALLBACK_SENDER()(address)" --rpc-url base_sepolia
cast call <ESCROW> "_SERVICE_PROVIDER()(address)" --rpc-url base_sepolia
```

Verify sources: Lasna via Sourcify (`forge verify-contract --verifier sourcify --chain-id 5318007 …`), Base/Unichain via Blockscout or Etherscan.
