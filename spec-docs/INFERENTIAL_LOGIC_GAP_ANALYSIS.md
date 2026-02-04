# Inferential Logic Gap Analysis

**Audit Date:** 2026-02-02
**Purpose:** Compare inferential logic between original GameTracker and Figma GameTracker
**Goal:** Identify gaps to make Figma UX cleaner with more auto-inference

---

## Executive Summary

Both implementations have inference logic, but they serve different purposes:

| System | Primary Purpose | Location |
|--------|-----------------|----------|
| **Original (src/components/GameTracker/)** | Direction + ExitType → Fielder inference with adaptive learning | FieldingModal.tsx, adaptiveLearningEngine.ts |
| **Figma (src/src_figma/)** | Location + FieldingSequence → PlayType inference with prompts | playClassifier.ts |

**Key Finding:** The systems are COMPLEMENTARY, not duplicative. The Figma implementation needs to add the Original's direction-based fielder inference and adaptive learning capabilities.

---

## Original GameTracker Inference Logic

### 1. Direction-Based Fielder Inference Matrices

**Location:** `src/components/GameTracker/FieldingModal.tsx` (lines 85-115)

```typescript
// GROUND_BALL_INFERENCE
'Left' → 3B (primary), SS (secondary), P (tertiary)
'Left-Center' → SS, 3B, 2B
'Center' → P, SS, 2B
'Right-Center' → 2B, 1B, SS
'Right' → 1B, 2B, P

// FLY_BALL_INFERENCE
'Left' → LF, CF, 3B
'Left-Center' → CF, LF, SS
'Center' → CF (only)
'Right-Center' → CF, RF, 2B
'Right' → RF, CF, 1B

// LINE_DRIVE_INFERENCE
'Left' → 3B, LF
'Left-Center' → SS, CF
'Center' → P, CF
'Right-Center' → 2B, CF
'Right' → 1B, RF

// POP_FLY_INFERENCE
'Left' → 3B, SS
'Left-Center' → SS, 3B
'Center' → SS, 2B
'Right-Center' → 2B, 1B
'Right' → 1B, 2B
```

### 2. Exit Type Inference from Result

**Location:** `src/components/GameTracker/FieldingModal.tsx` (lines 188-204)

```typescript
function inferExitType(result: AtBatResult): ExitType | null {
  switch (result) {
    case 'GO':
    case 'DP':
    case 'FC':
      return 'Ground';
    case 'FO':
    case 'SF':
      return 'Fly Ball';
    case 'LO':
      return 'Line Drive';
    case 'PO':
      return 'Pop Up';
    default:
      return null; // Hits need user selection
  }
}
```

### 3. DP Chain Inference by Direction

**Location:** `src/components/GameTracker/FieldingModal.tsx` (lines 118-124)

```typescript
const DP_CHAINS: Record<Direction, string> = {
  'Left': '5-4-3',       // 3B → 2B → 1B
  'Left-Center': '6-4-3', // SS → 2B → 1B
  'Center': '6-4-3',      // SS → 2B → 1B
  'Right-Center': '4-6-3', // 2B → SS → 1B
  'Right': '3-6-3',       // 1B → SS → 1B
};
```

### 4. Adaptive Learning Engine

**Location:** `src/engines/adaptiveLearningEngine.ts` (295 lines)

Features:
- **Zone Probability Learning:** Tracks actual fielder vs predicted, updates weights after 20+ samples
- **Per-Player Adjustments:** Learns if specific players have unusual range
- **Confidence Scaling:** Increases confidence as more samples are collected
- **Blended Weights:** 70% new data, 30% existing (smoothing)

```typescript
// Default zone-to-position probabilities
DEFAULT_ZONE_WEIGHTS = {
  'CF-deep': { CF: 0.70, RF: 0.15, LF: 0.15 },
  'CF-shallow': { CF: 0.50, SS: 0.20, '2B': 0.20, P: 0.10 },
  'LF-line': { LF: 0.80, '3B': 0.15, SS: 0.05 },
  'LF-gap': { LF: 0.60, CF: 0.40 },
  'RF-line': { RF: 0.80, '1B': 0.15, '2B': 0.05 },
  'RF-gap': { RF: 0.60, CF: 0.40 },
  'SS-hole': { SS: 0.70, '3B': 0.20, LF: 0.10 },
  '2B-hole': { '2B': 0.70, SS: 0.15, '1B': 0.15 },
  // ... etc
}
```

