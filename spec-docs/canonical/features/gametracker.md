# GameTracker -- Canonical Spec
Generated: 2026-02-08 by codebase-reverse-engineer (Mode B)
Feature boundary: 35+ files (see Appendix)
Overall review status: UNREVIEWED

---

## 1. Data Model
Review status: UNREVIEWED

### Types Used

**Core State (from useGameState.ts lines 30-230):**
- `GameState` -- inning, isTop, outs, balls, strikes, bases{first,second,third:boolean}, scores, team IDs/names, current batter/pitcher IDs/names
- `ScoreboardState` -- innings[]{away,home}, away/home{runs,hits,errors}
- `PlayerGameStats` -- 14 fields: pa, ab, h, singles, doubles, triples, hr, rbi, r, bb, hbp, k, sb, cs
- `PitcherGameStats` -- 29 fields including MAJ-07/MAJ-08: outsRecorded, hitsAllowed, runsAllowed, earnedRuns, walksAllowed, intentionalWalks, hitByPitch, strikeoutsThrown, homeRunsAllowed, pitchCount, battersFaced, wildPitches, consecutiveHRsAllowed, firstInningRuns, basesLoadedWalks, isStarter, entryInning/Outs, exitInning/Outs, bequeathed/inheritedRunners, inheritedRunnersScored, finishedGame, decision(W/L/SV/H/BS/null)
- `FameEventRecord` -- eventType, fameType(bonus/boner), fameValue, playerId, playerName, description
- `PitchCountPromptState` -- type(pitching_change/end_inning/end_game), pitcherId, pitcherName, currentCount, lastVerifiedInning

**Runner Tracker (from inheritedRunnerTracker.ts lines 1-78):**
- `TrackedRunner` -- runnerId, runnerName, currentBase, startingBase, howReached, responsiblePitcherId/Name, isInherited, inheritedFromPitcherId, inningReached, atBatReached
- `RunnerTrackingState` -- runners[], currentPitcherId/Name, pitcherStats Map, inning, atBatNumber
- `RunnerScoredEvent` -- runner, wasEarnedRun, chargedToPitcherId/Name, wasInherited

**Event Log (from eventLog.ts lines 100-280):**
- `GameHeader` -- gameId, seasonId, date, teams, finalScore, isComplete, aggregated, eventCount, checksum
- `AtBatEvent` -- 45+ fields: full situational context before/after, leverageIndex, wpa, ballInPlay, fameEvents, isLeadoff/isClutch/isWalkOff
- `PitchingAppearance` -- Full entry/exit with inherited/bequeathed runner tracking

**Persistence (from gameStorage.ts lines 83-180):**
- `PersistedGameState` -- Complete game snapshot including playerStats Record, pitcherGameStats Array, fameEvents Array, fame detection state
- `CompletedGameRecord` -- Archived game with finalScore, full stats (EXH-011)

### State Shape

The GameTracker manages state across multiple layers:

| Layer | Storage | Persistence | Purpose |
|-------|---------|-------------|---------|
| `gameState` | React useState | Ephemeral (until endGame) | Current game situation |
| `scoreboard` | React useState | Ephemeral | Box score display |
| `playerStats` | React useState Map | Ephemeral -> aggregated at endGame | Batter stats |
| `pitcherStats` | React useState Map | Ephemeral -> aggregated at endGame | Pitcher stats |
| `fameEvents` | React useState Array | Ephemeral -> persisted at endGame | Fame tracking |
| `runnerTrackerRef` | React useRef | Ephemeral (shadow state) | ER attribution |
| `atBatEvents` | IndexedDB (kbl-event-log) | Permanent, immediate write | Event sourcing |
| `gameHeaders` | IndexedDB (kbl-event-log) | Permanent | Game metadata |
| `completedGames` | IndexedDB (kbl-tracker) | Permanent | Post-game display |
| `seasonStats` | IndexedDB (season aggregator) | Permanent, written at endGame | Season totals |

**Dual Database Architecture:**
1. **kbl-event-log** (eventLog.ts) -- Append-only event log, immediate writes, source of truth
2. **kbl-tracker** (gameStorage.ts) -- Mutable game state for persistence/display

---

## 2. Functions & Logic
Review status: UNREVIEWED

### useGameState (src/src_figma/hooks/useGameState.ts -- 3,089 lines)

The brain of the GameTracker. All game logic flows through this hook.

#### recordHit
**Signature:** `(hitType: '1B'|'2B'|'3B'|'HR', rbi: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>`
**Purpose:** Record a hit outcome, advance runners, update all stats, persist to IndexedDB.

