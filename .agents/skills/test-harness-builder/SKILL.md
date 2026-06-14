---
name: test-harness-builder
description: Generate a self-contained test script that exhaustively tests every GameTracker state transition. Requires ENGINE_API_MAP.md and confirmed golden-cases.json. Produces a deterministic test harness with checkpoint-based progress tracking, self-test mode for validation, and integrity checks that prevent false completion claims. Trigger on "build test harness", "generate test matrix", "create test script", or as Step 3 after golden cases are confirmed.
---

# Test Harness Builder

## Purpose

Build a single executable test script that:
1. Tests EVERY combination of [base state × out state × outcome type]
2. Validates itself against the golden cases before running the full matrix
3. Tracks progress via checkpoints so it can resume after interruption
4. Produces tiered output (summary → failure clusters → individual failures)
5. Self-reports completeness (never claims success without running every test)

**This skill writes the script. It does NOT run the full matrix.** Execution is handled by the test-executor skill. However, it DOES run self-test mode to validate the harness.

## Pre-Flight

1. Read `spec-docs/ENGINE_API_MAP.md` — REQUIRED
2. Read `test-utils/golden-cases.json` — REQUIRED, must be user-confirmed
3. Verify golden cases are marked as confirmed (check for user approval markers)
4. Read the proof-of-life script output to confirm engine is callable
5. Run `npm run build` — must exit 0

**If ENGINE_API_MAP.md says the engine is React-coupled and proof-of-life failed:**
- STOP. The harness cannot be built until the engine is extractable.
- Document what needs to change and notify the user.

## Script Architecture

The harness is a SINGLE TypeScript file with clear sections:

```
test-utils/run-logic-matrix.ts

SECTION 1: Imports & Configuration
SECTION 2: Test Dimensions (enumerated from ENGINE_API_MAP.md)
SECTION 3: State Factory (creates valid game states)
SECTION 4: Oracle (defines expected outcomes for each state+outcome pair)
SECTION 5: Test Runner (iterates matrix, calls engine, compares results)
SECTION 6: Checkpoint System (saves/resumes progress)
SECTION 7: Output Formatter (tiered results)
SECTION 8: Self-Test Mode (validates harness against golden cases)
SECTION 9: Entry Point (CLI interface)
```

### Section 1: Imports & Configuration

```typescript
// Use EXACT import paths from ENGINE_API_MAP.md
import { [functions] } from '[exact path]';
import type { [types] } from '[exact path]';
import goldenCases from './golden-cases.json';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  outputDir: 'test-utils/results',
  checkpointFile: 'test-utils/results/checkpoint.json',
  batchSize: 100,  // Write checkpoint every N tests
  mode: process.argv[2] || 'full',  // 'self-test' | 'full' | 'resume'
};
```

### Section 2: Test Dimensions

**CRITICAL: These must be enumerated from the actual code, not assumed.**

```typescript
// Copy EXACTLY from ENGINE_API_MAP.md "Testable Dimensions" section
const OUTCOMES: string[] = [/* exact values from engine */];
const BASE_STATES: BaseState[] = [/* exact values from engine */];
const OUT_STATES: number[] = [0, 1, 2];
const INNING_STATES: InningState[] = [
  // For the logic matrix, test innings 1 (representative) and 9 (edge cases)
  // Full inning sweep is in the game simulator skill
  { number: 1, half: 'top' },
  { number: 1, half: 'bottom' },
  { number: 9, half: 'top' },
  { number: 9, half: 'bottom' },
];

// Self-documenting count
const EXPECTED_TOTAL = OUTCOMES.length * BASE_STATES.length * OUT_STATES.length * INNING_STATES.length;
console.log(`Expected total tests: ${EXPECTED_TOTAL}`);
```

### Section 3: State Factory

```typescript
function createGameState(
  bases: BaseState,
  outs: number,
  inning: InningState,
  score: [number, number] = [0, 0]
): GameState {
  // Build a VALID game state object matching the engine's type definition
  // Use the EXACT type structure from ENGINE_API_MAP.md
  return {
    // ... fill in all required fields
  };
}
```

