# KBL Tracker Spec Consolidation — CLI Execution Prompt

## Context
You are executing the `spec-consolidation-protocol` skill for the KBL Tracker project. **Phases 0-2 are already complete.** You are starting at **Phase 3: Contradiction Detection**.

**SPEC_DOCS_PATH:** `spec-docs/` (relative to project root)

## What's Already Done

### Phase 0: Path confirmed
### Phase 1-2: Inventory & Domain Clustering

Read `spec-docs/SPEC_INVENTORY.md` for the full inventory (156 files, 9 categories, 7 domains).

**75 files need consolidation** (ACTIVE_SPEC + FIGMA_SPEC + STORY). The rest are reports, meta, or historical.

**7 Consolidation Domains:**

| Domain | Target File | Source Files |
|--------|-------------|-------------|
| 1. WAR & Statistics | BUILD_TEMPLATE_WAR_STATS.md | BWAR_CALCULATION_SPEC, PWAR_CALCULATION_SPEC, FWAR_CALCULATION_SPEC, RWAR_CALCULATION_SPEC, MWAR_CALCULATION_SPEC, STAT_TRACKING_ARCHITECTURE_SPEC, STADIUM_ANALYTICS_SPEC, ADAPTIVE_STANDARDS_ENGINE_SPEC |
| 2. GameTracker & In-Game | BUILD_TEMPLATE_GAMETRACKER.md | FIELDING_SYSTEM_SPEC, FIELD_ZONE_INPUT_SPEC, GAMETRACKER_DRAGDROP_SPEC, INHERITED_RUNNERS_SPEC, PITCHER_STATS_TRACKING_SPEC, PITCH_COUNT_TRACKING_SPEC, SUBSTITUTION_FLOW_SPEC, AUTO_CORRECTION_SYSTEM_SPEC, CLUTCH_ATTRIBUTION_SPEC, LEVERAGE_INDEX_SPEC, STORIES_GAMETRACKER_FIXES, STORIES_WIRING |
| 3. Player Systems | BUILD_TEMPLATE_PLAYER_SYSTEMS.md | GRADE_ALGORITHM_SPEC, grade_tracking_system, SALARY_SYSTEM_SPEC, MOJO_FITNESS_SYSTEM_SPEC, MILESTONE_SYSTEM_SPEC, FAN_FAVORITE_SYSTEM_SPEC, FAN_MORALE_SYSTEM_SPEC, DYNAMIC_DESIGNATIONS_SPEC, NARRATIVE_SYSTEM_SPEC, SPECIAL_EVENTS_SPEC, EOS_RATINGS_ADJUSTMENT_SPEC, EOS_RATINGS_FIGMA_SPEC, AWARDS_CEREMONY_FIGMA_SPEC, STORIES_RATINGS_ADJUSTMENT, STORIES_AWARDS_CEREMONY |
| 4. Franchise & Offseason | BUILD_TEMPLATE_FRANCHISE_OFFSEASON.md | FRANCHISE_MODE_SPEC, OFFSEASON_SYSTEM_SPEC, FARM_SYSTEM_SPEC, TRADE_SYSTEM_SPEC, GAME_SIMULATION_SPEC, DRAFT_FIGMA_SPEC, FREE_AGENCY_FIGMA_SPEC, CONTRACTION_EXPANSION_FIGMA_SPEC, FINALIZE_ADVANCE_FIGMA_SPEC, RETIREMENT_FIGMA_SPEC, TRADE_FIGMA_SPEC, FIGMA_BLURB_FREE_AGENCY_EXCHANGE, STORIES_DRAFT, STORIES_FREE_AGENCY, STORIES_TRADE, STORIES_RETIREMENT, STORIES_FINALIZE_ADVANCE, STORIES_CONTRACTION_EXPANSION, STORIES_SEASON_END |
| 5. League Setup & Playoffs | BUILD_TEMPLATE_LEAGUE_PLAYOFFS.md | LEAGUE_BUILDER_SPEC, SEASON_SETUP_SPEC, PLAYOFF_SYSTEM_SPEC, LEAGUE_BUILDER_FIGMA_SPEC, SEASON_SETUP_FIGMA_SPEC, PLAYOFFS_FIGMA_SPEC, SEASON_END_FIGMA_SPEC, SCHEDULE_SYSTEM_FIGMA_SPEC, STORIES_LEAGUE_BUILDER, STORIES_PLAYOFFS |
| 6. Master Spec & Architecture | BUILD_TEMPLATE_MASTER.md | KBL_XHD_TRACKER_MASTER_SPEC_v3, app_features_and_questions, STORIES_GAP_CLOSERS |
| 7. Testing & Implementation | (Keep as operational docs — don't consolidate into build template) |

---

## Critical Authority Rules

### The Triage Spreadsheet Overrides Specs
`spec-docs/AUDIT_TRIAGE.xlsx` contains user-triaged decisions for 353 findings. When you encounter a contradiction between two specs:

1. **Check if AUDIT_TRIAGE.xlsx already resolved it** — look for the relevant item ID
2. **If the spreadsheet has a decision:**
   - Column K (Your Decision) = FIX CODE → Column F (Spec Says) wins
   - Column K = UPDATE SPEC → Column G (Code Says) wins
   - Column H (Recommended Fix) is always the authority for approach
   - User-edited cells override the original spec doc text
3. **If the spreadsheet doesn't cover it** → log as CONTRADICTION for user resolution

### User Decisions That Already Resolved Conflicts
These Phase B walkthrough decisions are FINAL — do not re-surface as contradictions:
- Farm cap = 10 with release modal (CRIT-B6-005)
- No shift logic needed (GAP-B3-010 SKIPPED)
- IFR stays user input, no auto-detect (GAP-B2-001 SKIPPED)
- No ground rule double tracking (GAP-B3-015 SKIPPED)
- HOF score weighted by games/season variable (GAP-B10-006)
- Full 40+ field FieldingPlay interface minus shift fields (GAP-B3-011)
- All fielding tracking aligns with enhanced FieldCanvas, not legacy zones (GAP-B3-013)
- Supplemental FA signing coexists with dice-based flow (GAP-B11-012)
- SP/RP classified as pitchers in League Builder roster setups (NEW-001)
- Pre-game lineup screen for Franchise Mode (NEW-002)
- Remove Pitch Counts and Mound Visits from Rules (NEW-003)
- Maddux threshold weighted by innings/game (MIS-B14-001)

---

## Phase 3: Contradiction Detection

### Process (DOMAIN BY DOMAIN)

For each of the 6 build template domains (skip Domain 7 Testing):

1. **Read every source file** listed for that domain
2. **Extract all concrete claims** — numbers, thresholds, interfaces, field names, phase orders, enum values, calculation formulas
3. **Cross-reference claims across files** in that domain:
   - Does File A define the same thing as File B?
   - Do they agree? If not → CONTRADICTION
   - Does the Figma spec match the system spec? If not → CONTRADICTION
   - Do the stories add requirements not in the specs? If so → AMBIGUITY
4. **Also cross-reference between domains** for shared concepts:
   - WAR calculations referenced in Player Systems (grade depends on WAR)
   - Clutch referenced in both GameTracker and Player Systems
   - Farm system referenced in both Franchise and Draft
   - Salary referenced in Trade, FA, and Player Systems
5. **Check each finding against AUDIT_TRIAGE.xlsx** — if already resolved, note it and move on

### Output Format
Save to `spec-docs/CONTRADICTIONS.md`:

```markdown
# KBL Tracker Spec Contradictions

## Domain 1: WAR & Statistics

### CONTRADICTION #1
- **Nature:** [hard/soft/ambiguity/temporal/scope]
- **Specs involved:** BWAR_CALCULATION_SPEC.md §X vs STAT_TRACKING_ARCHITECTURE_SPEC.md §Y
- **Spec A says:** [exact quote with line ref]
- **Spec B says:** [exact quote with line ref]
- **Already resolved in triage?** [Yes/No — if yes, cite the item ID and decision]
- **Suggested resolution:** [recommendation]
- **Question for user:** [specific question if unresolved]

[repeat for all contradictions in domain]

## Domain 2: GameTracker & In-Game
[...]
```

### Focus Areas for Contradictions
These areas are KNOWN to have potential conflicts (from the exhaustive audit):
- Offseason phase count/order (OFFSEASON_SYSTEM_SPEC vs FINALIZE_ADVANCE_FIGMA vs code has TWO conflicting systems)
- Farm system cap (some specs say unlimited, user decided 10)
- Fielding directions (5 vs 7 — user decided 7, FL+FR)
- Grade thresholds (spec data-driven vs test helper simple intervals)
- Season transition operations (what actually happens — timer sim vs real mutations)
- Free agency flow (dice-based vs direct signing — both exist per Figma)
- Retirement probability recalculation
- Fan Favorite detection timing and thresholds
- Playoff home field patterns

---

## Phase 4: Contradiction Resolution

After generating CONTRADICTIONS.md:
- **Present unresolved contradictions to the user** in batches of 5-10
- For each, state the conflict clearly and offer your recommendation
- Record user's decision directly into CONTRADICTIONS.md
- If a contradiction is already resolved by triage spreadsheet, mark it RESOLVED and move on

---

## Phase 5: Build Template Generation

After all contradictions are resolved, generate consolidated build templates.

### Per-Domain Template Structure:
```markdown
# BUILD_TEMPLATE_[DOMAIN].md

## 1. Overview
- Purpose of this domain
- Systems covered
- Key dependencies on other domains

## 2. Data Models (Canonical Definitions)
- All TypeScript interfaces with exact field names, types, and descriptions
- Which file implements each interface
- Relationships between interfaces

## 3. Business Logic
- Algorithms with exact formulas, constants, and thresholds
- Decision trees and flow charts
- Edge cases and their handling

## 4. UI/UX Requirements
- Screen flow (from Figma specs)
- Component responsibilities
- User interaction patterns
- iPad-specific considerations

## 5. Acceptance Criteria (from Stories)
- Testable criteria for each feature
- User stories mapped to implementations

## 6. Source Traceability
| Section | Source Spec | Lines | Notes |
|---------|-----------|-------|-------|
| 2.1 FieldingPlay | FIELDING_SYSTEM_SPEC.md | §19, L912-991 | User requested full 40+ fields |

## 7. Open Questions
- Any remaining ambiguities flagged for user
```

### Rules for Template Generation:
1. **Every claim must have a source line reference** — no unsourced statements
2. **Triage spreadsheet values override original spec text** — if Column F says something different from the spec file, use Column F
3. **Remove deprecated/superseded content** — if two specs say different things and one is clearly older, note which wins
4. **Include ALL TypeScript interfaces verbatim** — these are the contract between spec and code
5. **Flag areas where specs are silent** — if a system needs something that no spec defines, flag it
6. **Cross-domain references** — when one domain references another, use `→ See BUILD_TEMPLATE_[OTHER].md §X`

---

## Execution Order

1. Read SPEC_INVENTORY.md
2. Read AUDIT_TRIAGE.xlsx (to know which conflicts are pre-resolved)
3. Domain 1: WAR & Stats — read all 8 source files, detect contradictions
4. Domain 2: GameTracker — read all 12 source files, detect contradictions
5. Domain 3: Player Systems — read all 15 source files, detect contradictions
6. Domain 4: Franchise & Offseason — read all 19 source files, detect contradictions
7. Domain 5: League & Playoffs — read all 10 source files, detect contradictions
8. Domain 6: Master Spec — read all 3 source files, detect contradictions
9. Save CONTRADICTIONS.md
10. Present unresolved contradictions to user
11. After resolution: generate BUILD_TEMPLATE files (one per domain)
12. Update SPEC_INVENTORY.md with completion status

### Context Budget
This is a lot of reading. If you run low on context:
- Complete the current domain fully before stopping
- Save all progress to files
- Note which domains are done vs remaining
- The user can resume with a fresh session

**Start with Domain 1 (WAR & Stats) — it has the fewest source files and cleanest separation.**
