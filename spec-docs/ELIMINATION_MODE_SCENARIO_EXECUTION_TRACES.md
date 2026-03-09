# Elimination Mode Scenario Execution Traces

## Scope

This file traces the current live execution flow for the most important Elimination scenarios:

1. Create bracket
2. Edit lineup/rotation in Team Hub
3. Launch game
4. Persist and recover an in-progress game
5. Finish game
6. Advance round
7. Finish bracket
8. Open leaders tab
9. Open awards tab
10. Open history tab

The goal is runtime truth: exact reads, writes, and ownership transitions.

## Notation

- `READ` means a durable or live read.
- `WRITE` means a durable store write.
- `STATE` means in-memory React/hook state.
- `INFERENCE` means control-flow inference rather than explicit comment/spec language.

## Scenario 1: Create an elimination bracket

### Entry point

- UI: `EliminationSetup.tsx`
- action: `handleStartPlayoffs()`

### Inputs read

`READ`

- selected League Builder league from `leagues`
- filtered League Builder teams from `teams`
- current setup state:
  - `selectedLeagueId`
  - `numTeams`
  - `seriesLengths`
  - `inningsPerGame`
  - `useDH`
  - `seededTeamIds`
  - `bracketName`

### Precondition checks

`STATE`

- if no selected league, `numTeams === 0`, or `seededTeams.length !== numTeams`, setup aborts with `initError`

### Durable operations

#### Step 1: create elimination metadata

`WRITE`

- store: `kbl-app-meta / eliminationList`
- function: `createElimination({ name, leagueId, leagueName, teamsCount })`

Result:

- receives `eliminationId`

#### Step 2: freeze roster snapshots

`READ`

- `getTeam(teamId)`
- `getTeamRoster(teamId)`
- `getPlayersByTeam(teamId)`

`WRITE`

- store: `kbl-tracker / rosterSnapshots`
- function: `createRosterSnapshots(eliminationId, teamIds)`

Snapshot content:

- team metadata summary
- frozen `players`
- frozen `lineupVsRHP`
- frozen `startingRotation`

#### Step 3: create playoff config

`WRITE`

- store: `kbl-playoffs / playoffs`
- function: `createPlayoff(...)`

Important payload values:

- `seasonNumber: 1`
- `seasonId: elimination-{eliminationId}`
- `sourceType: 'elimination'`
- `eliminationId`
- `inningsPerGame`
- `useDH`
- `teams` from seeded teams
- `leagues: ['Eastern']`
- `conferenceChampionship: false`

#### Step 4: create first-round series

`WRITE`

- store: `kbl-playoffs / series`
- function: repeated `createSeries(...)`

Input pairing:

- manually pairs highest seed vs lowest seed based on current seeded list order

#### Step 5: start playoff

`WRITE`

- store: `kbl-playoffs / playoffs`
- function: `startPlayoff(playoff.id)`

Effect:

- status `IN_PROGRESS`
- `startedAt`
- `currentRound = 1`

#### Step 6: update elimination metadata summary

`WRITE`

- store: `kbl-app-meta / eliminationList`
- function: `updateElimination(eliminationId, { status: 'IN_PROGRESS', currentRound: 1 })`

### Navigation

`STATE`

- route changes to `/elimination/{eliminationId}`

### Important runtime truths

- There is no rollback if any later step fails.
- `controlledTeamIds` and `homeFieldPattern` do not enter the durable path.
- The bracket is structurally created before any game is played.

## Scenario 2: Edit lineup or rotation in Team Hub

### Entry point

- UI: `EliminationTeamHub.tsx`

### Initial load

`READ`

- `getAllEliminationRosterSnapshots(eliminationId)` to build available snapshot/team list
- `getEliminationRosterSnapshot(eliminationId, selectedTeamId)` to load selected team

### Derived local views

`STATE`

