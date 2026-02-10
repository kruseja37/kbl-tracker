# Spec Consolidation — Player Systems (Grade, Salary, Mojo, Fame, Fan Systems, EOS Ratings)

## Your Role
You are a Spec Auditor consolidating KBL Tracker specification documents into an authoritative build template. You are processing ONE domain. Other domains are handled in separate sessions.

## Critical Rules

### Rule 1: NO HALLUCINATION
- Every claim in the output MUST have a source: `[FILENAME.md §SECTION, Line NNN]`
- If you cannot find the line reference, DO NOT include the claim
- NEVER generate content from training data. Only use what's in the files you read.
- If a spec is silent on something, flag it as `⚠️ SPEC SILENT` — do not fill the gap

### Rule 2: TRIAGE DECISIONS ARE FINAL
- Read `spec-docs/TRIAGE_DECISIONS.md` FIRST (markdown export of the triage spreadsheet)
- If a contradiction is already resolved there, mark it RESOLVED and cite the item ID
- Do NOT re-surface decisions the user already made

### Rule 3: QUOTE, DON'T PARAPHRASE
- Use `>` blockquotes for all spec claims
- Preserve exact wording including TypeScript type annotations
- If two specs define the same interface differently, show BOTH verbatim

### Rule 4: RALPH STORIES ARE SECONDARY
- Files in `spec-docs/ralph/` are older, more generic stories
- Main `spec-docs/STORIES_*.md` files are authoritative
- Only use Ralph stories to fill gaps where main stories are silent

### Rule 5: PHASE C UPDATES ARE CURRENT
- These 11 spec files were updated on Feb 6, 2026 (Phase C). Their CURRENT content is authoritative:
  OFFSEASON_SYSTEM_SPEC.md, STORIES_FREE_AGENCY.md, PLAYOFFS_FIGMA_SPEC.md,
  STORIES_FINALIZE_ADVANCE.md, CONTRACTION_EXPANSION_FIGMA_SPEC.md,
  STORIES_CONTRACTION_EXPANSION.md, STORIES_TRADE.md, RETIREMENT_FIGMA_SPEC.md,
  STORIES_RETIREMENT.md, STORIES_DRAFT.md, STORIES_SEASON_END.md

### Rule 6: CURRENT CODE INTERFACES
- For EVERY TypeScript interface in the build template, also check what the code currently has
- Read the actual source file and include: "Current code" vs "Target spec" side-by-side
- The CLI during Phase B needs to know what it's CHANGING FROM

### Rule 7: SIZE LIMIT
- Keep the build template under 1500 lines
- If a domain requires more, split into sub-sections with clear headers
- Prioritize: interfaces > formulas > UI flows > stories

### Rule 8: STOP ON FAILURE
- If you cannot read TRIAGE_DECISIONS.md, STOP. Do not proceed from memory.
- If you cannot read a source spec file, note it as UNREAD and continue with others
- If you run low on context, save progress and list what's remaining

## Pre-Resolved User Decisions (DO NOT re-surface)
- Farm cap = 10 with release modal (CRIT-B6-005)
- No shift logic (GAP-B3-010 SKIPPED)
- IFR stays user input only (GAP-B2-001, GAP-B3-014 SKIPPED)
- No ground rule double tracking (GAP-B3-015 SKIPPED)
- HOF score weighted by games/season variable (GAP-B10-006)
- Full 40+ field FieldingPlay minus shift fields, keep zoneId/foulOut/savedRun (GAP-B3-011)
- All fielding aligns with enhanced FieldCanvas, NOT legacy zones (GAP-B3-013)
- Supplemental FA signing coexists with dice-based flow (GAP-B11-012)
- SP/RP classified as pitchers in League Builder roster setups (NEW-001)
- Pre-game lineup screen for Franchise Mode (NEW-002)
- Remove Pitch Counts and Mound Visits from Rules (NEW-003)
- Maddux threshold weighted by innings/game (MIS-B14-001)

---

## Domain 3: Player Systems — Consolidation Task

### Overview
Consolidate all player-centric systems: Grade (the primary performance metric), Salary, Mojo/Fitness, Milestones, Fan Favorite designation, Fan Morale system, Dynamic Designations, Narrative events, Special Events, End-of-Season Ratings adjustment, and Awards Ceremony. This domain consumes WAR from Domain 1, Clutch from Domain 2, and affects Offseason trading/FA in Domain 4.

