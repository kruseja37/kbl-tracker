# Codex Prompt Series 2 — GameTracker Bug Fixes

> Run these prompts sequentially. Each one is self-contained.
> After each prompt completes, verify its test suite passes before moving to the next.

---

## Prompt 1: Swap 1B and BB buttons in quick bar

```
BUG: In the quick action bar, the 1B (single) and BB (walk) buttons are in the wrong order. BB should come before 1B.

INVESTIGATION PROCESS:
1. Read src/src_figma/app/components/QuickBar.tsx. Find the array that defines the button order (likely named PRIMARY_BUTTONS or similar).
2. Identify the current order of buttons in that array.
3. Swap the positions of '1B' and 'BB' so that BB appears before 1B.
4. Do NOT change any button behavior, colors, or handlers — only the display order.

VERIFICATION:
- npm run build must exit 0
- npx vitest run — all tests must pass
- If any test file references the button order (search for "PRIMARY_BUTTONS" or button order assertions in src/src_figma/__tests__/), update the expected order to match.
```

---

## Prompt 2: Add "Running" fielding attempt type

```
BUG: The fielding attempt type system is missing the "Running" option. "Charging" exists, but "Running" does not. Both should be available as fielding attempt types.

INVESTIGATION PROCESS:
1. Read src/src_figma/app/utils/fieldingPlayType.ts. Find:
   - The FieldingAttemptType union type (should be a string union like 'routine' | 'diving' | 'charging' | etc.)
   - The FIELDING_ATTEMPT_TYPE_OPTIONS array (the selectable options with value/label pairs)
   - Any legacy types (FieldingPlayTypeValue) — note that the legacy system already includes 'running'
2. Add 'running' to the FieldingAttemptType union, right after 'charging'.
3. Add { value: 'running', label: 'Running' } to FIELDING_ATTEMPT_TYPE_OPTIONS, right after the 'charging' entry.
4. Check the mapping functions in the same file (mapAttemptToLegacyFieldingPlayType and mapLegacyFieldingPlayTypeToAttempt). Ensure 'running' maps correctly between old and new systems. If the legacy system already has 'running', the mapping should be straightforward.
5. Read src/src_figma/app/components/EnrichmentPanel.tsx. Find the SAVED_BASES_ATTEMPT_TYPES set (contains attempt types that can save bases, like 'charging'). Add 'running' to this set — a running catch can also save bases.

VERIFICATION:
- npm run build must exit 0
- npx vitest run — all tests must pass
- Search for FieldingAttemptType across the codebase to confirm no type errors from the addition.
```

---

## Prompt 3: Fix pinch runners not persisting on base

```
BUG: When a runner on base is subbed out for a pinch runner, the new player appears in the lineup but:
- No base superscript shows on the new player in the batting column
- Clicking the new player shows no runner options (advance, steal, etc.)
- The score bug still shows a runner on base (under the OLD player's identity)

The runner tracker is not properly updated when a pinch runner substitution happens.

INVESTIGATION PROCESS:
1. Read src/src_figma/hooks/useGameState.ts. Find the pinch runner substitution handling — search for "pinch_run" or "T1-02" in the file. You should find a block around lines 8360-8390 that handles the case when subType === "pinch_run" && options?.base.
2. Read that block carefully. Note that it DIRECTLY MUTATES the runner object in runnerTrackerRef.current.runners (e.g., oldRunner.runnerId = newPlayerId). Direct mutation of a ref's internals does NOT trigger React re-renders because the ref object identity hasn't changed.
3. Now read src/src_figma/app/engines/inheritedRunnerTracker.ts. Find the handlePinchRunner() function. This is the PROPER immutable function — it creates a new tracker state object, properly updates pitcher responsibility stats, and returns a fresh object that React can detect as changed.
4. Compare what the direct mutation block does vs what handlePinchRunner() does. The proper function handles:
   - Creating a new runner entry with correct pitcher responsibility
   - Updating the responsibleStats.runnersOnBase array
   - Returning a new object (immutable update)
5. Replace the direct mutation block with a call to handlePinchRunner(). The pattern should be:
   ```
   runnerTrackerRef.current = handlePinchRunner(
     runnerTrackerRef.current,
     oldRunner.runnerId,      // the player being replaced
     benchPlayerId,           // the pinch runner coming in
     benchPlayerName || benchPlayerId,
   );
   ```
   Keep the setRunnerIdentityVersion increment that follows.
6. Also verify that handlePinchRunner is already imported in useGameState.ts. If not, add the import from '../app/engines/inheritedRunnerTracker'.
7. Check that getRunnerTrackerSnapshot() (search for it in useGameState.ts) returns a proper copy/snapshot, not the raw ref — this ensures downstream consumers see the updated state.
8. Check GameTracker.tsx for the battingLineupRunners memo (search for "battingLineupRunners"). Verify it depends on runnerIdentityVersion so it re-computes after a pinch runner sub.

VERIFICATION:
- npm run build must exit 0
- npx vitest run — all tests must pass
- npx vitest run src/src_figma/__tests__/baseballLogic/inheritedRunnerTracker.test.ts — confirm handlePinchRunner tests pass
- Search useGameState.ts for any remaining direct mutations of runner objects in the pinch runner path (oldRunner.runnerId =, oldRunner.runnerName =). There should be none — all updates should go through handlePinchRunner.
```