**The state factory must produce states that the engine accepts without error.** If the engine requires fields beyond bases/outs/inning (like batting order, pitch count, etc.), initialize them to sensible defaults and document the defaults.

### Section 4: Oracle

The oracle defines what SHOULD happen for each state+outcome combination.

```typescript
interface ExpectedResult {
  outs: number;
  bases: BaseState;
  runsScored: number;
  inningChanged: boolean;
  gameOver: boolean;
  // Add fields as needed based on ENGINE_API_MAP.md
}

function getExpectedResult(
  state: GameState,
  outcome: string
): ExpectedResult {
  // Baseball rules engine — this is the "source of truth"
  // Implement based on:
  //   1. SMB4_GAME_MECHANICS.md (primary — SMB4-specific rules)
  //   2. Standard baseball rules (where SMB4 doesn't differ)
  //   3. User-confirmed golden cases (for baserunning assumptions)

  // IMPORTANT: Document every rule decision with a comment
  // Example:
  // Single: batter to 1st, runners advance 1 base (conservative model per golden case GC-03 confirmation)

  switch (outcome) {
    case 'single':
      return handleSingle(state);
    case 'double':
      return handleDouble(state);
    // ... etc
  }
}
```

**Oracle validation**: The oracle MUST agree with all 30 golden cases. This is verified in self-test mode.

### Section 5: Test Runner

```typescript
interface TestResult {
  id: string;  // "T-0001", "T-0002", etc.
  input: { bases: BaseState; outs: number; inning: InningState; outcome: string };
  expected: ExpectedResult;
  actual: any;  // Whatever the engine returns
  status: 'PASS' | 'FAIL' | 'ERROR';
  errorMessage?: string;
  diff?: Record<string, { expected: any; actual: any }>;  // Only populated on FAIL
}

function runTest(
  bases: BaseState,
  outs: number,
  inning: InningState,
  outcome: string,
  testId: string
): TestResult {
  const state = createGameState(bases, outs, inning);
  const expected = getExpectedResult(state, outcome);

  try {
    const actual = [engineFunction](state, outcome);  // Use exact function from ENGINE_API_MAP.md

    // Compare EVERY field in expected vs actual
    const diff = compareStates(expected, actual);
    const passed = Object.keys(diff).length === 0;

    return {
      id: testId,
      input: { bases, outs, inning, outcome },
      expected,
      actual,
      status: passed ? 'PASS' : 'FAIL',
      diff: passed ? undefined : diff,
    };
  } catch (error) {
    return {
      id: testId,
      input: { bases, outs, inning, outcome },
      expected,
      actual: null,
      status: 'ERROR',
      errorMessage: error.message,
    };
  }
}
```

**The comparison function must check EVERY field**, not just bases and outs. If the engine returns 20 fields, compare all 20.

### Section 6: Checkpoint System

```typescript
interface Checkpoint {
  lastCompletedIndex: number;
  totalExpected: number;
  results: TestResult[];
  timestamp: string;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.writeFileSync(CONFIG.checkpointFile, JSON.stringify(checkpoint, null, 2));
}

function loadCheckpoint(): Checkpoint | null {
  if (!fs.existsSync(CONFIG.checkpointFile)) return null;
  return JSON.parse(fs.readFileSync(CONFIG.checkpointFile, 'utf-8'));
}
```

Tests save progress every `batchSize` tests. On resume, skip already-completed tests.

### Section 7: Output Formatter

```typescript
function generateOutput(results: TestResult[]): void {
  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  const errored = results.filter(r => r.status === 'ERROR');

  // TIER 1: Summary (always generated)
  const summary = {
    total_expected: EXPECTED_TOTAL,
    total_run: results.length,
    total_passed: passed.length,
    total_failed: failed.length,
    total_errored: errored.length,
    complete: results.length === EXPECTED_TOTAL,  // INTEGRITY CHECK
    pass_rate: `${((passed.length / results.length) * 100).toFixed(1)}%`,
    timestamp: new Date().toISOString(),
  };

  // INTEGRITY FLAG
  if (!summary.complete) {
    summary.WARNING = `INCOMPLETE: Expected ${EXPECTED_TOTAL} tests but only ran ${results.length}`;
  }

  // TIER 2: Failure Clusters (group by outcome type and by failure reason)
  const failureClusters = groupFailures(failed);

  // TIER 3: Individual failures (full detail)
  const failureDetails = failed.map(f => ({
    id: f.id,
    input: f.input,
    expected: f.expected,
    actual: f.actual,
    diff: f.diff,
  }));

  // Write all tiers
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'results-summary.json'),
    JSON.stringify(summary, null, 2)
  );
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'results-clusters.json'),
    JSON.stringify(failureClusters, null, 2)
  );
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'results-full.json'),
    JSON.stringify({ summary, failureClusters, failureDetails, allResults: results }, null, 2)
  );

  // Human-readable markdown report
  generateMarkdownReport(summary, failureClusters, failureDetails);
}
```

