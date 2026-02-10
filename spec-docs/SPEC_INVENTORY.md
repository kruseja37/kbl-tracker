# KBL Tracker Spec-Docs Complete Inventory

**Generated:** 2026-02-06  
**Total Files Cataloged:** 156  
**Last Classification Batch:** Phase 3 Complete

---

## Executive Summary

This inventory provides a complete audit and organization strategy for all 156 specification, story, audit, and reference documents in the KBL Tracker project. The documents are organized by functional category and mapped to 7 consolidation domains that will serve as authoritative sources for system design and implementation.

### Key Metrics

| Category | Count | Status |
|----------|-------|--------|
| **ACTIVE_SPEC** | 50 | Core active specs requiring consolidation |
| **FIGMA_SPEC** | 14 | UI/UX wireframe references |
| **STORY** | 20 | User story collections (13 main + 7 ralph phases) |
| **AUDIT_REPORT** | 27 | Status audits and gap analyses |
| **SESSION_META** | 7 | Operational tracking documents |
| **CLI_PROMPT** | 5 | Prompt/instruction templates |
| **REFERENCE** | 6 | Static reference materials |
| **HISTORICAL** | 8 | Archived bug resolutions |
| **META** | 19 | Framework, templates, and project config |
| **TOTAL** | **156** | 100% cataloged |

### Consolidation Strategy

Seven domain-focused consolidated templates will serve as single sources of truth:
1. **BUILD_TEMPLATE_WAR_STATS.md** - Statistical systems
2. **BUILD_TEMPLATE_GAMETRACKER.md** - In-game mechanics
3. **BUILD_TEMPLATE_PLAYER_SYSTEMS.md** - Player progression
4. **BUILD_TEMPLATE_FRANCHISE_OFFSEASON.md** - Franchise management
5. **BUILD_TEMPLATE_LEAGUE_PLAYOFFS.md** - League infrastructure
6. **BUILD_TEMPLATE_MASTER.md** - Master architecture & phases
7. **BUILD_TEMPLATE_TESTING.md** - QA strategy (or operational)

---

## Category 1: ACTIVE_SPEC Files (50 files)

Core specification documents defining system features and behavior. These are the authoritative design sources for implementation.

### Statistical Systems (5 files)
- **BWAR_CALCULATION_SPEC.md** - Batting WAR based on FanGraphs methodology
- **FWAR_CALCULATION_SPEC.md** - Fielding WAR calculation
- **MWAR_CALCULATION_SPEC.md** - Manager WAR calculation
- **PWAR_CALCULATION_SPEC.md** - Pitching WAR calculation
- **RWAR_CALCULATION_SPEC.md** - Baserunning WAR calculation

### In-Game & GameTracker (9 files)
- **AUTO_CORRECTION_SYSTEM_SPEC.md** - Auto-correct input errors and validate rules
- **CLUTCH_ATTRIBUTION_SPEC.md** - Clutch credit to play participants
- **FIELDING_SYSTEM_SPEC.md** - Fielding tracking and fWAR integration
- **FIELD_ZONE_INPUT_SPEC.md** - Touch-based zone input for batted ball
- **GAMETRACKER_DRAGDROP_SPEC.md** - Drag-and-drop interaction model
- **INHERITED_RUNNERS_SPEC.md** - Inherited runner tracking and attribution
- **PITCHER_STATS_TRACKING_SPEC.md** - Pitcher stats during games
- **PITCH_COUNT_TRACKING_SPEC.md** - Pitch count capture timing
- **SUBSTITUTION_FLOW_SPEC.md** - In-game player substitution

### Player Systems & Progression (10 files)
- **DYNAMIC_DESIGNATIONS_SPEC.md** - Player designations tracked during season
- **EOS_RATINGS_ADJUSTMENT_SPEC.md** - End of season ratings adjustment
- **FAN_FAVORITE_SYSTEM_SPEC.md** - Fan favorite and albatross system
- **FAN_MORALE_SYSTEM_SPEC.md** - Fan morale system
- **GRADE_ALGORITHM_SPEC.md** - Draft prospect grade calculation
- **LEVERAGE_INDEX_SPEC.md** - Clutch system leverage index
- **MILESTONE_SYSTEM_SPEC.md** - Milestone tracking
- **MOJO_FITNESS_SYSTEM_SPEC.md** - Mojo and fitness tracking
- **NARRATIVE_SYSTEM_SPEC.md** - Narrative system
- **grade_tracking_system.md** - Grade change tracking

