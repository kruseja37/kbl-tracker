# GameTracker Current Functional Logic Bible

Last verified: March 9, 2026

Scope: current GameTracker implementation in `src/src_figma` plus the production storage/aggregation modules it actually calls under `src/utils`.

Intent of this document: describe, in code-verified terms, what the current GameTracker is from a logic and functionality standpoint, independent of visual design preferences. This is not a desired-state spec. It is a current-state truth map.

Method:
- Re-read the current live GameTracker files and the storage/aggregation helpers they call.
- Prefer direct code statements over prior docs or memory.
- When code exposes a capability that the live page does not currently surface, this document labels it as latent/not live.
- When two code paths do similar work differently, this document calls out both paths and the divergence.

Primary files re-verified for this document:
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- `src/src_figma/app/components/EnhancedInteractiveField.tsx`
- `src/src_figma/app/utils/fieldingEventExtractor.ts`
- `src/utils/eventLog.ts`
- `src/utils/gameStorage.ts`
- `src/utils/seasonAggregator.ts`
- `src/utils/processCompletedGame.ts`
- `src/src_figma/app/hooks/useFameTracking.ts`
- `src/src_figma/app/hooks/useMWARCalculations.ts`
- `src/src_figma/app/hooks/usePlayerState.ts`
- `src/src_figma/app/hooks/useFanMorale.ts`
- `src/src_figma/app/engines/warOrchestrator.ts`
- `src/utils/managerStorage.ts`

## 1. Executive Truth

The current GameTracker is a multi-layer scoring/orchestration system with four distinct functional layers:

1. `useGameState.ts` is the core live baseball state engine.
It owns inning state, count, bases, batter/pitcher turn order, player game stats, pitcher game stats, runner identity tracking, autosave snapshotting, at-bat event writes, season aggregation, and end-game completion.

2. `GameTracker.tsx` is the page-level orchestration shell.
It owns route-state ingestion, roster/UI-local team arrays, undo integration, play log/enrichment UI state, fielding-event extraction, additional Fame side-effects, mWAR side-effects, fan morale side-effects, player-state registration/editing, and navigation to post-game summary.

3. `eventLog.ts` and `gameStorage.ts` are the durability layers.
`eventLog.ts` persists immutable-ish game-event ledgers. `gameStorage.ts` persists the debounced live snapshot and the completed-game archive.

4. Several meta systems exist around the core loop, but they are not equally live.
Leverage index and WPA are live on at-bat events. Fielding event persistence is live. Season batting/pitching/fielding/fame aggregation is live at game end. mWAR is partially live. Fame is split across two pipelines. Mojo/Fitness are mainly local editable state. Fan morale is local hook state updated at game end. WAR orchestration exists but is not called by the live GameTracker. Relationship/player-morale systems exist elsewhere in the repo but are not part of the current GameTracker execution path.

## 2. Ownership Boundaries

### 2.1 Canonical baseball engine: `useGameState.ts`

`useGameState` is the closest thing to canonical baseball truth in the current implementation.

It owns:
- game state (`inning`, `isTop`, `outs`, `balls`, `strikes`, `bases`, `currentBatterId`, `currentPitcherId`, score)
- scoreboard state (per-inning line score plus aggregate R/H/E)
- batter game stats map
- pitcher game stats map
- fame event list used by the end-game persistence path
- runner tracker ref used for responsible-pitcher and runner-identity logic
- lineup refs and lineup-state refs
- substitution log
- live autosave snapshot of the in-progress game
- pitch-count prompt state and pending pitch-count-gated actions
- end-inning / end-game transitions

### 2.2 Page orchestration shell: `GameTracker.tsx`

`GameTracker.tsx` is not just view code. It adds real behavior on top of the hook:
- builds lineups/bench/pitcher IDs from route rosters
- decides whether to initialize a new game or reload one
- mirrors team rosters in local `awayTeamPlayers` / `homeTeamPlayers` arrays for the UI
- owns undo capture/restore around the hook
- owns structured play log entries and enrichment-panel state
- owns runner/fielder popover actions
- owns the QuickBar path
- owns the Enhanced Field completion path
- owns fielding event extraction and persistence
- owns the extra Fame hook sidecar
- owns player mojo/fitness registration and manual edits
- owns mWAR sidecar recording/resolution/persistence
- owns end-game fan morale and narrative side-effects
- owns final navigation to `/post-game/:gameId`

### 2.3 Important consequence

There is not one single normalized play-entry pipeline.

There are multiple overlapping operational truths:
- hook truth: `useGameState` state plus its event writes
- page truth: `GameTracker` local arrays/logs/prompts/undo/meta hooks
- event-log truth: `AT_BAT_EVENTS`, `FIELDING_EVENTS`, and theoretically `BETWEEN_PLAY_EVENTS`
- autosave truth: `currentGame` snapshot in `gameStorage`

These truths are often synchronized, but not always.

## 3. Live Runtime Inputs

The page expects route/navigation state with:
- team rosters
- pitcher lists
- team IDs and names
- optional team colors
- optional stadium
- optional team records
- game mode (`exhibition`, `franchise`, `playoff`, `elimination`)
- league, franchise, playoff, elimination, and schedule context
- manager IDs/names
- optional `seasonNumber`
- optional `totalInnings`

Fallbacks exist if route state is missing:
- `home`/`away` IDs
- `HOME`/`AWAY` names
- hardcoded default rosters and pitchers
- `season-1`
- `sml`
- 9 innings

## 4. Initialization and Recovery

### 4.1 Startup flow

On mount, `GameTracker.tsx`:
- creates/loads local team arrays from route state or hardcoded defaults
- calls `loadExistingGame()` first
- if an in-progress game is found and belongs to the requested `gameId`, it restores that state
- otherwise it constructs lineup/bench arrays and calls `initializeGame(...)`

### 4.2 What `initializeGame(...)` does

