# GameTracker Current Codebase Reverse-Engineered Spec

Last updated: 2026-03-09

## Purpose

This document describes what the current `src/src_figma` GameTracker actually does in code today.

It is not a wishlist and it is not a legacy comparison. It is a reverse-engineered baseline for:

- current functionality
- current logic design
- current UI/UX design
- current persistence and aggregation flow
- current high-risk areas and likely gap zones

## Scope

In scope:

- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- current `src/src_figma/app/components/*` surfaces used by the page
- current persistence/aggregation code in `src/utils/*`

Out of scope:

- legacy `src/components/GameTracker/*` behavior except where current code explicitly imports it
- aspirational specs unless the live code already implements them

## Evidence Base

Primary files inspected:

- `src/App.tsx`
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- `src/src_figma/app/components/EnhancedInteractiveField.tsx`
- `src/src_figma/app/components/FenwayBoard.tsx`
- `src/src_figma/app/components/QuickBar.tsx`
- `src/src_figma/app/components/PlayLogPanel.tsx`
- `src/src_figma/app/components/EnrichmentPanel.tsx`
- `src/src_figma/app/components/RunnerPopover.tsx`
- `src/src_figma/app/components/FielderPopover.tsx`
- `src/src_figma/app/components/LineupCard.tsx`
- `src/utils/eventLog.ts`
- `src/utils/gameStorage.ts`
- `src/utils/processCompletedGame.ts`
- `src/utils/seasonAggregator.ts`
- `src/src_figma/app/utils/fieldingEventExtractor.ts`

Targeted tests executed:

- `src/src_figma/__tests__/gameTracker/gameStateLogic.test.ts`
- `src/src_figma/__tests__/gameTracker/scoreboardLogic.test.ts`

Observed result:

- 127 tests passed

## 1. Entry Points And Launch Context

The live GameTracker route is:

- `/game-tracker/:gameId`

The routed page is `src/src_figma/app/pages/GameTracker.tsx`.

It accepts navigation state with the following runtime contexts:

- away/home rosters
- away/home pitchers
- away/home team ids and names
- team colors
- stadium name
- team records
- `gameMode`: `exhibition` | `franchise` | `playoff` | `elimination`
- franchise ids and season ids
- elimination/playoff context
- schedule game id
- total innings
- manager ids/names
- user team side

If navigation state is absent, the page falls back to hardcoded demo rosters and team ids.

## 2. Architectural Shape

The current system has three main layers.

### 2.1 Page Orchestration Layer

`GameTracker.tsx` is a very large orchestration page. It owns:

- screen layout
- transient UI state
- modal state
- manual and quick-entry play flows
- local roster display state
- play log UI state
- enrichment UI state
- player card / lineup overlay state
- manager-moment / detection prompt UI
- glue to fame, fan morale, narrative, mWAR, fielding extraction, schedule completion, and navigation

### 2.2 Game State And Persistence Layer

`useGameState.ts` is the gameplay and storage core. It owns:

- canonical inning/out/score/base state
- player and pitcher game stat maps
- lineup refs and lineup-state validation
- runner identity tracker with inherited-runner attribution
- event-log writes
- autosave snapshot writes
- inning transitions
- end-game aggregation and archival

### 2.3 Specialized Child UI Surfaces

The main page delegates focused UI interactions to:

- `FenwayBoard`
- `EnhancedInteractiveField`
- `QuickBar`
- `PlayLogPanel`
- `EnrichmentPanel`
- `RunnerPopover`
- `FielderPopover`
- `LineupCard`

## 3. Current UI/UX Design

The current GameTracker is a five-zone desktop-style screen, not a mobile-first stacked layout.

### 3.1 Visual Direction

The interface uses an intentionally retro SNES / SMB-inspired style:

- green field and panel backgrounds
- heavy borders
- pixel-adjacent button styling
- bright semantic colors by event type
- modal overlays instead of route changes
- scoreboard and context cards styled like a physical park board

### 3.2 Zone Layout

The page uses a fixed `h-screen` CSS grid with:

- left column: scoreboard/context + quick actions
- center column: main field + modifier/action strip
- right column: play log / enrichment panel

The layout is:

- Zone 1: `FenwayBoard`
- Zone 2: `EnhancedInteractiveField`
- Zone 3: `PlayLogPanel` or `EnrichmentPanel`
- Zone 4: `QuickBar`
- Zone 5: lineup/enrichment/modifier/undo/end controls

