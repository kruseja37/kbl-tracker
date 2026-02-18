# KBL Tracker Subsystem Map
**Last updated:** 2026-02-17
**Status:** IN PROGRESS — Phase 1 breadth survey
## Legend
- ✅ WIRED — active app imports and uses
- ⚠️ PARTIAL — integration file exists, wiring incomplete
- ❌ ORPHANED — engine exists, not imported by active app
- 🔲 UNKNOWN — not yet audited
| # | Subsystem | Key Files | Wiring Status | Notes |
|---|-----------|-----------|---------------|-------|
| 1 | GameTracker / Game State | useGameState.ts, GameTracker.tsx | ✅ WIRED | Deep audited FINDING-001 to 048 |
| 2 | Stats Aggregation | seasonAggregator.ts, liveStatsCalculator.ts | 🔲 UNKNOWN | |
| 3 | Franchise / Season Engine | franchiseManager.ts, franchiseStorage.ts | 🔲 UNKNOWN | |
| 4 | WAR System | bwar/fwar/pwar/rwar/mwarCalculator.ts, warOrchestrator.ts | 🔲 UNKNOWN | |
| 5 | Fame / Milestone | fameEngine.ts, milestoneDetector.ts, fameIntegration.ts | 🔲 UNKNOWN | fameEngine 947 lines — FINDING-022 |
| 6 | Schedule System | scheduleGenerator.ts, scheduleStorage.ts | 🔲 UNKNOWN | |
| 7 | Offseason | offseasonStorage.ts, seasonEndProcessor.ts, seasonTransitionEngine.ts | 🔲 UNKNOWN | |
| 8 | Playoffs | playoffEngine.ts, playoffStorage.ts | 🔲 UNKNOWN | |
| 9 | Relationships | relationshipEngine.ts, relationshipStorage.ts, relationshipIntegration.ts | 🔲 UNKNOWN | |
| 10 | Narrative / Headlines | narrativeEngine.ts, headlineEngine.ts, narrativeIntegration.ts | 🔲 UNKNOWN | |
| 11 | Mojo / Fitness | mojoEngine.ts, fitnessEngine.ts, playerStateIntegration.ts | 🔲 UNKNOWN | playerStateHook seen at GameTracker line 287 |
| 12 | Fan Morale | fanMoraleEngine.ts, fanMoraleIntegration.ts | 🔲 UNKNOWN | |
| 13 | Farm System | farmStorage.ts | 🔲 UNKNOWN | |
| 14 | Trade System | tradeEngine.ts, transactionStorage.ts | 🔲 UNKNOWN | |
| 15 | Salary System | salaryCalculator.ts | 🔲 UNKNOWN | |
| 16 | League Builder | leagueBuilderStorage.ts, useLeagueBuilderData.ts | 🔲 UNKNOWN | |
| 17 | Museum / HOF | museumPipeline.ts, museumStorage.ts, hofEngine.ts | 🔲 UNKNOWN | |
| 18 | Aging / Ratings | agingEngine.ts, ratingsAdjustmentEngine.ts, agingIntegration.ts | 🔲 UNKNOWN | |
| 19 | Career Stats | careerStorage.ts | 🔲 UNKNOWN | |
| 20 | UI Pages | 16 pages in src_figma/app/pages/ | 🔲 UNKNOWN | |
| 21 | Trait System | smb4_traits_reference.md, player types | ❌ MISSING | FINDING-055: no traits on players anywhere |
