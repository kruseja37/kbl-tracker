# Elimination Mode Current Functional Logic Bible

Last verified: March 9, 2026

Strict factual canon note: for the tightest evidence-backed version of the elimination analysis, use `ELIMINATION_MODE_EVIDENCE_BACKED_ASSERTION_LEDGER.md` first. This bible remains useful as a narrative system map, but it includes more synthesis than the assertion ledger.

Scope: current elimination-mode implementation in `src/src_figma` plus the production storage and aggregation modules it actually calls under `src/utils` and `src/engines`.

Intent of this document: describe, in code-verified terms, what elimination mode currently is from a logic and functionality standpoint, independent of visual design preferences. This is not a desired-state spec. It is a current-state truth map.

Method:
- Re-read the live elimination-mode pages and the storage/aggregation helpers they call.
- Re-check the GameTracker and PostGameSummary branches used specifically by elimination launches.
- Re-check the underlying persistence stores instead of relying on older docs.
- Prefer direct code statements over prior documentation or memory.
- Call out any place where the UI collects a setting that the runtime logic does not actually use.

Primary files re-verified for this document:
- `src/App.tsx`
- `src/src_figma/app/pages/EliminationSelector.tsx`
- `src/src_figma/app/pages/EliminationSetup.tsx`
- `src/src_figma/app/pages/EliminationHome.tsx`
- `src/src_figma/app/components/EliminationTeamHub.tsx`
- `src/utils/eliminationManager.ts`
- `src/utils/eliminationRosterStorage.ts`
- `src/utils/mojoFitnessStorage.ts`
- `src/utils/playoffStorage.ts`
- `src/utils/eliminationAwards.ts`
- `src/engines/playoffEngine.ts`
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- `src/src_figma/app/pages/PostGameSummary.tsx`
- `src/utils/trackerDb.ts`
- `src/utils/franchiseManager.ts`
- `src/utils/processCompletedGame.ts`
- `src/utils/seasonAggregator.ts`
- `src/utils/milestoneAggregator.ts`
- `src/utils/managerStorage.ts`
- `src/src_figma/app/hooks/useFameTracking.ts`
- `src/src_figma/app/hooks/usePlayerState.ts`
- `src/src_figma/app/hooks/useFanMorale.ts`
- `src/engines/fameEngine.ts`

## 1. Executive Truth

The current elimination mode is not a separate baseball engine. It is a thin elimination-specific shell wrapped around three generic systems:

1. Elimination metadata in `kbl-app-meta`.
2. Generic playoff bracket storage in `kbl-playoffs`.
3. The same `GameTracker` / `useGameState` game engine used by the rest of the app.

In practical terms, elimination mode currently does five things:

1. Creates an elimination metadata record.
2. Freezes roster snapshots for the selected teams.
3. Creates a playoff bracket record plus first-round series records.
4. Launches games out of that bracket into `GameTracker`.
5. On game end, uses the generic playoff update path to record the result, aggregate playoff stats, and attempt bracket advancement.

The most important code-backed truths are:

- Elimination mode currently stores all bracket teams in a single conference (`Eastern`).
- The shared playoff advancement code still expects an East-vs-West championship series in the final round.
- Every elimination bracket is created with `seasonNumber: 1`, and `createPlayoff()` deletes any existing playoff record with the same `seasonNumber` and same `sourceType`.
- GameTracker converts elimination rosters to home/away name-based player IDs, not stable League Builder player IDs.
- That identity model affects game stats, playoff stats, season stats, career stats, fame aggregation, and mojo/fitness persistence.
- Setup captures more settings than the live runtime actually uses.

## 2. Runtime Surface

### 2.1 Routed pages

`src/App.tsx` exposes three elimination routes:

- `/elimination/select`
- `/elimination/setup`
- `/elimination/:eliminationId`

The actual runtime flow is:

1. `EliminationSelector` lists metadata slots from `eliminationList`.
2. `EliminationSetup` creates metadata, roster snapshots, playoff config, and round-1 series.
3. `EliminationHome` loads the metadata plus linked playoff bracket, then launches individual games into `/game-tracker/:gameId`.
4. `GameTracker` runs the game.
5. `PostGameSummary` returns to `/elimination/:eliminationId`.

