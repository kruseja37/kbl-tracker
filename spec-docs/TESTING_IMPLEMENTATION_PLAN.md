# KBL Tracker - Testing Implementation Plan

> **Purpose**: Comprehensive testing strategy informed by industry-standard baseball data tracking systems (MLB Statcast, FanGraphs, Baseball-Reference) and the Testing skill framework.
> **Created**: February 3, 2026
> **Updated**: February 3, 2026 (Late Night - Reconciliation & Bug Audit Integration)
> **Author**: Claude + JK

---

## Executive Summary

This plan addresses the need for comprehensive testing of the KBL Tracker's baseball logic, statistical calculations, and game state management. It is informed by:
- **Industry standards**: MLB Statcast validation approaches, FanGraphs/Baseball-Reference WAR methodologies
- **Testing skill framework**: Happy path, edge cases, regression testing
- **Domain knowledge gaps**: Baseball rules edge cases, player movement logic, statistical attribution

### Recent Updates (2026-02-03 Late Night)

**Legacy↔Figma Reconciliation Completed:**
- ✅ 42 TypeScript build errors fixed
- ✅ API mismatches between integration wrappers and legacy engines resolved
- ⚠️ `useFanMorale.ts` STUBBED OUT (not imported anywhere - defer tests)
- 🔍 Root cause identified: AI-generated integration files hallucinated API signatures

**Bug Audit Completed (9 bugs fixed):**
- ✅ BUG-001/002/003: Walks no longer classified as hits
- ✅ BUG-004: D3K now uses proper `recordD3K()` handler
- ✅ BUG-006: SB now advances trailing runner (not lead runner)
- ✅ BUG-007: Walk routing fixed to use `recordWalk()`
- ✅ BUG-008: ROE type cast fixed
- ✅ BUG-009: Dead BaserunnerDragDrop code removed

**New Testing Requirements Added:**
- Phase 0: Regression tests for 9 fixed bugs (CRITICAL)
- Phase 5.5: API Contract Tests for integration wrappers (NEW)
- Phase 5 updates: Mark stubbed files, add reconciliation learnings

**Definitive Gap Analysis Integration** (see `src/src_figma/spec-docs/DEFINITIVE_GAP_ANALYSIS.md`):
- ⚠️ Phase 1.6 added: Missing data tracking tests (SB, CS, pitch count, errors)
- ⚠️ Phase 5.6 added: AtBatEvent field population tests
- ⚠️ Phase 5.7 added: PostGameSummary real data tests
- 🔍 Note: Gap analysis claimed files don't exist, but Reconciliation found they DO exist via cross-imports

### Previous Updates (2026-02-03)

**Phase 1 & 2 Figma Buildout Completed:**
- ✅ Persistence layer added (eventLog, seasonStorage, careerStorage, gameStorage)
- ✅ Aggregation utils added (seasonAggregator, milestoneDetector, milestoneAggregator)
- ✅ Engine integrations added (mWAR, Fan Morale, Relationship, Aging)
- ✅ React hooks added (useMWARCalculations, useFanMorale, useRelationshipData, useAgingData)

This update adds new test requirements for the persistence and integration layers.

### Current Test Coverage Analysis

| Category | Files | Test Coverage | Priority |
|----------|-------|---------------|----------|
| WAR Calculators | 5 engines | 1 test file (bWAR only) | **HIGH** |
| Detection Functions | 45+ functions | 0 test files | **CRITICAL** |
| Game State (runner movement) | 3 files | 1 test file | **HIGH** |
| D3K/Save/Inherited Runners | 3 engines | 0 test files | **CRITICAL** |
| Mojo/Fitness/Fame | 3 engines | 0 test files | **MEDIUM** |
| Leverage/Clutch | 2 engines | 0 test files | **HIGH** |
| Persistence Layer | 7 utils | 0 test files | **HIGH** (NEW) |
| Engine Integrations | 4 engines | 0 test files | **MEDIUM** (NEW) |
| Season/Career Hooks | 4 hooks | 0 test files | **MEDIUM** (NEW) |
| UI Components | 50+ components | 0 test files | **LOW** (manual testing) |

---

## Phase 0: Regression Tests for Fixed Bugs (CRITICAL - DO FIRST) ✅ COMPLETE

> **Added**: 2026-02-03 after Bug Audit and Reconciliation completed
> **Purpose**: Prevent the 9 fixed bugs from regressing
> **Status**: Phase 0 completed with 106 tests
> - `regressionTests/walkClassification.test.ts`: 26 tests
> - `regressionTests/d3kHandler.test.ts`: 32 tests
> - `regressionTests/stolenBaseLogic.test.ts`: 30 tests
> - `regressionTests/minorBugFixes.test.ts`: 18 tests

### 0.1 Walk Classification Regression Tests

**Bugs Covered**: BUG-001, BUG-002, BUG-003, BUG-007
**Files**: `EnhancedInteractiveField.tsx`, `GameTracker.tsx`, `useGameState.ts`

```
Walk Type Classification:
- [ ] BB button → PlayData has type: 'walk', walkType: 'BB'
- [ ] IBB button → PlayData has type: 'walk', walkType: 'IBB'
- [ ] HBP button → PlayData has type: 'walk', walkType: 'HBP'
- [ ] BB via handleQuickResult → type: 'walk' (not type: 'hit')
- [ ] IBB via handleQuickResult → type: 'walk' (not type: 'hit')
- [ ] HBP via handleQuickResult → type: 'walk' (not type: 'hit')

Walk Stats Attribution:
- [ ] BB → PA++ only (NO ab++, NO h++)
- [ ] IBB → PA++ only, bb++ (NO ab++, NO h++)
- [ ] HBP → PA++ only, hbp++ (NO ab++, NO h++)
- [ ] Walk with bases loaded → RBI++ for batter
- [ ] Walk → Pitcher bb++ (NOT hitsAllowed++)

Walk Routing:
- [ ] playData.type === 'walk' → calls recordWalk()
- [ ] playData.type === 'walk' → does NOT call recordHit()
```

### 0.2 D3K Handler Regression Tests

**Bug Covered**: BUG-004
**Files**: `useGameState.ts`, `GameTracker.tsx`

```
D3K Stats Attribution:
- [ ] D3K where batter OUT → batter K++, pitcher K++, out recorded
- [ ] D3K where batter REACHES → batter K++, pitcher K++, NO out recorded
- [ ] D3K where batter REACHES → batter on 1B, NO bb++ (not a walk!)
- [ ] D3K with R1 empty → legal, can reach
- [ ] D3K with R1 occupied, 0 outs → illegal, auto-out
- [ ] D3K with R1 occupied, 2 outs → legal (force possible)

D3K Routing:
- [ ] D3K event → calls recordD3K() (not recordWalk())
- [ ] recordD3K(true) → batter reaches, K tracked
- [ ] recordD3K(false) → batter out, K tracked
```

### 0.3 Stolen Base Logic Regression Tests

**Bug Covered**: BUG-006
**Files**: `EnhancedInteractiveField.tsx`, `runnerDefaults.ts`

```
SB Runner Selection (Trailing Runner Priority):
- [ ] R1 only + SB → R1 advances to 2B
- [ ] R2 only + SB → R2 advances to 3B
- [ ] R3 only + SB → R3 advances to home (steal of home)
- [ ] R1+R2 + SB → R1 advances (trailing), R2 holds (until modal)
- [ ] R1+R3 + SB → R1 advances (trailing), R3 holds (NOT steal of home!)
- [ ] R1+R2+R3 + SB → R1 advances (trailing), others hold

SB Modal Behavior:
- [ ] SB with multiple runners → shows runner outcome modal
- [ ] Runner outcome modal → user can advance/hold each runner
- [ ] After SB modal → all runners in correct positions
- [ ] SB does NOT make any runner disappear
```

### 0.4 Minor Bug Regression Tests

**Bugs Covered**: BUG-008, BUG-009

```
ROE Type:
- [ ] recordError() uses result: 'E' (valid AtBatResult)
- [ ] 'E' is in AtBatResult type definition

Dead Code Removal:
- [ ] BaserunnerDragDrop is not imported in GameTracker.tsx
- [ ] RunnerDragDrop handles all runner drag functionality
```

### 0.5 Test File Location ✅ ALL CREATED

```
src/src_figma/__tests__/regressionTests/
├── walkClassification.test.ts     ✅ 26 tests
├── d3kHandler.test.ts             ✅ 32 tests
├── stolenBaseLogic.test.ts        ✅ 30 tests
└── minorBugFixes.test.ts          ✅ 18 tests
```

---

## Phase 1: Baseball Rules Logic (CRITICAL) ✅ COMPLETE

**Status**: Phase 1 completed with 603 tests
- `baseballLogic/runnerMovement.test.ts`: 87 tests
- `baseballLogic/d3kTracker.test.ts`: 43 tests
- `baseballLogic/saveDetector.test.ts`: 50 tests
- `baseballLogic/inheritedRunnerTracker.test.ts`: 47 tests
- `baseballLogic/infieldFlyRule.test.ts`: 46 tests
- `tests/baseballLogicTests.test.ts`: 72 tests
- `tests/baseballLogicComparison.test.ts`: 258 tests

### 1.1 Runner Movement & Force Plays

**Existing Tests**: `baseballLogicTests.test.ts` - ✅ COMPLETE (72 + 258 tests)
**Gaps**: None - Figma implementation verified

#### Test Categories:

**Force Play Detection** (26 scenarios)
```
BB/Walk Force Plays:
- [ ] BB empty bases - batter takes 1B (baseline)
- [ ] BB with R1 only - R1 forced to 2B
- [ ] BB with R1+R2 - both forced (R1→2B, R2→3B)
- [ ] BB with bases loaded - R3 scores (forced)
- [ ] BB with R2 only (no R1) - R2 NOT forced (can hold)
- [ ] BB with R3 only - R3 NOT forced
- [ ] BB with R2+R3 (no R1) - neither forced

Hit Force Plays:
- [ ] 1B with R1 - R1 forced to 2B
- [ ] 1B with R2 - R2 NOT forced (can advance 1 or 2 bases)
- [ ] 2B with R1 - R1 forced to at least 3B
- [ ] 2B with R2 - R2 forced (batter takes 2B)
- [ ] 2B with R3 - R3 NOT forced (but usually scores)
- [ ] 3B - ALL runners forced to score

FC Force Plays:
- [ ] FC with R1 - R1 is typically out (that's the FC)
- [ ] FC with R2 only - R2 not forced but may advance

Out Plays (no forces):
- [ ] GO - batter out, runners not forced
- [ ] FO - batter out, runners can tag up
- [ ] K - batter out, runners hold (unless SB/PB/WP)
```

**RBI Attribution** (18 scenarios)
```
Standard RBI:
- [ ] HR solo - 1 RBI
- [ ] HR with R1 - 2 RBI
- [ ] HR with R1+R2 - 3 RBI
- [ ] HR bases loaded (Grand Slam) - 4 RBI
- [ ] 1B with R3 scoring - 1 RBI
- [ ] 2B with R2+R3 scoring - 2 RBI
- [ ] SF with R3 scoring - 1 RBI
- [ ] BB bases loaded (walk-in) - 1 RBI

No RBI Situations:
- [ ] Error allowing runner to score - 0 RBI
- [ ] DP with runner scoring - 0 RBI (MLB Rule 9.04)
- [ ] WP/PB allowing runner to score - 0 RBI
- [ ] Balk allowing runner to score - 0 RBI
- [ ] Runner scored on SB/CS - 0 RBI

Edge Cases:
- [ ] GO with R3 tagging and scoring - 1 RBI (productive out)
- [ ] FC with R3 scoring (R1 out at 2B) - 1 RBI
- [ ] Bases loaded HBP - 1 RBI (forced)
```

### 1.2 Dropped Third Strike (D3K)

**Engine**: `d3kTracker.ts`
**Test Coverage**: NONE

```
D3K Legality Tests:
- [ ] First base empty - D3K LEGAL
- [ ] First base occupied, 0 outs - D3K ILLEGAL
- [ ] First base occupied, 1 out - D3K ILLEGAL
- [ ] First base occupied, 2 outs - D3K LEGAL (force possible)
- [ ] R2 only (1B empty), 0 outs - D3K LEGAL
- [ ] R1+R2, 2 outs - D3K LEGAL

D3K Outcome Tests:
- [ ] D3K reached - batter credited K, reaches 1B
- [ ] D3K thrown out (C-3) - batter credited K, putout to 1B
- [ ] D3K wild throw - batter may advance past 1B
- [ ] D3K error on throw - batter reaches on E, not K

D3K Stats Attribution:
- [ ] Pitcher gets K (strikeout credited regardless of D3K outcome)
- [ ] Catcher charged with passed ball or error depending on outcome
- [ ] Batter's K stat recorded even if reaches base
```

### 1.3 Infield Fly Rule

**Engine**: `playClassifier.ts` (needs to be added)
**Test Coverage**: NONE

```
Infield Fly Conditions:
- [ ] R1+R2, less than 2 outs, fair fly ball catchable with ordinary effort - IFR applies
- [ ] R1+R2+R3, less than 2 outs, fair fly ball - IFR applies
- [ ] R1 only, less than 2 outs - IFR does NOT apply
- [ ] R2+R3 only (no R1), less than 2 outs - IFR does NOT apply
- [ ] R1+R2, 2 outs - IFR does NOT apply
- [ ] Line drive - IFR does NOT apply (regardless of situation)
- [ ] Bunt - IFR does NOT apply

Infield Fly Outcomes:
- [ ] IFR caught - batter out, runners may tag up
- [ ] IFR drops fair - batter still out, runners may advance at risk
- [ ] IFR drops foul - foul ball (no out)
- [ ] Runner hit by IFR while on base - runner NOT out (protected)
- [ ] Runner hit by IFR while off base - runner OUT (interference)
```

