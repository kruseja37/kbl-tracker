# GameTracker Dependency Matrix

Scope: current `src/src_figma` GameTracker only.

Purpose: map the live UI controls to the actual handlers, hook/state mutations, storage writes, and downstream stat/metric effects they trigger today.

This is intentionally biased toward redesign relevance, not implementation elegance.

## Reading Guide

Each control is classified as one of:

- Source of truth: user action directly changes game state or persisted data
- Local/UI-only: affects visible state but not durable game/season data
- Bridge control: does not create the core event itself, but enriches or routes it

## Architectural Summary

The current GameTracker has four main interaction layers:

1. QuickBar outcome entry
   - Primary source of at-bat truth

2. Enhanced field / popovers / modals
   - Secondary enrichment and special-case entry

3. Play log + enrichment panel
   - Post-hoc mutation of persisted at-bat events

4. Meta hooks
   - `useMWARCalculations`
   - `useFameTracking`
   - `usePlayerState`
   - `useFanMorale`

The most important dependency truth is:

- `useGameState` owns the durable baseball record
- `GameTracker.tsx` owns many of the surrounding narrative/condition/meta systems
- several controls update only the page-layer hooks and never feed back into `useGameState` persistence

## A. Primary Outcome Entry

### 1. QuickBar Outcome Buttons

Classification: Source of truth

UI surface:

- hit buttons: `1B`, `2B`, `3B`, `HR`, `GRD`, `E`
- walk buttons: `BB`, `HBP`, `IBB`
- out buttons: `K`, `Kc`, `GO`, `FO`, `LO`, `PO`, `DP`, `FC`, `SF`, `SH`, `TP`, `D3K`, `WP_K`, `PB_K`

Primary handler:

- `handleQuickBarOutcome(outcome)`

Primary dependencies:

- `calculateRunnerDefaults()`
- `undoSystem.captureSnapshot()`
- `recordHit()`
- `recordOut()`
- `recordWalk()`
- `recordD3K()`
- deferred prompts:
  - `setHrPrompt()`
  - `setErrorFlow()`
  - `setSfPrompt()`
  - `setDpPrompt()`
  - `setIfrPrompt()`

Durable writes:

- yes, through `useGameState` at-bat recorders
- `logAtBatEvent()` to IndexedDB

Local side effects:

- `pushPlayLogEntry()`
- `setRunnerNames()`
- `logAction()`

Downstream effects:

- batting game stats
- pitching game stats
- runner tracker
- scoreboard
- `AtBatEvent.leverageIndex`
- `AtBatEvent.wpa`
- season batting/pitching aggregation at game end

Important gaps:

- QuickBar writes the baseball truth, but the resulting play log entry is a separate page-local inventory
- fielding is not captured here unless later enriched or routed through special prompts
- QuickBar error flow lets user choose `1B/2B/3B`, but `recordError()` still persists ROE with batter on first

### 2. HR Prompt

Classification: Bridge control

UI surface:

- distance input
- pitch type chips
- `Done`
- `Skip`

Primary handlers:

- `handleHrPromptDone()`
- `handleHrPromptSkip()`

Primary dependencies:

- `setNextEventEnrichment()`
- `recordHit('HR', ...)`
- `pushPlayLogEntry()`

Durable writes:

- yes, the HR at-bat via `recordHit()`
- optional enrichment fields on the next event through `nextEventEnrichment`

Downstream effects:

- same as normal HR recording
- optional `hrDistance` / `pitchType` enrichment

Gap:

- prompt enriches only the next at-bat write; it is not a general reusable HR-edit workflow

### 3. Error Flow Prompt

Classification: Bridge control

UI surface:

- base reached selection
- fielder selection
- error type selection

Primary handler:

- `handleErrorFlowComplete(baseReached, fielderPosition, errorType)`

Primary dependencies:

- `setNextEventEnrichment()`
- `recordError()`
- `pushPlayLogEntry()`

Durable writes:

- yes, error at-bat via `recordError()`
- enrichment fields such as `fieldingSequence`, `errorFielder`, `errorType`

