# KBL Tracker Subsystem Map
**Last updated:** 2026-07-15
**Status:** Core map plus current Snake Draft wiring

## Legend
- ✅ WIRED — active app imports and uses
- ⚠️ PARTIAL — some wiring present, gaps confirmed
- ❌ ORPHANED — engine exists, not imported by active app
- 🔲 STUBBED — called live but returns placeholder/dummy data

| # | Subsystem | Key Files | Wiring Status | Notes |
|---|-----------|-----------|---------------|-------|
| 1 | GameTracker / Game State | useGameState.ts, GameTracker.tsx | ✅ WIRED | Deep audited FINDING-001 to 048 |
| 2 | Stats Aggregation | seasonAggregator.ts, liveStatsCalculator.ts | ⚠️ PARTIAL | FINDING-080: aggregateGameToSeason wired at game end; liveStatsCalculator orphaned |
| 3 | Franchise / Season Engine | franchiseManager.ts, franchiseInitializer.ts | ✅ WIRED | FINDING-081: 6 active consumers across pages/hooks |
| 4 | WAR System | bwar/fwar/pwar/rwar calculators, warOrchestrator | ❌ ORPHANED | FINDING-061: positional WAR (3,287 lines) unimported. mWAR (FINDING-066) is ✅ WIRED separately |
| 4b | mWAR | useMWARCalculations.ts | ✅ WIRED | FINDING-066: live in GameTracker, persisted at end-game |
| 5 | Fame / Milestone | fameEngine, fameIntegration, milestoneDetector, milestoneAggregator | ✅ WIRED | FINDING-092: per-play hook + direct engine calls + EOS; milestones fire at game completion via seasonAggregator |
| 6 | Schedule System | scheduleStorage.ts, scheduleGenerator.ts | ✅ WIRED | FINDING-082: GameTracker, FranchiseHome, SeasonSummary, useFranchiseData |
| 7 | Offseason | useOffseasonData.ts, useOffseasonState.ts | ✅ WIRED | FINDING-090: 12 active consumers across all offseason flows |
| 8 | Playoffs | playoffEngine.ts, playoffStorage.ts, usePlayoffData.ts | ✅ WIRED | FINDING-091: FranchiseHome + SeasonSummary |
| 9 | Relationships | relationshipEngine.ts, relationshipIntegration.ts | ⚠️ PARTIAL | FINDING-086: reached only via useFranchiseData → useRelationshipData (one indirect hop, FranchiseHome only) |
| 10 | Narrative / Headlines | narrativeIntegration.ts, headlineGenerator.ts | ⚠️ PARTIAL | FINDING-087: game recap wired (GameTracker + FranchiseHome SIM); headlineGenerator.ts orphaned |
| 11 | Mojo / Fitness / Clutch | mojoEngine.ts, fitnessEngine.ts, playerStateIntegration.ts | ✅ WIRED | FINDING-088: full chain confirmed — playerStateIntegration → engines → usePlayerState → GameTracker |
| 11b | Leverage Index | leverageCalculator.ts | ⚠️ PARTIAL | FINDING-097: full LI spec implemented; useGameState uses boLI only (partial); EnhancedInteractiveField uses full LI; relationship modifiers dead |
| 22 | Clutch Attribution | clutchCalculator.ts, useClutchCalculations.ts | ⚠️ PARTIAL | FINDING-096: 1,126-line engine complete; playerStateIntegration imports it; calculatePlayAttribution never called in active app; players accumulate zero clutch stats |
| 12 | Fan Morale | fanMoraleEngine.ts, useFanMorale.ts | 🔲 STUBBED | FINDING-089: hook called live in GameTracker but explicitly stubbed in source; fanMoraleEngine never properly called |
| 13 | Farm System | farmStorage.ts | ❌ ORPHANED | FINDING-072: 327 lines, zero active importers |
| 14 | Trade System | tradeEngine.ts, transactionStorage.ts | ❌ ORPHANED | FINDING-073: 1,516 lines combined, zero active importers |
| 15 | Salary System | src/engines/salaryCalculator.ts | ✅ WIRED | FINDING-083: offseason hook, leagueBuilderStorage, seasonTransitionEngine |
| 16 | League Builder | leagueBuilderStorage.ts, useLeagueBuilderData.ts | ✅ WIRED | FINDING-075/081: consumed by FranchiseHome, WorldSeries, useFranchiseData, usePlayoffData |
| 17 | Museum / HOF | museumStorage.ts, museumPipeline.ts, hofEngine.ts | ⚠️ PARTIAL | FINDING-076: useMuseumData wired to storage/pipeline; hofEngine test-only (HOF induction not live) |
| 18 | Aging / Ratings | agingEngine.ts, ratingsAdjustmentEngine.ts | ⚠️ PARTIAL | FINDING-077/079/095: agingEngine fires via SpringTrainingFlow direct import (bypasses integration); ratingsAdjustmentEngine ORPHANED; useAgingData self-orphaned |
| 19 | Career Stats | careerStorage.ts, useCareerStats.ts | ⚠️ PARTIAL | FINDING-078: careerStorage wired (FranchiseHome + milestones); useCareerStats hook orphaned in inactive path |
| 20 | UI Pages | 16 pages in src_figma/app/pages/ | ✅ WIRED | FINDING-093: full page→hook map complete. PostGameSummary + WorldSeries have zero app-level hooks — data gap risk |
| 21 | Trait System | smb4_traits_reference.md, player types | ❌ MISSING | FINDING-055/056: no traits in active type system; field in legacy unifiedPlayerStorage only |
| 23 | Snake Draft room | SnakeDraftRoom.tsx, SnakeCompanion.tsx, snakeAssistantBoard.ts, snakeLuxuryTax.ts, snakeLiveRoomTransport.ts | ⚠️ DEPLOY GATE | FINDING-186-245: canonical setup/room path, roster-local tax/fit, one cloud private-board authority, Hotseat-only public writes, companion pick/trade intent, dedicated live transport, target/source team isolation, no-trade FARM, and desktop-first companion layout are code-complete and independently approved; remote migration 009, matching deploy, and JK acceptance walk pending |
| 24 | Historical Legends source libraries | historicalLegendsLibraries.ts, historicalLegendsLibraryProvisioner.ts, LeagueBuilderDraftSetup.tsx | ✅ WIRED | FINDING-206: selectable Career/Draft/Peak shelves, stable 242-person cohorts, later-version free agents, manual override preserved |
| 25 | Draft personality initialization | leaguePoolAxisRegen.ts, leaguePoolAxisRegenPersist.ts, historicalLegendsImport.ts | ✅ WIRED | FINDING-207: Legend-authored/person-level truth preserved; non-Legends initialize once; hidden values excluded from draft surfaces |
| 26 | Snake draft morale / fan alignment | draftFreezeInputs.ts, snakeDraftAlignment.ts, snakeDraftManifest.ts, franchiseInitializer.ts | ✅ WIRED | FINDING-208-210: pick-vs-expectation player morale, roster-alignment fan morale, FARM hidden-rank leak rejected |
