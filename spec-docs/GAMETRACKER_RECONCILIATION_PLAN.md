# GameTracker Reconciliation Plan

**Date:** 2026-03-07
**Spec:** MODE_2_V1_FINAL.md §3-§7
**Discrepancies found:** 17
**JK decisions:** A=9, B=4, C=2, D=2

---

## Approved Fixes (ordered by priority)

### Batch 1: QuickBar Flow Fixes (Blocking)

| # | Discrepancy | Decision | Fix Description | Files | Effort |
|---|-------------|----------|----------------|-------|--------|
| D-1 | QuickBar has no context-sensitive button disabling (§6.8) | A — align | Pass `gameSituation` (outs, bases) to QuickBar; disable SAC at 2 outs, SF at 2 outs or no R3, DP at 2 outs or no runners, TP with <2 runners | QuickBar.tsx, GameTracker.tsx | S |
| D-3 | Error from QuickBar has no prompts (§3.5) | A — align | After E tap, show sequential prompts: "Reached which base?" → position selector → error type (Fielding/Throwing/Mental). 3-4 taps total | GameTracker.tsx | M |
| D-4 | HR from QuickBar has no inline distance prompt (§3.1) | A — align | After HR tap, show small overlay: distance text input + optional pitch type. Tap away to skip (both optional) | GameTracker.tsx | M |

### Batch 2: Runner & Play Correction Prompts

| # | Discrepancy | Decision | Fix Description | Files | Effort |
|---|-------------|----------|----------------|-------|--------|
| D-5 | SF auto-detection is silent (§3.5) | A — add prompt | When FO tapped + R3 occupied + <2 outs, show inline prompt: "Sac fly — run scores?" YES=SF+run, NO=FO+hold. 1 extra tap | GameTracker.tsx | M |
| D-6 | GO→DP auto-correction contradicts C-017 (§3.5) | C — prompt | When GO tapped + runner out detected, show brief prompt "Double play?" YES=DP, NO=GO stands. Replace silent auto-correction | GameTracker.tsx, useGameState.ts | M |
| D-7 | IFR prompt in disabled block (§4.5) | A — wire it | When PO tapped from overflow + R1+R2 or loaded + <2 outs, show IFR? prompt as modifier. Extract from disabled block | GameTracker.tsx | S |

### Batch 3: Runner Popover Enhancements

| # | Discrepancy | Decision | Fix Description | Files | Effort |
|---|-------------|----------|----------------|-------|--------|
| D-2 | Pickoff always records OUT (§5.1) | A — add sub-options | After Pickoff tap, show: Safe (attempt logged), Out (current), Error → fielder (runner advances). Reuse destination picker pattern | RunnerPopover.tsx, GameTracker.tsx | S |
| D-11 | Advance has no destination dropdown (§5.1) | A — add dropdown | Advance button opens destination picker (same as WP/PB): choose 2B, 3B, Score. Reuse existing `destinationMode` pattern | RunnerPopover.tsx | S |

### Batch 4: Layout & Visual Polish

| # | Discrepancy | Decision | Fix Description | Files | Effort |
|---|-------------|----------|----------------|-------|--------|
| D-9 | Scoreboard duplicated / split across zones (§3.7) | Custom | Move MiniScoreboard into bottom of FenwayBoard zone (left panel, vertical). Remove from diamond zone. No duplication. Ensure fully readable | GameTracker.tsx, FenwayBoard.tsx, MiniScoreboard.tsx | M |
| D-13 | Overflow has D3K (redundant with WP_K/PB_K) | B — remove D3K | Remove D3K from QuickBar overflow. WP_K and PB_K cover dropped third strike. Keep GRD | QuickBar.tsx | S |
| D-14 | WG in modifier tray (spec says engine-derived) | A — remove | Remove WG button from modifier tray in GameTracker.tsx Zone 5. Keep contextual WEB GEM button in EnhancedInteractiveField | GameTracker.tsx | S |
| D-17 | Manager Moment notification vs subtle indicator (§5.3) | C — hybrid | Replace bottom notification with pulsing border on QuickBar + small lightning icon. Tapping the indicator opens Call/Skip panel. Non-blocking unless user engages | GameTracker.tsx | M |

---

## Deferred to V2

| # | Discrepancy | Reason |
|---|-------------|--------|
| D-12 | No double switch UI flow (§7.1) | Rare in SMB4. Users can do 2 separate subs to achieve same result. Handler exists for when UI is added. |

## Kept As-Is (JK chose B)

| # | Discrepancy | Reason |
|---|-------------|--------|
| D-8 | Undo button bottom-center vs spec top-left (§3.3) | Bottom-center is in thumb zone, near action. Better UX than top-left. |
| D-10 | Pitch type not filtered by pitcher repertoire (§4.3) | Showing all types is simpler. User knows their pitcher. No League Builder wiring needed. |
| D-15/16 | No gear/runner buttons in modifier zone (§3.7) | Diamond tapping for runners is better UX. LINEUP covers roster. Gear not needed mid-game. |

---

## Spec Updates Required

After fixes are applied, update MODE_2_V1_FINAL.md:
1. §3.1: Replace Balk with GRD in overflow list. Remove D3K (covered by WP_K/PB_K).
2. §3.3: Change undo position from "top-left" to "bottom action bar" per D-8 decision.
3. §3.5: Add GO→DP prompt (C-017 updated: prompt, not manual-only or auto-correction).
4. §3.7: Update layout to reflect scoreboard consolidation per D-9.
5. §4.3: Note WG removed from modifier tray. All 9 pitch types shown (no repertoire filter).
6. §5.3: Update Manager Moment to hybrid approach (subtle indicator + tap-to-engage).

---

## Implementation Notes

### Cross-Cutting Concerns
- **D-5 and D-6 both modify autoCorrectResult()**: D-6 removes GO→DP auto-correction; D-5 removes FO→SF auto-correction. Both replaced by prompts in GameTracker.tsx. The `autoCorrectResult()` function in useGameState.ts should be simplified or deprecated.
- **D-1 requires threading gameSituation through QuickBar**: New prop interface. QuickBar currently receives only `onOutcome` and `disabled`.
- **D-3, D-4 need inline overlay/modal patterns**: Can reuse existing PitchCountModal or EnhancedInteractiveField modal patterns as templates.
- **D-2 and D-11 share the RunnerPopover destination picker**: Both extend the existing `destinationMode` pattern already used for WP/PB.
- **D-9 is a layout change**: Test on iPad landscape to ensure FenwayBoard doesn't overflow vertically.

### Dependency Order
1. Batch 1 first (blocking UX issues)
2. Batch 2 next (both touch autoCorrectResult — do together)
3. Batch 3 (self-contained RunnerPopover changes)
4. Batch 4 (visual/layout — test last)

### Build Verification
`npm run build` after each batch. All 5,653 tests must pass between batches.
