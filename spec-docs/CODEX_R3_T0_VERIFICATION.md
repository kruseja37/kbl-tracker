# Codex Task: R3-T0 Persistence Verification & Bug Fix

## Context

KBL Tracker is a React/TypeScript game tracker for Super Mega Baseball 4. The GameTracker page (`src/src_figma/app/pages/GameTracker.tsx`, ~12,000 lines) uses `useGameState` hook (`src/src_figma/hooks/useGameState.ts`, ~9,600 lines) for game state management with IndexedDB persistence via `src/utils/gameStorage.ts`.

Recent commits (cef9d7a through 222fc65) attempted to fix page-refresh state loss by persisting additional fields to IndexedDB. These fields were added to `PersistedGameState` in `src/utils/gameStorage.ts` (lines 320-337):

- `extraInningRunner`, `extraInningRunnerDelay` — exhibition extra-inning runner config
- `awayTeamColor`, `awayTeamBorderColor`, `homeTeamColor`, `homeTeamBorderColor` — team colors from League Builder DB
- `playerMojoFitness` — per-player mojo/fitness snapshot
- `gameStartTimestamp` — for elapsed game timer

**Some fixes work (mojo, extra-inning runner). Some do NOT (timer, team colors, pre-game pitcher changes).** Your job is to find and fix every remaining bug, verify the working fixes, and document anything else you find.

---

## Architecture You Must Understand

### Navigation vs Persistence

When a user starts an exhibition game from `ExhibitionGame.tsx`, data is passed to GameTracker via React Router's `location.state` (called `navigationState`). **On page refresh, `navigationState` becomes null** because React Router doesn't persist route state. Anything only in `navigationState` is lost on refresh.

The persistence system works like this:
1. **Save**: `useGameState.ts` auto-saves every 250ms to IndexedDB via `saveCurrentGame()`. The save payload is constructed starting at line ~4415. It reads from React state + refs.
2. **Restore**: On mount, `loadExistingGame()` (async, line ~3249) reads from IndexedDB and populates refs + state.
3. **Display sync**: GameTracker reads from refs via `getLineupStateSnapshot()` and calls `syncDisplayedRostersToLineupSnapshot()` to update the display arrays.

### The Timing Problem

The critical timing issue: GameTracker has effects that run on mount (`[]` deps) and effects that run after `gameInitialized` becomes true. The async `loadExistingGame()` populates refs AFTER mount effects run. Any mount effect reading refs will get stale/empty values. The fix pattern is to use `gameInitialized` as a dependency so the effect re-runs after async load completes.

### Key Variables

- `isFreshNavigation` (line 709 in GameTracker.tsx): `!!(navigationState?.homeTeamId || navigationState?.awayTeamId)` — distinguishes fresh game from refresh. **VERIFY this is correct.** React Router may pass a non-null but empty `location.state` on refresh.
- `hookTeamColorsRef` — ref in useGameState that stores team colors for persistence
- `hookGameStartTimestampRef` — ref in useGameState for game start time
- `restoredColorsRef` — guard ref to prevent double-restore
- `seededNavStateRef` — guard ref to prevent double-seeding

---

## Bug 1: Team Colors Revert to Green Defaults on Refresh

### Status: NOT FIXED despite two attempts

### What should happen
User starts exhibition game → team colors (from League Builder DB) show correctly → page refresh → same team colors restored from IndexedDB → display unchanged.

### What actually happens
Colors revert to green defaults (`#5A8352` from `src/src_figma/config/teamColors.ts` line 69) on refresh.

### Investigation required

1. **Verify the save path**: In `useGameState.ts`, the save payload (line ~4493-4496) writes:
   ```
   awayTeamColor: teamColorsRef.current.awayTeamColor,
   ```
   But `teamColorsRef` is only populated by GameTracker's seed effect (line 718-726). **Check if this ref is populated before the first auto-save fires.** If the first save happens before the seed effect runs, the snapshot will have `undefined` colors.

2. **Verify the restore path**: In `useGameState.ts` restore (line ~3338-3344), colors are written to `teamColorsRef.current`. Then in GameTracker.tsx (line 736-747), an effect reads `hookTeamColorsRef.current` and calls `setPersistedTeamColors()`. **Check**:
   - Does `isFreshNavigation` correctly evaluate to `false` on refresh? Log `navigationState` and `isFreshNavigation` at the top of the effect.
   - Does the effect actually run? Add a `console.log` inside.
   - Is `hookTeamColorsRef.current` populated by the time the effect runs?
   - Does `setPersistedTeamColors` actually trigger a re-render that updates the color variables (lines 597-608)?

