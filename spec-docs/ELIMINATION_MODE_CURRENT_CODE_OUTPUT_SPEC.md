# Elimination Mode Current-Code Output Spec

Date audited: 2026-05-06

Scope: this document reflects the code as it exists in the workspace during this audit. It is intentionally descriptive, not aspirational. Anything listed as behavior below is backed by code paths in `src`, `test-utils`, or config files. Anything that looks incomplete, inconsistent, or orphaned is isolated in the final section.

Primary code surfaces:

- Routing and entry points: `src/App.tsx`, `src/src_figma/app/pages/AppHome.tsx`, `src/src_figma/app/routes.tsx`.
- Elimination hub pages: `src/src_figma/app/pages/EliminationSelector.tsx`, `src/src_figma/app/pages/EliminationSetup.tsx`, `src/src_figma/app/pages/EliminationHome.tsx`.
- Elimination team editing: `src/src_figma/app/components/EliminationTeamHub.tsx`.
- Elimination storage: `src/utils/eliminationManager.ts`, `src/utils/eliminationPlayerStorage.ts`, `src/utils/eliminationRosterStorage.ts`, `src/utils/mojoFitnessStorage.ts`.
- Playoff substrate used by elimination: `src/utils/playoffStorage.ts`, `src/engines/playoffEngine.ts`.
- Game tracker integration: `src/src_figma/app/pages/GameTracker.tsx`, `src/src_figma/hooks/useGameState.ts`, `src/utils/gameStorage.ts`, `src/utils/eventLog.ts`, `src/utils/processCompletedGame.ts`.
- Run Fame and all-time stats: `src/utils/eliminationRunFameStorage.ts`, `src/utils/eliminationAllTimeStatsStorage.ts`, `src/src_figma/app/engines/famePromotion.ts`.
- Almanac integration: `src/utils/almanacQueries.ts`, `src/utils/registerAlmanacPlayers.ts`, `src/utils/almanacNarrativeArchive.ts`, `src/src_figma/app/pages/GameBrowser.tsx`, `src/src_figma/app/pages/PlayerInstanceCard.tsx`, `src/src_figma/app/utils/almanacPlayerViews.ts`, `src/src_figma/app/pages/TeamPage.tsx`.
- Sync/reset/test surfaces: `src/utils/syncConfig.ts`, `src/utils/trackerDb.ts`, `src/utils/resetDerivedCompetitionData.ts`, `test-utils/elimination-journeys/elimination-mode.spec.ts`, `playwright.elimination.config.ts`.

## 1. What Elimination Mode Is In Code

Elimination Mode is a manually created, single-bracket playoff run built from an existing League Builder league. It creates a new elimination metadata record, a per-run copied league database, roster snapshots, and a `kbl-playoffs` playoff record with series. Games are launched into the normal GameTracker with `gameMode`/`competitionType` set to `elimination`, then completed games update playoff series, playoff leaders, archived games, run Fame standings, all-time elimination stats, and the Almanac.

It is not a separate game engine. It reuses:

- League Builder teams, players, rosters, and overrides at setup time.
- The playoff storage engine for bracket config, series state, series advancement, and playoff leaders.
- The GameTracker for live scorekeeping.
- Season aggregation stores using `statsScopeId = elimination-{eliminationId}`.
- Completed game archive and event log systems.
- Reporter/story systems with reporter game mode `elimination`.
- Almanac canonical player registry and game browsing.

The user-visible flow is:

1. App home -> elimination selector.
2. Selector -> new bracket setup or existing bracket.
3. Setup wizard chooses league, bracket settings, teams, seeding, and name.
4. Creation writes metadata, copied data, snapshots, playoff config, and first-round series.
5. Elimination Home displays bracket/team hub/leaders/awards/history.
6. The user selects a series, manually chooses a home team, and launches a GameTracker game.
7. GameTracker persists and completes the game.
8. Completion updates the series and possibly advances or completes the bracket.
9. Post-game summary returns to the elimination hub and shows run Fame/promotion UI when applicable.
10. Almanac pages expose elimination games, player instances, all-time elimination totals, and narratives.

## 2. Routes And Entry Points

Root app routes in `src/App.tsx` expose:

- `/elimination/select` -> `EliminationSelector`.
- `/elimination/setup` -> `EliminationSetup`.
- `/elimination/:eliminationId` -> `EliminationHome`.
- `/game-tracker/:gameId` -> `GameTracker`.
- `/post-game/:gameId` -> `PostGameSummary`.
- `/almanac/elimination` -> `GameBrowser`.

`AppHome` links to `/elimination/select`.

There is also a separate route table in `src/src_figma/app/routes.tsx` that only defines `/elimination/:eliminationId`, not selector/setup. The root `src/App.tsx` is the complete route surface used by the current app shell.

## 3. Core Domain Records

### 3.1 Elimination metadata

Defined in `src/utils/eliminationManager.ts` as `EliminationMetadata`.

Fields:

- `eliminationId`: generated as `elim-${Date.now()}-${randomBase36}`.
- `name`: user-supplied bracket name.
- `leagueId`: source League Builder league id.
- `leagueName`: source League Builder league name.
- `status`: `'SETUP' | 'IN_PROGRESS' | 'COMPLETED'`.
- `createdAt`: timestamp.
- `lastPlayedAt`: timestamp.
- `teamsCount`: selected bracket size.
- `currentRound`: number, initialized to `0`, then set to `1` when the run starts.
- `champion?`: champion team name string, not champion team id.
- `awards?`: persisted array of elimination awards after completion.

Storage:

- Database: `kbl-app-meta`.
- Store: `eliminationList`.
- Key path: `eliminationId`.
- Sync registry includes `kbl-app-meta.eliminationList`.

CRUD:

- `createElimination` creates metadata with status `SETUP`.
- `getElimination` loads one.
- `listEliminations` loads all and sorts by descending `lastPlayedAt`.
- `updateElimination` merges updates, preserves `eliminationId`/`createdAt`, and updates `lastPlayedAt` to `Date.now()` unless explicitly supplied.
- `deleteElimination` deletes metadata and then deletes related playoff, roster snapshots, mojo/fitness snapshots, and the per-run elimination database.

### 3.2 Per-run copied League Builder database

Defined in `src/utils/eliminationPlayerStorage.ts`.

Each run gets its own IndexedDB database named:

- `kbl-elimination-${bracketId}`

Version:

- `DB_VERSION = 1`

Stores:

- `players`, keyPath `id`.
- `teams`, keyPath `id`.

Purpose:

- Freeze/copy the source league’s teams and effective players into a run-specific database.
- Provide lookup APIs used by Elimination Home, GameTracker roster launch, reporter team metadata, and Fame promotion logic.

Copy behavior:

- `deepCopyLeagueToBracket(bracketId, leagueId)` loads the League Builder league template, all global teams, all global players, and initializes the per-run DB.
- It copies teams whose ids are listed in `leagueTemplate.teamIds`.
- It copies players whose `leagueAssignments` include the source `leagueId`.
- Each copied player is resolved through `getEffectivePlayer(player.id, leagueId)` before copying.
- Copied player `leagueAssignments` are filtered to assignments for the original source `leagueId`.
- Copied player `editHistory` is cleared.
- Existing copied players/teams in that per-run database are cleared before put.

Read/write helpers:

- `getEliminationPlayer`, `getAllEliminationPlayers`, `getEliminationPlayersByTeam`.
- `saveEliminationPlayer`.
- `getEliminationTeam`, `getAllEliminationTeams`, `saveEliminationTeam`.
- `deleteEliminationDatabase`.

### 3.3 Frozen roster snapshots

Defined in `src/utils/eliminationRosterStorage.ts`.

Store:

- Database: `kbl-tracker`.
- Store: `rosterSnapshots`.
- Key path: `key`.
- Indexes: `eliminationId`, `teamId`.
- Snapshot key format: `elim-roster-${eliminationId}-${teamId}`.

Snapshot fields:

- `key`
- `eliminationId`
- `teamId`
- `teamName`
- `players`: copied elimination players for that team.
- `lineup`: source roster `lineupWithDH`.
- `lineupWithoutDH?`: source roster `lineupWithoutDH`.
- `startingRotation`: source roster starting rotation.
- `snapshotAt`

Creation:

- `createRosterSnapshots(eliminationId, teamIds)` runs during `createEliminationRun`.
- For each selected team, it loads the team from the per-run elimination DB and the roster from live League Builder `getTeamRoster(teamId)`.
- It loads copied players through `getEliminationPlayersByTeam`.
- It writes one snapshot per selected team.

Normalization:

- `getNormalizedEliminationLineup(snapshot, useDH = true)` returns a usable lineup.
- With DH: target is 9 non-pitchers and positions are `C,1B,2B,3B,SS,LF,CF,RF,DH`.
- Without DH: target is 8 non-pitchers, then adds the first normalized rotation pitcher as batting slot with fielding position `'P'`.
- Existing lineup slots are filtered to players in the snapshot, non-pitchers only, no duplicate player ids, and no `DH` when `useDH` is false.
- Missing lineup slots are filled from remaining non-pitchers.
- `getBestPosition` prefers primary position, then secondary position, then first unused available position, otherwise fallback.
- `getNormalizedEliminationRotation(snapshot)` filters stored rotation ids to pitchers in the snapshot and appends any remaining pitcher ids.

GameTracker conversion:

- `buildEliminationGameTrackerRoster(eliminationId, teamId, useDH)` loads the snapshot, normalizes lineup and rotation, converts lineup players and bench non-pitchers into GameTracker `Player` shape, and converts rotation pitchers into GameTracker `Pitcher` shape.
- The first normalized rotation pitcher is active.
- `isStarter` is true when `index === 0` or `player.primaryPosition === 'SP'`.
- Converted players/pitchers include name, position/handedness, stats initialized to zero, stable `playerId`, ratings, traits, personality, chemistry, age, secondary position, and pitcher arsenal where applicable.

Updates:

- `updateEliminationRosterSnapshot` can update `lineup`, `lineupWithoutDH`, or `startingRotation`.
- `deleteEliminationRosterSnapshots` removes all snapshots by `eliminationId`.

### 3.4 Mojo/fitness snapshots

Defined in `src/utils/mojoFitnessStorage.ts`.

Store:

- Database: `kbl-tracker`.
- Store: `mojoFitnessSnapshots`.
- Key path: `['eliminationId', 'playerId']`.
- Index: `eliminationId`.

Fields:

- `eliminationId`
- `playerId`
- `mojoLevel`
- `fitnessState`
- `updatedAt`

APIs:

- `saveMojoFitnessSnapshots(eliminationId, players)`
- `loadMojoFitnessSnapshots(eliminationId)`
- `deleteMojoFitnessSnapshots(eliminationId)`

GameTracker loads these at game initialization time for elimination games. Team Hub edits these directly through the player condition modal.

### 3.5 Playoff config, series, and stats

Elimination uses `src/utils/playoffStorage.ts`.

Database:

- `kbl-playoffs`, version `2`.

Stores:

- `playoffs`, keyPath `id`.
- `series`, keyPath `id`.
- `playoffGames`, keyPath `id`.
- `playoffStats`, keyPath `id`.

Elimination-specific fields in `PlayoffConfig`:

- `sourceType?: 'franchise' | 'elimination'`
- `eliminationId?: string`

Creation rules:

- `createPlayoff` requires `eliminationId` when `sourceType === 'elimination'`.
- Franchise replacement is by season number.
- Elimination replacement is by `eliminationId`.
- The `seasonNumber` index was changed to non-unique in version 2 so multiple elimination runs can coexist with `seasonNumber: 1`.

Elimination config values created by `createEliminationRun`:

- `seasonNumber: 1`
- `seasonId: elimination-${eliminationId}`
- `status: NOT_STARTED`, then `startPlayoff` changes it to `IN_PROGRESS`.
- `teamsQualifying`: selected bracket size.
- `rounds`: `Math.log2(teamsCount)`.
- `gamesPerRound`: selected series lengths.
- `inningsPerGame`: selected setup value.
- `useDH`: selected setup value.
- `liveBeatReporterEnabled`, `postGameColumnsEnabled`, and legacy `beatReporterEnabled`.
- `leagues: ['Eastern']`.
- `conferenceChampionship: false`.
- `teams`: seeded teams, every team assigned `league: 'Eastern'`, `regularSeasonRecord: { wins: 0, losses: 0 }`, `eliminated: false`.
- `currentRound: 0`, then `startPlayoff` sets `1`.
- `sourceType: 'elimination'`.
- `eliminationId`.

Series records:

- First-round series are created directly by `createEliminationRun`, not by `generateBracket`.
- Pairing is highest seed vs lowest seed: seed index `i` against seed index `teamsCount - 1 - i`.
- First-round series start with `status: 'PENDING'`.
- `gamesRequired = Math.ceil(bestOf / 2)`.
- `higherSeedWins = 0`, `lowerSeedWins = 0`, `games = []`.
- First-round `roundName` in `createEliminationRun` is:
  - 2 teams / one round: `Championship`.
  - 4 teams / two rounds: `Semi-Finals`.
  - 8 teams / three rounds: `Quarter-Finals`.
  - 16 teams / four rounds: `First Round`.

Advancement:

- Game completion calls `recordSeriesGame`.
- Series game records are stored in the `games` array on the series, not in `playoffGames`.
- `recordSeriesGame` replaces an existing game with the same game number or appends it, then recalculates `higherSeedWins`/`lowerSeedWins`.
- If either side reaches `gamesRequired`, status becomes `COMPLETED`, `winner` is set, and `completedAt` is set.
- After a completed series, the loser’s `PlayoffTeam` is marked `eliminated: true` and `eliminatedInRound`.
- When all series in a round are complete:
  - If it was the final round, `completePlayoff` sets playoff status `COMPLETED`, `completedAt`, and champion team id. The elimination metadata is updated to `status: COMPLETED` and `champion` team name.
  - Otherwise, `createNextRoundSeries` creates next-round series and `updatePlayoff`/`updateElimination` advance `currentRound`.
- Because elimination playoffs have `conferenceChampionship: false`, `leagues.length <= 1`, and all teams are Eastern, `createNextRoundSeries` uses single-bracket advancement: winners sorted by seed, highest remaining vs lowest remaining.
- Next-round series created by `createNextRoundSeries` start with `status: 'IN_PROGRESS'`.

Round naming after first round:

- `playoffStorage.getRoundName(round, totalRounds)` is used by `createNextRoundSeries` and the hub display.
- It maps by remaining rounds:
  - Remaining 1: `Championship`.
  - Remaining 2: `Conference Championship`.
  - Remaining 3: `Division Series`.
  - Remaining 4: `Wild Card`.

Playoff stats:

- `aggregateGameToPlayoffStats(playoffId, persistedState)` aggregates batting and pitching stats from each completed game into `playoffStats`.
- Batting includes games, AB, H, 2B, 3B, HR, RBI, R, BB, K, SB, CS, HBP, SF and derived AVG/OBP/SLG/OPS.
- Pitching includes pitching games, W/L/SV, innings pitched as outs/3, ER, K, BB, H allowed and derived ERA/WHIP.
- Fielding metrics for leaders are attached dynamically in `getPlayoffStats`.
- For elimination playoffs, `buildPlayoffFieldingScopeQuery` uses:
  - `statsScopeId: playoff.seasonId` or `elimination-${eliminationId}`.
  - `competitionType: 'elimination'`.
  - `competitionId: playoff.eliminationId`.
  - `isComplete: true`.

## 4. Setup Wizard Behavior

`EliminationSetup` is a five-step wizard:

1. League
2. Settings
3. Teams
4. Seeding
5. Confirm

Constants:

- Valid bracket sizes: `[4, 8, 16]`.
- Valid series lengths: `[3, 5, 7]`.
- Round count: `Math.log2(numTeams)`.

League loading:

- Uses `useLeagueBuilderData`.
- If no leagues are loaded and there is no loading error, it calls `seedSMB4Data(false)` once.
- League list displays available teams, conferences, and divisions from League Builder.

Team count:

- Valid options are bracket sizes less than or equal to selected league team count.
- If no valid options exist, `numTeams` becomes `0` and `seriesLengths` becomes `[]`.
- If current `numTeams` is invalid for a new league, it becomes the largest valid option.

Series lengths:

- `seriesLengths` is resized to the round count whenever `numTeams` changes.
- Missing series length slots default to `7`.
- Each round can independently be best-of-3, best-of-5, or best-of-7.

Game rules:

- Innings per game is a number input clamped to `3` through `9`; default is `9`.
- DH rule is boolean; default is `true`.
- Live historical in-game tidbits default `false`.
- Post-game columns default `true`.

Team selection:

- The selected league’s teams are sorted alphabetically by name.
- The setup auto-fills `selectedTeamIds` from league teams until it reaches `numTeams`.
- Manual toggling cannot select more than `numTeams`.
- Proceeding from the team step requires exactly `numTeams` selected ids.

Seeding:

- `seededTeamIds` preserves existing selected order where possible and appends newly selected teams.
- Up/down buttons swap adjacent seeds.
- Preview pairs seed 1 vs last seed, seed 2 vs next-to-last seed, etc.
- Proceeding from seeding requires `seededTeams.length === numTeams`.

Confirm:

- Bracket name defaults to `${selectedLeague.name} Playoffs`.
- Starting playoffs requires a selected league, nonzero `numTeams`, and `seededTeams.length === numTeams`.
- `handleStartPlayoffs` calls `createEliminationRun` with name, source league, team count, seeded teams, series lengths, innings, DH, and reporter toggles.
- On success it navigates to `/elimination/${eliminationId}`.
- On failure it shows the error and leaves the user on setup.

Creation transaction shape:

`createEliminationRun` is not a single IndexedDB transaction across databases, but it uses cleanup on failure. It:

1. Creates metadata in `eliminationList`.
2. Deep-copies source league data into `kbl-elimination-${eliminationId}`.
3. Creates roster snapshots for selected teams.
4. Creates a playoff config in `kbl-playoffs`.
5. Creates first-round series.
6. Starts the playoff.
7. Updates elimination metadata to `IN_PROGRESS`, round `1`.

If any step after metadata creation throws, it calls `deleteElimination(eliminationId)` and rethrows.

## 5. Selector Behavior

`EliminationSelector`:

- Loads all metadata through `listEliminations`.
- Shows loading spinner while loading.
- Lists brackets sorted by latest `lastPlayedAt`.
- Each card shows name, league name, team count, current round, status, and relative last-played time.
- Completed cards show champion if `status === COMPLETED` and `champion` exists.
- Clicking card body navigates to `/elimination/${elimination.eliminationId}`.
- “New Elimination Bracket” navigates to `/elimination/setup`.
- Delete is a two-step local confirmation; confirmed delete calls `deleteElimination`.

Delete behavior from selector:

- Deletes elimination metadata.
- Deletes linked playoff if found by `getPlayoffByElimination`.
- Deletes roster snapshots for the run.
- Deletes mojo/fitness snapshots for the run.
- Deletes the per-run `kbl-elimination-${eliminationId}` database.

It does not delete every stored artifact associated with completed games. See gaps section.

## 6. Elimination Home Hub

`EliminationHome` tabs:

- `BRACKET`
- `TEAM HUB`
- `LEADERS`
- `AWARDS`
- `HISTORY`

Load behavior:

- Reads `eliminationId` from route params.
- Loads elimination metadata.
- Loads the playoff by elimination id.
- Loads all playoffs to build completed elimination history.
- Loads series for the current playoff.
- Updates elimination `lastPlayedAt`.
- Sorts series by round, then higher seed.
- Selects the first loaded series by default.
- Loads reporter teams for the selected game based on current selected series/home choice.
- Resolves reporter toggle values from explicit playoff fields, legacy `beatReporterEnabled`, and defaults:
  - Live default false.
  - Post-game default true.
- Persists reporter toggle changes back to playoff config whenever local toggle state differs from playoff config.

Header:

- Displays bracket name, league name, team count, current round, and status.
- Home button navigates to `/`.
- Back button navigates to `/elimination/select`.

### 6.1 Bracket tab

Bracket tab shows:

- Overview: teams, rounds, best-of pattern.
- One section per round.
- One card per series.
- Series card shows seeds/team names, status, score, winner if complete, and default next-game home team if incomplete.
- Clicking or keyboard Enter/Space selects a series.

Series playability:

- `canPlaySeries(series)` returns true for `PENDING` or `IN_PROGRESS`.
- Completed series do not expose a play button.

Home team:

- `buildSeriesCardState` computes next game number as `higherSeedWins + lowerSeedWins + 1`.
- Default home team comes from `getHomeFieldPattern(nextGameNumber, bestOf, higherSeedId, lowerSeedId)`.
- The selected series panel requires the user to choose the home team manually before launching.
- The launch button is disabled until `selectedHomeTeamId` is set.
- If a selected home team is passed, it overrides the home field pattern.

Game id:

- `elim-${eliminationId}-${series.id}-g${nextGameNumber}`.

Game launch state:

`handlePlayGame` builds away/home rosters and navigates to `/game-tracker/${gameId}` with state:

- `gameMode: 'elimination'`
- `eliminationId`
- `seriesId`
- `gameNumber`
- `roundName`
- `seasonNumber: 1`
- `statsScopeId: elimination-${eliminationId}`
- `competitionType: 'elimination'`
- `competitionId: eliminationId`
- `competitionName: metadata.name`
- `leagueId: metadata.leagueId`
- `liveBeatReporterEnabled`
- `postGameColumnsEnabled`
- home/away team ids, names, abbreviations, seeds, colors.
- `seriesScore` from current series wins, oriented to actual home/away.
- `awayPlayers`, `awayPitchers`, `homePlayers`, `homePitchers`.
- `stadiumName`: home team stadium or `${homeTeamName} Stadium`.
- `playoffSeriesId`
- `playoffGameNumber`
- `playoffId`
- `playoffRound` mapped for Fame:
  - final round -> `world_series`
  - one before final -> `championship_series`
  - two before final -> `division_series`
  - earlier -> `wild_card`
- `isEliminationGame` and `isClinchGame` from `buildClutchContext`.
- `totalInnings`
- `useDH`

Before navigation, it also writes two session storage keys:

- `kbl-pending-live-beat-reporter-enabled`
- `kbl-pending-post-game-columns-enabled`

### 6.2 Team Hub tab

The Team Hub is `EliminationTeamHub`.

Inputs:

- `eliminationId`
- playoff `teams`

Loads:

- All roster snapshots for the run to know which teams have snapshots.
- One selected team snapshot by `eliminationId/teamId`.
- All mojo/fitness snapshots for the run.

Selected team:

- Starts at first playoff team id.
- If available snapshot ids do not include current selected team, it selects the first snapshot id.
- Team buttons show seed/team name and append `(NO SNAPSHOT)` if no snapshot exists.

Displays:

- Position players, sorted by last name.
- Pitchers, sorted by last name.
- Lineup, normalized through `getNormalizedEliminationLineup(snapshot)` with default DH behavior.
- Bench players: non-pitchers not in the normalized lineup.
- Starting rotation: players listed in `snapshot.startingRotation`.

Lineup editing:

- Move up/down swaps lineup slots and rewrites batting order.
- Position change rewrites the slot fielding position.
- Replacing a lineup player with a bench player swaps if already in lineup, otherwise assigns the selected player to that slot.
- Saves via `updateEliminationRosterSnapshot(eliminationId, teamId, { lineup })`.

Rotation editing:

- “MAKE NEXT” moves the selected pitcher id to the front of `startingRotation`.
- Saves via `updateEliminationRosterSnapshot(..., { startingRotation })`.
- The first displayed rotation player is labeled `NEXT STARTER`.

Mojo/fitness editing:

- Clicking a player opens a modal.
- Default condition if no snapshot exists is mojo `0`, fitness `'FIT'`.
- Changing mojo or fitness updates local state and saves through `saveMojoFitnessSnapshots`.

### 6.3 Leaders tab

Loads leaders from `getPlayoffLeaders(playoffId, stat, 5)`.

Panels:

- Batting: AVG, HR, RBI, SB, OPS.
- Pitching: ERA, W, K, WHIP, SV.
- Fielding: FWAR, RS, PLAYS.

Sorting:

- `getPlayoffLeaders` sorts descending for most stats.
- ERA and WHIP sort ascending.
- Fielding metrics are attached when `getPlayoffStats` fetches fielding events in the elimination scope.

Empty state:

- If no batting/pitching/fielding leader arrays contain data, displays “No playoff stats yet for this bracket.”

### 6.4 Awards tab

Awards are persisted onto elimination metadata after the bracket is completed.

Computation trigger:

- `EliminationHome` effect runs when metadata status is `COMPLETED`, metadata `awards` is `undefined`, and playoff config exists.
- It calls `computeEliminationAwards(playoffId)` and then `updateElimination(eliminationId, { awards })`.

Display:

- If bracket not completed: “AWARDS WILL APPEAR AFTER BRACKET COMPLETES”.
- If completed and `awards === undefined`: loading state.
- If completed and no awards: “No playoff stats available to compute awards yet.”
- Otherwise cards show category, player name, team id, and stat line.

Award categories:

- `Postseason MVP`: qualified batters with at least 5 AB, sorted by OPS then RBI.
- `Best Pitcher`: at least 2 pitching games and at least 3 IP, sorted by ERA then strikeouts.
- `Best Runner`: at least 1 SB, sorted by SB then runs.
- `Clutch Performer`: at least 1 RBI, sorted by RBI then OPS.
- `Best Fielder`: fielding WAR and fielding plays present, at least 2 fielding plays, sorted by fielding WAR, runs saved, plays.
- One `Series MVP · ${series.roundName}` per completed series, computed from completed games whose `playoffSeriesId` matches that series.

### 6.5 History tab

History entries are built from all completed playoffs where `sourceType === 'elimination'`.

Each entry includes:

- `playoff`
- `series`
- champion name from playoff team matching `playoff.champion`
- runner-up name from final completed series loser.
- final result string from final completed series score.

History display:

- Shows champion, runner-up, final result, and all series results.
- Entry title uses `entry.playoff.seasonId.toUpperCase()`.

## 7. GameTracker Integration

### 7.1 Route state resolution

`GameTracker` accepts navigation state fields for elimination:

- `gameMode`
- `eliminationId`
- `statsScopeId`
- `competitionType`
- `competitionId`
- `competitionName`
- `playoffSeriesId`
- `playoffGameNumber`
- `playoffId`
- `playoffRound`
- `isEliminationGame`
- `isClinchGame`
- `leagueId`
- reporter toggles
- roster/player arrays
- colors and stadium
- rules such as `totalInnings` and `useDH`

