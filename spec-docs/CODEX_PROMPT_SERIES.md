# Codex Prompt Series — Bug Fixes

> **STATUS: ALL 8 PROMPTS COMPLETE — 2026-04-05**
> Final result: 5355 pass / 0 fail / 192 files. Build clean.
>
> Run these prompts sequentially. Each one is self-contained.
> After each prompt completes, verify its test suite passes before moving to the next.

---

## Prompt 1: Pre-Game Substitution UI Bug (Bugs #2 and #3)

```
BUG: When a user swaps a position player or pitcher BEFORE the game starts (during PRE_GAME phase), the outgoing player disappears from the bench and cannot be used later in the game. Pre-game lineup edits should NOT permanently burn players — only in-game (LIVE phase) substitutions should.

INVESTIGATION PROCESS:
1. Read how `gamePhase` works — find its type and where it transitions from "PRE_GAME" to "LIVE" in `src/src_figma/hooks/useGameState.ts`.
2. Read the `makeSubstitution` function in useGameState.ts. Note how it already branches on `gamePhase === "PRE_GAME"` and correctly avoids adding to `usedPlayers` for pre-game subs. The engine layer is correct.
3. Now search GameTracker.tsx for every handler that processes substitutions — specifically `handleLineupCardSubstitution` and `handleSubstitution` and `handlePitcherSubstitution`. Look for where they set `isOutOfGame: true` on the outgoing player.
4. Check whether ANY of those locations guard that `isOutOfGame: true` assignment behind a `gamePhase` check. That's the bug — the UI layer unconditionally marks players as out-of-game even during PRE_GAME.
5. Fix: Add gamePhase guards so `isOutOfGame` is only set to `true` when the game is in LIVE phase. During PRE_GAME, the outgoing player should remain on the bench with `isOutOfGame: false`.

VERIFICATION:
- `npx vitest run src/src_figma/__tests__/gameTracker/r3-round5.test.tsx` — all existing tests must still pass
- `npm run build` must exit 0
- Search GameTracker.tsx for every remaining `isOutOfGame: true` assignment and confirm each one either (a) is in a LIVE-only code path, or (b) has a gamePhase guard.
```

---

## Prompt 2: Walk-Off Detection Gap in advanceRunner (Bug #8)

```
BUG: When a single runner scores the winning run via wild pitch, passed ball, stolen base, or other individual runner advancement in the bottom of the final inning, the game does not automatically trigger the walk-off end-game flow. The user has to manually end the inning.

INVESTIGATION PROCESS:
1. Read `evaluateEndGameTriggerWithTotalInnings` in `src/src_figma/hooks/useGameState.ts` to understand how walk-off detection works. Note it needs `context: "live_play"` and compares scores before/after.
2. Search useGameState.ts for every call site of `evaluateEndGameTrigger`. List every function that calls it. You'll find: recordHit, recordOut, recordWalk, recordD3K, recordError, advanceRunnersBatch — but NOT advanceRunner.
3. Read the `advanceRunner` function (the single-runner version, NOT `advanceRunnersBatch`). Confirm it updates gameState scores when a runner reaches home, but never evaluates end-game conditions afterward.
4. Read how `advanceRunnersBatch` handles this — it calls `evaluateEndGameTrigger` after score updates and calls `queueAutoEndGame` if walk-off detected. Use this as the pattern.
5. Fix: Add the same end-game evaluation to `advanceRunner` after the score is updated. Follow the exact same pattern used in `advanceRunnersBatch` — evaluate the trigger, and if `shouldEndGame` is true, call `queueAutoEndGame` with the result reason.

VERIFICATION:
- `npx vitest run src/src_figma/__tests__/gameTracker/endGameTrigger.test.ts` — existing tests must pass
- `npm run build` must exit 0
- Write a new test case in endGameTrigger.test.ts that calls `evaluateEndGameTriggerWithTotalInnings` with a scenario where a single runner scores the walk-off run (bottom of 7th, tied game, runner scores from 3rd). Confirm it returns `shouldEndGame: true, reason: "walkoff"`.
```

---

## Prompt 3: Score Correction End-Game Re-Evaluation (Bug #9)

