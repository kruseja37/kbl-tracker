# Definitive Gap Analysis: Franchise Mode vs Game Tracker

> **Created**: 2026-02-03
> **Status**: AUTHORITATIVE - Based on actual code audit
> **Purpose**: Single source of truth for what needs to be built

---

## CRITICAL DISCOVERY

**The persistence layer doesn't exist.** Files like `eventLog.ts`, `seasonStorage.ts`, `useSeasonData.ts`, `useSeasonStats.ts` are IMPORTED in `src_figma/` but **DO NOT EXIST** in the codebase.

```
CURRENT STATE:
GameTracker UI → useGameState (React state only) → ❌ NOWHERE (functions undefined)
                                                      ↓
                                                 Data lost on page refresh

FRANCHISE MODE:
useFranchiseData → imports useSeasonData, useSeasonStats → ❌ FILES DON'T EXIST
                                                              ↓
                                                         Falls back to MOCK DATA
```

---

## SECTION 1: What Franchise Mode NEEDS

### 1.1 Missing Files (Will Cause Runtime Errors)

| File | Imported By | Must Export |
|------|-------------|-------------|
| `hooks/useSeasonData.ts` | useFranchiseData.ts:10 | `useSeasonData`, `TeamStanding` |
| `hooks/useSeasonStats.ts` | useFranchiseData.ts:11 | `useSeasonStats`, `BattingLeaderEntry`, `PitchingLeaderEntry` |
| `utils/seasonStorage.ts` | useFranchiseData.ts:12, usePlayoffData.ts:36 | `calculateStandings`, `SeasonMetadata`, `TeamStanding` |
| `utils/eventLog.ts` | useGameState.ts:16 | `logAtBatEvent`, `createGameHeader`, `completeGame`, `AtBatEvent` |

### 1.2 Required Interfaces (From Code Analysis)

**BattingLeaderEntry** (used in useFranchiseData.ts:215-241):
```typescript
interface BattingLeaderEntry {
  playerName: string;    // Line 238: entry.playerName
  teamId: string;        // Line 239: entry.teamId
  avg: number;           // Line 219: entry.avg
  homeRuns: number;      // Line 222: entry.homeRuns
  rbi: number;           // Line 225: entry.rbi
  stolenBases: number;   // Line 228: entry.stolenBases
  ops: number;           // Line 231: entry.ops
}
```

**PitchingLeaderEntry** (used in useFranchiseData.ts:247-274):
```typescript
interface PitchingLeaderEntry {
  playerName: string;    // Line 270: entry.playerName
  teamId: string;        // Line 271: entry.teamId
  era: number;           // Line 251: entry.era
  wins: number;          // Line 254: entry.wins
  strikeouts: number;    // Line 257: entry.strikeouts
  whip: number;          // Line 260: entry.whip
  saves: number;         // Line 263: entry.saves
}
```

**SeasonMetadata** (used in useFranchiseData.ts:391-395):
```typescript
interface SeasonMetadata {
  seasonNumber: number;  // Line 391
  seasonName: string;    // Line 392
  gamesPlayed: number;   // Line 393
  totalGames: number;    // Line 394
}
```

**TeamStanding** (used in useFranchiseData.ts:356-361):
```typescript
interface TeamStanding {
  teamName: string;      // Line 357
  wins: number;          // Line 358
  losses: number;        // Line 359
  gamesBack: number;     // Line 360
  runDiff: number;       // Line 361
}
```

### 1.3 Required Hook Functions

**useSeasonData** must return:
```typescript
{
  seasonMetadata: SeasonMetadata | null;
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}
```

**useSeasonStats** must return:
```typescript
{
  battingLeaders: BattingLeaderEntry[];
  pitchingLeaders: PitchingLeaderEntry[];
  getBattingLeaders: (stat: 'avg'|'hr'|'rbi'|'sb'|'ops', limit: number) => BattingLeaderEntry[];
  getPitchingLeaders: (stat: 'era'|'wins'|'strikeouts'|'whip'|'saves', limit: number) => PitchingLeaderEntry[];
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}
```

### 1.4 PostGameSummary Data Needs

Currently 100% mock data. Needs real data for:

| Data | Mock Location | Should Come From |
|------|--------------|------------------|
| awayBatters[] | Lines 15-25 | Completed game's playerStats |
| homeBatters[] | Lines 27-37 | Completed game's playerStats |
| awayPitchers[] | Lines 39-42 | Completed game's pitcherStats |
| homePitchers[] | Lines 44-47 | Completed game's pitcherStats |
| scoreboard | Lines 50-64 | Completed game's scoreboard |

**Batter box score row needs:**
- name, pos, ab, r, h, rbi, bb, so, avg

**Pitcher box score row needs:**
- name, ip, h, r, er, bb, so, era

---

## SECTION 2: What Game Tracker CAPTURES

### 2.1 PlayerGameStats (useGameState.ts:51-65)

| Field | Declared | Updated? | Location |
|-------|----------|----------|----------|
| pa | ✅ | ✅ Yes | recordHit:439, recordOut:577, recordWalk:680 |
| ab | ✅ | ✅ Yes | recordHit:440, recordOut:578 |
| h | ✅ | ✅ Yes | recordHit:441 |
| singles | ✅ | ✅ Yes | recordHit:442 |
| doubles | ✅ | ✅ Yes | recordHit:443 |
| triples | ✅ | ✅ Yes | recordHit:444 |
| hr | ✅ | ✅ Yes | recordHit:445 |
| r | ✅ | ⚠️ Partial | recordHit:446 (HR only, not other scoring) |
| rbi | ✅ | ✅ Yes | recordHit:447, recordOut:586, recordWalk:682 |
| bb | ✅ | ✅ Yes | recordWalk:681 |
| k | ✅ | ✅ Yes | recordOut:583 |
| **sb** | ✅ | ❌ **NEVER** | TODO at line 767 |
| **cs** | ✅ | ❌ **NEVER** | TODO at line 767 |

### 2.2 PitcherGameStats (useGameState.ts:67-77)

| Field | Declared | Updated? | Location |
|-------|----------|----------|----------|
| outsRecorded | ✅ | ✅ Yes | recordOut:595 |
| hitsAllowed | ✅ | ✅ Yes | recordHit:455 |
| runsAllowed | ✅ | ✅ Yes | recordHit:458, recordWalk:693 |
| earnedRuns | ✅ | ⚠️ Always = runsAllowed | recordHit:459, recordWalk:694 |
| walksAllowed | ✅ | ✅ Yes | recordWalk:691 |
| strikeoutsThrown | ✅ | ✅ Yes | recordOut:598 |
| homeRunsAllowed | ✅ | ✅ Yes | recordHit:457 |
| **pitchCount** | ✅ | ❌ **NEVER** | No input exists |
| battersFaced | ✅ | ✅ Yes | recordHit:456, recordOut:596, recordWalk:692 |

### 2.3 AtBatEvent (Constructed but NOT PERSISTED)

```typescript
// From useGameState.ts:392-429 (recordHit example)
const event: AtBatEvent = {
  // POPULATED CORRECTLY:
  eventId: `${gameId}_${sequence}`,     // ✅
  gameId,                                // ✅
  sequence,                              // ✅
  timestamp: Date.now(),                 // ✅
  batterId,                              // ✅
  batterName,                            // ✅
  batterTeamId,                          // ✅
  pitcherId,                             // ✅
  pitcherName,                           // ✅
  pitcherTeamId,                         // ✅
  result,                                // ✅
  rbiCount,                              // ✅
  runsScored,                            // ✅
  inning,                                // ✅
  halfInning,                            // ✅
  outs,                                  // ✅
  awayScore,                             // ✅
  homeScore,                             // ✅
  isLeadoff: /* calculated */,           // ✅

  // HARDCODED PLACEHOLDERS:
  leverageIndex: 1.0,                    // ❌ TODO comment at line 420
  winProbabilityBefore: 0.5,             // ❌ Never calculated
  winProbabilityAfter: 0.5,              // ❌ Never calculated
  wpa: 0,                                // ❌ Never calculated
  isClutch: false,                       // ❌ TODO comment at line 427
  isWalkOff: false,                      // ❌ TODO comment at line 428

  // ALWAYS NULL/EMPTY:
  runners: {
    first: gameState.bases.first ? { runnerId: '', ... } : null,  // ❌ ID always ''
    second: ...,                                                   // ❌ ID always ''
    third: ...,                                                    // ❌ ID always ''
  },
  runnersAfter: { first: null, second: null, third: null },       // ❌ Always null
  ballInPlay: null,                                                // ❌ Always null
  fameEvents: [],                                                  // ❌ Always empty
};

// CRITICAL: This is called but the function DOES NOT EXIST
await logAtBatEvent(event);  // Line 432, 571, 674 - UNDEFINED
```

