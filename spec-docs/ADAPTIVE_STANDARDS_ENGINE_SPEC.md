# Adaptive Standards Engine Specification

> **Purpose**: Define the system that calculates league baselines, replacement level, and contextually appropriate thresholds based on actual franchise data
> **Status**: IMPLEMENTED (Static v1) - Using SMB4 static defaults; full adaptive learning is post-MVP
> **Priority**: High (foundational for WAR, Milestones, Awards, and Simulation)
> **Related Specs**: MILESTONE_SYSTEM_SPEC.md, *WAR_CALCULATION_SPEC.md, GAME_SIMULATION_SPEC.md, EOS_RATINGS_ADJUSTMENT_SPEC.md

---

## 1. Overview

The Adaptive Standards Engine is a **foundational system** that learns from actual franchise data to set contextually appropriate baselines and thresholds. It replaces fixed MLB-based assumptions with dynamic values derived from your franchise's unique history.

### 1.1 Why Adaptive Standards?

Fixed thresholds assume MLB-like distributions, but our franchise might have:
- Higher/lower league-wide batting averages due to roster composition
- Different HR rates based on park factors or pitcher quality
- Varying strikeout rates across eras of the franchise
- Unique run environments that affect WAR calculations

**The engine solves three problems:**

1. **Game-count scaling**: A 50-game season needs different counting stat thresholds than MLB's 162
2. **Innings-per-game scaling**: 7-inning games reduce opportunities compared to 9-inning games
3. **Context-aware rates**: What's "elite" depends on the league environment (a 2.50 ERA means different things in different run environments)

### 1.2 Integration Points

| System | How It Uses Adaptive Standards |
|--------|-------------------------------|
| **Milestones** | Counting stat scaling + rate stat context |
| **WAR Calculation** | Replacement level, runs per win, positional adjustments |
| **Awards** | Qualification thresholds, voting context |
| **Fame System** | What constitutes "elite" vs "poor" performance |
| **Simulation** | Expected outcome distributions, variance tuning |
| **Player Ratings** | End-of-season adjustment context |
| **Hall of Fame** | Career value benchmarks |
| **Contract Value** | Market value calculations |

---

## 2. Opportunity-Based Scaling

### 2.1 Franchise Configuration

The franchise setup menu captures key settings that affect all threshold calculations:

```typescript
interface FranchiseConfig {
  franchiseId: string;
  franchiseName: string;

  // === SEASON STRUCTURE ===
  gamesPerTeam: number;       // e.g., 50, 82, 128, 162
  inningsPerGame: number;     // e.g., 7, 9 (from franchise setup menu)
  teamsCount: number;         // e.g., 8, 12, 30

  // === DERIVED CONSTANTS ===
  // These are calculated from the above, not user-configured
  readonly MLB_GAMES: 162;
  readonly MLB_INNINGS: 9;
}
```

### 2.2 The Opportunity Factor

The **Opportunity Factor** combines both game count and innings per game into a single scaling multiplier. MLB's 162-game, 9-inning season represents the maximum (1.0):

```typescript
/**
 * Calculate the opportunity factor for scaling counting stats.
 *
 * MLB baseline: 162 games × 9 innings = 1,458 total innings of opportunity
 * Your franchise: gamesPerTeam × inningsPerGame = your total innings
 *
 * @returns Factor between 0 and 1 (1.0 = full MLB season)
 */
function calculateOpportunityFactor(config: FranchiseConfig): number {
  const MLB_TOTAL_INNINGS = 162 * 9;  // 1,458 innings

  const franchiseTotalInnings = config.gamesPerTeam * config.inningsPerGame;

  return franchiseTotalInnings / MLB_TOTAL_INNINGS;
}

// Examples:
// 50 games × 9 innings = 450 innings → 0.309 (30.9% of MLB)
// 50 games × 7 innings = 350 innings → 0.240 (24.0% of MLB)
// 128 games × 9 innings = 1,152 innings → 0.790 (79.0% of MLB)
// 162 games × 9 innings = 1,458 innings → 1.000 (100% of MLB)
```

### 2.3 Component Factors

For some calculations, you may need the individual factors:

```typescript
interface ScalingFactors {
  // Combined opportunity factor (primary scaling multiplier)
  opportunityFactor: number;    // gamesPerTeam × inningsPerGame / (162 × 9)

  // Individual components (for specific use cases)
  gameFactor: number;           // gamesPerTeam / 162
  inningsFactor: number;        // inningsPerGame / 9
}

function calculateScalingFactors(config: FranchiseConfig): ScalingFactors {
  const gameFactor = config.gamesPerTeam / 162;
  const inningsFactor = config.inningsPerGame / 9;

  return {
    opportunityFactor: gameFactor * inningsFactor,
    gameFactor,
    inningsFactor,
  };
}
```

### 2.4 Applying Scaling to Thresholds

```typescript
function getScaledThreshold(
  mlbThreshold: number,
  opportunityFactor: number,
  options: { roundTo?: number } = {}
): number {
  const { roundTo = 5 } = options;  // Round to nearest 5 by default

  const scaled = mlbThreshold * opportunityFactor;

  // Round to clean numbers for memorable thresholds
  return Math.round(scaled / roundTo) * roundTo;
}

// For thresholds that should round to 1 (like games played):
function getScaledThresholdExact(
  mlbThreshold: number,
  opportunityFactor: number
): number {
  return Math.round(mlbThreshold * opportunityFactor);
}
```

### 2.5 Example Scaling Tables

#### 50-Game, 9-Inning Season (Opportunity Factor: 0.309)

| MLB Threshold | Raw Scaled | Rounded | Notes |
|---------------|------------|---------|-------|
| 500 HR (career) | 154.5 | **155 HR** | |
| 3000 Hits (career) | 927 | **925 Hits** | |
| 300 Wins (career) | 92.7 | **95 Wins** | |
| 40 HR (season) | 12.4 | **10 HR** | |
| 200 Hits (season) | 61.8 | **60 Hits** | |
| 200 K (pitcher, season) | 61.8 | **60 K** | |
| 30-30 Club | 9.3-9.3 | **10-10 Club** | |