```
BUG: Two related issues with score corrections in the final inning:
(A) If a user corrects a score so the home team takes the lead in the bottom of the final inning, the game does not trigger the end-game flow.
(B) If a walk-off was already triggered and `queueAutoEndGame` set `gamePhase: "POST_FINAL_OUT"`, but the user then corrects the score so it's no longer a walk-off, the game is stuck in POST_FINAL_OUT with no way to revert.

INVESTIGATION PROCESS:
1. Read `applyScoreAdjustment` in `src/src_figma/hooks/useGameState.ts`. Note that it modifies `homeScore`/`awayScore` and scoreboard data, but does NOT call `evaluateEndGameTrigger` afterward.
2. Read `queueAutoEndGame` — note how it sets `gamePhase: "POST_FINAL_OUT"` and triggers `showAutoEndPrompt` after a 300ms delay.
3. Read how `gamePhase` is used downstream — search for `POST_FINAL_OUT` references to understand what this state locks down.
4. For fix (A): After `applyScoreAdjustment` updates scores, call `evaluateEndGameTrigger` with `context: "half_inning_end"` using the new scores. If `shouldEndGame` is true, call `queueAutoEndGame`.
5. For fix (B): After `applyScoreAdjustment` updates scores, if `gamePhase` is currently `"POST_FINAL_OUT"`, re-evaluate end-game conditions with the corrected scores. If the game should NO LONGER end (e.g., score correction reversed the walk-off), revert `gamePhase` back to `"LIVE"` and cancel/dismiss the end-game prompt by setting `showAutoEndPrompt` to false.
6. Also check `applyOutsAdjustment` for the same pattern — if outs are corrected to 3 after a scoring play in the final inning, end-game should be re-evaluated.

VERIFICATION:
- `npm run build` must exit 0
- `npx vitest run src/src_figma/__tests__/gameTracker/endGameTrigger.test.ts` — existing tests must pass
- Write new test cases:
  (a) Score adjustment gives home the lead in bottom of final → shouldEndGame evaluates true
  (b) Score adjustment reverses a walk-off → gamePhase should revert to LIVE
```

---

## Prompt 4: Mojo Font Colors Not Rendering in App (New Bug)

```
BUG: Mojo state font colors were updated in `getMojoColor()` (mojoEngine.ts and mojoSystem.ts) and badge colors in `playerStateIntegration.ts`, but the new colors are not visible in the running application. The old colors still appear.

INVESTIGATION PROCESS:
1. Read `getMojoColor` in `src/engines/mojoEngine.ts` — confirm the new hex values are present (e.g., #9F1239 for rattled, #FFEB3B for locked-in, etc.).
2. Search the ENTIRE active UI codebase (`src/src_figma/`) for every place mojo colors are applied to DOM elements. Look for:
   - Direct calls to `getMojoColor`
   - Inline color assignments that reference mojo states (hardcoded hex values from the OLD palette like #dc2626, #f97316, #6b7280, #22c55e, #16a34a, #15803d)
   - CSS classes or Tailwind classes that set mojo colors
3. For each location found, determine: is it calling `getMojoColor()` (which has the new colors), or is it using hardcoded hex values (which would still show old colors)?
4. Check `GameTracker.tsx` specifically — search for any inline mojo color logic that bypasses `getMojoColor`. Look for patterns like `MOJO_STATES[level].name === 'NORMAL' ? '#888'` or direct color assignments based on mojo level.
5. Check the lineup column components (`BattingLineupColumn.tsx`, `DefensiveLineupColumn.tsx`) for any hardcoded mojo colors.
6. Check `TeamRoster.tsx` and `MojoFitnessEditor.tsx` for the same.
7. Fix: Replace any hardcoded old-palette hex values with calls to `getMojoColor()`. If there are components that never call `getMojoColor` at all, wire them up.

VERIFICATION:
- `npm run build` must exit 0
- `npx vitest run src/src_figma/__tests__/mojoFitness/mojoEngine.test.ts` — all 118 tests must pass
- Search the entire `src/src_figma/` directory for any remaining old mojo hex values: #dc2626, #f97316, #6b7280, #16a34a, #15803d. There should be zero matches in active code paths.
- Search for any hardcoded color strings near mojo/rattled/tense/locked/jacked references that don't use getMojoColor().
```

