# PROMPT CONTRACT: Step 1.A — Phase State Machine + Layout Shell
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t1a-phase-layout

---

You are a senior React/TypeScript engineer performing a structural rewrite of the KBL Tracker GameTracker layout.

## GOAL

Add a three-phase game lifecycle state machine (PRE_GAME → LIVE → POST_FINAL_OUT) to the GameTracker, then replace the current 5-zone CSS grid layout with a 3-row pinned layout (ScoreBug top, 4-column content area middle, QuickBar bottom). Remove balls/strikes tracking from the scoreboard. This is the foundational architectural change that all subsequent work depends on.

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §2 Screen Layout, §4.6 Three-Phase Quick Bar Lifecycle, §10.1 Three-Phase Lifecycle
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-003, UX-005, UX-007, UX-009, UX-034, UX-038
- `spec-docs/GAMETRACKER_UX_IMPLEMENTATION_PLAN.md` — Step 1.A

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §2, §4.6, §10.1 in full
2. Read `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` entries for UX-003, UX-005, UX-007, UX-009, UX-034, UX-038
3. Create branch: `git checkout -b feature/gt-ux-t1a-phase-layout`

4. Run `npm run build` and `npm test` to confirm clean baseline
5. Grep for balls/strikes consumers: `grep -rn "balls\|strikes" src/src_figma/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v __tests__` — save this output. You need it for item 1.5.
6. Grep for the current grid layout: `grep -n "gridTemplateColumns\|grid-template\|FIVE-ZONE\|grid-area" src/src_figma/app/pages/GameTracker.tsx` — save this output. You need it for item 1.3.

## CONSTRAINTS

### Files you WILL modify:
```
src/src_figma/hooks/useGameState.ts          — Add gamePhase to GameState, add phase transitions
src/src_figma/app/pages/GameTracker.tsx       — Replace grid layout, add phase-aware rendering
src/src_figma/app/components/QuickBar.tsx     — Phase-aware button display
src/src_figma/app/components/FullFenwayScoreboard.tsx — Remove CountDots/balls/strikes
```

### Files you WILL create:
```
(none in this step — layout uses placeholder divs, not new components)
```

### Files you MUST NOT modify:
```
src/utils/eventLog.ts                        — persistence layer, DO NOT TOUCH
src/src_figma/app/components/EnrichmentPanel.tsx — enrichment, DO NOT TOUCH
src/src_figma/app/components/GameDiamond.tsx  — removed in Step 1.B, not this step
src/src_figma/app/components/FenwayBoard.tsx  — modified in Step 1.B, not this step
src/src_figma/app/components/LineupCard.tsx   — modified in Tier 2, not this step
Any file under src/components/               — DEAD CODE, never touch
```

## EXACT CHANGES — 6 items in this step

### Item 1.1 (UX-034): Add gamePhase to GameState

In `src/src_figma/hooks/useGameState.ts`:

1. Add a type: `export type GamePhase = 'PRE_GAME' | 'LIVE' | 'POST_FINAL_OUT';`
2. Add to the `GameState` interface (currently at ~line 66): `gamePhase: GamePhase;`
3. In the state initialization, set `gamePhase: 'PRE_GAME'` for new games.
4. **BACKWARD COMPAT:** When loading a game from IndexedDB (the `loadCurrentGame()` / `initializeOrLoadGame()` path), if the loaded state does not have a `gamePhase` field, default to `'LIVE'`. This ensures existing saved games still work. Search for where `loadCurrentGame` is called and where the loaded state is spread into the hook's state.
5. Add a `startGame` function that sets `gamePhase` to `'LIVE'`. This should be callable from the UI (exposed from the hook).
6. Find where `gameOver` detection happens (search for `gameOver` in useGameState.ts). When the game ends, set `gamePhase` to `'POST_FINAL_OUT'`.
7. Expose `gamePhase` and `startGame` in the hook's return value.

### Item 1.2 (UX-038): Phase-aware Quick Bar rendering

In `src/src_figma/app/components/QuickBar.tsx`:

1. Add a `gamePhase` prop: `gamePhase: 'PRE_GAME' | 'LIVE' | 'POST_FINAL_OUT'`
2. Add an `onStartGame` prop: `onStartGame: () => void`
3. When `gamePhase === 'PRE_GAME'`:
   - Hide all outcome buttons and overflow
   - Show a single centered "START GAME" button in the Scoreboard Chalk Retro style
   - On tap: show `window.confirm('Lock lineups and begin recording?')` — if confirmed, call `onStartGame()`
4. When `gamePhase === 'LIVE'`:
   - Show all outcome buttons + overflow (current behavior)
