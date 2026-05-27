# Franchise Implementation Roadmap Post Audit

Date: 2026-05-22

Scope: planning only. This document does not implement app code, does not add roster analyzer work, and does not design the roster analyzer or recommendation engine.

Primary sources:
- `spec-docs/FRANCHISE_AUDIT_CROSS_PASS_SYNTHESIS.md`
- `spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md`
- `spec-docs/FRANCHISE_MODE_REPO_AUDIT.md`
- `spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md`
- `spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md`
- `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md`
- `spec-docs/AUDIT_PASS_2_GAMEPLAY_EVENT_PIPELINE.md`
- `spec-docs/AUDIT_PASS_3_SEASON_END_OFFSEASON_BOUNDARY.md`
- `spec-docs/AUDIT_PASS_4_FARM_ROSTER_MOVEMENT_BOUNDARY.md`
- `spec-docs/AUDIT_PASS_5_DERIVED_FLAVOR_SYSTEMS.md`
- `spec-docs/AUDIT_PASS_6_DEFERRED_PROTOTYPE_LEAKAGE.md`

## Executive Recommendation

The franchise core is now ready for a read-only roster analyzer planning pass.

The six-pass audit sequence moved Mode 2 franchise mode from "prototype with identity risks" to "boundary-correct v1 core with known deferred systems." Wave A then operationalized save-slot ownership through manifest-driven validation, export, delete cleanup, backup schema coverage for franchise roots and dynamic franchise player/team DBs, and explicit deferral of unsafe playerId-only career/milestone ownership. Import writes remain intentionally validate-only.

Wave B added durable transition journals and rollback hardening for season finalization, direct new-season start, and failure recovery. The follow-up journal manifest cleanup added transition journals to manifest/export/delete/sync/backup coverage; pending and failed journals are reported for repair visibility, not auto-repaired. The broad test checkpoint is also clean: the full Vitest suite passed with 302 files and 6,348 tests, and the production build passed. Remaining test noise is cosmetic and non-blocking.

The next best step is read-only roster analyzer planning. It can now safely reason over the stabilized franchise data contract without adding mutations. Offseason adapter implementation, import writes, career/milestone canonical scoping, derived/flavor persistence, and transition journal repair UI remain future implementation work.

## 1. Current State Checkpoint

### Complete Or Stable For Mode 2 v1 Boundary Work

- Franchise setup copies League Builder teams and players into a franchise-owned IndexedDB namespace, not by reference. The accepted ownership model is documented in `spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md`.
- Canonical franchise identity is threaded through setup, schedule, GameTracker launch, restore, archive, schedule completion, playoff handling, transactions, and event rows.
- The current architecture is explicitly the scoped-global hybrid: `kbl-franchise-{id}` owns copied teams and players, while schedules, completed games, event logs, transactions, playoffs, offseason state, season metadata, and summaries live in shared stores with required franchise/season/stats/playoff/offseason identity.
- Franchise regular-season, franchise postseason, elimination, and exhibition modes have explicit guardrails. Franchise postseason and elimination playoff records are separated by source and identity.
- Synthetic simulation remains disabled or unreachable for Mode 2 v1.
- Double-switch behavior is blocked at the hook layer for franchise Mode 2 v1, not only hidden in the UI.
- Durable franchise season summaries exist and are used for historical SeasonSummary rendering when available.
- Incomplete aggregation archives are preserved for diagnostics but excluded from normal completed-game and summary consumers.
- End-game aggregation failure blocks normal schedule/playoff/summary advancement.
- At-bat, between-play, fielding, and completed-game records now carry canonical identity where available.
- Substitution, position switch, pitcher change, and pitch-count confirmation paths now write required ledger rows before visible state mutation for the high-risk paths already remediated.
- Franchise playoff creation from SeasonSummary uses franchise-owned team snapshots and does not fall back to mutable League Builder team data.
- GameTracker launch rosters filter to franchise-owned active MLB players, with farm/free-agent/released/retired/inactive/unassigned players excluded from active game rosters.
- Franchise-scoped farm storage and minimal durable call-up/send-down writers exist as boundary infrastructure.
- TradeFlow, contraction/expansion, unsupported tabs, and other deferred surfaces are guarded or rendered as read-only/placeholders in franchise v1.
- Reporter/news identity preserves franchise playoff identity rather than downcasting franchise playoff records into elimination mode.
- Persisted SeasonSummary mode avoids live mutable leader/award/key-performer derivation where the persisted summary is authoritative.

