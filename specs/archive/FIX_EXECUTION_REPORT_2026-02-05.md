# Fix Execution Report
Date: 2026-02-05
Source Audit: spec-docs/SPEC_UI_ALIGNMENT_REPORT.md
Baseline: Build PASS, Tests 5025 passing (77 known PostGameSummary failures)

## Summary
- Total fixes attempted: 19 (Tiers 1-4: 10, Phase C: 7, Phase D: 2)
- Fixes completed: 18 (includes 1 partial: MAJ-06 backend only)
- Fixes reverted: 0
- Fixes blocked (needs user): 0
- Fixes assessed as not-a-bug: 1 (MIN-05: SF RBI=1 is correct)
- Fixes deferred to larger effort: 1 (MIN-04: HBP tracking → resolved by MAJ-07)
- Spec-only fixes: 2 (MAJ-13 fame table, MAJ-12 D3K confirmation)
- Regressions caught and fixed: 1 (CRIT-03 test expected old buggy behavior)
- Final state: Build PASS, Tests 5025 passing
- Remaining: 0 items (MAJ-01 completed Feb 7 as `df442bd`)

## Tier 1: Critical Fixes

| ID | Description | Files | Verify | Status |
|----|------------|-------|--------|--------|
| CRIT-01 | Undo doesn't restore player/pitcher stats | useGameState.ts, GameTracker.tsx | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| CRIT-03 | FC runs incorrectly marked unearned | inheritedRunnerTracker.ts, test file | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| CRIT-04 | TP silently mapped to DP | game.ts, useGameState.ts, useClutchCalculations.ts | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| CRIT-05 | Mojo applies uniformly (should differentiate) | mojoEngine.ts, index.ts | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| CRIT-06 | Robbery fame values wrong | 7 code files + 2 test files | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |

## Tier 2: Wiring Fixes

| ID | Description | Files | Verify | Status |
|----|------------|-------|--------|--------|
| MAJ-10 + MIN-01 + MIN-03 | OutcomeButtons: situational disable, ROE→E, add TP | OutcomeButtons.tsx, EnhancedInteractiveField.tsx | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| CRIT-02 + MAJ-05 | Wire inheritedRunnerTracker for ER/UER attribution | useGameState.ts (imports, 7 integration points) | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |

## Regressions Encountered

| Fix ID | Regression | Root Cause | Resolution |
|--------|-----------|------------|-----------|
| CRIT-03 | 1 test failed: "runner who reached via FC scores as UNEARNED run" | Test was asserting old buggy behavior (FC=unearned). Per baseball rules, FC runs ARE earned. | Updated test to assert correct behavior (FC=earned). |
| CRIT-04 | Build failed: TS2741 missing 'TP' in Record<AtBatResult, PlayResult> | Adding TP to AtBatResult requires it in all exhaustive Record mappings. | Added `'TP': 'gidp'` to useClutchCalculations.ts mapping. |
| CRIT-06 | (None) | — | — |
| MAJ-10+MIN-01+MIN-03 | (None) | — | — |
| CRIT-02+MAJ-05 | (None) | — | — |

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

### MAJ-10 + MIN-01 + MIN-03: OutcomeButtons Fixes
**Problem (MAJ-10)**: All buttons always clickable regardless of game state. SAC should disable at 2 outs, SF should disable with no R3, DP/TP should disable with no runners.
**Problem (MIN-01)**: OutcomeButtons used `'ROE'` but useGameState uses `'E'`.
**Problem (MIN-03)**: TP button missing from OutcomeButtons despite TP being valid in useGameState.
**Fix**:
- Added `gameContext` prop to `OutcomeButtonsProps` with `outs` and `bases`
- Added `isOutTypeDisabled()` helper: DP/TP disabled with no runners
- Added `isModifierDisabled()` helper: SAC disabled at 2 outs, SF disabled with no R3
- Changed `OutType` from `'ROE'` to `'E'` to match useGameState
- Added `'TP'` to `OUT_TYPES_ROW2`
- Updated `EnhancedInteractiveField.tsx`: passes `gameContext` to both OutcomeButtons usages, updated `'ROE'` check to `'E'` in `handleOutOutcome`
- Disabled buttons show with reduced opacity and cursor-not-allowed
**Files**: `OutcomeButtons.tsx`, `EnhancedInteractiveField.tsx`