3. **Check the color derivation chain**: Lines 597-608 compute colors as:
   ```
   navigationState?.awayTeamColor || persistedTeamColors.awayTeamColor || getTeamColors(awayTeamId).primary
   ```
   On refresh, if `persistedTeamColors` is still `{}` (not yet set), it falls through to `getTeamColors()` which returns green defaults for unknown team IDs. **The fix must ensure `persistedTeamColors` is set BEFORE the first render that uses it.**

### Likely root cause
The restore effect at line 736 depends on `[gameInitialized, isFreshNavigation]`. If `isFreshNavigation` is incorrectly `true` on refresh (because `navigationState` has some residual data), the effect returns early and never sets colors. **OR** the effect runs but `hookTeamColorsRef.current` is still empty because the async restore hasn't completed yet despite `gameInitialized` being true.

### Fix approach
Consider storing team colors directly in `gameState` (which is a React state and triggers re-renders) rather than in a ref that requires a separate sync effect. The stadium name fix works because `gameState.stadiumName` is already in the state object and the stadium effect has `gameState.stadiumName` as a dependency.

---

## Bug 2: Timer Resets to Zero on Refresh

### Status: NOT FIXED despite two attempts

### What should happen
Game starts → timer counts elapsed minutes → page refresh → timer resumes from correct elapsed time (e.g., shows "23 min" not "0 min").

### What actually happens
Timer resets to 0 on refresh.

### Investigation required

1. **Verify `gameStartTimestamp` is saved**: Check IndexedDB directly after a game is running. Open browser devtools → Application → IndexedDB → `kbl-tracker` → `currentGame` store → look for `gameStartTimestamp` field. If it's `undefined` or missing, the save path is broken.

2. **Verify restore**: `useGameState.ts` line ~3347 restores `gameStartTimestampRef.current`. Log this value. Then in GameTracker.tsx line 744-746, the effect reads it and calls `setGameStartTime()`. Same timing issue as colors — does this effect actually execute?

3. **`gameStartTime` state initialization**: Line 611: `useState(() => new Date())` — this initializes to NOW on every mount, including refresh. The restore effect at line 744-746 is supposed to overwrite this, but there's a race: the initial render uses `new Date()` (wrong), then the effect corrects it (right). But the elapsed time calculation at line 624-628 uses `gameStartTime` — does it pick up the corrected value?

### Fix approach
Instead of using a useState for `gameStartTime` that defaults to `new Date()`, initialize it from the ref immediately:
```typescript
const [gameStartTime, setGameStartTime] = useState(() => {
  // On restore, the ref may already be populated by loadExistingGame
  // (if the hook constructor ran before this component mounts)
  return new Date(); // But we can't read the ref here because it's destructured below
});
```
This is a chicken-and-egg problem. The ref is from the hook, but the hook is called after this line. Alternative: move the timer entirely inside useGameState (it already has `gameStartTimestampRef`) and expose `elapsedMinutes` as a return value.

---

## Bug 3: Pre-Game Away Pitcher Change Not Working

### Status: NOT FIXED despite one attempt

### What should happen
In PRE_GAME phase, user taps the away team's pitcher in the batting lineup → PlayerCardModal opens → user taps SUB OUT → bench list shows pitchers → user selects new pitcher → away team's starting pitcher updates in both the display and internal state.

### What actually happens
The away pitcher change has no effect. The old pitcher remains.

### Investigation required

1. **`applyPregamePitchingChange` team detection (useGameState.ts line 7870-7880)**:
   ```typescript
   const isInHomePitching = homeLineupStateRef.current.currentPitcher?.playerId === exitingPitcherId || ...
   const isInAwayPitching = awayLineupStateRef.current.currentPitcher?.playerId === exitingPitcherId || ...
   const pitchingTeamSide: TeamSide = isInHomePitching && !isInAwayPitching ? "home" : isInAwayPitching ? "away" : ...
   ```
   **Log all these values.** Is `exitingPitcherId` the correct ID? Is `awayLineupStateRef.current.currentPitcher` populated? The pitcher might be stored differently in the away lineup (by name instead of ID, or vice versa).

2. **ID mismatch**: The `exitingPitcherId` comes from `handlePlayerCardSubOut` → `changePitcher(newPitcherId, exitingPitcherId, ...)`. The IDs come from `getPitcherIdFromName()` which looks up the pitcher roster. **Verify the IDs match between the roster lookup and the lineup state.**

3. **Display sync after pre-game change**: GameTracker.tsx line 2063-2068: The display sync effect now runs for all phases (not just LIVE). But it depends on `gameState.currentPitcherId` in its dep array. For the AWAY pitcher, `gameState.currentPitcherId` reflects the HOME team's current pitcher (because home pitches in T1). **The away pitcher change updates `awayLineupStateRef` but does NOT change `gameState.currentPitcherId`** — so the display sync effect doesn't re-trigger. The sync effect needs a different trigger for pre-game changes.