`useGameState.initializeGame()`:
- clears stale `currentGame`
- resets fame, substitution log, pitch count prompt, pitcher-name map, inning pitch tracker, scoreboard
- stores season/franchise/league/team-record context refs
- stores total innings ref
- builds `LineupState` refs for away and home
- records playoff context refs if supplied later
- writes a `GameHeader` in `eventLog`
- initializes batter stats for lineup players
- initializes pitcher stats for both starting pitchers
- seeds pitcher names
- initializes runner tracker with the home starter as the current responsible pitcher because the home team fields top 1
- sets game state to top 1, away leadoff hitter, home starting pitcher

### 4.3 Current-game recovery sources

`loadExistingGame()` tries two recovery modes:

1. Preferred recovery: `gameStorage.loadCurrentGame()`
- restores exact live snapshot
- includes runner tracker snapshot, scoreboard, lineup states, pitcher stats, batter stats, batter indexes, inning pitch counts, fame events, substitution log, and pitcher name map
- this is the most faithful recovery path

2. Fallback recovery: rebuild from `eventLog.getGameEvents(gameId)`
- reconstructs approximate pitcher stats from at-bat rows
- rebuilds scoreboard from the at-bat events
- reconstructs runner tracker from `lastEvent.runnersAfter`
- restores final visible game state from last event + header
- this path is less exact than the live snapshot path

### 4.4 Autosave behavior

After initialization, a `useEffect` in `useGameState` continuously writes a debounced `PersistedGameState` snapshot to `currentGame`.

That snapshot includes:
- current inning/half/outs/score
- occupied bases with runner identities if available
- batter indexes and at-bat count
- batter stats
- pitcher stats
- fame events
- full scoreboard
- lineup refs and lineup states
- runner tracker snapshot
- pitcher-name map
- substitution log

Flush behavior:
- debounced save after 250ms on state changes
- immediate save on `beforeunload`
- immediate save on `document.visibilitychange` when hidden

## 5. Core Live Baseball State Model

### 5.1 `gameState`

The live state model in `useGameState` includes:
- inning number
- top/bottom half
- outs
- balls
- strikes
- first/second/third occupancy as booleans
- away/home score
- current batter identity
- current pitcher identity
- team IDs/names
- season number
- optional stadium name

### 5.2 `scoreboard`

Separate scoreboard state tracks:
- `innings[]` with `away`/`home` line-score cells
- aggregate away totals: `runs`, `hits`, `errors`
- aggregate home totals: `runs`, `hits`, `errors`

This scoreboard is updated in parallel with `gameState`, not derived from it on render.

### 5.3 Batter stats tracked live

Per-player live batting stat fields:
- `pa`
- `ab`
- `h`
- `singles`
- `doubles`
- `triples`
- `hr`
- `r`
- `rbi`
- `bb`
- `hbp`
- `k`
- `sb`
- `cs`
- `sf`
- `sh`
- `gidp`

Fielding stat fields are not incremented directly during play in `useGameState`; they are attached at game end from `FIELDING_EVENTS`.

### 5.4 Pitcher stats tracked live

Per-pitcher live stat fields include:
- starter/relief entry metadata
- `outsRecorded`
- `hitsAllowed`
- `runsAllowed`
- `earnedRuns`
- `walksAllowed`
- `intentionalWalks`
- `strikeoutsThrown`
- `homeRunsAllowed`
- `hitByPitch`
- `wildPitches`
- `pitchCount`
- `battersFaced`
- `consecutiveHRsAllowed`
- `firstInningRuns`
- `basesLoadedWalks`
- inherited/bequeathed runner metadata
- exit inning/outs
- `finishedGame`
- `decision`
- `save`
- `hold`
- `blownSave`

## 6. Runner Identity and Earned Run Attribution

This is one of the most important actual systems in the current GameTracker.

### 6.1 Separate runner tracker

`useGameState` uses a separate runner tracker ref rather than only boolean bases.

That tracker stores, per runner:
- runner ID and name
- current base
- starting base
- how they reached
- responsible pitcher ID/name
- whether they are inherited
- inherited-from pitcher
- inning and at-bat reached

### 6.2 Why the tracker exists

It is used for:
- preserving runner identity through saves/reloads
- pinch-runner replacement without losing run-credit identity
- charging scored runs to the responsible pitcher rather than always the current pitcher
- inherited/bequeathed runner accounting on pitching changes

### 6.3 Run attribution behavior

When runners score through hit/out/walk/error/baserunning advancement:
- `trackerAdvanceRunner(..., 'HOME')` emits scored events
- `processTrackerScoredEvents(...)` increments `runsAllowed`
- it also increments `earnedRuns` only when the tracker marks the run as earned

This means:
- hit/walk/out-run scoring is not simply charged to the pitcher currently on the mound
- responsible-pitcher attribution is tracker-based

### 6.4 Pitching change behavior

On `changePitcher(...)`:
- outgoing pitcher exit info is written into pitcher stats
- bequeathed runners are counted from active tracker runners
- entering pitcher gets `entryInning`, `entryOuts`, and `inheritedRunners`
- `trackerHandlePitchingChange(...)` marks active runners as inherited by the new pitcher while preserving the responsible pitcher for earned-run charging

## 7. At-Bat Recording Logic in `useGameState`

### 7.1 Hits

`recordHit(hitType, rbi, runnerData?, pitchCount=1)`:
- increments at-bat sequence
- determines batting and pitching team IDs
- calculates runs scored from batter HR and runner advancement
- updates runner tracker first
- creates an `AtBatEvent`
- calculates leverage index from current base/out state
- calculates WPA from before/after situation
- sets `isWalkOff` for bottom-9+ lead-taking home-team hits
- sets `isClutch` when LI >= 1.5
- attaches optional context snapshot/enrichment
- writes the event immediately via `logAtBatEvent`
- updates batter batting stats
- updates current pitcher hits/pitch count/batters faced/HR streak stats
- attributes runs/ER via tracker scored events
- updates scoreboard runs/hits/line score
- updates boolean bases and score
- advances to next batter

