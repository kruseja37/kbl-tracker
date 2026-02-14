# Baseball Logic Test Plan: src/ vs src_figma/ Reconciliation

> **Created**: 2026-02-02
> **Goal**: Systematically test and reconcile ALL baseball logic between the original GameTracker and the new interactive field UI

---

## Phase 1: Create Unit Test Suite for Baseball Rules

### 1.1 Test Categories

| Category | # Tests | Priority |
|----------|---------|----------|
| Force Play Detection | 20+ | P0 |
| Minimum Advancement | 15+ | P0 |
| Default Runner Outcomes | 50+ | P0 |
| Auto-Correction (FO→SF, GO→DP) | 15+ | P0 |
| RBI Calculation | 20+ | P0 |
| DP Detection | 15+ | P0 |
| Extra Advancement Detection | 15+ | P1 |
| D3K Legality | 10+ | P1 |
| Walk/HBP Force Logic | 15+ | P1 |
| Error Handling | 10+ | P2 |

**Total: ~185 test cases**

---

## Phase 2: Test Case Specifications

### 2.1 Force Play Detection Tests

```
TEST_FORCE_001: BB with empty bases → R1 forced to 2B? YES
TEST_FORCE_002: BB with R1 only → R1 forced? YES, R2 forced? NO (no R2)
TEST_FORCE_003: BB with R1, R2 → R1 forced? YES, R2 forced? YES
TEST_FORCE_004: BB with bases loaded → All forced? YES
TEST_FORCE_005: BB with R2 only (no R1) → R2 forced? NO
TEST_FORCE_006: BB with R3 only → R3 forced? NO
TEST_FORCE_007: BB with R2, R3 (no R1) → R2 forced? NO, R3 forced? NO
TEST_FORCE_008: 1B with R1 → R1 forced? YES
TEST_FORCE_009: 1B with R2 → R2 forced? NO
TEST_FORCE_010: 2B with R1 → R1 forced? YES
TEST_FORCE_011: 2B with R2 → R2 forced? YES (batter takes 2B)
TEST_FORCE_012: 2B with R3 → R3 forced? NO
TEST_FORCE_013: 3B with any → All forced? YES
TEST_FORCE_014: FC with R1 → R1 forced? YES
TEST_FORCE_015: FC with R2 → R2 forced? NO
TEST_FORCE_016: GO with R1 → R1 forced? NO (batter out)
TEST_FORCE_017: FO with R1 → R1 forced? NO
TEST_FORCE_018: K with R1 → R1 forced? NO
TEST_FORCE_019: HBP same as BB → YES
TEST_FORCE_020: IBB same as BB → YES
```

### 2.2 Default Runner Outcome Tests

```
# HITS
TEST_DEFAULT_001: 1B, R3 on → R3 defaults to SCORED
TEST_DEFAULT_002: 1B, R2 on → R2 defaults to TO_3B
TEST_DEFAULT_003: 1B, R1 on → R1 defaults to TO_2B
TEST_DEFAULT_004: 2B, R3 on → R3 defaults to SCORED
TEST_DEFAULT_005: 2B, R2 on → R2 defaults to SCORED
TEST_DEFAULT_006: 2B, R1 on → R1 defaults to TO_3B
TEST_DEFAULT_007: 3B, any runner → All default to SCORED
TEST_DEFAULT_008: HR, any runner → All default to SCORED

# WALKS
TEST_DEFAULT_009: BB, bases empty → Batter to 1B
TEST_DEFAULT_010: BB, R1 on → R1 to 2B
TEST_DEFAULT_011: BB, R1+R2 → R1 to 2B, R2 to 3B
TEST_DEFAULT_012: BB, bases loaded → R3 SCORES, R2 to 3B, R1 to 2B
TEST_DEFAULT_013: BB, R2 only → R2 HOLDS (not forced)
TEST_DEFAULT_014: BB, R3 only → R3 HOLDS (not forced)
TEST_DEFAULT_015: BB, R2+R3 (no R1) → Both HOLD (not forced)

# OUTS
TEST_DEFAULT_016: GO, 0 outs, no runners → Batter out
TEST_DEFAULT_017: GO, R1, 0 outs, 1 fielder → R1 advances (no DP)
TEST_DEFAULT_018: GO, R1, 0 outs, 2+ fielders → R1 OUT at 2B (DP)
TEST_DEFAULT_019: GO, R1, 2 outs → No DP possible, R1 holds
TEST_DEFAULT_020: FO, R3, 0 outs → R3 tags and SCORES
TEST_DEFAULT_021: FO, R3, 2 outs → R3 HOLDS (can't tag with 2 outs)
TEST_DEFAULT_022: FO, R2, 0 outs → R2 tags to 3B
TEST_DEFAULT_023: FO, R1 → R1 HOLDS (can't advance on fly)
TEST_DEFAULT_024: K, any runners → All HOLD
TEST_DEFAULT_025: DP, R1 → R1 OUT at 2B
TEST_DEFAULT_026: DP, R2 → R2 advances
TEST_DEFAULT_027: DP, R3 → R3 may SCORE
TEST_DEFAULT_028: SF, R3 → R3 SCORES (definition of SF)
TEST_DEFAULT_029: SAC, R1 → R1 to 2B
TEST_DEFAULT_030: SAC, R2 → R2 to 3B
TEST_DEFAULT_031: FC, R1 → R1 OUT (lead runner out)
TEST_DEFAULT_032: E, R3 → R3 SCORES
TEST_DEFAULT_033: E, R2 → R2 to 3B
TEST_DEFAULT_034: E, R1 → R1 to 2B
```