### Franchise & Offseason (5 files)
- **FARM_SYSTEM_SPEC.md** - Farm system 10 player prospects
- **FRANCHISE_MODE_SPEC.md** - Multiple franchise save slots
- **OFFSEASON_SYSTEM_SPEC.md** - Comprehensive offseason processes
- **SALARY_SYSTEM_SPEC.md** - Economic roster management
- **TRADE_SYSTEM_SPEC.md** - Trade system

### League Infrastructure (4 files)
- **LEAGUE_BUILDER_SPEC.md** - League builder customization hub
- **PLAYOFF_SYSTEM_SPEC.md** - Playoff architecture and rules
- **SEASON_SETUP_SPEC.md** - Season setup flow
- **ADAPTIVE_STANDARDS_ENGINE_SPEC.md** - League baselines and replacement levels

### Special Features (4 files)
- **GAME_SIMULATION_SPEC.md** - Game skipping and simulation
- **SPECIAL_EVENTS_SPEC.md** - KBL special events
- **STADIUM_ANALYTICS_SPEC.md** - Stadium analytics and park factors
- **STAT_TRACKING_ARCHITECTURE_SPEC.md** - Stat tracking at-bat to career

### Architecture & Implementation (8 files)
- **KBL_XHD_TRACKER_MASTER_SPEC_v3.md** - Master specification
- **IMPLEMENTATION_PLAN.md** - KBL tracker implementation phases
- **IMPLEMENTATION_PLAN_FULL.md** - End-to-end UI component implementation
- **TESTING_IMPLEMENTATION_PLAN.md** - Comprehensive testing strategy
- **BASEBALL_LOGIC_TEST_PLAN.md** - Systematically test baseball logic
- **BASEBALL_RULES_INTEGRATION.md** - Rules ported from src to src_figma
- **DRAGDROP_IMPLEMENTATION_PLAN.md** - GameTracker drag drop implementation
- **GAMETRACKER_BUG_AUDIT_PLAN.md** - Systematic GT bug audit protocol

### Reference & Planning (2 files)
- **KBL_TRACKER_UI_UX_PLANNING.md** - UI/UX planning session
- **app_features_and_questions.md** - Feature questions and answers

### GameTracker Gap Closure (3 files)
- **FIGMA_GAMETRACKER_IMPLEMENTATION_PLAN.md** - Close gaps legacy vs Figma GT

---

## Category 2: FIGMA_SPEC Files (14 files)

UI/UX wireframe and design specifications for Figma implementation, organized by feature area.

### Offseason UI (7 files)
- **AWARDS_CEREMONY_FIGMA_SPEC.md** - Awards ceremony iPad design
- **CONTRACTION_EXPANSION_FIGMA_SPEC.md** - Contraction expansion iPad design
- **DRAFT_FIGMA_SPEC.md** - Draft farm first model iPad spec
- **FINALIZE_ADVANCE_FIGMA_SPEC.md** - Offseason finalize and advance UI
- **FREE_AGENCY_FIGMA_SPEC.md** - Free agency UI/UX design
- **RETIREMENT_FIGMA_SPEC.md** - Retirement system UI
- **TRADE_FIGMA_SPEC.md** - Trade phase Figma design

### Setup & Configuration (3 files)
- **LEAGUE_BUILDER_FIGMA_SPEC.md** - League builder wireframes
- **SEASON_SETUP_FIGMA_SPEC.md** - Season setup wizard design
- **SEASON_END_FIGMA_SPEC.md** - Season end processing UI

### In-Season UI (3 files)
- **EOS_RATINGS_FIGMA_SPEC.md** - EOS ratings adjustments iPad design
- **PLAYOFFS_FIGMA_SPEC.md** - Playoffs tab UI/UX design
- **SCHEDULE_SYSTEM_FIGMA_SPEC.md** - Schedule management UI

### Integration (1 file)
- **FIGMA_BLURB_FREE_AGENCY_EXCHANGE.md** - FA exchange Figma update

---

## Category 3: STORY Files (20 files)

User story collections organized by feature and implementation phase.