### 1.4 Save/Blown Save/Hold Detection

**Engine**: `saveDetector.ts`
**Test Coverage**: NONE

```
Save Opportunity Detection:
- [ ] 9th inning, 3-run lead - SAVE OPPORTUNITY
- [ ] 9th inning, 4-run lead, bases empty - NOT save opportunity
- [ ] 9th inning, 4-run lead, R1 - NOT save opportunity (tying run in hole)
- [ ] 9th inning, 4-run lead, R1+R2 - SAVE OPPORTUNITY (tying run on deck)
- [ ] 9th inning, 4-run lead, bases loaded - SAVE OPPORTUNITY (tying run at bat)
- [ ] 7th inning, 2-run lead - SAVE OPPORTUNITY (late game)
- [ ] 6th inning, 2-run lead (9-inning game) - NOT save opportunity (too early)
- [ ] 5th inning, 2-run lead (7-inning game) - SAVE OPPORTUNITY (late game)

Save Conditions:
- [ ] Finish game with lead, not winning pitcher, 1+ IP - SAVE
- [ ] Finish game with lead, not winning pitcher, tying run on base - SAVE
- [ ] Finish game with lead, IS winning pitcher - NO SAVE
- [ ] Finish game, team loses - NO SAVE (can't happen)
- [ ] Pitch 3+ innings regardless of situation - SAVE (rare)

Blown Save Tests:
- [ ] Enter save opp, relinquish lead, team wins - BLOWN SAVE
- [ ] Enter save opp, relinquish lead, team loses - BLOWN SAVE + LOSS
- [ ] Enter save opp, tie game, team wins in extras - BLOWN SAVE
- [ ] Enter non-save situation, relinquish lead - NOT blown save

Hold Tests:
- [ ] Enter save opp, record out, maintain lead, exit - HOLD
- [ ] Enter save opp, 0 outs recorded, exit - NO HOLD
- [ ] Enter save opp, maintain lead, finish game - SAVE (not hold)
```

### 1.5 Inherited/Bequeathed Runner Tracking

**Engine**: `inheritedRunnerTracker.ts`
**Test Coverage**: NONE

```
ER Attribution Tests:
- [ ] Runner on via walk, scores on single - ER to pitcher A
- [ ] Runner on via error, scores on single - UNEARNED run to pitcher A
- [ ] Pitcher A walks R1, Pitcher B allows HR - 1 ER to A, 1 ER to B
- [ ] Pitcher A walks R1+R2, Pitcher B allows grand slam - 2 ER to A, 2 ER to B

Pitching Change Scenarios:
- [ ] Mid-inning change with runners on - runners marked as inherited
- [ ] Inherited runner scores - charged to original pitcher
- [ ] Inherited runner picked off - no run charged
- [ ] New batter reaches, scores - charged to new pitcher

Pinch Runner Impact:
- [ ] Pinch runner for R1, scores - ER still charged to pitcher who allowed original R1
- [ ] Pinch runner stats tracked separately from original runner
```

### 1.6 Missing Data Tracking Tests (FROM DEFINITIVE_GAP_ANALYSIS.md)

> **Added**: 2026-02-03 after Gap Analysis integration
> **Reference**: `src/src_figma/spec-docs/DEFINITIVE_GAP_ANALYSIS.md` Section 2.1, 2.2, 3.2

**Issue**: Several PlayerGameStats and PitcherGameStats fields are declared but NEVER updated.

```
Stolen Base Tracking (Currently NEVER updated - TODO at line 767):
- [ ] SB event → runner's sb field increments
- [ ] CS event → runner's cs field increments
- [ ] SB/CS tracked per-runner, not per-batter
- [ ] SB/CS persists to season stats
- [ ] SB/CS appears in franchise batting leaders

Pitch Count Tracking (Currently NEVER updated - no UI exists):
- [ ] Each at-bat → pitcher's pitchCount increments
- [ ] Pitch count persists across at-bats
- [ ] Pitch count survives pitching change (new pitcher starts at 0)
- [ ] Maddux detection requires pitchCount ≤ 100 (currently impossible)
- [ ] Pitch count appears in box score

Error Tracking (Fields exist but NEVER updated):
- [ ] Error committed → team's scoreboard.errors increments
- [ ] Error committed → fielder's errors stat increments
- [ ] Error type captured (throwing, fielding, dropped fly)
- [ ] Unearned runs tracked when error causes scoring

Pitcher Win/Loss/Save (Logic missing entirely):
- [ ] Winning pitcher identified (pitcher of record when team takes permanent lead)
- [ ] Losing pitcher identified (allowed go-ahead run)
- [ ] Save credited (closer finishes with ≤3 run lead, 1+ IP)
- [ ] Hold credited (maintains lead in save situation, doesn't finish)
- [ ] W/L/S persists to season stats
- [ ] W/L/S appears in franchise pitching leaders

Runner ID Tracking (Currently always empty string):
- [ ] Runner on first has valid runnerId in AtBatEvent
- [ ] Runner on second has valid runnerId
- [ ] Runner on third has valid runnerId
- [ ] Runner IDs enable correct ER attribution after pitching change
```

**Test File Location**: ✅ ALL CREATED
```
src/src_figma/__tests__/dataTracking/
├── sbcsTracking.test.ts          ✅ 20 tests
├── pitchCountTracking.test.ts    ✅ 20 tests
├── errorTracking.test.ts         ✅ 26 tests
├── pitcherDecisions.test.ts      ✅ 28 tests
└── runnerIdTracking.test.ts      ✅ 23 tests
```

---

## Phase 2: Statistical Calculations (HIGH PRIORITY) ✅ COMPLETE

**Status**: Phase 2 completed with 610 tests
- `statCalculations/bwarCalculator.test.ts`: 54 tests
- `statCalculations/pwarCalculator.test.ts`: 67 tests
- `statCalculations/fwarCalculator.test.ts`: 131 tests
- `statCalculations/rwarCalculator.test.ts`: 61 tests
- `statCalculations/mwarCalculator.test.ts`: 84 tests
- `statCalculations/leverageCalculator.test.ts`: 113 tests
- `statCalculations/fameEngine.test.ts`: 100 tests

### 2.1 WAR Calculations

**Engines**: `bwarCalculator.ts`, `pwarCalculator.ts`, `fwarCalculator.ts`, `rwarCalculator.ts`, `mwarCalculator.ts`
**Test Coverage**: ✅ COMPLETE (397 tests across 5 WAR calculators)

#### bWAR (Batting WAR)
```
wOBA Calculation:
- [ ] Verify SMB4 weights: BB=0.69, HBP=0.72, 1B=0.87, 2B=1.22, 3B=1.57, HR=2.01
- [ ] IBB excluded from walk count
- [ ] Zero PA returns 0 wOBA
- [ ] HR has highest per-event weight

wRAA Calculation:
- [ ] Above-average player → positive wRAA
- [ ] Below-average player → negative wRAA
- [ ] League-average wOBA → 0 wRAA
- [ ] Linear scaling with PA

Replacement Level:
- [ ] -12.0 runs per 600 PA (SMB4 baseline)
- [ ] Scales linearly with PA

Complete bWAR:
- [ ] Elite hitter (.350 BA, 8 HR/season) → 0.75-1.0 bWAR (48-game season)
- [ ] Average hitter → ~0.25-0.5 bWAR
- [ ] Weak hitter → negative bWAR
- [ ] Scales inversely with season length (shorter season = higher WAR per game)
```

#### pWAR (Pitching WAR)
```
FIP Calculation:
- [ ] FIP = ((13×HR) + (3×(BB+HBP)) - (2×K)) / IP + constant
- [ ] FIP constant based on league ERA
- [ ] Zero IP handled gracefully

Pitcher Role Detection:
- [ ] Starter: 5+ IP average per appearance
- [ ] Reliever: <5 IP average
- [ ] Closer: 9th inning, save situations

Leverage Multiplier:
- [ ] Closer (high LI) gets multiplier
- [ ] Setup man gets moderate multiplier
- [ ] Long reliever gets low multiplier
```

#### fWAR (Fielding WAR)
```
Fielding Run Values:
- [ ] Putouts by position (C > 1B > others)
- [ ] Assists by position (SS/3B > 2B > 1B)
- [ ] Errors negative by position
- [ ] Double plays bonus

Position Adjustments:
- [ ] C, SS, CF get positive adjustments
- [ ] 1B, LF, RF get negative adjustments
- [ ] DH gets large negative adjustment

Star Play Detection:
- [ ] Web gem at y > 0.8 field depth
- [ ] Robbery at y > 0.95 (near wall)
- [ ] Fame bonus for star plays
```

#### rWAR (Baserunning WAR)
```
Stolen Base Value:
- [ ] Successful SB positive (~0.2 runs)
- [ ] CS negative (~-0.4 runs)
- [ ] Break-even point ~70% success rate

GIDP Penalty:
- [ ] GIDP situations tracked
- [ ] Penalty for hitting into DP

Advancement Value:
- [ ] Taking extra base on hits
- [ ] Tagging up on fly balls
```

### 2.2 Leverage Index Calculations

**Engine**: `leverageCalculator.ts`
**Test Coverage**: NONE

```
Base-Out LI Matrix:
- [ ] Bases empty, 0 out = 0.88 LI
- [ ] Bases loaded, 2 out = 2.88 LI
- [ ] R3, 1 out = 1.96 LI (sac fly situation)

Inning Multiplier:
- [ ] 1st inning = 0.8× multiplier
- [ ] 9th inning, close game = 1.5× multiplier
- [ ] Extra innings = 1.8× multiplier

Score Differential:
- [ ] Tie game = maximum LI
- [ ] 5+ run lead = dampened LI
- [ ] Blowout (10+ runs) = minimal LI
```

---

## Phase 3: Detection Functions (CRITICAL) ✅ COMPLETE

**Status**: Phase 3 completed with 319 tests
- `detection/detectionFunctions.test.ts`: 90 tests
- `detection/milestoneDetector.test.ts`: 118 tests
- `detection/fameEvents.test.ts`: 111 tests

### 3.1 Game Events Detection

**Engine**: `detectionFunctions.ts`
**Test Coverage**: ✅ COMPLETE (90 tests)

```
Positive Events:
- [ ] Web gem detection (catch type + location)
- [ ] Robbery detection (wall catch)
- [ ] Escape artist (bases loaded, no outs, escape)
- [ ] Clutch grand slam (ties or takes lead)
- [ ] Inside-the-park HR (prompt)
- [ ] Throw out at home (OF assist)
- [ ] Rally starter (first batter of 3+ run rally)

Negative Events:
- [ ] TOOTBLAN detection (runner out on basepaths)
- [ ] Dropped fly ball (error on catchable ball)
- [ ] Booted grounder (fielding error)
- [ ] Wrong base throw (throwing error)
- [ ] Passed ball run (catcher error)
- [ ] Walked in run (BB with bases loaded)
- [ ] Rally killer (strand 2+ RISP)
- [ ] Hit into DP/TP

Position Player Pitching:
- [ ] Clean inning detection
- [ ] Multiple clean innings
- [ ] Strikeout by position player
- [ ] Runs allowed tracking
```

### 3.2 Milestone Detection

**Engine**: `fameEngine.ts`
**Test Coverage**: ✅ COMPLETE (118 + 111 tests in milestoneDetector + fameEvents)

```
Career Milestones:
- [ ] First career hit/HR/RBI/SB
- [ ] 100/500/1000/2000 career hits
- [ ] 50/100/300/500 career HR
- [ ] 1000/2000/3000 career Ks (pitcher)

Season Milestones:
- [ ] 20/30/40/50 HR in season
- [ ] .300/.350/.400 BA
- [ ] 10/15/20 wins (pitcher)
- [ ] 200/250/300 Ks in season

Game Milestones:
- [ ] Cycle detection (1B+2B+3B+HR)
- [ ] No-hitter detection
- [ ] Perfect game detection
- [ ] Multi-HR game (2/3/4 HR)
- [ ] Immaculate inning (9 pitches, 3 K)
```

---

## Phase 4: Mojo/Fitness/Fame Systems (MEDIUM) ✅ COMPLETE

> **CRITICAL DESIGN PRINCIPLE**: "Track, don't simulate"
> - Mojo and Fitness are ALWAYS user-input driven
> - The system can SUGGEST/PROMPT for changes, but NEVER auto-applies them
> - User must confirm all state changes via player card or in-game prompt

**Status**: Phase 4 completed on 2026-02-03
- ✅ mojoEngine.test.ts: ~100 tests (existing)
- ✅ fitnessEngine.test.ts: ~100 tests (existing)
- ✅ fameEngine.test.ts: 100 tests (NEW)
- ✅ mojoFitnessIntegration.test.ts: 58 tests (NEW)
- Total Phase 4: ~358 tests

### 4.1 Mojo Engine

**Engine**: `mojoEngine.ts`
**Test Coverage**: ✅ COMPLETE (~100 tests in `mojoFitness/mojoEngine.test.ts`)
**Reference**: `MOJO_FITNESS_SYSTEM_SPEC.md`