#### 50-Game, 7-Inning Season (Opportunity Factor: 0.240)

| MLB Threshold | Raw Scaled | Rounded | Notes |
|---------------|------------|---------|-------|
| 500 HR (career) | 120 | **120 HR** | |
| 3000 Hits (career) | 720 | **720 Hits** | |
| 300 Wins (career) | 72 | **70 Wins** | |
| 40 HR (season) | 9.6 | **10 HR** | |
| 200 Hits (season) | 48 | **50 Hits** | |
| 200 K (pitcher, season) | 48 | **50 K** | |
| 30-30 Club | 7.2-7.2 | **10-10 Club** | Minimum floor |

#### 128-Game, 9-Inning Season (Opportunity Factor: 0.790)

| MLB Threshold | Raw Scaled | Rounded | Notes |
|---------------|------------|---------|-------|
| 500 HR (career) | 395 | **395 HR** | |
| 3000 Hits (career) | 2,370 | **2,375 Hits** | |
| 300 Wins (career) | 237 | **235 Wins** | |
| 40 HR (season) | 31.6 | **30 HR** | |
| 200 Hits (season) | 158 | **160 Hits** | |
| 30-30 Club | 23.7-23.7 | **25-25 Club** | |
| 40-40 Club | 31.6-31.6 | **30-30 Club** | |

### 2.6 What Scales vs What Doesn't

| Stat Type | Scales? | Which Factor? | Reason |
|-----------|---------|---------------|--------|
| Counting stats (HR, Hits, RBI) | ✅ Yes | Opportunity | Accumulate over innings played |
| Pitcher counting stats (K, W, IP) | ✅ Yes | Opportunity | Accumulate over innings pitched |
| Rate stats (AVG, ERA, OBP, WHIP) | ❌ No | N/A | Already per-opportunity normalized |
| Per-9 stats (K/9, HR/9) | ❌ No | N/A | Already per-inning normalized |
| Games played thresholds | ✅ Yes | Game only | Based on games, not innings |
| PA/IP qualification minimums | ✅ Yes | Opportunity | Opportunity-based |
| Complete games | ✅ Yes | Game only | One per game regardless of length |
| Innings per start (avg) | ✅ Yes | Innings only | Depends on game length |

### 2.7 Special Considerations

#### Minimum Floors

Some thresholds have minimum floors to remain meaningful:

```typescript
function getScaledThresholdWithFloor(
  mlbThreshold: number,
  opportunityFactor: number,
  minimumFloor: number
): number {
  const scaled = getScaledThreshold(mlbThreshold, opportunityFactor);
  return Math.max(scaled, minimumFloor);
}

// Example: 30-30 club scales to 7-7 at 0.24 factor, but minimum is 10-10
const thirtyThirty = getScaledThresholdWithFloor(30, 0.24, 10);  // Returns 10
```

#### Innings-Only Scaling (Pitching Workload)

Some thresholds only care about innings per game, not total games:

```typescript
// Complete game shutout is still 1 CG regardless of game count
// But a "quality start" threshold adjusts for game length:
function getQualityStartThreshold(inningsPerGame: number): {
  minIP: number;
  maxER: number;
} {
  const inningsFactor = inningsPerGame / 9;

  return {
    minIP: Math.round(6 * inningsFactor * 10) / 10,  // 6 IP → 4.67 IP for 7-inning
    maxER: Math.max(2, Math.round(3 * inningsFactor)),  // 3 ER → 2 ER for 7-inning
  };
}
```

#### Displaying Context to Users

When showing scaled thresholds, provide MLB equivalence:

```typescript
function formatScaledMilestone(
  playerValue: number,
  scaledThreshold: number,
  mlbThreshold: number,
  statName: string
): string {
  const mlbEquivalent = playerValue / opportunityFactor;

  return `${playerValue} ${statName} (≈ ${Math.round(mlbEquivalent)} in MLB 162-game season)`;
}

// Example output:
// "155 HR (≈ 502 in MLB 162-game season)"
```

---

## 3. League Baselines

### 3.1 Data Structure

Calculated after each completed season:

```typescript
interface LeagueSeasonBaselines {
  seasonId: string;
  seasonNumber: number;

  // === SEASON STRUCTURE (from franchise config) ===
  gamesPerTeam: number;       // e.g., 50, 128, 162
  inningsPerGame: number;     // e.g., 7, 9
  opportunityFactor: number;  // (games × innings) / (162 × 9)

  // === BATTING BASELINES ===
  batting: {
    leagueAVG: number;          // e.g., .265
    leagueOBP: number;          // e.g., .330
    leagueSLG: number;          // e.g., .420
    leagueOPS: number;          // e.g., .750
    leagueWOBA: number;         // e.g., .320

    // Rate stats per game
    runsPerGame: number;        // e.g., 4.5 R/G
    hitsPerGame: number;        // e.g., 8.5 H/G
    hrPerGame: number;          // e.g., 1.2 HR/G
    kPerGame: number;           // e.g., 8.5 K/G (batters)
    bbPerGame: number;          // e.g., 3.2 BB/G

    // Per plate appearance rates
    hrPerPA: number;            // e.g., 0.030
    kPerPA: number;             // e.g., 0.220
    bbPerPA: number;            // e.g., 0.085
  };

  // === PITCHING BASELINES ===
  pitching: {
    leagueERA: number;          // e.g., 4.25
    leagueWHIP: number;         // e.g., 1.28
    leagueFIP: number;          // e.g., 4.10

    // Per 9 innings rates
    kPer9: number;              // e.g., 8.8
    bbPer9: number;             // e.g., 3.2
    hrPer9: number;             // e.g., 1.3

    // Quality benchmarks
    avgStarterIP: number;       // e.g., 5.2 IP/start
    avgReleiverIP: number;      // e.g., 1.1 IP/appearance
  };

  // === RUN ENVIRONMENT ===
  runEnvironment: {
    runsPerGame: number;        // Total runs per game (both teams)
    runsPerWin: number;         // How many runs = 1 win (Pythagorean)
    runsScoredStdDev: number;   // Variance in scoring
  };

  // === REPLACEMENT LEVEL ===
  replacementLevel: {
    winPct: number;             // e.g., .294 (48-114 pace)
    battingRunsPerPA: number;   // Runs below average per PA
    pitchingRunsPer9: number;   // Runs above average per 9 IP
    byPosition: Record<Position, number>;  // Position-specific
  };

  // === POSITIONAL CONTEXT ===
  positionalAdjustments: Record<Position, {
    offensiveRunsAboveAvg: number;  // How much offense positions provide
    defensiveValue: number;         // Defensive positional adjustment
    qualifyingGames: number;        // Min games to qualify at position
  }>;
}
```

