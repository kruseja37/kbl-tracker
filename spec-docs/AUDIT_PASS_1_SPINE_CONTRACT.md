# Audit Pass 1: Spine / Shared Franchise Data Contract

Date: 2026-05-21

Scope guard:
- Repo-backed audit only.
- No app code implementation.
- No roster analyzer work.
- No gameplay formula, derived/flavor-system, or offseason algorithm audit.
- Pass 2 not started.

Source specs reviewed:
- `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md`
- `spec-docs/SPINE_ARCHITECTURE.md`
- `spec-docs/MODE_2_V1_FINAL.md`
- `spec-docs/MODE_2_SECTION_MAP.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`
- `spec-docs/FARM_SYSTEM_SPEC.md`
- `spec-docs/FRANCHISE_MODE_REPO_AUDIT.md`
- `spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md`

Focused verification run:

```bash
npm test -- src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts src/src_figma/__tests__/persistence/completedGameIdentity.test.ts src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts src/src_figma/__tests__/franchiseMode/franchiseWave3Blockers.test.ts src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx src/src_figma/__tests__/gameTracker/GameTrackerLaunchState.test.tsx src/utils/tests/transactionStorage.mode2v1.test.ts
```

Result: 12 files passed, 51 tests passed.

## Findings First, Ordered By Severity

### Finding 1: Franchise export/import/delete do not cover the full franchise save slot

Requirement:
- The Spine requires franchise deletion/export ownership to preserve or remove the whole franchise save without orphaned data (`spec-docs/SPINE_ARCHITECTURE.md:768`, `spec-docs/SPINE_ARCHITECTURE.md:770`).
- Pass 1 explicitly requires verifying whether per-franchise DB stores plus global scoped stores form a complete save-slot manifest, and whether export/import/delete/repair clean or preserve the right scoped records (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:118`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:128`).
- The implementation roadmap already flags export/import as not yet a full manifest and says the next hardening pass should include schedule, event log, completed games, season stats, playoffs, offseason state, and transactions (`spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md:95`).

Repo evidence:
- `exportFranchise` reads only object stores from the per-franchise IndexedDB (`src/utils/franchiseManager.ts:451`, `src/utils/franchiseManager.ts:468`), while that DB only creates `players` and `teams` stores (`src/utils/franchisePlayerStorage.ts:20`, `src/utils/franchisePlayerStorage.ts:116`).
- `importFranchise` restores only those exported stores into a new `kbl-franchise-{id}` database and does not remap or restore global scoped stores (`src/utils/franchiseManager.ts:498`, `src/utils/franchiseManager.ts:510`).
- `deleteFranchise` deletes metadata/config, clears schedule data, and deletes the franchise DB, but does not clear completed games, event logs, season stats, playoff records, offseason records, transaction records, farm records, or franchise season summaries (`src/utils/franchiseManager.ts:200`, `src/utils/franchiseManager.ts:249`, `src/utils/franchiseManager.ts:257`).
- `syncConfig` omits the Wave 4 `franchiseSeasonSummaries` store from `kbl-tracker`, and dynamic franchise sync only covers players/teams (`src/utils/syncConfig.ts:10`, `src/utils/syncConfig.ts:118`).
- `backupRestore` declares `kbl-tracker` version 11 and its tracker store list does not include the DB version 12 `franchiseSeasonSummaries` store (`src/utils/backupRestore.ts:68`, `src/utils/backupRestore.ts:260`, `src/utils/trackerDb.ts:17`, `src/utils/trackerDb.ts:103`).

Tests proving behavior, if present:
- API contract tests only assert franchise manager functions exist (`src/src_figma/__tests__/apiContracts/franchiseManager.contract.test.ts:69`).
- No test proves full franchise export/import/delete round-trip coverage across the hybrid global stores.

Status: missing

Severity: blocker

Recommendation:
- Treat this as the top Pass 1 blocker. Current gameplay paths can be scoped correctly while the save slot itself is still incomplete as a durable, portable, deletable unit.

Smallest safe patch if needed:
- Add a manifest listing every franchise-owned store, owner DB, key fields, export filter, import remap behavior, delete filter, sync status, and backup/restore status.
- Make export/import/delete execute from that manifest for scoped global stores without moving DBs yet.
- Add two-franchise same-season export/import/delete tests proving one franchise can be exported/imported/deleted without losing or leaking the other franchise's records.
- Add `franchiseSeasonSummaries` to sync and backup/restore schemas.

### Finding 2: The spec's two-database model has drifted into an undocumented hybrid multi-database model

Requirement:
- The Spine defines `kbl-app-meta` as global metadata/templates and `kbl-franchise-{id}` as the isolated per-franchise database containing metadata, teams, players, rosters, schedule, game headers, events, transaction events, stats, standings, current game, and completed games (`spec-docs/SPINE_ARCHITECTURE.md:723`, `spec-docs/SPINE_ARCHITECTURE.md:740`).
- Franchise isolation says changes to global pools after franchise creation must not propagate into existing franchises, and deleting a franchise should delete its entire IndexedDB with no orphaned data (`spec-docs/SPINE_ARCHITECTURE.md:768`, `spec-docs/SPINE_ARCHITECTURE.md:770`).

Repo evidence:
- The current code explicitly documents a hybrid model: players/teams in `kbl-franchise-{id}`, schedules/season metadata/summaries/current/completed games/global templates elsewhere (`src/utils/franchisePersistenceContract.ts:100`).
- The actual per-franchise DB only creates `players` and `teams` stores (`src/utils/franchisePlayerStorage.ts:20`, `src/utils/franchisePlayerStorage.ts:116`).
- Franchise-scoped gameplay data is spread across `kbl-tracker`, `kbl-schedule`, `kbl-event-log`, `kbl-playoffs`, `kbl-offseason`, and `kbl-transactions` (`src/utils/trackerDb.ts:16`, `src/utils/scheduleStorage.ts:14`, `src/utils/eventLog.ts:47`, `src/utils/playoffStorage.ts:21`, `src/utils/offseasonStorage.ts:219`, `src/utils/transactionStorage.ts:22`).
- The older repo audit already identified this as mixed global/per-franchise storage, not a clean franchise save-slot model (`spec-docs/FRANCHISE_MODE_REPO_AUDIT.md:191`, `spec-docs/FRANCHISE_MODE_REPO_AUDIT.md:204`).

Tests proving behavior, if present:
- Hybrid scoping is tested for schedules, completed games/standings, playoffs, offseason state, restored GameTracker identity, and summaries (`src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts:28`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts:90`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts:130`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts:185`, `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx:182`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:132`).
- No test proves the full Spine two-database ownership model because the repo no longer implements that model.

Status: drifted

Severity: high

Recommendation:
- Either update the Spine contract to bless the hybrid scoped-store architecture, or move all franchise-owned stores into `kbl-franchise-{id}`. The smallest near-term path is to formalize the hybrid model with a manifest and strict owner keys.

Smallest safe patch if needed:
- Create a `FRANCHISE_SAVE_SLOT_MANIFEST` next to `FRANCHISE_PERSISTENCE_CONTRACT`.
- Add an assertion test that every franchise-owned/scoped storage module is represented in the manifest.

