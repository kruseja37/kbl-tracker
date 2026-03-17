# PROMPT CONTRACT: Step 1.C — Lineup Columns + NewsBoard + Pre-Game Features
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t1c-columns-newsboard
# Prerequisite: Step 1.B merged to main

---

You are a senior React/TypeScript engineer completing the final step of the Tier 1 architectural rewrite for KBL Tracker's GameTracker. Steps 1.A (phase state machine + layout shell) and 1.B (ScoreBug + diamond removal) are complete. The 4-column layout has placeholder divs in columns 1-3 and an existing PlayLogPanel in column 4. This step fills those placeholders with real components.

## GOAL

Build three new components: BattingLineupColumn, DefensiveLineupColumn, and NewsBoard. Wire them into the 4-column layout. Implement role-based column swapping on half-inning transitions. Add Swap Order to the player card for pre-game lineup editing.

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §5 Lineup Columns (all subsections), §6 NewsBoard (all subsections), §9.3 Batting Order Swap, §10.2 Half-Inning Transition
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-013, UX-014, UX-015, UX-020, UX-035
- `spec-docs/GAMETRACKER_UX_IMPLEMENTATION_PLAN.md` — Step 1.C

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §5, §6, §9.3, §10.2 in full
2. Read `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` entries for UX-013, UX-014, UX-015, UX-020, UX-035
3. Read the current GameTracker.tsx to understand:
   - Where the 4-column content area is rendered (from Step 1.A)
   - Where the placeholder divs are for columns 1-3
   - How the existing lineup data flows (search for `lineup`, `battingOrder`, `homeLineup`, `awayLineup`)
   - Where the PlayerCardModal is defined (search for `PlayerCardModal` — approximately line 6380+)
   - How team colors are accessed (search for `teamColor`, `primaryColor`, `getTeamColors`)
4. Read the existing FenwayBoard.tsx to understand what matchup data is already available (this data will feed the NewsBoard)
5. Read `src/src_figma/app/utils/fenwayBoardContext.ts` to understand the matchup data pipeline
6. Create branch: `git checkout -b feature/gt-ux-t1c-columns-newsboard`
7. Run `npm run build` and `npm test` to confirm clean baseline

## CONSTRAINTS

### Files you WILL create:
```
src/src_figma/app/components/BattingLineupColumn.tsx    — Inline batting lineup (column 2)
src/src_figma/app/components/DefensiveLineupColumn.tsx  — Inline defensive lineup (column 3)
src/src_figma/app/components/NewsBoard.tsx               — Context + beat reporter column (column 1)
```

### Files you WILL modify:
```
src/src_figma/app/pages/GameTracker.tsx    — Replace placeholder divs with new components, wire props, add Swap Order to PlayerCardModal, wire half-inning column swap
```

### Files you MUST NOT modify:
```
src/src_figma/hooks/useGameState.ts        — No state changes (gamePhase already added in 1.A)
src/utils/eventLog.ts                      — Persistence layer, DO NOT TOUCH
src/src_figma/app/components/EnrichmentPanel.tsx
src/src_figma/app/components/QuickBar.tsx
src/src_figma/app/components/ScoreBug.tsx  — Built in 1.B, leave alone
src/src_figma/app/components/LineupCard.tsx — Modified in Tier 2, not this step
Any file under src/components/             — DEAD CODE, never touch
```

## EXACT CHANGES — 5 items in this step

### Item 1.10 (UX-013): Build BattingLineupColumn.tsx

Create `src/src_figma/app/components/BattingLineupColumn.tsx`:

1. Receives the batting team's 9-player lineup as props, ordered by batting order (1-9).
2. Always shows all 9 players — NO scrolling within this column (9 entries fit in the available vertical space).
3. Each player entry is TWO rows (per spec §5.1, Press Start 2P font already globally applied):
   - **Top row:** Position abbreviation + player name + jersey number (e.g., "SS Hayata #37")
   - **Bottom row:** Currently empty or minimal — will show stats in Tier 2 when wired to real data
