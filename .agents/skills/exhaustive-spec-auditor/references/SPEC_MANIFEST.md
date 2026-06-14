# Complete KBL Tracker Spec-to-Code Mapping
> **Comprehensive manifest of ALL 129 active spec documents mapped to implementing code files**
> **Purpose**: Exhaustive reference for spec audits and code verification
> **Generated**: 2026-02-06
> **Format**: 27 batches grouped by related functionality areas

---

## Summary Statistics

- **Total Active Spec Documents**: 129 (non-archived, non-subdirectory)
- **Total Mapped**: 129
- **Categories**: SPEC (37) | FIGMA_SPEC (21) | STORY (14) | REPORT (32) | REFERENCE (6) | META (19)
- **Implementation Status**: 115 implemented, 2 not implemented (GRADE_ALGORITHM, GAME_SIMULATION), 19 meta/process docs

---

## Batch 1: WAR Calculations (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| BWAR_CALCULATION_SPEC.md | SPEC | src/engines/bwarCalculator.ts | Verify bWAR formula: RC = (H + BB - CS) × (TB / (H + BB)), RPW = 10 × (seasonGames / 162) |
| | | src/src_figma/__tests__/statCalculations/bwarCalculator.test.ts (54 tests) | Test coverage: constants, edge cases, minimum thresholds |
| PWAR_CALCULATION_SPEC.md | SPEC | src/engines/pwarCalculator.ts | Verify pitcher value: RAPwin per pitch type/location |
| | | src/src_figma/__tests__/statCalculations/pwarCalculator.test.ts (67 tests) | Test: IP rounding, handedness adjustments, innings pitched floor |
| FWAR_CALCULATION_SPEC.md | SPEC | src/engines/fwarCalculator.ts | Verify fielding value: innings × DER × position factor × run weight |
| | | src/src_figma/__tests__/statCalculations/fwarCalculator.test.ts (131 tests) | Test: all 9 positions, catcher adjustments, range factor calculations |
| RWAR_CALCULATION_SPEC.md | SPEC | src/engines/rwarCalculator.ts | Verify runner value: advancement credit system |
| | | src/src_figma/__tests__/statCalculations/rwarCalculator.test.ts (61 tests) | Test: stolen base calculations, out advancement |
| MWAR_CALCULATION_SPEC.md | SPEC | src/engines/mwarCalculator.ts, src/src_figma/app/engines/mwarIntegration.ts | Verify narrative multiplier: base WAR × narrative factor (0.5-2.0) |

---

## Batch 2: GameTracker Core Rules (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| MASTER_BASEBALL_RULES_AND_LOGIC.md | SPEC | src/src_figma/hooks/useGameState.ts (2,968 lines) | Verify: all baseball rules engine, play classification, state transitions |
| RUNNER_ADVANCEMENT_RULES.md | SPEC | src/src_figma/app/components/runnerDefaults.ts | Verify: all advancement scenarios (hits, walks, errors, sacrifice flies) |
| INHERITED_RUNNERS_SPEC.md | SPEC | src/src_figma/app/engines/inheritedRunnerTracker.ts | Verify: runner state preservation on pitcher substitution |
| PITCH_COUNT_TRACKING_SPEC.md | SPEC | src/src_figma/hooks/useGameState.ts | Verify: pitch count increments, wild pitch handling, validation |
| PITCHER_STATS_TRACKING_SPEC.md | SPEC | src/src_figma/hooks/useGameState.ts | Verify: all pitcher statistics collected (IP, H, BB, K, ER, batters faced) |

---

## Batch 3: GameTracker Extended Features (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| CLUTCH_ATTRIBUTION_SPEC.md | SPEC | src/engines/clutchCalculator.ts | Verify: clutch situation detection (runners in scoring position + leverage index) |
| LEVERAGE_INDEX_SPEC.md | SPEC | src/engines/leverageCalculator.ts, src/src_figma/__tests__/statCalculations/leverageCalculator.test.ts (113 tests) | Verify: leverage formula = (runs difference + runners on base + outs) weighting |
| FIELDING_SYSTEM_SPEC.md | SPEC | src/src_figma/app/components/fielderInference.ts | Verify: fielder inference logic (position assignment, spray chart, zone mapping) |
| | | src/src_figma/app/components/EnhancedInteractiveField.tsx | Verify: field visualization, fielder placement UI, click handlers |
| GAMETRACKER_DRAGDROP_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/DragDropGameTracker.tsx | Verify: drag-drop mechanics for runner advancement |
| | | src/src_figma/app/components/BaserunnerDragDrop.tsx, src/src_figma/app/components/RunnerDragDrop.tsx | Verify: individual runner drag handlers, collision detection |
| FIELD_ZONE_INPUT_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/FieldCanvas.tsx | Verify: field coordinate system (90 foot × 90 foot bases) |
| | | src/src_figma/app/components/PlayLocationOverlay.tsx | Verify: ball location input, zone classification (infield/outfield) |

