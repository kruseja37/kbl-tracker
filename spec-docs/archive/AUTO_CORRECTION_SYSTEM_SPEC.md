# Auto-Correction & Validation System Specification

> **Purpose**: Define how the GameTracker should infer user intent, auto-correct input errors, and validate against baseball rules
> **Created**: January 25, 2026
> **Status**: DESIGN DOCUMENT - Needs review before implementation
> **Related**: MASTER_BASEBALL_RULES_AND_LOGIC.md, AtBatFlow.tsx

---

## Problem Statement

The GameTracker allows users to input combinations that are:
1. **Contradictory** - e.g., GO selected but runner outcomes imply DP
2. **Impossible** - e.g., Steal button clickable with no runners
3. **Incomplete** - e.g., Multiple outs recorded but result type doesn't match

Currently, the app:
- Has some auto-corrections (FO → SF when R3 scores)
- Has some button disabling (SAC with 2 outs)
- But lacks comprehensive validation

---

## Design Principles

### 1. Infer User Intent, Don't Punish Mistakes
If the user's inputs clearly indicate a specific play, auto-correct the result type rather than requiring re-entry.

### 2. Show Corrections, Don't Hide Them
When auto-correcting, display a clear message explaining what was changed and why.

### 3. Block Impossible States
Gray out buttons that cannot apply to current game state.

### 4. Validate Before Committing
Check all baseball rules before finalizing an at-bat.

---

## Auto-Correction Rules

### Rule 1: GO → DP (Ground Out to Double Play)

**Trigger Conditions:**
- User selects `GO` (Ground Out)
- At least one runner outcome is `OUT_*` (out at any base)
- Total outs after play = original outs + 2

**Auto-Correction:**
```typescript
if (result === 'GO' && runnerOutsCount >= 1 && totalOutsRecorded === 2) {
  result = 'DP';
  showMessage('Auto-corrected to Double Play (2 outs recorded)');
}
```

**Edge Cases:**
- If runner outcome is OUT but batter also reached (e.g., FC situation), might be FC not DP
- If runner outcome is OUT but no force existed (tag play), still DP

---

### Rule 2: FO → SF (Fly Out to Sacrifice Fly)

**Trigger Conditions:** (Already implemented)
- User selects `FO` (Fly Out)
- Runner was on 3rd base
- Runner from 3rd outcome = `SCORED`
- Less than 2 outs before the play

**Auto-Correction:**
```typescript
if (result === 'FO' && outs < 2 && bases.third && runnerOutcomes.third === 'SCORED') {
  result = 'SF';
  showMessage('Auto-corrected to Sac Fly (runner scored from 3rd on fly out)');
}
```

---

### Rule 3: Multiple Runner Outs → Validate Result Type

**Trigger Conditions:**
- Multiple runners marked as OUT
- Could indicate:
  - Triple Play (3 outs total)
  - Double Play (2 outs total)
  - Misclick (user error)

**Validation:**
```typescript
const runnerOutsCount = countRunnerOuts(runnerOutcomes);
const batterOut = isOut(result) ? 1 : 0;
const totalOuts = runnerOutsCount + batterOut;

if (totalOuts > 1 && result !== 'DP') {
  if (totalOuts === 2) {
    // Auto-correct to DP
    result = 'DP';
    showMessage('Auto-corrected to Double Play');
  } else if (totalOuts === 3) {
    // Suggest Triple Play (rare, ask user)
    promptUser('This appears to be a Triple Play. Confirm?');
  }
}
```

---

### Rule 4: FC Validation

