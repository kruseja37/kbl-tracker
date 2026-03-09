# Elimination Mode Evidence-Backed Assertion Ledger

Last verified: March 9, 2026

Purpose: this is the strictest elimination-mode document in `spec-docs`. It is intended to be the factual canon for the current elimination implementation and its tie to Mode 1 / League Builder, GameTracker, shared stat aggregation, playoff storage, and Museum/Almanac-facing stores.

This file is deliberately narrower than the other elimination docs:

- Every substantive assertion is labeled either `DIRECT CODE FACT` or `INFERENCE`.
- `DIRECT CODE FACT` means the statement is explicitly supported by the cited source lines.
- `INFERENCE` means the statement is a control-flow or composition conclusion drawn from multiple direct facts.
- If a detail is not cited here, do not treat it as part of the highest-bar factual canon without re-checking code.

## Scope

Included:

- Elimination setup
- League Builder source data used by elimination
- Elimination roster snapshot creation and launch-time roster building
- Elimination launch into GameTracker
- GameTracker / `useGameState` behavior that materially affects elimination
- Shared playoff/stat aggregation paths elimination actually uses
- The Museum/Almanac seam that consumes elimination-derived stat stores

Excluded:

- Unrelated franchise flows
- Legacy `src`
- UI design evaluation
- Desired-state behavior

## Assertion Ledger

### A. Mode 1 / League Builder source truth

1. `DIRECT CODE FACT` League Builder `Player` has a stable `id`, and `TeamRoster` contains a broader roster model than elimination currently freezes, including `lineupVsRHP`, `lineupVsLHP`, `startingRotation`, `closingPitcher`, `setupPitchers`, `depthChart`, and bench/substitution order arrays.  
   Evidence: `src/utils/leagueBuilderStorage.ts:101-177`

2. `DIRECT CODE FACT` `getPlayersByTeam(teamId)` returns players by the `currentTeamId` index, not by `mlbRoster` membership.  
   Evidence: `src/utils/leagueBuilderStorage.ts:462-472`

3. `DIRECT CODE FACT` In elimination setup, the team list for the selected league is built by filtering `selectedLeague.teamIds` and then sorting team names alphabetically.  
   Evidence: `src/src_figma/app/pages/EliminationSetup.tsx:358-359`

4. `DIRECT CODE FACT` When a league is selected, elimination setup defaults `controlledTeamIds` to all league teams and defaults `seededTeamIds` to the first `numTeams` entries of that alphabetically sorted team list.  
   Evidence: `src/src_figma/app/pages/EliminationSetup.tsx:370-379`

5. `DIRECT CODE FACT` `handleStartPlayoffs()` creates elimination metadata with only `name`, `leagueId`, `leagueName`, and `teamsCount`, then immediately creates roster snapshots, constructs playoff teams, creates a playoff record, creates first-round series, starts the playoff, updates elimination status to `IN_PROGRESS`, and navigates to the elimination home route.  
   Evidence: `src/src_figma/app/pages/EliminationSetup.tsx:399-461`

6. `DIRECT CODE FACT` The elimination playoff created by setup is always written with `seasonNumber: 1`, `seasonId: elimination-${eliminationId}`, `sourceType: 'elimination'`, `conferenceChampionship: false`, `leagues: ['Eastern']`, and every seeded team is assigned `league: 'Eastern'`.  
   Evidence: `src/src_figma/app/pages/EliminationSetup.tsx:416-440`

7. `INFERENCE` `homeFieldPattern` and `controlledTeamIds` are currently setup-time UI state, not durable elimination logic inputs, because the live `handleStartPlayoffs()` path does not pass them into `createElimination()`, `createRosterSnapshots()`, `createPlayoff()`, or `createSeries()`.  
   Evidence: `src/src_figma/app/pages/EliminationSetup.tsx:399-461`, `src/src_figma/app/pages/EliminationSetup.tsx:469-472`

### B. Snapshot model and what elimination actually freezes