---

## Batch 4: Player Systems (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| MOJO_FITNESS_SYSTEM_SPEC.md | SPEC | src/engines/mojoEngine.ts, src/engines/fitnessEngine.ts | Verify: mojo decay (0.95× per week), fitness impact on performance |
| | | src/src_figma/app/engines/playerStateIntegration.ts | Verify: UI integration of mojo/fitness state |
| FAME_SYSTEM_TRACKING.md | SPEC | src/engines/fameEngine.ts | Verify: milestone detection (awards, records, team events) |
| | | src/src_figma/app/engines/fameIntegration.ts | Verify: fame display in UI (museum, timeline) |
| SALARY_SYSTEM_SPEC.md | SPEC | src/engines/salaryCalculator.ts | Verify: salary cap calculations, arbitration formula, free agent pricing |
| GRADE_ALGORITHM_SPEC.md | SPEC | NOT IMPLEMENTED | **Audit**: Check if grade system exists in codebase - if not, this is a gap |
| FAN_FAVORITE_SYSTEM_SPEC.md | SPEC | src/src_figma/app/engines/fanMoraleIntegration.ts (may be merged with FAN_MORALE) | Verify: fan favorite tracking (popularity, jersey sales) |

---

## Batch 5: Franchise & Offseason Systems (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| FRANCHISE_MODE_SPEC.md | SPEC | src/src_figma/app/pages/FranchiseHome.tsx (228K) | Verify: all franchise features (manage roster, view stats, plan offseason) |
| | | src/src_figma/hooks/useFranchiseData.ts, src/utils/franchiseStorage.ts | Verify: franchise data persistence, player management |
| OFFSEASON_SYSTEM_SPEC.md | SPEC | src/src_figma/hooks/useOffseasonData.ts, src/src_figma/hooks/useOffseasonState.ts | Verify: offseason phases (FA, draft, trade period) |
| | | src/utils/offseasonStorage.ts | Verify: offseason state persistence |
| TRADE_SYSTEM_SPEC.md | SPEC | src/src_figma/app/components/TradeFlow.tsx | Verify: trade negotiation, valuation algorithm, player swap |
| | | src/utils/transactionStorage.ts | Verify: trade history recording |
| NARRATIVE_SYSTEM_SPEC.md | SPEC | src/engines/narrativeEngine.ts | Verify: narrative event generation (trades, signings, injuries, milestones) |
| FARM_SYSTEM_SPEC.md | SPEC | src/utils/farmStorage.ts | Verify: minor league roster management, farm league scheduling |

---

## Batch 6: Figma UI Specs - Awards & Draft (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| AWARDS_CEREMONY_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/AwardsCeremonyFlow.tsx | Verify: awards ceremony UI layout, animation, trophy display |
| CONTRACTION_EXPANSION_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/ContractionExpansionFlow.tsx | Verify: expansion/contraction UI, team selection, player reassignment |
| DRAFT_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/DraftFlow.tsx | Verify: draft UI (board, picks, team selection order) |
| EOS_RATINGS_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/RatingsAdjustmentFlow.tsx | Verify: ratings adjustment UI (slider, preview, confirm) |
| FREE_AGENCY_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/FreeAgencyFlow.tsx | Verify: FA negotiation UI (bidding, contract terms, player interest) |

---

## Batch 7: Figma UI Specs - League & Playoffs (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| FINALIZE_ADVANCE_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/FinalizeAdvanceFlow.tsx | Verify: season advance UI (confirm, league advancement, rookie designation) |
| LEAGUE_BUILDER_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/pages/LeagueBuilder.tsx | Verify: main league builder hub, navigation |
| | | src/src_figma/app/pages/LeagueBuilderTeams.tsx, src/src_figma/app/pages/LeagueBuilderPlayers.tsx | Verify: team/player creation UI |
| | | src/src_figma/app/pages/LeagueBuilderRosters.tsx, src/src_figma/app/pages/LeagueBuilderRules.tsx | Verify: roster and rules configuration |
| PLAYOFFS_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/pages/WorldSeries.tsx | Verify: playoff bracket UI, series progression |
| RETIREMENT_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/RetirementFlow.tsx | Verify: retirement ceremony UI, Hall of Fame display |
| SCHEDULE_SYSTEM_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/ScheduleContent.tsx | Verify: schedule UI (calendar, game list, filtering) |
| | | src/src_figma/hooks/useScheduleData.ts | Verify: schedule data loading |

---