4. **Current batter highlight:** The player whose `battingOrder` matches the current batter index gets a solid outline/border in the team's primary color. You need the team's primary color — check how `getTeamColors()` is used elsewhere in GameTracker.tsx.
5. **Runners on base:** Players who are currently on base get their row BOLDED with a superscript exponent showing which base (e.g., "3. Hayata²" = on 2nd base). You need to cross-reference `bases` state (first/second/third booleans) with the runner IDs to determine which lineup player is on which base. Search useGameState for how runner identity is tracked — look for `runnerOnFirst`, `runnerOnSecond`, `runnerOnThird` or equivalent fields that map base positions to player IDs.
6. **Next-inning leadoff:** The player who will lead off the NEXT half-inning gets a dotted outline in the team's secondary color. This is the batter after the last batter who completed an at-bat in the current half-inning (wraps around from 9 to 1).
7. **Tapping a player:** Calls an `onPlayerTap(playerId)` callback. GameTracker.tsx handles opening the PlayerCardModal. If the tapped player is on base, the player card should show runner-specific options (Steal, Advance, etc.) — but this is Tier 2 work. For now, just call the tap callback.
8. Scoreboard Chalk Retro styling: lighter green panel background, white/cream text, team primary color for outlines.

### Item 1.11 (UX-014): Build DefensiveLineupColumn.tsx

Create `src/src_figma/app/components/DefensiveLineupColumn.tsx`:

1. Receives the fielding team's 9-player lineup as props, ordered by BATTING ORDER (not defensive position — spec §5.1).
2. Always shows all 9 players — no scrolling.
3. Each player entry is TWO rows:
   - **Top row:** Position abbreviation + player name + jersey number
   - **Bottom row:** fWAR for fielders, pitch count + pWAR for the pitcher. If fWAR/pWAR data is not available yet (not wired), show placeholder text like "—" rather than fake numbers.
4. **Current pitcher highlight:** The player who is the current pitcher gets a solid outline/border in the team's primary color.
5. **Next-inning leadoff:** Same as BattingLineupColumn — dotted outline in team's secondary color for the player who will lead off next.
6. **Tapping a player:** Calls `onPlayerTap(playerId)` callback. Same as batting column.
7. Same Scoreboard Chalk Retro styling.

### Item 1.12 (UX-015): Two-row player entries

This is built into Items 1.10 and 1.11 above. Both column components use two-row entries. Verify:
- Top row: position + name + jersey# in Press Start 2P
- Bottom row: context stats (or placeholder)
- Entries are compact enough that 9 entries fit vertically without scrolling

### Item 1.13 (UX-020): Build NewsBoard.tsx

Create `src/src_figma/app/components/NewsBoard.tsx`:

1. Column 1 of the 4-column layout. 1/5 width.
2. Two zones, vertically stacked:
   - **Pinned header (top, always visible):** Shows:
     - Current batter's game line (e.g., "Hayata: 2-for-3, 1 HR, 2 RBI")
     - Current pitcher's game line (e.g., "Bender: 6.1 IP, 3 H, 1 ER, 7 K")
     - Aggregated matchup history (e.g., "vs Bender: 3-for-12, 1 HR, 5 K")
   - **Scrollable feed (below header):** Beat reporter notes, most recent at top. Scrolls independently within the column. For now, this can be EMPTY with a placeholder label "Beat Reporter Feed" — the beat reporter content system is wired later.
3. **Dynamic refresh:** The header data should update when the current batter or pitcher changes. Wire the matchup data from the existing `fenwayBoardContext.ts` pipeline — search GameTracker.tsx for how `FenwayBoard` currently receives its matchup data (fenwayContext state at approximately line 671+). The same data feeds the NewsBoard header.
4. **Display only:** NO clickable elements in the NewsBoard (spec §6.4). No onClick handlers on any text. This is a read-only information panel.
5. Scoreboard Chalk Retro styling. The pinned header should have a slightly different background shade to visually separate it from the scrollable feed below.

### Item 1.14 (UX-035): Swap Order in Player Card (Pre-Game Only)

In `src/src_figma/app/pages/GameTracker.tsx`, in the PlayerCardModal:

1. Find the PlayerCardModal (search for `PlayerCardModal` — approximately line 6380+).
2. Add a "SWAP ORDER" button to the player card. This button is ONLY visible when `gamePhase === 'PRE_GAME'`.
3. When tapped, "SWAP ORDER" enters a mode where the next player tapped in ANY lineup column completes the swap: the two players exchange batting order positions WITHOUT changing their fielding positions.
4. Implementation approach:
   - Add state: `const [swapOrderMode, setSwapOrderMode] = useState<string | null>(null);` where the value is the first player's ID.
   - When SWAP ORDER is tapped, close the player card modal and set `swapOrderMode` to that player's ID.
   - While `swapOrderMode` is set, show a visual indicator (e.g., a banner at the top: "Tap another player to swap batting order").
   - When a second player is tapped (via `onPlayerTap` from either lineup column), execute the swap: exchange the `battingOrder` values of the two players in the lineup state.
   - Clear `swapOrderMode` after the swap completes.
