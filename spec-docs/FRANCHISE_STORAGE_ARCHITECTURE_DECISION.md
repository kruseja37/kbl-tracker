# Franchise Storage Architecture Decision

Date: 2026-05-21

Status: Accepted near-term architecture decision for Pass 1B; updated after Wave A lifecycle execution.

Scope guard:
- This is a documentation and architecture reconciliation pass only.
- No app code is implemented here.
- Wave A implements manifest-driven export, delete, validation, backup root coverage, and dynamic franchise player/team DB backup coverage.
- Save-slot import writes, exact restore, and remapped clone import remain deferred future work.
- Roster analyzer work, Pass 2 gameplay audits, and strict Spine migration are out of scope.

## Executive Decision

Decision: adopt the current scoped-global hybrid architecture for Mode 2 v1 and harden it through an explicit save-slot manifest before moving to Pass 2.

The strict Spine two-database model should remain the long-term consolidation option, not the immediate target. The repo already has working, tested franchise identity paths across shared databases. Moving all franchise-owned records into `kbl-franchise-{id}` now would be a broad storage migration touching GameTracker, event logs, season stats, playoffs, offseason state, sync, backup, export/import, and delete behavior. That migration would add more risk than value before the remaining Mode 2 gameplay and handoff audits.

What "correct" means under the chosen model:
- `kbl-franchise-{id}` owns copied franchise team and player snapshots.
- Shared stores may contain franchise-owned records only when every record carries canonical franchise identity and every franchise read/write/delete/export path filters by that identity.
- League Builder data is a mutable template source after setup, not normal franchise runtime state.
- A franchise save slot is the union of its per-franchise DB plus manifest-owned scoped records in global databases.
- Export/delete/validation and backup root coverage are now executed through the manifest; import writes and exact/remapped restore still require a future import wave.

## 1. Current Repo Reality

### Truly Per-Franchise Data

The only real per-franchise IndexedDB today is `kbl-franchise-{id}`. It contains `players` and `teams` only:
- The canonical DB-name helper returns `kbl-franchise-{franchiseId}` (`src/utils/franchisePersistenceContract.ts:9`, `src/utils/franchisePersistenceContract.ts:25`).
- `franchisePlayerStorage` creates exactly two stores, `players` and `teams` (`src/utils/franchisePlayerStorage.ts:20`, `src/utils/franchisePlayerStorage.ts:116`, `src/utils/franchisePlayerStorage.ts:130`, `src/utils/franchisePlayerStorage.ts:137`).
- Franchise setup copies League Builder data into that DB (`src/utils/franchiseInitializer.ts:247`, `src/utils/franchiseInitializer.ts:248`).
- Conservative legacy repair backfills from League Builder only when franchise players or teams are empty, preserving valid non-empty franchise snapshots even if the template changed (`src/utils/franchiseInitializer.ts:191`, `src/utils/franchiseInitializer.ts:197`).

This means copied teams and players are the franchise-owned roster/team source of truth. Everything else is either shared-global-but-scoped, app-global/template-only, or deferred/prototype state.

### Shared/Global Stores With Franchise Scope

The current implementation stores most franchise season state in global databases with identity fields:

