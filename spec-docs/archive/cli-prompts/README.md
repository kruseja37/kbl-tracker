# KBL Tracker Spec Consolidation CLI Prompts

This directory contains 7 self-contained markdown files for Claude CLI spec consolidation. Each file is a complete, copy-pasteable prompt for processing one domain of the KBL Tracker specification.

## File Structure

### Domain Consolidation Prompts (6 files)

1. **CONSOLIDATE_DOMAIN_1_WAR_STATS.md**
   - Domain: WAR & Statistics (bWAR, pWAR, fWAR, rWAR, mWAR)
   - Output: spec-docs/BUILD_TEMPLATE_WAR_STATS.md
   - 139 lines

2. **CONSOLIDATE_DOMAIN_2_GAMETRACKER.md**
   - Domain: GameTracker & In-Game Systems (fielding, clutch, substitution)
   - Special requirement: FieldingPlay interface (40+ fields minus shift fields + code-only fields)
   - Output: spec-docs/BUILD_TEMPLATE_GAMETRACKER.md
   - 153 lines

3. **CONSOLIDATE_DOMAIN_3_PLAYER_SYSTEMS.md**
   - Domain: Player Systems (Grade, Salary, Mojo, Fame, Fan Systems, EOS Ratings)
   - Special requirements: HOF score with games/season weighting, Maddux threshold with innings/game weighting
   - Output: spec-docs/BUILD_TEMPLATE_PLAYER_SYSTEMS.md
   - 164 lines

4. **CONSOLIDATE_DOMAIN_4_FRANCHISE_OFFSEASON.md** (LARGEST)
   - Domain: Franchise & Offseason (Trade, Draft, FA, Retirement, Farm System)
   - 19 source files, includes context management for low-context scenarios
   - Known contradictions to resolve: phase count, farm cap, season transition, FA flow
   - Output: spec-docs/BUILD_TEMPLATE_FRANCHISE_OFFSEASON.md
   - 241 lines

5. **CONSOLIDATE_DOMAIN_5_LEAGUE_PLAYOFFS.md**
   - Domain: League Setup & Playoffs
   - Critical: defines games/season variable used in Domain 3 HOF calculation
   - Output: spec-docs/BUILD_TEMPLATE_LEAGUE_PLAYOFFS.md
   - 155 lines

6. **CONSOLIDATE_DOMAIN_6_MASTER.md**
   - Domain: Master Spec & Architecture (Oddity Records, Nicknames, Award Emblems, etc.)
   - Special task: identify master-only features vs. features covered in Domains 1-5
   - Output: spec-docs/BUILD_TEMPLATE_MASTER.md
   - 148 lines

### Cross-Domain Validation Prompt (1 file)

7. **CONSOLIDATE_CROSS_DOMAIN_VALIDATOR.md** (FINAL SESSION)
   - Purpose: Validate all 6 domain templates are internally consistent
   - Performs 5 validation checks:
     1. Cross-domain reference validation
     2. Shared interface definition consistency
     3. Formula & constant consistency
     4. Feature dependency validation
     5. Phase B triage item coverage (132 BUILDs)
   - Output: spec-docs/CROSS_DOMAIN_VALIDATION.md
   - 256 lines

## Usage Instructions

### Phase B: Initial Domain Consolidation
1. Run prompts 1-6 in sequence (can run in parallel if you have multiple Claude CLI instances)
2. Each prompt reads spec files and code, produces a BUILD_TEMPLATE
3. Each prompt appends contradictions to spec-docs/CONTRADICTIONS.md

### Phase B: Cross-Domain Validation
4. After all 6 domain templates exist, run prompt 7
5. Validates all cross-domain references, interfaces, formulas, dependencies
6. Produces final CROSS_DOMAIN_VALIDATION.md report

## Common Preamble

All 7 files include the identical common preamble defining:
- **8 Critical Rules** (no hallucination, triage finality, quoting, Ralph stories, Phase C updates, code interfaces, size limits, stop conditions)
- **Pre-Resolved User Decisions** (12 decisions that must NOT be re-surfaced)

This preamble appears in every file, making each file self-contained and runnable independent of others.

## Domain-Specific Content

Each file after the common preamble includes:
- **Overview**: What this domain covers and its role in the system
- **Files to Read**: Ordered list of spec files (prioritized by importance)
- **Code Files to Check**: Source files with current implementations
- **Critical Cross-Domain Touchpoints**: Other domains this references
- **Known Contradictions**: Specific conflicts to search for (if applicable)
- **Output Requirements**: Detailed structure of the BUILD_TEMPLATE output
- **Validation Checklist**: Step-by-step verification items

## Key Design Principles

1. **Self-Contained**: Each file can be run independently; no assumptions about previous sessions
2. **Citation Required**: Every claim must have source citation [FILENAME.md §SECTION, Line NNN]
3. **No Hallucination**: Only use content from spec and code files, never infer from training data
4. **Current Code vs Target Spec**: Every interface shows what code currently has vs what spec requires
5. **Cross-Domain Awareness**: Each domain knows which other domains it depends on and is flagged to verify consistency

## File Output Locations

When each CLI prompt is run, it produces:
- **Domain templates**: spec-docs/BUILD_TEMPLATE_[DOMAIN].md (one per domain)
- **Contradictions list**: Appended to spec-docs/CONTRADICTIONS.md
- **Final validation**: spec-docs/CROSS_DOMAIN_VALIDATION.md (run 7 only)

## Size Guidelines

- Each domain template: target <1500 lines
- If exceeds: prioritize (interfaces > formulas > UI flows > stories)
- Domain 4 (Franchise) is largest; includes context management guidance

## Phase C Updates

These 11 spec files were updated Feb 6, 2026 (Phase C) and their content is authoritative:
- OFFSEASON_SYSTEM_SPEC.md
- STORIES_FREE_AGENCY.md
- PLAYOFFS_FIGMA_SPEC.md
- STORIES_FINALIZE_ADVANCE.md
- CONTRACTION_EXPANSION_FIGMA_SPEC.md
- STORIES_CONTRACTION_EXPANSION.md
- STORIES_TRADE.md
- RETIREMENT_FIGMA_SPEC.md
- STORIES_RETIREMENT.md
- STORIES_DRAFT.md
- STORIES_SEASON_END.md

