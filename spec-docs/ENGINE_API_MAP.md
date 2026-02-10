# GameTracker Engine API Map

Generated: 2026-02-08
Discovery method: Static analysis + proof-of-life execution

---

## 1. Architecture Overview

The GameTracker engine is a **React-coupled state machine** implemented as a single hook (`useGameState`) with a shadow tracking layer (`inheritedRunnerTracker`). The primary logic lives in two locations:

| Layer | File | Lines | Purpose |
|-------|------|-------|---------|
| **State Machine** | `src/src_figma/hooks/useGameState.ts` | 3,089 | All game state, at-bat processing, scoring |
| **ER Attribution** | `src/src_figma/app/engines/inheritedRunnerTracker.ts` | ~510 | Pitcher responsibility tracking (pure TS) |
| **UI Entry Point** | `src/src_figma/app/pages/GameTracker.tsx` | 3,797 | UI layer that calls useGameState |

### File Inventory

**Core Engines (src/engines/) -- 18 files:**

| File | Purpose | React-Coupled |
|------|---------|---------------|
| `adaptiveLearningEngine.ts` | Adaptive learning/progression | NO |
| `agingEngine.ts` | Player aging simulation | NO |
| `bwarCalculator.ts` | Batting WAR calculation | NO |
| `clutchCalculator.ts` | Clutch performance metrics | NO |
| `detectionFunctions.ts` | ~45 event detection functions | NO |
| `fameEngine.ts` | Fame bonus/boner system | NO |
| `fanMoraleEngine.ts` | Fan morale tracking | NO |
| `fitnessEngine.ts` | Player fitness states | NO |
| `fwarCalculator.ts` | Fielding WAR calculation | NO |
| `leverageCalculator.ts` | Leverage Index (BASE_OUT_LI table) | NO |
| `mojoEngine.ts` | Mojo level system | NO |
| `mwarCalculator.ts` | Manager WAR calculation | NO |
| `narrativeEngine.ts` | Game narrative generation | NO |
| `pwarCalculator.ts` | Pitching WAR calculation | NO |
| `relationshipEngine.ts` | Player relationship tracking | NO |
| `rwarCalculator.ts` | Baserunning WAR calculation | NO |
| `salaryCalculator.ts` | Salary calculation (1196 lines) | NO |
| `index.ts` | Re-exports | NO |

**Integration Engines (src/src_figma/app/engines/) -- 13 files:**

| File | Purpose | React-Coupled |
|------|---------|---------------|
| `inheritedRunnerTracker.ts` | ER/UER attribution (pure TS) | NO |
| `d3kTracker.ts` | Dropped 3rd strike tracking | NO |
| `saveDetector.ts` | Save opportunity detection | NO |
| `adaptiveLearningEngine.ts` | UI adapter for adaptive learning | NO |
| `detectionIntegration.ts` | Detection function integration | Depends on context |
| `fameIntegration.ts` | Fame system integration | Depends on context |
| `fanMoraleIntegration.ts` | Fan morale integration | Depends on context |
| `mwarIntegration.ts` | Manager WAR integration | Depends on context |
| `playerStateIntegration.ts` | Player state integration | Depends on context |
| `relationshipIntegration.ts` | Relationship integration | Depends on context |
| `agingIntegration.ts` | Aging integration | Depends on context |
| `narrativeIntegration.ts` | Narrative integration | Depends on context |
| `index.ts` | Re-exports all integration engines | NO |

**Type Definitions:**

| File | Purpose |
|------|---------|
| `src/types/game.ts` | Core game types (AtBatResult, FieldingData, FameEventType, Bases, etc.) |
| `src/types/index.ts` | Legacy player/team types |
| `src/types/war.ts` | WAR calculation types |
| `src/src_figma/app/types/game.ts` | App-level game types |
| `src/src_figma/app/types/substitution.ts` | Substitution event types |
| `src/src_figma/app/types/war.ts` | App-level WAR types |
| `src/src_figma/app/types/index.ts` | App type re-exports |

---

## 2. Type Definitions (Verbatim)

### 2.1 AtBatResult (src/types/game.ts:12-14)

```typescript
export type AtBatResult =
  | '1B' | '2B' | '3B' | 'HR' | 'BB' | 'IBB' | 'K' | 'KL'
  | 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'TP' | 'SF' | 'SAC' | 'HBP' | 'E' | 'FC' | 'D3K';
```

### 2.2 GameState (src/src_figma/hooks/useGameState.ts:46-64)

```typescript
export interface GameState {
  gameId: string;
  homeScore: number;
  awayScore: number;
  inning: number;
  isTop: boolean;
  outs: number;
  balls: number;
  strikes: number;
  bases: { first: boolean; second: boolean; third: boolean };
  currentBatterId: string;
  currentBatterName: string;
  currentPitcherId: string;
  currentPitcherName: string;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
}
```

### 2.3 ScoreboardState (src/src_figma/hooks/useGameState.ts:66-70)

```typescript
export interface ScoreboardState {
  innings: { away: number | undefined; home: number | undefined }[];
  away: { runs: number; hits: number; errors: number };
  home: { runs: number; hits: number; errors: number };
}
```

### 2.4 PlayerGameStats (src/src_figma/hooks/useGameState.ts:72-87)

```typescript
export interface PlayerGameStats {
  pa: number;
  ab: number;
  h: number;
  singles: number;
  doubles: number;
  triples: number;
  hr: number;
  r: number;
  rbi: number;
  bb: number;
  hbp: number;    // MAJ-07: Track HBP separately from BB
  k: number;
  sb: number;
  cs: number;
}
```

### 2.5 PitcherGameStats (src/src_figma/hooks/useGameState.ts:89-124)

