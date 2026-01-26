# Stat Tracking Architecture Specification

> **Purpose**: Define the architecture for tracking statistics from at-bat → game → season → career
> **Related Specs**: PITCHER_STATS_TRACKING_SPEC.md, KBL_XHD_TRACKER_MASTER_SPEC_v3.md §Database Structure
> **Current State**: Phases 1-4 implemented; Phase 5 (multi-season, career, export) pending

---

## 1. The Problem

### 1.1 Current Architecture (Stateless)

The current implementation rebuilds context from scratch each at-bat:

```typescript
// CURRENT: Stats built fresh each at-bat (index.tsx ~903)
const pitcherStatsForFame = {
  playerId: 'pitcher',
  hitsAllowed: 0,      // Always 0 - no accumulation!
  walksAllowed: 0,     // Always 0
  basesReachedViaError: result === 'E' ? 1 : 0,  // Only knows THIS at-bat
  // ...
};
```

**Consequence**: Perfect game detection fails because `basesReachedViaError` resets to 0 each at-bat. By the 9th inning, we've "forgotten" the error that happened in the 2nd.

### 1.2 Required Architecture (Stateful)

```
AT-BAT EVENT
    ↓
GAME ACCUMULATOR (persists across at-bats within game)
    ↓
SEASON AGGREGATOR (persists across games within season)
    ↓
CAREER TOTALS (persists across seasons)
```

---

## 2. Data Flow Layers

### 2.1 Layer 1: At-Bat Event (Ephemeral)

What happens right now. Each result produces an event:

```typescript
interface AtBatEvent {
  timestamp: number;
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  batterId: string;
  pitcherId: string;
  result: AtBatResult;  // '1B', 'K', 'E', etc.
  rbis: number;
  // ... fielding data, ball-in-play data
}
```

**Lifetime**: One at-bat. Triggers detection, then discarded.

### 2.2 Layer 2: Game State (Session Persistence)

Accumulates stats across at-bats within a single game:

```typescript
interface GameState {
  gameId: string;
  awayTeam: string;
  homeTeam: string;

  // Current state
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  bases: Bases;
  score: { away: number; home: number };

  // Accumulated stats per player
  playerStats: Map<string, PlayerGameStats>;

  // Game-level tracking
  leadChanges: LeadChange[];
  maxDeficits: { away: number; home: number };
  atBatHistory: AtBatEvent[];
}

interface PlayerGameStats {
  playerId: string;
  playerName: string;
  teamId: string;

  // Batting (accumulated)
  pa: number;
  ab: number;
  hits: { '1B': number; '2B': number; '3B': number; 'HR': number };
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  hitOrder: ('1B' | '2B' | '3B' | 'HR')[];  // For cycle detection

  // Pitching (accumulated)
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeoutsThrown: number;
  homeRunsAllowed: number;
  hitBatters: number;
  basesReachedViaError: number;  // NEW: For perfect game
  wildPitches: number;
  pitchCount: number;
  battersFaced: number;
  consecutiveHRsAllowed: number;

  // Pitching context
  isStarter: boolean;
  entryInning: number;
  inheritedRunners: number;
  bequeathedRunners: number;

  // Fielding (accumulated)
  putouts: number;
  assists: number;
  errors: number;

  // Fame events detected
  fameEvents: FameEvent[];
}
```

**Lifetime**: One game session. Persists across page refreshes (localStorage/IndexedDB).

### 2.3 Layer 3: Season Stats (Long-term Persistence)

Aggregates game stats into season totals:

