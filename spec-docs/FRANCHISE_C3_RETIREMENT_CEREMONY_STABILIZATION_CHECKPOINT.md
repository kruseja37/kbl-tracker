# Franchise C3 Retirement Ceremony Stabilization Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add UI, add tests, add persistence, implement reroll, jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.

Primary references:

- `spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_CONFIRMATION_CHECKPOINT.md`
- `spec-docs/FRANCHISE_C2_RETIREMENT_CEREMONY_PREVIEW_UI_CHECKPOINT.md`
- `spec-docs/FRANCHISE_C1B_RETIREMENT_CEREMONY_PLANNER_CHECKPOINT.md`
- `spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md`
- `spec-docs/FRANCHISE_R1_RETIREMENT_EXECUTION_CORE_CHECKPOINT.md`

## 1. Executive Summary

Full-suite stabilization after C3 retirement ceremony confirmation integration is complete.

Current state:

- Full Vitest suite passed after C3.
- Build passed after C3.
- No code or test fixes were required.
- C3 ceremony-to-confirmation integration is stable enough to build on.

C3 is now a verified stable point for the retirement ceremony stack: C1-B pure planner, C2 no-write preview, C3 confirmation bridge, R2 selected-player confirmation UI, and R1 selected-player execution core.

## 2. Verification Results

Verification commands:

```text
npm test -- --reporter=dot
```

Result:

```text
314 test files passed
6531 tests passed
```

Build command:

```text
npm run build
```

Result:

```text
passed
```

No app code, test code, or stabilization fixes were made during this checkpoint.

## 3. Stabilized Scope

The following retirement ceremony and retirement execution layers are now stabilized together:

- C1-B pure single-reveal ceremony planner.
- C2 no-write ceremony preview UI.
- C3 ceremony suggestion into R2 confirmation.
- R2 selected-player confirmation UI.
- R1 retirement execution core.

Stabilized behavior:

- Ceremony candidate/probability planning is pure.
- Ceremony reveal is deterministic and no-write.
- Ceremony reveal can locally stage one valid retiree suggestion.
- No-retirement and invalid ceremony outcomes remain non-actionable.
- `Use ceremony suggestion` only moves the staged ID into R2 confirmation state.
- Final mutation still requires explicit selected-player confirmation.
- R1 remains the only retirement mutation path.
- Successful R1 apply refreshes preview state and clears local ceremony staging.

## 4. Known Non-Blocking Noise

Known non-blocking verification noise:

- React `act(...)` warnings in existing `EnrichmentPanel` tests.
- Expected negative-path stderr from sync, ledger, and end-game tests.
- Existing Vite chunk-size warnings for large bundles.

These warnings are tracked as test/build noise and do not block continued franchise retirement/offseason work.

## 5. Stable Boundaries To Preserve

Stable boundaries after C3:

- Ceremony reveal remains no-write.
- Ceremony results are not persisted.
- R1 apply happens only after explicit R2 confirmation.
- No reroll.
- No jersey retirement effects.
- No narrative/news effects.
- No milestone effects.
- No replacement-player effects.
- No free-agency execution.
- No draft execution.
- No trade execution.
- No generated filler systems.
- No import writes.
- No roster analyzer mutations.
- No fabricated FARM proof.
- No prototype/global hooks or writers in healthy franchise context.

Future waves should preserve these boundaries unless a new design explicitly changes them.

## 6. Recommended Next Wave Analysis

### Option A: Scoped Farm-Record Loading For FARM Ceremony Candidates

Value:

- Allows FARM players to participate in the ceremony when real franchise-owned farm proof exists.
- Closes the current safe limitation where FARM candidates are excluded unless real farm records are supplied.
- Improves parity between C1-B eligibility and the RetirementFlow ceremony surface.

Risk:

- Medium. The implementation must read actual franchise-owned farm records only and avoid League Builder/global/prototype fallback.

Dependencies:

- C1-B ceremony FARM eligibility contract.
- C2/C3 RetirementFlow ceremony surface.
- Existing `franchiseFarmStorage` or a read-only adapter extension.
- Tests proving no fabricated farm proof.

Recommended reasoning level:

- High.

### Option B: Ceremony Persistence Design

Value:

- Defines durable staged/applied/abandoned ceremony history.
- Enables recovery, audit, future reroll policy, and season-summary references.

Risk:

- High. Adds a durable domain requiring manifest/export/delete/backup/sync handling and repair behavior.

Dependencies:

- C3 confirmation bridge.
- Storage architecture decision.
- Manifest lifecycle design.
- Transaction/ceremony identity decisions.

Recommended reasoning level:

- Extra High.

### Option C: Transaction Metadata Enrichment

Value:

- Records ceremony method, reveal index, roll, bucket, candidate-pool hash, seed hash, and selected-by-ceremony context on applied retirement transactions.
- Improves auditability without necessarily persisting full ceremony result records.

