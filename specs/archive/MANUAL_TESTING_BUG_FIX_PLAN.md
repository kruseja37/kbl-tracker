# MANUAL TESTING BUG FIX PLAN — COMPREHENSIVE EDITION
#
# Source: User manual testing + prior session backlog
# 
# Organized into 4 tiers by severity:
#   TIER 0: Game-breaking (can't complete a game or season)
#   TIER 1: Wrong results (game completes but data is wrong)
#   TIER 2: Missing wiring (feature exists but not connected)
#   TIER 3: Missing features (not built yet)
#
# Within each tier, organized by area:
#   [GT] = GameTracker (in-game)
#   [FR] = Franchise mode (season management)
#   [DATA] = Data pipeline (persistence/aggregation)
#
# Execution: Fix Tier 0 first. Verify. Then Tier 1. Etc.
# Same rules as previous fix plan — read CLAUDE.md, paste before edit,
# canary checks after every batch.

---

## ═══════════════════════════════════════════════════════════
## TIER 0: GAME-BREAKING — Can't complete a game or season
## ═══════════════════════════════════════════════════════════

### T0-01 [GT] End-of-game not triggered correctly
**Report:** Season should be 6-inning games but after top of 6th 
with home team ahead, game continues. Also doesn't trigger after 
top of 9th. No end-game trigger at all.
**Impact:** Cannot complete any game. Blocks ALL testing.

### T0-02 [GT] Pitcher doesn't change each half-inning
**Report:** Home pitcher pitches every half-inning (both top and 
bottom). The away team's pitcher never takes the mound.
**Impact:** Completely wrong game state. All pitcher stats wrong.

### T0-03 [GT] Third out on basepaths doesn't end half-inning
**Report:** When runner thrown out (caught stealing) for 3rd out, 
tracker doesn't end half-inning. Next batter comes up with 3 outs 
on scoreboard.
**Impact:** Game state corrupted. Infinite batters per inning.

### T0-04 [GT] Error (E) selection dead-ends the at-bat flow
**Report:** Selecting "E" from OTHER → prompted for ball landing → 
nothing happens after. At-bat can't advance.
**Impact:** Can't record errors. Must restart/abandon at-bat.

### T0-05 [FR] Game results don't persist back to franchise
**Report:** After game complete, Today's Game shows same game. 
Schedule shows no completion. Standings not updated. Nothing from 
GameTracker connects to franchise.
**Impact:** Playing games has no effect. Season can't progress.

### T0-06 [FR] Fresh franchise starts with pre-completed games
**Report:** Schedule for new franchise already has completed games. 
Not a fresh state.
**Impact:** Season starts corrupted.

---

## ═══════════════════════════════════════════════════════════
## TIER 1: WRONG RESULTS — Game completes but data is wrong
## ═══════════════════════════════════════════════════════════

### T1-01 [GT] Fame events tied to wrong player / aggregated to team
**Report:** Meltdown fame (-1.0) triggers nonsensically. Multi-HR 
game fame triggers on a comeback single. All fame scenarios tied 
to one player or whole team instead of tracking individuals.
**Impact:** Fame system produces garbage data.

### T1-02 [GT] Pinch runner doesn't get credit / name doesn't update
**Report:** Subbing in pinch runner doesn't change player name on 
base. Unclear if PR gets credit for SB, CS, runs scored, TOOTBLAN.
**Impact:** Wrong player gets baserunning stats.

### T1-03 [GT] Runner name changes to "R3" after stolen base to third
**Report:** Once runner steals third, name changes to generic "R3" 
instead of player name.
**Impact:** Lost player identity on bases.

### T1-04 [GT] Ghost runner after batter thrown out advancing
**Report:** Batter gets hit, thrown out advancing → runner icon stays 
on base. No record of which fielders involved.
**Impact:** Base state display wrong. Missing fielding credits.

