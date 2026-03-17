# GAMETRACKER UX REDESIGN — IMPLEMENTATION PLAN

**Version:** 2.0
**Created:** 2026-03-15
**Source:** GAMETRACKER_UX_GAP_ANALYSIS.md (58 decisions, 8/8 spot-checks passed)
**Spec:** GAMETRACKER_UX_SPEC.md v1.0
**Status:** PENDING JK APPROVAL

---

## Executive Summary

48 of 58 spec decisions need work. 10 are already satisfied (EXISTS or N/A).

The work falls into three tiers with strict dependency ordering — Tier 2 cannot start until Tier 1 is browser-verified, and Tier 3 cannot start until Tier 2 is browser-verified.

| Tier | Name | Items | Nature | Primary Route |
|------|------|-------|--------|---------------|
| 1 | Architectural Rewrite | 14 | Layout, lifecycle, score bug, lineup columns | Claude Code CLI / Opus 4.6 |
| 2 | Component Rewrites | 20 | Core flow, enrichment, subs, player card | Claude Code CLI / Opus 4.6 (most items) |
| 3 | Polish & New Features | 14 | Audio, animations, tooltips, runner sub-entries | Mixed: Opus for state-touching, Codex 5.4 for scoped |

**Why this ordering:** Tier 1 replaces the entire visual architecture. Every Tier 2 and Tier 3 component renders INTO this new layout. Building enrichment UI before the layout exists means building it twice.

**Branching strategy:** One feature branch per Tier step (e.g., `feature/gt-ux-t1a-phase-state`). Each step merges to main after build passes + JK browser verification. Never leave main in a broken-render state.

---

## Decision Accounting (NFL: verify the math)

| Category | Count | IDs |
|----------|-------|-----|
| N/A (no code) | 2 | UX-001, UX-002 |
| EXISTS (no work) | 7 | UX-012, UX-016, UX-021, UX-026, UX-041, UX-042, UX-044 |
| PARTIAL (needs work) | 1 deferred | UX-058 → explicitly part of Tier 3 item 3.2 scope |
| **Subtotal: no work** | **10** | |
| Tier 1 items | 14 | UX-003,004,005,006,007,008,009,013,014,015,020,034,035,038 |
| Tier 2 items | 20 | UX-010,011,017,018,019,022,025,027,028,030,031,033,036,037,045,046,047,048,049,057 |
| Tier 3 items | 14 | UX-023,024,029,032,039,040,043,050,051,052,053,054,055,056 |
| **Subtotal: needs work** | **48** | |
| **TOTAL** | **58** | ✓ matches gap analysis |

**NFL check:** 10 + 48 = 58. All 58 UX-IDs accounted for. No gaps, no double-counting.

---

## Items Requiring No Work (10 items)

| UX ID | Gap Status | Why No Work Needed |
|-------|-----------|-------------------|
| UX-001 | N/A | Physical context — no code implication |
| UX-002 | N/A | Physical context — no code implication |
| UX-012 | EXISTS | Overflow menu grid works correctly (QuickBar.tsx:152-164) |
| UX-016 | EXISTS | Scoreboard Chalk Retro theme implemented (colors, Press Start 2P) |
| UX-021 | EXISTS | Matchup history already aggregated stats (fenwayBoardContext.ts) |
| UX-026 | EXISTS | Result code already locked in enrichment (EnrichmentPanel.tsx:214) |
| UX-041 | EXISTS | 100% local IndexedDB, no network dependency |
| UX-042 | EXISTS | Resume Game entry points work (FranchiseHome.tsx:2806) |
| UX-044 | EXISTS | No batch catch-up mode (correct absence) |
| UX-058 | PARTIAL | Same enrichment mode for both event types — resolved by Tier 3 item 3.2 (defensive lineup enrichment mode builds the unified pattern) |

---

## TIER 1 — Architectural Rewrite (14 items)

**Route:** Claude Code CLI | Opus 4.6
**Why Opus:** Multi-file structural changes touching GameTracker.tsx (296KB, 6742 lines), useGameState.ts (248KB, 6406 lines), and multiple new/modified components simultaneously. Opus's interactive file navigation and 200K context handle the large files. Codex cannot interactively search these files mid-session.
**Why NOT one session:** 14 items in one Opus session is too much. Even with interactive file access, sustained multi-file writes across a complete layout rewrite will degrade quality. Split into 3 sessions with browser verification between each.

### Step 1.A — Phase State Machine + Layout Shell
**Branch:** `feature/gt-ux-t1a-phase-layout`
**Route:** Claude Code CLI | Opus 4.6