Resolution behavior:

- `competitionType` defaults from navigation state `competitionType`, then `gameMode`, then `'exhibition'`.
- For elimination, `competitionId` falls back to `navigationState.eliminationId`.
- For elimination, `statsScopeId` falls back to `elimination-${eliminationId}`.
- Effective values also read restored persisted competition/playoff context when navigation state is absent after refresh.
- Effective `gameMode` becomes `'elimination'` when effective competition type is `'elimination'`.

### 7.2 Game initialization

When initializing a fresh game:

- If competition type is elimination, `seasonId` passed to `initializeGame` is `undefined`.
- `statsScopeId` is still `elimination-${eliminationId}`.
- `competitionType`, `competitionId`, `competitionName`, playoff context, reporter toggles, and start rosters are passed into `initializeGame`.
- The GameTracker does not rewrite the URL for elimination games; the `gameId` already includes the route game id.

### 7.3 Persisted game state

`PersistedGameState` supports:

- `statsScopeId`
- `competitionType`
- `competitionId`
- `competitionName`
- `playoffSeriesId`
- `playoffGameNumber`
- `playoffId`
- `playoffRound`
- `isEliminationGame`
- `isClinchGame`
- reporter toggles
- `totalInnings`
- lineups/bench/pitcher state
- `fameEvents`

`GameHeader` in event log supports the same elimination/playoff context fields. `getGameHeadersForScope` can filter by `statsScopeId`, `competitionType`, `competitionId`, and completion status.

### 7.4 Mojo/fitness on game start

After GameTracker initializes, it registers players with player-state tracking.

For elimination games:

- It imports `loadMojoFitnessSnapshots`.
- It loads all snapshots for `effectiveEliminationId`.
- It maps each snapshot by player id to mojo/fitness.
- That map is used while registering player state.

### 7.5 Reporter integration

`EliminationHome` lets users set live and post-game reporter toggles before launch. GameTracker also receives toggles from navigation state and persists them.

`useCommentaryFeed` receives:

- `gameMode: 'elimination'` for elimination games.
- Also maps `competitionType === 'playoff'` to reporter mode `'elimination'`.

Live between-inning summaries:

- Only fire when `gameState.liveBeatReporterEnabled` is true.
- Fire after bottom of inning transitions or post-final-out.
- Use `effectiveCompetitionType` in `fireBetweenInningSummary`.

Post-game columns:

- Fire once when game phase reaches `POST_FINAL_OUT`.
- Require `gameState.postGameColumnsEnabled`.
- Reporter game mode is `elimination` for elimination and playoff contexts.

### 7.6 End-game processing

`useGameState` end-game flow uses an idempotency guard based on the game header’s `aggregated` flag.

If not already aggregated:

1. It builds `targetStatsScopeId` from explicit options, refs, season id refs, or `season-1`.
2. Calls `processCompletedGame(persistedState, aggregationOptions, resolvedArchiveLeagueId)` with `seasonId: targetStatsScopeId`.
3. Marks game aggregated.

`processCompletedGame`:

- Aggregates to season stats using the supplied `seasonId`.
- Captures player ratings snapshots from `getEffectivePlayer`.
- Archives completed game once.
- Registers Almanac players.

After that, regardless of `alreadyAggregated`, if `playoffSeriesIdRef.current` exists:

- Records the series game through `recordSeriesGame`.
- Uses winner id as home team when `homeScore > awayScore`, otherwise away team.
- If the series completes, marks the losing team eliminated.
- If all round series are complete:
  - Completes playoff and elimination metadata if final round.
  - Or creates next round series and advances playoff/elimination current round.

If not already aggregated and `playoffIdRef.current` exists:

- Aggregates player stats to playoff stats through `aggregateGameToPlayoffStats`.

If not already aggregated:

- Archives the completed game again with full context including:
  - `statsScopeId`
  - `competitionType`
  - `competitionId`
  - playoff context
  - `leagueId`
  - `totalInnings`
  - players of the game
- If resolved competition type is `elimination` and there is a run id:
  - Appends game Fame to run aggregate.
  - Appends game stats to all-time elimination stats.

Finally:

- Clears current game persistence.
- Post-game route navigates to `/post-game/${gameId}` elsewhere in the end-game flow.

## 8. Post-Game Summary Integration

`PostGameSummary` resolves:

- `gameMode` from navigation state.
- `eliminationId` from navigation state.
- `resolvedCompetitionId` from navigation state or completed game record.
- `eliminationRunId = resolvedCompetitionId ?? eliminationId`.
- `resolvedGameMode = gameMode ?? gameData?.competitionType ?? 'exhibition'`.

For elimination:

- Loads run Fame standings through `getRunFameStandings(eliminationRunId)`.
- Loads promotion candidates through `getRunPromotionCandidates(eliminationRunId, standings, teamNamesById)`.
- Shows `FamePromotionBanner`.
- Shows `RunStandingsTable`.
- On continue, navigates back to `/elimination/${eliminationRunId}`.

Promotion actions:

- Accept calls `acceptFamePromotion(eliminationRunId, playerId, targetTier)`.
- Dismiss calls `dismissFamePromotion(eliminationRunId, playerId, targetTier)`.
- UI removes the handled candidate from local state.

## 9. Run Fame And Promotion System

### 9.1 Run Fame aggregate

Defined in `src/utils/eliminationRunFameStorage.ts`.

Store:

- Database: `kbl-tracker`.
- Store: `eliminationRunFameAggregates`.
- Key path: `runId`.
- Sync registry includes this store.

Aggregate fields:

- `runId`
- `playerFame`: map of player id to stored player run fame.
- `promotionDecisions?`: map of player id to accepted/dismissed tiers.
- `processedGameIds`
- `lastUpdatedAt`

Stored player fame:

- `playerName`
- `totalFame`
- `events`
- `gamesPlayed`
- `gameIds`

Append behavior:

- `appendEliminationGameFameToRun(runId, gameId, fameEvents)` is idempotent by `processedGameIds`.
- If the game was already processed, it returns existing aggregate.
- Otherwise it adds the game id to `processedGameIds`.
- For each fame event:
  - Adds `event.fameValue` to that player’s `totalFame`.
  - Appends a copy of the event.
  - Adds one `gamesPlayed` only if that player did not already have that game id.

Read behavior:

- `getPlayerRunFame` returns zero totals if no aggregate/player entry exists.
- `getRunFameStandings` returns all players sorted by total Fame descending, event count descending, then player name.

Promotion decision behavior:

- `getRunPromotionDecision` reads decision for one player.
- `setRunPromotionDecision` merges decision fields and updates `lastUpdatedAt`.
- `deleteRunFameAggregate` deletes the aggregate and sync-removes it.