8. `DIRECT CODE FACT` An `EliminationRosterSnapshot` stores only `players`, `lineup`, `startingRotation`, plus bracket/team identity and `snapshotAt`.  
   Evidence: `src/utils/eliminationRosterStorage.ts:17-26`

9. `DIRECT CODE FACT` `buildSnapshot()` writes `players`, `lineup: roster.lineupVsRHP`, and `startingRotation: roster.startingRotation`. It does not write `lineupVsLHP`, `closingPitcher`, `setupPitchers`, `depthChart`, or the pinch/defensive sub orders from `TeamRoster`.  
   Evidence: `src/utils/eliminationRosterStorage.ts:177-193`, `src/utils/leagueBuilderStorage.ts:163-177`

10. `DIRECT CODE FACT` `createRosterSnapshots()` reads each team via `getTeam(teamId)`, `getTeamRoster(teamId)`, and `getPlayersByTeam(teamId)`, then writes those snapshots into the `rosterSnapshots` store.  
    Evidence: `src/utils/eliminationRosterStorage.ts:199-228`

11. `INFERENCE` Because snapshot `players` come from `getPlayersByTeam(teamId)`, the elimination snapshot roster is driven by `Player.currentTeamId`, not by `TeamRoster.mlbRoster`.  
    Evidence: `src/utils/eliminationRosterStorage.ts:199-217`, `src/utils/leagueBuilderStorage.ts:163-177`, `src/utils/leagueBuilderStorage.ts:462-472`

12. `DIRECT CODE FACT` Snapshot lineup normalization keeps existing non-pitcher lineup slots that still point to valid players, preserves order, prevents duplicate players, and then fills to nine hitters from the remaining non-pitchers using `primaryPosition`, `secondaryPosition`, or the first unused field position.  
    Evidence: `src/utils/eliminationRosterStorage.ts:48-86`

13. `DIRECT CODE FACT` Snapshot rotation normalization keeps valid existing rotation entries that still point to pitchers, then appends remaining pitcher IDs.  
    Evidence: `src/utils/eliminationRosterStorage.ts:88-93`

14. `DIRECT CODE FACT` When elimination snapshots are converted to GameTracker roster objects, `convertToGameTrackerPlayer()` and `convertToGameTrackerPitcher()` preserve the original League Builder `player.id` on the outgoing `playerId` field.  
    Evidence: `src/utils/eliminationRosterStorage.ts:95-155`

15. `DIRECT CODE FACT` `buildEliminationGameTrackerRoster()` returns:
- `players`: normalized starting lineup plus all non-pitchers not in the lineup
- `pitchers`: normalized rotation converted to GameTracker pitcher objects  
   Evidence: `src/utils/eliminationRosterStorage.ts:288-331`

### C. Elimination home page and launch-time composition

16. `DIRECT CODE FACT` `EliminationHome` loads elimination metadata with `getElimination(eliminationId)`, then finds the linked playoff by scanning `getAllPlayoffs()` for a row where `sourceType === 'elimination'` and `eliminationId === currentEliminationId`.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:133-147`

17. `DIRECT CODE FACT` On page load, `EliminationHome` also updates the elimination metadata row with `lastPlayedAt: Date.now()`.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:176`

18. `DIRECT CODE FACT` `handlePlayGame()` builds away/home GameTracker rosters from frozen elimination snapshots, but fetches away/home team branding and stadium data live from League Builder `getTeam()`.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:249-259`

19. `DIRECT CODE FACT` The route state passed from `EliminationHome` into `GameTracker` includes `gameMode: 'elimination'`, `eliminationId`, `seriesId`, `seasonId: elimination-${eliminationId}`, `seasonNumber: 1`, home/away team IDs and names, seeds, playoff IDs, `totalInnings`, snapshot-derived `awayPlayers`/`homePlayers`/`awayPitchers`/`homePitchers`, and live team colors/stadium fields.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:262-294`

