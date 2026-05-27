# Franchise Retirement Mutation Design

Date: 2026-05-25

This document is a design/spec artifact only. It does not implement retirement execution, UI changes, tests, generated filler pools, import writes, roster analyzer mutations, free agency, draft, trades, or the true-value salary model.

## 1. Executive Summary

The current franchise retirement work is D3 preview-only. The dry-run adapter and RetirementFlow surface can identify retirement-risk candidates and explain limitations, but they do not retire players, write transactions, update farm records, or run the final OFFSEASON retirement ceremony.

This design defines what mutation-capable franchise retirement would require before implementation. The safest path is to preserve the existing D3 preview behavior, add a narrowly scoped execution core behind explicit confirmation, and keep the larger retirement ceremony, jersey retirement, narrative, morale, injury, contract, free agency, draft, trade, generated filler, and import-write systems deferred.

## 2. Current Baseline

Current method/version:

- `franchise-retirement-v1-age-risk-dry-run`

Current behavior:

- The adapter validates franchise offseason scope for the `RETIREMENTS` phase.
- It reads franchise-owned players through the D0/D1 data-access boundary.
- It reports transition journal warnings as non-blocking warnings.
- It builds age-risk candidates with evidence, probability bands, trust levels, and limitations.
- It is dry-run only.
- Apply/commit attempts return `ADAPTER_NOT_IMPLEMENTED`.
- The RetirementFlow franchise branch is a read-only preview.

Current limitations:

- It is not the final reverse-age/team-roll retirement model from the offseason spec.
- It does not mutate player status, roster assignment, farm records, transactions, jersey retirement, season summaries, narrative archives, morale, injury, contract state, or retirement history.
- It does not execute a retirement ceremony.
- It does not generate replacement players or feed directly into draft/free-agency execution.

## 3. Spec Alignment

The OFFSEASON spec expects retirements to behave like a season ceremony:

- Each team can see roughly 1-2 retirements per offseason.
- Players are considered from oldest to youngest.
- Older players receive higher retirement probability.
- The oldest player should be materially more likely to retire, while younger players remain low probability.
- A team may have no retirements.
- After a player retires, probabilities are recalculated before continuing.
- Retired players create empty roster slots that are later addressed by draft/free-agency/Phase 11 work.
- Jersey retirement is a separate immediate decision point after a player retires.
- Hall of Fame/museum handling is separate from the retirement moment.

Where D3 preview already aligns:

- Age is the dominant signal.
- Candidate output is explainable and evidence-based.
- Missing/deferred factors are disclosed as limitations instead of hidden confidence.
- Franchise scope validation is centralized through the offseason data-access boundary.

Where D3 preview diverges:

- It does not run per-team reverse-age rolls.
- It does not persist deterministic roll outcomes.
- It does not retire players.
- It does not create vacancies.
- It does not handle jersey retirement.
- It does not integrate narrative, morale, injury, contract, or service-time logic beyond limitations.

Recommended classification:

- MVP: explicit user-confirmed retirement execution for eligible franchise-owned MLB/FARM players during `RETIREMENTS`.
- Later: deterministic team-by-team reverse-age ceremony, no-retirement outcomes, repeated/recalculated rolls, persisted retirement result records, and jersey retirement prompt.
- Deferred: morale/injury/contract/narrative modifiers, Hall of Fame/museum integration, generated replacements, draft/free-agency execution coupling, and full spec ceremony polish.

## 4. Proposed Retirement Execution Model

### Candidate Pool Rules

The mutation-capable adapter should start from the same safe franchise-owned data boundary as D3:

- Require `franchiseId`.
- Require canonical `seasonId`.
- Require numeric `seasonNumber`.
- Require `statsScopeId === seasonId`.
- Require `offseasonStateId`.
- Require phase `RETIREMENTS`.
- Read franchise-owned players, teams, farm records, transition journals, and offseason state only.
- Do not read League Builder/global template players.
- Do not read prototype retirement storage.

For MVP execution, candidate rows should be produced by dry-run first. Apply should accept an explicit list of selected `playerIds`, then re-run validation and rebuild current candidate state before writing.

### Eligibility And Exclusion Rules

Recommended MVP status handling:

| Status | MVP execution behavior | Rationale |
| --- | --- | --- |
| `MLB` | Eligible if assigned to a franchise-owned team. | Core retirement path. |
| `FARM` | Eligible if player and farm record are both valid and assigned to the same franchise/team/season. | Farm retirement creates a farm vacancy and requires farm cleanup. |
| `FREE_AGENT` | Deferred/rejected in MVP. | Needs free-agent market semantics and historical visibility decisions. |
| `UNASSIGNED` | Deferred/rejected in MVP. | Needs inactive pool semantics before retirement should mutate it. |
| `RELEASED` | Rejected. | Already outside active franchise roster flow. |
| `RETIRED` | Rejected. | Idempotency guard. |
| `INACTIVE` | Rejected. | Insufficient active roster semantics. |
| Damaged/unknown | Rejected with structured issue. | Avoids corrupting unclear records. |

