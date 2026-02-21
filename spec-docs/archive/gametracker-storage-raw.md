# FILE SPEC: Storage Layer for GameTracker

## eventLog.ts
Path: src/utils/eventLog.ts
Lines: ~600
Purpose: Core event log system providing bulletproof data integrity for game tracking. Stores every at-bat with full situational context in IndexedDB. Events written IMMEDIATELY (not debounced). Supports game reconstruction, stat recalculation, WAR recalculation, and crash recovery.

### Database: kbl-event-log (version 1)
| Store | Key | Indexes | Purpose |
|-------|-----|---------|---------|
| gameHeaders | gameId | seasonId, date, aggregated, seasonId_aggregated | Game metadata + aggregation status |
| atBatEvents | eventId | gameId, gameId_sequence (unique), batterId, pitcherId | Individual at-bat events |
| pitchingAppearances | appearanceId | gameId, pitcherId | Pitcher entry/exit for inherited runners |
| fieldingEvents | fieldingEventId | gameId, playerId, atBatEventId | Fielding plays for FWAR |

### Key Types
- **GameHeader**: gameId, seasonId, date, teams, finalScore, isComplete, aggregated, aggregatedAt, eventCount, checksum
- **AtBatEvent**: Full situational context (45+ fields) — see useGameState for how these are created
- **RunnerState**: { first, second, third } each RunnerInfo | null
- **RunnerInfo**: { runnerId, runnerName, responsiblePitcherId }
- **BallInPlayData**: trajectory, zone, velocity, fielderIds, primaryFielderId
- **FameEventRecord**: eventType, fameType, fameValue, playerId, playerName, description
- **PitchingAppearance**: Full entry/exit tracking with inherited/bequeathed runners
- **FieldingEvent**: playType, difficulty, ballInPlay, success, runsPreventedOrAllowed

### Exported Functions
| Function | Purpose |
|----------|---------|
| createGameHeader(header) | Create new game — called at game start |
| logAtBatEvent(event) | Log at-bat IMMEDIATELY — also increments header eventCount |
| logPitchingAppearance(appearance) | Log pitcher entry/exit |
| logFieldingEvent(event) | Log fielding play |
| completeGame(gameId, finalScore, finalInning) | Mark game complete |
| markGameAggregated(gameId) | Mark as aggregated to season stats |
| markAggregationFailed(gameId, error) | Record aggregation failure |
| getUnaggregatedGames(seasonId?) | Get complete but unaggregated games (recovery) |
| getGameEvents(gameId) | Get all at-bat events sorted by sequence |
| getGamePitchingAppearances(gameId) | Get pitching appearances |
| getGameFieldingEvents(gameId) | Get fielding events |
| getGameHeader(gameId) | Get game header |
| getSeasonGames(seasonId) | Get all games for season sorted by date |

### Storage Cost Estimate
~500 bytes/at-bat x 70 at-bats/game = ~35KB/game
8 teams x 128 games = 512 games/season x 35KB = ~18MB/season

---

## gameStorage.ts
Path: src/src_figma/utils/gameStorage.ts
Lines: ~409
Purpose: Game persistence layer providing current game state save/load and completed game archiving. Uses a SEPARATE IndexedDB database from eventLog (kbl-tracker vs kbl-event-log).

### Database: kbl-tracker (version 2)
| Store | Key | Indexes | Purpose |
|-------|-----|---------|---------|
| currentGame | id (always 'current') | — | Single active game state, overwritten |
| completedGames | gameId | date, seasonId | Completed game archive |
| playerGameStats | [gameId, playerId] | playerId, gameId | Player per-game stats |
| pitcherGameStats | [gameId, pitcherId] | pitcherId, gameId | Pitcher per-game stats |

### Key Types
- **PersistedGameState**: Complete game snapshot (180 lines of fields) — includes gameState, playerStats (Record), pitcherGameStats (Array), fameEvents, fame detection state
- **CompletedGameRecord**: Archived game with finalScore, fameEvents, playerStats, pitcherGameStats, inningScores (EXH-011)

### Exported Functions
| Function | Purpose |
|----------|---------|
| initDatabase() | Initialize IDB |
| saveCurrentGame(state) | Save active game state |
| loadCurrentGame() | Load active game (returns null if none) |
| clearCurrentGame() | Clear after game complete |
| hasSavedGame() | Check for saved game |
| archiveCompletedGame(state, score, inningScores) | Archive completed game (EXH-011) |
| getRecentGames(limit=10) | Get recent games descending by date |
| getCompletedGameById(gameId) | Get specific completed game |
| debouncedSaveCurrentGame(state, delay=500) | Debounced save (500ms default) |
| immediateSaveCurrentGame(state) | Immediate save (navigation away) |

### Dual Database Architecture
**IMPORTANT**: GameTracker uses TWO IndexedDB databases:
1. **kbl-event-log** (eventLog.ts) — Append-only event log for data integrity/reconstruction
2. **kbl-tracker** (gameStorage.ts) — Mutable game state for persistence/recovery

The event log is the source of truth; gameStorage provides convenience access for display purposes.

---

## seasonAggregator.ts
Path: src/storage/seasonAggregator.ts
Purpose: Aggregates completed game stats into season totals. Called from completeGameInternal() in useGameState after game ends.

Key function: `aggregateGameToSeason(persistedState, { seasonId })` — Takes PersistedGameState and accumulates to season-level stats in IndexedDB.