### Section 8: Self-Test Mode

```typescript
function runSelfTest(): boolean {
  console.log('=== SELF-TEST MODE ===');
  console.log(`Running ${goldenCases.clusters.flatMap(c => c.cases).length} golden cases...`);

  let allPassed = true;

  for (const cluster of goldenCases.clusters) {
    console.log(`\nCluster: ${cluster.name}`);
    for (const gc of cluster.cases) {
      // Test the ORACLE (not the engine) against the golden case
      const oracleResult = getExpectedResult(
        createGameState(gc.input_state.bases, gc.input_state.outs, gc.input_state.inning),
        gc.outcome
      );
      const oracleMatch = deepEqual(oracleResult, gc.expected_output);

      // Test the ENGINE against the golden case
      let engineResult;
      try {
        engineResult = [engineFunction](
          createGameState(gc.input_state.bases, gc.input_state.outs, gc.input_state.inning),
          gc.outcome
        );
      } catch (e) {
        engineResult = { ERROR: e.message };
      }
      const engineMatch = deepEqual(engineResult, gc.expected_output);

      const oracleStatus = oracleMatch ? '✓' : '✗';
      const engineStatus = engineMatch ? '✓' : '✗';
      console.log(`  ${gc.id}: Oracle ${oracleStatus} | Engine ${engineStatus}`);

      if (!oracleMatch) {
        console.log(`    ORACLE MISMATCH on ${gc.id}:`);
        console.log(`    Expected: ${JSON.stringify(gc.expected_output)}`);
        console.log(`    Oracle:   ${JSON.stringify(oracleResult)}`);
        allPassed = false;
      }
      if (!engineMatch) {
        console.log(`    ENGINE MISMATCH on ${gc.id}:`);
        console.log(`    Expected: ${JSON.stringify(gc.expected_output)}`);
        console.log(`    Engine:   ${JSON.stringify(engineResult)}`);
        // Engine mismatches are EXPECTED (that's why we're testing)
        // But oracle mismatches are HARNESS BUGS
      }
    }
  }

  if (allPassed) {
    console.log('\n=== SELF-TEST PASSED: Oracle agrees with all golden cases ===');
    console.log('The test harness is safe to run on the full matrix.');
  } else {
    console.log('\n=== SELF-TEST FAILED: Oracle disagrees with golden cases ===');
    console.log('DO NOT run the full matrix. Fix the oracle first.');
    console.log('The oracle (Section 4) has bugs that would produce wrong pass/fail results.');
  }

  return allPassed;
}
```

### Section 9: Entry Point

