# GameTracker Implementation Audit - BROKEN PARTS (v2)

> **Date**: 2026-01-31
> **Auditor**: Claude
> **Status**: NFL Testing In Progress
> **Version**: 2.0 - Added 6 new issues from hands-on testing

---

## Executive Summary

The current Enhanced Field implementation **violates the core principle** of the GAMETRACKER_DRAGDROP_SPEC.md AND has fundamental coordinate transformation bugs.

> **Spec says**: "The user already told us WHAT happened. Contextual buttons ask 'was there anything SPECIAL about it?'"

> **Current implementation**: Asks "WAS IT A HIT OR OUT?" AND teleports fielders to wrong locations

---

## NEW ISSUES FROM NFL TESTING (Jan 31, 2026)

### Issue #26: Fielder Duplicated After Drag

**Severity**: HIGH

**Observed**: After dragging a fielder (SS Brown, CF Smith, RF Davis), the fielder appears in TWO places:
1. A red/magenta box at the "dropped" location with a sequence badge
2. The original fielder label remains (sometimes faded) at their default position

**Expected**: Fielder should move to ONE location only - where they were dropped.

---

### Issue #27: CLASSIFY Button Non-Functional (Single Fielder)

**Severity**: CRITICAL

**Observed**: After dragging a single fielder (SS, sequence shows "6"):
- CLASSIFY button appears
- Clicking CLASSIFY does **nothing** - no modal, no action, no response

**Expected**: CLASSIFY should infer "Ground Out to SS" or "Fly Out to SS" based on ball location.

---

### Issue #28: CLASSIFY Button Non-Functional (Full Sequence)

**Severity**: CRITICAL

**Observed**: Even with a complete throw sequence (6-4-3):
- Dragged SS (Brown) → sequence shows "6"
- Tapped 2B (Wilson) → sequence shows "6-4"
- Tapped 1B (Martin) → sequence shows "6-4-3"
- Clicked CLASSIFY → **NOTHING HAPPENS**