5. After START GAME (gamePhase === 'LIVE'), the SWAP ORDER button is hidden from the player card.
6. In PRE_GAME, substitutions should also work without the permanent no-re-entry restriction. But for this step, just implement the Swap Order button. The no-re-entry relaxation for pre-game is a Tier 2 concern (when substitution flows are rewritten).

### Wiring the lineup columns into GameTracker.tsx

In GameTracker.tsx:

1. Replace the three placeholder divs (columns 1-3) with the new components:
   - Column 1: `<NewsBoard ... />`
   - Column 2: `<BattingLineupColumn ... />`
   - Column 3: `<DefensiveLineupColumn ... />`
   - Column 4: remains `<PlayLogPanel ... />` (already wired from Step 1.A)
2. **Role-based column assignment:** Column 2 ALWAYS shows the batting team. Column 3 ALWAYS shows the fielding team. When the half-inning changes (top → bottom or bottom → top), the lineup data feeding columns 2 and 3 SWAPS. The columns themselves don't move — the data they display changes.
   - If `isTop` is true: column 2 = away team lineup, column 3 = home team lineup.
   - If `isTop` is false: column 2 = home team lineup, column 3 = away team lineup.
   - This should reactively update whenever `isTop` changes in the game state.
3. Pass the required props to each component from GameTracker's state and the useGameState hook.

## EXPECTED OUTPUT

After this step, the GameTracker in LIVE phase should render as:

```
┌─────────────────────────────────────────────────────────────────────┐
│ NYY 3  |  T7  |  BOS 2  |  ◆◇◇  ●●○            ✓  Ⓜ  🔊       │
├──────────┬──────────┬──────────┬────────────────────────────────────┤
│NEWSBOARD │ BATTING  │ DEFENSE  │         PLAY LOG                   │
│          │ LINEUP   │ LINEUP   │                                    │
│ Hayata:  │          │          │  T7 Hayata  1B  [+fld] [+loc]     │
│ 2-for-3  │ 1.Smith  │ P Bender │  T7 Tanaka  GO  [+fld]           │
│ 1HR 2RBI │   SS #12 │   P  #45 │  T7 Sato    K                    │
│ ──────── │ 2.Jones  │   PC:87  │                                    │
│ Bender:  │   2B #7  │ C Davis  │                                    │
│ 6.1IP 7K │ 3.Hayata²│   C  #31 │                                    │
│ ──────── │ ★SS #37  │   fWAR:— │                                    │
│ vs Bender│ 4.Tanaka │ 1B Chen  │                                    │
│ 3-for-12 │   LF #22 │   1B #8  │                                    │
│ ──────── │ ...      │ ...      │                                    │
│ Beat Rptr│          │          │                                    │
│ Feed     │          │          │                                    │
│ (empty)  │          │          │                                    │
├──────────┴──────────┴──────────┴────────────────────────────────────┤
│[K][Ꝁ][GO][FO][LO][1B][BB][2B][HR][···] | [↩][End]                │
└─────────────────────────────────────────────────────────────────────┘

★ = current batter (solid team primary color outline)
² = superscript base exponent (runner on 2nd)
```

In PRE_GAME phase, tapping a player shows a player card with "SWAP ORDER" button. Tapping SWAP ORDER → tap another player → batting order positions swap.

## VERIFICATION

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. New component files exist
ls src/src_figma/app/components/BattingLineupColumn.tsx
ls src/src_figma/app/components/DefensiveLineupColumn.tsx
ls src/src_figma/app/components/NewsBoard.tsx
# Expected: all 3 files exist

# 4. Placeholder divs are gone from GameTracker
grep -n "NewsBoard.*placeholder\|Batting.*placeholder\|Defense.*placeholder" src/src_figma/app/pages/GameTracker.tsx
# Expected: 0 matches (placeholders replaced with real components)

# 5. New components are imported and rendered
grep -n "BattingLineupColumn\|DefensiveLineupColumn\|NewsBoard" src/src_figma/app/pages/GameTracker.tsx | head -10
# Expected: import statements + JSX renders for all 3

