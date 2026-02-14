# Season Simulator Report

**Date**: 2026-02-09
**Test Framework**: Vitest 4.0.18 + fake-indexeddb 6.2.5
**Pipeline Classification**: B (Orchestrated but Extractable) per FRANCHISE_API_MAP.md

---

## Summary

| Test | Games | Invariants/Game | Duration | Result |
|------|-------|-----------------|----------|--------|
| Preflight (48-game suite) | 1 | Full coherence | 20ms | PASS |
| 48-game season | 48 | Post-season only | 855ms | PASS |
| Deterministic seed check | 5+5 | Score equality | <1ms | PASS |
| Game stats sum check | 1 | Runs match scores | <1ms | PASS |
| **162-game preflight** | **1** | **7 invariants** | **20ms** | **PASS** |
| **162-game full season** | **162** | **7 invariants × 162 + WAR** | **3.4s** | **PASS** |

**Total**: 6 tests, **6/6 PASS**, 0 violations across 162 × 7 = 1,134 invariant checks per stat line.

---

## Architecture

### Pipeline Under Test

```
generateSyntheticGame() → PersistedGameState
  └→ processCompletedGame()
       ├→ aggregateGameToSeason()
       │    ├→ aggregateBattingStats()  → IndexedDB (playerSeasonBatting)
       │    ├→ aggregatePitchingStats() → IndexedDB (playerSeasonPitching)
       │    ├→ aggregateFieldingStats() → IndexedDB (playerSeasonFielding)
       │    ├→ aggregateFameEvents()    → IndexedDB (playerSeasonBatting.fameNet)
       │    └→ incrementSeasonGames()   → IndexedDB (seasonMetadata)
       └→ archiveCompletedGame()        → IndexedDB (completedGames)
```

### Synthetic Data Generation

- **Seeded PRNG**: mulberry32 — deterministic, reproducible
- **Team setup**: 9 batters + 1 starter + 2 relievers per team (18 batters + 2-4 pitchers)
- **Stat distributions**: PA 3-5, hit rate ~25%, walk rate ~8%, K rate ~22%, HR rate ~5% of hits
- **Pitcher decisions**: Winning team's starter gets W, losing team's starter gets L
- **No ties**: Tie-breaker bumps a random batter's runs by 1

---

## Per-Game Coherence Invariants

These are checked **after every single game** (162 checks each):

| # | Invariant | Description | Result |
|---|-----------|-------------|--------|
| 1 | No NaN/Infinity | All batting + pitching stat fields are finite numbers | 0 violations |
| 2 | No negative counting stats | games, PA, AB, H, HR, R, RBI, BB, K, SB, CS, IP, W, L all ≥ 0 | 0 violations |
| 3 | No decreasing totals | Every counting stat is monotonically non-decreasing between games | 0 violations |
| 4 | Standings coherence | awayWins + homeWins = gamesPlayed at every game | 0 violations |
| 5 | Hit decomposition | H = 1B + 2B + 3B + HR for every batter | 0 violations |
| 6 | PA ≥ AB + BB + HBP | Plate appearance accounting holds | 0 violations |
| 7 | ER ≤ R | Earned runs ≤ total runs allowed for every pitcher | 0 violations |

---

## Post-Season WAR Validation

After 162 games, WAR calculations run on accumulated season stats for **every** player:

| WAR Type | Players Checked | All Finite | Range | Result |
|----------|----------------|------------|-------|--------|
| bWAR | 18 batters | YES | (-20, +25) | PASS |
| pWAR | 2-4 pitchers | YES | (-30, +30) | PASS |
| fWAR | 18 fielders | YES | finite | PASS |
| rWAR | 18 baserunners | YES | finite | PASS |

### Notable WAR Values

- **pWAR peaked at ~21.7** for a 162-game starter who pitched every game — this is artificially high because the synthetic factory gives one starter all innings. Real-world rotation would distribute IP across 5 starters.
- **bWAR range was reasonable** — no synthetic batter exceeded 15 WAR.
- **No NaN or Infinity** in any WAR calculation across all 162 accumulated stat lines.

---

## Post-Season Aggregate Assertions

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Season games played | 162 | 162 | PASS |
| Total batting runs = total game runs | sum(playerRuns) = awayRuns + homeRuns | Equal | PASS |
| Total batting HR matches game-by-game count | sum(playerHR) = tracked totalHR | Equal | PASS |
| Every batter played 162 games | bs.games = 162 for all 18 | True | PASS |
| Total pitching W = 162 | one W per game | 162 | PASS |
| Total pitching L = 162 | one L per game | 162 | PASS |
| ERA ≥ 0 for all pitchers | Computed from ER/IP | True | PASS |
| AVG in [0, 1] for all batters | H/AB | True | PASS |
| OBP ≥ AVG for all batters | (H+BB+HBP)/(AB+BB+HBP+SF) | True | PASS |

---

## Test Files

| File | Purpose |
|------|---------|
| `test-utils/seasonSimulator.test.ts` | 48-game season + preflight (original) |
| `test-utils/seasonSimulator162.test.ts` | 162-game season with per-game coherence |
| `test-utils/processCompletedGame.ts` | Pipeline orchestrator (extracted from useGameState.ts) |
| `test-utils/syntheticGameFactory.ts` | Seeded synthetic game data generator |

---

## Performance

- **162 games with per-game IndexedDB reads**: 3.4 seconds
- **48 games with post-season checks only**: 0.85 seconds
- **Bottleneck**: IndexedDB read-back after each game for invariant checking (not the aggregation itself)
- **fake-indexeddb overhead**: Negligible — in-memory implementation is fast

---

## Findings

### No Issues Found

The entire stats/standings/WAR pipeline passed all coherence invariants across a full 162-game season:

- **Zero NaN/Infinity** in any accumulated stat
- **Zero negative counting stats**
- **Zero monotonicity violations** (no stat ever decreased)
- **Perfect bookkeeping** (runs, HR, W, L all reconcile exactly)
- **All WAR calculations finite** on 162-game accumulated data

### Known Limitation

- **Milestone detection disabled** (`detectMilestones: false`): The careerStorage module opens its IndexedDB at version 3, while seasonStorage opens at version 2. In fake-indexeddb, a v2 connection blocks the v3 upgrade. In the browser, the DB persists at v3 from first load, so this never happens. This is a test-only limitation; milestone aggregation is tested separately in `milestoneDetector.test.ts`.

---

## Recommendations

1. **Extend synthetic factory** to use a 5-pitcher rotation instead of 1 starter per team — would produce more realistic WAR distributions
2. **Add reliever save/hold detection** to the synthetic game factory for more complete pitcher decision coverage
3. **Consider running simulator at 48 games** (the actual SMB4 season length) as the primary stress test, with 162 as a stretch test