The design can later reopen `FREE_AGENT` or `UNASSIGNED` retirement if the app defines durable player-pool ownership and historical display rules.

### Probability And Risk Model

For the first mutation-capable wave, keep the current age-risk preview model for candidate selection and copy. Do not execute random retirement rolls yet. The first mutation path should retire only user-confirmed selected candidates.

A later reverse-age/team-roll model should:

- Sort candidates by team and age descending.
- Use deterministic seeding for reproducibility.
- Include `franchiseId`, `seasonId`, `seasonNumber`, `teamId`, candidate set hash, and roll index in the seed.
- Persist roll inputs/results before mutation if random execution is introduced.
- Recalculate probabilities after each accepted retirement.
- Allow no-retirement outcomes.

### Confirmation And Staging

MVP flow:

1. Dry-run preview lists candidates and limitations.
2. User selects one or more eligible candidates.
3. Confirmation repeats method/version, selected players, current statuses, rollback limits, and deferred systems.
4. Apply revalidates scope and player eligibility from current storage.
5. Apply writes only current valid selections.
6. Result panel reports successes, failures, rollback status, and remaining roster-lock impact.

Retirements should be user-confirmed in MVP. Random/team-roll execution should remain a later phase.

## 5. Data Mutations

### Franchise Player State

For an eligible retiring player, the adapter should update only the franchise-owned player record. Recommended persisted fields:

- `rosterStatus: 'RETIRED'`
- `rosterLevel: undefined` or equivalent inactive/retired representation
- `teamId` retained as `retiredFromTeamId` or historical assignment metadata
- `retiredSeasonId`
- `retiredSeasonNumber`
- `retiredAt`
- `retirementMethodVersion`

Raw ratings should not be changed. Historical player identity must remain stable.

### Roster Assignment

Retired players should be excluded from active MLB and FARM roster counts immediately after mutation. Their historical franchise player record should remain available for past seasons, season summaries, transactions, and later retired-player surfaces.

### Farm Record Handling

If the player retires from `FARM`:

- The matching franchise farm record must be deleted or marked inactive according to the existing farm storage pattern.
- A stale active farm record must not remain after a successful retirement.
- The transaction/result should include enough before/after evidence to diagnose farm cleanup.

If farm cleanup fails, the player retirement should not be considered successfully applied.

### Transaction Logging

Each successful retirement should write a canonical franchise transaction. Required identity:

- `franchiseId`
- `seasonId`
- `seasonNumber`
- `statsScopeId`
- `offseasonStateId`
- top-level phase `OFFSEASON`
- payload phase `RETIREMENTS`
- `playerId`
- `teamId` or `retiredFromTeamId`
- previous roster status/level
- method/version

Recommended transaction type:

- `retirement`

If no compatible transaction type exists at implementation time, add the smallest canonical transaction type needed rather than overloading release/cut movement.

### Season Summary, History, And Narrative

MVP should not rewrite existing SeasonSummary records automatically. Retirement history should first be durable in transactions/player metadata. Later waves can add:

- retirement result records for offseason history,
- SeasonSummary retirement references,
- almanac/narrative archive entries,
- jersey retirement records,
- Hall of Fame/museum links.

Prototype narrative systems should not be activated as part of MVP retirement mutation.

### Historical Visibility

Retired players should remain visible wherever historical franchise rosters or completed seasons need stable identity. They should be hidden from active roster construction, farm counts, GameTracker launch rosters, and Phase 11 active/farm lock counts unless a historical view explicitly includes retired players.

### Phase 11 Planner And Lock Effects

After retirements:

- `franchiseRosterLockValidator` should remain the source of truth for 22 MLB / 10 FARM / 32 total readiness.
- Retired MLB players create MLB vacancies.
- Retired FARM players create farm vacancies and must not leave farm records that let the lock validator pass incorrectly.
- The Phase 11 correction UI should show resulting vacancies but should not auto-fill them.

## 6. Safety And Rollback

### Required Canonical Context

Mutation-capable retirement must require:

- `franchiseId`
- `seasonId`
- `seasonNumber`
- `statsScopeId`
- `offseasonStateId`
- phase `RETIREMENTS`

`statsScopeId` should match `seasonId` for franchise retirement execution.

### Write Ordering

Recommended per-player order:

1. Validate current player/team/farm scope.
2. Snapshot player and farm record before writing.
3. Write retired player state.
4. Delete or update farm record if needed.
5. Write retirement transaction.
6. Return success with before/after snapshots.

### Failure Handling

If player write fails:

- Return failure.
- No transaction should be written.
- No farm mutation should occur.

