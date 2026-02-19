# rWAR Calculation Specification

> **Purpose**: Complete specification for calculating baserunning Wins Above Replacement (rWAR)
> **Created**: January 21, 2026
> **Based On**: FanGraphs BsR methodology (wSB, UBR, wGDP) adapted for SMB4
> **Integration**: Works with EOS Salary Percentile system (Master Spec Section 10)
>
> **Related Specs**:
> - `BWAR_CALCULATION_SPEC.md` - Batting WAR calculations
> - `FWAR_CALCULATION_SPEC.md` - Fielding WAR calculations
> - `PWAR_CALCULATION_SPEC.md` - Pitching WAR calculations (TBD)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Season Length Scaling](#2-season-length-scaling)
3. [Component Breakdown: BsR](#3-component-breakdown-bsr)
4. [wSB: Stolen Base Runs](#4-wsb-stolen-base-runs)
5. [UBR: Extra Base Taking](#5-ubr-extra-base-taking)
6. [wGDP: Double Play Avoidance](#6-wgdp-double-play-avoidance)
7. [Complete rWAR Formula](#7-complete-rwar-formula)
8. [SMB4-Specific Considerations](#8-smb4-specific-considerations)
9. [Tracking Requirements](#9-tracking-requirements)
10. [Implementation Examples](#10-implementation-examples)
11. [Quick Reference Tables](#11-quick-reference-tables)

---

## 1. Overview

### What rWAR Measures

rWAR (baserunning Wins Above Replacement) measures how many wins a player's baserunning adds to their team compared to an average baserunner. This includes:

- **Stolen bases and caught stealings**
- **Taking extra bases** on hits (1st to 3rd on single, scoring from 2nd on single, etc.)
- **Avoiding double plays** (speed out of the box, not hitting into GIDP)
- **Outs on the bases** (thrown out advancing, picked off, etc.)

### FanGraphs BsR Components

FanGraphs combines three components into **BsR (Base Running Runs)**:

```
BsR = wSB + UBR + wGDP
```

| Component | What It Measures | Typical Range |
|-----------|------------------|---------------|
| **wSB** | Stolen base value | -3 to +6 runs |
| **UBR** | Extra base taking | -5 to +8 runs |
| **wGDP** | DP avoidance | -2.5 to +2.5 runs |

### Converting BsR to rWAR

```
rWAR = BsR / Runs Per Win
```

### MLB Sources

- [FanGraphs BsR](https://library.fangraphs.com/offense/bsr/)
- [FanGraphs wSB](https://library.fangraphs.com/offense/wsb/)
- [FanGraphs UBR](https://library.fangraphs.com/offense/ubr/)
- [FanGraphs wGDP](https://library.fangraphs.com/offense/wgdp/)

---

## 2. Season Length Scaling

> **See FWAR_CALCULATION_SPEC.md Section 2 for full explanation.**

### Runs Per Win by Season Length

| Season Length | Games | Runs Per Win |
|---------------|-------|--------------|
| Full MLB | 162 | 10.00 |
| Long SMB4 | 48 | 2.96 |
| Standard SMB4 | 32 | 1.98 |
| Short SMB4 | 20 | 1.23 |
| Mini SMB4 | 16 | 0.99 |

```javascript
function getRunsPerWin(seasonGames) {
  return 10 * (seasonGames / 162);
}
```

### Baserunning Opportunity Scaling

Baserunning opportunities scale roughly with plate appearances:
- MLB: ~700 PA per season → ~150-200 baserunning opportunities
- 48-game SMB4: ~200 PA per season → ~45-60 baserunning opportunities

**Impact**: Individual plays have proportionally more impact in shorter seasons.

---

## 3. Component Breakdown: BsR

### The Three Pillars

```javascript
function calculateBsR(playerStats) {
  const wSB = calculateWSB(playerStats);   // Stolen base runs
  const UBR = calculateUBR(playerStats);   // Extra base taking runs
  const wGDP = calculateWGDP(playerStats); // DP avoidance runs

  return wSB + UBR + wGDP;
}

function calculateRWAR(playerStats, seasonGames) {
  const bsR = calculateBsR(playerStats);
  const runsPerWin = getRunsPerWin(seasonGames);
  return bsR / runsPerWin;
}
```

### Relative Importance

| Component | % of Total BsR | Notes |
|-----------|----------------|-------|
| wSB | ~35% | Most volatile, player-controlled |
| UBR | ~50% | Largest component, game awareness |
| wGDP | ~15% | Smallest, somewhat speed-dependent |

---

## 4. wSB: Stolen Base Runs

### What wSB Measures

wSB (Weighted Stolen Base Runs) measures the run value a player contributes through stolen base attempts compared to league average.

### The Break-Even Problem

Stolen bases are valuable, but getting caught is MORE costly:

| Event | Run Value | Notes |
|-------|-----------|-------|
| Successful SB | +0.20 runs | Advances into scoring position |
| Caught Stealing | -0.45 runs | Lose runner AND add an out |

**Break-even rate**: ~69% success rate (2 SB for every CS)

### wSB Formula

```
wSB = (SB × runSB) + (CS × runCS) - (lgwSB × opportunities)
```

Where:
- `runSB` = +0.20 (run value of stolen base)
- `runCS` = -0.45 (run value of caught stealing, varies by year)
- `lgwSB` = league average wSB per opportunity
- `opportunities` = 1B + BB + HBP - IBB (times on first base)

### Implementation

```javascript
const STOLEN_BASE_VALUES = {
  SB: 0.20,      // Run value of successful steal
  CS: -0.45,     // Run value of caught stealing (baseline)

  // CS penalty adjusts with run environment
  // Higher scoring = outs less costly = CS less bad
  getCSValue: function(runsPerGame) {
    const baseRunsPerOut = runsPerGame / 27;  // ~0.17 for 4.5 R/G
    return -2 * baseRunsPerOut - 0.075;       // FanGraphs formula
  }
};

function calculateWSB(stats, leagueStats) {
  const runSB = STOLEN_BASE_VALUES.SB;
  const runCS = STOLEN_BASE_VALUES.getCSValue(leagueStats.runsPerGame);

  // Player's raw SB runs
  const playerSBRuns = (stats.SB * runSB) + (stats.CS * runCS);

  // League average rate
  const lgSBRuns = (leagueStats.totalSB * runSB) + (leagueStats.totalCS * runCS);
  const lgOpportunities = leagueStats.total1B + leagueStats.totalBB + leagueStats.totalHBP - leagueStats.totalIBB;
  const lgwSBRate = lgSBRuns / lgOpportunities;

  // Player's opportunities
  const playerOpportunities = stats.singles + stats.BB + stats.HBP - stats.IBB;

  // Expected vs actual
  const expectedSBRuns = lgwSBRate * playerOpportunities;
  const wSB = playerSBRuns - expectedSBRuns;

  return wSB;
}
```

### wSB Interpretation

| wSB | Rating | Description |
|-----|--------|-------------|
| +5.0+ | Elite | Base stealing weapon |
| +2.5 | Great | Major asset on bases |
| +1.0 | Above Avg | Positive contributor |
| 0.0 | Average | League average |
| -1.0 | Below Avg | Slightly hurting team |
| -2.5 | Poor | Should stop running |

> **Note**: These are full MLB season values. Scale by ~30% for 48-game SMB4 season.

---

## 5. UBR: Extra Base Taking

### What UBR Measures

UBR (Ultimate Base Running) measures the value a player adds through baserunning on **non-stolen base plays**:

- Taking extra bases on hits (1st→3rd on single, scoring from 2nd on single)
- Advancing on fly balls (tagging up)
- Advancing on wild pitches, passed balls
- Being thrown out trying to advance

### UBR Events and Run Values

| Situation | Good Outcome | Run Value | Bad Outcome | Run Value |
|-----------|--------------|-----------|-------------|-----------|
| Runner on 1B, single | Advances to 3B | +0.40 | Stays at 2B | 0 |
| Runner on 2B, single | Scores | +0.55 | Held at 3B | 0 |
| Runner on 3B, fly out | Tags and scores | +0.45 | Stays at 3B | 0 |
| Runner on 1B, fly out | Tags to 2B | +0.25 | Stays at 1B | 0 |
| Any situation | Thrown out | -0.60 to -0.80 | - | - |

### UBR Formula (Simplified)

```
UBR = Σ(actual advancement runs) - Σ(expected advancement runs)
```

### Implementation

```javascript
const ADVANCEMENT_VALUES = {
  // Extra base taken (beyond minimum required)
  firstToThird_onSingle: 0.40,
  firstToHome_onDouble: 0.45,
  secondToHome_onSingle: 0.55,
  secondToHome_onFlyOut: 0.45,
  thirdToHome_onFlyOut: 0.45,
  firstToSecond_onFlyOut: 0.25,

  // Being thrown out (run value of losing runner + out)
  thrownOut_advancing: -0.65,
  thrownOut_overrunning: -0.70,
  thrownOut_tagUp: -0.60,

  // Pickoffs
  pickedOff_first: -0.45,
  pickedOff_second: -0.55,
  pickedOff_third: -0.70
};

function calculateUBR(stats, leagueStats) {
  let ubr = 0;

  // Credit for extra bases taken
  ubr += stats.firstToThird * ADVANCEMENT_VALUES.firstToThird_onSingle;
  ubr += stats.firstToHome_onDouble * ADVANCEMENT_VALUES.firstToHome_onDouble;
  ubr += stats.secondToHome_onSingle * ADVANCEMENT_VALUES.secondToHome_onSingle;
  ubr += stats.tagsScored * ADVANCEMENT_VALUES.thirdToHome_onFlyOut;

  // Penalty for outs on bases
  ubr += stats.thrownOutAdvancing * ADVANCEMENT_VALUES.thrownOut_advancing;
  ubr += stats.pickedOff * getPickoffPenalty(stats.pickoffBase);

  // Subtract league average advancement rate (simplified)
  const lgAdvancementRate = leagueStats.totalExtraBases / leagueStats.totalOpportunities;
  const expectedExtraBases = stats.advancementOpportunities * lgAdvancementRate;
  const avgValuePerExtraBase = 0.40;  // Weighted average
  ubr -= expectedExtraBases * avgValuePerExtraBase;

  return ubr;
}
```

### UBR Interpretation

| UBR | Rating | Description |
|-----|--------|-------------|
| +6.0+ | Elite | Premium baserunner |
| +3.0 | Great | Very aggressive, smart |
| +1.0 | Above Avg | Takes extra bases well |
| 0.0 | Average | League average |
| -2.0 | Below Avg | Conservative or slow |
| -5.0 | Poor | Liability on bases |

---

## 6. wGDP: Double Play Avoidance

### What wGDP Measures

wGDP (Weighted Grounded into Double Play Runs) measures how many runs a player saves by avoiding double plays compared to league average.

### The Math

**GIDP Opportunity** = Ground ball with runner on first, less than 2 outs

**GIDP Run Cost** ≈ -0.44 runs (lose one out AND lose a baserunner)

### wGDP Formula

```
wGDP = 0.44 × (GIDP_opportunities × lgGIDP_rate - actual_GIDP)
```

### Implementation

```javascript
const GIDP_VALUES = {
  runCost: -0.44,  // Run cost of hitting into DP vs. avoiding it
};

function calculateWGDP(stats, leagueStats) {
  // League GIDP rate
  const lgGIDPRate = leagueStats.totalGIDP / leagueStats.totalGIDPOpportunities;

  // Expected GIDP based on opportunities
  const expectedGIDP = stats.GIDPOpportunities * lgGIDPRate;

  // Runs saved by avoiding (or lost by hitting into) DP
  const wGDP = (expectedGIDP - stats.GIDP) * Math.abs(GIDP_VALUES.runCost);

  return wGDP;
}

// Example:
// Player had 50 GIDP opportunities, hit into 5 GIDP
// League rate: 12% (would expect 6 GIDP)
// wGDP = (6 - 5) × 0.44 = +0.44 runs (saved 1 DP)
```

### wGDP Interpretation

| wGDP | Rating | Description |
|------|--------|-------------|
| +2.0+ | Elite | Almost never hits into DP |
| +1.0 | Good | Avoids DP well (speed or launch angle) |
| 0.0 | Average | League average |
| -1.0 | Below Avg | Hits into more than expected |
| -2.0+ | Poor | DP machine |

### Factors Affecting GIDP Rate

- **Speed**: Fast runners beat out more DPs
- **Launch angle**: Fly ball hitters have fewer GIDP opportunities
- **Pull tendency**: Pull hitters hit more grounders to SS/3B

---

## 7. Complete rWAR Formula

### The Full Equation

```
rWAR = (wSB + UBR + wGDP) / Runs Per Win
```

Or expanded:

```
rWAR = BsR / Runs Per Win
```

### Implementation

```javascript
function calculateRWAR(stats, leagueStats, seasonConfig) {
  // Step 1: Calculate wSB (stolen base runs)
  const wSB = calculateWSB(stats, leagueStats);

  // Step 2: Calculate UBR (extra base taking runs)
  const UBR = calculateUBR(stats, leagueStats);

  // Step 3: Calculate wGDP (DP avoidance runs)
  const wGDP = calculateWGDP(stats, leagueStats);

  // Step 4: Combine into BsR
  const BsR = wSB + UBR + wGDP;

  // Step 5: Convert to WAR
  const runsPerWin = getRunsPerWin(seasonConfig.seasonGames);
  const rWAR = BsR / runsPerWin;

  return {
    wSB,
    UBR,
    wGDP,
    BsR,
    runsPerWin,
    rWAR
  };
}
```

### Example Calculation (48-game season)

```javascript
const speedyPlayer = {
  // Stolen bases
  SB: 15,
  CS: 3,
  singles: 30,
  BB: 12,
  HBP: 2,
  IBB: 1,

  // Advancement
  firstToThird: 8,        // Took 3rd on single
  secondToHome_onSingle: 5,
  tagsScored: 3,
  thrownOutAdvancing: 1,
  advancementOpportunities: 25,

  // Double plays
  GIDP: 2,
  GIDPOpportunities: 20
};

const leagueStats = {
  runsPerGame: 4.8,
  totalSB: 200,
  totalCS: 60,
  total1B: 1500,
  totalBB: 600,
  totalHBP: 80,
  totalIBB: 30,
  totalGIDP: 150,
  totalGIDPOpportunities: 1200,
  totalExtraBases: 300,
  totalOpportunities: 1000
};

// wSB: (15 × 0.20) + (3 × -0.45) - (lgRate × opportunities)
// = 3.0 - 1.35 - (expected ~0.7) = +0.95 runs

// UBR: (8 × 0.40) + (5 × 0.55) + (3 × 0.45) - (1 × -0.65) - expected
// = 3.2 + 2.75 + 1.35 - 0.65 - expected ~2.5 = +4.15 runs

// wGDP: (20 × 0.125 - 2) × 0.44 = (2.5 - 2) × 0.44 = +0.22 runs

// BsR = 0.95 + 4.15 + 0.22 = +5.32 runs
// rWAR = 5.32 / 2.96 = +1.80 rWAR

// This is an elite baserunning season!
```

---

## 8. SMB4-Specific Considerations

### Events We Track

| Event | Tracked? | Notes |
|-------|----------|-------|
| Stolen bases | ✅ Yes | Manual entry |
| Caught stealing | ✅ Yes | Manual entry |
| Picked off | ✅ Yes | Extra event |
| Wild pitch advance | ✅ Yes | Extra event |
| Passed ball advance | ✅ Yes | Extra event |
| Tag up scoring | ✅ Yes | Runner advancement on SF |
| Thrown out advancing | ✅ Yes | Runner advancement selection |
| GIDP | ✅ Yes | DP result tracking |
| First to third on single | ⚠️ Partial | Need to infer from runner positions |

### Events That Need Enhanced Tracking

To fully calculate UBR, we need to track:

1. **Advancement opportunities**: When a runner COULD have taken an extra base
2. **Holds**: When a runner stayed at a base they could have advanced from
3. **Extra bases taken**: Explicitly tracking 1st→3rd, 2nd→Home on singles

### Recommended Schema Additions

```typescript
interface RunnerAdvancement {
  runnerId: string;
  startBase: '1B' | '2B' | '3B';
  endBase: '2B' | '3B' | 'HOME' | 'OUT';

  // For UBR calculation
  advancementType: 'forced' | 'extra' | 'held' | 'out';
  couldHaveAdvanced: boolean;  // Did they have the opportunity?
  wasThrown: boolean;          // Thrown out trying?

  // Context
  onPlay: 'single' | 'double' | 'flyout' | 'groundout' | 'wp' | 'pb';  // Note: BALK removed - not in SMB4
}
```

### What We Can Calculate Now vs. Later

| Component | Can Calculate Now? | Notes |
|-----------|-------------------|-------|
| wSB | ✅ Yes | SB and CS are tracked |
| wGDP | ✅ Yes | GIDP is tracked |
| UBR (basic) | ⚠️ Partial | Need runner opportunity tracking |
| UBR (full) | ❌ Later | Requires play-by-play context |

### Simplified rWAR (Phase 1)

Until we have full UBR tracking, use a speed-based estimate:

```javascript
function estimateUBR(player, stats) {
  // Use Speed rating as proxy for baserunning ability
  // Elite speed (90+) → +3 runs
  // Average speed (50) → 0 runs
  // Slow (30) → -2 runs

  const speedRating = player.ratings.speed;
  const baseUBR = (speedRating - 50) / 20;  // -1 to +2 range

  // Scale by playing time
  const playingTimeFactor = stats.PA / 200;  // Full season = 200 PA
  return baseUBR * playingTimeFactor;
}
```

---

## 9. Tracking Requirements

### Minimum Required Data

| Stat | Source | Notes |
|------|--------|-------|
| SB | Extra events | Steal attempts |
| CS | Extra events | Failed steal attempts |
| GIDP | At-bat result | DP with runner on 1st |
| PA | At-bats | For opportunity calculation |
| 1B, BB, HBP, IBB | At-bats | For SB opportunities |

### Enhanced Tracking (For Full UBR)

| Stat | How to Track | Notes |
|------|--------------|-------|
| Extra bases taken | Runner advancement screen | 1st→3rd, 2nd→Home |
| Held runners | Runner advancement screen | Could advance, didn't |
| Thrown out advancing | Runner advancement screen | Out at next base |
| Tag up attempts | SF/FO runner screen | Tag and advance |

### League-Level Data Collection

```javascript
const leagueSeasonStats = {
  // For wSB
  totalSB: 0,
  totalCS: 0,
  totalSBOpportunities: 0,  // 1B + BB + HBP - IBB

  // For UBR
  totalExtraBasesTaken: 0,
  totalAdvancementOpportunities: 0,
  totalThrownOut: 0,

  // For wGDP
  totalGIDP: 0,
  totalGIDPOpportunities: 0,

  // Environment
  runsPerGame: 0,
  gamesPlayed: 0
};
```

---

## 10. Implementation Examples

### Example 1: Speed Demon (48-game season)

```javascript
const speedDemon = {
  name: 'Rickey Henderson',
  speed: 95,  // Elite speed rating

  SB: 25, CS: 4,           // 86% success rate
  GIDP: 1, GIDPOpportunities: 15,
  singles: 35, BB: 20, HBP: 3, IBB: 2,

  // UBR tracking
  firstToThird: 12,
  secondToHome_onSingle: 8,
  thrownOutAdvancing: 1,
  advancementOpportunities: 30
};

// wSB = (25 × 0.20) + (4 × -0.45) - expected = 5.0 - 1.8 - 1.2 = +2.0 runs
// UBR = (12 × 0.40) + (8 × 0.55) - (1 × 0.65) - expected = 8.55 - 3.0 = +5.55 runs
// wGDP = (15 × 0.12 - 1) × 0.44 = (1.8 - 1) × 0.44 = +0.35 runs

// BsR = 2.0 + 5.55 + 0.35 = +7.9 runs
// rWAR = 7.9 / 2.96 = +2.67 rWAR (MVP-level baserunning!)
```

### Example 2: Average Runner (48-game season)

```javascript
const averageRunner = {
  name: 'Joe Average',
  speed: 50,

  SB: 3, CS: 2,            // 60% success rate (below break-even)
  GIDP: 4, GIDPOpportunities: 25,
  singles: 28, BB: 15, HBP: 2, IBB: 1,

  firstToThird: 3,
  secondToHome_onSingle: 2,
  thrownOutAdvancing: 1,
  advancementOpportunities: 20
};

// wSB = (3 × 0.20) + (2 × -0.45) - expected = 0.6 - 0.9 - 0.8 = -1.1 runs
// UBR = (3 × 0.40) + (2 × 0.55) - (1 × 0.65) - expected = 2.65 - 2.0 = +0.65 runs
// wGDP = (25 × 0.12 - 4) × 0.44 = (3 - 4) × 0.44 = -0.44 runs

// BsR = -1.1 + 0.65 - 0.44 = -0.89 runs
// rWAR = -0.89 / 2.96 = -0.30 rWAR (slightly below average)
```

### Example 3: Slow Power Hitter (48-game season)

```javascript
const slowSluger = {
  name: 'David Ortiz',
  speed: 25,

  SB: 0, CS: 1,            // Shouldn't be running
  GIDP: 8, GIDPOpportunities: 30,
  singles: 20, BB: 25, HBP: 4, IBB: 5,

  firstToThird: 1,
  secondToHome_onSingle: 1,
  thrownOutAdvancing: 0,
  advancementOpportunities: 15
};

// wSB = (0 × 0.20) + (1 × -0.45) - expected = -0.45 - 0.8 = -1.25 runs
// UBR = (1 × 0.40) + (1 × 0.55) - expected = 0.95 - 1.5 = -0.55 runs
// wGDP = (30 × 0.12 - 8) × 0.44 = (3.6 - 8) × 0.44 = -1.94 runs

// BsR = -1.25 - 0.55 - 1.94 = -3.74 runs
// rWAR = -3.74 / 2.96 = -1.26 rWAR (liability on bases)
```

---

## 11. Quick Reference Tables

### Stolen Base Run Values

| Event | Run Value | Notes |
|-------|-----------|-------|
| Successful SB | +0.20 | Standard value |
| Caught Stealing | -0.45 | Varies with run environment |
| Break-even rate | ~69% | 2 SB per CS to break even |

### Extra Base Run Values

| Situation | Extra Base Taken | Run Value |
|-----------|------------------|-----------|
| 1B, single hit | 1st → 3rd | +0.40 |
| 2B, single hit | 2nd → Home | +0.55 |
| 1B, double hit | 1st → Home | +0.45 |
| 3B, fly out | Tags, scores | +0.45 |
| 1B, fly out | Tags to 2nd | +0.25 |
| Any | Thrown out | -0.60 to -0.80 |

### GIDP Values

| Metric | Value |
|--------|-------|
| GIDP run cost | -0.44 runs |
| League average rate | ~12% of opportunities |
| Max wGDP impact | ±2.5 runs/season |

### rWAR by Season Length

| BsR | 48g rWAR | 32g rWAR | 20g rWAR |
|-----|----------|----------|----------|
| +6.0 | +2.03 | +3.03 | +4.88 |
| +3.0 | +1.01 | +1.52 | +2.44 |
| +1.0 | +0.34 | +0.51 | +0.81 |
| 0.0 | 0.00 | 0.00 | 0.00 |
| -2.0 | -0.68 | -1.01 | -1.63 |
| -5.0 | -1.69 | -2.53 | -4.07 |

### Expected rWAR by SMB4 Speed Rating

| Speed Rating | Expected rWAR (48g) | Notes |
|--------------|---------------------|-------|
| 95 | +1.5 to +2.5 | Elite baserunner |
| 80 | +0.5 to +1.0 | Above average |
| 65 | +0.0 to +0.5 | Average |
| 50 | -0.3 to +0.3 | League average |
| 35 | -0.5 to -1.0 | Below average |
| 20 | -1.0 to -1.5 | Liability |

---

## Appendix A: Data Sources

### MLB Methodology Sources

1. [FanGraphs BsR](https://library.fangraphs.com/offense/bsr/)
2. [FanGraphs wSB](https://library.fangraphs.com/offense/wsb/)
3. [FanGraphs UBR](https://library.fangraphs.com/offense/ubr/)
4. [FanGraphs wGDP](https://library.fangraphs.com/offense/wgdp/)

### Key Values Used

- **SB run value**: +0.20 runs (FanGraphs standard)
- **CS run value**: -0.45 runs (varies by environment)
- **GIDP run cost**: -0.44 runs
- **Break-even SB rate**: ~69%

---

## Appendix B: Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-21 | Initial specification |

---

*This document is the definitive source for rWAR calculations in KBL Tracker.*
