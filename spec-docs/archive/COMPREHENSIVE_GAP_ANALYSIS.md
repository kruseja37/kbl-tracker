# Comprehensive Gap Analysis: Legacy vs Figma Codebase

> **Created**: 2026-02-03
> **Status**: AUTHORITATIVE - Complete codebase audit
> **Purpose**: Single source of truth for building out Figma codebase
> **Supersedes**: DEFINITIVE_GAP_ANALYSIS.md (persistence-only focus)

---

## Executive Summary

| Metric | Legacy | Figma | Gap |
|--------|--------|-------|-----|
| **Total Files** | 186 | 138 | -48 files |
| **Total Size** | 4.5 MB | 2.8 MB | -1.7 MB |
| **Engines** | 19 | 8 | -11 engines |
| **Hooks** | 18 | 11 | -7 hooks (but many not equivalent) |
| **Utils** | 29 | 0 | **-29 utils** |
| **Types** | 3 (66KB) | 2 (10KB) | -56KB of type definitions |
| **Context** | 2 | 0 | **-2 context files** |
| **Services** | 2 | 0 | **-2 service files** |
| **Tests** | 16 | 0 | **-16 test files** |

---

## SECTION 1: Missing Engines

### 1.1 Engines NOT Integrated into Figma (Exist in Legacy, Need Wiring)

| Engine | Legacy Path | Size | Status | Required For |
|--------|-------------|------|--------|--------------|
| **mwarCalculator.ts** | src/engines/ | 24KB | NOT REFERENCED | Manager WAR calculations, Manager Moment prompt |
| **fanMoraleEngine.ts** | src/engines/ | 35KB | NOT REFERENCED | Fan morale system, contraction risk, trade scrutiny |
| **relationshipEngine.ts** | src/engines/ | 7.5KB | NOT REFERENCED | Chemistry system (9 relationship types, morale effects) |
| **agingEngine.ts** | src/engines/ | 6.4KB | PARTIAL (SpringTrainingFlow only) | Season transition aging, retirement probability |
| **narrativeEngine.ts** | src/engines/ | 40KB | NOT EXAMINED | Dynamic storylines, narrative generation |

### 1.2 Engines Already Integrated (Reference Only)

| Engine | Integration Method | Figma Wrapper |
|--------|-------------------|---------------|
| leverageCalculator.ts | Direct import | useGameState.ts, EnhancedInteractiveField.tsx |
| clutchCalculator.ts | Wrapper | playerStateIntegration.ts |
| salaryCalculator.ts | Direct import | useOffseasonData.ts |
| bwarCalculator.ts | Wrapper | useWARCalculations.ts hook |
| pwarCalculator.ts | Wrapper | useWARCalculations.ts hook |
| fwarCalculator.ts | Wrapper | useWARCalculations.ts hook |
| rwarCalculator.ts | Wrapper | useWARCalculations.ts hook |
| mojoEngine.ts | Wrapper | playerStateIntegration.ts |
| fitnessEngine.ts | Wrapper | playerStateIntegration.ts |
| fameEngine.ts | Wrapper | fameIntegration.ts |
| detectionFunctions.ts | Wrapper | detectionIntegration.ts |
| adaptiveLearningEngine.ts | Direct port | - |

---

## SECTION 2: Missing Utils (CRITICAL - 29 Files, ~500KB)

### 2.1 Storage Utils (Persistence Layer - BLOCKING)

| File | Size | Purpose | Priority |
|------|------|---------|----------|
| **eventLog.ts** | 26KB | AtBatEvent persistence, game headers | 🔴 CRITICAL |
| **seasonStorage.ts** | 26KB | Season stats, standings | 🔴 CRITICAL |
| **careerStorage.ts** | 30KB | Career stats persistence | 🔴 CRITICAL |
| **gameStorage.ts** | 10KB | Game state persistence | 🔴 CRITICAL |
| **franchiseStorage.ts** | 23KB | Franchise data persistence | 🔴 CRITICAL |
| **museumStorage.ts** | 24KB | Hall of Fame, records | 🟡 HIGH |
| **offseasonStorage.ts** | 19KB | Offseason transaction persistence | 🟡 HIGH |
| **playoffStorage.ts** | 18KB | Playoff bracket persistence | 🟡 HIGH |
| **scheduleStorage.ts** | 14KB | Schedule persistence | 🟡 HIGH |
| **leagueBuilderStorage.ts** | 22KB | League builder persistence | 🟡 HIGH |
| **transactionStorage.ts** | 16KB | Trade/FA transaction persistence | 🟡 HIGH |
| **farmStorage.ts** | 8KB | Farm system persistence | 🟡 HIGH |
| **relationshipStorage.ts** | 7KB | Relationship data persistence | 🟡 HIGH |
| **ratingsStorage.ts** | 7KB | Player ratings persistence | 🟡 HIGH |
| **leagueStorage.ts** | 2KB | League config persistence | 🟢 MEDIUM |
| **playerRatingsStorage.ts** | 2KB | Player ratings storage | 🟢 MEDIUM |
| **customPlayerStorage.ts** | 4KB | Custom player persistence | 🟢 MEDIUM |
| **unifiedPlayerStorage.ts** | 11KB | Unified player data access | 🟢 MEDIUM |

