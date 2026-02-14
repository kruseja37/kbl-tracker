# Legacy vs Figma GameTracker Audit

**Audit Date:** 2026-02-02 (Updated 2026-02-03)
**Purpose:** Identify discrepancies, orphaned features, and missing implementations between legacy and Figma codebases
**Build Status:** ✅ PASSING (42 errors fixed on 2026-02-03)

---

## RECONCILIATION COMPLETE (2026-02-03 Late Night)

All 42 TypeScript build errors have been fixed. The Figma codebase now compiles successfully with cross-imports from legacy.

### Errors Fixed

| File | Errors | Fix Applied |
|------|--------|-------------|
| `agingIntegration.ts` | 3 | Pass ratings as `{overall: rating}` object |
| `useAgingData.ts` | 5 | Use `result.shouldRetire`, `result.ratingChanges` |
| `fanMoraleIntegration.ts` | 8 | FanState: ELECTRIC→EUPHORIC, HYPED→EXCITED, etc. |
| `useFanMorale.ts` | 21 | Stubbed out (not imported anywhere) |
| `useMWARCalculations.ts` | 3 | Fixed import path, fixed `createManagerDecision` params |
| `mwarIntegration.ts` | 1 | Return copy after void mutation |
| `milestoneAggregator.ts` | 1 | Created missing `franchiseStorage.ts` |

### Root Cause
AI-generated integration files hallucinated API signatures without checking actual legacy code.

### Test Status
- 593 tests passing
- 10 tests failing (pre-existing bWAR formula issues, NOT related to this fix)

---

## CRITICAL UPDATE (2026-02-03)

**The DEFINITIVE_GAP_ANALYSIS.md was INCORRECT.** The persistence layer DOES exist in Figma.

### Key Discovery: Import Path Resolution

```
src/src_figma/hooks/useFranchiseData.ts imports:
  - '../../hooks/useSeasonData'     → src/hooks/useSeasonData.ts    ✅ EXISTS (legacy)
  - '../../hooks/useSeasonStats'    → src/hooks/useSeasonStats.ts   ✅ EXISTS (legacy)
  - '../../utils/seasonStorage'     → src/src_figma/utils/seasonStorage.ts ✅ EXISTS
```

**The Figma codebase CROSS-IMPORTS from legacy.** This works but creates coupling.

### File Counts (Accurate)

| Category | Legacy Only | Figma Only | Shared/Copied | Notes |
|----------|-------------|------------|---------------|-------|
| Utils | 23 | 0 | 7 | 7 files identical (just import paths differ) |
| Hooks | 13 | 10 | 5 | Figma has NEW hooks + imports legacy |
| Engines | 16 | 10 | 2 | Figma has wrappers + new trackers |

---

## Executive Summary

| Category | Legacy | Figma | Status |
|----------|--------|-------|--------|
| Detection Functions | 26 | 13 | **GAP: 13 missing** |
| Fame Event Types | 150+ | ~20 referenced | **GAP: 130+ missing** |
| Calculation Engines | 19 | 12 (10 new + 2 shared) | **GAP: 16 not in Figma** |
| Custom Hooks | 18 | 15 (10 new + 5 cross-import) | **GAP: 13 not migrated** |
| Game State Complexity | Full tracking | Partial | **GAP: Many fields missing** |
| Utils | 30 | 7 | **GAP: 23 not in Figma** |

---

## Category 1: MISSING DETECTION FUNCTIONS

### In Legacy (detectionFunctions.ts), NOT in Figma:

#### Auto-Detection (Should be automatic):
| Function | Description | Priority |
|----------|-------------|----------|
| `detectBlownSave()` | Detect blown save + blown save loss distinction | HIGH |
| `isSaveOpportunity()` | Determine if pitcher in save opportunity | HIGH |
| `detectTriplePlay()` | Detect triple play (with unassisted distinction) | MEDIUM |
| `detectHitIntoTriplePlay()` | Tag batter for hitting into TP | MEDIUM |
| `detectEscapeArtist()` | Bases loaded 0 outs → no runs allowed | MEDIUM |
| `detectPositionPlayerPitching()` | PP clean innings, K, runs allowed | LOW |
| `detectDroppedFly()` | Fielding error: missed catch (clutch vs normal) | MEDIUM |
| `detectBootedGrounder()` | Fielding error: fielding on ground ball | MEDIUM |
| `detectWrongBaseThrow()` | Fielding error: throwing to wrong base | MEDIUM |
| `detectPassedBallRun()` | Catcher error: passed ball run (winning run distinction) | MEDIUM |
| `detectThrowOutAtHome()` | Outfield assist: throw out at home | MEDIUM |
| `detectPickedOff()` | Picked off to end game/inning | LOW |
| `detectWalkedInRun()` | Walked in run with bases loaded | MEDIUM |
| `detectClutchGrandSlam()` | Grand slam that ties or takes lead | MEDIUM |
| `detectRallyStarter()` | Starts 3+ run rally | LOW |
| `detectRallyKiller()` | Ends rally with 2+ RISP stranded | LOW |
| `detectIBBStrikeout()` | Strikes out after IBB to previous batter | LOW |