```
Mojo Level Tests (5 discrete levels: -2 to +2):
- [ ] Level bounds: -2 (Rattled) to +2 (Jacked)
- [ ] State names: Rattled (-2) → Tense (-1) → Normal (0) → Locked In (+1) → Jacked (+2)
- [ ] Stat multipliers: 0.82× (Rattled), 0.90× (Tense), 1.00× (Normal), 1.10× (Locked In), 1.18× (Jacked)
- [ ] Rattled is "sticky" - hard to escape (needs multiple positive events)

Mojo Trigger VALUES (for prompt suggestions, NOT auto-apply):
- [ ] HR suggested change: +1 to +2
- [ ] Extra-base hit: +0.5 to +1
- [ ] RBI: +0.5 (stacks with hit)
- [ ] Strikeout (batter): -0.5 to -1
- [ ] Error: -1 to -2 (bigger if allows runs)
- [ ] Allowing run (pitcher): -1

Mojo Amplification (high-pressure situations):
- [ ] Playoff game: 1.5× amplification
- [ ] Bases loaded: 1.4× amplification
- [ ] Tie game late innings: 1.5× amplification
- [ ] RISP with 2 outs: 1.3× amplification
- [ ] Close game (1-2 runs): 1.2× amplification

Carryover:
- [ ] End of game carryover rate: 30% (NOT 50%)
- [ ] Example: +2 ending → +1 starting (2 × 0.3 = 0.6, rounds to 1)
- [ ] Example: -2 ending → -1 starting (-2 × 0.3 = -0.6, rounds to -1)
```

### 4.2 Fitness Engine

**Engine**: `fitnessEngine.ts`
**Test Coverage**: ✅ COMPLETE (~100 tests in `mojoFitness/fitnessEngine.test.ts`)
**Reference**: `MOJO_FITNESS_SYSTEM_SPEC.md`

```
Fitness States (6 categorical states):
- [ ] Juiced (120%): 1.20× stat boost, 0.5% injury risk, CAN play
- [ ] Fit (100%): 1.00× baseline, 1% injury risk, CAN play
- [ ] Well (80%): 0.95× stat boost, 2% injury risk, CAN play
- [ ] Strained (60%): 0.85× stat boost, 5% injury risk, RISKY to play
- [ ] Weak (40%): 0.70× stat boost, 15% injury risk, RISKY to play
- [ ] Hurt (0%): N/A multiplier, CANNOT play

Juiced Eligibility:
- [ ] Must be at Fit (100%) for 5+ consecutive days off
- [ ] Cooldown: cannot be Juiced twice in 20 games
- [ ] Duration: typically 3 games after achieving
- [ ] Also triggered by: All-Star break rest, Offseason (first 10 games), Random "Hot Streak" event

Position-Specific Decay (for UI display/suggestions only):
- [ ] Catcher: -5 per start (fastest decay)
- [ ] Pitcher starter: -15 base + -2 per inning
- [ ] Pitcher reliever: -5 base + -3 per inning
- [ ] Position player: -3 per start

Recovery Rates (for projection display):
- [ ] Position player: +5% per rest day
- [ ] Pitcher: +8% per rest day
- [ ] Catcher: +6% per rest day
- [ ] Durable trait: 1.5× faster recovery
- [ ] Injury Prone trait: 0.7× slower recovery
```

### 4.3 NO AUTO-UPDATE TESTS (CRITICAL)

**Purpose**: Verify the system NEVER changes Mojo/Fitness without user input

```
Auto-Update Prevention Tests:
- [ ] Recording a HR does NOT auto-change batter's mojo
- [ ] Recording a strikeout does NOT auto-change batter's mojo
- [ ] Recording an error does NOT auto-change fielder's mojo
- [ ] Recording a pitching change does NOT auto-change pitcher's fitness
- [ ] Playing a game does NOT auto-decay fitness
- [ ] Rest day does NOT auto-recover fitness
- [ ] Game end does NOT auto-apply carryover to next game's starting mojo

Prompt Trigger Tests (events that SHOULD prompt user):
- [ ] Killed Pitcher event → prompts for batter mojo change
- [ ] Nutshot event → prompts for batter mojo change
- [ ] Error committed → prompts for fielder mojo change
- [ ] Web Gem → prompts for fielder mojo change
- [ ] Clutch hit (high LI) → prompts for batter mojo change
- [ ] Multiple strikeouts same game → prompts for batter mojo change
- [ ] Pitcher allows 3+ runs → prompts for pitcher mojo change

Prompt Behavior Tests:
- [ ] Prompt shows current state and SUGGESTED new state
- [ ] User can accept suggestion OR choose different value
- [ ] User can dismiss prompt without changing state
- [ ] Dismissing prompt does NOT apply any change
- [ ] Only accepted prompts update state

Manual Update Tests (via player card):
- [ ] User can update Mojo from player card at any time
- [ ] User can update Fitness from player card at any time
- [ ] Changes persist to storage
- [ ] UI reflects changes immediately
```

### 4.4 Fame Engine

**Engine**: `fameEngine.ts`
**Test Coverage**: ✅ COMPLETE (100 tests in `statCalculations/fameEngine.test.ts`)

```
Fame Calculation:
- [x] Base fame × LI multiplier
- [x] Playoff multiplier (1.5×)
- [x] Negative fame for bonehead plays (FAME_VALUES integration)
- [x] Fame tiers: Unknown → Local → Regional → National → Legend
- [x] Career milestone detection (scaling thresholds)
- [x] Season milestone detection
- [x] First career event detection
```

### 4.5 Mojo/Fitness Fame Integration (NEW)

**Purpose**: Verify Fame credit modifiers based on player state at time of achievement
**Test Coverage**: ✅ COMPLETE (58 tests in `mojoFitness/mojoFitnessIntegration.test.ts`)

```
Mojo Fame Modifiers:
- [x] Rattled (-2) achievement: +30% Fame bonus ("overcoming impossible pressure")
- [x] Tense (-1) achievement: +15% Fame bonus ("fighting through adversity")
- [x] Normal (0) achievement: no modifier
- [x] Locked In (+1) achievement: -10% Fame credit ("easy when you're hot")
- [x] Jacked (+2) achievement: -20% Fame credit ("anyone could do it")

Fitness Fame Modifiers:
- [x] Juiced achievement: 50% Fame credit only (PED stigma)
- [x] Juiced game played: -1 Fame Boner PER GAME (automatic penalty)
- [x] Strained achievement: +15% Fame bonus ("playing hurt")
- [x] Weak achievement: +25% Fame bonus ("gutsy performance")

Combined Modifier Tests:
- [x] Rattled + Weak: bonuses stack (worst states = most impressive)
- [x] Jacked + Juiced: penalties stack (best states = least credit)
- [x] Example: Cycle while Rattled = 2 base × 1.30 = 2.6 Fame
- [x] Example: Cycle while Juiced = 2 base × 0.50 - 1 game penalty = 0 net Fame

WAR Context Multipliers:
- [x] Rattled: +15% WAR credit
- [x] Tense: +7% WAR credit
- [ ] Locked In: -5% WAR credit
- [ ] Jacked: -10% WAR credit
- [ ] Juiced: -15% WAR credit
- [ ] Strained: +10% WAR credit
- [ ] Weak: +20% WAR credit

Clutch Score Multipliers:
- [ ] Rattled: +30% clutch credit (being clutch when Rattled is impressive)
- [ ] Tense: +15% clutch credit
- [ ] Normal: baseline
- [ ] Locked In: -10% clutch credit
- [ ] Jacked: -15% clutch credit (being clutch when Jacked is expected)
```

---

## Phase 5: Persistence & Integration Layer (NEW - High Priority) ✅ MOSTLY COMPLETE

> **Added**: 2026-02-03 after Phase 1 & 2 buildout completion
> **Updated**: 2026-02-03 (Late Night) - Added reconciliation learnings, marked stubbed files
> **Status**: Phase 5 largely completed on 2026-02-03
> - ✅ 5.1 Persistence Layer: 210 tests
> - ✅ 5.2 Aggregation Utils: 63 tests (seasonAggregation.test.ts)
> - ✅ 5.3 Engine Integration: 40 tests (engineIntegration.test.ts)
> - ✅ 5.4 Hooks: 76 tests (3 hook test files)
> - ✅ 5.5 API Contracts: 199 tests (5 contract test files)
> - ✅ 5.6 AtBatEvent Fields: 101 tests (4 test files)
> - ✅ 5.7 PostGameSummary: 79 tests (4 test files)

### ⚠️ RECONCILIATION NOTES (2026-02-03)

**Root Cause of Build Failures**: AI-generated integration files hallucinated API signatures without checking actual legacy engine code. All 42 TypeScript errors were API mismatches.

**Files Fixed in Reconciliation**:
| File | Issue Fixed | Test Implication |
|------|-------------|------------------|
| `agingIntegration.ts` | Ratings param: `number` → `Record<string, number>` | Verify correct signature in tests |
| `useAgingData.ts` | `result.retired` → `result.shouldRetire` | Test correct property access |
| `fanMoraleIntegration.ts` | FanState: ELECTRIC→EUPHORIC, etc. | Test uses correct enum values |
| `useFanMorale.ts` | **STUBBED OUT** (21 errors, not imported) | ⏸️ DEFER tests until implemented |
| `useMWARCalculations.ts` | Fixed import path, param order | Verify imports work in test env |
| `mwarIntegration.ts` | Return void → return copy | Test mutation + return behavior |
| `franchiseStorage.ts` | **CREATED** stub file | Test stub behavior OR implement |

### 5.1 Persistence Layer Tests

**Files**: `src/src_figma/utils/eventLog.ts`, `seasonStorage.ts`, `careerStorage.ts`, `gameStorage.ts`
**Test Coverage**: ✅ COMPLETE (210 tests in `persistence/` folder)
- `eventLog.test.ts`: 60 tests
- `gameStorage.test.ts`: 47 tests
- `seasonStorage.test.ts`: 52 tests
- `careerStorage.test.ts`: 51 tests

```
IndexedDB Event Log Tests:
- [ ] Create game header → stored in gameHeaders store
- [ ] Add at-bat event → stored in atBatEvents store
- [ ] Query events by game ID → returns correct events
- [ ] Query events by player ID → returns correct events
- [ ] Delete game → cascades to all related events
- [ ] Export game events → returns all data as JSON
- [ ] Import game events → restores from JSON backup

Season Storage Tests:
- [ ] Initialize season → creates season record
- [ ] Update player season stats → aggregates correctly
- [ ] Get season leaderboards → returns sorted by stat
- [ ] Season stats roll-up → calculates AVG, ERA, etc.
- [ ] Multi-season query → returns all seasons for player

Career Storage Tests:
- [ ] Initialize career → creates career record
- [ ] Aggregate season to career → adds stats correctly
- [ ] Career milestone detection → triggers at thresholds
- [ ] Career leaderboards → returns all-time leaders
- [ ] Player retirement → finalizes career record

Game Storage Tests:
- [ ] Save game state → persists current game
- [ ] Resume game → restores exact state
- [ ] Game recovery after crash → prompts for resume
- [ ] Delete completed game → removes from active
```

### 5.2 Aggregation Utils Tests

**Files**: `seasonAggregator.ts`, `milestoneDetector.ts`, `milestoneAggregator.ts`
**Test Coverage**: ✅ COMPLETE
- `aggregation/seasonAggregation.test.ts`: 63 tests
- `detection/milestoneDetector.test.ts`: 118 tests

```
Season Aggregation Tests:
- [ ] Game stats → season stats aggregation
- [ ] Pitcher appearances → season totals
- [ ] Batter plate appearances → season totals
- [ ] ERA calculation accuracy
- [ ] AVG/OBP/SLG calculation accuracy
- [ ] Zero PA edge case handling

Milestone Detection Tests:
- [ ] First career hit detection
- [ ] 100/500/1000 hit milestones
- [ ] 50/100/300/500 HR milestones
- [ ] Season milestone thresholds
- [ ] Game milestones (cycle, no-hitter, perfect game)
- [ ] Near-miss milestone prompts

Milestone Aggregation Tests:
- [ ] Milestone event persistence
- [ ] Milestone retrieval by player
- [ ] Milestone retrieval by type
- [ ] Duplicate milestone prevention
```

### 5.3 Engine Integration Tests

**Files**: `mwarIntegration.ts`, `fanMoraleIntegration.ts`, `relationshipIntegration.ts`, `agingIntegration.ts`
**Test Coverage**: ✅ COMPLETE
- `integration/engineIntegration.test.ts`: 40 tests

```
mWAR Integration Tests:
- [ ] Manager decision creation
- [ ] Decision resolution (success/failure)
- [ ] Game mWAR state tracking
- [ ] Season mWAR accumulation
- [ ] Manager Moment trigger at LI >= 2.0
- [ ] LI tier descriptions (Low/Medium/High/Critical)
- [ ] mWAR rating calculation (Poor/Fair/Good/Excellent/Elite)
- [ ] Decision type breakdown (pitching changes, PH, IBB, etc.)

Fan Morale Integration Tests:
- [ ] Initialize fan morale (50 baseline)
- [ ] Fan state detection (7 states: ELECTRIC→FURIOUS)
- [ ] Morale drift calculation
- [ ] Win/loss impact on morale
- [ ] Contraction risk detection
- [ ] Trade scrutiny level calculation
- [ ] FA attractiveness calculation
- [ ] Streak event detection
- [ ] Performance context multipliers

Relationship Integration Tests:
- [ ] Create relationship (9 types)
- [ ] Relationship category grouping
- [ ] Team chemistry calculation
- [ ] Trade warning generation
- [ ] Relationship end handling
- [ ] Morale effect calculation
- [ ] Cross-team relationship handling
- [ ] Chemistry rating colors

Aging Integration Tests:
- [ ] Career phase detection (DEVELOPMENT/PRIME/DECLINE/FORCED_RETIREMENT)
- [ ] Age display info formatting
- [ ] Development potential calculation
- [ ] Retirement probability calculation
- [ ] Rating change calculation (annual aging)
- [ ] Team aging batch processing
- [ ] Retirement risk formatting
```