```typescript
interface PlayerSeasonStats {
  playerId: string;
  seasonId: string;
  teamId: string;

  // Counting stats (sum of all games)
  batting: {
    games: number;
    pa: number;
    ab: number;
    hits: number;
    singles: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    rbi: number;
    runs: number;
    walks: number;
    strikeouts: number;
    hitByPitch: number;
    stolenBases: number;
    caughtStealing: number;
  };

  pitching: {
    games: number;
    gamesStarted: number;
    outsRecorded: number;
    hitsAllowed: number;
    runsAllowed: number;
    earnedRuns: number;
    walksAllowed: number;
    strikeouts: number;
    homeRunsAllowed: number;
    hitBatters: number;
    wildPitches: number;
    wins: number;
    losses: number;
    saves: number;
    holds: number;
    blownSaves: number;
  };

  fielding: {
    games: number;
    putouts: number;
    assists: number;
    errors: number;
    // Per-position breakdown
    byPosition: Map<Position, FieldingStats>;
  };

  // Derived stats (calculated on read)
  calculated: {
    avg: number;    // H / AB
    obp: number;    // (H + BB + HBP) / (AB + BB + HBP + SF)
    slg: number;    // TB / AB
    ops: number;    // OBP + SLG
    era: number;    // (ER / IP) × 9
    whip: number;   // (BB + H) / IP
    war: number;    // See WAR specs
  };

  // Achievements
  achievements: {
    qualityStarts: number;
    completeGames: number;
    shutouts: number;
    noHitters: number;
    perfectGames: number;
    cycles: number;
    multiHRGames: number;
  };

  // Fame totals
  fame: {
    bonusPoints: number;
    bonerPoints: number;
    netFame: number;
    events: FameEventSummary[];
  };
}
```

**Lifetime**: One season. Stored in IndexedDB.

### 2.4 Layer 4: Career Stats (Permanent)

Aggregates season stats into career totals:

```typescript
interface PlayerCareerStats {
  playerId: string;

  // Counting stats (sum of all seasons)
  seasons: number;
  // ... same structure as season stats, but totals

  // Career milestones
  milestones: Milestone[];  // 100 HR, 1000 hits, etc.

  // Season-by-season breakdown (for career graphs)
  seasonHistory: PlayerSeasonStats[];
}
```

**Lifetime**: Forever. Stored in IndexedDB, exportable.

---

## 3. The Accumulation Pattern

### 3.1 Event → Game Accumulation

When an at-bat completes:

```typescript
function processAtBatEvent(event: AtBatEvent, gameState: GameState): void {
  const batterStats = gameState.playerStats.get(event.batterId);

  // IMPORTANT: Get pitcher using currentPitcher tracking (not fixed IDs)
  const pitcherId = getCurrentPitcherId(); // Uses lineupState.currentPitcher
  const pitcherStats = gameState.playerStats.get(pitcherId);

  // Always increment PA
  batterStats.pa += 1;
  pitcherStats.battersFaced += 1;

  // Update based on result
  switch (event.result) {
    case '1B':
    case '2B':
    case '3B':
    case 'HR':
      batterStats.hits[event.result] += 1;
      batterStats.ab += 1;
      batterStats.hitOrder.push(event.result);
      pitcherStats.hitsAllowed += 1;
      if (event.result === 'HR') pitcherStats.homeRunsAllowed += 1;
      break;

    case 'K':
    case 'KL':
      batterStats.strikeouts += 1;
      batterStats.ab += 1;
      pitcherStats.strikeoutsThrown += 1;
      pitcherStats.outsRecorded += 1;
      break;

    case 'BB':
      batterStats.walks += 1;
      pitcherStats.walksAllowed += 1;
      break;

    case 'E':
      batterStats.ab += 1;  // Reaches, but AB counted
      pitcherStats.basesReachedViaError += 1;  // KEY: Accumulates!
      break;

    // ... other cases
  }

  // Persist to storage
  saveGameState(gameState);
}
```

### 3.2 Pitcher Stats Initialization on Substitution

When a pitching change occurs, the new pitcher must have their stats entry initialized **before** any at-bats are recorded against them:

```typescript
function handleSubstitutionComplete(event: SubstitutionEvent): void {
  if (event.eventType === 'PITCH_CHANGE') {
    const pc = event as PitchingChangeEvent;

    setPitcherGameStats((prev) => {
      const newMap = new Map(prev);

      // CRITICAL: Initialize stats for new pitcher if not already present
      if (!newMap.has(pc.incomingPitcherId)) {
        const teamId = halfInning === 'TOP' ? homeTeamId : awayTeamId;
        newMap.set(pc.incomingPitcherId,
          createInitialPitcherStats(
            pc.incomingPitcherId,
            pc.incomingPitcherName,
            teamId,
            false,  // isStarter = false for relievers
            inning  // entryInning = current inning
          )
        );
      }
      return newMap;
    });

    // Also update lineupState.currentPitcher for stat attribution
    setLineupState((prev) => ({
      ...prev,
      currentPitcher: {
        playerId: pc.incomingPitcherId,
        playerName: pc.incomingPitcherName,
        // ... other fields
      }
    }));
  }
}
```

> **Implementation Note**: Without this initialization, stats for relief pitchers would not
> accumulate because the `pitcherGameStats` Map would have no entry for them. This was fixed
> in the January 2026 implementation audit. See SUBSTITUTION_FLOW_SPEC.md §6.4 for details.

### 3.3 Game → Season Aggregation

When a game ends:

```typescript
function finalizeGame(gameState: GameState, seasonStats: SeasonStats): void {
  for (const [playerId, playerGame] of gameState.playerStats) {
    const playerSeason = seasonStats.getOrCreate(playerId);

    // Aggregate counting stats
    playerSeason.batting.games += 1;
    playerSeason.batting.pa += playerGame.pa;
    playerSeason.batting.ab += playerGame.ab;
    playerSeason.batting.hits += playerGame.totalHits;
    // ... etc

    // Aggregate pitching if applicable
    if (playerGame.outsRecorded > 0) {
      playerSeason.pitching.games += 1;
      if (playerGame.isStarter) playerSeason.pitching.gamesStarted += 1;
      playerSeason.pitching.outsRecorded += playerGame.outsRecorded;
      // ... etc
    }

    // Record achievements
    if (playerGame.isCompleteGame && playerGame.runsAllowed === 0) {
      playerSeason.achievements.shutouts += 1;
    }
    if (checkForCycle(playerGame.hitOrder)) {
      playerSeason.achievements.cycles += 1;
    }
  }

  // Mark game as finalized
  gameState.status = 'COMPLETED';

  // Persist
  saveSeasonStats(seasonStats);
  archiveCompletedGame(gameState);
}
```

### 3.4 Season → Career Aggregation

When a season ends:

```typescript
function finalizeSeason(seasonStats: SeasonStats, careerStats: CareerStats): void {
  for (const [playerId, playerSeason] of seasonStats.playerStats) {
    const playerCareer = careerStats.getOrCreate(playerId);

    playerCareer.seasons += 1;
    playerCareer.batting.games += playerSeason.batting.games;
    playerCareer.batting.pa += playerSeason.batting.pa;
    // ... aggregate all stats

    // Check career milestones
    checkCareerMilestones(playerCareer);

    // Archive season snapshot
    playerCareer.seasonHistory.push(playerSeason);
  }

  saveCa reerStats(careerStats);
}
```

---

## 4. Storage Strategy

### 4.1 Storage Tiers

| Data Type | Storage | Rationale |
|-----------|---------|-----------|
| Current at-bat | React state | Ephemeral, UI-only |
| Current game | IndexedDB + React state | Survives refresh, fast access |
| Season stats | IndexedDB | Persistent, queryable |
| Career stats | IndexedDB | Permanent, exportable |
| Historical games | IndexedDB (compressed) | Archival, box scores |

### 4.2 IndexedDB Schema

```typescript
const dbSchema = {
  version: 1,
  stores: {
    games: {
      keyPath: 'gameId',
      indexes: ['seasonId', 'date', 'status']
    },
    playerGameStats: {
      keyPath: ['gameId', 'playerId'],
      indexes: ['playerId', 'seasonId']
    },
    playerSeasonStats: {
      keyPath: ['seasonId', 'playerId'],
      indexes: ['playerId', 'teamId']
    },
    playerCareerStats: {
      keyPath: 'playerId'
    },
    fameEvents: {
      keyPath: 'eventId',
      indexes: ['playerId', 'gameId', 'seasonId', 'eventType']
    }
  }
};
```

