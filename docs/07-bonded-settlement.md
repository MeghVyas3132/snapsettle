# 07 · Bonded fast settlement (design, not built)

Today the escrow trusts one thing for speed: that Reactive read two chains' logs correctly. The outflow cap bounds the damage if it did not. This design removes most of that trust while keeping the speed for honest solvers.

## The idea

1. A solver posts a **bond** in the escrow, sized to its open exposure (for example the outflow cap).
2. Reactive settles as today, in seconds. The solver is paid at once.
3. A **dispute window** opens per settlement. During it, anyone can prove the fill never happened (or does not exist any more) through the slow, trust-minimised path: the destination's state root posted to L1, then proved on the origin (for OP Stack chains like Base and Unichain, via the L1 output roots).
4. A successful dispute repays the user from the solver's bond and pays the disputer a share. An honest solver's bond is never touched.

## Why it fits

- Honest solvers keep the 2 s repayment. Only the bond is locked, and one bond covers many orders, so capital tied up is far smaller than with a per-order wait.
- Security falls back to proofs rather than to trust in Reactive: Reactive becomes the fast path, not the only path.
- It answers the strongest objection to Snapsettle: that it replaces a dispute game with trust in a validator set.

## Costs and open questions

- The slow proof path takes as long as L1 finality of the destination's output root (hours on OP Stack). That bounds the dispute window from below.
- Bond sizing, slashing rules and griefing (disputes that fail) need care.
- Proving a negative ("this fill does not exist") is harder than proving a positive; the practical version proves the absence of the fill key in the settler's storage at a given root.

This is product work after the buildathon; it is listed so the trade-off in `SECURITY.md` has a stated way forward.