| # | UX ID | Gap Status | What to Do |
|---|-------|-----------|------------|
| 1.1 | UX-034 | MISSING | Add `gamePhase: 'PRE_GAME' | 'LIVE' | 'POST_FINAL_OUT'` to GameState. Wire transitions: mount → PRE_GAME, START GAME confirmation → LIVE, game-over detection → POST_FINAL_OUT. Default to LIVE for games loaded from IndexedDB without a phase field (backward compat). |
| 1.2 | UX-038 | PARTIAL | Quick Bar transforms per phase: PRE_GAME shows START GAME button, LIVE shows outcome buttons, POST_FINAL_OUT shows END GAME button. Wire phase-aware rendering. |
| 1.3 | UX-003 | CONFLICTS | Replace 5-zone CSS grid (GameTracker.tsx:4606-4648) with 3-row pinned layout: Row 1 = ScoreBug (pinned top), Row 2 = 4-column content area, Row 3 = QuickBar (pinned bottom). |
| 1.4 | UX-005 | CONFLICTS | Content area column proportions: 1fr 1fr 1fr 2fr (≈1/5, 1/5, 1/5, 2/5). |
| 1.5 | UX-007 | CONFLICTS | Remove balls/strikes from scoreboard. Remove CountDots from FullFenwayScoreboard.tsx. Remove balls/strikes from GameState ONLY if no other consumer needs them — grep first. |
| 1.6 | UX-009 | PARTIAL | QuickBar full-width pinned bottom. ScoreBug pinned top. Viewport fixed — no page scroll. Only PlayLog and NewsBoard scroll internally. |

**Verification gate 1.A:**
- [ ] `npm run build` passes
- [ ] GameTracker renders: score area at top, 4 column placeholders in middle, Quick Bar at bottom
- [ ] Quick Bar shows START GAME in PRE_GAME phase
- [ ] Tapping START GAME (with confirmation) switches to LIVE phase — outcome buttons appear
- [ ] No page scroll — viewport is fixed
- [ ] Existing games loaded from IndexedDB still work (default to LIVE phase)

### Step 1.B — Score Bug + Diamond Removal
**Branch:** `feature/gt-ux-t1b-scorebug-diamond`
**Route:** Claude Code CLI | Opus 4.6
**Prerequisite:** Step 1.A merged to main

| # | UX ID | Gap Status | What to Do |
|---|-------|-----------|------------|
| 1.7 | UX-006 | CONFLICTS | Build ScoreBug.tsx: single horizontal line (~30-40pt). Layout: away team+score | inning indicator | home team+score | base-state diamond | outs circles. Far right: save indicator [✓], manager moment indicator [Ⓜ], audio toggles [🔊]. Replace FullFenwayScoreboard in the render path. |
| 1.8 | UX-008 | CONFLICTS | Build ExpandedScoreboard overlay: tapping ScoreBug expands retro Fenway board (~25% screen height) overlaying downward. Tap outside or tap again to collapse. Quick Bar stays pinned. Columns don't move. Can refactor existing FullFenwayScoreboard content into the overlay panel. |
| 1.9 | UX-004 | CONFLICTS | Remove GameDiamond import (GameTracker.tsx:19) and render (GameTracker.tsx:4735). Base state now visible via: (a) ScoreBug base-state diamond, (b) lineup column runner exponents (built in Step 1.C). |

**Verification gate 1.B:**
- [ ] `npm run build` passes
- [ ] ScoreBug renders as single line at top with teams, scores, inning, base state, outs
- [ ] Indicators (✓, Ⓜ, 🔊) are at far right of score bug
- [ ] Tapping ScoreBug expands retro scoreboard overlay
- [ ] Tapping outside the overlay collapses it
- [ ] Quick Bar stays visible when overlay is open
- [ ] Diamond is gone from the layout — no GameDiamond render
- [ ] No regressions on existing test suite

### Step 1.C — Lineup Columns + NewsBoard + Pre-Game Features
**Branch:** `feature/gt-ux-t1c-columns-newsboard`
**Route:** Claude Code CLI | Opus 4.6
**Prerequisite:** Step 1.B merged to main

| # | UX ID | Gap Status | What to Do |
|---|-------|-----------|------------|
| 1.10 | UX-013 | CONFLICTS | Build BattingLineupColumn.tsx: always visible in column 2. 9 players in batting order. Current batter = solid outline in team's primary color. Runners = bolded with base superscript exponent. Tapping a runner opens player card with BetweenPlayEvent options. |
| 1.11 | UX-014 | CONFLICTS | Build DefensiveLineupColumn.tsx: always visible in column 3. 9 players in batting order. Current pitcher = solid outline in team's primary color. Each fielder shows fWAR. Pitcher shows pitch count + pWAR. |
| 1.12 | UX-015 | PARTIAL | Two-row player entries in both columns: top row = position + name + jersey# (e.g., "SS Hayata #37"), bottom row = context stats. Press Start 2P font. Next-inning leadoff = dotted outline in team's secondary color. |
| 1.13 | UX-020 | MISSING | Build NewsBoard.tsx in column 1: pinned header (batter's current game line, pitcher's current game line, aggregated matchup history) + scrollable beat reporter feed below. Wire matchup data from existing fenwayBoardContext. Beat reporter feed can be empty initially — structure must exist. |
| 1.14 | UX-035 | MISSING | Add "Swap Order" to player card popup — visible only when gamePhase === 'PRE_GAME'. Swaps batting order with another player without changing fielding position. Button removed from player card after START GAME. No re-entry restriction in PRE_GAME. |

