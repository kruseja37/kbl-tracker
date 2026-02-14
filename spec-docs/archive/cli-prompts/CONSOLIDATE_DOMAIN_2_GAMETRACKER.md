# Spec Consolidation — GameTracker & In-Game Systems

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

## Domain 2: GameTracker & In-Game Systems — Consolidation Task

### Overview
Consolidate GameTracker, fielding input, inherited runners, pitcher stats tracking, substitution flows, clutch attribution, and leverage indexing into one authoritative spec. This domain handles in-game operations and feeds statistics into Domain 1 (WAR) and Domain 3 (Fame/Clutch). FieldingPlay interface is critical — per user decision, MUST be 40+ fields minus shift fields, plus code-only fields (zoneId, foulOut, savedRun), aligned with enhanced FieldCanvas NOT legacy zones.

### Files to Read (in this order)
1. spec-docs/FIELDING_SYSTEM_SPEC.md
2. spec-docs/FIELD_ZONE_INPUT_SPEC.md
3. spec-docs/GAMETRACKER_DRAGDROP_SPEC.md
4. spec-docs/INHERITED_RUNNERS_SPEC.md
5. spec-docs/PITCHER_STATS_TRACKING_SPEC.md
6. spec-docs/PITCH_COUNT_TRACKING_SPEC.md
7. spec-docs/SUBSTITUTION_FLOW_SPEC.md
8. spec-docs/AUTO_CORRECTION_SYSTEM_SPEC.md
9. spec-docs/CLUTCH_ATTRIBUTION_SPEC.md
10. spec-docs/LEVERAGE_INDEX_SPEC.md
11. spec-docs/STORIES_GAMETRACKER_FIXES.md
12. spec-docs/STORIES_WIRING.md

### Code Files to Check
- src/types/game.ts (FieldingData, Runner, Bases interfaces)
- src/hooks/useGameState.ts (first 100 lines for interfaces)
- src/engines/clutchCalculator.ts
- src/engines/fielderInference.ts
- src/components/GameTracker/EnhancedInteractiveField.tsx (first 50 lines)

### Special Requirement: FieldingPlay Interface
Per user decision (GAP-B3-011, GAP-B3-013):
- MUST include full 40+ field set from spec
- MINUS all shift-related fields
- PLUS three code-only fields: zoneId, foulOut, savedRun
- MUST align with enhanced FieldCanvas (not legacy field zones)

Build a side-by-side comparison:
- Current code FieldingPlay (from src/types/game.ts)
- Target spec FieldingPlay (from FIELDING_SYSTEM_SPEC.md)
- List breaking changes
- Mark fields added/removed/modified

### Critical Cross-Domain Touchpoints (FLAG these)
- Clutch values feed into Domain 3 (Fame/Narrative)
- Fielding data feeds into Domain 1 (fWAR)
- Substitution changes affect Domain 4 (Franchise roster management)
- Pitch count changes trigger alerts but don't track per user decision NEW-003

### Output Requirements
1. Create `spec-docs/BUILD_TEMPLATE_GAMETRACKER.md` with:
   - Section 1: GameTracker Overview & Architecture
   - Section 2: Fielding System (with FieldingPlay interface full spec)
   - Section 3: Field Zone Input (enhanced FieldCanvas)
   - Section 4: Drag-and-Drop Interactions
   - Section 5: Inherited Runners & Base Running
   - Section 6: Pitcher Stats Tracking
   - Section 7: Pitch Count Tracking (NEW-003 applied)
   - Section 8: Substitution Flow
   - Section 9: Auto-Correction System
   - Section 10: Clutch Attribution System (with cross-domain notes)
   - Section 11: Leverage Index Calculations
   - Section 12: Acceptance Criteria from STORIES files

2. For FieldingPlay interface:
   - Show FULL field list from spec (40+ fields)
   - Show current code version side-by-side
   - Explicitly show: fields to add, fields to remove, fields to modify
   - Highlight: zoneId, foulOut, savedRun (code-only fields)
   - Flag any legacy zone references (must be removed per GAP-B3-013)

3. For each interface found:
   - Show current code version
   - Show target spec version
   - List breaking changes

4. Append contradictions to `spec-docs/CONTRADICTIONS.md`

### Validation Checklist
- [ ] All 12 source files read and cited
- [ ] All 5 code files checked
- [ ] FieldingPlay interface shows 40+ fields with shift fields removed
- [ ] zoneId, foulOut, savedRun explicitly called out as code-only additions
- [ ] No legacy field zone references remain
- [ ] Clutch formula consistent with Domain 3 Grade usage
- [ ] Leverage Index values match those used in Clutch calc
- [ ] No circular dependency between Clutch and Leverage
- [ ] Pitch Count section reflects NEW-003 (no actual tracking, just alerts)
- [ ] All STORIES acceptance criteria extracted
- [ ] Output under 1500 lines (if exceeds, prioritize interfaces > formulas > flows > stories)