### Main Feature Stories (13 files)
- **STORIES_AWARDS_CEREMONY.md** - Awards ceremony stories
- **STORIES_CONTRACTION_EXPANSION.md** - Contraction/expansion stories
- **STORIES_DRAFT.md** - Draft phase stories
- **STORIES_FINALIZE_ADVANCE.md** - Finalize & advance stories
- **STORIES_FREE_AGENCY.md** - Free agency stories
- **STORIES_GAMETRACKER_FIXES.md** - GameTracker fix stories
- **STORIES_GAP_CLOSERS.md** - Gap closure stories
- **STORIES_LEAGUE_BUILDER.md** - League builder stories
- **STORIES_PLAYOFFS.md** - Playoffs stories
- **STORIES_RATINGS_ADJUSTMENT.md** - EOS ratings stories
- **STORIES_RETIREMENT.md** - Retirement stories
- **STORIES_SEASON_END.md** - Season end stories
- **STORIES_TRADE.md** - Trade stories
- **STORIES_WIRING.md** - Component wiring stories

### Ralph Phase Stories (7 files - located in /ralph subdirectory)
- **ralph/STORIES_PHASE_B.md** - Phase B core game loop
- **ralph/STORIES_PHASE_C.md** - Phase C season infrastructure
- **ralph/STORIES_PHASE_D.md** - Phase D awards and recognition
- **ralph/STORIES_PHASE_E.md** - Phase E offseason system
- **ralph/STORIES_PHASE_F.md** - Phase F advanced systems
- **ralph/STORIES_PHASE_G.md** - Phase G polish and history

---

## Category 4: AUDIT_REPORT Files (27 files)

Status audits, gap analyses, and test reports tracking implementation gaps and quality assurance.

### Gap Analysis & Audit (8 files)
- **AUDIT_REPORT.md** - Primary audit findings
- **COMPREHENSIVE_GAP_ANALYSIS.md** - Full gap analysis
- **CORRECTED_GAP_ANALYSIS.md** - Revised gap analysis
- **EXHAUSTIVE_AUDIT_FINDINGS.md** - Exhaustive findings
- **GAPS_MASTER.md** - Master gaps index
- **INFERENTIAL_LOGIC_GAP_ANALYSIS.md** - Logic gap analysis
- **LEGACY_VS_FIGMA_AUDIT.md** - Legacy vs Figma comparison
- **SPEC_TO_CODE_AUDIT_REPORT.md** - Spec-to-code alignment audit

### GameTracker-Specific Audits (5 files)
- **GAMETRACKER_AUDIT_REPORT.md** - GameTracker audit
- **GAMETRACKER_REDESIGN_GAP_ANALYSIS.md** - Redesign gap analysis
- **GAMETRACKER_TEST_RESULTS_2026-01-31.md** - Test results (Jan 31)
- **GAMETRACKER_TEST_RESULTS_2026-02-05.md** - Test results (Feb 5)
- **DRAGDROP_AUDIT_2026-01-31.md** - Drag-drop audit (Jan 31)

### Domain-Specific Audits (6 files)
- **BASEBALL_STATE_MACHINE_AUDIT.md** - State machine audit
- **BROKEN_IMPLEMENTATION_AUDIT.md** - Broken implementation (v1)
- **BROKEN_IMPLEMENTATION_AUDIT_v2.md** - Broken implementation (v2)
- **DUMMY_DATA_SCRUB_REPORT.md** - Test data cleanup
- **FIGMA_COMPLETION_MAP.md** - Figma feature completion
- **UI_FLOW_CRAWL_REPORT.md** - UI flow analysis

### Test & Fix Reports (4 files)
- **BROWSER_TEST_REPORT.md** - Browser testing results
- **FIX_EXECUTION_REPORT_2026-02-05.md** - Fix execution (Feb 5)
- **FIX_EXECUTION_REPORT_2026-02-06.md** - Fix execution (Feb 6)
- **TEST_MATRIX.md** - Test case matrix

### Quality & Alignment (3 files)
- **COHESION_REPORT.md** - Code cohesion analysis
- **COHESION_REPORT_DRAFT.md** - Cohesion analysis draft
- **SPEC_UI_ALIGNMENT_REPORT.md** - Spec-UI alignment

---