### 5.4 Hook Tests

**Files**: `useMWARCalculations.ts`, `useFanMorale.ts`, `useRelationshipData.ts`, `useAgingData.ts`
**Test Coverage**: ✅ PARTIAL (useFanMorale.ts stubbed out)
- `hooks/useMWARCalculations.test.ts`: 25 tests
- `hooks/useRelationshipData.test.ts`: 22 tests
- `hooks/useAgingData.test.ts`: 29 tests
- `hooks/useFanMorale.test.ts`: ⏸️ DEFERRED (file stubbed)

```
useMWARCalculations Hook Tests:
- [ ] Initialize game tracking
- [ ] Initialize season tracking
- [ ] Record decision → returns decision ID
- [ ] Resolve decision outcome
- [ ] Check for Manager Moment
- [ ] Dismiss Manager Moment
- [ ] Format current mWAR display
- [ ] Get mWAR status with rating/color

useFanMorale Hook Tests:
⏸️ **DEFERRED** - File is STUBBED OUT (not imported anywhere)
Reconciliation (2026-02-03) stubbed this hook due to 21 TypeScript errors.
Re-enable tests when hook is fully implemented.

(Original test plan preserved for when implementation resumes:)
- [ ] Initialize morale state
- [ ] Process game result
- [ ] Get fan state display
- [ ] Get risk level display
- [ ] Get trend display
- [ ] Get trade scrutiny level
- [ ] Get FA attractiveness
- [ ] Process end of season

useRelationshipData Hook Tests:
- [ ] Load player relationships
- [ ] Add new relationship
- [ ] End relationship
- [ ] Get trade warnings for player
- [ ] Calculate team chemistry
- [ ] Get relationships by category

useAgingData Hook Tests:
- [ ] Track player for aging
- [ ] Process player aging
- [ ] Process all players aging
- [ ] Get player age display
- [ ] Get development potential
```

### 5.5 API Contract Tests (NEW - Prevent Hallucination Bugs)

> **Added**: 2026-02-03 after Reconciliation revealed AI-generated API mismatches
> **Purpose**: Verify integration wrappers match their underlying legacy engine APIs

**Root Cause**: Integration files in `src/src_figma/app/engines/` were written assuming
different function signatures than the actual legacy engines in `src/engines/`. This pattern
could exist elsewhere or regress in the future.

```
Aging Engine Contract:
- [ ] processEndOfSeasonAging signature matches legacy: (age, ratings: Record<string, number>, fame?, modifier?)
- [ ] AgingResult has correct properties: newAge, ratingChanges[], shouldRetire, retirementProbability, phase
- [ ] agingIntegration.ts calls processEndOfSeasonAging with correct param types

Fan Morale Engine Contract:
- [ ] FanState enum values match legacy: EUPHORIC, EXCITED, CONTENT, RESTLESS, FRUSTRATED, APATHETIC, HOSTILE
- [ ] FanMorale interface matches legacy structure
- [ ] fanMoraleIntegration.ts uses correct FanState values in switch statements

mWAR Engine Contract:
- [ ] createManagerDecision signature matches legacy: (gameId, managerId, type, gameState, method, players?, notes?)
- [ ] addDecisionToGameStats mutates in place (returns void)
- [ ] addDecisionToSeasonStats mutates in place (returns void)
- [ ] mwarIntegration.ts handles void returns correctly (returns copy for React state)

Leverage Calculator Contract:
- [ ] getLeverageIndex exists at correct import path: src/engines/leverageCalculator
- [ ] GameStateForLI interface matches expected structure
- [ ] Return type is number (LI value)

Franchise Storage Contract:
- [ ] LeaderCategory type includes all expected categories
- [ ] FranchiseLeaderEvent interface matches legacy
- [ ] Import paths resolve correctly from both legacy and Figma
```

**Test Strategy**: Create compile-time type tests that fail if signatures drift:

```typescript
// Example: API Contract Type Test
import { processEndOfSeasonAging } from '../../engines/agingEngine';
import type { AgingResult } from '../../engines/agingEngine';

// This should compile - if it doesn't, API has drifted
const testCall: AgingResult = processEndOfSeasonAging(
  25,                           // age: number
  { power: 80, contact: 75 },   // ratings: Record<string, number>
  50,                           // fame?: number
  0.1                           // performanceModifier?: number
);

// Property existence checks
const _: boolean = testCall.shouldRetire;  // Must exist
const __: { attribute: string; change: number }[] = testCall.ratingChanges;  // Must be array
```

**Test File Location**: ✅ ALL CREATED
```
src/src_figma/__tests__/apiContracts/
├── agingEngine.contract.test.ts       ✅ 26 tests
├── fanMoraleEngine.contract.test.ts   ✅ 44 tests
├── mwarCalculator.contract.test.ts    ✅ 70 tests
├── leverageCalculator.contract.test.ts ✅ 28 tests
└── franchiseStorage.contract.test.ts  ✅ 31 tests
```

### 5.6 AtBatEvent Field Population Tests (FROM DEFINITIVE_GAP_ANALYSIS.md)

> **Added**: 2026-02-03 after Gap Analysis integration
> **Reference**: `src/src_figma/spec-docs/DEFINITIVE_GAP_ANALYSIS.md` Section 2.3

**Issue**: AtBatEvent is constructed in useGameState.ts but many fields are hardcoded placeholders.

```
Hardcoded Fields (Currently NEVER calculated):
- [ ] leverageIndex calculated from game state (not hardcoded 1.0)
- [ ] winProbabilityBefore calculated from LI table (not hardcoded 0.5)
- [ ] winProbabilityAfter calculated after play (not hardcoded 0.5)
- [ ] wpa calculated as after - before (not hardcoded 0)
- [ ] isClutch detected from LI threshold (not hardcoded false)
- [ ] isWalkOff detected from game situation (not hardcoded false)

Always Null/Empty Fields:
- [ ] runners.first has valid runnerId (not empty string)
- [ ] runners.second has valid runnerId (not empty string)
- [ ] runners.third has valid runnerId (not empty string)
- [ ] runnersAfter populated after play resolves (not always null)
- [ ] ballInPlay has hit location data (not always null)
- [ ] fameEvents populated with detected events (not always empty)

Data Flow Tests:
- [ ] AtBatEvent persisted to IndexedDB via logAtBatEvent
- [ ] logAtBatEvent function exists and is callable
- [ ] Events queryable by gameId
- [ ] Events queryable by playerId
```

**Test File Location**: ✅ ALL CREATED
```
src/src_figma/__tests__/atBatEvent/
├── leverageFields.test.ts         ✅ 32 tests
├── runnerFields.test.ts           ✅ 25 tests
├── fameEventFields.test.ts        ✅ 24 tests
└── eventPersistence.test.ts       ✅ 20 tests
```

### 5.7 PostGameSummary Real Data Tests (FROM DEFINITIVE_GAP_ANALYSIS.md)

> **Added**: 2026-02-03 after Gap Analysis integration
> **Reference**: `src/src_figma/spec-docs/DEFINITIVE_GAP_ANALYSIS.md` Section 1.4, Phase 4

**Issue**: PostGameSummary.tsx uses 100% mock data (lines 15-64). Should show real game data.

```
Box Score Batter Data:
- [ ] awayBatters[] populated from completed game's playerStats
- [ ] homeBatters[] populated from completed game's playerStats
- [ ] Batter row has: name, pos, ab, r, h, rbi, bb, so, avg
- [ ] AVG calculated as h/ab (not hardcoded)

Box Score Pitcher Data:
- [ ] awayPitchers[] populated from completed game's pitcherStats
- [ ] homePitchers[] populated from completed game's pitcherStats
- [ ] Pitcher row has: name, ip, h, r, er, bb, so, era
- [ ] IP formatted as "6.2" (outs / 3 + (outs % 3) / 10)
- [ ] ERA calculated as (er * 9) / ip (not hardcoded)

Scoreboard Data:
- [ ] Inning-by-inning scores from completed game
- [ ] Total runs from actual game
- [ ] Total hits from actual game
- [ ] Total errors from actual game

Hook Integration:
- [ ] useCompletedGame(gameId) returns real data
- [ ] useCompletedGame reads from eventLog
- [ ] Loading state handled correctly
- [ ] Error state handled correctly
```

**Test File Location**: ✅ ALL CREATED
```
src/src_figma/__tests__/postGameSummary/
├── batterBoxScore.test.ts         ✅ 17 tests
├── pitcherBoxScore.test.ts        ✅ 27 tests
├── scoreboardData.test.ts         ✅ 21 tests
└── useCompletedGame.test.ts       ✅ 14 tests
```

---

## Phase 6: GameTracker UI Tests (Expanded - Complete Figma UI) ✅ COMPLETE

> **Updated**: 2026-02-03 to cover ALL GameTracker components comprehensively
> **Status**: Phase 6 COMPLETE - Logic tests + RTL component tests (651 total)
> **RTL Installed**: 2026-02-03 - @testing-library/react, @testing-library/jest-dom, jsdom
>
> **Logic Tests (220 tests):**
> - `gameTracker/gameStateLogic.test.ts`: 61 tests ✅
> - `gameTracker/undoSystem.test.ts`: 31 tests ✅
> - `gameTracker/atBatButtonValidation.test.ts`: 62 tests ✅
> - `gameTracker/scoreboardLogic.test.ts`: 66 tests ✅
>
> **RTL Component Tests (431 tests):**
> - `gameTracker/Scoreboard.test.tsx`: 30 tests ✅
> - `gameTracker/AtBatPanel.test.tsx`: 40 tests ✅
> - `gameTracker/AtBatFlow.test.tsx`: 65 tests ✅
> - `gameTracker/DiamondVisualization.test.tsx`: 26 tests ✅
> - `gameTracker/SubstitutionFlow.test.tsx`: 35 tests ✅
> - `gameTracker/FieldingModal.test.tsx`: 27 tests ✅
> - `gameTracker/FieldZoneInput.test.tsx`: 26 tests ✅
> - `gameTracker/SeasonSummary.test.tsx`: 41 tests ✅
> - `gameTracker/NarrativeDisplay.test.tsx`: 50 tests ✅
> - `gameTracker/OffseasonFlow.test.tsx`: 30 tests ✅
> - `gameTracker/FanMoraleDisplay.test.tsx`: 34 tests ✅
> - `gameTracker/RelationshipPanel.test.tsx`: 27 tests ✅

### 6.1 GameTracker Page (`GameTracker.tsx`)

```
Page Initialization Tests:
- [ ] Game loads from gameId param
- [ ] Lineups initialized correctly
- [ ] Starting pitchers set
- [ ] Inning starts at 1, top
- [ ] Score starts at 0-0

Play Recording Flow:
- [ ] Select play type (HIT/OUT/OTHER)
- [ ] Record fielding sequence
- [ ] Confirm runner outcomes
- [ ] Verify game state updates
- [ ] Stats attributed to correct players

State Persistence:
- [ ] Undo system (5-step stack)
- [ ] Game save/resume
- [ ] Stats aggregation to season
- [ ] Game data persists to IndexedDB
```

### 6.2 Field Components

#### 6.2.1 DragDropGameTracker.tsx
```
Field Display Tests:
- [ ] Diamond renders correctly
- [ ] Fielder positions displayed
- [ ] Runner positions on bases
- [ ] Ball-in-play location tracking

Drag-and-Drop Tests:
- [ ] Runner draggable between bases
- [ ] Runner can be dragged home (scores)
- [ ] Runner can be dragged to out position
- [ ] Drag handles visible on mobile
```

#### 6.2.2 FieldCanvas.tsx
```
Canvas Rendering Tests:
- [ ] Infield area correct
- [ ] Outfield zones rendered
- [ ] Foul lines visible
- [ ] Warning track visible
- [ ] Click detection accurate
```

#### 6.2.3 EnhancedInteractiveField.tsx
```
Interactive Tests:
- [ ] Click on fielder position → selects fielder
- [ ] Click on field zone → records ball location
- [ ] Visual feedback on hover
- [ ] Play location overlay appears
```

#### 6.2.4 FielderIcon.tsx
```
Icon Tests:
- [ ] Position abbreviation displays
- [ ] Active fielder highlighted
- [ ] Position color coding
```

#### 6.2.5 PlayLocationOverlay.tsx
```
Overlay Tests:
- [ ] Shows after hit recorded
- [ ] Click location recorded
- [ ] Zones displayed (IF, OF, foul)
- [ ] Overlay dismissable
```

### 6.3 Runner Components

#### 6.3.1 RunnerDragDrop.tsx
```
Runner Interaction Tests:
- [ ] Runner avatar displays
- [ ] Drag initiates correctly
- [ ] Drop zones highlighted
- [ ] Invalid drop rejected
- [ ] Runner name/number shown
```

#### 6.3.2 RunnerOutcomeArrows.tsx
```
Arrow Tests:
- [ ] Advance arrow shows
- [ ] Score arrow shows
- [ ] Out arrow shows
- [ ] Hold indicator shows
```

#### 6.3.3 RunnerOutcomesDisplay.tsx
```
Display Tests:
- [ ] All runners listed
- [ ] Current base shown
- [ ] Outcome (advance/hold/out/score) shown
- [ ] After-play positions accurate
```

