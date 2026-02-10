---
name: batch-fix-protocol
description: Execute fixes from audit reports (spec-ui-alignment, gametracker-logic-tester, dummy-data-scrubber, ui-flow-crawler) in controlled batches with mandatory verification between each batch. Prevents applying all fixes at once and catching regressions early. Use when asked to "fix audit findings", "apply fixes", "execute fix plan", "implement recommendations", "fix in batches", or after any audit skill produces a report with recommended fixes. ALWAYS use this skill when transitioning from audit/diagnosis to implementation.
---

# Batch Fix Protocol

## Purpose

This skill enforces disciplined fix execution. It prevents the common failure mode of applying many fixes at once, then spending hours debugging which one broke things. Every fix batch gets verified before the next one starts.

## Architecture Note

**SHARED-SOURCE architecture** — fixes may touch BOTH directory trees:
- `src/engines/`, `src/utils/`, `src/types/` = CORE logic (shared by entire app)
- `src/src_figma/` = UI layer (pages, components, hooks). `@/` alias resolves here.
- **CORE fixes are HIGH RISK** — a change to `src/engines/bwarCalculator.ts` ripples through hooks, components, and pages
- **UI-only fixes are LOWER RISK** — contained to `src/src_figma/`
- **Wiring fixes** (connecting existing engines to UI) are MEDIUM RISK — new imports, new state management

## Cross-Boundary Fix Procedure

When a fix touches files in BOTH `src/engines/` (core) AND `src/src_figma/` (UI):

1. **Map the import chain first**: Find all files that import from the changed engine
   - Run: `grep -r "from.*../../../engines/[filename]" src/src_figma/`
2. **Check function signatures**: If you changed params/return types, update ALL callers
3. **Verify type compatibility**: Run `npm run build` to catch type mismatches
4. **Test at each boundary**: Engine unit test → Hook integration → Component render
5. **Document the chain**: In the fix report, list every file touched and why

**Rule**: Never fix an engine file without verifying its callers in src_figma. Never fix a hook without verifying its component consumers.

## When This Skill Activates

After ANY audit skill produces a report with fixes:
- `spec-docs/EXHAUSTIVE_AUDIT_FINDINGS.md` ← **PRIMARY** (from exhaustive-spec-auditor, Pipeline V2)
- `spec-docs/SPEC_UI_ALIGNMENT_REPORT.md` (from spec-ui-alignment, Pipeline V1)
- `spec-docs/GAMETRACKER_TEST_RESULTS_[DATE].md`
- `spec-docs/DUMMY_DATA_SCRUB_REPORT.md` (produced on demand; may not exist yet)
- `spec-docs/UI_FLOW_CRAWL_REPORT.md`
- `spec-docs/FIGMA_COMPLETION_MAP.md`

Or when the user says: "apply fixes", "fix these", "execute the plan", "implement recommendations"

### Parsing EXHAUSTIVE_AUDIT_FINDINGS.md
This report uses the same severity tiers (CRITICAL/MAJOR/MINOR) as SPEC_UI_ALIGNMENT_REPORT.
- **Critical Findings → Tier 1** fixes
- **Major Findings → Tier 2** fixes
- **Minor Findings → Tier 3** fixes
- **GAP Items** → Tier 2 or 3 depending on severity column
- **Previously Known Items** → SKIP (already addressed in prior pipeline run)
- **Undocumented Code** → NOT fixes — these are documentation TODOs, do not execute

## Pre-Flight

1. Read the audit report that produced the fix list
2. Read `spec-docs/CURRENT_STATE.md` for baseline
3. Read `spec-docs/DECISIONS_LOG.md` for prior decisions that may conflict
4. Run `npm run build` — must exit 0 (this is your BASELINE)
5. Run `npm test` — record pass count (this is your BASELINE)
6. **Save baseline numbers**: `BASELINE_BUILD=pass BASELINE_TESTS=[count]`

## Fix Classification

Classify every proposed fix into exactly ONE tier before starting:

### Tier 1: CRITICAL — Breaks active gameplay or corrupts data
- Wrong game state after an action
- Data loss on any operation (undo, save, transition)
- Stats calculated incorrectly (runs attributed wrong, outs miscounted)
- Score not updating when it should

### Tier 2: WIRING — Connect existing, tested code that's orphaned
- Engine exists with passing tests but is never called from UI
- Hook exists but no component uses it
- Storage function built but never invoked
- These are MEDIUM risk because the code already works in isolation

### Tier 3: SPEC CONSTANT — Simple value mismatches
- Wrong coefficient in a formula
- Missing enum value
- Incorrect threshold number
- These are LOW risk, usually one-line changes

