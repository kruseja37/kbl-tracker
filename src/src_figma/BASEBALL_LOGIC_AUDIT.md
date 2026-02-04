# Baseball Logic Audit: Expected Rules vs Implementation

> **Created**: 2026-02-03
> **Updated**: 2026-02-03
> **Purpose**: Comprehensive comparison of real baseball rules against KBL Tracker's inferential engine
> **Status**: AUDIT DOCUMENT - Use for testing and implementation verification
> **Source Documents**:
>   - `RUNNER_ADVANCEMENT_RULES.md`
>   - `AUTO_CORRECTION_SYSTEM_SPEC.md`
>   - `ADAPTIVE_STANDARDS_ENGINE_SPEC.md`

---

## ⚠️ CRITICAL: SMB4 Game Limitations

> **IMPORTANT**: Super Mega Baseball 4 does NOT implement all real baseball mechanics.
> Several events that exist in real baseball **DO NOT EXIST** in SMB4.

| Event | In SMB4? | Implementation Notes |
|-------|----------|---------------------|
| **Dropped 3rd Strike (D3K)** | ⚠️ **CONDITIONAL** | Only on K + WP/PB (swing & miss, 2 strikes) |
| Balks | ❌ NO | No balk mechanic in game |
| Catcher Interference | ❌ NO | Not implemented |
| Obstruction | ❌ NO | Not implemented |
| Infield Fly Rule | ✅ YES | Called with R1+R2 or loaded, <2 outs |
| Ground Rule Double | ⚠️ RARE | May exist in some stadiums |

### D3K Implementation Decision

D3K in SMB4 is **LIMITED** to strikeouts with wild pitch or passed ball:
- D3K occurs ONLY on K + WP/PB (swing and miss with 2 strikes)
- Standard D3K rules apply: batter can reach if 1B empty OR 2 outs
- The recent D3K fixes ARE relevant for SMB4 tracking
- D3K should be handled as part of the K + WP/PB flow, not as a separate button

---

## Table of Contents

