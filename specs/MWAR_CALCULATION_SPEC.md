# Manager WAR (mWAR) Calculation Specification

> **Purpose**: Quantify manager value through in-game decisions and team performance
> **Foundation**: Uses Leverage Index from LEVERAGE_INDEX_SPEC.md
> **Integration**: Feeds into Manager of the Year voting, team evaluation
> **Related Specs**: CLUTCH_ATTRIBUTION_SPEC.md, LEVERAGE_INDEX_SPEC.md, KBL_XHD_TRACKER_MASTER_SPEC_v3.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [mWAR Components](#2-mwar-components)
3. [In-Game Decision Tracking](#3-in-game-decision-tracking)
4. [Decision Inference System](#4-decision-inference-system)
5. [Decision Outcome Evaluation](#5-decision-outcome-evaluation)
6. [Team Performance Component](#6-team-performance-component)
7. [Season mWAR Calculation](#7-season-mwar-calculation)
8. [Manager of the Year](#8-manager-of-the-year)
9. [Implementation Schema](#9-implementation-schema)
10. [Reference Tables](#10-reference-tables)

---

## 1. Overview

### What is mWAR?

Manager WAR (mWAR) measures a manager's contribution to team success through:
1. **In-game decisions** - Tactical calls weighted by leverage
2. **Team overperformance** - Wins above salary-based expectation

### Why Track Manager Value?

- **Manager of the Year** voting requires quantifiable metrics
- **Team evaluation** - Is the manager helping or hurting?
- **Historical tracking** - Career managerial performance
- **Narrative** - "Good manager, bad roster" vs "Bad manager, good roster"

### mWAR Scale

| mWAR | Rating | Description |
|------|--------|-------------|
| > 4.0 | Elite | Exceptional tactical manager |
| 2.5-4.0 | Excellent | Consistently good decisions |
| 1.0-2.5 | Above Average | More right than wrong |
| 0 to 1.0 | Average | Neutral impact |
| -1.0 to 0 | Below Average | Costs team some wins |
| < -1.0 | Poor | Actively hurting team |

---

## 2. mWAR Components

### Formula

```javascript
mWAR = (decisionWAR × 0.60) + (overperformanceWAR × 0.40)
```

### Component 1: Decision WAR (60%)

Sum of all in-game decision outcomes, weighted by leverage:

```javascript
function calculateDecisionWAR(decisions) {
  let totalValue = 0;

  for (const decision of decisions) {
    const outcomeValue = getDecisionOutcomeValue(decision);
    const liWeight = Math.sqrt(decision.leverageIndex);
    totalValue += outcomeValue * liWeight;
  }

  // Convert to WAR scale (calibrate based on league data)
  const runsPerWin = getSeasonRunsPerWin();
  return totalValue / runsPerWin;
}
```

### Component 2: Overperformance WAR (40%)

Team wins above expected based on roster talent:

```javascript
function calculateOverperformanceWAR(team, season) {
  const expectedWinPct = getExpectedWinPct(team);  // From salary/ratings
  const actualWinPct = team.wins / team.gamesPlayed;

  const overperformance = actualWinPct - expectedWinPct;

  // Convert to wins
  const overperformanceWins = overperformance * season.totalGames;

  // Manager gets partial credit (not all overperformance is managerial)
  return overperformanceWins * 0.3;  // 30% attribution to manager
}
```

### Overperformance Attribution Breakdown

Team overperformance (actual wins - expected wins) is attributed as follows:

| Attribution | Percentage | Rationale |
|-------------|------------|-----------|
| **Manager** | 30% | Strategic decisions, player usage, game management |
| **Unattributed (Luck/Variance)** | 70% | Close game variance, clutch hitting variance, sequencing, injury luck |

**Why 70% is unattributed:**
- Baseball has significant randomness in close games (coin-flip outcomes)
- Run sequencing luck can swing 5-10 wins per season
- This is consistent with MLB sabermetric consensus that manager impact is limited
- The remaining 70% is intentionally NOT redistributed to player WAR (to avoid double-counting)

**Important:** The unattributed portion does NOT get assigned to players. Player WAR is calculated independently from individual performance. Overperformance attribution is a separate accounting for team-level variance.

---

## 3. In-Game Decision Tracking

### Decision Categories

| Category | Decisions | Inference |
|----------|-----------|-----------|
| **Pitching** | Change pitcher, leave in, warm up | Auto-detected |
| **Lineup** | Pinch hitter, pinch runner | Auto-detected |
| **Defense** | Defensive sub, shift | Auto + prompted |
| **Strategy** | IBB, steal call, bunt, squeeze, H&R | Auto + prompted |

### What Gets Tracked

```typescript
interface ManagerDecision {
  decisionId: string;
  gameId: string;
  managerId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';

  // Decision details
  decisionType: DecisionType;
  leverageIndex: number;
  gameState: GameState;

  // How it was recorded
  inferenceMethod: 'auto' | 'user_prompted' | 'user_flagged';

  // Outcome (filled after resolution)
  resolved: boolean;
  outcome: 'success' | 'failure' | 'neutral';
  clutchImpact: number;

  // Context
  involvedPlayers: string[];
  notes?: string;
}

type DecisionType =
  | 'pitching_change'
  | 'leave_pitcher_in'
  | 'pinch_hitter'
  | 'pinch_runner'
  | 'defensive_sub'
  | 'intentional_walk'
  | 'steal_call'
  | 'bunt_call'
  | 'squeeze_call'
  | 'hit_and_run'
  | 'shift_on'
  | 'shift_off';
```

---

## 4. Decision Inference System

### Auto-Detected Decisions

These require no user input—the engine detects them automatically:

```javascript
const AUTO_DETECTED_DECISIONS = {
  pitching_change: {
    detection: (prevPA, currPA) => {
      return prevPA.pitcherId !== currPA.pitcherId;
    },
    createDecision: (game, newPitcher, oldPitcher) => ({
      decisionType: 'pitching_change',
      leverageIndex: game.currentLI,
      involvedPlayers: [newPitcher.id, oldPitcher.id],
      notes: `Brought in ${newPitcher.name} for ${oldPitcher.name}`
    })
  },

  pinch_hitter: {
    detection: (expectedBatter, actualBatter) => {
      return expectedBatter.id !== actualBatter.id &&
             !actualBatter.isInStartingLineup;
    },
    createDecision: (game, ph, replaced) => ({
      decisionType: 'pinch_hitter',
      leverageIndex: game.currentLI,
      involvedPlayers: [ph.id, replaced.id],
      notes: `PH ${ph.name} for ${replaced.name}`
    })
  },

  pinch_runner: {
    detection: (reachedBase, currentRunner) => {
      return reachedBase.id !== currentRunner.id;
    },
    createDecision: (game, pr, replaced) => ({
      decisionType: 'pinch_runner',
      leverageIndex: game.currentLI,
      involvedPlayers: [pr.id, replaced.id],
      notes: `PR ${pr.name} for ${replaced.name}`
    })
  },

  defensive_sub: {
    detection: (prevHalfInning, currHalfInning) => {
      // Compare fielders at each position
      return getPositionChanges(prevHalfInning, currHalfInning);
    },
    createDecision: (game, newFielder, oldFielder, position) => ({
      decisionType: 'defensive_sub',
      leverageIndex: game.currentLI,
      involvedPlayers: [newFielder.id, oldFielder.id],
      notes: `Defensive sub: ${newFielder.name} at ${position}`
    })
  },

  intentional_walk: {
    detection: (result) => result === 'IBB',
    createDecision: (game, batter) => ({
      decisionType: 'intentional_walk',
      leverageIndex: game.currentLI,
      involvedPlayers: [batter.id],
      notes: `IBB to ${batter.name}`
    })
  }
};
```

### User-Prompted Decisions

For strategic calls that can't be auto-detected, prompt only when relevant:

```javascript
const USER_PROMPTED_DECISIONS = {
  steal_call: {
    showPromptWhen: (game) => {
      // Show only after SB or CS
      return game.lastEvent?.type === 'SB' || game.lastEvent?.type === 'CS';
    },
    prompt: 'Did the manager send the runner?',
    options: ['Yes - Manager called it', 'No - Runner went on their own'],
    defaultToNo: true  // If user skips, assume player autonomy
  },

  bunt_call: {
    showPromptWhen: (game) => {
      // Show after bunt attempts
      return game.lastEvent?.type?.includes('bunt');
    },
    prompt: 'Did the manager call for the bunt?',
    options: ['Yes - Manager called it', 'No - Batter decided'],
    defaultToNo: true
  },

  squeeze_call: {
    showPromptWhen: (game) => {
      // Show after bunt with runner on 3rd
      return game.lastEvent?.type?.includes('bunt') &&
             game.runnersBeforePlay.third;
    },
    prompt: 'Was this a squeeze play?',
    options: ['Yes - Squeeze play', 'No - Regular bunt'],
    defaultToNo: true
  },

  hit_and_run: {
    showPromptWhen: (game) => {
      // Show after contact with runner moving
      return game.lastEvent?.runnerWasMoving;
    },
    prompt: 'Was this a hit-and-run?',
    options: ['Yes - Hit and run', 'No - Regular play'],
    defaultToNo: true
  },

  shift: {
    showPromptWhen: (game) => {
      // Can toggle at start of any at-bat
      return true;  // Always available
    },
    prompt: 'Is the shift on?',
    options: ['Shift On', 'Standard Defense'],
    defaultToNo: true,
    persistent: true  // Stays on until turned off
  }
};
```

### Prompt UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  MANAGER DECISION                                               │
│                                                                 │
│  Torres just stole second base.                                 │
│                                                                 │
│  Did the manager send the runner?                               │
│                                                                 │
│  ○ Yes - Manager called the steal                               │
│  ● No - Torres went on his own (default)                        │
│                                                                 │
│  [This affects manager mWAR based on outcome]                   │
│                                                                 │
│              [Confirm]  [Skip - use default]                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Decision Outcome Evaluation

### Pitching Change Outcomes

```javascript
function evaluatePitchingChange(decision, newPitcherAppearance) {
  const { runsAllowed, outsRecorded, inheritedRunnersScored } = newPitcherAppearance;
  const li = Math.sqrt(decision.leverageIndex);

  // Success: New pitcher escapes jam or pitches well
  if (inheritedRunnersScored === 0 && runsAllowed <= 1 && outsRecorded >= 3) {
    return { outcome: 'success', value: +0.4 * li };
  }

  // Failure: Inherited runners score or gives up runs quickly
  if (inheritedRunnersScored > 0 || (runsAllowed >= 2 && outsRecorded < 3)) {
    return { outcome: 'failure', value: -0.3 * li };
  }

  return { outcome: 'neutral', value: 0 };
}
```

### Leave Pitcher In Outcomes

```javascript
function evaluateLeavePitcherIn(decision, pitcherPerformanceAfter) {
  // Evaluated when manager COULD have pulled pitcher but didn't
  // (e.g., pitcher in trouble, high pitch count)

  const { runsAllowed, gotOutOfInning } = pitcherPerformanceAfter;
  const li = Math.sqrt(decision.leverageIndex);

  if (gotOutOfInning && runsAllowed === 0) {
    return { outcome: 'success', value: +0.2 * li };
  }

  if (runsAllowed >= 2) {
    return { outcome: 'failure', value: -0.4 * li };
  }

  return { outcome: 'neutral', value: 0 };
}
```

### Pinch Hitter Outcomes

```javascript
function evaluatePinchHitter(decision, atBatResult) {
  const li = Math.sqrt(decision.leverageIndex);

  const SUCCESS_RESULTS = ['1B', '2B', '3B', 'HR', 'BB', 'HBP', 'SF', 'SAC'];
  const FAILURE_RESULTS = ['K', 'GIDP'];

  if (SUCCESS_RESULTS.includes(atBatResult)) {
    return { outcome: 'success', value: +0.5 * li };
  }

  if (FAILURE_RESULTS.includes(atBatResult)) {
    return { outcome: 'failure', value: -0.5 * li };
  }

  // Regular outs
  return { outcome: 'failure', value: -0.3 * li };
}
```

### Pinch Runner Outcomes

```javascript
function evaluatePinchRunner(decision, runnerOutcome) {
  const li = Math.sqrt(decision.leverageIndex);

  if (runnerOutcome === 'scored') {
    return { outcome: 'success', value: +0.4 * li };
  }

  if (runnerOutcome === 'out_on_bases') {
    return { outcome: 'failure', value: -0.4 * li };
  }

  if (runnerOutcome === 'advanced') {
    return { outcome: 'success', value: +0.1 * li };
  }

  return { outcome: 'neutral', value: 0 };
}
```

### IBB Outcomes

```javascript
function evaluateIBB(decision, nextBatterResult) {
  const li = Math.sqrt(decision.leverageIndex);

  // Success: Next batter makes out
  if (['GO', 'FO', 'LO', 'PO', 'K', 'DP'].includes(nextBatterResult)) {
    return { outcome: 'success', value: +0.3 * li };
  }

  // Failure: Next batter drives in runs or gets on
  if (['1B', '2B', '3B', 'HR'].includes(nextBatterResult)) {
    // Extra penalty if runs score
    const runsScored = getRunsScoredOnPlay();
    if (runsScored > 0) {
      return { outcome: 'failure', value: -0.5 * li - (runsScored * 0.2) };
    }
    return { outcome: 'failure', value: -0.4 * li };
  }

  // Walk: IBB + BB = bases loaded (usually bad)
  if (nextBatterResult === 'BB') {
    return { outcome: 'failure', value: -0.3 * li };
  }

  return { outcome: 'neutral', value: 0 };
}
```

### Steal Call Outcomes

```javascript
function evaluateStealCall(decision, stealResult) {
  const li = Math.sqrt(decision.leverageIndex);

  if (stealResult === 'SB') {
    return { outcome: 'success', value: +0.3 * li };
  }

  if (stealResult === 'CS') {
    return { outcome: 'failure', value: -0.4 * li };
  }

  return { outcome: 'neutral', value: 0 };
}
```

### Shift Outcomes

```javascript
function evaluateShift(decision, playResult, ballDirection) {
  const li = Math.sqrt(decision.leverageIndex);

  if (decision.decisionType === 'shift_on') {
    // Shift helps: Pull-side grounder turned into out
    if (ballDirection === 'pull' && playResult === 'out') {
      return { outcome: 'success', value: +0.2 * li };
    }

    // Shift hurts: Opposite field hit through hole
    if (ballDirection === 'opposite' && playResult === 'hit') {
      return { outcome: 'failure', value: -0.3 * li };
    }
  }

  return { outcome: 'neutral', value: 0 };
}
```

### Complete Outcome Value Table

| Decision | Success Value | Failure Value |
|----------|---------------|---------------|
| Pitching Change | +0.4 × √LI | -0.3 × √LI |
| Leave Pitcher In | +0.2 × √LI | -0.4 × √LI |
| Pinch Hitter | +0.5 × √LI | -0.3 to -0.5 × √LI |
| Pinch Runner | +0.4 × √LI | -0.4 × √LI |
| Defensive Sub | +0.4 × √LI | -0.3 × √LI |
| IBB | +0.3 × √LI | -0.4 to -0.7 × √LI |
| Steal Call | +0.3 × √LI | -0.4 × √LI |
| Bunt Call | +0.2 × √LI | -0.4 × √LI |
| Squeeze Call | +0.6 × √LI | -0.5 × √LI |
| Hit-and-Run | +0.3 × √LI | -0.4 × √LI |
| Shift (helps) | +0.2 × √LI | — |
| Shift (hurts) | — | -0.3 × √LI |

---

## 6. Team Performance Component

### Expected Win Percentage

Based on team salary/ratings (from KBL_XHD_TRACKER_MASTER_SPEC_v3.md):

```javascript
function getExpectedWinPct(team) {
  // Use position-based salary percentiles
  const teamSalaryScore = calculateTeamSalaryScore(team);

  // Convert to expected win percentage
  // League average team = 50% expected
  // Elite payroll = ~60% expected
  // Low payroll = ~40% expected

  return 0.35 + (teamSalaryScore * 0.30);  // Range: 35% to 65%
}
```

### Overperformance Calculation

```javascript
function calculateOverperformance(team, season) {
  const expectedWinPct = getExpectedWinPct(team);
  const actualWinPct = team.wins / (team.wins + team.losses);

  const overperformance = actualWinPct - expectedWinPct;
  const overperformanceWins = overperformance * season.totalGames;

  return {
    expectedWinPct,
    actualWinPct,
    overperformance,
    overperformanceWins,
    managerCredit: overperformanceWins * 0.3  // 30% to manager
  };
}
```

---

## 7. Season mWAR Calculation

### Full Calculation

```javascript
function calculateSeasonMWAR(manager, team, season) {
  // Component 1: Decision WAR (60%)
  const decisions = getManagerDecisions(manager.id, season.id);
  let decisionValue = 0;

  for (const decision of decisions) {
    decisionValue += decision.clutchImpact;
  }

  // Convert to WAR
  const runsPerWin = getSeasonRunsPerWin(season);
  const decisionWAR = decisionValue / runsPerWin;

  // Component 2: Overperformance WAR (40%)
  const overperformance = calculateOverperformance(team, season);
  const overperformanceWAR = overperformance.managerCredit;

  // Combine
  const mWAR = (decisionWAR * 0.60) + (overperformanceWAR * 0.40);

  return {
    mWAR,
    components: {
      decisionWAR,
      decisionCount: decisions.length,
      successRate: getSuccessRate(decisions),
      overperformanceWAR,
      teamRecord: `${team.wins}-${team.losses}`,
      expectedWins: Math.round(overperformance.expectedWinPct * season.totalGames),
      actualWins: team.wins
    }
  };
}
```

### Example Season mWAR

```
Manager: Aaron Boone (Yankees)
Season: 48 games

DECISIONS:
- Pitching changes: 45 (28 success, 12 fail, 5 neutral) = +3.2
- Pinch hitters: 18 (10 success, 8 fail) = +1.1
- Steal calls: 12 (8 success, 4 fail) = +0.6
- IBB: 8 (5 success, 3 fail) = +0.4
- Other: +0.5

Total Decision Value: +5.8
Decision WAR: 5.8 / 2.96 = 1.96

OVERPERFORMANCE:
- Expected: 28-20 (.583)
- Actual: 32-16 (.667)
- Overperformance: +4 wins
- Manager credit (30%): +1.2 wins

FINAL mWAR:
(1.96 × 0.60) + (1.2 × 0.40) = 1.18 + 0.48 = 1.66

Rating: Above Average
```

---

## 8. Manager of the Year

### Voting Formula

From KBL_XHD_TRACKER_MASTER_SPEC_v3.md:

```javascript
function calculateMOYVotes(manager, team, season) {
  // mWAR: 60%
  const mwarScore = normalizeToRange(manager.mWAR, allManagerMWARs) * 0.60;

  // Team overperformance: 40%
  const overperf = calculateOverperformance(team, season);
  const overperfScore = normalizeToRange(overperf.overperformanceWins, allOverperfs) * 0.40;

  return mwarScore + overperfScore;
}
```

### MOY Criteria

| Factor | Weight | Notes |
|--------|--------|-------|
| mWAR | 60% | In-game decisions + overperformance |
| Team overperformance | 40% | Wins above salary expectation |

### Tiebreakers

1. Higher mWAR
2. Higher team overperformance
3. More high-leverage decision successes
4. Better team record

---

## 9. Implementation Schema

### Manager Profile

```typescript
interface Manager {
  id: string;
  name: string;
  teamId: string;

  // Career stats
  careerRecord: { wins: number; losses: number };
  careerMWAR: number;
  seasonsManaged: number;

  // Current season
  currentSeasonStats: ManagerSeasonStats;
}

interface ManagerSeasonStats {
  seasonId: string;
  mWAR: number;

  // Decision tracking
  decisions: ManagerDecision[];
  decisionCounts: {
    total: number;
    successes: number;
    failures: number;
    neutral: number;
  };
  decisionWAR: number;

  // Team performance
  teamRecord: { wins: number; losses: number };
  expectedWinPct: number;
  actualWinPct: number;
  overperformanceWAR: number;

  // Breakdowns
  decisionsByType: Record<DecisionType, {
    count: number;
    successes: number;
    failures: number;
    totalValue: number;
  }>;
}
```

### Game-Level Manager Stats

```typescript
interface GameManagerStats {
  gameId: string;
  managerId: string;

  decisions: ManagerDecision[];
  totalDecisionValue: number;

  // Quick summary
  successfulDecisions: number;
  failedDecisions: number;
  highLeverageDecisions: number;  // LI > 2.0
}
```

---

## 10. Reference Tables

### Decision Success Rates (Expected)

| Decision Type | Expected Success Rate | Notes |
|---------------|----------------------|-------|
| Pitching Change | 55-60% | Depends on bullpen quality |
| Pinch Hitter | 45-50% | Hitting is hard |
| Steal Call | 65-70% | Should only send good chances |
| IBB | 55-60% | Depends on next batter |
| Squeeze | 60-65% | High-skill play |
| Hit-and-Run | 50-55% | Risky play |

### mWAR Benchmarks (48-game season)

| mWAR | Percentile | Description |
|------|------------|-------------|
| > 3.0 | 95th | Elite tactical manager |
| 2.0-3.0 | 80th | Excellent |
| 1.0-2.0 | 60th | Above average |
| 0.5-1.0 | 50th | Average |
| 0-0.5 | 40th | Below average |
| < 0 | 20th | Poor |

### Historical Context

For a 48-game season:
- ~50-70 total decisions per manager
- ~30-40 pitching changes
- ~10-15 pinch hitters
- ~5-10 steal calls (if flagged)
- ~5-10 IBBs

---

*Last Updated: January 2026*
*Version: 1.0*
