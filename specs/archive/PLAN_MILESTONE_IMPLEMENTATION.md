# Milestone System Implementation Plan

> **Purpose**: Tie milestones to Fame bonuses/boners across game, season, and career scopes
> **Status**: Implementation In Progress
> **Date**: January 22, 2026
> **Last Updated**: January 22, 2026

## Implementation Status Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Single-Game Detection | ✅ Complete | FameEventTypes added, per-inning tracking implemented |
| Phase 2: Season Milestone Detection | ✅ Complete | milestoneDetector.ts with threshold definitions |
| Phase 3: Career System | ✅ Complete | careerStorage.ts + dual-factor scaling |
| Phase 4: Integration | 🔄 In Progress | Need to wire into aggregation flow |
| Phase 5: UI/Settings | ⏳ Deferred | Waiting for backend completion |

---

## Overview

This plan implements the full milestone detection system as specified in `MILESTONE_SYSTEM_SPEC.md`, connecting milestones to the existing Fame system at three scopes:

1. **Single-Game Milestones** - Detected during gameplay
2. **Season Milestones** - Detected at game end when season stats update
3. **Career Milestones** - Detected when career stats update (requires new infrastructure)

---

## Phase 1: Expand Single-Game Detection

### Status: ✅ COMPLETE

| Milestone | FameEventType | Detection |
|-----------|--------------|-----------|
| Maddux (CGSO <100 pitches) | ✅ `MADDUX` | ✅ Implemented |
| Complete Game | ✅ `COMPLETE_GAME` | ✅ Implemented |
| Shutout | ✅ `SHUTOUT` | ✅ Implemented |
| Immaculate Inning | ✅ `IMMACULATE_INNING` | ✅ Implemented |
| Titanium Sombrero (6K) | ✅ `TITANIUM_SOMBRERO` | ✅ Implemented |
| 3-Hit Game | ✅ `THREE_HIT_GAME` | ✅ Implemented |
| 4-Hit Game | ✅ `FOUR_HIT_GAME` | ✅ Implemented |
| 5+ RBI Game | ✅ `FIVE_RBI_GAME` | ✅ Implemented |
| 8+ RBI Game | ✅ `EIGHT_RBI_GAME` | ✅ Implemented |
| 10+ RBI Game | ✅ `TEN_RBI_GAME` | ✅ Implemented |
| Walked In Run | ✅ `WALKED_IN_RUN` | ✅ Implemented |
| Blown Lead 3+ | ✅ `BLOWN_LEAD_3` | ✅ Implemented |
| Blown Lead 5+ | ✅ `BLOWN_LEAD_5` | ✅ Implemented |

### Files Modified ✅

1. **`src/types/game.ts`** - FameEventTypes added:
   - ✅ `THREE_HIT_GAME`, `FOUR_HIT_GAME`, `FIVE_HIT_GAME`
   - ✅ `FIVE_RBI_GAME`, `EIGHT_RBI_GAME`, `TEN_RBI_GAME`
   - ✅ All career tier event types (CAREER_HR_TIER, CAREER_K_TIER, etc.)
   - ✅ All season milestone event types

2. **`src/hooks/useFameDetection.ts`** - Detection functions added:
   - ✅ All single-game detection functions implemented
   - ✅ `detectMaddux()`, `detectCompleteGame()`, `detectShutout()`
   - ✅ `detectImmaculateInning()`, `detectTitaniumSombrero()`
   - ✅ `detectMultiHitGame()`, `detectHighRBIGame()`
   - ✅ `detectWalkedInRun()`, `detectBlownLead()`

3. **`src/components/GameTracker/index.tsx`** - Per-inning tracking:
   - ✅ `currentInningPitches`, `currentInningStrikeouts` state
   - ✅ Reset on half-inning change

### Implementation Details