## Category 5: SESSION_META Files (7 files)

Operational tracking and session documentation for project progress monitoring.

- **CURRENT_STATE.md** - Current project state
- **DECISIONS_LOG.md** - Decision tracking log
- **EOS_RATINGS_READINESS.md** - EOS ratings feature readiness
- **EXHAUSTIVE_AUDIT_PROGRESS.md** - Audit progress tracking
- **FAME_SYSTEM_TRACKING.md** - Fame/recognition system tracking
- **SESSION_LOG.md** - Session activity log
- **SESSION_LOG_SUMMARY.md** - Session summary

---

## Category 6: CLI_PROMPT Files (5 files)

Instruction templates and prompts for CLI-based generation and analysis tasks.

- **CLI_PROMPT_BATCH_1.md** - Batch 1 analysis prompt
- **CLI_PROMPT_BATCH_2.md** - Batch 2 analysis prompt
- **CLI_PROMPT_PHASE_B.md** - Phase B analysis prompt
- **CLI_PROMPT_TRIAGE_FIX.md** - Triage and fix prompt
- **KBL_TRACKER_FIGMA_MAKE_PROMPT_V2.md** - Figma generation prompt (v2)

---

## Category 7: REFERENCE Files (6 files)

Static reference materials used across specifications for consistency and completeness.

- **MASTER_BASEBALL_RULES_AND_LOGIC.md** - Complete baseball rules reference
- **RUNNER_ADVANCEMENT_RULES.md** - Runner advancement rules
- **SMB4_GAME_REFERENCE.md** - Super Mega Baseball 4 reference
- **TEAM_VISUALS.md** - Team visual styling
- **smb4_traits_reference.md** - SMB4 traits reference (lowercase)
- **smb_maddux_analysis.md** - Analysis case study

---

## Category 8: HISTORICAL Files (8 files)

Archived bug resolution and reconciliation documents from previous work phases.

- **BUG_RESOLUTION_EXHIBITION.md** - Exhibition mode bugs
- **BUG_RESOLUTION_LEAGUE_BUILDER.md** - League builder bugs
- **BUG_RESOLUTION_LOAD_FRANCHISE.md** - Load franchise bugs
- **BUG_RESOLUTION_NEW_FRANCHISE.md** - New franchise bugs
- **BUG_RESOLUTION_PLAYOFF_MODE.md** - Playoff mode bugs
- **GAMETRACKER_BUGS.md** - GameTracker bug list
- **MASTER_SPEC_ERRATA.md** - Specification errata
- **RECONCILIATION_PLAN.md** - Reconciliation strategy

---

## Category 9: META Files (19 files)

Framework documentation, configuration, templates, and project-level organization.

### Framework & Architecture (3 files)
- **AI_OPERATING_PREFERENCES.md** - AI operating guidelines
- **CLAUDE_CODE_CONSTITUTION.md** - Code execution principles
- **RALPH_FRAMEWORK.md** - Ralph (phase-based) framework

### Project Templates & Organization (5 files)
- **FEATURE_TEMPLATE.md** - Feature specification template
- **FEATURE_WISHLIST.md** - Feature requests wishlist
- **PIPELINE.md** - Implementation pipeline
- **README.md** - Project README
- **REQUIREMENTS.md** - Project requirements

### Traceability & Index (2 files)
- **SPEC_INDEX.md** - Specification index
- **SPEC_TO_CODE_TRACEABILITY.md** - Spec-to-code traceability

### Component Documentation (5 files - located in subdirectories)
- **gametracker-enhanced/README.md** - Enhanced GameTracker documentation
- **gametracker-enhanced/OVERLAP_WITH_LEGACY.md** - Enhanced GT overlap analysis
- **gametracker-legacy/README.md** - Legacy GameTracker documentation
- **gametracker-legacy/OVERLAP_WITH_ENHANCED.md** - Legacy GT overlap analysis
- **ralph/ACCEPTANCE_CRITERIA.md** - Ralph phase acceptance criteria

### Ralph Subdirectory Metadata (3 files)
- **ralph/IMPLEMENTATION_ORDER.md** - Implementation ordering
- **ralph/PRD_UI_COMPONENTS.md** - Product requirements
- **ralph/USER_STORIES.md** - User story master
- **ralph/UI_INVENTORY.md** - UI component inventory

