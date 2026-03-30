# Codex Task: R3 Round 4 — Three Exhibition Game Bugs

## Context

KBL Tracker is a React/TypeScript game tracker for Super Mega Baseball 4. The GameTracker is at `src/src_figma/app/pages/GameTracker.tsx` (~12,000 lines), state hook at `src/src_figma/hooks/useGameState.ts` (~9,600 lines), persistence at `src/utils/gameStorage.ts`.

Three bugs were found during live exhibition game testing. Fix all three, write unit tests for each, and verify build + test suite pass.

---

## Bug 1: Ghost Runner on 2B Has No Superscript in Batting Lineup

### What should happen
When a ghost runner is placed on 2nd base for extra innings, the batting lineup column should show a gold "²" superscript next to the player who is the ghost runner (the last batter from the prior inning batting for the same team).

### What actually happens
The ghost runner is placed (runner tracker has them on 2B, game state shows bases.second = true) but NO superscript appears next to any player in the batting lineup.

### Root cause analysis

The BattingLineupColumn (`src/src_figma/app/components/BattingLineupColumn.tsx`) renders the superscript by matching `player.name` against `runnerBaseMap` entries. The map is built from `runners.second.name`.

The ghost runner is placed in `useGameState.ts:placeGhostRunner()` (~line 4606) which:
1. Adds runner to `runnerTrackerRef.current` via `trackerAddRunner()`
2. Sets `gameState.bases.second = true`
3. Increments `runnerIdentityVersion`

Then `GameTracker.tsx` syncs runner names via effect at ~line 1238 watching `runnerIdentityVersion`:
```typescript
const names = getBaseRunnerNames();
setRunnerNames(names); // { second: "Player Name" }
```

Then passes to BattingLineupColumn at ~line 8334:
```typescript
runners={{
  second: runnerNames.second ? { name: runnerNames.second } : undefined,
}}
```

BattingLineupColumn builds:
```typescript
if (runners.second?.name) runnerBaseMap.set(runners.second.name, 2);
// Then in render loop:
const onBase = runnerBaseMap.get(player.name);
```

### Investigation and fix

The name matching may fail if:
1. `getBaseRunnerNames()` returns the runner's full name but `player.name` in the batting lineup uses a different format (e.g., "J. Smith" vs "John Smith")
2. The ghost runner was placed using a `playerId` that doesn't correspond to any player in the `players` array passed to BattingLineupColumn
3. The `runnerNames` state is stale or not updated after `placeGhostRunner` completes

**Steps:**
1. Add `console.log('[R3-R4] Ghost runner placed:', { runnerId, runnerName })` inside `placeGhostRunner()` in useGameState.ts
2. Add `console.log('[R3-R4] Runner names synced:', runnerNames)` inside the runner name sync effect in GameTracker.tsx
3. Add `console.log('[R3-R4] BattingLineupColumn runner map:', Object.fromEntries(runnerBaseMap))` in BattingLineupColumn.tsx
4. Add `console.log('[R3-R4] BattingLineupColumn players:', players.map(p => p.name))` to see if the ghost runner name appears in the player list
5. **Check the name format** — the ghost runner's `runnerName` in the tracker must EXACTLY match the `player.name` in the batting lineup array. If they don't match, fix the format at the point of placement.

**Likely fix:** The `placeGhostRunner()` function receives a `playerId` and looks up the name from the lineup ref. The name stored in the tracker must match the display name format used by BattingLineupColumn. Verify this by reading the `trackerAddRunner()` call and comparing the name format with what `syncDisplayedRostersToLineupSnapshot()` puts into the `players` array.

**If the name matching is correct**, the issue may be that `runnerIdentityVersion` change doesn't trigger the runner names effect before BattingLineupColumn renders. Check that `runnerNames` is in the render dependency chain for BattingLineupColumn.

