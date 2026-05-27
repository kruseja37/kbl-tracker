# Franchise Audit Cross-Pass Synthesis

Date: 2026-05-22

Scope:
- This is a synthesis and planning artifact only.
- It does not implement code.
- It does not add roster analyzer work.
- It does not design the roster analyzer or recommendation engine.

Primary sources:
- `spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md`
- `spec-docs/AUDIT_PASS_2_GAMEPLAY_EVENT_PIPELINE.md`
- `spec-docs/AUDIT_PASS_3_SEASON_END_OFFSEASON_BOUNDARY.md`
- `spec-docs/AUDIT_PASS_4_FARM_ROSTER_MOVEMENT_BOUNDARY.md`
- `spec-docs/AUDIT_PASS_5_DERIVED_FLAVOR_SYSTEMS.md`
- `spec-docs/AUDIT_PASS_6_DEFERRED_PROTOTYPE_LEAKAGE.md`
- `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md`
- `spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md`
- `spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md`
- `spec-docs/FRANCHISE_MODE_REPO_AUDIT.md`
- `spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md`
- `spec-docs/MODE_2_V1_FINAL.md`
- `spec-docs/MODE_2_SECTION_MAP.md`
- `spec-docs/SPINE_ARCHITECTURE.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`
- `spec-docs/FARM_SYSTEM_SPEC.md`

## 1. Executive Summary

Mode 2 franchise core is now substantially more mature than the original Waves 1-3 baseline. After Waves 1-4, Pass 1A-1C, Pass 2A-2B, Pass 3-6 blocker patches, and closeout reviews, the repo has a buildable Mode 2 v1 spine for:

- franchise setup copy-not-reference team/player snapshots,
- canonical franchise season identity,
- scoped schedules, completed games, stats, playoffs, offseason state, transactions, and event logs,
- restored and direct-entry GameTracker identity,
- aggregation-failure blocking,
- ledger-before-mutation between-play writes,
- durable season summary and Mode 2 -> Mode 3 handoff records,
- active MLB roster filtering for franchise GameTracker launch,
- guarded/deferred prototype surfaces,
- and explicit mode/competition guardrails between exhibition, elimination, and franchise paths.

The franchise core is not production-complete as a full save-slot platform. The accepted near-term architecture is the scoped-global hybrid, not the strict physical two-database Spine model. `kbl-franchise-{id}` owns copied teams and players, while most season/game/event/stat/playoff/offseason records live in shared stores with canonical identity. The architecture decision accepts this as Mode 2 v1 reality only if identity, query filters, manifest ownership, and mode guardrails are kept strict (`spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md:15-24`, `spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md:84-90`, `spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md:116-145`).

What is now safe/stable:

- Franchise regular-season and playoff launch identity can carry `franchiseId`, `seasonNumber`, canonical `seasonId`, `statsScopeId`, `scheduleGameId`, playoff identity, and mode/competition identity.
- GameTracker resume paths can recover canonical scope from navigation state, persisted snapshots, and durable event-log headers.
- End-game success no longer proceeds after failed season aggregation; incomplete diagnostic archives are marked and excluded by default.
- Franchise playoff records and fielding/stat aggregation are isolated from elimination playoff records.
- Season finalization creates durable `FranchiseSeasonSummary` records before advancing, with explicit persisted snapshots/placeholders and old-season fallback.
- Franchise roster launch now filters to active MLB/eligible copied franchise players.
- Durable call-up/send-down writers and franchise-scoped farm storage exist as a boundary layer, with League Builder mutation prohibited for franchise roster movement.
- Offseason prototype and deferred surfaces are guarded, hidden, read-only, or skip-only for franchise v1 where needed.

What is intentionally deferred:

- Physical migration to the strict two-database Spine model.
- Manifest-driven export/import/delete/backup/sync execution for the entire franchise save slot.
- A transition journal that can roll back all internal season-transition side effects atomically.
- Full production event-log replay aggregation; production aggregation remains snapshot-derived for v1, with a non-mutating replay audit bridge.
- Full franchise-owned offseason algorithms for free agency, draft, retirement, ratings, trades, chemistry, spring training, contraction/expansion, and awards.
- Full farm algorithms, farm morale, farm narrative, mechanical farm effects, and complete roster analyzer integration.
- Synthetic simulation for franchise v1.
- Franchise double-switch support.
- Durable fan morale/adaptive standards/park-factor systems as franchise history.