- App metadata/config: `kbl-app-meta` contains `franchiseList`, `appSettings`, `franchiseConfigs`, and `eliminationList` (`src/utils/franchiseManager.ts:78`, `src/utils/franchiseManager.ts:84`). Franchise metadata includes `leagueId`, `controlledTeamId`, and `currentSeason` (`src/utils/franchiseManager.ts:28`, `src/utils/franchiseManager.ts:35`, `src/utils/franchiseManager.ts:40`). Franchise config is saved in the same DB (`src/utils/franchiseManager.ts:389`, `src/utils/franchiseManager.ts:408`).
- Schedule rows: `kbl-schedule.scheduledGames` has optional `franchiseId` and `seasonNumber` (`src/utils/scheduleStorage.ts:14`, `src/utils/scheduleStorage.ts:28`, `src/utils/scheduleStorage.ts:30`). Franchise reads use `getAllGamesByFranchise(franchiseId, seasonNumber)` (`src/utils/scheduleStorage.ts:529`, `src/utils/scheduleStorage.ts:541`). Unscoped reads intentionally filter out franchise rows (`src/utils/scheduleStorage.ts:151`, `src/utils/scheduleStorage.ts:167`).
- Season metadata and stats: `kbl-tracker` owns `seasonMetadata`, `playerSeasonBatting`, `playerSeasonPitching`, and `playerSeasonFielding`, keyed by canonical `seasonId` where franchise seasons use `{franchiseId}-season-{n}` (`src/utils/trackerDb.ts:16`, `src/utils/trackerDb.ts:71`, `src/utils/trackerDb.ts:98`, `src/utils/seasonStorage.ts:36`, `src/utils/seasonStorage.ts:78`, `src/utils/seasonStorage.ts:125`, `src/utils/seasonStorage.ts:151`).
- Durable season summary: `kbl-tracker.franchiseSeasonSummaries` is keyed by canonical `seasonId`, indexed by `franchiseId` and `seasonNumber` (`src/utils/trackerDb.ts:103`, `src/utils/trackerDb.ts:108`). Summary creation reads scoped schedule, completed games, standings, season stats, playoff, and offseason state, then persists copy-not-reference snapshots (`src/utils/franchiseSeasonSummaryStorage.ts:207`, `src/utils/franchiseSeasonSummaryStorage.ts:224`, `src/utils/franchiseSeasonSummaryStorage.ts:249`, `src/utils/franchiseSeasonSummaryStorage.ts:276`, `src/utils/franchiseSeasonSummaryStorage.ts:280`, `src/utils/franchiseSeasonSummaryStorage.ts:304`).
- Completed games/current game: `kbl-tracker.completedGames` records include optional `seasonId`, `statsScopeId`, `competitionType`, `competitionId`, `playoffId`, `franchiseId`, `scheduleGameId`, and `seasonNumber` (`src/utils/gameStorage.ts:547`, `src/utils/gameStorage.ts:550`, `src/utils/gameStorage.ts:552`, `src/utils/gameStorage.ts:557`, `src/utils/gameStorage.ts:566`, `src/utils/gameStorage.ts:568`). Archive writes preserve context from GameTracker or explicit archive options (`src/utils/gameStorage.ts:701`, `src/utils/gameStorage.ts:744`, `src/utils/gameStorage.ts:748`, `src/utils/gameStorage.ts:762`, `src/utils/gameStorage.ts:763`). Recent-game queries can filter by `seasonId`, `statsScopeId`, `franchiseId`, `competitionType`, and `competitionId` (`src/utils/gameStorage.ts:877`, `src/utils/gameStorage.ts:885`).
- Event log: `kbl-event-log` owns game headers and events (`src/utils/eventLog.ts:47`, `src/utils/eventLog.ts:50`). `GameHeader` carries optional `seasonId`, `statsScopeId`, `competitionType`, `competitionId`, `franchiseId`, `leagueId`, `scheduleGameId`, and playoff identity (`src/utils/eventLog.ts:145`, `src/utils/eventLog.ts:147`, `src/utils/eventLog.ts:152`, `src/utils/eventLog.ts:154`). At-bat events carry the same optional identity group (`src/utils/eventLog.ts:267`, `src/utils/eventLog.ts:270`, `src/utils/eventLog.ts:274`). Scope queries filter by `statsScopeId`, `seasonId`, `competitionType`, and `competitionId` (`src/utils/eventLog.ts:1934`, `src/utils/eventLog.ts:1942`, `src/utils/eventLog.ts:1958`).
- Transactions: `kbl-transactions.transactions` now supports Mode 2 v1's narrowed transaction surface plus optional canonical `franchiseId`, `seasonId`, `statsScopeId`, and `scheduleGameId` (`src/utils/transactionStorage.ts:56`, `src/utils/transactionStorage.ts:142`, `src/utils/transactionStorage.ts:148`). Indexes include franchise, season id, schedule game, and franchise-season composite keys (`src/utils/transactionStorage.ts:244`, `src/utils/transactionStorage.ts:250`, `src/utils/transactionStorage.ts:256`). `logMode2V1Transaction` maps supported legacy names and rejects unsupported Mode 2 v1 categories (`src/utils/transactionStorage.ts:121`, `src/utils/transactionStorage.ts:310`, `src/utils/transactionStorage.ts:313`).
- Playoffs: `kbl-playoffs` owns playoff configs, series, games, and stats (`src/utils/playoffStorage.ts:21`, `src/utils/playoffStorage.ts:24`). Playoff configs include `sourceType`, `franchiseId`, and `eliminationId` (`src/utils/playoffStorage.ts:67`). Creation requires `eliminationId` for elimination playoffs and normalizes franchise/elimination ownership (`src/utils/playoffStorage.ts:439`, `src/utils/playoffStorage.ts:441`, `src/utils/playoffStorage.ts:444`, `src/utils/playoffStorage.ts:448`). Franchise reads require franchise season scope via `getPlayoffByFranchiseSeason` (`src/utils/playoffStorage.ts:583`, `src/utils/playoffStorage.ts:603`). Elimination reads/deletes require `eliminationId` (`src/utils/playoffStorage.ts:623`, `src/utils/playoffStorage.ts:1507`, `src/utils/playoffStorage.ts:1513`).
- Offseason state: `kbl-offseason.offseasonState` stores `seasonId`, `seasonNumber`, and optional `franchiseId` (`src/utils/offseasonStorage.ts:54`, `src/utils/offseasonStorage.ts:56`, `src/utils/offseasonStorage.ts:58`, `src/utils/offseasonStorage.ts:219`, `src/utils/offseasonStorage.ts:222`). `startOffseason` writes `id: offseason-{seasonId}` and preserves optional franchise identity (`src/utils/offseasonStorage.ts:300`, `src/utils/offseasonStorage.ts:307`, `src/utils/offseasonStorage.ts:311`).

### App-Global Or Template-Only Data

