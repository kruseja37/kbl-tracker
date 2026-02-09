# GameTracker Testing Pipeline — Orchestration Guide

## Overview

This document describes how to run the full GameTracker logic testing pipeline using 5 chained skills. Each skill is a separate Claude Code session with defined inputs, outputs, and gates.

**Total pipeline time:** ~2-3 hours (including ~50 min of your review time)
**Claude Code sessions:** 5 (each independent, context-loss-safe)
**Goal:** 100% coverage of game state transitions with documented results

## Pipeline Architecture

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  Skill 1:        │     │  Skill 2:            │     │  Skill 3:            │
│  engine-discovery │────▶│  golden-case-gen     │────▶│  test-harness-builder│
│                  │     │                      │     │                      │
│  Output:         │     │  Output:             │     │  Output:             │
│  ENGINE_API_MAP  │     │  golden-cases.json   │     │  run-logic-matrix.ts │
│  proof-of-life   │     │  REVIEW.md           │     │  self-test results   │
└──────────────────┘     └──────────────────────┘     └──────────────────────┘
        │                         │                            │
    [5 min gate]            [20 min gate]                [10 min gate]
                                                               │
                                                               ▼
                          ┌──────────────────────┐     ┌──────────────────────┐
                          │  Skill 5:            │     │  Skill 4:            │
                          │  failure-analyzer    │◀────│  test-executor       │
                          │                      │     │                      │
                          │  Output:             │     │  Output:             │
                          │  FAILURE_ANALYSIS    │     │  LOGIC_MATRIX_REPORT │
                          │  _REPORT.md          │     │  results-full.json   │
                          └──────────────────────┘     └──────────────────────┘
                                  │                            │
                             [15 min gate]               [no gate — auto]
                                  │
                                  ▼
                          ┌──────────────────────┐
                          │  Existing Skill:     │
                          │  batch-fix-protocol  │
                          │  (apply fixes)       │
                          └──────────────────────┘
```

## Step-by-Step Execution

### Step 1: Engine Discovery

**Claude Code prompt:**
```
Use the engine-discovery skill. Map the GameTracker engine API surface, 
produce ENGINE_API_MAP.md and a proof-of-life script, then run the 
proof-of-life script.
```

**Expected duration:** 15-30 minutes
**Your review:** ~5 minutes

**What to check:**
- Does ENGINE_API_MAP.md list functions you recognize?
- Did proof-of-life pass?
- Are the testable dimensions (outcomes, base states) complete?

**Kill conditions:**
- Proof-of-life fails → engine needs extraction/refactoring before testing
- Functions not found → codebase structure is different than expected

**If it fails:** The skill will document what's wrong. You may need to:
- Extract game logic from React components into pure functions
- Create a shim layer that mocks React dependencies
- This is one-time work that unlocks the entire pipeline

---

### Step 2: Golden Case Generation

**Claude Code prompt:**
```
Use the golden-case-generator skill. Read ENGINE_API_MAP.md and 
produce 30 golden test cases for my review. Cluster them by category 
with reasoning for each case.
```

**Expected duration:** 20-30 minutes
**Your review:** ~20 minutes (this is the most important review)

**What to check:**
- Open `spec-docs/GOLDEN_CASES_REVIEW.md`
- Review each cluster (~3 min each, 8 clusters)
- For ⚠️ NEEDS CONFIRMATION cases: decide the baserunning model
- Mark each cluster ✅ or ❌

**Kill conditions:**
- Cases use wrong field names (mismatch with ENGINE_API_MAP.md)
- Outcome types don't match what the engine actually accepts
- Coverage matrix has gaps

**After review:** Tell Claude Code which cases to revise, or confirm all clusters.

---

### Step 3: Test Harness Building

**Claude Code prompt:**
```
Use the test-harness-builder skill. Read ENGINE_API_MAP.md and 
the confirmed golden-cases.json. Build the test harness and run 
self-test mode. Do NOT run the full matrix.
```

**Expected duration:** 30-45 minutes
**Your review:** ~10 minutes (skim the script structure)

**What to check:**
- Self-test results: do all 30 golden cases show oracle match?
- Script structure: does it use the right imports?
- EXPECTED_TOTAL count: does it match your mental math?

**Kill conditions:**
- Self-test fails (oracle disagrees with golden cases) → fix oracle, re-run self-test
- Script won't compile → import paths wrong, revisit ENGINE_API_MAP.md
- EXPECTED_TOTAL is 0 or unreasonably small → dimensions not enumerated correctly

---

### Step 4: Test Execution

**Claude Code prompt:**
```
Use the test-executor skill. Run the full logic matrix. 
Do not fix anything — just run and report.
```

**OR, run it yourself without Claude Code:**
```bash
npx tsx test-utils/run-logic-matrix.ts full
```

**Expected duration:** 5-15 minutes (script runtime)
**Your review:** No gate needed — results are in files

**What to check (automated):**
- `results-summary.json` → `complete: true`
- `total_run === total_expected`
- No WARNING field

**If incomplete:** Use `npx tsx test-utils/run-logic-matrix.ts resume` to continue from checkpoint.

---

### Step 5: Failure Analysis

**Claude Code prompt:**
```
Use the failure-analyzer skill. Read the test results and 
ENGINE_API_MAP.md. Produce a root cause analysis with 
dependency graph and fix order recommendation.
```

**Expected duration:** 20-30 minutes
**Your review:** ~15 minutes

**What to check:**
- Do the root causes make sense?
- Is the fix order logical?
- Are ambiguous findings flagged (not assumed)?

**After review:** Use the batch-fix-protocol skill to apply fixes one at a time, re-running the full matrix after each fix.

---

## File Inventory

After the full pipeline, these files should exist:

```
spec-docs/
├── ENGINE_API_MAP.md              (Skill 1)
├── GOLDEN_CASES_REVIEW.md         (Skill 2)
├── LOGIC_MATRIX_REPORT.md         (Skill 4)
├── FAILURE_ANALYSIS_REPORT.md     (Skill 5)
└── SESSION_LOG.md                 (updated by Skills 4, 5)