Biggest remaining risks:

1. Save-slot lifecycle execution is still incomplete for the scoped-global hybrid.
2. Season transition rollback is staged but not fully journaled.
3. Production stats remain snapshot-derived, so event replay is an audit bridge rather than the source of truth.
4. Roster movement writers need stronger atomicity, richer phase semantics, and broader status tests before analyzer-driven actions can be allowed.
5. Derived/flavor systems remain partly placeholder/global unless kept explicitly non-durable.
6. Legacy global markers and compatibility fallbacks still exist and must not become franchise source of truth.
7. Focused tests are strong; broad full-suite status and test noise remain release debt.

## 2. Pass-By-Pass Summary

| Pass | Audited | Major blockers found | Fixed/remediated | What remains | Closeout status |
|---|---|---|---|---|---|
| Pass 1: Spine/shared franchise data contract | Two-database model, copy isolation, identity, handoffs, export/import/delete, legacy globals | Export/import/delete did not cover full save slots; strict Spine model drifted into undocumented hybrid; visible reads touched League Builder; transactions lacked canonical identity; new-season rollback gap | Pass 1A added transaction identity, visible franchise read hardening, new-season reorder/cleanup, mode/competition guardrails. Pass 1B accepted scoped-global hybrid. Pass 1C added read-only manifest validator | Full manifest-driven export/import/delete/backup/sync execution; transition journal; optional indexes; legacy marker cleanup | Complete enough for audit progression, not complete as save-slot platform |
| Pass 2: Gameplay/event/stat pipeline | GameTracker one-tap flow, event model, enrichment, between-play events, baseball rules, pitcher/fielding stats, LI/WPA/clutch | Failed aggregation could still look successful; events lacked consistent identity; between-play writes could be fire-and-forget; playoff aggregation scope incomplete; production replayability not proven | Pass 2A blocked success after aggregation failure, added canonical event identity, enforced ledger-before-mutation, filtered incomplete archives, hardened playoff aggregation scope. Pass 2B added non-mutating replay audit and golden fixtures | Snapshot-derived production aggregation remains accepted v1; full production replay, strict append-only event storage, full fWAR/season-clutch proof, broad substitution matrix remain deferred | Complete enough for Pass 3 and v1 boundary work |
| Pass 3: Season-end/offseason boundary | Mode 2 -> Mode 3 summary/handoff, finalization safety, SeasonSummary rendering, Mode 3 -> Mode 2 new-season handoff | Franchise playoff creation in SeasonSummary could seed from League Builder/global team data | Blocker patch made franchise playoff creation use franchise-owned snapshots, surface failures, and reject missing/damaged snapshots without global fallback | Transition journal; durable new-season handoff object; deeper farm/offseason movement algorithms | Complete enough for Pass 4 |
| Pass 4: Farm/roster movement boundary | Franchise roster data, in-season movement, offseason Phase 11, farm contract, analyzer dependencies | GameTracker roster launch could leak farm/free-agent/unassigned players once movement exists; farm storage was prototype/global; local-only Phase 11 controls unsafe; TeamHub visible reads used global/static roster sources | Pass 4A added active MLB launch filtering, franchise-scoped farm storage, durable call-up/send-down writers with canonical transactions, Phase 11 guard, TeamHub franchise-owned reads | Writer atomicity; hardcoded/offseason phase context risk; richer contracts/injuries/options semantics; explicit tests for every inactive status | Complete enough for Pass 5, but roster movement must be hardened before analyzer execution |
| Pass 5: Derived/flavor systems | News/reporter, milestones, awards/leaders, fan morale, park factors, adaptive standards, mojo/fitness, summary placeholders | Franchise playoff reporter/news records were downcast to elimination; SeasonSummary derived visible historical sections from live stats despite persisted summaries | Blocker patch preserved franchise playoff identity for reporter/news paths and made persisted-summary mode use persisted snapshots/placeholders for leaders, WAR, awards, and key performers | Durable fan morale, adaptive standards, park-factor snapshots, legacy/damaged story normalization, dedicated story/feed indexes | Complete enough for Pass 6 if placeholders remain honest |
| Pass 6: Deferred/prototype leakage | Synthetic sim, unsupported GameTracker behavior, prototype offseason leakage, unsupported tabs/routes, automatic deferred effects | Offseason TradeFlow could write franchise trade records from global/static data; hook-level double-switch could still mutate franchise game state; contraction/expansion copy implied active v1 workflow | Blocker patch rendered franchise TradeFlow read-only/placeholder and non-mutating, added hook-level franchise double-switch guard, made contraction/expansion skip-only/read-only, added negative action-surface tests | Full production versions of deferred systems; broad component coverage for every dormant route; cleanup of noisy warnings/full-suite debt | Audit passes complete for v1 boundary work |

