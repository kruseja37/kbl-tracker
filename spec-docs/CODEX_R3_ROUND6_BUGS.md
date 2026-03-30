# Codex Task: R3 Round 6 — Exhibition Bug Fixes

## Context

KBL Tracker is a React/TypeScript game tracker for Super Mega Baseball 4. Key files:
- `src/src_figma/app/pages/GameTracker.tsx` (~12,000+ lines) — main UI
- `src/src_figma/hooks/useGameState.ts` (~9,600+ lines) — state hook
- `src/src_figma/app/utils/gameTrackerRosterSync.ts` — lineup reconciliation
- `src/utils/gameStorage.ts` — IndexedDB persistence
- `src/utils/almanacQueries.ts` — exhibition stats aggregation

Fix all bugs below, write tests for each, and verify build + test suite pass.

---

## Bug 1: Pre-Game Pitcher Sub Creates Duplicate 9th Hitter (CRITICAL)

### What happens
User subs out starting pitcher (Kaiser) for bench pitcher (Acesson) in PRE_GAME. Both pitchers show as 9th slot in batting lineup after half-inning flip. Original pitcher keeps the red "active pitcher" box. Matchup window shows original pitcher name.

### Root cause

Two problems in `src/src_figma/app/utils/gameTrackerRosterSync.ts`:

**Problem A — Early injection + late injection = duplicate:**
The `reconcileTeamPlayersWithLineupSnapshot` function has TWO pitcher injection points:
1. **Early injection** (~line 77-93): Maps existing players and replaces the first `position === 'P'` match with the current pitcher
2. **Late injection** (~lines 131-142): Adds any lineup entries not already present in the player array
3. If the new pitcher (Acesson) is added by the late injection AND the old pitcher (Kaiser) was already converted by the early injection, you get TWO entries

**Problem B — Filter is too broad:**
At ~line 198:
```typescript
player.position === 'P' ||
```
This filters ALL players with position P, then adds back only the current pitcher. But if both old and new pitcher entries exist, it can incorrectly collapse them.

### Fix

In `gameTrackerRosterSync.ts`, the `reconcileTeamPlayersWithLineupSnapshot` function needs to:
1. **Not double-inject**: If the early injection already converted an existing entry to the current pitcher, the late injection should skip adding them again. Add a dedup check: after early injection, track which playerIds are already in the array, and skip them in the late injection.
2. **Remove the old pitcher explicitly**: After replacing the pitcher in-place, verify no other entry in the array has the old pitcher's ID. If found, remove it.
3. **Use playerId matching, not position matching**: Replace `player.position === 'P'` with `playerId === oldPitcherId` checks where possible.

Also in `useGameState.ts` `applyPregamePitchingChange`:
4. After updating the lineup refs, verify the lineup array has exactly 9 entries (not 10+). Add a guard: `if (pitchingLineupRef.current.length > 9) console.error(...)`.

### Also fix: Pitcher change during LIVE game only shows position players

After `handlePitcherSubstitution` at GameTracker.tsx ~line 6196 sets pitcher `isActive` flags, `reconcileTeamPitchersWithLineupSnapshot` (~called from `syncDisplayedRostersToLineupSnapshot`) OVERWRITES those flags at ~line 248:
```typescript
isActive: currentPitcherId === pitcherId,
```

This unconditional reset erases the `isActive: false` state for bench pitchers. Fix: `reconcileTeamPitchersWithLineupSnapshot` should preserve the previous `isActive` state for non-current pitchers instead of resetting to `false`. Change to:
```typescript
const prevPitcher = previous.find(p => getRosterEntityId(p, team) === pitcherId);
isActive: currentPitcherId === pitcherId || (prevPitcher?.isActive ?? false),
```

Or more precisely: a pitcher is `isActive: true` ONLY if they are the current pitcher. All others are `isActive: false` but `isOutOfGame` should only be true if they were explicitly removed, not just because they're not the current pitcher. The bench list filter is `!p.isActive` — this should include bench pitchers who haven't pitched yet.

