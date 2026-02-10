---
name: test-executor
description: Execute the full GameTracker logic test matrix and produce tiered results. Requires a validated test harness from test-harness-builder. This skill is intentionally simple — it runs a script and validates the output. The separation from the harness builder prevents "fix the test to make it pass" antipatterns. Trigger on "run test matrix", "execute tests", "run logic tests", or as Step 4 after the test harness self-test passes.
---

# Test Executor

## Purpose

Run the test harness. Validate the output. Produce a human-readable report. That's it.

This skill is deliberately minimal. The complexity lives in the harness (built by test-harness-builder). This skill just executes it and validates the results are complete and well-formed.

## Pre-Flight

1. Verify `test-utils/run-logic-matrix.ts` exists
2. Verify `test-utils/results/self-test-results.json` exists and shows ALL PASS
3. If self-test results don't exist or show failures → STOP. Run test-harness-builder first.
4. Run `npm run build` — must exit 0 (ensure no code changes broke things)

## Execution

### Step 1: Run the Matrix

```bash
npx tsx test-utils/run-logic-matrix.ts full
```

**Monitor the output.** The script logs progress every 100 tests. If it stalls for more than 30 seconds, something is wrong.

**If the script crashes mid-run:**
1. Check the error message
2. If it's a runtime error in the engine → document the crash state and outcome that caused it. This IS a test result (the engine crashes on that input).
3. If it's an import/module error → the harness has a bug. Do NOT fix it in this session. Report back to the user.
4. Try resuming: `npx tsx test-utils/run-logic-matrix.ts resume`

### Step 2: Validate Output

After the script completes, check:

```
REQUIRED OUTPUT FILES:
□ test-utils/results/results-summary.json
□ test-utils/results/results-clusters.json
□ test-utils/results/results-full.json
□ test-utils/results/logic-matrix-report.md
```

### Step 3: Integrity Validation

Read `results-summary.json` and verify:

```
INTEGRITY CHECKS:
1. total_run === total_expected
   → If NOT: Report as INCOMPLETE. Do not generate final report.

2. total_passed + total_failed + total_errored === total_run
   → If NOT: The harness has an accounting bug. Report to user.

3. complete === true
   → If false: The script flagged itself incomplete. Report to user.

4. No WARNING field present
   → If present: Read and report the warning.
```

**If any integrity check fails, do NOT proceed to generating the final report. Report the integrity failure to the user.**

### Step 4: Generate Human-Readable Report

If integrity checks pass, produce `spec-docs/LOGIC_MATRIX_REPORT.md`:

```markdown
# GameTracker Logic Matrix Test Report
Date: [date]
Harness version: [timestamp from self-test]
Engine API Map version: [timestamp from ENGINE_API_MAP.md]

## Executive Summary

- **Total tests**: [X]
- **Passed**: [Y] ([Y/X]%)
- **Failed**: [Z]
- **Errors**: [W] (engine crashed on these inputs)
- **Status**: [COMPLETE / INCOMPLETE]

## Failure Overview

### By Outcome Type
| Outcome | Tests | Passed | Failed | Error | Pass Rate |
|---------|-------|--------|--------|-------|-----------|
| single  | 96    | 90     | 6      | 0     | 93.8%     |
| ...     |       |        |        |       |           |

### By Base State
| Base State | Tests | Passed | Failed | Error | Pass Rate |
|------------|-------|--------|--------|-------|-----------|
| empty      | [X]   | ...    | ...    | ...   | ...       |
| ...        |       |        |        |       |           |

### By Out Count
| Outs | Tests | Passed | Failed | Error | Pass Rate |
|------|-------|--------|--------|-------|-----------|
| 0    | [X]   | ...    | ...    | ...   | ...       |
| 1    | ...   |        |        |       |           |
| 2    | ...   |        |        |       |           |

## Failure Clusters

[Group related failures together. Each cluster represents a probable single root cause.]

### Cluster 1: [Description — e.g., "Runner advancement on singles is wrong"]
**Affected tests**: [count]
**Pattern**: [What these failures have in common]
**Representative failure**:
  - Input: [state + outcome]
  - Expected: [what should happen]
  - Actual: [what did happen]
  - Diff: [specific fields that differ]

### Cluster 2: ...

## Error Cases (Engine Crashes)

[If any tests produced ERROR status, list them here. These represent inputs where the engine threw an exception.]

| Test ID | Input State | Outcome | Error Message |
|---------|-------------|---------|---------------|
| T-0042  | ...         | ...     | ...           |

## All Passing Outcomes

[Summary only — not individual results]
The following outcome types passed 100% of tests:
- [list]

## Raw Data Location

- Full results: test-utils/results/results-full.json
- Summary: test-utils/results/results-summary.json
- Failure clusters: test-utils/results/results-clusters.json
```

### Step 5: Update Project Docs

Append to `spec-docs/SESSION_LOG.md`:
```markdown
## Logic Matrix Test Execution — [date]
- Tests run: [total]
- Pass rate: [X]%
- Failures: [Y] across [Z] clusters
- Errors: [W]
- Report: spec-docs/LOGIC_MATRIX_REPORT.md
- Raw data: test-utils/results/
```

## What NOT to Do

- **Do NOT fix any bugs found.** This skill reports. The failure-analyzer skill diagnoses. The batch-fix-protocol skill fixes.
- **Do NOT modify the test harness.** If the harness has bugs, report them. Don't fix them here.
- **Do NOT modify the engine.** Same principle.
- **Do NOT re-run failed tests selectively.** The full matrix is the full matrix.
- **Do NOT declare "mostly passing" as success.** Report the exact numbers and let the user decide.

## Output

1. `spec-docs/LOGIC_MATRIX_REPORT.md` — human-readable report
2. `test-utils/results/` — raw JSON results (already produced by the harness)
3. Updated `spec-docs/SESSION_LOG.md`

## Anti-Hallucination Rules

- Do NOT claim the matrix completed without checking results-summary.json integrity
- Do NOT summarize results without reading the actual output files
- Do NOT skip the integrity validation step
- If the script produces no output files, the test FAILED, not "passed with no issues"
- Report exact numbers, not approximations
