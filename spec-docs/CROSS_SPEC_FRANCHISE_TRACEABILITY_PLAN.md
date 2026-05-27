# Cross-Spec Franchise Traceability Plan

Date: 2026-05-21  
Repo: `/Users/johnkruse/Projects/kbl-tracker`  
Purpose: split the remaining franchise-mode verification work into bounded, cross-spec audit passes before more implementation.

## Scope Guard

This document is a planning artifact, not a repo audit and not an implementation plan for a specific patch.

Explicitly out of scope for this plan:
- App code changes.
- Roster analyzer or recommendation-engine implementation.
- Full repo audit.
- Full offseason feature expansion.
- Re-enabling synthetic simulation.

Future audits that use this plan should inspect the repo directly and cite file and line references for every repo claim. This plan only defines the audit map and the evidence categories to gather.

## Source Documents

- `spec-docs/MODE_2_V1_FINAL.md`
- `spec-docs/MODE_2_SECTION_MAP.md`
- `spec-docs/SPINE_ARCHITECTURE.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`
- `spec-docs/FARM_SYSTEM_SPEC.md`
- `spec-docs/FRANCHISE_MODE_REPO_AUDIT.md`
- `spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md`

Source-status note:
- `FRANCHISE_MODE_REPO_AUDIT.md` and `FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md` currently document Waves 1-3 as complete.
- Wave 4 is treated here as a current implementation checkpoint to verify in the next audits: durable `FranchiseSeasonSummary`, finalization/handoff creation and read path, direct start-season abort safety, explicit playoff summary validation, global-current-season protection in franchise finalization, double-switch guard, and continued Mode 2 v1 simulation disablement.
- Because Wave 4 is not yet reflected in the roadmap doc, every Wave 4 statement below is a "known checkpoint to verify," not a substitute for repo inspection.

## Traceability Status Language

- Known complete: covered by current audit/roadmap docs or recent checkpoint and still requires spot verification in a future pass.
- Unknown: requires direct repo verification.
- Boundary risk: likely correct in one path but needs cross-path verification.
- Deferred/prototype: spec says to defer, simplify, or guard, or the repo intentionally keeps a dormant/prototype implementation.

## Pass 1: Spine/Shared Franchise Data Contract

### Relevant Spec Sections

`SPINE_ARCHITECTURE.md`:
- Purpose and scope of the spine as shared data contracts, storage boundaries, entity models, and handoff interfaces.
- Three-mode architecture and mode ownership.
- Shared player, team, league, franchise, schedule, and season entities.
- Immutable event streams and transaction-event shape.
- Storage architecture, especially app metadata, per-franchise storage, and franchise isolation.
- Mode 1 -> Mode 2 franchise-start handoff.
- Mode 2 -> Mode 3 season-end handoff.
- Mode 3 -> Mode 2 new-season handoff.

`MODE_2_V1_FINAL.md`:
- Mode 2 inputs from Mode 1.
- Mode 2 outputs to Mode 3.
- Core event stream and transaction-event requirements.
- Schedule and season identity requirements.
- Franchise data-flow section.

`MODE_2_SECTION_MAP.md`:
- Section 1 franchise integration.
- Section 2 event architecture.
- Section 22 schedule/standings/playoff handling.
- Section 26 franchise data flow.

`OFFSEASON_SYSTEM_SPEC.md`:
- Phase overview.
- Season-end processing and Phase 11 finalize/advance.
- Offseason state and output data models.

`FARM_SYSTEM_SPEC.md`:
- Farm roster structure.
- Player level/option fields.
- Call-up/send-down transaction implications.
- Offseason roster requirements.

Current audit/roadmap:
- Waves 1-3 persistence, schedule, completed-game identity, current-season scoping, playoff/offseason scoping, and restored GameTracker identity.
- Wave 4 checkpoint: durable season summary and direct handoff safety should be verified here.

### Why This Pass Is Separate

The shared data contract is the foundation for every later pass. If franchise IDs, canonical season IDs, stat scope IDs, schedule game IDs, playoff IDs, offseason IDs, and per-franchise roster ownership are inconsistent, gameplay correctness and offseason correctness become impossible to judge cleanly. This pass should verify source-of-truth boundaries before inspecting deeper behavior.

### Repo Areas Likely Involved

