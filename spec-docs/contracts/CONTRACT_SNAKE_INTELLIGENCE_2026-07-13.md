# CONTRACT — SNAKE INTELLIGENCE: MY BOARD, ASST GM BOARD, AND FAIR TRADES

**Date:** 2026-07-13  
**Base checkpoint:** `99d130805bd36227b4e8ff68aa53970c4ee0458b`  
**Branch:** `codex/snake-mock-draft-ready`  
**Authority:** JK approval of FINDING-152's ten-recommendation plan  
**Builder/auditor law:** separate agents; JK browser walk is the sole acceptance gate

## Product contract

1. **My Board is the GM's persisted plan.** An overall or position reorder immediately refits all
   22 unique slots from the new rankings on main and approved companion devices. Multi-position
   feasibility remains deterministic and scarce-role-safe. Report the number of changed slots and
   provide one-step Undo; never require a second Apply action.
2. **Asst GM Board is a separate derived view.** It recomputes from the current picked roster and
   available MLB pool using existing canonical fit, need, money/tax, chemistry, scarcity,
   replacement, and legal-finish engines. It never mutates My Board unless the GM explicitly copies
   a player/plan, never records a pick, and never persists rival/private information.
3. **Selected-player decisions are fully priced.** A click identifies the exact My Board player
   displaced and the before/after salary, tax, all-in, money-left, five-family chemistry, fit, and
   legal-finish consequences. Replace the detached two-dropdown What-If workflow with this direct
   compare/keep/revert path.
4. **Advice is actionable.** The private desk may render TAKE NOW, SAFE TO WAIT, TRADE TO #N, or
   PASS only when the engine can support the call. Neutral state creates no alert. A selected player
   may be pinned for an "optimize around" assistant read.
5. **Availability and rival pressure are public-model estimates.** Use only locked public
   archetypes, public picked rosters, public pick ownership/order, available players, frozen IV,
   tax rules, and canonical roster needs. Never use rival private rankings/boards. Counts must count
   genuine interested clubs, not the single predicted drafter. Probability/ranges require a
   deterministic, tested scenario ensemble and honest unavailable/pending states.
6. **Position cliffs are compact.** A position view may show viable options left, clubs still
   needing the role, and value/replacement drop. No explanatory prose outside Help.
7. **Trade-up packages must be strategically fair.** Equal pick counts remain required and
   balancing return picks remain supported. A buyer moving up may not underpay the seller at posted
   value. Search all authorized package sizes before choosing; minimize value gap before package
   complexity. Posted pick values must be monotone and derived from the current frozen pool's
   expected player surplus rather than raw nth-player IV alone. Recommendation and execution both
   revalidate current ownership, revision, equal turns, posted value, and legal finishes.
8. **Team-first privacy and parity remain binding.** Main and companion calculate only the selected
   or claimed club's private state. Switching/covering removes prior private DOM before paint.
   Off-clock work remains allowed; only the live pick owner may draft.
9. **Screen value law.** Keep player pool, profile, board/rankings, selected-player consequences,
   real-time plan/roster truth, legal finish, privacy, correction, and commissioner execution.
   Remove or fold detached What-If dropdowns, misleading 0/1 buyer copy, worthless one-for-one
   trade-up results, and neutral/no-action assistant noise. Do not add a new dashboard or opaque
   assistant score.
10. **Presentation law.** Existing KBL palette and team primary/secondary identity remain. Pronouns
    remain stored but are not displayed. No inline tutorial/explainer copy; Help is the only
    explanation surface.

## Frozen boundaries

- MLB snake only. Do not change auction draft behavior, auction math, farm draft truth/fog, farm
  salaries, manifests, roster handoff, staffing, schedule, Living Season, GameTracker, or franchise
  launch.
- Reuse canonical engines; do not fork tax, chemistry, roster legality, player identity, or
  archetype math in UI components.
- No LLM-generated numbers/verdicts. Template copy only unless an existing facts-validated dressing
  seam is reused without becoming a dependency.
- No second storage model. My Board continues through seat-local optimistic locking; Asst GM Board
  is derived unless a later audited need proves otherwise.

## Controlled batches

### Batch 1 — My Board correctness

Allowed product files: `desk/deskModel.ts`, `pages/SnakeDraftRoom.tsx`,
`pages/SnakeCompanion.tsx`, and `components/snake/SnakeDraftRoomView.tsx` only for the room's
existing write-notice action surface. Allowed tests: their existing desk/room/companion tests only. Reorder
must call the existing deterministic refit, persist only the active seat, recalculate plan truth,
and expose one-step Undo. Tests that assert stale slots must be replaced with mutation-honest refit
assertions.

### Batch 2 — Fair posted trade packages

Allowed product files: `src/engines/snakeGuideTrade.ts`, the smallest canonical pick-value module
surface required, snake trade adapter/components, and their owned tests. Map and verify every caller
before changing a shared signature. No auction transaction or CPU auction behavior changes.

### Batch 3 — Separate Asst GM Board and direct consequences

Allowed product files: snake desk models/components, `pages/SnakeDraftRoom.tsx`,
`pages/SnakeCompanion.tsx`, and the smallest reusable engine adapters/tests required. Derived board
must be legal, solvent, available-only, and distinct from persisted My Board. Preserve current
loading/fail-closed behavior.

### Batch 4 — Availability, pressure, cliffs, and action calls

Allowed product files: `snakeRationalRoom.ts`, its worker/hook/adapter, snake desk/trade surfaces,
and owned tests. Scenario outputs must be deterministic for identical inputs and must degrade to
honest pending/unavailable copy rather than SAFE.

### Batch 5 — UI consolidation and final wiring

Allowed product files: snake MLB room/desk/trade components and owned tests. Remove superseded
pathways only after their replacement is proven. Preserve iPad usability, keyboard/touch controls,
team colors/logos, privacy cover, and Help-only explanation.

## Verification after every batch

1. Owned engine/model tests, including adversarial/mutation probes for the changed rule.
2. Main room and companion integration tests when either surface is touched.
3. `npm run build` must exit 0.
4. Run the full suite after each correctness/engine batch when practical; no unexplained new red.
5. Trace every changed engine signature through all callers.
6. Separate auditor reads contract, diff, tests, and tries to falsify privacy, persistence,
   affordability, multi-position feasibility, current-revision trades, and advice honesty.
7. Final: full build + full suite + automated iPad/desktop crawl. JK performs the only acceptance
   walk.

## Stop conditions

- A required change crosses a frozen boundary.
- A displayed probability lacks a defined/calibratable scenario basis.
- A trade can pass while the seller loses posted value or either team loses a legal finish.
- Asst GM output can overwrite My Board without an explicit GM action.
- Any covered seat leaks private DOM or any companion writes another team's state.
- A new test passes without failing against the pre-fix behavior it claims to protect.

## Required reports

Every builder reports all changed files, exact behavior, exact test/build output, and blockers. The
auditor returns VERIFIED / NOT VERIFIED / BLOCKED with major/minor findings and adversarial evidence.
