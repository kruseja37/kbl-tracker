---
name: failure-analyzer
description: Analyze GameTracker logic test failures to identify root causes, not just symptoms. Produces a dependency-aware bug report that shows which engine functions are broken, what other outcomes they affect, and the recommended fix order. Requires LOGIC_MATRIX_REPORT.md and results-full.json from test-executor. Trigger on "analyze failures", "diagnose test results", "what's broken", "root cause analysis", or as Step 5 after test execution completes.
---

# Failure Analyzer

## Purpose

Test execution tells you WHAT failed. This skill tells you WHY and WHAT TO FIX FIRST.

The key insight: most test failures share root causes. 200 failures might stem from 3 broken functions. This skill finds those 3 functions, maps their blast radius, and tells you the fix order that prevents regressions.

## Pre-Flight

1. Read `spec-docs/LOGIC_MATRIX_REPORT.md` — REQUIRED
2. Read `test-utils/results/results-full.json` — REQUIRED (raw failure data)
3. Read `spec-docs/ENGINE_API_MAP.md` — REQUIRED (function map for tracing)
4. Read `spec-docs/CURRENT_STATE.md` for known issues
5. Run `npm run build` — must exit 0

**If LOGIC_MATRIX_REPORT.md shows 0 failures → congratulate the user and STOP. Nothing to analyze.**

## Phase 1: Failure Clustering

Group failures by their **diff pattern**, not their input state.

```
CLUSTERING ALGORITHM:
1. Read all failures from results-full.json
2. For each failure, extract the "diff" object (fields where expected ≠ actual)
3. Create a signature from the diff fields: e.g., "bases:wrong,runsScored:wrong"
4. Group failures by signature
5. Within each signature group, further group by outcome type
6. Sort groups by size (largest group = most impactful root cause)
```

**Expected clusters:**
- "All GIDP outcomes have wrong out count" → one function handles DP outs
- "Runner on 2nd doesn't score on singles" → baserunning advancement function
- "Inning doesn't change after 3rd out" → inning transition function
- "Sac fly doesn't score run" → sac fly handler

**Output for each cluster:**
```markdown
### Cluster C-01: [Descriptive name]
**Failure signature**: [which fields are wrong]
**Affected outcome types**: [list]
**Affected base states**: [list]
**Total failures in cluster**: [count]
**Representative case**:
  Input: [state + outcome]
  Expected: [expected result]
  Actual: [actual result]
  Diff: [field-by-field comparison]
```

## Phase 2: Root Cause Tracing

For each cluster, trace backward from the wrong output to the responsible code.

```
TRACING PROTOCOL PER CLUSTER:

1. Identify the FIELD(S) that are wrong (e.g., bases, outs, runsScored)
2. Using ENGINE_API_MAP.md, find which function(s) SET that field
3. Read the function source code
4. Identify the logic branch that handles the failing outcome type
5. Find the specific line(s) where the logic diverges from expected behavior
6. Document: file, function, line number, what the code does vs what it should do

OUTPUT:
Root cause: [function name] in [file:line]
What it does: [actual behavior]
What it should do: [expected behavior per baseball rules / SMB4 mechanics]
Why it's wrong: [specific logic error — off-by-one, missing case, wrong condition, etc.]
```

### Tracing Techniques

**For wrong base states:**
- Find the runner advancement function
- Check if it handles the specific base configuration that failed
- Common bugs: hardcoded advancement that doesn't account for all 8 base states

**For wrong out counts:**
- Find the out-counting function
- Check if double plays add 2 outs (not 1)
- Check if sacrifice plays are counted differently