Downstream effects:

- batting/pitching error-related state
- play-log entry

Critical gap:

- chosen base reached is not truly honored by durable baseball state; current hook path still behaves as ROE to first

### 4. SF / DP / IFR Prompts

Classification: Bridge controls

UI surface:

- FO with R3 < 2 outs -> sacrifice fly prompt
- GO with runner out -> DP prompt
- PO with R1+R2 < 2 outs -> infield fly prompt

Primary handlers:

- `handleSfPromptAnswer()`
- `handleDpPromptAnswer()`
- `handleIfrPromptAnswer()`

Durable writes:

- yes, through eventual `recordOut()` calls

Downstream effects:

- correct out result classification
- at-bat event result
- RBI/run invalidation logic
- season stats and WPA/leverage trail

Truth:

- these prompts are important because they patch semantic correctness into QuickBar’s simplified entry model

## B. Enhanced Field and Play Completion

### 5. Enhanced Field `onPlayComplete`

Classification: Source of truth, but secondary to QuickBar in actual UX

UI surface:

- `EnhancedInteractiveField`

Primary handler:

- `handleEnhancedPlayComplete(playData)`

Primary dependencies:

- `recordHit()`
- `recordOut()`
- `recordWalk()`
- `recordError()`
- `advanceCount()`
- `extractFieldingEvents()`
- `logFieldingEvent()`
- `fameTrackingHook.checkBatterFameEvents()`
- `fameTrackingHook.checkPitcherFameEvents()`
- `runPlayDetections()`
- `mwarHook.recordDecision()`
- `mwarHook.resolveDecisionOutcome()`
- `mwarHook.checkForManagerMoment()`

Durable writes:

- yes, at-bat truth via `useGameState`
- yes, fielding sub-events via `FIELDING_EVENTS`

Local/UI writes:

- play log entries
- runner names
- activity log
- fame popup hook state
- pending detections
- pending mWAR decisions

Downstream effects:

- all normal batting/pitching/runner flows
- fielding tally at end game
- some mWAR decisions

Critical truths:

- this is the richest control path
- but the current page hides the field action selector, so the full field-first flow is not the primary live UX
- page-level Fame logic here is not the same ledger the season aggregator later consumes

### 6. Enhanced Field `onSpecialEvent`

Classification: Source of truth for special events, but narrow

Primary handler:

- `handleSpecialEvent(event)`

Primary dependencies:

- `undoSystem.captureSnapshot()`
- `recordEvent(event.eventType)`

Durable writes:

- not to dedicated between-play event store
- only through `useGameState` local special-event handling

Downstream effects:

- local fame event creation in `useGameState` for supported events

Critical gap:

- special events are conceptually between-play events, but are not written to `BETWEEN_PLAY_EVENTS`

## C. Runner Popovers

### 7. Runner Popover `Steal`

Classification: Source of truth for base state, partial for player stats

Primary handler:

- `handleRunnerSteal(base)`

Primary dependencies:

- `advanceRunner()`
- `recordEvent('SB')`

Durable writes:

- no dedicated between-play ledger write
- no at-bat event write

Local/game effects:

- base occupancy changes
- runner tracker changes
- possible score/out changes depending on move

Downstream effects:

- intended SB stat increment via `recordEvent`

Critical gap:

- `recordEvent('SB')` is usually called without `runnerId`
- `useGameState.recordEvent()` only increments player SB when `runnerId` exists
- so the base movement is real, but the player stat attribution is often missing

### 8. Runner Popover `Advance`

Classification: Source of truth for base state only

Primary handler:

- `handleRunnerAdvance(base, dest?)`

Primary dependencies:

- `advanceRunner()`

Durable writes:

- none

Downstream effects:

- base/runner tracker changes only

Gap:

- no persisted event row
- no player stat or narrative metric attached

### 9. Runner Popover `Wild Pitch`

Classification: Source of truth for base state, partial for pitching stats

Primary handler:

- `handleRunnerWP(base, dest?)`

