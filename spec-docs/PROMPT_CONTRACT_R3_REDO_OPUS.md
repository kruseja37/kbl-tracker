# PROMPT CONTRACT: R3 Redo — Runner Correction Engine + Defense Resync
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: fix/r3-redo-runner-engine

---

You are a senior React/TypeScript engineer fixing the most critical remaining bugs in the KBL Tracker GameTracker. The runner correction system persists changes to IndexedDB correctly but does NOT feed corrections back into the live game state (score, outs, bases). The defensive lineup column doesn't update after pitcher changes.

## THE PROBLEM IN ONE SENTENCE

Runner corrections are cosmetic — they update the persisted event and the play log display but the ScoreBug score, ScoreBug outs, ScoreBug base diamonds, and the next play's base state are all UNCHANGED after a correction.

## GOAL

1. When a runner's outcome is corrected (scored→out, out→scored, base change), the LIVE game state must update: score, outs, and base occupancy in `gameState` — visible in the ScoreBug.
2. Toggle Out Advancing ON → score decrements. Toggle OFF → score restores. Bidirectional.
3. Changing a runner's destination base (e.g., "out" → "safe at 2B") updates live bases AND the next play uses the corrected base state.
4. Defensive lineup column updates immediately after a mid-inning pitcher change.
5. Next-inning leadoff indicator shows the correct player (the one DUE UP next, not the one who batted last).

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §7.4 Post-Commit Runner Correction, §12.3 Correction vs Enrichment
- `spec-docs/CODEX_BUG_FIX_ROUND3.md` — R3-01, R3-03, R3-05, R3-06 (failed fixes, for context)

## BEFORE YOU WRITE ANY CODE

Read these files in this order:

### Step 1: Understand the runner correction handler
Read `src/src_figma/app/pages/GameTracker.tsx`. Search for `handleRunnerEnrichmentUpdate` (starts at approximately line 4629). Read the ENTIRE function (~150 lines). Pay close attention to:
- Line ~4658: `scoreDelta` and `outDelta` calculation — these are correct
- Line ~4719: `if (!isLatestAtBat && scoreDelta !== 0)` — THIS IS THE BUG. It only calls `applyScoreAdjustment` for NON-latest at-bats. For the latest at-bat, it calls `loadExistingGame` instead, which does NOT reliably update live score.
- Line ~4753: `loadExistingGame` call for latest at-bat — this replays from IndexedDB but the replayed state may not reflect the correction because the replay reads events sequentially and the correction may not have propagated.

### Step 2: Understand applyScoreAdjustment
Read `src/src_figma/hooks/useGameState.ts`. Search for `applyScoreAdjustment` (approximately line 6540). Read the full function. It correctly:
- Takes `(inning, halfInning, delta)` — delta can be positive or negative
- Updates `gameState.awayScore` or `gameState.homeScore` based on halfInning
- Updates the `scoreboard` inning-by-inning data
- It works for both +1 and -1 deltas

### Step 3: Understand the live game state
In `useGameState.ts`, search for the `GameState` interface (approximately line 66). Note these fields:
- `homeScore`, `awayScore` — live score
- `outs` — current out count
- `bases: { first: boolean; second: boolean; third: boolean }` — live base occupancy
These are what the ScoreBug reads. Runner corrections must update ALL of these.

### Step 4: Understand the defensive column
In `GameTracker.tsx`, search for `defensiveColumnPlayers` useMemo (approximately line 2243). Note its dependency array. Then search for where pitcher changes trigger `syncDisplayedRostersToLineupSnapshot` — find all calls and check if they fire AFTER the hook's `changePitcher` completes.

### Step 5: Understand next-inning leadoff
In `GameTracker.tsx`, search for `battingNextLeadoff` and `defensiveNextLeadoff` useMemo. Read how the indices are calculated. The defensive team's next leadoff should be the batter AFTER the last batter who completed an at-bat for that team.

## CONSTRAINTS

### Files you WILL modify:
```
src/src_figma/app/pages/GameTracker.tsx       — handleRunnerEnrichmentUpdate, defensiveColumnPlayers, pitcher change handler, leadoff indicators
src/src_figma/hooks/useGameState.ts            — ONLY if you need to add a function to update bases/outs from outside the normal play flow (e.g., applyOutsAdjustment, applyBasesUpdate)
```