---

## Domain Clustering: Consolidation Mapping

This section maps all ACTIVE_SPEC, FIGMA_SPEC, and STORY files to seven consolidated domain targets.

### Domain 1: WAR & Statistics
**Target Consolidated File:** `BUILD_TEMPLATE_WAR_STATS.md`

**Purpose:** Single authoritative source for all statistical calculations and analysis systems.

**Source Files (11 total):**

**ACTIVE_SPEC (7):**
- BWAR_CALCULATION_SPEC.md
- FWAR_CALCULATION_SPEC.md
- MWAR_CALCULATION_SPEC.md
- PWAR_CALCULATION_SPEC.md
- RWAR_CALCULATION_SPEC.md
- STAT_TRACKING_ARCHITECTURE_SPEC.md
- ADAPTIVE_STANDARDS_ENGINE_SPEC.md

**Additional Sources (4):**
- STADIUM_ANALYTICS_SPEC.md (ACTIVE_SPEC)

**FIGMA_SPEC (0):** None

**STORY (0):** None

**REFERENCE Support:**
- MASTER_BASEBALL_RULES_AND_LOGIC.md
- RUNNER_ADVANCEMENT_RULES.md
- SMB4_GAME_REFERENCE.md

---

### Domain 2: GameTracker & In-Game
**Target Consolidated File:** `BUILD_TEMPLATE_GAMETRACKER.md`

**Purpose:** Complete in-game mechanics and GameTracker interaction model.

**Source Files (18 total):**

**ACTIVE_SPEC (11):**
- FIELDING_SYSTEM_SPEC.md
- FIELD_ZONE_INPUT_SPEC.md
- GAMETRACKER_DRAGDROP_SPEC.md
- INHERITED_RUNNERS_SPEC.md
- PITCHER_STATS_TRACKING_SPEC.md
- PITCH_COUNT_TRACKING_SPEC.md
- SUBSTITUTION_FLOW_SPEC.md
- AUTO_CORRECTION_SYSTEM_SPEC.md
- CLUTCH_ATTRIBUTION_SPEC.md
- LEVERAGE_INDEX_SPEC.md
- GAMETRACKER_BUG_AUDIT_PLAN.md

**Additional Sources (3):**
- DRAGDROP_IMPLEMENTATION_PLAN.md (ACTIVE_SPEC)
- FIGMA_GAMETRACKER_IMPLEMENTATION_PLAN.md (ACTIVE_SPEC)
- BASEBALL_RULES_INTEGRATION.md (ACTIVE_SPEC)

**FIGMA_SPEC (0):** None

**STORY (2):**
- STORIES_GAMETRACKER_FIXES.md
- STORIES_WIRING.md

**REFERENCE Support:**
- MASTER_BASEBALL_RULES_AND_LOGIC.md
- RUNNER_ADVANCEMENT_RULES.md

---

### Domain 3: Player Systems
**Target Consolidated File:** `BUILD_TEMPLATE_PLAYER_SYSTEMS.md`

**Purpose:** Player progression, ratings, achievements, and morale mechanics.

**Source Files (16 total):**

**ACTIVE_SPEC (10):**
- GRADE_ALGORITHM_SPEC.md
- SALARY_SYSTEM_SPEC.md
- MOJO_FITNESS_SYSTEM_SPEC.md
- MILESTONE_SYSTEM_SPEC.md
- FAN_FAVORITE_SYSTEM_SPEC.md
- FAN_MORALE_SYSTEM_SPEC.md
- DYNAMIC_DESIGNATIONS_SPEC.md
- NARRATIVE_SYSTEM_SPEC.md
- SPECIAL_EVENTS_SPEC.md
- EOS_RATINGS_ADJUSTMENT_SPEC.md
- grade_tracking_system.md

**Additional ACTIVE_SPEC (1):**
- (none additional beyond above)

**FIGMA_SPEC (2):**
- AWARDS_CEREMONY_FIGMA_SPEC.md
- EOS_RATINGS_FIGMA_SPEC.md

**STORY (3):**
- STORIES_AWARDS_CEREMONY.md
- STORIES_RATINGS_ADJUSTMENT.md

---

### Domain 4: Franchise & Offseason
**Target Consolidated File:** `BUILD_TEMPLATE_FRANCHISE_OFFSEASON.md`

