# Phase B Tier Definitions

Total: ~131 buildable items across 4 tiers (after excluding 5 SKIPs and 7 DUPLICATEs from AUTHORITY.md).
Execute tiers in order — each tier depends on the previous.

## How to Find Items

All item data lives in `spec-docs/TRIAGE_DECISIONS.md`. Each item is formatted as:

```
### ITEM-ID
- Severity: CRITICAL/MAJOR/MINOR
- Batch: N
- Spec: SPEC_FILE.md §Section
- Code Location: file.ts:lines
- Spec Says: [what to build]
- Code Says: [current state]
- Recommended Fix: [how to build it]
- My Triage: FEATURE BUILD / FIX CODE / NEEDS YOUR CALL / etc.
- Triage Reason: [why]
- Your Decision: BUILD / SKIP / etc.
- Status: APPROVED (Phase B) / DONE (Phase A) / DUPLICATE / etc.
```

**To find items for a tier:**
1. Search TRIAGE_DECISIONS.md for items in the listed batch numbers
2. Include items where EITHER:
   - `My Triage: FEATURE BUILD` (the majority), OR
   - `My Triage: NEEDS YOUR CALL` with `Your Decision: BUILD` (15 additional items — see AUTHORITY.md §User-Decided BUILD Items)
3. EXCLUDE items where `My Triage` is: FIX CODE (→ batch-fix-protocol), DOC ONLY, UPDATE SPEC, DEFER
4. Check AUTHORITY.md for SKIP list (5 items) and DUPLICATE list (7 items)
5. Read "Spec Says:" for WHAT to build
6. Read "Recommended Fix:" for HOW to build it
7. Read "Spec:" for which spec file to reference

**IMPORTANT:** Some items triaged as "NEEDS YOUR CALL" were later approved by the user as BUILD. These have `Your Decision: BUILD` and `Status: APPROVED (Phase B)`. The filter MUST check BOTH triage fields, not just "My Triage".

---

## Tier 1: Foundation (Build First)

These are dependencies for Tiers 2-4.

### 1.1 Grade, Salary & Adaptive
gradeEngine.ts needed by prospect generation, salary calculations, player ratings.

**Batches to process:** Batch 4 (all APPROVED items — mostly FEATURE BUILD, plus MAJ-B4-004 NEEDS YOUR CALL with BUILD)
**Key specs:** SALARY_SYSTEM_SPEC.md, GRADE_ALGORITHM_SPEC.md, grade_tracking_system.md, ADAPTIVE_STANDARDS_ENGINE_SPEC.md, MOJO_FITNESS_SYSTEM_SPEC.md, FAN_FAVORITE_SYSTEM_SPEC.md
**Topics:** Mojo splits, grade algorithm, salary formula, two-way player grading, prospect generation ratings, fan favorite system
**Note:** ALL Batch 4 build items belong here (none reference League Builder). Includes ~26 items.

### 1.2 Franchise Mode Infrastructure
Database architecture and persistence needed by all franchise-mode operations.

**Batches to process:** Batch 5 (GAP-B5-001 through GAP-B5-008, plus MAJ-B5-014 NEEDS YOUR CALL with BUILD)
**Key specs:** FRANCHISE_MODE_SPEC.md, OFFSEASON_SYSTEM_SPEC.md
**Topics:** FranchiseManager API, franchise storage, data persistence, season data, team history
**Note:** ~9 items total.

### 1.3 Stats, Milestones & Adaptive Standards
Stat calibration, milestone detection, adaptive standards needed by season flows.

**Batches to process:** Batch 1 (FEATURE BUILD items + MIN-B1-006, MIN-B1-007 NEEDS YOUR CALL with BUILD), Batch 9 (MAJ-B9-005 FEATURE BUILD + MAJ-B9-001 NEEDS YOUR CALL with BUILD)
**Key specs:** STAT_TRACKING_ARCHITECTURE_SPEC.md, STADIUM_ANALYTICS_SPEC.md, ADAPTIVE_STANDARDS_ENGINE_SPEC.md, MILESTONE_SYSTEM_SPEC.md, FAN_MORALE_SYSTEM_SPEC.md, RWAR_CALCULATION_SPEC.md, MWAR_CALCULATION_SPEC.md
**Topics:** Calibration data pipeline, park factors, adaptive thresholds, milestone detection, fan morale thresholds, fame values, rWAR/mWAR calc
**DUPLICATE CHECK:** MAJ-B1-002→GAP-B1-002, MAJ-B1-003→GAP-B1-004 (skip duplicates)
**Note:** Batch 9 has only 2 buildable items. ~9 items total after de-duplication.