---

## Prompt 5: Final Validation Pass

```
TASK: Run the full test suite and build to confirm all fixes from Prompts 1-4 are clean.

PROCESS:
1. Run `npm run build` — must exit 0 with no TypeScript errors.
2. Run `npx vitest run` — all tests must pass. Report total count.
3. Run these specific test files and confirm all pass:
   - src/src_figma/__tests__/gameTracker/r3-round5.test.tsx
   - src/src_figma/__tests__/gameTracker/endGameTrigger.test.ts
   - src/src_figma/__tests__/gameTracker/defensiveColumnProjection.test.ts
   - src/src_figma/__tests__/gameTracker/EnrichmentPanel.test.tsx
   - src/src_figma/__tests__/mojoFitness/mojoEngine.test.ts
4. Search GameTracker.tsx for `isOutOfGame: true` — every instance should be guarded by gamePhase or be in a LIVE-only path.
5. Search useGameState.ts for every function that modifies `homeScore` or `awayScore` — every one should call `evaluateEndGameTrigger` afterward when in the final inning.
6. Search src/src_figma/ for old mojo hex values (#dc2626, #f97316, #6b7280, #16a34a, #15803d) — should be zero matches.
7. Report a summary table:

| Check | Result |
|-------|--------|
| Build | PASS/FAIL |
| Full test suite | X pass / Y fail |
| Pre-game sub guards | X locations guarded / Y total |
| Walk-off in advanceRunner | Present / Missing |
| Score correction re-eval | Present / Missing |
| Old mojo colors remaining | X matches |
```

---

## Prompt 6: Mojo Color Rendering Investigation (Revised)

```
CONTEXT: The getMojoColor() function in src/engines/mojoEngine.ts was updated with a new palette. All active UI components in src/src_figma/ already call getMojoColor() — no hardcoded old hex values exist in the active render path. Yet the colors reportedly don't appear changed in the browser.

The old hardcoded mojo color maps in src/components/GameTracker/LineupPanel.tsx and src/components/GameTracker/index.tsx are in the INACTIVE path (not routed in App.tsx) — they are NOT the cause.

INVESTIGATION PROCESS:
1. Verify the active render path. Read src/App.tsx and confirm that GameTracker routes to src/src_figma/app/pages/GameTracker.tsx, NOT src/components/GameTracker/index.tsx.
2. In the active GameTracker (src/src_figma/app/pages/GameTracker.tsx), search for every place mojo colors are applied to DOM elements. For each one, trace: does it call getMojoColor() from src/engines/mojoEngine.ts, or does it use some other color source?
3. Check import paths carefully. Some files import getMojoColor from different locations:
   - src/engines/mojoEngine.ts (canonical, has new colors)
   - src/utils/mojoSystem.ts (also updated)
   - src/engines/index.ts (re-exports — verify it re-exports from mojoEngine.ts)
   Confirm no stale re-export or barrel file is shadowing the updated function.
4. Check if there are any CSS classes, Tailwind utilities, or CSS-in-JS that override inline mojo colors. Search for class names containing "mojo", "rattled", "tense", "locked", "jacked" in any CSS/Tailwind config.
5. Check the mojo display in the batting lineup column (BattingLineupColumn.tsx) and defensive lineup column (DefensiveLineupColumn.tsx). These are the most visible places. Trace how each one gets its mojo color from data → render.
6. Check if getMojoColor is called with the correct MojoLevel type. If the mojo value passed is undefined or a string instead of a number, the Record lookup would return undefined and no color would render.
7. Check TeamRoster.tsx lines that use getMojoColor — are they passing the right argument type?

POSSIBLE ROOT CAUSES (investigate each):
- Import barrel file caching a stale version
- Mojo level not being passed as a number (type coercion issue)
- Color being set but overridden by a CSS class or parent style
- Component not re-rendering when mojo state changes (stale closure in useMemo/useCallback)

VERIFICATION:
- npm run build must exit 0
- npx vitest run src/src_figma/__tests__/mojoFitness/mojoEngine.test.ts — 118 tests must pass
- Add a temporary console.log in getMojoColor to confirm it's being called with expected arguments (remove before committing)
- If the root cause is found, fix it. If the root cause cannot be determined from code analysis alone, document findings and list what manual browser testing should check.
```

