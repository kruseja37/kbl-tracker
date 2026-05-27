# Franchise Offseason Adapters D2-D7 Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add UI, implement Phase 11 cut/sign, implement new mutation workflows, add another adapter, or change roster analyzer behavior.

Primary references:

- `spec-docs/FRANCHISE_OFFSEASON_ADAPTERS_D2_D5_CHECKPOINT.md`
- `spec-docs/FRANCHISE_D2_RATINGS_SALARY_CHECKPOINT.md`
- `spec-docs/FRANCHISE_D3_RETIREMENT_PREVIEW_CHECKPOINT.md`
- `spec-docs/FRANCHISE_D4_FREE_AGENCY_PREVIEW_CHECKPOINT.md`
- `spec-docs/FRANCHISE_D5_DRAFT_PREVIEW_CHECKPOINT.md`
- `spec-docs/FRANCHISE_D6_TRADE_PREVIEW_CHECKPOINT.md`
- `spec-docs/FRANCHISE_IMPLEMENTATION_ROADMAP_POST_AUDIT.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`

## 1. Executive Summary

D2-D7 moved franchise offseason work from guarded prototype boundaries into explicit franchise-owned adapter contracts and preview surfaces.

Current state:

- D2 ratings/salary is mutation-capable with dry-run, explicit confirmation, apply, structured failures, and compensating rollback.
- D3 retirement is preview/read-only.
- D4 free agency is preview/read-only.
- D5 draft readiness is preview/read-only.
- D6 trades are preview/read-only.
- D7 cleanup closed the TradeFlow franchise `seasonNumber` fallback: missing or invalid franchise season number blocks the preview with `MISSING_SEASON_NUMBER` instead of silently using season 1.

The adapter layer now gives each major currently exposed offseason phase a Mode 2 franchise-owned boundary. D2 is the only adapter that can write, and it writes only franchise-owned player records through its own adapter after explicit confirmation. D3-D6 reject apply/commit attempts and present their outputs as advisory, non-executable previews.

What remains deferred:

- Full true-value / 50% salary-delta model.
- Durable salary ledger or salary recalculation phase artifact.
- Final retirement reverse-age/team-roll ceremony and retirement writes.
- Free-agency dice execution, destination selection, player exchange, movement, and transactions.
- Draft class generation, pick execution, prospect creation, replacement/release rules, draft state, and transactions.
- Trade execution, acceptance, AI proposals, salary/chemistry/morale effects, roster movement, and transactions.
- Phase 11 cut/sign execution and final roster lock mutation workflow.
- Import writes, exact restore, remapped clone import.
- Career/milestone canonical franchise scoping.
- Broad copy normalization and shared preview UI component extraction.

## 2. Adapter Matrix

| Adapter | Method/version | Phase | Dry-run support | Apply/commit support | UI status | Writes/no-writes | Validation highlights | Tests | Known limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ratings/salary | `franchise-ratings-salary-v1-grade-salary-only` | `RATINGS_ADJUSTMENTS` | Yes | Yes, explicit confirmation | Preview, confirmation, and result in `RatingsAdjustmentFlow` | Writes only changed franchise-owned player records through `saveFranchisePlayer`; no raw rating changes | D0/D1 scope validation, transition journal warnings, requested player validation, wrong phase failure | `src/utils/tests/franchiseRatingsSalaryAdapter.test.ts`; `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx` | Not full true-value / 50% salary-delta model; no salary ledger; no durable salary phase artifact beyond player writes and UI result |
| Retirement | `franchise-retirement-v1-age-risk-dry-run` | `RETIREMENTS` | Yes | No; rejects apply as `ADAPTER_NOT_IMPLEMENTED` | Preview-only in `RetirementFlow` | No writes | D0/D1 scope validation, transition journal warnings, wrong phase/context failure, missing/deferred data limitations | `src/utils/tests/franchiseRetirementAdapter.test.ts`; offseason guard component tests | Age-risk heuristic only; no final reverse-age/team-roll model; no player retirement, transactions, empty-slot handling, or jersey-retirement persistence |
| Free agency | `franchise-free-agency-v1-dice-board-dry-run` | `FREE_AGENCY` | Yes | No; rejects apply as `ADAPTER_NOT_IMPLEMENTED` | Preview-only in `FreeAgencyFlow` | No writes | D0/D1 scope validation, transition journal warnings, protected-player validation, wrong phase/context failure, missing/deferred data limitations | `src/utils/tests/franchiseFreeAgencyAdapter.test.ts`; offseason guard component tests | Dice-board exposure preview only; no dice execution, destination, exchange, movement, transaction workflow, or durable protected-player input |
| Draft | `franchise-draft-v1-roster-readiness-dry-run` | `DRAFT` | Yes | No; rejects apply as `ADAPTER_NOT_IMPLEMENTED` | Preview-only in `DraftFlow` | No writes | D0/D1 scope validation, transition journal warnings, franchise-owned team filtering, Phase 11 readiness framing, missing farm/position limitations | `src/utils/tests/franchiseDraftAdapter.test.ts`; offseason guard component tests | Readiness/needs preview only; no draft class generation, picks, prospect creation, replacement/release, draft-state persistence, or transactions |
| Trades | `franchise-trades-v1-fit-preview-dry-run` | `TRADES` | Yes | No; rejects apply as `ADAPTER_NOT_IMPLEMENTED` | Preview-only in `TradeFlow` | No writes | D0/D1 scope validation, transition journal warnings, `statsScopeId === seasonId`, requested team/player/status validation, wrong phase/context failure | `src/utils/tests/franchiseTradeAdapter.test.ts`; `src/utils/tests/franchiseOffseasonAdapters.test.ts`; offseason guard component tests | Fit preview only; no trade execution, acceptance, AI, salary/cap enforcement, chemistry/morale/injury effects, roster movement, proposal persistence, or transactions |