## 3. Current Architecture Truth

### Scoped-Global Hybrid

The strict Spine model describes a global metadata database plus a physical per-franchise database containing nearly all franchise records. The repo does not implement that physical model today. The accepted Mode 2 v1 truth is:

```text
kbl-app-meta
  franchiseList, franchiseConfigs, appSettings, eliminationList

kbl-franchise-{id}
  players, teams

Shared manifest-owned stores
  kbl-schedule.scheduledGames
  kbl-tracker.seasonMetadata
  kbl-tracker.playerSeason*
  kbl-tracker.currentGame
  kbl-tracker.completedGames
  kbl-tracker.franchiseSeasonSummaries
  kbl-event-log.gameHeaders
  kbl-event-log.atBatEvents
  kbl-event-log.pitchingAppearances
  kbl-event-log.fieldingEvents
  kbl-event-log.betweenPlayEvents
  kbl-playoffs.playoffs/series/playoffGames/playoffStats
  kbl-offseason.offseasonState and phase stores
  kbl-transactions.transactions
  kbl-franchise-farm.farmPlayers
```

Correctness depends on identity-bearing shared records, scoped reads/writes/deletes/exports, and explicit exclusions for League Builder templates and device/global markers.

### Canonical Identity Expectations

For franchise-owned records, the canonical identity set is:

- `franchiseId`
- `seasonNumber`
- canonical `seasonId`, normally `{franchiseId}-season-{n}`
- `statsScopeId`, normally the canonical `seasonId` for franchise regular-season stats
- `scheduleGameId` for scheduled regular-season games
- `competitionType` and `competitionId`
- `playoffId`, `playoffSeriesId`, and `playoffGameNumber` for playoff games
- `offseasonId`, normally `offseason-{seasonId}`, where offseason state applies

Legacy/non-franchise callers may still omit some fields, but franchise write boundaries should be stricter than shared storage types.

### Franchise Save-Slot Manifest Status

`src/utils/franchiseSaveSlotManifest.ts` now provides a read-only ownership map for the scoped-global hybrid. It classifies per-franchise DB records, manifest-owned shared records, device/global state, template-only state, and deferred/prototype state. It includes current and newly introduced farm domains, and sync/backup metadata has schema-level awareness of `franchiseSeasonSummaries` and `kbl-franchise-farm`.

The manifest is not yet an execution engine. Export/import/delete/backup/sync still need a dedicated save-lifecycle wave. Until then, the platform can validate ownership shape but cannot fully move, clone, delete, or restore a franchise save slot.

### Production Snapshot Aggregation Plus Replay Audit Bridge

The accepted v1 stats architecture is hybrid:

- Production season aggregation remains snapshot-derived from completed game state.
- Pass 2A prevents failed aggregation from being archived/registered as a normal success.
- Pass 2B adds `src/utils/gameReplayAudit.ts` as a non-mutating audit bridge with golden fixtures.
- Unsupported or limited replay coverage is reported honestly rather than silently ignored.

This is explicitly not a production event-sourced replacement yet (`spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md:16-22`, `spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md:524-547`, `spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md:557-563`).

### Durable SeasonSummary Status

`FranchiseSeasonSummary` is now a durable handoff artifact for Mode 2 -> Mode 3. It is keyed by canonical franchise season identity, includes copied snapshots/references for standings, completed games, stats, playoff state, and offseason identity, and exposes explicit placeholders for deferred derived systems.

SeasonSummary UI reads persisted summaries when available and falls back safely for old seasons without summaries. Persisted-summary mode should not quietly replace historical summary sections with live mutable stats.

### Farm/Roster Boundary Status

The current boundary is good enough to protect v1 runtime correctness:

- copied franchise players/teams are the source for franchise roster/team reads,
- GameTracker launch excludes farm/free-agent/released/retired/inactive/unassigned players from active rosters,
- franchise-scoped farm storage exists,
- call-up/send-down writers update franchise state and write canonical transactions,
- local-only Phase 11 controls are blocked in franchise finalization,
- TeamHub franchise roster/stat rows prefer copied franchise data.