### Tier 4: COSMETIC/DEAD CODE — UI labels, unused code removal
- Labels that don't match spec terminology
- Dead buttons with no handler
- Console.log cleanup
- Lowest risk

## Execution Rules

### Rule 1: ONE BATCH AT A TIME
Do NOT start Tier 2 until ALL of Tier 1 is verified. Do NOT start Tier 3 until Tier 2 is verified. Never skip tiers.

**Definition of "Tier Verified":**
- `tsc -b` exits 0 (no new type errors)
- `npm test` pass count >= baseline (5,025 — no regressions)
- All Verify Cycle steps completed without failures for every fix in the tier

### Rule 2: ONE FIX AT A TIME WITHIN CRITICALS
Within Tier 1, apply fixes ONE AT A TIME. Each critical fix gets its own verify cycle. This is non-negotiable because critical fixes interact with core game state.

### Rule 3: WIRING AND CONSTANTS CAN BATCH (with limits)
Within Tier 2 and 3, you may batch up to 3 related fixes together (e.g., three imports to the same file). But NEVER more than 3, and NEVER across unrelated systems.

### Rule 4: VERIFY AFTER EVERY BATCH
After each batch (or single critical fix), run the full verify cycle before proceeding.

### Rule 5: STOP ON REGRESSION
If verify fails, do NOT continue to the next fix. Diagnose and fix the regression FIRST. If the regression can't be resolved in 2 attempts, REVERT the batch and flag for user review.

**Batch Conflict Resolution:**
If a batch fails after a previous batch in the same tier succeeded:
1. Diagnose: Is this a new bug in the current batch, or does it conflict with a previous batch?
2. If conflict: Merge the conflicting batches and re-run together through verify cycle
3. If new bug: Fix within current batch, re-run verify
4. Document the dependency in the fix execution report

### Rule 6: DOCUMENT EVERYTHING
Every fix gets logged to the fix execution report. No silent changes.

## Verify Cycle (Run After Every Batch)

```
VERIFY CYCLE:
  1. npm run build          → Must exit 0 (no new type errors)
  2. npm test               → Pass count must be >= BASELINE_TESTS (no regressions)
  3. If fix touched src/engines/:
     → Read the changed function
     → Verify the logic matches the relevant spec doc
     → Check that all callers still pass correct args
  4. If fix touched useGameState.ts or any baseball logic engine:
     → Run `npx vitest run src/src_figma/__tests__/baseballLogic/ --reporter=verbose` to verify no test regressions
     → Verify no new baseball logic errors
  5. If fix wired a new engine/hook:
     → Verify the import chain: Engine → Hook → Component → UI renders
     → Check for null/loading state handling
  6. Console check: npm run dev → verify no new console errors at startup
```

### Abbreviated Verify (for Tier 3 and 4 only)
```
ABBREVIATED VERIFY:
  1. npm run build          → Must exit 0
  2. npm test               → Must not decrease pass count
  3. Quick visual check if UI-related
```
For UI-touching fixes: Start the dev server (`npm run dev`) and verify no white screen, no new console errors at startup, and the affected UI element renders correctly.

## Execution Template

For each fix, follow this exact structure:

```
## Fix [ID]: [Short description]
**Tier**: [1/2/3/4]
**Risk**: [HIGH/MEDIUM/LOW]
**Files Modified**: [list]
**Spec Reference**: [which spec doc, if applicable]

### What Was Wrong
[Exact description of the misalignment or bug]

### What I Changed
[Exact changes made, with file paths and line numbers]

### Why This Fixes It
[Reasoning — not just "updated the code"]

### Verify Results
- Build: [PASS/FAIL]
- Tests: [count] / [baseline] — [PASS/FAIL/REGRESSION]
- Logic check: [what was verified]
- Regression scan: [any side effects found?]

### Status: [COMPLETE / REVERTED / BLOCKED]
```

## Handling Specific Fix Types

### Fixing Undo/State Restore (like CRIT-01)
1. Read the CURRENT undo snapshot logic in useGameState.ts
2. Identify exactly what state is snapshotted vs what's missing
3. Add missing state to snapshot
4. Add missing state to restore
5. Verify: apply an outcome → undo → verify ALL state matches pre-outcome
6. Test: multiple undos in sequence, undo across inning boundary, undo on first at-bat