### Finding 3: Copy-not-reference setup is mostly complete, but visible franchise reads still touch League Builder globals

Requirement:
- After franchise creation, the franchise database should be independent; changes to global League Builder data must not propagate into existing franchises (`spec-docs/SPINE_ARCHITECTURE.md:770`).
- Mode 1 -> 2 handoff should provide a league, team, player, roster, schedule, and rules snapshot (`spec-docs/SPINE_ARCHITECTURE.md:793`, `spec-docs/MODE_2_V1_FINAL.md:80`).
- The roadmap says League Builder must not be treated as mutable franchise state after setup (`spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md:175`, `spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md:180`).

Repo evidence:
- Setup deep-copies selected League Builder players and teams into the franchise DB (`src/utils/franchiseInitializer.ts:247`, `src/utils/franchisePlayerStorage.ts:270`).
- Repair is conservative and avoids recopying non-empty franchise rosters after League Builder template changes (`src/utils/franchiseInitializer.ts:191`).
- GameTracker roster construction uses franchise teams/players when `franchiseId` is present (`src/src_figma/app/utils/franchiseGameTrackerRoster.ts:186`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:195`, `src/src_figma/app/utils/franchiseGameTrackerRoster.ts:208`).
- `useFranchiseData` still builds stadium/team-name/league structure from `getAllTeams()` and `getAllLeagueTemplates()` rather than franchise snapshots (`src/src_figma/hooks/useFranchiseData.ts:281`, `src/src_figma/hooks/useFranchiseData.ts:358`).
- FranchiseHome launch still loads League Builder teams for colors/manager metadata before passing those values into GameTracker launch state (`src/src_figma/app/pages/FranchiseHome.tsx:3196`, `src/src_figma/app/pages/FranchiseHome.tsx:3282`).
- Team Hub is on the safer path and reads/writes `getFranchiseTeam` / `saveFranchiseTeam` (`src/src_figma/app/components/TeamHubContent.tsx:394`, `src/src_figma/app/components/TeamHubContent.tsx:557`).

Tests proving behavior, if present:
- Setup copy and GameTracker launch roster integration are tested (`src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts:160`, `src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts:203`).
- Repair not recopying after template mutation is tested (`src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts:250`).
- No test proves `useFranchiseData`, FranchiseHome visual metadata, and SeasonSummary ignore later League Builder edits.

Status: partial

Severity: high

Recommendation:
- Move visible franchise team/league reads to franchise-owned team snapshots and the stored franchise config. Keep League Builder reads only as legacy fallback when a franchise snapshot is missing.

Smallest safe patch if needed:
- Use `getAllFranchiseTeams(franchiseId)` and `getFranchiseConfig(franchiseId)` in `useFranchiseData` for team names, stadiums, conferences/divisions, and league selection.
- In FranchiseHome launch, use `getFranchiseTeam` for team colors/managers when `franchiseId` is present.
- Add a test mutating League Builder data after franchise setup and proving FranchiseHome/SeasonSummary still render copied franchise values.

### Finding 4: Event stream identity is backward-compatible, but transaction records still lack canonical franchise scope

Requirement:
- Spine event streams should carry `seasonId` and franchise identity where applicable, and transaction events should include `franchiseId` and `seasonId` (`spec-docs/SPINE_ARCHITECTURE.md:625`, `spec-docs/SPINE_ARCHITECTURE.md:684`).
- Mode 2 v1 defines AtBat, BetweenPlay, and Transaction event contracts with franchise/season identity (`spec-docs/MODE_2_V1_FINAL.md:119`, `spec-docs/MODE_2_V1_FINAL.md:308`, `spec-docs/MODE_2_V1_FINAL.md:397`).

Repo evidence:
- `eventLog` is a global `kbl-event-log` database (`src/utils/eventLog.ts:47`).
- Game headers support optional `seasonId`, `statsScopeId`, `competitionType`, `competitionId`, `franchiseId`, `leagueId`, and `scheduleGameId` (`src/utils/eventLog.ts:145`).
- At-bat events support optional `seasonId`, `statsScopeId`, `competitionType`, `competitionId`, `franchiseId`, and `scheduleGameId` fields (`src/utils/eventLog.ts:267`).
- Event-log schema indexes `seasonId` but not `franchiseId`, `statsScopeId`, or `scheduleGameId` (`src/utils/eventLog.ts:97`).
- Snapshot restore and durable-log/header restore preserve identity in `useGameState`, and GameTracker resolves identity through `gameTrackerIdentity` before end-game/archive/schedule completion (`src/src_figma/hooks/useGameState.ts:842`, `src/src_figma/hooks/useGameState.ts:5028`, `src/src_figma/hooks/useGameState.ts:5617`, `src/src_figma/app/utils/gameTrackerIdentity.ts:71`, `src/src_figma/app/pages/GameTracker.tsx:1457`, `src/src_figma/app/pages/GameTracker.tsx:4466`, `src/src_figma/app/pages/GameTracker.tsx:11327`).
- `transactionStorage` stores only `season` number and `gameNumber` at the top level, with no top-level `franchiseId` or canonical `seasonId` field (`src/utils/transactionStorage.ts:142`, `src/utils/transactionStorage.ts:313`, `src/utils/transactionStorage.ts:347`, `src/utils/transactionStorage.ts:394`).

Tests proving behavior, if present:
- Restored no-navigation GameTracker canonical scope is tested (`src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx:182`, `src/src_figma/__tests__/gameTracker/GameTrackerLaunchState.test.tsx:444`).
- Mode 2 v1 transaction type narrowing is tested (`src/utils/tests/transactionStorage.mode2v1.test.ts:12`).
- No test proves franchise transaction records are isolated by `franchiseId + seasonId`.

Status: risky

Severity: high

Recommendation:
- Keep optional event fields for legacy compatibility, but require canonical identity at franchise write boundaries.
- Bring transactions up to the same canonical identity standard as games/events.

Smallest safe patch if needed:
- Add `franchiseId?: string` and `seasonId?: string` to `TransactionLogEntry`, indexes, and scoped query helpers.
- Add a franchise write guard that rejects Mode 2 v1 transaction writes lacking canonical identity when called from franchise context.
- Add tests for two franchises sharing `season` number but isolated transaction histories.

### Finding 5: Mode 3 -> 2 new-season movement still has a post-transition rollback gap

Requirement:
- Mode 3 -> 2 should produce a new-season handoff with durable identity, updated rosters, schedule, standings reset, empty season stats, and carryover state (`spec-docs/SPINE_ARCHITECTURE.md:868`).
- Franchise Mode 2 v1 should avoid legacy global season markers and automatic mojo reset during finalization (`spec-docs/MODE_2_SECTION_MAP.md:250`, `spec-docs/MODE_2_V1_FINAL.md:3229`).

Repo evidence:
- Direct `START SEASON {n+1}` creates a summary, then executes season transition, then updates metadata, generates the new schedule, moves UI season, and only writes global `kbl-current-season` for non-franchise routes (`src/src_figma/app/pages/FranchiseHome.tsx:406`, `src/src_figma/app/pages/FranchiseHome.tsx:413`, `src/src_figma/app/pages/FranchiseHome.tsx:423`, `src/src_figma/app/pages/FranchiseHome.tsx:453`, `src/src_figma/app/pages/FranchiseHome.tsx:468`, `src/src_figma/app/pages/FranchiseHome.tsx:483`).
- Direct start aborts on summary failure or `executeSeasonTransition` failure before metadata/schedule changes (`src/src_figma/app/pages/FranchiseHome.tsx:436`, `src/src_figma/app/pages/FranchiseHome.tsx:444`).
- `FinalizeAdvanceFlow` creates the summary before transition and passes `skipMojoReset` and `skipLegacyLocalStorageMarkers` in franchise context (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:354`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:369`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:377`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:388`).
- Both paths update franchise metadata before generating the new schedule, so schedule generation failure after metadata update can leave metadata advanced without a complete new-season schedule (`src/src_figma/app/pages/FranchiseHome.tsx:453`, `src/src_figma/app/pages/FranchiseHome.tsx:468`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:402`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:409`).
- The transition engine preserves global markers when `skipLegacyLocalStorageMarkers` is passed, otherwise it still mutates legacy localStorage (`src/engines/seasonTransitionEngine.ts:62`, `src/engines/seasonTransitionEngine.ts:263`, `src/engines/seasonTransitionEngine.ts:317`, `src/engines/seasonTransitionEngine.ts:391`).

Tests proving behavior, if present:
- Direct-start abort on summary failure and transition failure is tested (`src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx:611`, `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx:635`).
- Franchise transition options preserving global markers and skipping mojo reset are tested (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:296`).
- No test covers rollback after metadata succeeds but schedule generation fails.