#### Prompt Detection (User Confirmation):
| Function | Figma Has? | Notes |
|----------|------------|-------|
| `promptWebGem()` | ✅ | Implemented as WEB_GEM button |
| `promptRobbery()` | ✅ | Implemented as ROBBERY button |
| `promptTOOTBLAN()` | ✅ | Implemented as TOOTBLAN button |
| `promptNutShot()` | ✅ | Implemented as NUT button |
| `promptKilledPitcher()` | ✅ | Implemented as KP button |
| `promptInsideParkHR()` | ❌ | **MISSING** - No inside-the-park HR prompt |

---

## Category 2: ORPHANED CALCULATION ENGINES

### Engines in Legacy NOT Used in Figma:

| Engine | File | Status | Notes |
|--------|------|--------|-------|
| **bwarCalculator.ts** | src/engines/ | ORPHANED | Batting WAR - not connected to Figma |
| **pwarCalculator.ts** | src/engines/ | ORPHANED | Pitching WAR - not connected |
| **fwarCalculator.ts** | src/engines/ | ORPHANED | Fielding WAR - not connected |
| **rwarCalculator.ts** | src/engines/ | ORPHANED | Baserunning WAR - not connected |
| **mwarCalculator.ts** | src/engines/ | ORPHANED | Manager WAR - not connected |
| **leverageCalculator.ts** | src/engines/ | ✅ INTEGRATED | Now used in Figma |
| **clutchCalculator.ts** | src/engines/ | ORPHANED | Multi-participant clutch attribution |
| **salaryCalculator.ts** | src/engines/ | ORPHANED | Player salary system |
| **mojoEngine.ts** | src/engines/ | ORPHANED | Player confidence/momentum |
| **fitnessEngine.ts** | src/engines/ | ORPHANED | Player physical condition |
| **fameEngine.ts** | src/engines/ | ✅ INTEGRATED | Now used for Fame calculation |
| **fanMoraleEngine.ts** | src/engines/ | ORPHANED | Fan sentiment system |
| **narrativeEngine.ts** | src/engines/ | ORPHANED | Beat reporter system |
| **agingEngine.ts** | src/engines/ | ORPHANED | Player aging/decline |
| **relationshipEngine.ts** | src/engines/ | ORPHANED | Player/team relationships |

**Action Required:** Either integrate these engines into Figma or document why they're not needed.

---

## Category 3: MISSING FAME EVENT TYPES

### Figma references ~20 events, Legacy has 150+

#### Missing Positive Events (Bonuses):
- Walk-Off events: `WALK_OFF`, `WALK_OFF_HR`, `WALK_OFF_GRAND_SLAM`
- Defensive: `TRIPLE_PLAY`, `UNASSISTED_TRIPLE_PLAY`, `THROW_OUT_AT_HOME`
- Multi-Hit: `CYCLE`, `NATURAL_CYCLE`, `MULTI_HR_2/3/4PLUS`, `BACK_TO_BACK_HR`, `BACK_TO_BACK_TO_BACK_HR`
- Game context: `CLUTCH_GRAND_SLAM`, `THREE/FOUR/FIVE/SIX_HIT_GAME`, `FIVE/EIGHT/TEN_RBI_GAME`
- Pitching: `NO_HITTER`, `PERFECT_GAME`, `MADDUX`, `COMPLETE_GAME`, `SHUTOUT`
- Pitching detailed: `IMMACULATE_INNING`, `NINE_PITCH_INNING`, `SHUTDOWN_INNING`, `STRIKE_OUT_SIDE`, `TEN/FIFTEEN_K_GAME`
- SMB4 specific: `NUT_SHOT_DELIVERED`, `NUT_SHOT_TOUGH_GUY`, `STAYED_IN_AFTER_HIT`
- Position Player: `PP_CLEAN_INNING`, `PP_MULTIPLE_CLEAN`, `PP_GOT_K`
- Team: `COMEBACK_WIN_3/5/7`, `COMEBACK_HERO`, `RALLY_STARTER`
- Career milestones (20+ tiers for HR, hits, RBI, runs, SB, doubles, BB, grand slams, wins, K, saves, IP, shutouts, CG, no-hitters, perfect games, WAR)