### 3.2 Calculating Baselines

```typescript
function calculateSeasonBaselines(
  seasonStats: LeagueSeasonStats
): LeagueSeasonBaselines {
  const { teams, players, games } = seasonStats;

  // Aggregate all plate appearances
  const allPA = players.flatMap(p => p.battingStats);
  const totalPA = sum(allPA.map(s => s.pa));
  const totalAB = sum(allPA.map(s => s.ab));
  const totalHits = sum(allPA.map(s => s.hits));
  const totalHR = sum(allPA.map(s => s.hr));
  // ... etc

  // Calculate batting baselines
  const batting = {
    leagueAVG: totalHits / totalAB,
    leagueOBP: (totalHits + totalBB + totalHBP) / totalPA,
    leagueSLG: totalBases / totalAB,
    hrPerGame: totalHR / games.length,
    kPerPA: totalK / totalPA,
    // ... etc
  };

  // Calculate pitching baselines
  const allIP = players.flatMap(p => p.pitchingStats);
  const totalIP = sum(allIP.map(s => s.ip));
  const totalER = sum(allIP.map(s => s.er));

  const pitching = {
    leagueERA: (totalER / totalIP) * 9,
    // ... etc
  };

  // Calculate run environment
  const totalRuns = sum(games.map(g => g.awayScore + g.homeScore));
  const runEnvironment = {
    runsPerGame: totalRuns / games.length,
    runsPerWin: calculateRunsPerWin(seasonStats),
  };

  // Calculate replacement level
  const replacementLevel = calculateReplacementLevel(seasonStats);

  return { batting, pitching, runEnvironment, replacementLevel, /* ... */ };
}
```

---

## 4. Replacement Level Calculation

### 4.1 What Is Replacement Level?

Replacement level represents the performance of a "freely available" player - someone you could sign off the waiver wire or call up from the minors at minimal cost. WAR measures value **above** this baseline.

In MLB, replacement level is approximately:
- **.294 win percentage** (48-114 over 162 games)
- **~20 runs below average per 600 PA** (batting)
- **~5.5 runs above average per 200 IP** (pitching, inverted because fewer runs = better)

### 4.2 Deriving Replacement Level from Franchise Data

After Season 1 completes, calculate replacement level from actual data:

```typescript
function calculateReplacementLevel(
  seasonStats: LeagueSeasonStats
): ReplacementLevelConfig {
  // Method 1: Bottom quintile performance
  // Replacement = average of bottom 20% of qualified players

  const qualifiedBatters = getQualifiedBatters(seasonStats);
  const sortedByWAR = qualifiedBatters.sort((a, b) => a.war - b.war);
  const bottomQuintile = sortedByWAR.slice(0, Math.ceil(sortedByWAR.length * 0.20));

  const replacementBattingRate = average(bottomQuintile.map(p => p.runsPerPA));

  // Method 2: Theoretical freely-available talent
  // Could also use bench players, late-season callups, etc.

  // Method 3: Start with MLB default, adjust based on variance
  const mlbDefault = {
    winPct: 0.294,
    battingRunsPerPA: -0.020,  // 20 runs below avg per 600 PA
    pitchingRunsPer9: 5.5,     // RA9 for replacement pitcher
  };

  // Adjust based on observed league variance
  const leagueVariance = calculatePerformanceVariance(seasonStats);
  const adjustmentFactor = leagueVariance / MLB_VARIANCE;

  return {
    winPct: mlbDefault.winPct,
    battingRunsPerPA: mlbDefault.battingRunsPerPA * adjustmentFactor,
    pitchingRunsPer9: calculateReplacementRA9(seasonStats),
    byPosition: calculatePositionalReplacement(seasonStats),
  };
}
```

### 4.3 Position-Specific Replacement Level

Different positions have different replacement levels:

```typescript
function calculatePositionalReplacement(
  seasonStats: LeagueSeasonStats
): Record<Position, number> {
  // More scarce positions (C, SS) have higher replacement level
  // Abundant positions (1B, LF) have lower replacement level

  const positionScarcity: Record<Position, number> = {
    'C': 1.2,    // Catchers are scarce, replacement is worse
    'SS': 1.1,
    'CF': 1.1,
    '2B': 1.0,
    '3B': 1.0,
    'RF': 0.95,
    'LF': 0.95,
    '1B': 0.90,  // First basemen are abundant, replacement is better
    'DH': 0.85,
  };

  const baseReplacement = calculateBaseReplacement(seasonStats);

  return Object.fromEntries(
    Object.entries(positionScarcity).map(([pos, scarcity]) => [
      pos,
      baseReplacement * scarcity
    ])
  );
}
```

### 4.4 Runs Per Win

Critical for converting runs to wins in WAR:

```typescript
function calculateRunsPerWin(seasonStats: LeagueSeasonStats): number {
  // Pythagorean expectation: Win% = RS^2 / (RS^2 + RA^2)
  // Derivative gives us runs per marginal win

  const { runsScored, runsAllowed, games } = getLeagueTotals(seasonStats);
  const avgRuns = (runsScored + runsAllowed) / (games * 2);

  // Standard formula: RPW ≈ 10 * sqrt(runs per game)
  // Or more precisely: RPW = (RS + RA) / (games * 2) * 10
  return Math.sqrt(avgRuns) * 10;

  // Typical values: 9-10 runs per win
}
```

---

## 5. Adaptive Rate Stat Thresholds

### 5.1 Context-Aware Thresholds