Primary dependencies:

- `advanceRunner()`
- `recordEvent('WP')`

Durable writes:

- no dedicated between-play event write

Downstream effects:

- runner advancement
- pitcher wild pitch count increments in local game stats

Gap:

- still no durable between-play event record

### 10. Runner Popover `Passed Ball`

Classification: Source of truth for base state, limited stat tracking

Primary handler:

- `handleRunnerPB(base, dest?)`

Primary dependencies:

- `advanceRunner()`
- `recordEvent('PB')`

Durable writes:

- no dedicated between-play event write

Downstream effects:

- runner movement
- local event handling

Gap:

- catcher/passed-ball attribution is not carried through a durable event ledger

### 11. Runner Popover `Pickoff`

Classification: Source of truth for base/out state, partial for event semantics

Primary handler:

- `handleRunnerPickoff(base, outcome)`

Primary dependencies:

- `advanceRunner()`
- `recordEvent('PICK' | 'PICK_E' | 'PICK_SAFE')`

Durable writes:

- no between-play event persistence

Downstream effects:

- outs and base state change
- some local special-event tracking

Gap:

- event schema exists for pickoffs; current page does not write to it

### 12. Runner Popover `Substitute`

Classification: Bridge control

Primary handler:

- `handleRunnerSubstitute(base)`

Effect:

- opens lineup overlay and sets hint text

Durable writes:

- none directly

Truth:

- this is a routing affordance, not itself a baseball action

## D. Fielder Popovers and Fielder Credit

### 13. Fielder Popover `Player Card`

Classification: Local/UI-only

Primary handler:

- `handleFielderPlayerCard()`

Effect:

- opens PlayerCard modal

Durable writes:

- none

### 14. Fielder Credit Modal

Classification: Bridge control with real fielding consequences

Primary handler:

- `handleFielderCreditConfirm(credits)`

Primary dependencies:

- replays pending play into `recordHit()` / `recordOut()` / `recordD3K()` / `recordWalk()`
- `setNextEventEnrichment()`
- `extractFieldingEvents()`
- `logFieldingEvent()`

Durable writes:

- yes, via replayed at-bat
- yes, fielding event write(s)

Downstream effects:

- fielding attribution for runners thrown out on hits
- play enrichment

Gap:

- this path still relies on synthetic fielding extraction rather than a unified shared attribution engine

### 15. Error On Advance Modal

Classification: Local/UI-only, informational today

Primary handler:

- `handleErrorOnAdvanceConfirm(results)`

Durable writes:

- none meaningful today

Truth:

- the modal acknowledges advanced attribution complexity
- but current code logs the result and does not fold it into durable game state

## E. Lineup and Substitutions

### 16. LINEUP Button / Overlay

Classification: Bridge control

Primary handlers:

- open: inline button toggles overlay
- actions route into `handleLineupCardSubstitution()`

Durable writes:

- none by itself

### 17. LineupCard Substitutions

Classification: Source of truth for roster-state changes

Primary handler:

- `handleLineupCardSubstitution(sub)`

Primary dependencies:

- `undoSystem.captureSnapshot()`
- `changePitcher()`
- `makeSubstitution()`
- `switchPositions()`
- `mwarHook.recordDecision()`
- page-local roster array mutation for UI consistency

Durable writes:

- yes, indirectly through `useGameState` substitution machinery
- manager decisions persist later at game end

Downstream effects:

- active lineup state
- pending PH enforcement
- pitcher changes
- mWAR decisions

Critical gaps:

- no dedicated between-play substitution event ledger write found from current page flow
- page also mutates local roster arrays to keep UI in sync, meaning there are parallel truths again

### 18. Explicit Pitcher Substitution Controls

Classification: Source of truth

Primary handler:

- `handlePitcherSubstitution(...)`

Primary dependencies:

- `changePitcher()`
- `mwarHook.recordDecision('pitching_change', ...)`

Durable writes:

- yes, pitcher change affects game state
- manager decision persists later

Gap:

- still no dedicated `BETWEEN_PLAY_EVENTS.pitcher_change` write

