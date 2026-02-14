# KBL Tracker Complete Testing Pipeline — Orchestration Guide

## Overview

This guide orchestrates **15 skills** across **4 tiers** to achieve comprehensive testing of the entire KBL Tracker app. It's organized by priority so you can stop at any point and still have actionable findings.

**You don't need to run everything.** Each tier delivers standalone value. Start from the top.

---

## Tier 0: Truth Establishment (Foundation — Run First)

Before testing anything, establish what "correct" means. Without this, the testing pipeline produces unreliable results because it tests against stale or contradictory specs.

**The multiplier effect:** Tier 0 makes Tiers 1-3 ~10× more efficient by eliminating false positives and ambiguity in test results.

### Lean Approach (Recommended)

Don't spec the entire codebase upfront. Spec just what you need, just in time.

```
Step 0.1: Architecture Scan (run once)
  Skill: codebase-reverse-engineer (Mode A)
  Prompt: "Use the codebase-reverse-engineer skill in Mode A. 
           Scan the full architecture."
  Time: 45-60 min + 15 min review
  Output: ARCHITECTURE.md, CANONICAL_TYPES.md, FEATURE_INVENTORY.md, SPEC_TRIAGE.md
  Gate: confirm feature boundaries (~5 min, just scan the list)

Step 0.2: Deep Spec for Active Feature (run per-feature, on-demand)
  Skill: codebase-reverse-engineer (Mode B)
  Prompt: "Use the codebase-reverse-engineer skill in Mode B 
           for the [GameTracker / WAR calculations / etc.] feature."
  Time: 30-45 min + 15 min review per feature
  Output: spec-docs/canonical/features/[feature].md
  Gate: review discrepancies table, upgrade key sections from 🔴 to 🟢

  Run this for EACH feature you're about to test in Tiers 1-3.
  Recommended order:
    1. GameTracker (before GameTracker testing pipeline)
    2. Stats/Standings (before franchise pipeline)
    3. WAR Calculations (before calculation matrices)
    4. Season Management (before season simulator)
```

**After Tier 0, you have:**
- A verified architecture map
- Canonical type definitions (the data contract for everything)
- Feature inventory with confirmed boundaries
- Deep specs for your active development areas
- Clear list of discrepancies to investigate
- Your existing 100+ spec docs triaged (keep, archive, or replace)

**Total time:** ~2 hours for architecture scan + 1 feature deep spec.
Each additional feature: ~1 hour. Do them just-in-time, not all at once.

---

## Tier 1: Discovery & Static Analysis (Day 1, ~3 hours including review)

These skills give you the highest return on investment. Run these first regardless of what else you do.

```
Step 1.1: Engine Discovery (GameTracker)
  Skill: engine-discovery
  Prompt: "Use the engine-discovery skill. Map the GameTracker engine API."
  Time: 15-30 min + 5 min review
  Output: ENGINE_API_MAP.md, proof-of-life.ts
  Gate: proof-of-life passes

Step 1.2: Franchise Engine Discovery (run parallel with 1.1 if possible)
  Skill: franchise-engine-discovery  
  Prompt: "Use the franchise-engine-discovery skill. Map all non-GameTracker engines."
  Time: 20-40 min + 10 min review
  Output: FRANCHISE_API_MAP.md, franchise-proof-of-life.ts
  Gate: proof-of-life passes, pipeline architecture classified (A/B/C/D)
  
  *** DECISION POINT ***
  After this step, you know whether the season simulator can use Mode A (fast)
  or needs Mode C (slow). This affects all of Phase 3.

Step 1.3: Franchise Button Audit
  Skill: franchise-button-audit
  Prompt: "Use the franchise-button-audit skill. Audit all non-GameTracker pages."
  Time: 30-45 min + 10 min review
  Output: FRANCHISE_BUTTON_AUDIT.md, button-audit-data.json
  Gate: reconciliation integrity check passes
```

