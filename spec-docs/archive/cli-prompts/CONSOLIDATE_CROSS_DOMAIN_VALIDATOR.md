# Spec Consolidation — Cross-Domain Validator (FINAL SESSION)

## Your Role
You are a Spec Auditor validating consistency across all 6 domain consolidation templates. This is the FINAL session, run AFTER all 6 domains have generated their BUILD_TEMPLATE files.

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

## Cross-Domain Validation Task

### Overview
This session validates that all 6 domain BUILD_TEMPLATE files are internally consistent and properly connected. You will:
1. Read all 6 domain templates
2. Read CONTRADICTIONS.md (accumulated contradictions)
3. Read TRIAGE_DECISIONS.md (resolved contradictions)
4. Perform 5 validation checks
5. Produce CROSS_DOMAIN_VALIDATION.md report

### Files to Read (in this order)

#### Domain Templates (the 6 templates created in previous sessions)
1. spec-docs/BUILD_TEMPLATE_WAR_STATS.md
2. spec-docs/BUILD_TEMPLATE_GAMETRACKER.md
3. spec-docs/BUILD_TEMPLATE_PLAYER_SYSTEMS.md
4. spec-docs/BUILD_TEMPLATE_FRANCHISE_OFFSEASON.md
5. spec-docs/BUILD_TEMPLATE_LEAGUE_PLAYOFFS.md
6. spec-docs/BUILD_TEMPLATE_MASTER.md