Rate stats (AVG, ERA) don't scale by game count but should adapt to league context:

```typescript
interface AdaptiveRateThresholds {
  // Batting
  eliteBattingAvg: number;      // Top 5% hitters
  goodBattingAvg: number;       // Top 25%
  poorBattingAvg: number;       // Bottom 10%
  mendozaLine: number;          // "Can't hit" threshold

  // Pitching
  eliteERA: number;             // Top 5% starters
  goodERA: number;              // Top 25%
  poorERA: number;              // Bottom 10%
  unplayableERA: number;        // Too bad to roster

  // Other
  eliteWHIP: number;
  eliteOPS: number;
}

function calculateAdaptiveRateThresholds(
  baselines: LeagueSeasonBaselines
): AdaptiveRateThresholds {
  return {
    // Batting average thresholds relative to league average
    eliteBattingAvg: baselines.batting.leagueAVG + 0.070,    // +70 points
    goodBattingAvg: baselines.batting.leagueAVG + 0.030,     // +30 points
    poorBattingAvg: baselines.batting.leagueAVG - 0.040,     // -40 points
    mendozaLine: baselines.batting.leagueAVG - 0.065,        // -65 points

    // ERA thresholds as percentage of league ERA
    eliteERA: baselines.pitching.leagueERA * 0.60,           // 60% of league
    goodERA: baselines.pitching.leagueERA * 0.85,            // 85% of league
    poorERA: baselines.pitching.leagueERA * 1.30,            // 130% of league
    unplayableERA: baselines.pitching.leagueERA * 1.50,      // 150% of league

    // WHIP relative to league
    eliteWHIP: baselines.pitching.leagueWHIP * 0.75,

    // OPS relative to league
    eliteOPS: baselines.batting.leagueOPS + 0.200,
  };
}
```

### 5.2 Example: League Context Changes Thresholds

| Scenario | League ERA | Elite ERA | Poor ERA |
|----------|------------|-----------|----------|
| High-scoring league | 5.00 | 3.00 | 6.50 |
| Pitcher-friendly league | 3.50 | 2.10 | 4.55 |
| MLB average | 4.25 | 2.55 | 5.53 |

| Scenario | League AVG | Elite AVG | Mendoza Line |
|----------|------------|-----------|--------------|
| High-offense league | .280 | .350 | .215 |
| Low-offense league | .245 | .315 | .180 |
| MLB average | .265 | .335 | .200 |

---

## 6. Year-Over-Year Smoothing

### 6.1 Why Smoothing?

Single-season data can be noisy. A weird season shouldn't wildly swing all thresholds. Smoothing provides stability while still adapting to trends.

### 6.2 Weighted Average Algorithm

```typescript
function getSmoothedBaseline<T extends keyof LeagueSeasonBaselines>(
  stat: T,
  history: LeagueSeasonBaselines[]
): number {
  if (history.length === 0) return MLB_DEFAULTS[stat];
  if (history.length === 1) return history[0][stat];

  // Weighted average: recent seasons count more
  // 50% current, 30% last year, 20% two years ago
  const weights = [0.50, 0.30, 0.20];
  const recent = history.slice(-3).reverse();  // Most recent first

  let weighted = 0;
  let totalWeight = 0;

  recent.forEach((season, i) => {
    const weight = weights[i] ?? 0.10;  // Fallback for 4+ years
    weighted += getNestedValue(season, stat) * weight;
    totalWeight += weight;
  });

  return weighted / totalWeight;
}
```

### 6.3 Trend Detection

Optionally detect if the league is trending in a direction:

```typescript
function detectTrend(
  stat: keyof LeagueSeasonBaselines,
  history: LeagueSeasonBaselines[],
  minSeasons: number = 3
): 'increasing' | 'decreasing' | 'stable' {
  if (history.length < minSeasons) return 'stable';

  const recent = history.slice(-minSeasons);
  const values = recent.map(s => getNestedValue(s, stat));

  // Simple linear regression
  const slope = calculateSlope(values);
  const threshold = 0.02;  // 2% change per season = trending

  if (slope > threshold) return 'increasing';
  if (slope < -threshold) return 'decreasing';
  return 'stable';
}
```

---

## 7. First-Season Bootstrapping

### 7.1 The Cold Start Problem

Before Season 1 completes, we have no franchise data. What do we use?

### 7.2 SMB4 Baseline Source

**IMPORTANT**: For first-season bootstrapping, we use **SMB4-derived baselines** rather than MLB defaults. This is because SMB4 has a different run environment than MLB (higher scoring, different HR rates, etc.).

**Source**: The baselines are derived from the Jester's Super Mega Baseball Reference V2 spreadsheet GUTS methodology:
- Located at: `/reference-docs/Jester's Super Mega Baseball Reference V2 clean.xlsx`
- GUTS sheet contains league-wide stat aggregation and derived constants
- Linear weights are calculated from actual run environment

### 7.3 SMB4 Linear Weights Formula (from Jester GUTS)

The GUTS sheet calculates linear weights dynamically from the run environment:

```typescript
// From Jester spreadsheet GUTS methodology
function calculateSMB4LinearWeights(leagueStats: LeagueSeasonStats) {
  // rOut = Runs per Out (base value)
  const rOut = leagueStats.totalRuns / (leagueStats.totalOuts);

  // All other weights derive from rOut with MLB-calibrated increments
  return {
    rOut: rOut,
    rBB: rOut + 0.14,         // Walk value
    rHBP: rOut + 0.14 + 0.025, // HBP slightly more than walk
    r1B: rOut + 0.14 + 0.155,  // Single value
    r2B: rOut + 0.14 + 0.155 + 0.30,  // Double = single + 0.30
    r3B: rOut + 0.14 + 0.155 + 0.30 + 0.27,  // Triple = double + 0.27
    rHR: 1.40,                 // Home run (fixed value)
    rSB: 0.20,                 // Stolen base (fixed)
    rCS: -(2 * rOut + 0.075),  // Caught stealing penalty
  };
}

// wOBA weights = (linear weight + rMinus) × wOBAscale
// Where rMinus = weighted negative run value per out
// And wOBAscale = 1 / (wOBA + rMinus) to normalize to OBP scale
```

