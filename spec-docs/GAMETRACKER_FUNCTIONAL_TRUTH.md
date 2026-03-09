# GameTracker Functional Truth
Generated: 2026-03-09
Project: `/Users/johnkruse/Projects/kbl-tracker`
Branch: `main`
Build: `npm run build` passed
Audit mode: import-driven, live-route only, source read-only

## Health Summary
- Live route confirmed: `src/App.tsx` imports `./src_figma/app/pages/GameTracker` and binds `/game-tracker/:gameId` to `<GameTracker />`; `src/components/GameTracker/` is not live-routed.
- Core architecture: `src/src_figma/app/pages/GameTracker.tsx` is the page shell; `src/src_figma/hooks/useGameState.ts` is the game brain; `src/src_figma/app/components/EnhancedInteractiveField.tsx` is the active field workflow.
- High-confidence `❌ BROKEN` findings:
  - Play-log `eventId` generation lags the persisted at-bat sequence, so enrichment can target the wrong at-bat.
  - Quick-bar error flow lets the UI say "batter to 2B/3B", but `recordError()` always puts the batter on first.
  - `recordEvent()` still does not persist non-at-bat events even though the event store exists.
  - `RunnerPopover` never marks the default destination button because it compares fresh objects with `indexOf`.
- `⚠️ UNKNOWN` items held from `spec-docs/CURRENT_STATE.md`:
  - Runner/fielder popover positioning on the diamond
  - Pitcher tap UX in `FenwayBoard`
  - Enrichment panel open/close flow
  - Mini-diamond tap-to-place field location flow
  - Between-inning enrichment prompt
  - Post-game enrichment summary
- Live-system answer to the key rerun questions:
  - `useGameState.ts` is a large React hook with local state/refs/callback actions, not a reducer, Zustand store, or context store.
  - The Figma system does call `src/utils/eventLog.ts` for at-bat persistence.
  - `+FLD` opens enrichment on the most recent unenriched play; it is not a separate fielding recorder.
  - QuickBar outcomes go directly into page handlers and then into `useGameState`; the legacy `AtBatFlow` path is not part of the live route.

## Inputs And Route Proof

### Consumed Inputs
- `spec-docs/CURRENT_STATE.md`
- `spec-docs/GAMETRACKER_BUILD_PLAN.md`
- `spec-docs/GAMETRACKER_DELTA_REPORT.md`
- `spec-docs/GAMETRACKER_BUGS.md`

### Route Proof
`src/App.tsx` contains both of these live bindings:
- `import { GameTracker } from './src_figma/app/pages/GameTracker';`
- `<Route path="/game-tracker/:gameId" element={<GameTracker />} />`

It also routes post-game to:
- `import { PostGameSummary } from './src_figma/app/pages/PostGameSummary';`
- `<Route path="/post-game/:gameId" element={<PostGameSummary />} />`

Conclusion:
- Live in-game audit target: `src/src_figma/app/pages/GameTracker.tsx`
- Live post-game target: `src/src_figma/app/pages/PostGameSummary.tsx`
- `src/components/GameTracker/` is dead to the routed app

### Scope Basis
Transitive imports were resolved from `src/src_figma/app/pages/GameTracker.tsx` with the Vite alias `@ -> ./src/src_figma`.

Live-route graph summary:
- 76 files
- 1,733,092 bytes
- Includes the page, `useGameState.ts`, live field/panel/popover components, Figma hooks, Figma engine wrappers, shared engines, shared utils, shared types, and shared data used by the route

Out of scope for this report:
- `src/components/GameTracker/`
- `src/archived-components/`
- offseason-only flows
- unrelated routed pages such as museum/schedule/team-hub content

## CURRENT_STATE Cross-Reference
These remain `⚠️ UNKNOWN` unless browser behavior disproves them:
- Runner/fielder tap popovers positioning on diamond
- Pitcher tap UX in `FenwayBoard`
- Enrichment panel open/close flow
- Mini-diamond tap-to-place for field location
- Between-inning enrichment prompt
- Post-game enrichment summary

## Component Inventory

### `src/src_figma/app/pages/GameTracker.tsx` [✅ WORKING]
Role:
- Routed live GameTracker page shell
- Owns the five-zone layout, panel orchestration, local UI state, undo orchestration, play-log cache, enrichment panel state, and navigation to post-game