Status: partial

Severity: high

Recommendation:
- Make new-season movement atomic enough for user-visible safety.

Smallest safe patch if needed:
- Stage schedule generation and season metadata before advancing `FranchiseMetadata.currentSeason`, or add rollback that restores the prior metadata season and clears partial new-season schedule/metadata if any later step fails.
- Add tests for metadata-update success followed by schedule-generation failure on both direct start and FinalizeAdvanceFlow.

### Finding 6: Canonical season identity is strong on the main gameplay paths, but it is not yet a complete save contract

Requirement:
- Franchise seasons should use durable identity connecting `franchiseId`, `seasonNumber`, canonical `seasonId`, stats scope, schedule, completed games, playoff, and offseason state (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:84`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:86`).

Repo evidence:
- Canonical season IDs are generated as `{franchiseId}-season-{seasonNumber}`, and handoff data includes season/stats/schedule/completed/playoff/offseason identities (`src/utils/franchisePersistenceContract.ts:29`, `src/utils/franchisePersistenceContract.ts:56`, `src/utils/franchisePersistenceContract.ts:74`).
- Franchise setup writes schedule rows tagged with `franchiseId` and creates canonical season metadata (`src/utils/franchiseInitializer.ts:275`, `src/utils/franchiseInitializer.ts:288`).
- `useScheduleData` switches to `getAllGamesByFranchise` and `getScheduleMetadataByFranchise` when `franchiseId` exists (`src/src_figma/hooks/useScheduleData.ts:101`).
- Global schedule reads intentionally filter out franchise rows (`src/utils/scheduleStorage.ts:151`).
- Completed game archives preserve `seasonId`, `statsScopeId`, `franchiseId`, and `scheduleGameId`, and recent completed-game queries can filter by those fields (`src/utils/gameStorage.ts:547`, `src/utils/gameStorage.ts:744`, `src/utils/gameStorage.ts:877`, `src/utils/gameStorage.ts:885`).
- Standings are calculated from `seasonId`-filtered completed games (`src/utils/seasonStorage.ts:834`).
- FranchiseHome and SeasonSummary derive route season from franchise metadata, not global `kbl-current-season` (`src/src_figma/app/utils/franchiseRouteSeason.ts:9`, `src/src_figma/app/pages/FranchiseHome.tsx:178`, `src/src_figma/app/pages/SeasonSummary.tsx:58`).

Tests proving behavior, if present:
- Schedule franchise isolation (`src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts:28`).
- Completed-game identity archive (`src/src_figma/__tests__/persistence/completedGameIdentity.test.ts:56`).
- Two-franchise completed-game/standings isolation (`src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts:90`).
- Franchise route season ignores global current-season marker (`src/src_figma/__tests__/franchiseMode/franchiseWave3Blockers.test.ts:46`).
- Summary isolation (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:132`).

Status: mostly complete

Severity: medium

Recommendation:
- Keep building on the canonical identity path, but do not treat it as a complete durable save-slot contract until Findings 1 and 2 are addressed.

Smallest safe patch if needed:
- Add a manifest assertion test that these canonical keys are present for every franchise-owned persisted record created by a scored game.

### Finding 7: Mode 1 -> 2 handoff is functional for v1 rosters/schedule, but incomplete as a full Spine handoff

Requirement:
- Mode 1 -> 2 should hand off franchise metadata, league snapshot, teams, players, rosters, schedule, rules, standings initialization, salary ledger, empty stats stores, and `franchiseId` (`spec-docs/SPINE_ARCHITECTURE.md:793`, `spec-docs/MODE_2_V1_FINAL.md:80`).
- Pass 1 asks whether setup copies the complete required league snapshot including farm state and controlled-team flags (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:123`).

Repo evidence:
- `initializeFranchise` validates required wizard fields, creates franchise metadata, deep-copies rosters/teams, stores config, writes schedule, creates season metadata, and sets active franchise (`src/utils/franchiseInitializer.ts:228`, `src/utils/franchiseInitializer.ts:237`, `src/utils/franchiseInitializer.ts:247`, `src/utils/franchiseInitializer.ts:264`, `src/utils/franchiseInitializer.ts:272`, `src/utils/franchiseInitializer.ts:288`, `src/utils/franchiseInitializer.ts:291`).
- `StoredFranchiseConfig` captures current v1 wizard config but is not a full rules preset/salary ledger/farm/standings initialized payload (`src/types/franchise.ts:8`, `src/types/franchise.ts:57`).
- Initial setup rollback handles metadata, season metadata, and franchise DB cleanup on failure (`src/utils/franchiseInitializer.ts:146`, `src/utils/franchiseInitializer.ts:293`).

Tests proving behavior, if present:
- Initial setup writes scoped schedule rows and season metadata (`src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts:160`).
- Setup-to-launch verifies copied franchise rosters are used by GameTracker launch (`src/src_figma/__tests__/franchiseMode/franchiseSetupLaunch.integration.test.ts:203`).
- Setup failure rollback is tested (`src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts:208`).

Status: mostly complete for Mode 2 v1 launch; partial for the full Spine handoff

Severity: medium

Recommendation:
- For Mode 2 v1 this is enough to launch and score games, but it is not enough to call the franchise save slot or full cross-mode handoff complete.

Smallest safe patch if needed:
- Extend stored franchise config or the save-slot manifest with explicit rules snapshot, league structure snapshot, and any v1 handoff placeholders that are intentionally deferred.
- Keep farm/roster analyzer expansion out of scope unless a later pass explicitly starts it.

