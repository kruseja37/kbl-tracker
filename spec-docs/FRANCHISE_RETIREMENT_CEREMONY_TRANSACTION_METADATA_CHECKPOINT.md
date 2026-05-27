# Franchise Retirement Ceremony Transaction Metadata Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. No app code, UI, tests, persistence, reroll, jersey retirement, narrative/news, milestones, replacement systems, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations are included in this checkpoint.

Primary references:

- `spec-docs/FRANCHISE_RETIREMENT_CEREMONY_FARM_LOADING_CHECKPOINT.md`
- `spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_CONFIRMATION_CHECKPOINT.md`
- `spec-docs/FRANCHISE_C1B_RETIREMENT_CEREMONY_PLANNER_CHECKPOINT.md`
- `src/utils/franchiseRetirementAdapter.ts`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/utils/franchiseRetirementCeremony.ts`
- `src/utils/tests/franchiseRetirementAdapter.test.ts`
- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`

## 1. Executive Summary

Retirement ceremony provenance is now carried into canonical retirement transactions when a ceremony suggestion is adopted and then explicitly confirmed through the selected-player retirement flow.

Manual retirements remain supported and distinct. Manual applies record `selectedSource: "manual"` and do not attach ceremony provenance. Ceremony-selected applies record `selectedSource: "ceremony"` and include sanitized ceremony provenance in the transaction payload.

No separate ceremony result persistence was added. The ceremony reveal remains a no-write preview, and provenance is durable only as part of the existing retirement transaction created by R1 apply.

## 2. Completed Scope

Completed:

- Added optional ceremony provenance input to R1 retirement apply.
- `RetirementFlow` creates local ceremony metadata only after `Use ceremony suggestion`.
- Reveal alone does not create apply provenance and does not write anything.
- R1 apply sanitizes ceremony provenance before adding it to the transaction payload.
- Manual retirement transactions carry `selectedSource: "manual"`.
- Ceremony-selected retirement transactions carry `selectedSource: "ceremony"`.
- Manual selected-player confirmation remains separate from ceremony suggestion adoption.
- Existing R1 eligibility, FARM proof, transaction logging, and compensating rollback semantics are preserved.

Not included:

- Separate ceremony result persistence.
- Reroll support.
- Jersey retirement execution.
- Narrative/news/milestone effects.
- Replacement-player systems.
- Free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.

## 3. Provenance Fields

Ceremony-selected retirement transaction provenance includes:

- Ceremony method/version: `franchise-retirement-ceremony-v1-reverse-age-roll`.
- Outcome type.
- Reveal index.
- Seed namespace.
- Candidate-pool hash.
- Seed hash.
- Reveal roll.
- Reveal bucket type.
- Reveal bucket player id.
- Selected retiree probability.
- Selected player ids.
- Selected source: `ceremony`.
- Limitations explaining that ceremony provenance is transaction metadata only and not persisted ceremony state.

Manual transaction payloads do not include ceremony provenance. They remain explicit through:

- `selectedSource: "manual"`.
- R1 apply method/version: `franchise-retirement-v1-selected-player-apply`.

## 4. Validation Rules

Ceremony provenance must pass all of the following checks before any player, farm, or transaction writes occur:

- Method/version must equal `franchise-retirement-ceremony-v1-reverse-age-roll`.
- Outcome type must be `retiree`.
- Reveal bucket type must be `retiree`.
- Reveal bucket player id must be present.
- Reveal bucket player id must match the single selected apply player.
- Ceremony selected player ids must contain exactly one id.
- Ceremony selected player id must match the explicit selected apply player.
- Reveal index, seed namespace, candidate-pool hash, seed hash, roll, and reveal bucket type remain required.
- Roll must be finite and within `0..100`.
- Candidate probability must be null/undefined or finite and within `0..100`.
- Malformed, contradictory, or mismatched provenance fails with structured retirement ceremony metadata issues before writes.

This validation prevents provenance from overriding selected player ids. R1 still revalidates the selected player through franchise-owned player scope, MLB/FARM eligibility, FARM record requirements, and canonical stats-scope checks.

## 5. Safety Boundaries

Stable safety boundaries:

- Metadata cannot override selected player ids.
- Metadata does not alter player eligibility.
- Metadata does not alter FARM proof requirements.
- Metadata does not alter transaction rollback behavior.
- Ceremony reveal remains no-write.
- `Use ceremony suggestion` only moves local ceremony-selected id and metadata into the existing selected-player confirmation flow.
- Final mutation still requires explicit R2 confirmation and R1 apply.
- No separate ceremony persistence exists.
- No reroll exists.
- No jersey retirement, narrative/news, milestone, or replacement effects are active.
- No League Builder, global template, or prototype writes are introduced.

The transaction payload is the only durable place where ceremony provenance is currently recorded.

## 6. Tests And Confidence

Focused tests passed during review:

- Retirement adapter tests: 37 passed.
- Franchise offseason component guard tests: 24 passed.
- Retirement ceremony tests: 29 passed.

Covered cases include:

- Manual transaction provenance remains manual and has no ceremony provenance.
- Ceremony-selected transaction provenance is written with sanitized ceremony fields.
- Mismatched ceremony selected player fails before writes.
- Malformed ceremony metadata fails before writes.
- Wrong method/version is rejected.
- `no_retirement` bucket metadata is rejected.
- Missing reveal bucket player is rejected.
- Roll lower than `0` or greater than `100` is rejected.
- Candidate probability lower than `0` or greater than `100` is rejected.
- UI passes ceremony metadata only after `Use ceremony suggestion`.
- Reveal-only path does not apply, does not write, and does not send ceremony provenance to R1.

## 7. Remaining Deferred Work

Deferred:

- Ceremony result persistence.
- Reroll design.
- Jersey retirement.
- Narrative/news/milestones.
- Replacement player systems.
- Free agency execution.
- Draft execution.
- Trade execution.
- Generated filler pools.
- Import writes.
- Roster analyzer mutations.
- Full ceremony history/almanac integration.

## 8. Recommended Next Wave Analysis

### Full-suite stabilization after metadata enrichment

Value: Confirms the metadata enrichment did not introduce broader regressions beyond the focused suites.

Risk: Low. This is verification only.

Dependencies: Current focused tests are green.

Recommended reasoning level: Medium.

### Ceremony result persistence design

Value: Defines whether ceremony reveals should become durable history before or separate from retirement transactions.

Risk: High. Persistence introduces identity, replay, export/import/delete, save-slot manifest, and duplicate-reveal concerns.

Dependencies: Current transaction metadata boundary, transition/save-slot rules, and a decision on reroll policy.

Recommended reasoning level: Extra High.

### Reroll design

Value: Clarifies whether users can reroll ceremony outcomes and how rerolls are audited.

Risk: High. Reroll semantics affect fairness, determinism, seed/reveal indexing, and any future ceremony persistence.

Dependencies: C1-B deterministic reveal contract and a policy decision on whether rerolls are allowed in franchise history.

Recommended reasoning level: High.

### Jersey/narrative/milestone layers

Value: Adds flavor and historical payoff after retirements.

Risk: High. These systems touch derived/flavor persistence, historical summaries, and story/almanac scope.

Dependencies: Durable retirement transactions, narrative scope rules, milestone/career scoping decisions, and likely ceremony persistence design.

Recommended reasoning level: High to Extra High.

### True-value salary model

Value: Moves D2 salary recalculation closer to the OFFSEASON spec's fuller economic model.

Risk: Medium to High. Salary changes affect offseason economics and future free agency/trade balancing.

Dependencies: Current D2 grade/salary-only adapter, existing salary utilities, and a clear true-value ledger design.

Recommended reasoning level: High.

### Mutation-capable FA/draft/trade design

Value: Advances major offseason execution depth beyond read-only previews.

Risk: Extra High. These systems mutate roster/player/farm/transaction state and depend on replacement, roster lock, and save lifecycle boundaries.

Dependencies: Existing D4/D5/D6 dry-run adapters, Phase 11 correction primitives, transaction/rollback conventions, and possibly generated filler or player pool decisions.

Recommended reasoning level: Extra High.

## 9. Final Recommendation

Recommended next wave: full-suite stabilization after retirement ceremony transaction metadata enrichment.

Reasoning: the metadata enrichment is narrow and focused tests are green, but it touched the R1 retirement transaction payload and `RetirementFlow` confirmation bridge. A full-suite/build checkpoint is the cheapest confidence step before moving into higher-risk ceremony persistence, reroll, flavor layers, salary economics, or mutation-capable offseason systems.

Keep deferred:

- Ceremony result persistence.
- Reroll.
- Jersey retirement.
- Narrative/news/milestones.
- Replacement player systems.
- Free agency, draft, and trade execution.
- Generated filler.
- Import writes.
- Roster analyzer mutations.

Exact next prompt:

```text
Recommended reasoning: Medium

Please run a stabilization checkpoint after retirement ceremony transaction metadata enrichment.

Do not implement app code unless a direct test/build blocker requires explicit approval.
Do not add UI.
Do not add persistence.
Do not add reroll.
Do not implement jersey retirement, narrative/news/milestones, replacement systems, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_CEREMONY_TRANSACTION_METADATA_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementAdapter.ts
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/RetirementFlow.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementCeremony.ts

Run:
- npm test -- --reporter=dot
- npm run build

Output:
- Findings first if any failures or regressions appear.
- Confirmed-good notes.
- Tests/build run and results.
- Finish with: "Retirement ceremony metadata stabilization safe?" yes/no.
- If safe, recommend whether to create a stabilization checkpoint doc or proceed to the next design wave.
```
