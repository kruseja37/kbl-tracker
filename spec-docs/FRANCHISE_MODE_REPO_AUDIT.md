# Franchise Mode Repo Audit

Date: 2026-05-20  
Repo: `/Users/johnkruse/Projects/kbl-tracker`  
Compared against:
- `spec-docs/MODE_2_V1_FINAL.md`
- `spec-docs/MODE_2_SECTION_MAP.md`

Post-audit implementation checkpoint:
- Waves 1, 2, and 3 are now complete. The original audit below remains useful as the baseline that identified the risks; the checkpoint sections supersede any older finding that said franchise setup, schedule scoping, completed-game identity, v1 action surface, transaction surface, GameTracker correction policy, current-season sourcing, playoff/offseason scoping boundaries, or restored GameTracker franchise identity were still missing.
- This document update is documentation-only. No app code was changed as part of this update.

Scope notes:
- This audit intentionally does not analyze roster constraint integration. It only includes a short future-fit note at the end.
- This audit is based on static repo inspection. I did not run the full test suite for this document.
- The active implementation boundary matters: `src/main.tsx` mounts `src/App.tsx`, and `src/App.tsx` routes to the `src/src_figma` app pages (`src/main.tsx:1-16`, `src/App.tsx:211-314`). Legacy `src/pages/**` and `src/components/**` are excluded from TypeScript/test scope (`tsconfig.app.json:35-45`, `vite.config.ts:145-153`) and are treated as reference/dormant code.

Status legend:
- Built: implemented and broadly aligned with Mode 2.
- Partially Built: meaningful implementation exists, but important spec behavior or wiring is incomplete.
- Missing: no meaningful active implementation found.
- Deferred: spec map explicitly defers it.
- Overbuilt: repo implements beyond current Mode 2 v1 or beyond the section map ruling.
- Drifted: implementation contradicts or materially diverges from the spec.

## 0. Waves 1-3 Implementation Checkpoint

### Current summary

Overall implementation maturity after Waves 1-3: franchise mode has moved from a broad prototype with fragile persistence into a substantially more coherent Mode 2 v1 foundation. The core regular-season path now has a canonical persistence contract, fresh-franchise setup copies league teams/players into the per-franchise DB, schedules are franchise-scoped, completed games retain franchise identity, current seasons come from franchise metadata, and GameTracker can preserve franchise/playoff identity through launch, restore, archive, and schedule completion.

The implementation is not yet spec-complete. The biggest remaining gaps are full franchise-owned offseason mutation adapters, export/import coverage for all globally scoped franchise data, continued cleanup of legacy/global markers, and broader full-suite stabilization. Synthetic simulation code still exists in the repo, but Mode 2 v1 surfaces now keep it disabled via `MODE_2_V1_SYNTHETIC_SIM_ENABLED = false` and guards around sim actions (`src/src_figma/app/pages/FranchiseHome.tsx:105`, `src/src_figma/app/pages/FranchiseHome.tsx:920`, `src/src_figma/app/pages/FranchiseHome.tsx:3260`, `src/src_figma/app/pages/FranchiseHome.tsx:3593-3612`, `src/src_figma/app/pages/FranchiseHome.tsx:3745-3772`).

### Wave 1 completed: persistence and setup foundation

Completed:
- Canonical franchise persistence contract was added in `src/utils/franchisePersistenceContract.ts`. It defines the per-franchise DB prefix, canonical season id format `{franchiseId}-season-{n}`, handoff keys, handoff payload shape, and store-scope map (`src/utils/franchisePersistenceContract.ts:1-119`).
- Fresh setup now deep-copies League Builder teams/players into `kbl-franchise-{franchiseId}` through `deepCopyLeagueToFranchise` before schedule/game launch can depend on franchise-owned roster data (`src/utils/franchiseInitializer.ts:270-289`; copy helper at `src/utils/franchisePlayerStorage.ts:270`).
- Setup creates canonical season metadata for season 1, using the generated schedule length instead of a hard-coded game count (`src/utils/franchiseInitializer.ts:88-130`, `src/utils/franchiseInitializer.ts:289`).
- Schedule rows are tagged with `franchiseId`, and the schedule hook can load franchise-scoped games/metadata when called with `{ franchiseId }` (`src/utils/scheduleStorage.ts:30`, `src/utils/scheduleStorage.ts:529-649`, `src/src_figma/hooks/useScheduleData.ts:80-119`).
- Completed/current game storage now carries `franchiseId` and `scheduleGameId`, and archive queries can filter by franchise (`src/utils/gameStorage.ts:236-239`, `src/utils/gameStorage.ts:550-567`, `src/utils/gameStorage.ts:705-763`, `src/utils/gameStorage.ts:878-891`).
- Game headers and at-bat events now include franchise/schedule identity fields (`src/utils/eventLog.ts:147-154`, `src/utils/eventLog.ts:270-275`).
- Legacy repair exists and is conservative: `repairFranchisePersistence` only runs the destructive deep copy when the franchise players or teams store is empty, then ensures canonical season metadata (`src/utils/franchiseInitializer.ts:169-219`).
- Setup rollback cleans up partial season metadata, franchise metadata, and the per-franchise DB if post-`createFranchise` setup work fails (`src/utils/franchiseInitializer.ts:146-166`, `src/utils/franchiseInitializer.ts:294-297`).
- Mode 2 v1 synthetic simulation is feature-flagged off and guarded from visible action paths (`src/src_figma/app/pages/FranchiseHome.tsx:105`, `src/src_figma/app/pages/FranchiseHome.tsx:920`, `src/src_figma/app/pages/FranchiseHome.tsx:3260`, `src/src_figma/app/pages/FranchiseHome.tsx:3363`, `src/src_figma/app/pages/FranchiseHome.tsx:3593-3612`).

Verification added:
- Setup/repair tests cover deep copy, rollback, and conservative repair (`src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts`).
- Real setup-to-launch persistence test seeds League Builder data, initializes a franchise, and builds GameTracker rosters from the franchise DB without mocking the copy/roster builders (`src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts`).
- Schedule scope and completed-game identity tests cover multi-franchise isolation and completed-game identity fields (`src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts`, `src/src_figma/__tests__/persistence/completedGameIdentity.test.ts`).

### Wave 2 completed: Mode 2 v1 surface alignment

Completed:
- Franchise regular-season actions now expose the v1-supported Score/Skip surface while synthetic sim controls remain hidden/guarded. The v1 action visibility test lives in `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx:560`.
- Mode 2 v1 transaction surface is narrowed to the canonical eight: `trade`, `free_agent_signing`, `release`, `call_up`, `send_down`, `draft_pick`, `retirement`, and `injury_list` (`src/utils/transactionStorage.ts:56-67`).
- Legacy transaction mapping is explicit and limited to safe equivalents; unrelated legacy categories are rejected by `logMode2V1Transaction` (`src/utils/transactionStorage.ts:121-136`, `src/utils/transactionStorage.ts:280-295`).
- GameTracker correction policy is now explicit: Mode 2 v1 allows audited result corrections only when the update includes a version bump and edit history, rather than silent result mutation (`src/utils/eventLog.ts:971-999`, `src/utils/eventLog.ts:1235-1299`, `src/utils/eventLog.ts:1393`).

Verification added:
- `src/utils/tests/transactionStorage.mode2v1.test.ts` proves allowed canonical transaction types, safe legacy mapping, and rejection of unsupported categories.
- `src/src_figma/__tests__/gameTracker/atBatOutcomeImmutability.test.ts` and `src/src_figma/__tests__/gameTracker/betweenPlayEventVersioning.test.ts` cover audited correction/versioning behavior.

Clarification:
- The GameTracker correction model is audited mutation, not strict append-only immutability. This is a deliberate v1 clarification: the original event outcome cannot be silently changed, but a correction can update the record when version/edit-history requirements are met.

### Wave 3 completed: franchise season identity and scoping