**Logic:**
```typescript
// Lines 1107-1110: Calculate runs scored
let runsScored = hitType === 'HR' ? 1 : 0;
if (runnerData?.fromFirst === 'home') runsScored++;
if (runnerData?.fromSecond === 'home') runsScored++;
if (runnerData?.fromThird === 'home') runsScored++;
```

```typescript
// Lines 1118-1147: Runner tracker advancement (third->second->first order)
for (const [base, dest] of [
  ['third', runnerData.fromThird],
  ['second', runnerData.fromSecond],
  ['first', runnerData.fromFirst],
] as const) {
  if (!dest) continue;
  if (dest === 'out') tracker = trackerRunnerOut(tracker, runnerId);
  else { const result = trackerAdvanceRunner(tracker, runnerId, trackerDest); ... }
}
// HR with no runnerData: all runners auto-score (lines 1137-1147)
```

```typescript
// Lines 1167-1173: Leverage index calculation
const baseState = (first?1:0) + (second?2:0) + (third?4:0);
const leverageIndex = getBaseOutLI(baseState, outs);
```

```typescript
// Lines 1175-1180: Walk-off detection
const isWalkOff = isBottom && isLateGame && homeScoreAfter > awayScoreAfter && homeScore <= awayScore;
```

**Edge cases handled:**
- HR with no runner data: all runners auto-score (line 1137)
- Runners NOT mentioned in runnerData STAY on their base (lines 1312-1324)
- Consecutive HR tracking: reset on non-HR hit (line 1257)
- MAJ-07: First-inning runs tracked for starters (line 1260)

**Edge cases NOT handled:**
- winProbabilityBefore/After hardcoded to 0.5, wpa=0 (TODO at line 1215)
- No validation that runnerData destinations are legal for hit type
- No check for impossible base states (two runners on same base)

#### recordOut
**Signature:** `(outType: 'GO'|'FO'|'LO'|'PO'|'DP'|'TP'|'SF'|'SH'|'FC'|'K'|'KL'|'D3K', runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>`
**Purpose:** Record an out, handle multi-out plays, advance/score runners.

**Key logic -- outs on play:**
```typescript
// Lines 1366-1391: Calculate outs
if (outType === 'DP') outsOnPlay = 2;
else if (outType === 'TP') outsOnPlay = 3;
else if (outType === 'FC') {
  // FC: Batter is SAFE, only runners count as outs
  outsOnPlay = 0;
  // Count runners thrown out from runnerData
  if (outsOnPlay === 0) outsOnPlay = 1; // Default to 1 if no runner data
} else {
  outsOnPlay = 1; // Batter out + additional runner outs
}
```

**Edge cases handled:**
- FC: batter reaches first (lines 1429, 1572)
- SF/SH don't count as AB (line 1496)
- SF auto-gets 1 RBI (line 1462)
- Auto-end inning on 3 outs with 500ms delay (line 1594)

#### recordWalk
**Signature:** `(walkType: 'BB'|'IBB'|'HBP', pitchCount?: number) => Promise<void>`
**Purpose:** Record walk/HBP, handle forced advances.

**Key logic -- force advance:**
```typescript
// Lines 1778-1782: Base update (force advance pattern)
bases: {
  first: true,
  second: prev.bases.first || prev.bases.second,
  third: (prev.bases.first && prev.bases.second) || prev.bases.third,
}
```

**Edge cases handled:**
- Bases loaded walk scores 1 run (line 1613)
- MAJ-07: HBP tracked separately from BB (lines 1713, 1728)
- IBB tracked separately in pitcher stats (line 1731)
- Walks correctly do NOT count as hits in scoreboard

#### recordD3K
**Signature:** `(batterReached: boolean, pitchCount?: number) => Promise<void>`
**Purpose:** Record dropped third strike with correct stat attribution.

**D3K Rules (from code comments, lines 1791-1801):**
- Pitcher ALWAYS gets K stat
- Batter ALWAYS gets K stat (PA + AB + K)
- If batterReached=true: batter reaches 1B, NO out
- If batterReached=false: out recorded
- D3K batter categorized as 'error' in runner tracker for ER purposes

#### recordError
**Signature:** `(rbi?: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>`
**Purpose:** Record reach on error with correct ER/UER attribution.

**Key logic:**
- No AB charged on error (line 2013)
- Batter reaches first with howReached='error' in tracker
- Errors increment fielding team's error count (lines 2053-2056)
- Default runner advancement (one base each) when no runnerData (lines 2106-2110)

