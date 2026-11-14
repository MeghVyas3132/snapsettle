# PROGRESS

Resume here. Update after every milestone.

## Done
- 2026-11-15: Repo, docs (AGENTS, CLAUDE, docs/00–04, DECISIONS). Contracts `OriginEscrow`, `DestinationSettler`, `SnapsettleReactive` with 23 passing Foundry tests (512-run fuzz on exactly-once payout; react gas < 700k). Deploy scripts (4 steps) simulated on forks of all three chains: the real Lasna system contract accepts the constructor subscription.

- 2026-11-15: ERC-7683 resolver (`SnapsettleResolver`, resolver-centric Draft): one Call step (fill), PaymentRecipient variable, ERC20 payment from the escrow with `estimatedDelaySeconds` = tier + loop latency, named assumptions `reactive-settlement` and `reactive-origin-finality`. ERC-7930 interop addresses (matches spec example). Escrow now stores the terms hash. 28 tests pass, including a generic solver that executes only the resolved order and gets paid. Deploy step 5 added.

## Next
1. Local three-chain harness (anvil ×3 + TS Reactive relay) → solver bot + bench + dashboard, all working locally.
3. When the owner has funded `snapsettle-deployer`: deploy (docs/03-deploy.md), verify, live feasibility loop, then 50+ loops per tier and negative cases.
4. Dashboard public deploy, docs (README judge path, JUDGE.md, SECURITY.md, finality policy), video, public repo, submission.

## Blockers (owner)
- Deployer keystore `snapsettle-deployer` (`cast wallet new` → `cast wallet import snapsettle-deployer --interactive`) + funds: Base Sepolia ETH ~0.2, Unichain Sepolia ETH ~0.1, ~1 SepETH → lREACT faucet; Circle test USDC on both chains for a user wallet and a solver wallet (faucet.circle.com).
- Track-fit question in t.me/reactivedevs (draft in ~/Desktop/Larp/reactive-omni-build-plan.md).