#### Missing Negative Events (Boners):
- Strikeout shame: `HAT_TRICK/3K`, `GOLDEN_SOMBRERO/4K`, `PLATINUM_SOMBRERO/5K`, `TITANIUM_SOMBRERO/6K`, `IBB_STRIKEOUT`
- Offensive failures: `HIT_INTO_TRIPLE_PLAY`, `MEATBALL_WHIFF`, `BASES_LOADED_FAILURE`, `LOB_KING/5+`, `MULTIPLE_GIDP`, `RALLY_KILLER`
- Pitching disasters: `MELTDOWN/6+`, `MELTDOWN_SEVERE/10+`, `FIRST_INNING_DISASTER/5+`, `WALKED_IN_RUN`, `B2B2B_HR_ALLOWED`, `BLOWN_SAVE`, `BLOWN_SAVE_LOSS`, `BLOWN_LEAD_3/5`
- Fielding errors: `NUT_SHOT_VICTIM`, `DROPPED_FLY`, `DROPPED_FLY_CLUTCH`, `BOOTED_GROUNDER`, `WRONG_BASE_THROW`, `PASSED_BALL_RUN`, `PASSED_BALL_WINNING_RUN`
- Baserunning: `TOOTBLAN_RALLY_KILLER`, `PICKED_OFF_END_GAME`, `PICKED_OFF_END_INNING`, `BATTER_OUT_STRETCHING`

---

## Category 4: MISSING GAME STATE FIELDS

### FieldingData - Legacy has, Figma Missing:

| Field | Legacy | Figma | Notes |
|-------|--------|-------|-------|
| `zoneId` | ✅ | ❌ | Zone-based input alternative |
| `battedBallDepth` | ✅ (shallow/infield/outfield/deep) | Partial | Only y-coordinate used |
| `assistChain` | ✅ (multi-level relay) | ❌ | Relay throw tracking |
| `dpRole` | ✅ (started/turned/completed/unassisted) | ❌ | DP attribution |
| `infieldFly` | ✅ | ❌ | IFR tracking |
| `ifrCaught` | ✅ | ❌ | Whether IFR was caught |
| `groundRuleDouble` | ✅ | ❌ | GRD tracking |
| `badHop` | ✅ | ❌ | Bad hop event |
| `d3kEvent` | ✅ | Partial | D3K tracking exists but limited |
| `d3kOutcome` | ✅ (OUT/WP/PB/E_CATCHER/E_1B) | ❌ | D3K outcome detail |
| `robberyAttempted` | ✅ | ❌ | Whether robbery was attempted |
| `robberyFailed` | ✅ | ❌ | Whether robbery failed |
| `savedRun` | ✅ | ❌ | Saved run flag |
| `errorContext` | ✅ (routine/allowed_run/difficult) | ❌ | Error context |

### Runner Tracking - Legacy has, Figma Missing:

| Field | Legacy | Figma | Notes |
|-------|--------|-------|-------|
| `howReached` | ✅ (hit/walk/HBP/error/FC) | ❌ | For ER tracking |
| `inheritedFrom` | ✅ | ❌ | For pinch runner ER tracking |
| `bequeathedRunners` | ✅ | ❌ | Runners left for new pitcher |
| `extraEvents` | ✅ (WP/PB/E/BALK inference) | ❌ | Non-standard advancement |
| `batterThrownOutAdvancing` | ✅ | ❌ | Stretching a hit |

### Substitution Events - Legacy has, Figma Missing:

| Event | Legacy | Figma |
|-------|--------|-------|
| `PinchHitterEvent` | ✅ | ❌ |
| `PinchRunnerEvent` | ✅ (with inheritance) | ❌ |
| `DefensiveSubEvent` | ✅ (multiple per event) | ❌ |
| `PitchingChangeEvent` | ✅ (with bequeathed) | ❌ |
| `DoubleSwitchEvent` | ✅ | ❌ |
| `PositionSwitchEvent` | ✅ | ❌ |

---

## Category 5: MISSING HOOKS

