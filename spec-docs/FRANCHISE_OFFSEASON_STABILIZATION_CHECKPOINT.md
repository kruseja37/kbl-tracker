# Franchise Offseason Stabilization Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add tests, start the next feature wave, or change franchise/offseason behavior.

Primary references:

- `spec-docs/FRANCHISE_PHASE_11_CORRECTION_UI_CHECKPOINT.md`
- `spec-docs/FRANCHISE_PHASE_11_ROSTER_FOUNDATION_CHECKPOINT.md`
- `spec-docs/FRANCHISE_OFFSEASON_ADAPTERS_D2_D7_CHECKPOINT.md`
- `spec-docs/FRANCHISE_IMPLEMENTATION_ROADMAP_POST_AUDIT.md`

## 1. Executive Summary

The franchise offseason work is stable at the D2-D7 plus Phase 11 correction UI checkpoint.

Verification result:

- Full Vitest suite passed after D2-D7 and Phase 11 correction UI.
- Production build passed.
- No stabilization fixes were required.
- No app code or test code changes were needed during stabilization.

Current conclusion:

- The franchise/offseason boundary work is stable enough to choose the next implementation or design wave.
- Mutation-heavy systems should still be chosen deliberately because several major offseason systems remain intentionally deferred.

## 2. Verification Results

Full test suite:

```text
npm test -- --reporter=dot
```

Result:

```text
313 passed
6474 passed
```

Build:

```text
npm run build
```

Result:

```text
passed
```

No app or test code changes were needed for this stabilization checkpoint.

## 3. Current Completed Scope

Completed franchise/offseason scope at this checkpoint:

- D2 ratings/salary adapter and confirmation UI.
  - Mutation-capable.
  - Explicit confirmation before apply.
  - Writes only franchise-owned player records through the adapter.
  - Uses compensating rollback, not true cross-store atomicity.
- D3 retirement preview.
  - Preview/read-only.
  - No retirement execution.
- D4 free-agency preview.
  - Preview/read-only.
  - No free-agency execution.
- D5 draft readiness preview.
  - Preview/read-only.
  - No draft generation or execution.
- D6 trade preview.
  - Preview/read-only.
  - No trade execution.
- D7 cleanup.
  - TradeFlow franchise preview no longer falls back to season 1 when `seasonNumber` is missing or invalid.
- Phase 11 roster actions/planner.
  - Durable release/cut primitive.
  - Durable sign/fill primitive.
  - Read-only planner.
  - Exact 22 MLB / 10 FARM / 32 total lock target.
  - Lock validator remains the source of truth.
- Phase 11 correction UI.
  - Minimal correction surface only when finalization is blocked by invalid durable roster lock.
  - Release/cut and sign/fill confirmation flows.
  - Success refresh behavior.
  - Structured errors and rollback detail display.
  - No auto-finalize after correction.
- Save-slot and transition journal foundations already in place.
  - Manifest-driven export/delete/validation.
  - Import remains validate-only.
  - Durable transition journals and rollback hardening.
  - Transition journal manifest/export/delete/sync/backup cleanup.

## 4. Known Non-Blocking Noise

Known non-blocking noise observed or tracked around this checkpoint:

- React `act(...)` warnings in some GameTracker component tests.
- Expected stderr from sync negative-path tests.
- Existing Vite chunk-size warnings for large bundles.

These are not treated as blockers for the franchise offseason checkpoint because the full suite and build passed.

## 5. Stable Boundaries To Preserve

The following boundaries should remain stable unless a future wave explicitly owns and tests a replacement:

- D2 remains the only mutation-capable offseason adapter besides Phase 11 correction primitives.
- D3-D6 remain preview/read-only.
- Phase 11 correction UI stays narrow.
- Phase 11 correction UI only appears when durable roster lock blocks finalization.
- Phase 11 correction UI does not auto-finalize after correction.
- Release/cut uses franchise-owned MLB/FARM players only.
- Sign/fill uses existing franchise-owned eligible players only:
  - no assignments.
  - `FREE_AGENT`.
  - `UNASSIGNED`.
- No full free-agency execution yet.
- No draft execution or generated draft class persistence yet.
- No trade execution yet.
- No retirement execution yet.
- No generated or external filler player source yet.
- No import writes yet.
- No roster analyzer mutation workflow yet.
- No claim of true cross-store atomicity.

## 6. Next-Wave Options

### Option A: True-Value Salary Model

Value:

- Moves D2 closer to `OFFSEASON_SYSTEM_SPEC.md`, which calls for salary recalculation at Phases 3, 8, and 10.
- Creates a more durable salary baseline for free agency, trades, and Phase 11 claim priority.
- Could introduce a salary recalculation ledger or phase artifact for auditability.

Risk:

- Medium-high. Salary changes affect team strength, future signing priority, trade valuation, and user trust.

Dependencies:

- Formula decision: current app-native grade/salary calculation versus full true-value / 50% salary-delta model.
- Durable salary ledger or phase artifact design.
- Compatibility with the existing D2 confirmation workflow.

Recommended reasoning level:

- High.

### Option B: Mutation-Capable Retirement Design

Value:

- Converts D3 from preview to an executable retirement phase.
- Creates actual empty roster slots for later free-agency, draft, and Phase 11 workflows.
- Can establish a template for mutation-capable phase design before larger cross-team systems.

Risk:

- High. Retirement affects player status, transaction history, empty roster slots, jersey retirement decisions, and downstream phase needs.