### 2.2 Core storage locations

Elimination mode spans four IndexedDB databases:

- `kbl-app-meta`
  - `eliminationList`
  - stores elimination metadata only

- `kbl-playoffs`
  - `playoffs`
  - `series`
  - `playoffStats`
  - stores bracket structure, series progression, and playoff stat leaders input

- `kbl-tracker`
  - `rosterSnapshots`
  - `mojoFitnessSnapshots`
  - `currentGame`
  - `completedGames`
  - `playerSeasonBatting`
  - `playerSeasonPitching`
  - `playerSeasonFielding`
  - `playerCareerBatting`
  - `playerCareerPitching`
  - `playerCareerFielding`
  - `careerMilestones`

- `kbl-manager`
  - `managerDecisions`
  - `managerSeasonStats`
  - `managerProfiles`

## 3. Data Model

### 3.1 Elimination metadata

`eliminationManager.ts` stores one metadata row per elimination slot:

- `eliminationId`
- `name`
- `leagueId`
- `leagueName`
- `status`
  - `SETUP`
  - `IN_PROGRESS`
  - `COMPLETED`
- `createdAt`
- `lastPlayedAt`
- `teamsCount`
- `currentRound`
- optional `champion`
- optional `awards`

Behavioral truths:

- `createElimination()` always starts at `status: 'SETUP'`, `currentRound: 0`.
- `updateElimination()` always rewrites `lastPlayedAt` to `Date.now()` unless an explicit `lastPlayedAt` is provided.
- `listEliminations()` sorts newest activity first.
- `deleteElimination()` deletes only the metadata record.
- `deleteElimination()` does not delete the linked playoff record, linked series, roster snapshots, mojo snapshots, or completed games.
- `deleteEliminationRosterSnapshots()` and `deleteMojoFitnessSnapshots()` exist as utility functions but are not wired into elimination deletion.

### 3.2 Elimination roster snapshot

`eliminationRosterStorage.ts` stores one snapshot per `(eliminationId, teamId)`:

- `key`
- `eliminationId`
- `teamId`
- `teamName`
- `players`
  - full frozen `Player[]` at setup time
- `lineup`
  - copied from `TeamRoster.lineupVsRHP`
- `startingRotation`
  - copied from `TeamRoster.startingRotation`
- `snapshotAt`

Behavioral truths:

- Snapshot creation freezes current League Builder player objects and roster structure at bracket start.
- The snapshot uses `lineupVsRHP` only.
- `lineupVsLHP` is not stored or used by elimination mode.
- Later League Builder edits do not flow into an existing elimination bracket.
- `updateEliminationRosterSnapshot()` can change only `lineup` and `startingRotation`.
- `updateEliminationRosterSnapshot()` does not refresh `snapshotAt`.

### 3.3 Playoff config used by elimination mode

Elimination mode uses the generic `PlayoffConfig` shape with these elimination-specific choices:

- `sourceType: 'elimination'`
- `eliminationId`
- `seasonNumber: 1`
- `seasonId: elimination-${eliminationId}`
- `leagues: ['Eastern']`
- `conferenceChampionship: false`

That is important because the shared playoff engine still contains two-conference assumptions in its final-round advancement path.

## 4. Setup Flow

### 4.1 Supported bracket sizes

`EliminationSetup.tsx` only supports:

- 4 teams
- 8 teams
- 16 teams

This is hard-coded through `getValidTeamOptions()` and `Math.log2(numTeams)`.

There is no current support for:

- 2-team finals-only brackets
- non-power-of-two brackets
- byes
- play-in games

### 4.2 League loading and defaults

Setup uses `useLeagueBuilderData()`.

If there are no leagues and no load error, it auto-calls `seedSMB4Data(false)` once.

When a league is selected:

- teams are derived from `selectedLeague.teamIds`
- those teams are sorted alphabetically by `team.name`
- `controlledTeamIds` defaults to every team in the league
- `seededTeamIds` defaults to the first `numTeams` teams in that alphabetical list
- `bracketName` defaults to `${selectedLeague.name} Playoffs`

