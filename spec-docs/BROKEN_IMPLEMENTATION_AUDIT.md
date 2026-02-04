# GameTracker Implementation Audit - BROKEN PARTS

> **Date**: 2026-01-31
> **Auditor**: Claude
> **Status**: IN PROGRESS - Documenting all issues before fixing

---

## Executive Summary

The current implementation **violates the core principle** of the GAMETRACKER_DRAGDROP_SPEC.md:

> **Spec says**: "The user already told us WHAT happened. Contextual buttons ask 'was there anything SPECIAL about it?'"

> **Current implementation**: Asks "WAS IT A HIT OR OUT?" - the exact opposite of inference

---

## Critical Issues (Spec Violations)

### Issue #1: PlayTypeModal Asks "HIT or OUT?"

**Location**: `EnhancedInteractiveField.tsx` Lines 278-334

**Current Behavior**:
- After fielder is dragged, shows modal: "HIT (Batter Reached)" or "OUT"
- User has to tell the system what happened

**Spec Says** (Line 30-37):
| Action | What It Implies |
|--------|-----------------|
| Drag **fielder** | **OUT** (always) |
| Drag **batter** | **HIT** (always) |

**Root Cause**: The `handleBatterDrop` function (Line 1101-1102) opens `showPlayTypeModal` when auto-complete fails, asking the wrong question.

**Fix Required**: Remove PlayTypeModal entirely. If fielder was dragged → it's an OUT. If batter was dragged → it's a HIT. No modal needed.

---

### Issue #2: CLASSIFY Button Opens Wrong Modal

**Location**: `EnhancedInteractiveField.tsx` Lines 1336-1343

**Current Behavior**:
```typescript
const handleClassifyPlay = useCallback(() => {
  if (batterPosition) {
    setShowPlayTypeModal(true);  // WRONG - opens "HIT or OUT?"
  } else if (placedFielders.length > 0) {
    setShowPlayTypeModal(true);  // WRONG - opens "HIT or OUT?"
  }
}, [batterPosition, placedFielders.length]);
```

**Spec Says** (Pattern 3):
- User drags fielder → taps throw sequence → clicks CLASSIFY
- Engine **infers** play type (F-8, 6-4-3 DP, etc.) and **confirms**

**Fix Required**: CLASSIFY button should:
1. Run inference engine
2. Show **confirmation** of inferred play: "6-4-3 Double Play - Confirm?"
3. NOT ask "was it a hit or out?"

---

### Issue #3: HitTypeModal Shows Wrong Options

**Location**: `EnhancedInteractiveField.tsx` Lines 389-432

**Current Options**: `1B`, `2B`, `3B`

**Spec Says** (Pattern 1, Step 4):
> Pop-up asks for hit type: Ground ball / Line drive / Fly ball

**The Base** (1B, 2B, 3B) should be inferred from WHERE the batter was dropped, not asked.

**Fix Required**:
- Change HitTypeModal options to: `GROUND`, `LINE`, `FLY`
- Infer the base from drop position

---

### Issue #4: OutTypeModal Asks User to Choose

**Location**: `EnhancedInteractiveField.tsx` Lines 434-523

**Current Behavior**:
- Shows all out types: GO, FO, LO, DP, FC, SAC
- User picks the type

**Spec Says** (Pattern 3, Step 3):
> Pop-up **confirms** play type: Shows fielder sequence (e.g., "6-4-3"), Checkboxes: Double play? Triple play?

**The out type should be INFERRED from throw sequence**:
- Single fielder in OF → Fly Out (F-8)
- Sequence 6-4-3 → Ground out or DP
- Sequence 2-3 → Strikeout

**Fix Required**: Remove user selection. Show inferred type with confirm/edit options.

---

### Issue #5: Missing Permanent Quick Buttons

**Location**: QuickButtons component (Lines 621-829)

**Current Buttons**: Only `7+ PITCH` and `HR`

