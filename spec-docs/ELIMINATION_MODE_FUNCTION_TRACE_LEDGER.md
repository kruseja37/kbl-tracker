# Elimination Mode Function Trace Ledger

Last verified: March 9, 2026

Strict factual canon note: for the tightest source-cited claim set, use `ELIMINATION_MODE_EVIDENCE_BACKED_ASSERTION_LEDGER.md` first. This ledger remains the best function-by-function execution companion.

Purpose: tighter companion to `ELIMINATION_MODE_CURRENT_FUNCTIONAL_LOGIC_BIBLE.md`. This document traces the live elimination-mode code path function by function, with emphasis on callers, reads, writes, state transitions, failure points, and cross-module dependencies.

Method:
- Re-read the live elimination route handlers and storage helpers with line numbers.
- Restrict scope to functions that are on the actual current elimination path or materially affect it.
- Distinguish direct code facts from inference.
- When a conclusion is an inference from sequential control flow, state that explicitly.

## 1. Route Entry Points

### 1.1 App routing

Source:
- `src/App.tsx:63-66`

Live elimination routes:
- `/elimination/select` -> `EliminationSelector`
- `/elimination/setup` -> `EliminationSetup`
- `/elimination/:eliminationId` -> `EliminationHome`

No separate elimination route exists for:
- a custom in-game wrapper
- a custom post-game summary
- a standalone bracket-results page

Elimination mode reuses:
- `/game-tracker/:gameId`
- `/post-game/:gameId`

## 2. Selector Layer

### 2.1 `EliminationSelector()`

Source:
- `src/src_figma/app/pages/EliminationSelector.tsx:19-58`

Role:
- top-level elimination slot browser

Internal live functions:

#### `loadEliminations()`

Source:
- `src/src_figma/app/pages/EliminationSelector.tsx:26-36`

Called by:
- mount effect at `:38-40`
- `handleDelete()`

Reads:
- `listEliminations()` from `eliminationManager`

Writes local state:
- `isLoading`
- `eliminations`
- `error`

Failure behavior:
- catches thrown errors and stores a generic message in page state
- does not retry automatically

#### `handleOpen(elimination)`

Source:
- `src/src_figma/app/pages/EliminationSelector.tsx:42-44`

Reads:
- `elimination.eliminationId`

Writes:
- navigation to `/elimination/${eliminationId}`

No validation:
- it does not verify the linked playoff still exists

#### `handleNewElimination()`

Source:
- `src/src_figma/app/pages/EliminationSelector.tsx:46-48`

Writes:
- navigation to `/elimination/setup`

#### `handleDelete(eliminationId)`

Source:
- `src/src_figma/app/pages/EliminationSelector.tsx:50-58`

Calls:
- `deleteElimination(eliminationId)`
- `loadEliminations()`

Durable write:
- deletes only the metadata row from `kbl-app-meta.eliminationList`

Does not delete:
- linked playoff row
- linked series rows
- linked playoff stat rows
- roster snapshots
- mojo/fitness snapshots
- completed games

Implication:
- deletion is metadata-only, not cascade deletion

## 3. Metadata Storage Layer

### 3.1 `createElimination(params)`

Source:
- `src/utils/eliminationManager.ts:49-75`

Called by:
- `EliminationSetup.handleStartPlayoffs()`

Reads:
- no prior elimination data

Writes:
- `kbl-app-meta.eliminationList`

Constructed values:
- `eliminationId = elim-${Date.now()}-${random}`
- `status = 'SETUP'`
- `createdAt = now`
- `lastPlayedAt = now`
- `currentRound = 0`

Failure points:
- IndexedDB open failure via `openMetaDatabase()`
- transaction/write failure

No rollback integration:
- this function is independent; later setup failures do not compensate by deleting the created metadata row

### 3.2 `getElimination(eliminationId)`

Source:
- `src/utils/eliminationManager.ts:80-87`

Called by:
- `EliminationHome` load effect

Reads:
- `kbl-app-meta.eliminationList`

Returns:
- metadata row or `null`

### 3.3 `listEliminations()`

Source:
- `src/utils/eliminationManager.ts:92-99`

Called by:
- `EliminationSelector.loadEliminations()`

Reads:
- all rows from `kbl-app-meta.eliminationList`

