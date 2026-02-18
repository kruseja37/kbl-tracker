# Findings 056 Onwards
All findings from Phase 1 breadth survey appended here.
AUDIT_LOG.md contains findings 001-055.

---

### FINDING-056
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/utils/unifiedPlayerStorage.ts` lines 67-69, 176
**Claim:** FINDING-055 — traits not stored on players anywhere
**Evidence:** Lines 67-69: `// Chemistry and traits` comment, `traits: PlayerTraits;` field exists in the player type. Line 176: traits field also present in a second interface. PlayerTraits type is defined somewhere — file has the field.
**Status:** CONFIRMED GAP PARTIALLY REVISED — traits field EXISTS in unifiedPlayerStorage player type, but NOT in active app player types (command 5 returned no output for src_figma/app/types/ and src/types/)
**Verification method:** grep trait in player storage and type files
**Verified by:** Claude + JK
**Impact:** The traits field exists in `unifiedPlayerStorage.ts` (legacy/src path) but is absent from the active app's type definitions (src_figma/app/types/game.ts, src/types/game.ts, src/types/index.ts). This means: the data model has traits, the active app's type system does not. Players created through the active UI cannot have traits assigned because the type doesn't include the field. The trait system exists as a stub in legacy code but was never migrated to the active app.

---

### FINDING-057
**Date:** 2026-02-17
**Phase:** 1
**File:** Stats Aggregation subsystem
**Claim:** Stats aggregation is unknown
**Evidence:** seasonAggregator.ts: 344 lines. Key exports: aggregateGameToSeason(), getCurrentSeasonId(), getGameMilestones(). seasonStorage.ts: 898 lines (substantial). liveStatsCalculator.ts: 365 lines. processCompletedGame.ts calls aggregateGameToSeason (FINDING-025 — confirmed wired for game completion).
**Status:** CONFIRMED — core aggregation function exists and is called
**Verification method:** wc -l + grep exports
**Verified by:** Claude + JK
**Impact:** Stats aggregation pipeline is real and partially wired. Need to verify what stat categories aggregateGameToSeason covers and whether it handles all the WAR inputs.

---

### FINDING-058
**Date:** 2026-02-17
**Phase:** 1
**File:** Franchise subsystem
**Claim:** Franchise storage is unknown
**Evidence:** franchiseManager.ts: 722 lines. Full CRUD for franchise metadata: createFranchise, loadFranchise, deleteFranchise, renameFranchise, listFranchises, getActiveFranchise, setActiveFranchise, exportFranchise, importFranchise. franchiseStorage.ts (src/utils/): 157 lines. franchiseInitializer.ts: 173 lines. src_figma/utils/franchiseStorage.ts: 1 line (re-export, same pattern as gameStorage).
**Status:** CONFIRMED — franchise CRUD layer is real and substantial
**Verification method:** wc -l + grep exports
**Verified by:** Claude + JK
**Impact:** Franchise creation/management infrastructure exists. Whether it's wired to the active FranchiseHome/FranchiseSetup pages is unknown.

---

### FINDING-059
**Date:** 2026-02-17
**Phase:** 1
**File:** Schedule subsystem
**Claim:** Schedule system is unknown
**Evidence:** scheduleStorage.ts: 547 lines. Full schedule API: getAllGames, getGamesByTeam, getNextScheduledGame, addGame, addSeries, updateGameStatus, completeGame, deleteGame, getTeamScheduleStats, clearSeasonSchedule. scheduleGenerator.ts: 89 lines (small — likely generates the initial schedule). useScheduleData.ts (active hook): 224 lines.
**Status:** CONFIRMED — schedule system is substantial and has an active hook
**Verification method:** wc -l + grep exports
**Verified by:** Claude + JK
**Impact:** Schedule system has real storage and an active hook. The completeGame() function in scheduleStorage is what marks games played — this is the T0-05 fix referenced in GameTracker.tsx line 59. Wiring to FranchiseHome page unknown.

---

### FINDING-060
**Date:** 2026-02-17
**Phase:** 1
**File:** src_figma/utils/ re-export pattern
**Claim:** Only gameStorage.ts uses the re-export pattern
**Evidence:** src_figma/utils/franchiseStorage.ts: 1 line (re-export). src_figma/utils/seasonStorage.ts: 1 line (re-export). Same pattern as gameStorage confirmed across all three.
**Status:** CONFIRMED — all src_figma/utils/ files are re-export barrels pointing to src/utils/
**Verification method:** wc -l
**Verified by:** Claude + JK
**Impact:** Consistent architecture. All persistence logic lives in src/utils/. The src_figma/utils/ layer is purely an alias layer. This is clean — not a concern.

---

### FINDING-061
**Date:** 2026-02-17
**Phase:** 1
**File:** WAR subsystem — all five calculators + warOrchestrator
**Claim:** WAR system wiring status unknown
**Evidence:** File sizes: bwarCalculator 406, fwarCalculator 692, pwarCalculator 583, rwarCalculator 597, mwarCalculator 1009, warOrchestrator 381 lines. warOrchestrator exports: PlayerWARSummary interface, calculateAndPersistSeasonWAR(). Command 5 returned NO OUTPUT — warOrchestrator, bwar/fwar/pwar/rwar/mwarCalculator are not imported by any active hook or page.
**Status:** CONFIRMED — WAR calculators are ORPHANED from active app
**Verification method:** grep imports in src_figma/hooks/ and pages/
**Verified by:** Claude + JK
**Impact:** CRITICAL. 3,287 lines of WAR calculation code (5 calculators + orchestrator) are completely unimported by the active app. calculateAndPersistSeasonWAR() exists but nothing calls it. WAR values shown anywhere in the UI are either hardcoded, calculated inline, or not shown at all. Must verify what mwarHook (seen at GameTracker line 287) actually is — it may be the active WAR path.