### CRIT-02 + MAJ-05: Wire inheritedRunnerTracker for ER/UER Attribution
**Problem (CRIT-02)**: All runs marked as earned, charged to current pitcher. No ER/UER distinction.
**Problem (MAJ-05)**: inheritedRunnerTracker (527 lines, 47 tests passing) was completely orphaned — never imported or called.
**Fix**: Shadow state pattern — `runnerTrackerRef` maintains parallel runner identity tracking alongside boolean bases.
**Integration points wired**:
1. **Import**: Added 11 tracker functions + 2 types from `inheritedRunnerTracker.ts`
2. **initializeGame**: Initialize tracker with home starting pitcher
3. **recordHit**: Advance existing runners, add batter, collect scored events, attribute ER to responsible pitcher
4. **recordOut**: Advance/remove runners per runnerData, add batter on FC, attribute ER correctly
5. **recordWalk**: Force-advance runners, add batter, attribute bases-loaded walk ER correctly
6. **recordError**: Advance runners, add batter as 'error' (unearned), attribute via tracker
7. **recordD3K**: Add batter as 'error' when reached on D3K
8. **changePitcher**: Call `handlePitchingChange()` to mark runners as inherited by new pitcher
9. **endInning**: Call `clearBases()` + `nextInning()` to reset tracker
10. **advanceRunner**: Look up runner by base, advance/out in tracker, attribute scored runs
11. **advanceRunnersBatch**: Batch process all movements through tracker with ER attribution
**Helper functions added**:
- `syncTrackerPitcher()`: Ensures tracker's pitcher matches gameState after half-inning switches
- `findRunnerOnBase()`: Looks up runner ID from base position in tracker
- `baseToTrackerBase()` / `trackerBaseToPosition()`: Convert between naming conventions
- `destToTrackerBase()`: Convert destination to tracker format
- `processTrackerScoredEvents()`: Process scored events and attribute runs/ER to correct pitchers
**Key design decisions**:
- Shadow state (useRef) — tracker doesn't trigger re-renders, only provides data
- Boolean bases preserved — no UI changes needed, all existing base rendering works
- Pitcher sync on each record function — handles half-inning transitions gracefully
- D3K classified as 'error' for ER purposes (uncaught third strike)
**Files**: `useGameState.ts` only (all changes contained to the hook)

## Tier 3: Spec Constants

| ID | Description | Files | Verify | Status |
|----|------------|-------|--------|--------|
| MAJ-13 | Spec fame summary table contradicts inline values | SPECIAL_EVENTS_SPEC.md | Spec-only fix | ✅ COMPLETE |
| MIN-07 | HOT_TAKE uses fixed values, spec says randomRange | narrativeEngine.ts | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| MIN-05 | SF RBI hardcoded to 1 | — | Baseball rules confirm 1 RBI | ✅ NOT A BUG |
| MIN-04 | HBP not tracked separately in pitcher stats | — | Requires MAJ-07 expansion | ⏳ DEFERRED |

### MAJ-13: Spec Fame Summary Table Fix
**Problem**: Summary table at line 1568 showed +1 for all events. Inline values (Sec 5) show granular values: Web Gem +0.75, Cycle +3.0, Inside Park HR +1.5.
**Fix**: Updated summary table to match inline values. Code already matched inline values.
**Files**: `SPECIAL_EVENTS_SPEC.md` only (spec fix, no code change)

### MIN-07: HOT_TAKE Random Ranges
**Problem**: `REPORTER_MORALE_INFLUENCE.HOT_TAKE` used fixed values (winBoost: 3, lossBuffer: -3, streakAmplifier: 2.0). Spec says `randomRange(+1, +3)`, `randomRange(-3, 0)`, `randomRange(0.5, 2.0)`.
**Fix**: Added per-invocation random generation in `calculateStoryMoraleImpact` when effectivePersonality is HOT_TAKE.
**Files**: `narrativeEngine.ts`

### MIN-05: SF RBI = 1 (NOT A BUG)
**Assessment**: A sacrifice fly by definition scores exactly 1 run from third base. The hardcoded value is correct per baseball rules and confirmed by MASTER_BASEBALL_RULES_AND_LOGIC.md.

### MIN-04: HBP Tracking (DEFERRED)
**Assessment**: HBP is lumped with BB in both batter and pitcher stats. PitcherGameStats interface has 9 fields vs spec's 30+. Fixing this properly requires MAJ-07 (expand PitcherGameStats) — not a simple constant change.

## Tier 4: Cosmetic/Documentation

| ID | Description | Assessment | Status |
|----|------------|------------|--------|
| MIN-02 | FLO (Foul Line Out) undocumented in spec | Valid play type, exists in code. Spec docs don't enumerate all out subtypes. | ℹ️ NO ACTION |
| MIN-06 | No per-inning pitch count prompt | Feature request, not a bug. Spec describes optional calibration prompt. | ℹ️ FEATURE REQUEST |

## Phase C: Wire Orphaned Systems

| ID | Description | Files | Verify | Status |
|----|------------|-------|--------|--------|
| MAJ-07 | Expand PitcherGameStats (9→29 fields) | useGameState.ts, gameStorage.ts | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| MAJ-08 | W/L/SV/H/BS decision tracking | useGameState.ts | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| MAJ-03 | Wire detection system (runPlayDetections) | GameTracker.tsx, detectionIntegration.ts | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| MAJ-09 | End-of-game achievement detection (CG/NH/PG/Maddux) | GameTracker.tsx | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| MAJ-11 | Missing detection functions (wired via runPlayDetections) | GameTracker.tsx | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| MAJ-02 | Wire fan morale to UI | useFanMorale.ts, GameTracker.tsx | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |
| MAJ-04 | Wire narrative engine | narrativeIntegration.ts, GameTracker.tsx | Build ✅ Tests 5025 ✅ | ✅ COMPLETE |

