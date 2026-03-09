# GameTracker WAR + Meta Systems Truth Map

Scope: current `src/src_figma` GameTracker only. This document reverse-engineers what is actually implemented for fielding tracking, WAR, WPA/leverage/clutch, Fame, milestones, manager systems, mojo/fitness, relationships, and morale.

This is not a design spec. It is a truth map of the code as it exists now.

## Bottom Line

The current GameTracker has three different implementation tiers:

1. Live and persisted
   - At-bat event logging with `leverageIndex` and `wpa`
   - Core batting/pitching counting stats
   - Position-resolved fielding counting stats at game end
   - Manager decision persistence and season mWAR aggregation
   - End-of-game milestone detection

2. Live in current UI, but mostly local/session-only
   - `useFameTracking` popup events and game fame tracker
   - Fan morale hook state
   - Mojo/fitness state in `usePlayerState`
   - Manager Moment prompt state

3. Defined/tested calculators or engines, but not fully fed by current GameTracker
   - `bWAR`, `pWAR`, `rWAR`, `fWAR` season recomputation orchestrator
   - `netClutch` accumulation
   - relationship-driven leverage modifiers
   - between-play event ledger
   - player morale as a tracked system

The biggest architectural truth is that the codebase has more metric engines than live metric pipelines.

## Verification

Targeted subsystem tests passed:

- `fwarCalculator.test.ts`
- `bwarCalculator.test.ts`
- `pwarCalculator.test.ts`
- `rwarCalculator.test.ts`
- `mwarCalculator.test.ts`
- `fameEngine.test.ts`
- `milestoneDetector.test.ts`
- `relationshipIntegration.test.ts`
- `mojoFitnessIntegration.test.ts`
- `leverageFields.test.ts`
- `fameEventFields.test.ts`

Result: 11 files, 747 tests passed.

That means the calculators and contracts are largely implemented and exercised. It does not mean the current GameTracker feeds them correctly.

## System Status Matrix

| System | Current Page UI | Live Game State | Persisted During Game | End Game / Season | Truth |
| --- | --- | --- | --- | --- | --- |
| Fielding counting | Yes | Yes | `FIELDING_EVENTS` store | Yes | Real, but coarse |
| fWAR | No direct display in GameTracker | No | No | Calculator exists, not wired from game end | Calculable, not live |
| bWAR | No | No | No | Calculator exists, not called by GameTracker end flow | Dormant in pipeline |
| pWAR | No | No | No | Calculator exists, not called by GameTracker end flow | Dormant in pipeline |
| rWAR | No | Partial inputs only | Partial | Calculator exists, inputs incomplete | Partially feedable |
| mWAR | Yes | Yes | Decisions persisted at game end | Yes | Real, but home-manager-biased |
| WPA | No direct UI | Yes | Stored on `AtBatEvent` | Yes in event log | Real for at-bats only |
| Leverage Index | Yes indirectly | Yes | Stored on `AtBatEvent` | Yes in event log | Real for at-bats |
| netClutch | No | No live accumulation | No | Engine only | Unwired |
| Fame via `useGameState` | Minimal | Yes | No separate ledger | Included in persisted completed game snapshot | Partial |
| Fame via `useFameTracking` | Yes popup/activity log | Yes | No | Not merged into season pipeline | UI-local parallel truth |
| Milestones | Minimal | No live prompting from game page | No | Yes at aggregation time | Real at end-game |
| Manager Moments | Yes | Yes | No separate ledger | Decision may persist if user calls it | Real UI prompt, partial persistence |
| Mojo | Yes via PlayerCard | Yes | No | Elimination snapshot only | Session-local |
| Fitness | Yes via PlayerCard | Yes | No | Elimination snapshot only | Session-local |
| Relationships | Not in current GameTracker UI flow | No | Franchise storage only | Franchise-level only | Not game-live |
| Player morale | Not really | No | No | Mostly display/spec utilities | Not implemented as live system |
| Fan morale | No visible GameTracker surface | Local hook only | No | No season persistence found in page flow | Stub/local only |

## Shared Architecture

The current GameTracker has multiple competing “truths”:

1. `useGameState` truth
   - Owns at-bat recording, scoreboard, player stats, pitcher stats, runner tracker, event-log writes, and completed-game persistence.

