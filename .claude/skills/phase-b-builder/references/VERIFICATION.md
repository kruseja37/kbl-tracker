# Verification Pipeline

## Per-Item Verification (After Every Item)

```bash
# 1. TypeScript must compile
npx tsc --noEmit

# 2. Run area-specific tests
npm test -- [test-file-for-this-area] --reporter=verbose

# 3. Full suite checkpoint every 5 items
npm test -- --reporter=verbose 2>&1 | tail -20
```

**STOP conditions:**
- tsc fails → fix before proceeding
- Test count drops below baseline → regression, fix before proceeding
- >5 new test failures → stop and diagnose

---

## Tier-Level Verification

### After Tier 1 (Foundation)
```bash
npm test -- --reporter=verbose 2>&1 | tail -20
npx tsc --noEmit
```
Verify: gradeEngine, franchise storage, stat calibration all importable and testable.

### After Tier 2 (Core Game Systems)
```bash
# Full test suite
npm test -- --reporter=verbose 2>&1 | tail -20

# GameTracker-specific: invoke gametracker-logic-tester skill
# Tell user: "Tier 2 complete. Invoke gametracker-logic-tester to verify baseball logic."
```
**REQUIRED**: gametracker-logic-tester must run after Tier 2.
It tests: at-bat outcomes × base states × out counts, force plays, sacrifice flies, double plays, IFR, inning transitions.
Output: `spec-docs/GAMETRACKER_TEST_RESULTS_[DATE].md`

### After Tier 3 (Flow & UI)
```bash
npm test -- --reporter=verbose 2>&1 | tail -20
npx tsc --noEmit
```
Verify: All offseason flows, playoff screens, draft flow compile and have basic test coverage.

### After Tier 4 (Polish)
```bash
npm test -- --reporter=verbose 2>&1 | tail -20
npx tsc --noEmit
```

---

## Post-Phase-B Verification (After ALL Tiers Complete)

Run these skills in order. Each produces a report consumed by the next:

### 1. gametracker-logic-tester
Trigger: "test gametracker" or "test baseball logic"
Verifies: All baseball logic correctness after all changes.
Output: `spec-docs/GAMETRACKER_TEST_RESULTS_[DATE].md`

### 2. dummy-data-scrubber
Trigger: "find dummy data" or "scrub demo data"
Verifies: No hardcoded dummy data remains where dynamic sources now exist.
Output: `spec-docs/DUMMY_DATA_SCRUB_REPORT.md`

### 3. spec-ui-alignment
Trigger: "audit spec compliance" or "check if UI matches code"
Verifies: Built features match their spec requirements.
Output: `spec-docs/SPEC_UI_ALIGNMENT_REPORT.md`

### 4. ui-flow-crawler
Trigger: "crawl the UI" or "test app flow"
Requires: `npm run dev` running at localhost:5173
Verifies: All 14 routes render, all 27 franchise tabs work, all 5 critical flows complete.
Output: `spec-docs/UI_FLOW_CRAWL_REPORT.md` + `spec-docs/FIGMA_COMPLETION_MAP.md`

### 5. batch-fix-protocol (if needed)
Trigger: "fix audit findings"
Input: Any CRITICAL/MAJOR findings from steps 1-4.
Fixes remaining issues found during verification.

---

## Regression Detection

**Baseline (before Phase B):** 5,078 pass / 77 fail / 5,155 total

Track after each tier:
| Checkpoint | Pass | Fail | Total | Delta |
|------------|------|------|-------|-------|
| Baseline   | 5,078 | 77 | 5,155 | — |
| After Tier 1 | ? | ? | ? | ? |
| After Tier 2 | ? | ? | ? | ? |
| After Tier 3 | ? | ? | ? | ? |
| After Tier 4 | ? | ? | ? | ? |

**Rules:**
- Pass count must NEVER drop below baseline (5,078)
- New tests are expected (pass count should increase)
- If fail count increases: diagnose immediately, fix before proceeding
- The 77 pre-existing failures are known (PostGameSummary useParams mock issue)