#### recordEvent
**Signature:** `(eventType: EventType, runnerId?: string) => Promise<void>`
**Purpose:** Record non-at-bat events (SB, CS, WP, Fame events).

**Fame values (lines 2145-2166):**
| Event | Base Fame | Recipient |
|-------|-----------|-----------|
| WEB_GEM | +1.0 | Fielder |
| ROBBERY | +1.0 | Fielder |
| TOOTBLAN | -3.0 | Runner |
| KILLED | +3.0 | Batter |
| NUTSHOT | +1.0 | Batter |

**Fame formula:** `adjustedFame = baseFame * sqrt(LI)`

#### calculatePitcherDecisions (internal, lines ~380)
**Purpose:** Assign W/L/SV after game ends.

**Simplified logic:**
- Loss = pitcher with most runsAllowed on losing team
- Win = starter if >= 5 IP (15 outs), else best reliever
- Save = last pitcher on winning team if qualifies (3+ IP, or entered with lead <= 3, or tying run on base)

**POSSIBLE DISCREPANCY:** Real MLB W/L requires tracking lead changes play-by-play. This simplified version assigns Loss to "most runs allowed" which may not match the pitcher who actually gave up the lead.

#### processTrackerScoredEvents (internal, lines ~340)
**Purpose:** Attribute runs to RESPONSIBLE pitcher, not current pitcher.

```typescript
// ACTUAL CODE pattern:
for (const event of scoredEvents) {
  const pitcherId = event.responsiblePitcherId; // Original pitcher
  pStats.runsAllowed++;
  if (event.isEarned) pStats.earnedRuns++;
  if (event.isInherited) {
    // Track inherited runners scored for current pitcher separately
    currentPitcher.inheritedRunnersScored++;
  }
}
```

### Baseball Rules Functions (exported from useGameState.ts)

#### autoCorrectResult
```typescript
// FO -> SF when runner scores from third
// GO -> DP when a runner is put out
```

#### calculateRBIs
```typescript
// HR: 1 (batter) + all runners on base
// Error: 0 RBI
// DP/TP: 0 RBI
// Otherwise: count runners who scored
```

#### isRunnerForced
```typescript
// First: always forced
// Second: forced if first occupied
// Third: forced if first AND second occupied
```

### inheritedRunnerTracker.ts (529 lines)

**Key functions:**
- `createInitialTrackerState()` -- Initialize empty tracker
- `syncTrackerPitcher(state, pitcherId, name)` -- Ensure tracker knows current pitcher
- `trackerAddRunner(state, runnerId, name, base, howReached)` -- Add runner at base
- `trackerAdvanceRunner(state, runnerId, destBase)` -- Move runner, return RunnerScoredEvent if scored
- `trackerRunnerOut(state, runnerId)` -- Remove runner
- `trackerNextAtBat(state)` -- Increment at-bat counter
- `trackerClearBases(state)` -- Clear for new half-inning
- `trackerNextInning(state)` -- Increment inning
- `trackerHandlePitchingChange(state, newPitcherId, name)` -- Mark all runners as inherited
- `findRunnerOnBase(state, base)` -- Find runner ID at specific base

**ER attribution logic:**
- Runner scored is earned if howReached != 'error'
- Run charged to responsiblePitcherId (who put runner on base)
- Inherited runners tracked: isInherited=true, inheritedFromPitcherId set

### saveDetector.ts
Implements MLB save rules (3 criteria):
1. Pitched 3+ innings
2. Entered with lead <= 3 and recorded final out
3. Tying run was on base, at bat, or on deck

### detectionIntegration.ts
Runs play-by-play detection for Fame events:
- Auto-detect: Cycle, no-hitter progress, immaculate inning
- Prompt-detect: Web gem, robbery, TOOTBLAN
- Returns UIDetectionResult[] for GameTracker to handle

---

## 3. User-Facing Behaviors
Review status: UNREVIEWED

### Behavior: Record an at-bat outcome

**What the user does:**
1. Views the interactive baseball field (EnhancedInteractiveField, 4,292 lines)
2. Taps/clicks a zone on the field to indicate where the ball was hit
3. Field component determines outcome type based on zone + trajectory
4. User may need to specify runner advancement in FinalizeAdvanceFlow
5. Play is recorded

**What happens:**
1. User interaction fires `onPlayComplete(playData)` from EnhancedInteractiveField
2. GameTracker.tsx `handleEnhancedPlayComplete()` processes:
   - Checks for thrown-out runners -> FielderCreditModal if needed
   - Checks for extra-base advances -> ErrorOnAdvanceModal if needed
   - Calculates RBI from runner outcomes
   - Captures undo snapshot (deep clone via JSON.stringify)
   - Converts PlayData runner outcomes to RunnerAdvancement format
   - Calls appropriate useGameState function (recordHit/recordOut/etc.)
