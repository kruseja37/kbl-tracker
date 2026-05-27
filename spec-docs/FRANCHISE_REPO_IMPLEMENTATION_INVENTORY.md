# Franchise Repo Implementation Inventory

This inventory is based on repo evidence in and directly wired from the requested code areas. It does not compare current behavior against external specs, choose scope, or propose implementation work.

Status vocabulary used below:

- implemented and wired: behavior is present and reachable through current app flow or hook/storage wiring.
- implemented but not wired: behavior exists in code but no inspected current path clearly reaches it.
- preview/read-only: UI or adapter calculates/displays information without committing the domain change.
- guarded/blocked: code exists but a guard, validation, constant, or launch condition prevents normal use.
- placeholder/copy only: visible copy or panels exist without behavior beyond navigation/display.
- prototype/non-franchise: behavior exists for non-franchise/global/prototype paths, not as a franchise-scoped implementation.
- dormant/reference code: code appears unused, alternate, stubbed, or retained as reference.
- test-only helper: behavior appears only in tests or fixtures.
- unknown / needs follow-up: repo evidence is insufficient or ambiguous.

## 1. Executive summary of what clearly exists

| Area | Current repo status | Evidence | Test evidence |
| --- | --- | --- | --- |
| Franchise creation and Mode 1 handoff | implemented and wired | `src/src_figma/app/pages/FranchiseSetup.tsx`, `src/utils/franchiseInitializer.ts`, `src/types/franchise.ts`, `src/App.tsx` | `src/src_figma/__tests__/franchiseMode/FranchiseSetup.test.tsx`, `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts`, `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts` |
| Franchise-scoped copied league/team/player storage | implemented and wired | `src/utils/franchisePlayerStorage.ts`, `src/utils/franchiseInitializer.ts`, `src/src_figma/hooks/useFranchiseData.ts` | `src/src_figma/__tests__/franchiseMode/useFranchiseData.scope.test.tsx`, `src/utils/tests/franchiseSaveSlotManifest.test.ts` |
| Regular-season schedule and GameTracker launch | implemented and wired | `src/src_figma/app/pages/FranchiseHome.tsx`, `src/src_figma/hooks/useScheduleData.ts`, `src/utils/scheduleStorage.ts`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts` | `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx`, `src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts`, `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts` |
| Event log, stat aggregation, completed-game archive | implemented and wired | `src/src_figma/hooks/useGameState.ts`, `src/src_figma/app/pages/GameTracker.tsx`, `src/utils/eventLog.ts`, `src/utils/processCompletedGame.ts`, `src/utils/seasonAggregator.ts`, `src/utils/gameStorage.ts` | `src/src_figma/__tests__/persistence/eventLog.test.ts`, `src/src_figma/__tests__/persistence/gameStorage.test.ts`, `src/src_figma/__tests__/aggregation/processCompletedGame.almanac.test.ts`, `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx` |
| Active-game save/load/resume | implemented and wired | `src/utils/gameStorage.ts`, `src/src_figma/hooks/useGameState.ts`, `src/src_figma/app/utils/gameTrackerIdentity.ts` | `src/src_figma/__tests__/gameTracker/bugfix-r4-03-refresh-persistence.test.ts`, `src/src_figma/__tests__/gameTracker/GameTrackerLaunchState.test.tsx` |
| Playoff bracket, playoff GameTracker launch, series advancement, playoff stats | implemented and wired | `src/src_figma/hooks/usePlayoffData.ts`, `src/utils/playoffStorage.ts`, `src/engines/playoffEngine.ts`, `src/src_figma/app/pages/FranchiseHome.tsx` | `src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx`, `src/src_figma/__tests__/playoffMode/playoffLogic.test.ts`, `src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts`, `src/utils/tests/playoffStorage.elimination.test.ts` |
| Offseason phase state | implemented and wired | `src/utils/offseasonStorage.ts`, `src/src_figma/hooks/useOffseasonState.ts`, `src/src_figma/app/pages/FranchiseHome.tsx` | `src/src_figma/__tests__/apiContracts/offseasonPhases.contract.test.ts`, `src/utils/tests/franchiseOffseasonAdapters.test.ts` |
| Ratings/salary offseason adapter | implemented and wired | `src/src_figma/app/components/RatingsAdjustmentFlow.tsx`, `src/utils/franchiseRatingsSalaryAdapter.ts` | `src/utils/tests/franchiseRatingsSalaryAdapter.test.ts` |
| Retirement dry-run, selected-player retirement apply, retirement ceremony preview | implemented and wired, with ceremony preview read-only until selection is applied through explicit confirmation | `src/src_figma/app/components/RetirementFlow.tsx`, `src/utils/franchiseRetirementAdapter.ts`, `src/utils/franchiseRetirementCeremony.ts` | `src/utils/tests/franchiseRetirementAdapter.test.ts`, `src/utils/tests/franchiseRetirementCeremony.test.ts` |
| Free agency, draft, trade franchise adapters | preview/read-only | `src/src_figma/app/components/FreeAgencyFlow.tsx`, `src/utils/franchiseFreeAgencyAdapter.ts`, `src/src_figma/app/components/DraftFlow.tsx`, `src/utils/franchiseDraftAdapter.ts`, `src/src_figma/app/components/TradeFlow.tsx`, `src/utils/franchiseTradeAdapter.ts` | `src/utils/tests/franchiseFreeAgencyAdapter.test.ts`, `src/utils/tests/franchiseDraftAdapter.test.ts`, `src/utils/tests/franchiseTradeAdapter.test.ts` |
| Farm/Phase 11 roster storage and mutations | implemented and wired in finalize/correction surfaces and utility actions; Team Hub analyzer is read-only | `src/utils/franchiseFarmStorage.ts`, `src/utils/franchiseRosterMovement.ts`, `src/utils/franchiseRosterLockValidator.ts`, `src/utils/franchisePhase11RosterPlanner.ts`, `src/utils/franchisePhase11RosterActions.ts`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`, `src/src_figma/app/components/TeamHubContent.tsx` | `src/utils/tests/franchiseRosterMovement.test.ts`, `src/utils/tests/franchisePhase11RosterPlanner.test.ts`, `src/utils/tests/franchisePhase11RosterActions.test.ts`, `src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx` |
| Almanac/completed-game archive | implemented and wired | `src/utils/gameStorage.ts`, `src/utils/registerAlmanacPlayers.ts`, `src/utils/almanacQueries.ts`, `src/src_figma/app/pages/AlmanacHome.tsx`, `src/src_figma/app/pages/GameDetail.tsx`, `src/src_figma/app/pages/ManagerAlmanac.tsx`, `src/App.tsx` | `src/src_figma/__tests__/aggregation/almanacQueries.playerCard.test.ts`, `src/src_figma/__tests__/aggregation/almanacSearch.backfill.test.ts`, `src/src_figma/__tests__/aggregation/almanacManagerWpa.test.ts`, `src/src_figma/__tests__/gameDetail/GameDetail.test.tsx` |
| Synthetic simulation in franchise regular/playoff UI | guarded/blocked | `MODE_2_V1_SYNTHETIC_SIM_ENABLED = false` in `src/src_figma/app/pages/FranchiseHome.tsx`; `src/src_figma/app/components/SimulationOverlay.tsx`, `src/utils/syntheticGameFactory.ts` exist | No direct franchise enabled-flow test found; guarded paths appear in `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx`/related blockers |
| Farm reconciliation and chemistry offseason tabs | placeholder/copy only | `src/src_figma/app/pages/FranchiseHome.tsx` renders "Coming Soon" panels | No direct behavior test found |
| Franchise first/leader tracking storage | dormant/reference code | `src/utils/franchiseStorage.ts` returns null/no-op for firsts and leaders | `src/src_figma/__tests__/apiContracts/franchiseStorage.contract.test.ts`; milestone aggregator tests cover detection but storage is stubbed |

## 2. Mode 1 / setup inventory

