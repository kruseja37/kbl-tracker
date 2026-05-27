# Franchise Retirement Ceremony FARM Loading Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add UI, add tests, add persistence, implement reroll, change R1 apply semantics, implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.

Primary references:

- `spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_STABILIZATION_CHECKPOINT.md`
- `spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_CONFIRMATION_CHECKPOINT.md`
- `spec-docs/FRANCHISE_C2_RETIREMENT_CEREMONY_PREVIEW_UI_CHECKPOINT.md`
- `spec-docs/FRANCHISE_C1B_RETIREMENT_CEREMONY_PLANNER_CHECKPOINT.md`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/utils/franchiseRetirementCeremony.ts`
- `src/utils/franchiseFarmStorage.ts`
- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`

## 1. Executive Summary

Scoped FARM proof loading is implemented for the retirement ceremony preview.

Current state:

- Franchise `RetirementFlow` loads actual scoped franchise farm records for retirement ceremony eligibility.
- FARM candidates can participate only with actual scoped franchise farm records.
- Candidate-derived/fabricated farm proof remains removed.
- No writes, persistence, or R1 apply semantic changes were introduced.

This closes the safe limitation from C2/C3 where FARM candidates could not participate unless proof was supplied. The ceremony still preserves the no-write reveal boundary and the explicit R2/R1 confirmation boundary.

## 2. Completed Scope

Completed in `src/src_figma/app/components/RetirementFlow.tsx`:

- `RetirementFlow` reads farm proof through:

```ts
getFranchiseFarmRecordsForSeason(franchiseId, seasonId)
```

- Farm proof is loaded only in valid franchise RetirementFlow context.
- Ceremony reveal passes actual loaded farm records into C1-B.
- Candidate-derived/fabricated farm proof remains removed.
- Farm-load failure surfaces `FARM_RECORD_LOAD_FAILED`.
- Farm-load failure uses empty proof and remains non-mutating.
- Invalid canonical identity blocks dry-run, ceremony, and farm-record loading.

No changes were made to R1 apply semantics.

## 3. FARM Eligibility Boundary

C1-B still requires a matching scoped farm record before a FARM player can participate in the ceremony.

Required farm-record match:

- `franchiseId`
- `seasonId`
- numeric `seasonNumber`
- `teamId`
- `playerId`
- `rosterStatus: FARM`

Behavior:

- FARM without proof remains excluded/reported.
- FARM with proof can participate.
- Wrong-scope farm records do not prove eligibility.
- Season-wide farm loading is safe because C1-B filters the records by franchise, season, team, player, season number, and status.

This preserves the no-fabricated-FARM-proof boundary while allowing valid farm players to enter the ceremony when real storage-backed proof exists.

## 4. Safety Boundaries

Stable safety boundaries:

- No League Builder/global/prototype farm reads.
- No player writes.
- No farm writes.
- No transaction writes.
- No offseason writes.
- No ceremony-result persistence.
- No R1 apply during reveal.
- No reroll.
- No jersey retirement effects.
- No narrative/news effects.
- No milestone effects.
- No replacement-player effects.
- No free-agency, draft, or trade execution.

The farm-record read is read-only and scoped to the current franchise season.

## 5. UI Behavior

UI behavior after scoped FARM loading:

- MLB ceremony reveal is unchanged.
- FARM ceremony reveal can now work when proof exists.
- No-retirement reveal is unchanged.
- Invalid reveal behavior is unchanged.
- Use-suggestion behavior is unchanged.
- R2 confirmation behavior is unchanged.
- R1 apply behavior is unchanged.

Non-blocking polish:

- Reveal can currently be clicked before farm proof finishes loading.
- This is safe because empty proof excludes FARM candidates and stages nothing for them.
- A future UI polish wave could disable reveal while farm proof is loading to reduce confusion.

## 6. Tests And Confidence

Focused verification at FARM-loading closeout:

- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
  - Result: 24 tests passed.
- `npm test -- src/utils/tests/franchiseRetirementCeremony.test.ts`
  - Result: 29 tests passed.
- `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts`
  - Result: 26 tests passed.

Covered cases:

- Scoped farm read is called in valid franchise context.
- No farm read happens on invalid franchise identity.
- Valid FARM candidate with real scoped proof can participate.
- Missing FARM proof stages nothing.
- Farm-load failure surfaces `FARM_RECORD_LOAD_FAILED`.
- Farm-load failure does not fabricate proof.
- Ceremony reveal remains no-write.
- Use-suggestion remains routed through existing explicit R2 confirmation.
- No player/farm/transaction/offseason writes occur during reveal.
- No prototype/global hooks or writers are called in franchise context.