**Trigger Conditions:**
- User selects `FC` (Fielder's Choice)
- Batter reaches base
- At least one runner should be out

**Validation:**
```typescript
if (result === 'FC') {
  const runnerOutsCount = countRunnerOuts(runnerOutcomes);
  if (runnerOutsCount === 0) {
    showWarning('Fielder\'s Choice typically has a runner put out. Did you mean a hit?');
  }
}
```

---

### Rule 5: Force Out on 3rd Out Negates Runs

**Trigger Conditions:**
- Play results in 3rd out
- 3rd out is a force out
- Runners attempting to score

**Validation:**
```typescript
if (outsAfterPlay === 3 && isForceOut(thirdOutRunner)) {
  // All runs on this play are negated
  const runsToNegate = countRunsScored(runnerOutcomes);
  if (runsToNegate > 0) {
    showWarning(`${runsToNegate} run(s) negated - force out for 3rd out`);
    negateRuns();
  }
}
```

---

## Button Availability Rules

### Currently Implemented

| Button | Disabled When |
|--------|---------------|
| SAC | 2 outs |
| SF | 2 outs OR no R3 |
| DP | 2 outs OR no runners |
| D3K | 1st occupied AND < 2 outs |

### Missing (BUG-013)

| Button | Should Disable When |
|--------|---------------------|
| Steal | No runners on base |
| CS | No runners on base |
| WP | No runners on base |
| PB | No runners on base |
| Pickoff | No runners on base |
| Balk | No runners on base |

**Implementation:**
```typescript
const hasRunners = bases.first || bases.second || bases.third;

// In event buttons section:
<button disabled={!hasRunners}>Steal</button>
<button disabled={!hasRunners}>CS</button>
<button disabled={!hasRunners}>WP</button>
<button disabled={!hasRunners}>PB</button>
<button disabled={!hasRunners}>Pickoff</button>
<button disabled={!hasRunners}>Balk</button>
```

---

## Position Validation (BUG-001, BUG-002)

### Problem
Substitutions can create invalid defensive alignments:
- Two players at same position
- Missing positions (no one at LF)
- DH moved to field without proper handling

### Validation Rules

**Rule: Exactly 9 Defensive Positions**
```typescript
function validateDefensiveAlignment(lineup: LineupPlayer[]): ValidationResult {
  const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const assigned = new Set(lineup.map(p => p.position));

  const missing = positions.filter(p => !assigned.has(p));
  const duplicate = findDuplicates(lineup.map(p => p.position));

  if (missing.length > 0 || duplicate.length > 0) {
    return {
      valid: false,
      missing,
      duplicate,
      message: `Invalid alignment: Missing ${missing.join(', ')}; Duplicate ${duplicate.join(', ')}`
    };
  }

  return { valid: true };
}
```

**Rule: DH Cannot Field**
```typescript
function validateDHRule(sub: Substitution, lineup: LineupPlayer[]): ValidationResult {
  const dhPlayer = lineup.find(p => p.position === 'DH');

  // If DH is being moved to a fielding position
  if (sub.newPosition !== 'DH' && sub.playerId === dhPlayer?.id) {
    return {
      valid: false,
      message: 'Moving the DH to a fielding position forfeits the DH. The pitcher must bat.',
      requiresConfirmation: true
    };
  }

  return { valid: true };
}
```

---

## HR Distance Validation (BUG-011)

### Problem
Users can enter unrealistic HR distances (e.g., 200 feet).

### Validation Rules

**Minimum by Direction:**
```typescript
const HR_MIN_DISTANCE = {
  'Left': 315,       // Down the line
  'Left-Center': 350,
  'Center': 380,     // Deepest part
  'Right-Center': 350,
  'Right': 315,      // Down the line
};

function validateHRDistance(distance: number, direction: Direction): ValidationResult {
  const min = HR_MIN_DISTANCE[direction] || 315;

  if (distance < min) {
    return {
      valid: false,
      message: `HR to ${direction} should be at least ${min} feet. Did you mean ${distance}?`,
      suggestion: min
    };
  }

  if (distance > 550) {
    return {
      valid: false,
      message: `${distance} feet seems unrealistic. Longest recorded HR is ~540 feet.`,
      requiresConfirmation: true
    };
  }

  return { valid: true };
}
```

---

## HR Fielding Attempt (BUG-015)

### Problem
HRs that clear the fence show "Clean" fielding attempt, which is misleading.

### Solution
For HRs, change fielding options:

```typescript
const hrFieldingOptions = [
  'Over Fence',       // Ball cleared the wall (default)
  'Robbery Attempt',  // Fielder tried to catch at wall
  'Wall Scraper',     // Ball barely cleared
];

// Don't show "Clean", "Diving", etc. for HRs
if (result === 'HR') {
  return hrFieldingOptions;
}
```

---

## Implementation Priority

### Phase 1: Quick Fixes (Low Risk)
1. **Button disabling** (BUG-013) - Add `disabled` prop based on runner state
2. **HR fielding options** (BUG-015) - Conditional options for HR

### Phase 2: Auto-Corrections (Medium Risk)
3. **GO → DP** (BUG-003) - Add to `checkAutoCorrection()` in AtBatFlow.tsx
4. **HR distance validation** (BUG-011) - Add validation to HR distance input

### Phase 3: Position Validation (Higher Risk)
5. **Defensive alignment validation** (BUG-001, BUG-002) - Validate before committing subs
6. **DH rule enforcement** - Warn when DH moves to field

---

## Testing Checklist

### Auto-Correction Tests
- [ ] GO with R1 out at 2B → auto-corrects to DP
- [ ] GO with R1 out at 2B, R2 scores → DP, run counts (unless force out)
- [ ] FO with R3 scores → auto-corrects to SF
- [ ] GO with R1 advances → shows SAC suggestion (not auto-correct)

### Button State Tests
- [ ] No runners → Steal, CS, WP, PB, Pickoff, Balk disabled
- [ ] R1 only → All event buttons enabled
- [ ] 2 outs → SAC, SF, DP disabled

### Position Validation Tests
- [ ] PH without position assignment → prompt for position
- [ ] Def sub creating duplicate position → block with error
- [ ] Def sub leaving position empty → block with error
- [ ] DH moving to field → warning about forfeiting DH

### HR Validation Tests
- [ ] HR to center, 200 ft → error, suggest minimum
- [ ] HR to left, 320 ft → valid
- [ ] HR to center, 600 ft → warning, require confirmation

---

## Open Questions

1. **Triple Play handling**: Should we auto-detect or always ask user?
2. **SAC vs GO intent**: Currently we suggest but don't auto-correct. Is this right?
3. **Error chains**: If user selects E and runner advances 2 bases, should we prompt for additional event?
4. **Stadium integration**: Should HR distance validation use actual stadium dimensions?

---

*This document should be reviewed and approved before implementation begins.*