#### 6.3.4 BaserunnerDragDrop.tsx (Legacy - verify unused)
```
Dead Code Verification:
- [ ] Not imported in GameTracker (BUG-009 regression test)
```

### 6.4 Outcome Components

#### 6.4.1 OutcomeButtons.tsx
```
Button Tests:
- [ ] HIT category buttons (1B, 2B, 3B, HR)
- [ ] OUT category buttons (K, GO, FO, LO, PO)
- [ ] OTHER category buttons (BB, IBB, HBP, SB, CS, etc.)
- [ ] Button enables/disables based on game state
- [ ] Visual feedback on selection
```

#### 6.4.2 ActionSelector.tsx
```
Action Selection Tests:
- [ ] Actions filtered by context
- [ ] Runner-specific actions (SB, CS, PO)
- [ ] Batter-specific actions (hit, out, walk)
- [ ] Pitcher-specific actions (K, WP, BK-removed)
```

#### 6.4.3 ModifierButtonBar.tsx
```
Modifier Tests:
- [ ] Clutch modifier toggle
- [ ] Lucky modifier toggle
- [ ] Star Play modifier toggle
- [ ] Web Gem modifier toggle
- [ ] Modifiers persist to AtBatEvent
```

### 6.5 Popup Components

#### 6.5.1 BatterReachedPopup.tsx
```
Popup Tests:
- [ ] Shows when batter reaches base
- [ ] Base selection (1B, 2B, 3B, HR)
- [ ] How reached selection (hit, error, FC)
- [ ] Popup dismissable
```

#### 6.5.2 StarPlaySubtypePopup.tsx
```
Star Play Tests:
- [ ] Web Gem subtype selection
- [ ] Robbery subtype selection
- [ ] Barehanded subtype selection
- [ ] Subtype persists to event
```

#### 6.5.3 ErrorTypePopup.tsx
```
Error Type Tests:
- [ ] Throwing error option
- [ ] Fielding error option
- [ ] Dropped fly option
- [ ] Fielder assignment
- [ ] Error increments team errors
```

#### 6.5.4 InjuryPrompt.tsx
```
Injury Tests:
- [ ] Prompt appears after injury event
- [ ] Player selection
- [ ] Injury severity
- [ ] Substitution triggered
```

### 6.6 Substitution Modals

#### 6.6.1 PitchingChangeModal.tsx
```
Pitching Change Tests:
- [ ] Lists available relievers
- [ ] Shows current pitcher pitch count
- [ ] New pitcher selected
- [ ] Old pitcher removed from mound
- [ ] Inherited runners tracked
```

#### 6.6.2 PinchHitterModal.tsx
```
Pinch Hitter Tests:
- [ ] Lists bench players
- [ ] Current batter shown
- [ ] Substitution updates lineup
- [ ] Replaced player becomes inactive
```

#### 6.6.3 PinchRunnerModal.tsx
```
Pinch Runner Tests:
- [ ] Lists bench players
- [ ] Current runner shown
- [ ] ER responsibility transfers
- [ ] Runner swapped correctly
```

#### 6.6.4 DefensiveSubModal.tsx
```
Defensive Sub Tests:
- [ ] Lists bench players
- [ ] Position selection
- [ ] Validates no duplicate positions
- [ ] Substitution saved
```

#### 6.6.5 DoubleSwitchModal.tsx
```
Double Switch Tests:
- [ ] Two players selected
- [ ] Positions swapped
- [ ] Batting order maintained
- [ ] Valid position combinations
```

#### 6.6.6 PositionSwitchModal.tsx
```
Position Switch Tests:
- [ ] In-game position changes
- [ ] No substitution required
- [ ] Position validations
```

### 6.7 Supporting Components

#### 6.7.1 MiniScoreboard.tsx
```
Scoreboard Tests:
- [ ] Inning display (Top/Bot + number)
- [ ] Score display (Away - Home)
- [ ] Outs display (0-2)
- [ ] Count display (B-S)
- [ ] Updates after each play
```

#### 6.7.2 SidePanel.tsx
```
Side Panel Tests:
- [ ] Current batter display
- [ ] Current pitcher display
- [ ] Lineup visible
- [ ] Stats visible
- [ ] Panel collapsible
```

#### 6.7.3 LineupCard.tsx
```
Lineup Card Tests:
- [ ] All 9 positions shown
- [ ] Current batter highlighted
- [ ] Stats per player
- [ ] Substitutes indicated
```

#### 6.7.4 UndoSystem.tsx
```
Undo Tests:
- [ ] Undo button visible
- [ ] 5-step undo stack
- [ ] Undo restores previous state
- [ ] Undo disables when stack empty
- [ ] Redo functionality (if implemented)
```

### 6.8 Hooks (useGameState.ts)

```
useGameState Hook Tests:
- [ ] Initialize game state from params
- [ ] recordHit() updates stats
- [ ] recordOut() updates stats
- [ ] recordWalk() updates stats (BUG-007 regression)
- [ ] recordD3K() updates stats (BUG-004 regression)
- [ ] advanceRunner() moves runners
- [ ] scoreRunner() increments runs
- [ ] recordOut() increments outs
- [ ] changeInning() transitions half-innings
- [ ] endGame() finalizes stats
- [ ] undo() restores previous state
```

### 6.9 Test File Location (GameTracker Components)

```
src/src_figma/__tests__/
└── gameTracker/
    ├── gameTrackerPage.test.ts          ❌ NEEDS CREATION
    ├── components/
    │   ├── dragDropGameTracker.test.ts  ❌ NEEDS CREATION
    │   ├── fieldCanvas.test.ts          ❌ NEEDS CREATION
    │   ├── enhancedInteractiveField.test.ts ❌ NEEDS CREATION
    │   ├── fielderIcon.test.ts          ❌ NEEDS CREATION
    │   ├── playLocationOverlay.test.ts  ❌ NEEDS CREATION
    │   ├── runnerDragDrop.test.ts       ❌ NEEDS CREATION
    │   ├── runnerOutcomeArrows.test.ts  ❌ NEEDS CREATION
    │   ├── runnerOutcomesDisplay.test.ts ❌ NEEDS CREATION
    │   ├── outcomeButtons.test.ts       ❌ NEEDS CREATION
    │   ├── actionSelector.test.ts       ❌ NEEDS CREATION
    │   ├── modifierButtonBar.test.ts    ❌ NEEDS CREATION
    │   ├── miniScoreboard.test.ts       ❌ NEEDS CREATION
    │   ├── sidePanel.test.ts            ❌ NEEDS CREATION
    │   ├── lineupCard.test.ts           ❌ NEEDS CREATION
    │   └── undoSystem.test.ts           ❌ NEEDS CREATION
    ├── popups/
    │   ├── batterReachedPopup.test.ts   ❌ NEEDS CREATION
    │   ├── starPlaySubtypePopup.test.ts ❌ NEEDS CREATION
    │   ├── errorTypePopup.test.ts       ❌ NEEDS CREATION
    │   └── injuryPrompt.test.ts         ❌ NEEDS CREATION
    └── modals/
        ├── pitchingChangeModal.test.ts  ❌ NEEDS CREATION
        ├── pinchHitterModal.test.ts     ❌ NEEDS CREATION
        ├── pinchRunnerModal.test.ts     ❌ NEEDS CREATION
        ├── defensiveSubModal.test.ts    ❌ NEEDS CREATION
        ├── doubleSwitchModal.test.ts    ❌ NEEDS CREATION
        └── positionSwitchModal.test.ts  ❌ NEEDS CREATION
```

### 6.10 Cross-Browser Testing

```
Browser Matrix:
- [ ] Chrome (desktop + mobile)
- [ ] Safari (iOS)
- [ ] Firefox
- [ ] Edge
```

---

## Phase 7: League Builder Tests (NEW - Complete Figma UI)

> **Added**: 2026-02-03 to cover complete Figma UI, not just GameTracker
> **Purpose**: Test all League Builder pages and data management

### 7.1 League Builder Home (`LeagueBuilder.tsx`)

```
Navigation Tests:
- [ ] Navigate to Leagues module
- [ ] Navigate to Teams module
- [ ] Navigate to Players module
- [ ] Navigate to Rosters module
- [ ] Navigate to Draft module
- [ ] Navigate to Rules module
- [ ] Create New League button works
- [ ] Back button returns to AppHome

Data Display Tests:
- [ ] Shows correct league count from useLeagueBuilderData
- [ ] Shows correct team count
- [ ] Shows correct player count
- [ ] Shows correct rules preset count
- [ ] Loading state displays spinner
- [ ] Error state displays error message
- [ ] Empty state shows "No leagues created" message
```

### 7.2 Leagues Module (`LeagueBuilderLeagues.tsx`)

```
League CRUD Tests:
- [ ] Create new league → saves to IndexedDB
- [ ] Edit existing league → updates correctly
- [ ] Delete league → removes from storage
- [ ] League name validation (required, unique)
- [ ] League settings persist after page refresh

League Configuration Tests:
- [ ] Assign teams to league
- [ ] Set division structure
- [ ] Configure season length
- [ ] Configure playoff format
- [ ] Rules preset selection
```

### 7.3 Teams Module (`LeagueBuilderTeams.tsx`)

```
Team CRUD Tests:
- [ ] Create new team → saves to IndexedDB
- [ ] Edit existing team → updates correctly
- [ ] Delete team → removes from storage (with warning if in league)
- [ ] Auto-generate abbreviation from name
- [ ] Team name validation (required)

Team Configuration Tests:
- [ ] Set team colors (primary, secondary, accent)
- [ ] Set stadium name and capacity
- [ ] Set location and nickname
- [ ] Founded year and championships
- [ ] Team colors display in preview
```

### 7.4 Players Module (`LeagueBuilderPlayers.tsx`)

```
Player CRUD Tests:
- [ ] Create new player → saves to IndexedDB
- [ ] Edit existing player → updates correctly
- [ ] Delete player → removes from storage (with warning if on roster)
- [ ] Player name validation (required)

Player Configuration Tests:
- [ ] Set position (primary, secondary)
- [ ] Set ratings (POW, CON, SPD, FLD, ARM for batters)
- [ ] Set ratings (VEL, JNK, ACC for pitchers)
- [ ] Set traits (up to 2)
- [ ] Set chemistry type
- [ ] Set age, bats, throws
- [ ] Calculate overall grade from ratings
- [ ] Pitcher/batter detection based on position
```

### 7.5 Rosters Module (`LeagueBuilderRosters.tsx`)

```
Roster Management Tests:
- [ ] Assign player to team roster
- [ ] Remove player from roster
- [ ] Set batting order (1-9)
- [ ] Set fielding positions
- [ ] Set starting pitcher
- [ ] Roster size validation (max 25 or configurable)
- [ ] Position conflict detection

Lineup Configuration Tests:
- [ ] Drag-and-drop lineup reordering
- [ ] Bench/starter toggle
- [ ] DH configuration
- [ ] Lineup persists after save
```

### 7.6 Draft Module (`LeagueBuilderDraft.tsx`)

```
Draft Configuration Tests:
- [ ] Set draft type (snake, linear)
- [ ] Set number of rounds
- [ ] Set draft order (by standings, random)
- [ ] Configure player pool
- [ ] Draft timer settings
```

### 7.7 Rules Module (`LeagueBuilderRules.tsx`)

```
Rules Preset Tests:
- [ ] Create new rules preset
- [ ] Edit existing preset
- [ ] Delete preset
- [ ] Preset name validation

Game Rules Tests:
- [ ] Innings per game configuration
- [ ] DH rule (yes/no/NL only)
- [ ] Extra innings rules
- [ ] Mercy rule settings

Season Rules Tests:
- [ ] Games per season
- [ ] Playoff team count
- [ ] Playoff format (best-of series)
- [ ] All-Star game settings
```

### 7.8 Test File Location

```
src/src_figma/__tests__/
└── leagueBuilder/
    ├── leagueBuilderHome.test.ts        ❌ NEEDS CREATION
    ├── leaguesModule.test.ts            ❌ NEEDS CREATION
    ├── teamsModule.test.ts              ❌ NEEDS CREATION
    ├── playersModule.test.ts            ❌ NEEDS CREATION
    ├── rostersModule.test.ts            ❌ NEEDS CREATION
    ├── draftModule.test.ts              ❌ NEEDS CREATION
    ├── rulesModule.test.ts              ❌ NEEDS CREATION
    └── hooks/
        └── useLeagueBuilderData.test.ts ❌ NEEDS CREATION
```

---

## Phase 8: Franchise Mode Tests (NEW - Complete Figma UI)

> **Added**: 2026-02-03 to cover complete Figma UI
> **Purpose**: Test all Franchise Mode pages and offseason flows

### 8.1 Franchise Setup (`FranchiseSetup.tsx`)

```
Franchise Creation Tests:
- [ ] Select league from League Builder
- [ ] Select user team
- [ ] Configure franchise settings
- [ ] Create franchise → saves to IndexedDB
- [ ] Franchise ID generated correctly
- [ ] Navigate to FranchiseHome after creation
```

### 8.2 Franchise Home (`FranchiseHome.tsx`)