### 3.3 Zone 1: FenwayBoard

`FenwayBoard` shows:

- away/home abbreviated team names
- current score
- error counts
- inning and top/bottom indicator
- outs as three circular lights
- current pitcher card
- current batter card
- batter line and AVG
- pitcher pitch count, IP, K, H, BB, game ERA
- batter/pitcher mojo badges
- batter/pitcher fitness labels
- pitcher and batter tap targets

Pitcher tap is used for pitching change entry.

### 3.4 Zone 2: EnhancedInteractiveField

This is the main interactive surface. Current UX concepts in code:

- drag/drop field interaction
- click/tap field for location capture
- fielder drag and throw sequence capture
- runner markers and runner outcomes
- contextual special-event capture
- runner tap opens runner action popover
- fielder tap opens fielder action popover
- batter tap opens player card

The field component models a staged interaction flow:

- idle
- hit location capture
- out fielding capture
- outcome selection
- runner confirmation
- end confirmation

It can emit:

- full `PlayData`
- special events
- runner movement events

### 3.5 Zone 3: Play Log / Enrichment

The right rail is a parallel metadata workflow, not just a history list.

`PlayLogPanel` shows:

- inning label
- batter name
- result
- RBI badge
- QAB badge
- fielding sequence badge
- unmet enrichment badges: `+fld`, `+loc`, `+pit`, `+#`
- inline `K?` toggle when K/Kc distinction is missing

Tapping an enrichable play swaps the log for `EnrichmentPanel`.

`EnrichmentPanel` supports:

- field location
- fielding sequence
- HR distance
- pitch type
- pitches in at-bat

If main-field location mode is active, the panel defers field location entry back to the big field.

### 3.6 Zone 4: QuickBar

The bottom-left quick input bar is a one-tap alternate play-entry path.

Primary row:

- `K`
- `GO`
- `FO`
- `LO`
- `1B`
- `BB`
- `2B`
- `HR`

Overflow row includes:

- `PO`
- `3B`
- `HBP`
- `E`
- `FC`
- `DP`
- `TP`
- `SAC`
- `SF`
- `IBB`
- `WP_K`
- `PB_K`
- `GRD`

Context-sensitive disabling exists for:

- `SAC`
- `SF`
- `DP`
- `TP`

The QuickBar also exposes the Manager Moment indicator when mWAR logic triggers.

### 3.7 Zone 5: Auxiliary Action Strip

The bottom-center strip currently provides:

- `LINEUP` overlay launcher
- `+FLD` enrichment shortcut
- `+MOD` modifier tray toggle
- undo button
- end-game button

Modifier tray manual events:

- `7+`
- `ROB`
- `KP`
- `NUT`
- `BT`
- `BUNT`
- `TBL`

### 3.8 Overlays And Modals

Current modal/overlay surfaces include:

- player card modal
- lineup overlay
- end-game confirmation
- post-game enrichment prompt
- pitch count prompt
- fielder credit modal
- error-on-advance modal
- HR prompt
- error flow prompt
- sac-fly prompt
- double-play prompt
- infield-fly prompt
- detection confirmations
- fame toast
- player-state notifications

## 4. Supported Functional Surface

### 4.1 Game Initialization And Resume

The page attempts to load an existing in-progress game first.

If no game is found, it initializes a new game with:

- away/home lineups
- away/home bench
- starting pitchers
- season/franchise identity
- total innings
- stadium
- team records

The game can resume from either:

- live current-game snapshot storage
- event-log reconstruction fallback

### 4.2 Two Parallel At-Bat Entry Paths

Current at-bats can be recorded through two primary paths.

Path A:

- `EnhancedInteractiveField`
- richer play context
- runner-outcome capture
- fielding sequence
- location
- special prompts

Path B:

- `QuickBar`
- fast shorthand outcome entry
- more limited context
- separate prompt logic for HR, error, SF, DP, IFR

These paths are not fully unified internally.

### 4.3 Recorded Outcome Types

Current hook/page behavior supports:

- hits: `1B`, `2B`, `3B`, `HR`, `GRD`
- outs: `K`, `Kc`, `GO`, `FO`, `LO`, `PO`, `DP`, `TP`, `FC`, `SF`, `SH`, `D3K`
- walks: `BB`, `HBP`, `IBB`
- reach on error: `E`
- non-at-bat / between-play events: `SB`, `CS`, `WP`, `PB`, `PICK`, `PICK_SAFE`, `PICK_E`, `KILLED`, `NUTSHOT`, `WEB_GEM`, `ROBBERY`, `TOOTBLAN`, `BEAT_THROW`, `BUNT`, `STRIKEOUT`, `STRIKEOUT_LOOKING`, `DROPPED_3RD_STRIKE`, `SEVEN_PLUS_PITCH_AB`

### 4.4 Runner Interaction Surface

Runner tap popover supports:

- steal
- advance
- wild pitch
- passed ball
- pickoff with result sub-menu
- substitute pinch runner
- player card

There is also a batch runner movement path to avoid race conditions when multiple runners move together.

### 4.5 Fielder Interaction Surface

Fielder tap popover supports:

- defensive substitute
- pinch hit if fielder is current batter
- move position
- player card

### 4.6 Lineup / Substitution Surface

The lineup overlay exposes drag/drop substitution via `LineupCard`.

Supported flows:

- player-for-player substitution
- position swaps
- pitching changes
- pinch hitters
- pinch runners
- double-switch style handling in the hook

Validation exists in `useGameState` through lineup-state structures and `validateSubstitution`.

### 4.7 Player State / Meta Systems Wired In

The page currently wires these systems:

- mojo/fitness player state
- fame tracking
- fan morale updates
- narrative generation
- mWAR manager decision tracking
- playoff result recording
- elimination mojo/fitness snapshot persistence
- schedule completion

### 4.8 Enrichment Workflow

Enrichment is a real second-pass workflow, not a stub.

Implemented:

- play log entries know whether they are enrichable
- between-inning prompt for missing enrichment
- end-game prompt for missing enrichment
- direct IndexedDB updates to `AtBatEvent.enrichment`
- QAB inference from `pitchesInAtBat >= 7`

## 5. Core Logic Design

### 5.1 Canonical State Ownership

Canonical gameplay state lives in `useGameState`:

- score
- inning / half
- outs
- count
- occupied bases
- current batter/pitcher ids and names
- player stat map
- pitcher stat map
- playoff context

`GameTracker.tsx` mirrors some of that state for presentation:

- roster display arrays
- local runner names
- play log entries
- enrichment cache

### 5.2 Runner Identity Tracker

The most important non-UI design decision is the runner tracker in `useGameState`.

It stores:

- runner identity
- current base
- how runner reached
- responsible pitcher
- inherited/bequeathed runner attribution

This tracker is used for:

- runner name recovery
- earned/unearned run attribution
- inherited runner tracking
- pinch-runner identity replacement
- snapshot persistence / undo recovery

### 5.3 Event Log First, Snapshot Second

The system persists two kinds of game data.

Immediate event log:

- each at-bat is written as an `AtBatEvent`
- fielding events are stored separately
- game header tracks completion and aggregation status

Live snapshot:

- a debounced current-game snapshot preserves in-progress exact UI/game state
- snapshot includes scoreboard, batter indices, runner tracker snapshot, lineup state, substitution log, and current batter/pitcher ids

### 5.4 Outcome Recording Responsibilities

`useGameState` recording methods currently encapsulate the official write paths:

- `recordHit`
- `recordOut`
- `recordWalk`
- `recordD3K`
- `recordError`
- `recordEvent`
- `advanceRunner`
- `advanceRunnersBatch`

These methods update:

- event log
- tracker
- stat maps
- scoreboard
- current game state
- last-saved timestamp

### 5.5 Rule Handling Embedded In Hook

The hook contains reusable baseball-rule functions for:

- forced runners
- minimum advancement
- default runner outcomes
- extra advancement checks
- RBI calculation
- third-out run invalidation
- limited result auto-correction

However, the page also performs overlapping play interpretation before it calls the hook.

## 6. Persistence And Data Flow

### 6.1 Initialization Flow

1. `GameTracker.tsx` resolves route state or fallback rosters.
2. It calls `loadExistingGame()`.
3. If an in-progress snapshot exists, that is restored.
4. Otherwise `initializeGame()` creates:
   - lineup refs
   - lineup-state refs
   - player stat map
   - pitcher stat map
   - event-log game header
   - initial game state

### 6.2 Enhanced Field Play Flow