### Finding 8: Mode 2 -> 3 durable summary handoff is mostly complete, but not yet owned by export/sync/backup

Requirement:
- Mode 2 should hand off a copy-not-reference `SeasonSummary` containing final standings, playoff results, stats snapshots, subsystem state, and franchise/season identity (`spec-docs/SPINE_ARCHITECTURE.md:819`, `spec-docs/MODE_2_V1_FINAL.md:3229`).
- Pass 1 asks whether season summary includes stable snapshots or durable references for all required outputs (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:124`).

Repo evidence:
- `trackerDb` has a `franchiseSeasonSummaries` store keyed by `seasonId`, with `franchiseId`, `seasonNumber`, and unique `franchiseId_seasonNumber` indexes (`src/utils/trackerDb.ts:103`).
- Summary shape includes handoff identity, season metadata, schedule snapshot, completed-game snapshot, standings, season stats, playoff refs/stats, offseason state id, and explicit placeholders (`src/utils/franchiseSeasonSummaryStorage.ts:79`).
- Summary building reads schedule by `franchiseId + seasonNumber`, completed games by `franchiseId + seasonId`, stats by canonical season ID, playoff by validated scope, and offseason by canonical season ID (`src/utils/franchiseSeasonSummaryStorage.ts:203`).
- Playoff validation rejects explicit playoff IDs from the wrong franchise, season ID, or season number (`src/utils/franchiseSeasonSummaryStorage.ts:175`).
- Snapshots are deep-cloned on save/read (`src/utils/franchiseSeasonSummaryStorage.ts:129`, `src/utils/franchiseSeasonSummaryStorage.ts:300`, `src/utils/franchiseSeasonSummaryStorage.ts:340`).
- Placeholders for awards, milestones, fan morale, narrative, and park factors are explicit (`src/utils/franchiseSeasonSummaryStorage.ts:292`).
- A legacy localStorage handoff marker is still written alongside the durable summary (`src/utils/franchiseSeasonSummaryStorage.ts:332`).

Tests proving behavior, if present:
- Multi-franchise summary isolation (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:132`).
- Canonical summary contents (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:166`).
- Wrong-season playoff rejection (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:232`).
- Copy-not-reference snapshots (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:265`).
- SeasonSummary UI reads persisted summary when available but lacks a dedicated component-level persisted/fallback test (`src/src_figma/app/pages/SeasonSummary.tsx:82`, `src/src_figma/app/pages/SeasonSummary.tsx:405`).

Status: mostly complete

Severity: medium

Recommendation:
- Preserve the durable summary path. Add it to sync, backup/restore, export/import, and delete ownership before relying on it as a complete Mode 3 handoff artifact.

Smallest safe patch if needed:
- Add `franchiseSeasonSummaries` to sync and backup/restore schemas.
- Add a component-level SeasonSummary test for persisted summary read and old-season fallback.
- Decide whether the localStorage handoff marker is temporary compatibility or a supported legacy marker.

### Finding 9: Playoff/offseason scoping is mostly safe for v1, but ownership remains global and older offseason/farm specs drift on season IDs

Requirement:
- Playoff and offseason records must be isolated by franchise and canonical season identity where applicable (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:84`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:86`).
- Offseason data models use `seasonId` across state and result records, but the old spec examples use numeric `seasonId` values (`spec-docs/OFFSEASON_SYSTEM_SPEC.md:2043`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:2170`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:2190`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:2237`).
- Farm data models mix numeric and string season ID examples and require offseason roster/farm continuity (`spec-docs/FARM_SYSTEM_SPEC.md:33`, `spec-docs/FARM_SYSTEM_SPEC.md:338`, `spec-docs/FARM_SYSTEM_SPEC.md:664`, `spec-docs/FARM_SYSTEM_SPEC.md:796`, `spec-docs/FARM_SYSTEM_SPEC.md:1651`).

Repo evidence:
- Playoff config includes `seasonNumber`, `seasonId`, `sourceType`, and optional `franchiseId` (`src/utils/playoffStorage.ts:38`, `src/utils/playoffStorage.ts:67`).
- Playoff replacement and lookup are scoped by `sourceType + seasonNumber + franchiseId` for franchise brackets (`src/utils/playoffStorage.ts:438`, `src/utils/playoffStorage.ts:469`, `src/utils/playoffStorage.ts:520`).
- `usePlayoffData` locks franchise views to `getPlayoffBySeason(seasonNumber, 'franchise', franchiseId)` and only uses current-playoff fallback for non-franchise views (`src/src_figma/hooks/usePlayoffData.ts:120`, `src/src_figma/hooks/usePlayoffData.ts:136`).
- Offseason state IDs are `offseason-${seasonId}` and store string `seasonId`, `seasonNumber`, and optional `franchiseId` (`src/utils/offseasonStorage.ts:54`, `src/utils/offseasonStorage.ts:300`).
- `useOffseasonState` starts offseason with the active `franchiseId` (`src/src_figma/hooks/useOffseasonState.ts:123`, `src/src_figma/hooks/useOffseasonState.ts:206`).
- Prototype offseason flows are guarded from mutating League Builder/template storage in franchise context (`src/src_figma/app/utils/franchiseOffseasonGuards.ts:1`, `src/src_figma/app/utils/franchiseOffseasonGuards.ts:4`).

Tests proving behavior, if present:
- Playoff same-season franchise isolation (`src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts:130`).
- Offseason canonical state IDs (`src/src_figma/__tests__/franchiseMode/franchiseSeasonScoping.wave3.test.ts:185`).
- Component-level mutation guards for FreeAgency, Retirement, RatingsAdjustment, and Draft (`src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:148`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:181`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:206`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:224`).

Status: mostly complete for v1 scoping; partial for full ownership/export/delete

Severity: medium

Recommendation:
- Keep v1 guards until real franchise-owned offseason adapters exist.
- Normalize the older offseason/farm specs or adapter docs around string canonical `seasonId` values for franchise context.

Smallest safe patch if needed:
- Add playoffs, offseason stores, and farm stores to the save-slot manifest, explicitly marking which are v1-scoped, guarded, deferred, or unsafe.
- Add delete/export coverage for `offseason-${franchiseId}-season-{n}` records and franchise playoff records.

### Finding 10: Legacy global/shared-state risks remain and should be contained before broader feature work

Requirement:
- Shared/global state should not leak franchise-season context or mutate League Builder templates from franchise context (`spec-docs/SPINE_ARCHITECTURE.md:768`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:126`).
- Pass 1 explicitly excludes roster analyzer behavior, but farm roster storage ownership is in scope as part of the shared data contract (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:74`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:144`).