### 19. Position Swap Controls

Classification: Source of truth for defensive alignment only

Primary handler:

- `handlePositionSwap(...)`

Primary dependencies:

- local roster array mutation

Durable writes:

- limited / unclear in current page-only handler

Gap:

- visual team state updates, but durable downstream positional history appears weak

## F. Play Log and Enrichment

### 20. Play Log Entry Tap

Classification: Bridge control

Primary handler:

- `handleEntryTap(entry)`

Effect:

- opens/closes `EnrichmentPanel`

Durable writes:

- none directly

### 21. Enrichment Panel Field Updates

Classification: Bridge control with direct IndexedDB mutation

Primary handler:

- `handleEnrichmentUpdate(field, value)`

Primary dependencies:

- `updateAtBatEvent(eventId, { enrichment })`
- local `enrichmentCache`
- `setPlayLogEntries()`

Durable writes:

- yes, post-hoc updates to `AtBatEvent`

Downstream effects:

- `fieldLocation`
- `fieldingSequence`
- `pitchType`
- `pitchesInAtBat`
- `isQualityAtBat`

Truth:

- this is one of the few controls that mutates durable event rows after initial recording

Gap:

- enrichment can improve at-bat detail, but it does not retroactively rebuild other derived systems like fielding WAR or between-play ledger rows

### 22. Play Log K/Kc Toggle

Classification: Bridge control with direct IndexedDB mutation

Primary handler:

- `handleKToggle(entry)`

Primary dependencies:

- `updateAtBatEvent(eventId, { result, editHistory })`

Durable writes:

- yes, modifies `AtBatEvent.result`

Downstream effects:

- box score semantics and strikeout type labeling

## G. Modifiers and Detection

### 23. Modifier Tray Buttons

Buttons:

- `7+`
- `ROB`
- `KP`
- `NUT`
- `BT`
- `BUNT`
- `TBL`

Classification: Mixed, mostly local/special-event layer

Primary handler:

- `triggerManualSpecialEvent(eventType)`
- routes to `handleSpecialEvent()`

Durable writes:

- no between-play event ledger
- only local/special event handling through `recordEvent()`

Downstream effects:

- local fame records for supported events
- activity log

Gap:

- these buttons strongly imply first-class tracked events; current persistence is much thinner

### 24. Detection Prompt Confirm / Dismiss

Classification: Local/UI-only for page-layer Fame

Primary handlers:

- `handleDetectionConfirm(detection)`
- `handleDetectionDismiss(detection)`

Primary dependencies:

- `fameTrackingHook.recordFameEvent()`

Durable writes:

- none into `useGameState` fame ledger

Truth:

- confirms or rejects page-local detected Fame moments
- does not currently guarantee season persistence

## H. Player Card

### 25. Player Card Open

Classification: Local/UI-only

Sources:

- lineup cards
- fielder popover
- runner popover
- batter/pitcher shortcut buttons

Effect:

- opens modal with mostly placeholder stat display

Critical truth:

- PlayerCard stat panes are not yet wired to real live stats

### 26. Player Card `Mojo`

Classification: Local/session state mutation

Primary dependency:

- `playerStateHook.setMojo(playerId, newMojo)`

Durable writes:

- no normal-game durable storage write
- elimination-mode snapshot later at end game only

Downstream effects:

- player condition display

Gap:

- not integrated into live baseball calculation flow

### 27. Player Card `Fitness`

Classification: Local/session state mutation

Primary dependency:

- `playerStateHook.setFitness(playerId, newFitness)`

Durable writes:

- same as Mojo: only elimination snapshot path at end game

Gap:

- no live workload-driven update loop
- no between-play `fitness_change` ledger write

## I. Manager Systems

### 28. QuickBar Manager Moment Indicator

Classification: Local/UI-only indicator

Primary dependencies:

- `mwarHook.managerMoment.isTriggered`
- `setShowManagerMomentPanel()`

Durable writes:

- none directly

### 29. Manager Moment Panel `Call`

