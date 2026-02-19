# Feature Inventory
Generated: February 8, 2026 by codebase-reverse-engineer (Mode A)
Status: AWAITING BOUNDARY CONFIRMATION

## Feature Clusters (derived from import graph analysis)

---

### Feature 1: GameTracker (Live Game Recording)
**Primary directory:** `src/src_figma/app/pages/GameTracker.tsx` + `src/src_figma/hooks/useGameState.ts`
**Estimated complexity:** EXTREMELY HIGH (~25,000+ LOC across all files)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/src_figma/app/pages/GameTracker.tsx | 3,797 | Main GameTracker page (UI orchestration) |
| src/src_figma/hooks/useGameState.ts | 3,089 | Core game state hook (THE brain) |
| src/src_figma/app/components/EnhancedInteractiveField.tsx | 4,292 | Interactive baseball field |
| src/src_figma/app/components/OutcomeButtons.tsx | — | At-bat outcome selection |
| src/src_figma/app/components/ActionSelector.tsx | — | Action menu |
| src/src_figma/app/components/LineupCard.tsx | — | Lineup display |
| src/src_figma/app/components/LineupPreview.tsx | — | Lineup preview |
| src/src_figma/app/components/MiniScoreboard.tsx | — | Mini scoreboard |
| src/src_figma/app/components/SidePanel.tsx | — | Side panel |
| src/src_figma/app/components/ModifierButtonBar.tsx | — | Modifier buttons |
| src/src_figma/app/components/UndoSystem.tsx | — | Undo/redo system |
| src/src_figma/app/components/BaserunnerDragDrop.tsx | — | Runner drag/drop |
| src/src_figma/app/components/RunnerDragDrop.tsx | — | Runner drag UI |
| src/src_figma/app/components/RunnerOutcomesDisplay.tsx | — | Runner outcomes |
| src/src_figma/app/components/RunnerOutcomeArrows.tsx | — | Runner arrows |
| src/src_figma/app/components/BatterReachedPopup.tsx | — | Batter reached popup |
| src/src_figma/app/components/ErrorTypePopup.tsx | — | Error type selection |
| src/src_figma/app/components/StarPlaySubtypePopup.tsx | — | Star play subtype |
| src/src_figma/app/components/FinalizeAdvanceFlow.tsx | 1,487 | Finalize runner advancement |
| src/src_figma/app/components/InjuryPrompt.tsx | — | Injury prompt |
| src/src_figma/app/components/FieldCanvas.tsx | — | Field canvas |
| src/src_figma/app/components/FielderIcon.tsx | — | Fielder icon |
| src/src_figma/app/components/PlayLocationOverlay.tsx | — | Play location overlay |
| src/src_figma/app/components/DragDropFieldDemo.tsx | — | Drag/drop field demo |
| src/src_figma/app/components/DragDropGameTracker.tsx | — | Drag/drop game tracker |
| src/types/game.ts | 1,560 | Game types (shared) |
| src/data/fieldZones.ts | — | Field zone coordinates |

**Integration engines (UI wrappers to base engines):**
| File | Purpose |
|------|---------|
| src/src_figma/app/engines/inheritedRunnerTracker.ts | ER/UER attribution |
| src/src_figma/app/engines/d3kTracker.ts | Dropped 3rd strike |
| src/src_figma/app/engines/saveDetector.ts | Save/hold detection |
| src/src_figma/app/engines/fameIntegration.ts | Fame system bridge |
| src/src_figma/app/engines/fanMoraleIntegration.ts | Fan morale bridge |
| src/src_figma/app/engines/mwarIntegration.ts | Manager WAR bridge |
| src/src_figma/app/engines/narrativeIntegration.ts | Narrative bridge |
| src/src_figma/app/engines/detectionIntegration.ts | Detection bridge |
| src/src_figma/app/engines/playerStateIntegration.ts | Player state bridge |
| src/src_figma/app/engines/adaptiveLearningEngine.ts | Fielding inference |
| src/src_figma/app/engines/relationshipIntegration.ts | Relationship bridge |

