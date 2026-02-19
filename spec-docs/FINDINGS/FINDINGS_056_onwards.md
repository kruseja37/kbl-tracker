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

### FINDING-100
**Date:** 2026-02-18 | **Phase:** 2 | **Status:** CONFIRMED
**File:** `src/src_figma/app/pages/GameTracker.tsx`, `src/src_figma/app/components/DragDropGameTracker.tsx`
**Evidence:**
GameTracker.tsx contains a live toggle button (`useEnhancedField` useState, line 368) that switches between EnhancedInteractiveField and InteractiveField (legacy). Default is Enhanced (true). If toggled to Legacy:
- `onPlayComplete` fires `handlePlayComplete` (line 1021) — a 4-line stub: `console.log` only, no stat writes, no persistence, no LI calculation, no mWAR, no fielding pipeline
- `onSpecialEvent`, `onRunnerMove`, `onBatchRunnerMove` are absent from the Legacy branch — all special plays and runner moves silently dropped
- All 3 downstream consumers (`fieldingEventExtractor.ts`, `runnerDefaults.ts`, `detectionIntegration.ts`) are typed to Enhanced `PlayData` — Legacy bypasses them entirely
- `DragDropGameTracker.tsx` is 676 lines sitting in the active component folder, not archived

**Impact:** SILENT DATA LOSS. Any user who toggled to Legacy Field and recorded plays produced zero stats, zero persistence, zero mWAR. The game appeared to function but dropped all data. No error shown. Worse than a crash.
**Resolution:** FIXED 2026-02-18. Removed toggle, legacy branch, handlePlayComplete stub. DragDropGameTracker.tsx (676 lines) archived to src/archived-components/. GameTracker.tsx -200 lines net. Build clean (7 pre-existing errors in inactive path only). Verified by grep — zero legacy references remain.

### FINDING-101
**Date:** 2026-02-18 | **Phase:** 2 | **Status:** CONFIRMED
**File:** `src/hooks/useFanMorale.ts`, `src/src_figma/app/pages/GameTracker.tsx`

**Three bugs confirmed:**

**Bug A — Wrong method name (silent runtime failure).**
GameTracker.tsx lines 2138, 2152 call `homeFanMorale.processGameResult(...)` and
`awayFanMorale.processGameResult(...)`. The hook exports `recordGameResult`, not
`processGameResult`. The call fails silently — caught by try/catch at line 2156,
logged as `[MAJ-02] Fan morale update error (non-blocking)`. Fan morale never
updates after any game. The engine is fully wired structurally but broken at the
call site by a method name mismatch.

**Bug B — Hardcoded season/game numbers.**
Both calls pass `{ season: 1, game: 1 }` hardcoded. No connection to actual
franchise season number or game index from the schedule. All morale history is
tagged to season 1, game 1 regardless of when the game was played.

**Bug C — localStorage instead of IndexedDB.**
useFanMorale persists to `localStorage` (`kbl-fan-morale-{teamId}`). All other
KBL persistence uses IndexedDB. Fan morale state survives across franchise resets,
cannot be wiped with the standard data layer tools, and is invisible to the
rest of the storage system.

**Phase 2 Pattern Verdict:** N/A — Fan morale is a per-team audience sentiment
system (SMB4-original). OOTP Section 7.2 morale is per-player, 5 categories,
affecting development speed and storyline triggers. Different concepts. No
OOTP structural pattern to conform to for this system. Integration verdict:
BROKEN (Bug A means it never fires). Architecture verdict: PARTIAL (localStorage
gap is a data layer violation).

**Impact:** Fan morale is called every game end (wired correctly) but silently
no-ops every time. 1,357 lines of fanMoraleEngine.ts produce zero output in
production. Fix is surgical: rename call sites + wire season/game numbers.
localStorage gap is a follow-on item (requires IndexedDB schema addition).

### FINDING-102
**Date:** 2026-02-18 | **Phase:** 2 | **Status:** CONFIRMED
**System:** Stats Aggregation Pipeline
**Files:** `src/utils/seasonAggregator.ts`, `src/utils/processCompletedGame.ts`, `src/src_figma/hooks/useGameState.ts`

**Phase 2 Pattern Verdict:** PARTIAL

**OOTP reference (Section 2.2):**
After each game, OOTP runs 12 steps: event → box score → season stats update (Step 5) →
standings update (Step 6) → leaderboard refresh (Step 7) → WAR calc (Step 8) →
milestone check (Step 9) → narrative trigger (Step 10) → development update (Step 11).
All 12 steps fire as a single post-game pipeline.

**What KBL does correctly (matches OOTP pattern):**
Steps 5, 9 (partial) present and functioning:
- `aggregateGameToSeason()` correctly increments batting/pitching/fielding season totals
  in IndexedDB after each game (analogous to OOTP Step 5)
- `aggregateFameEvents()` runs milestone detection (partial Step 9 analog)
- `aggregateFieldingStats()` writes putouts/assists/errors per player
- Pipeline wiring: `endGame()` → `completeGameInternal()` → `processCompletedGame()` →
  `aggregateGameToSeason()` — structurally sound, fires reliably (T0-05 fix confirmed)
- Career totals: `useCareerStats.ts` exists and accumulates across seasons

**What KBL is missing (OOTP Steps 6, 7, 8, 10, 11 absent from pipeline):**