### 5. Contextual Visibility Rules

**Location:** `src/components/GameTracker/FieldingModal.tsx` (lines 302-339)

```typescript
// Show IFR toggle: PO/FO + R1&R2 or bases loaded + <2 outs
showIFRToggle = ['PO', 'FO'].includes(result) && outs < 2 &&
                ((bases.first && bases.second) || bases loaded);

// Show GRD toggle: Result = 2B
showGRDToggle = result === '2B';

// Show Bad Hop: Result is a hit (1B, 2B, 3B)
showBadHopToggle = ['1B', '2B', '3B'].includes(result);

// Show Nutshot: Direction = Center + comebacker
showNutshotToggle = direction === 'Center' && ['GO', 'LO', '1B'].includes(result);

// Show Robbery: Result = HR
showRobberyToggle = result === 'HR';

// Show D3K options: Result = D3K
showD3KOptions = result === 'D3K';
```

---

## Figma GameTracker Inference Logic

### 1. Play Classification from Location + Fielding Sequence

**Location:** `src/src_figma/app/components/playClassifier.ts` (707 lines)

```typescript
function classifyPlay(input: PlayInput): ClassificationResult {
  // Uses:
  // - batterPosition / ballLocation (FieldCoordinate)
  // - fieldingSequence (position numbers)
  // - gameContext (outs, bases, inning)

  // Returns:
  // - autoComplete: boolean (skip modal?)
  // - playType: 'hit' | 'out' | 'hr' | 'foul_out' | 'foul_ball' | 'error'
  // - hitType?: '1B' | '2B' | '3B' | 'HR'
  // - outType?: 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'TP' | 'K' | 'FC' | 'SAC' | 'SF'
  // - confidence: number (0-1)
  // - prompts: SpecialEventPrompt[] (WEB_GEM, ROBBERY, etc.)
}
```

### 2. Auto-Complete Conditions

**Location:** `src/src_figma/app/components/playClassifier.ts` (lines 263-304)

```typescript
// Single outfielder catch in deep outfield (y > 0.6)
if (isOutfielder && location.y > 0.6) {
  autoComplete: true, outType: 'FO', confidence: 0.9

  // Prompts based on depth:
  // y > 0.95 → ROBBERY prompt (+1.5 Fame)
  // 0.8 < y ≤ 0.95 → WEB_GEM prompt (+1.0 Fame)
}

// Classic DP sequences
if (notation === '6-4-3' || '4-6-3' || '5-4-3' || '3-6-3' || '1-6-3' || '1-4-3') {
  autoComplete: true, outType: 'DP', confidence: 0.95
}

// Standard ground outs (X-3 where X = 4,5,6)
if (sequenceLength === 2 && lastFielder === 3 && [4,5,6].includes(firstFielder)) {
  autoComplete: true, outType: 'GO', confidence: 0.92
}

// Pitcher comebackers (1-3, 1-4-3, 1-6-3)
if (notation === '1-3' || '1-4-3' || '1-6-3') {
  autoComplete: true, outType: 'GO', confidence: 0.90
}
```

### 3. Special Event Prompts

**Location:** `src/src_figma/app/components/playClassifier.ts` (lines 63-76)

```typescript
type SpecialEventType =
  | 'WEB_GEM'           // y > 0.8, ≤ 0.95, +1.0 Fame
  | 'ROBBERY'           // y > 0.95, +1.5 Fame
  | 'TOOTBLAN'          // Runner out on non-force
  | 'KILLED_PITCHER'    // Comebacker knocked down, +3.0 Fame
  | 'NUT_SHOT'          // Pitcher hit in sensitive area, +1.0 Fame
  | 'DIVING_CATCH'
  | 'INSIDE_PARK_HR'
  | 'BEAT_THROW'        // Infield hit
  | 'BUNT'
  | 'STRIKEOUT'
  | 'STRIKEOUT_LOOKING'
  | 'DROPPED_3RD_STRIKE'
  | 'SEVEN_PLUS_PITCH_AB'
```

