# TIER 0 DIAGNOSTIC REPORT
**Date**: 2026-02-13
**Session Type**: DIAGNOSTIC ONLY — NO CODE CHANGES
**Tester**: Claude (Playwright MCP browser automation)
**Franchise**: Super Mega League (SMB4), 20 teams, 32 games/team, Season 1
**Game Played**: MOONSTARS (away) @ WILD PIGS (home), Founder's Field

---

## ENVIRONMENT
| Item | Value |
|------|-------|
| Git status | Clean (no uncommitted changes) |
| Build | PASS (exit 0) |
| Tests | 5,653 passing / 0 failing / 134 files |
| Dev server | `npm run dev` → http://localhost:5173 |
| IndexedDB databases | kbl-schedule (v2), kbl-tracker (v3), kbl-league-builder (v1), kbl-app-meta (v2), kbl-offseason (v1), kbl-playoffs (v1) |
| Schedule | 320 games total, all SCHEDULED, 0 COMPLETED (correct for 20 teams × 32 games) |

---

## BUG TABLE

| ID | Title | Severity | Reproduced? | Details |
|----|-------|----------|-------------|---------|
| T0-01 | No auto game-end detection | CRITICAL | YES | After ▼7 (final regulation inning) with away team leading 1-0, game does NOT end. Continues to ▲8. User must manually scroll to bottom and click 🏁 END GAME button. No detection of regulation end. |
| T0-02 | Pitcher info panel never switches | MAJOR | YES (2×) | Sidebar "PITCHING" panel always shows the FIRST pitcher set (S. WHITE) regardless of half-inning. In ▼ innings when MOONSTARS bat, field correctly shows LOPEZ at P, but sidebar still says "MOONSTARS PITCHING: S. WHITE". Confirmed in 2 separate games. |
| T0-03 | 3rd out on CS does not flip inning | CRITICAL | YES | Setup: ▼1, 2 outs, runner on 1B. Recorded CS (caught stealing). 3 out dots shown but inning did NOT flip. Game stuck — had to record a 4th out (K) to force inning transition. Only then did pitch count dialog appear and inning advance. |
| T0-04 | Error flow dead end | MAJOR | YES (2×) | OTHER → E → field crosshair appears ("TAP WHERE BALL LANDED") → tap zone → returns to base state (HIT/OUT/OTHER). No error outcome panel appears. No error recorded in game state. Tested twice with same result. |
| T0-05 | Game result not persisted | CRITICAL | YES | After completing game via END GAME → POST-GAME REPORT → CONTINUE, returned to franchise. Standings: ALL teams 0-0. Schedule: Game 1 still "NEXT GAME", not marked completed. Records: MOONSTARS 0-0, WILD PIGS 0-0. The entire game was lost. |
| T0-06 | Post-game stats wildly inflated | CRITICAL | YES | POST-GAME REPORT box score: S. WHITE IP=25.0, SO=54, H=4 (should be ~7.0 IP, ~21 SO, 1 H). R. LOPEZ IP=0.0, all zeros. POG B. Davis shown as 2-6 (should be ~1-2). Phantom bullpen stats (pre-loaded 4.2 IP / 5.0 IP) appear to accumulate into final totals. |
| T0-07 | Post-game uses "Tigers"/"Sox" names | MAJOR | YES | POST-GAME REPORT shows "TIGERS" and "SOX" instead of MOONSTARS and WILD PIGS. Same hardcoded names as Beat Reporters panel. Line score header, team names, and "TIGERS WIN!" all use wrong names. |
| T0-08 | All 20 teams share identical rosters | MAJOR | YES | Every team has the exact same player names in the same positions: J. MARTINEZ SS, A. SMITH CF, D. JONES LF, etc. MOONSTARS, WILD PIGS, MOOSE, BEEWOLVES — all identical. Confirmed across 4 teams. |
| T0-09 | Bullpen shows phantom pre-loaded stats | MAJOR | YES | On game start (before ANY at-bat), bullpen shows: R. LOPEZ 4.2 IP 67p, S. WHITE 5.0 IP 72p. These are phantom stats not earned in the current game. They persist throughout and corrupt post-game totals. |
| T0-10 | Fame events fire from phantom stats | MINOR | YES | Fame popups trigger based on phantom bullpen stats: "TEN K GAME +1.0" (before any real Ks), "FIFTEEN K GAME +2.0", "HAT TRICK -0.5", "GOLDEN SOMBRERO -1.0", "PLATINUM SOMBRERO -2.0". All from phantom data, not real game events. |
| T0-11 | Pitch count dialog always shows S. WHITE | MAJOR | YES | End-of-inning pitch count dialog always shows "Pitcher: S. WHITE" regardless of which pitcher was actually pitching. After ▼ innings (MOONSTARS pitching = LOPEZ), dialog still says S. WHITE. |
| T0-12 | Beat Reporters hardcoded to Tigers/Sox | MINOR | YES | Sidebar "BEAT REPORTERS" section references @TigersInsider and @SoxBeatWriter with Tigers/Sox narrative, not actual team names (MOONSTARS/WILD PIGS). |
| T0-13 | Scoreboard inning cells mostly blank | MINOR | YES | After 6+ full innings, scoreboard only shows `0` in WILD PIGS inning 1. All other inning cells blank for both teams. Only the HR in inning 7 populated correctly (`1` for MOONSTARS). Zeroes should fill in per inning. |
| T0-14 | Manager Moment shows LI: NaN | MINOR | YES | MANAGER MOMENT popup displayed "LI: NaN" after the 3rd-out-stuck bug. "High leverage situation (LI: NaN). Bottom 1, 3 outs. Tie game." |
| T0-15 | Post-game shows 9-inning header | INFO | YES | POST-GAME REPORT line score shows innings 1-9 even though we played 7 innings and franchise was set up with default settings. Cosmetic issue — may be by design if SMB4 default is 9. |