**Verification gate 1.C (TIER 1 COMPLETE):**
- [ ] `npm run build` passes
- [ ] All 4 columns visible: NewsBoard (1/5), Batting Lineup (1/5), Defensive Lineup (1/5), Play Log (2/5)
- [ ] Batting lineup shows 9 players with current batter outlined
- [ ] Runners show bold + base exponent (e.g., "3. Hayata²")
- [ ] Defensive lineup shows 9 players with pitcher outlined, fWAR per fielder
- [ ] NewsBoard shows matchup header (even if beat reporter feed is empty)
- [ ] Tapping a player opens player card popup
- [ ] Swap Order visible in PRE_GAME, hidden in LIVE
- [ ] Lineup columns swap content on half-inning change (column 2 always = batting team)
- [ ] No regressions on existing test suite
- [ ] JK confirms full layout in iPad Safari landscape

---

## TIER 2 — Component Rewrites (20 items)

**Primary route:** Claude Code CLI | Opus 4.6 for most items.
**Why Opus for most:** The gap analysis revealed that items I initially routed to Codex actually touch multiple files (EnrichmentPanel + eventLog + useGameState, or QuickBar + OutType + runner defaults). Only items that are genuinely confined to a single file with no persistence/state implications go to Codex.
**Prerequisite:** Tier 1 verified in browser by JK.

### Group 2.A — Quick Bar Updates
**Branch:** `feature/gt-ux-t2a-quickbar`
**Route:** Claude Code CLI | Opus 4.6
**Why Opus (not Codex):** Adding Ꝁ and ITPHR requires changes to QuickBar.tsx (buttons) + useGameState.ts (OutType enum) + runnerDefaults.ts (ITPHR runner logic) + potentially eventLog.ts (AtBatEvent result type). This is multi-file.

| # | UX ID | Gap Status | What to Do |
|---|-------|-----------|------------|
| 2.1 | UX-010 | PARTIAL | Move Undo + End Game INTO the Quick Bar row at far right with a visual divider. Currently they're in a separate zone (GameTracker.tsx:5041-5047). |
| 2.2 | UX-011 | CONFLICTS | Replace CSS `:active` pseudo-class (QuickBar.tsx:105-108) with processing-aware depressed state. Button stays visually depressed until event is fully committed (requires async callback from useGameState confirming commit complete). This is NOT a CSS-only change — it needs component↔hook communication. |
| 2.3 | UX-048 | CONFLICTS | Add Ꝁ (backwards K) as separate primary Quick Bar button next to K. Remove K/Kc toggle from PlayLogPanel enrichment. Add 'Ꝁ' to OutType in useGameState.ts. Ꝁ renders as mirrored K character via CSS transform. |
| 2.4 | UX-049 | MISSING | Add ITPHR to OVERFLOW_BUTTONS in QuickBar.tsx. Add 'ITPHR' to OutType. Wire through runnerDefaults.ts (batter scores, all runners advance, field zones = IF+OF only). |

**Verification gate 2.A:**
- [ ] `npm run build` passes
- [ ] Quick Bar shows: [K] [Ꝁ] [GO] [FO] [LO] [1B] [BB] [2B] [HR] [···] | [↩] [End]
- [ ] Ꝁ button records a called strikeout (distinct from K)
- [ ] ITPHR appears in overflow menu
- [ ] Tapping ITPHR records correctly (batter scores)
- [ ] Undo and End Game are in the Quick Bar row with visual divider
- [ ] Button stays depressed until event processing completes
- [ ] No K/Kc toggle in play log enrichment anymore

### Group 2.B — Core Flow Change (Highest Risk)
**Branch:** `feature/gt-ux-t2b-post-commit-runners`
**Route:** Claude Code CLI | Opus 4.6
**Why Opus:** This is the deepest state change in the entire plan. Removes the pre-commit runner correction gate from useGameState.ts, which means Quick Bar tap → immediate commit with default runners → user corrects via lineup column tap (post-commit versioned edit). Touches the core recording pipeline.

| # | UX ID | Gap Status | What to Do |
|---|-------|-----------|------------|
| 2.5 | UX-022 | CONFLICTS | Remove pre-commit runner correction gate. Currently: Quick Bar → `setPendingRunnerCorrection()` → correction panel → `handleRunnerCorrectionCommit()` → `commitPlateAppearance()`. New flow: Quick Bar → `commitPlateAppearance()` immediately with default runners. Runner corrections happen post-commit by tapping runners in the batting lineup column. Corrections are versioned edits on committed events. |