Specific hit handling:
- `GRD` is treated like a double for batting stats and base placement
- `HR` adds batter as runner then advances batter to HOME through tracker

### 7.2 Outs

`recordOut(outType, runnerData?, pitchCount=1, options?)`:
- increments at-bat sequence
- increments half-inning strikeout count when out is `K` or `Kc`
- calculates outs on play:
  - `DP` => 2 outs
  - `TP` => 3 outs
  - `FC` => outs come from runnerData or default 1 runner out
  - otherwise batter is out plus any specified runner outs
- updates runner tracker first
- for `FC`, adds batter as runner to first
- auto-corrects `FO -> SF` when R3 scores with <2 outs
- does not auto-convert GO to DP; the comment says that was intentionally removed in favor of UI prompting
- invalidates runs on third-out force/batter-runner-out-before-first via `shouldInvalidateRunsOnThirdOut(...)`
- also accepts a page-level override `forceNoRuns`
- calculates RBI after correction/invalidation rules
- writes `AtBatEvent`
- updates batter and pitcher game stats
- attributes runs via tracker only if runs were not invalidated
- updates scoreboard if a run scored
- updates boolean bases/outs/score
- auto-triggers `endInningRef.current()` after a 500ms delay when outs reach 3
- otherwise advances to next batter

Batting-stat handling for outs:
- `SF` increments `sf` and does not count as AB
- `SAC` increments `sh` and does not count as AB
- `DP` increments batter `gidp`
- `K`, `Kc`, `D3K` increment batter strikeouts and pitcher strikeouts

### 7.3 Walks / HBP / IBB

`recordWalk(walkType, pitchCount=4)`:
- increments at-bat sequence
- detects bases-loaded walk
- force-advances runners in tracker
- adds batter to first
- calculates leverage and WPA
- sets `isWalkOff` for bases-loaded walk-off conditions
- writes `AtBatEvent`
- updates batter stats:
  - `HBP` increments `hbp`
  - `BB` and `IBB` both increment `bb`
  - bases-loaded walk increments RBI
- updates pitcher stats:
  - `HBP` increments `hitByPitch`
  - `IBB` increments `intentionalWalks`
  - `BB` increments `walksAllowed`
  - bases-loaded walk increments `basesLoadedWalks`
- updates scoreboard only for runs, not hits
- updates boolean bases with force-advance logic
- advances to next batter

### 7.4 Dropped third strike

`recordD3K(batterReached, pitchCount=3)`:
- always increments half-inning strikeout count
- always records result as `K`
- always increments batter strikeout and pitcher strikeout
- if `batterReached=true`:
  - no out is added
  - batter is added to first in tracker and boolean bases
- if `batterReached=false`:
  - an out is recorded
- event is written as an at-bat event, not a between-play event

Important implementation detail:
- when batter reaches on D3K, tracker adds batter with `howReached: 'error'`

### 7.5 Reach on error

`recordError(rbi=0, runnerData?, pitchCount=1)`:
- increments at-bat sequence
- creates an at-bat event with result `E`
- adds batter to first in tracker with `howReached: 'error'`
- updates batter stats as PA + AB, not hit
- explicitly does not credit RBI on ROE
- updates pitcher stats with BF/pitch count only; run/ER credit is tracker-based
- increments the fielding team’s error total in the scoreboard
- updates bases/score
- advances to next batter

Important current truth:
- the function signature accepts an `rbi` argument for backward compatibility, but the implementation ignores it for batter RBI credit.
- the function itself always places the batter on first base in the hook/tracker path.

## 8. Non-At-Bat Event Logic in `useGameState`

### 8.1 `recordEvent(eventType, runnerId?)`

This is the hook’s generic handler for:
- `SB`
- `CS`
- `WP`
- `PB`
- `PICK`
- `PICK_SAFE`
- `PICK_E`
- `TOOTBLAN`
- `WEB_GEM`
- `ROBBERY`
- `KILLED`
- `NUTSHOT`
- `BEAT_THROW`
- `BUNT`
- `STRIKEOUT`
- `STRIKEOUT_LOOKING`
- `DROPPED_3RD_STRIKE`
- `SEVEN_PLUS_PITCH_AB`

What it actually does live:
- calculates base-out leverage index
- converts leverage to Fame multiplier `sqrt(LI)`
- awards hook-level Fame for certain event types
- increments batter `sb` or `cs` when called with `runnerId`
- increments current pitcher `wildPitches` for `WP`

What it explicitly does not do:
- it does not normally persist a `BetweenPlayEvent`
- it ends with `// TODO: Log to separate event store`

### 8.2 Consequence

The codebase has a formal `BETWEEN_PLAY_EVENTS` store and interface, but the live `recordEvent()` path does not close that loop for most runner events, pickoffs, substitutions, mojo/fitness changes, or manager moments.

## 9. Individual Runner Movement APIs

### 9.1 `advanceRunner(from, to, outcome)`

Used by page-level runner popovers.

It:
- updates runner tracker
- attributes scored runs through tracker
- updates boolean bases/outs/score
- updates scoreboard runs if a runner scored
- auto-ends inning if a baserunning out became the third out

### 9.2 `advanceRunnersBatch(movements)`

Used for multi-runner SB/CS/WP/PB style actions.

It:
- sorts movements third -> second -> first
- updates tracker atomically
- attributes runs through tracker
- updates boolean bases/outs/score in one state update
- updates scoreboard runs
- auto-ends inning if runner outs produce the third out

## 10. Count Logic

`advanceCount(type)`:
- `ball` increments balls up to 3
- `strike` increments strikes up to 2
- `foul` also increments strikes up to 2

`resetCount()` sets balls/strikes to zero.