Post-read behavior:
- sorts by `lastPlayedAt` descending in memory

### 3.4 `updateElimination(eliminationId, updates)`

Source:
- `src/utils/eliminationManager.ts:104-127`

Called by:
- `EliminationSetup.handleStartPlayoffs()`
- `EliminationHome.loadData()`
- `EliminationHome.persistAwards()`
- `useGameState.completeGameInternal()` playoff branch

Reads:
- existing row from `kbl-app-meta.eliminationList`

Writes:
- merged replacement row back to `eliminationList`

Hard rules:
- preserves original `eliminationId`
- preserves original `createdAt`
- rewrites `lastPlayedAt` to `updates.lastPlayedAt ?? Date.now()`

Throws:
- `Elimination bracket not found: ${eliminationId}` if missing

Important consequence:
- any metadata update implicitly also updates last-played ordering unless the caller explicitly fixes `lastPlayedAt`

### 3.5 `deleteElimination(eliminationId)`

Source:
- `src/utils/eliminationManager.ts:132-140`

Called by:
- `EliminationSelector.handleDelete()`

Writes:
- deletes only the metadata row from `eliminationList`

Explicit code truth:
- comment at `:137` says related bracket/stats deletion is TODO

Unused but relevant sibling utilities:
- `deleteEliminationRosterSnapshots()` exists in `eliminationRosterStorage`
- `deleteMojoFitnessSnapshots()` exists in `mojoFitnessStorage`
- neither is called from deletion flow

## 4. Setup Page Trace

### 4.1 `EliminationSetup()`

Primary source:
- `src/src_figma/app/pages/EliminationSetup.tsx:336-470`

Role:
- collects setup inputs
- constructs elimination metadata
- freezes rosters
- creates playoff config
- creates round-1 series
- starts playoff
- advances metadata to in-progress

### 4.2 Setup effects

#### Auto-seed effect

Source:
- `src/src_figma/app/pages/EliminationSetup.tsx:352-357`

Condition:
- no leagues loaded
- no load error
- no prior auto-seed attempt

Calls:
- `seedSMB4Data(false)`

Failure behavior:
- logs to console only

#### Valid-team-options effect

Source:
- `src/src_figma/app/pages/EliminationSetup.tsx:362-369`

Writes:
- if no valid option, sets `numTeams = 0` and `seriesLengths = []`
- otherwise coerces `numTeams` to the largest valid option if current is invalid

#### Selected-league reset/default effect

Source:
- `src/src_figma/app/pages/EliminationSetup.tsx:370-380`

Writes:
- clears setup state when no league
- otherwise sets:
  - `controlledTeamIds = all league team IDs`
  - `seededTeamIds = first numTeams league teams`
  - `bracketName = ${leagueName} Playoffs`

Important truth:
- seeding default is alphabetical because `leagueTeams` is alphabetically sorted at `:359`

#### Series-length resize effect

Source:
- `src/src_figma/app/pages/EliminationSetup.tsx:381-384`

Writes:
- resizes `seriesLengths` to exactly `Math.log2(numTeams)` entries
- fills missing entries with `7`

### 4.3 `handleMoveSeed(index, direction)`

Source:
- `src/src_figma/app/pages/EliminationSetup.tsx:390-398`

Writes local state:
- swaps adjacent entries inside `seededTeamIds`

No durable write:
- this only affects setup-state until `handleStartPlayoffs()`

### 4.4 `handleStartPlayoffs()`

Source:
- `src/src_figma/app/pages/EliminationSetup.tsx:399-466`

This is the central elimination creation function.

Guard:
- fails if:
  - no selected league
  - `numTeams === 0`
  - `seededTeams.length !== numTeams`

Local writes before durable work:
- `isInitializing = true`
- `initError = null`

Sequential durable steps:

1. `createElimination(...)`
   - metadata row created in `eliminationList`

2. `createRosterSnapshots(eliminationId, teamIds)`
   - frozen team snapshots written to `kbl-tracker.rosterSnapshots`

3. Build `playoffTeams`
   - each team gets:
     - `seed = index + 1`
     - `league = 'Eastern'`
     - `regularSeasonRecord = { wins: 0, losses: 0 }`
     - `eliminated = false`

4. `createPlayoff(...)`
   - playoff row created in `kbl-playoffs.playoffs`