20. `INFERENCE` Elimination roster truth is frozen at snapshot time, while branding/stadium truth is live at game launch time, because launch pulls roster objects from `buildEliminationGameTrackerRoster()` and presentation fields from `getTeam()`.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:255-289`

### D. The GameTracker identity boundary

21. `DIRECT CODE FACT` `GameTracker.tsx` contains an explicit comment stating that League Builder `playerId` is available for cross-reference, but game-session IDs remain name-based for backward compatibility. The helper that generates those runtime IDs is `${team}-${name.replace(/\s+/g, '-').toLowerCase()}`.  
    Evidence: `src/src_figma/app/pages/GameTracker.tsx:572-576`

22. `DIRECT CODE FACT` When a new game is initialized, `GameTracker` rewrites every lineup player, bench player, and starting pitcher into `away-*` or `home-*` IDs derived from the player name, not from the incoming roster object's preserved `playerId`.  
    Evidence: `src/src_figma/app/pages/GameTracker.tsx:800-863`

23. `DIRECT CODE FACT` The `initializeGame()` call in `GameTracker` does not use `navigationState.seasonId`. It computes `seasonId` as `${franchiseId}-season-${seasonNumber}` when `navigationState.franchiseId` exists, otherwise `'season-1'`.  
    Evidence: `src/src_figma/app/pages/GameTracker.tsx:847-851`

24. `DIRECT CODE FACT` Elimination launch state includes `seasonId: elimination-${eliminationId}` but does not include `franchiseId`.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:262-294`

