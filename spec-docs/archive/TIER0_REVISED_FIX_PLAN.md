# TIER 0 REVISED FIX PLAN — Based on Diagnostic Findings
#
# The diagnostic found 15 issues, not 6. They cluster into 3 root 
# cause groups. Fixing in the right ORDER is critical — Group A 
# (data) must come before Group B (logic) because fixing logic 
# while phantom data flows through is fixing symptoms not causes.
#
# EXECUTION ORDER:
#   Phase 1: T0-08 — Roster data (fixes the data source)
#   Phase 2: T0-09 — Phantom bullpen (fixes stat corruption)
#   Phase 3: T0-05 — Game persistence (wires PLAY path to pipeline)
#   Phase 4: T0-03 — CS 3rd out (state machine fix)
#   Phase 5: T0-01 — Auto game-end (state machine fix)
#   Phase 6: T0-04 — Error flow (UI flow fix)
#   Phase 7: T0-07, T0-11, T0-12 — Hardcoded names cleanup
#   Phase 8: T0-06, T0-13, T0-14, T0-15 — Verify auto-resolved
#
# After Phase 2, re-diagnose: T0-06/T0-10/T0-11 may self-resolve 
# once phantom data is eliminated.
#
# After Phase 3, re-diagnose: T0-13 (scoreboard) may self-resolve 
# once real game data persists correctly.
#
# Each phase uses the safe-fix-protocol (8 gates).
# One bug per commit. Revert on any failure.

---

## PHASE 1: Fix Roster Data — T0-08 (Identical Rosters)

This is the MOST IMPORTANT fix. Every team has the same procedurally-
generated roster. Real SMB4 players are not loading into franchise 
games. This corrupts everything downstream.

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

Bug: T0-08 — All 20 teams share identical rosters in GameTracker.
Diagnostic evidence: MOONSTARS lineup = J. MARTINEZ SS, A. SMITH CF, 
D. JONES LF... MOOSE and BEEWOLVES have same pattern.

GATE 2 was already done in diagnostic. Proceed to GATE 3.

=== GATE 3: UNDERSTAND ===

This bug has TWO possible root causes. You must determine which one 
(or both) before fixing.

ROOT CAUSE A: GameTracker generates placeholder rosters instead of 
reading real team data.

ROOT CAUSE B: Franchise passes team IDs to GameTracker, but 
GameTracker doesn't look up the real roster from IndexedDB.

ROOT CAUSE C: The franchise wizard imports SMB4 teams but doesn't 
populate player rosters (players exist in League Builder but aren't 
assigned to teams).

STEP 1 — How does GameTracker get its roster?
  grep -n "roster\|lineup\|players\|getPlayers\|loadRoster\|teamRoster\|startingLineup" \
    src/src_figma/app/pages/GameTracker.tsx | head -30
Paste ALL output.

  grep -n "roster\|lineup\|players\|getPlayers\|loadRoster" \
    src/src_figma/hooks/useGameState.ts | head -30
Paste ALL output.

STEP 2 — How does FranchiseHome pass team data to GameTracker?
  grep -n "navigate\|handlePlay\|playGame\|launchGame" \
    src/src_figma/app/pages/FranchiseHome.tsx | head -20
Read the navigate() call that launches GameTracker. Paste the FULL 
state object being passed.

Does it include:
  - Team IDs? YES/NO
  - Player roster arrays? YES/NO
  - Lineup order? YES/NO

STEP 3 — How does GameTracker receive and use the data?
  grep -n "useLocation\|location\.state\|routeState\|props\." \
    src/src_figma/app/pages/GameTracker.tsx | head -15
Read the destructure. Paste it.

After receiving team IDs, does GameTracker:
  a) Query IndexedDB for real rosters? → Show the query
  b) Use hardcoded/generated placeholder rosters? → Show the generator
  c) Read from route state directly? → Show the roster in state

STEP 4 — Check if real players exist in IndexedDB
  Open Playwright. Query the kbl-league-builder database:
  
  // How many players exist?
  // What teams are they assigned to?
  // Pick one team — what are the player names?
  
  Paste results. Do REAL SMB4 player names exist in the DB?
  (Names like "Hammer Longballo", "Kayo Niomo", not "J. MARTINEZ")

STEP 5 — Identify the gap
Based on Steps 1-4:
  IF real players exist in DB but GameTracker doesn't query them:
    → Fix: wire GameTracker to query real rosters from IndexedDB
  IF real players exist but aren't assigned to teams:
    → Fix: franchise setup needs to assign players to teams
  IF real players DON'T exist in DB:
    → Fix: franchise creation wizard needs to import SMB4 player data
  IF GameTracker generates placeholder rosters:
    → Fix: remove the generator, use real data instead

