# bWAR Calculation Specification

> **Purpose**: Complete specification for calculating batting Wins Above Replacement (bWAR)
> **Created**: January 21, 2026
> **Based On**: FanGraphs methodology (wOBA, wRAA, Batting Runs) adapted for SMB4
> **Integration**: Works with EOS Salary Percentile system (Master Spec Section 10)
>
> **Related Specs**:
> - `FWAR_CALCULATION_SPEC.md` - Fielding WAR calculations
> - `RWAR_CALCULATION_SPEC.md` - Baserunning WAR calculations (TBD)
> - `PWAR_CALCULATION_SPEC.md` - Pitching WAR calculations (TBD)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Season Length Scaling](#2-season-length-scaling)
3. [Linear Weights Foundation](#3-linear-weights-foundation)
4. [wOBA Calculation](#4-woba-calculation)
5. [wRAA Calculation](#5-wraa-calculation)
6. [Batting Runs](#6-batting-runs)
7. [Replacement Level](#7-replacement-level)
8. [Complete bWAR Formula](#8-complete-bwar-formula)
9. [League Calibration System](#9-league-calibration-system)
10. [Implementation Examples](#10-implementation-examples)
11. [Quick Reference Tables](#11-quick-reference-tables)

---

## 1. Overview

### What bWAR Measures

bWAR (batting Wins Above Replacement) measures how many wins a player's offensive production adds to their team compared to a replacement-level player (freely available talent like a AAAA player or waiver wire pickup).

### The Chain of Calculations

```
Raw Stats (H, 2B, 3B, HR, BB, etc.)
    ↓
Linear Weights (run value per event)
    ↓
wOBA (weighted on-base average)
    ↓
wRAA (weighted runs above average)
    ↓
Batting Runs (park/league adjusted)
    ↓
+ Replacement Level Runs
    ↓
÷ Runs Per Win
    ↓
= bWAR
```

### MLB Methodology Sources

- [FanGraphs wOBA](https://library.fangraphs.com/offense/woba/)
- [FanGraphs wRAA](https://library.fangraphs.com/offense/wraa/)
- [FanGraphs Position Player WAR](https://library.fangraphs.com/war/war-position-players/)
- [FanGraphs Replacement Level](https://library.fangraphs.com/misc/war/replacement-level/)

---

## 2. Season Length Scaling

> **See FWAR_CALCULATION_SPEC.md Section 2 for full explanation.**

### Runs Per Win by Season Length

| Season Length | Games | Runs Per Win | Impact |
|---------------|-------|--------------|--------|
| Full MLB | 162 | 10.00 | Baseline |
| Long SMB4 | 48 | 2.96 | 3.38x more valuable |
| Standard SMB4 | 32 | 1.98 | 5.06x more valuable |
| Short SMB4 | 20 | 1.23 | 8.10x more valuable |
| Mini SMB4 | 16 | 0.99 | 10.13x more valuable |

```javascript
function getRunsPerWin(seasonGames) {
  const MLB_GAMES = 162;
  const MLB_RUNS_PER_WIN = 10;
  return MLB_RUNS_PER_WIN * (seasonGames / MLB_GAMES);
}
```

### Replacement Level Scaling

Replacement level runs also scale with season length (see Section 7).

---

## 3. Linear Weights Foundation

### What Are Linear Weights?

Linear weights assign a **run value** to each offensive event based on how many runs that event produces on average, considering base-out states.

### MLB Linear Weights (2023 Reference)

| Event | Run Value | Notes |
|-------|-----------|-------|
| Walk (uBB) | +0.69 | Unintentional BB |
| HBP | +0.72 | Hit by pitch |
| Single (1B) | +0.87 | Includes reaching on error |
| Double (2B) | +1.25 | Extra-base hit |
| Triple (3B) | +1.58 | Rare but valuable |
| Home Run (HR) | +2.01 | Clears the bases |
| Out | -0.26 | Average out value |
| Strikeout | -0.27 | Slightly worse (no advancement) |
| IBB | +0.69 | Same as uBB for batter |

### SMB4 Starting Linear Weights

We start with MLB weights, then **calibrate over time** based on our league's run environment:

```javascript
const LINEAR_WEIGHTS = {
  // 2023 MLB baseline - will calibrate over seasons
  uBB: 0.69,    // Unintentional walk
  HBP: 0.72,    // Hit by pitch
  single: 0.87,  // 1B
  double: 1.25,  // 2B
  triple: 1.58,  // 3B
  homeRun: 2.01, // HR
  out: -0.26,    // Generic out
  strikeout: -0.27  // K (slightly worse)
};
```

### Why Weights May Differ in SMB4

- **Higher offense league**: If SMB4 produces more runs/game, weights scale up
- **Different baserunning**: If runners advance more/less on singles
- **Park effects**: SMB4 stadiums may play differently

The calibration system (Section 9) handles this automatically.

---

## 4. wOBA Calculation

### What is wOBA?

**wOBA (Weighted On-Base Average)** combines all offensive events into a single rate stat, weighted by run value. It's scaled to look like OBP (typically .300-.400 range).

### wOBA Formula

```
wOBA = (wBB×uBB + wHBP×HBP + w1B×1B + w2B×2B + w3B×3B + wHR×HR) / (AB + uBB + SF + HBP)
```

Where:
- `wBB, wHBP, w1B, w2B, w3B, wHR` = linear weights (scaled)
- `uBB` = unintentional walks (BB - IBB)
- `SF` = sacrifice flies
- Denominator excludes IBB (intentional walks don't reflect batter skill)

### wOBA Weights (Scaled)

Raw linear weights are **scaled** so league-average wOBA ≈ league-average OBP:

```javascript
const WOBA_WEIGHTS = {
  // Scaled weights (raw weights × wOBA scale factor ~1.2)
  uBB: 0.690,
  HBP: 0.722,
  single: 0.888,
  double: 1.271,
  triple: 1.616,
  homeRun: 2.101
};

const WOBA_SCALE = 1.226;  // Varies by year/league
const LEAGUE_WOBA = 0.320;  // Starting estimate, calibrates over time

function calculateWOBA(stats) {
  const numerator =
    WOBA_WEIGHTS.uBB * (stats.BB - stats.IBB) +
    WOBA_WEIGHTS.HBP * stats.HBP +
    WOBA_WEIGHTS.single * stats.singles +
    WOBA_WEIGHTS.double * stats.doubles +
    WOBA_WEIGHTS.triple * stats.triples +
    WOBA_WEIGHTS.homeRun * stats.HR;

  const denominator =
    stats.AB + (stats.BB - stats.IBB) + stats.SF + stats.HBP;

  return denominator > 0 ? numerator / denominator : 0;
}
```

### wOBA Quality Scale

| wOBA | Rating | Description |
|------|--------|-------------|
| .400+ | Excellent | MVP candidate |
| .370 | Great | All-Star level |
| .340 | Above Average | Solid regular |
| .320 | Average | League average |
| .300 | Below Average | Weak bat |
| .280 | Poor | Replacement level |
| <.260 | Awful | Needs to be benched |

---

## 5. wRAA Calculation

### What is wRAA?

**wRAA (Weighted Runs Above Average)** converts wOBA into cumulative runs above/below the average player.

### wRAA Formula

```
wRAA = ((playerWOBA - leagueWOBA) / wobaScale) × PA
```

### Implementation

```javascript
function calculateWRAA(playerWOBA, plateAppearances, leagueWOBA = LEAGUE_WOBA, wobaScale = WOBA_SCALE) {
  return ((playerWOBA - leagueWOBA) / wobaScale) * plateAppearances;
}

// Example:
// Player: .360 wOBA in 400 PA
// League: .320 wOBA
// wRAA = ((.360 - .320) / 1.226) × 400 = 13.05 runs above average
```

### wRAA Interpretation

| wRAA | Interpretation |
|------|----------------|
| +30 | Elite (MVP level over full season) |
| +20 | Excellent |
| +10 | Above average |
| 0 | League average |
| -10 | Below average |
| -20 | Poor |
| -30 | Replacement level or worse |

> **Note**: These are for 162-game MLB season. Scale proportionally for SMB4 seasons.

---

## 6. Batting Runs

### What Are Batting Runs?

Batting Runs = wRAA with **park and league adjustments** applied.

### Park Factor Adjustment

SMB4 stadiums may have different run-scoring environments. If we track park factors:

```javascript
function applyParkFactor(wRAA, parkFactor, plateAppearances, leagueRunsPerPA) {
  // Park factor > 1.0 = hitter's park (reduce credit)
  // Park factor < 1.0 = pitcher's park (increase credit)
  const parkAdjustment = (leagueRunsPerPA - (parkFactor * leagueRunsPerPA)) * plateAppearances;
  return wRAA + parkAdjustment;
}
```

### League Adjustment

If we have multiple leagues/divisions with different run environments:

```javascript
function applyLeagueAdjustment(battingRuns, playerLeagueRunsPerPA, overallLeagueRunsPerPA, plateAppearances) {
  const leagueAdjustment = (overallLeagueRunsPerPA - playerLeagueRunsPerPA) * plateAppearances;
  return battingRuns + leagueAdjustment;
}
```

### Simplified Batting Runs (No Park Factors)

For SMB4, we may initially skip park factors:

```javascript
function calculateBattingRuns(playerWOBA, plateAppearances) {
  // Simplified: Batting Runs ≈ wRAA when no park/league adjustments
  return calculateWRAA(playerWOBA, plateAppearances);
}
```

---

## 7. Replacement Level

### What is Replacement Level?

Replacement level represents the **freely available talent** - players you could get off waivers, from AAA, or for league minimum salary. A replacement-level player is NOT average; they're significantly below average.

### MLB Replacement Level

Per FanGraphs:
- A replacement-level player produces **-17.5 runs per 600 PA** compared to average
- This works out to roughly **-2.0 WAR per 600 PA** (or 0 WAR = replacement)
- Replacement-level teams would win ~29.7% of games (~48 wins per 162)

### SMB4 Replacement Level (Starting Values)

We scale for our season length and **calibrate over time**:

```javascript
const REPLACEMENT_LEVEL = {
  // Runs below average per 600 PA (MLB baseline)
  runsPerPer600PA: -17.5,

  // Calibration factor (starts at 1.0, adjusts based on data)
  calibrationFactor: 1.0,

  // Last calibration date
  lastCalibrated: null
};

function getReplacementLevelRuns(plateAppearances, seasonGames) {
  const MLB_STANDARD_PA = 600;
  const baseReplacement = REPLACEMENT_LEVEL.runsPerPer600PA * REPLACEMENT_LEVEL.calibrationFactor;

  // Scale to player's PA
  const replacementRuns = (plateAppearances / MLB_STANDARD_PA) * Math.abs(baseReplacement);

  return replacementRuns;  // Returns positive number (runs to ADD to batting runs)
}
```

### Why Replacement Level is Positive in the Formula

Batting Runs tells you runs **above average**. But we want runs **above replacement**.

- An average player has 0 batting runs but is still valuable
- A replacement player has negative batting runs
- We ADD replacement level runs to convert from "above average" to "above replacement"

```
Runs Above Replacement = Batting Runs + Replacement Level Runs
```

---

## 8. Complete bWAR Formula

### The Full Equation

```
bWAR = (Batting Runs + Replacement Level Runs) / Runs Per Win
```

Or expanded:

```
bWAR = (wRAA + Park Adjustment + League Adjustment + Replacement Runs) / Runs Per Win
```

### Implementation

```javascript
function calculateBWAR(stats, seasonConfig) {
  const { seasonGames } = seasonConfig;

  // Step 1: Calculate wOBA
  const wOBA = calculateWOBA(stats);

  // Step 2: Calculate wRAA (runs above average)
  const wRAA = calculateWRAA(wOBA, stats.PA);

  // Step 3: Calculate Batting Runs (with adjustments if applicable)
  const battingRuns = wRAA;  // Simplified - add park/league adjustments if needed

  // Step 4: Add replacement level runs
  const replacementRuns = getReplacementLevelRuns(stats.PA, seasonGames);
  const runsAboveReplacement = battingRuns + replacementRuns;

  // Step 5: Convert to wins
  const runsPerWin = getRunsPerWin(seasonGames);
  const bWAR = runsAboveReplacement / runsPerWin;

  return {
    wOBA,
    wRAA,
    battingRuns,
    replacementRuns,
    runsAboveReplacement,
    runsPerWin,
    bWAR
  };
}
```

### Example Calculation (48-game season)

```javascript
const playerStats = {
  PA: 200,      // Plate appearances
  AB: 180,      // At bats
  H: 54,        // Hits (180 × .300)
  singles: 36,  // 1B
  doubles: 12,  // 2B
  triples: 2,   // 3B
  HR: 4,        // HR
  BB: 15,       // Walks
  IBB: 1,       // Intentional walks
  HBP: 3,       // Hit by pitch
  SF: 2         // Sac flies
};

// Step 1: wOBA
// Numerator: (0.69×14) + (0.72×3) + (0.888×36) + (1.271×12) + (1.616×2) + (2.101×4)
//          = 9.66 + 2.17 + 31.97 + 15.25 + 3.23 + 8.40 = 70.68
// Denominator: 180 + 14 + 2 + 3 = 199
// wOBA = 70.68 / 199 = .355

// Step 2: wRAA
// wRAA = ((.355 - .320) / 1.226) × 200 = 5.71 runs above average

// Step 3: Replacement Runs
// replacementRuns = (200 / 600) × 17.5 = 5.83 runs

// Step 4: Runs Above Replacement
// RAR = 5.71 + 5.83 = 11.54 runs

// Step 5: bWAR
// runsPerWin (48 games) = 10 × (48/162) = 2.96
// bWAR = 11.54 / 2.96 = 3.90 WAR

// This is an excellent 48-game season!
```

---

## 9. League Calibration System

### Why Calibrate?

MLB weights are derived from millions of plate appearances. Our SMB4 league will have different:
- Run scoring environments
- Baserunning tendencies
- Park effects
- Quality of pitching/hitting

### Calibration Data Collection

After each season, collect:

```javascript
const seasonData = {
  seasonId: 'S4',
  totalGames: 480,  // 10 teams × 48 games
  totalPA: 18000,   // Approximate
  totalRuns: 2400,  // Total runs scored

  // Event totals
  events: {
    singles: 2800,
    doubles: 600,
    triples: 80,
    homeRuns: 350,
    walks: 1200,
    HBP: 150,
    strikeouts: 4500,
    outs: 12000
  },

  // Derived
  runsPerGame: 5.0,  // 2400 / 480
  runsPerPA: 0.133   // 2400 / 18000
};
```

### Automatic Weight Recalculation

```javascript
function recalibrateLinearWeights(seasonData) {
  const { events, totalRuns, totalPA } = seasonData;

  // Calculate run expectancy changes for each event type
  // This requires tracking base-out states, which we may add later

  // Simplified approach: Scale MLB weights by run environment ratio
  const mlbRunsPerPA = 0.115;  // MLB average ~4.5 runs/game, ~39 PA/game
  const ourRunsPerPA = totalRuns / totalPA;
  const scaleFactor = ourRunsPerPA / mlbRunsPerPA;

  return {
    uBB: LINEAR_WEIGHTS.uBB * scaleFactor,
    HBP: LINEAR_WEIGHTS.HBP * scaleFactor,
    single: LINEAR_WEIGHTS.single * scaleFactor,
    double: LINEAR_WEIGHTS.double * scaleFactor,
    triple: LINEAR_WEIGHTS.triple * scaleFactor,
    homeRun: LINEAR_WEIGHTS.homeRun * scaleFactor,
    calibrationDate: new Date(),
    scaleFactor
  };
}
```

### Replacement Level Calibration

```javascript
function recalibrateReplacementLevel(seasonData, allPlayerStats) {
  // Find the "replacement level" tier - bottom 20% of qualified batters
  const qualifiedBatters = allPlayerStats
    .filter(p => p.PA >= seasonData.totalPA * 0.03)  // ~3% of league PA
    .sort((a, b) => a.wRAA - b.wRAA);

  const replacementTier = qualifiedBatters.slice(0, Math.ceil(qualifiedBatters.length * 0.2));
  const avgReplacementWRAA = replacementTier.reduce((sum, p) => sum + p.wRAA, 0) / replacementTier.length;

  // Convert to per-600-PA rate
  const avgPA = replacementTier.reduce((sum, p) => sum + p.PA, 0) / replacementTier.length;
  const replacementRunsPer600 = (avgReplacementWRAA / avgPA) * 600;

  return {
    runsPerPer600PA: replacementRunsPer600,
    sampleSize: replacementTier.length,
    calibrationDate: new Date()
  };
}
```

### Calibration Schedule

```javascript
const CALIBRATION_CONFIG = {
  // Minimum data before first calibration
  minSeasonsBeforeCalibration: 2,
  minTotalPA: 10000,

  // How much to trust new data vs. old
  blendFactor: 0.3,  // 30% new data, 70% existing

  // When to recalibrate
  recalibrateAfterEachSeason: true
};

function blendCalibration(existing, newCalc, blendFactor) {
  return existing * (1 - blendFactor) + newCalc * blendFactor;
}
```

---

## 10. Implementation Examples

### Example 1: Elite Hitter (48-game season)

```javascript
const eliteHitter = {
  name: 'Willie Mays',
  PA: 220, AB: 195, H: 68,  // .349 AVG
  singles: 40, doubles: 16, triples: 4, HR: 8,
  BB: 22, IBB: 3, HBP: 2, SF: 1
};

const result = calculateBWAR(eliteHitter, { seasonGames: 48 });
// wOBA: .412
// wRAA: +15.0 runs
// Replacement: +6.4 runs
// RAR: +21.4 runs
// bWAR: +7.2 (MVP-caliber season)
```

### Example 2: Average Hitter (48-game season)

```javascript
const averageHitter = {
  name: 'Joe Average',
  PA: 180, AB: 160, H: 42,  // .263 AVG
  singles: 30, doubles: 8, triples: 1, HR: 3,
  BB: 16, IBB: 1, HBP: 2, SF: 2
};

const result = calculateBWAR(averageHitter, { seasonGames: 48 });
// wOBA: .318
// wRAA: -0.3 runs (slightly below average)
// Replacement: +5.3 runs
// RAR: +5.0 runs
// bWAR: +1.7 (solid but unspectacular)
```

### Example 3: Replacement-Level Hitter (48-game season)

```javascript
const replacementHitter = {
  name: 'Bench McBenchface',
  PA: 100, AB: 92, H: 18,  // .196 AVG
  singles: 14, doubles: 3, triples: 0, HR: 1,
  BB: 6, IBB: 0, HBP: 1, SF: 1
};

const result = calculateBWAR(replacementHitter, { seasonGames: 48 });
// wOBA: .258
// wRAA: -5.1 runs
// Replacement: +2.9 runs
// RAR: -2.2 runs
// bWAR: -0.7 (below replacement - should be benched)
```

---

## 11. Quick Reference Tables

### wOBA Weights (Starting Values)

| Event | Raw Weight | Scaled Weight |
|-------|------------|---------------|
| uBB | 0.69 | 0.690 |
| HBP | 0.72 | 0.722 |
| 1B | 0.87 | 0.888 |
| 2B | 1.25 | 1.271 |
| 3B | 1.58 | 1.616 |
| HR | 2.01 | 2.101 |

### bWAR by Season Length

| PA | wOBA | 48g bWAR | 32g bWAR | 20g bWAR |
|----|------|----------|----------|----------|
| 200 | .400 | +5.9 | +8.9 | +14.3 |
| 200 | .360 | +3.2 | +4.9 | +7.8 |
| 200 | .320 | +2.0 | +3.0 | +4.8 |
| 200 | .280 | +0.7 | +1.1 | +1.8 |
| 200 | .240 | -0.6 | -0.8 | -1.3 |

### Expected bWAR by SMB4 Rating

| Power + Contact Avg | Expected bWAR (48g) |
|---------------------|---------------------|
| 95 | +5.0 to +7.0 |
| 85 | +3.0 to +5.0 |
| 75 | +1.5 to +3.0 |
| 65 | +0.5 to +1.5 |
| 55 | -0.5 to +0.5 |
| 45 | -1.5 to -0.5 |

---

## Appendix A: Required Tracking Data

### Per At-Bat (Minimum)

| Field | Type | Notes |
|-------|------|-------|
| result | enum | 1B, 2B, 3B, HR, BB, K, GO, FO, etc. |
| plateAppearance | boolean | True unless mid-inning sub |
| atBat | boolean | False for BB, HBP, SF, SH |
| RBI | number | Runs batted in |

### Per At-Bat (Enhanced)

| Field | Type | Notes |
|-------|------|-------|
| pitchCount | number | For plate discipline metrics |
| wasIntentionalWalk | boolean | IBB tracking |
| hitType | enum | GB, FB, LD, PF |
| exitVelocity | number | If we track it |

### Season Aggregates

| Stat | Calculation |
|------|-------------|
| PA | AB + BB + HBP + SF + SH |
| singles | H - 2B - 3B - HR |
| uBB | BB - IBB |

---

## Appendix B: Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-21 | Initial specification |

---

*This document is the definitive source for bWAR calculations in KBL Tracker.*
