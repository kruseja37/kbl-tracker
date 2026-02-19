# Spec Consolidation — Franchise & Offseason (LARGEST DOMAIN)

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

## Domain 4: Franchise & Offseason — Consolidation Task

### CONTEXT WARNING
This is the LARGEST domain with 19 source files and multiple interconnected systems. If you run low on context during processing:

1. Process in this priority:
   - Figma specs first (they define UI/structure)
   - System specs (logic/formulas)
   - Stories (acceptance criteria)

2. Save progress after each sub-group

3. When resuming, read this file again, then TRIAGE_DECISIONS.md, then continue from the next file in the list

### Overview
Consolidate Franchise Mode (dynasty tracking, pre-game lineups), Offseason System (11-phase structure), Farm System (cap = 10 with release modal per CRIT-B6-005), Trade System, Game Simulation, Draft flow, Free Agency flow, Contraction/Expansion, Finalize/Advance, and Retirement into one authoritative spec. This domain consumes Salary/Grade from Domain 3, uses League rules from Domain 5, and consumes WAR from Domain 1.

### Files to Read (in this order — PROCESS FIGMAS FIRST)

#### Figma Specs (UI/Structure) — READ THESE FIRST
1. spec-docs/DRAFT_FIGMA_SPEC.md
2. spec-docs/FREE_AGENCY_FIGMA_SPEC.md
3. spec-docs/CONTRACTION_EXPANSION_FIGMA_SPEC.md
4. spec-docs/FINALIZE_ADVANCE_FIGMA_SPEC.md
5. spec-docs/RETIREMENT_FIGMA_SPEC.md
6. spec-docs/TRADE_FIGMA_SPEC.md
7. spec-docs/FIGMA_BLURB_FREE_AGENCY_EXCHANGE.md
8. spec-docs/SEASON_END_FIGMA_SPEC.md (if not already read in Domain 5)

#### System Specs (Logic/Formulas) — READ AFTER FIGMAS
9. spec-docs/FRANCHISE_MODE_SPEC.md
10. spec-docs/OFFSEASON_SYSTEM_SPEC.md
11. spec-docs/FARM_SYSTEM_SPEC.md
12. spec-docs/TRADE_SYSTEM_SPEC.md
13. spec-docs/GAME_SIMULATION_SPEC.md

#### Stories (Acceptance Criteria) — READ AFTER SYSTEM SPECS
14. spec-docs/STORIES_DRAFT.md
15. spec-docs/STORIES_FREE_AGENCY.md
16. spec-docs/STORIES_TRADE.md
17. spec-docs/STORIES_RETIREMENT.md
18. spec-docs/STORIES_FINALIZE_ADVANCE.md
19. spec-docs/STORIES_CONTRACTION_EXPANSION.md
20. spec-docs/STORIES_SEASON_END.md

### Code Files to Check
- src/storage/offseasonStorage.ts
- src/storage/franchiseStorage.ts
- src/hooks/useOffseasonPhase.ts
- src/components/DraftFlow.tsx (first 100 lines)
- src/components/FreeAgencyFlow.tsx (first 100 lines)
- src/components/RetirementFlow.tsx (first 50 lines)
- src/components/FinalizeAdvanceFlow.tsx (first 100 lines)

### KNOWN CONTRADICTIONS — Search for These

1. **Offseason Phase Count**
   - Some specs say 11 phases, others reference different counts
   - Code has TWO conflicting systems: 10 string-enum vs 10 numbered
   - User decided: [CHECK TRIAGE_DECISIONS.md for resolution]
   - MUST be recorded in CONTRADICTIONS.md

2. **Farm Cap**
   - Some old specs say unlimited
   - User DECIDED: 10 (CRIT-B6-005)
   - Already RESOLVED — do not re-surface

3. **Season Transition (Timer Simulation vs Real Mutations)**
   - User decided: Real mutations (CHECK TRIAGE_DECISIONS.md)
   - MUST cite decision ID in output

4. **Free Agency Flow**
   - Two separate spec files: FREE_AGENCY_FIGMA_SPEC.md + FIGMA_BLURB_FREE_AGENCY_EXCHANGE.md
   - They may describe same flow differently
   - MUST reconcile and cite which is authoritative
   - Per user decision (GAP-B11-012): Supplemental FA signing COEXISTS with dice-based flow

5. **Pitch Counts in Rules**
   - NEW-003: Remove Pitch Counts and Mound Visits from Rules
   - Check if any offseason flow references these (should not)
   - Flag if found

