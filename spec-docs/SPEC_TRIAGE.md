# Existing Spec Document Triage
Generated: February 8, 2026 by codebase-reverse-engineer (Mode A)

## Summary

| Classification | Count | Description |
|---------------|-------|-------------|
| AUTHORITATIVE | 47 | Carefully written specs with constants, formulas, rules. Keep and reconcile. |
| AI-GENERATED | 18 | Claude/AI-produced audits, stories, gap analyses. Verify before trusting. |
| PROCESS | 30 | Session logs, decision logs, audit reports, bug trackers. Keep as-is. |
| ASPIRATIONAL | 14 | Figma design specs for unbuilt offseason/UI features. Move to future-work. |
| STALE | 7 | References outdated plans, nonexistent plugins, or superseded content. Archive. |
| DUPLICATE | 1 | COHESION_REPORT_DRAFT.md (superseded by COHESION_REPORT.md). |
| **Total** | **127** | |

---

## Per-Document Classification

| # | File | Lines | Classification | Notes |
|---|------|-------|---------------|-------|
| 1 | ADAPTIVE_STANDARDS_ENGINE_SPEC.md | 1292 | AUTHORITATIVE | SMB4 calibration constants, formulas. Status: IMPLEMENTED (Static v1) |
| 2 | AI_OPERATING_PREFERENCES.md | 524 | PROCESS | Session start protocol and AI context-loading instructions |
| 3 | AUDIT_REPORT.md | 457 | PROCESS | Full implementation audit (Jan 26). References Ralph Framework 103 stories |
| 4 | AUTO_CORRECTION_SYSTEM_SPEC.md | 355 | AUTHORITATIVE | GameTracker auto-correction/validation design document |
| 5 | AWARDS_CEREMONY_FIGMA_SPEC.md | 1127 | ASPIRATIONAL | Figma design spec for offseason Awards Ceremony UI |
| 6 | BASEBALL_LOGIC_TEST_PLAN.md | 336 | AI-GENERATED | Test plan generated for src/ vs src_figma/ reconciliation (Feb 2) |
| 7 | BASEBALL_RULES_INTEGRATION.md | 197 | PROCESS | Documents rules porting from AtBatFlow.tsx to useGameState.ts. Status: COMPLETE |
| 8 | BASEBALL_STATE_MACHINE_AUDIT.md | 310 | AUTHORITATIVE | Baseball state transition rules with legal outcome tables |
| 9 | BROKEN_IMPLEMENTATION_AUDIT.md | 549 | PROCESS | Audit report (Jan 31). Documents spec violations |
| 10 | BROKEN_IMPLEMENTATION_AUDIT_v2.md | 268 | PROCESS | Updated audit v2 with 6 new issues from NFL testing. Supersedes v1 |
| 11 | BROWSER_TEST_REPORT.md | 201 | PROCESS | Browser functional test report (Feb 3) via Chrome MCP |
| 12 | BUG_RESOLUTION_EXHIBITION.md | 714 | PROCESS | Bug tracking for Exhibition Mode (Feb 4) |
| 13 | BUG_RESOLUTION_LEAGUE_BUILDER.md | 75 | PROCESS | Bug tracking for League Builder (Feb 4) |
| 14 | BUG_RESOLUTION_LOAD_FRANCHISE.md | 76 | PROCESS | Bug tracking for Load Franchise (Feb 4) |
| 15 | BUG_RESOLUTION_NEW_FRANCHISE.md | 70 | PROCESS | Bug tracking for New Franchise (Feb 4) |
| 16 | BUG_RESOLUTION_PLAYOFF_MODE.md | 77 | PROCESS | Bug tracking for Playoff Mode (Feb 4) |
| 17 | BWAR_CALCULATION_SPEC.md | 796 | AUTHORITATIVE | **KEY REFERENCE** — bWAR spec with FanGraphs methodology adapted for SMB4 |
| 18 | CLAUDE_CODE_CONSTITUTION.md | 138 | STALE | References nonexistent plugins. Outdated implementation rules |
| 19 | CLUTCH_ATTRIBUTION_SPEC.md | 1231 | AUTHORITATIVE | Detailed clutch/choke attribution with LI foundation |
| 20 | COHESION_REPORT.md | 935 | PROCESS | Spec cohesion analysis (Jan 26). Claude-generated |
| 21 | COHESION_REPORT_DRAFT.md | 818 | DUPLICATE | Superseded by COHESION_REPORT.md |
| 22 | COMPLETE_TESTING_PIPELINE_GUIDE.md | 368 | AI-GENERATED | Testing pipeline orchestration guide (just installed via skill) |
| 23 | COMPREHENSIVE_GAP_ANALYSIS.md | 360 | AI-GENERATED | Legacy vs Figma gap analysis (Feb 3). Claude-generated audit |
| 24 | CONTRACTION_EXPANSION_FIGMA_SPEC.md | 977 | ASPIRATIONAL | Figma design spec for Contraction/Expansion UI |
| 25 | CORRECTED_GAP_ANALYSIS.md | 334 | AI-GENERATED | Correction to COMPREHENSIVE_GAP_ANALYSIS |
| 26 | CURRENT_STATE.md | 1710 | PROCESS | **CRITICAL** — Single source of truth for implementation status |
| 27 | DECISIONS_LOG.md | 319 | PROCESS | **CRITICAL** — Key decisions with context and rationale |
| 28 | DRAFT_FIGMA_SPEC.md | 828 | ASPIRATIONAL | Figma design spec for Draft (Farm-First Model) |
| 29 | DRAGDROP_AUDIT_2026-01-31.md | 373 | PROCESS | DragDrop spec vs implementation audit |
| 30 | DRAGDROP_IMPLEMENTATION_PLAN.md | 349 | STALE | Based on Jan 31 audit, architecture has since changed |
| 31 | DYNAMIC_DESIGNATIONS_SPEC.md | 797 | AUTHORITATIVE | Team MVP, Ace, Fan Favorite, Albatross designation tracking |
| 32 | EOS_RATINGS_ADJUSTMENT_SPEC.md | 444 | AUTHORITATIVE | End-of-season ratings adjustment v4.1 with scaling formulas |
| 33 | EOS_RATINGS_FIGMA_SPEC.md | 667 | ASPIRATIONAL | Figma design spec for EOS Ratings UI |
| 34 | EOS_RATINGS_READINESS.md | 338 | PROCESS | Scoping document for EOS Figma readiness |
| 35 | FAME_SYSTEM_TRACKING.md | 203 | PROCESS | Fame system implementation tracking. Phase 1 complete |
| 36 | FAN_FAVORITE_SYSTEM_SPEC.md | 536 | AUTHORITATIVE | Fan Favorite & Albatross system v1.1 |
| 37 | FAN_MORALE_SYSTEM_SPEC.md | 1157 | AUTHORITATIVE | Fan Morale specification v1.0 |
| 38 | FARM_SYSTEM_SPEC.md | 1627 | AUTHORITATIVE | Farm system spec v1.0 with TypeScript interfaces |
| 39 | FEATURE_TEMPLATE.md | 117 | PROCESS | Blank template for documenting new features |
| 40 | FEATURE_WISHLIST.md | 257 | PROCESS | 124 feature gaps cataloged by system |
| 41 | FIELDING_SYSTEM_SPEC.md | 1165 | AUTHORITATIVE | Complete fielding tracking with inferential logic and fWAR integration |
| 42 | FIELD_ZONE_INPUT_SPEC.md | 1160 | AUTHORITATIVE | Touch-based zone input system spec |
| 43 | FIGMA_BLURB_FREE_AGENCY_EXCHANGE.md | 82 | ASPIRATIONAL | Short Figma update for Player Exchange screen |
| 44 | FIGMA_IMPLEMENTATION_PLAN.md | 669 | STALE | Gap closure plan (Feb 2) with 8 phases. Estimates now outdated |
| 45 | FINALIZE_ADVANCE_FIGMA_SPEC.md | 915 | ASPIRATIONAL | Figma design spec for Finalize & Advance UI |
| 46 | FIX_EXECUTION_REPORT_2026-02-05.md | 234 | PROCESS | Fix execution report from Feb 5 audit |
| 47 | FRANCHISE_MODE_SPEC.md | 356 | AUTHORITATIVE | Franchise Mode architecture spec. Status: PLANNING |
| 48 | FREE_AGENCY_FIGMA_SPEC.md | 821 | ASPIRATIONAL | Figma design spec for Free Agency UI |
| 49 | FWAR_CALCULATION_SPEC.md | 851 | AUTHORITATIVE | **KEY REFERENCE** — fWAR spec with per-play run values |
| 50 | GAMETRACKER_AUDIT_REPORT.md | 444 | PROCESS | Spec-to-code audit of GameTracker (Jan 25) |
| 51 | GAMETRACKER_BUGS.md | 287 | PROCESS | Bug report from manual user testing (Jan 25) |
| 52 | GAMETRACKER_BUG_AUDIT_PLAN.md | 474 | PROCESS | Comprehensive bug audit plan (Feb 3). IN PROGRESS |
| 53 | GAMETRACKER_DRAGDROP_SPEC.md | 845 | AUTHORITATIVE | Drag-and-drop interaction model, draft v4 |
| 54 | GAMETRACKER_REDESIGN_GAP_ANALYSIS.md | 292 | AI-GENERATED | Gap analysis comparing user UX vision vs implementation |
| 55 | GAMETRACKER_TEST_RESULTS_2026-01-31.md | 193 | PROCESS | Enhanced field test results via browser MCP |
| 56 | GAME_SIMULATION_SPEC.md | 1038 | ASPIRATIONAL | Game simulation/skip architecture. Status: PLANNING |
| 57 | GAPS_MASTER.md | 1488 | AI-GENERATED | Master gaps document from multiple audit sources |
| 58 | GRADE_ALGORITHM_SPEC.md | 520 | AUTHORITATIVE | Grade algorithm from 260+ player dataset |
| 59 | IMPLEMENTATION_PLAN.md | 491 | STALE | Plan v5 (Jan 25). Superseded by later plans |
| 60 | IMPLEMENTATION_PLAN_FULL.md | 344 | STALE | Full plan (Jan 30). 331 stories. Superseded |
| 61 | INFERENTIAL_LOGIC_GAP_ANALYSIS.md | 442 | AI-GENERATED | Inference logic audit between src/ and src_figma/ |
| 62 | INHERITED_RUNNERS_SPEC.md | 708 | AUTHORITATIVE | Inherited runners tracking for ER/UER attribution |
| 63 | KBL_TRACKER_FIGMA_MAKE_PROMPT_V2.md | 654 | AUTHORITATIVE | Figma design prompt — app identity and visual direction. User-authored |
| 64 | KBL_TRACKER_UI_UX_PLANNING.md | 217 | PROCESS | UI/UX planning session notes |
| 65 | KBL_XHD_TRACKER_MASTER_SPEC_v3.md | 13946 | AUTHORITATIVE | **MASTER SPEC** — Central reference for all WAR, tracking, system specs |
| 66 | LEAGUE_BUILDER_FIGMA_SPEC.md | 775 | ASPIRATIONAL | Figma wireframe spec. Partially built |
| 67 | LEAGUE_BUILDER_SPEC.md | 894 | AUTHORITATIVE | League Builder functionality spec |
| 68 | LEGACY_VS_FIGMA_AUDIT.md | 490 | PROCESS | Legacy vs Figma audit. Reconciliation completed |
| 69 | LEVERAGE_INDEX_SPEC.md | 1057 | AUTHORITATIVE | **KEY REFERENCE** — Leverage Index per Tango methodology |
| 70 | MASTER_BASEBALL_RULES_AND_LOGIC.md | 574 | AUTHORITATIVE | Baseball rules reference for game logic |
| 71 | MASTER_SPEC_ERRATA.md | 1459 | AUTHORITATIVE | Updates/corrections to Master Spec v3 |
| 72 | MILESTONE_SYSTEM_SPEC.md | 1109 | AUTHORITATIVE | Milestone tracking across game/season/career scopes |
| 73 | MOJO_FITNESS_SYSTEM_SPEC.md | 959 | AUTHORITATIVE | Mojo and Fitness system with stat effects |
| 74 | MWAR_CALCULATION_SPEC.md | 755 | AUTHORITATIVE | Manager WAR calculation spec |
| 75 | NARRATIVE_SYSTEM_SPEC.md | 2927 | AUTHORITATIVE | Beat Reporter narrative system v1.1 |
| 76 | OFFSEASON_SYSTEM_SPEC.md | 2279 | AUTHORITATIVE | Offseason system v3. Single source of truth for offseason |
| 77 | PITCHER_STATS_TRACKING_SPEC.md | 1240 | AUTHORITATIVE | Pitcher statistics tracking spec |
| 78 | PITCH_COUNT_TRACKING_SPEC.md | 496 | AUTHORITATIVE | Pitch count capture timing/methods |
| 79 | PLAYOFFS_FIGMA_SPEC.md | 786 | ASPIRATIONAL | Figma spec for Playoffs tab (10 screens) |
| 80 | PLAYOFF_SYSTEM_SPEC.md | 744 | AUTHORITATIVE | Playoff system modes, bracket, series flow |
| 81 | PWAR_CALCULATION_SPEC.md | 806 | AUTHORITATIVE | **KEY REFERENCE** — Pitching WAR via FIP methodology |
| 82 | RALPH_FRAMEWORK.md | 313 | STALE | References nonexistent plugins. Framework no longer used |
| 83 | README.md | 127 | PROCESS | Spec-docs index and session start instructions |
| 84 | RECONCILIATION_PLAN.md | 256 | PROCESS | Legacy/Figma reconciliation. Status: COMPLETE |
| 85 | REQUIREMENTS.md | 148 | AUTHORITATIVE | Core user requirements (app scope definition) |
| 86 | RETIREMENT_FIGMA_SPEC.md | 583 | ASPIRATIONAL | Figma spec for Retirement UI |
| 87 | RUNNER_ADVANCEMENT_RULES.md | 891 | AUTHORITATIVE | Runner movement rules with SMB4 limitations |
| 88 | RWAR_CALCULATION_SPEC.md | 739 | AUTHORITATIVE | **KEY REFERENCE** — Baserunning WAR spec |
| 89 | SALARY_SYSTEM_SPEC.md | 1189 | AUTHORITATIVE | Salary system v3 with complete formulas |
| 90 | SCHEDULE_SYSTEM_FIGMA_SPEC.md | 469 | ASPIRATIONAL | Figma spec for Schedule System |
| 91 | SEASON_END_FIGMA_SPEC.md | 720 | ASPIRATIONAL | Figma spec for Season End Processing |
| 92 | SEASON_SETUP_FIGMA_SPEC.md | 770 | ASPIRATIONAL | Figma spec for Season Setup wizard |
| 93 | SEASON_SETUP_SPEC.md | 602 | AUTHORITATIVE | Season Setup wizard spec |
| 94 | SESSION_LOG.md | 8830 | PROCESS | **CRITICAL** — Running session log (latest: Feb 7) |
| 95 | SESSION_LOG_SUMMARY.md | 155 | STALE | Condensed summary. 9 days behind SESSION_LOG |
| 96 | SMB4_GAME_REFERENCE.md | 434 | AUTHORITATIVE | **KEY REFERENCE** — SMB4 game mechanics |
| 97 | SPECIAL_EVENTS_SPEC.md | 1673 | AUTHORITATIVE | KBL special events (Nut Shot, TOOTBLAN, etc.) |
| 98 | SPEC_INDEX.md | 213 | STALE | Points to old sprint plan. Superseded by README.md |
| 99 | SPEC_TO_CODE_AUDIT_REPORT.md | 1502 | PROCESS | Spec-to-code audit with match rates |
| 100 | SPEC_TO_CODE_TRACEABILITY.md | 172 | PROCESS | Traceability matrix (Jan 25) |
| 101 | STADIUM_ANALYTICS_SPEC.md | 1316 | AUTHORITATIVE | Stadium analytics and park factors |
| 102 | STAT_TRACKING_ARCHITECTURE_SPEC.md | 837 | AUTHORITATIVE | At-bat to career stat tracking architecture |
| 103 | STORIES_AWARDS_CEREMONY.md | 479 | AI-GENERATED | User stories for Awards Ceremony |
| 104 | STORIES_CONTRACTION_EXPANSION.md | 652 | AI-GENERATED | User stories for Contraction/Expansion |
| 105 | STORIES_DRAFT.md | 814 | AI-GENERATED | User stories for Draft |
| 106 | STORIES_FINALIZE_ADVANCE.md | 833 | AI-GENERATED | User stories for Finalize & Advance |
| 107 | STORIES_FREE_AGENCY.md | 1016 | AI-GENERATED | User stories for Free Agency |
| 108 | STORIES_GAMETRACKER_FIXES.md | 462 | AI-GENERATED | Fix stories from BROKEN_IMPLEMENTATION_AUDIT_v2 |
| 109 | STORIES_GAP_CLOSERS.md | 771 | AI-GENERATED | Gap closer stories from GAPS_MASTER |
| 110 | STORIES_LEAGUE_BUILDER.md | 1173 | AI-GENERATED | User stories for League Builder |
| 111 | STORIES_PLAYOFFS.md | 836 | AI-GENERATED | User stories for Playoffs |
| 112 | STORIES_RATINGS_ADJUSTMENT.md | 661 | AI-GENERATED | User stories for EOS Ratings |
| 113 | STORIES_RETIREMENT.md | 436 | AI-GENERATED | User stories for Retirement |
| 114 | STORIES_SEASON_END.md | 619 | AI-GENERATED | User stories for Season End |
| 115 | STORIES_TRADE.md | 754 | AI-GENERATED | User stories for Trade |
| 116 | STORIES_WIRING.md | 1009 | AI-GENERATED | Wiring stories for orphaned components |
| 117 | SUBSTITUTION_FLOW_SPEC.md | 745 | AUTHORITATIVE | Substitution tracking with all sub types and flows |
| 118 | TEAM_VISUALS.md | 385 | AUTHORITATIVE | Team visual reference from SMB4 screenshots |
| 119 | TESTING_IMPLEMENTATION_PLAN.md | 2583 | AI-GENERATED | Testing strategy (Claude + JK co-authored) |
| 120 | TESTING_PIPELINE_GUIDE.md | 242 | AI-GENERATED | Testing pipeline guide (just installed via skill) |
| 121 | TEST_MATRIX.md | 160 | AUTHORITATIVE | Test matrix: 8 base states x 18 result types |
| 122 | TRADE_FIGMA_SPEC.md | 658 | ASPIRATIONAL | Figma spec for Trade UI |
| 123 | TRADE_SYSTEM_SPEC.md | 1033 | AUTHORITATIVE | Trade system v1.0 |
| 124 | app_features_and_questions.md | 566 | AUTHORITATIVE | Feature Q&A with SMB Maddux analysis. User-driven |
| 125 | grade_tracking_system.md | 305 | AUTHORITATIVE | Grade change tracking for SMB4 |
| 126 | smb4_traits_reference.md | 258 | AUTHORITATIVE | SMB4 traits reference with tier bonuses |
| 127 | smb_maddux_analysis.md | 198 | AUTHORITATIVE | Raw SMB4 pitch count data analysis |

