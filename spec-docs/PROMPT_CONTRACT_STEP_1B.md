# PROMPT CONTRACT: Step 1.B — Score Bug + Diamond Removal
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t1b-scorebug-diamond
# Prerequisite: Step 1.A merged to main

---

You are a senior React/TypeScript engineer continuing a structural rewrite of the KBL Tracker GameTracker layout. Step 1.A (phase state machine + 3-row layout shell) is complete and merged. This step replaces the scoreboard and removes the diamond.

## GOAL

Build a single-line ScoreBug component to replace the multi-row FullFenwayScoreboard. Build an ExpandedScoreboard overlay that drops down from the ScoreBug on tap. Remove the GameDiamond from the layout entirely.

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §2.4 Expanded Scoreboard, §3 Score Bug (all subsections)
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-004, UX-006, UX-008
- `spec-docs/GAMETRACKER_UX_IMPLEMENTATION_PLAN.md` — Step 1.B

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §2.4, §3.1 through §3.7 in full
2. Read `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` entries for UX-004, UX-006, UX-008
3. Read the current FullFenwayScoreboard.tsx in full — understand what it renders so you can refactor its content into the overlay
4. Read GameTracker.tsx to find: (a) where FullFenwayScoreboard is rendered, (b) where GameDiamond is imported and rendered, (c) what props are passed to each
5. Create branch: `git checkout -b feature/gt-ux-t1b-scorebug-diamond`
6. Run `npm run build` and `npm test` to confirm clean baseline on main after Step 1.A merge

## CONSTRAINTS

### Files you WILL create:
```
src/src_figma/app/components/ScoreBug.tsx    — New single-line score bug component
```

### Files you WILL modify:
```
src/src_figma/app/pages/GameTracker.tsx       — Replace FullFenwayScoreboard with ScoreBug + overlay, remove GameDiamond render
src/src_figma/app/components/FullFenwayScoreboard.tsx — Refactored into the expanded overlay (may rename or wrap)
```

### Files you MUST NOT modify:
```
src/src_figma/hooks/useGameState.ts           — No state changes in this step
src/utils/eventLog.ts                         — Persistence layer, DO NOT TOUCH
src/src_figma/app/components/EnrichmentPanel.tsx
src/src_figma/app/components/QuickBar.tsx     — Modified in Step 1.A, leave alone
src/src_figma/app/components/LineupCard.tsx
src/src_figma/app/components/GameDiamond.tsx  — Do NOT delete the file. Just remove the import and render from GameTracker.tsx. The file stays for potential future reference.
Any file under src/components/                — DEAD CODE, never touch
```

## EXACT CHANGES — 3 items in this step

### Item 1.7 (UX-006): Build ScoreBug.tsx

Create `src/src_figma/app/components/ScoreBug.tsx`:

1. A single horizontal line component, approximately 30-40px tall.
2. Layout (left to right, all on one line):
   - Away team abbreviation + score (e.g., "NYY 3")
   - Visual separator (pipe, dot, or spacing)
   - Inning indicator with half marker (e.g., "T7" or "B3")
   - Visual separator
   - Home team abbreviation + score (e.g., "BOS 2")
   - Base-state indicator: compact diamond graphic (4 small diamonds in diamond arrangement — filled = occupied, empty = unoccupied). Style like a TV broadcast score bug.
   - Outs indicator: 3 small circles (filled = recorded out, empty = remaining). To the right of the base-state diamond.
   - Far right (pushed as far right as possible with flex spacer):
     - Save indicator: small static "✓" text (always present, changes to "⚠" on write failure — for now just show "✓" statically)
     - Manager moment placeholder: "Ⓜ" text (hidden by default, shown when `isManagerMoment` prop is true)
     - Audio toggle placeholders: 🔊 icon (non-functional for now — just renders the icon)
3. Props needed from GameTracker:
   - `awayTeamName: string` (abbreviation)
   - `awayScore: number`
   - `homeTeamName: string` (abbreviation)
   - `homeScore: number`
   - `inning: number`
   - `isTop: boolean`
   - `outs: number`
   - `bases: { first: boolean; second: boolean; third: boolean }`
   - `isManagerMoment?: boolean`
   - `isSaving?: boolean`
   - `onTap: () => void` — triggers the expanded scoreboard overlay
4. Scoreboard Chalk Retro styling: muted olive/sage green background, white/cream text, Press Start 2P font (already globally applied), flat with no shadows.
5. The entire ScoreBug row is tappable — `onClick={onTap}` on the outer container.

