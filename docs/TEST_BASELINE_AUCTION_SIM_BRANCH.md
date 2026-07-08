# Test Baseline: Auction Sim Branch

Generated: 2026-07-06

## Branch Baseline

| Item | Value |
|---|---|
| Current branch | `codex/draft-economy-sim-harness` |
| Current commit | `7b5214ca41f7f4715a9d99efed1e95007f94553a` |
| Base branch checked | `main` |
| Base branch commit | `96ed39204d8c90dae83a1fb6ab9257aa08b7f119` |
| Base worktree path | `/private/tmp/kbl-tracker-main-baseline` |

## Commands Run On Current Branch

| Command | Result | Notes |
|---|---|---|
| `git diff --check` | PASS | No whitespace errors. |
| `perl -ne 'print $. . ":" . $_ if /[^\x00-\x7F]/' docs/SIM_MODEL_REDUCTION.md` | PASS | No output. |
| `perl -ne 'print $. . ":" . $_ if /[^\x00-\x7F]/' docs/GM_INTELLIGENCE_ENGINE_MAP.md` | PASS | No output. |
| `npx tsc -b --pretty false` | PASS | No output. |
| `npm run -s build` | PASS | Vite build succeeded; existing Browserslist/chunk-size warnings printed. |
| `npm test` | FAIL | Full suite ran; 2 failed, 8993 passed, 8 skipped. See failing baseline below. |
| `npx vitest run src/engines/__tests__/wpaRuntimeBoundary.test.ts src/utils/tests/franchiseManualSmokeFixture.test.ts` | FAIL | WPA failure reproduced; smoke fixture passed when isolated. |
| `NODE_ENV= npx vitest run src/engines/__tests__/auctionSim.test.ts src/engines/__tests__/auctionSimLeverB.test.ts` | PASS | 2 files passed, 11 tests passed. |

## Full `npm test` Failures On Current Branch

### 1. WPA Runtime Boundary

| Field | Value |
|---|---|
| Suite | `src/engines/__tests__/wpaRuntimeBoundary.test.ts` |
| Test | `WPA runtime boundary > direct committed WPA field materialization stays allowlisted` |
| Summary | Assertion expected no unauthorized direct committed WPA field materialization, but found four matches. |
| Failure location | `src/engines/__tests__/wpaRuntimeBoundary.test.ts:199:26` |
| Received unauthorized matches | `src/utils/franchiseAnalyticsTrust.ts:99: wpa: FranchiseWpaTrust;`; `src/utils/franchiseAnalyticsTrust.ts:461: wpa: FranchiseWpaTrust;`; `src/utils/franchiseStadiumRecordsStorage.ts:817: const leaders = eventsWithWpa.filter((event) => event.wpa === maxWpa);`; `src/utils/franchiseStadiumRecordsStorage.ts:836: const leaders = eventsWithWpa.filter((event) => event.wpa === minWpa);` |
| Touched by this branch? | NO. `git status --short -- src/engines/__tests__/wpaRuntimeBoundary.test.ts src/utils/franchiseAnalyticsTrust.ts src/utils/franchiseStadiumRecordsStorage.ts` produced no output, and `git diff --name-only main...HEAD -- ...` produced no output for those paths. |
| Base-branch reproduction | PRE_EXISTING. Reproduced on `main` at `96ed39204d8c90dae83a1fb6ab9257aa08b7f119` with the same four unauthorized matches. |

### 2. Franchise Manual Smoke Fixture

| Field | Value |
|---|---|
| Suite | `src/utils/tests/franchiseManualSmokeFixture.test.ts` |
| Test | `franchise manual smoke fixture > repeat setup resets only named smoke records and preserves unrelated League Builder data` |
| Summary | Full `npm test` timed out after 5000 ms. |
| Failure location | `src/utils/tests/franchiseManualSmokeFixture.test.ts:108:3` |
| Touched by this branch? | NO. `git status --short -- src/utils/tests/franchiseManualSmokeFixture.test.ts` produced no output, and `git diff --name-only main...HEAD -- src/utils/tests/franchiseManualSmokeFixture.test.ts` produced no output. |
| Base-branch reproduction | NEEDS_INVESTIGATION. The failure did not reproduce when running only the two failing suites on `main`; the smoke fixture passed there in 2308 ms. |
| Current-branch isolated reproduction | Did not reproduce when running the two failing suites on `codex/draft-economy-sim-harness`; the smoke fixture passed there in 3302 ms. |
| Current classification | NEEDS_INVESTIGATION, likely full-suite load/interference or timing sensitivity. Do not fix or skip here because the task is process documentation only. |

## Base-Branch Verification

Created a separate worktree:

```bash
git worktree add /private/tmp/kbl-tracker-main-baseline main
ln -s /Users/johnkruse/Projects/kbl-tracker/node_modules /private/tmp/kbl-tracker-main-baseline/node_modules
```

Ran only the two failing suites on base:

```bash
npx vitest run src/engines/__tests__/wpaRuntimeBoundary.test.ts src/utils/tests/franchiseManualSmokeFixture.test.ts
```

Base result:

- `src/engines/__tests__/wpaRuntimeBoundary.test.ts`: FAIL, same unauthorized WPA matches. Marked `PRE_EXISTING`.
- `src/utils/tests/franchiseManualSmokeFixture.test.ts`: PASS, 4 tests passed. The full-suite timeout remains `NEEDS_INVESTIGATION`.

## Auction Sim Verification

Command:

```bash
NODE_ENV= npx vitest run src/engines/__tests__/auctionSim.test.ts src/engines/__tests__/auctionSimLeverB.test.ts
```

Result:

- `src/engines/__tests__/auctionSim.test.ts`: PASS, 6 tests.
- `src/engines/__tests__/auctionSimLeverB.test.ts`: PASS, 5 tests.
- Total: 2 files passed, 11 tests passed.

## Process Conclusion

- The discovery/reduction docs are documentation-only artifacts.
- No production behavior, UI, storage/schema, pool-builder, or `auctionSim` behavior was changed for this baseline pass.
- The WPA failure is `PRE_EXISTING` on `main`.
- The smoke fixture full-suite timeout is `NEEDS_INVESTIGATION` because it did not reproduce in isolated current-branch or base-branch runs.
- Auction-specific tests pass and are clear for the next implementation step.