### 7.4 SMB4 Default Baselines

Start with SMB4-calibrated defaults based on actual KBL franchise season data:

```typescript
/**
 * SMB4 BASELINE DEFAULTS
 *
 * Calculated from actual SMB4 season data:
 * - Source: KBL franchise 8-team, ~50-game season
 * - Total IP: 2,791.3 | Total PA: 10,994 | Total R: 1,277
 * - Data extracted: January 22, 2026
 * - Raw data: /spec-docs/data/smb4_season_baselines_raw.md
 */
const SMB4_DEFAULTS: LeagueSeasonBaselines = {
  // Season structure (source data was 50-game, 9-inning season)
  gamesPerTeam: 50,
  inningsPerGame: 9,
  opportunityFactor: 0.309,    // (50 × 9) / (162 × 9) = 450/1458

  batting: {
    leagueAVG: 0.288,        // Higher than MLB (~.250)
    leagueOBP: 0.329,
    leagueSLG: 0.448,
    leagueOPS: 0.777,
    leagueWOBA: 0.329,       // Normalized to match OBP

    // Per-game rates (based on 400 team-games)
    runsPerGame: 3.19,       // Per team per game (lower than expected)
    hitsPerGame: 7.40,       // 2,958 H / 400 games
    hrPerGame: 0.85,         // 338 HR / 400 games
    kPerGame: 4.56,          // 1,824 K / 400 games (batters)
    bbPerGame: 1.52,         // 608 BB / 400 games

    // Per-PA rates
    hrPerPA: 0.031,          // 338 / 10,994
    kPerPA: 0.166,           // 1,824 / 10,994 (lower than MLB)
    bbPerPA: 0.055,          // 608 / 10,994
  },

  pitching: {
    leagueERA: 4.04,         // 1,253 ER / 2,791.3 IP × 9
    leagueWHIP: 1.36,        // (3,126 H + 668 BB) / 2,791.3 IP
    leagueFIP: 4.04,         // ≈ ERA when calibrated

    // Per 9 innings
    kPer9: 6.71,             // 2,081 K / 2,791.3 IP × 9
    bbPer9: 2.15,            // 668 BB / 2,791.3 IP × 9
    hrPer9: 1.06,            // 330 HR / 2,791.3 IP × 9

    // Averages (estimated from data)
    avgStarterIP: 5.8,       // Typical SP goes ~6 innings
    avgRelieverIP: 1.3,
  },

  runEnvironment: {
    runsPerGame: 6.38,       // Both teams combined (1,277 × 2 / 400)
    runsScoredStdDev: 2.5,   // Estimated

    // ⚠️ IMPORTANT: Two different "runs per win" concepts exist!
    //
    // 1. RUN ENVIRONMENT RPW (this value): sqrt(3.19) × 10 = 17.87
    //    - Measures marginal runs-to-wins based on Pythagorean expectation
    //    - Used for: win expectancy, run differential analysis
    //    - NOT for WAR calculations!
    //
    // 2. WAR CALCULATION RPW: 10 × (seasonGames / 162)
    //    - Per FWAR_CALCULATION_SPEC.md Section 2
    //    - For 50 games: 10 × (50/162) = 3.09
    //    - For 48 games: 10 × (48/162) = 2.96
    //    - Used for: converting runs to WAR
    //    - Shorter seasons = fewer runs per win (each run has MORE impact)
    //
    // See FWAR_CALCULATION_SPEC.md Section 2 for full explanation.
    runEnvironmentRPW: 17.87,  // DO NOT USE FOR WAR - use 10 × (games/162) instead
  },

  replacementLevel: {
    winPct: 0.294,           // Same concept as MLB
    battingRunsPerPA: -0.020, // Runs below average per PA for replacement
    pitchingRunsPer9: 5.5,   // RA9 for replacement pitcher
    byPosition: {
      'C': -0.024, 'SS': -0.022, 'CF': -0.021,
      '2B': -0.020, '3B': -0.020, 'RF': -0.019,
      'LF': -0.019, '1B': -0.017, 'DH': -0.016,
    },
  },

  // Linear weights (Jester method: rOut = R/Outs)
  linearWeights: {
    rOut: 0.1525,            // 1,277 R / 8,374 Outs
    rBB: 0.2925,             // rOut + 0.14
    rHBP: 0.3175,            // rBB + 0.025
    r1B: 0.4475,             // rOut + 0.14 + 0.155
    r2B: 0.7475,             // r1B + 0.30
    r3B: 1.0175,             // r2B + 0.27
    rHR: 1.4000,             // Fixed value
    rSB: 0.2000,             // Fixed value
    rCS: -0.3800,            // -(2 × rOut + 0.075)
  },

  // wOBA weights (linear weights × wOBAscale)
  wobaWeights: {
    wBB: 0.521,
    wHBP: 0.566,
    w1B: 0.797,
    w2B: 1.332,
    w3B: 1.813,
    wHR: 2.495,
    wOBAscale: 1.7821,       // OBP / raw wOBA
  },

  // FIP constant (derived from league environment)
  // FIP = ((13×HR + 3×BB - 2×K) / IP) + FIPconstant
  fipConstant: 3.28,         // ERA - FIP_core

  // Pitching pace (for Maddux milestone validation)
  pitchingPace: {
    pitchesPerIP: 13.64,     // 38,060 NP / 2,791.3 IP
    pitchesPer9: 122.7,      // 13.64 × 9
    // Note: Maddux threshold of <85 NP per 9 IP is ELITE efficiency
    // League average is ~123 pitches per 9 IP
  },
};

function getBaselines(
  franchiseId: string,
  seasonId?: string
): LeagueSeasonBaselines {
  const history = getBaselineHistory(franchiseId);

  if (history.length === 0) {
    // No franchise data yet - use SMB4 defaults (NOT MLB defaults!)
    // This ensures first-season calculations use game-appropriate baselines
    return SMB4_DEFAULTS;
  }

  if (seasonId) {
    // Get baselines as of specific season
    const upToSeason = history.filter(h => h.seasonNumber <= getSeasonNumber(seasonId));
    return calculateSmoothedBaselines(upToSeason);
  }

  // Get current smoothed baselines
  return calculateSmoothedBaselines(history);
}
```