---

## Tier 2: Core Game Systems

### 2.1 GameTracker & Field
FieldingPlay interface expansion, inherited runners, holds/BS, substitution validation.

**Batches to process:** Batch 2 (FEATURE BUILD items), Batch 3 (FEATURE BUILD items)
**Key specs:** FIELDING_SYSTEM_SPEC.md, INHERITED_RUNNERS_SPEC.md, SUBSTITUTION_FLOW_SPEC.md
**Topics:** FieldingPlay 40+ fields, fielding tracking, pitch tracking, wild pitch/PB details, inherited runner attribution
**Notes from AUTHORITY.md:**
- GAP-B3-011 = full FieldingPlay interface (minus shift fields, keep zoneId/foulOut/savedRun)
- GAP-B3-013 = align with enhanced FieldCanvas, NOT legacy zones
- SKIP: GAP-B2-001 (IFR auto), GAP-B3-001 (shift clutch), GAP-B3-010 (shift logic), GAP-B3-014 (IFR auto), GAP-B3-015 (GRD tracking)

### 2.2 Clutch, Mojo & Leverage
Clutch attribution, mojo/fitness integration, leverage index wiring.

**How to find items:** Search ALL batches for items whose Spec field references: LEVERAGE_INDEX_SPEC.md, CLUTCH_ATTRIBUTION_SPEC.md. Also check Batch 4 items referencing MOJO_FITNESS_SYSTEM_SPEC.md that are about engine WIRING (not data structures — those are Tier 1).
**Key specs:** LEVERAGE_INDEX_SPEC.md, MOJO_FITNESS_SYSTEM_SPEC.md, CLUTCH_ATTRIBUTION_SPEC.md
**Topics:** Manager clutch inference, mojo splits by state, player card mojo/fitness display
**Note:** This sub-tier may have few items if mojo/clutch work is covered by Tier 1 data structures. If no items match after filtering, this sub-tier is empty and that's OK.

### 2.3 Fame, Milestones & Fan Systems
Fan Favorite detection, Albatross detection, oddity records, HOF features.

**Batches to process:** Batch 10 (all FEATURE BUILD items)
**Key specs:** SPECIAL_EVENTS_SPEC.md, FAME_SYSTEM_TRACKING.md, DYNAMIC_DESIGNATIONS_SPEC.md
**Topics:** Fan favorite/albatross detection, oddity records, HOF scoring, fame value tracking
**Note:** GAP-B10-006 = HOF score weighted by games/season variable from season setup

---

## Tier 3: Flow & UI (Largest tier — may span multiple sessions)

### 3.1 Draft & Prospect Generation
Prospect generation algorithms, draft flow, farm model.

**Batches to process:** Batch 6 (all APPROVED items — includes CRIT-B6-004, CRIT-B6-005 which are NEEDS YOUR CALL with BUILD)
**Key specs:** DRAFT_FIGMA_SPEC.md, STORIES_DRAFT.md, CONTRACTION_EXPANSION_FIGMA_SPEC.md, FREE_AGENCY_FIGMA_SPEC.md
**Also build:** NEW-001 (SP/RP pitcher classification in League Builder)
**Note:** MAJ-B6-012 (FA Drag Reorder) goes to Tier 3.2 since it's about offseason flows.

### 3.2 Offseason & Franchise Flows
Season transition, AI roster building, retirement, trades, waiver wire, FA signing.

