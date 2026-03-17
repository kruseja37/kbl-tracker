# GAMETRACKER BUG LIST — Round 2
**Created:** 2026-03-16
**Source:** Manual browser testing by JK after Round 1 fixes
**Status:** PENDING FIX

---

## Bug Summary

| # | Bug | Severity | Route |
|---|-----|----------|-------|
| R2-01 | D3K (WP_K/PB_K) records K but no error, no fielding attribution | HIGH | Opus |
| R2-02 | Pre-game batting order change doesn't persist to play log | HIGH | Opus |
| R2-03 | Mid-inning pitcher change doesn't update defensive lineup column | MEDIUM | Codex 5.4 |
| R2-04 | PostGameSummary retains prior game data | HIGH | Opus |
| R2-05 | No runner action options in lineup tap (SB, CS, PK, etc.) | HIGH | Opus |
| R2-06 | Runner-base mapping wrong on DP (wrong runners tagged out/advanced) | CRITICAL | Opus |
| R2-07 | Sub Out shows only position-matching players, not full bench | HIGH | Codex 5.4 |
| R2-08 | Elimination lineup ignores no-DH tournament setting | HIGH | Opus |
| R2-09 | Undo across inning boundary leaves stale entry in play log | HIGH | Opus |
| R2-10 | "Out Advancing" on auto-scored runner doesn't correct score; runner outcomes not editable via lineup tap | HIGH | Opus |
| R2-11 | WP_K/PB_K don't handle runner advancement logic (occupied 1B, <2 outs) | HIGH | Opus |

---

## R2-06 (CRITICAL): Runner-Base Mapping Wrong on DP
# Branch: fix/r2-06-dp-runner-mapping

### OBSERVED
Magic Moore was on 2nd, Handley Dexterez on 1st. DP recorded for next batter. Play log shows Magic Moore 1B→3B and 2B→3B but no record of Handley getting out at 2B. Runners are mapped to wrong bases.

### EXPECTED
DP with R1+R2: standard 6-4-3 double play. Batter out at 1st, R1 (Handley on 1st) forced out at 2nd. R2 (Magic on 2nd) advances to 3rd or holds. The runner on 1st should be the one recorded as out, not mapped to a wrong base.

### ROOT CAUSE HYPOTHESIS
The runner default builder (`buildRunnerCorrectionForQuickBarOutcome` or `runnerDefaults.ts`) maps runners by BASE POSITION rather than by IDENTITY. When building DP defaults, it may be reading the base occupancy but assigning outcomes to the wrong runner IDs. Or the `runners` snapshot captures runners AFTER mutation instead of BEFORE (similar to the issue BUG-06 fixed for sub-entries).

### FILES TO INVESTIGATE
- `src/src_figma/app/components/runnerDefaults.ts` — DP case runner advancement logic
- `src/src_figma/app/utils/gameTrackerRunnerCorrection.ts` — `buildRunnerCorrectionForQuickBarOutcome` DP handling
- `src/src_figma/hooks/useGameState.ts` — runner state at commit time, `runners`/`runnersAfter` snapshot ordering (see the fix at useGameState.ts:3398 from BUG-06 — verify the pre-mutation snapshot is used for DP too)
- The inherited runner tracker: `src/src_figma/app/engines/inheritedRunnerTracker.ts`

### WHAT TO FIX
1. Trace the DP outcome path end-to-end: Quick Bar tap → defaults computed → commit → runners resolved → play log built
2. Verify the runner snapshot reads from PRE-mutation state (the BUG-06 fix added this for hits/walks/errors — verify DP is also covered)
3. Verify runner identity mapping: R1 runner ID should map to "first base" outcomes, R2 to "second base" outcomes. If the mapping is positional index rather than base-keyed, that's the bug.
4. Test with multiple configurations: DP with R1 only, DP with R1+R2, DP with bases loaded

### DO NOT
- Change the play log rendering or enrichment system
- Modify eventLog.ts

### VERIFY
```bash
npm run build
```
Browser: Put runners on 1st and 2nd → record DP → play log shows: batter out, R1 (1st base runner) out at 2nd, R2 (2nd base runner) advances to 3rd. Correct runner names on correct bases.

---

## R2-09 (HIGH): Undo Across Inning Boundary Leaves Stale Play Log Entry
# Branch: fix/r2-09-undo-inning-boundary

### OBSERVED
Undo right after an inning change returns to prior half-inning with 2 outs but the 3rd-out entry remains in the play log. Additional undos remove outs but the play log never catches up until the entire inning is undone.