The boundary is not yet a complete roster/farm platform. Atomic writer behavior, phase-aware roster semantics, richer player fields, and complete option/injury/contract interactions remain future work.

### Deferred/Prototype Guard Status

Pass 6 leaves the repo in a safer v1 posture:

- synthetic simulation remains hidden/guarded for franchise,
- double switch is guarded at UI and hook level in franchise,
- TradeFlow is placeholder/read-only for franchise and does not write prototype trade records,
- contraction/expansion is skip-only/read-only in franchise v1,
- all-star/trade/analyzer surfaces are hidden or dormant,
- automatic mojo/fitness reset/decay does not run during franchise finalization,
- fan morale, adaptive, park-factor, farm narrative, and mechanical farm effects remain placeholder/deferred rather than durable franchise history.

## 4. Remaining Risk Register

| Severity | Domain | Description | Why it matters | Current mitigation | Recommended resolution wave | Blocks future work? |
|---|---|---|---|---|---|---|
| High | Save-slot lifecycle | Export/import/delete/backup/sync execution does not yet operate from the manifest across all scoped global stores | A franchise cannot yet be confidently cloned, restored, deleted, synced, or backed up as a complete save slot | Read-only manifest validator; scoped identity fields on key records | Wave A: save-slot lifecycle execution | Blocks production-ready save management, cloud/sync, and any feature that writes new durable domains broadly |
| High | Transition safety | No full transition journal for season/offseason/new-season side effects | A failure after staged work can still require manual cleanup or leave partial side effects | Summary-before-advance, staged metadata/schedule ordering, cleanup on known failures | Wave B: transition journal and rollback | Blocks complex offseason automation and high-confidence season automation |
| High | Stats/replay | Production aggregation remains snapshot-derived, not event-log replay-derived | Corrections/recovery/recompute cannot yet rely on event stream as sole source of truth | Non-mutating replay audit, golden fixtures, incomplete archive filtering | Wave C: replay/stat audit expansion, then optional production replay migration | Does not block planning, but blocks strict event-sourced stats promises |
| Medium-high | Event/query performance | Several identity fields are optional and some shared stores are under-indexed for franchise queries | Large saves can require scans and damaged records can be harder to isolate | Canonical write paths, scope validators, manifest validation | Wave A or C: index/query hardening | Blocks scalable export/query/recovery, not v1 gameplay |
| Medium-high | Roster movement atomicity | Call-up/send-down writers exist but need stronger atomicity and phase semantics | Analyzer-driven or batch roster moves could create partial player/team/farm/transaction writes | Focused writer tests, no League Builder mutation, scoped farm storage | Wave D: roster/farm writer hardening | Blocks roster analyzer execution and automated roster recommendations |
| Medium-high | Offseason adapters | Most offseason algorithms are still guarded/prototype rather than franchise-owned adapters | Users cannot run a complete real franchise offseason through all phases | Guarded/read-only flows, Phase 11 v1 guard, durable summary handoff | Wave E: franchise-owned offseason adapter roadmap and first adapters | Blocks production offseason depth |
| Medium | Derived systems | Fan morale, adaptive standards, park factors, designations, and some awards/milestones are placeholder, global, or partially scoped | These systems can contaminate historical franchise records if activated without scoped storage | Explicit summary placeholders, prototype guards, no automatic activation | Wave F: derived/flavor scoping decisions and storage | Blocks durable flavor/history expansion |
| Medium | Legacy globals | `kbl-current-season` and other compatibility markers remain in global/localStorage pathways | A fallback can accidentally become franchise source of truth if reused | FranchiseHome/SeasonSummary/finalization use franchise metadata; marker skips for v1 finalization | Wave A/G: legacy marker audit and cleanup | Blocks complete save-slot confidence |
| Medium | Mode crossover | Elimination and franchise both use playoff-like records and GameTracker concepts | Cross-mode reads can corrupt summaries, stats, or reporter/news records | `modeCompetitionScope`, playoff source discrimination, tests | Ongoing guardrail tests in every storage wave | Blocks any new shared playoff/stat/reporter writes unless guarded |
| Medium | Full-suite confidence | Focused tests are strong, but broad full-suite status has known debt and warnings | Hidden regressions can survive narrow audit suites | Focused pass suites; documented warnings and unrelated debt | Wave H: test stabilization | Blocks release confidence, not audit synthesis |
| Medium | Story/feed indexes | Story/commentary/almanac identity has been hardened but lacks dedicated franchise/playoff indexes in places | Historical franchise narrative queries can become slow or fragile | Identity preservation and scoped tests | Wave F or A: index/save-lifecycle work | Blocks large narrative archives |
| Medium-low | UI phase routing | Some deferred phases still route to guarded placeholders or skip-only copy | Users may see confusing inactive workflows if copy drifts | Pass 6 placeholder/skip-only guardrails | Wave E/F: prototype surface cleanup | Does not block core, blocks polished offseason UX |
| Low-medium | Strict append-only policy | Corrections remain audited overwrites with version/edit history, not physical append-only events | Spec replay ideal remains partly drifted | Explicit Pass 2B documentation and replay issue reporting | Wave C: correction/replay policy decision | Does not block v1, blocks strict auditability claims |
| Low-medium | Farm flavor | Farm morale/narrative/mechanical effects are spec-rich but runtime-deferred | Easy to overbuild before roster ownership and atomics are ready | Boundaries only; no farm algorithm work | After Wave D and F | Blocks farm flavor implementation, not planning |