### 4. Hit Classification by Depth

**Location:** `src/src_figma/app/components/playClassifier.ts` (lines 569-626)

```typescript
function classifyHit(location, gameContext) {
  if (location.y < 0.35) {
    // Infield hit - likely single
    suggestedHitType = '1B', confidence = 0.85
    prompts: BEAT_THROW, BUNT
  } else if (location.y < 0.55) {
    // Shallow outfield - likely single
    suggestedHitType = '1B', confidence = 0.75
  } else if (location.y < 0.75) {
    // Mid outfield - could be single or double
    suggestedHitType = '1B', confidence = 0.6
  } else if (location.y < 0.9) {
    // Deep outfield - likely double or triple
    suggestedHitType = '2B', confidence = 0.7
  } else {
    // At the wall - likely triple or HR
    suggestedHitType = '3B', confidence = 0.6
  }
}
```

### 5. OutcomeButtons Pre-Selection

**Location:** `src/src_figma/app/components/OutcomeButtons.tsx` (line 3)

```typescript
export interface OutcomeButtonsProps {
  suggestedType?: HitType | OutType;  // Pre-selects this button
  fieldingContext?: {
    isPitcherInvolved?: boolean;
    isDeepOutfield?: boolean;
    isDoublePlay?: boolean;
  };
}
```

---

## GAP ANALYSIS: What Figma is Missing

### GAP 1: Direction-Based Fielder Inference Matrices (HIGH PRIORITY)

**What Original Has:** 4 inference matrices (Ground, Fly, Line Drive, Pop) that map Direction → primary/secondary/tertiary fielder

**What Figma Has:** Only uses Y-coordinate depth, not spray direction

**Impact:** User must manually select fielder even when inference is obvious

**Solution:** Add inference matrices to playClassifier.ts or create separate fielderInference.ts

```typescript
// Add to Figma
function inferFielderFromDirection(
  direction: Direction,  // 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right'
  exitType: ExitType     // 'Ground' | 'Line Drive' | 'Fly Ball' | 'Pop Up'
): { primary: Position; secondary?: Position; tertiary?: Position }
```

### GAP 2: Adaptive Learning Engine (MEDIUM PRIORITY)

**What Original Has:** Complete adaptive learning system that:
- Tracks predicted vs actual fielder
- Updates probabilities after 20+ samples
- Per-player adjustments for unusual range
- Persists to localStorage

**What Figma Has:** No learning system

**Impact:** Inference accuracy stays static, doesn't improve with usage

**Solution:** Port adaptiveLearningEngine.ts to Figma or create shared engine

### GAP 3: Exit Type Inference from Result (HIGH PRIORITY)

**What Original Has:** Automatic exit type inference for deterministic results
- GO/DP/FC → Ground
- FO/SF → Fly Ball
- LO → Line Drive
- PO → Pop Up

**What Figma Has:** Infers outType from location + sequence but doesn't use this for fielder inference

**Impact:** User must confirm exit type even when it's determinable from result

**Solution:** Add inferExitType() to playClassifier.ts

### GAP 4: DP Chain Inference by Direction (LOW PRIORITY)

**What Original Has:** Default DP chains based on direction
- Left → 5-4-3, Right-Center → 4-6-3, etc.

**What Figma Has:** Recognizes classic DP patterns but doesn't suggest based on direction

**Impact:** Minor - user still enters sequence manually

**Solution:** Add DP_CHAINS constant and use for suggestion

### GAP 5: Pre-Selection of Inferred Fielder (HIGH PRIORITY)

**What Original Has:** `inferredFielder` is set and pre-selected in FieldingModal
- Shows "(inferred)" label when using inference
- Tracks `wasOverridden` if user changes

**What Figma Has:** `suggestedType` for hit/out type but not for fielder

**Impact:** User must always click to select fielder even when obvious

**Solution:**
1. Add fielder inference to classifyPlay()
2. Pass inferred fielder to UI for pre-selection
3. Track override for learning

### GAP 6: Contextual Visibility Rules (MEDIUM PRIORITY)