---

## Prompt 7: Fix Pre-Existing Fielding Flow Test Failures

```
BUG: 6 tests are failing — 5 in AtBatFlow.test.tsx and 1 in exitFlow.test.tsx. All show the same symptom: tests expect the FieldingModal to be mounted in the DOM, but it isn't there. Instead, a "Continue to Fielding →" button is showing.

This is a PRE-EXISTING test authoring bug, not a code regression. The component has a two-step flow that the tests skip:
  Step 1: User fills in at-bat details (direction, contact type, etc.)
  Step 2: User clicks "Continue to Fielding →" button
  Step 3: FieldingModal opens

The tests jump from Step 1 to asserting Step 3, skipping the button click.

INVESTIGATION PROCESS:
1. Read src/components/GameTracker/AtBatFlow.tsx. Find:
   - Where showFieldingModal state is defined (should be useState initialized to false)
   - Where handleProceedToFielding sets it to true
   - Where the "Continue to Fielding" button renders and calls handleProceedToFielding on click
   - Where the FieldingModal conditionally renders based on showFieldingModal
2. Read the 5 failing tests in AtBatFlow.test.tsx. For each one, identify the exact assertion that fails and what intermediate step (button click) is missing.
3. Read the 1 failing test in exitFlow.test.tsx. Same analysis.
4. Fix each test by adding the missing button click BEFORE the modal assertion. The button text to click is "Continue to Fielding →" (or a substring match).
5. For the test "does not show Continue to Fielding button once modal opens" — this one needs to FIRST click the button to open the modal, THEN assert the button is no longer visible.

VERIFICATION:
- npx vitest run src/src_figma/__tests__/gameTracker/AtBatFlow.test.tsx — all tests must pass
- npx vitest run src/src_figma/__tests__/gameTracker/exitFlow.test.tsx — all tests must pass
- npm run build must exit 0
- Confirm no other test files broke by running: npx vitest run
```

---

## Prompt 8: Final Validation Pass (Updated)

```
TASK: Run the full test suite and build to confirm all fixes from Prompts 1-7 are clean.

PROCESS:
1. Run `npm run build` — must exit 0 with no TypeScript errors.
2. Run `npx vitest run` — all tests must pass. Report total count.
3. Run these specific test files and confirm all pass:
   - src/src_figma/__tests__/gameTracker/r3-round5.test.tsx
   - src/src_figma/__tests__/gameTracker/endGameTrigger.test.ts
   - src/src_figma/__tests__/gameTracker/defensiveColumnProjection.test.ts
   - src/src_figma/__tests__/gameTracker/EnrichmentPanel.test.tsx
   - src/src_figma/__tests__/mojoFitness/mojoEngine.test.ts
   - src/src_figma/__tests__/gameTracker/AtBatFlow.test.tsx
   - src/src_figma/__tests__/gameTracker/exitFlow.test.tsx
4. Search GameTracker.tsx for `isOutOfGame: true` — every instance should be guarded by gamePhase or be in a LIVE-only path.
5. Search useGameState.ts for every function that modifies `homeScore` or `awayScore` — every one should call `evaluateEndGameTrigger` afterward when in the final inning.
6. Report a summary table:

| Check | Result |
|-------|--------|
| Build | PASS/FAIL |
| Full test suite | X pass / Y fail |
| Pre-game sub guards | X locations guarded / Y total |
| Walk-off in advanceRunner | Present / Missing |
| Score correction re-eval | Present / Missing |
| AtBatFlow tests | X pass / Y total |
| exitFlow tests | X pass / Y total |
```

---

## Execution Order

1. **Prompt 1** — Pre-game sub UI fix (most impactful user-facing bug)
2. **Prompt 2** — Walk-off advanceRunner gap
3. **Prompt 3** — Score correction re-evaluation
4. **Prompt 4** — Mojo color rendering (initial investigation)
5. **Prompt 5** — Validation pass (after prompts 1-4)
6. **Prompt 6** — Mojo color deep investigation (if Prompt 4 didn't resolve)
7. **Prompt 7** — Fielding flow test fixes (pre-existing)
8. **Prompt 8** — Final validation pass (all fixes)