---

### FINDING-062
**Date:** 2026-02-17
**Phase:** 1
**File:** Fame / Milestone subsystem
**Claim:** Fame and milestone systems wiring status unknown
**Evidence:** fameEngine.ts: 947 lines. Exports: calculateFame(), getFameTier(), detectCareerMilestones(), detectCareerNegativeMilestones(), detectSeasonMilestones(), detectSeasonNegativeMilestones(), CAREER_THRESHOLDS, SEASON_THRESHOLDS. fameIntegration.ts: 514 lines. milestoneDetector.ts: 1,471 lines (exists in BOTH src/utils/ and src_figma/utils/ — identical size, likely duplicated). milestoneAggregator.ts: 931 lines (same duplication pattern). Command 6: fameIntegration/fameEngine/milestoneDetector/milestoneAggregator — NOT imported by any active hook. ONE import found: FranchiseHome.tsx imports getApproachingMilestones from milestoneDetector.
**Status:** CONFIRMED — fame/milestone partially wired (one function in FranchiseHome only)
**Verification method:** grep imports in hooks/ and pages/
**Verified by:** Claude + JK
**Impact:** 947-line fameEngine orphaned. 1,471-line milestoneDetector used for one function (getApproachingMilestones) in FranchiseHome. fameIntegration.ts (514 lines) completely orphaned. The full fame calculation pipeline (calculateFame, tier detection, season/career milestones) never fires in the active app.

---

### FINDING-063
**Date:** 2026-02-17
**Phase:** 1
**File:** Milestone duplication
**Claim:** milestoneDetector.ts and milestoneAggregator.ts are unique files
**Evidence:** src/utils/milestoneDetector.ts: 1,471 lines. src/src_figma/utils/milestoneDetector.ts: 1,471 lines — identical line count. src/utils/milestoneAggregator.ts: 931 lines. src/src_figma/utils/milestoneAggregator.ts: 931 lines — identical.
**Status:** CONFIRMED — both milestone files are duplicated, NOT re-exports (unlike gameStorage/franchiseStorage pattern)
**Verification method:** wc -l comparison
**Verified by:** Claude + JK
**Impact:** Unlike the clean re-export pattern in utils/, these files appear to be actual duplicates — same content in two locations. Risk of divergence if one is edited and the other is not. Must verify whether they are true duplicates or have differences.

---

### FINDING-064
**Date:** 2026-02-17
**Phase:** 1
**File:** Offseason / Playoff subsystem
**Claim:** Offseason and playoff systems wiring status unknown
**Evidence:** seasonEndProcessor.ts: 417 lines. Key export: processSeasonEnd() — the main season-end pipeline. offseasonStorage.ts: 759 lines. seasonTransitionEngine.ts: 315 lines. playoffStorage.ts: 784 lines. playoffEngine.ts: 510 lines. Active hooks: useOffseasonData.ts 404 lines, useOffseasonState.ts 431 lines, usePlayoffData.ts 585 lines — all three are active hooks (in src_figma/hooks/). Wiring to pages unknown.
**Status:** CONFIRMED — substantial offseason/playoff infrastructure with active hooks, page wiring unknown
**Verification method:** wc -l
**Verified by:** Claude + JK
**Impact:** The offseason and playoff systems have real active hooks, unlike WAR/Fame which are fully orphaned. Whether SeasonSummary.tsx and WorldSeries.tsx pages actually use these hooks is the critical unknown.

---

## SUBSYSTEM_MAP updates required (2026-02-17 batch B):
- WAR System: ❌ ORPHANED (calculators unimported — but mwarHook needs investigation)
- Fame/Milestone: ⚠️ PARTIAL (one function in FranchiseHome, rest orphaned)
- Offseason: ⚠️ PARTIAL (active hooks exist, page wiring unknown)
- Playoffs: ⚠️ PARTIAL (active hook exists, page wiring unknown)
- milestoneDetector/Aggregator: duplicated files — not re-exports

---

### FINDING-065
**Date:** 2026-02-17 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/src_figma/app/hooks/usePlayerState.ts`, `GameTracker.tsx`
**Evidence:** usePlayerState imported at GameTracker line 38. playerStateHook instantiated line 251. Players registered via registerPlayer() at lines 765-812. Actively used during game.
**Impact:** Mojo/fitness tracking IS live during games. mojoEngine.ts (916 lines) and fitnessEngine.ts (962 lines) are backends — whether playerStateIntegration calls them or reimplements inline still needs verification.

---

### FINDING-066
**Date:** 2026-02-17 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/src_figma/app/hooks/useMWARCalculations.ts`, `GameTracker.tsx`
**Evidence:** useMWARCalculations imported at GameTracker line 56. mwarHook fully wired: initializeGame(), initializeSeason(), recordDecision(), resolveDecisionOutcome(), checkForManagerMoment(), saveGameDecisions(). Decision tracking fires on pitching changes, IBB, pinch hitters. mWAR persisted at end-game.
**Impact:** REVISES FINDING-061. mWAR (manager WAR) is actively tracked. Orphaned calculators are bWAR/fWAR/pWAR/rWAR only. Two distinct WAR tracks: mWAR (live) vs positional WAR (orphaned).