Important truth:

- Default seeding is alphabetical by team name, not standings-based.

### 4.3 Setup state the page collects

The page tracks:

- selected league
- number of teams
- per-round series lengths
- home-field pattern
- innings per game
- use DH
- controlled team IDs
- seeded team IDs
- bracket name

### 4.4 What setup actually persists and uses

`handleStartPlayoffs()` persists and uses:

- `bracketName`
- `selectedLeague.id`
- `selectedLeague.name`
- `numTeams`
- `seededTeamIds`
- `seriesLengths`
- `inningsPerGame`
- `useDH`

### 4.5 What setup collects but does not wire into live runtime behavior

The following setup values are currently not used by the live elimination runtime:

- `controlledTeamIds`
- `homeFieldPattern`

Specific code-backed consequences:

- `controlledTeamIds` is never written into elimination metadata, playoff config, or GameTracker route state.
- `homeFieldPattern` is never written into elimination metadata, playoff config, or series records.
- Home field for games is determined later by `getHomeFieldPattern()` from `playoffEngine.ts`, based only on `bestOf`.

### 4.6 Round-1 bracket creation

Setup creates first-round series manually, not through `generateBracket()`.

Pairings are:

- seed 1 vs seed N
- seed 2 vs seed N-1
- and so on

Round-1 series are created with:

- `status: 'PENDING'`
- `higherSeedWins: 0`
- `lowerSeedWins: 0`
- `games: []`
- `bestOf = gamesPerRound[0]`
- `gamesRequired = ceil(bestOf / 2)`

After that:

- `startPlayoff(playoff.id)` sets the playoff to `IN_PROGRESS` and `currentRound: 1`
- `updateElimination(eliminationId, { status: 'IN_PROGRESS', currentRound: 1 })`

## 5. Bracket Logic

### 5.1 Round naming

Round names are generated by `getRoundName(round, totalRounds)`.

For elimination mode that currently means:

- 4-team bracket
  - round 1 = `Conference Championship`
  - round 2 = `Championship`

- 8-team bracket
  - round 1 = `Division Series`
  - round 2 = `Conference Championship`
  - round 3 = `Championship`

- 16-team bracket
  - round 1 = `Wild Card`
  - round 2 = `Division Series`
  - round 3 = `Conference Championship`
  - round 4 = `Championship`

Important truth:

- The naming is generic playoff naming, not elimination-mode-specific naming.

### 5.2 Home field assignment

`EliminationHome.buildSeriesCardState()` uses `getHomeFieldPattern(gameNumber, series.bestOf, higherSeedTeamId, lowerSeedTeamId)`.

The actual live patterns are:

- best-of-7: `2-3-2`
- best-of-5: `2-2-1`
- best-of-3: `1-1-1`

Important truths:

- Setup offers `2-3-2`, `2-2-1-1-1`, and `Home throughout`.
- The runtime ignores that setup choice.
- Best-of-5 games do not use `2-2-1-1-1`; they use the engine’s hard-coded `2-2-1`.
- There is no current code path for “home throughout.”

### 5.3 Series progression

At game end, `useGameState.completeGameInternal()` does the playoff-series update work if `playoffSeriesIdRef.current` is set:

1. `recordSeriesGame()` writes the game result into the series record.
2. Series wins are recalculated from completed `games[]`.
3. If a side reaches `gamesRequired`, the series becomes `COMPLETED` and gets a `winner`.
4. The losing team in `playoff.teams` is marked `eliminated: true` and `eliminatedInRound`.
5. If the whole round is complete:
   - if this was the final round, `completePlayoff()` is called
   - otherwise `createNextRoundSeries()` is called and the playoff’s `currentRound` advances
6. If the playoff is linked to an elimination bracket:
   - elimination metadata `currentRound` is updated on round advancement
   - elimination metadata `status` and `champion` are updated on playoff completion

### 5.4 Structural final-round failure in current elimination mode

This is one of the most important truths in the current codebase.

Setup assigns every elimination team:

- `league: 'Eastern'`

