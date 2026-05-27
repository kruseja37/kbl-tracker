# Franchise v1 Audit: GameTracker Lifecycle + Stats Integrity

**Status:** Repo-first implementation audit  
**Created:** 2026-05-27  
**Scope:** Mode 2 GameTracker launch, active-game persistence, completion/archive, standings, playoffs, final-score-only result handling, and stat integrity.  
**Constraint:** Documentation-only. No app code or tests were changed.

## Executive summary

The repo has a real Mode 2 GameTracker lifecycle foundation. Regular-season franchise launch pulls the next franchise schedule row, repairs/loads franchise-owned roster snapshots, builds pregame starter/lineup context, and navigates to GameTracker with franchise, season, schedule, league, roster, manager, DH, innings, and stats-scope identity. Playoff launch also exists and carries playoff series/game context. Active-game persistence is substantial: current-game snapshots preserve canonical identity, score, lineup state, substitutions, pitchers, runner tracker state, scoreboard, manager context, and playoff context, and restore from the snapshot before falling back to durable replay.

The highest-risk v1 stability issue is not launch/resume. It is downstream separation and idempotency. Playoff games currently use the same `statsScopeId`/`seasonId` as the regular season, then run through `processCompletedGame()`/`aggregateGameToSeason()` before also aggregating into `playoffStats`. Because standings and season summaries query completed games and season stats by `seasonId`, playoff completed games can pollute regular-season standings and regular-season player totals. That violates the spec requirement to produce both final regular-season stats/standings and playoff results/postseason stats as separate outputs.

Generated schedule behavior remains present in franchise initialization and new-season transition paths, despite v1 hard cuts rejecting generated franchise schedules. Manual schedule rows are supported; CSV-imported rows were not found in the inspected app code. A final-score-only manual result-entry path was also not found; the current visible non-played path is `SKIPPED`, while synthetic simulation code exists but is guarded off.

GameTracker is mostly treated as the gameplay source of truth, but some hub-level systems duplicate gameplay-derived state from schedule rows or completed-game archives. Those duplicated reads are manageable if schedule rows remain only an index/status/result mirror, but they should not become independent sources for player stats, WPA, awards, milestones, or analytics.

## End-to-end lifecycle findings

1. **Manual regular-season schedule rows can launch GameTracker once valid.** `ScheduleContent` displays franchise schedule rows and exposes add/delete UI; empty schedules are explicitly supported in the UI copy (`src/src_figma/app/components/ScheduleContent.tsx:185-209`). `AddGameModal` captures game number, day number, date/time, away team, and home team (`src/src_figma/app/components/AddGameModal.tsx:73-99`, `src/src_figma/app/components/AddGameModal.tsx:156-228`). `useScheduleData` tags added rows with the active `franchiseId` when present (`src/src_figma/hooks/useScheduleData.ts:139-166`), and `scheduleStorage` stores `franchiseId`, `seasonNumber`, teams, status, result, and `gameLogId` (`src/utils/scheduleStorage.ts:28-48`).

2. **CSV-imported schedule rows are unknown.** A repo search found no active CSV schedule import/review/parse path in `src/src_figma`, `src/utils`, or `src/engines`. The storage model can hold imported rows if they are transformed into `addGame()` inputs, but no repo evidence proves CSV import exists.

3. **Generated schedule paths are still present and must not be accepted for v1.** `initializeFranchise()` calls `generateSchedule()` and writes generated rows during franchise creation (`src/utils/franchiseInitializer.ts:272-289`). `generateNewSeasonSchedule()` also generates and writes a new season schedule (`src/utils/franchiseInitializer.ts:315-357`), and the season transition orchestrator calls that dependency while staging the next season (`src/utils/franchiseSeasonTransitionOrchestrator.ts:112-117`, `src/utils/franchiseSeasonTransitionOrchestrator.ts:175-182`). This conflicts with the stability cut list: generated franchise schedules are risky automation and a hard v1 exclusion (`spec-docs/FRANCHISE_V1_STABILITY_PRINCIPLES_AND_CUT_LIST.md:50-60`, `spec-docs/FRANCHISE_V1_STABILITY_PRINCIPLES_AND_CUT_LIST.md:197-210`).

4. **Regular-season GameTracker launch uses current franchise-owned roster/team state at launch.** `GameDayContent.handlePlayGame()` reads the next schedule row, repairs franchise persistence, loads both rosters through `buildFranchiseGameTrackerRoster()`, blocks launch if roster/pitcher data are missing, and captures pregame data with `scheduleGameId` (`src/src_figma/app/pages/FranchiseHome.tsx:2953-3013`). `handleLaunchGame()` then applies selected starters and navigates to GameTracker with rosters, managers, franchise/league/season/stats identity, `scheduleGameId`, game number, and innings (`src/src_figma/app/pages/FranchiseHome.tsx:3143-3264`).