=== GATE 4: PROPOSE ===

State your fix. Address:
  - Where does the real roster data live?
  - What's the pipeline from DB → GameTracker display?
  - What's currently broken in that pipeline?
  - What will you change?

=== GATES 5-8: Standard protocol ===

For GATE 7 (Runtime Verify):
  Start a franchise game in Playwright.
  Check: do the two teams have DIFFERENT rosters?
  Check: do player names match real SMB4 names (not J. MARTINEZ)?
  Check: does each team have their own unique set of players?

  git add -u && git commit -m "T0-08: Fix franchise roster loading — [root cause]"
```

---

## PHASE 2: Fix Phantom Bullpen Stats — T0-09

Pre-loaded fake stats corrupt everything. Once this is fixed, T0-06 
(inflated post-game stats) and T0-10 (fame from phantoms) should 
auto-resolve.

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

Bug: T0-09 — On game start (before ANY at-bat), bullpen shows 
R. LOPEZ 4.2 IP 67p, S. WHITE 5.0 IP 72p. These phantom stats 
persist and corrupt post-game totals.

=== GATE 3: UNDERSTAND ===

STEP 1 — Find where bullpen data is initialized:
  grep -n "bullpen\|BullPen\|pitcherStats\|bullpenStats\|pitcherList" \
    src/src_figma/app/pages/GameTracker.tsx | head -30
  grep -n "bullpen\|BullPen\|pitcherStats\|initPitcher\|pitcherInit" \
    src/src_figma/hooks/useGameState.ts | head -30
Paste ALL output from both.

STEP 2 — Read the initialization:
Find where pitchers get their initial stats at game start.
Paste the initialization code.

Are the initial values:
  a) All zeros (correct for a new game)? 
  b) Pre-loaded with sample/demo values?
  c) Loaded from a previous game's data?
  d) Coming from season stats instead of being game-only?

STEP 3 — Find the source of phantom values:
  grep -rn "4\.2\|5\.0\|67\|72" \
    src/src_figma/ --include="*.tsx" --include="*.ts" | head -20
  grep -rn "SAMPLE\|DEMO\|MOCK\|PLACEHOLDER\|defaultPitcher" \
    src/src_figma/app/pages/GameTracker.tsx | head -20
Paste ALL output.

STEP 4 — Also check: is there a "bullpen component" that shows 
pitcher stats independently of game state?
  grep -rn "BullpenPanel\|PitcherPanel\|BullpenDisplay\|pitcherSidebar" \
    src/src_figma/ --include="*.tsx" | head -10
Paste output. Read that component. Where does IT get its data?

=== GATE 4: PROPOSE ===

The fix should ensure:
  - At game start, ALL pitcher stats are 0 (IP, P, H, R, ER, K, BB)
  - Only real game events increment these stats
  - The bullpen display reads from game state, not from preset data

=== GATES 5-8: Standard protocol ===

For GATE 7 (Runtime Verify):
  Start a new game in Playwright.
  BEFORE any at-bat: check bullpen display.
  All pitchers should show 0.0 IP, 0 P, 0 H, etc.
  Play one at-bat (strikeout). Check: only the active pitcher's 
  K count should be 1. All others still 0.

AFTER this fix, check if these auto-resolved:
  - T0-06 (inflated stats): start game, play a few at-bats, 
    check post-game — are stats reasonable now?
  - T0-10 (fame from phantoms): does fame still trigger at game 
    start with no real events?

Report which issues auto-resolved vs still broken.

  git add -u && git commit -m "T0-09: Remove phantom bullpen stats — [root cause]"
```

---

## RE-DIAGNOSE CHECKPOINT (after Phases 1-2)

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Read CLAUDE.md.

CHECKPOINT — Re-diagnose after data fixes.

DO NOT CHANGE CODE. Observe and report only.

With roster data fixed (Phase 1) and phantom stats removed (Phase 2), 
re-test these issues to see if they auto-resolved:

1. T0-06 (inflated stats): Play a game, check post-game box score.
   Are stats reasonable now? (e.g., starter IP ≤ 7.0, K ≤ 21)
   RESOLVED / STILL BROKEN: [details]

2. T0-10 (fame from phantoms): Does fame trigger at game start?
   RESOLVED / STILL BROKEN: [details]