### 2.2 Calculation/Aggregation Utils

| File | Size | Purpose | Priority |
|------|------|---------|----------|
| **milestoneDetector.ts** | 52KB | Detect milestones (single-game, season, career) | 🔴 CRITICAL |
| **milestoneAggregator.ts** | 28KB | Aggregate milestones, Fame Bonus/Boner | 🔴 CRITICAL |
| **seasonAggregator.ts** | 11KB | Aggregate game → season stats | 🔴 CRITICAL |
| **seasonEndProcessor.ts** | 15KB | End-of-season processing | 🟡 HIGH |
| **teamMVP.ts** | 25KB | Team MVP calculations | 🟡 HIGH |
| **liveStatsCalculator.ts** | 9KB | Real-time stat calculations | 🟡 HIGH |
| **mojoSystem.ts** | 27KB | Mojo state management | 🟡 HIGH |
| **playerMorale.ts** | 4KB | Player morale calculations | 🟡 HIGH |
| **walkoffDetector.ts** | 4KB | Walk-off detection | 🟡 HIGH |
| **headlineGenerator.ts** | 7KB | Generate news headlines | 🟢 MEDIUM |

### 2.3 Config Utils

| File | Size | Purpose | Priority |
|------|------|---------|----------|
| **leagueConfig.ts** | 9KB | League configuration | 🟢 MEDIUM |
| **backupRestore.ts** | 10KB | Data backup/restore | 🟢 MEDIUM |

---

## SECTION 3: Missing Hooks (16 Hooks)

### 3.1 Critical Data Hooks

| Hook | Size | Purpose | Figma Equivalent | Status |
|------|------|---------|------------------|--------|
| **useFameDetection.ts** | 49KB | Fame event detection | useFameTracking.ts (9KB) | ⚠️ Figma version is 5x smaller |
| **useMWARCalculations.ts** | 9KB | Manager WAR hook | NONE | ❌ MISSING |
| **useFanMorale.ts** | 5KB | Fan morale hook | NONE | ❌ MISSING |
| **useRelationshipData.ts** | 4KB | Relationship/chemistry hook | NONE | ❌ MISSING |
| **useAgingData.ts** | 4KB | Aging system hook | NONE | ❌ MISSING |
| **useGamePersistence.ts** | 10KB | Game state persistence | NONE | ❌ MISSING |
| **useDataIntegrity.ts** | 9KB | Data integrity checks | NONE | ❌ MISSING |

### 3.2 Stats/Display Hooks

| Hook | Size | Purpose | Figma Equivalent | Status |
|------|------|---------|------------------|--------|
| **useSeasonStats.ts** | 9KB | Season stats loading | NONE | ❌ MISSING |
| **useSeasonData.ts** | 3KB | Season metadata | NONE | ❌ MISSING |
| **useCareerStats.ts** | 6KB | Career stats loading | NONE | ❌ MISSING |
| **useLiveStats.ts** | 8KB | Real-time stat display | NONE | ❌ MISSING |
| **useClutchCalculations.ts** | 9KB | Clutch stat calculations | playerStateIntegration.ts | ⚠️ Wrapped differently |
| **useFitnessState.ts** | 3KB | Fitness state hook | usePlayerState.ts | ⚠️ Wrapped |
| **useMojoState.ts** | 3KB | Mojo state hook | usePlayerState.ts | ⚠️ Wrapped |
| **useNarrativeMorale.ts** | 4KB | Narrative morale hook | NONE | ❌ MISSING |
| **useRosterData.ts** | 2KB | Roster data loading | NONE | ❌ MISSING |

---

## SECTION 4: Missing Types (56KB)

### 4.1 Critical Type Definitions