# 6. Role-based column swap logic exists
grep -n "isTop.*away\|isTop.*home\|batting.*team\|fielding.*team" src/src_figma/app/pages/GameTracker.tsx | head -10
# Expected: conditional logic swapping which team feeds which column based on isTop

# 7. Swap Order exists in player card (pre-game only)
grep -n "SWAP ORDER\|swapOrder\|swap.*order" src/src_figma/app/pages/GameTracker.tsx | head -10
# Expected: button definition + gamePhase === 'PRE_GAME' guard

# 8. NewsBoard has no click handlers
grep -n "onClick" src/src_figma/app/components/NewsBoard.tsx
# Expected: 0 matches (display-only component)

# 9. All 9 players fit without scrolling (verify column has no overflow-y:scroll/auto on the lineup)
grep -n "overflow" src/src_figma/app/components/BattingLineupColumn.tsx
# Expected: no overflow-y:auto or overflow-y:scroll on the player list container
```

## FORMAT

When complete, output:

```
STEP 1.C COMPLETE — TIER 1 COMPLETE

Files created:
1. src/src_figma/app/components/BattingLineupColumn.tsx — [describe: props, player entry format, highlights]
2. src/src_figma/app/components/DefensiveLineupColumn.tsx — [describe: props, player entry format, highlights]
3. src/src_figma/app/components/NewsBoard.tsx — [describe: props, header content, feed placeholder]

Files changed:
4. src/src_figma/app/pages/GameTracker.tsx — [describe: components wired, role-based swap, Swap Order in player card]

Verification results:
- npm run build: [PASS/FAIL]
- npm test: [PASS/FAIL — note any test updates]
- New components exist: [verified]
- Placeholders replaced: [verified]
- Components imported and rendered: [verified]
- Role-based column swap: [verified]
- Swap Order pre-game: [verified]
- NewsBoard display-only: [verified]

Data wiring notes:
[Describe how you wired lineup data to the columns — which state/props carry the batting order, player names, positions, jersey numbers, team colors. Note any data that was NOT available and is showing placeholders.]

Ready for JK browser verification — TIER 1 GATE.
```

## FAILURE PROTOCOL

- If you cannot find lineup data in GameTracker.tsx → search for `homeLineup`, `awayLineup`, `lineup`, `battingOrder`, `startingLineups`. The data exists somewhere in useGameState or in the game initialization flow. Follow the data trail.
- If runner identity mapping is unclear (which base = which player) → search useGameState.ts for `runnerOnFirst`, `runnerOnSecond`, `runnerOnThird`, `baseRunners`, or equivalent. If runners are tracked by boolean only (not by player ID), note this as a limitation: the base exponent feature requires runner identity, and the exponent will show "?" until runner identity is available. Do NOT fabricate runner identity data.
- If team colors are not easily accessible → search for `getTeamColors`, `teamColors`, `primaryColor` in the codebase. The Scoreboard Chalk Retro theme already uses team colors somewhere. If truly unavailable, use a default highlight color and document it.
- If matchup data from fenwayBoardContext is complex to wire → wire what's readily available (batter name, pitcher name, basic stats) and leave a TODO comment for the full matchup history. The NewsBoard header should show REAL data where available, placeholders where not. Do NOT invent fake stats.
- If the Swap Order feature is complex to implement without modifying useGameState.ts → implement a simpler version: the button exists and is visible in PRE_GAME, but tapping it shows a "Coming soon" message. Document this as a partial implementation. The visual presence of the button is more important than the swap logic for verifying the Tier 1 layout gate.
- If anything is ambiguous → STOP and report the ambiguity. Do NOT guess.

## ANTI-PATTERNS

- Do NOT build enrichment mode on the defensive lineup column. That's Tier 3.
- Do NOT build the player-card-first substitution flow. That's Tier 2 (UX-030).
- Do NOT wire real fWAR/pWAR stats if the data pipeline isn't readily accessible. Use "—" placeholders.
- Do NOT modify useGameState.ts — pass data through props from GameTracker.tsx.
- Do NOT modify eventLog.ts, EnrichmentPanel.tsx, QuickBar.tsx, or ScoreBug.tsx.
- Do NOT add runner action options (Steal, Advance, etc.) to the player card. That's Tier 2.
- Do NOT touch any file under src/components/.
- Do NOT invent or hardcode fake stats. Real data or "—" placeholders — nothing in between.
- Do NOT add beat reporter content generation. The feed is an empty scrollable container with a placeholder label.

Use high reasoning effort. Read before writing. Build after every file change.
