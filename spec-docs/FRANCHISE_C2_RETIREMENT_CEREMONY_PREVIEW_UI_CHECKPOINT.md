# Franchise C2 Retirement Ceremony Preview UI Checkpoint

Date: 2026-05-25

Scope: documentation checkpoint only. This document does not implement app code, add UI, add tests, add persistence, call R1 apply, implement C3 confirmation integration, implement reroll, jersey retirement, narrative/news, milestones, replacement players, free agency, draft, or trade execution.

Primary references:

- `spec-docs/FRANCHISE_C1B_RETIREMENT_CEREMONY_PLANNER_CHECKPOINT.md`
- `spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md`
- `spec-docs/FRANCHISE_RETIREMENT_CEREMONY_DESIGN.md`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/utils/franchiseRetirementCeremony.ts`
- `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`

## 1. Executive Summary

C2 retirement ceremony preview UI is implemented.

Current state:

- Franchise `RetirementFlow` now includes a ceremony preview section.
- The ceremony preview uses the C1-B pure `revealFranchiseRetirementForTeam(...)` planner/roller.
- The UI is no-write and local-staging only.
- The UI does not call R1 apply.
- Ceremony reveal output can locally stage a suggested retiree, but the staged result is not durable and is not applied.
- C3 confirmation integration remains deferred.

C2 makes the reverse-age ceremony visible without changing the selected-player R1/R2 mutation boundary.

## 2. Completed Scope

Completed in `src/src_figma/app/components/RetirementFlow.tsx`:

- Franchise RetirementFlow ceremony preview section.
- Use of C1-B `revealFranchiseRetirementForTeam(...)`.
- Canonical reveal context:
  - `franchiseId`
  - `seasonId`
  - numeric `seasonNumber`
  - `statsScopeId: seasonId`
  - `offseasonStateId: offseason-${seasonId}`
  - phase `RETIREMENTS`
  - seed namespace `franchise-retirement-ceremony-preview`
  - deterministic preview seed
  - selected team ID
  - reveal index `0`
- Method/version display:

```text
franchise-retirement-ceremony-v1-reverse-age-roll
```

- Roll, bucket, candidate-pool hash, and seed-hash audit details.
- Candidate probability display.
- Retiree outcome state.
- No-retirement outcome state.
- Invalid reveal issue state.
- Local staged suggestion state.
- Local staged suggestion dismissal.
- Explicit no-write/no-persistence/deferred-apply copy.

C2 preserves the existing R2 manual selected-player retirement UI. Manual selection and explicit confirmation still use the R1 adapter path separately.

## 3. No-Write And Staging Boundary

C2 ceremony preview boundaries:

- No player writes.
- No farm record writes.
- No transaction writes.
- No offseason state writes.
- No localStorage writes.
- No IndexedDB writes.
- No ceremony result persistence.
- No R1 apply call.
- No auto-retirement.
- No reroll.
- No jersey retirement.
- No narrative/news effects.
- No milestone effects.
- No replacement-player effects.

The staged ceremony result is local component state only. It is not a durable retirement decision, not a transaction, and not an input to R1 apply in C2.

The local staged suggestion can be dismissed in the UI. Dismissal also writes nothing.

## 4. FARM Proof Boundary

C2 intentionally does not fabricate FARM eligibility proof.

Important rule:

- `RetirementFlow` does not build `farmRecords` from dry-run candidates.

Why this matters:

- C1-B requires FARM ceremony eligibility to be proven by actual scoped farm records.
- A dry-run candidate with `rosterStatus: FARM` is not, by itself, enough proof for ceremony eligibility.
- Fabricating farm records in the UI would bypass the C1-B farm-scope guard and could stage a FARM retiree that R1 would later reject or that lacks durable farm state.

Current C2 behavior:

- MLB candidates can remain eligible for ceremony reveal.
- FARM candidates are passed only as player DTOs.
- No candidate-derived `farmRecords` are supplied.
- FARM candidates without real scoped farm proof are excluded/reported by C1-B.
- Missing FARM proof appears as `FARM_RECORD_MISSING`.
- If no eligible candidates remain after exclusions, reveal can return a valid `no_retirement` result and stage nothing.

This is safe for C2 because no selected player IDs are staged from invalid output and no writes occur.

Future safe upgrade:

- A later wave may load actual read-only scoped franchise farm records and pass them to C1-B.
- That upgrade must prove the records come from franchise-owned farm storage and must not read League Builder/global/prototype data.

## 5. Relationship To R2 Manual Apply

R2 selected-player confirmation remains separate from C2 ceremony preview.

Current relationship:

- R2 manual selection still works from the D3/R1 candidate list.
- R2 apply still requires explicit user confirmation.
- R2 apply still calls R1 through `runFranchiseRetirementDryRun(...)` with `{ apply: true, playerIds }`.
- C2 ceremony suggestions do not feed R1 apply.
- C2 ceremony suggestions do not auto-select manual candidates.
- C2 ceremony suggestions do not advance the offseason phase.

C3 is the planned point where a ceremony-selected ID may flow into the confirmation path. Even then, R1 selected-player apply must remain the only mutation boundary.

## 6. Safety Boundaries

Franchise RetirementFlow safety boundaries after C2:

- Franchise branch mounts before prototype/global hooks initialize.
- No League Builder/global/prototype hooks are initialized in healthy franchise context.
- No League Builder/global/prototype writers are called.
- Missing canonical `seasonId` blocks dry-run and ceremony calls.
- Missing or invalid `seasonNumber` blocks dry-run and ceremony calls.
- No fabricated `season-1` or `seasonNumber: 1` fallback is used in franchise context.
- Adapter validation failure shows issues and does not fall back to prototype behavior.
- Non-franchise/prototype behavior remains unchanged.

C2 keeps the ceremony as a preview surface, not an execution workflow.

## 7. Tests And Confidence

Focused verification at C2 closeout:

- `npm test -- src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx`
  - Result: 21 tests passed.
- `npm test -- src/utils/tests/franchiseRetirementCeremony.test.ts`
  - Result: 29 tests passed.
- `npm test -- src/utils/tests/franchiseRetirementAdapter.test.ts`
  - Result: 26 tests passed.
- `npm run build`
  - Result: passed, with existing Vite large chunk warnings only.

Covered component cases:

- Retiree reveal staging.
- No-retirement reveal.
- Invalid reveal issues.
- FARM proof regression.
- Local staged suggestion dismissal.
- Canonical reveal context.
- Missing identity blocking.
- No R1 apply from ceremony reveal.
- No retirement writer calls.
- No player save calls.
- No prototype/global hook or writer calls in franchise context.

Covered pure ceremony cases from C1-B remain green:

- Deterministic reveal.
- Candidate ordering.
- Probability formula.
- Explicit no-retirement bucket.
- Invalid results are non-actionable.
- FARM requires scoped farm proof.
- No storage/React/transaction/R1 imports.

Confidence:

- C2 is safe as a no-write ceremony preview UI.
- C2 is not yet safe to treat as a retirement execution workflow.
- C3 should be implemented only as an explicit confirmation bridge through R1 apply.

## 8. Remaining Deferred Work

Deferred after C2:

- C3 ceremony confirmation integration through R1 apply.
- Persistence of ceremony results, if ever desired.
- Transaction metadata enrichment.
- Reroll design.
- Jersey retirement.
- Narrative/news effects.
- Milestone effects.
- Replacement-player systems.
- Real scoped farm-record loading for FARM ceremony candidates.
- Free-agency execution.
- Draft execution.
- Trade execution.
- Generated filler players.
- Import writes.
- Roster analyzer mutations.

## 9. Recommended Next Wave Analysis

### Option A: C3 Ceremony Confirmation Integration Through R1 Apply

Value:

- Completes the ceremony path by letting a valid staged ceremony retiree flow into the existing selected-player confirmation UI.
- Keeps mutation ownership in R1.
- Moves retirement closer to the OFFSEASON spec ceremony without adding random page-load mutation or prototype writes.

Risk:

- Medium-high. The implementation must avoid auto-apply, avoid direct writes, preserve explicit confirmation, and ensure invalid/no-retirement ceremony output cannot become actionable.

Dependencies:

- C1-B pure reveal.
- C2 local staging.
- R1 selected-player apply.
- R2 confirmation UI.
- Canonical identity guardrails.
- FARM proof boundary.

Recommended reasoning level:

- High.

### Option B: Full-Suite Verification After C2

Value:

- Establishes a clean stabilization point before connecting ceremony output to an execution path.
- Useful because C2 touched a central offseason component and a broad franchise guard test file.

Risk:

- Low. Verification should not add features and should only patch direct regressions or stale expectations.

Dependencies:

- Current C2 implementation.
- Existing full Vitest suite and build.

Recommended reasoning level:

- Medium.

### Option C: Real Scoped Farm-Record Loading For Ceremony FARM Candidates

Value:

- Allows valid FARM players to participate in the ceremony preview when actual scoped farm records exist.
- Closes the current conservative limitation where FARM candidates from dry-run data cannot prove ceremony eligibility.

Risk:

- Medium. The data source must be franchise-owned and read-only. The UI must not fall back to League Builder/global/prototype data.

Dependencies:

- Franchise farm storage read helpers.
- C1-B farm proof contract.
- Tests proving no fabricated farm proof and no global reads.

Recommended reasoning level:

- Medium.

### Option D: True-Value Salary Model

Value:

- Advances the D2 salary system toward the full offseason spec.
- Improves salary realism before larger offseason mutation systems depend on salary data.

Risk:

- Medium-high. It affects mutation-capable ratings/salary behavior and may need broader stat/contract assumptions.

Dependencies:

- D2 ratings/salary adapter.
- Existing salary calculator.
- OFFSEASON salary model decisions.

Recommended reasoning level:

- High.

### Option E: Mutation-Capable FA/Draft/Trade Design

Value:

- Advances the remaining major offseason execution systems.
- Provides a roadmap before adding high-risk player movement mutations.

Risk:

- High. These systems affect roster ownership, transaction logging, phase sequencing, Phase 11 lock state, and save/export lifecycle.

Dependencies:

- D4/D5/D6 previews.
- Phase 11 roster actions.
- Franchise roster/farm storage.
- Transaction identity.
- Save-slot lifecycle boundaries.

Recommended reasoning level:

- Extra High for design, High or Extra High for implementation.

## 10. Final Recommendation

Recommended next wave: full-suite verification after C2.

Rationale:

- C2 is intentionally no-write, but it touched `RetirementFlow`, the broad franchise offseason guard test file, and the ceremony/R2 interaction surface.
- A full-suite checkpoint gives a clean baseline before C3 connects ceremony staging to the mutation-capable R1 apply path.
- The next mutation-related step should be C3 only after verification confirms C2 did not destabilize existing D2-D7, R1/R2, or Phase 11 surfaces.

Exact next prompt:

```text
Recommended reasoning: Medium