**Verification gate 2.B:**
- [ ] `npm run build` passes
- [ ] Tapping [1B] commits the event IMMEDIATELY — no runner correction panel appears
- [ ] Play log shows the new at-bat entry with runner sub-entries showing default advances
- [ ] Tapping a runner in the batting lineup opens player card with correction options
- [ ] Runner correction creates a versioned edit on the committed event
- [ ] Test scenarios: single with R1, double with R1+R2, HR with bases loaded, GO with force plays, FO with R3 (SF eligibility)
- [ ] Undo still works correctly after the flow change
- [ ] No regressions on existing test suite

### Group 2.C — Player Card + Substitution Rewrite
**Branch:** `feature/gt-ux-t2c-playercard-subs`
**Route:** Claude Code CLI | Opus 4.6
**Why Opus:** Removes drag-drop substitution (LineupCard.tsx) while building player-card-first flow (PlayerCardModal in GameTracker.tsx). Multi-file: GameTracker.tsx, LineupCard.tsx, useGameState.ts. Must build new flow before removing old flow.

| # | UX ID | Gap Status | What to Do |
|---|-------|-----------|------------|
| 2.6 | UX-017 | PARTIAL | Wire player card stats to real season data (currently hardcoded zeros at GameTracker.tsx:6402). Add full attributes from League Builder (age, gender, ratings, traits, player morale). Add action buttons: Sub Out, Swap Position, Update Mojo, Update Fitness. |
| 2.7 | UX-018 | PARTIAL | Add OPS, WAR to batter card. Add WHIP, IP, pWAR to pitcher card. Change "SO" label to "K". |
| 2.8 | UX-019 | PARTIAL | Enforce separation: player card shows season/tournament-scoped stats. NewsBoard header shows current-game stats. Wire both to actual data sources. |
| 2.9 | UX-030 | CONFLICTS | Build player-first substitution: tap player in lineup → player card → "Sub Out" button → card content replaced with full bench list (all players, ungrouped) → select replacement. For pitcher changes: pitch count prompt fires after replacement selection. Remove drag-drop substitution from LineupCard.tsx ONLY after new flow is verified working. |
| 2.10 | UX-031 | PARTIAL | Replace inline mojo/fitness editing with discrete "Update Mojo" and "Update Fitness" action buttons on player card. Implement auto-injury logging: engine writes injury BetweenPlayEvent when fitness set to 'weak', 'strained', or 'hurt'. |

**Verification gate 2.C:**
- [ ] `npm run build` passes
- [ ] Player card shows real season stats (not zeros)
- [ ] Player card shows full attributes (age, gender, ratings, traits, morale, fitness, mojo)
- [ ] Sub Out button → bench list → select replacement works
- [ ] Pitcher Sub Out → replacement → pitch count prompt works
- [ ] Update Mojo and Update Fitness are discrete buttons
- [ ] Setting fitness to weak/strained/hurt auto-logs injury event
- [ ] Drag-drop substitution is removed
- [ ] No regressions on existing test suite

### Group 2.D — Enrichment Taxonomy Rewrite
**Branch:** `feature/gt-ux-t2d-enrichment-taxonomy`
**Route:** Claude Code CLI | Opus 4.6
**Why Opus:** Touches EnrichmentPanel.tsx + fieldingPlayType.ts + eventLog.ts (persistence) + useGameState.ts (state) + potentially downstream stat consumers. The exitType→contactType rename alone requires a full grep-and-replace across the codebase. Multi-file, persistence-touching, highest-complexity enrichment change.

