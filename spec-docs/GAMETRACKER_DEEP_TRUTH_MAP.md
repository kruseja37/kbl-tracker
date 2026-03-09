# GameTracker Deep Truth Map

Last updated: 2026-03-09

## Purpose

This document goes deeper than the reverse-engineered spec.

It maps current GameTracker behavior across:

- user action
- page handler
- hook action
- persistence side effect
- important caveats

It is intended to answer "what actually happens" at code-path level.

## Primary Execution Layers

### Layer A: User-Facing Surfaces

- `FenwayBoard`
- `EnhancedInteractiveField`
- `QuickBar`
- `PlayLogPanel`
- `EnrichmentPanel`
- `RunnerPopover`
- `FielderPopover`
- `LineupCard`
- page-level modals and overlays

### Layer B: Page-Level Orchestration

`src/src_figma/app/pages/GameTracker.tsx`

This layer:

- translates UI gestures into play intent
- owns most modals/prompts
- keeps a local play log and enrichment cache
- performs some play interpretation before calling the hook
- bridges to meta systems and navigation

### Layer C: Canonical Game Engine / Storage

`src/src_figma/hooks/useGameState.ts`

This layer:

- owns canonical game state
- writes official at-bat events
- writes current-game snapshots indirectly through autosave
- manages runner identity / inherited-runner attribution
- performs aggregation and archival

## 1. Action-To-Code Path Map

## 1.1 Route Launch

User/system action:

- navigate to `/game-tracker/:gameId`

Page path:

- `GameTracker()`
- route state parsed from `location.state`

Hook path:

- `useGameState(gameId)`
- `loadExistingGame()`
- fallback `initializeGame(...)`

Persistence:

- `createGameHeader(...)` when initializing a new game
- `loadCurrentGame()` for exact in-progress resume
- `getGameHeader()` + `getGameEvents()` fallback reconstruction when needed

Caveats:

- page-level display rosters are local state separate from hook lineup refs
- route state is critical for richer modes; absent state falls back to demo data

## 1.2 Enhanced Field Ball-In-Play

User action:

- interact with `EnhancedInteractiveField`
- classify hit/out/error/HR/foul, set fielding sequence, adjust runner outcomes, commit at-bat

Component path:

- `EnhancedInteractiveField`
- internal flow state machine
- `handleEndAtBat()`
- emits `onPlayComplete(completePlayData)`

Page path:

- `handleEnhancedPlayComplete(playData)`

Hook path:

- one of:
  - `recordHit(...)`
  - `recordOut(...)`
  - `recordWalk(...)`
  - `recordD3K(...)`
  - `recordError(...)`

Persistence:

- `logAtBatEvent(event)`
- `logFieldingEvent(fieldingEvent)` from page-level extraction path
- current-game autosave snapshot later via effect

Important page-side work before hook call:

- calculates RBI from `runnerOutcomes`
- converts `runnerOutcomes` into `RunnerAdvancement`
- injects pending enrichment via `setNextEventEnrichment(...)`
- may stop early for fielder-credit modal
- may queue error-on-advance modal after recording
- appends local `PlayLogEntry`

Caveats:

- fielding extraction is done outside the hook
- thrown-out-on-hit and manual fielder-credit flows are not fully integrated into final fielding stats

## 1.3 QuickBar Outcome

User action:

- tap QuickBar primary or overflow outcome

Page path:

- `handleQuickBarOutcome(outcome)`

Page logic:

- creates minimal `PlayData`
- calls `calculateRunnerDefaults(...)`
- derives RBI and runner advancement locally
- branches to prompt subflows when needed

Prompt subflows:

- HR: `handleHrPromptDone()` / `handleHrPromptSkip()`
- Error: `handleErrorFlowComplete(...)`
- FO with R3: `handleSfPromptAnswer(...)`
- GO with runner out: `handleDpPromptAnswer(...)`
- PO with R1+R2/<2 outs: `handleIfrPromptAnswer(...)`

Hook path:

- same hook recorders as enhanced path, but usually with less rich play context

Persistence:

- `logAtBatEvent(event)` from hook
- local `PlayLogEntry`
- current-game autosave snapshot later via effect

Caveats:

- QuickBar and Enhanced Field are not the same engine with different views
- they share hook recorders but duplicate rule interpretation in page logic

