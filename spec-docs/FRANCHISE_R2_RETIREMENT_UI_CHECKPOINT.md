# Franchise R2 Retirement UI Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add UI, add tests, implement the random/team-roll retirement ceremony, jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.

Primary references:

- `spec-docs/FRANCHISE_R1_RETIREMENT_EXECUTION_CORE_CHECKPOINT.md`
- `spec-docs/FRANCHISE_RETIREMENT_MUTATION_DESIGN.md`
- `spec-docs/FRANCHISE_D3_RETIREMENT_PREVIEW_CHECKPOINT.md`
- `spec-docs/FRANCHISE_OFFSEASON_STABILIZATION_CHECKPOINT.md`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/utils/franchiseRetirementAdapter.ts`
- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
- `src/utils/tests/franchiseRetirementAdapter.test.ts`

## 1. Executive Summary

R2 RetirementFlow explicit confirmation UI is implemented.

Current state:

- D3 preview-first behavior remains the entry point for franchise retirement.
- R1 selected-player execution is reachable only after manual candidate selection and explicit confirmation.
- RetirementFlow calls the R1 adapter for apply; it does not write player, farm, or transaction records directly.
- Canonical franchise season identity is required before preview or apply can mount.
- Random/team-roll retirement ceremony and other deferred systems remain out of scope.

R2 makes retirement execution usable through a guarded UI without expanding the retirement feature into the full OFFSEASON spec ceremony.

## 2. Completed Scope

Completed R2 behavior in `src/src_figma/app/components/RetirementFlow.tsx`:

- Preview-first franchise retirement rendering.
- Manual candidate selection from the preview candidate list.
- Explicit confirmation step before apply.
- Selected-player apply through `runFranchiseRetirementDryRun(...)` using the R1 apply shape.
- Success result rendering with retired player count and retired player details.
- Failure result rendering with structured issue codes/messages.
- Rollback result rendering with rollback status and rollback error details.
- Preview refresh after successful apply so retired players are no longer actionable.
- Canonical identity blocking for missing `seasonId` or missing/invalid `seasonNumber`.

Completed R1/R2 adapter boundary:

- Dry-run method/version: `franchise-retirement-v1-age-risk-dry-run`.
- Apply method/version: `franchise-retirement-v1-selected-player-apply`.
- Apply is selected-player only.
- Apply revalidates and writes through `src/utils/franchiseRetirementAdapter.ts`.
- R1 adapter remains responsible for player mutation, FARM cleanup, canonical transaction logging, and compensating rollback.

## 3. Canonical Identity Boundary

R2 removes fabricated franchise retirement identity in franchise context.

Blocked now:

- No `season-1` fallback.
- No `seasonNumber: 1` fallback.
- Missing `seasonId` renders `MISSING_SEASON_ID`.
- Missing, non-finite, or invalid `seasonNumber` renders `MISSING_SEASON_NUMBER`.
- Damaged identity renders `RETIREMENT PREVIEW BLOCKED`.
- No adapter call happens when identity is damaged.
- No prototype/non-franchise fallback happens when identity is damaged.

Valid franchise calls pass canonical identity:

- `franchiseId`
- `seasonId`
- `seasonNumber`
- `statsScopeId: seasonId`
- `offseasonStateId: offseason-${seasonId}`
- `phase: "RETIREMENTS"`

Preview call:

```ts
runFranchiseRetirementDryRun(
  {
    franchiseId,
    seasonId,
    statsScopeId: seasonId,
    seasonNumber,
    offseasonStateId: `offseason-${seasonId}`,
    phase: "RETIREMENTS",
    dryRun: true,
  },
  { dryRun: true },
)
```

Apply call:

```ts
runFranchiseRetirementDryRun(
  {
    franchiseId,
    seasonId,
    statsScopeId: seasonId,
    seasonNumber,
    offseasonStateId: `offseason-${seasonId}`,
    phase: "RETIREMENTS",
    dryRun: false,
  },
  { apply: true, playerIds },
)
```

## 4. Mutation And UI Safety

R2 UI safety boundaries:

- No direct player writes from RetirementFlow.
- No direct farm writes from RetirementFlow.
- No direct transaction writes from RetirementFlow.
- No League Builder/global/prototype hooks or writers in franchise context.
- No random player selection.
- No auto-select-all.
- No auto-advance after retirement apply.
- No jersey retirement controls.
- No narrative/news controls.
- No milestone controls.
- No replacement-player controls.
- No free-agency, draft, trade, generated filler, import, or roster analyzer mutation controls.

Confirmation copy repeats the important boundaries:

- Selected-player apply only.
- No random/team-roll retirement ceremony.
- No jersey retirement, narrative/news, milestone side effects, or replacement-player generation.
- Rollback is compensating best-effort restoration, not true cross-store atomicity.

R2 does not change R1 adapter semantics. It only makes the selected-player apply path reachable through explicit confirmation in franchise RetirementFlow.

## 5. Tests And Confidence

Focused tests at R2 closeout:

- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
  - Result: 17 tests passed.
- `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts`
  - Result: 26 tests passed.
- `npm run build`
  - Result: passed, with existing Vite large chunk warnings only.

Covered component cases:

- Franchise RetirementFlow renders preview first.
- Method/version and preview limitations are visible.
- Candidate selection is manual.
- Apply is unavailable until explicit confirmation.
- Confirmed apply passes canonical context and selected player IDs.
- Successful apply renders retired player count/details.
- Successful apply refreshes preview state.
- Adapter failure renders structured issue codes/messages.
- Rollback failure renders rollback status and rollback error details.
- Missing `seasonId` blocks preview/apply adapter calls.
- Missing/invalid `seasonNumber` blocks preview/apply adapter calls.
- Damaged identity does not fall back to prototype behavior.
- Prototype/global retirement hooks and mutation paths are not called in franchise context.

Covered adapter cases remain from R1:

- Dry-run remains no-write.
- Apply with no selected players fails.
- Selected MLB retirement succeeds and logs a canonical transaction.
- Selected FARM retirement succeeds, cleans matching farm record, and logs a canonical transaction.
- Invalid statuses are rejected.
- Missing/wrong stats scope is rejected before writes.
- FARM retirement without matching farm record is rejected before writes.
- Mixed valid/invalid selected IDs fail before any mutation.
- Transaction failure rolls back player/farm state.
- Rollback failure returns structured rollback details.

Confidence:

- R2 retirement UI is safe as a selected-player execution surface.
- The broader retirement ceremony remains intentionally unimplemented.
- Future mutation-heavy retirement work should treat R2 as a confirmation-shell pattern, not as the final retirement ceremony.

## 6. Remaining Deferred Work

Deferred from R2:

- Random/team-roll retirement ceremony.
- Deterministic retirement roll persistence.
- Jersey retirement.
- Narrative/news effects.
- Milestone effects.
- Replacement-player systems.
- Full retirement ceremony history.
- Final reverse-age/team-roll retirement model from the offseason spec.
- Free-agency execution.
- Draft execution.
- Trade execution.
- Generated filler players.
- Import writes.
- Roster analyzer mutations.

## 7. Recommended Next Wave Analysis

### Option A: Full-Suite Verification After R1/R2

Value:

- Confirms the new mutation-capable retirement UI did not destabilize unrelated franchise/offseason surfaces.
- Creates a clean checkpoint before introducing another mutation-heavy system.
- Lowers risk before random ceremony or free-agency/draft/trade execution design begins.

Risk:

- Low. This is verification/stabilization, not feature expansion.

Dependencies:

- Current R1/R2 implementation.
- Existing full-suite and build commands.

Recommended reasoning level:

- Medium.

### Option B: Random/Team-Roll Retirement Ceremony Design

Value:

- Moves retirement closer to `OFFSEASON_SYSTEM_SPEC.md`.
- Can define deterministic seeding, roll persistence, reveal order, no-retirement outcomes, and team-by-team ceremony state before implementation.

Risk:

- High. Random execution introduces repeatability, save/resume, history, UI ceremony, and downstream empty-slot concerns.

Dependencies:

- R1 execution core.
- R2 confirmation UI.
- Decision on retirement result records.
- Decision on jersey retirement timing.

Recommended reasoning level:

- Extra High.

### Option C: True-Value Salary Model

Value:

- Moves D2 beyond the current `franchise-ratings-salary-v1-grade-salary-only` method toward the offseason spec salary model.
- Improves future free-agency and trade economics.

Risk:

- Medium-high. Salary changes affect many downstream systems and user expectations.

Dependencies:

- Formula decision.
- Salary ledger/history decision.
- Compatibility with existing D2 confirmation workflow.

Recommended reasoning level:

- High.

### Option D: Mutation-Capable Free Agency Design

Value:

- Addresses one of the central offseason execution systems.
- Would define protected-player inputs, dice outcomes, destination selection, exchange players, and durable roster movement.

Risk:

- Very high. Free agency moves players between teams and must coordinate roster/farm state, transactions, salary context, rollback, and future Phase 11 locks.

Dependencies:

- Durable protection state.
- Player movement orchestration.
- Transaction logging.
- Repair/rollback plan.
- Salary model decision if free-agency economics matter.

Recommended reasoning level:

- Extra High.

### Option E: Mutation-Capable Draft/Trade Design

Value:

- Draft design enables prospect replenishment and farm continuity.
- Trade design enables roster shaping after salary recalculation.

Risk:

- Very high. Draft can create players and change farm composition. Trades move players across teams and may interact with salary, morale, chemistry, injuries, and transactions.

Dependencies:

- Prospect/draft-class identity model.
- Trade proposal and acceptance model.
- Player/farm movement orchestration.
- Transaction and rollback strategy.

Recommended reasoning level:

- Extra High.

### Option F: Import-Write Lifecycle Follow-Up

Value:

- Completes the save-slot lifecycle story beyond export/delete/validate-only import.
- Important for long-term franchise save management.

Risk:

- High. Import writes need collision handling, manifest validation, scoped-global ownership guarantees, and recovery paths.

Dependencies:

- Save-slot manifest.
- Backup/schema alignment.
- Transition journal manifest coverage.
- Import collision policy.

Recommended reasoning level:

- High.

## 8. Final Recommendation

Recommended next wave: full-suite verification after R1/R2.

Why:

- R1/R2 introduced the first mutation-capable retirement path and exposed it through UI.
- The focused tests and build passed, but full-suite verification is the safest next checkpoint before choosing another mutation-heavy system.
- It keeps deferred systems explicit while preserving confidence in the current franchise/offseason foundation.

Exact next prompt:

```text
Recommended reasoning: Medium

Please run a full-suite verification / stabilization checkpoint after R1/R2 retirement execution UI.

Scope:
- Do not implement new features.
- Do not implement random/team-roll retirement ceremony.
- Do not implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.
- Only make code/test changes if needed to fix regressions found by the verification run.
- If failures are unrelated/stale test expectations, keep fixes narrow and document them.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_R1_RETIREMENT_EXECUTION_CORE_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_OFFSEASON_STABILIZATION_CHECKPOINT.md

Verification goals:
1. Run the full Vitest suite.
2. Run the production build.
3. Identify any failures introduced by R1 retirement execution core or R2 RetirementFlow confirmation UI.
4. Fix only true regressions or narrow stale expectations directly tied to R1/R2.
5. Do not expand scope into new feature work.

Required commands:
- npm test -- --reporter=dot
- npm run build

Output:
- Full suite result.
- Build result.
- Any fixes made, with changed files.
- Remaining test/build warnings or known noise.
- Clear recommendation for the next wave.
- Finish with "R1/R2 retirement stabilization safe?" yes/no.
```