**Batches to process:** Batch 8 (all APPROVED items, including CRIT-B8-002 NEEDS YOUR CALL with BUILD), Batch 11 (all FEATURE BUILD items)
**Specific items from other batches:**
- CRIT-B7-001 (NEEDS YOUR CALL→BUILD: Season Transition, FINALIZE_ADVANCE_FIGMA_SPEC)
- CRIT-B7-002 (NEEDS YOUR CALL→BUILD: AI Roster, FINALIZE_ADVANCE_FIGMA_SPEC)
- MAJ-B7-009 (FEATURE BUILD: Transaction Report, FINALIZE_ADVANCE_FIGMA_SPEC)
- MAJ-B6-012 (NEEDS YOUR CALL→BUILD: FA Drag Reorder, FREE_AGENCY_FIGMA_SPEC)
**Key specs:** OFFSEASON_SYSTEM_SPEC.md, FREE_AGENCY_FIGMA_SPEC.md, STORIES_FREE_AGENCY.md, RETIREMENT_FIGMA_SPEC.md, STORIES_RETIREMENT.md, TRADE_FIGMA_SPEC.md, STORIES_TRADE.md, SEASON_END_FIGMA_SPEC.md, AWARDS_CEREMONY_FIGMA_SPEC.md, FINALIZE_ADVANCE_FIGMA_SPEC.md
**Topics:** Season end flow, awards ceremony, offseason phase progression, free agency (dice + supplemental), trade validation, waiver wire, retirement, AI roster management
**DUPLICATE CHECK:** GAP-B11-010→CRIT-B7-001, GAP-B11-011→CRIT-B7-002, GAP-B12-004→GAP-B11-012

### 3.3 League Builder & Setup
Rule editor completion, league configuration.

**Specific items:**
- CRIT-B7-003 (FEATURE BUILD: Rules Editor, LEAGUE_BUILDER_FIGMA_SPEC)
- CRIT-B7-004 (NEEDS YOUR CALL→BUILD: League Editor, LEAGUE_BUILDER_FIGMA_SPEC)
**Key specs:** LEAGUE_BUILDER_SPEC.md, LEAGUE_BUILDER_FIGMA_SPEC.md
**Also build:** NEW-003 (remove Pitch Counts and Mound Visits from Rules)
**Note:** No Batch 4 items reference League Builder specs — all Batch 4 items are in Tier 1.1.

### 3.4 Playoffs & Season
Playoff screens, qualification, home field advantage, clinch detection.

**Batches to process:** Batch 12 (all FEATURE BUILD items)
**Specific items from Batch 7:**
- CRIT-B7-005 (FEATURE BUILD: Playoff Screens 2-6,9, PLAYOFFS_FIGMA_SPEC)
**Key specs:** PLAYOFFS_FIGMA_SPEC.md, STORIES_FINALIZE_ADVANCE.md, SCHEDULE_SYSTEM_FIGMA_SPEC.md
**DUPLICATE CHECK:** GAP-B13-004→CRIT-B8-001

### 3.5 Narrative & Special Events

**Batches to process:** Batch 13 (all APPROVED items — includes GAP-B13-001, MIS-B13-001 NEEDS YOUR CALL with BUILD)
**Key specs:** NARRATIVE_SYSTEM_SPEC.md, SPECIAL_EVENTS_SPEC.md, STORIES_RETIREMENT.md

---

## Tier 4: Polish & Integration

### 4.1 Remaining Items
Drag-reorder lineup, spray charts, CSV import/export, player generation utilities, UI refinements, Maddux threshold.

**Process:** All APPROVED (Phase B) items from ANY batch not yet completed in Tiers 1-3.
**Also build:**
- NEW-002 (Franchise Mode pre-game lineup screen)
- MIS-B14-001 (Maddux threshold weighted by innings/game — pre-resolved in AUTHORITY.md)

**How to find remaining items:**
1. Read PHASE_B_EXECUTION_REPORT.md for completed items
2. Search TRIAGE_DECISIONS.md for all items with `Status: APPROVED (Phase B)`
3. Include items where `My Triage: FEATURE BUILD` OR `My Triage: NEEDS YOUR CALL` with `Your Decision: BUILD`
4. Exclude FIX CODE, DOC ONLY, UPDATE SPEC, DEFER items
5. Any APPROVED items not yet completed = Tier 4

---

## Session Management

Phase B spans multiple CLI sessions. After each session:
1. Save progress to `spec-docs/PHASE_B_EXECUTION_REPORT.md`
2. Record which items are DONE, IN PROGRESS, BLOCKED
3. Record test baseline after each tier
4. Next session: read PHASE_B_EXECUTION_REPORT.md first, pick up where you left off