---

### FINDING-067
**Date:** 2026-02-17 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/src_figma/app/hooks/useFameTracking.ts`, `GameTracker.tsx`
**Evidence:** useFameTracking imported at GameTracker line 44. fameTrackingHook instantiated line 257. Used in endGame flow and at-bat processing dep arrays.
**Impact:** REVISES FINDING-062. Fame tracking IS active during games via hook layer. fameEngine.ts (raw calculations) and fameIntegration.ts still orphaned — hook may reimplement inline.

---

### FINDING-068
**Date:** 2026-02-17 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/src_figma/app/hooks/useFanMorale.ts`, `GameTracker.tsx`
**Evidence:** useFanMorale imported at GameTracker line 52. homeFanMorale and awayFanMorale instantiated lines 278-279. Referenced in endGame dep array.
**Impact:** Fan morale updates during and after games. fanMoraleEngine.ts (1,357 lines) backend wiring to hook needs verification.

---

### FINDING-069
**Date:** 2026-02-17 | **Phase:** 1 | **Status:** CONFIRMED PARTIAL
**File:** `src/src_figma/app/engines/narrativeIntegration.ts`
**Evidence:** generateGameRecap() imported by GameTracker.tsx (line 54) AND FranchiseHome.tsx (line 44). narrativeIntegration.ts is only 81 lines — thin wrapper. Full narrativeEngine.ts (1,276 lines) and headlineEngine.ts (287 lines) not imported directly.
**Impact:** Game recaps generated. Full narrative/headline system (storylines, beat writer, relationship-driven content) not wired.

---

### FINDING-070
**Date:** 2026-02-17 | **Phase:** 1 | **Status:** CONFIRMED ORPHANED
**File:** `src/engines/relationshipEngine.ts`, `src/src_figma/app/engines/relationshipIntegration.ts`
**Evidence:** relationshipIntegration NOT imported by any active hook or page. relationshipEngine.ts (273 lines), relationshipIntegration.ts (524 lines), useRelationshipData (199 lines) — all unwired.
**Impact:** Player chemistry and relationships have zero effect on gameplay. Trait-relationship-chemistry system entirely disconnected.

---

### FINDING-071
**Date:** 2026-02-17 | **Phase:** 1 | **Status:** CONFIRMED
**File:** App-wide
**Evidence:** Pattern confirmed across multiple subsystems. Four-layer architecture: (1) Raw engines src/engines/ — calculation logic, no React. (2) Integration adapters src_figma/app/engines/ — bridge to React. (3) App hooks src_figma/app/hooks/ — React hooks consuming integrations. (4) Page hooks src_figma/hooks/ — higher-level hooks used by pages directly.
**Impact:** Hook layer (3-4) is the active surface. Layers 1-2 are where orphaned code lives. Audit should focus on which layer-3 hooks are wired to pages and whether they call layer-1 engines or reimplement inline.

---

### FINDING-072
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED ORPHANED
**File:** `src/utils/farmStorage.ts` (327 lines)
**Evidence:** Zero importers anywhere in src/. No active hook or page consumes it.
**Impact:** Farm system storage layer exists but is completely unwired. No farm system functionality in the active app.

---

### FINDING-073
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED ORPHANED
**File:** `src/engines/tradeEngine.ts` (889 lines), `src/utils/transactionStorage.ts` (627 lines)
**Evidence:** Both files have zero importers anywhere in src/.
**Impact:** 1,516 lines of trade/transaction logic are completely disconnected. No trade functionality in active app.

---

### FINDING-074
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED — FILE MISSING
**File:** `src/utils/salaryCalculator.ts` — does NOT exist
**Evidence:** salaryCalculator.ts lives at `src/engines/salaryCalculator.ts` (1,196 lines per prior audit). Prior batch confirmed its existence at that path.
**Impact:** Path assumption was wrong. Salary calculator exists but was audited in prior batch. Wiring status carry-forward: unknown until Tier 2 import check.

---

