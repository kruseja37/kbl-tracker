# GameTracker UX Gap Analysis
**Generated:** 2026-03-15
**Spec version:** GAMETRACKER_UX_SPEC.md v1.0
**Branch:** main
**Auditor:** Claude Code CLI (Opus)

## Summary

**58 decisions evaluated** across 4 phases.

| Status | Count | % |
|--------|-------|---|
| N/A | 2 | 3% |
| EXISTS | 8 | 14% |
| PARTIAL | 22 | 38% |
| CONFLICTS | 16 | 28% |
| MISSING | 9 | 16% |
| UNVERIFIED | 1 | 2% |

**Spec-aligned (EXISTS + N/A):** 10 / 58 (17%)
**Needs work (PARTIAL + CONFLICTS + MISSING + UNVERIFIED):** 48 / 58 (83%)

### Top Architectural Gaps
1. **Layout:** 5-zone grid (code) vs 4-column layout (spec) — UX-003, UX-005, UX-013, UX-014
2. **Score Bug:** Full multi-row Fenway scoreboard (code) vs single-line score bug with expand/collapse (spec) — UX-006, UX-008
3. **Diamond:** Still rendered (code) vs removed (spec) — UX-004
4. **Lineups:** Behind modal overlay (code) vs always-visible inline columns (spec) — UX-013, UX-014
5. **NewsBoard:** Does not exist (code) vs 1/5-width dedicated column (spec) — UX-020
6. **Pre-game Phase:** Does not exist (code) vs START GAME gate with free lineup editing (spec) — UX-034, UX-035, UX-038
7. **Substitution Flow:** Lineup-card drag-drop (code) vs player-card-first (spec) — UX-030
8. **Contact Type:** Old exit type paradigm (code) vs new contact type paradigm (spec) — UX-027, UX-057
9. **Audio:** No audio system (code) vs full retro 8-bit audio suite (spec) — UX-054
10. **K/Ꝁ and ITPHR:** Not separate Quick Bar buttons (code) vs spec requires them — UX-048, UX-049

### What Does Exist
- Scoreboard Chalk Retro theme (UX-016)
- Overflow menu grid (UX-012)
- Matchup as aggregated stats (UX-021)
- Result code locking (UX-026)
- 100% local IndexedDB with auto-save (UX-041)
- Resume Game entry points (UX-042)
- No batch catch-up mode (UX-044)
- Runner outcomes[] on AtBatEvent (UX-050)

## Gap Report

### Phase 1 — Layout, Score Bug, Quick Bar (UX-001 through UX-016)

#### UX-001: Right middle finger, iPad flat on cushion, hand from above
**Status:** N/A
**Evidence:** Physical context — no code evaluation needed.
**Searched:** N/A

#### UX-002: User pauses SMB4, full attention on iPad when recording
**Status:** N/A
**Evidence:** Physical context / pace model — no code evaluation needed.
**Searched:** N/A

#### UX-003: 4-column layout: NewsBoard, Batting Lineup, Defensive Lineup, Play Log
**Status:** CONFLICTS
**Evidence:** GameTracker.tsx:4606 comment reads "§3.7 FIVE-ZONE CSS GRID LAYOUT". GameTracker.tsx:4644-4648 defines `gridTemplateColumns: 'minmax(248px, 300px) 1fr minmax(184px, 228px)'` — a 3-column grid. Zone 1 is FenwayBoard (top-left), Zone 2 is GameDiamond (center), Zone 3 is PlayLog (right). Bottom row has QuickBar (bottom-left) and Modifiers (bottom-right). No NewsBoard column, no Batting Lineup column, no Defensive Lineup column.
**Searched:** extract_layout_scorebug.txt, GameTracker.tsx (lines 4603-4650)
**Notes:** Current code implements a 5-zone layout (FenwayBoard, Diamond, PlayLog, QuickBar, Modifiers). Spec requires a 4-column layout (NewsBoard 1/5, Batting Lineup 1/5, Defensive Lineup 1/5, Play Log 2/5) with pinned Score Bug top and Quick Bar bottom. Complete architectural mismatch.

#### UX-004: Diamond removed — base state via lineup exponents + score bug indicator
**Status:** CONFLICTS
**Evidence:** GameDiamond is imported at GameTracker.tsx:19 (`import { GameDiamond } from "@/app/components/GameDiamond"`) and rendered at GameTracker.tsx:4735 (`<GameDiamond ...>`). The diamond occupies Zone 2 (center) of the current grid layout.
**Searched:** extract_layout_scorebug.txt, GameTracker.tsx (import at line 19, render at line 4735)
**Notes:** Spec says diamond is removed entirely. Code still renders it as the center zone.

#### UX-005: Column proportions: 1/5, 1/5, 1/5, 2/5
**Status:** CONFLICTS
**Evidence:** GameTracker.tsx:4645 defines `gridTemplateColumns: 'minmax(248px, 300px) 1fr minmax(184px, 228px)'` — a 3-column grid with pixel-based widths. Not 4 columns. Not 1/5:1/5:1/5:2/5 proportions.
**Searched:** extract_layout_scorebug.txt, GameTracker.tsx (line 4644-4648)
**Notes:** Cannot evaluate proportions because the column count itself is wrong (3 vs 4).

#### UX-006: Score bug single-line: teams, scores, inning, base state, outs
**Status:** CONFLICTS
**Evidence:** FullFenwayScoreboard.tsx (entire file, 271 lines) renders a full multi-row scoreboard with: stadium name (line 188), inning-by-inning linescore grid (lines 192-228), balls/strikes/outs CountDots (lines 239-249), AT BAT display (lines 233-236), game date and elapsed time (lines 256-258). This occupies significant vertical space — not a single horizontal line.
**Searched:** FullFenwayScoreboard.tsx (full file), extract_layout_scorebug.txt
**Notes:** Spec requires a single horizontal line ~30-40pt containing: AWAY score | inning indicator | HOME score | base-state diamond | outs circles | save indicator | manager moment indicator | audio toggles. Current component is a full Fenway-style scoreboard with inning-by-inning data, balls/strikes, stadium name, date, and elapsed time.

#### UX-007: No pitch-by-pitch count in V1
**Status:** CONFLICTS
**Evidence:** FullFenwayScoreboard.tsx:239-244 renders `CountDots` for balls (count={balls} total={4}) and strikes (count={strikes} total={3}). FullFenwayScoreboard accepts `balls` and `strikes` props (lines 22-23). useGameState.ts exports `GameState` with `balls: number` and `strikes: number` fields (lines 73-74).
**Searched:** FullFenwayScoreboard.tsx (lines 22-23, 239-244), extract_GS_structure.txt (GameState type)
**Notes:** Spec says V1 does NOT track pitch-by-pitch ball/strike count. Code tracks and displays both balls and strikes in the scoreboard.