---

## SEVERITY SUMMARY
| Severity | Count | IDs |
|----------|-------|-----|
| CRITICAL | 4 | T0-01, T0-03, T0-05, T0-06 |
| MAJOR | 5 | T0-02, T0-04, T0-07, T0-08, T0-09 |
| MINOR | 4 | T0-10, T0-11, T0-12, T0-13 |
| INFO | 1 | T0-14, T0-15 |

---

## DETAILED REPRODUCTION STEPS

### T0-01: No Auto Game-End Detection
1. Create franchise, start game
2. Play through 7 full innings (away team scored HR in ▲7, making it 1-0)
3. Record 3 outs in ▼7 (home team fails to score)
4. **Expected**: Game should detect regulation end (away team leads after ▼7) and trigger END GAME flow
5. **Actual**: Pitch count dialog appears, then game continues to ▲8 as if nothing happened
6. User must scroll to bottom of page and click 🏁 END GAME manually
7. Console shows no `processCompletedGame` or persistence calls

### T0-03: 3rd Out on CS Does Not Flip Inning
1. Get to 2 outs with runner on 1B
2. Click OTHER → CS → END AT-BAT
3. 3 red out dots appear
4. **Expected**: Inning flips (pitch count dialog → next half-inning)
5. **Actual**: Game stays in same half-inning. Batter still at bat. Must record a 4th out to trigger inning flip.

### T0-04: Error Flow Dead End
1. Click OTHER → E
2. Field crosshair overlay appears ("TAP WHERE BALL LANDED")
3. Tap a field zone
4. **Expected**: Error outcome panel (choose which fielder committed error, runner advancement)
5. **Actual**: Returns immediately to base state (HIT/OUT/OTHER). No error recorded.

### T0-05: Game Result Not Persisted
1. Complete game via 🏁 END GAME → confirm
2. Post-game report displays (with wrong data)
3. Click CONTINUE to return to franchise
4. Check standings: All teams 0-0
5. Check schedule: Game 1 still "NEXT GAME", not completed
6. Check Today's Game: Same game, same 0-0 records
7. Console log: `[endGame] Game archived for post-game summary` — but NO `processCompletedGame`, NO `save`, NO `standings`, NO `schedule` logs
8. The endGame() function archives for display but never calls the full persistence pipeline

### T0-06: Post-Game Stats Wildly Inflated
1. Complete game with ~21 Ks per side (all strikeout game)
2. Post-game BOX SCORE shows:
   - S. WHITE: IP=25.0, H=4, R=2, ER=2, SO=54 (impossible — max 7.0 IP / 21 SO in 7-inning game)
   - R. LOPEZ: IP=0.0, H=0, R=0, ER=0, SO=0 (all zeros despite pitching 7 innings)