Completed:
- Franchise-visible season data now uses canonical franchise season scope (`{franchiseId}-season-{n}`) through the persistence helpers and franchise hooks (`src/utils/franchisePersistenceContract.ts:18-36`, `src/src_figma/hooks/useFranchiseData.ts:16`, `src/src_figma/hooks/useFranchiseData.ts:239`).
- FranchiseHome and SeasonSummary derive current season from franchise metadata rather than the global `kbl-current-season` marker (`src/src_figma/app/utils/franchiseRouteSeason.ts:22-23`, `src/src_figma/app/pages/FranchiseHome.tsx:177-236`, `src/src_figma/app/pages/SeasonSummary.tsx:55-81`).
- Franchise schedule and season-completion paths use franchise-scoped schedule data (`src/src_figma/hooks/useScheduleData.ts:101-119`, `src/src_figma/app/pages/FranchiseHome.tsx:2924-2925`).
- Playoff storage/hooks now carry `franchiseId` and use it for season lookups, creation, deletion, and next-round creation boundaries (`src/src_figma/hooks/usePlayoffData.ts:105-159`, `src/src_figma/hooks/usePlayoffData.ts:257-365`, `src/src_figma/hooks/usePlayoffData.ts:456-463`).
- Offseason state records can carry `franchiseId` and use canonical `offseason-{seasonId}` IDs; `useOffseasonState` threads franchise context into offseason start/load/save calls (`src/utils/offseasonStorage.ts:56-58`, `src/utils/offseasonStorage.ts:301-319`, `src/src_figma/hooks/useOffseasonState.ts:116-128`, `src/src_figma/hooks/useOffseasonState.ts:206-219`).
- GameTracker launch now passes canonical `franchiseId`, `seasonNumber`, `seasonId`, `statsScopeId`, `scheduleGameId`, and playoff identity from FranchiseHome (`src/src_figma/app/pages/FranchiseHome.tsx:892`, `src/src_figma/app/pages/FranchiseHome.tsx:3239`, `src/src_figma/app/pages/FranchiseHome.tsx:3245`).
- GameTracker restore and end-game identity resolution is centralized in `resolveGameTrackerIdentity`, resolving from navigation state, restored context, GameState, then safe fallback (`src/src_figma/app/utils/gameTrackerIdentity.ts:4-117`; used in `src/src_figma/app/pages/GameTracker.tsx:1457-1477`).
- `useGameState` persists/restores franchise season identity through initialization, snapshot restore, durable-log/header restore, and archive/end-game options (`src/src_figma/hooks/useGameState.ts:776-785`, `src/src_figma/hooks/useGameState.ts:4108-4230`, `src/src_figma/hooks/useGameState.ts:4659-4677`, `src/src_figma/hooks/useGameState.ts:5035-5049`, `src/src_figma/hooks/useGameState.ts:5624-5638`, `src/src_figma/hooks/useGameState.ts:10887-11093`).
- GameTracker uses restored `scheduleGameId` for schedule completion and restored team IDs for winner/loser identity on direct-entry restored games (`src/src_figma/app/pages/GameTracker.tsx:1250-1457`, `src/src_figma/app/pages/GameTracker.tsx:11317-11402`).
- Franchise offseason prototype mutation paths are blocked before they mutate League Builder/template storage (`src/src_figma/app/utils/franchiseOffseasonGuards.ts:1-12`, `src/src_figma/app/components/FreeAgencyFlow.tsx:392-393`, `src/src_figma/app/components/RetirementFlow.tsx:220-221`, `src/src_figma/app/components/RatingsAdjustmentFlow.tsx:397-398`, `src/src_figma/app/components/DraftFlow.tsx:437-438`).

Verification added:
- Multi-franchise season/playoff/offseason/handoff tests live in `src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts` and `src/src_figma/__tests__/franchiseMode/franchiseWave3Blockers.test.ts`.
- Restored GameTracker franchise identity tests cover snapshot restore, durable-log/header restore, resolver behavior, canonical live stats scope, end-game archive options, and restored schedule completion (`src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx`, `src/src_figma/__tests__/gameTracker/GameTrackerLaunchState.test.tsx:444-560`).
- Offseason guard component tests cover Free Agency, Retirement, Ratings, and Draft paths without calling League Builder mutation functions (`src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:148-260`).

### Current remaining risks after Wave 3

- Full franchise-owned offseason mutation adapters are still future work. The current v1-safe behavior blocks prototype mutation in franchise context; it does not yet implement franchise DB-backed free agency, retirement, ratings, draft, trades, farm reconciliation, or spring training mutations.
- Legacy/global season markers still exist and should be gradually removed or contained. `FranchiseHome` still writes `kbl-current-season` for compatibility/sync (`src/src_figma/app/pages/FranchiseHome.tsx:149-151`), and `franchiseRouteSeason` still has a legacy fallback reader (`src/src_figma/app/utils/franchiseRouteSeason.ts:4-17`).
- Synthetic sim code remains present in the repository (`src/utils/syntheticGameFactory.ts`, imports in `src/src_figma/app/pages/FranchiseHome.tsx:28`), but it is disabled/guarded for Mode 2 v1.
- Broad full-suite status is not re-established by this documentation update. The last focused Wave 1-3 verification reported the targeted franchise/GameTracker suites passing and `npm run build` passing; prior review separately called out an unrelated `managerWpaGameState.test.ts` precision mismatch as not a Wave 3 blocker.
- Export/import still needs a full franchise manifest pass. The original audit finding that `franchiseManager` export/import only covers per-franchise DB stores remains important for future work.
- GameTracker correction policy is audited mutation, not strict append-only immutability. Any future spec language should either bless that policy or require a stricter correction-event layer.
- Roster analyzer/recommendation engine remains future work and should not be started until the franchise DB is treated as the only roster source of truth.

## 1. Executive Summary

Updated implementation maturity after Waves 1-3: the repo now has a coherent Mode 2 v1 foundation for franchise persistence, setup handoff, schedule scoping, completed-game identity, v1 action surface, transaction surface, season/playoff/offseason identity boundaries, and restored GameTracker scope. The mature GameTracker/stat-processing core identified in the baseline audit is now connected to a more reliable franchise identity contract.

Mode 2 defines Franchise Season as the active gameplay hub where users play games, record results in GameTracker, manage the season, and produce event logs, stats, standings, WAR, playoff results, awards, milestones, fame, morale, and narrative history for the next mode (`MODE_2_V1_FINAL.md:52-56`, `MODE_2_V1_FINAL.md:93-106`). After Waves 1-3, the regular-season identity path is substantially aligned: franchise setup copies teams/players into the per-franchise DB, GameTracker carries canonical season/stat/schedule identity, and franchise routes derive current season from franchise metadata.

Biggest strengths:
- Canonical franchise persistence helpers now define DB names, season IDs, season handoff, and store-scope expectations (`src/utils/franchisePersistenceContract.ts:1-119`).
- Fresh franchise setup now seeds franchise-owned teams/players, schedule rows, and season metadata with rollback on failure (`src/utils/franchiseInitializer.ts:146-166`, `src/utils/franchiseInitializer.ts:270-297`).
- GameTracker identity is resolved consistently across launch, snapshot restore, durable-log/header restore, archive, schedule completion, and playoff context (`src/src_figma/app/utils/gameTrackerIdentity.ts:4-117`, `src/src_figma/hooks/useGameState.ts:4108-4230`, `src/src_figma/hooks/useGameState.ts:4659-4677`, `src/src_figma/hooks/useGameState.ts:10887-11093`).
- Schedule, completed game, playoff, and offseason storage now have franchise-season scoping boundaries where the active franchise routes use them (`src/src_figma/hooks/useScheduleData.ts:101-119`, `src/utils/gameStorage.ts:705-763`, `src/src_figma/hooks/usePlayoffData.ts:105-159`, `src/utils/offseasonStorage.ts:301-319`).
- Mode 2 v1 surface cleanup is guarded by tests: no visible sim surface, narrowed transaction API, audited correction policy, setup-to-launch persistence, multi-franchise scoping, and restored GameTracker scope.

Biggest gaps:
- Full franchise-owned offseason mutation adapters are not built yet. Current Free Agency, Retirement, Ratings, and Draft franchise paths are protected by guards instead of writing franchise-owned roster changes (`src/src_figma/app/utils/franchiseOffseasonGuards.ts:1-12`).
- Export/import still needs a manifest that captures all franchise-owned or franchise-scoped global stores, not just the per-franchise DB.
- Some legacy/global markers remain for compatibility, especially `kbl-current-season` (`src/src_figma/app/pages/FranchiseHome.tsx:149-151`, `src/src_figma/app/utils/franchiseRouteSeason.ts:4-17`).
- Synthetic simulation code remains in the repo, though disabled/guarded for Mode 2 v1 (`src/utils/syntheticGameFactory.ts`, `src/src_figma/app/pages/FranchiseHome.tsx:105`).
- Broad full-suite status still needs a dedicated pass beyond the focused Wave 1-3 test matrix.

Biggest risks:
- Offseason adapters could accidentally reintroduce League Builder/template mutation if they do not use the franchise DB as source of truth.
- The current GameTracker correction model is audited mutation, not strict append-only immutability. This is intentional after Wave 2, but the spec should stay explicit.
- Global stores are viable only while every boundary consistently carries `franchiseId`, `seasonId`, `statsScopeId`, `scheduleGameId`, and playoff identity.
- Synthetic simulation must remain disabled for Mode 2 v1 unless the spec changes.
- Roster analyzer work must not begin as a mutating feature until the franchise-owned roster/offseason adapters are stable.

Major spec/repo mismatches:
- Full offseason mutation remains deferred behind safe guards, while the spec's future flow still needs real franchise-owned roster movement.
- Synthetic simulation implementation remains present but disabled for Mode 2 v1.
- Mojo/fitness and other advanced engines may still be ahead of simplified v1 intent; they need a future focused pass before being treated as canonical franchise behavior.
- Export/import does not yet represent the complete franchise save slot implied by the now-hybrid per-franchise/global-scoped architecture.

## 2. Repo Architecture Inventory

### Active routes/pages

Active franchise routes:
- `/franchise/select` -> `FranchiseSelector`.
- `/franchise/setup` -> `FranchiseSetup`.
- `/franchise/:franchiseId/season-summary` -> `SeasonSummary`.
- `/franchise/:franchiseId` -> `FranchiseHome`.
- `/game-tracker/:gameId` -> `GameTracker`.
- `/post-game/:gameId` -> `PostGameSummary` inside `PostGameRouteBoundary`.

Evidence: `src/App.tsx:215-233`.

`src/App.tsx` explicitly says `FranchiseHome` contains in-season, playoff, and offseason flows as tabs/modals, while legacy pages are kept only for reference (`src/App.tsx:188-200`).

### Franchise selector