## Batch 8: Figma UI Specs - Season Management (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| SEASON_END_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/pages/FranchiseHome.tsx (offseason tab trigger) | Verify: season end flow trigger, transition to offseason |
| SEASON_SETUP_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/pages/FranchiseSetup.tsx | Verify: season setup wizard (league selection, roster assignment, game settings) |
| TRADE_FIGMA_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/TradeFlow.tsx | Verify: trade negotiation UI (player selection, package building, confirmation) |
| SUBSTITUTION_FLOW_SPEC.md | FIGMA_SPEC | src/src_figma/app/components/modals/PinchHitterModal.tsx | Verify: pinch hitter substitution modal |
| | | src/src_figma/app/components/modals/PinchRunnerModal.tsx | Verify: pinch runner substitution modal |
| | | src/src_figma/app/types/substitution.ts | Verify: substitution data types |

---

## Batch 9: System Enhancement Specs (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| ADAPTIVE_STANDARDS_ENGINE_SPEC.md | SPEC | src/engines/adaptiveLearningEngine.ts | Verify: adaptive learning algorithm (difficulty adjustment) |
| | | src/src_figma/app/engines/adaptiveLearningIntegration.ts | Verify: UI integration of adaptive features |
| AUTO_CORRECTION_SYSTEM_SPEC.md | SPEC | src/src_figma/hooks/useGameState.ts (autoCorrectResult function ~line 473) | Verify: auto-correction logic (invalid states, rule violations) |
| DYNAMIC_DESIGNATIONS_SPEC.md | SPEC | src/src_figma/app/components/FinalizeAdvanceFlow.tsx (line ~994) | Verify: rookie designation assignment |
| | | src/src_figma/app/components/ContractionExpansionFlow.tsx (line ~943) | Verify: legacy cornerstone designation |
| FAN_MORALE_SYSTEM_SPEC.md | SPEC | src/engines/fanMoraleEngine.ts | Verify: morale calculation formula (wins, losses, player performance) |
| | | src/src_figma/app/engines/fanMoraleIntegration.ts | Verify: morale UI display and impact |
| MILESTONE_SYSTEM_SPEC.md | SPEC | src/engines/fameEngine.ts | Verify: milestone detection (career hits, home runs, awards, no-hitters) |

---

## Batch 10: Data & Architecture Specs (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| SPECIAL_EVENTS_SPEC.md | SPEC | src/engines/detectionFunctions.ts | Verify: event detection functions (perfect games, no-hitters, grand slams) |
| | | src/src_figma/app/engines/detectionIntegration.ts | Verify: event notification UI |
| STADIUM_ANALYTICS_SPEC.md | SPEC | src/components/ParkFactorDisplay.tsx | Verify: stadium effect display UI |
| | | src/data/playerDatabase.ts | Verify: stadium effect data |
| STAT_TRACKING_ARCHITECTURE_SPEC.md | SPEC | src/utils/gameStorage.ts | Verify: game-by-game stat persistence |
| | | src/utils/seasonStorage.ts, src/utils/careerStorage.ts | Verify: seasonal and career stat aggregation |
| GAME_SIMULATION_SPEC.md | SPEC | NOT IMPLEMENTED | **Audit**: Confirm simulation engine absent (intentional gap) |
| KBL_XHD_TRACKER_MASTER_SPEC_v3.md | SPEC | src/src_figma/app/pages/FranchiseHome.tsx (integration point) | Verify: master spec coverage across all systems |

---

## Batch 11: User Stories - Awards & Season Operations (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| STORIES_AWARDS_CEREMONY.md | STORY | src/src_figma/app/components/AwardsCeremonyFlow.tsx | Verify: All acceptance criteria - awards presentation, trophy animation, team selection |
| STORIES_CONTRACTION_EXPANSION.md | STORY | src/src_figma/app/components/ContractionExpansionFlow.tsx | Verify: Expansion/contraction logic working, team reassignment |
| STORIES_DRAFT.md | STORY | src/src_figma/app/components/DraftFlow.tsx | Verify: Draft mechanics working, pick order, player selection |
| STORIES_FINALIZE_ADVANCE.md | STORY | src/src_figma/app/components/FinalizeAdvanceFlow.tsx | Verify: Season advance working, rookie designations applied |
| STORIES_FREE_AGENCY.md | STORY | src/src_figma/app/components/FreeAgencyFlow.tsx | Verify: FA flow working, contract negotiations, player signings |

---