### 2.3 Auto-Correction Tests

```
# FO → SF
TEST_AUTO_001: FO, R3 scores, 0 outs → Correct to SF
TEST_AUTO_002: FO, R3 scores, 1 out → Correct to SF
TEST_AUTO_003: FO, R3 scores, 2 outs → NO correction (can't sac with 2 outs)
TEST_AUTO_004: FO, R3 holds → NO correction
TEST_AUTO_005: FO, no R3 → NO correction

# GO → DP
TEST_AUTO_006: GO, R1 out, 0 outs → Correct to DP
TEST_AUTO_007: GO, R1 out, 1 out → Correct to DP
TEST_AUTO_008: GO, R1 out, 2 outs → NO correction (3rd out, not DP)
TEST_AUTO_009: GO, R2 out → Correct to DP
TEST_AUTO_010: GO, R3 out → Correct to DP
TEST_AUTO_011: GO, no runners out → NO correction
TEST_AUTO_012: GO, R1 advances (not out) → NO correction

# DP → GO (reversion)
TEST_AUTO_013: Initial DP, then change R1 to advance → Revert to GO
TEST_AUTO_014: Initial DP, R1 stays out → Keep DP
```

### 2.4 RBI Calculation Tests

```
TEST_RBI_001: 1B, R3 scores → 1 RBI
TEST_RBI_002: 1B, R2+R3 score → 2 RBI
TEST_RBI_003: 2B, R1+R2+R3 score → 3 RBI
TEST_RBI_004: HR, empty bases → 1 RBI (batter)
TEST_RBI_005: HR, R1 on → 2 RBI
TEST_RBI_006: HR, bases loaded → 4 RBI (grand slam)
TEST_RBI_007: E, R3 scores → 0 RBI (error = no credit)
TEST_RBI_008: E, R2+R3 score → 0 RBI
TEST_RBI_009: DP, R3 scores → 0 RBI (DP = no credit)
TEST_RBI_010: SF, R3 scores → 1 RBI
TEST_RBI_011: GO, R3 scores (productive out) → 1 RBI
TEST_RBI_012: BB, bases loaded, R3 scores → 1 RBI
```

### 2.5 DP Detection Tests (runnerDefaults.ts specific)

```
TEST_DP_001: outType='DP', R1 → R1 OUT at 2B
TEST_DP_002: outType='GO', R1, 2 fielders, 0 outs → R1 OUT (auto DP)
TEST_DP_003: outType='GO', R1, 1 fielder, 0 outs → R1 advances (no DP)
TEST_DP_004: outType='GO', R1, 2 fielders, 2 outs → R1 holds (no DP with 2 outs)
TEST_DP_005: outType=undefined, R1, 2 fielders, 0 outs → R1 OUT (infer DP)
TEST_DP_006: outType='FC', R1, 2 fielders, 0 outs → R1 OUT (infer DP from FC)
TEST_DP_007: outType='TP', R1+R2 → Both OUT
TEST_DP_008: outType='DP', no R1 → No runner out (edge case)
```

---

## Phase 3: Implementation Strategy

### 3.1 Create Shared Test Runner

**File**: `src/tests/baseballLogicTests.ts`

```typescript
interface TestCase {
  id: string;
  description: string;
  input: {
    result?: AtBatResult;
    bases: { first: boolean; second: boolean; third: boolean };
    outs: number;
    runnerOutcomes?: RunnerOutcomes;
    fieldingSequence?: number[];
    outType?: OutType;
  };
  expected: {
    // For force play tests
    forced?: { first?: boolean; second?: boolean; third?: boolean };
    // For default outcome tests
    outcomes?: { first?: RunnerOutcome; second?: RunnerOutcome; third?: RunnerOutcome };
    // For auto-correction tests
    correctedResult?: AtBatResult;
    // For RBI tests
    rbi?: number;
  };
}
```

### 3.2 Test Both Implementations

For each test:
1. Run against `src/components/GameTracker/AtBatFlow.tsx` functions
2. Run against `src_figma/hooks/useGameState.ts` functions
3. Run against `src_figma/app/components/runnerDefaults.ts` functions
4. Compare results, flag discrepancies