5. Loop `createSeries(...)`
   - round-1 series rows created one by one in `kbl-playoffs.series`

6. `startPlayoff(playoff.id)`
   - playoff row updated to `IN_PROGRESS`, `currentRound = 1`

7. `updateElimination(eliminationId, { status: 'IN_PROGRESS', currentRound: 1 })`
   - metadata row updated

8. navigate to `/elimination/${eliminationId}`

Important setup-time facts:
- `seasonNumber` is hard-coded to `1`
- `seasonId` is `elimination-${eliminationId}`
- `leagues` is `['Eastern']`
- `conferenceChampionship` is `false`
- `homeFieldPattern` is not passed into any durable object
- `controlledTeamIds` is not passed into any durable object

### 4.5 Setup failure ledger

All creation work is sequential `await` calls with no cross-step rollback.

This is an inference from the code structure at `src/src_figma/app/pages/EliminationSetup.tsx:406-461`.

Verified implications:

- if `createElimination()` succeeds and `createRosterSnapshots()` fails:
  - metadata row remains
  - bracket has no snapshots
  - metadata status remains `SETUP`

- if snapshots succeed and `createPlayoff()` fails:
  - metadata row remains
  - snapshots remain
  - no playoff row exists

- if playoff creation succeeds and one of the `createSeries()` calls fails:
  - metadata row remains
  - snapshots remain
  - playoff row remains
  - some subset of round-1 series may exist

- if `startPlayoff()` fails:
  - playoff row remains at `NOT_STARTED`
  - round-1 series remain

- if final `updateElimination()` fails:
  - playoff row may already be `IN_PROGRESS`
  - series may already exist
  - metadata may still say `SETUP`

Success-path local-state nuance:
- `isInitializing` is only reset in the catch path
- on success the page navigates away instead of locally clearing it

## 5. Snapshot Storage Trace

### 5.1 Backing stores

Sources:
- `src/utils/trackerDb.ts:140-153`

Elimination-specific stores inside `kbl-tracker`:
- `rosterSnapshots`
  - keyPath `key`
  - indexes: `eliminationId`, `teamId`
- `mojoFitnessSnapshots`
  - keyPath `[eliminationId, playerId]`
  - index: `eliminationId`

### 5.2 `createRosterSnapshots(eliminationId, teamIds)`

Source:
- `src/utils/eliminationRosterStorage.ts:199-229`

Called by:
- setup only

Reads:
- `getTeam(teamId)`
- `getTeamRoster(teamId)`
- `getPlayersByTeam(teamId)`

Writes:
- one snapshot row per team to `rosterSnapshots`

Snapshot contents:
- frozen `players`
- `lineup = roster.lineupVsRHP`
- `startingRotation = roster.startingRotation`

Throws:
- `League Builder team not found for snapshot: ${teamId}`
- `League Builder roster not found for snapshot: ${teamId}`
- any IndexedDB write failure

### 5.3 `getEliminationRosterSnapshot(eliminationId, teamId)`

Source:
- `src/utils/eliminationRosterStorage.ts:234-244`

Called by:
- `EliminationTeamHub.loadSnapshot()`
- `buildEliminationGameTrackerRoster()`
- `updateEliminationRosterSnapshot()`

Reads:
- exact composite key `elim-roster-${eliminationId}-${teamId}`

### 5.4 `getAllEliminationRosterSnapshots(eliminationId)`

Source:
- `src/utils/eliminationRosterStorage.ts:249-259`

Called by:
- `EliminationTeamHub.loadSnapshotIndex()`

Reads:
- all snapshots from `rosterSnapshots` via `eliminationId` index

Post-read behavior:
- sorts by `teamName`

### 5.5 `updateEliminationRosterSnapshot(eliminationId, teamId, updates)`

Source:
- `src/utils/eliminationRosterStorage.ts:264-286`

Called by:
- `EliminationTeamHub.persistUpdates()`

Reads:
- current snapshot via `getEliminationRosterSnapshot()`

Writes:
- replacement row to `rosterSnapshots`

Accepts updates for:
- `lineup`
- `startingRotation`

Throws:
- `Roster snapshot not found: ${eliminationId}/${teamId}`

Notable behavior:
- does not change `snapshotAt`
- does not re-normalize lineup or rotation before saving