### Wiring Orphaned Engines (like MAJ-05 inheritedRunnerTracker)
1. Read the engine file — understand its API (inputs, outputs)
2. Read the existing tests — confirm they pass
3. Identify WHERE in useGameState.ts the engine should be called
4. Add the import
5. Add the call at the correct point in game flow
6. Verify: the engine's output is used (not just called and ignored)
7. Verify: existing game flow still works (engine call doesn't block/error)

### Fixing Spec Constants (like CRIT-06)
1. Read the spec doc — get the CORRECT value
2. Read the code — get the CURRENT value
3. Change code to match spec
4. Search entire codebase for hardcoded usages of the constant: `grep -r 'CONSTANT_VALUE' src/ --include='*.ts' --include='*.tsx'` and update ALL locations, not just the definition.
5. If the value is used in a calculation, verify the calculation output changes correctly
6. Log the change in DECISIONS_LOG.md if there's any ambiguity

## Post-Execution

After ALL tiers are complete:

1. Run full verify cycle one final time
2. Produce the fix execution report (template below)
3. Update `spec-docs/CURRENT_STATE.md` with all changes
4. Update `spec-docs/SESSION_LOG.md` with session summary
5. Update `spec-docs/DECISIONS_LOG.md` with any intentional spec divergences
6. **Ask user to confirm before marking complete**

## Audit Report Parsing Guide

Each audit skill produces reports with different formats. Here's how to extract fix items:

- **spec-ui-alignment** (`SPEC_UI_ALIGNMENT_REPORT.md`): Look for section headers `### CRIT-xx`, `### MAJ-xx`, `### MIN-xx`. Each section contains:
  - **File:** path and line range
  - **Problem:** description of the misalignment
  - **Fix:** recommended code change
  Extract each section as one fix item. Severity from prefix: CRIT = Tier 1, MAJ = Tier 2, MIN = Tier 3.

- **gametracker-logic-tester** (`GAMETRACKER_TEST_RESULTS_[DATE].md`): Look for table with columns: Story | Status | Notes. Status values:
  - `WORKING` = no fix needed
  - `PARTIAL` = fix needed (partial implementation)
  - `MISSING` = fix needed (not implemented)
  - `NOT TESTED` = needs investigation first, then may need fix
  Extract PARTIAL and MISSING rows as fix items.

- **dummy-data-scrubber** (`DUMMY_DATA_SCRUB_REPORT.md`): Created on demand — may not exist initially. When it does, look for tables listing File | Line | Dummy Value | Replacement Source | Status.

- **ui-flow-crawler** (`UI_FLOW_CRAWL_REPORT.md` + `FIGMA_COMPLETION_MAP.md`): Created on demand — may not exist initially. Crawl report uses PASS/FAIL/PARTIAL/BLOCKED classifications. Each FAIL and PARTIAL = one fix item.

**Note:** `DUMMY_DATA_SCRUB_REPORT.md`, `UI_FLOW_CRAWL_REPORT.md`, and `FIGMA_COMPLETION_MAP.md` are created on demand when their respective skills are run. They may not exist initially. The batch-fix-protocol is triggered AFTER an audit skill produces its report.

## Fix Execution Report Template

Save to `spec-docs/FIX_EXECUTION_REPORT_[DATE].md`:

```
# Fix Execution Report
Date: [date]
Source Audit: [which audit report triggered this]
Baseline: Build PASS, Tests [X] passing

## Summary
- Total fixes attempted: [count]
- Fixes completed: [count]
- Fixes reverted: [count]
- Fixes blocked (needs user): [count]
- Regressions caught and fixed: [count]
- Final state: Build PASS, Tests [Y] passing

## Tier 1: Critical Fixes
| ID | Description | Files | Verify | Status |
|----|------------|-------|--------|--------|

## Tier 2: Wiring Fixes
| ID | Description | Files | Verify | Status |
|----|------------|-------|--------|--------|

## Tier 3: Spec Constants
| ID | Description | Files | Verify | Status |
|----|------------|-------|--------|--------|

## Tier 4: Cosmetic/Cleanup
| ID | Description | Files | Verify | Status |
|----|------------|-------|--------|--------|

## Regressions Encountered
| Fix ID | Regression | Root Cause | Resolution |
|--------|-----------|------------|-----------|

## Blocked Items (Need User Decision)
| Fix ID | Description | Why Blocked | Options |
|--------|------------|-------------|---------|

## Test Count Delta
- Before: [X] tests passing
- After: [Y] tests passing
- New tests added: [Z]
- Tests that changed: [list if any]
```

## Anti-Hallucination Rules

- Do NOT claim a fix is complete without running the verify cycle
- Do NOT batch critical fixes — one at a time, always
- Do NOT continue past a failing verify — fix the regression first
- Do NOT assume a wired engine works in context just because its unit tests pass
- Do NOT silently revert a fix — document it in the report
- If a fix requires changing test expectations, that's a RED FLAG — verify the test was wrong, not the new code
- After 2 failed attempts to fix a regression, STOP and ask the user
- NEVER modify test files to make them pass — unless the test itself was testing the wrong behavior (document why)
