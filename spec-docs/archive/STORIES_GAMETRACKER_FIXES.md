# GameTracker Fix Stories

> **Created**: 2026-01-31
> **Source**: BROKEN_IMPLEMENTATION_AUDIT_v2.md (31 issues)
> **Purpose**: Actionable stories for Claude Code to implement fixes

---

## P0 - CRITICAL (Must Fix First)

### GT-001: Fix Fielder Teleportation on Enhanced Field

**Priority**: P0 - CRITICAL
**Issue**: #30
**Blocks**: All spray chart data accuracy

**Problem**:
When dragging a fielder on Enhanced Field, they appear at a WRONG Y coordinate.
- Drag RF to (800, 420) → appears at (800, 335) - WRONG!
- Legacy Field works correctly - fielders stay where dropped

**Root Cause**:
Enhanced Field's coordinate transformation is broken. The SVG viewBox or coordinate conversion doesn't preserve the drop location.

**Acceptance Criteria**:
- [ ] Fielder appears at EXACT coordinates where dropped (within 5px tolerance)
- [ ] Ball location stored matches visual drop position
- [ ] Works for all 9 fielder positions
- [ ] Test: Drag CF to y=400, verify they appear at y≈400

**Files to Investigate**:
- `src/src_figma/app/components/EnhancedInteractiveField.tsx`
- `src/src_figma/app/components/FieldCanvas.tsx`
- `src/src_figma/app/components/FielderIcon.tsx`
- Compare with Legacy Field coordinate handling

**Fix Approach**:
1. Check how Legacy Field converts screen coords to field coords
2. Apply same logic to Enhanced Field
3. Verify SVG viewBox settings match

---

### GT-002: Make CLASSIFY Button Functional

**Priority**: P0 - CRITICAL
**Issue**: #27, #28
**Blocks**: Recording ANY out via fielder drag

**Problem**:
CLASSIFY button appears after fielder drag but clicking it does NOTHING.
- Single fielder (6): CLASSIFY does nothing
- Full sequence (6-4-3): CLASSIFY does nothing

**Acceptance Criteria**:
- [ ] CLASSIFY button calls the inference engine
- [ ] Single fielder → infers fly out or ground out based on ball depth
- [ ] 6-4-3 sequence → infers "Ground Out, SS-2B-1B" (or DP if runners on)
- [ ] Shows confirmation modal with inferred play type
- [ ] User can confirm or adjust

**Files to Investigate**:
- `src/src_figma/app/components/EnhancedInteractiveField.tsx` (CLASSIFY onClick)
- `src/src_figma/app/components/playClassifier.ts` (inference engine)
- Trace what happens when CLASSIFY is clicked

**Fix Approach**:
1. Find CLASSIFY button onClick handler
2. Wire it to call `classifyPlay()` from playClassifier.ts
3. Pass throw sequence + ball location to classifier
4. Display result in confirmation modal

---

### GT-003: Remove "HIT or OUT?" Modal (PlayTypeModal)

**Priority**: P0 - CRITICAL
**Issue**: #1, #7

**Problem**:
After CLASSIFY, system asks "Was it a HIT or OUT?" - but we already KNOW:
- Fielder drag = OUT (always)
- Batter drag = HIT (always)

**Spec Says**:
> "The user already told us WHAT happened. Contextual buttons ask 'was there anything SPECIAL about it?'"

**Acceptance Criteria**:
- [ ] PlayTypeModal removed entirely OR only used for edge cases
- [ ] Fielder drag → goes directly to OutTypeModal or auto-completes
- [ ] Batter drag → goes directly to HitTypeModal
- [ ] No "HIT or OUT?" question ever asked

**Files to Investigate**:
- `src/src_figma/app/components/PlayTypeModal.tsx`
- `src/src_figma/app/components/EnhancedInteractiveField.tsx`
- Find where PlayTypeModal is triggered

**Fix Approach**:
1. Remove PlayTypeModal from the flow
2. After fielder drag + CLASSIFY → call OutTypeModal directly
3. After batter drag → call HitTypeModal directly

---

### GT-004: Enable Fielder-Only Out Recording

**Priority**: P0 - CRITICAL
**Issue**: #8

**Problem**:
Currently can't record an out by just dragging a fielder. The system seems to require batter involvement.

**Spec Says**:
- Drag fielder to ball location = OUT
- Tap additional fielders = throw sequence
- CLASSIFY infers out type from sequence

**Acceptance Criteria**:
- [ ] Drag fielder → builds throw sequence
- [ ] CLASSIFY → records out WITHOUT needing batter drag
- [ ] Ground out: 6-3 (SS to 1B)
- [ ] Fly out: 8 (CF catch)
- [ ] Double play: 6-4-3 (with runner on 1st)

**Files to Investigate**:
- `src/src_figma/app/components/EnhancedInteractiveField.tsx`
- Check if there's a flag requiring batter involvement