### Files you MUST NOT modify:
```
src/utils/eventLog.ts                          — persistence is correct, DO NOT TOUCH
src/src_figma/app/components/EnrichmentPanel.tsx — UI is correct
src/src_figma/app/components/QuickBar.tsx
src/src_figma/app/components/ScoreBug.tsx      — reads from gameState, will auto-update when state changes
src/src_figma/app/components/PlayLogPanel.tsx
```

## EXACT FIXES

### Fix A: Score always adjusts on runner correction

In `handleRunnerEnrichmentUpdate`, find the conditional at approximately line 4719:
```typescript
if (!isLatestAtBat && scoreDelta !== 0) {
    applyScoreAdjustment(existingAtBat.inning, existingAtBat.halfInning, scoreDelta);
}
```

Change to:
```typescript
if (scoreDelta !== 0) {
    applyScoreAdjustment(existingAtBat.inning, existingAtBat.halfInning, scoreDelta);
}
```

Remove the `!isLatestAtBat` guard. Score adjustment must fire for ALL corrections — latest or historical.

For the latest-at-bat special path (`if (isLatestAtBat) { loadExistingGame(...) }`): this path was intended to handle base state by replaying from IndexedDB. But it's unreliable. Replace it with direct state updates (Fixes B and C below), then remove the `loadExistingGame` call for latest at-bat entirely. If you're not confident removing it, keep it as a fallback but ensure Fixes B and C fire BEFORE it.

### Fix B: Live base state updates on runner destination change

When `field === 'toBase'` AND this is the latest at-bat, the live `gameState.bases` must reflect the correction. After applying the score adjustment (Fix A), add:

