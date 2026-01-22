# Leverage Index (LI) and Clutch System Specification

> **Source**: Based on Tom Tango's Leverage Index methodology
> **Purpose**: Automate clutch/choke scoring using real-time game state tracking
> **Integration**: Replaces binary "close game" checks with granular LI-weighted values
> **Related Specs**: PWAR_CALCULATION_SPEC.md (reliever LI), KBL_XHD_TRACKER_MASTER_SPEC_v3.md §6

---

## Table of Contents

1. [Overview](#1-overview)
2. [What is Leverage Index?](#2-what-is-leverage-index)
3. [Game State Tracking](#3-game-state-tracking)
4. [LI Calculation](#4-li-calculation)
5. [Base-Out LI Tables](#5-base-out-li-tables)
6. [Full LI Lookup Tables](#6-full-li-lookup-tables)
7. [Clutch/Choke Integration](#7-clutchchoke-integration)
8. [Net Clutch Rating Formula](#8-net-clutch-rating-formula)
9. [Implementation Examples](#9-implementation-examples)
10. [SMB4 Adaptations](#10-smb4-adaptations)
11. [Tracking Requirements](#11-tracking-requirements)
12. [Reference Tables](#12-reference-tables)

---

## 1. Overview

### The Problem with Binary Clutch

The current system uses a simple "close game" check:

```javascript
// Old approach
function isCloseGame(scoreDifferential) {
  return Math.abs(scoreDifferential) <= 2;
}
```

This misses important nuance:
- Tie game in 9th with bases loaded ≠ Tie game in 1st with no runners
- 1-run lead in 9th, 2 outs, bases loaded ≠ 1-run lead in 5th, 0 outs, empty

### The Solution: Leverage Index

**Leverage Index (LI)** quantifies exactly how critical any moment is based on:
- Inning (late innings = higher leverage)
- Score differential (close games = higher leverage)
- Outs (2 outs often higher than 0 outs)
- Base state (runners in scoring position = higher leverage)

### Benefits for KBL Tracker

1. **Automated clutch detection** - No manual "clutch situation" badges needed
2. **Proportional rewards** - Walk-off grand slam in 9th worth more than go-ahead single in 5th
3. **Fair choke penalties** - K with bases loaded in 9th penalized more than in 3rd
4. **Net Clutch Rating** - Single number summarizing clutch performance
5. **Reliever pWAR** - Accurate leverage multiplier for pitching WAR

---

## 2. What is Leverage Index?

### Definition

Leverage Index measures the **potential swing in win probability** at any game state, normalized so that the average situation = 1.0.

```
LI = (Potential WP Swing at Current State) / (Average WP Swing Across All States)
```

### LI Scale

| LI Value | Category | Description | Frequency |
|----------|----------|-------------|-----------|
| 0.0-0.85 | Low | Blowout, early innings | ~60% of PAs |
| 0.85-2.0 | Medium | Competitive game | ~30% of PAs |
| 2.0-5.0 | High | Critical moment | ~9% of PAs |
| 5.0+ | Extreme | Game on the line | ~1% of PAs |

### Extreme Examples

| Situation | Approx LI |
|-----------|-----------|
| 1st inning, 0-0, no runners, 0 out | 0.9 |
| 5th inning, down 5, bases empty | 0.2 |
| 9th inning, tie game, bases loaded, 2 out | 10.0+ |
| 9th inning, up 1, bases loaded, 2 out (closer) | 8.0+ |
| 7th inning, down 1, RISP, 2 out | 3.5 |

---

## 3. Game State Tracking

### Required State Variables

To calculate LI, we need to track these at every plate appearance:

```typescript
interface GameState {
  // Inning state
  inning: number;           // 1-9+ (extras)
  halfInning: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2;

  // Base state (8 possible states)
  runners: {
    first: boolean;
    second: boolean;
    third: boolean;
  };

  // Score state
  homeScore: number;
  awayScore: number;

  // Derived
  scoreDifferential: number;  // From batting team's perspective
  isHomeTeamBatting: boolean;
}
```

### Base State Encoding

For compact lookup tables, encode base state as 0-7:

```javascript
const BASE_STATE = {
  EMPTY: 0,           // ___
  FIRST: 1,           // 1__
  SECOND: 2,          // _2_
  FIRST_SECOND: 3,    // 12_
  THIRD: 4,           // __3
  FIRST_THIRD: 5,     // 1_3
  SECOND_THIRD: 6,    // _23
  LOADED: 7           // 123
};

function encodeBaseState(runners) {
  let state = 0;
  if (runners.first) state += 1;
  if (runners.second) state += 2;
  if (runners.third) state += 4;
  return state;
}
```

---

## 4. LI Calculation

### Conceptual Formula

```
LI = Σ(P(outcome) × |WP_after - WP_before|) / Average_WP_Swing
```

Where:
- P(outcome) = probability of each possible outcome (K, walk, single, HR, etc.)
- WP_after = win probability after that outcome
- WP_before = win probability before the PA
- Average_WP_Swing ≈ 0.0346 (league average)

### Practical Approach: Lookup Tables

Rather than calculate LI from scratch, we use pre-computed tables based on historical data.

```javascript
function getLeverageIndex(gameState) {
  const { inning, halfInning, outs, runners, scoreDifferential } = gameState;

  const baseState = encodeBaseState(runners);
  const clampedDiff = Math.max(-8, Math.min(8, scoreDifferential));

  // Look up from pre-computed table
  return LI_TABLE[inning][halfInning][outs][baseState][clampedDiff + 8];
}
```

---

## 5. Base-Out LI Tables

### Base-Out Leverage Index (boLI)

This is the simpler version—just base state + outs, ignoring inning and score.

| Base State | 0 Outs | 1 Out | 2 Outs |
|------------|--------|-------|--------|
| Empty (___) | 0.86 | 0.90 | 0.93 |
| 1st only (1__) | 1.07 | 1.10 | 1.24 |
| 2nd only (_2_) | 1.15 | 1.40 | 1.56 |
| 1st & 2nd (12_) | 1.35 | 1.55 | 1.93 |
| 3rd only (__3) | 1.08 | 1.65 | 1.88 |
| 1st & 3rd (1_3) | 1.32 | 1.85 | 2.25 |
| 2nd & 3rd (_23) | 1.45 | 2.10 | 2.50 |
| Loaded (123) | 1.60 | 2.25 | **2.67** |

**Note**: These are baseline multipliers. Full LI applies inning and score context on top.

### JavaScript Implementation

```javascript
const BASE_OUT_LI = [
  // 0 outs, 1 out, 2 outs
  [0.86, 0.90, 0.93],  // Empty
  [1.07, 1.10, 1.24],  // 1st
  [1.15, 1.40, 1.56],  // 2nd
  [1.35, 1.55, 1.93],  // 1st+2nd
  [1.08, 1.65, 1.88],  // 3rd
  [1.32, 1.85, 2.25],  // 1st+3rd
  [1.45, 2.10, 2.50],  // 2nd+3rd
  [1.60, 2.25, 2.67]   // Loaded
];

function getBaseOutLI(baseState, outs) {
  return BASE_OUT_LI[baseState][outs];
}
```

---

## 6. Full LI Lookup Tables

### Table Structure

Full LI accounts for inning, half, outs, base state, and score differential.

```javascript
// LI_TABLE[inning][halfInning][outs][baseState][scoreDiff+8]
// Dimensions: 12 innings × 2 halves × 3 outs × 8 base states × 17 score diffs (-8 to +8)
// Total: 12 × 2 × 3 × 8 × 17 = 9,792 values
```

### Simplified LI Approximation

For SMB4, we can use a simplified formula that captures the key dynamics:

```javascript
function approximateLI(gameState) {
  const { inning, outs, runners, scoreDifferential, halfInning } = gameState;

  // 1. Base-out component
  const baseState = encodeBaseState(runners);
  const boLI = BASE_OUT_LI[baseState][outs];

  // 2. Inning multiplier (late innings matter more)
  const inningMultiplier = getInningMultiplier(inning, halfInning);

  // 3. Score differential dampener (blowouts reduce leverage)
  const scoreDampener = getScoreDampener(scoreDifferential, inning);

  // 4. Combine
  const rawLI = boLI * inningMultiplier * scoreDampener;

  // 5. Clamp to reasonable range
  return Math.max(0.1, Math.min(10.0, rawLI));
}

function getInningMultiplier(inning, halfInning) {
  // Late innings = higher leverage
  const inningMult = {
    1: 0.7, 2: 0.75, 3: 0.8, 4: 0.85, 5: 0.9,
    6: 1.0, 7: 1.2, 8: 1.5, 9: 2.0
  };

  let mult = inningMult[Math.min(inning, 9)] || 2.0;

  // Bottom of 9th (or later) with home team batting = walk-off potential
  if (inning >= 9 && halfInning === 'BOTTOM') {
    mult *= 1.3;
  }

  return mult;
}

function getScoreDampener(scoreDiff, inning) {
  const absDiff = Math.abs(scoreDiff);

  // Blowouts reduce leverage significantly
  if (absDiff >= 7) return 0.1;
  if (absDiff >= 5) return 0.25;
  if (absDiff >= 4) return 0.4;

  // Close games: full leverage
  // But early-inning deficits are less severe
  if (absDiff === 0) return 1.0;  // Tie game
  if (absDiff === 1) return 0.95;
  if (absDiff === 2) return 0.85;
  if (absDiff === 3) return 0.65 + (0.15 * Math.min(inning, 9) / 9);

  return 0.5;
}
```

### Example LI Values (Approximated)

| Situation | boLI | Inn Mult | Score Damp | **Final LI** |
|-----------|------|----------|------------|--------------|
| 1st inn, 0-0, empty, 0 out | 0.86 | 0.70 | 1.00 | **0.60** |
| 5th inn, down 5, empty, 1 out | 0.90 | 0.90 | 0.25 | **0.20** |
| 7th inn, tie, RISP, 2 out | 1.56 | 1.20 | 1.00 | **1.87** |
| 9th inn, up 1, bases loaded, 2 out | 2.67 | 2.00 | 0.95 | **5.07** |
| 9th inn (B), tie, bases loaded, 2 out | 2.67 | 2.60 | 1.00 | **6.94** |
| 9th inn (B), down 3, loaded, 2 out | 2.67 | 2.60 | 0.72 | **5.00** |

---

## 7. Clutch/Choke Integration

### From Binary to Continuous

**Old system**: Clutch value was fixed (+1, +2, etc.) if "close game" = true

**New system**: Clutch value = Base Value × LI Factor

```javascript
function calculateClutchValue(baseClutchValue, leverageIndex) {
  // LI Factor: 1.0 at average (LI=1), scales proportionally
  const liFactor = Math.sqrt(leverageIndex);  // Dampened scaling

  return baseClutchValue * liFactor;
}
```

### Updated Clutch Triggers

| Trigger | Base Value | At LI=1.0 | At LI=3.0 | At LI=6.0 |
|---------|------------|-----------|-----------|-----------|
| Go-ahead RBI | +1.0 | +1.0 | +1.73 | +2.45 |
| 2-out RBI | +1.0 | +1.0 | +1.73 | +2.45 |
| Walk-off HR | +3.0 | +3.0 | +5.20 | +7.35 |
| GIDP with RISP | -1.0 | -1.0 | -1.73 | -2.45 |
| K with bases loaded | -2.0 | -2.0 | -3.46 | -4.90 |
| Blown save | -2.0 | -2.0 | -3.46 | -4.90 |

### Automatic Clutch Detection

Instead of manually checking triggers, we can auto-detect clutch situations:

```javascript
function isClutchSituation(leverageIndex) {
  return leverageIndex >= 1.5;  // Above average = clutch
}

function isHighLeverageSituation(leverageIndex) {
  return leverageIndex >= 2.5;  // High stakes
}

function isExtremeLeverageSituation(leverageIndex) {
  return leverageIndex >= 5.0;  // Game on the line
}
```

### Removing "Close Game" Checks

The old master spec has many triggers that say "Close Game Required: Yes". With LI, these become automatic:

```javascript
// OLD
if (isGoAheadRBI && inning >= 7 && isCloseGame(scoreDiff)) {
  clutchValue += 1;
}

// NEW
if (isGoAheadRBI && inning >= 7) {
  clutchValue += 1.0 * Math.sqrt(getLeverageIndex(gameState));
}
```

Low-leverage situations (blowouts) will naturally produce minimal clutch/choke values.

---

## 8. Net Clutch Rating Formula

### The Core Metric

**Net Clutch Rating (NCR)** = Total Clutch Points - Total Choke Points

This is the number used for All-Star voting and awards.

### Per-Event Accumulation

```javascript
function accumulateClutchEvent(playerStats, eventType, baseValue, gameState) {
  const li = getLeverageIndex(gameState);
  const weightedValue = baseValue * Math.sqrt(li);

  if (baseValue > 0) {
    playerStats.clutchPoints += weightedValue;
    playerStats.clutchMoments += 1;
  } else {
    playerStats.chokePoints += Math.abs(weightedValue);
    playerStats.chokeMoments += 1;
  }

  playerStats.netClutch = playerStats.clutchPoints - playerStats.chokePoints;

  // Track LI for reliever pWAR
  playerStats.totalLI += li;
  playerStats.plateAppearancesWithLI += 1;
}
```

### Season Net Clutch Example

| Player | Clutch Moments | Clutch Pts | Choke Moments | Choke Pts | **Net Clutch** |
|--------|----------------|------------|---------------|-----------|----------------|
| Mays | 8 | +12.5 | 2 | -3.2 | **+9.3** |
| Crawford | 5 | +7.8 | 1 | -1.5 | **+6.3** |
| Simmons | 4 | +5.5 | 3 | -4.2 | **+1.3** |
| Torres | 2 | +2.1 | 5 | -6.8 | **-4.7** |

### Integration with All-Star Voting

From master spec, the voting formula is:
```
votes = (warScaled * 0.50) + (clutchScaled * 0.30) + (narrativeScaled * 0.20)
```

Net Clutch Rating directly feeds into `clutchScaled`.

---

## 9. Implementation Examples

### Example 1: Go-Ahead HR in 7th

```javascript
const gameState = {
  inning: 7,
  halfInning: 'TOP',
  outs: 1,
  runners: { first: true, second: false, third: false },
  scoreDifferential: -1,  // Down 1
  homeScore: 3,
  awayScore: 4
};

// Calculate LI
const li = approximateLI(gameState);
// boLI(1st, 1 out) = 1.10
// inningMult(7th) = 1.20
// scoreDamp(down 1) = 0.95
// LI = 1.10 × 1.20 × 0.95 = 1.25

// 2-run HR makes it 5-4 (go-ahead)
const baseClutch = 1.0;  // Go-ahead RBI in 7th+
const clutchValue = baseClutch * Math.sqrt(1.25);  // = 1.12

console.log(`Go-ahead HR: +${clutchValue.toFixed(2)} clutch`);
// Output: "Go-ahead HR: +1.12 clutch"
```

### Example 2: Bases Loaded K in 9th

```javascript
const gameState = {
  inning: 9,
  halfInning: 'BOTTOM',
  outs: 2,
  runners: { first: true, second: true, third: true },
  scoreDifferential: -2,  // Down 2 (could tie with grand slam)
  homeScore: 5,
  awayScore: 7
};

// Calculate LI
const li = approximateLI(gameState);
// boLI(loaded, 2 out) = 2.67
// inningMult(9th bottom) = 2.60
// scoreDamp(down 2) = 0.85
// LI = 2.67 × 2.60 × 0.85 = 5.90

// Batter strikes out (game over)
const baseChoke = -2.0;  // K with bases loaded
const chokeValue = baseChoke * Math.sqrt(5.90);  // = -4.86

console.log(`Bases loaded K: ${chokeValue.toFixed(2)} choke`);
// Output: "Bases loaded K: -4.86 choke"
```

### Example 3: Reliever Average LI for pWAR

```javascript
const closerSeasonStats = {
  appearances: 25,
  liPerAppearance: [2.1, 1.8, 2.5, 1.9, 2.3, /* ... */],  // Tracked per outing
};

// Calculate season gmLI (average leverage)
const totalLI = closerSeasonStats.liPerAppearance.reduce((a, b) => a + b, 0);
const avgLI = totalLI / closerSeasonStats.appearances;
// avgLI ≈ 1.85

// For pWAR leverage multiplier (per PWAR_CALCULATION_SPEC.md §7)
const liMultiplier = (avgLI + 1) / 2;  // = 1.425

console.log(`Closer gmLI: ${avgLI.toFixed(2)}, pWAR multiplier: ${liMultiplier.toFixed(2)}`);
// Output: "Closer gmLI: 1.85, pWAR multiplier: 1.43"
```

---

## 10. SMB4 Adaptations

### Shorter Games

SMB4 games are typically 5-7 innings. Adjust inning multipliers:

```javascript
function getInningMultiplierSMB4(inning, totalInnings, halfInning) {
  // Scale based on game progress
  const gameProgress = inning / totalInnings;

  if (gameProgress < 0.33) return 0.75;       // Early game
  if (gameProgress < 0.66) return 1.0;        // Mid game
  if (gameProgress < 0.85) return 1.3;        // Late game

  // Final inning
  let mult = 1.8;
  if (halfInning === 'BOTTOM') mult *= 1.3;  // Walk-off potential

  return mult;
}
```

### What We Can Track Now

| Component | Status | Notes |
|-----------|--------|-------|
| Inning | ✅ Tracked | Current implementation |
| Half inning | ✅ Tracked | TOP/BOTTOM |
| Outs | ✅ Tracked | 0-2 |
| Runners | ✅ Tracked | Base state |
| Score | ✅ Tracked | Home/Away |
| **LI calculation** | ✅ Ready | Can implement now |

### What This Enables

1. **Automatic clutch/choke tagging** - No manual "clutch situation" badge
2. **Proportional clutch values** - More important moments = bigger rewards/penalties
3. **Accurate reliever pWAR** - Real gmLI instead of save-based estimation
4. **Net Clutch Rating** - Feeds directly into All-Star/Award voting

---

## 11. Tracking Requirements

### Per-Plate Appearance Data

```typescript
interface PlateAppearanceContext {
  // Standard tracking (already implemented)
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  runners: { first: boolean; second: boolean; third: boolean };
  homeScore: number;
  awayScore: number;

  // NEW: LI tracking
  leverageIndex: number;  // Calculated at PA start

  // Result and clutch impact
  result: AtBatResult;
  clutchValue: number;    // Calculated after result
  chokeValue: number;
}
```

### Player Season Aggregates

```typescript
interface PlayerClutchStats {
  // Accumulated values
  clutchPoints: number;      // Sum of positive clutch values
  chokePoints: number;       // Sum of negative choke values (as positive)
  netClutch: number;         // clutchPoints - chokePoints

  // Counts
  clutchMoments: number;     // Number of clutch events
  chokeMoments: number;      // Number of choke events

  // For reliever pWAR
  totalLI: number;           // Sum of LI across all appearances
  plateAppearances: number;  // For calculating gmLI
  gmLI: number;              // totalLI / plateAppearances
}
```

### Game State Snapshot

```javascript
function captureGameState() {
  return {
    inning: gameState.inning,
    halfInning: gameState.halfInning,
    outs: gameState.outs,
    runners: { ...gameState.runners },
    homeScore: gameState.homeScore,
    awayScore: gameState.awayScore,
    battingTeam: gameState.halfInning === 'TOP' ? 'away' : 'home',
    scoreDifferential: calculateScoreDiff(gameState),
    leverageIndex: approximateLI(gameState)
  };
}
```

---

## 12. Reference Tables

### Quick LI Reference by Situation Type

| Situation | Typical LI Range |
|-----------|------------------|
| 1st inning, standard | 0.5 - 0.9 |
| Mid-game, close | 1.0 - 1.5 |
| 7th+ inning, close, RISP | 2.0 - 3.5 |
| 9th inning, 1-run game | 3.0 - 6.0 |
| Walk-off situation | 4.0 - 8.0 |
| Bases loaded, 2 out, tie, 9th | 7.0 - 10.0+ |
| Blowout (5+ run diff) | 0.1 - 0.3 |

### Clutch Value Multipliers

| LI Range | sqrt(LI) Multiplier | Clutch Impact |
|----------|---------------------|---------------|
| 0.0 - 0.5 | 0.0 - 0.71 | Minimal |
| 0.5 - 1.0 | 0.71 - 1.00 | Below average |
| 1.0 - 2.0 | 1.00 - 1.41 | Average to above |
| 2.0 - 4.0 | 1.41 - 2.00 | High leverage |
| 4.0 - 8.0 | 2.00 - 2.83 | Very high |
| 8.0+ | 2.83+ | Extreme |

### Base Choke/Clutch Values (for LI multiplication)

| Event | Base Value |
|-------|------------|
| Walk-off HR | +3.0 |
| Walk-off hit | +2.0 |
| Grand slam | +2.0 |
| Go-ahead RBI (7th+) | +1.0 |
| 2-out RBI | +1.0 |
| K with bases loaded | -2.0 |
| Blown save | -2.0 |
| GIDP with RISP | -1.0 |
| K with RISP | -1.0 |
| Error allowing run | -1.0 |

---

## Appendix: Complete LI Calculator

```javascript
// Complete implementation for copy/paste

const BASE_OUT_LI = [
  [0.86, 0.90, 0.93],  // Empty
  [1.07, 1.10, 1.24],  // 1st
  [1.15, 1.40, 1.56],  // 2nd
  [1.35, 1.55, 1.93],  // 1st+2nd
  [1.08, 1.65, 1.88],  // 3rd
  [1.32, 1.85, 2.25],  // 1st+3rd
  [1.45, 2.10, 2.50],  // 2nd+3rd
  [1.60, 2.25, 2.67]   // Loaded
];

function encodeBaseState(runners) {
  let state = 0;
  if (runners.first) state += 1;
  if (runners.second) state += 2;
  if (runners.third) state += 4;
  return state;
}

function getLeverageIndex(gameState, config = { totalInnings: 9 }) {
  const { inning, halfInning, outs, runners, homeScore, awayScore } = gameState;
  const { totalInnings } = config;

  const battingTeam = halfInning === 'TOP' ? 'away' : 'home';
  const scoreDiff = battingTeam === 'home'
    ? homeScore - awayScore
    : awayScore - homeScore;

  // 1. Base-out leverage
  const baseState = encodeBaseState(runners);
  const boLI = BASE_OUT_LI[baseState][outs];

  // 2. Inning multiplier
  const gameProgress = inning / totalInnings;
  let inningMult;
  if (gameProgress < 0.33) inningMult = 0.75;
  else if (gameProgress < 0.66) inningMult = 1.0;
  else if (gameProgress < 0.85) inningMult = 1.3;
  else inningMult = 1.8;

  // Walk-off potential boost
  if (inning >= totalInnings && halfInning === 'BOTTOM' && scoreDiff <= 0) {
    inningMult *= 1.4;
  }

  // 3. Score dampener
  const absDiff = Math.abs(scoreDiff);
  let scoreDamp;
  if (absDiff >= 7) scoreDamp = 0.1;
  else if (absDiff >= 5) scoreDamp = 0.25;
  else if (absDiff >= 4) scoreDamp = 0.4;
  else if (absDiff === 3) scoreDamp = 0.6;
  else if (absDiff === 2) scoreDamp = 0.85;
  else if (absDiff === 1) scoreDamp = 0.95;
  else scoreDamp = 1.0;

  // 4. Combine and clamp
  const li = boLI * inningMult * scoreDamp;
  return Math.max(0.1, Math.min(10.0, li));
}

function calculateClutchValue(baseValue, leverageIndex) {
  return baseValue * Math.sqrt(leverageIndex);
}

// Export for use
module.exports = { getLeverageIndex, calculateClutchValue, encodeBaseState };
```

---

*Last Updated: January 2026*
*Version: 1.0*