**Spec Says** (Pattern 8):
> Quick buttons below field: [BB] [IBB] [HBP] [K] [Ꝁ] [Drop K] [HR]

**Missing**:
- BB (Walk)
- IBB (Intentional Walk)
- HBP (Hit By Pitch)
- K (Strikeout Swinging)
- Ꝅ (Strikeout Looking)
- Drop K (Dropped 3rd Strike)

**Fix Required**: Add permanent buttons for non-ball-in-play outcomes.

---

### Issue #6: Strikeout Flow Broken

**Spec Says** (Spec Line 58-60):
| Play | First Fielder | Contextual Buttons |
|------|---------------|-------------------|
| K (2-3 seq) | Catcher | `K` / `Ꝅ` (looking) |
| K (2-3-3 seq) | Catcher | `K` / `Ꝅ` / `D3K` |

**Expected Flow**:
- Tap catcher → Tap 1B → CLASSIFY → shows K options
- Tap catcher → Tap 1B → Tap 1B again → shows D3K options

**Current**: No clear strikeout flow. User has to use buttons or hope inference works.

---

### Issue #7: Inference Engine Not Used Properly

**Location**: `playClassifier.ts` (exists) but not properly integrated

**Current**:
- `classifyPlay()` is called but results are ignored
- `shouldAutoComplete()` returns true but we still show modals

**Code Evidence** (Lines 1072-1094):
```typescript
if (shouldAutoComplete(result)) {
  // Auto-completes correctly...
} else {
  // Shows PlayTypeModal asking "HIT or OUT?" - WRONG
  setShowPlayTypeModal(true);
}
```

**Fix Required**: Trust the inference engine. Never ask "hit or out?" - only ask for refinement (Ground/Line/Fly).

---

### Issue #8: Fielder-Only Flow Missing

**Spec Pattern 3**:
1. Drag fielder to ball spot
2. Tap fielders in throw sequence
3. Click CLASSIFY
4. Engine infers out type

**Current Flow**:
- Fielder can be dragged ✓
- Tapping adds to sequence ✓
- CLASSIFY opens "HIT or OUT?" modal ✗
- No way to record an out without involving batter drag

**The Problem**: After dragging a fielder and building throw sequence, there's no way to say "the batter is out" without dragging the batter somewhere.

**Fix Required**: CLASSIFY after fielder-only interaction should immediately infer and confirm the out.

---

### Issue #9: No Confirmation Modal

**Spec Says** (UI Component 8):
> PlayConfirmationPopup: Shows inferred play, Fielder sequence display, Special event checkboxes, Confirm / Edit / Cancel

**Current**: No confirmation modal. Either auto-completes or asks wrong questions.

**Fix Required**: Add PlayConfirmationModal that shows:
```
┌─────────────────────────────┐
│ PLAY CONFIRMED              │
│                             │
│ 6-4-3 Ground Out            │
│ Double Play? [ ] Yes [x] No │
│                             │
│ [CONFIRM]  [EDIT]  [CANCEL] │
└─────────────────────────────┘
```

---

### Issue #10: Base Drop Zones Wrong Y Coordinates

**Location**: `EnhancedInteractiveField.tsx` Lines 1427-1448

**Current**:
```typescript
<DropZoneHighlight position={{ x: 0.75, y: 0.15 }} label="1B" />
<DropZoneHighlight position={{ x: 0.5, y: 0.35 }} label="2B" />
<DropZoneHighlight position={{ x: 0.25, y: 0.15 }} label="3B" />
```

**Spec Says** (Coordinate Mapping):
| Base | Coordinates |
|------|-------------|
| 1B | (0.75, 0.35) |
| 2B | (0.5, 0.42) |
| 3B | (0.25, 0.35) |

**y=0.15 is wrong** - that's near home plate. The bases are at y=0.35-0.42.

---

## Medium Issues

### Issue #11: determineBatterBase Logic Too Simple

**Location**: Lines 944-968