### 9.2 Promotion thresholds

Defined in `src/src_figma/app/engines/famePromotion.ts`.

Thresholds:

- Tier 2 at 10 run Fame.
- Tier 3 at 30 run Fame.
- Tier 4 at 80 run Fame.
- Tier 5 at 150 run Fame.

Candidate behavior:

- Current tier comes from `getEffectiveFame(player, override)`.
- Player comes from the per-run elimination DB.
- Override comes from League Builder override storage using `runId` as the league id.
- Latest team id comes from the newest Fame event’s `playerTeam`.
- If run total qualifies for a higher tier and no accepted/dismissed decision covers that target tier, a candidate is returned.
- Candidates sort by target tier descending, run Fame descending, then player name.

Accept behavior:

- Writes a League Builder player override with `leagueId = runId`, `playerId`, and `fameTierOverride: targetTier`.
- Records `acceptedTier` in the run aggregate.

Dismiss behavior:

- Records `dismissedTier`, preserving the higher dismissed tier if already present.

### 9.3 Run standings table

`RunStandingsTable`:

- Displays cumulative Fame across the current elimination run.
- Builds team name from latest event team id and current game team names.
- Flags players from the current game.
- Empty state distinguishes loading vs no run Fame yet.

## 10. Elimination All-Time Stats

Defined in `src/utils/eliminationAllTimeStatsStorage.ts`.

Store:

- Database: `kbl-tracker`.
- Store: `eliminationAllTimePlayerStats`.
- Key path: `playerId`.
- Sync registry includes this store.

Fields:

- Player id/name.
- Batting totals: games, AB, H, R, 2B, 3B, HR, RBI, SB, BB, K.
- Pitching totals: games, outs, H, R, ER, BB, K, W, L, SV, CG, SHO.
- `processedGameIds`.
- `lastUpdatedAt`.

Append behavior:

- `appendEliminationGameToAllTimeStats(gameState)` builds contributions from `gameState.playerStats` and `pitcherGameStats`.
- It is idempotent per player by checking `current.processedGameIds.includes(gameState.gameId)`.
- Batting games count as 1 for every player in `playerStats`.
- Pitching games count per pitcher game stat entry.
- Complete game is counted only for a starter whose `outsRecorded` equals all outs recorded by that team’s pitchers.
- Shutout is counted only for such a complete game when pitcher `runsAllowed === 0`.
- After transaction completes, touched players are synced.

Read/delete:

- `getEliminationAllTimePlayerStats(playerId)` loads one player.
- `deleteEliminationAllTimeStats()` clears the entire all-time store.

Almanac formatting:

- `getPlayerEliminationAllTimeStats` converts all-time totals into `BattingLine`/`PitchingLine`.
- Batting average and ERA are derived when displayed.

## 11. Almanac Integration

### 11.1 Completed game identity

`CompletedGameRecord` supports:

- `statsScopeId`
- `competitionType`
- `competitionId`
- `competitionName`
- playoff fields
- `isEliminationGame`
- `isClinchGame`
- `leagueId`

For elimination completed games:

- `competitionType` is `elimination`.
- `competitionId` is `eliminationId`.
- `competitionName` is bracket name.
- `statsScopeId` is `elimination-${eliminationId}`.
- `leagueId` is source League Builder league id.

### 11.2 Canonical player registration

`registerAlmanacPlayers` maps `competitionType === 'elimination'` to canonical instance mode `elimination`.

For elimination:

- Instance id is `gameState.competitionId || leagueId`.
- Instance name is:
  - elimination metadata name, or
  - game competition name, or
  - `${leagueTemplate?.name ?? leagueId} Elimination`.

Identity resolution:

- First tries `getPlayer(playerId)` from global League Builder.
- If found, canonical id is `smb4_${playerId}` for SMB4 source database or `custom_${playerId}` otherwise.
- If not found, uses player ratings snapshot or persisted stats and `custom_${playerId}`.

Backfill behavior:

- `backfillCanonicalPlayers` scans completed games and applies the same mode/instance rules.

### 11.3 Almanac game queries

`getGameInstanceDescriptor` maps:

- `competitionType === 'elimination' && competitionId` -> mode `elimination`, instance id `competitionId`.
- `competitionType === 'franchise' | 'playoff' && competitionId` -> mode `franchise`.
- Otherwise, exhibition league id -> mode `exhibition`.

`getEliminationGames(filters)`:

- Loads all completed games.
- Filters to `game.competitionType === 'elimination'`.
- Optional filters:
  - `runId` matches `competitionId`.
  - `dateFrom` / `dateTo`.
  - `teamId`.
  - `opponentId`.
- Sorts newest first.

`getInstanceGames(mode, instanceId)`:

- For elimination, filters completed games by `competitionType === 'elimination'` and `competitionId === instanceId`.

`getPlayerInstanceStats(playerId, mode, instanceId)`:

- For elimination, aggregates batting/pitching from games in that run instance using canonical aliases.

`searchArchivedPlayerInstances(query)`:

- Searches exhibition, elimination, and franchise by default.
- Uses completed games and canonical registry.
- Returns entries with mode, instance id, canonical id, team, games, and player name.

### 11.4 Almanac pages

`AlmanacHome` links to `/almanac/elimination`.

`GameBrowser`:

- Treats path starting `/almanac/elimination` as elimination mode.
- Title is `ELIMINATION GAMES`.
- Loads team options from `getEliminationGames`.
- Builds run filter options from distinct completed game `competitionId`/`competitionName`.
- Loads rows from `getEliminationGames({ ...filters, runId })`.
- Shows elimination-specific run filter and run labels in table.

`TeamPage`:

- Resolves instance mode through `getArchiveInstanceMode(leagueId)`.
- Uses `/almanac/elimination` back link and label `ELIMINATION` when resolved mode is elimination.
- Team data still comes from global League Builder `getTeam(teamId)`.

`PlayerInstanceCard`:

- Resolves canonical player and instance.
- For elimination mode, loads:
  - run-specific instance stats.
  - all-time elimination batting/pitching stats.
  - latest game Fame events.
  - run Fame through `PlayerFameSection` with `runId = instance.instanceId`.
- Player overrides are loaded with `getLeaguePlayerOverride(instanceId, playerIdInInstance)`, which makes accepted run Fame promotions visible for elimination instances.

`PlayerFameSection`:

- For elimination mode and a run id, loads `getPlayerRunFame(runId, playerId)`.
- Shows game Fame from latest game and run Fame totals.
- For franchise/playoff mode, shows “Franchise Fame rollup — coming soon.”

`AlmanacNarratives`:

- `almanacNarrativeArchive` maps completed game `competitionType === 'elimination'` and `competitionType === 'playoff'` to reporter game mode `elimination`.
- Narrative archive includes post-game stories and historical tidbits.
- Filters include `ELIMINATION`.

