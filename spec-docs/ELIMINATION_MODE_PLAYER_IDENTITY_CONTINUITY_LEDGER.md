# Elimination Mode Player Identity Continuity Ledger

## Scope

This document traces only the current live Elimination path for player identity:

Mode 1 / League Builder -> Elimination setup snapshot -> Elimination Team Hub -> GameTracker launch payload -> live game/session IDs -> in-progress persistence -> end-game season/career/playoff writes -> Elimination awards -> Museum/Almanac consumers.

Everything here is based on direct code reads. Where an item is labeled "inference", it is a control-flow inference from validated code.

## Executive finding

Current Elimination preserves stable League Builder player identity only up to the GameTracker launch payload.

The stable Mode 1 `player.id` is then replaced as the canonical runtime/stat key by a side/name ID:

- `away-{normalized-name}`
- `home-{normalized-name}`

That rewritten ID becomes the persisted key for:

- live game state
- current-game autosave
- season stats
- career stats
- playoff stats
- elimination awards
- elimination mojo/fitness carryover
- museum all-time leaders when populated from career storage

Original team IDs survive. Original player IDs do not remain canonical.

## Evidence chain

### Stage 1: Mode 1 stable identity

Source:

- `src/utils/leagueBuilderStorage.ts`

Direct facts:

- `Player.id` is the stable League Builder player ID.
- `TeamRoster` lineup and rotation fields reference those stable player IDs.

Relevant definitions:

- `Player.id` at `leagueBuilderStorage.ts:101-139`
- `LineupSlot.playerId` at `leagueBuilderStorage.ts:142-146`
- `TeamRoster.startingRotation` at `leagueBuilderStorage.ts:163-177`

## Symbolic example

To avoid inventing real data, this ledger uses a symbolic player:

- stable League Builder player ID: `<lbPlayerId>`
- player name: `<First Last>`
- team ID: `<teamId>`

The exact breakage is structural and does not depend on the specific values.

## Continuity table

| Stage | Representation of player identity | Team identity | Durable? | Canonical at this stage? | Direct code basis |
| --- | --- | --- | --- | --- | --- |
| League Builder player row | `<lbPlayerId>` | `<teamId>` via `currentTeamId` | Yes | Yes | `leagueBuilderStorage.ts:101-139` |
| League Builder lineup/rotation | `LineupSlot.playerId = <lbPlayerId>` | implicit by team roster record | Yes | Yes | `leagueBuilderStorage.ts:142-177` |
| Elimination roster snapshot `players` | `Player.id = <lbPlayerId>` | `snapshot.teamId = <teamId>` | Yes | Yes | `eliminationRosterStorage.ts:17-26`, `177-193`, `199-228` |
| Elimination snapshot `lineup` | `slot.playerId = <lbPlayerId>` | `snapshot.teamId = <teamId>` | Yes | Yes | `eliminationRosterStorage.ts:23-25`, `190-191` |
| Elimination Team Hub edits | still `<lbPlayerId>` | still `<teamId>` | Yes | Yes | `EliminationTeamHub.tsx:129-223` |
| GameTracker launch roster object | `playerId: <lbPlayerId>` on roster object | route state `homeTeamId` / `awayTeamId` = `<teamId>` | Yes, in navigation payload only | Not canonical for gameplay | `eliminationRosterStorage.ts:95-124`, `127-156`, `288-331`; `EliminationHome.tsx:255-294` |
| GameTracker initialization lineup/bench/starter IDs | `away-{normalized-name}` or `home-{normalized-name}` | original `homeTeamId` / `awayTeamId` | In memory first | Yes | `GameTracker.tsx:800-873` |
| `useGameState` refs/maps | rewritten side/name IDs | original team IDs | In memory and later autosaved | Yes | `useGameState.ts:1355-1488` |
| `currentGame` autosave | rewritten side/name IDs in `playerStats`, `pitcherGameStats`, lineup refs, substitution log | original team IDs | Yes | Yes for in-progress recovery | `useGameState.ts:2010-2215`; `gameStorage.ts:38-276`, `278-315` |
| Event log at-bats | rewritten batter/pitcher IDs | original team IDs | Yes | Yes for event log | `eventLog.ts:140-178`; writer path used by `useGameState` |
| End-game `PersistedGameState.playerStats` | rewritten side/name IDs | original team IDs | Yes | Yes for aggregation input | `useGameState.ts:4319-4373`, `4455-4500` |
| End-game `pitcherGameStats` | rewritten side/name IDs | original team IDs | Yes | Yes for aggregation input | `useGameState.ts:4400-4445` |
| Season rows | key `[seasonId, rewrittenPlayerId]` | row `teamId = original team ID` | Yes | Yes for season stats | `trackerDb.ts:72-97`; `seasonStorage.ts:35-148`, `276-356`, `242-267`; `seasonAggregator.ts:141-177`, `183-242`, `248-260+` |
| Career rows | key `rewrittenPlayerId` | row `teamId = original team ID` | Yes | Yes for career stats | `trackerDb.ts:103-127`; `careerStorage.ts:36-169`, `312-352`; `milestoneAggregator.ts:79-135`, `140-213`, `717-875` |
| Playoff rows | key `{playoffId}-{rewrittenPlayerId}` | row `teamId = original team ID` | Yes | Yes for Elimination leaders/awards | `playoffStorage.ts:137-179`, `759-940` |
| Elimination awards | `award.playerId = rewrittenPlayerId` | `award.teamId = original team ID` | Yes, on elimination metadata | Yes for awards tab | `eliminationAwards.ts:15-97`; `EliminationHome.tsx:202-230` |
| Mojo/Fitness carryover | key `[eliminationId, rewrittenPlayerId]` | no team key | Yes | Yes for elimination inter-game carryover | `trackerDb.ts:148-153`; `GameTracker.tsx:3317-3333`; `mojoFitnessStorage.ts:7-40` |
| Museum all-time leaders populated from career | `leader.playerId = rewrittenPlayerId` | `leader.teamId = original team ID` | Yes | Yes for museum leader row | `museumPipeline.ts:29-49`, `55-74`, `84-114` |