- `src/utils/franchisePersistenceContract.ts`
- `src/utils/franchiseInitializer.ts`
- `src/utils/franchiseManager.ts`
- `src/utils/franchisePlayerStorage.ts`
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/utils/scheduleStorage.ts`
- `src/utils/gameStorage.ts`
- `src/utils/seasonStorage.ts`
- `src/utils/playoffStorage.ts`
- `src/utils/offseasonStorage.ts`
- `src/utils/transactionStorage.ts`
- `src/utils/eventLog.ts`
- `src/utils/trackerDb.ts`
- `src/src_figma/hooks/useFranchiseData.ts`
- `src/src_figma/hooks/useScheduleData.ts`
- `src/src_figma/hooks/usePlayoffData.ts`
- `src/src_figma/hooks/useOffseasonState.ts`
- `src/src_figma/app/pages/FranchiseSetup.tsx`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/pages/SeasonSummary.tsx`

### Known Waves 1-4 Status

- Wave 1 established canonical persistence helpers, per-franchise roster/team copy on setup, season metadata creation, franchise-scoped schedule support, completed-game identity, conservative legacy repair, rollback, and Mode 2 v1 sim disablement.
- Wave 2 narrowed transactions and clarified audited GameTracker correction behavior.
- Wave 3 moved active franchise season/playoff/offseason identity toward canonical franchise-season scoping and restored GameTracker identity.
- Wave 4 checkpoint should have added durable `FranchiseSeasonSummary` creation/read paths and stronger direct start-season handoff safety.

### Unknowns Requiring Repo Verification

- Whether every franchise-owned or franchise-scoped store has a clear owner and canonical key shape.
- Whether per-franchise DB stores and global scoped stores form a complete save-slot manifest.
- Whether export/import captures all data needed to restore a franchise.
- Whether Mode 1 -> Mode 2 setup copies the complete required league snapshot: teams, players, roster assignment, league rules, schedule source, farm state, and controlled-team flags.
- Whether Mode 2 -> Mode 3 season summary includes stable snapshots or durable references for all required outputs.
- Whether Mode 3 -> Mode 2 new-season handoff has enough identity to connect next-season schedule, rosters, carryover stats, farm status, and offseason results.
- Whether legacy global markers such as current-season state remain reachable in franchise context.
- Whether repair/backfill paths stay non-destructive for valid franchise saves.
- Whether deleting, exporting, importing, or repairing a franchise cleans or preserves the right scoped global records.

### Tests Likely Needed

- Canonical ID helper tests for `franchiseId`, `seasonNumber`, `seasonId`, `statsScopeId`, `scheduleGameId`, playoff ID, and offseason ID composition.
- Setup-copy contract test from League Builder source to per-franchise DB.
- Legacy repair non-destructive test for non-empty franchise DBs.
- Franchise export/import manifest test covering per-franchise DB, schedules, completed games, event logs, season stats, playoffs, offseason state, transactions, and season summaries.
- Delete cleanup test that does not remove another franchise's same-season data.
- Two-franchise current-season isolation test.
- Season summary handoff identity test from finalization to next-season start.

### Explicitly Out Of Scope

- Gameplay stat formula correctness.
- Offseason free agency, draft, retirement, trade, or spring-training algorithms.
- Farm recommendation or roster analyzer behavior.
- Narrative, morale, awards, and milestone quality.
- UI polish except where it exposes a wrong data contract.

## Pass 2: Mode 2 Gameplay/Event/Stat Pipeline

### Relevant Spec Sections

`MODE_2_V1_FINAL.md`:
- Immutable event architecture.
- GameTracker as the authoritative event recorder.
- Event enrichment and between-play event handling.
- Rule enforcement.
- Substitution flow.
- Stats pipeline, pitcher stats, fielding stats, WAR, leverage/WPA/mWPA, clutch attribution, mojo/fitness, modifier registry, milestones, adaptive standards, park factors, and franchise data flow.

`MODE_2_SECTION_MAP.md`:
- Keep sections for core GameTracker, rule enforcement, leverage/WPA, relationships, dynamic designations, standings/playoffs, adaptive standards, and traceability.
- Simplify sections for event architecture, enrichment, substitutions, stats, fielding, WAR, clutch, mojo/fitness, modifier registry, milestones, fan morale, schedule, park factors, and franchise data flow.
- Defer sections for fan favorite/albatross, AI simulation engine, and future roster analyzer.