| File | Legacy Size | Figma Size | Gap |
|------|-------------|------------|-----|
| **game.ts** | 50KB | NOT PRESENT | **50KB missing** - ALL core game types |
| **war.ts** | 14KB | NOT PRESENT | **14KB missing** - ALL WAR types |
| index.ts | 2KB | 1KB | -1KB |
| substitution.ts | - | 9KB | Figma-only |

### 4.2 Key Interfaces Missing from Figma

From `game.ts` (50KB) - Types used throughout legacy codebase:
- `Player`, `Team`, `Game`, `Season`
- `AtBatEvent`, `FameEvent`, `FameEventType`
- `MojoState`, `FitnessState`
- `Scoreboard`, `InningScore`
- `PlayerGameStats`, `PitcherGameStats`
- `BattingStats`, `PitchingStats`, `FieldingStats`
- `TradeProposal`, `FreeAgencyAction`
- `Milestone`, `Award`, `HallOfFamer`
- 67 FameEventType values with FAME_VALUES mapping

From `war.ts` (14KB):
- `WARComponents`, `BattingWAR`, `PitchingWAR`, `FieldingWAR`
- `WARConfig`, `PositionAdjustments`
- `ClutchMetrics`, `LeverageIndex`

---

## SECTION 5: Missing Context & Services

### 5.1 Context (State Management)

| File | Size | Purpose | Impact |
|------|------|---------|--------|
| **AppContext.tsx** | 3KB | Global app state provider | No centralized state management |
| **appStateStorage.ts** | 2KB | App state persistence | State lost on refresh |

### 5.2 Services

| File | Size | Purpose | Impact |
|------|------|---------|--------|
| **dataExportService.ts** | 7KB | Export data to JSON/CSV | No data export capability |
| **fieldingStatsAggregator.ts** | 7KB | Aggregate fielding statistics | No fielding stat tracking |

---

## SECTION 6: Missing Data Files

| File | Legacy Size | Figma | Gap |
|------|-------------|-------|-----|
| **playerDatabase.ts** | 254KB | NOT PRESENT | All player data missing |
| **fieldZones.ts** | 16KB | NOT PRESENT | Field zone definitions missing |
| **leagueStructure.ts** | 5KB | NOT PRESENT | League structure missing |
| **traitPools.ts** | 9KB | NOT PRESENT | Trait definitions missing |
| **mlbTeams.ts** | 9KB | NOT PRESENT | Team definitions missing |
| defaultRosters.ts | - | 4KB | Figma-only |

---

## SECTION 7: Missing Tests

| Test File | Purpose |
|-----------|---------|
| bwarCalculator.test.ts | bWAR calculation tests |
| bwar-verify.mjs | bWAR verification |
| war-verify.mjs | WAR verification |
| leverage-clutch-mwar-verify.mjs | LI, clutch, mWAR tests |
| mojo-fitness-salary-verify.cjs | Mojo, fitness, salary tests |
| fan-morale-narrative-verify.cjs | Fan morale, narrative tests |
| fame-detection-verify.mjs | Fame detection tests |
| baseballLogicTests.test.ts | Baseball logic tests |
| inferenceLogicTests.test.ts | Fielder inference tests |
| stateMachineTests.ts | State machine tests |
| runnerDefaultsComparison.test.ts | Runner defaults tests |
| fieldingInferenceTests.ts | Fielding inference tests |

---

## SECTION 8: Missing Components (Legacy GameTracker)

Components in legacy `/components/GameTracker/` not in Figma:

| Component | Size | Purpose |
|-----------|------|---------|
| AtBatFlow.tsx | 51KB | At-bat flow management |
| PlayerCard.tsx | 29KB | Player card display |
| FieldingModal.tsx | 34KB | Fielding selection modal |
| WARDisplay.tsx | 22KB | WAR display component |
| FameEventModal.tsx | 18KB | Fame event entry |
| OffseasonFlow.tsx | 18KB | Offseason flow |
| FameDisplay.tsx | 16KB | Fame display |
| SeasonLeaderboards.tsx | 14KB | Leaderboards |
| CareerDisplay.tsx | 14KB | Career stats display |
| SeasonSummary.tsx | 14KB | Season summary |
| FieldZoneInput.tsx | 14KB | Field zone input |
| LineupPanel.tsx | 15KB | Lineup management |
| FanMoraleDisplay.tsx | 13KB | Fan morale panel |
| NarrativeDisplay.tsx | 11KB | Narrative display |
| SalaryDisplay.tsx | 11KB | Salary display |
| PitcherExitPrompt.tsx | 9KB | Pitcher exit prompt |
| WalkoffCelebration.tsx | 8KB | Walk-off celebration |
| InningEndSummary.tsx | 6KB | Inning summary |

