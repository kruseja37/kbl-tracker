# Franchise C3 Retirement Ceremony Confirmation Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add UI, add tests, add persistence, implement reroll, implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.

Primary references:

- `spec-docs/FRANCHISE_C2_RETIREMENT_CEREMONY_PREVIEW_UI_CHECKPOINT.md`
- `spec-docs/FRANCHISE_C1B_RETIREMENT_CEREMONY_PLANNER_CHECKPOINT.md`
- `spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md`
- `spec-docs/FRANCHISE_R1_RETIREMENT_EXECUTION_CORE_CHECKPOINT.md`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/utils/franchiseRetirementCeremony.ts`
- `src/utils/franchiseRetirementAdapter.ts`
- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`

## 1. Executive Summary

C3 retirement ceremony confirmation integration is implemented.

Current state:

- C3 connects valid ceremony-staged retirees to the existing R2 selected-player confirmation flow.
- Ceremony reveal remains no-write.
- The `Use ceremony suggestion` action does not apply retirements.
- Final mutation still requires explicit R2 confirmation and R1 selected-player apply.
- No ceremony-result persistence, reroll, jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations are implemented.

C3 completes the first safe ceremony-to-execution bridge while preserving the R1/R2 mutation boundary.

## 2. Completed Scope

Completed in `src/src_figma/app/components/RetirementFlow.tsx`:

- `Use ceremony suggestion` action.
- Valid retiree ceremony outcome can move into the existing selected-player confirmation state.
- Invalid ceremony outcome remains non-actionable.
- `no_retirement` ceremony outcome remains non-actionable.
- Local staged suggestion can be dismissed before use.
- Dismissal removes the staged ceremony ID from local staging and from selected-player state if it had been moved there.
- Successful R1 apply refreshes the dry-run preview.
- Successful R1 apply clears ceremony reveal/staging state through the existing refresh/reset path.
- Manual R2 selected-player selection path is preserved.

Important behavior:

- Ceremony reveal locally stages only `selectedPlayerIds` returned by a valid retiree outcome.
- `Use ceremony suggestion` copies only the ceremony-staged ID set into R2 selected-player state.
- `Use ceremony suggestion` opens the existing confirmation panel.
- The user must still explicitly click `Apply selected retirements` before R1 apply is called.

## 3. Ceremony-To-Apply Boundary

C3 boundary model:

- Reveal does not apply.
- Use suggestion does not apply.
- Confirmation is still required.
- R1 adapter remains the only mutation path.
- RetirementFlow does not directly write player, farm, transaction, offseason, localStorage, IndexedDB, League Builder, or prototype records.

Canonical R1 apply context remains:

- `franchiseId`
- `seasonId`
- numeric `seasonNumber`
- `statsScopeId: seasonId`
- `offseasonStateId: offseason-${seasonId}`
- phase `RETIREMENTS`

Final apply still calls:

```ts
runFranchiseRetirementDryRun(
  {
    franchiseId,
    seasonId,
    statsScopeId: seasonId,
    seasonNumber,
    offseasonStateId: `offseason-${seasonId}`,
    phase: "RETIREMENTS",
    dryRun: false,
  },
  { apply: true, playerIds },
)
```

R1 still revalidates selected players before writes. R1 remains responsible for player mutation, FARM cleanup, transaction logging, and compensating rollback.

## 4. Safety Boundaries

C3 safety boundaries:

- No direct UI player writes.
- No direct UI farm writes.
- No direct UI transaction writes.
- No direct UI offseason writes.
- No persistence of ceremony reveal results.
- No reroll.
- No auto-advance.
- No prototype/global hooks or writers in healthy franchise context.
- No fabricated FARM proof.
- No arbitrary non-ceremony additions through the ceremony path.
- No auto-select-all.
- No jersey retirement effects.
- No narrative/news effects.
- No milestone effects.
- No replacement-player effects.

Override/deferred boundary:

- User may remove/dismiss a ceremony-selected retiree before use.
- Ceremony path does not allow adding non-ceremony players.
- Manual R2 selected-player selection remains a separate path.
- FARM ceremony participation still requires real scoped farm records and is not faked by the UI.

## 5. Tests And Confidence

Focused verification at C3 closeout:

- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
  - Result: 22 tests passed.
- `npm test -- src/utils/tests/franchiseRetirementCeremony.test.ts`
  - Result: 29 tests passed.
- `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts`
  - Result: 26 tests passed.

Covered component cases:

- No apply on ceremony reveal.
- Use suggestion routes to existing confirmation flow.
- Confirmed apply uses the ceremony-selected ID.
- Confirmed apply uses canonical franchise context.
- Invalid ceremony output has no action.
- No-retirement ceremony output has no action.
- Dismiss prevents staged suggestion use.
- Manual R2 selection still works.
- Success refreshes preview state.
- Success clears ceremony staging.
- No prototype/global hooks or writers in franchise context.
- No direct League Builder/global/prototype retirement writes.
- FARM proof is not fabricated.

Covered lower-level cases remain green:

- C1-B deterministic reveal.
- C1-B invalid output is non-actionable.
- C1-B FARM eligibility requires scoped farm proof.
- R1 selected-player apply revalidates before writes.
- R1 transaction identity and rollback behavior remain unchanged.

Confidence:

- C3 ceremony confirmation integration is safe as a narrow bridge into the existing R2/R1 selected-player apply path.
- C3 is not a persisted ceremony system.
- C3 is not a reroll, jersey, narrative, milestone, or replacement-player system.

## 6. Remaining Deferred Work

Deferred after C3:

- Ceremony result persistence.
- Transaction metadata enrichment.
- Reroll design.
- Real scoped farm-record loading for FARM ceremony candidates.
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

## 7. Recommended Next Wave Analysis

### Option A: Full-Suite/Build Stabilization After C3

Value:

- Confirms the now-connected ceremony-to-apply path did not destabilize broader franchise/offseason behavior.
- Creates a clean checkpoint before adding persistence, metadata, or more mutation-capable systems.
- Lowers risk before expanding retirement ceremony scope.

Risk:

- Low. Verification only.

Dependencies:

- Current C1-B/C2/C3 implementation.
- Existing full Vitest suite and build commands.

Recommended reasoning level:

- Medium.

### Option B: Transaction Metadata Enrichment

Value:

- Lets applied retirements record ceremony method, reveal index, roll value, candidate-pool hash, seed hash, and selected-by-ceremony context.
- Improves auditability and future season-summary/history fidelity.

Risk:

- Medium. Requires extending R1 apply input/transaction payload without breaking manual selected-player retirement.

Dependencies:

- C3 bridge.
- A small transaction metadata design to distinguish manual selected-player apply from ceremony-selected apply.

Recommended reasoning level:

- High.

### Option C: Ceremony Result Persistence Design

Value:

- Enables durable staged/applied/abandoned ceremony history.
- Creates a foundation for recovery, audit, future reroll rules, and season-summary references.

Risk:

- High. Adds a new durable domain that needs manifest/export/delete/backup/sync handling and repair behavior.

Dependencies:

- C3 bridge.
- Storage architecture and manifest design.
- Decision on staged vs applied vs abandoned lifecycle.

Recommended reasoning level:

- Extra High.

### Option D: Real Scoped Farm-Record Loading For FARM Ceremony Candidates

Value:

- Allows FARM players to participate in the ceremony when real franchise-owned farm proof exists.
- Removes current limitation where C2/C3 cannot safely pass farm records from UI-derived candidate data.

Risk:

- Medium. Must source records from franchise-owned farm storage only and avoid League Builder/global/prototype fallback.

Dependencies:

- Read-only scoped farm access in RetirementFlow or a small adapter output extension.
- Tests proving no fabricated farm proof.

Recommended reasoning level:

- High.

### Option E: Reroll Design

Value:

- Defines whether users can reroll ceremony outcomes and how rerolls are audited.

Risk:

- Medium to High. Reroll semantics can undermine deterministic auditability if not designed carefully.

Dependencies:

- Ceremony persistence or explicit non-persistent reroll policy.
- Seed namespace/reveal index audit rules.

Recommended reasoning level:

- High.

### Option F: True-Value Salary Model

Value:

- Moves D2 ratings/salary closer to the full offseason economy model.

Risk:

- Medium to High. Salary changes can affect offseason decisions, roster planning, and future free-agency systems.

Dependencies:

- Existing D2 adapter/confirmation UI.
- True-value/50% delta design closeout.

Recommended reasoning level:

- High.

### Option G: Mutation-Capable FA/Draft/Trade Design

Value:

- Advances major offseason execution systems beyond preview-only status.

Risk:

- High. These systems affect roster counts, farm state, transactions, Phase 11 lock, and save lifecycle.

Dependencies:

- Existing D4/D5/D6 previews.
- Phase 11 correction primitives.
- Additional design before implementation.

Recommended reasoning level:

- Extra High.

## 8. Final Recommendation

Recommended next wave: **full-suite/build stabilization after C3**.

Why:

- C3 is the first wave where ceremony output can flow into a mutation-capable path.
- Focused tests are green, but the connected path touches UI state, R1 apply, preview refresh, and rollback display.
- A full-suite/build checkpoint gives the project a clean stable point before adding persistence, transaction metadata enrichment, farm-record loading, or any larger offseason execution systems.

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

Recommended reasoning: Medium

Please run a full-suite/build stabilization checkpoint after C3 retirement ceremony confirmation integration.

Scope:
- Verification and documentation only unless a test/build blocker appears.
- Do not implement new app behavior unless I explicitly approve.
- Do not add ceremony persistence.
- Do not add reroll.
- Do not implement jersey retirement, narrative/news, milestones, replacement players, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.
- Do not change R1 adapter semantics.

Use:
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_CONFIRMATION_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C2_RETIREMENT_CEREMONY_PREVIEW_UI_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C1B_RETIREMENT_CEREMONY_PLANNER_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md`
- `/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_R1_RETIREMENT_EXECUTION_CORE_CHECKPOINT.md`

Run:
- `npm test -- --reporter=dot`
- `npm run build`

Review:
1. Full-suite status after C3.
2. Build status after C3.
3. Any failures or warnings that should block further retirement/offseason work.
4. Whether focused C3 confidence still holds after full-suite verification.
5. Recommended next wave after stabilization:
   - transaction metadata enrichment,
   - ceremony result persistence design,
   - real scoped farm-record loading,
   - reroll design,
   - true-value salary model,
   - or mutation-capable FA/draft/trade design.

Output:
- Tests/build run.
- Findings first if anything fails.
- Link to any created stabilization doc if requested.
- Recommended next wave.
