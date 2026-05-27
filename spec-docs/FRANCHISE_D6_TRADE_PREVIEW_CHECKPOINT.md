# Franchise D6 Trade Preview Checkpoint

Date: 2026-05-25

## 1. Executive Summary

D6 adds a franchise-owned, dry-run-only offseason trade preview foundation.

Current method/version:

```text
franchise-trades-v1-fit-preview-dry-run
```

D6 is read-only. It is not a trade execution workflow.

Completed surfaces:

- `src/utils/franchiseTradeAdapter.ts` defines the D6 adapter and result shape.
- `src/src_figma/app/components/TradeFlow.tsx` renders a franchise-only trade-fit preview surface when `franchiseId` is present.
- `src/utils/tests/franchiseTradeAdapter.test.ts` covers adapter validation and no-write behavior.
- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx` covers the franchise UI boundary.

The D6 UI previews team needs, surpluses, and non-executable fit suggestions. It does not offer apply, confirm, execute, save, transaction, or player movement controls.

## 2. Completed Scope

D6 adapter foundation:

- Uses D0/D1 validation through `validateFranchiseOffseasonScope(...)`.
- Requires canonical franchise context:
  - `franchiseId`
  - `seasonId`
  - `statsScopeId`
  - `seasonNumber`
  - `offseasonStateId`
  - phase `TRADES`
- Validates that `statsScopeId === seasonId`.
- Includes franchise farm records.
- Includes transition journal warnings.
- Reads franchise-owned teams, players, farm records, offseason state, and transition journals through the shared validation scope.
- Rejects apply/commit attempts with `ADAPTER_NOT_IMPLEMENTED`.

D6 TradeFlow franchise preview:

- Calls `runFranchiseTradeDryRun(...)`.
- Passes `statsScopeId: seasonId`.
- Renders:
  - method/version.
  - team need/surplus reports.
  - non-executable trade-fit previews.
  - evidence.
  - limitations.
  - warnings/issues.
- Shows validation failures and issue codes/messages instead of falling back to prototype behavior.
- Keeps non-franchise/prototype TradeFlow behavior unchanged.

Requested trade input validation:

- Source team exists.
- Target team exists.
- Source and target teams are distinct.
- Outgoing player exists.
- Incoming player exists when supplied.
- Player belongs to expected team.
- Player roster status is eligible for preview.
- MLB/FARM status is surfaced in requested preview evidence.

Team need/surplus output:

- Uses franchise-owned MLB/FARM player assignments.
- Uses franchise-owned farm records for farm context.
- Produces simple role buckets:
  - catcher depth.
  - middle infield depth.
  - corner infield depth.
  - outfield depth.
  - starting pitching depth.
  - relief pitching depth.
- Produces non-binding fit previews where one team has surplus in a role another team lacks.

## 3. Mutation Boundaries

D6 does not mutate data.

Explicitly blocked/not implemented:

- No player movement.
- No franchise player writes.
- No franchise team writes.
- No franchise farm record writes.
- No transaction writes.
- No League Builder/global/template writes.
- No prototype trade storage writes.
- No offseason state writes.
- No trade acceptance.
- No trade AI execution.
- No chemistry or morale effects.
- No injury logic.
- No salary-cap enforcement.
- No roster-balancing execution.

The UI copy repeats this boundary in franchise context:

- no trades are executed.
- no players are moved.
- no teams, farm records, transactions, League Builder data, prototype trade records, or offseason state are written.
- trade AI acceptance, chemistry, morale, injuries, salary-cap enforcement, and roster movement remain deferred.

## 4. UI Boundary

Franchise `TradeFlow` now branches before prototype hooks initialize.

In franchise context:

- `useOffseasonData` is not initialized.
- `useOffseasonState` is not initialized.
- Prototype trade storage/write paths are not reached.
- The branch renders the D6 preview surface directly.

In non-franchise context:

- Existing `ActiveTradeFlow` behavior remains intentionally preserved.
- Existing prototype trade builder screens remain non-franchise only.

Franchise context does not render:

- apply controls.
- confirm controls.
- execute controls.
- save controls.
- complete trade controls.
- player movement controls.
- transaction-writing controls.

If the adapter returns validation errors, the franchise preview shows those structured issues rather than dropping into the prototype trade UI.

## 5. Validation And Issue Model

Required identity:

- `franchiseId`
- `seasonId`
- `statsScopeId`
- `seasonNumber`
- `offseasonStateId`
- `phase`

Canonical phase:

- D6 requires `TRADES`.
- Wrong phase returns `OFFSEASON_PHASE_MISMATCH`.

Stats scope:

- Missing stats scope returns `MISSING_STATS_SCOPE_ID`.
- Mismatched stats scope returns `STATS_SCOPE_MISMATCH`.
- Expected stats scope is the canonical franchise season id: `seasonId`.
- Issue details include:
  - `expectedStatsScopeId`
  - `actualStatsScopeId`

Requested trade input issue codes:

- `TRADE_TEAM_NOT_FOUND`
- `TRADE_TEAM_MATCH_INVALID`
- `TRADE_PLAYER_NOT_FOUND`
- `TRADE_PLAYER_TEAM_MISMATCH`
- `TRADE_PLAYER_STATUS_INVALID`

Apply/commit issue:

- `ADAPTER_NOT_IMPLEMENTED`

Warnings versus blocking errors:

- `TRANSITION_ATTENTION_REQUIRED` is a warning and does not block dry-run preview.
- Missing/wrong identity, wrong phase, invalid stats scope, invalid requested teams, invalid requested players, team mismatch, and ineligible player status are blocking errors.
- Blocking errors return a failed dry-run result but still include structured issue details and non-mutating preview data where available.

Eligible roster statuses for requested trade preview:

- `MLB`
- `FARM`

Ineligible statuses:

- `FREE_AGENT`
- `RELEASED`
- `RETIRED`
- `INACTIVE`
- `UNASSIGNED`
- `UNKNOWN`

## 6. Tests And Confidence

Adapter tests:

- `src/utils/tests/franchiseTradeAdapter.test.ts`
  - Generates dry-run trade-fit previews from franchise-owned scoped teams and players.
  - Verifies no franchise player/team writes.
  - Verifies no franchise farm writes/deletes.
  - Verifies no League Builder writes.
  - Verifies no transaction writes.
  - Verifies no prototype/offseason trade writes.
  - Fails missing `statsScopeId`.
  - Fails mismatched `statsScopeId`.
  - Fails wrong phase.
  - Surfaces transition journal warnings without blocking.
  - Validates missing teams.
  - Validates same-team trade inputs.
  - Validates missing players.
  - Validates player/team mismatch.
  - Validates ineligible player status.
  - Allows valid requested preview inputs while keeping them non-executable.
  - Rejects apply.

Component guard tests:

- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
  - Franchise `TradeFlow` calls D6 with canonical context and `{ dryRun: true }`.
  - Shows method/version.
  - Shows team need/surplus reports.
  - Shows non-executable fit previews.
  - Shows transition warnings.
  - Shows no-write and deferred-system limitation copy.
  - Does not initialize prototype/global trade hooks.
  - Does not call prototype trade writers or League Builder mutation helpers.
  - Does not render execute/apply/save/confirm trade controls.

Latest focused verification at D6 preview closeout:

- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
- `npm test -- src/utils/tests/franchiseTradeAdapter.test.ts src/utils/tests/franchiseOffseasonAdapters.test.ts`
- `npm run build`

All passed at closeout. The build emitted only the existing Vite chunk-size warnings.

Known minor cleanup:

- Missing franchise `seasonNumber` currently defaults to `1` in `TradeFlow`, though the real caller is expected to pass the current franchise season.

## 7. Deferred Work

D6 intentionally defers:

- Trade execution.
- Transaction logging.
- Franchise player movement.
- Franchise farm movement.
- Trade proposal persistence.
- Trade acceptance.
- Trade AI.
- Chemistry effects.
- Morale effects.
- Injury effects.
- Narrative/reporter effects.
- Salary matching or salary-cap enforcement.
- Roster-balancing execution.
- Full spec-complete trade ceremony/workflow from `OFFSEASON_SYSTEM_SPEC.md`.

## 8. Recommended Next Wave Analysis

### Option A: D7 Checkpoint/Cleanup Across D2-D6 Preview Surfaces

Value:

- Consolidates repeated preview UI patterns: method header, warnings/issues, limitations, result cards, no-write copy.
- Reviews D2-D6 for consistent context fields, phase naming, dry-run/apply semantics, and no-prototype-hook boundaries.
- Can close small inconsistencies such as defaulted `seasonNumber` behavior in TradeFlow.
- Lowers maintenance cost before mutation-heavy work starts.

Risk:

- Low-medium. Mostly structure/tests/docs, but it touches multiple UI components.

Dependencies:

- Completed D2-D6 preview surfaces.
- Existing focused component guard tests.

Recommended reasoning level:

- Medium.

### Option B: Phase 11 Cut/Sign Foundation

Value:

- Moves franchise offseason closer to a complete end-of-offseason handoff.
- Builds on existing franchise roster movement writers and Phase 11 roster lock validation.
- Addresses the critical 22 MLB / 10 farm / 32 total roster lock boundary.

Risk:

- High. It is mutation-heavy and affects player status, farm records, released pools, claim priority, transactions, salary proxy, transition/finalization state, and rollback.

Dependencies:

- Durable roster/farm movement writers.
- Phase 11 roster lock validator.
- Salary baseline clarity.
- Transition journal recovery.
- Clear released-pool storage ownership.

Recommended reasoning level:

- High or Extra High.

### Option C: True-Value Salary Model

Value:

- Moves D2 beyond `franchise-ratings-salary-v1-grade-salary-only`.
- Supports OFFSEASON phases 3, 8, and 10 more accurately.
- Helps Phase 11 claim priority if total MLB salary is used as expected roster strength proxy.

Risk:

- Medium-high. Formula ownership and historical compatibility must be clear before writes change salary behavior.

Dependencies:

- Final salary/true-value formula.
- Salary ledger/phase artifact design.
- Decision on how to migrate from grade/salary-only recalculation.

Recommended reasoning level:

- High.

### Option D: Mutation-Capable Retirement / Free-Agency / Draft / Trade Design

Value:

- Required for spec-complete franchise offseason execution.
- Converts previews into durable workflows.

Risk:

- Very high. These phases can create roster holes, move players between teams, update farm records, log transactions, change salary baselines, and require rollback.

Dependencies:

- Phase-specific mutation orchestration.
- Transaction event policy.
- Released/inactive/retired pool storage.
- Salary recalculation phase artifacts.
- Roster/farm rollback strategy.
- UI confirmation model.

Recommended reasoning level:

- Extra High.

### Option E: Save/Import Lifecycle Follow-Up

Value:

- Ensures newer adapter domains, transition journals, and preview/phase artifacts are represented in save/export/delete planning before they become mutation-heavy.
- Reduces risk of future franchise saves becoming partial or non-portable.

Risk:

- Medium. Storage-wide work can be broad even when non-gameplay.

Dependencies:

- Current save-slot manifest.
- Decision on whether dry-run preview artifacts remain ephemeral or become persisted phase artifacts later.
- Import collision strategy remains deferred unless explicitly implemented.

Recommended reasoning level:

- Medium or High depending on whether writes/imports are included.

## 9. Final Recommendation

Recommended next wave: **D7 offseason adapter consistency and cleanup pass across D2-D6**.

Why:

- D2-D6 now cover all major offseason phases with either a mutation-capable adapter or preview-only adapter.
- Before adding Phase 11 mutation or spec-complete execution, the safer move is to normalize shared UI/status/warning patterns and close small context/default inconsistencies.
- This keeps the next wave bounded and reduces risk before high-blast-radius roster movement work.

Exact next prompt:

```text
Recommended reasoning: Medium

