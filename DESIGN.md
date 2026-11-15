---
name: Snapsettle
description: A tournament chess clock and its scoresheet for cross-chain settlement timing.
colors:
  walnut-900: "#2e1e14"
  walnut-800: "#3f2a1d"
  walnut-700: "#5a3c29"
  walnut-200: "#d9c7ad"
  buff-50: "#f8f8ea"
  buff-100: "#eeeed2"
  buff-200: "#e0e0bd"
  green-700: "#4f6c37"
  green-600: "#5f8243"
  green-500: "#769656"
  green-100: "#dce6cb"
  ink-900: "#1d1a16"
  ink-700: "#3d372f"
  ink-500: "#5e564a"
  flag: "#c8322a"
  flag-100: "#f6d9d4"
  amber: "#b7791f"
  rule: "rgba(29, 26, 22, 0.14)"
  rule-strong: "rgba(29, 26, 22, 0.32)"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(30px, 3.3vw, 46px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "0.03em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    letterSpacing: "0.03em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "17px"
    fontWeight: 700
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  body-table:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    fontFeature: "tnum"
  note:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.06em"
  mono:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
  clock-readout:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "50px"
    fontWeight: 700
    letterSpacing: "0.02em"
rounded:
  hairline: "2px"
  chip: "3px"
  control: "6px"
spacing:
  gap: "clamp(16px, 2.2vw, 32px)"
  row: "10px"
  block: "14px"
  column: "24px"
components:
  segmented-dark:
    backgroundColor: "transparent"
    textColor: "{colors.walnut-200}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  segmented-dark-selected:
    backgroundColor: "{colors.buff-100}"
    textColor: "{colors.walnut-900}"
  tabs:
    backgroundColor: "transparent"
    textColor: "{colors.ink-700}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  tabs-hover:
    backgroundColor: "{colors.buff-200}"
  tabs-selected:
    backgroundColor: "{colors.green-500}"
    textColor: "{colors.buff-50}"
  verdict-pass:
    backgroundColor: "{colors.green-100}"
    textColor: "{colors.green-700}"
    rounded: "{rounded.chip}"
    padding: "1px 7px"
  verdict-fail:
    backgroundColor: "{colors.flag-100}"
    textColor: "{colors.flag}"
    rounded: "{rounded.chip}"
    padding: "1px 7px"
  sheet-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink-900}"
    padding: "10px"
  sheet-row-hover:
    backgroundColor: "{colors.buff-200}"
  sheet-row-open:
    backgroundColor: "{colors.green-100}"
  top-bar:
    backgroundColor: "{colors.walnut-800}"
    textColor: "{colors.buff-100}"
    padding: "14px clamp(16px, 2.2vw, 32px)"
  bar-track:
    backgroundColor: "{colors.buff-200}"
    rounded: "{rounded.hairline}"
    height: "12px"
---

# Design System: Snapsettle

## Overview

**Creative North Star: "The Tournament Hall"**

Snapsettle is drawn from the materials of an over-the-board chess tournament: a walnut clock housing, the buff-and-green vinyl of a roll-up board, piece-black ink on paper, and the small red flag that falls when time runs out. The page reads like a hall table: a chess clock at large scale, then a scoresheet with ruled rows where every order is a numbered move.

Density is high and quiet. Information sits on hairline-ruled rows on a single buff ground, never in cards or tiles. Walnut appears only where an object would be wooden: the top bar and the clock housing. Green carries data and selection, the way board squares carry pieces. Red appears only for a window or policy limit that runs out. Every time is set in tabular figures, so columns of numbers align like a scoresheet.

Motion is mechanical and rare: a clock button presses and a hand sweeps to its stop, both on one long ease-out, and both stand still under reduced motion.

**Key Characteristics:**
- One buff ground; walnut only for the bar and the clock body.
- Hairline ruled rows, heavy ink rules under section heads, no cards.
- Condensed grotesk caps for headings and readouts; Barlow body with tabular figures everywhere.
- Green is data and selection; one red flag marks the limit.
- The chess clock is the signature object and is drawn, not illustrated.

## Colors

A tournament-hall palette: wood, board vinyl, ink and one flag, with no gradients and no brand-blue.

### Primary
- **Board Green** (green-500): selected tab, selection highlight, completed loop nodes. The colour of the dark square.
- **Deep Board Green** (green-700): links, the Snapsettle clock hand and p95 marker, pass verdict text, node strokes.
- **Played Green** (green-600): p50 bars, completed loop edges, "repaid" state dot, focus ring.
- **Pale Board Green** (green-100): the swept seconds sector on the clock, p95 bar fill, the open scoresheet move, pass verdict ground.

