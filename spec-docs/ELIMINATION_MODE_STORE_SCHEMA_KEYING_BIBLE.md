# Elimination Mode Store Schema And Keying Bible

## Scope

This file lists the durable stores actually touched by the traced Elimination path, grouped by database.

For each store:

- database name
- key path
- indexes relevant to elimination
- who writes it on the elimination path
- who reads it on the elimination path
- important keying/identity consequences

This is intentionally scoped. Unrelated repo stores are omitted.

## Database inventory

The live elimination path touches five IndexedDB databases:

1. `kbl-league-builder`
2. `kbl-app-meta`
3. `kbl-playoffs`
4. `kbl-tracker`
5. `kbl-event-log`

It also has an indirect read/display seam with:

6. `kbl-museum`

## 1. `kbl-league-builder`

### Store: `leagueTemplates`

- key path: `id`
- relevant fields for elimination:
  - `id`
  - `name`
  - `teamIds`
  - conference/division structure
- elimination writers:
  - none in traced elimination path
- elimination readers:
  - `useLeagueBuilderData()` during setup
- role:
  - source of league selection and eligible team membership

### Store: `globalTeams`

- key path: `id`
- indexes:
  - `name`
  - `abbreviation`
- relevant fields for elimination:
  - `id`
  - `name`
  - `colors`
  - `stadium`
- elimination writers:
  - none in traced elimination path
- elimination readers:
  - setup team filtering
  - snapshot creation via `getTeam(teamId)`
  - launch-time branding/stadium via `getTeam(teamId)`
- keying consequence:
  - team ID continuity is stable end-to-end

### Store: `globalPlayers`

- key path: `id`
- indexes:
  - `lastName`
  - `currentTeamId`
  - `primaryPosition`
  - `overallGrade`
- relevant fields for elimination:
  - `id`
  - name fields
  - ratings
  - `currentTeamId`
  - handedness / traits / chemistry / etc.
- elimination writers:
  - none in traced elimination path
- elimination readers:
  - snapshot creation via `getPlayersByTeam(teamId)`
- keying consequence:
  - stable Mode 1 player identity originates here

### Store: `teamRosters`

- key path: `teamId`
- no explicit indexes
- relevant fields:
  - `lineupVsRHP`
  - `lineupVsLHP`
  - `startingRotation`
  - bullpen/depth chart orders
- elimination writers:
  - none in traced elimination path
- elimination readers:
  - snapshot creation via `getTeamRoster(teamId)`
- keying consequence:
  - elimination freezes only a subset of this store’s content

## 2. `kbl-app-meta`

### Store: `eliminationList`

- key path: `eliminationId`
- no indexes defined in `franchiseManager.ts`
- row type:
  - `EliminationMetadata`
- relevant fields:
  - `eliminationId`
  - `name`
  - `leagueId`
  - `leagueName`
  - `status`
  - `teamsCount`
  - `currentRound`
  - optional `champion`
  - optional `awards`
  - `createdAt`
  - `lastPlayedAt`
- elimination writers:
  - `createElimination()`
  - `updateElimination()` from setup, page load, round advancement, bracket completion, awards caching
- elimination readers:
  - `EliminationHome`
  - elimination selection/list views
- keying consequence:
  - this is metadata only, not full bracket structure

## 3. `kbl-playoffs`

### Store: `playoffs`

- key path: `id`
- indexes:
  - `seasonNumber`
  - `status`
- row type:
  - `PlayoffConfig`
- elimination writers:
  - `createPlayoff()`
  - `startPlayoff()`
  - `updatePlayoff()`
  - `completePlayoff()`
- elimination readers:
  - `EliminationHome`
  - `useGameState.endGame()` round advancement
  - history tab
- important fields for elimination:
  - `seasonId = elimination-{eliminationId}`
  - `sourceType = 'elimination'`
  - `eliminationId`
  - `teams`
  - `currentRound`
  - `champion`
- keying consequence:
  - elimination and franchise playoffs can coexist at same `seasonNumber`

### Store: `series`

- key path: `id`
- indexes:
  - `playoffId`
  - `round`
  - `status`
- row type:
  - `PlayoffSeries`
- elimination writers:
  - setup `createSeries()` for round 1
  - `recordSeriesGame()`
  - `createNextRoundSeries()`
- elimination readers:
  - `EliminationHome`
  - round advancement logic
  - history derivation