**Current**:
```typescript
if (position.y < 0.5) return '1B';
else if (position.y < 0.8) return '2B';
else return '3B';
```

**Problem**: This is y-based only. Doesn't account for x position.

**Spec implies**: Use proximity to actual base coordinates, not just y thresholds.

---

### Issue #12: Ball Landing Prompt Shows After Wrong Trigger

**Current** (Lines 1061-1068):
- Shows "Touch where ball landed" after batter drag with no fielder sequence

**This is correct** per spec, but the subsequent modal (HitTypeModal) shows wrong options.

---

### Issue #13: Legacy Field Still Has Old Flow

The spec mentions "ENHANCED FIELD" vs "LEGACY FIELD" toggle. Legacy field might have different issues.

---

## UI/UX Issues

### Issue #14: No Visual Feedback for Throw Sequence Building

**Current**: Throw sequence shows as "6-4-3" text in top-left

**Better UX would show**:
- Lines connecting fielders
- Animation when fielder is tapped
- Clear "DONE" or "CLASSIFY" prompt

---

### Issue #15: QuickButtons Layout Wrong

**Spec Location**: Foul territory area (southern border of field)

**Current**: Below field in gray bar

---

### Issue #16: Modal Z-Index Issues

**Observed**: Sometimes modals don't appear or are hidden behind other elements.

---

## Data Flow Issues

### Issue #17: onPlayComplete Gets Wrong Data

When PlayTypeModal is used, the play data doesn't properly reflect what happened because we're asking the user instead of inferring.

---

### Issue #18: Special Events Not Recorded Properly

The Fame values are defined but `onSpecialEvent` callback may not be wired correctly to the useGameState hook.

---

## Summary Table

| Issue # | Severity | Component | Description |
|---------|----------|-----------|-------------|
| 1 | CRITICAL | PlayTypeModal | Asks "HIT or OUT?" instead of inferring |
| 2 | CRITICAL | handleClassifyPlay | Opens wrong modal |
| 3 | HIGH | HitTypeModal | Wrong options (1B/2B/3B vs Ground/Line/Fly) |
| 4 | HIGH | OutTypeModal | Asks user instead of inferring |
| 5 | HIGH | QuickButtons | Missing BB/IBB/HBP/K/Ꝅ/D3K buttons |
| 6 | HIGH | Strikeout Flow | No clear catcher-first flow |
| 7 | CRITICAL | Inference Engine | Not trusted, ignored |
| 8 | CRITICAL | Fielder-Only Flow | Can't record out without batter drag |
| 9 | HIGH | Confirmation Modal | Missing entirely |
| 10 | MEDIUM | Drop Zones | Wrong Y coordinates |
| 11 | MEDIUM | determineBatterBase | Logic too simple |
| 12 | LOW | Ball Landing | Works but leads to wrong modal |
| 13 | MEDIUM | Legacy Field | May have different issues |
| 14 | LOW | Visual Feedback | Could be better |
| 15 | LOW | QuickButtons Location | Not in foul territory |
| 16 | LOW | Z-Index | Modal visibility |
| 17 | HIGH | onPlayComplete | Gets wrong data |
| 18 | MEDIUM | Special Events | May not be wired |

---

## Next Steps

1. **DO NOT FIX YET** - Continue testing to find more issues
2. Test Runner drag-drop flow
3. Test Undo system
4. Test Legacy field
5. Verify all spec patterns work
6. Document everything before fixing

---

## Additional Issues Found During Browser Testing

### Issue #19: Undo Button Placement Correct But Hard to See

**Observed**: Undo button exists at top-left, shows "↩ 0" when empty
**Spec Compliant**: Yes, this is correct per spec
**Minor Issue**: Very small and could be more visible

---

### Issue #20: No Runners on Base = No Runner Drag Testing

**Current**: With bases empty, can't test runner drag-drop flow
**Need**: Record a hit first to place a runner, then test runner movement