Please run a full-suite C2 retirement ceremony preview stabilization checkpoint.

Scope:
- Do not implement new features.
- Do not call R1 apply from ceremony preview.
- Do not add persistence.
- Do not implement C3 confirmation integration.
- Do not implement reroll, jersey retirement, narrative/news, milestones, replacement players, free agency, draft, or trade execution.
- Only make code/test changes if needed to fix regressions found by verification.
- If failures are unrelated or stale expectations, keep fixes narrow and document them.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C2_RETIREMENT_CEREMONY_PREVIEW_UI_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_C1B_RETIREMENT_CEREMONY_PLANNER_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_R2_RETIREMENT_UI_CHECKPOINT.md
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/RetirementFlow.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/utils/franchiseRetirementCeremony.ts

Verification goals:
1. Run the full Vitest suite.
2. Run the production build.
3. Identify any failures introduced by:
   - C2 ceremony preview UI
   - C2 local staging/dismissal
   - C2 FARM proof boundary
   - R2 selected-player UI preservation
   - C1-B pure ceremony planner integration
4. Fix only direct regressions or stale test expectations.
5. Do not expand scope into new feature work.

Required commands:
- npm test -- --reporter=dot
- npm run build

Output:
- Full suite result.
- Build result.
- Any fixes made, with changed files.
- Remaining test/build warnings or known noise.
- Clear recommendation for the next wave.
- Finish with "C2 stabilization safe?" yes/no.
```

Keep C3, persistence, reroll, jersey/narrative/milestone effects, replacement systems, and broader offseason execution explicitly deferred until chosen.
