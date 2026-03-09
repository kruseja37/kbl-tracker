# GameTracker Canonicalization Plan

Scope: current `src/src_figma` GameTracker only.

Purpose: define the minimum logic centralization required before redesigning the frontend UI.

This is not an implementation diff. It is a structural plan grounded in the current codebase.

## Goal

Make the GameTracker safe to redesign by ensuring each important baseball or meta subsystem has one canonical owner and one canonical persistence path.

Right now the UI can be redesigned, but the result would still inherit:

- split sources of truth
- page-level sidecar logic
- missing durable event rows
- metric engines that exist without a live feed

The redesign should happen after those are reduced, not before.

## Non-Negotiable Principle

The canonical system should be:

1. event-first
2. owned by one core game-state layer
3. persisted at the moment the action occurs
4. replayable into game, season, and narrative outputs

For the current codebase, that means:

- `useGameState` plus the event-log/storage layer should become the canonical spine
- `GameTracker.tsx` should stop owning durable baseball logic that bypasses that spine

## Current Duplicate Truth Boundaries

### 1. Baseball Result Truth

Current split:

- QuickBar routes to `useGameState`
- enhanced field also routes to `useGameState`
- some prompts/modals add page-level side effects around those writes

Canonical target:

- one shared action API in `useGameState`
- QuickBar and field become different UI shells over the same action creator

### 2. Fielding Truth

Current split:

- at-bat truth is recorded in `useGameState`
- fielding sub-events are extracted and written from `GameTracker.tsx`

Canonical target:

- fielding extraction should move behind the same core recording boundary as the at-bat
- page should pass intent/enrichment only
- core recorder should decide if/when `FIELDING_EVENTS` are written

### 3. Fame Truth

Current split:

- `useGameState.fameEvents`
- `useFameTracking.tracker`

Canonical target:

- one durable fame ledger
- one view-model layer for popup/activity UX
- page-local fame hook should become a presenter over canonical game events, not a second tracker

### 4. Between-Play Truth

Current split:

- runner popovers and special-event buttons mutate local game state
- `BETWEEN_PLAY_EVENTS` schema exists but is mostly unwritten

Canonical target:

- all non-at-bat baseball actions become first-class event writes
- at least:
  - stolen base
  - caught stealing
  - pickoff
  - wild pitch
  - passed ball
  - pitcher change
  - substitution
  - position change
  - manager moment
  - mojo/fitness changes if you want them durable

### 5. Manager Truth

Current split:

- manager decisions live in `useMWARCalculations`
- persistence happens later
- hook is initialized only for the home manager

Canonical target:

- manager actions must carry explicit team/manager identity at creation time
- both teams need independent manager context

### 6. Condition Truth

Current split:

- `usePlayerState` owns mojo/fitness locally
- current game logic mostly ignores those states
- elimination snapshots persist only a slice

Canonical target:

- either:
  - make mojo/fitness fully canonical and durable
  - or demote them to intentional UI-only metadata for now

Do not keep the current ambiguous middle state through a redesign.

### 7. Morale / Relationship Truth

Current split:

- relationship systems live mostly in franchise layer
- fan morale is a local hook update
- player morale is mostly display/spec utility

Canonical target:

- keep them out of the redesigned in-game loop until they are ready
- or explicitly wire them into game context with real storage and preload

For redesign safety, the better short-term answer is usually to defer them from the critical game spine.

## Canonical Ownership Model

## 1. Core Recorder

Canonical owner:

- `useGameState`

Responsibilities:

- accept normalized game actions
- mutate game state
- write canonical event rows
- update local game aggregates
- emit derived payloads for UI

It should own:

- at-bat results
- runner state transitions
- pitcher transitions
- fielding extraction call
- fame event creation
- leverage/WPA calculation
- between-play event writing

It should not rely on `GameTracker.tsx` to separately write durable baseball data.

## 2. Page Layer

Canonical role:

- UI composition and orchestration only

Responsibilities:

- collecting user input
- opening prompts/modals
- sending normalized actions into core recorder
- rendering view state

It should stop directly owning:

- fielding event writes
- durable fame tracking
- business-rule duplication around manager/runner/baseball semantics

## 3. Event Log

Canonical role:

- durable replay ledger

Stores:

- `AT_BAT_EVENTS`
- `FIELDING_EVENTS`
- `BETWEEN_PLAY_EVENTS`
- `PITCHING_APPEARANCES`

Rule:

- if an action materially changes game or season meaning, it should exist here

## 4. Aggregation Layer

Canonical role:

- deterministic downstream projection

Responsibilities:

- game -> season aggregation
- milestone detection
- WAR recomputation
- archive and box score generation

Rule:

- aggregators should consume canonical event/game output, not page-local side data

## What Must Be Canonicalized Before Redesign

These are the minimum required items.

### Tier 1: Must Fix Before UI Redesign