3. POG stats: B. Davis 2-6, 2 RBI, 2 R (actual: ~1-2, 1 HR, 1 RBI, 1 R)
4. Root cause: Phantom bullpen stats (pre-loaded on game start) accumulate into final totals

### T0-08: Identical Rosters Across All Teams
1. Create franchise with 20 SMB4 teams
2. Start game: MOONSTARS lineup = J. MARTINEZ SS, A. SMITH CF, D. JONES LF, B. DAVIS RF, T. BROWN 1B, C. WILSON 2B, M. GARCIA 3B, J. MARTIN C, R. LOPEZ P
3. Check opponent (WILD PIGS): P. HERNANDEZ CF, K. WASHINGTON SS, L. RODRIGUEZ LF, M. JACKSON RF, N. MARTINEZ 1B, O. THOMPSON 3B, Q. GONZALEZ 2B, R. ADAMS C, S. WHITE P
4. Start different game (MOOSE vs BEEWOLVES): Same rosters as above
5. All 20 teams appear to share the same procedurally-generated roster template — different first initials but same pattern

---

## CONSOLE LOG SUMMARY
| Category | Count | Notes |
|----------|-------|-------|
| Errors | 0 | No console errors during entire session |
| Warnings | 0 | No warnings |
| Exceptions | 0 | No exceptions |
| Notable logs | 5 | See below |

**Notable console logs:**
- `[MAJ-09] Complete Game detected for home-s.-white` — CG detection works
- `[MAJ-02] Fan morale updated — homeWon: false, diff: -1, shutout: false` — Morale system fires
- `[MAJ-04] Dual narratives: Home/Away` — Narrative engine fires
- `[endGame] Game archived for post-game summary` — End game archival works
- **MISSING**: No `processCompletedGame`, no `save`, no `standings`, no `schedule` persistence calls

---

## WHAT WORKS CORRECTLY
1. Franchise creation wizard (6 steps, all work) ✅
2. Schedule generation (320 games for 20 teams) ✅
3. Field display and defensive alignment switching per half-inning ✅
4. HIT flow: field tap → hit outcome (1B/2B/3B/HR) → modifiers → HR distance → runner outcomes → END AT-BAT ✅
5. OUT flow: K/KL → runner outcomes → END AT-BAT ✅
6. Scoreboard run scoring (HR correctly shows 1 in inning 7) ✅
7. Lineup rotation (batters advance through order correctly) ✅
8. Undo button present ✅
9. Basic inning transitions (K-only innings flip correctly) ✅
10. Fame detection system fires (just on wrong data) ✅
11. Fan morale system fires ✅
12. Narrative engine fires ✅
13. Post-game report UI structure (line score, POG, box score, continue) ✅

---

## ROOT CAUSE HYPOTHESES (for investigation, NOT fixes)

### T0-05 (Game Not Persisted) — Likely Root Cause
The `endGame()` function in `useGameState.ts` appears to only archive data for the post-game summary display. It does NOT call `processCompletedGame()` from `src/utils/processCompletedGame.ts`, which is the function that:
- Updates the schedule (marks game COMPLETED)
- Updates standings (W/L records)
- Saves game stats to seasonStorage
- Saves career stats to careerStorage

**Hypothesis**: The GameTracker's endGame flow was built for display only; the full persistence pipeline (`processCompletedGame`) is wired in the SIM path but NOT in the PLAY path.

### T0-03 (3rd Out on CS) — Likely Root Cause
The CS (caught stealing) event handler in `useGameState.ts` likely increments the out count but doesn't check if outs >= 3 to trigger the inning flip. The inning flip check may only run in the `recordOut()` function for standard at-bat outs, not for OTHER event outs.

### T0-06 (Inflated Stats) — Likely Root Cause
Phantom bullpen stats (R. LOPEZ 4.2 IP 67p, S. WHITE 5.0 IP 72p) are pre-loaded in the bullpen display from the start. The box score aggregation picks up these phantom values and adds them to real game events, producing impossible totals.

---

## NEXT STEPS (DO NOT EXECUTE — WAITING FOR USER)
1. Investigate T0-05 root cause: trace `endGame()` in `useGameState.ts` — does it call `processCompletedGame()`?
2. Investigate T0-03 root cause: trace CS handler — does it check outs >= 3?
3. Investigate T0-06 root cause: where do phantom bullpen stats come from?
4. Investigate T0-04 root cause: trace Error flow — what happens after zone tap?
5. Prioritize fixes: T0-05 > T0-03 > T0-06 > T0-01 > T0-04 > T0-02