**Purpose:** Franchise management, player transactions, and offseason processing.

**Source Files (25 total):**

**ACTIVE_SPEC (5):**
- FRANCHISE_MODE_SPEC.md
- OFFSEASON_SYSTEM_SPEC.md
- FARM_SYSTEM_SPEC.md
- TRADE_SYSTEM_SPEC.md
- GAME_SIMULATION_SPEC.md

**FIGMA_SPEC (7):**
- DRAFT_FIGMA_SPEC.md
- FREE_AGENCY_FIGMA_SPEC.md
- CONTRACTION_EXPANSION_FIGMA_SPEC.md
- FINALIZE_ADVANCE_FIGMA_SPEC.md
- RETIREMENT_FIGMA_SPEC.md
- TRADE_FIGMA_SPEC.md
- FIGMA_BLURB_FREE_AGENCY_EXCHANGE.md

**STORY (7):**
- STORIES_DRAFT.md
- STORIES_FREE_AGENCY.md
- STORIES_TRADE.md
- STORIES_RETIREMENT.md
- STORIES_FINALIZE_ADVANCE.md
- STORIES_CONTRACTION_EXPANSION.md
- STORIES_SEASON_END.md

---

### Domain 5: League Setup & Playoffs
**Target Consolidated File:** `BUILD_TEMPLATE_LEAGUE_PLAYOFFS.md`

**Purpose:** League creation, season setup, schedule, and playoff management.

**Source Files (10 total):**

**ACTIVE_SPEC (3):**
- LEAGUE_BUILDER_SPEC.md
- SEASON_SETUP_SPEC.md
- PLAYOFF_SYSTEM_SPEC.md

**FIGMA_SPEC (5):**
- LEAGUE_BUILDER_FIGMA_SPEC.md
- SEASON_SETUP_FIGMA_SPEC.md
- PLAYOFFS_FIGMA_SPEC.md
- SEASON_END_FIGMA_SPEC.md
- SCHEDULE_SYSTEM_FIGMA_SPEC.md

**STORY (2):**
- STORIES_LEAGUE_BUILDER.md
- STORIES_PLAYOFFS.md

---

### Domain 6: Master Spec & Architecture
**Target Consolidated File:** `BUILD_TEMPLATE_MASTER.md`

**Purpose:** Master specification, system architecture, and implementation phases.

**Source Files (9 total):**

**ACTIVE_SPEC (2):**
- KBL_XHD_TRACKER_MASTER_SPEC_v3.md
- app_features_and_questions.md

**FIGMA_SPEC (0):** None

**STORY (1):**
- STORIES_GAP_CLOSERS.md

**Ralph Phase Stories (6):**
- ralph/STORIES_PHASE_B.md
- ralph/STORIES_PHASE_C.md
- ralph/STORIES_PHASE_D.md
- ralph/STORIES_PHASE_E.md
- ralph/STORIES_PHASE_F.md
- ralph/STORIES_PHASE_G.md

---

### Domain 7: Testing & Implementation
**Target Consolidated File:** `BUILD_TEMPLATE_TESTING.md` (or keep as operational docs)

**Purpose:** QA strategy, test plans, implementation methodology, and validation approach.

**Source Files (8 total):**

**ACTIVE_SPEC (4):**
- BASEBALL_LOGIC_TEST_PLAN.md
- TESTING_IMPLEMENTATION_PLAN.md
- IMPLEMENTATION_PLAN.md
- IMPLEMENTATION_PLAN_FULL.md

**FIGMA_SPEC (0):** None

**STORY (0):** None

---

## Consolidation Recommendations

### High Priority: Consolidate Immediately

**Domain 1: WAR & Statistics**
- **Status:** Critical path for analytics
- **Action:** Consolidate into `BUILD_TEMPLATE_WAR_STATS.md`
- **Target:** Single-file reference for all calculation methodologies
- **Dependencies:** Requires REFERENCE files for rule validation

**Domain 2: GameTracker & In-Game**
- **Status:** Most fragmented domain
- **Action:** Consolidate into `BUILD_TEMPLATE_GAMETRACKER.md`
- **Target:** Unified in-game interaction and rule model
- **Dependencies:** Requires REFERENCE files, AUDIT_REPORT for gap verification

