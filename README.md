# Snapsettle

**Intent settlement where Reactive is the verifier.** A user opens an order on Base Sepolia. A solver fills it on Unichain Sepolia from its own inventory. A Reactive contract on Lasna sees the order on one chain and the fill on the other, a pairing no contract on either chain can make, and calls back to Base to repay the solver out of the escrow.

Built for the Reactive Omni Buildathon, track **Every Second Counts**.

## For judges

| What the rules ask for | Where |
|---|---|
| Public repo | this repository |
| Deployed contracts and network | [JUDGE.md §1](JUDGE.md#1-deployed-contracts-current-v2): Base Sepolia, Unichain Sepolia, Reactive Lasna; all four verified on Sourcify |
| Transactions showing the full loop, origin event → reactive transaction → callback | [JUDGE.md §2](JUDGE.md#2-full-loops-joined), and every loop in [`evidence/live/loops-current.csv`](evidence/live/loops-current.csv) |
| Full-loop latency and how it was measured | [JUDGE.md §3](JUDGE.md#3-latency-on-the-current-contracts-four-clocks): four clocks, each with its bias stated |
| What failed | [JUDGE.md §5](JUDGE.md#5-everything-that-went-wrong-nothing-excluded): nothing excluded |
| Live site | https://meghvyas3132.github.io/snapsettle/: open your own order from a wallet and watch it settle, or replay a recorded one (labelled as a replay) |

`JUDGE.md` is generated from the contracts and `evidence/live/` by `offchain/src/judge.ts`; no number in it is typed by hand.

## The problem

In an intent bridge the solver pays the user on the destination chain from its own inventory and is repaid later from the user's escrow on the origin chain. The origin chain cannot see the destination fill, so every protocol needs a way to learn that the fill happened, and that way sets how long the solver's capital is tied up.

Across, for example, repays relayers in bundles proposed about every 1.5 hours, each followed by a challenge period ([Across docs](https://docs.across.to/introduction/refunds)). The challenge period on the live HubPool is 30 minutes; check it in one line:

```bash
cast call 0xc186fA914353c44b2E33eBE05f21846F1048bEda "liveness()(uint32)" --rpc-url https://ethereum-rpc.publicnode.com
# 1800
```

(`HubPool.sol` declares a 7200 s default and older Across docs still say 2 hours. The owner has lowered it on-chain three times: 5400 s in September 2023, 3600 s in April 2024, and 1800 s on 3 November 2025, [tx 0x2c51…a6a7](https://etherscan.io/tx/0x2c513bb36f181c2fae8d244089f08dd3e0700094fb12c82b25c795b033a0a6a7).) So an Across relayer is repaid roughly 30 minutes to 2 hours after its fill.

That window is not waste: it is the time in which a fraudulent bundle can be disputed. Any faster scheme replaces it with some other source of trust. Snapsettle's is stated below.

## What Snapsettle does

```
Base Sepolia                      Lasna (Reactive)                       Unichain Sepolia
OriginEscrow.open() ──Opened──►   SnapsettleReactive                    DestinationSettler.fill()
                                   ◄──────────────────────── Filled ────  solver pays the user
                                   terms hash ✓  deadline ✓
                                   tier: on sight ──────────────► settle now
                                   tier: 30 s / 300 s ─ wait ─┐
                                   ◄──────────────────── Confirmed ────  confirm(): fill still in state,
                                                              │           delay passed (solver sends it)
OriginEscrow.settle() ◄─callback── requestCallbackV_1_0 ◄─────┘
solver repaid (capped per hour)
```

- **The check is the settlement.** `SnapsettleReactive` compares the fill's terms hash with the order it saw opened and checks the deadline. A wrong-terms fill is rejected; a late fill reverts on Unichain.
- **Finality is chosen per order.** Reactive treats an observed event as canonical even if that chain later reorganises. Small orders accept that and settle on sight. Larger orders wait 30 s or 300 s, and then settle only from `Confirmed`, which `DestinationSettler.confirm()` emits when the delay has passed **and** the fill is still in Unichain's state. A fill removed by a reorg during the wait cannot be confirmed, so nobody is paid for it, and the user can get a refund.
- **Who acts.** For on-sight orders, nobody does after the fill: Reactive's network observes and calls back. For delayed orders the solver sends one `confirm` transaction on Unichain; that transaction is what re-reads the destination state. There is no cron.
- **Blast radius.** `OriginEscrow` releases at most 500 USDC per hour through the Reactive path (testnet setting). If Reactive were faulty or compromised, that bounds what it could pay out before the fast path stops; anything over the cap is deferred and released when the window has room.
- **One signature, no gas.** A user can open an order by signing one EIP-3009 authorization on USDC, with no approval and no ETH. Anyone submits it through `openFor` and pays the gas; the authorization's nonce is derived from the exact order, so the submitter cannot change a term (`test/Gasless.t.sol`, and an on-chain refusal case).
- **ERC-7683.** `SnapsettleResolver` implements the resolver-centric draft. A generic solver gets the fill step, the confirm step for delayed orders, the payment with `estimatedDelaySeconds` (the order's tier delay plus measured loop latency) and two named assumptions, `reactive-settlement` and `reactive-origin-finality`. Our solver bot uses only what the resolver returns.

## The trade, stated plainly

Snapsettle replaces Across's dispute window with trust in Reactive's validators reading two chains' logs correctly (Reactive runs CometBFT consensus, which is safe while fewer than a third of validators misbehave). The finality tiers are where that trade is made explicit: per order and by value, instead of once for every order. Reactive's post [*Intents, Solvers, and Borrowed Certainty*](https://blog.reactive.network/intents-solvers-and-borrowed-certainty/) calls origin finality a deliberate trade and closes by asking: "should that be a per-protocol choice, or the next thing somebody tries to standardize?" Snapsettle is one per-order answer, published through ERC-7683's own fields.

## How much faster, honestly

The advantage depends on the tier, because the tiers deliberately add delay where more value is at risk. Capital tied up in repayment is roughly daily volume × delay; at an illustrative $10M/day that is $116 per second of delay.

| Repayment after the fill | Capital waiting at $10M/day | vs Across (30 min to 2 h) |
|---|---|---|
| On sight, ~2 s (small orders) | ~$230 | ~900–3,600× less |
| 30 s tier + confirm | ~$3,500–4,000 | ~50–200× less |
| 300 s tier + confirm (large orders) | ~$35,000 | ~6–24× less |
| Across: 30 min challenge, after a bundle of up to ~1.5 h | $208,000–833,000 | — |

Volumes are an illustration, not a measurement. Measured times per tier are in [JUDGE.md §3](JUDGE.md#3-latency-on-the-current-contracts-four-clocks). Testnet tier thresholds are tiny (0.5 / 2 USDC) so the bench can run on faucet funds; on mainnet they would be set by value at risk.

### What we changed to get here, measured

| Change | Before | After | Evidence |
|---|---|---|---|
| Solver hears of new orders by WebSocket push instead of HTTP polling; nonce kept locally | solver noticed an order 3.5 s after it was mined | before the bench's own receipt returned | [JUDGE.md §3, "Optimisation, measured"](JUDGE.md#optimisation-measured) |
| Same change, effect on the whole loop (small orders, open → solver repaid) | 6.6 s p50 · 8.6 s p95 | 2.8 s p50 · 3.8 s p95 | same |
| Reactive transactions per order (what the reactive contract pays for) | | 2 on sight · 3 delayed · 2 refunded | `test_reactiveTxsPerOrder` |
| Cost on Lasna | | ~0.045 lREACT per order | [docs/06-mainnet-path.md](docs/06-mainnet-path.md) |

The Reactive part (fill → solver repaid) did not change: it was already about a second on the chains' block clocks. The whole loop was waiting on our own solver.

## Prior art, and what is new

| | Who confirms the fill | Who must send a transaction | Repayment delay | How the delay is published |
|---|---|---|---|---|
| Across | UMA optimistic oracle over bundles | a bundle proposer | ~30 min to 2 h | protocol-wide |
| Relay | Relay's own oracle, credited on Relay's hub | Relay | per order, no figure published | protocol-wide |
| Open Intents Framework (Hyperlane, Wormhole, storage proofs, …) | a pluggable oracle | someone submits the attestation | depends on the oracle | its `AcrossResolver.sol` publishes a constant 2 h through `estimatedDelaySeconds` |
| deBridge DLN | deBridge cross-chain message | the solver | not published | — |
| **Snapsettle** | **Reactive, reading both chains' logs** | **nobody (on sight) · the solver's `confirm` (delayed)** | **~2 s · 30 s · 300 s by value** | **per order, through `estimatedDelaySeconds` and named assumptions** |

What is new is narrow, and we state it that way: an ERC-7683 settlement whose attestation needs no application-level actor for small orders, with a value-tiered repayment delay, published per order, where existing resolvers publish a constant. "No actor" is a property every Reactive application shares; the contribution is applying it to intent settlement and making the finality trade per order. We found no other Reactive-based intent settlement, in this buildathon or on GitHub.

## Why Reactive

The core check needs two events on two chains: `Opened` on Base and `Filled` (or `Confirmed`) on Unichain. A contract on either chain cannot see the other. An off-chain bot could, and could be faster, but it would then be a trusted operator (Relay's model). Reactive makes the observer a network and the callback a protocol transaction, so the escrow trusts one reactive contract address on Lasna instead of a company's key.

## Use it from your app

`packages/sdk` (`@snapsettle/sdk`, not yet on npm) wraps the deployed contracts: build an order, have the user sign once, relay it, and follow it across the three chains.

```ts
import { buildOrder, signGaslessOrder, relayOrder, trackOrder } from "@snapsettle/sdk";

const order = buildOrder({ amount: 250_000n, recipient: user });   // 0.25 USDC
const signed = await signGaslessOrder({ wallet, order });            // one wallet prompt, no gas
const { orderId } = await relayOrder({ api: RELAY_URL, signed });    // or submitSignedOrder({ wallet: relayer, signed })
await trackOrder({ orderId, onEvent: (e) => console.log(e.kind) });  // opened → filled → accepted → repaid
```

Its tests run against the live contracts, including a full gasless order to repayment: `cd packages/sdk && pnpm install && pnpm test`.

## Run it

```bash
# contracts: 43 tests, including fuzzing, a reorg case, the outflow cap, spam rejection and gasless opening
cd contracts && forge test

# your own solver against the live contracts, in three commands
cd offchain && pnpm install
cp .env.example .env    # add a funded Unichain Sepolia key as SOLVER_PRIVATE_KEY
SNAP_ENV=live pnpm solver

# local three-chain harness (anvil + an emulated relay; not Reactive Network latency)
./scripts/local-up.sh
SNAP_ENV=local pnpm relay:local & SNAP_ENV=local pnpm solver & SNAP_ENV=local pnpm bench --tier 1 --n 3

# evidence
SNAP_ENV=live pnpm bench --tier 0 --n 50     # writes evidence/live/bench-*
SNAP_ENV=live pnpm negative                  # refusal cases (pause other solvers first)
SNAP_ENV=live pnpm judge                     # regenerates JUDGE.md and the CSV
SNAP_ENV=live pnpm policycheck               # opens a hostile order (pays out 2x) and checks the solver refuses it
SNAP_ENV=live pnpm walletcheck               # clicks "Open your own order" on the live site with a scripted wallet, waits for repayment
```

## Repository

| Path | What |
|---|---|
| `contracts/` | Foundry: `OriginEscrow`, `DestinationSettler`, `SnapsettleReactive`, `SnapsettleResolver`, tests |
| `packages/sdk/` | `@snapsettle/sdk`: open, sign (gasless), relay and track orders from an app; addresses and ABIs generated from the deployments |
| `offchain/` | viem/TypeScript: generic ERC-7683 solver, bench, refusal cases, demo service, recovery, reorg check, JUDGE.md generator |
| `dashboard/` | The site (Vite, Three.js, viem), deployed to GitHub Pages |
| `evidence/live/` | Every bench run, refusal run, refund and the reorg check, as recorded |
| `docs/` | Architecture, finality policy, mainnet path, deploy notes, decisions log |

## Limits

Testnet only and not audited. Every actor in the evidence is ours: the user wallet, the solver and the demo service. The on-sight tier still trusts what Reactive observed; its protection is the size cap and the hourly outflow cap. Reactive mainnet supports Base and Unichain as origin and destination, and runs the same system contracts as Lasna (checked on-chain, [docs/06-mainnet-path.md](docs/06-mainnet-path.md)); what mainnet would cost in REACT is not measured yet. More in [SECURITY.md](SECURITY.md).

## License

MIT
