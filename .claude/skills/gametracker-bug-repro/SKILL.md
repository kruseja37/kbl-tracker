---
name: gametracker-bug-repro
description: Reproduce-then-fix protocol for ANY GameTracker bug. Bug-agnostic — the skill defines the process, the prompt contract defines the specific bugs. Enforces test-driven fixes that prove the bug exists before fixing and prove the fix works after. Designed to prevent the #1 failure mode in AI-assisted bug fixing — code that compiles but doesn't solve the problem. Trigger on "repro and fix", "reproduce bug", "test-driven fix", or any request to fix GameTracker bugs using the reproduce-first protocol.
---

# GAMETRACKER BUG REPRO-THEN-FIX SKILL

## Why This Skill Exists

AI-generated bug fixes for stateful game engines fail in a specific, repeatable pattern:

1. The AI reads the code and correctly identifies the problem area
2. The AI writes code that addresses its UNDERSTANDING of the problem
3. The code compiles (`npm run build` passes)
4. The AI reports "COMPLETE"
5. The fix doesn't actually work in the browser

Root causes of this pattern:
- Functions are added to an API but never CALLED from the consuming code
- Functions are called but behind guard conditions that skip execution in the bug scenario
- State updates fire but are immediately overwritten by an async refresh or effect
- The fix targets the wrong layer (persistence works, but live state doesn't update)
- The AI tests its own mental model (via mocks) rather than the actual code

This skill makes all of these failures detectable BEFORE reporting completion.

---

## FAILURE MODES AND MITIGATIONS

### FM-1: Test can't instantiate the system under test
React hooks with deep dependencies (IndexedDB, persistence, engines) crash on import.
**Mitigation:** DO NOT use `renderHook` on complex hooks. Test at one of these levels:
- **Level A (preferred):** Import and test pure utility functions directly. No React, no mocking.
- **Level B:** Test hook API functions by extracting them or by testing the state transformation logic independently.
- **Level C (integration):** Use Playwright to drive the browser and assert on DOM content.
Use the EXISTING test patterns in `src/src_figma/__tests__/gameTracker/` — they use factory-created state objects and direct function imports. Follow their lead.

### FM-2: Test setup is impossibly complex
Reaching a specific game state (e.g., "runner on 2nd, 1 out") via sequential API calls requires many steps that can each fail.
**Mitigation:** Use factory functions to construct precondition state directly:
```typescript
const state = createGameState({ outs: 1, bases: { first: false, second: true, third: false } });
```
Don't try to play 5 at-bats to reach the precondition — construct it.

### FM-3: Bug is in the wiring layer, not the logic layer
The function works correctly when called directly. The bug is that the consuming component doesn't call it, calls it with wrong args, or another effect overwrites the result.
**Mitigation:** Test at BOTH levels:
1. Unit test: verify the function works (Level A)
2. Wiring verification: `grep` the source to verify the function IS CALLED (Step 2.5). Not "exists in imports" — actually CALLED with arguments.

### FM-4: AI tests its own understanding via mocks
Mocking core functions and testing that mocks are called proves the AI's mental model, not the code.
**Mitigation:** RULE: At least one test must import and execute ACTUAL production code. If everything is mocked, the test level is wrong.

### FM-5: Context exhaustion on large files
Files may be 5000-7000+ lines. Can't hold multiple large files in context simultaneously.
**Mitigation:** Use `grep` + targeted line ranges. NEVER read a full large file. Search for the function name, read only the relevant 50-100 lines.

### FM-6: Functions exist but are never called (THE #1 ACTUAL FAILURE)
The AI adds functions to an API, imports them in the consuming file, and reports "wired." But there are zero CALL sites — the function is imported and destructured but never invoked in any code path.
**Mitigation:** MANDATORY Step 2.5 wiring verification. After ANY fix, grep for every function that should be called. Count CALL sites (not import sites). Zero calls = fix is broken.

---

## TEST INFRASTRUCTURE

The project has existing working tests in `src/src_figma/__tests__/gameTracker/`. The established patterns:

| File | Pattern | What It Tests |
|------|---------|--------------|
| `gameStateLogic.test.ts` | Factory-created state objects, pure assertions | Logic without React/hooks/IndexedDB |
| `gameTrackerRunnerCorrection.test.ts` | Direct function imports, no mocking | Utility function correctness |
| `gameTrackerPlayLog.test.ts` | Event → play log entry transformation | Data mapping |
| `undoSystem.test.ts` | Snapshot/restore mechanics | Undo behavior |

**Use these patterns.** New bug-fix tests go in `src/src_figma/__tests__/gameTracker/` alongside existing tests. File naming: `bugfix-[ID].test.ts` (or `.test.tsx` if JSX is needed).

---

## THE PROTOCOL — 8 Steps

### Step 0: Identify the Exact Code Path

For the specific bug being fixed, answer these by READING CODE (not guessing):

1. **Which function handles this user action?** Find it with grep. Note file and line number.
2. **What does that function call?** List every downstream function it invokes. Note line numbers.
3. **What does that function NOT call that it SHOULD?** This is usually the bug.
4. **What state fields should change?** List the specific fields the user can observe (e.g., score in ScoreBug, outs indicator, base diamonds).
5. **What guards/conditions gate the calls?** Are there `if` statements that might skip execution?

Use targeted `grep` searches — NEVER read entire large files:
```bash
# Find the handler
grep -n "functionName" src/path/to/file.tsx | head -10
# Read just that function (50-100 lines from the match)
sed -n '4629,4780p' src/path/to/file.tsx
```

### Step 1: Write the Repro Test

Create a test file. Rules:
- Import ACTUAL production functions (not mocks of them)
- Use factory-created state objects for setup (follow existing test patterns)
- Test the EXACT function that's buggy, at the LEVEL where the bug exists
- Each assertion must check a value the user can OBSERVE in the UI
- Keep the test focused — one test per bug behavior, not a monolithic scenario

### Step 2: Run the Test — It MUST FAIL

```bash
npx vitest run src/src_figma/__tests__/gameTracker/bugfix-[ID].test.ts
```

| Outcome | Meaning | Action |
|---------|---------|--------|
| FAILS (assertion) | Bug reproduced ✓ | Proceed to Step 2.5 |
| PASSES | Test doesn't reproduce the bug | Rewrite the test — you're testing at the wrong level or wrong path |
| ERRORS (import/setup) | Test infrastructure issue | Simplify setup, drop to Level A, mock only infrastructure (not logic) |

### Step 2.5: MANDATORY WIRING VERIFICATION

This step catches FM-6 (the #1 failure mode). Run it BEFORE and AFTER every fix.

Identify every function that SHOULD be called in the bug's code path. For each one:

```bash
grep -n "functionName(" src/path/to/consuming-file.tsx | grep -v "^.*import\|^.*//\|^.*const.*=.*use"
```

The grep EXCLUDES import lines, comments, and hook destructuring. What remains are actual CALL sites.

Record the count for each function:
```
functionA: 0 call sites ← BUG (exists but never called)
functionB: 2 call sites ← OK (called in 2 places)
functionC: 1 call site, gated by `if (!condition)` ← SUSPECT (may be skipped)
```

If ANY function that should be called has 0 call sites, you've found the bug (or part of it).

### Step 3: Apply the Fix

Write the minimum code change. For each line you add or modify, verify:
- If it's a function CALL: the function EXISTS and is IMPORTED in this file
- If it's a conditional guard: the condition evaluates to TRUE in the bug scenario (trace with actual values, don't assume)
- If it's a state update: nothing else overwrites it in the same render cycle (search for other `setState` calls on the same field within the handler)

### Step 4: Re-run Wiring Verification

Same greps as Step 2.5. Compare results:

```
BEFORE FIX:
  functionA: 0 call sites
  functionB: 2 call sites

AFTER FIX:
  functionA: 1 call site ← NEW (this is the fix)
  functionB: 2 call sites ← UNCHANGED
```

**STOP condition:** If any function that should be called STILL shows 0 call sites after your fix, the fix is incomplete. Go back to Step 3.

### Step 5: Run the Repro Test — It MUST PASS

```bash
npx vitest run src/src_figma/__tests__/gameTracker/bugfix-[ID].test.ts
```

| Outcome | Meaning | Action |
|---------|---------|--------|
| PASSES | Fix works ✓ | Proceed to Step 6 |
| FAILS | Fix is wrong or incomplete | Read the failure message. Iterate on Step 3. Do NOT proceed. |

### Step 6: Run Full Suite — No Regressions

```bash
npm run build
npx vitest run 2>&1 | tail -10
```

Build must pass. No NEW test failures (pre-existing failures are documented and expected).

### Step 7: Smoke Test Script

Write and run a bash script tailored to the fix. The script verifies:

1. **Wiring counts:** Every function that should be called has >0 call sites
2. **Guard counts:** No guard conditions that would skip execution in the bug scenario
3. **Dead code:** No unreachable branches or functions that exist but never execute

Template:
```bash
#!/bin/bash
echo "=== WIRING CHECK ==="
for fn in functionA functionB functionC; do
  count=$(grep -c "$fn(" src/path/to/file.tsx 2>/dev/null || echo 0)
  imports=$(grep -c "import.*$fn\|$fn.*=" src/path/to/file.tsx 2>/dev/null || echo 0)
  calls=$((count - imports))
  echo "$fn: $count total refs, ~$calls call sites"
done

echo ""
echo "=== GUARD CHECK ==="
echo "Suspicious guards (expect 0):"
grep -n "!isLatest\|!isCurrent\|skip.*adjust\|skip.*correction" src/path/to/file.tsx || echo "None found"

echo ""
echo "=== DEAD CODE CHECK ==="
echo "Functions imported but never called:"
# For each expected function, check if it appears only in import/destructure
for fn in functionA functionB; do
  calls=$(grep "$fn(" src/path/to/file.tsx | grep -v "import\|const.*=.*use\|//" | wc -l)
  if [ "$calls" -eq 0 ]; then
    echo "  DEAD: $fn — imported but 0 calls"
  fi
done
```

Adapt the function names and file paths to the specific bug being fixed. Run the script. If ANY function shows "DEAD" or if suspicious guards are found, the fix is WRONG.

### Step 8: Report

```
BUG [ID] — REPRODUCE-THEN-FIX COMPLETE

Test file: [path]

Step 2 (repro): FAILED as expected
  - Assertion: [what failed]
  - Actual: [value]  Expected: [value]

Step 2.5 (wiring baseline):
  [function]: [N call sites] (status)
  [function]: [N call sites] (status)

Step 3 (fix):
  [file:line] — [what changed]
  [file:line] — [what changed]

Step 4 (wiring after fix):
  [function]: [N call sites] (was: M)
  [function]: [N call sites] (was: M)

Step 5 (test passes): PASSED
  - [assertion values confirmed]

Step 6 (regression): build PASS, vitest [X] passed / [Y] failed

Step 7 (smoke):
  - Wiring: all >0 ✓
  - Guards: none suspicious ✓
  - Dead code: none ✓
```

---

## RULES (non-negotiable)

1. **No fix without a failing test.** If you can't write a test that fails, you don't understand the bug.
2. **No "COMPLETE" without Step 2.5 + Step 4 wiring verification.** This catches the #1 failure mode (FM-6).
3. **No mocking core logic functions.** Mock infrastructure (IndexedDB, fetch) but never the function being tested.
4. **No full-file reads on files >500 lines.** Use grep + line ranges.
5. **No "it should work" declarations.** The test proves it works or it doesn't.
6. **Each bug gets its own test file.** Don't merge unrelated bugs into one test.
7. **Test names describe EXPECTED behavior.** "should decrement score when runner marked out" not "bug fix test."
8. **If a unit test can't reproduce the bug, drop to Playwright.** Don't force a unit test on an integration bug.
9. **Run the Step 7 smoke script EVERY TIME.** It catches dead wiring in 2 seconds.
10. **If smoke shows 0 call counts for any required function, the fix is WRONG.** Do not report complete.
11. **If wiring verification shows a function is called but gated by a condition, TRACE THE CONDITION.** Don't assume it evaluates to true — read the values at runtime or construct a test that proves it.
12. **Step 2 must fail BEFORE Step 3.** Never apply the fix before confirming the test reproduces the bug. If you wrote the test and the fix simultaneously, delete the fix, run the test, confirm failure, then re-apply.

---

## WHEN THE BUG SPANS MULTIPLE LAYERS

Some bugs have a root cause in one layer and symptoms in another:

| Symptom Layer | Root Cause Layer | Test Strategy |
|--------------|-----------------|---------------|
| UI doesn't update (ScoreBug shows wrong score) | Hook function not called | Unit test on handler logic + wiring grep |
| Play log shows correction but game state doesn't | Handler updates display state but not engine state | Test both: display state AND engine state after correction |
| Fix works for one scenario but not another | Guard condition skips some cases | Write multiple test cases covering each scenario |
| Fix works immediately but reverts on next action | Async refresh overwrites the fix | Test the state AFTER a simulated subsequent action |

For multi-layer bugs: write tests at the LOWEST layer first (pure logic), then verify wiring UP to the symptom layer. If the lowest-layer test passes but the symptom persists, the bug is in the wiring — use grep to find the disconnection.

---

## ADAPTING TO NON-GAMETRACKER BUGS

This skill is written with GameTracker examples but the protocol is generic:
- Replace "gameState" with whatever state the user observes
- Replace "ScoreBug" with whatever UI component displays that state
- Replace the specific function names in greps with the relevant functions for the bug
- The 8-step protocol, failure modes, and rules apply to ANY stateful system where AI fixes tend to be cosmetic