- keying consequence:
  - bracket runtime truth lives here, not in elimination metadata

### Store: `playoffGames`

- key path: `id`
- indexes:
  - `playoffId`
  - `seriesId`
- elimination writers/readers in traced live path:
  - none found
- status:
  - store exists but is not part of the live elimination write path I traced

### Store: `playoffStats`

- key path: `id`
- indexes:
  - `playoffId`
  - `playerId`
  - `teamId`
- row type:
  - `PlayoffPlayerStats`
- elimination writers:
  - `aggregateGameToPlayoffStats(playoffId, persistedState)`
- elimination readers:
  - leaders tab via `getPlayoffLeaders()`
  - awards via `getPlayoffStats()`
- keying:
  - `id = {playoffId}-{playerId}`
  - `playerId = rewritten gameplay player ID`
  - `teamId = original team ID`
- keying consequence:
  - playoff stat reference is team-stable but player-ID-fragmented

## 4. `kbl-tracker`

### Store: `rosterSnapshots`

- key path: `key`
- indexes:
  - `eliminationId`
  - `teamId`
- row type:
  - `EliminationRosterSnapshot`
- elimination writers:
  - `createRosterSnapshots()`
  - `updateEliminationRosterSnapshot()`
- elimination readers:
  - `EliminationTeamHub`
  - `buildEliminationGameTrackerRoster()`
- keying:
  - `key = elim-roster-{eliminationId}-{teamId}`
- keying consequence:
  - this is the canonical frozen roster store after setup

### Store: `mojoFitnessSnapshots`

- key path: `[eliminationId, playerId]`
- indexes:
  - `eliminationId`
- row type:
  - `MojoFitnessSnapshot`
- elimination writers:
  - `saveMojoFitnessSnapshots(eliminationId, players)`
- elimination readers:
  - `loadMojoFitnessSnapshots(eliminationId)` during later GameTracker setup
- keying consequence:
  - `playerId` here is rewritten gameplay ID, not original LB player ID

### Store: `currentGame`

- key path: `id`
- used value:
  - always `'current'`
- row type:
  - `PersistedGameState`
- elimination writers:
  - `saveCurrentGame()` from `useGameState` autosave
  - `clearCurrentGame()` at fresh initialize
- elimination readers:
  - `loadCurrentGame()` at game load/refresh
- keying consequence:
  - only one current game snapshot row at a time

### Store: `completedGames`

- key path: `gameId`
- indexes:
  - `date`
  - `seasonId`
- row type:
  - `CompletedGameRecord`
- elimination writers:
  - `archiveCompletedGame(...)`
- elimination readers:
  - post-game summary and any completed-game consumers
- keying consequence:
  - elimination archives preserve `seasonId = elimination-{eliminationId}` when passed at end game

### Store: `playerSeasonBatting`

- key path: `[seasonId, playerId]`
- indexes:
  - `playerId`
  - `seasonId`
  - `teamId`
- elimination writers:
  - season aggregation
- elimination readers:
  - season-level consumers
- keying consequence:
  - elimination season stats fragment by rewritten player ID

### Store: `playerSeasonPitching`

- key path: `[seasonId, playerId]`
- indexes:
  - `playerId`
  - `seasonId`
  - `teamId`
- elimination writers/readers:
  - same pattern as batting

### Store: `playerSeasonFielding`

- key path: `[seasonId, playerId]`
- indexes:
  - `playerId`
  - `seasonId`
- elimination writers/readers:
  - same pattern as batting

### Store: `seasonMetadata`

- key path: `seasonId`
- indexes:
  - `status`
- elimination writers:
  - created/updated indirectly by season aggregation
- elimination readers:
  - season consumers
- keying consequence:
  - elimination season exists as its own season namespace

### Store: `playerCareerBatting`

- key path: `playerId`
- indexes:
  - `teamId`
  - `homeRuns`
  - `hits`
- elimination writers:
  - `aggregateGameToCareerBatting(...)`
- elimination readers:
  - museum pipeline
  - milestone logic
  - any career consumers
- keying consequence:
  - career identity is rewritten-player-ID keyed

### Store: `playerCareerPitching`

- key path: `playerId`
- indexes:
  - `teamId`
  - `wins`
  - `strikeouts`
- elimination writers/readers:
  - same pattern as career batting