3. useGameState function:
   - Updates runner tracker (ER attribution shadow state)
   - Creates AtBatEvent and writes to IndexedDB IMMEDIATELY
   - Updates playerStats Map, pitcherStats Map, scoreboard
   - Updates gameState (bases, score, count reset)
   - Advances to next batter
   - Auto-ends inning on 3 outs (500ms delay)
4. GameTracker.tsx post-recording:
   - Checks batter fame milestones (multi-hit, HR, golden sombrero)
   - Checks pitcher fame milestones (strikeouts, meltdown)
   - Runs detection integration (auto-detect + prompt-detect)
   - Updates mWAR tracking

**Data flow:**
```
EnhancedInteractiveField.onPlayComplete(PlayData)
  -> GameTracker.handleEnhancedPlayComplete()
    -> undoSystem.captureSnapshot()
    -> useGameState.recordHit/Out/Walk/etc.
      -> inheritedRunnerTracker (shadow state)
      -> eventLog.logAtBatEvent() [IndexedDB: kbl-event-log]
      -> setState updates (playerStats, pitcherStats, scoreboard, gameState)
    -> useFameTracking.checkBatterFameEvents()
    -> useFameTracking.checkPitcherFameEvents()
    -> detectionIntegration.runPlayDetections()
    -> useMWARCalculations updates
```

### Behavior: Make a substitution

**What the user does:**
1. Opens the LineupCard component (sidebar)
2. Selects substitution type (pinch hit, pinch run, defensive sub, pitching change, double switch)
3. Selects incoming player from bench/bullpen
4. Confirms substitution

**What happens:**
1. LineupCard fires onSubstitution(SubstitutionData)
2. GameTracker.handleLineupCardSubstitution():
   - For pitching_change: calls changePitcher() -> shows PitchCountPrompt
   - For position_swap: calls switchPositions()
   - For player_sub/pinch_hit/pinch_run: calls makeSubstitution()
   - Records mWAR decision for strategic subs
   - Updates local roster arrays for UI

**Pitch count flow (mandatory on pitching change):**
```
changePitcher() -> setPitchCountPrompt({type:'pitching_change'}) -> pendingActionRef
User enters pitch count -> confirmPitchCount()
  -> Updates pitcher's final count
  -> Executes pending action (lineup swap, tracker update, gameState update)
  -> Clears prompt
```

### Behavior: End an inning

**What the user does:**
1. Third out is recorded (auto-trigger) OR user manually clicks end inning

**What happens:**
1. On third out: setTimeout(500ms) -> endInning()
2. endInning() shows PitchCountPrompt for current pitcher
3. User confirms/dismisses pitch count
4. executeEndInning():
   - Clears runner tracker bases
   - Flips isTop (TOP->BOTTOM, BOTTOM->TOP)
   - Increments inning on BOTTOM->TOP transition
   - Resets outs/balls/strikes/bases
   - Sets next batter from appropriate lineup
   - Resets inningPitchesRef for immaculate inning detection

### Behavior: End the game

**What the user does:**
1. Clicks "End Game" button
2. Confirms in dialog
3. Enters final pitch count

**What happens:**
1. endGame():
   - Archives game for post-game summary (EXH-011 fix: archive FIRST)
   - Shows pitch count prompt for current pitcher
   - Stores completeGameInternal as pending action
2. After pitch count confirmed, completeGameInternal():
   - Marks game complete in event log
   - MAJ-07: Marks last pitcher as finishedGame
   - MAJ-08: Calculates W/L/SV decisions
   - Builds PersistedGameState
   - aggregateGameToSeason() -> season-level stat accumulation
   - markGameAggregated()
   - archiveCompletedGame() with inning scores
3. GameTracker.handleEndGame():
   - MAJ-09: Detects end-game achievements (no-hitter, perfect game, Maddux, CG, shutout)
   - MAJ-02: Updates fan morale for both teams (skip in exhibition)
   - MAJ-04: Generates narrative recaps
   - Navigates to post-game summary page

### Behavior: Undo a play

**What the user does:**
1. Clicks the Undo button (UndoButtonComponent)
2. Previous state is restored
3. Toast notification shows what was undone