## Batch 12: User Stories - Gameplay & Builder (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| STORIES_GAMETRACKER_FIXES.md | STORY | src/src_figma/app/pages/GameTracker.tsx | Verify: All reported fixes implemented and tested |
| STORIES_GAP_CLOSERS.md | STORY | src/src_figma/app/pages/GameTracker.tsx, src/src_figma/app/pages/FranchiseHome.tsx | Verify: Gap fixes working (missing features, UI issues) |
| STORIES_LEAGUE_BUILDER.md | STORY | src/src_figma/app/pages/LeagueBuilder.tsx | Verify: League builder working end-to-end |
| STORIES_PLAYOFFS.md | STORY | src/src_figma/app/pages/WorldSeries.tsx | Verify: Playoff flow working, bracket advancement |
| STORIES_RATINGS_ADJUSTMENT.md | STORY | src/src_figma/app/components/RatingsAdjustmentFlow.tsx | Verify: Ratings adjustment working, player rating changes |

---

## Batch 13: User Stories - Transactions & Data (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| STORIES_RETIREMENT.md | STORY | src/src_figma/app/components/RetirementFlow.tsx | Verify: Retirement working, player removal, HoF induction |
| STORIES_SEASON_END.md | STORY | src/src_figma/app/pages/FranchiseHome.tsx | Verify: Season end flow triggered, offseason transition |
| STORIES_TRADE.md | STORY | src/src_figma/app/components/TradeFlow.tsx | Verify: Trade working, roster updates, transaction history |
| STORIES_WIRING.md | STORY | src/src_figma/hooks/useGameState.ts, src/src_figma/hooks/useFranchiseData.ts | Verify: Data flow working across game and franchise states |
| BASEBALL_RULES_INTEGRATION.md | REFERENCE | src/src_figma/hooks/useGameState.ts, MASTER_BASEBALL_RULES_AND_LOGIC.md | Verify: All baseball rules properly integrated and tested |

---

## Batch 14: Reference Documentation (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| SMB4_GAME_REFERENCE.md | REFERENCE | All GameTracker files (src/src_figma/app/pages/GameTracker.tsx + components) | Verify: SMB4 mechanics parity (all game rules match reference) |
| grade_tracking_system.md | REFERENCE | NOT IMPLEMENTED (related: GRADE_ALGORITHM_SPEC.md) | **Audit**: Verify grade system status - is it implemented or gap? |
| smb4_traits_reference.md | REFERENCE | src/data/playerDatabase.ts, src/src_figma/app/types/player.ts | Verify: Trait tracking (all SMB4 traits implemented) |
| smb_maddux_analysis.md | REFERENCE | src/engines/narrativeEngine.ts (for event distribution) | Verify: Balance analysis - check if event distribution matches analysis |
| app_features_and_questions.md | REFERENCE | src/src_figma/app/pages/FranchiseHome.tsx | Verify: Feature coverage - all Q&A items addressed |

---

## Batch 15: Audit Reports (5 specs - verify currency)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| AUDIT_REPORT.md | REPORT | General audit findings | Check if findings are still current (compare against latest code) |
| BASEBALL_STATE_MACHINE_AUDIT.md | REPORT | State machine validation | Verify state machine implementation still valid |
| BROKEN_IMPLEMENTATION_AUDIT.md | REPORT | Known broken features | Check if issues are resolved in latest code |
| BROKEN_IMPLEMENTATION_AUDIT_v2.md | REPORT | Updated broken features list | Check if v2 fixes applied |
| BROWSER_TEST_REPORT.md | REPORT | Browser testing results | Verify test results reproducible |

---

## Batch 16: Bug Resolution Reports (5 specs - verify fixes)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| BUG_RESOLUTION_EXHIBITION.md | REPORT | Exhibition game bug fixes | Verify: src/src_figma/app/pages/ExhibitionGame.tsx - all bugs fixed |
| BUG_RESOLUTION_LEAGUE_BUILDER.md | REPORT | League builder bug fixes | Verify: src/src_figma/app/pages/LeagueBuilder.tsx - all bugs fixed |
| BUG_RESOLUTION_LOAD_FRANCHISE.md | REPORT | Franchise loading bug fixes | Verify: src/src_figma/hooks/useFranchiseData.ts - load issues fixed |
| BUG_RESOLUTION_NEW_FRANCHISE.md | REPORT | New franchise setup bug fixes | Verify: src/src_figma/app/pages/FranchiseSetup.tsx - bugs fixed |
| BUG_RESOLUTION_PLAYOFF_MODE.md | REPORT | Playoff mode bug fixes | Verify: src/src_figma/app/pages/WorldSeries.tsx - playoff bugs fixed |

---

## Batch 17: Architectural Audit Reports (5 specs)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| COHESION_REPORT.md | REPORT | Architectural cohesion analysis | Review architectural cohesion - verify tight coupling issues resolved |
| COHESION_REPORT_DRAFT.md | REPORT | Draft cohesion analysis | Review draft cohesion analysis - compare to final cohesion report |
| COMPREHENSIVE_GAP_ANALYSIS.md | REPORT | Full gap analysis | Verify gaps addressed - cross-check against current implementation |
| CORRECTED_GAP_ANALYSIS.md | REPORT | Corrected gap analysis | Verify corrected analysis - compare corrections to code |
| DRAGDROP_AUDIT_2026-01-31.md | REPORT | Drag-drop mechanism audit | Verify: src/src_figma/app/components/DragDropGameTracker.tsx - drag-drop fixes applied |