If farm cleanup fails after player write:

- Attempt to restore the prior player record.
- Return `FARM_CLEANUP_FAILED` if rollback succeeds.
- Return `ROLLBACK_FAILED` if restoration fails.

If transaction logging fails after player/farm writes:

- Attempt to restore the prior player record.
- Attempt to restore the prior farm record if it was changed.
- Return `TRANSACTION_LOG_FAILED` if rollback succeeds.
- Return `ROLLBACK_FAILED` with rollback details if any restoration fails.

Compensating rollback must be described honestly. It is not true IndexedDB cross-store atomicity.

### Structured Result States And Issue Codes

Recommended result states:

- `dry_run`
- `requires_confirmation`
- `applied`
- `partial_failure`
- `failed`
- `rolled_back`
- `rollback_failed`
- `not_implemented`

Recommended issue codes:

- `MISSING_CONTEXT`
- `PHASE_MISMATCH`
- `STATS_SCOPE_MISMATCH`
- `OFFSEASON_STATE_NOT_FOUND`
- `PLAYER_NOT_FOUND`
- `PLAYER_SCOPE_MISMATCH`
- `TEAM_NOT_FOUND`
- `PLAYER_STATUS_INVALID`
- `PLAYER_ALREADY_RETIRED`
- `FARM_RECORD_NOT_FOUND`
- `FARM_RECORD_SCOPE_MISMATCH`
- `FARM_ASSIGNMENT_MISMATCH`
- `STALE_PREVIEW`
- `PLAYER_WRITE_FAILED`
- `FARM_CLEANUP_FAILED`
- `TRANSACTION_LOG_FAILED`
- `ROLLBACK_FAILED`
- `ADAPTER_NOT_IMPLEMENTED`

## 7. UI Requirements

The mutation UI should be a confirmation layer on top of the existing preview, not a new broad offseason workflow.

Requirements:

- Preview first.
- No retirement mutation directly from initial preview.
- Explicit confirmation before apply.
- Confirmation repeats selected players, method/version, raw rating non-mutation, rollback limits, and deferred systems.
- Result panel shows success count, failed players, issue codes/messages, and rollback details.
- Copy should say retirement writes are durable and rollback is compensating/best-effort.
- No prototype/global retirement mutation path should be reachable in franchise context.
- No jersey retirement mutation should be bundled into MVP.
- No automatic retirement should run during FinalizeAdvanceFlow.
- No auto-advance should occur after retirement.

## 8. Tests Required Before Implementation Is Accepted

Adapter/core tests:

- Candidate eligibility matrix for `MLB`, `FARM`, `FREE_AGENT`, `UNASSIGNED`, `RELEASED`, `RETIRED`, `INACTIVE`, and damaged/unknown records.
- Dry-run no-write guarantee.
- Apply requires explicit selected player IDs.
- Apply revalidates current player scope and status.
- Player status mutates to `RETIRED` for valid selected players.
- Raw ratings are unchanged.
- FARM retirement cleans up or deactivates the matching farm record.
- Farm cleanup failure rolls back player state where possible.
- Transaction log includes franchiseId, seasonId, seasonNumber, statsScopeId, offseasonStateId, phase, player, team, previous status, and method/version.
- Transaction failure rolls back player and farm writes where possible.
- Rollback failure returns `ROLLBACK_FAILED` with useful details.
- Wrong franchise/offseason/phase/statsScope fails before writes.
- No League Builder/global/prototype writes.

UI tests:

- Preview renders before confirmation.
- Apply/commit cannot run without confirmation.
- Confirmation repeats method/version and rollback-limited copy.
- Success result shows changed player count.
- Failure result shows structured issue codes/messages.
- Rollback failure details are visible.
- No jersey retirement/prototype controls appear in franchise context.

Integration/regression tests:

- Phase 11 planner/lock updates after retirement.
- GameTracker roster launch excludes retired players.
- TeamHub active/farm views exclude retired players unless historical/retired view is explicit.
- Existing D2-D7 adapter tests remain green.
- Existing Phase 11 actions/planner/correction tests remain green.

## 9. Open Decisions

Key decisions before full implementation:

- Should MVP execute only user-confirmed selected retirements, or should it include deterministic random retirement rolls?
- What exact probability curve should replace or extend the current age-risk model?
- Should randomness be seeded and persisted before mutation?
- Should FARM players be eligible in the first mutation wave or deferred to the full ceremony?
- Should `FREE_AGENT` or `UNASSIGNED` players ever retire in franchise offseason MVP?
- Should jersey retirement be implemented immediately after a retirement, or remain a later separate ceremony?
- Should retirement history live first in transactions/player metadata only, or should a dedicated retirement result store be introduced?
- How much of the OFFSEASON spec ceremony is necessary before free agency/draft execution?
- Should narrative, morale, injury, contract, or service-time factors alter probability in MVP, or remain limitations?