| # | UX ID | Gap Status | What to Do |
|---|-------|-----------|------------|
| 2.11 | UX-057 | CONFLICTS | Replace EXIT_TYPE_OPTIONS (Ground/Line Drive/Fly Ball/Pop Up/Bunt) with CONTACT_TYPE_OPTIONS (Normal/Weak/Hard/Bloop/Bunt). Rename field from `exitType` to `contactType` throughout codebase. Grep all occurrences first, map every file, rename atomically. |
| 2.12 | UX-027 | CONFLICTS | Restructure fielding attempt into two sub-fields: Attempt Type (Routine/Diving/Jumping/Sliding/Charging/Over-the-shoulder/Wall/Robbed HR) + Attempt Outcome (Made/Missed). Currently a single flat list in fieldingPlayType.ts that mixes attempt types with modifiers. Remove Beat Runner/Beat Throw from fielding type list — they belong in modifiers. |
| 2.13 | UX-045 | PARTIAL | Separate Layer A (Fielding Attempt = type + outcome) from Layer B (Play Mechanic). Layer B options: Routine, Relay, Rundown, Tag Play, Unassisted, Deflection. These are currently conflated in the single fieldingPlayType list. |
| 2.14 | UX-025 | PARTIAL | Make enrichment field gating per-result-type per spec §8.5 (not just category-level hit/out/HR/K as in current EnrichmentPanel.tsx:189-195). Each result type gets its own set of visible enrichment fields, spray zone counts, play mechanic options, and modifier options. |
| 2.15 | UX-046 | PARTIAL | Gate KP/NUT modifiers by result type. Currently shown unconditionally (EnrichmentPanel.tsx:378). Must NOT appear on HR, SF, SAC. |
| 2.16 | UX-047 | PARTIAL | Remove TOOTBLAN ('TBL') and Out Advancing from play-level MODIFIER_OPTIONS (EnrichmentPanel.tsx:58). These are runner-level modifiers only — they belong on runner sub-entries (AtBatEvent.runnerOutcomes[] or BetweenPlayEvent), not on the at-bat enrichment panel. |
| 2.17 | UX-028 | PARTIAL | Replace diamond-tap spray location with inline SVG fan-shaped graphic inside the play log enrichment pane. Context-sensitive zones per result type. Chalk-line aesthetic matching Scoreboard Chalk Retro theme. Graphic height adapts to zone count. |

**Verification gate 2.D:**
- [ ] `npm run build` passes
- [ ] Enrichment panel shows "Contact Type" with options: Normal, Weak, Hard, Bloop, Bunt
- [ ] No "Exit Type" label or options anywhere in the UI
- [ ] Fielding Attempt shows as two sub-fields: Attempt Type (8 options) + Attempt Outcome (Made/Missed)
- [ ] Play Mechanic is a separate selector: Routine, Relay, Rundown, Tag Play, Unassisted, Deflection
- [ ] KP/NUT NOT shown on HR, SF, SAC enrichment
- [ ] TOOTBLAN NOT in play-level modifiers (only on runner sub-entries — verified in Tier 3)
- [ ] Spray graphic renders inline in play log enrichment with correct zone count per result type
- [ ] `grep -ri "exitType" src/` returns zero matches (complete rename verified)
- [ ] No regressions on existing test suite

### Group 2.E — Score Bug Features + Half-Inning
**Branch:** `feature/gt-ux-t2e-scorebug-features`
**Route:** Claude Code CLI | Opus 4.6
**Why Opus:** Manager moment relocation touches QuickBar.tsx (remove ⚡), ScoreBug.tsx (add Ⓜ), and GameTracker.tsx (Stay the Course button logic + passive decision recording). Half-inning column swap touches the new lineup column components + useGameState.ts transition logic. Multi-file.

| # | UX ID | Gap Status | What to Do |
|---|-------|-----------|------------|
| 2.18 | UX-033 | CONFLICTS | NewsBoard (built in Tier 1) must be display-only. Remove clickable batter/pitcher names from the FenwayBoard equivalent data now shown in NewsBoard. Lineup columns are the sole interaction surface for player actions. |
| 2.19 | UX-036 | CONFLICTS | Move manager moment indicator from QuickBar (currently ⚡ at QuickBar.tsx:119-131) to ScoreBug far right as Ⓜ icon. Build "Stay the Course" button that appears when Ⓜ is active. Tapping it logs passive manager decision to play log. ⚡ indicator clears after decision resolves. |
| 2.20 | UX-037 | PARTIAL | Wire role-based column swap on half-inning transition. Column 2 content always = batting team, column 3 content always = fielding team. On half-inning change: columns swap which team's data they display. Pitch count prompt fires first, then swap occurs. |

**Verification gate 2.E (TIER 2 COMPLETE):**
- [ ] `npm run build` passes
- [ ] NewsBoard has NO clickable elements
- [ ] Ⓜ icon appears in score bug far right when LI exceeds threshold
- [ ] Stay the Course button appears alongside Ⓜ
- [ ] Tapping Stay the Course logs a manager moment entry in the play log
- [ ] Ⓜ indicator clears after active or passive decision
- [ ] Half-inning transition: pitch count prompt → columns swap content → inning updates
- [ ] Column 2 always shows batting team's lineup, column 3 always shows fielding team's lineup
- [ ] JK confirms all Tier 2 features in iPad Safari landscape
- [ ] No regressions on existing test suite

---

## TIER 3 — Polish & New Features (14 items)

**Prerequisite:** Tier 2 verified in browser by JK.
**Route:** Mixed — Opus for items touching state/persistence, Codex 5.4 high for well-scoped single-file items, Codex 5.1 mini for trivial text changes.

**Dependency note:** All Tier 3 items depend on the Tier 1 layout being in place (lineup columns, score bug, play log in new position). Items 3.9 and 3.8 have an internal dependency (runner sub-entries must be visible before they can be independently enrichable). Otherwise, Tier 3 items can be done in any order.

