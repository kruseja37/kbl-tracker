---
name: golden-case-generator
description: Generate a curated set of 30 hand-verifiable test cases for the GameTracker engine, clustered by outcome category with baseball reasoning for each. These golden cases serve as the oracle anchor — they validate BOTH the test harness AND the engine. Requires ENGINE_API_MAP.md from engine-discovery skill. Trigger on "generate golden cases", "create test oracle", "build verification cases", or as Step 2 after engine-discovery completes.
---

# Golden Case Generator

## Purpose

The golden cases are the ANCHOR for the entire testing pipeline. They serve two roles:
1. **Validate the engine** — if the engine gets these wrong, it has bugs
2. **Validate the test harness** — if the harness says these fail but the engine is correct, the harness has bugs

Because they serve dual purpose, every case must be **unambiguously correct** according to baseball rules (specifically SMB4 rules where they differ).

## Pre-Flight

1. Read `spec-docs/ENGINE_API_MAP.md` — REQUIRED. If this file doesn't exist, STOP. Run engine-discovery first.
2. Read `spec-docs/SMB4_GAME_MECHANICS.md` — for SMB4-specific rules
3. Confirm the testable dimensions from ENGINE_API_MAP.md:
   - Exact outcome types the engine accepts
   - Exact base state representations
   - Exact out state representations
   - The function signature for the entry point

## Coverage Matrix

The 30 cases must cover ALL of the following. Each cell must appear in at least one case:

### Outcome Coverage (every outcome type at least once):
```
REQUIRED OUTCOMES:
□ Single          □ Strikeout (swinging)
□ Double          □ Strikeout (looking) [if distinct in engine]
□ Triple          □ Ground out
□ Home Run        □ Fly out
□ Walk (BB)       □ Line out [if distinct in engine]
□ HBP             □ Double play (GIDP)
□ Error/ROE       □ Sacrifice fly
                  □ Sacrifice bunt
                  □ Fielder's choice
```

### Base State Coverage (every configuration at least once):
```
REQUIRED BASE STATES:
□ Empty (no runners)
□ Runner on 1st only
□ Runner on 2nd only
□ Runner on 3rd only
□ Runners on 1st + 2nd
□ Runners on 1st + 3rd
□ Runners on 2nd + 3rd
□ Bases loaded (1st + 2nd + 3rd)
```

### Out State Coverage:
```
□ 0 outs
□ 1 out
□ 2 outs
```

### Critical Transitions:
```
□ At least 1 case where 3rd out is recorded (inning transition)
□ At least 1 case in bottom of 9th (potential game-ending)
□ At least 1 case where runs score
□ At least 1 case where runs DON'T score on 3rd out (force out)
□ At least 1 case with 2 outs + runner scores before 3rd out (timing rule)
```

After generating cases, CHECK the coverage matrix. Every box must be checked. If any box is unchecked, add or modify cases to fill the gap.

## Case Format

Each case uses the EXACT types from ENGINE_API_MAP.md. Use the actual values the engine expects, not abstract descriptions.

```json
{
  "id": "GC-01",
  "category": "Hits - Single",
  "description": "Single with runner on 2nd, 0 outs",
  "input_state": {
    // Use EXACT field names from the GameState type in ENGINE_API_MAP.md
    // Example (adapt to actual type):
    "outs": 0,
    "bases": [false, true, false],  // or however the engine represents it
    "inning": 1,
    "half": "top",
    "score": [0, 0]
  },
  "outcome": "single",  // Use EXACT value the engine accepts
  "expected_output": {
    "outs": 0,
    "bases": [true, false, true],  // runner advances 2nd→3rd (conservative), batter on 1st
    "score": [0, 0],               // no run scores (runner held at 3rd)
    "runs_scored_this_play": 0
  },
  "reasoning": "On a single with a runner on 2nd and 0 outs, the conservative baserunning assumption is: runner advances one base (2nd→3rd), batter takes 1st. No run scores because the runner stops at 3rd. In SMB4, baserunning is simplified — check SMB4_GAME_MECHANICS.md for whether singles always score from 2nd.",
  "alternative_if_aggressive": "If the engine uses aggressive baserunning, the runner on 2nd scores. Expected: score +1, bases = [true, false, false].",
  "edge_case_notes": "This case tests the runner advancement model. The engine may handle this differently depending on whether it models conservative vs aggressive baserunning."
}
```

### Required Fields Per Case:
- **id**: GC-01 through GC-30
- **category**: Cluster label (see categories below)
- **description**: One-line plain English
- **input_state**: EXACT state object using actual engine types
- **outcome**: EXACT outcome value the engine accepts
- **expected_output**: EXACT expected state after outcome
- **reasoning**: WHY this is the correct result, citing baseball rules
- **alternative_if_aggressive**: If the expected result depends on a baserunning assumption, document BOTH possibilities. The user will confirm which one their engine uses.
- **edge_case_notes**: What makes this case tricky or important

## Case Categories (Clusters for Human Review)

Present cases in these clusters so the reviewer can focus on one concept at a time:

```
Cluster 1: Hits (5 cases)
  - Single with various base states
  - Double with runners
  - Triple (all runners score)
  - Home run (everyone scores)

Cluster 2: Walks & HBP (3 cases)
  - Walk with bases empty (simple)
  - Walk with bases loaded (force run home)
  - HBP with runner on 1st (force advance)

Cluster 3: Standard Outs (4 cases)
  - Strikeout (no base changes)
  - Ground out (no runners)
  - Fly out (no runners)
  - Ground out with runner on 1st, less than 2 outs (force at 2nd)

Cluster 4: Double Plays (3 cases)
  - GIDP with runner on 1st, 0 outs (classic 6-4-3)
  - GIDP with runners on 1st+2nd, 0 outs (lead runner out)
  - GIDP with bases loaded, 1 out (inning ends + force play run scoring rule)

Cluster 5: Sacrifice Plays (3 cases)
  - Sac fly with runner on 3rd, 0 outs (run scores, batter out)
  - Sac fly with runner on 3rd, 2 outs (run does NOT score — 3rd out)
  - Sac bunt with runner on 1st, 0 outs (runner advances, batter out)

Cluster 6: Fielder's Choice & Errors (3 cases)
  - FC with runner on 1st (runner out at 2nd, batter safe at 1st)
  - Error/ROE with bases empty (batter reaches)
  - Error/ROE with runner on 2nd (runner advances, batter reaches)

Cluster 7: Inning & Game Transitions (5 cases)
  - 3rd out via strikeout, top of 5th → transition to bottom of 5th
  - 3rd out with runner on base → runner stranded, no runs
  - Bottom of 9th, home team ahead → game should end (no bottom half)
  - Walk-off home run (bottom 9th, tie game, HR → game over)
  - 2 outs, runner on 3rd, ground out → run scores IF runner crosses before force out (timing rule)

Cluster 8: Scoring Edge Cases (4 cases)
  - Grand slam (4 runs score)
  - Runner on 3rd scores on single (1 run)
  - Bases loaded walk (1 run, all runners advance one base)
  - Run scores on sac fly but NOT on 3rd out (verify the distinction)
```

**Total: 30 cases across 8 clusters**

## Adaptation to Actual Engine

**CRITICAL:** The cases above are TEMPLATES. You MUST adapt them to the actual engine:

1. Read ENGINE_API_MAP.md for the exact field names and value formats
2. If the engine uses different outcome strings (e.g., "SINGLE" not "single"), use the engine's strings
3. If the engine represents bases differently (booleans vs. array vs. bitfield), use the engine's representation
4. If the engine doesn't support a certain outcome type, SKIP that case and note it
5. If the engine has outcomes not listed here, ADD cases for those outcomes

**The golden cases must be executable against the actual engine, not theoretical.**

## Baserunning Assumption Flags

Many cases depend on the engine's baserunning model. For EACH case where runner advancement is ambiguous, document both possibilities:

- **Conservative**: Runners advance minimum bases (single = 1 base advance)
- **Aggressive**: Runners advance maximum reasonable bases (single can score from 2nd)

Mark these cases with `"baserunning_assumption": "NEEDS_USER_CONFIRMATION"` so the user can quickly find and resolve them during review.

## Output

Produce TWO files:

### 1. `test-utils/golden-cases.json`
```json
{
  "generated": "[date]",
  "engine_api_map_version": "[date from ENGINE_API_MAP.md]",
  "total_cases": 30,
  "coverage": {
    "outcomes_covered": ["single", "double", ...],
    "outcomes_not_covered": [],
    "base_states_covered": ["empty", "1B", "2B", ...],
    "base_states_not_covered": [],
    "out_states_covered": [0, 1, 2],
    "transitions_covered": ["inning_change", "game_end", "run_scoring", "force_out_no_score"]
  },
  "cases_needing_user_confirmation": ["GC-03", "GC-07", ...],
  "clusters": [
    {
      "name": "Hits",
      "cases": [ ... ]
    },
    ...
  ]
}
```

### 2. `spec-docs/GOLDEN_CASES_REVIEW.md`
A human-readable version organized by cluster for easy review:

```markdown
# Golden Cases Review Document
Generated: [date]
Status: AWAITING USER REVIEW

## How to Review
- Read each cluster (takes ~3 minutes per cluster)
- For each case, verify the "expected_output" matches your understanding
- Pay special attention to cases marked ⚠️ NEEDS CONFIRMATION
- Mark each cluster: ✅ APPROVED or ❌ NEEDS REVISION (with notes)

## Cluster 1: Hits
### GC-01: Single with runner on 2nd, 0 outs
[human-readable description with reasoning]
⚠️ NEEDS CONFIRMATION: Does your engine score the runner from 2nd on a single?

...
```

## Integrity Checks

Before declaring complete:

1. ✅ Exactly 30 cases produced
2. ✅ Every outcome type from ENGINE_API_MAP.md appears in at least one case
3. ✅ Every base state appears in at least one case
4. ✅ All three out states (0, 1, 2) appear
5. ✅ At least one inning transition case exists
6. ✅ At least one game-ending case exists
7. ✅ At least one scoring case and one non-scoring-on-3rd-out case exist
8. ✅ All input/output states use EXACT types from ENGINE_API_MAP.md
9. ✅ All ambiguous baserunning cases are flagged for user confirmation
10. ✅ Coverage matrix in the JSON has no gaps

## Anti-Hallucination Rules

- Do NOT invent outcome types that don't exist in the engine — use only what ENGINE_API_MAP.md lists
- Do NOT assume base representation format — use the exact format from the engine's types
- Do NOT present cases as "obviously correct" if the baserunning model is unknown — flag for confirmation
- If ENGINE_API_MAP.md is missing or incomplete, STOP. Run engine-discovery first.
- Every "expected_output" must have documented reasoning. No "this is just how baseball works."
- Check SMB4_GAME_MECHANICS.md before assuming any real-baseball rule applies — SMB4 is simplified

## User Gate

**This skill's output REQUIRES user review before the pipeline continues.**

After producing the files, tell the user:
1. Open `spec-docs/GOLDEN_CASES_REVIEW.md`
2. Review each cluster (~20 minutes total)
3. Resolve all ⚠️ NEEDS CONFIRMATION items
4. Mark clusters as ✅ or ❌
5. Return confirmed file to enable the test-harness-builder skill

**Do NOT proceed to test-harness-builder until the user has confirmed the golden cases.**