The following remain global/template-like rather than franchise-owned runtime state:
- League Builder templates, teams, players, rosters, and rules presets (`src/utils/franchisePersistenceContract.ts:143`, `src/utils/syncConfig.ts:39`).
- `appSettings.activeFranchise`, which is device/session state, not part of one save slot (`src/utils/franchiseManager.ts:332`, `src/utils/franchiseManager.ts:351`).
- Legacy localStorage markers such as `kbl-current-season` remain in sync config for compatibility (`src/utils/syncConfig.ts:132`, `src/utils/syncConfig.ts:138`), but franchise home/finalization work has moved current season to franchise metadata and passes `skipLegacyLocalStorageMarkers` during franchise season transition (`src/src_figma/app/pages/FranchiseHome.tsx:448`, `src/src_figma/app/pages/FranchiseHome.tsx:450`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:402`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:404`).
- Backup/sync registries are global. After Wave A, backup schema/root coverage includes franchise roots in `kbl-app-meta` plus dynamic `kbl-franchise-{id}` player/team stores, while import writes and full restore/clone execution remain deferred (`src/utils/syncConfig.ts:9`, `src/utils/syncConfig.ts:118`, `src/utils/backupRestore.ts:260`, `src/utils/trackerDb.ts:103`).

### Guardrails Now Present After Waves 1-4 And Pass 1A

Current code has several important guardrails:
- Canonical helpers for franchise DB names, franchise season IDs, and season handoff payloads (`src/utils/franchisePersistenceContract.ts:25`, `src/utils/franchisePersistenceContract.ts:29`, `src/utils/franchisePersistenceContract.ts:74`).
- Setup rollback deletes partial season metadata, franchise metadata/config/schedule, and the per-franchise DB if initialization fails (`src/utils/franchiseInitializer.ts:146`, `src/utils/franchiseInitializer.ts:151`, `src/utils/franchiseInitializer.ts:156`, `src/utils/franchiseInitializer.ts:162`, `src/utils/franchiseInitializer.ts:293`).
- Franchise schedules and season metadata are created during setup (`src/utils/franchiseInitializer.ts:272`, `src/utils/franchiseInitializer.ts:276`, `src/utils/franchiseInitializer.ts:288`).
- Franchise visible reads now prefer franchise-owned team snapshots in the audited routes: `useFranchiseData` loads franchise teams when `franchiseId` is present (`src/src_figma/hooks/useFranchiseData.ts:341`, `src/src_figma/hooks/useFranchiseData.ts:348`), and franchise postseason GameTracker launch uses franchise-owned team snapshots before League Builder color fallbacks (`src/src_figma/app/pages/FranchiseHome.tsx:877`, `src/src_figma/app/pages/FranchiseHome.tsx:882`, `src/src_figma/app/pages/FranchiseHome.tsx:959`).
- A central mode/competition scope validator distinguishes exhibition, franchise regular season, franchise playoff, and elimination (`src/utils/modeCompetitionScope.ts:3`, `src/utils/modeCompetitionScope.ts:18`, `src/utils/modeCompetitionScope.ts:21`, `src/utils/modeCompetitionScope.ts:27`, `src/utils/modeCompetitionScope.ts:35`, `src/utils/modeCompetitionScope.ts:44`).
- Playoff/elimination boundaries reject ambiguous elimination season reads/deletes and cross-source aggregation (`src/utils/playoffStorage.ts:527`, `src/utils/playoffStorage.ts:532`, `src/utils/playoffStorage.ts:1271`, `src/utils/playoffStorage.ts:1281`, `src/utils/playoffStorage.ts:1293`, `src/utils/playoffStorage.ts:1507`, `src/utils/playoffStorage.ts:1513`).
- New-season commit ordering stages schedule/season metadata before advancing franchise metadata, but both direct start and FinalizeAdvanceFlow still document that full rollback of internal `executeSeasonTransition` side effects needs a future transition journal (`src/src_figma/app/pages/FranchiseHome.tsx:456`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:411`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:423`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:431`).

## 2. Comparison Against The Strict Spine Two-Database Model

### Where The Repo Matches The Spine

The repo matches the Spine intent in these ways:
- Franchise setup is copy-not-reference for League Builder teams/players (`src/utils/franchiseInitializer.ts:247`, `src/utils/franchisePlayerStorage.ts:20`, `src/utils/franchisePlayerStorage.ts:116`).
- Canonical franchise season IDs are used for season metadata, stats, summaries, and handoff (`src/utils/franchisePersistenceContract.ts:29`, `src/utils/franchiseSeasonSummaryStorage.ts:212`, `src/utils/franchiseSeasonSummaryStorage.ts:249`).
- Runtime GameTracker/game/archive/event records can carry franchise, season, schedule, playoff, competition, and stats-scope identity (`src/utils/gameStorage.ts:547`, `src/utils/eventLog.ts:145`, `src/utils/eventLog.ts:267`).
- Playoffs and elimination brackets are now source-discriminated (`src/utils/playoffStorage.ts:67`, `src/utils/playoffStorage.ts:439`).
- The product behavior goal of "changes to global pool do not propagate to existing franchises" is now enforced for the main visible franchise team/player paths (`src/src_figma/hooks/useFranchiseData.ts:348`, `src/src_figma/app/pages/FranchiseHome.tsx:877`).

### Where The Repo Intentionally Differs

The Spine currently describes a physical two-database model:
- `kbl-app-meta` for global metadata/templates.
- `kbl-franchise-{id}` for metadata, teams, players, rosters, schedule, game headers, events, transaction events, season stats, standings, current game, and completed games (`spec-docs/SPINE_ARCHITECTURE.md:723`, `spec-docs/SPINE_ARCHITECTURE.md:740`).

The repo does not physically implement that model. `kbl-franchise-{id}` contains only copied `players` and `teams`, while franchise-owned schedules, games, events, stats, playoffs, transactions, offseason state, and summaries live in shared DBs with scope fields (`src/utils/franchisePlayerStorage.ts:20`, `src/utils/franchisePlayerStorage.ts:116`, `src/utils/scheduleStorage.ts:14`, `src/utils/trackerDb.ts:16`, `src/utils/eventLog.ts:47`, `src/utils/playoffStorage.ts:21`, `src/utils/offseasonStorage.ts:219`, `src/utils/transactionStorage.ts:22`).

This is not currently a runtime bug by itself. It becomes a bug when a shared-store record lacks canonical identity, a query omits the right filter, a delete/export skips scoped records, or a fallback reads mutable League Builder data as though it were franchise-owned data.

### Risks Of Keeping The Hybrid

Primary risks:
- Save-slot operations are partially implemented. Wave A makes export and delete manifest-driven for strict franchise-owned records and keeps import validate-only; exact restore and remapped clone import remain deferred. Career stats and milestones remain excluded until they carry canonical franchise ownership.
- Optional identity fields remain tolerated for backward compatibility. That is necessary for legacy/global callers, but franchise write boundaries must be stricter than the storage types.
- Some shared stores have incomplete physical indexes for the new scope model. For example, event log schema indexes `seasonId` but not `franchiseId`, `statsScopeId`, or `scheduleGameId` (`src/utils/eventLog.ts:97`, `src/utils/eventLog.ts:130`), so scoped queries can require full-store scans (`src/utils/eventLog.ts:1950`, `src/utils/eventLog.ts:1953`).
- Sync and backup are partially aligned with the save-slot concept after Wave A, including franchise roots and dynamic franchise player/team DBs; full import/restore execution and cloud sync confidence remain future work.
- Legacy global markers remain present for compatibility and must be kept out of franchise ownership decisions (`src/utils/syncConfig.ts:132`, `src/utils/syncConfig.ts:138`).
- Full rollback of `executeSeasonTransition` internal side effects is not atomic yet and requires a future transition journal (`src/src_figma/app/pages/FranchiseHome.tsx:456`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:431`).

