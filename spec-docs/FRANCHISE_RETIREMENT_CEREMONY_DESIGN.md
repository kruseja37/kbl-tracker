# Franchise Retirement Ceremony Design

Date: 2026-05-25

Scope: design/spec artifact only. This document does not implement app code, add UI, add tests, implement random/team-roll retirement ceremony, change R1/R2 retirement behavior, implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.

Primary references:

- `spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md`
- `spec-docs/FRANCHISE_R1_RETIREMENT_EXECUTION_CORE_CHECKPOINT.md`
- `spec-docs/FRANCHISE_RETIREMENT_MUTATION_DESIGN.md`
- `spec-docs/FRANCHISE_OFFSEASON_STABILIZATION_CHECKPOINT.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`
- `src/utils/franchiseRetirementAdapter.ts`
- `src/src_figma/app/components/RetirementFlow.tsx`

## 1. Executive Summary

Current retirement state after R1/R2:

- D3 retirement preview exists as an age-risk dry-run.
- R1 selected-player retirement execution core exists.
- R2 RetirementFlow explicit confirmation UI exposes R1 safely.
- Canonical franchise identity is required before preview or apply.
- The full random/team-roll retirement ceremony is not implemented.

This design defines how a random/team-roll ceremony can be layered safely on top of selected-player execution without bypassing R1/R2 guardrails.

Core recommendation:

- Build a pure ceremony planner/roller first.
- Treat ceremony output as staged recommendations, not writes.
- Require user confirmation before any retirement mutation.
- Use R1 selected-player apply as the only mutation path.

The ceremony should feel like the `OFFSEASON_SYSTEM_SPEC.md` retirement process, but the first implementation should remain deliberately narrower than the full spec.

## 2. Current Baseline

### D3 Dry-Run Preview

Implemented in `src/utils/franchiseRetirementAdapter.ts` and rendered by `src/src_figma/app/components/RetirementFlow.tsx`.

Method/version:

```text
franchise-retirement-v1-age-risk-dry-run
```

Current behavior:

- Reads franchise-owned player data only.
- Validates franchise offseason context.
- Uses phase `RETIREMENTS`.
- Shows age-risk candidates, evidence, trust levels, warnings, and limitations.
- Writes nothing.

### R1 Selected-Player Execution Core

Implemented in `src/utils/franchiseRetirementAdapter.ts`.

Method/version:

```text
franchise-retirement-v1-selected-player-apply
```

Current behavior:

- Requires explicit selected player IDs.
- Prevalidates the full selected set before mutation.
- Requires canonical `statsScopeId === seasonId`.
- Allows eligible franchise-owned `MLB` and `FARM` players.
- Requires matching scoped farm record for FARM retirements.
- Updates franchise-owned player state.
- Cleans matching farm record for FARM retirees.
- Logs canonical Mode 2 v1 `retirement` transactions.
- Uses compensating rollback, not true cross-store atomicity.

### R2 Explicit Confirmation UI

Implemented in `src/src_figma/app/components/RetirementFlow.tsx`.

Current behavior:

- Preview first.
- Manual candidate selection.
- Explicit confirmation step.
- Apply calls R1 adapter only.
- Success/failure/rollback results render in the UI.
- Preview refreshes after successful apply.
- No random selection, auto-select-all, direct writes, prototype fallback, or auto-advance.

### Stabilization Result

Latest R1/R2 stabilization checkpoint:

```text
npm test -- --reporter=dot
313 test files passed
6497 tests passed
```

```text
npm run build
passed
```

No code or test fixes were required during the R1/R2 stabilization pass.

## 3. OFFSEASON Spec Ceremony Summary

`OFFSEASON_SYSTEM_SPEC.md` Section 7 describes Phase 5 retirements as an interactive ceremony.

Spec expectations:

- Retirements happen after each season.
- The target feel is roughly 1-2 retired players per team per offseason.
- Players are ordered by age descending.
- Older players receive higher retirement probability.
- Younger players receive lower retirement probability.
- The UI shows team-by-team retirement probabilities.
- The user presses a reveal/roll action.
- A reveal can produce a retired player or no retirement.
- Probabilities are recalculated after a retirement.
- A team can end with no retirement.
- Retired players create empty roster slots.
- Jersey retirement is offered immediately after a player retires.
- Hall of Fame/museum handling is separate from the retirement moment.

