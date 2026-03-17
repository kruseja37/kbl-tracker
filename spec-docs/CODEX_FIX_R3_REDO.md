# CODEX BUG FIX: Round 3 Redo — Runner Correction Engine + Defense Resync
# ROUTE: Codex 5.4 | high
# Branch: fix/r3-redo-runner-engine
# This replaces the failed Round 3 fixes for R3-01, R3-03, R3-04, R3-05, R3-06

---

## CONTEXT

Round 3 fixes compiled but were COSMETIC ONLY — they update persisted event data and local play log state but do NOT feed back into the live game state engine (score, outs, bases in useGameState). The fundamental problem: `handleRunnerEnrichmentUpdate` in GameTracker.tsx (~line 4629) has sophisticated persistence logic but the live game state update is gated behind a condition that skips it for the most common case.

## ROOT CAUSE (VERIFIED BY CODE TRACE — do not re-investigate)

In `GameTracker.tsx` ~line 4719:
```typescript
if (!isLatestAtBat && scoreDelta !== 0) {
    applyScoreAdjustment(existingAtBat.inning, existingAtBat.halfInning, scoreDelta);
}
```

**Bug 1 (R3-01, R3-06):** When correcting runners on the LATEST at-bat (`isLatestAtBat === true`), `applyScoreAdjustment` is SKIPPED. The code falls through to `loadExistingGame()` (~line 4753) which replays from IndexedDB — but this replay does not reliably recalculate the live score from corrected events. So the score doesn't change.

**Bug 2 (R3-03):** The handler updates `runnersAfter` on the persisted event and the local play log entry, but does NOT update the LIVE `gameState.bases` object. The next commit reads bases from live state, not from the corrected persisted event. So the corrected runner still appears on their old base for the next play.

**Bug 3 (R3-05):** `defensiveColumnPlayers` useMemo (~line 2243) depends on `homeTeamPitchers`/`awayTeamPitchers` which come from displayed roster state. After `changePitcher`, `syncDisplayedRostersToLineupSnapshot` must fire to update the displayed roster. The sync call exists at line 2600 but may not trigger a re-render because the memo's dependency array doesn't include a change counter or the sync timestamp.

## GOAL

Five fixes in one coordinated change:
1. Score adjustment ALWAYS fires on runner correction (remove the `!isLatestAtBat` guard)
2. Live base state updates when runner destination changes
3. Un-toggling Out Advancing/TOOTBLAN correctly restores the run (bidirectional delta)
4. Runner base destination changes update live outs count
5. Defensive column resyncs after pitcher change

## FILES TO MODIFY

```
src/src_figma/app/pages/GameTracker.tsx:
  - handleRunnerEnrichmentUpdate (~line 4629): Fix score/outs/bases feedback to live state
  - defensiveColumnPlayers useMemo (~line 2243): Add dependency to ensure pitcher change triggers re-render
  - Pitcher change handler (~line 2600 area): Ensure syncDisplayedRostersToLineupSnapshot fires AND triggers memo re-evaluation
```

## EXACT FIXES

### Fix 1: Remove `!isLatestAtBat` guard on score adjustment

At GameTracker.tsx ~line 4719, change:
```typescript
// BEFORE (broken):
if (!isLatestAtBat && scoreDelta !== 0) {
    applyScoreAdjustment(existingAtBat.inning, existingAtBat.halfInning, scoreDelta);
}

// AFTER (fixed):
if (scoreDelta !== 0) {
    applyScoreAdjustment(existingAtBat.inning, existingAtBat.halfInning, scoreDelta);
}
```

Then REMOVE or simplify the `isLatestAtBat` block that calls `loadExistingGame`. The `applyScoreAdjustment` call handles score for ALL cases. If the `loadExistingGame` call is still needed for base state (Fix 2), keep it but remove the score-related conditional around it.

### Fix 2: Update live base state on runner destination change

When `field === 'toBase'` in handleRunnerEnrichmentUpdate, the live `gameState.bases` must be updated to reflect the correction. After the persisted event update, add:

```typescript
// Only update live bases if this is the latest at-bat (live state reflects current game position)
if (isLatestAtBat) {
    // Rebuild bases from the corrected runnersAfter
    setGameState(prev => ({
        ...prev,
        bases: {
            first: !!nextRunnersAfter.first,
            second: !!nextRunnersAfter.second,
            third: !!nextRunnersAfter.third,
        },
    }));
}
```

This ensures that if you correct a runner on the most recent play (e.g., change from "3B" to "OUT"), the live base state updates immediately. The next Quick Bar tap will see the correct bases.

For non-latest at-bats, the `loadExistingGame` replay should handle this — but verify it does.

### Fix 3: Outs adjustment on runner correction

Similar to score, when a runner's outcome changes between safe and out, the live outs count must update. The `outDelta` is already calculated (~line 4661). Apply it:

```typescript
if (outDelta !== 0) {
    setGameState(prev => ({
        ...prev,
        outs: Math.max(0, Math.min(3, prev.outs + outDelta)),
    }));
}
```

**CAUTION:** If the out delta changes outs to 3, this would normally trigger an inning change. For a CORRECTION on a past play, we do NOT want to trigger an inning change effect. The `setGameState` should update outs but any "3 outs = end of half" effect should be suppressed for corrections. Check if there's an effect watching `gameState.outs` that triggers `endInning` — if so, add a guard: `if (isCorrection) skip`.