## 3. Shared Safety Model

D2-D7 use the shared D0/D1 offseason adapter foundation:

- Context is explicit: `franchiseId`, `seasonId`, `seasonNumber`, `offseasonStateId`, `phase`, and adapter-specific actor/team/player identity where relevant.
- Scope validation goes through `validateFranchiseOffseasonScope(...)` before trusted reads or writes.
- Adapters read franchise-owned players, teams, farm records, offseason state, season summaries, transition journals, and Phase 11 roster lock reports only when requested by the adapter contract.
- Transition journal warnings such as `TRANSITION_ATTENTION_REQUIRED` are surfaced as non-blocking warnings under current validation rules.
- Franchise-owned reads are preferred; League Builder/global/template data is not an authoritative franchise source.
- D6 explicitly enforces `statsScopeId === seasonId` for trade previews.
- Preview-only adapters reject apply/commit attempts with `ADAPTER_NOT_IMPLEMENTED`.
- D2 re-validates and recomputes before apply, then writes only franchise-owned player records.
- D2 rollback is compensating rollback, not true IndexedDB transaction atomicity.
- Franchise preview branches mount before prototype hooks where cleaned up.
- No adapter writes League Builder/global/template records in franchise context.
- No adapter writes prototype trade/free-agency/draft/retirement storage in franchise context.
- No analyzer-driven roster mutations are part of D2-D7.

Explicitly forbidden in D2-D7 franchise context unless a later adapter explicitly owns and tests the behavior:

- League Builder/global writes.
- Prototype flow writes.
- Roster analyzer mutations.
- Synthetic simulation.
- Draft/free-agency/retirement/trade execution from preview-only adapters.
- Phase 11 cut/sign mutation.
- Automatic broad offseason progression outside the validated adapter or transition journal boundary.

## 4. D7 Cleanup Summary

D7 was a small TradeFlow boundary cleanup after D6.

Completed cleanup:

- `TradeFlow` no longer defaults missing franchise `seasonNumber` to `1`.
- Missing, non-numeric, or invalid franchise season number blocks the franchise trade preview.
- The blocked preview renders `MISSING_SEASON_NUMBER`.
- The blocked preview explains that silently defaulting to season 1 can scope trade preview data to the wrong season.
- The D6 valid path still passes canonical context:
  - `franchiseId`
  - `seasonId`
  - `statsScopeId: seasonId`
  - explicit `seasonNumber`
  - `offseasonStateId`
  - phase `TRADES`
  - `{ dryRun: true }`
- Non-franchise/prototype `ActiveTradeFlow` still keeps its legacy `seasonNumber = 1` default, preserving existing prototype behavior.

Intentional scope control:

- D7 avoided broad UI rewrites.
- D7 did not add trade execution.
- D7 did not add apply/confirm/save controls.
- D7 did not change D2-D5 adapter semantics.

## 5. Remaining Cleanup And Debt

Known remaining cleanup:

- D2 may still initialize older hooks if applicable; this should be reviewed before broad offseason UI refactors or before adding more mutation surfaces.
- Copy normalization is intentionally partial. Existing preview surfaces repeat similar warning, issue, limitation, and method-boundary copy.
- A shared read-only adapter preview shell could reduce duplicated UI logic, but should not be mixed into mutation workflow work.