Repo evidence:
- Global `kbl-current-season` remains a synced localStorage key, and non-franchise transition paths still write it (`src/utils/syncConfig.ts:138`, `src/engines/seasonTransitionEngine.ts:263`).
- Franchise route season paths avoid it, but `franchiseRouteSeason` still contains the legacy global reader (`src/src_figma/app/utils/franchiseRouteSeason.ts:3`, `src/src_figma/app/utils/franchiseRouteSeason.ts:9`).
- Synthetic sim code remains present but disabled behind `MODE_2_V1_SYNTHETIC_SIM_ENABLED = false` and guarded action paths (`src/src_figma/app/pages/FranchiseHome.tsx:106`, `src/src_figma/app/pages/FranchiseHome.tsx:3313`, `src/src_figma/app/pages/FranchiseHome.tsx:3414`).
- Global farm storage is keyed by `playerId` and indexed by `teamId`/`level` without franchise or canonical season scope (`src/utils/farmStorage.ts:36`, `src/utils/farmStorage.ts:83`, `src/utils/farmStorage.ts:186`).
- Global schedule metadata is keyed only by `seasonNumber`, while franchise metadata is computed from scoped rows instead of that store (`src/utils/scheduleStorage.ts:121`, `src/utils/scheduleStorage.ts:597`).

Tests proving behavior, if present:
- Franchise route season ignores global current season (`src/src_figma/__tests__/franchiseMode/franchiseWave3Blockers.test.ts:46`).
- Synthetic sim controls are absent for Mode 2 v1 regular-season actions (`src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx:597`).
- No test proves farm/global legacy stores cannot affect franchise context.

Status: risky

Severity: medium

Recommendation:
- Keep legacy globals only as non-franchise compatibility.
- Classify every global/localStorage key in the save-slot manifest as non-franchise-only, franchise-scoped, legacy compatibility, or deferred/unreachable.

Smallest safe patch if needed:
- Add assertions that franchise routes do not read `kbl-current-season`, `selectedLeague`, global farm storage, or unscoped schedule metadata for core season identity.
- Defer farm recommendation/analyzer behavior until storage ownership and franchise adapter boundaries are explicit.

## Contract Coverage Matrix By Source Spec Section

| Source section | Requirement | Repo evidence | Status |
| --- | --- | --- | --- |
| `CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md` Pass 1 (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:42`) | Verify shared data contract, storage boundaries, handoffs, IDs, and export/import/delete risks before deeper behavior (`spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:84`, `spec-docs/CROSS_SPEC_FRANCHISE_TRACEABILITY_PLAN.md:118`). | Canonical helpers exist (`src/utils/franchisePersistenceContract.ts:29`, `src/utils/franchisePersistenceContract.ts:56`), but export/import/delete only cover per-franchise players/teams (`src/utils/franchiseManager.ts:451`, `src/utils/franchisePlayerStorage.ts:20`). | partial |
| `SPINE_ARCHITECTURE.md` storage architecture (`spec-docs/SPINE_ARCHITECTURE.md:723`) | Two DB categories: `kbl-app-meta` and `kbl-franchise-{id}` with franchise-owned gameplay stores inside the franchise DB (`spec-docs/SPINE_ARCHITECTURE.md:740`). | Repo is hybrid across `kbl-franchise-{id}`, `kbl-tracker`, `kbl-schedule`, `kbl-event-log`, `kbl-playoffs`, `kbl-offseason`, `kbl-transactions` (`src/utils/franchisePersistenceContract.ts:100`, `src/utils/trackerDb.ts:16`, `src/utils/scheduleStorage.ts:14`, `src/utils/eventLog.ts:47`, `src/utils/playoffStorage.ts:21`, `src/utils/offseasonStorage.ts:219`, `src/utils/transactionStorage.ts:22`). | drifted |
| `SPINE_ARCHITECTURE.md` copy-not-reference isolation (`spec-docs/SPINE_ARCHITECTURE.md:768`) | Franchise setup copies data; later global pool changes do not propagate (`spec-docs/SPINE_ARCHITECTURE.md:770`). | Setup copies players/teams (`src/utils/franchiseInitializer.ts:247`, `src/utils/franchisePlayerStorage.ts:270`), but visible franchise data still uses `getAllTeams()` / `getAllLeagueTemplates()` (`src/src_figma/hooks/useFranchiseData.ts:281`, `src/src_figma/hooks/useFranchiseData.ts:358`). | partial |
| `SPINE_ARCHITECTURE.md` Mode 1 -> 2 handoff (`spec-docs/SPINE_ARCHITECTURE.md:793`) | Franchise start handoff includes franchise metadata, league, teams, players, schedule, rules, standings/stats initialization. | `initializeFranchise` creates metadata, copies teams/players, stores config, schedule, season metadata, active franchise (`src/utils/franchiseInitializer.ts:228`, `src/utils/franchiseInitializer.ts:247`, `src/utils/franchiseInitializer.ts:264`, `src/utils/franchiseInitializer.ts:272`, `src/utils/franchiseInitializer.ts:288`, `src/utils/franchiseInitializer.ts:291`), but `StoredFranchiseConfig` is not a full rules/salary/farm/standings save payload (`src/types/franchise.ts:8`, `src/types/franchise.ts:57`). | mostly complete for v1, partial for full Spine |
| `SPINE_ARCHITECTURE.md` Mode 2 -> 3 handoff (`spec-docs/SPINE_ARCHITECTURE.md:819`) | SeasonSummary copy-not-reference handoff with standings, playoffs, stats, subsystem state, and identity. | Summary store and builder include canonical identity, snapshots, playoffs, offseason state, placeholders (`src/utils/trackerDb.ts:103`, `src/utils/franchiseSeasonSummaryStorage.ts:79`, `src/utils/franchiseSeasonSummaryStorage.ts:203`, `src/utils/franchiseSeasonSummaryStorage.ts:292`). Export/sync/backup ownership is incomplete (`src/utils/syncConfig.ts:10`, `src/utils/backupRestore.ts:68`). | mostly complete, risky ownership |
| `SPINE_ARCHITECTURE.md` Mode 3 -> 2 handoff (`spec-docs/SPINE_ARCHITECTURE.md:868`) | New-season handoff with rosters, schedule, standings reset, empty stats, carryover. | Direct and finalize paths create summary and transition before movement (`src/src_figma/app/pages/FranchiseHome.tsx:413`, `src/src_figma/app/pages/FranchiseHome.tsx:423`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:369`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:377`), but metadata is advanced before schedule generation (`src/src_figma/app/pages/FranchiseHome.tsx:453`, `src/src_figma/app/pages/FranchiseHome.tsx:468`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:402`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:409`). | partial |
| `SPINE_ARCHITECTURE.md` event streams (`spec-docs/SPINE_ARCHITECTURE.md:625`) | At-bat/between-play/transaction streams carry season/franchise identity (`spec-docs/SPINE_ARCHITECTURE.md:684`). | Game headers and at-bats have optional identity fields (`src/utils/eventLog.ts:145`, `src/utils/eventLog.ts:267`); transaction log lacks top-level `franchiseId`/`seasonId` (`src/utils/transactionStorage.ts:142`). | risky |
| `MODE_2_V1_FINAL.md` inputs/outputs (`spec-docs/MODE_2_V1_FINAL.md:80`, `spec-docs/MODE_2_V1_FINAL.md:93`) | Mode 2 receives full franchise save setup and outputs final event/stats/standings/playoff/offseason artifacts. | Setup and summary cover v1 core paths (`src/utils/franchiseInitializer.ts:228`, `src/utils/franchiseSeasonSummaryStorage.ts:203`), but save-slot/export and some artifact owners remain incomplete (`src/utils/franchiseManager.ts:451`, `src/utils/syncConfig.ts:10`). | partial |
| `MODE_2_V1_FINAL.md` schedule/no synthetic sim (`spec-docs/MODE_2_V1_FINAL.md:2889`) | Schedule is user-played/editable v1 with no simulate path. | FranchiseHome disables synthetic sim through `MODE_2_V1_SYNTHETIC_SIM_ENABLED` and guards synthetic handlers (`src/src_figma/app/pages/FranchiseHome.tsx:106`, `src/src_figma/app/pages/FranchiseHome.tsx:3313`, `src/src_figma/app/pages/FranchiseHome.tsx:3414`). | mostly complete |
| `MODE_2_SECTION_MAP.md` Sections 22/26 (`spec-docs/MODE_2_SECTION_MAP.md:225`, `spec-docs/MODE_2_SECTION_MAP.md:250`) | No schedule simulation; Hot/Warm storage only; copy-not-reference SeasonSummary handoff. | Sim controls are guarded (`src/src_figma/app/pages/FranchiseHome.tsx:106`), summaries are deep-cloned (`src/utils/franchiseSeasonSummaryStorage.ts:129`, `src/utils/franchiseSeasonSummaryStorage.ts:300`), but ownership/export is incomplete (`src/utils/franchiseManager.ts:451`, `src/utils/backupRestore.ts:68`). | mostly complete with ownership gap |
| `OFFSEASON_SYSTEM_SPEC.md` data models (`spec-docs/OFFSEASON_SYSTEM_SPEC.md:2043`) | Offseason state/results carry season identity and finalization output. | Repo uses string canonical `seasonId` and optional `franchiseId` in `OffseasonState` (`src/utils/offseasonStorage.ts:54`, `src/utils/offseasonStorage.ts:300`), while the older spec examples use numeric `seasonId` (`spec-docs/OFFSEASON_SYSTEM_SPEC.md:2047`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:2195`). | partial/drifted docs |
| `FARM_SYSTEM_SPEC.md` roster/options/offseason roster requirements (`spec-docs/FARM_SYSTEM_SPEC.md:33`, `spec-docs/FARM_SYSTEM_SPEC.md:796`) | Farm records need season/team continuity and offseason handoff implications. | Current farm storage is global `kbl-farm`, keyed by `playerId`, indexed by `teamId`/`level`, and queried by `teamId` only (`src/utils/farmStorage.ts:36`, `src/utils/farmStorage.ts:83`, `src/utils/farmStorage.ts:186`). | missing for franchise scope |
| `FRANCHISE_MODE_REPO_AUDIT.md` Waves 1-3 checkpoint (`spec-docs/FRANCHISE_MODE_REPO_AUDIT.md:26`) | Treat Waves 1-3 as improving setup, scoping, identity, and guards while leaving export/import/offseason/global marker gaps (`spec-docs/FRANCHISE_MODE_REPO_AUDIT.md:30`, `spec-docs/FRANCHISE_MODE_REPO_AUDIT.md:32`). | Current repo evidence matches the checkpoint on canonical IDs and guarded offseason paths (`src/utils/franchisePersistenceContract.ts:29`, `src/src_figma/app/utils/franchiseOffseasonGuards.ts:1`) and still matches the export/import gap (`src/utils/franchiseManager.ts:451`). | mostly aligned |
| `FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md` remaining risks (`spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md:73`) | Do not start roster analyzer; export/import needs manifest; legacy markers remain; offseason mutations are guarded not complete (`spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md:75`, `spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md:79`, `spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md:95`, `spec-docs/FRANCHISE_MODE_IMPLEMENTATION_ROADMAP.md:98`). | Repo still has guard-only offseason flow (`src/src_figma/app/utils/franchiseOffseasonGuards.ts:1`), global current-season compatibility (`src/utils/syncConfig.ts:138`), and per-franchise-only export (`src/utils/franchiseManager.ts:451`). | aligned with known risks |