Important truth:
- the count UI logic exists, but most live play-entry flows do not build pitch-by-pitch history. The current system is primarily result-entry, not pitch-sequence-entry.

## 11. Pitch Count Tracking

Pitch count exists in three places:
- pitcher game stats `pitchCount`
- `inningPitchesRef` for current half-inning strikeout/pitch tracking
- pitch-count prompt UI state

Pitch count prompts are triggered for:
- pitching changes
- end of half-inning
- end of game

Behavior:
- pitching changes and end-game prompts are treated as required by the modal component, but the hook’s `dismissPitchCountPrompt()` still allows cancellation behavior depending on prompt type
- end-inning prompt can be skipped and still proceeds with inning transition
- `confirmPitchCount(...)` can create an immaculate-inning Fame event in the hook if:
  - prompt type is `end_inning`
  - final count is exactly 9
  - tracked strikeouts for that half-inning equal 3

Important live workaround:
- `GameTracker.tsx` calls `hookEndGame()`, and `useGameState.endGame()` immediately calls `completeGameInternal(...)` after showing the prompt because navigation would otherwise unmount before the prompt completes.
- So end-game completion is not truly gated by final pitch-count confirmation in the live page flow.

## 12. Inning Logic

### 12.1 `endInning()`

`endInning()` does not immediately flip innings.
It opens a pitch-count prompt for the current pitcher and stores `executeEndInning()` as the pending action.

### 12.2 `executeEndInning()`

It:
- ensures a scoreless completed half-inning still gets a `0` in the scoreboard line score
- auto-detects regulation-ending conditions before flipping halves:
  - after top of final regulation inning or later, if home already leads, game should end
  - after bottom of final regulation inning or later, if game is not tied, game should end
  - tied final regulation inning proceeds to extras
- records position innings for the fielding team
- clears runner tracker bases and advances tracker inning
- flips half-inning and maybe inning number
- selects the next batter from the proper lineup using the stored batter index
- switches current pitcher to the correct defensive side’s current pitcher
- resets count and boolean bases
- resets `inningPitchesRef` for the new pitcher

## 13. Substitutions and Lineup Logic

### 13.1 Lineup model

The hook stores both:
- static-ish lineup refs (`awayLineupRef`, `homeLineupRef`)
- richer lineup state refs with:
  - active lineup
  - bench availability
  - used players
  - current pitcher

### 13.2 `makeSubstitution(...)`

Behavior:
- determines away/home side by outgoing player lookup
- validates against `LineupState` when bench/used-player info exists
- logs substitution into `substitutionLog`
- updates lineup refs and lineup state
- preserves batting order spot
- marks outgoing player as used so they cannot re-enter
- optionally updates current batter if substitution replaces the active batter or is pinch-hit
- initializes new player stats if absent
- for pinch runners, directly swaps runner identity in the runner tracker and increments `runnerIdentityVersion`

### 13.3 `switchPositions(...)`

Behavior:
- updates lineup refs only
- appends a `position_switch` substitution log entry

### 13.4 `changePitcher(...)`

Behavior:
- opens required pitch-count prompt for exiting pitcher
- once confirmed/pending action executes:
  - logs pitching change into `substitutionLog`
  - writes outgoing pitcher exit metadata and bequeathed runner count
  - initializes incoming pitcher stats with entry context and inherited runner count if new
  - updates pitcher-name map
  - updates runner tracker for inherited-runner ownership
  - updates `gameState.currentPitcherId/currentPitcherName`
  - updates the pitching side’s `LineupState.currentPitcher`
  - marks exiting pitcher as used in lineup state

### 13.5 Page-level roster mirroring

`GameTracker.tsx` separately mutates `awayTeamPlayers` / `homeTeamPlayers` when substitutions happen so the rendered lineup/bench/field positions update.

This means substitutions currently have two mutation layers:
- hook lineup refs/state
- page-local roster arrays

## 14. Undo System

Undo is page-owned, not hook-owned.

`GameTracker.tsx` captures snapshots before many actions, including:
- QuickBar outcomes
- enhanced field completed plays
- runner popover actions
- substitutions

The stored undo snapshot contains:
- `gameState`
- `scoreboard`
- serialized `playerStats` map entries
- serialized `pitcherStats` map entries
- serialized runner-tracker snapshot

`restoreState(...)` in `useGameState` restores those back into React state/refs.

Important limitation:
- undo restores live React state and runner tracker
- undo does not remove already-written IndexedDB rows from `AT_BAT_EVENTS` / `FIELDING_EVENTS`

So undo is stateful, not ledger-reversing.

## 15. The Two Live Play-Entry Surfaces

### 15.1 QuickBar is the primary live scoring surface

`QuickBar` in the bottom-left zone calls `handleQuickBarOutcome(outcome)`.

That handler:
- snapshots current bases/outs
- builds a minimal play description
- uses `calculateRunnerDefaults(...)`
- converts defaults to `RunnerAdvancement`
- calculates RBI by counting default runners scoring
- captures undo
- routes to hook record functions
- appends structured play-log entries
- updates page-local `runnerNames`

It also launches prompts for:
- HR distance/pitch type
- ROE base/fielder/type flow
- sac-fly disambiguation
- GO vs DP disambiguation
- infield-fly-rule prompt

### 15.2 Enhanced field is mounted in reduced mode

`GameTracker.tsx` mounts:
- `EnhancedInteractiveField`
- with `hideActionSelector={true}`

Inside `EnhancedInteractiveField`, this means:
- `legacyFieldFlowEnabled = !hideActionSelector` becomes `false`
- the left foul-zone `ActionSelector` is hidden
- the component resets its field-flow state whenever legacy flow is disabled

Practical consequence in the live page:
- the full field-first action-selection flow exists in the component
- but the current page does not expose that flow
- the live field is still used for:
  - runner drag/drop and runner tap popovers
  - fielder taps/popovers
  - `onPlayComplete` from other internal triggers
  - `onSpecialEvent`
  - field tap for enrichment location

