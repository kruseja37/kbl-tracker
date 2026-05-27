# Franchise Phase 11 Roster Foundation Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add UI, add tests, implement free agency/draft/trade/retirement execution, add roster analyzer mutations, or implement import writes.

Primary references:

- `spec-docs/FRANCHISE_OFFSEASON_ADAPTERS_D2_D7_CHECKPOINT.md`
- `spec-docs/FRANCHISE_IMPLEMENTATION_ROADMAP_POST_AUDIT.md`
- `spec-docs/FARM_SYSTEM_SPEC.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`
- `src/utils/franchisePhase11RosterActions.ts`
- `src/utils/franchisePhase11RosterPlanner.ts`
- `src/utils/franchiseRosterLockValidator.ts`
- `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`

## 1. Executive Summary

The Phase 11 roster foundation is implemented.

It provides durable, franchise-owned cut/release and sign/fill primitives plus a read-only planning helper. These pieces are intentionally smaller than a full Phase 11 UI workflow. They establish the safe mutation boundary and exact roster lock contract without activating free agency, draft, trade, retirement, roster analyzer, or import-write behavior.

Current state:

- `src/utils/franchisePhase11RosterActions.ts` contains durable release/cut and sign/fill primitives.
- `src/utils/franchisePhase11RosterPlanner.ts` contains read-only roster lock planning output.
- `src/utils/franchiseRosterLockValidator.ts` remains the source of truth for exact Phase 11 lock validity.
- `src/src_figma/app/components/FinalizeAdvanceFlow.tsx` blocks invalid franchise roster locks before transition and now surfaces structured lock issue details.
- No broad Phase 11 UI execution workflow exists yet.

The foundation is safe to build on, but mutation-heavy offseason systems remain deliberately deferred.

## 2. Completed Scope

Completed implementation areas:

- `franchisePhase11RosterActions.ts`
  - Durable release/cut primitive.
  - Durable sign/fill primitive.
  - Franchise-owned player and farm storage only.
  - Canonical Phase 11 transaction context.
  - Compensating rollback reporting.
- `franchisePhase11RosterPlanner.ts`
  - Read-only Phase 11 plan helper.
  - Reports current MLB, FARM, and total counts.
  - Reports required cuts/signings and damaged status repairs.
  - Carries lock issues, warnings, and limitations.
- `FinalizeAdvanceFlow.tsx`
  - Continues to call the durable roster lock validator before franchise transition.
  - Blocks transition on failed Phase 11 roster lock.
  - Displays structured issue codes/messages for the first visible lock failures.

Readiness contract:

- 22 MLB players.
- 10 FARM players.
- 32 total lock-counted players.
- Franchise-owned player records and franchise farm records only.
- Farm record and player assignment status must agree.

## 3. Action Primitives

### Release/Cut

`releaseFranchisePhase11Player(...)` updates only the franchise-owned player/farm state.

Behavior:

- Requires canonical franchise context:
  - `franchiseId`
  - `seasonId`
  - optional `statsScopeId`, which must match `seasonId` when provided
  - `seasonNumber`
  - `teamId`
  - `playerId`
  - optional `offseasonStateId`
- Requires the player to be assigned to the target team.
- Allows release/cut only from `MLB` or `FARM`.
- Updates the player assignment status to `RELEASED`.
- Deletes the matching franchise farm record when releasing a FARM player.
- Logs a Mode 2 v1 `release` transaction with `rosterMovementPhase: "PHASE_11_FINALIZE"`.
- Stores the original player and farm record in `previousState` for audit/repair context.

Rejected release/cut conditions include:

- Missing required context.
- Missing franchise-owned player.
- Player not assigned to the target team.
- Player assignment status not `MLB` or `FARM`.

### Sign/Fill

`signFranchisePhase11Player(...)` fills an MLB or FARM roster spot using only franchise-owned player records.

Allowed sign/fill sources:

- Player has no assignments.
- Player assignments are all `FREE_AGENT`.
- Player assignments are all `UNASSIGNED`.

Rejected sign/fill statuses:

- `RELEASED`
- `RETIRED`
- `INACTIVE`
- existing `MLB`
- existing `FARM`
- damaged/unknown assignment status

MLB stale farm protection:

- MLB sign/fill rejects a player when a stale franchise farm record already exists for that player/team/season.
- This is intentionally conservative. The current primitive does not silently delete or repair ambiguous farm state during MLB signing.
- The error is structured through the action result as `INVALID_ROSTER_STATUS`, with a message indicating the stale farm record must be repaired or released first.

FARM sign/fill behavior:

- Updates the franchise-owned player assignment to `FARM`.
- Creates a franchise farm record with `rosterStatus: "FARM"`.
- Does not use generated filler pools, external free-agent sources, League Builder templates, or prototype offseason state.

Transaction context:

- Release/cut writes `type: "release"`.
- Sign/fill writes `type: "free_agent_signing"`.
- Both use `phase: "OFFSEASON"`.
- Both include:
  - `franchiseId`
  - `seasonId`
  - `statsScopeId`
  - `seasonNumber`
  - `teamId`
  - `playerId`
  - `offseasonStateId` when supplied
  - `rosterMovementPhase: "PHASE_11_FINALIZE"`

