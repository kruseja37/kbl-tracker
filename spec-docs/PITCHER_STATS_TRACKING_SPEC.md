# Pitcher Stats Tracking Specification

> **Purpose**: Define how pitcher statistics are tracked, calculated, and displayed during games
> **Integration**: PWAR_CALCULATION_SPEC.md (uses these stats), INHERITED_RUNNERS_SPEC.md (ER attribution), PITCH_COUNT_TRACKING_SPEC.md (pitch counts)
> **Related Specs**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §4 (In-Game Tracking)
> **SMB4 Reference**: SMB4_GAME_MECHANICS.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Counting Stats](#2-core-counting-stats)
3. [Innings Pitched (IP) Calculation](#3-innings-pitched-ip-calculation)
4. [Runs and Earned Runs](#4-runs-and-earned-runs)
5. [Win/Loss/Save Decisions](#5-winlosssave-decisions)
6. [Hold and Blown Save](#6-hold-and-blown-save)
7. [Total Batters Faced (TBF)](#7-total-batters-faced-tbf)
8. [Quality Start and Complete Game](#8-quality-start-and-complete-game)
9. [Special Achievement Detection](#9-special-achievement-detection)
10. [Pitcher Game Line Format](#10-pitcher-game-line-format)
11. [Data Schema](#11-data-schema)
12. [Integration Notes](#12-integration-notes)

---

## 1. Overview

### What This Spec Covers

This spec defines the **tracking mechanics** for pitcher statistics during gameplay:
- When and how stats increment
- Decision rules for W/L/SV/H/BS
- Display formatting for box scores
- Special achievement detection (Maddux, Immaculate Inning, etc.)

### What This Spec Does NOT Cover

- **WAR calculation**: See PWAR_CALCULATION_SPEC.md
- **Inherited runner ER attribution**: See INHERITED_RUNNERS_SPEC.md
- **Pitch count tracking**: See PITCH_COUNT_TRACKING_SPEC.md
- **Pitching change flow**: See SUBSTITUTION_FLOW_SPEC.md

### Design Philosophy

- **Track at the source**: Capture stats as events happen, not derived later
- **Real-time accuracy**: Stats should be accurate at any point during the game
- **SMB4 alignment**: Respect what's possible in the game (no balks, etc.)

---

## 2. Core Counting Stats

### 2.1 Stats Tracked Per Game Appearance

| Stat | Abbrev | Description | When Incremented |
|------|--------|-------------|------------------|
| Innings Pitched | IP | Outs recorded ÷ 3 | Each out recorded |
| Hits Allowed | H | Hits given up | Each hit (1B, 2B, 3B, HR) |
| Runs Allowed | R | Total runs scored | Each run scores |
| Earned Runs | ER | Runs without errors | See INHERITED_RUNNERS_SPEC |
| Strikeouts | K | Batters struck out | Each strikeout |
| Walks | BB | Bases on balls | Each walk (not IBB) |
| Intentional Walks | IBB | Intentional walks | Each IBB |
| Hit By Pitch | HBP | Batters hit | Each HBP |
| Home Runs | HR | Home runs allowed | Each HR |
| Pitch Count | PC | Total pitches | Each pitch |
| Batters Faced | TBF | Total batters faced | Each PA completed |

### 2.2 Event-to-Stat Mapping

```typescript
function updatePitcherStats(event: AtBatResult, pitcher: PitcherGameStats) {
  // Always increment TBF for completed PA
  pitcher.battersFaced += 1;

  switch (event.result) {
    // HITS
    case 'SINGLE':
    case 'DOUBLE':
    case 'TRIPLE':
      pitcher.hits += 1;
      break;
    case 'HOME_RUN':
      pitcher.hits += 1;
      pitcher.homeRuns += 1;
      break;

    // OUTS (add to IP)
    case 'STRIKEOUT':
    case 'STRIKEOUT_LOOKING':
      pitcher.strikeouts += 1;
      pitcher.outsRecorded += 1;
      break;
    case 'GROUNDOUT':
    case 'FLYOUT':
    case 'LINEOUT':
    case 'POPOUT':
      pitcher.outsRecorded += 1;
      break;
    case 'DOUBLE_PLAY':
      pitcher.outsRecorded += 2;
      break;
    case 'TRIPLE_PLAY':
      pitcher.outsRecorded += 3;
      break;

    // WALKS
    case 'WALK':
      pitcher.walks += 1;
      break;
    case 'INTENTIONAL_WALK':
      pitcher.intentionalWalks += 1;
      // Note: IBB doesn't count toward BB for FIP
      break;

    // HBP
    case 'HIT_BY_PITCH':
      pitcher.hitByPitch += 1;
      break;

    // ERRORS (batter reached, no hit charged)
    case 'ERROR':
    case 'FIELDERS_CHOICE':
      // No hit, no out - just TBF already incremented
      break;

    // SACRIFICE (out but different TBF handling)
    case 'SAC_FLY':
    case 'SAC_BUNT':
      pitcher.outsRecorded += 1;
      // TBF already incremented
      break;
  }
}
```

### 2.3 Wild Pitch and Passed Ball

Wild pitches and passed balls are tracked separately but don't affect the core pitching line:

```typescript
// WP is pitcher's fault
if (event.type === 'WILD_PITCH') {
  pitcher.wildPitches += 1;
}

// PB is catcher's fault - no pitcher stat impact
// But runs scoring on WP/PB have ER implications
// See INHERITED_RUNNERS_SPEC.md for attribution
```

---

## 3. Innings Pitched (IP) Calculation

### 3.1 Outs to IP Conversion

Innings Pitched is stored as **outs recorded** internally, then displayed in fractional format.

```typescript
interface PitcherGameStats {
  outsRecorded: number;  // Store as outs (0, 1, 2, 3, 4, 5, ...)
  // IP is derived for display
}

function formatIP(outsRecorded: number): string {
  const fullInnings = Math.floor(outsRecorded / 3);
  const partialOuts = outsRecorded % 3;

  if (partialOuts === 0) {
    return `${fullInnings}.0`;
  } else {
    return `${fullInnings}.${partialOuts}`;
  }
}

// Examples:
// 0 outs  → "0.0"
// 1 out   → "0.1"
// 2 outs  → "0.2"
// 3 outs  → "1.0"
// 14 outs → "4.2"
// 27 outs → "9.0"
```

### 3.2 IP Arithmetic

When aggregating IP across appearances:

```typescript
function addIP(ip1Outs: number, ip2Outs: number): number {
  return ip1Outs + ip2Outs;  // Simple addition when stored as outs
}

function ipToDecimal(outsRecorded: number): number {
  // For rate calculations (ERA, WHIP, etc.)
  return outsRecorded / 3;
}

// Example: 4.2 IP + 2.1 IP
// = 14 outs + 7 outs = 21 outs = 7.0 IP
```

### 3.3 Display Formats

| Context | Format | Example |
|---------|--------|---------|
| Game line | X.X | 6.2, 4.1, 9.0 |
| Season totals | X.X | 142.1, 89.2 |
| Verbal | "X and a third" | "5 and two-thirds" |

---

## 4. Runs and Earned Runs

### 4.1 Run Scoring

When a run scores, determine:
1. Which pitcher is responsible (see INHERITED_RUNNERS_SPEC.md)
2. Whether it's earned or unearned

```typescript
function recordRunScored(
  runner: Runner,
  gameState: GameState,
  responsiblePitcher: Pitcher
) {
  // Always add to Runs
  responsiblePitcher.runsAllowed += 1;

  // Determine if earned
  const isEarned = determineIfEarnedRun(runner, gameState);
  if (isEarned) {
    responsiblePitcher.earnedRuns += 1;
  }
}
```

### 4.2 Earned Run Summary

> **Full ER/UER logic is in INHERITED_RUNNERS_SPEC.md**

Quick reference:

| Scenario | Earned? |
|----------|---------|
| Runner reached on hit, scored normally | ✅ Earned |
| Runner reached on error | ❌ Unearned |
| Runner advanced due to error | ❌ Unearned |
| Runner scored on error | ❌ Unearned |
| Inning extended by error, then run scores | ❌ Unearned |
| Runner scored on wild pitch | ✅ Earned (pitcher's fault) |
| Runner scored on passed ball | ❌ Unearned (catcher's fault) |

> **Note**: Passed balls are the catcher's fault, not the pitcher's. Runs scoring on PB are unearned per MLB Rule 9.16(e).

---

## 5. Win/Loss/Save Decisions

### 5.1 Core Concepts

- **Decision**: A W, L, or ND (No Decision) assigned to each pitcher
- **Pitcher of Record**: The pitcher in line for W or L based on game state
- **Only one W and one L per game** (each team)

### 5.2 Win (W) Rules

```typescript
function determineWinningPitcher(game: CompletedGame): Pitcher | null {
  const winningTeam = game.homeScore > game.awayScore ? 'home' : 'away';
  const pitchers = game.pitchers.filter(p => p.team === winningTeam);

  // Find the pitcher of record when the winning team took the lead for good
  const leadChanges = game.leadChanges;
  const finalLeadChange = leadChanges.findLast(lc => lc.team === winningTeam && !lc.wasLost);

  if (!finalLeadChange) return null;

  const pitcherOfRecord = finalLeadChange.pitcherAtTime;

  // STARTING PITCHER WIN REQUIREMENT
  if (pitcherOfRecord.isStarter) {
    // Starter must pitch at least 5 innings to qualify for win
    // Exception: In shorter games (6-7 innings), minimum scales down
    const minOuts = getMinimumOutsForStarterWin(game.scheduledInnings);
    if (pitcherOfRecord.outsRecorded < minOuts) {
      // Win goes to most effective reliever instead
      return findMostEffectiveReliever(pitchers, finalLeadChange.inning);
    }
  }

  return pitcherOfRecord;
}

function getMinimumOutsForStarterWin(scheduledInnings: number): number {
  // MLB rule: 5 IP minimum (15 outs) for 9-inning games
  // Scale for shorter games
  if (scheduledInnings >= 9) return 15;  // 5.0 IP
  if (scheduledInnings === 7) return 12;  // 4.0 IP
  if (scheduledInnings === 6) return 9;   // 3.0 IP
  return Math.floor(scheduledInnings / 2) * 3;  // Half the game
}

/**
 * Find the most effective reliever for win assignment when starter doesn't qualify.
 * MLB Rule: Scorer's discretion, typically longest appearance among eligible relievers.
 */
function findMostEffectiveReliever(
  pitchers: PitcherAppearance[],
  leadTakenInning: number
): Pitcher | null {
  const eligibleRelievers = pitchers.filter(p =>
    !p.isStarter &&
    p.entryInning <= leadTakenInning  // Must have been in game when lead taken
  );

  if (eligibleRelievers.length === 0) return null;

  // Primary: Longest appearance (most outs recorded)
  // Tiebreaker: Entered earliest
  return eligibleRelievers.sort((a, b) => {
    if (b.outsRecorded !== a.outsRecorded) {
      return b.outsRecorded - a.outsRecorded;
    }
    return a.entryInning - b.entryInning;
  })[0];
}
```

### 5.3 Loss (L) Rules

```typescript
function determineLosingPitcher(game: CompletedGame): Pitcher | null {
  const losingTeam = game.homeScore < game.awayScore ? 'home' : 'away';

  // Find the pitcher who gave up the lead for the last time
  // (the run that made the score go from tied/ahead to behind and never recovered)
  const criticalRun = findCriticalGoAheadRun(game, losingTeam);

  if (!criticalRun) return null;

  // The pitcher responsible for that runner gets the L
  return criticalRun.pitcherResponsible;
}

/**
 * Find the run that gave the opponent the lead they never lost.
 * Returns the RunScored event and the pitcher responsible.
 */
function findCriticalGoAheadRun(game: CompletedGame, losingTeam: string): RunScored | null {
  // Work backwards through runs scored against the losing team
  // Find the run that put opponent ahead and they never lost that lead
  const opponentTeam = losingTeam === 'home' ? 'away' : 'home';

  let currentLeadForOpponent = 0;
  let criticalRun: RunScored | null = null;

  for (const run of game.runsScored) {
    if (run.scoringTeam === opponentTeam) {
      currentLeadForOpponent += 1;
      // If this run gave opponent the lead
      const scoreBefore = game.getScoreAtPoint(run.timestamp);
      const wasGoAhead = scoreBefore[opponentTeam] === scoreBefore[losingTeam];
      if (wasGoAhead) {
        criticalRun = run;  // This might be THE run if lead holds
      }
    } else {
      currentLeadForOpponent -= 1;
      if (currentLeadForOpponent <= 0) {
        criticalRun = null;  // Lead was lost, reset
      }
    }
  }

  return criticalRun;
}
```

### 5.4 No Decision (ND)

A pitcher gets a No Decision if:
- They left with the game tied
- Their team lost the lead after they left
- The game was tied when they left and opponent later took lead

### 5.5 Decision Assignment Flow

```
Game ends → Determine winning team
          → Find when winning team took final lead
          → Identify pitcher of record (POR) at that moment
          → If POR is starter with <5 IP: give W to best reliever
          → Otherwise: POR gets W
          → Pitcher who allowed go-ahead run gets L
          → All others get ND
```

### 5.6 Example Scenarios

**Scenario 1: Starter goes 6 IP, leaves with lead, team wins**
```
Starter:  6.0 IP, left leading 4-2
Reliever: 3.0 IP, maintained lead
Final: 4-3 W

→ Starter gets W (was POR when lead was taken, had 5+ IP)
→ Reliever gets ND
```

**Scenario 2: Starter leaves early, reliever holds**
```
Starter:  3.2 IP, left trailing 3-1
Reliever1: 2.1 IP, team tied it, then took lead during his stint
Reliever2: 3.0 IP, held lead
Final: 5-3 W

→ Starter gets ND (left trailing, never had lead)
→ Reliever1 gets W (was POR when lead was taken)
→ Reliever2 gets ND
```

**Scenario 3: Blown lead**
```
Starter: 7.0 IP, left leading 3-2
Reliever: 2.0 IP, gave up 2 runs, team lost
Final: 4-3 L

→ Starter gets ND (left with lead but team lost)
→ Reliever gets L (gave up go-ahead run)
```

---

## 6. Hold and Blown Save

### 6.1 Save (SV) Rules

A save is credited when a pitcher:

```typescript
function qualifiesForSave(pitcher: PitcherAppearance, game: CompletedGame): boolean {
  // Must be a reliever (not the starter)
  if (pitcher.isStarter) return false;

  // Team must win
  if (!game.teamWon(pitcher.team)) return false;

  // Must finish the game
  if (!pitcher.finishedGame) return false;

  // Must not be winning pitcher
  if (pitcher === game.winningPitcher) return false;

  // Must meet one of these criteria:
  return (
    // 1. Entered with lead of 3 or fewer runs and pitched at least 1 inning
    (pitcher.leadWhenEntered <= 3 && pitcher.outsRecorded >= 3) ||

    // 2. Entered with tying run on base, at bat, or on deck
    pitcher.tyingRunInScoringPosition ||

    // 3. Pitched at least 3 innings
    pitcher.outsRecorded >= 9
  );
}
```

### 6.2 Save Opportunity

Track when a pitcher enters a save situation:

```typescript
function isSaveOpportunity(gameState: GameState, pitcher: Pitcher): boolean {
  const lead = gameState.getLeadForTeam(pitcher.team);

  // Must have a lead
  if (lead <= 0) return false;

  // Must be in final 3 innings (or extra innings)
  if (gameState.inning < gameState.scheduledInnings - 2) return false;

  // Check criteria
  return (
    lead <= 3 ||
    gameState.tyingRunOnBase ||
    gameState.tyingRunAtBat ||
    gameState.tyingRunOnDeck
  );
}
```

### 6.3 Hold (HLD) Rules

A hold is credited when a reliever:

```typescript
function qualifiesForHold(pitcher: PitcherAppearance, game: CompletedGame): boolean {
  // Must be a reliever
  if (pitcher.isStarter) return false;

  // Team must win
  if (!game.teamWon(pitcher.team)) return false;

  // Must NOT be the final pitcher (that's potentially a save)
  if (pitcher.finishedGame) return false;

  // Must have entered in a save situation
  if (!pitcher.enteredInSaveSituation) return false;

  // Must have maintained the lead (not blown save)
  if (pitcher.blownSave) return false;

  // Must have recorded at least 1 out
  if (pitcher.outsRecorded < 1) return false;

  // Must not be the winning pitcher
  if (pitcher === game.winningPitcher) return false;

  return true;
}
```

### 6.4 Blown Save (BS) Rules

```typescript
function isBlownSave(pitcher: PitcherAppearance): boolean {
  // Must have entered in save situation
  if (!pitcher.enteredInSaveSituation) return false;

  // Must have allowed the tying or go-ahead run
  // (Lead was lost during their appearance)
  return pitcher.leadLostDuringAppearance;
}
```

**Note**: A pitcher can get both a BS and a W (if team comes back).

---

## 7. Total Batters Faced (TBF)

### 7.1 Definition

TBF counts every completed plate appearance against a pitcher.

```typescript
function incrementTBF(pitcher: PitcherGameStats, paResult: PAResult) {
  // Increment for ANY completed PA
  // Includes: hits, outs, walks, HBP, errors, FC, etc.
  pitcher.tbf += 1;
}
```

### 7.2 TBF vs IP Relationship

```
Average TBF per inning ≈ 4.3 (MLB)
TBF = (IP × 3) + Hits + Walks + HBP + Errors - Double Plays
```

### 7.3 Usage

TBF is used for:
- Pitch efficiency (PC/TBF)
- Rate stats when IP is too small (1-inning relievers)
- Workload tracking

---

## 8. Quality Start and Complete Game

### 8.1 Quality Start (QS)

```typescript
function isQualityStart(starter: PitcherGameStats, gameInnings: number): boolean {
  // Standard: 6+ IP, 3 or fewer ER
  // Scale for shorter games

  const minOuts = gameInnings >= 9 ? 18 : Math.floor(gameInnings * 2);  // 2/3 of game
  const maxER = gameInnings >= 9 ? 3 : Math.ceil(gameInnings / 3);

  return starter.outsRecorded >= minOuts && starter.earnedRuns <= maxER;
}
```

| Game Length | Min IP | Max ER |
|-------------|--------|--------|
| 9 innings | 6.0 | 3 |
| 7 innings | 4.2 | 3 |
| 6 innings | 4.0 | 2 |

### 8.2 Complete Game (CG)

```typescript
function isCompleteGame(pitcher: PitcherGameStats, game: CompletedGame): boolean {
  // Pitcher must pitch entire game for their team
  // (All defensive innings)
  return pitcher.outsRecorded === game.totalOuts && pitcher.isStarter;
}
```

### 8.3 Shutout (SHO)

```typescript
function isShutout(pitcher: PitcherGameStats, game: CompletedGame): boolean {
  return isCompleteGame(pitcher, game) && pitcher.runsAllowed === 0;
}
```

### 8.4 Combined Shutout

When multiple pitchers combine for a shutout:
- Track as team achievement
- No individual SHO credit
- All participating pitchers get narrative mention

---

## 9. Special Achievement Detection

### 9.1 Maddux

A Maddux is a complete game shutout with low pitch count.

```typescript
function isMaddux(pitcher: PitcherGameStats, game: CompletedGame): boolean {
  if (!isShutout(pitcher, game)) return false;

  // Pitch threshold scales with game length
  const threshold = getMadduxThreshold(game.scheduledInnings);
  return pitcher.pitchCount < threshold;
}

function getMadduxThreshold(innings: number): number {
  // Threshold is < (innings × 9.44), rounded down
  // 9 innings: < 85 pitches (9 × 9.44 = 84.96, so threshold is 85)
  // 7 innings: < 66 pitches (7 × 9.44 = 66.08, so threshold is 66)
  // 6 innings: < 57 pitches (6 × 9.44 = 56.64, so threshold is 57)
  return Math.ceil(innings * 9.44);
}
```

**Fame Bonus**: +3 for Maddux (see SPECIAL_EVENTS_SPEC.md)

### 9.2 Immaculate Inning

9 pitches, 9 strikes, 3 strikeouts in a single inning.

```typescript
interface InningPitchData {
  inning: number;
  pitches: number;
  outsRecorded: number;  // Outs in this inning (for 9-pitch inning detection)
  strikeouts: number;
  // Note: strikes count not tracked in SMB4 (no pitch location data)
}

function isImmaculateInning(inningData: InningPitchData): boolean {
  // Immaculate Inning: 9 pitches, 3 strikeouts
  // Note: In real baseball, all 9 pitches must be strikes.
  // In SMB4, we can't track strikes (no pitch location data).
  // We infer it: 9 pitches + 3 Ks = must be 3 pitches per K = all strikes.
  return (
    inningData.pitches === 9 &&
    inningData.strikeouts === 3 &&
    inningData.outsRecorded === 3
  );
}
```

**Detection**: Track per-inning pitch data. At end of each inning, check criteria.

**Fame Bonus**: +2 for Immaculate Inning

### 9.3 9-Pitch Inning (Non-Immaculate)

3 outs on exactly 9 pitches, but not all strikeouts.

```typescript
function isNinePitchInning(inningData: InningPitchData): boolean {
  return (
    inningData.pitches === 9 &&
    inningData.outsRecorded === 3 &&
    !isImmaculateInning(inningData)  // Not already immaculate
  );
}
```

**Fame Bonus**: +1 for 9-pitch inning

### 9.4 No-Hitter

```typescript
function isNoHitter(pitcher: PitcherGameStats, game: CompletedGame): boolean {
  return isCompleteGame(pitcher, game) && pitcher.hits === 0;
}
```

**Fame Bonus**: +3 for No-Hitter

### 9.5 Perfect Game

```typescript
function isPerfectGame(pitcher: PitcherGameStats, game: CompletedGame): boolean {
  // Perfect game: no baserunners allowed at all
  // Check: no hits, no walks, no HBP, and no errors by defense during pitcher's stint
  return (
    isNoHitter(pitcher, game) &&
    pitcher.walks === 0 &&
    pitcher.hitByPitch === 0 &&
    game.getErrorsWhilePitcherOnMound(pitcher.pitcherId) === 0
  );
}

// Note: game.getErrorsWhilePitcherOnMound() tracks defensive errors
// that occurred while this pitcher was pitching. This is a game-level
// stat, not stored in PitcherGameStats directly.
```

**Fame Bonus**: +5 for Perfect Game

### 9.6 Detection Timing

| Achievement | When to Check |
|-------------|---------------|
| Immaculate Inning | End of each inning |
| 9-Pitch Inning | End of each inning |
| Maddux | End of game |
| No-Hitter | End of game |
| Perfect Game | End of game |

---

## 10. Pitcher Game Line Format

### 10.1 Standard Box Score Format

```
NAME            IP    H    R   ER   BB    K   HR   PC
Smith (W, 8-3)  6.0   5    2    2    1    7    1   89
Jones           2.0   1    0    0    0    3    0   28
Davis (S, 15)   1.0   0    0    0    1    2    0   19
```

### 10.2 Format Specification

```typescript
interface PitcherGameLine {
  name: string;
  decision?: 'W' | 'L' | 'S' | 'H' | 'BS';  // If applicable
  seasonRecord?: { wins: number; losses: number };  // For starters
  saveNumber?: number;  // For closers

  ip: string;      // "6.0", "4.2"
  h: number;       // Hits
  r: number;       // Runs
  er: number;      // Earned Runs
  bb: number;      // Walks
  k: number;       // Strikeouts
  hr: number;      // Home Runs
  pc: number;      // Pitch Count
}

function formatPitcherLine(stats: PitcherGameStats, decision?: string): string {
  const name = stats.name;
  const decisionStr = decision ? ` (${decision})` : '';

  return [
    `${name}${decisionStr}`.padEnd(16),
    formatIP(stats.outsRecorded).padStart(4),
    stats.hits.toString().padStart(5),
    stats.runsAllowed.toString().padStart(5),
    stats.earnedRuns.toString().padStart(5),
    stats.walks.toString().padStart(5),
    stats.strikeouts.toString().padStart(5),
    stats.homeRuns.toString().padStart(5),
    stats.pitchCount.toString().padStart(5)
  ].join('');
}
```

### 10.3 Extended Format (with inherited runners)

```
NAME            IP    H    R   ER   BB    K   HR   PC   IR  IRS
Smith (W, 8-3)  6.0   5    2    2    1    7    1   89    -    -
Jones           2.0   1    1    0    0    3    0   28    2    1
Davis (S, 15)   1.0   0    0    0    1    2    0   19    1    0
```

- **IR**: Inherited Runners
- **IRS**: Inherited Runners Scored (charged to previous pitcher)

---

## 11. Data Schema

### 11.1 Pitcher Game Stats

```typescript
interface PitcherGameStats {
  pitcherId: string;
  pitcherName: string;
  gameId: string;
  team: 'home' | 'away';

  // Role
  isStarter: boolean;
  entryInning: number;
  entryOuts: number;
  exitInning?: number;
  exitOuts?: number;
  finishedGame: boolean;

  // Core Stats (stored)
  outsRecorded: number;  // IP derived from this
  hits: number;
  runsAllowed: number;
  earnedRuns: number;
  walks: number;
  intentionalWalks: number;
  strikeouts: number;
  hitByPitch: number;
  homeRuns: number;
  wildPitches: number;
  pitchCount: number;
  battersFaced: number;

  // Decision
  decision?: 'W' | 'L' | 'ND';
  save?: boolean;
  hold?: boolean;
  blownSave?: boolean;

  // Inherited Runners
  inheritedRunners: number;
  inheritedRunnersScored: number;

  // Bequeathed Runners
  bequeathedRunners: number;
  bequeathedRunnersScored: number;

  // Context
  leadWhenEntered?: number;
  enteredInSaveSituation: boolean;
  leadLostDuringAppearance: boolean;

  // Special Achievements
  qualityStart?: boolean;
  completeGame?: boolean;
  shutout?: boolean;
  noHitter?: boolean;
  perfectGame?: boolean;
  maddux?: boolean;
  immaculateInnings: number[];  // Which innings
}
```

### 11.2 Season Aggregation

```typescript
interface PitcherSeasonStats {
  pitcherId: string;
  season: number;
  team: string;

  // Counting Stats
  gamesPlayed: number;
  gamesStarted: number;
  outsRecorded: number;  // Total IP in outs
  hits: number;
  runsAllowed: number;
  earnedRuns: number;
  walks: number;
  intentionalWalks: number;
  strikeouts: number;
  hitByPitch: number;
  homeRuns: number;
  wildPitches: number;
  totalPitches: number;
  totalBattersFaced: number;

  // Decisions
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  blownSaves: number;

  // Derived Stats (calculated)
  era: number;           // (ER / IP) × 9
  whip: number;          // (BB + H) / IP
  kPer9: number;         // (K / IP) × 9
  bbPer9: number;        // (BB / IP) × 9
  hrPer9: number;        // (HR / IP) × 9
  fip: number;           // See PWAR_CALCULATION_SPEC

  // Achievements
  qualityStarts: number;
  completeGames: number;
  shutouts: number;
  noHitters: number;
  perfectGames: number;
  madduxes: number;
  immaculateInnings: number;

  // Inherited Runners
  totalInheritedRunners: number;
  totalInheritedRunnersScored: number;
  inheritedRunnersScoredPct: number;
}
```

---

## 12. Integration Notes

### 12.1 With PWAR_CALCULATION_SPEC

pWAR uses:
- `outsRecorded` → IP for FIP denominator
- `strikeouts` → K for FIP
- `walks` (NOT intentionalWalks) → BB for FIP
- `hitByPitch` → HBP for FIP
- `homeRuns` → HR for FIP
- `gamesStarted` vs `gamesPlayed` → Starter/Reliever split

### 12.2 With INHERITED_RUNNERS_SPEC

ER attribution handled there. This spec only tracks:
- `runsAllowed` (total)
- `earnedRuns` (result of attribution)
- `inheritedRunners` / `inheritedRunnersScored` (for display)

### 12.3 With PITCH_COUNT_TRACKING_SPEC

This spec uses pitch count for:
- Maddux detection
- Immaculate inning detection
- Box score display
- TBF correlation

### 12.4 With SPECIAL_EVENTS_SPEC

Fame bonuses awarded by SPECIAL_EVENTS_SPEC:
- Maddux: +3
- Immaculate Inning: +2
- 9-Pitch Inning: +1
- No-Hitter: +3
- Perfect Game: +5

This spec provides the **detection logic**; SPECIAL_EVENTS_SPEC provides the **Fame values**.

### 12.5 With SUBSTITUTION_FLOW_SPEC

When pitching change occurs:
1. SUBSTITUTION_FLOW_SPEC handles the flow
2. This spec captures outgoing pitcher's final stats
3. INHERITED_RUNNERS_SPEC tracks runner ownership

---

## Appendix: Quick Reference

### IP Conversion Table

| Outs | IP Display | Decimal |
|------|------------|---------|
| 0 | 0.0 | 0.000 |
| 1 | 0.1 | 0.333 |
| 2 | 0.2 | 0.667 |
| 3 | 1.0 | 1.000 |
| 4 | 1.1 | 1.333 |
| 5 | 1.2 | 1.667 |
| 6 | 2.0 | 2.000 |
| 14 | 4.2 | 4.667 |
| 27 | 9.0 | 9.000 |

### Decision Assignment Cheat Sheet

| Situation | W | L | Notes |
|-----------|---|---|-------|
| Starter 6+ IP, team wins | Starter | Opponent | Standard |
| Starter 4 IP, team wins | Best reliever | Opponent | Starter didn't qualify |
| Reliever takes lead, holds | Reliever | Opponent | |
| Reliever blows lead, team wins anyway | Reliever (W+BS) | Opponent | Can have both |
| Starter leaves leading, reliever blows | Starter (ND) | Reliever | |

### Maddux Thresholds

| Innings | Pitch Threshold |
|---------|-----------------|
| 9 | < 85 |
| 7 | < 66 |
| 6 | < 57 |
| 5 | < 47 |

---

*Last Updated: January 22, 2026*
*Version: 1.0 - Initial creation*