```typescript
// Maddux detection (in checkEndGameFame)
const detectMaddux = (context, pitcherStats): DetectionResult | null => {
  if (!context.isGameOver) return null;
  if (!pitcherStats.isStarter) return null;

  const minOuts = context.scheduledInnings * 3;
  if (pitcherStats.outs < minOuts) return null;
  if (pitcherStats.runsAllowed > 0) return null;

  // Maddux threshold: < (innings × 9.44)
  const threshold = Math.ceil(context.scheduledInnings * 9.44);
  if (pitcherStats.pitchCount >= threshold) return null;

  // It's a Maddux!
  return createDetectionResult('MADDUX', pitcherStats, ...);
};

// Immaculate Inning detection (requires per-inning tracking)
// Need to track: pitchesThisInning, strikeoutsThisInning
const detectImmaculateInning = (context, pitcherStats, inningPitches, inningK): DetectionResult | null => {
  if (context.outs !== 3) return null;
  if (inningPitches !== 9 || inningK !== 3) return null;
  return createDetectionResult('IMMACULATE_INNING', pitcherStats, ...);
};
```

### New State Required

In `GameTracker/index.tsx`, add tracking for:
```typescript
// Per-inning tracking for Immaculate Inning detection
const [currentInningPitches, setCurrentInningPitches] = useState(0);
const [currentInningStrikeouts, setCurrentInningStrikeouts] = useState(0);

// For Blown Lead detection
const [maxLeadByTeam, setMaxLeadByTeam] = useState<{ away: number; home: number }>({ away: 0, home: 0 });
```

---

## Phase 2: Season Milestone Detection

### Status: ✅ COMPLETE

Season milestone detection logic is fully implemented in `src/utils/milestoneDetector.ts`.

### Architecture

```
Game Ends
    ↓
aggregateGameToSeason()  ← existing
    ↓
checkSeasonMilestones()  ← NEW
    ↓
Return detected milestones to GameTracker for display
```

### Files Created/Modified ✅

1. **`src/utils/milestoneDetector.ts`** ✅ CREATED - Full milestone detection logic
2. **`src/utils/seasonAggregator.ts`** 🔄 Need to add milestone check call
3. **`src/types/game.ts`** ✅ Season milestone FameEventTypes added

### Season Milestone Categories

**Batting Clubs (Multi-stat):**
- `CLUB_15_15` (15 HR + 15 SB)
- `CLUB_20_20` (20 HR + 20 SB)
- `CLUB_25_25` (25 HR + 25 SB)
- `CLUB_30_30` (30 HR + 30 SB)
- `CLUB_40_40` (40 HR + 40 SB)

**Batting Counting:**
- `SEASON_40_HR`, `SEASON_45_HR`, `SEASON_55_HR`
- `SEASON_160_HITS`
- `SEASON_120_RBI`
- `SEASON_40_SB`, `SEASON_80_SB`

**Pitching:**
- `SEASON_15_WINS`, `SEASON_20_WINS`, `SEASON_25_WINS`
- `SEASON_235_K`
- `SEASON_SUB_2_ERA`, `SEASON_SUB_1_5_ERA`
- `SEASON_40_SAVES`

**Negative:**
- `SEASON_200_K_BATTER`, `SEASON_250_K_BATTER`
- `SEASON_SUB_200_BA`
- `SEASON_20_LOSSES`
- `SEASON_6_ERA`

### Implementation

```typescript
// src/utils/milestoneDetector.ts

interface MilestoneThreshold {
  stat: string;
  threshold: number;
  comparison: 'gte' | 'lte';
  fameEventType: FameEventType;
  fameValue: number;
}

const SEASON_BATTING_MILESTONES: MilestoneThreshold[] = [
  { stat: 'homeRuns', threshold: 40, comparison: 'gte', fameEventType: 'SEASON_40_HR', fameValue: 2.5 },
  { stat: 'homeRuns', threshold: 45, comparison: 'gte', fameEventType: 'SEASON_45_HR', fameValue: 4.0 },
  // ... etc
];

// Club milestones need multiple stats
interface ClubMilestone {
  requirements: { stat: string; threshold: number }[];
  fameEventType: FameEventType;
  fameValue: number;
}

const CLUB_MILESTONES: ClubMilestone[] = [
  { requirements: [{ stat: 'homeRuns', threshold: 30 }, { stat: 'stolenBases', threshold: 30 }],
    fameEventType: 'CLUB_30_30', fameValue: 3.5 },
  // ...
];

export async function checkSeasonMilestones(
  seasonId: string,
  playerId: string,
  beforeStats: PlayerSeasonBatting,
  afterStats: PlayerSeasonBatting
): Promise<FameEvent[]> {
  const detected: FameEvent[] = [];

  for (const milestone of SEASON_BATTING_MILESTONES) {
    const beforeValue = beforeStats[milestone.stat];
    const afterValue = afterStats[milestone.stat];

    // Check if threshold was just crossed
    if (beforeValue < milestone.threshold && afterValue >= milestone.threshold) {
      detected.push(createSeasonMilestoneEvent(playerId, milestone));
    }
  }

  // Check club milestones
  for (const club of CLUB_MILESTONES) {
    const beforeMet = club.requirements.every(r => beforeStats[r.stat] >= r.threshold);
    const afterMet = club.requirements.every(r => afterStats[r.stat] >= r.threshold);

    if (!beforeMet && afterMet) {
      detected.push(createSeasonMilestoneEvent(playerId, club));
    }
  }

  return detected;
}
```

