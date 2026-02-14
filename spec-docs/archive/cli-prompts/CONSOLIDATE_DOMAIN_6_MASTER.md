# Spec Consolidation — Master Spec & Architecture

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

## Domain 6: Master Spec & Architecture — Consolidation Task

### Overview
This domain covers features defined ONLY in the master spec (KBL_XHD_TRACKER_MASTER_SPEC_v3.md) that don't belong to Domain 1-5. These are typically system-level or cross-cutting features:
- Oddity Records system (unusual stats/achievements)
- Nickname system (custom player names)
- Award Emblems (visual badges for achievements)
- HOF Score framework (though formulas are in Domain 3)
- Legacy status / Dynasty tracking
- Fictional Calendar system
- Revenge game tracking
- Headlines Generator

### Files to Read (in this order)
1. spec-docs/KBL_XHD_TRACKER_MASTER_SPEC_v3.md (read thoroughly, extract master-only features by section)
2. spec-docs/app_features_and_questions.md (any master-level architecture notes)
3. spec-docs/STORIES_GAP_CLOSERS.md (acceptance criteria for features not in other domains)

### Code Files to Check
Look for any code implementing:
- Oddity Records system
- Nickname system
- Award Emblems
- Legacy/Dynasty tracking
- Fictional Calendar
- Revenge game tracking
- Headlines Generator

### Critical Task: Identify Domain-Specific vs Master-Specific Features
For EACH section in KBL_XHD_TRACKER_MASTER_SPEC_v3.md:
- If feature is detailed in Domain 1-5 specs, NOTE that it's "covered in Domain X" and don't duplicate
- If feature is ONLY in master spec, include it in this template
- If master spec differs from domain-specific spec, FLAG as [CONTRADICTION-MASTER-NNN]

Example: HOF Score is in Master Spec §6 AND in EOS_RATINGS_ADJUSTMENT_SPEC.md (Domain 3). This is COVERED in Domain 3, so reference it: "See BUILD_TEMPLATE_PLAYER_SYSTEMS.md §X for HOF Score details."

### Output Requirements

1. Create `spec-docs/BUILD_TEMPLATE_MASTER.md` with:
   - Section 1: Architecture Overview (multi-domain coordination, cross-cutting concerns)
   - Section 2: Oddity Records System
   - Section 3: Nickname System
   - Section 4: Award Emblems
   - Section 5: HOF Score Framework (with reference to Domain 3 for formulas)
   - Section 6: Legacy Status & Dynasty Tracking
   - Section 7: Fictional Calendar System
   - Section 8: Revenge Game Tracking
   - Section 9: Headlines Generator
   - Section 10: Cross-Domain Feature References (map master features to domain templates)
   - Section 11: Any app-wide features from app_features_and_questions.md not covered elsewhere

2. For each master-only feature:
   - Show exact spec wording in blockquotes
   - Show current code implementation (if exists)
   - Show breaking changes
   - Flag any contradictions with domain-specific specs

3. For HOF Score specifically:
   - Show master spec definition
   - Add note: "Full formulas with Domain 1 (WAR), Domain 3 (Clutch weight), and Domain 5 (games/season) are in BUILD_TEMPLATE_PLAYER_SYSTEMS.md §X"

4. For Cross-Domain References:
   - Create a matrix showing which master features depend on which domains
   - Example: "Award Emblems triggered by Domain 1 (WAR thresholds), Domain 3 (Grade milestones), Domain 4 (trade achievements)"

5. Append any contradictions to `spec-docs/CONTRADICTIONS.md`

### Validation Checklist
- [ ] KBL_XHD_TRACKER_MASTER_SPEC_v3.md fully read and all sections processed
- [ ] app_features_and_questions.md read
- [ ] STORIES_GAP_CLOSERS.md read
- [ ] For EACH section: determined if it's master-only or covered in Domains 1-5
- [ ] No duplicate features (if in Domain 1-5, reference instead of repeat)
- [ ] All master-only features included with citations
- [ ] Cross-domain dependency matrix created
- [ ] Current code checked for master-only features
- [ ] No contradictions with domain-specific specs (OR marked and cited)
- [ ] Output under 1500 lines

### Special Note
The Master Spec is the "source of truth" for app architecture. If you find a contradiction between master spec and a domain-specific spec, FLAG it as [CONTRADICTION-MASTER-NNN] with status UNRESOLVED unless you find it resolved in TRIAGE_DECISIONS.md.