### 5.6 `getNormalizedEliminationLineup(snapshot)`

Source:
- `src/utils/eliminationRosterStorage.ts:48-86`

Called by:
- `EliminationTeamHub` render path
- `buildEliminationGameTrackerRoster()`

Reads:
- `snapshot.players`
- `snapshot.lineup`

Produces:
- up to 9 non-pitcher lineup slots

Hard rules:
- removes lineup entries whose `playerId` no longer points to a player in snapshot
- removes lineup entries whose player is a pitcher
- de-duplicates by `playerId`
- preserves existing `fieldingPosition`
- fills missing slots from other non-pitchers
- fill-in position selection order:
  - unused primary position
  - unused secondary position
  - first unused field position
  - `DH`

Notably does not do:
- enforce unique fielding positions for already-saved lineup slots
- validate lineup size beyond “up to 9”

### 5.7 `getNormalizedEliminationRotation(snapshot)`

Source:
- `src/utils/eliminationRosterStorage.ts:88-93`

Called by:
- `buildEliminationGameTrackerRoster()`

Produces:
- existing valid pitcher IDs from `startingRotation`
- plus all remaining pitcher IDs not already listed

Important truth:
- launch-time rotation is more inclusive than Team Hub’s displayed `startingRotation`

### 5.8 `buildEliminationGameTrackerRoster(eliminationId, teamId)`

Source:
- `src/utils/eliminationRosterStorage.ts:288-331`

Called by:
- `EliminationHome.handlePlayGame()`

Reads:
- one elimination snapshot
- normalized lineup
- normalized rotation

Produces:
- `players`
  - normalized starting lineup first
  - then non-lineup non-pitcher bench players
- `pitchers`
  - normalized rotation in order

Important conversion details:
- player objects preserve frozen player ratings/traits/age
- lineup players keep `battingOrder` and assigned position
- bench players are converted without batting order
- pitcher index `0` is `isActive = true`
- pitcher `isStarter = index === 0 || player.primaryPosition === 'SP'`

That means:
- multiple pitchers can be marked `isStarter: true` if their primary position is `SP`
- only the first pitcher is marked active

Throws:
- `Roster snapshot not found: ${eliminationId}/${teamId}`

### 5.9 `deleteEliminationRosterSnapshots(eliminationId)`

Source:
- `src/utils/eliminationRosterStorage.ts:336-348`

Called by live elimination path:
- nobody

Status:
- available utility, not wired

## 6. Team Hub Trace

### 6.1 `EliminationTeamHub()`

Source:
- `src/src_figma/app/components/EliminationTeamHub.tsx:39-220`

Role:
- mutation surface for frozen snapshots

### 6.2 `loadSnapshotIndex()`

Source:
- `src/src_figma/app/components/EliminationTeamHub.tsx:50-68`

Called by:
- effect at `:47-74`

Reads:
- `getAllEliminationRosterSnapshots(eliminationId)`

Writes local state:
- `availableSnapshotIds`
- `selectedTeamId`
- `error`

Behavior:
- if currently selected team has no snapshot, it switches to the first snapshot team
- if nothing selected yet and `teams[0]` exists, it selects `teams[0].teamId`

### 6.3 `loadSnapshot()`

Source:
- `src/src_figma/app/components/EliminationTeamHub.tsx:81-105`

Reads:
- `getEliminationRosterSnapshot(eliminationId, selectedTeamId)`

Writes local state:
- `isLoading`
- `snapshot`
- `error`

Throws internally on missing snapshot:
- `Roster snapshot missing for team: ${selectedTeamId}`

### 6.4 `persistUpdates(teamId, updates)`

Source:
- `src/src_figma/app/components/EliminationTeamHub.tsx:148-171`

Calls:
- `updateEliminationRosterSnapshot(eliminationId, teamId, updates)`

Writes local state:
- `isSaving`
- `error`
- local `snapshot` mirror after successful save

Behavior:
- optimistic only after DB success, not before
- sorts lineup locally when lineup changes

### 6.5 `handleMoveLineup(index, direction)`

Source:
- `src/src_figma/app/components/EliminationTeamHub.tsx:173-184`

Behavior:
- swaps adjacent lineup slots
- rewrites `battingOrder` sequentially
- persists whole lineup array