What it demonstrably wires:
- Pulls live game actions from `useGameState`: `recordHit`, `recordOut`, `recordWalk`, `recordD3K`, `recordError`, `recordEvent`, `advanceRunner`, `advanceRunnersBatch`, `switchPositions`, `changePitcher`, `endInning`, `endGame`, `restoreState`, `setNextEventEnrichment`
- Passes `onPlayComplete` to `EnhancedInteractiveField`
- Passes `onOutcome` to `QuickBar`
- Passes `onPitcherTap` to `FenwayBoard`
- Renders `RunnerPopover`, `FielderPopover`, `PlayLogPanel`, `EnrichmentPanel`, undo, lineup, modifiers, and end-game flows
- Writes enrichment back with `updateAtBatEvent()`
- Logs extracted fielding events with `logFieldingEvent()`

Key line-level live paths:
- Enhanced field completion: `GameTracker.tsx:1266`
- QuickBar outcome handler: `GameTracker.tsx:1934`
- Runner popover actions: `GameTracker.tsx:2783`
- Pitcher tap handler: `GameTracker.tsx:2911`
- Enrichment save path: `GameTracker.tsx:3045`
- End-game flow and post-game navigation: `GameTracker.tsx:3142`, `GameTracker.tsx:3360`
- `+FLD` behavior: `GameTracker.tsx:3728`

### `src/src_figma/hooks/useGameState.ts` [✅ WORKING]
Role:
- Core live game state manager
- Maintains `gameState`, scoreboard, player stats, pitcher stats, inning transitions, substitutions, undo restoration hooks, save/load behavior, and persistence to storage

Architecture:
- Plain React state + refs + callbacks
- Not reducer-based
- Not Zustand
- Not context-backed central store

What it demonstrably persists:
- `createGameHeader`
- `logAtBatEvent`
- `completeGame`
- game save/load via `gameStorage`
- season/archive helpers after game end

Key line-level action entrypoints:
- `recordHit`: `useGameState.ts:2299`
- `recordOut`: `useGameState.ts:2582`
- `recordWalk`: `useGameState.ts:2904`
- `recordError`: `useGameState.ts:3254`
- `recordEvent`: `useGameState.ts:3577`
- end-game persistence: `useGameState.ts:4313`
- restore snapshot support: `useGameState.ts:4887`

### `src/src_figma/app/components/EnhancedInteractiveField.tsx` [✅ WORKING]
Role:
- Active field-capture workflow
- Handles outcome phases, runner outcomes, fielders, special cases, modifier tray logic, leverage/clutch context, and final payload creation back to the page shell

Key functional truth:
- This is the live replacement for the old field workflow
- It is the source of the "tap the field / choose outcome / complete play" path
- It calls back into the page through `onPlayComplete`, `onSpecialEvent`, `onRunnerMove`, and `onBatchRunnerMove`

### `src/src_figma/app/components/QuickBar.tsx` [✅ WORKING]
Role:
- Primary one-tap outcome surface
- Emits outcome strings through `onOutcome`
- Applies basic context-sensitive disabling for `SAC`, `SF`, `DP`, `TP`
- Shows manager-moment indicator when `managerMomentActive` is true

Evidence:
- Primary buttons and overflow buttons are defined locally
- click path is direct: `QuickBar.tsx:98-104`

### `src/src_figma/app/components/FenwayBoard.tsx` [⚠️ UNKNOWN]
Role:
- Scoreboard and pitcher/batter context panel
- Pitcher name becomes clickable when `onPitcherTap` is present

Source truth:
- `onPitcherTap` is real and bound to the pitcher name UI: `FenwayBoard.tsx:175-179`
- `GameTracker.tsx` only wires it when `availablePitchers.length > 0`: `GameTracker.tsx:3550`

Why not `✅`:
- `CURRENT_STATE.md` still marks pitcher tap UX unverified
- Source shows wiring, but current UX is only "substitute with first available pitcher", not a full picker

### `src/src_figma/app/components/PlayLogPanel.tsx` [✅ WORKING]
Role:
- Shows reverse-chronological play log
- Lets enrichable entries be tapped for editing
- Supports inline `K`/`Kc` toggling through `onKToggle`

### `src/src_figma/app/components/EnrichmentPanel.tsx` [⚠️ UNKNOWN]
Role:
- Live enrichment editor for field location, fielding sequence, pitch details, and QAB-related metadata