#### Reference Files
7. spec-docs/CONTRADICTIONS.md (accumulated contradictions from all 6 domain audits)
8. spec-docs/TRIAGE_DECISIONS.md (user's pre-made decisions)

### Validation Check #1: Cross-Domain Reference Validation
For EVERY cross-domain reference in the 6 templates (formatted as "See BUILD_TEMPLATE_[OTHER].md §X"):
- [ ] Verify the referenced template file exists
- [ ] Verify the referenced section exists
- [ ] Verify the referenced section actually contains what the source claims
- [ ] Verify line numbers are approximately correct
- [ ] Report any broken references as [XREF-BROKEN-NNN]

Example of what to look for:
- Domain 3 references BUILD_TEMPLATE_WAR_STATS.md §2 for "batting WAR baseline"
- Verify Domain 1 §2 actually discusses batting WAR baseline
- If it doesn't, flag as broken

### Validation Check #2: Shared Interface Definition Consistency
Identify all TypeScript interfaces that appear in MULTIPLE domain templates:
- [ ] For each shared interface, verify the definition is IDENTICAL across all templates
- [ ] Report any definitions that differ as [INTERFACE-MISMATCH-NNN]
- [ ] Flag severity: CRITICAL (will cause runtime errors) vs WARNING (clarification needed)

Example of what to look for:
- If Grade interface appears in Domain 3 AND Domain 4, verify they define Grade.value and Grade.timestamp identically
- If FieldingPlay appears in Domain 2 AND Domain 1, verify field signatures match

### Validation Check #3: Formula & Constant Consistency
Identify all formulas and constants that reference values from other domains:
- [ ] For each cross-domain formula reference, verify the referenced value exists and matches in source domain
- [ ] Report any mismatches as [FORMULA-MISMATCH-NNN]

Example of what to look for:
- Domain 3 Grade formula references Domain 1 WAR baseline (e.g., "WAR_BASELINE = 2.0")
- Domain 4 Trade formula references Domain 3 Grade ceiling
- Domain 3 HOF score references Domain 5 games/season variable
- Verify all these values are consistent across domains

### Validation Check #4: Feature Dependency Validation
For EVERY feature that depends on features from another domain:
- [ ] Verify the dependency exists in source domain
- [ ] Verify the dependency is not optional/conditional without note
- [ ] Verify no circular dependencies exist

Example of what to look for:
- Domain 4 Draft depends on Domain 5 draft order (playoff rank)
- Domain 2 Clutch depends on Domain 1 WAR and Domain 5 leverage index
- Domain 3 Fame depends on Domain 2 Clutch — verify no circular (Fame should NOT feed back to Clutch)

Report any missing dependencies or circular refs as [DEPENDENCY-ERROR-NNN]

### Validation Check #5: Coverage of Phase B Triage Items (132 BUILDs)
The 132 triage items from Phase B are categorized as:
- CRITs (critical decisions)
- GAPs (spec gaps needing resolution)
- MISMs (mismatches between specs)
- BUILDs (actual features to build)
- NEWs (new features not in specs)

Check that every Phase B triage item is covered by at least one of the 6 BUILD_TEMPLATE files:
- [ ] For each item in TRIAGE_DECISIONS.md, verify it appears in at least one BUILD_TEMPLATE
- [ ] Report any uncovered items as [UNCOVERED-TRIAGE-NNN]
- [ ] Report any items covered multiple times (may indicate duplication across domains)

### Output Requirements

Create `spec-docs/CROSS_DOMAIN_VALIDATION.md` with:

#### Executive Summary
- Total issues found: [NUMBER]
- Critical issues: [NUMBER] — must fix before Phase B CLI
- Warnings: [NUMBER] — clarification recommended but may not block Phase B
- Status: CLEAN or ISSUES FOUND

#### Issues by Category

##### Broken Cross-Domain References
```
## [XREF-BROKEN-001]: Description
**Source Template:** Domain X, Section Y
**Referenced Template:** BUILD_TEMPLATE_[OTHER].md §Z
**Issue:** Reference points to section Z but section doesn't exist / section exists but doesn't discuss claimed content
**Recommendation:** Update source template §Y to reference correct section OR verify the reference is accurate
```

##### Interface Definition Mismatches
```
## [INTERFACE-MISMATCH-001]: Description (e.g., "Grade interface defined differently in Domain 3 and Domain 4")
**Severity:** CRITICAL / WARNING
**Domain 3 definition:** [show interface from BUILD_TEMPLATE_PLAYER_SYSTEMS.md]
**Domain 4 definition:** [show interface from BUILD_TEMPLATE_FRANCHISE_OFFSEASON.md]
**Issue:** Field X has type Y in Domain 3 but type Z in Domain 4
**Recommendation:** Standardize definition, then update both templates
```

##### Formula & Constant Mismatches
```
## [FORMULA-MISMATCH-001]: Description
**Severity:** CRITICAL / WARNING
**Domain X formula:** [show formula that references value]
**Domain Y source value:** [show value definition in domain Y]
**Mismatch:** Formula expects value X but Domain Y defines Y
**Recommendation:** [alignment suggestion]
```

##### Dependency Issues
```
## [DEPENDENCY-ERROR-001]: Description
**Dependency:** Domain X depends on [feature] from Domain Y
**Issue:** Feature doesn't exist in Domain Y / Feature is optional without clear condition / Circular dependency detected
**Recommendation:** [fix suggestion]
```

##### Uncovered Triage Items
```
## [UNCOVERED-TRIAGE-001]: Brief Description
**Triage Item ID:** CRIT-B1-001 (example)
**Status:** Not covered by any BUILD_TEMPLATE
**Expected Coverage:** Should appear in Domain X based on triage description
**Recommendation:** Add to BUILD_TEMPLATE_[DOMAIN].md or verify item is out of scope
```

#### Summary Statistics
- Total cross-domain references validated: [NUMBER] (found [NUMBER] issues)
- Total shared interfaces checked: [NUMBER] (found [NUMBER] mismatches)
- Total cross-domain formulas validated: [NUMBER] (found [NUMBER] inconsistencies)
- Total feature dependencies checked: [NUMBER] (found [NUMBER] errors)
- Total triage items covered: [NUMBER] / 132 (found [NUMBER] uncovered)

#### Resolution Priority
If CRITICAL issues exist:
1. List them in priority order
2. For each: show which domain templates must be updated
3. Recommend exact changes (cite source lines)

If no CRITICAL issues:
Output: "✓ CLEAN — all cross-domain references validated, no critical issues found"

#### Warnings / Clarifications Needed
List any WARNING-level issues with suggested clarifications.

### Validation Checklist
- [ ] All 6 BUILD_TEMPLATE files read completely
- [ ] CONTRADICTIONS.md read and reviewed
- [ ] TRIAGE_DECISIONS.md read and reviewed
- [ ] Validation Check #1: 100% of cross-domain references validated
- [ ] Validation Check #2: All shared interfaces checked for consistency
- [ ] Validation Check #3: All cross-domain formulas verified
- [ ] Validation Check #4: All feature dependencies validated
- [ ] Validation Check #5: All 132 triage items checked for coverage
- [ ] CROSS_DOMAIN_VALIDATION.md created with all issues/status
- [ ] Issues categorized by severity (CRITICAL vs WARNING)
- [ ] Recommendations provided for all issues

### If Issues Found
For EACH issue:
1. Show exact source location (file, section, line)
2. Show exact target location (file, section, line)
3. Provide copy-paste-ready fix suggestion
4. Estimate impact: which phase B CLI commands will be affected

### Success Criteria
Report "CLEAN — no cross-domain issues" only if:
- All 6 BUILD_TEMPLATE files exist and are readable
- All cross-domain references resolve correctly
- No interface is defined differently in two templates
- All formulas using values from other domains reference correct constants
- No circular dependencies between domains
- All Phase B triage items (132 BUILDs) are covered by at least one template

