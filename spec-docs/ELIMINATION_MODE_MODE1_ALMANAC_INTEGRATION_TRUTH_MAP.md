# Elimination Mode -> Mode 1 (League Builder) -> Almanac Integration Truth Map

Strict factual canon note: for the tightest evidence-backed version of this seam, use `ELIMINATION_MODE_EVIDENCE_BACKED_ASSERTION_LEDGER.md` first. This document remains a narrower narrative explanation of the same integration path.

## Scope

This document is intentionally narrow.

It covers only:

1. How Elimination setup reads from Mode 1 / League Builder.
2. How Elimination runtime carries or rewrites that data.
3. How Elimination game outputs write into shared stat stores.
4. How the current Almanac/Museum path reads those stores.
5. What is and is not robust today for stat/user reference.

It does not attempt to document unrelated franchise systems except where they are the actual storage/read path used by Elimination or Museum.

## Verification method

This document is based on direct re-reading of the live code paths in:

- `src/src_figma/app/pages/EliminationSetup.tsx`
- `src/src_figma/hooks/useLeagueBuilderData.ts`
- `src/utils/leagueBuilderStorage.ts`
- `src/utils/eliminationManager.ts`
- `src/utils/eliminationRosterStorage.ts`
- `src/src_figma/app/components/EliminationTeamHub.tsx`
- `src/src_figma/app/pages/EliminationHome.tsx`
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- `src/utils/seasonAggregator.ts`
- `src/utils/milestoneAggregator.ts`
- `src/utils/seasonStorage.ts`
- `src/utils/careerStorage.ts`
- `src/utils/playoffStorage.ts`
- `src/utils/eliminationAwards.ts`
- `src/utils/gameStorage.ts`
- `src/utils/trackerDb.ts`
- `src/utils/mojoFitnessStorage.ts`
- `src/src_figma/hooks/useMuseumData.ts`
- `src/utils/museumPipeline.ts`
- `src/utils/museumStorage.ts`
- `src/src_figma/app/components/MuseumContent.tsx`

Where this document uses the word "inference", it means control-flow inference from code. Everything else is a direct code fact.

## Executive truth

The current integration chain is:

1. League Builder is the source of truth for league membership, teams, players, and rosters at Elimination setup time.
2. Elimination setup freezes only a partial roster snapshot from League Builder.
3. Elimination runtime launches GameTracker from that frozen snapshot, but also mixes in live team branding/stadium data from League Builder at launch time.
4. Once GameTracker starts, stable League Builder player IDs are replaced as canonical game-session IDs by side/name IDs like `away-jane-doe` and `home-jane-doe`.
5. End-of-game aggregation writes season, career, playoff, milestone, and completed-game records keyed by those rewritten player IDs, while preserving original team IDs.
6. The current Museum/Almanac path does not read Elimination directly. It reads museum stores, and when all-time leaders are empty it backfills them from career storage.
7. Therefore:
   - team identity continuity from League Builder into Elimination stats is mostly preserved
   - player identity continuity from League Builder into Elimination-derived stat reference is not preserved
   - robust player-level Almanac reference is not currently guaranteed

## Part 1: What Mode 1 / League Builder actually owns

League Builder data comes from `kbl-league-builder` IndexedDB via `leagueBuilderStorage`.

### League Builder entities

`leagueBuilderStorage.ts` defines:

- `LeagueTemplate`
  - `id`
  - `name`
  - `teamIds`
  - optional conference/division structure
- `Team`
  - `id`
  - `name`
  - branding fields (`colors`, `logoUrl`)
  - stadium fields (`stadium`, `stadiumCapacity`)
  - optional manager fields
- `Player`
  - stable `id`
  - name fields
  - ratings, handedness, personality/chemistry, morale, mojo, fame
  - `currentTeamId`
  - `rosterStatus`
- `TeamRoster`
  - `teamId`
  - `mlbRoster`
  - `farmRoster`
  - `lineupVsRHP`
  - `lineupVsLHP`
  - `startingRotation`
  - bullpen/depth-chart/pinch-run/pinch-hit/defensive-sub fields

### How Elimination sees League Builder data

`useLeagueBuilderData()` is a thin UI hook over that storage. On load it:

- initializes the League Builder DB
- initializes default rules presets
- loads all leagues, teams, players, and rules presets

It does not transform League Builder identities. The hook re-exposes League Builder objects and direct CRUD wrappers.

## Part 2: Exact handoff from Mode 1 into Elimination setup

### Elimination setup reads leagues and teams from League Builder

`EliminationSetup.tsx` uses `useLeagueBuilderData()`.

Its setup flow is:

1. User selects a `LeagueTemplate`.
2. `leagueTeams` is built by filtering all League Builder teams to `selectedLeague.teamIds`.
3. That result is sorted by `team.name`.
4. `controlledTeamIds` defaults to all teams in the selected league.
5. `seededTeamIds` defaults to the first `numTeams` teams in that name-sorted list.
6. `bracketName` defaults to `"{league.name} Playoffs"`.

### Important setup truths

- Seeding defaults are alphabetical-by-team-name, not standings-based.
- `controlledTeamIds` is collected in setup UI, but the start-playoff creation path does not persist it into elimination metadata, playoff storage, or GameTracker navigation state.
- `homeFieldPattern` is collected in setup UI, shown in the confirmation step, but is not passed into playoff creation or used by series-game launch logic.
- `inningsPerGame` and `useDH` are passed into playoff creation and then into GameTracker navigation state.

## Part 3: What Elimination setup persists

When the user starts playoffs, `EliminationSetup.tsx` does three durable things in sequence:

1. creates elimination metadata
2. creates frozen roster snapshots
3. creates playoff/bracket rows and first-round series

There is no rollback across those steps.

### 3.1 Elimination metadata

`createElimination()` writes to `eliminationList` in the shared app-meta DB.

Stored fields are:

- `eliminationId`
- `name`
- `leagueId`
- `leagueName`
- `status`
- `createdAt`
- `lastPlayedAt`
- `teamsCount`
- `currentRound`
- optional later `champion`
- optional later `awards`

### 3.2 Frozen roster snapshots

`createRosterSnapshots(eliminationId, teamIds)` builds one snapshot per selected team.

For each team it reads, in parallel:

- `getTeam(teamId)`
- `getTeamRoster(teamId)`
- `getPlayersByTeam(teamId)`

Then it stores a snapshot containing:

- `eliminationId`
- `teamId`
- `teamName`
- `players`
- `lineup`
- `startingRotation`
- `snapshotAt`

### 3.3 Exactly what gets frozen

The snapshot is built from:

- `players = getPlayersByTeam(teamId)`
- `lineup = roster.lineupVsRHP`
- `startingRotation = roster.startingRotation`

That means the snapshot freezes:

- League Builder player records as they exist at setup time
- the `lineupVsRHP` batting order/field positions
- the starting rotation order

That also means the snapshot does **not** freeze:

- `lineupVsLHP`
- `mlbRoster`
- `farmRoster`
- `closingPitcher`
- `setupPitchers`
- `depthChart`
- `pinchHitOrder`
- `pinchRunOrder`
- `defensiveSubOrder`

### 3.4 Important roster-snapshot consequence

`getPlayersByTeam(teamId)` reads players by `currentTeamId`, not by `mlbRoster`.

So the frozen `snapshot.players` array is "all players whose `currentTeamId` equals this team", not "only players present in `TeamRoster.mlbRoster`".

Practical consequence:

- Elimination bench construction can include players who belong to the team in League Builder but are not explicitly part of the MLB roster array.
- This is direct code behavior, not a guess.

## Part 4: How the frozen roster is edited after setup

`EliminationTeamHub.tsx` works directly against stored roster snapshots.

It loads snapshots with:

- `getAllEliminationRosterSnapshots(eliminationId)`
- `getEliminationRosterSnapshot(eliminationId, teamId)`

It persists changes with:

- `updateEliminationRosterSnapshot(eliminationId, teamId, updates)`

### What Team Hub can modify

It can modify:

- lineup order
- lineup player assignment
- lineup fielding positions
- starting rotation order

### What Team Hub cannot modify

It does not modify:

- the frozen `players` array
- bullpen roles
- lineups vs LHP
- any League Builder source data

### Normalization rules used by Team Hub and launch