---

## RE-DIAGNOSE CHECKPOINT (2026-02-14, after Phases 1-2)

**Phases Completed**: T0-08 (roster fix, commit f5a2d3e), T0-09 (phantom stats, commit a8b3a0c)

**Test Game**: SAND CATS (away) @ BLOWFISH (home), Swagger Center
- Played through ~1 inning (8 at-bats: 5 Ks, 1 HR in ▲1, then ended via manual END GAME)
- Real SMB4 player names confirmed: K. ARCHES, L. BRADWICK, OOWANGA, LUMPKINS, FORTH, DELGADO, CARLOCO, MCGEE, OXENSOCKSEN, KAWAGUCHI, J. FOWL

### Checkpoint Results

| ID | Issue | Status | Details |
|----|-------|--------|---------|
| T0-10 | Fame from phantoms | **PARTIALLY RESOLVED** | No phantom fame at game start (T0-09 fix worked). BUT "GOLDEN SOMBRERO -1.0 Fame" triggered after only 6 at-bats — premature/incorrect fame events still fire. Root cause likely tied to T0-02 (all stats attributed to one pitcher). |
| T0-11 | Pitch count wrong name | **PARTIALLY RESOLVED** | No longer shows "S. WHITE" (T0-08 fix worked — real names used). BUT after ▼1, pitch count dialog showed "L. BRADWICK" (▲1 pitcher) instead of K. ARCHES (who pitched ▼1). Tied to T0-02 — pitcher state doesn't switch at half-inning. |
| T0-02 | Pitcher panel never switches | **STILL BROKEN** | In ▼1, sidebar shows "PITCHING: L. BRADWICK" with "SAND CATS" label. Should show K. ARCHES since SAND CATS are the fielding team in ▼1. This is the ROOT CAUSE of T0-11 partial resolution. |
| T0-07 | Post-game uses Tigers/Sox | **STILL BROKEN** | Post-game report shows "TIGERS" and "SOX" in line score, "TIGERS PITCHING", "SOX PITCHING" in box score, "TIGERS WIN!" — all hardcoded. Real team names (SAND CATS, BLOWFISH) NOT used in post-game. |
| T0-06 | Post-game stats inflated | **STILL BROKEN** | Box score: K. ARCHES IP=0.0, H=0, R=0, ER=0, BB=0, SO=0 (all zeros despite pitching ▼1). L. BRADWICK IP=25.2, H=2, R=2, ER=2, BB=0, SO=56 (wildly inflated — impossible for ~1 inning). POG: J. Fowl 2-6, 2 RBI, 2 R (should be ~1-1, 1 HR, 1 RBI, 1 R). Root cause is NOT phantom fallback stats (those were fixed). The inflation is in the post-game stats aggregation in endGame()/PostGameSummary — likely all pitcher stats attributed to one pitcher (T0-02 related), and stats are being multiplied/duplicated somewhere in the pipeline. |
| T0-12 | Beat Reporters hardcoded | **STILL BROKEN** | Sidebar shows @TigersInsider and @SoxBeatWriter with hardcoded Tigers/Sox narrative. Not resolved by data fixes. |
| T0-13 | Scoreboard blanks | **STILL BROKEN** | Line score in post-game shows run scored in inning 7 column (should be inning 1). H=2 despite only 1 HR recorded. Inning-score tracking is fundamentally broken. |

### Summary

**0 of 5 issues auto-resolved** after Phases 1-2. All 5 still need individual fixes.

**Key Insight**: T0-02 (pitcher panel never switches) is a more impactful root cause than initially categorized. It causes:
- T0-11 (wrong pitcher name in dialogs) — because currentPitcherId doesn't update
- T0-06 (inflated stats) — because ALL pitcher stats are attributed to one pitcher
- T0-10 (premature fame) — because fame checks accumulate stats against wrong pitcher

**Revised Fix Priority Recommendation**:
- T0-02 should be elevated to CRITICAL and fixed BEFORE T0-05 (persistence), because persisting corrupted stats will create bad data in IndexedDB
- Suggested new order: T0-02 → T0-05 → T0-03 → T0-01 → T0-04 → T0-07/11/12 → Verify

---

*DIAGNOSTIC COMPLETE. No code was modified. All findings based on live Playwright browser testing.*