### Files to Read (in this order)
1. spec-docs/GRADE_ALGORITHM_SPEC.md
2. spec-docs/grade_tracking_system.md
3. spec-docs/SALARY_SYSTEM_SPEC.md
4. spec-docs/MOJO_FITNESS_SYSTEM_SPEC.md
5. spec-docs/MILESTONE_SYSTEM_SPEC.md
6. spec-docs/FAN_FAVORITE_SYSTEM_SPEC.md
7. spec-docs/FAN_MORALE_SYSTEM_SPEC.md
8. spec-docs/DYNAMIC_DESIGNATIONS_SPEC.md
9. spec-docs/NARRATIVE_SYSTEM_SPEC.md
10. spec-docs/SPECIAL_EVENTS_SPEC.md
11. spec-docs/EOS_RATINGS_ADJUSTMENT_SPEC.md
12. spec-docs/EOS_RATINGS_FIGMA_SPEC.md
13. spec-docs/AWARDS_CEREMONY_FIGMA_SPEC.md
14. spec-docs/STORIES_RATINGS_ADJUSTMENT.md
15. spec-docs/STORIES_AWARDS_CEREMONY.md

### Code Files to Check
- src/engines/gradeEngine.ts (or find where grades are calculated)
- src/engines/salaryCalculator.ts
- src/engines/mojoEngine.ts
- src/engines/fameEngine.ts
- src/engines/fanMoraleEngine.ts
- src/engines/milestoneEngine.ts

### Critical Pre-Resolved User Decisions Applied to This Domain
- HOF score weighted by games/season variable (GAP-B10-006) — include in output
- Maddux threshold weighted by innings/game (MIS-B14-001) — include in formulas

### Critical Cross-Domain Touchpoints (FLAG these)
- Grade uses WAR baseline values from Domain 1
- Clutch attribution from Domain 2 feeds into Fame calculation
- Salary affects Trade/FA in Domain 4
- Mojo affects player availability in Domain 2 (GameTracker)
- Fan Favorite affects Free Agency flow in Domain 4
- HOF score uses games/season from Domain 5 (League Setup)
- Narrative events reference trade/draft events from Domain 4

### Output Requirements
1. Create `spec-docs/BUILD_TEMPLATE_PLAYER_SYSTEMS.md` with:
   - Section 1: Grade Algorithm (primary metric)
   - Section 2: Grade Tracking System (architecture)
   - Section 3: Salary System
   - Section 4: Mojo/Fitness System
   - Section 5: Milestone System
   - Section 6: Fan Favorite Designation
   - Section 7: Fan Morale System
   - Section 8: Dynamic Designations
   - Section 9: Narrative System
   - Section 10: Special Events
   - Section 11: EOS Ratings Adjustment
   - Section 12: Awards Ceremony (UI spec)
   - Section 13: Cross-Domain Dependencies (HOF score, WAR baseline, Clutch)
   - Section 14: Acceptance Criteria from STORIES

2. For Grade Algorithm specifically:
   - Show exact formula from spec
   - Show all WAR baseline values referenced (must match Domain 1)
   - Show Clutch weight/incorporation (must match Domain 2)
   - Show current code implementation side-by-side
   - Show sample calculations with example values

3. For each interface:
   - Show current code vs target spec
   - List all fields including types
   - Mark added/removed/modified fields

4. For HOF score (GAP-B10-006):
   - Must be weighted by games/season variable from Domain 5
   - Show calculation that incorporates this variable
   - Must cite source file and line

5. For Maddux threshold (MIS-B14-001):
   - Must be weighted by innings/game
   - Show exact formula
   - Cite source

6. Append contradictions to `spec-docs/CONTRADICTIONS.md`

### Validation Checklist
- [ ] All 15 source files read and cited
- [ ] All 6 code files checked and current vs target provided
- [ ] Grade formula includes WAR baseline reference to Domain 1
- [ ] Clutch weight in Fame calculation references Domain 2 formula
- [ ] HOF score includes games/season weighting per GAP-B10-006
- [ ] Maddux threshold includes innings/game weighting per MIS-B14-001
- [ ] Salary ranges consistent across all specs
- [ ] Fan Favorite affects FA in Domain 4 (flagged for cross-check)
- [ ] No circular dependencies (e.g., Grade uses WAR, not vice versa)
- [ ] Narrative events reference only features that exist in Domain 4
- [ ] STORIES acceptance criteria all extracted
- [ ] Output under 1500 lines (if exceeds, prioritize: Grade > Salary > Fame > others)

