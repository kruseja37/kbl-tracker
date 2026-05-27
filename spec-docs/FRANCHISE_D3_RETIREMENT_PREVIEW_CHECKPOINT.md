# Franchise D3 Retirement Preview Checkpoint

Date: 2026-05-25

## 1. Completed Scope

D3 adds a franchise-owned, dry-run-only retirement preview foundation.

- `src/utils/franchiseRetirementAdapter.ts` defines the D3 adapter contract and result shape.
- `src/src_figma/app/components/RetirementFlow.tsx` renders a franchise-only preview surface instead of the prototype retirement mutation flow when `franchiseId` is present.
- `src/utils/tests/franchiseRetirementAdapter.test.ts` covers adapter behavior.
- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx` covers the franchise UI boundary.

Completed behavior:

- Dry-run retirement candidate generation from franchise-owned player scope.
- Transition journal warnings are surfaced through `validateFranchiseOffseasonScope(..., { includeTransitionJournals: true })`.
- Apply/commit is explicitly rejected by the adapter.
- No players are retired, removed, or written.
- No transactions are written.
- Franchise `RetirementFlow` exposes no roll, save, jersey-retirement, apply, confirm, or retire controls.

## 2. Method Boundary

Current method/version:

```text
franchise-retirement-v1-age-risk-dry-run
```

The D3 preview uses an age-risk heuristic adapted from the existing prototype age curve in `RetirementFlow`. The adapter reports:

- `probabilityScore`
- `probabilityBand`
- `trustLevel`
- evidence
- limitations

This is intentionally **not** the final retirement system described in `OFFSEASON_SYSTEM_SPEC.md` Section 7, which specifies team-by-team retirement processing, reverse-age probability order, user reveal rolls, possible no-retirement outcomes, empty roster slots, and jersey-retirement decisions.

Inactive in D3:

- Final reverse-age/team-roll retirement model.
- Morale modifiers.
- Injury modifiers.
- Contract modifiers.
- Narrative/personality retirement modifiers.
- Final retirement decisions.
- Empty roster slot creation.
- Jersey retirement decisions.

## 3. Data And Mutation Boundaries

D3 reads franchise-owned offseason scope only through the D0/D1 adapter validation/data-access boundary.

Allowed:

- Franchise player records from validated franchise offseason scope.
- Player age, roster status, team assignment, salary, grade, and optional service/seasons fields when present.
- Transition journal warning visibility.

Blocked/not implemented:

- No League Builder/global writes.
- No franchise player writes.
- No transaction writes.
- No `retirePlayer(...)` calls in franchise context.
- No `saveRetirementDecisions(...)` calls in franchise context.
- No jersey retirement path in franchise preview.
- No mutation-capable retirement adapter.

The adapter rejects `apply: true` with `ADAPTER_NOT_IMPLEMENTED`.

## 4. UI Behavior

In franchise context, `RetirementFlow` now renders a preview-only surface:

- Header: `RETIREMENT PREVIEW`.
- Method boundary: `franchise-retirement-v1-age-risk-dry-run`.
- Candidate count.
- Read-only candidate list.
- Candidate risk band and score.
- Trust level.
- Evidence list.
- Limitations list.
- Warnings/validation notes section.
- Preview limitations section.
- Close-only control.

The UI copy states:

- Preview only.
- No players are retired, removed, or written.
- No transactions are written.
- Not the final reverse-age/team-roll retirement model.
- Morale, injury, contract, and narrative factors are not active yet.

Non-franchise/prototype behavior is preserved intentionally.

## 5. Tests And Confidence

Focused tests added/updated:

- `src/utils/tests/franchiseRetirementAdapter.test.ts`
  - Age curve sanity.
  - Dry-run candidates from franchise-owned players.
  - No franchise player writes.
  - No League Builder/global player writes.
  - No transaction writes.
  - Wrong phase/context validation failure.
  - Transition journal warnings are surfaced and non-blocking.
  - Method/version and limitations are present.
  - Missing age/service data becomes limitations, not confident advice.
  - Apply attempts are rejected.

- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
  - Franchise `RetirementFlow` renders dry-run candidates.
  - Shows method boundary and limitation copy.
  - Shows `TRANSITION_ATTENTION_REQUIRED`.
  - Does not render prototype roll/save/retire/jersey controls.
  - Does not call prototype/global retirement mutation paths.

Latest focused run at D3 implementation closeout:

- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
- `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts src/utils/tests/franchiseOffseasonAdapters.test.ts`
- `npm run build`

All passed at closeout.

## 6. Known Limitations / Cleanup

Known limitation:

- `RetirementFlow` still initializes legacy/prototype `useOffseasonData` and `useOffseasonState` hooks before the franchise preview branch returns.

This is currently tolerated because the franchise branch does not use the prototype mutation controls and tests prove the mutation paths are not called. It is still architectural debt because the component can touch global/prototype read hooks before rendering the franchise preview.

Future cleanup:

- Split the franchise retirement preview into a separate component or branch before global/prototype reads initialize.
- Move shared warning/issue rendering into a small reusable offseason adapter UI helper.
- Implement the final retirement mutation workflow only after franchise-owned retirement writes, transaction logging, empty roster slot handling, and jersey-retirement persistence are designed and tested.

Deferred:

- Final reverse-age/team-roll retirement model.
- Actual retirement decisions.
- Franchise player status mutation to `RETIRED`.
- Transaction logging for retirements.
- Jersey retirement persistence.
- Draft/free-agency integration for empty roster slots.

## 7. Recommended Next Wave

Recommended next wave: **D4 franchise free-agency adapter planning/foundation**, not mutation execution yet.

Why:

- Ratings/salary now has a mutation-capable adapter with explicit commit.
- Retirement now has a safe read-only preview.
- Free agency is the next high-risk offseason phase because prototype behavior historically mutates team/player state and can create roster holes. It should receive a franchise-owned adapter boundary before any execution path is enabled.

Recommended reasoning: **High**.

Exact next prompt:

```text
Recommended reasoning: High

Please implement D4: franchise free-agency adapter foundation, dry-run only.

Scope:
- Do not implement free-agency mutations.
- Do not transfer players.
- Do not write franchise player records.
- Do not write transactions.
- Do not implement draft, trades, retirements, Phase 11 cut/sign, or full offseason progression.
- Keep this dry-run/read-only and adapter-contract aligned.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/OFFSEASON_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D2_RATINGS_SALARY_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D3_RETIREMENT_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonAdapters.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonDataAccess.ts
- existing free-agency/prototype flow code if present

Goals:
1. Add a franchise free-agency adapter that follows D0/D1 context/result patterns.
2. Dry-run only.
3. Validate franchise/offseason context and transition journal warnings.
4. Use franchise-owned players, teams, and farm/roster status only.
5. Produce read-only free-agency exposure/candidate proposals with trust levels, evidence, and limitations.
6. Explicitly reject apply/commit.
7. Add tests proving no League Builder/global reads or writes, no franchise player writes, no transactions, wrong-context failure, transition warnings, method/version, and missing-data limitations.

After implementation:
- Run new D4 adapter tests.
- Run D0/D1, D2, and D3 focused tests.
- Run npm run build.
- Summarize changed files, behavior, method used, tests, and remaining risks.
```