`FranchiseSelector` lists, sorts, continues, renames, deletes, and exports franchises through `franchiseManager` (`src/src_figma/app/pages/FranchiseSelector.tsx:13-21`, `src/src_figma/app/pages/FranchiseSelector.tsx:36-100`). The UI has franchise cards and actions (`src/src_figma/app/pages/FranchiseSelector.tsx:147-263`).

Important note: it imports `createFranchise` but does not use it; new franchise creation is correctly routed to setup (`src/src_figma/app/pages/FranchiseSelector.tsx:13-21`, `src/src_figma/app/pages/FranchiseSelector.tsx:59-62`).

### Franchise setup flow

The setup wizard is six steps and calls `initializeFranchise(config)` only on the last step (`src/src_figma/app/pages/FranchiseSetup.tsx:72-89`). Proceed validation only requires a selected league and selected teams (`src/src_figma/app/pages/FranchiseSetup.tsx:101-110`).

The roster-mode step exposes existing rosters and fantasy draft (`src/src_figma/app/pages/FranchiseSetup.tsx:1063-1289`). It displays hard-coded-like roster confidence messages such as all teams valid and 506 total players assigned (`src/src_figma/app/pages/FranchiseSetup.tsx:1111-1118`), but the initializer does not actually validate or copy those rosters.

### Franchise home/hub

`FranchiseHome` is the main hub and imports regular-season, playoff, offseason, synthetic game, post-game processing, schedule, narrative, milestone, and season-transition utilities (`src/src_figma/app/pages/FranchiseHome.tsx:1-79`). Its tab model includes regular, team, schedule, standings, news, leaders, rosters, all-star, museum, offseason, and playoff surfaces (`src/src_figma/app/pages/FranchiseHome.tsx:92`).

It keeps local state for phase/tab/schedule/franchise/playoff data and refreshes after post-game navigation (`src/src_figma/app/pages/FranchiseHome.tsx:141-216`). It also owns playoff creation/simulation, schedule actions, offseason start, new-season transition, and GameTracker launch.

### GameTracker integration

Franchise launch builds away/home rosters through `buildFranchiseGameTrackerRoster` and navigates to `/game-tracker/{id}` with `gameMode: "franchise"`, `franchiseId`, `leagueId`, `scheduleGameId`, `seasonNumber`, inning settings, and manager context (`src/src_figma/app/pages/FranchiseHome.tsx:2830-3114`).

GameTracker computes season/stats scope from navigation state and passes franchise context to `hookEndGame` (`src/src_figma/app/pages/GameTracker.tsx:11309-11339`). The game state hook stores season/stats/franchise context during initialization and uses `processCompletedGame` at end-game time (`src/src_figma/hooks/useGameState.ts:4026-4239`, `src/src_figma/hooks/useGameState.ts:10879-10948`).

### Post-game/stat processing

`processCompletedGame` aggregates the game to season, captures optional player-rating snapshots, archives the completed game, and registers almanac players (`src/utils/processCompletedGame.ts:105-140`). GameTracker separately marks the schedule game complete after end-game aggregation (`src/src_figma/app/pages/GameTracker.tsx:11387-11412`).

`PostGameSummary` resolves game mode and returns franchise/playoff games to the franchise route with refresh state (`src/src_figma/app/pages/PostGameSummary.tsx:1188-1225`).

### Schedule, standings, playoffs

Schedule storage is global `kbl-schedule`, but scheduled games can carry `franchiseId` (`src/utils/scheduleStorage.ts:14-30`). Generic season queries exist (`src/utils/scheduleStorage.ts:142-180`), and franchise-scoped helpers also exist (`src/utils/scheduleStorage.ts:510-547`).

The active `useScheduleData` hook uses generic `getAllGames(seasonNumber)` and `getScheduleMetadata(seasonNumber)`, not franchise-scoped helpers (`src/src_figma/hooks/useScheduleData.ts:75-106`). `FranchiseHome` uses this hook as `useScheduleData(currentSeason)` (`src/src_figma/app/pages/FranchiseHome.tsx:141-178`), so much of the franchise schedule display/action layer is season-scoped rather than franchise-scoped.

Standings are calculated from the latest 500 completed games filtered by `seasonId` (`src/utils/seasonStorage.ts:796-803`). `useFranchiseData` uses `calculateStandings(seasonId)` but loads league structure from the first league template (`src/src_figma/hooks/useFranchiseData.ts:357-389`).

Playoff storage is global `kbl-playoffs` (`src/utils/playoffStorage.ts:21-29`). Playoffs are looked up by season and source type, not franchise ID (`src/utils/playoffStorage.ts:515-554`; `src/src_figma/hooks/usePlayoffData.ts:113-149`).

### Offseason systems

Offseason storage is global `kbl-offseason` and includes state, awards, ratings, retirements, free agency, draft, and trades stores (`src/utils/offseasonStorage.ts:218-229`). It defines 11 phases: standings final, awards, ratings adjustments, contraction/expansion, retirements, free agency, draft, farm reconciliation, chemistry rebalancing, trades, and spring training (`src/utils/offseasonStorage.ts:27-52`).

The UI is broad, but many flows use global/static data through `useOffseasonData`, which loads `../../data/playerDatabase` data rather than franchise DB data (`src/src_figma/hooks/useOffseasonData.ts:269-305`). Free agency and draft persist some offseason records, then mutate League Builder storage (`src/src_figma/app/components/FreeAgencyFlow.tsx:384-443`, `src/src_figma/app/components/DraftFlow.tsx:430-526`).

### Storage/persistence modules

Observed storage boundaries:
- `kbl-app-meta`: franchise list/settings/config (`src/utils/franchiseManager.ts:74-85`).
- `kbl-franchise-{id}`: per-franchise players/teams (`src/utils/franchisePlayerStorage.ts:119-163`).
- `kbl-tracker`: completed games, season stats, career stats, season metadata (`src/utils/trackerDb.ts:16-101`).
- `kbl-event-log`: event streams (`src/utils/eventLog.ts:47-56`).
- `kbl-schedule`: schedules (`src/utils/scheduleStorage.ts:14-20`).
- `kbl-playoffs`: playoffs (`src/utils/playoffStorage.ts:21-29`).
- `kbl-offseason`: offseason state (`src/utils/offseasonStorage.ts:218-229`).
- `kbl-transactions`: transaction log (`src/utils/transactionStorage.ts:22-27`).
- `kbl-farm`: global farm storage (`src/utils/farmStorage.ts:36-41`).

This is a mixed global/per-franchise design, not the clean franchise save-slot model implied by Mode 2.

### Engines/calculators

Built or partially built engines include WAR calculators, leverage/WPA, mWAR, fielding/fWAR, milestone detection, narrative, relationships, fan morale, mojo, fitness, park factors, adaptive learning, salary, season transition, and synthetic simulation. Examples:
- `src/engines/mojoEngine.ts:1-13`.
- `src/engines/fitnessEngine.ts:1-13`.
- `src/engines/fanMoraleEngine.ts:1-18`.
- `src/engines/narrativeEngine.ts:1-16`.
- `src/engines/adaptiveLearningEngine.ts:1-9`.
- `src/engines/parkFactorDeriver.ts:1-27`.
- `src/utils/syntheticGameFactory.ts:1-13`.

### Tests and coverage areas

The repo has broad test files under `src/src_figma/__tests__/**`, `src/engines/__tests__/**`, and `src/__tests__/**`. The inventory includes GameTracker, at-bat events, aggregation, season storage, franchise mode, schedule, playoff, reporter, WAR, leverage, mWAR, mojo/fitness, and persistence tests. However, the highest-level franchise component tests are shallow/mocked; `FranchiseHome.test.tsx` says it focuses on render/basic navigation due to component complexity (`src/src_figma/__tests__/franchiseMode/FranchiseHome.test.tsx:1-8`) and mocks most children/hooks (`src/src_figma/__tests__/franchiseMode/FranchiseHome.test.tsx:45-149`).

## 3. Spec Coverage Matrix

The section rulings are from `MODE_2_SECTION_MAP.md:16-43` and the ruling summary at `MODE_2_SECTION_MAP.md:45-50`.

