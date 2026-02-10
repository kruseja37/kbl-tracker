# KBL Tracker Canonical Types
Generated: February 8, 2026 by codebase-reverse-engineer (Mode A)
Status: UNREVIEWED — These are extracted from code, organized by classification

## Overview

Total exported types/interfaces/enums: **794**

| Source Layer | Count |
|-------------|-------|
| src/types/ (core types) | ~120 |
| src/engines/ (engine types) | 161 |
| src/utils/ + src/src_figma/utils/ | 198 |
| src/hooks/ + src/src_figma/hooks/ | 104 |
| src/src_figma/app/types/ | ~90 |
| src/src_figma/app/components/ | ~70 |
| Other (data, config, context) | ~51 |

## Type Definition Sources

Due to the large number of types (794), this file organizes them by classification and references the source files. For the complete verbatim type definitions, read the source files directly.

---

## GAME_STATE Types (src/types/game.ts — 1,560 lines)

The heart of the application. This single file defines the game data model.

### Atomic Types
```typescript
export type HalfInning = 'TOP' | 'BOTTOM';
export type Direction = 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right';
export type ExitType = 'Ground' | 'Line Drive' | 'Fly Ball' | 'Pop Up';
export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH' | 'SP' | 'RP' | 'CP' | 'IF' | 'OF';
export type BatterHand = 'L' | 'R' | 'S';
export type AtBatResult = '1B' | '2B' | '3B' | 'HR' | 'BB' | 'IBB' | 'K' | 'KL'
  | 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'TP' | 'SF' | 'SAC' | 'HBP' | 'E' | 'FC' | 'D3K';
export type GameEvent = 'SB' | 'CS' | 'WP' | 'PB' | 'PK' | 'BALK' | 'PITCH_CHANGE' | 'PINCH_HIT' | 'PINCH_RUN' | 'DEF_SUB' | 'POS_SWITCH';
export type SpecialPlayType = 'Routine' | 'Diving' | 'Wall Catch' | 'Running' | 'Leaping' | 'Clean' | 'Robbery Attempt' | 'Over Fence' | 'Wall Scraper';
export type RunnerOutcome = 'SCORED' | 'TO_3B' | 'TO_2B' | 'HELD' | 'OUT_HOME' | 'OUT_3B' | 'OUT_2B';
export type SubstitutionType = 'PINCH_HIT' | 'PINCH_RUN' | 'DEF_SUB' | 'PITCH_CHANGE' | 'DOUBLE_SWITCH';
```

### Fielding Types
```typescript
export type PlayType = 'routine' | 'diving' | 'leaping' | 'wall' | 'charging' | 'running' | 'sliding' | 'over_shoulder' | 'error' | 'robbed_hr' | 'failed_robbery';
export type ErrorType = 'fielding' | 'throwing' | 'mental' | 'missed_catch' | 'collision';
export type D3KOutcome = 'OUT' | 'WP' | 'PB' | 'E_CATCHER' | 'E_1B';
export type DepthType = 'shallow' | 'infield' | 'outfield' | 'deep';
export type AssistType = 'infield' | 'outfield' | 'relay' | 'cutoff';
export type DPRole = 'started' | 'turned' | 'completed' | 'unassisted';
```

### Key Interfaces (abbreviated — see source for full definitions)
- **FieldingData** — 20+ fields for comprehensive fielding tracking
- **Runner** — playerId, playerName, inheritedFrom, howReached
- **Bases** — { first, second, third } (Runner | null)
- **AtBatFlowState** — Full at-bat flow: result, direction, exitType, fielder, specialPlay, runnerOutcomes, fieldingData, batterOutAdvancing
- **LineupPlayer** — Player in active lineup
- **BenchPlayer** — Available bench player
- **LineupState** — Lineup + bench + usedPlayers + currentPitcher
- **SituationalContext** — Close game, clutch, RISP, bases loaded, etc.

### Substitution Hierarchy
```
BaseSubstitutionEvent
├── PinchHitterEvent
├── PinchRunnerEvent
├── DefensiveSubEvent
├── PitchingChangeEvent (includes bequeathedRunners)
├── DoubleSwitchEvent (includes pitchingChange + positionSwap)
└── PositionSwitchEvent
```

### Fame Types
- **FameEventType** — 130+ event types (bonuses + boners)
- **FameTarget** — 'player' | 'team' | 'pitcher' | 'fielder'
- **FameEvent** — Individual fame event instance
- **PlayerGameFame** — Accumulated fame for one player in one game
- **GameFameSummary** — Summary of all fame events in a game
- **FameAutoDetectionSettings** — Detection configuration

### Utility Functions (exported from game.ts)
```typescript
createEmptyBases(): Bases
countRunners(bases: Bases): number
hasRISP(bases: Bases): boolean
isBasesLoaded(bases: Bases): boolean
isOut(result: AtBatResult): boolean
isHit(result: AtBatResult): boolean
reachesBase(result: AtBatResult): boolean
requiresBallInPlayData(result: AtBatResult): boolean
inferFielder(result: AtBatResult, direction: Direction): Position | null
validateSubstitution(lineupState, playerInId, playerOutId): SubstitutionValidation
applySubstitution(lineupState, event, inning): LineupState
```

---

## WAR_TYPES (src/types/war.ts)