Rollback behavior:

- The primitives use compensating rollback.
- If a later player/farm/transaction step fails, previously changed player/farm records are restored where possible.
- Results report rollback attempts, rollback success/failure, and rollback error details.
- This is not true cross-store IndexedDB atomicity.

## 4. Planner And Lock Contract

`franchiseRosterLockValidator.ts` remains the source of truth for Phase 11 lock validity.

Validator responsibilities:

- Counts only franchise-owned player records and franchise farm records.
- Requires exact 22 MLB and 10 FARM per team.
- Requires total lock-counted roster size of 32.
- Rejects damaged legacy status.
- Rejects farm records without matching players.
- Rejects farm records pointing at players not assigned to the team.
- Rejects farm records when the matching player assignment is not `FARM`.
- Flags excluded inactive statuses as warnings where appropriate.

Planner responsibilities:

- `planFranchisePhase11Roster(...)` loads franchise-owned players, teams, farm records, and the validator result.
- `planFranchisePhase11RosterFromRecords(...)` supports deterministic tests and future read-only UI/analyzer reuse.
- Reports:
  - checked team ids
  - MLB count
  - FARM count
  - total count
  - required cuts
  - required signings
  - required farm/status repairs
  - blocking lock issues
  - warnings
  - limitations

Important boundary:

- The planner cannot make a failed validator result pass.
- If the validator reports errors, the planner remains invalid and carries those lock issues forward.
- The planner does not choose specific players to cut, sign, move, or repair.

## 5. Safety Boundaries

Phase 11 foundation boundaries:

- No League Builder/global/template reads or writes.
- No prototype offseason local-only roster state is authoritative for franchise Phase 11.
- No generated filler pool.
- No external free-agent source.
- No automatic cut/sign during finalization.
- No roster analyzer mutation.
- No free agency execution.
- No draft execution.
- No trade execution.
- No retirement execution.
- No import writes.
- No claim of true cross-store atomicity.

D2-D7 adapter boundaries remain unchanged:

- D2 ratings/salary remains the existing mutation-capable adapter.
- D3 retirement remains preview-only.
- D4 free agency remains preview-only.
- D5 draft remains preview-only.
- D6 trades remain preview-only.
- D7 consistency cleanup remains a guardrail/copy/context cleanup, not an execution wave.

## 6. Tests And Confidence

Focused tests run during implementation:

- `npm test -- src/utils/tests/franchisePhase11RosterActions.test.ts src/utils/tests/franchisePhase11RosterPlanner.test.ts`
- `npm test -- src/utils/tests/franchiseRosterMovement.test.ts`
- `npm test -- src/src_figma/__tests__/franchiseMode/FinalizeAdvanceFlow.pass1a.test.tsx`
- `npm run build`

Covered behavior:

- Planner passes valid 22/10/32 state.
- Planner reports too many MLB, too few MLB, too many/too few FARM, total mismatch, and damaged status repair requirements.
- Release/cut updates franchise-owned player/farm state and logs canonical Phase 11 transaction context.
- Sign/fill uses only franchise-owned player rows.
- Sign/fill allows no assignments, `FREE_AGENT`, and `UNASSIGNED`.
- Sign/fill rejects `RELEASED`, `RETIRED`, `INACTIVE`, existing `MLB`, and existing `FARM`.
- MLB sign/fill rejects stale farm records instead of leaving inconsistent farm state.
- Writer failure rolls back prior player/farm state where possible.
- Rollback failure reports `ROLLBACK_FAILED`.
- FinalizeAdvanceFlow blocks invalid durable lock and shows issue details.
- Existing roster movement tests remain green.

Non-blocking test debt:

- Add a direct damaged/`UNKNOWN` sign/fill rejection test before adding Phase 11 UI execution controls. The implementation rejects damaged/unknown assignment state through `INVALID_ROSTER_STATUS`, but an explicit regression test would make the boundary more visible.
- Add a direct mixed-assignment test, for example `FREE_AGENT` plus `RELEASED`, before broader UI execution. Current whole-player validation rejects mixed non-available statuses, but a focused test would protect the edge.

## 7. Remaining Deferred Work

Deferred Phase 11/offseason work:

- Broad Phase 11 UI execution workflow.
- Team-by-team cut/sign chooser.
- Durable confirmation flow for release/cut/sign/fill.
- Generated or external filler source, if ever desired.
- Free agency execution.
- Draft execution.
- Trade execution.
- Retirement execution.
- True transaction/rollback atomicity.
- Import writes.
- Career/milestone canonical franchise scoping.
- Salary/claim priority rules beyond current bounded primitives.
- Analyzer-assisted recommendations that remain read-only until mutation workflows are explicitly designed.

## 8. Recommended Next Wave Analysis

### Option A: Explicit Unknown-Status Test Hardening

Value:

- Low-risk closeout before exposing any UI controls.
- Locks down the damaged legacy status boundary around sign/fill.
- Protects the exact blocker class just patched.

