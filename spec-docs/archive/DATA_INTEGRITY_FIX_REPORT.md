# Data Integrity Fix Report

**Date:** 2026-02-12
**Batches Completed:** 1A-i, 1A-ii, 1B, 2A, 2B, 2C, 3, F1, F2, F3
**Build:** PASS (exit 0)
**Tests:** 5,653 / 5,653 passing, 0 failing (134 test files)
**Commits:** 7629f29 (2A), d393bfd (2B), 6b5dd45 (2C), def25eb (3), d790a72 (F1), 1f39f15 (F2), 4b0e11e (F3)
*Prior session commits: 1A-i, 1A-ii, 1B*

---

## Final Status Table

| # | Issue | Batch | Status | Evidence |
|---|-------|-------|--------|----------|
| 1 | completeGameInternal pitcher stats | 1A-i | **FIXED** | useGameState.ts:3337 — CRIT-01 fix restores playerStats and pitcherStats Maps |
| 2 | milestoneAggregator playerName | 1B | **FIXED** | milestoneAggregator.ts:82,105 — playerName param threaded to getOrCreateCareerBatting |
| 3 | W/L/SV/H/BS aggregation | 1B | **FIXED** | seasonAggregator.ts:231-234 — wins/losses/saves computed from pitcherStats.decision |
| 4 | Fielding stats persistence | 1A-i | **FIXED** | useGameState.ts:2932,3148 — CRIT-05 FIX queries IndexedDB fielding events in both completeGameInternal and endGame |
| 5 | runnersAfter null | 1A-ii | **FIXED** | useGameState.ts:2309 — CRIT-06 fix |
| 6 | basesReachedViaError | 1A-ii | **FIXED** | useGameState.ts:3020,3219 — CRIT-06 counts runners from tracker in both paths |
| 7 | autoCorrectResult orphaned | 2C | **FIXED** | useGameState.ts:1562-1591 — MAJ-07 wired into recordOut(), converts RunnerAdvancement→RunnerOutcome, FO→SF and GO→DP auto-corrections active |
| 8 | Loss decision logic | 2A | **ALREADY FIXED** | useGameState.ts:796 — D-01 FIX with lead-change tracking already implemented |
| 9 | Substitution validation | F3 | **FIXED** | useGameState.ts:969-973,1070-1121,2741-2826 — MAJ-09: awayLineupStateRef/homeLineupStateRef track full LineupState; validateSubstitution() wired at :2746; callers in GameTracker.tsx:827,1699 check result |
| 10 | Pitch count prompt at game end | 2B | **ALREADY FIXED** | useGameState.ts:3311 — endGame() triggers setPitchCountPrompt({ type: 'end_game' }) |
| 11 | HBP/SF/SAC/GIDP tracking | 1B | **FIXED** | useGameState.ts:84,88-90 — MAJ-11 fields added to PlayerStats; tracked at lines 1649,1652 |
| 12 | WPA always 0 | F2 | **FIXED** | winExpectancyTable.ts (360 lines), wpaCalculator.ts (281 lines), 26 tests in wpaCalculator.test.ts; integrated at useGameState.ts recordHit/recordOut/recordWalk/recordD3K/recordError |
| 13 | isPlayoff flag | 2A | **FIXED** | GameTracker.tsx:1296,1335 — MAJ-13 uses isPlayoffGame from route state |
| 14 | Walk-off detection | 2A | **FIXED** | GameTracker.tsx:1881-1902 — MAJ-14 computes isWalkOff = homeWon && !gameState.isTop |
| 15 | Team record in post-game | 2A | **FIXED** | GameTracker.tsx:109-110 — MAJ-15 reads awayRecord/homeRecord from route state; FranchiseHome passes getTeamRecord() |
| 16 | SB/CS in WAR calculations | 2B | **FIXED** | useWARCalculations.ts:58-59,137-138 — MAJ-16 added stolenBases/caughtStealing to SimpleBattingStats |
| 17 | Fielding credits integration | 2B | **ALREADY FIXED** | useGameState.ts:2932-2973 — CRIT-05 FIX extracts, maps, and integrates fielding credits |
| 18 | FreeAgencyFlow hooks ordering | 3 | **NO FIX NEEDED** | All hooks precede loading early return (line 436). No violation found. |
| 19 | kbl-gotchas.md outdated | 3 | **UPDATED** | Test count 267→5627, file paths src/storage/→src/utils/, date updated |
| 20 | detection-philosophy.md fame | 3 | **UPDATED** | TOOTBLAN -0.5→-1, Nut Shot labels→actual code event names, added NUT_SHOT_VICTIM |
| 21 | Dead balks field | 3 | **REMOVED** | Removed from 5 files: seasonStorage ×2, careerStorage ×2, liveStatsCalculator |