## Data Ownership Map

| Data | Current owner/storage | Canonical keys in repo | Contract status |
| --- | --- | --- | --- |
| Franchise metadata/config | Global `kbl-app-meta` via `franchiseManager` (`src/utils/franchiseManager.ts:78`, `src/utils/franchiseManager.ts:155`, `src/utils/franchiseManager.ts:386`). | `franchiseId`, `currentSeason` (`src/utils/franchiseManager.ts:28`, `src/utils/franchiseManager.ts:421`). | mostly complete as metadata pointer |
| Franchise teams/players | Per-franchise `kbl-franchise-{id}` players/teams (`src/utils/franchisePlayerStorage.ts:20`, `src/utils/franchisePlayerStorage.ts:116`). | Team/player IDs inside copied records; DB name from franchise ID (`src/utils/franchisePersistenceContract.ts:25`, `src/utils/franchisePlayerStorage.ts:270`). | mostly complete for v1 roster source |
| Schedule games | Global `kbl-schedule.scheduledGames` (`src/utils/scheduleStorage.ts:14`, `src/utils/scheduleStorage.ts:28`). | `id`, optional `franchiseId`, `seasonNumber`, `date` (`src/utils/scheduleStorage.ts:30`, `src/utils/scheduleStorage.ts:31`). | scoped global |
| Schedule metadata | Global `kbl-schedule.scheduleMetadata` keyed by `seasonNumber` (`src/utils/scheduleStorage.ts:121`). | Global season number only; franchise metadata is derived from scoped rows (`src/utils/scheduleStorage.ts:597`). | risky legacy/global |
| Current game / completed games | Global `kbl-tracker.currentGame` and `kbl-tracker.completedGames` (`src/utils/trackerDb.ts:48`, `src/utils/trackerDb.ts:52`). | `seasonId`, `statsScopeId`, `franchiseId`, `scheduleGameId`, playoff IDs on records (`src/utils/gameStorage.ts:236`, `src/utils/gameStorage.ts:547`). | mostly complete scoped global |
| Season metadata/stats | Global `kbl-tracker` season metadata and season stat stores (`src/utils/trackerDb.ts:71`, `src/utils/trackerDb.ts:87`, `src/utils/trackerDb.ts:95`). | Canonical `seasonId` on stat records (`src/utils/seasonStorage.ts:36`, `src/utils/seasonStorage.ts:79`, `src/utils/seasonStorage.ts:126`). | mostly complete scoped global |
| Event log headers/at-bats/between-play | Global `kbl-event-log` (`src/utils/eventLog.ts:47`, `src/utils/eventLog.ts:97`). | Optional `seasonId`, `statsScopeId`, `franchiseId`, `scheduleGameId` (`src/utils/eventLog.ts:145`, `src/utils/eventLog.ts:267`). | backward-compatible, not fully enforced |
| Transactions | Global `kbl-transactions` (`src/utils/transactionStorage.ts:22`). | `season` number, `gameNumber`, phase/type; no top-level `franchiseId`/`seasonId` (`src/utils/transactionStorage.ts:142`). | risky |
| Playoffs | Global `kbl-playoffs` (`src/utils/playoffStorage.ts:21`). | `playoffId`, `seasonNumber`, `seasonId`, `sourceType`, optional `franchiseId` (`src/utils/playoffStorage.ts:38`, `src/utils/playoffStorage.ts:67`). | mostly complete scoped global |
| Offseason state/phase stores | Global `kbl-offseason` (`src/utils/offseasonStorage.ts:218`). | `offseason-${seasonId}`, string `seasonId`, `seasonNumber`, optional `franchiseId` (`src/utils/offseasonStorage.ts:54`, `src/utils/offseasonStorage.ts:300`). | scoped global, guarded mutations |
| Franchise season summaries | Global `kbl-tracker.franchiseSeasonSummaries` (`src/utils/trackerDb.ts:103`). | `seasonId` key, `franchiseId`, `seasonNumber`, `statsScopeId`, handoff refs (`src/utils/franchiseSeasonSummaryStorage.ts:79`). | mostly complete, missing sync/export/backup ownership |
| Farm storage | Global `kbl-farm.farmPlayers` (`src/utils/farmStorage.ts:36`, `src/utils/farmStorage.ts:83`). | `playerId`, `teamId`, `level`; no franchise or canonical season key (`src/utils/farmStorage.ts:17`, `src/utils/farmStorage.ts:186`). | missing for franchise scope |
| Legacy localStorage markers | Browser localStorage plus sync registry (`src/utils/syncConfig.ts:132`, `src/utils/syncConfig.ts:138`). | `kbl-current-season`, `kbl_last_transition`, `kbl_years_of_service` (`src/utils/syncConfig.ts:138`, `src/utils/syncConfig.ts:139`, `src/utils/syncConfig.ts:140`). | compatibility risk |