### T1-05 [GT] Drag-and-drop fielding inference not working
**Report:** User clicks out → drags 3B → clicks 2B → clicks 1B → 
clicks DP → then STILL prompted to assign putouts/assists manually. 
Should auto-infer: 3B=assist, 2B=putout+assist, 1B=putout.
Same for flyout with tag-up throw.
**Impact:** Tedious UX. Possibly wrong fielding credits.

### T1-06 [GT] OUT/BALL IN PLAY incorrectly triggers error prompt
**Report:** Sometimes selecting OUT and dragging infielder → 1B 
triggers an error prompt even though error wasn't selected.
**Impact:** Confusing flow. May record wrong outcome.

### T1-07 [GT] Runs scored display sporadic on scoreboard
**Report:** Runs scored show sometimes for top of inning, sometimes 
not, sometimes for bottom. Seems random. May be related to 
minimizing/expanding scoreboard.
**Impact:** Scoreboard unreliable.

### T1-08 [GT] End-of-game summary broken
**Report:** Doesn't correctly assign stats to right players. Box 
score doesn't show stats from this game. Doesn't show batters.
**Impact:** Post-game review useless.

### T1-09 [GT] Mojo/Fitness weighted factors possibly backwards
**Report:** Locked In shows 1.1x but increased mojo should give 
temporarily higher ratings (so multiplier should be < 1.0 for 
difficulty, or > 1.0 for boost depending on which direction).
**Impact:** All mojo-adjusted calculations wrong.

### T1-10 [FR] Pitcher rotation not correct in franchise SIM
**Report:** Manny Kays is SP but won reliever of year with 48 saves. 
SIM doesn't correctly account for SP/RP/CL roles.
**Impact:** Season stats unrealistic.

### T1-11 [FR] Traits are made-up, not real SMB4 traits
**Report:** Need to verify traits against SMB4 reference PDF. Some 
traits appear to be invented.
**Impact:** Player data inaccurate.

---

## ═══════════════════════════════════════════════════════════
## TIER 2: MISSING WIRING — Feature exists but not connected
## ═══════════════════════════════════════════════════════════

### T2-01 [FR] Remaining dummy/mock data in franchise UI
**Report:** Systematic issue. 28+ mock data blocks identified in 
prior audit (MOCK_DATA_INVENTORY.md). Many screens show hardcoded 
data instead of real franchise data.
**Impact:** Confusing mix of real and fake data everywhere.

### T2-02 [GT] Lineup card doesn't reflect pitcher changes
**Report:** Lineup card appears fully static. Substitutions don't 
update the displayed lineup.
**Impact:** Can't verify lineup state during game.

### T2-03 [GT] Beat writers show dummy data
**Report:** Beat writers not tied to teams. Static hardcoded tweets 
instead of dynamic content from game events.
**Impact:** Beat writer feature non-functional.

### T2-04 [FR] Salaries not calculated at season start
**Report:** All players show $0.0 salary. Trade tab useless.
**Impact:** Trade system and salary cap non-functional.

### T2-05 [FR] Team Hub shows no activity for teams with games played
**Report:** Beewolves are 0-2 but players have no stats, fan morale 
empty. Stats not flowing from games to team hub display.
**Impact:** Team Hub useless.

### T2-06 [FR] No box scores for simulated games
**Report:** Games that were batch-simmed have no viewable box score.
**Impact:** No way to review sim results.

### T2-07 [FR] Tootwhistle Times / AI narratives not wired
**Report:** No stories show. Fan morale not active.
**Impact:** Narrative features non-functional.

### T2-08 [GT] Manager decision moments not surfaced
**Report:** Sub in PH who gets a hit → should be a manager moment. 
No proof of activation for any manager decisions.
**Impact:** Manager system invisible.

### T2-09 [GT] Immaculate inning not tracked/displayed
**Report:** No sign of immaculate inning detection or tracking.
**Impact:** Missing special event.

### T2-10 [FR] No lineup logic for roster construction
**Report:** Pitchers in lineup without position. Multiple players 
at same position. Other positions empty. No auto-lineup intelligence.
**Impact:** Rosters make no sense without manual management.