---

## Counts

- **FIXED:** 16 (#1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11, #12, #13, #14, #15, #16)
  - Of these, #8, #10, #17 were already fixed from prior sessions
  - #9 (substitution validation) fixed in Batch F3
  - #12 (WPA calculation) fixed in Batch F2
- **ALREADY FIXED:** 3 (#8, #10, #17) — included in FIXED count above
- **NO FIX NEEDED:** 1 (#18 — hooks ordering correct)
- **UPDATED (docs):** 2 (#19, #20)
- **REMOVED (dead code):** 1 (#21)

**Total: 16 FIXED + 1 NO FIX NEEDED + 2 UPDATED + 1 REMOVED = 21/21 ALL RESOLVED** ✅

---

## Previously BLOCKED/DEFERRED — Now FIXED

| Issue | Batch | What Was Built |
|-------|-------|----------------|
| #9 Substitution validation | F3 | Full `LineupState` tracking: `awayLineupStateRef`/`homeLineupStateRef` with lineup[], bench[], usedPlayers[], currentPitcher. `validateSubstitution()` wired into `makeSubstitution()`. Callers check `{ success, error }` return. ~200 lines. |
| #12 WPA calculation | F2 | Parametric win expectancy table (`winExpectancyTable.ts`, 360 lines) + WPA calculator (`wpaCalculator.ts`, 281 lines) + 26 tests. Integrated into all 5 event creation sites in useGameState.ts. |

---

## Canary Check Results

| Check | Result |
|-------|--------|
| CANARY 1: Build + Tests | **PASS** — ✓ built, 5653/5653 |
| CANARY 2: No hardcoded team names | **PASS** — 0 hits |
| CANARY 3: No hardcoded season-1 | **PASS** — 0 hits |
| CANARY 4: Pitcher stats defaults | **PASS** — line 934 is createEmptyPitcherStats() initializer |
| CANARY 5: W/L/SV aggregation | **PASS** — uses + in spread (correct pattern) |
| CANARY 6: playerName in milestone | **PASS** — properly threaded |
| CANARY 7: isPlayoff from route | **PASS** — 0 hardcoded false |
| CANARY 8: Walk-off detection | **PASS** — isWalkOff:false only in non-walk-off contexts |

## Regression Check Results

| Check | Expected | Result |
|-------|----------|--------|
| TIGERS/SOX in GameTracker.tsx | 0 | **PASS** — 0 hits |
| season-1 in useFranchiseData.ts | 0 | **PASS** — 0 hits |
| San Francisco Giants in DraftFlow.tsx | 0 | **PASS** — 0 hits |
| disabled.*allRostersValid in FinalizeAdvanceFlow.tsx | 0 | **PASS** — 0 hits |
| MOCK_ in src/src_figma/ | 0 | **PASS** — 0 hits |

## Hardcoded Zero Analysis

| Line | Value | Verdict |
|------|-------|---------|
| 934 | intentionalWalks: 0, hitByPitch: 0, wildPitches: 0 | **Legitimate default** — createEmptyPitcherStats() initializer, counters start at 0 |
| 989-990, 1047-1048 | away/home: { runs: 0, hits: 0, errors: 0 } | **Legitimate default** — linescore initializer for new game |
| 2951, 2968, 3163, 3180 | { putouts: 0, assists: 0, errors: 0 } | **Legitimate default** — "get or create" fallback for fielding tally map |

All hardcoded zeros are legitimate defaults/initializers. No data integrity issues remain.
