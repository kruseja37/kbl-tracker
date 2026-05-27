# Pass 1 Spine Remediation Plan

Date: 2026-05-21

Source:
- `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md`

Scope guard:
- Plan only.
- Do not implement code in this step.
- Do not start Pass 2.
- Do not add roster analyzer work.
- Do not audit gameplay formulas, derived/flavor systems, or offseason algorithms.

## Executive Recommendation

Recommended storage direction: acknowledge and harden the current scoped-global hybrid, rather than migrating immediately to the strict two-database Spine model.

Why:
- The repo already routes many working, tested identity paths through global scoped stores: schedules, completed games, season stats/metadata, event logs, playoffs, offseason state, and franchise season summaries (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:69`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:337`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:356`).
- The strict two-database model would require moving several mature IndexedDB stores and their query/sync/backup paths before Pass 2. That would be a large migration with high regression risk.
- Pass 2 needs trustworthy franchise identity and ownership boundaries more than it needs physical single-DB purity.

Decision:
- Treat `kbl-franchise-{id}` as the owner of copied franchise teams/players for Mode 2 v1.
- Treat global scoped stores as franchise-owned-by-filter where records carry durable canonical identity.
- Formalize this through a manifest, tests, export/import/delete coverage, and spec updates.

Pass 2 gate:
- Official Pass 2 audit may proceed after the scoped-global hybrid has an explicit manifest, strict ownership validation, and minimal sync/backup schema alignment for newly durable franchise stores.
- Full manifest-driven export/import/delete/backup execution is still required before production-ready save management, but it is now a Pass 1D/save-lifecycle implementation wave rather than a blocker for audit-only Pass 2.
- Pass 2 implementation work should still avoid changing save lifecycle behavior until Pass 1D completes.

## Recommended Remediation Waves

### Wave 0: Storage Architecture Decision And Spec Alignment

Goal:
- Decide and document whether the product will keep the scoped-global hybrid or migrate toward the strict two-database model.

Recommendation:
- Choose the scoped-global hybrid for now.

Why it matters:
- Finding 2 says the spec and repo disagree on physical storage ownership (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:63`).
- The save-slot work depends on knowing whether export/import/delete traverses scoped global stores or moves those records into `kbl-franchise-{id}` (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:83`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:337`).

Severity:
- High.

Needs:
- Spec update first.
- Small code update only after the decision, via manifest constants/tests.

Estimated difficulty:
- Small for the decision/spec update.
- Large if the decision is strict two-database migration.

Likely files involved:
- `spec-docs/SPINE_ARCHITECTURE.md`
- `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md`
- `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md`
- New or updated architecture note under `spec-docs/`
- Later code: `src/utils/franchisePersistenceContract.ts`

Dependencies:
- None. This should happen before heavy storage implementation.

Smallest safe patch:
- Add an ADR-style spec section saying the v1 implementation uses a hybrid save-slot model.
- Define "franchise-owned global scoped store" and required keys.
- Preserve the strict two-database model as a future consolidation option, not the immediate remediation.

Blocks Pass 2:
- Yes. Without this decision, Pass 2 can keep finding storage drift that may be intentional.

### Wave 1: Immediate Runtime Correctness Fixes

Goal:
- Fix the highest-risk runtime correctness gaps without starting the full export/import project.

Includes:
- Visible franchise reads that still touch League Builder globals.
- Backward-compatible transaction identity.
- New-season rollback/staging.
- Minimal legacy guard tests around current-season identity.

Why it matters:
- These issues can produce wrong visible franchise data or corrupt season movement even if save-slot export/import has not been used yet.

Estimated difficulty:
- Medium.

Dependencies:
- Ideally follows Wave 0 so implementation language matches the chosen architecture.

Blocks Pass 2:
- Yes. These are active correctness risks in current runtime paths.

### Wave 2: Save-Slot Manifest And Ownership Enforcement

Goal:
- Create the manifest that makes the hybrid model auditable.