5. When `gamePhase === 'POST_FINAL_OUT'`:
   - Hide all outcome buttons and overflow
   - Show a single centered "END GAME" button
   - The END GAME button's existing behavior (navigate to PostGameSummary) stays as-is

In `src/src_figma/app/pages/GameTracker.tsx`:
- Pass `gamePhase` and `onStartGame` to QuickBar where it's rendered

### Item 1.3 (UX-003): Replace 5-zone grid with 3-row pinned layout

In `src/src_figma/app/pages/GameTracker.tsx`:

1. Find the current grid layout definition. The gap analysis says it's at approximately line 4606 (comment "§3.7 FIVE-ZONE CSS GRID LAYOUT") with `gridTemplateColumns` at line 4644-4648. Search for these landmarks.
2. Replace the entire 5-zone grid with a 3-row flex/grid layout:
   - **Row 1 (pinned top):** Score area. For now, keep the existing FullFenwayScoreboard here as a placeholder. It will be replaced with ScoreBug in Step 1.B.
   - **Row 2 (fills remaining space):** A 4-column content area. For now, render 4 placeholder `<div>` elements with labels: "NewsBoard", "Batting Lineup", "Defensive Lineup", "Play Log". The Play Log column should render the existing `<PlayLogPanel>` component. The other 3 columns are empty placeholders with visible borders/labels so JK can verify the layout.
   - **Row 3 (pinned bottom):** QuickBar. Full width.