### Item 1.8 (UX-008): Build ExpandedScoreboard overlay

In `src/src_figma/app/pages/GameTracker.tsx`:

1. Add state: `const [isScoreboardExpanded, setIsScoreboardExpanded] = useState(false);`
2. ScoreBug's `onTap` toggles `isScoreboardExpanded`.
3. When `isScoreboardExpanded` is true, render an overlay panel BELOW the ScoreBug:
   - The overlay covers the top portion of the 4-column content area (~25% of viewport height)
   - The overlay is positioned `absolute` or `fixed` relative to the ScoreBug, dropping downward
   - The overlay contains the retro Fenway scoreboard content. You can refactor the existing FullFenwayScoreboard component's content (stadium name, inning-by-inning linescore, R/H/E) into this overlay panel. The overlay IS the expanded scoreboard — it shows the detailed Fenway board.
   - The overlay has the same Scoreboard Chalk Retro styling (green background, cream text, retro font)
   - Tapping ANYWHERE outside the overlay (on the columns, Quick Bar, etc.) collapses it: use a click-away handler or a transparent backdrop behind the overlay.
   - Tapping the ScoreBug again also collapses it (toggle behavior).
4. When `isScoreboardExpanded` is false, only the ScoreBug single-line is visible.
5. **CRITICAL:** The Quick Bar at the bottom must remain visible and functional when the overlay is open. The overlay covers columns, NOT the Quick Bar.
6. **CRITICAL:** The 4-column content area does NOT move or resize when the overlay opens. The overlay sits ON TOP of the columns (z-index above columns, below any modals).
7. Extra innings: the inning-by-inning linescore in the overlay should handle >9 innings. If the game has >9 innings, the linescore should scroll horizontally or condense. This can be a simple `overflow-x: auto` on the linescore container.

### Item 1.9 (UX-004): Remove GameDiamond from the layout

In `src/src_figma/app/pages/GameTracker.tsx`:

1. Find the GameDiamond import (search for `import.*GameDiamond`). Comment it out or remove it.
2. Find where GameDiamond is rendered in the JSX (search for `<GameDiamond`). Remove the entire JSX element and any surrounding wrapper div that was specific to the diamond zone.
3. If removing the GameDiamond render leaves an empty column or zone in the layout, that's expected — the lineup columns (Step 1.C) will fill that space.
4. Search for any state or refs that exist ONLY to serve GameDiamond (e.g., `diamondMode`, `enhancementMode` on the diamond, `onFieldTap`, `onRunnerTap` that were specific to the diamond). If these are NOT used by any other component, comment them out with a note: `// Removed: GameDiamond-specific. Review in Step 1.C for lineup column equivalents.`
5. **DO NOT delete GameDiamond.tsx** — just remove it from GameTracker's import and render. The file stays in the codebase for reference.
6. **DO NOT remove any runner/base state logic from useGameState.ts.** The base state data still exists and is used by the ScoreBug's base-state indicator and the upcoming lineup column runner exponents.

## EXPECTED OUTPUT

After this step, the GameTracker should render as:

```
┌─────────────────────────────────────────────────────────────────────┐
│ NYY 3  |  T7  |  BOS 2  |  ◆◇◇  ●●○           ✓  Ⓜ  🔊       │  ← ScoreBug (single line, tappable)
├──────────┬──────────┬──────────┬────────────────────────────────────┤
│NewsBoard │ Batting  │ Defense  │ [PlayLogPanel]                     │
│(placeholder)│(placeholder)│(placeholder)│                          │
├──────────┴──────────┴──────────┴────────────────────────────────────┤
│ [QuickBar — full width, phase-aware]                                │
└─────────────────────────────────────────────────────────────────────┘
```

When ScoreBug is tapped:
```
┌─────────────────────────────────────────────────────────────────────┐
│ NYY 3  |  T7  |  BOS 2  |  ◆◇◇  ●●○           ✓  Ⓜ  🔊       │
├─────────────────────────────────────────────────────────────────────┤
│ ┌── EXPANDED SCOREBOARD OVERLAY (~25% height) ──────────────────┐  │
│ │  FENWAY PARK (or stadium name)                                 │  │
│ │  NYY: 0 2 0  0 1 0  0 — 3  7  1                              │  │
│ │  BOS: 1 0 0  0 0 0  1 — 2  5  0                              │  │
│ └────────────────────────────────────────────────────────────────┘  │
├──────────┬──────────┬──────────┬────────────────────────────────────┤
│ (columns partially visible behind overlay)                          │
├──────────┴──────────┴──────────┴────────────────────────────────────┤
│ [QuickBar — STILL VISIBLE AND FUNCTIONAL]                           │
└─────────────────────────────────────────────────────────────────────┘
```

