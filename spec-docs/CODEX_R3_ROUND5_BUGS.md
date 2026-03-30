# Codex Task: R3 Round 5 — Six Remaining Exhibition Bugs

## Context

KBL Tracker is a React/TypeScript game tracker for Super Mega Baseball 4. Key files:
- `src/src_figma/app/pages/GameTracker.tsx` (~12,000 lines) — main UI
- `src/src_figma/hooks/useGameState.ts` (~9,600 lines) — state hook
- `src/utils/gameStorage.ts` — IndexedDB persistence
- `src/utils/eventLog.ts` — event log types and storage

Fix all six bugs, write tests where feasible, verify build + test suite pass.

---

## Bug R3-09: Post-Game Summary Shows Zeroes for Unplayed Innings

### What should happen
A 7-inning exhibition game's post-game linescore should show 7 columns, not 9. Innings 8 and 9 should not appear.

### What actually happens
The linescore shows 9 columns. Innings 8 and 9 display as "0" or "-".

### Root cause

1. `createEmptyScoreboardState()` in `useGameState.ts` (~line 1843) always creates `Array(9)`. It should use `totalInnings`.
2. The scoreboard is created at line ~2994 in `initializeGame()` BEFORE `totalInningsRef.current` is set at line ~3007. Fix the ordering.
3. `CompletedGameRecord` in `src/utils/gameStorage.ts` (~line 437) has no `totalInnings` field, so the archive loses the innings count.
4. `PostGameSummary.tsx` uses `inningScores.length` to determine columns — this is correct IF the scoreboard only has the right number of entries.

### Fix

1. Make `createEmptyScoreboardState()` accept an optional `innings` parameter (default 9):
   ```typescript
   function createEmptyScoreboardState(innings = 9): ScoreboardState {
     return { innings: Array(innings).fill(null).map(() => ({ away: undefined, home: undefined })), ... };
   }
   ```

2. In `initializeGame()`, set `totalInningsRef.current` BEFORE creating the scoreboard:
   ```typescript
   totalInningsRef.current = config.totalInnings || 9;
   setScoreboard(createEmptyScoreboardState(totalInningsRef.current));
   ```

3. Add `totalInnings?: number` to `CompletedGameRecord` interface in `gameStorage.ts`.

4. Pass `totalInnings` when archiving in the `endGame` function — add it to the archive context or directly to the record.

5. In `PostGameSummary.tsx`, read `totalInnings` from the game record and use it to cap the linescore columns. If not available, fall back to `inningScores.length`.

### Files to modify
- `src/src_figma/hooks/useGameState.ts` (createEmptyScoreboardState, initializeGame ordering)
- `src/utils/gameStorage.ts` (CompletedGameRecord interface, archiveCompletedGame)
- `src/src_figma/app/pages/PostGameSummary.tsx` (linescore rendering)

---

## Bug R3-10: POGs in Game Archive Don't Match Post-Game Summary

### What should happen
The Player of the Game (POG) shown in the post-game summary should match what's displayed in the Game Archive (GameDetail page).

### What actually happens
They diverge because POGs are calculated independently at two different times from potentially different data snapshots.

### Root cause

1. `PostGameSummary.tsx` (~line 457-475) calculates POGs dynamically from WPA data every time it renders.
2. `CompletedGameRecord` has an optional `playersOfTheGame` field (~line 505 in gameStorage.ts) but it's NEVER populated during archival.
3. `GameDetail.tsx` (~line 325-352) tries to read `playersOfTheGame` from the record, falls back to recalculating from events — which may produce different results.

### Fix

1. In the `endGame` function in `useGameState.ts`, after computing the final game state, calculate POGs using the same WPA logic that PostGameSummary uses.
2. Pass the POG data to `archiveCompletedGame()` so it's stored in the `CompletedGameRecord`.
3. In `GameDetail.tsx`, read POGs from the archived record instead of recalculating.

**Implementation approach:**
- Extract the POG calculation from PostGameSummary into a shared utility (e.g., `src/utils/pogCalculator.ts` or inline in the archive flow).
- The POG calculation needs: event log data (AtBatEvents) for WPA computation. At endGame time, the event log is still available.
- Add to the archive context: `playersOfTheGame: { away: { playerId, playerName, wpa }, home: { playerId, playerName, wpa } }`

**If extracting the WPA calculation is complex**, a simpler approach: compute POGs from batting stats (highest OPS or most RBI+R) rather than WPA. This would be deterministic and not require event log access. Check what PostGameSummary actually uses and match it.

