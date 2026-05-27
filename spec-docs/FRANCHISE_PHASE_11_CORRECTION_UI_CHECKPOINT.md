# Franchise Phase 11 Correction UI Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add UI, add tests, implement free agency/draft/trade/retirement execution, add generated filler pools, add external free-agent sources, or change D2-D7 adapter behavior.

Primary references:

- `spec-docs/FRANCHISE_PHASE_11_ROSTER_FOUNDATION_CHECKPOINT.md`
- `spec-docs/FRANCHISE_OFFSEASON_ADAPTERS_D2_D7_CHECKPOINT.md`
- `spec-docs/FARM_SYSTEM_SPEC.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`
- `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`
- `src/utils/franchisePhase11RosterActions.ts`
- `src/utils/franchisePhase11RosterPlanner.ts`
- `src/utils/franchiseRosterLockValidator.ts`
- `src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx`

## 1. Executive Summary

Phase 11 now has a minimal franchise correction UI inside `FinalizeAdvanceFlow`.

The correction UI is available only after franchise finalization is blocked by an invalid durable Phase 11 roster lock. It is not a full offseason phase workflow. It gives the user a narrow way to resolve final roster-lock count problems using durable Phase 11 primitives:

- release/cut from existing franchise-owned MLB/FARM players.
- sign/fill from existing eligible franchise-owned players.

This UI does not implement full free agency, draft, trade, or retirement execution. It does not create generated filler players, read external player pools, or use League Builder/global templates as a player source. It also does not auto-finalize after a correction; the user must continue finalization intentionally after the durable lock is valid.

## 2. Completed Scope

Completed UI and workflow scope:

- Correction panel is rendered when finalization is blocked by invalid Phase 11 roster lock.
- Panel displays planner counts, lock issues, requirements, warnings, and limitations.
- Release/cut candidates are surfaced from franchise-owned MLB/FARM player assignments.
- Sign/fill candidates are surfaced from existing franchise-owned eligible players only.
- Release/cut action requires an explicit confirmation step.
- Sign/fill action requires an explicit confirmation step.
- Successful correction refreshes the Phase 11 plan and lock state.
- Successful correction displays the saved result and transaction id when present.
- Failed correction displays structured action error code/message.
- Rollback attempts and rollback error details are displayed when present.
- No automatic finalization is triggered after a correction, even when the refreshed lock becomes valid.

The UI intentionally remains minimal:

- It does not pick optimal players.
- It does not run roster analyzer recommendations.
- It does not batch multiple corrections.
- It does not implement a full signing round or cut/sign ceremony.
- It does not add generated players or external free agents.

## 3. Action Boundaries

### Release/Cut

Release/cut uses `releaseFranchisePhase11Player(...)`.

Allowed source:

- Existing franchise-owned player assigned to the selected franchise team as `MLB`.
- Existing franchise-owned player assigned to the selected franchise team as `FARM`.

Rejected or unavailable:

- Missing franchise player.
- Player not assigned to the selected team.
- `FREE_AGENT`
- `UNASSIGNED`
- `RELEASED`
- `RETIRED`
- `INACTIVE`
- damaged/unknown status

The action updates only franchise-owned player/farm state and writes a canonical Mode 2 v1 transaction when successful.

### Sign/Fill

Sign/fill uses `signFranchisePhase11Player(...)`.

Allowed existing franchise-owned sources:

- no assignments.
- all assignments are `FREE_AGENT`.
- all assignments are `UNASSIGNED`.

Rejected or not exposed:

- `RELEASED`
- `RETIRED`
- `INACTIVE`
- existing `MLB`
- existing `FARM`
- damaged/unknown statuses
- mixed assignment sets that include unavailable statuses
- stale farm records when signing/filling to MLB

The current UI exposes eligible franchise-owned candidates only. It does not expose released, retired, inactive, active MLB/FARM, damaged/unknown, generated, external, League Builder, global, or prototype-source players as sign/fill candidates.

No external/generated/League Builder/global player source exists in this correction UI.

## 4. Data And Mutation Safety

Canonical context:

- `franchiseId`
- canonical `seasonId`
- `statsScopeId` where supplied, matching `seasonId`
- `seasonNumber`
- `offseasonStateId` where supplied
- Phase 11 payload context: `PHASE_11_FINALIZE`

Transaction context:

- Release/cut logs Mode 2 v1 `release`.
- Sign/fill logs Mode 2 v1 `free_agent_signing`.
- Both use `phase: "OFFSEASON"`.
- Both include `rosterMovementPhase: "PHASE_11_FINALIZE"` in transaction payload data.
- Both preserve prior player/farm state in transaction `previousState` where available.