## 1.4 Runner Popover Actions

User action:

- tap base runner on field
- choose Steal / Advance / WP / PB / Pickoff / Sub / Card

Page handlers:

- `handleRunnerTap(...)`
- `handleRunnerSteal(...)`
- `handleRunnerAdvance(...)`
- `handleRunnerWP(...)`
- `handleRunnerPB(...)`
- `handleRunnerPickoff(...)`
- `handleRunnerSubstitute(...)`
- `handleRunnerPlayerCard(...)`

Hook path:

- `advanceRunner(...)`
- `recordEvent(...)` for SB / WP / PB / pickoff variants

Persistence:

- canonical bases/score/outs change in hook
- current-game autosave snapshot later via effect

What does not currently persist:

- `recordEvent(...)` does not currently call `logBetweenPlayEvent(...)`
- between-play event store exists, but this path ends in `TODO: Log to separate event store`

Caveats:

- SB/CS affect player stat maps
- WP affects pitcher stat map
- but between-play event history is not durably written through the current `recordEvent()` path

## 1.5 Batch Runner Movements

User action:

- runner-event flow in `EnhancedInteractiveField` produces multiple runner movements

Component path:

- `handleEndAtBat()` detects `pendingRunnerEvent`
- emits `onBatchRunnerMove(...)`

Page path:

- `handleBatchRunnerMove(...)`

Hook path:

- `advanceRunnersBatch(...)`

Persistence:

- canonical state mutation
- current-game autosave snapshot later via effect

Caveats:

- designed to avoid race conditions from multiple sequential runner moves

## 1.6 Fielder Popover

User action:

- tap fielder on field
- choose Substitute / Pinch Hit / Move Position / Card

Page handlers:

- `handleFielderTap(...)`
- `handleFielderSubstitute(...)`
- `handleFielderPinchHit(...)`
- `handleFielderMovePosition(...)`
- `handleFielderPlayerCard(...)`

Hook path:

- `makeSubstitution(...)`
- `switchPositions(...)`

Local page-side effects:

- updates local roster arrays
- updates overlay state

Persistence:

- substitution log inside hook state
- current-game autosave snapshot later via effect

Caveats:

- no dedicated between-play persistence call for substitutions is currently visible in the path

## 1.7 Lineup Overlay Drag/Drop

User action:

- open LINEUP overlay
- drag bench player onto lineup slot
- drag pitcher onto current pitcher slot
- drag lineup players for swaps

Page path:

- `handleLineupCardSubstitution(sub)`

Hook path:

- `changePitcher(...)`
- `makeSubstitution(...)`
- `switchPositions(...)`

Persistence:

- substitution log
- updated lineup refs / lineup-state refs
- autosaved current-game snapshot

Pitching change special case:

- `changePitcher(...)` opens pitch-count prompt for outgoing pitcher
- pending action executes after confirm/dismiss

## 1.8 Batter / Pitcher Card Taps

User action:

- tap batter or pitcher from FenwayBoard or field

Page path:

- `handleBatterTap()`
- `handlePitcherTap()`
- `openPlayerCard(...)`

Effect:

- opens `PlayerCardModal`
- allows manual mojo/fitness changes

Persistence:

- in-memory player state hook
- elimination mode snapshots saved at end of game

Caveats:

- these manual edits do not obviously write a persistent game event

## 1.9 Play Log Entry Tap

User action:

- tap play in right-hand log

Page path:

- `handleEntryTap(entry)`

Effect:

- swaps `PlayLogPanel` out for `EnrichmentPanel`

No hook call at open-time.

## 1.10 Enrichment Edit

User action:

- set location / fielding sequence / pitch type / pitches in AB / HR distance

Page path:

- `handleEnrichmentUpdate(field, value)`

Persistence:

- `updateAtBatEvent(eventId, { enrichment: ... })`

Additional page-side effects:

- updates local enrichment cache
- updates local `PlayLogEntry` badges
- sets `isQAB` when `pitchesInAtBat >= 7`

Caveats:

- enrichment is persisted to `AtBatEvent`
- local play log remains a separate projection, not a live query of the persisted event

## 1.11 K / Kc Toggle

User action:

- tap `K?` badge in play log

Page path:

- `handleKToggle(entry)`

Persistence:

- `updateAtBatEvent(eventId, { result: 'K' | 'Kc', editHistory: ... })`

Caveats:

- local play log entry is updated manually after store write

## 1.12 End Inning

User action:

- explicit page `handleEndInning()` or implicit third-out auto transition

Page path:

- `handleEndInning()` does enrichment prompt check, then calls hook `endInning()`

Hook path:

- `endInning()`
- raises pitch-count prompt
- pending action executes `executeEndInning()`

Persistence:

- no immediate event-log write for the inning transition itself
- current-game snapshot later reflects new half-inning state

Caveats:

- end-of-half is pitch-count mediated in hook logic
- some page flows auto-trigger it after 500ms delay on third out

## 1.13 End Game

User action:

- tap `END`
- confirm in modal

Page path:

- `handleEndGame()`

Page responsibilities before/around hook:

- achievement detection
- fan morale update
- narrative generation
- mWAR persistence
- schedule completion
- undo clear
- route navigation to post-game summary

Hook path:

- `endGame(options)`
- prompt setup
- direct `completeGameInternal(...)` execution

Persistence:

- `completeGame(...)` on game header
- `processCompletedGame(...)`
- `aggregateGameToSeason(...)`
- `markGameAggregated(...)`
- `archiveCompletedGame(...)`
- clear current-game snapshot

Caveats:

- pitch-count prompt exists, but direct completion path also runs to avoid unmount timing issues

## 2. EnhancedInteractiveField Internal State Machine

## 2.1 Explicit Flow State

`flowStep` values:

- `IDLE`
- `HIT_LOCATION`
- `OUT_FIELDING`
- `HIT_OUTCOME`
- `OUT_OUTCOME`
- `RUNNER_CONFIRM`
- `END_CONFIRM`

## 2.2 Derived UI Phase

The component also derives a second phase model:

- `AWAITING_INPUT`
- `DRAGGING`
- `TAP_SEQUENCE`
- `CLASSIFYING`
- `RUNNER_OUTCOMES`
- `MODIFIERS_ACTIVE`

This means the field component effectively has two overlapping state models:

- declared flow steps
- derived UI phases

## 2.3 Current High-Level Field Flow

Hit flow:

1. `handleHitAction()`
2. field click via `handleHitLocationClick(...)`
3. hit outcome via `handleHitOutcome(...)`
4. runner defaults calculated
5. runner confirmation
6. `handleEndAtBat()`
7. `onPlayComplete(...)`

Out flow:

1. `handleOutAction()`
2. fielder drop(s) / throw sequence
3. `handleOutAdvance()`
4. out outcome via `handleOutOutcome(...)`
5. optional prompts
6. runner confirmation
7. `handleEndAtBat()`
8. `onPlayComplete(...)`

Runner-event flow:

1. choose contextual runner event
2. mutate `runnerOutcomes`
3. `handleEndAtBat()`
4. emits `onBatchRunnerMove(...)` or fallback `onRunnerMove(...)`
5. at-bat continues

## 2.4 Important Internal Observations

- legacy drag paths still exist alongside the newer 5-step flow
- `hideActionSelector` changes internal behavior materially
- field component enriches outgoing `PlayData` with inferred metrics and LI context
- some "special event" logic is handled in field component, some in page, some in hook

## 3. Hook Write Matrix

## 3.1 `recordHit(...)`

Writes/updates:

- `AtBatEvent`
- player batting stats
- pitcher stats
- runner tracker
- scoreboard runs/hits
- canonical bases and score
- autosaved current-game snapshot later

## 3.2 `recordOut(...)`

Writes/updates:

- `AtBatEvent`
- player batting stats
- pitcher outs / Ks / BF / pitch count
- runner tracker
- scoreboard runs if scoring on out
- canonical outs/bases/score
- auto end-inning trigger at 3 outs

## 3.3 `recordWalk(...)`

Writes/updates:

- `AtBatEvent`
- batter BB/HBP stats
- pitcher BB/IBB/HBP stats
- bases-loaded walk RBI/run handling
- scoreboard runs only, not hits
- canonical forced-base state

## 3.4 `recordD3K(...)`

Writes/updates:

- `AtBatEvent` with result `K`
- batter K/PA/AB
- pitcher K/BF/pitches and maybe outs
- runner tracker
- canonical outs/bases