5. **Playoff GameTracker launch is wired.** `handlePlayPlayoffGame()` derives home/away from the playoff series, loads franchise rosters/team snapshots, resolves managers, blocks missing lineup benchmarks, and navigates with `competitionType: 'playoff'`, `playoffId`, `playoffSeriesId`, `playoffGameNumber`, franchise/league/season context, rosters, managers, and innings (`src/src_figma/app/pages/FranchiseHome.tsx:797-927`).

6. **Schedule completion occurs after GameTracker aggregation succeeds, but schedule completion failure is non-fatal.** GameTracker waits for `hookEndGame()`/aggregation before marking the schedule row complete (`src/src_figma/app/pages/GameTracker.tsx:11491-11512`, `src/src_figma/app/pages/GameTracker.tsx:11540-11563`). If `completeScheduleGame()` fails, the error is logged and the flow continues. This can leave a completed archive/stat update without schedule completion.

## Snapshot/idempotency findings

1. **Launch-time snapshot behavior is mostly implemented.** GameTracker blocks fresh game initialization without real launch rosters (`src/src_figma/app/pages/GameTracker.tsx:551-592`, `src/src_figma/app/pages/GameTracker.tsx:4323-4334`). On fresh launch it converts passed roster data into starting lineups, bench, active pitchers, optimal/chosen lineup snapshots, then calls `initializeGame()` with franchise, schedule, league, playoff, and rules context (`src/src_figma/app/pages/GameTracker.tsx:4355-4588`).

2. **Game headers preserve initial lineup/pitcher snapshots.** `initializeGame()` writes a game header with identity and starting lineups (`src/src_figma/hooks/useGameState.ts:4251-4275`). The `GameHeader` model stores franchise/schedule/playoff identity, starting lineups, bench rosters, starting pitchers, optimal/chosen lineup snapshots, final score, and aggregation status (`src/utils/eventLog.ts:144-207`).

3. **Active-game save/load/resume preserves the launched game rather than refreshing from later roster edits.** Current-game persistence stores score, inning, bases, team names/ids, season/competition/franchise/schedule identity, playoff context, lineup snapshots, lineup state, runner tracker, pitcher stats, scoreboard, team colors, and mojo/fitness (`src/utils/gameStorage.ts:60-378`; `src/src_figma/hooks/useGameState.ts:5907-5967`). The restore path prefers the current-game snapshot and restores lineup refs, lineup state, optimal/chosen snapshots, identity refs, playoff refs, DH/rules, scoreboard, and mojo/fitness (`src/src_figma/hooks/useGameState.ts:4435-4714`).

4. **Core completion has an aggregation guard, but it is not transactionally complete.** `completeGameInternal()` checks `header.aggregated` before running `processCompletedGame()`, and marks the header aggregated after success (`src/src_figma/hooks/useGameState.ts:11098-11178`). The guard prevents many double-aggregation cases, but aggregation, archive, and `markGameAggregated()` are separate writes. A crash after season stats/archive and before `markGameAggregated()` could still leave retry risk.

5. **Archive overwrite is idempotent by `gameId`; season stats are additive.** `archiveCompletedGame()` uses `store.put(record)` keyed by `gameId` (`src/utils/gameStorage.ts:705-834`), so the archive itself replaces. `aggregateGameToSeason()` increments existing batting/pitching/fielding/fame totals (`src/utils/seasonAggregator.ts:92-172`, `src/utils/seasonAggregator.ts:177-309`), so replay without a durable aggregate ledger would double-count.

6. **Playoff series result replacement is idempotent per game number, but next-round creation is not proven idempotent.** `recordSeriesGame()` replaces an existing `SeriesGame` with the same `gameNumber` and recalculates wins (`src/utils/playoffStorage.ts:819-878`). However, after a completed series, `completeGameInternal()` can call `createNextRoundSeries()` whenever the round is complete (`src/src_figma/hooks/useGameState.ts:11287-11355`), and `createNextRoundSeries()` creates new series records without a visible guard against existing next-round series (`src/utils/playoffStorage.ts:978-1081`). Retry/double-completion could duplicate next-round series.

## Stats aggregation findings

1. **Core batting aggregation exists.** `PlayerSeasonBatting` stores games, PA, AB, hits, extra-base hits, RBI, runs, walks, strikeouts, HBP, sac flies/bunts, steals, caught stealing, GIDP, D3K, fame, and WAR placeholders (`src/utils/seasonStorage.ts:36-76`). `aggregateBattingStats()` increments these from `PersistedGameState.playerStats` (`src/utils/seasonAggregator.ts:177-213`).

