# PROMPT CONTRACT: Step 2.E — Score Bug Features + Half-Inning Refinement
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t2e-scorebug-features
# Prerequisite: Step 2.D merged to main

---

You are a senior React/TypeScript engineer completing the final Tier 2 group for the GameTracker UX redesign. This step relocates the manager moment indicator to the score bug, adds the Stay the Course passive decision button, ensures the NewsBoard is display-only, and refines the half-inning column swap.

## GOAL

Three changes:
1. **(UX-033)** Verify NewsBoard has no clickable elements. If FenwayBoard-equivalent data routes to NewsBoard, ensure no click handlers leaked through.
2. **(UX-036)** Move manager moment indicator from QuickBar (⚡ lightning bolt) to ScoreBug far right as Ⓜ icon. Build "Stay the Course" button for passive decisions. Both log to play log.
3. **(UX-037)** Verify and refine half-inning transition: pitch count prompt → role-based column swap → no summary screen.

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §3.5 Manager Moment Indicator, §5.3 Manager Moments, §6.4 NewsBoard Display-Only, §10.2 Half-Inning Transition
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-033, UX-036, UX-037
- `spec-docs/GAMETRACKER_UX_IMPLEMENTATION_PLAN.md` — Group 2.E

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §3.5, §5.3, §6.4, §10.2
2. Read `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` entries for UX-033, UX-036, UX-037
3. Read ScoreBug.tsx — note the existing `isManagerMoment` prop and Ⓜ placeholder
4. Read QuickBar.tsx — search for `managerMoment`, `⚡`, `lightning`, `MM`. Note the existing indicator code.
5. Read GameTracker.tsx — search for `managerMoment`, `leverage`, `stayTheCourse`. Understand how manager moments are currently detected and displayed.
6. Read NewsBoard.tsx — verify it has zero onClick handlers (should be clean from Step 1.C)
7. Create branch: `git checkout -b feature/gt-ux-t2e-scorebug-features`
8. Run `npm run build` to confirm clean baseline

## CONSTRAINTS

### Files you WILL modify:
```
src/src_figma/app/components/ScoreBug.tsx      — Wire manager moment Ⓜ indicator + Stay the Course button
src/src_figma/app/components/QuickBar.tsx       — Remove manager moment ⚡ indicator (relocated to ScoreBug)
src/src_figma/app/pages/GameTracker.tsx          — Wire Stay the Course callback, verify column swap, verify NewsBoard
```

### Files you MAY need to modify:
```
src/src_figma/app/components/NewsBoard.tsx       — Only if click handlers found (should be clean)
```

### Files you MUST NOT modify:
```
src/src_figma/hooks/useGameState.ts
src/utils/eventLog.ts
src/src_figma/app/components/EnrichmentPanel.tsx
src/src_figma/app/components/BattingLineupColumn.tsx
src/src_figma/app/components/DefensiveLineupColumn.tsx
Any file under src/components/
```

## EXACT CHANGES — 3 items

### Item 2.18 (UX-033): NewsBoard display-only verification

1. Grep NewsBoard.tsx for `onClick`, `onTap`, `onPress`, `href`, `<a `, `<button`. Expect 0 matches.
2. If any click handlers exist, remove them. The NewsBoard is a read-only information panel.
3. If the NewsBoard receives `onBatterTap` or `onPitcherTap` props from GameTracker.tsx, remove those props from both the component and the call site.
4. Verify the old FenwayBoard.tsx had clickable batter/pitcher names (it did per the gap analysis). Confirm that NewsBoard did NOT inherit those click handlers.
5. If already clean: document as "VERIFIED — no action needed."

### Item 2.19 (UX-036): Manager moment relocation + Stay the Course

**Part A — Remove from QuickBar:**
1. In QuickBar.tsx, find and remove the manager moment indicator. Per the gap analysis, it's a ⚡ lightning bolt button with animate-bounce (QuickBar.tsx ~line 119-131 area in the original, may have shifted after 2.A edits).
2. Remove the `managerMomentActive` and `onManagerMomentTap` props from QuickBar's props interface.
3. Remove any pulsing border animation on the QuickBar container that was tied to manager moments.

**Part B — Add to ScoreBug:**
1. ScoreBug.tsx already has `isManagerMoment?: boolean` prop and renders a static Ⓜ icon.
2. Enhance: when `isManagerMoment` is true, the Ⓜ icon should:
   - Be visually highlighted (brighter color, subtle pulsing glow, or outlined)
   - Indicate that a high-leverage decision point is active
3. Add a new prop: `onStayTheCourse?: () => void`
4. When `isManagerMoment` is true AND `onStayTheCourse` is provided, render a small "STAY" button next to the Ⓜ icon. This is the passive decision path — the manager chose not to act (no sub, no steal, etc.).
5. Tapping "STAY" calls `onStayTheCourse()`.
6. The Ⓜ indicator and STAY button should be at the far right of the score bug (where the indicator placeholders already are).