### Secondary
- **Walnut** (walnut-800): top bar and clock housing; the shell colour.
- **Dark Walnut** (walnut-900): bar bottom rule, clock bezel, seam, rocker and buttons.
- **Walnut Grain** (walnut-700): housing top rail, button caps, "refunded" state dot, unlit status light.
- **Pale Walnut** (walnut-200): secondary text on walnut (tagline, clock labels, unselected env switch).

### Tertiary
- **Flag Red** (flag): the clock flags, the policy line on bar charts, fail verdict text, the "down" status light. Only for a limit.
- **Pale Flag** (flag-100): the Across challenge-window sector, fail verdict ground, error notice.
- **Clock Amber** (amber): "waiting" state dot only.

### Neutral
- **Buff** (buff-100): page ground.
- **Light Buff** (buff-50): clock faces, alternating move bands, expanded move detail, text on green.
- **Deep Buff** (buff-200): bar tracks, row and tab hover, LOCAL notice ground.
- **Piece Black** (ink-900): body text, headings, clock hands, the heavy rule under section heads.
- **Ink** (ink-700): mono hashes, clock numerals and ticks, loop labels.
- **Faded Ink** (ink-500): captions, notes, table headers, sub-lines.
- **Rule** (rule) and **Strong Rule** (rule-strong): row hairlines and header/control borders.

### Named Rules
**The One Flag Rule.** Red marks only a limit that runs out: the challenge window, a policy delay, a failed check, a chain that is down. It is never decoration or emphasis.

**The Wood Is Furniture Rule.** Walnut is the colour of objects (the top bar, the clock body). Content surfaces stay buff.

## Typography

**Display Font:** Barlow Condensed 600/700 (with Arial Narrow, sans-serif), self-hosted
**Body Font:** Barlow 400/500/600 (with system-ui, sans-serif), self-hosted
**Label/Mono Font:** ui-monospace, SF Mono, Menlo, for hashes and run ids only

**Character:** Scoresheet type. A condensed grotesk in caps for headings and clock readouts, against a plain grotesk body set with tabular figures so every time lines up.

### Hierarchy
- **Display** (700, clamp(30px, 3.3vw, 46px), 1.02, uppercase, max 20ch): the single page question above the clock.
- **Headline** (700, 24px, uppercase, 0.03em): section heads (Leg splits, Scoresheet, Refusals), each sitting on a 2px ink rule.
- **Title** (700, 17px condensed): move numbers, zero-padded to three digits; 15px condensed for footer heads.
- **Clock readout** (700, 50px condensed; 64px under 560px): the two clock times, lettered on the housing.
- **Body** (400, 16px, 1.5): prose, max 62ch for the lede and 78ch for captions. Tables use 15px.
- **Note** (400, 13–14px, Faded Ink): captions, sources, notes under tables.
- **Label** (600, 12px, 0.06em, uppercase, Faded Ink): table column heads and the mobile cell labels (11px).
- **Mono** (13px, Ink): transaction hashes, addresses, run ids.