Step 6 — Standings Update: **MISSING from pipeline.**
`aggregateGameToSeason()` has zero reference to standings. No team W/L record update
fires after game completion. Standings are updated separately (or manually) — not
wired to the post-game aggregation pipeline.

Step 7 — Leaderboard Refresh: **MISSING from pipeline.**
No leaderboard update in `seasonAggregator.ts` or `processCompletedGame.ts`.
League leaders data is read-only from accumulated season stats — it refreshes only
when the UI queries it, not as a triggered pipeline step.

Step 8 — WAR Calculation: **MISSING from pipeline.**
WAR is not calculated in `aggregateGameToSeason()`. mWAR, bWAR, fWAR engines exist
separately but do not fire as part of the post-game pipeline. WAR numbers shown in
UI are from separate, disconnected calculations.

Step 10 — Narrative Trigger: **MISSING from pipeline.**
Narrative/storyline engine not called from `processCompletedGame()`. No condition
evaluation fires post-game.

Step 11 — Development Update: **MISSING from pipeline.**
`ratingsAdjustmentEngine` not called from aggregation pipeline. Player ratings do
not update on the basis of accumulated playing time during the season.

**Summary:** Pipeline Steps 5 + partial 9 are OOTP-conformant. Steps 6, 7, 8, 10, 11
are absent from the pipeline. The infrastructure for several of these exists as
standalone engines/hooks — they are simply not wired into the post-game aggregation call.

**Fix priority:**
- Step 6 (Standings): HIGH — missing from pipeline, data exists, wiring only
- Step 8 (WAR): MEDIUM — engines exist, need orchestration
- Step 7 (Leaderboard): LOW — UI refresh handles this adequately for now
- Step 10 (Narrative): LOW — narrative system not yet built
- Step 11 (Development): LOW — ratingsAdjustmentEngine orphaned, blocked by other work

### FINDING-103
**Date:** 2026-02-18 | **Phase:** 2 | **Status:** CONFIRMED
**System:** Positional WAR (bWAR, fWAR, pWAR, rWAR, mWAR)
**Files:** `src/engines/bwarCalculator.ts`, `src/engines/fwarCalculator.ts`,
`src/engines/pwarCalculator.ts`, `src/engines/rwarCalculator.ts`,
`src/engines/mwarCalculator.ts`, `src/src_figma/app/engines/warOrchestrator.ts`,
`src/src_figma/app/engines/mwarIntegration.ts`

**Phase 2 Pattern Verdict:** N — calculators conform to OOTP formula but are disconnected from pipeline

**OOTP reference (Section 2.2 Step 8):**
OOTP calculates WAR after every game from cumulative season stats. Formula follows
fWAR model: (Batting Runs + Baserunning Runs + Fielding Runs + Positional Adj +
League Adj + Replacement Runs) / RPW for position players. WAR persists to
player_season_stats immediately after each game. It is NOT a separate on-demand
calculation — it is part of the mandatory post-game pipeline.

**Calculator inventory (3,287 lines across 5 engines):**
- `bwarCalculator.ts` (406 lines) — batting WAR, wRAA-based, park-adjusted
- `fwarCalculator.ts` (692 lines) — fielding WAR with correct positional adjustments
  (C: +3.7, SS: +2.2, CF: +0.7 ... DH: -5.2 — matches FanGraphs/OOTP methodology)
- `pwarCalculator.ts` (583 lines) — pitcher WAR, FIP-based with LI multiplier
- `rwarCalculator.ts` (597 lines) — baserunning WAR, SB/CS/advancement based
- `mwarCalculator.ts` (1,009 lines) — manager WAR, decision quality × LI

**warOrchestrator.ts — exists but never called:**
`calculateAndPersistSeasonWAR()` (153 lines) is a fully implemented orchestrator:
reads all season stats from IndexedDB, calls all 5 calculators, accumulates results,
and would write totals back to season storage. Architecture is correct — plain async
function, not a React hook, designed to run post-game. However:
`grep -rn "calculateAndPersistSeasonWAR" src` → **exactly 1 result: its own definition.**
It is never imported or called anywhere in the active app. Zero callers.

**mWAR exception — partially wired:**
`useMWARCalculations` IS imported and used in GameTracker.tsx (line 281). Manager
decisions (pitching changes, pinch hits, defensive subs) are recorded during the
game with LI context. However: mWAR final calculation and persistence to season
storage is not confirmed wired to the post-game pipeline. Decision capture ✅.
Season aggregation of mWAR: UNVERIFIED.

**Positional adjustment implementation: CORRECT.**
fwarCalculator.ts line 95 defines POSITIONAL_ADJUSTMENTS matching FanGraphs values.
Applied correctly scaled by playing time factor (lines 452, 516). The calculation
logic is sound — the problem is it never runs.

**Root cause:** `warOrchestrator.calculateAndPersistSeasonWAR()` must be called from
`processCompletedGame()` or `aggregateGameToSeason()` after each game.
Currently `processCompletedGame()` only calls `aggregateGameToSeason()` + `archiveCompletedGame()`.
The WAR orchestrator call is simply missing from the pipeline chain.

**Fix:** Add one call to `calculateAndPersistSeasonWAR()` in `processCompletedGame.ts`
after `aggregateGameToSeason()` completes. Pass seasonId, seasonGames, participantIds,
and playerPositions (all available at that point). This is a wiring change, not a
logic change — the calculator logic is correct.