### 15.3 Enhanced field latent logic still exists

The component itself implements a much larger 5-step flow:
- `IDLE`
- `HIT_LOCATION`
- `OUT_FIELDING`
- `HIT_OUTCOME`
- `OUT_OUTCOME`
- `RUNNER_CONFIRM`
- `END_CONFIRM` (declared but not the main driver now)

It also implements:
- batter-reached popup flow
- error attribution flow
- runner outcome adjustment
- special-event prompts
- modifier prompts (`KP`, `NUT`, `WG`, `ROB`, `7+`, `BT`, `BUNT`, `TOOTBLAN`)
- star-play subtype selection
- injury/mojo prompt flows

But because the current page hides the action selector, that full interaction model is latent rather than the primary live page path.

### 15.4 Dormant legacy manual-entry block still exists in the file

`GameTracker.tsx` still contains an older manual expandable-panel outcome-entry system:
- pending manual hit/out/walk selection
- manual RBI adjustment
- manual record/cancel buttons
- legacy event panels
- a manual `handleEndInning` wrapper

Current truth:
- that block is wrapped in `false && (...)`
- the related handlers still exist in the file
- they are not part of the live rendered GameTracker
- they should be treated as dormant code, not current live functionality

## 16. Enhanced Field Completion Path in `GameTracker.tsx`

`handleEnhancedPlayComplete(playData)` does all of the following:
- clears stale error-on-advance modal state
- detects thrown-out runners and may open `FielderCreditModal`
- tries to auto-infer fielder credits from fielding sequence
- detects extra runner advancement beyond expected hit advancement and may open `ErrorOnAdvanceModal` after play recording
- calculates RBI from explicit `runnerOutcomes`
- captures undo
- converts `runnerOutcomes` to `RunnerAdvancement`
- injects enrichment into the next at-bat event
- routes to `recordHit`, `recordOut`, `recordWalk`, `recordError`, or `recordD3K`
- appends structured play-log entry
- extracts fielding events via `extractFieldingEvents(...)` and writes them with `logFieldingEvent(...)`
- updates page-local `runnerNames`
- runs Fame hook auto-detection based on current player stats
- runs detection integration for additional prompt/auto Fame events
- runs mWAR decision recording/resolution logic
- may open error-on-advance modal after recording

Important truth:
- this path duplicates logic also present in the QuickBar path rather than sharing a single normalized play-commit helper

## 17. QuickBar-Specific Functional Truths

### 17.1 QuickBar defaulting model

QuickBar depends heavily on `calculateRunnerDefaults(...)`.

It records what the defaults imply, unless a prompt intercedes.

### 17.2 QuickBar error flow gap

The QuickBar error prompt lets the user pick batter reached base `1B`, `2B`, or `3B`.

However, the actual hook call is `recordError(...)`, and the hook implementation always adds the batter to first base.

So the current live behavior is:
- UI can ask for `2B` or `3B`
- page-local log/runner-name updates can reflect that choice
- hook/game-state persistence still treats ROE as batter to first

### 17.3 QuickBar runs-scored simplification

QuickBar structured play-log entries use:
- `runsScored: rbi`

That is not a full independent run-count calculation.
It is a page-log simplification, not the canonical hook scoreboard/stat calculation.

## 18. Runner/Fielder Popover Logic

### 18.1 Runner popover actions

From runner taps:
- steal
- advance
- wild pitch
- passed ball
- pickoff (`safe`, `out`, `error`)
- substitute (opens lineup overlay hint)
- player card

Underlying behavior:
- steal/advance/WP/PB/pickoff mostly use `advanceRunner(...)`
- then optionally call `recordEvent(...)`

Important gaps:
- `recordEvent('SB')` and `recordEvent('CS')` are called without a runner ID in these page handlers
- hook-level stat attribution for SB/CS only increments when a runner ID is supplied
- between-play persistence still is not written

### 18.2 Fielder popover actions

From fielder taps:
- substitution
- pinch hit
- move position
- player card

These route into page substitution handlers, then into hook substitution logic.

## 19. Fielding Tracking Logic

### 19.1 Live fielding persistence path

The current live fielding counting path is:

1. play is completed in the page
2. `extractFieldingEvents(playData, context)` is called
3. returned `FieldingEvent[]` are written to IndexedDB via `logFieldingEvent(...)`
4. at end game, `useGameState.completeGameInternal()` and `useGameState.endGame()` both query `getGameFieldingEvents(gameId)`
5. those position-based fielding events are resolved back to player IDs using lineup position + team ID
6. resulting per-player putouts/assists/errors are attached to `playerStatsRecord`
7. season aggregation then adds those fielding totals into season fielding rows

### 19.2 What `extractFieldingEvents(...)` actually records

It records nothing for:
- walks
- foul balls
- home runs
- hits that do not create outs

It records:
- error event for `playData.type === 'error'`
- putout for foul outs
- for strikeouts:
  - no fielding event normally
  - D3K with catcher sequence can create catcher assist + first-base putout
- for DP:
  - first fielder assist
  - middle fielders `double_play_pivot`
  - last fielder putout
- for TP:
  - assists for all but last
  - putout for last
- for SF:
  - putout for catcher of the ball
  - assists for throw sequence before that, if any
- for FC:
  - assists then putout based on fielding sequence
- for standard outs:
  - one fielder => unassisted putout
  - multiple fielders => assists then putout
  - first outfielder in multi-fielder out can be upgraded to `outfield_assist`

### 19.3 Fielding identity resolution limitation

Persisted fielding events use position-based IDs:
- `playerId` is effectively the position label at extraction time

Resolution back to actual players happens only later using:
- `position + teamId`
- current lineup refs at game end

This means fielding credit is fragile if:
- position ownership changed during the game
- the current end-game lineup no longer reflects who occupied that position on the play

### 19.4 Fielder credit modal is not a fully closed loop