25. `INFERENCE` In the live elimination path, `initializeGame()` receives `seasonId: 'season-1'`, not `seasonId: elimination-${eliminationId}`, because elimination route state lacks `franchiseId` and `GameTracker` ignores `navigationState.seasonId` during initialization.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:262-294`, `src/src_figma/app/pages/GameTracker.tsx:847-851`

26. `DIRECT CODE FACT` `useGameState.initializeGame()` stores the lineup IDs it is given directly into lineup refs and lineup state, stores `config.seasonId` into `seasonIdRef`, and writes a new game header using `createGameHeader({ seasonId: config.seasonId, ... })`.  
    Evidence: `src/src_figma/hooks/useGameState.ts:1355-1433`

27. `DIRECT CODE FACT` `useGameState.initializeGame()` also initializes `playerStats` keyed by the rewritten lineup IDs and `pitcherStats` keyed by the rewritten starting-pitcher IDs.  
    Evidence: `src/src_figma/hooks/useGameState.ts:1435-1459`

### E. Elimination mojo/fitness continuity

28. `DIRECT CODE FACT` On game start, `GameTracker` loads mojo/fitness snapshots only when `navigationState.gameMode === 'elimination'` and `navigationState.eliminationId` are present.  
    Evidence: `src/src_figma/app/pages/GameTracker.tsx:910-927`

29. `DIRECT CODE FACT` Loaded mojo/fitness snapshots are indexed in memory by `snapshot.playerId`, and player registration immediately looks them up using new runtime IDs generated as `away-*` / `home-*` from player names.  
    Evidence: `src/src_figma/app/pages/GameTracker.tsx:917-922`, `src/src_figma/app/pages/GameTracker.tsx:931-999`

30. `DIRECT CODE FACT` At game end, `GameTracker` saves mojo/fitness snapshots by taking `playerStateHook.getAllPlayers()` and writing each `p.playerId`, `currentMojo`, and `currentFitness` to `saveMojoFitnessSnapshots(eliminationId, ...)`.  
    Evidence: `src/src_figma/app/pages/GameTracker.tsx:3317-3329`

31. `DIRECT CODE FACT` `mojoFitnessSnapshots` are keyed in IndexedDB by `[eliminationId, playerId]`.  
    Evidence: `src/utils/trackerDb.ts:147-153`, `src/utils/mojoFitnessStorage.ts:5-18`

32. `INFERENCE` Elimination mojo/fitness continuity is keyed by GameTracker runtime IDs, not stable League Builder player IDs, because both the read lookup and the writeback use the runtime `away-*` / `home-*` IDs.  
    Evidence: `src/src_figma/app/pages/GameTracker.tsx:917-922`, `src/src_figma/app/pages/GameTracker.tsx:931-999`, `src/src_figma/app/pages/GameTracker.tsx:3317-3329`

### F. In-progress persistence during the game

33. `DIRECT CODE FACT` `useGameState` maintains a live autosave in `currentGame` specifically so refresh restores exact state, including runner identities and scoreboard state.  
    Evidence: `src/src_figma/hooks/useGameState.ts:2010-2012`

34. `DIRECT CODE FACT` That autosave writes `playerStatsRecord` keyed by current runtime player IDs, determines `teamId` from away/home runtime prefixes or lineup membership, writes `pitcherGameStats` keyed by current runtime pitcher IDs, and includes `seasonId: seasonIdRef.current`.  
    Evidence: `src/src_figma/hooks/useGameState.ts:2016-2205`

35. `INFERENCE` In elimination games, the live autosaved `currentGame` row uses runtime player IDs together with `seasonId: 'season-1'`, because `seasonIdRef.current` was set from the initialization path described in assertions 23-26.  
    Evidence: `src/src_figma/app/pages/GameTracker.tsx:847-851`, `src/src_figma/hooks/useGameState.ts:1358`, `src/src_figma/hooks/useGameState.ts:2016-2205`

### G. End-game persistence and aggregation

36. `DIRECT CODE FACT` At game end, `GameTracker` computes `computedSeasonId` from `navigationState.seasonId` first, then from `franchiseId`, then from `seasonNumber`. It passes that as `endGameOptions.seasonId` into `hookEndGame()`.  
    Evidence: `src/src_figma/app/pages/GameTracker.tsx:3301-3315`

37. `DIRECT CODE FACT` In `useGameState.endGame()`, fielding totals are rebuilt from IndexedDB fielding events by mapping stored position/team data back to the current lineup player IDs, then copying those fielding tallies into the final `playerStatsRecord`.  
    Evidence: `src/src_figma/hooks/useGameState.ts:4327-4373`

38. `DIRECT CODE FACT` In `useGameState.endGame()`, pitcher rows are written using the current runtime pitcher IDs, pitcher names resolved from the pitcher-name map or from the runtime ID string, and team IDs derived from the `away-` / `home-` prefix.  
    Evidence: `src/src_figma/hooks/useGameState.ts:4400-4445`

39. `DIRECT CODE FACT` `useGameState.endGame()` sets `targetSeasonId = opts?.seasonId ?? seasonIdRef.current ?? 'season-1'`, builds `aggregationOptions`, then runs `processCompletedGame(persistedState, aggregationOptions)` and `markGameAggregated(gameId)` when the header is not already aggregated.  
    Evidence: `src/src_figma/hooks/useGameState.ts:4502-4519`

40. `DIRECT CODE FACT` `processCompletedGame()` is a two-step pipeline: `aggregateGameToSeason()` followed by `archiveCompletedGame(..., options?.seasonId)`.  
    Evidence: `src/utils/processCompletedGame.ts:34-52`

41. `DIRECT CODE FACT` `aggregateGameToSeason()` updates season batting, pitching, fielding, Fame, season game count, and then runs milestone/career aggregation through `aggregateGameWithMilestones()`.  
    Evidence: `src/utils/seasonAggregator.ts:64-104`

42. `DIRECT CODE FACT` Season batting aggregation loops `Object.entries(gameState.playerStats)` and uses the entry key as `playerId`; season pitching uses `pitcherStats.pitcherId`; season fielding also loops `Object.entries(gameState.playerStats)` and uses the entry key as `playerId`.  
    Evidence: `src/utils/seasonAggregator.ts:141-177`, `src/utils/seasonAggregator.ts:183-242`, `src/utils/seasonAggregator.ts:248-273`

43. `DIRECT CODE FACT` Career batting aggregation uses `getOrCreateCareerBatting(playerId, playerName, teamId)` and writes the updated record back under that `playerId`; career pitching does the same with `pitcherStats.pitcherId`.  
    Evidence: `src/utils/milestoneAggregator.ts:79-135`, `src/utils/milestoneAggregator.ts:140-213`

44. `DIRECT CODE FACT` The main milestone pipeline processes each batter from `Object.entries(gameState.playerStats)` and each pitcher from `gameState.pitcherGameStats`, and it also checks WAR-component milestones (`bWAR`, `fWAR`, `rWAR` for position players and `pWAR` for pitchers) using those same player IDs.  
    Evidence: `src/utils/milestoneAggregator.ts:695-920`

45. `DIRECT CODE FACT` Completed games are archived to the `completedGames` store, and `archiveCompletedGame()` persists `seasonId: seasonId || 'season-1'`.  
    Evidence: `src/utils/processCompletedGame.ts:41-50`, `src/utils/trackerDb.ts:53-57`

46. `INFERENCE` In the elimination path, end-game season aggregation and completed-game archival use `seasonId: elimination-${eliminationId}`, even though initialization/autosave uses `'season-1'`, because `GameTracker` passes `navigationState.seasonId` into `hookEndGame()` and `useGameState.endGame()` prefers `opts.seasonId` over `seasonIdRef.current`.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:262-270`, `src/src_figma/app/pages/GameTracker.tsx:3301-3315`, `src/src_figma/hooks/useGameState.ts:4507-4519`