```typescript
export interface PitcherGameStats {
  // Core counting stats
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;         // BB only (not IBB or HBP)
  strikeoutsThrown: number;
  homeRunsAllowed: number;
  pitchCount: number;
  battersFaced: number;
  // MAJ-07: New counting stats per PITCHER_STATS_TRACKING_SPEC.md
  intentionalWalks: number;     // IBB
  hitByPitch: number;           // HBP
  wildPitches: number;          // WP
  basesLoadedWalks: number;     // BB/HBP/IBB with bases loaded
  firstInningRuns: number;      // Runs allowed in first inning (starters only)
  consecutiveHRsAllowed: number; // Current streak of consecutive HR allowed
  // Role/timing fields
  isStarter: boolean;
  entryInning: number;
  entryOuts: number;
  exitInning: number | null;
  exitOuts: number | null;
  finishedGame: boolean;
  // Inherited/bequeathed runners
  inheritedRunners: number;
  inheritedRunnersScored: number;
  bequeathedRunners: number;
  bequeathedRunnersScored: number;
  // MAJ-08: Pitcher decisions
  decision: 'W' | 'L' | 'ND' | null;
  save: boolean;
  hold: boolean;
  blownSave: boolean;
}
```

### 2.6 RunnerAdvancement (src/src_figma/hooks/useGameState.ts:126-130)

```typescript
export interface RunnerAdvancement {
  fromFirst?: 'second' | 'third' | 'home' | 'out';
  fromSecond?: 'third' | 'home' | 'out';
  fromThird?: 'home' | 'out';
}
```

### 2.7 Action Types (src/src_figma/hooks/useGameState.ts:132-143)

```typescript
export type HitType = '1B' | '2B' | '3B' | 'HR';
export type OutType = 'K' | 'KL' | 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'TP' | 'FC' | 'SF' | 'SH' | 'D3K';
export type WalkType = 'BB' | 'HBP' | 'IBB';
export type ReachOnErrorType = 'E';
export type EventType =
  | 'SB' | 'CS' | 'WP' | 'PB' | 'PICK'
  | 'KILLED' | 'NUTSHOT'
  | 'WEB_GEM' | 'ROBBERY'
  | 'TOOTBLAN'
  | 'BEAT_THROW' | 'BUNT'
  | 'STRIKEOUT' | 'STRIKEOUT_LOOKING' | 'DROPPED_3RD_STRIKE'
  | 'SEVEN_PLUS_PITCH_AB';
```

### 2.8 PitchCountPrompt (src/src_figma/hooks/useGameState.ts:146-154)

```typescript
export interface PitchCountPrompt {
  type: 'pitching_change' | 'end_game' | 'end_inning';
  pitcherId: string;
  pitcherName: string;
  currentCount: number;
  lastVerifiedInning: number;
  newPitcherId?: string;
}
```

### 2.9 GameInitConfig (src/src_figma/hooks/useGameState.ts:221-234)

```typescript
export interface GameInitConfig {
  gameId: string;
  seasonId: string;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  awayStartingPitcherId: string;
  awayStartingPitcherName: string;
  homeStartingPitcherId: string;
  homeStartingPitcherName: string;
  awayLineup: { playerId: string; playerName: string; position: string }[];
  homeLineup: { playerId: string; playerName: string; position: string }[];
}
```

### 2.10 Bases (Two Versions)

**Boolean version (src/src_figma/hooks/useGameState.ts:286-290):**
```typescript
export interface Bases {
  first: boolean;
  second: boolean;
  third: boolean;
}
```

**Runner-object version (src/types/game.ts:113-117):**
```typescript
export interface Bases {
  first: Runner | null;
  second: Runner | null;
  third: Runner | null;
}
```

The boolean version is used in `GameState` for the main state machine. The Runner-object version is used in `game.ts` types and the inherited runner tracker. The `runnerTrackerRef` shadow state bridges these two representations.

### 2.11 RunnerOutcome (src/src_figma/hooks/useGameState.ts:284)

```typescript
export type RunnerOutcome = 'SCORED' | 'TO_3B' | 'TO_2B' | 'HELD' | 'OUT_HOME' | 'OUT_3B' | 'OUT_2B';
```

### 2.12 Inherited Runner Tracker Types (src/src_figma/app/engines/inheritedRunnerTracker.ts:27-90)

```typescript
export interface TrackedRunner {
  runnerId: string;
  runnerName: string;
  currentBase: '1B' | '2B' | '3B' | 'HOME' | 'OUT' | null;
  startingBase: '1B' | '2B' | '3B' | 'HOME';
  howReached: HowReached;
  responsiblePitcherId: string;
  responsiblePitcherName: string;
  isInherited: boolean;
  inheritedFromPitcherId: string | null;
  inningReached: number;
  atBatReached: number;
}

export interface PitcherRunnerStats {
  pitcherId: string;
  pitcherName: string;
  runnersOnBase: TrackedRunner[];
  runnersScored: TrackedRunner[];
  inheritedRunners: TrackedRunner[];
  inheritedRunnersScored: TrackedRunner[];
  bequeathedRunnerCount: number;
}

export interface RunnerTrackingState {
  runners: TrackedRunner[];
  currentPitcherId: string;
  currentPitcherName: string;
  pitcherStats: Map<string, PitcherRunnerStats>;
  inning: number;
  atBatNumber: number;
}

export interface RunnerScoredEvent {
  runner: TrackedRunner;
  wasEarnedRun: boolean;
  chargedToPitcherId: string;
  chargedToPitcherName: string;
  wasInherited: boolean;
}
```

### 2.13 FieldingData (src/types/game.ts:61-104)

```typescript
export interface FieldingData {
  primaryFielder: Position;
  playType: PlayType;
  errorType?: ErrorType;
  errorContext?: ErrorContext;
  zoneId?: string;
  foulOut?: boolean;
  depth?: DepthType;
  assistChain: AssistChainEntry[];
  putoutPosition: Position;
  dpRole?: DPRole;
  inferredFielder: Position;
  wasOverridden: boolean;
  infieldFlyRule: boolean;
  ifrBallCaught: boolean | null;
  groundRuleDouble: boolean;
  badHopEvent: boolean;
  d3kEvent: boolean;
  d3kOutcome: D3KOutcome | null;
  nutshotEvent: boolean;
  comebackerInjury: boolean;
  robberyAttempted: boolean;
  robberyFailed: boolean;
  savedRun: boolean;
}
```