| Mode 2 section | Map ruling | Repo status | Evidence and audit note |
|---|---:|---|---|
| 1. Overview & Mode Definition | SIMPLIFY | Partially Built, Drifted | Mode 2 should receive a complete franchise save slot and produce complete season artifacts (`MODE_2_V1_FINAL.md:80-106`). The repo has a hub and many artifacts, but initialization only creates metadata/config/schedule (`src/utils/franchiseInitializer.ts:41-105`). |
| 2. Event Model | SIMPLIFY | Partially Built, Drifted | AtBat and BetweenPlay storage exists (`src/utils/eventLog.ts:47-56`, `src/utils/eventLog.ts:206-285`). Transaction storage exists but uses a broad older transaction taxonomy, not the Mode 2 eight TransactionEvent types (`src/utils/transactionStorage.ts:56-98`; spec scope at `MODE_2_V1_FINAL.md:109-111`). `updateAtBatEvent` can update `result`, conflicting with outcome immutability (`src/utils/eventLog.ts:1207-1245`). |
| 3. GameTracker - 1-Tap Recording | KEEP | Built, with franchise wiring gaps | Routed GameTracker exists (`src/App.tsx:224-233`), launches with franchise context (`src/src_figma/app/pages/FranchiseHome.tsx:2997-3114`), and ends games through aggregation (`src/src_figma/app/pages/GameTracker.tsx:11309-11355`). Roster launch depends on franchise DB being populated (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:186-234`). |
| 4. Enrichment System | SIMPLIFY | Partially Built, Possibly Overbuilt | Enrichment/update APIs exist in event log (`src/utils/eventLog.ts:1207-1305`), and GameTracker has post-game enrichment prompts. Section Map says remove between-inning enrichment prompt material (`MODE_2_SECTION_MAP.md:81-90`), so any active between-inning LLM/enrichment prompt behavior should be reviewed before stabilizing. |
| 5. Between-Play Events | KEEP | Built/Partially Built | Between-play store exists (`src/utils/eventLog.ts:47-56`), and `BetweenPlayEventType` includes runner actions, substitutions, pitcher changes, position changes, mojo/fitness, injury, pitch count, manager moments, and recommendations (`src/utils/eventLog.ts:449-456`). Persistence and versioning tests exist in `src/src_figma/__tests__/gameTracker/betweenPlayEventVersioning.test.ts`. |
| 6. Baseball Rules & Logic | KEEP | Built/Partially Built | GameTracker/baseball logic tests cover runner movement, inherited runners, save detector, infield fly, D3K, score reconciliation, special events, and many bugfix regressions. This area appears strong, but this audit did not re-execute tests. |
| 7. Substitution System | SIMPLIFY | Built/Overbuilt Risk | Active GameTracker has substitution-related tests and modals, including double-switch tests (`src/src_figma/__tests__/gameTracker/DoubleSwitchModal.test.tsx`). Section Map says remove `double_switch` and add batting order swap (`MODE_2_SECTION_MAP.md:92-101`), so active substitution types need a focused compliance pass. |
| 8. Stats Pipeline | SIMPLIFY | Built/Partially Built | `processCompletedGame` and `aggregateGameToSeason` form a real pipeline (`src/utils/processCompletedGame.ts:105-140`, `src/utils/seasonAggregator.ts:92-140`). Storage tiers are global `kbl-tracker` rather than clearly franchise-slot based (`src/utils/trackerDb.ts:16-101`). |
| 9. Pitcher Stats & Decisions | SIMPLIFY | Built/Partially Built | Pitcher game stats are archived in completed game records (`src/utils/gameStorage.ts:575-578`), and tests cover pitcher decisions/pitch count/save logic. Need verify simplified pitch-count rules versus active prompts before final acceptance. |
| 10. Fielding System | SIMPLIFY | Built/Partially Built, Overbuilt Risk | Fielding events are a first-class event-log store (`src/utils/eventLog.ts:47-56`), and fWAR tests exist. Adaptive fielding learning updates probability weights after samples (`src/engines/adaptiveLearningEngine.ts:1-9`, `src/engines/adaptiveLearningEngine.ts:118-140`), which may be beyond the simplified primary-fielder v1 intent (`MODE_2_SECTION_MAP.md:128-140`). |
| 11. WAR System | SIMPLIFY | Built/Partially Built | Season stats include bWAR/rWAR/fWAR/totalWar and pWAR fields (`src/utils/seasonStorage.ts:36-123`), and `useSeasonStats` computes leaders on the fly. Section Map defers WAR calibration (`MODE_2_SECTION_MAP.md:142-153`), but `calibrationService` and tests exist, so calibration-like work should be treated as ahead-of-spec until explicitly accepted. |
| 12. Leverage Index & Win Probability | KEEP | Built | AtBatEvent stores leverage, win probability, WPA, and model fields (`src/utils/eventLog.ts:240-251`). Tests exist for leverage/WPA runtime and matrix behavior. |
| 13. Clutch Attribution | SIMPLIFY | Partially Built | WPA/mWAR/clutch fields and tests exist. Need a focused mapping between active clutch/fame trigger code and the Section Map title correction around "Fame Trigger Stacking" (`MODE_2_SECTION_MAP.md:155-167`). |
| 14. Mojo & Fitness System | SIMPLIFY | Drifted/Overbuilt | Spec says user-observed mojo/fitness changes (`MODE_2_V1_FINAL.md:1819-1875`). Repo engines model automatic triggers, carryover, decay, recovery, injury chance, and juiced cooldown (`src/engines/mojoEngine.ts:44-68`, `src/engines/mojoEngine.ts:160-205`, `src/engines/fitnessEngine.ts:42-50`, `src/engines/fitnessEngine.ts:100-121`). Franchise launch currently defaults all players to normal/FIT (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:260-287`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:342-372`). |
| 15. Modifier Registry & Special Events | SIMPLIFY | Missing/Partial | Individual traits/modifier-like systems exist, but no clearly active central modifier registry file was found in the inspected source inventory. Section Map explicitly warns to remove examples that set mojo/fitness automatically (`MODE_2_SECTION_MAP.md:185-194`), which matters because the current mojo/fitness engines do automate changes. |
| 16. Narrative System | KEEP | Partially Built/Overbuilt | Narrative engine has reporter personalities, morale impact, and template/Claude-ready architecture (`src/engines/narrativeEngine.ts:1-16`, `src/engines/narrativeEngine.ts:23-88`). Active recap helper generates game recaps with temporary reporters (`src/src_figma/app/engines/narrativeIntegration.ts:46-80`). Franchise news uses recent games globally rather than a franchise-filtered narrative history (`src/src_figma/app/pages/FranchiseHome.tsx:4224-4308`). |
| 17. Dynamic Designations | KEEP | Partially Built | Fan favorite/designation-related engine/tests exist, and fan morale/designation fields exist in engines. Full active franchise integration is not clearly complete; TeamHub comments still say fan morale/stadium/manager tabs are not implemented there (`src/src_figma/app/components/TeamHubContent.tsx:503-504`). |
| 18. Milestone System | SIMPLIFY | Partially Built | Milestone detector/aggregator files exist, and GameTracker launch wires milestone-watch player IDs. Need confirm career/franchise-first/team milestone persistence against scoped franchise data before marking built. |
| 19. Fan Favorite & Albatross Trade Mechanics | DEFER | Deferred, with Overbuilt Pieces | Section Map defers this entire section (`MODE_2_SECTION_MAP.md:34`, `MODE_2_SECTION_MAP.md:48-50`). Repo has fan-favorite/trade-scrutiny-like systems and tests, so those should be isolated as future/inert unless intentionally moved into v1. |
| 20. Fan Morale System | SIMPLIFY | Partially Built/Drifted | Fan morale engine is large (`src/engines/fanMoraleEngine.ts:1-18`, `src/engines/fanMoraleEngine.ts:1084-1195`). The active hook comment says it was previously stubbed because of API mismatch and not imported/used at that time (`src/src_figma/app/hooks/useFanMorale.ts:7-13`), but GameTracker now imports it and updates morale at game end (`src/src_figma/app/pages/GameTracker.tsx:11209-11276`). It uses hard-coded `{ season: 1, game: 1 }` in that update (`src/src_figma/app/pages/GameTracker.tsx:11243-11265`). |
| 21. Standings & Playoffs | KEEP | Partially Built, Scope Risk | Standings calculate from completed games (`src/utils/seasonStorage.ts:796-929`). Playoff storage/engine/hook exist, but playoff lookup is season/source scoped, not franchise scoped (`src/utils/playoffStorage.ts:515-554`; `src/src_figma/hooks/usePlayoffData.ts:113-149`). |
| 22. Schedule System | SIMPLIFY | Partially Built/Drifted | Status enum is correctly trimmed to SCHEDULED/IN_PROGRESS/COMPLETED/SKIPPED (`src/utils/scheduleStorage.ts:26`). However active UI has SIM controls (`src/src_figma/app/pages/FranchiseHome.tsx:3459-3494`) despite the v1 no-simulation rule (`MODE_2_V1_FINAL.md:2927-2934`). Generic schedule hook is not franchise-scoped (`src/src_figma/hooks/useScheduleData.ts:75-106`). |
| 23. Adaptive Standards Engine | KEEP | Partially Built/Overbuilt | Adaptive fielding learning exists (`src/engines/adaptiveLearningEngine.ts:1-9`). WAR/calibration tests exist. Need determine whether active standards are the Mode 2 adaptive standards or a mix of fielding inference/calibration services. |
| 24. Stadium Analytics & Park Factors | SIMPLIFY | Partially Built | Park factors can be derived from SMB4 park dimensions (`src/engines/parkFactorDeriver.ts:1-27`, `src/engines/parkFactorDeriver.ts:83-98`). There is no evidence in the active franchise flow of full stadium records/spray-chart persistence required by later subsections. |
| 25. AI Game Engine | DEFER | Drifted/Overbuilt | Section Map defers AI game engine (`MODE_2_SECTION_MAP.md:40`, `MODE_2_SECTION_MAP.md:48-50`). Repo has production synthetic game generation (`src/utils/syntheticGameFactory.ts:1-13`, `src/utils/syntheticGameFactory.ts:271-320`) and franchise UI sim controls (`src/src_figma/app/pages/FranchiseHome.tsx:3116-3278`, `src/src_figma/app/pages/FranchiseHome.tsx:3459-3494`). |
| 26. Franchise Data Flow | SIMPLIFY | Partially Built/Drifted | Mode 2 data flow expects event-derived franchise state and handoff artifacts (`MODE_2_V1_FINAL.md:3163-3229`). Repo has pieces, but persistence boundaries are split across global stores and export/import only covers the per-franchise DB (`src/utils/franchiseManager.ts:451-543`). |
| 27. V2 / Deferred Material | DEFER | Overbuilt Pieces | Deferred material exists in active or testable form: AI sim, calibration-like services, fan favorite/trade scrutiny, and richer mojo/fitness automation. Needs feature flags or explicit v1 acceptance. |
| 28. Decision Traceability | KEEP | Partially Built | Many files cite older specs (`src/utils/franchiseManager.ts:1-12`, `src/src_figma/app/pages/FranchiseSelector.tsx:1-8`) rather than Mode 2 v1. The repo has comments but no centralized traceability map tying active code to Mode 2 section rulings. |

## 4. Data Flow Audit

### Mode 1 to Mode 2 handoff

Spec expectation: Mode 2 receives a franchise save slot, league structure, complete rosters, farm rosters, rules, schedule, franchise type/controlled flags, and initialized subsystems (`MODE_2_V1_FINAL.md:80-91`).

Repo behavior:
- Setup stores `FranchiseConfig`, selected league, season settings, playoff settings, teams/player assignments, and roster mode in UI state.
- `initializeFranchise` creates metadata, loads league teams, chooses the first selected controlled team, saves config, generates schedule, tags schedule games with `franchiseId`, and sets the active franchise (`src/utils/franchiseInitializer.ts:41-105`).
- It does not call `deepCopyLeagueToFranchise`, does not copy farm rosters, and does not create season metadata despite the file comment claiming it does (`src/utils/franchiseInitializer.ts:1-13`).

Audit result: Partially built, with a critical missing handoff.

### Franchise initialization

The per-franchise database can store players and teams, and `deepCopyLeagueToFranchise` can copy a League Builder league into `kbl-franchise-{id}` (`src/utils/franchisePlayerStorage.ts:273-345`). Because setup does not call it, the canonical franchise roster state is likely empty for fresh franchises.

This directly impacts `buildFranchiseGameTrackerRoster`: when `franchiseId` exists it loads all franchise players and filters by assignment; if none are found it returns empty rosters (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:186-234`).