## Detailed continuity narrative

### 1. Mode 1 / League Builder is stable up front

League Builder stores the player under a stable `Player.id`.

That same stable player ID is referenced by:

- `TeamRoster.lineupVsRHP`
- `TeamRoster.lineupVsLHP`
- `TeamRoster.startingRotation`

So before Elimination setup begins, Mode 1 identity is internally consistent.

### 2. Elimination setup preserves stable player IDs

`createRosterSnapshots(eliminationId, teamIds)` reads:

- `getTeam(teamId)`
- `getTeamRoster(teamId)`
- `getPlayersByTeam(teamId)`

and stores the raw League Builder players plus raw lineup/rotation IDs.

There is no identity translation here.

Important consequence:

- snapshot `players[].id` is still the stable League Builder player ID
- snapshot `lineup[].playerId` is still the stable League Builder player ID
- snapshot `startingRotation[]` is still the stable League Builder player ID

### 3. Elimination Team Hub still works in stable Mode 1 identity

`EliminationTeamHub.tsx` reads and writes snapshot lineup/rotation values by stable player ID.

When the user:

- swaps lineup players
- changes batting order
- changes fielding positions
- promotes a starter

the persisted snapshot remains keyed to original League Builder player IDs.

No side/name IDs exist yet.

### 4. GameTracker roster payload still contains stable LB player IDs

`buildEliminationGameTrackerRoster()` converts the snapshot into GameTracker roster objects.

Both conversion helpers explicitly place the League Builder `player.id` into the outgoing roster object:

- `convertToGameTrackerPlayer(...).playerId = player.id`
- `convertToGameTrackerPitcher(...).playerId = player.id`

At this boundary, identity continuity is still intact.

### 5. The break happens in `GameTracker.tsx`

`GameTracker.tsx` documents the intent directly:

- stable LB `playerId` is available for cross-reference
- game-session IDs remain name-based for backward compatibility

When it builds the actual `initializeGame()` payload, it does **not** pass through the original `playerId`.

Instead it rebuilds IDs as:

- `away-${name}`
- `home-${name}`

for:

- lineup players
- bench players
- starting pitchers

This is the first point where the canonical identity changes.

### 6. `useGameState` makes the rewritten ID canonical

`initializeGame(config)` stores the passed lineup/pitcher IDs into:

- `awayLineupRef`
- `homeLineupRef`
- `awayLineupStateRef`
- `homeLineupStateRef`
- `playerStats`
- `pitcherStats`
- `gameState.currentBatterId`
- `gameState.currentPitcherId`

All of those downstream structures use the rewritten side/name ID.

From here forward, all shared stats logic consumes the rewritten player identity.

### 7. In-progress autosave preserves the rewritten ID

`useGameState` keeps a live `currentGame` snapshot.

That snapshot writes:

- `playerStats` keyed by rewritten player IDs
- `pitcherGameStats` keyed by rewritten pitcher IDs
- `awayLineup` / `homeLineup` with rewritten IDs
- lineup-state benches and current pitchers with rewritten IDs
- runner tracker snapshot values tied to rewritten runner IDs where present
- substitution log with rewritten incoming/outgoing IDs

So page refresh recovery does not return to Mode 1 identity. It restores the rewritten gameplay identity.

### 8. Event log also follows rewritten IDs

The event log schema stores:

- `batterId`
- `pitcherId`
- fielding-event `playerId`

Those values are the live GameTracker/`useGameState` IDs at event-write time.

Because gameplay has already canonicalized the rewritten side/name ID, the event log also follows that identity scheme.

### 9. End-game persisted stat input keeps rewritten IDs but preserves team IDs