### 2.14 FameEventType (src/types/game.ts:571-756)

~130 member union type covering bonuses (positive Fame) and boners (negative Fame). Categories:
- Walk-Off Events (3 types)
- Defensive Highlights (6 types)
- Home Run Events (5 types)
- Multi-Hit Events (15 types)
- Pitching Excellence (12 types)
- SMB4 Special Events (4 types)
- Position Player Pitching (3 types)
- Team/Game Events (4 types)
- Single-Game Milestones (2 types)
- Season Milestones Batting (9 types + 5 clubs)
- Season Milestones Pitching (8 types)
- Career Milestones Batting (8 tiered)
- Career Milestones Pitching (8 tiered)
- Career Milestones Aggregate (6 tiered)
- Strikeout Shame (5 types)
- Offensive Failures (5 types)
- Pitching Disasters (8 types)
- Fielding Errors (6 types)
- Baserunning Blunders (5 types)
- Position Player Pitching Failures (1 type)
- Season Negative Milestones (10 types)
- Career Negative Milestones (9 tiered)

---

## 3. UseGameStateReturn Interface (Verbatim)

File: `src/src_figma/hooks/useGameState.ts:156-219`

```typescript
export interface UseGameStateReturn {
  // Game state
  gameState: GameState;
  scoreboard: ScoreboardState;
  playerStats: Map<string, PlayerGameStats>;
  pitcherStats: Map<string, PitcherGameStats>;

  // Actions
  recordHit: (hitType: HitType, rbi: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>;
  recordOut: (outType: OutType, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>;
  recordWalk: (walkType: WalkType, pitchCount?: number) => Promise<void>;
  recordD3K: (batterReached: boolean, pitchCount?: number) => Promise<void>;
  recordError: (rbi?: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>;
  recordEvent: (eventType: EventType, runnerId?: string) => Promise<void>;
  advanceRunner: (from: 'first' | 'second' | 'third', to: 'second' | 'third' | 'home', outcome: 'safe' | 'out') => void;
  advanceRunnersBatch: (movements: Array<{ from: 'first' | 'second' | 'third'; to: 'second' | 'third' | 'home' | 'out'; outcome: 'safe' | 'out' }>) => void;
  makeSubstitution: (benchPlayerId: string, lineupPlayerId: string, benchPlayerName?: string, lineupPlayerName?: string, options?: { subType?: 'player_sub' | 'pinch_hit' | 'pinch_run' | 'defensive_sub' | 'position_switch' | 'double_switch'; newPosition?: string; base?: '1B' | '2B' | '3B'; isPinchHitter?: boolean }) => void;
  switchPositions: (switches: Array<{ playerId: string; newPosition: string }>) => void;
  changePitcher: (newPitcherId: string, exitingPitcherId: string, newPitcherName?: string, exitingPitcherName?: string) => void;
  advanceCount: (type: 'ball' | 'strike' | 'foul') => void;
  resetCount: () => void;
  endInning: () => void;
  endGame: () => Promise<void>;

  // Pitch count prompts
  pitchCountPrompt: PitchCountPrompt | null;
  confirmPitchCount: (pitcherId: string, finalCount: number) => void;
  dismissPitchCountPrompt: () => void;

  // Initialization
  initializeGame: (config: GameInitConfig) => Promise<void>;
  loadExistingGame: () => Promise<boolean>;

  // Undo support
  restoreState: (snapshot: {
    gameState: GameState;
    scoreboard: ScoreboardState;
    playerStats?: Map<string, PlayerGameStats>;
    pitcherStats?: Map<string, PitcherGameStats>;
    runnerTrackerState?: {
      runners: RunnerTrackingState['runners'];
      currentPitcherId: string;
      currentPitcherName: string;
      pitcherStats: Map<string, PitcherRunnerStats>;
      inning: number;
      atBatNumber: number;
    };
  }) => void;
  getRunnerTrackerSnapshot: () => {
    runners: RunnerTrackingState['runners'];
    currentPitcherId: string;
    currentPitcherName: string;
    pitcherStatsEntries: [string, PitcherRunnerStats][];
    inning: number;
    atBatNumber: number;
  };

  // Loading/persistence
  isLoading: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  atBatSequence: number;
}
```

---

## 4. State-Modifying Functions

All state-modifying functions are defined inside `useGameState()` as `useCallback` closures. They are React-coupled because they call `setGameState`, `setScoreboard`, `setPlayerStats`, `setPitcherStats`, etc.

### 4.1 recordHit

```
File: src/src_figma/hooks/useGameState.ts
Lines: 1099-1345
Signature: (hitType: HitType, rbi: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>
React-coupled: YES (useState setters)
```

**What it does:**
1. Increments atBatSequence
2. Calculates runs scored from runnerData and HR
3. Updates inherited runner tracker (advance existing runners, add batter)
4. Calculates leverage index via `getBaseOutLI()`
5. Detects walk-off scenarios
6. Creates AtBatEvent and persists via `logAtBatEvent()`
7. Updates gameState (score, bases, outs)
8. Updates scoreboard (inning scores, R/H/E)
9. Updates playerStats (PA, AB, H, singles/doubles/triples/HR, RBI, R)
10. Updates pitcherStats (H allowed, HR allowed, batters faced, ER via tracker)
11. Calls `advanceToNextBatter()`

### 4.2 recordOut

```
File: src/src_figma/hooks/useGameState.ts
Lines: 1347-1602
Signature: (outType: OutType, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>
React-coupled: YES
```

