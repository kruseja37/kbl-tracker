# KBL Tracker — Spec to Code Traceability Map

> **Purpose**: Explicitly maps each spec document to the files that implement it.
> Eliminates guessing about where code lives.

## Architecture: Shared-Source (Read This First)

The app uses TWO active source trees that work together:
- **`src/engines/`, `src/utils/`, `src/types/`** = Core logic layer (calculations, storage, types). These are SHARED — imported directly by src_figma.
- **`src/src_figma/`** = UI layer (pages, components, hooks). The `@/` alias resolves here.
- **`src/src_figma/app/engines/`** = Integration wrappers that adapt base engines for UI consumption.
- **Import pattern**: `src/src_figma/app/hooks/useWARCalculations.ts` imports from `../../../engines/bwarCalculator.ts` (base src)
- When a spec maps to `src/engines/bwarCalculator.ts`, that file is ACTIVELY USED by the UI — not a dead copy.

## WAR Calculation Specs

| Spec Doc | Implementing Files | Test Files |
|----------|--------------------|------------|
| `BWAR_CALCULATION_SPEC.md` | `src/engines/bwarCalculator.ts` | `src/src_figma/__tests__/statCalculations/bwarCalculator.test.ts` (54 tests) |
| `PWAR_CALCULATION_SPEC.md` | `src/engines/pwarCalculator.ts` | `src/src_figma/__tests__/statCalculations/pwarCalculator.test.ts` (67 tests) |
| `FWAR_CALCULATION_SPEC.md` | `src/engines/fwarCalculator.ts` | `src/src_figma/__tests__/statCalculations/fwarCalculator.test.ts` (131 tests) |
| `RWAR_CALCULATION_SPEC.md` | `src/engines/rwarCalculator.ts` | `src/src_figma/__tests__/statCalculations/rwarCalculator.test.ts` (61 tests) |
| `MWAR_CALCULATION_SPEC.md` | `src/engines/mwarCalculator.ts`, `src/src_figma/app/engines/mwarIntegration.ts` | — |
| `LEVERAGE_INDEX_SPEC.md` | `src/engines/leverageCalculator.ts` | `src/src_figma/__tests__/statCalculations/leverageCalculator.test.ts` (113 tests) |
| `CLUTCH_ATTRIBUTION_SPEC.md` | `src/engines/clutchCalculator.ts` | — |

**UI consumers of WAR:**
- `src/src_figma/app/hooks/useWARCalculations.ts`
- `src/hooks/useWARCalculations.ts`
- `src/src_figma/app/hooks/useMWARCalculations.ts`
- Displayed in: `FranchiseHome.tsx` (player cards, stats views)

## Player Systems Specs

| Spec Doc | Implementing Files |
|----------|--------------------|
| `MOJO_FITNESS_SYSTEM_SPEC.md` | `src/engines/mojoEngine.ts`, `src/engines/fitnessEngine.ts`, `src/src_figma/app/engines/playerStateIntegration.ts` |
| `SALARY_SYSTEM_SPEC.md` | `src/engines/salaryCalculator.ts` |
| `FAME_SYSTEM_TRACKING.md` | `src/engines/fameEngine.ts`, `src/src_figma/app/engines/fameIntegration.ts` |
| `FAN_MORALE_SYSTEM_SPEC.md` | `src/engines/fanMoraleEngine.ts`, `src/src_figma/app/engines/fanMoraleIntegration.ts` |
| `FAN_FAVORITE_SYSTEM_SPEC.md` | Status unclear — verify if implemented separately or merged into fanMoraleIntegration.ts |
| `GRADE_ALGORITHM_SPEC.md` | No dedicated implementation file found — may be embedded in usePlayerState.ts or not yet built |
| `EOS_RATINGS_ADJUSTMENT_SPEC.md` | `src/src_figma/app/components/RatingsAdjustmentFlow.tsx` |
| `MILESTONE_SYSTEM_SPEC.md` | `src/engines/fameEngine.ts` (milestone detection) |
| `NARRATIVE_SYSTEM_SPEC.md` | `src/engines/narrativeEngine.ts` |
| `FARM_SYSTEM_SPEC.md` | `src/utils/farmStorage.ts` |

**UI consumers:**
- Mojo: `src/src_figma/app/hooks/usePlayerState.ts` → `FranchiseHome.tsx`
- Fitness: `src/hooks/useFitnessState.ts` → `FranchiseHome.tsx`
- Fame: `src/src_figma/app/hooks/useFameTracking.ts` → `FranchiseHome.tsx`, `MuseumContent.tsx`
- Fan morale: `src/src_figma/app/hooks/useFanMorale.ts` → `FranchiseHome.tsx`
- Salary: `FranchiseHome.tsx`, `TradeFlow.tsx`, `FreeAgencyFlow.tsx`