Source truth:
- Panel is the active replacement for the play log when `enrichingEntry` is set: `GameTracker.tsx:3647`
- `handleEnrichmentUpdate()` writes directly to `updateAtBatEvent()`: `GameTracker.tsx:3045-3079`

Why not `✅`:
- CURRENT_STATE still marks panel open/close flow and mini-diamond location behavior as unverified

### `src/src_figma/app/components/RunnerPopover.tsx` [❌ BROKEN]
Role:
- Runner action menu for steal, advance, wild pitch, passed ball, pickoff, substitution, and player card

Confirmed defect:
- Default destination highlight is broken because it calls `destinations.indexOf({ value, label: dLabel }) === 0`, which can never match a freshly created object literal
- Evidence: `RunnerPopover.tsx:162-165`

Separate UX note:
- Positioning on the diamond remains `⚠️ UNKNOWN` from CURRENT_STATE

### `src/src_figma/app/components/FielderPopover.tsx` [⚠️ UNKNOWN]
Role:
- Fielder action menu for substitute, pinch hit, move position, and player card

Source truth:
- Menu and modals are real and reachable from live page state
- Supports defensive substitute and position move actions

Why not `✅`:
- Diamond positioning and touch behavior are still unverified in browser terms

### `src/src_figma/app/components/UndoSystem.tsx` [✅ WORKING]
Role:
- Snapshot-based undo stack
- GameTracker uses the hook variant, not the standalone component

Source truth:
- Deep clones current state into a bounded stack and invokes `onUndo(snapshot)`
- GameTracker wires snapshot restore through `restoreState()`

### `src/src_figma/app/components/ModifierButtonBar.tsx` [✅ WORKING]
Role:
- Reusable modifier tray component
- Not the same thing as the page-level `+MOD` quick panel, but the underlying modifier interaction model exists

### `src/src_figma/app/pages/PostGameSummary.tsx` [⚠️ UNKNOWN]
Role:
- Routed post-game report page
- Loads completed game data by `gameId` and renders final score, activity log, fame count, player lines, pitcher lines, and expandable box score

Source truth:
- Route exists in `src/App.tsx`
- Page loads from `getCompletedGameById(gameId)` and renders saved completed-game state: `PostGameSummary.tsx:173`, `PostGameSummary.tsx:274`

Why not `✅`:
- CURRENT_STATE marks post-game summary as unverified

### Figma Hooks [✅ WORKING unless noted]
- `usePlayerState.ts`
  - Wraps mojo/fitness/clutch state and notifications through `playerStateIntegration`
  - GameTracker visibly uses its notifications and getters
- `useFameTracking.ts`
  - Wraps fame engine state, popup display, and duplicate suppression for milestone events
- `useMWARCalculations.ts`
  - Wraps manager-moment and decision tracking on top of `mwarIntegration`
- `useFanMorale.ts` [⚠️ UNKNOWN]
  - Functionally used by live GameTracker at game end
  - Header comment is outdated and claims it is "not imported/used anywhere"
  - Current code still provides `processGameResult()` and can mutate morale state, but the self-description is stale enough that it should not be treated as fully trusted without runtime validation

### Figma Engine Wrappers [✅ WORKING]
These are mostly integration or re-export layers that adapt shared engines into the Figma page:
- `fameIntegration.ts` re-exports `fameEngine` and adds UI display helpers
- `fanMoraleIntegration.ts` re-exports `fanMoraleEngine` and adds display helpers
- `mwarIntegration.ts` re-exports `mwarCalculator` and adds manager-moment trigger logic
- `narrativeIntegration.ts` re-exports `narrativeEngine` and adds `generateGameRecap()`
- `playerStateIntegration.ts` re-exports mojo, fitness, and clutch engine surfaces
- `index.ts` acts as a barrel for the Figma engine layer

### Shared Utils Actually Used By The Live Route [✅ WORKING unless noted]
- `src/utils/eventLog.ts`
  - Real at-bat persistence store for the live route
  - Also exposes `updateAtBatEvent()` and `logFieldingEvent()`
- `src/utils/gameStorage.ts`
  - Used for current game save/load and completed-game retrieval
- `src/utils/seasonAggregator.ts`
  - Used from end-game flow via `useGameState`
- `src/src_figma/app/utils/fieldingEventExtractor.ts`
  - Converts completed `PlayData` into fielding events for persistence