2. **Core pitching aggregation exists.** `PlayerSeasonPitching` stores games, starts, outs, hits/runs/earned runs allowed, walks, strikeouts, HR, HBP, wild pitches, decisions, saves, holds, blown saves, achievements, fame, and pWAR placeholder (`src/utils/seasonStorage.ts:78-123`). `aggregatePitchingStats()` increments those values and derives quality starts, complete games, shutouts, no-hitters, perfect games, and pitcher decisions (`src/utils/seasonAggregator.ts:219-278`).

3. **Core fielding aggregation exists but is limited by the game-state tally shape.** `PlayerSeasonFielding` supports putouts, assists, errors, double plays, special SMB4 events, and by-position buckets (`src/utils/seasonStorage.ts:125-145`). `aggregateFieldingStats()` currently increments games, putouts, assists, errors, diving catches, robberies, and nutshots from `gameState.playerStats` (`src/utils/seasonAggregator.ts:281-309`). The comment notes DP and position-specific stats need more tracking.

4. **Team stats are not a distinct season aggregation pipeline.** Standings calculate team W/L, runs, run differential, streak, last 10, home/away records, and games back from completed-game archives (`src/utils/seasonStorage.ts:815-967`). Schedule helpers compute simpler team schedule stats from schedule rows (`src/utils/scheduleStorage.ts:442-468`, `src/utils/scheduleStorage.ts:608-629`). No separate team batting/pitching/fielding totals store was found.

5. **Regular-season and playoff player stats are not cleanly separated.** Playoff GameTracker launch passes `seasonId` and `statsScopeId` as the active franchise season (`src/src_figma/app/pages/FranchiseHome.tsx:907-914`). End-game processing sends that same scope into `processCompletedGame()`/`aggregateGameToSeason()` for every completed game, including playoffs (`src/src_figma/hooks/useGameState.ts:11104-11120`, `src/src_figma/hooks/useGameState.ts:11131-11169`). Then playoff stats are also aggregated separately into `playoffStats` (`src/src_figma/hooks/useGameState.ts:11376-11391`, `src/utils/playoffStorage.ts:1271-1505`). Result: postseason games can inflate regular-season season totals unless downstream queries explicitly filter them out, and the core season stat tables do not include `competitionType`.

6. **Regular-season standings can be polluted by playoff completed games.** `calculateStandings(seasonId)` calls `getRecentGames(500, { seasonId })` and processes all matching completed-game archives, with no `competitionType: 'franchise'` filter (`src/utils/seasonStorage.ts:831-967`). Completed playoff archives use the same season id, so playoff games can change standings after the regular season.

7. **Milestone detection runs from gameplay aggregation, but final-score-only records must not feed it.** `aggregateGameToSeason()` runs `aggregateGameWithMilestones()` when enabled (`src/utils/seasonAggregator.ts:123-158`). The stability cut list forbids final-score-only fabricated milestones or awards inputs (`spec-docs/FRANCHISE_V1_STABILITY_PRINCIPLES_AND_CUT_LIST.md:197-210`). Any future final-score-only result entry must bypass player stat aggregation, WPA, milestones, awards, and fame.

## Playoff integration findings

1. **Playoff storage is franchise/season aware.** `aggregateGameToPlayoffStats()` validates franchise identity, season identity, stats scope, and season number before aggregating a franchise playoff game (`src/utils/playoffStorage.ts:1271-1325`).

2. **Series recording updates wins and winner from completed playoff games.** `recordSeriesGame()` rejects tied completed games, replaces same-game-number rows, recalculates series wins, and marks a winner when either team reaches `gamesRequired` (`src/utils/playoffStorage.ts:819-878`).

3. **Playoff advancement exists but needs retry guards.** GameTracker updates eliminated teams, completes the playoff on final-round completion, or creates the next round and increments `currentRound` (`src/src_figma/hooks/useGameState.ts:11287-11364`). The missing guard against duplicate next-round creation is a v1 stability risk.

4. **Playoff stats are additive and lack a per-game contribution ledger.** `aggregateGameToPlayoffStats()` reads existing stats by `playoffId` and adds the current game contribution to each player (`src/utils/playoffStorage.ts:1417-1505`). GameTracker only calls it when `!alreadyAggregated`, but that guard is shared with regular season aggregation, not a playoff-specific contribution ledger.

## Blockers for v1 stability

1. **Remove or disable generated franchise schedules.** This includes startup schedule generation, new-season schedule generation, and any total-games derivation that silently calls `generateSchedule()` when no schedule exists.