---

## Prompt 4: Add "End Half-Inning" button to recover from stuck inning

```
BUG: When 3 outs are recorded, an end-inning confirmation prompt appears. If the user dismisses it (clicks backdrop or "No"), the inning becomes permanently stuck — it cannot end even if the user undoes and re-records the 3rd out.

ROOT CAUSE HINT: The dismiss handler (declineInningEnd) sets isCorrectingRunnerOutcomesRef.current = true, which permanently blocks scheduleAutoEndInning from re-firing the prompt.

INVESTIGATION PROCESS:
1. Read src/src_figma/hooks/useGameState.ts. Find these functions:
   - scheduleAutoEndInning — triggers the end-inning confirm dialog after a delay when outs >= 3. Note the guard that checks isCorrectingRunnerOutcomesRef.
   - endInning() — shows pitch count prompt and queues executeEndInning as pending action
   - confirmInningEnd() — clears the confirm dialog and calls endInning()
   - declineInningEnd() — clears the confirm dialog and sets isCorrectingRunnerOutcomesRef = true (THIS IS THE STUCK STATE)
   - isCorrectingRunnerOutcomesRef — find where it's checked and how it blocks re-firing
2. Understand the stuck state: after decline, isCorrectingRunnerOutcomesRef is true, so scheduleAutoEndInning's guard prevents the prompt from ever appearing again.
3. Create a new function forceEndHalfInning (or similar) that:
   - Resets isCorrectingRunnerOutcomesRef.current = false
   - Clears showInningEndConfirm if it's showing
   - Calls endInning()
4. Export this new function from the useGameState hook return object.
5. In src/src_figma/app/pages/GameTracker.tsx, add a visible "End Half-Inning" button. Requirements:
   - Only visible when gameState.outs >= 3 AND gameState.gamePhase === 'LIVE'
   - Should be visually prominent but not obstructive — place it near the score bug or inning display area
   - onClick calls the new forceEndHalfInning function
   - Style it as a warning/action button (orange or yellow background, dark text)
   - Label: "End Half-Inning →"
6. This button should also work as a safety net for the normal flow — even if the auto-prompt is still pending, the manual button provides a reliable alternative.

VERIFICATION:
- npm run build must exit 0
- npx vitest run — all tests must pass
- Search GameTracker.tsx for the new button — confirm it's conditionally rendered based on outs >= 3
- Search useGameState.ts for the new forceEndHalfInning function — confirm it resets the correction ref and calls endInning
- Verify the button does NOT appear when outs < 3 or gamePhase !== 'LIVE'
```

---

## Prompt 5: Retroactive pitch count entry from play log and after pitcher exit