| Feature | Status | Repo evidence | Test evidence |
| --- | --- | --- | --- |
| Franchise route entry | implemented and wired | `src/src_figma/app/pages/AppHome.tsx` links to `/franchise/select`; `src/App.tsx` routes `/franchise/select`, `/franchise/setup`, `/franchise/:franchiseId` | `src/src_figma/__tests__/franchiseMode/FranchiseSetup.test.tsx`, `src/src_figma/__tests__/franchiseMode/FranchiseHome.test.tsx` |
| Setup wizard | implemented and wired | `src/src_figma/app/pages/FranchiseSetup.tsx` collects league, season, playoffs, teams, roster mode, franchise name | `src/src_figma/__tests__/franchiseMode/FranchiseSetup.test.tsx` |
| Franchise config type | implemented and wired | `src/types/franchise.ts` defines `FranchiseConfig` and `StoredFranchiseConfig`; setup initializes from `INITIAL_CONFIG` | `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts` |
| League/team/player copy into franchise-owned stores | implemented and wired | `src/utils/franchiseInitializer.ts` calls `deepCopyLeagueToFranchise`; `src/utils/franchisePlayerStorage.ts` stores franchise players/teams | `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts`, `src/utils/tests/franchiseSaveSlotManifest.test.ts` |
| Initial schedule generation | implemented and wired | `src/utils/franchiseInitializer.ts` calls `generateSchedule`, then `addGame` with `franchiseId`, `seasonNumber`, game number and team ids | `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts`, `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts` |
| Initial season metadata | implemented and wired | `src/utils/franchiseInitializer.ts` creates franchise season metadata using `getFranchiseSeasonId(franchiseId, 1)` | `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts` |
| Active franchise selection | implemented and wired | `src/utils/franchiseInitializer.ts` calls `setActiveFranchise`; `src/src_figma/app/pages/FranchiseSetup.tsx` navigates to `/franchise/${franchiseId}` | `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts` |
| Persistence repair/backfill | implemented and wired | `src/src_figma/app/pages/FranchiseHome.tsx` calls `repairFranchisePersistence`; `src/utils/franchiseInitializer.ts` backfills missing copied players/teams and metadata | `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts`, `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx` |
| Alternate route module | dormant/reference code | `src/src_figma/app/routes.tsx` defines overlapping routes via `createBrowserRouter`; inspected app entry uses `src/App.tsx` | unknown / needs follow-up |

## 3. Mode 2 regular-season inventory

| Feature | Status | Repo evidence | Test evidence |
| --- | --- | --- | --- |
| Franchise home shell | implemented and wired | `src/src_figma/app/pages/FranchiseHome.tsx` loads franchise config, schedule, standings, playoff data, offseason state and tab content | `src/src_figma/__tests__/franchiseMode/FranchiseHome.test.tsx`, `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx` |
| Franchise-scoped schedule display | implemented and wired | `src/src_figma/hooks/useScheduleData.ts` calls `getAllGamesByFranchise` when `franchiseId` is present; `ScheduleContent` receives filtered games | `src/src_figma/__tests__/schedule/ScheduleContent.test.tsx`, `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts` |
| Next game and upcoming games | implemented and wired | `src/src_figma/app/pages/FranchiseHome.tsx` derives next/upcoming from `useScheduleData`; `src/src_figma/hooks/useFranchiseData.ts` loads `getNextFranchiseGame` | `src/src_figma/__tests__/franchiseMode/useFranchiseData.scope.test.tsx` |
| Score game launch | implemented and wired | `GameDayContent` in `src/src_figma/app/pages/FranchiseHome.tsx` builds franchise rosters and navigates to `/game-tracker/franchise-g${gameNumber}` with `gameMode`, `competitionType`, `franchiseId`, `scheduleGameId`, `seasonId`, `statsScopeId`, lineups, managers, useDH and innings | `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx`, `src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts` |
| Launch blocking for missing roster data | guarded/blocked | `src/src_figma/app/pages/FranchiseHome.tsx` sets launch error when `buildFranchiseGameTrackerRoster` returns missing players/pitchers | `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx` |
| Lineup Delta benchmark readiness | guarded/blocked | `src/src_figma/app/pages/FranchiseHome.tsx` checks `evaluateLaunchLineupBenchmarks`; can register current lineups by saving franchise team optimal snapshots | `src/src_figma/__tests__/app/pregameLineupBenchmarks.test.ts`, `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx` |
| GameTracker identity resolution | implemented and wired | `src/src_figma/app/utils/gameTrackerIdentity.ts` resolves franchise/season/schedule/playoff identity and validates mode/scope | `src/src_figma/__tests__/gameTracker/GameTrackerLaunchState.test.tsx`, `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx` |
| Event log writes | implemented and wired | `src/src_figma/hooks/useGameState.ts` logs at-bat, pitching, fielding and between-play events through `src/utils/eventLog.ts` | `src/src_figma/__tests__/persistence/eventLog.test.ts`, `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx` |
| WPA/LI/clutch fields on at-bat events | implemented and wired | `src/utils/eventLog.ts` event type includes WPA/LI fields; `src/src_figma/hooks/useGameState.ts` calculates LI/WPA during plate appearances; `src/src_figma/app/pages/GameDetail.tsx` displays WPA audit, clutch moments and win probability chart | `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx`, `src/engines/__tests__/wpaV2.test.ts`, `src/engines/__tests__/wpaRuntimeBoundary.test.ts`, `src/src_figma/__tests__/engines/leverageCalculator.relationships.test.ts` |
| Manager WPA | implemented and wired | `src/src_figma/hooks/useGameState.ts` derives manager decisions and committed manager state; `src/src_figma/app/components/ManagerWpaOverlay.tsx`, `src/src_figma/app/pages/GameDetail.tsx`, `src/src_figma/app/pages/ManagerAlmanac.tsx` display/aggregate it | `src/utils/tests/managerWpaGameState.test.ts`, `src/utils/tests/managerWpaDerivation.test.ts`, `src/utils/tests/managerWpaRecommendations.test.ts`, `src/src_figma/__tests__/aggregation/almanacManagerWpa.test.ts`, `src/src_figma/__tests__/gameDetail/GameDetail.test.tsx` |
| End-game stat pipeline | implemented and wired | `src/src_figma/hooks/useGameState.ts` calls `processCompletedGame`; `src/utils/processCompletedGame.ts` runs `aggregateGameToSeason`, `archiveCompletedGame`, and almanac registration | `src/src_figma/__tests__/aggregation/processCompletedGame.almanac.test.ts`, `src/src_figma/__tests__/gameTracker/bugfix-r4-02-endgame.test.ts`, `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx` |
| Schedule completion after GameTracker finish | implemented and wired | `src/src_figma/app/pages/GameTracker.tsx` calls `completeScheduleGame(effectiveScheduleGameId, result)` after hook `endGame` succeeds | `src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts`, `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx` |
| Skip game | implemented and wired | `src/src_figma/app/pages/FranchiseHome.tsx` updates schedule status to `SKIPPED`; `src/utils/scheduleStorage.ts` supports statuses | `src/src_figma/__tests__/scheduleData/scheduleLogic.test.ts`, `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts` |
| Batch skip | implemented in code; visibility ambiguous | `src/src_figma/app/pages/FranchiseHome.tsx` has batch-skip handlers and `BatchOperationOverlay`; inspected buttons appear conditional around confirmation state | unknown / needs follow-up |
| Synthetic game simulation | guarded/blocked | `src/src_figma/app/pages/FranchiseHome.tsx` has handlers, but `MODE_2_V1_SYNTHETIC_SIM_ENABLED = false`; `src/src_figma/app/components/SimulationOverlay.tsx`, `src/utils/syntheticGameFactory.ts` exist | No direct enabled-flow franchise test found |
| Standings | implemented and wired | `src/src_figma/hooks/useFranchiseData.ts` calls `calculateStandings(seasonId)`; `StandingsContent` in `src/src_figma/app/pages/FranchiseHome.tsx` displays by league | `src/src_figma/__tests__/franchiseMode/franchiseDataLogic.test.ts`, `src/src_figma/__tests__/franchiseMode/useFranchiseData.scope.test.tsx` |
| Regular-season leaders | implemented and wired | `src/src_figma/hooks/useFranchiseData.ts` returns batting/pitching leaders from season stats; `LeadersContent` displays them | `src/src_figma/__tests__/gameTracker/SeasonLeaderboards.test.tsx`, `src/src_figma/__tests__/franchiseMode/franchiseDataLogic.test.ts` |
| Award race panels in regular season | placeholder/copy only | `src/src_figma/app/pages/FranchiseHome.tsx` passes empty arrays for some award race/defensive race sections | No direct behavior test found |
| Team Hub roster/stats | implemented and wired | `src/src_figma/app/components/TeamHubContent.tsx` reads franchise players, season stats, franchise teams, farm records and renders roster/stats | `src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx` |
| Team Hub fan morale, stadium analytics, manager tracking tabs | placeholder/copy only | `TeamHubContent.tsx` code note says fan morale, stadium park factors and manager tracking are not yet implemented; tabs show empty states | `src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx` covers reads, not these empty states |
| Roster/transaction tab | guarded/blocked | `MODE_2_V1_TRANSACTION_UI_ENABLED = false` in `src/src_figma/app/pages/FranchiseHome.tsx`; `TradeFlow` content exists behind activeTab `"rosters"` | `src/utils/tests/franchiseTradeAdapter.test.ts` covers adapter preview |
| All-Star UI | guarded/blocked | `MODE_2_V1_ALL_STAR_UI_ENABLED = false` in `src/src_figma/app/pages/FranchiseHome.tsx`; setup config includes all-star option | No direct enabled-flow test found |
| Season completion detection | implemented and wired | `GameDayContent` in `FranchiseHome.tsx` marks season complete when all games are resolved, calls `markSeasonComplete`, and shows season summary link | `src/src_figma/__tests__/franchiseMode/SeasonSummary.pass5.test.tsx`, `src/src_figma/__tests__/gameTracker/SeasonSummary.test.tsx` |

