# Codex Task: R3 Round 7 — Three Remaining Exhibition Bugs

## Context

KBL Tracker is a React/TypeScript game tracker for Super Mega Baseball 4. Key files:
- `src/src_figma/app/pages/GameTracker.tsx` (~12,000+ lines) — main UI
- `src/src_figma/hooks/useGameState.ts` (~9,600+ lines) — state hook
- `src/src_figma/app/utils/gameTrackerRosterSync.ts` — lineup reconciliation
- `src/utils/gameStorage.ts` — IndexedDB persistence
- `src/utils/almanacQueries.ts` — exhibition stats aggregation

Fix all three bugs, write tests for each, verify build + test suite pass.

---

## Bug 1: Undo Doesn't Revert Runs in ScoreBug (CRITICAL)

### What happens
User records plays that score runs. Score updates correctly (e.g., 3-0). User undoes all plays. Play log empties correctly. But ScoreBug still shows 3-0 instead of reverting to 0-0.

### Root cause

The undo system has a disconnect between two mechanisms:

1. **UndoSystem snapshots** (`src/src_figma/app/components/UndoSystem.tsx`): Captures full state snapshots (including `gameState.homeScore`, `gameState.awayScore`, `scoreboard`) before each play. These snapshots are correct.

2. **Database undo** (`undoLastAction()` in useGameState.ts ~line 4325): Marks the most recent event as `undoneAt` in the event log database, then calls `loadExistingGame()` to reload state from the persisted snapshot.

**The problem**: In GameTracker.tsx `handleUndo` (~line 1486-1519), the function receives a `GameSnapshot` from the UndoSystem (which has the correct pre-play scores) but **ignores it** and calls `undoLastAction()` instead. `undoLastAction()` reloads from the persisted IndexedDB snapshot, which contains the LATEST scores (post-play), not the pre-play scores.

The `restoreState()` function exists in useGameState.ts (~line 9717) and CAN restore `gameState` including scores. But `handleUndo` doesn't use it with the UndoSystem snapshot.

### Fix

**Option A (preferred — use the snapshot)**: In `handleUndo`, after calling `undoLastAction()` (which correctly removes the event from the log), ALSO call `restoreState()` with the UndoSystem snapshot to restore the pre-play game state:

```typescript
const handleUndo = useCallback(async (snapshot: GameSnapshot) => {
  const undone = await undoLastAction();
  if (undone && snapshot) {
    restoreState({
      gameState: snapshot.gameState,
      scoreboard: snapshot.scoreboard,
      playerStats: snapshot.playerStats,
      pitcherStats: snapshot.pitcherStats,
      runnerTrackerState: snapshot.runnerTrackerState,
      lineupSnapshot: snapshot.lineupSnapshot,
      batterIndices: snapshot.batterIndices,
    });
  }
}, [undoLastAction, restoreState]);
```

Read `handleUndo` carefully and the `GameSnapshot` type. Verify `restoreState` accepts all the fields the snapshot provides.

**Option B (score recalculation)**: After `undoLastAction()`, recompute the score by walking all non-undone events. This is more robust but more complex.

### Important details
- The `restoreState` function in useGameState.ts already handles `gameState`, `scoreboard`, `playerStats`, `pitcherStats`, `runnerTrackerState`, `lineupSnapshot`, and `batterIndices`. Verify it sets `homeScore` and `awayScore`.
- The UndoSystem's `GameSnapshot` (defined in GameTracker.tsx or UndoSystem.tsx) must include these same fields.
- After restore, the auto-save must trigger to persist the corrected state.

### Files to read
- `src/src_figma/app/pages/GameTracker.tsx` — handleUndo callback (~line 1486), UndoSystem usage
- `src/src_figma/app/components/UndoSystem.tsx` — snapshot capture and stack
- `src/src_figma/hooks/useGameState.ts` — undoLastAction (~line 4325), restoreState (~line 9717)

### Test
Write a test that:
1. Sets up a game state with score 0-0
2. Records a play that scores a run (score becomes 1-0)
3. Captures a snapshot before the play
4. Calls the undo flow with the snapshot
5. Verifies score is back to 0-0

---

## Bug 2: Pitcher Sub Bench List Shows Only Position Players (PERSISTENT BUG)

### What happens
When trying to sub out a pitcher during a LIVE game, the bench list in PlayerCardModal only shows position players. Bench pitchers (who haven't pitched yet) don't appear. This has been "fixed" twice before but persists.

### Root cause

The bench list for the PlayerCardModal is constructed at TWO different points and they conflict:

**Path A — Position player bench** (works): `teamBenchPlayers` is built from `awayTeamPlayers` / `homeTeamPlayers` filtered by `battingOrder === undefined`.

**Path B — Pitcher bench** (broken): `teamBenchPitchers` is built from `awayTeamPitchers` / `homeTeamPitchers` filtered by `!p.isActive`.

The problem is in Path B. After `syncDisplayedRostersToLineupSnapshot()` runs, `reconcileTeamPitchersWithLineupSnapshot()` in `gameTrackerRosterSync.ts` rebuilds the pitcher arrays. At ~line 276-287:

```typescript
isOutOfGame: isActive ? false : usedPlayers.has(pitcherId) || isUnavailableFromBench,
```

If bench pitchers are being marked `isOutOfGame: true` (because `usedPlayers` contains them or `isUnavailableFromBench` is true), they won't appear. BUT the bench list filter is `!p.isActive`, not `!p.isOutOfGame`.

**The ACTUAL problem** is likely that the pitcher arrays don't include bench pitchers at all, or all pitchers are marked `isActive: true`.

### Investigation steps (do these before attempting a fix)

1. Add temporary logging to trace the exact state:
   ```typescript
   console.log('[R3-R7] teamBenchPitchers:', teamBenchPitchers.map(p => ({name: p.name, isActive: p.isActive, isOutOfGame: p.isOutOfGame})));
   console.log('[R3-R7] awayTeamPitchers:', awayTeamPitchers.map(p => ({name: p.name, isActive: p.isActive, isOutOfGame: p.isOutOfGame})));
   ```

2. Check what `awayTeamPitchers` contains AFTER `syncDisplayedRostersToLineupSnapshot` runs. How many entries? What are their `isActive` values?

3. Check `reconcileTeamPitchersWithLineupSnapshot` — after it runs, log the returned pitcher array.

4. Check the `availableBench` filter at the bottom of the PlayerCardModal render (~line 10710). Does it filter by `isOutOfGame`?
   ```typescript
   const availableBench = playerCardBenchEntries.filter(bp => !bp.isOutOfGame);
   ```
   If bench pitchers have `isOutOfGame: true`, they get filtered out here.

### Fix approach

After investigation, the fix is likely one of:

**A)** `reconcileTeamPitchersWithLineupSnapshot` is incorrectly setting `isOutOfGame: true` for all non-active pitchers. Fix: only set `isOutOfGame: true` for pitchers who were explicitly removed from the game (in `usedPlayers` set AND no longer active), NOT for bench pitchers who simply haven't pitched yet.