### FINDING-075
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/utils/leagueBuilderStorage.ts` (1,130 lines), `src/src_figma/hooks/useLeagueBuilderData.ts` (461 lines)
**Evidence:** leagueBuilderStorage imported by: useFranchiseData.ts, usePlayoffData.ts, WorldSeries.tsx, FranchiseHome.tsx.
**Impact:** League Builder is one of the more broadly wired subsystems. Active in franchise mode, playoff, and world series flows.

---

### FINDING-076
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED (with gap)
**File:** `src/utils/museumPipeline.ts` (114 lines), `src/utils/museumStorage.ts` (744 lines), `src/engines/hofEngine.ts` (149 lines), `src/src_figma/hooks/useMuseumData.ts` (440 lines)
**Evidence:** museumPipeline imported directly by useMuseumData.ts. museumStorage consumed via museumPipeline. hofEngine only in tests — no prod wiring. useMuseumData wires the pipeline to the UI. museumPipeline has NO named exports (grep returned nothing).
**Impact:** Museum/display pipeline is live via useMuseumData. HOF induction logic (hofEngine.ts) is test-only — no production pathway. museumPipeline having zero named exports is a red flag — it may be all side-effect logic or may be exporting default only. Must verify.

---

### FINDING-077
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED (partial)
**File:** `src/engines/agingEngine.ts` (263 lines), `src/engines/ratingsAdjustmentEngine.ts` (532 lines), `src/utils/playerRatingsStorage.ts` (96 lines), `src/src_figma/app/engines/agingIntegration.ts`
**Evidence:** agingEngine wired via: agingIntegration.ts → engines/index.ts → useAgingData.ts. Also: SpringTrainingFlow.tsx imports agingEngine directly (bypasses integration wrapper). SpringTrainingFlow IS rendered by FranchiseHome via FinalizeAdvanceFlow — so aging is live in offseason path. useAgingData.ts (app/hooks/) is self-orphaned — nothing in app/pages/ renders it directly. ratingsAdjustmentEngine.ts: ORPHANED (zero importers). playerRatingsStorage.ts: ORPHANED (only archived-components ref).
**Impact:** Aging fires via the offseason/spring training path. The full ratings adjustment engine (532 lines) and player ratings storage (96 lines) are dead. Direct SpringTrainingFlow import bypasses the integration layer — violates four-layer architecture pattern (FINDING-071).

---

### FINDING-078
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/utils/careerStorage.ts` (895 lines), `src/hooks/useCareerStats.ts` (199 lines)
**Evidence:** careerStorage imported by: FranchiseHome.tsx (direct), src_figma/utils/careerStorage.ts (figma wrapper), milestoneDetector, milestoneAggregator. useCareerStats.ts only wired to inactive GameTracker path and tests.
**Impact:** Career storage is live and used in FranchiseHome + milestone pipeline. useCareerStats hook is orphaned from active app (inactive GameTracker import only). Career data is written; the hook for reading it in the active UI is unwired.

---

### FINDING-079
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED PATTERN VIOLATION
**File:** `src/src_figma/app/pages/SpringTrainingFlow.tsx`
**Evidence:** SpringTrainingFlow.tsx imports agingEngine directly from src/engines/agingEngine.ts, bypassing the agingIntegration.ts wrapper and engines/index.ts export. This is the only confirmed case of a page-level component reaching directly into layer-1 engines.
**Impact:** Violates the four-layer architecture (FINDING-071). If agingIntegration.ts adds pre/post-processing, SpringTrainingFlow skips it. Risk of inconsistent aging behavior between offseason and any other path that uses the integration wrapper.

---

### FINDING-072
**Date:** 2026-02-18
**Phase:** 1
**File:** `src/utils/farmStorage.ts`, `src/engines/tradeEngine.ts`, `src/utils/transactionStorage.ts`
**Claim:** Farm and Trade systems are wired to the active app
**Evidence:** farmStorage.ts: 327 lines. tradeEngine.ts: 889 lines. transactionStorage.ts: 627 lines. Active importer grep returned zero results for all three — not imported by any active hook or page.
**Status:** CONFIRMED — Farm and Trade systems are FULLY ORPHANED
**Verification method:** grep for importers in src_figma/hooks/ and pages/
**Verified by:** JK
**Impact:** 1,843 lines of Farm/Trade logic (player movement, transaction history, trade engine) are completely disconnected from the active app. Spec docs exist (FARM_SYSTEM_SPEC.md, TRADE_SYSTEM_SPEC.md, TRADE_FIGMA_SPEC.md). The UI flows for trades and farm movement have no active backing implementation.

---

### FINDING-073
**Date:** 2026-02-18
**Phase:** 1
**File:** `src/engines/salaryCalculator.ts` (correct path) vs `src/utils/salaryCalculator.ts` (wrong path)
**Claim:** salaryCalculator lives at src/utils/salaryCalculator.ts
**Evidence:** File NOT FOUND at src/utils/. Prior audit identified it at src/engines/salaryCalculator.ts (1,196 lines). Wiring status from prior batches: not confirmed imported by active hooks.
**Status:** CONFIRMED — path was wrong; file is at src/engines/. Wiring remains UNVERIFIED.
**Verification method:** wc -l path error
**Verified by:** JK
**Impact:** Salary system spec exists (SALARY_SYSTEM_SPEC.md). The 1,196-line calculator needs a separate wiring check against active hooks.
**Next action:** grep for salaryCalculator imports in src_figma/hooks/ and pages/

---

### FINDING-074
**Date:** 2026-02-18
**Phase:** 1
**File:** `src/utils/leagueBuilderStorage.ts`, `src/src_figma/hooks/useLeagueBuilderData.ts`
**Claim:** League Builder system is wired
**Evidence:** leagueBuilderStorage.ts: 1,130 lines. useLeagueBuilderData.ts: 461 lines. Active consumers confirmed: useFranchiseData.ts, usePlayoffData.ts, WorldSeries.tsx, FranchiseHome.tsx.
**Status:** CONFIRMED — League Builder is WIRED and substantially consumed
**Verification method:** grep for importers
**Verified by:** JK
**Impact:** The largest storage file in Batch D (1,130 lines) is actively used by four consumers including two major pages. League Builder is one of the most wired subsystems in the app.

---