## 5. Updated Implementation Roadmap

### Wave A: Manifest-Driven Save-Slot Lifecycle Execution

Purpose:
- Turn the Pass 1C manifest from a validator into the source of truth for franchise export/import/delete/backup/sync execution.

Scope:
- Implement export, exact restore, remapped clone import, delete cleanup, backup coverage, and sync eligibility for all manifest-owned domains.
- Validate every exported record's franchise, season, stats, playoff, schedule, and offseason identity.
- Exclude League Builder templates, device globals, and legacy markers except for explicit provenance/compatibility policy.

Out of scope:
- Strict two-database migration.
- Roster analyzer work.
- New offseason algorithms.

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

Tests:
- Two-franchise same-season export isolation.
- Exact restore round trip.
- Remapped clone import identity rewrite.
- Delete cleanup across per-franchise DB and scoped shared stores.
- Exclusion tests for League Builder, localStorage markers, elimination records, and device globals.
- Backup/sync schema coverage for summaries, farm, event logs, playoffs, transactions, completed games, and offseason state.

Dependencies:
- Existing manifest validator and mode/competition scope guardrails.

Recommended reasoning level:
- Extra High.

### Wave B: Transition Journal And Rollback Hardening

Purpose:
- Close the remaining partial-advance window around season finalization and new-season start.

Scope:
- Add a transition journal for summary creation, `executeSeasonTransition`, season metadata staging, schedule generation, franchise metadata update, offseason state start/load, and cleanup.
- Make direct START SEASON and FinalizeAdvanceFlow share one transaction boundary where possible.
- Provide recovery/repair behavior for interrupted transitions.

Out of scope:
- New offseason algorithms.
- Export/import work beyond journal domain classification.