### 6.6 `handlePositionChange(index, fieldingPosition)`

Source:
- `src/src_figma/app/components/EliminationTeamHub.tsx:186-194`

Behavior:
- replaces the selected slot’s `fieldingPosition`
- persists whole lineup array

No validation:
- does not prevent duplicate fielding positions

### 6.7 `handleLineupPlayerChange(index, playerId)`

Source:
- `src/src_figma/app/components/EliminationTeamHub.tsx:196-213`

Behavior:
- if target player already exists in lineup, swaps player IDs between slots
- otherwise directly replaces the target slot’s `playerId`

No additional adjustments:
- preserves existing batting orders
- preserves existing fielding positions

### 6.8 `handlePromoteStarter(playerId)`

Source:
- `src/src_figma/app/components/EliminationTeamHub.tsx:215-220`

Behavior:
- moves selected pitcher to front of `startingRotation`
- keeps rest in current relative order

## 7. Elimination Home Trace

### 7.1 `EliminationHome()`

Primary source:
- `src/src_figma/app/pages/EliminationHome.tsx:105-290`

Role:
- runtime bracket hub

### 7.2 `loadData()`

Source:
- `src/src_figma/app/pages/EliminationHome.tsx:128-194`

Called by:
- effect at `:117-200`

Read sequence:

1. `getElimination(currentEliminationId)`
2. `getAllPlayoffs()`
3. in-memory search for matching playoff where:
   - `sourceType === 'elimination'`
   - `eliminationId === currentEliminationId`
4. `getSeriesByPlayoff(loadedPlayoff.id)`
5. for history:
   - scan every completed elimination-source playoff
   - `getSeriesByPlayoff(playoff.id)` for each

Write sequence:

1. `updateElimination(currentEliminationId, { lastPlayedAt: Date.now() })`
2. local state:
   - `metadata`
   - `playoffConfig`
   - sorted `seriesList`
   - sorted `historyEntries`
   - `selectedSeriesId = loadedSeries[0]?.id ?? null`

Failure triggers:
- no `eliminationId` route param
- metadata row missing
- linked playoff row missing
- any dependent read failure
- `updateElimination()` failure during last-played refresh

Important consequence:
- even if all reads succeed, a failed `lastPlayedAt` write still makes the page load fail because it is inside the same `try`

### 7.3 Awards persistence effect

Source:
- `src/src_figma/app/pages/EliminationHome.tsx:202-234`

Guard conditions:
- requires `eliminationId`
- requires `metadata`
- requires `playoffConfig`
- requires `metadata.status === 'COMPLETED'`
- requires `metadata.awards === undefined`

Calls:
- `computeEliminationAwards(playoffId)`
- `updateElimination(eliminationId, { awards })`

Writes local state:
- updates in-memory metadata copy with awards

Failure behavior:
- logs only, no user-facing error state

### 7.4 `handlePlayGame(series)`

Source:
- `src/src_figma/app/pages/EliminationHome.tsx:249-290`

Call sequence:

1. `buildSeriesCardState(eliminationId, series)`
2. `buildEliminationGameTrackerRoster(eliminationId, awayTeam.teamId)`
3. `buildEliminationGameTrackerRoster(eliminationId, homeTeam.teamId)`
4. `getTeam(awayTeam.teamId)`
5. `getTeam(homeTeam.teamId)`
6. navigate to `/game-tracker/${gameId}` with route state

Mixed frozen/live data truth:
- roster/player payloads come from frozen elimination snapshots
- team colors and stadium name come from live `getTeam()` records

Implication:
- roster composition is frozen at bracket creation
- team branding and stadium can drift if the underlying team record changes later

Failure behavior:
- any failure sets page `error` to “Failed to load elimination rosters for game start.”

## 8. Playoff Storage Trace

### 8.1 `createPlayoff(config)`

Source:
- `src/utils/playoffStorage.ts:261-296`

Called by:
- `EliminationSetup.handleStartPlayoffs()`

Reads:
- existing playoff rows with same `seasonNumber` through index cursor

Writes:
- deletes any existing playoff row with:
  - same `seasonNumber`
  - same `sourceType` (defaulting absent value to `'franchise'`)
- inserts new playoff row

Critical limits:
- this function only touches the `playoffs` store
- it does not delete related rows from:
  - `series`
  - `playoffGames`
  - `playoffStats`

