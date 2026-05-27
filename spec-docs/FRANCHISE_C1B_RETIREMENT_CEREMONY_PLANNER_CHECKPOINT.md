# Franchise C1-B Retirement Ceremony Planner Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add UI, add tests, add persistence, call R1 apply, implement reroll UI, jersey retirement, narrative/news, milestones, replacement players, free agency, draft, or trade execution.

Primary references:

- `spec-docs/FRANCHISE_RETIREMENT_CEREMONY_C1_RECONCILIATION.md`
- `spec-docs/FRANCHISE_RETIREMENT_CEREMONY_C0_DECISIONS.md`
- `spec-docs/FRANCHISE_RETIREMENT_CEREMONY_DESIGN.md`
- `spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md`
- `src/utils/franchiseRetirementCeremony.ts`
- `src/utils/tests/franchiseRetirementCeremony.test.ts`

## 1. Executive Summary

C1-B pure retirement ceremony planner/roller is implemented.

Current state:

- The ceremony planner aligns with the C0 single-reveal contract.
- `buildFranchiseRetirementCeremonyPlan(...)` builds a candidate/probability plan only.
- `revealFranchiseRetirementForTeam(...)` performs one deterministic reveal.
- A reveal produces exactly one outcome: a retiree or explicit `no_retirement`.
- Invalid reveal results are non-actionable.
- No UI, persistence, or R1 apply integration exists yet.

C1-B gives the franchise retirement ceremony a safe pure engine that can be mounted later without mutating roster, farm, transaction, offseason, or global/template storage.

## 2. Completed Scope

Completed in `src/utils/franchiseRetirementCeremony.ts`:

- Method/version:

```text
franchise-retirement-ceremony-v1-reverse-age-roll
```

- Pure candidate/probability plan.
- Single deterministic reveal API.
- Retiree or explicit `no_retirement` outcome.
- Explicit no-retirement bucket.
- Candidate-pool hash.
- Seed hash.
- Reveal index.
- Staged retiree exclusion.
- Invalid reveal results are non-actionable.
- Candidate, hash, roll, bucket, and issue diagnostics remain available for invalid results.

Important behavior:

- Plan output returns `selectedPlayerIds: []`.
- Reveal output returns `selectedPlayerIds: [playerId]` only for a valid retiree outcome.
- Reveal output returns `selectedPlayerIds: []` for `no_retirement` and all invalid results.
- Invalid results cannot expose a retiree reveal bucket as actionable.

## 3. Input And Validation Contract

Required canonical fields:

- `franchiseId`
- `seasonId`
- numeric `seasonNumber`
- `statsScopeId` equal to `seasonId`
- `offseasonStateId`
- phase `RETIREMENTS`
- `seedNamespace`
- deterministic seed
- `teamId` for reveal
- non-negative `revealIndex` for reveal

Eligible players:

- `MLB`
- `FARM` with a valid scoped farm record matching:
  - `franchiseId`
  - `seasonId`
  - `seasonNumber`
  - `teamId`
  - `playerId`
  - `rosterStatus: FARM`

Excluded players:

- `FREE_AGENT`
- `UNASSIGNED`
- `RELEASED`
- `RETIRED`
- `INACTIVE`
- damaged/unknown records
- staged/already-selected retirees
- `FARM` players without a matching scoped farm record

Validation failures are structured as issues. Blocking errors make the report or reveal invalid. Warnings and info issues preserve diagnostics without making the utility write or apply anything.

## 4. Reveal Semantics

C1-B reveal semantics:

- Candidates are grouped by team.
- Candidates are ordered by age descending.
- Ties use deterministic `playerId` ordering.
- `ageRank` is zero-based.
- Probability formula:

```text
max(5, 50 - ageRank * (45 / rosterSize))
```

- Reveal uses weighted cumulative buckets.
- The no-retirement bucket is explicit.
- A reveal has exactly one outcome:
  - retiree, or
  - `no_retirement`