**Fix Approach**:
1. Ensure throw sequence can be built without batter
2. CLASSIFY should work with fielder-only sequence
3. Complete the out recording flow

---

## P1 - HIGH (Core Functionality)

### GT-005: Fix Fielder Duplication After Drag

**Priority**: P1 - HIGH
**Issue**: #26

**Problem**:
After dragging a fielder, they appear in TWO places:
1. Red box at dropped location (with sequence badge)
2. Original position (faded label)

**Acceptance Criteria**:
- [ ] Fielder appears in ONE location only after drag
- [ ] Original position cleared or clearly shown as "moved from here"
- [ ] No duplicate labels

**Fix Approach**:
1. On drag start, hide or remove original fielder marker
2. On drag end, show fielder at new position only
3. Or: Show "ghost" at original with clear visual distinction

---

### GT-006: Fix HitTypeModal Options

**Priority**: P1 - HIGH
**Issue**: #3

**Problem**:
HitTypeModal shows: **1B, 2B, 3B** (the base result)
Should show: **Ground, Line, Fly** (the trajectory)

The BASE is already known from where the batter was dragged!

**Acceptance Criteria**:
- [ ] HitTypeModal shows "Ground Ball", "Line Drive", "Fly Ball"
- [ ] Base (1B/2B/3B) inferred from batter drop location
- [ ] Selection records hit trajectory for spray chart analysis

**Files to Investigate**:
- `src/src_figma/app/components/HitTypeModal.tsx`

**Fix Approach**:
1. Change HitTypeModal options to Ground/Line/Fly
2. Pass base info separately from trajectory
3. Record both: `{ base: '1B', trajectory: 'ground' }`

---

### GT-007: Add Missing Quick Buttons

**Priority**: P1 - HIGH
**Issue**: #5

**Problem**:
Only 2 quick buttons present: "7+ PITCH" and "HR"
Missing: BB, IBB, HBP, K, Ꝅ (looking K), D3K

**Spec Says**:
Quick buttons for non-ball-in-play outcomes should be prominent.

**Acceptance Criteria**:
- [ ] BB (Walk) button
- [ ] K (Strikeout swinging) button
- [ ] Ꝅ (Strikeout looking) button
- [ ] HBP (Hit by pitch) button
- [ ] Optional: IBB, D3K as secondary options

**Files to Investigate**:
- `src/src_figma/app/components/EnhancedInteractiveField.tsx`
- `src/src_figma/app/components/QuickButtons.tsx` (if exists)

**Fix Approach**:
1. Add button row below field: [BB] [K] [Ꝅ] [HBP] [HR]
2. Each button records the appropriate at-bat result
3. Style consistently with existing buttons

---

### GT-008: Infer Out Type from Throw Sequence

**Priority**: P1 - HIGH
**Issue**: #4

**Problem**:
OutTypeModal asks user to pick out type instead of inferring from throw sequence.

**Inference Logic**:
| Sequence | Inferred Out Type |
|----------|-------------------|
| 8 | Fly Out (F8) |
| 6-3 | Ground Out (6-3) |
| 5 | Ground Out (5 unassisted) |
| 6-4-3 | DP (if runner on 1st) or GO |
| 4-6-3 | DP (if runner on 1st) or GO |
| 1-6-3 | Comebacker, GO |

**Acceptance Criteria**:
- [ ] Out type auto-inferred from throw sequence
- [ ] User shown confirmation, can override if wrong
- [ ] Common patterns auto-detected (6-4-3 DP, etc.)

**Files to Investigate**:
- `src/src_figma/app/components/playClassifier.ts`
- `src/src_figma/app/components/OutTypeModal.tsx`

---

### GT-009: Fix HR Button Flow

**Priority**: P1 - HIGH
**Issue**: #25

**Problem**:
HR button immediately records HR without asking for location.
Should prompt for location first (for spray chart).

**Acceptance Criteria**:
- [ ] HR button → prompts "TAP WHERE BALL LEFT YARD"
- [ ] User taps location in outfield
- [ ] Then prompts for distance (optional)
- [ ] Records HR with spray chart data

**Fix Approach**:
1. HR button sets mode to "awaiting HR location"
2. User taps outfield area
3. Show distance input (250-550 ft range)
4. Complete HR recording

---

## P2 - MEDIUM (Polish & UX)

### GT-010: Fix Wasted Space / Scale Field to Viewport

**Priority**: P2 - MEDIUM
**Issue**: #31

**Problem**:
Enhanced Field uses only ~40% of screen width. Huge dead zones on left and right.
Legacy Field uses ~90% - much better.

**Acceptance Criteria**:
- [ ] Field scales to fill available width
- [ ] Maintains proper aspect ratio
- [ ] Works on different screen sizes
- [ ] iPad layout uses space efficiently

**Fix Approach**:
1. Check CSS/SVG viewBox settings
2. Use responsive width like Legacy Field
3. Test on various screen widths

---