---

### Issue #21: Legacy Field is Completely Different

**Observed**: LEGACY FIELD toggle shows a different rendering:
- Different SVG layout
- Different fielder positioning
- May have different drag-drop handlers

**Question**: Should both fields have the same interaction logic?

---

### Issue #22: No Foul Territory Shading Visible

**Spec Says** (Line 685-686):
> Foul lines visible at 45° from home
> Foul territory shaded differently

**Current**: Foul territory is not visually distinct from fair territory

---

### Issue #23: No Stands Area Visible for HR Drag

**Spec Says** (Line 681-684):
> SVG field with stands area (y extends to 1.4)
> Wall line clearly visible at y=1.0
> Stands rendered with seat pattern above wall

**Current**: No visible stands area above the outfield wall

---

### Issue #24: CLASSIFY Button Only Appears After Drop

**Spec Implies**: CLASSIFY should appear after throw sequence is built
**Current Behavior**: `canClassify` only true when `batterPosition !== null || placedFielders.length > 0`

**The problem**: User can drag fielder → build throw sequence → but CLASSIFY only shows when batter is also placed
- Spec Pattern 3 says: Drag fielder → Tap throw sequence → Click CLASSIFY
- Current: Requires batter involvement

---

## Spec vs Implementation Comparison Table

| Spec Requirement | Current Implementation | Status |
|------------------|----------------------|--------|
| Drag fielder = OUT always | Asks "HIT or OUT?" | ❌ BROKEN |
| Drag batter = HIT always | Works for HR, unclear for base hits | ⚠️ PARTIAL |
| CLASSIFY infers play type | Opens modal asking user | ❌ BROKEN |
| Hit type = Ground/Line/Fly | Shows 1B/2B/3B | ❌ WRONG |
| Out type = Inferred from sequence | User selects from list | ❌ BROKEN |
| Quick buttons: BB/IBB/HBP/K/Ꝅ/D3K | Only 7+ PITCH and HR | ❌ MISSING |
| Undo button top-left | ✓ Exists | ✅ OK |
| 5-step undo stack | ✓ Implemented | ✅ OK |
| Toast on undo | ✓ Implemented | ✅ OK |
| Stands area (y > 1.0) | Not visible | ❌ MISSING |
| Foul territory shaded | Not visible | ❌ MISSING |
| Wall line at y=1.0 | Orange curve visible | ✅ OK |
| Base drop zones with safe/out | Code exists but wrong Y coords | ⚠️ PARTIAL |
| Contextual buttons after play | Some implemented | ⚠️ PARTIAL |
| Lineup card subs | Component exists | ⚠️ UNTESTED |
| Bullpen pitching changes | Component exists | ⚠️ UNTESTED |

---

## Root Cause Analysis

### The Fundamental Design Flaw

The current implementation treats drag-drop as **ambiguous** when it should be **deterministic**.

**Spec Philosophy** (from AI_OPERATING_PREFERENCES.md Section 13):
> "The system should infer what it can from existing play-by-play data"
> "Prompt only when uncertain"
> "Never ask the obvious"

**Current Philosophy**:
> "Ask the user what happened"

This is a fundamental architectural mismatch. The entire modal flow needs to be rethought.

### What Should Happen

```
USER ACTION          → SYSTEM INFERENCE        → USER REFINEMENT (if needed)
─────────────────────────────────────────────────────────────────────────────
Drag fielder to spot → OUT                     → What type? (GO/FO/LO/DP)
                                                  Only if not auto-inferred
                                                  from throw sequence

Drag batter to base  → HIT to that base        → What type? (Ground/Line/Fly)
                       + prompt ball location    Always ask ball type

Drag batter to stands→ HOME RUN                → Distance (ft)? Always ask

Tap catcher → 1B     → STRIKEOUT               → K or Ꝅ? Always ask

Click BB button      → WALK                    → None needed

Click K button       → STRIKEOUT               → K or Ꝅ? Always ask
```

