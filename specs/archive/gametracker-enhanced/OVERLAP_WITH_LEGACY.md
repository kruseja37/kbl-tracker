# Enhanced GameTracker: Overlap with Legacy Field

> **Purpose**: Document UX logic overlap between Enhanced (drag-drop) and Legacy (button-based) GameTracker
> **Created**: 2026-02-02
> **Cross-Reference**: [`../gametracker-legacy/OVERLAP_WITH_ENHANCED.md`](../gametracker-legacy/OVERLAP_WITH_ENHANCED.md)

---

## Executive Summary

The Enhanced and Legacy GameTrackers share **~70% of their fielding logic**. The core difference is **input method** (drag-drop vs. button taps), not the underlying baseball rules or data captured.

---

## 1. SHARED: Fielder Inference Logic

Both systems infer the most likely fielder from direction + batted ball type.

### Enhanced Field (playClassifier.ts)
- Derives direction from **continuous coordinates** via `getSpraySector()`
- Infers fielder from **fielding sequence** built by user taps
- Uses y-coordinate depth for outfield/infield determination

### Legacy Field (FieldingModal.tsx)
- Uses **discrete direction enum**: Left, Left-Center, Center, Right-Center, Right
- Inference matrices map direction → primary/secondary/tertiary fielder

### The Matrices Are Equivalent

| Direction | Ground Ball Primary | Fly Ball Primary | Legacy Source |
|-----------|---------------------|------------------|---------------|
| Left | 3B | LF | `GROUND_BALL_INFERENCE`, `FLY_BALL_INFERENCE` |
| Left-Center | SS | CF | Same matrices |
| Center | P | CF | Same matrices |
| Right-Center | 2B | CF | Same matrices |
| Right | 1B | RF | Same matrices |

**Reuse Opportunity**: Extract inference matrices into shared utility. Enhanced can map coordinates → direction → use same matrices.

---

## 2. SHARED: Special Events

Both systems track **identical special events** with same Fame/Clutch impacts:

| Event | Enhanced (playClassifier.ts) | Legacy (FieldingModal.tsx) | Fame Impact |
|-------|------------------------------|----------------------------|-------------|
| Web Gem | `WEB_GEM` prompt at y > 0.8 | `savedRun` + star play type | +1.0 |
| Robbery | `ROBBERY` prompt at y > 0.95 | `robberyAttempted` flag | +1.5 |
| Failed Robbery | — | `robberyFailed` flag | -1.0 |
| Killed Pitcher | `KILLED_PITCHER` prompt | `comebackerInjury` flag | +3.0 (batter) |
| Nut Shot | `NUT_SHOT` prompt | `nutshotEvent` flag | +1.0 (batter) |
| TOOTBLAN | `TOOTBLAN` (runner event) | Same | -3.0 |
| 7+ Pitch AB | `SEVEN_PLUS_PITCH_AB` | — | — |

**Reuse Opportunity**: Consolidate into shared `SpecialEvent` type with `fameValue` and `clutchValue`.

---

## 3. SHARED: Play Types (Difficulty)

Both systems use **identical play type categorization**:

```typescript
// Both systems
type PlayType =
  | 'routine'
  | 'diving'
  | 'leaping'
  | 'wall'
  | 'charging'
  | 'running'
  | 'sliding'
  | 'over_shoulder'
  | 'error'
  | 'robbed_hr'
  | 'failed_robbery';
```

**Reuse Opportunity**: Already shared via `PlayType` in types/game.ts.

---

## 4. SHARED: Double Play Chains

Both recognize the **same DP patterns**:

| Chain | Enhanced (auto-complete) | Legacy (DP_CHAINS constant) |
|-------|-------------------------|----------------------------|
| 6-4-3 | ✅ 95% confidence | Default for Left-Center/Center |
| 4-6-3 | ✅ 95% confidence | Default for Right-Center |
| 5-4-3 | ✅ 95% confidence | Default for Left |
| 3-6-3 | ✅ 95% confidence | Default for Right |
| 1-6-3 | ✅ 95% confidence | Available in dpTypes |
| 1-4-3 | ✅ 95% confidence | Available in dpTypes |

**Reuse Opportunity**: Share DP chain detection logic. Enhanced builds from tap sequence, but validation uses same patterns.

---

## 5. SHARED: Foul Territory Detection

Both detect foul territory, but with different methods:

### Enhanced Field
```typescript
// Geometric formula from coordinates
function isFoulTerritory(x: number, y: number): boolean {
  const distanceFromCenter = Math.abs(x - 0.5);
  const fairZoneHalfWidth = y * 0.5;
  return distanceFromCenter > fairZoneHalfWidth;
}
```

### Legacy Field
- Zone-based: User selects zone → zone has `isFoul` property
- FieldZoneInput component handles detection

**Reuse Opportunity**: Enhanced's geometric detection is more precise; Legacy's is simpler for button-based UX. Could use geometric as source of truth.

---

## 6. SHARED: D3K (Dropped Third Strike)

Both track **identical D3K outcomes**:

```typescript
type D3KOutcome = 'OUT' | 'WP' | 'PB' | 'E_CATCHER' | 'E_1B';
```

| Outcome | Meaning | Both Systems |
|---------|---------|--------------|
| OUT | Thrown out at 1B | ✅ |
| WP | Safe on Wild Pitch | ✅ |
| PB | Safe on Passed Ball | ✅ |
| E_CATCHER | Safe on Catcher Error | ✅ |
| E_1B | Safe on 1B Error | ✅ |

**Reuse Opportunity**: Already using shared type.

---

## 7. SHARED: Error Categories

Both use **identical error classification**:

```typescript
type ErrorType = 'fielding' | 'throwing' | 'mental' | 'missed_catch' | 'collision';
```

Legacy adds **error context modifiers** not in Enhanced:
- `allowedRun: boolean` → 1.5x penalty
- `wasRoutine: boolean` → 1.2x penalty
- `wasDifficult: boolean` → 0.7x penalty (reduced)

**Reuse Opportunity**: Enhanced should adopt error context modifiers for fWAR accuracy.

---

## 8. SHARED: Edge Case Toggles

Both track the **same edge cases**:

| Edge Case | Enhanced | Legacy | Notes |
|-----------|----------|--------|-------|
| Infield Fly Rule | — (not implemented) | `infieldFlyRule` + `ifrBallCaught` | Legacy has it |
| Ground Rule Double | — (not implemented) | `groundRuleDouble` | Legacy has it |
| Bad Hop | — (not implemented) | `badHopEvent` | Legacy has it |

**Reuse Opportunity**: Enhanced needs to add these edge case toggles. Same logic applies.

---

## 9. DIFFERENCES: Input Method

| Aspect | Enhanced | Legacy |
|--------|----------|--------|
| Ball location | Continuous (x, y) from drag | Discrete zone selection |
| Fielder selection | Tap sequence after drag | Inferred → button override |
| Confirmation | Auto-complete if >85% confidence | Always show modal |
| Foul detection | Automatic from coordinates | Manual zone property |

---

## 10. DIFFERENCES: Auto-Complete Logic

Enhanced has **auto-complete** that Legacy lacks:

```typescript
// Enhanced: Skip modal for obvious plays
function shouldAutoComplete(result: ClassificationResult): boolean {
  return result.autoComplete && result.confidence >= 0.85;
}
```

Auto-complete triggers for:
- Classic DPs (6-4-3, 4-6-3, 5-4-3) → 95% confidence
- Standard ground outs (X-3) → 92% confidence
- Deep fly outs (y > 0.6) → 90% confidence
- Foul outs → 95% confidence

Legacy always shows FieldingModal.

---

## 11. Migration Path: What to Keep from Each

### Keep from Enhanced:
1. Continuous coordinate system (better spray chart precision)
2. Auto-complete for obvious plays (faster UX)
3. Geometric foul detection (more accurate)
4. Contextual prompts based on location

### Keep from Legacy:
1. Error context modifiers (allowedRun, wasRoutine, wasDifficult)
2. Edge case toggles (IFR, GRD, Bad Hop)
3. Zone visualization (intuitive fallback)
4. Comprehensive FieldingData schema

### Unify:
1. Fielder inference matrices → single source of truth
2. Special events → shared enum with Fame values
3. Play types → already shared
4. D3K outcomes → already shared
5. DP chain patterns → extract to constant

---

## 12. Recommended Shared Utilities

```
src/utils/fielding/
├── inferenceMatrices.ts    # Unified inference logic
├── specialEvents.ts        # Event types + Fame values
├── dpChains.ts            # DP pattern detection
├── foulDetection.ts       # Coordinate-based detection
└── playClassification.ts  # Shared classification logic
```

---

*End of Overlap Analysis*
