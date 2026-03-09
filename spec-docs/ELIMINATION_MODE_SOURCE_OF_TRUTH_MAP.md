# Elimination Mode Source Of Truth Map

## Scope

This document maps the current canonical owner for each elimination-related concern.

It answers:

- what layer is authoritative
- what layers are mirrors, derived views, or partial sidecars
- where truth changes over time
- where one subsystem silently stops being the source of truth

Everything here is scoped to the current Elimination setup/runtime path and its museum/stat-reference seam.

## Canonical layers used in this map

### Layer names

- `League Builder DB`
  - `kbl-league-builder`
- `Elimination metadata`
  - `kbl-app-meta / eliminationList`
- `Elimination snapshot`
  - `kbl-tracker / rosterSnapshots`
- `Playoff DB`
  - `kbl-playoffs`
- `GameTracker page state`
  - page-local React state in `GameTracker.tsx`
- `useGameState`
  - shared baseball runtime state and end-game orchestration
- `Event log DB`
  - `kbl-event-log`
- `Tracker DB`
  - `kbl-tracker` shared game/season/career/completed-game stores
- `Museum DB`
  - `kbl-museum`

### Terms

- `Canonical` means the system that the live code ultimately trusts for that concern at that stage.
- `Mirror` means a copied or derived representation.
- `Derived` means recalculated/read-only from another durable source.
- `UI-only` means present in state or display but not part of durable runtime behavior.

## Top-level truth shifts

There are three major source-of-truth shifts in the Elimination path:

1. Setup time:
   - League Builder DB is canonical.
2. After bracket creation:
   - Elimination snapshot becomes canonical for roster composition and lineup/rotation inside Elimination.
3. After game launch:
   - `useGameState` becomes canonical for live baseball state and the stat/event output that feeds shared aggregation.

## Source-of-truth table

| Concern | Canonical owner now | Secondary/mirror layers | Notes |
| --- | --- | --- | --- |
| League membership for eligible elimination teams | League Builder DB | `useLeagueBuilderData()` | `selectedLeague.teamIds` drives setup |
| Team roster universe at setup | League Builder DB | `useLeagueBuilderData()` | sourced from `getPlayersByTeam(teamId)` and `getTeamRoster(teamId)` |
| Team branding before bracket creation | League Builder DB | setup UI | no elimination copy yet |
| Elimination slot metadata (`leagueId`, `leagueName`, `teamsCount`, status) | Elimination metadata | EliminationHome UI | stored in `eliminationList` |
| Frozen elimination player pool after setup | Elimination snapshot | Elimination Team Hub, launch builder | copied from League Builder at setup |
| Frozen elimination lineup after setup | Elimination snapshot | Team Hub, launch builder | specifically `lineupVsRHP` only |
| Frozen elimination rotation after setup | Elimination snapshot | Team Hub, launch builder | specifically `startingRotation` only |
| Bullpen roles / `lineupVsLHP` / depth chart inside elimination | No elimination canonical copy | League Builder DB remains original source, but live elimination does not actively use these | effectively unavailable in frozen elimination runtime |
| Post-setup elimination lineup edits | Elimination snapshot | Team Hub local state | Team Hub writes back to snapshot |
| Post-setup elimination rotation edits | Elimination snapshot | Team Hub local state | Team Hub writes back to snapshot |
| Team colors/stadium at game launch | League Builder DB | route state passed to GameTracker | live read at launch, not frozen |
| Bracket structure and series state | Playoff DB | EliminationHome UI, elimination metadata `currentRound`/`champion` | elimination metadata is summary, playoff DB is structural truth |
| Current game roster payload after navigation | Route state into GameTracker | GameTracker local arrays | built from snapshot + live team data |
| Live batting/pitching/order/baseball state during a game | `useGameState` | GameTracker page state/UI render props | canonical runtime engine for live game logic |
| Live roster arrays displayed in GameTracker | GameTracker page state + `useGameState` refs | currentGame snapshot | page owns visible arrays; `useGameState` owns canonical runtime lineup refs |
| In-progress crash/refresh recovery | `currentGame` snapshot plus event log/header fallback | `useGameState` rebuild process | primary recovery is `currentGame`; secondary recovery is event log + header |
| Event-by-event at-bat history | Event log DB | `useGameState` current memory | immediate-write durable event truth |
| Fielding event history | Event log DB | end-game fielding tally | durable fielding sidecar |
| Between-play event ledger | Intended Event log DB store exists, but current live path is incomplete | page/hook local state | not a reliable canonical ledger today |
| End-of-game batting/pitching/fielding input to aggregation | `PersistedGameState` built by `useGameState.endGame()` | completed-games archive | generated from live runtime state plus fielding events |
| Season batting/pitching/fielding totals for elimination season | Tracker DB season stores | season-summary consumers | keyed by elimination season ID + rewritten player ID |
| Career batting/pitching/fielding totals | Tracker DB career stores | museum pipeline, milestone systems | keyed by rewritten player ID |
| Elimination playoff leaders | Playoff DB `playoffStats` | EliminationHome leaders tab | direct read from playoff stats |
| Elimination awards | Elimination metadata after computation | awards tab | derived from playoff stats and cached on metadata |
| Completed elimination bracket history list | Playoff DB completed elimination playoffs | EliminationHome history tab | history tab derives from all completed elimination playoffs |
| Elimination mojo/fitness carryover | Tracker DB `mojoFitnessSnapshots` | GameTracker player state on next launch | keyed by eliminationId + rewritten player ID |
| Museum all-time leaders | Museum DB once populated | career stores as source during population | auto-populates from career only when museum leaders are empty |
| Museum standings / awards / records / moments | Museum DB | Museum UI | no direct elimination write path found |