**After Tier 1, you have:**
- A complete map of every engine, function, and type in the app
- Knowledge of which buttons work, which are dead, and which are fake
- The pipeline architecture classification that determines testing strategy
- Actionable findings you can fix immediately (dead buttons, orphaned handlers)

---

## Tier 2: Should-Run (Day 2, ~3-4 hours including review)

These skills test logic correctness and data flow integrity.

```
Step 2.1: Golden Cases for GameTracker
  Skill: golden-case-generator
  Prompt: "Use the golden-case-generator skill."
  Time: 20-30 min + 20 min review (most important review)
  Output: golden-cases.json, GOLDEN_CASES_REVIEW.md
  Gate: you confirm all 30 cases

Step 2.2: Test Harness for GameTracker
  Skill: test-harness-builder
  Prompt: "Use the test-harness-builder skill. Run self-test only."
  Time: 30-45 min + 10 min review
  Output: run-logic-matrix.ts, self-test results
  Gate: self-test all golden cases pass

Step 2.3: Execute GameTracker Logic Matrix
  Skill: test-executor
  Prompt: "Use the test-executor skill. Run the full matrix."
  (Or just run: npx tsx test-utils/run-logic-matrix.ts full)
  Time: 5-15 min (script runtime)
  Output: LOGIC_MATRIX_REPORT.md, results-full.json
  Gate: none (automated)

Step 2.4: Data Pipeline Tracer (run parallel with 2.1-2.3 if possible)
  Skill: data-pipeline-tracer
  Prompt: "Use the data-pipeline-tracer skill."
  Time: 30-45 min + 15 min review
  Output: DATA_PIPELINE_TRACE_REPORT.md, pipeline-trace-data.json
  Gate: you review broken pipelines

Step 2.5: Failure Analysis (if GameTracker matrix had failures)
  Skill: failure-analyzer
  Prompt: "Use the failure-analyzer skill."
  Time: 20-30 min + 15 min review
  Output: FAILURE_ANALYSIS_REPORT.md
  Gate: you review fix order before applying fixes
```

**After Tier 2, you have:**
- Complete logic test results for every GameTracker state transition
- A map of every data pipeline with pass/fail at each junction
- Root cause analysis for logic failures
- A prioritized fix list

---

## Tier 3: Run When Ready (Day 3+, ~3-4 hours)

These skills test accumulated state and end-to-end experience.

```
Step 3.1: Season Simulator
  Skill: season-simulator
  Prompt: "Use the season-simulator skill."
  Time: 45-90 min (depending on mode A vs C) + 15 min review
  Output: SEASON_SIMULATION_REPORT.md, season-results/
  Gate: you review coherence failures

Step 3.2: User Journey Verifier
  Skill: user-journey-verifier
  Prompt: "Use the user-journey-verifier skill."
  Time: 45-60 min + 20 min review
  Output: JOURNEY_TEST_REPORT.md, Playwright test scripts
  Gate: you review journey failures

Step 3.3: Calculation Matrices (WAR, Salary, Mojo)
  Run golden-case-generator + test-harness-builder + test-executor pattern
  for each calculation engine. Use boundary-value analysis, not exhaustive sweep.
  Time: ~1 hour per engine
  Can run in parallel across multiple Claude Code sessions
```

**After Tier 3, you have:**
- Proof that the app handles 162 games of accumulated data without corruption
- End-to-end verification of critical user workflows
- Verified calculation accuracy for WAR, salary, and other engines
- Comprehensive documentation of everything that works and doesn't work

---

## Fix & Retest Cycle

After any tier, apply fixes and retest:

```
1. Review findings from completed tier
2. Prioritize fixes (use failure-analyzer output or your judgment)
3. Apply fixes using batch-fix-protocol skill (one at a time for critical fixes)
4. Re-run affected tests:
   - GameTracker logic fix → re-run logic matrix (Step 2.3)
   - Pipeline fix → re-run pipeline tracer on affected pipeline
   - Engine fix → re-run that engine's calculation matrix
   - If engine SIGNATURES changed → re-run engine-discovery first
5. Repeat until pass rate is acceptable
```