`getNormalizedEliminationLineup(snapshot)`:

- starts from snapshot `lineup`
- removes invalid entries where the player is missing or is a pitcher
- preserves order by `battingOrder`
- removes duplicate player IDs
- keeps existing fielding positions
- fills missing spots from remaining non-pitchers in `snapshot.players`
- assigns fallback fielding positions from primary, then secondary, then first unused field slot, else `DH`
- stops at 9 lineup slots

`getNormalizedEliminationRotation(snapshot)`:

- keeps existing `startingRotation` entries that still exist among pitcher IDs
- appends any remaining pitchers from `snapshot.players`

## Part 5: Exact handoff from Elimination runtime into GameTracker

`EliminationHome.tsx` launches games via `handlePlayGame(series)`.

For launch it reads:

- frozen roster snapshot for away team
- frozen roster snapshot for home team
- live League Builder team row for away team
- live League Builder team row for home team

### What comes from frozen data

These are built from `buildEliminationGameTrackerRoster(eliminationId, teamId)`:

- `awayPlayers`
- `awayPitchers`
- `homePlayers`
- `homePitchers`

These reflect the frozen snapshot plus any later snapshot edits from Elimination Team Hub.

### What comes from live League Builder data at launch time

These come from `getTeam(teamId)` at launch time:

- team colors
- team secondary/border colors
- stadium name fallback

### Mixed-truth consequence

Elimination launch uses:

- frozen roster/lineup truth
- live team-branding/stadium truth

So if a League Builder team's colors or stadium are edited after bracket creation, Elimination games will reflect those later live edits, even though roster data remains frozen from setup.

## Part 6: How frozen League Builder players are converted before game start

`buildEliminationGameTrackerRoster()` converts snapshot players into GameTracker roster objects.

`convertToGameTrackerPlayer()` and `convertToGameTrackerPitcher()` preserve the original League Builder `player.id` in a `playerId` field on the roster objects passed into navigation state.

At this moment, the stable League Builder player ID still exists in the payload.

## Part 7: Where stable player identity is lost

The critical identity break happens in `GameTracker.tsx`.

### GameTracker explicitly keeps name-based session IDs

The file documents its own behavior:

- League Builder `playerId` is available on roster objects for cross-referencing
- game-session IDs remain name-based for backward compatibility

### Game initialization rewrites IDs

When GameTracker initializes a new game, it builds:

- `awayLineup` entries with `playerId: away-{normalized-name}`
- `homeLineup` entries with `playerId: home-{normalized-name}`
- `awayBench` entries with the same side/name pattern
- `homeBench` entries with the same side/name pattern
- starting pitcher IDs with the same side/name pattern

These rewritten IDs are what get passed into `initializeGame()`.

### Canonical result inside `useGameState`

Inside `initializeGame(config)`:

- lineup refs store the rewritten IDs
- lineup-state refs store the rewritten IDs
- `playerStats` map is initialized by rewritten player ID
- `pitcherStats` map is initialized by rewritten pitcher ID
- `gameState.currentBatterId` and `currentPitcherId` use rewritten IDs

From that point on, the active baseball logic uses rewritten IDs, not stable League Builder player IDs.

## Part 8: What identity survives during gameplay

### Team identity

Original team IDs survive.

`initializeGame()` receives:

- `awayTeamId`
- `homeTeamId`

and stores them directly in `gameState`.

Later persisted player and pitcher rows derive `teamId` from those stable team IDs.

### Player identity

Stable League Builder player IDs do not remain canonical in gameplay state.

Canonical gameplay identity becomes:

- `away-{normalized-name}`
- `home-{normalized-name}`

### Immediate implications

1. The same real League Builder player can produce different stat IDs across games if the player's side changes.
2. Even within one bracket, a team that is home in one game and away in another will emit different player IDs for the same human/player record.
3. There is no durable crosswalk written alongside season/career/playoff stats that maps the rewritten ID back to the original League Builder `player.id`.

I did not find a live code path that persists such a crosswalk.

## Part 9: What GameTracker writes at end of an Elimination game

At game end, `GameTracker.tsx` computes:

- `computedSeasonId = navigationState.seasonId` for Elimination, which is `elimination-{eliminationId}`