### FINDING-075
**Date:** 2026-02-18
**Phase:** 1
**File:** `src/utils/museumStorage.ts`, `src/utils/museumPipeline.ts`, `src/engines/hofEngine.ts`, `src/src_figma/hooks/useMuseumData.ts`
**Claim:** Museum/HOF system wiring status unknown
**Evidence:** museumStorage.ts: 744 lines. museumPipeline.ts: 114 lines — grep returned NO named exports (empty export surface). hofEngine.ts: 149 lines — only imported by a test file (tier23Systems.test.ts), not production code. useMuseumData.ts: 440 lines — imports museumPipeline.ts and museumStorage.ts directly.
**Status:** CONFIRMED — Museum is PARTIALLY WIRED (useMuseumData exists and imports storage/pipeline), HOF engine is ORPHANED from production
**Verification method:** grep exports + importer check
**Verified by:** JK
**Impact:** The Museum display path (useMuseumData → museumStorage/museumPipeline) is wired. But museumPipeline.ts has no named exports — it likely uses default export or side-effect imports, which is an unusual pattern worth flagging. hofEngine.ts (HOF induction logic) fires only in tests, never in production. HOF induction is not live.

---

### FINDING-076
**Date:** 2026-02-18
**Phase:** 1
**File:** `src/engines/agingEngine.ts`, `src/engines/ratingsAdjustmentEngine.ts`, `src/utils/playerRatingsStorage.ts`, `src/src_figma/app/engines/agingIntegration.ts`
**Claim:** Aging and ratings systems wiring status unknown
**Evidence:** agingEngine.ts: 263 lines. ratingsAdjustmentEngine.ts: 532 lines — zero importers anywhere in src/. playerRatingsStorage.ts: 96 lines — only importer is archived PlayerRatingsForm.tsx. agingIntegration.ts confirmed at src/src_figma/app/engines/ (not src/engines/) — exported via engines/index.ts → useAgingData.ts.
**Status:** CONFIRMED — agingEngine is WIRED (via agingIntegration → engines/index → useAgingData); ratingsAdjustmentEngine is FULLY ORPHANED; playerRatingsStorage is FULLY ORPHANED
**Verification method:** grep importers
**Verified by:** JK
**Impact:** Aging fires (via offseason path). But the ratings adjustment engine (532 lines) — the EOS ratings bump/decay system — is completely disconnected. EOS_RATINGS_ADJUSTMENT_SPEC.md documents this as a core feature; the engine exists but nothing calls it. Player ratings will never change end-of-season. playerRatingsStorage.ts (96 lines) also orphaned — rating history is not being written.

---

### FINDING-077
**Date:** 2026-02-18
**Phase:** 1
**File:** `src/src_figma/hooks/useAgingData.ts`
**Claim:** useAgingData.ts is wired to pages
**Evidence:** useAgingData.ts is imported by engines/index.ts and receives agingIntegration. However, grep found no page-level consumers of useAgingData — only self-reference.
**Status:** CONFIRMED — useAgingData is SELF-ORPHANED (hook exists, no page renders it)
**Verification method:** grep for useAgingData in pages/
**Verified by:** JK
**Impact:** Same pattern as narrative/relationship hooks. The aging hook exists and is properly wired to the engine, but no page imports it. Aging logic never executes in the UI. SpringTrainingFlow.tsx bypasses all of this with a direct agingEngine import (FINDING-071), which may be why aging appears to work in practice — it uses the engine directly, not the hook.

---

### FINDING-078
**Date:** 2026-02-18
**Phase:** 1
**File:** `src/utils/careerStorage.ts`, `src/hooks/useCareerStats.ts`
**Claim:** Career stats system wiring status unknown
**Evidence:** careerStorage.ts: 895 lines. src_figma/utils/careerStorage.ts: exists as Figma-layer wrapper. Active consumers: FranchiseHome.tsx (direct import), milestoneDetector.ts, milestoneAggregator.ts. useCareerStats.ts: 199 lines — only imported by src/components/GameTracker/ (inactive path) and tests.
**Status:** CONFIRMED — careerStorage is WIRED to production (FranchiseHome + milestone systems); useCareerStats hook is ORPHANED (only in inactive path)
**Verification method:** grep importers
**Verified by:** JK
**Impact:** Career data is being read by FranchiseHome and milestone systems — so career stats display is live. But the hook abstraction (useCareerStats) is orphaned in the inactive GameTracker path. The active app reads careerStorage directly, not via the hook.

---

### FINDING-079
**Date:** 2026-02-18
**Phase:** 1
**File:** App-wide — Batch D summary
**Claim:** N/A — synthesis finding
**Evidence:** Batch D complete. Subsystem wiring verdict across all 20 subsystems now established at Tier 1 breadth.
**Status:** CONFIRMED — Tier 1 breadth survey complete (Batches A–D)
**Verification method:** Aggregate of findings 001–079
**Verified by:** JK
**Impact:** See SUBSYSTEM_MAP.md update required below. Full picture: League Builder and Career Storage are the healthiest subsystems (truly wired). Farm/Trade/ratingsAdjustment/salaryCalculator (wiring unconfirmed or zero) are the biggest orphan gaps. Aging is partially live via direct engine import bypass. HOF induction is test-only. The four-layer architecture is consistently violated by direct engine imports at the page level.

---

### FINDING-080
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED PARTIAL
**File:** `src/utils/seasonAggregator.ts`, `src/utils/liveStatsCalculator.ts`
**Evidence:** aggregateGameToSeason() called by processCompletedGame.ts (line 39) — the active game-completion pipeline. useGameState.ts imports a type only (no function call). liveStatsCalculator imported only in inactive GameTracker path (index.tsx:73).
**Impact:** Stats aggregation fires at game completion via processCompletedGame. Live in-game stats (liveStatsCalculator) are orphaned from active path — real-time stat updates during gameplay may be absent or handled inline.

