# Franchise Hub — First-Principles UX/UI Redesign (DESIGN exploration)

> Status: PROTOTYPE / exploration for JK review. Branch `codex/auction-draft-ux-rehaul`.
> Companion to `AUCTION_DRAFT_UX_REDESIGN.md` — same "Premium Retro" system, same principles,
> extended to the season hub. Prototype: `spec-docs/prototypes/franchise-hub/index.html`
> (one file, soft⇄edgy toggle, Help toggle, touch affordances). Does NOT touch the GameTracker.
>
> JK round-2 asks (2026-06-25): apply the auction approach to the hub; give **two looks** (soft +
> edgy); push **simplicity/intuitiveness**; lean into **iPad touch**; **don't explain on-screen
> unless un-intuitable**; add a **top-corner Help toggle** that reveals the minimized text on demand.

---

## 1. The shared interaction system (new this round — applies to auction + hub)

Three cross-cutting rules, baked into every surface:

1. **Minimized text by default.** Numbers, names, gaps, bars, badges — the things you *read at a
   glance* — stay. Explanatory prose (what a cap means, what "narrow band = confident" means, what a
   sim does) is **hidden by default**. The UI should be intuitable without it.
2. **A top-corner Help toggle.** One small control, always in the same place. **OFF** = the clean
   surface. **ON** = the teaching layer appears inline (a coach line per screen, gesture hints, the
   "why" behind a limit). A new GM leaves it on to learn the rules, then flips it off and lives on a
   calm, dense-where-it-counts surface. (The prototype remembers nothing; production persists the
   choice.)
3. **Touch-first affordances.** The auction and hub are a passed-around iPad; the gestures should feel
   native, not like buttons bolted onto a desktop app:
   - **Swipe** the lot to bid / let go (auction); swipe to advance a day / peek the schedule (cockpit).
   - **Drag** the ⠿ handles to reorder the batting order and rotation (Team Hub).
   - **Press-and-hold** to reveal your private scout read (auction farm).
   - **Tap-to-expand** a standings row, a leaderboard category, a news story.
   - Gesture hints are themselves part of the Help layer — shown while learning, gone once known.

## 2. The two looks (one toggle, same content)

Both share the KBL green/gold/cream identity, the three type voices (pixel for character, system sans
for data, tabular mono for numbers), and the exact same layout — only the *surface treatment* differs:

- **Soft (refined):** 16px radii, soft ambient depth, hairline borders. Calm, premium, Apple-clean.
- **Edgy (premium retro):** ~3px corners, hard offset shadows, bolder 2px gold/green borders, a touch
  more pixel-font on headers. Draft-setup energy, sharpened — without the old clutter.

The toggle exists so JK can pick the house direction by *seeing* it on real surfaces, not describing it.

## 3. First principles, per surface

The hub is a **season cockpit**, not a database browser. Each tab answers one question, and the design
makes that question's answer the hero.

- **Today's Game — "what do I do next?"** The hero is the next matchup + a single primary action
  (**Play Ball**); sim options are secondary; a slim rail glances season progress and the rest of the
  league. The default landing tab, the most-tapped surface → the biggest touch payoff (swipe to advance).
- **Team Hub (Roster/Lineup) — "set my team."** The hero is the *editable* thing: a drag-to-reorder
  batting order + rotation. The dense roster table and the payroll-vs-cap bar sit beside it as the data
  that informs the edits. Finances stop being a wall of numbers and become one glanceable bar.
- **Standings — "where do I stand?"** A clean, dense table that lets the numbers breathe: tabular
  figures, your team gold-lit, run differential as a tiny green/red bar. League toggle; tap a row to
  expand. The reference treatment for every stat table in the app.
- **Leaders — "who's best?"** Compact top-N cards (batting / pitching), your players gold-lit, a bar
  encoding the gap, tap-to-expand for the full list. A distinct data-viz pattern from standings.
- **The Tootwhistle Times — "the story of my league."** An editorial layout: a lead story (character
  type), then a feed of category-badged cards with bylines. Reads like a paper, not a log. Filter chips;
  tap to read.

## 4. What stays true to the app (anti-drift)

This is a presentation exploration. It maps onto the existing hub structure (the season-phase toggle,
the same tab set, the same data: records, W/L/GB/run-diff, WAR/salary, lineup/rotation, news cards) and
the live `--franchise-*` identity. No data model, no engine, no GameTracker is touched. If JK greenlights
a look, the build is the same play as the auction: a token layer + presentational components fed by the
hub's existing data, surface-only.

## 5. Open questions for JK (after he sees the two looks)

1. **Which look** is the house direction — soft, edgy, or soft-with-edgy-accents?
2. **Help default** — on for new GMs (learn then dismiss) or off (clean first impression)?
3. Any tab where the touch model should go further (e.g., drag players *between* lineup and bench,
   swipe to sub, pinch a stat card to expand to a full breakdown)?
4. Scope of a real build — the whole hub, or start with the cockpit + Team Hub (the two interactive
   heavyweights) and roll the rest behind it.