### GameTracker event stream

Event-log DB is global `kbl-event-log` with stores for game headers, at-bat events, pitching appearances, fielding events, and between-play events (`src/utils/eventLog.ts:47-56`). At-bat events include optional `seasonId`, `statsScopeId`, `competitionType`, `competitionId`, `franchiseId`, and `leagueId` (`src/utils/eventLog.ts:264-272`).

Audit result: strong event stream, but franchise identity is optional and storage is global. The design can work if every event consistently carries franchise/stats scope, but that is a contract to enforce with tests.

### Post-game processing

GameTracker computes `seasonId` as `{franchiseId}-season-{seasonNumber}` for franchise games and passes it to `hookEndGame` (`src/src_figma/app/pages/GameTracker.tsx:11309-11339`). The hook calls `processCompletedGame` with target stats scope and franchise/current season options (`src/src_figma/hooks/useGameState.ts:10879-10948`).

`processCompletedGame` aggregates season stats and archives the completed game (`src/utils/processCompletedGame.ts:105-140`). `archiveCompletedGame` stores `seasonId`, `statsScopeId`, competition fields, league ID, and game data in `kbl-tracker` completed games (`src/utils/gameStorage.ts:697-817`). It does not include `franchiseId` or `scheduleGameId` in the archived record context even though `GameRecord` type defines them as optional (`src/utils/gameStorage.ts:617-622`, `src/utils/gameStorage.ts:697-727`).

Audit result: mostly built, but archived completed game identity should be strengthened.

### Season stat aggregation

`aggregateGameToSeason` exists and updates season batting, pitching, fielding, fame, metadata, and milestones (`src/utils/seasonAggregator.ts:92-140`). Season stats live in global `kbl-tracker` keyed by `seasonId` and player ID (`src/utils/trackerDb.ts:71-101`).

Audit result: built as a global scoped-by-ID system. It can support franchises if `seasonId` is always unique and consistently used.

### Transaction events

Spec expectation: a simplified Mode 2 TransactionEvent stream with eight v1 types and deferred DFA/waiver/contract extension (`MODE_2_V1_FINAL.md:109-111`; `MODE_2_SECTION_MAP.md:70-80`).

Repo behavior: `transactionStorage` exists, but its types are broader and older, including game flow, awards, nickname/personality/trait, HOF, championship, manual edit, and other categories (`src/utils/transactionStorage.ts:56-98`). It stores in global `kbl-transactions` with season/game indexes (`src/utils/transactionStorage.ts:22-27`, `src/utils/transactionStorage.ts:155-186`).

Audit result: storage utility exists, but not Mode 2 TransactionEvent-aligned and not franchise-scoped.

### Schedule and standings updates

Schedule update after GameTracker is real: GameTracker calls `completeScheduleGame` for franchise/playoff games (`src/src_figma/app/pages/GameTracker.tsx:11387-11412`).

However, the active schedule hook loads all games by `seasonNumber` (`src/src_figma/hooks/useScheduleData.ts:92-99`). `FranchiseHome` season completion uses global `getAllGames(currentSeason)` rather than franchise-scoped games (`src/src_figma/app/pages/FranchiseHome.tsx:2807-2823`). Standings compute from completed games by `seasonId` and only read the latest 500 games (`src/utils/seasonStorage.ts:796-803`).

Audit result: schedule/standings work for simple single-franchise use, but multi-franchise isolation is fragile.

### Playoff flow

Playoff bracket/series/game storage exists and can record series games with no ties (`src/utils/playoffStorage.ts:736-795`). `FranchiseHome` can create seeds from standings, start playoffs, launch playoff GameTracker, and simulate playoff games (`src/src_figma/app/pages/FranchiseHome.tsx:519-589`, `src/src_figma/app/pages/FranchiseHome.tsx:712-903`).

Risks:
- Playoff lookup is season/source scoped, not franchise scoped (`src/utils/playoffStorage.ts:515-554`).
- `usePlayoffData.createNewPlayoff` uses `leagueTemplates[0]`, not the selected franchise league (`src/src_figma/hooks/usePlayoffData.ts:244-375`).
- Playoff synthetic sim records series results but does not go through the same player-stat aggregation path as played games (`src/src_figma/app/pages/FranchiseHome.tsx:837-903`).

Audit result: partially built with scoping and stat-consistency risks.

### Season summary / offseason handoff

Mode 2 should produce final stats, standings, WAR, playoff results, award candidates, milestones, fame, morale, and narrative history (`MODE_2_V1_FINAL.md:93-106`). Repo has many systems but handoff is not cohesive.

Offseason start uses `startNewOffseason` with `season-${currentSeason}` (`src/src_figma/app/pages/FranchiseHome.tsx:421-434`), not the franchise season ID pattern used for stats (`{franchiseId}-season-{seasonNumber}`). This can detach offseason records from franchise-specific season stats.

Season transition engine archives via localStorage stubs, ages players through a storage adapter, recalculates salaries, resets mojo, clears localStorage stats keys, applies rookie designations, and increments service time (`src/engines/seasonTransitionEngine.ts:92-246`). It does not appear to archive the full IndexedDB season artifact set.

Audit result: partially built, not durable enough as Mode 2 to Mode 3 handoff.

### Persistence boundaries

The repo's current architecture is hybrid:
- Metadata/config/per-franchise rosters can be per-franchise.
- Schedule is global with optional franchise tags.
- Event log is global with optional franchise/stats IDs.
- Completed games/season stats are global keyed by season/stats scope.
- Playoffs and offseason are global and insufficiently franchise-scoped.
- Export/import only covers per-franchise DB stores (`src/utils/franchiseManager.ts:451-543`).

Audit result: this is the central architectural risk.

## 5. Feature-by-Feature Analysis

### Franchise selector/setup

Status: Partially Built.

Built:
- Selector CRUD/export UI exists (`src/src_figma/app/pages/FranchiseSelector.tsx:36-100`, `src/src_figma/app/pages/FranchiseSelector.tsx:147-263`).
- Setup wizard captures league, season, playoff, team control, roster mode, and confirmation.
- Setup calls initializer and navigates to the franchise hub (`src/src_figma/app/pages/FranchiseSetup.tsx:72-89`).

Gaps/drift:
- Validation is too shallow (`src/src_figma/app/pages/FranchiseSetup.tsx:101-110`).
- Existing-roster summary appears asserted rather than validated (`src/src_figma/app/pages/FranchiseSetup.tsx:1111-1118`).
- Fantasy draft option is captured in config UI but not implemented in `initializeFranchise` (`src/src_figma/app/pages/FranchiseSetup.tsx:1124-1285`, `src/utils/franchiseInitializer.ts:41-105`).
- Roster copy into franchise DB is missing (`src/utils/franchisePlayerStorage.ts:273-345` exists but setup does not call it).

### Franchise home

Status: Built shell, Partially Built data integrity.

Built:
- Hub tabs and many flows exist (`src/src_figma/app/pages/FranchiseHome.tsx:92`, `src/src_figma/app/pages/FranchiseHome.tsx:914-960`).
- Refresh after post-game exists (`src/src_figma/app/pages/FranchiseHome.tsx:192-216`).
- New season transition and schedule generation exist (`src/src_figma/app/pages/FranchiseHome.tsx:335-374`).