It then calls `hookEndGame(endGameOptions)` with that season ID.

### Important mismatch: initialize-time season ID vs end-game season ID

At game initialization, `GameTracker.tsx` passes:

- franchise season ID for franchise games
- otherwise `'season-1'`

So for Elimination:

- `initializeGame()` starts with `seasonId: 'season-1'`
- `hookEndGame()` later aggregates using `seasonId: 'elimination-{eliminationId}'`

This means:

- end-game season aggregation uses the elimination season ID
- game header creation at initialization used the non-elimination default

This is a real internal season-context mismatch.

## Part 10: How end-game aggregation builds persisted stat rows

Inside `useGameState.endGame()`:

### 10.1 Player stat rows

It builds `playerStatsRecord` from the live `playerStats` map.

Each row is keyed by rewritten `playerId`.

For each row it writes:

- `playerName` from lineup refs
- `teamId` as `awayTeamId` or `homeTeamId`
- batting counting stats
- fielding tallies resolved from fielding-event logs

So:

- player ID is rewritten side/name ID
- team ID is original team ID

### 10.2 Pitcher stat rows

It builds `pitcherGameStatsArray` from the live pitcher-stats map.

Each row uses:

- `pitcherId` = rewritten side/name ID
- `pitcherName`
- `teamId` = original away/home team ID

Again:

- pitcher identity is rewritten
- team identity is preserved

### 10.3 Fielding resolution

Fielding events are read from IndexedDB and mapped back from position-based event IDs to current lineup player IDs using:

- lineup position
- team ID

That resolution maps fielding totals onto the rewritten player IDs present in lineup refs.

So fielding aggregation follows the same identity split:

- preserved team ID
- rewritten player ID

## Part 11: Which shared stores Elimination games write into

If a game has not already been aggregated, `useGameState.endGame()` runs:

1. `processCompletedGame(persistedState, aggregationOptions)`
2. `markGameAggregated(gameId)`
3. playoff series result recording if playoff context exists
4. `aggregateGameToPlayoffStats(playoffId, persistedState)` if playoff context exists
5. completed-game archive

### 11.1 Season stats store

`aggregateGameToSeason()` writes:

- batting season stats
- pitching season stats
- fielding season stats
- fame aggregation
- milestone/career aggregation

Season rows use keys:

- batting: `[seasonId, playerId]`
- pitching: `[seasonId, playerId]`
- fielding: `[seasonId, playerId]`

For Elimination games:

- `seasonId` at aggregation time is `elimination-{eliminationId}`
- `playerId` is the rewritten side/name ID
- `teamId` inside each row is the original League Builder team ID

### 11.2 Career stats store

Career rows use key:

- `playerId`

Career aggregation in `milestoneAggregator.ts` uses:

- `playerId` from `gameState.playerStats` for batters
- `pitcherId` from `gameState.pitcherGameStats` for pitchers

So Elimination contributes career totals under rewritten side/name player IDs.

This is the biggest Almanac-reference problem in the current architecture.

### 11.3 Playoff stats store

`aggregateGameToPlayoffStats()` writes `PlayoffPlayerStats` keyed by:

- `id = {playoffId}-{playerId}`
- `playerId`

Again:

- `playerId` is rewritten side/name ID
- `teamId` is preserved original team ID

Elimination awards later read from this playoff stats store, so award identity inherits the same rewritten player IDs.

### 11.4 Completed games archive

`archiveCompletedGame()` writes:

- `seasonId` from the end-game options if passed
- `playerStats`
- `pitcherGameStats`

For Elimination end-game calls, the archive receives `seasonId: elimination-{eliminationId}`.

So completed-game records do preserve the Elimination season ID at archive time even though game initialization used `'season-1'`.

### 11.5 Mojo/Fitness snapshots

After `hookEndGame()`, `GameTracker.tsx` saves Elimination mojo/fitness snapshots using `playerStateHook.getAllPlayers()`.

Those snapshots are keyed by:

- `[eliminationId, playerId]`

The `playerId` saved there is the rewritten gameplay `playerId`, not the original League Builder `player.id`.

This means the between-game mojo/fitness system inside Elimination also follows rewritten player identity after games begin.

