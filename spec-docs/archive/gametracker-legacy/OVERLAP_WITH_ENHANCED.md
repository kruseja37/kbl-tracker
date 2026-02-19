# Legacy GameTracker: Overlap with Enhanced Field

> **Purpose**: Document UX logic overlap between Legacy (button-based) and Enhanced (drag-drop) GameTracker
> **Created**: 2026-02-02
> **Cross-Reference**: [`../gametracker-enhanced/OVERLAP_WITH_LEGACY.md`](../gametracker-enhanced/OVERLAP_WITH_LEGACY.md)

---

## Executive Summary

The Legacy and Enhanced GameTrackers share **~70% of their fielding logic**. The core difference is **input method** (button taps vs. drag-drop), not the underlying baseball rules or data captured.

**Legacy's Strengths**: Comprehensive data capture, error context modifiers, edge case handling
**Enhanced's Strengths**: Faster UX via auto-complete, precise spray chart coordinates, geometric accuracy

---

## 1. SHARED: Fielder Inference Matrices

Legacy's explicit matrices match Enhanced's derived inference:

### Legacy (FieldingModal.tsx) - Explicit Matrices

```typescript
const GROUND_BALL_INFERENCE: Record<Direction, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'SS', tertiary: 'P' },
  'Left-Center': { primary: 'SS', secondary: '3B', tertiary: '2B' },
  'Center': { primary: 'P', secondary: 'SS', tertiary: '2B' },
  'Right-Center': { primary: '2B', secondary: '1B', tertiary: 'SS' },
  'Right': { primary: '1B', secondary: '2B', tertiary: 'P' },
};

const FLY_BALL_INFERENCE: Record<Direction, InferenceResult> = {
  'Left': { primary: 'LF', secondary: 'CF', tertiary: '3B' },
  'Left-Center': { primary: 'CF', secondary: 'LF', tertiary: 'SS' },
  'Center': { primary: 'CF' },
  'Right-Center': { primary: 'CF', secondary: 'RF', tertiary: '2B' },
  'Right': { primary: 'RF', secondary: 'CF', tertiary: '1B' },
};
```

### Enhanced (playClassifier.ts) - Derived from Coordinates

Enhanced uses `getSpraySector()` to map (x, y) → sector, then applies same inference:
- Deep outfield (y > 0.6) → Fly ball logic
- Shallow (y < 0.35) → Ground ball logic
- Middle infield coverage based on x position

**Equivalence**: Both systems reach same primary fielder conclusions.

---

## 2. SHARED: Special Events Tracking

Both track the **same special events** for Fame system:

| Event | Legacy Flag | Enhanced Prompt | Fame | Notes |
|-------|-------------|-----------------|------|-------|
| Web Gem | `playType: 'wall'/'diving'` + `savedRun` | `WEB_GEM` at y > 0.8 | +1.0 | Legacy uses star play types |
| Robbery | `robberyAttempted: true` | `ROBBERY` at y > 0.95 | +1.5 | Same concept |
| Failed Robbery | `robberyFailed: true` | — | -1.0 | Legacy only |
| Comebacker | `comebackerInjury: true` | `KILLED_PITCHER` | +3.0 | Different naming |
| Nut Shot | `nutshotEvent: true` | `NUT_SHOT` | +1.0 | Same |
| TOOTBLAN | — (runner event) | `TOOTBLAN` | -3.0 | Both support |

**Legacy Advantage**: Has explicit `failedRobbery` tracking that Enhanced lacks.

---

## 3. SHARED: Play Type Classification

Both use **identical play difficulty categories**:

```typescript
// Shared in types/game.ts
type PlayType =
  | 'routine'     // Standard play
  | 'diving'      // 2.5x fWAR multiplier
  | 'leaping'     // 2.0x fWAR multiplier
  | 'wall'        // 2.5x fWAR multiplier
  | 'charging'    // 1.5x fWAR multiplier
  | 'running'     // 1.5x fWAR multiplier
  | 'sliding'     // 2.5x fWAR multiplier
  | 'over_shoulder'; // 2.0x fWAR multiplier
```

Legacy UI provides button selection; Enhanced infers from location + prompts.

---

## 4. SHARED: Double Play Chain Patterns

Both recognize **standard DP patterns**:

### Legacy (DP_CHAINS constant)
```typescript
const DP_CHAINS: Record<Direction, string> = {
  'Left': '5-4-3',
  'Left-Center': '6-4-3',
  'Center': '6-4-3',
  'Right-Center': '4-6-3',
  'Right': '3-6-3',
};
```

### Enhanced (auto-complete patterns)
```typescript
const isClassicDP =
  (notation === '6-4-3') ||
  (notation === '4-6-3') ||
  (notation === '5-4-3') ||
  (notation === '3-6-3') ||
  (notation === '1-6-3') ||
  (notation === '1-4-3');
```

**Same patterns** - Enhanced adds 1-6-3 and 1-4-3 (pitcher combacker DPs).

---

## 5. SHARED: D3K (Dropped Third Strike)

Both use **identical D3K outcome tracking**:

```typescript
type D3KOutcome = 'OUT' | 'WP' | 'PB' | 'E_CATCHER' | 'E_1B';
```

### Legacy UI Flow (FieldingModal)
1. User selects D3K as result
2. Modal shows 5 outcome buttons
3. Selection recorded in `d3kOutcome`

### Enhanced UI Flow (playClassifier)
1. Detects 2-3 or 2-3-3 sequence
2. Prompts for K vs. Ꝅ (looking)
3. If 2-3-3: Shows `DROPPED_3RD_STRIKE` prompt

---

## 6. SHARED: Error Classification

Both use **identical error types**:

```typescript
type ErrorType = 'fielding' | 'throwing' | 'mental' | 'missed_catch' | 'collision';
```

### Legacy Advantage: Error Context Modifiers

Legacy has **error context** that Enhanced lacks:

```typescript
interface ErrorContext {
  allowedRun: boolean;    // 1.5x fWAR penalty
  wasRoutine: boolean;    // 1.2x fWAR penalty
  wasDifficult: boolean;  // 0.7x penalty (reduced)
}
```

This affects fWAR calculation per FWAR_CALCULATION_SPEC.md Section 8.

**Recommendation**: Enhanced should adopt error context modifiers.

---

## 7. LEGACY ADVANTAGE: Edge Case Handling

Legacy has **edge case toggles** that Enhanced hasn't implemented:

| Edge Case | Legacy Implementation | Enhanced | Notes |
|-----------|----------------------|----------|-------|
| **Infield Fly Rule** | `infieldFlyRule` + `ifrBallCaught` | ❌ Missing | Shows when PO/FO + R1&R2 + <2 outs |
| **Ground Rule Double** | `groundRuleDouble` | ❌ Missing | Shows when result = 2B |
| **Bad Hop** | `badHopEvent` | ❌ Missing | Shows for hits (1B, 2B, 3B) |

### Legacy Contextual Visibility Rules (FieldingModal)
```typescript
// Show IFR toggle when: PO/FO + R1&R2 or bases loaded + < 2 outs
const showIFRToggle =
  ['PO', 'FO'].includes(result) &&
  outs < 2 &&
  ((!!bases.first && !!bases.second) || (!!bases.first && !!bases.second && !!bases.third));

// Show GRD toggle when: Result = 2B
const showGRDToggle = result === '2B';

// Show Bad Hop toggle when: Result is a hit
const showBadHopToggle = ['1B', '2B', '3B'].includes(result);
```

---

## 8. LEGACY ADVANTAGE: Comprehensive FieldingData Schema

Legacy's `FieldingData` interface is more complete:

```typescript
interface FieldingData {
  primaryFielder: Position;
  playType: PlayType;
  errorType?: ErrorType;
  errorContext?: ErrorContext;          // ← Enhanced lacks

  zoneId?: string;                       // Zone-based input
  foulOut?: boolean;

  depth?: DepthType;
  dpRole?: DPRole;                       // ← Enhanced lacks

  assistChain: AssistChainEntry[];
  putoutPosition: Position;

  inferredFielder: Position;
  wasOverridden: boolean;

  // Edge cases (Enhanced lacks all)
  infieldFlyRule: boolean;
  ifrBallCaught: boolean | null;
  groundRuleDouble: boolean;
  badHopEvent: boolean;

  // D3K
  d3kEvent: boolean;
  d3kOutcome: D3KOutcome | null;

  // SMB4-specific
  nutshotEvent: boolean;
  comebackerInjury: boolean;
  robberyAttempted: boolean;
  robberyFailed: boolean;

  savedRun: boolean;
}
```