Risks:
- Schedule hook is not franchise-scoped (`src/src_figma/hooks/useScheduleData.ts:75-106`).
- Season completion checks all season games globally (`src/src_figma/app/pages/FranchiseHome.tsx:2807-2823`).
- UI includes deferred simulation controls (`src/src_figma/app/pages/FranchiseHome.tsx:3459-3494`).

### Today's game

Status: Partially Built.

Built:
- `FranchiseHome` shows a next-game card from `scheduleData.nextGame` and supports Play/Score/Skip plus simulation (`src/src_figma/app/pages/FranchiseHome.tsx:3421-3523`).
- `useFranchiseData` has a franchise-scoped next-game helper call (`src/src_figma/hooks/useFranchiseData.ts:499-533`).

Gaps:
- `useFranchiseData` hard-codes season 1 for next franchise game (`src/src_figma/hooks/useFranchiseData.ts:508-510`).
- The visible next-game card uses `scheduleData.nextGame`, which comes from the unscoped schedule hook (`src/src_figma/hooks/useScheduleData.ts:81-99`).

### Team hub/rosters

Status: Partially Built, split source of truth.

Built:
- TeamHub loads per-franchise team/all franchise players for optimal-lineup state (`src/src_figma/app/components/TeamHubContent.tsx:392-420`).
- Optimal lineup save/recalculate/compare paths are wired (`src/src_figma/app/components/TeamHubContent.tsx:555-693`).

Gaps:
- Display roster/stats data still comes from `useOffseasonData` realTeams/realPlayers rather than franchise DB (`src/src_figma/app/components/TeamHubContent.tsx:357-363`, `src/src_figma/app/components/TeamHubContent.tsx:442-454`, `src/src_figma/app/components/TeamHubContent.tsx:480-501`).
- TeamHub comments say fan morale, stadium park factors, and manager tracking are not yet implemented in those tabs (`src/src_figma/app/components/TeamHubContent.tsx:503-504`).

### Schedule

Status: Partially Built, Drifted.

Built:
- Add/complete/skip/delete schedule storage exists.
- Franchise ID tag and franchise-scoped helpers exist (`src/utils/scheduleStorage.ts:28-48`, `src/utils/scheduleStorage.ts:510-547`).

Gaps:
- Active hook loads generic season games (`src/src_figma/hooks/useScheduleData.ts:92-99`).
- Metadata is season-only, not franchise-season (`src/utils/scheduleStorage.ts:50-55`).
- UI exposes simulation despite v1 no-sim rule.

### Standings

Status: Partially Built.

Built:
- Standings can be calculated from completed games (`src/utils/seasonStorage.ts:796-929`).
- Franchise data hook seeds league/division view with 0-0 entries when no games exist (`src/src_figma/hooks/useFranchiseData.ts:398-490`).

Gaps:
- Standings depend on global completed-game recency and `seasonId`.
- League structure uses the first league template (`src/src_figma/hooks/useFranchiseData.ts:357-369`).

### News/narrative

Status: Partially Built/Overbuilt.

Built:
- Narrative engine and recap integration exist (`src/engines/narrativeEngine.ts:1-16`, `src/src_figma/app/engines/narrativeIntegration.ts:46-80`).
- GameTracker generates dual narratives at game end (`src/src_figma/app/pages/GameTracker.tsx:11278-11307`).

Gaps:
- Beat writer UI has an empty expandable state in the franchise hub (`src/src_figma/app/pages/FranchiseHome.tsx:3537-3547`).
- Franchise news uses global `getRecentGames(20)` and recap generation rather than a scoped narrative history (`src/src_figma/app/pages/FranchiseHome.tsx:4224-4308`).

### League leaders

Status: Built/Partially Built.

Built:
- `useSeasonStats` computes batting/pitching leaderboards for season scope.
- `useFranchiseData` maps batting/pitching leaders to FranchiseHome display data (`src/src_figma/hooks/useFranchiseData.ts:314-346`).

Gaps:
- Correctness depends on seasonId scoping being consistent through aggregation.
- Playoff fielding leader display needs review; fielding-related playoff UI appeared to call batting leader accessors in `FranchiseHome` during inspection.

### Awards

Status: Partially Built.

Built:
- Offseason awards storage exists (`src/utils/offseasonStorage.ts:462-505`).
- Awards flow is routed as a component inside FranchiseHome/offseason.

Gaps:
- Award candidates are not clearly generated from final franchise stats/WAR as a durable Mode 2 handoff artifact.

### Ratings adjustments

Status: Partially Built, source-of-truth risk.

Built:
- Ratings adjustment flow computes changes using WAR/age/manager data and persists offseason adjustment records.

Gaps:
- It loads global/offseason data and mutates League Builder players rather than franchise DB players (`src/src_figma/app/components/RatingsAdjustmentFlow.tsx:305-455` from inspection).

### Farm/reconciliation

Status: Mostly Missing/Placeholder for franchise flow.

Built:
- Global farm storage exists (`src/utils/farmStorage.ts:1-7`, `src/utils/farmStorage.ts:99-188`).
- Offseason phase enum includes farm reconciliation (`src/utils/offseasonStorage.ts:27-52`).

Gaps:
- Farm storage is global, not franchise-scoped.
- FranchiseHome farm reconciliation surface is a placeholder in the offseason flow.

### Chemistry

Status: Partially Built/Placeholder.

Built:
- Relationship/chemistry engine and hook exist, and `useFranchiseData` exposes relationship data (`src/src_figma/hooks/useFranchiseData.ts:306-307`).

Gaps:
- FranchiseHome chemistry rebalance is mostly placeholder and not proven as a durable offseason mutation.

### Spring training

Status: Partially Built/Placeholder.

Built:
- Spring training flow computes projections using offseason data and aging engine.

Gaps:
- It does not appear to persist meaningful franchise roster changes; it is closer to preview/completion UI.

### Free agency

Status: Partially Built, Drifted source of truth.

Built:
- Free agency flow loads teams/players and stores signings/declines in offseason state (`src/src_figma/app/components/FreeAgencyFlow.tsx:137-159`, `src/src_figma/app/components/FreeAgencyFlow.tsx:384-407`).

Gaps/drift:
- It limits real teams to the first 8 (`src/src_figma/app/components/FreeAgencyFlow.tsx:146-150`).
- It mutates League Builder rosters via `transferPlayer`/`retirePlayer`, not franchise DB rosters (`src/src_figma/app/components/FreeAgencyFlow.tsx:410-430`).

### Draft

Status: Partially Built, Drifted source of truth.

Built:
- Draft flow builds a class, order, picks, and storage draft records (`src/src_figma/app/components/DraftFlow.tsx:154-255`, `src/src_figma/app/components/DraftFlow.tsx:430-453`).

Gaps/drift:
- It slices teams to first 20 and assumes 22 MLB/rest farm (`src/src_figma/app/components/DraftFlow.tsx:121-137`).
- Inactive/ineligible player lists are empty placeholders (`src/src_figma/app/components/DraftFlow.tsx:148-152`).
- It creates drafted players in League Builder and appends to League Builder farm rosters (`src/src_figma/app/components/DraftFlow.tsx:455-512`), not per-franchise storage.

### Retirements

Status: Partially Built, source-of-truth risk.

Built:
- Retirement flow exists and saves offseason retirement records.

Gaps:
- It uses global/offseason data and mutates League Builder players; needs franchise-scoped persistence before use as canonical offseason behavior.

### Contraction

Status: Deferred/Placeholder.

Built:
- UI component exists.

Gaps:
- Component states this is coming in a future update and supports skip-phase behavior.

### Playoffs

Status: Partially Built.

Built:
- Playoff storage/engine/hooks exist, bracket generation and series recording exist, and GameTracker launch carries playoff context (`src/utils/playoffStorage.ts:437-500`, `src/utils/playoffStorage.ts:736-795`, `src/src_figma/app/pages/FranchiseHome.tsx:712-835`).

Gaps:
- Not franchise-scoped.
- Uses first league template in playoff creation.
- Simulated playoff games do not use same stat aggregation path as played games.

### Season finalization

Status: Partially Built.

Built:
- Season completion check and offseason start exist (`src/src_figma/app/pages/FranchiseHome.tsx:2807-2823`, `src/src_figma/app/pages/FranchiseHome.tsx:421-434`).
- Season transition engine performs several operations (`src/engines/seasonTransitionEngine.ts:92-246`).

Gaps:
- Completion/offseason IDs are inconsistent with franchise season IDs.
- Full Mode 2 output artifact set is not assembled into a durable handoff.

## 6. Systems Audit

### Stats pipeline

Status: Built/Partially Built.

The pipeline from GameTracker end-game to `processCompletedGame` to season aggregation is real. The main risk is identity/scoping, not the existence of stats logic. Completed games are archived globally in `kbl-tracker` with season/stats scope fields (`src/utils/gameStorage.ts:697-817`), and standings read recent completed games by `seasonId` (`src/utils/seasonStorage.ts:796-803`).

### WAR and advanced metrics

Status: Built/Partially Built.

Season stat structures include WAR components (`src/utils/seasonStorage.ts:36-123`), and tests cover bWAR, pWAR, fWAR, rWAR, mWAR, and park-factor variants. Calibration-like code should remain carefully bounded because Section Map defers WAR calibration (`MODE_2_SECTION_MAP.md:142-153`).

### Leverage/WPA/mWPA

Status: Built.