Implication:
- creating a replacement elimination playoff can orphan old series and playoff-stat rows for the deleted playoff ID

### 8.2 `startPlayoff(playoffId)`

Source:
- `src/utils/playoffStorage.ts:382-388`

Called by:
- setup only

Writes:
- `status = 'IN_PROGRESS'`
- `startedAt = Date.now()`
- `currentRound = 1`

### 8.3 `createSeries(series)`

Source:
- `src/utils/playoffStorage.ts:405-422`

Called by:
- setup
- `createNextRoundSeries()`

Writes:
- one series row to `kbl-playoffs.series`

ID format:
- `series-${playoffId}-r${round}-${Date.now()}-${seriesCounter++}`

### 8.4 `recordSeriesGame(seriesId, game)`

Source:
- `src/utils/playoffStorage.ts:476-531`

Called by:
- `useGameState.completeGameInternal()`

Reads:
- existing series row

Writes:
- merged `games[]`
- recalculated `higherSeedWins`
- recalculated `lowerSeedWins`
- derived `status`
- derived `winner`
- optional `completedAt`

Behavior:
- replaces existing `gameNumber` entry if found
- otherwise appends
- if no side has clinched, forces `status = 'IN_PROGRESS'`

That means:
- once the first completed game is recorded, a setup-created `PENDING` series becomes `IN_PROGRESS`

Throws:
- `Series ${seriesId} not found`

### 8.5 `createNextRoundSeries(playoffId, completedRound, playoff)`

Source:
- `src/utils/playoffStorage.ts:617-718`

Called by:
- `useGameState.completeGameInternal()`

Reads:
- completed series from previous round via `getSeriesByRound()`
- team conference mapping from `playoff.teams`

Non-final-round behavior:
- for each of `Eastern` and `Western`
- take winners in that league
- sort by seed ascending
- pair highest vs lowest remaining seed
- create new series rows with `status = 'IN_PROGRESS'`

Final-round behavior:
- requires exactly one Eastern winner and one Western winner
- higher seed gets `higherSeed` slot
- creates one championship series with `status = 'IN_PROGRESS'`

Throws:
- `Cannot advance past final round (${playoff.rounds})`
- `Expected 1 winner per conference for championship, got Eastern: X, Western: Y`

This is the direct source of the current elimination-mode final-round failure.

### 8.6 `aggregateGameToPlayoffStats(playoffId, gameState)`

Source:
- `src/utils/playoffStorage.ts:759-940`

Called by:
- `useGameState.completeGameInternal()`

Reads:
- `gameState.playerStats`
- `gameState.pitcherGameStats`
- existing playoff stat rows for `playoffId`

Writes:
- one upsert per player ID into `playoffStats`

Computation model:
- uses game-level side-and-name player IDs coming from `PersistedGameState`
- computes derived `avg`, `obp`, `slg`, `ops`, `era`, `whip`

No qualifier logic:
- aggregation writes all players regardless of sample size

### 8.7 `playoffGames` store status

Source:
- `src/utils/playoffStorage.ts:19`

Current elimination-path truth:
- the store exists in schema
- the live elimination path does not write to it
- series rows keep their own embedded `games[]`

## 9. GameTracker Trace For Elimination Launches

### 9.1 Elimination route-state ingestion

Sources:
- `src/src_figma/app/pages/GameTracker.tsx:145-156`
- `src/src_figma/app/pages/GameTracker.tsx:228-238`

Behavior:
- `leagueId` defaults to `'sml'`
- manager IDs default from team IDs
- records default to `'0-0'`
- `userTeamSide` defaults to `'home'`
- `isPlayoffGame` is true for `gameMode === 'elimination'`
- playoff context refs are set only if `playoffSeriesId` exists

### 9.2 `initializeOrLoadGame()` elimination-relevant branch

Source:
- `src/src_figma/app/pages/GameTracker.tsx:788-897`

Read path:
- attempt `loadExistingGame()` first

If no existing game:

1. build `awayLineup` from `awayTeamPlayers`
2. build `homeLineup` from `homeTeamPlayers`
3. build `awayBench`
4. build `homeBench`
5. call `initializeGame(...)`