### Conditionally Accepted For v1

- The scoped-global hybrid is accepted as the near-term architecture. Strict physical two-database Spine storage is deferred.
- Production season aggregation remains snapshot-derived. The accepted v1 bridge is snapshot runtime aggregation plus non-mutating replay audit harness and golden parity fixtures, not production event-log replay.
- GameTracker correction policy is audited mutation with version/edit history, not strict physical append-only correction rows.
- Fan morale, adaptive standards, park factors, farm flavor, and some narrative/history sections are allowed only as scoped data or explicit placeholders until durable scoped storage exists.
- Focused audit suites and the full Vitest suite are now green at the checkpoint: 302 files and 6,348 tests passed. Build also passed.

### Guarded Or Deferred

- Manifest-driven import writes, exact restore, and remapped clone import.
- Transition journal repair UI and any automatic repair action for pending/failed journals.
- Strict two-database migration.
- Production event-sourced aggregation replacement.
- Full franchise-owned free agency, draft, retirement, trade, contraction, spring training, and farm algorithm depth.
- Roster analyzer implementation. Read-only analyzer planning is now safe.
- Analyzer-driven mutations or executable recommendations.
- Synthetic simulation.
- Double switch in franchise Mode 2 v1.
- Durable fan morale, adaptive standards, park factors, and complete flavor/history persistence.
- Full production versions of guarded prototype offseason surfaces.

### Known Test Debt

- Focused Waves 1-4, Passes 1-6, Wave A, Wave B, and journal manifest cleanup tests are strong for the audited boundaries.
- Full-suite checkpoint: Vitest passed with 302 files and 6,348 tests.
- Build checkpoint: production build passed.
- Remaining test noise is cosmetic/non-blocking and should stay visible as maintenance debt, not as a blocker for the next planning pass.
- Replay audit coverage exists for core and edge fixtures, but season-level clutch/fWAR parity and full production replay remain deferred.
- Save-slot export/delete/validation and backup root coverage are implemented and covered by focused tests. Import writes, exact restore, remapped clone import, and full backup/restore round-trip coverage remain future work.

## 2. Recommended Next Waves

Recommended order:

1. Wave F0: Read-only roster analyzer planning.
2. Wave D: Franchise-owned offseason adapters, gated by roster/farm writer hardening.
3. Wave G: Save-slot import-write design, exact restore, and remapped clone strategy.
4. Wave E: Derived/flavor persistence.
5. Wave H: Transition journal repair UI.

Wave A, Wave B, journal manifest cleanup, and full-suite cleanup are now checkpointed as complete. The next wave should be planning-only because the platform can support analyzer requirements discovery, but analyzer execution and mutations still need a deliberate design gate.

## Wave A: Save-Slot Lifecycle Execution

Status:
- Closed for current Wave A scope.
- Implemented: manifest-driven validation, export, delete cleanup, backup schema/root coverage, dynamic `kbl-franchise-{id}` players/teams backup coverage, and validate-only import payload checking.
- Deferred: import writes, exact restore, remapped clone import, and any career/milestone export/delete ownership until those records carry canonical franchise scope.

Goal:
- Turn the Pass 1C manifest from a validator into the execution contract for franchise export, delete cleanup, backup coverage, and future import/sync eligibility.

Why it matters:
- A franchise save is not just the per-franchise team/player DB. Under the scoped-global hybrid, a complete save also includes scoped schedules, completed games, current game snapshots, event logs, transactions, season metadata, season summaries, playoffs, offseason state, farm records, stats, and flavor domains where present.
- Without manifest-driven lifecycle execution, adding new durable systems increases the chance that export, import, delete, backup, or sync silently misses data.

