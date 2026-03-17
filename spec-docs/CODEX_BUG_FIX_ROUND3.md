# GAMETRACKER BUG LIST — Round 3
**Created:** 2026-03-16
**Source:** Manual browser testing by JK after Round 2 fixes
**Status:** PENDING FIX

---

## Bug Summary

| # | Bug | Severity | Route |
|---|-----|----------|-------|
| R3-01 | Runner correction in play log doesn't persist / resets on next batter | CRITICAL | Codex 5.4 high |
| R3-02 | Next-inning leadoff dotted border defaults to wrong player | LOW | Codex 5.4 high |
| R3-03 | No way to correct runner base outcome without TOOTBLAN/Out Advancing | HIGH | Codex 5.4 high |
| R3-04 | WP_K/PB_K auto-advances all runners (they shouldn't be forced) | HIGH | Codex 5.4 high |
| R3-05 | Mid-inning pitcher change doesn't update defensive lineup column | MEDIUM | Codex 5.4 high |
| R3-06 | Un-toggling Out Advancing/TOOTBLAN doesn't restore the run | HIGH | Codex 5.4 high |
| R3-07 | END GAME hangs after pitch count prompt | CRITICAL | Codex 5.4 high |

---

## R3-07 (CRITICAL): END GAME Hangs After Pitch Count Prompt
# Branch: fix/r3-07-endgame-hang

### OBSERVED
Clicking END GAME correctly asks for pitch count for the final pitcher. After entering the pitch count, the popover prompt with the END GAME button hangs. The play log resets but nothing else in the game tracker does and the game does not end. User is stuck.

### EXPECTED
After entering final pitch count → game completes → navigates to PostGameSummary.

### ROOT CAUSE HYPOTHESIS
The end-game flow has multiple steps: pitch count prompt → confirmEndGame → handleEndGame → hookEndGame → navigate to PostGameSummary. The hang suggests one of these steps is throwing an error silently, or the pitch count prompt isn't properly resolving to trigger the next step. The play log resetting suggests partial execution — some cleanup fires but navigation doesn't happen.

### FILES TO INVESTIGATE
- `src/src_figma/app/pages/GameTracker.tsx` — search for `handleEndGame`, `confirmEndGame`, `END GAME`, the pitch count prompt flow at end of game, and the navigate call (~line 4930)
- `src/src_figma/hooks/useGameState.ts` — `completeGameInternal`, `hookEndGame` — does it throw?
- Check the browser console for errors during the hang — there's likely an uncaught promise rejection or a state that never resolves

### WHAT TO FIX
1. Open browser console and reproduce the hang. Look for errors. The error message will identify the exact failure point.
2. If `hookEndGame` throws: check what it's trying to do that fails. Common causes: accessing undefined state, failed IndexedDB write, missing required option.
3. If the pitch count prompt doesn't resolve: trace the PitchCountPrompt flow for `type: 'end_game'`. After the user enters the count and confirms, the prompt should clear and trigger the end-game continuation.
4. If the play log resets but navigation doesn't happen: the handleEndGame function may be catching the error but not re-throwing, leaving the UI in a partial state. Check the `try/catch/finally` block (~line 4935).
5. The `gameEndingRef.current` guard may not be releasing on failure — check the `finally` block.

### DO NOT
- Change the aggregation pipeline
- Modify the PostGameSummary page
- Change the pitch count prompt UI

### VERIFY
```bash
npm run build
```
Browser: Record several plays → tap END → enter pitch count → game should complete and navigate to PostGameSummary. No hang.

---

## R3-01 (CRITICAL): Runner Correction Doesn't Persist / Resets on Next Batter
# Branch: fix/r3-01-runner-correction-persist

### OBSERVED
Correcting a runner outcome in the play log (e.g., changing "scored" to "out at 3rd") looks correct momentarily, but once the user clicks an outcome for the next batter, the runner outcome in the play log reverts to the pre-correction default. The correction is disconnected from the game state.

### EXPECTED
Runner corrections must persist permanently. Once a user corrects a runner outcome in the play log enrichment, that correction should: (1) persist in IndexedDB on the AtBatEvent.runnerOutcomes[], (2) remain visible in the play log after subsequent plays, (3) affect the game state (outs, score) appropriately.

### ROOT CAUSE HYPOTHESIS
The runner correction may be updating local React state but NOT persisting to IndexedDB via `updateAtBatEvent`. Or it IS persisting, but the play log rebuild (`rebuildPlayLogFromEventLog`) runs after the next commit and overwrites the corrected entry with stale data. Or the correction updates the enrichment metadata (TOOTBLAN/Out Advancing flags) but not the actual `toBase` field on `runnerOutcomes[]`.

### FILES TO INVESTIGATE
- `src/src_figma/app/pages/GameTracker.tsx` — `handleRunnerEnrichmentUpdate` or equivalent, where runner sub-entry corrections are processed
- `src/src_figma/app/components/EnrichmentPanel.tsx` — `RunnerEnrichmentPanel`, what data it sends on save
- `src/utils/eventLog.ts` — `updateAtBatEvent` — does it support updating `runnerOutcomes`?
- `src/src_figma/app/utils/gameTrackerPlayLog.ts` — `buildRunnerSubEntries` — does it read from persisted or local state?

### WHAT TO FIX
1. Trace the correction flow: user toggles a runner outcome → what function is called → does it call `updateAtBatEvent` with the updated `runnerOutcomes`?
2. If the correction only updates local state: add the `updateAtBatEvent` call to persist the change.
3. If the correction persists but gets overwritten by `rebuildPlayLogFromEventLog`: the rebuild must read from the PERSISTED event data (which includes the correction), not from the live game state snapshot. Verify `buildPlayLogEntries` reads `runnerOutcomes` from the persisted AtBatEvent.
4. If the `toBase` field isn't being updated (only flags like TOOTBLAN are): the correction must also update `toBase` (e.g., from 'home' to 'out' when marking out advancing).

### DO NOT
- Change the auto-default logic for new plays
- Modify the Quick Bar commit flow

### VERIFY
```bash
npm run build
```
Browser: Runner scores on hit → tap runner sub-entry → change outcome (e.g., mark out) → record next batter's outcome → go back and check the runner sub-entry → correction should still be there.

---

## R3-06 (HIGH): Un-Toggling Out Advancing / TOOTBLAN Doesn't Restore Run
# Branch: fix/r3-06-untoggle-run-restore

### OBSERVED
If user marks a scored runner as "Out Advancing" or "TOOTBLAN," the run is correctly subtracted. But if user un-toggles either flag (changing back to safe), the run does NOT return to the scoreboard. There's no way to mark one player safe at home while marking another out (e.g., FC with bases loaded, <2 outs).

### EXPECTED
Toggle ON → run subtracted. Toggle OFF → run restored. The score should always reflect the current state of the toggle. This must work per-runner independently.

### ROOT CAUSE HYPOTHESIS
The R2-10 fix (Out Advancing score correction) likely only handles the "toggle ON" path (decrement score). The "toggle OFF" path (increment score back) may not exist, or it may check the wrong condition.

### FILES TO INVESTIGATE
- `src/src_figma/hooks/useGameState.ts` — the runner outcome correction function added in R2-10 (~line 6523). Check both the toggle-on and toggle-off branches.
- `src/src_figma/app/pages/GameTracker.tsx` — `handleRunnerEnrichmentUpdate` (~line 4616)

### WHAT TO FIX
1. Find the score adjustment logic from R2-10. It should have two paths:
   - Runner was at 'home' (scored) and is now marked out → decrement score
   - Runner was marked out and is now restored to 'home' (safe) → INCREMENT score
2. The logic must compare the PREVIOUS state of the flag with the NEW state. If `wasOutAdvancing === false && isNowOutAdvancing === true` → decrement. If `wasOutAdvancing === true && isNowOutAdvancing === false` → increment.
3. Same logic for TOOTBLAN toggle.
4. The score adjustment must use the correct team (batting team's score, based on which half-inning the play occurred in).

### VERIFY
```bash
npm run build
```
Browser: Runner scores → toggle Out Advancing ON → score decrements → toggle Out Advancing OFF → score increments back. Same for TOOTBLAN.

---

## R3-03 (HIGH): No Way to Correct Runner Base Outcome Without TOOTBLAN/Out Advancing
# Branch: fix/r3-03-runner-base-correction

### OBSERVED
Runner correction only offers TOOTBLAN and Out Advancing toggles. But there are scenarios where a runner's base destination needs to change without either flag:
- Example: R1+R2, ball hit to 3B, 3B steps on bag → throws to 1B for DP. R1 (on 1st) ends up safely at 2nd. The engine may default R1 to "out" but the user needs to correct to "safe at 2B" — that's not TOOTBLAN or Out Advancing, it's just a different outcome.

### EXPECTED
Runner sub-entry enrichment should allow changing the runner's destination base directly: user can set the runner to 1B, 2B, 3B, HOME, or OUT. The TOOTBLAN and Out Advancing toggles are MODIFIERS on top of the base outcome, not the only way to change it.

### FILES TO INVESTIGATE
- `src/src_figma/app/components/EnrichmentPanel.tsx` — `RunnerEnrichmentPanel` — what controls does it offer?
- The `RunnerSubEntry` type in `src/src_figma/app/utils/playLogTypes.ts` — does it have `toBase` as editable?

### WHAT TO FIX
1. In `RunnerEnrichmentPanel`, add a BASE DESTINATION selector: buttons for [2B] [3B] [HOME] [OUT] (options vary by runner's starting base — can't go backward).
2. When user taps a destination, update `runnerOutcomes[].toBase` on the persisted AtBatEvent.
3. If the destination changes from 'home' to something else → adjust score (decrement). If from something else to 'home' → adjust score (increment). Reuse the R2-10/R3-06 score adjustment logic.
4. TOOTBLAN and Out Advancing remain as toggles ON TOP of the destination — they classify WHY the outcome happened, but the destination selector determines WHAT happened.

### DO NOT
- Change the auto-default runner logic (that computes initial destinations)
- Modify the Quick Bar commit flow

### VERIFY
```bash
npm run build
```
Browser: R1+R2, record DP → tap R1's sub-entry → change destination from "OUT" to "2B" → runner shows as safe at 2B, outs adjust accordingly.

---

## R3-04 (HIGH): WP_K/PB_K Auto-Advances All Runners (They Shouldn't Be Forced)
# Branch: fix/r3-04-wpk-runner-optional

### OBSERVED
When WP_K or PB_K is recorded, ALL runners on base auto-advance one base. But a wild pitch/passed ball doesn't force runners — they advance at their own risk. A runner on 2nd might hold on a WP. The current behavior should make advancement the DEFAULT but allow correction to hold.

### EXPECTED
WP_K/PB_K defaults: all runners advance one base (this is the common case). But the user must be able to correct individual runners to "HELD" (stayed at their base) via the runner sub-entry enrichment. This connects to R3-03's base destination selector — the user should be able to set a runner back to their original base.

### ROOT CAUSE
The R2-11 fix correctly made runners advance by default on WP/PB. The issue is that there's no way to UN-advance them afterward. R3-03's base destination selector will fix this.

### WHAT TO FIX
This is RESOLVED BY R3-03. Once the runner base destination selector is built, users can correct any runner back to their previous base after a WP_K/PB_K. No additional code changes needed beyond R3-03.

Mark as: **RESOLVED BY R3-03** — verify after R3-03 is implemented.

---

## R3-05 (MEDIUM): Mid-Inning Pitcher Change Doesn't Update Defensive Lineup
# Branch: fix/r3-05-pitcher-defense-resync

### OBSERVED
This was reported as R2-03 and supposedly fixed, but it's still happening. Mid-inning pitcher change updates the NewsBoard but NOT the defensive lineup column.

### EXPECTED
After pitcher substitution, the defensive column should immediately show the new pitcher.

### ROOT CAUSE HYPOTHESIS
The R2-03 fix may have wired the resync to the wrong trigger, or the resync fires but the column doesn't re-render because its props reference a stale snapshot.

### FILES TO INVESTIGATE
- `src/src_figma/app/pages/GameTracker.tsx` — search for the R2-03 fix: defensive column resync on pitcher change. Find `syncDisplayedRostersToLineupSnapshot` or equivalent, and check if it fires after pitcher substitution.
- `src/src_figma/app/components/DefensiveLineupColumn.tsx` — does it derive data from props or from a ref/context that might be stale?

### WHAT TO FIX
1. Verify the R2-03 fix: does `syncDisplayedRostersToLineupSnapshot` (or equivalent) fire AFTER the pitcher change completes?
2. If it fires but the column doesn't update: the column's props may be derived from a `useMemo` with stale dependencies. Add the pitcher change state to the memo's dependency array.
3. If it doesn't fire: wire the resync call into the pitcher substitution handler's completion path.

### VERIFY
```bash
npm run build
```
Browser: Mid-inning → change pitcher → defensive column shows new pitcher immediately (no need to wait for half-inning change).

---

## R3-02 (LOW): Next-Inning Leadoff Dotted Border on Wrong Player
# Branch: fix/r3-02-leadoff-indicator

### OBSERVED
Dotted border around the player who will lead off the next half-inning defaults to the wrong player in the fielding lineup. Seems to just use the first player in batting order rather than tracking who is actually due up.

### EXPECTED
The dotted outline should be on the player who will bat FIRST in the next half-inning for that team. This requires tracking where each team's batting order position left off at the end of their last at-bat.

### ROOT CAUSE
Known limitation from Step 1.C: "Next-inning leadoff for defensive team defaults to 1 (requires cross-half-inning tracking)." The batting lineup column correctly tracks the next batter (it's the batter after the current one), but the DEFENSIVE column can't know the other team's next leadoff batter without cross-half tracking.

### FILES TO INVESTIGATE
- `src/src_figma/app/pages/GameTracker.tsx` — `nextLeadoffIndex` derivation for the defensive column
- `src/src_figma/hooks/useGameState.ts` — does it track each team's current batter index independently?

### WHAT TO FIX
1. Track each team's batting position independently (not just the current batting team).
2. When half-inning changes, save the current batter index for the team that just batted.
3. Pass the saved index as the `nextLeadoffIndex` for the defensive column.
4. If useGameState doesn't track per-team batter indices, it may need a small addition: `awayBatterIndex` and `homeBatterIndex` persisted across half-innings.

### VERIFY
```bash
npm run build
```
Browser: Play through a full inning. In the bottom of the 1st, the dotted outline in the defensive column (away team) should be on the player due up NEXT for the away team (e.g., if the away team's 3rd batter made the last out in the top of the 1st, the dotted outline should be on the 4th batter).

---

## Execution Order

**CRITICAL — fix first:**
1. R3-07 (END GAME hang) — game-breaking, can't complete games
2. R3-01 (runner correction doesn't persist) — core data integrity

**HIGH — fix next:**
3. R3-06 (un-toggle doesn't restore run)
4. R3-03 (runner base destination selector) — also resolves R3-04
5. R3-04 (WP_K runner auto-advance) — RESOLVED BY R3-03, verify only

**MEDIUM/LOW — fix last:**
6. R3-05 (pitcher change defense column — R2-03 regression)
7. R3-02 (next-inning leadoff indicator)

Each bug has its own branch. Run `npm run build` after each. Browser-verify before merging.