## State Architecture

### Topology
The live GameTracker is a two-layer state system:
1. `GameTracker.tsx` owns page and UI state.
2. `useGameState.ts` owns authoritative game logic state and persistence-facing actions.

### Page-Level State Responsibilities
`GameTracker.tsx` owns:
- panel open/close state
- play-log entry cache
- enrichment target selection
- runner/fielder popover state
- lineup overlay hints
- modifier tray visibility
- undo snapshots
- selected player card and modal state
- local runner-name display cache

### Hook-Level State Responsibilities
`useGameState.ts` owns:
- inning, outs, balls, strikes, scores, bases
- current batter/pitcher ids and names
- player game stats and pitcher game stats
- at-bat sequence
- runner tracker for inherited-runner/earned-run handling
- persistence save markers and load/restore behavior

### Architecture Answer
This is not the old hybrid reducer system from the legacy tree. The live routed system is callback-driven hook state.

## Interaction Map

### 1. QuickBar Outcome
`QuickBar button` -> `handleQuickBarOutcome()` -> default runner inference -> undo snapshot -> `recordHit` / `recordOut` / `recordWalk` / `recordD3K` / `recordError` -> play-log append -> local runner-name cache update

Evidence:
- QuickBar emits `onOutcome`: `QuickBar.tsx:98-104`
- Page receives it: `GameTracker.tsx:3667-3669`
- Main handler: `GameTracker.tsx:1934-2113`

### 2. Enhanced Field Play
`EnhancedInteractiveField` flow -> `handleEnhancedPlayComplete()` -> derive RBI + runner advancement -> `setNextEventEnrichment()` -> `recordHit` / `recordOut` / `recordWalk` / `recordD3K` / `recordError` -> play-log append -> `extractFieldingEvents()` -> `logFieldingEvent()`

Evidence:
- Page callback entry: `GameTracker.tsx:1266`
- Live field component binding: `GameTracker.tsx:3556-3568`

### 3. Runner Tap
`tap runner on field` -> `RunnerPopover` -> `advanceRunner()` and optional `recordEvent('SB'|'WP'|'PB'|'PICK'|'PICK_E'|'PICK_SAFE')`

Evidence:
- handlers: `GameTracker.tsx:2783-2828`
- popover render: `GameTracker.tsx:3592-3606`

### 4. Fielder Tap
`tap fielder on field` -> `handleFielderTap()` -> `FielderPopover` -> substitution / pinch hit / move position / player card

Evidence:
- page handler: `GameTracker.tsx:2840`
- popover render: `GameTracker.tsx:3609-3620`

### 5. Enrichment
`tap play-log entry` or `+FLD` -> `setEnrichingEntry()` -> `EnrichmentPanel` -> `handleEnrichmentUpdate()` -> `updateAtBatEvent(eventId, ...)` -> local cache and flags update

Evidence:
- entry tap: `GameTracker.tsx:3037-3040`
- save path: `GameTracker.tsx:3045-3079`
- `+FLD` path: `GameTracker.tsx:3728-3737`

### 6. End Inning
`END INNING` -> check for unenriched plays in current half -> maybe show enrichment prompt -> `endInning()` -> clear runner names

Evidence:
- `GameTracker.tsx:3016-3030`

### 7. End Game
`END` -> end-game detection + fan morale + narratives + mWAR persistence + hook-level end game + schedule completion -> navigate to `/post-game/:gameId`

Evidence:
- `GameTracker.tsx:3142-3378`
- route navigation: `GameTracker.tsx:3360`

## Engine Integration Map

### At-Bat Persistence
`GameTracker.tsx` and `useGameState.ts` -> `src/utils/eventLog.ts`

Live truth:
- The Figma system persists at-bats through `eventLog.ts`
- This directly corrects the false result from the legacy dead-code audit

Key evidence:
- `GameTracker.tsx` imports `updateAtBatEvent` and `logFieldingEvent`
- `useGameState.ts` imports and calls `createGameHeader`, `logAtBatEvent`, `completeGame`

### Fielding Pipeline
`EnhancedInteractiveField.tsx` / `GameTracker.tsx` -> `fieldingEventExtractor.ts` -> `logFieldingEvent()`

Live truth:
- Fielding is not only UI metadata; there is a real persistence path for fielding events after enhanced plays