### Store: `playerCareerFielding`

- key path: `playerId`
- indexes:
  - `teamId`
- elimination writers/readers:
  - fielding career accumulation path

### Store: `careerMilestones`

- key path: `id`
- indexes:
  - `playerId`
  - `milestoneType`
  - `achievedDate`
- elimination writers:
  - career milestone recording via milestone aggregator
- elimination readers:
  - milestone consumers

## 5. `kbl-event-log`

### Store: `gameHeaders`

- key path: `gameId`
- indexes:
  - `seasonId`
  - `date`
  - `aggregated`
  - `seasonId_aggregated`
- elimination writers:
  - `createGameHeader(...)`
  - `markGameAggregated(gameId)`
  - other header updates through event log paths
- elimination readers:
  - game load
  - end-game idempotency check
- keying consequence:
  - one header per game

### Store: `atBatEvents`

- key path: `eventId`
- indexes:
  - `gameId`
  - `[gameId, eventIndex]`
  - `batterId`
  - `pitcherId`
- elimination writers:
  - at-bat record path from shared GameTracker/useGameState flow
- elimination readers:
  - refresh reconstruction path
- keying consequence:
  - batter/pitcher IDs stored here follow rewritten gameplay identity

### Store: `pitchingAppearances`

- key path: `appearanceId`
- indexes:
  - `gameId`
  - `pitcherId`
- elimination writers/readers:
  - shared inherited-runner tracking path

### Store: `fieldingEvents`

- key path: `fieldingEventId`
- indexes:
  - `gameId`
  - `playerId`
  - `atBatEventId`
- elimination writers:
  - shared fielding-event record path
- elimination readers:
  - end-game fielding tally
  - refresh reconstruction helpers
- keying consequence:
  - stored IDs can be position-based and are later resolved back to current lineup player IDs

### Store: `betweenPlayEvents`

- key path: `eventId`
- indexes:
  - `gameId`
  - `type`
- intended role:
  - stolen bases, wild pitches, substitutions, mojo/fitness changes, etc.
- live elimination writers/readers:
  - incomplete in current traced path
- keying consequence:
  - store exists, but should not be treated as a complete canonical ledger today

## 6. `kbl-museum`

### Store: `allTimeLeaders`

- key path: `id`
- indexes:
  - `playerId`
  - `category`
  - `war`
- elimination writers:
  - no direct write path found
- indirect writers:
  - `populateMuseumLeaders()` when museum leaders are empty
- elimination readers:
  - museum/allmanac UI
- keying consequence:
  - inherits `playerId` from career storage

### Store: `seasonStandings`

- key path: `[year, teamId]`
- indexes:
  - `year`
  - `teamId`
- direct elimination writes:
  - none found

### Store: `awardWinners`

- key path: `[year, awardType]`
- indexes:
  - `year`
  - `playerId`
  - `awardType`
- direct elimination writes:
  - none found

### Other museum stores

- `championships`
- `teamRecords`
- `hallOfFame`
- `records`
- `moments`
- `retiredJerseys`
- `stadiums`

Direct elimination writes to these were not found in the traced live path.

## Cross-database keying consequences

### Team keying

Stable:

- League Builder team ID becomes elimination metadata/playoff/team stat `teamId`

### Player keying

Split:

- before GameTracker initialize: stable LB `player.id`
- after GameTracker initialize: rewritten side/name `playerId`

### Season namespace

Elimination uses:

- `seasonId = elimination-{eliminationId}`

for season aggregation and completed-game archiving at end game.

### Bracket namespace

Elimination uses:

- `playoff.sourceType = 'elimination'`
- `playoff.eliminationId = eliminationId`

### Main schema risk

There is no dedicated durable crosswalk store linking:

- original LB `player.id`
- rewritten gameplay/stat `playerId`

That absence is the root cause of player-level stat-reference fragility.

## Bottom line

The Elimination path is spread across multiple DBs with clear specialization:

- League Builder: source input
- App meta: elimination slot metadata
- Playoff DB: bracket structure and playoff stats
- Tracker DB: snapshots, current game, season/career/completed-game, mojo/fitness carryover
- Event log DB: at-bat/header/fielding detail
- Museum DB: separate historical display layer

The schema is coherent at the team and bracket level. The weak point is player key continuity across the transition from snapshot/launch data into gameplay/stat stores.