---

## Batch 18: Data & Execution Reports (5 specs)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| DUMMY_DATA_SCRUB_REPORT.md | REPORT | Dummy data removal | Verify: src/data/ - all dummy data removed |
| FIX_EXECUTION_REPORT_2026-02-05.md | REPORT | Fix execution summary | Verify: fixes listed in report - all applied to code |
| GAMETRACKER_AUDIT_REPORT.md | REPORT | GameTracker audit findings | Verify: src/src_figma/app/pages/GameTracker.tsx - audit findings addressed |
| GAMETRACKER_BUGS.md | REPORT | GameTracker bug list | Verify: src/src_figma/app/pages/GameTracker.tsx - all bugs resolved |
| GAMETRACKER_BUG_AUDIT_PLAN.md | REPORT | GameTracker audit plan | Check if plan executed - compare plan to actual bug fixes |

---

## Batch 19: GameTracker Test Reports (5 specs)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| GAMETRACKER_REDESIGN_GAP_ANALYSIS.md | REPORT | Redesign gap analysis | Verify: src/src_figma/app/pages/GameTracker.tsx - design gaps closed |
| GAMETRACKER_TEST_RESULTS_2026-01-31.md | REPORT | Test results from 2026-01-31 | Verify: src/src_figma/__tests__/ - test results reproducible |
| GAMETRACKER_TEST_RESULTS_2026-02-05.md | REPORT | Latest test results | Verify: src/src_figma/__tests__/ - latest tests passing |
| GAPS_MASTER.md | REPORT | Master gaps list | Verify gaps addressed - cross-check implementation status |
| INFERENTIAL_LOGIC_GAP_ANALYSIS.md | REPORT | Fielder inference logic gaps | Verify: src/src_figma/app/components/fielderInference.ts - logic complete |

---

## Batch 20: Traceability & System Audits (5 specs)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| LEGACY_VS_FIGMA_AUDIT.md | REPORT | Legacy vs Figma code comparison | Verify: src/ vs src_figma/ - legacy status, which is active |
| SPEC_TO_CODE_AUDIT_REPORT.md | REPORT | Spec-to-code traceability audit | Verify: traceability established between all specs and code |
| SPEC_TO_CODE_TRACEABILITY.md | REPORT | Spec-to-code traceability status | Check traceability status - is traceability documented? |
| SPEC_UI_ALIGNMENT_REPORT.md | REPORT | Spec-UI alignment audit | Verify: UI matches spec requirements (Figma specs vs implemented UI) |
| TEST_MATRIX.md | REPORT | Test coverage matrix | Verify test matrix current - compare to actual test files |

---

## Batch 21: Flow & Readiness Audits (2 specs)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| UI_FLOW_CRAWL_REPORT.md | REPORT | UI flow completeness | Verify: UI flow complete and connected (no dead ends) |
| EOS_RATINGS_READINESS.md | REPORT | EOS ratings system readiness | Verify: src/src_figma/app/components/RatingsAdjustmentFlow.tsx - readiness status |

---

## Batch 22: Meta / Process Documents A (5 specs)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| AI_OPERATING_PREFERENCES.md | META | AI collaboration preferences | Review AI preferences - ensure current preferences documented |
| BASEBALL_LOGIC_TEST_PLAN.md | META | Test plan for baseball logic | Verify test plan executed - compare to src/src_figma/__tests__/baseballLogic/ |
| CLAUDE_CODE_CONSTITUTION.md | META | Collaboration framework | Review collaboration framework - ensure guidelines followed |
| CURRENT_STATE.md | META | Project current state | Verify current state documented - is it up-to-date? |
| DRAGDROP_IMPLEMENTATION_PLAN.md | META | Drag-drop implementation plan | Verify plan executed - compare to src/src_figma/app/components/DragDropGameTracker.tsx |

---

## Batch 23: Meta / Process Documents B (5 specs)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| FEATURE_TEMPLATE.md | META | Feature specification template | Review feature template - ensure consistent use across specs |
| MASTER_SPEC_ERRATA.md | META | Master spec errata and corrections | Review errata and corrections - verify corrections applied to code |
| PIPELINE.md | META | Development pipeline | Verify pipeline current - check if pipeline matches actual workflow |
| README.md | META | Documentation index | Verify documentation complete - all specs properly indexed |
| RECONCILIATION_PLAN.md | META | Spec-code reconciliation | Verify reconciliation complete - all gaps addressed |

