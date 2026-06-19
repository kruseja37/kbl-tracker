# UI CLEANUP & BUILD PLAN

**Status:** READY — execute when JK greenlights. **Created:** 2026-06-18.
**Source:** UI-remaining survey (workflow `wf_1b45bbc1-3bb`, 5 grounded readers + synthesis) + Opus Captain
verification of every load-bearing anchor against live code (2026-06-18). Supersedes the *archived* prior audit
`src/src_figma/archived-docs/UI_AUDIT_AND_GAP_ANALYSIS.md` (some of its GT-NN findings are stale — see note).

> **Headline:** the app's happy-path UI is largely BUILT (GameTracker, regular-season franchise, playoffs, League
> Builder, most Almanac render real data today). What's "left" is two big BUILD buckets — (1) the post-D13 soul-layer
> activation UI [~12 surfaces, the dominant chunk] and (2) the gated franchise offseason — plus a modest CLEANUP pass
> dominated by design-token drift, NOT dead buttons. **The single highest-leverage move: do the design-token cleanup
> BEFORE building the ~12 activation surfaces, never after** (else each new surface inherits the drift).

---

## PART A — THE UI-CLEANUP PASS (what JK wants; ready to execute)

Three tickets. UI-CLEAN-1 + UI-CLEAN-3 are independent quick wins (anytime). UI-CLEAN-2 is the big one and is a
PREREQUISITE for the Part-B activation build (see Part C for the precise timing).

### UI-CLEAN-1 — Quick correctness + dummy-data fixes (½–1 day) · independent · anytime
Verified live anchors:
- **`AwardsCeremonyFlow.tsx:732`** — `traits: ["Placeholder Trait 1", "Placeholder Trait 2"]` → real award-winner
  trait data. *(VERIFIED in live code.)*
- **`GameTracker.tsx:6194`** — `const batterGrade = "A"; // TODO: Get from player database when available` → real grade.
  **UNBLOCKED by W1** — the canonical pure `scoreSmb4Player` (used by W1 to populate `pitcherGradeByPlayer`) now gives a
  real grade from the player's ratings; reuse it here. *(VERIFIED.)*
- Mock-fallback patterns in the offseason flows (AwardsCeremony / Draft / Retirement / FreeAgency) → real adapters —
  NOTE these are intertwined with the gated offseason (Part B-b2); scrub the placeholders, but full real data waits on
  the gate-flip.
- ~~GT-04 `OutcomeButtons.tsx:306` `|| true`~~ — **DROPPED: STALE.** Only present in the *archived* audit doc; the
  `|| true` is NOT in live code (grep clean). Likely already fixed. Do not action without re-confirming.

### UI-CLEAN-2 — Design tokens + shared Button component (~1 week) · THE big cleanup · PREREQUISITE for Part B
The dominant cleanup item, and the one with downstream leverage. Verified scope:
- **101 files** in `src/src_figma/app/{components,pages}` carry hardcoded 6-digit hex literals → migrate to CSS theme
  variables (use the official **KBL 8-color palette**, see the `color_palette` design memory). *(VERIFIED count.)*
- **No shared Button component exists** (4+ divergent button-styling patterns across the app) → build one canonical
  `Button` (variants + sizes) and replace ad-hoc buttons. *(VERIFIED — no `Button` component file.)*
- **Radius tokens** — the SNES theme declares `--radius: 0px` but `rounded-lg`/`rounded-md` appear throughout →
  reconcile to a radius token.
- **Typography scale** — arbitrary `text-[7px]`–`text-[12px]` off the Tailwind scale → a defined type scale.
- **Why it gates Part B:** the ~12 post-D13 activation surfaces are NOT built yet. If tokens land first, all 12 are
  built clean; if not, the 50-hex / radius / type drift multiplies across every new surface and the cleanup has to be
  redone 12×.

### UI-CLEAN-3 — Dead-route / preview-harness cleanup (S) · independent · anytime
- **8 `/__preview/*` dev-harness routes** in `src/App.tsx:316–343` (fame-pip, player-instance-card, fame-leaderboard,
  matchup-drama-bar, commentary-feed ×2, between-inning-summary, franchise-v1-visual-smoke) → archive or gate behind a
  dev-only flag so they don't ship. *(VERIFIED.)*
- Dead imports / dead `GameDiamond` center column (the GameTracker spec removes it) — sweep with the 4-column refactor
  (Part B-b3) or standalone.

---

## PART B — THE UI-BUILD BACKLOG (context for sequencing; NOT the cleanup pass)

The bigger picture, so the cleanup is timed right. None of this is the "clean up" JK asked for — it's net-new build.