Risk:

- Medium. Must extend R1 apply input and transaction payload without breaking manual selected-player apply.

Dependencies:

- C3 bridge.
- Decision on how UI passes ceremony metadata to R1.
- Tests proving manual apply remains unchanged.

Recommended reasoning level:

- High.

### Option D: Reroll Design

Value:

- Defines if and how users can reroll retirement ceremony outcomes.
- Clarifies audit expectations before any reroll UI exists.

Risk:

- Medium to High. Reroll can undermine deterministic ceremony auditability if not designed carefully.

Dependencies:

- Decision on non-persistent vs persistent ceremony results.
- Seed namespace and reveal-index policy.
- Likely transaction/persistence metadata decisions.

Recommended reasoning level:

- High.

### Option E: Jersey/Narrative/Milestone Layers

Value:

- Moves retirements closer to the full OFFSEASON spec ceremony experience.
- Adds historical flavor and post-retirement presentation.

Risk:

- High. These layers touch derived/flavor systems, historical records, and season-summary fidelity.

Dependencies:

- Ceremony result or transaction metadata decisions.
- Narrative/news/milestone scoping and storage boundaries.
- Clear distinction between durable history and flavor placeholders.

Recommended reasoning level:

- High to Extra High.

### Option F: True-Value Salary Model

Value:

- Advances D2 ratings/salary from grade/salary-only recalculation toward the full offseason salary model.
- Helps future free-agency and roster economics.

Risk:

- Medium to High. Salary changes can affect roster planning, free agency, and franchise financial balance.

Dependencies:

- D2 adapter and confirmation UI.
- True-value/50% delta economics design.
- Additional focused tests.

Recommended reasoning level:

- High.

### Option G: Mutation-Capable FA/Draft/Trade Design

Value:

- Moves major offseason systems beyond preview-only adapters.
- Unlocks deeper offseason progression.

Risk:

- High. These systems affect roster counts, farm state, transactions, Phase 11 lock, save lifecycle, and user-facing franchise continuity.

Dependencies:

- Existing D4/D5/D6 preview adapters.
- Phase 11 correction primitives.
- Additional design before implementation.
- Clear rollback/transaction model.

Recommended reasoning level:

- Extra High.

## 7. Final Recommendation

Recommended next wave: **scoped farm-record loading for FARM ceremony candidates**.

Why:

- It is the smallest useful enhancement after C3 stabilization.
- It preserves the no-fabricated-FARM-proof boundary while allowing real FARM ceremony participation.
- It improves the existing ceremony surface without adding persistence, reroll, metadata, or new mutation systems.
- It should be safer than jumping directly into ceremony persistence, transaction enrichment, or mutation-capable FA/draft/trade work.

Keep deferred:

- Ceremony result persistence.
- Reroll.
- Jersey retirement.
- Narrative/news/milestones.
- Replacement-player systems.
- Free-agency, draft, and trade execution.
- Generated filler.
- Import writes.
- Roster analyzer mutations.

## Exact Next Prompt

Recommended reasoning: High

Please implement scoped farm-record loading for FARM retirement ceremony candidates.

Scope:
- Implement the smallest read-only path needed for C2/C3 ceremony preview/confirmation to pass real scoped farm records into C1-B.
- Do not add ceremony result persistence.
- Do not add reroll.
- Do not change R1 adapter semantics.
- Do not implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.
- Do not read League Builder/global/prototype farm data in franchise context.
- Do not fabricate farm records from dry-run candidates.

Use:
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_STABILIZATION_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_CONFIRMATION_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C2_RETIREMENT_CEREMONY_PREVIEW_UI_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C1B_RETIREMENT_CEREMONY_PLANNER_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/RetirementFlow.tsx`
- `/Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementCeremony.ts`
- `/Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseFarmStorage.ts`
- `/Users/johnkruse/Projects/kbl-tracker/src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`

Goals:
1. Load actual franchise-owned farm records for the current `franchiseId`, `seasonId`, and `seasonNumber` in the franchise RetirementFlow path or through a small read-only adapter extension.
2. Pass those real scoped farm records into `revealFranchiseRetirementForTeam(...)`.
3. Preserve the existing no-fabrication test.
4. Add a positive FARM ceremony test proving a FARM candidate with real scoped farm proof can be eligible/staged.
5. Add a negative FARM ceremony test proving wrong-franchise, wrong-season, wrong-team, or missing farm proof does not stage a suggestion.
6. Keep ceremony reveal no-write and local-only.
7. Keep `Use ceremony suggestion` routed through existing explicit R2 confirmation.

Run:
- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
- `npm test -- src/utils/tests/franchiseRetirementCeremony.test.ts`
- `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts`

Output:
- Findings/notes from implementation.
- Tests run.
- Confirm whether scoped FARM ceremony participation is safe.