## Concern-by-concern detail

### 1. Team eligibility and league context

Canonical owner:

- League Builder DB

Why:

- `EliminationSetup.tsx` derives `leagueTeams` from `selectedLeague.teamIds`
- `useLeagueBuilderData()` simply loads League Builder rows

What changes source of truth:

- Nothing changes this during setup.
- After creation, elimination metadata stores only summary league identity, not full team membership logic.

### 2. Elimination roster truth after bracket creation

Canonical owner:

- `rosterSnapshots` in Tracker DB

Why:

- Game launch reads snapshots, not League Builder rosters
- Team Hub edits snapshots directly

Important boundary:

- League Builder remains the historical origin
- snapshot becomes the live elimination roster truth

### 3. Team presentation truth after bracket creation

Canonical owner:

- League Builder team row at game-launch time

Why:

- `EliminationHome.tsx` fetches `getTeam(teamId)` when launching a game
- colors/stadium are injected from that live team row

Important split:

- roster truth = snapshot
- presentation truth = live League Builder team row

### 4. Live baseball truth during a game

Canonical owner:

- `useGameState`

Why:

- it initializes lineups, batting order, pitcher state, score, bases, outs
- it owns end-game aggregation orchestration
- GameTracker UI renders and supplements it, but the hook builds the durable end-game object

Important nuance:

- GameTracker page state still owns visible roster arrays for substitutions/modals
- but the hook owns the canonical lineup refs and live player/pitcher stat maps consumed at end game

### 5. In-progress persistence truth

Primary canonical durable owner:

- `currentGame` in Tracker DB

Fallback durable owner:

- Event log DB (`gameHeaders`, `atBatEvents`, `fieldingEvents`)

Why:

- `useGameState` explicitly says currentGame is the primary rehydration path
- only if exact snapshot rehydration is not available does it reconstruct from header + events

### 6. End-of-game aggregation truth

Canonical owner:

- `PersistedGameState` built inside `useGameState.endGame()`

Why:

- all downstream season/career/playoff aggregation reads that object
- completed-game archive also stores that object’s derived arrays

This means the canonical truth for season/career/playoff writes is not the raw route payload, not the snapshot, and not the UI arrays alone. It is the end-game object built by `useGameState`.

### 7. Bracket advancement truth

Canonical owner:

- Playoff DB (`playoffs` + `series`)

Why:

- series wins/losses and winner state are recorded in `recordSeriesGame()`
- round advancement is driven by `createNextRoundSeries()`
- elimination metadata only mirrors `currentRound` and `champion`

### 8. Leaders truth

Canonical owner:

- Playoff DB `playoffStats`

Why:

- EliminationHome leaders tab reads `getPlayoffLeaders()`
- those values are not read from season or career stores

### 9. Awards truth

Canonical owner after bracket completion:

- Elimination metadata `awards`

Underlying derived source:

- Playoff DB `playoffStats`

Why:

- awards are computed from playoff stats
- then cached onto elimination metadata

### 10. Almanac/Museum truth

Canonical owner:

- Museum DB for actual museum views

Derived source for one subset:

- career storage when all-time leaders store is empty

Why:

- Museum UI reads museum stores
- it does not directly query Elimination, season, or playoff storage

Important consequence:

- Museum is not a live federated view over current elimination stores
- it is a separate persistence layer that may lag behind shared stat stores

## Source-of-truth transitions by lifecycle step

### Before user creates a bracket

- league/teams/players/rosters: League Builder DB
- elimination slot: none yet
- bracket: none yet

### Immediately after bracket creation

- elimination metadata: Elimination metadata store
- roster composition: Elimination snapshot store
- bracket series structure: Playoff DB

### After Team Hub edits

- lineup/rotation in elimination context: Elimination snapshot store

### After game launch

- launch payload: route state
- live baseball state: `useGameState`
- visible UI roster arrays: GameTracker page state
- live in-progress durable recovery: `currentGame`

### After game completion

- season/career totals: Tracker DB season/career stores
- bracket state and playoff totals: Playoff DB
- elimination award cache: Elimination metadata store after completion only
- completed-game archive: Tracker DB completedGames

### When user opens Museum/Almanac

- museum views: Museum DB
- all-time leader seed source only when empty: Tracker DB career stores

## Current anti-patterns and split truths

### Split truth 1: roster vs branding

- roster truth after setup = Elimination snapshot
- branding/stadium truth at launch = live League Builder team row

### Split truth 2: stable player identity vs gameplay identity

- stable identity before launch = League Builder / Elimination snapshot
- canonical identity after launch = `useGameState` side/name ID

### Split truth 3: game recovery truth

- preferred durable truth = `currentGame`
- fallback durable truth = header + at-bat events + fielding events

### Split truth 4: museum leaders

- museum display truth = Museum DB
- leader population source = career store only when museum leaders are empty

## Bottom line

The current Elimination architecture is not a single-source-of-truth system. It is a staged-truth system:

1. League Builder owns initial league/team/player truth.
2. Elimination snapshots own frozen roster truth after creation.
3. Live League Builder team rows still own branding/stadium truth at game launch.
4. `useGameState` owns live baseball truth once the game starts.
5. Tracker DB and Playoff DB own aggregated elimination output truth.
6. Museum DB owns Almanac/Museum display truth, with only partial indirect backfill from career storage.

