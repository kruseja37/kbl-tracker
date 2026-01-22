# fWAR Calculation Specification

> **Purpose**: Complete specification for calculating fielding Wins Above Replacement (fWAR)
> **Created**: January 21, 2026
> **Based On**: MLB methodologies (OAA, DRS, UZR) adapted for SMB4 play-by-play tracking
> **Integration**: Works with EOS Salary Percentile system (Master Spec Section 10)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Season Length Scaling](#2-season-length-scaling) ⭐ **NEW**
3. [Core Concept: Play Value](#3-core-concept-play-value)
4. [Run Value Constants](#4-run-value-constants)
5. [Per-Play fWAR Calculations](#5-per-play-fwar-calculations)
6. [Positional Adjustments](#6-positional-adjustments)
7. [Star Play Bonuses](#7-star-play-bonuses)
8. [Error Penalties](#8-error-penalties)
9. [Complete fWAR Formula](#9-complete-fwar-formula)
10. [Season Totals & WAR Conversion](#10-season-totals--war-conversion)
11. [Integration with EOS System](#11-integration-with-eos-system)
12. [Implementation Examples](#12-implementation-examples)
13. [Quick Reference Tables](#13-quick-reference-tables)

---

## 1. Overview

### What fWAR Measures

fWAR (fielding Wins Above Replacement) measures how many wins a player's defense adds to or subtracts from their team compared to a replacement-level player at their position.

### MLB Methodology Adaptation

We adapt three MLB systems for SMB4:

| System | Source | What We Use |
|--------|--------|-------------|
| **OAA** (Outs Above Average) | MLB Statcast | Per-play probability concept |
| **DRS** (Defensive Runs Saved) | Baseball Info Solutions | Run value assignments |
| **UZR** (Ultimate Zone Rating) | FanGraphs | Component breakdown (Range, Arm, DP, Errors) |

### Why Our System Is Better Than Jester's

Jester's Reference uses position-based DRS columns but relies on post-hoc entry. Our system:
- **Tracks every play in real-time** with contextual data
- **Captures play difficulty** (routine vs diving vs wall catch)
- **Records exact fielder** (not just assumed from position)
- **Tracks assists and relay throws** for outfield arm evaluation
- **Calculates instantly** rather than requiring manual entry

---

## 2. Season Length Scaling

### The Core Problem

In MLB's 162-game season, **10 runs = 1 WAR**. But SMB4 seasons can be as short as 16 games or as long as 48+ games. A saved run in a 20-game season has **far more impact** on winning percentage than in a 162-game season.

### The Math

**MLB Standard**: ~10 runs per win across 162 games

**Scaling Principle**: The runs-per-win conversion should scale proportionally with season length because:
- Fewer games = fewer total runs scored league-wide
- Fewer games = fewer total wins available
- Each run represents a larger percentage of season outcomes

**Season Impact Multiplier Formula**:

```javascript
const MLB_GAMES = 162;
const MLB_RUNS_PER_WIN = 10;

function getSeasonImpactMultiplier(seasonGames) {
  // Runs per win scales down proportionally with season length
  // Shorter season = fewer runs needed per win = each run worth more WAR
  const runsPerWin = MLB_RUNS_PER_WIN * (seasonGames / MLB_GAMES);

  // Impact multiplier is inverse: shorter seasons have higher multipliers
  const impactMultiplier = MLB_GAMES / seasonGames;

  return {
    runsPerWin,        // How many runs = 1 WAR in this season
    impactMultiplier,  // Multiply raw fWAR by this for season-adjusted fWAR
    seasonGames
  };
}
```

### Season Length Impact Table

| Season Length | Games | Runs Per Win | Impact Multiplier | Elite Fielder fWAR |
|---------------|-------|--------------|-------------------|-------------------|
| Full MLB | 162 | 10.0 | 1.00x | +2.0 to +3.0 |
| Long SMB4 | 48 | 2.96 | 3.38x | +0.6 to +0.9 |
| Standard SMB4 | 32 | 1.98 | 5.06x | +0.4 to +0.6 |
| Short SMB4 | 20 | 1.23 | 8.10x | +0.25 to +0.4 |
| Mini SMB4 | 16 | 0.99 | 10.13x | +0.2 to +0.3 |

### How This Changes Per-Play Values

**Without scaling** (wrong approach):
- Diving catch = +0.075 runs saved
- In 48-game season: +0.075 / 10 = **+0.0075 fWAR** ❌

**With scaling** (correct approach):
- Diving catch = +0.075 runs saved
- In 48-game season: +0.075 / 2.96 = **+0.025 fWAR** ✓
- In 20-game season: +0.075 / 1.23 = **+0.061 fWAR** ✓

### Implementation

```javascript
const SEASON_CONFIG = {
  games: 48,  // Set per-season, user configurable
};

function calculateAdjustedFWAR(rawRunValue) {
  const { runsPerWin } = getSeasonImpactMultiplier(SEASON_CONFIG.games);
  return rawRunValue / runsPerWin;
}

// Example: Diving catch saves a run
const divingCatchRuns = 0.03 * 2.5;  // 0.075 runs (base × difficulty)
const fWAR_48games = calculateAdjustedFWAR(divingCatchRuns);  // 0.025 fWAR
const fWAR_20games = 0.075 / 1.23;  // 0.061 fWAR (same play, shorter season)
```

### Quick Reference: Per-Play fWAR by Season Length

| Play | Runs Saved | 48-game fWAR | 32-game fWAR | 20-game fWAR |
|------|------------|--------------|--------------|--------------|
| Routine putout (IF) | +0.03 | +0.010 | +0.015 | +0.024 |
| Routine putout (OF) | +0.04 | +0.014 | +0.020 | +0.033 |
| Diving catch | +0.075 | +0.025 | +0.038 | +0.061 |
| Robbed HR | +0.15 | +0.051 | +0.076 | +0.122 |
| Outfield assist (home) | +0.12 | +0.041 | +0.061 | +0.098 |
| Double play turned | +0.12 | +0.041 | +0.061 | +0.098 |
| Fielding error | -0.15 | -0.051 | -0.076 | -0.122 |

> **Note**: All per-play fWAR values in subsequent sections use the **runs saved** values.
> Apply the season-appropriate runs-per-win divisor to get final fWAR.

---

## 3. Core Concept: Play Value

### The Fundamental Equation

Every fielding play has a **run value** based on:
1. **What happened** (out made, hit allowed, error)
2. **Difficulty of the play** (routine, diving, wall catch, etc.)
3. **Position played** (SS plays valued differently than 1B)
4. **Game context** (runners on, outs, inning - for Clutch, not fWAR)

```
Play Value = Base Run Value × Difficulty Modifier × Position Weight
```

### MLB Linear Weights Context

From MLB research, the average run values of events are:

| Event | Run Value | Notes |
|-------|-----------|-------|
| Out made | -0.26 to -0.30 | Prevents runs |
| Single allowed | +0.47 | Allows baserunner |
| Double allowed | +0.78 | Runner in scoring position |
| Triple allowed | +1.08 | Runner on 3rd |
| Error (avg) | +0.50 to +0.80 | Similar to hit + advancement |

**Key insight**: Making an out is worth ~0.26-0.30 runs saved. This is the foundation.

---

## 4. Run Value Constants

### Base Run Values (Per Play)

These are the run values we assign to each fielding outcome, calibrated for a 48-game SMB4 season:

```javascript
const FIELDING_RUN_VALUES = {
  // Successful plays (runs saved)
  putout: {
    infield: 0.03,      // Routine infield out
    outfield: 0.04,     // Routine fly out
    lineout: 0.05,      // Line drive catch (harder)
    foulout: 0.02       // Foul territory catch
  },

  assist: {
    infield: 0.04,      // Routine throw for out
    outfield: 0.08,     // Outfield throw for out (runner advancement prevented)
    relay: 0.03,        // Relay throw contribution
    cutoff: 0.02        // Cutoff throw (not final out)
  },

  doublePlay: {
    turned: 0.12,       // Pivot man on DP
    started: 0.08,      // Started the DP
    completed: 0.06     // First baseman completing DP
  },

  // Failed plays (runs cost)
  error: {
    fielding: -0.15,    // Bobble, drop, mishandle
    throwing: -0.20,    // Wild throw
    mental: -0.25       // Wrong base, missed cutoff
  },

  // Neutral (tracked but no fWAR impact)
  hitAllowed: 0.00      // Not fielder's fault (clean hit)
};
```

### Why These Values?

**MLB OAA Conversion**:
- Outfielders: 1 OAA = 0.9 runs
- Infielders: 1 OAA = 0.75 runs

**Scaling for 48-game season**:
- MLB plays ~162 games, we play 48 (29.6% of MLB)
- A Gold Glove SS might have +15 DRS in MLB
- For SMB4: +15 × 0.296 ≈ +4.4 fielding runs per season
- This means ~0.03-0.05 runs per successful play is appropriate

---

## 5. Per-Play fWAR Calculations

### 4.1 Putouts

#### Infield Putouts

| Play Type | Base Value | Position Modifier | Final Value |
|-----------|------------|-------------------|-------------|
| Routine groundout to 1B | +0.03 | 1B: 0.7 | +0.021 |
| Routine groundout (assist to 1B) | +0.03 | varies | varies |
| Popup catch | +0.03 | 1.0 | +0.03 |
| Line drive catch | +0.05 | 1.0 | +0.05 |
| Foul ball catch | +0.02 | 1.0 | +0.02 |

```javascript
function calculateInfieldPutout(playType, position) {
  const baseValue = FIELDING_RUN_VALUES.putout[playType] || 0.03;
  const positionMod = POSITION_MODIFIERS.putout[position] || 1.0;
  return baseValue * positionMod;
}
```

#### Outfield Putouts

| Play Type | Base Value | Notes |
|-----------|------------|-------|
| Routine fly ball | +0.04 | Standard catch |
| Running catch | +0.06 | Had to cover ground |
| Shallow catch (coming in) | +0.05 | Tougher than going back |
| Deep catch (going back) | +0.07 | Hardest direction |

### 4.2 Assists

#### Infield Assists

| Play Type | Base Value | Notes |
|-----------|------------|-------|
| Routine groundout throw | +0.04 | Standard assist |
| Backhand play throw | +0.06 | More difficult |
| Charging play throw | +0.05 | Quick release on slow roller |
| Relay throw | +0.03 | Part of longer play |

#### Outfield Assists

| Play Type | Base Value | Notes |
|-----------|------------|-------|
| Throw to get runner at 2B | +0.08 | Prevents extra base |
| Throw to get runner at 3B | +0.10 | Key run prevention |
| Throw to get runner at home | +0.12 | Run saved |
| Perfect relay throw | +0.03 | Contribution to out |

```javascript
function calculateOutfieldAssist(targetBase) {
  const values = { second: 0.08, third: 0.10, home: 0.12 };
  return values[targetBase] || 0.08;
}
```

### 4.3 Double Plays

| Role | Base Value | Notes |
|------|------------|-------|
| Started DP (fielded + threw) | +0.08 | SS/3B starting 6-4-3, 5-4-3 |
| Turned DP (pivot) | +0.12 | 2B/SS taking throw, completing |
| Completed DP (1B) | +0.06 | Catching throw for final out |
| Started + Turned (unassisted) | +0.25 | Very rare, very valuable |

```javascript
function calculateDoublePlayCredit(role, position) {
  const baseValues = {
    started: 0.08,
    turned: 0.12,
    completed: 0.06,
    unassisted: 0.25
  };
  return baseValues[role] || 0.08;
}
```

---

## 6. Positional Adjustments

### Position Difficulty Modifiers

Fielding at harder positions is worth more. Based on MLB positional adjustments:

| Position | Modifier | MLB Adjustment (per 162) | Rationale |
|----------|----------|--------------------------|-----------|
| **C** | 1.3 | +12.5 runs | Hardest position, every pitch |
| **SS** | 1.2 | +7.5 runs | Most demanding IF position |
| **CF** | 1.15 | +2.5 runs | Most ground to cover |
| **2B** | 1.1 | +2.5 runs | DP pivots, range required |
| **3B** | 1.1 | +2.5 runs | Line drives, long throws |
| **RF** | 1.0 | -7.5 runs | Baseline (strong arm needed) |
| **LF** | 0.9 | -7.5 runs | Easiest OF spot |
| **1B** | 0.7 | -12.5 runs | Easiest IF spot |
| **P** | 0.5 | N/A | Limited involvement |
| **DH** | 0.0 | -17.5 runs | No fielding |

```javascript
const POSITION_MODIFIERS = {
  putout: {
    C: 1.3, SS: 1.2, CF: 1.15, '2B': 1.1, '3B': 1.1,
    RF: 1.0, LF: 0.9, '1B': 0.7, P: 0.5, DH: 0.0
  },
  assist: {
    C: 1.4,   // Throwing out runners
    SS: 1.2, '3B': 1.15, CF: 1.2, RF: 1.1,
    '2B': 1.0, LF: 0.9, '1B': 0.7, P: 0.6
  },
  error: {
    C: 0.8,   // Errors less damaging (expected)
    SS: 1.0, '3B': 1.0, '2B': 1.0,
    CF: 1.1, RF: 1.1, LF: 1.1,  // OF errors more damaging
    '1B': 1.2, P: 1.3  // Most damaging (unexpected)
  }
};
```

### Position-Specific Fielding Runs (Per 48 Games)

Expected fWAR range by position for average starter:

| Position | Below Avg | Average | Above Avg | Elite |
|----------|-----------|---------|-----------|-------|
| C | -1.5 to -0.5 | -0.5 to +0.5 | +0.5 to +1.5 | +1.5+ |
| SS | -1.0 to -0.3 | -0.3 to +0.5 | +0.5 to +1.2 | +1.2+ |
| CF | -0.8 to -0.2 | -0.2 to +0.4 | +0.4 to +1.0 | +1.0+ |
| 2B/3B | -0.6 to -0.2 | -0.2 to +0.3 | +0.3 to +0.7 | +0.7+ |
| RF | -0.5 to -0.1 | -0.1 to +0.3 | +0.3 to +0.6 | +0.6+ |
| LF | -0.4 to -0.1 | -0.1 to +0.2 | +0.2 to +0.5 | +0.5+ |
| 1B | -0.3 to 0.0 | 0.0 to +0.2 | +0.2 to +0.4 | +0.4+ |

---

## 7. Star Play Bonuses

### Difficulty Multipliers

Star plays receive bonus credit beyond the base value:

| Play Type | Multiplier | Example fWAR |
|-----------|------------|--------------|
| **Routine** | 1.0x | +0.03 (base) |
| **Running catch** | 1.5x | +0.045 |
| **Diving catch** | 2.5x | +0.075 |
| **Leaping catch** | 2.0x | +0.060 |
| **Wall catch** | 2.5x | +0.075 |
| **Robbed HR** | 5.0x | +0.150 |
| **Over-the-shoulder** | 2.0x | +0.060 |
| **Sliding catch** | 2.5x | +0.075 |

> **SMB4 Note**: Barehanded plays are not possible in SMB4 and are excluded.

```javascript
// SMB4 Difficulty Multipliers (barehanded not possible in SMB4)
const DIFFICULTY_MULTIPLIERS = {
  routine: 1.0,
  running: 1.5,
  diving: 2.5,
  leaping: 2.0,
  wall: 2.5,
  robbedHR: 5.0,
  overShoulder: 2.0,
  sliding: 2.5
};

function calculateStarPlayBonus(baseValue, difficulty) {
  const multiplier = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
  return baseValue * multiplier;
}
```

### Star Play + Fame Integration

Star plays also trigger Fame bonuses (separate system):

| Play | fWAR Bonus | Fame Bonus | Notes |
|------|------------|------------|-------|
| Diving catch | +0.075 | +1 | Highlight reel |
| Robbed HR | +0.150 | +2 | Web gem |
| Wall catch | +0.075 | +1 | Dramatic |
| OF assist at home | +0.12 | +1 | Run saved |
| Unassisted TP | +0.25 | +2 | Extremely rare |

---

## 8. Error Penalties

### Error Type Penalties

| Error Type | Base Penalty | Notes |
|------------|--------------|-------|
| **Fielding error** | -0.15 | Bobble, drop, mishandle |
| **Throwing error** | -0.20 | Wild throw |
| **Mental error** | -0.25 | Wrong base, missed cutoff |
| **Collision error** | -0.10 | Bad luck, split blame |
| **Passed ball** (C) | -0.10 | Catcher-specific |

### Context Modifiers for Errors

| Context | Modifier | Result |
|---------|----------|--------|
| Error allows run | 1.5x | -0.225 to -0.375 |
| Error in clutch | 1.3x | Higher penalty |
| Error on routine play | 1.2x | Expected to make |
| Error on difficult play | 0.7x | Less blame |
| Missed dive (good effort) | 0.0x | No penalty |

```javascript
function calculateErrorPenalty(errorType, context) {
  const basePenalty = FIELDING_RUN_VALUES.error[errorType];
  const positionMod = POSITION_MODIFIERS.error[context.position];

  let contextMod = 1.0;
  if (context.allowedRun) contextMod *= 1.5;
  if (context.isClutch) contextMod *= 1.3;
  if (context.wasRoutine) contextMod *= 1.2;
  if (context.wasDifficult) contextMod *= 0.7;

  return basePenalty * positionMod * contextMod;
}
```

### Special Case: Missed Dive

**Important**: A diving attempt that fails to make the catch is NOT an error if:
- The play would not have been made by a routine effort
- The fielder got leather on the ball but couldn't hold it

This is tracked as "Diving - No penalty" with fWAR = 0.

---

## 9. Complete fWAR Formula

### Per-Game fWAR Calculation

```javascript
function calculateGameFWAR(player, gameFieldingEvents) {
  let fwar = 0;

  for (const event of gameFieldingEvents) {
    switch (event.type) {
      case 'putout':
        fwar += calculatePutout(event);
        break;
      case 'assist':
        fwar += calculateAssist(event);
        break;
      case 'doublePlay':
        fwar += calculateDoublePlay(event);
        break;
      case 'error':
        fwar += calculateError(event);  // Returns negative
        break;
      case 'starPlay':
        fwar += calculateStarPlay(event);
        break;
    }
  }

  return fwar;
}

function calculatePutout(event) {
  const base = FIELDING_RUN_VALUES.putout[event.playType] || 0.03;
  const posMod = POSITION_MODIFIERS.putout[event.position] || 1.0;
  const diffMod = DIFFICULTY_MULTIPLIERS[event.difficulty] || 1.0;

  return base * posMod * diffMod;
}

function calculateAssist(event) {
  let base;
  if (event.isOutfield) {
    base = event.targetBase === 'home' ? 0.12 :
           event.targetBase === 'third' ? 0.10 : 0.08;
  } else {
    base = FIELDING_RUN_VALUES.assist.infield;
  }

  const posMod = POSITION_MODIFIERS.assist[event.position] || 1.0;
  return base * posMod;
}

function calculateError(event) {
  const base = FIELDING_RUN_VALUES.error[event.errorType] || -0.15;
  const posMod = POSITION_MODIFIERS.error[event.position] || 1.0;

  let contextMod = 1.0;
  if (event.allowedRun) contextMod *= 1.5;
  if (event.wasRoutine) contextMod *= 1.2;

  return base * posMod * contextMod;  // Returns negative
}
```

### Season fWAR Aggregation

```javascript
function calculateSeasonFWAR(player, allGames) {
  let totalFWAR = 0;

  for (const game of allGames) {
    const gameEvents = game.fieldingEvents.filter(e => e.playerId === player.id);
    totalFWAR += calculateGameFWAR(player, gameEvents);
  }

  // Apply positional adjustment for partial seasons
  const gamesPlayed = allGames.filter(g => playerPlayedIn(g, player)).length;
  const seasonGames = 48;
  const playingTimeFactor = gamesPlayed / seasonGames;

  // Positional adjustment (per 48 games)
  const posAdj = POSITIONAL_ADJUSTMENTS[player.primaryPosition] * playingTimeFactor;

  return totalFWAR + posAdj;
}
```

---

## 10. Season Totals & WAR Conversion

### Converting Fielding Runs to WAR

**MLB Standard**: ~10 runs = 1 WAR

```javascript
const RUNS_PER_WAR = 10;

function fieldingRunsToWAR(fieldingRuns) {
  return fieldingRuns / RUNS_PER_WAR;
}
```

### Expected Season fWAR by Position

| Position | Poor (-2σ) | Below Avg | Average | Above Avg | Elite (+2σ) |
|----------|------------|-----------|---------|-----------|-------------|
| C | -0.4 | -0.2 | 0.0 | +0.2 | +0.4 |
| SS | -0.3 | -0.1 | +0.1 | +0.3 | +0.5 |
| CF | -0.25 | -0.1 | +0.05 | +0.25 | +0.4 |
| 2B | -0.2 | -0.1 | 0.0 | +0.15 | +0.3 |
| 3B | -0.2 | -0.1 | 0.0 | +0.15 | +0.3 |
| RF | -0.15 | -0.05 | 0.0 | +0.1 | +0.25 |
| LF | -0.1 | -0.05 | 0.0 | +0.1 | +0.2 |
| 1B | -0.1 | -0.05 | 0.0 | +0.05 | +0.15 |

### Positional Adjustment per 48 Games

Raw positional adjustment (already incorporated in position modifiers):

| Position | Adjustment (runs) | Adjustment (WAR) |
|----------|-------------------|------------------|
| C | +3.7 | +0.37 |
| SS | +2.2 | +0.22 |
| CF | +0.7 | +0.07 |
| 2B | +0.7 | +0.07 |
| 3B | +0.7 | +0.07 |
| RF | -2.2 | -0.22 |
| LF | -2.2 | -0.22 |
| 1B | -3.7 | -0.37 |
| DH | -5.2 | -0.52 |

---

## 11. Integration with EOS System

### How fWAR Feeds Into End-of-Season Adjustments

From Master Spec v3 Section 10:

```
1. Calculate player's salary percentile at their position
2. Calculate player's fWAR percentile at their position
3. Performance Delta = fWAR Percentile - Salary Percentile
4. Raw Adjustment = Performance Delta × Salary Factor
5. Final Adjustment = Round, cap at +/-10
6. Auto-distribute to Fielding and Arm ratings (halves)
```

### Example Calculation

```
Player: Willie Mays (CF)
Salary: $12M (75th percentile among CFs)
Season fWAR: +0.8 (90th percentile among CFs)

Performance Delta = 90% - 75% = +15%
Salary Tier: "high" (75-89%)
Salary Factor (positive): 2.0

Raw Adjustment = 0.15 × 100 × 2.0 / 10 = +3.0 points

Distribution:
- Fielding: +2 (half, rounded)
- Arm: +1 (half, remainder)
```

### Salary Factor Reference

| Salary Percentile | Positive Factor | Negative Factor |
|-------------------|-----------------|-----------------|
| 90-100% (Elite) | 1.0 | 10.0 |
| 75-89% (High) | 2.0 | 7.0 |
| 50-74% (Mid-High) | 4.0 | 5.0 |
| 25-49% (Mid-Low) | 6.0 | 3.0 |
| 10-24% (Low) | 8.0 | 1.5 |
| 0-9% (Minimum) | 10.0 | 1.0 |

---

## 12. Implementation Examples

### Example 1: Routine Ground Out

```
Play: Groundball to SS, throw to 1B
Fielder: Brandon Crawford (SS)
Position: SS
Difficulty: Routine

Crawford (assist):
- Base: 0.04 (infield assist)
- Position Mod: 1.2 (SS)
- Difficulty: 1.0 (routine)
- fWAR: 0.04 × 1.2 × 1.0 = +0.048

First Baseman (putout):
- Base: 0.03 (infield putout)
- Position Mod: 0.7 (1B)
- Difficulty: 1.0 (routine)
- fWAR: 0.03 × 0.7 × 1.0 = +0.021
```

### Example 2: Diving Catch in Outfield

```
Play: Line drive to RF gap, diving catch
Fielder: Mike Yastrzemski (RF)
Position: RF
Difficulty: Diving

Calculation:
- Base: 0.05 (line drive catch)
- Position Mod: 1.0 (RF)
- Difficulty: 2.5 (diving)
- fWAR: 0.05 × 1.0 × 2.5 = +0.125

Also triggers:
- Fame: +1 (diving catch)
```

### Example 3: Outfield Assist at Home

```
Play: Single to RF, runner tries to score from 2B, thrown out
Fielder: Yastrzemski (RF)
Relay: Crawford (SS)

Yastrzemski (assist):
- Base: 0.12 (throw to home)
- Position Mod: 1.1 (RF assist)
- fWAR: 0.12 × 1.1 = +0.132

Crawford (relay assist):
- Base: 0.03 (relay throw)
- Position Mod: 1.2 (SS)
- fWAR: 0.03 × 1.2 = +0.036

Total: +0.168 fWAR, +1 Fame (OF assist), +1 Clutch (if key moment)
```

### Example 4: Fielding Error

```
Play: Routine grounder to 3B, bobbled, runner safe
Fielder: JD Davis (3B)
Error Type: Fielding
Context: Runner later scored

Calculation:
- Base: -0.15 (fielding error)
- Position Mod: 1.0 (3B)
- Context Mod: 1.5 (allowed run)
- fWAR: -0.15 × 1.0 × 1.5 = -0.225

Also triggers:
- Fame: -1 (error allowing run)
```

### Example 5: Robbed Home Run

```
Play: Deep fly to CF, Willie Mays leaps at wall, catches HR
Fielder: Willie Mays (CF)
Difficulty: Robbed HR

Calculation:
- Base: 0.04 (fly ball catch)
- Position Mod: 1.15 (CF)
- Difficulty: 5.0 (robbed HR)
- fWAR: 0.04 × 1.15 × 5.0 = +0.230

Also triggers:
- Fame: +2 (robbed HR)
- Clutch: +1 (robbed HR)
```

---

## 13. Quick Reference Tables

> **Important**: Tables show **runs saved/cost** values. Divide by **Runs Per Win** for your season length to get fWAR.
> See Section 2 for season scaling formula.

### Runs Per Win by Season Length

| Season | Games | Runs Per Win | Example: 0.10 runs = ? fWAR |
|--------|-------|--------------|----------------------------|
| Full MLB | 162 | 10.00 | 0.010 fWAR |
| Long SMB4 | 48 | 2.96 | 0.034 fWAR |
| Standard SMB4 | 32 | 1.98 | 0.051 fWAR |
| Short SMB4 | 20 | 1.23 | 0.081 fWAR |
| Mini SMB4 | 16 | 0.99 | 0.101 fWAR |

### Putout Run Values (After Position Modifier)

| Position | Routine | Line Drive | Diving | Robbed HR |
|----------|---------|------------|--------|-----------|
| C | 0.039 | 0.065 | 0.098 | 0.195 |
| SS | 0.036 | 0.060 | 0.090 | 0.180 |
| CF | 0.046 | 0.058 | 0.115 | 0.230 |
| 2B | 0.033 | 0.055 | 0.083 | 0.165 |
| 3B | 0.033 | 0.055 | 0.083 | 0.165 |
| RF | 0.040 | 0.050 | 0.100 | 0.200 |
| LF | 0.036 | 0.045 | 0.090 | 0.180 |
| 1B | 0.021 | 0.035 | 0.053 | 0.105 |

**Example (48-game season)**: SS diving catch = 0.090 runs / 2.96 = **0.030 fWAR**
**Example (20-game season)**: SS diving catch = 0.090 runs / 1.23 = **0.073 fWAR**

### Assist Run Values (After Position Modifier)

| Position | Routine | DP Start | OF to 2B | OF to Home |
|----------|---------|----------|----------|------------|
| C | 0.056 | - | - | - |
| SS | 0.048 | 0.096 | - | - |
| 2B | 0.040 | 0.080 | - | - |
| 3B | 0.046 | 0.092 | - | - |
| CF | - | - | 0.096 | 0.144 |
| RF | - | - | 0.088 | 0.132 |
| LF | - | - | 0.072 | 0.108 |
| 1B | 0.028 | - | - | - |

**Example (48-game season)**: CF throw to home = 0.144 runs / 2.96 = **0.049 fWAR**
**Example (20-game season)**: CF throw to home = 0.144 runs / 1.23 = **0.117 fWAR**

### Error Run Penalties (After Position Modifier)

| Position | Fielding | Throwing | Mental |
|----------|----------|----------|--------|
| C | -0.12 | -0.16 | -0.20 |
| SS | -0.15 | -0.20 | -0.25 |
| 2B | -0.15 | -0.20 | -0.25 |
| 3B | -0.15 | -0.20 | -0.25 |
| CF | -0.17 | -0.22 | -0.28 |
| RF | -0.17 | -0.22 | -0.28 |
| LF | -0.17 | -0.22 | -0.28 |
| 1B | -0.18 | -0.24 | -0.30 |
| P | -0.20 | -0.26 | -0.33 |

**Example (48-game season)**: SS throwing error = -0.20 runs / 2.96 = **-0.068 fWAR**
**Example (20-game season)**: SS throwing error = -0.20 runs / 1.23 = **-0.163 fWAR**

### Common Play fWAR Values by Season Length

| Play | Runs | 48-game | 32-game | 20-game | 16-game |
|------|------|---------|---------|---------|---------|
| SS routine putout | +0.036 | +0.012 | +0.018 | +0.029 | +0.036 |
| CF diving catch | +0.115 | +0.039 | +0.058 | +0.093 | +0.116 |
| Robbed HR (CF) | +0.230 | +0.078 | +0.116 | +0.187 | +0.232 |
| OF assist at home | +0.132 | +0.045 | +0.067 | +0.107 | +0.133 |
| Double play turned | +0.120 | +0.041 | +0.061 | +0.098 | +0.121 |
| SS fielding error | -0.150 | -0.051 | -0.076 | -0.122 | -0.152 |
| Mental error | -0.250 | -0.084 | -0.126 | -0.203 | -0.253 |

---

## Appendix A: Data Sources

### MLB Methodology Sources

1. [FanGraphs WAR for Position Players](https://library.fangraphs.com/war/war-position-players/)
2. [MLB Statcast OAA](https://www.mlb.com/glossary/statcast/outs-above-average)
3. [DRS Explanation](https://www.mlb.com/glossary/advanced-stats/defensive-runs-saved)
4. [FanGraphs Positional Adjustment](https://library.fangraphs.com/misc/war/positional-adjustment/)

### Key Conversions Used

- **OAA to Runs**: OF: 1 OAA = 0.9 runs; IF: 1 OAA = 0.75 runs
- **Runs to WAR**: 10 runs = 1 WAR (162-game MLB season)
- **Season scaling formula**: `Runs Per Win = 10 × (seasonGames / 162)`

---

## Appendix B: Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-01-21 | Added Season Length Scaling (Section 2), updated all tables to show runs with fWAR conversion examples |
| 1.0 | 2026-01-21 | Initial specification |

---

*This document is the definitive source for fWAR calculations in KBL Tracker.*