### Files to modify
- `src/src_figma/hooks/useGameState.ts` (endGame — compute and pass POGs)
- `src/utils/gameStorage.ts` (ensure playersOfTheGame is populated in archive)
- `src/src_figma/app/pages/GameDetail.tsx` (prefer archived POGs)

---

## Bug R3-11: Pickoff Error — Right Player Not Charged

### What should happen
When a pickoff attempt results in an error (PICK_E), the system should record which player committed the error (pitcher wild throw, fielder missed tag, etc.).

### What actually happens
The error is recorded as a between-play event but there's no mechanism to specify who committed the error. The `runnerAttribution` object has `pitcherId`, `catcherId`, and `fielderId` fields, but no `errorChargedTo` discriminator.

### Root cause

In `useGameState.ts` (~line 6775-6809), the pickoff error handling:
- Sets outcome to `"safe"` for PICK_E (line ~6788)
- Captures `runnerAttribution` with pitcher/catcher/fielder IDs (lines ~6791-6808)
- But doesn't specify which of those players committed the error

### Fix

1. Add an `errorChargedTo` field to the `BetweenPlayEvent` type in `src/utils/eventLog.ts`:
   ```typescript
   errorChargedTo?: 'pitcher' | 'catcher' | 'fielder';
   ```

2. In the pickoff error recording in `useGameState.ts`, default `errorChargedTo` to `'pitcher'` (most common pickoff error source). The user can correct this via enrichment if needed.

3. When computing `fieldingErrors` in player stats, check `errorChargedTo` to attribute the error to the correct player.

4. **Optional enhancement**: In GameTracker.tsx, after a PICK_E event, show a quick prompt asking who committed the error. But this is lower priority — defaulting to pitcher is acceptable for now.

### Files to modify
- `src/utils/eventLog.ts` (BetweenPlayEvent interface — add errorChargedTo)
- `src/src_figma/hooks/useGameState.ts` (pickoff error recording — set default errorChargedTo)

---

## Bug R3-12: Between-Play Event Credits Stale After Substitutions

### What should happen
After a catcher or pitcher substitution, between-play events (pickoffs, wild pitches, passed balls, stolen bases) should credit the NEW player, not the old one.

### What actually happens
`gameState.currentPitcherId` is not always updated after pitcher substitutions via `makeSubstitution`. Between-play events then use the stale ID.

### Root cause

In `useGameState.ts` (~line 7625-7630), when a substitution replaces a pitcher:
- The `LineupState.currentPitcher` ref is updated
- But `gameState.currentPitcherId` / `gameState.currentPitcherName` are NOT updated via `setGameState`

The `changePitcher` function (~line 7962) DOES update gameState, but `makeSubstitution` (~line 7460) handles pitcher replacements differently and misses the gameState update.

### Fix

In `makeSubstitution` in `useGameState.ts`, after detecting that the outgoing player was at position "P", add:
```typescript
if (resolvedNewPosition === "P" || outgoingPlayer.position === "P") {
  setGameState((prev) => ({
    ...prev,
    currentPitcherId: benchPlayerId,
    currentPitcherName: benchPlayerName || benchPlayerId,
  }));
}
```

Similarly, verify that catcher substitutions update `currentCatcherId`:
```typescript
if (resolvedNewPosition === "C" || outgoingPlayer.position === "C") {
  setGameState((prev) => ({
    ...prev,
    currentCatcherId: benchPlayerId,
    currentCatcherName: benchPlayerName || benchPlayerId,
  }));
}
```

Search for ALL paths in `makeSubstitution` where a player at position P or C is replaced and ensure gameState is updated.

### Files to modify
- `src/src_figma/hooks/useGameState.ts` (makeSubstitution — add gameState updates for P and C positions)

---

## Bug R3-18: Substitutions Don't Show in Play Log

### What should happen
When a substitution is made, it should appear as an entry in the play-by-play log (e.g., "Lars Stadkleef for Dirk Sportswood").

### What actually happens
The substitution is recorded in the `substitutionLog` and persisted as a `BetweenPlayEvent` with type `"substitution"`, but the play log display doesn't update to show it.

### Root cause

In `useGameState.ts` (~line 7532-7556), after a substitution is persisted via `persistBetweenPlayEvent`, there is no call to refresh the play log. The play log rebuilds from the event log, but only when triggered by specific dependencies (like `atBatSequence` changing).