**What happens:**
1. Undo system maintains a stack of max 5 snapshots (deep cloned via JSON.stringify)
2. Each snapshot captured BEFORE each play contains: gameState, scoreboard, playerStats entries, pitcherStats entries, runnerTrackerSnapshot
3. performUndo() pops last snapshot
4. handleUndo() deserializes Maps from entries arrays
5. restoreState() sets all state + runnerTrackerRef

**Note:** Maps are serialized as entry arrays because JSON.stringify cannot handle Maps. Runner tracker pitcherStats Map is also serialized this way.

### Behavior: Track Mojo/Fitness

**What the user does:**
1. Opens PlayerCardModal by clicking a player in TeamRoster
2. Manually adjusts Mojo or Fitness via slider/buttons
3. Views stat multiplier effects

**What happens:**
1. usePlayerState.setMojo()/setFitness() updates the players Map
2. Auto-mojo updates are DISABLED (manual only via setMojo)
3. Mojo affects batting/pitching stats via multipliers (RATTLED 0.82 to JACKED 1.18)
4. Fitness affects stats via multipliers (JUICED 1.20 to HURT 0.00)

---

## 4. State Management
Review status: UNREVIEWED

### State Variables

| Variable | Type | Managed by | Triggers |
|----------|------|-----------|----------|
| gameState | GameState | useGameState | Every at-bat, runner movement, inning change |
| scoreboard | ScoreboardState | useGameState | Runs scored, hits, errors |
| playerStats | Map<string, PlayerGameStats> | useGameState | Every at-bat |
| pitcherStats | Map<string, PitcherGameStats> | useGameState | Every at-bat, pitching changes |
| fameEvents | FameEventRecord[] | useGameState | recordEvent with fame events |
| substitutionLog | SubstitutionLogEntry[] | useGameState | Substitutions |
| pitchCountPrompt | PitchCountPromptState/null | useGameState | endInning, changePitcher, endGame |
| runnerTrackerRef | RunnerTrackingState | useGameState (ref) | Every at-bat, runner movement, pitching change |
| awayLineupRef | LineupEntry[] | useGameState (ref) | initializeGame, makeSubstitution |
| homeLineupRef | LineupEntry[] | useGameState (ref) | initializeGame, makeSubstitution |
| inningPitchesRef | {pitches,strikeouts,pitcherId} | useGameState (ref) | K/KL recorded, endInning resets |
| players | Map<string, PlayerStateData> | usePlayerState | registerPlayer, setMojo, setFitness |
| tracker (fame) | GameFameTracker | useFameTracking | recordFameEvent |
| recordedMilestones | Map<string, Set<FameEventType>> | useFameTracking | Milestone detection |
| morale (home/away) | FanMorale | useFanMorale (x2) | processGameResult at endGame |
| pendingOutcome | {type,subType,...}/null | GameTracker.tsx | Two-step outcome recording |
| pendingDetections | UIDetectionResult[] | GameTracker.tsx | Detection prompts |
| useEnhancedField | boolean | GameTracker.tsx | Field toggle (default true) |

### Side Effects

| useEffect Location | Depends On | Does What |
|-------------------|-----------|----------|
| GameTracker: elapsed time | [gameStartTime] | Updates elapsedMinutes every 60s |
| GameTracker: mWAR init | [gameId] | Initializes mWAR game + season |
| GameTracker: game init | [gameInitialized, players, ...] | Loads existing or creates new game |
| GameTracker: register players | [gameInitialized, players] | Registers all players with usePlayerState |
| GameTracker: undo sync | [gameState, scoreboard, stats] | Keeps undo system current state in sync |
| useGameState: loading | [initialGameId] | Sets isLoading=false if no game ID |

---

## 5. Persistence
Review status: UNREVIEWED

### What's Saved

| Data | Storage | Key/Path | When Saved |
|------|---------|----------|-----------|
| AtBatEvents | IndexedDB kbl-event-log/atBatEvents | eventId | IMMEDIATELY after each at-bat |
| GameHeader | IndexedDB kbl-event-log/gameHeaders | gameId | At game start, on complete, on aggregate |
| CompletedGame | IndexedDB kbl-tracker/completedGames | gameId | At endGame (before pitch count prompt) |
| SeasonStats | IndexedDB via seasonAggregator | seasonId | At completeGameInternal (after pitch count) |
| Manager decisions | IndexedDB via managerStorage | - | At endGame |

### What's NOT Saved (ephemeral state)

- `gameState` (inning, outs, bases, score) -- rebuilt from events if needed, lost on refresh during game
- `playerStats` Map -- aggregated at game end, lost during game on refresh
- `pitcherStats` Map -- aggregated at game end, lost during game on refresh
- `runnerTrackerRef` -- shadow state, lost on refresh
- `fameEvents` -- persisted at endGame in completedGames record
- Undo stack -- pure in-memory, lost on refresh
- Player mojo/fitness state -- per-game only, not persisted between games
- Fan morale state -- hook-level only during game