**App-level hooks:**
| File | Purpose |
|------|---------|
| src/src_figma/app/hooks/useFameTracking.ts | Fame tracking |
| src/src_figma/app/hooks/useFanMorale.ts | Fan morale |
| src/src_figma/app/hooks/useMWARCalculations.ts | Manager WAR |
| src/src_figma/app/hooks/useWARCalculations.ts | WAR for UI |
| src/src_figma/app/hooks/usePlayerState.ts | Mojo/fitness |
| src/src_figma/app/hooks/useRelationshipData.ts | Relationships |
| src/src_figma/app/hooks/useAgingData.ts | Aging |

**Entry points:** GameTracker page, ExhibitionGame page
**Data types:** AtBatResult, AtBatFlowState, Bases, Runner, FieldingData, FameEventType, LineupState, SubstitutionEvent
**Dependencies:** WAR Calculators, Fame System, Mojo/Fitness, Leverage, Narrative, Fan Morale, Detection Functions
**Depended on by:** PostGameSummary, Season Aggregation
**Existing spec docs:** RUNNER_ADVANCEMENT_RULES.md, SUBSTITUTION_FLOW_SPEC.md, FIELDING_SYSTEM_SPEC.md, FIELD_ZONE_INPUT_SPEC.md, INHERITED_RUNNERS_SPEC.md, PITCH_COUNT_TRACKING_SPEC.md, GAMETRACKER_DRAGDROP_SPEC.md, AUTO_CORRECTION_SYSTEM_SPEC.md
**Status:** ACTIVE (heavy recent development)

---