## Part 12: What does and does not remain tied to original League Builder identity

### Preserved from Mode 1 into Elimination-derived stats

- `leagueId` in elimination metadata
- `leagueName` in elimination metadata
- team IDs
- team names
- frozen player attributes at setup time inside snapshots
- lineup-vs-RHP structure at setup time
- starting rotation at setup time

### Lost or rewritten before shared stat persistence

- stable League Builder `player.id` as canonical gameplay/stat key
- side-independent player identity across home/away contexts
- direct one-to-one player lookup compatibility between League Builder player rows and season/career/playoff stat rows

## Part 13: Current Almanac/Museum path

There is no direct Elimination -> Museum write path in the live Elimination modules.

Within the scoped search, museum storage mutators are called from:

- `useMuseumData.ts`
- `museumPipeline.ts`

I did not find Elimination setup, Elimination home, GameTracker Elimination flow, or playoff storage directly writing museum championship/award/record/standing rows.

### 13.1 What Museum actually loads

`useMuseumData()` loads:

- championships
- team records
- award winners
- all-time leaders
- hall of fame
- records
- moments
- retired jerseys
- stadiums

### 13.2 Auto-population behavior

If `allTimeLeaders` is empty, `useMuseumData()` calls `populateMuseumLeaders()`.

If `allTimeLeaders` is **not** empty, it does not auto-rebuild leaders from career data.

That means Museum all-time leaders are not a continuously synchronized live view of career storage.

They are:

- auto-seeded from career storage only when the leader store is empty
- otherwise whatever is already in the museum leader store

### 13.3 What `populateMuseumLeaders()` reads

`populateMuseumLeaders()` reads:

- `getAllCareerBatting()`
- `getAllCareerPitching()`

It converts each career row into an `AllTimeLeader` record.

So Museum all-time leaders currently inherit whatever identity exists in career storage.

### 13.4 Important Museum leader limitation

`museumPipeline.ts` sets:

- `playerId = career.playerId`
- `teamId = career.teamId`
- `teamName = ''`

So leader rows auto-generated from career data preserve the stored player/team IDs, but leave `teamName` blank unless something else later fills it.

`MuseumContent.tsx` displays `team: l.teamName`, so auto-generated leaders can have empty team-name display.

## Part 14: Which Almanac/Museum surfaces are actually fed by Elimination today

### 14.1 All-time leaders

Potentially yes, but indirectly.

Path:

Elimination game -> career storage -> museum pipeline -> museum all-time leaders

Conditions:

- career rows exist
- museum leader store is empty, or some explicit repopulation/update path is run later

Identity quality:

- player IDs are rewritten side/name IDs
- team IDs are preserved
- team names may be blank in leader rows populated by `museumPipeline`

### 14.2 Team season history

No automatic Elimination path found.

`useMuseumData.getTeamHistory(teamId)` reads `seasonStandings` from museum storage.

I did not find a live Elimination code path writing season standings into museum storage.

### 14.3 Award history

No automatic Elimination-to-museum path found.

`useMuseumData.getAwardsByPlayer(playerId)` reads museum `awardWinners`.

Elimination awards are instead computed into Elimination metadata using playoff stats and stored on the elimination record, not museum award storage.

### 14.4 Records / moments / retired jerseys / stadium history

No automatic Elimination-to-museum path found in the live scoped code.

## Part 15: Exact robustness of stat referencing today

### Team-level reference robustness

Relatively stronger.

Because team IDs remain original across:

- Elimination metadata
- playoff teams
- GameTracker navigation state
- persisted player/pitcher stat rows
- season rows
- career rows' `teamId` field
- playoff stats rows
- museum leader `teamId`

Team-level joins and references have a real stable key.

### Player-level reference robustness

Not robust.

Reasons:

1. League Builder stable `player.id` is present at snapshot/build time but not retained as the canonical stat key.
2. GameTracker rewrites canonical player identity to `home-{name}` / `away-{name}`.
3. Season storage keys on that rewritten ID.
4. Career storage keys on that rewritten ID.
5. Playoff stats key on that rewritten ID.
6. Elimination awards key on that rewritten ID.
7. Museum all-time leaders inherit that rewritten ID from career storage.
8. Museum award lookups are by stored `playerId`, but Elimination does not write museum award rows anyway.