MVP ceremony candidates:

- Franchise-owned team-by-team candidate pool.
- Reverse-age ordering.
- Deterministic probability calculation.
- Deterministic or persisted roll result.
- Reveal result that stages a proposed retiree or no-retirement outcome.
- User confirmation before applying staged retirees.

Deferred from MVP:

- Jersey retirement prompt and storage.
- Narrative/news effects.
- Milestone effects.
- Hall of Fame/museum linkage.
- Generated replacement players.
- Free-agency/draft coupling beyond creating roster vacancies through R1 apply.
- Full “1-2 per team” enforcement if that requires repeated per-team ceremony state and persistence.
- Morale, injury, contract, personality, and narrative modifiers.

## 4. Proposed Ceremony Model

### Candidate Pool Rules

The ceremony planner should use the same franchise-owned scope boundary as D3/R1.

Required context:

- `franchiseId`
- canonical `seasonId`
- numeric `seasonNumber`
- `statsScopeId === seasonId`
- `offseasonStateId`
- phase `RETIREMENTS`

Allowed reads:

- Franchise-owned players.
- Franchise-owned teams.
- Franchise-owned farm records.
- Franchise offseason state.
- Transition journals for warnings.

Blocked reads:

- League Builder/global template players.
- Prototype retirement storage.
- Non-franchise player pools.
- Narrative/morale/personality systems unless they become scoped and explicitly included later.

Candidate set for MVP:

- Include franchise-owned `MLB` players.
- Include franchise-owned `FARM` players only if a matching scoped farm record exists.
- Exclude `FREE_AGENT`, `UNASSIGNED`, `RELEASED`, `RETIRED`, `INACTIVE`, damaged/unknown status, wrong-scope players, and FARM players without matching farm records.

This matches R1 execution eligibility and prevents the ceremony from selecting a player R1 would later reject.

### Eligibility Rules

Eligibility should be computed in a shared, testable helper or imported from the R1 validation model if feasible.

Eligible:

- `MLB`, assigned to a franchise-owned team.
- `FARM`, assigned to a franchise-owned team with a matching scoped farm record.

Ineligible:

- `FREE_AGENT`
- `UNASSIGNED`
- `RELEASED`
- `RETIRED`
- `INACTIVE`
- damaged/unknown status
- wrong franchise/team scope
- missing FARM record for FARM status

The ceremony should surface ineligible counts as limitations or validation issues. It should not silently drop damaged data if that affects the perceived team retirement pool.

### Reverse-Age Ordering

For each team:

1. Group eligible players by `teamId`.
2. Sort by age descending.
3. Tie-break deterministically:
   - higher grade/salary if available,
   - then stable player name,
   - then stable player ID.
4. Assign age rank after filtering.

The planner should return both the ordered candidate list and the source evidence used to compute ordering.

### Roll And Probability Model

The spec sketch gives oldest players roughly 40-50% and youngest players roughly 1-5%.

Recommended MVP formula:

```text
baseProbability = max(5, 50 - ageRank * (45 / rosterSize))
```

Adjustments:

- No morale/injury/contract/narrative modifiers in MVP.
- No hidden personality modifiers in MVP.
- FARM players may use the same formula initially or receive a configurable dampener only if explicitly chosen before implementation.

Recommended roll model:

- Generate one reveal outcome at a time for a team.
- Roll `0-99.999...` or equivalent normalized deterministic random value.
- Select the first candidate whose cumulative probability bucket contains the roll, or return no-retirement.
- After a staged retirement for a team, recompute probabilities for remaining candidates before a second reveal.
- Cap MVP reveals at a configured maximum per team, likely 2, matching the current spec feel.

Open choice:

- The exact probability distribution can be direct per-player probability checks in reverse-age order instead of cumulative weighted selection. The implementation prompt should settle this before code begins.

### Deterministic Seed Requirements

If roll results are computed before confirmation or persisted for reload/replay, they must be deterministic.

Recommended seed inputs:

- `franchiseId`
- `seasonId`
- `seasonNumber`
- `offseasonStateId`
- `teamId`
- ceremony method/version
- reveal index for the team
- ordered candidate ID list hash
- previous staged retiree IDs for that team

Recommended method/version:

```text
franchise-retirement-ceremony-v1-reverse-age-roll
```

Seeded output should include:

- seed string or seed hash,
- candidate set hash,
- roll value,
- selected player ID or no-retirement,
- probability table snapshot,
- reveal index,
- method/version.

### Suggested Retirees Versus Execution

The ceremony should generate staged suggested retirees only.

It must not:

- mutate player records,
- delete farm records,
- write transactions,
- write jersey retirement records,
- advance offseason phase,
- auto-finalize,
- call R1 apply during page load.

Execution path:

1. Ceremony planner builds team candidate tables.
2. User reveals team roll outcomes.
3. Ceremony records staged selected retirees in local UI state or optional durable ceremony state.
4. User reviews staged retirements.
5. User confirms.
6. R2 confirmation calls R1 selected-player apply with staged retiree IDs.

R1 remains the only mutation path.

## 5. Safety Boundary

Ceremony safety rules:

- Ceremony remains preview/staging until user confirmation.
- No automatic retirement during page load.
- No automatic retirement during finalization.
- No direct writes from ceremony planner/roller.
- No direct player/farm/transaction writes from ceremony UI.
- Final mutation goes through R1 selected-player apply.
- Canonical identity is required.
- `statsScopeId === seasonId` is required.
- Damaged identity blocks ceremony, same as R2.
- R1 prevalidation remains authoritative at apply time.
- Ceremony-selected players can still fail apply if storage changed after staging.

The ceremony should never weaken R1/R2 behavior. It should sit in front of R2 as a richer staging and selection mechanism.

## 6. UI Design

### Ceremony Preview Flow

Recommended MVP screen sequence:

1. Retirement risk preview loads.
2. User enters ceremony mode.
3. Team list shows each team’s eligible candidate count and current reveal status.
4. Selecting a team shows ordered candidates by reverse age.
5. User clicks reveal for that team.
6. Reveal returns:
   - selected retiree, or
   - no retirement.
7. If a retiree is staged and team limit allows another reveal, probabilities are recalculated.
8. User continues team-by-team.
9. Summary lists staged retirees.
10. User confirms selected-player apply through existing R2/R1 path.

### Roll/Reveal Behavior

Reveal should be explicit and user-driven.

Minimum reveal output:

- team,
- reveal index,
- roll value or presentation-safe roll bucket,
- selected player or no-retirement,
- player probability at reveal time,
- probability table snapshot,
- method/version.

The UI can hide exact seed internals while keeping them available in debug/test output.

### Distinguishing Result Types

The UI must clearly distinguish:

- Risk preview: age-risk candidates and probabilities, no ceremony roll has happened.
- Ceremony selected retirees: staged roll outcomes, still no writes.
- Confirmed applied retirements: R1 apply succeeded and records were mutated/logged.

Suggested labels:

- `Risk Preview`
- `Ceremony Staged`
- `Applied Retirement`

### Confirmation Step

The existing R2 confirmation model should remain.

Confirmation copy should add:

- “These players were selected by the retirement ceremony.”
- “Apply still revalidates current franchise roster/farm state.”
- “If validation fails, no partial selected set should apply unless R1 explicitly reports a later write failure with rollback status.”

### Failure And Rollback Display

Use existing R2 result rendering:

- structured issue codes/messages,
- rollback status,
- rollback error details,
- compensating rollback copy.

Additional ceremony-specific failures to display:

- ceremony seed mismatch,
- candidate set changed since reveal,
- staged retiree no longer eligible,
- missing canonical identity,
- R1 apply validation failure.

### MVP UI Deferrals

Do not include in MVP ceremony UI:

- jersey retirement controls,
- narrative/news controls,
- milestone controls,
- replacement-player generation,
- free-agency/draft/trade execution shortcuts,
- automatic Phase 11 repair actions,
- roster analyzer mutation recommendations.

## 7. Data And Transaction Model

### Ceremony Storage Options

Option A: local-only ceremony state for MVP.

- Lowest risk.
- No save/export implications.
- Lost on refresh.
- Good for first UI prototype but weaker for long ceremonies.

Option B: durable ceremony result record.

- Better for save/resume and audit.
- Requires manifest/export/delete coverage.
- Requires repair handling if R1 apply succeeds after durable staged results.

Recommended path:

1. C1 pure planner/roller returns a structured ceremony plan/result without persistence.
2. C2 UI uses local staged results only.
3. C3 decides whether durable ceremony records are needed before apply integration ships broadly.

### If Ceremony Results Become Durable

Proposed domain:

```text
franchiseRetirementCeremonyResults
```

Required identity:

- `franchiseId`
- `seasonId`
- `seasonNumber`
- `statsScopeId`
- `offseasonStateId`
- `phase: "RETIREMENTS"`
- `methodVersion`

Suggested record fields:

- `ceremonyId`
- `createdAt`
- `updatedAt`
- `status: "staged" | "applied" | "abandoned" | "invalidated"`
- `teamResults`
- `candidateSetHash`
- `seedHash`
- `selectedPlayerIds`
- `appliedTransactionIds` after R1 apply succeeds.

Save/export implications:

- Add the domain to the franchise save-slot manifest if durable.
- Export/delete only records with matching `franchiseId` and canonical season identity.
- Validation should warn on `staged` ceremony results that were not applied.

### Transaction Logging

Retirement transaction logging remains R1-owned.

Ceremony metadata may be attached to R1 transaction payload after confirmation:

- `ceremonyId`
- `ceremonyMethodVersion`
- `revealIndex`
- `rollValue`
- `retirementProbability`
- `candidateSetHash`
- `seedHash`
- `selectedByCeremony: true`

This metadata should be optional for backward compatibility. R1 must still support manual selected-player apply without ceremony metadata.

### Offseason State

The spec data model includes `retirees` and `jerseyRetirements` under offseason state. MVP ceremony should not write those directly unless a durable retirement ceremony/offseason-state adapter is explicitly designed.

For now:

- R1 player metadata and canonical transaction records are the durable source of retirement execution.
- Ceremony records, if later added, should reference R1 transactions rather than duplicating mutation authority.

## 8. Tests Required Before Implementation

Pure planner/roller tests:

- Deterministic candidate ordering by team.
- Age descending ordering with stable tie-breaks.
- Eligibility filtering matches R1 eligibility.
- FARM candidate requires matching scoped farm record.
- Probability table matches chosen formula.
- Deterministic roll results for a fixed seed.
- Different seed inputs produce different possible outcomes.
- Recalculation after staged retirement excludes the staged player.
- No-write ceremony preview.

UI tests:

- Ceremony preview renders risk preview separately from staged results.
- Reveal action is user-triggered.
- No auto-apply on mount.
- No auto-apply during finalization.
- Confirmation calls R1 apply with selected ceremony results.
- Canonical identity blocking remains active.
- Missing `seasonId` blocks ceremony and adapter calls.
- Missing/invalid `seasonNumber` blocks ceremony and adapter calls.
- Failure/rollback display still works.
- No League Builder/global/prototype hooks or writers in franchise context.
- No jersey/narrative/replacement controls in MVP.

Integration tests:

- R1/R2 existing tests remain green.
- Ceremony-staged selected retiree applies through R1 and refreshes preview.
- Staged retiree invalidated before confirmation fails safely.
- Transaction payload includes optional ceremony metadata if that is implemented.
- Save/export manifest tests if durable ceremony records are added.

## 9. Open Decisions

Probability model:

- Use the spec sketch directly?
- Use the existing D3 age-risk curve?
- Use per-player independent checks in reverse order?
- Use cumulative weighted selection?
- Cap team retirements at 1, 2, or configurable max?

Seed strategy:

- Is deterministic seed mandatory in C1?
- What exact seed hash algorithm should be used?
- Should seed be user-visible, debug-only, or hidden?

User control:

- Can users override ceremony-selected retirees before confirmation?
- Can users decline a ceremony-selected retiree?
- Can users manually add a retiree outside the ceremony selection?
- Should override create audit metadata?

Eligibility:

- Do FARM players participate in MVP ceremony?
- Should FREE_AGENT or UNASSIGNED players ever participate?
- Are retirement rolls per team active roster only, or full organization including farm?

Persistence:

- Are ceremony results local-only in MVP?
- Should roll results persist before apply?
- How should abandoned staged results be represented?
- Should applied ceremony records link to retirement transactions?

Deferred systems:

- When does jersey retirement occur?
- Does jersey retirement block phase advancement?
- When do narrative/news/milestone effects fire?
- How do replacement-player systems interact with draft/free agency/Phase 11?

## 10. Recommended Implementation Phases

### C0: Design Closeout

Goal:

- Resolve open decisions before code.

Deliverables:

- Final probability model.
- Final seed strategy.
- MVP eligibility decision.
- Durable versus local-only ceremony decision.
- Override/decline policy.

