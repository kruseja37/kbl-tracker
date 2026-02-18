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