### 7.5 Adjusting Baselines for Different Innings/Game

When a franchise uses different innings per game than the source data (9 innings), the engine recalculates affected baselines:

```typescript
/**
 * Adjust SMB4 defaults for a franchise with different innings per game.
 *
 * Rate stats (ERA, AVG, K/9) remain unchanged - they're already normalized.
 * Per-game counting rates adjust proportionally.
 * Linear weights recalculate from the new run environment.
 */
function adjustBaselinesForInnings(
  sourceBaselines: LeagueSeasonBaselines,
  targetInningsPerGame: number
): LeagueSeasonBaselines {
  const sourceInnings = sourceBaselines.inningsPerGame;  // 9
  const inningsFactor = targetInningsPerGame / sourceInnings;

  // Calculate new opportunity factor
  const newOpportunityFactor =
    (sourceBaselines.gamesPerTeam * targetInningsPerGame) / (162 * 9);

  return {
    ...sourceBaselines,

    // Update season structure
    inningsPerGame: targetInningsPerGame,
    opportunityFactor: newOpportunityFactor,

    batting: {
      ...sourceBaselines.batting,

      // Per-game rates scale with innings (fewer innings = fewer opportunities)
      runsPerGame: sourceBaselines.batting.runsPerGame * inningsFactor,
      hitsPerGame: sourceBaselines.batting.hitsPerGame * inningsFactor,
      hrPerGame: sourceBaselines.batting.hrPerGame * inningsFactor,
      kPerGame: sourceBaselines.batting.kPerGame * inningsFactor,
      bbPerGame: sourceBaselines.batting.bbPerGame * inningsFactor,

      // Per-PA rates remain unchanged (same opportunity per PA)
      // hrPerPA, kPerPA, bbPerPA stay the same
    },

    pitching: {
      ...sourceBaselines.pitching,

      // Per-9 rates remain unchanged (already normalized)
      // ERA, WHIP, K/9, BB/9, HR/9 stay the same

      // But average IP per start scales
      avgStarterIP: Math.min(
        sourceBaselines.pitching.avgStarterIP * inningsFactor,
        targetInningsPerGame  // Can't exceed game length
      ),
    },

    runEnvironment: {
      // Fewer innings = fewer runs per game
      runsPerGame: sourceBaselines.runEnvironment.runsPerGame * inningsFactor,

      // Runs per win recalculates from new environment
      // RPW = sqrt(runsPerTeamPerGame) × 10
      runsPerWin: Math.sqrt(
        sourceBaselines.batting.runsPerGame * inningsFactor
      ) * 10,

      runsScoredStdDev: sourceBaselines.runEnvironment.runsScoredStdDev * inningsFactor,
    },

    // Linear weights RECALCULATE from new run environment
    linearWeights: recalculateLinearWeights(
      sourceBaselines.batting.runsPerGame * inningsFactor,
      estimateOutsPerGame(sourceBaselines, inningsFactor)
    ),
  };
}

/**
 * Example: Adjusting 9-inning baselines for 7-inning games
 *
 * Source (9 inn): R/G = 3.19, RPW = 17.87, rOut = 0.1525
 * Target (7 inn): R/G = 2.48, RPW = 15.75, rOut = 0.1185
 *
 * This means in 7-inning games:
 * - Each run is worth MORE (fewer runs scored overall)
 * - An out costs LESS in run value
 * - wOBA weights shift accordingly
 */
```

#### Impact on Milestones for 7-Inning Games

| Milestone | 9-Inning Value | 7-Inning Value | Notes |
|-----------|----------------|----------------|-------|
| Quality Start IP | 6.0 IP | 4.67 IP | Scaled proportionally |
| Quality Start max ER | 3 ER | 2 ER | Rounded down |
| Maddux (NP/CG) | <85 NP | <66 NP | Proportional to game length |
| Complete game | 9.0 IP | 7.0 IP | Full game |
| Shutout | 9.0 IP, 0 ER | 7.0 IP, 0 ER | Full game |

### 7.6 Mid-Season Estimates

During Season 1, we can provide rough estimates based on partial data:

```typescript
function getMidSeasonEstimate(
  currentSeasonStats: PartialSeasonStats
): LeagueSeasonBaselines {
  const gamesPlayed = currentSeasonStats.gamesCompleted;
  const totalGames = currentSeasonStats.gamesScheduled;

  if (gamesPlayed < 20) {
    // Too little data - use SMB4 defaults
    return SMB4_DEFAULTS;
  }

  // Blend current data with SMB4 defaults based on sample size
  const confidence = Math.min(gamesPlayed / 60, 1.0);  // Full confidence at 60 games

  const currentBaselines = calculateSeasonBaselines(currentSeasonStats);

  return blendBaselines(SMB4_DEFAULTS, currentBaselines, confidence);
}

function blendBaselines(
  defaults: LeagueSeasonBaselines,
  current: LeagueSeasonBaselines,
  confidence: number
): LeagueSeasonBaselines {
  // Linear interpolation between SMB4 defaults and current franchise data
  // confidence = 0: all defaults (SMB4)
  // confidence = 1: all current franchise data

  return {
    batting: {
      leagueAVG: lerp(defaults.batting.leagueAVG, current.batting.leagueAVG, confidence),
      // ... etc
    },
    // ... etc
  };
}
```

### 7.6 Future: User-Provided Season Data

If the user has historical SMB4 season data (e.g., from a previous franchise tracker or manual logging), that data can be imported to bootstrap more accurate baselines:

```typescript
interface ImportedSeasonTotals {
  // Aggregate stats across all teams for one season
  gamesPlayed: number;
  teamsCount: number;

  // Batting totals
  totalAB: number;
  totalHits: number;
  totalHR: number;
  totalRBI: number;
  totalRuns: number;
  totalBB: number;
  totalSO: number;
  totalSB: number;
  totalCS: number;
  totalHBP: number;

  // Pitching totals
  totalIP: number;
  totalER: number;
  totalHA: number;   // Hits allowed
  totalBBa: number;  // Walks allowed
  totalKa: number;   // Strikeouts (pitcher)
  totalHRa: number;  // HR allowed
}

function calculateBaselinesFromImport(
  imported: ImportedSeasonTotals
): LeagueSeasonBaselines {
  const gamesPerTeam = imported.gamesPlayed / imported.teamsCount;
  const totalPA = imported.totalAB + imported.totalBB + imported.totalHBP;

  return {
    batting: {
      leagueAVG: imported.totalHits / imported.totalAB,
      leagueOBP: (imported.totalHits + imported.totalBB + imported.totalHBP) / totalPA,
      // ... calculate all batting baselines
    },
    pitching: {
      leagueERA: (imported.totalER / imported.totalIP) * 9,
      // ... calculate all pitching baselines
    },
    runEnvironment: {
      runsPerGame: (imported.totalRuns * 2) / imported.gamesPlayed,  // Both teams
      runsPerWin: Math.sqrt((imported.totalRuns * 2) / imported.gamesPlayed) * 10,
    },
    // ... etc
  };
}
```

---

## 8. API Reference

### 8.1 Core Interface

```typescript
interface AdaptiveStandardsEngine {
  // === INITIALIZATION ===

  // Load baseline history for a franchise
  initialize(franchiseId: string): Promise<void>;

  // === BASELINE ACCESS ===

  // Get current smoothed baselines
  getBaselines(): LeagueSeasonBaselines;

  // Get baselines as of a specific season
  getBaselinesAsOf(seasonNumber: number): LeagueSeasonBaselines;

  // Get raw (unsmoothed) baselines for a specific season
  getRawBaselines(seasonNumber: number): LeagueSeasonBaselines | null;

  // === SCALING FACTORS ===

  // Get the opportunity factor (combined games × innings scaling)
  getOpportunityFactor(): number;

  // Get individual scaling components
  getScalingFactors(): ScalingFactors;

  // === THRESHOLD CALCULATION ===

  // Get scaled counting stat threshold using opportunity factor
  getScaledThreshold(mlbThreshold: number, options?: { roundTo?: number }): number;

  // Get scaled threshold with minimum floor
  getScaledThresholdWithFloor(mlbThreshold: number, floor: number): number;

  // Get adaptive rate stat thresholds
  getAdaptiveRateThresholds(): AdaptiveRateThresholds;

  // Get qualification minimums (PA, IP, games)
  getQualificationThresholds(): QualificationThresholds;

  // Get innings-adjusted milestone thresholds
  getInningsAdjustedThresholds(): {
    qualityStart: { minIP: number; maxER: number };
    maddux: { maxPitches: number };
    completeGame: { innings: number };
  };

  // === REPLACEMENT LEVEL ===

  // Get replacement level config for WAR
  getReplacementLevel(): ReplacementLevelConfig;

  // Get position-specific replacement level
  getPositionalReplacement(position: Position): number;

  // Get runs per win for WAR conversion
  getRunsPerWin(): number;

  // === SEASON MANAGEMENT ===

  // Calculate and store baselines for completed season
  processCompletedSeason(seasonStats: LeagueSeasonStats): Promise<void>;

  // Get mid-season estimates (for in-progress season)
  getMidSeasonEstimates(partialStats: PartialSeasonStats): LeagueSeasonBaselines;

  // === HISTORY ===

  // Get all historical baselines
  getBaselineHistory(): LeagueSeasonBaselines[];

  // Detect trends in specific stats
  detectTrend(stat: keyof LeagueSeasonBaselines): 'increasing' | 'decreasing' | 'stable';
}
```

### 8.2 Usage Examples

```typescript
// Initialize for a franchise (50 games, 7 innings)
const engine = new AdaptiveStandardsEngine();
await engine.initialize('franchise_123');

// Get scaling factors
const factors = engine.getScalingFactors();
console.log(factors.opportunityFactor);  // 0.240 for 50g × 7inn
console.log(factors.gameFactor);          // 0.309 for 50/162
console.log(factors.inningsFactor);       // 0.778 for 7/9

// Get scaled milestone threshold (uses opportunity factor)
const hr500Scaled = engine.getScaledThreshold(500);  // Returns 120 for 50g × 7inn

// Get innings-adjusted pitching thresholds
const pitchingThresholds = engine.getInningsAdjustedThresholds();
console.log(pitchingThresholds.qualityStart);  // { minIP: 4.67, maxER: 2 }
console.log(pitchingThresholds.maddux);        // { maxPitches: 66 }
console.log(pitchingThresholds.completeGame);  // { innings: 7 }

// Get WAR replacement level
const replacement = engine.getReplacementLevel();
const playerWAR = (playerRuns - replacement.battingRunsPerPA * playerPA) / engine.getRunsPerWin();

// Get context-aware ERA threshold
const thresholds = engine.getAdaptiveRateThresholds();
if (pitcher.era < thresholds.eliteERA) {
  // This pitcher is elite for this league
}

// Display MLB equivalence
const playerHR = 45;
const mlbEquivalent = playerHR / factors.opportunityFactor;
console.log(`${playerHR} HR (≈ ${Math.round(mlbEquivalent)} in MLB 162-game season)`);
// Output: "45 HR (≈ 188 in MLB 162-game season)"

// After season ends
await engine.processCompletedSeason(season1Stats);
// Now baselines reflect actual franchise data (auto-recalculates linear weights, etc.)
```

---

## 9. Storage Schema

### 9.1 IndexedDB Structure

```typescript
// Store: 'leagueBaselines'
interface LeagueBaselinesStore {
  id: string;              // `${franchiseId}_${seasonNumber}`
  franchiseId: string;     // Index
  seasonNumber: number;    // Index
  seasonId: string;
  calculatedAt: number;    // Timestamp
  baselines: LeagueSeasonBaselines;
}

// Store: 'adaptiveConfig'
interface AdaptiveConfigStore {
  franchiseId: string;     // Primary key
  scalingFactor: number;
  lastUpdated: number;
  customOverrides?: Partial<LeagueSeasonBaselines>;
}
```