### Files to modify
- `src/src_figma/app/utils/gameTrackerRosterSync.ts` (reconcileTeamPlayersWithLineupSnapshot, reconcileTeamPitchersWithLineupSnapshot)
- `src/src_figma/hooks/useGameState.ts` (applyPregamePitchingChange — add lineup length guard)
- `src/src_figma/app/pages/GameTracker.tsx` (handlePitcherSubstitution — verify isActive logic)

### Test
Write a test that:
1. Sets up a 9-player lineup with pitcher at slot 9
2. Applies a pre-game pitcher change (new pitcher replaces old)
3. Calls reconcileTeamPlayersWithLineupSnapshot
4. Verifies the result has exactly 9 entries
5. Verifies only ONE entry has position "P"
6. Verifies the pitcher entry has the NEW pitcher's name/ID

---

## Bug 2: Pitcher Change Post-Refresh Creates Duplicate in Lineup

### What happens
User changes pitcher during LIVE game → hard refresh → lineup shows both old and new pitcher.

### Root cause
Same as Bug 1 — the reconciliation function double-injects. On restore after refresh:
1. The persisted lineup has the new pitcher
2. The initial player arrays (from navigationState or defaults) have the old pitcher
3. Reconciliation tries to merge both, creating a duplicate

### Fix
Same fix as Bug 1 — proper dedup in reconciliation. Additionally:
- On restore, the player arrays should be rebuilt entirely from the persisted lineup snapshot, NOT from navigationState (which is null on refresh). Verify that `syncDisplayedRostersToLineupSnapshot` is called with the restored snapshot and completely replaces (not merges with) the initial player arrays.

---

## Bug 3: Stadium Reverts to Apple Field After Refresh

### What happens
Stadium was set to a team's home field but reverts to "Apple Field" after refresh. Not every time, but intermittently.

### Root cause
Race condition in `GameTracker.tsx`:

1. `selectedStadium` initialized at line ~567: `navigationState?.stadiumName || parkNames[0]`
2. `parkNames[0]` = "Apple Field" (alphabetically first park)
3. On refresh, `navigationState` is null → `selectedStadium` = "Apple Field"
4. A separate effect at ~line 901 syncs: `setStadiumName(selectedStadium)` → writes "Apple Field" to gameState
5. LATER, `loadExistingGame` restores `gameState.stadiumName` to the correct value
6. The sync effect at ~line 794 sees the change and updates `selectedStadium`
7. But the damage may already be done — the auto-save may have captured "Apple Field"

### Fix

1. **Don't default to `parkNames[0]`**: Initialize `selectedStadium` to `null` (not a specific park):
   ```typescript
   const [selectedStadium, setSelectedStadium] = useState<string | null>(
     () => navigationState?.stadiumName || null,
   );
   ```

2. **Gate the reverse sync effect**: The effect at ~line 901 that writes `selectedStadium` to gameState should NOT write null:
   ```typescript
   useEffect(() => {
     if (selectedStadium) {
       setStadiumName(selectedStadium);
     }
   }, [selectedStadium, setStadiumName]);
   ```

3. **Display fallback**: If `selectedStadium` is null, the ScoreBug/display should show `gameState.stadiumName` directly rather than blank.

### Files to modify
- `src/src_figma/app/pages/GameTracker.tsx` (selectedStadium initialization, sync effects)

---

## Bug 4: Score Validation After Play Log Edits (CRITICAL)

### What happens
When user edits runner outcomes in the play log after an inning ends, the wrong team can be awarded a run. There's no validation that the score matches the play log.

### Root cause
In `GameTracker.tsx` ~line 7587, `applyScoreAdjustment()` is called on any runner outcome change without validating:
- Whether the team credit is correct
- Whether the final score matches the sum of all events

### Fix

**Add a score reconciliation check after any enrichment that affects runs:**

1. Create a utility function `reconcileScoreFromEvents(gameId)` that:
   - Walks all AtBatEvents for the game
   - Sums `runsScored` by halfInning (TOP = away runs, BOTTOM = home runs)
   - Returns `{ away: number, home: number }`