Scope:
- Implemented manifest-driven export for all currently owned domains.
- Implemented delete cleanup across per-franchise DB and manifest-owned scoped shared stores.
- Added backup/sync domain coverage using the same manifest ownership rules where Wave A promoted coverage.
- Implemented validation for exported/deleted records against declared required scope keys.
- Implemented validate-only import payload checking; import writes intentionally refuse with a clear error.
- Exclude League Builder templates, device globals, global current-season markers, elimination records, and ambiguous season-only records unless explicitly classified as legacy/provenance data.
- Defer career stats and milestones until those records carry canonical franchise scope. Copied `playerId` alone is not ownership proof because two franchises may share copied source player IDs.
- Backup coverage includes `kbl-app-meta.franchiseList`, `kbl-app-meta.franchiseConfigs`, and dynamic `kbl-franchise-{id}` player/team DBs discovered from franchise metadata.

Explicitly out of scope:
- Import writes, exact restore, and remapped clone import.
- Strict two-database migration.
- Roster analyzer work.
- New offseason algorithms.
- New gameplay/stat formulas.

Likely files:
- `src/utils/franchiseSaveSlotManifest.ts`
- `src/utils/franchiseManager.ts`
- `src/utils/backupRestore.ts`
- `src/utils/syncConfig.ts`
- `src/utils/trackerDb.ts`
- `src/utils/eventLog.ts`
- `src/utils/gameStorage.ts`
- `src/utils/playoffStorage.ts`
- `src/utils/offseasonStorage.ts`
- `src/utils/transactionStorage.ts`
- `src/utils/franchiseFarmStorage.ts`
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/utils/seasonStorage.ts`
- `src/utils/scheduleStorage.ts`

Tests:
- Two franchises with the same season number export isolated save slots.
- Validate-only import refuses writes and creates no new franchise/save records.
- Exact restore and remapped clone import tests are future work with import-write implementation.
- Delete cleanup removes per-franchise DB records and scoped shared records while preserving other franchises, elimination records, exhibition games, League Builder templates, and device globals.
- Backup and sync schema include summaries, farm, event logs, playoffs, transactions, completed games, current game snapshots, schedules, season metadata, and offseason state.
- Ambiguous season-only records are warnings, not owned records.

Dependencies:
- Pass 1C manifest validator.
- Mode/competition scope guardrails.
- Scoped-global hybrid decision.

Risk level:
- High. This touches broad persistence boundaries, but it is the right next high-value foundation.

Recommended reasoning level:
- Extra High.

Closeout status:
- Wave A is implemented for manifest-driven validation, export, delete, backup root coverage, and dynamic franchise player/team DB backup coverage.
- Import remains validate-only and intentionally refuses writes.
- Exact restore and remapped clone import remain future save-slot import work, not completed Wave A scope.

## Wave B: Transition Journal And Rollback Hardening

Status:
- Closed for current Wave B scope.
- Implemented durable franchise-scoped transition journals for direct START SEASON and FinalizeAdvanceFlow paths.
- Implemented rollback hardening for staged schedule/season metadata and franchise metadata restore after late failures.
- Implemented transition diagnostics for failed transition-engine results, including failed stage, steps, summary, and `playerSideEffectsPossible`.
- Implemented transition journal manifest/export/delete/sync/backup cleanup after the rollback blocker patch.
- Pending and failed journals are reported for repair visibility and readiness warnings; they are not automatically repaired.

Goal:
- Add a durable transition journal so season finalization, offseason entry, and new-season start can recover or roll back from interruption/failure.

Why it matters:
- Existing patches stage summary, transition, metadata, and schedule work more safely than before, but there is still no single durable journal for all side effects.
- Complex offseason adapters and analyzer-adjacent workflows should not build on partial-advance windows.

Scope:
- Implemented a transition journal for summary creation, `executeSeasonTransition`, season metadata staging, schedule generation, franchise metadata update, cleanup, commit, rollback, and failure diagnostics.
- Made direct `START SEASON {n+1}` and `FinalizeAdvanceFlow` share the journaled franchise transition boundary.
- Added passive readiness/reporting behavior for pending and failed states. Automatic repair remains future work.
- Kept non-franchise/global behavior separate.
- Logged diagnostics for manual repair where full atomicity is impossible across IndexedDB/localStorage boundaries.

Explicitly out of scope:
- New offseason algorithms.
- Save-slot import writes.
- Automatic transition journal repair UI/workflows.
- Roster analyzer work.

Likely files:
- `src/engines/seasonTransitionEngine.ts`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/utils/franchiseManager.ts`
- `src/utils/scheduleStorage.ts`
- `src/utils/seasonStorage.ts`
- `src/utils/offseasonStorage.ts`
- `src/utils/franchisePersistenceContract.ts`