**Rule: Never fix and test in the same Claude Code session.** Separate sessions prevent "fix the test to make it pass" behavior.

---

## Parallelization Guide

If you have multiple Claude Code terminals:

```
CAN RUN IN PARALLEL:
- engine-discovery + franchise-engine-discovery (different targets)
- franchise-button-audit + GameTracker golden cases (different domains)
- data-pipeline-tracer + GameTracker test harness building (independent)
- Multiple calculation matrix tests (BWAR + PWAR + salary, etc.)

MUST RUN SEQUENTIALLY:
- engine-discovery → golden-case-generator → test-harness-builder → test-executor
- franchise-engine-discovery → season-simulator
- franchise-button-audit → data-pipeline-tracer
- test-executor → failure-analyzer
- Any fix → re-test
```

---

## Complete File Inventory

After the full pipeline (all tiers), these files should exist:

```
spec-docs/
├── canonical/                             (Tier 0: Truth Establishment)
│   ├── ARCHITECTURE.md                    (Skill: codebase-reverse-engineer Mode A)
│   ├── CANONICAL_TYPES.md                 (Skill: codebase-reverse-engineer Mode A)
│   ├── FEATURE_INVENTORY.md               (Skill: codebase-reverse-engineer Mode A)
│   └── features/                          (Skill: codebase-reverse-engineer Mode B)
│       ├── game-tracker.md                (generated on-demand)
│       ├── war-calculations.md            (generated on-demand)
│       ├── season-management.md           (generated on-demand)
│       └── [other features as needed]
│
├── SPEC_TRIAGE.md                         (Skill: codebase-reverse-engineer Mode A)
├── ENGINE_API_MAP.md                      (Skill: engine-discovery)
├── FRANCHISE_API_MAP.md                   (Skill: franchise-engine-discovery)
├── GOLDEN_CASES_REVIEW.md                 (Skill: golden-case-generator)
├── FRANCHISE_BUTTON_AUDIT.md              (Skill: franchise-button-audit)
├── DATA_PIPELINE_TRACE_REPORT.md          (Skill: data-pipeline-tracer)
├── LOGIC_MATRIX_REPORT.md                 (Skill: test-executor)
├── FAILURE_ANALYSIS_REPORT.md             (Skill: failure-analyzer)
├── SEASON_SIMULATION_REPORT.md            (Skill: season-simulator)
├── JOURNEY_TEST_REPORT.md                 (Skill: user-journey-verifier)
├── SESSION_LOG.md                         (updated by all skills)
└── CURRENT_STATE.md                       (updated after fixes)

test-utils/
├── proof-of-life.ts                       (Skill: engine-discovery)
├── franchise-proof-of-life.ts             (Skill: franchise-engine-discovery)
├── golden-cases.json                      (Skill: golden-case-generator)
├── run-logic-matrix.ts                    (Skill: test-harness-builder)
├── button-audit-data.json                 (Skill: franchise-button-audit)
├── pipeline-trace-data.json               (Skill: data-pipeline-tracer)
├── season-simulator.ts                    (Skill: season-simulator)
├── seed-state.ts                          (Skill: user-journey-verifier)
└── results/
    ├── self-test-results.json             (Skill: test-harness-builder)
    ├── results-summary.json               (Skill: test-executor)
    ├── results-clusters.json              (Skill: test-executor)
    ├── results-full.json                  (Skill: test-executor)
    └── checkpoint.json                    (Skill: test-executor, if interrupted)

test-utils/season-results/                 (Skill: season-simulator)
├── checkpoint-*.json
└── final-state.json

tests/journeys/                            (Skill: user-journey-verifier)
├── j01-season-init.spec.ts
├── j02-first-game.spec.ts
├── ...
└── screenshots/
```

---

## Troubleshooting

### "Engine is React-coupled" (Discovery finds no clean entry point)
**Affects:** Season simulator, state seeding, direct logic testing
**Options:**
1. Extract pure logic from hooks into separate files (best — improves architecture)
2. Use Vitest + React Testing Library (medium — works but slower)
3. Test through Playwright only (worst — limited coverage)
**Recommendation:** Invest the time in option 1. It pays dividends across all testing.