### Legacy Hooks NOT in Figma:

| Hook | Purpose | Priority |
|------|---------|----------|
| `useWARCalculations.ts` | WAR component calculation | HIGH |
| `useFameDetection.ts` | Auto-detection of fame events | HIGH |
| `useFanMorale.ts` | Fan morale tracking | MEDIUM |
| `useMojoState.ts` | Player mojo state | MEDIUM |
| `useFitnessState.ts` | Player fitness state | MEDIUM |
| `useClutchCalculations.ts` | Clutch attribution | MEDIUM |
| `useMWARCalculations.ts` | Manager WAR | LOW |
| `useDataIntegrity.ts` | Data consistency checks | HIGH |
| `useAgingData.ts` | Player aging | LOW |
| `useRelationshipData.ts` | Relationship tracking | LOW |

### Figma Has These Hooks:

| Hook | Notes |
|------|-------|
| `useGamePersistence.ts` | ✅ Game save/load |
| `useSeasonData.ts` | ✅ Season aggregation |
| `useSeasonStats.ts` | ✅ Season statistics |
| `useCareerStats.ts` | ✅ Career statistics |
| `useLiveStats.ts` | ✅ Live game statistics |
| `useRosterData.ts` | ✅ Team roster management |
| `useNarrativeMorale.ts` | Unclear if connected |
| `useOffseasonPhase.ts` | ✅ Offseason handling |

---

## Category 6: MISSING UI COMPONENTS

### Legacy Components NOT in Figma:

| Component | Purpose | Priority |
|-----------|---------|----------|
| `PitchingChangeModal.tsx` | Full pitcher substitution with inherited runners | HIGH |
| `PinchHitterModal.tsx` | Pinch hitter with lineup slot | HIGH |
| `PinchRunnerModal.tsx` | Pinch runner with inheritance | HIGH |
| `DefensiveSubModal.tsx` | Multi-player defensive sub | HIGH |
| `DoubleSwitchModal.tsx` | Simultaneous pitcher + position swap | MEDIUM |
| `PositionSwitchModal.tsx` | Position swap without sub | MEDIUM |
| `InningEndSummary.tsx` | End-of-inning recap | MEDIUM |
| `WARDisplay.tsx` | WAR visualization | MEDIUM |
| `SalaryDisplay.tsx` | Player salary/value | LOW |
| `FameDisplay.tsx` | Fame/reputation tracking | MEDIUM |
| `FanMoraleDisplay.tsx` | Fan sentiment | LOW |
| `FameEventModal.tsx` | Fame event confirmation | MEDIUM |
| `FameEventToast.tsx` | Fame event notifications | LOW |
| `NarrativeDisplay.tsx` | Beat reporter narrative | LOW |
| `CareerDisplay.tsx` | Career statistics | MEDIUM |
| `SeasonLeaderboards.tsx` | Season leaders | MEDIUM |
| `SeasonSummary.tsx` | Season recap | MEDIUM |
| `WalkoffCelebration.tsx` | Walk-off animation | LOW |
| `OffseasonFlow.tsx` | Offseason phase flow | MEDIUM |
| `FieldZoneInput.tsx` | Zone-based field input | LOW |
| `GameSetupModal.tsx` | Game initialization | HIGH |

---

## Category 7: ADVANCED FEATURES MISSING IN FIGMA

### High Priority (Core Functionality):

1. **Inherited Runner Tracking** - Who is responsible for ER when runners score
2. **Bequeathed Runners** - Runners left for new pitcher
3. **Save Opportunity Detection** - Auto-detect save situations
4. **Blown Save Detection** - Detect and track blown saves
5. **D3K Full Tracking** - Complete dropped 3rd strike outcomes
6. **Substitution System** - All substitution types with proper tracking

### Medium Priority (Enhanced Analytics):

7. **Assist Chain Tracking** - Multi-level relay throws
8. **DP Role Attribution** - Who started/turned/completed
9. **Error Context** - Routine vs difficult, allowed run
10. **Extra Events Inference** - WP/PB/E for non-standard advancement
11. **Batter Thrown Out Advancing** - Stretching hits
12. **Auto-Correction Logic** - FO→SF, GO→DP

### Lower Priority (Polish):

13. **Zone-Based Field Input** - Alternative to direction-based
14. **Beat Reporter System** - Personality-driven narratives
15. **Fan Morale Drift** - Momentum-based calculation
16. **Relationship Engine** - Player/team relationships
17. **Aging Engine** - Player decline curves