### 2.4 Scoreboard (useGameState.ts:239-243)

| Field | Updated? | Location |
|-------|----------|----------|
| innings[].away/home | ✅ Yes | recordHit:470 |
| away.runs | ✅ Yes | recordHit:479 |
| away.hits | ✅ Yes | recordHit:480 |
| **away.errors** | ❌ **NEVER** | Field exists but unused |
| home.runs | ✅ Yes | recordHit:479 |
| home.hits | ✅ Yes | recordHit:480 |
| **home.errors** | ❌ **NEVER** | Field exists but unused |

---

## SECTION 3: The Gaps

### 3.1 Missing Files (Must Create)

| Priority | File | Purpose |
|----------|------|---------|
| 🔴 CRITICAL | `utils/eventLog.ts` | Persist AtBatEvent, game headers, completion |
| 🔴 CRITICAL | `utils/seasonStorage.ts` | Store/aggregate season stats |
| 🔴 CRITICAL | `hooks/useSeasonData.ts` | Load season metadata |
| 🔴 CRITICAL | `hooks/useSeasonStats.ts` | Load season stats, leaderboards |
| 🟡 HIGH | `utils/seasonAggregator.ts` | Aggregate game → season stats |

### 3.2 Missing Data (Must Track)

| Data | Who Needs It | Why Missing |
|------|--------------|-------------|
| **Stolen Bases (SB)** | Franchise batting leaders | recordEvent has TODO |
| **Caught Stealing (CS)** | Franchise batting leaders | recordEvent has TODO |
| **Pitch Count** | Pitcher stats (Maddux) | No UI input exists |
| **Errors** | Scoreboard, fielding | No tracking code |
| **Pitcher Wins/Losses** | Franchise pitching leaders | Decision logic missing |
| **Saves** | Franchise pitching leaders | Save situation logic missing |
| **Runner IDs** | Event log, ER attribution | Always empty string |

### 3.3 Broken Data Flow

| Step | Status | Problem |
|------|--------|---------|
| UI → useGameState | ✅ Works | Data captured in React state |
| useGameState → IndexedDB | ❌ BROKEN | logAtBatEvent undefined |
| IndexedDB → seasonStorage | ❌ BROKEN | Files don't exist |
| seasonStorage → useSeasonStats | ❌ BROKEN | Files don't exist |
| useSeasonStats → useFranchiseData | ❌ BROKEN | Returns empty, falls back to mock |

---

## SECTION 4: Implementation Plan

> **PURPOSE**: Step-by-step instructions for Claude Code to close all gaps.
> **REFERENCE**: WHAT_TO_BUILD_MASTER_SPEC.md for interfaces and validation rules.

---

### PHASE 1: Persistence Layer (BLOCKING - DO THIS FIRST)

**Goal**: Make game data survive page refresh and flow to Franchise Mode.

#### Step 1.1: Create `utils/eventLog.ts`

**Location**: `/src_figma/utils/eventLog.ts`

```typescript
// REQUIRED EXPORTS (imported by useGameState.ts line 16)
export interface AtBatEvent {
  eventId: string;
  gameId: string;
  sequence: number;
  timestamp: number;
  batterId: string;
  batterName: string;
  batterTeamId: string;
  pitcherId: string;
  pitcherName: string;
  pitcherTeamId: string;
  result: string;
  rbiCount: number;
  runsScored: number;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  awayScore: number;
  homeScore: number;
  leverageIndex: number;
  winProbabilityBefore: number;
  winProbabilityAfter: number;
  wpa: number;
  isLeadoff: boolean;
  isClutch: boolean;
  isWalkOff: boolean;
  runners: {
    first: { runnerId: string; runnerName: string } | null;
    second: { runnerId: string; runnerName: string } | null;
    third: { runnerId: string; runnerName: string } | null;
  };
  runnersAfter: typeof runners;
  ballInPlay: any | null;
  fameEvents: any[];
}

export interface GameHeader {
  gameId: string;
  seasonId: string;
  awayTeamId: string;
  homeTeamId: string;
  startTime: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
}

// IndexedDB operations
export async function initEventLogDB(): Promise<IDBDatabase>;
export async function logAtBatEvent(event: AtBatEvent): Promise<void>;
export async function createGameHeader(header: GameHeader): Promise<void>;
export async function completeGame(gameId: string, finalScore: { away: number; home: number }, finalInning: number): Promise<void>;
export async function getGameEvents(gameId: string): Promise<AtBatEvent[]>;
export async function getGameHeader(gameId: string): Promise<GameHeader | null>;
```

