# PROMPT CONTRACT: Step 2.A — Quick Bar Updates
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t2a-quickbar
# Prerequisite: Tier 1 complete (Steps 1.A-1.C merged to main)

---

You are a senior React/TypeScript engineer performing targeted Quick Bar changes for the KBL Tracker GameTracker. Tier 1 (layout rewrite) is complete. The 4-column layout, ScoreBug, lineup columns, and phase state machine are all in place.

## GOAL

Four changes to the Quick Bar: (1) move Undo + End Game buttons into the Quick Bar row with a visual divider, (2) replace CSS :active with processing-aware button feedback, (3) add Ꝁ (backwards K / called strikeout) as a separate primary button next to K, (4) add ITPHR (inside-the-park home run) to the overflow menu.

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §4.1 Button Layout, §4.3 Visual Feedback on Tap, §4.4 Utility Buttons
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-010, UX-011, UX-048, UX-049
- `spec-docs/GAMETRACKER_UX_IMPLEMENTATION_PLAN.md` — Group 2.A

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §4.1, §4.3, §4.4, §11.3 (backwards K)
2. Read `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` entries for UX-010, UX-011, UX-048, UX-049
3. Read `src/src_figma/app/components/QuickBar.tsx` in full (it's only ~210 lines)
4. Read `src/types/game.ts` to find the `AtBatResult` type union (approximately line 13). This is where Ꝁ and ITPHR need to be added.
5. Search GameTracker.tsx for where Undo and End Game are currently rendered. They are NOT in QuickBar.tsx — they are in a separate zone in GameTracker.tsx. Search for `UndoButtonComponent`, `END GAME`, `endGame`, `undoSystem`. Identify the exact JSX that renders them.
6. Search for how Kc is currently handled: `grep -n "Kc\|onKToggle\|kToggle" src/src_figma/` across the codebase. Understand the current K/Kc toggle flow so you know what to replace.
7. Search for existing ITPHR support: `grep -rn "ITPHR\|INSIDE_PARK\|inside.park" src/src_figma/` and `src/utils/` and `src/types/`. Note what already exists (detection logic, runner defaults) vs what's missing (QuickBar button, AtBatResult type value).
8. Create branch: `git checkout -b feature/gt-ux-t2a-quickbar`
9. Run `npm run build` to confirm clean baseline

## CONSTRAINTS

### Files you WILL modify:
```
src/src_figma/app/components/QuickBar.tsx     — Add Ꝁ button, add ITPHR to overflow, add Undo+EndGame to bar, processing feedback
src/types/game.ts                              — Add 'Ꝁ' and 'ITPHR' to AtBatResult type union
src/src_figma/app/pages/GameTracker.tsx        — Move Undo/EndGame rendering from separate zone into QuickBar props
src/src_figma/app/components/runnerDefaults.ts — Wire ITPHR runner advancement (batter scores, all runners advance)
```

### Files you MAY need to modify:
```
src/utils/eventLog.ts                          — ONLY if AtBatResult type is also defined/validated here. Check first.
src/src_figma/app/components/PlayLogPanel.tsx   — Remove onKToggle if K/Kc toggle is being eliminated
src/src_figma/app/components/UndoSystem.tsx     — May need to export the button component differently if it's being relocated into QuickBar
```

### Files you MUST NOT modify:
```
src/src_figma/hooks/useGameState.ts            — No state changes in this step
src/src_figma/app/components/EnrichmentPanel.tsx
src/src_figma/app/components/ScoreBug.tsx
src/src_figma/app/components/BattingLineupColumn.tsx
src/src_figma/app/components/DefensiveLineupColumn.tsx
src/src_figma/app/components/NewsBoard.tsx
Any file under src/components/                  — DEAD CODE
```

## EXACT CHANGES — 4 items

### Item 2.1 (UX-010): Move Undo + End Game into Quick Bar row

Currently, Undo and End Game are rendered in a separate zone in GameTracker.tsx (NOT inside QuickBar.tsx). The spec says they should be IN the Quick Bar row, at the far right, separated from outcome buttons by a visual divider.

1. Find where Undo (`UndoButtonComponent` or similar) and End Game button are rendered in GameTracker.tsx. They are in the bottom-right modifier/action area.
2. Move their rendering INTO the QuickBar component. Add new props to QuickBar:
   - `undoCount: number` — how many undo steps available
   - `onUndo: () => void` — callback when undo is tapped
   - `canUndo: boolean` — whether undo is available
3. In QuickBar's LIVE phase render, after the overflow trigger button, add:
   - A visual divider (e.g., a thin vertical line with margin: `<div className="w-[2px] bg-[#555] mx-1 self-stretch" />`)
   - An Undo button: shows "↩ N" where N = undoCount. Disabled when canUndo is false. Styled smaller than outcome buttons.
   - The End Game button: same as currently exists, but smaller and in the bar. Styled to match the retro theme but visually distinct (maybe darker/muted to avoid accidental taps).
4. Remove the old Undo/End Game rendering from the separate zone in GameTracker.tsx.
5. The QuickBar LIVE phase row should now read:
   `[K] [Ꝁ] [GO] [FO] [LO] [1B] [BB] [2B] [HR] [···]  |  [↩ N] [END]`

### Item 2.2 (UX-011): Processing-aware button feedback

Currently QuickBar.tsx uses `active:scale-95 active:shadow-none transition-transform` (CSS :active pseudo-class). This only applies while the finger is physically pressing — it releases when the finger lifts, regardless of whether the event has been processed.

The spec says the button should stay depressed/highlighted UNTIL the event is fully processed.

1. Add a new prop to QuickBar: `processingOutcome?: string | null` — when not null, this is the outcome currently being processed. The button matching this outcome stays visually depressed.
2. In GameTracker.tsx, when `onOutcome` fires:
   - Set `processingOutcome` to the tapped outcome string
   - After the event commit completes (the callback chain in handleQuickBarOutcome finishes), set `processingOutcome` back to null
3. In QuickBar's `renderButton`, when `btn === processingOutcome`:
   - Apply `scale-95 shadow-none` classes (same visual as :active but persistent)
   - Optionally add a subtle pulsing or highlighted border to indicate processing
4. Keep the CSS :active for the instant tap feel, but ADD the processing-aware state on top.

### Item 2.3 (UX-048): K and Ꝁ as separate primary buttons

Currently PRIMARY_BUTTONS = ['K', 'GO', 'FO', 'LO', '1B', 'BB', '2B', 'HR']. K is one button, and Kc is a post-hoc toggle in the play log (PlayLogPanel has an `onKToggle` prop).

The spec says K (swinging strikeout) and Ꝁ (called strikeout / looking) should be separate primary buttons. No more post-hoc toggle.

1. In `src/types/game.ts`: Add `'Ꝁ'` to the `AtBatResult` union type. Keep `'Kc'` as well for backward compatibility with existing saved events — but new events will use `'Ꝁ'` going forward.
   **IMPORTANT:** Check if `'Kc'` is used in stat calculations, event processing, or display logic elsewhere. If it is, add a comment: `// 'Kc' retained for backward compat with pre-UX-redesign events. New events use 'Ꝁ'.`
2. In QuickBar.tsx: Change PRIMARY_BUTTONS to `['K', 'Ꝁ', 'GO', 'FO', 'LO', '1B', 'BB', '2B', 'HR']` — Ꝁ is the second button, right after K.
3. Add color mapping for 'Ꝁ' in BUTTON_COLORS — same colors as K (red family, it's still a strikeout).
4. The Ꝁ character should display as a visually backwards K. Options:
   - Use the actual Unicode character Ꝁ (U+A740 — "Latin Capital Letter K With Stroke"). This may not render well in all fonts.
   - OR use CSS transform: render "K" with `style={{ transform: 'scaleX(-1)' }}` to mirror it horizontally. This is the safer approach and guaranteed to look right in Press Start 2P.
   - Choose whichever renders correctly in the browser. Test both if unsure.
5. In PlayLogPanel.tsx: Remove the `onKToggle` prop and any K/Kc toggle UI. Called strikeouts are now recorded at input time, not toggled after. If PlayLogPanel has a toggle button or icon for K↔Kc, remove it.
6. In the play log display: when rendering an event with result `'Ꝁ'`, display it as the backwards K character (same CSS transform approach).

### Item 2.4 (UX-049): ITPHR in overflow menu

1. In `src/types/game.ts`: Add `'ITPHR'` to the `AtBatResult` union type.
2. In QuickBar.tsx: Add `'ITPHR'` to OVERFLOW_BUTTONS. Position it at the end or after HR-adjacent entries.
3. Add color mapping for 'ITPHR' in BUTTON_COLORS — same as HR (purple family, it's still a home run).
4. In `src/src_figma/app/components/runnerDefaults.ts`: Search for how HR runner advancement is handled. ITPHR should behave identically to HR for runner advancement (all runners score, batter scores). Search for the HR case and add ITPHR alongside it.
5. If `isContextDisabled` needs to handle ITPHR: it should NOT be contextually disabled (same as HR — always available when runners are on base or bases empty). Verify this is the default behavior (no case for ITPHR = not disabled = correct).
6. The gap analysis noted that ITPHR detection logic already exists in `runnerDefaults.ts:139-143` and `detectionFunctions.ts:599-617`. Verify that adding ITPHR to AtBatResult and the overflow menu correctly connects to the existing detection path.

## EXPECTED OUTPUT

After this step, the Quick Bar in LIVE phase should render as:

```
[K] [Ꝁ] [GO] [FO] [LO] [1B] [BB] [2B] [HR] [···]  |  [↩ 3] [END]
```

Where:
- K and Ꝁ are separate buttons (Ꝁ appears as mirrored K)
- [···] overflow includes ITPHR
- | is a visual divider
- [↩ 3] is the undo button showing 3 remaining undos
- [END] is the End Game button (smaller, muted styling)
- Tapping any outcome button → button stays depressed until processing completes → then releases

## VERIFICATION

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. Ꝁ exists in PRIMARY_BUTTONS
grep -n "Ꝁ\|backwards\|scaleX.*-1" src/src_figma/app/components/QuickBar.tsx | head -5
# Expected: Ꝁ in PRIMARY_BUTTONS array + rendering logic

# 4. ITPHR exists in OVERFLOW_BUTTONS
grep -n "ITPHR" src/src_figma/app/components/QuickBar.tsx
# Expected: in OVERFLOW_BUTTONS array + color mapping

# 5. ITPHR and Ꝁ exist in AtBatResult type
grep -n "ITPHR\|Ꝁ" src/types/game.ts
# Expected: both in the AtBatResult union

# 6. Undo/EndGame in QuickBar (not in separate zone)
grep -n "undo\|Undo\|END.*GAME\|endGame" src/src_figma/app/components/QuickBar.tsx | head -10
# Expected: undo button + end game button rendered inside QuickBar

# 7. Processing-aware feedback exists
grep -n "processingOutcome\|processing" src/src_figma/app/components/QuickBar.tsx | head -5
# Expected: processingOutcome prop + conditional class application

# 8. K/Kc toggle removed from PlayLogPanel
grep -n "onKToggle\|kToggle\|K.*Kc.*toggle" src/src_figma/app/components/PlayLogPanel.tsx
# Expected: 0 matches (toggle removed)

# 9. ITPHR wired in runner defaults
grep -n "ITPHR" src/src_figma/app/components/runnerDefaults.ts
# Expected: 1+ matches showing ITPHR handled like HR
```

## FORMAT

When complete, output:

```
STEP 2.A COMPLETE

Files changed:
1. src/src_figma/app/components/QuickBar.tsx — [describe: Ꝁ button, ITPHR overflow, Undo+EndGame in bar, processing feedback]
2. src/types/game.ts — [describe: Ꝁ and ITPHR added to AtBatResult]
3. src/src_figma/app/pages/GameTracker.tsx — [describe: Undo/EndGame moved to QuickBar props, processingOutcome state]
4. src/src_figma/app/components/runnerDefaults.ts — [describe: ITPHR runner advancement]
5. [any other files modified]

Kc backward compat audit:
[List every file that references 'Kc' and what you did about each]

ITPHR existing support found:
[List what ITPHR-related code already existed and how you connected to it]

Verification results:
[all 9 checks with outcomes]

Ready for JK browser verification.
```

## FAILURE PROTOCOL

- If the Ꝁ Unicode character doesn't render in Press Start 2P → use CSS transform `scaleX(-1)` on a regular "K" character. This is the recommended fallback.
- If adding 'Ꝁ' to AtBatResult causes TypeScript errors elsewhere (switch statements without a case for it) → add the case alongside 'Kc' in every switch. Search for all `case 'Kc'` and add `case 'Ꝁ':` alongside each one.
- If ITPHR runner advancement is complex → at minimum, make it identical to HR (all runners score, batter scores to home). The spray zone difference (ITPHR uses IF+OF zones, not HR zones) is handled in Tier 2 Group 2.D (enrichment), not here.
- If moving Undo into QuickBar breaks the undo state management → the UndoSystem hook and its state stay in GameTracker.tsx. Only the BUTTON rendering moves into QuickBar. The hook's callbacks are passed as props.
- If the processingOutcome prop is hard to wire because handleQuickBarOutcome is async → use a simple pattern: set processingOutcome before calling the handler, clear it in a .then() or .finally() callback. If the handler is not Promise-based, use setTimeout(0) as a last resort to clear after the synchronous processing completes.
- If anything is ambiguous → STOP and report. Do NOT guess.

## ANTI-PATTERNS

- Do NOT modify useGameState.ts — no state changes.
- Do NOT modify EnrichmentPanel.tsx — enrichment taxonomy is Tier 2 Group 2.D.
- Do NOT modify ScoreBug.tsx or the lineup column components.
- Do NOT touch src/components/ (dead code).
- Do NOT change baseball logic or stat calculations (except adding ITPHR to AtBatResult type and runner defaults).
- Do NOT remove 'Kc' from AtBatResult — keep it for backward compat with existing saved events.
- Do NOT add the manager moment "Stay the Course" button — that's Tier 2 Group 2.E.
- Do NOT implement audio — that's Tier 3.

Use high reasoning effort. Read before writing. Build after every file change.