```
Tab Navigation Tests:
- [ ] Today's Game tab displays current game
- [ ] Team tab shows TeamHubContent
- [ ] Schedule tab shows ScheduleContent
- [ ] Standings tab shows standings table
- [ ] News tab shows news feed
- [ ] Leaders tab shows stat leaders
- [ ] Rosters tab shows league rosters
- [ ] All-Star tab shows voting
- [ ] Museum tab shows MuseumContent

Season Phase Tests:
- [ ] Regular season phase displays correctly
- [ ] Playoff phase shows bracket
- [ ] Offseason phase shows flow buttons

Offseason Flow Triggers:
- [ ] Free Agency button shows FreeAgencyFlow
- [ ] Ratings Adjustment button shows flow
- [ ] Retirements button shows flow
- [ ] Awards button shows AwardsCeremonyFlow
- [ ] Contraction button shows ContractionExpansionFlow
- [ ] Draft button shows DraftFlow
- [ ] Finalize/Advance button works

Data Integration Tests:
- [ ] useFranchiseData hook returns real data
- [ ] useScheduleData hook returns games
- [ ] usePlayoffData hook returns bracket
- [ ] Season counter persists across sessions
```

### 8.3 Schedule System (`ScheduleContent.tsx`, `useScheduleData.ts`)

```
Schedule Display Tests:
- [ ] Shows games for current season
- [ ] Filter by team works
- [ ] Shows completed game results
- [ ] Shows upcoming games

Game Management Tests:
- [ ] Add game via AddGameModal
- [ ] Edit game details
- [ ] Mark game as completed
- [ ] Navigate to GameTracker for game
- [ ] Navigate to PostGameSummary after game
```

### 8.4 Offseason Flows

#### 8.4.1 Free Agency Flow (`FreeAgencyFlow.tsx`)

```
Free Agent Market Tests:
- [ ] Display available free agents
- [ ] Filter by position
- [ ] Sort by overall/salary/age
- [ ] View player details

Bidding Tests:
- [ ] Submit bid on player
- [ ] Bidding war mechanics
- [ ] Budget validation
- [ ] Contract length configuration

Signing Tests:
- [ ] Sign player → adds to roster
- [ ] Salary cap impact calculated
- [ ] Roster size validation
- [ ] Signing persists to IndexedDB
```

#### 8.4.2 Trade Flow (`TradeFlow.tsx`)

```
Trade Builder Tests:
- [ ] Two-way trade mode
- [ ] Three-way trade mode
- [ ] Add/remove players to trade
- [ ] Salary impact calculation
- [ ] Trade value calculation

AI Response Tests:
- [ ] AI accepts trade
- [ ] AI rejects trade
- [ ] AI counter-offers
- [ ] Beat reporter warnings display

Waiver Wire Tests:
- [ ] Claim player on waivers
- [ ] Waiver order display
- [ ] Claim results

Trade History Tests:
- [ ] View completed trades
- [ ] Trade details display correctly
```

#### 8.4.3 Draft Flow (`DraftFlow.tsx`)

```
Pre-Draft Tests:
- [ ] Inactive player selection
- [ ] Draft class preview
- [ ] Draft order reveal

Draft Execution Tests:
- [ ] Make draft pick
- [ ] Pass on pick option
- [ ] Auto-pick when timer expires
- [ ] Pick confirmation display

Post-Draft Tests:
- [ ] Undrafted player retirements
- [ ] Draft summary display
- [ ] Drafted players added to farm system
- [ ] Draft results persist to IndexedDB
```

#### 8.4.4 Spring Training Flow (`SpringTrainingFlow.tsx`)

```
Roster Projection Tests:
- [ ] Player age displayed correctly
- [ ] Career phase determined (Prospect, Rising, Peak, Declining, Twilight)
- [ ] Rating projections calculated from agingEngine
- [ ] Projected changes show attribute/current/projected/change

Rating Change Tests:
- [ ] TrendingUp icon for positive changes
- [ ] TrendingDown icon for negative changes
- [ ] Minus icon for no change
- [ ] Changes calculated per age and career phase

Integration Tests:
- [ ] useOffseasonData hook provides player data
- [ ] Pitcher vs batter attribute differentiation
- [ ] Continue button advances flow
```

#### 8.4.5 Finalize/Advance Flow (`FinalizeAdvanceFlow.tsx`)

```
Screen Navigation Tests:
- [ ] Roster management screen
- [ ] AI processing screen
- [ ] Validation screen
- [ ] Transaction report screen
- [ ] Season transition screen
- [ ] Chemistry rebalancing screen
- [ ] Spring training screen (includes SpringTrainingFlow)
- [ ] Advance confirmation screen
- [ ] Post-advance welcome screen

Roster Management Tests:
- [ ] MLB roster display (max 22)
- [ ] Farm roster display
- [ ] Call-up functionality
- [ ] Send-down functionality
- [ ] Retirement processing

AI Processing Tests:
- [ ] AI roster balancing simulation
- [ ] Transaction generation
- [ ] Progress indicator

Validation Tests:
- [ ] Roster size validation (MLB max, Farm max)
- [ ] Position requirements met
- [ ] Salary cap compliance

Transaction Report Tests:
- [ ] All transactions listed
- [ ] Transaction type (call-up, send-down, retirement)
- [ ] Player details shown
- [ ] Timestamp tracking

Season Advance Tests:
- [ ] Season counter increments
- [ ] Data persists to IndexedDB
- [ ] New season schedule generated
```

#### 8.4.6 Other Offseason Flows

```
Ratings Adjustment Flow (`RatingsAdjustmentFlow.tsx`):
- [ ] View player rating changes
- [ ] Aging effects display
- [ ] Performance-based adjustments
- [ ] Confirm adjustments

Retirement Flow (`RetirementFlow.tsx`):
- [ ] View retiring players
- [ ] Retirement ceremony
- [ ] Hall of Fame eligibility
- [ ] Jersey retirement option

Awards Ceremony Flow (`AwardsCeremonyFlow.tsx`):
- [ ] MVP announcement
- [ ] Cy Young announcement
- [ ] Rookie of the Year
- [ ] Gold Glove awards
- [ ] All awards persist to Museum

Contraction/Expansion Flow (`ContractionExpansionFlow.tsx`):
- [ ] Contract team option
- [ ] Expand league option
- [ ] Team movement mechanics
- [ ] Draft pick compensation
```

### 8.5 Team Hub Content (`TeamHubContent.tsx`)

```
Team Stats Display:
- [ ] Team record displays correctly
- [ ] Division standing
- [ ] Run differential
- [ ] Streak display

Roster Display:
- [ ] Current roster display
- [ ] Injured list display
- [ ] Farm system display
- [ ] Payroll information
```

### 8.6 Museum Content (`MuseumContent.tsx`)

```
Historical Data Tests:
- [ ] Championship history display
- [ ] Retired jerseys display
- [ ] Hall of Fame members
- [ ] Season records

Data Persistence Tests:
- [ ] Historical data loads from IndexedDB
- [ ] New achievements added correctly
```

### 8.7 Test File Location

```
src/src_figma/__tests__/
└── franchiseMode/
    ├── franchiseSetup.test.ts           ❌ NEEDS CREATION
    ├── franchiseHome.test.ts            ❌ NEEDS CREATION
    ├── scheduleContent.test.ts          ❌ NEEDS CREATION
    ├── teamHubContent.test.ts           ❌ NEEDS CREATION
    ├── museumContent.test.ts            ❌ NEEDS CREATION
    ├── offseason/
    │   ├── freeAgencyFlow.test.ts       ❌ NEEDS CREATION
    │   ├── tradeFlow.test.ts            ❌ NEEDS CREATION
    │   ├── draftFlow.test.ts            ❌ NEEDS CREATION
    │   ├── ratingsAdjustmentFlow.test.ts ❌ NEEDS CREATION
    │   ├── retirementFlow.test.ts       ❌ NEEDS CREATION
    │   ├── awardsCeremonyFlow.test.ts   ❌ NEEDS CREATION
    │   └── contractionExpansionFlow.test.ts ❌ NEEDS CREATION
    └── hooks/
        ├── useFranchiseData.test.ts     ❌ NEEDS CREATION
        ├── useScheduleData.test.ts      ❌ NEEDS CREATION
        ├── usePlayoffData.test.ts       ❌ NEEDS CREATION
        └── useOffseasonData.test.ts     ❌ NEEDS CREATION
```

---

## Phase 9: Exhibition Mode Tests (NEW - Complete Figma UI)

> **Added**: 2026-02-03 to cover complete Figma UI
> **Purpose**: Test Exhibition game setup and flow

### 9.1 Exhibition Game Setup (`ExhibitionGame.tsx`)

```
Team Selection Tests:
- [ ] Away team dropdown populates
- [ ] Home team dropdown populates
- [ ] Cannot select same team for both
- [ ] Continue button advances to lineups

Lineup Configuration Tests:
- [ ] Away team roster displays
- [ ] Home team roster displays
- [ ] Drag-and-drop batting order works
- [ ] Position swap works
- [ ] Bench/starter substitution works
- [ ] Starting pitcher selection works
- [ ] Back button returns to team select

Game Start Tests:
- [ ] Start button navigates to GameTracker
- [ ] Configured lineups passed to GameTracker
- [ ] Pitchers passed correctly
- [ ] Exhibition game ID generated
```

### 9.2 TeamRoster Component Tests

```
Roster Display Tests:
- [ ] Players sorted by batting order
- [ ] Pitchers displayed separately
- [ ] Team colors applied correctly
- [ ] Position labels correct

Interaction Tests:
- [ ] onSubstitution callback works
- [ ] onPitcherSubstitution callback works
- [ ] onPositionSwap callback works
- [ ] Drag handles visible and functional
```

### 9.3 Test File Location

```
src/src_figma/__tests__/
└── exhibitionMode/
    ├── exhibitionGame.test.ts           ❌ NEEDS CREATION
    ├── teamRoster.test.ts               ❌ NEEDS CREATION
    └── lineupConfiguration.test.ts      ❌ NEEDS CREATION
```

---

## Phase 10: Playoff/World Series Tests (NEW - Complete Figma UI)

> **Added**: 2026-02-03 to cover complete Figma UI
> **Purpose**: Test Playoff mode setup, bracket, and tracking

### 10.1 World Series Setup (`WorldSeries.tsx`)

```
Tab Navigation Tests:
- [ ] Setup tab active by default
- [ ] Bracket tab disabled until configured
- [ ] Leaders tab shows playoff stats
- [ ] History tab shows past playoffs

League Selection Tests:
- [ ] Mock leagues display
- [ ] League selection updates team count
- [ ] Rounds calculated from team count
```

### 10.2 Playoff Configuration (`SetupTab`)

```
Structure Configuration Tests:
- [ ] Teams in playoffs displays
- [ ] Total rounds calculated correctly (2→1, 4→2, 8→3, 16→4)
- [ ] Games per round selection (1, 3, 5, 7)
- [ ] Round names correct (Championship, Semi-Finals, etc.)

Game Settings Tests:
- [ ] Innings per game selection (3, 5, 7, 9)
- [ ] DH rule selection (yes, no, NL only)
- [ ] Generate Playoff Bracket button works
```

### 10.3 Bracket View (`BracketView`)

```
Bracket Display Tests:
- [ ] All rounds display
- [ ] Matchups show correct seeds
- [ ] Team records display
- [ ] Series status (in progress, complete)

Matchup Component Tests:
- [ ] Winner highlighted
- [ ] Games won displayed
- [ ] "Series in Progress" indicator
- [ ] "TEAM ADVANCE" indicator
```

### 10.4 Playoff Leaders (`PlayoffLeadersContent`)

```
Batting Leaders Tests:
- [ ] AVG leader displays
- [ ] HR leader displays
- [ ] RBI leader displays
- [ ] SB leader displays
- [ ] OPS leader displays
- [ ] Expandable list shows top 5

Pitching Leaders Tests:
- [ ] ERA leader displays
- [ ] W leader displays
- [ ] K leader displays
- [ ] WHIP leader displays
- [ ] SV leader displays
- [ ] Expandable list shows top 5

Awards Race Tests:
- [ ] Best Hitter candidates display
- [ ] Best Pitcher candidates display
- [ ] Best Fielder candidates display
- [ ] Stats display correctly
```

### 10.5 Playoff History (`PlayoffHistoryContent`)

```
History Display Tests:
- [ ] Championship history shows
- [ ] Expandable year details
- [ ] MVP display
- [ ] Best Pitcher display
- [ ] Best Fielder display

All-Time Stats Tests:
- [ ] Championships by team count
- [ ] Team totals display correctly
```

### 10.6 Test File Location

```
src/src_figma/__tests__/
└── playoffMode/
    ├── worldSeries.test.ts              ❌ NEEDS CREATION
    ├── playoffSetup.test.ts             ❌ NEEDS CREATION
    ├── bracketView.test.ts              ❌ NEEDS CREATION
    ├── playoffLeaders.test.ts           ❌ NEEDS CREATION
    └── playoffHistory.test.ts           ❌ NEEDS CREATION
```

---

## Phase 11: App Home & Navigation Tests (NEW - Complete Figma UI)

> **Added**: 2026-02-03 to cover complete Figma UI
> **Purpose**: Test main app entry point and navigation

### 11.1 App Home (`AppHome.tsx`)

```
Mode Selection Tests:
- [ ] League Builder button navigates correctly
- [ ] Franchise Mode button navigates correctly
- [ ] Exhibition button navigates correctly
- [ ] World Series/Playoffs button navigates correctly

Existing Franchise Tests:
- [ ] List existing franchises
- [ ] Continue franchise button works
- [ ] Delete franchise option (with confirmation)
```

### 11.2 Test File Location

```
src/src_figma/__tests__/
└── navigation/
    ├── appHome.test.ts                  ❌ NEEDS CREATION
    └── routeNavigation.test.ts          ❌ NEEDS CREATION
```

---

## Implementation Priority