```
BUG: The pitch count prompt appears at two moments: (1) end of inning, and (2) when a pitcher is pulled. If the user dismisses either prompt, there is no way to enter the pitch count later. For pitching changes specifically, dismissing the prompt cancels the pending action entirely via dismissPitchCountPrompt.

INVESTIGATION PROCESS:
1. Read src/src_figma/hooks/useGameState.ts. Find:
   - pitchCountPrompt state (stores the current prompt data: type, pitcherId, pitcherName, currentCount)
   - confirmPitchCount — processes and persists the pitch count via a 'pitch_count_update' between-play event
   - dismissPitchCountPrompt — for 'end_inning' type: executes inning transition but skips count. For 'pitching_change'/'end_game' type: cancels the pending action entirely and nulls the prompt.
   - Where the prompt is triggered: endInning() and the pitching change handler

2. The fix has two parts:

PART A — Deferred pitch counts for dismissed prompts:
   - Add a new state array: deferredPitchCounts (useState). Each entry: { pitcherId, pitcherName, lastKnownCount, inning, halfInning, timestamp }
   - In dismissPitchCountPrompt, instead of discarding the prompt data, push it onto deferredPitchCounts before nulling pitchCountPrompt. Still execute the existing dismiss logic (inning transition for end_inning, cancel pending for pitching_change).
   - Add a new function: openDeferredPitchCount(pitcherId) that finds the deferred entry, removes it from the array, and sets pitchCountPrompt with the stored data so the modal re-opens.
   - Export deferredPitchCounts and openDeferredPitchCount from the hook.

PART B — UI for accessing deferred pitch counts:
   - In src/src_figma/app/pages/GameTracker.tsx, add a visual indicator when deferredPitchCounts.length > 0. This could be:
     (a) A small badge/button near the score bug: "⚠️ N pending pitch counts" that opens a list
     (b) When tapped, show the list of deferred pitchers and let the user tap one to open the PitchCountModal
   - The PitchCountModal already exists and works — you just need to re-trigger it with the stored data.
   - Style the indicator as a warning (amber/orange) so it's noticeable but not blocking.

3. Also verify that the pitch count modal rendered in GameTracker.tsx (search for PitchCountModal) correctly handles the re-opened prompt — it should use pitchCountPrompt state which you're repopulating.

4. Consider the play log angle: search for PlayLogPanel or play log rendering in GameTracker.tsx. If individual at-bat entries have a tap/click handler, adding a "Edit Pitch Count" option there would be a bonus but is NOT required for this fix. The deferred prompt approach is the primary fix.

VERIFICATION:
- npm run build must exit 0
- npx vitest run — all tests must pass
- Search useGameState.ts for deferredPitchCounts — confirm it's declared, populated on dismiss, and clearable
- Search GameTracker.tsx for the deferred pitch count indicator — confirm it renders when the array is non-empty
- Verify that dismissing a pitch count prompt does NOT lose the data — it should appear in the deferred list
```

---

## Prompt 6: Final Validation Pass

```
TASK: Run the full test suite and build to confirm all fixes from Prompts 1-5 are clean.

PROCESS:
1. Run `npm run build` — must exit 0 with no TypeScript errors.
2. Run `npx vitest run` — all tests must pass. Report total count.
3. Run these specific test files and confirm all pass:
   - src/src_figma/__tests__/gameTracker/AtBatFlow.test.tsx
   - src/src_figma/__tests__/gameTracker/EnrichmentPanel.test.tsx
   - src/src_figma/__tests__/baseballLogic/inheritedRunnerTracker.test.ts
   - src/src_figma/__tests__/mojoFitness/mojoEngine.test.ts
4. Source audit checks:
   - Search QuickBar.tsx for the PRIMARY_BUTTONS array — confirm BB appears before 1B.
   - Search fieldingPlayType.ts for 'running' — confirm it exists in both the type union and options array.
   - Search useGameState.ts for direct mutations of runner objects in pinch runner path (oldRunner.runnerId =). There should be ZERO matches — all updates should use handlePinchRunner.
   - Search useGameState.ts for forceEndHalfInning — confirm it exists, resets isCorrectingRunnerOutcomesRef, and calls endInning.
   - Search useGameState.ts for deferredPitchCounts — confirm state exists and is populated when pitch count prompts are dismissed.
   - Search GameTracker.tsx for "End Half-Inning" — confirm the button exists and is gated on outs >= 3.
5. Report a summary table:

| Check | Result |
|-------|--------|
| Build | PASS/FAIL |
| Full test suite | X pass / Y fail |
| BB before 1B in QuickBar | Yes/No |
| Running in fielding types | Yes/No |
| Pinch runner direct mutations | X remaining (should be 0) |
| forceEndHalfInning exists | Yes/No |
| End Half-Inning button gated | Yes/No |
| deferredPitchCounts wired | Yes/No |
```

---

## Execution Order

1. **Prompt 1** — Swap 1B/BB (trivial, zero risk)
2. **Prompt 2** — Add Running fielding type (low complexity)
3. **Prompt 3** — Pinch runner persistence (medium, touches runner tracker)
4. **Prompt 4** — End Half-Inning button (medium, new UI + state reset)
5. **Prompt 5** — Retroactive pitch count (highest complexity, new deferred state)
6. **Prompt 6** — Full validation pass