Deferred algorithm/workflow debt:

- Full true-value salary model remains deferred.
- Durable salary recalculation ledger remains deferred.
- Final retirement model remains deferred.
- Free-agency ceremony and exchange execution remain deferred.
- Draft generation and execution remain deferred.
- Trade execution and acceptance remain deferred.
- Phase 11 cut/sign remains future work.

Persistence/lifecycle debt:

- Import writes remain deferred.
- Exact restore and remapped clone import remain deferred.
- Career and milestone canonical franchise scoping remain deferred.
- Transition journal repair UI remains deferred.

## 6. Recommended Next Wave Analysis

### Option A: Phase 11 Cut/Sign Foundation

Value:

- Directly targets the final offseason handoff gate.
- Converts the current Phase 11 roster lock validation into the first executable roster-completion workflow.
- Unlocks reliable new-season readiness after preview-only retirement/free-agency/draft/trade phases.
- Builds on existing roster movement writers, farm storage, roster lock validation, and transition journal infrastructure.

Risk:

- High. It touches roster status, farm records, released pools, team roster counts, claim priority, transaction identity, rollback/repair, and finalization blocking.

Dependencies:

- Existing durable call-up/send-down writers.
- Phase 11 roster lock validator.
- D2 salary outputs or a clarified salary proxy for claim ordering.
- Transaction identity.
- A compensating rollback model for cross-store player/farm/transaction writes.

Recommended reasoning level:

- Extra High.

### Option B: True-Value Salary Ledger/Model

Value:

- Moves D2 closer to `OFFSEASON_SYSTEM_SPEC.md`, which expects salary recalculation at Phases 3, 8, and 10.
- Creates an auditable salary baseline for Phase 11 claim priority.
- Helps future free-agency, trade, and draft execution reason about salary without relying only on current player snapshots.

Risk:

- Medium-high. The economics must be nailed down before mutation because salary drift can affect multiple downstream phases.

Dependencies:

- Formula decision: app-native grade/salary only versus full true-value / 50% delta.
- Durable salary recalculation artifact shape.
- Decision on whether D2 remains conservative or becomes a broader salary phase engine.

Recommended reasoning level:

- High.

### Option C: Mutation-Capable Retirement Design

Value:

- Turns a bounded per-player preview into an executable phase.
- Can create explicit retired player status, transactions, and empty roster slots for later phases.

Risk:

- High. Retirement mutations affect roster holes, jersey retirement, free-agency/draft needs, transactions, and history.

Dependencies:

- Retirement result persistence.
- Player status mutation contract.
- Empty roster slot handling.
- Transaction logging.
- Jersey retirement storage decision.
- Rollback/repair behavior.

Recommended reasoning level:

- Extra High.

### Option D: Mutation-Capable Free-Agency Design

Value:

- Implements one of the core interactive offseason ceremonies.
- Would make protected players, dice results, destination resolution, exchange selection, and roster movement durable.

Risk:

- Very high. Free agency moves players between teams, may create exchange/replacement constraints, and must integrate with roster/farm/salary/transaction systems.

Dependencies:

- Durable protected-player input model.
- Dice result persistence.
- Destination selection rules.
- Exchange validation.
- Player movement writers and rollback.
- Transaction logging.

Recommended reasoning level:

- Extra High.

### Option E: Mutation-Capable Draft Design

Value:

- Adds prospect generation, picks, replacement/release rules, and farm placement.
- Important for long-term franchise renewal and farm system depth.

Risk:

- Very high. Draft execution creates new players, farm records, draft state, releases, retirements, and salary recalculation follow-ups.

Dependencies:

- Safe pure draft class generator.
- Prospect identity/defaults.
- Farm assignment creation.
- Replacement/release rules.
- Draft state persistence.
- Transaction logging.
- Post-draft salary recalculation.

Recommended reasoning level:

- Extra High.

### Option F: Mutation-Capable Trade Design

Value:

- Makes the D6 trade preview actionable.
- Connects team needs/surpluses to roster movement before final salary recalculation and roster lock.

Risk:

- Very high. Trades are cross-team and can affect players, farm records, transactions, salary, chemistry, morale, and narrative.

Dependencies:

- Trade proposal persistence.
- Acceptance/AI rules.
- Cross-team roster movement and rollback.
- Transaction logging.
- Salary/chemistry/morale effect decisions.
- Farm eligibility and roster lock constraints.