Mutation safety:

- Writes are limited to franchise-owned player records, franchise farm records, and canonical transaction records.
- No League Builder/global/template/prototype writes are allowed.
- No prototype/local-only roster controls are authoritative in franchise context.
- No automatic cut/sign runs during finalization.
- No generated filler or external free-agent source is consulted.
- D2-D7 adapter boundaries remain unchanged.

Rollback:

- Phase 11 primitives use compensating rollback.
- Rollback status and errors are structured in action results.
- UI copy explicitly states this is compensating rollback, not true cross-store atomicity.
- True transaction atomicity remains deferred.

## 5. Tests And Confidence

Focused tests for this checkpoint:

- `src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx`
  - invalid durable lock blocks finalization.
  - correction surface renders planner counts and structured lock issues.
  - release correction requires confirmation.
  - release correction calls durable primitive.
  - release correction refreshes the plan.
  - release correction does not auto-finalize.
  - sign correction requires confirmation.
  - sign correction exposes eligible franchise-owned candidates.
  - failed action displays structured errors and rollback details.

- `src/utils/tests/franchisePhase11RosterActions.test.ts`
  - release/cut updates franchise-owned player/farm state.
  - release/cut logs canonical Phase 11 transaction context.
  - sign/fill uses franchise-owned free-agent/no-assignment/unassigned player state.
  - sign/fill rejects released, retired, inactive, existing MLB, and existing FARM.
  - MLB sign/fill rejects stale farm records.
  - FARM sign/fill creates franchise farm record.
  - writer failure compensates prior player/farm changes where possible.
  - rollback failure returns `ROLLBACK_FAILED`.
  - no League Builder/global/template read path is used by the action tests.

- `src/utils/tests/franchisePhase11RosterPlanner.test.ts`
  - valid 22 MLB / 10 FARM / 32 total state passes.
  - count failures are reported.
  - damaged farm/player status issues become repair requirements.

- `src/utils/tests/franchiseRosterMovement.test.ts`
  - existing franchise roster movement safety remains green.

Build confidence:

- The Phase 11 roster foundation checkpoint recorded a passing build after the foundation wave.
- Large Vite chunk warnings are existing/non-blocking and do not indicate Phase 11 functional failure.

Full-suite note:

- This checkpoint does not claim a full-suite run for this specific correction UI wave unless separately recorded.

## 6. Remaining Risks And Deferred Work

Remaining risks:

- UI is intentionally minimal and may be clunky for multi-team or many-correction scenarios.
- Candidate selection is operational, not recommendation-driven.
- No generated/external filler source exists, so teams with no eligible franchise-owned free-agent/unassigned/no-assignment players must be resolved by future offseason systems.
- Compensating rollback is not true atomicity.
- Full-suite verification may still be useful before major mutation-heavy work.

Deferred work:

- Full free-agency execution.
- Full draft execution.
- Full trade execution.
- Full retirement execution.
- Generated or external filler source design.
- True-value salary model and salary ledger.
- Full Phase 11 signing round and optional cut/sign ceremony.
- Import-write lifecycle follow-up.
- Career/milestone canonical franchise scoping.
- Roster analyzer mutation workflows.

## 7. Recommended Next Wave Analysis

### Option A: Full-Suite Verification / Stabilization Checkpoint

Value:

- Confirms the expanded Phase 11 UI and action primitives did not disturb broader franchise, GameTracker, persistence, or offseason surfaces.
- Provides a stable checkpoint before entering mutation-heavy systems.
- Lowers risk before investing in true-value salary, retirement, free agency, draft, or trade execution.

Risk:

- Low. This is verification and cleanup, not new feature behavior.

Dependencies:

- Current focused Phase 11 tests.
- Existing D2-D7 focused tests.
- Build command.

Recommended reasoning level:

- Medium.

### Option B: True-Value Salary Model

Value:

- Moves D2 closer to `OFFSEASON_SYSTEM_SPEC.md`, which describes salary recalculation at Phases 3, 8, and 10.
- Creates a stronger salary baseline for Phase 11 claim priority and future offseason execution systems.

Risk:

- Medium-high. Formula decisions can affect downstream roster strength, free agency, trades, and Phase 11 signing order.

Dependencies:

- Economic model decision.
- Durable salary recalculation ledger or phase artifact.
- Compatibility with existing grade/salary adapter.

Recommended reasoning level:

- High.

### Option C: Mutation-Capable Retirement Design

Value:

- Converts a bounded preview into executable player status changes.
- Creates concrete empty roster slots for later free-agency/draft/Phase 11 flows.

Risk:

- High. Retirement affects player status, history, transactions, jersey retirement, roster holes, and downstream offseason phases.

Dependencies:

- Retirement result persistence.
- Transaction logging.
- Empty-slot handling.
- Jersey retirement storage decision.
- Rollback and repair strategy.

Recommended reasoning level:

- Extra High.

### Option D: Mutation-Capable Free Agency Design

Value:

- Implements one of the core interactive offseason ceremonies.
- Would make protected players, dice outcomes, destination selection, exchange selection, and roster movement durable.

Risk:

- Very high. Free agency moves players across teams and must coordinate with roster/farm, salary, transactions, and rollback.

Dependencies:

- Durable protection input.
- Dice result persistence.
- Destination/exchange validation.
- Player movement orchestration.
- Transaction logging.
- Repair/rollback behavior.

Recommended reasoning level:

- Extra High.

### Option E: Mutation-Capable Draft/Trade Design

Value:

- Draft design enables long-term player replenishment and farm continuity.
- Trade design enables offseason roster shaping after salary recalculation.

Risk:

- Very high. Draft creates players/farm records and can release or retire existing players. Trades move existing players across teams and can affect farm, salary, chemistry, morale, and transactions.

Dependencies:

- Draft class/prospect identity model.
- Trade proposal/acceptance model.
- Player/farm movement orchestration.
- Transaction logging.
- Salary recalculation strategy.
- Rollback/repair behavior.

Recommended reasoning level:

- Extra High.

### Option F: Import-Write Lifecycle Follow-Up

Value:

- Completes the save-slot lifecycle beyond validation/export/delete.
- Important before user-facing restore workflows become central.

Risk:

- High. Import writes require exact identity handling, duplicate protection, remap strategy, and partial-import cleanup.

Dependencies:

- Manifest-driven export/delete.
- Import mode decision: exact restore versus remapped clone.
- Transition journal handling.
- Career/milestone scoping decision.

Recommended reasoning level:

- Extra High.

### Option G: Generated/External Filler Source Design

Value:

- Addresses the case where Phase 11 needs sign/fill but no eligible franchise-owned players exist.
- Could support future draft/free-agency/Phase 11 completion.

Risk:

- High. New player sources can blur ownership, identity, salary, farm eligibility, transaction, and export/import boundaries if rushed.

Dependencies:

- Decision on whether filler comes from generated prospects, inactive database, franchise-owned released pool, or a scoped free-agent pool.
- Player identity and salary defaults.
- Export/import ownership.
- Transaction logging.
- Farm eligibility and rating reveal behavior.

Recommended reasoning level:

- Extra High.

## 8. Final Recommendation

Recommended next wave: **full-suite verification / stabilization checkpoint**.

Why:

- The Phase 11 correction UI is the first narrow UI workflow that writes franchise-owned roster state during finalization.
- Focused coverage is good, but mutation-heavy systems should not start until the broader app suite and build are known stable at this checkpoint.
- This wave should be small and confidence-oriented: run the full suite, run build, fix only direct regressions, and update checkpoint docs with the result.

Keep deferred during the next wave:

- true-value salary model.
- retirement execution.
- free-agency execution.
- draft execution.
- trade execution.
- generated/external filler pools.
- import writes.
- roster analyzer mutations.
- broad Phase 11 UI expansion.

Exact next prompt:

```text
Recommended reasoning: Medium

Please run a Phase 11 correction UI stabilization checkpoint.

Scope:
- Do not add new features.
- Do not expand Phase 11 UI.
- Do not implement free agency, draft, trade, or retirement execution.
- Do not add generated filler pools or external free-agent sources.
- Do not implement true-value salary model.
- Do not implement import writes.
- Fix only direct regressions found by the requested verification.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_PHASE_11_CORRECTION_UI_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_PHASE_11_ROSTER_FOUNDATION_CHECKPOINT.md
- current repo state

Run:
- npm test
- npm run build

Review:
1. Full-suite status after Phase 11 correction UI.
2. Build status after Phase 11 correction UI.
3. Any failures directly caused by Phase 11 correction UI or roster actions.
4. Any existing/non-blocking warnings, including chunk-size warnings.

If failures are direct regressions:
- Propose or implement the smallest fix, depending on approval.

Output:
- Findings first, ordered by severity.
- Tests/build run.
- Whether Phase 11 correction UI is stable.
- Whether it is safe to move to the next mutation-heavy design wave.
```
