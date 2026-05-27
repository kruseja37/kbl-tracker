# Franchise Retirement Ceremony C0 Decisions

Date: 2026-05-25

Scope: documentation decision closeout only. This document does not implement app code, add UI, add tests, implement the ceremony planner/roller, or change R1/R2 retirement behavior.

Primary references:

- `spec-docs/FRANCHISE_RETIREMENT_CEREMONY_DESIGN.md`
- `spec-docs/FRANCHISE_RETIREMENT_MUTATION_DESIGN.md`
- `spec-docs/FRANCHISE_R1_RETIREMENT_EXECUTION_CORE_CHECKPOINT.md`
- `spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`

## 1. Probability Model For C1

Decision:

- Use the OFFSEASON spec reverse-age formula as the C1 MVP probability model.

Exact MVP formula:

```text
retirementProbability = max(5, 50 - ageRank * (45 / rosterSize))
```

Where:

- `ageRank` is zero-based after sorting eligible team candidates by age descending.
- `rosterSize` is the eligible candidate count for the team.
- Probability is stored as a percentage from `0` to `100`.
- Empty candidate pools return no candidate probabilities.

Relation to OFFSEASON spec:

- This directly follows `OFFSEASON_SYSTEM_SPEC.md` Section 7.2.
- It preserves the reverse-age/team-roll intent: oldest players are most likely, younger players are least likely.
- It keeps the oldest player near 50% and bottoms out younger players at 5%.

C1 roll interpretation:

- C1 should use weighted cumulative selection across the probability table plus an explicit no-retirement bucket.
- The no-retirement bucket is:

```text
noRetirementWeight = max(5, 100 - sum(candidateProbabilities))
```

- This avoids silently guaranteeing a retiree when probabilities are small.
- If candidate probability sum exceeds 100, normalize candidate weights and use a small explicit no-retirement weight of 5.

Deferred:

- Morale modifiers.
- Injury modifiers.
- Contract modifiers.
- Personality/narrative modifiers.
- True “1-2 per team” seasonal calibration.
- More sophisticated no-retirement probability tuning.
- Separate MLB/FARM probability curves.

## 2. Seed Strategy

Decision:

- C1 requires explicit deterministic seed input.
- The same franchise, season, team, candidate pool, staged retirees, reveal index, and seed namespace must produce the same ceremony result.
- User reroll is not allowed in MVP.

Required seed inputs:

- `franchiseId`
- `seasonId`
- `seasonNumber`
- `offseasonStateId`
- `teamId`
- method/version
- reveal index for that team
- ordered candidate ID list hash
- staged retiree IDs for that team
- caller-provided `seedNamespace`

Recommended method/version:

```text
franchise-retirement-ceremony-v1-reverse-age-roll
```

Seed behavior:

- C1 should derive a stable seed string or seed hash from the required fields.
- The deterministic random value should be generated from the seed hash with a stable, local utility.
- C1 should not call `Math.random()`.
- C1 should return the seed hash and candidate set hash in result metadata.

Reroll policy:

- No reroll in MVP.
- A future reroll system would need explicit audit metadata and should be treated as a separate design decision.

## 3. Candidate Eligibility

Decision:

- C1 includes both MLB and FARM players if they are R1-compatible.
- FREE_AGENT and UNASSIGNED do not participate in MVP.
- Damaged/unknown statuses are excluded and reported as issues or limitations.

Eligible:

- Franchise-owned `MLB` player assigned to a franchise-owned team.
- Franchise-owned `FARM` player assigned to a franchise-owned team with a matching scoped farm record.

Ineligible:

- `FREE_AGENT`
- `UNASSIGNED`
- `RELEASED`
- `RETIRED`
- `INACTIVE`
- damaged/unknown status
- missing player
- wrong franchise/team scope
- FARM player without matching scoped farm record

Rationale:

- This matches R1 selected-player apply eligibility.
- Ceremony output should not select players that R1 would later reject.
- FARM participation is allowed because R1 can safely retire FARM players and clean matching farm records.

Deferred:

- Free-agent retirement.
- Unassigned/inactive pool retirement.
- Teamless retired-player handling.
- Retirement from historical/prototype/global player pools.

## 4. Ceremony Output Type

Decision:

- C1/C2 output is staged selected retirees for confirmation.
- The ceremony never automatically applies retirements.

Output classification:

- Risk preview: probability/candidate information.
- Ceremony staged result: deterministic reveal output, still no writes.
- Applied retirement: only after R1 selected-player apply succeeds.

C1 output:

- Candidate tables.
- Reveal results.
- Staged selected retiree IDs.
- No-retirement outcomes.
- Issues/limitations.
- Seed/candidate metadata.

Not allowed in C1/C2:

- Automatic retirement.
- Direct writes.
- R1 apply calls.
- Transaction logging.
- Offseason phase advancement.

## 5. User Override Policy

Decision:

- MVP allows users to remove ceremony-selected retirees before confirmation.
- MVP does not allow users to add non-ceremony retirees from the ceremony screen.
- Existing R2 manual selected-player apply remains separate and can still be used where exposed.

Rationale:

- Removing a staged retiree preserves user control and avoids forcing an unwanted roll outcome before the app has full ceremony persistence/audit.
- Adding arbitrary players from the ceremony result risks mixing manual retirement and ceremony-selected retirement without durable audit metadata.
- R1 remains the mutation boundary either way because only selected player IDs are passed to apply.

Rules:

- Ceremony-selected retirees are staged suggestions.
- User may unstage a suggested retiree before confirmation.
- User may not add an unstaged candidate in the ceremony MVP.
- Confirmation sends the final staged selected IDs to R1 apply.
- R1 revalidates all selected IDs before writing.

Deferred:

- Add/manual override within ceremony.
- Decline tracking.
- Override audit metadata.
- Commissioner/admin override flows.

## 6. Durability

Decision:

- C1 remains pure/no storage.
- C2 ceremony preview remains local/staged unless a later persistence design is approved.
- Ceremony roll results are not persisted before confirmation in MVP.

C1 must not:

- import storage modules,
- read IndexedDB/localStorage,
- write IndexedDB/localStorage,
- update offseason state,
- update save-slot manifest domains.

Future persistence would require:

- A new durable domain, likely `franchiseRetirementCeremonyResults`.
- Manifest export/delete/validation coverage.
- Status model such as `staged`, `applied`, `abandoned`, `invalidated`.
- Candidate set hash and seed hash persistence.
- Links from applied ceremony results to R1 retirement transaction IDs.
- Recovery behavior for staged-but-unapplied records.

## 7. Transaction Metadata

Decision:

- Ceremony roll/evidence metadata should not be added to R1 retirement transactions in C1.
- Ceremony metadata in transactions is deferred until C3 or a dedicated persistence/integration wave.

Potential future metadata:

- `ceremonyId`
- `ceremonyMethodVersion`
- `revealIndex`
- `rollValue`
- `retirementProbability`
- `candidateSetHash`
- `seedHash`
- `selectedByCeremony: true`

R1 transaction logging remains authoritative and unchanged for now.

## 8. UI Sequencing

### C1: Pure Planner/Roller

May do:

- Build candidate tables from supplied franchise-owned data.
- Compute probabilities.
- Produce deterministic reveal results.
- Recalculate after staged retirees.
- Return issues/limitations.

May not do:

- Add UI.
- Call R1 apply.
- Read/write storage.
- Persist ceremony results.
- Mutate players/farm/transactions/offseason state.

### C2: Ceremony Preview UI

May do:

- Render ceremony candidate tables.
- Let user trigger reveals.
- Stage ceremony-selected retirees locally.
- Let user remove staged ceremony-selected retirees.
- Keep risk preview, staged ceremony, and applied results visually distinct.

May not do:

- Apply retirements.
- Persist ceremony results.
- Add jersey/narrative/replacement controls.
- Fall back to prototype/global retirement flows.

### C3: Confirmation Integration Through R1 Apply

May do:

- Feed final staged ceremony-selected IDs into the existing R2 confirmation/R1 apply path.
- Show R1 success/failure/rollback results.
- Optionally include ceremony metadata in apply input if designed first.

May not do:

- Bypass R1 validation.
- Directly write player/farm/transaction data from UI.
- Auto-apply on page load or finalization.

## 9. Final C1 Implementation Contract

Module:

```text
src/utils/franchiseRetirementCeremonyPlanner.ts
```

Test file:

```text
src/utils/tests/franchiseRetirementCeremonyPlanner.test.ts
```

Method/version:

```text
franchise-retirement-ceremony-v1-reverse-age-roll
```

No storage imports:

- No IndexedDB storage modules.
- No `franchisePlayerStorage`.
- No `franchiseFarmStorage`.
- No `transactionStorage`.
- No `franchiseManager`.
- No `offseasonState` writers.

No writes:

- No player writes.
- No farm writes.
- No transaction writes.
- No offseason state writes.
- No manifest/save-slot writes.

No R1 apply calls:

- C1 may share compatible types/constants where safe.
- C1 must not call `runFranchiseRetirementDryRun(...)` in apply mode.
- C1 must not execute retirements.

### Proposed Input Shape

```ts
interface FranchiseRetirementCeremonyContext {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  statsScopeId: string;
  offseasonStateId: string;
  phase: 'RETIREMENTS';
  seedNamespace: string;
}

interface FranchiseRetirementCeremonyInput {
  context: FranchiseRetirementCeremonyContext;
  teams: FranchiseRetirementCeremonyTeam[];
  players: FranchiseRetirementCeremonyPlayer[];
  farmRecords?: FranchiseRetirementCeremonyFarmRecord[];
  stagedRetireeIdsByTeam?: Record<string, string[]>;
}
```

### Proposed Output Shape