Classification: Source of truth for manager decision

Primary dependencies:

- `mwarHook.recordDecision(...)`
- `setPendingMWARDecisions(...)`
- `mwarHook.dismissManagerMoment()`

Durable writes:

- yes, later at game end via `saveGameDecisions()`

Gap:

- no dedicated manager-moment event write to between-play store

### 30. Manager Moment Panel `Skip`

Classification: Local/UI-only

Effect:

- dismisses prompt only

Durable writes:

- none

## J. End Game Flow

### 31. END Button / End Game Confirmation

Classification: Source of truth for completion pipeline

Primary handler:

- `handleEndGame()`

Primary dependencies:

- fan morale processing
- narrative generation
- manager decision persistence
- `hookEndGame()` -> `useGameState.endGame()`
- elimination mojo/fitness snapshot save
- schedule completion
- navigation to post-game

Durable writes:

- completed-game archive
- season aggregation via `processCompletedGame()`
- `markGameAggregated()`
- manager decisions and manager season stats
- elimination snapshots
- schedule completion

Critical truths:

- this is where most durable downstream effects happen
- WAR orchestrator is not called here
- fan morale is processed only in hook-local state

### 32. Post-Game Enrichment Prompt

Classification: Bridge control

Choices:

- `ENRICH`
- `CONTINUE`

Effect:

- routes user either into enrichment flow or straight into `handleEndGame()`

Truth:

- this is a UX safety valve for data completeness, not a baseball event

## K. Control-to-Storage Matrix

| Control | AtBatEvent write | FieldingEvent write | BetweenPlayEvent write | Game/Season other write |
| --- | --- | --- | --- | --- |
| QuickBar hit/walk/out | Yes | No | No | Later season aggregation |
| HR prompt | Yes | No | No | Enrichment on next event |
| Error prompt | Yes | No direct | No | Enrichment on next event |
| Enhanced play complete | Yes | Yes | No | Page-local Fame/mWAR updates |
| Special event buttons | No at-bat | No | No | Local fame only |
| Runner steal/WP/PB/pickoff | No | No | No | Local stats/base state only |
| Fielder credit modal | Yes | Yes | No | Fielding attribution improved |
| Error-on-advance modal | No | No | No | Logging only |
| Lineup substitution | Indirect | No | No | Sub state + later mWAR |
| Pitcher change | Indirect | No | No | Later mWAR persistence |
| Enrichment panel | Updates existing | No | No | Local cache/play-log flags |
| K/Kc toggle | Updates existing | No | No | Edit history |
| PlayerCard mojo/fitness | No | No | No | Elimination snapshot only |
| Manager Moment call | No | No | No | Later manager decision persistence |
| End Game | No new at-bat | Reads fielding | No | Aggregation, archive, manager, schedule |

## L. Highest-Risk Breakpoints for Redesign

1. QuickBar is the real source of baseball truth.
   - Any redesign that centers the field instead must first unify the entry pipelines.

2. Runner popovers change game state without durable event-log parity.
   - That is a major analytics and replay gap.

3. Fame has split ownership.
   - `useGameState` and `useFameTracking` should not remain parallel if you want a stable redesign.

4. Fielding extraction is page-layer sidecar logic.
   - It is not owned by the same subsystem that owns the at-bat truth.

5. End-game aggregation is carrying too much responsibility.
   - Several systems only become “real” at the end of the game.

6. Page-local UI arrays still shadow some substitution/position truths.
   - That makes visual redesign risky unless state ownership is centralized.

7. Many meta controls imply persistence they do not actually have.
   - runner events
   - special events
   - manager moments
   - mojo/fitness changes
   - fan morale

## M. Safe Next Move

Before redesigning the frontend, the safest sequencing is:

1. choose one canonical game-event pipeline
2. choose one canonical Fame pipeline
3. decide whether between-play events are first-class persisted records
4. decide whether WAR should be recomputed at game end automatically
5. only then redesign the UI around those truths

Without that, a redesign will mostly rearrange current ambiguities instead of resolving them.