### Fame
`useFameTracking.ts` -> `fameIntegration.ts` -> `src/engines/fameEngine`

Live truth:
- Fame popup and event tracking are live page features
- End-game detection also records late fame events in `GameTracker.tsx`

### Player State
`usePlayerState.ts` -> `playerStateIntegration.ts` -> `src/engines/mojoEngine`, `fitnessEngine`, `clutchCalculator`

Live truth:
- GameTracker uses this hook for visible mojo/fitness notifications and batter/pitcher state display

### Manager WAR
`useMWARCalculations.ts` -> `mwarIntegration.ts` -> `src/engines/mwarCalculator` + `leverageCalculator`

Live truth:
- Manager moment is live in the QuickBar zone
- Decisions are recorded and later persisted during end-game flow

### Fan Morale
`useFanMorale.ts` -> `fanMoraleIntegration.ts` -> `src/engines/fanMoraleEngine`

Live truth:
- Hook is used in live game-end flow even though its header comment says otherwise

### Narrative
`GameTracker.tsx` -> `narrativeIntegration.ts` -> `src/engines/narrativeEngine`

Live truth:
- End-game recaps are generated before navigating to post-game

## Data Flow Traces

### Trace A: QuickBar 1B
1. User taps `1B` in `QuickBar`.
2. `handleQuickBarOutcome('1B')` builds minimal play data and runner defaults.
3. Page captures undo snapshot.
4. Page calls `recordHit('1B', rbi, runnerAdv)`.
5. `useGameState` increments `atBatSequence`, updates stats/bases/score, logs an at-bat event, and advances batter order.
6. Page appends a play-log row and updates local runner-name display state.

### Trace B: Enhanced Field Out
1. User completes a multi-step field play in `EnhancedInteractiveField`.
2. Component emits `PlayData` through `onPlayComplete`.
3. Page calculates RBI from actual runner outcomes and converts them to `RunnerAdvancement`.
4. Page injects enrichment with `setNextEventEnrichment()`.
5. Page calls `recordOut()` or `recordD3K()`.
6. Page appends play-log row.
7. Page extracts fielding events and writes them with `logFieldingEvent()`.

### Trace C: Runner Steal
1. User taps a runner icon on the field.
2. `RunnerPopover` opens.
3. User taps `Steal`.
4. Page captures undo snapshot.
5. Page calls `advanceRunner(base, nextBase, 'safe')`.
6. Page calls `recordEvent('SB')`.
7. Base state updates immediately; non-at-bat event persistence does not.

### Trace D: Pitcher Tap
1. User taps pitcher name in `FenwayBoard`.
2. `handlePitcherTap()` fires if there is at least one available pitcher.
3. Current implementation auto-selects `availablePitchers[0]`.
4. Existing substitution path handles the change.

### Trace E: `+FLD`
1. User taps `+FLD`.
2. Page finds the most recent unenriched play log entry.
3. Page sets that entry as `enrichingEntry`.
4. Hint text instructs the user to use the main field for location and play log for edits.
5. No separate fielding-mode state is entered.

### Trace F: Post-Game
1. User taps `END`.
2. Page runs end-game detection/integration logic.
3. `useGameState.endGame()` completes game persistence and archive work.
4. Page navigates to `/post-game/:gameId`.
5. `PostGameSummary.tsx` loads the completed record from storage and renders summary panels.

## Dead Code

### `src/components/GameTracker/` [🪦 DEAD to the live app]
Proof:
- `src/App.tsx` routes GameTracker to `src/src_figma/app/pages/GameTracker.tsx`
- No live route points at `src/components/GameTracker/`

Implication:
- Prior Phase 1 findings against the legacy tree do not describe current browser behavior

### Route-Adjacent But Not Live-Imported By This Feature
These are not treated as dead globally; they are simply not part of the routed GameTracker import closure:
- `src/src_figma/app/components/MilestoneWatchPanel.tsx`
- `src/src_figma/app/components/MojoFitnessEditor.tsx`
- `src/src_figma/app/hooks/useWARCalculations.ts`
- `src/src_figma/app/hooks/useSeasonStats.ts`

Notes:
- Some of these are used elsewhere, such as franchise/season pages
- They should not be used as evidence for live in-game behavior unless routed or imported into the GameTracker path

## Anomalies