### EXPECTED
Undo after 3rd out: inning reverts to prior half with 2 outs, the 3rd-out play log entry is removed, play log matches game state exactly.

### ROOT CAUSE HYPOTHESIS
The undo snapshot captures `playLogEntries` at snapshot time. But when the 3rd out triggers an inning change, additional state changes may occur AFTER the snapshot (inning advance, batter reset). The snapshot may capture the play log WITH the 3rd-out entry but the game state pre-inning-change — or vice versa. There's a timing mismatch between when the play log entry is added and when the snapshot is captured.

### FILES TO INVESTIGATE
- `src/src_figma/app/pages/GameTracker.tsx` — handleUndo (~line 815), captureSnapshot calls in handleQuickBarOutcome
- `src/src_figma/hooks/useGameState.ts` — what happens when 3rd out triggers endInning: does this happen synchronously after commitPlateAppearance or in a separate effect?

### WHAT TO FIX
1. Verify the captureSnapshot call happens BEFORE the play log entry is added AND before commitPlateAppearance. The snapshot must capture the state where: play log has N entries (not N+1), outs = 2 (not 3), inning hasn't changed.
2. If the inning transition happens asynchronously (via effect), the snapshot may be captured at an intermediate state. The fix is to ensure the snapshot captures the COMPLETE pre-play state atomically.
3. When undo restores from snapshot, verify it restores BOTH the play log entries AND the game state (outs, inning, isTop) from the same snapshot. If they come from different sources, they'll be inconsistent.

### DO NOT
- Change the inning transition logic itself
- Modify eventLog.ts

### VERIFY
```bash
npm run build
```
Browser: Record plays to reach 2 outs → record K (3rd out, inning changes) → undo → should be back to 2 outs in the SAME half-inning, K entry removed from play log, no stale entries.

---

## R2-01 (HIGH): D3K Records K But No Error / No Fielding Attribution
# Branch: fix/r2-01-d3k-error

### OBSERVED
Dropped third strikes (WP_K, PB_K) correctly record the strikeout but don't record the error. The expanded Fenway scoreboard doesn't show the error. No fielding attribution is available in enrichment.

### EXPECTED
WP_K: strikeout recorded + wild pitch charged to pitcher + batter reaches 1st. PB_K: strikeout recorded + passed ball charged to catcher + batter reaches 1st. Both should show fielding attribution (pitcher for WP, catcher for PB) and the error column in the scoreboard should increment.

### FILES TO INVESTIGATE
- `src/src_figma/hooks/useGameState.ts` — search for `WP_K`, `PB_K`, `D3K` handling in commitPlateAppearance or the outcome branches
- `src/src_figma/app/components/runnerDefaults.ts` — WP_K/PB_K runner defaults (batter reaches 1st)
- The scoreboard/linescore error tracking — where is the E column computed?

### WHAT TO FIX
1. WP_K commit path: must record both the strikeout (K stat) AND the wild pitch (WP event). The pitcher should be auto-attributed. Error column should increment.
2. PB_K commit path: must record both the strikeout AND the passed ball. Catcher should be auto-attributed.
3. Enrichment panel should show fielding attribution for these result types (currently the ENRICHMENT_CONFIG may not include them — check).
4. Scoreboard error column must include WP_K/PB_K in its error count.

### DO NOT
- Change the Quick Bar button definitions
- Modify the enrichment taxonomy

### VERIFY
```bash
npm run build
```
Browser: Record WP_K → scoreboard E column increments, play log shows K + batter reached, enrichment shows pitcher attribution.

---

## R2-02 (HIGH): Pre-Game Batting Order Change Doesn't Persist to Play Log
# Branch: fix/r2-02-pregame-order

### OBSERVED
Swap Order in PRE_GAME phase visually updates the lineup column, but after START GAME, the play log records at-bats in the ORIGINAL batting order, not the swapped order.

### EXPECTED
Batting order changes made in PRE_GAME must persist into LIVE. The play log should reflect the reordered lineup.

