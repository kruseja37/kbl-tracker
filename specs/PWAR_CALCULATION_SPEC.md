# Pitching WAR (pWAR) Calculation Specification

> **Source**: Based on FanGraphs pitching WAR methodology using FIP (Fielding Independent Pitching)
> **SMB4 Adaptation**: Includes calibration system and season-length scaling
> **Related Specs**: BWAR_CALCULATION_SPEC.md, RWAR_CALCULATION_SPEC.md, FWAR_CALCULATION_SPEC.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [Season Length Scaling](#2-season-length-scaling)
3. [FIP (Fielding Independent Pitching)](#3-fip-fielding-independent-pitching)
4. [FIP Constant Calculation](#4-fip-constant-calculation)
5. [Runs Per Win (Pitcher-Specific)](#5-runs-per-win-pitcher-specific)
6. [Replacement Level](#6-replacement-level)
7. [Leverage Index (Relievers)](#7-leverage-index-relievers)
8. [Complete pWAR Formula](#8-complete-pwar-formula)
9. [SMB4 Calibration System](#9-smb4-calibration-system)
10. [Implementation Examples](#10-implementation-examples)
11. [SMB4-Specific Considerations](#11-smb4-specific-considerations)
12. [Tracking Requirements](#12-tracking-requirements)
13. [Reference Tables](#13-reference-tables)

---

## 1. Overview

### What is pWAR?

Pitching WAR (pWAR) measures a pitcher's total value in terms of wins above a replacement-level pitcher. It uses **FIP (Fielding Independent Pitching)** as its foundation, focusing on outcomes the pitcher controls directly: strikeouts, walks, hit-by-pitches, and home runs.

### Why FIP-Based WAR?

FIP strips out defense and luck on balls in play, isolating pitcher skill:
- **Strikeouts** = Good (pitcher prevented a ball in play)
- **Walks/HBP** = Bad (free baserunners)
- **Home Runs** = Very Bad (guaranteed run + extra bases)

### Core Formula (Simplified)

```
pWAR = ((lgFIP - FIP) / RunsPerWin + ReplacementLevel) × (IP / 9) × LeverageMultiplier
```

### Key Differences from Batting WAR

| Aspect | bWAR | pWAR |
|--------|------|------|
| Core metric | wOBA → wRAA | FIP → FIP Runs |
| Runs per win | League-wide (~10) | Pitcher-specific (varies) |
| Replacement level | -17.5 runs/600 PA | 0.12 (starter) / 0.03 (reliever) |
| Leverage adjustment | None | Yes (relievers only) |

---

## 2. Season Length Scaling

> **Cross-reference**: Same methodology as BWAR_CALCULATION_SPEC.md §2

### The Principle

A saved run is more valuable in shorter seasons. SMB4 seasons (20-48 games) require proportional scaling from MLB's 162-game baseline.

### Runs Per Win by Season Length

```javascript
const MLB_GAMES = 162;
const MLB_RUNS_PER_WIN = 10;

function getBaseRunsPerWin(seasonGames) {
  return MLB_RUNS_PER_WIN * (seasonGames / MLB_GAMES);
}
```

### Quick Reference

| Season Length | Runs Per Win | Impact Multiplier |
|---------------|--------------|-------------------|
| 162 games (MLB) | 10.00 | 1.00× |
| 48 games | 2.96 | 3.38× |
| 32 games | 1.98 | 5.06× |
| 20 games | 1.23 | 8.10× |

---

## 3. FIP (Fielding Independent Pitching)

### The Formula

```
FIP = ((13 × HR) + (3 × (BB + HBP)) - (2 × K)) / IP + FIP_Constant
```

### Component Weights Explained

| Component | Coefficient | Meaning |
|-----------|-------------|---------|
| HR | +13 | Home runs are devastating (~1.4 runs each) |
| BB + HBP | +3 | Free bases lead to ~0.3 runs each |
| K | -2 | Strikeouts prevent ~0.2 runs each |

### Why These Specific Values?

The coefficients (13, 3, -2) are derived from linear regression modeling ERA from these components. Research from 2021-2023 data confirms:
- HR coefficient: ~13.3
- BB+HBP coefficient: ~3.3
- K coefficient: ~-1.8

The traditional 13/3/2 values remain robust approximations.

### FIP Scale (MLB Reference)

| Rating | FIP Range | Description |
|--------|-----------|-------------|
| Excellent | < 3.00 | Elite pitcher |
| Great | 3.00-3.50 | Above average |
| Above Average | 3.50-4.00 | Better than league average |
| Average | 4.00-4.50 | Around league average (4.04) |
| Below Average | 4.50-5.00 | Below league average |
| Poor | > 5.00 | Struggling |

> **Note**: League average FIP is ~4.04 (SMB4 calibrated), so 4.00-4.50 represents "average" performance.

### JavaScript Implementation

```javascript
function calculateFIP(stats, fipConstant) {
  const { HR, BB, HBP, K, IP } = stats;

  if (IP === 0) return null;

  const fip = ((13 * HR) + (3 * (BB + HBP)) - (2 * K)) / IP + fipConstant;

  return Math.round(fip * 100) / 100;  // Round to 2 decimal places
}
```

---

## 4. FIP Constant Calculation

### Purpose

The FIP constant scales FIP to match league ERA, making it directly comparable to ERA on the same scale.

### Formula

```
FIP_Constant = lgERA - (((13 × lgHR) + (3 × (lgBB + lgHBP)) - (2 × lgK)) / lgIP)
```

### Typical Values

The FIP constant typically ranges from **3.10 to 3.20** in MLB. For generic examples in this spec, **3.15** is used. However, the actual SMB4 implementation uses **3.28** (calibrated from SMB4 league data per `ADAPTIVE_STANDARDS_ENGINE_SPEC.md`).

### JavaScript Implementation

```javascript
function calculateFIPConstant(leagueStats) {
  const { ERA, HR, BB, HBP, K, IP } = leagueStats;

  const rawFIP = ((13 * HR) + (3 * (BB + HBP)) - (2 * K)) / IP;
  const fipConstant = ERA - rawFIP;

  return fipConstant;
}

// Example: MLB 2023-ish values
const mlbLeagueStats = {
  ERA: 4.20,
  HR: 1.25,    // per 9 innings
  BB: 3.10,    // per 9 innings
  HBP: 0.40,   // per 9 innings
  K: 8.50,     // per 9 innings
  IP: 9        // normalized to 9 innings
};

// FIP constant ≈ 3.15
```

---

## 5. Runs Per Win (Pitcher-Specific)

### Why Pitcher-Specific?

Unlike batters, pitchers directly influence their run environment. A pitcher who allows fewer runs makes it easier for their team to win, so they have a lower runs-per-win threshold.

### The Dynamic Formula

```
dRPW = ((IP/GS × lgR/9) + ((9 - IP/GS) × parkAdjustedFIP)) / 9 + 2) × 1.5
```

Simplified for SMB4:

```javascript
function getPitcherRunsPerWin(pitcherFIP, leagueRunsPerGame, seasonGames) {
  // Base runs per win for the season
  const baseRPW = getBaseRunsPerWin(seasonGames);

  // Adjust for pitcher's impact on run environment
  // Better pitchers (lower FIP) have lower RPW thresholds
  const pitcherAdjustment = (pitcherFIP / leagueRunsPerGame) * 0.5;

  const pitcherRPW = baseRPW * (0.8 + pitcherAdjustment);

  return pitcherRPW;
}
```

### Simplified Approach for SMB4

Given SMB4's smaller sample sizes, we can use a simplified approach:

```javascript
function getSimplifiedPitcherRPW(pitcherFIP, leagueFIP, seasonGames) {
  const baseRPW = getBaseRunsPerWin(seasonGames);

  // Ratio adjustment: elite pitchers get slightly lower RPW
  // Range: 0.9 (elite) to 1.1 (poor)
  const fipRatio = Math.min(1.1, Math.max(0.9, pitcherFIP / leagueFIP));

  return baseRPW * fipRatio;
}
```

---

## 6. Replacement Level

### Starter vs. Reliever

FanGraphs uses different replacement levels because relieving is an easier job than starting:

| Role | Replacement Level | Meaning |
|------|-------------------|---------|
| Starter | 0.12 | +0.12 wins per 9 IP above 0 WAR |
| Reliever | 0.03 | +0.03 wins per 9 IP above 0 WAR |
| Mixed | Weighted average | Based on GS/G ratio |

### Formula for Mixed Roles

```
ReplacementLevel = 0.03 × (1 - GS/G) + 0.12 × (GS/G)
```

### JavaScript Implementation

```javascript
function getReplacementLevel(gamesStarted, gamesAppeared) {
  const STARTER_REPLACEMENT = 0.12;
  const RELIEVER_REPLACEMENT = 0.03;

  if (gamesAppeared === 0) return STARTER_REPLACEMENT;

  const starterShare = gamesStarted / gamesAppeared;
  const relieverShare = 1 - starterShare;

  return (RELIEVER_REPLACEMENT * relieverShare) + (STARTER_REPLACEMENT * starterShare);
}

// Examples:
// Pure starter (30 GS, 30 G): 0.12
// Pure reliever (0 GS, 60 G): 0.03
// Swingman (10 GS, 40 G): 0.03 × 0.75 + 0.12 × 0.25 = 0.0525
```

---

## 7. Leverage Index (Relievers)

### What is Leverage Index?

Leverage Index (LI) measures the importance of a situation. Higher leverage = more impact on game outcome.

| LI Value | Situation Type |
|----------|----------------|
| 0.5 | Low leverage (blowout) |
| 1.0 | Average leverage |
| 1.5 | High leverage |
| 2.0+ | Very high leverage (closer situations) |

### Why Adjust Reliever WAR?

Relievers who pitch in high-leverage situations provide more value. A closer protecting a 1-run lead contributes more than a mop-up reliever in a blowout.

### The Chaining Effect Adjustment

When a closer gets hurt, the setup man becomes closer, etc. So we regress the pitcher's LI halfway toward average:

```
LI_Multiplier = (gmLI + 1) / 2
```

Where `gmLI` is the pitcher's average leverage index.

### JavaScript Implementation

```javascript
function getLeverageMultiplier(averageLeverageIndex, isReliever) {
  if (!isReliever) return 1.0;  // Starters get no leverage adjustment

  // Regress halfway toward average (1.0)
  const liMultiplier = (averageLeverageIndex + 1) / 2;

  return liMultiplier;
}

// Examples:
// Closer (avg LI = 1.8): (1.8 + 1) / 2 = 1.40
// Setup man (avg LI = 1.3): (1.3 + 1) / 2 = 1.15
// Middle reliever (avg LI = 0.9): (0.9 + 1) / 2 = 0.95
// Mop-up (avg LI = 0.5): (0.5 + 1) / 2 = 0.75
```

### SMB4 Note on Leverage

SMB4 may not track situational leverage. See Section 11 for simplified approaches.

---

## 8. Complete pWAR Formula

### Full Formula

```
pWAR = ((lgFIP - FIP) / pitcherRPW + replacementLevel) × (IP / 9) × leverageMultiplier + leagueCorrection
```

### Step-by-Step Calculation

1. **Calculate FIP**: `((13×HR) + (3×(BB+HBP)) - (2×K)) / IP + FIPconstant`
2. **Calculate FIP Runs Above Average**: `(lgFIP - FIP) × (IP / 9)`
3. **Convert to Wins**: Divide by pitcher-specific runs per win
4. **Add Replacement Level**: Add role-based replacement level × (IP/9)
5. **Apply Leverage** (relievers only): Multiply by LI multiplier
6. **League Correction**: Small adjustment to balance league-wide WAR

### Complete JavaScript Implementation

```javascript
function calculatePWAR(pitcherStats, leagueStats, seasonConfig) {
  const {
    HR, BB, HBP, K, IP,
    gamesStarted, gamesAppeared,
    averageLeverageIndex = 1.0
  } = pitcherStats;

  const { seasonGames } = seasonConfig;

  // Step 1: Calculate FIP
  const fipConstant = calculateFIPConstant(leagueStats);
  const pitcherFIP = calculateFIP(pitcherStats, fipConstant);
  const leagueFIP = leagueStats.FIP || calculateFIP(leagueStats, fipConstant);

  // Step 2: FIP Runs Above Average per 9 innings
  const fipDiff = leagueFIP - pitcherFIP;  // Positive = better than average

  // Step 3: Get pitcher-specific runs per win
  const pitcherRPW = getSimplifiedPitcherRPW(pitcherFIP, leagueFIP, seasonGames);

  // Step 4: Convert to wins above average per 9 IP
  const winsAboveAvgPer9 = fipDiff / pitcherRPW;

  // Step 5: Add replacement level
  const replacementLevel = getReplacementLevel(gamesStarted, gamesAppeared);
  const winsAboveReplacementPer9 = winsAboveAvgPer9 + replacementLevel;

  // Step 6: Scale by innings pitched
  const rawWAR = winsAboveReplacementPer9 * (IP / 9);

  // Step 7: Apply leverage multiplier (relievers only)
  // Role thresholds: starter >= 80% starts, reliever <= 20% starts, else swingman
  const starterShare = gamesStarted / gamesAppeared;
  const role = starterShare >= 0.8 ? 'starter' : starterShare <= 0.2 ? 'reliever' : 'swingman';
  const isReliever = role === 'reliever';
  const leverageMultiplier = getLeverageMultiplier(averageLeverageIndex, isReliever);
  const adjustedWAR = rawWAR * leverageMultiplier;

  return {
    FIP: pitcherFIP,
    leagueFIP,
    fipDiff,
    pitcherRPW,
    replacementLevel,
    leverageMultiplier,
    IP,
    pWAR: Math.round(adjustedWAR * 100) / 100
  };
}
```

---

## 9. SMB4 Calibration System

### Initial Baseline Values

Start with MLB-derived values, then calibrate based on collected data:

```javascript
const SMB4_PITCHING_BASELINE = {
  // FIP coefficients
  fipCoefficients: {
    HR: 13,
    BB_HBP: 3,
    K: 2
  },

  // Expected league averages (will calibrate)
  expectedLeagueStats: {
    FIP: 4.00,
    ERA: 4.20,
    K_per_9: 8.0,
    BB_per_9: 3.2,
    HR_per_9: 1.1
  },

  // Replacement levels
  replacementLevel: {
    starter: 0.12,
    reliever: 0.03
  },

  // Confidence in these values (0-1)
  confidence: 0.3,  // Start low, increase with data

  // Minimum sample for calibration
  minInningsForCalibration: 500  // League-wide
};
```

### Calibration Algorithm

```javascript
function calibratePitchingMetrics(currentBaseline, newSeasonData) {
  const { totalIP } = newSeasonData;

  // Don't calibrate with insufficient data
  if (totalIP < currentBaseline.minInningsForCalibration) {
    return currentBaseline;
  }

  // Blend weight: more data = trust new data more
  const dataWeight = Math.min(0.4, totalIP / 2000);  // Max 40% new data
  const baselineWeight = 1 - dataWeight;

  // Calibrate league averages
  const calibratedStats = {
    FIP: (currentBaseline.expectedLeagueStats.FIP * baselineWeight) +
         (newSeasonData.leagueFIP * dataWeight),
    ERA: (currentBaseline.expectedLeagueStats.ERA * baselineWeight) +
         (newSeasonData.leagueERA * dataWeight),
    K_per_9: (currentBaseline.expectedLeagueStats.K_per_9 * baselineWeight) +
             (newSeasonData.leagueK9 * dataWeight),
    BB_per_9: (currentBaseline.expectedLeagueStats.BB_per_9 * baselineWeight) +
              (newSeasonData.leagueBB9 * dataWeight),
    HR_per_9: (currentBaseline.expectedLeagueStats.HR_per_9 * baselineWeight) +
              (newSeasonData.leagueHR9 * dataWeight)
  };

  return {
    ...currentBaseline,
    expectedLeagueStats: calibratedStats,
    confidence: Math.min(1.0, currentBaseline.confidence + (dataWeight * 0.5)),
    lastCalibrated: new Date().toISOString(),
    dataPoints: {
      totalIP,
      seasons: (currentBaseline.dataPoints?.seasons || 0) + 1
    }
  };
}
```

---

## 10. Implementation Examples

### Example 1: Ace Starter (48-game season)

```javascript
const aceStats = {
  HR: 8,
  BB: 25,
  HBP: 3,
  K: 120,
  IP: 90,
  gamesStarted: 15,
  gamesAppeared: 15
};

const leagueStats = {
  ERA: 4.20,
  FIP: 4.00,
  HR: 1.1,    // per 9
  BB: 3.2,
  HBP: 0.4,
  K: 8.0,
  IP: 9
};

// FIP = ((13×8) + (3×28) - (2×120)) / 90 + 3.15
// FIP = (104 + 84 - 240) / 90 + 3.15
// FIP = -0.58 + 3.15 = 2.57

// FIP Diff = 4.00 - 2.57 = +1.43 runs/9 better than average
// Pitcher RPW ≈ 2.96 × 0.95 = 2.81 (elite pitcher adjustment)
// Wins above avg per 9 = 1.43 / 2.81 = 0.509
// Add replacement (starter) = 0.509 + 0.12 = 0.629 per 9 IP
// Scale by IP = 0.629 × (90/9) = 6.29 WAR
// No leverage adjustment (starter)

// Result: ~6.3 pWAR (elite performance)
```

### Example 2: Closer (48-game season)

```javascript
const closerStats = {
  HR: 2,
  BB: 8,
  HBP: 1,
  K: 35,
  IP: 25,
  gamesStarted: 0,
  gamesAppeared: 20,
  averageLeverageIndex: 1.8
};

// FIP = ((13×2) + (3×9) - (2×35)) / 25 + 3.15
// FIP = (26 + 27 - 70) / 25 + 3.15
// FIP = -0.68 + 3.15 = 2.47

// FIP Diff = 4.00 - 2.47 = +1.53 runs/9
// Pitcher RPW ≈ 2.96 × 0.94 = 2.78
// Wins above avg per 9 = 1.53 / 2.78 = 0.550
// Add replacement (reliever) = 0.550 + 0.03 = 0.580 per 9 IP
// Scale by IP = 0.580 × (25/9) = 1.61 WAR
// Leverage multiplier = (1.8 + 1) / 2 = 1.40
// Final = 1.61 × 1.40 = 2.25 WAR

// Result: ~2.3 pWAR (excellent closer)
```

### Example 3: League Average Starter

```javascript
const avgStarterStats = {
  HR: 12,
  BB: 35,
  HBP: 4,
  K: 70,
  IP: 80,
  gamesStarted: 14,
  gamesAppeared: 14
};

// FIP = ((13×12) + (3×39) - (2×70)) / 80 + 3.15
// FIP = (156 + 117 - 140) / 80 + 3.15
// FIP = 1.66 + 3.15 = 4.81

// FIP Diff = 4.00 - 4.81 = -0.81 runs/9 (worse than average)
// Pitcher RPW ≈ 2.96 × 1.05 = 3.11 (below avg adjustment)
// Wins above avg per 9 = -0.81 / 3.11 = -0.260
// Add replacement = -0.260 + 0.12 = -0.140 per 9 IP
// Scale by IP = -0.140 × (80/9) = -1.24 WAR

// Result: ~-1.2 pWAR (below replacement)
```

---

## 11. SMB4-Specific Considerations

### What We Can Calculate Now vs. Later

| Component | Can Calculate Now? | Notes |
|-----------|-------------------|-------|
| FIP | ✅ Yes | K, BB, HBP, HR all tracked |
| Basic pWAR | ✅ Yes | Using simplified RPW |
| Starter/Reliever split | ✅ Yes | GS and G tracked |
| Leverage adjustment | ⚠️ Partial | Need LI tracking |
| Park adjustment | ⚠️ Specified | See STADIUM_ANALYTICS_SPEC.md (NOT YET IMPLEMENTED in code) |

### Simplified pWAR (Phase 1)

Without leverage index tracking, use role-based defaults:

```javascript
function getDefaultLeverageIndex(gamesStarted, gamesAppeared, saves = 0) {
  if (gamesStarted === gamesAppeared) return 1.0;  // Starter

  // Estimate reliever leverage from saves
  const saveRate = saves / Math.max(1, gamesAppeared - gamesStarted);

  if (saveRate > 0.6) return 1.7;    // Primary closer
  if (saveRate > 0.3) return 1.4;    // Setup/closer mix
  if (saveRate > 0.1) return 1.2;    // Setup man
  return 0.9;                         // Middle relief/mop-up
}
```

### SMB4 Pitching Context

1. **Shorter games**: SMB4 games are shorter, so IP accumulation differs
2. **No IFFB tracking**: Use standard FIP, not ifFIP (infield flies as strikeouts)
3. **Simplified leverage**: Use save-based estimation until full tracking

### Park Factor Adjustments for Pitchers

> **See STADIUM_ANALYTICS_SPEC.md** for complete park factor system.

Pitchers benefit from park adjustments just like batters. A pitcher in a hitter-friendly park gets more credit; a pitcher in a pitcher-friendly park gets less credit.

```javascript
function applyPitcherParkFactor(
  pitcher: Player,
  rawFIP: number,
  seasonStats: PitcherSeasonStats
): number {
  const homeStadium = getHomeStadium(pitcher.teamId);
  const pf = homeStadium.parkFactors;

  // Only adjust if we have confident park factor data
  if (pf.confidence === 'LOW') {
    return rawFIP;  // Use raw FIP until data is available
  }

  // For FIP, primarily adjust based on HR factor
  // since FIP is K, BB, HR based
  const hrFactor = pf.homeRuns;

  // Adjust home innings only
  const homeIP = seasonStats.homeIP;
  const totalIP = seasonStats.IP;
  const homeRatio = homeIP / totalIP;

  // If park inflates HRs (hrFactor > 1.0), reduce FIP penalty
  // If park suppresses HRs (hrFactor < 1.0), increase FIP penalty
  const adjustment = (1.0 - hrFactor) * 0.5;  // Scale the adjustment

  return rawFIP - (adjustment * homeRatio);
}
```

For ERA-based analysis (run environment):

```javascript
function getParkAdjustedERA(
  pitcher: Player,
  rawERA: number,
  homeIP: number,
  totalIP: number
): number {
  const homeStadium = getHomeStadium(pitcher.teamId);
  const runsFactor = homeStadium.parkFactors.runs;

  if (homeStadium.parkFactors.confidence === 'LOW') {
    return rawERA;
  }

  const homeRatio = homeIP / totalIP;

  // Adjust: if park inflates runs, give pitcher credit
  return rawERA / ((runsFactor - 1.0) * homeRatio + 1.0);
}

---

## 12. Tracking Requirements

### Minimum Required Data

| Stat | Source | Notes |
|------|--------|-------|
| IP | Game logs | Innings pitched (can be fractional) |
| K | Pitching stats | Strikeouts |
| BB | Pitching stats | Walks issued |
| HBP | Pitching stats | Hit batters |
| HR | Pitching stats | Home runs allowed |
| GS | Game logs | Games started |
| G | Game logs | Games appeared |
| SV | Game logs | Saves (for leverage estimation) |

### Enhanced Tracking (For Full pWAR)

| Stat | How to Track | Notes |
|------|--------------|-------|
| Leverage Index | Situation tracker | Game state at entry |
| Hold situations | Relief events | For setup men |
| Inherited runners | Relief events | Runners on when entered |
| Bequeathed runners | Relief events | Runners on when exited |

### League-Level Data Collection

```javascript
const leaguePitchingStats = {
  // Core FIP inputs (totals)
  totalIP: 0,
  totalK: 0,
  totalBB: 0,
  totalHBP: 0,
  totalHR: 0,

  // ERA calculation
  totalER: 0,

  // For calibration
  totalGamesStarted: 0,
  totalGamesAppeared: 0,

  // Derived (calculate after season)
  leagueERA: 0,
  leagueFIP: 0,
  fipConstant: 0
};
```

---

## 13. Reference Tables

### FIP Component Values

| Event | FIP Coefficient | Run Value (approx) |
|-------|-----------------|-------------------|
| Home Run | +13 | ~1.4 runs |
| Walk | +3 | ~0.3 runs |
| HBP | +3 | ~0.3 runs |
| Strikeout | -2 | ~-0.2 runs |

### Replacement Level Reference

| Role | Replacement Level | Per 50 IP Value |
|------|-------------------|-----------------|
| Starter | 0.12 | +0.67 wins |
| Reliever | 0.03 | +0.17 wins |
| 50/50 Split | 0.075 | +0.42 wins |

### pWAR Benchmarks (48-game season)

| Rating | pWAR Range | Description |
|--------|------------|-------------|
| MVP-caliber | > 5.0 | Dominant ace |
| All-Star | 3.0 - 5.0 | Elite pitcher |
| Above Avg | 1.5 - 3.0 | Solid contributor |
| Average | 0.5 - 1.5 | Replacement level+ |
| Below Avg | 0.0 - 0.5 | Marginal |
| Replacement | < 0.0 | Below replacement |

### Leverage Index Defaults (by Role)

| Role | Default LI | LI Multiplier |
|------|-----------|---------------|
| Starter | 1.0 | 1.0 (not applied) |
| Closer | 1.7 | 1.35 |
| Setup | 1.3 | 1.15 |
| Middle Relief | 0.9 | 0.95 |
| Long Relief | 0.7 | 0.85 |

---

## Appendix: Quick Reference Code

### Minimal pWAR Calculator

```javascript
function quickPWAR(K, BB, HBP, HR, IP, GS, G, seasonGames = 48) {
  // FIP
  const fipConstant = 3.15;
  const FIP = ((13 * HR) + (3 * (BB + HBP)) - (2 * K)) / IP + fipConstant;

  // League average FIP (calibrate this)
  const lgFIP = 4.00;

  // Runs per win (scaled for season)
  const baseRPW = 10 * (seasonGames / 162);
  const pitcherRPW = baseRPW * Math.min(1.1, Math.max(0.9, FIP / lgFIP));

  // Replacement level
  const starterShare = GS / G;
  const replacementLevel = (0.03 * (1 - starterShare)) + (0.12 * starterShare);

  // WAR calculation
  const fipDiff = lgFIP - FIP;
  const winsAboveAvgPer9 = fipDiff / pitcherRPW;
  const warPer9 = winsAboveAvgPer9 + replacementLevel;
  const pWAR = warPer9 * (IP / 9);

  return {
    FIP: Math.round(FIP * 100) / 100,
    pWAR: Math.round(pWAR * 100) / 100
  };
}

// Example usage:
// quickPWAR(120, 25, 3, 8, 90, 15, 15, 48)
// → { FIP: 2.57, pWAR: 6.29 }
```

---

*Last Updated: January 2026*
*Version: 1.0*