3. T0-11 (pitch count wrong name): After half-inning, does pitch 
   count dialog show the CORRECT pitcher name?
   RESOLVED / STILL BROKEN: [details]

4. T0-07 (Tigers/Sox in post-game): Does post-game show real team 
   names now?
   NOTE: This probably didn't auto-resolve — it's likely a separate 
   hardcoded string issue.
   RESOLVED / STILL BROKEN: [details]

5. T0-02 (pitcher panel): Does the sidebar pitcher panel switch 
   between pitchers at half-inning transitions?
   RESOLVED / STILL BROKEN: [details]

Update spec-docs/TIER0_DIAGNOSTIC.md with results.

Report: "X of 5 issues auto-resolved. Y still need individual fixes."
```

---

## PHASE 3: Wire Game Persistence — T0-05

The #1 critical bug. Played games are completely lost.

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

Bug: T0-05 — After completing a PLAYED game, nothing persists. 
Standings all 0-0, schedule unchanged, game completely lost.

Diagnostic evidence: Console shows "[endGame] Game archived for 
post-game summary" but NO processCompletedGame, NO save, NO 
standings, NO schedule logs.

Diagnostic hypothesis: "endGame() archives for display only; 
processCompletedGame() is wired in SIM path but NOT in PLAY path."

=== GATE 3: UNDERSTAND ===

STEP 1 — Read endGame() in useGameState.ts:
  grep -n "endGame\|function.*endGame\|const.*endGame" \
    src/src_figma/hooks/useGameState.ts | head -10
Read the FULL function body. Paste it.

Does it call processCompletedGame()? YES/NO
Does it call ANYTHING that persists to IndexedDB? YES/NO
What does it actually do? List every action.

STEP 2 — Read processCompletedGame():
  grep -n "processCompletedGame" \
    src/utils/processCompletedGame.ts | head -5
Read the function. Paste the first 40 lines.

What does it do? List every persistence action:
  - Schedule update?
  - Standings update?
  - Season stats?
  - Career stats?

STEP 3 — How is processCompletedGame called in SIM path?
  grep -rn "processCompletedGame" \
    src/ --include="*.ts" --include="*.tsx" | grep -v ".test." | head -20
Paste ALL output. Which files call it?

The SIM path (batch sim from FranchiseHome) calls it. The PLAY path 
(endGame in useGameState) does NOT. That's the gap.

STEP 4 — What data does processCompletedGame need?
Read its function signature and parameters. Paste them.
Is the data that endGame() has available compatible with what 
processCompletedGame() expects?

If YES: the fix is adding the call.
If NO: you need to transform the data first.

=== GATE 4: PROPOSE ===

The fix should be: after endGame() archives for display, ALSO call 
processCompletedGame() with the game result data.

Risks:
  - processCompletedGame() might expect a different data format 
    than what endGame() produces
  - It might be called at the wrong point (before post-game display)
  - It might double-persist if the user plays the same game twice

Address each risk in your proposal.

=== GATES 5-8: Standard protocol ===

For GATE 7 (Runtime Verify):
  Play a full game in Playwright. Complete it via END GAME → POST-GAME → CONTINUE.
  Return to franchise.
  Check:
    1. Standings: does the winning team show 1-0?
    2. Schedule: is Game 1 marked as completed?
    3. Today's Game: does it show Game 2 (not Game 1 again)?
  Query IndexedDB to confirm.

  git add -u && git commit -m "T0-05: Wire processCompletedGame into PLAY path endGame flow"
```

---

## PHASE 4: Fix CS 3rd Out — T0-03

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

Bug: T0-03 — Caught stealing for 3rd out doesn't end half-inning. 
Game gets stuck with 3 out dots showing.

=== GATE 3: UNDERSTAND ===

STEP 1 — Find CS handling:
  grep -n "caughtStealing\|CS\b\|caught.*steal\|stealResult.*out\|handleCS\|recordCS" \
    src/src_figma/hooks/useGameState.ts | head -20
Paste ALL output. Read the CS handler. Paste it FULLY.

STEP 2 — Find out-count increment in CS flow:
Does the CS handler increment the out count? Trace through:
  - CS recorded → out count goes from 2 to 3?
  - After increment, is there a check for outs >= 3?
  - If check exists, does it call the inning-flip function?

STEP 3 — Compare to the at-bat out flow:
  grep -n "recordOut\|handleOut\|processOut" \
    src/src_figma/hooks/useGameState.ts | head -10
Read the standard at-bat out handler. Paste the section that 
checks for 3 outs and triggers inning flip.

The CS handler should follow the SAME pattern but probably doesn't.