### GT-011: Improve Ball Landing Tap Registration

**Priority**: P2 - MEDIUM
**Issue**: #29

**Problem**:
"TAP WHERE BALL LANDED" prompt sometimes doesn't register clicks.
Works in infield but not always in outfield.

**Acceptance Criteria**:
- [ ] Tap anywhere on field registers location
- [ ] Visual feedback when tap registered
- [ ] Works in outfield, infield, and foul territory

**Fix Approach**:
1. Check click/touch event handlers
2. Ensure field SVG receives all pointer events
3. Add visual feedback (dot or pulse) when location registered

---

### GT-012: Add Foul Territory Visual Shading

**Priority**: P2 - MEDIUM
**Issue**: #22

**Problem**:
No visual indication of foul territory on Enhanced Field.

**Acceptance Criteria**:
- [ ] Foul territory shaded differently (lighter green or gray)
- [ ] Foul lines clearly visible
- [ ] Ball drops in foul = auto-detected as foul ball

**Fix Approach**:
1. Add SVG path for foul territory
2. Apply different fill color
3. Update isFoulTerritory() detection if needed

---

### GT-013: Add Stands Area Visual for HR

**Priority**: P2 - MEDIUM
**Issue**: #23

**Problem**:
No visual stands area beyond outfield fence.
Can't drag to stands for HR.

**Acceptance Criteria**:
- [ ] Stands area visible beyond fence (y > 1.0 in spec coords)
- [ ] Different visual treatment (gray/blue)
- [ ] Dragging batter to stands = HR auto-detected

**Fix Approach**:
1. Extend SVG to show stands area
2. Add visual boundary (fence line)
3. Ball in stands → auto-classify as HR

---

### GT-014: Fix Base Drop Zone Coordinates

**Priority**: P2 - MEDIUM
**Issue**: #10

**Problem**:
Base drop zones may have incorrect Y coordinates for determining 1B/2B/3B.

**Acceptance Criteria**:
- [ ] Drop near 1B → "1B HIT"
- [ ] Drop near 2B → "2B HIT"
- [ ] Drop near 3B → "3B HIT"
- [ ] Coordinates match visual base positions

**Fix Approach**:
1. Map screen coordinates to base positions
2. Test each base detection
3. Adjust thresholds as needed

---

## P3 - LOW (Nice to Have)

### GT-015: Add Confirmation Modal for Inferred Plays

**Priority**: P3 - LOW
**Issue**: #9

**Problem**:
No confirmation shown for auto-inferred plays.

**Acceptance Criteria**:
- [ ] After inference, show: "6-3 Ground Out - Confirm?"
- [ ] User can confirm (one tap) or adjust
- [ ] Clear display of what was inferred

---

### GT-016: Visual Feedback for Throw Sequence Building

**Priority**: P3 - LOW
**Issue**: #14

**Problem**:
No visual line showing throw path as sequence is built.

**Acceptance Criteria**:
- [ ] Lines drawn between fielders in sequence
- [ ] Animates as fielders are tapped
- [ ] Clear order indication (1, 2, 3 badges)

---

### GT-017: Make Undo Button More Visible

**Priority**: P3 - LOW
**Issue**: #19

**Problem**:
Undo button exists but is hard to find.

**Acceptance Criteria**:
- [ ] Undo button prominently placed
- [ ] Clear undo count indicator
- [ ] Works for all play types

---

## Implementation Order

### Sprint 1: Foundation (GT-001, GT-002)
1. **GT-001**: Fix coordinate teleportation - everything depends on this
2. **GT-002**: Make CLASSIFY button work - core recording flow

### Sprint 2: Core Flow (GT-003, GT-004, GT-006)
3. **GT-003**: Remove "HIT or OUT?" modal
4. **GT-004**: Enable fielder-only outs
5. **GT-006**: Fix HitTypeModal options

### Sprint 3: Quick Actions (GT-005, GT-007, GT-008, GT-009)
6. **GT-005**: Fix fielder duplication
7. **GT-007**: Add missing quick buttons
8. **GT-008**: Auto-infer out types
9. **GT-009**: Fix HR button flow

### Sprint 4: Polish (GT-010 through GT-017)
10. All P2 and P3 issues

---

## Testing Checklist

After fixes, verify:

- [ ] Drag SS to (700, 450) → SS appears at (700, 450)
- [ ] Tap 2B, tap 1B → sequence shows "6-4-3"
- [ ] Click CLASSIFY → shows "Ground Out 6-4-3 - Confirm?"
- [ ] Confirm → out recorded, batter advances
- [ ] Drag batter to 1B area → "1B HIT" prompt appears
- [ ] Tap ball location → HitTypeModal shows Ground/Line/Fly
- [ ] Click BB button → walk recorded
- [ ] Click K button → strikeout recorded
- [ ] Click HR button → prompts for location first
- [ ] Field fills viewport width (no dead zones)

---

*Stories ready for Claude Code implementation*