**Expected**: Should recognize 6-4-3 as a double play pattern and either:
- Auto-complete as "6-4-3 Ground Out" (no runners = can't be DP)
- Show confirmation: "Ground Out, SS to 2B to 1B - Confirm?"

---

### Issue #29: Ball Landing Tap Partially Working

**Severity**: MEDIUM

**Observed**: After batter drag, "TAP WHERE THE BALL LANDED" prompt appears.
- Clicking in outfield grass area: sometimes doesn't register
- Clicking in infield area: worked, showed HitTypeModal

**Expected**: Any tap on the field should register the ball landing location.

---

### Issue #30: FIELDER TELEPORTS TO WRONG LOCATION (P0 CRITICAL)

**Severity**: P0 - CRITICAL - BLOCKS ALL SPRAY CHART DATA

**Root Cause Confirmed**: Enhanced Field has broken coordinate transformation.

**Test Results**:

| Field Type | Drag Target | Expected Position | Actual Position |
|------------|-------------|-------------------|-----------------|
| Enhanced Field | RF to (800, 420) | (800, 420) | (~800, 335) - WRONG Y! |
| Legacy Field | RF to (900, 500) | (900, 500) | (895, 500) - CORRECT ✓ |

**Impact**: This **completely breaks spray chart data** because:
- Spec says: "Drag fielder to ball location" - captures where ball was hit
- Enhanced Field: Fielder appears at WRONG Y coordinate
- All spray chart data will be inaccurate

**Legacy Field works correctly** - fielders stay exactly where dropped.

---

### Issue #31: Massive Wasted Space on Enhanced Field

**Severity**: MEDIUM (UX)

**Observed**: Enhanced Field has huge empty green areas on LEFT and RIGHT sides of the field.

**Comparison**:
| Field Type | Field Coverage | Screen Utilization |
|------------|----------------|-------------------|
| Enhanced Field | ~40% of width | Poor - huge dead zones |
| Legacy Field | ~90% of width | Good - fills viewport |

**Impact**:
- Wasted screen real estate
- Field looks small and cramped
- On iPad/tablet, the wasted space would be even more pronounced

**Recommendation**: Enhanced Field should scale to fill available width like Legacy Field does.

---

## Previously Documented Issues (1-25)

### Critical Issues (Spec Violations)

| Issue | Description | Severity |
|-------|-------------|----------|
| #1 | PlayTypeModal Asks "HIT or OUT?" instead of inferring | CRITICAL |
| #2 | CLASSIFY Button Opens Wrong Modal | CRITICAL |
| #3 | HitTypeModal Shows Wrong Options (1B/2B/3B vs Ground/Line/Fly) | HIGH |
| #4 | OutTypeModal Asks User to Choose instead of inferring | HIGH |
| #5 | Missing Quick Buttons (BB/IBB/HBP/K/Ꝅ/D3K) | HIGH |
| #6 | Strikeout Flow Broken | HIGH |
| #7 | Inference Engine Not Trusted | CRITICAL |
| #8 | Fielder-Only Flow Missing (can't record out without batter) | CRITICAL |
| #9 | No Confirmation Modal for inferred plays | HIGH |
| #10 | Base Drop Zones Wrong Y Coordinates | MEDIUM |

### Medium Issues

| Issue | Description | Severity |
|-------|-------------|----------|
| #11 | determineBatterBase Logic Too Simple | MEDIUM |
| #12 | Ball Landing Prompt Shows After Wrong Trigger | LOW |
| #13 | Legacy Field May Have Different Issues | MEDIUM |
| #14 | No Visual Feedback for Throw Sequence Building | LOW |
| #15 | QuickButtons Layout Wrong | LOW |
| #16 | Modal Z-Index Issues | LOW |
| #17 | onPlayComplete Gets Wrong Data | HIGH |
| #18 | Special Events Not Recorded Properly | MEDIUM |

### Additional Issues From Browser Testing

| Issue | Description | Severity |
|-------|-------------|----------|
| #19 | Undo Button Placement Correct But Hard to See | MINOR |
| #20 | No Runners on Base = No Runner Drag Testing | N/A |
| #21 | Legacy Field is Completely Different | MEDIUM |
| #22 | No Foul Territory Shading Visible | MEDIUM |
| #23 | No Stands Area Visible for HR Drag | MEDIUM |
| #24 | CLASSIFY Button Only Appears After Drop | MEDIUM |
| #25 | HR Button Skips Location Prompt | HIGH |

---

## Updated Summary: 31 Issues Found

| Category | Count | Examples |
|----------|-------|----------|
| **Critical Flow Bugs** | 11 | PlayTypeModal, CLASSIFY button (#27, #28), fielder teleport (#30) |
| **Missing Features** | 6 | Quick buttons, stands visual, foul shading |
| **Wrong Implementation** | 6 | HitTypeModal options, fielder duplication (#26) |
| **Partial/Untested** | 5 | Runner drag, ball landing tap (#29) |
| **UX/Layout** | 3 | Wasted space (#31), undo visibility |

---

## Priority Fix Order

### P0 - CRITICAL (Must Fix Before Any Testing)

1. **Issue #30**: Fix fielder teleportation - use Legacy Field coordinate logic
2. **Issue #28**: Make CLASSIFY button functional
3. **Issue #27**: CLASSIFY should work with single fielder
4. **Issue #1**: Remove PlayTypeModal "HIT or OUT?"
5. **Issue #7**: Trust inference engine for play classification
6. **Issue #8**: Enable fielder-only out recording

### P1 - HIGH (Core Functionality)

7. **Issue #26**: Fix fielder duplication after drag
8. **Issue #3**: Fix HitTypeModal options (Ground/Line/Fly, not 1B/2B/3B)
9. **Issue #5**: Add missing quick buttons (BB/IBB/HBP/K/Ꝅ/D3K)
10. **Issue #4**: Make out type inferred from throw sequence
11. **Issue #25**: Fix HR button to prompt location first

### P2 - MEDIUM (Polish)

12. **Issue #31**: Fix wasted space - scale field to fill viewport
13. **Issue #29**: Improve ball landing tap registration
14. **Issue #22**: Add foul territory shading
15. **Issue #23**: Add stands area visual
16. **Issue #10**: Fix base drop zone Y coordinates

### P3 - LOW (Nice to Have)

17. **Issue #9**: Add PlayConfirmationModal for inferred plays
18. **Issue #14**: Add visual feedback for throw sequence
19. **Issue #19**: Make undo button more visible

---

## Recommendation: Use Legacy Field as Reference

The **Legacy Field correctly implements**:
- ✅ Fielder positioning (stays where dropped)
- ✅ Better screen space utilization
- ✅ Cleaner visual design

The Enhanced Field should adopt the Legacy Field's coordinate handling while adding the enhanced features (throw sequences, contextual buttons, etc.).

---

## Batter Drag: PARTIALLY WORKING ✓

**What Works**:
- Dragging batter correctly infers "HIT"
- Base is correctly inferred from drop location (e.g., "1B HIT")
- Prompts for ball landing location
- Records the hit in scoreboard (H count increases)

**What's Wrong**:
- HitTypeModal shows 1B/2B/3B instead of Ground/Line/Fly
- Ball landing tap doesn't always register

---

## Root Cause Analysis

### The Fundamental Design Flaws

1. **Coordinate Transformation Bug**: Enhanced Field doesn't preserve drop coordinates
2. **Philosophy Mismatch**: Asks "what happened?" instead of "confirm what I inferred"
3. **Non-Functional Buttons**: CLASSIFY button appears but doesn't work
4. **Wasted Space**: Field doesn't scale to fill viewport

### The Fix Strategy

1. **Copy Legacy Field coordinate handling** to Enhanced Field
2. **Trust the inference engine** - it exists and works
3. **Remove all "what happened?" modals** - replace with confirmation
4. **Scale field to fill viewport** - like Legacy Field does
5. **Wire CLASSIFY button** to actually call the inference engine

---

## Testing Status

- [x] Fielder drag (SS) - triggers sequence, CLASSIFY broken ❌
- [x] Fielder drag (CF) - same issue ❌
- [x] Fielder drag (RF) - TELEPORTS to wrong position ❌
- [x] Batter drag to 1B - WORKS (partially) ✓
- [x] Throw sequence building (6-4-3) - works visually ✓
- [x] CLASSIFY button - COMPLETELY BROKEN ❌
- [x] Legacy Field fielder drag - WORKS CORRECTLY ✓
- [ ] Runner drag - needs runner on base first
- [ ] iPad responsiveness - pending
- [ ] HR button flow - pending

---

*Document updated: January 31, 2026*
*Next: Continue NFL testing on runner drag, iPad layout, HR flow*