```typescript
if (isLatestAtBat) {
    // Update live bases from corrected runnersAfter
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

`nextRunnersAfter` is already computed in the handler (~line 4672-4690). It correctly reflects the corrected runner positions.

For NON-latest at-bats: don't update live bases (the correction is historical and the current base state is from later plays). The persisted event update is sufficient — if the user undoes back to that play, the bases will be correct.

**IMPORTANT:** You need access to `setGameState`. Check if `useGameState` exposes a `setGameState` directly, or if you need to add a new function like `applyBasesCorrection(bases: {first: boolean, second: boolean, third: boolean})` to the hook's API. If the hook doesn't expose raw state setters, add a dedicated function:

```typescript
// In useGameState.ts:
const applyBasesCorrection = useCallback((bases: { first: boolean; second: boolean; third: boolean }) => {
    setGameState(prev => ({ ...prev, bases }));
}, []);
```

And expose it in the return value.

### Fix C: Live outs update on runner out-status change

When a runner changes between safe and out (e.g., "scored" → "out at home", or "safe at 2B" → "out"), the outs count must adjust for the latest at-bat:

```typescript
if (isLatestAtBat && outDelta !== 0) {
    setGameState(prev => ({
        ...prev,
        outs: Math.max(0, Math.min(3, prev.outs + outDelta)),
    }));
}
```

**CAUTION:** If outs reaches 3 via correction, check if there's a useEffect that auto-triggers `endInning` when `outs === 3`. Search for effects watching `gameState.outs`. If such an effect exists, you need a guard to prevent it from firing on corrections. Options:
- Add a `isCorrection` ref that's set to true during corrections, and check it in the effect
- Or skip the outs adjustment entirely for corrections and let the user undo if needed

If this is too risky, just apply the outs adjustment and document the 3-outs edge case. It's better to have correct outs count with a potential inning-change side effect than to have wrong outs count silently.

### Fix D: Defensive column resyncs after pitcher change

The `defensiveColumnPlayers` useMemo depends on displayed roster state. After `changePitcher`, `syncDisplayedRostersToLineupSnapshot` fires but the memo may not re-evaluate because the dependency array items aren't changing reference.

Fix: Add a `rosterVersion` counter:

```typescript
const [rosterVersion, setRosterVersion] = useState(0);
```

After every substitution and pitcher change completes:
```typescript
setRosterVersion(v => v + 1);
```

Add `rosterVersion` to the `defensiveColumnPlayers` useMemo dependency array.

Search for ALL places where `syncDisplayedRostersToLineupSnapshot` is called after a substitution or pitcher change. After each sync call, add `setRosterVersion(v => v + 1)`.

### Fix E: Next-inning leadoff indicator

The defensive team's next leadoff should be the batter who will bat FIRST in the next half-inning for that team. This is NOT the batter who batted last — it's the one AFTER the one who batted last (wrapping from 9 to 1).

Find the `defensiveNextLeadoff` calculation. If it currently uses the batter index of the player who batted last, add 1 (modulo 9):

```typescript
const defensiveNextLeadoff = (lastBatterIndexForDefensiveTeam + 1) % 9;
// If the team hasn't batted yet this game, default to 0 (first batter in order)
```

The challenge: you need to track each team's last batter index independently. Check if `useGameState` exposes per-team batter indices. If not:
- Track it in GameTracker.tsx state: `awayLastBatterIndex` and `homeLastBatterIndex`
- Update them when a half-inning ends (the last batter index = current batter index at end of half)
- The defensive team's next leadoff = (their last batter index + 1) % 9

## VERIFICATION

After completing all fixes, run:

```bash
npm run build
npm test
```

Then provide these browser test instructions for JK:

**Test 1 — Score adjustment (R3-01/R3-06):**
Runner scores on a single → tap runner sub-entry in play log → toggle "Out Advancing" ON → ScoreBug score MUST decrement by 1. Toggle OFF → score MUST increment back.

**Test 2 — Score persists across plays (R3-01):**
After correcting a runner in Test 1 → record the next batter's outcome → go back to the corrected runner sub-entry → correction must still be there (not reverted to defaults).

**Test 3 — Base state (R3-03):**
R1+R2, record DP → tap R1 sub-entry → change destination from "OUT" to "2B" → ScoreBug base diamonds must show 2B occupied. Record next batter's single → runner from 2B must advance (not from old base).

**Test 4 — WP_K runner hold (R3-04):**
WP_K with runner on 2nd → runner auto-advances to 3rd → tap sub-entry → change destination to "2B" (hold) → ScoreBug bases must show 2B, not 3B.

**Test 5 — Pitcher defense column (R3-05):**
Mid-inning → change pitcher → defensive column must immediately show new pitcher name.

**Test 6 — Next leadoff (R3-02):**
Play through top of 1st. Away team's 4th batter makes the 3rd out. In bottom of 1st, defensive column (away team) should have dotted outline on batter #5 (not #4).

## FORMAT

```
R3 REDO (OPUS) COMPLETE

Files changed:
[list each file with specific changes and line ranges]

Fix A (score): [describe what changed]
Fix B (bases): [describe what changed, whether new hook function was needed]
Fix C (outs): [describe what changed, how 3-outs edge case is handled]
Fix D (defense column): [describe rosterVersion or alternative approach]
Fix E (next leadoff): [describe the calculation fix]

The !isLatestAtBat guard: [removed / modified / replaced with what]
loadExistingGame for latest at-bat: [kept / removed / simplified]

npm run build: [PASS/FAIL]
npm test: [PASS/FAIL with counts]
```

## FAILURE PROTOCOL

- If you can't find `setGameState` or a way to update bases directly: add `applyBasesCorrection` to the useGameState hook's API. This is a small, safe addition.
- If updating outs to 3 triggers an inning change effect: add an `isCorrectionRef` guard. Set it true before the correction, check it in the endInning effect, clear it after.
- If `rosterVersion` doesn't fix the defense column: check if `syncDisplayedRostersToLineupSnapshot` is actually updating the state variables in the dependency array. The issue may be that the sync copies data into refs (not state), so the memo never re-evaluates.
- If the leadoff calculation is complex because per-team batter indices aren't tracked: use a simpler heuristic for now and document it as approximate.
- If anything is ambiguous: STOP and ask. Do not guess.

## DO NOT
- Rewrite handleRunnerEnrichmentUpdate from scratch — the persistence logic is correct
- Modify eventLog.ts
- Change the Quick Bar commit flow or runner default calculations
- Touch EnrichmentPanel.tsx, PlayLogPanel.tsx, ScoreBug.tsx
- Remove the undo system changes from prior rounds