2. **Separate regular-season and playoff stat/standings scopes.** Playoff games must not change regular-season standings or regular-season player totals. Either use separate postseason stat scope(s), add competition-aware stat records, or filter all regular-season consumers by `competitionType: 'franchise'`.

3. **Make completion idempotency durable across archive, season aggregation, schedule completion, and playoff aggregation.** The current `header.aggregated` guard is useful but not enough for crash/retry windows. A completed-game contribution ledger or atomic journal is needed before v1 can claim retry/restore/double-completion safety.

4. **Guard playoff next-round creation.** Before creating round N+1, check whether round N+1 series already exist for the playoff. Retry must not duplicate bracket state.

5. **Add or explicitly defer final-score-only result entry.** The stability principles allow manual final-score-only results but forbid fabricated player stats/WPA/milestones/awards. Repo evidence shows `SKIPPED` and guarded simulation, not a final-score-only entry path.

6. **Resolve schedule/archive divergence.** If schedule completion fails after stats/archive success, the user can see completed stats with an unresolved schedule row. Completion should either retry/repair schedule status or surface a durable repair task.

## Non-blocking gaps

1. **CSV schedule import is not proven.** Treat as unknown, not implemented.

2. **Full schedule editing is not proven.** Add/delete exists; edit/swap/move/reorder were not found in active UI.

3. **Fielding event rows do not carry franchise/schedule identity directly.** Fielding scope can be derived through game headers, but direct row identity is weaker than AtBat/BetweenPlay identity.

4. **Advanced standings fields are incomplete.** Core W/L, win pct, runs, run differential, streak, last 10, home/away, and games back exist. Magic number, elimination number, playoff status, division record, and unresolved tie prompting were not proven.

5. **Team stat aggregation is standings-oriented.** No full team batting/pitching/fielding aggregation store was found.

6. **Synthetic simulation code remains present but guarded off.** The guard `MODE_2_V1_SYNTHETIC_SIM_ENABLED = false` hides simulation UI and handlers (`src/src_figma/app/pages/FranchiseHome.tsx:99`, `src/src_figma/app/pages/FranchiseHome.tsx:3595-3620`). Keeping dead simulation code is less urgent than generated schedules, but it should not be presented as v1 behavior.

## Recommended next implementation slices

1. **Slice A: Schedule source policy cleanup.** Remove generated schedule writes from franchise creation and new-season transition. Preserve empty startup, manual add/delete, and user-supplied CSV import only after an explicit import/review path exists.

2. **Slice B: Competition-aware stats and standings boundary.** Decide whether regular season and playoffs use separate `statsScopeId`s or a shared season id with `competitionType` filters. Apply that decision consistently to `calculateStandings()`, season stat hooks, leaders, season summaries, and Mode 3 handoff.

3. **Slice C: Completion journal/idempotency.** Add a durable per-game completion journal or contribution ledger covering season stat aggregation, archive, schedule completion, playoff series result, and playoff stat aggregation. Retry should inspect completed steps and finish missing steps without double-counting.

4. **Slice D: Playoff advancement idempotency.** Add next-round existence checks and tests for retry after series completion.

5. **Slice E: Final-score-only result entry.** If v1 includes it, implement as team result only: completed archive/schedule/standings input with empty player stats, no WPA, no milestones, no awards, no fame, and explicit provenance.

6. **Slice F: Schedule row editing/import.** Add explicit edit/correction and CSV review only after the no-generation baseline is stable.

## Focused tests to run or add later

1. Regular-season manual schedule row launches GameTracker with `franchiseId`, canonical `seasonId`, `statsScopeId`, `scheduleGameId`, roster snapshots, selected starters, and current franchise-owned player/team data.

2. CSV-imported row, once implemented, produces the same launch contract as a manual row and does not infer missing games.

3. Active game resumed after roster edits keeps the originally launched lineup, bench, starting pitchers, selected pitcher state, schedule id, playoff context, and team names.

4. Refresh during PRE_GAME, LIVE, and POST_FINAL_OUT restores correct snapshot or durable replay without duplicating events or stats.

5. End-game retry after archive success but before `markGameAggregated()` does not double-count batting, pitching, fielding, fame, milestones, playoff stats, or season games.

6. Schedule completion failure after successful aggregation/archive creates a repairable state and does not silently advance the schedule.

7. Playoff game completion updates only playoff series/postseason stats and does not alter regular-season standings or regular-season player totals.

8. Replaying/double-clicking playoff completion does not create duplicate next-round series.

9. Final-score-only result entry, if added, updates schedule/standings only and leaves player stats, WPA, milestones, awards inputs, fame, and GameTracker event streams empty.

10. Season summary separates regular-season completed games from playoff completed games and preserves skipped schedule rows without fabricated stats.