1. [SMB4 Limitations](#critical-smb4-game-limitations)
2. [Runner Advancement Rules](#1-runner-advancement-rules)
3. [Force Play Validation](#2-force-play-validation)
4. [Out Scenarios](#3-out-scenarios)
5. [Hit Scenarios](#4-hit-scenarios)
6. [Special Play Rules](#5-special-play-rules)
7. [Auto-Correction Rules](#6-auto-correction-rules)
8. [Button Availability Rules](#7-button-availability-rules)
9. [Opportunity Factor Scaling](#8-opportunity-factor-scaling)
10. [Situational Baseball (Leverage Index)](#9-situational-baseball-leverage-index)
11. [Implementation Status Matrix](#10-implementation-status-matrix)
12. [Identified Gaps](#11-identified-gaps)
13. [Test Scenarios](#12-test-scenarios)

---

## 1. Runner Advancement Rules

### 1.1 Force Play Rules

| Scenario | Expected Behavior | Implemented? | Location |
|----------|-------------------|--------------|----------|
| R1, ground ball | R1 FORCED to 2B (must run) | ✅ Yes | `runnerDefaults.ts:175-181` |
| R1+R2, ground ball | R1→2B, R2→3B (both forced) | ✅ Yes | `runnerDefaults.ts:175-195` |
| R1+R2+R3, ground ball | All forced, R3→home | ✅ Yes | `runnerDefaults.ts:175-195` |
| R2 only, ground ball | R2 NOT forced (can hold) | ⚠️ Partial | Defaults to advance, should offer hold option |
| R3 only, ground ball | R3 NOT forced (can hold) | ⚠️ Partial | Defaults to score with <2 outs |
| Walk with R1 | R1 forced to 2B | ✅ Yes | `runnerDefaults.ts:284-316` |
| Walk with R1+R2 | R1→2B, R2→3B (forced chain) | ✅ Yes | `runnerDefaults.ts:284-316` |
| Walk with R2 only | R2 NOT forced (stays) | ✅ Yes | `runnerDefaults.ts:305-307` |

### 1.2 Tag-Up Rules (Fly Balls)

| Scenario | Expected Behavior | Implemented? | Location |
|----------|-------------------|--------------|----------|
| R3, fly out, <2 outs | R3 CAN tag and score | ✅ Yes | `runnerDefaults.ts:205-207` |
| R3, fly out, 2 outs | R3 holds (play over if caught) | ✅ Yes | `runnerDefaults.ts:209-211` |
| R2, deep fly, <2 outs | R2 CAN tag to 3B | ✅ Yes | `runnerDefaults.ts:213-215` |
| R2, shallow fly, <2 outs | R2 likely holds | ✅ Yes | `runnerDefaults.ts:216-218` |
| R1, fly out | R1 rarely advances (holds) | ✅ Yes | `runnerDefaults.ts:220` |
| R3, foul fly out | R3 CAN tag (rare) | ⚠️ Partial | Defaults to hold, should offer tag option |

### 1.3 Hit Advancement Defaults

| Hit Type | R1 Default | R2 Default | R3 Default | Implemented? |
|----------|------------|------------|------------|--------------|
| Single (1B) | 1B→2B | 2B→3B | 3B→Home ✓ | ✅ Yes |
| Double (2B) | 1B→3B | 2B→Home ✓ | 3B→Home ✓ | ✅ Yes |
| Triple (3B) | 1B→Home ✓ | 2B→Home ✓ | 3B→Home ✓ | ✅ Yes |
| Home Run | All score | All score | All score | ✅ Yes |
| Infield Single | 1B→2B | 2B→3B | 3B→Home | ⚠️ Same as regular single |

**Note**: User can always override defaults via RunnerOutcomesDisplay.

---

## 2. Force Play Validation

> **Source**: RUNNER_ADVANCEMENT_RULES.md Section 10.3

### 2.1 The Force Detection Function

A runner is **FORCED** to advance when the batter becomes a runner AND there is no empty base behind them. The UI must NOT show "Hold" option for forced runners.

```typescript
/**
 * Determines if a runner is forced to advance.
 * Forced runners CANNOT hold - they MUST advance to the next base.
 */
function isForced(
  base: number,
  runners: { first: boolean; second: boolean; third: boolean },
  event: string
): boolean {
  // Walk/HBP/IBB: Batter is awarded 1B, creating force chain
  if (['WALK', 'HBP', 'IBB', 'BB'].includes(event)) {
    if (base === 1 && runners.first) return true;  // R1 always forced
    if (base === 2 && runners.first && runners.second) return true;  // Chain
    if (base === 3 && runners.first && runners.second && runners.third) return true;
  }

  // Single (1B): Same force chain as walk
  if (event === '1B') {
    if (base === 1 && runners.first) return true;
    if (base === 2 && runners.first && runners.second) return true;
    if (base === 3 && runners.first && runners.second && runners.third) return true;
  }

  // Double (2B): R1 and R2 must vacate
  if (event === '2B') {
    if (base === 1 && runners.first) return true;
    if (base === 2 && runners.second) return true;
  }

  // Triple (3B): All runners must vacate
  if (event === '3B') {
    if (base === 1 && runners.first) return true;
    if (base === 2 && runners.second) return true;
    if (base === 3 && runners.third) return true;
  }

  return false;
}
```

### 2.2 Force Situation Examples

| Event | Base State | R1 Forced? | R2 Forced? | R3 Forced? |
|-------|------------|------------|------------|------------|
| WALK  | R1         | **YES**    | -          | -          |
| WALK  | R2         | -          | NO (1B empty) | -       |
| WALK  | R1+R2      | **YES**    | **YES**    | -          |
| WALK  | R1+R3      | **YES**    | -          | NO (2B empty) |
| WALK  | R2+R3      | -          | NO         | NO         |
| WALK  | Loaded     | **YES**    | **YES**    | **YES**    |
| 1B    | R1         | **YES**    | -          | -          |
| 2B    | R1         | **YES**    | -          | -          |
| 2B    | R2         | -          | **YES**    | -          |

### 2.3 Validation Rules (Prevent Impossible States)

```typescript
function validateRunnerOutcomes(result, bases, outcomes) {
  const errors = [];

  // RULE 1: On BB/IBB/HBP, forced runners MUST advance
  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (bases.first && outcomes.first === 'HELD') {
      errors.push('R1 cannot hold on walk - forced to advance');
    }
    if (bases.first && bases.second && outcomes.second === 'HELD') {
      errors.push('R2 cannot hold on walk with R1 - forced to advance');
    }
    if (bases.first && bases.second && bases.third && outcomes.third === 'HELD') {
      errors.push('R3 cannot hold on walk with bases loaded - forced to advance');
    }
  }

  // RULE 2: On 1B, R1 cannot hold
  if (result === '1B' && bases.first && outcomes.first === 'HELD') {
    errors.push('R1 cannot hold on single - batter takes 1B');
  }

  // RULE 3: On 2B, R1 and R2 cannot hold
  if (result === '2B') {
    if (bases.first && ['HELD', 'TO_2B'].includes(outcomes.first)) {
      errors.push('R1 must advance past 2B on double');
    }
    if (bases.second && outcomes.second === 'HELD') {
      errors.push('R2 cannot hold on double - batter takes 2B');
    }
  }

  // RULE 4: On 3B, all runners must score or be out
  if (result === '3B') {
    for (const [base, runner] of Object.entries(bases)) {
      if (runner && !['SCORED', 'OUT'].includes(outcomes[base])) {
        errors.push(`${base} must score or be out on triple`);
      }
    }
  }

  return errors;
}
```

### 2.4 UI Decision Tree

| Event Type | Forced Runners | UI Behavior |
|------------|----------------|-------------|
| Walk/HBP with forced runners | AUTO | No selection needed - auto-advance |
| Walk/HBP with non-forced runners | OPTIONAL | Show Hold/Advance options |
| Single with R1 | R1 FORCED | R1 auto to 2B+; R2/R3 choose |
| Double with R1+R2 | R1+R2 FORCED | R1/R2 must advance; R3 chooses |
| Triple | ALL FORCED | All must score or be out |
| Fly Out | NONE | Tag-up rules apply (different) |

### 2.5 Implementation Status

| Rule | Implemented? | Location | Notes |
|------|--------------|----------|-------|
| `isForced()` function | ❌ Not in runnerDefaults.ts | - | Should add |
| Walk auto-advance | ⚠️ Partial | `runnerDefaults.ts` | Calculates defaults but UI still shows Hold |
| Forced runner UI hide | ❌ | - | UI shows all options |
| Validation on submit | ❌ | - | No validation currently |

### 1.4 Error Advancement

| Scenario | Expected Behavior | Implemented? |
|----------|-------------------|--------------|
| Error, batter | Batter reaches 1B | ✅ Yes |
| Error, R1 | R1 advances extra base (to 3B typical) | ⚠️ Partial - defaults to 2B |
| Error, R2 | R2 likely scores | ⚠️ Partial - defaults to 3B |
| Error, R3 | R3 scores | ✅ Yes |

---

## 3. Out Scenarios

### 3.1 Ground Out Scenarios

| Scenario | Expected Outcome | Batter | Runners | Implemented? |
|----------|-----------------|--------|---------|--------------|
| GO, no runners | Batter out | Out | - | ✅ Yes |
| GO, R1 only, <2 outs | DP likely (6-4-3, etc.) | Out | R1 out | ✅ Yes |
| GO, R1 only, 2 outs | Single out at 1B | Out | R1→2B | ⚠️ Should check - might incorrectly DP |
| GO, R3 only, <2 outs | Productive out, R3 scores | Out | R3 scores | ✅ Yes |
| GO, R3 only, 2 outs | R3 holds (inning could end) | Out | R3 holds | ✅ Yes |
| GO, R1+R3, <2 outs | DP, R3 may score | Out | R1 out, R3 scores | ⚠️ Partial |

### 3.2 Fly Out Scenarios

| Scenario | Expected Outcome | Implemented? |
|----------|-----------------|--------------|
| FO, deep OF, R3, <2 outs | R3 tags and scores (sac fly) | ✅ Yes |
| FO, shallow OF, R3, <2 outs | R3 holds (too risky) | ✅ Yes |
| FO, any depth, R3, 2 outs | R3 holds (game on line) | ✅ Yes |
| FO, deep OF, R2, <2 outs | R2 tags to 3B | ✅ Yes |
| FO to foul territory | No tag-up opportunity typically | ✅ Yes |

### 3.3 Strikeout Scenarios

> ⚠️ **D3K in SMB4**: Only occurs on K + WP/PB (swing and miss with 2 strikes).

| Scenario | Expected Outcome | Implemented? | Notes |
|----------|-----------------|--------------|-------|
| K swinging | Batter out, runners hold | ✅ Yes | |
| K looking (Ꝅ) | Batter out, runners hold | ✅ Yes | |
| K + WP/PB, 1B empty | Batter can reach 1B (D3K) | ✅ Yes | D3K via WP/PB flow |
| K + WP/PB, R1, <2 outs | Batter OUT (D3K not legal) | ✅ Yes | Fixed recently |
| K + WP/PB, R1, 2 outs | Batter can reach 1B | ✅ Yes | D3K legal with 2 outs |
| K + WP/PB | Runners advance 1 base | ✅ Yes | Handled via OTHER→WP/PB |

**Implementation Note**: D3K should be part of the K + WP/PB combined flow, not a separate standalone button.

### 3.4 Double Play Scenarios

| Sequence | Name | When Legal | Implemented? |
|----------|------|------------|--------------|
| 6-4-3 | SS→2B→1B | R1, <2 outs | ✅ Yes |
| 4-6-3 | 2B→SS→1B | R1, <2 outs | ✅ Yes |
| 5-4-3 | 3B→2B→1B | R1, <2 outs | ✅ Yes |
| 3-6-3 | 1B→SS→1B | R1, <2 outs | ✅ Yes |
| 1-6-3 | P→SS→1B | R1, <2 outs | ✅ Yes |
| 1-4-3 | P→2B→1B | R1, <2 outs | ✅ Yes |
| 5-3 | 3B→1B (no DP) | Any | ✅ Yes |
| Line drive DP | Catch + doubled off | R1/R2 off base | ❌ Not implemented |

### 3.5 Fielder's Choice

| Scenario | Expected Outcome | Implemented? |
|----------|-----------------|--------------|
| FC, throw to 2B | Batter safe at 1B, R1 out | ✅ Yes |
| FC, throw to 3B | Batter safe at 1B, R2 out | ✅ Yes |
| FC, throw home | Batter safe at 1B, R3 out | ✅ Yes |

---

## 4. Hit Scenarios

### 4.1 Hit Type by Location (Inference)

| Ball Location (y) | Suggested Hit | Confidence | Implemented? |
|-------------------|---------------|------------|--------------|
| y < 0.35 (infield) | 1B (infield hit) | 85% | ✅ Yes |
| 0.35 ≤ y < 0.55 | 1B | 75% | ✅ Yes |
| 0.55 ≤ y < 0.75 | 1B | 60% | ✅ Yes |
| 0.75 ≤ y < 0.90 | 2B | 70% | ✅ Yes |
| 0.90 ≤ y < 1.0 | 3B | 60% | ✅ Yes |
| y ≥ 1.0 (stands) | HR | 100% | ✅ Yes |

### 4.2 Home Run Classification

| HR Depth (y) | Classification | Implemented? |
|--------------|----------------|--------------|
| 1.0 ≤ y < 1.1 | Wall scraper | ✅ Yes |
| 1.1 ≤ y < 1.25 | Deep | ✅ Yes |
| y ≥ 1.25 | Bomb | ✅ Yes |

---

## 5. Special Play Rules

> **Note**: See [SMB4 Limitations](#critical-smb4-game-limitations) - several events below do NOT exist in SMB4.

### 5.1 Infield Fly Rule (IFR) - ✅ IN SMB4

| Condition | Expected | Implemented? |
|-----------|----------|--------------|
| R1+R2 or bases loaded | IFR applicable | ⚠️ UI toggle exists, logic unclear |
| <2 outs | IFR applicable | ⚠️ UI toggle exists |
| Fair fly ball catchable by infielder | Auto-out called | ❌ Not auto-detected |
| IFR called, ball dropped | Batter still out, runners can advance | ❌ Not implemented |

### 5.2 Ground Rule Double (GRD) - ⚠️ RARE IN SMB4

| Condition | Expected | Implemented? |
|-----------|----------|--------------|
| Ball bounces over fence | 2B awarded | ⚠️ UI toggle exists |
| Runners advance 2 bases from time of pitch | - | ❌ Not auto-calculated |

### 5.3 Balk - ❌ NOT IN SMB4

> ⚠️ **DO NOT IMPLEMENT** - Balks do not exist in SMB4.

| Condition | Expected | Implemented? |
|-----------|----------|--------------|
| Balk called | All runners advance 1 base | N/A - Not in SMB4 |

### 5.4 Interference/Obstruction - ❌ NOT IN SMB4

> ⚠️ **DO NOT IMPLEMENT** - These events do not exist in SMB4.

| Type | Expected | Implemented? |
|------|----------|--------------|
| Catcher's interference | Batter to 1B | N/A - Not in SMB4 |
| Runner interference | Runner out | N/A - Not in SMB4 |
| Fielder obstruction | Runner awarded base | N/A - Not in SMB4 |

---

## 5. Auto-Correction Rules

> **Source**: AUTO_CORRECTION_SYSTEM_SPEC.md

### 5.1 Design Principle

**Infer user intent, don't punish mistakes.** If the user's inputs clearly indicate a specific play, auto-correct the result type rather than requiring re-entry.

### 5.2 GO → DP Auto-Correction

**Trigger Conditions:**
- User selects `GO` (Ground Out)
- At least one runner outcome is OUT
- Total outs recorded = 2

**Implementation:**
```typescript
if (result === 'GO' && runnerOutsCount >= 1 && totalOutsRecorded === 2) {
  result = 'DP';
  showMessage('Auto-corrected to Double Play (2 outs recorded)');
}
```

| Status | Notes |
|--------|-------|
| ❌ Not implemented | Should add to play completion |

### 5.3 FO → SF Auto-Correction

**Trigger Conditions:**
- User selects `FO` (Fly Out)
- Runner was on 3rd base
- R3 outcome = `SCORED`
- Less than 2 outs before the play

**Implementation:**
```typescript
if (result === 'FO' && outs < 2 && bases.third && runnerOutcomes.third === 'SCORED') {
  result = 'SF';
  showMessage('Auto-corrected to Sac Fly');
}
```

| Status | Notes |
|--------|-------|
| ✅ Implemented | Already in AtBatFlow.tsx |

### 5.4 Force Out Negates Runs Rule

**When the 3rd out is a force out, ALL runs on that play are negated.**

```typescript
if (outsAfterPlay === 3 && isForceOut(thirdOutRunner)) {
  const runsToNegate = countRunsScored(runnerOutcomes);
  if (runsToNegate > 0) {
    showWarning(`${runsToNegate} run(s) negated - force out for 3rd out`);
    negateRuns();
  }
}
```

| Status | Notes |
|--------|-------|
| ❌ Not implemented | Critical baseball rule |

### 5.5 HR Distance Validation

**Minimum distances by direction:**

| Direction | Min Distance | Max Distance |
|-----------|--------------|--------------|
| Left | 315 ft | 550 ft |
| Left-Center | 350 ft | 550 ft |
| Center | 380 ft | 550 ft |
| Right-Center | 350 ft | 550 ft |
| Right | 315 ft | 550 ft |

| Status | Notes |
|--------|-------|
| ❌ Not implemented | BUG-011 in spec |

---

## 6. Button Availability Rules

> **Source**: AUTO_CORRECTION_SYSTEM_SPEC.md

### 6.1 Currently Implemented

| Button | Disabled When |
|--------|---------------|
| SAC | 2 outs |
| SF | 2 outs OR no R3 |
| DP | 2 outs OR no runners |
| D3K | ❌ **REMOVE** - Not in SMB4 |

### 6.2 Missing Button Disable Rules

> **BUG-013**: These buttons should be disabled when no runners on base.

| Button | Should Disable When | Status |
|--------|---------------------|--------|
| Steal | No runners on base | ❌ Not implemented |
| CS | No runners on base | ❌ Not implemented |
| WP | No runners on base | ❌ Not implemented |
| PB | No runners on base | ❌ Not implemented |
| Pickoff | No runners on base | ❌ Not implemented |
| ~~Balk~~ | **REMOVE** - Not in SMB4 | N/A |

**Implementation:**
```typescript
const hasRunners = bases.first || bases.second || bases.third;

<button disabled={!hasRunners}>Steal</button>
<button disabled={!hasRunners}>CS</button>
<button disabled={!hasRunners}>WP</button>
<button disabled={!hasRunners}>PB</button>
<button disabled={!hasRunners}>Pickoff</button>
// Remove Balk button entirely
```

---

## 7. Opportunity Factor Scaling

> **Source**: ADAPTIVE_STANDARDS_ENGINE_SPEC.md

### 7.1 What Is Opportunity Factor?

Combines game count AND innings per game into a single scaling multiplier for counting stats.

```typescript
const opportunityFactor = (gamesPerTeam × inningsPerGame) / (162 × 9);
```

### 7.2 Example Scaling

| Season Config | Opportunity Factor |
|---------------|-------------------|
| 50g × 9inn | 0.309 (30.9% of MLB) |
| 50g × 7inn | 0.240 (24.0% of MLB) |
| 128g × 9inn | 0.790 (79.0% of MLB) |
| 162g × 9inn | 1.000 (100% of MLB) |

### 7.3 What Scales vs What Doesn't

| Stat Type | Scales? | Reason |
|-----------|---------|--------|
| Counting stats (HR, Hits, RBI) | ✅ Yes | Accumulate over innings |
| Rate stats (AVG, ERA, OBP) | ❌ No | Already per-opportunity normalized |
| Per-9 stats (K/9, HR/9) | ❌ No | Already per-inning normalized |
| Games played thresholds | ✅ Yes (game factor only) | Based on games |

### 7.4 SMB4 Baselines (Differ from MLB)

| Stat | SMB4 Baseline | MLB Baseline |
|------|---------------|--------------|
| League AVG | .288 | .250 |
| League ERA | 4.04 | 4.25 |
| League OBP | .329 | .320 |
| League SLG | .448 | .400 |

### 7.5 Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Opportunity factor calculation | ⚠️ | In spec, not in GameTracker |
| SMB4 defaults | ✅ | In ADAPTIVE_STANDARDS_ENGINE_SPEC |
| Counting stat scaling | ❌ | Not implemented |
| Rate stat thresholds | ❌ | Not implemented |

---

## 8. Situational Baseball (Leverage Index)

### 8.1 Base-Out States

| Bases | Outs=0 | Outs=1 | Outs=2 | Implemented? |
|-------|--------|--------|--------|--------------|
| Empty | 1.00 | 0.84 | 0.52 | ✅ Via `getBaseOutLI()` |
| R1 | 1.58 | 1.17 | 0.80 | ✅ |
| R2 | 2.07 | 1.43 | 0.96 | ✅ |
| R1+R2 | 2.29 | 1.64 | 1.08 | ✅ |
| R3 | 2.35 | 1.78 | 0.76 | ✅ |
| R1+R3 | 2.67 | 2.01 | 0.95 | ✅ |
| R2+R3 | 3.00 | 2.05 | 1.05 | ✅ |
| Loaded | 2.86 | 2.14 | 1.35 | ✅ |

### 8.2 Fame Adjustments by LI

| Formula | Implemented? | Location |
|---------|--------------|----------|
| `adjustedFame = baseFame × √LI` | ✅ Yes | `useGameState.ts:732` |
| Playoff multiplier (future) | ❌ Not yet | - |

### 8.3 Clutch Situations

| Situation | Definition | Implemented? |
|-----------|------------|--------------|
| High leverage (LI > 2.0) | Critical at-bat | ⚠️ Calculated but not flagged |
| Late & close | 7th+ inning, ≤2 run diff | ❌ Not implemented |
| RISP | Runners in scoring position | ⚠️ Calculated for stats, not UI |
| Bases loaded | Maximum pressure | ✅ LI reflects this |
| 2 outs, full count | High tension | ❌ Count not in LI |

---

## 9. Implementation Status Matrix

### Legend
- ✅ Fully implemented and tested
- ⚠️ Partially implemented or needs verification
- ❌ Not implemented
- 🔄 In progress
- ~~N/A~~ Not applicable (not in SMB4)

### Runner Defaults (`runnerDefaults.ts`)

| Function | Status | Notes |
|----------|--------|-------|
| `calculateRunnerDefaults()` | ✅ | Main dispatcher |
| `calculateHitDefaults()` | ✅ | 1B/2B/3B scenarios |
| `calculateHomeRunDefaults()` | ✅ | All score |
| `calculateOutDefaults()` | ⚠️ | DP logic may over-trigger |
| `calculateErrorDefaults()` | ⚠️ | Conservative advancement |
| `calculateFoulOutDefaults()` | ✅ | Runners hold |
| `calculateWalkDefaults()` | ✅ | Force advancement only |
| `calculateFieldersChoiceDefaults()` | ✅ | One runner out |
| `calculateD3KDefaults()` | ✅ | Used for K + WP/PB scenarios |
| `isForced()` | ❌ | Should add - validation function |

### Play Classifier (`playClassifier.ts`)

| Function | Status | Notes |
|----------|--------|-------|
| `classifyPlay()` | ✅ | Main router |
| `classifyHomeRun_internal()` | ✅ | HR detection |
| `classifyFoulPlay()` | ✅ | Foul out vs ball |
| `classifyFieldedBall()` | ✅ | Routes to single/multi |
| `classifySingleFielderOut()` | ✅ | FO/LO detection |
| `classifyMultiFielderOut()` | ✅ | GO/DP/TP detection |
| `classifyHit()` | ✅ | Hit type inference |
| Auto-complete patterns | ✅ | 6-4-3, 4-6-3, etc. |
| Special event prompts | ✅ | WEB_GEM, ROBBERY, etc. |
| GO → DP auto-correction | ❌ | Should add |
| FO → SF auto-correction | ✅ | Already implemented |

### Game State (`useGameState.ts`)

| Feature | Status | Notes |
|---------|--------|-------|
| `recordHit()` | ✅ | With RunnerAdvancement |
| `recordOut()` | ✅ | With RunnerAdvancement |
| `recordWalk()` | ✅ | Force advancement |
| `recordEvent()` | ⚠️ | Fame calculation done, storage TODO |
| `advanceRunner()` | ✅ | Manual runner moves |
| Leverage Index calculation | ✅ | `getBaseOutLI()` |
| Fame adjustment | ✅ | `√LI` multiplier |

---

## 10. Identified Gaps

### 10.1 Critical Gaps (MUST Fix for SMB4)

| Gap | Impact | Suggested Fix | Priority |
|-----|--------|---------------|----------|
| **Remove Balk** | Balk not in SMB4 | Remove button | 🔴 HIGH |
| **D3K flow clarification** | D3K only via K+WP/PB | Ensure D3K is part of WP/PB flow | 🟡 MEDIUM |
| DP with 2 outs | May incorrectly suggest DP | Check `outs < 2` before DP | 🟡 MEDIUM |
| GO → DP auto-correct | User must manually change | Add auto-correction | 🟡 MEDIUM |
| Force out negates runs | Not validated | Check 3rd out force | 🟡 MEDIUM |
| Button disable (no runners) | WP/PB/SB enabled without runners | Add `hasRunners` check | 🟡 MEDIUM |

### 10.2 Important Gaps (Should Fix)

| Gap | Impact | Suggested Fix |
|-----|--------|---------------|
| `isForced()` validation | Invalid states possible | Add validation function |
| Forced runner UI | Shows "Hold" for forced runners | Hide invalid options |
| Line drive DP | Not detected | Add catch + tag sequence |
| Error advancement | Too conservative | R1→3B, R2→home defaults |
| Non-force runner holds | Always defaults to advance | Add "hold" for R2/R3 on GO |

### 10.3 Nice to Have (Low Priority)

| Feature | Status | Notes |
|---------|--------|-------|
| Infield Fly Rule auto-detection | ❌ | IN SMB4 but rare |
| Ground Rule Double calculation | ❌ | RARE in SMB4 |
| ~~Balk handling~~ | N/A | **NOT IN SMB4** |
| ~~Interference calls~~ | N/A | **NOT IN SMB4** |
| Sacrifice bunt detection | ⚠️ | Worth adding |
| Squeeze play detection | ❌ | Low value |
| Hit-and-run inference | ❌ | Low value |

### 10.4 UI/UX Gaps

| Gap | Current Behavior | Expected |
|-----|------------------|----------|
| Runner hold option | Must drag to override | Tap to toggle hold/advance |
| Tag-up indicator | Not shown | Show "can tag" on fly balls |
| Force indicator | Not shown | Highlight forced runners |
| DP potential indicator | Not shown | Show when R1 and <2 outs |
| D3K handling | Separate from WP/PB | Should be part of K+WP/PB flow |
| **Balk button** | Exists | **REMOVE** - Not in SMB4 |

---

## 11. Test Scenarios

### 11.1 Must-Pass Scenarios (SMB4)

> ⚠️ D3K tests removed - D3K does not exist in SMB4.

| # | Scenario | Expected Result | Status |
|---|----------|-----------------|--------|
| 1 | Single, R3 | R3 scores, batter to 1B | ✅ |
| 2 | Single, R1 | R1 to 2B, batter to 1B | ✅ |
| 3 | Double, R1 | R1 to 3B, batter to 2B | ✅ |
| 4 | HR, bases loaded | 4 runs score | ✅ |
| 5 | GO 6-3, no runners | Batter out | ✅ |
| 6 | GO 6-4-3, R1, 0 outs | DP: batter out, R1 out | ✅ |
| 7 | GO 6-4-3, R1, 2 outs | Single out (no DP with 2 outs) | ⚠️ TEST |
| 8 | FO deep, R3, 1 out | R3 tags and scores | ✅ |
| 9 | FO shallow, R3, 1 out | R3 holds | ✅ |
| 10 | K swinging | Batter OUT, runners hold | ✅ |
| 11 | K looking | Batter OUT, runners hold | ✅ |
| 12 | K + WP | Batter OUT, runners advance | ⚠️ TEST |
| 13 | Walk, R1 | R1 forced to 2B | ✅ |
| 14 | Walk, R2 only | R2 stays (not forced) | ✅ |
| 15 | Walk, bases loaded | R3 scores (forced) | ✅ |
| 16 | FC to 2B, R1 | R1 out, batter safe | ✅ |
| 17 | Error, R2 | R2 advances (to 3B or home) | ⚠️ TEST |
| 18 | User changes R3 to OUT | Persists after End At-Bat | ✅ |
| 19 | TBL (TOOTBLAN) | Runner OUT on bases | ✅ |
| 20 | WP/PB | All runners advance 1 base | ✅ |

### 11.2 Force Validation Scenarios (NEW)

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 21 | Walk, R1 shows options | R1 should AUTO-advance (no Hold) | ⚠️ TEST |
| 22 | Single, R1+R2 | R1 forced to 2B+ (no Hold) | ⚠️ TEST |
| 23 | Double, R1 | R1 must go to 3B+ (cannot stay at 2B) | ⚠️ TEST |
| 24 | Walk, R2 only | R2 CAN hold (not forced) | ⚠️ TEST |
| 25 | Walk, R1+R3 | R1 forced, R3 can choose | ⚠️ TEST |

### 11.3 Edge Case Scenarios

| # | Scenario | Expected | Notes |
|---|----------|----------|-------|
| 26 | GO, R3 only, 0 outs | R3 scores (productive) | Test |
| 27 | GO, R3 only, 2 outs | R3 holds | Test |
| 28 | FO foul territory, R3 | R3 can tag (rare) | Low priority |
| 29 | Triple, R1 | R1 scores | Test |
| 30 | Inside-park HR | All score, batter to home | Test |
| 31 | GO, R1+R3, 0 outs | DP, R3 may score | Complex |
| 32 | SF, R3 | R3 scores, batter out, RBI | Test |
| 33 | Bases loaded walk | R3 scores, others advance | ✅ |

### 11.4 Button Availability Tests (NEW)

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 34 | No runners | SB/CS/WP/PB disabled | ⚠️ TEST |
| 35 | R1 only | SB/CS/WP/PB enabled | ⚠️ TEST |
| 36 | 2 outs | SAC/SF/DP disabled | ⚠️ TEST |
| 37 | K + WP/PB, 1B empty | D3K: batter can reach | ✅ |
| 38 | K + WP/PB, R1, 1 out | D3K illegal: batter OUT | ✅ |
| 39 | K + WP/PB, R1, 2 outs | D3K legal: batter can reach | ✅ |
| 40 | Balk button | Should NOT exist | ⚠️ REMOVE |

---

## Appendix A: Position Numbers

| # | Position | Abbreviation |
|---|----------|--------------|
| 1 | Pitcher | P |
| 2 | Catcher | C |
| 3 | First Base | 1B |
| 4 | Second Base | 2B |
| 5 | Third Base | 3B |
| 6 | Shortstop | SS |
| 7 | Left Field | LF |
| 8 | Center Field | CF |
| 9 | Right Field | RF |

## Appendix B: Fame Values

| Event | Base Fame | Notes |
|-------|-----------|-------|
| WEB_GEM | +1.0 | Spectacular catch |
| ROBBERY | +1.5 | HR denied at wall |
| TOOTBLAN | -3.0 | Baserunning blunder |
| KILLED_PITCHER | +3.0 | Knocked pitcher down |
| NUT_SHOT | +1.0 | Hit sensitive area |
| Diving Catch | +1.0 | Via WG subtype |
| Robbed HR | +2.0 | Via ROBBERY |
| Error | -1.0 | Any error type |

---

## Appendix C: Key Action Items Summary

### 🔴 CRITICAL (Must Do for SMB4)

| Action | Location | Effort |
|--------|----------|--------|
| **Remove Balk option** | OTHER events list | Low |
| **Remove CI/Obstruction** | If present | Low |
| Ensure D3K is part of K+WP/PB flow | GameTracker | Medium |

### 🟡 HIGH PRIORITY (Should Do)

| Action | Location | Effort |
|--------|----------|--------|
| Add `isForced()` function | runnerDefaults.ts | Medium |
| Hide "Hold" option for forced runners | Runner UI | Medium |
| Disable WP/PB/SB/CS with no runners | Event buttons | Low |
| Add GO → DP auto-correction | playClassifier.ts | Medium |
| Add force out 3rd out run negation | useGameState.ts | High |

### 🟢 LOW PRIORITY (Nice to Have)

| Action | Location | Effort |
|--------|----------|--------|
| IFR auto-detection | playClassifier.ts | High |
| GRD runner advancement | runnerDefaults.ts | Medium |
| HR distance validation | FieldingModal.tsx | Low |
| Tag-up indicators | Runner UI | Medium |

---

## Appendix D: Source Documents Referenced

| Document | Key Findings |
|----------|--------------|
| `RUNNER_ADVANCEMENT_RULES.md` | SMB4 limitations, force play rules, `isForced()` function |
| `AUTO_CORRECTION_SYSTEM_SPEC.md` | GO→DP, FO→SF auto-correction, button availability |
| `ADAPTIVE_STANDARDS_ENGINE_SPEC.md` | Opportunity Factor, SMB4 baselines (.288 AVG, 4.04 ERA) |

---

*Last Updated: 2026-02-03*
*End of Audit Document*