## 12. Stats, WAR, And Scope

Elimination games aggregate into season-style stat stores using `seasonId = statsScopeId = elimination-${eliminationId}`.

Implications:

- `seasonStorage` stores are reused for elimination run stats.
- `useSeasonStats` and `useWARCalculations` infer `CompetitionType` as `elimination` when a scope id starts with `elimination-`.
- Fielding events use event log scope queries with `competitionType: 'elimination'` and the run id.
- Playoff leaders use `playoffStats`, not season stores, but fielding leader metrics consult event log scope for the elimination run.

## 13. Sync And Persistence Registry

Elimination-related synced stores:

- `kbl-app-meta.eliminationList`
- `kbl-playoffs.playoffs`
- `kbl-playoffs.series`
- `kbl-playoffs.playoffStats`
- `kbl-tracker.completedGames`
- `kbl-tracker.eliminationRunFameAggregates`
- `kbl-tracker.eliminationAllTimePlayerStats`
- Almanac/reporter stores that include elimination data by mode/context.

Elimination-related stores/databases not listed in `SYNC_REGISTRY`:

- Per-run `kbl-elimination-${eliminationId}` databases.
- `kbl-tracker.rosterSnapshots`.
- `kbl-tracker.mojoFitnessSnapshots`.

This is listed again as a gap because those stores are required to launch future games.

## 14. Reset Behavior

`resetDerivedCompetitionData`:

- Lists all eliminations.
- For each elimination:
  - Calls `deleteElimination`.
  - Deletes run Fame aggregate.
  - Deletes completed game data for `competitionType: elimination` and that run id.
  - Deletes event log data for `competitionType: elimination` and that run id.
- Clears broad tracker stores, including completed games, current game, season/career stats, almanac, run Fame, all-time elimination stats, commentary, stories, reporter caches, narrative context, rivalry scores.
- Calls `deleteEliminationAllTimeStats`.
- Deletes entire `kbl-playoffs` and `kbl-event-log` databases with `Promise.allSettled`.

## 15. Playwright Journey Coverage

`playwright.elimination.config.ts`:

- Test dir: `test-utils/elimination-journeys`.
- Base URL: `http://localhost:5173`.
- Web server: `npm run dev`.

Journey tests cover:

- Creating a bracket.
- Playing one elimination game.
- Stats flow to Leaders tab.
- Completing opening round and advancing bracket.
- Team Hub lineup edit and rotation persistence.

The tests clear all IndexedDB databases before each test.

## 16. Recreate-Current-Behavior Checklist

To recreate current behavior from scratch, implement these pieces in this order:

1. Add `CompetitionType = 'elimination'` to persisted game, completed game, event log, reporter, and proxy schemas.
2. Add root routes for selector, setup, hub, game tracker, post-game, and Almanac elimination browser.
3. Create `eliminationList` metadata store in `kbl-app-meta`.
4. Create per-run copied DB support named `kbl-elimination-${eliminationId}` with `players` and `teams`.
5. Copy selected source league teams and effective source league players into that per-run DB during run creation.
6. Create `rosterSnapshots` in `kbl-tracker` with `eliminationId` and `teamId` indexes.
7. Snapshot source League Builder rosters and copied run players for each selected team.
8. Create `mojoFitnessSnapshots` in `kbl-tracker` keyed by `[eliminationId, playerId]`.
9. Add `sourceType` and `eliminationId` to playoff configs.
10. Make playoff season number index non-unique.
11. Create elimination playoff config with all teams assigned to single Eastern bracket, `conferenceChampionship: false`, `seasonId = elimination-${eliminationId}`.
12. Generate first-round series manually from seed order.
13. Implement selector list/open/delete.
14. Implement setup wizard with source league, bracket size, series lengths, innings, DH, reporter toggles, exact team selection, seed ordering, and create call.
15. Implement hub loading by elimination id and linked playoff id.
16. Implement bracket tab with series cards, manual home-team selection, GameTracker launch state, and reporter assignment panel.
17. Implement Team Hub against roster snapshots and mojo/fitness snapshots.
18. Implement GameTracker resolution/restoration of elimination competition context.
19. Initialize GameTracker games with `competitionType: elimination`, `competitionId`, `statsScopeId`, playoff context, rosters, rules, and toggles.
20. On game completion, aggregate to season-style stats under `elimination-${eliminationId}`.
21. Record series game, mark losers eliminated, create next-round series, complete playoff/elimination metadata.
22. Aggregate game to playoff stats.
23. Archive completed game with elimination context.
24. Append run Fame and all-time elimination stats.
25. Return post-game summary to `/elimination/${runId}`.
26. Expose run Fame standings and promotion candidates on post-game.
27. Store accepted/dismissed promotion decisions in run Fame aggregate; accepted promotions write a League Builder override using run id as league id.
28. Register elimination players into Almanac canonical registry with mode `elimination`.
29. Add Almanac elimination game browser, player instance views, all-time elimination stat display, and narrative filtering.
30. Add delete/reset handling and sync registry entries matching current code.

## 17. Gaps, Orphans, And Logic That Does Not Fully Add Up

This section is intentionally separate from the spec above. These are not proposed fixes; they are observations of code that appears inconsistent, incomplete, or surprising.

### 17.1 Single-bracket mode hardcodes every team into Eastern

`createEliminationRun` maps every selected team to `league: 'Eastern'`, sets `leagues: ['Eastern']`, and sets `conferenceChampionship: false`. That matches the current single-bracket advancement path, but it ignores the source league’s actual conferences/divisions. If the intended mode is generic “playoffs from a league,” this loses source structure. If the intended mode is always one single elimination bracket, it is coherent.

### 17.2 Round names are inconsistent between setup, first round, and advanced rounds

Setup/first-round naming uses `Semi-Finals`, `Quarter-Finals`, `First Round`, while `playoffStorage.getRoundName` names remaining rounds as `Conference Championship`, `Division Series`, and `Wild Card`. For an 8-team single bracket, first round can be `Quarter-Finals`, but the next round generated by `createNextRoundSeries` can be `Conference Championship` instead of `Semi-Finals`.

### 17.3 Selector deletion does not remove all elimination-derived data

`deleteElimination` deletes metadata, linked playoff, roster snapshots, mojo/fitness snapshots, and the per-run copied DB. It does not delete:

- completed game records for that elimination run,
- event log records for that elimination run,
- run Fame aggregate,
- all-time elimination stat contributions,
- League Builder override rows created for accepted run Fame promotions with `leagueId = runId`.

`resetDerivedCompetitionData` handles some of this globally, but individual delete from the selector leaves archived/aggregate data behind.

### 17.4 All-time elimination stats cannot subtract deleted runs