## Persistence / Export / Import / Delete Risk Map

| Data area | Export/import coverage | Delete coverage | Sync/backup coverage | Risk |
| --- | --- | --- | --- | --- |
| Per-franchise players/teams | Export/import reads/writes per-franchise DB stores (`src/utils/franchiseManager.ts:451`, `src/utils/franchiseManager.ts:498`). | `deleteFranchiseDatabase` removes per-franchise DB (`src/utils/franchisePlayerStorage.ts:246`, `src/utils/franchiseManager.ts:257`). | Dynamic sync only covers players/teams (`src/utils/syncConfig.ts:118`). | low for core v1 roster copy |
| Schedule rows | Not included in franchise export/import (`src/utils/franchiseManager.ts:451`). | `deleteFranchise` clears franchise schedule (`src/utils/franchiseManager.ts:249`). | `kbl-schedule` is in sync/backup schemas (`src/utils/syncConfig.ts:100`, `src/utils/backupRestore.ts:375`). | medium; export/import gap |
| Current/completed games | Not included in franchise export/import (`src/utils/franchiseManager.ts:451`). | No delete call from `deleteFranchise` for completed/current game records (`src/utils/franchiseManager.ts:200`, `src/utils/franchiseManager.ts:257`). | Some `kbl-tracker` stores are synced/backed up, but summary store is omitted (`src/utils/syncConfig.ts:10`, `src/utils/backupRestore.ts:68`). | high |
| Season metadata/stats | Not included in franchise export/import (`src/utils/franchiseManager.ts:451`). | No delete call from `deleteFranchise` for season metadata/stats (`src/utils/franchiseManager.ts:200`, `src/utils/franchiseManager.ts:257`). | Season stat stores are in sync/backup registry (`src/utils/syncConfig.ts:26`, `src/utils/backupRestore.ts:91`). | high |
| Event logs | Not included in franchise export/import (`src/utils/franchiseManager.ts:451`). | Competition delete helper exists but franchise delete does not call a franchise/season cleanup (`src/utils/eventLog.ts:776`, `src/utils/franchiseManager.ts:200`). | `kbl-event-log` is in sync/backup schemas (`src/utils/syncConfig.ts:47`, `src/utils/backupRestore.ts:300`). | high |
| Transactions | Not included in franchise export/import (`src/utils/franchiseManager.ts:451`). | No franchise delete coverage (`src/utils/franchiseManager.ts:200`). | `kbl-transactions` is in sync/backup schemas (`src/utils/syncConfig.ts:94`, `src/utils/backupRestore.ts:539`). | high because identity is unscoped |
| Playoffs | Not included in franchise export/import (`src/utils/franchiseManager.ts:451`). | No franchise delete coverage (`src/utils/franchiseManager.ts:200`). | `kbl-playoffs` is in sync/backup schemas (`src/utils/syncConfig.ts:110`, `src/utils/backupRestore.ts:265`). | high |
| Offseason records | Not included in franchise export/import (`src/utils/franchiseManager.ts:451`). | No franchise delete coverage (`src/utils/franchiseManager.ts:200`). | `kbl-offseason` is in sync/backup schemas (`src/utils/syncConfig.ts:82`, `src/utils/backupRestore.ts:515`). | high |
| Franchise season summaries | Not included in franchise export/import (`src/utils/franchiseManager.ts:451`). | Storage has delete helpers but franchise delete does not call them (`src/utils/franchiseSeasonSummaryStorage.ts:364`, `src/utils/franchiseManager.ts:200`). | Omitted from sync and backup tracker schemas (`src/utils/syncConfig.ts:10`, `src/utils/backupRestore.ts:68`). | blocker-adjacent |
| Farm records | Not included in franchise export/import (`src/utils/franchiseManager.ts:451`). | No franchise delete coverage (`src/utils/franchiseManager.ts:200`). | Farm storage syncs individual player records but has no franchise scope (`src/utils/farmStorage.ts:43`, `src/utils/farmStorage.ts:49`). | high/deferred |
| Legacy localStorage markers | Not franchise export/import owned (`src/utils/franchiseManager.ts:451`). | Not franchise delete owned (`src/utils/franchiseManager.ts:200`). | Synced keys include global current season and transition markers (`src/utils/syncConfig.ts:132`, `src/utils/syncConfig.ts:138`). | medium compatibility risk |

## Required Tests

Already present and useful:
- Canonical schedule isolation: two franchise schedules in the same season number stay isolated (`src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts:28`).
- Setup copy/rollback/repair: setup copies into franchise DB, rollback cleans partial setup, and repair is non-destructive (`src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts:160`, `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts:208`, `src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts:250`).
- GameTracker launch and restored identity: launch state and restored no-navigation scope carry canonical IDs (`src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx:563`, `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx:897`, `src/src_figma/__tests__/gameTracker/gameTrackerRestoredFranchiseScope.test.tsx:182`, `src/src_figma/__tests__/gameTracker/GameTrackerLaunchState.test.tsx:444`).
- Summary/handoff tests: multi-franchise summary isolation, canonical content, wrong-season playoff rejection, copy-not-reference, and transition marker/mojo boundaries (`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:132`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:166`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:232`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:265`, `src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts:296`).
- Offseason mutation guards: component tests assert guarded franchise flows do not call League Builder mutation functions (`src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:137`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:148`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:181`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:206`, `src/src_figma/__tests__/franchiseMode/franchiseOffseasonGuards.component.test.tsx:224`).