### Integration Point

Modify `aggregateGameToSeason()`:

```typescript
export async function aggregateGameToSeason(
  gameState: PersistedGameState,
  seasonId: string = DEFAULT_SEASON_ID
): Promise<MilestoneResult> {
  // Get BEFORE stats
  const beforeBatting = await getAllBattingStats(seasonId);
  const beforePitching = await getAllPitchingStats(seasonId);

  // Do aggregation (existing code)
  await aggregateBattingStats(gameState, seasonId);
  await aggregatePitchingStats(gameState, seasonId);
  // ...

  // Get AFTER stats
  const afterBatting = await getAllBattingStats(seasonId);
  const afterPitching = await getAllPitchingStats(seasonId);

  // Check for milestone crossings
  const milestones = await checkAllSeasonMilestones(
    seasonId,
    beforeBatting, afterBatting,
    beforePitching, afterPitching
  );

  return { milestones };
}
```

---

## Phase 3: Career Milestone System

### Status: ✅ COMPLETE

Career milestone infrastructure fully implemented with dual-factor scaling.

### Infrastructure Created ✅

1. **Career Stats Storage** ✅ `src/utils/careerStorage.ts` - IndexedDB operations
2. **Season-to-Career Aggregation** 🔄 Logic ready, needs integration
3. **Career Milestone Detection** ✅ Full detection in `milestoneDetector.ts`

### Files Created ✅

1. **`src/utils/careerStorage.ts`** ✅ - Full IndexedDB CRUD operations
2. **`src/utils/milestoneDetector.ts`** ✅ - Career milestone detection
3. **`src/hooks/useCareerStats.ts`** ⏳ Deferred (depends on UI needs)

### Data Schema

```typescript
// src/types/career.ts

interface PlayerCareerStats {
  playerId: string;
  playerName: string;

  // Counting stats (lifetime totals)
  seasons: number;
  games: number;

  // Batting
  pa: number;
  ab: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  stolenBases: number;
  walks: number;
  strikeouts: number;
  doubles: number;
  triples: number;

  // Pitching
  wins: number;
  losses: number;
  saves: number;
  pitchingOuts: number;
  pitchingStrikeouts: number;
  earnedRuns: number;
  shutouts: number;
  completeGames: number;
  noHitters: number;
  perfectGames: number;

  // Fielding
  errors: number;

  // Achievements
  allStarSelections: number;
  mvpAwards: number;
  cyYoungAwards: number;

  // Fame totals
  careerFameBonuses: number;
  careerFameBoners: number;
  careerFameNet: number;

  // Milestone tracking
  milestonesAchieved: AchievedMilestone[];

  // Metadata
  firstSeason: string;
  lastSeason: string;
  lastUpdated: number;
}

interface AchievedMilestone {
  milestoneId: string;
  achievedAt: number;
  seasonId: string;
  value: number;  // The actual stat value when achieved
}
```

### Career Milestone Thresholds - UPDATED

**Implementation Change (Jan 2026)**: Thresholds are now stored as **MLB baseline values** (162 games, 9 innings) with **dynamic scaling** applied at runtime.

#### Dual-Factor Scaling System

