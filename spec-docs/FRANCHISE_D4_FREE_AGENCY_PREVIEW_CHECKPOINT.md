# Franchise D4 Free-Agency Preview Checkpoint

Date: 2026-05-25

## 1. Completed Scope

D4 adds a franchise-owned, dry-run-only free-agency preview foundation.

- `src/utils/franchiseFreeAgencyAdapter.ts` defines the D4 adapter contract and result shape.
- `src/src_figma/app/components/FreeAgencyFlow.tsx` renders a franchise-only preview surface instead of the prototype free-agency mutation flow when `franchiseId` is present.
- `src/utils/tests/franchiseFreeAgencyAdapter.test.ts` covers adapter behavior.
- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx` covers the franchise UI boundary.

Completed behavior:

- Dry-run free-agency candidate generation from franchise-owned player/team/farm scope.
- Protected-player validation for:
  - protected team missing from scoped franchise teams.
  - protected player missing from scoped franchise players.
  - protected player assigned to a different team.
  - protected player not on the MLB active roster.
- Transition journal warnings are surfaced through `validateFranchiseOffseasonScope(..., { includeTransitionJournals: true })`.
- Apply/commit is explicitly rejected by the adapter.
- No players are released, moved, exchanged, signed, retired, or written.
- No transactions are written.
- Franchise `FreeAgencyFlow` exposes no protection confirmation, dice roll, destination, exchange, apply, release, sign, move, or save controls.

## 2. Method Boundary

Current method/version:

```text
franchise-free-agency-v1-dice-board-dry-run
```

The D4 preview uses a spec-inspired dice-board exposure model:

- Group MLB-active franchise players by team.
- Exclude a valid protected player when provided.
- Sort eligible players by `overallGrade`.
- Map the top 11 non-protected players to the spec dice order:

```text
7, 6, 8, 5, 9, 4, 10, 3, 11, 2, 12
```

- Attach the 2d6 probability associated with each dice value.
- Return risk band, probability score, evidence, limitations, and trust level.

This is intentionally **not** the final free-agency system described in `OFFSEASON_SYSTEM_SPEC.md` Section 8, which specifies two rounds of protection, dice execution, personality-based destination resolution, player exchange selection, and roster movement.

Inactive in D4:

- Dice execution.
- Destination/personality resolution.
- Return-player exchange selection.
- Roster movement.
- Final free-agent decisions.
- Release/sign/exchange/move actions.
- Free-agency transaction logging.
- Morale, contract, narrative, and full true-value systems as executable logic.

## 3. Data And Mutation Boundaries

D4 reads franchise-owned offseason scope only through the D0/D1 adapter validation/data-access boundary.

Allowed:

- Franchise player records from validated franchise offseason scope.
- Franchise team records from validated franchise offseason scope.
- Franchise farm records through scoped validation.
- Player roster status, team assignment, age, salary, grade, personality, contract/control fields, morale, and service/seasons fields when present.
- Transition journal warning visibility.
- Protected-player validation issues.

Blocked/not implemented:

- No League Builder/global writes.
- No franchise player writes.
- No transaction writes.
- No `transferPlayer(...)` calls in franchise context.
- No `retirePlayer(...)` calls in franchise context.
- No `saveFreeAgentSignings(...)` calls in franchise context.
- No release/sign/exchange/move controls.
- No mutation-capable free-agency adapter.

The adapter rejects `apply: true` with `ADAPTER_NOT_IMPLEMENTED`.

## 4. UI Behavior

In franchise context, `FreeAgencyFlow` now renders a preview-only surface:

- Header: `FREE AGENCY PREVIEW`.
- Method boundary: `franchise-free-agency-v1-dice-board-dry-run`.
- Candidate count.
- Read-only dice-board/team preview.
- Read-only candidate list.
- Candidate risk band and score.
- Candidate dice value when available.
- Trust level.
- Evidence list.
- Limitations list.
- Warnings/validation notes section.
- Preview limitations section.
- Close-only control.

The UI copy states:

- Preview only.
- No players are released, moved, exchanged, signed, or written.
- No transactions are written.
- No dice rolls are executed.
- No destination is selected.
- No player exchange is selected.
- Final free-agency ceremony and exchange model remains deferred.

Non-franchise/prototype behavior is preserved intentionally.

## 5. Tests And Confidence

Focused tests added/updated:

- `src/utils/tests/franchiseFreeAgencyAdapter.test.ts`
  - Dry-run candidates from franchise-owned players.
  - No franchise player writes.
  - No League Builder/global player or roster writes.
  - No transaction writes.
  - Valid protected player excludes that player from the dice-board preview.
  - Invalid protected team fails validation.
  - Missing protected player fails validation.
  - Wrong-team protected player fails validation.
  - Non-MLB protected player fails validation.
  - Wrong franchise/offseason context fails validation.
  - Wrong phase fails explicit free-agency validation.
  - Transition journal warnings are surfaced and non-blocking.
  - Method/version and limitations are present.
  - Missing contract/control/personality/morale/service data becomes limitations, not confident advice.
  - Apply attempts are rejected.

- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
  - Franchise `FreeAgencyFlow` renders dry-run candidates.
  - Shows method boundary and limitation copy.
  - Shows `TRANSITION_ATTENTION_REQUIRED`.
  - Shows protected-player validation issues such as `PROTECTED_PLAYER_STATUS_INVALID`.
  - Does not render prototype protection/dice/destination/exchange/save controls.
  - Does not call prototype/global free-agency mutation paths.

Latest focused run at D4 implementation closeout:

- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
- `npm test -- src/utils/tests/franchiseFreeAgencyAdapter.test.ts src/utils/tests/franchiseOffseasonAdapters.test.ts`
- `npm run build`

All passed at closeout.

## 6. Known Limitations / Cleanup

Known limitation:

- `FreeAgencyFlow` still initializes legacy/prototype `useOffseasonData`, `useLeagueBuilderData`, and `useOffseasonState` hooks before the franchise preview branch returns.

This is currently tolerated because the franchise branch does not use the prototype mutation controls and tests prove the mutation paths are not called. It is still architectural debt because the component can touch global/prototype read hooks before rendering the franchise preview.

Future cleanup:

- Split the franchise free-agency preview into a separate component or branch before global/prototype reads initialize.
- Move shared warning/issue rendering into a small reusable offseason adapter UI helper.
- Decide whether protected-player selection should become a durable franchise-owned input before final free-agency execution exists.
- Implement the final free-agency mutation workflow only after franchise-owned player movement, transaction logging, exchange validation, and rollback behavior are designed and tested.

Deferred:

- Full two-round free-agency ceremony.
- Dice-roll execution.
- Personality destination resolution.
- Return-player exchange selection.
- Franchise player transfers.
- Free-agency transaction logging.
- Retirement via `DROOPY` free-agency outcome.
- Roster hole/exchange downstream handling.

## 7. Recommended Next Wave

Recommended next wave: **D5 franchise draft adapter foundation, dry-run only**.

Why:

- Ratings/salary has a mutation-capable adapter with explicit commit.
- Retirement has a safe read-only preview.
- Free agency has a safe read-only preview with protected-player validation.
- Draft is the next large offseason phase with historically high risk because it can introduce new player records and mutate team rosters. It should receive a franchise-owned dry-run adapter boundary before any execution path is enabled.

Recommended reasoning: **High**.

Exact next prompt:

```text
Recommended reasoning: High