#### UX-008: Expanded scoreboard overlays downward, Quick Bar pinned
**Status:** CONFLICTS
**Evidence:** FullFenwayScoreboard.tsx is always visible at top of viewport (rendered at GameTracker.tsx:4618-4639). A disabled "MINI" button exists (FullFenwayScoreboard.tsx:177-183) with `title="MINI toggle reserved for later layout work"`, but no collapse/expand/overlay behavior is implemented. FenwayBoard.tsx has a compact inline score section (lines 117-156) with `showScoreboard` prop but this is Zone 1 content, not an overlay.
**Searched:** FullFenwayScoreboard.tsx (lines 177-183), FenwayBoard.tsx (lines 107-156), extract_layout_scorebug.txt
**Notes:** Spec says tapping the score bug expands a retro Fenway overlay covering ~25% of screen height, then tap again to collapse. Current code shows the full scoreboard permanently. No expand/collapse behavior exists.

#### UX-009: Quick Bar at bottom, score bug at top, not flipped
**Status:** PARTIAL
**Evidence:** FullFenwayScoreboard renders at top of viewport (GameTracker.tsx:4618). QuickBar renders in the bottom-left zone (GameTracker.tsx grid row 2, column 1 area — QuickBar component at line ~4986 area). Vertical positions match the spec. However, the top element is a full scoreboard (not a single-line score bug), and the QuickBar occupies only the bottom-left zone (not full-width).
**Searched:** extract_layout_scorebug.txt, GameTracker.tsx (lines 4617-4640, 4980-5050)
**Notes:** Position (top/bottom) is correct. Format is wrong: spec says single-line score bug at top and full-width Quick Bar at bottom.

#### UX-010: Undo + End Game at far right of Quick Bar with divider
**Status:** PARTIAL
**Evidence:** Undo button rendered at GameTracker.tsx:5041 (`<undoSystem.UndoButtonComponent />`). End Game button at GameTracker.tsx:5042-5047. Both are in the bottom area but in a SEPARATE div (the modifiers/bottom-right zone, grid column 2-3, row 2). QuickBar.tsx contains ONLY outcome buttons and overflow — no Undo or End Game. There is no visual divider between outcome buttons and utility buttons.
**Searched:** QuickBar.tsx (full file), extract_layout_scorebug.txt (lines 5040-5052), GameTracker.tsx bottom area
**Notes:** Spec says Undo + End Game should be in the Quick Bar row at far right, separated by a visual divider. Current code splits them into a separate zone.

#### UX-011: Button stays depressed until processing complete
**Status:** CONFLICTS
**Evidence:** QuickBar.tsx:105-108 uses CSS `active:scale-95 active:shadow-none transition-transform`. The `:active` pseudo-class only applies while the user's finger/mouse is physically pressing — it releases immediately when the user lifts their finger, regardless of whether the event has been processed.
**Searched:** QuickBar.tsx (lines 94-115)
**Notes:** Spec says button stays depressed/highlighted until event is fully processed (event saved, runners advanced, play log updated, lineup advanced), then releases. Current implementation has no processing-aware feedback — just CSS :active.

#### UX-012: Overflow menu: grid/panel floating above Quick Bar
**Status:** EXISTS
**Evidence:** QuickBar.tsx:152-164 renders overflow as `absolute bottom-full left-0 right-0` div with `grid grid-cols-5 gap-1`. Tapping an outcome calls `onOutcome` and sets `setOverflowOpen(false)` (line 102-103). Clicking outside closes the panel via mousedown handler (lines 83-91).
**Searched:** QuickBar.tsx (lines 79-164)

#### UX-013: All 9 batters visible, current batter outlined in team primary color
**Status:** CONFLICTS
**Evidence:** Lineups are NOT inline columns. They are behind a "LINEUP" button (GameTracker.tsx:4990-5001) that opens a modal overlay (`showLineupOverlay` state at line 666, overlay rendered at line 5166). The modal renders LineupCard inside an overlay div. Batters are not always visible — they require opening the lineup modal.
**Searched:** extract_layout_scorebug.txt (lines 4990-5001, 5166-5210), GameTracker.tsx (line 666)
**Notes:** Spec says all 9 batters are always visible in column 2 with current batter outlined in team primary color. Current code hides lineups behind a button-triggered modal overlay.

#### UX-014: Both lineups ordered by batting order with position + name + jersey #
**Status:** CONFLICTS
**Evidence:** Both lineups are rendered inside a modal overlay (see UX-013) via LineupCard component, not as inline always-visible columns. The spec requires lineup columns 2 and 3 to be always visible and ordered by batting order. The display surface is architecturally wrong (modal vs inline column).
**Searched:** extract_layout_scorebug.txt (lines 5166-5210), extract_lineup.txt, LineupCard.tsx (referenced but not the primary issue)
**Notes:** Even if LineupCard internally sorts by batting order, the spec requires always-visible inline columns — not a modal.