**Domain 3: Player Systems**
- **Status:** Multiple overlapping mechanics
- **Action:** Consolidate into `BUILD_TEMPLATE_PLAYER_SYSTEMS.md`
- **Target:** Player progression, ratings, and morale unified
- **Dependencies:** FIGMA_SPEC for UI consistency

**Domain 4: Franchise & Offseason**
- **Status:** Complex transaction workflows
- **Action:** Consolidate into `BUILD_TEMPLATE_FRANCHISE_OFFSEASON.md`
- **Target:** Complete offseason and transaction flow
- **Dependencies:** FIGMA_SPEC heavily used for workflow visualization

**Domain 5: League Setup & Playoffs**
- **Status:** Well-scoped features
- **Action:** Consolidate into `BUILD_TEMPLATE_LEAGUE_PLAYOFFS.md`
- **Target:** League initialization and playoff mechanics
- **Dependencies:** FIGMA_SPEC for UI reference

**Domain 6: Master Spec & Architecture**
- **Status:** Foundational reference
- **Action:** Keep `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` as-is; add ralph phases
- **Alternative:** Consolidate into `BUILD_TEMPLATE_MASTER.md` with phase integration
- **Target:** Single architecture source with implementation sequence

**Domain 7: Testing & Implementation**
- **Status:** Operational guidance
- **Action:** Keep as operational docs (no consolidation needed) OR consolidate for single test strategy reference
- **Target:** Implementation methodology and validation approach

### Medium Priority: Archive

**Historical Files (8):**
- Move to `/spec-docs/archive/` directory
- Keep for reference but mark as superseded by current audits
- Files: BUG_RESOLUTION_*, GAMETRACKER_BUGS.md, MASTER_SPEC_ERRATA.md, RECONCILIATION_PLAN.md

**Audit Reports (27):**
- Action: Create `/spec-docs/audits/` subdirectory
- Organize chronologically and by domain
- Keep active/recent audits (Feb 2026, Jan 31 onwards)
- Archive older audits (pre-January 2026)
- **Active Audits (Keep Current):**
  - FIX_EXECUTION_REPORT_2026-02-06.md
  - FIX_EXECUTION_REPORT_2026-02-05.md
  - GAMETRACKER_TEST_RESULTS_2026-02-05.md
  - GAMETRACKER_TEST_RESULTS_2026-01-31.md
  - FIGMA_COMPLETION_MAP.md
  - LEGACY_VS_FIGMA_AUDIT.md

### Low Priority: Reference & Maintain

**Reference Files (6):**
- Status: Keep in primary location
- Action: Link from consolidated domains
- No consolidation needed; serve as lookup tables

**SESSION_META (7):**
- Status: Keep current; archive historical sessions
- Action: Current session stays active, older sessions archived

**CLI_PROMPT (5):**
- Status: Keep in primary location
- Action: Reference in implementation documentation as needed

**META Files (19):**
- Status: Framework and project configuration
- Action: Maintain current structure
- No consolidation needed

---

## Proposed Directory Structure

