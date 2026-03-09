# Elimination Mode Live vs Dormant vs Implied Matrix

## Scope

This matrix classifies elimination-related features and controls by their current implementation state.

Statuses used:

- `Live + durable`
  - user action exists and produces durable state/data changes
- `Live + local only`
  - user action exists but effects are local/in-memory/non-durable
- `Partial`
  - feature exists and does some real work, but important parts are missing or inconsistent
- `UI-only / implied`
  - visible option or summary exists, but is not part of the durable execution path
- `Derived read-only`
  - no user mutation; view is generated from durable data

This is scoped to elimination setup, elimination home, elimination roster management, and the elimination-specific parts of the shared GameTracker path.

## Setup surface

| Feature/control | Status | Current truth |
| --- | --- | --- |
| Select League | Live + durable | drives `leagueId`/`leagueName` in elimination metadata and filters seedable teams |
| Team count (`numTeams`) | Live + durable | affects playoff config and number of snapshots/teams in bracket |
| Series lengths | Live + durable | stored into playoff config `gamesPerRound` |
| Innings per game | Live + durable | stored in playoff config and passed into GameTracker `totalInnings` |
| Use DH | Live + durable | stored in playoff config and passed into GameTracker |
| Seed order controls | Live + durable | changes seeded team ordering used to create playoff teams/series |
| Bracket name | Live + durable | stored in elimination metadata |
| Controlled teams selection | UI-only / implied | maintained in setup state and shown in confirmation count, but not persisted into elimination/runtime path |
| Home field pattern selection | UI-only / implied | maintained in setup state and shown in confirmation summary, but not used to generate/play series |
| Auto-seed SMB4 data when no leagues exist | Live + durable | calls League Builder seed path and then refreshes setup data |

## Elimination metadata and home shell

| Feature/control | Status | Current truth |
| --- | --- | --- |
| Open EliminationHome by bracket ID | Live + durable | loads elimination metadata + linked playoff config |
| Update `lastPlayedAt` on page load | Live + durable | writes metadata timestamp |
| Header league/team-count/round display | Derived read-only | driven from elimination metadata |
| Tab navigation (Bracket/TeamHub/Leaders/Awards/History) | Live + local only | UI state only; no durable effect |

## Bracket tab

| Feature/control | Status | Current truth |
| --- | --- | --- |
| Round grouping display | Derived read-only | groups live `seriesList` by round |
| Select series card | Live + local only | sets `selectedSeriesId` in UI state |
| Show next game home team | Derived read-only | uses `buildSeriesCardState()` + playoff engine home-field logic |
| Play Game button | Live + durable | launches GameTracker with elimination/playoff context |
| Completed-series winner display | Derived read-only | reads stored series winner |

## Team Hub

| Feature/control | Status | Current truth |
| --- | --- | --- |
| Team selector | Live + local only | selects which snapshot to load/edit |
| Load roster snapshot | Live + durable read | reads frozen elimination snapshot |
| Reorder batting order | Live + durable | updates snapshot lineup |
| Replace lineup player | Live + durable | updates snapshot lineup |
| Change fielding position | Live + durable | updates snapshot lineup |
| Promote starter in rotation | Live + durable | updates snapshot startingRotation |
| Edit player pool | Not exposed | no UI for adding/removing players from snapshot |
| Edit bullpen roles | Not exposed | no elimination-specific bullpen-role editor |
| Edit `lineupVsLHP` | Not exposed | no elimination-specific lefty-lineup editor |

## Game launch and roster handoff

| Feature/control | Status | Current truth |
| --- | --- | --- |
| Frozen roster launch from snapshots | Live + durable | snapshot is real launch source |
| Live team colors/stadium at launch | Live + durable read | read from current League Builder team row, not snapshot |
| Preserve stable LB player IDs into route payload | Partial | true in route payload, but not retained as canonical gameplay/stat IDs |

## Shared GameTracker path as used by Elimination