47. `INFERENCE` Elimination writes stable `teamId` values but runtime-rewritten player IDs into season batting, season pitching, season fielding, career batting, career pitching, milestone/Fame milestone records, and completed game archives.  
    Evidence: `src/src_figma/hooks/useGameState.ts:4362-4445`, `src/utils/seasonAggregator.ts:141-177`, `src/utils/seasonAggregator.ts:183-273`, `src/utils/milestoneAggregator.ts:79-213`, `src/utils/milestoneAggregator.ts:695-920`

### H. Playoff stats, series progression, and elimination completion

48. `DIRECT CODE FACT` `createPlayoff()` deletes any existing playoff rows with the same `seasonNumber` and the same `sourceType` before adding the new row.  
    Evidence: `src/utils/playoffStorage.ts:261-296`

49. `DIRECT CODE FACT` In elimination setup, every created elimination playoff uses `seasonNumber: 1` and `sourceType: 'elimination'`.  
    Evidence: `src/src_figma/app/pages/EliminationSetup.tsx:426-440`

50. `DIRECT CODE FACT` After a playoff game completes, `useGameState.endGame()` records the series game result, marks the losing team eliminated in the playoff team list, checks whether the round is fully complete, and either completes the playoff / elimination metadata or tries to create next-round series and increment `currentRound`.  
    Evidence: `src/src_figma/hooks/useGameState.ts:4525-4588`

51. `DIRECT CODE FACT` `createNextRoundSeries()` treats the final round as a championship round and requires exactly one `Eastern` winner and exactly one `Western` winner, otherwise it throws an error.  
    Evidence: `src/utils/playoffStorage.ts:617-718`

52. `INFERENCE` A multi-round elimination bracket cannot create its final championship round through the shared `createNextRoundSeries()` path as currently configured, because elimination setup places all bracket teams in `Eastern` and no elimination team is assigned to `Western`.  
    Evidence: `src/src_figma/app/pages/EliminationSetup.tsx:416-440`, `src/utils/playoffStorage.ts:648-657`

53. `INFERENCE` When that final-round mismatch throws, the error is caught by the playoff-update `try/catch` in `useGameState.endGame()`, so the game result can be recorded but round advancement and elimination `currentRound` update do not complete in that failing branch.  
    Evidence: `src/src_figma/hooks/useGameState.ts:4526-4597`

54. `DIRECT CODE FACT` Playoff leaders are populated from `aggregateGameToPlayoffStats(playoffId, persistedState)` after end-game aggregation, as long as the game was not already aggregated.  
    Evidence: `src/src_figma/hooks/useGameState.ts:4600-4605`

