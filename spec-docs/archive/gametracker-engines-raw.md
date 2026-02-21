# GameTracker Engines - Raw Spec Extraction

> **Source**: `src/src_figma/app/engines/` (9 files)
> **Extracted**: 2026-02-08
> **Purpose**: Structured extraction of all integration engines used by the Figma GameTracker UI layer

---

## Table of Contents

1. [inheritedRunnerTracker.ts](#1-inheritedrunnertrackerts)
2. [saveDetector.ts](#2-savedetectorts)
3. [d3kTracker.ts](#3-d3ktrackerts)
4. [fameIntegration.ts](#4-fameintegrationts)
5. [fanMoraleIntegration.ts](#5-fanmoraleintegrationts)
6. [mwarIntegration.ts](#6-mwarintegrationts)
7. [narrativeIntegration.ts](#7-narrativeintegrationts)
8. [detectionIntegration.ts](#8-detectionintegrationts)
9. [playerStateIntegration.ts](#9-playerstateintegrationts)

---

## 1. inheritedRunnerTracker.ts

**File**: `src/src_figma/app/engines/inheritedRunnerTracker.ts`
**Lines**: 529
**Purpose**: Tracks which pitcher is responsible for runners on base, which is critical for proper Earned Run (ER) attribution. When a pitcher is replaced, runners left on base become "inherited" by the new pitcher, but ER responsibility stays with the original pitcher who allowed them on base. Also handles pinch runner substitutions (preserving ER responsibility) and provides ER summary calculations.

### Dependencies

```typescript
import type { Runner, Bases, HowReached } from '../types/substitution';
```

### Exported Types

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

### Exported Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `createRunnerTrackingState` | `(currentPitcherId: string, currentPitcherName: string) => RunnerTrackingState` | Create initial tracking state |
| `addRunner` | `(state, runnerId, runnerName, base, howReached) => RunnerTrackingState` | Add runner when they reach base |
| `advanceRunner` | `(state, runnerId, toBase) => { state, scoredEvent }` | Advance runner (may produce scored event) |
| `runnerOut` | `(state, runnerId) => RunnerTrackingState` | Remove runner who was put out |
| `handlePitchingChange` | `(state, newPitcherId, newPitcherName) => { state, bequeathedRunners, inheritedRunnerCount }` | Transfer runners on pitching change |
| `handlePinchRunner` | `(state, originalRunnerId, newRunnerId, newRunnerName) => RunnerTrackingState` | Substitute runner, preserve ER responsibility |
| `clearBases` | `(state) => RunnerTrackingState` | Clear all active runners (end of half-inning) |
| `nextInning` | `(state) => RunnerTrackingState` | Advance inning + clear bases |
| `nextAtBat` | `(state) => RunnerTrackingState` | Increment at-bat counter |
| `getERSummary` | `(state) => Array<{pitcherId, pitcherName, earnedRuns, unearnedRuns, inheritedRunnersScored, bequeathedRunners}>` | ER summary for all pitchers |
| `getCurrentBases` | `(state) => Bases` | Get current base state for display |

### Key Logic

**ER Attribution (CRIT-03 fix)**: Fielder's Choice runs ARE earned -- only errors produce unearned runs:

```typescript
// advanceRunner, line 217
const wasEarnedRun = runner.howReached !== 'error';
```

```typescript
// getERSummary, line 472
if (runner.howReached !== 'error') {
  earnedRuns++;
} else {
  unearnedRuns++;
}
```

**Pitching change -- inherited runner marking** (line 325-333):

```typescript
const updatedRunners = state.runners.map(runner => {
  if (runner.currentBase !== null && runner.currentBase !== 'HOME' && runner.currentBase !== 'OUT') {
    return {
      ...runner,
      isInherited: true,
      inheritedFromPitcherId: outgoingPitcherId,
    };
  }
  return runner;
});
```

**Pinch runner -- preserves original ER responsibility** (line 378-387):

```typescript
const pinchRunner: TrackedRunner = {
  ...originalRunner,
  runnerId: newRunnerId,
  runnerName: newRunnerName,
  // Keep the same pitcher responsibility!
  responsiblePitcherId: originalRunner.responsiblePitcherId,
  responsiblePitcherName: originalRunner.responsiblePitcherName,
  isInherited: originalRunner.isInherited,
  inheritedFromPitcherId: originalRunner.inheritedFromPitcherId,
};
```

**Inherited runner scored attribution** (line 236-243):

```typescript
if (runner.isInherited) {
  const currentStats = getOrCreatePitcherStats(
    state, state.currentPitcherId, state.currentPitcherName
  );
  currentStats.inheritedRunnersScored.push(updatedRunner);
}
```

### Edge Cases Handled

- Runner not found in `advanceRunner` / `runnerOut` -- returns state unchanged, null scoredEvent
- `getOrCreatePitcherStats` -- lazy-creates stats entry for unknown pitchers
- `clearBases` -- does NOT clear runner history, only active runners
- `getCurrentBases` maps TrackedRunner to Bases format with `inheritedFrom` info

---

## 2. saveDetector.ts

**File**: `src/src_figma/app/engines/saveDetector.ts`
**Lines**: 474
**Purpose**: Detects save opportunities, saves, blown saves, blown save + loss, and holds. Implements official MLB save rules adapted for SMB4: pitcher finishes game with lead, is not the winning pitcher, and entered under qualifying conditions (lead <= 3, or tying run on base/at-bat/on-deck, or 3+ innings pitched). Also provides hold detection (reliever protects lead, exits before save).

### Dependencies

```typescript
import type { Runner, Bases, HowReached } from '../types/substitution';
```

### Exported Types

```typescript
export interface GameState {
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  bases: Bases;
  homeScore: number;
  awayScore: number;
  scheduledInnings: number;
  isHomeDefense: boolean;
}

export interface PitcherAppearance {
  pitcherId: string;
  pitcherName: string;
  leadWhenEntered: number;
  leadWhenExited: number;
  enteredInSaveOpportunity: boolean;
  entryState: {
    inning: number;
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
    lead: number;
  };
  outsRecorded: number;
  finishedGame: boolean;
  runsAllowed: number;
  isWinningPitcher: boolean;
}

export type SaveResult = 'SAVE' | 'BLOWN_SAVE' | 'BLOWN_SAVE_LOSS' | 'HOLD' | 'NONE';

export interface SaveDetectionResult {
  result: SaveResult;
  message: string;
  details: {
    enteredWithLead: number;
    exitedWithLead: number;
    outsRecorded: number;
    wasQualifyingSituation: boolean;
  };
}
```

### Exported Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `isSaveOpportunity` | `(lead, bases: Bases, inning, scheduledInnings?) => boolean` | Check if situation is save opportunity (Bases object) |
| `isSaveOpportunityBool` | `(lead, bases: {first,second,third: boolean}, inning, scheduledInnings?) => boolean` | Same, with boolean bases |
| `detectSave` | `(appearance, gameEnded, teamWon) => SaveDetectionResult` | Full save detection |
| `detectBlownSave` | `(appearance, gameEnded, teamWon) => {eventType, message} | null` | Legacy blown save detection |
| `detectHold` | `(appearance, gameEnded, teamWon, anotherPitcherGotSave) => {result, message}` | Hold detection |
| `calculateLead` | `(state: GameState) => number` | Calculate lead from defending team perspective |
| `createPitcherAppearance` | `(pitcherId, pitcherName, gameState: GameState) => PitcherAppearance` | Create appearance record for new reliever |
| `updatePitcherAppearance` | `(appearance, gameState, additionalOuts?, additionalRuns?) => PitcherAppearance` | Update with current state |
| `finalizePitcherAppearance` | `(appearance, finishedGame, isWinningPitcher, finalLead) => PitcherAppearance` | Finalize at game end |

### Key Logic

**Save opportunity conditions** (line 125-152):

```typescript
export function isSaveOpportunity(
  lead: number, bases: Bases, inning: number, scheduledInnings: number = 9
): boolean {
  if (lead <= 0) return false;
  const lateGameStart = Math.max(1, scheduledInnings - 2);
  if (inning < lateGameStart) return false;
  if (lead <= 3) return true;
  const runnersCount = countRunners(bases);
  return lead <= (runnersCount + 2); // +2 for "at bat or on deck"
}
```

**Late game start** scales with scheduled innings:
- 9 innings: 7th+ (`scheduledInnings - 2`)
- 7 innings: 5th+
- 6 innings: 4th+
- Minimum: 1st (`Math.max(1, ...)`)

**Blown save detection** (line 218-228): Lead lost if `leadWhenExited <= 0 && leadWhenEntered > 0`. Loss variant if `!teamWon`.

**Hold requirements** (line 330-370):
1. Entered in save opportunity
2. Recorded at least 1 out
3. Maintained the lead (`leadWhenExited > 0`)
4. Did NOT finish the game
5. Team won (if game ended)
6. Another pitcher got the save (if game ended)

**Save requirements** (priority order in `detectSave`):
1. Game must be over
2. Must have entered in save opportunity
3. Check blown save first (lead lost)
4. Must finish game (else check hold)
5. Team must win
6. Cannot be winning pitcher
7. Must pitch >= 3 outs OR tying run was close

**Tying run close check** (line 267-268):

```typescript
const hadTyingRunClose =
  appearance.leadWhenEntered <= (countRunnersBool(appearance.entryState.bases) + 2);
```

**Lead calculation** (line 380-388):

```typescript
export function calculateLead(state: GameState): number {
  if (state.isHomeDefense) {
    return state.homeScore - state.awayScore;
  } else {
    return state.awayScore - state.homeScore;
  }
}
```

### Edge Cases Handled

- Late game detection scales with non-standard game lengths
- Tying run "on base, at bat, or on deck" = `runners + 2`
- Hold fallback when pitcher didn't finish game but maintained lead and recorded >= 3 outs
- `createPitcherAppearance` sets `isWinningPitcher: false` initially (determined at game end)
- Two base-counting helpers: `countRunners` (Bases object) and `countRunnersBool` (boolean bases)

---

## 3. d3kTracker.ts

**File**: `src/src_figma/app/engines/d3kTracker.ts`
**Lines**: 403
**Purpose**: Tracks Dropped Third Strike (D3K) events. Implements the D3K rule: when the catcher fails to catch the third strike, the batter can attempt to reach first ONLY when first base is empty OR there are 2 outs. Tracks D3K outcomes, aggregates stats for batters and catchers, provides UI helpers and integrates with the play classifier.

### Dependencies

None (self-contained).

### Exported Types

```typescript
export type D3KOutcome =
  | 'D3K_REACHED'      // Batter safely reaches first
  | 'D3K_THROWN_OUT'    // Catcher throws out batter at first
  | 'D3K_ILLEGAL'      // D3K not legal (batter out)
  | 'D3K_ERROR'        // Error on throw, batter reaches
  | 'D3K_WILD_THROW'   // Wild throw, batter may take extra bases
  | 'D3K_FORCE_OUT';   // Forced out elsewhere (rare)

export interface D3KEvent {
  eventType: 'D3K';
  outcome: D3KOutcome;
  isLegal: boolean;
  batterId: string;
  batterName: string;
  catcherId: string;
  catcherName: string;
  pitcherId: string;
  pitcherName: string;
  batterResult: 'first' | 'second' | 'third' | 'out';
  strikeoutType: 'swinging' | 'looking';
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  basesBefore: { first: boolean; second: boolean; third: boolean };
  throwSequence?: string[];
  errorInfo?: { fielderId: string; fielderName: string; errorType: 'THROWING' | 'FIELDING' };
}

export interface D3KStats {
  attempts: number;
  reached: number;
  thrownOut: number;
  illegal: number;
  errors: number;
  wildThrows: number;
}

export interface CatcherD3KStats {
  droppedThirdStrikes: number;
  throwouts: number;
  failedThrows: number;
  errors: number;
  throwoutRate: number;
}
```

### Exported Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `isD3KLegal` | `(firstBaseOccupied: boolean, outs: number) => boolean` | Check D3K legality |
| `checkD3KLegality` | `(firstBaseOccupied, outs) => {isLegal, reason}` | Legality with explanation |
| `createD3KEvent` | `(outcome, batterInfo, catcherInfo, pitcherInfo, gameState, strikeoutType, options?) => D3KEvent` | Create D3K event |
| `aggregateBatterD3KStats` | `(events: D3KEvent[], batterId) => D3KStats` | Aggregate batter stats |
| `aggregateCatcherD3KStats` | `(events: D3KEvent[], catcherId) => CatcherD3KStats` | Aggregate catcher stats |
| `getD3KDisplayMessage` | `(event: D3KEvent) => string` | Display message for outcome |
| `getD3KIcon` | `(outcome: D3KOutcome) => string` | Icon for outcome |
| `shouldTriggerD3KFlow` | `(outType, isPitchResult) => boolean` | Check if play triggers D3K flow |
| `getD3KOptions` | `(isLegal) => Array<{value, label, icon}>` | UI options based on legality |

### Key Logic

**D3K legality** (line 118-125):

```typescript
export function isD3KLegal(firstBaseOccupied: boolean, outs: number): boolean {
  if (!firstBaseOccupied) return true;
  if (outs >= 2) return true;
  return false;
}
```

**Batter result inference from outcome** (line 186-204):

```typescript
switch (outcome) {
  case 'D3K_REACHED':
    batterResult = options?.batterResult || 'first';
    break;
  case 'D3K_THROWN_OUT':
  case 'D3K_ILLEGAL':
  case 'D3K_FORCE_OUT':
    batterResult = 'out';
    break;
  case 'D3K_ERROR':
    batterResult = options?.batterResult || 'first';
    break;
  case 'D3K_WILD_THROW':
    batterResult = options?.batterResult || 'second'; // Extra base on wild throw
    break;
}
```

**Catcher stats exclude illegal D3Ks** (line 288):

```typescript
if (event.outcome === 'D3K_ILLEGAL') continue; // Not a real D3K attempt
```

**Catcher error attribution** (line 301-304):

```typescript
case 'D3K_ERROR':
  if (event.errorInfo?.fielderId === catcherId) {
    stats.errors++;
  }
  stats.failedThrows++;
```

**D3K trigger detection** (line 374-382):

```typescript
export function shouldTriggerD3KFlow(outType: string | undefined, isPitchResult: boolean): boolean {
  if (!isPitchResult) return false;
  if (outType !== 'K' && outType !== 'KL') return false;
  return true;
}
```

**Display: backward K for looking strikeouts** (line 325):

```typescript
const kType = strikeoutType === 'looking' ? '\u{A4D8}' : 'K'; // backward K symbol
```

### Edge Cases Handled

- D3K_ILLEGAL returns only one option in `getD3KOptions`
- D3K_WILD_THROW defaults batter to second base
- D3K_ERROR and D3K_WILD_THROW both count as `reached` in batter stats
- Catcher throwout rate protected from divide-by-zero: `attempts > 0 ? ... : 0`
- `D3K_FORCE_OUT` is classified as `thrownOut` in batter stats

---

## 4. fameIntegration.ts

**File**: `src/src_figma/app/engines/fameIntegration.ts`
**Lines**: 515
**Purpose**: Integrates the legacy Fame engine (`src/engines/fameEngine.ts`) with the Figma GameTracker. Provides UI-friendly formatting for Fame events, LI-weighted Fame calculation wrappers, game-level Fame tracking (events per player per game), quick detection functions for multi-hit/multi-HR/strikeout/RBI/meltdown milestones, and player Fame summary creation with tier information.

### Dependencies

```typescript
// Core engine
from '../../../engines/fameEngine': calculateFame, getLIMultiplier, getPlayoffMultiplier,
  getFameTier, detectCareerMilestones, detectCareerNegativeMilestones,
  detectSeasonMilestones, detectSeasonNegativeMilestones, detectFirstCareer,
  FAME_VALUES, CAREER_THRESHOLDS, CAREER_NEGATIVE_THRESHOLDS, SEASON_THRESHOLDS,
  type CareerStats, SeasonStats, MilestoneResult, FameResult

// Game types
from '../../../types/game': type FameEventType, type FameTarget,
  FAME_VALUES, FAME_EVENT_LABELS, FAME_TARGET
```

### Exported Types

```typescript
export interface FameEventDisplay {
  eventType: FameEventType;
  icon: string;
  label: string;
  description: string;
  baseFame: number;
  finalFame: number;
  liMultiplier: number;
  playoffMultiplier: number;
  isBonus: boolean;
  isBoner: boolean;
  attribution: FameTarget;
}

export interface PlayerFameSummary {
  playerId: string;
  playerName: string;
  totalFame: number;
  gameFame: number;
  seasonFame: number;
  tier: { tier: string; label: string; minFame: number; maxFame: number };
  recentEvents: FameEventDisplay[];
}

export interface GameFameTracker {
  gameId: string;
  events: Array<{
    eventType: FameEventType;
    playerId: string;
    playerName: string;
    result: FameResult;
    inning: number;
    halfInning: 'TOP' | 'BOTTOM';
    timestamp: number;
  }>;
}
```

### Exported Functions (Figma-specific, not re-exports)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `getFameIcon` | `(eventType: FameEventType) => string` | Icon lookup from FAME_ICONS map |
| `formatFameEvent` | `(eventType, leverageIndex?, playoffContext?) => FameEventDisplay` | Format event for UI |
| `formatFameValue` | `(fame: number, decimals?) => string` | Format with +/- sign |
| `getFameColor` | `(fame: number) => string` | Green/Red/Gray for pos/neg/zero |
| `getTierColor` | `(tier: string) => string` | Color for Fame tier |
| `createGameFameTracker` | `(gameId: string) => GameFameTracker` | New tracker |
| `addFameEvent` | `(tracker, eventType, playerId, playerName, inning, halfInning, leverageIndex?, playoffContext?) => GameFameTracker` | Add event to tracker |
| `getPlayerGameFame` | `(tracker, playerId) => number` | Total Fame for player in game |
| `getPlayerGameEvents` | `(tracker, playerId) => FameEventDisplay[]` | All events for player |
| `getGameFameSummary` | `(tracker) => Array<{playerId, playerName, totalFame, eventCount}>` | All players sorted by Fame |
| `detectStrikeoutFameEvent` | `(strikeoutsInGame) => FameEventType | null` | Hat Trick/Golden/Platinum/Titanium Sombrero |
| `detectMultiHRFameEvent` | `(homeRunsInGame) => FameEventType | null` | Multi-HR 2/3/4+ |
| `detectMultiHitFameEvent` | `(hitsInGame) => FameEventType | null` | 3/4/5/6-hit game |
| `detectRBIFameEvent` | `(rbiInGame) => FameEventType | null` | 5/8/10 RBI game |
| `detectPitcherKFameEvent` | `(strikeoutsInGame) => FameEventType | null` | 10K/15K game |
| `detectMeltdownFameEvent` | `(runsAllowed) => FameEventType | null` | Meltdown/Severe |
| `describeLIEffect` | `(leverageIndex) => string` | Human description of LI |
| `getLITier` | `(leverageIndex) => {label, color, multiplier}` | LI tier for display |
| `createPlayerFameSummary` | `(playerId, playerName, totalFame, gameFame, seasonFame, recentEvents?) => PlayerFameSummary` | Build summary |

### Key Logic

**Fame event formatting** (line 190-215):

```typescript
export function formatFameEvent(
  eventType: FameEventType,
  leverageIndex: number = 1.0,
  playoffContext?: { isPlayoffs: boolean; round?; isEliminationGame?; isClinchGame? }
): FameEventDisplay {
  const result = calculateFame(eventType, leverageIndex, playoffContext);
  return {
    eventType,
    icon: getFameIcon(eventType),
    label: eventType.replace(/_/g, ' '),
    description: FAME_EVENT_LABELS[eventType] || eventType,
    baseFame: result.baseFame,
    finalFame: result.finalFame,
    liMultiplier: result.liMultiplier,
    playoffMultiplier: result.playoffMultiplier,
    isBonus: result.isBonus,
    isBoner: result.isBoner,
    attribution: FAME_TARGET[eventType] || 'player',
  };
}
```

**Quick detection thresholds** (lines 383-450):

| Detector | Thresholds |
|----------|------------|
| `detectStrikeoutFameEvent` | 3=HAT_TRICK, 4=GOLDEN_SOMBRERO, 5=PLATINUM, 6+=TITANIUM |
| `detectMultiHRFameEvent` | 2=MULTI_HR_2, 3=MULTI_HR_3, 4+=MULTI_HR_4PLUS |
| `detectMultiHitFameEvent` | 3=THREE_HIT, 4=FOUR_HIT, 5=FIVE_HIT, 6+=SIX_HIT |
| `detectRBIFameEvent` | 5=FIVE_RBI, 8=EIGHT_RBI, 10+=TEN_RBI |
| `detectPitcherKFameEvent` | 10=TEN_K, 15+=FIFTEEN_K |
| `detectMeltdownFameEvent` | 6=MELTDOWN, 10+=MELTDOWN_SEVERE |

**LI tier classification** (line 471-488):

```typescript
if (leverageIndex >= 4.0) return { label: 'HIGH LI', color: '#DD0000', multiplier };
if (leverageIndex >= 2.0) return { label: 'MED LI', color: '#FFD700', multiplier };
if (leverageIndex >= 1.0) return { label: 'NORM LI', color: '#5A8352', multiplier };
return { label: 'LOW LI', color: '#808080', multiplier };
```

**Tier colors** (line 240-252):

| Tier | Color |
|------|-------|
| LEGENDARY | #FFD700 (Gold) |
| SUPERSTAR | #5599FF (Blue) |
| STAR | #5A8352 (Green) |
| FAN_FAVORITE | #AA6600 (Orange) |
| KNOWN | #808080 (Gray) |
| UNKNOWN | #555555 (Dark gray) |
| DISLIKED | #AA6600 (Orange) |
| VILLAIN | #DD0000 (Red) |
| NOTORIOUS | #8B0000 (Dark red) |

### Edge Cases Handled

- `getFameIcon` returns default baseball icon if event type not in map
- `getGameFameSummary` sorts by totalFame descending
- `addFameEvent` timestamps with `Date.now()`
- All quick detectors check from highest threshold down (greedy match)
- `formatFameValue` handles zero, positive, and negative

---

## 5. fanMoraleIntegration.ts

**File**: `src/src_figma/app/engines/fanMoraleIntegration.ts`
**Lines**: 362
**Purpose**: Integrates the legacy `fanMoraleEngine.ts` into the Figma codebase. Primarily a re-export layer with Figma-specific display helpers. Tracks fan morale 0-99, provides display info for fan state (EUPHORIC through HOSTILE), risk levels (SAFE/WATCH/DANGER/CRITICAL), trend indicators, trade scrutiny levels, and free agent attractiveness calculations.

### Dependencies

```typescript
from '../../../engines/fanMoraleEngine': // 36 types + 4 constants + 22 functions (all re-exported)
```

### Re-exported Types (from fanMoraleEngine)

`FanState`, `MoraleTrend`, `RiskLevel`, `GameDate`, `FanMorale`, `MoraleEventType`, `MoraleModifier`, `MoraleEvent`, `MoraleUpdate`, `PerformanceClass`, `PerformanceContext`, `SeasonContext`, `ExpectedWinsTrigger`, `ExpectedWins`, `FanReactionType`, `FanReaction`, `ExpectedWinsUpdate`, `FanVerdict`, `TradeAftermath`, `AcquiredPlayerTracking`, `ProspectSpotlight`, `GameResult`, `PlayerGamePerformance`, `ContractionRisk`

### Re-exported Constants

`FAN_STATE_THRESHOLDS`, `FAN_STATE_CONFIG`, `BASE_MORALE_IMPACTS`, `FAN_MORALE_CONFIG`

### Re-exported Functions (22 total)

`getFanState`, `getRiskLevel`, `initializeFanMorale`, `classifyPerformance`, `getPerformanceMultiplier`, `getTimingMultiplier`, `getHistoryModifier`, `calculateExpectedWins`, `determineFanReaction`, `startTradeAftermath`, `updateTradeAftermath`, `calculateFanVerdict`, `getPostTradeGameImpact`, `calculateMoraleBaseline`, `calculateMoraleDrift`, `applyMomentum`, `calculateTrend`, `createGameMoraleEvent`, `processMoraleEvent`, `processMoraleDrift`, `checkForStreakEvent`, `calculateContractionRisk`

### Figma-Specific Exported Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `getFanStateDisplay` | `(fanState: FanState) => {label, color, icon, description}` | Display info for fan state |
| `getRiskLevelDisplay` | `(riskLevel: RiskLevel) => {label, color, description}` | Display info for risk level |
| `getTrendDisplay` | `(trend: MoraleTrend) => {label, color, arrow}` | Trend display with arrow |
| `formatMorale` | `(morale: number) => string` | Round to integer string |
| `getMoraleBarColor` | `(morale: number) => string` | Color for morale bar |
| `getTradeScrutinyLevel` | `(morale) => {level, multiplier, description}` | Trade scrutiny based on morale |
| `getFAAttractiveness` | `(morale, marketSize) => {rating, tier, description}` | FA attractiveness rating |

### Key Logic

**Fan state icons and descriptions** (line 165-194):

| FanState | Range | Icon | Description |
|----------|-------|------|-------------|
| EUPHORIC | 90-99 | trophy | Championship fever |
| EXCITED | 75-89 | fire | Playoff buzz |
| CONTENT | 55-74 | smile | Satisfied |
| RESTLESS | 40-54 | unamused | Growing impatient |
| FRUSTRATED | 25-39 | angry | Angry but loyal |
| APATHETIC | 10-24 | neutral | Checked out |
| HOSTILE | 0-9 | rage | Demanding change |

**Morale bar colors** (line 268-274):

```typescript
if (morale >= 80) return '#22c55e';  // Green
if (morale >= 60) return '#84cc16';  // Lime
if (morale >= 40) return '#eab308';  // Yellow
if (morale >= 20) return '#f97316';  // Orange
return '#dc2626';  // Red
```

**Trade scrutiny** (line 279-310):

| Morale | Level | Multiplier |
|--------|-------|------------|
| >= 70 | LOW | 0.8 |
| >= 50 | MEDIUM | 1.0 |
| >= 30 | HIGH | 1.3 |
| < 30 | EXTREME | 1.6 |

**FA Attractiveness** (line 315-361):

```typescript
let rating = morale;
switch (marketSize) {
  case 'LARGE': rating += 15; break;
  case 'MEDIUM': rating += 5; break;
  case 'SMALL': rating -= 10; break;
}
rating = Math.max(0, Math.min(100, rating));
```

| Rating | Tier |
|--------|------|
| >= 85 | ELITE |
| >= 70 | DESIRABLE |
| >= 50 | AVERAGE |
| >= 30 | BELOW_AVERAGE |
| < 30 | UNATTRACTIVE |

### Edge Cases Handled

- `getMoraleIcon` and `getFanStateDescription` default to neutral icon/text for unknown states
- `getRiskLevelDisplay` defaults to gray 'Unknown' for unrecognized risk levels
- `getTrendDisplay` defaults to `?` arrow for unknown trends
- `getFAAttractiveness` clamps rating to 0-100

---

## 6. mwarIntegration.ts

**File**: `src/src_figma/app/engines/mwarIntegration.ts`
**Lines**: 346
**Purpose**: Integrates the legacy `mwarCalculator.ts` into the Figma codebase. Provides Manager Moment prompts at high-leverage situations (LI >= 2.0), infers relevant decision types from game state, builds contextual messages, and tracks game-level mWAR decisions. Re-exports all mWAR calculation functions.

### Dependencies

```typescript
from '../../../engines/mwarCalculator': // 17 types + 6 constants + 26 functions
from '../../../engines/leverageCalculator': getLeverageIndex, type GameStateForLI
```

### Re-exported Types

`DecisionType`, `DecisionOutcome`, `InferenceMethod`, `DecisionGameState`, `ManagerDecision`, `DecisionCounts`, `DecisionTypeBreakdown`, `ManagerSeasonStats`, `ManagerProfile`, `GameManagerStats`, `MWARResult`

### Re-exported Constants

`MWAR_WEIGHTS`, `MANAGER_OVERPERFORMANCE_CREDIT`, `DECISION_VALUES`, `MWAR_THRESHOLDS`, `HIGH_LEVERAGE_THRESHOLD`, `EXPECTED_SUCCESS_RATES`

### Re-exported Functions (26 total)

`createManagerDecision`, `getDecisionBaseValue`, `calculateDecisionClutchImpact`, `resolveDecision`, `evaluatePitchingChange`, `evaluateLeavePitcherIn`, `evaluatePinchHitter`, `evaluatePinchRunner`, `evaluateIBB`, `evaluateStealCall`, `evaluateBuntCall`, `evaluateSqueezeCall`, `evaluateShift`, `calculateTeamSalaryScore`, `getExpectedWinPct`, `calculateOverperformance`, `getDecisionSuccessRate`, `calculateDecisionWAR`, `calculateSeasonMWAR`, `getMWARRating`, `createEmptyDecisionCounts`, `createEmptyDecisionTypeBreakdown`, `createManagerSeasonStats`, `addDecisionToSeasonStats`, `recalculateSeasonStats`, `createGameManagerStats`, `addDecisionToGameStats`, `calculateMOYVotes`, `formatMWAR`, `getMWARColor`, `isAutoDetectedDecision`, `isUserPromptedDecision`

### Figma-Specific Exported Types

```typescript
export interface ManagerMomentState {
  isTriggered: boolean;
  leverageIndex: number;
  decisionType: DecisionType | null;
  context: string;
  suggestedAction?: string;
}
```

### Figma-Specific Exported Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `checkManagerMoment` | `(gameState: GameStateForLI) => ManagerMomentState` | Check if Manager Moment triggers |
| `createGameMWARState` | `(gameId, managerId) => GameManagerStats` | Create game-level tracking |
| `recordManagerDecision` | `(gameStats, decision) => GameManagerStats` | Record decision (returns new ref) |
| `getMWARDisplayInfo` | `(mWAR) => {formatted, rating, color}` | Display info for mWAR value |
| `getLITierDescription` | `(li) => string` | LI tier name |
| `getLIColor` | `(li) => string` | LI color for UI |
| `shouldShowManagerMoment` | `(li) => boolean` | LI >= HIGH_LEVERAGE_THRESHOLD |

### Key Logic

**Manager Moment trigger** (line 158-181):

```typescript
export function checkManagerMoment(gameState: GameStateForLI): ManagerMomentState {
  const li = getLeverageIndex(gameState);
  if (li < HIGH_LEVERAGE_THRESHOLD) {
    return { isTriggered: false, leverageIndex: li, decisionType: null, context: '' };
  }
  const decisionType = inferRelevantDecisionType(gameState);
  const context = buildManagerMomentContext(gameState, li, decisionType);
  return {
    isTriggered: true, leverageIndex: li, decisionType, context,
    suggestedAction: getSuggestedAction(gameState, decisionType),
  };
}
```

**Decision type inference** (line 186-209):

```typescript
function inferRelevantDecisionType(gameState: GameStateForLI): DecisionType {
  const { outs, runners, inning } = gameState;
  if (inning >= 7) return 'pitching_change';
  if (runners.second || runners.third) {
    if (outs < 2) return 'intentional_walk';
  }
  if (runners.first && !runners.second && outs < 2) return 'steal_call';
  return 'leave_pitcher_in';
}
```

**Context building** (line 214-237) produces strings like: `"Very high leverage (LI: 2.75). Top 8, 1 out, runners on 1st and 3rd. Close game."`

**recordManagerDecision** returns a spread copy for React state updates (line 290-296):

```typescript
export function recordManagerDecision(
  gameStats: GameManagerStats, decision: ManagerDecision
): GameManagerStats {
  addDecisionToGameStats(gameStats, decision);
  return { ...gameStats };  // Return new reference
}
```

**LI tiers** (line 320-327):

| LI | Description |
|----|-------------|
| >= 4.0 | Extreme |
| >= 2.5 | Very High |
| >= 2.0 | High |
| >= 1.0 | Above Average |
| >= 0.5 | Average |
| < 0.5 | Low |

**LI colors** (line 332-338):

| LI | Color |
|----|-------|
| >= 4.0 | #dc2626 (Red) |
| >= 2.5 | #ea580c (Orange) |
| >= 2.0 | #ca8a04 (Amber) |
| >= 1.0 | #65a30d (Green) |
| < 1.0 | #6b7280 (Gray) |

### Edge Cases Handled

- Non-triggered state returns empty context and null decision type
- `inferRelevantDecisionType` defaults to `leave_pitcher_in`
- Runner description handles bases loaded, single runner, and multiple runners
- Score situation categorized as Tie/Close/Significant lead

---

## 7. narrativeIntegration.ts

**File**: `src/src_figma/app/engines/narrativeIntegration.ts`
**Lines**: 82
**Purpose**: Integrates the legacy `narrativeEngine.ts` into the Figma codebase. Primarily re-exports core types and functions (reporter generation, narrative generation, morale calculation, reliability). Provides one Figma-specific helper: `generateGameRecap` which is a simplified interface for generating post-game narrative text.

### Dependencies

```typescript
from '../../../engines/narrativeEngine': type ReporterPersonality, BeatReporter, NarrativeContext,
  NarrativeEventType, GeneratedNarrative, ReporterReputation,
  generateBeatReporter, getReporterName, updateReporterReputation, advanceReporterSeason,
  getEffectivePersonality, generateNarrative, generateGameNarratives,
  calculateStoryMoraleImpact, determineStoryAccuracy, determineConfidenceLevel
```

### Re-exported Types

`ReporterPersonality`, `BeatReporter`, `NarrativeContext`, `NarrativeEventType`, `GeneratedNarrative`, `ReporterReputation`

### Re-exported Functions

`generateBeatReporter`, `getReporterName`, `updateReporterReputation`, `advanceReporterSeason`, `getEffectivePersonality`, `generateNarrative`, `generateGameNarratives`, `calculateStoryMoraleImpact`, `determineStoryAccuracy`, `determineConfidenceLevel`

### Figma-Specific Exported Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `generateGameRecap` | `(params: {teamName, opponentName, teamScore, opponentScore, isWalkOff?, isNoHitter?, isShutout?, keyPlayers?, reporter?}) => GeneratedNarrative` | Simplified game recap generation |

### Key Logic

**generateGameRecap** (line 50-81):

```typescript
export function generateGameRecap(params: {
  teamName: string;
  opponentName: string;
  teamScore: number;
  opponentScore: number;
  isWalkOff?: boolean;
  isNoHitter?: boolean;
  isShutout?: boolean;
  keyPlayers?: Array<{ name: string; performance: string }>;
  reporter?: BeatReporter;
}): GeneratedNarrative {
  const won = params.teamScore > params.opponentScore;
  const context: NarrativeContext = {
    eventType: 'GAME_RECAP',
    teamName: params.teamName,
    gameResult: {
      won,
      score: { team: params.teamScore, opponent: params.opponentScore },
      opponentName: params.opponentName,
      isWalkOff: params.isWalkOff,
      isNoHitter: params.isNoHitter,
      isShutout: params.isShutout,
      keyPlayers: params.keyPlayers,
    },
  };
  const reporter = params.reporter || generateBeatReporter(params.teamName, { season: 1, game: 0 });
  return generateNarrative(context, reporter);
}
```

### Edge Cases Handled

- If no `reporter` provided, generates a temporary one with `season: 1, game: 0`
- Win/loss determined by simple score comparison

---

## 8. detectionIntegration.ts

**File**: `src/src_figma/app/engines/detectionIntegration.ts`
**Lines**: 349
**Purpose**: Integrates legacy `detectionFunctions.ts` into the Figma codebase. Provides converters from Figma PlayData to legacy detection formats, a batch detection runner (`runPlayDetections`) that runs all relevant detections after a play, and UI-friendly result mapping. Detection categories: Prompt (user confirms), Auto (automatic), Manual (user-initiated).

### Dependencies

```typescript
from '../components/EnhancedInteractiveField': type PlayData
from '../../../engines/detectionFunctions': type DetectionContext, PlayResult, PitcherAppearance,
  PromptResult, promptWebGem, promptRobbery, promptTOOTBLAN, promptNutShot, promptKilledPitcher,
  promptInsideParkHR, detectBlownSave, isSaveOpportunity, detectTriplePlay, detectHitIntoTriplePlay,
  detectEscapeArtist, detectPositionPlayerPitching, detectDroppedFly, detectBootedGrounder,
  detectWrongBaseThrow, detectPassedBallRun, detectThrowOutAtHome, detectPickedOff,
  detectWalkedInRun, detectClutchGrandSlam, detectRallyStarter, detectRallyKiller,
  detectIBBStrikeout, getPromptDetections
```

### Re-exported Functions (from detectionFunctions)

**Prompt Detection**: `promptWebGem`, `promptRobbery`, `promptTOOTBLAN`, `promptNutShot`, `promptKilledPitcher`, `promptInsideParkHR`

**Auto Detection**: `detectBlownSave`, `isSaveOpportunity`, `detectTriplePlay`, `detectHitIntoTriplePlay`, `detectEscapeArtist`, `detectPositionPlayerPitching`, `detectDroppedFly`, `detectBootedGrounder`, `detectWrongBaseThrow`, `detectPassedBallRun`, `detectThrowOutAtHome`, `detectPickedOff`, `detectWalkedInRun`, `detectClutchGrandSlam`, `detectRallyStarter`, `detectRallyKiller`, `detectIBBStrikeout`

**Aggregated**: `getPromptDetections`

### Re-exported Types

`DetectionContext`, `PlayResult`, `PitcherAppearance`, `PromptResult`

### Figma-Specific Types

```typescript
export interface UIDetectionResult {
  detected: boolean;
  eventType: string;
  message: string;
  fameImpact?: number;
  requiresConfirmation: boolean;
  icon: string;
}
```

### Figma-Specific Exported Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `convertPlayDataToPlayResult` | `(playData, batterInfo, pitcherInfo, rbi?) => LegacyPlayResult` | Convert Figma PlayData to legacy format |
| `convertGameStateToContext` | `(gameId, gameState, leverageIndex?, isPlayoffs?) => LegacyDetectionContext` | Convert game state to legacy format |
| `mapDetectionToUI` | `(detection, requiresConfirmation?) => UIDetectionResult | null` | Map detection to UI format |
| `runPlayDetections` | `(playData, batterInfo, pitcherInfo, gameState, options) => UIDetectionResult[]` | Batch run all detections after a play |
| `isSpectacularCatch` | `(playData) => boolean` | Quick check for spectacular catch |
| `isPotentialRobbery` | `(playData) => boolean` | Quick check for HR robbery |

### Key Logic

**PlayData to PlayResult conversion -- catch type inference** (line 87-99):

```typescript
if (playData.type === 'out' && playData.ballLocation) {
  const y = playData.ballLocation.y;
  if (y > 0.95) {
    catchType = 'WALL_CATCH';
  } else if (y > 0.8 && playData.playDifficulty === 'difficult') {
    catchType = 'DIVING_CATCH';
  } else if (playData.playDifficulty === 'difficult') {
    catchType = 'LEAPING_CATCH';
  } else {
    catchType = 'ROUTINE';
  }
}
```

**Batch detection in `runPlayDetections`** (line 218-318) runs these checks:
1. **Web Gem** -- on `out` or `foul_out` plays
2. **Robbery** -- on `out` or `foul_out` plays (HR denied)
3. **Triple Play** -- on `out` with >= 3 in fielding sequence and 3 outs on the play
4. **Clutch Grand Slam** -- on HR with 4 RBI
5. **TOOTBLAN** -- when runner outcomes include 'TOOTBLAN' reason

**TOOTBLAN outType inference** (line 307-310):

```typescript
const outType = (firstOutcome?.reason?.includes('PICKED_OFF') ? 'PICKED_OFF' :
                 firstOutcome?.reason?.includes('CAUGHT_STEALING') ? 'CAUGHT_STEALING' :
                 firstOutcome?.reason?.includes('PASSED_RUNNER') ? 'PASSED_RUNNER' :
                 'OUT_ADVANCING');
```

**Spectacular catch heuristic** (line 327-337):

```typescript
export function isSpectacularCatch(playData: PlayData): boolean {
  if (playData.type !== 'out' && playData.type !== 'foul_out') return false;
  if (!playData.ballLocation) return false;
  const y = playData.ballLocation.y;
  return (
    y > 0.8 ||
    playData.playDifficulty === 'difficult' ||
    playData.playDifficulty === 'impossible'
  );
}
```

**Potential robbery** (line 342-348): `y > 0.95` (at the wall)

**Icon map** (line 175-191):

| Event Type | Icon |
|------------|------|
| WEB_GEM | sparkles |
| ROBBERY | fire |
| TOOTBLAN | facepalm |
| NUT_SHOT / NUT_SHOT_EXIT | peanut |
| KILLED_PITCHER | collision |
| TRIPLE_PLAY | party |
| BLOWN_SAVE / BLOWN_SAVE_LOSS | broken heart |
| ESCAPE_ARTIST | top hat |
| POSITION_PLAYER_PITCHING | scream |
| CLUTCH_GRAND_SLAM | fireworks |
| RALLY_STARTER | lightning |
| RALLY_KILLER | stop sign |
| INSIDE_PARK_HR | runner |

### Edge Cases Handled

- `convertPlayDataToPlayResult` handles missing `outType` (defaults to `'GO'`)
- `convertGameStateToContext` creates placeholder runner objects when base is occupied
- `mapDetectionToUI` returns null for null detection
- `runPlayDetections` only runs web gem/robbery for `out`/`foul_out` plays
- Triple play detection requires exactly 3 outs on the play
- Clutch grand slam checks that `hitType === 'HR'` AND `rbi === 4`
- `isSpectacularCatch` requires `ballLocation` to exist

---

## 9. playerStateIntegration.ts

**File**: `src/src_figma/app/engines/playerStateIntegration.ts`
**Lines**: 637
**Purpose**: Integrates Mojo, Fitness, and Clutch systems from legacy engines into the Figma GameTracker. Provides a unified `CombinedPlayerState` interface, stat adjustment helpers (apply Mojo + Fitness multipliers to batting/pitching stats), UI display helpers (state badges, multiplier indicators), state change notifications, and game-level player state tracking.

### Dependencies

```typescript
from '../../../engines/mojoEngine': ~35 types/constants/functions (all re-exported)
from '../../../engines/fitnessEngine': ~35 types/constants/functions (all re-exported)
from '../../../engines/clutchCalculator': ~30 types/constants/functions (all re-exported)
```

### Re-exported from mojoEngine

**Types**: `MojoLevel`, `MojoName`, `MojoState`, `MojoChangeEvent`, `MojoTrigger`, `MojoTriggerValue`, `MojoEntry`, `MojoGameSnapshot`, `MojoAmplification`, `GameSituation`, `AdjustedStats`, `BaseStats`, `PlayResultForMojo`, `MojoSuggestion`, `MojoSplitStats`, `PlayerMojoSplits`, `MojoGameStats`

**Constants**: `MOJO_STATES`, `MOJO_TRIGGERS`, `MOJO_AMPLIFICATION`, `MOJO_CARRYOVER_RATE`

**Functions**: `getMojoState`, `getMojoDisplayName`, `getMojoEmoji`, `clampMojo`, `isValidMojoLevel`, `getMojoStatMultiplier`, `applyMojoToStat`, `applyMojoToAllStats`, `calculateAmplification`, `getMojoDelta`, `applyMojoChange`, `processMojoTriggers`, `calculateStartingMojo`, `getCarryoverExplanation`, `createMojoEntry`, `updateMojoEntry`, `calculateMojoGameStats`, `getMojoFameModifier`, `getMojoWARMultiplier`, `getMojoClutchMultiplier`, `inferMojoTriggers`, `suggestMojoChange`, `createEmptyMojoSplitStats`, `createPlayerMojoSplits`, `recalculateSplitRates`, `getMojoColor`, `getMojoBarFill`, `formatMojo`, `getMojoChangeNarrative`

### Re-exported from fitnessEngine

**Types**: `FitnessState`, `FitnessDefinition`, `FitnessEntry`, `FitnessChangeReason`, `PlayerPosition`, `PositionCategory`, `FitnessDecayConfig`, `FitnessRecoveryConfig`, `PlayerFitnessProfile`, `InjuryRisk`, `GameActivity`, `RecoveryProjection`

**Constants**: `FITNESS_STATES`, `FITNESS_STATE_ORDER`, `FITNESS_DECAY`, `FITNESS_RECOVERY`, `JUICED_REQUIREMENTS`

**Functions**: `getFitnessDefinition`, `getFitnessStateFromValue`, `getFitnessValue`, `canPlay`, `isRiskyToPlay`, `getPositionCategory`, `getFitnessStatMultiplier`, `applyFitnessToStat`, `applyCombinedMultiplier`, `calculateFitnessDecay`, `applyFitnessDecay`, `calculateDailyRecovery`, `applyRecovery`, `checkJuicedEligibility`, `applyJuicedStatus`, `updateJuicedStatus`, `calculateInjuryRisk`, `rollForInjury`, `getFitnessFameModifier`, `getFitnessWARMultiplier`, `calculateAdjustedFame`, `createFitnessProfile`, `createSeasonStartProfile`, `projectRecovery`, `getFitnessColor`, `getFitnessEmoji`, `getFitnessBarFill`, `formatFitness`, `getFitnessNarrative`, `getJuicedStigmaNarrative`, `getRandomJuicedNarrative`

### Re-exported from clutchCalculator

**Types**: `ContactQuality`, `ExitType`, `TrajectoryModifier`, `ClutchPlayResult` (renamed from PlayResult), `ParticipantRole`, `FielderPlayType`, `Position`, `ParticipantAttribution`, `PlayAttribution`, `PlayerClutchStats`, `PlayoffContext`

**Constants**: `DEFAULT_CONTACT_QUALITY`, `PLAYOFF_MULTIPLIERS`, `POSITION_ARM_DEFAULTS`, `CLUTCH_TIERS`, `CLUTCH_DISPLAY_CONFIG`

**Functions**: `getContactQualityFromUI`, `inferFlyBallDepth`, `inferGroundBallSpeed`, `getPlayoffMultiplier`, `getArmFactor`, `getInfieldSingleArmBlame`, `getSacFlyArmBlame`, `getBatterBaseValue`, `getPitcherBaseValue`, `getFielderBaseValue`, `getCatcherBaseValue`, `getRunnerBaseValue`, `getManagerBaseValue`, `applyContactQualityModifier`, `calculateParticipantClutch`, `calculatePlayAttribution`, `createPlayerClutchStats`, `accumulateClutchEvent`, `getClutchTier`, `getClutchConfidence`, `shouldDisplayClutchRating`, `calculateClutchTriggers`, `scaleToRange`, `getClutchVotingComponent`

### Figma-Specific Types

```typescript
export interface CombinedPlayerState {
  playerId: string;
  playerName: string;
  mojoLevel: MojoLevel;
  mojoEmoji: string;
  mojoColor: string;
  mojoMultiplier: number;
  fitnessState: FitnessState;
  fitnessEmoji: string;
  fitnessColor: string;
  fitnessMultiplier: number;
  canPlay: boolean;
  isRisky: boolean;
  combinedMultiplier: number;
  netClutch: number;
  clutchTier: string;
  clutchIcon: string;
  clutchColor: string;
  statusLine: string;
}

export interface BattingStats {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
}

export interface PitchingStats {
  velocity: number;
  junk: number;
  accuracy: number;
}

export interface StateChangeNotification {
  type: 'mojo_change' | 'fitness_change' | 'injury' | 'recovery';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  icon: string;
}

export interface GamePlayerState {
  playerId: string;
  startingMojo: MojoLevel;
  currentMojo: MojoLevel;
  startingFitness: FitnessState;
  currentFitness: FitnessState;
  inningsPlayed: number;
  pitchCount?: number;
  atBats: number;
  clutchMoments: number;
}
```

### Figma-Specific Exported Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `createCombinedPlayerState` | `(playerId, playerName, mojoLevel, fitnessProfile, clutchStats?) => CombinedPlayerState` | Unified player state for UI |
| `adjustStatForState` | `(baseStat, mojoLevel, fitnessState) => number` | Apply Mojo+Fitness to single stat |
| `adjustBattingStats` | `(stats: BattingStats, mojoLevel, fitnessState) => BattingStats` | Apply to all batting stats |
| `adjustPitchingStats` | `(stats: PitchingStats, mojoLevel, fitnessState) => PitchingStats` | Apply to all pitching stats |
| `getStateBadge` | `(mojoLevel, fitnessState) => {text, color, bgColor}` | Compact badge for player card |
| `getMultiplierIndicator` | `(mojoLevel, fitnessState) => {symbol, color, value}` | Arrow indicator |
| `formatMultiplier` | `(value: number) => string` | Format as +X% / -X% |
| `detectStateChanges` | `(playerId, playerName, prevMojo, currMojo, prevFitness, currFitness) => StateChangeNotification[]` | Detect notification-worthy changes |
| `createGamePlayerState` | `(playerId, startingMojo?, startingFitness?) => GamePlayerState` | Initialize game player state |
| `updateGamePlayerState` | `(state, update) => GamePlayerState` | Update after a play |

### Key Logic

**Combined multiplier** (line 287-289):

```typescript
const mojoMult = getMojoStatMultiplier(mojoLevel);
const fitnessMult = getFitnessStatMultiplier(fitnessProfile.currentFitness);
const combinedMult = mojoMult * fitnessMult;
```

**Stat adjustment** (line 339-347):

```typescript
export function adjustStatForState(
  baseStat: number, mojoLevel: MojoLevel, fitnessState: FitnessState
): number {
  const mojoMult = getMojoStatMultiplier(mojoLevel);
  const fitnessMult = getFitnessStatMultiplier(fitnessState);
  return Math.round(baseStat * mojoMult * fitnessMult);
}
```

**Status line generation** (line 299-308):

```typescript
if (mojoLevel >= 2) statusLine = 'On fire!';
else if (mojoLevel === 1) statusLine = 'In the zone';
else if (mojoLevel === -1) statusLine = 'Pressing';
else if (mojoLevel <= -2) statusLine = 'Struggling';
else statusLine = 'Steady';

if (fitnessProfile.currentFitness === 'JUICED') statusLine += ' (Juiced)';
else if (isRisky) statusLine += ' (Playing hurt)';
else if (!canPlayNow) statusLine = 'Injured';
```

**State badge priority** (line 402-434):

```
HURT > JUICED > JACKED (mojo +2) > RATTLED (mojo -2) > WEAK > STRAINED > HOT (mojo +1) > COLD (mojo -1) > empty
```

**Multiplier indicator thresholds** (line 439-461):

| Combined Mult | Symbol | Color |
|---------------|--------|-------|
| >= 1.3 | double up arrow | Green |
| >= 1.1 | up arrow | Light green |
| <= 0.7 | double down arrow | Red |
| <= 0.9 | down arrow | Orange |
| else | empty | Gray |

**State change notifications** (line 487-569):

- Mojo +2 (JACKED) = info notification
- Mojo -2 (RATTLED) = warning notification
- Mojo delta >= 2 = info (surging)
- Mojo delta <= -2 = warning (crashing)
- Fitness HURT = critical (injured)
- Previous HURT, now not HURT = info (recovered)
- Fitness JUICED = info
- Fitness WEAK/STRAINED from non-WEAK/STRAINED = warning (wearing down)

**Game player state tracking** (line 593-636):

```typescript
export function updateGamePlayerState(
  state: GamePlayerState,
  update: { newMojo?; newFitness?; addedInnings?; addedPitches?; hadAtBat?; hadClutchMoment? }
): GamePlayerState {
  return {
    ...state,
    currentMojo: update.newMojo ?? state.currentMojo,
    currentFitness: update.newFitness ?? state.currentFitness,
    inningsPlayed: state.inningsPlayed + (update.addedInnings ?? 0),
    pitchCount: update.addedPitches !== undefined
      ? (state.pitchCount ?? 0) + update.addedPitches
      : state.pitchCount,
    atBats: state.atBats + (update.hadAtBat ? 1 : 0),
    clutchMoments: state.clutchMoments + (update.hadClutchMoment ? 1 : 0),
  };
}
```

### Edge Cases Handled

- `clutchStats` optional in `createCombinedPlayerState` -- defaults to `{ tier: 'Unknown', icon: '?', color: 'gray' }`
- `canPlay` check: `currentFitness !== 'HURT'`
- `isRisky` check: STRAINED or WEAK
- Status line overwrites to 'Injured' when `!canPlayNow` (takes priority over mojo text)
- `pitchCount` initialized to `undefined` (only set when `addedPitches` is first provided)
- `getStateBadge` returns empty text/colors for normal state (no badge)
- Notification detection handles recovery from HURT specifically in `else` branch

---

## Summary: Architecture Pattern

All 9 files follow the **Integration Wrapper** pattern:

1. **Re-export** -- Types, constants, and functions from legacy engines (`src/engines/`)
2. **Convert** -- Figma-specific data formats to legacy formats (e.g., `convertPlayDataToPlayResult`)
3. **Extend** -- Add UI-friendly helpers (icons, colors, formatting, display info)
4. **Track** -- Provide game-session-level tracking state (e.g., `GameFameTracker`, `GamePlayerState`)

### File Size Summary

| File | Lines | Pattern |
|------|-------|---------|
| inheritedRunnerTracker.ts | 529 | Standalone engine (no re-exports) |
| saveDetector.ts | 474 | Standalone engine (no re-exports) |
| d3kTracker.ts | 403 | Standalone engine (no re-exports) |
| fameIntegration.ts | 515 | Re-export + heavy extension |
| fanMoraleIntegration.ts | 362 | Re-export + display helpers |
| mwarIntegration.ts | 346 | Re-export + Manager Moment logic |
| narrativeIntegration.ts | 82 | Re-export + 1 helper |
| playerStateIntegration.ts | 637 | Re-export 3 engines + unified state |
| detectionIntegration.ts | 349 | Re-export + converters + batch runner |
| **TOTAL** | **3,697** | |

### Import Dependency Map

```
inheritedRunnerTracker.ts  <-- ../types/substitution
saveDetector.ts            <-- ../types/substitution
d3kTracker.ts              <-- (none)
fameIntegration.ts         <-- ../../../engines/fameEngine, ../../../types/game
fanMoraleIntegration.ts    <-- ../../../engines/fanMoraleEngine
mwarIntegration.ts         <-- ../../../engines/mwarCalculator, ../../../engines/leverageCalculator
narrativeIntegration.ts    <-- ../../../engines/narrativeEngine
detectionIntegration.ts    <-- ../../../engines/detectionFunctions, ../components/EnhancedInteractiveField
playerStateIntegration.ts  <-- ../../../engines/mojoEngine, ../../../engines/fitnessEngine, ../../../engines/clutchCalculator
```

### Standalone vs. Integration

- **Standalone engines** (3 files): `inheritedRunnerTracker`, `saveDetector`, `d3kTracker` -- These contain original logic, not re-exports.
- **Integration wrappers** (6 files): `fameIntegration`, `fanMoraleIntegration`, `mwarIntegration`, `narrativeIntegration`, `detectionIntegration`, `playerStateIntegration` -- These primarily re-export from `src/engines/` and add Figma-specific adapters.