### Specific failure modes

#### Same player, different side across games

If the same team plays one game as home and another as away, the same player produces different IDs, for example:

- `home-jane-doe`
- `away-jane-doe`

Those are separate season/career/playoff identities.

#### Stable LB player lookup cannot directly resolve stat rows

If a user references a player by the original League Builder `player.id`, current Elimination-derived season/career/playoff rows are not keyed by that ID.

#### Name-collision risk

Because IDs are name-derived within side, distinct players with the same display name on the same side can collide.

This is a direct architectural risk of the naming strategy.

#### Museum leader sync gap

Even if career rows were acceptable, Museum all-time leaders only auto-populate when the leaders store is empty.

So newly accumulated Elimination stats may not appear in Museum leaders unless the leader store is empty or an explicit repopulation/update action occurs.

## Part 16: Elimination-specific awards vs Museum awards

Elimination awards are computed in `EliminationHome.tsx` only after the bracket is complete.

Path:

1. `computeEliminationAwards(playoffId)`
2. read `getPlayoffStats(playoffId)`
3. derive awards
4. write them into `updateElimination(eliminationId, { awards })`

This means:

- Elimination awards live on elimination metadata
- they are not museum `awardWinners`
- they use playoff-stat identities
- therefore they also inherit rewritten player IDs

## Part 17: Setup-only or metadata-only fields that do not currently connect through

### `controlledTeamIds`

Present in Elimination setup UI.

Current live connection:

- setup state only
- confirmation summary only

I did not find it persisted into elimination metadata, playoff config, or GameTracker state.

### `homeFieldPattern`

Present in Elimination setup UI and confirmation summary.

I did not find it persisted into playoff series/game-home logic.

Series home-team selection when launching a game is determined from existing series seed/home logic, not from the setup field.

### `leagueId` and `leagueName`

These are persisted on elimination metadata and displayed on Elimination home.

They are descriptive metadata, not active join inputs for stat aggregation.

## Part 18: What is 100% true today about "how Elimination setup ties into Elimination mode"

1. Elimination setup chooses a League Builder league and derives eligible teams from `league.teamIds`.
2. It seeds teams from that pool, defaulting to alphabetical-by-name ordering.
3. It freezes team/player/roster data into roster snapshots using League Builder team, roster, and players-by-team reads.
4. Those snapshots become the durable roster source for later Elimination games.
5. The Elimination Team Hub edits those snapshots, not League Builder source data.
6. Game launch uses frozen roster snapshots plus live team branding/stadium reads.
7. GameTracker then rewrites stable player IDs into side/name IDs for live gameplay.
8. Shared stat aggregation writes Elimination-derived rows keyed by those rewritten IDs.

## Part 19: What is 100% true today about "how Elimination ties into the Almanac"

1. There is no direct Elimination -> Museum write pipeline in the scoped live code.
2. Elimination does write into shared season, career, playoff, completed-game, and mojo/fitness stores.
3. Museum all-time leaders can indirectly reflect Elimination contributions only through career storage.
4. Museum standings, award history, records, moments, retired jerseys, and similar views are not automatically fed by the Elimination path I traced.
5. Player-level Almanac reference is currently weakened by the rewrite from League Builder player IDs to `home-/away-name` stat IDs.
6. Team-level Almanac reference is materially stronger because original team IDs survive the Elimination flow.

## Bottom line

The current architecture gives Elimination a real, partially frozen dependency on Mode 1 / League Builder, but it does not preserve stable player identity from Mode 1 into shared stat-reference stores.

If the goal is robust Almanac-style user stat referencing, the current blocker is not "missing stats." The blocker is identity continuity:

- Mode 1 player source key: stable League Builder `player.id`
- Elimination gameplay/stat key: rewritten `home-/away-name` ID
- Museum all-time leader source key: whatever career storage already has

So the exact current state is:

- setup-to-roster continuity: real
- team-ID continuity: real
- player-ID continuity: broken
- direct Elimination-to-Museum pipeline: absent
- indirect Elimination-to-Museum all-time-leader contribution: partial and stale-prone