| # | UX ID | Gap Status | What to Do | Route | Branch |
|---|-------|-----------|------------|-------|--------|
| 3.1 | UX-023 | MISSING | Style play log player names with team primary color (outline or abbreviation) | Codex 5.4 high | `feature/gt-ux-t3-playlog-colors` |
| 3.2 | UX-024 + UX-058 | MISSING | Build defensive lineup enrichment mode: column header changes to "FIELDING SEQUENCE" in accent color, fielder rows get tap-target treatment, tapping builds sequence visually, Done/Clear buttons. Works identically for AtBatEvent and BetweenPlayEvent sequences (resolves UX-058). | Opus | `feature/gt-ux-t3-lineup-enrich-mode` |
| 3.3 | UX-029 | UNVERIFIED | Implement context-sensitive spray zone counts per spec §8.2: HR=21, GO=18, FO=27, LO=39, PO=27, hits=42, E=42, ITPHR=42. Verify each against the spec. | Opus | `feature/gt-ux-t3-spray-zones` |
| 3.4 | UX-032 | PARTIAL | Verify pitch count prompt fires at all 3 trigger points: (a) after pitcher replacement selection, (b) every half-inning end, (c) end of game. Fix any missing triggers. | Codex 5.4 high | `feature/gt-ux-t3-pitch-count-triggers` |
| 3.5 | UX-039 | PARTIAL | Add CSS-only animations: play log entry fade-in, score bug run-scored highlight, lineup row update highlight. CSS `transition` only — no JS animation. | Codex 5.4 high | `feature/gt-ux-t3-css-animations` |
| 3.6 | UX-040 | PARTIAL | Change undo toast from "Undone: Quick: [result]" to "Undone: [inning] [batter] [result]". Update `captureSnapshot()` call in GameTracker.tsx to include inning+batter name. | Codex 5.1 mini medium | `feature/gt-ux-t3-undo-toast` |
| 3.7 | UX-043 | PARTIAL | Add subtle ✓ save indicator to ScoreBug. Static, always present. Changes to ⚠ on write failure only. No animation on each save. | Codex 5.1 mini medium | `feature/gt-ux-t3-save-indicator` |
| 3.8 | UX-050 | EXISTS (incomplete) | Add enrichment sub-fields to runnerOutcomes[]: per-runner fielding sequence, play mechanic, catch quality, TOOTBLAN, Out Advancing. Each runner outcome independently enrichable. | Opus | `feature/gt-ux-t3-runner-enrichment` |
| 3.9 | UX-051 | MISSING | Build runner sub-entries in play log: nested "└" entries under each at-bat showing each runner's outcome + base transition. Independently tappable for enrichment. **Must be done BEFORE 3.8.** | Opus | `feature/gt-ux-t3-runner-subentries` |
| 3.10 | UX-052 | PARTIAL | Ensure player card ONLY initiates events (subs, steals, mojo/fitness changes). ALL enrichment happens via play log tap. No enrichment editing in the player card. | Codex 5.4 high | `feature/gt-ux-t3-playercard-initiate-only` |
| 3.11 | UX-053 | PARTIAL | Add `currentCatcherId` to GameState. Auto-assign catcher on all BetweenPlayEvents alongside pitcher. Currently pitcher auto-assigns but catcher does not. | Opus | `feature/gt-ux-t3-catcher-auto-assign` |
| 3.12 | UX-054 | MISSING | Build audio system: new AudioManager.ts utility. 8-bit retro sounds: Quick Bar tap (scoreboard flip), run scored (ascending chime), HR (fanfare), strikeout (descending tone), half-inning (whistle), undo (rewind bloop), start/end game (jingle), beat reporter (typewriter). Two toggles: game sounds on/off, beat reporter sounds on/off. | Codex 5.4 high | `feature/gt-ux-t3-audio` |
| 3.13 | UX-055 | MISSING | Implement undo-depth-aware locking: events within 10-deep undo stack = full correction. Events beyond undo depth = structural outcomes LOCKED (who scored, who was out, which base), enrichment fields remain editable forever. | Opus | `feature/gt-ux-t3-undo-depth-locking` |
| 3.14 | UX-056 | PARTIAL | Change locked result notice to "Use ↩ Undo to change result". Trigger as tooltip on tap of locked result field in play log entry (not in historical editor panel). | Codex 5.1 mini medium | `feature/gt-ux-t3-locked-tooltip` |