AtBatEvent stores leverage/WPA fields (`src/utils/eventLog.ts:240-251`), and GameTracker/useGameState routes manager decision data into completed game records (`src/utils/gameStorage.ts:586-595`, `src/utils/gameStorage.ts:776-785`). Tests cover leverage, WPA, mWAR matrices, and runtime boundaries.

### Mojo/fitness

Status: Drifted/Overbuilt.

Mode 2 simplified spec treats mojo/fitness changes as user-observed. Repo engines automate triggers, carryover, decay, recovery, injury risk, and juiced cooldown (`src/engines/mojoEngine.ts:44-68`, `src/engines/mojoEngine.ts:160-205`, `src/engines/fitnessEngine.ts:42-50`, `src/engines/fitnessEngine.ts:100-121`). Franchise GameTracker launch defaults players to normal/FIT (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:260-287`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:342-372`), so even if the engines exist, franchise persistence of observed state is not mature.

### Fan morale

Status: Partially Built/Drifted.

The engine is substantial (`src/engines/fanMoraleEngine.ts:1-18`, `src/engines/fanMoraleEngine.ts:1084-1195`). The hook warns it was stubbed due to prior API mismatch (`src/src_figma/app/hooks/useFanMorale.ts:7-13`), yet GameTracker now imports and uses it (`src/src_figma/app/pages/GameTracker.tsx:943-945`, `src/src_figma/app/pages/GameTracker.tsx:2077-2078`, `src/src_figma/app/pages/GameTracker.tsx:11209-11276`). Game date is hard-coded in GameTracker morale updates, which prevents accurate franchise season/game progression (`src/src_figma/app/pages/GameTracker.tsx:11243-11265`).

### Narrative engine

Status: Partially Built/Overbuilt.

The narrative engine supports reporter personalities, morale impact, templates, reliability, and Claude-ready interface (`src/engines/narrativeEngine.ts:1-16`, `src/engines/narrativeEngine.ts:131-161`). Active game recap integration is lightweight and generates temporary reporters if none are supplied (`src/src_figma/app/engines/narrativeIntegration.ts:46-80`). It is not yet a durable franchise narrative history.

### Milestones

Status: Partially Built.

Milestone detector/aggregator utilities and tests exist. GameTracker launch collects stable roster IDs for milestone-watch lookups through `collectFranchiseRosterPlayerIds` tests (`src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts:117-132`). Full career/franchise-first persistence remains unclear.

### Adaptive standards

Status: Partially Built/Overbuilt.

Adaptive fielding learning stores inferred/actual fielder events and updates probability weights after samples (`src/engines/adaptiveLearningEngine.ts:1-9`, `src/engines/adaptiveLearningEngine.ts:118-140`). This may not be the same as the Mode 2 adaptive standards engine, and it uses localStorage/global sync keys, not franchise scope (`src/engines/adaptiveLearningEngine.ts:39-41`, `src/engines/adaptiveLearningEngine.ts:82-116`).

### Park factors

Status: Partially Built.

Park factor derivation exists from SMB4 stadium dimensions (`src/engines/parkFactorDeriver.ts:1-27`, `src/engines/parkFactorDeriver.ts:83-98`). It currently collapses direction-aware data and includes a TODO for future directional factors (`src/engines/parkFactorDeriver.ts:62-80`).

### Synthetic/AI game simulation

Status: Drifted/Overbuilt.

The spec defers AI game engine and removes simulation buttons from schedule v1 (`MODE_2_SECTION_MAP.md:225-235`, `MODE_2_V1_FINAL.md:2927-2934`). Repo has synthetic game generation, real-roster-ish fallback logic, and FranchiseHome simulation controls (`src/utils/syntheticGameFactory.ts:1-13`, `src/utils/syntheticGameFactory.ts:80-225`, `src/src_figma/app/pages/FranchiseHome.tsx:3116-3278`, `src/src_figma/app/pages/FranchiseHome.tsx:3459-3494`).

### Transaction/event logging

Status: Partially Built/Drifted.

GameTracker events are robust. Transaction logging exists but is broad/legacy and not the Mode 2 simplified event shape (`src/utils/transactionStorage.ts:56-98`). Offseason events are represented as per-phase storage records rather than a single immutable `OffseasonEvent` stream.

## 7. Test Audit

### Existing tests by domain

Observed test domains include:
- Franchise mode: `FranchiseHome`, `FranchiseHomeLaunch`, `FranchiseSetup`, franchise data logic, franchise GameTracker roster.
- GameTracker: at-bat flow, event dispatch, runner correction, undo, substitution, fielding sync, box score, score reconciliation, launch state, end-game, reporter flags, pitch count, runner IDs, etc.
- Aggregation/persistence: processCompletedGame, season aggregation, almanac, career, eventLog, gameStorage, seasonStorage.
- Engines: bWAR, pWAR, fWAR, rWAR, mWAR, leverage/WPA, salary, mojo/fitness, fan morale, relationships, park lookup, calibration.
- Playoff/schedule: playoff logic, playoff fielding scope, elimination awards, schedule content, schedule logic.
- Reporter/narrative: commentary, LLM clients, prompt builders, reporter storage, between-inning popup.

### What tests prove

They prove many lower-level systems have specific behavior guarded, especially GameTracker regressions and stat math. `franchiseGameTrackerRoster.test.ts` proves roster identity preservation, readiness validation, and saved lineup/benchmark loading paths (`src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts:40-204`).

### What important behavior is untested

Highest-value missing tests:
- Full setup-to-hub-to-GameTracker launch for a fresh franchise, asserting the franchise DB has copied teams/players.
- Multi-franchise isolation for schedule, standings, completed games, playoff state, offseason state, and export/import.
- Export/import round trip that includes all global stores relevant to one franchise.
- Franchise setup fantasy-draft mode either disabled or fully implemented.
- Schedule hook should load only `getAllGamesByFranchise` for `FranchiseHome`.
- GameTracker archived completed game should carry `franchiseId`/`scheduleGameId`.
- Offseason free agency/draft/retirement/ratings should mutate franchise DB, not League Builder.
- No simulation controls when Mode 2 v1 feature flag is off.
- Mojo/fitness user-observed boundary: no automatic engine changes in v1 franchise flow.
- Playoff creation should use the selected franchise league and franchise-specific standings.

### Fragile or misleading tests

`FranchiseHome.test.tsx` is explicitly shallow and mocks most children/hooks (`src/src_figma/__tests__/franchiseMode/FranchiseHome.test.tsx:1-8`, `src/src_figma/__tests__/franchiseMode/FranchiseHome.test.tsx:45-149`). It can pass while the real franchise data flow is broken. `FranchiseSetup.test.tsx` tests wizard rendering/navigation but not initializer side effects (`src/src_figma/__tests__/franchiseMode/FranchiseSetup.test.tsx:100-200`).

### Recommended test additions before further franchise work

1. `initializeFranchise` integration test: creates franchise, calls deep copy, stores config, creates schedule, creates season metadata, sets active franchise.
2. Fresh franchise launch test: setup-created franchise can build non-empty away/home GameTracker rosters.
3. Multi-franchise schedule test: two franchises with season 1 schedules do not show each other's games.
4. Multi-franchise standings test: completed games from one franchise do not affect another.
5. GameTracker end-game test: completed game record, event headers, season stats, schedule game, and post-game route all share franchise/schedule IDs.
6. Export/import test: full franchise backup restores metadata/config/rosters/schedule/events/stats/playoffs/offseason.
7. Offseason flow tests against franchise DB adapter.
8. V1 no-simulation UI contract test.
9. User-observed-only mojo/fitness contract test.
10. Playoff scoping test with two franchises in the same season number.

## 8. Spec Drift and Contradictions

1. No simulation vs active simulation: Mode 2 v1 says Score/Skip only (`MODE_2_V1_FINAL.md:2927-2934`), but FranchiseHome has SIM 1/TODAY/WEEK/SEASON buttons (`src/src_figma/app/pages/FranchiseHome.tsx:3459-3494`) and production synthetic games (`src/utils/syntheticGameFactory.ts:1-13`).

2. Complete franchise save slot vs partial initialization: spec input includes complete rosters/farm rosters/initialized stores (`MODE_2_V1_FINAL.md:80-91`), but initializer omits roster/farm copy and season metadata (`src/utils/franchiseInitializer.ts:41-105`).

3. Immutable at-bat outcome vs mutable result updates: spec says outcome never changes (`MODE_2_V1_FINAL.md:68-78`), but `updateAtBatEvent` allows `result` updates (`src/utils/eventLog.ts:1207-1245`).

4. User-observed mojo/fitness vs automatic engines: spec simplified mojo/fitness to observed changes (`MODE_2_SECTION_MAP.md:169-183`), but repo engines model automatic triggers/decay/recovery/injury risk (`src/engines/mojoEngine.ts:44-68`, `src/engines/fitnessEngine.ts:42-50`, `src/engines/fitnessEngine.ts:100-121`).

5. Per-franchise DB comments vs global reality: `franchiseManager` comments say `kbl-franchise-{id}` includes game headers, at-bat events, season stats, career stats, etc. (`src/utils/franchiseManager.ts:1-12`), but active event/game/stat storage is global (`src/utils/eventLog.ts:47-56`, `src/utils/trackerDb.ts:16-101`).

6. Existing rosters validated vs not validated: setup says all teams have valid rosters and 506 players (`src/src_figma/app/pages/FranchiseSetup.tsx:1111-1118`), but initializer does not validate or copy rosters.