Risk:

- Low.

Dependencies:

- Current `franchisePhase11RosterActions.ts`.
- Current focused Phase 11 action tests.

Recommended reasoning level:

- Low.

### Option B: Narrow Phase 11 UI Workflow

Value:

- Makes the new primitives usable by the player.
- Provides the first real durable Phase 11 correction path.
- Can keep finalization blocked until the durable lock passes.

Risk:

- High.
- UI must avoid prototype local-only roster state.
- Confirmation, player selection, stale farm errors, transaction output, rollback details, and revalidation after each mutation all need careful handling.

Dependencies:

- Phase 11 action primitives.
- Phase 11 planner.
- Phase 11 lock validator.
- FinalizeAdvanceFlow franchise context.
- Additional guard tests for no League Builder/global reads/writes.

Recommended reasoning level:

- High.

### Option C: True-Value Salary Model

Value:

- Moves D2 closer to the full offseason salary spec.
- Helps future claim priority and free-agency/trade logic.

Risk:

- Medium-high.
- Formula and ledger semantics need product confirmation before mutation.

Dependencies:

- D2 ratings/salary checkpoint.
- OFFSEASON_SYSTEM_SPEC salary rules.
- Decision on salary ledger persistence.

Recommended reasoning level:

- High.

### Option D: Mutation-Capable Retirement Design

Value:

- Converts D3 from preview to an actual offseason phase.
- Begins filling major offseason spec completion gap.

Risk:

- High.
- Player removal, transactions, jersey retirement, roster hole creation, and Phase 11 downstream impact all need design.

Dependencies:

- D3 retirement preview.
- Phase 11 primitives.
- Transaction identity.
- Final retirement model decision.

Recommended reasoning level:

- Extra High.

### Option E: Mutation-Capable Free Agency Design

Value:

- Converts D4 preview into a real player movement phase.
- Potentially creates the available-player source Phase 11 would need later.

Risk:

- Extra high.
- Dice execution, protected players, destination selection, exchange players, roster holes, and transaction logging all interact.

Dependencies:

- D4 free-agency preview.
- Phase 11 primitives.
- Durable roster movement writers.
- Final ceremony/exchange model.

Recommended reasoning level:

- Extra High.

### Option F: Mutation-Capable Draft/Trade Design

Value:

- Moves D5/D6 beyond readiness/fit preview.
- Completes more offseason spec surface.

Risk:

- Extra high.
- Draft class generation, prospect persistence, trade acceptance, salary, morale, chemistry, and roster state all need careful sequencing.

Dependencies:

- D5 draft preview.
- D6 trade preview.
- Phase 11 primitives.
- Salary model decision.
- Transaction and rollback model.

Recommended reasoning level:

- Extra High.

### Option G: Import-Write Lifecycle Follow-Up

Value:

- Improves franchise save-slot portability and lifecycle completeness.
- Reduces future risk before more mutation-heavy offseason systems create more data domains.

Risk:

- Medium-high.
- Import must be collision-safe and must not corrupt scoped-global hybrid ownership.

Dependencies:

- Manifest-driven export/delete lifecycle.
- Storage architecture decision.
- Transition journal and Phase 11 domains.

Recommended reasoning level:

- High.

## 9. Final Recommendation

Recommended next wave: explicit unknown-status and mixed-assignment test hardening first, then a narrow Phase 11 UI planning pass before any execution UI.

Rationale:

- The Phase 11 primitives are safe and focused, but UI execution will expose edge cases quickly.
- A small test-hardening pass protects the most recent blocker class without broadening app behavior.
- After that, the next meaningful product step is a narrow UI workflow that uses the planner and primitives directly, with confirmation and revalidation after each write.
- Mutation-heavy retirement/free-agency/draft/trade systems should remain deferred until Phase 11 UI and rollback reporting are proven in the app.

Exact next prompt:

```text
Recommended reasoning: Low

Please implement Phase 11 sign/fill test hardening only.

Scope:
- Do not add Phase 11 UI.
- Do not change app behavior unless a test reveals a real blocker.
- Do not implement free agency, draft, trade, retirement execution, roster analyzer mutations, or import writes.
- Keep this to focused Phase 11 action tests.

Use:
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchisePhase11RosterActions.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/tests/franchisePhase11RosterActions.test.ts
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_PHASE_11_ROSTER_FOUNDATION_CHECKPOINT.md

Add tests proving:
1. Sign/fill rejects damaged/UNKNOWN assignment status directly.
2. Sign/fill rejects mixed assignments such as FREE_AGENT plus RELEASED.
3. Sign/fill rejects mixed assignments such as UNASSIGNED plus INACTIVE.
4. No player, farm, or transaction writes occur for those rejected cases.

After implementation:
- Run `npm test -- src/utils/tests/franchisePhase11RosterActions.test.ts src/utils/tests/franchisePhase11RosterPlanner.test.ts`
- Run `npm run build`
- Summarize changed tests and whether Phase 11 foundation remains safe.
```