**Implementation Notes**:
- Use IndexedDB with stores: `atBatEvents` (keyPath: eventId), `gameHeaders` (keyPath: gameId)
- `logAtBatEvent` is called at useGameState.ts lines 432, 571, 674 - currently undefined
- Must handle async properly - these calls are awaited

#### Step 1.2: Create `utils/seasonStorage.ts`

**Location**: `/src_figma/utils/seasonStorage.ts`

```typescript
// REQUIRED EXPORTS (imported by useFranchiseData.ts line 12, usePlayoffData.ts line 36)
export interface SeasonMetadata {
  seasonNumber: number;
  seasonName: string;
  gamesPlayed: number;
  totalGames: number;
}

export interface TeamStanding {
  teamName: string;
  wins: number;
  losses: number;
  gamesBack: number;
  runDiff: number;
}

export async function calculateStandings(seasonId: string): Promise<TeamStanding[]>;
export async function saveSeasonStats(seasonId: string, stats: any): Promise<void>;
export async function getSeasonMetadata(seasonId: string): Promise<SeasonMetadata | null>;
export async function updateTeamRecord(seasonId: string, teamId: string, won: boolean, runsFor: number, runsAgainst: number): Promise<void>;
```

**Implementation Notes**:
- IndexedDB stores: `seasonMetadata`, `teamStandings`, `playerSeasonStats`
- `calculateStandings` must sort by wins, calculate gamesBack from leader
- Called by useFranchiseData.ts to populate standings display

#### Step 1.3: Create `utils/seasonAggregator.ts`

**Location**: `/src_figma/utils/seasonAggregator.ts`

```typescript
export async function aggregateGameToSeason(gameId: string, seasonId: string): Promise<void>;
```

**Implementation Notes**:
- Call this from `endGame()` in useGameState.ts
- Read all AtBatEvents for gameId from eventLog
- Accumulate to player season stats:
  - Batting: PA, AB, H, 1B, 2B, 3B, HR, R, RBI, BB, K, SB, CS
  - Pitching: outs, H, R, ER, BB, K, HR allowed, pitchCount, BF
- Update team standings via `updateTeamRecord`

---

### PHASE 2: Season Hooks

**Goal**: Make useFranchiseData.ts work without falling back to mock data.

#### Step 2.1: Create `hooks/useSeasonData.ts`

**Location**: `/src_figma/hooks/useSeasonData.ts`

```typescript
// REQUIRED EXPORTS (imported by useFranchiseData.ts line 10)
export interface UseSeasonDataReturn {
  seasonMetadata: SeasonMetadata | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSeasonData(seasonId: string): UseSeasonDataReturn;
```

**Implementation Notes**:
- Wraps `getSeasonMetadata` from seasonStorage
- React hook with useState + useEffect
- useFranchiseData.ts destructures these exact fields at line ~391-395

#### Step 2.2: Create `hooks/useSeasonStats.ts`

**Location**: `/src_figma/hooks/useSeasonStats.ts`

```typescript
// REQUIRED EXPORTS (imported by useFranchiseData.ts line 11)
export interface BattingLeaderEntry {
  playerName: string;
  teamId: string;
  avg: number;
  homeRuns: number;
  rbi: number;
  stolenBases: number;
  ops: number;
}

export interface PitchingLeaderEntry {
  playerName: string;
  teamId: string;
  era: number;
  wins: number;
  strikeouts: number;
  whip: number;
  saves: number;
}

export interface UseSeasonStatsReturn {
  battingLeaders: BattingLeaderEntry[];
  pitchingLeaders: PitchingLeaderEntry[];
  getBattingLeaders: (stat: 'avg'|'hr'|'rbi'|'sb'|'ops', limit: number) => BattingLeaderEntry[];
  getPitchingLeaders: (stat: 'era'|'wins'|'strikeouts'|'whip'|'saves', limit: number) => PitchingLeaderEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSeasonStats(seasonId: string): UseSeasonStatsReturn;
```