Why it matters:
- Finding 1 says the franchise save slot is not currently a durable, portable, deletable unit (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:32`).
- The manifest is the bridge between the current hybrid reality and the Spine contract.

Estimated difficulty:
- Medium.

Dependencies:
- Wave 0 architecture decision.
- Wave 1 transaction identity decision, because transactions need canonical franchise keys before they can be safely included.

Blocks Pass 2:
- Yes until the manifest exists, validates ownership strictly, and sync/backup schemas acknowledge newly durable stores. Once those closeout checks pass, audit-only Pass 2 can proceed.

### Wave 3: Export / Import / Delete / Sync / Backup Execution

Goal:
- Wire franchise export/import/delete/sync/backup through the manifest.

Why it matters:
- The current export/import/delete paths cover only the per-franchise DB and miss most franchise-owned global scoped data (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:39`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:374`).

Estimated difficulty:
- Large.

Dependencies:
- Wave 2 manifest.
- Transaction identity from Wave 1.
- Decision on farm/offseason storage classification.

Blocks Pass 2:
- Blocks production-ready save management and any Pass 2 implementation that depends on export/import/delete/backup behavior.
- Does not block audit-only Pass 2 once the manifest covers active stores, ownership validation rejects ambiguous records, and sync/backup schemas acknowledge newly durable stores.

### Wave 4: Test Hardening And Re-Audit

Goal:
- Prove the shared contract before any Pass 2 work starts.

Why it matters:
- Existing tests prove important slices, but not the complete save-slot contract (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:390`).

Estimated difficulty:
- Medium.

Dependencies:
- Waves 1-3.

Blocks Pass 2:
- Yes. This is the pass/fail gate.

## Group 1: Immediate Runtime Correctness Fixes

### Item 1.1: Move Visible Franchise Reads Off League Builder Globals

