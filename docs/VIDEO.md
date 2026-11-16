# Demo video: script (target 2:45, hard limit < 3:00)

Recorded from the live dashboard and real transactions. Captions are burned in, so it works without sound. Every number on screen comes from `evidence/live/` or a cited source.

| Time | Picture | Caption / narration |
|---|---|---|
| 0:00–0:15 | Dashboard first viewport: the chess-clock duel | "A solver just filled your cross-chain order with its own money. When does it get paid back?" |
| 0:15–0:30 | Zoom on the Across face; terminal shows `cast call … liveness()` → 1800 | "With an optimistic bridge it waits for a bundle and then a challenge window: 30 minutes on Across's live HubPool. That window is what lets fraud be disputed." |
| 0:30–0:45 | Zoom on the Snapsettle face | "Snapsettle swaps that window for trust in Reactive, which watches both chains. Small orders: the solver is repaid about 2 seconds after the fill, and the whole loop, from the user's order to the solver being repaid, takes about 3 seconds." |
| 0:45–1:25 | "Open your own order, live": wallet opens 0.25 USDC on Base Sepolia; the tape shows Opened, Filled, Repaid; the clock button presses | "Live: open on Base Sepolia → the solver fills on Unichain Sepolia → Reactive checks the fill on Lasna → callback repays the solver on Base." |
| 1:25–1:50 | Expand the move: loop diagram + four explorer links; click the Lasna tx (Reactscan) | "Four transactions on three chains. One Reactive contract on Lasna watches Base and Unichain at once, which no contract on either chain can do, and calls back to Base. It compares the fill's terms hash with the order before anything is released." |
| 1:50–2:15 | Leg splits: switch tabs on sight / 30 s / 5:00 | "Reactive acts on what it sees, even if a chain later reorganises. So every order carries its own policy: small orders settle on sight; larger ones wait 30 s or 5 minutes, then settle only after a confirm transaction shows the fill is still on Unichain. Solvers read it from our ERC-7683 resolver." |
| 2:15–2:35 | Refusals section, one tx link opened | "And it refuses: a fill with the wrong terms, a late fill, a confirm before the delay, a refund after a valid fill. Each one ran on-chain, and JUDGE.md lists what went wrong too." |
| 2:35–2:45 | README judge path + repo URL | "Snapsettle: intents settled by Reactive. Everything you saw links to a transaction." |

## Recording

`offchain/src/record.ts` drives the dashboard with Playwright (1920×1080 video), injects the captions as an on-page overlay at record time (this ffmpeg build has no text filters), reads the p50 from the live dashboard, starts one real order mid-recording (through the demo service, or the wallet button if recording by hand), and transcodes to `video/snapsettle-demo-<env>.mp4` (capped at 2:55). Run: `SNAP_ENV=live DASH_URL=<pages url> pnpm record` with the solver running.