**What it does:**
1. Tracks inning strikeouts for immaculate inning detection (K, KL)
2. Calculates outsOnPlay: DP=2, TP=3, FC=runner outs only (batter safe), other=1+runner outs
3. Calculates runs scored from runnerData
4. Updates runner tracker (advance/out runners, FC adds batter to 1B)
5. Processes ER attribution via `processTrackerScoredEvents()`
6. Creates AtBatEvent and persists
7. Updates gameState (outs, bases, score)
8. Updates scoreboard
9. Updates playerStats (PA, AB, K, RBI, R; FC counts as AB not PA-only)
10. Updates pitcherStats (K, outs recorded, batters faced, runs/ER)
11. Auto-triggers endInning if newOuts >= 3
12. Calls `advanceToNextBatter()` if inning not over

### 4.3 recordWalk

```
File: src/src_figma/hooks/useGameState.ts
Lines: 1604-1602
Signature: (walkType: WalkType, pitchCount?: number) => Promise<void>
React-coupled: YES
```

**What it does:**
1. Checks for bases loaded walk (1 run scores)
2. Updates runner tracker: force-advance pattern (third -> second -> first, then add batter to 1B)
3. ER attribution for bases-loaded walk runs
4. Creates AtBatEvent and persists
5. Updates gameState (bases shift, score if bases loaded)
6. Updates scoreboard
7. Updates playerStats (PA, BB or HBP, RBI if applicable)
8. Updates pitcherStats (BB/IBB/HBP, bases loaded walks, batters faced)
9. Walk-off detection
10. Calls `advanceToNextBatter()`

### 4.4 recordD3K

```
File: src/src_figma/hooks/useGameState.ts
Lines: 1802-1920
Signature: (batterReached: boolean, pitchCount?: number) => Promise<void>
React-coupled: YES
```

**What it does:**
1. Tracks strikeout for immaculate inning
2. If batterReached=true: batter goes to 1B (no out added)
3. If batterReached=false: 1 out added
4. Updates runner tracker if batter reaches
5. Creates AtBatEvent (result='K') and persists
6. Updates gameState
7. Updates playerStats (PA, AB, K)
8. Updates pitcherStats (K, outs if applicable)
9. Auto-triggers endInning if 3 outs

### 4.5 recordError

```
File: src/src_figma/hooks/useGameState.ts
Lines: 1922-2126
Signature: (rbi?: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>
React-coupled: YES
```

**What it does:**
1. Calculates runs scored from runnerData
2. Updates runner tracker (advance runners, batter to 1B with howReached='error')
3. Runs scored on errors are UNEARNED (no ER credit)
4. Creates AtBatEvent (result='E') and persists
5. Updates gameState (bases, score)
6. Updates scoreboard (errors count incremented for fielding team)
7. Updates playerStats (PA, AB; NO RBI on errors per rule)
8. Updates pitcherStats (H allowed, batters faced; runs are UER not ER)
9. Calls `advanceToNextBatter()`

### 4.6 recordEvent

```
File: src/src_figma/hooks/useGameState.ts
Lines: 2128-2236
Signature: (eventType: EventType, runnerId?: string) => Promise<void>
React-coupled: YES
```

**What it does:**
1. Calculates leverage index for Fame weighting
2. Records Fame events for applicable eventTypes (WEB_GEM, ROBBERY, TOOTBLAN, KILLED, NUTSHOT)
3. Updates playerStats for SB/CS
4. Updates pitcherStats for WP
5. Does NOT modify gameState bases/outs (handled separately by advanceRunner)

### 4.7 advanceRunner

```
File: src/src_figma/hooks/useGameState.ts
Lines: 2238-2307
Signature: (from: 'first' | 'second' | 'third', to: 'second' | 'third' | 'home', outcome: 'safe' | 'out') => void
React-coupled: YES
```

**What it does:**
1. Updates runner tracker (advance or out)
2. Processes ER attribution if runner scores
3. Updates gameState (bases, outs, score)
4. Updates scoreboard inning scores if run scored

### 4.8 advanceRunnersBatch

```
File: src/src_figma/hooks/useGameState.ts
Lines: 2314-2412
Signature: (movements: Array<{ from: 'first' | 'second' | 'third'; to: 'second' | 'third' | 'home' | 'out'; outcome: 'safe' | 'out' }>) => void
React-coupled: YES
```

**What it does:**
1. Atomic batch processing of multiple runner movements (avoids race conditions)
2. Updates runner tracker for all movements
3. Updates gameState (bases, outs, score) in single setState call
4. Updates scoreboard if runs scored

### 4.9 advanceCount

```
File: src/src_figma/hooks/useGameState.ts
Lines: 2414-2425
Signature: (type: 'ball' | 'strike' | 'foul') => void
React-coupled: YES
```

**What it does:**
- ball: `balls = min(balls+1, 3)`
- strike: `strikes = min(strikes+1, 2)`
- foul: `strikes = min(strikes+1, 2)` (same as strike, foul cannot go past 2)

### 4.10 makeSubstitution

```
File: src/src_figma/hooks/useGameState.ts
Lines: 2431-2500
Signature: (benchPlayerId: string, lineupPlayerId: string, benchPlayerName?: string, lineupPlayerName?: string, options?: {...}) => void
React-coupled: YES
```

**What it does:**
1. Logs substitution event to substitutionLog
2. Updates lineup refs (awayLineupRef or homeLineupRef)
3. If replacing current batter or isPinchHitter, updates gameState currentBatter
4. Initializes playerStats for new player

### 4.11 switchPositions

```
File: src/src_figma/hooks/useGameState.ts
Lines: 2502-2533
Signature: (switches: Array<{ playerId: string; newPosition: string }>) => void
React-coupled: YES
```

**What it does:**
1. Updates position in lineup refs
2. Logs position switch to substitutionLog

### 4.12 changePitcher

```
File: src/src_figma/hooks/useGameState.ts
Lines: 2535-2616
Signature: (newPitcherId: string, exitingPitcherId: string, newPitcherName?: string, exitingPitcherName?: string) => void
React-coupled: YES
```