Tests:
- Covered journal creation failure, transition-engine failure diagnostics, staging failure, rollback cleanup failure, metadata rollback, metadata rollback failure, journal commit failure, and shared direct-start/FinalizeAdvanceFlow orchestration.
- Covered transition journal manifest validation/export/delete warnings and ownership.
- Covered sync/backup schema registration for transition journals.
- Covered FinalizeAdvanceFlow transition-error copy so failure state no longer shows processing/wait text.

Dependencies:
- Durable summary storage.
- Wave A save-slot lifecycle.
- Journal manifest cleanup.
- Current staged cleanup behavior.

Risk level:
- High. It touches lifecycle state and recovery semantics.

Recommended reasoning level:
- Extra High.

Closeout status:
- Wave B runtime rollback blocker is closed.
- Journal manifest cleanup is closed.
- Remaining journal work is a future repair UI/workflow, not a blocker for read-only planning.

## Wave C: Full-Suite Test Debt Cleanup And Focused Smoke Consolidation

Status:
- Closed for the current checkpoint.
- Full Vitest suite passed: 302 files and 6,348 tests.
- Production build passed.
- Remaining test noise is cosmetic/non-blocking.

Goal:
- Convert focused audit-suite confidence into broader regression confidence before larger feature systems are opened.

Why it matters:
- The franchise-focused suites are strong, but the repo still has known broad-suite debt and noisy warnings.
- Save lifecycle and transition journal work will touch many stores and test setups. It is cheaper to stabilize the broad test base before adding full offseason adapters or analyzer planning artifacts that rely on many shared utilities.

Scope:
- Run and triage the broad Vitest suite.
- Fix stale reporter DB version expectations where tests lag current `trackerDb` schema.
- Fix League Builder query ambiguity by replacing broad repeated `getByText` selectors with role/name, `within(...)`, or scoped selectors.
- Clean React `act` warnings and fake IndexedDB setup warnings where they obscure real failures.
- Add a stable focused franchise smoke command or documented suite list covering Waves 1-4 and Passes 1-6.
- Keep Pass 2B replay audit tests in the smoke suite and add season-level clutch/fWAR parity tests only if lightweight.

Explicitly out of scope:
- New feature work.
- Production event replay replacement.
- Roster analyzer work.
- Offseason adapter implementation.

Likely files:
- `src/src_figma/__tests__/reporter/reporterAlmanacCacheStorage.test.ts`
- `src/src_figma/__tests__/reporter/reporterVoiceSchema.test.ts`
- `src/src_figma/__tests__/leagueBuilder/LeagueBuilder.test.tsx`
- `src/src_figma/__tests__/leagueBuilder/LeagueBuilderLeagues.test.tsx`
- Test setup/config files.
- Focused franchise test files touched by prior Waves/Passes.
- `src/utils/tests/gameReplayAudit.test.ts`

Tests:
- Full suite passed at checkpoint.
- Focused Pass 1-6, Wave A, Wave B, and journal manifest cleanup tests remain the franchise confidence base.
- Replay audit smoke remains part of the broader confidence story.

Dependencies:
- None, but recommended after Wave A/B if those waves land first, or before them if full-suite green becomes the gate.

Risk level:
- Medium. Mostly test code, but it may expose real runtime defects.

Recommended reasoning level:
- High.

Closeout status:
- Full-suite cleanup no longer blocks planning work.
- Future test maintenance should address cosmetic warnings only when they become distracting or hide real failures.

## Wave D: Franchise-Owned Offseason Adapters

Goal:
- Move selected guarded prototype offseason flows into real franchise-owned adapters while preserving current v1 boundaries.