### 4.3 Auto-Save Strategy

```typescript
// Save game state on every at-bat completion
// Debounce to avoid excessive writes
const saveGameState = debounce((state: GameState) => {
  idb.put('games', state);
}, 500);

// Also save on visibility change (user switching tabs/closing)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveGameStateImmediate(currentGameState);
  }
});
```

---

## 5. Migration Path

### 5.1 Phase 1: In-Game Accumulation ✅ COMPLETED

1. ✅ Replace ad-hoc stat building with persistent `GameState`
2. ✅ Add `PitcherGameStats` map that accumulates across at-bats
3. ✅ Pass accumulated stats to Fame detection (not rebuilt stats)
4. ✅ Add localStorage backup for game recovery
5. ✅ Initialize pitcher stats on substitution (January 2026 fix)
6. ✅ Track `currentPitcher` via lineupState for accurate stat attribution

**Implementation:**
- `PitcherGameStats` interface in `GameTracker/index.tsx`
- `pitcherGameStats` Map state with `updatePitcherStats()` function
- Stats accumulate on each at-bat completion
- `handleSubstitutionComplete()` initializes new pitcher's stats entry
- `getCurrentPitcherId()` uses `lineupState.currentPitcher` after substitutions

### 5.2 Phase 2: Game Persistence ✅ COMPLETED

1. ✅ Add IndexedDB for completed games
2. ✅ Implement game save/load with recovery prompt
3. ✅ Add end-game aggregation to season stats

**Implementation:**
- `src/utils/gameStorage.ts` - IndexedDB CRUD operations
- `src/hooks/useGamePersistence.ts` - Auto-save hook (500ms debounce)
- Recovery modal on page load if saved game exists

### 5.3 Phase 3: Season Management ✅ COMPLETED

1. ✅ Season stats aggregation on game completion
2. ✅ Leaderboards hook with derived stat calculations
3. ✅ Live stats display (season + current game merged)

**Implementation:**
- `src/utils/seasonStorage.ts` - Season stats IndexedDB schema (DB_VERSION=2)
- `src/utils/seasonAggregator.ts` - `aggregateGameToSeason()` called at game end
- `src/hooks/useSeasonStats.ts` - Leaderboard queries with sorting
- `src/utils/liveStatsCalculator.ts` - Merge season + game stats
- `src/hooks/useLiveStats.ts` - Real-time stats during gameplay

### 5.4 Phase 4: Event Log & Data Integrity ✅ COMPLETED

1. ✅ Event log system for bulletproof data preservation
2. ✅ Full situational context capture (enables WAR, Clutch, Leverage recalculation)
3. ✅ Aggregation status tracking with retry logic
4. ✅ Startup integrity check and automatic recovery

**Implementation:**
- `src/utils/eventLog.ts` - Event log database and operations
- `src/hooks/useDataIntegrity.ts` - Startup integrity check and recovery

### 5.5 Phase 5: Multi-Season & Export (PENDING)

1. Career tracking
2. Historical queries
3. JSON/CSV export
4. Cloud sync (optional)

---

## 6. Event Log System (Data Integrity)

### 6.1 Overview

The event log captures every at-bat with full situational context, enabling:
- Complete game reconstruction (box scores)
- Full season stat recalculation from raw events
- Advanced metrics recalculation (WAR, Clutch, Leverage, WPA)
- Fame event recalculation
- Recovery from any crash or write failure

### 6.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   DURING GAMEPLAY                            │
│  logAtBatEvent() called IMMEDIATELY after each at-bat       │
│  Full situational context captured (not debounced)          │
│  Pitching appearances tracked for inherited runners         │
│  Fielding events tracked for FWAR                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     GAME END                                 │
│  1. completeGame() marks game as finished                   │
│  2. aggregateGameToSeason() writes to season stats          │
│  3. markGameAggregated() only on SUCCESS                    │
│  If step 2 fails → game remains aggregated: false           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   APP STARTUP                                │
│  useDataIntegrity hook checks for:                          │
│  - Unaggregated games (aggregated === false)                │
│  - Games with aggregation errors                            │
│  - Incomplete games                                         │
│  Automatically re-runs aggregation for failed games         │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 What Gets Captured Per At-Bat

