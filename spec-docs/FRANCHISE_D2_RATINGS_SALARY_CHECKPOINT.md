# Franchise D2 Ratings/Salary Checkpoint

Last updated: May 25, 2026

## 1. Completed Scope

Wave D0/D1 established the franchise-owned offseason adapter foundation:

- Shared adapter contracts live in `src/utils/franchiseOffseasonAdapters.ts`.
- Shared scoped validation and read helpers live in `src/utils/franchiseOffseasonDataAccess.ts`.
- Validation is explicit about canonical franchise identity, offseason state identity, farm-record ownership, season-summary ownership, Phase 11 roster-lock checks where requested, and transition-journal warnings.

Wave D2 added the first mutation-capable franchise offseason adapter:

- `src/utils/franchiseRatingsSalaryAdapter.ts`
- Adapter id: `franchise-ratings-salary-recalculation`
- Phase: `RATINGS_ADJUSTMENTS`
- Public helper: `runFranchiseRatingsSalaryRecalculation(...)`

Supported modes:

- Dry-run mode validates scope, computes proposals, and writes nothing.
- Apply mode re-validates, recomputes proposals, and writes only franchise-owned player records through `saveFranchisePlayer`.
- The apply path has compensating rollback for already-written players if a later player write fails.

UI support:

- `src/src_figma/app/components/RatingsAdjustmentFlow.tsx` now renders a franchise-only preview and explicit confirmation workflow.
- The franchise UI previews proposals first.
- The user must intentionally confirm before apply.
- The confirmation repeats method and limitation copy.
- Apply results render success, warnings, structured failures, rollback status, and rollback error details.

## 2. Exact Method Boundary

The current calculation version is:

`franchise-ratings-salary-v1-grade-salary-only`

This method does exactly this:

- Recalculates `overallGrade` from the existing app grade engine:
  - `calculatePositionPlayerGrade`
  - `calculatePitcherGrade`
  - `calculateTwoWayPlayerGrade`
- Recalculates `salary` from the existing app salary calculator:
  - `calculateSalary`
- Preserves raw ratings unchanged:
  - `power`
  - `contact`
  - `speed`
  - `fielding`
  - `arm`
  - `velocity`
  - `junk`
  - `accuracy`

This is not the full `OFFSEASON_SYSTEM_SPEC.md` true-value / 50% salary-delta model. It is intentionally a conservative v1 adapter that recomputes grade and salary from current stored ratings using existing app-native engines.

The UI repeats this boundary in franchise context:

- Method: `franchise-ratings-salary-v1-grade-salary-only`
- Raw ratings are not changed.
- This is not the full true-value or 50% salary-delta offseason model.

## 3. Data And Mutation Boundaries

Allowed writes:

- Franchise-owned player records only.
- Writes go through `saveFranchisePlayer(franchiseId, player)` inside `src/utils/franchiseRatingsSalaryAdapter.ts`.

Explicitly not included:

- No League Builder/global player writes.
- No League Builder/template roster mutation.
- No free agency behavior.
- No draft behavior.
- No trade behavior.
- No retirement behavior.
- No Phase 11 cut/sign behavior.
- No roster analyzer mutations.
- No raw rating mutation.
- No import writes.
- No full offseason economic model.

The adapter validates through `validateFranchiseOffseasonScope(...)` and requests transition journals with:

```ts
{
  requireCurrentPhase: true,
  includeTransitionJournals: true,
}
```

Targeted `playerIds` must exist in the franchise-owned player scope; missing requested player ids fail with `PLAYER_NOT_FOUND`.

## 4. Safety Behavior

Dry-run:

- Returns proposals.
- Returns structured issues and warnings.
- Writes nothing.
- Does not call League Builder/global save APIs.

Apply:

- Re-runs validation.
- Recomputes proposals from current franchise-owned player records.
- Writes only changed franchise-owned player records.
- Returns `appliedPlayerIds`.
- Returns all validation warnings/issues from the apply run.

Warnings:

- Pending/failed transition journals surface as `TRANSITION_ATTENTION_REQUIRED`.
- These warnings are non-blocking under the current shared validation contract.

Rollback:

- If one player write fails after earlier player writes succeeded, the adapter attempts to restore the already-written player snapshots in reverse order.
- Rollback status is reported as:
  - `not_needed`
  - `rolled_back`
  - `rollback_failed`
- Rollback errors include `playerId` and message.
- UI copy explicitly states compensating rollback is not true cross-store atomicity.

Failure handling:

- Player write failures return `PLAYER_WRITE_FAILED`.
- Rollback failures return `PLAYER_ROLLBACK_FAILED`.
- The UI renders structured issue codes/messages and rollback error details.