---

### FINDING-081
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/utils/franchiseManager.ts`, `src/utils/franchiseInitializer.ts`
**Evidence:** Consumers: FinalizeAdvanceFlow.tsx (updateFranchiseMetadata, getActiveFranchise, generateNewSeasonSchedule), DraftFlow.tsx (getActiveFranchise, loadFranchise), FranchiseSelector.tsx (multiple), FranchiseHome.tsx (generateNewSeasonSchedule, updateFranchiseMetadata), FranchiseSetup.tsx (initializeFranchise), useFranchiseData.ts (getFranchiseConfig, loadFranchise).
**Impact:** Franchise system is one of the best-wired subsystems. 6 active consumers across pages and hooks. Revises FINDING-058 from UNKNOWN to WIRED.

---

### FINDING-082
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/utils/scheduleStorage.ts`, `src/utils/scheduleGenerator.ts`, `src/src_figma/hooks/useScheduleData.ts`
**Evidence:** Consumers: GameTracker.tsx (completeGame on game end), FranchiseHome.tsx (useScheduleData + getAllGames), SeasonSummary.tsx (useScheduleData), useFranchiseData.ts (getNextFranchiseGame), franchiseManager.ts (clearFranchiseSchedule), franchiseInitializer.ts (generateSchedule + addGame + initScheduleDatabase).
**Impact:** Schedule system is fully wired across game, franchise, and summary flows. Revises FINDING-059 from UNKNOWN to WIRED.

---

### FINDING-083
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/engines/salaryCalculator.ts`
**Evidence:** calculateSalary called by: useOffseasonData.ts (active offseason hook), leagueBuilderStorage.ts (computeInitialSalary line 899), seasonTransitionEngine.ts. Exported via engines/index.ts. Inactive path also uses it (PlayerCard, SalaryDisplay) but active path is confirmed.
**Impact:** Salary calculator is live in offseason processing, league builder player creation, and season transitions. Revises FINDING-073/074 UNVERIFIED → WIRED.

---

### FINDING-084
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/src_figma/app/engines/playerStateIntegration.ts`, `fanMoraleIntegration.ts`, `narrativeIntegration.ts`
**Evidence:** All three integration files follow standard pattern — wrap base engine (mojo/fitness/clutch, fanMoraleEngine, narrativeEngine respectively) and are re-exported via engines/index.ts. All confirmed exported.
**Impact:** Integration layer is intact for all three. Whether page-level hooks actually call these (vs calling base engines directly like SpringTrainingFlow does) needs Batch B verification.

---

### FINDING-085
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED ORPHANED
**File:** `src/utils/liveStatsCalculator.ts`
**Evidence:** Only importer is inactive GameTracker path (src/components/GameTracker/index.tsx:73). No active hook or page imports it.
**Impact:** Real-time stat calculations during gameplay (live box score updates) are not using the dedicated calculator. Active app handles live stats inline or via other means.

### FINDING-086
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED (indirect)
**File:** `src/src_figma/app/engines/relationshipIntegration.ts`, `src/src_figma/app/hooks/useRelationshipData.ts`
**Evidence:** relationshipIntegration re-exports relationshipEngine, exported via engines/index.ts. useRelationshipData (app/hooks/) imports from it. useFranchiseData.ts calls useRelationshipData() at line 307 — making it active via FranchiseHome's franchise data hook. Parallel inactive-path versions exist (src/utils/ + src/hooks/).
**Impact:** REVISES FINDING-070. Relationship data IS reached in production — via useFranchiseData → useRelationshipData → relationshipIntegration → relationshipEngine. However it's indirect (one hop through franchise hook) and only surfaces in FranchiseHome context. No direct page-level wiring.

---

### FINDING-087
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED (partial)
**File:** `src/src_figma/app/engines/narrativeIntegration.ts`, `src/utils/headlineGenerator.ts`
**Evidence:** narrativeIntegration wraps narrativeEngine, adds generateGameRecap(). Called by GameTracker.tsx:2176 (post-game, home+away narratives) and FranchiseHome.tsx:3962 (SIM path). headlineGenerator.ts in src/utils/ has its own generateHeadline — NOT imported by any active page or hook.
**Impact:** Game recaps generate and fire. Full headline system (headlineGenerator.ts) is orphaned. Revises FINDING-069 — narrative wiring confirmed more precisely: recap = WIRED, headline = ORPHANED.

---