```typescript
async function main() {
  // Create output directory
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  if (CONFIG.mode === 'self-test') {
    const passed = runSelfTest();
    process.exit(passed ? 0 : 1);
  }

  if (CONFIG.mode === 'full' || CONFIG.mode === 'resume') {
    // GATE: Run self-test first, always
    console.log('Running self-test before full matrix...');
    const selfTestPassed = runSelfTest();
    if (!selfTestPassed) {
      console.error('ABORTING: Self-test failed. Fix oracle before running full matrix.');
      process.exit(1);
    }

    // Load checkpoint if resuming
    const checkpoint = CONFIG.mode === 'resume' ? loadCheckpoint() : null;
    const startIndex = checkpoint?.lastCompletedIndex ?? 0;
    const existingResults = checkpoint?.results ?? [];

    console.log(`\n=== FULL MATRIX: ${EXPECTED_TOTAL} tests ===`);
    if (startIndex > 0) {
      console.log(`Resuming from test ${startIndex}`);
    }

    // Generate all test combinations
    const tests = [];
    let testIndex = 0;
    for (const inning of INNING_STATES) {
      for (const bases of BASE_STATES) {
        for (const outs of OUT_STATES) {
          for (const outcome of OUTCOMES) {
            if (testIndex >= startIndex) {
              tests.push({ bases, outs, inning, outcome, id: `T-${String(testIndex).padStart(4, '0')}` });
            }
            testIndex++;
          }
        }
      }
    }

    // Run tests with checkpointing
    const results = [...existingResults];
    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const result = runTest(t.bases, t.outs, t.inning, t.outcome, t.id);
      results.push(result);

      // Progress logging
      if ((i + 1) % CONFIG.batchSize === 0) {
        const total = startIndex + i + 1;
        const pct = ((total / EXPECTED_TOTAL) * 100).toFixed(1);
        console.log(`Progress: ${total}/${EXPECTED_TOTAL} (${pct}%)`);
        saveCheckpoint({ lastCompletedIndex: total, totalExpected: EXPECTED_TOTAL, results, timestamp: new Date().toISOString() });
      }
    }

    // Final output
    generateOutput(results);

    // FINAL INTEGRITY CHECK
    if (results.length !== EXPECTED_TOTAL) {
      console.error(`\n⚠️  INCOMPLETE: Ran ${results.length} of ${EXPECTED_TOTAL} expected tests`);
      process.exit(2);
    } else {
      console.log(`\n✓ COMPLETE: All ${EXPECTED_TOTAL} tests executed`);
    }
  }
}

main().catch(console.error);
```

## Build Instructions for Claude Code

When Claude Code uses this skill, it should:

1. **Read ENGINE_API_MAP.md** and extract:
   - Exact import paths
   - Exact function signatures
   - Exact type definitions
   - Exact testable dimension values

2. **Read golden-cases.json** and ensure the oracle (Section 4) produces matching results for every case

3. **Write the complete script** to `test-utils/run-logic-matrix.ts`

4. **Run self-test mode ONLY**: `npx tsx test-utils/run-logic-matrix.ts self-test`

5. **Report self-test results:**
   - If ALL golden cases pass → harness is ready
   - If ANY oracle mismatch → fix the oracle and re-run self-test
   - Do NOT run the full matrix in this session

6. **DO NOT run the full matrix.** That's the test-executor skill's job. The separation is intentional — it prevents "fix the test to make it pass" behavior.

## Script Quality Requirements

The script must be:
- **Readable**: No clever one-liners. Each function does one thing. Comments explain WHY, not WHAT.
- **Deterministic**: No randomness. Same input → same output, every time.
- **Self-contained**: No external test framework needed (no Jest, no Mocha). Just TypeScript + Node.
- **Auditable**: Every test logs both expected and actual, so a human can verify any individual result.

## Output

1. `test-utils/run-logic-matrix.ts` — the complete test harness
2. Self-test execution results (logged to console and saved to `test-utils/results/self-test-results.json`)

## Integrity Checks

Before declaring complete:

1. ✅ Script compiles (`npx tsx --check test-utils/run-logic-matrix.ts` or equivalent)
2. ✅ Self-test mode has been executed (not just written)
3. ✅ All golden cases produce oracle matches in self-test
4. ✅ EXPECTED_TOTAL is calculated and logged
5. ✅ The checkpoint system works (can resume)
6. ✅ Output format produces all three tiers
7. ✅ The script uses EXACT imports from ENGINE_API_MAP.md (not guessed paths)

## Anti-Hallucination Rules

- Do NOT claim self-test passed without running it
- Do NOT modify golden cases to match the oracle — fix the oracle to match the golden cases
- Do NOT run the full matrix in this session — that's a separate skill/session
- Do NOT simplify the oracle to "always return X" — it must implement actual baseball rules
- Do NOT skip the self-test gate — it's the only thing preventing a buggy harness from producing meaningless results
- If the engine's return type doesn't match what the oracle expects, document the mismatch and STOP