55. `DIRECT CODE FACT` `aggregateGameToPlayoffStats()` keys batting and pitching accumulation by `playerId` drawn directly from `gameState.playerStats` keys and `pitcherStats.pitcherId`, and preserves `teamId` from those rows.  
    Evidence: `src/utils/playoffStorage.ts:759-940`

56. `INFERENCE` Elimination playoff leaders are keyed by runtime-rewritten player IDs, not stable League Builder player IDs, because the playoff aggregation function consumes the persisted game-state IDs produced by `GameTracker` / `useGameState`.  
    Evidence: `src/src_figma/hooks/useGameState.ts:4362-4445`, `src/utils/playoffStorage.ts:784-875`

57. `DIRECT CODE FACT` `EliminationHome` computes and persists awards only after `metadata.status === 'COMPLETED'` and only when `metadata.awards` is still `undefined`, using `computeEliminationAwards(currentPlayoffId)`.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:202-230`

58. `DIRECT CODE FACT` The leaders tab reads `getPlayoffLeaders(playoffId, stat, 5)` from playoff stats, not from season/career/museum stores.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:560-612`

59. `DIRECT CODE FACT` The history tab is built by scanning all completed elimination playoff rows and their series, not by scanning elimination metadata rows alone.  
    Evidence: `src/src_figma/app/pages/EliminationHome.tsx:149-184`, `src/src_figma/app/pages/EliminationHome.tsx:756-792`

### I. Museum / Almanac seam

60. `DIRECT CODE FACT` `useMuseumData()` loads museum stores directly and only auto-populates all-time leaders from career data when `leaders.length === 0`.  
    Evidence: `src/src_figma/hooks/useMuseumData.ts:163-205`

61. `DIRECT CODE FACT` `populateMuseumLeaders()` reads `getAllCareerBatting()` and `getAllCareerPitching()`, converts those records into museum `AllTimeLeader` rows, and writes `playerId` and `teamId` from the career rows into the leader records.  
    Evidence: `src/utils/museumPipeline.ts:29-49`, `src/utils/museumPipeline.ts:55-74`, `src/utils/museumPipeline.ts:84-114`

62. `DIRECT CODE FACT` In the shared tracker DB, season stores are keyed by `[seasonId, playerId]`, career stores are keyed by `playerId`, `rosterSnapshots` are keyed by `key`, and `mojoFitnessSnapshots` are keyed by `[eliminationId, playerId]`.  
    Evidence: `src/utils/trackerDb.ts:72-97`, `src/utils/trackerDb.ts:103-153`

63. `INFERENCE` The Museum/Almanac all-time-leader path is downstream of elimination only through shared career stores, not through a direct elimination-specific reader.  
    Evidence: `src/src_figma/hooks/useMuseumData.ts:156-205`, `src/utils/museumPipeline.ts:84-114`

64. `INFERENCE` Robust player-level Almanac continuity is currently broken across the elimination -> GameTracker -> aggregation -> Museum chain, because stable League Builder `player.id` is preserved in snapshot objects, then replaced as the canonical stat key by `away-*` / `home-*` runtime IDs before season/career/playoff/museum-facing writes occur.  
    Evidence: `src/utils/eliminationRosterStorage.ts:95-155`, `src/src_figma/app/pages/GameTracker.tsx:572-576`, `src/src_figma/app/pages/GameTracker.tsx:800-863`, `src/utils/seasonAggregator.ts:141-273`, `src/utils/milestoneAggregator.ts:79-213`, `src/utils/playoffStorage.ts:759-940`, `src/utils/museumPipeline.ts:29-74`

## Non-claims / things intentionally not asserted here

- This file does not claim intended product behavior.
- This file does not claim every elimination UI control is useful; it only states what the current code wires.
- This file does not claim every earlier narrative elimination doc is wrong. It claims this file is the stricter standard where there is any tension.
- This file does not claim that every theoretical runtime branch was executed in a browser session. It claims the cited assertions were re-verified from source.
