# Demo video: script (target 2:45, hard limit < 3:00)

Recorded from the live dashboard and real transactions. Captions are burned in, so it works without sound. Every number on screen comes from `evidence/live/` or a cited source.

| Time | Picture | Caption / narration |
|---|---|---|
| 0:00–0:15 | Dashboard first viewport: the chess-clock duel | "A solver just filled your cross-chain order with its own money. When does it get paid back?" |
| 0:15–0:30 | Zoom on the Across face and its source link | "With an optimistic bridge it waits out a challenge window: 2 hours by default on Across, per its docs." |
| 0:30–0:45 | Zoom on the Snapsettle face | "With Snapsettle, a Reactive contract watches both chains and repays the solver seconds after the fill. Measured: p50 «N» s." |
| 0:45–1:25 | Scoresheet: the recorder starts `bench --tier 0 --n 1`; the new move appears, turns Filled, then Repaid; the clock button presses | "Live: open on Base Sepolia → the solver fills on Unichain Sepolia → Reactive checks the fill on Lasna → callback repays the solver on Base." |
| 1:25–1:50 | Expand the move: loop diagram + four explorer links; click the Lasna tx (Reactscan) | "Four transactions per order. The Lasna one is where the work happens: the fill's terms hash is compared with the order before anything is released." |
| 1:50–2:15 | Leg splits: switch tabs on sight / 30 s / 5:00 | "Reactive acts on what it sees, even if a chain later reorganises. So every order carries its own finality policy: small orders settle on sight, large ones wait. Solvers read it as estimatedDelaySeconds in our ERC-7683 resolver." |
| 2:15–2:35 | Refusals section, one tx link opened | "And it refuses: a fill with the wrong terms, a late fill, a refund after a valid fill. Each one ran on-chain." |
| 2:35–2:45 | README judge path + repo URL | "Snapsettle: intents settled by Reactive. Everything you saw links to a transaction." |

## Recording

`offchain/src/record.ts` drives the dashboard with Playwright (1920×1080 video), injects the captions as an on-page overlay at record time (this ffmpeg build has no text filters), reads «N» from the live dashboard, starts one real order mid-recording, and transcodes to `video/snapsettle-demo-<env>.mp4` (capped at 2:55). Run: `SNAP_ENV=live DASH_URL=<pages url> pnpm record` with the solver running.