Likely files:
- `src/engines/seasonTransitionEngine.ts`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/utils/franchiseManager.ts`
- `src/utils/scheduleStorage.ts`
- `src/utils/seasonStorage.ts`
- `src/utils/offseasonStorage.ts`

Tests:
- Failure after summary creation.
- Failure inside transition.
- Failure after metadata staging but before franchise metadata update.
- Failure after schedule generation.
- Recovery after interrupted journal states.
- Non-franchise behavior preservation.

Dependencies:
- Durable summary storage and existing staged cleanup behavior.

Recommended reasoning level:
- Extra High.

### Wave C: Replay/Stat Audit Expansion And Recompute Strategy

Purpose:
- Strengthen the event/stat confidence bridge without replacing production aggregation prematurely.

Scope:
- Expand replay audit fixtures for pitcher decisions, holds/saves/blown saves, inherited runners, fWAR fielding rows, season clutch, manager moments/mWAR, restored games, corrections, and playoff context.
- Add query/index support where replay audit currently scans under-indexed stores.
- Decide when, if ever, production aggregation should migrate from snapshots to event replay.

Out of scope:
- Immediate production replay replacement unless a separate decision approves it.
- Roster analyzer work.

Likely files:
- `src/utils/gameReplayAudit.ts`
- `src/utils/eventLog.ts`
- `src/utils/seasonAggregator.ts`
- `src/utils/processCompletedGame.ts`
- `src/utils/gameStorage.ts`
- `src/utils/playoffStorage.ts`
- `src/utils/tests/gameReplayAudit.test.ts`

Tests:
- Golden fixture expansion.
- Mismatch severity/confidence assertions.
- Season-level clutch/fWAR parity smoke tests.
- Playoff multiplier/context tests.
- Damaged identity reporting.

Dependencies:
- Pass 2B audit bridge.

Recommended reasoning level:
- High.

### Wave D: Roster/Farm Writer Hardening

Purpose:
- Make roster/farm mutations safe enough to support future read-only analyzer planning and later controlled recommendation execution.

Scope:
- Add atomic write behavior or compensating rollback for player/team/farm/transaction updates.
- Replace hardcoded phase assumptions with explicit phase context.
- Expand player/team schema coverage for roster status, roster level, options, contracts, injuries/list fields, reveal state, traits, chemistry placeholders, and visibility.
- Add stricter eligibility tests for released, retired, inactive, unassigned, farm, free-agent, and damaged legacy players.

Out of scope:
- Designing or implementing the roster analyzer.
- Full farm morale/narrative/mechanical algorithms.
- Full free agency/draft/trade algorithms.

Likely files:
- `src/utils/franchiseRosterMovement.ts`
- `src/utils/franchiseFarmStorage.ts`
- `src/utils/franchisePlayerStorage.ts`
- `src/src_figma/app/utils/franchiseGameTrackerRoster.ts`
- `src/src_figma/app/components/TeamHubContent.tsx`
- `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`
- `src/src_figma/hooks/useFranchiseData.ts`

Tests:
- Atomicity/rollback on each failed write point.
- Status exclusion matrix.
- Options/reveal transaction identity.
- TeamHub roster/stat/farm filtering.
- No League Builder mutation.

Dependencies:
- Pass 4A roster boundary.

Recommended reasoning level:
- High.

### Wave E: Franchise-Owned Offseason Adapter Plan And First Safe Adapter

Purpose:
- Move from guarded prototypes to real franchise-owned offseason mutation paths one controlled adapter at a time.

Scope:
- Refresh the offseason adapter plan around franchise DB ownership.
- Pick the first low-blast-radius adapter, likely ratings or retirement, and make it write only franchise-owned storage with canonical offseason/season identity.
- Keep trade/free agency/draft/farm/chemistry/spring-training read-only until their adapters are ready.

Out of scope:
- Full offseason algorithm suite.
- Roster analyzer design.
- Activating global/prototype mutation paths.

Likely files:
- `src/src_figma/app/components/RatingsAdjustmentFlow.tsx`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/src_figma/app/utils/franchiseOffseasonGuards.ts`
- `src/utils/offseasonStorage.ts`
- `src/utils/franchisePlayerStorage.ts`
- `src/utils/transactionStorage.ts`

Tests:
- Adapter writes only franchise DB/scoped stores.
- Old prototype League Builder mutation functions are not called.
- Canonical offseason/season identity preserved.
- Non-franchise/prototype behavior preserved where intentionally supported.

Dependencies:
- Wave D preferred before mutation-heavy adapters.
- Wave B preferred before fully automated finalization.

Recommended reasoning level:
- High.

### Wave F: Derived/Flavor Storage Scoping Decisions

Purpose:
- Decide which derived/flavor systems become durable franchise history and which remain placeholder/deferred.

Scope:
- Document and, where approved, add scoped storage boundaries for fan morale, adaptive standards, park factors, awards, milestones, designations, story feeds, commentary, and almanac narratives.
- Preserve explicit placeholders in summaries until a system is durable.
- Add save-slot manifest entries/index requirements for activated durable derived systems.

Out of scope:
- Implementing farm narrative/mechanical algorithms.
- Replacing placeholder systems without storage and test gates.

