# Runner Advancement Rules - Complete Reference
## What Movements Are Legally Possible in Baseball

**Created:** January 21, 2026
**Updated:** January 22, 2026
**Purpose:** Define ALL legal/illegal runner movements to prevent impossible UI states
**Integration:** FIELD_ZONE_INPUT_SPEC.md, INHERITED_RUNNERS_SPEC.md

---

## ⚠️ SMB4 Game Limitations

> **IMPORTANT:** Super Mega Baseball 4 does NOT implement all real baseball mechanics.
> The following events **DO NOT EXIST** in SMB4 and should NOT be tracked:

| Event | In SMB4? | Notes |
|-------|----------|-------|
| Balks | ❌ NO | No balk mechanic in game |
| Catcher Interference | ❌ NO | Not implemented |
| Infield Fly Rule | ✅ YES | Called with R1+R2 or loaded, <2 outs |
| Ground Rule Double | ⚠️ RARE | May exist in some stadiums |
| Obstruction | ❌ NO | Not implemented |
| Dropped 3rd Strike | ✅ YES | Batter can run to 1B if unoccupied (or 2 outs) |

**Events that ARE in SMB4:**
- Hits (1B, 2B, 3B, HR)
- Walks (BB, IBB)
- Hit By Pitch (HBP)
- Strikeouts (K)
- Ground outs, Fly outs, Line outs, Pop outs
- Double plays, Triple plays
- Fielder's Choice
- Errors (fielding and throwing)
- Wild Pitch / Passed Ball
- Stolen Bases / Caught Stealing
- Sacrifice Flies, Sacrifice Bunts

---

## Table of Contents