**For wrong run scoring:**
- Find the scoring function
- Check the force-out-on-3rd-out rule (runs don't count on force outs)
- Check if sac fly scoring is conditional on out count

**For wrong inning transitions:**
- Find the inning transition trigger
- Check if it fires at exactly 3 outs (not > 3)
- Check bottom-of-9th game-ending logic

## Phase 3: Dependency Graph

For each root cause function, map what ELSE it affects.

```
DEPENDENCY TEMPLATE:

Function: advanceRunners()
File: src/engines/gameEngine.ts:142
Called by:
  - processSingle() [line 87]
  - processDouble() [line 103]
  - processTriple() [line 119]
  - processWalk() [line 135]
  - processHBP() [line 141]
Affects outcomes: single, double, triple, walk, HBP
Affects fields: bases, runsScored

⚠️ FIXING THIS FUNCTION WILL CHANGE RESULTS FOR:
  - [X] single tests
  - [Y] double tests
  - [Z] walk tests
  - etc.

RETEST REQUIREMENT: After fixing advanceRunners(), re-run the FULL matrix
(not just the currently failing tests) because passing tests may regress.
```

## Phase 4: Fix Order Recommendation

Determine the optimal order to fix root causes.

```
FIX ORDER CRITERIA:
1. Fix shared functions FIRST (they affect the most tests)
2. Fix upstream functions before downstream (advanceRunners before processSingle)
3. Fix simple logic errors before structural issues
4. Fix functions with clear expected behavior before ambiguous ones

NEVER fix multiple root causes simultaneously — they may interact.
```

**Output:**
```markdown
## Recommended Fix Order

### Fix 1 (Highest Impact): advanceRunners()
- Cluster(s): C-01, C-03, C-07
- Tests affected: 847
- Fix type: Logic correction (wrong base advancement for occupied bases)
- Estimated complexity: Medium
- After fixing: Re-run full matrix. Expect C-01, C-03, C-07 to resolve.
  New failures may appear if previously-masked by this bug.

### Fix 2: handleDoublePlay()
- Cluster(s): C-02
- Tests affected: 192
- Fix type: Missing case (doesn't handle bases loaded DP)
- Estimated complexity: Low
- After fixing: Re-run full matrix. Expect C-02 to resolve.

### Fix 3: ...
```

## Phase 5: Ambiguity Report

Some failures may be ambiguous — the engine might be right and the oracle wrong, or the SMB4 rules might differ from standard baseball.

```
AMBIGUITY FLAGS:
For each root cause, assess:
1. Is the expected behavior clearly defined in SMB4_GAME_MECHANICS.md?
2. Is the expected behavior confirmed by a golden case?
3. Could the engine's behavior be intentional?

If ANY answer is "no" or "maybe" → flag for user decision.
```

**Output:**
```markdown
## Ambiguous Findings (Need User Decision)

### AMB-01: Does a single always score a runner from 2nd?
- Our oracle assumes: NO (conservative baserunning)
- Engine behavior: YES (scores from 2nd)
- Golden case GC-03 says: [whatever user confirmed]
- If engine is correct: 47 "failures" become passes
- User decision needed: Which baserunning model should the engine use?
```

## Output

Produce: `spec-docs/FAILURE_ANALYSIS_REPORT.md`

```markdown
# GameTracker Failure Analysis Report
Date: [date]
Source: LOGIC_MATRIX_REPORT.md ([date])
Total failures analyzed: [count]
Root causes identified: [count]
Ambiguous findings: [count]

## Summary
[2-3 sentences: how many failures, how many root causes, recommended approach]

## Failure Clusters
[Phase 1 output — each cluster with representative case]

## Root Causes
[Phase 2 output — each root cause with file:line, explanation]

## Dependency Graph
[Phase 3 output — which functions affect which outcomes]

## Recommended Fix Order
[Phase 4 output — ordered list with impact estimates]

## Ambiguous Findings
[Phase 5 output — items needing user decision]

## Re-Test Plan
After applying fixes, re-run the full logic matrix.
Expected changes:
- Cluster C-01: Should resolve (X tests)
- Cluster C-02: Should resolve (Y tests)
- New failures possible in: [outcomes affected by changed functions]
- Total re-test scope: FULL MATRIX (do not run partial)
```

Also update `spec-docs/SESSION_LOG.md` with analysis summary.

## What NOT to Do

- **Do NOT fix any code.** This skill analyzes. Use batch-fix-protocol for fixes.
- **Do NOT modify test results or the harness.**
- **Do NOT dismiss failures as "probably fine" — analyze every cluster.**
- **Do NOT assume the oracle is always right.** If the pattern suggests the engine is correct and the oracle is wrong, flag it as ambiguous.
- **Do NOT recommend fixing more than one root cause at a time.** Even in the report, make it clear: fix one, re-test, then fix the next.

## Anti-Hallucination Rules

- Do NOT claim a root cause without reading the actual source code at the identified file:line
- Do NOT count failures by hand — use the data from results-full.json
- Do NOT assume two clusters share a root cause unless you've traced both to the same function
- If you can't identify a root cause for a cluster, say so. "Unknown root cause — further investigation needed" is a valid finding.
- Do NOT skip the dependency graph. It's what prevents regressions during fixing.
- Read ENGINE_API_MAP.md for function relationships — do not guess the call graph