**Impact of current state:** WAR values displayed in TeamHub/UI are stale or zero for
all position players, pitchers, and baserunners. mWAR similarly unverified.
All 3,287 lines of WAR calculator code produce zero output in production.

### FINDING-104
**Date:** 2026-02-18 | **Phase:** 2 | **Status:** CONFIRMED — REVISED 2026-02-18
**System:** Trait System
**Files:** `src/data/traitPools.ts`, `src/data/playerDatabase.ts`,
`src/src_figma/app/pages/LeagueBuilderPlayers.tsx`,
`src/src_figma/app/components/AwardsCeremonyFlow.tsx`,
`src/utils/offseasonStorage.ts`, `src/src_figma/hooks/useOffseasonData.ts`

**Design clarification (JK 2026-02-18):**
Traits are NOT engine effects. They are persistent player attributes — stored on the
master player record, chosen via dropdown at player creation, assigned sparingly to
generated/rookie players, and modified during the awards ceremony as rewards/penalties.
Traits may inform salary calculation and player grades. They have no dynamic in-game
engine effect on stat calculation or play resolution. The trait system's primary
function is roster identity + post-season awards ceremony.

**Phase 2 Pattern Verdict:** PARTIAL — storage pattern correct, ceremony persistence
broken, UI incomplete, catalog interface incomplete

**What exists and works:**

Player storage — WIRED.
`trait1` and `trait2` are present on the player record in `leagueBuilderStorage.ts`
(lines 124-125, 979-980), `customPlayerStorage.ts`, `unifiedPlayerStorage.ts`.
Traits persist to IndexedDB as string IDs on the master player record. ✅

Player creation form — PARTIALLY WIRED.
`LeagueBuilderPlayers.tsx` has `trait1`/`trait2` in `formData` state and saves them
to storage (lines 241-242). However: the UI renders these as free-text inputs, not
dropdowns backed by `traitPools.ts`. The `traitPools.ts` catalog is never imported
in `LeagueBuilderPlayers.tsx` — zero import sites for traitPools across the entire app.
So the player creation form accepts arbitrary strings rather than validated trait IDs. ⚠️

Awards ceremony — UI EXISTS, persistence BROKEN.
`AwardsCeremonyFlow.tsx` (2,214 lines) has:
- Trait assignment UI: specific awards grant named traits (CLUTCH → Cy Young winner,
  PINCH PERFECT → specific award winner, random trait pool → ROY ceremony)
- Trait removal UI: "Must lose one positive trait" selection when penalty applies
- Trait display: shows current traits per player
HOWEVER: `saveAwards()` saves `AwardWinner[]` to the awards history store in IndexedDB
(offseasonStorage.ts line 448) — it saves WHO won awards, not the trait changes.
No code anywhere writes the trait add/remove back to the player record in IndexedDB.
The trait assignment is UI-only — it does not persist to the player. ❌

**Two additional bugs confirmed:**

Bug A — traitPools.ts never imported anywhere.
The 701-line catalog with 60+ SMB4-accurate traits is completely disconnected from
the app. No component, hook, or utility imports it. Awards ceremony uses hardcoded
strings ("CLUTCH", "PINCH PERFECT", "RISING STAR") and a 5-item dummy array, not
the real catalog.

Bug B — Traits misused as personality proxy.
`useOffseasonData.ts` line 112-139: infers player personality by scanning trait name
strings for keywords ("clutch" → COMPETITIVE, "tough" → TOUGH). Conflates two
separate systems. Must be removed when real personality system is built.

