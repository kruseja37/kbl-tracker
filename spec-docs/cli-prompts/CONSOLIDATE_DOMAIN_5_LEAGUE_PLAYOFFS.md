# Spec Consolidation — League Setup & Playoffs

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

## Domain 5: League Setup & Playoffs — Consolidation Task

### Overview
Consolidate League Builder, Season Setup, Playoff System, Season End mechanics, and Schedule System into one authoritative spec. This domain defines the foundational rules and structure that affect all other domains: game counts affect HOF weighting (Domain 3), league rules affect GameTracker (Domain 2), playoff rosters affect Franchise (Domain 4).

### Files to Read (in this order)
1. spec-docs/LEAGUE_BUILDER_SPEC.md
2. spec-docs/LEAGUE_BUILDER_FIGMA_SPEC.md
3. spec-docs/SEASON_SETUP_SPEC.md
4. spec-docs/SEASON_SETUP_FIGMA_SPEC.md
5. spec-docs/PLAYOFF_SYSTEM_SPEC.md
6. spec-docs/PLAYOFFS_FIGMA_SPEC.md (Phase C update)
7. spec-docs/SEASON_END_FIGMA_SPEC.md
8. spec-docs/SCHEDULE_SYSTEM_FIGMA_SPEC.md
9. spec-docs/STORIES_LEAGUE_BUILDER.md
10. spec-docs/STORIES_PLAYOFFS.md

### Code Files to Check
- src/components/LeagueBuilder/ (list all files in this directory)
- src/storage/playoffStorage.ts
- src/components/WorldSeries.tsx (first 50 lines)

### Critical Pre-Resolved User Decisions Applied to This Domain
- SP/RP classified as pitchers in roster setups (NEW-001) — INCLUDE
- Remove Pitch Counts and Mound Visits from League Builder Rules (NEW-003) — INCLUDE
- games/season variable used in HOF calc (GAP-B10-006) — INCLUDE in Season Setup (you define this)

### Critical Cross-Domain Touchpoints (FLAG these)
- **games/season variable** used in HOF score calculation (Domain 3 — Domain 3 auditor will reference your value)
- League rules affect GameTracker behavior (Domain 2)
- Playoff roster limits affect Franchise mode (Domain 4)
- Season end triggers offseason transition (Domain 4)
- Maddux threshold weighted by innings/game (MIS-B14-001) — related to games/season

### Output Requirements

1. Create `spec-docs/BUILD_TEMPLATE_LEAGUE_PLAYOFFS.md` with:
   - Section 1: League Builder Overview
   - Section 2: League Builder Configuration (teams, divisions, league-wide rules)
   - Section 3: Season Setup (game count definition — this is the source of games/season variable)
   - Section 4: Playoff System Architecture
   - Section 5: Playoff Format & Bracket Rules
   - Section 6: Season End & Advancement
   - Section 7: Schedule System
   - Section 8: Data Storage Interfaces
   - Section 9: Acceptance Criteria from STORIES
   - Section 10: Cross-Domain Dependencies (highlight games/season variable)

2. For Season Setup specifically:
   - Show how games/season is defined (this is referenced in Domain 3 for HOF weighting)
   - Show current code implementation
   - Mark as CRITICAL CROSS-DOMAIN VALUE

3. For League Builder Rules:
   - Apply NEW-001: SP/RP classified as pitchers (show how)
   - Apply NEW-003: Remove Pitch Counts and Mound Visits from rules (show what's removed)
   - List all other rules and constraints

4. For each interface:
   - Show current code vs target spec
   - List all fields with types
   - Mark breaking changes

5. For Playoff system:
   - Show bracket structure
   - Show advancement rules
   - Show roster limits per team
   - Tie back to Franchise roster management (Domain 4)

6. Append contradictions to `spec-docs/CONTRADICTIONS.md`

### Validation Checklist
- [ ] All 10 source files read and cited
- [ ] All code files in src/components/LeagueBuilder/ identified and checked
- [ ] src/storage/playoffStorage.ts and WorldSeries.tsx checked
- [ ] games/season variable defined and marked CRITICAL for Domain 3
- [ ] SP/RP classified as pitchers per NEW-001
- [ ] Pitch Counts and Mound Visits removed from League Builder Rules per NEW-003
- [ ] Playoff roster limits shown side-by-side with Franchise mode requirements
- [ ] Season end transition logic tied to Offseason Phase 1 (Domain 4)
- [ ] All STORIES acceptance criteria extracted
- [ ] Output under 1500 lines

### Note for Domain 3 Auditor
When Domain 3 auditor processes HOF score (GAP-B10-006), they will:
- Read this BUILD_TEMPLATE file to get the games/season variable value
- Incorporate it into their HOF weighting formula
- Make sure to cite: [BUILD_TEMPLATE_LEAGUE_PLAYOFFS.md §3, Line NNN]