---

## Batch 24: Meta / Process Documents C (5 specs)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| SESSION_LOG.md | META | Session work history | Review session history - verify milestone dates and decisions |
| SESSION_LOG_SUMMARY.md | META | Session summary | Review session summary - high-level overview of work completed |
| TEAM_VISUALS.md | META | Team visual design guidelines | Review team visual guidelines - ensure UI follows guidelines |
| KBL_TRACKER_FIGMA_MAKE_PROMPT_V2.md | FIGMA_SPEC | Figma integration prompt | Review Figma prompt version - is v2 the latest? |
| KBL_TRACKER_UI_UX_PLANNING.md | FIGMA_SPEC | UI/UX planning document | Verify UI/UX planned - check against actual implementation |

---

## Batch 25: Figma/Planning Documents (3 specs)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| FIGMA_BLURB_FREE_AGENCY_EXCHANGE.md | FIGMA_SPEC | Free agency UI description | Verify: src/src_figma/app/components/FreeAgencyFlow.tsx - FA UI complete |
| FIGMA_COMPLETION_MAP.md | FIGMA_SPEC | Figma completion status | Verify Figma completion status - which Figma specs are done? |
| FIGMA_GAMETRACKER_IMPLEMENTATION_PLAN.md | FIGMA_SPEC | GameTracker Figma implementation | Verify: src/src_figma/app/pages/GameTracker.tsx - GT Figma plan executed |

---

## Batch 26: Missing Spec Docs (5 specs)

| Spec Doc | Category | Implementing Files | Audit Focus |
|----------|----------|-------------------|-------------|
| EOS_RATINGS_ADJUSTMENT_SPEC.md | SPEC | src/src_figma/app/components/RatingsAdjustmentFlow.tsx | Verify: ratings adjustment formula, position-specific adjustments |
| LEAGUE_BUILDER_SPEC.md | SPEC | src/src_figma/app/pages/LeagueBuilder.tsx, src/src_figma/app/pages/LeagueBuilderTeams.tsx | Verify: league creation rules, team limits, player allocation |
| PLAYOFF_SYSTEM_SPEC.md | SPEC | src/src_figma/app/pages/WorldSeries.tsx | Verify: playoff bracket rules, series format, seeding logic |
| SEASON_SETUP_SPEC.md | SPEC | src/src_figma/app/pages/FranchiseSetup.tsx | Verify: season initialization, roster lock, schedule generation |
| FEATURE_WISHLIST.md | META | All relevant files | Verify: which wishlisted features have been implemented |

---

## Batch 27: Missing Planning & Reference Docs (5 specs)

| Spec Doc | Category | Purpose | Audit Focus |
|----------|----------|---------|-------------|
| REQUIREMENTS.md | META | Core project requirements | Verify: requirements met in current implementation |
| RALPH_FRAMEWORK.md | META | Development framework | Review: framework guidelines followed |
| IMPLEMENTATION_PLAN.md | META | Implementation roadmap | Check: plan progress against actual implementation |
| IMPLEMENTATION_PLAN_FULL.md | META | Full implementation plan | Check: comprehensive plan coverage |
| TESTING_IMPLEMENTATION_PLAN.md | META | Testing strategy | Verify: testing plan executed, compare to actual test files |

---

## Excluded Files (Not Audited)

| File | Reason |
|------|--------|
| DECISIONS_LOG.md | Maintained by the audit skill itself |
| EXHAUSTIVE_AUDIT_PROGRESS.md | Generated by the audit skill |
| SPEC_INDEX.md | Generated during Phase 2 consolidation |

---

## Index by Category