**IMPORTANT NOTE**: The current game state is NOT auto-saved to IndexedDB during gameplay. Only AtBatEvents are written immediately. If the page refreshes mid-game, the game state is LOST (though events can reconstruct it). The `loadExistingGame` function exists but gameStorage's `saveCurrentGame`/`debouncedSaveCurrentGame` are NOT called during normal play recording in useGameState. The `lastSavedAt` timestamp updates but no periodic save occurs.

---

## 6. Discrepancies
Review status: REQUIRES YOUR INPUT

| ID | Behavior | Code Does | Reference Says | Status |
|----|----------|-----------|---------------|--------|
| D-01 | Pitcher W/L assignment | Lead-change tracking via AtBatEvents | Standard: Loss = pitcher who surrendered the lead | ✅ FIXED 2026-02-09 |
| D-02 | Win probability / WPA | Hardcoded to 0.5 / 0 | Should calculate from game state | KNOWN INCOMPLETE (TODO in code) |
| D-03 | Mid-game persistence | Events saved, game state NOT auto-saved | STAT_TRACKING_ARCHITECTURE_SPEC says Phase 2 persistence | POSSIBLE DISCREPANCY |
| D-04 | Error RBI | rbi parameter ignored; errors never credit RBI | calculateRBIs returns 0 for errors | ✅ FIXED 2026-02-09 |
| D-05 | D3K leverageIndex | Uses getBaseOutLI(baseState, outs) | Should use getBaseOutLI like other at-bats | ✅ FIXED 2026-02-09 |
| D-06 | Fame ROBBERY value | Code: +1.0 | kbl-detection-philosophy.md: "+1 Fame" | MATCH |
| D-07 | Fame TOOTBLAN value | Tiered: -0.5 base, -2.0 rally killer | kbl-detection-philosophy.md: "-0.5 Fame (-2 if rally killer)" | ✅ FIXED 2026-02-09 |
| D-08 | Mojo auto-update | DISABLED in code | Mojo system spec suggests auto-triggers | INTENTIONAL (manual only) |
| D-09 | Immaculate inning | 9 pitches + 3 K in confirmPitchCount | Standard: 9 pitches, all strikes, 3 K | PLAUSIBLE (simplified) |
| D-10 | Bases loaded walk base calc | Simple force logic | Correct: only forced runners advance | MATCH |

### D-01: Pitcher Win/Loss Assignment — ✅ FIXED 2026-02-09
**Fix:** `calculatePitcherDecisions` is now async. It reads AtBatEvents via `getGameEvents(gameId)` and scans for the last go-ahead moment — the at-bat where the winning team took a lead they never relinquished. The losing-team pitcher on the mound at that moment gets the L. Falls back to most-runsAllowed heuristic if events are unavailable (e.g., IndexedDB failure).

### D-03: Mid-game State Persistence
**Code does:** AtBatEvents are written to IndexedDB immediately, but the running game state (gameState, playerStats, pitcherStats, scoreboard) is NOT auto-saved. `debouncedSaveCurrentGame` exists in gameStorage.ts but is never called from useGameState.
**Reference says:** STAT_TRACKING_ARCHITECTURE_SPEC.md Phase 2 specifies game persistence.
**Question:** Is the lack of mid-game auto-save intentional? A page refresh during a game would lose all in-memory state (though events could theoretically be replayed).

### D-04: Error RBI Accounting — ✅ FIXED 2026-02-09
**Fix:** `recordError` still accepts the `rbi` parameter for backward compatibility but ignores it. The line `batterStats.rbi += rbi` was removed. Errors never credit RBI, consistent with `calculateRBIs()`.

### D-05: D3K Leverage Index — ✅ FIXED 2026-02-09
**Fix:** `recordD3K` now calculates `leverageIndex` using `getBaseOutLI(baseState, outs)`, the same pattern as `recordHit` and `recordOut`. No longer hardcoded to 1.0.

### D-07: TOOTBLAN Fame Value — ✅ FIXED 2026-02-09
**Fix:** Replaced flat `-3.0` with tiered logic per kbl-detection-philosophy.md: `-0.5` base TOOTBLAN, `-2.0` if rally killer (runner in scoring position with <2 outs). The `sqrt(LI)` multiplier is still applied on top.

---

## 7. Dependencies & Connections
Review status: UNREVIEWED