### Feature 2: WAR Calculation System
**Primary directory:** `src/engines/`
**Estimated complexity:** HIGH (~5,000 LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/engines/bwarCalculator.ts | — | Batting WAR |
| src/engines/pwarCalculator.ts | — | Pitching WAR |
| src/engines/fwarCalculator.ts | — | Fielding WAR |
| src/engines/rwarCalculator.ts | — | Baserunning WAR |
| src/engines/mwarCalculator.ts | — | Manager WAR |
| src/engines/index.ts | — | Unified exports |
| src/types/war.ts | — | WAR types & baselines |

**Entry points:** Exported calculator functions
**Data types:** BWARResult, PWARResult, FWARResult, RWARResult, MWARResult, TotalWARResult, LeagueContext
**Dependencies:** None (pure calculation, no UI)
**Depended on by:** GameTracker (via app hooks), League Leaders, Team Hub, Season Leaderboards
**Existing spec docs:** BWAR_CALCULATION_SPEC.md, PWAR_CALCULATION_SPEC.md, FWAR_CALCULATION_SPEC.md, RWAR_CALCULATION_SPEC.md, MWAR_CALCULATION_SPEC.md, ADAPTIVE_STANDARDS_ENGINE_SPEC.md
**Status:** STABLE (fully wired, constants verified)

---

### Feature 3: Fame & Special Events System
**Primary directory:** `src/engines/fameEngine.ts` + `src/hooks/useFameDetection.ts`
**Estimated complexity:** HIGH (~3,000 LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/engines/fameEngine.ts | — | Fame calculation logic |
| src/engines/detectionFunctions.ts | — | Event detection functions |
| src/hooks/useFameDetection.ts | 1,628 | Fame event detection hook |
| src/src_figma/app/engines/fameIntegration.ts | — | UI integration |
| src/src_figma/app/engines/detectionIntegration.ts | — | Detection integration |
| src/src_figma/app/hooks/useFameTracking.ts | — | Fame tracking hook |
| (game.ts FameEventType) | ~200 | 130+ event type definitions |

**Entry points:** useFameDetection hook, fameEngine functions
**Data types:** FameEventType (130+ types), FameEvent, PlayerGameFame, GameFameSummary
**Dependencies:** Leverage Index, Mojo/Fitness (for modifiers)
**Depended on by:** GameTracker, PostGameSummary
**Existing spec docs:** SPECIAL_EVENTS_SPEC.md, FAME_SYSTEM_TRACKING.md
**Status:** ACTIVE (detection wired, 84% spec alignment)

---

### Feature 4: Mojo, Fitness & Player State
**Primary directory:** `src/engines/mojoEngine.ts`, `src/engines/fitnessEngine.ts`
**Estimated complexity:** MEDIUM (~2,000 LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/engines/mojoEngine.ts | — | Mojo states & multipliers |
| src/engines/fitnessEngine.ts | — | Fitness states & decay |
| src/hooks/useMojoState.ts | — | Mojo state management |
| src/hooks/useFitnessState.ts | — | Fitness state management |
| src/src_figma/app/engines/playerStateIntegration.ts | — | Player state bridge |
| src/src_figma/app/hooks/usePlayerState.ts | — | Combined mojo/fitness hook |
| src/utils/mojoSystem.ts | — | Legacy mojo system |
| src/utils/playerMorale.ts | — | Morale display utilities |

**Entry points:** usePlayerState hook, engine functions
**Data types:** MojoLevel, FitnessState
**Dependencies:** None
**Depended on by:** GameTracker, Fame System, WAR (mojo/fitness modifiers)
**Existing spec docs:** MOJO_FITNESS_SYSTEM_SPEC.md
**Status:** STABLE (100% spec alignment)

---

### Feature 5: Salary System
**Primary directory:** `src/engines/salaryCalculator.ts`
**Estimated complexity:** MEDIUM (1,286 LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/engines/salaryCalculator.ts | 1,286 | Full salary calculation |

**Entry points:** Exported calculator functions
**Dependencies:** Player ratings, position data
**Depended on by:** Franchise mode, team management, trade system
**Existing spec docs:** SALARY_SYSTEM_SPEC.md
**Status:** STABLE (100% spec alignment)

---

### Feature 6: Franchise Mode
**Primary directory:** `src/src_figma/app/pages/FranchiseHome.tsx`
**Estimated complexity:** EXTREMELY HIGH (~15,000+ LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/src_figma/app/pages/FranchiseHome.tsx | 4,503 | Franchise hub (mega page) |
| src/src_figma/app/pages/FranchiseSetup.tsx | 1,442 | New franchise setup |
| src/src_figma/hooks/useFranchiseData.ts | — | Franchise data context |
| src/src_figma/app/components/TeamHubContent.tsx | — | Team hub content |
| src/src_figma/app/components/TeamRoster.tsx | — | Team roster display |
| src/src_figma/app/components/ScheduleContent.tsx | — | Schedule display |
| src/src_figma/app/components/MuseumContent.tsx | — | Museum display |
| src/src_figma/app/components/AddGameModal.tsx | — | Add game modal |
| src/src_figma/hooks/useScheduleData.ts | — | Schedule data |
| src/src_figma/hooks/useMuseumData.ts | — | Museum data |
| src/utils/scheduleStorage.ts | — | Schedule IndexedDB |
| src/utils/museumStorage.ts | — | Museum IndexedDB |
| src/utils/seasonEndProcessor.ts | — | Season end processing |
| src/utils/teamMVP.ts | — | Team MVP detection |

**Entry points:** FranchiseHome page, FranchiseSetup page
**Dependencies:** League Builder (for team/player data), Schedule, Playoff, Season Aggregation
**Depended on by:** GameTracker (provides game context), Offseason, Awards
**Existing spec docs:** FRANCHISE_MODE_SPEC.md, SCHEDULE_SYSTEM_FIGMA_SPEC.md, SEASON_SETUP_SPEC.md, SEASON_SETUP_FIGMA_SPEC.md
**Status:** ACTIVE

---

### Feature 7: League Builder
**Primary directory:** `src/src_figma/app/pages/LeagueBuilder*.tsx`
**Estimated complexity:** HIGH (~6,000 LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/src_figma/app/pages/LeagueBuilder.tsx | — | Hub page |
| src/src_figma/app/pages/LeagueBuilderLeagues.tsx | — | League management |
| src/src_figma/app/pages/LeagueBuilderTeams.tsx | — | Team management |
| src/src_figma/app/pages/LeagueBuilderPlayers.tsx | — | Player management |
| src/src_figma/app/pages/LeagueBuilderRosters.tsx | 986 | Roster management |
| src/src_figma/app/pages/LeagueBuilderDraft.tsx | — | Draft setup |
| src/src_figma/app/pages/LeagueBuilderRules.tsx | — | Rule configuration |
| src/src_figma/hooks/useLeagueBuilderData.ts | — | League builder hook |
| src/utils/leagueBuilderStorage.ts | — | IndexedDB storage |
| src/data/playerDatabase.ts | 9,914 | Full SMB4 player database |
| src/data/leagueStructure.ts | — | League/division definitions |

**Entry points:** LeagueBuilder page (7 sub-routes)
**Dependencies:** Player database, league structure
**Depended on by:** Franchise Mode, Exhibition Mode
**Existing spec docs:** LEAGUE_BUILDER_SPEC.md, LEAGUE_BUILDER_FIGMA_SPEC.md
**Status:** ACTIVE

---

### Feature 8: Offseason System
**Primary directory:** `src/src_figma/hooks/useOffseasonData.ts` + `src/src_figma/hooks/useOffseasonState.ts`
**Estimated complexity:** HIGH (~10,000+ LOC across flows)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/src_figma/hooks/useOffseasonData.ts | — | Offseason data |
| src/src_figma/hooks/useOffseasonState.ts | — | Offseason state machine |
| src/src_figma/app/components/AwardsCeremonyFlow.tsx | 2,147 | Awards ceremony |
| src/src_figma/app/components/RatingsAdjustmentFlow.tsx | 1,546 | EOS ratings |
| src/src_figma/app/components/DraftFlow.tsx | 1,713 | Draft flow |
| src/src_figma/app/components/FreeAgencyFlow.tsx | 1,439 | Free agency |
| src/src_figma/app/components/TradeFlow.tsx | 1,344 | Trade flow |
| src/src_figma/app/components/RetirementFlow.tsx | 1,030 | Retirement |
| src/src_figma/app/components/ContractionExpansionFlow.tsx | 1,356 | Contract/expand |
| src/src_figma/app/components/SpringTrainingFlow.tsx | — | Spring training |
| src/utils/offseasonStorage.ts | — | Offseason IndexedDB |
| src/utils/transactionStorage.ts | — | Transaction logging |
| src/utils/farmStorage.ts | — | Farm system storage |

**Entry points:** FranchiseHome (renders offseason flows)
**Dependencies:** Franchise Mode, League Builder, WAR, Salary, Fame
**Depended on by:** Season start (next season)
**Existing spec docs:** OFFSEASON_SYSTEM_SPEC.md, AWARDS_CEREMONY_FIGMA_SPEC.md, EOS_RATINGS_FIGMA_SPEC.md, DRAFT_FIGMA_SPEC.md, FREE_AGENCY_FIGMA_SPEC.md, TRADE_FIGMA_SPEC.md, RETIREMENT_FIGMA_SPEC.md, CONTRACTION_EXPANSION_FIGMA_SPEC.md, SEASON_END_FIGMA_SPEC.md, TRADE_SYSTEM_SPEC.md, FARM_SYSTEM_SPEC.md
**Status:** ACTIVE

---

### Feature 9: Playoff System
**Primary directory:** `src/src_figma/app/pages/WorldSeries.tsx`
**Estimated complexity:** MEDIUM (~1,500 LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/src_figma/app/pages/WorldSeries.tsx | 966 | Playoff bracket page |
| src/src_figma/hooks/usePlayoffData.ts | — | Playoff data hook |
| src/utils/playoffStorage.ts | — | Playoff IndexedDB |

**Entry points:** WorldSeries page
**Dependencies:** Franchise Mode, Schedule
**Depended on by:** Season end processing
**Existing spec docs:** PLAYOFF_SYSTEM_SPEC.md, PLAYOFFS_FIGMA_SPEC.md
**Status:** ACTIVE

---

### Feature 10: Leverage & Clutch System
**Primary directory:** `src/engines/leverageCalculator.ts`, `src/engines/clutchCalculator.ts`
**Estimated complexity:** MEDIUM (~2,000 LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/engines/leverageCalculator.ts | — | Leverage Index calculation |
| src/engines/clutchCalculator.ts | 1,035 | Clutch attribution |
| src/hooks/useClutchCalculations.ts | — | Clutch hook |

**Entry points:** Calculator functions
**Dependencies:** None (pure calculation)
**Depended on by:** GameTracker, Fame System
**Existing spec docs:** LEVERAGE_INDEX_SPEC.md, CLUTCH_ATTRIBUTION_SPEC.md
**Status:** STABLE (100% spec alignment)

---

### Feature 11: Narrative & Fan Morale
**Primary directory:** `src/engines/narrativeEngine.ts`, `src/engines/fanMoraleEngine.ts`
**Estimated complexity:** HIGH (~3,500 LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/engines/narrativeEngine.ts | 1,276 | Beat reporter story generation |
| src/engines/fanMoraleEngine.ts | 1,353 | Fan morale 0-99 scale |
| src/hooks/useNarrativeMorale.ts | — | Combined narrative + morale |
| src/hooks/useFanMorale.ts | — | Fan morale hook |
| src/src_figma/app/engines/narrativeIntegration.ts | — | Narrative bridge |
| src/src_figma/app/engines/fanMoraleIntegration.ts | — | Fan morale bridge |
| src/src_figma/app/hooks/useFanMorale.ts | — | Fan morale UI hook |

**Entry points:** Engine functions, hooks
**Dependencies:** Game results, leverage
**Depended on by:** GameTracker, PostGameSummary, Franchise Home
**Existing spec docs:** NARRATIVE_SYSTEM_SPEC.md, FAN_MORALE_SYSTEM_SPEC.md
**Status:** STABLE (100% connectivity)

---

### Feature 12: Season & Career Stats Pipeline
**Primary directory:** `src/utils/seasonAggregator.ts` + `src/utils/careerStorage.ts`
**Estimated complexity:** HIGH (~5,000 LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/utils/seasonAggregator.ts | — | Game → season aggregation |
| src/utils/seasonStorage.ts | — | Season stat IndexedDB |
| src/utils/careerStorage.ts | 1,004 | Career stat storage |
| src/utils/milestoneDetector.ts | 1,471 | Milestone threshold detection |
| src/utils/milestoneAggregator.ts | — | Milestone aggregation pipeline |
| src/utils/liveStatsCalculator.ts | — | In-memory live stats |
| src/hooks/useSeasonStats.ts | — | Season stat hook |
| src/hooks/useCareerStats.ts | — | Career stat hook |
| src/hooks/useLiveStats.ts | — | Live stats hook |
| src/hooks/useSeasonData.ts | — | Season data hook |
| src/services/fieldingStatsAggregator.ts | — | Fielding rollup |

**Entry points:** seasonAggregator (game end), milestoneDetector
**Dependencies:** Game events, player data
**Depended on by:** WAR calculations, Franchise mode, Awards
**Existing spec docs:** STAT_TRACKING_ARCHITECTURE_SPEC.md, MILESTONE_SYSTEM_SPEC.md, PITCHER_STATS_TRACKING_SPEC.md
**Status:** STABLE

---

### Feature 13: Relationship & Aging System
**Primary directory:** `src/engines/relationshipEngine.ts`, `src/engines/agingEngine.ts`
**Estimated complexity:** MEDIUM (~1,500 LOC)

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/engines/relationshipEngine.ts | — | Player relationships |
| src/engines/agingEngine.ts | — | Aging & development |
| src/engines/adaptiveLearningEngine.ts | — | Fielding inference |
| src/hooks/useRelationshipData.ts | — | Relationship hook |
| src/hooks/useAgingData.ts | — | Aging hook |
| src/utils/relationshipStorage.ts | — | Relationship IndexedDB |
| src/src_figma/app/engines/relationshipIntegration.ts | — | Relationship bridge |
| src/src_figma/app/engines/agingIntegration.ts | — | Aging bridge |
| src/src_figma/app/engines/adaptiveLearningEngine.ts | — | Fielding inference bridge |

**Entry points:** Engine functions, hooks
**Dependencies:** Player data
**Depended on by:** GameTracker, Franchise mode
**Existing spec docs:** (Ralph Framework referenced in code)
**Status:** ACTIVE (recently wired)

---

### Feature 14: Exhibition Mode
**Primary directory:** `src/src_figma/app/pages/ExhibitionGame.tsx`
**Estimated complexity:** LOW

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/src_figma/app/pages/ExhibitionGame.tsx | — | Exhibition game setup |

**Entry points:** ExhibitionGame page
**Dependencies:** League Builder (team selection), GameTracker (game play)
**Depended on by:** None
**Existing spec docs:** (Part of FRANCHISE_MODE_SPEC.md)
**Status:** ACTIVE

---

### Feature 15: Post-Game Summary
**Primary directory:** `src/src_figma/app/pages/PostGameSummary.tsx`
**Estimated complexity:** MEDIUM

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/src_figma/app/pages/PostGameSummary.tsx | — | Post-game stats display |

**Entry points:** PostGameSummary page (navigated from GameTracker)
**Dependencies:** Game data, season stats, fame events, narratives
**Depended on by:** None (terminal page)
**Existing spec docs:** (Part of master spec)
**Status:** ACTIVE

---

### Feature 16: Data Management (Backup/Export)
**Primary directory:** `src/utils/backupRestore.ts`, `src/services/dataExportService.ts`
**Estimated complexity:** LOW

**Files:**
| File | Lines | Purpose |
|------|-------|---------|
| src/utils/backupRestore.ts | — | Full IndexedDB backup/restore |
| src/services/dataExportService.ts | — | Data export |
| src/hooks/useDataIntegrity.ts | — | Data integrity verification |
| src/hooks/useGamePersistence.ts | — | Game save/restore |

**Entry points:** Backup/restore functions
**Dependencies:** All IndexedDB stores
**Depended on by:** None (user-initiated)
**Status:** STABLE

---

### Feature 17: Legacy UI Layer
**Primary directory:** `src/components/`, `src/pages/`
**Estimated complexity:** VERY HIGH (~20,000+ LOC)

**NOTE:** This is the original pre-Figma UI. Many components are still compiled and some are still imported from the Figma layer, but the Figma layer (`src/src_figma/`) is the active UI.

**Key legacy files still referenced:**
| File | Lines | Still Referenced? |
|------|-------|-------------------|
| src/components/GameTracker/index.tsx | 3,619 | Yes (via legacy routes) |
| src/components/GameTracker/AtBatFlow.tsx | 1,480 | Yes |
| src/components/GameTracker/FieldingModal.tsx | 1,043 | Yes |
| src/components/GameTracker/PlayerCard.tsx | — | Yes (12 imports) |
| src/pages/SeasonDashboard.tsx | — | Unclear |

**Status:** BEING SUPERSEDED (by src_figma)

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total features identified | 17 |
| EXTREMELY HIGH complexity | 2 (GameTracker, Franchise) |
| HIGH complexity | 6 (WAR, Fame, League Builder, Offseason, Stats Pipeline, Narrative) |
| MEDIUM complexity | 5 (Mojo/Fitness, Salary, Playoff, Leverage/Clutch, Relationship/Aging) |
| LOW complexity | 2 (Exhibition, Data Management) |
| VERY HIGH (legacy) | 1 (Legacy UI) |
| Active features | 10 |
| Stable features | 6 |
| Being superseded | 1 |

## Cross-Feature Dependency Map

```
                    ┌─────────────┐
                    │  App Home   │
                    └──────┬──────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │  League   │  │Franchise │  │Exhibition│
      │  Builder  │  │  Setup   │  │   Mode   │
      └────┬─────┘  └────┬─────┘  └────┬─────┘
           │              │              │
           └──────────────┼──────────────┘
                          ▼
                  ┌───────────────┐
                  │  Franchise    │
                  │    Home       │
                  └───┬───┬───┬──┘
          ┌───────────┤   │   ├───────────┐
          ▼           ▼   ▼   ▼           ▼
    ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │ Schedule │ │ Game   │ │Playoff │ │Offseason│
    │ Content  │ │Tracker │ │(World  │ │  Flows  │
    └──────────┘ └───┬────┘ │Series) │ └────────┘
                     │      └────────┘
                     ▼
              ┌──────────────┐
              │  PostGame    │
              │  Summary     │
              └──────────────┘

Shared Infrastructure (used by multiple features):
├── WAR Calculators (bWAR, pWAR, fWAR, rWAR, mWAR)
├── Mojo/Fitness Engines
├── Leverage/Clutch Calculators
├── Fame/Detection System
├── Narrative/Fan Morale Engines
├── Season/Career Stats Pipeline
├── Player Database
└── IndexedDB Storage Layer
```