1. Unify play entry
   - QuickBar and enhanced field must call the same normalized record-play path.

2. Move fielding writes behind core record path
   - no more page-side `extractFieldingEvents()` durability logic.

3. Choose one Fame pipeline
   - keep one durable fame source
   - turn the other into derived UI only

4. Start writing `BETWEEN_PLAY_EVENTS`
   - especially runner events and substitutions

5. Fix manager identity ownership
   - no more home-manager-only mWAR context

6. Make WAR recomputation explicit
   - either wire `warOrchestrator.ts` into game completion
   - or formally defer WAR from the redesigned UI until that exists

### Tier 2: Strongly Recommended Before or During Redesign

1. Decide whether mojo/fitness are canonical or cosmetic
2. Decide whether fan morale is real in current-game flow or not
3. Decide whether relationships affect live leverage right now or remain franchise-only
4. Stop using page-local roster arrays as shadow truth for substitutions

### Tier 3: Can Wait Until After Redesign

1. player morale full implementation
2. relationship-driven live matchup modifiers
3. deeper defensive run valuation
4. richer narrative pipelines

## Suggested Migration Order

This order minimizes breakage.

### Phase 1: Normalize Inputs

Introduce one normalized action vocabulary for the page to submit:

- `record_at_bat`
- `record_runner_event`
- `record_substitution`
- `record_pitcher_change`
- `record_special_event`
- `record_manager_decision`
- `update_event_enrichment`

Do not redesign the UI yet. Just make all entry points use the same action shapes.

### Phase 2: Centralize Durable Writes

Move these writes into the core recorder:

- `logAtBatEvent()`
- `logFieldingEvent()`
- `logBetweenPlayEvent()`

Page layer should stop calling storage functions directly.

### Phase 3: Collapse Split Meta Systems

Unify:

- Fame
- manager decision ownership
- substitution event persistence

At the end of this phase, the page should render from canonical game state and event-derived projections.

### Phase 4: Wire End-Game Metrics

Make end-game pipeline explicit and deterministic:

- complete game
- aggregate season stats
- recompute WAR
- detect milestones
- persist manager season stats

If WAR remains unwired here, the redesign should not claim live season WAR fidelity.

### Phase 5: Redesign UI

Only after the above:

- choose QuickBar-first, field-first, or hybrid
- simplify prompts
- move enrichment earlier or later as desired
- expose meta systems honestly

At that point the redesign is changing interaction design, not compensating for hidden architecture problems.

## Recommended Canonical Decisions

These are the decisions I would make if the goal is the smallest safe change set.

### 1. Keep `useGameState` as the core spine

Reason:

- it already owns the durable baseball record
- replacing it before redesign would create unnecessary risk

### 2. Demote `useFameTracking` to view-model status

Reason:

- current season pipeline already depends on `useGameState.fameEvents`
- page popup tracking should derive from canonical fame rows, not parallel state

### 3. Promote `BETWEEN_PLAY_EVENTS` to first-class status

Reason:

- runner events and substitutions are currently under-persisted
- any serious redesign will otherwise keep lying about what is tracked

### 4. Treat `warOrchestrator.ts` as part of the official end-game pipeline

Reason:

- the calculators already exist and are tested
- the missing piece is orchestration, not invention

### 5. Keep relationships and player morale out of the redesigned critical path unless explicitly centralized

Reason:

- they are not currently game-live
- pulling them into the redesign prematurely would expand scope and ambiguity

### 6. Make mojo/fitness either real or intentionally local

Reason:

- current middle ground is misleading

Recommended short-term choice:

- keep manual mojo/fitness editing
- persist it only if you are ready to make it part of the canonical player-condition model
- otherwise label it clearly as session/local behavior during redesign

## Required Invariants After Canonicalization

These should be true before redesign is considered safe.

1. Every baseball action that changes game meaning has one canonical event write path.
2. Page components do not directly write baseball durability sidecars.
3. Runner events are replayable from durable event records.
4. Fame has one durable owner.
5. Manager decisions always carry the correct manager/team identity.
6. Fielding counts can be regenerated from canonical event data.
7. End-game aggregation is idempotent and complete.
8. UI-only controls do not imply durable tracking unless it exists.

## What the Redesign Should Be Allowed To Change

After canonicalization, the redesign can safely change:

- whether QuickBar or field is visually primary
- where prompts appear
- whether enrichment is inline or post-play
- how manager moments are surfaced
- how player condition is displayed
- how much meta information is visible during live play

The redesign should not need to change:

- event semantics
- storage semantics
- downstream season/career projection logic

## Immediate Practical Recommendation

If you want the shortest path to redesign readiness, do these four first:

1. Create a unified action interface into `useGameState`
2. Move fielding event extraction/write behind that interface
3. Start writing real `BETWEEN_PLAY_EVENTS`
4. Wire WAR recomputation into the end-game pipeline

That gets rid of most of the hidden architecture debt without forcing a full rewrite.