1. `EnhancedInteractiveField` emits `PlayData`.
2. `GameTracker.handleEnhancedPlayComplete()`:
   - captures undo snapshot
   - calculates RBI from runner outcomes
   - converts runner outcomes to `RunnerAdvancement`
   - injects pending enrichment
   - calls the relevant hook recorder
   - appends play-log entry
   - extracts fielding events
   - updates local runner-name mirror
   - triggers fame/detection/meta logic
3. `useGameState` writes the formal `AtBatEvent` and updates canonical state.

### 6.3 QuickBar Flow

1. `QuickBar` emits shorthand outcome string.
2. `GameTracker.handleQuickBarOutcome()`:
   - derives default runner outcomes using `calculateRunnerDefaults`
   - may branch into HR/error/SF/DP/IFR prompts
   - otherwise calls hook recorder directly
   - appends play-log entry
   - updates local runner-name mirror

This path is faster but less rich than the Enhanced Field path.

### 6.4 Runner Action Flow

Runner popover actions use:

- `advanceRunner`
- `advanceRunnersBatch`
- `recordEvent`
- substitution helpers

These update canonical bases, score, outs, tracker, scoreboard, and some batter/pitcher stats.

### 6.5 Substitution Flow

Substitutions currently cross two layers.

`GameTracker.tsx`:

- updates local roster arrays for display
- coordinates modal choices and lineup overlay behavior

`useGameState.ts`:

- validates substitution if lineup-state data exists
- updates lineup refs
- updates lineup-state refs
- updates substitution log
- initializes stats for new player if needed
- handles pinch-runner identity swap inside runner tracker

### 6.6 In-Progress Save Flow

An autosave effect in `useGameState` writes the full current snapshot after state changes.

Saved snapshot includes:

- inning / half / outs / score
- base occupants
- current batter/pitcher
- scoreboard
- player stats
- pitcher stats
- lineup and lineup-state
- runner tracker snapshot
- fame events
- substitution log

`beforeunload` and visibility-change also flush snapshots.

### 6.7 End-Inning Flow

When outs reach three or runner actions create a third out:

- `endInning()` raises a pitch-count prompt
- pending action executes `executeEndInning()`
- scoreboard fills undefined scoreless half-innings with zero
- auto game-end logic checks regulation/end conditions
- fielding team position innings are incremented
- bases clear
- inning/half flips
- pitching side switches
- runner tracker resets for next half-inning

### 6.8 End-Game Flow

`GameTracker.handleEndGame()` does more than the hook:

- detects late-game achievements
- updates fan morale
- generates narratives
- persists mWAR decisions
- marks franchise schedule game complete
- clears undo history
- navigates to post-game summary

`useGameState.endGame()` and `completeGameInternal()` handle persistence:

- mark game complete in event log
- compute fielding tallies from fielding events
- finalize pitcher stats
- calculate pitcher decisions
- build `PersistedGameState`
- aggregate to season
- mark game aggregated
- archive completed game
- record playoff/elimination outcomes
- clear current-game snapshot

## 7. What Is Implemented Vs Partial

### 7.1 Clearly Implemented

- live route wiring from `src/App.tsx`
- new-game initialization
- in-progress resume
- score / inning / count / outs tracking
- player and pitcher game stat tracking
- scoreboard line score
- enhanced field play recording
- quick-entry play recording
- runner popover interactions
- fielder popover interactions
- lineup overlay
- substitution validation path
- undo snapshots
- play log and enrichment panel
- event-log at-bat persistence
- live snapshot persistence
- season aggregation
- completed game archival
- playoff result recording
- schedule completion for played franchise/playoff games

### 7.2 Implemented But Operationally Fragile

- fielding attribution
- error-on-advance workflow
- fielder credit workflow
- pitch-count workflow
- end-game sequencing
- exact rehydration from mixed snapshot/event sources

### 7.3 Present But Not Fully Closed-Loop

- detection confirmations
- manual special-event tray
- manager-moment UI
- some fielding/fame/mWAR downstream integrations

## 8. Highest-Risk Logic And Gap Zones

These are the most important current risk areas for future work.

### 8.1 Dual Rules Engines In Practice

The hook contains baseball logic, but `GameTracker.tsx` also interprets plays, converts runner outcomes, calculates RBI, and decides prompts before calling the hook.

Effect:

- same concepts exist in two places
- quick-bar and enhanced-field paths can diverge
- future changes will be easy to make in one path and miss in the other