Likely files:
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/utils/almanacNarrativeArchive.ts`
- `src/src_figma/app/hooks/useCommentaryFeed.ts`
- `src/types/reporter.ts`
- `src/engines/fanMoraleEngine.ts`
- `src/engines/adaptiveLearningEngine.ts`
- `src/utils/franchiseSaveSlotManifest.ts`

Tests:
- Multi-franchise same-season story/feed isolation.
- Persisted-summary fidelity.
- Placeholder assertions.
- No prototype/global data presented as durable history.

Dependencies:
- Wave A for save-slot execution if new durable stores are added.

Recommended reasoning level:
- High.

### Wave G: Documentation And Roadmap Refresh

Purpose:
- Bring the roadmap/spec docs in line with the completed audit sequence and accepted architecture truth.

Scope:
- Update `FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md`.
- Link the architecture decision, Pass 2B stance, Pass 6 disposition, and this synthesis.
- Mark Waves 1-4, Pass 1A-1C, Pass 2A-2B, and Pass 3-6 blockers as closed.
- Add the next implementation waves and gates.

Out of scope:
- Runtime code changes.
- Roster analyzer design.

Likely files:
- `spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md`
- `spec-docs/FRANCHISE_MODE_REPO_AUDIT.md`
- `spec-docs/SPINE_ARCHITECTURE.md` if an explicit spec reconciliation note is approved

Tests:
- Not applicable beyond doc review.

Dependencies:
- This synthesis.

Recommended reasoning level:
- High.

### Wave H: Full-Suite And Warning Debt Stabilization

Purpose:
- Convert focused audit confidence into broader regression confidence.

Scope:
- Run the broad suite.
- Categorize failures into franchise blockers, unrelated app regressions, stale test assumptions, and noisy warnings.
- Fix stale IndexedDB/React act warnings where they obscure real failures.
- Preserve focused franchise smoke suites for future waves.

Out of scope:
- Feature work.
- Roster analyzer work.

Likely files:
- Test setup/config files.
- Affected stale tests discovered during the run.

Tests:
- Full suite or agreed representative suites.
- Focused Pass 1-6 suites.

Dependencies:
- None, but should happen before major user-facing release or large feature branch.

Recommended reasoning level:
- Medium to High.

## 6. Test Status

Focused test confidence is strong for the audited boundaries:

- Waves 1-4 and Pass 1A-1C added coverage for setup copy/rollback, canonical season identity, schedule/completed-game scoping, visible reads, transaction identity, mode/competition guardrails, summary creation, and manifest validation.
- Pass 2A and 2B added coverage for aggregation failure handling, canonical event identity, ledger-before-mutation ordering, incomplete archive filtering, playoff aggregation scope, replay audit fixtures, unsupported/limited replay reporting, corrections/undone rows, and normalized D3K/error clutch attribution.
- Pass 3 blocker tests prove franchise playoff creation uses franchise-owned snapshots and rejects missing/damaged snapshots without falling back to globals.
- Pass 4A tests cover active roster launch filtering, scoped farm storage, durable roster movement, Phase 11 guardrails, and TeamHub scoping.
- Pass 5 tests cover reporter/news identity and persisted SeasonSummary display fidelity.
- Pass 6 negative action-surface tests cover synthetic sim, unsupported tabs, TradeFlow mutation guard, hook-level double-switch guard, and contraction copy.

Full-suite status is not equivalent to focused-suite confidence:

- Prior closeouts treated unrelated full-suite failures and noisy warnings as test debt, not blockers for audit progression.
- Known categories include stale reporter DB version assumptions, League Builder query ambiguity, React `act` warnings, and `indexedDB is not defined` warnings in older component tests.
- The next major feature wave should either run and triage the full suite or explicitly declare the focused-suite gate being used.

Tests that should be fixed before major feature work:

1. Full save-slot export/import/delete/backup/sync round trip and isolation.
2. Transition journal failure/recovery coverage.
3. Roster movement atomicity and status exclusion matrix.
4. Event/query index coverage for large replay/export workloads.
5. Full action-surface smoke tests across exhibition, elimination, and franchise modes.
6. Persisted summary fidelity component tests for old and new seasons.
7. Full-suite stale warning cleanup where warnings obscure real failures.

Tests that can remain planned if the corresponding systems stay deferred:

1. Full production event replay replacement.
2. Farm morale/narrative/mechanical effects.
3. Durable fan morale/adaptive/park-factor history.
4. Full offseason trade/free agency/draft/contraction algorithms.
5. Roster analyzer recommendation execution.

## 7. Roster Analyzer Readiness

The platform is conditionally ready for a roster analyzer planning pass, not for analyzer implementation or roster mutation execution.

Planning can proceed if it stays read-only and respects these constraints:

- It must consume copied franchise player/team state, not League Builder templates.
- It must treat the scoped-global hybrid as current truth.
- It must read stats through canonical `seasonId`/`statsScopeId` and exclude incomplete archives by default.
- It must respect active/farm/free-agent/released/retired/inactive/unassigned roster status.
- It must treat snapshot-derived production stats as accepted v1 data with replay-audit caveats.
- It must not trigger deferred/prototype systems, synthetic sim, automatic morale effects, or offseason mutations.
- It must not write roster transactions, farm state, player/team records, or League Builder records.
- It must explicitly separate exhibition, elimination, and franchise contexts.
- It should define recommendation output as a read-only advisory contract first.

Analyzer implementation should wait until at least Wave D roster/farm writer hardening is complete. Analyzer-driven mutation should wait until save-slot lifecycle execution, transition journal safety, and relevant offseason adapters are complete.

## 8. Recommended Next Prompt

Recommended next step: roadmap refresh before more implementation. The audit sequence changed the architecture truth enough that the roadmap should be updated before another runtime wave starts.

Exact next prompt:

```text
Recommended reasoning: High