```typescript
interface AtBatEvent {
  // WHO
  batterId, batterName, batterTeamId
  pitcherId, pitcherName, pitcherTeamId

  // RESULT
  result: AtBatResult    // '1B', 'K', 'HR', etc.
  rbiCount, runsScored

  // SITUATION BEFORE (for Leverage Index, Clutch)
  inning, halfInning, outs
  runners: { first, second, third }  // with responsible pitcher IDs
  awayScore, homeScore

  // SITUATION AFTER (for WPA)
  outsAfter, runnersAfter
  awayScoreAfter, homeScoreAfter

  // CALCULATED (stored for efficiency, can recalculate)
  leverageIndex, winProbabilityBefore, winProbabilityAfter, wpa

  // FIELDING
  ballInPlay: { trajectory, zone, velocity, fielderIds }

  // FAME
  fameEvents: FameEventRecord[]

  // FLAGS
  isLeadoff, isClutch, isWalkOff
}
```

### 6.4 Storage Cost

- ~500 bytes per at-bat
- ~70 at-bats per game
- **~35KB per game**
- 162-game season = **~5.7MB** (very manageable)

### 6.5 What This Enables

| Feature | Without Event Log | With Event Log |
|---------|-------------------|----------------|
| Box scores | ❌ Only summary | ✅ Full game reconstruction |
| Season rebuild | ❌ Must track manually | ✅ Recalculate from events |
| WAR recalculation | ❌ Lost context | ✅ Full situational data |
| Clutch/Leverage | ❌ Lost context | ✅ Before/after state |
| WPA | ❌ Lost context | ✅ Win probability delta |
| Fame recovery | ❌ Lost events | ✅ All events preserved |
| Crash recovery | ❌ Data lost | ✅ Re-aggregate on startup |

### 6.6 Key Files

| File | Purpose |
|------|---------|
| `src/utils/eventLog.ts` | Event log database, write/read operations, box score generation |
| `src/hooks/useDataIntegrity.ts` | Startup integrity check, automatic recovery |

---

## 7. Live Stats Display System

### 7.1 Overview

The live stats system provides real-time statistics during gameplay by merging stored season stats with current game stats. This enables displaying up-to-the-moment stats like "Season AVG + this game = Live AVG" without any database writes during gameplay.

### 7.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GAME START                               │
│  useLiveStats hook loads season stats from IndexedDB        │
│  Stats indexed by player ID in Map for O(1) lookup          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   DURING GAMEPLAY                            │
│  calculateLiveBatting(seasonStats, gameStats)               │
│  calculateLivePitching(seasonStats, gameStats)              │
│  → Pure in-memory calculation, ZERO DB writes               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     GAME END                                 │
│  aggregateGameToSeason() writes final stats to IndexedDB    │
│  (This is the ONLY DB write for stats)                      │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Key Files

| File | Purpose |
|------|---------|
| `src/utils/liveStatsCalculator.ts` | Pure functions to merge season + game stats |
| `src/hooks/useLiveStats.ts` | React hook that loads season stats and exposes merge functions |

### 7.4 Usage in GameTracker

```typescript
// Hook loads season stats once at game start
const liveStats = useLiveStats({ autoLoad: true });

// Get live batting for current batter (merges season + game)
const getPlayerLiveBatting = (playerId: string) => {
  const gameStats = playerStats[playerId];
  return liveStats.getLiveBatting(playerId, toGameBattingStats(gameStats));
};

// Get live pitching for current pitcher
const getPitcherLivePitching = (pitcherId: string) => {
  const gameStats = pitcherGameStats.get(pitcherId);
  return liveStats.getLivePitching(pitcherId, toGamePitchingStats(gameStats));
};
```

### 7.5 Live Stats Interfaces