4. **`handlePitcherSubstitution` at line 6054**: This calls `changePitcher()` which goes to `applyPregamePitchingChange`. But then it also updates the display pitcher list (lines 6073-6096). Check that this display update is using the correct team (`teamType`). The `teamType` comes from `resolveRosterTeamSide()` at line 6129 — verify this resolves to "away" for the away pitcher.

5. **Bench list contents**: When user clicks SUB OUT on the away pitcher, the bench list is built at lines 8580-8610. **Verify that `awayTeamPitchers` contains inactive pitchers.** If all pitchers are marked `isActive: true`, the bench list would only show position players.

### Fix approach
The `applyPregamePitchingChange` function modifies refs (lineupRef, lineupStateRef) but doesn't trigger a React re-render that would cause the display to update. After modifying refs, it needs to either:
- Update a React state that's in the display sync effect's dependency array, OR
- Call the display sync function directly after the ref update

Consider adding a `lineupVersion` counter state that increments after any pre-game change, and include it in the display sync effect's deps.

---

## Bug 4: Home Pitcher Not Showing Correctly in Batting Slot

### Status: PARTIALLY INVESTIGATED

When the home team pitcher comes up to bat (in non-DH games), the old pitcher name shows instead of the new pitcher after a pre-game change.

### Investigation required

1. The batting order reads from `homeLineupRef.current` in `advanceToNextBatter` (line ~4562). The pre-game change updates this ref at line 7921. **Verify the ref is updated at the correct index.**

2. The display name comes from the `homeTeamPlayers` state array. This is updated by `syncDisplayedRostersToLineupSnapshot`. **Verify the sync runs after the pre-game change.**

3. Check `reconcileTeamPlayersWithLineupSnapshot` — does it handle pitcher position players correctly?

---

## Verification Checklist

For EACH fix, provide:

1. **Console log evidence** showing the fix works
2. **File:line citations** for every change
3. **The specific React render cycle** that makes the fix work (what triggers the re-render?)

### Test Scenarios

Run these scenarios and verify each one:

**Scenario A: Fresh exhibition game**
1. Start exhibition game from ExhibitionGame page with two teams that have custom colors
2. Verify team colors show correctly in GameTracker
3. Verify stadium name shows correctly
4. Hard refresh (Cmd+R)
5. Verify team colors, stadium, score, lineups, mojo all survive

**Scenario B: Pre-game pitcher changes**
1. Start exhibition game, stay in PRE_GAME
2. Change HOME team pitcher → verify it shows in defensive lineup AND batting order
3. Change AWAY team pitcher → verify it shows in batting lineup
4. Press START GAME → verify both changes persisted into LIVE phase
5. When the pitcher's batting slot comes up, verify correct name shows

**Scenario C: Timer persistence**
1. Start game, wait 2 minutes
2. Verify timer shows ~2 min
3. Hard refresh
4. Verify timer still shows ~2 min (not 0)

**Scenario D: Mojo/fitness persistence**
1. Start game
2. Change a player's mojo to LOCKED_IN
3. Hard refresh
4. Open that player's card → verify mojo still shows LOCKED_IN

---

## Files to Read

Read these files IN FULL before making any changes:

1. `src/utils/gameStorage.ts` — PersistedGameState interface (the contract)
2. `src/src_figma/hooks/useGameState.ts` — Focus on:
   - Lines 1920-1940: Ref declarations for persistence
   - Lines 3249-3660: `loadExistingGame` restore path
   - Lines 4415-4510: Auto-save payload construction
   - Lines 7861-7970: `applyPregamePitchingChange`
3. `src/src_figma/app/pages/GameTracker.tsx` — Focus on:
   - Lines 594-612: Team colors and timer state
   - Lines 688-750: Persistence ref wiring and restore effects
   - Lines 2059-2068: Display roster sync effect
   - Lines 6054-6120: `handlePitcherSubstitution`
   - Lines 8577-8610: Bench list construction for PlayerCardModal

## Constraints

- Build must pass: `npm run build` exit 0
- Do not break existing tests: `npm test` — 14 pre-existing failures in FieldingModal/AtBatFlow/exitFlow tests are known and acceptable. Do not introduce new failures.
- Do not modify the PersistedGameState interface unless absolutely necessary (it's already correct)
- Follow existing code patterns — use refs for persistence, states for display
- Every fix must include a console.log that proves the fix path executes (prefix with `[R3-T0]`)