The infrastructure works — `buildPlayLogEntries` in `src/src_figma/app/utils/gameTrackerPlayLog.ts` (~line 459-479) correctly handles between-play events including substitutions. The mapping function at line ~366-376 creates a valid `PlayLogEntry` with type `"substitution"` and result `"SUB"`.

### Fix

After the `persistBetweenPlayEvent` call for substitutions in `makeSubstitution`, trigger a play log refresh. In `useGameState.ts`, the hook doesn't have direct access to `queuePlayLogRefresh`, but it can increment a counter or flag that GameTracker watches.

**Option A (preferred)**: In GameTracker.tsx, add `substitutionLog.length` to the play log rebuild effect's dependency array. Since `substitutionLog` is a state that changes on every sub, this would trigger a rebuild:

Find the effect at ~line 1560-1565:
```typescript
useEffect(() => {
  if (!gameInitialized || !gameState.gameId) return;
  void rebuildPlayLogFromEventLogRef.current();
}, [atBatSequence, gameInitialized, gameState.gameId]);
```

Add `substitutionLog` length or a substitution counter to deps. But `substitutionLog` comes from useGameState — check if it's exposed. If not, use `gameState.currentPitcherId` or `gameState.currentCatcherId` changes as proxy triggers (they change on subs).

**Option B**: After `persistBetweenPlayEvent` resolves in `makeSubstitution`, call `queuePlayLogRefreshRef.current?.(80)` if the ref is accessible. But this ref lives in GameTracker, not useGameState.

**Option C**: Expose `substitutionLog` from useGameState (it may already be exposed). Add its length to the play log rebuild effect deps in GameTracker.tsx.

### Files to modify
- `src/src_figma/app/pages/GameTracker.tsx` (play log rebuild effect — add sub trigger)
- Possibly `src/src_figma/hooks/useGameState.ts` (expose substitutionLog if not already)

---

## Bug R3-21: Shay Dee Player Data Wrong (Junk=5 not 51, Missing CB)

### What should happen
Shay Dee (SMB4 Sirloins, Relief Pitcher) should have:
- Junk rating: 51
- Accuracy rating: 95
- Arsenal: 4F, CF, CB, CH (includes Curveball)

### What actually happens
Junk shows as 5 (or 0), arsenal is missing CB.

### Root cause

Data entry error in `/Users/johnkruse/Projects/kbl-tracker/spec-docs/data/smb4_players.csv`. Line 412 (Player ID 411) has zeroed-out pitcher stats:
```
411,Shay Dee,31,29,17,L,L,Crafty,,A,0.7,32,94,84,51,95,0,0,0,,Falls Behind,...
```

The correct data exists in `smb4_players_fixed.csv`, `players_final.csv`, and `players_for_import.csv` (Player ID 393):
```
393,Shay Dee,31,RP,,L,L,Crafty,,A,0.7,29,17,32,94,0,84,51,95,"4F, CF, CB, CH",...
```

### Fix

1. Find the data source that the app actually imports from. Search for which CSV file is used by the League Builder import:
   - Check `src/utils/leagueBuilderStorage.ts` or any import script for which file it reads
   - Check if there's an import button in the UI that references a specific file

2. If `smb4_players.csv` is the active import source, fix line 412 to match the correct data from `smb4_players_fixed.csv`.

3. If the data is already imported into IndexedDB and the CSV is just reference, the fix is in the League Builder UI where users would need to re-import. In that case, update the CSV AND check if there's a migration/seed script.

4. **Alternatively**, if player data is stored in IndexedDB after initial import, the user may need to re-import the team. Document this if so.

### Files to check/modify
- `spec-docs/data/smb4_players.csv` (fix Shay Dee's row)
- Any import script that reads this CSV
- Verify `smb4_players_fixed.csv` has correct data (it does per investigation)

---

## Verification Checklist

For EACH fix:
1. Add `[R3-R5]` prefixed console.log proving the fix path executes
2. Provide file:line citations for every change

### Build/Test Requirements
- `npm run build` must exit 0
- `npm test` — 14 pre-existing failures in FieldingModal/AtBatFlow/exitFlow are known. Do not introduce new failures.
- New tests should go in `src/src_figma/__tests__/gameTracker/r3-round5.test.tsx`

### Priority Order
Fix in this order (highest impact first):
1. R3-18 (subs in play log — simple trigger fix)
2. R3-12 (stale credits — gameState update after sub)
3. R3-09 (linescore innings — scoreboard init + archive)
4. R3-11 (pickoff error — add field + default)
5. R3-10 (POG mismatch — archive POGs)
6. R3-21 (Shay Dee data — CSV fix)