### 9.2 Storage Estimates

| Data | Size |
|------|------|
| Single season baselines | ~2 KB |
| 10 seasons of history | ~20 KB |
| Total per franchise | ~25 KB |

---

## 10. Implementation Phases

### Phase 1: Static SMB4 Baselines (MVP) ✅
- [x] SMB4 baseline data collection (8-team, ~50-game season)
- [x] Scaling factor calculation (Opportunity Factor)
- [x] Clean number rounding (to 5s)
- [x] SMB4_DEFAULTS constant with all baseline values
- [x] Linear weights (Jester method)
- [x] wOBA weights
- [x] FIP constant (3.28)
- [x] Runs per win (17.87)
- [ ] Integration with Milestone thresholds
- [ ] Integration with qualification minimums

**MVP Decision (2026-01-23)**: Using static SMB4 baselines is sufficient for MVP. The SMB4 run environment (AVG .288, ERA 4.04) is close enough to MLB that static defaults provide accurate calculations without the complexity of dynamic learning.

### Phase 2: Baseline Calculation (Post-MVP)
- [ ] Post-season baseline calculation from actual franchise data
- [ ] Storage in IndexedDB
- [ ] History retrieval
- [ ] Blending current season with SMB4 defaults

### Phase 3: Replacement Level for WAR (Post-MVP)
- [ ] Calculate replacement level from bottom-quintile players
- [ ] Position-specific replacement calibration
- [ ] Dynamic runs per win based on franchise run environment
- [ ] Integration with WAR specs

### Phase 4: Adaptive Rate Thresholds (Post-MVP)
- [ ] Context-aware ERA/AVG thresholds from franchise data
- [ ] Year-over-year smoothing algorithm
- [ ] Trend detection (increasing/decreasing/stable)

### Phase 5: Full Adaptive Engine (Post-MVP)
- [ ] Mid-season estimates blending partial data with defaults
- [ ] UI for displaying "league context" comparisons
- [ ] Complete API for all consuming systems
- [ ] Historical recalculation when baselines update

---

## 11. Open Questions

1. **Smoothing window**: Should we weight last 3 seasons, or allow configuration?

2. **Outlier handling**: If a season is wildly different (strike year, expansion), should we exclude it from smoothing?

3. **Cross-franchise comparison**: If user has multiple franchises, should they share baseline data? (Probably not - each franchise is independent)

4. **Display to user**: How much of this should be visible vs behind-the-scenes? ("Your 400 HR is equivalent to MLB's 505 HR")

5. **Historical WAR recalculation**: When baselines update, do we recalculate historical WAR? (Probably yes, for consistency)

---

## 12. References

### Internal Documents

| Document | Relevance |
|----------|-----------|
| MILESTONE_SYSTEM_SPEC.md | Primary consumer for thresholds |
| BWAR_CALCULATION_SPEC.md | Uses replacement level, runs per win |
| PWAR_CALCULATION_SPEC.md | Uses replacement level for pitchers |
| GAME_SIMULATION_SPEC.md | Uses baselines for outcome distributions |
| EOS_RATINGS_ADJUSTMENT_SPEC.md | Uses context for rating changes |
| SMB4_GAME_REFERENCE.md | SMB4 game mechanics reference |

### SMB4 Baseline Source

| File | Purpose |
|------|---------|
| `/reference-docs/Jester's Super Mega Baseball Reference V2 clean.xlsx` | **Primary SMB4 baseline source** |

The Jester spreadsheet GUTS sheet contains:
- Linear weights calculation methodology
- wOBA weight derivation formulas
- FIP constant calculation
- League baseline aggregation

**Key GUTS columns for baseline calculation:**
- Cols 54-64: Linear weights (rOut, rBB, rHBP, r1B, r2B, r3B, rHR, rSB, rCS)
- Cols 65-72: wOBA and wOBA weights (wOBA, wOBAscale, wBB, wHBP, w1B, w2B, w3B, wHR)
- Col 75: FIP constant (FIPC)
- Col 85: Runs per win (RPW)

### External References

- [FanGraphs WAR Primer](https://library.fangraphs.com/misc/war/) - Replacement level methodology
- [FanGraphs GUTS](https://library.fangraphs.com/misc/war/guts/) - Linear weights explanation
- [Baseball-Reference WAR Explained](https://www.baseball-reference.com/about/war_explained.shtml) - Runs per win
- [Pythagorean Expectation](https://en.wikipedia.org/wiki/Pythagorean_expectation) - Win% from runs

---

## 13. Changelog

| Date | Changes |
|------|---------|
| 2026-01-22 | Initial spec created with game-count scaling, baseline calculation |
| 2026-01-22 | Added SMB4-specific baseline defaults (replacing MLB defaults) |
| 2026-01-22 | Added Jester spreadsheet GUTS methodology reference |
| 2026-01-22 | Added imported season data bootstrap capability |
| 2026-01-22 | **Updated SMB4_DEFAULTS with actual calculated values from 8-team season** |
| 2026-01-22 | Added linearWeights and pitchingPace to baselines |
| 2026-01-22 | Validated Maddux milestone threshold (<85 NP/9 vs 122.7 league avg) |
| 2026-01-22 | **Added innings-per-game scaling (Opportunity Factor)** |
| 2026-01-22 | Refactored Section 2 to comprehensive opportunity-based scaling |
| 2026-01-22 | Added `inningsPerGame` and `opportunityFactor` to LeagueSeasonBaselines |
| 2026-01-22 | Added Section 7.5: Adjusting baselines for different innings/game |
| 2026-01-22 | Added 7-inning game milestone adjustments (Quality Start, Maddux) |
| 2026-01-23 | **MVP DECISION**: Static Fallbacks approach approved; full adaptive engine deferred to post-MVP |
| 2026-01-23 | Status changed from PLANNING to IMPLEMENTED (Static v1) |
| 2026-01-23 | Updated Implementation Phases to reflect MVP scope |

---

*Last Updated: January 23, 2026*
*Status: IMPLEMENTED (Static v1)*