## GameTracker Specs

| Spec Doc | Implementing Files |
|----------|--------------------|
| `MASTER_BASEBALL_RULES_AND_LOGIC.md` | `src/src_figma/hooks/useGameState.ts` (2,968 lines — core), `src/src_figma/app/components/runnerDefaults.ts`, `src/src_figma/app/components/playClassifier.ts`, `src/src_figma/app/components/fielderInference.ts` |
| `RUNNER_ADVANCEMENT_RULES.md` | `src/src_figma/app/components/runnerDefaults.ts` |
| `INHERITED_RUNNERS_SPEC.md` | `src/src_figma/app/engines/inheritedRunnerTracker.ts` |
| `PITCH_COUNT_TRACKING_SPEC.md` | `src/src_figma/hooks/useGameState.ts` (pitch count tracking within game state) |
| `PITCHER_STATS_TRACKING_SPEC.md` | `src/src_figma/hooks/useGameState.ts` (PitcherGameStats) |
| `SUBSTITUTION_FLOW_SPEC.md` | `src/src_figma/app/components/modals/` (all modal files), `src/src_figma/app/types/substitution.ts` |
| `GAMETRACKER_DRAGDROP_SPEC.md` | `src/src_figma/app/components/DragDropGameTracker.tsx`, `src/src_figma/app/components/EnhancedInteractiveField.tsx`, `src/src_figma/app/components/BaserunnerDragDrop.tsx`, `src/src_figma/app/components/RunnerDragDrop.tsx` |
| `FIELD_ZONE_INPUT_SPEC.md` | `src/src_figma/app/components/FieldCanvas.tsx`, `src/src_figma/app/components/PlayLocationOverlay.tsx` |
| `SMB4_GAME_REFERENCE.md` | Reference doc — check all GameTracker code against this |
| `STAT_TRACKING_ARCHITECTURE_SPEC.md` | `src/utils/gameStorage.ts`, `src/utils/seasonStorage.ts`, `src/utils/careerStorage.ts` |
| `SPECIAL_EVENTS_SPEC.md` | `src/engines/detectionFunctions.ts`, `src/src_figma/app/engines/detectionIntegration.ts` |

**UI:**
- `src/src_figma/app/pages/GameTracker.tsx` (3,842 lines)
- `src/src_figma/app/pages/PostGameSummary.tsx`
- `src/src_figma/app/pages/ExhibitionGame.tsx`
- All components in `src/src_figma/app/components/` that are GameTracker subcomponents

**Test files:**
- `src/src_figma/__tests__/regressionTests/` (107 tests)
- `src/src_figma/__tests__/baseballLogic/` (264 tests)
- `src/src_figma/__tests__/statCalculations/` (610 tests)

## Franchise Mode Specs

| Spec Doc | Implementing Files |
|----------|--------------------|
| `FRANCHISE_MODE_SPEC.md` | `src/src_figma/app/pages/FranchiseHome.tsx` (228K), `src/src_figma/hooks/useFranchiseData.ts`, `src/utils/franchiseStorage.ts` |
| `TRADE_SYSTEM_SPEC.md` / `TRADE_FIGMA_SPEC.md` | `src/src_figma/app/components/TradeFlow.tsx`, `src/utils/transactionStorage.ts` |
| `FREE_AGENCY_FIGMA_SPEC.md` | `src/src_figma/app/components/FreeAgencyFlow.tsx` |
| `DRAFT_FIGMA_SPEC.md` | `src/src_figma/app/components/DraftFlow.tsx` |
| `OFFSEASON_SYSTEM_SPEC.md` | `src/src_figma/hooks/useOffseasonData.ts`, `src/src_figma/hooks/useOffseasonState.ts`, `src/utils/offseasonStorage.ts` |
| `SEASON_SETUP_SPEC.md` / `SEASON_SETUP_FIGMA_SPEC.md` | `src/src_figma/app/pages/FranchiseSetup.tsx` |
| `SCHEDULE_SYSTEM_FIGMA_SPEC.md` | `src/src_figma/app/components/ScheduleContent.tsx`, `src/src_figma/hooks/useScheduleData.ts`, `src/utils/scheduleStorage.ts` |
| `PLAYOFF_SYSTEM_SPEC.md` / `PLAYOFFS_FIGMA_SPEC.md` | `src/src_figma/app/pages/WorldSeries.tsx`, `src/src_figma/hooks/usePlayoffData.ts`, `src/utils/playoffStorage.ts` |
| `CONTRACTION_EXPANSION_FIGMA_SPEC.md` | `src/src_figma/app/components/ContractionExpansionFlow.tsx` |
| `AWARDS_CEREMONY_FIGMA_SPEC.md` | `src/src_figma/app/components/AwardsCeremonyFlow.tsx` |
| `RETIREMENT_FIGMA_SPEC.md` | `src/src_figma/app/components/RetirementFlow.tsx` |
| `EOS_RATINGS_FIGMA_SPEC.md` | `src/src_figma/app/components/RatingsAdjustmentFlow.tsx` |
| `SEASON_END_FIGMA_SPEC.md` | `src/src_figma/app/pages/FranchiseHome.tsx` (offseason tab flow trigger logic) |
| `FINALIZE_ADVANCE_FIGMA_SPEC.md` | `src/src_figma/app/components/FinalizeAdvanceFlow.tsx` |
| `GAME_SIMULATION_SPEC.md` | Not implemented — no simulation engine exists in codebase |