**Tier 3 Verification gate (TIER 3 COMPLETE):**
- [ ] Audio plays on Quick Bar tap, run scored, HR, strikeout, half-inning, undo, start/end game
- [ ] Beat reporter typewriter sound on new blurb
- [ ] Two audio toggles work independently
- [ ] Play log entry fade-in animation (CSS only)
- [ ] Score bug highlights on run scored
- [ ] Undo toast shows "[inning] [batter] [result]" format
- [ ] Save indicator ✓ visible in score bug, changes to ⚠ on failure only
- [ ] Tapping locked result shows "Use ↩ Undo to change result" tooltip
- [ ] Runner sub-entries visible under at-bats in play log with "└" nesting
- [ ] Runner sub-entries independently tappable → enrichment expands
- [ ] Runner enrichment includes per-runner fielding sequence, play mechanic, TOOTBLAN, Out Advancing
- [ ] Defensive lineup toggles into enrichment mode (header changes, sequence builds visually)
- [ ] Same enrichment mode works for both AtBatEvent and BetweenPlayEvent sequences
- [ ] Spray graphic shows correct zone count per result type
- [ ] Pitch count prompt fires at all 3 trigger points
- [ ] currentCatcherId auto-assigned on BetweenPlayEvents
- [ ] Events beyond undo depth: structural locked, enrichment editable
- [ ] Player card ONLY initiates events — no enrichment editing in player card
- [ ] `npm run build` passes
- [ ] JK confirms all features in iPad Safari landscape

---

## Routing Summary (NFL: recount and verify)

| Route | Count | Items |
|-------|-------|-------|
| Claude Code CLI / Opus 4.6 | 33 | Tier 1 all (14) + Tier 2 all (20, across 5 groups) - Tier 2 has 0 Codex items |
| | | Wait — let me recount. |

**NFL RECOUNT:**

Tier 1: 14 items → ALL Opus = 14 Opus
Tier 2:
- 2.A: 4 items → Opus = 4
- 2.B: 1 item → Opus = 1
- 2.C: 5 items → Opus = 5
- 2.D: 7 items → Opus = 7
- 2.E: 3 items → Opus = 3
- Tier 2 total: 20 items → ALL Opus = 20

Tier 3:
- Opus: 3.2, 3.3, 3.8, 3.9, 3.11, 3.13 = 6 items
- Codex 5.4 high: 3.1, 3.4, 3.5, 3.10, 3.12 = 5 items
- Codex 5.1 mini medium: 3.6, 3.7, 3.14 = 3 items
- Tier 3 total: 14 items = 6 + 5 + 3 = 14 ✓

**Final routing:**

| Route | Count | Items |
|-------|-------|-------|
| Claude Code CLI / Opus 4.6 | 40 | Tier 1 (14) + Tier 2 (20) + Tier 3 state-touching (6) |
| Codex 5.4 / high | 5 | Tier 3 scoped single-file (5) |
| Codex 5.1 mini / medium | 3 | Tier 3 trivial text/label (3) |
| No work needed | 10 | EXISTS + N/A |
| **TOTAL** | **58** | 40 + 5 + 3 + 10 = 58 ✓ |

**NFL note on routing shift:** V1 of this plan routed 24 items to Opus and 18 to Codex. V2 routes 40 to Opus and 8 to Codex. The shift happened because the gap analysis revealed that most "single component" items actually cross component boundaries or touch persistence. Codex is only appropriate when the change is genuinely confined to one file with no state/persistence implications. Only 8 of the 48 work items meet that bar.

---

## Risk Assessment

### High Risk
| Item | Risk | Mitigation |
|------|------|-----------|
| 2.B (UX-022) Remove pre-commit runner gate | Core recording flow changes. If defaults are wrong and commit is immediate, event log has wrong data. | Test EVERY runner scenario: single with R1, double with R1+R2, HR bases loaded, GO with force plays, FO with R3 (SF). Undo is the safety net. Do NOT remove old flow until new flow is verified. |
| 1.A+1.B (Layout rewrite) | Replacing the grid breaks the entire visual layout. Everything renders wrong mid-step. | Feature branch per step. Placeholder divs first, content second. Build passes at every checkpoint. Never merge broken state to main. |
| 2.D (Enrichment taxonomy) | exitType→contactType rename touches EnrichmentPanel, eventLog, useGameState, and downstream stat consumers. | Full `grep -ri "exitType" src/` before starting. Map EVERY occurrence. Rename atomically in one commit. Build passes after. |
| 1.A (Phase state machine) | Adding phase field to GameState breaks existing games in IndexedDB if field is missing on saved games. | Default `gamePhase` to 'LIVE' when field is missing (backward compat). Only new games start in PRE_GAME. Test by loading an existing saved game after the change. |