Critical identity rewrite:
- lineup player IDs become `away-${normalized-name}` / `home-${normalized-name}`
- bench player IDs use same pattern
- starting pitcher IDs use same pattern

Critical season mismatch:
- `initializeGame()` receives:
  - franchise path: `${franchiseId}-season-${seasonNumber}`
  - else: `'season-1'`
- elimination launch route state `seasonId` is not used here

### 9.3 `registerPlayersWithSnapshots()`

Source:
- `src/src_figma/app/pages/GameTracker.tsx:901-1010`

Called by:
- post-init effect

Elimination-specific behavior:

1. if elimination mode, load `loadMojoFitnessSnapshots(eliminationId)`
2. map snapshots by `playerId`
3. register all away position players
4. register all home position players
5. register active away pitcher
6. register active home pitcher

Critical limit:
- non-active bullpen pitchers are not registered here

Identity rule:
- registration keys use the same side-and-name IDs as game initialization

### 9.4 Fame initialization

Sources:
- `src/src_figma/app/pages/GameTracker.tsx:296-300`
- `src/src_figma/app/hooks/useFameTracking.ts:60-79`
- `src/engines/fameEngine.ts:289-338`

Behavior:
- elimination game passes only:
  - `gameId`
  - `isPlayoffs: true`

Not passed:
- `playoffRound`
- `isEliminationGame`
- `isClinchGame`

Result:
- fame playoff multiplier defaults to `wild_card = 1.25`
- elimination/clinch bonuses are never activated by current GameTracker elimination launches

### 9.5 mWAR initialization

Source:
- `src/src_figma/app/pages/GameTracker.tsx:321-329`

Behavior:
- initializes only `homeManagerId`
- initializes season scope as `'season-1'`

Not elimination-specific:
- no bracket-scoped season ID
- no away-manager initialization

### 9.6 End-game side effects before hook completion

Source:
- `src/src_figma/app/pages/GameTracker.tsx:3191-3369`

Non-exhibition side effects that therefore run for elimination:
- fan morale update for both teams
- narrative generation
- mWAR persistence/aggregation

Elimination-specific side effect after hook completion:
- `saveMojoFitnessSnapshots(eliminationId, playerStateHook.getAllPlayers())`

Post-hook navigation:
- `/post-game/${gameId}` with `gameMode` and `eliminationId`

## 10. `useGameState` Trace For Elimination Launches

### 10.1 `initializeGame(config)`

Source:
- `src/src_figma/hooks/useGameState.ts:1334-1493`

Called by:
- `GameTracker.initializeOrLoadGame()`

Reads config:
- season, franchise, league, records, total innings
- lineups
- benches
- starting pitchers

Writes:
- clears `currentGame`
- resets transient hook state
- stores season/franchise/league/record refs
- stores total innings ref
- seeds lineup-state refs
- writes game header
- seeds batter stats for lineup players only
- seeds pitcher stats for the two starting pitchers only
- seeds runner tracker with home starter
- sets game state to top 1

Important elimination implications:
- because GameTracker already rewrote IDs, this hook never sees stable League Builder IDs
- because lineups exclude pitchers, pitcher batting is not part of elimination initialization

### 10.2 `completeGameInternal()` playoff branch

Source:
- `src/src_figma/hooks/useGameState.ts:4517-4608`

Called by:
- GameTracker end-game path through `hookEndGame()`

Order:

1. if not already aggregated:
   - `processCompletedGame(persistedState, aggregationOptions)`
   - `markGameAggregated(gameId)`

2. if playoff context exists:
   - `recordSeriesGame(...)`
   - if series completed:
     - update losing team elimination flags inside playoff teams
     - if whole round complete:
       - final round: `completePlayoff()` and maybe `updateElimination(...COMPLETED...)`
       - otherwise: `createNextRoundSeries()`, `updatePlayoff(currentRound+1)`, maybe `updateElimination(currentRound+1)`

3. if not already aggregated and playoff ID exists:
   - `aggregateGameToPlayoffStats(playoffId, persistedState)`

Failure model:
- playoff-series update block is wrapped in a catch
- playoff-stats aggregation block is wrapped in a separate catch
- failures there are logged and do not abort the overall end-game flow

Important consequence:
- an elimination game can archive/aggregate successfully even if bracket advancement fails

### 10.3 `setPlayoffContext(seriesId, gameNumber, playoffId)`