### 1. Play Log `eventId` lags persisted at-bat sequence [❌ BROKEN]
Why it matters:
- Enrichment and later updates use `PlayLogEntry.eventId`
- The page builds that id from the stale pre-record `atBatSequence`, while `useGameState` persists the at-bat with `newSequence`

Evidence:
- Page uses stale sequence:
  - `GameTracker.tsx:1611-1613`
  - `GameTracker.tsx:2072-2074`
  - `GameTracker.tsx:2134-2136`
  - `GameTracker.tsx:2166-2168`
  - `GameTracker.tsx:2225-2227`
- Hook persists incremented sequence:
  - `useGameState.ts:2299-2301`
  - `useGameState.ts:2582-2584`
  - `useGameState.ts:2904-2906`
  - `useGameState.ts:3254-3256`
  - persisted event id in error path: `useGameState.ts:3298-3301`

Likely runtime effect:
- Enrichment can update the previous at-bat instead of the play the user just recorded

### 2. Quick-bar error flow claims arbitrary batter base, but hook always puts batter on first [❌ BROKEN]
Why it matters:
- UI flow collects `baseReached`
- Hook ignores that choice and always adds the batter to first base

Evidence:
- UI captures and displays `baseReached`: `GameTracker.tsx:2192-2251`
- Hook always does `trackerAddRunner(..., '1B', 'error')`: `useGameState.ts:3293-3295`

Likely runtime effect:
- Error plays that should leave the batter on second or third are persisted and tracked incorrectly

### 3. Non-at-bat events are still not persisted [❌ BROKEN]
Why it matters:
- Steals, wild pitches, passed balls, pickoffs, and related between-play actions update state but do not write to the dedicated event store

Evidence:
- Page actively calls `recordEvent('SB'|'WP'|'PB'|'PICK'|'PICK_E'|'PICK_SAFE')`: `GameTracker.tsx:2783-2828`
- Hook still ends with `// TODO: Log to separate event store`: `useGameState.ts:3598`

Likely runtime effect:
- Browser session state can show these events, but persistence/audit history for them is incomplete

### 4. RunnerPopover default-destination highlight is broken [❌ BROKEN]
Evidence:
- `RunnerPopover.tsx:162-165`

Why it fails:
- `indexOf({ value, label: dLabel })` compares by object identity, not by contents

Likely runtime effect:
- The intended default destination is never highlighted for advance/WP/PB flows

### 5. `useFanMorale.ts` self-description no longer matches live usage [⚠️ UNKNOWN]
Evidence:
- Header says "not imported/used anywhere": `useFanMorale.ts:7-12`
- Live page uses it and calls `processGameResult()`: `GameTracker.tsx:3224`, `GameTracker.tsx:3238`

Interpretation:
- The code is not dead, but the hook's trustworthiness is reduced by stale self-documentation

## Direct Answers To The Rerun Questions

1. How does `useGameState.ts` manage state?
- React hook state plus refs/callbacks. Not reducer, not Zustand, not context.

2. Does the Figma system call `eventLog.ts` for at-bat persistence?
- Yes. This is a confirmed live integration.

3. How does `EnhancedInteractiveField.tsx` handle fielder taps?
- It is the active field interaction layer and emits `onFielderTap` back into `GameTracker.tsx`, which opens `FielderPopover`. Diamond UX quality still needs browser verification.

4. What is the QuickBar tap flow?
- `QuickBar` -> `handleQuickBarOutcome()` -> `useGameState` recording action -> play-log append. It does not use the legacy `AtBatFlow`.

5. Do batter stats accumulate during gameplay?
- Yes. `useGameState` mutates live player stats and `FenwayBoard` consumes those values during play; post-game summary reads saved `playerStats`.

6. What does `+FLD` actually do?
- Opens enrichment on the most recent unenriched play and updates hint text. It does not launch a separate fielding recorder.

7. How do the Figma engine integrations connect to shared engines?
- Mostly as wrappers/re-export layers. They adapt shared engines for the Figma UI but do not replace the underlying shared engine modules.

## Bottom Line
The live GameTracker is the `src/src_figma/` system, and it is materially more functional than the legacy dead-code tree that was audited earlier. The core gameplay path is live, persisted, and integrated with fame/player-state/mWAR/narrative systems. The main confirmed defects are in play-log event linkage, error-base handling, non-at-bat persistence, and a runner-popover UI bug. The remaining open items are mostly browser UX validations already called out in `CURRENT_STATE.md`.