#### UX-015: Press Start 2P font, two-row player entries
**Status:** PARTIAL
**Evidence:** Press Start 2P is loaded in `src/src_figma/styles/fonts.css:2` via Google Fonts import. It is applied globally via `src/src_figma/styles/theme.css:146` (`body { font-family: 'Press Start 2P', monospace; }`), plus buttons (line 154) and headings (line 160). The font IS present and applied across the app including GameTracker.
**Searched:** fonts.css, theme.css (lines 140-163), GameTracker.tsx (searched for "Press Start" — no component-level overrides found)
**Notes:** Font is present globally. However, the "two-row player entries" part (position+name+jersey# on top, stats on bottom) cannot be evaluated because the inline lineup columns do not exist yet (see UX-013, UX-014).

#### UX-016: Scoreboard Chalk Retro theme confirmed
**Status:** EXISTS
**Evidence:** Color palette throughout GameTracker.tsx and components matches spec: `bg-[#6B9462]` (muted olive/sage green — GameTracker.tsx:4617), `text-[#E8E8D8]` (cream/chalk text — used throughout all components), `bg-[#2a3a2d]` / `bg-[#3d5240]` / `bg-[#556B55]` (darker green panels — FenwayBoard.tsx:115, QuickBar.tsx:118), flat design with pixel-art shadow aesthetic (`shadow-[2px_2px_0px...]`). Press Start 2P retro font applied globally (theme.css:146).
**Searched:** GameTracker.tsx (line 4617), QuickBar.tsx (line 118), FenwayBoard.tsx (line 115), FullFenwayScoreboard.tsx (lines 31-47 COLORS object), theme.css (lines 146-163)

### Phase 2 — Lineup Columns, Player Card, Newsboard (UX-017 through UX-033)

#### UX-017: Player card: compact stats + full attributes + action buttons
**Status:** PARTIAL
**Evidence:** PlayerCardModal exists at GameTracker.tsx:6380-6672. Shows player name, position, batting/throwing hand (line 6451), a "SEASON STATS" section (line 6467), a "TODAY'S GAME" section (line 6490), and a CONDITION section with mojo/fitness editing (lines 6561-6667). However: (1) Stats are HARDCODED to zero with TODO comment at line 6402: "T0-09: Zero stats for player card — no phantom data, TODO: Wire to actual game state". (2) No full attributes from League Builder (age, gender, ratings, traits, player morale) are shown. (3) No action buttons for Sub Out, Swap Position, Swap Order, Update Mojo, or Update Fitness per spec §5.5 — mojo/fitness editing is inline in the card rather than as discrete action buttons.
**Searched:** GameTracker.tsx (lines 6380-6672, 5148-5164), PlayerCardModal (inline in GameTracker.tsx)
**Notes:** The card exists as a modal popup with the right visual structure, but stats are dummy values, attributes are missing, and the spec's action button model (Sub Out / Swap Position / Swap Order / Update Mojo / Update Fitness) is not implemented.

#### UX-018: Player card stats: AVG/HR/RBI/OPS/WAR/SB (pos) or ERA/W-L/K/WHIP/IP/pWAR (pitch)
**Status:** PARTIAL
**Evidence:** Batter card (GameTracker.tsx:6468-6485) shows AVG, HR, RBI, SB — missing OPS and WAR. Pitcher card (GameTracker.tsx:6516-6532) shows ERA, W, L, SO — missing WHIP, IP, and pWAR. All values are hardcoded to zero (line 6402-6432). Display label is "SO" not "K" as spec requires.
**Searched:** GameTracker.tsx (lines 6463-6558, PlayerCardModal batter and pitcher sections)
**Notes:** 4 of 6 batter stats present, 4 of 6 pitcher stats present. Missing: OPS, WAR, WHIP, IP, pWAR. All values hardcoded.

#### UX-019: Player card = season stats; NewsBoard = game stats
**Status:** PARTIAL
**Evidence:** PlayerCardModal has separate "SEASON STATS" (GameTracker.tsx:6467) and "TODAY'S GAME" (line 6490) sections — the concept of separating season and game stats exists. However: (1) All stats are hardcoded zeros, not wired to actual data. (2) No NewsBoard column exists to display game stats in the spec's intended location.
**Searched:** GameTracker.tsx (lines 6463-6558)
**Notes:** The season/game split concept is present in the player card UI structure but not functional. NewsBoard column does not exist.

#### UX-020: NewsBoard: pinned stats header + scrollable beat reporter feed
**Status:** MISSING
**Evidence:** No NewsBoard component or column exists anywhere in the codebase. Searched for "newsboard", "news.board", "beat.reporter", "beatReporter" across src/src_figma — no matches in GameTracker components. FenwayBoard.tsx serves a partial analogous role (pitcher/batter context, matchup data, milestones) but is Zone 1 of the 5-zone layout, not a dedicated 1/5-width NewsBoard column. No scrollable beat reporter feed exists in any GameTracker component.
**Searched:** grep for "newsboard|beat.reporter" in src/src_figma (4 files found, none in GameTracker components), FenwayBoard.tsx (full file), extract_newsboard.txt

#### UX-021: Matchup history is aggregated stats, not at-bat log
**Status:** EXISTS
**Evidence:** FenwayBoard.tsx:297-316 displays matchup as aggregated stats: "This game vs [pitcher]: [record] ([avg])" and "History vs [pitcher]: [record] ([avg])". Data is produced by `buildFenwayMatchupSummary()` imported at GameTracker.tsx:105 from `fenwayBoardContext.ts`. The function computes aggregated records from event arrays, not individual at-bat logs. FenwayContext state at GameTracker.tsx:671-677 stores `matchupRecord`, `matchupAvg`, `historicalMatchupRecord`, `historicalMatchupAvg`.
**Searched:** FenwayBoard.tsx (lines 294-327), GameTracker.tsx (lines 671-677, 2060-2103, import at line 105)

#### UX-022: Post-commit runner correction (no pre-commit gate)
**Status:** CONFLICTS
**Evidence:** Runner correction flow: Quick Bar tap → `buildRunnerCorrectionForQuickBarOutcome()` (imported at GameTracker.tsx:111) calculates defaults → `setPendingRunnerCorrection()` (line 714) shows a correction panel → user adjusts runners → `handleRunnerCorrectionCommit()` (line 2287) calls `commitPlateAppearance()` with adjusted runner data. The play does NOT commit on Quick Bar tap — it waits until the runner correction panel is dismissed/committed. This is a pre-commit gate, not post-commit correction.
**Searched:** GameTracker.tsx (lines 111-116, 714, 2279-2310), extract_quickbar.txt
**Notes:** Spec says outcome commits immediately on Quick Bar tap and runner corrections happen AFTER (post-commit). Code blocks the commit until runner adjustments are confirmed (pre-commit gate).

#### UX-023: Play log entries with team-color styled player names
**Status:** MISSING
**Evidence:** Searched PlayLogPanel.tsx for "team.*color", "teamColor", "primaryColor", "styled.*name" — no matches found. PlayLogPanel does not accept team color props and does not style player names with team colors.
**Searched:** PlayLogPanel.tsx (grep for team color patterns — no matches)
**Notes:** Play log entries exist but player names are not styled with team primary colors as spec requires.

#### UX-024: Defensive lineup enrichment mode for fielding sequences
**Status:** MISSING
**Evidence:** No inline defensive lineup column exists (see UX-003, UX-013). The spec describes tapping fielders in the defensive lineup column to build a fielding sequence (e.g., "6 → 4 → 3"). Current fielding sequence entry happens through EnrichmentPanel or FielderCreditModal, not by tapping players in a lineup column that toggles into "FIELDING SEQUENCE" mode.
**Searched:** LineupCard.tsx (full file — no enrichment mode), extract_lineup.txt, GameTracker.tsx (searched for "FIELDING SEQUENCE" — not found)
**Notes:** The entire interaction model described in spec §5.4 (column header changes, fielder rows get tap-target treatment, sequence builds visually, Done/Clear buttons) does not exist.

#### UX-025: Context-sensitive enrichment fields per result type
**Status:** PARTIAL
**Evidence:** EnrichmentPanel.tsx exists and is imported at GameTracker.tsx:15. The component provides enrichment fields. However, full evaluation of whether enrichment fields are context-sensitive per result type requires reading EnrichmentPanel.tsx in Phase 3. The component IS rendered and used for at-bat enrichment.
**Searched:** GameTracker.tsx (import at line 15), extract_enrichment.txt (confirms EnrichmentPanel usage)
**Notes:** Marked PARTIAL pending Phase 3 deep read of EnrichmentPanel.tsx. The component exists and is wired, but field-by-field context sensitivity per spec §8.5 needs verification.

#### UX-026: Quick Bar result NOT enrichable — undo to correct
**Status:** PARTIAL
**Evidence:** The Quick Bar commits outcomes that become AtBatEvent records in IndexedDB. The EnrichmentPanel allows editing enrichment fields on committed events. Need to verify in Phase 3 whether the result code field itself is locked in the enrichment UI. The undo system exists (UndoSystem.tsx) and provides the correction path. The concept matches spec intent but UI enforcement of result locking needs verification.
**Searched:** QuickBar.tsx (full file — outcomes fire onOutcome callback), extract_enrichment.txt
**Notes:** Pending Phase 3 verification of whether EnrichmentPanel locks the result code field.

#### UX-027: Catch type included in V1, defaults to Routine, applies to outs AND hits
**Status:** PARTIAL
**Evidence:** Catch type / fielding attempt concept exists in the enrichment system. EnrichmentPanel is imported and used. Full evaluation of specific options (Routine, Diving, Jumping, etc.) and whether it applies to both outs and hits requires Phase 3 read of EnrichmentPanel.tsx.
**Searched:** extract_enrichment.txt (confirms enrichment patterns exist)
**Notes:** Pending Phase 3 verification of specific catch type options and applicability.

#### UX-028: Context-sensitive spray graphic with result-specific zones
**Status:** PARTIAL
**Evidence:** GameTracker.tsx:5211 has comment "Play Location Overlay - REMOVED (now using drag-drop interface)". A spray/location system exists via the GameDiamond tap surface (GameTracker.tsx:4735-4740, mode='enhancement'). However, the spec requires an inline SVG fan-shaped graphic inside the play log entry with chalk-line aesthetic and result-specific zone counts. The current implementation uses the main diamond view, not an inline play log graphic.
**Searched:** GameTracker.tsx (line 5211, lines 4735-4740), extract_enrichment.txt
**Notes:** Location capture exists via diamond tap but not as an inline spray graphic in the play log per spec §8.2.

#### UX-029: HR zones: 7 directions × 3 depths = 21
**Status:** UNVERIFIED
**Evidence:** HR zone configuration requires reading the spray/location zone definitions. The current location system uses the GameDiamond tap surface rather than an inline SVG spray graphic. Specific zone counts (7×3=21 for HR) need verification against whatever zone data structure exists.
**Searched:** extract_enrichment.txt, GameTracker.tsx (line 5211)
**Notes:** Cannot verify specific zone counts without reading the zone definition code. The spec's inline SVG spray graphic does not exist — location is via diamond tap.

#### UX-030: Player-first substitution flow
**Status:** CONFLICTS
**Evidence:** Spec says: tap player in lineup → player card → "Sub Out" → bench list → select replacement. Current code: PlayerCardModal (GameTracker.tsx:6380-6672) has NO "Sub Out" button — searched for "Sub Out", "SubOut", "sub.out" in GameTracker.tsx with no matches. Substitutions happen via LineupCard.tsx drag-and-drop (bench player dragged to lineup slot) or touch-tap (tap bench player, then tap lineup slot). The flow is lineup-card-first, not player-first.
**Searched:** GameTracker.tsx (grep for "Sub Out", "Swap Position", "Swap Order" — no matches), LineupCard.tsx (full file — drag-drop/touch-tap substitution model), PlayerCardModal (lines 6380-6672)
**Notes:** Complete flow mismatch. Spec requires player-first (player card initiates sub). Code uses lineup-card-first (drag-drop or touch-tap in lineup modal).

#### UX-031: Mojo/fitness on player card, injury auto-inferred from fitness level
**Status:** PARTIAL
**Evidence:** PlayerCardModal has mojo/fitness editing at GameTracker.tsx:6561-6667. Mojo levels (-2 to +2) with named states and fitness states (JUICED through HURT) are selectable inline. However: (1) Editing is inline click-to-expand, not discrete "Update Mojo" / "Update Fitness" action buttons as spec §5.5 describes. (2) Searched for "auto.*injur", "injury.*auto", "fitness.*(STRAINED|WEAK|HURT).*log" across src/src_figma — no matches. No auto-injury logging when fitness is set to WEAK/STRAINED/HURT.
**Searched:** GameTracker.tsx (lines 6561-6667, 5155-5161), grep for auto-injury patterns in src/src_figma (no matches), InjuryPrompt.tsx (full file — handles KP/NUT events only, not general fitness changes)
**Notes:** Mojo/fitness editing exists on player card but as inline editing. Auto-injury inference from fitness level is not implemented.

#### UX-032: Pitch count prompted after replacement selection + every half-inning
**Status:** PARTIAL
**Evidence:** PitchCountPrompt type exists in useGameState.ts:242-250 with types 'pitching_change', 'end_game', 'end_inning'. A pitch count modal is rendered in GameTracker.tsx (around line 6270 area — "Check the broadcast or scoreboard for current count" text). The mechanism for prompting exists. Full verification of when exactly it fires (after pitcher replacement AND every half-inning) requires Phase 4 evaluation of the game flow code.
**Searched:** useGameState.ts (lines 242-250, PitchCountPrompt type), extract_layout_scorebug.txt (line 6270-6282)
**Notes:** Infrastructure exists. Trigger points need Phase 4 verification.

#### UX-033: NewsBoard is display-only, no clickable names
**Status:** CONFLICTS
**Evidence:** No NewsBoard exists (see UX-020). The closest functional equivalent is FenwayBoard.tsx, which DOES have clickable names: batter name at line 247 (`onClick={onBatterTap}`) and pitcher name at line 181 (`onClick={onPitcherTap}`). GameTracker.tsx passes click handlers: `onBatterTap={handleBatterTap}` (line 4725) and `onPitcherTap={...handlePitcherTap...}` (line 4726).
**Searched:** FenwayBoard.tsx (lines 180-181, 246-247), GameTracker.tsx (lines 4725-4726)
**Notes:** Spec says NewsBoard should have NO clickable elements. The FenwayBoard (closest equivalent) has clickable pitcher and batter names that open player cards and trigger pitching changes.

### Phase 3 — Play Log, Enrichment, Game Flow, Edge Cases (UX-034 through UX-049)

#### UX-034: Pre-game phase with START GAME gate is V1
**Status:** MISSING
**Evidence:** Searched for "pre.?game", "pregame", "START GAME", "gamePhase" across src/src_figma. GameTracker.tsx has no phase field or PRE_GAME state. The `initializeOrLoadGame()` at GameTracker.tsx:1700 immediately initializes the game on mount — no pre-game holding state. useGameState.ts has no GameState phase field (lines 66-86). FranchiseHome.tsx has PreGameData (line 68) for lineup review before launching GameTracker, but once GameTracker loads, the game is already live. No "START GAME" button exists in GameTracker.tsx. ExhibitionGame.tsx:341 has a "START GAME" button but that's the exhibition setup page, not GameTracker.
**Searched:** grep for "pre.?game|START GAME|gamePhase|pregame" in src/src_figma, GameTracker.tsx (line 1700), useGameState.ts (lines 66-86), ExhibitionGame.tsx (line 341)
**Notes:** Spec §10.1 requires a three-phase lifecycle (PRE_GAME → LIVE → POST_FINAL_OUT) with a "START GAME" gate that locks lineups. Code has no pre-game phase — game starts immediately on component mount.

#### UX-035: Swap Order available pre-game only
**Status:** MISSING
**Evidence:** No "Swap Order" button exists in PlayerCardModal (GameTracker.tsx:6380-6672 — searched for "Swap Order", "SwapOrder", "swap.*order", no matches). No pre-game phase exists (see UX-034). TeamRoster.tsx:697-713 has batting order swap logic that distinguishes pre-game vs live game, but TeamRoster is used in franchise/elimination contexts, not in the GameTracker player card flow.
**Searched:** GameTracker.tsx (grep for "Swap Order" — no matches), PlayerCardModal (lines 6380-6672), TeamRoster.tsx (lines 697-713)
**Notes:** The concept exists in TeamRoster.tsx for non-GameTracker contexts. Not available in GameTracker player card per spec §9.3.

#### UX-036: Manager moment: Ⓜ indicator (far right of score bug) + Stay the Course for passive decisions
**Status:** CONFLICTS
**Evidence:** Manager moment indicator exists in QuickBar.tsx:119-131 as a lightning bolt button with `animate-bounce` and pulsing border (`animate-pulse`). It is NOT in the score bug (FullFenwayScoreboard.tsx has no manager moment indicator — searched, no matches). It is on the Quick Bar, not the score bug's far right. No "Ⓜ" character is used — it's a lightning bolt "⚡". No "Stay the Course" button exists — searched GameTracker.tsx for "Stay the Course", "stay.*course" — no matches.
**Searched:** QuickBar.tsx (lines 119-131), FullFenwayScoreboard.tsx (grep for "manager|moment" — no matches), GameTracker.tsx (grep for "Stay the Course" — no matches, line 4578 comment only)
**Notes:** Indicator location is wrong (Quick Bar vs score bug), symbol is wrong (⚡ vs Ⓜ), and "Stay the Course" passive path is not implemented.

#### UX-037: Half-inning: pitch count prompt → role-based column swap → no summary screen
**Status:** PARTIAL
**Evidence:** Pitch count prompt at half-inning exists: useGameState.ts:5670 "Show pitch count prompt for the current pitcher at end of half-inning". PitchCountPrompt type at useGameState.ts:242-250 includes 'end_inning' type. GameTracker.tsx:6239 renders pitch count modal. However: (1) No role-based column swap exists because inline lineup columns do not exist (see UX-003, UX-013). (2) No between-inning summary screen is rendered (correct per spec — spec says none). (3) The transition is functional for score/inning state but has no lineup column content swap to evaluate.
**Searched:** useGameState.ts (lines 242-250, 5670), GameTracker.tsx (line 6239), grep for "summary.*screen|between.*inning" — no matches
**Notes:** Pitch count prompt at half-inning: EXISTS. Role-based column swap: N/A (columns don't exist). No summary screen: EXISTS (correct absence).

#### UX-038: Three-phase lifecycle: Pre-game → Live → Post-final-out
**Status:** PARTIAL
**Evidence:** No PRE_GAME phase exists (see UX-034). Game starts immediately on mount. POST_FINAL_OUT is partially present: useGameState.ts exposes `gameOver` state and `endGame()` function. GameTracker.tsx shows "END GAME" button at line 5042-5047 that navigates to PostGameSummary. The system detects game-ending conditions and prompts for final pitch count (PitchCountPrompt type 'end_game' at useGameState.ts:242). However, there is no explicit phase state machine (PRE_GAME → LIVE → POST_FINAL_OUT).
**Searched:** useGameState.ts (lines 242-250, grep for "gameOver|endGame|gamePhase"), GameTracker.tsx (lines 5042-5047)
**Notes:** Only 1 of 3 phases partially exists (POST_FINAL_OUT). Missing PRE_GAME entirely. No phase state machine.

#### UX-039: CSS-only cosmetic animation philosophy
**Status:** PARTIAL
**Evidence:** QuickBar.tsx:127 uses `animate-bounce` (CSS keyframe). QuickBar.tsx:120 uses `animate-pulse` (CSS keyframe). QuickBar.tsx:108 uses `active:scale-95 transition-transform` (CSS transition). UndoSystem.tsx toast uses CSS transitions. These are all CSS-only. However: (1) No play log new entry fade-in/slide-down animation found in PlayLogPanel.tsx (searched for "animate|transition|fade|slide" — no matches). (2) No score bug run-scored highlight animation. (3) No lineup row update highlight. Only Quick Bar button press and undo toast have CSS animations.
**Searched:** QuickBar.tsx (lines 108, 120, 127), UndoSystem.tsx (line 55-60), PlayLogPanel.tsx (grep for animation patterns — no matches), FullFenwayScoreboard.tsx (grep for animation patterns — no matches)
**Notes:** Philosophy is correct (CSS-only), but most specified animations from §11.4 are not implemented. Only button press and undo toast exist.

#### UX-040: Undo toast message: "Undone: [inning] [batter] [result]"
**Status:** PARTIAL
**Evidence:** UndoSystem.tsx:141 sets `toastMessage` as `Undone: ${snapshot.playDescription}` (also lines 224, 302). The format is "Undone: [playDescription]" where playDescription is captured at snapshot time. The snapshot description comes from GameTracker.tsx:2866 `undoSystem.captureSnapshot(\`Quick: ${outcome}\`)` — this gives format "Undone: Quick: K" rather than spec's "Undone: T3 Tanaka K". UndoToast component at UndoSystem.tsx:55-60 renders the toast with auto-dismiss after 3 seconds.
**Searched:** UndoSystem.tsx (lines 55-60, 141, 224, 302), GameTracker.tsx (line 2866)
**Notes:** Toast exists with correct "Undone:" prefix. Content format differs — code uses "Quick: [result]" rather than spec's "[inning] [batter] [result]".

#### UX-041: 100% local IndexedDB, no network dependency, auto-save
**Status:** EXISTS
**Evidence:** useGameState.ts:1341-1342 defines `isSaving` and `lastSavedAt` state. Auto-save via `autoSaveTimeoutRef` at useGameState.ts:1344, 3217-3225 (setTimeout-based auto-save after state changes). All persistence is to IndexedDB via `src/utils/trackerDb.ts` shared initializer. No network calls exist in any GameTracker component (searched for "fetch(|axios|http:|https:" in src/src_figma/app/pages/GameTracker.tsx — no matches). Storage layer is 100% IndexedDB.
**Searched:** useGameState.ts (lines 1341-1344, 3217-3225), grep for network calls in GameTracker.tsx (no matches), src/utils/trackerDb.ts
**Notes:** Fully matches spec §12.4. 100% local, IndexedDB-based, auto-save on state changes.

#### UX-042: Resume Game entry points on franchise/elimination home
**Status:** EXISTS
**Evidence:** GameTracker.tsx:1700 `initializeOrLoadGame()` checks for existing game data and restores state from IndexedDB event log. FranchiseHome.tsx has PreGameData flow that navigates to `/game-tracker/franchise-g${gameNumber}` (line 2806). The GameTracker component uses the URL path to identify game ID and load existing events. PostGameSummary.tsx:207 `loadGameData()` also loads from persisted game data.
**Searched:** GameTracker.tsx (line 1700), FranchiseHome.tsx (line 2806), PostGameSummary.tsx (line 207)
**Notes:** Resume functionality works by navigating to the same game URL — events are replayed from IndexedDB. Entry point exists on FranchiseHome.

#### UX-043: Subtle save indicator, no manual save button
**Status:** PARTIAL
**Evidence:** useGameState.ts exports `isSaving` (line 350) and `lastSavedAt` (line 351). GameTracker.tsx destructures `isSaving` at line 399. However, `isSaving` is only used to disable buttons during save operations (e.g., GameTracker.tsx:5638 `disabled={isSaving}`). No visual save indicator (e.g., "Saved" text, checkmark, or timestamp) is rendered in the score bug or anywhere visible. No manual save button exists (correct per spec).
**Searched:** GameTracker.tsx (grep for "isSaving|lastSaved" — used for button disabling only, not display), useGameState.ts (lines 350-351)
**Notes:** No manual save button (correct). But no subtle save indicator is visible to the user either — only button-disabling behavior during saves.

#### UX-044: No batch catch-up mode needed
**Status:** EXISTS
**Evidence:** Searched for "batch.*catch|catch.*up|batch.*import|retroactive" across src/src_figma — no matches. No batch catch-up mode exists. The Quick Bar accepts rapid sequential taps without any batch mode. This matches the spec's intent that no special mode is needed.
**Searched:** grep for batch catch-up patterns in src/src_figma (no matches)
**Notes:** Correct absence. Spec says no special mode needed, and none exists.

#### UX-045: Fielding play type IS a separate enrichment dimension
**Status:** PARTIAL
**Evidence:** EnrichmentPanel.tsx:300-320 renders a "Catch Type / Difficulty" section with `FIELDING_PLAY_TYPE_OPTIONS` from fieldingPlayType.ts. The options are: Routine, Charging, Running, Diving, Leaping, Sliding, Wall Catch, Over Shoulder, Robbed HR, Beat Runner, Beat Throw, Missed Dive, Missed Leap. This conflates spec's Layer A (Fielding Attempt) with Layer D (Modifiers — Beat Runner, Beat Throw). The spec structures this as TWO separate sub-fields: Attempt Type (Routine/Diving/Jumping/Sliding/Charging/Over-the-shoulder/Wall/Robbed HR) + Attempt Outcome (Made/Missed). Code merges them into a single flat list and includes modifiers (Beat Runner/Beat Throw) that the spec places in Layer D.
**Searched:** EnrichmentPanel.tsx (lines 300-320), fieldingPlayType.ts (full file, 126 lines)
**Notes:** Fielding play type IS a separate dimension (correct). But internal structure differs: spec has Attempt Type + Attempt Outcome as two sub-fields; code has a single flat list that mixes attempt types with modifiers and outcomes.

#### UX-046: KP/NUT not on HR/SF/SAC
**Status:** PARTIAL
**Evidence:** EnrichmentPanel.tsx:51-59 defines MODIFIER_OPTIONS including KP and NUT. These modifiers are shown in the enrichment panel (lines 378-397) for all enrichable plays. The gating logic at EnrichmentPanel.tsx:189-195 determines which sections appear: `isHR` (line 190), `isOut` includes SF and SAC (line 191). The modifiers section at line 378 has no result-type gating — it appears for ALL enrichable entries regardless of result type. KP and NUT would be available on HR, SF, and SAC, violating the spec.
**Searched:** EnrichmentPanel.tsx (lines 51-59, 189-195, 378-397)
**Notes:** Modifiers section is unconditionally shown. Spec says KP/NUT are NOT available on HR/SF/SAC. Code does not enforce this restriction.

#### UX-047: TOOTBLAN and Out Advancing are runner-level only
**Status:** PARTIAL
**Evidence:** EnrichmentPanel.tsx:58 includes TOOTBLAN ('TBL') in MODIFIER_OPTIONS — this is play-level, not runner-level. The spec says TOOTBLAN belongs on runner sub-entries (AtBatEvent.runnerOutcomes[] or BetweenPlayEvent), not on play-level enrichment. RunnerOutcomesDisplay.tsx has no TOOTBLAN modifier capability (searched — no matches). HistoricalEventEditor.tsx handles runner events but has no TOOTBLAN toggle. useGameState.ts:4464-4500 has TOOTBLAN fame calculation wired to the runner event recording system (which IS runner-level). The fame system treats it correctly, but the enrichment UI exposes it at the wrong level.
**Searched:** EnrichmentPanel.tsx (line 58), RunnerOutcomesDisplay.tsx (grep for TOOTBLAN — no matches), HistoricalEventEditor.tsx (grep for TOOTBLAN — no matches), useGameState.ts (lines 4464-4500)
**Notes:** TOOTBLAN is exposed as a play-level modifier in EnrichmentPanel (wrong). It should be runner-level per spec §8.1 Layer D.

#### UX-048: K and Ꝁ as separate Quick Bar buttons
**Status:** CONFLICTS
**Evidence:** QuickBar.tsx:37 defines PRIMARY_BUTTONS as `['K', 'GO', 'FO', 'LO', '1B', 'BB', '2B', 'HR']`. There is no 'Ꝁ' or 'Kc' button. Kc appears only in OVERFLOW_BUTTONS (QuickBar.tsx:38: no Kc there either — checked full OVERFLOW list). useGameState.ts:171 defines OutType including 'Kc' but it's handled as a toggle in the play log (PlayLogPanel.tsx has `onKToggle` prop), not as a separate Quick Bar button. The spec says K and Ꝁ should be separate result buttons in the Quick Bar.
**Searched:** QuickBar.tsx (lines 37-38 — PRIMARY_BUTTONS and OVERFLOW_BUTTONS), useGameState.ts (line 171), PlayLogPanel.tsx (onKToggle prop)
**Notes:** Code has single K button with post-hoc K/Kc toggle in play log enrichment. Spec requires K and Ꝁ as separate Quick Bar buttons with Ꝁ displayed as backwards K character.

#### UX-049: ITPHR added to overflow menu
**Status:** MISSING
**Evidence:** QuickBar.tsx:38 OVERFLOW_BUTTONS: `['FLO', 'PO', '3B', 'HBP', 'E', 'FC', 'DP', 'TP', 'SAC', 'SF', 'IBB', 'WP_K', 'PB_K', 'GRD']`. No 'ITPHR' in this list. useGameState.ts OutType at line 171 does not include 'ITPHR'. However, inside-the-park HR logic exists in runnerDefaults.ts:139-143 and game.ts:984 (`INSIDE_PARK_HR: 'Inside-the-Park HR'`), plus detection in detectionFunctions.ts:599-617. The data model supports ITPHR but it is not exposed as a Quick Bar outcome.
**Searched:** QuickBar.tsx (line 38), useGameState.ts (line 171), runnerDefaults.ts (lines 139-143), game.ts (line 984), detectionFunctions.ts (lines 599-617)
**Notes:** ITPHR exists in detection/runner logic but is NOT in the overflow menu. Spec says it should be a distinct result type in overflow.

#### Phase 3 — Updated Earlier Entries

**UX-025 UPDATE (from Phase 2 PARTIAL):**
**Status:** PARTIAL
**Evidence:** EnrichmentPanel.tsx:189-195 gates sections by result: `isHit` (1B/2B/3B/GRD), `isHR`, `isOut` (GO/FO/LO/PO/DP/TP/FC/SF/SAC), `isK` (K/Kc). Field Location shown for hits+outs+HR. Exit Type shown for hits+outs+HR. Fielding Attribution shown for hits+outs. HR Distance shown for HR only. Pitch Type and Pitches in AB shown for all. K/Kc toggle shown for strikeouts. This IS context-sensitive gating per result type. However, the spec's §8.5 result-to-enrichment map is MORE granular (different spray zone counts per result, play mechanic restrictions per result). The code gates at a category level (hit/out/HR/K), not at individual result level (GO vs FO vs LO get different spray zones in spec).
**Searched:** EnrichmentPanel.tsx (lines 189-195, 229-423)

**UX-026 UPDATE (from Phase 2 PARTIAL):**
**Status:** EXISTS
**Evidence:** EnrichmentPanel.tsx does NOT expose the result code as an editable field. The result is displayed as a read-only label in the header (line 214: `{entry.result}`). No onClick handler or editable control exists on the result display. HistoricalEventEditor.tsx:116 shows LockedOutcomeNotice: "Tap undo to change outcome." The result code is locked after commit.
**Searched:** EnrichmentPanel.tsx (line 214), HistoricalEventEditor.tsx (lines 43-48, 116)

**UX-027 UPDATE (from Phase 2 PARTIAL):**
**Status:** CONFLICTS
**Evidence:** Code has "Catch Type / Difficulty" section in EnrichmentPanel.tsx:300-320 using fieldingPlayType.ts options (Routine, Charging, Running, Diving, Leaping, Sliding, Wall Catch, Over Shoulder, Robbed HR, Beat Runner, Beat Throw, Missed Dive, Missed Leap). This is the FIELDING ATTEMPT type, NOT the spec's CONTACT TYPE. The spec's contact type (§8.1 Layer C) is: Normal, Weak, Hard, Bloop, Bunt — describing how the ball came off the bat. The code's EXIT_TYPE_OPTIONS (EnrichmentPanel.tsx:27-33) are: Ground, Line Drive, Fly Ball, Pop Up, Bunt — trajectory-based, not force-based. Neither matches the spec's contact type. The spec says contact type replaces exit type (§13 item 2), but code still uses the old exit type paradigm AND mislabels fielding attempt as "Catch Type."
**Searched:** EnrichmentPanel.tsx (lines 27-33 EXIT_TYPE_OPTIONS, lines 300-320 fieldingPlayType), fieldingPlayType.ts (full file)

### Phase 4 — Runner Outcomes, Subs, Audio, Edge Cases (UX-050 through UX-058)

#### UX-050: Runner outcomes on AtBatEvent as runnerOutcomes[] array
**Status:** EXISTS
**Evidence:** eventLog.ts:302-307 defines `runnerOutcomes?: Array<{ runnerId: string; runnerName: string; fromBase: 'first' | 'second' | 'third'; toBase: 'second' | 'third' | 'home' | 'out'; }>` on the AtBatEvent interface. useGameState.ts:765 also uses `runnerOutcomes: { first: RunnerOutcome | null; second: RunnerOutcome | null; third: RunnerOutcome | null }` for the internal game state representation. The data flows from RunnerOutcomesDisplay.tsx (user adjusts defaults) through `commitPlateAppearance()` to the persisted AtBatEvent. Both the data model and the storage path exist.
**Searched:** eventLog.ts (lines 302-307), useGameState.ts (lines 765-777, 3379-3399), RunnerOutcomesDisplay.tsx (full file)
**Notes:** The array structure exists on AtBatEvent. However, the persisted array lacks enrichment sub-fields per runner (fielding sequence, play mechanic, TOOTBLAN, Out Advancing) that the spec's §8.6 requires for independent runner-level enrichment.

#### UX-051: Runner sub-entries visible in play log under each at-bat
**Status:** MISSING
**Evidence:** PlayLogPanel.tsx (191 lines) has no runner sub-entry rendering. PlayLogEntry type (playLogTypes.ts:27-50) is a flat structure — no children, sub-entries, or nested runner arrays. Searched PlayLogPanel.tsx for "runner", "sub-entry", "nested", "child", "└" — no matches. Between-play runner events (SB, CS, pickoff) appear as standalone entries, not nested under the parent at-bat.
**Searched:** PlayLogPanel.tsx (full file — no runner sub-entry patterns), playLogTypes.ts (lines 27-50 — flat PlayLogEntry type)
**Notes:** Spec §7.2 shows runner sub-entries indented under the at-bat entry with "└" prefix (e.g., "└ Tanaka 2B→3B [+fld]"). This does not exist. Runner outcomes are only visible during the runner correction phase before commit, not in the play log after commit.

#### UX-052: Play log is the ONE enrichment surface — player card initiates only
**Status:** PARTIAL
**Evidence:** EnrichmentPanel.tsx opens when tapping a play log entry (GameTracker.tsx renders EnrichmentPanel for selected play log entries). PlayerCardModal (GameTracker.tsx:6380-6672) does NOT have enrichment fields — it has stats and mojo/fitness editing only. However: (1) the MiniDiamond spray chart is inside EnrichmentPanel itself (line 82-103), not on the play log entry inline as spec §7.3 describes. (2) The player card does NOT "initiate events" per the spec's model — it edits mojo/fitness inline rather than initiating through a flow that goes to the play log. (3) Fielding sequence enrichment is available in EnrichmentPanel (correct — happens through play log tap), but the spec also describes a defensive lineup enrichment mode (§5.4) which doesn't exist.
**Searched:** EnrichmentPanel.tsx (full file), GameTracker.tsx (PlayerCardModal at lines 6380-6672)
**Notes:** Play log IS the primary enrichment surface (correct). But the player-card-initiates model is incomplete — player card should initiate subs/steals/etc. which then appear in the play log for enrichment.

#### UX-053: BetweenPlayEvents auto-snapshot current pitcher/catcher
**Status:** PARTIAL
**Evidence:** useGameState.ts:4583-4591 shows `runnerAttribution` on a stolen base event auto-assigns `pitcherId: details?.pitcherId || gameState.currentPitcherId` and `catcherId: details?.catcherId`. The pitcher auto-assignment from gameState works. However, catcher is NOT auto-assigned — `catcherId` defaults to `details?.catcherId` which is undefined unless explicitly passed. There is no gameState.currentCatcherId field to auto-snapshot from. The pitcher auto-snapshots; the catcher does not.
**Searched:** useGameState.ts (lines 4583-4591, 4610-4620), grep for "currentCatcherId" in useGameState.ts (no matches)
**Notes:** Pitcher auto-snapshots from gameState (correct). Catcher does NOT auto-snapshot — there is no currentCatcherId in game state. Spec §8.7 says both pitcher and catcher should auto-assign.

#### UX-054: Retro 8-bit audio with two toggles (game sounds + beat reporter)
**Status:** MISSING
**Evidence:** Searched for "audio", "sound", "Audio", "beep", "chime", "fanfare", "8-bit" across src/src_figma — no matches. No audio system exists. No sound effect files, no audio playback code, no audio toggle controls. Spec §11.5 defines game sounds (Quick Bar tap click, run scores chime, HR fanfare, strikeout tone, half-inning whistle, undo bloop, start/end game jingle) and ambient sounds (beat reporter typewriter). None are implemented.
**Searched:** grep for audio/sound patterns in src/src_figma (no matches)
**Notes:** Complete absence. No audio infrastructure exists.

#### UX-055: Runner outcomes locked past undo depth in V1
**Status:** MISSING
**Evidence:** Searched for "locked beyond undo", "undo depth", "beyond undo", "structural lock" across src/src_figma — no matches. The undo system (UndoSystem.tsx) has a 10-step stack (GameTracker.tsx:733 `maxSteps: 10`), but there is no enforcement of structural outcome locking beyond the undo depth. HistoricalEventEditor.tsx shows LockedOutcomeNotice ("Tap undo to change outcome") for runner events (line 116), but this applies to ALL historical events, not specifically to events beyond undo depth. No distinction is made between "within undo depth" (full correction) and "beyond undo depth" (structural locked, enrichment editable).
**Searched:** grep for undo depth/lock patterns in src/src_figma (no matches), UndoSystem.tsx (maxSteps), HistoricalEventEditor.tsx (line 116)
**Notes:** Spec §12.3 requires two tiers: within undo depth = full correction, beyond = structural locked but enrichment editable forever. Code applies a blanket "outcomes locked" to all historical events.

#### UX-056: Subtle "Use ↩ Undo to change result" tooltip on locked results
**Status:** PARTIAL
**Evidence:** HistoricalEventEditor.tsx:43-48 renders `LockedOutcomeNotice` with text "Tap undo to change outcome." This appears for runner events (line 116) and injury rows. However: (1) The text says "Tap undo" not "Use ↩ Undo to change result" as spec requires. (2) It's a notice panel, not a tooltip triggered by tapping the locked result field. (3) It appears only in the historical event editor, not inline in the play log when a user taps a locked result. The spec describes tapping the locked result field in the play log entry, which shows a subtle tooltip.
**Searched:** HistoricalEventEditor.tsx (lines 43-48, 116), grep for "Use.*Undo|tooltip.*result" in src/src_figma (no matches in component code)
**Notes:** Partial match — locked notice exists but wrong text, wrong trigger mechanism, wrong location.

#### UX-057: Contact type (5 options) replaces exit type
**Status:** CONFLICTS
**Evidence:** EnrichmentPanel.tsx:27-33 defines EXIT_TYPE_OPTIONS as: Ground, Line Drive, Fly Ball, Pop Up, Bunt. These are trajectory-based categories (how the ball traveled). Spec §8.1 Layer C defines CONTACT TYPE as: Normal, Weak, Hard, Bloop, Bunt — force-based categories (how the ball came off the bat). The label in EnrichmentPanel.tsx:253 is "Exit Type", not "Contact Type". The options are completely different (only "Bunt" overlaps). The spec explicitly says "Contact type replaces exit type" (§13 item 2) and "Renamed from 'exit type' across the spec" (§8.1 Layer C header). Code has not made this rename or option change.
**Searched:** EnrichmentPanel.tsx (lines 27-33, 253), spec §8.1 Layer C, spec §13 item 2
**Notes:** Code uses old exit type paradigm. Spec requires new contact type paradigm with completely different options.

#### UX-058: Same enrichment mode for AtBatEvent and BetweenPlayEvent sequences
**Status:** PARTIAL
**Evidence:** EnrichmentPanel.tsx is the primary enrichment surface for at-bat events. HistoricalEventEditor.tsx handles between-play events (runner events, substitutions, pitcher changes, mojo/fitness, manager moments, pitch counts). These are TWO DIFFERENT components with different field layouts and capabilities. EnrichmentPanel has spray chart, exit type, fielding sequence, pitch type, pitch count, modifiers, K/Kc toggle. HistoricalEventEditor has attribution editing (pitcher, catcher, fielder selectors), position editing, and read-only field displays. Searched for "enrichment mode same", "same enrichment", "BetweenPlayEvent enrichment" — no matches indicating unified treatment.
**Searched:** EnrichmentPanel.tsx (full file), HistoricalEventEditor.tsx (full file), grep for unified enrichment patterns (no matches)
**Notes:** Spec §8.3 says fielding sequence entry "works identically for AtBatEvent fielding and BetweenPlayEvent throw sequences" (Q49). In practice, EnrichmentPanel has FieldingSequenceInput; HistoricalEventEditor has attribution dropdowns. The enrichment experience is not unified.

---

## Phase 5 — Self-Verification

- **Entry count:** 58 (UX-001 through UX-058) — all present, verified via `grep -c "^#### UX-"`
- **Status field:** 61 total (58 main + 3 Phase 3 updates) — all present
- **Evidence field:** 61 total — all present
- **Searched field:** 61 total — all present
- **Weasel words:** 0 found (searched: "should work", "appears to", "seems like", "probably", "might be", "likely", "I think", "I believe")
- **Updated entries reconciled:** UX-025 (PARTIAL→PARTIAL), UX-026 (PARTIAL→EXISTS), UX-027 (PARTIAL→CONFLICTS)
- **Summary math verified:** 2 N/A + 8 EXISTS + 22 PARTIAL + 16 CONFLICTS + 9 MISSING + 1 UNVERIFIED = 58

## Phase 6 — Spot-Check Anchors

| # | Decision | Expected Answer | Audit Status | File:Line Proof | Pass? |
|---|----------|----------------|-------------|-----------------|-------|
| 1 | UX-004 Diamond removed | CONFLICTS | CONFLICTS | GameTracker.tsx:19 import, :4735 render | YES |
| 2 | UX-003 4-column layout | CONFLICTS | CONFLICTS | GameTracker.tsx:4645 gridTemplateColumns 3-col | YES |
| 3 | UX-048 K/Ꝁ separate | CONFLICTS | CONFLICTS | QuickBar.tsx:20 PRIMARY_BUTTONS no Ꝁ | YES |
| 4 | UX-049 ITPHR overflow | MISSING | MISSING | QuickBar.tsx:23 OVERFLOW_BUTTONS no ITPHR | YES |
| 5 | UX-012 Overflow grid | EXISTS | EXISTS | QuickBar.tsx:152 grid grid-cols-5 | YES |
| 6 | UX-041 IndexedDB local | EXISTS | EXISTS | 0 network calls in GameTracker.tsx | YES |
| 7 | UX-054 Audio system | MISSING | MISSING | 0 audio/sound matches in src/src_figma | YES |
| 8 | UX-057 Contact type | CONFLICTS | CONFLICTS | EnrichmentPanel.tsx:27 EXIT_TYPE_OPTIONS | YES |

**Result: 8/8 spot-checks pass.**