Why it matters:
- The app now protects franchise saves from prototype/global mutation, but users still cannot complete a rich franchise offseason through durable franchise-owned flows.
- Mutation-heavy offseason work should start only after roster/farm writers are hardened enough to avoid partial player/team/farm/transaction state.

Scope:
- Begin with a D0 writer-hardening subwave if not already done:
  - atomic or compensating rollback behavior for player/team/farm/transaction updates,
  - explicit phase context,
  - stricter roster status and eligibility validation,
  - options/reveal/injury/list/contract/trait/chemistry placeholder fields where already needed by adapters.
- Then implement one low-blast-radius franchise-owned adapter, likely ratings or retirement.
- Keep trade, free agency, draft, farm flavor, chemistry, and spring training guarded/read-only until their adapters are explicitly designed and tested.
- Ensure every adapter uses franchise-owned player/team/farm state and canonical season/offseason identity.

Explicitly out of scope:
- Full offseason algorithm suite.
- Roster analyzer design or implementation.
- Analyzer-driven writes.
- Synthetic simulation.
- League Builder mutation from franchise context.

Likely files:
- `src/utils/franchiseRosterMovement.ts`
- `src/utils/franchiseFarmStorage.ts`
- `src/utils/franchisePlayerStorage.ts`
- `src/src_figma/app/utils/franchiseGameTrackerRoster.ts`
- `src/src_figma/app/components/TeamHubContent.tsx`
- `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`
- `src/src_figma/app/components/RatingsAdjustmentFlow.tsx`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/src_figma/app/utils/franchiseOffseasonGuards.ts`
- `src/utils/offseasonStorage.ts`
- `src/utils/transactionStorage.ts`

Tests:
- Roster/farm writer atomicity and rollback on each failed write point.
- Status exclusion matrix for active/farm/free-agent/released/retired/inactive/unassigned/damaged players.
- Adapter writes only franchise DB/scoped stores.
- Canonical offseason/season identity preserved.
- Old prototype League Builder mutation functions are not called.
- Non-franchise/prototype behavior preserved where intentionally supported.

Dependencies:
- Wave B strongly preferred for automated phase transitions.
- Wave A strongly preferred before adding new durable adapter domains.
- Existing Pass 4A farm/roster boundary.

Risk level:
- High for mutation-heavy adapters, Medium for a carefully selected first adapter.

Recommended reasoning level:
- High.

Exact implementation prompt:

```text
Recommended reasoning: High

Please implement Wave D0/D1: franchise-owned offseason adapter foundation and the first safe adapter.

Do not implement roster analyzer code.
Do not implement full offseason/free-agency/draft/trade algorithms.
Do not re-enable synthetic simulation.
Keep this focused on durable franchise-owned offseason mutation boundaries.

Use:
/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_IMPLEMENTATION_ROADMAP_POST_AUDIT.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_4_FARM_ROSTER_MOVEMENT_BOUNDARY.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/OFFSEASON_SYSTEM_SPEC.md

Goals:
1. Harden roster/farm writers with atomicity or compensating rollback for player/team/farm/transaction writes.
2. Add explicit phase context and stricter eligibility/status validation.
3. Choose one low-blast-radius franchise-owned offseason adapter, preferably ratings or retirement.
4. Ensure the adapter writes only franchise-owned/scoped storage with canonical season/offseason identity.
5. Keep trade/free agency/draft/farm flavor/chemistry/spring training guarded until separately implemented.

Tests:
- Writer rollback/atomicity failure points.
- Roster status exclusion matrix.
- Adapter writes only franchise-owned/scoped storage.
- Prototype League Builder mutation functions are not called.
- Existing Pass 4A guard tests remain green.

