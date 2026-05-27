# Franchise D5 Draft Readiness Preview Checkpoint

Date: 2026-05-25

## 1. Completed Scope

D5 adds a franchise-owned, dry-run-only draft readiness preview foundation.

- `src/utils/franchiseDraftAdapter.ts` defines the D5 adapter contract and result shape.
- `src/src_figma/app/components/DraftFlow.tsx` renders a franchise-only readiness preview surface instead of the prototype draft mutation flow when `franchiseId` is present.
- `src/utils/tests/franchiseDraftAdapter.test.ts` covers adapter behavior.
- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx` covers the franchise UI boundary.

Completed behavior:

- Dry-run draft readiness reporting from franchise-owned team/player/farm scope.
- Transition journal warnings are surfaced through `validateFranchiseOffseasonScope(..., { includeTransitionJournals: true })`.
- Phase 11 roster lock readiness target framing is explicit.
- Apply/commit is explicitly rejected by the adapter.
- No draft class is generated or persisted.
- No picks are executed.
- No players are drafted, signed, released, replaced, retired, moved, or written.
- No farm records are written.
- No transactions are written.
- No draft state is persisted in franchise context.
- Franchise `DraftFlow` exposes no apply, confirm, draft, sign, release, replace, save, or execute controls.

## 2. Method Boundary

Current method/version:

```text
franchise-draft-v1-roster-readiness-dry-run
```

The D5 preview is a roster readiness and needs preview only. It reports:

- team readiness by franchise-owned team.
- MLB count.
- farm count.
- total count.
- MLB vacancies.
- farm vacancies.
- farm overage.
- total vacancies.
- position/role needs.
- draft urgency.
- trust level.
- evidence.
- limitations.

This is intentionally **not** the final draft system described in `OFFSEASON_SYSTEM_SPEC.md` Section 9, which specifies draft class generation, inactive-player injection, draft order, pick execution, replacement/release rules, undrafted retirements, and post-draft salary recalculation.

Inactive in D5:

- Draft class generation.
- Final prospect generation.
- Draft order execution.
- Pick execution.
- Replacement/release rules.
- Player signing.
- Player retirement.
- Franchise player creation.
- Franchise farm record creation.
- Draft-state persistence.
- Draft transaction logging.
- Post-draft salary recalculation.

## 3. Data And Mutation Boundaries

D5 reads franchise-owned offseason scope only through the D0/D1 adapter validation/data-access boundary.

Allowed:

- Franchise team records from validated franchise offseason scope.
- Franchise player records from validated franchise offseason scope.
- Franchise farm records through scoped validation.
- Player roster status, team assignment, primary/secondary position, and roster/farm counts when present.
- Transition journal warning visibility.
- Requested-team validation through franchise-owned team IDs.

Blocked/not implemented:

- No League Builder/global writes.
- No franchise player writes.
- No franchise team writes.
- No franchise farm record writes.
- No transaction writes.
- No draft-state writes.
- No draft class persistence.
- No `savePlayer(...)` calls in franchise context.
- No `saveTeamRoster(...)` calls in franchise context.
- No `saveDraft(...)` calls in franchise context.
- No draft/sign/release/replace controls.
- No mutation-capable draft adapter.

The adapter rejects `apply: true` with `ADAPTER_NOT_IMPLEMENTED`.

## 4. UI Behavior

In franchise context, `DraftFlow` now renders a preview-only surface:

- Header: `DRAFT READINESS PREVIEW`.
- Method boundary: `franchise-draft-v1-roster-readiness-dry-run`.
- Teams reviewed count.
- Teams with needs count.
- Warning/issue count.
- Draft class status: unavailable.
- Preview-only team readiness list.
- MLB/farm/total counts.
- Farm and MLB vacancies.
- Position/role needs.
- Urgency and trust level.
- Evidence list.
- Limitations list.
- Warnings/issues section.
- Close-only control.

The UI copy states:

- Preview only.
- No draft picks are made.
- No players are generated, signed, released, replaced, retired, or moved.
- No transactions are written.
- No draft class is persisted.
- Draft class preview is unavailable until a safe pure generator exists.
- The 22 MLB / 10 farm counts are Phase 11 roster lock readiness targets, not current draft-phase requirements.

This Phase 11 framing is important because `FARM_SYSTEM_SPEC.md` states the farm roster is unlimited during the season and the 22 MLB / 10 farm constraint is enforced at Phase 11 Finalize & Advance.

Non-franchise/prototype behavior is preserved intentionally.

## 5. Tests And Confidence

Focused tests added/updated:

- `src/utils/tests/franchiseDraftAdapter.test.ts`
  - Dry-run readiness reports from franchise-owned teams, players, and farm records.
  - No franchise player writes.
  - No franchise team writes.
  - No franchise farm writes or deletes.
  - No League Builder/global player or roster writes.
  - No transaction writes.
  - Requested franchise-owned team filtering.
  - Wrong franchise/offseason context fails validation.
  - Wrong phase fails explicit draft validation.
  - Transition journal warnings are surfaced and non-blocking.
  - Missing farm and position data becomes limitations, not confident advice.
  - Missing requested team fails validation.
  - Method/version and draft-class unavailable limitations are present.
  - Apply attempts are rejected.

- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
  - Franchise `DraftFlow` renders the dry-run readiness preview.
  - Shows method boundary and preview-only copy.
  - Shows `TRANSITION_ATTENTION_REQUIRED`.
  - Shows MLB/farm readiness counts.
  - Shows position/role needs.
  - Shows Phase 11 roster lock readiness target copy.
  - Shows draft-class unavailable limitation.
  - Does not render inactive-player, generated-prospect, begin-draft, pick, pass, save, or phase-advance mutation controls.
  - Does not call prototype/global draft mutation paths.

Latest focused run at D5 preview closeout:

- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx src/utils/tests/franchiseDraftAdapter.test.ts`