Confidence:

- Scoped FARM ceremony participation is safe.
- FARM participation remains scoped and proof-based.
- The C3 ceremony-to-confirmation bridge remains stable.

## 7. Remaining Deferred Work

Deferred after FARM-loading:

- Farm-proof loading-state polish.
- Ceremony result persistence.
- Transaction metadata enrichment.
- Reroll design.
- Jersey retirement.
- Narrative/news effects.
- Milestone effects.
- Replacement-player systems.
- Free-agency execution.
- Draft execution.
- Trade execution.
- Generated filler players.
- Import writes.
- Roster analyzer mutations.

## 8. Recommended Next Wave Analysis

### Option A: Transaction Metadata Enrichment

Value:

- Records ceremony method, reveal index, roll, bucket, candidate-pool hash, seed hash, and selected-by-ceremony context on applied retirement transactions.
- Improves auditability and future season-summary/history fidelity without requiring full ceremony-result persistence.
- Distinguishes manual selected-player retirements from ceremony-selected retirements.

Risk:

- Medium. R1 apply input and transaction payload must expand without breaking manual selected-player apply.

Dependencies:

- C3 confirmation bridge.
- C1-B reveal metadata.
- Existing R1 transaction logging.
- Tests proving manual apply remains unchanged.

Recommended reasoning level:

- High.

### Option B: Ceremony Persistence Design

Value:

- Defines durable staged/applied/abandoned ceremony history.
- Enables recovery, audit, future reroll policy, and season-summary references.

Risk:

- High. Adds a durable domain requiring manifest/export/delete/backup/sync handling and repair behavior.

Dependencies:

- C3 bridge.
- Storage architecture decision.
- Manifest lifecycle design.
- Transaction/ceremony identity decisions.

Recommended reasoning level:

- Extra High.

### Option C: Farm-Proof Loading-State Polish

Value:

- Prevents users from revealing before FARM proof finishes loading.
- Improves clarity when farm proof is still pending or has failed.

Risk:

- Low. UI-only polish if it stays read-only and does not change ceremony semantics.

Dependencies:

- Current scoped farm loading state.
- Component tests for disabled reveal while loading.

Recommended reasoning level:

- Medium.

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

## 9. Final Recommendation

Recommended next wave: **transaction metadata enrichment**.

Why:

- The ceremony can now select MLB or properly scoped FARM retirees and route them through R2/R1.
- Applied retirements should next carry enough metadata to show whether they were manually selected or ceremony-selected.
- This improves auditability without the complexity of full ceremony persistence.
- It creates a cleaner foundation for later ceremony persistence, reroll policy, season summary references, and narrative/history layers.

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

Please implement retirement ceremony transaction metadata enrichment.

Scope:
- Add metadata plumbing only from C3 ceremony-selected confirmation into R1 retirement transaction payloads.
- Preserve manual selected-player retirement behavior.
- Do not add ceremony result persistence.
- Do not add reroll.
- Do not change R1 retirement eligibility or mutation semantics.
- Do not implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.

Use:
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_RETIREMENT_CEREMONY_FARM_LOADING_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_CONFIRMATION_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C1B_RETIREMENT_CEREMONY_PLANNER_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/RetirementFlow.tsx`
- `/Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementCeremony.ts`
- `/Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementAdapter.ts`
- `/Users/johnkruse/Projects/kbl-tracker/src/utils/tests/franchiseRetirementAdapter.test.ts`
- `/Users/johnkruse/Projects/kbl-tracker/src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`

Goals:
1. Extend R1 retirement apply input to optionally accept ceremony metadata.
2. Include ceremony metadata in retirement transaction `data` only when apply is ceremony-selected:
   - ceremony method/version
   - reveal index
   - roll
   - reveal bucket type
   - candidate-pool hash
   - seed hash
   - selected-by-ceremony flag
3. Preserve manual selected-player apply with no ceremony metadata.
4. Ensure R1 still revalidates all selected player IDs before writes.
5. Keep rollback behavior unchanged.
6. Keep CeremonyFlow/RetirementFlow from direct writes.

Tests:
- Manual selected-player apply transaction has no ceremony metadata.
- Ceremony-selected apply transaction includes metadata.
- Ceremony-selected apply still uses canonical context.
- Invalid/no-retirement ceremony outputs cannot pass metadata into apply.
- Rollback/failure paths still surface structured details.
- No additional prototype/global writes.

Run:
- `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts`
- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
- `npm test -- src/utils/tests/franchiseRetirementCeremony.test.ts`

Output:
- Findings/notes from implementation.
- Tests run.
- Confirm whether ceremony transaction metadata enrichment is safe.