test-utils/
├── proof-of-life.ts               (Skill 1)
├── golden-cases.json              (Skill 2)
├── run-logic-matrix.ts            (Skill 3)
└── results/
    ├── self-test-results.json     (Skill 3)
    ├── checkpoint.json            (Skill 4, if interrupted)
    ├── results-summary.json       (Skill 4)
    ├── results-clusters.json      (Skill 4)
    └── results-full.json          (Skill 4)
```

## Troubleshooting

### "Engine is React-coupled" (Skill 1 fails proof-of-life)
The game logic is tangled with React hooks/context. Options:
1. Extract pure logic functions from hooks into separate files
2. Create mock providers for testing
3. Use Vitest with React testing utilities instead of raw Node

### "Self-test fails" (Skill 3 oracle disagrees with golden cases)
The test harness's baseball rules engine has bugs. Options:
1. Re-read the golden case reasoning — is the golden case actually correct?
2. Check SMB4_GAME_MECHANICS.md — does SMB4 differ from standard baseball here?
3. Fix the oracle's rule implementation, not the golden case

### "Script crashes mid-matrix" (Skill 4)
The engine throws on a specific input. This IS a finding — the engine has a crash bug.
1. Note which input caused the crash
2. Resume from checkpoint
3. The crash will appear in the report as an ERROR-status test

### "Too many failures to analyze" (Skill 5)
If >50% of tests fail, the engine likely has fundamental issues.
1. Focus on the largest failure cluster first
2. Fix that one root cause
3. Re-run the matrix — many other failures may resolve
4. Repeat until failure count is manageable

### "Oracle and engine disagree, but I'm not sure who's right"
This is what the ambiguity report is for.
1. Check if a golden case covers this scenario
2. If not, manually play the scenario in SMB4 and note the real behavior
3. Update the oracle OR the engine based on SMB4's actual behavior

## Iteration Cycle

After the first pipeline run:

```
1. Review FAILURE_ANALYSIS_REPORT.md
2. Fix root cause #1 using batch-fix-protocol
3. Re-run full matrix (Skill 4)
4. If new failures appear → run failure-analyzer again (Skill 5)
5. Fix root cause #2
6. Repeat until pass rate is acceptable
```

Each fix-and-retest cycle takes ~20-30 minutes. Budget 3-5 cycles for a typical codebase.
