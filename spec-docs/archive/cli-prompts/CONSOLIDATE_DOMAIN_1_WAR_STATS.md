# Spec Consolidation — WAR & Statistics

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

## Domain 1: WAR & Statistics — Consolidation Task

### Overview
Consolidate all WAR calculation systems (bWAR, pWAR, fWAR, rWAR, mWAR) and statistics tracking architecture into a single authoritative spec. This domain provides the foundation metrics for Grade calculations, Clutch attribution, and HOF scoring.

### Files to Read (in this order)
1. spec-docs/BWAR_CALCULATION_SPEC.md
2. spec-docs/PWAR_CALCULATION_SPEC.md
3. spec-docs/FWAR_CALCULATION_SPEC.md
4. spec-docs/RWAR_CALCULATION_SPEC.md
5. spec-docs/MWAR_CALCULATION_SPEC.md
6. spec-docs/STAT_TRACKING_ARCHITECTURE_SPEC.md
7. spec-docs/STADIUM_ANALYTICS_SPEC.md
8. spec-docs/ADAPTIVE_STANDARDS_ENGINE_SPEC.md

### Code Files to Check
- src/engines/bwarCalculator.ts
- src/engines/pwarCalculator.ts
- src/engines/fwarCalculator.ts
- src/engines/rwarCalculator.ts
- src/engines/mwarCalculator.ts
- src/engines/warOrchestrator.ts

### Critical Cross-Domain Touchpoints (FLAG these)
- WAR values used in Grade calculations (Domain 3)
- WAR used in Clutch attribution (Domain 2)
- WAR used in HOF score (Domain 3)
- Park factors referenced in Stadium Analytics AND WAR calcs
- Calibration system referenced in Adaptive Standards (Domain 3)

### Output Requirements
1. Create `spec-docs/BUILD_TEMPLATE_WAR_STATS.md` with:
   - Section 1: WAR Calculation Overview (shared principles)
   - Section 2: Batting WAR (bWAR) with current code vs target spec
   - Section 3: Pitching WAR (pWAR) with current code vs target spec
   - Section 4: Fielding WAR (fWAR) with current code vs target spec
   - Section 5: Relief WAR (rWAR) with current code vs target spec
   - Section 6: Miscellaneous WAR (mWAR) with current code vs target spec
   - Section 7: Statistics Tracking Architecture with interfaces
   - Section 8: Stadium Analytics & Park Factors
   - Section 9: Adaptive Standards Engine
   - Section 10: WAR Orchestration & Assembly
   - Section 11: Cross-Domain References (Grade, Clutch, HOF)

2. For each interface found:
   - Show current code version (if it exists)
   - Show target spec version
   - List breaking changes
   - Mark with ⚠️ if fields are missing in current code

3. For each formula:
   - Use exact wording from spec in blockquotes
   - Cite source file and line number
   - Flag any contradictions with [CONTRADICTION-WAR-NNN]

4. Append any contradictions to `spec-docs/CONTRADICTIONS.md` in format:
   ```
   ## [CONTRADICTION-WAR-NNN]: Brief Title
   **Status:** UNRESOLVED / RESOLVED (cite decision ID)
   **Details:** Spec A says X [FILE.md §SECTION], Spec B says Y [FILE.md §SECTION]
   **Impact:** Which domain(s) affected
   **Recommendation:** Proposed resolution
   ```

### Validation Checklist
- [ ] All 8 source files read and cited
- [ ] All 6 code files checked and current vs target provided
- [ ] Park factor formula appears in both Stadium Analytics and WAR calcs (consistency check)
- [ ] Calibration baseline values are identical across all WAR specs
- [ ] No interface defined twice with different signatures
- [ ] All cross-domain references point to correct Domain 3 formulas
- [ ] Output under 1500 lines

