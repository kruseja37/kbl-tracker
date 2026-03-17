# GAMETRACKER POST-REDESIGN BUG LIST
**Created:** 2026-03-16
**Source:** Manual browser testing by JK
**Status:** PENDING FIX

---

## Bug Summary

| # | Bug | Severity | Scope | Route |
|---|-----|----------|-------|-------|
| BUG-01 | Pre-game pitcher change doesn't persist | HIGH | useGameState + GameTracker | Opus |
| BUG-02 | DH shown in defensive lineup (DH doesn't field) | HIGH | DefensiveLineupColumn | Opus |
| BUG-03 | Elimination mode shows DH despite "No DH" setting | HIGH | Lineup initialization | Opus |
| BUG-04 | Leftover play log data showing on new game start | HIGH | Game initialization / cleanup | Opus |
| BUG-05 | Undo breaks out count / creates duplicate entries | CRITICAL | Undo system + useGameState | Opus |
| BUG-06 | Runner sub-entries not showing in play log | HIGH | PlayLogPanel / entry building | Opus |
| BUG-07 | No inferential defaults on plays (routine not auto-selected) | MEDIUM | Enrichment defaults | Codex 5.4 |
| BUG-08 | Current batter/pitcher highlight is left-bar, not outline | LOW | Lineup column CSS | Codex 5.4 |
| BUG-09 | ScoreBug left-centered, abbreviated team names, no stadium | MEDIUM | ScoreBug.tsx | Codex 5.4 |
| BUG-10 | Enrichment pane buttons/fields too small for iPad tap | MEDIUM | EnrichmentPanel CSS | Codex 5.4 |
| BUG-11 | No spray zone UI in enrichment (field location empty) | HIGH | EnrichmentPanel / SprayGraphic | Opus |

---

## BUG-01: Pre-game pitcher change doesn't persist
**Severity:** HIGH
**Observed:** In exhibition mode PRE_GAME phase, user can go through the pitcher change flow, but the new pitcher doesn't actually replace the old pitcher when the game starts.
**Expected:** Pitcher substitution in PRE_GAME should persist — the selected pitcher should be the starter when START GAME is tapped.
**Root cause hypothesis:** The Sub Out flow may be logging a BetweenPlayEvent but not updating the lineup state that feeds the LIVE phase. Or the lineup state resets on START GAME transition.
**Files to investigate:**
- `src/src_figma/app/pages/GameTracker.tsx` — handleLineupCardSubstitution, startGame transition, PRE_GAME phase lineup state
- `src/src_figma/hooks/useGameState.ts` — how lineup state is initialized and whether PRE_GAME changes carry into LIVE
**Fix approach:** Trace the sub flow in PRE_GAME. Verify the lineup mutation persists across the phase transition. If startGame() reinitializes lineup from the original roster, that's the bug — it should use the modified lineup.
**Verify:** Start exhibition game → PRE_GAME → change pitcher → START GAME → confirm new pitcher shows in defensive lineup and is the active pitcher.

## BUG-02: DH shown in defensive lineup
**Severity:** HIGH
**Observed:** Defense column shows a DH entry. DH does not play the field — should not appear in the defensive lineup column.
**Expected:** Defensive lineup shows only the 9 fielding positions (P, C, 1B, 2B, 3B, SS, LF, CF, RF). DH is excluded.
**Root cause hypothesis:** DefensiveLineupColumn receives the full team roster or batting lineup (which includes DH) without filtering out non-fielding positions.
**Files to investigate:**
- `src/src_figma/app/components/DefensiveLineupColumn.tsx` — does it filter by position?
- `src/src_figma/app/pages/GameTracker.tsx` — what data is passed to DefensiveLineupColumn?
**Fix approach:** Filter the defensive lineup to exclude players whose position is 'DH'. Show only the 9 players with fielding positions.
**Verify:** Start game with DH enabled → defensive column shows 9 fielders, no DH entry.

## BUG-03: Elimination mode shows DH despite "No DH" tournament setting
**Severity:** HIGH
**Observed:** User configured elimination tournament with No DH. Pre-game lineup still shows a DH and no pitcher in the batting lineup, preventing pitcher changes.
**Expected:** When tournament is configured with No DH, the batting lineup should show 9 players including the pitcher. No DH slot.
**Root cause hypothesis:** The lineup initialization for elimination mode is not respecting the tournament's DH setting. It may be defaulting to DH-enabled.
**Files to investigate:**
- Elimination mode game initialization path — search for where elimination game lineups are set up
- `src/src_figma/app/pages/GameTracker.tsx` — how lineup is populated from elimination context
- Tournament/elimination config — where DH setting is stored and read
**Fix approach:** Trace the elimination mode game launch. Find where lineup is initialized. Ensure the tournament's DH setting is read and respected. If No DH, pitcher must be in the batting order.
**Verify:** Create elimination tournament with No DH → start game → batting lineup shows pitcher in batting order, no DH slot.

## BUG-04: Leftover play log data on new game start
**Severity:** HIGH
**Observed:** Starting a new game in GameTracker shows leftover play log entries from a previous game.
**Expected:** New game starts with an empty play log.
**Root cause hypothesis:** The play log state is not being cleared when a new game initializes. The `initializeOrLoadGame` path may be loading events from a previous game ID, or the play log entries array is not reset.
**Files to investigate:**
- `src/src_figma/app/pages/GameTracker.tsx` — play log entries state initialization, game mount logic
- `src/src_figma/hooks/useGameState.ts` — initializeOrLoadGame, clearCurrentGame
**Fix approach:** Ensure play log entries are cleared to `[]` when a NEW game starts (gamePhase === PRE_GAME on fresh mount). Only load existing entries when RESUMING a game (gamePhase defaults to LIVE from saved state).
**Verify:** Complete a game → start a new game → play log is empty.

## BUG-05: Undo breaks out count / creates duplicate play log entries
**Severity:** CRITICAL
**Observed:** Pressing undo doesn't properly undo outs logic. Creates multiple entries stacked on top of each other in the play log. Ends innings prematurely.
**Expected:** Undo should: (1) remove the most recent play log entry, (2) restore the game state (outs, score, runners, lineup position) to the pre-play snapshot, (3) leave the play log consistent with the restored state.
**Root cause hypothesis:** The immediate-commit flow change (Step 2.B) may have broken the undo snapshot capture. Possible issues: (a) captureSnapshot is called at the wrong time, (b) the snapshot doesn't include play log state, (c) restoring the snapshot doesn't remove the committed play log entry.
**Files to investigate:**
- `src/src_figma/app/pages/GameTracker.tsx` — captureSnapshot calls, undo handler, play log entry removal on undo
- `src/src_figma/app/components/UndoSystem.tsx` — snapshot restore mechanism
- `src/src_figma/hooks/useGameState.ts` — what state is captured/restored by undo
**Fix approach:** This is the most critical bug. Trace the FULL undo flow: (1) where is the snapshot captured before the commit? (2) what data does the snapshot contain? (3) when undo fires, what state is restored? (4) is the play log entry removed? The immediate-commit flow from 2.B must capture the snapshot BEFORE commitPlateAppearance and the play log entry must be removed on undo.
**Verify:** Record K → undo → outs should be back to previous count, play log should not show the K, batter should be the same batter. Record 3 outs → undo last out → inning should NOT have advanced.

## BUG-06: Runner sub-entries not showing in play log
**Severity:** HIGH
**Observed:** Despite Tier 3 Batch A implementing runner sub-entries, they don't appear in the play log during actual gameplay.
**Expected:** After a hit with runners on base, the play log should show "└" nested entries below the at-bat showing each runner's outcome.
**Root cause hypothesis:** The runner sub-entries may not be built from the committed event data. Possible issues: (a) runnerOutcomes[] is empty on committed events, (b) buildRunnerSubEntries is not called after commit, (c) the sub-entries are built but not passed to PlayLogPanel.
**Files to investigate:**
- `src/src_figma/app/pages/GameTracker.tsx` — where play log entries are built after commit, whether buildRunnerSubEntries is called
- `src/src_figma/app/utils/gameTrackerPlayLog.ts` — buildRunnerSubEntries function
- `src/utils/eventLog.ts` — verify runnerOutcomes[] is populated on committed AtBatEvents
**Fix approach:** Trace: commit happens → event written to IndexedDB → play log entry built → are runnerSubEntries built and attached? Check if the committed event actually has runnerOutcomes[] populated. Check if buildRunnerSubEntries is called with the right data.
**Verify:** Record 1B with runner on 1st → play log shows at-bat entry AND "└ [runner] 1B→2B" sub-entry.

## BUG-07: No inferential defaults on plays (routine not auto-selected)
**Severity:** MEDIUM
**Observed:** When recording a play, the enrichment panel doesn't auto-select "Routine" for fielding attempt or "Normal" for contact type. All enrichment fields start blank.
**Expected:** Per spec §8.1, Fielding Attempt should default to "Routine" and Attempt Outcome to "Made" for all contact plays. Contact Type should default to "Normal".
**Root cause hypothesis:** The enrichment panel shows options but doesn't set initial defaults. The `currentEnrichment` object passed to EnrichmentPanel may have empty/undefined fields.
**Files to investigate:**
- `src/src_figma/app/components/EnrichmentPanel.tsx` — default values for contact type, fielding attempt, play mechanic
- `src/src_figma/app/pages/GameTracker.tsx` — initial enrichment data when a new play is committed
**Fix approach:** When a play is committed, set default enrichment values: `contactType: 'normal'`, `fieldingAttemptType: 'routine'`, `fieldingAttemptOutcome: 'made'`, `playMechanic: 'routine'`. These defaults should be written with the event so the play log shows them even without manual enrichment.
**Verify:** Record a GO → enrichment panel opens → Routine, Made, Normal, Routine already selected as defaults.

## BUG-08: Current batter/pitcher highlight is left-bar, not outline
**Severity:** LOW
**Observed:** The current batter and pitcher are highlighted with a colored bar on the left side of the player row, not a full outline around the player card.
**Expected:** Per spec §5.2, current batter gets a "solid outline/border in team's primary color" — a full border around the entire row, not just a left accent bar.
**Files to investigate:**
- `src/src_figma/app/components/BattingLineupColumn.tsx` — current batter styling
- `src/src_figma/app/components/DefensiveLineupColumn.tsx` — current pitcher styling
**Fix approach:** Change from `border-left: 3px solid [teamColor]` (or equivalent) to `border: 2px solid [teamColor]` on the entire row container for the current batter/pitcher.
**Verify:** In LIVE phase, current batter row has a full border (all 4 sides) in team color. Same for current pitcher.

## BUG-09: ScoreBug left-centered, abbreviated names, no stadium
**Severity:** MEDIUM
**Observed:** ScoreBug shows "BLOWF" (truncated) and "HC" instead of full team names. Content is left-aligned instead of centered/spread. No home stadium name shown.
**Expected:** Per spec §3.1, ScoreBug should show FULL team names (e.g., "BLOWFISH" and "HERBISAURS"). Home stadium name should appear to the right of the team/score area. Content should be evenly spaced across the full width.
**Files to investigate:**
- `src/src_figma/app/components/ScoreBug.tsx` — team name rendering, layout, stadium name prop
**Fix approach:**
1. Use full team names instead of abbreviations. The `awayTeamName` and `homeTeamName` props may already contain full names but are being truncated by CSS overflow. If they contain abbreviations, wire the full name.
2. Add `stadiumName?: string` prop. Display it right-of-center or right-aligned after the score area.
3. Use `justify-between` or `justify-evenly` on the flex container to spread content across the full width instead of left-clustering.
**Verify:** ScoreBug shows "BLOWFISH 1 | T1 | HERBISAURS 0 | ◆◇◇ ●○○ | Fenway Park | ✓ Ⓜ 🔊" spanning full width.

## BUG-10: Enrichment pane fields too small for iPad tap targets
**Severity:** MEDIUM
**Observed:** In the enrichment panel (right side), the buttons for Contact Type, Fielding Attempt, Play Mechanic, Pitch Type, and Modifiers are very small — hard to tap on iPad.
**Expected:** Per spec §1 (iPad, right middle finger, flat on cushion), all interactive elements must be fat-finger-safe. Minimum tap target ~44px per Apple HIG.
**Files to investigate:**
- `src/src_figma/app/components/EnrichmentPanel.tsx` — button sizing throughout
**Fix approach:** Increase button/chip sizes in the enrichment panel:
- Text size from `text-[7px]` / `text-[8px]` to at least `text-[10px]` or `text-xs`
- Padding from `px-1.5 py-0.5` to at least `px-2.5 py-1.5`
- Minimum height of 36-44px per tappable element
- Section labels from `text-[8px]` to `text-[10px]`
- The panel itself may need to scroll if enlarged elements don't fit — that's OK, it already has `overflow-y: auto`
**Verify:** On iPad landscape, all enrichment buttons are comfortably tappable with a fingertip without precision.

## BUG-11: No spray zone UI for field location selection
**Severity:** HIGH
**Observed:** The enrichment panel's FIELD LOCATION section says "Tap the main field to place spray/location" — but there is no main field to tap (diamond was removed in Step 1.B). The SprayGraphic SVG built in Step 2.D does not appear to be rendering in the enrichment panel.
**Expected:** Per spec §8.2, an inline SVG fan-shaped spray graphic should render INSIDE the enrichment panel's Field Location section, with tappable zones. The old "tap the main field" text is from the pre-redesign diamond-tap flow and should be replaced.
**Root cause hypothesis:** The SprayGraphic component was built in 2.D but may not be wired into the enrichment panel's rendering path. The `useMainFieldForLocation` prop may still be true, causing the panel to show the old "tap the main field" text instead of the inline SprayGraphic.
**Files to investigate:**
- `src/src_figma/app/components/EnrichmentPanel.tsx` — Field Location section rendering, `useMainFieldForLocation` prop, SprayGraphic usage
- `src/src_figma/app/pages/GameTracker.tsx` — what value is passed for `useMainFieldForLocation`
**Fix approach:**
1. Set `useMainFieldForLocation` to `false` (or remove the prop entirely) so the inline SprayGraphic renders instead of the "tap the main field" text.
2. Verify SprayGraphic renders with the correct zone count for the result type.
3. Remove the "Tap the main field to place spray/location" text — that flow no longer exists (diamond is gone).
**Verify:** Open enrichment for a GO → Field Location section shows inline fan-shaped SVG with 18 tappable zones. Tapping a zone highlights it and saves the location.

---

## Fix Priority Order

**Critical — fix first (game-breaking):**
1. BUG-05: Undo system broken
2. BUG-04: Leftover play log data

**High — fix next (core functionality):**
3. BUG-01: Pre-game pitcher change
4. BUG-02: DH in defensive lineup
5. BUG-03: Elimination mode DH setting
6. BUG-06: Runner sub-entries not showing
7. BUG-11: Spray zone UI missing

**Medium — fix after (usability):**
8. BUG-07: Enrichment defaults
9. BUG-09: ScoreBug layout/names/stadium
10. BUG-10: Enrichment button sizes

**Low — fix last (cosmetic):**
11. BUG-08: Batter/pitcher highlight style

---

## Routing Summary

| Route | Bugs | Why |
|-------|------|-----|
| Claude Code CLI / Opus | BUG-01, 02, 03, 04, 05, 06, 11 | Multi-file, state-touching, deep tracing needed |
| Codex 5.4 / high | BUG-07, 08, 09, 10 | Single-component CSS/config changes |

**Recommended Opus session grouping:**
- **Session 1 (CRITICAL):** BUG-05 (undo) + BUG-04 (leftover data) — these must be fixed first, both involve game initialization/state management
- **Session 2 (DH/lineup):** BUG-01 (pitcher change) + BUG-02 (DH defense) + BUG-03 (elim DH) — all involve lineup initialization
- **Session 3 (display):** BUG-06 (runner sub-entries) + BUG-11 (spray zone) — both involve enrichment/play log rendering

**Codex items** can run in parallel after Opus sessions.