```ts
interface FranchiseRetirementCeremonyPlan {
  methodVersion: 'franchise-retirement-ceremony-v1-reverse-age-roll';
  valid: boolean;
  issues: FranchiseRetirementCeremonyIssue[];
  limitations: string[];
  teamPlans: FranchiseRetirementCeremonyTeamPlan[];
}

interface FranchiseRetirementCeremonyRevealResult {
  methodVersion: 'franchise-retirement-ceremony-v1-reverse-age-roll';
  valid: boolean;
  teamId: string;
  revealIndex: number;
  seedHash: string;
  candidateSetHash: string;
  rollValue: number;
  outcome: 'retired' | 'no_retirement';
  selectedPlayerId?: string;
  probabilityTable: FranchiseRetirementCeremonyCandidate[];
  issues: FranchiseRetirementCeremonyIssue[];
  limitations: string[];
}
```

Required pure functions:

```ts
buildFranchiseRetirementCeremonyPlan(input): FranchiseRetirementCeremonyPlan
revealFranchiseRetirementForTeam(input, teamId, revealIndex): FranchiseRetirementCeremonyRevealResult
```

Canonical validation:

- Missing `franchiseId` is invalid.
- Missing `seasonId` is invalid.
- Missing or invalid `seasonNumber` is invalid.
- Missing `statsScopeId` is invalid.
- `statsScopeId !== seasonId` is invalid.
- Missing `offseasonStateId` is invalid.
- Phase other than `RETIREMENTS` is invalid.
- Missing `seedNamespace` is invalid.

Deterministic tests required:

- Same input produces same plan.
- Same input and seed produce same reveal.
- Candidate ordering is stable.
- Probability table is stable.
- Staged retiree is excluded from next reveal.
- Frozen input/deep-equality proves no mutation.
- Invalid context returns structured issues.

## 10. Exact Next Prompt

```text
Recommended reasoning: High

Please implement C1: pure franchise retirement ceremony planner/roller.

Scope:
- Do not add UI.
- Do not write to franchise players, farm records, transactions, offseason state, schedules, save-slot manifest, localStorage, or IndexedDB.
- Do not call R1 apply.
- Do not change R1/R2 retirement behavior.
- Do not implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.
- Keep this as a side-effect-free utility plus tests only.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_CEREMONY_C0_DECISIONS.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_CEREMONY_DESIGN.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementAdapter.ts

Goals:
1. Add `src/utils/franchiseRetirementCeremonyPlanner.ts`.
2. Add `src/utils/tests/franchiseRetirementCeremonyPlanner.test.ts`.
3. Implement method/version `franchise-retirement-ceremony-v1-reverse-age-roll`.
4. Implement pure `buildFranchiseRetirementCeremonyPlan(...)`.
5. Implement pure `revealFranchiseRetirementForTeam(...)`.
6. Validate canonical context:
   - `franchiseId`
   - `seasonId`
   - numeric `seasonNumber`
   - `statsScopeId === seasonId`
   - `offseasonStateId`
   - phase `RETIREMENTS`
   - `seedNamespace`
7. Accept supplied franchise-owned teams, players, and farm records as input data.
8. Build per-team candidate tables using R1-compatible eligibility:
   - MLB eligible.
   - FARM eligible only with matching scoped farm record.
   - FREE_AGENT, UNASSIGNED, RELEASED, RETIRED, INACTIVE, damaged/unknown, wrong-scope, and FARM-without-record are ineligible and reported.
9. Sort candidates by reverse age with deterministic tie-breaks:
   - age descending
   - grade/salary where available
   - player name
   - player ID
10. Compute MVP probabilities:
   - `max(5, 50 - ageRank * (45 / rosterSize))`
   - method output must include the probability table.
11. Implement deterministic reveal using explicit seed input and candidate set hash.
12. Use weighted cumulative selection plus a no-retirement bucket.
13. Recalculate/exclude staged retirees for subsequent reveals.
14. Return structured issues and limitations.
15. Guarantee no mutation of inputs.

Tests:
- Valid plan builds deterministic per-team candidate tables.
- Candidate order is age descending with stable tie-breaks.
- MLB candidates are eligible.
- FARM candidates require matching scoped farm records.
- FREE_AGENT, UNASSIGNED, RELEASED, RETIRED, INACTIVE, damaged/unknown, wrong-scope, and FARM-without-record players are excluded/reported.
- Probability table matches the C0 formula.
- Same seed/input produces same reveal.
- Different seed namespace can produce a different reveal.
- No-retirement outcome is possible and represented.
- Staged retiree is excluded from recalculated next reveal.
- Invalid canonical context returns structured issues.
- Frozen input/deep equality proves no mutation.
- No storage modules or R1 apply path are called/imported.

After implementation:
- Run `npm test -- src/utils/tests/franchiseRetirementCeremonyPlanner.test.ts`.
- Run `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`.
- Run `npm run build`.
- Summarize changed files, behavior, tests, and remaining risks.
```