### Files to read
- `src/src_figma/hooks/useGameState.ts` lines 4606-4652 (placeGhostRunner)
- `src/src_figma/hooks/useGameState.ts` lines 9440-9453 (getBaseRunnerNames)
- `src/src_figma/app/pages/GameTracker.tsx` lines 1228-1260 (runner names sync effect)
- `src/src_figma/app/pages/GameTracker.tsx` lines 8330-8350 (BattingLineupColumn runners prop)
- `src/src_figma/app/components/BattingLineupColumn.tsx` lines 45-104 (superscript rendering)
- `src/src_figma/app/pages/GameTracker.tsx` lines 774-830 (extra-inning runner placement effect)

---

## Bug 2: Cross-Team Runner Corruption After Editing Prior Half-Inning Plays

### What should happen
When a half-inning ends and the user corrects runner outcomes from the just-completed half-inning (e.g., changing which runner was out on a double play), the correction should only affect the statistical record. It should NEVER place runners from the fielding team onto bases in the current half-inning.

### What actually happens
After correcting a runner outcome from the prior half-inning (e.g., changing the runner who was out from the 3B→HOME runner to the 1B→2B runner), the runner tracker places the "corrected" runner on 2nd base. But this runner is from the team that is NOW FIELDING. If that runner subsequently "scores," the run is credited to the wrong team.

### Root cause

There is **zero team validation** in the runner correction/reconciliation pipeline. When `applyBasesCorrection()` is called with a `RunnerState` that includes runners from the previous half-inning:

1. `applyBasesCorrection()` at `useGameState.ts:~9015` calls `reconcileRunnerTrackerFromRunnersAfter()`
2. `reconcileRunnerTrackerFromRunnersAfter()` at `src/src_figma/app/utils/liveBaseCorrection.ts:~178` blindly accepts any runner ID and places them on base
3. No check exists to verify that the runner belongs to the current batting team
4. No check exists to verify that the `responsiblePitcherId` belongs to the current fielding team

### The fix

Add team validation at two levels:

**Level 1: Prevent cross-half-inning runner contamination**

In `applyBasesCorrection()` (useGameState.ts ~line 9015), before calling `reconcileRunnerTrackerFromRunnersAfter()`, filter out any runners whose `runnerId` belongs to the fielding team (not the current batting team). Use `teamSideByPlayerIdRef.current` to look up which team each runner belongs to.

```typescript
// Before reconciliation, filter runners to current batting team only
const battingTeamSide = gameState.isTop ? "away" : "home";
if (runnersAfter) {
  const filteredRunners: RunnerState = {};
  for (const [base, runner] of Object.entries(runnersAfter)) {
    if (runner && teamSideByPlayerIdRef.current.get(runner.runnerId) === battingTeamSide) {
      filteredRunners[base] = runner;
    }
  }
  // Use filteredRunners instead of runnersAfter
}
```

**Level 2: Block corrections that would modify current live bases after half-inning transition**

When the user edits a play from the previous half-inning, the correction should update the EVENT LOG entry (for stats/enrichment) but NOT modify the current runner tracker state. The runner tracker should only be modified for corrections within the current half-inning.

Check: does the undo/correction system know whether the play being corrected is from the current half-inning or a previous one? If not, add that check using `gameState.inning` and `gameState.isTop` compared to the event's `inning` and `halfInning`.

### Files to read
- `src/src_figma/hooks/useGameState.ts` lines 9015-9032 (applyBasesCorrection)
- `src/src_figma/app/utils/liveBaseCorrection.ts` lines 178-263 (reconcileRunnerTrackerFromRunnersAfter)
- `src/src_figma/hooks/useGameState.ts` lines 8410-8447 (executeEndInning / half-inning transition)
- `src/src_figma/hooks/useGameState.ts` lines 4237-4268 (undoLastAction)
- `src/src_figma/hooks/useGameState.ts` — search for `teamSideByPlayerIdRef` to understand team lookup

### Test
Write a test that:
1. Simulates a half-inning with runners on base
2. Ends the half-inning (transition to next half)
3. Applies a base correction with a `RunnerState` containing a player from the previous batting team
4. Verifies the runner tracker does NOT contain any runners from the now-fielding team

---

## Bug 3: Exhibition Leaders Shows No Data / Wrong League Scoping

### What should happen
After completing an exhibition game in "Test League" between Hot Corners and Platypi, the Almanac's Exhibition Leaders page should show batting and pitching leaders from that game. The Player Card should show the player's stats from that game.

