# TIER 1: Phase 1 — Re-Check Diagnostic

**Date**: 2026-02-13
**Game**: Beewolves 1, Wild Pigs 0 (6-inning franchise game)
**Method**: Full game via Playwright (1 HR + all strikeouts through 6 innings)

---

## T1-01: Fame Events Per-Player Tracking

**Status: PARTIALLY WORKING — needs investigation**

### Observations
1. **Fame popup appeared**: "💪 MULTI HR 2 +1.0 Fame" after J. Martinez's 1st HR
   - ISSUE: "MULTI HR 2" suggests this is tracking multi-HR milestone,
     but this was the FIRST HR of the game. The "2" may be from doubled stats.
2. **Fame popup appeared**: "🎩 GOLDEN SOMBRERO -1.0 Fame" later in the game
   - CORRECT: Golden Sombrero correctly fired when a batter struck out 4 times.
   - This shows per-player tracking IS working for some events.

### Assessment
Fame events ARE firing and ARE attributed to individual players (not team aggregate).
However, the "MULTI HR 2" event may be triggering incorrectly due to the stat
doubling bug (T1-08). Once T1-08 is fixed, fame events should be re-checked.

**Verdict**: CONDITIONAL — depends on T1-08 stat doubling fix.

---

## T1-07: Runs Scored Display on Scoreboard

**Status: MOSTLY RESOLVED**

### Observations
1. During gameplay, scoreboard correctly showed:
   - Beewolves: 1 run in inning 1, 0 in all others
   - R/H/E updated correctly (1R, 2H, 0E for Beewolves at end)
   - Wild Pigs: 0/0/0 throughout
2. Score header ("BEEWOLVES 1 │ ▲ 1 │ O: │ 0 WILD PIGS") updated correctly
3. Half-inning transitions worked correctly

### Issues Found
- **Post-game scoreboard shows 9 inning columns** for a 6-inning game
  (columns 7, 8, 9 visible with all zeros). Minor cosmetic issue.

**Verdict**: RESOLVED (core functionality works; 9-column cosmetic is minor).

---

## T1-08: End-of-Game Summary / Post-Game Stats

**Status: STILL BROKEN — stats are doubled**

### Observations
1. **Post-game report**: Beewolves win 1-0. Scoreboard line score correct.
2. **POG**: J. Martinez — listed as "2-6 • 2 RBI • 2 R"
   - EXPECTED: 1 HR in the game → 1 H, 1 RBI, 1 R
   - ACTUAL: Shows 2 hits, 2 RBI, 2 runs — exactly DOUBLED
3. **Pitching box score**:
   | Pitcher | IP | H | R | ER | BB | SO |
   |---------|-----|---|---|----|----|-----|
   | R. LOPEZ | 12.0 | 0 | 0 | 0 | 0 | 36 |
   | S. WHITE | 12.0 | 2 | 2 | 2 | 0 | 36 |
   - EXPECTED: 6.0 IP, 18 SO each (3 K per inning × 6 innings)
   - ACTUAL: 12.0 IP, 36 SO — exactly DOUBLED
4. **League Leaders** also show doubled stats:
   - HR: 2 J. MARTINEZ (should be 1)
   - RBI: 2 J. MARTINEZ (should be 1)
   - K: 36 R. LOPEZ (should be 18)
5. **Batting AVG: N/A** — not displaying at all

### Root Cause Hypothesis
Stats appear to be recorded/aggregated twice. Possible causes:
- `completeGameInternal()` called twice at game end
- `endGame()` fires in addition to `completeGameInternal()`
- Season aggregation runs twice on the same game data
- The play-by-play is double-counting events somewhere

### Impact
This affects ALL downstream stats: WAR calculations, league leaders,
season records, career totals, awards voting.

**Verdict**: STILL BROKEN — CRITICAL. Must fix before other T1 issues.

---

## Summary

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| T1-01 | Fame per-player tracking | CONDITIONAL | Works, but affected by T1-08 doubling |
| T1-07 | Scoreboard display | RESOLVED | Core works; minor 9-col cosmetic |
| T1-08 | Post-game summary | STILL BROKEN | All stats doubled — CRITICAL |

## Recommended Next Step
Fix T1-08 (stat doubling) FIRST, as it affects T1-01 fame calculations,
league leaders, WAR, and all downstream stats. Then re-verify T1-01.

The stat doubling bug should be investigated before proceeding with
T1-09 (Mojo/Fitness) since mojo calculations may also use doubled stats.