Required next tests:
1. Manifest completeness test: every franchise-owned/scoped storage module must appear in the save-slot manifest with owner DB, key fields, export/import/delete/sync/backup behavior. This should fail today because no manifest exists (`src/utils/franchisePersistenceContract.ts:100`, `src/utils/franchiseManager.ts:451`).
2. Full export/import/delete round-trip test: seed two franchises with the same `seasonNumber`, then cover per-franchise DB, schedule, completed games, event log, season stats, playoffs, offseason state, transactions, summaries, and farm records as classified by the manifest (`src/utils/franchiseManager.ts:451`, `src/utils/gameStorage.ts:547`, `src/utils/eventLog.ts:145`, `src/utils/playoffStorage.ts:38`, `src/utils/offseasonStorage.ts:54`, `src/utils/transactionStorage.ts:142`, `src/utils/franchiseSeasonSummaryStorage.ts:79`, `src/utils/farmStorage.ts:17`).
3. League Builder mutation isolation test: after franchise setup, mutate League Builder team names/colors/stadiums and prove `useFranchiseData`, FranchiseHome launch metadata, and SeasonSummary use copied franchise/config values (`src/src_figma/hooks/useFranchiseData.ts:281`, `src/src_figma/app/pages/FranchiseHome.tsx:3196`, `src/src_figma/app/pages/SeasonSummary.tsx:82`).
4. Transaction identity test: two franchises sharing `season` number should not see each other's transaction records; this should fail until `TransactionLogEntry` has `franchiseId + seasonId` (`src/utils/transactionStorage.ts:142`, `src/utils/transactionStorage.ts:313`).
5. New-season rollback tests: direct start and FinalizeAdvanceFlow should restore prior metadata if schedule generation fails after transition success (`src/src_figma/app/pages/FranchiseHome.tsx:453`, `src/src_figma/app/pages/FranchiseHome.tsx:468`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:402`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:409`).
6. SeasonSummary component-level test: persisted summary read and old-season fallback should be asserted at the component level (`src/src_figma/app/pages/SeasonSummary.tsx:82`, `src/src_figma/app/pages/SeasonSummary.tsx:405`).
7. Legacy global guard tests: franchise routes should not use `kbl-current-season`, `selectedLeague`, unscoped farm storage, or global schedule metadata for core identity (`src/src_figma/app/utils/franchiseRouteSeason.ts:3`, `src/utils/farmStorage.ts:36`, `src/utils/scheduleStorage.ts:121`).

## P1 / P2 Blockers Before More Feature Work

P1 blockers:
1. Full franchise save-slot manifest plus export/import/delete/sync/backup coverage for all franchise-owned data in the current hybrid model (`src/utils/franchisePersistenceContract.ts:100`, `src/utils/franchiseManager.ts:451`, `src/utils/syncConfig.ts:10`, `src/utils/backupRestore.ts:68`).
2. Canonical `franchiseId + seasonId` support for transaction records and scoped transaction queries (`src/utils/transactionStorage.ts:142`, `src/utils/transactionStorage.ts:313`).
3. Copy-not-reference visible data cleanup for `useFranchiseData` and FranchiseHome launch metadata (`src/src_figma/hooks/useFranchiseData.ts:281`, `src/src_figma/hooks/useFranchiseData.ts:358`, `src/src_figma/app/pages/FranchiseHome.tsx:3196`).
4. New-season movement rollback/staging when metadata updates succeed but schedule generation fails (`src/src_figma/app/pages/FranchiseHome.tsx:453`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:402`).

P2 blockers:
1. Add `franchiseSeasonSummaries` to sync and backup/restore schemas (`src/utils/trackerDb.ts:103`, `src/utils/syncConfig.ts:10`, `src/utils/backupRestore.ts:68`).
2. Component-level SeasonSummary persisted/fallback test (`src/src_figma/app/pages/SeasonSummary.tsx:82`, `src/src_figma/app/pages/SeasonSummary.tsx:405`).
3. Legacy marker classification and guard tests for localStorage/current-season/farm/schedule metadata (`src/utils/syncConfig.ts:132`, `src/utils/syncConfig.ts:138`, `src/utils/farmStorage.ts:36`, `src/utils/scheduleStorage.ts:121`).
4. Offseason/farm spec ID normalization docs/adapters so franchise context consistently uses string canonical season IDs (`src/utils/offseasonStorage.ts:54`, `spec-docs/OFFSEASON_SYSTEM_SPEC.md:2047`, `spec-docs/FARM_SYSTEM_SPEC.md:40`, `spec-docs/FARM_SYSTEM_SPEC.md:350`).

## Smallest Safe Next Patch Set

1. Add a manifest-only spine module:
   - Enumerate `kbl-app-meta`, `kbl-franchise-{id}`, `kbl-tracker`, `kbl-schedule`, `kbl-event-log`, `kbl-playoffs`, `kbl-offseason`, `kbl-transactions`, `kbl-farm`, and localStorage markers.
   - For each entry, state owner, franchise key fields, season key fields, export/import/delete/sync/backup behavior, and v1 status.

2. Wire franchise export/import/delete through that manifest:
   - Keep the hybrid architecture.
   - Export/import/delete scoped global stores by canonical IDs.
   - Add `franchiseSeasonSummaries` to sync/backup schemas.

3. Add transaction canonical identity:
   - Extend transaction records with optional legacy-compatible `franchiseId` and `seasonId`.
   - Add scoped indexes/query helpers and two-franchise isolation tests.

4. Close copy-not-reference visible leaks:
   - Move `useFranchiseData` and FranchiseHome launch metadata to franchise team snapshots/config with global fallback only.
   - Add post-setup League Builder mutation tests.

5. Make new-season movement rollback-safe:
   - Stage schedule/metadata before current-season advancement, or rollback metadata and partial new-season artifacts after failure.
   - Cover direct start and FinalizeAdvanceFlow.

6. Add required test coverage before new feature work:
   - Manifest completeness, full export/import/delete, transaction isolation, League Builder mutation isolation, rollback, SeasonSummary fallback, and legacy-global guard tests.

## Safe To Proceed To Pass 2?

No.

The canonical gameplay identity path is now strong enough to keep using while fixing the spine, but Pass 1 is about the shared franchise data contract. The save-slot contract is still incomplete: the repo uses a hybrid scoped-global architecture that is not fully documented, exported, imported, deleted, synced, or backed up as one franchise save.

Recommended next implementation prompt:

Please implement the Pass 1 spine blockers only. Do not start Pass 2, do not add roster analyzer work, and do not audit gameplay formulas or offseason algorithms.

Scope:
- Formalize the current hybrid franchise save-slot model with a manifest.
- Add export/import/delete/sync/backup coverage for all franchise-owned scoped stores in that manifest.
- Include `franchiseSeasonSummaries` in sync and backup/restore schemas.
- Move visible franchise team/league metadata reads in `useFranchiseData` and FranchiseHome launch from League Builder globals to franchise-owned snapshots, with global reads only as legacy fallback.
- Add `franchiseId` and canonical `seasonId` support to Mode 2 v1 transaction records and scoped query helpers.
- Add rollback/staging for new-season advancement failures after transition success.

Recommended Pass 2 prompt if clean:
- Not applicable yet. Re-run Audit Pass 1 after the blockers above are fixed, then proceed to Pass 2 only if the save-slot contract is complete.
