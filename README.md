# Snapsettle

**Cross-chain intents settled by Reactive.** A user opens an order on Base Sepolia, a solver fills it on Unichain Sepolia from its own inventory, and a Reactive contract on Lasna checks the fill against the order and repays the solver on Base, seconds after the fill. No optimistic challenge window, no attester, no keeper.

Built for the Reactive Omni Buildathon, track **Every Second Counts**.

## Judge path (5 minutes)

1. **Dashboard:** https://meghvyas3132.github.io/snapsettle/ shows the chess-clock duel (Across's 2 h window against our measured repay time), per-leg p50/p95 for each finality tier, every loop as a scoresheet row with its four transactions, and the failure cases refused on-chain.
2. **[JUDGE.md](JUDGE.md):** deployed addresses and one full loop as explorer links, origin event → Reactive transaction → callback.
3. **The claim, measured:** `evidence/live/` holds bench runs (50+ loops per tier, every tx hash) and negative cases.
4. **The why:** [docs/05-finality-policy.md](docs/05-finality-policy.md) answers the question Reactive's own post *Intents, Solvers, and Borrowed Certainty* ends on.
5. **The code:** [`contracts/src/SnapsettleReactive.sol`](contracts/src/SnapsettleReactive.sol) is where Reactive does the work.

## Why it needs Reactive

The origin chain cannot see the destination chain. So today an intent protocol either trusts an attester or waits out an optimistic window. Across repays relayers after a challenge period of **2 hours by default** ([Across docs](https://docs.across.to/user-docs/how-across-works/speed)), and the relayer's fee has to cover that capital time ([Across](https://across.to/blog/The-Intents-bridge-How-Across-uses-optimistic-verification-to-lower-costs)).

A reactive contract observes **both** chains. `SnapsettleReactive` sees `Opened` on Base and `Filled` on Unichain, compares the fill's terms hash with the order, checks the deadline, and requests the callback that releases the escrow. The check *is* the settlement. Without Reactive this project would need an oracle, a bridge message or a trusted relayer.

## How it works

```
Base Sepolia                     Lasna (Reactive)                  Unichain Sepolia
OriginEscrow.open() ──Opened──►  SnapsettleReactive               DestinationSettler.fill()
                                  ◄─────────────────── Filled ─────  solver pays the user
                                  terms hash ✓  deadline ✓
                                  tier delay (0 / 30 s / 300 s)
OriginEscrow.settle() ◄─callback─ requestCallbackV_1_0
solver repaid
```

- **Finality tiers.** Small orders settle the moment the fill is seen; larger ones wait 30 s or 300 s, drained on Cron10. Reactive's "origin finality" trade-off is made explicit per order ([docs/05](docs/05-finality-policy.md)).
- **ERC-7683 resolver.** `SnapsettleResolver` implements the resolver-centric Draft. Any generic solver can read an order, fill it, and see `estimatedDelaySeconds` and the named assumptions `reactive-settlement` / `reactive-origin-finality`. Our solver bot uses only the resolver.
- **Refunds.** An unfilled order refunds after its deadline plus 60 s; a refund request after a valid fill is ignored.

Details: [docs/01-architecture.md](docs/01-architecture.md). Trust model and limits: [SECURITY.md](SECURITY.md).

## Repository

| Path | What |
|---|---|
| `contracts/` | Foundry: `OriginEscrow`, `DestinationSettler`, `SnapsettleReactive`, `SnapsettleResolver`; 28 tests incl. fuzz and a gas cap |
| `offchain/` | viem/TypeScript: generic ERC-7683 solver, loop bench, negative-case runner, local Reactive relay (local harness only) |
| `dashboard/` | Static dashboard (Vite + viem), deployed to GitHub Pages |
| `scripts/local-up.sh` | Three anvil chains with the real chain IDs plus an emulated relay, for development |
| `evidence/live/` | Live bench and negative-case runs |
| `docs/` | Context, architecture, deploy, plan, decisions, finality policy |

## Run it

```bash
# contracts
cd contracts && forge test

# local three-chain harness (anvil), relay, solver, bench
./scripts/local-up.sh
cd offchain && pnpm install
SNAP_ENV=local pnpm relay:local &      # LOCAL emulation of Reactive
SNAP_ENV=local pnpm solver &
SNAP_ENV=local pnpm bench --tier 0 --n 5

# live testnets: deploy per docs/03-deploy.md, then
SNAP_ENV=live pnpm solver &
SNAP_ENV=live pnpm bench --tier 0 --n 50

# dashboard
cd dashboard && pnpm install && pnpm dev   # add ?env=local for the harness
```

## Honest limits

Testnet only, not audited. The solver is our own bot; there is no live solver market on testnet. The Across window is quoted from its docs, not measured here. A destination reorg deeper than an order's tier would still pay the solver. See [SECURITY.md](SECURITY.md).

## License

MIT