- **(b1) Post-D13 soul-layer activation UI — XL (~12 surfaces), THE dominant chunk.** 14 subsystems are built-dark
  (engines/stores done, flag-gated OFF, **zero UI**): the **trait-confirm console** (the L9b engine just finished —
  `buildTraitConfirmationRequest` exists with no live caller), **L12** races/All-Star/awards, **L10** random events,
  **L6** fame, **L7** designations, **L13** relationships, **L14** rebrand, **L2/L8** confirm consoles + change-log,
  **L3/L4/L5** morale-ledger / reporter feed / fan-teeth. GATED behind D13 + the L-SIM validation gate. The backend is
  the easy part; these surfaces are the real backlog.
- **(b2) Franchise offseason execution — XL, but front-loaded with built shells.** `FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED
  = false` (`FranchiseHome.tsx:182`, VERIFIED) — 10 phase tabs exist as read-only shells (Awards 93K, Draft 104K
  dry-run, Free Agency, Retirements, Ratings, Spring Training, Contraction/Expansion, Farm "coming soon", Chemistry
  "coming soon", Finalize). Mostly execution wiring behind the gate + 2 truly-stubbed phases. Also gated: **All-Star tab**
  (`MODE_2_V1_ALL_STAR_UI_ENABLED = false`) + **playoff SIM overlay** (`MODE_2_V1_SYNTHETIC_SIM_ENABLED = false`).
  **Roster & Trades tab IS live** (`MODE_2_V1_TRANSACTION_UI_ENABLED = true`, dry-run).
- **(b3) GameTracker 4-column always-visible layout refactor — XL, independent of D13.** The one big GameTracker gap
  (today a 3-column grid hides lineups behind a modal; the score-bug lacks expand/collapse; dead diamond center column).
- **(b4) Smaller:** Settings page **missing entirely** (no `/settings` route, M); Almanac stub-page polish (S–M).

---

## PART C — WHEN TO RUN THE CLEANUP PASS (the timing)

**The hard rule:** UI-CLEAN-2 (design tokens) **must precede the Part-B-b1 activation build — never after.** Everything
else is flexible.

**Where we are now:** the L-stack dark backend is mid-flight — L9b (traits) done, L10 done; **L11 (managers), L12, L13,
L14, then the L-SIM gate, then D13 activation remain.** The activation-UI build (b1) has not started.

**The precise schedule:**
1. **UI-CLEAN-1 (quick fixes) + UI-CLEAN-3 (dead routes): ANYTIME.** Independent, cheap, improve the live app today.
   Good palate-cleanser between heavy backend tickets, or one focused session whenever. The `batterGrade` fix is a free
   win now that W1 made the grade available.
2. **UI-CLEAN-2 (design tokens — the big pass): at the L-stack → D13 BRIDGE.** The optimal moment = once **L11–L14 +
   L-SIM are done and immediately BEFORE building the ~12 activation surfaces.** Then: the dark backend is complete (no
   UI churn against active backend work), and the activation build consumes the fresh tokens so all 12 surfaces are
   built clean. *(Doing it earlier — now — is not wrong and would clean the live app sooner, but the prerequisite payoff
   is deferred and you'd context-switch off the backend. Doing it LATER, after activation surfaces exist, is the worst
   case — a 12-surface retrofit.)*
3. **GameTracker 4-column refactor (b3): independent of D13; best AFTER UI-CLEAN-2** (so it's built on the tokens). Slot
   whenever GameTracker UX is the focus.

**One-line recommendation:** do the cheap fixes whenever you want a break; **reserve the main design-token cleanup for
the L-stack→D13 bridge (right before the activation-UI build)** — unless the live-UI drift is actively bothering you, in
which case pulling UI-CLEAN-2 forward to now is a defensible call (it just front-loads the prerequisite).

---

## APPENDIX — verification log (2026-06-18, Opus Captain, against live code)

| Claim | Status | Anchor |
|---|---|---|
| Placeholder trait dummy data | ✅ VERIFIED | `AwardsCeremonyFlow.tsx:732` |
| Hardcoded `batterGrade="A"` | ✅ VERIFIED | `GameTracker.tsx:6194` (TODO) |
| Hardcoded-hex drift cluster | ✅ VERIFIED | **101 files** in `app/{components,pages}` |
| No shared Button component | ✅ VERIFIED | (no `Button` component file) |
| 8 `/__preview/*` dev routes | ✅ VERIFIED | `App.tsx:316–343` |
| Offseason execution gated OFF | ✅ VERIFIED | `FranchiseHome.tsx:182` flags |
| GT-04 `|| true` bug | ❌ STALE | only in `archived-docs/UI_AUDIT_AND_GAP_ANALYSIS.md`; not in live code |