STEP 4 — Check OTHER event outs more broadly:
CS is not the only "other" event that can produce an out.
  grep -n "OTHER\|handleOther\|otherEvent\|otherOutcome" \
    src/src_figma/hooks/useGameState.ts | head -20
Are there other events (pickoff, rundown, interference) that could 
produce outs? Do ANY of them check for 3 outs?

=== GATE 4: PROPOSE ===

The fix: after ANY out (at-bat or baserunning), check if outs >= 3 
and trigger half-inning end if so.

Risk: the inning-flip function may clear base runners. If it runs 
mid-CS-handler, it could corrupt state. Ensure the CS handler fully 
completes before the inning flip triggers.

=== GATES 5-8: Standard protocol ===

For GATE 7 (Runtime Verify):
  In Playwright: get to 2 outs, get runner on 1B, record CS.
  Does the half-inning end? Screenshot showing inning flipped.
  If UI doesn't expose CS trigger easily, describe what you tried.

  git add -u && git commit -m "T0-03: Fix baserunning outs triggering half-inning end"
```

---

## PHASE 5: Fix Auto Game-End — T0-01

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

Bug: T0-01 — Game doesn't auto-detect regulation end. User must 
manually click END GAME button. After bottom of final inning with 
one team ahead, game just continues to next inning.

=== GATE 3: UNDERSTAND ===

STEP 1 — Find end-game detection:
  grep -n "checkGameEnd\|isGameOver\|shouldEndGame\|gameEnd\|regulationEnd\|detectEnd\|autoEnd" \
    src/src_figma/hooks/useGameState.ts | head -20
Paste ALL output.

Does a detection function exist? YES/NO
If YES: paste it. Is it called? Where?
If NO: one needs to be created.

STEP 2 — Find the inning transition:
  grep -n "advanceInning\|nextInning\|halfInningEnd\|flipInning\|newHalfInning" \
    src/src_figma/hooks/useGameState.ts | head -20
Read the transition function. Paste it.

Is there ANY check for "should the game end?" in this function?

STEP 3 — Find game length config:
  grep -n "totalInnings\|numInnings\|gameLength\|innings.*config\|INNINGS" \
    src/src_figma/hooks/useGameState.ts \
    src/src_figma/app/pages/GameTracker.tsx \
    src/engines/ -r --include="*.ts" | head -20
Paste output. How many innings is configured? Is it 6? 9? Configurable?

=== GATE 4: PROPOSE ===

The detection should check at EVERY half-inning transition:

After TOP of inning N (where N >= totalInnings):
  - If home team leads → GAME OVER (home wins without batting)

After BOTTOM of inning N:
  - If either team leads → GAME OVER
  - If tied → EXTRA INNINGS (continue)

After BOTTOM of extra inning:
  - If home scores go-ahead run → WALK-OFF (already wired in T0-14)

The detection should fire AUTOMATICALLY — user should never need 
to click END GAME for a normal game conclusion.

=== GATES 5-8: Standard protocol ===

For GATE 7 (Runtime Verify):
  Play a game to the final inning in Playwright.
  When one team leads after the final inning, does the game 
  auto-end without user clicking END GAME?

  git add -u && git commit -m "T0-01: Add auto game-end detection at regulation end"
```

---

## PHASE 6: Fix Error Flow — T0-04

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

Bug: T0-04 — OTHER → E → field zone tap → returns to base state. 
Error never recorded. Tested twice.

=== GATE 3: UNDERSTAND ===

STEP 1 — Trace the E flow step by step:
  grep -n "'E'\|\"E\"\|errorMode\|handleError\|errorFlow\|selectError\|ERROR\|reachOnError" \
    src/src_figma/app/pages/GameTracker.tsx | head -30
Paste ALL output.

Read the OTHER → E handler. Paste it.
Read the zone tap callback when in "error mode". Paste it.

STEP 2 — What SHOULD happen after zone tap:
After the user taps a zone in error mode, the system should:
  1. Identify which fielder committed the error (from zone)
  2. Put the batter on first base
  3. Advance any existing runners as appropriate
  4. Record the error in game state
  5. Complete the at-bat
  6. Advance to next batter

STEP 3 — Where does execution stop?
Walk through the code line by line from zone tap.
Find the EXACT line where execution ends without completing 
the flow. Paste that line and explain why it stops.

Common causes:
  - Zone callback sets state but never calls recordAtBat/recordError
  - Error outcome panel should appear but the mode transition fails
  - The callback resets to base state instead of advancing

=== GATE 4: PROPOSE ===

