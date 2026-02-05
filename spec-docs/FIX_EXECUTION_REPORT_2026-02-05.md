# Fix Execution Report
Date: 2026-02-05
Source Audit: spec-docs/SPEC_UI_ALIGNMENT_REPORT.md
Baseline: Build PASS, Tests 5025 passing (77 known PostGameSummary failures)

## Summary
- Total fixes attempted: 5
- Fixes completed: 5
- Fixes reverted: 0
- Fixes blocked (needs user): 0
- Regressions caught and fixed: 1 (CRIT-03 test expected old buggy behavior)
- Final state: Build PASS, Tests 5025 passing

## Tier 1: Critical Fixes

| ID | Description | Files | Verify | Status |
|----|------------|-------|--------|--------|
| CRIT-01 | Undo doesn't restore player/pitcher stats | useGameState.ts, GameTracker.tsx | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| CRIT-03 | FC runs incorrectly marked unearned | inheritedRunnerTracker.ts, test file | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| CRIT-04 | TP silently mapped to DP | game.ts, useGameState.ts, useClutchCalculations.ts | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| CRIT-05 | Mojo applies uniformly (should differentiate) | mojoEngine.ts, index.ts | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| CRIT-06 | Robbery fame values wrong | 7 code files + 2 test files | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |

## Deferred to Tier 2

| ID | Description | Why Deferred | Prerequisite |
|----|------------|-------------|-------------|
| CRIT-02 + MAJ-05 | Wire inheritedRunnerTracker for ER/UER tracking | Requires refactoring runner identity tracking across all useGameState action functions. Engine works (47 tests pass), but wiring is multi-hour Tier 2 task. | CRIT-03 (FC bug) already fixed in the engine. |

## Regressions Encountered

| Fix ID | Regression | Root Cause | Resolution |
|--------|-----------|------------|-----------|
| CRIT-03 | 1 test failed: "runner who reached via FC scores as UNEARNED run" | Test was asserting old buggy behavior (FC=unearned). Per baseball rules, FC runs ARE earned. | Updated test to assert correct behavior (FC=earned). |
| CRIT-04 | Build failed: TS2741 missing 'TP' in Record<AtBatResult, PlayResult> | Adding TP to AtBatResult requires it in all exhaustive Record mappings. | Added `'TP': 'gidp'` to useClutchCalculations.ts mapping. |
| CRIT-06 | (None) | — | — |

## Detailed Changes

### CRIT-01: Undo Stats Restore
**Problem**: `restoreState()` only restored `gameState` and `scoreboard`, not `playerStats` or `pitcherStats` Maps. Every undo corrupted cumulative stats.
**Fix**:
- Expanded `restoreState` signature to accept optional Maps
- Convert Maps to serializable `[key, value][]` arrays before UndoSystem deep clone (Maps don't survive JSON.stringify)
- Reconstruct Maps from entries on restore
**Files**: `useGameState.ts` (interface + implementation), `GameTracker.tsx` (snapshot capture + handleUndo)

### CRIT-03: FC Runs Incorrectly Unearned
**Problem**: `wasEarnedRun = runner.howReached !== 'error' && runner.howReached !== 'FC'` — FC was treated like error.
**Fix**: Removed `&& runner.howReached !== 'FC'`. Also fixed same bug in `getERSummary()` function.
**Files**: `inheritedRunnerTracker.ts` (2 locations), test file

### CRIT-04: TP Mapped to DP
**Problem**: `mapAtBatResultFromOut('TP')` returned `'DP'`, losing triple play data permanently.
**Fix**: Added `'TP'` to `AtBatResult` union type. Updated `mapAtBatResultFromOut`, `isOut`, `getDefaultRunnerOutcome`, `calculateRBIs`, `requiresBallInPlayData`, and clutch calculation mapping.
**Files**: `game.ts`, `useGameState.ts`, `useClutchCalculations.ts`

### CRIT-05: Mojo Stat Differentiation
**Problem**: `applyMojoToAllStats` applied mojo multiplier uniformly to all stats.
**Fix**: Added `applyCombinedModifiers(baseStats, mojo, fitnessMultiplier)` per spec Sec 8.1:
- Speed → fitness only
- Junk → mojo only
- All others → combined (mojo × fitness)
**Files**: `mojoEngine.ts`, `index.ts`

### CRIT-06: Robbery Fame Values
**Problem**: ROBBERY=1.5, ROBBERY_GRAND_SLAM=2.5. Spec v3.3 standardized both to +1.
**Fix**: Updated FAME_VALUES in 3 locations, hardcoded values in 2 UI components, comments in 1 file, and 2 test files.
**Files**: `game.ts`, `src_figma/app/types/game.ts`, `useGameState.ts`, `EnhancedInteractiveField.tsx`, `StarPlaySubtypePopup.tsx`, `playClassifier.ts`, 2 test files

## Test Count Delta
- Before: 5025 tests passing
- After: 5025 tests passing
- New tests added: 0
- Tests modified: 2 (CRIT-03 FC assertion, CRIT-06 robbery value assertion)