**What it does:**
1. Shows pitch count prompt for exiting pitcher (deferred action pattern)
2. Pending action (executed after pitch count confirmed):
   - Logs pitching change to substitutionLog
   - Sets exit info on outgoing pitcher (exitInning, exitOuts, bequeathedRunners)
   - Initializes new pitcher stats (entryInning, entryOuts, inheritedRunners)
   - Notifies runner tracker via `trackerHandlePitchingChange()`
   - Updates gameState currentPitcher
   - Tracks pitcher name in pitcherNamesRef

### 4.13 confirmPitchCount

```
File: src/src_figma/hooks/useGameState.ts
Lines: 2619-2654
Signature: (pitcherId: string, finalCount: number) => void
React-coupled: YES
```

**What it does:**
1. Detects immaculate inning (9 pitches + 3 K in half-inning)
2. Updates pitcher pitchCount stat
3. Executes pending action (pitching change, end inning, or end game)
4. Clears pitch count prompt

### 4.14 endInning

```
File: src/src_figma/hooks/useGameState.ts
Lines: 2713-2727
Signature: () => void
React-coupled: YES
```

**What it does:**
1. Shows pitch count prompt for current pitcher
2. Stores executeEndInning as pending action

**executeEndInning (line 2676-2711):**
1. Clears runner tracker bases, advances inning
2. Toggles isTop, increments inning if switching from BOTTOM to TOP
3. Resets outs, balls, strikes, bases
4. Sets next batter from batting order
5. Resets inning pitch counter

### 4.15 endGame

```
File: src/src_figma/hooks/useGameState.ts
Lines: 2871-3001
Signature: () => Promise<void>
React-coupled: YES
```

**What it does:**
1. Archives game for post-game summary via `archiveCompletedGame()`
2. Shows pitch count prompt for current pitcher
3. Stores `completeGameInternal` as pending action

**completeGameInternal (line 2733-2869):**
1. Calls `completeGame()` to mark game complete in IndexedDB
2. Marks last pitcher as `finishedGame=true`
3. Calls `calculatePitcherDecisions()` for W/L/SV/H/BS
4. Builds `PersistedGameState` object
5. Calls `aggregateGameToSeason()` for season stat aggregation
6. Calls `markGameAggregated()` to prevent re-aggregation
7. Calls `archiveCompletedGame()` with full stats

### 4.16 initializeGame

```
File: src/src_figma/hooks/useGameState.ts
Lines: 931-1022
Signature: (config: GameInitConfig) => Promise<void>
React-coupled: YES
```

**What it does:**
1. Clears all state from previous game
2. Stores lineup refs and seasonId ref
3. Creates game header in IndexedDB via `createGameHeader()`
4. Initializes playerStats for all lineup players
5. Initializes pitcherStats for both starting pitchers
6. Initializes runner tracker with home starting pitcher
7. Sets initial gameState (inning 1, top, leadoff batter)

### 4.17 restoreState

```
File: src/src_figma/hooks/useGameState.ts
Lines: 3020-3047
Signature: (snapshot: { gameState, scoreboard, playerStats?, pitcherStats?, runnerTrackerState? }) => void
React-coupled: YES
```

**What it does:**
1. Restores gameState, scoreboard from snapshot
2. Optionally restores playerStats and pitcherStats Maps
3. Optionally restores runnerTrackerRef state

### 4.18 getRunnerTrackerSnapshot

```
File: src/src_figma/hooks/useGameState.ts
Lines: 3005-3015
Signature: () => { runners, currentPitcherId, currentPitcherName, pitcherStatsEntries, inning, atBatNumber }
React-coupled: YES (reads useRef)
```

**What it does:**
Converts runner tracker state to serializable format (Map -> entries array) for undo system.

---

## 5. Pure Logic Functions (Exported, Non-React)

These functions are exported from `useGameState.ts` but are **pure functions** with no React dependencies. They can be imported and tested directly.

### 5.1 isRunnerForced

```
File: src/src_figma/hooks/useGameState.ts
Lines: 296-334
Signature: (base: 'first' | 'second' | 'third', result: AtBatResult, bases: Bases) => boolean
React-coupled: NO
```

Rules:
- BB/IBB/HBP: R1 always forced, R2 forced if R1 exists, R3 forced if bases loaded
- 1B: R1 forced
- 2B: R1 and R2 forced
- 3B: All runners forced
- FC: R1 forced
- Outs: No forces

### 5.2 getMinimumAdvancement

```
File: src/src_figma/hooks/useGameState.ts
Lines: 340-364
Signature: (base: 'first' | 'second' | 'third', result: AtBatResult, bases: Bases) => 'second' | 'third' | 'home' | null
React-coupled: NO
```

Returns null if not forced. Special: on 2B, R1 must go to at least 3B. On 3B, all go home.

### 5.3 getDefaultRunnerOutcome

```
File: src/src_figma/hooks/useGameState.ts
Lines: 370-482
Signature: (base: 'first' | 'second' | 'third', result: AtBatResult, outs: number, bases: Bases) => RunnerOutcome
React-coupled: NO
```

Returns the standard/expected outcome for each base/result combination. Key rules:
- HR/3B: all SCORED
- 2B: R3/R2 SCORED, R1 TO_3B
- 1B: R3 SCORED, R2 TO_3B, R1 TO_2B
- FO with R3 and <2 outs: R3 SCORED (tag up)
- DP: R1 OUT_2B
- TP: R1 OUT_2B, R2 OUT_3B
- SF: R3 SCORED
- SAC: R1 TO_2B, R2 TO_3B
- FC: R1 OUT_2B
- E: Everyone advances one base

### 5.4 autoCorrectResult

```
File: src/src_figma/hooks/useGameState.ts
Lines: 490-527
Signature: (initialResult: AtBatResult, outs: number, bases: Bases, runnerOutcomes: {...}) => { correctedResult: AtBatResult; explanation: string } | null
React-coupled: NO
```

Auto-corrections:
- FO + R3 scores + <2 outs -> SF
- GO + runner out + <2 outs -> DP