- Candidate-pool hash reflects candidate pool changes.
- Seed hash reflects method/version, canonical context, seed namespace, seed, team, reveal index, candidate-pool hash, and staged retiree IDs.
- Invalid results cannot carry selected player IDs.

The utility preserves deterministic auditability while keeping the actual retirement mutation boundary in R1.

## 5. Safety Boundaries

C1-B safety boundaries:

- No storage imports.
- No React imports.
- No transaction imports.
- No R1 apply imports.
- No input mutation.
- No writes.
- No persistence.
- No auto-apply.
- No player, farm, transaction, offseason, save-slot, League Builder, or prototype mutation.
- No jersey retirement effects.
- No narrative/news effects.
- No milestone effects.
- No replacement-player effects.

C1-B is a pure planning/reveal utility. It does not retire players and does not create durable ceremony history.

## 6. Tests And Confidence

Focused tests at C1-B closeout:

- `npm test -- src/utils/tests/franchiseRetirementCeremony.test.ts`
  - Result: 29 tests passed.
- `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts`
  - Result: 26 tests passed.

Covered C1-B areas:

- Deterministic reveal.
- Seed/revealIndex/hash behavior.
- Candidate-pool hash behavior.
- Staged retiree exclusion.
- Reverse-age ordering.
- `playerId` tie-breaker.
- Zero-based age rank.
- Probability formula and floor.
- Explicit no-retirement bucket.
- MLB eligibility.
- FARM eligibility with scoped farm record.
- Ineligible status exclusions.
- Damaged/unknown exclusion reporting.
- Invalid canonical context returns non-actionable output.
- Missing/invalid `teamId` or `revealIndex` returns non-actionable output.
- Input immutability.
- Import guard for storage, React, transaction, and R1 apply paths.

Confidence:

- The pure C1-B contract is safe to build a no-write C2 preview UI on.
- C1-B is not yet wired into RetirementFlow.
- R1/R2 selected-player retirement remains unchanged.

## 7. Remaining Deferred Work

Deferred after C1-B:

- C2 ceremony preview UI.
- C3 ceremony confirmation integration through R1 apply.
- Persistence of ceremony results, if ever desired.
- Transaction metadata enrichment.
- Reroll design.
- Jersey retirement.
- Narrative/news effects.
- Milestone effects.
- Replacement-player systems.
- Free-agency execution.
- Draft execution.
- Trade execution.

## 8. Recommended Next Wave Analysis

### Option A: C2 Ceremony Preview UI, No Writes

Value:

- Makes the C1-B ceremony visible without adding mutations.
- Lets users inspect candidate tables, reveal one team result, and stage local ceremony suggestions.
- Tests the user experience before adding any R1 apply integration.
- Keeps risk contained because no player/farm/transaction/offseason writes occur.

Risk:

- Medium. The UI must avoid prototype/global retirement hooks, avoid persistence, and avoid implying that staged results are applied.

Dependencies:

- C1-B pure planner/roller.
- Existing R2 RetirementFlow canonical identity guardrails.
- Existing D3 preview and R2 selected-player UI must remain distinct.

Recommended reasoning level:

- High.

### Option B: C3 Ceremony Confirmation Integration Through R1

Value:

- Turns staged ceremony output into an executable workflow through the existing R1 apply boundary.
- Reuses R2 confirmation and rollback patterns.

Risk:

- High. This introduces mutation after ceremony selection and must preserve R1 prevalidation, rollback handling, and non-prototype boundaries.

Dependencies:

- C2 preview/staging UI should land first.
- R1/R2 retirement apply path.
- Additional tests for ceremony-selected apply behavior.

Recommended reasoning level:

- High.

### Option C: Full-Suite Verification After C1-B

Value:

- Confirms C1-B did not destabilize unrelated app surfaces.
- Provides a clean checkpoint before UI work.

Risk:

- Low. Verification only.

Dependencies:

- Current C1-B implementation and focused tests.

Recommended reasoning level:

- Low to Medium.

### Option D: True-Value Salary Model

Value:

- Moves D2 ratings/salary closer to the full offseason economy model.

Risk:

- Medium to High. Salary changes can affect multiple offseason systems and future roster decisions.

Dependencies:

- Existing D2 adapter and confirmation UI.
- Additional design for true-value/50% delta economics.

Recommended reasoning level:

- High.

### Option E: Mutation-Capable Free Agency/Draft/Trade Design

Value:

- Advances major offseason execution systems beyond preview-only status.

Risk:

- High. These systems affect roster counts, farm state, transactions, Phase 11 lock, and save lifecycle.

Dependencies:

- Existing D4/D5/D6 previews.
- Phase 11 correction primitives.
- Likely additional design before implementation.

Recommended reasoning level:

- Extra High.

## 9. Final Recommendation

Recommended next wave: **C2 ceremony preview UI, no writes**.

Why:

- C1-B is now safe as a pure planner/roller.
- The next useful step is to validate how the ceremony feels in RetirementFlow before adding mutation or persistence.
- A no-write preview keeps the ceremony distinct from R1/R2 selected-player apply and avoids expanding the mutation surface too quickly.

Keep deferred:

- R1 apply from ceremony.
- Ceremony persistence.
- Reroll UI.
- Jersey retirement.
- Narrative/news/milestones.
- Replacement-player systems.
- Free-agency, draft, and trade execution.

## Exact Next Prompt

Recommended reasoning: High

Please implement C2: franchise retirement ceremony preview UI, no writes.

Scope:
- Implement UI/tests only.
- Do not add persistence.
- Do not call R1 apply.
- Do not retire players.
- Do not write player, farm, transaction, offseason, League Builder, prototype, localStorage, or IndexedDB records.
- Do not add reroll UI.
- Do not implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, or trade execution.

Use:
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C1B_RETIREMENT_CEREMONY_PLANNER_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_CEREMONY_C0_DECISIONS.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_CEREMONY_DESIGN.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementCeremony.ts`
- `/Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/RetirementFlow.tsx`
- `/Users/johnkruse/Projects/kbl-tracker/src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
- `/Users/johnkruse/Projects/kbl-tracker/src/utils/tests/franchiseRetirementCeremony.test.ts`

Goals:
1. Add a franchise-only ceremony preview section to RetirementFlow.
2. Mount it only after canonical franchise identity is valid.
3. Use C1-B `buildFranchiseRetirementCeremonyPlan(...)` and `revealFranchiseRetirementForTeam(...)`.
4. Show method/version `franchise-retirement-ceremony-v1-reverse-age-roll`.
5. Render candidate probabilities, no-retirement bucket information, reveal index, candidate-pool hash, seed hash, roll, outcome, issues, warnings, and limitations.
6. Allow one deterministic reveal per team in local UI state only.
7. Stage ceremony results locally as suggestions only.
8. Allow removing staged ceremony suggestions locally.
9. Clearly state that no retirements are applied, no transactions are written, no ceremony result is persisted, and R1 apply is not called.
10. Keep the existing D3 preview and R2 selected-player apply behavior unchanged.
11. Do not expose apply/confirm/retire buttons from the ceremony preview.
12. Preserve non-franchise/prototype retirement behavior where intended.

Tests:
- Franchise ceremony preview renders only with valid canonical identity.
- Damaged identity blocks ceremony planner calls and does not fall back to prototype behavior.
- Candidate table, no-retirement bucket, hashes, roll, outcome, warnings, and limitations render.
- Reveal action uses C1-B and stages local suggestions only.
- Invalid reveal output is displayed as non-actionable.
- Removing staged suggestions is local only.
- No R1 apply calls.
- No player/farm/transaction/offseason/League Builder/prototype writes.
- Existing R2 preview/selection/confirmation tests still pass.

Run:
- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
- `npm test -- src/utils/tests/franchiseRetirementCeremony.test.ts`
- `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts`

Output:
- Findings/notes from implementation.
- Tests run.
- Confirm whether C2 ceremony preview UI is safe.
