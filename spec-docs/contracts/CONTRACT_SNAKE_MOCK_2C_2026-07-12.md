# CONTRACT — SNAKE MOCK 2C: MONEY, TAX, CHEMISTRY, AND SELECTED-PLAYER TRUTH

**Date:** 2026-07-12  
**Base checkpoint:** `95e9a536`  
**Builder/auditor law:** separate agents; JK browser walk is the sole acceptance gate.

## Binding rulings

- Every team must see two distinct real-time states: the 22-player plan and the roster already drafted. Never merge planned and committed money.
- Both states show salary, tax, all-in cost, and money left. Board edits and recorded/corrected picks recalculate immediately from canonical engines.
- Both states show all five chemistry families. The selected player shows the exact roster chemistry change that drafting that player would cause.
- Team-archetype fit is a green/yellow/red decision signal beside current tax impact. Fit color is not allowed to fabricate future tax dollars.
- The selected-player area is a compact player card, not a notes box: positions, every non-zero rating, traits, player archetype, personality, chemistry, team fit, and exact current money/chemistry consequences. Pronouns remain engine data and are not displayed.
- Assistant-GM roster intelligence must reuse existing roster/chemistry engines. No new recommendation math and no beginner tutorial prose on the main screen.

## Required behavior

1. Add a pure drafted-roster ledger using persisted picks plus frozen pool IV fallback. Recompute total tax from the drafted construction roster with normalized pool caps and the session-locked team cap identity; do not treat a sum of optional legacy marginal-tax receipts as canonical total tax.
2. The drafted ledger exposes salary, tax, all-in, cap left, roster count, and exact unknown state when required player/price inputs are missing. Never display fabricated `$0` for unknown legacy money.
3. Keep the existing plan ledger sourced only from `evaluateSnakePlan`. Add explicit plan all-in and all five chemistry-family aggregates for exactly the 22 unique slot members.
4. Build chemistry aggregates with `chemistryProfileForPlayers` / the canonical chemistry-family table. Show canonical family word, count, and tier for Competitive, Spirited, Crafty, Scholarly, and Disciplined in a stable order.
5. Build drafted-roster chemistry from persisted picks and plan chemistry from board membership. Corrections, backfills, reorder/refit, and what-if KEEP must update the appropriate strip immediately.
6. For the selected available player, use `chemistryAdviceForCandidate` against the selected desk team's drafted roster. Show family count before/after, tier crossing when present, and chemistry premium/loss only from that engine; do not create a second chemistry valuation.
7. Map the existing `fitWord` result to `green`, `yellow`, `red`, or `unknown` without changing its thresholds. Render this beside exact current marginal tax and true cost. Label it team fit; never claim the color itself is a tax charge.
8. Replace the selected-player notes presentation with a compact inline card derived from `buildDraftProfileModel(..., { revealFull: true })`: team logo when available; primary/secondary positions; archetype; canonical seven-type personality; chemistry; traits; batting and pitching ratings, omitting only numeric zero categories; arsenal when present. Keep selection and draft controls outside/adjacent so the card remains readable on iPad.
9. Extend the public Club Lens roster with the drafted ledger and drafted-roster chemistry. Private board/selected consequences remain absent while covered.
10. Add a compact ASST GM status row sourced from existing canonical shape and chemistry reads (`rosterNeedBreakdown`, `assembleFiveLights`, or their existing adapters). Render statuses/chips on the main surface; explanatory sentences belong behind the room Help toggle.
11. Use the same session-locked cap identity for candidate marginal tax, drafted total tax, plan tax, and recorded pick receipt. Repair any current path that reads stale team identity instead.
12. Keep team colors and the established green/brass ballpark palette. Do not introduce blue as a primary action or status theme.

## Tests first

Prove at minimum:

- drafted salary/tax/all-in/cap-left equal canonical engine recomputation after add and correction;
- plan and drafted ledgers remain distinct and both recalculate from their own memberships;
- missing legacy money renders unknown rather than `$0`;
- both plan and drafted strips always include the five canonical chemistry families in stable order;
- a selected player shows exact family count before/after and a real 2→3 or 6→7 crossing from the shared chemistry engine;
- selected card includes primary/secondary, all non-zero ratings, arsenal, traits, archetype, personality, and chemistry without visible pronouns;
- fit words map to green/yellow/red/unknown without threshold drift, beside exact marginal tax;
- public Club Lens money/chemistry changes after a recorded pick and correction;
- covered private selected-player, plan money, plan chemistry, fit, and advisor strings are absent from the DOM;
- on-clock and off-clock desks use their own locked identity and roster, never the live pick owner's private values;
- existing Slices 1A/1B/2A/2B, companion, trade, farm, performance, and auction gates remain green.

## Allowed product files

- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
- `src/src_figma/app/components/snake/desk/BoardView.tsx`
- `src/src_figma/app/components/snake/desk/DeskCandidateCard.tsx`
- `src/src_figma/app/components/snake/desk/PrivateDesk.tsx`
- `src/src_figma/app/components/snake/desk/deskModel.ts`
- new narrowly named snake desk ledger/chemistry/selected-card components or pure models
- `src/src_figma/app/components/shared/PlayerProfilePopover.tsx` only if extracting/reusing its existing profile body avoids duplicate UI logic
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- `src/src_figma/app/pages/SnakeCompanion.tsx` only for prop compatibility if a shared desk signature changes
- directly corresponding snake tests

Existing engines and chemistry utilities are read-only consumers in this slice. If an engine edit, storage schema, auction edit, farm redesign, or new calculation seems necessary, stop and report.

## Hard boundaries

- No farm board redesign.
- No immutable draft manifest or franchise initialization changes.
- No new market prediction, optimizer, tax formula, fit threshold, chemistry threshold, or recommendation engine.
- No explanatory copy on the main screen; Help owns explanation.
- No commit or push by builder.

## Verification

1. Pure ledger/chemistry/fit model tests.
2. Selected-card and BoardView tests.
3. Real page add/correction/team-switch/privacy tests.
4. Existing Slice 1A/1B/2A/2B, companion, trade, farm, performance, auction, and production build gates.
5. `git diff --check`, pronoun/theme grep, and exact changed-file report.

End with `SNAKE MOCK 2C COMPLETE` or `BLOCKED: <reason>`.