**Part C — Wire in GameTracker.tsx:**
1. Find where `managerMomentActive` state is managed (search for `managerMoment` in GameTracker.tsx).
2. Pass `isManagerMoment={managerMomentActive}` to ScoreBug (may already be done from Step 1.B).
3. Remove `managerMomentActive` and `onManagerMomentTap` props from the QuickBar render call.
4. Implement `handleStayTheCourse` callback:
   - Log a manager moment BetweenPlayEvent of type 'manager_moment' with decision = 'stay_the_course'
   - Clear the `managerMomentActive` state
   - Add a play log entry for the passive decision
5. Pass `onStayTheCourse={handleStayTheCourse}` to ScoreBug.

### Item 2.20 (UX-037): Half-inning column swap verification

This was initially wired in Step 1.C. Verify it works correctly:

1. Confirm that when `isTop` changes (half-inning transition):
   - Column 2 switches to show the NEW batting team's lineup
   - Column 3 switches to show the NEW fielding team's lineup
   - The switch is reactive (not requiring a page reload)
2. Confirm that pitch count prompt fires before the column swap (this was partially verified in 1.C verification).
3. Confirm there is NO between-inning summary screen (correct absence per spec §10.2).
4. If the column swap is not working correctly, fix the data derivation in GameTracker.tsx (the `battingTeam`/`fieldingTeam` conditional based on `isTop`).
5. If already working: document as "VERIFIED — no action needed."

## VERIFICATION

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. NewsBoard has zero click handlers
grep -n "onClick\|onTap\|onPress\|href\|<a \|<button" src/src_figma/app/components/NewsBoard.tsx
# Expected: 0 matches (display-only)

# 4. Manager moment removed from QuickBar
grep -n "managerMoment\|⚡\|lightning\|MM\|animate-bounce" src/src_figma/app/components/QuickBar.tsx
# Expected: 0 matches

# 5. Manager moment Ⓜ enhanced in ScoreBug
grep -n "isManagerMoment\|Ⓜ\|STAY\|stayTheCourse\|onStayTheCourse" src/src_figma/app/components/ScoreBug.tsx | head -10
# Expected: prop + enhanced rendering + STAY button

# 6. Stay the Course wired in GameTracker
grep -n "stayTheCourse\|Stay.*Course\|stay.*course\|manager_moment.*stay" src/src_figma/app/pages/GameTracker.tsx | head -5
# Expected: handler + prop passing to ScoreBug

# 7. Column swap still works (verify data derivation exists)
grep -n "isTop.*away\|isTop.*home\|battingTeam\|fieldingTeam" src/src_figma/app/pages/GameTracker.tsx | head -5
# Expected: conditional team assignment based on isTop
```

## FORMAT

When complete, output:

```
STEP 2.E COMPLETE — TIER 2 COMPLETE

Files changed:
1. src/src_figma/app/components/ScoreBug.tsx — [describe: Ⓜ enhancement, STAY button]
2. src/src_figma/app/components/QuickBar.tsx — [describe: manager moment indicator removed]
3. src/src_figma/app/pages/GameTracker.tsx — [describe: Stay the Course handler, prop wiring]
4. src/src_figma/app/components/NewsBoard.tsx — [describe: verified clean OR changes made]

UX-033 (NewsBoard display-only): [VERIFIED / FIXED — describe]
UX-036 (Manager moment relocation): [describe Ⓜ enhancement + STAY button + event logging]
UX-037 (Half-inning swap): [VERIFIED / FIXED — describe]

Verification results:
[all 7 checks with outcomes]

Ready for JK browser verification — TIER 2 GATE.
```

## FAILURE PROTOCOL

- If manager moment detection logic doesn't exist in GameTracker.tsx → the Ⓜ indicator can be present but always hidden. The Stay the Course button renders when `isManagerMoment` is true. If the leverageIndex calculation that triggers manager moments isn't wired, document this: "Manager moment detection requires leverageIndex > 2.0 threshold — not yet wired. Ⓜ indicator infrastructure is ready." Do NOT fabricate leverage detection.
- If logging a manager_moment BetweenPlayEvent requires useGameState.ts changes → use the existing `logBetweenPlayEvent` function if available. If not available from GameTracker's context, call the imported `logBetweenPlayEvent` from eventLog.ts directly. Document the approach.
- If the half-inning column swap has edge cases (e.g., extra innings, game start) → verify the basic case (top→bottom, bottom→top) works. Edge cases can be noted as future refinement.
- If anything is ambiguous → STOP and report. Do NOT guess.

## ANTI-PATTERNS

- Do NOT modify useGameState.ts unless absolutely required for BetweenPlayEvent logging.
- Do NOT modify eventLog.ts.
- Do NOT modify EnrichmentPanel.tsx or the enrichment taxonomy.
- Do NOT add audio or animations beyond the Ⓜ visual enhancement.
- Do NOT touch src/components/ (dead code).

Use high reasoning effort. Read before writing. Build after every file change.