## 10. Recommended Implementation Phases

### R0: Design Closeout

Purpose: Approve this design and choose the first mutation scope.

Scope:

- No app code.
- No UI.
- No tests.
- Decide MVP eligibility and confirmation model.

Recommended reasoning level: High.

### R1: Adapter Execution Core

Purpose: Add mutation-capable retirement execution behind explicit selected-player input, without broad UI ceremony.

Scope:

- Extend the franchise retirement adapter to support apply for selected valid MLB/FARM players.
- Preserve dry-run behavior and method/version clarity.
- Require D0/D1 context validation, phase `RETIREMENTS`, and `statsScopeId === seasonId`.
- Write only franchise-owned player/farm records and retirement transactions.
- Implement compensating rollback.
- Reject `FREE_AGENT`, `UNASSIGNED`, `RELEASED`, `RETIRED`, `INACTIVE`, and damaged/unknown records.

Out of scope:

- Random ceremony.
- Jersey retirement.
- Narrative/history archive.
- Free agency/draft/trade execution.
- Generated replacements.
- UI apply controls.

Recommended reasoning level: High.

### R2: UI Confirmation

Purpose: Add a narrow RetirementFlow confirmation/apply surface after R1 exists.

Scope:

- Preview first.
- Select/confirm eligible candidates.
- Apply through R1 only.
- Show success/failure/rollback details.

Out of scope:

- Full retirement ceremony.
- Jersey retirement.
- Auto-finalization.

Recommended reasoning level: High.

### R3: Narrative And History Integration

Purpose: Persist retirement outcomes into durable history surfaces after execution semantics are proven.

Scope:

- Season/offseason history references.
- Optional almanac/narrative archive hooks.
- Retired-player visibility improvements.

Out of scope:

- Prototype narrative activation without scoped durable data.
- Hall of Fame/museum ceremony.

Recommended reasoning level: Medium to High.

### R4: Full Spec Ceremony

Purpose: Move from explicit selected retirements to the full team-by-team reverse-age retirement ceremony if still desired.

Scope:

- Deterministic team rolls.
- No-retirement outcomes.
- Recalculated probabilities.
- Jersey retirement prompt.
- Ceremony persistence.

Out of scope:

- Generated filler pools unless separately designed.
- Free agency/draft/trade execution unless those systems already exist.

Recommended reasoning level: Extra High.

## 11. Final Recommendation

The safest first implementation step is R1: adapter execution core only. It should retire explicitly selected, currently eligible franchise-owned MLB/FARM players after revalidation; update player/farm state; write canonical retirement transactions; and provide compensating rollback. It should not add UI controls, random retirement rolls, jersey retirement, generated replacement players, free agency/draft/trade execution, import writes, roster analyzer mutations, or the true-value salary model.

Exact next implementation prompt:

```text
Recommended reasoning: High

Please implement R1: mutation-capable franchise retirement adapter execution core.

Scope:
- Implement code and tests only for the adapter/core.
- Do not add UI.
- Do not implement random retirement ceremony.
- Do not implement jersey retirement.
- Do not implement free agency, draft, trades, generated filler pools, import writes, roster analyzer mutations, or true-value salary model.
- Preserve the existing D3 dry-run preview behavior.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_MUTATION_DESIGN.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementAdapter.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonDataAccess.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseFarmStorage.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseTransactionLog.ts or the current franchise transaction writer
- /Users/johnkruse/Projects/kbl-tracker/src/utils/tests/franchiseRetirementAdapter.test.ts

Implement:
1. Apply mode for explicit selected playerIds only.
2. Required canonical context: franchiseId, seasonId, seasonNumber, statsScopeId === seasonId, offseasonStateId, phase RETIREMENTS.
3. Eligible MVP statuses: MLB and FARM only.
4. Rejections for FREE_AGENT, UNASSIGNED, RELEASED, RETIRED, INACTIVE, damaged/unknown, wrong-scope, stale preview, and missing records.
5. Player mutation to RETIRED while preserving raw ratings and historical identity.
6. FARM retirement cleanup with no stale farm records.
7. Canonical retirement transaction logging.
8. Compensating rollback for player/farm/transaction failures, clearly reported as best-effort not atomic.

Tests:
- Candidate eligibility matrix.
- Dry-run still writes nothing.
- Apply success for MLB and FARM.
- Farm cleanup.
- Transaction identity.
- Wrong context/status failures before writes.
- Transaction failure rollback.
- Farm cleanup failure rollback.
- Rollback failure details.
- No League Builder/global/prototype writes.
- Existing D2-D7 and Phase 11 focused tests remain green.

Output:
- Findings/implementation summary.
- Tests run.
- Any remaining risks before R2 UI confirmation.
```