### "Button audit reconciliation has large discrepancy"
**Cause:** Dynamically rendered elements missed by top-down scan
**Fix:** Search for `.map()` calls generating interactive elements, conditional renders, and lazy-loaded components. Re-run the bottom-up scan to find unmatched handlers.

### "Pipeline tracer finds broken junctions"
**Cause:** Data gets lost or corrupted between two specific points
**Fix:** This IS the finding. Use batch-fix-protocol to fix the specific junction. Re-trace after fixing.

### "Season simulator's preflight proof fails"
**Cause:** Completed-game data contract doesn't match what the engine expects
**Fix:** Check if the synthetic game shape exactly matches the real game output type from FRANCHISE_API_MAP.md. Common issues: missing required fields, wrong field names, wrong nested structure.

### "Playwright can't access app state"
**Cause:** No global state exposure, React fiber tree inaccessible
**Fix:** Add a dev-mode state exposure (e.g., `window.__DEV_STATE__ = store.getState()` behind a dev flag). This is safe because it only runs in development/test. Fall back to DOM-based assertions if state access isn't possible.

### "Too many failures to process"
**Cause:** Fundamental issues in the engine (>50% failure rate)
**Fix:** Focus on the LARGEST failure cluster. One root cause fix often resolves hundreds of test failures. Fix one cluster, re-run the full matrix, then reassess.

### "Skills pick up stale data after fixes"
**Cause:** ENGINE_API_MAP.md or golden cases reflect pre-fix code
**Fix:** After any fix that changes function signatures, types, or behavior:
1. Re-run engine-discovery (5 min)
2. Re-verify golden cases still hold (5 min)
3. Re-run the test matrix

---

## Success Criteria

### After Tier 0 (Truth Established):
- ✅ Architecture mapped with confirmed feature boundaries
- ✅ Canonical types extracted from code
- ✅ Existing spec docs triaged
- ✅ Deep specs generated for active features
- ✅ Key discrepancies reviewed and annotated (🟢 or 🐛)

### Minimum Viable Confidence (after Tiers 0 + 1 + 2):
- ✅ Everything above, plus:
- ✅ All engines mapped with proof-of-life
- ✅ All buttons audited with reconciliation
- ✅ GameTracker logic matrix: >95% pass rate
- ✅ All high-priority pipelines traced
- ✅ Root causes identified for all failures
- ✅ Test results reference 🟢 VERIFIED spec sections

### Full Confidence (after all Tiers):
- ✅ Everything above, plus:
- ✅ 162-game season simulated without critical failures
- ✅ All 5-10 user journeys pass in seeded mode
- ✅ WAR/salary/mojo calculations verified at boundary values
- ✅ No NaN, Infinity, or undefined in any stat display
- ✅ Cross-page data persistence verified

### Ongoing Confidence (maintenance):
- Re-run Mode B (feature deep spec) when feature code changes significantly
- Re-run logic matrix after any GameTracker changes
- Re-run affected pipeline traces after any data flow changes
- Re-run season simulator after any stats/standings engine changes
- Re-run journeys after any UI changes
- All of these are fast because the harnesses and specs already exist

## Canonical Spec Integration

All testing skills should read from `spec-docs/canonical/` when available:

| Testing Skill | Reads From Canonical Spec |
|---|---|
| golden-case-generator | Section 2 (Functions & Logic) for formulas |
| test-harness-builder | Section 2 for oracle rules |
| failure-analyzer | Section 6 (Discrepancies) + Section 8 (Edge Cases) |
| franchise-button-audit | Section 3 (Behaviors) for expected interactions |
| data-pipeline-tracer | Section 7 (Dependencies) for data flows |
| season-simulator | Section 4 (State Management) for side effects |

If a spec section is 🔴 UNREVIEWED, testing skills should note this in their output:
"⚠️ Results based on UNREVIEWED canonical spec. Verify spec before trusting findings."