**Chemistry type mismatch:** STILL PRESENT.
`playerDatabase.ts` defines 7 chemistry types (adds FIERY + GRITTY to SMB4's 5).
Needs a decision — keep as KBL extensions or align to SMB4's 5.

**What needs to be built (in priority order):**
1. Wire `traitPools.ts` to `LeagueBuilderPlayers.tsx` — replace free-text inputs with
   dropdowns backed by the real catalog (positive traits only, filtered by batter/pitcher)
2. Write trait changes back to player record in IndexedDB at end of awards ceremony —
   add/remove trait1/trait2 on the player when ceremony assigns/revokes a trait
3. Populate `Trait` interface with `chemistryType` field (for roster display/filtering)
   — NOT for potency calculation, since traits have no engine effect
4. Assign traits to generated/rookie players sparingly at player generation time,
   drawing from `traitPools.getWeightedTraitPool()`
5. Decide on FIERY/GRITTY chemistry types

### FINDING-105
**Date:** 2026-02-18 | **Phase:** 1 (Pattern Map) | **Status:** CONFIRMED
**System:** GameTracker / Game State (Pattern Map Row 1)
**Files:** `src/src_figma/app/pages/GameTracker.tsx`,
`src/src_figma/hooks/useGameState.ts` (4,647 lines),
`src/utils/processCompletedGame.ts` (53 lines)

**OOTP Pattern:** Atomic game event recorder; feeds stat pipeline on completion.

**Follows Pattern: PARTIAL**

**What OOTP does:**
Each game event is recorded as it occurs, fed into a single post-game pipeline that
fires atomically on completion and updates: season stats, standings, leaderboards,
WAR, milestones, narratives, player development. The pipeline is a single ordered
sequence — no partial runs.

**What KBL does — where it matches:**

Event recording: MATCHES INTENT.
useGameState.ts accumulates all game events in React state (useState) during the
game — batting stats, pitching stats, fielding events, fame events, scorer events.
State is autosaved to IndexedDB as currentGame snapshot on a local timer. This is
not per-event atomic persistence (OOTP records each event immediately), but it is
functionally equivalent for the stat pipeline purpose — all data is available at
game end.

Pipeline fires on completion: CONFIRMED.
endGame() → completeGameInternal() → processCompletedGame() → aggregateGameToSeason()
This chain fires reliably. T0-05 fix (commit 7e7b363) ensured completeGameInternal()
runs even when component unmounts before pitch count prompt resolves.

Auto-end detection: CONFIRMED.
T0-01 fix: third out in regulation triggers auto-end detection (lines 2650, 2994).
Two detection paths (direct at-bat out + inning transition) both route to endGame().

**What KBL does — where it diverges:**

Pipeline is incomplete (already logged):
processCompletedGame.ts only calls aggregateGameToSeason() + archiveCompletedGame().
Missing: standings update (Step 6), WAR (Step 8), narrative (Step 10), development
(Step 11). These were FINDING-102 and FINDING-103. Not a new finding — confirming
the same gap from the pattern lens.

Two execution paths with idempotency guards:
endGame() calls completeGameInternal() directly (T0-05 fix). There is also a
useEffect auto-trigger path (line 3956). Both are guarded by markGameAggregated()
to prevent double-aggregation (T1-08 fix). This is architectural fragility — the
same pipeline runs from two entry points, requiring idempotency guards. OOTP has
a single pipeline entry point.

No reducer — pure useState:
useGameState.ts is 4,647 lines of useState. gameState, scoreboard, playerStats,
pitcherStats, fameEvents are all independent useState slices. No useReducer. This
is not an OOTP pattern violation per se (OOTP's internal architecture is not
prescribed), but it is the primary source of the hook's complexity and the
likely root of historical state bleed-through bugs.

**Pattern verdict summary:**
| Aspect | OOTP | KBL | Match |
|--------|------|-----|-------|
| Records events during game | Per-event atomic | useState accumulation | PARTIAL |
| Pipeline fires at completion | Yes, single entry | Yes, two entries + guards | PARTIAL |
| Pipeline is complete | 12 steps | 2 of 12 steps | N |
| State architecture | Not prescribed | 4,647-line useState hook | N/A |

**New item for Phase 2 fix queue:**
- Consolidate two endGame execution paths into one. Remove idempotency guard
  complexity by eliminating the useEffect auto-trigger path (or making it the
  only path). This is a REFACTOR item, not a bug fix — defer or sequence carefully.

**Pattern Map update:** Row 1 → Follows Pattern: PARTIAL | Finding: FINDING-105

### FINDING-106
**Date:** 2026-02-18 | **Phase:** 1 (Pattern Map) | **Status:** CONFIRMED
**System:** Stats Aggregation (Pattern Map Row 2)
**Files:** `src/utils/seasonAggregator.ts` (344 lines),
`src/utils/processCompletedGame.ts` (53 lines)

**OOTP Pattern:** Synchronous post-game accumulator; updates season totals immediately
after each game completes. All stat categories update in one atomic pass.

**Follows Pattern: PARTIAL**

**What KBL does correctly:**
`aggregateGameToSeason()` fires after each game via `processCompletedGame()` →
`completeGameInternal()` → `endGame()`. It runs 5 sub-aggregators sequentially:
batting stats → pitching stats → fielding stats → fame events → milestone detection.
All writes go to IndexedDB via `getOrCreateBattingStats` / `updateBattingStats` etc.
This is the correct structural pattern: one function, called once per game, updates
all season totals atomically. ✅

**Where it diverges:**
The accumulator covers batting, pitching, fielding, fame, milestones — but not the
full OOTP post-game sequence. Missing steps confirmed in FINDING-102:
- Step 6: Standings update — not called from aggregateGameToSeason
- Step 8: WAR recalculation — not called (warOrchestrator has zero callers, F-103)
- Step 10: Narrative trigger — not called (headlineGenerator orphaned, F-094)
- Step 11: Player development update — not called (ratingsAdjustmentEngine orphaned)

One structural deviation: `DEFAULT_SEASON_ID = 'season-1'` hardcoded as fallback
(line 33). If `options.seasonId` is not passed correctly, all stats write to the
wrong season. The franchiseId/currentGame/currentSeason options are passthrough
only — they don't affect the seasonId used for batting/pitching/fielding aggregation.
This is a latent bug if any caller omits seasonId. FINDING-102 already noted the
hardcoded season/game issue in fan morale — same pattern here.

**Pattern verdict summary:**
| Aspect | OOTP | KBL | Match |
|--------|------|-----|-------|
| Fires after every game | Yes | Yes (T0-05 wired) | ✅ |
| Updates season totals atomically | Yes | Yes (sequential async) | ✅ |
| Covers all stat categories | Yes (12 steps) | 5 of 12 steps | PARTIAL |
| Default season ID fallback | N/A | 'season-1' hardcoded | ⚠️ |

**No new fix items.** All gaps already logged in FINDING-102 and FINDING-103.
Hardcoded seasonId fallback is low-risk if callers always pass seasonId (they do
via completeGameInternal) — but worth noting as fragility.

**Pattern Map update:** Row 2 → Follows Pattern: PARTIAL | Finding: FINDING-106
(Consistent with FINDING-102 verdict)

### FINDING-107
**Date:** 2026-02-18 | **Phase:** 1 (Pattern Map) | **Status:** CONFIRMED
**System:** Franchise / Season Engine (Pattern Map Row 3)
**Files:** `src/utils/franchiseStorage.ts`, `src/utils/seasonStorage.ts`,
`src/utils/gameStorage.ts`, `src/utils/scheduleStorage.ts`,
`src/types/franchise.ts`

**OOTP Pattern:** Root aggregate; all queries scoped franchiseId → seasonId → data.
The franchise is the top-level namespace. Every stat, game, and roster record is
reachable only through franchiseId → seasonId → playerId. No data exists outside
this hierarchy.

**Follows Pattern: PARTIAL**

**Where KBL matches:**
`StoredFranchiseConfig` (types/franchise.ts) has franchiseId as primary key. ✅
`scheduleStorage.ts` scopes games by franchiseId + seasonNumber via IndexedDB
index (line 113: `createIndex('franchiseId', ...)`). Multi-franchise isolation
exists at the schedule level. ✅

**Where KBL diverges — the critical gap:**

`seasonStorage.ts` has NO franchiseId column.
All `PlayerSeasonBatting`, `PlayerSeasonPitching`, `PlayerSeasonFielding` records
are keyed by `[seasonId, playerId]` only. There is no franchiseId in the index.
If a user runs two franchises, all batting/pitching/fielding stats from both
franchises write to the same IndexedDB store, keyed only by seasonId. They will
collide if both franchises use the same seasonId (e.g. 'season-1').

This is the single biggest architectural deviation from the OOTP pattern. In OOTP,
`franchiseId → seasonId` is the root namespace and nothing exists outside it. In
KBL, the stat storage layer has no franchiseId — seasonId is the only scoping key.

`gameStorage.ts` also has no franchiseId on archived game records (`seasonId?` is
optional with fallback to 'season-1'). Same isolation gap.

`offseasonStorage.ts` similarly scopes by seasonId only (confirmed 0 franchiseId
references in offseason stores).

**Current practical impact:**
KBL currently supports only one franchise per user. With a single franchise, the
missing franchiseId scoping has no effect — all data is implicitly from the one
franchise. The gap would only manifest if multi-franchise support were added. This
is a latent architectural debt, not an active bug.

**Pattern verdict summary:**
| Aspect | OOTP | KBL | Match |
|--------|------|-----|-------|
| franchiseId as root namespace | Yes | Yes (franchiseStorage) | ✅ |
| scheduleStorage scoped by franchiseId | Yes | Yes (indexed) | ✅ |
| seasonStorage scoped by franchiseId | Yes | No (seasonId only) | ❌ |
| gameStorage scoped by franchiseId | Yes | No (seasonId only) | ❌ |
| offseasonStorage scoped by franchiseId | Yes | No (seasonId only) | ❌ |

**Phase 2 disposition:** DEFER. Adding franchiseId to stat storage would require
an IndexedDB schema migration and updates to all stat read/write calls. This is
significant refactor work with zero current-user impact (single franchise). Log
as known architectural debt; do not fix in Phase 2 unless multi-franchise support
is on the roadmap.

**Pattern Map update:** Row 3 → Follows Pattern: PARTIAL | Finding: FINDING-107

### FINDING-108
**Date:** 2026-02-18 | **Phase:** 1 (Pattern Map) | **Status:** CONFIRMED
**System:** Schedule System (Pattern Map Row 6)
**Files:** `src/utils/scheduleStorage.ts`, `src/src_figma/hooks/useGameState.ts`
(completeGameInternal, lines 4043–4294)

**OOTP Pattern:** 162-game grid; game completion event fires the stat pipeline.
The schedule's "mark complete" action and the stat aggregation pipeline are coupled —
one triggers the other. The schedule is not just a list; it is the event source that
drives downstream processing.

**Follows Pattern: PARTIAL**

**Where KBL matches:**
`scheduleStorage.completeGame()` marks a scheduled game as COMPLETED with score,
timestamp, and gameLogId. This is the correct OOTP pattern: schedule records the
outcome. ✅

Both `completeGame()` (schedule) and `processCompletedGame()` (stat pipeline) are
called from the same function — `completeGameInternal()` in useGameState.ts:
- Line 4048: `await completeGame(gameState.gameId, result)` — marks schedule
- Line 4253: `await processCompletedGame(persistedState, aggregationOptions)` — runs stats

They fire in the same async chain, which is structurally correct: game ends → schedule
updated → stats aggregated, all in one operation. ✅

**Where KBL diverges:**

The two calls are sequenced but NOT coupled. In OOTP, the schedule completion event
IS the pipeline trigger — the schedule record owns the relationship. In KBL,
`completeGame()` only writes to the schedule store; it does not call or trigger
`aggregateGameToSeason`. The stat pipeline is a separate call in the same function
body, not a consequence of schedule completion.

Practical implication: if any future code path marks a game complete in the schedule
(e.g. SIM, batch processing) without also calling `processCompletedGame()`, the
stats will not update. There is no protection from this. The SIM path already does
this — `batchSimSeason()` calls `completeGame()` for SIM results but the stat
aggregation path for SIM games has been separately verified as wired (FINDING-082).
However the coupling is achieved by convention, not by architecture.

**SIM path note:**
SIM games go through `generateSyntheticGame()` + `processCompletedGame()` separately
from the live game path. Both paths eventually call `processCompletedGame()` — but
again by convention, not enforced coupling.

**Pattern verdict summary:**
| Aspect | OOTP | KBL | Match |
|--------|------|-----|-------|
| Schedule tracks game outcomes | Yes | Yes | ✅ |
| Schedule completion triggers stat pipeline | Yes (coupled) | No (sequential, not coupled) | PARTIAL |
| SIM and live paths both aggregate | Yes | Yes (by convention) | ✅ |

**Phase 2 disposition:** DEFER. The decoupled architecture works correctly today
because both calls live in the same function. True coupling (schedule completion
event triggers aggregation) would require a listener/event pattern and is a
significant refactor. Current risk is low. Document as architectural debt.

**Pattern Map update:** Row 6 → Follows Pattern: PARTIAL | Finding: FINDING-108

### FINDING-109
**Date:** 2026-02-18 | **Phase:** 1 (Pattern Map) | **Status:** CONFIRMED
**System:** Career Stats (Pattern Map Row 20)
**Files:** `src/utils/careerStorage.ts`, `src/utils/milestoneAggregator.ts`,
`src/hooks/useCareerStats.ts`

**OOTP Pattern:** Career stats = SUM of PlayerSeasonStats rows by playerId.
No separate career table. Career totals are always derived on read, never written.

**Follows Pattern: N**

**What KBL actually does:**
KBL maintains a SEPARATE career stats table (`careerStorage.ts`) with its own
IndexedDB store and its own record types (`PlayerCareerBatting`, `PlayerCareerPitching`,
`PlayerCareerFielding`). Career stats are WRITTEN incrementally after each game via
`milestoneAggregator.ts` (lines 105-132: `getOrCreateCareerBatting` → accumulate
→ `updateCareerBatting`). `useCareerStats.ts` reads from this dedicated career store
via `getAllCareerBatting()`.

**Why this matters:**
OOTP's approach (derive career on read from season rows) guarantees consistency —
career totals can never drift from season totals. KBL's separate write path means
career totals can desync from season totals if:
- `aggregateGameToSeason()` succeeds but `aggregateGameWithMilestones()` fails
  (career update in milestoneAggregator runs inside the milestone path, which is
  optional: `detectMilestones = true` by default but wrapped in its own try/catch)
- A past game is re-processed (re-aggregation guards exist in seasonAggregator
  but career store has no equivalent idempotency guard)
- Seasons are deleted or reset without clearing careerStorage

**Documented vs. actual contradiction:**
CURRENT_STATE.md Key Decision #1 states: "No separate career stats table —
career = SUM(PlayerSeasonStats) by playerId." This is WRONG. The code maintains
a separate career store. The decision as documented does not match the implementation.

**Pattern verdict summary:**
| Aspect | OOTP | KBL | Match |
|--------|------|-----|-------|
| Career derived from season rows on read | Yes | No — separate write path | ❌ |
| Career consistency guaranteed | Yes (derived) | No — can desync | ❌ |
| Career milestone detection | Via derived calc | Yes (writes career + checks thresholds) | N/A |

**Phase 2 disposition:** FIX-DECISION required from JK.
Option A: Align with OOTP pattern — remove careerStorage, derive career totals from
seasonStorage on read. Guarantees consistency. Requires rewrite of useCareerStats
and milestoneAggregator. Medium complexity.
Option B: Keep separate career store but add idempotency guards and atomic writes
to prevent desync. Lower risk, easier to implement, but keeps the architectural debt.
Decision needed before any career-related fixes proceed.

**Also fix:** Update ARCHITECTURAL_DECISIONS.md Key Decision #1 to reflect reality —
career stats use a separate incremental store, not derived from season rows.

**Pattern Map update:** Row 20 → Follows Pattern: N | Finding: FINDING-109

### FINDING-110
**Date:** 2026-02-18 | **Phase:** 1 (Pattern Map) | **Status:** CONFIRMED
**System:** WAR — mWAR (Pattern Map Row 4b)
**Files:** `src/utils/managerStorage.ts`, `src/src_figma/app/pages/GameTracker.tsx`
(lines 2185–2205), `src/src_figma/app/hooks/useMWARCalculations.ts`

**OOTP Pattern:** Manager decision tracker; persists decisions per game, aggregates
to season mWAR after each game. Manager WAR recalculates with actual win/loss
context, not defaults.

**Follows Pattern: PARTIAL**

**Where KBL matches:**
Architecture is correct. `useMWARCalculations` records decisions in-game.
`saveGameDecisions()` persists them to IndexedDB. `aggregateManagerGameToSeason()`
reads decisions, adds to season totals, recalculates mWAR with team context, saves.
The pipeline chain is structurally sound and it actually fires (unlike positional
WAR, which is orphaned). ✅

**Three bugs in the live wiring (GameTracker.tsx lines 2185–2205):**

Bug A — Hardcoded seasonId (already noted in FINDING-101/102 context):
`aggregateManagerGameToSeason()` called with `'season-1'` hardcoded.
If the active season is 'season-2', mWAR aggregates to the wrong season.
Same pattern as fan morale Bug B. FIX-CODE.

Bug B — Hardcoded teamStats defaults:
Call passes `0.5` for `teamSalaryScore` and `50` for `seasonGames`.
Comment says "actual record comes from season data" but the actual record
IS passed via `homeRecord` parsing. The salary score (0.5) and season games (50)
remain hardcoded defaults. mWAR recalculation uses these values to weight the
decision quality metric — wrong inputs produce wrong mWAR. FIX-CODE.

Bug C — homeManager only (away manager never aggregated):
`aggregateManagerGameToSeason()` is called once with `homeManagerId` and
`homeTeamId`. The away manager's decisions are never aggregated to season stats.
Away manager mWAR is always zero (or stale). FIX-CODE.

**Decisions count guard (conditional, not structural):**
`if (mwarHook.gameStats.decisions.length > 0)` — if no decisions were recorded
(e.g. game completed with no strategic events), aggregation is skipped entirely.
This means the game is not counted for that manager's season games denominator.
Low-impact but worth noting as a flaw in completeness.

**Pattern verdict summary:**
| Aspect | OOTP | KBL | Match |
|--------|------|-----|-------|
| Decisions recorded in-game | Yes | Yes | ✅ |
| Decisions persisted per game | Yes | Yes | ✅ |
| Aggregation fires post-game | Yes | Yes | ✅ |
| Correct seasonId used | Yes | No ('season-1' hardcoded) | ❌ |
| Correct context (salary, games) | Yes | No (hardcoded defaults) | ❌ |
| Both managers aggregated | Yes | No (home only) | ❌ |

**Phase 2 fix queue additions:**
- FINDING-110 Bug A: Pass actual seasonId to aggregateManagerGameToSeason (FIX-CODE)
- FINDING-110 Bug B: Pass actual salaryScore and seasonGames (FIX-CODE — needs season data lookup)
- FINDING-110 Bug C: Call aggregateManagerGameToSeason for away manager too (FIX-CODE)

**Pattern Map update:** Row 4b → Follows Pattern: PARTIAL | Finding: FINDING-110

### FINDING-111
**Date:** 2026-02-18 | **Phase:** 1 (Pattern Map) | **Status:** CONFIRMED
**System:** Fame / Milestone (Pattern Map Row 5)
**Files:** `src/utils/milestoneDetector.ts`, `src/utils/milestoneAggregator.ts`,
`src/utils/seasonAggregator.ts`

**OOTP Pattern:** Career total threshold checker; fires after every game as part of
the stat pipeline; emits narrative triggers on milestone cross.

**Follows Pattern: Y**

**How it works:**
`aggregateGameWithMilestones()` is called from `aggregateGameToSeason()` after every
game (seasonAggregator.ts line 98). It runs per-player:
1. Accumulates career batting and pitching stats (writes to careerStorage)
2. Checks season milestones against scaled thresholds (milestoneDetector.ts)
3. Checks career milestones against tier definitions (CAREER_BATTING_TIERS, etc.)
4. Fires franchise firsts tracking and leader board updates (if franchiseId provided)
5. Returns `MilestoneAggregationResult` with all triggered events

`milestoneDetector.ts` defines:
- SEASON_BATTING_THRESHOLDS and SEASON_PITCHING_THRESHOLDS — checkpoints during a season
- CAREER_BATTING_TIERS and CAREER_PITCHING_TIERS — multi-level career thresholds
- `scaleCountingThreshold()` — scales MLB career thresholds by KBL season length ratio
  (handles 128-game vs 162-game season differences correctly)

**Where it deviates slightly:**
Narrative trigger: milestone detection produces `fameEvents` in the result object
but does NOT fire a narrative/headline engine. OOTP triggers narrative on milestone
cross. KBL returns the events — the caller would need to pass them to the narrative
engine, which doesn't exist yet (FINDING-102 Step 10). This is the narrative gap,
not a milestone gap.

Idempotency: `hasMilestoneBeenAchieved()` is used to prevent re-recording the same
milestone. Correct pattern for a threshold-cross detector that runs after every game.

**Pattern verdict summary:**
| Aspect | OOTP | KBL | Match |
|--------|------|-----|-------|
| Fires after every game | Yes | Yes (via seasonAggregator) | ✅ |
| Checks career thresholds | Yes | Yes | ✅ |
| Checks season thresholds | Yes | Yes | ✅ |
| Fires narrative trigger | Yes | No (narrative engine not built) | PARTIAL |
| Idempotent (no double-record) | Yes | Yes | ✅ |

**No new fix items.** Narrative gap already logged in FINDING-102.

**Pattern Map update:** Row 5 → Follows Pattern: Y | Finding: FINDING-111
(Narrative trigger gap is FINDING-102, not a milestone system bug)

### FINDING-112
**Date:** 2026-02-18 | **Phase:** 1 (Pattern Map) | **Status:** CONFIRMED
**System:** Offseason (Pattern Map Row 7)
**Files:** `src/utils/offseasonStorage.ts`,
`src/src_figma/hooks/useOffseasonState.ts`,
`src/src_figma/app/pages/FranchiseHome.tsx`

**OOTP Pattern:** Atomic phase sequence; stats are locked at season end, then 11
offseason phases run in strict order, then next season is opened with a new
seasonId.

**Follows Pattern: PARTIAL**

**Where KBL matches:**
11-phase sequence is defined in `OFFSEASON_PHASES` and enforced by
`advanceOffseasonPhase()` — phases run in strict order, each must complete before
advancing. `handleStartNewSeason()` fires `executeSeasonTransition()` (ages players,
recalculates salaries, resets mojo), updates franchise metadata with new season
number, generates a new schedule. The overall shape matches the OOTP pattern. ✅

**Where it diverges:**

Stats are NOT locked at season end.
OOTP explicitly locks (makes read-only) the season stat tables when the offseason
begins. KBL has no stat locking mechanism. A game could theoretically be processed
after the offseason starts and write to the completed season's stats. No guard
exists in `aggregateGameToSeason()` or `processCompletedGame()` to check whether
the target season is still active.

New seasonId derivation is loose.
`handleStartNewSeason()` derives the next seasonId as `currentSeason + 1` stored
as a number in localStorage (`'kbl-current-season'`). The seasonId used in storage
(e.g. `'season-1'`) is not explicitly derived from this number in a controlled
way — there are multiple places that hardcode `'season-1'` as default. The season
transition does not atomically update all storage layers to the new seasonId.

Offseason completion → new season start is not atomic.
`isOffseasonComplete` flag (status === 'COMPLETED') does not trigger the new
season start automatically. JK must manually call `handleStartNewSeason()`.
This is a UX choice (not a bug), but creates a gap where offseason is marked
complete but the new season hasn't been initialized.

localStorage for season number:
`localStorage.setItem('kbl-current-season', ...)` is used to persist season
number across refreshes. This is outside the IndexedDB data layer (FINDING-107
pattern). In a clean architecture, season number would live entirely in
IndexedDB franchiseStorage, not split across localStorage.

**Pattern verdict summary:**
| Aspect | OOTP | KBL | Match |
|--------|------|-----|-------|
| Phases run in strict order | Yes | Yes | ✅ |
| Stats locked at offseason start | Yes | No | ❌ |
| New season opened with new seasonId | Yes | Partial (loose derivation) | PARTIAL |
| Season transition (age/salary/reset) | Yes | Yes (executeSeasonTransition) | ✅ |
| Season number in persistent storage | Yes (DB) | Split DB + localStorage | PARTIAL |

**Phase 2 fix queue additions:**
- FINDING-112a: Add stat-write guard — check season is still active before
  aggregating (low complexity, prevents edge case corruption). FIX-CODE.
- FINDING-112b: Remove localStorage season number — derive from franchiseStorage
  only. FIX-DECISION (requires confirming all read sites). 

**Pattern Map update:** Row 7 → Follows Pattern: PARTIAL | Finding: FINDING-112

### FINDING-106
**Date:** 2026-02-18 | **Phase:** 1 (Pattern Map) | **Status:** CONFIRMED
**System:** Stats Aggregation (Pattern Map Row 2)
**Files:** `src/utils/seasonAggregator.ts` (344 lines),
`src/utils/processCompletedGame.ts` (53 lines)

**OOTP Pattern:** Synchronous post-game accumulator; updates season totals immediately.

**Follows Pattern: PARTIAL**

**What OOTP does:**
After each game completion, runs a single synchronous pipeline updating: (1) batting
season totals, (2) pitching season totals, (3) fielding totals, (4) standings, (5) WAR
for all participants, (6) milestones, (7) leaderboard cache. All updates happen before
the game is marked complete. Atomic — no partial runs.

**What KBL does — confirmed working (grep-verified):**
aggregateGameToSeason() in src/utils/seasonAggregator.ts:
- aggregateBattingStats() — increments all batting stats per player in IndexedDB ✅
- aggregatePitchingStats() — increments all pitching stats per pitcher in IndexedDB ✅
- aggregateFieldingStats() — writes putouts/assists/errors per player in IndexedDB ✅
- aggregateFameEvents() — milestones + fame tier tracking ✅
- incrementSeasonGames() — season game counter ✅
- aggregateGameWithMilestones() — season + career + franchise milestone detection ✅

**What KBL is missing:**
- Standings update: ABSENT. No call to update team W/L record. Already logged as
  FINDING-102 Step 6. Confirming from pattern lens.
- WAR: ABSENT. calculateAndPersistSeasonWAR() exists and is complete (F-103) but
  never called from this pipeline. Zero callers anywhere.
- Narrative/headlines: ABSENT (F-102 Step 10)
- Development update: ABSENT. ratingsAdjustmentEngine not connected (F-102 Step 11)

**Synchronous? Confirmed:** aggregateGameToSeason() is async/await sequential — all
sub-aggregations run in order before returning. Matches OOTP's atomic requirement.
No race conditions, no partial runs.

**Pattern verdict summary:**
| Aspect | OOTP | KBL | Match |
|--------|------|-----|-------|
| Batting season totals | Yes | Yes | Y |
| Pitching season totals | Yes | Yes | Y |
| Fielding totals | Yes | Yes | Y |
| Milestones | Yes | Yes | Y |
| Standings update | Yes | No | N |
| WAR update | Yes | No | N |
| Atomic/sequential | Yes | Yes | Y |

**No new findings.** All gaps already captured in FINDING-102 and FINDING-103.
FINDING-106 is the pattern-lens confirmation of those same gaps.

**Pattern Map update:** Row 2 → Follows Pattern: PARTIAL | Finding: FINDING-106 (gaps in F-102/103)