### What actually happens
Game Archive shows the game data (correct). Exhibition Leaders shows nothing. Player Card shows no recent stats.

### Root cause

The `endGame` function in `useGameState.ts` has TWO code paths that archive the completed game. The first path (~line 9343) calls `archiveCompletedGame()` with a context object that is **missing the `leagueId` field**:

```typescript
await archiveCompletedGame(
  persistedState,
  { away: gameState.awayScore, home: gameState.homeScore },
  inningScores,
  archivedSeasonId,
  {
    statsScopeId: statsScopeIdValue,
    competitionType: options?.competitionType ?? competitionTypeRef.current,
    competitionId: options?.competitionId ?? competitionIdRef.current,
    // ← MISSING: leagueId
  },
);
```

Without `leagueId`, the CompletedGameRecord has no league association. The Exhibition Leaders queries (`getExhibitionBattingLeaders`, `getExhibitionPitchingLeaders` in `src/utils/almanacQueries.ts`) use `getLeagueId()` to group games by league:

```typescript
function getLeagueId(game: CompletedGameRecord): string | null {
  return game.leagueId ?? (game.competitionType === 'exhibition' ? game.competitionId ?? null : null);
}
```

If both `leagueId` and `competitionId` are null/undefined, the game is invisible to the leaders query.

Additionally, `registerAlmanacPlayers()` in `processCompletedGame.ts` (~line 129) is gated on `resolvedLeagueId` being truthy. If leagueId is missing from the archived game, canonical players may not be registered, making them invisible in player search.

### The fix

1. In `useGameState.ts`, find the `archiveCompletedGame()` call in `endGame` (~line 9343-9354). Add `leagueId` to the context object:
   ```typescript
   leagueId: options?.leagueId ?? leagueIdRef.current,
   ```

2. Verify that `leagueIdRef.current` is populated for exhibition games. It's set during `initializeGame()` from the navigation state's `leagueId`. Trace this from `ExhibitionGame.tsx` line 202 → `initializeGame` config → `leagueIdRef.current`.

3. Also check `competitionIdRef.current` — for exhibition mode, this should be the leagueId (set at `GameTracker.tsx` ~line 584).

4. Verify the `processCompletedGame` call (if separate from archiveCompletedGame) also receives the leagueId.

### Files to read
- `src/src_figma/hooks/useGameState.ts` — search for ALL calls to `archiveCompletedGame` and `processCompletedGame`. Verify each one passes leagueId.
- `src/utils/almanacQueries.ts` lines 150-180 (getLeagueId, getExhibitionGames)
- `src/utils/almanacQueries.ts` lines 292-494 (getExhibitionBattingLeaders, getExhibitionPitchingLeaders)
- `src/utils/processCompletedGame.ts` lines 98-134 (processCompletedGame — leagueId resolution)
- `src/utils/gameStorage.ts` — CompletedGameRecord interface, archiveCompletedGame function
- `src/src_figma/app/pages/ExhibitionGame.tsx` lines 198-208 (navigation state passed to game)

### Test
Write a test that:
1. Creates a mock PersistedGameState with exhibition competitionType
2. Calls the end-game archive path
3. Verifies the CompletedGameRecord has a non-null `leagueId`
4. Verifies `getExhibitionBattingLeaders` returns data for that league

---

## Verification Checklist

For EACH fix:
1. Add `[R3-R4]` prefixed console.log proving the fix path executes
2. Provide file:line citations for every change
3. Write at least one unit test per bug

### Build/Test Requirements
- `npm run build` must exit 0
- `npm test` — 14 pre-existing failures in FieldingModal/AtBatFlow/exitFlow are known. Do not introduce new failures.
- New tests should go in `src/src_figma/__tests__/gameTracker/r3-round4.test.tsx`

### Files NOT to modify
- Do not touch `src/utils/gameStorage.ts` PersistedGameState interface (it's correct)
- Do not touch `src/src_figma/app/pages/ExhibitionGame.tsx` (it's correct)
- Leave the `[R3-T0]` debug logs from the prior Codex task in place