### Named Rules
**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` is set on the body and inherited everywhere; numeric columns are right-aligned.

**The Caps Belong To The Condensed Face Rule.** Headings are condensed caps. Uppercase in the body face is reserved for table column labels, segmented controls and clock-face lettering, always letter-spaced (0.06em to 0.12em).

## Layout

A two-column board on one buff ground, max 1440px, centred, with padding and gutters on a fluid gap (clamp(16px, 2.2vw, 32px)). The first row splits the clock duel and the leg splits at 1.65fr to minmax(320px, 1fr); the scoresheet and checks span the full width beneath. The top bar is a three-column grid (brand, env switch, chain lights).

Rhythm: table cells 10px, block gaps 12–14px, column gaps 24px, sections separated by an 8px top margin plus the gap. Checks and footer use auto-fit grids (minmax 300px and 260px).

Responsive: at 1080px the board collapses to one column and chain lights wrap under the bar. At 560px the tagline and long labels drop, the clock's SVG lettering scales up so it stays legible inside the shrunken drawing (with short readout names), the splits table hides its scale bars, and each scoresheet row reflows into a four-column, two-line move with small caps labels taken from the column names.

## Elevation & Depth

Flat by default. The page, tables and controls carry no shadows; hierarchy comes from rules: hairlines between rows, a 2px ink rule under each section head, and a 3px dark walnut rule under the top bar. The one object with depth is the chess clock, which casts a soft drop shadow beneath its housing as a physical object on a table.

### Shadow Vocabulary
- **Clock on the table** (`filter: drop-shadow(0 22px 22px rgba(46, 30, 20, 0.28))`): the clock SVG only.
- **Status light inset** (`box-shadow: inset 0 0 0 1px rgba(0,0,0,0.25)`): the bezel on chain lights and the open-state dot.

### Named Rules
**The Only Object Casts A Shadow Rule.** Only the drawn clock has a shadow. Data surfaces are flat and ruled.

## Shapes

Mostly square. Controls use a modest 6px corner, verdict chips 3px, bar tracks 2px, and status lights and state dots are full circles (8–9px). The clock is the one rounded silhouette (26px housing corners, round faces, round-capped hands and rocker). Rows and sections are defined by rules, not by boxes.

## Components

### Segmented controls (env switch and tier tabs)
- **Shape:** joined segments in one 1px-bordered capsule (6px), clipped, with 1px dividers between segments.
- **On walnut (env switch):** 600 13px uppercase, 0.06em, Pale Walnut text on transparent; selected segment becomes Buff with Dark Walnut text; hover brightens text to Light Buff.
- **On buff (tier tabs):** 600 13px, Ink text, Strong Rule border; selected is Board Green with Light Buff text; hover is Deep Buff.
- **State:** `aria-pressed` / `aria-selected` drive the selected look.

### Verdict chip
- **Style:** 700 12px condensed caps, 0.08em, 3px corners, 1px 7px padding. Pass is Deep Board Green on Pale Board Green; fail is Flag Red on Pale Flag.

### Status lights and state dots
- Chain lights (9px) on walnut: ok, stale, down (Flag Red), unlit Walnut Grain.
- Scoresheet state dots (8px) before the label: repaid Played Green, waiting Clock Amber, refunded Walnut Grain, open is a hollow Deep Buff dot with an ink inset ring.

### Notice strip
- Full-width band under the bar, 10px vertical padding, 14px text. LOCAL mode uses Deep Buff with Ink text; errors use Pale Flag with a dark red text and border.

### Leg splits table
- Leg name (500) with a 13px Faded Ink sub-line; p50 and p95 right-aligned, 600.
- Scale bar: 12px Deep Buff track; Pale Board Green p95 fill; Played Green p50 inset 2px; a 2px Flag Red policy tick that overhangs the track by 3px. All bars share one log scale.

### Scoresheet
- Ruled table, 15px, 10px cells, hairline column dividers, Strong Rule under the header, and a 2px ink rule under the section head.
- Every fourth move is banded in Light Buff; hover is Deep Buff; the open move is Pale Board Green and its detail row (Light Buff) shows the loop diagram and four transaction links. While a move is open the other moves recede to Ink 500 text (200ms ease-out), which keeps them above AA contrast instead of fading them with opacity.
- Time over policy prints as a small "+N" line under the cell.

### Loop diagram
- Three nodes (Base, Unichain, Lasna) and three edges. Pending nodes are Light Buff with an Ink stroke; done nodes are Board Green with a Deep Board Green stroke; pending edges are Strong Rule, done edges Played Green, 3px round caps. One geometry is reused in the splits panel and in each move's detail.

### Chess clock (signature)
- An SVG object: walnut housing with a lighter top rail, central seam, a dark rocker tilted toward the running side, two buttons (the pressed one lower).
- Faces: Light Buff with a dark walnut bezel, 60 ticks (major every 5), condensed numerals, a small uppercase scale label, a red flag at 12, round-capped Piece Black hands with a hub. The Across face fills its window in Pale Flag; the Snapsettle face sweeps in Pale Board Green, its hand in Deep Board Green with a p95 marker.
- Readouts are lettered on the housing: spaced uppercase name, large condensed time, a sub-line or cited source link.
- Motion: the button press (420ms) and hand sweep (900ms) on `cubic-bezier(0.16, 1, 0.3, 1)`, only when motion is allowed.

## Do's and Don'ts

### Do:
- **Do** keep content on the buff ground with hairline rules (rule, rule-strong) and a 2px Piece Black rule under each section head.
- **Do** set every time and amount in tabular figures, right-aligned, with its source (tx hash, run id or cited doc) in reach.
- **Do** use green tones for data, progress and selection, and reserve Flag Red for a limit that runs out.
- **Do** keep walnut for the top bar and the clock body.
- **Do** put clock-related motion behind `prefers-reduced-motion: no-preference` with the 0.16, 1, 0.3, 1 ease-out.
- **Do** use the 2px Played Green focus outline (2px offset) on every interactive element.

### Don't:
- **Don't** wrap data in cards, tiles or shadowed panels; the clock is the only object with depth.
- **Don't** use Flag Red for emphasis, links or brand accents.
- **Don't** set headings in the body face or numbers in proportional figures.
- **Don't** imitate Reactive Network's or Across's branding.
