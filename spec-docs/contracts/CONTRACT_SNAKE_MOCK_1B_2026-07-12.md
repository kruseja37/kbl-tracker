# CONTRACT — SNAKE MOCK 1B: FINAL RECAP AND DURABLE HANDOFF

**Date:** 2026-07-12
**Builder:** separate implementation agent
**Auditor:** captain/audit agent that does not write the product diff
**Branch/worktree:** `codex/snake-mock-draft-ready` at `/private/tmp/kbl-snake-mock`
**Base checkpoint:** `809a8212` (`feat(snake): select and confirm exact draft player`)

## Binding product rulings

- Non-final picks display the recorded-pick beat, then advance automatically. The user does not press a redundant next-pick button.
- The final MLB and farm picks stop after the recorded beat at `VIEW DRAFT RECAP`.
- A completed session always reopens on its recap after reload; React-only ritual state may never strand finalization.
- MLB recap confirmation commits the exact completed MLB session to League Builder rosters, then routes to Scout Hire.
- Farm recap confirmation commits the exact completed farm session, then routes to Staff Hire. Existing Staff Hire continues to Franchise Setup.
- No schedule is required at any point in this chain. Franchise initialization creates zero schedule rows; Living Season owns CSV upload and manual game entry.
- JK's browser walk remains the sole acceptance gate.

## Required behavior

1. In `SnakeDraftRoomView`, retain the recorded-pick ceremony long enough to read, then auto-advance non-final picks exactly once. Pause/unmount/live-pick correction must cancel the timer.
2. A final recorded pick never auto-advances. Its action reads `VIEW DRAFT RECAP` and invokes `onDraftComplete` once.
3. Add one shared public recap surface for MLB and farm using the ballpark green/brass/chalk palette and team branding. It shows every team, its drafted players in pick order, pick numbers, roster count, salary, tax, and all-in total when those values exist. Farm does not invent tax or reveal hidden ratings.
4. The recap contains no tutorial copy. Optional explanation belongs behind the existing Help law; no new Help button is required for the self-evident table.
5. MLB completion is page-owned and durable:
   - transition from the final live pick keeps the final recorded beat until `VIEW DRAFT RECAP`;
   - clicking it opens recap without writing rosters yet;
   - `CONFIRM MLB DRAFT` calls `commitCompletedSnakeSessionToLeagueRosters` with the saved session and registered pool;
   - only a successful commit navigates to `scoutHireRouteForLeague(league)`;
   - failure stays on recap with a visible retryable error.
6. Farm completion follows the same sequence with `commitCompletedSnakeFarmSessionToLeagueRosters` and `staffHireRouteForLeague(league)`.
7. On initial load, if the saved MLB or farm session is already complete, render the recap immediately. Do not require reconstructing `RECORDED`, pressing GO, or replaying the final pick.
8. Confirmation buttons disable while committing so repeated taps cannot produce concurrent commits or duplicate navigation.
9. Recap truth comes only from the persisted completed session plus its registered pool/player or prospect data. No mock recap objects and no roster writes before explicit confirmation.
10. Preserve correction snapshots, trades, companion state, frozen salaries, farm fog rules, auction behavior, Scout Hire, Staff Hire, and Franchise Setup.

## Tests first

Add failing tests before implementation proving at minimum:

- a non-final recorded pick auto-advances after the ceremony and has no manual `ADVANCE TO NEXT PICK` control;
- the final recorded pick does not auto-advance, shows `VIEW DRAFT RECAP`, and calls completion only when tapped;
- a completed MLB session mounted from storage opens recap immediately;
- MLB recap lists every persisted pick, salary/tax/all-in totals, does not commit before confirmation, commits once on confirmation, and routes only after success;
- MLB commit failure remains on recap and supports retry;
- a completed farm session mounted from storage opens a fog-safe recap, commits only on confirmation, and routes to Staff Hire;
- farm commit failure does not navigate;
- a reload after the final saved pick cannot return to an empty REVIEW room;
- existing incomplete MLB/farm room, correction, pause, selection, trade, privacy, and real-gavel tests stay green;
- schedule contract remains green: franchise initialization writes zero rows and the Living Season schedule tab exposes Add Game and CSV review.

Page completion tests must exercise the real page with persisted/mocked storage seams and real route navigation. A recap-only component test is insufficient.

## Allowed product files

- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
- new `src/src_figma/app/components/snake/SnakeDraftRecap.tsx`
- directly corresponding snake component/page tests

The existing pipeline commit functions and route helpers are consumers, not edit targets. If they cannot support this contract, stop and report before touching them.

## Hard boundaries

- No auction source changes.
- No League Builder, franchise initializer, schedule, Scout Hire, Staff Hire, or Franchise Setup product changes.
- No storage schema/version changes.
- No immutable manifest yet; that is a later approved slice.
- No chemistry, roster-money ledger, team-first selector, ranking-unification, secondary-position, or all-seat backfill work.
- No CPU seats or companion network infrastructure.
- No commit or push by the builder.

## Verification

Run and report:

1. New recap/completion tests.
2. `npx vitest run src/src_figma/app/components/snake/__tests__/SnakeDraftRoomView.test.tsx src/src_figma/__tests__/pages/SnakeDraftRoom.registration.integration.test.tsx src/src_figma/__tests__/pages/SnakeDraftRoom.farm.test.tsx` plus new completion suites.
3. `npx vitest run src/utils/tests/draftPipeline.integration.test.ts src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts src/src_figma/__tests__/franchiseMode/FranchiseLensHub.schedule.test.tsx`
4. `npm run build`
5. `git diff --check`, changed-file list, and exact report.

## Builder report format

- Files changed
- Red-before evidence
- Behavior implemented
- Verification commands/results
- Risks/deviations
- End with `SNAKE MOCK 1B COMPLETE` or `BLOCKED: <reason>`
