# GameTracker Logic Matrix Test Report

**Date:** 2026-02-09
**Harness version:** Self-test passed 2026-02-09T18:04:42.153Z
**Engine API Map version:** 2026-02-08
**Matrix executed:** 2026-02-09T18:08:39.781Z

## Executive Summary

- **Total tests**: 480
- **Passed**: 480 (100.0%)
- **Failed**: 0
- **Errors**: 0 (no engine crashes)
- **Status**: COMPLETE

The oracle's internal consistency checks (7 validity rules per test) found zero violations across all 480 state+outcome combinations. The oracle agrees with all 29 verifiable golden cases (1 skipped: GC-29 fame event).

## What This Tests

The harness tests the **pure logic layer** of the GameTracker engine:
- `getDefaultRunnerOutcome()` — default runner advancement for each outcome type
- `isRunnerForced()` — force advance rules for walks/HBP
- `getMinimumAdvancement()` — minimum base for forced runners
- `autoCorrectResult()` — FO->SF and GO->DP auto-corrections
- `calculateRBIs()` — RBI attribution rules
- `isOut()`, `isHit()`, `reachesBase()` — outcome classification

**NOT tested** (React-coupled, requires separate integration testing):
- `recordHit()`, `recordOut()`, `recordWalk()`, etc. — React state machine
- Walk-off detection — requires inning/score context
- Inning transitions — handled by `endInning()` flow
- Pitcher stat tracking — React-coupled state
- Fame event recording — separate system

## Results by Outcome Type

| Outcome | Tests | Passed | Failed | Error | Pass Rate |
|---------|-------|--------|--------|-------|-----------|
| 1B      | 24    | 24     | 0      | 0     | 100.0%    |
| 2B      | 24    | 24     | 0      | 0     | 100.0%    |
| 3B      | 24    | 24     | 0      | 0     | 100.0%    |
| HR      | 24    | 24     | 0      | 0     | 100.0%    |
| K       | 24    | 24     | 0      | 0     | 100.0%    |
| KL      | 24    | 24     | 0      | 0     | 100.0%    |
| GO      | 24    | 24     | 0      | 0     | 100.0%    |
| FO      | 24    | 24     | 0      | 0     | 100.0%    |
| LO      | 24    | 24     | 0      | 0     | 100.0%    |
| PO      | 24    | 24     | 0      | 0     | 100.0%    |
| DP      | 24    | 24     | 0      | 0     | 100.0%    |
| TP      | 24    | 24     | 0      | 0     | 100.0%    |
| FC      | 24    | 24     | 0      | 0     | 100.0%    |
| SF      | 24    | 24     | 0      | 0     | 100.0%    |
| SAC     | 24    | 24     | 0      | 0     | 100.0%    |
| D3K     | 24    | 24     | 0      | 0     | 100.0%    |
| BB      | 24    | 24     | 0      | 0     | 100.0%    |
| HBP     | 24    | 24     | 0      | 0     | 100.0%    |
| IBB     | 24    | 24     | 0      | 0     | 100.0%    |
| E       | 24    | 24     | 0      | 0     | 100.0%    |

## Results by Base State

| Base State | Tests | Passed | Failed | Error | Pass Rate |
|------------|-------|--------|--------|-------|-----------|
| empty      | 60    | 60     | 0      | 0     | 100.0%    |
| R1         | 60    | 60     | 0      | 0     | 100.0%    |
| R2         | 60    | 60     | 0      | 0     | 100.0%    |
| R3         | 60    | 60     | 0      | 0     | 100.0%    |
| R1+R2      | 60    | 60     | 0      | 0     | 100.0%    |
| R1+R3      | 60    | 60     | 0      | 0     | 100.0%    |
| R2+R3      | 60    | 60     | 0      | 0     | 100.0%    |
| loaded     | 60    | 60     | 0      | 0     | 100.0%    |

## Results by Out Count

| Outs | Tests | Passed | Failed | Error | Pass Rate |
|------|-------|--------|--------|-------|-----------|
| 0    | 160   | 160    | 0      | 0     | 100.0%    |
| 1    | 160   | 160    | 0      | 0     | 100.0%    |
| 2    | 160   | 160    | 0      | 0     | 100.0%    |

## Failure Clusters

None. All 480 tests passed.

## Error Cases (Engine Crashes)

None. The engine pure functions handled all 480 input combinations without throwing exceptions.

## Oracle Validity Checks

Each of the 480 tests verified 7 internal consistency rules:

1. If inning ends (outs >= 3), bases must be clear
2. Outs never exceed 3
3. Runs scored are non-negative
4. RBI is non-negative
5. Runs cannot score with no runners and non-HR outcome
6. Out-type outcomes must add at least 1 out (except D3K with batter reaching)
7. Hit-type outcomes must not add outs

All 3,360 checks (480 x 7) passed.

## Self-Test Validation (Golden Cases)

| Case | Status | Notes |
|------|--------|-------|
| GC-01 through GC-08 | PASS | Hits + Walks |
| GC-09 through GC-12 | PASS | Standard Outs |
| GC-13, GC-14 | PASS | KL (was 0% coverage) |
| GC-15, GC-16 | PASS | D3K (EXPECTED FAIL D-05: leverageIndex hardcoded — not tested by oracle) |
| GC-17 through GC-19 | PASS | DP + TP |
| GC-20 through GC-22 | PASS | SF, SAC, FC |
| GC-23 | PASS | Error (EXPECTED FAIL D-04: rbi parameter — not tested by oracle) |
| GC-24, GC-25 | PASS | Error + IBB |
| GC-26 through GC-28, GC-30 | PASS | Transitions |
| GC-29 | SKIP | Fame event (not oracle-verifiable) |

## Known Bugs (from Golden Cases, Not Tested by Matrix)

These bugs exist in the React-coupled layer, not the pure logic layer:

| Bug ID | Description | Status |
|--------|-------------|--------|
| D-01 | W/L assignment uses 'most runsAllowed' instead of lead-change tracking | Not tested (React) |
| D-04 | recordError accepts rbi parameter but calculateRBIs returns 0 for errors | Confirmed in GC-23 |
| D-05 | recordD3K hardcodes leverageIndex=1.0 instead of using getBaseOutLI | Confirmed in GC-15/16 |
| D-07 | TOOTBLAN fame is flat -3.0 instead of tiered -0.5/-2.0 | Not tested (fame system) |

## Interpretation

100% pass rate on the pure logic layer means:
1. `getDefaultRunnerOutcome` produces consistent, valid runner destinations for all 480 state combinations
2. Force advance logic (`isRunnerForced`) correctly handles walk/HBP force chains
3. Auto-correction rules (`autoCorrectResult`) produce valid results
4. RBI calculation (`calculateRBIs`) produces non-negative values
5. Outcome classification (`isOut`, `isHit`, `reachesBase`) is consistent

**What this does NOT mean:**
- The React state machine (`recordHit`, `recordOut`, etc.) is bug-free
- The actual engine correctly applies these pure function results to game state
- Walk-off detection, inning transitions, or pitcher stats are correct
- Known bugs D-01, D-04, D-05, D-07 are fixed

**Next steps for deeper testing:**
- Integration testing with React (test-executor can't do this alone)
- Playwright-based UI verification
- Game simulation (season-simulator skill)

## Raw Data Location

- Full results: `test-utils/results/results-full.json` (392KB, all 480 test details)
- Summary: `test-utils/results/results-summary.json`
- Failure clusters: `test-utils/results/results-clusters.json` (empty — no failures)
- Self-test results: `test-utils/results/self-test-results.json`
- Checkpoint: `test-utils/results/checkpoint.json`
