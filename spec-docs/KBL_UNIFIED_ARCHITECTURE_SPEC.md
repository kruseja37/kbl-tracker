# KBL Unified Architecture Specification
# The Event-Driven Franchise

**Version:** 1.2
**Date:** 2026-02-19 (v1.0), 2026-02-20 (v1.1 — JK review notes integrated), 2026-02-20 (v1.2 — second-round feedback: CSV import fields, expected value baselines, OOTP prospect valuation)
**Status:** CANONICAL — supersedes flow-related portions of all prior GameTracker specs
**Author:** Claude + JK
**Supersedes (partial):** GAMETRACKER_DRAGDROP_SPEC, GAME_SIMULATION_SPEC, BASEBALL_STATE_MACHINE_AUDIT
**References (still valid):** All WAR specs, STAT_TRACKING_ARCHITECTURE_SPEC, PITCHER_STATS_TRACKING_SPEC, MOJO_FITNESS_SYSTEM_SPEC, NARRATIVE_SYSTEM_SPEC, OFFSEASON_SYSTEM_SPEC, FRANCHISE_MODE_SPEC, all FIGMA specs

---

## Table of Contents

1. [The Core Thesis](#1-the-core-thesis)
2. [The Event Model — Universal Atom](#2-the-event-model)
3. [GameTracker V2 — 1-Tap Recording](#3-gametracker-v2)
4. [Enrichment System](#4-enrichment-system)
5. [Between-Play Events](#5-between-play-events)
6. [Mojo & Fitness — User-Reported State](#6-mojo--fitness)
7. [Modifier Registry](#7-modifier-registry)
8. [Narrative Integration — The Living Franchise](#8-narrative-integration)
9. [Franchise Data Flow — Event to Career](#9-franchise-data-flow)
10. [Franchise Mode — Through the Event Lens](#10-franchise-mode)
11. [League Builder — Foundation Layer](#11-league-builder)
12. [Offseason — Event Consumers](#12-offseason)
13. [iPad Layout & Display Architecture](#13-ipad-layout)
14. [Codebase Triage — Keep / Rewire / Rebuild / New](#14-codebase-triage)
15. [Implementation Roadmap](#15-implementation-roadmap)
16. [Audit Finding Disposition](#16-audit-finding-disposition)

---

## 1. The Core Thesis

### 1.1 The Insight

KBL Tracker's user is not a baseball scorer making judgment calls. SMB4 *tells* the user what happened — "SINGLE", "GROUND OUT", "HOME RUN 410 FT". The user's job is to RECORD what the game showed, not FIGURE OUT what occurred.

Every existing baseball scoring app (GameChanger, iScore, Scorekeepr) was designed for real baseball where the scorer must classify ambiguous events. Their multi-step interview flows exist because the app doesn't know what happened until the user tells it through progressive questions.

KBL doesn't need interviews. KBL needs a record button.

### 1.2 The Paradigm: Record First, Enrich Later

**Step 1 (mandatory, 1 tap):** Tap outcome button. K, GO, FO, 1B, BB, 2B, HR, etc.
**Step 2 (automatic, 0 taps):** Runners auto-advance. Event saves. Next batter loads.
**Step 3 (optional, whenever):** Enrich the play via tappable play log. Add spray location, fielding sequence, exit type, modifiers. Do it between innings, after the game, or never — core counting stats are already correct from Step 1.

### 1.3 The Counterintuitive Insight

1-tap recording produces RICHER events than the multi-step interview. Because the flow doesn't block on user input, the system has time to snapshot everything it already knows at that moment — leverage index, mojo state, matchup history, milestone proximity, pitcher fatigue, rivalry context. None of that costs the user any taps. The current interview flow doesn't capture it because it's busy asking questions.

### 1.4 The Architectural Guarantee

KBL has three event streams. Everything in KBL consumes events. The quality of the entire franchise experience is bounded by the quality of those events.

```
Event Stream 1: GameTracker    → AtBatEvents + BetweenPlayEvents (in-game)
Event Stream 2: Franchise Mgr  → TransactionEvents (roster/trade/FA/draft/retirement)
Event Stream 3: Offseason Eng  → OffseasonEvents (contraction/expansion/awards/ratings)
```

- **GameTracker** = game event producer
- **Franchise Manager** = transaction event producer (trades, call-ups, send-downs, FA signings)
- **Offseason Engine** = lifecycle event producer (awards, ratings, retirements, draft, contraction)
- **Everything else** = event consumer (many readers)
- **All events are immutable** once saved (enrichment adds fields, never changes outcomes)
- **All downstream state is derivable** from events (if any system is wrong, replay the events)
- **The modifier registry** is the extension point (new quirks, stats, narrative triggers added without touching core flow)

### 1.5 Competitive Position

| App | Target | Taps/Play | Depth |
|-----|--------|-----------|-------|
| GameChanger | Real baseball | 3-8 | High (mandatory) |
| iScore | Real baseball (power users) | 2-9 | Very high (mandatory) |
| Lazy Guys Scoreboard | Real baseball (casual) | 1-2 | Minimal |
| **KBL Tracker** | **SMB4 (game tells you)** | **1-1.3** | **High (optional enrichment)** |

Speed of Lazy Guys, depth of iScore, with SMB4 quirks no other app can touch.

**The path from High to Very High depth:** iScore achieves depth through mandatory granular input. KBL achieves it through optional enrichment PLUS auto-captured context that iScore doesn't have (LI, mojo, matchup history, fame, pitcher context, team context). A fully-enriched KBL event is richer than any iScore event. To encourage enrichment, KBL includes a **Depth Meter** — a visual indicator showing enrichment completeness per game and per season, gamifying the process without ever blocking the flow.

---

## 2. The Event Model — Universal Atom

### 2.1 Core Event Interface

Every at-bat produces one event. This is the single source of truth for the entire franchise.

```typescript
interface AtBatEvent {
  // === IDENTITY ===
  eventId: string;               // UUID
  gameId: string;
  seasonId: string;
  franchiseId: string;
  leagueId: string;
  timestamp: number;
  eventIndex: number;            // Sequential within game

  // === USER INPUT (1 tap) ===
  result: AtBatResult;           // 'K' | 'Kc' | 'GO' | 'FO' | 'LO' | 'PO' | '1B' | '2B' | '3B' | 'HR'
                                 // | 'BB' | 'HBP' | 'E' | 'FC' | 'DP' | 'TP' | 'SAC' | 'SF' | 'IBB'
                                 // | 'WP_K' | 'PB_K'
                                 // Note: 'Kc' = called strikeout (looking). 'K' = swinging.

  // === AUTO-CAPTURED CONTEXT (0 taps — system snapshots at event creation) ===
  gameState: {
    inning: number;
    halfInning: 'TOP' | 'BOTTOM';
    outs: number;
    score: { away: number; home: number };
    runnersOn: BaseState;        // { first?: string; second?: string; third?: string } (playerIds)
  };

  teamContext: {
    battingTeam: { teamId: string; record: { w: number; l: number }; streak: number; divisionRank: number };
    fieldingTeam: { teamId: string; record: { w: number; l: number }; streak: number; divisionRank: number };
    isRivalryGame: boolean;
    seriesContext?: { game: number; of: number; seriesScore?: { home: number; away: number } };
  };

  leverageIndex: number;         // Calculated from game state at moment of event
  winProbabilityBefore: number;  // WP before this event
  winProbabilityAfter: number;   // WP after this event (WPA = after - before)

  batterContext: {
    playerId: string;
    playerName: string;
    position: FieldPosition;
    battingOrder: number;
    handedness: 'L' | 'R' | 'S';
    enteredAs?: 'starter' | 'pinch_hit' | 'pinch_run' | 'defensive_replacement';
    replacedPlayer?: string;
    mojoState: MojoLevel;        // Rattled | Tense | Neutral | LockedIn | Jacked
    fitnessLevel: FitnessLevel;  // Hurt | Weak | Strained | Well | Fit | Juiced
    currentSeasonAvg: number;
    currentSeasonOPS: number;
    currentStreak: number;       // Positive = hitting streak, negative = hitless streak
    seasonHits: number;
    seasonHR: number;
    careerHits: number;
    careerHR: number;
    fameLevel: FameLevel;        // unknown | rising | notable | star | superstar | legend
    traits: string[];            // trait IDs from traitPools.ts
    isClutchProfile: boolean;    // From player ratings
    personality?: PlayerPersonality; // Hidden from user, drives narrative
  };

  pitcherContext: {
    playerId: string;
    playerName: string;
    handedness: 'L' | 'R';
    role: 'starter' | 'reliever' | 'closer' | 'setup';
    mojoState: MojoLevel;
    fitnessLevel: FitnessLevel;
    pitchCount: number;          // Last reported pitch count
    currentSeasonERA: number;
    currentSeasonWHIP: number;
    seasonStrikeouts: number;
    careerStrikeouts: number;
    careerWins: number;
    inheritedRunners: number;
    fameLevel: FameLevel;
    traits: string[];
    personality?: PlayerPersonality;
  };

  matchupContext: {
    isRivalry: boolean;          // From relationship engine
    platoonAdvantage: 'batter' | 'pitcher' | 'neutral';
    previousMatchups?: { ab: number; h: number; hr: number };
    relationshipType?: string;   // 'rivalry' | 'mentor' | 'nemesis' etc.
  };

  parkContext: {
    stadiumId: string;
    parkFactors?: { ba: number; hr: number; doubles: number; triples: number };
    lighting: 'day' | 'night' | 'hazy';
  };

  // === COMPUTED AT SAVE (automatic) ===
  runnerOutcomes: RunnerOutcome[];   // Where each runner ended up
  rbis: number;
  runsScored: string[];              // playerIds who scored
  outsRecorded: number;
  isQualityAtBat: boolean;           // Hit, BB, HBP, SF+run, productive out, 7+ pitches, hard hit
  milestoneTriggered?: MilestoneEvent[];
  clutchValue?: number;              // Clutch attribution score

  // === ENRICHMENT (optional, added later by user) ===
  fieldLocation?: { x: number; y: number };
  exitType?: 'ground_ball' | 'fly_ball' | 'line_drive' | 'popup' | 'bunt';
  fieldingSequence?: number[];       // Fielder positions in order (6-4-3)
  putouts?: number[];                // Fielder positions credited with putout
  assists?: number[];                // Fielder positions credited with assist
  errors?: { position: number; type: 'fielding' | 'throwing' | 'mental' }[];
  hrDistance?: number;
  pitchType?: '4-seam' | '2-seam' | 'cutter' | 'slider' | 'curve' | 'changeup' | 'screwball' | 'forkball' | 'unknown';
  pitchesInAtBat?: number;           // Total pitches in the at-bat (enrichment)
  modifiers?: string[];              // From modifier registry

  // === VERSIONING ===
  version: number;                   // Increments on retroactive edit
  editHistory?: { version: number; field: string; oldValue: any; newValue: any; timestamp: number }[];
}

// === MOJO & FITNESS ENUMS (per SMB4) ===
type MojoLevel = 'Rattled' | 'Tense' | 'Neutral' | 'LockedIn' | 'Jacked';
type FitnessLevel = 'Hurt' | 'Weak' | 'Strained' | 'Well' | 'Fit' | 'Juiced';
// Default at season start: Neutral (mojo), Fit (fitness)

// === FAME LEVEL ===
type FameLevel = 'unknown' | 'rising' | 'notable' | 'star' | 'superstar' | 'legend';

// === PLAYER PERSONALITY (hidden from user, drives narrative surprise) ===
interface PlayerPersonality {
  leadership: number;       // 1-200 per OOTP model
  loyalty: number;
  desireForWinner: number;
  greed: number;
  workEthic: number;
  intelligence: number;
}
```

### 2.2 Between-Play Event Interface

Events that happen between at-bats but are critical for stats and narrative:

```typescript
interface BetweenPlayEvent {
  eventId: string;
  gameId: string;
  seasonId: string;
  franchiseId: string;
  timestamp: number;
  eventIndex: number;             // Interleaved with AtBatEvents in sequence

  type: 'stolen_base' | 'caught_stealing' | 'pickoff' | 'wild_pitch'
      | 'passed_ball' | 'balk' | 'defensive_indifference'
      | 'pitcher_change' | 'substitution' | 'position_change'
      | 'mojo_change' | 'fitness_change' | 'injury'
      | 'pitch_count_update' | 'manager_moment';

  gameState: {                    // Snapshot at moment of event
    inning: number;
    halfInning: 'TOP' | 'BOTTOM';
    outs: number;
    score: { away: number; home: number };
    runnersOn: BaseState;
  };

  // Type-specific payloads (discriminated union)
  stolenBase?: {
    runnerId: string;
    fromBase: 1 | 2 | 3;
    toBase: 2 | 3 | 4;           // 4 = home (steal of home)
    isSuccessful: boolean;        // true = SB, false = CS
    caughtBy?: number;            // Fielder position if CS
  };

  pitcherChange?: {
    outgoingPitcherId: string;
    incomingPitcherId: string;
    inheritedRunners: number;
    outgoingPitchCount: number;
    outgoingIP: number;
  };

  substitution?: {
    type: 'pinch_hit' | 'pinch_run' | 'defensive_replacement' | 'position_change' | 'double_switch';
    outPlayerId: string;
    inPlayerId: string;
    position: FieldPosition;
    previousPosition?: FieldPosition;  // For position changes
  };

  playerStateChange?: {
    playerId: string;
    stateType: 'mojo' | 'fitness';
    previousValue: MojoLevel | FitnessLevel;
    newValue: MojoLevel | FitnessLevel;
    linkedPlayId?: string;        // AtBatEvent that triggered the change
    reason?: string;              // 'web_gem' | 'error' | 'diving_catch' | 'robbed_hr' | 'strikeout'
                                  // | 'home_run' | 'injury' | 'manager_decision' | 'between_games' | 'manual'
  };

  wildPitchOrPassedBall?: {
    type: 'wild_pitch' | 'passed_ball';
    pitcherId: string;
    catcherId: string;
    runnersAdvanced: { runnerId: string; fromBase: number; toBase: number }[];
    runScored?: string;           // playerId if runner scored
  };

  pitchCountUpdate?: {
    pitcherId: string;
    pitchCount: number;
    timing: 'end_of_half_inning' | 'pitcher_removed' | 'end_of_game';
  };

  managerMoment?: {
    leverageIndex: number;       // LI at moment of decision
    decisionType: 'leave_pitcher_in' | 'pitching_change' | 'pinch_hit' | 'pinch_run'
                | 'defensive_sub' | 'steal_attempt' | 'intentional_walk' | 'double_switch';
    context: string;             // Brief description: "Left Bender in with runners on 2nd/3rd, 8th inning"
    outcomeEventId?: string;     // Links to the AtBatEvent that resolved this moment
    outcomeWPA?: number;         // WPA of the resulting play
  };
}
```

### 2.3 Transaction Event Interface

Events that happen outside of games — roster moves, trades, free agency, draft picks, retirements:

```typescript
interface TransactionEvent {
  eventId: string;
  franchiseId: string;
  leagueId: string;
  seasonId: string;
  timestamp: number;

  type: 'trade' | 'free_agent_signing' | 'release' | 'waiver'
      | 'call_up' | 'send_down' | 'draft_pick' | 'retirement'
      | 'contract_extension' | 'dfa' | 'injury_list';

  involvedPlayers: {
    playerId: string;
    playerName: string;
    role: 'primary' | 'secondary' | 'included';
    fromTeamId?: string;
    toTeamId?: string;
  }[];

  trade?: {
    team1Id: string;
    team2Id: string;
    team1Sends: string[];        // playerIds
    team2Sends: string[];
    team1TrueValue: number;      // Calculated trade value
    team2TrueValue: number;
  };

  freeAgent?: {
    playerId: string;
    signingTeamId: string;
    contractYears: number;
    annualSalary: number;
    previousTeamId?: string;
  };

  rosterMove?: {
    playerId: string;
    teamId: string;
    fromLevel: 'mlb' | 'farm' | 'free_agent' | 'retired';
    toLevel: 'mlb' | 'farm' | 'free_agent' | 'retired';
  };

  draftPick?: {
    round: number;
    pick: number;
    teamId: string;
    playerId: string;
  };

  narrativeHook?: string;        // "Blockbuster trade shakes up the division"
}
```

### 2.4 Game Container

```typescript
interface GameRecord {
  gameId: string;
  seasonId: string;
  franchiseId: string;
  leagueId: string;
  scheduleGameId?: string;       // Links to schedule system

  teams: {
    away: { teamId: string; teamName: string };
    home: { teamId: string; teamName: string };
  };

  startingLineups: {
    away: LineupEntry[];
    home: LineupEntry[];
  };

  startingPitchers: {
    away: { playerId: string; playerName: string };
    home: { playerId: string; playerName: string };
  };

  stadiumId?: string;
  lighting?: 'day' | 'night' | 'hazy';   // SMB4 game conditions (no weather)
  totalInnings: number;          // Default from League Rules, configurable

  // Computed from events
  finalScore: { away: number; home: number };
  events: (AtBatEvent | BetweenPlayEvent)[];  // Ordered by eventIndex
  totalAtBats: number;
  isComplete: boolean;
  completedAt?: number;

  // Post-game computed
  playersOfTheGame?: {                // 3 tiers, ranked by WPA/game score
    first: string;                    // 1st PoG (MVP-level)
    second?: string;                  // 2nd PoG
    third?: string;                   // 3rd PoG
  };
  gameStoryArc?: 'blowout' | 'pitchers_duel' | 'comeback' | 'walk_off' | 'extra_innings' | 'slugfest';
  topMoments?: { eventId: string; wpa: number; description: string }[];
  managerMoments?: string[];          // BetweenPlayEvent IDs of manager decisions
  beatReporterRecap?: string;         // Template-generated or AI-generated (see Section 8.6)
  depthScore?: number;                // 0-100 enrichment completeness for this game
}
```

### 2.6 Design Principles

1. **Three event streams are the single source of truth.** Game events (AtBat + BetweenPlay), transaction events, and offseason events. All stats, standings, WAR, awards, narratives, records, and career data derive from these events.
2. **Events are immutable at the outcome level.** Once `result: '1B'` is saved, it doesn't change. Enrichment adds optional fields. Retroactive editing creates a new version with audit trail.
3. **Context is free.** The system snapshots everything it knows at event creation time. Leverage, mojo, fitness, matchup history, milestone proximity, team context, park factors — all captured automatically at zero user cost.
4. **Downstream systems are views.** Season stats = SUM(events). Career stats = SUM(season stats). WAR = f(season stats + positional adjustments). Awards = f(WAR + peers). No system maintains independent state that isn't rebuildable from events.
5. **Quality At-Bat (QAB)** is a computed boolean on every AtBatEvent: true if hit, walk, HBP, sac fly with run scored, productive out advancing runner, 7+ pitch at-bat, or hard-hit ball (line drive exit type). QAB rate is a tracked stat per player per season.


---

## 3. GameTracker V2 — 1-Tap Recording

### 3.1 Quick Bar Design

Analysis of SMB4 outcome frequency distribution across typical games:

| Outcome | Frequency | Current Taps | New Taps |
|---------|-----------|-------------|----------|
| Strikeout | ~22% | 5-7 | **1** |
| Ground out | ~18% | 5-8 | **1** |
| Fly out | ~15% | 5-8 | **1** |
| Single | ~15% | 6-9 | **1** |
| Walk | ~8% | 5-7 | **1** |
| Double | ~5% | 6-9 | **1** |
| Home run | ~4% | 7-11 | **2** (+ distance) |
| Line out | ~4% | 5-8 | **2** (overflow) |
| HBP | ~1% | 5-7 | **2** (overflow) |
| Other | ~8% | 7-11 | **2-4** (overflow) |

**Top 6 outcomes = 83% of plays, all 1-tap.**

#### Primary Quick Bar (single row, 9 buttons + overflow):

```
[ K ]  [ GO ]  [ FO ]  [ LO ]  [ 1B ]  [ BB ]  [ 2B ]  [ HR ]  [ ··· ]
```

Design decisions:
- **[GO] and [FO] instead of generic [OUT]**: Ground out and fly out are each individually more common than walks. Splitting them eliminates a sub-menu for the two most common out types AND implicitly classifies exit type (ground ball vs fly ball) at zero extra cost.
- **[K] first**: Most common outcome gets prime left-thumb position. Includes both swinging (K) and looking (Kc) — tap [K] then quick toggle [swinging/looking] or default to swinging and enrich later.
- **[LO] in primary bar**: Line out is ~4% of outcomes but common enough to warrant primary bar placement, eliminating a sub-menu tap.
- **[···] overflow**: Opens full menu for edge cases: PO, 3B, HBP, E, FC, DP, SAC, SF, IBB, WP_K, PB_K, Balk.
- **[HR] triggers inline distance + pitch type prompt**: SMB4 displays HR distance. Single text field appears inline after HR tap, followed by optional pitch type selector (filtered to current pitcher's repertoire from League Builder). Both optional — tap away to skip.

### 3.2 What Happens on Tap

When the user taps [1B]:

1. **Snapshot context** (0ms): System reads current game state, batter context, pitcher context, matchup history, LI, mojo, fitness, milestone proximity — all from existing state.
2. **Apply runner defaults** (0ms): `runnerDefaults.ts` calculates where runners advance based on outcome + base state. R1 advances to second on single, etc. Apply immediately.
3. **Create event** (0ms): Build the full `AtBatEvent` with all context fields populated.
4. **Save event** (async, non-blocking): Write to IndexedDB via `eventLog.ts`.
5. **Fire event hooks** (async, non-blocking): Milestone detection, clutch attribution, narrative triggers, fame check — all fire from the saved event.
6. **Update game state** (0ms): Increment bases, update batter index, advance to next batter.
7. **Update display** (0ms): Diamond shows new runner positions. Scoreboard updates. Play log adds entry. Next batter info loads.

**Total blocking time: <10ms. User sees instant response.**

### 3.3 Undo System

Undo is a stack of events. Pressing undo:
1. Pops last event from the log.
2. Reverses runner positions to pre-event state (stored in event).
3. Restores previous batter/pitcher.
4. Reverses any stats accumulated from that event.
5. 10-state undo depth (configurable).

No "are you sure?" confirmations. Undo is the safety net that makes 1-tap confident.

### 3.4 End-of-Inning Auto-Detection

System detects 3 outs from diverse sources:
- [K] = 1 out
- [GO] = 1 out (sometimes 2 via DP)
- [FO] = 1 out
- [DP] = 2 outs
- Caught stealing = 1 out
- Pickoff out = 1 out

When `outs === 3`, inning changes automatically. Optional brief between-inning summary screen (see Section 8.3).

### 3.5 What Was Cut

| Old Behavior | New Behavior | Why |
|-------------|-------------|-----|
| CLASSIFY step (exit type selection) | Exit type implicit in button ([GO]=ground, [FO]=fly) or optional enrichment | Button IS the classification |
| SidePanel for most plays | Only appears for multi-input plays (DP fielding, error assignment) | ~5% of plays need it |
| RUNNER_CONFIRM step | Auto-apply defaults, display result, tap runner to override | Override is correction, not gate |
| END_CONFIRM step | Auto-save on tap. Undo is safety net. | No "are you sure?" after every play |
| "Misc" button | Modifier registry handles SMB4 quirks | Extensible, not hardcoded |
| HR location in quick flow | HR distance captured inline; spray direction via enrichment (relevant for park factors, spray charts, pull/opposite trends). | Distance is quick; direction is enrichment. |

### 3.6 Runner Override Scenarios

The inferential system handles ~80% of plays correctly with zero extra taps. The remaining ~20% require 1-2 correction taps on the play log entry. Here are the edge cases and how they resolve:

**FO with runner thrown out at home (failed SF):**
1. User taps [FO] with R3 and <2 outs.
2. System infers SF attempt: displays "Sac fly — run scores?" prompt inline (not blocking).
3. If YES: R3 scores, batter credited SF (not FO), sac fly stat recorded.
4. If "Out at plate": R3 out at home, FO stands, runner tagged out. 2 outs recorded.
5. 1 extra tap for the non-default case.

**GO that isn't a DP:**
1. User taps [GO] with R1.
2. System infers standard play: batter out at first. R1 advances to 2nd (default).
3. If actually a DP (6-4-3): User taps [DP] from overflow instead, or taps the play log entry to change to DP.
4. If FC (lead runner forced, batter safe): User taps [FC] from overflow, or taps play log entry → "Who was out?" → tap base indicator for R1 forced at 2nd.
5. For tag play FC (non-force): same flow, enrichment captures tag play in fielding sequence.

**GO with runner on 3rd only (no force):**
1. User taps [GO] with R3 only.
2. System infers: batter out at first, R3 holds (default).
3. If R3 scored on the play: tap R3 on diamond → [Score] or tap play log → adjust runner outcome.
4. If R3 thrown out: tap R3 on diamond → [Out at home].

**Double play non-standard (e.g., 5-4-3 or 4-6-3):**
1. User taps [DP] from overflow.
2. System records 2 outs, clears appropriate runners.
3. Fielding sequence captured in enrichment (not blocking).

**Error leading to extra bases:**
1. User taps [E] from overflow.
2. System prompts: "Batter reached which base?" → [1B] [2B] [3B].
3. Then: "Error by?" → position selector → "Error type?" → [Fielding] [Throwing] [Mental].
4. 3-4 taps total for an uncommon play.

**Key principle: defaults handle the common case silently. Corrections are always available via the play log, which is the universal "fix anything" interface. No correction requires more than 3 taps. No correction blocks the flow.**

---

## 4. Enrichment System

### 4.1 Philosophy

Enrichment is what separates "good enough stats" from "deep analytics." It's always optional, never blocking, and can be done at any time — during the game, between innings, after the game, or never.

Core counting stats (BA, OBP, SLG, ERA, WHIP, W, L, SV, K) are correct from the 1-tap outcome alone. Enrichment adds: spray charts, fielding credit (putouts/assists/errors), exit type refinement, HR distance, fielding range metrics, GO/AO ratio, BABIP splits by direction.

### 4.2 Play Log as Enrichment Entry Point

Each completed play appears in the scrollable play log:

```
T7  Hayata    1B   [+ fielding] [+ location]
T7  Tanaka    GO   [+ fielding] [+ location]
T7  Sato      K
```

Tapping any play entry opens the enrichment panel for that event. Plays with no available enrichment (BB, HBP, IBB) show no badges.

Strikeouts always show a `[K or Kc?]` badge for called/swinging distinction.
All at-bats show an optional `[pitches?]` badge for pitch count in the AB.

### 4.3 Enrichment Types

#### Field Location (Spray Chart)
- Tap mini-diamond graphic.
- X-coordinate captures spray direction (pull/center/opposite).
- Y-coordinate auto-infers exit type: infield = ground ball, shallow outfield = line drive, deep outfield = fly ball.
- Overrides the implicit exit type from the quick bar button if user provides more specific data.

#### Fielding Sequence
- Tap numbered fielder icons in order: 6 → 4 → 3 for a standard 6-4-3 double play.
- Same `FielderSelector` component reused for putouts, assists, errors, fielder's choice.
- For errors: tap fielder + error type (fielding/throwing).

#### HR Distance
- SMB4 displays distance. Numeric input field.
- Feeds into park factor calculations, power metrics, Fenway scoreboard display.

#### Pitch Type (HR enrichment, optional for all plays)
- Selector: `4-seam | 2-seam | Cutter | Slider | Curve | Changeup | Screwball | Forkball | Unknown`.
- Filtered by current pitcher's repertoire (from League Builder) — only shows pitches that pitcher actually throws, plus Unknown.
- Prompted inline after HR distance (quick add while moment is fresh).
- Available via play log enrichment for any at-bat.
- Builds scouting reports: "Hayata hits .400 on fastballs, .180 on curves."
- Feeds rivalry matchup data: "Bender's changeup owns Hayata: 0-for-6."

#### Pitch Count Per At-Bat
- Numeric input: how many pitches in this at-bat.
- 7+ pitch at-bat is a QAB (quality at-bat) regardless of outcome.
- Feeds pitch count tracking for the pitcher across the game.

#### Pitch Count Per Half-Inning
- Prompted (optional) at end of each half-inning: "Bender's pitch count?"
- **Required** when pitcher is removed from game and at end of game.
- Primary source for pitcher fatigue tracking and bullpen management narrative.

#### Modifiers
- Applied from modifier tray (see Section 7).
- Attached as metadata: `modifiers: ['nut_shot', 'web_gem']`.

### 4.4 Enrichment Timing

| When | Best For | User Experience |
|------|----------|----------------|
| Immediately after play | High-drama moments | Tap badge while it's fresh |
| Between innings | Batch enrichment | Between-inning screen prompts unenriched plays |
| After game | Complete session | Post-game screen shows unenriched count |
| Never | Casual sessions | Core stats still 100% correct |

### 4.5 Enrichment for Gold Glove / Positional Tracking

Every at-bat event records the batter's current position and the defensive alignment at event time (from the lineup state). Every fielding enrichment is tagged with the fielder's current position. Position changes are recorded as between-play events with timestamps.

The Gold Glove engine queries: "All fielding events where playerId=X and position=SS" — no reconstruction needed. Events carry the position context.

**Infield Fly Rule:** IFR is a modifier on a pop-out (PO), not a fly out. When a PO is recorded with runners on 1st+2nd or bases loaded and <2 outs, the system can prompt "IFR?" as a modifier. IFR affects runner advancement rules (runners hold) and is a narrative trigger.

For utility player determination: "Player X has events at SS (400 innings), 3B (200 innings), 2B (100 innings)." Primary position = SS. Gold Glove candidacy = SS only. Utility flexibility affects overall value and EOS ratings adjustment when compared against peers at primary position.

---

## 5. Between-Play Events

### 5.1 Runner Actions

When idle (between at-bats), tapping a runner on the diamond opens a popover:

```
R1: Hayata (on 1B)
[ Steal ] [ Pickoff ] [ Wild Pitch ] [ Passed Ball ] [ Advance ▼ ]
```

- **[Steal]**: Tap destination base → SB or CS based on outcome. 1-2 taps.
- **[Pickoff]**: Sub-options [Safe] [Out] [Error → fielder]. 2-3 taps.
- **[Wild Pitch]**: Runner auto-advances one base or tap destination. Records WP charged to pitcher (pitcher's WP stat, affects pWAR). 1-2 taps.
- **[Passed Ball]**: Same as WP but charged to catcher (catcher's PB stat, affects catcher fWAR). 1-2 taps.

WAR component mapping:
- SB/CS → rWAR (baserunning component)
- WP/PB → fWAR (catcher defense component)
- Steal attempt = manager decision → mWAR

### 5.2 Substitutions

Two entry points, same event:
1. **Lineup card** (comprehensive): Full drag-drop lineup management. Best for double switches, multiple moves.
2. **Diamond tap** (quick contextual): Tap player → [Substitute] → select from roster.

Substitution event records:
```typescript
{
  type: 'pinch_hit' | 'pinch_run' | 'defensive_replacement' | 'position_change' | 'double_switch',
  outPlayerId: string,
  inPlayerId: string,
  position: FieldPosition,
  previousPosition?: FieldPosition
}
```

**Critical for WAR:** Pinch-hitters and pinch-runners are distinct event types that affect Leverage Index/Clutch calculations differently. A pinch-hit HR in high leverage is weighted differently for both the hitter's clutch stats AND the manager's mWAR.

### 5.3 Manager Moments

When LI exceeds a threshold (default: 2.0), the system highlights this as a **Manager Moment** — a high-leverage decision point where the manager's (user's) choice meaningfully impacts win probability.

The system doesn't interrupt the flow. Instead, it marks the current game state as a Manager Moment via a subtle visual indicator (pulsing border on the Quick Bar, or a ⚡ icon). The user's next action — leaving the pitcher in, making a change, calling a steal, etc. — is recorded as a `managerMoment` BetweenPlayEvent.

Manager Moments are tracked across the season as a stat category:
- Total Manager Moments faced
- Decisions made (by type)
- Average WPA outcome of decisions
- "Best Moment" and "Worst Moment" (highest/lowest WPA)
- Manager Moments feed mWAR calculation

Narrative integration: "JK faced 47 Manager Moments this season, with an average WPA of +0.03 — above league average. His boldest move: stealing home in the 9th of Game 142, a +0.38 WPA swing."

### 5.4 Pitcher Changes

Pitcher name in scoreboard is always tappable → [Change Pitcher] → select from roster.

Event records: outgoing pitcher's pitch count, IP, inherited runners. Inherited runners tracked for earned run responsibility — if inherited runner scores, the run is charged to the outgoing pitcher's ERA, not the reliever's.

### 5.5 Position Changes (Non-Substitution)

Player moves SS to 3B mid-game (no new player enters). Diamond tap → [Move Position] popover.

Critical for Gold Glove and defensive WAR: innings at each position must be tracked accurately. The event log timestamps every position change, allowing precise innings-at-position calculations for EOS ratings adjustment.

---

## 6. Mojo & Fitness — User-Reported State

### 6.1 Core Principle

**KBL NEVER calculates mojo or fitness.** SMB4's engine determines these based on inputs the user cannot influence. The user reports what SMB4 shows them. KBL records the report and uses it to weight downstream calculations.

### 6.2 Interaction Model

Player tokens on the diamond (and in the lineup) are always tappable. Tap a player → state popover:

```
Hayata (SS) — .287 / 12 HR
Mojo:    [😰 Rattled] [😬 Tense] [😐 Neutral] [🔒 Locked-In] [😤 Jacked]
Fitness: [🤕 Hurt] [😩 Weak] [😣 Strained] [👍 Well] [💪 Fit] [💉 Juiced]
[Injury: None ▼]
```

One tap to change mojo level. One drag or tap segment to adjust fitness. Changes save immediately as `BetweenPlayEvent` with `type: 'mojo_change'` or `type: 'fitness_change'`.

Default at season start: **Neutral** (mojo) + **Fit** (fitness).

### 6.3 Context Linking

The `linkedPlayId` field ties mojo/fitness changes to the at-bat that triggered them. User changes Hayata's mojo to Hot right after his single → system links the change to that event via temporal proximity. The narrative engine infers causation: "Hayata's mojo surged to Hot after his clutch single."

The system never states WHY mojo changed (it doesn't know — SMB4 decides). It observes WHEN mojo changed relative to game events, which is sufficient for narrative and weighting.

### 6.4 WAR/LI/Clutch Weighting

At event creation, the batter's and pitcher's current mojo and fitness are snapshotted into `batterContext` and `pitcherContext`. This data feeds into WAR components per existing specs:

- **Player with Ice Cold mojo who still hits .300** is outperforming adjusted expectations → WAR should reflect this.
- **Pitcher with low fitness who still records outs** is more valuable than raw numbers suggest.
- **Mojo state at the moment of a clutch play** affects clutch attribution weighting.
- **Fitness state at end of game** informs pitcher usage patterns for mWAR (did the manager leave a tired pitcher in too long?).

The weighting formulas in MOJO_FITNESS_SYSTEM_SPEC remain exactly as written. They just read from user-reported state instead of engine-calculated state.

---

## 7. Modifier Registry

### 7.1 Architecture

Instead of hardcoding SMB4 quirk buttons, build an extensible registry:

```typescript
interface GameModifier {
  id: string;                    // 'nut_shot', 'killed_pitcher', 'web_gem'
  label: string;                 // Display name
  icon: string;                  // Emoji or icon reference
  appliesTo: 'pitcher' | 'batter' | 'fielder' | 'play';
  trigger: 'before_play' | 'after_play' | 'anytime';
  category: 'smb4' | 'custom';
  
  // Optional engine hooks
  narrativeHook?: (event: AtBatEvent) => NarrativeFragment;
  mojoEffect?: { target: 'batter' | 'pitcher' | 'fielder'; direction: 'up' | 'down'; magnitude: number };
  fitnessEffect?: { target: 'batter' | 'pitcher' | 'fielder'; direction: 'down'; magnitude: number };
}
```

### 7.2 Default SMB4 Modifiers

| ID | Label | Icon | Applies To | Effects |
|----|-------|------|-----------|---------|
| `nut_shot` | Nut Shot | 🥜 | pitcher | Fitness down, mojo down, narrative trigger |
| `killed_pitcher` | Killed Pitcher | 💀 | pitcher | Fitness down (major), possible injury, narrative trigger |
| `drilled` | Drilled! | 🎯 | pitcher | Line drive off pitcher; fitness risk, narrative trigger |
| `web_gem` | Web Gem | 💎 | fielder | Mojo up, fame event, narrative trigger |
| `robbed_hr` | Robbed HR | 🧤 | fielder | Mojo up (fielder), mojo down (batter), fame event |
| `diving_catch` | Diving Catch | 🤸 | fielder | Fitness risk, fame event |
| `missed_dive` | Missed Diving Catch | ❌ | fielder | Mojo down, narrative trigger (frustration moment) |
| `beat_throw` | Beat the Throw | 💨 | batter/fielder | Highlights arm strength differential. Batter: speed value. Fielder: weak arm indicator. Tracked for fWAR (fielder arm metric) and narrative (recurring arm issues). |
| `close_play` | Beat Runner by a Step | ⚡ | fielder | Premium arm/range play. Positive fWAR signal. "Diving stop in the hole, fires to first — GOT HIM by a step!" |
| `out_stretching` | Out Stretching | 🏃💥 | runner/fielder | Runner thrown out trying to advance an extra base. Negative rWAR for runner, positive fWAR for fielder who made the throw. |
| `mental_error` | Mental Error | 🧠 | any player | Covers TOOTBLAN, wrong-base throws, missed cutoffs, baserunning blunders, not covering a bag. Applied via error assignment with type='mental'. Narrative gold — beat reporters love these. |
| `ifr` | Infield Fly Rule | 📢 | play | Modifier on pop-out (PO) with runners on 1st+2nd or bases loaded, <2 outs. Runners hold; batter automatically out. |

**Removed:** `collision` (impossible in SMB4).

### 7.3 Modifier Tray (Quick Bar Row 2)

```
[ 🥜 Nut Shot ]  [ 💀 Killed ]  [ 💎 Web Gem ]  [ 💨 Beat Throw ]  [ ⚙ More ]
```

Appears below the main Quick Bar. Tapping a modifier attaches it to the most recent play OR prompts for which play/player if ambiguous.

**Ambiguity resolution:** When a modifier is tapped, the system checks for a "most recent play" within the last 30 seconds. If found, it attaches to that play. If no recent play exists (or the modifier applies to a specific player rather than a play), a popover appears showing recent play log entries: "Apply to which play?" For player-specific modifiers (nut_shot → pitcher), it defaults to the current pitcher/batter based on modifier type. The user can always override by tapping a different play log entry.

### 7.4 Extensibility

Adding a new SMB4 quirk six months from now:
1. Add entry to modifier registry (one object).
2. Optionally add narrative hook (one function).
3. Automatically appears in modifier tray.

No flow changes. No state machine changes. No component changes. Future: `[+ Add]` button lets users create custom modifiers from UI.

**Franchise tracking connection:** Modifiers are persisted on events and queryable at the franchise level. Season-long aggregation creates new stat categories: "Most web gems" (Gold Glove indicator), "Most mental errors" (reliability concern), "Most beat throws" (arm strength tracking), "Most out-stretching events" (aggressive baserunning profile). These feed into beat reporter narratives, awards conversations, trade valuations, and the record book.

---

## 8. Narrative Integration — The Living Franchise

### 8.1 The GameTracker as Beat Reporter's Notebook

Every event is a potential story. The narrative engine's job is picking which stories are worth telling. With leverage index, mojo state, milestone flags, and rivalry data all embedded in events, selection becomes trivially easy.

The beat reporter reads ALL franchise data sources, not just game events:
- Game events (at-bats, between-play)
- Fame score changes
- Player morale shifts
- Fan morale changes → contraction risk assessment
- Manager performance evaluation → firing risk from mWAR
- Roster transactions (call-ups, send-downs, trades)
- Award race standings (MVP, Cy Young, ROY, Gold Glove)
- Record chases (career and single-season)
- Injury reports (from fitness events)
- Mojo streaks (player on 5+ game hot/cold streak)
- Manager Moments and their outcomes
- PED suspicion (players with Juiced fitness state)

### 8.2 Narrative Trigger Map

```
EVENT TYPE                → NARRATIVE TRIGGERS
──────────────────────────────────────────────────
At-bat result             → Milestone check (career/season)
                          → Streak detection (hitting/slump)
                          → Clutch performance (LI > 2.0)
                          → Rivalry matchup result
                          → Record chase update
                          → Quality at-bat tracking

Mojo change               → Hot/cold streak narrative
                          → Rivalry intensity shift
                          → Team chemistry impact
                          → "Gutting it out" storyline (low mojo, still performing)

Fitness change             → Injury drama narrative
                          → Pitcher fatigue story
                          → "Playing through pain" storyline
                          → DL stint trigger

Stolen base/CS             → Speed weapon narrative
                          → Manager aggression metric (mWAR)
                          → Rivalry baserunning drama

Pitching change            → Bullpen management narrative
                          → Inherited runners drama
                          → Manager second-guessing storyline
                          → "Hook" timing analysis

Substitution               → Pinch-hit hero potential
                          → Matchup management narrative
                          → Late-game strategy analysis
                          → Manager Moment (if LI > 2.0)

Manager Moment             → Decision narrative ("JK left Bender in...")
                          → Outcome tracking (WPA of resulting play)
                          → Season-long manager narrative arc
                          → mWAR contribution

Fitness = Juiced           → PED suspicion narrative arc
                          → Beat reporter skepticism ("Sudden power surge...")
                          → Fan morale: slight negative (scandal concern)
                          → NOT a stat penalty — purely narrative flavor

Inning end                 → Inning summary
                          → Momentum shift detection
                          → Pitching duel / slugfest classification
                          → "Turning point" identification

Game end                   → Game story arc classification
                          → Player of the Game (3 tiers: 1st/2nd/3rd PoG by WPA)
                          → Milestone celebration
                          → Mojo/fitness recalibration display
                          → Season implications (playoff race, standings)
                          → Beat reporter full game recap
                          → Manager Moment summary
                          → Depth score for enrichment completeness

Season milestone           → Awards race update
                          → Record pace tracking
                          → Hall of Fame probability shift
                          → "Career year" narrative
```

### 8.3 Between-Inning Summary

When 3 outs recorded, optional brief screen appears:

```
┌──────────────────────────────────────────────────┐
│           END OF TOP 7TH                         │
│                                                  │
│  📰 "Hayata's clutch single snapped an 0-for-12 │
│   drought and tied the game at 3. His 500th      │
│   career hit came against rival Bender."         │
│                                                  │
│  📊 This Inning: 2 H, 1 R, 1 BB                │
│  ⚡ Key Moment: Hayata 1B (WPA +.23)            │
│                                                  │
│  🔧 Enrich: [ Tanaka GO ] [ Yamada 2B ]         │
│                                                  │
│  [ Continue to Bottom 7th → ]                    │
└──────────────────────────────────────────────────┘
```

Three purposes: narrative display moment, enrichment reminder, broadcast-booth feel. Skippable with one tap.

### 8.4 Post-Game Summary

```
┌──────────────────────────────────────────────────┐
│        FINAL: SIRLOINS 5, BEEWOLVES 3            │
│                                                  │
│  ⭐ 1st Player of the Game: Hayata               │
│     2-for-4, 2 RBI, game-tying hit, 500th hit   │
│  ⭐ 2nd PoG: Tanaka — 6 IP, 2 ER, 8 K           │
│  ⭐ 3rd PoG: Sato — diving catch in 7th          │
│                                                  │
│  📰 Game Story: "The Sirloins rallied from..."   │
│                                                  │
│  🏆 Milestones:                                  │
│  • Hayata: 500th career hit                      │
│  • Bender: 1000th career strikeout               │
│                                                  │
│  📈 Mojo Changes:                                │
│  Hayata: NEUTRAL → HOT                           │
│  Bender: HOT → COLD                              │
│                                                  │
│  🔧 Unenriched plays: 12 of 54                   │
│  [ Enrich Now ] [ Skip ]                         │
│                                                  │
│  [ Save & Return to Franchise → ]                │
└──────────────────────────────────────────────────┘
```

This is where the event stream becomes franchise data. Everything computed during the game gets committed to the franchise database. The user sees the narrative payoff of their tracking work.

### 8.5 Live Broadcast Color (During Game)

After each 1-tap entry, a small toast or ticker at the top of the Fenway scoreboard:

```
"500th career hit for Hayata! 🎉"
"Bender's pitch count hits 97 — bullpen stirring"
"Tying run scores — WPA +.23"
"Hayata now 4-for-8 lifetime vs Bender 🔥"
```

Zero extra taps. System generates from event context fields. Makes the GameTracker feel like a broadcast booth, not a data entry screen.

### 8.6 Beat Reporter Integration

The beat reporter (from NARRATIVE_SYSTEM_SPEC) reads events and generates coverage based on their personality type. NARRATIVE_SYSTEM_SPEC defines 10 personality types (OPTIMIST, PESSIMIST, BALANCED, DRAMATIC, ANALYTICAL, HOMER, CONTRARIAN, INSIDER, OLD_SCHOOL, HOT_TAKE).

**Reporter Trustworthiness:** Each reporter has a hidden trustworthiness score (0-100) tied to personality:
- High trustworthiness (70-100): ANALYTICAL, BALANCED, INSIDER
- Medium trustworthiness (40-69): OPTIMIST, PESSIMIST, OLD_SCHOOL, DRAMATIC
- Low trustworthiness (10-39): HOMER, CONTRARIAN, HOT_TAKE

Trustworthiness affects the accuracy of their reporting. A HOMER reporter might spin a loss as "moral victory," inflating fan expectations. A HOT_TAKE reporter might overreact to a slump, tanking fan morale unnecessarily. Each reporter should feel unique — personality + trustworthiness + tenure + team assignment creates distinct voice.

**Fan Morale Influence:** Reporter spin subtly influences fan morale, which cascades to contraction risk, manager firing risk, and player morale. This is intentionally subtle — the on-field product (actual game results from events) drives 80%+ of fan experience. Reporter influence is the remaining 10-20%, enough to create narrative drama without overwhelming gameplay reality. A bad reporter assigned to a bad team can make a rough season feel worse; a good reporter can find silver linings that keep fans engaged.

**AI-Generated Content (Future):** Architecture supports LLM-generated beat reporter content. Event data → prompt template with reporter personality context → LLM API → generated recap. The event model carries all context an LLM would need. Initially template-based; AI generation is a Phase 5+ or premium feature. The interface should be designed now to swap seamlessly between template and AI generation.

Examples by personality:

- **OPTIMIST** reporter on a loss: "Despite the defeat, Hayata's historic 500th hit gives fans something to celebrate."
- **PESSIMIST** reporter on a win: "The Sirloins squeaked by, but Bender's 97-pitch outing raises questions about workload management."
- **DRAMATIC** reporter: "IN THE BOTTOM OF THE SEVENTH, WITH THE SEASON ON THE LINE..."
- **HOT_TAKE** reporter after 2-game losing streak: "Is this the beginning of the end for the Sirloins dynasty?"
- **ANALYTICAL** reporter: "Hayata's 500th hit came at a Leverage Index of 2.87, the highest-leverage milestone hit in franchise history."

**Beat Reporter as Overlay Element:** The beat reporter content should appear as a floating overlay/sidebar accessible from any screen (franchise home, game tracker, stats views) — not confined to a single "news" page. Think of it as an always-available news ticker that can be expanded to full articles.


---

## 9. Franchise Data Flow — Event to Career

### 9.1 The Pipeline

This is the OOTP 12-step pipeline adapted for KBL's event-driven model. Every step reads from events or from the output of a prior step. No step maintains independent state.

```
GAME IN PROGRESS                              POST-GAME (atomic)
─────────────────                              ──────────────────
1. User taps outcome                    ──►    5. Season stats += game stats
2. Event created with full context             6. Standings update (W/L/GB)
3. Milestone/clutch/narrative hooks fire        7. Leaderboards refresh
4. Display updates (Fenway board, log)         8. WAR components recalculate
                                               9. Milestone check (career level)
                                              10. Narrative: game recap + milestones
                                              11. Fame evaluation
                                              12. Schedule mark complete

                                        END OF SEASON
                                        ──────────────
                                        13. Final stats locked
                                        14. Career totals updated
                                        15. Awards voted
                                        16. HOF eligibility checked
                                        17. Records updated
                                        18. EOS ratings adjustment
                                        19. Offseason begins
```

### 9.2 Data Store Map

For a single home run in the 7th inning, these stores are touched:

| Step | Store | Operation |
|------|-------|-----------|
| 1 | `eventLog` (IndexedDB) | Write AtBatEvent with full context |
| 2 | `gameState` (in-memory) | Update score, bases, outs |
| 3 | `milestones` (IndexedDB) | Check career HR vs thresholds |
| 4 | `fameEvents` (IndexedDB) | Evaluate if play qualifies for fame |
| 5 | `seasonBatting` | H, HR, RBI, R incremented; BA/OBP/SLG recalculated |
| 5 | `seasonPitching` | H, HR, ER incremented; ERA/WHIP/FIP recalculated |
| 5 | `seasonFielding` | PO/A/E from enrichment data |
| 6 | `standings` | W/L updated, GB recalculated, playoff implications |
| 7 | `leaderboards` | HR leaderboard refreshed |
| 8 | `warComponents` | Batting runs recalculated (bWAR, positional adjustment) |
| 9 | `milestones` | Career HR total checked (500 HR → major milestone) |
| 10 | `narrativeEvents` | Beat reporter generates game recap + milestone story |
| 11 | `fameTracking` | Fame score updated based on milestone + game context |
| 12 | `schedule` | Game marked complete |

### 9.3 The Replay Guarantee

Because every downstream store is derivable from events, any corruption or bug is fixable:

```typescript
async function replaySeasonFromEvents(seasonId: string): Promise<void> {
  const events = await getAllEvents({ seasonId });
  await clearDerivedStores(seasonId); // stats, standings, WAR, milestones, fame

  for (const game of groupByGame(events)) {
    await aggregateGameToSeason(game);
    await updateStandings(game);
    await calculateWAR(seasonId);
    await checkMilestones(game);
    await evaluateFame(game);
  }
}
```

This is the nuclear option — but its existence means we never lose data. Events are the backup. Everything else is a cache.

### 9.4 What Existing Specs Still Govern

The pipeline steps above reference existing spec documents that remain fully valid:

| Pipeline Step | Governing Spec | Status |
|--------------|---------------|--------|
| Season stats aggregation | STAT_TRACKING_ARCHITECTURE_SPEC | Valid |
| Pitcher stats | PITCHER_STATS_TRACKING_SPEC | Valid |
| Fielding stats | FIELDING_SYSTEM_SPEC, FIELDING_PIPELINE_MAPPINGS | Valid |
| WAR calculation | BWAR, FWAR, PWAR, RWAR, MWAR specs | Valid |
| Leverage / Clutch | LEVERAGE_INDEX_SPEC, CLUTCH_ATTRIBUTION_SPEC | Valid (fix F-099 LI dual-value) |
| Milestones | MILESTONE_SYSTEM_SPEC | Valid |
| Fame | FAN_FAVORITE_SYSTEM_SPEC | Valid |
| Narrative | NARRATIVE_SYSTEM_SPEC | Valid (enhanced by event context) |
| Inherited runners | INHERITED_RUNNERS_SPEC | Valid |
| Runner advancement | RUNNER_ADVANCEMENT_RULES | Valid |
| Mojo/Fitness | MOJO_FITNESS_SYSTEM_SPEC | Valid (user-reported, not engine-calculated) |
| Awards | AWARDS_CEREMONY_FIGMA_SPEC | Valid |
| EOS Ratings | EOS_RATINGS_ADJUSTMENT_SPEC | Valid |

**No existing spec is invalidated.** The event model is the delivery mechanism that makes these specs actually work by ensuring every downstream system receives the data it needs.

---

## 10. Franchise Mode — Through the Event Lens

### 10.1 The Reframe

Franchise mode in OOTP is a simulation that generates events internally. Franchise mode in KBL is a management layer that consumes events generated by real gameplay. This distinction changes what "franchise mode" means:

**OOTP franchise mode asks:** "What should happen next?" (AI decides)
**KBL franchise mode asks:** "What DID happen, and what does it mean?" (User played it, system interprets)

This is KBL's fundamental advantage. Every stat, every narrative, every award is backed by actual gameplay. There's no simulation fudging. The user earned every win and suffered every loss. The franchise experience is richer because it's real.

### 10.2 Season Flow (Event-Driven)

```
SEASON START
  │
  ├── League Builder provides: teams, rosters, schedule, settings
  ├── Offseason provides: updated rosters, ratings, contracts
  │
  ▼
REGULAR SEASON (162 games per team)
  │
  ├── For each game:
  │     User plays in SMB4 → Records in GameTracker (1-tap) → Events flow to pipeline
  │     Post-game: stats aggregate, standings update, narrative generates
  │
  ├── Between games:
  │     Franchise home shows: standings, leaders, storylines, upcoming schedule
  │     Beat reporters publish: game recaps, trend stories, milestone coverage
  │     User can: view stats, make trades, manage roster, check WAR/awards races
  │
  ├── Mid-season events:
  │     All-Star break (top performers by WAR + fan vote)
  │     Trade deadline (trade engine evaluates offers using event-derived player value)
  │     September callups (farm system → active roster)
  │
  ▼
POSTSEASON
  │
  ├── Bracket seeded from standings (per PLAYOFF_SYSTEM_SPEC)
  ├── Playoff games tracked with same GameTracker (separate stat tables per F-113)
  ├── Clutch/LI multiplied in postseason context
  │
  ▼
OFFSEASON (11 phases per OFFSEASON_SYSTEM_SPEC)
  │
  ├── All phases consume season data derived from events
  ├── Awards voted from WAR + stats (derived from events)
  ├── Ratings adjusted from performance vs peers (derived from events)
  ├── Contract values from performance metrics (derived from events)
  │
  ▼
NEXT SEASON START
```

### 10.3 Franchise Home — The War Room

The Franchise Home page becomes the command center between games. Everything displayed is derived from events:

**Standings Panel:**
- Live standings calculated from game results (events → W/L → standings)
- Magic numbers, playoff probabilities
- Strength of schedule remaining

**Leaders Panel:**
- League leaders across all stat categories
- WAR leaderboard (positional + overall)
- Awards race tracker (MVP, Cy Young, ROY)

**News Feed (Beat Reporter):**
- Game recaps from recent games
- Milestone stories ("Hayata reaches 500 career hits")
- Trend stories ("Sirloins have won 8 of 10, powered by bullpen ERA of 2.14")
- Trade rumors (when trade deadline approaches)
- Injury updates (from fitness change events)

**My Team Panel:**
- Roster with current stats, mojo indicators, fitness status
- Team batting/pitching splits
- Upcoming schedule with probables

**What makes this uniquely KBL:** Every data point traces back to a play the user actually made in SMB4. The "Hayata has 499 hits" milestone proximity wasn't calculated by a simulation — it was accumulated play by play by the user. The emotional weight is different from OOTP because the user was there for each hit.

### 10.4 Trade System — Event-Informed Valuation

The current trade system (TRADE_SYSTEM_SPEC) evaluates player value based on stats. With the event model, trade value assessment becomes much richer:

```typescript
interface PlayerTradeProfile {
  // Standard stats (derived from events)
  seasonStats: SeasonStatLine;
  careerStats: CareerStatLine;
  war: { bWAR: number; fWAR: number; pWAR: number; rWAR: number; mWAR: number };

  // Event-derived context (new, unique to KBL)
  clutchPerformance: {
    highLeverageBA: number;       // BA in LI > 1.5 situations
    clutchWPA: number;            // Total WPA in high-leverage
    postseasonExperience: number; // Playoff games played
  };
  durability: {
    gamesPlayed: number;
    fitnessHistory: FitnessSnapshot[];  // From mojo/fitness events
    injuryHistory: InjuryEvent[];
  };
  intangibles: {
    mojoTrend: 'rising' | 'stable' | 'declining';
    rivalryMatchups: MatchupRecord[];
    traits: string[];
    fameLevel: FameLevel;
  };
}
```

**KBL unique advantage:** OOTP trade AI uses simulated projections. KBL trade evaluation uses actual recorded performance in actual gameplay contexts. "This pitcher has a 2.87 ERA but his high-leverage ERA is 4.50" — that's data OOTP can't surface because its events are simulated, not observed.

### 10.5 Farm System — Development Tracked Through Events

The farm system (FARM_SYSTEM_SPEC) holds 10 players per team in a development pool. Under the event model:

- Farm players who get called up and play in games generate events.
- Their development is tracked through actual gameplay performance, not simulated.
- Rating adjustments at EOS are informed by events: "This prospect hit .290 in his 30 call-up games with a .320 average in high-leverage situations — adjust ratings upward."
- Traits earned at awards ceremonies are persisted per TRAIT_SYSTEM spec.

**What KBL does differently from OOTP:** OOTP simulates farm system development with probability curves. KBL tracks actual development through real gameplay events. A prospect's "breakout" isn't a random roll — it's 30 games of the user watching them improve in SMB4 and recording the results.

#### Expected Value Baselines

To evaluate farm prospects (especially those who haven't been called up yet), KBL needs a **rating-to-expected-performance conversion curve**. This answers the question: "Given a player rated 70 contact and 60 power, what SHOULD their batting line look like?"

```
Expected Value = f(ratings, position, age, league average)
```

- A prospect rated 80 contact hitting .220 is **underperforming** → development concern.
- A prospect rated 50 contact hitting .310 is a **breakout** → adjust ratings up aggressively.
- A prospect who hasn't been called up yet is evaluated purely on ratings vs. expected curves, weighted by age (younger = more upside).

**OOTP prospect valuation logic (to leverage):** OOTP values farm prospects using: (1) current ratings vs. potential ceiling, (2) age-relative development curve (how far along the growth curve are they?), (3) position scarcity (a SS prospect is worth more than a 1B prospect at similar ratings), (4) organizational depth (team with a star SS values a SS prospect less than a team with no SS). KBL should adapt this model for trade valuation — a farm prospect who hasn't played yet still has a calculable "True Value" based on ratings, age, position, and team need. This enables meaningful farm-for-MLB trades where the system can evaluate fairness.

**Review needed:** Exact conversion curves (rating → expected stat line) need calibration against SMB4's actual performance distributions. The trait system spec may also contain modifiers that affect expected value.

### 10.6 Relationships — Emergent from Events

The relationship system (currently orphaned per F-119) becomes naturally wired under the event model:

Every batter-pitcher matchup is a data point in their relationship arc. Over a season, the event stream builds a complete history:

```
Hayata vs. Bender:
  G1: K (LI=0.3)  → Bender dominates early
  G4: 1B (LI=1.2) → Hayata adjusts
  G7: HR (LI=3.1) → Hayata takes over rivalry
  G9: K (LI=0.8)  → Bender responds
```

**Storylines become emergent, not scripted.** The data shows two players who face each other repeatedly with escalating leverage and alternating outcomes. The narrative engine detects the pattern and names it.

Rivalry detection criteria (from event stream analysis):
- 3+ matchups in a season
- Alternating outcomes (not one-sided)
- Escalating leverage (the game keeps putting them in big moments)
- Opposite teams that play frequently (division rivals)

The relationship engine doesn't need manual wiring to active callers. It reads from the event store. Re-enabling it (F-119) means: point it at the event store, let it scan for patterns, output to the narrative engine and the Fenway scoreboard.

### 10.7 Records and Museum

The record book (currently orphaned per F-122) and museum/HOF (partially wired per F-117) become straightforward:

- **Single-season records:** `MAX(stat) across all seasonStats for that franchise`
- **Career records:** `MAX(careerStat) across all players in franchise`
- **Hall of Fame:** Career totals + WAR + awards + fame score → eligibility formula
- **Museum exhibits:** Top moments by WPA, milestone events, championship games

All derived from events. The record book doesn't need its own data pipeline — it queries the stat stores that are already populated by the event pipeline.

---

## 11. League Builder — Foundation Layer

### 11.1 Role in the Architecture

League Builder sits BELOW the franchise/season layer. It provides the entities that everything else operates on:

```
League Builder (foundation)
  ├── Teams (names, logos, stadiums)
  ├── Players (ratings, traits, positions, handedness)
  ├── Divisions / Conference structure
  ├── Schedule template (162-game grid)
  ├── League rules (DH, playoff format, roster size)
  └── Stadium configurations (park factors)

       ▼ feeds into ▼

Franchise Mode (season management)
  ├── Active rosters (drawn from League Builder players)
  ├── Farm rosters
  ├── Salary structure
  ├── Season schedule (generated from League Builder template)
  └── Season state (current game, standings, etc.)

       ▼ feeds into ▼

GameTracker (event production)
  ├── Lineup (from active roster)
  ├── Game context (from schedule)
  └── Events (from user input)

       ▼ feeds into ▼

Everything Else (event consumption)
  ├── Stats, WAR, Awards, Narrative, Fame, Records, Museum
```

### 11.2 What League Builder Needs to Provide (Event Model Requirements)

For the event model to work, League Builder must ensure every player has the following fields. These are organized by player type:

#### Position Player Fields

| Field | Required For | CSV Column | Currently Implemented? |
|-------|-------------|-----------|----------------------|
| playerId | Event identity | auto-generated | ✅ Yes |
| firstName | Display, narrative | `first_name` | ✅ Yes |
| lastName | Display, narrative | `last_name` | ✅ Yes |
| age | Aging engine, EOS, retirement | `age` | ✅ Yes |
| gender | Display | `gender` | ✅ Yes |
| handedness (bat/throw) | Platoon calcs, matchup context | `bats` / `throws` | ✅ Yes |
| primaryPosition | Gold Glove, defensive WAR, positional adj | `primary_pos` | ✅ Yes |
| secondaryPosition | Utility designation, lineup flexibility | `secondary_pos` | ⚠️ Needs verification |
| contact | EOS baseline, batting projection | `contact` | ✅ Yes |
| power | EOS baseline, HR projection | `power` | ✅ Yes |
| speed | Baserunning WAR, steal projection | `speed` | ✅ Yes |
| fielding | Defensive WAR, Gold Glove | `fielding` | ✅ Yes |
| arm | Throwing accuracy/strength, fWAR (NOT for pitchers) | `arm` | ✅ Yes |
| trait1 | Clutch calc, narrative, awards ceremony | `trait1` (empty if none) | ⚠️ Field exists, dropdown not wired (F-104) |
| trait2 | Clutch calc, narrative, awards ceremony | `trait2` (empty if none) | ⚠️ Field exists, dropdown not wired (F-104) |
| chemistryType | Relationship engine, team chemistry | `chemistry` | ✅ Yes |
| salary | Contract management, trade value | `salary` | ✅ Yes |
| grade | Overall rating display | `grade` | ✅ Yes |
| personality | Narrative, FA behavior, trade demand (HIDDEN from user) | `personality` (optional) | 🆕 New — see note below |

#### Pitcher Fields

| Field | Required For | CSV Column | Currently Implemented? |
|-------|-------------|-----------|----------------------|
| (all common fields above except `arm`) | — | — | — |
| velocity | Pitching projection, EOS | `velocity` | ✅ Yes |
| junk | Pitching projection, EOS | `junk` | ✅ Yes |
| accuracy | Pitching projection, EOS | `accuracy` | ✅ Yes |
| contact | Batting (NL/no-DH leagues) | `contact` | ✅ Yes |
| power | Batting (NL/no-DH leagues) | `power` | ✅ Yes |
| speed | Baserunning if batting | `speed` | ✅ Yes |
| fielding | Pitcher fielding (comebacker handling) | `fielding` | ✅ Yes |
| pitchRepertoire | Scouting reports, enrichment validation, narrative | `pitches` (comma-separated) | ✅ Yes (checkboxes in League Builder) |

**Pitch Repertoire (checkboxes — select all that apply):** 4-seam fastball, 2-seam fastball, cutter, slider, curve, changeup, screwball, forkball. Stored as an array of pitch type IDs. Used for: (1) pitch type enrichment validation — if user tags a HR as "off a screwball" but the pitcher doesn't throw one, flag as potential error, (2) scouting reports — "Bender relies on his curve against lefties," (3) narrative — "Hayata crushed a forkball 410 feet — a pitch Tanaka rarely throws."

**Note on `arm`:** Pitchers do NOT have an arm rating — their arm is captured by velocity/junk/accuracy. Position players use arm for throw strength/accuracy.

**Note on `personality`:** Personality attributes (leadership, loyalty, desireForWinner, greed, workEthic, intelligence — per OOTP model) are **hidden from the user**. They drive narrative surprise: a player with high greed demands more in free agency; low loyalty increases trade request probability; high leadership boosts team morale. Personality should be included in CSV import as an optional field. If omitted, the system assigns personality randomly from OOTP-style distribution curves. Discussion needed on exact personality model — goal is to leverage OOTP's approach while keeping attributes hidden so narrative elements feel organic and surprising to the user.

#### CSV Import

League Builder supports CSV import for rapid setup. Two CSV files:

1. **teams.csv**: `team_name, abbreviation, division, stadium_name, park_factor_ba, park_factor_hr, park_factor_doubles, park_factor_triples`
2. **players.csv**: All fields from the tables above. One row per player. Team assignment via `team_abbrev` column.

CSV import validates required fields, rejects rows with missing data, and shows a preview before committing. This is a major UX improvement — setting up a 10-team league with 25-man rosters manually is 250+ player entries. CSV import reduces setup from hours to minutes.

**Import SMB4 Roster:** Because SMB4 has pre-built teams with known players, League Builder could include an "Import SMB4 Roster" flow that pre-populates all 10 teams with correct players, ratings, and traits from the SMB4 data files. This eliminates the most tedious part of setup and gets users into games faster.

### 11.3 League Builder → Franchise Handoff

When user starts a new franchise from League Builder:

1. **Copy teams/players** into franchise-scoped storage (not reference — copy, so League Builder changes don't affect active franchise)
2. **Generate schedule** from template (per SCHEDULE_SYSTEM_FIGMA_SPEC)
3. **Initialize salary structure** (per SALARY_SYSTEM_SPEC)
4. **Set initial standings** (all 0-0)
5. **Create franchise record** with franchiseId, seasonId=1
6. **Redirect to Franchise Home**

This handoff must be atomic. If any step fails, the franchise isn't created. IndexedDB transaction ensures this.

### 11.4 Multi-League / Custom League Vision

Long-term, League Builder supports custom leagues beyond SMB4's default 10 teams:

- Import custom team/player data
- Configure league size (6, 8, 10, 12+ teams)
- Set custom rules (DH in both leagues, 7-inning games, extended playoffs)
- Adjust schedule length (82, 120, 162 games)
- Set park factors per stadium

All of this is upstream of the event model. The event model doesn't care if there are 10 teams or 30 — it records what happens play by play regardless of league configuration.

---

## 12. Offseason — Event Consumers

### 12.1 How Events Inform Each Offseason Phase

The 11-phase offseason (per OFFSEASON_SYSTEM_SPEC) consumes data that all originates from in-game events. Here's the flow:

| Phase | What It Needs | Where It Comes From |
|-------|--------------|-------------------|
| 1. Season End | Final standings, stat leaders | Events → season stats → standings |
| 2. Awards | WAR, stats, peer comparison | Events → season stats → WAR calc |
| 3. Ratings Adj | Performance vs expectations, position played | Events → stats + positional tracking |
| 4. Contraction | Team record, fan morale, market size | Events → standings + fan morale events |
| 5. Retirement | Age, declining stats, career totals | Events → career stats + rating trends |
| 6. Free Agency | Player value, contract demand | Events → WAR + clutch performance |
| 7. Draft | Team needs, pick order | Events → standings (reverse order) |
| 8. Farm Reconcile | Prospect performance | Events from call-up games |
| 9. Chemistry | Team trait distribution | Player traits (from League Builder) |
| 10. Trades | Player value comparison | Events → full trade profile (see 10.4) |
| 11. Season Prep | Roster decisions | All accumulated data |

### 12.2 EOS Ratings Adjustment — Event-Enhanced

The EOS Ratings Adjustment spec compares player performance to peers at the same position. With the event model, this comparison is much richer:

**Standard comparison (current):** Player A hit .290, league average SS hit .260 → adjust up.

**Event-enhanced comparison (new):** Player A hit .290 overall, .320 in high-leverage (LI > 1.5), played 120 games at SS and 30 at 3B (utility value), clutch WPA of +2.3, rising mojo trend. League average SS hit .260 overall, .240 in high-leverage, averaged 140 games at SS only, clutch WPA of +0.5. → Adjust significantly up, flag as Gold Glove candidate, flag as potential position flexibility bonus.

The events carry the context that makes ratings adjustment more nuanced and accurate. Instead of "did they hit well?" the system asks "did they hit well when it mattered, at a premium position, while maintaining fitness?"

### 12.3 Awards — Event-Backed Narratives

Awards ceremonies currently display winners with stats. With events, they can display moments:

**MVP Presentation:**
> "Hayata, .312/.387/.524, 7.2 WAR. His signature moments this season:"
> - Walk-off single, Game 47 (WPA +.45, LI=4.2)
> - 500th career hit vs rival Bender (WPA +.23, LI=2.87)
> - 3-HR game against Platypi (WPA +.31)

Each highlight is a real event the user played and recorded. The emotional payoff is that the user REMEMBERS these moments because they were there.

### 12.4 Hall of Fame — Career Story

HOF evaluation under the event model:

```typescript
interface HOFCase {
  // Standard metrics
  careerWAR: number;
  careerStats: CareerStatLine;
  awardsCount: { mvp: number; goldGlove: number; allStar: number; /*...*/ };
  peakSeasons: number;  // Seasons with WAR > 5.0

  // Event-derived uniqueness (KBL exclusive)
  clutchCareerWPA: number;         // Total career WPA in high-leverage
  postseasonPerformance: {
    games: number;
    battingAvg: number;
    clutchMoments: AtBatEvent[];   // Top 5 postseason WPA events
  };
  milestoneEvents: MilestoneEvent[];  // Every career milestone with full context
  rivalryRecord: {                    // Head-to-head vs notable opponents
    opponentId: string;
    record: { ab: number; h: number; hr: number };
  }[];
  fameScore: number;                  // Accumulated fame from event-level evaluation
}
```

The HOF induction ceremony can play back the player's greatest moments — each one a real event from a real game the user played.

### 12.5 Offseason Fixes Required (from Audit)

These offseason issues from the audit are infrastructure-level and independent of the event model:

| Finding | Issue | Fix |
|---------|-------|-----|
| F-112 | clearSeasonalStats scans localStorage, stats in IndexedDB | Point at correct store |
| F-118 | Aging engine display-only, no write-back | Wire write-back to player record |
| F-121 | Player Dev Engine missing | Define KBL development model (see 12.6) |
| F-104 | Trait system unwired | Wire traitPools.ts to creation + ceremony |

### 12.6 Player Development Model — KBL's Approach

OOTP uses a 10-factor development model with simulated growth curves. KBL can't simulate development because players are played in SMB4 where ratings are fixed per game.

**KBL's development model is EOS ratings adjustment.** Between seasons, ratings change based on:
1. Performance vs peers (from events)
2. Age curve (from aging engine)
3. Traits (modifiers from traitPools.ts)
4. Playing time (from events — games played, innings)
5. Special events (awards, milestones, injuries)

This is simpler than OOTP's 10-factor model but more authentic — ratings change based on what actually happened, not a random development roll.

---

## 13. iPad Layout & Display Architecture

### 13.1 Primary Platform

iPad in landscape (horizontal) mode is the target platform. Browser-based initially, potential native app later.

### 13.2 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ BEE 3  │ T7  2 OUT │  SIR 2  │  Hayata vs Bender (3-7, .429)    │
│─────────────────────────────────────────────────────────────────────│
│                    │                              │ PLAY LOG       │
│   FENWAY BOARD     │      DIAMOND DISPLAY         │                │
│                    │                              │ T7 Sato   K   │
│  Pitcher: Bender   │   (runners, outs, bases)     │ T7 Tanaka GO  │
│  PC: 97  ERA: 3.42 │                              │ T7 Yamada 2B  │
│  Mojo: ❄️ Cold     │   [tap runner to act]        │   [+loc][+fld]│
│                    │   [tap field to enrich]      │ T6 Park   BB  │
│  Batter: Hayata    │                              │ T6 Kim    FO  │
│  AVG: .287 HR: 12  │                              │   [+loc][+fld]│
│  Mojo: 🔥 Hot      │                              │                │
│  🎯 1 from 500 hits│                              │                │
│  ⚡ vs Bender: 3/7  │                              │                │
│────────────────────│──────────────────────────────│────────────────│
│  Quick Bar (left thumb zone)         │  Modifiers + Actions (right) │
│  [ K ] [ GO ] [ FO ] [ 1B ] [ BB ]  │  [ 🥜 ] [ 💀 ] [ 💎 ] [ ⚙ ] │
│  [ 2B ] [ 3B ] [ HR ] [ ··· ]       │  [ 🏃R1 ] [ 🏃R3 ]  [ + ]   │
└────────────────────────────────────────────────────────────────────┘
```

### 13.3 Zone Purposes

| Zone | Position | Purpose | Interaction |
|------|----------|---------|-------------|
| **Scoreboard** | Top bar | Score, inning, outs, matchup | Glance only |
| **Fenway Board** | Left panel | KBL-branded context display | Glance (tap player for mojo/fitness) |
| **Diamond** | Center | Runner positions, field visualization | Tap runner for actions, tap field for enrichment |
| **Play Log** | Right panel | Recent plays with enrichment badges | Tap play to enrich/edit |
| **Quick Bar** | Bottom left | Outcome buttons (thumb zone) | Primary input — 1 tap per play |
| **Modifier/Action** | Bottom right | SMB4 quirks + runner actions | Secondary input — modifiers + between-play |

### 13.4 Fenway Scoreboard — KBL's Visual Identity

The Fenway-style scoreboard in the left panel is the visual differentiator. No other scoring app has a branded contextual information display. It shows:

- Current pitcher stats (name, pitch count, ERA, mojo, fitness)
- Current batter stats (name, AVG, HR, mojo, streak)
- Milestone proximity ("1 hit from 500 career hits")
- Matchup history ("3-for-7 lifetime vs Bender")
- Rivalry indicator (if active)
- Live color commentary toast (from Section 8.5)

This data comes from the same context fields that get snapshotted into events. Build it once, display it everywhere.

---

## 14. Codebase Triage — Keep / Rewire / Rebuild / New

### 14.1 Category A: Keep 100% (untouched)

| Area | Files | Reason |
|------|-------|--------|
| Franchise mode UI | FranchiseHome, FranchiseSelector, FranchiseSetup | No interaction model change |
| Stats views | All stat display components | Read from same stores |
| Player management | PlayerCard, roster views | Unchanged |
| Team management | Team views | Unchanged |
| Season/schedule | Schedule views, calendar | Unchanged |
| App shell | Routing, navigation, theme | Unchanged |
| IndexedDB schema | All storage files | Extended, not replaced |
| TypeScript interfaces | Type definitions | Extended, not replaced |
| Lineup drag-and-drop | LineupCard components | Reused as-is for substitutions |
| Settings/preferences | Settings pages | Unchanged |
| League Builder | All LeagueBuilder pages | Foundation layer, untouched |
| Offseason flows | All offseason phase components | Consume same data |

**Estimate: 60-65% of codebase**

### 14.2 Category B: Rewire (same logic, different trigger)

| File | Current Trigger | New Trigger |
|------|----------------|-------------|
| `runnerDefaults.ts` | Called during RUNNER_CONFIRM step | Called immediately on outcome tap |
| `playClassifier.ts` | Called during CLASSIFY step | Called during optional enrichment |
| `leverageCalculator.ts` | Called at various points | Called once at event creation |
| `eventLog.ts` | Saves events from interview flow | Saves events from 1-tap flow (same API) |
| `fameEngine.ts` | Triggered periodically | Triggered by event hooks |
| WAR calculators | Called inconsistently | Called in post-game pipeline |
| `processCompletedGame.ts` | Called at game end | Same, with expanded pipeline steps |
| `gameEngine.ts` (orphaned) | Not called | Wire to event creation path |
| `atBatLogic.ts` (orphaned) | Not called | Wire to runner advancement |
| `fieldingLogic.ts` (orphaned) | Not called | Wire to enrichment panel |
| `clutchCalculator.ts` | Trigger missing (F-098) | Fire from event creation |

**Estimate: 15-20% of codebase**

### 14.3 Category C: Significant Refactor

| File | What Changes | What Stays |
|------|-------------|------------|
| `GameTracker.tsx` | FlowStep state machine replaced by 1-tap paradigm | Diamond rendering, scoreboard, layout structure |
| `useGameState.ts` | 4,647-line monolith simplified dramatically | Game state tracking, undo stack, save/load core |
| `EnhancedInteractiveField.tsx` | Shifts from primary input to display + optional enrichment | SVG rendering, coord system |
| `ActionSelector.tsx` | Replaced by Quick Bar | Component retired |
| `SidePanel.tsx` | Becomes enrichment panel | Similar structure, different trigger |
| `AtBatFlow.tsx` (if exists) | Multi-step interview replaced | Logic distributes to Quick Bar + enrichment |

**Estimate: 15-20% of codebase**

### 14.4 Category D: New Components

| Component | Lines (est.) | Purpose |
|-----------|-------------|---------|
| `QuickButtonBar.tsx` | 200-300 | 8-button outcome bar + overflow |
| `EnrichmentPanel.tsx` | 300-400 | Field location, fielding sequence, modifiers |
| `PlayLog.tsx` | 200-300 | Scrollable tappable play history |
| `BetweenInningSummary.tsx` | 200-300 | Narrative + enrichment prompt |
| `PostGameSummary.tsx` | 300-400 | Game story, milestones, mojo changes |
| `PlayerStatePopover.tsx` | 150-200 | Mojo/fitness adjustment |
| `RunnerActionPopover.tsx` | 200-300 | SB/CS/WP/PB/pickoff |
| `ModifierRegistry.ts` | 150-200 | Registry + default SMB4 modifiers |
| `ModifierTray.tsx` | 100-150 | Modifier button bar |
| `FenwayScoreboard.tsx` | 300-400 | Branded context display |
| `LiveColorTicker.tsx` | 100-150 | Broadcast-style toasts |
| `EventContextSnapshot.ts` | 200-300 | Context capture utility |

**Estimate: ~2,500-3,500 lines of new code**

### 14.5 What Gets Deleted

| File/Code | Why |
|-----------|-----|
| FlowStep state machine | Replaced by 1-tap paradigm |
| `_DeprecatedGameState` interface | Dead migration artifact (F-010) |
| `src/components/GameTracker/index.tsx` (inactive) | Never used by active app (F-002) |
| `useGamePersistence.ts` (inactive) | Never used by active app (F-004) |
| `DragDropGameTracker.tsx` (archived) | Already archived per F-100 |
| Multiple useEffect complexity in GameTracker | Simplified by event-driven model |
| `debouncedSaveCurrentGame` (dead code) | Replaced by hook-local timer, then by event persistence |

---

## 15. Implementation Roadmap

### 15.1 Phase 0: Spec & Planning (THIS DOCUMENT) ✅

- Write unified architecture spec
- Map narrative triggers
- Triage codebase
- Confirm approach with JK

### 15.2 Phase 1: Foundation Fixes (Infrastructure, No UI Change)

Fix audit findings that are prerequisites regardless of paradigm:

| Task | Finding | Effort | Route |
|------|---------|--------|-------|
| Wire warOrchestrator into post-game pipeline | F-103 | 1 hr | Codex 5.1 mini medium |
| Fix LI dual-value (6 getBaseOutLI → calculateLeverageIndex) | F-099 | 2 hr | Claude Code sonnet |
| Wire clutch trigger from at-bat outcome | F-098 | 1 hr | Codex 5.1 mini medium |
| Fix fan morale method name + hardcoded season | F-101 A/B | 1 hr | Codex 5.1 mini medium |
| Fix mWAR hardcoded 'season-1' | F-110 | 30 min | Codex 5.1 mini medium |
| Fix clearSeasonalStats localStorage → IndexedDB | F-112 | 1 hr | Codex 5.1 mini high |
| Wire traitPools.ts to player creation + ceremony | F-104 | 2 hr | Claude Code sonnet |
| Wire aging write-back to player record | F-118 | 2 hr | Claude Code sonnet |
| Wire standings into post-game pipeline | F-102 Step 6 | 1 hr | Codex 5.1 mini medium |

**Total: ~12 hours. Can be done in parallel, no interdependencies.**

### 15.3 Phase 2: Event Model & Quick Bar (Core Paradigm Shift)

| Task | Effort | Route |
|------|--------|-------|
| Define full event TypeScript interfaces | 2 hr | Claude Code sonnet |
| Build EventContextSnapshot utility | 3 hr | Claude Code opus |
| Build QuickButtonBar component | 3 hr | Claude Code sonnet |
| Wire Quick Bar → processAtBat with pre-filled params | 4 hr | Claude Code opus |
| Implement auto-runner-advance (no confirmation) | 3 hr | Claude Code opus |
| Auto-save event to IndexedDB on tap | 2 hr | Claude Code sonnet |
| Auto-advance to next batter | 2 hr | Claude Code sonnet |
| Build undo stack (10-deep) | 3 hr | Claude Code opus |
| Feature flag: switch between old/new flow | 1 hr | Codex 5.1 mini medium |

**Total: ~23 hours. This is the critical sprint.**

ROUTE: Claude Code CLI | opus for the sprint (touches flow, state, events — needs architectural coherence)

### 15.4 Phase 3: Enrichment & Display

| Task | Effort | Route |
|------|--------|-------|
| Build PlayLog component with tappable entries | 3 hr | Claude Code sonnet |
| Build EnrichmentPanel (field location + fielding) | 4 hr | Claude Code sonnet |
| Build FenwayScoreboard (left panel) | 4 hr | Claude Code sonnet |
| Build PlayerStatePopover (mojo/fitness) | 2 hr | Claude Code sonnet |
| Build RunnerActionPopover (SB/CS/WP/PB) | 3 hr | Claude Code sonnet |
| Build BetweenInningSummary screen | 3 hr | Claude Code sonnet |
| Build PostGameSummary screen | 4 hr | Claude Code sonnet |
| Build LiveColorTicker (broadcast toasts) | 2 hr | Claude Code sonnet |
| iPad landscape layout optimization | 3 hr | Claude Code sonnet |

**Total: ~28 hours. All independent components, parallelizable.**

### 15.5 Phase 4: Modifier Registry & Narrative Hooks

| Task | Effort | Route |
|------|--------|-------|
| Build ModifierRegistry with 6 default SMB4 mods | 2 hr | Claude Code sonnet |
| Build ModifierTray component | 2 hr | Claude Code sonnet |
| Wire modifiers to events | 1 hr | Codex 5.1 mini medium |
| Wire narrative triggers to event hooks | 4 hr | Claude Code opus |
| Wire beat reporter to between-inning + post-game | 4 hr | Claude Code opus |
| Wire milestone detection to event creation | 2 hr | Claude Code sonnet |
| Wire fame evaluation to event context | 2 hr | Claude Code sonnet |

**Total: ~17 hours.**

### 15.6 Phase 5: Franchise Integration & Cleanup

| Task | Effort | Route |
|------|--------|-------|
| Re-enable relationship engine (F-119) pointed at event store | 4 hr | Claude Code opus |
| Wire headlineEngine to event-derived stories | 3 hr | Claude Code sonnet |
| Wire record book to stat stores | 2 hr | Claude Code sonnet |
| Implement event replay for data recovery | 4 hr | Codex 5.3 high |
| Verify full pipeline: event → stats → WAR → awards | 4 hr | Claude Code opus |
| Kill legacy flow (remove feature flag + old code) | 2 hr | Claude Code sonnet |
| Update CURRENT_STATE.md and spec-docs | 2 hr | Manual |

**Total: ~21 hours.**

### 15.7 Summary

| Phase | Focus | Hours | Timeline |
|-------|-------|-------|----------|
| 0 | Spec & Planning | Done | Done |
| 1 | Foundation Fixes | ~12 | Week 1 |
| 2 | Event Model & Quick Bar | ~23 | Weeks 2-3 |
| 3 | Enrichment & Display | ~28 | Weeks 3-4 |
| 4 | Modifier Registry & Narrative | ~17 | Week 5 |
| 5 | Franchise Integration & Cleanup | ~21 | Week 6 |
| **Total** | | **~101 hours** | **~6-8 weeks** |

---

## 16. Audit Finding Disposition

### 16.1 Category A: Still Fix (infrastructure, unchanged by paradigm)

F-098, F-099, F-101, F-102, F-103, F-104, F-107, F-109, F-110, F-112, F-113, F-115, F-117, F-118, F-119, F-120, F-121, F-122

### 16.2 Category B: Fix Changes Shape (same problem, different solution)

| Finding | Original Fix | New Fix |
|---------|-------------|---------|
| F-098 | Wire clutch trigger somewhere in flow | Fire from event creation (simpler) |
| F-099 | Replace 6 getBaseOutLI calls | Calculate once, embed in event |
| F-105 | Fix two execution paths | New paradigm has one path (dissolves) |
| F-114 | Re-enable mojo auto-update | User-reported model (new feature, not fix) |

### 16.3 Category C: Becomes Moot

F-027, F-031, F-034 (useEffect race conditions — no FlowStep = no multi-step state bugs)
F-042, F-044, F-045, F-047 (runner disappearance root cause — event sourcing replaces snapshot persistence)
F-014 (partial reducer migration — not migrating to that approach)
F-010 (_DeprecatedGameState — removed with old flow)
F-029 (useState monolith — simplified dramatically by new paradigm)

### 16.4 Category D: Informational (still valuable context)

F-001 through F-008 (file mapping), F-050/F-051 (engine inventory), F-052/F-053 (page/hook mapping), F-071 (architecture pattern)

---

## Appendix A: FIX-DECISION Items Requiring JK Approval

These items from the Phase 2 fix queue need explicit JK decisions. They are independent of the paradigm change:

| ID | Decision Needed | Recommendation |
|----|----------------|----------------|
| F-107 | franchiseId scoping — accept single-franchise or add scoping? | DEFER — no current user impact |
| F-109 | Career stats — derive-on-read vs incremental write? | Derive-on-read (event model makes this natural) |
| F-113 | Playoff stats write path — wire to PLAYOFF_STATS? | YES — needed for postseason WAR/awards |
| F-115 | Salary — accept age-based or implement service time? | Accept age-based as KBL design choice |
| F-119 | Relationships — re-enable or formally remove? | RE-ENABLE — event model makes it cheap |
| F-120 | Narrative persistence — store recaps or ephemeral? | STORE — recaps are franchise history |
| F-120 | headlineEngine — wire or remove? | WIRE — narrative is core to KBL identity |
| F-121 | Player Dev Engine — define model? | EOS ratings adjustment IS the dev model (see 12.6) |
| F-122 | Record Book — wire? | YES — derived from event stores, low effort |

---

## Appendix B: Spec Hierarchy

This document is CANONICAL for:
- GameTracker interaction model (supersedes GAMETRACKER_DRAGDROP_SPEC flow sections)
- Event data model (supersedes implicit event schemas in other specs)
- Franchise data flow architecture (new, not previously specified)
- Codebase triage decisions (new)
- Implementation roadmap (supersedes IMPLEMENTATION_PLAN.md)

This document REFERENCES and does NOT supersede:
- All WAR calculation specs (BWAR, FWAR, PWAR, RWAR, MWAR) — formulas unchanged
- STAT_TRACKING_ARCHITECTURE_SPEC — aggregation logic unchanged
- PITCHER_STATS_TRACKING_SPEC — tracking logic unchanged
- MOJO_FITNESS_SYSTEM_SPEC — weighting formulas unchanged (input source changed to user-reported)
- NARRATIVE_SYSTEM_SPEC — beat reporter system unchanged (enhanced by event context)
- OFFSEASON_SYSTEM_SPEC — 11-phase structure unchanged
- FRANCHISE_MODE_SPEC — data hierarchy unchanged (event model is the delivery mechanism)
- All FIGMA specs — UI specifications still valid for non-GameTracker pages
- LEVERAGE_INDEX_SPEC — formula unchanged
- CLUTCH_ATTRIBUTION_SPEC — formula unchanged
- MILESTONE_SYSTEM_SPEC — detection logic unchanged (trigger point moves to event creation)

---

*Document created: 2026-02-19*
*This spec represents the unified architectural vision for KBL Tracker. All implementation work should reference this document as the primary architectural guide.*