| Feature/control | Status | Current truth |
| --- | --- | --- |
| Elimination game context routing (`eliminationId`, `playoffId`, `seriesId`) | Live + durable | carried through navigation state and used at end game |
| Rebuild gameplay IDs from names | Live + durable | canonical runtime identity becomes `home-/away-name` |
| Current-game autosave | Live + durable | writes recoverable `currentGame` snapshots |
| Event log at-bat persistence | Live + durable | event log stores real at-bat history |
| Fielding event persistence | Live + durable | fielding sidecar store participates in end-game tally |
| Between-play event persistence | Partial | store exists, but live path is not a complete dedicated ledger |
| Season stat aggregation | Live + durable | writes elimination-season rows |
| Career stat aggregation | Live + durable | writes career rows keyed by rewritten player ID |
| Playoff stat aggregation | Live + durable | powers elimination leaders/awards |
| Completed game archive | Live + durable | writes completedGames record with elimination season ID |
| Undo during game | Partial | restores runtime/page state, but not already-written IndexedDB rows |
| Mojo/Fitness carryover across elimination games | Live + durable | writes and loads elimination snapshots, but keyed by rewritten gameplay IDs |
| Fan morale | Live + local only | shared hook state, not traced as durable elimination-specific persistence |
| Fame accumulation in season/career pipeline | Partial | fame-related aggregation exists, but Museum coupling is indirect and partial |
| mWAR / manager decision effect in elimination path | Partial | shared game path runs it, but elimination-specific ownership/identity issues remain from broader GameTracker path |

## Elimination leaders

| Feature/control | Status | Current truth |
| --- | --- | --- |
| Leaders tab load | Live + durable read | reads `playoffStats` |
| Batting leaderboards (AVG/HR/RBI/SB/OPS) | Derived read-only | direct sort over playoff stats |
| Pitching leaderboards (ERA/W/K/WHIP/SV) | Derived read-only | direct sort over playoff stats |
| Real player identity continuity to Mode 1 | Partial | team IDs survive, player IDs are rewritten |

## Elimination awards

| Feature/control | Status | Current truth |
| --- | --- | --- |
| Compute awards after bracket completion | Live + durable | computed from playoff stats and cached to elimination metadata |
| Display awards before completion | Derived read-only | explicit “not yet” message |
| Display awards after completion | Derived read-only | reads cached metadata awards |
| Awards integrated into Museum award history | No | no direct museum write path found |

## Elimination history

| Feature/control | Status | Current truth |
| --- | --- | --- |
| History tab list | Derived read-only | built from all completed elimination playoffs in Playoff DB |
| Champion / runner-up summary | Derived read-only | computed from playoff config and final series |
| Deep linked historical game logs | Not exposed | no direct history-to-game-log navigation found in traced UI |

## Museum / Almanac seam

| Feature/control | Status | Current truth |
| --- | --- | --- |
| Museum all-time leaders reflecting elimination contributions | Partial | possible indirectly through career storage, but only auto-populates when museum leaders are empty |
| Museum team history reflecting elimination | No | no direct season-standing museum write path found |
| Museum award history reflecting elimination awards | No | elimination awards are stored on elimination metadata, not museum awards |
| Museum records/moments/retired jerseys/stadiums reflecting elimination automatically | No | no direct elimination write path found |

## Most important “looks implemented but is not fully true” items

### `controlledTeamIds`

Why it is misleading:

- visible in setup
- counted in confirmation
- never enters durable elimination runtime logic

### `homeFieldPattern`

Why it is misleading:

- visible in setup
- shown in confirmation
- actual game home-team selection uses playoff engine pattern logic, not setup state

### Stable LB `playerId` cross-reference

Why it is misleading:

- launch roster payload carries original LB `playerId`
- gameplay/stat persistence does not keep it canonical

### Museum/Almanac linkage

Why it is misleading:

- elimination does write real season/career/playoff stats
- museum views do not directly read those stores except indirect leader seeding from career storage

## Bottom line

The elimination surface is materially real, not a mock:

- bracket creation
- snapshot editing
- game launch
- game completion
- round advancement
- leaders
- awards
- history

But several visible or implied concepts are weaker than the UI suggests:

- controlled-team ownership
- setup home-field pattern
- stable player identity continuity
- direct Almanac/Museum integration