Source:
- `src/src_figma/hooks/useGameState.ts:4924-4930`

Called by:
- `GameTracker` route-state effect

Writes refs:
- `playoffSeriesIdRef`
- `playoffGameNumberRef`
- `playoffIdRef`

This is the sole hookup that makes elimination games participate in series recording and playoff stat aggregation.

## 11. Aggregation Trace

### 11.1 `processCompletedGame(gameState, options)`

Source:
- `src/utils/processCompletedGame.ts:34-52`

Called by:
- `useGameState.completeGameInternal()`

Writes:
- season aggregation via `aggregateGameToSeason(...)`
- completed-game archive via `archiveCompletedGame(...)`

### 11.2 `aggregateGameToSeason(gameState, options)`

Source:
- `src/utils/seasonAggregator.ts:64-136`

Writes:
- season metadata row
- season batting rows
- season pitching rows
- season fielding rows
- fame totals in season batting/pitching rows
- milestone side effects

Important elimination implication:
- this path is generic; elimination games write into the same season/career stores as any other mode

### 11.3 `aggregateGameWithMilestones(...)`

Source:
- `src/utils/milestoneAggregator.ts:703-901`

Elimination-relevant behavior:
- reads the game’s player and pitcher IDs exactly as stored in `PersistedGameState`
- runs season milestone checks
- runs career batting/pitching aggregation
- runs WAR-component milestone checks against career data

Important truth:
- because GameTracker IDs are side-and-name based, milestone and career aggregation is also side-and-name based for elimination games

### 11.4 `aggregateGameToCareerBatting(...)` and `aggregateGameToCareerPitching(...)`

Source:
- `src/utils/milestoneAggregator.ts:79-170`

Writes:
- `playerCareerBatting`
- `playerCareerPitching`

These functions aggregate counting stats only in this path.

They do not compute:
- fresh bWAR
- fresh rWAR
- fresh fWAR
- fresh pWAR

## 12. Awards Trace

### 12.1 `computeEliminationAwards(playoffId)`

Source:
- `src/utils/eliminationAwards.ts:29-95`

Called by:
- `EliminationHome` awards persistence effect

Reads:
- `getPlayoffStats(playoffId)`

Computes:
- `Postseason MVP`
- `Best Pitcher`
- `Best Runner`
- `Clutch Performer`

Writes:
- none directly

Stored by caller into:
- `kbl-app-meta.eliminationList.awards`

Dependency truth:
- awards are only as complete as `playoffStats`
- any home/away identity split in playoff stats carries straight into award selection

## 13. Post-Game Return Trace

### 13.1 `PostGameSummary` elimination branch

Sources:
- `src/src_figma/app/pages/PostGameSummary.tsx:183-198`
- `src/src_figma/app/pages/PostGameSummary.tsx:703-710`

Behavior:
- reads `gameMode` and `eliminationId` from route state
- on `CONTINUE`, if `gameMode === 'elimination'` and `eliminationId` exists, navigates back to `/elimination/${eliminationId}`

No bracket mutation occurs here.

## 14. Tighter Conclusions

These are the tightest function-trace conclusions from the current code:

1. Elimination setup is a sequential multi-store creation pipeline with no rollback. Partial creation states are possible and durable.

2. New elimination creation replaces only the old playoff row for `seasonNumber: 1` / `sourceType: 'elimination'`. It does not clean related old series or playoff stats.

3. Elimination metadata deletion is metadata-only. Snapshot and playoff cleanup utilities exist but are not wired.

4. Frozen roster data and live team branding data are mixed at game launch: players come from snapshots, colors/stadium come from current team records.

5. The final-round creation failure is not speculative. It comes directly from `createNextRoundSeries()` requiring one Eastern and one Western winner while setup writes every elimination team as Eastern.

6. Elimination games enter the generic GameTracker engine with rewritten side-and-name player IDs. That rewrite is the root cause for split playoff stats, split career stats, and side-dependent mojo/fitness carryover.

7. Elimination games do participate in season aggregation, career aggregation, milestone detection, playoff stat aggregation, fan-morale side effects, and mWAR side effects, but those systems are not consistently elimination-scoped.

8. The elimination awards system is real, but it sits behind a completion gate that the current supported bracket structures cannot reliably reach.