`FielderCreditModal` can collect manual runner-out credit information, but:
- page comments explicitly say those credits are not yet integrated into player stats
- the current continuation path logs fielding events through the general extractor again
- credit capture is therefore partly informational/logical scaffolding, not a full canonical attribution pipeline

## 20. Event Log Ledger Behavior

### 20.1 `AT_BAT_EVENTS`

Live hook writes one row per at-bat result with:
- before and after score/base/out state
- result/RBI/runs
- leverage and WPA
- optional context snapshot
- optional enrichment
- empty `fameEvents` array in current hook-created rows

### 20.2 `FIELDING_EVENTS`

Live page writes these after enhanced plays and related paths.

### 20.3 `BETWEEN_PLAY_EVENTS`

This store exists with formal interfaces for:
- SB/CS/pickoff
- WP/PB
- substitutions
- pitcher changes
- mojo/fitness changes
- pitch count updates
- manager moments

Current truth:
- the GameTracker currently does not normally populate this store

### 20.4 `PITCHING_APPEARANCES`

The ledger and interface exist, but the current `useGameState` path does not log pitching appearances through `logPitchingAppearance(...)`.

### 20.5 Data-integrity support

`eventLog.ts` supports:
- `getUnaggregatedGames`
- `checkDataIntegrity`
- `verifyGameIntegrity`

But the current GameTracker page does not itself run a startup repair sweep.

## 21. Completed Game Processing

### 21.1 `useGameState.endGame(...)`

This path:
- builds a persisted state from live hook maps
- queries fielding events and resolves them to player tallies
- archives the game immediately with `archiveCompletedGame(...)`
- opens an end-game pitch count prompt
- sets pending action to `completeGameInternal(...)`
- then immediately calls `completeGameInternal(...)` anyway to survive navigation

### 21.2 `completeGameInternal(...)`

This path:
- marks the game complete in `eventLog`
- rebuilds fielding tallies again from `FIELDING_EVENTS`
- marks current pitcher as `finishedGame`
- calculates pitcher decisions with `calculatePitcherDecisions(...)`
- builds a `PersistedGameState`
- checks `GameHeader.aggregated`
- if not already aggregated:
  - calls `processCompletedGame(...)`
  - marks header aggregated
- handles playoff series update logic
- aggregates playoff stats when relevant
- archives completed game again when not already aggregated
- clears `currentGame`

### 21.3 Important current truth

The live end-game path currently writes the completed-game archive twice in the common first-run path:
- once in `endGame(...)`
- again in `completeGameInternal(...)` when header is not yet marked aggregated

Because the archive store uses `put`, this is effectively an overwrite/idempotent double write, not two distinct rows.

## 22. Season Aggregation That Actually Runs

At game end, the live GameTracker does run `processCompletedGame(...)`, which calls `aggregateGameToSeason(...)`.

That aggregation does:
- batting totals
- pitching totals
- fielding totals
- Fame totals
- season game count increment
- milestone aggregation

### 22.1 Batting season aggregation

Aggregated fields include:
- games
- PA/AB/H and hit breakdown
- HR/RBI/R
- BB/K/HBP
- SF/SH
- SB/CS
- GIDP
- D3K outcomes if present

### 22.2 Pitching season aggregation

Aggregated fields include:
- games and games started
- outs/IP components
- H/R/ER/BB/K/HR/HBP/WP
- quality starts, CG, shutouts, no-hitters, perfect games
- decisions: W/L/SV/H/BS
- comebacker injuries if present

### 22.3 Fielding season aggregation

Aggregated fields include:
- games
- putouts
- assists
- errors
- diving catches
- robberies
- nutshots

Current truth:
- the live GameTracker fielding path reliably populates putouts/assists/errors
- diving catches/robberies/nutshots depend on higher-level paths and are not part of the same canonical extraction loop

### 22.4 Fame season aggregation

`aggregateFameEvents(...)` groups Fame by player and then updates batting season rows:
- `fameBonuses`
- `fameBoners`
- `fameNet`

Important truth:
- season Fame aggregation writes into batting season stats, not pitching season rows
- it uses placeholder name/team fallback in that aggregation helper

## 23. Pitcher Decisions

`calculatePitcherDecisions(...)` in `useGameState` is real and async.

It determines:
- winning pitcher
- losing pitcher
- save
- non-decisions

Logic highlights:
- teams are inferred from pitcher ID prefix: `away-...` means away; anything else falls back to home
- losing pitcher tries to use event log lead-change analysis first
- winning pitcher favors qualified starter if eligible, else best reliever by outs
- save uses common save heuristics

What is not visible in the page:
- this is hook-level logic executed at game end, not a page-only display computation

## 24. Leverage Index, WPA, Clutch

### 24.1 Live at-bat leverage and WPA

For hits, outs, walks, errors, and D3K:
- `useGameState` calculates leverage index from the before state
- it calculates WPA from before and after state
- it persists `leverageIndex`, `winProbabilityBefore`, `winProbabilityAfter`, and `wpa` into the at-bat event

### 24.2 `isClutch`

The hook marks an at-bat event `isClutch` when:
- leverage index >= 1.5

### 24.3 What is not currently true

There is no live canonical `netClutch` accumulation path in the current GameTracker flow.

Clutch-related signals exist:
- LI on events
- WPA on events
- mWAR `clutchImpact` on manager decisions

But there is not a live page or end-game accumulator that writes a canonical per-player `netClutch` stat in the GameTracker path.

## 25. Fame: Two Different Live Pipelines

### 25.1 Hook-level Fame (`useGameState`)

The hook maintains a local `fameEvents` array used in:
- autosave snapshot
- end-game persisted state
- season Fame aggregation

It is populated by:
- `recordEvent(...)`
- immaculate inning detection in `confirmPitchCount(...)`

### 25.2 Page-level Fame hook (`useFameTracking`)