**Implementation Notes**:
- Load all player season stats from IndexedDB
- Sort by requested stat for getBattingLeaders/getPitchingLeaders
- useFranchiseData.ts uses these at lines 215-274 to build leaderboard data

---

### PHASE 3: Game Tracker Fixes

**Goal**: Capture currently-missing data points.

#### Step 3.1: Fix SB/CS Tracking

**File**: `/src_figma/hooks/useGameState.ts`
**Location**: Line 767 (TODO comment)

**Current State**: Fields exist in PlayerGameStats (lines 51-65) but never incremented.

**Fix**:
```typescript
// In recordEvent or new recordStolenBase function:
function recordStolenBase(runnerId: string, success: boolean) {
  setGameState(prev => {
    const stats = { ...prev.playerStats[runnerId] };
    if (success) {
      stats.sb = (stats.sb || 0) + 1;
    } else {
      stats.cs = (stats.cs || 0) + 1;
    }
    return {
      ...prev,
      playerStats: { ...prev.playerStats, [runnerId]: stats }
    };
  });
}
```

**UI Change Needed**: Add SB/CS buttons or toggle when runner outcomes are recorded.

#### Step 3.2: Add Pitch Count Tracking

**File**: `/src_figma/hooks/useGameState.ts`
**Location**: PitcherGameStats interface (lines 67-77) - field exists, never incremented

**Fix**: Add pitch count input to UI and increment in recordHit/recordOut/recordWalk:
```typescript
// Add to each record function:
pitcher.pitchCount = (pitcher.pitchCount || 0) + pitchesThisAtBat;
```

**UI Change Needed**: Per WHAT_TO_BUILD_MASTER_SPEC.md §1.8:
- Add quick buttons [1][2][3][4][5][6+] after result selection
- Or simple increment counter
- Input is REQUIRED for Maddux detection

#### Step 3.3: Add Error Tracking

**File**: `/src_figma/hooks/useGameState.ts`
**Location**: Scoreboard interface (lines 239-243) - fields exist, never updated

**Fix**:
```typescript
// In recordError or when result = 'E':
scoreboard[teamId].errors += 1;
```

**UI Change Needed**: When result = 'E', require fielder selection and error type.

#### Step 3.4: Add Pitcher Decision Logic (W/L/S)

**NEW FILE or addition to seasonAggregator.ts**

**Logic** (per PITCHER_STATS_TRACKING_SPEC.md):
```typescript
function calculatePitcherDecisions(gameHeader: GameHeader, events: AtBatEvent[], pitcherStats: Map<string, PitcherGameStats>) {
  const winningTeam = finalScore.away > finalScore.home ? 'away' : 'home';
  const losingTeam = winningTeam === 'away' ? 'home' : 'away';

  // WIN: Pitcher of record when team takes lead for good
  // Find the pitcher on mound when winning team took permanent lead

  // LOSS: Pitcher who gave up go-ahead run(s)

  // SAVE: If closer enters with <=3 run lead and finishes game
  // - Pitches at least 1 inning, OR
  // - Enters with tying run on base/at bat/on deck, OR
  // - Pitches at least 3 innings
}
```

**Call from**: `completeGame()` in eventLog.ts or `aggregateGameToSeason()`

---

### PHASE 4: Wire PostGameSummary

**Goal**: Replace mock data with real game data.

#### Step 4.1: Create `hooks/useCompletedGame.ts`

**Location**: `/src_figma/hooks/useCompletedGame.ts`

```typescript
export interface BoxScoreBatter {
  name: string;
  pos: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  avg: number;
}

export interface BoxScorePitcher {
  name: string;
  ip: string; // "6.2" format
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  era: number;
}

export interface CompletedGameData {
  awayBatters: BoxScoreBatter[];
  homeBatters: BoxScoreBatter[];
  awayPitchers: BoxScorePitcher[];
  homePitchers: BoxScorePitcher[];
  scoreboard: {
    innings: { away: number; home: number }[];
    totals: { away: { r: number; h: number; e: number }; home: { r: number; h: number; e: number } };
  };
  isLoading: boolean;
  error: string | null;
}

export function useCompletedGame(gameId: string): CompletedGameData;
```

