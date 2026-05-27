# Franchise Retirement Ceremony C1 Reconciliation

Date: 2026-05-25

## Executive Summary

C1 currently implements a pure retirement ceremony planner in `src/utils/franchiseRetirementCeremony.ts`, but the implementation contract does not match the C0 decision record in `FRANCHISE_RETIREMENT_CEREMONY_C0_DECISIONS.md`.

Chosen path: **Path B: align code to the original C0 reveal contract.**

The current implementation is useful as a pure candidate/risk table, but it should not become the canonical retirement ceremony contract as-is. The C0 ceremony model is safer for user experience and roster stability because it stages at most one reveal result at a time, includes an explicit no-retirement outcome, and keeps deterministic seed/hash identity suitable for audit and later UI confirmation.

This document is a design/decision patch only. It does not implement runtime code, UI, persistence, or R1 apply calls.

## Current Contract Mismatch

| Area | Current C1 implementation | C0 decision contract | Impact |
| --- | --- | --- | --- |
| Public function | `buildFranchiseRetirementCeremonyPlan(...)` | `buildFranchiseRetirementCeremonyPlan(...)` plus `revealFranchiseRetirementForTeam(...)` | Missing the actual one-reveal ceremony primitive. |
| Method/version | `franchise-retirement-ceremony-v1-reverse-age-seeded` | `franchise-retirement-ceremony-v1-reverse-age-roll` | Persisted/visible method identity would drift immediately. |
| Roll model | Independent seeded roll for every candidate | Weighted cumulative single reveal | Current model can stage multiple retirees in one pass. |
| No-retirement result | No explicit bucket | Explicit `no_retirement` bucket | Current output cannot represent a clean ceremony reveal where nobody retires. |
| Candidate hashes | Not present | Candidate-pool hash and seed hash required | Harder to audit or reproduce a future reveal UI. |
| Reveal index | Not present | Required | Cannot support repeated deterministic reveals cleanly. |
| Staged retiree exclusion | Not present | Required | Repeated reveals could select an already staged retiree unless guarded elsewhere. |
| Required context | `franchiseId`, `seasonId`, numeric `seasonNumber`, `statsScopeId`, `seed` | Also requires `offseasonStateId`, phase `RETIREMENTS`, and `seedNamespace` | Current planner is under-scoped for durable offseason ceremony identity. |

## Decision Comparison

| Criterion | Path A: Bless current staged-suggestion planner | Path B: Align to C0 reveal contract |
| --- | --- | --- |
| User experience | Fast preview, but multiple simultaneous retirements may feel arbitrary. | Clear ceremony: reveal one result at a time, including no retirement. |
| Spec alignment | Requires revising C0 away from its explicit ceremony model. | Matches C0 and the OFFSEASON spec ceremony direction. |
| Implementation complexity | Low. Current tests already bless most behavior. | Medium. Requires reveal function, hashes, no-retirement bucket, and context validation. |
| Future R2/R1 integration | Easy to pass multiple selected IDs, but may overproduce retirements before user confirmation. | Still easy: reveal result stages selected IDs, then R2 confirmation calls R1 selected-player apply. |
| Deterministic testability | Good. Per-candidate rolls are deterministic. | Good. Seed/hash/reveal-index tests make deterministic replay more auditable. |
| Risk of over-retiring players | Higher. Independent candidate rolls can select many players from one team in one ceremony pass. | Lower. Single reveal plus no-retirement bucket limits each reveal step. |
| Ease of explaining results in UI | Medium. Explaining many independent rolls is more complex. | High. One roll lands on one candidate or no retirement. |

## Chosen Path B

C0 remains the source of truth for the retirement ceremony. The C1 code should be aligned to the original reveal contract rather than changing the contract to match the current independent-roll implementation.

Required C1 cleanup:

- Use method/version `franchise-retirement-ceremony-v1-reverse-age-roll`.
- Keep `buildFranchiseRetirementCeremonyPlan(...)` as a pure candidate/probability table builder.
- Add `revealFranchiseRetirementForTeam(...)` as the canonical ceremony reveal primitive.
- Use oldest-first reverse-age ordering with deterministic `playerId` tie-breaks.
- Keep the probability formula: `max(5, 50 - ageRank * (45 / rosterSize))`.
- Resolve a reveal through weighted cumulative selection with an explicit `no_retirement` bucket.
- Include candidate-pool hash and seed hash in output.
- Include reveal index in seed material and output.
- Exclude staged retirees from later reveal pools.
- Require canonical ceremony context:
  - `franchiseId`
  - `seasonId`
  - numeric `seasonNumber`
  - `statsScopeId === seasonId`
  - `offseasonStateId`
  - phase `RETIREMENTS`
  - `seedNamespace`
