# Product

<!-- impeccable:product-schema 1 -->

> Written from the owner's build brief (owner instruction: proceed without stopping for questions). Facts marked *(inferred)* come from that brief and the repo, not from an interview.

## Platform

web

## Stack

Delegated: static site built with Vite + vanilla TypeScript, viem in the browser for live chain reads, evidence JSON shipped alongside. Deployed to GitHub Pages. *(inferred: the brief asks for a static dashboard on GitHub Pages or Netlify)*

## Users

- **Primary: Reactive Network judges** of the Reactive Omni Buildathon (track: Every Second Counts). They score each entry 1–5 on Execution, Integration, Usefulness and Craft, and they check that reactive transactions and callbacks happened on-chain. They open the dashboard from the submission page, probably once, and look for proof within a minute.
- Secondary: solvers and intent-protocol builders evaluating whether Reactive can replace an optimistic settlement window. *(inferred)*

## Product Purpose

Snapsettle settles cross-chain intents with Reactive Network. A user opens an order on Base Sepolia (input escrowed); a solver fills it on Unichain Sepolia from its own inventory; a reactive contract on Lasna checks the fill against the order and calls back to Base to repay the solver, in seconds instead of an optimistic challenge window. Success for the dashboard: a judge sees, from live chain data, that the loop runs and how fast each leg is, with every number traceable to a transaction or a source.

## Positioning

The origin chain cannot see the destination fill, so today protocols wait out an optimistic window (Across: 2 h by default, per its docs) or trust an attester. Here Reactive observes the fill directly and is the check. A per-order finality tier makes Reactive's "origin finality" trade-off explicit, answering the open question in Reactive's own post "Intents, Solvers, and Borrowed Certainty" (3 Sep 2026).

## Operating Context

Judges open links from DoraHacks and verify on explorers: basescan (Base Sepolia), uniscan (Unichain Sepolia), lasna.reactscan.net (Lasna). The bench writes `evidence/<env>/bench-*/summary.json` and `loops.jsonl`; negative cases write `evidence/<env>/negative-*/`. Desktop first; it must still read on a laptop screen during a screen-shared demo and in the recorded video.

## Capabilities and Constraints

- Contracts: OriginEscrow (Base Sepolia), DestinationSettler (Unichain Sepolia), SnapsettleReactive (Lasna), SnapsettleResolver (ERC-7683, Base Sepolia).
- Finality tiers (testnet defaults): ≤ 1 USDC settles on sight, ≤ 10 USDC after 30 s, above after 300 s.
- Two data modes: LIVE (testnets) and LOCAL (anvil harness with an emulated Reactive relay). LOCAL numbers must be labelled and never presented as live evidence.
- No backend; public RPCs from the browser; must degrade gracefully when an RPC rate-limits.

## Brand Commitments

Name: **Snapsettle**. No logo or palette exists. Must not imitate Reactive Network's or Across's branding.

## Evidence on Hand

- Foundry suite (28 tests incl. fuzz), local bench and negative-case runs (LOCAL only, under `evidence/local/`, not committed).
- Live evidence: none yet. Do not fabricate latency numbers, order counts or solver adoption.
- Across 2 h default challenge period: https://docs.across.to/user-docs/how-across-works/speed

## Product Principles

1. Every number is traceable: a tx hash, an evidence file or a cited doc. If there is no data yet, the UI says so.
2. Show the loop, not the marketing: origin → destination → Reactive → origin, with per-leg timing.
3. Honest about limits: LOCAL vs LIVE, testnet only, the solver is our own bot.
4. Judge-speed: the core claim is legible in the first viewport.

## Accessibility & Inclusion

WCAG AA contrast; usable with keyboard; respects reduced motion. *(inferred default)*
