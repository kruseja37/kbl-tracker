# Pitch Count Tracking Specification

> **Purpose**: Define when and how pitch counts are captured during in-game tracking
> **Integration**: PWAR_CALCULATION_SPEC.md, INHERITED_RUNNERS_SPEC.md
> **Related Specs**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §4 (In-Game Tracking)

---

## Table of Contents

1. [Overview](#1-overview)
2. [When to Track Pitch Counts](#2-when-to-track-pitch-counts)
3. [Entry Methods](#3-entry-methods)
4. [Per-Inning vs Cumulative](#4-per-inning-vs-cumulative)
5. [UI Flow](#5-ui-flow)
6. [Data Schema](#6-data-schema)
7. [Validation Rules](#7-validation-rules)
8. [Integration Points](#8-integration-points)

---

## 1. Overview

### Why Track Pitch Counts?

Pitch counts are used for:
- **Pitcher workload management** - Identifying fatigue
- **Narrative generation** - "Cole labored through 98 pitches..."
- **Manager evaluation** - Did they leave a tired pitcher in too long?
- **Historical comparison** - Season pitch count totals

### Design Goal

**Minimize data entry while maximizing accuracy.**

We do NOT track pitch-by-pitch (too slow). Instead, we capture cumulative pitch counts at strategic moments.

---

## 2. When to Track Pitch Counts

### 2.1 Mandatory Capture Points

| Trigger | When | Why |
|---------|------|-----|
| **Pitching Change** | Before confirming change | Last chance to capture outgoing pitcher's count |
| **End of Game** | After final out | Capture final counts for all pitchers |
| **Starter Exit** | When starter leaves | Critical for workload tracking |

### 2.2 Optional Capture Points

| Trigger | When | Why |
|---------|------|-----|
| **End of Inning** | Between half-innings | More granular tracking (user preference) |
| **High Pitch Count Alert** | At 80, 100, 120 pitches | Notify user to verify accuracy |
| **Long At-Bat** | 7+ pitch AB completed | Can prompt for verification |

### 2.3 Decision: Per-Inning vs End-of-Game Only

**Recommendation: Mandatory at pitching changes, optional per-inning.**

```javascript
const PITCH_COUNT_CONFIG = {
  // Always required
  mandatoryOnPitchingChange: true,
  mandatoryOnGameEnd: true,

  // User preference (settings)
  promptPerInning: false,  // Default: off (faster entry)
  showHighPitchCountAlert: true,
  highPitchCountThreshold: 100
};
```

---

## 3. Entry Methods

### 3.1 Cumulative Entry (Recommended)

User enters the **total pitches thrown so far**. App calculates per-inning.

```
Enter CUMULATIVE pitch count: [72]

App shows: "5th inning = 7 pitches (72 - 65 from innings 1-4)"
```

**Pros:**
- Matches what's displayed on TV/scoreboard
- Less mental math for user
- Can verify against game feed

**Cons:**
- User must remember to look at pitch count

### 3.2 Per-Inning Entry (Alternative)

User enters pitches for just the completed inning.

```
Pitches this inning: [15]

App shows: "Total: 72 pitches (57 + 15)"
```

**Pros:**
- Smaller numbers, easier to recall
- Can estimate if not watching closely

**Cons:**
- Requires more frequent entry
- Harder to verify against broadcast

### 3.3 Hybrid Approach (Default)

- Show cumulative pitch count from last known point
- User confirms or corrects
- App calculates difference

```javascript
function promptPitchCount(pitcher, currentInning) {
  const lastKnownCount = pitcher.pitchCount;
  const lastKnownInning = pitcher.lastPitchCountInning;

  return {
    prompt: `Pitch count for ${pitcher.name}`,
    subtext: `Last recorded: ${lastKnownCount} after inning ${lastKnownInning}`,
    inputType: 'cumulative',
    defaultValue: lastKnownCount,  // Pre-fill with last known
    minValue: lastKnownCount,      // Can't go down
    maxValue: lastKnownCount + 50  // Sanity check
  };
}
```

---

## 4. Per-Inning vs Cumulative

### 4.1 Data Storage

Always store **both** cumulative and per-inning:

```javascript
interface PitcherPitchCount {
  pitcherId: string;
  gameId: string;

  // Cumulative (primary)
  totalPitches: number;

  // Per-inning breakdown
  pitchesByInning: {
    1: number;
    2: number;
    // ... etc
  };

  // Tracking
  lastUpdatedInning: number;
  lastUpdatedOuts: number;
}
```

### 4.2 Calculating Per-Inning from Cumulative

```javascript
function calculateInningPitches(pitcher, inning, newCumulativeCount) {
  // Sum of all previous innings
  let previousTotal = 0;
  for (let i = 1; i < inning; i++) {
    previousTotal += pitcher.pitchesByInning[i] || 0;
  }

  // This inning = cumulative - previous
  const thisInningPitches = newCumulativeCount - previousTotal;

  // Validation
  if (thisInningPitches < 0) {
    throw new Error('Cumulative count cannot be less than previous innings');
  }
  if (thisInningPitches > 50) {
    // Warn user - unusually high for one inning
    warnUser('High pitch count for single inning. Please verify.');
  }

  return thisInningPitches;
}
```

---

## 5. UI Flow

### 5.1 Pitching Change Flow (Mandatory)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ PITCHING CHANGE - PITCH COUNT REQUIRED                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Outgoing Pitcher: Mike Simmons                                 │
│                                                                 │
│  Last recorded: 65 pitches (after 4th inning)                   │
│                                                                 │
│  Pitch count by inning:                                         │
│  ┌─────┬─────┬─────┬─────┬─────┐                                │
│  │ 1st │ 2nd │ 3rd │ 4th │ 5th │                                │
│  │ 14  │ 18  │ 12  │ 21  │ ?? │                                │
│  └─────┴─────┴─────┴─────┴─────┘                                │
│                                                                 │
│  Enter CURRENT pitch count: [____]                              │
│                                                                 │
│  💡 Check the broadcast or scoreboard for current count         │
│                                                                 │
│  ⚠️ Cannot proceed without pitch count.                         │
│                                                                 │
│                    [Confirm & Continue]                         │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 End-of-Inning Flow (Optional)

If `promptPerInning` is enabled:

```
┌─────────────────────────────────────────────────────────────────┐
│  END OF INNING - UPDATE PITCH COUNTS?                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cole (NYY): [72] pitches (was 65)                              │
│  Simmons (SF): [68] pitches (was 54)                            │
│                                                                 │
│         [Skip]                    [Update]                      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 End-of-Game Flow (Mandatory)

```
┌─────────────────────────────────────────────────────────────────┐
│  FINAL PITCH COUNTS                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  YANKEES PITCHERS:                                              │
│  Cole:     [98] pitches (6.0 IP)                                │
│  Powers:   [28] pitches (2.0 IP)                                │
│  Chapman:  [15] pitches (1.0 IP)                                │
│                                                                 │
│  GIANTS PITCHERS:                                               │
│  Simmons:  [72] pitches (4.2 IP)                                │
│  Webb:     [45] pitches (3.1 IP)                                │
│  Doval:    [12] pitches (1.0 IP)                                │
│                                                                 │
│  💡 Enter final pitch counts from box score                     │
│                                                                 │
│                    [Confirm & Finish Game]                      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 High Pitch Count Alert

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ HIGH PITCH COUNT ALERT                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cole has thrown approximately 100+ pitches                     │
│                                                                 │
│  Current estimate: ~102 pitches                                 │
│  (Based on average pitches per batter faced)                    │
│                                                                 │
│  Is this accurate?                                              │
│                                                                 │
│         [It's Close]              [Update Count: ____]          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Schema

### 6.1 Pitch Count Record

```typescript
interface PitchCountRecord {
  // Identity
  pitcherId: string;
  gameId: string;
  appearanceNumber: number;  // 1 for starter, 2+ for relievers

  // Cumulative
  totalPitches: number;

  // Per-inning (sparse - only innings pitched)
  pitchesByInning: Record<number, number>;

  // Batters faced (for estimation)
  battersFaced: number;

  // Tracking metadata
  entryMethod: 'cumulative' | 'per_inning' | 'estimated';
  lastVerifiedInning: number;
  estimateConfidence: 'high' | 'medium' | 'low';
}
```

### 6.2 Estimation System

When pitch count isn't entered, estimate based on batters faced:

```javascript
const PITCHES_PER_BATTER_ESTIMATE = {
  // By pitcher type
  starter: 3.9,      // Starters average ~3.9 pitches per batter
  reliever: 4.1,     // Relievers slightly higher (more strikeouts)

  // By event type (for better estimates)
  strikeout: 5.5,
  walk: 5.8,
  hit: 3.2,
  out_in_play: 3.0,
  home_run: 2.8
};

function estimatePitchCount(pitcher, events) {
  let estimate = 0;

  for (const event of events) {
    estimate += PITCHES_PER_BATTER_ESTIMATE[event.type] ||
                PITCHES_PER_BATTER_ESTIMATE[pitcher.role];
  }

  return Math.round(estimate);
}
```

---

## 7. Validation Rules

### 7.1 Sanity Checks

```javascript
const PITCH_COUNT_VALIDATION = {
  // Per-inning limits
  minPitchesPerInning: 3,      // At least 3 batters faced = 3 pitches minimum
  maxPitchesPerInning: 50,     // Extremely long inning cap
  warningPitchesPerInning: 30, // Warn if over 30 in one inning

  // Game limits
  maxPitchesPerGame: 150,      // Extremely rare to exceed
  warningPitchesPerGame: 120,  // Typical starter max

  // Per-batter limits
  minPitchesPerBatter: 1,      // First pitch out
  maxPitchesPerBatter: 20,     // Foul ball marathon
  averagePitchesPerBatter: 3.9
};

function validatePitchCount(newCount, pitcher, context) {
  const errors = [];
  const warnings = [];

  // Can't decrease
  if (newCount < pitcher.pitchCount) {
    errors.push('Pitch count cannot decrease');
  }

  // Per-inning check
  const inningPitches = newCount - pitcher.previousInningTotal;
  if (inningPitches > PITCH_COUNT_VALIDATION.maxPitchesPerInning) {
    errors.push(`${inningPitches} pitches in one inning seems too high`);
  } else if (inningPitches > PITCH_COUNT_VALIDATION.warningPitchesPerInning) {
    warnings.push(`${inningPitches} pitches is unusually high for one inning`);
  }

  // Game total check
  if (newCount > PITCH_COUNT_VALIDATION.maxPitchesPerGame) {
    errors.push(`${newCount} pitches exceeds reasonable game maximum`);
  } else if (newCount > PITCH_COUNT_VALIDATION.warningPitchesPerGame) {
    warnings.push(`${newCount} pitches is very high - please verify`);
  }

  return { isValid: errors.length === 0, errors, warnings };
}
```

### 7.2 Auto-Correction Suggestions

```javascript
function suggestCorrection(enteredCount, pitcher, context) {
  const estimated = estimatePitchCount(pitcher, context.events);
  const difference = Math.abs(enteredCount - estimated);

  if (difference > 20) {
    return {
      suggestion: `Did you mean ${estimated}? Your entry differs significantly from the estimate.`,
      confidence: 'low'
    };
  }

  return null;
}
```

---

## 8. Integration Points

### 8.1 pWAR Calculation

Pitch count is informational for pWAR, not directly used in calculation:

```javascript
// From PWAR_CALCULATION_SPEC.md
// Pitch count helps identify workload but doesn't affect FIP-based pWAR
```

### 8.2 Narrative Generation

```javascript
function generatePitchingNarrative(pitcher) {
  const { totalPitches, inningsPitched, strikeouts } = pitcher;

  if (totalPitches > 100) {
    return `${pitcher.name} labored through ${totalPitches} pitches over ${inningsPitched} innings.`;
  } else if (totalPitches / inningsPitched < 12) {
    return `${pitcher.name} was efficient, needing just ${totalPitches} pitches over ${inningsPitched} innings.`;
  }

  return `${pitcher.name}: ${inningsPitched} IP, ${strikeouts} K, ${totalPitches} pitches.`;
}
```

### 8.3 Manager Decision Context

```javascript
// High pitch count should influence manager evaluation
function shouldConsiderPitchingChange(pitcher, gameState) {
  const factors = {
    pitchCount: pitcher.pitchCount > 100,
    innings: pitcher.inningsPitched >= 6,
    fatigueIndicator: pitcher.lastInningPitches > 25,
    runsAllowed: pitcher.runsThisInning > 0
  };

  return Object.values(factors).filter(Boolean).length >= 2;
}
```

### 8.4 Season Totals

```javascript
interface SeasonPitchingStats {
  // ... other stats

  // Pitch count aggregates
  totalPitches: number;
  pitchesPerStart: number;      // For starters
  pitchesPerAppearance: number; // For relievers
  averagePitchesPerInning: number;

  // Efficiency
  pitchesPerBatterFaced: number;
}
```

---

## Appendix: Quick Reference

### Entry Timing Cheat Sheet

| Moment | Required? | Method |
|--------|-----------|--------|
| Game start | No | Starts at 0 |
| After each inning | Optional | Cumulative |
| Pitching change | **YES** | Cumulative |
| End of game | **YES** | Cumulative |
| High count alert | Prompted | Confirm/correct |

### Typical Pitch Counts

| Pitcher Type | Low | Average | High |
|--------------|-----|---------|------|
| Starter (complete game) | 90 | 105 | 130 |
| Starter (6 IP) | 80 | 95 | 115 |
| Reliever (1 IP) | 10 | 15 | 25 |
| Closer (1 IP) | 12 | 17 | 25 |

---

*Last Updated: January 22, 2026*
*Version: 1.0 - Initial pitch count tracking specification*