`GameTracker.tsx` also mounts `useFameTracking`, which:
- maintains its own tracker state
- shows popup notifications
- records manual or auto-detected Fame events for the UI
- prevents duplicate milestone popup recording per player using `recordedMilestones`

It is populated by:
- batter multi-hit/multi-HR/RBI/strikeout-shame checks
- pitcher K/meltdown checks
- detection prompts and auto-detected events
- end-game complete-game/no-hitter/perfect-game/Maddux/shutout events

### 25.3 Important truth

These two Fame systems are not unified.

Current consequences:
- some visible Fame popups come from `useFameTracking`
- the end-game persistence/season aggregation path uses `useGameState.fameEvents`
- `AtBatEvent.fameEvents` written by `useGameState` are currently empty arrays on normal at-bat writes

## 26. mWAR / Manager Logic

### 26.1 What is live

`GameTracker.tsx` mounts `useMWARCalculations()` and:
- initializes game mWAR with `homeManagerId`
- initializes season mWAR with `homeManagerId` and `homeTeamId`
- records decisions for:
  - pitching changes
  - inferred pinch hitters / defensive subs
  - intentional walks
  - manager moment calls
- resolves those decisions after the next play based on simple success/failure heuristics
- checks for manager moments after plays
- persists all recorded decisions at game end with `saveGameDecisions(...)`
- aggregates manager decisions to manager season stats with `aggregateManagerGameToSeason(...)`

### 26.2 Important ownership truth

The hook instance is initialized only for the home manager/team in the current page code.

So although decisions can be recorded during both teams’ behavior, the live storage/season aggregation path is anchored to:
- `homeManagerId`
- `homeTeamId`

That makes away-side manager attribution structurally suspect in the current path.

### 26.3 Manager moment behavior

Manager moment is a live page feature:
- `mwarHook.checkForManagerMoment(...)` can trigger `managerMoment.isTriggered`
- QuickBar displays the indicator
- user can open a small call/skip panel
- calling it records a decision immediately and sets it pending for next-play resolution

### 26.4 Persistence truth

Manager decisions are persisted in a separate `kbl-manager` IndexedDB database, not in `gameStorage` or `eventLog`.

## 27. WAR Component Status

### 27.1 What exists in the repo

The repo contains calculators/orchestrators for:
- bWAR
- pWAR
- fWAR
- rWAR
- mWAR

### 27.2 What the live GameTracker actually runs

Live current GameTracker path:
- does run live fielding-event persistence needed for future fWAR inputs
- does run season batting/pitching/fielding aggregation
- does run mWAR page-side recording and end-game persistence
- does not call `calculateAndPersistSeasonWAR(...)`

Call-site verification:
- `calculateAndPersistSeasonWAR(...)` exists in `src/src_figma/app/engines/warOrchestrator.ts`
- there are no live call sites under `src`

### 27.3 Practical consequence

Current GameTracker supports accumulation of many counting stats needed for WAR, but the live page’s end-game pipeline does not currently recompute and persist the season bWAR/pWAR/fWAR/rWAR totals through the WAR orchestrator.

### 27.4 mWAR differs from other WAR components

mWAR is live in a more direct sense because:
- decisions are recorded during the game
- decisions are saved at end game
- manager season stats are recalculated and persisted

But it still has the manager-identity limitation described above.

## 28. Mojo / Fitness / Player-State Logic

### 28.1 What is live

`GameTracker.tsx` mounts `usePlayerState(...)`.

It:
- registers players after game initialization
- can load mojo/fitness snapshots for elimination mode
- exposes manual getters/setters by player name/team
- passes current mojo/fitness into batter/pitcher display cards
- allows manual editing from player-card modal
- can save mojo/fitness snapshots at game end in elimination mode

### 28.2 What is not live

Automatic mojo-updating from play outcomes is currently commented out in `GameTracker.tsx`.

The page explicitly says:
- mojo should only change via manual user input through PlayerCard

`usePlayerState` supports:
- `updateMojo`
- `updateFitness`
- recovery logic
- adjusted-stat calculations

But the current GameTracker path mostly uses:
- `registerPlayer`
- `getPlayer`
- `setMojo`
- `setFitness`
- `getAllPlayers` at elimination end-game snapshot time

### 28.3 Player card truth

The player card modal shows placeholder season/game stat panels.
The code comments explicitly say these are not wired to real current stats yet.

So:
- mojo/fitness editing is real
- player stat panels in the modal are not real current-stat views

## 29. Fan Morale

`GameTracker.tsx` mounts one `useFanMorale(teamId)` hook per team.

### 29.1 What the hook actually is

Despite the header comment saying it is stubbed, the file exports a simplified working hook that:
- stores a local `FanMorale` object in React state
- derives display/risk/trade-scrutiny/FA-attractiveness values
- can initialize morale
- can process a game result
- does not persist to a durable franchise store from this hook itself

### 29.2 What the page actually does with it

At game end, for non-exhibition modes, the page:
- computes home/away result objects
- detects rivalry, blowout, shutout, no-hitter, walk-off
- calls `processGameResult(...)` on both team hooks

### 29.3 Current truth

This is local hook state updated at game end.

There is no verified current GameTracker code path here that persists fan morale to a durable franchise record from the hook itself.

## 30. Relationships and Player Morale Effects

Relationship systems exist in the repo:
- `useRelationshipData.ts`
- relationship storage/engines
- player morale utilities

Current GameTracker truth:
- `GameTracker.tsx` does not import or use `useRelationshipData`
- no relationship or player-morale effect pipeline is part of the live GameTracker loop
- no relationship-based modifier is applied during live play recording or end-game processing in the current page path

So these are repo-present but GameTracker-inactive systems.

## 31. Milestones

Milestone handling exists in the season aggregation pipeline.

Current live truth:
- `aggregateGameToSeason(...)` calls `aggregateGameWithMilestones(...)` when `detectMilestones` is enabled
- `useGameState.completeGameInternal(...)` uses `processCompletedGame(...)`, which calls that season aggregation