All-time elimination stats are global by `playerId` and idempotent by game id. There is no per-run delete/subtract path. If one run is deleted, its all-time contributions remain unless the entire all-time store is cleared.

### 17.5 Required launch data is not synced

`syncConfig.ts` syncs elimination metadata, playoff config/series/stats, completed games, run Fame, and all-time stats. It does not sync:

- per-run `kbl-elimination-${eliminationId}` copied player/team DBs,
- `rosterSnapshots`,
- `mojoFitnessSnapshots`.

Those are required to launch additional games and to preserve Team Hub edits/conditions. A synced/restored environment could have an elimination bracket that can be listed but lacks launchable roster data.

### 17.6 Team Hub always edits the DH lineup

`EliminationTeamHub` calls `getNormalizedEliminationLineup(snapshot)` without passing bracket `useDH`, so it always normalizes using the default `useDH = true`. It persists edits to `lineup`, not `lineupWithoutDH`. Game launch can use no-DH lineups through `buildEliminationGameTrackerRoster(..., playoffConfig.useDH)`, but Team Hub does not expose no-DH editing.

### 17.7 `lineupWithoutDH` can be updated by storage but has no current UI path

`updateEliminationRosterSnapshot` accepts `lineupWithoutDH`, but `EliminationTeamHub.persistUpdates` only permits `lineup` and `startingRotation`. This looks like an implemented storage capability without an active editing surface.

### 17.8 Team Hub rotation display is not normalized

Game launch uses `getNormalizedEliminationRotation`, which appends pitcher ids missing from `snapshot.startingRotation`. Team Hub displays only `snapshot.startingRotation`. If a snapshot rotation is incomplete, hidden pitchers can still be used by game launch but cannot be promoted in Team Hub’s rotation list.

### 17.9 `saveEliminationPlayer` and `saveEliminationTeam` appear unused

The per-run DB exposes save APIs, but current UI code only reads from the copied DB after creation. Team Hub edits roster snapshots and mojo/fitness snapshots, not copied player/team records.

### 17.10 Accepted Fame promotions store overrides in League Builder under a run id

`acceptFamePromotion` calls `setLeaguePlayerOverride(runId, playerId, ..., { fameTierOverride })`. This is how PlayerInstanceCard later sees the run-specific override, because it also calls `getLeaguePlayerOverride(instanceId, playerId)`. It works as current behavior, but it means elimination-run overrides live inside League Builder override storage using an id that is not a League Builder league id.

### 17.11 Promotion overrides are not cleaned up on run delete/reset

Because accepted promotion overrides are in League Builder override storage under `leagueId = runId`, and deletion/reset paths do not scan/delete those override rows, accepted promotion data can remain after a bracket is deleted.

### 17.12 Playoff stats `sourceType` is never set for new elimination stats

`PlayoffPlayerStats` includes optional `sourceType`, but `aggregateGameToPlayoffStats` writes `sourceType: existing?.sourceType`. New elimination playoff stat rows therefore keep `sourceType` undefined. Current leaders filter by `playoffId`, so this does not break Leaders, but the field is not populated.

### 17.13 Game completion archives the same completed game twice on first aggregation

`processCompletedGame` archives the game once, then the surrounding end-game flow archives it again with fuller context and inning scores. Both use the same `gameId`, so the later put overwrites the earlier record if it succeeds. If the second archive fails, an earlier, less contextual archive may remain.

### 17.14 Tie protection is not visible in series winner calculation

When recording a series game, winner id is `homeTeamId` if home score is greater than away score; otherwise it is `awayTeamId`. If a tied game reaches this code, away team wins by default. There may be upstream GameTracker prevention, but this specific elimination/playoff completion code does not guard against ties.

### 17.15 `SETUP` metadata status is mostly transitional

`createElimination` creates status `SETUP`, but the normal UI only calls `createEliminationRun`, which immediately proceeds through copy/snapshot/playoff creation and updates status to `IN_PROGRESS`. There is no current selector/setup route for resuming a saved `SETUP` bracket.

### 17.16 History tab uses raw playoff `seasonId` as title

History entries title completed elimination runs with `entry.playoff.seasonId.toUpperCase()`, e.g. `ELIMINATION-ELIM-...`, not the elimination metadata name. It does not load elimination metadata for each history entry.

### 17.17 Current Playwright journey helpers appear out of sync with UI text/behavior

The elimination journey helper clicks text `PLAYOFFS` from the app home, but current `AppHome` link text is `ELIMINATION`. The helper also starts a game by clicking `PLAY GAME` without selecting a home team, while current `SelectedSeriesPanel` disables `PLAY GAME` until a home team is selected. This suggests tests may not match current UI.

### 17.18 Team Hub journey assertion mixes rotation and lineup expectations

The E-5 test clicks `MAKE NEXT`, which changes starting rotation, then expects a lineup select value to change. In current Team Hub code, `handlePromoteStarter` only updates `startingRotation`.

### 17.19 Secondary route table lacks selector/setup routes

`src/src_figma/app/routes.tsx` includes `/elimination/:eliminationId` only. Root `src/App.tsx` has full routes. If the secondary route table is still used anywhere, selector/setup would be missing there.

### 17.20 `playoffGames` store exists but series games are stored on series records

`kbl-playoffs.playoffGames` exists and is mentioned in storage comments, but current elimination game results are stored in `PlayoffSeries.games`. Sync config also says `playoffGames` is excluded because the store exists but is never written.

### 17.21 No current UI for editing copied elimination players/teams after creation

The copied per-run DB freezes players/teams at creation, but the user-facing edit surface only changes lineup, rotation, mojo, and fitness snapshots. There is no current route to edit copied player/team records directly.

### 17.22 Team Page loads team metadata from global League Builder

Almanac `TeamPage` resolves elimination mode from completed games, but team details come from global `getTeam(teamId)`, not the per-run copied elimination DB. If the global team changes after a run, archived team page metadata may reflect current global team state rather than frozen run state.

### 17.23 Roster snapshot creation depends on live League Builder rosters

Creation copies players/teams into the per-run DB, but roster lineups/rotation are read from live League Builder `getTeamRoster(teamId)`. This is expected during creation, but it means a valid copied team without a League Builder roster causes bracket creation to fail.

### 17.24 `deleteEliminationAllTimeStats` does not sync removals

The append path sync-upserts touched all-time player stats. `deleteEliminationAllTimeStats` clears the store but does not iterate sync removals. If sync expects tombstones/removes for cleared all-time records, this path does not emit them.

### 17.25 Bracket card shows default home team but launch requires explicit selection

Series cards display `NEXT GAME ... HOME: {defaultPatternHome}`. The selected series panel requires manual home selection and does not preselect that default. So the card’s displayed home team is informational only until the user explicitly chooses.

