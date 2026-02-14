# Baseball Rules Integration: src/ → src_figma/

> **Created**: 2026-02-02
> **Status**: COMPLETE - Rules ported and build verified
> **Related**: CORRECTED_GAP_ANALYSIS.md, AtBatFlow.tsx

---

## Summary

The `src_figma/hooks/useGameState.ts` file was missing critical baseball rules logic that exists in `src/components/GameTracker/AtBatFlow.tsx`. This caused incorrect game state tracking.

**Solution**: Ported the key baseball logic functions from `AtBatFlow.tsx` to `useGameState.ts` as exported helper functions.

---

## Functions Added to useGameState.ts

### 1. `isRunnerForced(base, result, bases)` → boolean
**Purpose**: Determines if a runner MUST advance.

| Result | R1 Forced? | R2 Forced? | R3 Forced? |
|--------|------------|------------|------------|
| BB/IBB/HBP | Always | If R1 exists | If bases loaded |
| 1B | Always | No | No |
| 2B | Always | Always | No |
| 3B | Always | Always | Always |
| FC | Always | No | No |
| Outs | No | No | No |

### 2. `getMinimumAdvancement(base, result, bases)` → 'second' | 'third' | 'home' | null
**Purpose**: Where a forced runner MUST advance to.

| Result | R1 Min | R2 Min | R3 Min |
|--------|--------|--------|--------|
| 2B | 3B | 3B | - |
| 3B | Home | Home | Home |
| Default | 2B | 3B | Home |

### 3. `getDefaultRunnerOutcome(base, result, outs, bases)` → RunnerOutcome
**Purpose**: Standard advancement for a runner based on play result.

| Result | R3 Default | R2 Default | R1 Default |
|--------|------------|------------|------------|
| 3B | SCORED | SCORED | SCORED |
| 2B | SCORED | SCORED | TO_3B |
| 1B | SCORED | TO_3B | TO_2B |
| HR | SCORED | SCORED | SCORED |
| BB/HBP (forced) | SCORED | TO_3B | TO_2B |
| BB/HBP (not forced) | HELD | HELD | - |
| FO (R3, <2 outs) | SCORED | HELD | HELD |
| DP | HELD | HELD | OUT_2B |
| SF | SCORED | HELD | HELD |
| K/GO/FO/LO/PO | HELD | HELD | HELD |

### 4. `autoCorrectResult(initialResult, outs, bases, runnerOutcomes)` → { correctedResult, explanation } | null
**Purpose**: Auto-correct result type based on what happened.

| Initial | Condition | Corrected | Why |
|---------|-----------|-----------|-----|
| FO | R3 scores, <2 outs | SF | Sacrifice fly definition |
| GO | Runner out, batter out | DP | Double play definition |

### 5. `isExtraAdvancement(base, outcome, result, bases)` → boolean
**Purpose**: Detect non-standard advancement requiring explanation (SB, WP, PB, E, BALK).

| Scenario | Standard? | Extra? |
|----------|-----------|--------|
| BB + R1 to 2B | ✅ | No |
| BB + R1 to 3B | ❌ | Yes |
| BB + R1 scores | ❌ | Yes |
| BB + R2 to 3B (R1 exists) | ✅ | No |
| BB + R2 scores (R1 exists) | ❌ | Yes |
| K + any advancement | ❌ | Yes |
| 1B + R1 scores | ❌ | Yes |

### 6. `calculateRBIs(result, runnerOutcomes, bases)` → number
**Purpose**: Calculate RBIs applying baseball rules.

| Rule | Applies To |
|------|------------|
| Count runners who scored | All hits, walks, SF |
| HR = all runners + batter | Home runs |
| E = 0 RBI | Errors |
| DP = 0 RBI | Double plays |

### 7. Helper Functions
- `isOut(result)` → boolean
- `isHit(result)` → boolean
- `reachesBase(result)` → boolean

---

## How UI Should Use These Functions

```typescript
import {
  isRunnerForced,
  getMinimumAdvancement,
  getDefaultRunnerOutcome,
  autoCorrectResult,
  isExtraAdvancement,
  calculateRBIs,
} from '../../hooks/useGameState';

// When recording an at-bat:
function handleAtBat(result: AtBatResult) {
  const bases = { first: true, second: false, third: true };

  // 1. Get default runner outcomes
  const defaultR1 = getDefaultRunnerOutcome('first', result, outs, bases);
  const defaultR3 = getDefaultRunnerOutcome('third', result, outs, bases);

  // 2. Let user override, then check for auto-correction
  const runnerOutcomes = { first: defaultR1, second: null, third: defaultR3 };
  const correction = autoCorrectResult(result, outs, bases, runnerOutcomes);

  if (correction) {
    // Show: "Auto-corrected to SF (runner scored from 3rd)"
    result = correction.correctedResult;
  }

  // 3. Check for extra advancement needing explanation
  if (isExtraAdvancement('first', runnerOutcomes.first!, result, bases)) {
    // Prompt: "R1 advanced beyond standard. Was this SB, WP, PB, E, or BALK?"
  }

  // 4. Calculate RBIs using baseball rules
  const rbi = calculateRBIs(result, runnerOutcomes, bases);
}
```

---

## Source Reference

All functions ported from:
- **File**: `src/components/GameTracker/AtBatFlow.tsx`
- **Lines**:
  - `isRunnerForced`: 156-190
  - `getMinimumAdvancement`: 193-213
  - `getDefaultOutcome`: 452-557
  - `checkAutoCorrection`: 99-143
  - `isExtraAdvancement`: 221-275
  - `calculateRBIs`: 599-623

---

## Build Verification

```
✓ npm run build
✓ Exit code: 0
✓ All 1799 modules transformed
✓ No TypeScript errors
```

---

## Additional Fix: runnerDefaults.ts DP Detection

**Issue**: The UI showed "R1 Holds" on a 6-4-3 ground ball when R1 should be OUT at 2B.

**Root Cause**: `calculateOutDefaults()` only checked for DP when `outType === 'GO'`, but the UI sometimes passes `outType === undefined` when `playData.type === 'out'`.

**Fix Applied** (2026-02-02):
- Added more robust DP detection in `calculateOutDefaults()`
- Now detects DP when:
  - `outType === 'DP'` (explicit), OR
  - `outType === 'TP'` (triple play), OR
  - `bases.first && outs < 2 && fieldingSequence.length >= 2` AND `outType` is `'GO'`, `'FC'`, or `undefined`

**Key Change**:
```typescript
// Before: Only checked for GO
if (outType === 'GO') {
  if (bases.first && outs < 2 && fieldingSequence.length >= 2) {
    // DP logic
  }
}

// After: Checks multiple scenarios
const isLikelyDP = (
  outType === 'DP' ||
  outType === 'TP' ||
  (bases.first && outs < 2 && fieldingSequence.length >= 2 &&
   (outType === 'GO' || outType === 'FC' || outType === undefined))
);

if (isLikelyDP) {
  // DP logic: R1 is OUT
}
```

---

*Last Updated: 2026-02-02*