### Critical Pre-Resolved User Decisions Applied to This Domain
- Farm cap = 10 with release modal (CRIT-B6-005) — INCLUDE
- Supplemental FA signing coexists with dice-based flow (GAP-B11-012) — INCLUDE
- Pre-game lineup screen for Franchise Mode (NEW-002) — INCLUDE
- Remove Pitch Counts and Mound Visits from Rules (NEW-003) — FLAG if found in offseason rules

### Critical Cross-Domain Touchpoints (FLAG these)
- Salary from Domain 3 (used in Trade calc, FA bid calculations)
- Grade from Domain 3 (used in Trade value, HOF voting)
- WAR from Domain 1 (used in Game Simulation player performance)
- League Rules from Domain 5 (affect draft order, roster limits, playoff rosters)
- Playoff rosters affect Playoff outcomes from Domain 5

### Output Requirements

1. Create `spec-docs/BUILD_TEMPLATE_FRANCHISE_OFFSEASON.md` with:
   - Section 1: Franchise Mode Overview (dynasty, pre-game lineup per NEW-002)
   - Section 2: Offseason System Architecture (11-phase structure, validate phase count)
   - Section 3: Draft System (Figma + logic)
   - Section 4: Free Agency System (reconcile both FA specs, note GAP-B11-012)
   - Section 5: Trade System
   - Section 6: Farm System (cap = 10 per CRIT-B6-005)
   - Section 7: Retirement System
   - Section 8: Contraction/Expansion System
   - Section 9: Finalize & Advance
   - Section 10: Game Simulation
   - Section 11: Season End & Transition
   - Section 12: Data Storage Interfaces
   - Section 13: Cross-Domain Dependencies (Salary, Grade, WAR, League Rules)
   - Section 14: Acceptance Criteria from all STORIES files

2. For Offseason Phase Count:
   - Show what each spec says (cite source)
   - Show what code has (cite source)
   - Mark as UNRESOLVED or note if TRIAGE_DECISIONS.md resolves it

3. For Free Agency:
   - Show both spec files side-by-side
   - Identify which flow is authoritative
   - Include GAP-B11-012 reconciliation: Supplemental signing + dice-based coexist
   - Show UI flow diagram

4. For Farm System:
   - Show cap = 10 per CRIT-B6-005 (RESOLVED)
   - Show release modal UI

5. For Pre-Game Lineup (NEW-002):
   - Show where this appears in Franchise Mode
   - Show UI/interaction model

6. For each interface:
   - Show current code vs target spec
   - List all fields with types

7. For each formula (Trade value, FA calc, etc.):
   - Show exact spec wording in blockquotes
   - Show values from Domain 1, 3, 5 that feed in
   - Flag cross-domain dependencies

8. Append contradictions to `spec-docs/CONTRADICTIONS.md` in format:
   ```
   ## [CONTRADICTION-OFFSET-NNN]: Brief Title
   **Status:** UNRESOLVED / RESOLVED (cite decision ID if resolved)
   **Details:** Spec A says X [FILE.md §SECTION], Spec B says Y [FILE.md §SECTION], Code has Z [FILE.ts line NNN]
   **Impact:** [which other domains affected]
   **Recommendation:** [proposed resolution if UNRESOLVED]
   ```

### Validation Checklist
- [ ] All 20 source files read and cited (skip SEASON_END_FIGMA_SPEC if read in Domain 5)
- [ ] All 7 code files checked and current vs target provided
- [ ] Offseason phase count verified (show in output: X phases defined)
- [ ] Free Agency: both spec files reconciled, GAP-B11-012 applied
- [ ] Farm cap = 10 marked RESOLVED (CRIT-B6-005)
- [ ] Pre-game lineup shown in Franchise Mode (NEW-002)
- [ ] All cross-domain references (Salary, Grade, WAR, League Rules) flagged
- [ ] Trade formula references Domain 3 Grade/Salary correctly
- [ ] Game Simulation formula references Domain 1 WAR correctly
- [ ] No Pitch Counts in Rules per NEW-003
- [ ] All STORIES acceptance criteria extracted
- [ ] Output under 1500 lines (if exceeds, process remaining in separate context with progress note)

### If Running Low on Context
Save this progress note:
```
DOMAIN 4 PROGRESS:
- Completed: [List which files read]
- Remaining: [List which files not yet read]
- Contradictions found so far: [list]
- Cross-domain dependencies identified: [list]
- Next: Resume with [NEXT FILE NAME] after reading TRIAGE_DECISIONS.md again
```