```
/spec-docs/
├── SPEC_INVENTORY.md (this file)
├── README.md (overview and navigation)
│
├── [CONSOLIDATED DOMAINS - New]
├── BUILD_TEMPLATE_WAR_STATS.md
├── BUILD_TEMPLATE_GAMETRACKER.md
├── BUILD_TEMPLATE_PLAYER_SYSTEMS.md
├── BUILD_TEMPLATE_FRANCHISE_OFFSEASON.md
├── BUILD_TEMPLATE_LEAGUE_PLAYOFFS.md
├── BUILD_TEMPLATE_MASTER.md
├── BUILD_TEMPLATE_TESTING.md
│
├── [ACTIVE SPECS - Current]
├── (ACTIVE_SPEC files remain as-is for now)
├── (FIGMA_SPEC files remain as-is)
├── (STORY files remain as-is)
│
├── [AUDIT & SESSION - Current]
├── audits/ (NEW SUBDIRECTORY)
│   ├── active/
│   │   ├── FIX_EXECUTION_REPORT_2026-02-06.md
│   │   ├── FIGMA_COMPLETION_MAP.md
│   │   ├── GAMETRACKER_TEST_RESULTS_2026-02-05.md
│   │   └── ... (Feb 2026 audits)
│   └── archive/
│       └── (pre-Feb 2026 audits)
├── session/ (NEW SUBDIRECTORY)
│   ├── CURRENT_STATE.md
│   ├── SESSION_LOG.md
│   └── ... (active session meta)
│
├── [REFERENCE - Maintained]
├── MASTER_BASEBALL_RULES_AND_LOGIC.md
├── RUNNER_ADVANCEMENT_RULES.md
├── SMB4_GAME_REFERENCE.md
├── TEAM_VISUALS.md
├── smb4_traits_reference.md
├── smb_maddux_analysis.md
│
├── [META - Maintained]
├── framework/
│   ├── RALPH_FRAMEWORK.md
│   ├── AI_OPERATING_PREFERENCES.md
│   └── CLAUDE_CODE_CONSTITUTION.md
├── templates/
│   ├── FEATURE_TEMPLATE.md
│   └── FEATURE_WISHLIST.md
├── gametracker-enhanced/
├── gametracker-legacy/
├── ralph/
│   ├── STORIES_PHASE_*.md
│   ├── ACCEPTANCE_CRITERIA.md
│   ├── USER_STORIES.md
│   ├── UI_INVENTORY.md
│   └── ... (ralph framework docs)
│
├── [CLI & PROMPTS - Maintained]
├── cli/
│   ├── CLI_PROMPT_BATCH_1.md
│   ├── CLI_PROMPT_BATCH_2.md
│   └── ... (prompt templates)
│
└── [HISTORICAL - Archive]
└── archive/
    ├── bug-resolutions/
    │   ├── BUG_RESOLUTION_*.md
    │   └── GAMETRACKER_BUGS.md
    └── superseded/
        ├── MASTER_SPEC_ERRATA.md
        └── RECONCILIATION_PLAN.md
```

---

## Implementation Roadmap

### Phase 1: Consolidation (Week 1-2)
1. Create seven `BUILD_TEMPLATE_*.md` files
2. Merge source files into consolidated targets
3. Create cross-reference index in each template
4. Validate completeness against source files

### Phase 2: Directory Reorganization (Week 2-3)
1. Create subdirectories: `audits/`, `session/`, `cli/`, `framework/`, `templates/`, `archive/`
2. Reorganize files into new structure
3. Update all internal links and cross-references
4. Create navigation guide in README.md

### Phase 3: Archive & Cleanup (Week 3)
1. Move historical files to archive/
2. Move pre-Feb 2026 audits to archive/
3. Create archive index
4. Verify all active links still work

### Phase 4: Documentation Update (Ongoing)
1. Update main README to point to consolidated domains
2. Add "Consolidated From" sections in each BUILD_TEMPLATE_*.md
3. Create cross-reference index
4. Link SPEC_INVENTORY.md from all navigation

---

## File Status Summary by Action

| Action | Count | Files |
|--------|-------|-------|
| **Consolidate** | 64 | ACTIVE_SPEC (50) + FIGMA_SPEC (14) sources |
| **Create Targets** | 7 | BUILD_TEMPLATE_*.md files |
| **Archive** | 35 | Historical (8) + Old Audits (27) |
| **Keep Active** | 31 | Reference (6) + SESSION_META (7) + CLI_PROMPT (5) + META (19 partial) |
| **Reorganize** | 27 | Active AUDIT_REPORT files to audit/ subdirectory |
| **TOTAL** | **156** | All files classified |

---

## Success Criteria

- [ ] All 156 files cataloged and mapped
- [ ] 7 consolidated templates created and validated
- [ ] Zero broken cross-references
- [ ] Directory structure reorganized
- [ ] Navigation guide updated
- [ ] Archive indexed and accessible
- [ ] SPEC_INVENTORY.md linkable from all major documents
- [ ] Implementation path clear from consolidated sources

---

## Related Documents

- **SPEC_INDEX.md** - Original specification index (complementary to this inventory)
- **SPEC_TO_CODE_TRACEABILITY.md** - Links specs to code implementation
- **README.md** - Project overview and navigation
- **RALPH_FRAMEWORK.md** - Phase-based implementation framework
- **CURRENT_STATE.md** - Current project progress

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-06  
**Maintained By:** Claude Code  
**Next Review:** Post-consolidation implementation (Week 3)