### Constants (critical — used in all WAR calculations)
```typescript
SMB4_BASELINES = {
  gamesPerTeam: 50, leagueAVG: 0.288, leagueOBP: 0.329,
  leagueSLG: 0.448, leagueWOBA: 0.329, leagueERA: 4.04,
  leagueFIP: 4.04, fipConstant: 3.28, wobaScale: 1.7821,
  replacementRunsPer600PA: -12.0, replacementWinPct: 0.294
}

SMB4_LINEAR_WEIGHTS = {
  uBB: 0.2925, HBP: 0.3175, single: 0.4475, double: 0.7475,
  triple: 1.0175, homeRun: 1.40, out: -0.1525, strikeout: -0.1525
}

SMB4_WOBA_WEIGHTS = {
  uBB: 0.521, HBP: 0.566, single: 0.797, double: 1.332,
  triple: 1.813, homeRun: 2.495
}
```

### Key Interfaces
- **LeagueContext** — Season context for WAR calculations
- **LinearWeights** — Event run values
- **WOBAWeights** — Scaled wOBA weights
- **PositionalAdjustments** — Position-based run adjustments
- **BattingStatsForWAR** — Input stats for bWAR
- **BWARResult** — bWAR output (wRAA, batting, positional, replacement, total)
- **PitchingStatsForWAR** — Input stats for pWAR
- **PWARResult** — pWAR output (FIP, pitching runs, replacement, total)
- **FieldingStatsForWAR** — Input stats for fWAR
- **FWARResult** — fWAR output
- **BaserunningStatsForWAR** — Input stats for rWAR
- **RWARResult** — rWAR output
- **ManagerDecision** — Manager decision record
- **MWARResult** — mWAR output
- **TotalWARResult** — Combined WAR (bWAR + pWAR + fWAR + rWAR)
- **ParkFactors** — Park-specific stat adjustments
- **TeamStint** — Player tenure on a team

---

## PLAYER_DATA Types (src/types/index.ts)

### Core Legacy Types (120 lines)
```typescript
export type Position = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'SP' | 'RP' | 'DH';
export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';
export type SeasonPhase = 'SETUP' | 'PRE_SEASON' | 'REGULAR_SEASON' | 'ALL_STAR_BREAK' | 'POST_DEADLINE' | 'PLAYOFFS' | 'OFFSEASON';
```

### Key Interfaces
- **Player** — Full player definition (id, name, position, grade, teamId, stats)
- **BattingStats** — 14 batting stat fields
- **PitchingStats** — 16 pitching stat fields
- **Team** — Team definition (id, name, roster)
- **BatterRatings** — 5 rating fields (power, contact, speed, fielding, arm)
- **PitcherRatings** — 3 rating fields (velocity, junk, accuracy)
- **PlayerRatings** — Combined player ratings

---

## UI_STATE Types (src/src_figma/app/types/)

### app/types/index.ts — Figma app types
- **Player** (UI version) — Simpler than core: id, name, position, battingAvg, homeRuns, rbi, mojo, fitness
- **Team** (UI version) — With colors, record
- **League** — id, name, teams, conferences, divisions
- **Franchise** — id, saveName, leagueId, userTeamId, season, currentWeek
- **GameResult** — Simplified game result for display
- **AtBatOutcome** — Simplified at-bat outcome

### app/types/substitution.ts — Detailed substitution types
Parallel hierarchy to game.ts substitution types but with additional fields:
- **PitcherLine** — IP, H, R, ER, BB, K, HR
- **BequeathedRunner** — base, runnerId, howReached
- Adds `PitcherRole` type: 'SP' | 'RP' | 'CL'
- Adds `HowReached` type: 'hit' | 'walk' | 'HBP' | 'error' | 'FC' | 'inherited'

---

## ENGINE Types (spread across src/engines/)

Each engine file exports its own types. Key ones:

### Mojo (src/engines/mojoEngine.ts)
- `MojoLevel` — Numeric levels (-2 to +2)
- Mojo multipliers (RATTLED: 0.82, TENSE: 0.90, NORMAL: 1.00, LOCKED_IN: 1.10, JACKED: 1.18)

### Fitness (src/engines/fitnessEngine.ts)
- `FitnessState` — JUICED | FIT | WELL | STRAINED | WEAK | HURT
- Fitness multipliers (JUICED: 1.20, FIT: 1.00, WELL: 0.95, STRAINED: 0.85, WEAK: 0.70, HURT: 0.00)

### Fan Morale (src/engines/fanMoraleEngine.ts)
- Morale 0-99 scale with 7 states
- Game result processing
- Rival detection integration

### Narrative (src/engines/narrativeEngine.ts)
- 10 beat reporter personality types
- Story generation interfaces
- Game recap structures

---

## DUPLICATE TYPE ISSUE

**WARNING:** Several type files exist in both `src/` and `src/src_figma/`:

| Core File | Mirror File | Status |
|-----------|-------------|--------|
| src/types/game.ts | src/src_figma/app/types/game.ts | IDENTICAL (both 1,560 lines) |
| src/types/war.ts | src/src_figma/app/types/war.ts | IDENTICAL |
| src/utils/careerStorage.ts | src/src_figma/utils/careerStorage.ts | MIRRORS |
| src/utils/milestoneDetector.ts | src/src_figma/utils/milestoneDetector.ts | MIRRORS |

This creates a maintenance risk — changes to one must be mirrored to the other. Consider consolidating to a single source with re-exports.

Also, `src/types/index.ts` defines Position/AtBatResult differently from `src/types/game.ts` (long form vs short form), which could cause confusion.