```typescript
// Constants
export const MLB_BASELINE_GAMES = 162;
export const MLB_BASELINE_INNINGS = 9;
export const SMB4_DEFAULT_GAMES = 128;
export const SMB4_DEFAULT_INNINGS = 6;

// Scaling factors
const seasonFactor = gamesPerSeason / MLB_BASELINE_GAMES;  // 128/162 = 0.79
const inningsFactor = inningsPerGame / MLB_BASELINE_INNINGS; // 6/9 = 0.67
const combinedFactor = seasonFactor * inningsFactor;  // 0.79 × 0.67 = 0.53
```

#### Scaling Types

Each milestone category has a `scalingType` field:

| scalingType | Formula | Use Case |
|-------------|---------|----------|
| `'counting'` | seasonFactor only | HR, RBI, Hits, Wins, Saves |
| `'innings'` | seasonFactor × inningsFactor | K, IP (faster accumulation in shorter games) |
| `'none'` | No scaling | All-Star, MVP, Rare events |

#### Example (MLB Baseline → SMB4 Scaled)

| Milestone | MLB Baseline | SMB4 (128g/6inn) | scalingType |
|-----------|-------------|-----------------|-------------|
| 500 HR | 500 | 395 | counting |
| 3000 K | 3000 | 1590 | innings |
| MVP | 1 | 1 | none |

### Aggregation Flow

```
Season Ends (manual trigger or after final game)
    ↓
finalizeSeasonToCareer(seasonId)
    ↓
For each player:
  1. Get season stats
  2. Get/create career stats
  3. Add season totals to career totals
  4. Check career milestones (before vs after)
  5. Create Fame events for any crossed thresholds
  6. Save career stats
    ↓
Return all milestone events for display
```

---

## Implementation Order

### Batch 1: Single-Game Expansion (Estimated: 2-3 hours)

1. Add new FameEventTypes to `game.ts`
2. Add detection functions to `useFameDetection.ts`:
   - `detectMaddux`
   - `detectCompleteGame`
   - `detectShutout`
   - `detectTitaniumSombrero`
   - `detectMultiHitGame` (3/4 hits)
   - `detectHighRBIGame` (5/8/10 RBI)
   - `detectWalkedInRun`
   - `detectBlownLead`
3. Add `checkEndGameFame` calls for CG/SHO/Maddux
4. Add per-inning tracking for Immaculate Inning
5. Test all new detections

### Batch 2: Season Milestones (Estimated: 3-4 hours)

1. Create `src/utils/milestoneDetector.ts` with:
   - Season milestone threshold definitions
   - Club milestone definitions
   - `checkSeasonMilestones()` function
2. Add season milestone FameEventTypes to `game.ts`
3. Modify `aggregateGameToSeason()` to:
   - Capture before/after stats
   - Call milestone detector
   - Return detected milestones
4. Update GameTracker to display season milestone notifications
5. Test season milestone detection

### Batch 3: Career System (Estimated: 4-5 hours)

1. Create `src/types/career.ts` with interfaces
2. Create `src/utils/careerStorage.ts` with IndexedDB operations
3. Create `src/utils/careerAggregator.ts` with:
   - `aggregateSeasonToCareer()`
   - Career milestone detection
4. Add career milestone FameEventTypes to `game.ts`
5. Create UI for:
   - Season finalization
   - Career milestone notifications
   - Career stats display
6. Test career milestone detection

---

## Testing Strategy