Dependencies:

- Retirement result persistence.
- Transaction logging.
- Empty-slot handling.
- Jersey retirement storage decision.
- Repair/rollback strategy.

Recommended reasoning level:

- Extra High.

### Option C: Mutation-Capable Free Agency Design

Value:

- Implements one of the central interactive offseason ceremonies.
- Would make protected-player choices, dice outcomes, destination selection, exchanges, and roster movement durable.

Risk:

- Very high. Free agency moves players across teams and must coordinate roster/farm state, salary context, transactions, and rollback.

Dependencies:

- Durable protection inputs.
- Dice result persistence.
- Destination and exchange validation.
- Player/farm movement orchestration.
- Transaction logging.
- Repair/rollback strategy.

Recommended reasoning level:

- Extra High.

### Option D: Mutation-Capable Draft/Trade Design

Value:

- Draft design enables long-term player replenishment, farm continuity, and prospect identity.
- Trade design enables offseason roster shaping after salary recalculation.

Risk:

- Very high. Draft creates new players/farm records and can release/retire existing players. Trades move players across teams and can affect farm, salary, chemistry, morale, and transactions.

Dependencies:

- Draft class/prospect identity model.
- Trade proposal and acceptance model.
- Player/farm movement orchestration.
- Transaction logging.
- Salary recalculation strategy.
- Rollback/repair strategy.

Recommended reasoning level:

- Extra High.

### Option E: Generated/External Filler Source Design

Value:

- Addresses Phase 11 sign/fill dead ends when no eligible franchise-owned free-agent/unassigned/no-assignment players exist.
- Could support future draft, free-agency, and emergency roster-completion flows.

Risk:

- High. New player sources can blur franchise ownership, identity, export/import scope, salary defaults, farm eligibility, and transaction history if rushed.

Dependencies:

- Source decision: generated prospects, inactive database, franchise-owned released pool, or scoped free-agent pool.
- Player identity and salary defaults.
- Farm eligibility and rating reveal defaults.
- Export/import ownership model.
- Transaction logging.

Recommended reasoning level:

- Extra High.

### Option F: Import-Write Lifecycle Follow-Up

Value:

- Completes the save-slot lifecycle beyond validation/export/delete.
- Enables exact restore and eventually remapped clone import.
- Useful before save/restore becomes user-facing or before long-running franchise saves become central.

Risk:

- High. Import writes require strict identity handling, duplicate protection, partial-import cleanup, and remapping strategy.

Dependencies:

- Existing manifest-driven export/delete.
- Import mode decision: exact restore first versus remapped clone.
- Transition journal handling during import.
- Career/milestone scoping decision.

Recommended reasoning level:

- Extra High.

### Option G: Bundle/Test-Noise Cleanup

Value:

- Reduces known non-blocking noise, especially React `act(...)` warnings and large-bundle warnings.
- Improves future signal quality when full-suite checkpoints run.

Risk:

- Low to medium. Test-noise cleanup is usually contained, but chunk splitting can affect app loading and should be verified carefully.

Dependencies:

- Identify which warnings matter versus expected negative-path output.
- Avoid broad refactors while cleaning test signal.
- For bundle work, inspect current build output and choose conservative split points.

Recommended reasoning level:

- Medium.

## 7. Final Recommendation

Recommended next wave: **mutation-capable retirement design**.

Why this should come next:

- The stabilization checkpoint is clean: full suite passed, build passed, and no fixes were required.
- D2 already proved a mutation-capable adapter can be constrained with confirmation and rollback reporting.
- Phase 11 now has narrow durable correction primitives, so the system can safely represent roster holes.
- Retirement is the most bounded of the remaining mutation-heavy phases: it is mostly per-player status changes plus transaction/history output, not a cross-team exchange system like free agency or trades and not a player-creation system like draft.
- Designing retirement mutation first should produce reusable patterns for later free-agency/draft/trade execution.

Keep deferred during the next wave:

- free-agency execution.
- draft execution.
- trade execution.
- generated/external filler source.
- import writes.
- roster analyzer mutations.
- broad Phase 11 UI expansion.
- true-value salary model unless explicitly selected instead.

Exact next prompt:

```text
Recommended reasoning: Extra High

Please design the mutation-capable franchise retirement workflow.

Scope:
- Design only unless explicitly approved to implement.
- Do not implement code yet.
- Do not implement free agency, draft, trade, or generated filler sources.
- Do not add roster analyzer mutations.
- Do not implement import writes.
- Do not replace the D2 salary method.
- Do not broaden Phase 11 correction UI.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_OFFSEASON_STABILIZATION_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_PHASE_11_CORRECTION_UI_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_PHASE_11_ROSTER_FOUNDATION_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D3_RETIREMENT_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/OFFSEASON_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementAdapter.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchisePhase11RosterActions.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/transactionStorage.ts

Design:
1. Durable retirement result model.
2. Adapter apply/commit contract.
3. Required franchise context and phase validation.
4. Player eligibility and status transition rules.
5. Transaction identity and payload.
6. Empty-slot / roster-hole representation for later phases.
7. Jersey-retirement boundary.
8. Rollback and repair strategy.
9. UI confirmation boundary.
10. Tests required before implementation.

Output:
- Findings/decisions first.
- Proposed smallest safe implementation wave.
- Explicit deferred systems.
- Exact implementation prompt if the design is approved.
```