## 4. Mode 2 playoff inventory

| Feature | Status | Repo evidence | Test evidence |
| --- | --- | --- | --- |
| Playoff data hook | implemented and wired | `src/src_figma/hooks/usePlayoffData.ts` loads franchise playoff by season, exposes create/record/get leaders | `src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx` |
| Bracket storage | implemented and wired | `src/utils/playoffStorage.ts` stores playoffs, series, games and playoff stats with `franchiseId`, `seasonId`, `sourceType` | `src/src_figma/__tests__/playoffMode/playoffLogic.test.ts`, `src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts`, `src/utils/tests/playoffStorage.elimination.test.ts` |
| Seeding flow | implemented and wired | `src/src_figma/app/pages/FranchiseHome.tsx` renders `PlayoffSeedingFlow` and calls `playoffData.createNewPlayoff` | `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx`, `src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx` |
| Playoff GameTracker launch | implemented and wired | `handlePlayoffGame` in `FranchiseHome.tsx` builds franchise rosters/managers/lineups and navigates with `gameMode: "playoff"`, playoff ids, franchise ids, season ids, useDH and innings | `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx` |
| Series result and bracket advancement | implemented and wired | `src/src_figma/hooks/useGameState.ts` records playoff series game after completed GameTracker; `src/utils/playoffStorage.ts` updates wins/status and can create next round | `src/src_figma/__tests__/playoffMode/playoffLogic.test.ts`, `src/src_figma/__tests__/franchiseMode/franchiseWave3Blockers.test.ts` |
| Playoff stats and leaders | implemented and wired | `src/utils/playoffStorage.ts` aggregates playoff stats; `src/src_figma/hooks/usePlayoffData.ts` exposes `getBattingLeaders`/`getPitchingLeaders`; `FranchiseHome.tsx` renders stats/leaders | `src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts` |
| Champion/MVP display | preview/read-only for MVP | `FranchiseHome.tsx` displays champion and `playoff.mvp` if present; no inspected code proves MVP calculation/population | unknown / needs follow-up |
| Begin offseason after playoffs | implemented and wired | `FranchiseHome.tsx` calls `handleBeginOffseason`, which calls `startOffseason(activeSeasonId, currentSeason, { franchiseId })` | `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx` |
| Playoff synthetic simulation | guarded/blocked | `FranchiseHome.tsx` has playoff sim handler but same synthetic sim constant is false | No direct enabled-flow franchise test found |

## 5. Mode 2 narrative/flavor/derived-system inventory