### FINDING-088
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/src_figma/app/engines/playerStateIntegration.ts`
**Evidence:** Head-40 confirms re-exports mojo/fitness/clutch engine types + constants. usePlayerState hook consumes it. GameTracker.tsx:38 imports usePlayerState directly — active during every game.
**Impact:** Mojo/Fitness/Clutch tracking IS live during games. Revises FINDING-065/011 subsystem map row — full chain confirmed: playerStateIntegration → mojoEngine + fitnessEngine + clutchCalculator → usePlayerState → GameTracker.

---

### FINDING-089
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED STUBBED
**File:** `src/src_figma/app/hooks/useFanMorale.ts`
**Evidence:** Source comment: "currently STUBBED OUT" / "TODO: Rewrite this hook to match the actual legacy fanMoraleEngine API when needed". GameTracker.tsx:278-279 calls it for home and away teams despite the stub. SeasonEndFlow.tsx imports BASE_MORALE_IMPACTS directly from fanMoraleEngine (bypasses wrapper).
**Impact:** Fan morale is called live in GameTracker but returns placeholder/dummy data. The fanMoraleEngine.ts (1,357 lines) is never properly called from the hook. SeasonEndFlow uses one constant from the engine directly — not a full wiring. Fan morale has zero real effect on gameplay.

---

### FINDING-090
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/src_figma/hooks/useOffseasonData.ts`, `src/src_figma/hooks/useOffseasonState.ts`
**Evidence:** 12 active consumers: FinalizeAdvanceFlow (useOffseasonData), TradeFlow (both), AwardsCeremonyFlow (both), ContractionExpansionFlow (useOffseasonState), RetirementFlow (both), DraftFlow (both), MuseumContent (useOffseasonData), RatingsAdjustmentFlow (both), TeamHubContent (useOffseasonData), SpringTrainingFlow (useOffseasonData), FreeAgencyFlow (both), FranchiseHome (useOffseasonState).
**Impact:** Offseason hooks are the most broadly consumed hooks in the entire app. Revises FINDING-064 PARTIAL → WIRED.

---

### FINDING-091
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED
**File:** `src/src_figma/hooks/usePlayoffData.ts`
**Evidence:** FranchiseHome.tsx:246 and SeasonSummary.tsx:61 both call usePlayoffData(currentSeason).
**Impact:** Playoff data is live in the two pages that need it. Revises FINDING-064 PARTIAL → WIRED.

---

### FINDING-092
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED WIRED (multi-path)
**File:** Fame/Milestone subsystem — useFameTracking, fameEngine, milestoneDetector, milestoneAggregator
**Evidence:** useFameTracking (app/hooks/) → fameIntegration → GameTracker.tsx:257 (live per at-bat). EnhancedInteractiveField.tsx:121 imports fameEngine directly (LI-weighted fame per play). SeasonEndFlow.tsx imports applyChampionshipFame from fameEngine directly. milestoneDetector used by MilestoneWatchPanel, FranchiseHome, milestoneAggregator, seasonAggregator, fameEngine. milestoneAggregator used by seasonAggregator → processCompletedGame.ts.
**Impact:** REVISES FINDING-062/067. Fame is wired at three levels: per-play hook (useFameTracking), direct engine call (EnhancedInteractiveField), and end-of-season (SeasonEndFlow). Milestone detection fires in pre-game UI (MilestoneWatchPanel) and at game completion (seasonAggregator). More complete than prior findings suggested.

---

### FINDING-093
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED
**File:** App-wide — UI Pages audit complete
**Evidence:** Full page→hook map:
- GameTracker.tsx: useGameState, usePlayerState, useFameTracking, useFanMorale, useMWARCalculations, useUndoSystem
- FranchiseHome.tsx: useFranchiseData, useScheduleData, usePlayoffData, useOffseasonState
- SeasonSummary.tsx: useSeasonStats, useFranchiseData, useScheduleData, usePlayoffData
- ExhibitionGame.tsx, FranchiseSetup.tsx, LeagueBuilder.tsx + sub-pages: useLeagueBuilderData
- AppHome, FranchiseSelector, PostGameSummary, WorldSeries, remaining LeagueBuilder sub-pages: React built-ins + router only (no app-level hooks)
**Impact:** Three pages drive the vast majority of hook consumption: GameTracker (6 hooks), FranchiseHome (4 hooks), SeasonSummary (4 hooks). PostGameSummary and WorldSeries have zero app hook imports — they read props or router state only. This is a data gap risk for post-game and world series summary displays.

---