State what's missing and what you'll add.

=== GATES 5-8: Standard protocol ===

For GATE 7 (Runtime Verify):
  In Playwright: start at-bat, click OTHER → E → tap field zone.
  Does batter reach 1B? Is error recorded? Does next batter come up?

  git add -u && git commit -m "T0-04: Fix error at-bat flow — complete E outcome after zone tap"
```

---

## PHASE 7: Hardcoded Names Cleanup — T0-07, T0-11, T0-12

These may have partially auto-resolved after Phase 1 (roster fix). 
Check first, fix only what's still broken.

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

THREE HARDCODED NAME ISSUES. Check which are still broken after 
Phases 1-2.

First, run the re-diagnose checkpoint from earlier. Then fix only 
what remains.

=== T0-07: Post-game uses Tigers/Sox ===

  grep -n "TIGERS\|SOX\|Tigers\|Sox" \
    src/src_figma/app/pages/GameTracker.tsx | head -20
Paste ALL output.

For each match: is it in the post-game section? Read ±5 lines.
Replace hardcoded names with dynamic team names from game state.

=== T0-11: Pitch count dialog always shows S. WHITE ===

  grep -n "pitchCount\|PitchCount\|pitch.*dialog\|pitcherName.*pitch" \
    src/src_figma/app/pages/GameTracker.tsx | head -20
Paste output.

Find where the dialog gets the pitcher name. Is it reading from 
the ACTIVE pitcher state (which should switch per half-inning) or 
from a hardcoded/initial value?

Fix: read from the current active pitcher, not a static reference.

=== T0-12: Beat Reporters hardcoded ===

  grep -n "TigersInsider\|SoxBeatWriter\|beatReport\|BeatReporter" \
    src/src_figma/app/pages/GameTracker.tsx | head -20
Paste output.

This may be a larger feature issue (beat reporters need dynamic 
content from game events). If the entire beat reporter system is 
hardcoded placeholder content: write a TODO and move on.
If just the team names are hardcoded: swap for dynamic names.

=== GATES 5-8: Standard protocol ===

  git add -u && git commit -m "T0-07/11/12: Replace hardcoded team/player names in post-game + dialogs"
```

---

## PHASE 8: Verify Auto-Resolved Issues

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Read CLAUDE.md.

VERIFICATION — Check if remaining issues auto-resolved.
DO NOT CHANGE CODE unless a quick fix is obvious.

Play a full game in Playwright. Then check:

1. T0-06 (inflated stats): Is post-game box score reasonable?
   (Starter IP ≤ 7.0, K ≤ 21 for 7 innings)
   RESOLVED / STILL BROKEN

2. T0-10 (fame from phantoms): Does fame trigger only from 
   real game events (not at game start)?
   RESOLVED / STILL BROKEN

3. T0-13 (scoreboard blanks): Do inning scores fill in correctly?
   RESOLVED / STILL BROKEN

4. T0-14 (LI: NaN): Does manager moment show a real LI number?
   RESOLVED / STILL BROKEN

5. T0-15 (9-inning header): Does post-game show correct number 
   of innings? (may be cosmetic / by design)
   RESOLVED / ACCEPTABLE

6. T0-02 (pitcher panel): Does sidebar switch pitchers at 
   half-inning transitions?
   RESOLVED / STILL BROKEN

For any STILL BROKEN: write a brief description of what's still 
wrong and add to backlog for Tier 1.

Update spec-docs/TIER0_DIAGNOSTIC.md with final status.
Update spec-docs/SESSION_LOG.md.

Report final status table:

| ID | Status | Notes |
|----|--------|-------|
| T0-01 | FIXED/OPEN | |
| T0-02 | FIXED/OPEN/AUTO-RESOLVED | |
| T0-03 | FIXED/OPEN | |
| T0-04 | FIXED/OPEN | |
| T0-05 | FIXED/OPEN | |
| T0-06 | FIXED/OPEN/AUTO-RESOLVED | |
| T0-07 | FIXED/OPEN | |
| T0-08 | FIXED/OPEN | |
| T0-09 | FIXED/OPEN | |
| T0-10 | FIXED/OPEN/AUTO-RESOLVED | |
| T0-11 | FIXED/OPEN | |
| T0-12 | FIXED/OPEN/DEFERRED | |
| T0-13 | FIXED/OPEN/AUTO-RESOLVED | |
| T0-14 | FIXED/OPEN/AUTO-RESOLVED | |
| T0-15 | FIXED/OPEN/ACCEPTABLE | |
```