### MAJ-07: Expand PitcherGameStats
- Added 20 fields: intentionalWalks, hitByPitch, wildPitches, basesLoadedWalks, firstInningRuns, consecutiveHRsAllowed, isStarter, entryInning, entryOuts, exitInning, exitOuts, finishedGame, inheritedRunners, inheritedRunnersScored, bequeathedRunners, bequeathedRunnersScored, decision, save, hold, blownSave
- Added hbp to PlayerGameStats
- Updated all tracking in recordWalk, recordHit, recordOut, recordEvent, changePitcher, endGame

### MAJ-08: Pitcher Decision Tracking
- Implemented calculatePitcherDecisions() pure function: W/L/SV/ND
- Win: starter ≥5 IP gets W, otherwise most effective reliever
- Loss: pitcher with most runs allowed on losing team
- Save: last pitcher on winning team meeting criteria (≤3 run lead + 1IP, or 3+ IP)

### MAJ-03 + MAJ-09 + MAJ-11: Detection System + Achievements
- Imported runPlayDetections into GameTracker.tsx handleEnhancedPlayComplete
- Auto-detected events record as Fame events immediately
- Prompt detections display notification UI with Confirm/Dismiss buttons
- End-of-game: checks for CG, Shutout, No-Hitter, Perfect Game, Maddux
- Non-blocking: errors never prevent play recording

### MAJ-02: Fan Morale
- Added processGameResult to useFanMorale hook (was completely stubbed)
- Calls createGameMoraleEvent + processMoraleEvent from engine
- Processes at game end with win/loss, shutout, no-hitter, blowout detection

### MAJ-04: Narrative Engine
- Created narrativeIntegration.ts with generateGameRecap helper
- Generates GAME_RECAP narrative at game end
- Passes narrative to post-game summary via navigation state

## Phase D: GameTracker Completeness

| ID | Description | Files | Verify | Status |
|----|------------|-------|--------|--------|
| MAJ-06 | Substitution backend enhancement | useGameState.ts | Build ✅ Tests 5025 ✅ | ✅ PARTIAL |
| MAJ-12 | D3K — spec updated (exists in SMB4) | RUNNER_ADVANCEMENT_RULES.md, archive/SMB4_GAME_MECHANICS.md | Spec-only fix | ✅ COMPLETE |

### MAJ-06: Substitution Backend
- Enhanced makeSubstitution with optional `options`: subType, newPosition, base, isPinchHitter
- Added switchPositions function for position-only switches
- Expanded substitutionLog type union to 7 types
- Backward compatible — existing callers unaffected
- NOTE: Full modal UI trigger wiring deferred (requires UI design decisions)

### MAJ-12: D3K Spec Update (COMPLETE)
- User confirmed: D3K **exists** in SMB4
- Spec was wrong — `RUNNER_ADVANCEMENT_RULES.md` line 23 and `archive/SMB4_GAME_MECHANICS.md` line 16 both said "❌ NO"
- Updated both to "✅ YES — Batter can run to 1B if unoccupied (or 2 outs)"
- `RUNNER_ADVANCEMENT_RULES.md` line 253 already correctly described D3K rules (internal contradiction now resolved)
- Code `recordD3K()` in useGameState.ts is correct as-is — no code changes needed
- Decision logged in DECISIONS_LOG.md

## Remaining Items (Out of Batch-Fix Scope)

| ID | Description | Effort | Notes |
|----|------------|--------|-------|
| ~~MAJ-01~~ | ~~Wire WAR calculators to UI~~ | ~~Large~~ | ✅ COMPLETE — committed `df442bd` (Feb 7). bWAR/pWAR/fWAR/rWAR wired to League Leaders, Team Hub, Season Leaderboards. mWAR deferred (needs manager decisions). |

## Test Count Delta
- Before: 5025 tests passing
- After: 5025 tests passing
- New tests added: 0
- Tests modified: 2 (CRIT-03 FC assertion, CRIT-06 robbery value assertion)

## Known Limitations
- Runner tracker state not included in undo snapshots (tracker may be briefly out of sync after undo)
- After half-inning switches, tracker pitcher is synced on next record call (not immediately)
- ~~Event log `runners` field still uses empty-string stubs for runner IDs~~ — ✅ FIXED (Feb 7): `buildRunnerInfo()` populates from `runnerTrackerRef`
- Fan morale: currently assumes home team is tracked team; rival detection not yet implemented (needs division/rivalry data)
- ~~Narrative: only home-perspective recap generated~~ — ✅ FIXED (Feb 7): both home + away recaps now generated
- Detection: immaculate inning detection requires per-inning pitch counting not yet wired
- ~~Substitution modals: backend accepts rich data but modal UI triggers not yet connected~~ — ✅ FIXED (Feb 7): UI passes subType/newPosition, position_swap case added