---

## 9. ENHANCED ADVANTAGE: Auto-Complete Logic

Enhanced has **confidence-based auto-complete** that Legacy lacks:

```typescript
// Enhanced: Skip modal for obvious plays
function shouldAutoComplete(result: ClassificationResult): boolean {
  return result.autoComplete && result.confidence >= 0.85;
}
```

### Auto-Complete Triggers (Enhanced)
| Pattern | Confidence | Modal Skipped? |
|---------|------------|----------------|
| 6-4-3, 4-6-3, 5-4-3 DP | 95% | ✅ Yes |
| Standard X-3 ground out | 92% | ✅ Yes |
| Deep fly out (y > 0.6) | 90% | ✅ Yes |
| Foul out in foul territory | 95% | ✅ Yes |

**Legacy always shows modal** - slower but more explicit.

---

## 10. ENHANCED ADVANTAGE: Coordinate Precision

Enhanced captures **exact (x, y) coordinates**:

```typescript
interface FieldCoordinate {
  x: number;  // 0.0 to 1.0
  y: number;  // 0.0 to 1.4 (includes stands)
}
```

### Spray Chart Benefits
- More precise spray chart visualization
- Better park factor calculations
- HR landing location in stands (y > 1.0)
- Wall scraper vs. bomb classification by y-depth

### Legacy Alternative
- Zone-based input (discrete zones)
- Less precise but sufficient for most analysis
- Easier to implement and use

---

## 11. DIFFERENCES: Input Flow

| Step | Legacy | Enhanced |
|------|--------|----------|
| 1 | Select result button | Drag fielder/batter |
| 2 | Select direction button | Drop at location (coordinates captured) |
| 3 | Select exit type (if hit) | Tap fielder sequence |
| 4 | FieldingModal opens | Auto-complete OR prompts appear |
| 5 | Confirm/adjust fielder | Confirm if needed |
| 6 | Submit | Submit |

**Legacy**: 4-6 taps minimum
**Enhanced**: 1-3 taps for most plays (with auto-complete)

---

## 12. Migration Path: What to Keep from Each

### Keep from Legacy:
1. **Error context modifiers** - Critical for accurate fWAR
2. **Edge case toggles** - IFR, GRD, Bad Hop
3. **dpRole tracking** - Who started/turned/completed DP
4. **Comprehensive FieldingData schema**
5. **Zone-based input as fallback option**

### Keep from Enhanced:
1. **Continuous coordinates** - Better spray chart precision
2. **Auto-complete logic** - Faster UX for obvious plays
3. **Geometric foul detection** - More accurate
4. **Tap-to-build fielding sequence** - Intuitive for complex plays

### Unify:
1. **Inference matrices** → Single source of truth
2. **Special events** → Shared enum with Fame values
3. **Play types** → Already shared via types/game.ts
4. **D3K outcomes** → Already shared
5. **DP chain detection** → Extract to utility

---

## 13. Recommended Shared Architecture

```
src/engines/fielding/
├── inferenceEngine.ts      # Unified fielder inference
│   ├── inferFromCoordinates(x, y, ballType)
│   └── inferFromDirection(direction, ballType)
│
├── playClassifier.ts       # Enhanced's auto-complete logic
│   └── classifyPlay() → { autoComplete, confidence, prompts }
│
├── specialEvents.ts        # Unified event definitions
│   └── SPECIAL_EVENTS: { type, fame, clutch, trigger }
│
├── dpChainDetector.ts      # DP pattern recognition
│   └── detectDPChain(sequence) → DPInfo
│
└── foulDetector.ts         # Coordinate-based detection
    └── isFoulTerritory(x, y) → boolean
```

---

## 14. Integration Strategy

For redesign, recommend **Enhanced input + Legacy data capture**:

1. **Use drag-drop** for primary input (faster)
2. **Show contextual prompts** (from Enhanced)
3. **Capture all FieldingData fields** (from Legacy)
4. **Apply error context modifiers** (from Legacy)
5. **Support edge case toggles** (from Legacy)
6. **Auto-complete obvious plays** (from Enhanced)
7. **Provide zone fallback** for users who prefer it (from Legacy)

---

*End of Overlap Analysis*