At end game, `useGameState` builds:

- `playerStatsRecord`
- `pitcherGameStatsArray`

Each batting row is keyed by the rewritten player ID.

Each batting row also gets:

- `playerName`
- stable `teamId` determined from whether the player is on the away/home lineup

Each pitching row is keyed by rewritten pitcher ID and also carries stable `teamId`.

This is the exact split:

- player identity rewritten
- team identity preserved

### 10. Season aggregation permanently stores the rewritten player identity

`aggregateGameToSeason()` calls:

- `aggregateBattingStats()`
- `aggregatePitchingStats()`
- `aggregateFieldingStats()`
- `aggregateGameWithMilestones()`

Those functions use the player IDs present in the completed `PersistedGameState`.

The season stores are keyed by `[seasonId, playerId]`.

So for Elimination:

- season key = `[elimination-{eliminationId}, rewrittenPlayerId]`

### 11. Career aggregation permanently stores the rewritten player identity

`aggregateGameWithMilestones()` then calls:

- `aggregateGameToCareerBatting(gameState, playerId, ...)`
- `aggregateGameToCareerPitching(gameState, pitcherStats)`

Career stores are keyed by plain `playerId`.

So Elimination career totals are merged under the rewritten side/name ID.

This is the biggest identity continuity break in the current architecture.

### 12. Playoff stats, leaders, and awards all inherit the rewritten identity

`aggregateGameToPlayoffStats(playoffId, persistedState)` builds `PlayoffPlayerStats` rows keyed by:

- `id = {playoffId}-{playerId}`
- `playerId = rewrittenPlayerId`

Elimination leaders tab reads those rows with `getPlayoffLeaders()`.

Elimination awards derive from those same rows via `computeEliminationAwards()`.

So both the leaders tab and awards tab are downstream of rewritten player identity.

### 13. Mojo/Fitness carryover also follows rewritten identity

After `hookEndGame()`, `GameTracker.tsx` saves Elimination mojo/fitness snapshots by reading `playerStateHook.getAllPlayers()`.

Those player states are keyed to gameplay IDs, not original Mode 1 IDs.

Therefore inter-game Elimination mojo/fitness carryover also breaks continuity from Mode 1 stable player IDs.

### 14. Museum all-time leaders inherit the rewritten identity from career storage

`useMuseumData()` auto-populates all-time leaders only when the museum leader store is empty.

When it does, `populateMuseumLeaders()` reads:

- `getAllCareerBatting()`
- `getAllCareerPitching()`

and copies:

- `leader.playerId = career.playerId`

So if Elimination has contributed to career storage, the museum leader row will reference the rewritten player ID, not the original Mode 1 player ID.

## Identity continuity verdict by boundary

| Boundary | Continuity result |
| --- | --- |
| League Builder -> Elimination snapshot | Preserved |
| Elimination snapshot -> Elimination Team Hub | Preserved |
| Elimination Team Hub -> GameTracker launch payload | Preserved |
| GameTracker launch payload -> live game state | Broken |
| Live game state -> currentGame autosave | Broken, but internally consistent |
| Live game state -> season stats | Broken, but internally consistent |
| Live game state -> career stats | Broken, but internally consistent |
| Live game state -> playoff stats | Broken, but internally consistent |
| Career stats -> Museum all-time leaders | Broken, inherited from career |

## Why home/away context splits the same player

The rewritten ID is side-dependent.

If the same real player appears:

- in one game as home: `home-{name}`
- in another game as away: `away-{name}`

the current shared stat stores treat those as two different player identities.

This is not hypothetical. It follows directly from:

- launch-time side assignment in `EliminationHome.tsx`
- side/name ID generation in `GameTracker.tsx`
- season/career/playoff keys using those generated IDs

## Additional continuity risks

### 1. Same-name collision risk

Because the runtime identity is name-derived within side, two different real players with the same display name on the same side can collide into one gameplay/stat ID.

I did not find collision handling in the traced path.

### 2. No durable crosswalk

I did not find a live write path that persists:

- original League Builder `player.id`
- rewritten gameplay/stat `playerId`

as a durable mapping table.

Without that crosswalk:

- stat-reference systems cannot reliably resolve rewritten IDs back to stable Mode 1 player rows
- the system must rely on name and side context instead

### 3. Team continuity is much better than player continuity

Original team IDs survive through:

- elimination metadata
- playoff bracket rows
- live game state
- season rows
- career rows' `teamId`
- playoff rows
- museum leader rows' `teamId`

So team reference is materially more stable than player reference.

## Bottom line

Current Elimination has a clean identity story only until GameTracker initialization.

After that point:

- original League Builder player IDs become non-canonical
- side/name runtime IDs become canonical
- all downstream stat systems follow the rewritten ID

So the current codebase does **not** provide end-to-end player identity continuity from Mode 1 into Elimination-derived stat reference.