### 3.3 Generate Test Report

Output format:
```
╔════════════════════════════════════════════════════════════╗
║ BASEBALL LOGIC TEST REPORT                                  ║
╠════════════════════════════════════════════════════════════╣
║ Category: Force Play Detection                              ║
║ Tests Run: 20                                               ║
║ src/ Pass: 20/20 ✅                                         ║
║ src_figma/useGameState.ts Pass: 20/20 ✅                    ║
║ src_figma/runnerDefaults.ts Pass: 18/20 ⚠️                  ║
║                                                             ║
║ FAILURES:                                                   ║
║ TEST_FORCE_017: runnerDefaults.ts returns undefined         ║
║ TEST_FORCE_018: runnerDefaults.ts missing K handling        ║
╚════════════════════════════════════════════════════════════╝
```

---

## Phase 4: Reconciliation Process

For each discrepancy found:

1. **Identify canonical source** - Which is correct per baseball rules?
2. **Document the fix** - What needs to change and where?
3. **Apply fix** - Update the incorrect implementation
4. **Re-run tests** - Verify fix doesn't break other tests
5. **Update spec-docs** - Document the reconciliation

---

## Phase 5: Integration Tests

After unit tests pass, create integration tests that simulate full game scenarios:

### 5.1 Scenario Tests

```
SCENARIO_001: "Double Play Recorded Correctly"
- Setup: R1 on first, 0 outs
- Action: Ground ball 6-4-3
- Expected: Batter OUT, R1 OUT at 2B, 2 outs total

SCENARIO_002: "Sacrifice Fly Auto-Detection"
- Setup: R3 on third, 0 outs
- Action: Fly ball to CF, R3 tags and scores
- Expected: Result corrected to SF, R3 scores, 1 RBI, 1 out

SCENARIO_003: "Bases Loaded Walk"
- Setup: Bases loaded, 1 out
- Action: Walk (BB)
- Expected: R3 scores, R2→3B, R1→2B, batter→1B, 1 RBI

SCENARIO_004: "No RBI on Error"
- Setup: R3 on third
- Action: Error, R3 scores
- Expected: R3 scores, run counted, 0 RBI

SCENARIO_005: "Grand Slam"
- Setup: Bases loaded
- Action: Home run
- Expected: All 4 score, 4 RBI
```

---

## Phase 6: Continuous Validation

### 6.1 Pre-commit Hook

Add test runner to pre-commit:
```bash
npm run test:baseball-logic
```

### 6.2 CI Integration

Add to GitHub Actions:
```yaml
- name: Baseball Logic Tests
  run: npm run test:baseball-logic
```

---

## Execution Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1 | 4 hours | Create test infrastructure |
| Phase 2 | 8 hours | Write all 185+ test cases |
| Phase 3 | 4 hours | Implement test runner |
| Phase 4 | 16 hours | Fix all discrepancies |
| Phase 5 | 8 hours | Integration tests |
| Phase 6 | 2 hours | CI setup |

**Total: ~42 hours**

---

## Success Criteria

- [x] All 185+ unit tests pass for ALL implementations
  - **72 canonical tests in baseballLogicTests.test.ts** ✅
  - **258 comparison tests in baseballLogicComparison.test.ts** ✅
  - **104 runnerDefaults comparison tests** ✅
  - **Total: 434 tests passing**
- [x] Zero discrepancies between src/ and src_figma/
  - All comparison tests confirm identical behavior
  - useGameState.ts functions match canonical ✅
  - runnerDefaults.ts functions match canonical ✅
- [ ] Integration tests pass for 20+ game scenarios (Phase 5 - pending)
- [ ] CI pipeline catches any future regressions (Phase 6 - pending)
- [x] Documentation complete in spec-docs/

---

## Execution Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | ✅ Complete | Test infrastructure created with Vitest |
| Phase 2 | ✅ Complete | 434 test cases written and passing |
| Phase 3 | ✅ Complete | Test runner configured: `npm run test:baseball` |
| Phase 4 | ✅ Complete | All src_figma functions match canonical behavior |
| Phase 5 | ⏳ Pending | Integration/scenario tests |
| Phase 6 | ⏳ Pending | CI setup |

## Test Files Summary

| Test File | Tests | Description |
|-----------|-------|-------------|
| `baseballLogicTests.test.ts` | 72 | Canonical baseball rules (force plays, defaults, RBI, auto-correction) |
| `baseballLogicComparison.test.ts` | 258 | useGameState.ts vs canonical comparison |
| `runnerDefaultsComparison.test.ts` | 104 | runnerDefaults.ts vs canonical comparison |
| **Total** | **434** | All passing ✅ |

---

*Last Updated: 2026-02-03*