Diamond is GONE. No GameDiamond renders anywhere.

## VERIFICATION

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. ScoreBug component exists
ls src/src_figma/app/components/ScoreBug.tsx
# Expected: file exists

# 4. GameDiamond no longer imported or rendered
grep -n "GameDiamond" src/src_figma/app/pages/GameTracker.tsx
# Expected: 0 matches (or only commented-out lines)

# 5. ScoreBug has required elements
grep -n "base-state\|outs\|inning\|Score\|Ⓜ\|✓\|🔊" src/src_figma/app/components/ScoreBug.tsx | head -15
# Expected: matches for base-state diamond, outs circles, inning indicator, team scores, save indicator, manager moment, audio icon

# 6. Expanded scoreboard toggle exists
grep -n "isScoreboardExpanded\|setIsScoreboardExpanded" src/src_figma/app/pages/GameTracker.tsx | head -5
# Expected: state declaration + toggle logic

# 7. FullFenwayScoreboard is no longer in the primary render path
grep -n "<FullFenwayScoreboard" src/src_figma/app/pages/GameTracker.tsx
# Expected: 0 matches in the main layout render (may exist inside the expanded overlay wrapper)

# 8. GameDiamond.tsx file still exists (not deleted, just de-rendered)
ls src/src_figma/app/components/GameDiamond.tsx
# Expected: file exists
```

## FORMAT

When complete, output:

```
STEP 1.B COMPLETE

Files created:
1. src/src_figma/app/components/ScoreBug.tsx — [describe: props, layout, styling]

Files changed:
2. src/src_figma/app/pages/GameTracker.tsx — [describe: ScoreBug wired, overlay toggle, GameDiamond removed]
3. src/src_figma/app/components/FullFenwayScoreboard.tsx — [describe: how it's used in the overlay]

Verification results:
- npm run build: [PASS/FAIL]
- npm test: [PASS/FAIL — note any test updates]
- ScoreBug.tsx exists: [verified]
- GameDiamond removed from render: [verified]
- ScoreBug elements present: [verified]
- Expanded scoreboard toggle: [verified]
- FullFenwayScoreboard in overlay only: [verified]
- GameDiamond.tsx file preserved: [verified]

GameDiamond-specific code removed/commented:
[List any state, refs, or handlers that were removed or commented out because they only served GameDiamond]

Ready for JK browser verification.
```

## FAILURE PROTOCOL

- If removing GameDiamond breaks other components that depend on it → search for ALL imports of GameDiamond across the codebase. If other pages import it, only remove it from GameTracker.tsx. Leave other imports intact.
- If the expanded overlay covers the Quick Bar → adjust z-index or positioning. The overlay must NOT cover the Quick Bar. Check that the overlay's bottom edge stops above the Quick Bar's top edge.
- If the base-state diamond in ScoreBug is hard to render → a minimal version is fine: 4 small squares/diamonds in a diamond pattern. It doesn't need to be beautiful in this step — it needs to be functional and correctly reflect base occupancy.
- If FullFenwayScoreboard has props that are hard to pass through the overlay → simplify. The overlay can pass a subset of props for the linescore. Stadium name and R/H/E are the minimum viable expanded content.
- If you cannot determine which state/refs are GameDiamond-specific → comment them out conservatively and note what you commented. Better to comment too much (and uncomment later) than leave dead code active.
- If anything is ambiguous → STOP and report the ambiguity. Do NOT guess.

## ANTI-PATTERNS

- Do NOT build lineup column components. Those are Step 1.C.
- Do NOT build the NewsBoard component. That's Step 1.C.
- Do NOT modify useGameState.ts. No state changes in this step.
- Do NOT modify eventLog.ts, EnrichmentPanel.tsx, or QuickBar.tsx.
- Do NOT delete GameDiamond.tsx. Remove from render only.
- Do NOT touch any file under src/components/.
- Do NOT change baseball logic, runner defaults, or stat calculations.
- Do NOT add audio playback or manager moment logic. Just render the placeholder icons in ScoreBug.

Use high reasoning effort. Read before writing. Build after every file change.