Notable truth:

- when batter reaches on D3K, runner tracker currently adds batter with `howReached: 'error'`

## 3.5 `recordError(...)`

Writes/updates:

- `AtBatEvent` with result `E`
- batter PA/AB, not RBI
- pitcher BF/pitch count
- runner tracker
- scoreboard runs and fielding-team error count
- canonical bases/score

## 3.6 `recordEvent(...)`

Writes/updates:

- fame events in local hook state for some event types
- SB/CS player stat adjustments
- WP pitcher stat adjustment

Does not currently write:

- no `logBetweenPlayEvent(...)` call

Truth:

- the store exists
- retrieval exists
- current gameplay path does not actually persist these events through the hook

## 3.7 `advanceRunner(...)` / `advanceRunnersBatch(...)`

Writes/updates:

- runner tracker
- canonical bases/outs/score
- scoreboard runs
- end-inning trigger if third out occurs

Does not write:

- no at-bat event
- no between-play event write

## 3.8 `makeSubstitution(...)`

Writes/updates:

- substitution log
- lineup refs
- lineup-state refs
- current batter replacement when applicable
- player stat map bootstrap for new entrant
- pinch-runner identity replacement in tracker

Does not visibly write:

- no event-log between-play substitution record in this path

## 3.9 `changePitcher(...)`

Writes/updates after pitch-count confirmation:

- substitution log
- outgoing pitcher exit info
- incoming pitcher entry info
- inherited / bequeathed runner counts
- pitcher-name map
- runner tracker pitcher change
- current pitcher in game state
- lineup-state current pitcher

## 3.10 `completeGameInternal(...)`

Writes/updates:

- mark game complete in event log
- read fielding events back out of IndexedDB
- finalize pitcher stats and decisions
- build persisted completed-game state
- aggregate to season
- mark aggregated
- archive completed game
- playoff result writes when applicable
- clear current-game snapshot

## 4. Storage Truth Map

## 4.1 Event Log DB Stores

Current stores defined in `eventLog.ts`:

- `gameHeaders`
- `atBatEvents`
- `pitchingAppearances`
- `fieldingEvents`
- `betweenPlayEvents`

## 4.2 Current Active Write Usage

Actively written by current GameTracker path:

- `gameHeaders`
- `atBatEvents`
- `fieldingEvents`

Defined and retrievable, but not actively written by current `recordEvent()` path:

- `betweenPlayEvents`

Structurally present but not obviously used by current page flow:

- `pitchingAppearances`

## 4.3 Current Game Snapshot Storage

Separate from event log, `gameStorage.ts` stores:

- `currentGame`
- `completedGames`
- `playerGameStats`
- `pitcherGameStats`

Practically used by current GameTracker:

- `currentGame`
- `completedGames`

## 5. Truth-Level Findings

## 5.1 The Current GameTracker Has Multiple Sources Of Operational Truth

Official persisted truth:

- `AtBatEvent`
- fielding events
- completed-game archive

Canonical live truth:

- `useGameState`
- runner tracker

UI truth:

- local page play log
- local page enrichment cache
- local page roster display arrays

This is the core reason "maximal truth" requires tracing rather than just reading one file.

## 5.2 The Page Is Not Thin

The page is doing meaningful baseball interpretation, not just UI wiring.

Examples:

- RBI calculation from runner outcomes
- runner advancement conversion
- prompt branching for SF / DP / IFR / HR / error
- local fielding extraction orchestration
- local play-log projection

## 5.3 The Hook Is The Best Canonical Gameplay Core, But Not The Whole Story

If the project wants a future single source of behavior truth, the current hook is the closest candidate, but some of the page’s play-interpretation logic would need to move inward first.

## 5.4 The Biggest Persistence Gap Is Between-Play Events

The codebase has schema support for durable between-play events.

Current gameplay path does not fully use it.

That means:

- SB/WP/PB/pickoff/substitution behavior can affect live state and some stats
- but their own event history is not yet fully preserved through the intended store

## 5.5 The Biggest Fielding Accuracy Gap Is Attribution Timing

Fielding events are generated during play, but player resolution is deferred and position-based.

That creates risk whenever:

- substitutions happen
- position switches happen
- multiple defenders occupy the same position over a game
