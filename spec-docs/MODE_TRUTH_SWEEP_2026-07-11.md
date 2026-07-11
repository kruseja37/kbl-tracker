# MODE-TRUTH SWEEP — 2026-07-11 (Sol, read-only, pinned to 562c03f5 = KERNEL-TRUTH-1)

Product truth (JK): exactly three modes — exhibition, elimination, franchise. This sweep classifies every completion/launch/identity path against that truth.

HEADLINE (REACHABLE-LIVE): startup recovery (AppHome.tsx:8-16 + useDataIntegrity.ts:59-104) is MODE-BLIND — a crashed completion of ANY mode gets pushed through regular-season aggregation on next launch. KERNEL closed the initial path; the recovery path remains open. → MODE-KILL-1 slice.

CAVEAT: KERNEL2 was concurrently editing this worktree during the sweep; re-verify processCompletedGame line citations at contract time.

## Paths pretending a fourth mode exists

### REACHABLE-LIVE

- Mode-blind startup recovery treats “complete but unaggregated” as “regular season needing aggregation,” regardless of archive competition. `src/src_figma/app/pages/AppHome.tsx:8-16`; `src/hooks/useDataIntegrity.ts:59-104`.
- Exhibition identity fabricates `season-N` even though exhibition is not a season mode. `src/src_figma/app/utils/gameTrackerIdentity.ts:122-140`.
- The event header’s single `aggregated` Boolean means both “season stats written” and “non-season completion intentionally skipped,” enabling the recovery confusion. `src/utils/eventLog.ts:199-202`; `src/utils/processCompletedGame.ts:1617-1625,1689-1693`.

### LEGACY-DATA-ONLY

- Missing competition identity defaults to exhibition while simultaneously inventing a generic season scope; validation only warns. `src/src_figma/app/utils/gameTrackerIdentity.ts:73-83,122-140,166-169`.
- `useGameState` falls through to `statsScopeId → seasonId → "season-1"` in both completion builders. `src/src_figma/hooks/useGameState.ts:11190-11197,11896-11913`.
- `getCompletedGameSeasonId` accepts options, archive season, stats scope, or season without requiring franchise identity. `src/utils/processCompletedGame.ts:161-173`.
- Missing `competitionType` passes the regular-season gate. `src/utils/processCompletedGame.ts:1163-1185`.
- `aggregateGameToSeason` itself defaults to `season-1`. `src/utils/seasonAggregator.ts:39-43,165-179`.
- `resolveExhibitionLeagueId` interprets `competitionId` as a league when competition identity is absent. `src/utils/gameStorage.ts:436-452`.
- `"playoff"` remains a top-level stored competition/game mode even though it semantically maps to franchise postseason. `src/utils/gameStorage.ts:34-38`; `src/src_figma/app/utils/gameTrackerIdentity.ts:141-149`.
- Score-only backfills absent scope but preserves an already-present legacy `statsScopeId`, even if generic. `src/utils/scheduleStorage.ts:678-705`.

### TEST-ONLY / DEAD

- Tests explicitly preserve generic non-franchise regular-season completion. `src/utils/tests/processCompletedGame.trueValue.test.ts:505-520`.
- The old extracted test orchestrator always aggregates and archives without mode context. `test-utils/processCompletedGame.ts:40-53`.
- Old synthetic season simulations depend entirely on caller-supplied season IDs. `test-utils/syntheticGameFactory.ts:309-335`; `test-utils/seasonSimulator162.test.ts:137-156`.
- Unrouted FranchiseHome synthetic simulation uses the same identityless generator. `src/App.tsx:295-300`; `src/src_figma/app/pages/FranchiseHome.tsx:3469-3504,3575-3615`.
- `archiveBatchGameResult` creates generic season archives and is unused. `src/utils/gameStorage.ts:1083-1119`.
- The unused legacy persistence hook can archive an identityless game. `src/hooks/useGamePersistence.ts:84-110,380-397`.

## Recommended kill list

Fail closed first:

1. Make startup recovery mode-aware. Only `competitionType=franchise` regular-season archives may call `aggregateGameToSeason`. Exhibition should be marked reconciled without season aggregation; franchise postseason and elimination should resume only their postseason-specific writers. Ambiguous archives should be quarantined for review.

2. Change `shouldAggregateToRegularSeasonStats` from exclusion logic to an allow-list: require `competitionType === "franchise"`, `franchiseId`, canonical `seasonId === statsScopeId`, and no postseason markers.

3. Make `aggregateGameToSeason` require an explicit canonical scope; delete its `season-1` default. Keep any legacy read adapter outside the writer.

4. Make `archiveCompletedGame` validate new-write identity. Legacy reads may tolerate missing fields, but no fresh archive should be writable without one of the three product modes.

5. Fail GameTracker initialization on invalid resolved identity. `validateModeCompetitionScope` currently warns instead of blocking. `src/src_figma/app/utils/gameTrackerIdentity.ts:166-169`.

6. Replace top-level `"playoff"` with `mode: "franchise"` plus a postseason/playoff subtype. Continue translating persisted `"playoff"` records on read until legacy saves age out.

7. Stop stamping exhibition with `season-1`; archive it with exhibition competition plus league identity only.

8. Add franchise-specific schedule completion and skip writers that validate expected franchise ID, canonical season ID, and row identity. The generic status writer should not back player-facing actions.

Delete after callers/tests migrate:

- `archiveBatchGameResult`.
- Unused `useGamePersistence`.
- Identityless synthetic simulation handlers in unrouted `FranchiseHome`.
- Duplicate `test-utils/processCompletedGame`.
- Old season simulator fixtures that model a franchise-less regular season.

Must stay temporarily for legacy saves:

- Read-only recognition of missing `competitionType`.
- Postseason-marker protection for old playoff snapshots; this already prevents missing-type playoff games from regular aggregation. `src/utils/processCompletedGame.ts:1169-1185`; `src/utils/tests/processCompletedGame.statBoundary.test.ts:380-410`.
- Translation of stored `"playoff"` to product mode franchise.
- `resolveExhibitionLeagueId`’s missing-type arm, but only inside an explicit legacy migration/read adapter.
- Legacy generic season records for display/export. Do not auto-write inferred repairs during page load.

## Remaining leakage assessment

- Fresh normal exhibition: initial leak closed by KERNEL; recovery leak remains.
- Fresh normal elimination: initial regular-season leak closed; recovery can still run the regular-season aggregator.
- Fresh franchise playoff: initial regular-season leak closed and playoff aggregation validates franchise/season identity, but recovery can add the game to the canonical regular season. `src/utils/playoffStorage.ts:1359-1413`.
- Score-only: new live writes are franchise-owned and do not create player stats or archives. Legacy generic season IDs can still collide because score-only readers filter by season ID, not franchise ID. `src/utils/scheduleStorage.ts:933-957`.
- Malformed restored state: `gameMode` and `competitionType` are resolved independently. A contradictory legacy record could be process-classified one way while schedule completion is gated another way. No normal launcher creates that contradiction. `src/src_figma/app/utils/gameTrackerIdentity.ts:80-149`; `src/src_figma/app/pages/GameTracker.tsx:11583-11601`.

Verification was static because the focused Vitest command could not start under the mandated read-only filesystem: Vite attempted to create `node_modules/.vite-temp/...` and received `EPERM`. The audit itself made no writes. The worktree began clean, then twelve unrelated tracked modifications appeared concurrently; the report therefore remains pinned to `562c03f5`.