### This feature depends on:

| Feature | How | Files |
|---------|-----|-------|
| Leverage Calculator | getBaseOutLI for every at-bat | src/engines/leverageCalculator.ts |
| Event Log System | Immediate event persistence | src/utils/eventLog.ts |
| Game Storage | Game archiving, post-game display | src/src_figma/utils/gameStorage.ts |
| Season Aggregator | End-game stat aggregation | src/storage/seasonAggregator.ts |
| Mojo Engine | Mojo state types/multipliers | src/engines/mojoEngine.ts |
| Fitness Engine | Fitness state types/multipliers | src/engines/fitnessEngine.ts |
| Fame Engine | Fame event processing | src/engines/fameEngine.ts |
| Fan Morale Engine | Post-game morale updates | src/engines/fanMoraleEngine.ts |
| Narrative Engine | Post-game recap generation | src/engines/narrativeEngine.ts |
| Manager Storage | mWAR decision persistence | src/utils/managerStorage.ts |
| League Structure | Rival detection | src/data/leagueStructure.ts |

### Features that depend on this:

| Feature | How | Files |
|---------|-----|-------|
| Post-Game Summary | Reads completedGames from IndexedDB | src/src_figma/app/pages/PostGameSummary.tsx |
| Season Stats | Reads aggregated season stats | src/src_figma/app/pages/StatsPage.tsx |
| Franchise Mode | Game results feed into season | src/src_figma/app/pages/FranchiseHome.tsx |

### Cross-feature interactions:

**End-game pipeline:**
```
endGame() -> archiveCompletedGame [gameStorage]
  -> completeGameInternal()
    -> completeGame [eventLog]
    -> calculatePitcherDecisions
    -> aggregateGameToSeason [seasonAggregator]
    -> markGameAggregated [eventLog]
    -> archiveCompletedGame [gameStorage]
handleEndGame()
  -> Fan morale update [fanMoraleEngine via useFanMorale]
  -> Narrative generation [narrativeEngine via narrativeIntegration]
  -> mWAR persistence [managerStorage]
  -> Navigate to PostGameSummary
```

---

## 8. Edge Cases & Known Gaps
Review status: UNREVIEWED

### Handled Edge Cases

| Case | How Handled | Code Location |
|------|-----------|---------------|
| HR with no runner data | All runners auto-score | useGameState.ts:1137-1147 |
| FC batter reaches first | Special case: batter safe, runners out | useGameState.ts:1371-1380, 1429-1431 |
| SF/SH not counted as AB | Conditional check before ab++ | useGameState.ts:1496-1498 |
| Auto-correct FO->SF | When R3 scores from third | useGameState.ts:autoCorrectResult |
| Auto-correct GO->DP | When runner put out | useGameState.ts:autoCorrectResult |
| Bases loaded walk | Force advance, 1 run scores | useGameState.ts:1612-1613, 1778-1782 |
| D3K batter reached | No out recorded, batter to 1B | useGameState.ts:1814 |
| Walk-off detection | Bottom 9+, home takes lead | useGameState.ts:1175-1180 |
| Inherited runner ER | Charged to original pitcher | inheritedRunnerTracker + processTrackerScoredEvents |
| Undo with Maps | Serialize as entries arrays | UndoSystem.tsx:683 |
| Runner tracker pitching change | Mark all runners as inherited | inheritedRunnerTracker:trackerHandlePitchingChange |
| Duplicate fame milestone prevention | recordedMilestones Map<string, Set> | useFameTracking.ts |
| Immaculate inning detection | 9 pitches confirmed + 3 K tracked | useGameState.ts:2622 |
| 3-out auto-end inning | setTimeout 500ms | useGameState.ts:1594 |
| Pitch count mandatory on pitching change | PitchCountPrompt blocks until confirmed | useGameState.ts:changePitcher |

### Unhandled Edge Cases

| Case | Risk | Recommendation |
|------|------|---------------|
| Mid-game page refresh | ALL in-memory state lost (gameState, stats, scoreboard) | Implement periodic auto-save or save on each at-bat |
| Negative PA/AB values | No bounds checking on stat counters | Add guards |
| NaN propagation in LI | No NaN check on getBaseOutLI inputs | Add validation |
| Two runners on same base | No collision detection in base state | Add validation |
| DP without runners on base | No validation, would create invalid outs | Validate base state |
| Extra innings LI | INNING_MULTIPLIERS only go to 9, extras default to undefined | Use inning 9 multiplier for extras |
| Concurrent at-bat writes | IndexedDB transaction isolation unclear | Verify transaction integrity |
| D3K batter displaces R1 | D3K puts batter on 1B but doesn't move existing R1 | Only legal when 1B empty or 2 outs |