### T2-11 [FR] Errors not connected to scoreboard
**Report:** Error count doesn't update on scoreboard display.
**Impact:** Scoreboard incomplete.

---

## ═══════════════════════════════════════════════════════════
## TIER 3: MISSING FEATURES — Not built yet
## ═══════════════════════════════════════════════════════════

### T3-01 [FR] Pre-game lineup screen for franchise games
**Report:** Exhibition mode has lineup/starter selection. Franchise 
mode goes straight to game with no chance to pick starter or 
reorder lineup.
**Impact:** No strategic pregame decisions.

### T3-02 [FR] View Roster button does nothing in season setup
**Report:** Button exists but onClick is dead/no-op.

### T3-03 [FR] No way to remove games from schedule
**Report:** User wants to manually manage schedule. Currently no 
way to delete scheduled games.

### T3-04 [FR] Museum data pipeline
**Report:** Known not-built. No data flows to museum after games.

### T3-05 [FR] Auto-generated player names from SMB4 name doc
**Report:** Need to verify name generation uses actual SMB4 first/ 
last name pools.

### T3-06 [FR] Milestone watch UI
**Report:** Known not-built from prior triage.

### T3-07 [FR] fWAR/rWAR display columns
**Report:** Calculators run but no UI to show values.

---

## ═══════════════════════════════════════════════════════════
## EXECUTION PLAN
## ═══════════════════════════════════════════════════════════

### PHASE 1: Tier 0 — Game Breaking (6 issues)
Must fix ALL before any other work. These prevent basic gameplay.

| Batch | Issues | Focus |
|-------|--------|-------|
| G1 | T0-01, T0-02, T0-03 | GameTracker core: end-game, pitchers, outs |
| G2 | T0-04 | Error flow dead-end |
| G3 | T0-05, T0-06 | Franchise persistence + fresh state |

### PHASE 2: Tier 1 — Wrong Results (11 issues)
Fix after Tier 0 verified. These produce incorrect data.

| Batch | Issues | Focus |
|-------|--------|-------|
| H1 | T1-01, T1-09 | Fame + mojo calculation logic |
| H2 | T1-02, T1-03, T1-04 | Runner identity + base state |
| H3 | T1-05, T1-06 | Fielding inference + error prompts |
| H4 | T1-07, T1-08 | Scoreboard display + post-game summary |
| H5 | T1-10, T1-11 | Franchise SIM roles + traits verification |

### PHASE 3: Tier 2 — Missing Wiring (11 issues)
Fix after Tier 1 verified. These are disconnected features.

| Batch | Issues | Focus |
|-------|--------|-------|
| J1 | T2-01, T2-04 | Mock data scrub + salary calculation |
| J2 | T2-02, T2-03 | Lineup card + beat writers |
| J3 | T2-05, T2-06 | Team Hub stats + box scores |
| J4 | T2-07, T2-08, T2-09 | Narratives + manager + immaculate |
| J5 | T2-10, T2-11 | Lineup logic + scoreboard errors |

### PHASE 4: Tier 3 — Missing Features (7 issues)
Build after wiring is solid. These are new feature work.

| Batch | Issues | Focus |
|-------|--------|-------|
| K1 | T3-01, T3-02 | Pre-game lineup + view roster |
| K2 | T3-03 | Schedule management |
| K3 | T3-04, T3-05, T3-06, T3-07 | Museum + names + milestones + WAR display |

---

## ═══════════════════════════════════════════════════════════
## TOTAL SCOPE
## ═══════════════════════════════════════════════════════════

| Tier | Count | Priority |
|------|-------|----------|
| 0 - Game Breaking | 6 | MUST FIX NOW |
| 1 - Wrong Results | 11 | FIX NEXT |
| 2 - Missing Wiring | 11 | FIX AFTER |
| 3 - Missing Features | 7 | BUILD LAST |
| **TOTAL** | **35** | |

Manual testing checkpoint after each phase completion.