---

## Stale Files (candidates for archive)

| File | Reason |
|------|--------|
| CLAUDE_CODE_CONSTITUTION.md | References nonexistent plugins |
| RALPH_FRAMEWORK.md | References nonexistent plugins, framework no longer used |
| IMPLEMENTATION_PLAN.md | v5 from Jan 25, superseded by later plans |
| IMPLEMENTATION_PLAN_FULL.md | Jan 30, superseded |
| DRAGDROP_IMPLEMENTATION_PLAN.md | Based on Jan 31 audit, architecture changed |
| SESSION_LOG_SUMMARY.md | 9 days stale vs SESSION_LOG |
| SPEC_INDEX.md | Points to old sprint plan, superseded by README.md |

## Duplicate Files

| File | Superseded By |
|------|---------------|
| COHESION_REPORT_DRAFT.md | COHESION_REPORT.md |

## Key Reference Documents (read these first)

1. **KBL_XHD_TRACKER_MASTER_SPEC_v3.md** (13,946 lines) — The master spec
2. **BWAR_CALCULATION_SPEC.md** — Batting WAR
3. **PWAR_CALCULATION_SPEC.md** — Pitching WAR
4. **FWAR_CALCULATION_SPEC.md** — Fielding WAR
5. **RWAR_CALCULATION_SPEC.md** — Baserunning WAR
6. **LEVERAGE_INDEX_SPEC.md** — Leverage Index
7. **SMB4_GAME_REFERENCE.md** — SMB4 mechanics
8. **ADAPTIVE_STANDARDS_ENGINE_SPEC.md** — SMB4 calibration baselines