## 5. UI Behavior

Franchise context in `RatingsAdjustmentFlow`:

- Shows a preview-first panel.
- Shows changed-player count.
- Shows player proposals with before/after grade and salary.
- Shows warnings and validation notes, including `TRANSITION_ATTENTION_REQUIRED`.
- Shows method/limitation copy.
- Provides a deliberate `Confirm grade/salary update` action.
- Confirmation step repeats:
  - method/version
  - raw-ratings-unchanged boundary
  - not-full-true-value / not-50%-delta boundary
  - warnings
  - number of players to update
- Apply button appears only inside the confirmation step.
- Apply result panel shows success or failure.

Franchise context does not expose the older prototype/global mutation path.

Non-franchise/prototype behavior remains intentionally preserved.

## 6. Tests And Confidence

Key adapter tests:

- `src/utils/tests/franchiseRatingsSalaryAdapter.test.ts`
  - Dry-run returns proposed grade/salary changes and writes nothing.
  - Apply updates franchise-owned players only.
  - Wrong franchise/scope validation fails without writes.
  - Wrong phase fails.
  - Missing requested player id fails.
  - Transition journal warnings appear in dry-run and apply.
  - Transition journal warnings do not block successful apply.
  - Applied player payloads preserve raw ratings unchanged.
  - Write failure compensates/restores prior player writes.
  - Rollback failure returns `PLAYER_ROLLBACK_FAILED` and rollback details.

Key UI tests:

- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
  - Franchise ratings flow renders preview proposals.
  - No League Builder/global save mutators are called.
  - Confirmation step appears before apply.
  - Apply calls adapter in non-dry-run/apply mode only after confirmation.
  - Transition warnings appear in preview/confirmation/apply result.
  - Success result renders changed-player count.
  - Failure result renders structured errors.
  - Rollback failure renders rollback status and rollback error details.

Known gaps:

- No full true-value / 50% salary-delta model.
- No salary ledger or audit table beyond player snapshots/proposals and adapter result reporting.
- No persistent record of the ratings/salary commit as an offseason phase artifact beyond the changed franchise player records.
- No UI diff for raw ratings because raw ratings are intentionally not changed.
- No broader full-suite assertion captured in this checkpoint beyond the focused tests run during implementation.

## 7. Future Work

Potential future work for ratings/salary:

- Implement the full `OFFSEASON_SYSTEM_SPEC.md` true-value / 50% salary-delta model after the economics are finalized.
- Add a durable salary/ratings recalculation ledger or phase artifact.
- Add richer before/after salary breakdowns from `calculateSalaryWithBreakdown`.
- Add season-performance inputs if the eventual model needs WAR or true-value context.
- Add a repair/retry path for `rollback_failed` outcomes.

Potential next adapter candidates:

- Retirement adapter in dry-run-first mode.
- Draft adapter contract and generated-pool persistence boundary.
- Free agency adapter only after franchise-owned free-agent pool, protection, and destination rules are clarified.
- Trade adapter only after franchise-owned trade market/proposal storage exists.

## Recommended Next Implementation Wave

Recommended next wave: **D3 retirement adapter planning and dry-run foundation**, not mutation-first.

Why:

- Retirement is a bounded offseason phase with clear identity and per-player outcomes.
- It can follow the D2 pattern: dry-run first, explicit confirmation later.
- It should avoid League Builder/global retirement mutation and use franchise-owned player state only.
- It should not block further roster analyzer work, but mutation-capable analyzer workflows should still wait.

Exact next prompt:

```text
Recommended reasoning: High

Please implement Wave D3: franchise-owned retirement adapter dry-run foundation only.

Do not implement free agency, draft, trades, or Phase 11 cut/sign.
Do not add roster analyzer mutations.
Do not mutate player records yet unless explicitly requested in a later commit wave.
Keep this to a franchise-owned retirement adapter contract, scoped validation, dry-run outcome proposals, and UI/read-only preview boundary if low-risk.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/OFFSEASON_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D2_RATINGS_SALARY_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonAdapters.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonDataAccess.ts
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/RetirementFlow.tsx

Goals:
1. Add a retirement adapter in dry-run mode only.
2. Use franchise-owned player records only.
3. Surface structured proposals, limitations, and transition journal warnings.
4. Do not call League Builder/global retirement mutators in franchise context.
5. Add focused adapter and UI guard tests.

After implementation:
- Run the new retirement adapter tests.
- Run franchise offseason guard tests.
- Run D2 ratings/salary adapter tests.
- Run npm run build.
```