1. [Core Principle: Force Plays](#core-principle-force-plays)
2. [Walk/HBP/IBB Scenarios](#walkhbpibb-scenarios)
3. [Hit Scenarios](#hit-scenarios)
4. [Out Scenarios](#out-scenarios)
5. [Wild Pitch / Passed Ball](#5-wild-pitch--passed-ball)
6. [Stolen Bases](#6-stolen-bases)
7. [~~Balks~~](#7-balks) *(NOT IN SMB4)*
8. [Error Advancement](#8-error-advancement)
9. [Special Situations](#9-special-situations)
10. [Implementation Matrix](#implementation-matrix)

---

## Core Principle: Force Plays

### What is a Force?

A runner is **FORCED** to advance when:
- The batter becomes a runner (hit, walk, HBP, etc.)
- AND there is no empty base behind them

### The Chain Rule

Forces create a **chain** from 1st base forward:
- Batter ALWAYS forces R1 (runner on 1st)
- R1 forces R2 ONLY IF R1 is forced (i.e., batter reached)
- R2 forces R3 ONLY IF R2 is forced (i.e., R1 was forced)

### Key Insight

**A forced runner CANNOT stay on their current base.** They MUST either:
1. Advance to the next base safely
2. Be put out at the next base
3. Advance beyond the next base (if possible)

---

## Walk/HBP/IBB Scenarios

On a walk, HBP, or IBB, the batter is awarded 1st base. This creates MANDATORY forces.

### Scenario: Runner on 1st Only

| Runner | Legal Options | Illegal Options |
|--------|---------------|-----------------|
| R1 | To 2B (forced) | ❌ Held 1B (impossible - batter takes 1B) |
| Batter | To 1B (automatic) | N/A |

**Implementation:** R1 auto-advances to 2B. No user choice needed.

### Scenario: Runners on 1st and 2nd

| Runner | Legal Options | Illegal Options |
|--------|---------------|-----------------|
| R2 | To 3B (forced) | ❌ Held 2B (R1 is coming) |
| R1 | To 2B (forced) | ❌ Held 1B (batter takes 1B) |
| Batter | To 1B (automatic) | N/A |

**Implementation:** Both runners auto-advance. No user choice needed.

### Scenario: Bases Loaded

| Runner | Legal Options | Illegal Options |
|--------|---------------|-----------------|
| R3 | Scores (forced) | ❌ Held 3B (R2 is coming) |
| R2 | To 3B (forced) | ❌ Held 2B (R1 is coming) |
| R1 | To 2B (forced) | ❌ Held 1B (batter takes 1B) |
| Batter | To 1B (automatic) | N/A |

**Implementation:** All runners auto-advance. R3 scores. No user choice needed.

### Scenario: Runner on 2nd Only

| Runner | Legal Options | Illegal Options |
|--------|---------------|-----------------|
| R2 | Held 2B, To 3B | ❌ None - both are legal |
| Batter | To 1B (automatic) | N/A |

**Implementation:** R2 has a choice - they're NOT forced (no one behind them).

### Scenario: Runner on 3rd Only

| Runner | Legal Options | Illegal Options |
|--------|---------------|-----------------|
| R3 | Held 3B, Scores | ❌ None - both are legal |
| Batter | To 1B (automatic) | N/A |

**Implementation:** R3 has a choice - they're NOT forced.

### Scenario: Runners on 1st and 3rd

| Runner | Legal Options | Illegal Options |
|--------|---------------|-----------------|
| R3 | Held 3B, Scores | ❌ None - not forced (2B empty) |
| R1 | To 2B (forced) | ❌ Held 1B |
| Batter | To 1B (automatic) | N/A |

**Implementation:** R1 auto-advances. R3 has choice.

### Scenario: Runners on 2nd and 3rd

| Runner | Legal Options | Illegal Options |
|--------|---------------|-----------------|
| R3 | Held 3B, Scores | ❌ None - not forced |
| R2 | Held 2B, To 3B | ❌ None - not forced |
| Batter | To 1B (automatic) | N/A |

**Implementation:** Both runners have choices - neither is forced (1B was empty).

---

## Hit Scenarios

On hits, batter reaches base. Runners have more options but still obey force rules.

### Single (1B)

Batter reaches 1st. Creates force chain from 1st.

| Base State | R1 Options | R2 Options | R3 Options |
|------------|------------|------------|------------|
| R1 only | To 2B, To 3B, Scores, Out | N/A | N/A |
| R2 only | N/A | Held, To 3B, Scores, Out | N/A |
| R3 only | N/A | N/A | Held, Scores, Out |
| R1 + R2 | To 2B, To 3B, Scores, Out | To 3B, Scores, Out | N/A |
| R1 + R3 | To 2B, To 3B, Scores, Out | N/A | Held, Scores, Out |
| R2 + R3 | N/A | Held, To 3B, Scores, Out | Held, Scores, Out |
| Loaded | To 2B, To 3B, Scores, Out | To 3B, Scores, Out | Scores, Out |

**Key Rules for Singles:**
- R1 CANNOT hold (batter takes 1B) - must advance at least to 2B
- R2 can hold IF R1 is not coming to 2B (i.e., R1 went to 3B or scored or out)
- R3 can hold IF R2 is not coming to 3B

### Double (2B)

Batter reaches 2nd. R1 and R2 MUST vacate.

| Base State | R1 Options | R2 Options | R3 Options |
|------------|------------|------------|------------|
| R1 only | To 3B, Scores, Out | N/A | N/A |
| R2 only | N/A | To 3B, Scores, Out | N/A |
| R3 only | N/A | N/A | Held, Scores, Out |
| R1 + R2 | To 3B, Scores, Out | Scores, Out | N/A |
| R1 + R3 | To 3B, Scores, Out | N/A | Held, Scores, Out |
| R2 + R3 | N/A | Scores, Out | Held, Scores, Out |
| Loaded | Scores, Out | Scores, Out | Scores, Out |

**Key Rules for Doubles:**
- R1 CANNOT hold or go to 2B (batter takes 2B)
- R2 CANNOT hold (batter takes 2B)
- R3 can hold (no one forcing them)

### Triple (3B)

Batter reaches 3rd. R1, R2, R3 all MUST vacate (score or out).

| Base State | R1 Options | R2 Options | R3 Options |
|------------|------------|------------|------------|
| Any | Scores, Out | Scores, Out | Scores, Out |

**Key Rules for Triples:**
- ALL runners must score or be out - batter needs 3B clear

### Home Run (HR)

Everyone scores. No choices.

---

## Out Scenarios

### Ground Out (GO)

Batter is out at 1st. Force situation depends on play type.

**If batter out at 1st (normal GO):**
- No force on runners (batter didn't reach)
- Runners CAN hold
- Runners CAN advance (if they were running)
- Runners CAN be out (if throw beats them)

**If runner out on force (FC situation):**
- Batter reaches 1st
- Other runners follow single rules

### Fly Out (FO/LO/PO/SF)

Batter is out. Runners must TAG UP to advance.

| Situation | Runner Options |
|-----------|----------------|
| Didn't tag | Held, Doubled Off |
| Tagged | Held, Advance, Scored, Out (thrown out advancing) |

### Double Play (DP)

Two outs recorded. Usually force at 2B then throw to 1B.

**6-4-3 DP (SS to 2B to 1B):**
- R1 out at 2B (force)
- Batter out at 1B
- R2 and R3 may advance (no longer forced after R1 out)

### Strikeout (K)

Batter is out. Runners may advance at their own risk.

| Situation | Runner Options |
|-----------|----------------|
| Normal K | Held, Advance (steal attempt), Out |
| Dropped 3rd Strike | Batter can run to 1B if 1B unoccupied (or 2 outs) |
| K + Wild Pitch | See Wild Pitch section |

---

## 5. Wild Pitch / Passed Ball

Wild pitches (WP) and passed balls (PB) allow runners to advance at their own risk.

### 5.1 Basic Rules

- **No force** - runners choose to advance
- **Batter does NOT become a runner** (unless dropped 3rd strike)
- Any runner can attempt to advance
- Multiple runners can advance on same WP/PB

### 5.2 Advancement Options

| Runner | Options | Notes |
|--------|---------|-------|
| R1 | Held, To 2B, Out at 2B | Most common advance |
| R2 | Held, To 3B, Out at 3B | Depends on ball location |
| R3 | Held, Scores, Out at Home | Risky - catcher usually recovers |

### 5.3 UI Implementation

```typescript
interface WildPitchEvent {
  eventType: 'WP' | 'PB';
  pitcherId: string;      // WP charged to pitcher
  catcherId: string;      // PB charged to catcher

  // Each runner's outcome (optional advancement)
  runnerOutcomes: {
    from: '1B' | '2B' | '3B';
    outcome: 'HELD' | 'ADVANCED' | 'SCORED' | 'OUT';
    advancedTo?: '2B' | '3B' | 'HOME';
    putOutBy?: string[];  // Fielders involved if out
  }[];
}
```

### 5.4 Validation Rules

```typescript
function validateWildPitchAdvancement(outcomes) {
  const errors = [];

  // WP/PB never creates a force - all advances are optional
  // But can't advance past next base without extra error
  for (const outcome of outcomes) {
    if (outcome.from === '1B' && outcome.advancedTo === 'HOME') {
      // R1 scoring on WP alone is rare but possible
      errors.push('Warning: R1 scoring from 1B on WP is unusual - verify');
    }
  }

  // Can't have runner pass another runner
  // (handled by general validation)

  return errors;
}
```

---

## 6. Stolen Bases

### 6.1 Basic Rules

- Runner attempts to advance **during the pitch**
- Catcher throws to base to try for out
- Can occur on any pitch (even if batter makes contact)

### 6.2 Stolen Base Scenarios

| Scenario | Result | Runner Outcome |
|----------|--------|----------------|
| SB | Clean steal | Advanced to next base |
| CS | Caught stealing | Out |
| SB + E | Steal + throwing error | May advance extra base |
| Double Steal | Two runners steal | Both advance or one/both out |

### 6.3 Implementation

```typescript
interface StolenBaseEvent {
  eventType: 'SB' | 'CS';
  runnerId: string;
  fromBase: '1B' | '2B' | '3B';
  toBase: '2B' | '3B' | 'HOME';

  // CS details
  putOutBy?: string[];    // Usually C, fielder at base
  throwingError?: boolean;
  errorBy?: string;

  // SB details
  isDefensiveIndifference?: boolean;  // No SB credit if DI
}

// For double steals
interface DoubleStealEvent {
  eventType: 'DOUBLE_STEAL';
  runners: StolenBaseEvent[];
}
```

### 6.4 Special Cases

**Steal of Home:**
- Very rare
- Usually on squeeze play or delayed steal
- If batter interferes, runner is out

**Caught Stealing then Safe:**
- CS can be overturned to SB if throwing error allows runner to be safe
- Original call matters for stat attribution

---

## 7. ~~Balks~~ - NOT IN SMB4

> ⚠️ **This section is for reference only.** SMB4 does not have a balk mechanic.
> **DO NOT IMPLEMENT** balk tracking in the KBL tracker.

<details>
<summary>Real Baseball Reference (collapsed)</summary>

A balk is an illegal pitching motion that awards all runners one base.
- R1 → 2B, R2 → 3B, R3 → Scores
- Not applicable to SMB4 tracking

</details>

---

## 8. Error Advancement

### 8.1 Types of Errors Affecting Advancement

| Error Type | Effect on Runners |
|------------|-------------------|
| Fielding error | Batter reaches, runners may advance |
| Throwing error | Runners may advance extra bases |
| Catcher error | Similar to passed ball |
| Dropped fly ball | Runners who tagged may advance |

### 8.2 Error on Batted Ball

When a fielder commits an error on a batted ball:

```typescript
interface ErrorOnBattedBall {
  eventType: 'E';
  fielderId: string;        // Who committed error
  errorType: 'FIELDING' | 'THROWING' | 'DROPPED_FLY';

  // What WOULD have happened without error
  projectedResult: 'OUT' | '1B' | '2B';

  // What actually happened
  batterReachedBase: '1B' | '2B' | '3B';

  // Runner outcomes (may get extra bases due to error)
  runnerOutcomes: RunnerOutcome[];
}
```

### 8.3 Throwing Error Advancement

When a throwing error occurs, runners get extra bases:

```typescript
function calculateErrorAdvancement(error, originalOutcome) {
  // Runner gets original advancement PLUS error advancement
  // Usually one extra base per throwing error

  if (error.type === 'THROWING') {
    // Allow advancement options up to 2 bases beyond normal
    return {
      minAdvance: originalOutcome.base,
      maxAdvance: Math.min(originalOutcome.base + 2, 'HOME')
    };
  }
}
```

### 8.4 UI Implications

- Show error icon on play result
- Allow extended advancement options
- Track which bases were reached due to error vs. normal play

---

## 9. Special Situations

### 9.1 ~~Catcher Interference~~ - NOT IN SMB4

> ⚠️ **Not implemented in SMB4.** Do not track.

### 9.2 Infield Fly Rule (IFR)

The infield fly rule IS in SMB4. Called when:
- Runners on 1st+2nd OR bases loaded
- Less than 2 outs
- Fair fly ball that can be caught by infielder with ordinary effort

**Effect:**
- Batter is OUT immediately (regardless of catch)
- Runners may advance at their own risk (NOT forced)

```typescript
interface InfieldFlyEvent {
  eventType: 'IFR';
  batterOutcome: 'OUT';  // Always out
  ballCaught: boolean;   // May or may not be caught

  // Runners not forced - can advance at own risk
  runnerOutcomes: {
    runnerId: string;
    fromBase: '1B' | '2B' | '3B';
    outcome: 'HELD' | 'ADVANCED' | 'OUT' | 'DOUBLED_OFF';
    taggedUp?: boolean;
  }[];
}
```

### 9.3 Ground Rule Double - RARE IN SMB4

> ⚠️ **May exist in some SMB4 stadiums but is rare.** Include minimal support.

Batter automatically to 2B. Runners advance **two bases** from position at time of pitch.

| Runner Position | Automatic Advancement |
|-----------------|----------------------|
| R1 | To 3B (two bases) |
| R2 | Scores (two bases) |
| R3 | Scores |

### 9.4 ~~Interference / Obstruction~~ - NOT IN SMB4

> ⚠️ **Not implemented in SMB4.** Do not track.

### 9.5 Tag-Up Rules (Expanded)

When a fly ball is caught:

```typescript
interface TagUpScenario {
  // Runner must return to original base AFTER catch
  canAdvance: boolean;  // Did they tag up?

  // If tagged up
  advancementOptions: ['HELD', 'ADVANCED', 'OUT'];

  // If didn't tag up
  doubledOffOptions: ['SAFE_RETURNED', 'OUT_DOUBLED_OFF'];
}

function validateTagUp(runner, playResult) {
  if (playResult.type === 'FO' || playResult.type === 'LO') {
    // Runner cannot advance unless they tagged
    if (!runner.taggedUp && runner.outcome === 'ADVANCED') {
      return 'Error: Runner cannot advance without tagging up on fly out';
    }

    // If runner didn't return in time, they can be doubled off
    if (!runner.taggedUp && runner.outcome === 'HELD') {
      return 'Warning: Did runner return to base in time? Could be doubled off.';
    }
  }
}
```

**Sacrifice Fly Requirements:**
- Less than 2 outs
- Runner on 3B tags and scores
- Fly ball caught in fair or foul territory

---

## Implementation Matrix

### Walk/HBP/IBB - Required UI Behavior

| Situation | R1 | R2 | R3 | UI Behavior |
|-----------|----|----|----| ------------|
| R1 only | **AUTO → 2B** | - | - | No selection needed |
| R2 only | - | Choice | - | Show options for R2 |
| R3 only | - | - | Choice | Show options for R3 |
| R1+R2 | **AUTO → 2B** | **AUTO → 3B** | - | No selection needed |
| R1+R3 | **AUTO → 2B** | - | Choice | Show options for R3 only |
| R2+R3 | - | Choice | Choice | Show options for both |
| Loaded | **AUTO → 2B** | **AUTO → 3B** | **AUTO → Scores** | No selection - all forced |

### Single (1B) - Required UI Behavior

| Situation | R1 Options | R2 Options | R3 Options |
|-----------|------------|------------|------------|
| R1 only | 2B/3B/Score/Out | - | - |
| R2 only | - | Hold/3B/Score/Out | - |
| R3 only | - | - | Hold/Score/Out |
| R1+R2 | 2B/3B/Score/Out | **3B/Score/Out*** | - |
| R1+R3 | 2B/3B/Score/Out | - | Hold/Score/Out |
| R2+R3 | - | Hold/3B/Score/Out | **Depends on R2** |
| Loaded | 2B/3B/Score/Out | **Depends on R1** | **Depends on R2** |

*R2 cannot hold if R1 is going to 2B

### Validation Rules (Pseudo-code)

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
  
  // RULE 3: On 2B, R1 and R2 cannot hold or stay below 3B
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
    if (bases.first && !['SCORED', 'OUT_HOME', 'OUT_3B'].includes(outcomes.first)) {
      errors.push('R1 must score or be out on triple');
    }
    // ... similar for R2, R3
  }
  
  // RULE 5: Two runners cannot occupy same base
  // (implicit in the UI but should be validated)
  
  return errors;
}
```

---

## 10. Auto-Advancement Summary

### 10.1 Events with AUTOMATIC Advancement (No User Choice)

| Event | Runners | Auto-Advancement |
|-------|---------|------------------|
| Walk/HBP/IBB | Forced runners | R1→2B, R2→3B (if R1 forced), R3→Home (if loaded) |
| Ground Rule Double | All runners | Each runner +2 bases |
| Home Run | All runners | All score |

### 10.2 Events with OPTIONAL Advancement (User Choice)

| Event | Runners | Options |
|-------|---------|---------|
| Single | Non-forced runners | Hold or advance |
| Double | R3 only (R1/R2 must advance) | Hold or score |
| Wild Pitch / Passed Ball | All runners | Hold or advance |
| Stolen Base Attempt | Stealing runner | Safe or out |
| Fly Out | Tagged runners | Hold or advance |
| Error | All runners | May get extra bases |

### 10.3 Force Situations

Force situations occur when a runner MUST advance because another runner (or the batter) is taking their base. On walks and HBP, the batter is awarded first base, creating a chain of forces.

#### Force Detection Function

```typescript
/**
 * Determines if a runner is forced to advance.
 * A forced runner CANNOT hold - they MUST advance to the next base.
 *
 * @param base - The base the runner is currently on (1, 2, or 3)
 * @param runners - Object indicating which bases are occupied
 * @param event - The event type (WALK, HBP, IBB, 1B, 2B, etc.)
 * @returns boolean - true if the runner is forced, false otherwise
 */
function isForced(base: number, runners: { first: boolean; second: boolean; third: boolean }, event: string): boolean {
  // Walk/HBP/IBB: Batter is awarded 1B, creating force chain
  if (event === 'WALK' || event === 'HBP' || event === 'IBB' || event === 'BB') {
    // R1 is always forced (batter takes 1B)
    if (base === 1 && runners.first) return true;
    // R2 is forced only if R1 exists (chain: Batter → R1 → R2)
    if (base === 2 && runners.first && runners.second) return true;
    // R3 is forced only if R1 AND R2 exist (chain: Batter → R1 → R2 → R3)
    if (base === 3 && runners.first && runners.second && runners.third) return true;
  }

  // Single (1B): Batter takes 1B, same force chain as walk
  if (event === '1B') {
    if (base === 1 && runners.first) return true;
    if (base === 2 && runners.first && runners.second) return true;
    if (base === 3 && runners.first && runners.second && runners.third) return true;
  }

  // Double (2B): Batter takes 2B, R1 and R2 must vacate
  if (event === '2B') {
    if (base === 1 && runners.first) return true;  // R1 must advance past 2B
    if (base === 2 && runners.second) return true; // R2 must vacate for batter
  }

  // Triple (3B): Batter takes 3B, all runners must vacate
  if (event === '3B') {
    if (base === 1 && runners.first) return true;
    if (base === 2 && runners.second) return true;
    if (base === 3 && runners.third) return true;
  }

  return false;
}
```

#### Force Situation Examples

| Event | Base State | R1 Forced? | R2 Forced? | R3 Forced? |
|-------|------------|------------|------------|------------|
| WALK  | R1         | YES        | -          | -          |
| WALK  | R2         | -          | NO (1B empty) | -       |
| WALK  | R1+R2      | YES        | YES        | -          |
| WALK  | R1+R3      | YES        | -          | NO (2B empty) |
| WALK  | R2+R3      | -          | NO         | NO         |
| WALK  | Loaded     | YES        | YES        | YES        |
| 1B    | R1         | YES        | -          | -          |
| 2B    | R1         | YES        | -          | -          |
| 2B    | R2         | -          | YES        | -          |

### 10.4 Runner Advancement Options Logic

```typescript
/**
 * Returns the valid advancement options for a runner.
 * Forced runners do NOT get a "Hold" option - they auto-advance.
 *
 * @param base - The base the runner is on (1, 2, or 3)
 * @param runners - Current base state
 * @param event - The event type
 * @returns Array of valid options, or 'AUTO' for forced advancement
 */
function getRunnerAdvancementOptions(
  base: number,
  runners: { first: boolean; second: boolean; third: boolean },
  event: string
): string[] | 'AUTO' {
  // Check if this runner is forced
  if (isForced(base, runners, event)) {
    // Forced runners auto-advance - no user choice needed
    // Return 'AUTO' to indicate the UI should not show options
    return 'AUTO';
  }

  // Non-forced runners get options based on event type
  if (event === 'WALK' || event === 'HBP' || event === 'IBB' || event === 'BB') {
    // Non-forced runners on walk can hold or advance
    if (base === 2) return ['HELD', 'TO_3B'];
    if (base === 3) return ['HELD', 'SCORED']; // Can attempt to score (rare)
  }

  if (event === '1B') {
    if (base === 2) return ['HELD', 'TO_3B', 'SCORED', 'OUT'];
    if (base === 3) return ['HELD', 'SCORED', 'OUT'];
  }

  if (event === '2B') {
    // Only R3 can hold on a double (R1/R2 are forced)
    if (base === 3) return ['HELD', 'SCORED', 'OUT'];
  }

  // Default for fly outs, ground outs, etc.
  return ['HELD', 'ADVANCED', 'SCORED', 'OUT'];
}
```

### 10.5 UI Decision Tree

```typescript
function getAdvancementUI(eventType, baseState, runnerPosition) {
  // Get the runners object
  const runners = {
    first: baseState.includes('R1') || baseState.first,
    second: baseState.includes('R2') || baseState.second,
    third: baseState.includes('R3') || baseState.third
  };

  // AUTOMATIC - no UI needed (HR, GRD)
  if (isAutoAdvance(eventType, baseState, runnerPosition)) {
    return { type: 'AUTO', destination: calculateAutoDestination() };
  }

  // FORCED - auto-advance, no "Hold" option
  if (isForced(runnerPosition, runners, eventType)) {
    // Calculate the forced destination
    const destination = runnerPosition === 1 ? '2B' :
                        runnerPosition === 2 ? '3B' : 'HOME';
    return {
      type: 'FORCED',
      destination: destination,
      message: `Runner auto-advances to ${destination} (forced)`
    };
  }

  // OPTIONAL - show advancement options (includes "HELD")
  const options = getRunnerAdvancementOptions(runnerPosition, runners, eventType);
  return {
    type: 'OPTIONAL',
    options: options
  };
}
```

---

## Current Bugs to Fix

### Bug 1: Walk with R1 allows "Held 1B"
**Seen in:** Screenshot showing BB with Mantle on 1B, "Held 1B" selected
**Fix:** Added `isForced()` function and `getRunnerAdvancementOptions()` logic in Section 10.3-10.5.
       Forced runners now auto-advance with no "Hold" option shown in UI.
**Status:** ✅ FIXED - See Section 10.3 "Force Situations"

### Bug 2: Need to audit all other scenarios
**TODO:** Systematically test each base state × result combination
**Status:** In progress

---

## Testing Matrix

### Batted Ball Events

| Result | Empty | R1 | R2 | R3 | R1R2 | R1R3 | R2R3 | Loaded |
|--------|-------|----|----|----|----- |------|------|--------|
| BB/HBP | ✅ | ✅ FIXED | ? | ? | ? | ? | ? | ? |
| 1B | ✅ | ? | ? | ? | ? | ? | ? | ? |
| 2B | ✅ | ? | ? | ? | ? | ? | ? | ? |
| 3B | ✅ | ? | ? | ? | ? | ? | ? | ? |
| HR | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GO | ✅ | ? | ? | ? | ? | ? | ? | ? |
| FO | ✅ | ? | ? | ? | ? | ? | ? | ? |
| LO | ✅ | ? | ? | ? | ? | ? | ? | ? |
| FC | N/A | ? | ? | ? | ? | ? | ? | ? |
| DP | N/A | ? | ? | ? | ? | ? | ? | ? |
| GRD | ✅ | ? | ? | ? | ? | ? | ? | ? |
| E | ✅ | ? | ? | ? | ? | ? | ? | ? |

### Non-Batted Ball Events (SMB4)

| Event | Empty | R1 | R2 | R3 | R1R2 | R1R3 | R2R3 | Loaded |
|-------|-------|----|----|----|----- |------|------|--------|
| WP/PB | N/A | ? | ? | ? | ? | ? | ? | ? |
| SB | N/A | ? | ? | ? | ? | ? | ? | ? |
| CS | N/A | ? | ? | ? | ? | ? | ? | ? |
| ~~BALK~~ | ❌ NOT IN SMB4 | - | - | - | - | - | - | - |
| ~~CI~~ | ❌ NOT IN SMB4 | - | - | - | - | - | - | - |

Legend: ✅ Verified correct | ⚠️ Bug found | ? Needs testing | N/A Not applicable | ❌ Not in SMB4

---

## Appendix: Quick Reference Cards

### Force Play Quick Reference

```
FORCE EXISTS when:
├── Batter reaches base (hit, walk, HBP, error, FC, CI)
└── Chain continues for consecutive occupied bases from 1B

FORCE CHAIN:
Batter → R1 → R2 → R3
         ↓      ↓      ↓
        (only if base behind is occupied)

EXAMPLE: R1 + R3 (2B empty)
- Batter forces R1 ✓
- R1 does NOT force R3 (2B empty, breaks chain) ✗
- R3 has choice to hold or advance
```

### Tag-Up Quick Reference

```
FLY BALL CAUGHT:
├── Runner TAGGED → Can advance at own risk
│   ├── Safe → ADVANCED
│   └── Thrown out → OUT
└── Runner DID NOT TAG
    ├── Returned in time → HELD
    └── Ball thrown to base → DOUBLED OFF (OUT)
```

### Automatic Advancement Quick Reference (SMB4)

```
AUTO-ADVANCE (no user input needed):
├── HR → Everyone scores
├── GRD → Everyone +2 bases (rare in SMB4)
└── BB/HBP with FORCED runner → Forced runners advance

USER INPUT NEEDED:
├── Hits (except HR) → Non-forced runners choose
├── Outs → Tagging runners choose
├── WP/PB → All runners choose
└── SB attempt → Result of attempt

NOT IN SMB4 (do not implement):
├── BALK
├── Catcher Interference
└── Obstruction

IN SMB4 (implement):
└── Infield Fly Rule (IFR) - Called with R1+R2 or loaded, <2 outs
```

---

*Last Updated: January 24, 2026*
*Version: 2.1 - Added force validation logic (isForced function), fixed Walk/HBP force advancement bug*