**Implementation Notes**:
- Call `getGameEvents(gameId)` and `getGameHeader(gameId)` from eventLog
- Compute box score rows from accumulated event data
- Calculate AVG = H/AB, ERA = (ER * 9) / IP

#### Step 4.2: Update PostGameSummary.tsx

**File**: `/src_figma/app/pages/PostGameSummary.tsx`
**Location**: Lines 15-64 (all mock data)

**Change**:
```typescript
// BEFORE (mock):
const awayBatters = [{ name: "Mock Player", ... }];

// AFTER (real):
const { awayBatters, homeBatters, awayPitchers, homePitchers, scoreboard, isLoading } = useCompletedGame(gameId);

if (isLoading) return <LoadingSpinner />;
```

---

### PHASE 5: Verification

After implementation, run these checks:

| # | Test | Expected | How to Verify |
|---|------|----------|---------------|
| 1 | Play one at-bat, refresh page | Game state preserved | Check IndexedDB → atBatEvents |
| 2 | Complete a game | Season stats updated | Check IndexedDB → playerSeasonStats |
| 3 | Check useFranchiseData.hasRealData | Returns `true` | Console log in FranchiseHome |
| 4 | Check FranchiseHome leaderboards | Real player names | Visual inspection |
| 5 | Check PostGameSummary | Actual game stats | Visual inspection |
| 6 | Track SB in game | sb field increments | Console log playerStats |
| 7 | Track pitch count | pitchCount accumulates | Console log pitcherStats |
| 8 | Complete shutout with ≤100 pitches | Maddux detected | Check fame events |

---

### FILE CREATION ORDER

```
1. utils/eventLog.ts        ← enables persistence
2. utils/seasonStorage.ts   ← enables season aggregation
3. utils/seasonAggregator.ts ← connects game → season
4. hooks/useSeasonData.ts   ← makes useFranchiseData work
5. hooks/useSeasonStats.ts  ← makes leaderboards work
6. hooks/useCompletedGame.ts ← makes PostGameSummary work
7. MODIFY: useGameState.ts  ← fix SB/CS, pitch count, errors
8. MODIFY: PostGameSummary.tsx ← use real data
```

---

### DEPENDENCIES BETWEEN FILES

```
useGameState.ts
  └── imports eventLog.ts (logAtBatEvent, createGameHeader, completeGame)
        └── writes to IndexedDB

seasonAggregator.ts
  └── imports eventLog.ts (getGameEvents)
  └── imports seasonStorage.ts (saveSeasonStats, updateTeamRecord)
        └── writes to IndexedDB

useSeasonData.ts
  └── imports seasonStorage.ts (getSeasonMetadata)
        └── reads from IndexedDB

useSeasonStats.ts
  └── imports seasonStorage.ts (player stats query functions)
        └── reads from IndexedDB

useFranchiseData.ts
  └── imports useSeasonData.ts ← FILE MUST EXIST
  └── imports useSeasonStats.ts ← FILE MUST EXIST
  └── imports seasonStorage.ts (calculateStandings) ← FILE MUST EXIST

useCompletedGame.ts
  └── imports eventLog.ts (getGameEvents, getGameHeader)
        └── reads from IndexedDB
```

If any import fails, the app crashes. Create files in order listed above.

---

## SECTION 5: Verification Checklist

After implementation, verify:

| Test | Expected Result |
|------|-----------------|
| Play a game, check IndexedDB | AtBatEvent records exist |
| Complete a game | aggregateGameToSeason called |
| Check useSeasonStats | Real player stats returned |
| Check useFranchiseData.hasRealData | Returns `true` |
| Check FranchiseHome leaderboards | Shows real players |
| Check PostGameSummary | Shows actual game data |

---

## Appendix: Code References

All line numbers reference files in `/sessions/confident-funny-ritchie/mnt/src_figma/`:

| File | Key Lines |
|------|-----------|
| hooks/useFranchiseData.ts | 10-12 (imports), 215-274 (leader mapping), 287-295 (hasRealData) |
| hooks/useGameState.ts | 51-77 (interfaces), 392-432 (AtBatEvent), 766-767 (TODO SB/CS) |
| app/pages/PostGameSummary.tsx | 15-64 (all mock data) |

---

*This document supersedes FRANCHISE_FLOW_AUDIT.md and other partial analyses.*
*Last Updated: 2026-02-03*