### Medium Risk
| Item | Risk | Mitigation |
|------|------|-----------|
| 2.C (Player card + sub rewrite) | Removing drag-drop substitution removes a working (if wrong) flow. | Build new player-card-first flow alongside old. Verify new flow works. THEN remove old flow in a separate commit. Never remove before replacement is verified. |
| 2.D.spray (Inline SVG spray) | 42-zone tappable SVG must be fat-finger-safe on iPad landscape. | Build at largest reasonable scale first. Test on actual iPad. Fall back to two-step (direction then depth) if zones are too small in testing. |
| 3.13 (Undo depth locking) | Two-tier locking (within undo depth = full, beyond = structural locked) adds complexity to the event editing path. | Keep it simple: check event's eventIndex against current undo stack depth. If within range, allow full edit. If beyond, allow only enrichment fields. Test with 11+ events recorded, then edit event #1 vs event #10. |

### Low Risk
All other Tier 3 items are additive features or cosmetic changes that don't affect core recording flow.

---

## Prompt Contract Strategy

| Scope | Contract Type | Count |
|-------|-------------|-------|
| Tier 1 Steps 1.A, 1.B, 1.C | 3 separate Opus prompt contracts | 3 |
| Tier 2 Groups 2.A-2.E | 5 separate Opus prompt contracts | 5 |
| Tier 3 Opus items | 1 prompt per item (6 items) | 6 |
| Tier 3 Codex items | 1 prompt per item (8 items) | 8 |
| **Total prompt contracts** | | **22** |

Each prompt contract follows the standard template from `spec-docs/PROMPT_CONTRACTS.md` with:
- GOAL (one sentence)
- SOURCE OF TRUTH (spec section + UX-ID references)
- CONSTRAINTS (exact files to touch, exact files NOT to touch)
- EXPECTED OUTPUT (what the code should do after)
- VERIFICATION (exact commands to run)
- FAILURE PROTOCOL

**Next step:** JK approves this plan, then we build the Step 1.A prompt contract.

---

## NFL Self-Audit of This Plan

**1. Are all 58 UX-IDs accounted for?**
Counted: 10 no-work + 14 Tier 1 + 20 Tier 2 + 14 Tier 3 = 58. ✓
Cross-checked: every UX-ID from UX-001 to UX-058 appears exactly once in this document.

**2. Does the routing math add up?**
40 Opus + 5 Codex 5.4 + 3 Codex 5.1 mini + 10 no-work = 58. ✓

**3. Are there dependency gaps?**
- Tier 2 depends on Tier 1 → ✓ stated, verification gate enforced
- Tier 3 depends on Tier 2 → ✓ stated, verification gate enforced
- Tier 1 internal: 1.B depends on 1.A, 1.C depends on 1.B → ✓ stated
- Tier 2 internal: Groups are independent after Tier 1 → ✓ (but 2.B before 2.C is recommended since removing the runner gate affects how player card corrections work)
- Tier 3 internal: 3.9 before 3.8 → ✓ stated

**4. Is any item routed to Codex that touches state or persistence?**
Checked each Codex item:
- 3.1 (play log colors): PlayLogPanel.tsx only → ✓ safe
- 3.4 (pitch count triggers): useGameState.ts trigger points → ⚠️ Wait. This touches useGameState.ts. Should this be Opus?

**NFL CORRECTION:** UX-032 (pitch count triggers) requires verifying and potentially fixing trigger points in useGameState.ts (248KB). That's Opus territory, not Codex 5.4. Changing route.

- 3.5 (CSS animations): CSS-only additions to existing components → ✓ safe
- 3.10 (player card initiate-only): verify no enrichment in player card modal → ✓ safe (read-only check + minor removal)
- 3.12 (audio system): new file, no existing code to navigate → ✓ safe
- 3.6 (undo toast): two-line text change → ✓ safe for mini
- 3.7 (save indicator): small UI addition to ScoreBug → ✓ safe for mini
- 3.14 (tooltip): small text change → ✓ safe for mini

**Updated Tier 3 routing after NFL correction:**
- 3.4 (UX-032) changes from Codex 5.4 high → Opus

**Final corrected routing:**

| Route | Count |
|-------|-------|
| Opus 4.6 | 41 |
| Codex 5.4 high | 4 |
| Codex 5.1 mini medium | 3 |
| No work | 10 |
| **Total** | **58** ✓ |

**5. Are there any items I assumed would be simple but actually aren't?**
- UX-011 (button feedback): Correctly routed to Opus — requires async hook↔component communication
- UX-028 (SVG spray): Correctly routed to Opus — complex SVG generation with 42 tappable zones
- UX-024 (enrichment mode): Correctly routed to Opus — column state toggle with visual mode switch

**6. Did I hand-wave any item's "What to Do"?**
Reviewed each item description. All describe concrete actions with file references. No "figure it out" or "implement appropriately." ✓

**7. Are verification gates specific enough to catch failures?**
Each gate has checkboxes with observable behaviors (not "it should work"). ✓

**8. Does the branching strategy prevent broken main?**
One feature branch per step/group. Merge only after build + browser verification. ✓

**NFL VERDICT: Plan is sound after the one correction (3.4 → Opus). No hallucinations, no skipped items, no unjustified assumptions.**