```typescript
interface LiveBattingStats {
  // Combined counting stats (season + game)
  games: number;
  pa: number; ab: number; hits: number;
  homeRuns: number; rbi: number; runs: number;
  walks: number; strikeouts: number;
  stolenBases: number;

  // Derived stats (calculated from combined totals)
  avg: number; obp: number; slg: number; ops: number;

  // This game only (for "today's line" display)
  gameHits: number; gameAB: number;
  gameHR: number; gameRBI: number;
}

interface LivePitchingStats {
  // Combined counting stats
  games: number; gamesStarted: number;
  wins: number; losses: number; saves: number;
  outsRecorded: number; hitsAllowed: number;
  strikeouts: number; earnedRuns: number;

  // Derived stats
  era: number; whip: number;
  inningsPitched: string;  // Formatted: "45.2"

  // This game only
  gameOuts: number; gameHits: number;
  gameER: number; gameK: number;
}
```

### 7.6 Formatting Helpers

```typescript
// Display batting average: ".285" or "---" for no ABs
formatAvg(avg: number, ab: number): string

// Display ERA: "3.45" or "---" for no innings
formatERA(era: number, outs: number): string

// Format batter's game line: "2-4, HR, 2 RBI"
formatBatterGameLine(stats: LiveBattingStats): string

// Format pitcher's game line: "5.2 IP, 3 H, 1 ER, 6 K"
formatPitcherGameLine(stats: LivePitchingStats): string
```

### 7.7 Performance Characteristics

- **Memory**: ~1KB per player with season history (negligible)
- **Load time**: Single IndexedDB read at game start (~10-50ms)
- **Per at-bat**: Zero DB operations, pure in-memory merge
- **CPU**: O(1) player lookup + O(1) stat merge = instant

---

## 8. Impact on Fame System

### 8.1 What Changes

| Detection | Before | After |
|-----------|--------|-------|
| Perfect game | `basesReachedViaError: result === 'E' ? 1 : 0` | `pitcherStats.basesReachedViaError` (accumulated) |
| No-hitter | `hitsAllowed: 0` (always) | `pitcherStats.hitsAllowed` (accumulated) |
| 5-hit game | `totalHits` (rebuilt) | `batterStats.totalHits` (accumulated) |
| Cycle | Hit order not tracked | `batterStats.hitOrder` array |
| Maddux | Pitch count not persisted | `pitcherStats.pitchCount` (accumulated) |

### 8.2 Detection Context Update

```typescript
// BEFORE: Stats rebuilt fresh
const pitcherStatsForFame = {
  hitsAllowed: 0,  // Wrong!
  basesReachedViaError: result === 'E' ? 1 : 0,  // Only this AB
};

// AFTER: Stats from accumulated game state
const pitcherStats = gameState.playerStats.get(currentPitcherId);
// pitcherStats.hitsAllowed is 3 (accumulated from innings 1-6)
// pitcherStats.basesReachedViaError is 1 (from 2nd inning error)
```

---

## 9. Implementation Priority

### Immediate (Fix Fame Detection)

1. Add `pitcherGameStats` map to GameTracker state
2. Accumulate stats on each at-bat completion
3. Pass accumulated stats to `checkForFameEvents`
4. Fix perfect game / no-hitter detection

### Short-term (Game Persistence)

1. Add IndexedDB storage
2. Implement game recovery on page refresh
3. Add game completion handler

### Medium-term (Season Tracking)

1. Season stats aggregation
2. Player dashboards
3. Leaderboards

### Long-term (Full System)

1. Multi-season support
2. Career tracking
3. Historical analysis
4. Export/backup

---

## 10. Related Specs

| Spec | Relationship |
|------|--------------|
| PITCHER_STATS_TRACKING_SPEC.md | Defines what pitching stats to track |
| FAME_SYSTEM_TRACKING.md | Consumer of accumulated stats |
| KBL_XHD_TRACKER_MASTER_SPEC_v3.md | Overall database structure |
| INHERITED_RUNNERS_SPEC.md | ER attribution logic |

---

*Last Updated: January 22, 2026*
*Version: 3.1 - Added pitcher stats initialization on substitution, currentPitcher tracking documentation*