### 5.5 isExtraAdvancement

```
File: src/src_figma/hooks/useGameState.ts
Lines: 534-588
Signature: (base: 'first' | 'second' | 'third', outcome: RunnerOutcome, result: AtBatResult, bases: Bases) => boolean
React-coupled: NO
```

Returns true if runner advancement exceeds standard for the result (requires extra event like SB, WP, PB, E).

### 5.6 calculateRBIs

```
File: src/src_figma/hooks/useGameState.ts
Lines: 596-624
Signature: (result: AtBatResult, runnerOutcomes: {...}, bases: Bases) => number
React-coupled: NO
```

Rules: Count runners who scored. HR adds batter. Errors give 0 RBI. DP/TP give 0 RBI.

### 5.7 isOut / isHit / reachesBase

```
File: src/src_figma/hooks/useGameState.ts
Lines: 629-638
```

```typescript
isOut(result): ['K', 'KL', 'GO', 'FO', 'LO', 'PO', 'DP', 'TP', 'SF', 'SAC']
isHit(result): ['1B', '2B', '3B', 'HR']
reachesBase(result): ['1B', '2B', '3B', 'HR', 'BB', 'IBB', 'HBP', 'E', 'FC', 'D3K']
```

---

## 6. Inherited Runner Tracker Functions (Pure TS)

All functions in `src/src_figma/app/engines/inheritedRunnerTracker.ts` are pure TypeScript with NO React dependencies.

| Function | Line | Signature |
|----------|------|-----------|
| `createRunnerTrackingState` | 99 | `(pitcherId: string, pitcherName: string) => RunnerTrackingState` |
| `addRunner` | ~154 | `(state, runnerId, runnerName, base, howReached) => RunnerTrackingState` |
| `advanceRunner` | ~188 | `(state, runnerId, toBase) => { state: RunnerTrackingState; scoredEvent: RunnerScoredEvent \| null }` |
| `runnerOut` | ~268 | `(state, runnerId) => RunnerTrackingState` |
| `handlePitchingChange` | ~304 | `(state, newPitcherId, newPitcherName) => { state: RunnerTrackingState; bequeathedRunners: TrackedRunner[]; inheritedRunnerCount: number }` |
| `handlePinchRunner` | ~366 | `(state, oldRunnerId, newRunnerId, newRunnerName) => RunnerTrackingState` |
| `clearBases` | ~413 | `(state) => RunnerTrackingState` |
| `nextInning` | ~424 | `(state) => RunnerTrackingState` |
| `nextAtBat` | ~435 | `(state) => RunnerTrackingState` |
| `getERSummary` | ~449 | `(state) => Map<string, PitcherRunnerStats>` |
| `getCurrentBases` | ~495 | `(state) => { first: TrackedRunner \| null; second: TrackedRunner \| null; third: TrackedRunner \| null }` |

---

## 7. Entry Point Chain

### From UI Button Click to State Update

```
User clicks outcome button in GameTracker.tsx
  |
  v
GameTracker.tsx:handleEnhancedPlayComplete (line ~848)
  |  Destructured from useGameState at line 130-159
  |  Routes to appropriate record* function based on result type
  |
  +---> recordHit(hitType, rbi, runnerData, pitchCount)
  +---> recordOut(outType, runnerData, pitchCount)
  +---> recordWalk(walkType, pitchCount)
  +---> recordD3K(batterReached, pitchCount)
  +---> recordError(rbi, runnerData, pitchCount)
        |
        v
  Each record* function:
    1. Creates AtBatEvent object
    2. Calls logAtBatEvent() -> IndexedDB persistence
    3. Updates runner tracker (runnerTrackerRef)
    4. Calls setGameState() -> React re-render
    5. Calls setScoreboard() -> Inning line score update
    6. Calls setPlayerStats() -> Batter stats update
    7. Calls setPitcherStats() -> Pitcher stats update
    8. Calls advanceToNextBatter() -> Rotates lineup
```

### Non-At-Bat Events

```
User triggers non-AB event (SB, CS, WP, etc.)
  |
  v
recordEvent(eventType, runnerId?)
  |
  +---> Updates Fame events if applicable
  +---> Updates playerStats (SB/CS)
  +---> Updates pitcherStats (WP)
  |
advanceRunner(from, to, outcome) or advanceRunnersBatch(movements)
  |
  +---> Updates runner tracker
  +---> Updates gameState (bases, outs, score)
  +---> Updates scoreboard
```

### Game Completion Flow

```
User clicks "End Game"
  |
  v
endGame()
  |
  +---> Archives game via archiveCompletedGame()
  +---> Shows pitch count prompt
  +---> Stores completeGameInternal as pendingAction
  |
User confirms pitch count
  |
  v
confirmPitchCount(pitcherId, finalCount)
  |
  +---> Updates pitchCount stat
  +---> Executes completeGameInternal()
        |
        +---> completeGame() -> Marks complete in IndexedDB
        +---> calculatePitcherDecisions() -> W/L/SV/H/BS
        +---> aggregateGameToSeason() -> Season stat update
        +---> markGameAggregated() -> Prevents re-aggregation
        +---> archiveCompletedGame() -> Full game archive
```

---

## 8. Internal State Architecture

### useState Variables