- `lineup = getNormalizedEliminationLineup(snapshot)`
- `benchPlayers = positionPlayers not currently in lineup`
- `rotationPlayers = snapshot.startingRotation mapped through snapshot.players`

### Edit paths

#### Move lineup slot

- handler: `handleMoveLineup(index, direction)`
- local reorder
- `WRITE` via `updateEliminationRosterSnapshot(eliminationId, teamId, { lineup: nextLineup })`

#### Change fielding position

- handler: `handlePositionChange(index, fieldingPosition)`
- `WRITE` snapshot lineup update

#### Change lineup player

- handler: `handleLineupPlayerChange(index, playerId)`
- either swap with existing lineup player or replace slot
- `WRITE` snapshot lineup update

#### Promote starter

- handler: `handlePromoteStarter(playerId)`
- moves chosen player ID to front of `startingRotation`
- `WRITE` snapshot rotation update

### Important runtime truths

- Team Hub edits the frozen snapshot only.
- It does not change League Builder rosters.
- It does not change already-running GameTracker state.
- It cannot edit bullpen roles, `lineupVsLHP`, or depth chart.

## Scenario 3: Launch an elimination game

### Entry point

- UI: `EliminationHome.tsx`
- handler: `handlePlayGame(series)`

### Derived pre-launch state

`STATE`

- `buildSeriesCardState(eliminationId, series)` determines:
  - `nextGameNumber`
  - `homeTeam`
  - `awayTeam`
  - `gameId`

Home team selection uses:

- `getHomeFieldPattern(nextGameNumber, series.bestOf, higherSeed.teamId, lowerSeed.teamId)`

Important truth:

- this is driven by playoff engine home-field logic, not Elimination setup `homeFieldPattern` state

### Launch reads

`READ`

- `buildEliminationGameTrackerRoster(eliminationId, awayTeam.teamId)`
- `buildEliminationGameTrackerRoster(eliminationId, homeTeam.teamId)`
- `getTeam(awayTeam.teamId)`
- `getTeam(homeTeam.teamId)`

### Launch payload composition

Route state includes:

- elimination context
  - `gameMode: 'elimination'`
  - `eliminationId`
  - `seriesId`
  - `playoffId`
  - `playoffSeriesId`
  - `playoffGameNumber`
  - `seasonId: elimination-{eliminationId}`
  - `seasonNumber: 1`
- home/away team identity
  - team IDs
  - team names
  - seeds
  - series score
- roster payloads from frozen snapshots
  - `awayPlayers`
  - `awayPitchers`
  - `homePlayers`
  - `homePitchers`
- presentation payload from live team rows
  - colors
  - border colors
  - stadium
- game rules
  - `totalInnings = playoffConfig.inningsPerGame`

### Important runtime truths

- roster source is frozen snapshot
- branding/stadium source is live League Builder team row
- launch already contains original team IDs
- launch still contains original LB player IDs on roster objects

## Scenario 4: Start the game and persist in-progress state

### Entry point

- `GameTracker.tsx` mount effect

### Step A: load existing game if present

`READ`

- `getGameHeader(initialGameId)`
- `loadCurrentGame()`

If exact `currentGame` snapshot exists and matches:

- it is used as primary rehydration path

If not:

- event-log reconstruction path uses
  - `getGameEvents(gameId)`
  - header data
  - fielding/pitcher reconstruction logic

### Step B: initialize a new game if none exists

`STATE`

- GameTracker builds `awayLineup`, `homeLineup`, `awayBench`, `homeBench`, and starter IDs
- original LB player IDs are replaced here by side/name IDs

`STATE / WRITE`

- `initializeGame(config)` in `useGameState`

Inside that:

`WRITE`

- `createGameHeader({ gameId, seasonId, away/home team data, finalScore: null, isComplete: false })`

`STATE`

- lineup refs set
- lineup-state refs set
- playerStats map initialized
- pitcherStats map initialized
- gameState initialized

### Step C: live autosave during the game

`STATE -> WRITE`