### FINDING-094
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED ORPHANED
**File:** `src/utils/headlineGenerator.ts`
**Evidence:** No active importers in any page or hook.
**Impact:** Headline generation system (separate from narrativeEngine's internal headline logic) is completely unwired. Post-game or franchise headlines are never generated via this path.

---

### FINDING-095
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED ORPHANED
**File:** `src/src_figma/app/hooks/useAgingData.ts`
**Evidence:** No page imports useAgingData directly. SpringTrainingFlow.tsx bypasses it with a direct agingEngine import. Hook is wired to the engine internally but nothing renders it.
**Impact:** Consistent with FINDING-077. Confirmed orphaned from both Tier 1 and Tier 2 checks.

### FINDING-096
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED PARTIAL
**File:** `src/engines/clutchCalculator.ts`, `src/hooks/useClutchCalculations.ts`
**Evidence:** clutchCalculator.ts (1,126 lines) is a complete implementation of CLUTCH_ATTRIBUTION_SPEC.md — calculatePlayAttribution, PlayAttribution interface, accumulateClutchEvent, getClutchTier, all functions present. playerStateIntegration.ts imports calculatePlayAttribution and PlayAttribution types (lines 178, 213, 230, 238, 241). useClutchCalculations.ts (src/hooks/) is the dedicated per-play attribution hook — only wired to inactive GameTracker path. EnhancedInteractiveField.tsx calculates leverageIndex and attaches it to play data but never calls calculatePlayAttribution. No active page or hook calls calculatePlayAttribution or accumulateClutchEvent.
**Impact:** Full multi-participant clutch attribution (batter + pitcher + catcher + fielder + runner + manager per play) never fires in the active app. Players accumulate zero clutch stats. playerStateIntegration has the imports but the calling code in the active GameTracker path never invokes them. The engine and hook exist — the trigger is missing.

---

### FINDING-097
**Date:** 2026-02-18 | **Phase:** 1 | **Status:** CONFIRMED PARTIAL
**File:** `src/engines/leverageCalculator.ts`, `src/src_figma/hooks/useGameState.ts`
**Evidence:** leverageCalculator.ts (872 lines) is a complete implementation of LEVERAGE_INDEX_SPEC.md — BASE_OUT_LI table, full calculateLeverageIndex (boLI × inning multiplier × score dampener × walkoff boost), gmLI accumulator, calculateClutchValue, and relationship modifiers (getRevengeArcModifier, getRomanticMatchupModifier, getFamilyHomeLIModifier, calculateLIWithRelationships). useGameState.ts imports only getBaseOutLI (line 36) and uses it at 6 call sites — base-out LI only, no inning context, no score differential. EnhancedInteractiveField.tsx calls calculateLeverageIndex (the full version) and enriches play data correctly. Relationship LI modifiers are fully implemented but require RelationshipLIContext with active relationship data — never populated since relationship system is indirectly wired only (FINDING-086).
**Impact:** Two-tier LI problem: (1) Most play data in the active app carries partial boLI (base-out only) instead of full contextual LI — late-inning clutch situations are systematically under-weighted. (2) Relationship narrative modifiers (revenge arcs, romantic matchups, family home games) are implemented and spec-compliant but effectively dead. The full LI calculation IS used in EnhancedInteractiveField, so field-initiated plays may have correct LI while hook-initiated plays have partial LI. Inconsistent LI values across the same game.

### FINDING-098
**Date:** 2026-02-18 | **Phase:** 2 | **Status:** CONFIRMED
**File:** `src/engines/clutchCalculator.ts`, `src/src_figma/app/engines/playerStateIntegration.ts`
**Evidence:** OOTP_ARCHITECTURE_RESEARCH.md Section 2 (Stat Pipeline) defines the pattern: after each game, stats flow immediately to PlayerSeasonStats (Step 5). Clutch Attribution is KBL-original — OOTP has no per-play multi-participant clutch system. The correct OOTP-aligned pattern is: clutch stat fields live on PlayerSeasonStats, accumulated per game via the stat pipeline trigger, queryable like any other stat. KBL's clutchCalculator.ts implements exactly this design (PlayerClutchStats interface, accumulateClutchEvent, calculatePlayAttribution). The failure is not architectural — the pattern is correct. The failure is pipeline disconnection: calculatePlayAttribution never fires in the active app, so PlayerClutchStats fields are never written. Clutch stats are spec-correct in design and stat-pipeline-patterned in architecture, but orphaned from the Step 5 trigger.
**Impact:** Pattern conformance verdict: PARTIAL. Architecture follows OOTP stat pipeline pattern correctly. Disconnection from the per-play trigger is the only failure. Fix is surgical: call calculatePlayAttribution at the point where each play result is recorded in GameTracker, then call accumulateClutchEvent to write to PlayerClutchStats. No architectural change required — wiring only.
**SMB4 Asset:** Clutch multi-participant attribution (batter + pitcher + catcher + fielder + runner + manager per play) is KBL-original and must be preserved intact. OOTP pattern provides the pipeline structure only.

---

### FINDING-099
**Date:** 2026-02-18 | **Phase:** 2 | **Status:** CONFIRMED
**File:** `src/engines/leverageCalculator.ts`, `src/src_figma/hooks/useGameState.ts`, `src/src_figma/app/components/EnhancedInteractiveField.tsx`
**Evidence:** OOTP_ARCHITECTURE_RESEARCH.md Section 2 Step 8 defines LI usage: single `leverage_multiplier` in pitcher WAR formula. OOTP uses one unified LI value per game state — no split between partial and full calculations. KBL currently has two different LI values in flight simultaneously: (1) `getBaseOutLI` (base-out state only, no inning/score context) called at 6 sites in useGameState.ts; (2) `calculateLeverageIndex` (full: boLI × inning multiplier × score dampener × walkoff boost) called in EnhancedInteractiveField.tsx. These produce different numbers for the same game state. The full calculation is what both LEVERAGE_INDEX_SPEC.md and OOTP methodology require. Additionally: `calculateLIWithRelationships` (revenge arc, romantic matchup, family home game modifiers) is implemented in leverageCalculator.ts but never receives relationship context data — the RelationshipLIContext is never populated because the relationship system is only indirectly wired (FINDING-086).
**Impact:** Pattern conformance verdict: N. Two LI values in flight for the same game state violates the OOTP single-value principle and produces inconsistent clutch/WAR/fame weights across the same game. Fix requires replacing 6 `getBaseOutLI` calls in useGameState.ts with `calculateLeverageIndex` calls. The relationship LI modifiers remain dead until FINDING-086 (relationship wiring gap) is addressed. boLI can remain as an exported utility but should not be the value attached to play events.
**SMB4 Asset:** Relationship LI modifiers (revenge arc, romantic matchup, family home game) are KBL-original SMB4 systems. The fix must preserve these modifier slots — replace boLI with full LI but keep the relationship modifier extension points intact for when the relationship system is wired.