2. After any `applyScoreAdjustment` call in the enrichment handler (~line 7587-7591), call the reconciliation:
   ```typescript
   const expected = await reconcileScoreFromEvents(gameState.gameId);
   if (expected.away !== gameState.awayScore || expected.home !== gameState.homeScore) {
     // Show confirmation prompt to user:
     // "Score mismatch detected. Event log shows Away: X, Home: Y.
     //  Current score: Away: A, Home: B. Apply correction?"
   }
   ```

3. **Simpler alternative**: Before applying the score delta, verify the halfInning of the event being edited matches the expected team. If the event is from TOP (away batting), the run goes to away. If from BOTTOM, the run goes to home. Add this validation:
   ```typescript
   const creditTeam = existingAtBat.halfInning === "TOP" ? "away" : "home";
   // Verify this matches expected direction
   ```

4. **User confirmation for score-affecting changes**: When an enrichment change would alter the score, show a brief confirmation:
   ```
   "Award 1 run to [Team Name]? (Y/N)"
   ```

### Files to modify
- `src/src_figma/app/pages/GameTracker.tsx` (enrichment save handlers)
- Optionally create `src/utils/scoreReconciliation.ts` for the validation utility

---

## Bug 5: Almanac Player Card Missing Recent Game Stats

### What happens
After completing a game where Beefcake McStevens had 3 RBIs, the almanac player card doesn't show those stats.

### Root cause
The `PlayerInstanceCard.tsx` queries via `getPlayerExhibitionStats(playerId, leagueId)` from `almanacQueries.ts`. This function:
1. Calls `getExhibitionGames()` to get all completed games
2. Filters by leagueId
3. Sums stats from `game.playerStats[playerId]`

The issue is likely that:
- The `leagueId` passed to the query doesn't match the `leagueId` stored in the CompletedGameRecord (from Bug R3-R4's fix)
- OR the `playerId` used in the query doesn't match the key format in `game.playerStats`

### Investigation required

1. In `almanacQueries.ts`, `getExhibitionGames()` (~line 150-180) filters games. Log the games found and their leagueIds.
2. In `PlayerInstanceCard.tsx`, log the `playerId` and `leagueId` being queried.
3. Check if the completed game's `playerStats` keys match the `playerId` format used in the query. The stats may be keyed by `playerId` but the query may use `canonicalId`.
4. Check `getPlayerExhibitionStats` — does it use the raw `playerId` from the instance, or the `canonicalId`? The `CanonicalPlayerInstance.playerIdInInstance` should match the keys in `game.playerStats`.

### Likely fix
Add debug logging to `getPlayerExhibitionStats` to trace:
- Number of exhibition games found
- Whether the playerId appears in any game's playerStats
- The actual RBI value found

If the query is correct but returns 0, the issue is in the archived game data. If the query finds no games, the issue is in the leagueId filtering.

### Files to read/modify
- `src/utils/almanacQueries.ts` (getPlayerExhibitionStats, getExhibitionGames)
- `src/src_figma/app/pages/PlayerInstanceCard.tsx` (data loading)
- `src/utils/gameStorage.ts` (CompletedGameRecord — verify playerStats keys)

---

## Verification Checklist

### Build/Test Requirements
- `npm run build` must exit 0
- `npm test` — 14 pre-existing failures in FieldingModal/AtBatFlow/exitFlow are known. Do not introduce new failures.
- New tests should go in `src/src_figma/__tests__/gameTracker/r3-round6.test.tsx`
- Add `[R3-R6]` prefixed console.log for all fix paths

### Priority Order
1. Bug 1 (duplicate pitchers — CRITICAL, affects every game)
2. Bug 3 (stadium revert — simple race fix)
3. Bug 4 (score validation — CRITICAL for data integrity)
4. Bug 5 (almanac stats — data query fix)
5. Bug 2 (duplicate on refresh — same root cause as Bug 1)