### Single-Game Milestones
- Simulate games with extreme stats (6K, CGSO with 80 pitches, etc.)
- Verify Fame events are created with correct values
- Verify deduplication works (don't fire same milestone twice)

### Season Milestones
- Use debug tools to set season stats near thresholds
- Complete a game that pushes stats over threshold
- Verify milestone detected exactly once
- Test club milestones with multiple stat requirements

### Career Milestones
- Create test career with stats near thresholds
- Aggregate a season that pushes over threshold
- Verify milestone detected and recorded
- Test multi-tier milestones (200 HR, then 395 HR, etc.)

---

## Design Decisions (Confirmed)

### 1. Immaculate Inning Tracking
**Decision**: Per-inning pitch tracking

Add state to track `pitchesThisInning` and `strikeoutsThisInning`, reset at each half-inning change. This enables accurate Immaculate Inning detection.

### 2. Season/Career Aggregation Timing
**Decision**: Game-by-game aggregation with pre-game milestone awareness

The system should:
- Aggregate to BOTH season AND career stats after each game
- At game start, calculate which milestones are "within reach" this game
- When a milestone is crossed mid-game, the activity log triggers awareness
- This creates a "milestone watch" system where approaching milestones are highlighted

**Architecture**:
```
Game Start
    ↓
loadMilestoneContext()  ← Calculate "milestones within reach"
    ↓
During Game
    ↓
Activity Log shows milestone approach ("5 HR away from 100 career HR!")
    ↓
When stat crosses threshold → Milestone notification
    ↓
Game End
    ↓
aggregateGameToSeason() + aggregateGameToCareer()
    ↓
Persist milestone achievements
```

### 3. Adaptive Threshold Scaling
**Decision**: Dual-factor configurable scaling ✅ IMPLEMENTED

Store both `gamesPerSeason` AND `inningsPerGame` in franchise/season settings:

```typescript
export interface MilestoneConfig {
  gamesPerSeason: number;    // Default: 128 (SMB4)
  inningsPerGame: number;    // Default: 6 (SMB4)
}

// Three scaling types based on stat category
function scaleThreshold(threshold: number, scalingType: string, config: MilestoneConfig) {
  switch (scalingType) {
    case 'counting':
      return Math.round(threshold * (config.gamesPerSeason / 162));
    case 'innings':
      return Math.round(threshold * (config.gamesPerSeason / 162) * (config.inningsPerGame / 9));
    case 'none':
    default:
      return threshold;
  }
}
```

This allows proper scaling for:
- **Counting stats** (HR, RBI, Hits): Scale by games only
- **Innings-dependent stats** (K, IP): Scale by games × innings
- **Rate/rare stats** (ERA, no-hitters): No scaling

---

## Updated Implementation Order

### Batch 1: Single-Game Expansion + Per-Inning Tracking ✅ COMPLETE

1. ✅ Add per-inning state tracking:
   - `pitchesThisInning`, `strikeoutsThisInning`
   - Reset on half-inning change
2. ✅ Add new FameEventTypes
3. ✅ Implement detection functions
4. ✅ Wire into checkForFameEvents and checkEndGameFame

### Batch 2: Career Stats Infrastructure ✅ COMPLETE

1. ✅ Create `careerStorage.ts` with IndexedDB operations
2. ✅ Create `PlayerCareerBatting` / `PlayerCareerPitching` interfaces
3. 🔄 Modify `aggregateGameToSeason` to also call `aggregateGameToCareer`
4. 🔄 Career stats now update game-by-game

### Batch 3: Milestone Watch System ✅ COMPLETE

1. ✅ Create `milestoneDetector.ts` with:
   - Threshold definitions (season + career)
   - `getApproachingMilestones()` function
   - `checkCareerBattingMilestones()` / `checkCareerPitchingMilestones()`
   - `checkSeasonBattingMilestones()` / `checkSeasonPitchingMilestones()`
2. 🔄 At game start, load milestone context
3. ⏳ Display "milestone watch" in UI (deferred)
4. 🔄 Trigger celebration when milestones crossed

### Batch 4: Configurable Scaling ✅ COMPLETE

1. 🔄 Add `MilestoneConfig` to season/franchise metadata
2. ✅ Scaling logic in `milestoneDetector.ts` (dual-factor)
3. ✅ All milestone thresholds use scaled values via `scalingType`
4. ⏳ UI shows both raw stat and "equivalent pace" (deferred)

---

## Remaining Work

### Integration Tasks (Phase 4)

1. **Wire milestone detection into aggregation flow**
   - Call `checkSeasonBattingMilestones()` in `aggregateGameToSeason()`
   - Call `checkCareerBattingMilestones()` in new career aggregation
   - Return detected milestones to GameTracker for display

2. **Add MilestoneConfig to franchise/season storage**
   - Load config at game start
   - Pass config to all milestone detection functions

### UI Tasks (Phase 5 - Deferred)

**Decision (Jan 2026)**: UI design deferred until all backend calculations complete.

- Franchise settings screen (gamesPerSeason, inningsPerGame)
- Milestone watch display
- Career stats view
- Milestone achievement notifications

---

*Plan created: January 22, 2026*
*Updated with implementation progress: January 22, 2026*
