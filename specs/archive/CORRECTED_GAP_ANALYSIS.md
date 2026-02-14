# Corrected Gap Analysis: src_figma vs src

> **Created**: 2026-02-03
> **Status**: AUTHORITATIVE - Based on actual code audit of BOTH folders
> **Supersedes**: DEFINITIVE_GAP_ANALYSIS.md (which only looked at src_figma)

---

## Executive Summary

The previous gap analysis was **WRONG** because it only looked at `src_figma/` and concluded that persistence files were missing. In reality:

1. **The persistence layer EXISTS** in `src/utils/` and `src/hooks/`
2. **src_figma imports from src/** correctly (after recent fixes)
3. **The real bug**: `src_figma/hooks/useGameState.ts` marks games as "aggregated" WITHOUT actually aggregating

---

## Folder Structure

```
kbl-tracker/
├── src/                           # Main codebase (COMPLETE)
│   ├── utils/
│   │   ├── eventLog.ts           # 845 lines - COMPLETE IndexedDB persistence
│   │   ├── seasonStorage.ts      # 917 lines - COMPLETE season stats storage
│   │   ├── seasonAggregator.ts   # COMPLETE game→season aggregation
│   │   └── ... (30 files total)
│   ├── hooks/
│   │   ├── useSeasonData.ts      # 128 lines - COMPLETE
│   │   ├── useSeasonStats.ts     # 283 lines - COMPLETE
│   │   ├── useDataIntegrity.ts   # Recovery/integrity checking
│   │   └── ... (18 files total)
│   ├── components/
│   │   └── GameTracker/index.tsx  # Original GameTracker - WORKS CORRECTLY
│   └── src_figma/                 # Figma UI prototype (NESTED inside src!)
│       ├── hooks/
│       │   ├── useGameState.ts    # 32K - THE PROBLEM IS HERE
│       │   └── useFranchiseData.ts # Correctly imports from ../../
│       ├── utils/                 # EMPTY (files deleted/moved)
│       └── app/                   # Figma UI components
```

---

## CRITICAL BUG #1: Season Aggregation Skipped

### The Problem

`src_figma/hooks/useGameState.ts` line 875-890:

```typescript
const endGame = useCallback(async () => {
  setIsSaving(true);

  await completeGame(gameState.gameId, { away: gameState.awayScore, home: gameState.homeScore }, gameState.inning);

  // BUG: This marks the game as aggregated WITHOUT aggregating!
  await markGameAggregated(gameState.gameId);

  setIsSaving(false);
}, [...]);
```

### How it SHOULD work (from src/components/GameTracker/index.tsx lines 949-964):

```typescript
// 1. Mark game complete
await completeGame(gameId, { away: awayScore, home: homeScore }, inning);

// 2. ACTUALLY AGGREGATE (src_figma SKIPS this!)
await aggregateGameToSeason(persistedState as unknown as PersistedGameState);

// 3. Then mark as aggregated
await markGameAggregated(gameId);
```

### Impact
- Games are marked "aggregated" in IndexedDB but stats never accumulate
- `useFranchiseData` loads empty season stats
- Leaderboards show no data
- All franchise features broken

### Fix
Add this import and call to `src_figma/hooks/useGameState.ts`:

```typescript
// Add import
import { aggregateGameToSeason } from '../../utils/seasonAggregator';

// In endGame():
const endGame = useCallback(async () => {
  setIsSaving(true);

  await completeGame(gameState.gameId, ...);

  // ADD THIS:
  await aggregateGameToSeason({
    gameId: gameState.gameId,
    seasonId: 'season-1', // or from context
    awayTeamId: gameState.awayTeamId,
    homeTeamId: gameState.homeTeamId,
    playerStats: Object.fromEntries(playerStats),
    pitcherStats: Object.fromEntries(pitcherStats),
    // ... other required fields
  });

  await markGameAggregated(gameState.gameId);
  setIsSaving(false);
}, [...]);
```

---

## BUG #2: SB/CS Never Tracked

### Location
`src_figma/hooks/useGameState.ts` line 778

### Current Code
```typescript
// TODO: Log to separate event store
// TODO: Update player stats (SB, CS)
```

### Impact
- `PlayerGameStats.sb` always 0
- `PlayerGameStats.cs` always 0
- Baserunning WAR (rWAR) calculation impossible
- Stolen base leaderboards empty

### Fix
In `recordEvent()` when handling SB/CS events:
```typescript
if (eventType === 'SB' && runnerId) {
  setPlayerStats(prev => {
    const stats = prev.get(runnerId) || createEmptyPlayerStats();
    return new Map(prev).set(runnerId, { ...stats, sb: stats.sb + 1 });
  });
}
if (eventType === 'CS' && runnerId) {
  setPlayerStats(prev => {
    const stats = prev.get(runnerId) || createEmptyPlayerStats();
    return new Map(prev).set(runnerId, { ...stats, cs: stats.cs + 1 });
  });
}
```

---

## BUG #3: Pitch Count Never Incremented

### Location
`src_figma/hooks/useGameState.ts`

### Current State
- `PitcherGameStats.pitchCount` field exists (line 78)
- Initialized to 0 (line 196)
- **Never incremented anywhere**
- No UI input for pitch count

### Impact
- Maddux detection impossible (requires pitchCount ≤ 100)
- Pitch efficiency stats unavailable
- Immaculate inning detection fails

### Fix
1. Add UI input for pitch count (per at-bat or quick buttons)
2. Update `recordHit`, `recordOut`, `recordWalk` to accept pitchCount parameter:
```typescript
const recordHit = useCallback(async (hitType: HitType, rbi: number, pitchCount: number = 1, ...) => {
  // ... existing code ...

  setPitcherStats(prev => {
    const stats = prev.get(gameState.currentPitcherId) || createEmptyPitcherStats();
    return new Map(prev).set(gameState.currentPitcherId, {
      ...stats,
      pitchCount: stats.pitchCount + pitchCount,
      // ... other updates
    });
  });
}, [...]);
```

---

## BUG #4: Scoreboard Errors Never Updated

### Location
`src_figma/hooks/useGameState.ts`

### Current State
- `scoreboard.away.errors` and `scoreboard.home.errors` exist
- **Never incremented**
- No tracking code

### Impact
- Box score shows 0 errors always
- Fielding stats incomplete

### Fix
When recording an error event:
```typescript
if (result === 'E') {
  setScoreboard(prev => ({
    ...prev,
    [isFieldingTeam ? 'away' : 'home']: {
      ...prev[isFieldingTeam ? 'away' : 'home'],
      errors: prev[isFieldingTeam ? 'away' : 'home'].errors + 1,
    },
  }));
}
```

---

## BUG #5: Hardcoded/Missing Calculations

### Location
`src_figma/hooks/useGameState.ts` lines 431-439

### Current State
```typescript
leverageIndex: 1.0,        // TODO: Calculate properly
winProbabilityBefore: 0.5,
winProbabilityAfter: 0.5,
wpa: 0,
isClutch: false,           // TODO: Calculate
isWalkOff: false,          // TODO: Detect
```

### Impact
- Clutch stats meaningless
- Win Probability Added (WPA) always 0
- Walk-off detection broken
- Fame multipliers incorrect

### Fix
Import and use existing engines:
```typescript
import { getBaseOutLI } from '../../engines/leverageCalculator';
import { detectWalkoff } from '../../utils/walkoffDetector';

// In AtBatEvent construction:
const li = getBaseOutLI(baseState, outs);
const isWalkOff = detectWalkoff(/* params */);
```

---

## BUG #6: Other TODOs

| Line | TODO | Impact |
|------|------|--------|
| 774 | Fame not recorded to storage | Fame events lost |
| 777 | Events not logged to separate store | Event history incomplete |
| 828-829 | Substitutions not logged | Lineup changes lost |
| 834-835 | Pitching changes not logged | Pitcher appearance data incomplete |
| 847 | Pitcher name not resolved from roster | Names show as empty |

---

## What DOES Work

These are correctly implemented in src_figma:

| Feature | Status | Notes |
|---------|--------|-------|
| Hit recording (1B, 2B, 3B, HR) | ✅ Works | Stats accumulate correctly |
| Out recording (K, GO, FO, etc.) | ✅ Works | Stats accumulate correctly |
| Walk recording (BB, HBP, IBB) | ✅ Works | Stats accumulate correctly |
| RBI tracking | ✅ Works | Counted on hits/walks |
| Runs tracking | ✅ Works | Scoreboard updates |
| Inning tracking | ✅ Works | Line score updates |
| Base state | ✅ Works | Runners advance correctly |
| IndexedDB persistence | ✅ Works | Events saved via eventLog.ts |
| Import paths | ✅ Fixed | Now correctly point to src/ |

---

## Implementation Priority

### P0 - Critical (Game → Franchise broken)
1. **Add aggregateGameToSeason() call** in endGame()
   - Unblocks ALL franchise features
   - ~10 lines of code

### P1 - High (Stats incomplete)
2. **Add SB/CS tracking** in recordEvent()
   - Enables baserunning leaderboards
   - ~15 lines of code

3. **Add pitch count input + tracking**
   - Enables Maddux detection
   - UI change + ~10 lines

### P2 - Medium (Quality improvements)
4. Add error tracking to scoreboard
5. Calculate leverageIndex properly
6. Detect walk-offs
7. Log substitutions

### P3 - Low (Polish)
8. Calculate WPA
9. Detect isClutch
10. Resolve pitcher names from roster

---

## Verification After Fixes

| Test | Expected | How to Verify |
|------|----------|---------------|
| Complete a game | aggregateGameToSeason called | Console log |
| Check IndexedDB playerSeasonBatting | Stats accumulated | DevTools → Application → IndexedDB |
| useFranchiseData.hasRealData | Returns `true` | Console log in FranchiseHome |
| FranchiseHome leaderboards | Show real player names | Visual inspection |
| Track SB in game | sb increments | Console log playerStats |
| Complete Maddux | Detection fires | Fame event logged |

---

## File Changes Summary

| File | Change Type | Lines |
|------|-------------|-------|
| `src/src_figma/hooks/useGameState.ts` | MODIFY | ~50-100 |

That's it. ONE FILE needs modification. The persistence layer already exists and works.

---

*This document supersedes DEFINITIVE_GAP_ANALYSIS.md*
*Last Updated: 2026-02-03*