### ROOT CAUSE HYPOTHESIS
The Swap Order function swaps the DISPLAYED roster data but doesn't update the hook's internal lineup state (useGameState's awayLineupRef/homeLineupRef or equivalent). When plays are committed, the hook uses its own internal batting order, which still has the original order.

### FILES TO INVESTIGATE
- `src/src_figma/app/pages/GameTracker.tsx` — handleSwapOrder function, how it mutates state
- `src/src_figma/hooks/useGameState.ts` — where batting order is stored and read during play commits

### WHAT TO FIX
1. Trace handleSwapOrder: does it update the hook's lineup state, or only the displayed roster state?
2. If it only updates display state, it needs to also call a hook function that reorders the batting lineup internally.
3. Similar to BUG-01 fix: the START GAME sync must pick up the reordered batting order.

### VERIFY
```bash
npm run build
```
Browser: PRE_GAME → swap batters 1 and 3 → START GAME → first batter should be the player who was moved to slot 1.

---

## R2-04 (HIGH): PostGameSummary Retains Prior Game Data
# Branch: fix/r2-04-postgame-stale

### OBSERVED
PostGameSummary page shows data from a previous game, not the game that just ended.

### EXPECTED
PostGameSummary should show stats/summary for the game that was just completed.

### ROOT CAUSE HYPOTHESIS
PostGameSummary loads its data from IndexedDB by gameId (passed via route state). If the gameId in route state is wrong, or if the archived game data wasn't written before navigation, or if PostGameSummary caches data from a prior visit without clearing, stale data shows.

### FILES TO INVESTIGATE
- `src/src_figma/app/pages/GameTracker.tsx` — the navigate call after endGame (~line 4930 area) — what state is passed?
- PostGameSummary component — search for it in `src/src_figma/app/pages/` — how does it load data? From route state or from IndexedDB?

### WHAT TO FIX
1. Verify the correct gameId is passed in the navigate state after endGame
2. Verify PostGameSummary loads data for the gameId from route state, not from a cached/stale source
3. PostGameSummary should clear any local state on mount and reload from the passed gameId

### VERIFY
```bash
npm run build
```
Browser: Play a game → END GAME → PostGameSummary shows correct teams, scores, and stats for the game just played.

---

## R2-05 (HIGH): No Runner Action Options in Lineup Tap
# Branch: fix/r2-05-runner-actions

### OBSERVED
Tapping a runner in the batting lineup column opens the player card, but there are no runner-specific action options (Steal, Caught Stealing, Pickoff, Wild Pitch, Passed Ball, Advance on Error, etc.).

### EXPECTED
Per spec §5.6, when a player who is currently on base is tapped in the batting lineup, their player card should include runner-specific actions: Steal, CS, Pickoff (Safe/Out/Error), Wild Pitch, Passed Ball, Advance. Each action logs a BetweenPlayEvent.

### FILES TO INVESTIGATE
- `src/src_figma/app/pages/GameTracker.tsx` — PlayerCardModal, handleLineupPlayerTap — does it detect if the tapped player is a runner?
- `src/src_figma/hooks/useGameState.ts` — between-play event recording functions for SB, CS, WP, PB, PK
- `src/src_figma/app/components/BattingLineupColumn.tsx` — does it pass runner status info with the tap callback?

### WHAT TO FIX
1. When a player is tapped in the batting lineup, check if they are currently on base (cross-reference with bases state + runner identity).
2. If the player is on base, add runner action buttons to the PlayerCardModal: STEAL, CAUGHT STEALING, PICKOFF, WILD PITCH, PASSED BALL, ADVANCE.
3. Each button should call the appropriate BetweenPlayEvent recording function from useGameState (these functions likely already exist — search for `recordStolenBase`, `recordCaughtStealing`, `recordWildPitch`, `recordPassedBall`, `recordPickoff` or equivalent).
4. After the action, close the player card and refresh the play log.

### DO NOT
- Build the full enrichment flow for runner events (that's the existing Tier 3 work)
- Change the Quick Bar or enrichment panel

### VERIFY
```bash
npm run build
```
Browser: Get runner on 1st → tap that runner in batting lineup → player card shows STEAL, CS, PK, WP, PB, ADVANCE buttons → tap STEAL → play log shows SB entry, runner advances.

---

## R2-10 (HIGH): "Out Advancing" Doesn't Correct Score; Runner Outcomes Not Editable Via Lineup
# Branch: fix/r2-10-runner-correction

### OBSERVED
Two related issues:
1. Marking a runner "Out Advancing" in the play log (via runner sub-entry enrichment) on a runner that was auto-scored does NOT subtract the run from the score.
2. Runner outcomes cannot be edited by tapping the player in the lineup column — no correction options appear.

### EXPECTED
1. If a runner was auto-scored (defaulted to HOME) and the user marks them "Out Advancing," the score should decrement by 1 (the run didn't actually score).
2. Tapping a runner in the lineup should allow correcting their outcome (e.g., changing from "scored" to "out at home").

### ROOT CAUSE HYPOTHESIS
1. The "Out Advancing" toggle in RunnerEnrichmentPanel sets the flag but doesn't trigger a score recalculation. Score adjustment on runner outcome change requires calling back into useGameState to update homeScore/awayScore.
2. The player card doesn't have runner outcome correction buttons — only the play log sub-entry enrichment has them, and even that doesn't feed back to score.

### FILES TO INVESTIGATE
- `src/src_figma/app/components/EnrichmentPanel.tsx` — RunnerEnrichmentPanel, handleRunnerEnrichmentUpdate
- `src/src_figma/app/pages/GameTracker.tsx` — where runner enrichment updates are processed, score recalculation
- `src/src_figma/hooks/useGameState.ts` — score state management, whether runner outcome changes trigger score updates

### WHAT TO FIX
1. When "Out Advancing" is toggled ON for a runner whose default outcome was `toBase: 'home'`: the runner's outcome should change from "scored" to "out", and the game score should decrement by 1 for the appropriate team.
2. When "Out Advancing" is toggled OFF (user reverses): if the runner was originally scored, re-add the run.
3. This requires the runner enrichment update to call back into the game state hook to adjust the score — it's not just a metadata flag.
4. For lineup-based runner correction: add a "CORRECT OUTCOME" button to the player card when the player is on base, linking to the play log sub-entry enrichment for their most recent outcome.

### DO NOT
- Change the automatic runner default logic (that's R2-06)
- Modify eventLog.ts structure

### VERIFY
```bash
npm run build
```
Browser: Runner scores on a hit → tap runner sub-entry in play log → toggle "Out Advancing" → score decrements by 1. Toggle off → score restores.

---

## R2-11 (HIGH): WP_K/PB_K Don't Handle Runner Advancement Logic
# Branch: fix/r2-11-wpk-pbk-runners

### OBSERVED
WP_K and PB_K buttons record the strikeout but don't handle the runner advancement rules: if there are fewer than 2 outs and 1st base is occupied, the batter is OUT (cannot reach on dropped 3rd strike). If 1st base is open or there are 2 outs, batter reaches 1st. Existing runners may also advance on the wild pitch/passed ball.

### EXPECTED
Per baseball rules §6.9 (dropped third strike):
- Batter reaches 1st ONLY if: (a) 1st base is unoccupied, OR (b) there are 2 outs
- If batter cannot reach (1st occupied, <2 outs): it's just a strikeout, no WP/PB advancement
- Existing runners advance one base on WP/PB regardless
- The WP/PB event should be charged to the appropriate player (WP → pitcher, PB → catcher)

### FILES TO INVESTIGATE
- `src/src_figma/app/components/runnerDefaults.ts` — WP_K and PB_K cases
- `src/src_figma/hooks/useGameState.ts` — commitPlateAppearance path for WP_K/PB_K, search for `isDroppedThirdStrike`, `batterReached`
- `src/src_figma/app/utils/gameTrackerRunnerCorrection.ts` — WP_K/PB_K branch in buildRunnerCorrectionForQuickBarOutcome

### WHAT TO FIX
1. In the WP_K/PB_K outcome path, check game state: `bases.first` and `outs`
2. If `bases.first === true && outs < 2`: batter does NOT reach. Record as simple K. Runners still advance on WP/PB.
3. If `bases.first === false || outs === 2`: batter reaches 1st. Record as K + batter to 1st. Runners advance.
4. Wire the WP/PB event to the correct player (pitcher for WP_K, catcher for PB_K) — this connects to R2-01's fielding attribution fix.

### DO NOT
- Change the Quick Bar button layout
- Modify the enrichment panel

### VERIFY
```bash
npm run build
```
Browser test 1: R1 occupied, 1 out → WP_K → batter is OUT (K only), R1 advances to 2nd on WP.
Browser test 2: 1B open, 1 out → WP_K → batter reaches 1st, K recorded, WP charged to pitcher.
Browser test 3: R1 occupied, 2 outs → WP_K → batter reaches 1st (2-out exception), R1 advances.

---

## R2-03 (MEDIUM): Pitcher Change Doesn't Update Defensive Lineup Column
# Branch: fix/r2-03-pitcher-defense-column

### OBSERVED
Mid-inning pitcher change correctly updates the NewsBoard (shows new pitcher) and play log (shows pitcher change entry), but the defensive lineup column still shows the old pitcher.

### EXPECTED
After a pitcher substitution, the defensive lineup column should immediately show the new pitcher with the primary color outline.

### ROOT CAUSE HYPOTHESIS
The defensive lineup column data is derived from a roster snapshot that doesn't refresh after substitutions. The NewsBoard and play log read from the hook's live state, but the column reads from a displayed roster that's only synced at certain points (e.g., START GAME, half-inning change).

### FILES TO INVESTIGATE
- `src/src_figma/app/pages/GameTracker.tsx` — `defensiveColumnPlayers` derivation, `syncDisplayedRostersToLineupSnapshot`
- Where pitcher substitution handler updates displayed state

### WHAT TO FIX
1. After a pitcher substitution completes, trigger a refresh of the defensive column data.
2. Either call `syncDisplayedRostersToLineupSnapshot()` after the sub, or ensure the column data derivation reads from the hook's live lineup state (not a stale snapshot).

### VERIFY
```bash
npm run build
```
Browser: Mid-inning → change pitcher → defensive column immediately shows new pitcher with primary color outline.

---

## R2-07 (HIGH): Sub Out Shows Limited Players, Not Full Bench
# Branch: fix/r2-07-sub-full-bench

### OBSERVED
Sub Out bench list only shows position-matching players or only pitchers — not the full bench. Can't sub the visiting team's starting pitcher with a position player.

### EXPECTED
Per spec §9.1: bench list shows "all players, ungrouped, regardless of position." Any bench player can replace any lineup player.

### FILES TO INVESTIGATE
- `src/src_figma/app/pages/GameTracker.tsx` — PlayerCardModal Sub Out flow, bench list filtering

### WHAT TO FIX
1. Find where the bench list is filtered in the Sub Out flow.
2. Remove any position-based filtering. The bench list should include ALL players not currently in the active lineup, regardless of their position(s).
3. The bench list should show each player's name, position(s), and key stats — but selection should not be restricted by position.

### VERIFY
```bash
npm run build
```
Browser: Tap visiting pitcher → Sub Out → bench list shows ALL available bench players (pitchers AND position players). Select a position player → sub completes.

---

## R2-08 (HIGH): Elimination Lineup Ignores No-DH Tournament Setting
# Branch: fix/r2-08-elim-no-dh

### OBSERVED
From Round 1 investigation: "elimination/lineup code paths still defaulting or allowing DH" in eliminationRosterStorage.ts and lineupLoader.ts. When tournament is configured with No DH, the initial lineup still includes a DH and excludes the pitcher from the batting order.

### EXPECTED
When elimination tournament has No DH: pitcher bats in the lineup (typically 9th), no DH slot exists. The defensive column filter (BUG-02 fix) hides DH from defense, but the batting lineup should never HAVE a DH in a no-DH tournament.

### FILES TO INVESTIGATE
- `src/utils/eliminationRosterStorage.ts` — lineup initialization for elimination games
- `src/src_figma/utils/lineupLoader.ts` — how lineups are loaded and whether DH setting is respected
- Elimination tournament config — where `hasDH` or `useDH` setting is stored

### WHAT TO FIX
1. Find the DH setting on the elimination/tournament config object.
2. In the lineup initialization path for elimination games, check the DH setting.
3. If No DH: ensure the pitcher is included in the batting order at position 9 (or wherever set), and no DH slot is created.
4. If DH enabled: current behavior is correct.

### VERIFY
```bash
npm run build
```
Browser: Create elimination tournament with No DH → start game → batting lineup shows pitcher in slot, no DH.

---

## Execution Order

**CRITICAL — fix first:**
1. R2-06 (runner-base mapping on DP) — game logic correctness

**HIGH — fix next (in this order):**
2. R2-09 (undo across inning boundary)
3. R2-11 (WP_K/PB_K runner advancement rules)
4. R2-01 (D3K error recording)
5. R2-02 (pre-game batting order persistence)
6. R2-04 (PostGameSummary stale data)
7. R2-05 (runner action options in lineup)
8. R2-10 (out advancing score correction)
9. R2-07 (sub out full bench)
10. R2-08 (elimination no-DH)

**MEDIUM — fix last:**
11. R2-03 (pitcher change defense column update)

Each bug has its own branch. Run `npm run build` after each. Browser-verify before merging.