---

## Category 8: TYPE/ENUM DISCREPANCIES

### AtBatResult - Legacy vs Figma:

| Type | Legacy | Figma |
|------|--------|-------|
| Strikeout Looking | `KL` | `KL` ✅ |
| Double Play | `DP` | `DP` ✅ |
| Triple Play | Part of DP logic | `TP` ✅ |
| Fielder's Choice | `FC` | `FC` ✅ |
| Dropped 3rd Strike | `D3K` | `D3K` ✅ |

### Special Play Types - Legacy has more:

| Type | Legacy | Figma |
|------|--------|-------|
| Routine | ✅ | ❌ |
| Diving | ✅ | Inferred from WEB_GEM |
| Wall Catch | ✅ | Inferred from ROBBERY |
| Running | ✅ | ❌ |
| Leaping | ✅ | ❌ |
| Clean | ✅ | ❌ |
| Over Fence | ✅ | ✅ |
| Wall Scraper | ✅ | ❌ |

### D3K Outcomes - Legacy has full tracking:

| Outcome | Legacy | Figma |
|---------|--------|-------|
| OUT | ✅ | ❌ |
| WP (Wild Pitch) | ✅ | ❌ |
| PB (Passed Ball) | ✅ | ❌ |
| E_CATCHER | ✅ | ❌ |
| E_1B | ✅ | ❌ |

---

## Recommendations

### Immediate Actions (High Priority):

1. **Integrate WAR Calculators** - Connect bwar, pwar, fwar, rwar to Figma
2. **Add Substitution System** - Build modals for all substitution types
3. **Add Save/Blown Save Detection** - Critical for pitcher stats
4. **Add Inherited/Bequeathed Runner Tracking** - For ER attribution
5. **Complete D3K Tracking** - Add outcome types

### Short-Term Actions (Medium Priority):

6. **Add Missing Detection Functions** - 13 auto-detection functions
7. **Connect Mojo/Fitness Engines** - Player state tracking
8. **Add Fame Event Auto-Detection** - For 130+ event types
9. **Add Error Context Tracking** - Routine vs difficult
10. **Add DP Role Attribution** - Started/turned/completed

### Long-Term Actions (Lower Priority):

11. **Beat Reporter System** - Narrative generation
12. **Fan Morale System** - Sentiment tracking
13. **Relationship Engine** - Player dynamics
14. **Zone-Based Input** - Alternative field input
15. **Aging Engine** - Career progression

---

## Files to Review

### Legacy Files with Complex Logic:
- `src/components/GameTracker/detectionFunctions.ts` - 26 detection functions
- `src/components/GameTracker/FieldingModal.tsx` - Comprehensive fielding
- `src/components/GameTracker/AtBatFlow.tsx` - Full at-bat workflow
- `src/types/game.ts` - All type definitions

### Figma Files to Extend:
- `src/src_figma/app/components/playClassifier.ts` - Add detection functions
- `src/src_figma/app/components/EnhancedInteractiveField.tsx` - Add fields
- `src/src_figma/app/engines/` - Add more engines

---

**Last Updated:** 2026-02-03
**Next Review:** After addressing high-priority gaps

---

## APPENDIX A: Detailed File Comparison (Added 2026-02-03)

### Utils: In Legacy BUT NOT in Figma (23 files)

| File | Purpose | Priority |
|------|---------|----------|
| backupRestore.ts | Database backup/restore | LOW |
| customPlayerStorage.ts | Custom player creation | MEDIUM |
| farmStorage.ts | Farm system storage | LOW |
| franchiseStorage.ts | Franchise data persistence | HIGH |
| headlineGenerator.ts | Generate news headlines | LOW |
| leagueBuilderStorage.ts | League builder persistence | HIGH |
| leagueConfig.ts | League configuration | MEDIUM |
| leagueStorage.ts | League metadata | MEDIUM |
| liveStatsCalculator.ts | Real-time stat calculation | MEDIUM |
| mojoSystem.ts | Mojo state management | HIGH |
| museumStorage.ts | Hall of Fame/Museum | LOW |
| offseasonStorage.ts | Offseason data | HIGH |
| playerMorale.ts | Player morale tracking | LOW |
| playerRatingsStorage.ts | Player ratings storage | MEDIUM |
| playoffStorage.ts | Playoff data persistence | HIGH |
| ratingsStorage.ts | Ratings adjustments | MEDIUM |
| relationshipStorage.ts | Player relationships | LOW |
| scheduleStorage.ts | Season schedule | HIGH |
| seasonEndProcessor.ts | End of season processing | HIGH |
| teamMVP.ts | Team MVP calculations | LOW |
| transactionStorage.ts | Transaction history | MEDIUM |
| unifiedPlayerStorage.ts | Unified player data | MEDIUM |
| walkoffDetector.ts | Walk-off detection | LOW |