| System | Status | Repo evidence | Test evidence |
| --- | --- | --- | --- |
| WPA/LI/clutch | implemented and wired | `src/engines/wpaV2.ts`, `src/engines/wpaCalculator.ts`, `src/engines/leverageCalculator.ts`, `src/engines/clutchCalculator.ts`, `src/utils/eventLog.ts`, `src/src_figma/hooks/useGameState.ts`, `src/src_figma/app/pages/GameDetail.tsx` | `src/engines/__tests__/wpaV2.test.ts`, `src/engines/__tests__/wpaCalculator.test.ts`, `src/engines/__tests__/wpaRuntimeBoundary.test.ts`, `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx`, `src/src_figma/__tests__/engines/leverageCalculator.relationships.test.ts` |
| Manager WPA / manager value | implemented and wired | `src/utils/managerWpaGameState.ts`, `src/utils/managerWpaDerivation.ts`, `src/utils/managerWpaRecommendations.ts`, `src/types/managerWpa.ts`, `src/src_figma/app/components/ManagerWpaOverlay.tsx`, `src/src_figma/app/pages/ManagerAlmanac.tsx` | `src/utils/tests/managerWpaGameState.test.ts`, `src/utils/tests/managerWpaDerivation.test.ts`, `src/utils/tests/managerWpaRecommendations.test.ts`, `src/utils/tests/managerValueTrace.test.ts`, `src/src_figma/__tests__/aggregation/almanacManagerWpa.test.ts` |
| Player-of-game and WPA awards | implemented and wired for game/postgame display | `src/utils/pogAwards.ts`, `src/utils/playersOfTheGame.ts`, `src/src_figma/hooks/useGameState.ts`, `src/src_figma/app/pages/GameDetail.tsx` | `src/utils/tests/pogAwards.test.ts`, `src/src_figma/__tests__/gameDetail/GameDetail.test.tsx` |
| Live commentary/reporter feed | implemented and wired in GameTracker surfaces | `src/src_figma/app/components/ScoreBug.tsx`, `src/src_figma/app/components/NewsBoard.tsx`, `src/src_figma/app/components/CommentaryFeed.tsx`, `src/src_figma/app/components/ReporterAssignmentPanel.tsx`, `src/src_figma/hooks/useGameState.ts`, `src/utils/commentaryFeedStorage.ts`, `src/types/reporter.ts` | `src/src_figma/__tests__/reporter/commentaryEngine.test.ts`, `src/src_figma/__tests__/reporter/useCommentaryFeed.test.tsx`, `src/utils/tests/commentaryFeedStorage.test.ts`, `src/src_figma/__tests__/hooks/useGameState.reporterFlags.test.tsx` |
| Postgame newspaper columns | implemented and wired | `src/src_figma/app/components/PostGameColumns.tsx`, `src/src_figma/app/pages/PostGameSummary.tsx`, `src/utils/reporterStorage.ts`, `src/types/reporter.ts` | `src/src_figma/__tests__/reporter/commentaryEngine.test.ts`, `src/src_figma/__tests__/postGameSummary/PostGameSummary.test.tsx` |
| Franchise home news | implemented and wired as display-time recaps from completed games | `BeatReporterNews` in `src/src_figma/app/pages/FranchiseHome.tsx` loads `getRecentGames(20, { franchiseId, seasonId })` and calls `generateGameRecap` | No direct `BeatReporterNews` test found |
| Narrative archive/almanac cache | implemented and wired to reporter/almanac systems | `src/utils/almanacNarrativeArchive.ts`, `src/utils/reporterAlmanacCacheStorage.ts`, `src/src_figma/app/pages/AlmanacHome.tsx` | `src/utils/tests/almanacNarrativeArchive.test.ts`, `src/src_figma/__tests__/reporter/reporterAlmanacCacheStorage.test.ts`, `src/src_figma/__tests__/reporter/grokSummarizer.test.ts` |
| Milestone detection and game/season aggregation | implemented and wired for season aggregation and pregame watch display | `src/types/game.ts`, `src/utils/milestoneAggregator.ts`, `src/utils/seasonAggregator.ts`, `src/src_figma/app/components/MilestoneWatchPanel.tsx`, `FranchiseHome.tsx` calls `getApproachingMilestones` | `src/src_figma/__tests__/detection/milestoneDetector.test.ts`, `src/src_figma/__tests__/detection/fameEvents.test.ts` |
| Franchise firsts/leaders | dormant/reference code | `src/utils/franchiseStorage.ts` returns null/no-op; `src/utils/milestoneAggregator.ts` calls leader APIs only if active, but storage implementation is stubbed | `src/src_figma/__tests__/apiContracts/franchiseStorage.contract.test.ts` |
| Fan morale | implemented engine/UI pieces; franchise Team Hub and season summary are placeholder/read-only | `src/engines/fanMoraleEngine.ts`, fan morale display tests, `TeamHubContent.tsx` empty-state tab, `franchiseSeasonSummaryStorage.ts` placeholder fan morale | `src/engines/__tests__/fan-morale-narrative-verify.cjs`, `src/src_figma/__tests__/apiContracts/fanMoraleEngine.contract.test.ts`, `src/src_figma/__tests__/gameTracker/FanMoraleDisplay.test.tsx` |
| Player morale | partially wired/displayed, with gaps | `TeamHubContent.tsx` displays `player.morale` if present; `PlayerNameWithMorale` displays morale/personality fallback; free-agency/trade adapters explicitly defer morale effects | `src/src_figma/__tests__/gameTracker/PlayerNameWithMorale.test.tsx`, `src/utils/tests/franchiseFreeAgencyAdapter.test.ts`, `src/utils/tests/franchiseTradeAdapter.test.ts` |
| Mojo/fitness | implemented and wired in GameTracker/current game; long-term franchise season summary not finalized | `src/engines/mojoEngine.ts`, `src/engines/fitnessEngine.ts`, `src/src_figma/hooks/useGameState.ts` persists/restores `playerMojoFitness`; `src/src_figma/app/components/MojoFitnessEditor.tsx`, `LineupPreview.tsx` | `src/src_figma/__tests__/mojoFitness/mojoFitnessIntegration.test.ts`, `src/src_figma/__tests__/mojoFitness/mojoEngine.test.ts`, `src/src_figma/__tests__/mojoFitness/fitnessEngine.test.ts`, `src/src_figma/__tests__/gameTracker/bugfix-r4-03-refresh-persistence.test.ts` |
| Injuries | implemented as GameTracker event/annotation/fitness-linked behavior; not proven as long-term franchise injury system | `src/src_figma/hooks/useGameState.ts` records injury between-play events; `src/src_figma/app/components/InjuryPrompt.tsx`, `HistoricalEventEditor` references injury rows; `franchiseTradeAdapter.ts` says injury logic is deferred for trades | `src/src_figma/__tests__/gameTracker/FieldingModal.test.tsx`, `src/src_figma/__tests__/gameTracker/HistoricalEventEditor.test.tsx` |
| Relationships | implemented engine/hook; franchise UI availability exists through `useFranchiseData`, but inspected visible franchise chemistry tab is placeholder | `src/engines/relationshipEngine.ts`, `src/src_figma/app/hooks/useRelationshipData.ts`, `src/src_figma/hooks/useFranchiseData.ts`; `src/src_figma/app/pages/MatchupDramaBarPreview.tsx` says relationship/rivalry data deferred | `src/src_figma/__tests__/hooks/useRelationshipData.test.ts`, `src/src_figma/__tests__/engines/relationshipIntegration.test.ts`, `src/src_figma/__tests__/engines/leverageCalculator.relationships.test.ts` |
| Chemistry | mostly stored/read and analyzed; visible offseason chemistry tab is placeholder | player types/storage include chemistry; `src/engines/rosterAnalyzerEngine.ts` evaluates chemistry balance; `FranchiseHome.tsx` chemistry tab is "Coming Soon" | `src/engines/__tests__/rosterAnalyzerEngine.test.ts`, `src/src_figma/__tests__/builder/Builder.test.tsx` |
| Personality | stored/displayed and used by salary/reporter/prototype flows; franchise free agency explicitly does not execute personality destination rules | `src/src_figma/hooks/useLeagueBuilderData.ts`, `src/engines/salaryCalculator.ts`, `src/engines/narrativeEngine.ts`, `src/utils/franchiseFreeAgencyAdapter.ts` | `src/src_figma/__tests__/engines/salaryCalculator.test.ts`, `src/engines/__tests__/mojo-fitness-salary-verify.cjs`, `src/utils/tests/franchiseFreeAgencyAdapter.test.ts` |
| Park/stadium name propagation | implemented and wired | `src/src_figma/hooks/useFranchiseData.ts` builds `stadiumMap`; `FranchiseHome.tsx` passes stadium name to GameTracker; `useGameState.ts` persists `stadiumName` and event `parkContext`; `ScoreBug.tsx` displays stadium | `src/src_figma/__tests__/gameTracker/stadiumContext.test.tsx`, `src/src_figma/__tests__/gameTracker/stadiumSelection.test.ts`, `src/src_figma/__tests__/data/parkLookup.test.ts` |
| Park factor analytics | implemented engine; franchise summary/UI persistence placeholder | `src/engines/parkFactorDeriver.ts`, `src/types/war.ts`; `franchiseSeasonSummaryStorage.ts` sets park factor/adaptive-standard placeholder; `TeamHubContent.tsx` says park factors not implemented in tab | `src/src_figma/__tests__/statCalculations/bwarCalculator.test.ts`, `src/engines/__tests__/bwarCalculator.test.ts`, `src/utils/tests/franchiseSaveSlotManifest.test.ts` |
| Salary | implemented and wired for player display and ratings/salary adapter | `src/engines/salaryCalculator.ts`, `src/components/GameTracker/SalaryDisplay.tsx`, `src/utils/franchiseRatingsSalaryAdapter.ts`, `TeamHubContent.tsx` roster true value/net diff columns | `src/src_figma/__tests__/engines/salaryCalculator.test.ts`, `src/src_figma/__tests__/engines/salaryCalculator.matrix.test.ts`, `src/src_figma/__tests__/gameTracker/SalaryDisplay.test.tsx`, `src/utils/tests/franchiseRatingsSalaryAdapter.test.ts` |
| True value | partially implemented/displayed; full model not proven | `TeamHubContent.tsx` has `trueValue`/`netDiff` roster columns; `RatingsAdjustmentFlow.tsx` text says grade/salary preview only and raw ratings are unchanged; `FreeAgencyFlow.tsx` prototype uses salary as true value | `src/src_figma/__tests__/gameTracker/SalaryDisplay.test.tsx`; no direct full franchise true-value model test found |
| Adaptive standards | implemented engine/reference; franchise summary persistence placeholder | `src/engines/adaptiveLearningEngine.ts`, `src/engines/calibrationService.ts`, `franchiseSeasonSummaryStorage.ts` placeholder mentions adaptive standards | no direct franchise wiring test found in inspected output |
| Awards/leaders/designations | mixed | Season/playoff leaders implemented; Awards Ceremony saves selected awards; some regular-season award-race arrays are empty; season transition skips legacy rookie/service markers in franchise finalize copy | `src/src_figma/app/components/AwardsCeremonyFlow.tsx`, `src/src_figma/hooks/useOffseasonState.ts`, `src/src_figma/app/pages/FranchiseHome.tsx`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx` | `src/src_figma/__tests__/gameTracker/OffseasonFlow.test.tsx`, `src/src_figma/__tests__/detection/fameEvents.test.ts`, `src/src_figma/__tests__/detection/milestoneDetector.test.ts` |

## 6. Mode 3 offseason inventory

| Feature | Status | Repo evidence | Test evidence |
| --- | --- | --- | --- |
| Offseason state machine | implemented and wired | `src/utils/offseasonStorage.ts` defines phases and phase data stores; `src/src_figma/hooks/useOffseasonState.ts` loads/starts/completes/advances phases | `src/src_figma/__tests__/apiContracts/offseasonPhases.contract.test.ts`, `src/utils/tests/franchiseOffseasonAdapters.test.ts` |
| Begin offseason | implemented and wired | `FranchiseHome.tsx` calls `startOffseason(activeSeasonId, currentSeason, { franchiseId })` from playoff completion/advance UI | `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx` |
| Awards ceremony | implemented and wired for local selection and offseason-state persistence; candidate source is ambiguous for franchise-owned data | `src/src_figma/app/components/AwardsCeremonyFlow.tsx` uses `useOffseasonData`, `getAllManagerSeasonStatsForSeason`, `useOffseasonState(..., { franchiseId })`, then `saveAwards` | `src/src_figma/__tests__/gameTracker/OffseasonFlow.test.tsx`; no direct franchise awards source test found |
| Ratings/salary recalculation | implemented and wired | `RatingsAdjustmentFlow.tsx` renders franchise panel and calls `runFranchiseRatingsSalaryAdapter`/`applyFranchiseRatingsSalaryAdapter`; `franchiseRatingsSalaryAdapter.ts` dry-runs or writes `overallGrade` and `salary` to franchise players | `src/utils/tests/franchiseRatingsSalaryAdapter.test.ts` |
| Raw rating changes in ratings phase | guarded/blocked for franchise | `franchiseRatingsSalaryAdapter.ts` method says raw ratings are unchanged; franchise UI text says grade/salary only | `src/utils/tests/franchiseRatingsSalaryAdapter.test.ts` |
| Contraction/expansion | guarded/blocked or placeholder skip in franchise flow | `FranchiseHome.tsx` contraction tab displays deferred boundary and advances phase; `ContractionExpansionFlow` exists but inspected visible tab uses skip-only text | unknown / needs follow-up for modal trigger |
| Retirement dry-run | implemented and wired | `RetirementFlow.tsx` runs franchise retirement preview; `franchiseRetirementAdapter.ts` computes candidates from scoped franchise players | `src/utils/tests/franchiseRetirementAdapter.test.ts` |
| Selected-player retirement apply | implemented and wired | `RetirementFlow.tsx` explicit "Apply selected retirements"; `franchiseRetirementAdapter.ts` updates franchise player retired state, deletes farm record when applicable, logs transaction, rolls back on failure | `src/utils/tests/franchiseRetirementAdapter.test.ts` |
| Retirement ceremony | preview/read-only plus staged selection bridge | `franchiseRetirementCeremony.ts` is pure/no-write planner; `RetirementFlow.tsx` shows ceremony reveal and can move suggestion into selected-player confirmation | `src/utils/tests/franchiseRetirementCeremony.test.ts`, `src/utils/tests/franchiseRetirementAdapter.test.ts` |
| Jersey retirement/narrative/milestone/replacement side effects | guarded/blocked | `RetirementFlow.tsx` copy states these are not active for selected-player apply; `franchiseRetirementAdapter.ts` limitations say those side effects are deferred | `src/utils/tests/franchiseRetirementAdapter.test.ts` |
| Free agency | preview/read-only | `FreeAgencyFlow.tsx` routes franchise props to dry-run preview; `franchiseFreeAgencyAdapter.ts` rejects apply/commit and says no writes/moves/destination/roll/exchange | `src/utils/tests/franchiseFreeAgencyAdapter.test.ts` |
| Draft | preview/read-only | `DraftFlow.tsx` routes franchise props to dry-run preview; `franchiseDraftAdapter.ts` rejects apply/commit and says no draft class/picks/generation/writes | `src/utils/tests/franchiseDraftAdapter.test.ts` |
| Trade | preview/read-only; visible franchise phase wiring ambiguous | `TradeFlow.tsx` franchise path runs `runFranchiseTradeDryRun`; `franchiseTradeAdapter.ts` rejects apply/commit; `FranchiseHome.tsx` maps `TRADES` phase to `"spring-training"` and regular `"rosters"` tab is guarded off | `src/utils/tests/franchiseTradeAdapter.test.ts` |
| Farm reconciliation tab | placeholder/copy only | `FranchiseHome.tsx` renders Coming Soon farm panel and phase-advance banner | No direct behavior test found |
| Chemistry rebalancing tab | placeholder/copy only | `FranchiseHome.tsx` renders Coming Soon chemistry panel and phase-advance banner | No direct behavior test found |
| Spring training | prototype/non-franchise or ambiguous in franchise | `SpringTrainingFlow.tsx` has no `franchiseId` prop, uses `useOffseasonData`, calculates projections with `agingEngine`, and only calls `onComplete`; `FranchiseHome.tsx` renders it in offseason | No direct franchise spring-training mutation test found |
| Finalize and advance | implemented and wired | `FinalizeAdvanceFlow.tsx` validates Phase 11 roster lock, calls `runJournaledFranchiseSeasonTransition`; `FranchiseHome.tsx` also has `handleStartNewSeason` using same orchestrator | `src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx`, `src/utils/tests/franchiseSeasonTransitionOrchestrator.test.ts` |
| Season summary handoff | implemented and wired with placeholders for some derived systems | `src/utils/franchiseSeasonSummaryStorage.ts` builds/saves summaries from schedule/completed games/playoffs; placeholders remain for awards, milestones, fan morale, narrative, park factors/adaptive standards | `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts`, `src/src_figma/__tests__/franchiseMode/SeasonSummary.pass5.test.tsx` |
| Transition journal | implemented and wired | `src/utils/franchiseSeasonTransitionOrchestrator.ts` creates/updates/commits/rolls back journal; `src/utils/franchiseTransitionJournal.ts` stores journal records | `src/utils/tests/franchiseSeasonTransitionOrchestrator.test.ts`, `src/utils/tests/franchiseSaveSlotManifest.test.ts` |

## 7. Storage/persistence inventory

| Store/system | Status | Repo evidence | Test evidence |
| --- | --- | --- | --- |
| App/franchise metadata | implemented and wired | `src/utils/franchiseManager.ts`, `src/utils/franchiseInitializer.ts`, `src/types/franchise.ts` | `src/src_figma/__tests__/apiContracts/franchiseManager.contract.test.ts`, `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts` |
| Franchise players/teams | implemented and wired | `src/utils/franchisePlayerStorage.ts`, `src/utils/franchiseInitializer.ts`, `src/src_figma/hooks/useFranchiseData.ts` | `src/utils/tests/franchiseSaveSlotManifest.test.ts`, `src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx` |
| Franchise farm records | implemented and wired to roster movement/offseason adapters | `src/utils/franchiseFarmStorage.ts`, `src/utils/franchiseRosterMovement.ts`, `src/utils/franchisePhase11RosterActions.ts`, `src/utils/franchiseRetirementAdapter.ts` | `src/utils/tests/franchiseRosterMovement.test.ts`, `src/utils/tests/franchisePhase11RosterActions.test.ts`, `src/utils/tests/franchiseRetirementAdapter.test.ts` |
| Schedule | implemented and wired | `src/utils/scheduleStorage.ts`, `src/src_figma/hooks/useScheduleData.ts` | `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts`, `src/src_figma/__tests__/scheduleData/scheduleLogic.test.ts` |
| Schedule metadata | implemented but franchise metadata is partly computed | `scheduleStorage.ts` has metadata store and `getScheduleMetadataByFranchise`; `updateMetadata` uses all games while franchise read computes by franchise/season | `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts` |
| Current active game snapshot | implemented and wired | `src/utils/gameStorage.ts` stores `currentGame`; `useGameState.ts` autosaves and restores | `src/src_figma/__tests__/persistence/gameStorage.test.ts`, `src/src_figma/__tests__/gameTracker/bugfix-r4-03-refresh-persistence.test.ts` |
| Completed games archive | implemented and wired | `src/utils/gameStorage.ts` `archiveCompletedGame`, `getRecentGames`, `getCompletedGameById`, `getAllCompletedGames` | `src/src_figma/__tests__/persistence/gameStorage.test.ts`, `src/src_figma/__tests__/gameDetail/GameDetail.test.tsx` |
| Event log | implemented and wired | `src/utils/eventLog.ts`, `src/src_figma/hooks/useGameState.ts` | `src/src_figma/__tests__/persistence/eventLog.test.ts`, `src/src_figma/__tests__/hooks/useGameState.betweenPlayLedger.test.tsx` |
| Season stats | implemented and wired | `src/utils/seasonStorage.ts`, `src/utils/seasonAggregator.ts`, `src/hooks/useSeasonStats.ts`, `src/src_figma/hooks/useFranchiseData.ts` | `src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts`, `src/src_figma/__tests__/gameTracker/SeasonLeaderboards.test.tsx` |
| Playoff stats/storage | implemented and wired | `src/utils/playoffStorage.ts`, `src/src_figma/hooks/usePlayoffData.ts` | `src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts`, `src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx` |
| Offseason state/data stores | implemented and wired | `src/utils/offseasonStorage.ts`, `src/src_figma/hooks/useOffseasonState.ts` | `src/src_figma/__tests__/apiContracts/offseasonPhases.contract.test.ts`, `src/src_figma/__tests__/gameTracker/OffseasonFlow.test.tsx` |
| Transaction log | implemented and wired to selected roster/retirement actions | `src/utils/transactionStorage.ts`, `src/utils/franchiseRosterMovement.ts`, `src/utils/franchisePhase11RosterActions.ts`, `src/utils/franchiseRetirementAdapter.ts` | `src/utils/tests/franchiseRosterMovement.test.ts`, `src/utils/tests/franchisePhase11RosterActions.test.ts`, `src/utils/tests/franchiseRetirementAdapter.test.ts` |
| Season summaries | implemented and wired | `src/utils/franchiseSeasonSummaryStorage.ts`, `src/src_figma/app/pages/SeasonSummary.tsx`, `src/src_figma/app/components/SeasonEndFlow.tsx` | `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts`, `src/src_figma/__tests__/gameTracker/SeasonSummary.test.tsx` |
| Transition journals | implemented and wired | `src/utils/franchiseTransitionJournal.ts`, `src/utils/franchiseSeasonTransitionOrchestrator.ts` | `src/utils/tests/franchiseSeasonTransitionOrchestrator.test.ts`, `src/utils/tests/franchiseSaveSlotManifest.test.ts` |
| Almanac player/team/game identity | implemented and wired | `src/utils/registerAlmanacPlayers.ts`, `src/utils/almanacQueries.ts`, `src/utils/almanacTeamIdentity.ts`, almanac pages under `src/src_figma/app/pages` | `src/src_figma/__tests__/aggregation/registerAlmanacPlayers.test.ts`, `src/src_figma/__tests__/aggregation/almanacQueries.playerCard.test.ts`, `src/src_figma/__tests__/aggregation/almanacSearch.backfill.test.ts`, `src/src_figma/__tests__/app/TeamPage.test.tsx` |
| Reporter/almanac cache | implemented and wired to reporter systems | `src/utils/reporterAlmanacCacheStorage.ts`, `src/utils/commentaryFeedStorage.ts`, `src/utils/gameStoriesStorage.ts`, `src/utils/reporterStorage.ts` | `src/src_figma/__tests__/reporter/reporterAlmanacCacheStorage.test.ts`, `src/utils/tests/commentaryFeedStorage.test.ts`, `src/utils/tests/gameStoriesStorage.test.ts`, `src/src_figma/__tests__/reporter/reporterStorage.test.ts` |
| Franchise first/leader store | dormant/reference code | `src/utils/franchiseStorage.ts` has no-op/null implementations | `src/src_figma/__tests__/apiContracts/franchiseStorage.contract.test.ts` |

## 8. Engines/analyzers inventory

| Engine/analyzer | Status | Repo evidence | Test evidence |
| --- | --- | --- | --- |
| Game state / scoring engine inside hook | implemented and wired | `src/src_figma/hooks/useGameState.ts`, `src/types/game.ts`, GameTracker components | many `src/src_figma/__tests__/gameTracker/*` and `src/src_figma/__tests__/hooks/useGameState.*` |
| Win expectancy / WPA | implemented and wired | `src/engines/wpaV2.ts`, `src/engines/wpaCalculator.ts`, `src/utils/wpaDisplay.ts`, `src/utils/kblWpaAttribution.ts` | `src/engines/__tests__/wpaV2.test.ts`, `src/engines/__tests__/wpaCalculator.test.ts`, `src/utils/tests/kblWpaAttribution.test.ts` |
| Leverage/clutch/mWAR | implemented and wired for event/game detail/manager systems | `src/engines/leverageCalculator.ts`, `src/engines/clutchCalculator.ts`, `src/engines/mwarCalculator.ts`, `src/src_figma/app/hooks/useMWARCalculations.ts` | `src/src_figma/__tests__/engines/mwarCalculator.matrix.test.ts`, `src/src_figma/__tests__/hooks/useMWARCalculations.test.ts`, `src/src_figma/__tests__/engines/leverageCalculator.relationships.test.ts` |
| Playoff engine | implemented and wired | `src/engines/playoffEngine.ts`, `src/utils/playoffStorage.ts`, `src/src_figma/hooks/usePlayoffData.ts` | `src/src_figma/__tests__/playoffMode/playoffLogic.test.ts`, `src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx` |
| Aging/season transition | implemented and wired through finalize/transition orchestrator | `src/engines/agingEngine.ts`, `src/engines/seasonTransitionEngine.ts`, `src/utils/franchiseSeasonTransitionOrchestrator.ts`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx` | `src/src_figma/__tests__/apiContracts/agingEngine.contract.test.ts`, `src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx`, `src/utils/tests/franchiseSeasonTransitionOrchestrator.test.ts` |
| Salary/grade | implemented and wired | `src/engines/salaryCalculator.ts`, `src/engines/gradeEngine.ts`, `src/utils/franchiseRatingsSalaryAdapter.ts` | `src/src_figma/__tests__/engines/salaryCalculator.test.ts`, `src/src_figma/__tests__/engines/salaryCalculator.matrix.test.ts`, `src/utils/tests/franchiseRatingsSalaryAdapter.test.ts` |
| Roster analyzer | implemented and wired to Team Hub/League Builder as read-only report | `src/engines/rosterAnalyzerEngine.ts`, `src/utils/rosterAnalyzerFranchiseAdapter.ts`, `src/utils/rosterAnalyzerBuilderAdapter.ts`, `src/src_figma/app/components/TeamHubContent.tsx`, `src/src_figma/app/pages/LeagueBuilderRosters.tsx` | `src/engines/__tests__/rosterAnalyzerEngine.test.ts`, `src/utils/tests/rosterAnalyzerFranchiseAdapter.test.ts`, `src/utils/tests/rosterAnalyzerBuilderAdapter.test.ts` |
| Optimal lineup | implemented and wired to pregame benchmark/Team Hub snapshots | `src/utils/optimalLineup.ts`, `src/src_figma/app/utils/pregameLineupBenchmarks.ts`, `src/src_figma/app/components/TeamHubContent.tsx`, `src/src_figma/app/pages/FranchiseHome.tsx` | `src/utils/tests/optimalLineup.test.ts`, `src/src_figma/__tests__/app/pregameLineupBenchmarks.test.ts`, `src/src_figma/__tests__/integration/optimalLineupStaleIntegration.test.ts` |
| Relationship engine | implemented; visible franchise use ambiguous | `src/engines/relationshipEngine.ts`, `src/src_figma/app/hooks/useRelationshipData.ts`, `src/src_figma/hooks/useFranchiseData.ts` | `src/src_figma/__tests__/hooks/useRelationshipData.test.ts`, `src/src_figma/__tests__/engines/relationshipIntegration.test.ts` |
| Mojo/fitness engines | implemented and wired to GameTracker; franchise-long-term persistence limited to game snapshots/events | `src/engines/mojoEngine.ts`, `src/engines/fitnessEngine.ts`, `src/src_figma/hooks/useGameState.ts` | `src/src_figma/__tests__/mojoFitness/mojoEngine.test.ts`, `src/src_figma/__tests__/mojoFitness/fitnessEngine.test.ts`, `src/src_figma/__tests__/mojoFitness/mojoFitnessIntegration.test.ts` |
| Fan morale/narrative engines | implemented; franchise season summary/Team Hub placeholders remain | `src/engines/fanMoraleEngine.ts`, `src/engines/narrativeEngine.ts`, `src/engines/headlineEngine.ts`, `src/engines/moodEngine.ts`, `src/types/reporter.ts` | `src/engines/__tests__/fan-morale-narrative-verify.cjs`, `src/src_figma/__tests__/reporter/*` |
| Park factor deriver | implemented but not proven as franchise analytics UI/persistence | `src/engines/parkFactorDeriver.ts`, `src/types/war.ts`, `src/utils/franchiseSeasonSummaryStorage.ts` placeholder | `src/src_figma/__tests__/statCalculations/bwarCalculator.test.ts`, `src/src_figma/__tests__/data/parkLookup.test.ts` |
| Adaptive learning/calibration | implemented engine/reference; franchise integration ambiguous | `src/engines/adaptiveLearningEngine.ts`, `src/engines/calibrationService.ts` | no direct franchise wiring test found |
| SMB4 generators/profile engines | implemented/reference/prototype | `src/engines/smb4PlayerGenerator.ts`, `src/engines/smb4TeamProfileEngine.ts`, `src/engines/smb4GradeEmulator.ts`, `src/engines/historicalPlayerConverter.ts` | `src/src_figma/__tests__/integration/engineIntegration.test.ts`, generator/profile-specific tests where present |
| Synthetic simulation | implemented but franchise UI guarded off | `src/utils/syntheticGameFactory.ts`, `src/src_figma/app/components/SimulationOverlay.tsx`, `FranchiseHome.tsx` handlers behind disabled constant | no enabled franchise-flow test found |

## 9. Test coverage inventory

Meaningful franchise-related test evidence found in the requested test areas includes:

- Setup/init/scope: `src/src_figma/__tests__/franchiseMode/FranchiseSetup.test.tsx`, `franchiseSetupLaunch.integration.test.ts`, `franchiseInitializer.test.ts`, `useFranchiseData.scope.test.tsx`, `franchiseSeasonScoping.wave3.test.ts`, `franchiseWave3Blockers.test.ts`, `franchiseDataLogic.test.ts`.
- Franchise home/launch/team hub: `src/src_figma/__tests__/franchiseMode/FranchiseHome.test.tsx`, `FranchiseHomeLaunch.test.tsx`, `franchiseGameTrackerRoster.test.ts`, `TeamHubContent.franchiseReads.test.tsx`, `franchiseOffseasonGuards.component.test.tsx`.
- Schedule/storage: `src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts`, `scheduleLogic.test.ts`, `src/src_figma/__tests__/schedule/ScheduleContent.test.tsx`.
- Game persistence/event pipeline: `src/src_figma/__tests__/persistence/eventLog.test.ts`, `gameStorage.test.ts`, `src/src_figma/__tests__/aggregation/processCompletedGame.almanac.test.ts`, `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx`.
- Playoffs: `src/src_figma/__tests__/franchiseMode/usePlayoffData.franchiseScope.test.tsx`, `src/src_figma/__tests__/playoffMode/playoffLogic.test.ts`, `playoffFieldingScope.test.ts`, `src/utils/tests/playoffStorage.elimination.test.ts`.
- Offseason adapters/actions: `src/utils/tests/franchiseOffseasonAdapters.test.ts`, `franchiseRatingsSalaryAdapter.test.ts`, `franchiseRetirementAdapter.test.ts`, `franchiseRetirementCeremony.test.ts`, `franchiseFreeAgencyAdapter.test.ts`, `franchiseDraftAdapter.test.ts`, `franchiseTradeAdapter.test.ts`, `franchiseRosterMovement.test.ts`, `franchisePhase11RosterPlanner.test.ts`, `franchisePhase11RosterActions.test.ts`.
- Finalize/transition/save slots: `src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx`, `franchiseSeasonSummary.wave4.test.ts`, `SeasonSummary.pass5.test.tsx`, `src/utils/tests/franchiseSeasonTransitionOrchestrator.test.ts`, `franchiseSaveSlotManifest.test.ts`.
- WPA/LI/manager value: `src/engines/__tests__/wpaV2.test.ts`, `wpaCalculator.test.ts`, `wpaRuntimeBoundary.test.ts`, `src/utils/tests/kblWpaAttribution.test.ts`, `managerWpaGameState.test.ts`, `managerWpaDerivation.test.ts`, `managerWpaRecommendations.test.ts`, `managerValueTrace.test.ts`, `managerValueGoldenFixtures.test.ts`.
- Almanac/archive/reporter: `src/src_figma/__tests__/aggregation/almanacQueries.playerCard.test.ts`, `almanacSearch.backfill.test.ts`, `almanacManagerWpa.test.ts`, `src/utils/tests/almanacNarrativeArchive.test.ts`, `commentaryFeedStorage.test.ts`, `gameStoriesStorage.test.ts`, `src/src_figma/__tests__/reporter/*`.
- Derived engines: `src/src_figma/__tests__/detection/milestoneDetector.test.ts`, `detection/fameEvents.test.ts`, `src/src_figma/__tests__/mojoFitness/*`, `src/src_figma/__tests__/engines/salaryCalculator.test.ts`, `salaryCalculator.matrix.test.ts`, `fitnessEngine.matrix.test.ts`, `mojoEngine.matrix.test.ts`, `leverageCalculator.relationships.test.ts`, `src/engines/__tests__/rosterAnalyzerEngine.test.ts`.

Notable test gaps or unproven areas from this inventory:

- No direct enabled-flow evidence found for franchise synthetic simulation because the UI guard is false.
- No direct enabled-flow evidence found for franchise all-star UI because the UI guard is false.
- No direct test found proving franchise Awards Ceremony candidate source is franchise-owned rather than `useOffseasonData`/global data.
- No direct test found proving Farm Reconciliation or Chemistry tabs perform behavior beyond placeholder display.
- No direct test found proving Spring Training writes franchise state.
- No direct test found proving adaptive standards are persisted into franchise summaries.

## 10. Ambiguous areas and follow-up questions

- `src/src_figma/app/routes.tsx` defines routes that overlap `src/App.tsx`. The app evidence inspected points to `src/App.tsx` as the active route tree; the status of `routes.tsx` is dormant/reference unless another entry point imports it.
- Awards Ceremony is wired to offseason state with `franchiseId`, but its candidate source comes from `useOffseasonData` rather than an obvious franchise-owned player/team store in the inspected excerpt. This makes franchise correctness ambiguous.
- `ContractionExpansionFlow` exists and is imported, but the visible franchise contraction tab appears to be a skip/deferred boundary. Whether the modal can be reached in current franchise UI needs follow-up.
- `TradeFlow` has a franchise preview implementation, but `FranchiseHome.tsx` maps the `TRADES` offseason phase to `"spring-training"` and the regular `"rosters"` tab is behind a disabled transaction UI constant. Current visible trade wiring is ambiguous.
- `SpringTrainingFlow` does not accept `franchiseId`; it reads `useOffseasonData`, calculates projections, and calls `onComplete`. Franchise state mutation is not proven.
- Relationship data is loaded into `useFranchiseData`, and relationship engines/tests exist, but the inspected franchise chemistry tab is placeholder. Visible relationship/chemistry behavior in franchise mode is not proven.
- Park factor derivation exists and stadium names are persisted, but franchise Team Hub and season summary explicitly show placeholder/deferred evidence for park-factor analytics.
- Fan morale engines/components exist, but Team Hub and franchise season summaries do not show finalized franchise fan morale persistence.
- Franchise first/leader milestone storage is explicitly stubbed in `src/utils/franchiseStorage.ts`; milestone detection itself exists, but franchise first/leader persistence does not.
- Schedule metadata has franchise-aware reads but mixed storage/update behavior; the franchise-specific metadata semantics need a closer storage-level audit if exact metadata guarantees matter.

## 11. Evidence index

Primary page evidence:

- `src/App.tsx`
- `src/src_figma/app/pages/AppHome.tsx`
- `src/src_figma/app/pages/FranchiseSetup.tsx`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/app/pages/PostGameSummary.tsx`
- `src/src_figma/app/pages/SeasonSummary.tsx`
- `src/src_figma/app/pages/GameDetail.tsx`
- `src/src_figma/app/pages/AlmanacHome.tsx`
- `src/src_figma/app/pages/PlayerDirectory.tsx`
- `src/src_figma/app/pages/TeamPage.tsx`
- `src/src_figma/app/pages/ManagerAlmanac.tsx`
- `src/src_figma/app/routes.tsx`

Primary component evidence:

- `src/src_figma/app/components/TeamHubContent.tsx`
- `src/src_figma/app/components/ScheduleContent.tsx`
- `src/src_figma/app/components/PlayoffSeedingFlow.tsx`
- `src/src_figma/app/components/AwardsCeremonyFlow.tsx`
- `src/src_figma/app/components/RatingsAdjustmentFlow.tsx`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/src_figma/app/components/FreeAgencyFlow.tsx`
- `src/src_figma/app/components/DraftFlow.tsx`
- `src/src_figma/app/components/TradeFlow.tsx`
- `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`
- `src/src_figma/app/components/SpringTrainingFlow.tsx`
- `src/src_figma/app/components/SimulationOverlay.tsx`
- `src/src_figma/app/components/BatchOperationOverlay.tsx`
- `src/src_figma/app/components/MilestoneWatchPanel.tsx`
- `src/src_figma/app/components/ManagerWpaOverlay.tsx`
- `src/src_figma/app/components/WinProbChart.tsx`
- `src/src_figma/app/components/CommentaryFeed.tsx`
- `src/src_figma/app/components/NewsBoard.tsx`
- `src/src_figma/app/components/ReporterAssignmentPanel.tsx`
- `src/src_figma/app/components/PostGameColumns.tsx`
- `src/src_figma/app/components/MojoFitnessEditor.tsx`

Primary hook evidence:

- `src/src_figma/hooks/useFranchiseData.ts`
- `src/src_figma/hooks/useScheduleData.ts`
- `src/src_figma/hooks/usePlayoffData.ts`
- `src/src_figma/hooks/useOffseasonState.ts`
- `src/src_figma/hooks/useGameState.ts`
- `src/hooks/useSeasonData.ts`
- `src/hooks/useSeasonStats.ts`
- `src/src_figma/app/hooks/useRelationshipData.ts`
- `src/src_figma/app/hooks/useCommentaryFeed.ts`

Primary utility/storage evidence:

- `src/utils/franchiseInitializer.ts`
- `src/utils/franchiseManager.ts`
- `src/utils/franchisePersistenceContract.ts`
- `src/utils/franchisePlayerStorage.ts`
- `src/utils/franchiseFarmStorage.ts`
- `src/utils/franchiseStorage.ts`
- `src/src_figma/app/utils/franchiseGameTrackerRoster.ts`
- `src/utils/scheduleStorage.ts`
- `src/utils/gameStorage.ts`
- `src/utils/eventLog.ts`
- `src/utils/processCompletedGame.ts`
- `src/utils/seasonAggregator.ts`
- `src/utils/playoffStorage.ts`
- `src/utils/offseasonStorage.ts`
- `src/utils/franchiseOffseasonAdapters.ts`
- `src/utils/franchiseOffseasonDataAccess.ts`
- `src/src_figma/app/utils/franchiseOffseasonGuards.ts`
- `src/utils/franchiseRatingsSalaryAdapter.ts`
- `src/utils/franchiseRetirementAdapter.ts`
- `src/utils/franchiseRetirementCeremony.ts`
- `src/utils/franchiseFreeAgencyAdapter.ts`
- `src/utils/franchiseDraftAdapter.ts`
- `src/utils/franchiseTradeAdapter.ts`
- `src/utils/franchiseRosterMovement.ts`
- `src/utils/franchiseRosterLockValidator.ts`
- `src/utils/franchisePhase11RosterPlanner.ts`
- `src/utils/franchisePhase11RosterActions.ts`
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/utils/franchiseSeasonTransitionOrchestrator.ts`
- `src/utils/franchiseTransitionJournal.ts`
- `src/utils/transactionStorage.ts`
- `src/utils/registerAlmanacPlayers.ts`
- `src/utils/almanacQueries.ts`
- `src/utils/almanacTeamIdentity.ts`
- `src/utils/commentaryFeedStorage.ts`
- `src/utils/gameStoriesStorage.ts`
- `src/utils/reporterStorage.ts`
- `src/utils/reporterAssignment.ts`
- `src/utils/reporterAlmanacCacheStorage.ts`
- `src/utils/almanacNarrativeArchive.ts`
- `src/utils/kblWpaAttribution.ts`
- `src/utils/managerWpaGameState.ts`
- `src/utils/managerWpaDerivation.ts`
- `src/utils/managerWpaRecommendations.ts`
- `src/utils/pogAwards.ts`
- `src/utils/playersOfTheGame.ts`
- `src/utils/optimalLineup.ts`
- `src/src_figma/app/utils/gameTrackerIdentity.ts`
- `src/src_figma/app/utils/pregameLineupBenchmarks.ts`
- `src/src_figma/app/utils/stadiumSelection.ts`

Primary engine/type evidence:

- `src/types/franchise.ts`
- `src/types/game.ts`
- `src/types/managerWpa.ts`
- `src/types/reporter.ts`
- `src/types/reporterPreferences.ts`
- `src/types/war.ts`
- `src/engines/wpaV2.ts`
- `src/engines/wpaCalculator.ts`
- `src/engines/leverageCalculator.ts`
- `src/engines/clutchCalculator.ts`
- `src/engines/mwarCalculator.ts`
- `src/engines/playoffEngine.ts`
- `src/engines/seasonTransitionEngine.ts`
- `src/engines/agingEngine.ts`
- `src/engines/salaryCalculator.ts`
- `src/engines/gradeEngine.ts`
- `src/engines/rosterAnalyzerEngine.ts`
- `src/engines/relationshipEngine.ts`
- `src/engines/mojoEngine.ts`
- `src/engines/fitnessEngine.ts`
- `src/engines/fanMoraleEngine.ts`
- `src/engines/narrativeEngine.ts`
- `src/engines/headlineEngine.ts`
- `src/engines/moodEngine.ts`
- `src/engines/parkFactorDeriver.ts`
- `src/engines/adaptiveLearningEngine.ts`
- `src/engines/calibrationService.ts`
- `src/engines/smb4PlayerGenerator.ts`
- `src/engines/smb4TeamProfileEngine.ts`
- `src/engines/smb4GradeEmulator.ts`
- `src/engines/historicalPlayerConverter.ts`

Primary test evidence:

- `src/src_figma/__tests__/franchiseMode/*`
- `src/src_figma/__tests__/scheduleData/*`
- `src/src_figma/__tests__/schedule/ScheduleContent.test.tsx`
- `src/src_figma/__tests__/persistence/*`
- `src/src_figma/__tests__/aggregation/*`
- `src/src_figma/__tests__/playoffMode/*`
- `src/src_figma/__tests__/gameTracker/*`
- `src/src_figma/__tests__/hooks/*`
- `src/src_figma/__tests__/reporter/*`
- `src/src_figma/__tests__/detection/*`
- `src/src_figma/__tests__/mojoFitness/*`
- `src/src_figma/__tests__/engines/*`
- `src/src_figma/__tests__/apiContracts/*`
- `src/utils/tests/*franchise*`
- `src/utils/tests/*manager*`
- `src/utils/tests/*rosterAnalyzer*`
- `src/utils/tests/*almanac*`
- `src/utils/tests/kblWpaAttribution.test.ts`
- `src/utils/tests/pogAwards.test.ts`
- `src/engines/__tests__/*`