## League Builder Specs

| Spec Doc | Implementing Files |
|----------|--------------------|
| `LEAGUE_BUILDER_SPEC.md` / `LEAGUE_BUILDER_FIGMA_SPEC.md` | `src/src_figma/app/pages/LeagueBuilder.tsx`, `src/src_figma/app/pages/LeagueBuilderTeams.tsx`, `src/src_figma/app/pages/LeagueBuilderPlayers.tsx`, `src/src_figma/app/pages/LeagueBuilderRosters.tsx`, `src/src_figma/app/pages/LeagueBuilderRules.tsx`, `src/src_figma/app/pages/LeagueBuilderLeagues.tsx`, `src/src_figma/app/pages/LeagueBuilderDraft.tsx` |
| (League Builder storage) | `src/utils/leagueBuilderStorage.ts`, `src/src_figma/hooks/useLeagueBuilderData.ts` |

## Adaptive & Learning Specs

| Spec Doc | Implementing Files |
|----------|--------------------|
| `ADAPTIVE_STANDARDS_ENGINE_SPEC.md` | `src/engines/adaptiveLearningEngine.ts`, `src/src_figma/app/engines/adaptiveLearningEngine.ts` |
| `AUTO_CORRECTION_SYSTEM_SPEC.md` | `src/src_figma/hooks/useGameState.ts` — `autoCorrectResult()` function at line ~473 |
| `DYNAMIC_DESIGNATIONS_SPEC.md` | `src/src_figma/app/components/FinalizeAdvanceFlow.tsx` (rookie designations at line ~994), `src/src_figma/app/components/ContractionExpansionFlow.tsx` (legacy cornerstone designation at line ~943) |

## Meta Specs (Process, Not Code)

| Spec Doc | What It Covers |
|----------|---------------|
| `REQUIREMENTS.md` | User requirements and constraints |
| `FEATURE_WISHLIST.md` | 124+ known feature gaps |
| `IMPLEMENTATION_PLAN.md` / `IMPLEMENTATION_PLAN_FULL.md` | Build order |
| `FIGMA_IMPLEMENTATION_PLAN.md` | Figma-based UI build plan |
| `TESTING_IMPLEMENTATION_PLAN.md` | Test coverage plan |
| `SPEC_INDEX.md` | Master index of all specs |
| `DECISIONS_LOG.md` | Key decisions with rationale |
| `RALPH_FRAMEWORK.md` | AI collaboration framework |

## Known Gotchas

1. **Two source trees**: `src/` has base implementations, `src/src_figma/` has Figma-integrated versions. The Figma versions are the ACTIVE ones used by the app.
2. **Large files**: `FranchiseHome.tsx` (228K), `EnhancedInteractiveField.tsx` (155K), `GameTracker.tsx` (3,842 lines), `useGameState.ts` (2,968 lines). Read these in chunks.
3. **runsPerWin formula**: Spec says `RPW = 10 × (seasonGames / 162) per FWAR_CALCULATION_SPEC.md Section 2`. Previous bugs had it using Pythagorean 17.87 constant instead. ALWAYS verify against spec.
4. **Player ID format**: `away-firstname-lastname` or `home-firstname-lastname` (dashes for spaces). Pitcher IDs follow same pattern.
5. **Infield fly rule**: EXISTS in SMB4 (confirmed by user). Don't mark as missing.