| Variable | Type | Initial Value | Updated By |
|----------|------|---------------|------------|
| `gameState` | `GameState` | empty (all defaults) | All record*, advanceRunner*, endInning, restoreState |
| `scoreboard` | `ScoreboardState` | 9 empty innings | All record*, advanceRunner* |
| `playerStats` | `Map<string, PlayerGameStats>` | empty Map | All record*, recordEvent (SB/CS), makeSubstitution |
| `pitcherStats` | `Map<string, PitcherGameStats>` | empty Map | All record*, recordEvent (WP), changePitcher, confirmPitchCount |
| `fameEvents` | `FameEventRecord[]` | `[]` | recordEvent, recordHit (walk-off), confirmPitchCount (immaculate) |
| `substitutionLog` | `Array<{...}>` | `[]` | makeSubstitution, switchPositions, changePitcher |
| `pitchCountPrompt` | `PitchCountPrompt \| null` | `null` | changePitcher, endInning, endGame, confirmPitchCount, dismissPitchCountPrompt |
| `awayBatterIndex` | `number` | 0 | advanceToNextBatter |
| `homeBatterIndex` | `number` | 0 | advanceToNextBatter |
| `atBatSequence` | `number` | 0 | All record* functions |
| `isLoading` | `boolean` | true | initializeGame, loadExistingGame |
| `isSaving` | `boolean` | false | completeGameInternal |
| `lastSavedAt` | `number \| null` | null | All record* functions, completeGameInternal |

### useRef Variables (Shadow State)

| Ref | Type | Purpose |
|-----|------|---------|
| `awayLineupRef` | `{ playerId, playerName, position }[]` | Away team lineup (mutable, no re-render) |
| `homeLineupRef` | `{ playerId, playerName, position }[]` | Home team lineup (mutable, no re-render) |
| `seasonIdRef` | `string` | Season ID for aggregation |
| `pitcherNamesRef` | `Map<string, string>` | Pitcher ID -> name mapping (EXH-011 fix) |
| `runnerTrackerRef` | `RunnerTrackingState` | ER/UER attribution shadow state (CRITICAL) |
| `inningPitchesRef` | `{ pitches, strikeouts, pitcherId }` | Immaculate inning detection |
| `endInningRef` | `(() => void) \| null` | Avoids circular dependency |
| `pendingActionRef` | `(() => Promise<void>) \| null` | Deferred action after pitch count confirmation |

---

## 9. Proof-of-Life Results

### Strategy

The `useGameState` hook is React-coupled (all state-modifying functions use `useState` setters). A standalone Node.js proof-of-life script cannot call the hook directly. However, the project has two mechanisms for testing:

1. **Pure logic functions** (isRunnerForced, getDefaultRunnerOutcome, autoCorrectResult, etc.) are exported and testable directly
2. **inheritedRunnerTracker** functions are fully pure TypeScript
3. **Existing test suites** exercise the engine through React Testing Library

### Existing Test Results (serve as proof-of-life)

**Run: 2026-02-08**

```
npm test

Test Suites: 106 passed, 106 total
Tests:       5094 passed, 5094 total
```

**Key test files that exercise the engine:**

| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/runnerMovement.test.ts` | 87 | PASS |
| `tests/inheritedRunnerTracker.test.ts` | 47 | PASS |
| `tests/gameEngine.test.ts` | (varies) | PASS |
| `tests/leverageCalculator.test.ts` | (varies) | PASS |
| `tests/fameEngine.test.ts` | (varies) | PASS |

### React Coupling Assessment

```
Can engine be tested independently: PARTIAL
- Pure logic functions: YES (7 exported functions, no React)
- Inherited runner tracker: YES (all functions pure TS)
- State-modifying actions: NO (require useState/useCallback context)
- State-modifying actions testable via: React Testing Library (existing tests use this)

Dependencies requiring mocks: React (useState, useCallback, useRef, useEffect)
Recommended test runner: Vitest (already in package.json)
```

### Import Path for Test Scripts

```typescript
// Pure logic functions (no React required):
import {
  isRunnerForced,
  getMinimumAdvancement,
  getDefaultRunnerOutcome,
  autoCorrectResult,
  isExtraAdvancement,
  calculateRBIs,
  isOut,
  isHit,
  reachesBase,
  type RunnerOutcome,
  type Bases,
  type HitType,
  type OutType,
  type WalkType,
  type EventType,
  type GameState,
  type ScoreboardState,
  type PlayerGameStats,
  type PitcherGameStats,
  type RunnerAdvancement,
  type GameInitConfig,
} from '../../src/src_figma/hooks/useGameState';

// Inherited runner tracker (no React required):
import {
  createRunnerTrackingState,
  addRunner,
  advanceRunner,
  runnerOut,
  handlePitchingChange,
  handlePinchRunner,
  clearBases,
  nextInning,
  nextAtBat,
  getERSummary,
  getCurrentBases,
  type TrackedRunner,
  type RunnerTrackingState,
  type RunnerScoredEvent,
  type PitcherRunnerStats,
} from '../../src/src_figma/app/engines/inheritedRunnerTracker';

// Core types (no React required):
import type { AtBatResult } from '../../src/types/game';
```

---

## 10. Testable Dimensions

### 10.1 At-Bat Outcomes (from code)

Source: `src/src_figma/hooks/useGameState.ts:132-143` and `src/types/game.ts:12-14`

```
HitType (4):     '1B', '2B', '3B', 'HR'
OutType (12):    'K', 'KL', 'GO', 'FO', 'LO', 'PO', 'DP', 'TP', 'FC', 'SF', 'SH', 'D3K'
WalkType (3):    'BB', 'HBP', 'IBB'
ErrorType (1):   'E'
Total: 20 distinct AtBatResult values
```

### 10.2 Base States

Source: `src/src_figma/hooks/useGameState.ts:286-290`

```
8 possible base configurations:
- empty (000)
- 1st (100)
- 2nd (010)
- 3rd (001)
- 1st+2nd (110)
- 1st+3rd (101)
- 2nd+3rd (011)
- loaded (111)
```

### 10.3 Out States

Source: `src/src_figma/hooks/useGameState.ts` gameState.outs

```
3 possible: 0, 1, 2
(3 outs triggers endInning, not a valid pre-play state)
```

### 10.4 Runner Outcomes Per Base

Source: `src/src_figma/hooks/useGameState.ts:284`

```
7 values: 'SCORED', 'TO_3B', 'TO_2B', 'HELD', 'OUT_HOME', 'OUT_3B', 'OUT_2B'
```

### 10.5 Total Test Matrix

```
At-Bat Outcomes: 20
Base States: 8
Out States: 3
---
Primary matrix: 20 x 8 x 3 = 480 combinations