### Sprint 0 (IMMEDIATE): Bug Regression Prevention ⚡ NEW
> **Added**: 2026-02-03 after Bug Audit fixed 9 bugs
> **Priority**: CRITICAL - Must be done FIRST to prevent regression

1. **Walk classification regression tests** - BUG-001/002/003/007 (4 test files)
2. **D3K handler regression tests** - BUG-004
3. **Stolen base logic regression tests** - BUG-006
4. **API contract tests** - Prevent hallucinated API mismatches

**Estimated Effort**: 1-2 days
**Why First**: These bugs were JUST fixed. Tests must exist before any other changes.

### Sprint 1 (Week 1-2): Critical Path + Missing Data
5. **D3K Tracker tests** - No coverage, affects game state
6. **Save/Blown Save tests** - No coverage, affects pitcher stats
7. **Inherited Runner tests** - No coverage, affects ER attribution
8. **Fix 10 failing bWAR tests** - Already written, just failing
9. **Missing Data Tracking tests** (Phase 1.6 - FROM GAP ANALYSIS):
   - SB/CS tracking tests
   - Pitch count tracking tests
   - Error tracking tests
   - Pitcher W/L/S decision tests

### Sprint 2 (Week 3-4): Statistical Accuracy
10. **pWAR tests** - Pitching WAR needs validation
11. **fWAR tests** - Fielding WAR needs validation
12. **rWAR tests** - Baserunning WAR needs validation
13. **Leverage Index tests** - Affects clutch calculations

### Sprint 3 (Week 5-6): Event Detection
14. **Detection function tests** - All 45+ functions
15. **Fame/Milestone tests** - Career and season milestones
16. **Mojo/Fitness tests** - Player state systems

### Sprint 4 (Week 7-8): Persistence & Integration Layer
17. **Persistence layer tests** - eventLog, seasonStorage, careerStorage, gameStorage
18. **Aggregation utils tests** - seasonAggregator, milestoneDetector, milestoneAggregator
19. **Engine integration tests** - mWAR, Fan Morale, Relationship, Aging integrations
20. **Hook tests** - useMWARCalculations, useRelationshipData, useAgingData
    - ⏸️ **useFanMorale DEFERRED** (stubbed file)
21. **AtBatEvent field tests** (Phase 5.6 - FROM GAP ANALYSIS):
   - Leverage/WPA field calculation tests
   - Runner ID tracking tests
   - Event persistence tests
22. **PostGameSummary tests** (Phase 5.7 - FROM GAP ANALYSIS):
   - Box score data tests
   - useCompletedGame hook tests

### Sprint 5 (Week 9-10): GameTracker UI Components (Phase 6 Expanded)
23. **GameTracker page tests** - Page initialization, state management
24. **Field component tests** - DragDropGameTracker, FieldCanvas, EnhancedInteractiveField
25. **Runner component tests** - RunnerDragDrop, RunnerOutcomeArrows
26. **Outcome component tests** - OutcomeButtons, ActionSelector, ModifierButtonBar
27. **Popup component tests** - BatterReachedPopup, ErrorTypePopup, StarPlaySubtypePopup
28. **Modal tests** - All 6 substitution modals
29. **Supporting component tests** - MiniScoreboard, SidePanel, LineupCard, UndoSystem

### Sprint 6 (Week 11-12): League Builder (Phase 7)
30. **LeagueBuilder home tests**
31. **Leagues module tests** (CRUD, configuration)
32. **Teams module tests** (CRUD, colors, stadium)
33. **Players module tests** (CRUD, ratings, traits)
34. **Rosters module tests** (assignment, lineup, drag-drop)
35. **Draft configuration tests**
36. **Rules preset tests**
37. **useLeagueBuilderData hook tests**

### Sprint 7 (Week 13-14): Franchise Mode (Phase 8)
38. **FranchiseSetup tests**
39. **FranchiseHome tests** (tabs, navigation, data display)
40. **Schedule system tests** (ScheduleContent, AddGameModal)
41. **Free Agency flow tests**
42. **Trade flow tests** (builder, AI response, waiver wire)
43. **Draft flow tests** (pre-draft, execution, post-draft)
44. **Spring Training flow tests**
45. **Finalize/Advance flow tests**
46. **Other offseason flow tests** (Ratings, Retirement, Awards, Contraction)
47. **TeamHubContent tests**
48. **MuseumContent tests**
49. **Franchise hooks tests** (useFranchiseData, useScheduleData, usePlayoffData, useOffseasonData)

### Sprint 8 (Week 15-16): Exhibition & Playoffs (Phases 9-11)
50. **ExhibitionGame tests** (team selection, lineup config, game start)
51. **TeamRoster component tests**
52. **WorldSeries setup tests**
53. **Bracket view tests**
54. **Playoff leaders tests**
55. **Playoff history tests**
56. **AppHome tests**
57. **Route navigation tests**
58. **Cross-browser validation** - Manual testing checklist

---

## Test File Structure

```
src/
├── __tests__/
│   └── apiContracts/                      ⚡ NEW (Sprint 0)
│       ├── agingEngine.contract.test.ts       ❌ NEEDS CREATION
│       ├── fanMoraleEngine.contract.test.ts   ❌ NEEDS CREATION
│       ├── mwarCalculator.contract.test.ts    ❌ NEEDS CREATION
│       ├── leverageCalculator.contract.test.ts ❌ NEEDS CREATION
│       └── franchiseStorage.contract.test.ts  ❌ NEEDS CREATION
│
├── engines/__tests__/
│   ├── bwarCalculator.test.ts      ✅ EXISTS (needs fixes)
│   ├── pwarCalculator.test.ts      ❌ NEEDS CREATION
│   ├── fwarCalculator.test.ts      ❌ NEEDS CREATION
│   ├── rwarCalculator.test.ts      ❌ NEEDS CREATION
│   ├── mwarCalculator.test.ts      ❌ NEEDS CREATION
│   ├── leverageCalculator.test.ts  ❌ NEEDS CREATION
│   ├── clutchCalculator.test.ts    ❌ NEEDS CREATION
│   ├── detectionFunctions.test.ts  ❌ NEEDS CREATION
│   ├── fameEngine.test.ts          ❌ NEEDS CREATION
│   ├── mojoEngine.test.ts          ❌ NEEDS CREATION
│   └── fitnessEngine.test.ts       ❌ NEEDS CREATION
│
├── src_figma/
│   ├── __tests__/
│   │   ├── regressionTests/               ⚡ NEW (Sprint 0)
│   │   │   ├── walkClassification.test.ts     ❌ NEEDS CREATION
│   │   │   ├── d3kHandler.test.ts             ❌ NEEDS CREATION
│   │   │   ├── stolenBaseLogic.test.ts        ❌ NEEDS CREATION
│   │   │   └── minorBugFixes.test.ts          ❌ NEEDS CREATION
│   │   │
│   │   ├── dataTracking/                  🔍 NEW (FROM GAP ANALYSIS - Sprint 1)
│   │   │   ├── stolenBaseTracking.test.ts     ❌ NEEDS CREATION
│   │   │   ├── pitchCountTracking.test.ts     ❌ NEEDS CREATION
│   │   │   ├── errorTracking.test.ts          ❌ NEEDS CREATION
│   │   │   ├── pitcherDecisions.test.ts       ❌ NEEDS CREATION
│   │   │   └── runnerIdTracking.test.ts       ❌ NEEDS CREATION
│   │   │
│   │   ├── atBatEvent/                    🔍 NEW (FROM GAP ANALYSIS - Sprint 4)
│   │   │   ├── leverageFields.test.ts         ❌ NEEDS CREATION
│   │   │   ├── runnerFields.test.ts           ❌ NEEDS CREATION
│   │   │   ├── fameEventFields.test.ts        ❌ NEEDS CREATION
│   │   │   └── eventPersistence.test.ts       ❌ NEEDS CREATION
│   │   │
│   │   └── postGameSummary/               🔍 NEW (FROM GAP ANALYSIS - Sprint 4)
│   │       ├── batterBoxScore.test.ts         ❌ NEEDS CREATION
│   │       ├── pitcherBoxScore.test.ts        ❌ NEEDS CREATION
│   │       ├── scoreboardData.test.ts         ❌ NEEDS CREATION
│   │       └── useCompletedGame.test.ts       ❌ NEEDS CREATION
│   │
│   ├── app/engines/__tests__/
│   │   ├── d3kTracker.test.ts              ❌ NEEDS CREATION
│   │   ├── saveDetector.test.ts            ❌ NEEDS CREATION
│   │   ├── inheritedRunnerTracker.test.ts  ❌ NEEDS CREATION
│   │   ├── mwarIntegration.test.ts         ❌ NEEDS CREATION
│   │   ├── fanMoraleIntegration.test.ts    ❌ NEEDS CREATION
│   │   ├── relationshipIntegration.test.ts ❌ NEEDS CREATION
│   │   └── agingIntegration.test.ts        ❌ NEEDS CREATION
│   │
│   ├── app/hooks/__tests__/
│   │   ├── useMWARCalculations.test.ts     ❌ NEEDS CREATION
│   │   ├── useFanMorale.test.ts            ⏸️ DEFERRED (stubbed)
│   │   ├── useRelationshipData.test.ts     ❌ NEEDS CREATION
│   │   └── useAgingData.test.ts            ❌ NEEDS CREATION
│   │
│   ├── utils/__tests__/
│   │   ├── eventLog.test.ts                ✅ CREATED (60 tests)
│   │   ├── seasonStorage.test.ts           ✅ CREATED (52 tests)
│   │   ├── careerStorage.test.ts           ✅ CREATED (51 tests)
│   │   ├── gameStorage.test.ts             ✅ CREATED (47 tests)
│   │   ├── seasonAggregator.test.ts        ❌ NEEDS CREATION
│   │   ├── milestoneDetector.test.ts       ❌ NEEDS CREATION
│   │   └── milestoneAggregator.test.ts     ❌ NEEDS CREATION
│   │
│   └── __tests__/                          🆕 PHASES 6-11 (Complete Figma UI)
│       ├── gameTracker/                    📍 Phase 6: GameTracker Components
│       │   ├── gameStateLogic.test.ts          ✅ CREATED (61 tests)
│       │   ├── undoSystem.test.ts              ✅ CREATED (31 tests)
│       │   ├── atBatButtonValidation.test.ts   ✅ CREATED (62 tests)
│       │   ├── scoreboardLogic.test.ts         ✅ CREATED (66 tests)
│       │   ├── gameTrackerPage.test.ts         ❌ NEEDS CREATION (requires RTL)
│       │   ├── components/
│       │   │   ├── dragDropGameTracker.test.ts  ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── fieldCanvas.test.ts          ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── enhancedInteractiveField.test.ts ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── fielderIcon.test.ts          ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── playLocationOverlay.test.ts  ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── runnerDragDrop.test.ts       ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── runnerOutcomeArrows.test.ts  ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── runnerOutcomesDisplay.test.ts ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── outcomeButtons.test.ts       ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── actionSelector.test.ts       ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── modifierButtonBar.test.ts    ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── miniScoreboard.test.ts       ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── sidePanel.test.ts            ❌ NEEDS CREATION (requires RTL)
│       │   │   └── lineupCard.test.ts           ❌ NEEDS CREATION (requires RTL)
│       │   ├── popups/
│       │   │   ├── batterReachedPopup.test.ts   ❌ NEEDS CREATION
│       │   │   ├── starPlaySubtypePopup.test.ts ❌ NEEDS CREATION
│       │   │   ├── errorTypePopup.test.ts       ❌ NEEDS CREATION
│       │   │   └── injuryPrompt.test.ts         ❌ NEEDS CREATION
│       │   └── modals/
│       │       ├── pitchingChangeModal.test.ts  ❌ NEEDS CREATION
│       │       ├── pinchHitterModal.test.ts     ❌ NEEDS CREATION
│       │       ├── pinchRunnerModal.test.ts     ❌ NEEDS CREATION
│       │       ├── defensiveSubModal.test.ts    ❌ NEEDS CREATION
│       │       ├── doubleSwitchModal.test.ts    ❌ NEEDS CREATION
│       │       └── positionSwitchModal.test.ts  ❌ NEEDS CREATION
│       │
│       ├── leagueBuilder/                  📍 Phase 7: League Builder ⚠️ PARTIAL
│       │   ├── leagueBuilderLogic.test.ts       ✅ CREATED (41 tests)
│       │   ├── leagueBuilderHome.test.ts        ❌ NEEDS CREATION (requires RTL)
│       │   ├── leaguesModule.test.ts            ❌ NEEDS CREATION (requires RTL)
│       │   ├── teamsModule.test.ts              ❌ NEEDS CREATION (requires RTL)
│       │   ├── playersModule.test.ts            ❌ NEEDS CREATION (requires RTL)
│       │   ├── rostersModule.test.ts            ❌ NEEDS CREATION (requires RTL)
│       │   ├── draftModule.test.ts              ❌ NEEDS CREATION (requires RTL)
│       │   ├── rulesModule.test.ts              ❌ NEEDS CREATION (requires RTL)
│       │   └── hooks/
│       │       └── useLeagueBuilderData.test.ts ❌ NEEDS CREATION (requires RTL)
│       │
│       ├── franchiseMode/                  📍 Phase 8: Franchise Mode ⚠️ PARTIAL
│       │   ├── franchiseDataLogic.test.ts       ✅ CREATED (39 tests)
│       │   ├── franchiseSetup.test.ts           ❌ NEEDS CREATION (requires RTL)
│       │   ├── franchiseHome.test.ts            ❌ NEEDS CREATION (requires RTL)
│       │   ├── scheduleContent.test.ts          ❌ NEEDS CREATION (requires RTL)
│       │   ├── teamHubContent.test.ts           ❌ NEEDS CREATION (requires RTL)
│       │   ├── museumContent.test.ts            ❌ NEEDS CREATION (requires RTL)
│       │   ├── offseason/
│       │   │   ├── freeAgencyFlow.test.ts       ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── tradeFlow.test.ts            ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── draftFlow.test.ts            ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── springTrainingFlow.test.ts   ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── finalizeAdvanceFlow.test.ts  ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── ratingsAdjustmentFlow.test.ts ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── retirementFlow.test.ts       ❌ NEEDS CREATION (requires RTL)
│       │   │   ├── awardsCeremonyFlow.test.ts   ❌ NEEDS CREATION (requires RTL)
│       │   │   └── contractionExpansionFlow.test.ts ❌ NEEDS CREATION (requires RTL)
│       │   └── hooks/
│       │       ├── useFranchiseData.test.ts     ❌ NEEDS CREATION (requires RTL)
│       │       ├── useScheduleData.test.ts      ❌ NEEDS CREATION (requires RTL)
│       │       ├── usePlayoffData.test.ts       ❌ NEEDS CREATION (requires RTL)
│       │       ├── useOffseasonData.test.ts     ❌ NEEDS CREATION (requires RTL)
│       │       ├── useOffseasonState.test.ts    ❌ NEEDS CREATION (requires RTL)
│       │       └── useMuseumData.test.ts        ❌ NEEDS CREATION (requires RTL)
│       │
│       ├── scheduleData/                   📍 Phase 8.5: Schedule Logic ⚠️ PARTIAL
│       │   └── scheduleLogic.test.ts            ✅ CREATED (39 tests)
│       │
│       ├── playoffMode/                    📍 Phase 10: Playoff Mode ⚠️ PARTIAL
│       │   ├── playoffLogic.test.ts             ✅ CREATED (47 tests)
│       │
│       ├── exhibitionMode/                 📍 Phase 9: Exhibition
│       │   ├── exhibitionGame.test.ts           ❌ NEEDS CREATION
│       │   ├── teamRoster.test.ts               ❌ NEEDS CREATION
│       │   └── lineupConfiguration.test.ts      ❌ NEEDS CREATION
│       │
│       ├── playoffMode/                    📍 Phase 10: Playoffs
│       │   ├── worldSeries.test.ts              ❌ NEEDS CREATION
│       │   ├── playoffSetup.test.ts             ❌ NEEDS CREATION
│       │   ├── bracketView.test.ts              ❌ NEEDS CREATION
│       │   ├── playoffLeaders.test.ts           ❌ NEEDS CREATION
│       │   └── playoffHistory.test.ts           ❌ NEEDS CREATION
│       │
│       └── navigation/                     📍 Phase 11: Navigation
│           ├── appHome.test.ts                  ❌ NEEDS CREATION
│           └── routeNavigation.test.ts          ❌ NEEDS CREATION
│
└── tests/
    ├── baseballLogicTests.test.ts  ✅ EXISTS (comprehensive)
    ├── infieldFlyRule.test.ts      ❌ NEEDS CREATION
    └── e2e/
        └── gameTrackerFlow.test.ts ❌ NEEDS CREATION
```