### Utils: In BOTH Codebases (7 files - IDENTICAL)

| File | Lines | Status |
|------|-------|--------|
| careerStorage.ts | 917 | SYNCED |
| eventLog.ts | 845 | SYNCED |
| gameStorage.ts | 352 | SYNCED |
| milestoneAggregator.ts | 918 | SYNCED |
| milestoneDetector.ts | 1706 | SYNCED |
| seasonAggregator.ts | 388 | SYNCED |
| seasonStorage.ts | 917 | SYNCED |

### Hooks: In Legacy BUT NOT in Figma (13 hooks)

| Hook | Purpose | Priority |
|------|---------|----------|
| useCareerStats.ts | Career statistics access | MEDIUM |
| useClutchCalculations.ts | Clutch stat calculations | HIGH |
| useDataIntegrity.ts | Data validation | LOW |
| useFameDetection.ts | Fame event detection | HIGH |
| useFitnessState.ts | Fitness tracking | HIGH |
| useGamePersistence.ts | Game save/load | HIGH |
| useLiveStats.ts | Live stat updates | MEDIUM |
| useMojoState.ts | Mojo tracking | HIGH |
| useNarrativeMorale.ts | Narrative generation | LOW |
| useOffseasonPhase.ts | Offseason flow control | HIGH |
| useRosterData.ts | Roster management | MEDIUM |
| useSeasonData.ts | Season metadata | HIGH (but cross-imported) |
| useSeasonStats.ts | Season statistics | HIGH (but cross-imported) |

### Hooks: In Figma BUT NOT in Legacy (10 hooks - NEW)

| Hook | Purpose |
|------|---------|
| useFameTracking.ts | Fame tracking (Figma version) |
| useFranchiseData.ts | Franchise data orchestration |
| useGameState.ts | Game state management |
| useLeagueBuilderData.ts | League builder state |
| useMuseumData.ts | Museum/HOF data |
| useOffseasonData.ts | Offseason data access |
| useOffseasonState.ts | Offseason state machine |
| usePlayerState.ts | Player state (Mojo/Fitness) |
| usePlayoffData.ts | Playoff data access |
| useScheduleData.ts | Schedule access |

### Engines: In Legacy BUT NOT in Figma (16 engines)

| Engine | Purpose | Priority |
|--------|---------|----------|
| agingEngine.ts | Player aging calculations | HIGH |
| bwarCalculator.ts | Batting WAR | HIGH |
| clutchCalculator.ts | Clutch performance | MEDIUM |
| detectionFunctions.ts | Event detection (45+ functions) | HIGH |
| fameEngine.ts | Fame/notoriety calculation | HIGH |
| fanMoraleEngine.ts | Fan morale system | LOW |
| fitnessEngine.ts | Fitness state machine | HIGH |
| fwarCalculator.ts | Fielding WAR | HIGH |
| leverageCalculator.ts | Leverage Index | HIGH |
| mojoEngine.ts | Mojo state machine | HIGH |
| mwarCalculator.ts | Manager WAR | MEDIUM |
| narrativeEngine.ts | Story generation | LOW |
| pwarCalculator.ts | Pitching WAR | HIGH |
| relationshipEngine.ts | Player relationships | LOW |
| rwarCalculator.ts | Baserunning WAR | MEDIUM |
| salaryCalculator.ts | Salary calculations | MEDIUM |

### Engines: In Figma BUT NOT in Legacy (10 engines - NEW)

| Engine | Purpose |
|--------|---------|
| agingIntegration.ts | Aging hooks for Figma |
| d3kTracker.ts | Dropped 3rd strike tracking |
| detectionIntegration.ts | Detection wrapper for Figma |
| fameIntegration.ts | Fame wrapper for Figma |
| fanMoraleIntegration.ts | Fan morale wrapper |
| inheritedRunnerTracker.ts | Inherited runner ER tracking |
| mwarIntegration.ts | Manager WAR wrapper |
| playerStateIntegration.ts | Player state wrapper |
| relationshipIntegration.ts | Relationship wrapper |
| saveDetector.ts | Save situation detection |
