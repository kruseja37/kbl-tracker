# Franchise Offseason Adapters D2-D5 Checkpoint

Date: 2026-05-25

## 1. Executive Summary

D2-D5 moved the franchise offseason from guarded prototype screens toward explicit franchise-owned adapter boundaries.

Current adapter coverage:

- D2 ratings/salary: mutation-capable with dry-run, explicit confirmation, apply, and compensating rollback.
- D3 retirement: dry-run preview only.
- D4 free agency: dry-run preview only.
- D5 draft: dry-run readiness preview only.

Current UI coverage:

- `src/src_figma/app/components/RatingsAdjustmentFlow.tsx` exposes a franchise preview, confirmation step, and apply result for the D2 adapter.
- `src/src_figma/app/components/RetirementFlow.tsx` exposes a franchise preview-only retirement surface.
- `src/src_figma/app/components/FreeAgencyFlow.tsx` exposes a franchise preview-only free-agency surface.
- `src/src_figma/app/components/DraftFlow.tsx` exposes a franchise preview-only draft readiness surface.

Current shared foundation:

- D0/D1 context and validation contracts live in `src/utils/franchiseOffseasonAdapters.ts`.
- Franchise-owned offseason scope reads and validation live in `src/utils/franchiseOffseasonDataAccess.ts`.
- Transition journal warnings are surfaced through the shared validation boundary.

What remains deferred:

- Full true-value / 50% salary-delta model from `OFFSEASON_SYSTEM_SPEC.md`.
- Final retirement reverse-age/team-roll ceremony and player retirement writes.
- Free-agency dice execution, destination resolution, player exchange, movement, and transactions.
- Draft class generation, draft pick execution, prospect creation, replacement/release rules, and draft transactions.
- Offseason trades.
- Phase 11 cut/sign execution and final roster lock mutation workflow.
- Salary ledger / durable recalculation artifact.
- Cleanup of legacy prototype hooks that still initialize before franchise preview branches.

## 2. Adapter Matrix

| Adapter | Method/version | Dry-run | Apply/commit | Writes | UI surface | Tests | Known limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ratings/salary | `franchise-ratings-salary-v1-grade-salary-only` | Yes | Yes, explicit confirmation | Franchise-owned player records only through the adapter | Preview, confirmation, apply result in `RatingsAdjustmentFlow` | `src/utils/tests/franchiseRatingsSalaryAdapter.test.ts`; `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx` | Not full true-value / 50% salary-delta model; no salary ledger; no durable phase artifact beyond player writes |
| Retirement | `franchise-retirement-v1-age-risk-dry-run` | Yes | No; rejects apply as `ADAPTER_NOT_IMPLEMENTED` | None | Preview-only in `RetirementFlow` | `src/utils/tests/franchiseRetirementAdapter.test.ts`; offseason guard component tests | Age-risk heuristic only; no final reverse-age/team-roll model; no player retirement, transaction, empty-slot, or jersey-retirement workflow |
| Free agency | `franchise-free-agency-v1-dice-board-dry-run` | Yes | No; rejects apply as `ADAPTER_NOT_IMPLEMENTED` | None | Preview-only in `FreeAgencyFlow` | `src/utils/tests/franchiseFreeAgencyAdapter.test.ts`; offseason guard component tests | Top-11 dice-board exposure preview only; no dice execution, destination, exchange, movement, or transaction workflow |
| Draft | `franchise-draft-v1-roster-readiness-dry-run` | Yes | No; rejects apply as `ADAPTER_NOT_IMPLEMENTED` | None | Preview-only in `DraftFlow` | `src/utils/tests/franchiseDraftAdapter.test.ts`; offseason guard component tests | Readiness/needs preview only; no draft class generation, picks, prospect creation, replacement/release, draft-state persistence, or transactions |

## 3. Shared Safety Model

D2-D5 share these safety rules:

- Franchise context is explicit: `franchiseId`, `seasonId`, `seasonNumber`, `offseasonStateId`, and `phase`.
- Adapters validate through D0/D1 scope helpers before returning data or applying writes.
- Adapter reads are franchise-owned: franchise players, teams, farm records, season/offseason identity, and transition journals where requested.
- Franchise previews do not use League Builder/global templates as authoritative franchise data.
- Franchise preview-only adapters reject apply/commit attempts with `ADAPTER_NOT_IMPLEMENTED`.
- Transition journal warnings such as `TRANSITION_ATTENTION_REQUIRED` are visible and non-blocking under the current validation contract.
- Prototype League Builder/global mutation paths are blocked in franchise context.
- D2 is the only mutation-capable adapter. It re-validates on apply, recomputes from current franchise-owned players, writes only through the adapter, and reports compensating rollback status.
- D2 rollback is compensating rollback, not true cross-store atomicity.

Explicitly forbidden in D2-D5 franchise context:

- League Builder/global writes.
- Analyzer-driven writes.
- Synthetic simulation.
- Draft, free-agency, retirement, trade, or Phase 11 mutations unless a specific adapter explicitly owns them.

## 4. Known Cleanup Debt

Legacy hook initialization before franchise preview branches:

- `RetirementFlow` still initializes prototype hooks before returning the franchise preview.
- `FreeAgencyFlow` still initializes `useOffseasonData`, `useLeagueBuilderData`, and `useOffseasonState` before returning the franchise preview.
- `DraftFlow` still initializes `useOffseasonData`, `useOffseasonState`, and active-franchise metadata reads before returning the franchise preview.

This is currently guarded by tests proving mutation functions are not called. It is still architectural debt because franchise preview screens can touch global/prototype read hooks before the franchise branch returns.

Deferred algorithm/workflow debt:

- Full true-value salary model and 50% salary-delta behavior remain deferred.
- Salary recalculation Phases 3, 8, and 10 are not yet represented as durable phase artifacts.
- Final retirement mutation workflow remains deferred.
- Free-agency ceremony/exchange remains deferred.
- Draft generation/execution remains deferred.
- Offseason trades remain deferred.
- Phase 11 cut/sign remains future work.
- A shared adapter preview UI helper would reduce repeated warning/limitation rendering across retirement, free agency, and draft.

## 5. Recommended Next Wave Analysis

### Option A: D6 Offseason Trades Dry-Run Preview

Value:

- Fills the remaining major guarded offseason phase after ratings/salary, retirement, free agency, and draft.
- Gives franchise mode a no-write trade market/proposal preview boundary before any trade execution is considered.
- Can reuse D4/D5 patterns: franchise-owned data, transition warnings, trust/evidence/limitations, and apply rejection.

Risk:

- Medium-high. Trades touch the most cross-team identity: two or more teams, multiple players, MLB/farm status, team needs, salary/trade value, transactions, and future morale/chemistry systems.
- The existing trade spec references deeper behavior than a simple preview.

Dependencies:

- D0/D1 validation boundary.
- Franchise-owned player/team/farm scope.
- Roster status and farm record validation.
- Ideally the preview-component cleanup wave below, so the trade preview does not inherit more global read leakage.

Recommended reasoning level:

- High.

### Option B: Phase 11 Cut/Sign Foundation

Value:

- Directly addresses the final roster lock handoff required before a new season.
- Builds on Wave C/D0 roster movement writers and the Phase 11 roster lock validator.
- Helps convert the current guarded Phase 11 state into a durable franchise-owned workflow.

Risk:

- High. This is mutation-heavy and touches player status, farm records, team roster state, released pools, claim priority, salary proxy, transactions, finalization, and rollback.

Dependencies:

- Durable call-up/send-down and roster movement rollback behavior.
- Phase 11 lock validator.
- Salary baseline clarity, especially if total MLB salary is used for claim priority.
- Transition journal and finalization rollback already exist, but Phase 11 mutation orchestration would need its own rollback model.

Recommended reasoning level:

- High or Extra High.

### Option C: Salary Ledger / True-Value Model

Value:

- Moves D2 closer to `OFFSEASON_SYSTEM_SPEC.md` instead of the current grade/salary-only method.
- Provides historical auditability for salary recalculations across Phases 3, 8, and 10.
- Helps Phase 11 claim priority if total MLB salary becomes the proxy for expected roster strength.

Risk:

- Medium-high. The true-value / 50% delta model needs precise formula ownership before it should write player records.
- If implemented prematurely, it may create salary drift or conflict with existing app-native salary calculations.

Dependencies:

- Formula/spec clarification.
- Durable salary recalculation ledger shape.
- Decision on whether D2 remains a conservative adapter or becomes one phase of a broader salary system.

Recommended reasoning level:

- High.

### Option D: Cleanup Split Of Preview Components Before Legacy Hooks

Value:

- Removes repeated architectural debt across D3-D5.
- Reduces accidental global/prototype reads in franchise context before adding more preview adapters.
- Makes future D6 trade preview safer and simpler.
- Lowers test complexity by letting franchise preview components mount without initializing prototype hooks.

Risk:

- Medium. It is mostly structural, but it touches large UI components with existing prototype behavior.

Dependencies:

- Existing adapter preview surfaces and tests.
- Careful preservation of non-franchise/prototype behavior.

Recommended reasoning level:

- Medium.

### Option E: Mutation Design For Retirement / Free Agency / Draft

Value:

- Eventually required for a complete franchise offseason.
- Converts previews into executable franchise-owned workflows.

Risk:

- Very high if started before Phase 11, salary, and rollback models are clear.
- Retirement, free agency, and draft execution can all create roster holes, player status transitions, transaction history, salary changes, and farm/team record updates.

Dependencies:

- Mutation orchestration per phase.
- Transaction logging rules per phase.
- Roster/farm rollback model.
- Salary recalculation phase artifacts.
- Released/inactive/retired pool ownership.
- Draft prospect identity and farm creation defaults.

Recommended reasoning level:

- Extra High.

## 6. Final Recommendation

Recommended next wave: **D5.5 offseason preview boundary cleanup before D6 trades**.

Why:

- D3, D4, and D5 all now have safe preview surfaces, but all three checkpoint docs identify the same cleanup debt: legacy prototype hooks initialize before franchise preview branches return.
- The next feature-shaped adapter is D6 trades, but trades are cross-team and higher risk. Cleaning the preview boundary first reduces the chance that D6 inherits global/prototype reads.
- This wave should be small, testable, and behavior-preserving: split or branch franchise previews before prototype hooks initialize, without changing adapter behavior or adding new features.

Recommended next prompt:

```text
Recommended reasoning: Medium

Please implement D5.5: offseason preview boundary cleanup before D6 trades.

Scope:
- Do not implement trades.
- Do not add more offseason adapters.
- Do not add roster analyzer mutations.
- Do not implement retirement/free-agency/draft mutations.
- Do not change non-franchise/prototype behavior.
- Keep this focused on preventing franchise preview surfaces from initializing legacy/global prototype hooks.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_OFFSEASON_ADAPTERS_D2_D5_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D3_RETIREMENT_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D4_FREE_AGENCY_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_D5_DRAFT_PREVIEW_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/RetirementFlow.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/FreeAgencyFlow.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/DraftFlow.tsx

Goals:
1. Split or branch franchise preview components before legacy/prototype hooks initialize.
2. Preserve current franchise preview UI and adapter calls for D3, D4, and D5.
3. Preserve non-franchise/prototype behavior intentionally.
4. Ensure franchise preview mounts do not call League Builder/global/prototype read or write hooks.
5. Keep D2 ratings/salary behavior unchanged unless the same cleanup is low-risk and clearly covered.

Tests:
- Franchise RetirementFlow preview does not initialize prototype/global retirement data hooks or mutation paths.
- Franchise FreeAgencyFlow preview does not initialize prototype/global League Builder/offseason data hooks or mutation paths.
- Franchise DraftFlow preview does not initialize prototype/global draft data hooks or mutation paths.
- Existing D3/D4/D5 preview tests remain green.
- Non-franchise/prototype flow smoke tests remain green where available.

After implementation:
- Run franchise offseason guard component tests.
- Run D3/D4/D5 adapter tests.
- Run relevant non-franchise flow tests if available.
- Run `npm run build`.
- Summarize changed files, behavior, tests, and remaining risks.
```

After D5.5, the recommended feature wave is **D6 franchise offseason trades adapter foundation, dry-run only**, using the D5 checkpoint prompt as the starting point.