---

## Appendix: File Inventory
| File | Purpose | Key Exports | Lines |
|------|---------|-------------|-------|
| src/src_figma/hooks/useGameState.ts | Central game state hook | useGameState, baseball rules functions | 3,089 |
| src/src_figma/app/pages/GameTracker.tsx | Main page component | GameTracker | 3,798 |
| src/src_figma/app/engines/inheritedRunnerTracker.ts | ER attribution tracker | TrackedRunner, RunnerTrackingState, tracker functions | 529 |
| src/src_figma/app/engines/saveDetector.ts | Save rule detection | SaveDetectionResult, detectSave | ~200 |
| src/src_figma/app/engines/d3kTracker.ts | D3K tracking | D3KOutcome, D3KEvent, D3KStats | ~150 |
| src/src_figma/app/engines/fameIntegration.ts | Fame event processing | GameFameTracker, addFameEvent, detection functions | ~500 |
| src/src_figma/app/engines/fanMoraleIntegration.ts | Fan morale integration | FanMorale, initializeFanMorale, processResult | ~300 |
| src/src_figma/app/engines/mwarIntegration.ts | Manager WAR integration | ManagerDecision, recordDecision | ~400 |
| src/src_figma/app/engines/narrativeIntegration.ts | Narrative generation | generateGameRecap, BeatReporter | ~300 |
| src/src_figma/app/engines/detectionIntegration.ts | Event detection | runPlayDetections, UIDetectionResult | ~350 |
| src/src_figma/app/engines/playerStateIntegration.ts | Player state integration | createCombinedPlayerState, stat adjustments | ~400 |
| src/src_figma/app/hooks/useFameTracking.ts | Fame tracking hook | useFameTracking | 324 |
| src/src_figma/app/hooks/useFanMorale.ts | Fan morale hook | useFanMorale | 195 |
| src/src_figma/app/hooks/useMWARCalculations.ts | mWAR hook | useMWARCalculations | ~300 |
| src/src_figma/app/hooks/useWARCalculations.ts | WAR calculations hook | useWARCalculations | ~400 |
| src/src_figma/app/hooks/usePlayerState.ts | Player state hook | usePlayerState | ~400 |
| src/src_figma/app/components/UndoSystem.tsx | Undo system | useUndoSystem, UndoButton | 348 |
| src/src_figma/app/components/EnhancedInteractiveField.tsx | Interactive field | EnhancedInteractiveField, PlayData | 4,292 |
| src/src_figma/app/components/FinalizeAdvanceFlow.tsx | Runner advancement UI | FinalizeAdvanceFlow | 1,487 |
| src/src_figma/app/components/LineupCard.tsx | Lineup/substitution UI | LineupCard, SubstitutionData | ~600 |
| src/src_figma/app/components/TeamRoster.tsx | Team roster display | TeamRoster | ~400 |
| src/src_figma/app/components/MiniScoreboard.tsx | Mini scoreboard | MiniScoreboard | ~200 |
| src/src_figma/app/components/modals/FielderCreditModal.tsx | Fielder credit | FielderCreditModal | ~200 |
| src/src_figma/app/components/modals/ErrorOnAdvanceModal.tsx | Error attribution | ErrorOnAdvanceModal | ~200 |
| src/utils/eventLog.ts | Event log persistence | logAtBatEvent, createGameHeader, etc. | ~600 |
| src/src_figma/utils/gameStorage.ts | Game state persistence | archiveCompletedGame, PersistedGameState | ~409 |
| src/storage/seasonAggregator.ts | Season stat aggregation | aggregateGameToSeason | ~300 |
| src/engines/leverageCalculator.ts | Leverage index | getBaseOutLI, BASE_OUT_LI table | ~400 |
| src/engines/mojoEngine.ts | Mojo system | MojoLevel, MOJO_STATES | ~300 |
| src/engines/fitnessEngine.ts | Fitness system | FitnessState, FITNESS_STATES | ~300 |
| src/engines/fameEngine.ts | Fame system core | FameEvent, calculateFame | ~400 |
| src/engines/fanMoraleEngine.ts | Fan morale core | FanMorale, processGameResult | ~400 |
| src/engines/narrativeEngine.ts | Narrative core | BeatReporter, generateRecap | ~500 |
| src/utils/managerStorage.ts | Manager decision storage | saveGameDecisions | ~200 |
| src/data/leagueStructure.ts | League/rivalry data | areRivals | ~100 |
