# CODEX BUG FIX: Infinite Render Loop — syncDisplayedRostersToLineupSnapshot
# ROUTE: Codex 5.4 | high (or Claude Code CLI | sonnet for speed)
# Branch: fix/r5-infinite-loop
# THIS IS A HOTFIX — run immediately before any other work

---

## THE BUG

Browser console shows 409 errors: "Maximum update depth exceeded" at GameTracker.tsx:1167. The app is stuck in an infinite render loop.

## ROOT CAUSE (VERIFIED — line numbers confirmed)

`syncDisplayedRostersToLineupSnapshot` at line ~1153 is a `useCallback` with `awayTeamPlayers` and `homeTeamPlayers` in its dependency array. It calls `setAwayTeamPlayers` and `setHomeTeamPlayers` (among others), which changes those state values, which changes the callback reference, which re-triggers the effect at line ~1169 that calls it. Infinite loop.

The dependency cycle:
```
useEffect (line 1169) depends on syncDisplayedRostersToLineupSnapshot
  → syncDisplayedRostersToLineupSnapshot calls setAwayTeamPlayers / setHomeTeamPlayers
    → awayTeamPlayers / homeTeamPlayers change
      → syncDisplayedRostersToLineupSnapshot useCallback recreates (they're in its deps)
        → effect re-fires
          → INFINITE LOOP
```

## THE FIX

The `useCallback` at line ~1153 includes `awayTeamPlayers` and `homeTeamPlayers` in its dependency array because it passes them to `reconcileTeamPitchersWithLineupSnapshot`. But this is wrong — the pitcher reconciliation should use the CURRENT state via refs or via the state setter's callback form, not capture stale values from the closure.

### Option A (preferred — minimal change):
Move `awayTeamPlayers` and `homeTeamPlayers` into refs that are kept in sync, and read from the refs inside the callback:

```typescript
const awayTeamPlayersRef = useRef(awayTeamPlayers);
awayTeamPlayersRef.current = awayTeamPlayers;
const homeTeamPlayersRef = useRef(homeTeamPlayers);
homeTeamPlayersRef.current = homeTeamPlayers;

const syncDisplayedRostersToLineupSnapshot = useCallback((snapshot?: GameLineupSnapshot) => {
    const lineupSnapshot = snapshot || getLineupStateSnapshot();
    setAwayTeamPlayers((previous) =>
      reconcileTeamPlayersWithLineupSnapshot(previous, lineupSnapshot.away, 'away', getRosterEntityId)
    );
    setHomeTeamPlayers((previous) =>
      reconcileTeamPlayersWithLineupSnapshot(previous, lineupSnapshot.home, 'home', getRosterEntityId)
    );
    setAwayTeamPitchers((previous) =>
      reconcileTeamPitchersWithLineupSnapshot(previous, awayTeamPlayersRef.current, lineupSnapshot.away, 'away', getRosterEntityId)
    );
    setHomeTeamPitchers((previous) =>
      reconcileTeamPitchersWithLineupSnapshot(previous, homeTeamPlayersRef.current, lineupSnapshot.home, 'home', getRosterEntityId)
    );
  }, [getLineupStateSnapshot, getRosterEntityId]);
  // ^^^ REMOVED awayTeamPlayers and homeTeamPlayers from deps — read from refs instead
```

### Option B (alternative):
Add referential equality checks inside the state setters so they return the SAME reference if nothing changed:

```typescript
setAwayTeamPlayers((previous) => {
  const next = reconcileTeamPlayersWithLineupSnapshot(previous, lineupSnapshot.away, 'away', getRosterEntityId);
  // Return previous reference if content is identical (prevents unnecessary re-render)
  return JSON.stringify(next) === JSON.stringify(previous) ? previous : next;
});
```

Option A is cleaner. Use Option A.

## FILES TO MODIFY
```
src/src_figma/app/pages/GameTracker.tsx — lines ~1153-1167 (the useCallback and its deps)
```

## VERIFY
```bash
npm run build
```
Browser: Load GameTracker → console should show 0 "Maximum update depth" errors. Game should be playable.

## DO NOT
- Remove the effect at line ~1169 entirely (it's needed for roster sync after pitcher changes)
- Change the reconciliation functions in gameTrackerRosterSync.ts
- Modify useGameState.ts