- `useGameState` effect builds a `PersistedGameState`
- `saveCurrentGame(persisted)` writes to `kbl-tracker / currentGame`

That snapshot includes:

- live score/inning/outs/bases
- rewritten player IDs
- team IDs
- scoreboard snapshot
- lineup refs/state
- runner tracker snapshot
- pitcher names entries
- substitution log

### Important runtime truths

- currentGame is the preferred rehydration source
- event log is the fallback reconstruction source
- canonical player identity is already rewritten before first full autosave

## Scenario 5: Finish an elimination game

### Entry point

- `GameTracker.tsx` computes `endGameOptions`
- calls `hookEndGame(endGameOptions)`

### Pre-hook work in `GameTracker.tsx`

`STATE`

- computes `computedSeasonId`
  - for elimination it comes from route state `elimination-{eliminationId}`
- pushes game-end activity log entry
- may persist mWAR-related data earlier in page flow

### `useGameState.endGame()` core flow

#### Step 1: build completed `PersistedGameState`

`READ`

- live `playerStats`
- live `pitcherStats`
- lineup refs/state
- fielding events from event log
- runner tracker

`STATE`

- builds `playerStatsRecord`
- builds `pitcherGameStatsArray`
- builds final `PersistedGameState`

#### Step 2: idempotency check

`READ`

- `getGameHeader(gameId)`

If `header.aggregated === true`:

- season/career aggregation is skipped

#### Step 3: season + career aggregation + completed game archive

`WRITE`

- `processCompletedGame(persistedState, aggregationOptions)`

That internally does:

1. `aggregateGameToSeason(...)`
2. `archiveCompletedGame(...)`

Aggregation writes:

- season batting/pitching/fielding
- fame season aggregation
- career batting/pitching via milestone aggregator
- career milestones

#### Step 4: mark header aggregated

`WRITE`

- `markGameAggregated(gameId)`

#### Step 5: playoff series result

If playoff series context exists:

`WRITE`

- `recordSeriesGame(seriesId, gameResult)`

This may also trigger:

- team elimination flag updates on playoff config
- `completePlayoff(...)` if final round finished
- `createNextRoundSeries(...)` if non-final round finished
- `updatePlayoff(... currentRound ...)`
- `updateElimination(... currentRound/champion ...)`

#### Step 6: playoff player stats

If playoff context exists and aggregation was not already done:

`WRITE`

- `aggregateGameToPlayoffStats(playoffId, persistedState)`

#### Step 7: final completed-game archive in hook path

`WRITE`

- `archiveCompletedGame(...)` in hook end-game path if not already aggregated

### Post-hook work in `GameTracker.tsx`

#### Save elimination mojo/fitness carryover

`WRITE`

- `saveMojoFitnessSnapshots(eliminationId, allPlayers)`

#### Clear undo history

`STATE`

- undo stack cleared

#### Navigate to post-game summary

`STATE`

- route to `/post-game/{gameId}`
- carries `eliminationId` in navigation state

### Important runtime truths

- Elimination season aggregation uses `elimination-{eliminationId}` at end game
- player IDs in all written stat rows are rewritten gameplay IDs
- team IDs remain stable original team IDs

## Scenario 6: Advance to next round

### Trigger

- inside `useGameState.endGame()`
- after `recordSeriesGame()` returns a completed series

### Steps

1. `READ` current playoff config via `getPlayoff(playoffId)`
2. mark losing team eliminated in `playoff.teams`
3. `WRITE` updated playoff teams via `updatePlayoff(playoff.id, { teams: updatedTeams })`
4. `READ` all series in that round via `getSeriesByRound(playoff.id, updatedSeries.round)`
5. check whether every series in round is complete

If round is complete and not final:

6. `WRITE` next round series via `createNextRoundSeries(playoff.id, updatedSeries.round, playoff)`
7. `WRITE` playoff `currentRound` via `updatePlayoff(playoff.id, { currentRound: round + 1 })`
8. `WRITE` elimination metadata `currentRound` mirror via `updateElimination(eliminationId, { currentRound: round + 1 })`