Please implement D5: franchise draft adapter foundation, dry-run only.

Scope:
- Do not implement draft mutations.
- Do not create or assign players.
- Do not write franchise player records.
- Do not write franchise team records.
- Do not write transactions.
- Do not implement free agency, trades, Phase 11 cut/sign, or full offseason progression.
- Keep this dry-run/read-only and adapter-contract aligned.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/OFFSEASON_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D3_RETIREMENT_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D4_FREE_AGENCY_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonAdapters.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonDataAccess.ts
- existing draft/prototype flow code if present, but do not reuse mutation paths

Goals:
1. Add a franchise draft adapter that follows D0/D1 context/result patterns.
2. Dry-run only.
3. Validate franchise/offseason context and transition journal warnings.
4. Use franchise-owned teams, players, farm/roster status, season summary, and roster-hole context where safely available.
5. Produce read-only draft order/need/prospect-slot preview with trust levels, evidence, and limitations.
6. Explicitly reject apply/commit.
7. Add tests proving no League Builder/global reads or writes, no franchise player/team writes, no transactions, wrong-context failure, transition warnings, method/version, and missing-data limitations.

After implementation:
- Run new D5 adapter tests.
- Run D0/D1, D3, and D4 focused tests.
- Run npm run build.
- Summarize changed files, behavior, method used, tests, and remaining risks.
```