If this is too risky, only apply out deltas for the LATEST at-bat (where the correction directly affects current game state) and let `loadExistingGame` handle historical corrections.

### Fix 4: Bidirectional score delta (un-toggle restores run)

The `scoreDelta` calculation at ~line 4658 uses helper functions `runnerOutcomeCountsAsRun` and `runnerOutcomeCountsAsOut`. Verify these helpers:

```typescript
// A runner outcome counts as a run if:
// toBase === 'home' AND NOT (isOutAdvancing || isTootblan)
function runnerOutcomeCountsAsRun(outcome): boolean {
    return outcome.toBase === 'home' && !outcome.isOutAdvancing && !outcome.isTootblan;
}
```

If `runnerOutcomeCountsAsRun` is implemented correctly, the delta math handles bidirectional:
- Toggle Out Advancing ON: `previousRunCounted=true, nextRunCounted=false → scoreDelta = -1` ✓
- Toggle Out Advancing OFF: `previousRunCounted=false, nextRunCounted=true → scoreDelta = +1` ✓

If the un-toggle isn't restoring the run, check:
1. Is `runnerOutcomeCountsAsRun` reading the UPDATED outcome (with toggle OFF) or the persisted-but-stale outcome?
2. Is `applyScoreAdjustment` being called with the `+1` delta? (Fix 1 removes the guard that was blocking this)
3. Does `applyScoreAdjustment` support positive deltas? Check it uses `Math.max(0, prev.homeScore + delta)` — this works for both positive and negative deltas. ✓

The most likely fix: once Fix 1 removes the `!isLatestAtBat` guard, the bidirectional delta will work automatically because `applyScoreAdjustment` always fires.

### Fix 5: Defensive column pitcher resync

The `defensiveColumnPlayers` useMemo at ~line 2243 has these dependencies:
```typescript
[fieldingTeam, homeTeamPlayers, awayTeamPlayers, homeTeamPitchers, awayTeamPitchers, pitcherStats, getRosterEntityId]
```

After `changePitcher`, `syncDisplayedRostersToLineupSnapshot` updates the displayed roster state (`homeTeamPlayers`/`awayTeamPlayers`/`homeTeamPitchers`/`awayTeamPitchers`). If the memo still doesn't re-evaluate, the state update from the sync isn't causing a new reference for the dependency array items.

Fix approach:
1. In the pitcher change handler (~line 2600 area or wherever `changePitcher` is called), AFTER the change completes AND sync fires, add a forced re-render trigger. The simplest approach: add a `rosterVersion` counter state that increments after every substitution/pitcher change, and include it in the defensiveColumnPlayers memo dependency array.

```typescript
const [rosterVersion, setRosterVersion] = useState(0);

// After pitcher change completes + sync:
setRosterVersion(v => v + 1);

// In defensiveColumnPlayers useMemo:
const defensiveColumnPlayers = useMemo(() => {
    // existing logic
}, [fieldingTeam, homeTeamPlayers, awayTeamPlayers, homeTeamPitchers, awayTeamPitchers, pitcherStats, getRosterEntityId, rosterVersion]);
```

2. Alternatively, check if the issue is that `syncDisplayedRostersToLineupSnapshot` is called BEFORE the hook's `changePitcher` completes. If it's a timing issue, move the sync to AFTER the `changePitcher` promise resolves.

## DO NOT
- Rewrite the entire handleRunnerEnrichmentUpdate function — the persistence logic is correct, only the live state feedback is broken
- Change eventLog.ts persistence structure
- Modify the Quick Bar commit flow
- Change the auto-default runner logic
- Remove the `loadExistingGame` call for non-latest at-bats (it's needed for historical corrections)
- Trigger inning-change effects from runner corrections on past plays

## VERIFY

```bash
npm run build
```

Browser tests (ALL must pass — these are the same tests that failed):

**R3-01/R3-06 (score adjustment):**
1. Runner scores on hit → tap runner sub-entry → toggle Out Advancing ON → SCORE BUG score decrements by 1
2. Toggle Out Advancing OFF → SCORE BUG score increments back by 1
3. Same test for TOOTBLAN toggle
4. Record NEXT batter's outcome → go back to corrected runner → correction PERSISTS (not reverted)

**R3-03 (base state):**
5. R1+R2, record DP → tap R1 sub-entry → change destination from OUT to 2B → SCORE BUG bases update (2B occupied), outs adjust
6. Record next batter's single → runner from 2B advances correctly (not from old base)

**R3-04 (WP_K hold):**
7. WP_K with runner on 2nd → runner auto-advances to 3rd → tap sub-entry → change destination to 2B (hold) → bases show runner on 2B, not 3B

**R3-05 (pitcher in defense column):**
8. Mid-inning → change pitcher → defensive column immediately shows new pitcher name with primary color outline

## OUTPUT FORMAT

```
R3 REDO COMPLETE

Changes:
1. [Score adjustment: what changed at what line]
2. [Base state update: what changed]
3. [Outs adjustment: what changed, how inning-change effect is guarded]
4. [Bidirectional delta: what was the actual issue]
5. [Defense column resync: what changed]

The !isLatestAtBat guard: [was it removed? what replaced it?]
loadExistingGame for latest at-bat: [still called? removed? simplified?]

npm run build: [PASS/FAIL]
```