2. `GameTracker.tsx` page-local truth
   - Owns extra UI systems: `useFameTracking`, `useFanMorale`, `useMWARCalculations`, `usePlayerState`, play detection prompts, runner/fielder popovers, and fielding extraction calls.

3. Engine truth
   - Large engine layer exists for WAR/Fame/mWAR/relationships/clutch/fan morale/mojo/fitness.
   - Many of these engines are valid and tested, but the current GameTracker does not fully connect them.

This is why several systems are “implemented” in the repo while still being incomplete in the current GameTracker flow.

## 1. Fielding Tracking

### Current UI / UX Surface

Fielding tracking is spread across:

- `EnhancedInteractiveField.tsx`
- QuickBar-driven play entry in `GameTracker.tsx`
- fielder popovers
- runner popovers
- fielder credit modal for runners thrown out on hits
- error-on-advance modal

Important UI truth:

- the page mounts `EnhancedInteractiveField` with `hideActionSelector={true}`
- this means the field is not the full primary play engine
- QuickBar is still the main result-entry surface
- the field mostly enriches plays with location, sequence, and popover interactions

### Live Tracking Flow

Primary fielding pipeline:

1. User records a ball-in-play result from QuickBar / enhanced play flow.
2. `useGameState` records the at-bat as a normal batting/pitching event.
3. `GameTracker.tsx` separately calls `extractFieldingEvents(playData, context)`.
4. Each extracted `FieldingEvent` is written to IndexedDB via `logFieldingEvent()`.

Secondary fielding pipeline:

1. On hits where runners are thrown out, `handleFielderCreditConfirm()` records the play.
2. That path also calls `extractFieldingEvents()` and `logFieldingEvent()`.

### What Gets Stored

The fielding event ledger is real:

- store: `FIELDING_EVENTS`
- one row per extracted fielding sub-event
- linked to `gameId`
- linked to a synthetic `atBatEventId`

But the stored event is still coarse:

- `playerId` is position-based at write time, not a real player ID
- `runsPreventedOrAllowed` is hardcoded to `0`
- star-play context is simplified into coarse difficulty buckets
- `atBatSequence` uses `Date.now()` in the page layer, not the actual at-bat index from `useGameState`

### Extraction Rules Actually Implemented

`fieldingEventExtractor.ts` currently handles:

- error -> one `error` event for `errorFielder`
- foul out -> first fielder gets `putout`
- standard outs -> assists for all but last, putout for last
- outfield assist upgrade when first fielder is `7/8/9`
- D3K with `2 -> 3` sequence -> catcher assist + first-base putout
- double play -> first assist, middle pivot(s), last putout
- triple play -> assists for all but last, last putout
- sacrifice fly -> putout plus assists on throw chain
- fielder’s choice -> assist/putout sequence
- hits -> no defensive credit unless handled separately via fielder-credit flow

### End-Game Resolution

At game end, `useGameState`:

1. loads all game fielding events from IndexedDB
2. maps `position + teamId` back to actual `playerId` using the final lineup refs
3. tallies `putouts`, `assists`, and `errors`
4. injects those totals into `PersistedGameState.playerStats`
5. season aggregation adds those counts into season fielding storage

### What Is Not Really Tracked

The current live fielding pipeline does not fully track:

- double plays in season fielding totals
- games by position
- putouts/assists/errors by position
- diving catches
- robberies
- range-based runs saved
- arm/cutoff/relay nuance
- real run prevention value per play
- error-on-advance attribution into fielding stats

`PlayerSeasonFielding` has fields for many of these, but `seasonAggregator.ts` only updates:

- `games`
- `putouts`
- `assists`
- `errors`
- optional `divingCatches`
- optional `robberies`
- optional `nutshots`

In practice, only the first four are meaningfully fed by the current GameTracker flow.

### Fielding Truth

Fielding counting stats are real.

Fielding valuation is not.

The current codebase is good enough to reconstruct:

- who got putouts
- who got assists
- who got charged with errors

It is not yet a full defensive value engine in live use.

## 2. WAR Components

### Top-Level Truth

All five WAR families exist in code:

- `bWAR`
- `pWAR`
- `rWAR`
- `fWAR`
- `mWAR`

But only `mWAR` is currently wired into the active GameTracker completion path as a full live-to-storage workflow.

### 2.1 bWAR

What exists:

- full `bwarCalculator.ts`
- season stat mapping in `warOrchestrator.ts`
- tests pass

Inputs expected:

- season batting totals
- league context
- park factors when available

Current GameTracker reality:

- batting counting stats are aggregated into season storage
- `calculateAndPersistSeasonWAR()` is never called from the current game-end flow
- therefore `bwar` is not automatically recalculated after each completed current GameTracker game

Important side effect:

- downstream consumers that expect season batting rows to have current `bwar` are depending on dormant orchestration

### 2.2 pWAR

What exists:

- full `pwarCalculator.ts`
- leverage-aware reliever adjustment logic
- season stat mapping in `warOrchestrator.ts`
- tests pass

Current GameTracker reality:

- pitching counting stats are real and aggregated
- `pWAR` recomputation is not triggered by the current game-end path

Important nuance:

- the pWAR calculator can use leverage context for relievers
- the current season mapping mostly falls back to saves/holds or average LI assumptions, not live per-appearance LI from the game page

### 2.3 rWAR

What exists:

- full `rwarCalculator.ts`
- support for `wSB`, `UBR`, `wGDP`
- simplified season mapping in `warOrchestrator.ts`
- tests pass

Current GameTracker reality:

- season storage reliably tracks `SB`, `CS`, `GIDP`
- detailed advancement inputs for `UBR` are not fully stored in season storage
- `warOrchestrator.ts` uses `calculateRWARSimplified()`

Critical live gap:

- runner popover steals call `recordEvent('SB')` without passing `runnerId`
- `useGameState.recordEvent()` only increments player SB/CS when `runnerId` is provided
- so real stolen-base player stats can be missed in the current live UI flow

Result:

- the repo has a real rWAR calculator
- the current GameTracker feeds it only partially, and even some of those inputs are fragile

### 2.4 fWAR

What exists:

- full per-play `fwarCalculator.ts`
- simplified `calculateFWARFromStats()`
- fielding event adapter logic
- tests pass

Current GameTracker reality:

- live page captures fielding counting stats, not full per-play run values
- `warOrchestrator.ts` uses `calculateFWARFromStats()`
- `warOrchestrator.ts` is not invoked by the current game-end pipeline

Critical gap:

- the live fielding extractor writes some fielding events
- but season fielding aggregation only carries coarse totals
- the richer per-play fWAR model is therefore not the active end-to-end path

### 2.5 mWAR

This is the most live WAR subsystem in the current GameTracker.

What is live:

- `useMWARCalculations` holds game stats, season stats, pending decisions, and manager moment prompt state
- GameTracker records decisions for:
  - pitching changes
  - IBB
  - pinch-hit / defensive replacement style substitutions
  - manager moment “Call”
- outcomes resolve after the next play
- decisions persist at game end via `saveGameDecisions()`
- season mWAR aggregates via `aggregateManagerGameToSeason()`

Critical truth:

- the hook is initialized only once, for the home manager
- both home and away tactical actions are funneled through that single hook
- end-game aggregation also uses only `homeManagerId` and `homeTeamId`

That means current mWAR is real, but structurally biased toward the home manager identity/persistence path.

## 3. WPA, Leverage Index, netClutch

### 3.1 Leverage Index

What is real:

- `useGameState` computes base-out leverage index during at-bat recording
- `AtBatEvent.leverageIndex` is stored for hits, outs, walks, errors, and D3K-like paths
- `mWAR` uses leverage for `clutchImpact`
- Manager Moments trigger at `LI >= HIGH_LEVERAGE_THRESHOLD`

What is not real:

- between-play events like SB/WP/PB/pickoffs are not written to the dedicated between-play event ledger
- those events do not get their own persisted LI/WPA trail

### 3.2 WPA

What is real:

- `useGameState` calls `calculateWPA()` when creating `AtBatEvent`
- `winProbabilityBefore`, `winProbabilityAfter`, and `wpa` are stored on at-bat rows

What is not real:

- current fame and clutch UI systems are not tightly integrated with those persisted `AtBatEvent.fameEvents`
- runner-only between-play events are outside the at-bat WPA pipeline

### 3.3 netClutch

What exists:

- full `clutchCalculator.ts`
- `PlayerClutchStats`
- accumulation helpers
- player-state integration types expose clutch tier/icon/color

What I found in current GameTracker:

- no live accumulation path from GameTracker plays into `accumulateClutchEvent()`
- `usePlayerState` never populates clutch stats
- no storage path found for season or career netClutch from current GameTracker