**B)** The pitcher roster arrays don't include bench pitchers at all. The initial pitcher array (from `navigationState?.awayPitchers`) includes them, but after reconciliation they get dropped. Fix: ensure `reconcileTeamPitchersWithLineupSnapshot` preserves all pitchers from the initial array.

**C)** The `playerCardBenchEntries` construction doesn't properly combine position players and pitchers. The bench pitchers have `isOutOfGame: true` from the reconciliation, so `availableBench.filter(bp => !bp.isOutOfGame)` removes them. Fix: for the bench list, a pitcher should only be excluded if they were explicitly subbed out of the game, not just because they're not the current pitcher.

### Files to modify
- `src/src_figma/app/utils/gameTrackerRosterSync.ts` (reconcileTeamPitchersWithLineupSnapshot)
- `src/src_figma/app/pages/GameTracker.tsx` (bench list construction, availableBench filter)

### Test
Write a test that:
1. Creates a team with 1 active pitcher and 3 bench pitchers
2. Runs reconcileTeamPitchersWithLineupSnapshot
3. Verifies all 3 bench pitchers have `isOutOfGame: false` and `isActive: false`
4. Builds the bench list as GameTracker would
5. Verifies all 3 bench pitchers appear in the list

---

## Bug 3: Almanac Only Shows Games at Default Home Stadium

### What happens
Exhibition Leaders and Player Cards only include games played at the team's default home stadium. If the user picked a different stadium for the exhibition, the game data doesn't appear in almanac queries (though it does appear in Game Archive).

### Root cause

The `leagueId` field is missing from `PersistedGameState` in `src/utils/gameStorage.ts`. Without it:

1. During a game, `leagueIdRef.current` is set from `navigationState?.leagueId`
2. On page refresh, `navigationState` is null → `leagueIdRef.current` is empty/undefined
3. When the game ends after a refresh, `leagueIdRef.current` is undefined
4. `archiveCompletedGame` stores the game with `leagueId: undefined`
5. The almanac queries use `getLeagueId(game)` which falls back to `competitionId`
6. If `competitionId` also doesn't match what the almanac canonical player was registered with, the game is invisible

The stadium association is a red herring — the real issue is the `leagueId` not surviving a refresh because it's not in `PersistedGameState`.

### Fix

1. **Add `leagueId` to `PersistedGameState`** in `src/utils/gameStorage.ts`:
   ```typescript
   leagueId?: string;
   ```

2. **Save `leagueId` in the auto-save payload** in `useGameState.ts` (~line 4465 area):
   ```typescript
   leagueId: leagueIdRef.current,
   ```

3. **Restore `leagueId` on load** in `useGameState.ts` restore path (~line 3310 area):
   ```typescript
   if (savedSnapshot.leagueId) {
     leagueIdRef.current = savedSnapshot.leagueId;
   }
   ```

4. **Verify the archive call** passes `leagueId` — this was already fixed in Round 6 via `leagueId: options?.leagueId ?? leagueIdRef.current` but will now work correctly because `leagueIdRef.current` is restored from the snapshot.

5. **Verify `competitionId` and `leagueId` alignment**: For exhibition games, `competitionId` should equal the leagueId. Verify in `initializeGame` and in `ExhibitionGame.tsx` navigation state that both are set consistently.

### Files to modify
- `src/utils/gameStorage.ts` (PersistedGameState interface — add leagueId)
- `src/src_figma/hooks/useGameState.ts` (save payload + restore path)

### Test
Write a test that:
1. Initializes a game with `leagueId: "test-league-xyz"`
2. Triggers an auto-save
3. Reads back the persisted state
4. Verifies `leagueId: "test-league-xyz"` is in the snapshot
5. Simulates a restore and verifies `leagueIdRef.current` is set

---

## Verification Checklist

### Build/Test Requirements
- `npm run build` must exit 0
- `npm test` — 14 pre-existing failures in FieldingModal/AtBatFlow/exitFlow are known. Do not introduce new failures.
- New tests in `src/src_figma/__tests__/gameTracker/r3-round7.test.tsx`
- Add `[R3-R7]` prefixed console.log for all fix paths

### Priority Order
1. Bug 1 (undo score — CRITICAL, every undo is broken)
2. Bug 2 (pitcher bench — blocks all mid-game pitcher changes)
3. Bug 3 (almanac leagueId — data completeness)