Why it matters:
- Franchise setup copies League Builder teams/players, but `useFranchiseData` still uses global teams/templates for stadium/team-name/league structure (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:97`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:101`).
- FranchiseHome launch still loads League Builder teams for colors/manager metadata (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:102`).
- This can make an existing franchise visually drift after later League Builder template edits.

Severity:
- High.

Needs:
- Code and tests.

Estimated difficulty:
- Medium.

Likely files involved:
- `src/src_figma/hooks/useFranchiseData.ts`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/utils/franchisePlayerStorage.ts`
- `src/utils/franchiseManager.ts`
- `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts`
- New or existing FranchiseHome/SeasonSummary focused tests.

Dependencies:
- None, though Wave 0 should clarify that copied franchise team snapshots are the source of truth.

Smallest safe patch:
- In `useFranchiseData`, use franchise team snapshots and stored franchise config for team names, stadiums, league, conference, and division data when `franchiseId` is present.
- In FranchiseHome launch, fetch colors/managers from `getFranchiseTeam` or equivalent franchise snapshot.
- Leave global League Builder reads as missing-snapshot fallback only.
- Add a test that mutates League Builder after franchise setup and proves FranchiseHome/SeasonSummary still use copied franchise values.

Blocks Pass 2:
- Yes. Pass 2 cannot reliably inspect franchise gameplay context if visible franchise identity can come from mutable templates.

### Item 1.2: Add Canonical Transaction Identity Without Breaking Existing Callers

Why it matters:
- Game/event records now carry canonical identity, but transactions remain top-level `season`/`gameNumber` only (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:122`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:134`).
- Two franchises with `season = 1` can collide in transaction queries.

Severity:
- High.

Needs:
- Code and tests.

Estimated difficulty:
- Medium.

Likely files involved:
- `src/utils/transactionStorage.ts`
- `src/utils/syncConfig.ts`
- `src/utils/backupRestore.ts`
- `src/utils/tests/transactionStorage.mode2v1.test.ts`
- Any callers of `logMode2V1Transaction`, `getTransactionsBySeason`, `getTransactionsByGame`, and offseason transaction queries.

Dependencies:
- None for backward-compatible fields.
- Save-slot export/import should depend on this, not the other way around.

Smallest safe patch:
- Add optional `franchiseId?: string`, `seasonId?: string`, `statsScopeId?: string`, and possibly `scheduleGameId?: string` to transaction records/input.
- Bump `kbl-transactions` DB version and add non-unique indexes for `franchiseId`, `seasonId`, and `[franchiseId, seasonId]` if the IndexedDB helper supports compound indexes.
- Preserve existing season-number queries for non-franchise/global callers.
- Add new scoped helpers like `getTransactionsByFranchiseSeason(franchiseId, seasonId)`.
- Require canonical identity only in franchise-aware write helpers; legacy/global calls keep working.
- Add tests for two franchises sharing season number and isolated transaction histories.

Blocks Pass 2:
- Yes. Transaction streams are part of the Mode 2 event/data contract.

### Item 1.3: Close The New-Season Rollback Gap

Why it matters:
- Direct start and FinalizeAdvanceFlow create the summary before transition and abort early failures, but both update franchise metadata before new schedule generation (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:154`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:164`).
- A schedule generation failure after metadata advancement can strand a franchise in a new season with incomplete schedule data.

Severity:
- High.

Needs:
- Code and tests.

Estimated difficulty:
- Medium.

Likely files involved:
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`
- `src/utils/franchiseInitializer.ts`
- `src/utils/franchiseManager.ts`
- `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx`
- `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts`

Dependencies:
- None.

Smallest safe patch:
- Prefer staging: generate new schedule and ensure new season metadata before committing `FranchiseMetadata.currentSeason`.
- If staging is too invasive, add rollback: save previous metadata/currentSeason, restore it on downstream failure, and clear partial new-season schedule/metadata.
- Add failure tests for direct start and FinalizeAdvanceFlow where metadata succeeds and schedule generation fails.

Blocks Pass 2:
- Yes. Pass 2 should not proceed while a season handoff can leave canonical state split.

### Item 1.4: Keep Legacy Global Markers Out Of Franchise Runtime Identity

Why it matters:
- `kbl-current-season` remains synced and readable as legacy state, though franchise route season paths avoid it (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:307`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:317`).
- Legacy markers are acceptable only if they are clearly non-franchise or fallback-only.

Severity:
- Medium.

Needs:
- Tests now; possible code if a leak is found.

Estimated difficulty:
- Small.

Likely files involved:
- `src/src_figma/app/utils/franchiseRouteSeason.ts`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/pages/SeasonSummary.tsx`
- `src/utils/syncConfig.ts`
- Existing Wave 3/Wave 4 tests.

Dependencies:
- Wave 0 should classify legacy markers in the hybrid contract.

Smallest safe patch:
- Add tests that set misleading `kbl-current-season` and `selectedLeague` values and prove franchise routes still use franchise metadata/config.
- Mark localStorage keys as legacy compatibility in the manifest.

Blocks Pass 2:
- Partially. It blocks official franchise Pass 2 if tests reveal leaks; otherwise it can be completed as part of Wave 2/4.

## Group 2: Architecture / Spec Reconciliation Decisions

### Item 2.1: Choose Strict Two-Database Migration Or Scoped-Global Hybrid

Why it matters:
- The spec says one thing; the repo does another (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:63`).
- Implementing export/import/delete without this decision risks cementing an accidental architecture.

Severity:
- High.

Needs:
- Spec update now.
- Code only after the decision.

Estimated difficulty:
- Small for hybrid decision; XL for strict migration.

Likely files involved:
- `spec-docs/SPINE_ARCHITECTURE.md`
- `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md`
- `spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md`
- `src/utils/franchisePersistenceContract.ts`

Dependencies:
- None.

Smallest safe patch:
- Add a v1 storage ADR: "Franchise save slot uses per-franchise player/team DB plus manifest-owned scoped global stores."
- Define required fields for scoped global stores.
- Define strict two-database migration as a later optional consolidation, not a blocker.

Blocks Pass 2:
- Yes.

### Item 2.2: Define The Franchise Save-Slot Manifest Contract

Why it matters:
- The audit found no complete save-slot manifest (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:39`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:410`).
- The manifest is the practical contract for export/import/delete/sync/backup.

Severity:
- Blocker.

Needs:
- Code and spec update.

Estimated difficulty:
- Medium.

Likely files involved:
- `src/utils/franchisePersistenceContract.ts`
- `src/utils/franchiseManager.ts`
- `src/utils/syncConfig.ts`
- `src/utils/backupRestore.ts`
- Storage modules listed in the audit data ownership map.

Dependencies:
- Item 2.1.

Smallest safe patch:
- Add manifest entries for each store with owner DB, stores, key fields, export filter, import strategy, delete strategy, sync/backup status, and v1 status.
- Include localStorage markers as explicitly legacy/non-franchise/fallback.
- Include farm and offseason as classified records, even if some are marked deferred/unreachable.

Blocks Pass 2:
- Yes.

### Item 2.3: Normalize Offseason/Farm Season ID Language

Why it matters:
- Older offseason/farm specs mix numeric and string season IDs while the repo uses string canonical franchise season IDs for offseason state (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:275`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:295`).
- This is not an algorithm issue, but it affects shared storage identity.

Severity:
- Medium.

Needs:
- Spec update; possible adapter notes.

Estimated difficulty:
- Small.

Likely files involved:
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`
- `spec-docs/FARM_SYSTEM_SPEC.md`
- `src/utils/offseasonStorage.ts`
- `src/utils/farmStorage.ts`

Dependencies:
- Item 2.1.

Smallest safe patch:
- Add a v1 identity note: franchise context uses string canonical `{franchiseId}-season-{n}` as `seasonId`.
- Mark legacy numeric examples as conceptual or non-franchise.
- Do not implement farm analyzer or offseason algorithms.

Blocks Pass 2:
- Partially. It blocks storage contract completeness, but not immediate runtime fixes.

## Group 3: Larger Save-Slot / Export / Import / Sync / Backup Work

### Item 3.1: Manifest-Driven Export

Why it matters:
- Current export captures only per-franchise players/teams (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:39`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:378`).

Severity:
- Blocker.

Needs:
- Code and tests.

Estimated difficulty:
- Large.

Likely files involved:
- `src/utils/franchiseManager.ts`
- `src/utils/franchisePersistenceContract.ts`
- `src/utils/scheduleStorage.ts`
- `src/utils/gameStorage.ts`
- `src/utils/seasonStorage.ts`
- `src/utils/eventLog.ts`
- `src/utils/playoffStorage.ts`
- `src/utils/offseasonStorage.ts`
- `src/utils/transactionStorage.ts`
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/utils/farmStorage.ts`

Dependencies:
- Items 2.1, 2.2, and 1.2.

Smallest safe patch:
- Add export readers for manifest entries whose v1 status is active.
- Export farm only if classified as active franchise-owned; otherwise export its classification and omit data intentionally.
- Preserve IDs unless import strategy requires remapping.

Blocks Pass 2:
- Yes for franchise Pass 2.

### Item 3.2: Manifest-Driven Import

Why it matters:
- Current import creates a new franchise and restores only per-franchise DB stores (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:41`).
- Import must decide whether canonical IDs are preserved or remapped.

Severity:
- Blocker.

Needs:
- Code and tests.

Estimated difficulty:
- Large.

Likely files involved:
- Same as Item 3.1.

Dependencies:
- Item 3.1.
- ID remapping policy from Item 2.2.

Smallest safe patch:
- Support one explicit strategy first: import as new franchise with remapped `franchiseId` and recomputed canonical `seasonId` values, or import as exact restore that preserves IDs. Pick one and document it.
- Rebuild indexes/metadata consistently after import.
- Add two-franchise same-season import isolation tests.

Blocks Pass 2:
- Yes for complete save-slot confidence.

### Item 3.3: Manifest-Driven Delete And Repair

Why it matters:
- Current delete clears schedule and the per-franchise DB but leaves many scoped global records (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:42`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:380`).

Severity:
- Blocker.

Needs:
- Code and tests.

Estimated difficulty:
- Medium to large.

Likely files involved:
- `src/utils/franchiseManager.ts`
- `src/utils/franchiseInitializer.ts`
- Storage modules listed in the manifest.

Dependencies:
- Item 2.2.

Smallest safe patch:
- Add delete functions for scoped records by `franchiseId`, `seasonId`, and known IDs.
- Ensure delete never removes another franchise with the same `seasonNumber`.
- Extend repair to report missing manifest-owned stores without destructive recopy of valid records.

Blocks Pass 2:
- Yes.

### Item 3.4: Sync And Backup/Restore Alignment

Why it matters:
- `franchiseSeasonSummaries` exists in `trackerDb` but is missing from sync/backup schemas (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:43`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:44`, `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:386`).

Severity:
- High.

Needs:
- Code and tests.

Estimated difficulty:
- Medium.

Likely files involved:
- `src/utils/syncConfig.ts`
- `src/utils/backupRestore.ts`
- `src/utils/trackerDb.ts`
- `src/utils/franchiseSeasonSummaryStorage.ts`
- Sync/backup tests if present.

Dependencies:
- Item 2.2.

Smallest safe patch:
- Add `franchiseSeasonSummaries` to sync and backup/restore.
- Update backup schema DB version to match tracker DB.
- Add smoke tests that a backup/restore preserves franchise summary records.

Blocks Pass 2:
- Yes if Pass 2 relies on durable summaries or save restore.

## Group 4: Test Coverage Gaps

### Item 4.1: Manifest Completeness Tests

Why it matters:
- The manifest should prevent silent future drift.

Severity:
- High.

Needs:
- Tests.

Estimated difficulty:
- Medium.

Likely files involved:
- `src/utils/franchisePersistenceContract.ts`
- `src/utils/tests/` or `src/src_figma/__tests__/franchiseMode/`

Dependencies:
- Item 2.2.

Smallest safe patch:
- Assert expected DB/store entries exist for all active franchise-owned data areas in the audit map.
- Assert every active manifest entry declares key fields, export/import/delete behavior, and sync/backup classification.

Blocks Pass 2:
- Yes.

### Item 4.2: Full Export / Import / Delete Isolation Tests

Why it matters:
- This proves the save slot is durable, portable, and deletable.

Severity:
- Blocker.

Needs:
- Tests.

Estimated difficulty:
- Large.

Likely files involved:
- `src/src_figma/__tests__/franchiseMode/`
- `src/src_figma/__tests__/persistence/`
- Storage utility test setup helpers.

Dependencies:
- Items 3.1, 3.2, 3.3.

Smallest safe patch:
- Seed two franchises with the same season number.
- Add records across active manifest stores.
- Export/import one franchise and delete the original.
- Assert the other franchise remains untouched and imported records retain/remap canonical identity according to policy.

Blocks Pass 2:
- Yes.

### Item 4.3: League Builder Mutation Isolation Tests

Why it matters:
- Existing tests prove setup copy and repair, but not visible franchise rendering after template mutation (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:105`).

Severity:
- High.

Needs:
- Tests.

Estimated difficulty:
- Medium.

Likely files involved:
- `src/src_figma/__tests__/franchiseMode/`
- `src/src_figma/hooks/useFranchiseData.ts`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/pages/SeasonSummary.tsx`

Dependencies:
- Item 1.1.

Smallest safe patch:
- Mutate global team name/color/stadium after setup.
- Assert franchise home data, GameTracker launch state, and summary display still use franchise-owned snapshots/config.

Blocks Pass 2:
- Yes.

### Item 4.4: Transaction Isolation Tests

Why it matters:
- Current tests narrow transaction types but do not prove franchise isolation (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:136`).

Severity:
- High.

Needs:
- Tests.

Estimated difficulty:
- Small to medium.

Likely files involved:
- `src/utils/tests/transactionStorage.mode2v1.test.ts`
- New transaction scoping test file.

Dependencies:
- Item 1.2.

Smallest safe patch:
- Write transactions for two franchise IDs with the same season number and different canonical season IDs.
- Assert scoped query helpers return only matching franchise/season records.
- Assert existing non-franchise season-number queries still work.

Blocks Pass 2:
- Yes.

### Item 4.5: New-Season Rollback Tests

Why it matters:
- Existing tests cover early failures, not failure after metadata update (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:167`).

Severity:
- High.

Needs:
- Tests.

Estimated difficulty:
- Medium.

Likely files involved:
- `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx`
- `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts`

Dependencies:
- Item 1.3.

Smallest safe patch:
- Mock schedule generation failure after transition success.
- Assert current season remains previous season and no partial next-season schedule/metadata becomes active.

Blocks Pass 2:
- Yes.

### Item 4.6: SeasonSummary Persisted/Fallback Component Tests

Why it matters:
- Summary storage is tested at utility level, but the component fallback path lacks direct coverage (`spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md:263`).

Severity:
- Medium.

Needs:
- Tests.

Estimated difficulty:
- Small to medium.

Likely files involved:
- `src/src_figma/app/pages/SeasonSummary.tsx`
- New or existing SeasonSummary test file.

Dependencies:
- None.

Smallest safe patch:
- Test persisted summary render.
- Test old-season fallback when no summary exists.

Blocks Pass 2:
- No by itself, unless summary UI is part of the Pass 2 scenario.

## How Much Save-Slot Work Is Needed Before Pass 2?

Minimum before official franchise Pass 2:
1. Storage architecture decision recorded.
2. Manifest exists and covers all active franchise-owned/scoped stores.
3. Manifest validation proves franchise ownership only when required scope keys are present and matching; ambiguous same-season/global records are warnings, not owned records.
4. Minimal sync/backup schema alignment includes newly durable stores such as `franchiseSeasonSummaries`.
5. Farm storage is explicitly classified:
   - Active franchise-owned and covered, or
   - Deferred/unreachable in Mode 2 v1 with guard tests proving it does not affect current franchise paths.

Required before production-ready save management, but not before audit-only Pass 2:
1. Export/import/delete works for all active Mode 2 gameplay and handoff stores:
   - `kbl-franchise-{id}` players/teams.
   - `kbl-app-meta` franchise metadata/config.
   - `kbl-schedule` scheduled games and scoped schedule metadata behavior.
   - `kbl-tracker` current/completed games, season metadata/stats, franchise summaries.
   - `kbl-event-log` game headers and events.
   - `kbl-transactions` after canonical identity is added.
   - `kbl-playoffs`.
   - `kbl-offseason` state/phase records needed for v1 handoff.
2. Manifest-driven backup/restore execution and validation work end to end.

Can any subset of Pass 2 proceed before all Pass 1 remediation is done?

Yes, audit-only Pass 2 may proceed after the minimum gate above. Pass 2 implementation should not rely on save-slot export/import/delete/backup behavior until the Pass 1D/save-lifecycle wave completes.

## Exact Prompt For First Implementation Wave

```text
Please implement Pass 1 Remediation Wave 1: immediate runtime correctness fixes only.

Do not start Pass 2.
Do not implement the full save-slot export/import/delete system yet.
Do not add roster analyzer work.
Do not audit gameplay formulas, derived/flavor systems, or offseason algorithms.

Use:
- spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md
- spec-docs/PASS_1_SPINE_REMEDIATION_PLAN.md

Scope:
1. Move visible franchise reads off League Builder globals:
   - In useFranchiseData, use franchise-owned team snapshots plus stored franchise config for franchise team names, stadiums, league/conference/division metadata, and selected league identity.
   - In FranchiseHome GameTracker launch, use franchise-owned team snapshots for colors/managers when franchiseId is present.
   - Keep League Builder/global reads only as missing-snapshot legacy fallback.

2. Add backward-compatible canonical transaction identity:
   - Add optional franchiseId, canonical seasonId, statsScopeId, and scheduleGameId fields to transaction records/input where appropriate.
   - Preserve existing non-franchise/global season-number callers.
   - Add scoped query helpers for franchiseId + seasonId.
   - Add guard behavior so franchise-aware writes include canonical identity.

3. Close the new-season rollback gap:
   - Ensure direct START SEASON and FinalizeAdvanceFlow do not leave FranchiseMetadata.currentSeason advanced if schedule generation or post-transition setup fails.
   - Prefer staging before metadata advancement; otherwise add explicit rollback and partial new-season cleanup.

Tests required:
- League Builder mutation after franchise setup does not alter visible FranchiseHome/SeasonSummary/GameTracker launch franchise metadata.
- Two-franchise same-season transaction isolation by franchiseId + seasonId, while legacy non-franchise transaction queries still work.
- Direct start and FinalizeAdvanceFlow rollback/staging when schedule generation fails after transition success.
- Existing Wave 1/Wave 2/Wave 3/Wave 4 focused suites still pass.

Output:
- Findings first if any blockers remain.
- Summary of files changed.
- Test commands run and results.
- State whether Wave 1 is complete and whether Wave 2 manifest work can start.
```

## Exact Prompt For Storage Architecture / Spec Decision

```text
Please perform Pass 1 Storage Architecture Decision only.

Do not implement app code.
Do not start Pass 2.
Do not add roster analyzer work.
Do not audit gameplay formulas, derived/flavor systems, or offseason algorithms.

Use:
- spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md
- spec-docs/PASS_1_SPINE_REMEDIATION_PLAN.md
- spec-docs/SPINE_ARCHITECTURE.md
- spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md
- spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md

Goal:
Decide whether the repo should:
A. migrate toward the strict Spine two-database model now, or
B. formally acknowledge the current scoped-global hybrid for Mode 2 v1 and harden it with a manifest.

Expected recommendation:
- Prefer B unless repo inspection finds a concrete reason strict migration is safer now.

Output:
1. Decision: strict two-database migration now vs scoped-global hybrid for v1.
2. Rationale with repo/spec references.
3. Updated spec/ADR text describing:
   - per-franchise DB ownership,
   - franchise-owned scoped global stores,
   - required canonical keys,
   - export/import/delete/sync/backup manifest expectations,
   - legacy localStorage marker policy,
   - farm/offseason storage classification for v1.
4. Clear implementation prompt for the manifest wave.

Do not edit app source files unless explicitly approved after this decision.
```

## Exact Prompt For Manifest / Save-Slot Wave

```text
Please implement Pass 1 Remediation Wave 2/3: franchise save-slot manifest and manifest-driven export/import/delete/sync/backup.

Do not start Pass 2.
Do not add roster analyzer work.
Do not audit gameplay formulas, derived/flavor systems, or offseason algorithms.

Prerequisites:
- PASS_1_SPINE_REMEDIATION_PLAN.md exists.
- Storage architecture decision has selected the scoped-global hybrid for Mode 2 v1.
- Transaction records have canonical franchiseId + seasonId support.

Scope:
1. Add a franchise save-slot manifest that enumerates all active franchise-owned/scoped stores:
   - kbl-app-meta franchise metadata/config.
   - kbl-franchise-{id} players/teams.
   - kbl-schedule scheduled games and schedule metadata policy.
   - kbl-tracker current/completed games, season metadata/stats, franchiseSeasonSummaries.
   - kbl-event-log game headers/events.
   - kbl-transactions canonical scoped transactions.
   - kbl-playoffs.
   - kbl-offseason state/phase records.
   - kbl-farm classified as active or deferred/unreachable for v1.
   - legacy localStorage markers classified as non-franchise/fallback/deferred.

2. Wire export/import/delete through the manifest:
   - Export all active scoped records for one franchise.
   - Import according to one documented identity policy.
   - Delete one franchise without deleting another franchise sharing the same seasonNumber.

3. Update sync and backup/restore:
   - Include franchiseSeasonSummaries.
   - Align backupRestore tracker DB schema/version with trackerDb.
   - Ensure active manifest stores are represented or explicitly classified.

Tests required:
- Manifest completeness test.
- Two-franchise same-season export/import/delete isolation.
- Summary sync/backup coverage.
- Legacy marker classification/guard test.
- Existing focused franchise suites still pass.

Output:
- Findings first if any blockers remain.
- Summary of files changed.
- Test commands run and results.
- State whether Pass 1 can be re-audited for Pass 2 readiness.
```