### Important truth

`createNextRoundSeries()` assumes an East/West conference structure for the final round, which is a structural mismatch with the single-conference elimination bracket.

## Scenario 7: Finish the bracket

### Trigger

- in `useGameState.endGame()` when:
  - the recorded series becomes complete
  - all series in the round are complete
  - completed round equals `playoff.rounds`

### Steps

1. find champion series winner
2. `WRITE` `completePlayoff(playoff.id, championId)`
3. if linked elimination metadata exists:
   - `WRITE` `updateElimination(eliminationId, { status: 'COMPLETED', champion: championName })`

### Important runtime truths

- elimination metadata stores champion as champion **name**, not team ID
- playoff config stores champion as champion team ID
- award computation does not happen here directly; it happens later in `EliminationHome` effect

## Scenario 8: Open Leaders tab

### Entry point

- `EliminationHome.tsx`
- component: `PlayoffLeadersContent`

### Reads

For each batting stat:

- `getPlayoffLeaders(playoffId, stat, 5)`

For each pitching stat:

- `getPlayoffLeaders(playoffId, stat, 5)`

Underlying source:

- `getPlayoffStats(playoffId)`

### Display behavior

- if no data, show empty state
- otherwise render top 5 rows per category

### Important truth

- leaders tab is a direct playoff-stats view
- it does not read season, career, or museum data

## Scenario 9: Open Awards tab

### Entry point

- `EliminationHome.tsx`
- component: `EliminationAwardsContent`

### Computation trigger

`useEffect` in `EliminationHome.tsx` runs only when:

- `metadata.status === 'COMPLETED'`
- `metadata.awards === undefined`

### Reads

- `computeEliminationAwards(playoffId)`
- which reads `getPlayoffStats(playoffId)`

### Writes

- `updateElimination(eliminationId, { awards: computedAwards })`

### Display behavior

- before bracket complete: “awards will appear after bracket completes”
- after complete but before cached write resolves: loading state
- after write: render awards from metadata cache

### Important truth

- awards are not recomputed on every tab view once cached
- awards are derived from playoff stats only
- awards are stored on elimination metadata, not museum storage

## Scenario 10: Open History tab

### Entry point

- `EliminationHome.tsx`
- component: `HistoryTab`

### Reads during page load

- `getAllPlayoffs()`
- filter to `sourceType === 'elimination' && status === 'COMPLETED'`
- for each such playoff:
  - `getSeriesByPlayoff(playoff.id)`

### Derived values

- champion name from `playoff.teams.find(teamId === playoff.champion)`
- runner-up from final completed series loser
- final result string from final series score

### Important truth

- history is global completed elimination-playoff history from Playoff DB
- it is not built from elimination metadata list alone

## Scenario summary matrix

| Scenario | Main reads | Main writes | Canonical durable outcome |
| --- | --- | --- | --- |
| Create bracket | League Builder leagues/teams/rosters/players | elimination metadata, roster snapshots, playoff config, round-1 series | bracket exists and frozen rosters are stored |
| Edit lineup/rotation | roster snapshots | roster snapshots | elimination roster truth changes |
| Launch game | snapshots, live team rows | none before in-game writes | route state built |
| Play in-progress | live state | currentGame, event log, game header | recoverable in-progress game |
| Finish game | live state, fielding events, header | season/career stores, completed game, playoff series/stats, mojo/fitness snapshots | durable stat and bracket updates |
| Advance round | playoff/series state | series, playoff config, elimination metadata mirror | next round available |
| Finish bracket | playoff/series state | playoff completion, elimination metadata champion/status | bracket complete |
| Leaders | playoff stats | none | derived view only |
| Awards | playoff stats, elimination metadata | elimination metadata awards cache | cached award display |
| History | completed elimination playoffs and series | none | derived historical list |