3. The outer container must be: `height: 100vh; display: flex; flex-direction: column; overflow: hidden;`
4. Row 1 and Row 3 are `flex-shrink: 0` (pinned, don't compress).
5. Row 2 is `flex: 1; overflow: hidden;` (fills remaining space, doesn't scroll the page).
6. Remove the old grid zone assignments (gridArea, gridColumn, gridRow references in the JSX).

**CRITICAL:** The existing PlayLogPanel, QuickBar, and FullFenwayScoreboard must still render and function. You are moving them into a new layout container, not removing them. Only the CSS grid structure changes. The components stay.

### Item 1.4 (UX-005): Column proportions

In the 4-column content area from item 1.3:

1. Set `display: grid; gridTemplateColumns: '1fr 1fr 1fr 2fr'; gap: 4px;` (or equivalent)
2. This gives approximately 1/5, 1/5, 1/5, 2/5 proportions.
3. Each column should have `overflow-y: auto;` so only the column contents scroll, not the page.

### Item 1.5 (UX-007): Remove balls/strikes from scoreboard

1. **FIRST:** Run the grep from the pre-check step. Identify EVERY consumer of `balls` and `strikes` in `src/src_figma/`.
2. In `src/src_figma/app/components/FullFenwayScoreboard.tsx`:
   - Remove the `balls` and `strikes` props from the component's prop interface
   - Remove the `CountDots` renders for balls and strikes (approximately lines 239-249)
   - If `CountDots` component is defined in this file and has no other uses, remove it
3. In `src/src_figma/app/pages/GameTracker.tsx`:
   - Remove `balls` and `strikes` from the props passed to FullFenwayScoreboard
4. In `src/src_figma/hooks/useGameState.ts`:
   - **DO NOT remove `balls` and `strikes` from GameState** unless the grep confirms ZERO consumers outside FullFenwayScoreboard. If ANY other component, hook, or engine reads these fields, leave them in GameState but stop displaying them.
   - If the grep shows they are ONLY consumed by FullFenwayScoreboard, then remove them from GameState and remove any state update logic for them.
5. **Document what you found:** List every file that consumed balls/strikes and what you did about each one.

### Item 1.6 (UX-009): Pinned layout behavior

This is mostly handled by Item 1.3's flex layout. Verify:
1. The viewport does NOT scroll when content is added. The outer container is `height: 100vh; overflow: hidden;`.
2. Only the PlayLog column (column 4) scrolls internally via `overflow-y: auto`.
3. The other 3 placeholder columns also have `overflow-y: auto` for when content is added in Steps 1.B and 1.C.
4. QuickBar spans the full viewport width (not just one grid column).

## EXPECTED OUTPUT

After this step, the GameTracker should render as:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Existing FullFenwayScoreboard — placeholder, replaced in 1.B]      │
├──────────┬──────────┬──────────┬────────────────────────────────────┤
│NewsBoard │ Batting  │ Defense  │ [Existing PlayLogPanel renders    │
│(placeholder)│Lineup │ Lineup  │  here — functional, scrollable]   │
│          │(placeholder)│(placeholder)│                              │
├──────────┴──────────┴──────────┴────────────────────────────────────┤
│ [QuickBar — full width, phase-aware]                                │
│ PRE_GAME: "START GAME" centered                                     │
│ LIVE: [K][GO][FO][LO][1B][BB][2B][HR][···] | [↩][End]             │
│ POST_FINAL_OUT: "END GAME" centered                                 │
└─────────────────────────────────────────────────────────────────────┘
```

The three placeholder columns show their labels visibly. The PlayLog column renders the existing PlayLogPanel. The QuickBar is functional and phase-aware. No page scroll occurs.

## VERIFICATION

After completing all 6 items, run these checks IN ORDER:

```bash
# 1. Build passes
npm run build

# 2. Tests pass (some may need updates if they reference removed grid zones)
npm test

# 3. Verify no balls/strikes remain in scoreboard
grep -rn "CountDots\|balls.*strikes" src/src_figma/app/components/FullFenwayScoreboard.tsx
# Expected: 0 matches

# 4. Verify gamePhase exists in hook return
grep -n "gamePhase" src/src_figma/hooks/useGameState.ts | head -10
# Expected: type definition, state initialization, startGame function, return value

# 5. Verify backward compat for saved games
grep -n "loadCurrentGame\|LIVE.*default\|gamePhase.*LIVE" src/src_figma/hooks/useGameState.ts | head -10
# Expected: fallback to LIVE when gamePhase missing from loaded state

# 6. Verify old 5-zone grid is gone
grep -n "FIVE-ZONE\|minmax(248px" src/src_figma/app/pages/GameTracker.tsx
# Expected: 0 matches

# 7. Verify new 4-column grid exists
grep -n "1fr 1fr 1fr 2fr\|gridTemplateColumns.*1fr.*2fr" src/src_figma/app/pages/GameTracker.tsx
# Expected: 1+ matches showing the new column proportions

# 8. Verify QuickBar takes gamePhase prop
grep -n "gamePhase" src/src_figma/app/components/QuickBar.tsx
# Expected: prop definition + phase-conditional rendering
```

## FORMAT

When complete, output:

```
STEP 1.A COMPLETE

Files changed:
1. src/src_figma/hooks/useGameState.ts — [describe changes, cite line ranges]
2. src/src_figma/app/pages/GameTracker.tsx — [describe changes, cite line ranges]
3. src/src_figma/app/components/QuickBar.tsx — [describe changes, cite line ranges]
4. src/src_figma/app/components/FullFenwayScoreboard.tsx — [describe changes, cite line ranges]

Verification results:
- npm run build: [PASS/FAIL]
- npm test: [PASS/FAIL — note any test updates needed]
- Balls/strikes removed from scoreboard: [verified]
- gamePhase in hook return: [verified]
- Backward compat: [verified]
- Old grid gone: [verified]
- New 4-column grid: [verified]
- QuickBar phase-aware: [verified]

Balls/strikes consumer audit:
[List every file that consumed balls/strikes and what was done]

Ready for JK browser verification.
```

## FAILURE PROTOCOL

- If `npm run build` fails after any item → fix the build error before moving to the next item. Do NOT accumulate broken state.
- If you cannot find the grid layout at the expected line numbers → search for `gridTemplateColumns` and `FIVE-ZONE` to locate it. Line numbers from the gap analysis may have shifted.
- If removing balls/strikes breaks other consumers → leave `balls` and `strikes` in GameState but remove them from the scoreboard display only. Document which consumers still need them.
- If you cannot determine where `gameOver` detection happens in useGameState.ts → search for `gameOver`, `endGame`, `isComplete`, `walkOff`. At least one of these will lead you to the game-end detection logic.
- If existing tests fail because they reference the old grid layout or CountDots → update the tests to match the new layout. Document which tests you changed.
- If anything is ambiguous → STOP and report the ambiguity. Do NOT guess.

## ANTI-PATTERNS

- Do NOT remove GameDiamond in this step. That's Step 1.B.
- Do NOT build ScoreBug.tsx in this step. The existing FullFenwayScoreboard stays as a placeholder in Row 1. ScoreBug is Step 1.B.
- Do NOT build lineup column components in this step. Use placeholder divs. Lineup columns are Step 1.C.
- Do NOT build the NewsBoard component in this step. Use a placeholder div. NewsBoard is Step 1.C.
- Do NOT modify eventLog.ts, EnrichmentPanel.tsx, or any persistence/enrichment code.
- Do NOT touch any file under src/components/ — that's the dead code tree.
- Do NOT change any baseball logic, runner defaults, or stat calculations.
- Do NOT rename any types (exitType, etc.) — that's Tier 2.
- Do NOT use `window.confirm` in production if a better pattern exists (styled modal). But `window.confirm` is acceptable for V1 if it works in iPad Safari. Check: Safari on iPad suppresses `window.confirm` in some contexts. If this is a known issue, use a simple inline confirmation prompt instead.

Use high reasoning effort. Read before writing. Build after every file change.