`SPINE_ARCHITECTURE.md`:
- At-bat, between-play, and transaction event streams.
- Player season summary and season history ownership.
- Mode 2 -> Mode 3 season-end outputs.

Current audit/roadmap:
- GameTracker launch, restore, archive, schedule completion, and playoff identity were hardened in Waves 1-3.
- Wave 2 clarified audited mutation for corrections instead of silent outcome mutation.

### Why This Pass Is Separate

This pass tests whether the active game-recording system produces trustworthy events and stats. It should not be mixed with offseason or farm audits, because the core question is whether a played/scored/skipped Mode 2 game writes and aggregates the right canonical records under the right franchise season identity.

### Repo Areas Likely Involved

- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- `src/src_figma/app/utils/gameTrackerIdentity.ts`
- `src/utils/eventLog.ts`
- `src/utils/processCompletedGame.ts`
- `src/utils/gameStorage.ts`
- `src/utils/seasonStorage.ts`
- `src/utils/seasonAggregator.ts`
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/engines/*war*`
- `src/engines/*wpa*`
- `src/engines/mojoEngine.ts`
- `src/engines/fitnessEngine.ts`
- `src/utils/syntheticGameFactory.ts`
- GameTracker and stats tests under `src/src_figma/__tests__/gameTracker/**`, `src/src_figma/__tests__/season/**`, `src/utils/tests/**`, and `src/engines/__tests__/**`.

### Known Waves 1-4 Status

- Wave 1 made completed games preserve `franchiseId` and `scheduleGameId`.
- Wave 2 guarded Mode 2 v1 action surfaces and transaction types, and blocked silent event-result mutation.
- Wave 3 restored canonical franchise identity through GameTracker launch, restore, archive, schedule completion, and playoff handling.
- Wave 4 checkpoint should leave synthetic simulation unreachable and double-switch guarded for Mode 2 v1 franchise flows.

### Unknowns Requiring Repo Verification

- Whether all event streams carry enough canonical identity for franchise season replay and audit.
- Whether stat aggregation is idempotent when a game is corrected, reprocessed, restored, or archived.
- Whether scored/skipped games and played GameTracker games produce compatible season stats.
- Whether GameTracker correction policy is acceptable relative to the spec's stricter immutability language.
- Whether live milestone, leader, narrative, and playoff aggregation reads use `statsScopeId` and canonical `seasonId`.
- Whether pitcher, fielding, WAR, leverage, and clutch outputs are stored at the same scope consumed by season summary/finalization.
- Whether synthetic sim code can still create completed games through any non-UI path.
- Whether double-switch or other deferred substitution internals remain visible or reachable in franchise v1.

### Tests Likely Needed

- Golden played-game event-log-to-stat aggregation tests for a franchise season.
- Corrected-game idempotency tests: correction updates exactly one audited game record and does not double count.
- Restore/direct-entry tests for canonical live leader and milestone scope.
- Skipped/scored game compatibility tests for season stats and standings if those paths remain supported.
- No synthetic completed-game creation test in Mode 2 v1.
- Double-switch unreachable/guarded test for franchise v1.
- Playoff GameTracker aggregation test using restored playoff identity.

### Explicitly Out Of Scope

- Offseason adapters and roster mutation.
- Farm options and call-up/send-down rules except transaction-event shape.
- Roster analyzer and lineup recommendation logic.
- Full redesign of GameTracker internals.

## Pass 3: Mode 2 Season-End To Offseason Boundary

### Relevant Spec Sections

`SPINE_ARCHITECTURE.md`:
- Mode 2 -> Mode 3 `SeasonSummary` handoff.
- Mode 3 -> Mode 2 `NewSeasonHandoff`.
- Shared season summary, player summary, and event history ownership.

`MODE_2_V1_FINAL.md`:
- Mode 2 produces event log, stat tables, standings, WAR, playoffs, awards, milestones, fame/bonus outputs, fan morale, and narrative history.
- Standings/playoffs.
- Schedule and season completion.
- Franchise data-flow output to Mode 3.

`MODE_2_SECTION_MAP.md`:
- Section 21 standings/playoffs kept.
- Section 22 schedule simplified with no synthetic simulation.
- Section 26 franchise data flow simplified.
- Section 28 traceability kept.

`OFFSEASON_SYSTEM_SPEC.md`:
- Season-end processing.
- Awards and summaries.
- Phase 11 finalize and advance.
- Offseason data models and handoff outputs.

`FARM_SYSTEM_SPEC.md`:
- End-of-season farm effects.
- Phase 11 roster requirements.
- Farm/offseason roster boundary.

Current audit/roadmap:
- Wave 4 checkpoint added durable season summary/handoff storage and direct start-season safety.

### Why This Pass Is Separate

This is the contract between active season play and offseason mode. It should verify whether finalization produces stable historical records before any later pass builds real offseason mutations. It is the highest-risk boundary after the shared data contract because it freezes a season and advances franchise metadata.

### Repo Areas Likely Involved

- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/utils/franchisePersistenceContract.ts`
- `src/utils/seasonStorage.ts`
- `src/utils/gameStorage.ts`
- `src/utils/playoffStorage.ts`
- `src/utils/offseasonStorage.ts`
- `src/utils/seasonTransitionEngine.ts`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/pages/SeasonSummary.tsx`
- `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`
- `src/src_figma/hooks/useFranchiseData.ts`
- `src/src_figma/hooks/useOffseasonState.ts`

### Known Waves 1-4 Status

- Waves 1-3 established canonical franchise season identity and current-season isolation.
- Wave 4 checkpoint should persist a separate `FranchiseSeasonSummary` keyed by canonical `seasonId`.
- Wave 4 checkpoint should create summary before advancing, read persisted summary in `SeasonSummary`, and block direct start-season advancement if summary creation or transition fails.
- Wave 4 checkpoint should validate explicit playoff references before writing them into a summary.

### Unknowns Requiring Repo Verification

- Whether `FranchiseSeasonSummary` contains all required Mode 2 and Spine outputs, or clear placeholders for missing systems.
- Whether summary data is copy-not-reference where historical display must remain stable.
- Whether finalization failure paths roll back or abort before franchise metadata, schedule, and UI state move to the next season.
- Whether direct `START SEASON {n+1}` and modal/finalize flows use the same handoff safety rules.
- Whether global `kbl-current-season` or other legacy season markers can still be mutated by franchise finalization.
- Whether playoff results, awards, milestones, fan morale, narratives, park factors, and stat references point to the correct canonical season.
- Whether season summary display falls back safely for legacy saves without contaminating another franchise.

### Tests Likely Needed

- Multi-franchise summary isolation with the same numeric season.
- Finalization creates canonical persisted summary before metadata advance.
- Direct start-season aborts on summary failure and transition failure.
- Copy-not-reference test for standings, completed-game refs, playoff refs, and other included snapshots.
- Explicit wrong-season playoff rejection test.
- SeasonSummary persisted-render test and legacy fallback test.
- No global current-season mutation from franchise finalization.
- New-season handoff identity test from finalized season into generated next schedule/offseason state.

### Explicitly Out Of Scope

- Implementing full free agency, draft, retirement, contraction, expansion, spring training, or farm reconciliation.
- Roster analyzer/recommendation engine.
- Deep GameTracker stat formula audit.
- New flavor-engine development.

## Pass 4: Farm/Roster Movement Boundary

### Relevant Spec Sections

`FARM_SYSTEM_SPEC.md`:
- Farm roster structure and constraints.
- Three-options-per-season rule.
- Call-up rating reveal.
- Call-up and send-down flows.
- Farm morale and narrative triggers.
- Offseason roster requirements and Phase 11 lock.
- Mechanical effects and end-of-season farm effects.

`SPINE_ARCHITECTURE.md`:
- Shared player model, status, roster level, traits, chemistry, and visibility.
- Transaction events.
- Mode 1 -> Mode 2 roster handoff.
- Mode 2/Mode 3 ownership of player status and roster movement.

`MODE_2_V1_FINAL.md`:
- Canonical transaction event types.
- Between-play/transaction event handling.
- Dynamic designations.
- Fan morale and narrative hooks.
- Franchise data-flow outputs.

`MODE_2_SECTION_MAP.md`:
- Transaction and franchise-flow simplifications.
- Deferred future roster analyzer.
- Fan morale and milestone simplifications.

`OFFSEASON_SYSTEM_SPEC.md`:
- Retirements.
- Free agency.
- Draft.
- Trades.
- Phase 11 roster validation and cut-down signing round.

Current audit/roadmap:
- Roster analyzer explicitly remains future work.
- Offseason prototype mutations are currently guarded in franchise context.

### Why This Pass Is Separate

Roster movement spans in-season Mode 2, offseason Mode 3, the farm system, and future recommendation/analyzer work. It needs its own audit because safe storage ownership does not prove movement rules, and movement rules should not be conflated with UI prototype guards or full offseason algorithms.

### Repo Areas Likely Involved

- `src/utils/franchisePlayerStorage.ts`
- `src/utils/farmStorage.ts`
- `src/utils/transactionStorage.ts`
- `src/src_figma/app/utils/franchiseGameTrackerRoster.ts`
- `src/src_figma/app/components/TeamHubContent.tsx`
- `src/src_figma/app/components/FreeAgencyFlow.tsx`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/src_figma/app/components/RatingsAdjustmentFlow.tsx`
- `src/src_figma/app/components/DraftFlow.tsx`
- `src/src_figma/app/utils/franchiseOffseasonGuards.ts`
- `src/src_figma/hooks/useOffseasonData.ts`
- `src/src_figma/hooks/useOffseasonState.ts`
- future franchise-owned offseason adapter modules, if added later.

### Known Waves 1-4 Status

- Wave 1 made the per-franchise roster/team DB the setup-time destination for franchise play.
- Wave 1 hardening made legacy repair non-destructive for valid non-empty franchise saves.
- Wave 2 narrowed transaction types to the eight Mode 2 v1 types.
- Wave 3 blocked prototype offseason flows from mutating League Builder/template storage in franchise context.
- Wave 4 is not expected to implement full roster movement adapters.

### Unknowns Requiring Repo Verification

- Whether franchise-owned player records carry enough farm, roster level, option, trait visibility, contract, salary, and injury/list fields to satisfy future movement.
- Whether call-up/send-down transaction events are logged canonically without mutating League Builder.
- Whether active GameTracker rosters always build from franchise DB state, not template state.
- Whether roster size constraints are enforced at the right boundary: not prematurely during the season, but required during Phase 11/finalization.
- Whether prototype offseason flows remain safely blocked until franchise-owned adapters exist.
- Whether any Team Hub or roster UI still writes to global/template storage.
- Whether farm storage is global, franchise-scoped, copied into the franchise DB, or unresolved.

### Tests Likely Needed

- Franchise DB roster-level mutation tests for call-up/send-down once adapters exist.
- Transaction-event tests for `call_up`, `send_down`, `release`, `injury_list`, `free_agent_signing`, `draft_pick`, `retirement`, and `trade`.
- Rating reveal test for first call-up.
- Three-options-per-season test.
- GameTracker roster builder reads franchise DB only.
- Phase 11 roster validation test for MLB 22, Farm 10, total 32.
- Guard tests proving prototype offseason mutation paths do not touch League Builder in franchise context.
- No cross-franchise roster bleed after roster movement.

### Explicitly Out Of Scope

- Roster analyzer/recommendation engine implementation.
- Full free agency/draft/retirement/trade algorithms unless the pass is later promoted from audit to implementation.
- Narrative text quality.
- Gameplay event/stat formula correctness.

## Pass 5: Derived/Flavor Systems

### Relevant Spec Sections

`MODE_2_V1_FINAL.md`:
- Narrative engine.
- Dynamic designations.
- Milestones.
- Fan morale.
- Adaptive standards.
- Park factors.
- WAR, clutch, leverage, and standings as inputs to derived systems.

`MODE_2_SECTION_MAP.md`:
- Keep dynamic designations, relationships, standings/playoffs, adaptive standards, and traceability.
- Simplify milestones, fan morale, park factors, mojo/fitness, and modifier registry.
- Defer fan favorite/albatross mechanics and future AI/simulation work.

`SPINE_ARCHITECTURE.md`:
- Trait visibility, chemistry, and call-up implications.
- Dynamic designations.
- Fan morale.
- Reporter/narrative.
- Stadium and park factors.

`OFFSEASON_SYSTEM_SPEC.md`:
- Awards, salaries, morale hooks, season history, Hall/Museum, and finalization outputs.

`FARM_SYSTEM_SPEC.md`:
- Farm morale.
- Farm narratives.
- Farm mechanical effects.

Current audit/roadmap:
- Some derived systems exist but have placeholder or partial season-summary integration.
- Wave 4 checkpoint should store placeholders in the durable summary where durable data is not yet implemented.

### Why This Pass Is Separate

Derived systems should consume canonical events, stats, and roster state. They should not define core ownership. Keeping them separate prevents flavor systems from driving data-contract decisions prematurely, while still making sure season summaries and UI do not silently omit or cross-contaminate franchise-season outputs.

### Repo Areas Likely Involved

- `src/engines/narrativeEngine.ts`
- `src/engines/fanMoraleEngine.ts`
- `src/engines/adaptiveLearningEngine.ts`
- `src/engines/parkFactorDeriver.ts`
- `src/engines/mojoEngine.ts`
- `src/engines/fitnessEngine.ts`
- `src/utils/gameStoriesStorage.ts`
- `src/utils/milestone*`
- `src/utils/seasonStorage.ts`
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/pages/SeasonSummary.tsx`
- `src/src_figma/app/components/LeagueLeaders*`
- `src/src_figma/app/components/Awards*`
- `src/src_figma/app/components/Museum*`

### Known Waves 1-4 Status

- Waves 1-3 focused on identity and scoping, not flavor completeness.
- Wave 3 scoped visible franchise season data and live GameTracker contexts.
- Wave 4 checkpoint should persist explicit placeholders for awards, milestones, fan morale, narrative, and park-factor sections where durable data is not yet implemented.
- Automatic mojo/fitness mutation should not be triggered by franchise v1 finalization unless explicitly supported.

### Unknowns Requiring Repo Verification

- Whether narrative/news items are keyed by canonical franchise season.
- Whether milestones and award inputs are scoped by `statsScopeId` instead of numeric season alone.
- Whether fan morale stores per franchise/team/season or still uses global team state.
- Whether park factors are copied into the franchise snapshot or read from mutable global stadium data.
- Whether adaptive standards are global by design or need franchise-season snapshots.
- Whether mojo/fitness effects are display-only, user-observed, or mutating in Mode 2 v1.
- Whether `FranchiseSeasonSummary` captures enough references/snapshots for historical display.

### Tests Likely Needed

- Multi-franchise narrative/news isolation.
- Milestone detection with canonical season scope.
- Award input and league leader scope tests.
- Fan morale scope and persistence tests.
- Park-factor snapshot/reference test.
- Season summary includes populated derived-system sections when data exists and explicit placeholders when not.
- No automatic mojo/fitness mutation during franchise finalization unless explicitly allowed.

### Explicitly Out Of Scope

- Creating new narrative content volume.
- Roster analyzer logic.
- Full farm/offseason movement.
- Redesigning the core GameTracker event pipeline.

## Pass 6: Deferred/Prototype Leakage

### Relevant Spec Sections

`MODE_2_SECTION_MAP.md`:
- Defer Section 19 fan favorite/albatross.
- Defer Section 25 AI game simulation engine.
- Defer Section 27 roster analyzer.
- Simplify Section 7 substitutions by removing/hiding unsupported double-switch behavior.
- Simplify Section 14 mojo/fitness by removing automatic regression/decay and emphasizing user-observed fitness.
- Simplify Section 15 modifier registry.
- Simplify Section 22 schedule with no synthetic simulation; score/skip only if v1-supported.
- Simplify Section 26 franchise data flow without cold-tier or season-classification expansion.

`MODE_2_V1_FINAL.md`:
- Simulation and AI game engine sections are not part of the Mode 2 v1 surface.
- Core played/scored/skipped game paths should remain the supported user paths.

`OFFSEASON_SYSTEM_SPEC.md`:
- Contraction removed from v1.
- Expansion optional and not required for current Mode 2 v1 boundary work.
- Deep offseason systems remain future adapter work.

`FARM_SYSTEM_SPEC.md`:
- Farm narratives, AI-style mechanical effects, and future analyzer-style recommendations should not leak into current Mode 2 v1 as mutating behavior.

Current audit/roadmap:
- Synthetic sim code remains present but disabled.
- Double-switch internals remain but should be hidden/guarded for franchise v1.
- Prototype offseason flows are guarded against League Builder mutation in franchise context.

### Why This Pass Is Separate

Prototype leakage is a negative audit: it verifies unsupported things are not visible, reachable, mutating, or writing durable records. It should stay separate from feature-completion audits so the fix is usually a guard, flag, or UI removal rather than expanding the prototype.

### Repo Areas Likely Involved

- `src/utils/syntheticGameFactory.ts`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/pages/GameTracker.tsx`
- GameTracker substitution/double-switch components and handlers.
- `src/src_figma/app/components/FreeAgencyFlow.tsx`
- `src/src_figma/app/components/RetirementFlow.tsx`
- `src/src_figma/app/components/RatingsAdjustmentFlow.tsx`
- `src/src_figma/app/components/DraftFlow.tsx`
- `src/src_figma/app/utils/franchiseOffseasonGuards.ts`
- `src/engines/fitnessEngine.ts`
- `src/engines/mojoEngine.ts`
- Any route/tab definitions for trades, all-star, contraction/expansion, simulation, and AI game generation.

### Known Waves 1-4 Status

- Wave 1 hardening disabled visible synthetic sim paths for Mode 2 v1.
- Wave 2 cleaned the v1 action surface and transaction surface.
- Wave 3 blocked franchise offseason prototype mutations.
- Wave 4 checkpoint should keep sim unreachable, guard double-switch if it is visible/reachable, and avoid automatic mojo/fitness mutation during franchise v1 finalization.

### Unknowns Requiring Repo Verification

- Whether any deep handler can still create synthetic completed games without the visible button.
- Whether hidden tabs, query-state, route-state, keyboard shortcuts, or direct component mounting can reach unsupported flows.
- Whether double-switch controls are visible in any franchise GameTracker mode.
- Whether prototype offseason components can mutate global/League Builder storage through alternate button paths.
- Whether all-star, trade, contraction, expansion, or AI features are still exposed in v1 routes.
- Whether automatic mojo/fitness/fan favorite/albatross effects are triggered by finalization or post-game processing despite being simplified/deferred.
- Whether tests accidentally preserve unsupported prototype behavior.

### Tests Likely Needed

- Negative action-surface tests for regular-season franchise home.
- No synthetic completed-game creation test for Mode 2 v1.
- Double-switch hidden/guarded tests in franchise GameTracker mode.
- Offseason prototype guard tests for every guarded mutation path.
- Unsupported transaction type rejection tests.
- No contraction/expansion mutation from franchise v1 routes.
- No automatic mojo/fitness mutation from season finalization.

### Explicitly Out Of Scope

- Replacing deferred systems with production versions.
- Roster analyzer implementation.
- Full offseason adapters.
- Removing dormant code wholesale unless a future patch explicitly targets cleanup.

## Recommended First Audit Pass

Start with Pass 1: Spine/shared franchise data contract.

Why:
- It verifies the shared contract that every other pass depends on.
- Waves 1-4 changed identity, persistence, schedules, completed-game records, playoffs, offseason state, and season summary/handoff behavior.
- It can identify whether remaining work is a data-contract gap, a gameplay pipeline gap, or an offseason/farm adapter gap before implementation continues.
- It does not require a full repo audit or roster analyzer work.

## Exact Prompt For The First Audit

```text
Please run Cross-Spec Franchise Traceability Audit Pass 1 only: Spine/shared franchise data contract.

Do not implement code.
Do not add roster analyzer work.
Do not audit gameplay formulas, derived/flavor systems, or offseason algorithms yet.
Do not do the full repo audit.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/SPINE_ARCHITECTURE.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/MODE_2_V1_FINAL.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/MODE_2_SECTION_MAP.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/OFFSEASON_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FARM_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_MODE_REPO_AUDIT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md

Inspect the repo directly and produce a file-backed audit covering:
- canonical franchise IDs, season IDs, stats scope IDs, schedule IDs, playoff IDs, and offseason IDs
- per-franchise DB ownership versus globally stored franchise-scoped records
- Mode 1 -> Mode 2 setup/copy contract
- Mode 2 -> Mode 3 season summary and handoff contract
- Mode 3 -> Mode 2 new-season handoff contract
- franchise export/import/delete/repair boundaries
- legacy global marker risks
- tests needed to prove the shared franchise data contract

Every repo claim must include file and line references.

Output:
1. Findings first, ordered by severity
2. Contract coverage matrix by source spec section
3. Data ownership map
4. Persistence/export/import/delete risk map
5. Required tests
6. P1/P2 blockers before more feature work
7. Smallest safe next patch set, if fixes are needed
```