After implementation:
- Run Wave D tests.
- Run focused Pass 4A tests.
- Run save lifecycle and transition tests if available.
- Run `npm run build`.
- Summarize changed files, behavior, tests, and remaining risks.
```

## Wave E: Derived/Flavor Persistence

Goal:
- Decide and implement the storage/scoping boundary for durable derived and flavor systems that are allowed to appear in franchise history.

Why it matters:
- Fan morale, adaptive standards, park factors, awards, milestones, designations, story feeds, commentary, and almanac narratives can make the franchise mode feel alive, but they are dangerous if they draw from global/prototype state or live mutable stats after a season summary exists.

Scope:
- Decide which derived/flavor systems are durable v1 data and which remain explicit placeholders.
- Add or harden scoped storage for approved durable systems.
- Add save-slot manifest entries and index requirements for any newly durable domains.
- Preserve persisted SeasonSummary fidelity.
- Keep placeholder copy honest for deferred systems.

Explicitly out of scope:
- Farm narrative/mechanical algorithms.
- Morale/adaptive/park-factor activation without scoped storage and tests.
- Roster analyzer work.
- Replacing every placeholder at once.

Likely files:
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/utils/franchiseSaveSlotManifest.ts`
- `src/utils/almanacNarrativeArchive.ts`
- `src/src_figma/app/hooks/useCommentaryFeed.ts`
- `src/types/reporter.ts`
- `src/engines/fanMoraleEngine.ts`
- `src/engines/adaptiveLearningEngine.ts`
- `src/utils/parkFactorEngine.ts` or related park-factor utilities if present.

Tests:
- Multi-franchise same-season story/feed isolation.
- Persisted summary fidelity for old and new seasons.
- Placeholder assertions for deferred systems.
- No prototype/global data presented as durable franchise history.
- Manifest/export coverage for any activated durable flavor stores after Wave A.

Dependencies:
- Wave A if new durable stores need save lifecycle coverage.
- Wave C if broad-suite confidence is the release gate.

Risk level:
- Medium. The risk is mostly data provenance and historical fidelity rather than immediate gameplay failure.

Recommended reasoning level:
- High.

Exact implementation prompt:

```text
Recommended reasoning: High

Please implement Wave E: derived/flavor persistence scoping decisions and the first approved durable boundaries.

Do not implement roster analyzer code.
Do not activate full fan morale/adaptive/park-factor systems unless scoped storage and tests are included.
Do not implement farm flavor algorithms.
Do not replace placeholder systems without a storage and manifest plan.

Use:
/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_IMPLEMENTATION_ROADMAP_POST_AUDIT.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_5_DERIVED_FLAVOR_SYSTEMS.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md

Goals:
1. Decide which derived/flavor domains become durable franchise history now and which remain placeholders.
2. Add scoped storage, manifest entries, and query/index requirements for any activated durable domains.
3. Preserve persisted SeasonSummary fidelity.
4. Ensure story/feed/reporter/morale/adaptive/park-factor surfaces do not read global/prototype data as franchise history.

Tests:
- Multi-franchise same-season story/feed isolation.
- Persisted summary fidelity.
- Placeholder/disabled-state assertions for deferred systems.
- Manifest coverage for activated domains if Wave A exists.

After implementation:
- Run Wave E tests.
- Run focused Pass 5 tests.
- Run save lifecycle tests if new manifest domains are added.
- Run `npm run build`.
- Summarize decisions, changed files, tests, and remaining risks.
```

## Wave F: Roster Analyzer Planning

Goal:
- Plan the roster analyzer/recommendation engine as a read-only contract that respects the current franchise architecture and deferred-system boundaries.

Why it matters:
- The analyzer is attractive, but it sits directly on top of the riskiest domains: roster ownership, farm state, player status, stats, transactions, offseason phases, and save lifecycle. Planning is safe now. Implementation and executable recommendations are not.

Scope:
- Define read-only analyzer inputs.
- Define advisory output shape.
- Define identity, scope, and provenance rules.
- Define what data must be considered unavailable, placeholder, or low-confidence.
- Define future mutation handoff requirements without implementing them.

Explicitly out of scope:
- Analyzer implementation.
- Analyzer UI.
- Roster/farm/offseason writes.
- Executable call-up/send-down/free-agent/trade/draft recommendations.
- New farm flavor/morale systems.
- Designing exact recommendation algorithms beyond interface-level planning.

Likely files:
- Documentation only unless explicitly approved.
- Potential doc target: `spec-docs/FRANCHISE_ROSTER_ANALYZER_PLANNING.md`.
- Source references:
  - `src/utils/franchisePlayerStorage.ts`
  - `src/utils/franchiseFarmStorage.ts`
  - `src/utils/franchiseRosterMovement.ts`
  - `src/utils/franchiseSaveSlotManifest.ts`
  - `src/utils/gameReplayAudit.ts`
  - `src/utils/seasonAggregator.ts`
  - `src/utils/transactionStorage.ts`
  - `src/src_figma/app/components/TeamHubContent.tsx`