### Risks Of Migrating Now

Migrating all franchise-owned data into `kbl-franchise-{id}` now would require:
- Moving schedule rows out of `kbl-schedule` or adding dual-write migration.
- Moving `completedGames`, current game snapshots, season metadata/stats, franchise summaries, and related caches out of `kbl-tracker`.
- Moving event headers/events out of `kbl-event-log`, or building a cross-DB event reader.
- Moving playoffs, offseason state, and transactions into the per-franchise DB, while preserving elimination and exhibition/global behavior.
- Reworking sync and backup schemas around dynamic per-franchise stores.
- Rewriting export/import/delete while simultaneously migrating existing saves.

That is high risk because the current Wave 1-4 and Pass 1A work has already focused on identity correctness within the hybrid. A physical migration before Pass 2 would create a large regression surface without first proving the complete save-slot manifest.

## 3. Decision

Adopt the scoped-global hybrid for now.

The immediate architecture is:

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
```

Strict per-franchise storage for all Mode 2 records is deferred. The migration should be reconsidered only after:
- the save-slot manifest exists and rejects ambiguous same-season records as non-owned,
- export/delete/validation and backup root coverage from that manifest continue to pass isolation tests,
- import-write behavior has an explicit exact-restore or remapped-clone strategy before implementation,
- Pass 2 gameplay/stat/event audits identify no major identity holes,
- and there is a concrete migration plan for existing hybrid saves.

## 4. Required Spec/Doc Updates

The Spine should be clarified rather than rewritten wholesale.

### `SPINE_ARCHITECTURE.md` Section 6.1

Current section: `Two-Database Model` (`spec-docs/SPINE_ARCHITECTURE.md:723`).

Recommended change:
- Rename to `Logical Save-Slot Ownership Model`.
- Keep the strict two-database tree as the future ideal or long-term consolidation option.
- Add a Mode 2 v1 implementation note:

```text
Mode 2 v1 currently implements franchise save slots as a hybrid:
copied franchise teams/players live in `kbl-franchise-{id}`, while gameplay,
season, playoff, offseason, transaction, and summary records live in shared
IndexedDB stores. Those shared records are franchise-owned only when they carry
canonical `franchiseId`, `seasonId`, `seasonNumber`, `statsScopeId`, and
competition identity as required by the save-slot manifest.
```

### `SPINE_ARCHITECTURE.md` Section 6.2

Current section: franchise isolation says deleting a franchise deletes its entire IndexedDB with no orphaned data (`spec-docs/SPINE_ARCHITECTURE.md:768`, `spec-docs/SPINE_ARCHITECTURE.md:776`).

Recommended change:
- Replace physical-delete-only wording with manifest delete semantics for v1:

```text
For the Mode 2 v1 hybrid, deleting a franchise deletes `kbl-franchise-{id}`
and every manifest-owned record in shared stores matching that franchise's
canonical identity. No scoped global records may be orphaned.
```

### `SPINE_ARCHITECTURE.md` Section 5

Current event stream language says streams are immutable and lists `seasonId` on events (`spec-docs/SPINE_ARCHITECTURE.md:625`, `spec-docs/SPINE_ARCHITECTURE.md:637`, `spec-docs/SPINE_ARCHITECTURE.md:684`).

Recommended change:
- Add `statsScopeId`, `competitionType`, `competitionId`, and `franchiseId` as required Mode 2 franchise event identity at write boundaries.
- Clarify that legacy records can omit those fields only for backward compatibility and should be excluded from franchise-scoped reads unless explicitly repaired or safely mapped.

### `SPINE_ARCHITECTURE.md` Transaction Type Section

The broad transaction type union in the Spine includes future/offseason types beyond Mode 2 v1 (`spec-docs/SPINE_ARCHITECTURE.md:701`). Mode 2 v1 currently narrows active writes to eight types (`src/utils/transactionStorage.ts:56`).

Recommended change:
- State that the broad Spine transaction vocabulary is cross-mode/future-facing.
- State that Mode 2 v1 active transaction writes are limited to: `trade`, `free_agent_signing`, `release`, `call_up`, `send_down`, `draft_pick`, `retirement`, `injury_list`.

### Roadmap/Remediation Docs

`PASS_1_SPINE_REMEDIATION_PLAN.md` already recommends the scoped-global hybrid (`spec-docs/PASS_1_SPINE_REMEDIATION_PLAN.md:15`, `spec-docs/PASS_1_SPINE_REMEDIATION_PLAN.md:24`) and calls for an ADR plus manifest (`spec-docs/PASS_1_SPINE_REMEDIATION_PLAN.md:35`, `spec-docs/PASS_1_SPINE_REMEDIATION_PLAN.md:68`, `spec-docs/PASS_1_SPINE_REMEDIATION_PLAN.md:330`). This document should be linked from that plan as the Pass 1B decision.

## 5. Required Code Guardrails

These are required under the hybrid model. Some already exist; others are Pass 1C or later work.

### Required Identity Fields

Franchise regular season records:
- `competitionType: "franchise"`
- `competitionId: franchiseId`
- `franchiseId`
- `seasonNumber`
- canonical `seasonId: {franchiseId}-season-{seasonNumber}`
- `statsScopeId`, normally equal to `seasonId`
- `scheduleGameId` for scheduled games and completed games launched from the schedule

Franchise postseason records:
- `competitionType: "playoff"`
- `competitionId: playoffId`
- `franchiseId`
- `seasonNumber`
- canonical `seasonId`
- canonical `statsScopeId`
- `playoffId`
- `playoffSeriesId`
- `playoffGameNumber`
- playoff storage `sourceType: "franchise"`

Elimination records:
- `competitionType: "elimination"`
- `competitionId: eliminationId`
- `eliminationId`
- `statsScopeId: elimination-{eliminationId}`
- playoff storage `sourceType: "elimination"`
- no franchise identity

Exhibition records:
- `competitionType: "exhibition"`
- no `franchiseId`
- no `eliminationId`
- no franchise season identity

The central validator already encodes most of this shape (`src/utils/modeCompetitionScope.ts:18`, `src/utils/modeCompetitionScope.ts:27`, `src/utils/modeCompetitionScope.ts:35`, `src/utils/modeCompetitionScope.ts:44`). Pass 1C should make the same identities visible in the save-slot manifest.

### Required Indexes And Query Filters

Every shared franchise-owned store needs at least one indexed or validated path for:
- `franchiseId`,
- canonical `seasonId` or `statsScopeId`,
- `seasonNumber` where legacy UIs still need it,
- `competitionType` and `competitionId` for game/archive/event scopes,
- `scheduleGameId` where completion handoff matters,
- `playoffId` for postseason series/stats,
- `eliminationId` for elimination records.

Existing gaps to call out in Pass 1C:
- `kbl-event-log` has only `seasonId` for game headers and no direct `franchiseId`/`statsScopeId`/`scheduleGameId` indexes (`src/utils/eventLog.ts:97`, `src/utils/eventLog.ts:130`).
- `kbl-schedule.scheduleMetadata` is keyed only by `seasonNumber`, so franchise schedule metadata must be treated as derived, not authoritative, until it gains franchise scope or is excluded from franchise save-slot ownership (`src/utils/scheduleStorage.ts:50`, `src/utils/scheduleStorage.ts:119`, `src/utils/scheduleStorage.ts:425`).
- Backup/sync schemas need to be aligned with `trackerDb` version 12 and `franchiseSeasonSummaries` (`src/utils/backupRestore.ts:260`, `src/utils/trackerDb.ts:103`).

### League Builder Fallback Rules

Allowed:
- Initial Mode 1 to Mode 2 setup copy.
- Conservative repair only when per-franchise players or teams are empty (`src/utils/franchiseInitializer.ts:191`, `src/utils/franchiseInitializer.ts:197`).
- Damaged legacy display fallback with a clear warning or blocked action when the franchise-owned snapshot is missing.

Not allowed:
- Normal franchise gameplay, postseason launch, roster/team display, schedule, season summary, or standings reads should not treat mutable League Builder teams/players as franchise state.
- Repair must not recopy non-empty franchise-owned rosters simply because the mutable League Builder template has changed.

### Export/Import/Delete/Backup Rules

Export, delete, validation, and backup root coverage now operate from the manifest. Future import writes, exact restore, remapped clone import, and full backup/restore execution must continue to use the manifest rather than ad hoc store lists.

Delete must:
- delete `kbl-franchise-{id}`,
- delete `kbl-app-meta.franchiseList[franchiseId]` and `franchiseConfigs[franchiseId]`,
- delete all scoped global rows for the franchise,
- leave other franchises, elimination runs, exhibition records, League Builder templates, and device-global settings intact.

Export must:
- include per-franchise players/teams,
- include manifest-owned global scoped records,
- include enough identity to validate that every exported scoped record belongs to the franchise,
- either include or explicitly exclude device-global markers like `activeFranchise`.

Future import-write work must define one of two strategies before implementation:
- exact restore, preserving `franchiseId` and record IDs, suitable for backup/restore;
- remapped clone import, generating a new `franchiseId` and rewriting every scoped identity consistently.

Backup/sync must:
- include the manifest-owned global stores that are durable franchise history,
- exclude or mark device-local values,
- include `franchiseSeasonSummaries`, franchise roots, and dynamic franchise player/team stores; Wave A covers these schema/root boundaries while full restore/import execution remains deferred (`src/utils/syncConfig.ts:10`, `src/utils/backupRestore.ts:260`, `src/utils/trackerDb.ts:103`).

### Transaction/Event/Season/Playoff/Offseason Rules

Transactions:
- Mode 2 v1 franchise writes must use `logMode2V1Transaction` and include canonical franchise identity.
- Legacy `logTransaction` can remain backward-compatible for non-franchise/global callers, but should not be used as the normal Mode 2 v1 franchise write path.

Events:
- Franchise GameTracker write boundaries must provide canonical identity to headers and events.
- Legacy events without identity should not appear in scoped franchise views unless explicitly repaired.

Season:
- Franchise season metadata and stats are keyed by canonical `seasonId`.
- Franchise current season is `FranchiseMetadata.currentSeason`, not global `kbl-current-season`.

Playoffs:
- Franchise playoff records require `sourceType: "franchise"`, `franchiseId`, and canonical season identity.
- Elimination playoff records require `sourceType: "elimination"` and `eliminationId`.
- Ambiguous elimination season reads/deletes remain disallowed (`src/utils/playoffStorage.ts:527`, `src/utils/playoffStorage.ts:1507`).

Offseason:
- Franchise offseason state should be keyed by canonical `seasonId` and optional `franchiseId`.
- Prototype offseason mutations that still target League Builder/global template storage must remain blocked in franchise context until real franchise-owned adapters exist.

## 6. Save-Slot Manifest Contract Preview

Pass 1C should add a manifest that classifies every domain below. This preview is not the implementation; it is the contract the implementation should follow.

Manifest entry fields:
- `domain`: human-readable domain, such as `schedule`, `completedGames`, `playoffs`.
- `databaseName`: concrete DB name or dynamic prefix.
- `storeName`: concrete object store.
- `ownerKind`: `perFranchiseDb`, `globalScoped`, `globalTemplate`, `deviceGlobal`, or `deferredPrototype`.
- `keyPath`: IndexedDB key path.
- `requiredIdentity`: fields required for franchise ownership.
- `exportFilter`: how to select this franchise's records.
- `importStrategy`: `preserveIds`, `remapFranchiseIds`, `exclude`, or `deferred`.
- `deleteStrategy`: exact scoped delete rule.
- `syncStatus`: `covered`, `missing`, `partial`, or `excluded`.
- `backupStatus`: `covered`, `missing`, `partial`, or `excluded`.
- `validation`: record-level checks that must pass before export/import/delete.

Initial manifest domains:

| Domain | DB / Store | Owner Kind | Required Franchise Filter | Notes |
|---|---|---|---|---|
| Franchise metadata | `kbl-app-meta.franchiseList` | global scoped | `franchiseId` | Save-slot root record (`src/utils/franchiseManager.ts:28`, `src/utils/franchiseManager.ts:155`). |
| Franchise config | `kbl-app-meta.franchiseConfigs` | global scoped | `franchiseId` | Setup/config source for league/rules (`src/utils/franchiseManager.ts:389`). |
| Active franchise | `kbl-app-meta.appSettings` | device global | none | Exclude from franchise export; may be set by UI after import. |
| Franchise players | `kbl-franchise-{id}.players` | per-franchise DB | DB name | Core copied player snapshots (`src/utils/franchisePlayerStorage.ts:20`). |
| Franchise teams | `kbl-franchise-{id}.teams` | per-franchise DB | DB name | Core copied team snapshots (`src/utils/franchisePlayerStorage.ts:20`). |
| Schedule games | `kbl-schedule.scheduledGames` | global scoped | `franchiseId + seasonNumber` | Must include all seasons for the franchise (`src/utils/scheduleStorage.ts:28`, `src/utils/scheduleStorage.ts:529`). |
| Schedule metadata | `kbl-schedule.scheduleMetadata` | derived/partial | none reliable | Keyed by season number only; derive from games or defer until scoped metadata exists (`src/utils/scheduleStorage.ts:50`, `src/utils/scheduleStorage.ts:119`). |
| Season metadata | `kbl-tracker.seasonMetadata` | global scoped | canonical `seasonId` | Includes active/completed status and totals (`src/utils/seasonStorage.ts:151`). |
| Season stats | `kbl-tracker.playerSeason*` | global scoped | canonical `seasonId` | Batting/pitching/fielding stats keyed by `seasonId + playerId` (`src/utils/trackerDb.ts:71`). |
| Career stats and milestones | `kbl-tracker.playerCareer*`, `careerMilestones` | deferred | canonical franchise scope required | Do not export/delete by copied `playerId` alone; two franchises can share copied source player IDs until these records carry `franchiseId` or another canonical owner key. |
| Current game | `kbl-tracker.currentGame` | global scoped/current | identity inside snapshot | Include only if it belongs to this franchise; otherwise device-current and export policy must be explicit (`src/utils/gameStorage.ts:60`). |
| Completed games | `kbl-tracker.completedGames` | global scoped | `franchiseId + seasonId/statsScopeId/competition` | Archive query already supports scoped filters (`src/utils/gameStorage.ts:877`). |
| Franchise summaries | `kbl-tracker.franchiseSeasonSummaries` | global scoped | `franchiseId + seasonId` | Must be added to sync/backup (`src/utils/trackerDb.ts:103`, `src/utils/franchiseSeasonSummaryStorage.ts:304`). |
| Game headers | `kbl-event-log.gameHeaders` | global scoped | `franchiseId + seasonId/statsScopeId/competition` | Needs manifest validation and likely indexes (`src/utils/eventLog.ts:145`). |
| At-bat events | `kbl-event-log.atBatEvents` | global scoped via game | `gameId` from owned headers, plus optional identity | Events have optional identity but indexes are game-based (`src/utils/eventLog.ts:209`, `src/utils/eventLog.ts:267`). |
| Pitching appearances | `kbl-event-log.pitchingAppearances` | global scoped via game | `gameId` from owned headers | Store is game-linked (`src/utils/eventLog.ts:50`, `src/utils/eventLog.ts:115`). |
| Fielding events | `kbl-event-log.fieldingEvents` | global scoped via game | `gameId` from owned headers | Store is game-linked (`src/utils/eventLog.ts:122`). |
| Between-play events | `kbl-event-log.betweenPlayEvents` | global scoped via game | `gameId` from owned headers | Store is game-linked (`src/utils/eventLog.ts:130`). |
| Transactions | `kbl-transactions.transactions` | global scoped | `franchiseId + seasonId` | Mode 2 writes should use narrowed type surface (`src/utils/transactionStorage.ts:56`, `src/utils/transactionStorage.ts:397`). |
| Playoff configs | `kbl-playoffs.playoffs` | global scoped | `sourceType=franchise + franchiseId + seasonId/seasonNumber` | Must exclude elimination (`src/utils/playoffStorage.ts:67`, `src/utils/playoffStorage.ts:583`). |
| Playoff series/games/stats | `kbl-playoffs.series/playoffGames/playoffStats` | global scoped via playoff | owned `playoffId` | Children are keyed by playoff id (`src/utils/playoffStorage.ts:24`, `src/utils/playoffStorage.ts:1541`). |
| Offseason state | `kbl-offseason.offseasonState` | global scoped | canonical `seasonId`, optional `franchiseId` | Full mutation adapters remain future work (`src/utils/offseasonStorage.ts:54`, `src/utils/offseasonStorage.ts:300`). |
| Offseason phase stores | `kbl-offseason.awards/ratings/retirements/freeAgency/draft/trades` | deferred/partial | canonical `seasonId` where present | Classify now; do not enable unsafe franchise mutations yet (`src/utils/offseasonStorage.ts:222`). |
| League Builder templates | `kbl-league-builder.*` | global template | none | Exclude from franchise save slot except source provenance (`src/utils/syncConfig.ts:39`). |
| Farm | `kbl-farm.farmPlayers` | deferred/prototype | TBD | Out of scope until farm/roster movement pass (`src/utils/syncConfig.ts:91`). |
| LocalStorage legacy markers | `kbl-current-season`, `kbl_last_transition`, prefixes | device/global legacy | none | Exclude or mark compatibility-only (`src/utils/syncConfig.ts:132`). |

Minimum validation checks:
- Every exported franchise-owned record has matching `franchiseId` when the store supports it.
- Every exported season-scoped record has canonical `seasonId` matching `{franchiseId}-season-{n}`.
- No elimination playoff/source record appears in a franchise export.
- No franchise record appears in an elimination export.
- Every event child record belongs to an exported/owned game header.
- Every completed game scheduled from franchise mode has a `scheduleGameId`.
- Every playoff child belongs to an exported/owned `playoffId`.
- Every summary snapshot matches its `franchiseId`, `seasonId`, and `seasonNumber`.
- Schedule metadata is derived or excluded until it is franchise-scoped.
- Import strategy is explicit before any IDs are remapped.

## 7. Remaining Risks

P1/P2 architecture risks:
- Wave A implements manifest-driven export, delete, and validation for strict franchise-owned records; import writes, exact restore, and remapped clone import remain deferred.
- Backup schema/root coverage now includes franchise roots and dynamic franchise player/team stores; full backup/restore round-trip and cloud sync execution remain future work.
- Transaction identity exists but remains optional at the storage type level for backward compatibility. Franchise write boundaries must keep enforcing it.
- Event log scope fields are optional and under-indexed.
- `executeSeasonTransition` still lacks a transaction journal for rollback of internal side effects after partial failure.

Tolerated near-term global state:
- `kbl-current-season` and related localStorage markers remain for legacy/global flows but should not drive franchise season state.
- League Builder remains the Mode 1 template source and damaged-legacy fallback, not active franchise state.
- Synthetic simulation code may remain present as long as Mode 2 v1 surfaces keep it disabled/unreachable.

Tests still needed:
- Manifest completeness test covering every franchise-owned store listed above.
- Save-slot import-write exact restore and remapped clone isolation tests once import writes are implemented.
- Full backup/restore round-trip tests proving Wave 4 summaries, scoped global records, franchise roots, and dynamic franchise player/team stores are covered.
- Event-log scoped query/index tests for multi-franchise same-season data.
- Save-slot validation tests rejecting cross-franchise, wrong-season, and elimination/franchise crossover records.

## Final Recommendation

Adopt the scoped-global hybrid for now.

Do not migrate to the strict Spine two-database model before the next implementation wave. The hybrid is already the repo reality and is workable if kept explicit, tested, and manifest-owned. Pass 1C defined the save-slot manifest contract, and Wave A now implements validation, export, delete, and backup root coverage while keeping import writes deferred.

Wave B transition journal and rollback hardening is the next recommended implementation wave. Exact restore, remapped clone import, and other import writes should remain future save-slot work after transition recovery is hardened.

## Historical Exact Pass 1C Implementation Prompt

This prompt is retained for audit traceability. It has been superseded by Pass 1C and Wave A; do not treat it as the current next implementation prompt.

```text
Please implement Pass 1C: franchise save-slot manifest contract only.

