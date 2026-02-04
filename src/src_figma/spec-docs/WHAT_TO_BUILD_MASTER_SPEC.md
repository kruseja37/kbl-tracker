# GameTracker Master Specification

> **Version**: 1.1
> **Created**: 2026-02-03
> **Updated**: 2026-02-03
> **Status**: AUTHORITATIVE - Single Source of Truth
> **Purpose**: Define all data capture, inference, validation, and tracking requirements for the KBL Tracker GameTracker component

---

## Document Organization

This specification is the **single source of truth** for GameTracker implementation. It supersedes and consolidates:
- RUNNER_ADVANCEMENT_RULES.md
- AUTO_CORRECTION_SYSTEM_SPEC.md
- ADAPTIVE_STANDARDS_ENGINE_SPEC.md
- STAT_TRACKING_ARCHITECTURE_SPEC.md
- FIELDING_SYSTEM_SPEC.md
- BASEBALL_STATE_MACHINE_AUDIT.md (v1.1)

**Structure:**
1. [Part 1: UI Data Capture Requirements](#part-1-ui-data-capture-requirements) - What the frontend MUST collect
2. [Part 2: Inference Engine Rules](#part-2-inference-engine-rules) - What the engine calculates
3. [Part 3: Validation Rules](#part-3-validation-rules) - Invalid states to prevent
   - §3.1-3.5: Core validation rules
   - §3.6: State Machine - Legal outcome tables per result type
   - §3.7: State Machine - Impossible transitions (must block)
   - §3.8: State Machine - Improbable transitions (require inference)
   - §3.9: State Machine - Default outcomes
   - §3.10: State Machine - Key function signatures
4. [Part 4: Stat Accumulation](#part-4-stat-accumulation) - Data flow to stats
5. [Part 5: Fame/Clutch/WAR Triggers](#part-5-fameclutchwar-triggers) - Achievement detection
6. [Part 6: SMB4 Constraints](#part-6-smb4-constraints) - What's NOT in the game

---

# PART 1: UI Data Capture Requirements

> **Principle**: The UI collects raw data. The engine infers and validates.

## 1.1 Required Inputs (Every At-Bat)

| Input | Type | Required? | Notes |
|-------|------|-----------|-------|
| **At-Bat Result** | enum | ✅ REQUIRED | See §1.2 for valid values |
| **Pitch Count** | number | ✅ REQUIRED | Pitches this at-bat (for Maddux) |
| **Direction** | enum | ⚠️ CONDITIONAL | Required for batted balls |
| **Fielder** | string | ⚠️ CONDITIONAL | Required for fielding chances |
| **Runner Outcomes** | object | ⚠️ CONDITIONAL | Required when runners on base |
| **RBIs** | number | ⚠️ CONDITIONAL | Required on hits/SF/FC with runners |

## 1.2 At-Bat Result Values

### Primary Results (User Selects ONE)

| Code | Name | Batted Ball? | Fielding Chance? |
|------|------|--------------|------------------|
| `1B` | Single | Yes | See §1.4 |
| `2B` | Double | Yes | See §1.4 |
| `3B` | Triple | Yes | See §1.4 |
| `HR` | Home Run | Yes | No (unless robbery attempt) |
| `GO` | Ground Out | Yes | ✅ Yes |
| `FO` | Fly Out | Yes | ✅ Yes |
| `LO` | Line Out | Yes | ✅ Yes |
| `PO` | Pop Out | Yes | ✅ Yes |
| `K` | Strikeout (swinging) | No | ❌ No (C gets auto-PO) |
| `KL` | Strikeout (looking) | No | ❌ No (C gets auto-PO) |
| `BB` | Walk | No | ❌ No |
| `IBB` | Intentional Walk | No | ❌ No |
| `HBP` | Hit By Pitch | No | ❌ No |
| `E` | Error | Yes | ✅ Yes |
| `FC` | Fielder's Choice | Yes | ✅ Yes |
| `DP` | Double Play | Yes | ✅ Yes |
| `TP` | Triple Play | Yes | ✅ Yes |
| `SF` | Sacrifice Fly | Yes | ✅ Yes |
| `SAC` | Sacrifice Bunt | Yes | ✅ Yes |

### Modifier Events (Can Combine)

| Code | Name | When Available | Notes |
|------|------|----------------|-------|
| `WP` | Wild Pitch | Always | Runners advance |
| `PB` | Passed Ball | Always | Runners advance |
| `SB` | Stolen Base | Runners on base | Per-runner |
| `CS` | Caught Stealing | Runners on base | Per-runner |
| `TBL` | TOOTBLAN | Runners on base | Runner OUT on bases |
| `PK` | Pickoff | Runners on base | Runner OUT |
| `BLK` | Balk | ❌ NOT IN SMB4 | DO NOT IMPLEMENT |

## 1.3 Direction Values

| Code | Zone | Fair/Foul | Ground Ball Fielders | Fly Ball Fielders |
|------|------|-----------|---------------------|-------------------|
| `FL` | Foul Left | Foul | C, 3B | LF, 3B, C |
| `L` | Left Line | Fair | 3B, SS | LF, 3B |
| `LC` | Left-Center | Fair | SS, 3B, 2B | LF, CF |
| `C` | Center | Fair | P, SS, 2B | CF |
| `RC` | Right-Center | Fair | 2B, 1B | CF, RF |
| `R` | Right Line | Fair | 1B, 2B | RF, 1B |
| `FR` | Foul Right | Foul | C, 1B | RF, 1B, C |

## 1.4 Fielding Chance Logic

> **CRITICAL**: A fielding chance is recorded ONLY when a fielder attempts to make a play.

### Decision Matrix

| Result | Fielding Attempt? | Needs Fielder Confirmation? |
|--------|-------------------|----------------------------|
| GO, FO, LO, PO | Always yes | ✅ Yes |
| DP, TP | Always yes | ✅ Yes |
| SF, SAC | Always yes | ✅ Yes |
| FC | Always yes | ✅ Yes |
| E | Always yes | ✅ Yes |
| K, KL | No batted ball | ❌ No (C auto-PO) |
| BB, IBB, HBP | No batted ball | ❌ No |
| **Clean Hit** (1B, 2B, 3B) | No | ❌ No (direct submit) |
| **Hit with Attempt** | User indicates | ✅ Yes |
| **Clean HR** | No | ❌ No |
| **HR with Robbery Attempt** | User indicates | ✅ Yes |

### Hit Fielding Attempt Options

For hits (1B, 2B, 3B, HR), show "FIELDING ATTEMPT?" with options:

| Option | Fielding Chance? | Fame Impact |
|--------|------------------|-------------|
| **Clean** (default) | ❌ No | None |
| **Diving** | ✅ Yes | None (good effort) |
| **Leaping** | ✅ Yes | None (good effort) |
| **Running** | ✅ Yes | None (good effort) |
| **Sliding** | ✅ Yes | None (good effort) |
| **Over-shoulder** | ✅ Yes | None (good effort) |
| **Robbery Attempt** (HR only) | ✅ Yes | -1 Fame if failed |

## 1.5 Runner Outcome Inputs

When runners are on base, capture outcome for each:

| Runner | Outcome Options | Notes |
|--------|-----------------|-------|
| R1 (First) | SCORED, TO_2B, TO_3B, HELD, OUT | |
| R2 (Second) | SCORED, TO_3B, HELD, OUT | |
| R3 (Third) | SCORED, HELD, OUT | |

### Outcome Values

| Value | Meaning | When Valid |
|-------|---------|------------|
| `SCORED` | Runner crossed home | Always |
| `TO_2B` | Runner now on 2B | R1 only |
| `TO_3B` | Runner now on 3B | R1, R2 only |
| `HELD` | Runner stayed | ⚠️ NOT valid if forced |
| `OUT` | Runner was put out | Always |

## 1.6 Fielding Data Inputs

When fielding confirmation is required:

### For Outs (GO, FO, LO, PO, DP, SF, FC)

| Input | Required? | Notes |
|-------|-----------|-------|
| Primary Fielder | ✅ Yes | Who made the putout/started play |
| Play Type | ⚠️ If star play | routine, diving, leaping, wall, etc. |
| Assist Chain | ⚠️ If multiple fielders | e.g., "6-4-3" |

### For Errors

| Input | Required? | Notes |
|-------|-----------|-------|
| Fielder | ✅ Yes | Who committed error |
| Error Type | ✅ Yes | fielding, throwing, mental |
| Error Context | ⚠️ Recommended | allowedRun, wasRoutine, wasDifficult |

### For Hits with Attempt

| Input | Required? | Notes |
|-------|-----------|-------|
| Fielder | ✅ Yes | Who attempted play |
| Attempt Type | ✅ Yes | diving, leaping, etc. |

## 1.7 Special Event Toggles

Show these **only when contextually relevant**:

| Toggle | Show When | Default |
|--------|-----------|---------|
| Infield Fly Rule? | PO/FO + R1&R2 or loaded + <2 outs | OFF |
| Ground Rule Double? | Result = 2B | OFF |
| Bad Hop? | Result = hit (1B, 2B, 3B) | OFF |
| Robbery Attempt? | Result = HR | OFF |
| Nutshot? | Direction = C + batted ball | OFF |
| Pitcher Injured? | Direction = C + comebacker | OFF |

## 1.8 Pitch Count Input

> **CRITICAL**: This is missing from current implementation and blocks Maddux detection.

| When | Input |
|------|-------|
| After every at-bat | Pitch count for that at-bat (1-20+) |
| Game state | Running total: `totalPitchCount += atBatPitchCount` |

**UI Suggestion**: Quick buttons [1] [2] [3] [4] [5] [6+] or simple increment counter.

---

# PART 2: Inference Engine Rules

> **Principle**: Minimize user input by inferring the most likely values. User confirms or overrides.

## 2.1 Fielder Inference

### Ground Balls (GO, DP, FC)

| Direction | Primary (65%) | Secondary (25%) | Tertiary (10%) |
|-----------|---------------|-----------------|----------------|
| FL | C | 3B | P |
| L | 3B | SS | P |
| LC | SS | 3B | 2B |
| C | P | SS | 2B |
| RC | 2B | 1B | SS |
| R | 1B | 2B | P |
| FR | C | 1B | P |

### Fly Balls (FO, SF)

| Direction | Primary | Secondary | Notes |
|-----------|---------|-----------|-------|
| FL | LF | 3B | Foul |
| L | LF | CF | CF has priority on catchable |
| LC | CF | LF | CF calls off LF |
| C | CF | - | CF owns center |
| RC | CF | RF | CF calls off RF |
| R | RF | CF | |
| FR | RF | 1B | Foul |

### Line Drives (LO)

| Direction | Primary | Secondary |
|-----------|---------|-----------|
| L | 3B | LF |
| LC | SS | LF/CF |
| C | P | 2B/CF |
| RC | 2B | RF/CF |
| R | 1B | RF |

### Pop Flies (PO)

**Priority order** (per MLB convention):
1. CF (calls off everyone)
2. Corner OF (call off IF)
3. SS (highest IF priority)
4. 2B
5. 1B / 3B
6. P / C (lowest)

## 2.2 Double Play Chain Inference

| Direction | Default DP Chain | Positions |
|-----------|------------------|-----------|
| L | 5-4-3 | 3B → 2B → 1B |
| LC | 6-4-3 | SS → 2B → 1B |
| C | 1-6-3 or 6-4-3 | P/SS start |
| RC | 4-6-3 | 2B → SS → 1B |
| R | 3-6-3 | 1B → SS → 1B |

## 2.3 Runner Default Inference

### Hit Advancement Defaults

| Hit Type | R1 Default | R2 Default | R3 Default |
|----------|------------|------------|------------|
| 1B | TO_2B | TO_3B | SCORED |
| 2B | TO_3B | SCORED | SCORED |
| 3B | SCORED | SCORED | SCORED |
| HR | SCORED | SCORED | SCORED |

### Out Advancement Defaults

| Out Type | Outs | R3 Default | R2 Default | R1 Default |
|----------|------|------------|------------|------------|
| FO (deep) | <2 | SCORED (tag) | TO_3B (tag) | HELD |
| FO (shallow) | <2 | HELD | HELD | HELD |
| Any out | 2 | HELD | HELD | HELD |
| GO | <2 | SCORED | TO_3B | DP likely |

### Walk/HBP Defaults (Force Chain)

| Base State | R1 | R2 | R3 |
|------------|----|----|-----|
| R1 only | TO_2B (forced) | - | - |
| R2 only | - | HELD | - |
| R1+R2 | TO_2B (forced) | TO_3B (forced) | - |
| R1+R3 | TO_2B (forced) | - | HELD |
| R2+R3 | - | HELD | HELD |
| Loaded | TO_2B (forced) | TO_3B (forced) | SCORED (forced) |

## 2.4 Auto-Correction Rules

### GO → DP Auto-Correction

**Trigger**: User selects GO + runner outcome includes OUT + total outs = 2

```typescript
if (result === 'GO' && countRunnerOuts(outcomes) >= 1 && totalOutsRecorded === 2) {
  result = 'DP';
  showMessage('Auto-corrected to Double Play');
}
```

### FO → SF Auto-Correction

**Trigger**: User selects FO + R3 existed + R3 outcome = SCORED + <2 outs

```typescript
if (result === 'FO' && outs < 2 && bases.third && outcomes.third === 'SCORED') {
  result = 'SF';
  showMessage('Auto-corrected to Sac Fly');
}
```

## 2.5 Automatic Stat Credits

| Event | Automatic Credit | Notes |
|-------|------------------|-------|
| K or KL | Catcher gets putout | No user input |
| K + WP/PB | Check D3K legality | See §3.3 |
| Any out | Increment outs | State management |
| Run scores | Update score | Check force out rule |
| HR | All runners score | Auto-advance |

---

# PART 3: Validation Rules

> **Principle**: Prevent impossible game states. Validate before accepting.

## 3.1 Force Play Validation

A runner is **FORCED** when the batter becomes a runner AND there's no empty base behind them.

### Force Detection Function

```typescript
function isForced(base: 1|2|3, runners: Bases, event: string): boolean {
  const forceEvents = ['BB', 'IBB', 'HBP', '1B', '2B', '3B', 'FC'];
  if (!forceEvents.includes(event)) return false;

  if (event === '1B' || event === 'BB' || event === 'IBB' || event === 'HBP' || event === 'FC') {
    if (base === 1 && runners.first) return true;
    if (base === 2 && runners.first && runners.second) return true;
    if (base === 3 && runners.first && runners.second && runners.third) return true;
  }

  if (event === '2B') {
    if (base === 1 && runners.first) return true;
    if (base === 2 && runners.second) return true;
  }

  if (event === '3B') {
    return runners.first || runners.second || runners.third;
  }

  return false;
}
```

### Validation Rules

| Rule | Condition | Error Message |
|------|-----------|---------------|
| Forced runner can't hold | `isForced(base) && outcome === 'HELD'` | "R{base} cannot hold - forced to advance" |
| R1 can't stay on single | `result === '1B' && runners.first && outcomes.first === 'HELD'` | "R1 cannot hold on single" |
| All must vacate on triple | `result === '3B' && any runner not SCORED or OUT` | "All runners must score or be out on triple" |

### UI Behavior for Forced Runners

| Situation | UI Behavior |
|-----------|-------------|
| Forced runner | Hide "HELD" option, auto-advance |
| Non-forced runner | Show all options |
| Validation failure | Block submission, show error |

## 3.2 Outs Validation

| Rule | Condition | Action |
|------|-----------|--------|
| Max 3 outs per half-inning | `outsAfterPlay > 3` | Error |
| DP requires <2 outs | `result === 'DP' && outs >= 2` | Block/auto-correct to GO |
| TP requires 0 outs | `result === 'TP' && outs > 0` | Block |
| SF requires <2 outs | `result === 'SF' && outs >= 2` | Block |
| SAC requires <2 outs | `result === 'SAC' && outs >= 2` | Block |

## 3.3 D3K Legality

> **SMB4 Note**: D3K occurs ONLY via K + WP/PB (swing and miss with 2 strikes).

### D3K Legal Conditions

```typescript
function isD3KLegal(bases: Bases, outs: number): boolean {
  const firstBaseEmpty = !bases.first;
  const twoOuts = outs === 2;
  return firstBaseEmpty || twoOuts;
}
```

| Condition | D3K Legal? | Reason |
|-----------|------------|--------|
| 1B empty, any outs | ✅ Yes | Batter can reach |
| R1, <2 outs | ❌ No | Batter automatically OUT |
| R1, 2 outs | ✅ Yes | 2-out exception |
| Bases loaded, 2 outs | ✅ Yes | 2-out exception |

## 3.4 Force Out Negates Runs

> **CRITICAL BASEBALL RULE**: When the 3rd out is a force out, ALL runs on that play are negated.

```typescript
function validateRunsScored(
  outsAfterPlay: number,
  thirdOutType: 'force' | 'tag' | 'flyout',
  runsScored: number
): number {
  if (outsAfterPlay === 3 && thirdOutType === 'force' && runsScored > 0) {
    showWarning(`${runsScored} run(s) negated - force out for 3rd out`);
    return 0;
  }
  return runsScored;
}
```

## 3.5 Button Availability Rules

| Button | Disabled When | Reason |
|--------|---------------|--------|
| SB, CS | No runners | Can't steal without runners |
| WP, PB | No runners | Runners must advance |
| Pickoff | No runners | No one to pick off |
| SAC | 2 outs | No sacrifice with 2 outs |
| SF | 2 outs OR no R3 | Can't score on fly with 2 outs |
| DP | 2 outs OR no runners | Need runners for DP |
| TP | >0 outs OR <2 runners | Very rare conditions |
| ~~Balk~~ | **ALWAYS** | NOT IN SMB4 - REMOVE |

---

## 3.6 State Machine: Legal Outcome Tables

> **Philosophy**: The KBL XHD Tracker should function like a chess engine - every move must be legal, every outcome must be accounted for, and impossible states must be prevented.

### 3.6.1 Walks/HBP (BB, IBB, HBP)

**Behavior:**
- Batter goes to 1B
- Force chain: Batter → R1 → R2 → R3 (only if each base behind is occupied)
- Non-forced runners can HOLD

| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Always | TO_2B, TO_3B*, SCORED*, OUT_2B, OUT_3B, OUT_HOME |
| R2 | If R1 exists | TO_3B, SCORED*, HELD (if not forced), OUT_3B, OUT_HOME |
| R3 | If loaded | SCORED, HELD (if not forced), OUT_HOME |

*Requires extra event inference (SB, WP, PB, E)

### 3.6.2 Single (1B)

**Behavior:**
- Batter goes to 1B
- R1 MUST advance to at least 2B (forced - batter takes 1B)
- R2, R3 can advance or hold

| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Yes | TO_2B, TO_3B, SCORED*, OUT_2B, OUT_3B, OUT_HOME |
| R2 | No | TO_3B, SCORED, HELD, OUT_3B, OUT_HOME |
| R3 | No | SCORED, HELD, OUT_HOME |

*R1 scoring on a single is rare - likely requires error (infer E)

### 3.6.3 Double (2B)

**Behavior:**
- Batter goes to 2B
- R1 MUST advance to at least 3B (batter takes 2B)
- R2 MUST advance (batter takes 2B)
- R3 almost always scores

| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Yes | TO_3B, SCORED, OUT_3B, OUT_HOME |
| R2 | Yes | TO_3B, SCORED, OUT_3B, OUT_HOME |
| R3 | No | SCORED, HELD (rare), OUT_HOME |

### 3.6.4 Triple (3B)

**Behavior:**
- Batter goes to 3B
- ALL runners MUST score (batter takes 3B)

| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Yes | SCORED, OUT_HOME |
| R2 | Yes | SCORED, OUT_HOME |
| R3 | Yes | SCORED, OUT_HOME |

### 3.6.5 Home Run (HR)

**Behavior:**
- All runners + batter score automatically
- **No user input needed for runners**

### 3.6.6 Outs (K, KL, GO, FO, LO, PO)

**Behavior:**
- Batter is OUT
- No force plays (batter doesn't reach)
- All runners can HOLD or advance at their own risk
- **Default**: HELD (runners typically don't advance on outs)

| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | No | HELD, TO_2B, TO_3B, SCORED, OUT_2B, OUT_3B, OUT_HOME |
| R2 | No | HELD, TO_3B, SCORED, OUT_3B, OUT_HOME |
| R3 | No | HELD, SCORED (tag up on fly), OUT_HOME |

**Exception for FO with R3 and <2 outs**: R3 typically scores on tag-up (auto-converts to SF)

### 3.6.7 Double Play (DP)

**Behavior:**
- Batter is OUT
- R1 typically OUT (6-4-3 or 4-6-3)
- Other runners can advance on the play

| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | N/A | OUT_2B (standard), HELD (unusual), TO_2B, TO_3B, SCORED |
| R2 | No | HELD, TO_3B, SCORED, OUT_3B, OUT_HOME |
| R3 | No | HELD, SCORED, OUT_HOME |

### 3.6.8 Sacrifice Fly (SF)

**Behavior:**
- Batter is OUT
- R3 typically SCORES (that's what makes it a SF)
- Other runners can advance on tag-up

| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | No | HELD, TO_2B, OUT_2B |
| R2 | No | HELD, TO_3B, OUT_3B |
| R3 | No | SCORED (expected), HELD, OUT_HOME |

### 3.6.9 Sacrifice Bunt (SAC)

**Behavior:**
- Batter is OUT
- Runners typically advance one base

| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | No | TO_2B (expected), OUT_2B, HELD |
| R2 | No | TO_3B (expected), OUT_3B, HELD |
| R3 | No | SCORED, HELD, OUT_HOME |

### 3.6.10 Fielder's Choice (FC)

**Behavior:**
- Batter reaches 1B (defense chose to get another runner)
- R1 has force play, typically OUT

| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Yes | OUT_2B (typical), TO_2B, TO_3B, SCORED |
| R2 | No | OUT_3B, TO_3B, SCORED, HELD |
| R3 | No | OUT_HOME, SCORED, HELD |

### 3.6.11 Error (E)

**Behavior:**
- Batter reaches base (1B, 2B, or 3B depending on error)
- Runners can advance beyond normal

| Runner | Forced? | Legal Outcomes |
|--------|---------|----------------|
| R1 | Varies | HELD, TO_2B, TO_3B, SCORED, OUT_2B, OUT_3B, OUT_HOME |
| R2 | Varies | HELD, TO_3B, SCORED, OUT_3B, OUT_HOME |
| R3 | No | HELD, SCORED, OUT_HOME |

---

## 3.7 State Machine: Impossible Transitions (Must Block)

> These transitions violate baseball rules and MUST be blocked in the UI.

| # | Impossible Transition | Reason |
|---|----------------------|--------|
| 1 | R1 HELD on walk/HBP | R1 is ALWAYS forced when batter takes 1B |
| 2 | R2 HELD on walk with R1 on base | R2 is forced by chain when R1 exists |
| 3 | R3 HELD on bases-loaded walk | R3 is forced by chain when bases loaded |
| 4 | R1 TO_2B on double | R1 must go to 3B minimum (batter takes 2B) |
| 5 | R1 HELD on double | R1 must vacate for batter |
| 6 | Any runner HELD on triple | All runners must vacate for batter |
| 7 | R1 HELD on single | R1 must vacate for batter |

### Implementation: getRunnerOptions()

```typescript
function getRunnerOptions(base: 1|2|3, result: string, runners: Bases): RunnerOutcome[] {
  const allOptions = getAllPossibleOutcomes(base);

  // Remove HELD for forced runners
  if (isRunnerForced(base, result, runners)) {
    allOptions = allOptions.filter(opt => opt !== 'HELD');
  }

  // Remove TO_2B for R1 on double (must go to 3B+)
  if (base === 1 && result === '2B') {
    allOptions = allOptions.filter(opt => opt !== 'TO_2B' && opt !== 'HELD');
  }

  // Remove everything except SCORED/OUT_HOME for triple
  if (result === '3B') {
    return ['SCORED', 'OUT_HOME'];
  }

  return allOptions;
}
```

---

## 3.8 State Machine: Improbable Transitions (Require Inference)

> These transitions are possible but unusual. When detected, prompt the user to specify the extra event that enabled the advancement.

| # | Improbable Transition | Requires Inference |
|---|----------------------|-------------------|
| 1 | R1 → 3B on walk | SB, WP, PB, or E |
| 2 | R1 → HOME on walk | SB, WP, PB, or E |
| 3 | R2 → HOME on walk (not forced) | SB, WP, PB, or E |
| 4 | R1 → HOME on single | Likely requires E |
| 5 | Any runner advances 2+ bases on walk | SB, WP, PB, or E |
| 6 | Any runner advances on K/KL | WP, PB, or SB |
| 7 | R3 scores on walk (not forced) | SB, WP, PB, or E |

### Extra Event Types

| Code | Event | Description |
|------|-------|-------------|
| SB | Stolen Base | Runner advances on own during pitch/play |
| WP | Wild Pitch | Pitcher throws ball catcher can't handle |
| PB | Passed Ball | Catcher fails to catch catchable pitch |
| E | Error | Fielder misplays allowing extra advancement |

> **Note:** BALK is not in SMB4 and has been removed from this list.

### Implementation: isExtraAdvancement()

```typescript
function isExtraAdvancement(base: 1|2|3, outcome: RunnerOutcome, result: string, runners: Bases): boolean {
  const minAdvancement = getMinimumAdvancement(base, result, runners);
  const actualAdvancement = getAdvancementBases(outcome);

  // If advancing more than minimum required, extra event likely
  if (actualAdvancement > minAdvancement + 1) {
    return true;
  }

  // Special cases
  if (result === 'BB' || result === 'IBB' || result === 'HBP') {
    // R1 going to 3B or scoring on a walk
    if (base === 1 && (outcome === 'TO_3B' || outcome === 'SCORED')) {
      return true;
    }
    // R2 scoring on walk when not forced
    if (base === 2 && outcome === 'SCORED' && !isRunnerForced(2, result, runners)) {
      return true;
    }
  }

  // R1 scoring on single
  if (result === '1B' && base === 1 && outcome === 'SCORED') {
    return true;
  }

  // Any advancement on strikeout
  if ((result === 'K' || result === 'KL') && outcome !== 'HELD') {
    return true;
  }

  return false;
}
```

### When to Prompt for Extra Event

```typescript
if (result IN ['BB', 'IBB', 'HBP']) AND (runner advances > 1 base beyond forced position):
  PROMPT for extra event

if (result === '1B') AND (R1 scores):
  PROMPT for extra event (likely E)

if (result IN ['K', 'KL']) AND (any runner advances):
  PROMPT for extra event (WP, PB, or SB)
```

### Clearing Extra Events

When user changes a runner's outcome:
1. Clear any pending extra event prompt for that runner
2. Remove any recorded extra events for that runner
3. Re-evaluate if new selection requires extra event

---

## 3.9 State Machine: Default Outcomes

> Auto-set these defaults when runners are on base to minimize user input.

| Result | R1 Default | R2 Default | R3 Default |
|--------|------------|------------|------------|
| BB/IBB/HBP | TO_2B | TO_3B (if forced) / HELD | SCORED (if forced) / HELD |
| 1B | TO_2B | TO_3B | SCORED |
| 2B | SCORED | SCORED | SCORED |
| 3B | SCORED | SCORED | SCORED |
| HR | (auto) | (auto) | (auto) |
| K/KL | HELD | HELD | HELD |
| GO | HELD | HELD | HELD |
| FO | HELD | HELD | SCORED (if < 2 outs, tag up) |
| LO | HELD | HELD | HELD |
| PO | HELD | HELD | HELD |
| DP | OUT_2B | HELD | HELD |
| SF | HELD | HELD | SCORED |
| SAC | TO_2B | TO_3B | HELD |
| FC | OUT_2B | HELD | HELD |
| E | TO_2B | TO_3B | SCORED |

### Implementation: getDefaultOutcome()

```typescript
function getDefaultOutcome(base: 1|2|3, result: string, runners: Bases, outs: number): RunnerOutcome {
  // Use lookup table above, with special handling for:
  // - Walk force chains
  // - FO with R3 and < 2 outs (tag up)
  // - DP always puts R1 out at 2B

  if (result === 'FO' && base === 3 && outs < 2) {
    return 'SCORED'; // Tag up
  }

  // ... implement per table
}
```

---

## 3.10 State Machine: Key Function Signatures

```typescript
// Determines if runner is forced to advance
function isRunnerForced(base: 1|2|3, result: string, runners: Bases): boolean;

// Returns minimum destination base for forced runner
function getMinimumAdvancement(base: 1|2|3, result: string, runners: Bases): number;

// Returns expected/standard outcome for the situation
function getDefaultOutcome(base: 1|2|3, result: string, runners: Bases, outs: number): RunnerOutcome;

// Returns legal outcome options for UI (hides invalid options)
function getRunnerOptions(base: 1|2|3, result: string, runners: Bases): RunnerOutcome[];

// Checks if outcome requires extra event inference
function isExtraAdvancement(base: 1|2|3, outcome: RunnerOutcome, result: string, runners: Bases): boolean;

// Handles FO→SF and GO→DP auto-corrections
function checkAutoCorrection(result: string, outcomes: RunnerOutcomes, bases: Bases, outs: number): {
  correctedResult: string;
  message?: string;
};
```

---

# PART 4: Stat Accumulation

> **Principle**: At-bat → Game → Season → Career. Each layer accumulates from the previous.

## 4.1 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: At-Bat Event (Ephemeral)                              │
│  - Raw inputs from UI                                           │
│  - Triggers detection, then flows to Layer 2                    │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: Game State (Session Persistence)                      │
│  - Accumulates across at-bats within game                       │
│  - Persists to localStorage/IndexedDB                           │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: Season Stats (Long-term Persistence)                  │
│  - Aggregated at game end                                       │
│  - Stored in IndexedDB                                          │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: Career Stats (Permanent)                              │
│  - Aggregated at season end                                     │
│  - Exportable                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Required Interfaces

### BatterGameStats

```typescript
interface BatterGameStats {
  playerId: string;
  playerName: string;
  teamId: string;

  // Counting
  pa: number;
  ab: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  hitByPitch: number;     // SEPARATE from walks
  stolenBases: number;
  caughtStealing: number;

  // For cycle detection
  hitOrder: ('1B' | '2B' | '3B' | 'HR')[];

  // Situational
  hitWithRISP: number;
  abWithRISP: number;
}
```

### PitcherGameStats

```typescript
interface PitcherGameStats {
  playerId: string;
  playerName: string;
  teamId: string;

  // Counting
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeoutsThrown: number;
  homeRunsAllowed: number;
  hitBatters: number;           // SEPARATE from walks
  wildPitches: number;
  pitchCount: number;           // MUST INCREMENT
  battersFaced: number;

  // For perfect game / no-hitter
  basesReachedViaError: number; // CRITICAL

  // For back-to-back HR detection
  consecutiveHRsAllowed: number;

  // Context
  isStarter: boolean;
  entryInning: number;
  inheritedRunners: number;     // For ER attribution
  bequeathedRunners: number;    // For ER attribution
}
```

### FieldingPlay

```typescript
interface FieldingPlay {
  id: string;
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';

  // At-bat context
  batterId: string;
  pitcherId: string;
  atBatResult: string;

  // Batted ball
  battedBallType: 'GB' | 'FB' | 'LD' | 'PF' | 'NONE';
  direction: 'FL' | 'L' | 'LC' | 'C' | 'RC' | 'R' | 'FR' | null;
  depth: 'shallow' | 'infield' | 'outfield' | 'deep' | null;

  // Fielding
  primaryFielder: string;       // Position
  primaryFielderId: string;     // Player ID

  // Play type
  playType: 'routine' | 'diving' | 'leaping' | 'wall' | 'running' |
            'sliding' | 'over_shoulder' | 'charging' |
            'error' | 'robbed_hr' | 'failed_robbery';

  // Error details
  errorType?: 'fielding' | 'throwing' | 'mental' | 'missed_catch' | 'collision';
  errorContext?: {
    allowedRun: boolean;
    wasRoutine: boolean;
    wasDifficult: boolean;
  };

  // Assist chain
  assists: Array<{
    position: string;
    playerId: string;
    assistType: 'infield' | 'outfield' | 'relay' | 'cutoff';
    targetBase?: '1B' | '2B' | '3B' | 'HOME';
  }>;
  putoutPosition: string;
  putoutPlayerId: string;

  // DP tracking
  dpRole?: 'started' | 'turned' | 'completed' | 'unassisted';

  // Special events
  infieldFlyRule: boolean;
  groundRuleDouble: boolean;
  badHopEvent: boolean;
  nutshotEvent: boolean;
  robberyAttempted: boolean;
  robberyFailed: boolean;

  // Result
  outsRecorded: number;
  wasOverridden: boolean;
}
```

### PlayerFieldingStats

```typescript
interface PlayerFieldingStats {
  playerId: string;
  seasonId: string;

  byPosition: {
    [position: string]: {
      gamesPlayed: number;
      inningsPlayed: number;

      // Core
      putouts: number;
      assists: number;
      errors: number;
      fieldingPercentage: number;  // (PO + A) / (PO + A + E)

      // Advanced
      totalChances: number;
      doublePlaysParticipated: number;
      doublePlaysStarted: number;
      doublePlaysTurned: number;
      doublePlaysCompleted: number;

      // Star plays
      divingCatches: number;
      leapingCatches: number;
      wallCatches: number;
      runningCatches: number;
      slidingCatches: number;
      overShoulderCatches: number;
      robbedHRs: number;
      failedRobberies: number;
      outfieldAssists: number;

      // Error breakdown
      fieldingErrors: number;
      throwingErrors: number;
      mentalErrors: number;

      // Position-specific
      strikeoutPutouts?: number;    // Catcher
      passedBalls?: number;         // Catcher
      comebackersCaught?: number;   // Pitcher
      comebackersFielded?: number;  // Pitcher
    };
  };

  // Totals
  totalPutouts: number;
  totalAssists: number;
  totalErrors: number;
  overallFieldingPercentage: number;
}
```

### AtBatEvent (Event Log)

```typescript
interface AtBatEvent {
  id: string;
  gameId: string;
  timestamp: number;

  // WHO
  batterId: string;
  batterName: string;
  batterTeamId: string;
  pitcherId: string;
  pitcherName: string;
  pitcherTeamId: string;

  // RESULT
  result: AtBatResult;
  rbiCount: number;
  runsScored: number;

  // SITUATION BEFORE
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  runners: {
    first: { playerId: string; responsiblePitcher: string } | null;
    second: { playerId: string; responsiblePitcher: string } | null;
    third: { playerId: string; responsiblePitcher: string } | null;
  };
  awayScore: number;
  homeScore: number;

  // SITUATION AFTER
  outsAfter: number;
  runnersAfter: typeof runners;
  awayScoreAfter: number;
  homeScoreAfter: number;

  // CALCULATED
  leverageIndex: number;
  winProbabilityBefore: number;
  winProbabilityAfter: number;
  wpa: number;

  // FIELDING
  fieldingPlay: FieldingPlay | null;

  // FAME
  fameEvents: FameEvent[];

  // FLAGS
  isLeadoff: boolean;
  isClutch: boolean;
  isWalkOff: boolean;
}
```

## 4.3 Accumulation Rules

### On Each At-Bat

```typescript
function processAtBat(event: AtBatEvent, gameState: GameState): void {
  const batter = gameState.batterStats.get(event.batterId);
  const pitcher = gameState.pitcherStats.get(event.pitcherId);

  // Always increment
  batter.pa += 1;
  pitcher.battersFaced += 1;
  pitcher.pitchCount += event.pitchCount;  // CRITICAL

  // By result type
  switch (event.result) {
    case '1B': case '2B': case '3B': case 'HR':
      batter.ab += 1;
      batter.hits += 1;
      batter.hitOrder.push(event.result);
      pitcher.hitsAllowed += 1;
      if (event.result === 'HR') {
        batter.homeRuns += 1;
        pitcher.homeRunsAllowed += 1;
        pitcher.consecutiveHRsAllowed += 1;
      } else {
        pitcher.consecutiveHRsAllowed = 0;
      }
      break;

    case 'K': case 'KL':
      batter.ab += 1;
      batter.strikeouts += 1;
      pitcher.strikeoutsThrown += 1;
      pitcher.outsRecorded += 1;
      break;

    case 'BB': case 'IBB':
      batter.walks += 1;
      pitcher.walksAllowed += 1;
      break;

    case 'HBP':
      batter.hitByPitch += 1;    // SEPARATE from walks
      pitcher.hitBatters += 1;   // SEPARATE from walks
      break;

    case 'E':
      batter.ab += 1;
      pitcher.basesReachedViaError += 1;  // CRITICAL for perfect game
      break;

    // ... other cases
  }
}
```

### On Game End

```typescript
function finalizeGame(gameState: GameState, seasonStats: SeasonStats): void {
  for (const [playerId, gameStats] of gameState.batterStats) {
    const seasonBatter = seasonStats.getBatter(playerId);

    seasonBatter.games += 1;
    seasonBatter.pa += gameStats.pa;
    seasonBatter.ab += gameStats.ab;
    seasonBatter.hits += gameStats.hits;
    // ... aggregate all counting stats

    // Check for cycle
    if (hasCycle(gameStats.hitOrder)) {
      seasonBatter.cycles += 1;
    }
  }

  for (const [playerId, gameStats] of gameState.pitcherStats) {
    const seasonPitcher = seasonStats.getPitcher(playerId);

    // Check for complete game, shutout, no-hitter, perfect game
    if (isCompleteGame(gameStats)) {
      seasonPitcher.completeGames += 1;
      if (gameStats.runsAllowed === 0) {
        seasonPitcher.shutouts += 1;
      }
      if (gameStats.hitsAllowed === 0) {
        seasonPitcher.noHitters += 1;
        if (gameStats.basesReachedViaError === 0 && gameStats.walksAllowed === 0) {
          seasonPitcher.perfectGames += 1;
        }
      }
      if (gameStats.pitchCount <= 100 && gameStats.runsAllowed === 0) {
        seasonPitcher.madduxes += 1;
      }
    }
  }
}
```

---

# PART 5: Fame/Clutch/WAR Triggers

> **Principle**: Detect achievements automatically from accumulated data.

## 5.1 Pitching Fame Events

| Event | Trigger | Fame | Detection |
|-------|---------|------|-----------|
| Perfect Game | 27 outs, 0 baserunners | +10 | `outs >= 27 && basesReachedViaError === 0 && walks === 0 && hits === 0` |
| No-Hitter | 27 outs, 0 hits | +8 | `outs >= 27 && hits === 0` |
| Shutout | Complete game, 0 runs | +5 | `isCompleteGame && runsAllowed === 0` |
| Complete Game | Pitched full game | +3 | `outsRecorded >= 27` (or game length) |
| Maddux | CG shutout ≤100 pitches | +7 | `shutout && pitchCount <= 100` |
| Quality Start | 6+ IP, ≤3 ER | +2 | `outs >= 18 && earnedRuns <= 3` |
| 10+ K Game | 10+ strikeouts | +2 | `strikeouts >= 10` |
| Immaculate Inning | 3 K on 9 pitches | +3 | `inningK === 3 && inningPitches === 9` |

## 5.2 Batting Fame Events

| Event | Trigger | Fame | Detection |
|-------|---------|------|-----------|
| Cycle | 1B, 2B, 3B, HR same game | +5 | `hitOrder contains all four types` |
| 5+ Hit Game | 5+ hits | +3 | `hits >= 5` |
| Multi-HR Game | 2+ HR | +3 | `homeRuns >= 2` |
| Grand Slam | HR with bases loaded | +4 | `HR && basesLoaded` |
| Walk-Off HR | HR to win game | +5 | `walkOff && HR` |
| Walk-Off Hit | Any walk-off | +3 | `walkOff` |
| Golden Sombrero | 4+ strikeouts | -3 | `strikeouts >= 4` |

## 5.3 Fielding Fame Events

| Event | Trigger | Fame | Detection |
|-------|---------|------|-----------|
| Diving Catch | playType = diving | +1 | From FieldingPlay |
| Leaping Catch | playType = leaping | +1 | From FieldingPlay |
| Wall Catch | playType = wall | +1 | From FieldingPlay |
| Sliding Catch | playType = sliding | +1 | From FieldingPlay |
| Over-Shoulder Catch | playType = over_shoulder | +1 | From FieldingPlay |
| Robbed HR | playType = robbed_hr | +2 | From FieldingPlay |
| Failed HR Robbery | robberyFailed = true | -1 | From FieldingPlay |
| Outfield Assist | assists with targetBase | +1 | From FieldingPlay |
| Error Allowing Run | error + allowedRun | -1 | From FieldingPlay |
| Multi-Error Game | 2+ errors | -2 | Aggregate per game |

## 5.4 Leverage Index Calculation

```typescript
const BASE_OUT_LI = {
  // [outs]: { [baseState]: LI }
  0: { '---': 1.00, '1--': 1.58, '-2-': 2.07, '12-': 2.29, '--3': 2.35, '1-3': 2.67, '-23': 3.00, '123': 2.86 },
  1: { '---': 0.84, '1--': 1.17, '-2-': 1.43, '12-': 1.64, '--3': 1.78, '1-3': 2.01, '-23': 2.05, '123': 2.14 },
  2: { '---': 0.52, '1--': 0.80, '-2-': 0.96, '12-': 1.08, '--3': 0.76, '1-3': 0.95, '-23': 1.05, '123': 1.35 },
};

function getLeverageIndex(outs: number, bases: Bases): number {
  const baseKey = `${bases.first ? '1' : '-'}${bases.second ? '2' : '-'}${bases.third ? '3' : '-'}`;
  return BASE_OUT_LI[outs]?.[baseKey] ?? 1.0;
}
```

### Fame Adjustment

```typescript
const adjustedFame = baseFame * Math.sqrt(leverageIndex);
```

## 5.5 fWAR Components (Reference)

> **See FWAR_CALCULATION_SPEC.md for complete formulas.**

| Component | Contributes To |
|-----------|---------------|
| Batting runs | oWAR |
| Baserunning runs | oWAR |
| Fielding runs | fWAR/dWAR |
| Pitching runs | pWAR |
| Positional adjustment | WAR |
| Replacement level | WAR |

---

# PART 6: SMB4 Constraints

> **CRITICAL**: Super Mega Baseball 4 does NOT implement all MLB rules.
> DO NOT BUILD features for events that don't exist in the game.

## 6.1 Events NOT in SMB4

| Event | In MLB? | In SMB4? | Action |
|-------|---------|----------|--------|
| **Balk** | ✅ Yes | ❌ NO | REMOVE from UI |
| **Catcher Interference** | ✅ Yes | ❌ NO | Do not implement |
| **Obstruction** | ✅ Yes | ❌ NO | Do not implement |
| **Ground into DP on bunt** | ✅ Yes | ❌ Rare | Low priority |
| **Appeal plays** | ✅ Yes | ❌ NO | Do not implement |

## 6.2 Events WITH LIMITATIONS in SMB4

| Event | MLB Behavior | SMB4 Behavior | Implementation |
|-------|--------------|---------------|----------------|
| **D3K** | Anytime 3rd strike not caught | ONLY on K + WP/PB | Conditional - see §3.3 |
| **Ground Rule Double** | Various park rules | Rare, some stadiums | Low priority toggle |
| **Infield Fly** | Called by umpire | Auto-called | Track when relevant |
| **Pitcher injury** | Various | Comebacker only | Track as special event |

## 6.3 Events FULLY Supported in SMB4

| Event | Notes |
|-------|-------|
| All standard hits | 1B, 2B, 3B, HR |
| All standard outs | GO, FO, LO, PO, K, KL |
| Double plays | All varieties |
| Triple plays | Rare but possible |
| Sacrifice fly/bunt | Standard rules |
| Stolen bases / CS | Standard rules |
| Wild pitch / Passed ball | Standard rules |
| Errors | All types |
| Infield fly rule | With R1+R2 or loaded |
| Walk, HBP, IBB | Standard rules |
| Fielder's choice | Standard rules |
| Star plays | Diving, leaping, wall, robbed HR, etc. |
| Nutshot | SMB4-specific |
| Comebacker injury | SMB4-specific |

## 6.4 SMB4 Baselines (Different from MLB)

| Stat | SMB4 Baseline | MLB Baseline | Notes |
|------|---------------|--------------|-------|
| League AVG | .288 | .250 | SMB4 is more offense-heavy |
| League ERA | 4.04 | 4.25 | Slightly lower |
| League OBP | .329 | .320 | Higher OBP |
| League SLG | .448 | .400 | Much higher power |

## 6.5 Opportunity Factor

For short seasons, scale counting stat thresholds:

```typescript
const opportunityFactor = (gamesPerTeam * inningsPerGame) / (162 * 9);

// Example: 50-game season with 9-inning games
// opportunityFactor = (50 * 9) / (162 * 9) = 0.309 (30.9% of MLB opportunity)
```

| What Scales | What Doesn't |
|-------------|--------------|
| HR thresholds | AVG |
| Hit thresholds | ERA |
| RBI thresholds | OBP, SLG, OPS |
| K thresholds | WHIP |
| Win thresholds | K/9, HR/9 |
| Save thresholds | Fielding % |

---

# Appendix A: Quick Reference Tables

## A.1 Result → Required Inputs

| Result | Direction | Fielder | Runners | Pitch Count |
|--------|-----------|---------|---------|-------------|
| 1B, 2B, 3B | ✅ | ⚠️ If attempt | ✅ If on base | ✅ |
| HR | ✅ | ⚠️ If robbery | ✅ If on base | ✅ |
| GO, FO, LO, PO | ✅ | ✅ | ✅ If on base | ✅ |
| K, KL | ❌ | ❌ (C auto) | ✅ If on base | ✅ |
| BB, IBB, HBP | ❌ | ❌ | ✅ If on base | ✅ |
| E | ✅ | ✅ | ✅ If on base | ✅ |
| DP | ✅ | ✅ | ✅ | ✅ |
| SF | ✅ | ✅ | ✅ | ✅ |
| FC | ✅ | ✅ | ✅ | ✅ |

## A.2 Button Disable Rules

| Button | Condition to DISABLE |
|--------|---------------------|
| SB, CS, WP, PB, Pickoff | `!hasRunners` |
| SAC, SF | `outs >= 2` |
| SF | `outs >= 2 OR !bases.third` |
| DP | `outs >= 2 OR !hasRunners` |
| TP | `outs > 0 OR runnerCount < 2` |
| Balk | **ALWAYS DISABLED / REMOVED** |

## A.3 Auto-Correction Matrix

| User Selects | Condition | Auto-Correct To |
|--------------|-----------|-----------------|
| GO | Runner out + 2 total outs | DP |
| FO | R3 scores + <2 outs | SF |
| GO | R3 scores + <2 outs | Productive out (R3 tags) |

---

# Appendix B: Implementation Checklist

## B.1 CRITICAL (Blocking Features)

- [ ] Add pitch count input per at-bat
- [ ] Add `basesReachedViaError` to PitcherGameStats
- [ ] Implement `pitchCount` increment
- [ ] Separate HBP from BB in stats
- [ ] Track inherited/bequeathed runners
- [ ] Remove Balk button

## B.2 HIGH Priority

- [ ] Add `isForced()` validation function
- [ ] Hide "Hold" option for forced runners
- [ ] Disable buttons when no runners
- [ ] Add GO → DP auto-correction
- [ ] Add force out negates runs validation
- [ ] Track `hitOrder[]` for cycle detection

## B.3 MEDIUM Priority

- [ ] Fielding play type tracking
- [ ] Error type differentiation
- [ ] Assist chain storage
- [ ] DP role tracking
- [ ] Outfield assist target base
- [ ] Leverage Index calculation
- [ ] Ball-in-play data

## B.4 LOW Priority

- [ ] IFR tracking
- [ ] GRD tracking
- [ ] Bad hop tracking
- [ ] Shift handling
- [ ] Adaptive learning system

---

# Appendix C: Source Document Cross-Reference

| Section | Source Spec(s) |
|---------|---------------|
| Part 1 (UI Capture) | FIELDING_SYSTEM_SPEC.md §1-2, STAT_TRACKING_ARCHITECTURE_SPEC.md §2 |
| Part 2 (Inference) | FIELDING_SYSTEM_SPEC.md §4-11, RUNNER_ADVANCEMENT_RULES.md |
| Part 3 §3.1-3.5 (Validation) | RUNNER_ADVANCEMENT_RULES.md §10, AUTO_CORRECTION_SYSTEM_SPEC.md |
| Part 3 §3.6-3.10 (State Machine) | BASEBALL_STATE_MACHINE_AUDIT.md (complete) |
| Part 4 (Stats) | STAT_TRACKING_ARCHITECTURE_SPEC.md §2-5 |
| Part 5 (Fame/WAR) | FIELDING_SYSTEM_SPEC.md §12-13, FWAR_CALCULATION_SPEC.md |
| Part 6 (SMB4) | RUNNER_ADVANCEMENT_RULES.md §1, ADAPTIVE_STANDARDS_ENGINE_SPEC.md |

---

*Last Updated: 2026-02-03*
*Version: 1.1 - Added State Machine validation (§3.6-3.10) from BASEBALL_STATE_MACHINE_AUDIT.md*
*This document is the AUTHORITATIVE source for GameTracker implementation.*