---

## Industry Standard Validation

Based on research into MLB Statcast, FanGraphs, and Baseball-Reference methodologies:

### WAR Validation Approach
Per FanGraphs methodology: "WAR should correlate with actual team wins at r=0.83"
- Test that cumulative team WAR predicts win totals within 2 standard deviations

### Earned Run Validation
Per MLB Official Scoring Rules:
- Reconstruct innings without errors
- Verify ER attribution follows pitcher responsibility chain

### Leverage Index Validation
Per TangoTiger LI tables:
- Validate base-out states match published LI matrix
- Verify inning/score adjustments

---

## Success Criteria

| Metric | Current | Target | Phase |
|--------|---------|--------|-------|
| Test files | 5 | 120+ | All |
| Test coverage (engines) | ~15% | 80% | 2-3 |
| Test coverage (persistence) | 0% | 80% | 5 |
| Test coverage (integrations) | 0% | 70% | 5 |
| Test coverage (hooks) | 0% | 70% | 5-8 |
| Passing tests | 593 | 3000+ | All |
| Failing tests | 10 | 0 | Sprint 1 |
| Baseball rule edge cases covered | ~50 | 200+ | 1 |
| Persistence layer scenarios | 0 | 50+ | 5 |
| Engine integration scenarios | 0 | 80+ | 5 |
| **Regression tests for fixed bugs** | 0 | 30+ | 0 ⚡ |
| **API contract tests** | 0 | 15+ | 0 ⚡ |
| **Missing data tracking tests** | 0 | 25+ | 1.6 🔍 |
| **AtBatEvent field tests** | 0 | 20+ | 5.6 🔍 |
| **PostGameSummary tests** | 0 | 15+ | 5.7 🔍 |
| **GameTracker component tests** | 0 | 50+ | 6 🆕 |
| **League Builder tests** | 0 | 40+ | 7 🆕 |
| **Franchise Mode tests** | 0 | 80+ | 8 🆕 |
| **Exhibition Mode tests** | 0 | 15+ | 9 🆕 |
| **Playoff/World Series tests** | 0 | 25+ | 10 🆕 |
| **Navigation tests** | 0 | 10+ | 11 🆕 |

### Test Coverage by Feature Area (Complete Figma UI)

| Feature Area | Components | Tests Needed | Status |
|--------------|------------|--------------|--------|
| GameTracker UI | 35 components | 50+ | ❌ Phase 6 |
| League Builder | 7 pages + hook | 40+ | ❌ Phase 7 |
| Franchise Mode | 15 components + 6 hooks | 80+ | ❌ Phase 8 |
| Exhibition Mode | 2 pages + 1 component | 15+ | ❌ Phase 9 |
| Playoff Mode | 1 page + 4 subcomponents | 25+ | ❌ Phase 10 |
| Navigation | 1 page + routes | 10+ | ❌ Phase 11 |
| **TOTAL NEW** | **61 components** | **220+** | ❌ All need creation |

---

## Next Steps

### ⚡ IMMEDIATE (Sprint 0 - Before Any Other Work)
1. **Create regression tests for 9 fixed bugs** - Prevent re-introduction
   - `walkClassification.test.ts` (BUG-001/002/003/007)
   - `d3kHandler.test.ts` (BUG-004)
   - `stolenBaseLogic.test.ts` (BUG-006)
2. **Create API contract tests** - Prevent hallucinated API mismatches
   - `agingEngine.contract.test.ts`
   - `fanMoraleEngine.contract.test.ts`
   - `mwarCalculator.contract.test.ts`

### Sprint 1 (+ Gap Analysis Data Tracking)
3. **Fix the 10 failing bWAR tests** - Already written, just failing
4. **Create D3K, Save, and Inherited Runner test files**
5. **Create Missing Data Tracking tests** (FROM GAP ANALYSIS):
   - `stolenBaseTracking.test.ts` - SB/CS never updated
   - `pitchCountTracking.test.ts` - No UI exists
   - `errorTracking.test.ts` - Field exists but unused
   - `pitcherDecisions.test.ts` - W/L/S logic missing

### Sprint 2-4
6. **Complete WAR calculator test suites**
7. **Detection functions and engine integration tests**
8. **Persistence layer and hook tests** (except useFanMorale - DEFERRED)
9. **AtBatEvent field tests** (FROM GAP ANALYSIS):
   - LI, WPA, clutch fields currently hardcoded
   - Runner IDs always empty
10. **PostGameSummary tests** (FROM GAP ANALYSIS):
    - Currently 100% mock data
    - Need useCompletedGame hook tests

### Sprint 5
11. **E2E and cross-browser validation**

---

## Gap Analysis Reconciliation Note

The DEFINITIVE_GAP_ANALYSIS.md (in `src/src_figma/spec-docs/`) claimed that persistence files
don't exist. However, the Reconciliation audit found they DO exist via cross-imports:

| Gap Analysis Claim | Actual Status |
|--------------------|---------------|
| `useSeasonData.ts` doesn't exist | ✅ EXISTS at `src/hooks/useSeasonData.ts` |
| `useSeasonStats.ts` doesn't exist | ✅ EXISTS at `src/hooks/useSeasonStats.ts` |
| `seasonStorage.ts` doesn't exist | ✅ EXISTS at `src/utils/seasonStorage.ts` |
| `eventLog.ts` doesn't exist | ✅ EXISTS at `src/storage/eventLog.ts` |

The Gap Analysis correctly identified **data tracking issues** (SB, CS, pitch count, errors)
that need tests, but its "missing file" claims are outdated. Cross-imports from Figma to
legacy resolve these imports correctly.

---

---

## Appendix: Spec-to-Test Mapping

> **Reference**: `src/src_figma/spec-docs/WHAT_TO_BUILD_MASTER_SPEC.md`
> **Purpose**: Map spec requirements to test coverage

### WHAT_TO_BUILD Appendix B → Testing Plan Mapping

| Spec Requirement | Spec Section | Test Coverage | Status |
|------------------|--------------|---------------|--------|
| **B.1 CRITICAL** | | | |
| Add pitch count input per at-bat | §1.8 | Phase 1.6: `pitchCountTracking.test.ts` | ❌ Not implemented |
| Add `basesReachedViaError` to PitcherGameStats | §4.2 | Phase 5.6: `leverageFields.test.ts` | ❌ Not implemented |
| Implement `pitchCount` increment | §4.3 | Phase 1.6: `pitchCountTracking.test.ts` | ❌ Not implemented |
| Separate HBP from BB in stats | §4.3 | Phase 0: `walkClassification.test.ts` | ✅ Fixed (BUG-001/002/003) |
| Track inherited/bequeathed runners | §4.2 | Phase 1.5: `inheritedRunnerTracker.test.ts` | ❌ Not tested |
| Remove Balk button | §6.1 | N/A (UI removal) | ✅ Fixed (Jan 25, 2026) |
| **B.2 HIGH** | | | |
| Add `isForced()` validation function | §3.1 | Phase 1.1: `baseballLogicTests.test.ts` | ✅ Exists |
| Hide "Hold" option for forced runners | §3.1 | Phase 1.1: force play tests | ⚠️ Partial |
| Disable buttons when no runners | §3.5 | Phase 6: UI tests | ❌ Not tested |
| Add GO → DP auto-correction | §2.4 | Phase 1.1: auto-correction tests | ✅ Fixed |
| Add force out negates runs validation | §3.4 | Phase 1.1: force play tests | ⚠️ Partial |
| Track `hitOrder[]` for cycle detection | §4.2 | Phase 3: `detectionFunctions.test.ts` | ❌ Not tested |
| **B.3 MEDIUM** | | | |
| Fielding play type tracking | §1.6 | Phase 1.6: `errorTracking.test.ts` | ❌ Not implemented |
| Error type differentiation | §1.6 | Phase 1.6: `errorTracking.test.ts` | ❌ Not implemented |
| Assist chain storage | §4.2 | Phase 5.1: `eventLog.test.ts` | ❌ Not tested |
| DP role tracking | §4.2 | Phase 3: detection tests | ❌ Not tested |
| Outfield assist target base | §4.2 | Phase 3: detection tests | ❌ Not tested |
| Leverage Index calculation | §5.4 | Phase 5.6: `leverageFields.test.ts` | ❌ Hardcoded 1.0 |
| Ball-in-play data | §4.2 | Phase 5.6: `runnerFields.test.ts` | ❌ Always null |

### Spec Part → Test Phase Mapping

| Spec Part | Test Phase | Coverage |
|-----------|------------|----------|
| Part 1: UI Data Capture | Phase 1.6 (Data Tracking) | ⚠️ Gaps |
| Part 2: Inference Engine | Phase 1.1 (Runner Movement) | ✅ Good |
| Part 3: Validation Rules | Phase 1.1-1.5 (Baseball Rules) | ⚠️ Partial |
| Part 4: Stat Accumulation | Phase 5.1-5.4 (Persistence) | ❌ No tests |
| Part 5: Fame/Clutch/WAR | Phase 2-3 (Stats, Detection) | ⚠️ Partial |
| Part 6: SMB4 Constraints | N/A (design constraints) | ✅ Balk removed |

### Key Gaps Between Spec and Implementation

| Gap | Spec Says | Current State | Test Needed |
|-----|-----------|---------------|-------------|
| Pitch count | §1.8: "CRITICAL - blocks Maddux" | No UI, never updated | `pitchCountTracking.test.ts` |
| Runner IDs | §4.2: AtBatEvent.runners | Always empty string | `runnerIdTracking.test.ts` |
| LI calculation | §5.4: BASE_OUT_LI table | Hardcoded 1.0 | `leverageFields.test.ts` |
| WPA calculation | §4.2: winProbability fields | Hardcoded 0.5 | `leverageFields.test.ts` |
| Error tracking | §1.6: Error type required | Fields never updated | `errorTracking.test.ts` |
| W/L/S decisions | Not in spec! | Logic missing | `pitcherDecisions.test.ts` |

> **Note**: Pitcher W/L/S decision logic is in DEFINITIVE_GAP_ANALYSIS but NOT in WHAT_TO_BUILD_MASTER_SPEC. This may be a spec gap.

---

*This plan was created using research from: [MLB Statcast](https://www.mlb.com/glossary/statcast), [FanGraphs WAR](https://library.fangraphs.com/misc/war/), [Baseball-Reference WAR](https://www.baseball-reference.com/about/war_explained.shtml), [Baseball Rules Academy](https://baseballrulesacademy.com/)*
