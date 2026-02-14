# Inherited Runners Tracking Specification

> **Purpose**: Define how inherited runners are tracked for ER/UER attribution and reliever evaluation
> **Integration**: PWAR_CALCULATION_SPEC.md, MWAR_CALCULATION_SPEC.md, CLUTCH_ATTRIBUTION_SPEC.md
> **Related Specs**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §4 (In-Game Tracking)
> **SMB4 Reference**: SMB4_GAME_MECHANICS.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Concepts](#2-core-concepts)
3. [Runner Ownership Rules](#3-runner-ownership-rules)
4. [Pitching Change Flow](#4-pitching-change-flow)
5. [Run Attribution (ER vs UER)](#5-run-attribution-er-vs-uer)
6. [Data Schema](#6-data-schema)
7. [Clutch Integration](#7-clutch-integration)
8. [Manager Evaluation](#8-manager-evaluation)
9. [Edge Cases](#9-edge-cases)
10. [UI Display](#10-ui-display)

---

## 1. Overview

### The Problem

When a reliever enters with runners on base:
- If those runners score, it's **NOT the reliever's earned run**
- The **previous pitcher** is charged with those runs
- But the **reliever** still gets evaluated on whether they allowed them to score

This creates complexity:
- Pitcher A's ERA is affected by runs scored after they leave
- Pitcher B's ERA is NOT affected, but their performance IS judged
- Manager decisions are evaluated by the outcome

### What We Track

| Data Point | Where It's Used |
|------------|-----------------|
| Runners inherited | Reliever evaluation |
| Inherited runners scored | Previous pitcher's ER |
| Inherited runners stranded | Reliever clutch credit |
| Manager decision context | mWAR calculation |

---

## 2. Core Concepts

### 2.1 Runner Ownership

Every runner on base has an **owner** - the pitcher who put them there.

```javascript
interface BaseRunner {
  playerId: string;
  playerName: string;
  base: '1B' | '2B' | '3B';
  reachedOn: 'hit' | 'walk' | 'hbp' | 'error' | 'fc' | 'interference';

  // Ownership tracking
  pitcherResponsible: string;  // ID of pitcher who allowed baserunner
  pitcherResponsibleName: string;

  // For inherited runner tracking
  wasInherited: boolean;       // True if runner was on when current pitcher entered
  inheritedFrom: string | null; // Previous pitcher ID (null if current pitcher's runner)
}
```

### 2.2 Key Definitions

| Term | Definition |
|------|------------|
| **Inherited Runner** | A runner on base when a reliever enters |
| **Bequeathed Runner** | A runner left on base when a pitcher exits |
| **IR Scored (IRS)** | Inherited runners who score |
| **IR Stranded** | Inherited runners who don't score (out or LOB) |
| **ER** | Earned Run - charged to the pitcher who allowed the runner |
| **UER** | Unearned Run - run that scored due to error (no pitcher charged) |

---

## 3. Runner Ownership Rules

### 3.1 Basic Rule

**A pitcher "owns" a runner if they allowed that runner to reach base.**

The runner remains owned by that pitcher even after:
- The pitcher is replaced
- The runner advances
- Innings change (rare - runner must have advanced on wild pitch/PB/SB)

### 3.2 Ownership Transfer Rules

Ownership NEVER transfers. The original pitcher always owns the runner.

```javascript
/**
 * Get the pitcher responsible for a run scoring
 */
function getPitcherResponsibleForRun(runner) {
  // Always the pitcher who allowed them to reach
  return runner.pitcherResponsible;
}
```

### 3.3 When Runner Ownership is Assigned

| Event | Pitcher Responsible |
|-------|---------------------|
| Single, Double, Triple | Current pitcher |
| Home Run | Current pitcher |
| Walk (BB) | Current pitcher |
| HBP | Current pitcher |
| Error (reaches base) | Current pitcher (but run is unearned) |
| Fielder's Choice (reaches) | Current pitcher |
| Dropped 3rd Strike | Current pitcher |

> **Note**: Catcher Interference is NOT possible in SMB4. See `SMB4_GAME_MECHANICS.md`.

---

## 4. Pitching Change Flow

### 4.1 Pre-Change: Capture Outgoing Pitcher State

Before confirming a pitching change, the system must capture:

```javascript
interface OutgoingPitcherState {
  pitcherId: string;
  pitcherName: string;

  // Final stats at exit
  inningsPitched: number;      // Partial innings OK (e.g., 4.2)
  hits: number;
  runs: number;
  earnedRuns: number;
  strikeouts: number;
  walks: number;
  pitchCount: number;

  // Runners being bequeathed
  bequeathedRunners: BaseRunner[];

  // For context
  outsWhenExited: number;      // 0, 1, or 2
  inningWhenExited: number;
}
```

### 4.2 On Pitching Change

```javascript
function handlePitchingChange(outgoingPitcher, incomingPitcher, gameState) {
  // 1. Capture all runners currently on base
  const runnersOnBase = [
    gameState.runners.first,
    gameState.runners.second,
    gameState.runners.third
  ].filter(r => r !== null);

  // 2. Mark these as inherited for the new pitcher
  const inheritedRunners = runnersOnBase.map(runner => ({
    ...runner,
    wasInherited: true,
    inheritedFrom: outgoingPitcher.id
  }));

  // 3. Update outgoing pitcher's record
  outgoingPitcher.bequeathedRunners = runnersOnBase.length;
  outgoingPitcher.bequeathedRunnersScored = 0;  // Will be updated if they score

  // 4. Initialize incoming pitcher's appearance
  const reliefAppearance = {
    pitcherId: incomingPitcher.id,
    entryInning: gameState.inning,
    entryOuts: gameState.outs,
    inheritedRunners: inheritedRunners.length,
    inheritedRunnersScored: 0,
    inheritedRunnersStranded: 0,

    // Track which bases had inherited runners
    inheritedOnFirst: inheritedRunners.some(r => r.base === '1B'),
    inheritedOnSecond: inheritedRunners.some(r => r.base === '2B'),
    inheritedOnThird: inheritedRunners.some(r => r.base === '3B')
  };

  // 5. Log manager decision for mWAR
  logManagerDecision({
    type: 'PITCHING_CHANGE',
    managerId: gameState.getCurrentManager(),
    context: {
      inning: gameState.inning,
      outs: gameState.outs,
      score: gameState.score,
      inheritedRunners: inheritedRunners.length,
      leverageIndex: calculateLeverageIndex(gameState)
    }
  });

  return reliefAppearance;
}
```

### 4.3 UI Flow for Pitching Change

```
STEP 1: Mandatory Pitch Count Entry
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ PITCHING CHANGE - UPDATE PITCH COUNT FIRST                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Outgoing Pitcher: Mike Simmons                                 │
│                                                                 │
│  Enter CUMULATIVE pitch count: [72]                             │
│                                                                 │
│  ⚠️ This data cannot be recovered after the pitcher exits.      │
│                                                                 │
│            [Confirm Pitch Count & Continue]                     │
└─────────────────────────────────────────────────────────────────┘

STEP 2: Inherited Runner Confirmation
┌─────────────────────────────────────────────────────────────────┐
│  PITCHING CHANGE                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Outgoing: Mike Simmons                                         │
│  Final line: 4.2 IP, 6 H, 3 R, 3 ER, 5 K, 2 BB, 72 pitches     │
│                                                                 │
│  INHERITED RUNNERS (Simmons' responsibility):                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  2B: Torres (singled in 5th)                              │  │
│  │  1B: Rizzo (walked in 5th)                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│  If these runners score, Simmons is charged with the ER.        │
│                                                                 │
│  NEW PITCHER: [Jake Powers ▼]                                   │
│                                                                 │
│                    [Confirm Change]                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Run Attribution (ER vs UER)

### 5.1 When a Run Scores

```javascript
function handleRunScored(runner, gameState, howScored) {
  const responsiblePitcher = runner.pitcherResponsible;
  const currentPitcher = gameState.currentPitcher;

  // 1. Determine if earned or unearned
  const isEarned = determineIfEarnedRun(runner, howScored, gameState);

  // 2. Credit/charge the responsible pitcher
  if (isEarned) {
    responsiblePitcher.stats.earnedRuns += 1;
  }
  responsiblePitcher.stats.runs += 1;

  // 3. If inherited runner, update both pitchers' tracking
  if (runner.wasInherited) {
    // Previous pitcher (owner)
    responsiblePitcher.bequeathedRunnersScored += 1;

    // Current pitcher (inheritor)
    currentPitcher.inheritedRunnersScored += 1;
  }

  // 4. Update game score
  gameState.updateScore(runner.team, 1);

  return {
    runScored: true,
    earnedRun: isEarned,
    chargedTo: responsiblePitcher.id,
    wasInherited: runner.wasInherited
  };
}
```

### 5.2 Earned Run Determination

```javascript
function determineIfEarnedRun(runner, howScored, gameState) {
  // Unearned if runner reached on error
  if (runner.reachedOn === 'error') {
    return false;
  }

  // Unearned if runner advanced due to error
  if (howScored === 'error_advance') {
    return false;
  }

  // Unearned if runner scored on error
  if (howScored === 'error') {
    return false;
  }

  // Unearned if run only scored because inning was extended by error
  // (Complex - requires tracking "would have been 3rd out")
  if (gameState.inningExtendedByError && !gameState.wouldHaveScoredAnyway(runner)) {
    return false;
  }

  // Otherwise earned
  return true;
}
```

### 5.3 ER Attribution Table

| Scenario | Pitcher Charged | Earned? |
|----------|-----------------|---------|
| Runner scores on hit | Pitcher who allowed runner | Yes |
| Runner scores on sac fly | Pitcher who allowed runner | Yes |
| Runner scores on wild pitch | Current pitcher* | Yes |
| Runner scores on passed ball | Neither (catcher) | Yes |
| Runner scores on error | Pitcher who allowed runner | No |
| Inherited runner scores | **Previous** pitcher | Yes |
| Inherited runner scores on error | Previous pitcher | No |

*Wild pitch is charged to current pitcher because it's their fault, but inherited runner scoring means it goes to original owner for ER purposes.

### 5.4 Wild Pitch / Passed Ball Special Case

When an inherited runner advances or scores on WP/PB:

```javascript
function handleWildPitchAdvance(runner, gameState) {
  // The RUN is still charged to the original pitcher
  // But the WILD PITCH is charged to the current pitcher

  if (runner.wasInherited) {
    // Run goes to original pitcher
    const originalPitcher = getPitcherById(runner.pitcherResponsible);

    if (runner.scores) {
      originalPitcher.stats.runs += 1;
      originalPitcher.stats.earnedRuns += 1;  // WP is still earned
      originalPitcher.bequeathedRunnersScored += 1;

      gameState.currentPitcher.inheritedRunnersScored += 1;
    }

    // WP goes to current pitcher (for their WP stat)
    gameState.currentPitcher.stats.wildPitches += 1;
  }
}
```

---

## 6. Data Schema

### 6.1 Pitcher Appearance Record

```typescript
interface PitcherAppearance {
  // Identity
  pitcherId: string;
  gameId: string;

  // When
  entryInning: number;
  entryOuts: number;
  exitInning: number;
  exitOuts: number;

  // Standard stats
  inningsPitched: number;
  hits: number;
  runs: number;
  earnedRuns: number;
  strikeouts: number;
  walks: number;
  homeRuns: number;
  hitByPitch: number;
  wildPitches: number;
  pitchCount: number;
  battersFaced: number;

  // Inherited runner tracking
  inheritedRunners: number;
  inheritedRunnersScored: number;
  inheritedRunnersStranded: number;

  // Bequeathed runner tracking
  bequeathedRunners: number;
  bequeathedRunnersScored: number;

  // Context
  isStart: boolean;
  leverageIndexAtEntry: number;
  scoreDifferentialAtEntry: number;

  // Outcomes
  earnedWin: boolean;
  earnedLoss: boolean;
  earnedSave: boolean;
  earnedHold: boolean;
  blownSave: boolean;
}
```

### 6.2 Game-Level Runner State

```typescript
interface GameRunnerState {
  runners: {
    first: BaseRunner | null;
    second: BaseRunner | null;
    third: BaseRunner | null;
  };

  // Quick access helpers
  runnersOnBase: number;
  isRISP: boolean;
  isBasesLoaded: boolean;

  // Inherited runner quick check
  hasInheritedRunners: boolean;
  inheritedRunnerCount: number;
}
```

---

## 7. Clutch Integration

### 7.1 Inherited Runner Escape (Clutch Credit)

From CLUTCH_ATTRIBUTION_SPEC.md - relievers get clutch credit for stranding inherited runners:

```javascript
function evaluateInheritedRunnerEscape(reliefAppearance, gameState) {
  const { inheritedRunners, inheritedRunnersScored, inheritedRunnersStranded } = reliefAppearance;

  // No inherited runners = no clutch for escape
  if (inheritedRunners === 0) return 0;

  // Calculate escape rate
  const escapeRate = inheritedRunnersStranded / inheritedRunners;

  let clutchValue = 0;

  // Full escape (0 runs allowed)
  if (inheritedRunnersScored === 0) {
    if (inheritedRunners >= 3) {
      // Bases loaded escape = huge clutch
      clutchValue = 2.0;
    } else if (inheritedRunners === 2) {
      // 2 runners escaped
      clutchValue = 1.5;
    } else {
      // 1 runner escaped
      clutchValue = 1.0;
    }
  }
  // Partial escape
  else if (escapeRate > 0.5) {
    clutchValue = 0.5;
  }

  // Apply leverage index
  const li = reliefAppearance.leverageIndexAtEntry;
  return clutchValue * Math.sqrt(li);
}
```

### 7.2 Inherited Runner Allowed to Score (Choke)

```javascript
function evaluateInheritedRunnerScored(reliefAppearance) {
  const { inheritedRunners, inheritedRunnersScored } = reliefAppearance;

  if (inheritedRunnersScored === 0) return 0;

  // All inherited runners scored = significant choke
  if (inheritedRunnersScored === inheritedRunners) {
    return -1.0 * inheritedRunnersScored;
  }

  // Partial scoring
  return -0.5 * inheritedRunnersScored;
}
```

---

## 8. Manager Evaluation

### 8.1 Pitching Change Decision (mWAR)

From MWAR_CALCULATION_SPEC.md:

```javascript
function evaluatePitchingChangeDecision(decision, outcome) {
  const { inheritedRunners, leverageIndex } = decision.context;
  const { runsAllowed, outsRecorded, inheritedRunnersScored } = outcome;

  let mwarImpact = 0;

  // Success: New pitcher escapes jam and performs well
  if (inheritedRunnersScored === 0 && runsAllowed <= 1 && outsRecorded >= 3) {
    mwarImpact = 0.1 * Math.sqrt(leverageIndex);  // Good move
  }

  // Failure: Inherited runners score or disaster
  if (inheritedRunnersScored > 0 || (runsAllowed >= 2 && outsRecorded < 3)) {
    mwarImpact = -0.1 * Math.sqrt(leverageIndex);  // Bad move

    // Extra penalty if bases were loaded and all scored
    if (inheritedRunners >= 3 && inheritedRunnersScored >= 3) {
      mwarImpact -= 0.05;
    }
  }

  return mwarImpact;
}
```

### 8.2 Leave Pitcher In (Implicit Decision)

When a manager DOESN'T make a pitching change, that's also evaluated:

```javascript
function evaluateNoPitchingChange(pitcher, situation, outcome) {
  // Only evaluate if leaving them in was questionable
  // (e.g., high pitch count, fatigued, facing tough lineup spot)

  if (situation.shouldHaveConsidered PitchingChange) {
    if (outcome.escapedJam) {
      return 0.05;  // Minor credit for trusting pitcher
    } else if (outcome.gaveTUpRuns) {
      return -0.1;  // Should have pulled them
    }
  }

  return 0;  // No strong opinion
}
```

---

## 9. Edge Cases

### 9.1 Multiple Pitching Changes in One Inning

```javascript
// Pitcher A leaves with runners on 1B and 2B
// Pitcher B enters, walks a batter (bases loaded)
// Pitcher C enters

// Runner ownership:
// - 1B runner: Pitcher A (original)
// - 2B runner: Pitcher A (original)
// - 3B runner: Pitcher B (walked by them)

// For Pitcher C:
// - Inherited: 3 runners
// - Inherited from Pitcher B: 1 runner (the walk)
// - Inherited from Pitcher A: 2 runners (via Pitcher B)
```

### 9.2 Inning-Ending Plays

When inning ends before inherited runners score:

```javascript
function handleInningEnd(gameState) {
  const currentPitcher = gameState.currentPitcher;

  // Any runners left on base who were inherited = stranded
  const strandedInherited = gameState.runners
    .filter(r => r !== null && r.wasInherited);

  currentPitcher.inheritedRunnersStranded += strandedInherited.length;

  // These runners no longer exist (LOB)
  // Original pitchers don't get charged with runs
}
```

### 9.3 Inherited Runner Scores in Later Inning

Rare but possible (e.g., runner on 3B, inning ends, comes back to bat):

```javascript
// This doesn't happen in SMB4 as runners clear between innings
// But if it did: runner still owned by original pitcher
```

### 9.4 Pinch Runner for Inherited Runner

```javascript
function handlePinchRunner(originalRunner, pinchRunner, gameState) {
  // Pinch runner inherits the ownership
  pinchRunner.pitcherResponsible = originalRunner.pitcherResponsible;
  pinchRunner.wasInherited = originalRunner.wasInherited;
  pinchRunner.inheritedFrom = originalRunner.inheritedFrom;

  // If PR scores, original pitcher still charged
}
```

---

## 10. UI Display

### 10.1 Box Score Display

```
┌─────────────────────────────────────────────────────────────────┐
│  YANKEES PITCHING                                               │
├─────────────────────────────────────────────────────────────────┤
│  Pitcher      IP    H   R  ER   K  BB  PC   IR  IRS             │
│  Cole         4.2   6   3   3   5   2  72    -   -              │
│  Powers       2.1   2   2   2*  3   1  28    2   1              │
│  Chapman      2.0   0   0   0   4   0  25    1   0              │
│                                                                 │
│  * Powers allowed 1 inherited runner (Cole's) to score          │
│    That run is charged to Cole's ERA, not Powers'               │
└─────────────────────────────────────────────────────────────────┘

IR = Inherited Runners
IRS = Inherited Runners Scored
```

### 10.2 Live In-Game Display

When inherited runners are on base:

```
┌─────────────────────────────────────────────────────────────────┐
│  CURRENT PITCHER: Jake Powers (2.1 IP, 28 pitches)              │
│                                                                 │
│  INHERITED RUNNERS:                                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ⚠️ Torres on 3B - Cole's runner (if scores: Cole's ER)    ││
│  │  ✓ Rizzo stranded (was on 2B, now out)                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Powers' line so far: 2.1 IP, 2 H, 1 R (own), 0 ER             │
│  Cole's inherited runner that scored: 1                         │
└─────────────────────────────────────────────────────────────────┘
```

### 10.3 Post-Game Reliever Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  JAKE POWERS - RELIEF APPEARANCE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Entered: 5th inning, 2 outs, runners on 1st & 2nd             │
│  Exited: 8th inning, 0 outs                                    │
│                                                                 │
│  Line: 2.1 IP, 2 H, 2 R, 1 ER, 3 K, 1 BB, 28 pitches           │
│                                                                 │
│  INHERITED RUNNERS: 2                                           │
│  • Torres (2B) → SCORED (charged to Cole)                       │
│  • Rizzo (1B) → Grounded out                                    │
│  IR Escape Rate: 50%                                            │
│                                                                 │
│  CLUTCH IMPACT:                                                 │
│  • -0.5 (allowed inherited runner to score)                     │
│  • +0.3 (2+ scoreless innings after escape)                     │
│  • Net: -0.2                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix: Quick Reference

### ER Attribution Cheat Sheet

| Who put runner on base? | Who let runner score? | Who gets ER? |
|-------------------------|----------------------|--------------|
| Pitcher A | Pitcher A | Pitcher A |
| Pitcher A | Pitcher B | Pitcher A |
| Pitcher B | Pitcher B | Pitcher B |
| Error | Anyone | Nobody (UER) |

### Stat Tracking Checklist

For every pitching appearance, track:
- [ ] Inherited runners count
- [ ] Inherited runners scored
- [ ] Inherited runners stranded
- [ ] Bequeathed runners count
- [ ] Leverage index at entry
- [ ] Score differential at entry

---

*Last Updated: January 22, 2026*
*Version: 1.0 - Initial inherited runners specification*