Tests:
- Planning wave has no runtime tests.
- It should specify future tests for read-only data loading, no League Builder reads, no mutations, roster status filtering, incomplete archive exclusion, and confidence flags.

Dependencies:
- None for read-only planning, but it must explicitly account for:
  - scoped-global hybrid,
  - manifest/save lifecycle status,
  - franchise-owned roster/farm storage,
  - blocked Phase 11 adapters,
  - snapshot aggregation plus replay audit bridge,
  - deferred narrative/morale/farm flavor systems.
- Analyzer implementation should wait for Wave D writer hardening.
- Analyzer-driven mutation should wait for Wave A, Wave B, and relevant Wave D/offseason adapters.

Risk level:
- Low for read-only planning. High for implementation or mutation execution.

Recommended reasoning level:
- High.

Exact planning prompt:

```text
Recommended reasoning: High

Please create a read-only roster analyzer planning document.

Do not implement analyzer code.
Do not add analyzer UI.
Do not write roster, farm, transaction, offseason, or League Builder data.
Do not design executable mutation recommendations yet.

Use:
/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_IMPLEMENTATION_ROADMAP_POST_AUDIT.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_4_FARM_ROSTER_MOVEMENT_BOUNDARY.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md

Create:
/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_ROSTER_ANALYZER_PLANNING.md

The plan should define:
1. Read-only input domains and required identity filters.
2. Explicitly forbidden data sources, especially League Builder templates and global/static offseason data.
3. Roster status and farm-state interpretation.
4. Stat confidence rules under snapshot-derived aggregation plus replay audit.
5. Advisory output contract, with no executable writes.
6. Future implementation gates for call-up/send-down, free agency, draft, trade, and offseason recommendations.
7. Tests that would be required before any analyzer implementation.

Finish with a yes/no recommendation on whether analyzer implementation can start, and list blockers.
```

## 3. Roster Analyzer Decision Gate

### Safe Now

- Read-only planning.
- Data-source inventory.
- Provenance rules.
- Advisory output contract.
- Confidence scoring rules for missing, legacy, placeholder, or replay-limited data.
- Future test plan.

### Not Safe Yet

- Analyzer implementation.
- Analyzer UI with actionable writes.
- Any roster mutation execution.
- Call-up/send-down recommendations that execute writes.
- Trade/free-agent/draft/retirement/contraction recommendation execution.
- Farm promotion/demotion automation.
- Recommendations that rely on global/prototype morale, adaptive standards, park factors, or farm flavor.
- Recommendations that treat live mutable stats as historical truth after a persisted summary exists.

### Dependencies The Analyzer Must Respect

- Scoped-global hybrid is the current architecture.
- Manifest/save lifecycle export, delete, validation, and backup root coverage are implemented; import writes remain deferred.
- Durable transition journals and rollback hardening are implemented; pending/failed journals are warnings requiring human-visible repair handling, not automatic repair.
- Franchise-owned roster/farm storage exists but writer atomicity and phase semantics still need Wave D hardening.
- Phase 11 and prototype offseason adapters are blocked or guarded unless a real adapter exists.
- Production stats are snapshot-derived, with replay audit as the confidence bridge.
- Incomplete archives are diagnostic data, not normal season results.
- Narrative, morale, adaptive, park-factor, and farm flavor systems are deferred or placeholder unless explicitly scoped and durable.
- League Builder templates are not franchise state after setup.

## 4. Recommended Immediate Next Step

Do Wave F0 next: read-only roster analyzer planning.

Rationale:
- Wave A now provides manifest-driven export/delete/validation and the backup root coverage needed for the scoped-global hybrid.
- Wave B now provides durable transition journals and rollback hardening, with journal save-slot lifecycle coverage completed.
- Full-suite confidence is green at the checkpoint: 302 Vitest files and 6,348 tests passed, and build passed.
- Read-only analyzer planning can now map inputs, constraints, trust levels, and non-mutating output contracts without adding app code.
- Offseason adapters are larger implementation work and should wait until the read-only planning pass clarifies analyzer-facing data needs and write boundaries.
- Import writes, exact restore, remapped clone import, career/milestone canonical scoping, and transition journal repair UI remain future work.