Do not start Pass 2.
Do not add roster analyzer work.
Do not implement save-slot export/import/delete/backup execution yet.
Do not migrate to the strict two-database Spine model.
Keep the current scoped-global hybrid architecture.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_STORAGE_ARCHITECTURE_DECISION.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_1_SPINE_CONTRACT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/PASS_1_SPINE_REMEDIATION_PLAN.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/SPINE_ARCHITECTURE.md

Goals:
1. Add a durable franchise save-slot manifest contract
   - Prefer a new utility file such as `src/utils/franchiseSaveSlotManifest.ts`, or a small extension near `franchisePersistenceContract.ts` if that is cleaner.
   - Include manifest entries for per-franchise DB stores and all manifest-owned global scoped stores:
     app metadata/config, franchise players/teams, schedules, season metadata/stats, current/completed games, franchise season summaries, event log stores, transactions, playoffs, offseason state/phase stores, and explicit exclusions/deferred entries for League Builder templates, localStorage legacy markers, farm, and prototype-only domains.
   - Each entry should declare database/store, owner kind, key path, required identity fields, export filter semantics, import strategy, delete strategy, sync status, backup status, and validation notes.

2. Add validation helpers/tests for the manifest
   - Assert every active franchise-owned entry has a non-empty owner kind, key path, delete strategy, and required identity declaration.
   - Assert `kbl-franchise-{id}.players` and `kbl-franchise-{id}.teams` are represented.
   - Assert known scoped global domains are represented: schedule, season metadata/stats, completed games, franchise summaries, event log, transactions, playoffs, and offseason state.
   - Assert excluded/deferred domains are explicit rather than omitted: League Builder templates, localStorage legacy markers, farm, and prototype offseason phase stores if not yet safe.
   - Assert `franchiseSeasonSummaries` is called out as currently missing/partial in sync/backup coverage until those systems are updated.

3. Do not change runtime save behavior yet
   - Do not implement export/import/delete/backup execution.
   - Do not change GameTracker, offseason, playoffs, transactions, or schedule runtime logic unless a type-only import is needed for the manifest.

After implementation:
- Run the new manifest tests.
- Run the focused Pass 1A/Wave 1-4 franchise storage tests if touched by imports.
- Run `npm run build`.
- Summarize changed files, behavior, test results, and remaining risks.
```