Result:

- 2 test files passed.
- 20 tests passed.

## 6. Known Limitations / Cleanup

Known limitation:

- `DraftFlow` still initializes legacy/prototype `useOffseasonData`, `useOffseasonState`, and active-franchise metadata reads before the franchise preview branch returns.

This is currently tolerated because the franchise branch does not use the prototype mutation controls and tests prove the mutation paths are not called. It is still architectural debt because the component can touch global/prototype read hooks before rendering the franchise preview.

Future cleanup:

- Split the franchise draft readiness preview into a separate component or branch before global/prototype reads initialize.
- Move shared warning/issue rendering into a small reusable offseason adapter UI helper.
- Keep Phase 11 target copy attached to any future draft UI that displays 22 MLB / 10 farm counts.
- Implement a safe pure draft class generator only after the franchise-owned draft model, prospect identity, farm record creation, salary/control defaults, transaction logging, and rollback behavior are designed and tested.

Deferred:

- Final draft class generation.
- Inactive-player injection into the draft class.
- Draft order execution.
- Draft pick execution.
- Replacement/release rules.
- Undrafted released-player retirement.
- Franchise prospect/player creation.
- Franchise farm record creation.
- Draft transaction logging.
- Draft-state persistence.
- Post-draft salary recalculation.

## 7. Recommended Next Wave

Recommended next wave: **D6 franchise offseason trades adapter foundation, dry-run only**.

Why:

- Ratings/salary now has a mutation-capable adapter with explicit commit.
- Retirement, free agency, and draft now have safe read-only preview surfaces.
- Offseason trades are the next high-risk prototype phase because they can mutate multiple teams, players, farm state, and transaction history. They should receive a franchise-owned dry-run adapter boundary before any execution path is enabled.
- A dry-run trade adapter can also reuse the roster/farm readiness and no-mutation patterns established by D4 and D5.

Recommended reasoning: **High**.

Exact next prompt:

```text
Recommended reasoning: High

Please implement D6: franchise offseason trades adapter foundation, dry-run only.

Scope:
- Do not implement trade mutations.
- Do not move players.
- Do not write franchise player records.
- Do not write franchise farm records.
- Do not write League Builder/global records.
- Do not write transactions.
- Do not write trade state.
- Do not add trade execution UI.
- Do not implement Phase 11 cut/sign or full offseason progression.
- Keep this dry-run/read-only and adapter-contract aligned.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/OFFSEASON_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FARM_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D4_FREE_AGENCY_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D5_DRAFT_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonAdapters.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonDataAccess.ts
- existing trade/prototype flow code if present, but do not reuse mutation paths.

Goals:
1. Add a franchise offseason trades adapter that follows D0/D1 context/result patterns.
2. Dry-run only.
3. Validate franchise/offseason context and transition journal warnings.
4. Use franchise-owned teams, players, farm records, roster status, and salary/grade/position data where safely available.
5. Produce read-only trade-readiness or trade-risk reports with trust levels, evidence, and limitations.
6. Explicitly state that AI proposals, player movement, farm movement, transaction logging, and trade-state persistence are deferred.
7. Explicitly reject apply/commit with `ADAPTER_NOT_IMPLEMENTED`.
8. Add tests proving no League Builder/global writes, no franchise player/farm writes, no transactions, wrong-context failure, phase mismatch failure, transition warnings, method/version, and missing-data limitations.

After implementation:
- Run new D6 adapter tests.
- Run D4 and D5 focused tests.
- Run franchise offseason guard component tests if a preview surface is added.
- Summarize changed files, behavior, method used, tests, and remaining risks.
```