But `createNextRoundSeries()` treats the championship round as a cross-conference final and requires:

- exactly one Eastern winner
- exactly one Western winner

In elimination mode, that condition is never true for the supported bracket sizes.

Code-backed outcome:

- 4-team bracket
  - after round 1 completes, `nextRound === playoff.rounds`
  - `createNextRoundSeries()` enters championship logic
  - it expects 1 Eastern and 1 Western winner
  - elimination mode provides 2 Eastern winners
  - advancement throws

- 8-team bracket
  - round 1 to round 2 can be created inside the non-championship branch
  - after round 2 completes, championship creation expects East and West champions
  - elimination mode still has only Eastern winners
  - advancement throws

- 16-team bracket
  - earlier rounds can be created
  - final-round creation fails for the same reason

Current practical meaning:

- the code does not currently have a valid path to create the final championship series for the supported elimination bracket sizes
- because of that, elimination brackets do not have a valid path to complete normally
- the awards path, which requires `metadata.status === 'COMPLETED'`, is therefore usually unreachable in normal bracket progression

### 5.5 Only one elimination playoff record effectively survives

This is the other major structural truth.

`createPlayoff()` deletes any existing playoff record that matches:

- the same `seasonNumber`
- the same `sourceType`

Elimination setup always creates:

- `seasonNumber: 1`
- `sourceType: 'elimination'`

So creating a new elimination bracket deletes any prior elimination playoff record with `seasonNumber: 1`.

Important consequences:

- elimination metadata slots can accumulate in `eliminationList`
- but the linked playoff record for older elimination slots can be deleted by later bracket creation
- old elimination slots can then fail to open in `EliminationHome` with “playoff bracket not found”
- completed elimination history in `kbl-playoffs` is not durable across creation of later elimination brackets

## 6. Roster Snapshot Logic

### 6.1 Snapshot-to-game roster build

`buildEliminationGameTrackerRoster(eliminationId, teamId)` is the launch-time roster transformer.

It does three main things:

1. Builds a normalized batting lineup.
2. Builds a normalized pitcher order.
3. Converts frozen League Builder players into GameTracker player/pitcher objects.

### 6.2 Lineup normalization

`getNormalizedEliminationLineup(snapshot)`:

- starts from `snapshot.lineup`
- filters out slots whose player no longer exists in `snapshot.players`
- filters out any slot whose player is classified as a pitcher
- sorts remaining slots by `battingOrder`
- keeps only the first appearance of each `playerId`
- preserves each existing slot’s `fieldingPosition`
- then fills remaining lineup spots from other non-pitchers not already used
- chooses fill-in positions by primary position, then secondary position, then first unused field position, then `DH`
- stops at 9 lineup slots

Important truths:

- Lineup normalization removes duplicate players, but not duplicate fielding positions.
- If a user manually assigns the same position to two lineup slots, the normalization code preserves those positions.
- The normalized lineup is always 9 non-pitchers if enough non-pitchers exist.

### 6.3 Rotation normalization

`getNormalizedEliminationRotation(snapshot)`:

- keeps `snapshot.startingRotation` entries that still refer to pitchers in `snapshot.players`
- appends any remaining pitcher IDs not already in the rotation

Important truth:

- The runtime game launch uses this normalized rotation.
- The Team Hub rotation display does not; it only renders `snapshot.startingRotation`.
- So a pitcher can be part of the launch-time normalized rotation without appearing in the Team Hub’s visible rotation list.

### 6.4 Team Hub functionality

`EliminationTeamHub` can persist:

- batting-order reordering
- lineup-player swaps between starter and bench
- fielding-position changes
- starting-rotation reordering through “make next”

It does not persist:

- roster additions/removals
- injuries
- substitution outcomes from played games
- automatic rotation advancement after a game
- separate vs-LHP lineup behavior

Important truths:

- Team Hub edits mutate the elimination snapshot only.
- They do not write back to League Builder master roster data.
- Game-time substitutions do not flow back into snapshots automatically.
- If you want next game’s lineup or starter to change, current code expects a manual Team Hub edit.

## 7. Elimination Home Logic

### 7.1 Load behavior

`EliminationHome` loads:

- metadata from `getElimination(eliminationId)`
- the linked playoff record by searching `getAllPlayoffs()` for:
  - `sourceType === 'elimination'`
  - `eliminationId === currentEliminationId`
- all series for that playoff via `getSeriesByPlayoff(playoff.id)`
- completed elimination playoff entries for the History tab by scanning all completed elimination-source playoffs

It then updates:

- `lastPlayedAt` on the elimination metadata

### 7.2 Failure behavior

The page errors out if:

- the metadata row does not exist
- the linked playoff row does not exist

That means an elimination slot can still exist in `eliminationList` but fail to open if its linked playoff record was deleted by later bracket creation.

### 7.3 History tab truth

History is not scoped to the current elimination slot.

It loads all playoff records where:

- `sourceType === 'elimination'`
- `status === 'COMPLETED'`

So history is:

- global across surviving elimination playoff records
- not keyed to the current elimination slot
- not keyed to the current league
- vulnerable to loss when later elimination bracket creation deletes older playoff records

## 8. Game Launch Into GameTracker

### 8.1 Deterministic game IDs

For a playable series, `EliminationHome` computes:

- `nextGameNumber = higherSeedWins + lowerSeedWins + 1`
- `gameId = elim-${eliminationId}-${series.id}-g${nextGameNumber}`

That means:

- a given scheduled series game has a deterministic route/game ID
- reopening an in-progress elimination game uses the same game ID and can load the existing `currentGame` snapshot

### 8.2 Route state passed to GameTracker

Elimination launches pass:

- `gameMode: 'elimination'`
- `eliminationId`
- `seriesId`
- `gameNumber`
- `roundName`
- `seasonId: elimination-${eliminationId}`
- `seasonNumber: 1`
- home and away team IDs and names
- home and away seeds
- current series score
- roster arrays built from snapshots
- team colors from live `getTeam(teamId)`
- stadium name from live `getTeam(teamId)`
- `playoffSeriesId`
- `playoffGameNumber`
- `playoffId`
- `totalInnings`

### 8.3 Route state passed but not meaningfully used by current GameTracker logic

The current GameTracker code uses:

- `gameMode`
- `eliminationId`
- `playoffSeriesId`
- `playoffGameNumber`
- `playoffId`
- `totalInnings`
- team IDs/names/colors/stadium
- roster arrays

It does not currently use elimination-specific decorative series context in any meaningful gameplay logic:

- `roundName`
- `homeSeed`
- `awaySeed`
- `seriesScore`

### 8.4 Missing launch context

Elimination launches do not pass:

- `leagueId`
- `homeManagerId`
- `awayManagerId`
- `awayRecord`
- `homeRecord`
- `userTeamSide`

Current effects inside GameTracker:

- `leagueId` falls back to `'sml'`
- `homeManagerId` falls back to `${homeTeamId}-manager`
- `awayManagerId` falls back to `${awayTeamId}-manager`
- team records fall back to `'0-0'`
- `userTeamSide` falls back to `'home'`

## 9. Identity Model Inside Elimination Games

This is the most important per-player truth in the current runtime.

### 9.1 GameTracker discards stable League Builder IDs

Even though the elimination roster builder carries League Builder `player.id` into the GameTracker player objects, `GameTracker.tsx` does not initialize the game with those IDs.

Instead it rewrites all active game IDs as:

- `away-${normalized-player-name}`
- `home-${normalized-player-name}`

This happens for:

- every lineup batter
- every bench player
- the away starting pitcher
- the home starting pitcher

### 9.2 What that identity model touches

Because `useGameState.initializeGame()` uses those derived IDs, the following stores and aggregates use side-and-name IDs rather than stable League Builder IDs:

- live `playerStats`
- live `pitcherStats`
- at-bat event batter/pitcher IDs
- fielding attribution map at game end
- season batting stats
- season pitching stats
- season fielding stats
- career batting stats
- career pitching stats
- playoff stats and leaders
- elimination awards input
- fame aggregation
- runner-tracker batter IDs

### 9.3 Consequences of the current identity model

If the same real player appears as `home` in one game and `away` in another, current code treats that as a different player ID.