Therefore milestone detection is part of the live end-game processing path.

Separate page-level end-game Fame awards for:
- complete game
- shutout
- no-hitter
- perfect game
- Maddux

are not the same thing as the season/career milestone aggregator.

## 32. Narrative Generation

At game end, the page generates:
- home-team recap via `generateGameRecap(...)`
- away-team recap via `generateGameRecap(...)`

Those recaps are:
- page-level side effects
- passed through navigation state to the post-game page
- not part of `useGameState` or `eventLog` canonical baseball state

## 33. Schedule / Playoff / Elimination Side Effects

### 33.1 Franchise/playoff schedule completion

If `scheduleGameId` exists and mode is `franchise` or `playoff`, `GameTracker.tsx` calls `completeScheduleGame(...)` after hook end-game completion.

### 33.2 Playoff series updates

`completeGameInternal(...)`:
- records playoff series game result if playoff context exists
- can eliminate teams
- can complete playoff
- can create next-round series
- can update elimination manager state when linked

### 33.3 Elimination mojo/fitness snapshots

At end game in elimination mode, `GameTracker.tsx` saves all registered player mojo/fitness states via `saveMojoFitnessSnapshots(...)`.

## 34. Structured Play Log and Enrichment

The page maintains a separate `playLogEntries` array that is not the same thing as the event log.

It is a UI-side structured log used for:
- displaying the right-panel play log
- locating entries needing enrichment
- opening the enrichment panel
- toggling K/Kc post hoc

### 34.1 Enrichment writes

`handleEnrichmentUpdate(...)` writes to `AT_BAT_EVENTS` via `updateAtBatEvent(...)`.

Fields supported:
- `fieldLocation`
- `fieldingSequence`
- `pitchType`
- `pitchesInAtBat`

It also:
- updates local cache
- updates local play-log flags
- marks `isQualityAtBat` true when pitches in at-bat >= 7

### 34.2 K/Kc toggle

The play log can toggle an existing at-bat event’s `result` between `K` and `Kc` post hoc and append edit history.

## 35. What Is Canonical vs What Is Approximate

### 35.1 Most canonical current baseball truth

In descending order:
- hook state + runner tracker in `useGameState`
- persisted `AT_BAT_EVENTS`
- persisted `FIELDING_EVENTS`
- autosaved `currentGame` snapshot
- page-local `playLogEntries`
- page-local `runnerNames`

### 35.2 Known approximate / sidecar / non-canonical layers

- `runnerNames` in the page are synced from the tracker, but many handlers still manually update them too
- QuickBar structured play-log run totals simplify `runsScored` as `rbi`
- player-card displayed stats are placeholders
- fielding identity resolution happens later and can drift from original play reality
- page-level `useFameTracking` popup state is not the same ledger as hook-level Fame persistence

## 36. Current Functional Gaps and Divergences

These are code-verified current-state truths, not future recommendations:

1. QuickBar ROE base choice is not honored by hook persistence.
The prompt supports batter to `1B`/`2B`/`3B`, but `recordError()` always puts the batter on first in the core hook path.

2. `recordEvent()` does not generally write `BETWEEN_PLAY_EVENTS`.
The formal store exists, but the current live hook path ends with a TODO.

3. Runner-event actor attribution is incomplete.
Page handlers often call `recordEvent('SB')`, `recordEvent('CS')`, etc. without runner IDs, so player stat attribution can be missed.

4. Undo is not ledger-aware.
It restores state, not IndexedDB event rows.

5. Fame is split between hook and page.
The visible popup/auto-detection system and the persisted aggregation system are not one unified pipeline.

6. WAR recalculation orchestrator is not live.
Counting stats are aggregated, but the dedicated season WAR recomputation function is unused by the current GameTracker.

7. mWAR initialization is home-manager-centric.
The live page initializes the hook for the home manager/team only.

8. Fan morale is local game-end hook state, not a verified durable franchise pipeline here.

9. Relationship/player-morale systems are not in the live GameTracker execution path.

10. Player-card stat panels are placeholders even though mojo/fitness editing is real.

11. Pitching appearances ledger exists but is not part of the live hook write path.

12. Fielding credit is real but position-based until end-game resolution.

## 37. Functional Status by Subsystem

### Fully live in the current GameTracker path
- inning/half/outs/bases/score state
- batter order progression
- hits/outs/walks/HBP/IBB/D3K/ROE recording
- scoreboard R/H/E maintenance
- runner identity tracking
- inherited-runner / responsible-pitcher run attribution
- autosave + reload of in-progress game
- fielding-event persistence for plays routed through page extraction
- season batting/pitching/fielding/fame aggregation at game end
- milestone aggregation at game end
- pitcher decision calculation at game end
- playoff/schedule side effects when context exists

### Live but split or partially fragile
- QuickBar vs enhanced-field play orchestration
- Fame
- fielder credit attribution
- mWAR
- pitch-count completion flow
- runner event attribution
- end-game archiving/idempotency

### Exists but not truly live in current GameTracker
- dedicated `BETWEEN_PLAY_EVENTS` pipeline
- WAR orchestrator recalculation
- relationship effects
- player morale effects from relationships
- automatic mojo changes from gameplay
- durable fan-morale franchise persistence via this GameTracker path
- player-card real stat display

## 38. Bottom-Line Definition

The current GameTracker is best described as:

"A hybrid result-entry baseball state engine with strong inning/base/score/stat tracking, real runner-identity and responsible-pitcher logic, real end-game season aggregation, page-level duplication between two play-entry shells, a real but fragile fielding sidecar, a split Fame system, a partially live manager system, local mojo/fitness editing, local end-game fan-morale effects, and several deeper meta systems present in the repo but not yet canonical in the live GameTracker path."

That is the current functionality baseline to cut from, preserve, or consolidate before UI/UX redesign.