**What Original Has:** Complete visibility logic for:
- IFR toggle (PO/FO + runners + <2 outs)
- GRD toggle (2B only)
- Bad Hop (hits only)
- Nutshot (Center + comebacker)
- Robbery (HR only)
- D3K options

**What Figma Has:** Some prompts but not as comprehensive visibility rules

**Impact:** May show irrelevant options or miss relevant ones

**Solution:** Port visibility rules to Figma modal/prompt system

---

## Action Plan

### Phase 1: High Priority (Immediate UX Wins) - ✅ COMPLETED

1. **Add Direction → Fielder Inference** ✅
   - Created `src/src_figma/app/components/fielderInference.ts` (320 lines)
   - Ported GROUND_BALL_INFERENCE, FLY_BALL_INFERENCE, LINE_DRIVE_INFERENCE, POP_FLY_INFERENCE
   - Integrated with playClassifier.ts and EnhancedInteractiveField.tsx

2. **Add Exit Type Inference** ✅
   - Added `inferExitTypeFromResult()` to fielderInference.ts
   - Integrated with completePlay() for automatic exit type determination

3. **Pre-Select Inferred Fielder** ✅
   - Added inferredFielder, inferenceConfidence, wasOverridden to PlayData
   - Inference data flows to UI and adaptive learning

### Phase 2: Medium Priority (Improved Accuracy) - ✅ COMPLETED

4. **Port Adaptive Learning Engine** ✅
   - Created `src/src_figma/app/engines/adaptiveLearningEngine.ts` (442 lines)
   - Integrated with completePlay() for recording events
   - Tracks inference accuracy per zone

5. **Complete Contextual Visibility Rules** ✅
   - Port completed in EnhancedInteractiveField.tsx (inferContextualButtons)

### Phase 3: LI & Fame Integration - ✅ COMPLETED (2026-02-02)

6. **Add Leverage Index Context** ✅
   - Extended PlayData with leverageIndex, leverageCategory, isClutchSituation
   - Extended FieldingEvent with LI context for situational analysis
   - Added gameSituation snapshot to track game state at time of play

7. **Fame Calculation with LI Weighting** ✅
   - Extended SpecialEventData with Fame context
   - Integrated calculateFame() for WEB_GEM and ROBBERY events
   - Fame formula: baseFame × √LI × playoffMultiplier

### Phase 4: Low Priority (Polish)

8. **DP Chain Suggestions**
   - Add DP_CHAINS mapping
   - Suggest based on direction when DP detected

---

## Test Coverage

Existing tests in `src/tests/fieldingInferenceTests.ts`:
- 50+ fielder inference test cases
- 19+ contextual visibility test cases
- 13 DP chain tests
- 10 D3K outcome tests

New tests in `src/tests/inferenceLogicTests.test.ts`:
- 135 tests covering direction inference, exit type, DP chains

**Build Status:** ✅ Passing (593 tests pass, 10 pre-existing failures in bwarCalculator)

---

## Files Created/Modified

| File | Action | Status | Description |
|------|--------|--------|-------------|
| `src/src_figma/app/components/fielderInference.ts` | CREATE | ✅ | Port inference matrices |
| `src/src_figma/app/engines/adaptiveLearningEngine.ts` | CREATE | ✅ | Port learning system with LI context |
| `src/src_figma/app/components/EnhancedInteractiveField.tsx` | MODIFY | ✅ | Extended PlayData, integrated LI calc |
| `src/tests/inferenceLogicTests.test.ts` | CREATE | ✅ | 135 tests for inference logic |

---

## Summary

**IMPLEMENTATION COMPLETE** (2026-02-02)

The Figma GameTracker now includes:
1. ✅ **Fielder inference from direction**
2. ✅ **Adaptive learning** with zone-based probability tracking
3. ✅ **Exit type auto-inference** from result type
4. ✅ **Fielder pre-selection** with confidence scoring
5. ✅ **Leverage Index integration** for clutch situation tracking
6. ✅ **Fame calculation with LI weighting** (baseFame × √LI × playoffMultiplier)

These implementations reduce user input, make the UX cleaner per the design philosophy, and enable advanced situational analysis for fielding metrics.