If you want to parallelize across threads, the safest split is:
- Thread 1: Read-only roster analyzer planning.
- Thread 2: Optional maintenance-only test noise cleanup.
- Do not run analyzer implementation, import-write implementation, or offseason mutation work in parallel with the planning pass.

## Top 10 Implementation Priorities

1. Create a read-only roster analyzer planning artifact.
2. Harden roster/farm writers for atomicity, phase context, status rules, and failure rollback before any analyzer-driven mutation exists.
3. Implement the first low-risk franchise-owned offseason adapter, likely ratings or retirement.
4. Design deferred save-slot import writes, exact restore, and remapped clone import.
5. Add transition journal repair UI/workflows for pending and failed journals.
6. Add canonical franchise scope to career stats and milestones before including them in export/delete.
7. Add durable scoped storage only for derived/flavor systems approved for v1 history.
8. Add event/query indexes needed by large franchise save export, replay audit, story/feed, and playoff/stat queries.
9. Reduce legacy global marker and fallback usage to compatibility-only paths.
10. Keep replay/stat audit expansion alive for season-level clutch/fWAR/pitcher-decision confidence without replacing production aggregation yet.

## Top 10 Test Priorities

1. Roster analyzer planning tests/spec checks once the planning artifact defines input contracts.
2. Roster/farm writer atomicity and rollback failure matrix before any analyzer writes exist.
3. Save-slot exact restore and remapped clone import tests when import writes are implemented.
4. Transition journal repair UI tests when repair workflows are implemented.
5. Career/milestone canonical scoping tests before those domains enter export/delete.
6. Active/farm/free-agent/released/retired/inactive/unassigned roster status exclusion matrix.
7. Offseason adapter tests proving no League Builder/global mutation in franchise context.
8. Derived/flavor historical fidelity tests, including placeholders for deferred systems.
9. Replay audit season-level clutch/fWAR/pitcher-decision confidence tests, while production aggregation remains snapshot-derived.
10. Maintenance tests for any cosmetic/non-blocking full-suite warnings that become noisy again.

## Exact Next Prompt To Run

```text
Recommended reasoning: High

Please create Wave F0: read-only roster analyzer planning.

Do not implement app code.
Do not implement roster analyzer code.
Do not design recommendation algorithms in executable detail.
Do not start offseason adapters.
Do not implement import writes.
Do not migrate to the strict two-database Spine model.
Do not add roster, farm, transaction, or offseason mutations.

Use:
/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_IMPLEMENTATION_ROADMAP_POST_AUDIT.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_AUDIT_CROSS_PASS_SYNTHESIS.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_4_FARM_ROSTER_MOVEMENT_BOUNDARY.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_2_GAMEPLAY_EVENT_PIPELINE.md
/Users/johnkruse/Projects/kbl-tracker/spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md

Goals:
1. Create a planning document for a read-only roster analyzer/recommendation planning pass.
2. Identify allowed read sources and forbidden/deferred sources under the scoped-global hybrid.
3. Define analyzer input contracts for franchise teams, players, roster/farm status, schedules, completed games, season stats, summaries, transactions, transition journals, and deferred/prototype domains.
4. Define output boundaries: advisory/read-only only, no executable writes, no automatic roster/farm/offseason/transaction mutations.
5. List trust levels and known limitations for snapshot-derived stats, replay audit evidence, incomplete archives, career/milestone deferral, fan morale/adaptive/park-factor placeholders, and pending/failed transition journals.
6. Produce dependency gates before any future analyzer implementation.

Output:
- Recommended analyzer planning document path.
- Data source map.
- Forbidden/deferred source map.
- Read-only output contract.
- Implementation gates.
- Test plan for a future implementation.
- Explicit recommendation on whether implementation should wait for roster/farm writer atomicity and offseason adapter work.

No tests/build required unless code is touched.
```