### SPEC (Technical Specifications - 37 specs)
1. BWAR_CALCULATION_SPEC.md
2. PWAR_CALCULATION_SPEC.md
3. FWAR_CALCULATION_SPEC.md
4. RWAR_CALCULATION_SPEC.md
5. MWAR_CALCULATION_SPEC.md
6. MASTER_BASEBALL_RULES_AND_LOGIC.md
7. RUNNER_ADVANCEMENT_RULES.md
8. INHERITED_RUNNERS_SPEC.md
9. PITCH_COUNT_TRACKING_SPEC.md
10. PITCHER_STATS_TRACKING_SPEC.md
11. CLUTCH_ATTRIBUTION_SPEC.md
12. LEVERAGE_INDEX_SPEC.md
13. FIELDING_SYSTEM_SPEC.md
14. MOJO_FITNESS_SYSTEM_SPEC.md
15. FAME_SYSTEM_TRACKING.md
16. SALARY_SYSTEM_SPEC.md
17. GRADE_ALGORITHM_SPEC.md (NOT IMPLEMENTED)
18. FAN_FAVORITE_SYSTEM_SPEC.md
19. FAN_MORALE_SYSTEM_SPEC.md
20. MILESTONE_SYSTEM_SPEC.md
21. FRANCHISE_MODE_SPEC.md
22. OFFSEASON_SYSTEM_SPEC.md
23. TRADE_SYSTEM_SPEC.md
24. NARRATIVE_SYSTEM_SPEC.md
25. FARM_SYSTEM_SPEC.md
26. ADAPTIVE_STANDARDS_ENGINE_SPEC.md
27. AUTO_CORRECTION_SYSTEM_SPEC.md
28. DYNAMIC_DESIGNATIONS_SPEC.md
29. SPECIAL_EVENTS_SPEC.md
30. STADIUM_ANALYTICS_SPEC.md
31. STAT_TRACKING_ARCHITECTURE_SPEC.md
32. GAME_SIMULATION_SPEC.md (NOT IMPLEMENTED)
33. KBL_XHD_TRACKER_MASTER_SPEC_v3.md
34. EOS_RATINGS_ADJUSTMENT_SPEC.md
35. LEAGUE_BUILDER_SPEC.md
36. PLAYOFF_SYSTEM_SPEC.md
37. SEASON_SETUP_SPEC.md

### FIGMA_SPEC (UI Specification - 21 specs)
1. GAMETRACKER_DRAGDROP_SPEC.md
2. FIELD_ZONE_INPUT_SPEC.md
3. AWARDS_CEREMONY_FIGMA_SPEC.md
4. CONTRACTION_EXPANSION_FIGMA_SPEC.md
5. DRAFT_FIGMA_SPEC.md
6. EOS_RATINGS_FIGMA_SPEC.md
7. FREE_AGENCY_FIGMA_SPEC.md
8. FINALIZE_ADVANCE_FIGMA_SPEC.md
9. LEAGUE_BUILDER_FIGMA_SPEC.md
10. PLAYOFFS_FIGMA_SPEC.md
11. RETIREMENT_FIGMA_SPEC.md
12. SCHEDULE_SYSTEM_FIGMA_SPEC.md
13. SEASON_END_FIGMA_SPEC.md
14. SEASON_SETUP_FIGMA_SPEC.md
15. TRADE_FIGMA_SPEC.md
16. SUBSTITUTION_FLOW_SPEC.md
17. KBL_TRACKER_FIGMA_MAKE_PROMPT_V2.md
18. KBL_TRACKER_UI_UX_PLANNING.md
19. FIGMA_BLURB_FREE_AGENCY_EXCHANGE.md
20. FIGMA_COMPLETION_MAP.md
21. FIGMA_GAMETRACKER_IMPLEMENTATION_PLAN.md

### STORY (User Stories with Acceptance Criteria - 14 specs)
1. STORIES_AWARDS_CEREMONY.md
2. STORIES_CONTRACTION_EXPANSION.md
3. STORIES_DRAFT.md
4. STORIES_FINALIZE_ADVANCE.md
5. STORIES_FREE_AGENCY.md
6. STORIES_GAMETRACKER_FIXES.md
7. STORIES_GAP_CLOSERS.md
8. STORIES_LEAGUE_BUILDER.md
9. STORIES_PLAYOFFS.md
10. STORIES_RATINGS_ADJUSTMENT.md
11. STORIES_RETIREMENT.md
12. STORIES_SEASON_END.md
13. STORIES_TRADE.md
14. STORIES_WIRING.md

### REPORT (Audit Reports & Test Results - 32 specs)
1. AUDIT_REPORT.md
2. BASEBALL_STATE_MACHINE_AUDIT.md
3. BROKEN_IMPLEMENTATION_AUDIT.md
4. BROKEN_IMPLEMENTATION_AUDIT_v2.md
5. BROWSER_TEST_REPORT.md
6. BUG_RESOLUTION_EXHIBITION.md
7. BUG_RESOLUTION_LEAGUE_BUILDER.md
8. BUG_RESOLUTION_LOAD_FRANCHISE.md
9. BUG_RESOLUTION_NEW_FRANCHISE.md
10. BUG_RESOLUTION_PLAYOFF_MODE.md
11. COHESION_REPORT.md
12. COHESION_REPORT_DRAFT.md
13. COMPREHENSIVE_GAP_ANALYSIS.md
14. CORRECTED_GAP_ANALYSIS.md
15. DRAGDROP_AUDIT_2026-01-31.md
16. DUMMY_DATA_SCRUB_REPORT.md
17. FIX_EXECUTION_REPORT_2026-02-05.md
18. GAMETRACKER_AUDIT_REPORT.md
19. GAMETRACKER_BUGS.md
20. GAMETRACKER_BUG_AUDIT_PLAN.md
21. GAMETRACKER_REDESIGN_GAP_ANALYSIS.md
22. GAMETRACKER_TEST_RESULTS_2026-01-31.md
23. GAMETRACKER_TEST_RESULTS_2026-02-05.md
24. GAPS_MASTER.md
25. INFERENTIAL_LOGIC_GAP_ANALYSIS.md
26. LEGACY_VS_FIGMA_AUDIT.md
27. SPEC_TO_CODE_AUDIT_REPORT.md
28. SPEC_TO_CODE_TRACEABILITY.md
29. SPEC_UI_ALIGNMENT_REPORT.md
30. TEST_MATRIX.md
31. UI_FLOW_CRAWL_REPORT.md
32. EOS_RATINGS_READINESS.md