That means:

- a player’s elimination playoff stats can split across separate home/away identities
- leaders can show the same real player twice under different IDs if side changes
- awards are computed from those split playoff stats
- season and career accumulation triggered by elimination games also split on side changes
- the same issue applies to starting pitchers

There is also a same-side duplicate-name risk:

- if two players on the same team share the same normalized name string, their game-session IDs collide

## 10. GameTracker Behavior When Launched From Elimination Mode

### 10.1 Playoff context

Elimination mode sets:

- `isPlayoffGame = true`

because `navigationState.gameMode === 'elimination'`.

GameTracker then calls `setPlayoffContext(playoffSeriesId, playoffGameNumber, playoffId)`.

That is what enables:

- series result recording
- bracket advancement attempts
- playoff stats aggregation

### 10.2 Season ID mismatch at game initialization

There is an important mismatch between launch state and actual `initializeGame()` usage.

Elimination launch state provides:

- `seasonId: elimination-${eliminationId}`

But the current `GameTracker.initializeOrLoadGame()` path initializes new non-franchise games with:

- `seasonId: 'season-1'`

because it only uses the franchise-based branch and otherwise falls back to `'season-1'`.

Later, at end game, `handleEndGame()` computes:

- `seasonId = navigationState.seasonId ?? ...`

so elimination end-game aggregation uses `elimination-${eliminationId}`.

Current truth:

- new elimination games are initialized under `season-1`
- but end-game aggregation/archive uses `elimination-${eliminationId}`

### 10.3 Roster conversion details

For elimination launches, GameTracker builds:

- starting lineups from players with `battingOrder` and `position`
- bench lists from remaining position players
- starting pitchers from `isActive` pitchers in the pitcher arrays

Important truths:

- bench validation keeps only one listed position per player (`[p.position || 'DH']`)
- secondary-position versatility is not carried into the bench-position eligibility list
- GameTracker only registers position players plus the currently active starting pitchers for player-state tracking
- non-active bullpen pitchers are not registered into `usePlayerState` at initialization

## 11. Mojo/Fitness in Elimination Mode

### 11.1 What elimination mode is trying to do

Elimination mode has a dedicated between-game persistence layer for:

- `mojoLevel`
- `fitnessState`

stored in `kbl-tracker.mojoFitnessSnapshots`.

### 11.2 Load path

At game initialization, if:

- `gameMode === 'elimination'`
- and `eliminationId` exists

GameTracker loads `loadMojoFitnessSnapshots(eliminationId)` and uses the results when registering player-state entries.

### 11.3 Save path

At game end, if:

- `gameMode === 'elimination'`
- and `eliminationId` exists

GameTracker calls `saveMojoFitnessSnapshots(eliminationId, ...)` using `playerStateHook.getAllPlayers()`.

### 11.4 Current identity problem in mojo/fitness persistence

The mojo/fitness snapshot store uses the same game-session IDs described above:

- `home-${normalized-name}`
- `away-${normalized-name}`

That means mojo/fitness continuity is side-dependent, not player-dependent.

If a team switches from home to away between games:

- the same real player gets a different snapshot lookup key
- previous mojo/fitness does not load for that player

So current elimination mojo/fitness carryover only works reliably when a player remains on the same home/away side between consecutive games.

### 11.5 Current coverage gap

Because GameTracker only registers:

- all position players
- the currently active away starter
- the currently active home starter

the following are not reliably included in elimination mojo/fitness persistence:

- bullpen pitchers who were never registered
- relievers who are present in roster arrays but not explicitly registered into `usePlayerState`

## 12. Fame, Fan Morale, and mWAR During Elimination Games

### 12.1 Fame

Elimination games use `useFameTracking({ gameId, isPlayoffs: true })`.

Important truths:

- elimination games are treated as playoff games for Fame
- GameTracker does not pass `playoffRound`
- GameTracker does not pass `isEliminationGame`
- GameTracker does not pass `isClinchGame`

Given `fameEngine.ts`, current elimination Fame events therefore use:

- playoff multiplier based on default `wild_card`
- multiplier `1.25`
- no extra elimination-game bonus
- no extra clinch-game bonus

So the current code does not model elimination-specific Fame intensity inside the game, even though the Fame engine supports those flags.

### 12.2 Fan morale

At game end, GameTracker runs the fan-morale branch for any non-exhibition game, including elimination.

It processes results for both teams through `useFanMorale`.

Important truths:

- the current `useFanMorale` hook is explicitly documented in code as a simplified stub
- its morale state is local React state only
- elimination mode does not persist fan morale between games
- elimination launches do not pass `leagueId`, so rivalry checks fall back to `'sml'`
- the game date passed into morale updates is always `{ season: 1, game: 1 }`

Current practical meaning:

- elimination games can generate in-memory fan-morale state during that page session
- that state is not a durable elimination-mode progression system

### 12.3 mWAR

GameTracker always initializes mWAR with:

- `homeManagerId`
- `homeTeamId`
- `seasonId: 'season-1'`

At game end it persists:

- game decisions to `kbl-manager.managerDecisions`
- season aggregate to `kbl-manager.managerSeasonStats`

Important truths for elimination mode:

- only the home manager is initialized/tracked for the game
- away-manager decisions are not a live elimination path
- elimination launches do not pass real manager IDs, so defaults are `${teamId}-manager`
- elimination launches do not pass team records, so mWAR season aggregation uses default `0-0` record inputs
- mWAR season aggregation is written to `'season-1'`, not `elimination-${eliminationId}`

Current practical meaning:

- mWAR is active during elimination games
- but it is not elimination-bracket-scoped
- and it is home-side-only from the current page logic

## 13. End-Game Pipeline

### 13.1 Generic completed-game processing still runs

`hookEndGame()` inside `useGameState` runs the same general completion pipeline used elsewhere:

1. finalize persisted game state
2. aggregate completed game to season stores
3. aggregate milestones/career stats
4. archive the completed game
5. if playoff context exists, record the series result
6. if playoff context exists, aggregate game stats into `playoffStats`

### 13.2 Season and career aggregation from elimination games

Elimination games do go through:

- season batting aggregation
- season pitching aggregation
- season fielding aggregation
- fame aggregation
- milestone detection
- career batting counting-stat aggregation
- career pitching counting-stat aggregation

Important truths:

- elimination games are not isolated from the generic season/career pipeline
- they write to the same `kbl-tracker` season and career stores
- because player IDs are side-and-name based, those season/career rows also use side-and-name identities

### 13.3 WAR fields are not actively computed in this elimination path

`seasonAggregator.ts` updates counting stats and fame fields.

It does not compute live:

- `bwar`
- `rwar`
- `fwar`
- `totalWar`
- `pwar`

So while elimination games do aggregate season and career counting stats, the current end-game path does not make elimination mode a live WAR-calculation pipeline.

### 13.4 Series result recording

If playoff context exists, end game writes:

- `gameNumber`
- `homeTeamId`
- `awayTeamId`
- final score
- winner ID
- innings
- `gameLogId`
- `playedAt`

into the linked series record via `recordSeriesGame()`.

### 13.5 Elimination metadata updates

If bracket advancement succeeds:

- advancing rounds update elimination metadata `currentRound`
- championship completion updates elimination metadata:
  - `status: 'COMPLETED'`
  - `champion: championName`

Because the final-round creation logic is structurally broken for the supported elimination sizes, this completion path is normally blocked before awards can become active.

### 13.6 Post-game navigation

After end-game completion:

- GameTracker saves elimination mojo/fitness snapshots
- clears undo history
- navigates to `/post-game/${gameId}` with `gameMode` and `eliminationId`

`PostGameSummary` then routes `CONTINUE` back to:

- `/elimination/${eliminationId}`

## 14. Leaders, Awards, and History

### 14.1 Leaders

The Leaders tab reads from `playoffStats` only.

Batting leaders shown:

- `AVG`
- `HR`
- `RBI`
- `SB`
- `OPS`

Pitching leaders shown:

- `ERA`
- `W`
- `K`
- `WHIP`
- `SV`

Important truths:

- leaders are top-5 sorted entries
- leaders do not apply qualifier minimums
- leaders are only as correct as `aggregateGameToPlayoffStats()` input
- because player identity is side-and-name based, the same real player can split across separate leaderboard rows if home/away side changes

### 14.2 Awards

Awards are computed only after:

- elimination metadata status is `COMPLETED`
- and `metadata.awards` is still `undefined`

`computeEliminationAwards(playoffId)` can produce:

- `Postseason MVP`
- `Best Pitcher`
- `Best Runner`
- `Clutch Performer`

Qualifiers:

- batters: at least 5 AB
- pitchers: at least 2 pitching games and 3 IP
- runners: at least 1 SB
- clutch: at least 1 RBI

Important truths:

- awards are stored back into elimination metadata, not the playoff DB
- awards depend on playoff stats, not season stats
- because bracket completion is structurally blocked in the normal supported sizes, awards are normally unreachable

### 14.3 History

History entries are derived from completed elimination playoff records still present in `kbl-playoffs`.

They are not derived from elimination metadata records.

So history durability is limited by:

- `createPlayoff()` replacement behavior on later elimination creation
- the fact that `deleteElimination()` does not delete playoff records, but later `createPlayoff()` may

## 15. What Persists vs What Does Not

### 15.1 Durable today

The following are durably persisted in current elimination mode:

- elimination metadata
- frozen roster snapshots
- mutable lineup/rotation edits inside those snapshots
- playoff config
- series records and series game results
- playoff stat totals
- in-progress game snapshot
- completed game archive
- season batting/pitching/fielding rows
- career batting/pitching rows and milestone records
- elimination mojo/fitness snapshots for registered players
- manager decisions and manager season rows

### 15.2 Local or non-bracket-durable today

The following are not a durable elimination progression system in current code:

- fan morale
- full bullpen mojo/fitness continuity
- controlled-team ownership
- chosen home-field-pattern setting
- real elimination-specific Fame round/elimination/clinch weighting
- automatic post-game lineup/rotation carryover from actual game substitutions
- stable player identity across home/away side changes
- reliable multi-bracket coexistence
- reliable final-round creation/completion for supported bracket sizes

## 16. Current Functional Definition

If reduced to what the code currently does, elimination mode is:

- a metadata slot picker plus setup wizard
- a one-league frozen-roster bracket creator
- a generic playoff bracket persisted under `sourceType: 'elimination'`
- a launcher into the standard GameTracker engine
- a partial between-game player-state carryover system for mojo/fitness
- a playoff-stat and post-game-return shell around GameTracker

It is not currently, in strict code terms:

- a robust multi-save elimination system with durable independent brackets
- a fully stable player-identity system across a series
- a fully wired elimination-specific meta-systems pipeline
- a reliable final-round-to-champion bracket engine for the supported bracket sizes
- a system where all setup knobs are functionally honored by gameplay

## 17. Highest-Signal Code-Backed Gaps

These are the highest-signal “what elimination mode really is today” conclusions from the code:

1. Bracket completion is structurally blocked for 4-, 8-, and 16-team elimination because setup creates a single-conference bracket while final-round advancement still expects East-vs-West champions.

2. Creating a new elimination bracket deletes the previous elimination playoff record because every elimination playoff uses `seasonNumber: 1` and `sourceType: 'elimination'`.

3. Player identity inside games is side-and-name based, not stable-player based, so the same real player can split across home and away identities in playoff stats, season stats, career stats, and mojo/fitness carryover.

4. Setup exposes `controlledTeamIds` and `homeFieldPattern`, but current runtime logic does not use them.

5. `useDH` is stored in playoff config, but the elimination launch/game path does not branch on it; lineup building always comes from the frozen non-pitcher lineup snapshot path.

6. GameTracker initializes new elimination games under `season-1` but aggregates them at game end under `elimination-${eliminationId}`.

7. Elimination mojo/fitness persistence is real but side-dependent and incomplete because it keys by home/away name-based IDs and only covers players registered into `usePlayerState`.

8. Elimination mode engages fan morale and mWAR side systems, but neither is truly bracket-scoped in the current implementation.