7. Fantasy draft option vs no initialization implementation: setup captures fantasy draft settings (`src/src_figma/app/pages/FranchiseSetup.tsx:1124-1285`), but initialization ignores them (`src/utils/franchiseInitializer.ts:41-105`).

8. Offseason storage exists vs franchise mutation wrong target: free agency/draft store records but mutate League Builder storage, not franchise DB (`src/src_figma/app/components/FreeAgencyFlow.tsx:410-430`, `src/src_figma/app/components/DraftFlow.tsx:455-512`).

9. Playoff state lacks franchise scope: playoff lookup is by season/source type only (`src/utils/playoffStorage.ts:515-554`), risking collision between franchises.

10. Spec traceability references are stale: several active files cite older specs (`src/utils/franchiseManager.ts:1-12`, `src/src_figma/app/pages/FranchiseSelector.tsx:1-8`) rather than Mode 2 v1 and the Section Map.

## 9. Recommendations

### Highest-value cleanup/refactor work

1. Build the full franchise export/import manifest.
   - Include per-franchise DB records plus global stores keyed by `franchiseId`, `seasonId`, `statsScopeId`, `scheduleGameId`, and playoff/offseason IDs.
   - This should cover schedule, event log, current/completed games, season stats, playoffs, offseason state, transactions, and app-meta config.

2. Remove or contain legacy global season markers.
   - `FranchiseHome` still writes `kbl-current-season` for compatibility (`src/src_figma/app/pages/FranchiseHome.tsx:149-151`).
   - `franchiseRouteSeason` still falls back to the legacy marker (`src/src_figma/app/utils/franchiseRouteSeason.ts:4-17`).

3. Convert guarded offseason flows into franchise DB adapters.
   - Free agency, draft, retirements, ratings, trades, farm reconciliation, chemistry, and spring training should mutate per-franchise players/teams, not League Builder template data.
   - Keep current guards until each adapter is real.

4. Stabilize season finalization and handoff.
   - Use `buildFranchiseSeasonHandoff` as the identity payload (`src/utils/franchisePersistenceContract.ts:45-76`).
   - Attach completed games, schedule, standings, stats, playoff results, and offseason entry state.

5. Keep synthetic simulation off for Mode 2 v1.
   - The code can remain present for future/developer work, but visible v1 actions and archive paths must stay guarded by `MODE_2_V1_SYNTHETIC_SIM_ENABLED = false`.

6. Decide the long-term correction model.
   - Current behavior is audited mutation with version bump and `editHistory`, not strict append-only immutability (`src/utils/eventLog.ts:971-999`).
   - If the spec wants strict append-only behavior, implement a correction/enrichment layer before changing more GameTracker APIs.

7. Reconcile advanced systems with simplified v1.
   - Mojo/fitness, fan morale, adaptive standards, calibration, fan favorite mechanics, and narrative history need focused passes before being declared canonical Mode 2 v1 behavior.

8. Document traceability.
   - Keep Mode 2 section references close to active code boundaries, especially where a system is deliberately guarded, deferred, or ahead of spec.

### Highest-value missing features

1. Franchise-owned offseason mutation adapters.
2. Full export/import for all data belonging to one franchise.
3. Durable Mode 2 to Mode 3 handoff artifact.
4. Franchise-scoped transaction/offseason event stream beyond the narrowed v1 transaction logger.
5. Awards candidate generation from final franchise stats/WAR.
6. Narrative history storage scoped to franchise/team/player.
7. Fan morale persistence with real season/game context.
8. Farm reconciliation backed by franchise storage.
9. Season finalization that archives complete IndexedDB state, not localStorage stubs.
10. Read-only roster analyzer/recommendation contract.

### What should be stabilized before adding new systems

Stabilize in this order:
1. Full test-suite status and known unrelated failures.
2. Export/import and delete cleanup.
3. Season finalization/handoff manifest.
4. Franchise-owned offseason adapters.
5. Roster analyzer read-only contract.
6. Advanced systems reconciliation.

Do not build more high-level systems on top of the current mixed persistence model unless they are feature-flagged prototypes.

### What should be documented better

- Current active code boundary: `src/src_figma` routed app vs dormant legacy folders.
- Canonical franchise ID and season ID format.
- Which stores are per-franchise, global-scoped, or global-unscoped.
- Whether League Builder data is immutable source template data after franchise creation.
- The exact allowed v1 TransactionEvent types.
- The v1 stance on simulation, mojo/fitness automation, calibration, and fan favorite trade mechanics.
- The audited GameTracker correction policy.
- The current guard-only status of franchise offseason prototype flows.

### Suggested implementation order

1. Run and triage the full test suite.
2. Add export/import and delete-cleanup coverage for all franchise-scoped stores.
3. Build a season-finalization/handoff manifest using canonical IDs.
4. Remove or contain remaining global season marker fallbacks.
5. Implement franchise-owned ratings/retirement adapters.
6. Implement franchise-owned draft/free-agency adapters.
7. Implement franchise-owned trades/farm/chemistry/spring-training adapters.
8. Plan roster analyzer integration as read-only recommendations.
9. Revisit mojo/fitness, fan morale, narrative history, adaptive standards, and calibration.
10. Re-evaluate synthetic simulation only if the Mode 2 spec explicitly changes.

## 10. Future Fit Note: Roster Analyzer / Recommendation Engine

A future roster analyzer should plug in only after the canonical franchise roster state is reliable. The likely insertion points are:
- `franchisePlayerStorage` as the read/write source for franchise players and teams.
- `TeamHubContent` optimal lineup state and compare/recalculate controls (`src/src_figma/app/components/TeamHubContent.tsx:555-693`).
- `buildFranchisePregameReadiness` and `buildFranchiseGameTrackerRoster` for launch validation and GameTracker readiness (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:92-158`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:186-234`).
- Offseason free agency/draft/retirement/ratings flows after they are converted to franchise DB adapters.

This is not a roster constraint integration analysis. The key future-fit conclusion is that the analyzer should consume the franchise DB, not League Builder/static offseason data, and should emit recommendations/events without mutating the source league template.

## Top 10 Findings

1. Waves 1-3 resolved the original highest-risk setup, persistence, schedule, completed-game identity, action-surface, transaction-surface, season-scoping, playoff/offseason-boundary, and restored GameTracker identity blockers.
2. Fresh franchise initialization now copies teams/players into the per-franchise DB and creates canonical season metadata, with setup rollback and conservative legacy repair.
3. Franchise schedule reads/writes and season-completion paths are now franchise-scoped where used by FranchiseHome/SeasonSummary.
4. Completed games, event headers, GameTracker snapshots, archive options, and schedule completion now preserve canonical franchise identity, including restored/direct-entry games.
5. Mode 2 v1 simulation is disabled and hidden/guarded, but synthetic simulation code remains present and should stay off unless the spec changes.
6. Transaction writes have a narrowed Mode 2 v1 API for the canonical eight types, while the broad legacy transaction store remains for older records/surfaces.
7. GameTracker result corrections are guarded audited mutations requiring version bump and edit history; this is safer than silent mutation but not a strict append-only event model.
8. Offseason prototype flows are now blocked from mutating League Builder in franchise context, but full franchise-owned offseason adapters remain the largest functional gap.
9. Some legacy global markers remain for compatibility, especially `kbl-current-season`; future cleanup should remove reliance on them in franchise routes.
10. Focused Wave 1-3 tests and build are green, but broad full-suite status still needs a dedicated hardening pass.

## Suggested Next-Step Roadmap

Path A: Test hardening.
- Run the full test suite and record known unrelated failures separately from franchise blockers.
- Add more browser/component coverage for direct-entry GameTracker restore, postseason launch/return, and guarded offseason UI.
- Add export/import and delete-cleanup tests for all stores that now carry franchise identity.

Path B: Remaining Mode 2 spec completion.
- Build a durable franchise season-finalization manifest around `buildFranchiseSeasonHandoff`.
- Finish scoped narrative/news, awards inputs, milestones, fan morale, and final season summary artifacts.
- Remove or contain legacy global markers such as `kbl-current-season`.

Path C: Roster analyzer integration planning.
- Document the analyzer contract against `franchisePlayerStorage`, not League Builder/template data.
- Define read-only recommendation outputs first: launch readiness, roster holes, farm pressure, lineup/bullpen suggestions, and offseason needs.
- Delay mutation/recommendation execution until offseason adapters exist.

Path D: Franchise-owned offseason adapters.
- Implement DB-backed adapters for ratings, retirements, free agency, draft, trades, farm reconciliation, chemistry, and spring training.
- Replace current read-only franchise guards with real franchise mutation paths one flow at a time.
- Keep League Builder immutable after franchise creation.

## Open Questions

1. Should export/import become a manifest over globally scoped stores, or should more data move into `kbl-franchise-{id}`?
2. Should synthetic simulation code be deleted from Mode 2 surfaces entirely, kept behind the current disabled flag, or preserved only for future developer tooling?
3. Should audited result correction remain acceptable, or should the next spec revision require a strict append-only correction/enrichment layer?
4. What is the preferred order for implementing franchise-owned offseason adapters: ratings/retirement first, or free agency/draft first?
5. Should the roster analyzer begin as read-only planning UI before any recommendation execution is allowed?
6. Which legacy global markers can be removed immediately, and which still need compatibility shims for old saves?