### REFERENCE (Lookup & Data Material - 6 specs)
1. BASEBALL_RULES_INTEGRATION.md
2. SMB4_GAME_REFERENCE.md
3. grade_tracking_system.md
4. smb4_traits_reference.md
5. smb_maddux_analysis.md
6. app_features_and_questions.md

### META (Project Management & Process - 19 specs)
1. AI_OPERATING_PREFERENCES.md
2. BASEBALL_LOGIC_TEST_PLAN.md
3. CLAUDE_CODE_CONSTITUTION.md
4. CURRENT_STATE.md
5. DRAGDROP_IMPLEMENTATION_PLAN.md
6. FEATURE_TEMPLATE.md
7. MASTER_SPEC_ERRATA.md
8. PIPELINE.md
9. README.md
10. RECONCILIATION_PLAN.md
11. SESSION_LOG.md
12. SESSION_LOG_SUMMARY.md
13. TEAM_VISUALS.md
14. FEATURE_WISHLIST.md
15. REQUIREMENTS.md
16. RALPH_FRAMEWORK.md
17. IMPLEMENTATION_PLAN.md
18. IMPLEMENTATION_PLAN_FULL.md
19. TESTING_IMPLEMENTATION_PLAN.md

---

## Key Audit Points

### Implementation Gaps
- **GRADE_ALGORITHM_SPEC.md**: NOT IMPLEMENTED - verify if this is intentional or a gap
- **GAME_SIMULATION_SPEC.md**: NOT IMPLEMENTED - confirmed as intentional (no AI simulator)

### High-Risk Audit Areas
1. **useGameState.ts** (2,968 lines) - Contains MASTER_BASEBALL_RULES_AND_LOGIC, PITCH_COUNT, PITCHER_STATS, AUTO_CORRECTION
   - Audit: Verify all rule edge cases, validate against SMB4_GAME_REFERENCE
2. **FranchiseHome.tsx** (228K) - Contains FRANCHISE_MODE, SEASON_END flow
   - Audit: Check for dead code, verify all franchise features working
3. **EnhancedInteractiveField.tsx** (155K) - Contains FIELDING_SYSTEM
   - Audit: Verify field interaction logic, check for memory leaks on large canvases

### Files Needing Verification
- src/engines/gradeCalculator.ts - **Should exist but may not** (GRADE_ALGORITHM_SPEC.md)
- src/engines/simulationEngine.ts - **Should NOT exist** (GAME_SIMULATION_SPEC.md - intentional)

### Test Coverage Priority
1. Baseball rules and edge cases (MASTER_BASEBALL_RULES_AND_LOGIC.md)
2. WAR calculations (BWAR through MWAR)
3. Leverage and clutch (LEVERAGE_INDEX_SPEC.md, CLUTCH_ATTRIBUTION_SPEC.md)
4. All GameTracker flows (substitution, fielding, drag-drop)

---

## How to Use This Mapping

### For Auditing a Specific Spec
1. Find spec in table above
2. Check "Implementing Files" column for relevant code files
3. Open those files and verify against spec requirements
4. Verify file paths exist with `ls`

### For Auditing by Component Area
1. Find batch number that covers your area (e.g., "Batch 2: GameTracker Core")
2. Review all specs in that batch
3. Verify related implementing files

### For Finding Dead Code
1. Search this mapping for all specs that reference a file
2. If file is referenced but not in codebase, it's dead code
3. Check git log to see when it was removed

### For Identifying Missing Implementations
1. Look for "NOT IMPLEMENTED" in Implementing Files column
2. Check if it's intentional (GAME_SIMULATION_SPEC.md) or a gap (GRADE_ALGORITHM_SPEC.md)

---

**Last Updated**: 2026-02-06
**Total Specs in Mapping**: 129 (3 excluded: DECISIONS_LOG, EXHAUSTIVE_AUDIT_PROGRESS, SPEC_INDEX)
**Mapping Completeness**: 129/129 — 2 intentionally unimplemented (GRADE_ALGORITHM, GAME_SIMULATION), 19 meta/process docs, rest have implementing code