Please refresh the franchise implementation roadmap from:

/Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_AUDIT_CROSS_PASS_SYNTHESIS.md

Scope:
- Documentation/planning only.
- Do not implement code.
- Do not add roster analyzer work.
- Do not design the roster analyzer/recommendation engine.

Update:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_2_GAMEPLAY_EVENT_PIPELINE.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_3_SEASON_END_OFFSEASON_BOUNDARY.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_4_FARM_ROSTER_MOVEMENT_BOUNDARY.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_5_DERIVED_FLAVOR_SYSTEMS.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_6_DEFERRED_PROTOTYPE_LEAKAGE.md

Goals:
1. Mark Waves 1-4 and audit Passes 1-6 as closed for Mode 2 v1 boundary correctness, with explicit remaining risks.
2. Record the scoped-global hybrid as the accepted near-term architecture and strict two-database migration as deferred.
3. Record snapshot-derived production aggregation plus replay audit bridge as the accepted v1 stats stance.
4. Add the next implementation waves:
   - manifest-driven save-slot lifecycle execution,
   - transition journal/rollback hardening,
   - replay/stat audit expansion,
   - roster/farm writer hardening,
   - first franchise-owned offseason adapters,
   - derived/flavor storage scoping,
   - full-suite/test warning stabilization.
5. Add clear gates for roster analyzer planning versus implementation.

Output:
- Findings/changes summary first.
- Then the updated roadmap file.
- Finish with the exact first implementation prompt, likely Wave A save-slot lifecycle execution, unless the roadmap refresh identifies a stronger blocker.
```

## 9. Final Readiness

Is the franchise core ready for roster analyzer planning?

Conditional.

Yes for a read-only planning pass that defines inputs, ownership rules, constraints, and output shape. No for implementing analyzer-driven mutations or recommendations that write roster/farm/offseason state until the save-slot lifecycle, transition journal, and roster/farm writer hardening work are further along.

## Top 10 Remaining Franchise Risks

1. Manifest-driven export/import/delete/backup/sync execution is not implemented.
2. Season transition rollback lacks a full journal.
3. Production stat aggregation remains snapshot-derived.
4. Event/query indexes and optional identity fields are not fully hardened for large saves.
5. Roster movement writer atomicity and phase semantics need hardening.
6. Full franchise-owned offseason adapters are still mostly deferred.
7. Durable fan morale/adaptive/park-factor systems are placeholders or global/prototype.
8. Legacy global markers and compatibility fallbacks remain.
9. Full-suite confidence lags behind focused audit-suite confidence.
10. Future roster analyzer work could accidentally consume League Builder/static/global data unless its contract is nailed down first.

## Top 10 Recommended Next Work Items

1. Refresh `FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md` from this synthesis.
2. Implement manifest-driven save-slot export/import/delete/backup/sync execution.
3. Add a transition journal and recovery flow for finalization/new-season transitions.
4. Harden roster/farm writers for atomicity, phase context, and complete status rules.
5. Expand replay audit fixtures for pitcher decisions, fWAR, season clutch, and manager moments.
6. Add event/story/feed indexes needed by scoped franchise queries and exports.
7. Clean up legacy global marker dependencies and document compatibility-only paths.
8. Plan the first franchise-owned offseason adapter, preferably after roster writer hardening.
9. Stabilize broad test-suite debt and noisy warnings before a major feature branch.
10. Run a read-only roster analyzer planning pass only after the roadmap refresh records the above constraints.