Recommended reasoning level:

- High.

### C1: Pure Ceremony Planner/Roller

Goal:

- Add a deterministic, side-effect-free ceremony planner and roller.

Scope:

- Pure utility only.
- No UI.
- No writes.
- No R1 apply integration.

Likely files:

- `src/utils/franchiseRetirementCeremonyPlanner.ts`
- `src/utils/tests/franchiseRetirementCeremonyPlanner.test.ts`

Acceptance criteria:

- Builds team candidate tables from provided franchise-owned input.
- Produces deterministic ordered candidates.
- Produces deterministic reveal results for fixed seeds.
- Reports limitations/issues.
- Writes nothing.

Recommended reasoning level:

- High.

### C2: Ceremony Preview UI

Goal:

- Add a RetirementFlow ceremony preview/reveal surface without mutation.

Scope:

- User-triggered reveal.
- Staged local results.
- No apply.
- No persistence unless C0 chooses durable ceremony records.

Acceptance criteria:

- Risk preview and ceremony staged results are visually distinct.
- No direct writes.
- No prototype/global hooks.
- Canonical identity blocking remains.

Recommended reasoning level:

- High.

### C3: Confirmation Integration Through R1 Apply

Goal:

- Allow staged ceremony-selected retirees to feed the existing R2 confirmation/R1 apply path.

Scope:

- Confirmation required.
- R1 selected-player apply remains mutation authority.
- Optional ceremony metadata in apply input/transaction payload if designed.

Acceptance criteria:

- No auto-apply.
- R1 revalidates.
- Success/failure/rollback display remains.
- Existing R1/R2 tests remain green.

Recommended reasoning level:

- High.

### C4: Optional Narrative/Jersey/History Layers

Goal:

- Add deferred ceremony-adjacent systems only after MVP ceremony is stable.

Scope candidates:

- Jersey retirement prompt.
- Retirement ceremony history records.
- Season summary references.
- Narrative/news archive entries.
- Milestone/Hall of Fame hooks.

Recommended reasoning level:

- Extra High.

## 11. Final Recommendation

Safest first implementation step: C0 design closeout, then C1 pure ceremony planner/roller.

Why:

- R1/R2 are stable and mutation-capable, but a random ceremony introduces new determinism, replay, and save/resume questions.
- The next implementation should not touch UI or mutation paths until probability, seed, persistence, and override policies are settled.
- A pure planner/roller gives testable ceremony behavior without risking franchise saves.

Exact next prompt:

```text
Recommended reasoning: High

Please implement C1: pure franchise retirement ceremony planner/roller.

Scope:
- Do not add UI.
- Do not write to franchise players, farm records, transactions, offseason state, schedules, or manifest storage.
- Do not call R1 apply.
- Do not implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.
- Keep this as a side-effect-free utility plus tests only.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_CEREMONY_DESIGN.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementAdapter.ts

Goals:
1. Add a pure ceremony planner/roller module.
2. Require canonical context inputs: franchiseId, seasonId, seasonNumber, statsScopeId === seasonId, offseasonStateId, phase RETIREMENTS.
3. Accept franchise-owned teams, players, and farm records as input data.
4. Build per-team candidate tables using R1-compatible eligibility.
5. Sort candidates by reverse age with deterministic tie-breaks.
6. Compute MVP retirement probabilities with an explicit method/version.
7. Produce deterministic reveal results from explicit seed input.
8. Recalculate probabilities after staged retirements.
9. Return structured issues/limitations.
10. Write nothing.

Tests:
- Deterministic candidate ordering.
- Eligibility matches R1-compatible MLB/FARM rules.
- FARM candidates require matching scoped farm records.
- Probability table is deterministic.
- Fixed seed produces fixed reveal result.
- Staged retiree is excluded from recalculated next reveal.
- No-write/no-mutation guarantee by frozen input/deep equality.
- Missing/wrong canonical identity returns structured issues.

After implementation:
- Run new ceremony planner tests.
- Run R1/R2 focused retirement tests.
- Run npm run build.
- Summarize changed files, behavior, tests, and remaining risks.
```

Keep deferred systems explicit: jersey retirement, narrative/news, milestones, replacement players, full offseason ceremony history, free-agency execution, draft execution, trade execution, generated filler, import writes, and roster analyzer mutations remain out of scope until separately designed.