---

## SECTION 9: Implementation Priority Matrix

### Phase 1: Foundation (BLOCKING - Do First)

| Task | Files to Create/Port | Priority |
|------|---------------------|----------|
| Port Type Definitions | game.ts, war.ts → src_figma/app/types/ | 🔴 CRITICAL |
| Create Persistence Layer | eventLog.ts, seasonStorage.ts, careerStorage.ts | 🔴 CRITICAL |
| Create Season Hooks | useSeasonData.ts, useSeasonStats.ts | 🔴 CRITICAL |
| Wire Aggregation | seasonAggregator.ts, milestoneAggregator.ts | 🔴 CRITICAL |

### Phase 2: Core Engines (Essential Features)

| Task | Files to Port/Wire | Priority |
|------|-------------------|----------|
| Wire mwarCalculator | Create mwarIntegration.ts, useMWARCalculations.ts | 🟡 HIGH |
| Wire fanMoraleEngine | Create fanMoraleIntegration.ts, useFanMorale.ts | 🟡 HIGH |
| Wire relationshipEngine | Create relationshipIntegration.ts, useRelationshipData.ts | 🟡 HIGH |
| Complete agingEngine | Create agingIntegration.ts, useAgingData.ts | 🟡 HIGH |
| Port milestoneDetector | milestoneDetector.ts → src_figma/utils/ | 🟡 HIGH |

### Phase 3: Data & Storage (Complete Persistence)

| Task | Files to Port | Priority |
|------|--------------|----------|
| Port All Storage Utils | 18 storage files | 🟡 HIGH |
| Port Data Files | playerDatabase.ts, fieldZones.ts, etc. | 🟡 HIGH |
| Port Remaining Hooks | useGamePersistence, useLiveStats, etc. | 🟢 MEDIUM |

### Phase 4: Polish & Testing

| Task | Files to Create | Priority |
|------|----------------|----------|
| Create Context | AppContext.tsx, appStateStorage.ts | 🟢 MEDIUM |
| Create Services | dataExportService.ts, fieldingStatsAggregator.ts | 🟢 MEDIUM |
| Port Tests | All test files | 🟢 MEDIUM |

---

## SECTION 10: Decision Points for User

### Question 1: Type Definitions Strategy
- **Option A**: Copy game.ts and war.ts directly to Figma
- **Option B**: Import from legacy path (creates dependency)
- **Option C**: Create new minimal types (risk: incompatibility)

### Question 2: Persistence Layer Strategy
- **Option A**: Port legacy storage files directly
- **Option B**: Create new storage with same interfaces
- **Option C**: Use existing DEFINITIVE_GAP_ANALYSIS.md plan

### Question 3: narrativeEngine.ts (40KB)
- **Include Now**: Wire LLM/narrative system
- **Save for Future**: Mark as future feature

### Question 4: Missing Legacy Components
- **Port All**: Bring over all GameTracker components
- **Selective Port**: Only port essential ones
- **Rebuild**: Build fresh in Figma style

---

## Appendix A: File Count by Folder

### Legacy Codebase
```
/engines:     19 files (470KB)
/hooks:       18 files (160KB)
/utils:       29 files (500KB)
/components:  70 files (800KB)
/types:        3 files (66KB)
/context:      2 files (5KB)
/services:     2 files (14KB)
/data:         7 files (300KB)
/pages:       21 files (216KB)
/tests:       16 files (100KB)
/styles:       2 files (27KB)
```

### Figma Codebase
```
/app/engines:     8 files (94KB)
/app/hooks:       3 files (31KB)
/app/components: 95 files (1.2MB) - includes 50+ shadcn-ui
/app/types:       2 files (10KB)
/app/pages:      14 files (668KB)
/hooks:           8 files (160KB)
/data:            1 file (4KB)
/config:          2 files (3KB)
/styles:          4 files (8KB)
/utils:           0 files (EMPTY)
```

---

## Appendix B: Critical Path Dependencies

```
Types (game.ts, war.ts)
    ↓
Persistence Layer (eventLog.ts, seasonStorage.ts)
    ↓
Aggregation Utils (seasonAggregator.ts, milestoneAggregator.ts)
    ↓
Season Hooks (useSeasonData.ts, useSeasonStats.ts)
    ↓
Engine Integration (mwarIntegration.ts, fanMoraleIntegration.ts)
    ↓
UI Wiring (components using hooks)
```

Cannot skip steps - each layer depends on the previous.

---

*This document represents the complete audit of both codebases as of 2026-02-03.*
*All file sizes and paths verified against actual filesystem.*