Please implement D7: offseason adapter consistency and cleanup across D2-D6.

Scope:
- Do not implement new adapters.
- Do not implement trade execution.
- Do not implement retirement/free-agency/draft/trade mutations.
- Do not add roster analyzer mutations.
- Do not change non-franchise/prototype behavior except where tests prove a small boundary bug.
- Keep this focused on consistency, shared UI helpers where low-risk, context defaults, and tests.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D2_RATINGS_SALARY_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D3_RETIREMENT_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D4_FREE_AGENCY_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D5_DRAFT_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D6_TRADE_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseOffseasonAdapters.ts
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/RatingsAdjustmentFlow.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/RetirementFlow.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/FreeAgencyFlow.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/DraftFlow.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/TradeFlow.tsx

Goals:
1. Normalize D2-D6 preview/apply surfaces for method, warnings/issues, limitations, and no-write boundary copy.
2. Add small shared rendering helpers only if they reduce duplication without behavior churn.
3. Ensure franchise context always receives canonical `seasonId`, `seasonNumber`, `statsScopeId` where required, `offseasonStateId`, and phase.
4. Fix TradeFlow's fallback `seasonNumber` behavior if a safer explicit boundary is practical.
5. Preserve D2 apply behavior and D3-D6 preview-only behavior.
6. Preserve non-franchise/prototype behavior.

Tests:
- Existing D2-D6 adapter tests remain green.
- Existing franchise offseason guard component tests remain green.
- Add or adjust tests for any normalized context/default behavior.
- Run `npm run build`.

After implementation:
- Summarize changed files, behavior, tests, and remaining risks.
```