Truth:

`netClutch` is implemented as an engine, not as a live GameTracker-tracked metric.

## 4. Fame

### Top-Level Truth

The current codebase has two separate Fame systems operating in parallel:

1. `useGameState` fame events
2. `useFameTracking` fame tracker

They are not the same ledger.

### 4.1 `useGameState` Fame

`useGameState.recordEvent()` creates local fame records for:

- `WEB_GEM`
- `ROBBERY`
- `TOOTBLAN`
- `KILLED` / `KILLED_PITCHER`
- `NUTSHOT` / `NUT_SHOT`
- some informational non-fame events

It weights fame by `sqrt(LI)` and appends those records to local `fameEvents` state.

This `fameEvents` array is later copied into the completed-game snapshot used for season aggregation.

Important gaps:

- fame is not written into `AtBatEvent.fameEvents` for normal at-bat rows
- there is still no dedicated between-play fame ledger
- recipient attribution is incomplete in some paths
- fielding fame uses placeholder recipient handling

### 4.2 `useFameTracking` Fame

`useFameTracking` is a separate React-only tracker used by the page for:

- multi-hit
- multi-HR
- strikeout shame
- RBI milestone-style game events
- pitcher K thresholds
- pitcher meltdown events
- auto-detected events from detection prompts
- perfect game / no-hitter / Maddux / shutout / complete game
- popup UI and activity-log messaging

Important truth:

- these events live in the hook’s own `tracker`
- I found no merge from `useFameTracking.tracker` back into `useGameState.fameEvents`
- the current end-game persistence path uses `useGameState` fame, not `useFameTracking`

So a large portion of the current Fame UX is local-only and not season-persistent.

### 4.3 Season Fame Aggregation

`seasonAggregator.ts` groups `gameState.fameEvents` and writes totals into season batting stats:

- `fameBonuses`
- `fameBoners`
- `fameNet`

Critical bug-level truth:

- it updates batting season rows only
- it does not write pitcher fame into pitching season stats

So pitcher fame is not cleanly represented in the current season aggregation path.

## 5. Milestones

What is real:

- milestone detection runs at game end through `aggregateGameWithMilestones()`
- it checks season milestones
- it checks career milestones
- it checks WAR component milestones
- it can record franchise firsts and franchise leader changes
- it writes career milestone records

What is only partial:

- milestone-generated Fame events are returned in the aggregation result
- I did not find them subsequently merged into season Fame totals in the same way gameplay fame is

Critical dependency:

- WAR component milestones depend on actual WAR values being current
- because the current game-end flow does not call `warOrchestrator.ts`, WAR component milestone progression is at risk of being stale or absent

Truth:

Milestone detection is real at aggregation time, but parts of the reward/persistence chain are incomplete.

## 6. Manager Moments

What is real:

- `mwarIntegration.ts` infers a decision type from the current game state
- it triggers when leverage exceeds the threshold
- GameTracker surfaces this as an inline “MANAGER MOMENT” call/skip panel
- if the user calls it, a manager decision is recorded and later resolved

What is not real:

- `BetweenPlayEvent.managerMoment` schema exists but is not used by current GameTracker
- Manager Moments are not written to the dedicated between-play event ledger

Truth:

Manager Moment is a real UI and local-decision feature, but not a full event-log subsystem.

## 7. Mojo and Fitness

### What Is Live

`usePlayerState` is real and wired into the current page:

- all players are registered at game start
- PlayerCard can manually set mojo
- PlayerCard can manually set fitness
- notifications can be generated on state changes

In elimination mode only:

- snapshots load at game start
- snapshots save at game end

### What Is Not Live

- automatic mojo updates from play results are explicitly disabled in `GameTracker.tsx`
- I found no current use of `getAdjustedBattingStats()` or `getAdjustedPitchingStats()` in live play recording
- I found no live use of `updateFitness()` based on workload
- I found no event-log write for `mojo_change` or `fitness_change`
- I found no season-long mojo/fitness storage for normal franchise flow in current GameTracker

Truth:

Mojo and fitness are currently editable condition metadata with elimination-mode carryover, not deeply integrated gameplay modifiers in the current GameTracker pipeline.

## 8. Relationships

What exists:

- full relationship engine
- relationship storage
- chemistry and trade-warning logic
- revenge arc and romantic matchup derivation for leverage
- tests pass

What is current GameTracker reality:

- `GameTracker.tsx` does not use `useRelationshipData()`
- relationship data is wired in `useFranchiseData()`, not in the current game page
- I found no live matchup-context injection from current game relationships into `calculateLeverageIndex()`

Truth:

Relationships are implemented at the franchise/engine layer, but not currently part of the live GameTracker play loop.

## 9. Morale

### 9.1 Fan Morale

What the code says:

- `useFanMorale.ts` explicitly documents itself as effectively stubbed/simplified
- it keeps morale in local React state
- it wraps the legacy engine’s event processing with minimal glue

What GameTracker does:

- instantiates one hook per team
- calls `processGameResult()` at game end only in non-exhibition modes
- passes hardcoded game date `{ season: 1, game: 1 }`
- does not show a visible current-game morale UI on the page

What I did not find:

- persistence from the GameTracker page into a durable season/team morale store
- a loaded prior team morale state before updating game result

Truth:

Fan morale is currently a local hook update at game end, not a reliable persisted franchise subsystem in the current GameTracker flow.

### 9.2 Player Morale

What exists:

- `playerMorale.ts` display utilities
- morale effect calculations in relationship engine
- morale columns and displays elsewhere in the franchise UI

What I did not find in current GameTracker:

- a live player morale tracker
- player morale persistence from game events
- player morale effects applied to gameplay or post-game player state

Truth:

Player morale is mostly a display/spec/franchise concern right now, not a live GameTracker system.

## 10. Fame / Morale / Relationship Effects “From Both Players and Fans”

This area is the least unified.

### Implemented pieces

- player-to-player relationship morale effects can be calculated
- fan morale can be updated from a game result
- Fame values and tiers exist
- leverage modifiers from relationship revenge/romantic contexts exist

### Missing or unwired pieces

- current GameTracker does not connect relationships into live leverage
- player morale is not a tracked in-game state
- fan morale is not a durable current-game/franchise pipeline in the page flow
- Fame, morale, and relationship systems are not operating as one integrated ecosystem during a current game

Truth:

The repo contains the components for a rich social/narrative system. The current GameTracker does not yet execute that as one coherent live pipeline.

## 11. Highest-Value Gaps

These are the biggest truth-vs-expectation mismatches in the current codebase.

1. WAR orchestration gap
   - `warOrchestrator.ts` exists but is not called by the current game-end flow.

2. Fame split-brain
   - `useFameTracking` drives a lot of live UI, but its events are not the same events that the season aggregator consumes.

3. Fielding valuation gap
   - fielding counts are real, but defensive value is still mostly coarse and non-run-based in the live pipeline.

4. Between-play event gap
   - schema and storage exist for SB/WP/PB/subs/mojo/fitness/manager moments, but current GameTracker still does not generally write to that ledger.

5. mWAR manager identity gap
   - current page initializes mWAR for the home manager only, while recording decisions from both teams.

6. rWAR input gap
   - steals/caught stealing from runner popovers often lack runner IDs, so player stat accumulation is incomplete.

7. Pitcher Fame aggregation gap
   - season Fame aggregation writes only to batting season rows.

8. Fan morale persistence gap
   - current page updates local morale hook state, but not a durable franchise morale record.

9. Relationship integration gap
   - relationship and leverage engines exist, but they are not part of the current in-game loop.

10. Player morale gap
   - player morale is not a real current GameTracker-tracked state.

## 12. Safe Conclusions

You can treat the current codebase as having:

- a real at-bat and counting-stat tracker
- a real but coarse fielding counter pipeline
- a real mWAR decision pipeline
- real event-level leverage and WPA at the at-bat layer
- partial Fame persistence and a separate larger Fame UI layer
- real milestone detection at game end
- local-only mojo/fitness editing
- mostly unwired relationship and morale systems for current GameTracker

You should not treat the current codebase as already having:

- a complete live WAR pipeline
- a unified Fame system
- real netClutch tracking
- full defensive run value tracking
- durable fan morale tracking from the current page
- live relationship-driven gameplay effects
- player morale as a functioning game-state system

## 13. Recommended Next Reverse-Engineering Artifact

The next artifact should be a dependency matrix:

- every live GameTracker UI control
- every hook or engine it calls
- every stat or metric it changes
- every storage write it triggers
- every season/career leaderboard field it eventually feeds

That will give you the cleanest map for deciding what to repair before redesigning the frontend.