- Preserve the pure/no-write boundary:
  - no storage imports
  - no React imports
  - no transaction imports
  - no R1 adapter/apply imports
  - no persistence
  - no input mutation

The current independent per-candidate behavior may be retained only if it is renamed and documented as a non-ceremony risk/suggestion helper. It should not be the canonical ceremony reveal contract.

## Expected Output Contract

The plan output should remain suitable for previewing candidate probabilities and exclusions. The reveal output should represent one ceremony action:

- selected retiree candidate, or
- explicit `no_retirement` result.

The reveal output should be staged only. It must not retire players, mutate franchise state, write transactions, update farm records, or call R1 apply. Future UI can pass staged selected player IDs into the existing R2/R1 explicit confirmation flow.

## Test Expectations

The C1 implementation cleanup should update or add tests for:

- method/version `franchise-retirement-ceremony-v1-reverse-age-roll`
- required `offseasonStateId`
- required phase `RETIREMENTS`
- required `seedNamespace`
- `statsScopeId === seasonId`
- oldest-first ordering and `playerId` tie-breaks
- zero-based age rank and probability formula
- explicit `no_retirement` bucket
- deterministic candidate-pool hash
- deterministic seed hash
- deterministic reveal index behavior
- staged retiree exclusion
- eligible MLB candidates
- eligible FARM candidates only with matching scoped farm record
- excluded statuses: `FREE_AGENT`, `UNASSIGNED`, `RELEASED`, `RETIRED`, `INACTIVE`, damaged/unknown
- input immutability
- module purity/no forbidden imports
- no R1 apply call

Existing tests that assert `selectedPlayerIds` equals all candidates whose independent rolls fall within probability should be replaced or reframed. Selection should come from the reveal primitive, not from independent per-candidate plan rolls.

## Boundaries Preserved

This reconciliation does not approve:

- UI changes
- persistence
- transaction writes
- calls to R1 apply
- automatic retirement execution
- reroll workflows
- jersey retirement
- narrative/news/milestone effects
- replacement-player systems
- free agency, draft, or trade execution

## Exact Next Prompt

Recommended reasoning: Medium

Please implement the C1 retirement ceremony contract cleanup.

Scope:
- Implement code and tests only for the pure retirement ceremony planner/roller.
- Do not add UI.
- Do not add persistence.
- Do not call R1 apply.
- Do not write player, farm, transaction, offseason, League Builder, or prototype records.
- Do not implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, or trade execution.

Use:
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_CEREMONY_C0_DECISIONS.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_CEREMONY_DESIGN.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_CEREMONY_C1_RECONCILIATION.md`
- `/Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementCeremony.ts`
- `/Users/johnkruse/Projects/kbl-tracker/src/utils/tests/franchiseRetirementCeremony.test.ts`

Implement:
1. Align method/version to `franchise-retirement-ceremony-v1-reverse-age-roll`.
2. Require canonical ceremony context:
   - `franchiseId`
   - `seasonId`
   - numeric `seasonNumber`
   - `statsScopeId === seasonId`
   - `offseasonStateId`
   - phase `RETIREMENTS`
   - `seedNamespace`
3. Keep `buildFranchiseRetirementCeremonyPlan(...)` pure as the candidate/probability table builder.
4. Add `revealFranchiseRetirementForTeam(...)`.
5. Use weighted cumulative single reveal with an explicit `no_retirement` bucket.
6. Include candidate-pool hash, seed hash, reveal index, and staged retiree exclusion.
7. Preserve eligibility:
   - MLB eligible
   - FARM eligible only with matching scoped farm record
   - FREE_AGENT, UNASSIGNED, RELEASED, RETIRED, INACTIVE, damaged/unknown excluded
8. Preserve pure/no-side-effect boundaries:
   - no storage imports
   - no React imports
   - no transaction imports
   - no R1 adapter/apply imports
   - no input mutation

Tests:
- Update `franchiseRetirementCeremony.test.ts` to prove deterministic reveal behavior, no-retirement bucket, candidate-pool hash, seed hash, reveal index, staged retiree exclusion, invalid context rejection, eligibility/exclusions, no input mutation, and forbidden-import boundaries.
- Run:
  - `npm test -- src/utils/tests/franchiseRetirementCeremony.test.ts`
  - `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts`

Output:
- Findings/notes from implementation.
- Tests run.
- Confirm whether C1 ceremony contract is now reconciled.
