# Franchise R1 Retirement Execution Core Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add UI, add tests, change RetirementFlow, implement random/team-roll retirement ceremony, jersey retirement, narrative/news, milestones, replacement players, free agency, draft, or trade execution.

Primary references:

- `spec-docs/FRANCHISE_RETIREMENT_MUTATION_DESIGN.md`
- `spec-docs/FRANCHISE_D3_RETIREMENT_PREVIEW_CHECKPOINT.md`
- `spec-docs/FRANCHISE_OFFSEASON_STABILIZATION_CHECKPOINT.md`
- `src/utils/franchiseRetirementAdapter.ts`
- `src/utils/tests/franchiseRetirementAdapter.test.ts`
- `src/utils/franchiseOffseasonAdapters.ts`

## 1. Executive Summary

R1 retirement execution core is implemented.

Current state:

- UI is not wired yet.
- Existing D3 franchise retirement preview remains read-only.
- R1 apply is selected-player only.
- R1 apply is not a random/team-roll retirement ceremony.
- R1 does not implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade execution, or broader offseason execution.

R1 moves retirement from preview-only capability to a safe adapter/core execution primitive. The execution path remains unreachable from the current RetirementFlow UI and should only be exposed later through a separate explicit confirmation surface.

## 2. Completed Scope

Completed R1 behavior:

- Dry-run preservation.
- Selected-player apply mode.
- Canonical method/version split:
  - dry-run: `franchise-retirement-v1-age-risk-dry-run`
  - apply: `franchise-retirement-v1-selected-player-apply`
- Canonical context validation for apply, including `statsScopeId === seasonId`.
- Franchise-owned MLB/FARM retirement eligibility.
- Matching scoped farm-record requirement for FARM retirements.
- FARM record cleanup for valid FARM retirements.
- Canonical Mode 2 v1 `retirement` transaction logging.
- Compensating rollback for farm cleanup and transaction failures.
- Structured rollback failure details.

Dry-run remains the D3 read-only preview path. It continues to produce age-risk candidates, evidence, trust, and limitations without player writes, farm writes, transaction writes, or prototype/global mutation calls.

## 3. Eligibility And Rejection Model

Eligible in R1:

- Franchise-owned `MLB` players assigned to a franchise-owned team.
- Franchise-owned `FARM` players assigned to a franchise-owned team with a matching scoped farm record.

Rejected in R1:

- No selected players.
- Missing selected players.
- Wrong-scope players.
- `FREE_AGENT`.
- `UNASSIGNED`.
- `RELEASED`.
- `RETIRED`.
- `INACTIVE`.
- Damaged/unknown roster status.
- FARM players without a matching scoped farm record.
- Missing `statsScopeId`.
- `statsScopeId !== seasonId`.

The rejection model intentionally keeps R1 narrow. Free-agent, unassigned, damaged, and previously released/retired/inactive records need broader pool/history semantics before retirement mutation should touch them.

## 4. Mutation Behavior

Successful R1 apply:

- Updates only the franchise-owned player record.
- Marks the selected player assignment as `RETIRED`.
- Adds retirement metadata:
  - `retiredSeasonId`
  - `retiredSeasonNumber`
  - `retiredAt`
  - `retirementMethodVersion`
- Preserves raw ratings and player identity.
- Removes the matching farm record for valid FARM retirements.
- Logs a canonical Mode 2 v1 `retirement` transaction.

Transaction identity includes:

- `franchiseId`
- `seasonId`
- `statsScopeId`
- `seasonNumber`
- top-level phase `OFFSEASON`
- payload phase `RETIREMENTS`
- `offseasonStateId`
- `playerId`
- `teamId`
- `retiredFromTeamId`
- `previousRosterStatus`
- `methodVersion`

Retired players no longer count as active MLB/FARM roster players. FARM retirements remove the matching farm record so stale farm state cannot allow later roster lock checks to pass incorrectly.

R1 does not write League Builder/global/prototype player data, prototype retirement storage, jersey retirement records, narrative/news records, milestone records, generated replacement players, free-agency records, draft records, or trade records.

## 5. Safety And Rollback

Safety guarantees:

- The whole selected set is prevalidated before any mutation.
- Mixed valid/invalid selections fail before writes.
- Missing players, wrong-scope players, invalid statuses, missing FARM records, and stats-scope errors all fail before writes.
- Dry-run remains no-write.

Rollback behavior:

- Farm cleanup failure triggers compensating player rollback.
- Transaction failure triggers compensating player/farm rollback.
- Rollback failure returns structured `PLAYER_ROLLBACK_FAILED` details.
- Rollback status is reported in adapter data.

Important boundary:

- R1 does not claim true cross-store IndexedDB atomicity.
- Rollback is compensating best-effort restoration.
- Future UI copy should preserve this distinction before exposing apply controls.

## 6. Tests And Confidence

Focused R1 review results:

- `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts`
  - Result: 1 file passed, 26 tests passed.
- `npm test -- src/utils/tests/franchiseOffseasonAdapters.test.ts`
  - Result: 1 file passed, 13 tests passed.

Covered retirement adapter cases:

- Dry-run no-write behavior.
- Selected-player apply success.
- Valid MLB retirement.
- Valid FARM retirement and farm cleanup.
- No selected players failure.
- Missing player failure.
- Wrong-scope player failure.
- Invalid status rejection matrix.
- Missing `statsScopeId` failure.
- Wrong `statsScopeId` failure.
- FARM-without-record failure.
- Mixed valid/invalid selection prevalidation with no partial write.
- Canonical `retirement` transaction logging.
- Transaction failure rollback.
- Rollback failure details.
- Transition journal warnings remain non-blocking.
- No League Builder/global/prototype writes.

Confidence:

- R1 adapter/core is safe as an execution primitive.
- UI exposure should still be treated as a separate wave because the current RetirementFlow remains preview-only and has no explicit confirmation/apply workflow.

## 7. Deferred Work

Deferred from R1:

- RetirementFlow UI wiring.
- Explicit confirmation UI.
- Random/team-roll retirement ceremony.
- Jersey retirement.
- Narrative/news effects.
- Milestone effects.
- Replacement-player systems.
- Generated or external filler pools.
- Free-agency execution.
- Draft execution.
- Trade execution.
- Full offseason ceremony persistence.
- True cross-store atomicity.

Existing D3 preview boundaries remain important until R2 adds a confirmation UI.

## 8. Recommended Next Wave Analysis

### Option A: R2 RetirementFlow Explicit Confirmation UI

Value:

- Makes the new R1 execution core usable through a controlled franchise UI.
- Preserves preview-first flow.
- Can force explicit user confirmation before any retirement write.
- Establishes a UI pattern for mutation-capable offseason phases.

Risk:

- Medium-high. The UI must avoid accidental apply, stale preview commit, and any prototype/global retirement path.

Dependencies:

- R1 adapter/core.
- Existing D3 RetirementFlow preview surface.
- Clear copy around selected-player apply, no random ceremony, and compensating rollback.

Recommended reasoning level:

- High.

### Option B: Random/Team-Roll Ceremony Design

Value:

- Moves retirement closer to the OFFSEASON spec ceremony.
- Can define deterministic seeding, per-team roll order, no-retirement outcomes, and result persistence.

Risk:

- High. It introduces random execution, ceremony state, repeatability requirements, and possible interactions with UI/history.

Dependencies:

- R1 execution core.
- R2 confirmation or separate ceremony UI design.
- Retirement result persistence decision.

Recommended reasoning level:

- Extra High.

### Option C: Phase 11/Retirement Integration Polish

Value:

- Tightens downstream visibility after retirements create roster holes.
- Can ensure Phase 11 planner/lock and TeamHub active/farm views communicate retired-player effects clearly.

Risk:

- Medium. Mostly integration and copy, but it touches roster-count surfaces.

Dependencies:

- R1 execution core.
- Any R2 UI decision about when retirements can be applied.

Recommended reasoning level:

- Medium to High.

### Option D: True-Value Salary Model

Value:

- Moves D2 ratings/salary toward the full OFFSEASON salary model.
- Improves future free-agency and trade valuation foundations.

Risk:

- Medium-high. Salary changes influence many future systems.

Dependencies:

- Salary formula decision.
- Ledger/snapshot decision.
- Existing D2 confirmation workflow.

Recommended reasoning level:

- High.

### Option E: Mutation-Capable Free Agency/Draft/Trade Design

Value:

- Begins the larger offseason execution systems needed for a full franchise offseason.
- Free agency, draft, and trades are central roster-shaping workflows.

Risk:

- Very high. These systems move players across teams, affect farm records, salary context, transactions, roster lock, and repair/rollback needs.

Dependencies:

- Durable movement orchestration.
- More complete player-pool and replacement semantics.
- Transaction and rollback strategy.
- Phase-specific result persistence.

Recommended reasoning level:

- Extra High.

## 9. Final Recommendation

Recommended next wave: R2 RetirementFlow explicit confirmation UI.

Why this should come next:

- R1 is implemented but intentionally not reachable from UI.
- R2 can expose the smallest useful retirement mutation workflow without adding random/team-roll ceremony, jersey retirement, narrative, replacement players, free agency, draft, or trade execution.
- The work stays local to retirement and validates the adapter-confirmation pattern before tackling larger multi-team offseason execution systems.

Exact next prompt:

```text
Recommended reasoning: High

Please implement R2: explicit confirmation UI for franchise retirement apply.

Scope:
- Implement UI and tests for RetirementFlow franchise context only.
- Use the existing R1 retirement execution core.
- Do not implement random/team-roll retirement ceremony.
- Do not implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, or trade execution.
- Do not change non-franchise/prototype retirement behavior.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_R1_RETIREMENT_EXECUTION_CORE_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_MUTATION_DESIGN.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementAdapter.ts
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/RetirementFlow.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/utils/tests/franchiseRetirementAdapter.test.ts

Implement:
1. Keep franchise RetirementFlow preview-first.
2. Add selected-player controls only for eligible R1 candidates.
3. Require explicit confirmation before calling apply.
4. Confirmation must repeat:
   - method `franchise-retirement-v1-selected-player-apply`
   - selected player count/names
   - selected-player only, no random/team-roll ceremony
   - no jersey retirement, narrative/news, milestones, replacement players, free agency, draft, or trade execution
   - compensating rollback only, not true cross-store atomicity.
5. Apply through `runFranchiseRetirementDryRun(context, { apply: true, playerIds })`.
6. Show success count, retired player details, validation issues, rollback status, and rollback error details.
7. Do not auto-finalize or auto-advance after retirement.
8. Do not expose prototype/global retirement controls in franchise context.

Tests:
- Preview remains read-only until explicit selection/confirmation.
- Apply cannot run without selected players and confirmation.
- Successful apply renders retired count/details.
- Validation failures render issue codes/messages.
- Rollback failure details render.
- No prototype/global retirement writes are called.
- Non-franchise/prototype behavior remains preserved.
- R1 adapter tests remain green.

Run:
- npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx
- npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts src/utils/tests/franchiseOffseasonAdapters.test.ts

Output:
- Summary of UI behavior.
- Tests run.
- Remaining risks before random/team-roll ceremony or broader offseason execution.
```

Keep random/team-roll ceremony, jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade execution, generated filler pools, import writes, roster analyzer mutations, and true-value salary model deferred unless explicitly selected in a later wave.