### 8.2 Play Log Is A Parallel Local Model

The visible play log is maintained in page state, not reconstructed from `AtBatEvent`s.

Effect:

- UI history is not the canonical persisted history
- undo currently trims the local log manually
- refresh/resume can restore game state without restoring identical play-log UI state

### 8.3 Fielder-Credit Workflow Is Not Fully Integrated

`handleFielderCreditConfirm()` explicitly says credits are a TODO for stats integration.

The replayed play path then goes through `extractFieldingEvents()`, but hit plays return no fielding events.

Practical consequence:

- runners thrown out on hits are not fully captured in the fielding pipeline
- manual fielder-credit input is not yet converted into durable player fielding stats

### 8.4 Error-On-Advance Modal Is Informational Only

The modal logs the user’s answer, but the code comments say the play was already processed and error attribution is TODO.

Practical consequence:

- extra-base-on-error review exists in UX
- it does not yet materially change stored play results or fielding totals

### 8.5 Fielding Events Are Stored By Position, Not Real Historical Player Id

`fieldingEventExtractor.ts` stores position-based ids like `SS` and `CF`, then end-game aggregation remaps those to real player ids using the lineup state at game end.

Practical consequence:

- fielding events before a defensive switch can be credited to the wrong player if the same position is occupied later by someone else
- this is one of the largest current accuracy risks in the stat pipeline

### 8.6 D3K Uses `howReached: 'error'` In The Runner Tracker

When a batter reaches on dropped third strike, the tracker adds that runner with `howReached: 'error'`.

Inference:

- this can contaminate `basesReachedViaError` and some earned/unearned downstream logic
- it should likely be its own reach type rather than sharing the error bucket

### 8.7 Pitch Count Flow Is Partially Bypassed

The page shows pitch-count prompts, but `useGameState.endGame()` also directly runs `completeGameInternal()` because route navigation would otherwise unmount before confirmation.

Practical consequence:

- the prompt still exists in UI
- end-game completion is no longer strictly gated by pitch-count confirmation
- pitch-count correctness is weaker than the prompt implies

### 8.8 Snapshot And Event-Log Rehydration Are Complex

`loadExistingGame()` has:

- live snapshot restore
- stale-snapshot invalidation
- event-log fallback reconstruction
- tracker rebuild fallback

Practical consequence:

- resilience is good
- correctness is harder to reason about
- subtle resume bugs can live in fallback paths even when normal play works

### 8.9 Current End-Game Pipeline Has Multiple Writers

Archiving and aggregation are touched from both `GameTracker.handleEndGame()` and hook internals, with idempotency guards on some paths.

Practical consequence:

- failure handling is more complex than it needs to be
- sequencing bugs are likely whenever end-game behavior changes

### 8.10 Tests Are Useful But Not Yet Full-System Proof

The codebase has many tests, but the targeted tests I ran were mostly logic-level assertions, not full end-to-end interaction verification across the page, hook, IndexedDB, and resume flow.

Practical consequence:

- there is meaningful safety coverage
- there is still room for integration regressions in real gameplay flows

## 9. Practical Implications For Next Steps

If the next phase is gap-finding and then redesign, the current codebase suggests this order:

1. Treat `useGameState` and the runner tracker as the gameplay source of truth.
2. Reduce duplicated play-interpretation logic in `GameTracker.tsx` before large feature expansion.
3. Fix stat-pipeline integrity gaps before redesigning the surface that captures those inputs.
4. Only redesign UI after deciding whether the future primary input path is:
   - enhanced field first
   - quick bar first
   - or a true unified entry engine used by both

## 10. Recommended Immediate Audit Targets

Before adding major new features, the highest-value code audits are:

- fielding-event attribution across substitutions and position changes
- thrown-out-on-hit / fielder-credit persistence
- D3K reach-type accounting
- pitch-count authority and end-game sequencing
- quick-bar vs enhanced-field behavioral parity
- resume-from-snapshot and resume-from-event-log parity

## Summary

The current GameTracker is not a thin UI shell. It is a substantial gameplay entry system with:

- two play-entry paths
- a real persistence layer
- a runner-identity / inherited-runner subsystem
- post-play enrichment
- substitution and pitching workflows
- season aggregation
- several meta systems already wired in

Its biggest current challenge is not missing structure. It is that the structure is split across a very large page component and a very large hook, with several partially closed loops in fielding, enrichment, and end-game handling.
