# AGENTS.md: instructions for AI agents working on Snapsettle

Read this first, then [`docs/README.md`](docs/README.md).

## What Snapsettle is

An entry for the **Reactive Omni Buildathon** (DoraHacks 2472), track **Every Second Counts**. Solo entry by the repo owner.
Deadline **5 Dec 2026 20:00 UTC**; internal target **1 Dec**.

Cross-chain intents settled by Reactive: a user opens an order on **Base Sepolia** (input escrowed), a solver fills it on **Unichain Sepolia** from its own inventory, and a reactive contract on **Lasna** checks the fill against the order and calls back to Base to release the escrow to the solver, in seconds instead of an optimistic challenge window (Across: ~2 h by default). A per-order **finality tier** makes Reactive's "origin finality" trade-off explicit (small orders settle on sight, larger ones wait).

Why this idea: it is Reactive's own open problem. See [`docs/00-context.md`](docs/00-context.md).

## Hard rules

1. **No AI attribution anywhere.** No `Co-Authored-By: Claude`, no "Generated with…", no Claude/Anthropic mentions in commits, PRs, code, docs or the submission. Commits are authored by the repo owner only. Before any push, check `git log --format=%B` for such lines and remove them.
2. **No unsourced numbers.** Every number in docs, README, UI or video needs a source (a doc link, a tx hash, a bench file) or a label: ESTIMATE / MEASURED (with the file) / UNVERIFIED.
3. **Omni API only.** Use `reactive-lib-omni` (`AbstractReactive`, `SYSTEM` at `0x8888…8888`, `requestCallbackV_1_0`, `onlySystem`). The official demos repo is legacy (`vmOnly`, `emit Callback`): read it for ideas, never copy it.
4. **`react()` never reverts as a filter** (a revert is still billed). Unknown logs fall through.
5. **Callbacks never revert on state mismatch** (still billed). Emit `CallbackSkipped` and return.
6. **Gas:** a reactive transaction is capped at 900k and the system keeps ~100k. Keep every `react()` path < 700k; `test_reactGas_underCap` guards this.
7. **Keys:** never ask for or handle private keys. Deploys use a Foundry keystore account (`--account snapsettle-deployer`) that the owner imports with `cast wallet import`. Never `--broadcast` without the owner's go-ahead in chat.
8. **Testnets only.** No mainnet deployments. Test tokens are labelled TEST.
9. **Fully solo.** Do not plan any teammate's work into this repo.
10. **Prior work** (Floor, ETHGlobal Mumbai) may only be used as a declared dependency, never as the submission.

## Key constants (verified on-chain 15 Nov 2026)

| What | Value |
|---|---|
| Lasna | chain `5318007`, RPC `https://lasna-rpc.rnk.dev/`, explorer `https://lasna.reactscan.net` |
| System contract (Omni) | `0x8888888888888888888888888888888888888888` |
| Cron source (legacy) | `0x0000000000000000000000000000000000fffFfF`, Cron10 topic `0x04463f7c…b687` |
| Callback proxy, Base Sepolia (84532) | `0x476F44b11F5C942c58f4c8E3d0300E5710743585` |
| Callback proxy, Unichain Sepolia (1301) | `0x775c9B990ADe401060B78D0e98684eEf8d2466C1` |
| Circle test USDC, Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Circle test USDC, Unichain Sepolia | `0x31d0220469e10c4E71834a79b1f276d740d3768F` |
| lREACT faucet (Base Sepolia) | send SepETH to `0x2afaFD298b23b62760711756088F75B7409f5967` (1 ETH → 100 lREACT, max 5 ETH/tx) |
| Lasna fees | gas price 100 gwei, coefficient 1000/1000, extraGas 100k → ~0.0125–0.016 lREACT per reactive tx |

## Layout

| Path | What |
|---|---|
| `contracts/src/OrderTypes.sol` | `OrderData` + `OrderLib` (hash, orderId) |
| `contracts/src/OriginEscrow.sol` | Base Sepolia: `open`, `requestRefund`, callbacks `settle`/`refund` |
| `contracts/src/DestinationSettler.sol` | Unichain Sepolia: `fill` → `Filled` |
| `contracts/src/SnapsettleReactive.sol` | Lasna: matching, finality tiers, Cron10 queue, refunds |
| `contracts/test/` | End-to-end tests with an Omni mock system contract (`test/helpers/MockSystem.sol`) |
| `contracts/script/` | Deploy scripts (one per chain, in order) |
| `solver/`, `bench/` | Solver bot and loop tracer/benchmark (TypeScript, viem) |
| `docs/` | Context, architecture, decisions, plan, evidence |

## Commands

- Build/test: `cd contracts && forge build && forge test`
- Gas: `forge test --gas-report`
- Deploy: see [`docs/03-deploy.md`](docs/03-deploy.md) (four steps, in order)