With runner outcomes per base:
Each base has 7 possible outcomes, but only occupied bases matter.
Maximum: 480 x 7 x 7 x 7 = 164,640 (but most are invalid)

Practical matrix:
- For each of 480 combos: verify base state changes, score changes, out count changes
- For runner advancement: verify default outcomes match getDefaultRunnerOutcome()
- For auto-corrections: verify FO->SF and GO->DP triggers
- For immaculate inning: 9 pitches + 3 K detection
- For pitcher decisions: W/L/SV at game end
- For ER attribution: verify correct pitcher charged
```

### 10.6 Event Types

Source: `src/src_figma/hooks/useGameState.ts:136-143`

```
16 EventTypes:
'SB', 'CS', 'WP', 'PB', 'PICK',
'KILLED', 'NUTSHOT',
'WEB_GEM', 'ROBBERY',
'TOOTBLAN',
'BEAT_THROW', 'BUNT',
'STRIKEOUT', 'STRIKEOUT_LOOKING', 'DROPPED_3RD_STRIKE',
'SEVEN_PLUS_PITCH_AB'
```

---

## 11. Existing Test Coverage

### Tests That Exercise the Engine

| Test File | Count | What It Tests |
|-----------|-------|---------------|
| `tests/runnerMovement.test.ts` | 87 | All 20 outcomes x 8 base states runner defaults |
| `tests/inheritedRunnerTracker.test.ts` | 47 | ER attribution, pitching changes, pinch runners |
| `tests/gameEngine.test.ts` | varies | Core game flow |
| `tests/detectionFunctions.test.ts` | varies | ~45 detection functions |
| `tests/leverageCalculator.test.ts` | varies | BASE_OUT_LI table |
| `tests/fanMorale*.test.ts` | varies | Fan morale tracking |
| `tests/bwarCalculator.test.ts` | varies | Batting WAR formulas |
| `tests/pwarCalculator.test.ts` | varies | Pitching WAR formulas |
| `tests/fwarCalculator.test.ts` | varies | Fielding WAR formulas |
| `tests/rwarCalculator.test.ts` | varies | Baserunning WAR formulas |
| `tests/salaryCalculator.test.ts` | varies | Salary formulas |

### Coverage Gaps

1. **Inning transitions**: Limited testing of half-inning transitions (isTop toggle, inning increment)
2. **Walk-off detection**: Edge cases around 9th inning and extras
3. **Pitch count prompt flow**: Deferred action pattern (pendingActionRef)
4. **endGame -> completeGameInternal pipeline**: Full game completion with aggregation
5. **Auto-corrections in context**: FO->SF and GO->DP with actual game state
6. **Bases-loaded walk force advance**: Interaction between walk and runner tracker

---

## 12. Key Constants

### From useGameState.ts

```typescript
// Walk-off detection
const isLateGame = gameState.inning >= 9;
const isWalkOff = isBottom && isLateGame && homeScoreAfter > awayScoreAfter && gameState.homeScore <= gameState.awayScore;

// Clutch threshold
const isClutch = leverageIndex >= 1.5;

// Qualifying starts for pitcher win
const minOutsForQualifyingW = Math.min(15, Math.floor(gameInnings * 5 / 9 * 3));

// Foul ball count behavior
// Foul: strikes = min(strikes+1, 2) -- fouls cannot go past 2 strikes

// Count limits
// balls: max 3 (ball 4 = walk)
// strikes: max 2 (strike 3 = strikeout)
```

### From leverageCalculator.ts

```typescript
// BASE_OUT_LI lookup table
// BaseState: 0=empty, 1=1st, 2=2nd, 3=1st+2nd, 4=3rd, 5=1st+3rd, 6=2nd+3rd, 7=loaded
// Outs: 0, 1, 2
```

### From Fame system (recordEvent local values)

```typescript
const FAME_VALUES: Record<string, number> = {
  WEB_GEM: 1.0,
  ROBBERY: 1.0,
  TOOTBLAN: -3.0,
  KILLED: 3.0,
  NUTSHOT: 1.0,
  KILLED_PITCHER: 3.0,
  NUT_SHOT: 1.0,
  // Informational (0 Fame):
  BEAT_THROW: 0,
  BUNT: 0,
  STRIKEOUT: 0,
  STRIKEOUT_LOOKING: 0,
  DROPPED_3RD_STRIKE: 0,
  SEVEN_PLUS_PITCH_AB: 0,
};
// Formula: adjustedFame = baseFame * sqrt(LI)
```

---

## 13. Recommendations for Testing Architecture

### What Can Be Tested Without React

1. **Pure logic functions** (7 functions): Direct import and call. No mocking needed.
2. **Inherited runner tracker** (11 functions): Direct import and call. No mocking needed.
3. **Core engines** (18 files in src/engines/): All pure TypeScript.

### What Requires React Testing Library

1. **All record* functions**: They use useState setters internally.
2. **Substitution functions**: They modify useRef lineup data.
3. **Game lifecycle**: initializeGame, endInning, endGame.
4. **Pitch count prompt flow**: Uses pendingActionRef pattern.

### Recommended Approach

For the test harness:
- Use **Vitest** (already in package.json) with `renderHook` from `@testing-library/react`
- Create a `renderHook(useGameState)` wrapper
- Call `result.current.initializeGame(config)` then `result.current.recordHit(...)` etc.
- Assert on `result.current.gameState`, `result.current.scoreboard`, etc.

For pure logic:
- Direct Vitest tests, no React needed
- Import functions from `src/src_figma/hooks/useGameState.ts`

For the season simulator:
- Pipeline classification: **C (React Side-Effect Cascade)** with extractable pure logic
- The completeGameInternal function calls `aggregateGameToSeason()` which is pure
- But it is wrapped in React state (useCallback, dependant on useState values)
- Recommendation: Use Vitest + RTL renderHook, or extract core logic into pure functions