### What Currently Happens

```
USER ACTION          → SYSTEM RESPONSE
───────────────────────────────────────
Drag fielder         → "WAS IT A HIT OR OUT?" ← WRONG

Drag batter to base  → Sometimes works, sometimes asks

CLASSIFY button      → Opens "HIT OR OUT?" modal ← WRONG
```

---

## Testing Status

- [x] Fielder drag - triggers wrong modal ❌
- [x] Undo button - exists and works ✅
- [x] Enhanced/Legacy toggle - works ✅
- [ ] Batter drag to base - NEED TO TEST
- [ ] Batter drag to stands (HR) - NEED TO TEST
- [ ] Runner drag safe - NEED RUNNER ON BASE FIRST
- [ ] Runner drag out - NEED RUNNER ON BASE FIRST
- [ ] Throw sequence building - NEED TO TEST
- [ ] HR button - NEED TO TEST
- [ ] Strikeout via catcher tap - NEED TO TEST

---

### Issue #25: HR Button Skips Location Prompt

**Spec Says** (Pattern - Method B: HR Button):
> Step 1: Tap HR button
> Step 2: Engine prompts: "Touch where the ball landed" (User taps location in stands)
> Step 3: Pop-up with text input: "Distance (ft)?"

**Current Behavior**:
- Immediately opens distance modal
- Defaults to "BOMB" type (center field, y=1.2)
- Skips the location tap step entirely

**Impact**: No spray chart data captured for HR button entry

---

## Summary: 25 Issues Found

| Category | Count | Examples |
|----------|-------|----------|
| **Critical Flow Bugs** | 8 | PlayTypeModal, CLASSIFY button, inference engine |
| **Missing Features** | 6 | Quick buttons, stands visual, foul shading |
| **Wrong Implementation** | 5 | HitTypeModal options, HR button flow |
| **Partial/Untested** | 4 | Runner drag, lineup card, drop zones |
| **Minor** | 2 | Undo visibility, legacy field |

---

## Priority Fix Order

1. **P0 - CRITICAL**: Remove PlayTypeModal "HIT or OUT?" entirely
2. **P0 - CRITICAL**: Make fielder drag = OUT (always)
3. **P0 - CRITICAL**: Make batter drag = HIT (always, or HR if in stands)
4. **P0 - CRITICAL**: CLASSIFY button must INFER, not ASK
5. **P1 - HIGH**: Fix HitTypeModal options (Ground/Line/Fly, not 1B/2B/3B)
6. **P1 - HIGH**: Make out type inferred from throw sequence
7. **P1 - HIGH**: Add missing quick buttons (BB/IBB/HBP/K/Ꝅ/D3K)
8. **P1 - HIGH**: Fix HR button to prompt location first
9. **P2 - MEDIUM**: Add stands area visual (y > 1.0)
10. **P2 - MEDIUM**: Add foul territory shading
11. **P2 - MEDIUM**: Fix base drop zone Y coordinates
12. **P3 - LOW**: Add PlayConfirmationModal for inferred plays

---

## Conclusion

The implementation has **fundamental architectural issues**. The core philosophy is wrong:

| Aspect | Spec Philosophy | Current Philosophy |
|--------|-----------------|-------------------|
| User action meaning | **Deterministic** (fielder drag = OUT) | Ambiguous (ask user) |
| Play type detection | **Infer from data** | Ask user |
| Modal purpose | **Confirm/refine** inferred play | Ask what happened |
| Quick buttons | **Record non-ball-in-play** outcomes | Only 2 of 8 present |

**The fix is not incremental patches - it requires rethinking the entire flow.**

The inference engine (`playClassifier.ts`) exists and is capable - it's just not being trusted. The fix should:
1. Trust the inference engine
2. Remove all "what happened?" modals
3. Only show "confirm?" or "refine?" modals
4. Add missing quick buttons for K/BB/etc.