Recommended reasoning level:

- Extra High.

### Option G: Import-Write Lifecycle Follow-Up

Value:

- Completes the save-slot lifecycle beyond validation/export/delete.
- Enables exact restore and eventual remapped clone import.
- Important before very large franchise seasons or user-facing backup/restore workflows become central.

Risk:

- High. Import writes need strict identity handling, duplicate avoidance, remapping strategy, and rollback/cleanup for partially imported scoped-global records.

Dependencies:

- Manifest-driven export/delete already implemented.
- Import mode decision: exact restore first versus remapped clone.
- Transition journal handling during import.
- Career/milestone scoping still deferred unless canonical ownership is added.

Recommended reasoning level:

- Extra High.

## 7. Final Recommendation

Recommended next wave: **Phase 11 cut/sign foundation**.

Why this should come next:

- D2-D7 now cover the major visible offseason phases with either safe mutation (D2) or safe preview boundaries (D3-D6).
- The largest remaining blocker to a coherent offseason loop is not another preview. It is the final roster lock and cut/sign handoff into the next season.
- Phase 11 foundation can be implemented incrementally without activating full retirement/free-agency/draft/trade execution.
- It will strengthen the new-season boundary that every later mutation-capable adapter must ultimately satisfy.
- It gives the roster analyzer and preview adapters a concrete final target: exactly 22 MLB, 10 farm, 32 total, with structured deficits/surpluses and claim/signing constraints.

What should remain deferred during the next wave:

- Full true-value salary model.
- Retirement mutation.
- Free-agency mutation.
- Draft generation/execution.
- Trade execution.
- Import writes.
- Roster analyzer mutations.
- Broad UI redesign.
- Automatic transition journal repair.

Exact next implementation prompt:

```text
Recommended reasoning: Extra High

Please implement the next franchise offseason wave: Phase 11 cut/sign foundation.

Scope:
- Implement only the Phase 11 cut/sign foundation needed to move from roster-lock validation toward a durable finalization workflow.
- Do not implement full retirement, free-agency, draft, or trade execution.
- Do not implement roster analyzer mutations.
- Do not implement import writes.
- Do not replace the D2 salary method with the full true-value model.
- Do not redesign the full offseason UI.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_OFFSEASON_ADAPTERS_D2_D7_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/OFFSEASON_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FARM_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRosterLockValidator.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRosterMovement.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseFarmStorage.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonAdapters.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonDataAccess.ts
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/FinalizeAdvanceFlow.tsx

Goals:
1. Define a Phase 11 cut/sign adapter or service contract with explicit franchise context:
   - franchiseId
   - seasonId
   - statsScopeId where applicable
   - seasonNumber
   - offseasonStateId
   - phase `PHASE_11_FINALIZE`
2. Add a dry-run/report mode that:
   - uses franchise-owned players, teams, and farm records only.
   - reports each team's MLB/farm/total counts.
   - reports required cuts, required signings, overages, vacancies, and inconsistent player/farm state.
   - reports claim/signing priority inputs without executing signings if the salary/expected-WAR proxy is not final.
3. Add a minimal mutation-capable foundation only if it can be safely scoped:
   - structured cut candidate validation.
   - structured sign candidate validation from a franchise-owned released/available pool if such a pool already exists safely.
   - no silent League Builder/global/prototype writes.
   - no analyzer-driven choices.
4. Preserve existing FinalizeAdvanceFlow guard behavior:
   - finalization blocks when Phase 11 roster lock fails.
   - non-franchise/prototype behavior remains unchanged.
5. Add structured results and issue codes suitable for future UI:
   - missing/wrong franchise scope.
   - missing/wrong season/offseason state.
   - roster over/under limits.
   - invalid player status.
   - farm record mismatch.
   - rollback/compensation status for any writes.
6. If any writes are introduced, use compensating rollback and clearly report that it is not true cross-store atomicity.

Tests:
- Dry-run report uses franchise-owned players/farm records only.
- Wrong franchise/season/offseason context fails.
- Phase mismatch fails.
- Over MLB, under MLB, over farm, under farm, and total-count failures are reported.
- Invalid player/farm consistency is reported.
- No League Builder/global/template writes occur.
- Existing D2-D7 focused tests remain green.
- FinalizeAdvanceFlow still blocks invalid Phase 11 roster locks.

After implementation:
- Run focused Phase 11 tests.
- Run D2-D7 adapter and franchise offseason guard tests.
- Summarize behavior, files changed, tests, deferred work, and any rollback limitations.
```
