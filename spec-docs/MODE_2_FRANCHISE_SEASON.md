# MODE 2: FRANCHISE SEASON — Gospel Specification

**Version:** 1.0 (Gospel)
**Status:** CANONICAL — This document is the single source of truth for Mode 2
**Created:** 2026-02-23
**Supersedes:** KBL_UNIFIED_ARCHITECTURE_SPEC.md (GameTracker sections), STAT_TRACKING_ARCHITECTURE_SPEC.md, PITCHER_STATS_TRACKING_SPEC.md, PITCH_COUNT_TRACKING_SPEC.md, INHERITED_RUNNERS_SPEC.md, FIELDING_SYSTEM_SPEC.md, FIELDING_PIPELINE_MAPPINGS.md, RUNNER_ADVANCEMENT_RULES.md, BWAR_SPEC.md, PWAR_SPEC.md, FWAR_SPEC.md, RWAR_SPEC.md, MWAR_SPEC.md, LEVERAGE_INDEX_SPEC.md, CLUTCH_ATTRIBUTION_SPEC.md, NARRATIVE_SYSTEM_SPEC.md, DYNAMIC_DESIGNATIONS_SPEC.md, MILESTONE_SYSTEM_SPEC.md, FAN_FAVORITE_SYSTEM_SPEC.md, FAN_MORALE_SYSTEM_SPEC.md, MOJO_FITNESS_SYSTEM_SPEC.md, GAME_SIMULATION_SPEC.md (renamed AI_GAME_ENGINE per C-048/C-082), PLAYOFF_SYSTEM_SPEC.md, PLAYOFFS_FIGMA_SPEC.md, SPECIAL_EVENTS_SPEC.md, ADAPTIVE_STANDARDS_ENGINE_SPEC.md, STADIUM_ANALYTICS_SPEC.md, PARK_FACTOR_SEED_SPEC.md, MASTER_BASEBALL_RULES_AND_LOGIC.md, SUBSTITUTION_FLOW_SPEC.md, GAMETRACKER_DRAGDROP_SPEC.md (flow sections), GAMETRACKER_BUGS.md, GAMETRACKER_UX_COMPETITIVE_ANALYSIS.md
**Cross-references:** SPINE_ARCHITECTURE.md (shared data contracts), MODE_1_LEAGUE_BUILDER.md (what Mode 2 receives), MODE_3_OFFSEASON_WORKSHOP.md (what Mode 2 produces for offseason)

**STEP4 Decisions Applied:** C-002, C-004, C-005, C-011, C-017, C-025, C-027, C-033, C-047, C-048, C-054, C-055, C-056, C-057, C-058, C-059, C-060, C-061, C-062, C-065, C-067, C-068, C-069, C-079, C-080, C-081, C-082, C-084, C-088, C-089, C-092, C-093. Cross-cutting: C-045, C-054, C-076.

---

## Table of Contents

1. [Overview & Mode Definition](#1-overview--mode-definition)
2. [Event Model — The Universal Atom](#2-event-model--the-universal-atom)
3. [GameTracker — 1-Tap Recording](#3-gametracker--1-tap-recording)
4. [Enrichment System](#4-enrichment-system)
5. [Between-Play Events](#5-between-play-events)
6. [Baseball Rules & Logic](#6-baseball-rules--logic)
7. [Substitution System](#7-substitution-system)
8. [Stats Pipeline](#8-stats-pipeline)
9. [Pitcher Stats & Decisions](#9-pitcher-stats--decisions)
10. [Fielding System](#10-fielding-system)
11. [WAR System (5 Components)](#11-war-system-5-components)
12. [Leverage Index & Win Probability](#12-leverage-index--win-probability)
13. [Clutch Attribution](#13-clutch-attribution)
14. [Mojo & Fitness](#14-mojo--fitness)
15. [Modifier Registry & Special Events](#15-modifier-registry--special-events)
16. [Narrative System](#16-narrative-system)
17. [Dynamic Designations](#17-dynamic-designations)
18. [Milestone System](#18-milestone-system)
19. [Fan Favorite & Albatross](#19-fan-favorite--albatross)
20. [Fan Morale](#20-fan-morale)
21. [Standings & Playoffs](#21-standings--playoffs)
22. [Schedule System](#22-schedule-system)
23. [Adaptive Standards Engine](#23-adaptive-standards-engine)
24. [Stadium Analytics & Park Factors](#24-stadium-analytics--park-factors)
25. [AI Game Engine](#25-ai-game-engine)
26. [Franchise Data Flow](#26-franchise-data-flow)
27. [V2 / Deferred Material](#27-v2--deferred-material)
28. [Decision Traceability](#28-decision-traceability)

---

## 1. Overview & Mode Definition

### 1.1 What Mode 2 Is

Mode 2 — the Franchise Season — is the **active gameplay hub** where users play games in SMB4, record results in KBL's GameTracker, and manage their franchise throughout a season. It runs from the moment Mode 1 hands off (franchise created) until the season ends and control passes to Mode 3 (Offseason Workshop).

Mode 2 is the largest and most complex mode. It contains the GameTracker (the core recording UI), the complete stats pipeline, the WAR calculation system, the narrative engine, the designation system, the milestone tracker, fan morale, standings, playoffs, and the AI game engine for non-human-controlled teams.

### 1.2 Core Paradigm: Record First, Enrich Later

SMB4 tells the user what happened — the outcome is displayed directly on screen. The user's job is to **RECORD**, not figure out.

- **Step 1** (mandatory, 1 tap): Tap outcome button (K, GO, FO, 1B, BB, 2B, HR, etc.)
- **Step 2** (automatic, 0 taps): Runners auto-advance, event saves, next batter loads
- **Step 3** (optional, anytime): Enrich play via tappable play log (spray location, fielding sequence, exit type, modifiers)

**Core counting stats** (BA, OBP, SLG, ERA, WHIP, W, L, SV, K) are **100% correct from Step 1 alone**. Enrichment adds depth (spray charts, fielding credit, exit type refinement) but is never required.

### 1.3 Three Event Streams

KBL has three immutable event streams. Everything in the franchise experience consumes events:

| Stream | Source | Event Type | When |
|--------|--------|-----------|------|
| **GameTracker** | User plays SMB4 | AtBatEvent + BetweenPlayEvent | During games |
| **Franchise Manager** | User manages roster | TransactionEvent | Between games |
| **Offseason Engine** | Mode 3 processing | OffseasonEvent | Between seasons |

**Architectural guarantee:** All events are immutable once saved (enrichment adds fields, never changes outcomes). All downstream state is derivable from events (replay guarantee). The modifier registry is the extension point (new quirks without touching core flow).

### 1.4 What Mode 2 Receives from Mode 1

When Mode 1 completes, Mode 2 receives:

1. **Franchise save slot** — IndexedDB instance with all franchise data
2. **League structure** — conferences, divisions, team assignments
3. **Complete rosters** — all players with ratings, traits, personalities, salaries
4. **Farm rosters** — populated via Startup Prospect Draft
5. **Rules configuration** — season length, playoffs, roster rules, narrative toggles
6. **Schedule** — pre-generated, user-editable game schedule (per C-079)
7. **Franchise type** — Solo/Co-Op/Custom with `controlledBy` flags
8. **Initialized subsystems** — standings tables, salary ledger, empty stats stores

### 1.5 What Mode 2 Produces for Mode 3

When a season ends, Mode 2 has produced:

1. **Complete event log** — every AtBatEvent, BetweenPlayEvent, TransactionEvent
2. **Final season stats** — batting, pitching, fielding for every player
3. **Final standings** — W-L records, division winners, wild cards
4. **WAR calculations** — all 5 components for every player
5. **Playoff results** — bracket, series outcomes, postseason stats
6. **Award candidates** — MVP, Cy Young, ROY, Gold Glove, etc.
7. **Milestone log** — all milestones triggered during the season
8. **Fame scores** — accumulated fame events per player
9. **Fan morale state** — current morale per team
10. **Narrative history** — beat reporter stories, relationship data

### 1.6 Competitive Position

| Feature | KBL | GameChanger | iScore | Lazy Guys |
|---------|-----|-----------|--------|-----------|
| Taps per play | 1-1.3 | 3-8 | 2-9 | 1-2 |
| Franchise depth | Full WAR/narrative | None | None | Basic |
| SMB4 context | Native | None | None | None |
| Enrichment | Optional anytime | Required inline | Required inline | None |

Speed of casual app, depth of power-user app, with SMB4-specific context no competitor has.

---

## 2. Event Model — The Universal Atom

### 2.1 AtBatEvent Interface

Every at-bat produces one event containing the complete context snapshot at the moment of the play.

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
  result: AtBatResult;
  // AtBatResult = 'K' | 'Kc' | 'GO' | 'FO' | 'LO' | 'PO' | '1B' | '2B' |
  //   '3B' | 'HR' | 'BB' | 'HBP' | 'E' | 'FC' | 'DP' | 'TP' | 'SAC' |
  //   'SF' | 'IBB' | 'WP_K' | 'PB_K'
  // Note: 'Kc' = called strikeout (looking)
  // Per C-005: WP_K and PB_K are hybrid types kept as single AtBatResult values
  // Per C-011: TP included in overflow menu alongside DP

  // === AUTO-CAPTURED CONTEXT (0 taps) ===
  gameState: {
    inning: number;
    halfInning: 'TOP' | 'BOTTOM';
    outs: number;
    score: { away: number; home: number };
    runnersOn: BaseState;  // { first?: string; second?: string; third?: string }
  };

  teamContext: {
    battingTeam: {
      teamId: string;
      record: { w: number; l: number };
      streak: number;
      divisionRank: number;
    };
    fieldingTeam: {
      teamId: string;
      record: { w: number; l: number };
      streak: number;
      divisionRank: number;
    };
    isRivalryGame: boolean;
    seriesContext?: {
      game: number;
      of: number;
      seriesScore?: { home: number; away: number };
    };
  };

  leverageIndex: number;
  winProbabilityBefore: number;
  winProbabilityAfter: number;

  batterContext: {
    playerId: string;
    playerName: string;
    position: FieldPosition;
    battingOrder: number;
    handedness: 'L' | 'R' | 'S';
    enteredAs?: 'starter' | 'pinch_hit' | 'pinch_run' | 'defensive_replacement';
    replacedPlayer?: string;
    mojoState: MojoLevel;
    fitnessLevel: FitnessLevel;
    currentSeasonAvg: number;
    currentSeasonOPS: number;
    currentStreak: number;
    seasonHits: number;
    seasonHR: number;
    careerHits: number;
    careerHR: number;
    fameLevel: FameLevel;
    traits: string[];
    isClutchProfile: boolean;
    personality?: PlayerPersonality;  // Hidden from user
  };

  pitcherContext: {
    playerId: string;
    playerName: string;
    handedness: 'L' | 'R';
    role: 'starter' | 'reliever' | 'closer' | 'setup';
    mojoState: MojoLevel;
    fitnessLevel: FitnessLevel;
    pitchCount: number;
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
    isRivalry: boolean;
    platoonAdvantage: 'batter' | 'pitcher' | 'neutral';
    previousMatchups?: { ab: number; h: number; hr: number };
    relationshipType?: string;
  };

  parkContext: {
    stadiumId: string;
    parkFactors?: { ba: number; hr: number; doubles: number; triples: number };
    lighting: 'day' | 'night' | 'hazy';
  };

  // === COMPUTED AT SAVE ===
  runnerOutcomes: RunnerOutcome[];
  rbis: number;
  runsScored: string[];
  outsRecorded: number;
  isQualityAtBat: boolean;
  milestoneTriggered?: MilestoneEvent[];
  clutchValue?: number;

  // === ENRICHMENT (optional, added later) ===
  fieldLocation?: { x: number; y: number };
  exitType?: 'ground_ball' | 'fly_ball' | 'line_drive' | 'popup' | 'bunt';
  fieldingSequence?: number[];
  putouts?: number[];
  assists?: number[];
  errors?: { position: number; type: 'fielding' | 'throwing' | 'mental' }[];
  hrDistance?: number;
  pitchType?: '4-seam' | '2-seam' | 'cutter' | 'slider' | 'curve' |
              'changeup' | 'screwball' | 'forkball' | 'unknown';
  pitchesInAtBat?: number;
  modifiers?: string[];

  // === VERSIONING ===
  version: number;
  editHistory?: {
    version: number;
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: number;
  }[];
}
```

**Shared Enums:**

```typescript
type MojoLevel = 'Rattled' | 'Tense' | 'Neutral' | 'LockedIn' | 'Jacked';
// Canonical type from SPINE_ARCHITECTURE.md §3.6
// Numeric mapping: Rattled = -2, Tense = -1, Neutral = 0, LockedIn = +1, Jacked = +2
type FitnessLevel = 'Hurt' | 'Weak' | 'Strained' | 'Well' | 'Fit' | 'Juiced';
type FameLevel = 'unknown' | 'rising' | 'notable' | 'star' | 'superstar' | 'legend';

interface PlayerPersonality {
  leadership: number;       // 1-200 per OOTP model
  loyalty: number;
  desireForWinner: number;
  greed: number;
  workEthic: number;
  intelligence: number;
}
```

**Quality At-Bat (QAB):** Computed boolean — true if hit, walk, HBP, sac fly with run scored, productive out advancing runner, 7+ pitch at-bat, or hard-hit ball (line drive exit type).

### 2.2 BetweenPlayEvent Interface

```typescript
interface BetweenPlayEvent {
  eventId: string;
  gameId: string;
  seasonId: string;
  franchiseId: string;
  timestamp: number;
  eventIndex: number;

  type: 'stolen_base' | 'caught_stealing' | 'pickoff' | 'wild_pitch'
      | 'passed_ball' | 'balk' | 'defensive_indifference'
      | 'pitcher_change' | 'substitution' | 'position_change'
      | 'mojo_change' | 'fitness_change' | 'injury'
      | 'pitch_count_update' | 'manager_moment';
  // Per C-004: Balk included as manual between-play event

  gameState: {
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
    toBase: 2 | 3 | 4;
    isSuccessful: boolean;
    caughtBy?: number;
  };

  pitcherChange?: {
    outgoingPitcherId: string;
    incomingPitcherId: string;
    inheritedRunners: number;
    outgoingPitchCount: number;
    outgoingIP: number;
  };

  substitution?: {
    type: 'pinch_hit' | 'pinch_run' | 'defensive_replacement'
        | 'position_change' | 'double_switch';
    // Per C-002: 2 entry points — Lineup card + Diamond tap
    outPlayerId: string;
    inPlayerId: string;
    position: FieldPosition;
    previousPosition?: FieldPosition;
  };

  playerStateChange?: {
    playerId: string;
    stateType: 'mojo' | 'fitness';
    previousValue: MojoLevel | FitnessLevel;
    newValue: MojoLevel | FitnessLevel;
    linkedPlayId?: string;
    reason?: string;
  };

  wildPitchOrPassedBall?: {
    type: 'wild_pitch' | 'passed_ball';
    pitcherId: string;
    catcherId: string;
    runnersAdvanced: { runnerId: string; fromBase: number; toBase: number }[];
    runScored?: string;
  };

  pitchCountUpdate?: {
    pitcherId: string;
    pitchCount: number;
    timing: 'end_of_half_inning' | 'pitcher_removed' | 'end_of_game';
  };

  managerMoment?: {
    leverageIndex: number;
    decisionType: 'leave_pitcher_in' | 'pitching_change' | 'pinch_hit'
                | 'pinch_run' | 'defensive_sub' | 'steal_attempt'
                | 'intentional_walk' | 'double_switch';
    context: string;
    outcomeEventId?: string;
    outcomeWPA?: number;
  };
}
```

### 2.3 TransactionEvent Interface

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
    team1Sends: string[];
    team2Sends: string[];
    team1TrueValue: number;
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

  narrativeHook?: string;
}
```

### 2.4 GameRecord Interface

```typescript
interface GameRecord {
  gameId: string;
  seasonId: string;
  franchiseId: string;
  leagueId: string;
  scheduleGameId?: string;

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
  lighting?: 'day' | 'night' | 'hazy';
  totalInnings: number;

  finalScore: { away: number; home: number };
  events: (AtBatEvent | BetweenPlayEvent)[];
  totalAtBats: number;
  isComplete: boolean;
  completedAt?: number;

  playersOfTheGame?: {
    first: string;
    second?: string;
    third?: string;
  };
  gameStoryArc?: 'blowout' | 'pitchers_duel' | 'comeback'
               | 'walk_off' | 'extra_innings' | 'slugfest';
  topMoments?: { eventId: string; wpa: number; description: string }[];
  managerMoments?: string[];
  beatReporterRecap?: string;
  depthScore?: number;
}
```

### 2.5 Design Principles

1. **Three event streams are the single source of truth** — game, transaction, offseason
2. **Events are immutable at outcome level** — enrichment adds fields, retroactive edits create versioned audit trail
3. **Context is free** — system snapshots everything at creation: LI, mojo, fitness, matchup, milestone proximity, team context, park factors
4. **Downstream systems are views** — season stats = SUM(events), career stats = SUM(season stats), WAR = f(season stats + adjustments)
5. **Replay guarantee** — any corruption is fixable by replaying events from the log

---

## 3. GameTracker — 1-Tap Recording

### 3.1 Quick Bar Design

The primary input mechanism is a single row of outcome buttons. The top 6 outcomes cover ~83% of plays at 1 tap each.

**Primary Quick Bar (single row, 9 buttons + overflow):**

```
[ K ]  [ GO ]  [ FO ]  [ LO ]  [ 1B ]  [ BB ]  [ 2B ]  [ HR ]  [ ··· ]
```

**Design rationale:**
- **[GO] and [FO]** instead of generic [OUT]: Each more common than walks individually. Splitting them implicitly classifies exit type at zero cost.
- **[K] first**: Most common outcome (~22%) gets prime left-thumb position. Includes swinging (K) and looking (Kc) — tap [K] then toggle, or default to swinging and enrich later.
- **[LO] in primary bar**: Line out is ~4% but common enough for primary placement.
- **[HR] triggers inline prompts**: Distance text field + optional pitch type selector. Both optional — tap away to skip.

**Overflow menu [···] contains (per C-011):** PO, 3B, HBP, E, FC, DP, TP, SAC, SF, IBB, WP_K, PB_K, Balk

**Outcome Frequency Distribution in SMB4:**

| Outcome | Frequency | Taps | Location |
|---------|-----------|------|----------|
| Strikeout | ~22% | 1 | Primary |
| Ground out | ~18% | 1 | Primary |
| Fly out | ~15% | 1 | Primary |
| Single | ~15% | 1 | Primary |
| Walk | ~8% | 1 | Primary |
| Double | ~5% | 1 | Primary |
| Home run | ~4% | 2 (+ distance) | Primary |
| Line out | ~4% | 1 | Primary |
| HBP | ~1% | 2 (overflow) | Overflow |
| Other | ~8% | 2-4 (overflow) | Overflow |

### 3.2 What Happens on Tap (1-Tap Execution Flow)

When user taps [1B]:

1. **Snapshot context** (0ms): System reads current game state, batter/pitcher context, matchup history, LI, mojo, fitness, milestone proximity.
2. **Apply runner defaults** (0ms): `runnerDefaults.ts` calculates where runners advance. R1 advances to second on single, etc. Apply immediately.
3. **Create event** (0ms): Build full `AtBatEvent` with all context fields populated.
4. **Save event** (async, non-blocking): Write to IndexedDB via `eventLog.ts`.
5. **Fire event hooks** (async, non-blocking): Milestone detection, clutch attribution, narrative triggers, fame check.
6. **Update game state** (0ms): Increment bases, update batter index, advance to next batter.
7. **Update display** (0ms): Diamond shows new runner positions, scoreboard updates, play log adds entry, next batter info loads.

**Total blocking time: <10ms. User sees instant response.**

### 3.3 Undo System

- Undo is a stack of events (10-state depth, configurable)
- Pressing undo: pops last event, reverses runner positions, restores previous batter/pitcher, reverses stats
- **No "are you sure?" confirmations.** Undo is the safety net that makes 1-tap confident.
- Undo button top-left, shows remaining: "↩ 3"
- Snapshots taken BEFORE: play outcome, substitution, inning end
- NOT undoable: Game end (requires confirmation)

### 3.4 End-of-Inning Auto-Detection

System detects 3 outs from outcome types:
- [K] = 1 out, [GO] = 1 out, [FO] = 1 out, [LO] = 1 out, [PO] = 1 out
- [DP] = 2 outs, [TP] = 3 outs
- Caught stealing / pickoff = 1 out

When `outs === 3`, inning changes automatically. Optional brief between-inning summary screen (§16.5).

### 3.5 Runner Override Scenarios (~20% of plays require 1-2 correction taps)

**FO with runner thrown out at home (failed SF):**
1. Tap [FO] with R3 and <2 outs → system infers SF attempt
2. Inline prompt: "Sac fly — run scores?" (non-blocking)
3. YES: R3 scores, SF credited. NO: R3 out at home, FO stands. 1 extra tap.

**GO that isn't a DP:**
- If actually DP: tap [DP] from overflow or correct via play log
- If FC (lead runner forced, batter safe): tap [FC] from overflow, then "Who was out?"

**Per C-017:** GO→DP correction is manual via play log. No auto-correction. This is by design.

**GO with runner on 3rd only (no force):**
1. Tap [GO] with R3 only → batter out at first, R3 holds
2. If R3 scored: tap R3 on diamond → [Score]
3. If R3 thrown out: tap R3 on diamond → [Out at home]

**Error leading to extra bases:**
1. Tap [E] from overflow → "Batter reached which base?" → [1B] [2B] [3B]
2. Then: "Error by?" → position selector → "Error type?" → [Fielding] [Throwing] [Mental]
3. 3-4 taps total for uncommon play

**Key principle:** Defaults handle common case silently. Corrections always available via play log. No correction requires >3 taps. No correction blocks the flow.

### 3.6 What Was Cut from Previous Flow

| Old Behavior | New Behavior | Why |
|-------------|-------------|-----|
| CLASSIFY step (exit type) | Exit type implicit in button ([GO]=ground, [FO]=fly) or optional enrichment | Button IS the classification |
| SidePanel for most plays | Only appears for multi-input plays (DP fielding, error assignment) | ~5% of plays need it |
| RUNNER_CONFIRM step | Auto-apply defaults, display result, tap runner to override | Override is correction, not gate |
| END_CONFIRM step | Auto-save on tap. Undo is safety net. | No "are you sure?" after every play |
| "Misc" button | Modifier registry handles SMB4 quirks (§15) | Extensible, not hardcoded |
| HR location in quick flow | HR distance captured inline; spray via enrichment | Distance is quick; direction is enrichment |

### 3.7 iPad Layout

**Primary platform:** iPad in landscape mode (browser-based).

```
┌──────────────────────────────────────────────────────────────────┐
│ BEE 3  │ T7  2 OUT │  SIR 2  │  Hayata vs Bender (3-7, .429)  │
│─────────────────────────────────────────────────────────────────│
│                    │                            │ PLAY LOG      │
│   FENWAY BOARD     │      DIAMOND DISPLAY       │               │
│                    │                            │ T7 Sato   K   │
│  Pitcher: Bender   │   (runners, outs, bases)   │ T7 Tanaka GO  │
│  PC: 97  ERA: 3.42 │                            │ T7 Yamada 2B  │
│  Mojo: ❄ Cold      │   [tap runner to act]      │   [+loc][+fld]│
│                    │   [tap field to enrich]    │ T6 Park   BB  │
│  Batter: Hayata    │                            │ T6 Kim    FO  │
│  AVG: .287 HR: 12  │                            │   [+loc][+fld]│
│  Mojo: 🔥 Hot      │                            │               │
│  🎯 1 from 500 hits│                            │               │
│  ⚡ vs Bender: 3/7  │                            │               │
│────────────────────│────────────────────────────│───────────────│
│  Quick Bar (left thumb zone)       │  Modifiers + Actions (right)│
│  [ K ] [ GO ] [ FO ] [ 1B ] [ BB ] │  [ 🥜 ] [ 💀 ] [ 💎 ] [ ⚙ ]│
│  [ 2B ] [ 3B ] [ HR ] [ ··· ]     │  [ 🏃R1 ] [ 🏃R3 ]  [ + ] │
└──────────────────────────────────────────────────────────────────┘
```

**Zone purposes:**

| Zone | Position | Purpose |
|------|----------|---------|
| Scoreboard | Top bar | Score, inning, outs, matchup — glance only |
| Fenway Board | Left panel | KBL-branded context: pitcher stats, batter stats, milestone proximity, matchup history |
| Diamond | Center | Runner positions, field visualization — tap runner for actions |
| Play Log | Right panel | Recent plays with enrichment badges — tap to enrich/edit |
| Quick Bar | Bottom left | Outcome buttons (thumb zone) — primary 1-tap input |
| Modifier/Action | Bottom right | SMB4 quirks + runner actions — secondary input |

---

## 4. Enrichment System

### 4.1 Philosophy

Enrichment is optional, never blocking, can be done anytime (during game, between innings, after game, or never). Core counting stats are 100% correct from 1-tap alone. Enrichment adds: spray charts, fielding credit, exit type refinement, HR distance, fielding range metrics, GO/AO ratio, BABIP splits by direction.

### 4.2 Play Log Entry Point

Each completed play appears in scrollable play log:

```
T7  Hayata    1B   [+ fielding] [+ location]
T7  Tanaka    GO   [+ fielding] [+ location]
T7  Sato      K
```

Tapping any play entry opens enrichment panel. Plays with no enrichment option (BB, HBP, IBB) show no badges.

**Always show:**
- `[K or Kc?]` badge for called/swinging distinction on strikeouts
- `[pitches?]` badge for pitch count in at-bat (applies to all at-bats)

### 4.3 Enrichment Types

**Field Location (Spray Chart):**
- Tap mini-diamond graphic
- X captures spray direction (pull/center/opposite)
- Y auto-infers exit type: infield = ground ball, shallow outfield = line drive, deep outfield = fly ball
- Overrides implicit exit type from quick bar button if more specific

**Fielding Sequence:**
- Tap numbered fielder icons in order: 6 → 4 → 3 for standard 6-4-3 DP
- Reused for putouts, assists, errors, fielder's choice
- For errors: tap fielder + error type (fielding/throwing/mental)

**HR Distance:**
- SMB4 displays distance; numeric input field
- Feeds park factor calculations, power metrics, Fenway scoreboard display

**Pitch Type (optional for all plays):**
- Selector: `4-seam | 2-seam | Cutter | Slider | Curve | Changeup | Screwball | Forkball | Unknown`
- Filtered by current pitcher's repertoire (from League Builder)
- Prompted inline after HR distance
- Builds scouting reports and rivalry matchup data

**Pitch Count Per At-Bat:**
- Numeric input: how many pitches in this at-bat
- 7+ pitch at-bat is a QAB regardless of outcome
- Feeds pitch count tracking for pitcher across game

**Pitch Count Per Half-Inning:**
- Prompted (optional) at end of each half-inning: "Pitcher's pitch count?"
- **Required** when pitcher is removed or at end of game
- Primary source for pitcher fatigue tracking

**Modifiers:**
- Applied from modifier tray (§15)
- Attached as metadata: `modifiers: ['nut_shot', 'web_gem']`

### 4.4 Enrichment Timing

| When | Best For | Experience |
|------|----------|---------|
| Immediately after play | High-drama moments | Tap badge while fresh |
| Between innings | Batch enrichment | Between-inning screen prompts unenriched plays |
| After game | Complete session | Post-game screen shows unenriched count |
| Never | Casual sessions | Core stats still 100% correct |

### 4.5 Enrichment for Positional Tracking

- Every at-bat event records batter's current position and defensive alignment
- Every fielding enrichment tagged with fielder's current position
- Position changes recorded as between-play events with timestamps
- Gold Glove engine queries: "All fielding events where playerId=X and position=SS" — no reconstruction needed
- Utility player determination from event-level positional data

**Infield Fly Rule (IFR):** IFR is a modifier on pop-out (PO), not a fly out. When PO recorded with runners on 1st+2nd or bases loaded and <2 outs, system prompts "IFR?" as modifier. IFR affects runner advancement rules and is narrative trigger.

---

## 5. Between-Play Events

### 5.1 Runner Actions

When idle (between at-bats), tapping runner on diamond opens popover:

```
R1: Hayata (on 1B)
[ Steal ] [ Pickoff ] [ Wild Pitch ] [ Passed Ball ] [ Advance ▼ ]
```

- **[Steal]**: Tap destination base → SB or CS. 1-2 taps. WAR: SB/CS → rWAR
- **[Pickoff]**: Sub-options [Safe] [Out] [Error → fielder]. 2-3 taps.
- **[Wild Pitch]**: Runner auto-advances or tap destination. Records WP charged to pitcher (pWAR). 1-2 taps.
- **[Passed Ball]**: Same as WP but charged to catcher (fWAR). 1-2 taps.
- **Steal attempt** is also a manager decision → mWAR.

### 5.2 Substitutions

Two entry points (per C-002), same event:

1. **Lineup card** (comprehensive): Full drag-drop lineup management. Best for double switches.
2. **Diamond tap** (quick contextual): Tap player → [Substitute] → select from roster.

See §7 for complete substitution system details.

### 5.3 Manager Moments

When LI exceeds threshold (default: 2.0), system marks current game state as **Manager Moment** — high-leverage decision point. System doesn't interrupt flow; marks via subtle visual indicator (pulsing border on Quick Bar or ⚡ icon). User's next action recorded as `managerMoment` BetweenPlayEvent.

**Tracked across season:**
- Total Manager Moments faced
- Decisions made (by type)
- Average WPA outcome of decisions
- "Best Moment" and "Worst Moment" (highest/lowest WPA)
- Manager Moments feed mWAR calculation (§11.5)

### 5.4 Pitcher Changes

Pitcher name in scoreboard always tappable → [Change Pitcher] → select from roster. Event records: outgoing pitcher's pitch count, IP, inherited runners. Inherited runners tracked for earned run responsibility (§9.4).

### 5.5 Position Changes (Non-Substitution)

Player moves SS to 3B mid-game (no new player enters). Diamond tap → [Move Position] popover. Critical for Gold Glove and defensive WAR: innings at each position tracked precisely via event timestamps.

### 5.6 Mojo & Fitness Changes

Player tokens on diamond always tappable. Tap player → state popover (§14 for full details). Changes save immediately as BetweenPlayEvent with linked play context.

---

## 6. Baseball Rules & Logic

This section codifies the authoritative baseball rules governing all GameTracker logic.

### 6.1 Game Structure

- Standard 9 innings (configurable to 7 or other values via League Rules)
- Top/Bottom per inning; 3 outs per half-inning
- Extra innings if tied after regulation
- 9-batter lineup (DH optional per League Rules)
- Home team bats bottom; game ends if home team leads after top of final inning or walks off in bottom

### 6.2 At-Bat Results

```typescript
type HitResult = '1B' | '2B' | '3B' | 'HR';
type OutResult = 'K' | 'Kc' | 'GO' | 'FO' | 'LO' | 'PO';
type SpecialResult = 'SF' | 'SAC' | 'DP' | 'TP' | 'FC' | 'E'
                   | 'BB' | 'IBB' | 'HBP' | 'WP_K' | 'PB_K';
```

**At-Bat counting:**
- IS an AB: Hits, outs, FC, errors
- NOT an AB: BB, IBB, HBP, SF, SAC, CI

### 6.3 Run Scoring Rules

**Third Out Exceptions — run does NOT score when:**
1. Batter out before reaching 1B
2. ANY force out at any base (even if runner crossed home before force)
3. Appeal play on preceding runner

**Time Play (tag out for 3rd out):** Runner scores if crossed home BEFORE tag applied.

**RBI credited for:** Safe hits scoring runners, SF, SAC bunts scoring runners, walks/HBP with bases loaded, FC scoring runners, GO scoring runners.
**RBI NOT credited for:** Errors, double plays, WP/PB (unless bases loaded), balk.

### 6.4 Force Play Rules

A runner is FORCED when the batter becomes a runner AND there is no empty base behind them.

**Chain rule:**
- Batter ALWAYS forces R1
- R1 forces R2 ONLY IF R1 is forced (batter reached)
- R2 forces R3 ONLY IF R2 is forced (R1 was forced)

```typescript
function isForced(base: number, runners: RunnerState, event: string): boolean {
  if (event === 'BB' || event === 'HBP' || event === 'IBB' || event === '1B') {
    if (base === 1 && runners.first) return true;
    if (base === 2 && runners.first && runners.second) return true;
    if (base === 3 && runners.first && runners.second && runners.third) return true;
  }
  if (event === '2B') {
    if (base === 1 && runners.first) return true;
    if (base === 2 && runners.second) return true;
  }
  if (event === '3B') {
    return runners[base] !== undefined; // All must vacate
  }
  return false;
}
```

### 6.5 Runner Advancement Defaults

**On hits:**
- 1B: R1→2B, R2→3B, R3→Scores (forced runners auto-advance; non-forced get options)
- 2B: R1→3B or Scores, R2→Scores, R3→Scores
- 3B: All score
- HR: All score

**On walks/HBP/IBB:** Forced advances only. Non-forced runners get options (Hold, Advance).

**Walk/HBP Forced Advancement Matrix:**

| Situation | R1 | R2 | R3 | UI |
|-----------|----|----|----|----|
| R1 only | AUTO→2B | — | — | No selection |
| R1+R2 | AUTO→2B | AUTO→3B | — | No selection |
| R1+R3 | AUTO→2B | — | Choice | Options for R3 |
| R2+R3 | — | Choice | Choice | Options for both |
| Loaded | AUTO→2B | AUTO→3B | AUTO→Scores | No selection |

**On outs (GO/FO/LO/PO):** Runners held by default. Tag-up required on fly outs.

### 6.6 Special Plays

**Dropped Third Strike (D3K):**
- Batter may run if: 1B unoccupied OR 2 outs
- Batter may NOT run if: 1B occupied AND <2 outs
- Record as: K + WP, K + PB, or K + E2
- Per C-005: WP_K and PB_K kept as hybrid AtBatResult types

**Infield Fly Rule (IFR) — ALL conditions required:**
- <2 outs
- Runners on 1st and 2nd OR bases loaded
- Fair fly ball (NOT line drive, NOT bunt)
- Can be caught with ordinary effort
- Effect: Batter OUT immediately; removes force play on runners

**Sacrifice Fly (SF):** <2 outs, R3, fly ball caught, runner scores after tag-up. NOT an AB.

**Sacrifice Bunt (SAC):** <2 outs, runners on base, batter bunts out at 1B, at least one runner advances. NOT an AB.

**Ground Rule Double (GRD):** Batter automatically to 2B. Runners advance two bases from position at time of pitch.

**Tag-Up Rule:** On caught fly ball, runners MUST return to original base before advancing. Can be doubled off if leaves early.

### 6.7 Statistical Definitions

```
AVG = Hits / At-Bats
OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
SLG = Total Bases / At-Bats   // TB = (1B×1) + (2B×2) + (3B×3) + (HR×4)
OPS = OBP + SLG
ERA = (Earned Runs × 9) / Innings Pitched
WHIP = (Walks + Hits) / Innings Pitched
IP  = outsRecorded / 3  // Stored as outs; 14 outs = "4.2" IP
```

### 6.8 Button Availability Rules

```typescript
// Context-sensitive disabling
SAC: disabled when 2 outs
SF:  disabled when 2 outs OR no R3
DP:  disabled when 2 outs OR no runners
TP:  disabled when <2 runners
D3K: disabled when 1B occupied AND <2 outs
```

---

## 7. Substitution System

### 7.1 Substitution Types

| Type | When | Who Leaves | Who Enters |
|------|------|-----------|-----------|
| Pinch Hitter | During AB | Current batter | Bench player |
| Pinch Runner | Runner on base | Current runner | Bench player |
| Defensive Sub | Between innings | Fielder | Bench player |
| Pitching Change | Any time | Pitcher | Reliever |
| Double Switch | Usually w/ pitch change | Pitcher + fielder | Reliever + position player |

### 7.2 Entry Points (Per C-002)

1. **Lineup Card**: Full drag-drop management. Current Batter card (left), Current Pitcher card (right, drop zone for reliever), Lineup card with bench drag-drop for position players, Bullpen panel for relief pitchers.

2. **Diamond Tap**: Tap player on diamond → [Substitute] → select replacement from roster.

### 7.3 Pinch Runner Critical Rule

PR replaces baserunner but **pitcher responsibility does NOT change**. PR is inherited from original runner's pitcher. If PR scores, run charged to the pitcher who allowed the original batter to reach base.

### 7.4 Pitching Change Flow

1. Requires pitch count from outgoing pitcher (prompted)
2. System captures: outgoing pitcher stats, inherited runners count, IP
3. New pitcher initialized in stats map with `isStarter: false`, `entryInning: current`
4. Inherited runners tracked — if they score, run charged to previous pitcher's ERA
5. Manager decision logged for mWAR

### 7.5 Validation Constraints

```typescript
const SUBSTITUTION_RULES = {
  noReEntry: true,       // Each player enters once only
  minLineupSize: 9,
  maxLineupSize: 9,
  phMustBat: true,       // PH must bat before defensive position assigned
  pitchCountRequired: true  // For pitching changes
};
```

**Player states in lineup:**
- **In Game**: Normal, highlighted
- **Available**: Normal (on bench/bullpen)
- **Used**: Grayed + strikethrough + ❌ (can't re-enter)

---

## 8. Stats Pipeline

### 8.1 Three-Layer Architecture

```
Layer 1: AtBatEvent (Ephemeral)     → Individual play data
Layer 2: GameState (Session)        → Accumulated game stats
Layer 3: SeasonStats (Persistent)   → Full season aggregation
Layer 4: CareerStats (Permanent)    → Lifetime totals
```

### 8.2 Game-Level Stats

```typescript
interface PlayerGameStats {
  playerId: string;
  playerName: string;
  teamId: string;

  // Batting
  pa: number; ab: number;
  hits: { '1B': number; '2B': number; '3B': number; 'HR': number };
  rbi: number; runs: number; walks: number; strikeouts: number;
  hitOrder: ('1B' | '2B' | '3B' | 'HR')[];  // For cycle detection

  // Pitching
  outsRecorded: number; hitsAllowed: number;
  runsAllowed: number; earnedRuns: number;
  walksAllowed: number; strikeoutsThrown: number;
  homeRunsAllowed: number; hitBatters: number;
  basesReachedViaError: number; wildPitches: number;
  pitchCount: number; battersFaced: number;
  isStarter: boolean; entryInning: number;
  inheritedRunners: number; bequeathedRunners: number;

  // Fielding
  putouts: number; assists: number; errors: number;

  fameEvents: FameEvent[];
}
```

### 8.3 Season-Level Stats

```typescript
interface PlayerSeasonStats {
  playerId: string;
  seasonId: string;
  teamId: string;

  batting: {
    games: number; pa: number; ab: number;
    hits: number; singles: number; doubles: number;
    triples: number; homeRuns: number;
    rbi: number; runs: number; walks: number;
    strikeouts: number; hitByPitch: number;
    stolenBases: number; caughtStealing: number;
  };

  pitching: {
    games: number; gamesStarted: number;
    outsRecorded: number; hitsAllowed: number;
    runsAllowed: number; earnedRuns: number;
    walksAllowed: number; strikeouts: number;
    homeRunsAllowed: number; hitBatters: number;
    wildPitches: number;
    wins: number; losses: number;
    saves: number; holds: number; blownSaves: number;
  };

  fielding: {
    games: number; putouts: number;
    assists: number; errors: number;
    byPosition: Map<Position, FieldingStats>;
  };

  calculated: {
    avg: number; obp: number; slg: number; ops: number;
    era: number; whip: number; war: number;
  };

  achievements: {
    qualityStarts: number; completeGames: number;
    shutouts: number; noHitters: number;
    perfectGames: number; cycles: number;
    multiHRGames: number;
  };

  fame: {
    bonusPoints: number; bonerPoints: number;
    netFame: number; events: FameEventSummary[];
  };
}
```

### 8.4 Accumulation Flow

**Event → Game:** On each AtBatEvent, batter and pitcher stats increment immediately.

**Game → Season:** On game completion, `finalizeGame()` adds game stats to season totals, recalculates rates (AVG, ERA, etc.), checks achievements, updates standings.

**Season → Career:** On season end, `finalizeSeason()` adds season totals to career, checks career milestones.

### 8.5 Storage Tiers

| Data | Storage | Lifetime |
|------|---------|----------|
| Current at-bat | React state | Ephemeral |
| Current game | IndexedDB + React state | Survives refresh |
| Season stats | IndexedDB | Persistent |
| Career stats | IndexedDB | Permanent |
| Historical games | IndexedDB (compressed) | Archival |

**Storage cost:** ~500 bytes per at-bat, ~70 per game = ~35KB/game, ~5.7MB for 162-game season.

---

## 9. Pitcher Stats & Decisions

### 9.1 Core Counting Stats

```typescript
function updatePitcherStats(result: AtBatResult, pitcher: PitcherGameStats) {
  pitcher.battersFaced += 1;

  switch (result) {
    case '1B': case '2B': case '3B':
      pitcher.hits += 1; break;
    case 'HR':
      pitcher.hits += 1; pitcher.homeRuns += 1; break;
    case 'K': case 'Kc':
      pitcher.strikeouts += 1; pitcher.outsRecorded += 1; break;
    case 'GO': case 'FO': case 'LO': case 'PO': case 'SF': case 'SAC':
      pitcher.outsRecorded += 1; break;
    case 'DP':
      pitcher.outsRecorded += 2; break;
    case 'TP':
      pitcher.outsRecorded += 3; break;
    case 'BB':
      pitcher.walks += 1; break;
    case 'IBB':
      pitcher.intentionalWalks += 1; break;
    case 'HBP':
      pitcher.hitByPitch += 1; break;
    case 'E': case 'FC':
      break; // No additional stat
  }
}
```

### 9.2 Innings Pitched

```typescript
function formatIP(outsRecorded: number): string {
  const fullInnings = Math.floor(outsRecorded / 3);
  const partialOuts = outsRecorded % 3;
  return partialOuts === 0 ? `${fullInnings}.0` : `${fullInnings}.${partialOuts}`;
}
// Examples: 0→"0.0", 1→"0.1", 2→"0.2", 3→"1.0", 14→"4.2", 27→"9.0"

// CRITICAL: Store as outs, not decimal IP
// Addition: 4.2 IP + 2.1 IP = 14 outs + 7 outs = 21 outs = 7.0 IP
```

### 9.3 First Inning Runs Tracking

**All three conditions must be true:**
1. Pitcher is a starter (`isStarter === true`)
2. Pitcher entered in inning 1 (`entryInning === 1`)
3. Current game inning is still 1 (`gameState.inning === 1`)

### 9.4 Inherited Runners

When a pitcher is replaced with runners on base:

```typescript
function handlePitchingChange(outgoing, incoming, gameState) {
  const runnersOnBase = [gameState.runners.first, .second, .third]
    .filter(r => r !== null);

  // Mark as inherited for new pitcher
  runnersOnBase.forEach(r => {
    r.wasInherited = true;
    r.inheritedFrom = outgoing.id;
  });

  outgoing.bequeathedRunners = runnersOnBase.length;
  incoming.inheritedRunners = runnersOnBase.length;
  incoming.inheritedRunnersScored = 0;
}
```

**Run attribution:** If inherited runner scores, run charged to **previous** pitcher's ERA, not reliever's. If runner reached on error, run is unearned regardless of who is pitching.

### 9.5 Win/Loss Decisions

**Winning pitcher:** Pitcher of record at time team takes its final lead.
- Starter must pitch minimum outs for win (9 innings: 15 outs / 5.0 IP; 7 innings: 12 outs / 4.0 IP)
- If starter doesn't qualify, win goes to most effective reliever

**Losing pitcher:** Pitcher responsible for the go-ahead run that was never retaken.

### 9.6 Save Rules

```typescript
function qualifiesForSave(pitcher, game): boolean {
  if (pitcher.isStarter) return false;
  if (!game.teamWon(pitcher.team)) return false;
  if (!pitcher.finishedGame) return false;
  if (pitcher === game.winningPitcher) return false;

  return (
    (pitcher.leadWhenEntered <= 3 && pitcher.outsRecorded >= 3) ||
    pitcher.tyingRunInScoringPosition ||
    pitcher.outsRecorded >= 9
  );
}
```

**Hold:** Reliever enters in save situation, doesn't finish game, doesn't blow lead, records ≥1 out, not the winning pitcher.

**Blown Save:** Entered in save situation, lead lost during appearance.

### 9.7 Special Achievements

```typescript
function isQualityStart(starter, gameInnings): boolean {
  const minOuts = gameInnings >= 9 ? 18 : Math.floor(gameInnings * 2);
  const maxER = gameInnings >= 9 ? 3 : Math.ceil(gameInnings / 3);
  return starter.outsRecorded >= minOuts && starter.earnedRuns <= maxER;
}

function isMaddux(pitcher, game): boolean {
  if (!isShutout(pitcher, game)) return false;
  return pitcher.pitchCount < Math.ceil(game.scheduledInnings * 9.44);
}
// 9 innings→85 pitches, 7→66, 6→57

function isImmaculateInning(inningData): boolean {
  return inningData.pitches === 9 && inningData.strikeouts === 3;
}

function isPerfectGame(pitcher, game): boolean {
  return isNoHitter(pitcher, game)
    && pitcher.walks === 0
    && pitcher.hitByPitch === 0
    && game.getErrorsWhilePitcherOnMound(pitcher.id) === 0;
}
```

### 9.8 Pitch Count Tracking

**When to capture:**
- Pitching change (before confirming — outgoing pitcher's count)
- End of game (all pitchers)
- Optionally at end of each half-inning

**Estimation system (when user doesn't provide):**

```typescript
const PITCHES_PER_BATTER_ESTIMATE = {
  starter: 3.9, reliever: 4.1,
  strikeout: 5.5, walk: 5.8,
  hit: 3.2, out_in_play: 3.0, home_run: 2.8
};
```

**Validation:** Min 3 per inning, max 50 per inning, max 150 per game. Warnings at 30/inning and 120/game.

---

## 10. Fielding System

### 10.1 Fielding Chance Rules

A fielding chance is recorded **ONLY when a fielder attempts to make a play on the ball.**

| Result | Fielding Chance? | Notes |
|--------|-----------------|-------|
| Outs (GO, FO, LO, PO) | ✅ Yes | Always |
| DP, SF, FC | ✅ Yes | Always |
| Error (E) | ✅ Yes | Failed attempt |
| D3K | ✅ Yes | Catcher attempt |
| K, KL, BB, IBB, HBP | ❌ No | No batted ball |
| Clean Hit (1B, 2B, 3B) | ❌ No | Unless diving/leaping attempt |
| Clean HR | ❌ No | Unless robbery attempt |

### 10.2 Fielder Inference Matrices

When user doesn't specify fielder via enrichment, system infers from ball direction and play type.

**Ground Balls (GO, DP, FC):**

| Direction | Primary (65%) | Secondary (25%) | Tertiary (10%) |
|-----------|--------------|-----------------|----------------|
| L (Left) | 3B | SS | P |
| LC | SS | 3B | 2B |
| C (Center) | P | SS | 2B |
| RC | 2B | 1B | SS |
| R (Right) | 1B | 2B | P |

**Fly Balls (FO, SF):**

| Direction | Primary | Secondary | Tertiary |
|-----------|---------|-----------|----------|
| L | LF (65%) | CF (20%) | 3B (15%) |
| LC | CF (75%) | LF (20%) | SS (5%) |
| C | CF (90%) | — | — |
| RC | CF (75%) | RF (20%) | 2B (5%) |
| R | RF (65%) | CF (20%) | 1B (15%) |

**Line Drives (LO):** 3B/SS/P/2B/1B primary by direction with OF secondary.

**Pop Flies (PO):** Priority: CF → Corner OF → SS → 2B → 1B/3B → P/C.

### 10.3 Double Play Chains

| Code | Description | Credits |
|------|-------------|---------|
| 6-4-3 | SS to 2B to 1B | SS (A), 2B (A+DP pivot), 1B (PO) |
| 4-6-3 | 2B to SS to 1B | 2B (A), SS (A+DP pivot), 1B (PO) |
| 5-4-3 | 3B to 2B to 1B | 3B (A), 2B (A+DP pivot), 1B (PO) |
| 1-6-3 | P to SS to 1B | P (A), SS (A+DP pivot), 1B (PO) |
| 6-3 | SS to 1B | SS (A), 1B (PO) |
| 3-6-3 | 1B to SS to 1B | 1B (A), SS (A), 1B (PO) |

**DP inference by direction:** L→5-4-3, LC→6-4-3 (most common), C→1-6-3 or 6-4-3, RC→4-6-3, R→3-6-3.

### 10.4 Star Play Categories & fWAR Impact

| Category | fWAR Multiplier | Fame | Description |
|----------|----------------|------|-------------|
| Routine | 1.0× | — | Standard play |
| Running | 1.5× | — | Covered significant ground |
| Diving Catch | 2.5× | +1 | Horizontal extension |
| Leaping Catch | 2.0× | +1 | Leaps to catch |
| Wall Catch | 2.5× | +1 | At the wall |
| Sliding Catch | 2.5× | +1 | Sliding in outfield |
| Over-Shoulder | 2.0× | +1 | Over-the-shoulder |
| **Robbed HR** | **5.0×** | **+2** | **Catch over wall** |

### 10.5 Error Categories

| Category | Base fWAR Penalty | Fame | Context Modifiers |
|----------|------------------|------|-------------------|
| Fielding Error | -0.15 runs | -1 | ×1.5 if allowed run, ×1.2 if routine |
| Throwing Error | -0.20 runs | -1 | ×0.7 if difficult play |
| Mental Error | -0.25 runs | -1 | Highest penalty — wrong base, etc. |
| Missed Dive | 0 | 0 | Good effort, no penalty |

### 10.6 Run Value Constants

```typescript
const FIELDING_RUN_VALUES = {
  putout: { infield: 0.03, outfield: 0.04, lineout: 0.05, foulout: 0.02 },
  assist: { infield: 0.04, outfield: 0.08, relay: 0.03, cutoff: 0.02 },
  doublePlay: { turned: 0.12, started: 0.08, completed: 0.06 },
  error: { fielding: -0.15, throwing: -0.20, mental: -0.25 }
};

const POSITION_MODIFIERS = {
  putout: { C: 1.3, SS: 1.2, CF: 1.15, '2B': 1.1, '3B': 1.1,
            RF: 1.0, LF: 0.9, '1B': 0.7, P: 0.5, DH: 0.0 },
  assist: { C: 1.4, SS: 1.2, '3B': 1.15, CF: 1.2, RF: 1.1,
            '2B': 1.0, LF: 0.9, '1B': 0.7, P: 0.6 },
  error:  { C: 0.8, SS: 1.0, '3B': 1.0, '2B': 1.0,
            CF: 1.1, RF: 1.1, LF: 1.1, '1B': 1.2, P: 1.3 }
};
```

### 10.7 Per-Play fWAR Calculation

```typescript
function calculatePlayFWAR(event) {
  const base = FIELDING_RUN_VALUES[event.type][event.playType] || 0.03;
  const posMod = POSITION_MODIFIERS[event.type][event.position] || 1.0;
  const diffMod = DIFFICULTY_MULTIPLIERS[event.difficulty] || 1.0;
  return base * posMod * diffMod;
}
```

### 10.8 Fielding Play Record

```typescript
interface FieldingPlay {
  id: string; gameId: string; inning: number; halfInning: 'TOP' | 'BOTTOM';
  batterId: string; pitcherId: string; atBatResult: string;
  battedBallType: 'GB' | 'FB' | 'LD' | 'PF' | 'NONE';
  direction: 'FL' | 'L' | 'LC' | 'C' | 'RC' | 'R' | 'FR' | null;
  primaryFielder: string; primaryFielderId: string;
  playType: 'routine' | 'diving' | 'leaping' | 'wall' | 'charging'
          | 'running' | 'sliding' | 'over_shoulder'
          | 'error' | 'robbed_hr' | 'failed_robbery';
  errorType?: 'fielding' | 'throwing' | 'mental';
  assists: Array<{ position: string; playerId: string; targetBase?: string }>;
  putoutPosition: string; putoutPlayerId: string;
  dpRole?: 'started' | 'turned' | 'completed' | 'unassisted';
  inferredFielder: string; wasOverridden: boolean;
  infieldFlyRule: boolean; d3kEvent: boolean;
  outsRecorded: number;
}
```

---

## 11. WAR System (5 Components)

KBL uses five independent WAR components. No double-counting between components.

**Universal Season Length Scaling:**

```typescript
function getRunsPerWin(seasonGames: number): number {
  return 10 * (seasonGames / 162);
}
// 162g→10.0, 128g→7.90, 48g→2.96, 32g→1.98, 20g→1.23
```

### 11.1 bWAR — Batting WAR

**Core formula:** `bWAR = (wRAA + Replacement Runs) / Runs Per Win`

**wOBA Calculation:**
```
wOBA = (wBB×uBB + wHBP×HBP + w1B×1B + w2B×2B + w3B×3B + wHR×HR)
       / (AB + uBB + SF + HBP)
```

**wOBA Weights (SMB4-calibrated):**
```typescript
const WOBA_WEIGHTS = {
  uBB: 0.690, HBP: 0.722, single: 0.888,
  double: 1.271, triple: 1.616, homeRun: 2.101
};
const WOBA_SCALE = 1.7821;  // Per C-058: SMB4-calibrated
const LEAGUE_WOBA = 0.329;
```

**wRAA:** `wRAA = ((playerWOBA - leagueWOBA) / wobaScale) × PA`

**Replacement Level:** `(PA / 600) × 17.5` (MLB) or `(PA / 600) × 12.0` (SMB4-calibrated)

**Park Factor Adjustment:** 60% handedness-specific, 40% overall. Applies only to home PA. Confidence threshold: MEDIUM or HIGH.

### 11.2 pWAR — Pitching WAR

**Core formula:** `pWAR = ((lgFIP - FIP) / pitcherRPW + replacementLevel) × (IP / 9) × leverageMultiplier`

**FIP:**
```
FIP = ((13 × HR) + (3 × (BB + HBP)) - (2 × K)) / IP + FIP_Constant
```
- Per C-027: IBB excluded from FIP (standard: BB-IBB)
- FIP Constant: 3.28 (SMB4-calibrated; per C-059, documented here alongside pWAR)

**Replacement Level:**
```typescript
const STARTER_REPLACEMENT = 0.12;
const RELIEVER_REPLACEMENT = 0.03;
function getReplacementLevel(gamesStarted, gamesAppeared) {
  const starterShare = gamesStarted / gamesAppeared;
  return (RELIEVER_REPLACEMENT * (1 - starterShare)) + (STARTER_REPLACEMENT * starterShare);
}
```

**Leverage Multiplier (relievers only):**
```
LI_Multiplier = (averageLeverageIndex + 1) / 2
```
Closer (LI 1.8)→1.40, Setup (LI 1.3)→1.15, Middle (LI 0.9)→0.95, Mop-up (LI 0.5)→0.75.

### 11.3 fWAR — Fielding WAR

**Per C-061:** impactMultiplier removed — runsPerWin already handles season-length scaling.

**Per C-060:** Fielding chance vs fWAR credit boundary defined: a fielding play generates fWAR credit only when the play is a chance (see §10.1). Hits with no fielder attempt generate zero fWAR.

**Positional Adjustments (per 48 games):**

| Position | Runs | WAR |
|----------|------|-----|
| C | +3.7 | +0.37 |
| SS | +2.2 | +0.22 |
| CF | +0.7 | +0.07 |
| 2B/3B | +0.7 | +0.07 |
| RF/LF | -2.2 | -0.22 |
| 1B | -3.7 | -0.37 |
| DH | -5.2 | -0.52 |

### 11.4 rWAR — Baserunning WAR

**Core formula:** `rWAR = (wSB + UBR + wGDP) / Runs Per Win`

**wSB:** `wSB = (SB × 0.20) + (CS × -0.45) - (lgwSB × opportunities)`
Break-even rate: ~69% (2 SB per CS).

**UBR:** `Σ(actual advancement runs) - Σ(expected advancement runs)`
Key values: 1st→3rd on single: +0.40, 2nd→home on single: +0.55, thrown out advancing: -0.65.

**wGDP:** `(GIDP_opportunities × 0.12 - actual_GIDP) × 0.44`

**Relative importance:** wSB ~35%, UBR ~50%, wGDP ~15%.

### 11.5 mWAR — Manager WAR

**Core formula:** `mWAR = (decisionWAR × 0.60) + (overperformanceWAR × 0.40)`

**Decision WAR (60%):**
```typescript
function calculateDecisionWAR(decisions) {
  let totalValue = 0;
  for (const decision of decisions) {
    totalValue += getDecisionOutcomeValue(decision) * Math.sqrt(decision.leverageIndex);
  }
  return totalValue / getRunsPerWin();
}
```

**Decision outcome values:**

| Decision | Success | Failure |
|----------|---------|---------|
| Pitching Change | +0.4 × √LI | -0.3 × √LI |
| Leave Pitcher In | +0.2 × √LI | -0.4 × √LI |
| Pinch Hitter | +0.5 × √LI | -0.3 to -0.5 × √LI |
| Steal Call | +0.3 × √LI | -0.4 × √LI |
| Squeeze Call | +0.6 × √LI | -0.5 × √LI |
| IBB | +0.3 × √LI | -0.4 to -0.7 × √LI |

**Overperformance WAR (40%):**
```typescript
function calculateOverperformanceWAR(team, season) {
  const overperformance = actualWinPct - expectedWinPct;
  return overperformance * season.totalGames * 0.3;  // 30% to manager
}
```

**Per C-062:** Reconciliation mechanism needed — total WAR should ≈ team wins. The 70% unattributed portion ensures mWAR doesn't inflate total WAR beyond team performance.

### 11.6 WAR Calibration

All WAR types support post-hoc calibration:
- Minimum data: 2 seasons + 10,000 PA (batting) / 500 IP (pitching)
- Blend: 30% new data, 70% baseline (batting); max 40% new (pitching)
- Confidence tracking (0-1 scale)
- Recalibrate after each season

---

## 12. Leverage Index & Win Probability

### 12.1 What Is Leverage Index

```
LI = (Potential Win Probability Swing) / (League Average Swing)
```

Average situation = 1.0. Used to weight clutch (§13), pWAR for relievers (§11.2), and mWAR decisions (§11.5).

| LI Range | Category | Description | Frequency |
|----------|----------|-------------|-----------|
| 0.0-0.85 | Low | Blowout, early | ~60% |
| 0.85-2.0 | Medium | Competitive | ~30% |
| 2.0-5.0 | High | Critical | ~9% |
| 5.0+ | Extreme | Game on the line | ~1% |

### 12.2 Base-Out LI Table

| Base State | 0 Outs | 1 Out | 2 Outs |
|------------|--------|-------|--------|
| Empty | 0.86 | 0.90 | 0.93 |
| 1st | 1.07 | 1.10 | 1.24 |
| 2nd | 1.15 | 1.40 | 1.56 |
| 1st & 2nd | 1.35 | 1.55 | 1.93 |
| 3rd | 1.08 | 1.65 | 1.88 |
| 1st & 3rd | 1.32 | 1.85 | 2.25 |
| 2nd & 3rd | 1.45 | 2.10 | 2.50 |
| **Loaded** | **1.60** | **2.25** | **2.67** |

### 12.3 LI Calculation

```typescript
function approximateLI(gameState) {
  const boLI = BASE_OUT_LI[encodeBaseState(gameState.runners)][gameState.outs];
  const inningMult = getInningMultiplier(gameState.inning, gameState.halfInning);
  const scoreDamp = getScoreDampener(gameState.scoreDifferential, gameState.inning);
  return Math.max(0.1, Math.min(10.0, boLI * inningMult * scoreDamp));
}

function getInningMultiplier(inning, halfInning) {
  const mult = { 1: 0.7, 2: 0.75, 3: 0.8, 4: 0.85, 5: 0.9,
                 6: 1.0, 7: 1.2, 8: 1.5, 9: 2.0 };
  let m = mult[Math.min(inning, 9)] || 2.0;
  if (inning >= 9 && halfInning === 'BOTTOM') m *= 1.4;  // Walk-off potential
  return m;
}

function getScoreDampener(scoreDiff, inning) {
  const abs = Math.abs(scoreDiff);
  if (abs >= 7) return 0.1;
  if (abs >= 5) return 0.25;
  if (abs >= 4) return 0.4;
  if (abs === 0) return 1.0;
  if (abs === 1) return 0.95;
  if (abs === 2) return 0.85;
  if (abs === 3) return 0.60 + (0.12 * Math.min(inning, 9) / 9);
  return 0.5;
}
```

### 12.4 SMB4 Shorter Game Adaptation

```typescript
function getInningMultiplierSMB4(inning, totalInnings, halfInning) {
  const progress = inning / totalInnings;
  if (progress < 0.33) return 0.75;
  if (progress < 0.66) return 1.0;
  if (progress < 0.85) return 1.3;
  let mult = 1.8;
  if (halfInning === 'BOTTOM') mult *= 1.4;
  return mult;
}
```

### 12.5 Win Probability Added (WPA)

```
WPA = winProbabilityAfter - winProbabilityBefore
```

Stored on every AtBatEvent. Used for: Player of the Game (ranked by WPA), top moments, clutch attribution.

---

## 13. Clutch Attribution

### 13.1 Core Formula

```
clutchValue = baseValue × contactQuality × √(leverageIndex)
```

**Per C-025:** Contact Quality (CQ) weighted by LI — CQ tiers with LI as multiplier.

### 13.2 Contact Quality System (0.1 to 1.0)

```typescript
const DEFAULT_CONTACT_QUALITY = {
  'home_run': 1.0, 'line_drive': 0.85, 'fly_ball_deep': 0.75,
  'fly_ball_medium': 0.50, 'fly_ball_shallow': 0.35,
  'ground_ball_hard': 0.70, 'ground_ball_medium': 0.50,
  'ground_ball_weak': 0.30, 'popup_infield': 0.10,
  'strikeout': null  // No contact quality
};
```

### 13.3 Attribution by Play Type

**Hits:**

| Scenario | Batter | Pitcher | Notes |
|----------|--------|---------|-------|
| Home Run | +1.0 × CQ | -1.0 × (1-CQ) | Catcher -0.1 |
| Line Drive Single | +1.0 × CQ | -0.8 × (1-CQ) | |
| Bloop Single | +0.5 × CQ | -0.3 × (1-CQ) | |
| Double | +1.0 × CQ | -0.9 × (1-CQ) | |

**Outs (Batted):**

| Scenario | Batter | Pitcher | Fielder |
|----------|--------|---------|---------|
| Routine Fly | -0.3 × (1-CQ) | +0.4 × CQ | +0.1 |
| Diving Catch | -0.1 × CQ | +0.1 | +0.8 |
| Robbed HR | 0 | +0.3 | +1.0 |

**Strikeouts/Walks:**

| Scenario | Batter | Pitcher | Catcher |
|----------|--------|---------|---------|
| K Swinging | -1.0 | +1.0 | +0.1 |
| K Looking | -1.2 | +0.9 | +0.2 |
| Walk | +0.5 | -0.5 | -0.1 |

**Baserunning:**

| Scenario | Runner | Catcher | Manager |
|----------|--------|---------|---------|
| SB | +1.0 | -0.6 | +0.3 (if called) |
| CS | -1.0 | +0.7 | -0.4 (if called) |
| TOOTBLAN | -1.2 | — | — |

### 13.4 Arm Factor (Per C-033)

```typescript
function getArmFactor(armRating: number): number {
  return armRating / 100;  // 1-99 → 0.01-0.99
}
```

Per C-033: armFactor kept in clutch calculations. Applies to fielder blame on infield singles and sac fly arm blame.

### 13.5 Manager Decision Clutch

**Auto-detected:** Pitching change, pinch hitter, pinch runner, defensive sub, IBB.
**User-prompted (default: player autonomy):** Steal call, bunt call, squeeze call, hit-and-run.

### 13.6 Clutch Trigger Stacking

**Rule:** HIGHEST ONLY within categories, STACK across categories.

| Category | Triggers | Rule |
|----------|----------|------|
| Walk-off | Walk-off single/XBH/HR (+2 to +3) | Highest only |
| RBI Situation | Go-ahead, 2-out, bases loaded (+1 each) | Highest only |
| Special Hit | Grand Slam (+2) | Stacks with walk-off |
| Count | Hit on 0-2 (+1) | Stacks |

**Example:** Walk-off Grand Slam = +3 (walk-off) + 2 (grand slam) = **+5 base**.

### 13.7 Playoff Context Multipliers

```typescript
const PLAYOFF_MULTIPLIERS = {
  regular_season: 1.0, wild_card: 1.25,
  division_series: 1.5, championship_series: 1.75,
  world_series: 2.0,
  elimination_game: +0.5,  // Additive
  clinch_game: +0.25       // Additive
};
// WS Game 7 (both): 2.0 + 0.5 + 0.25 = 2.75×
```

### 13.8 Net Clutch Rating

```typescript
interface PlayerClutchStats {
  clutchPoints: number;
  chokePoints: number;
  netClutch: number;
  clutchMoments: number;
  chokeMoments: number;
  totalLI: number;
  plateAppearances: number;
  gmLI: number;  // totalLI / PA
}
```

---

## 14. Mojo & Fitness System

Mojo tracks in-game momentum. Fitness tracks physical wear across games. Both modify stat performance, WAR credit, Fame credit, and clutch attribution.

**Per C-081:** Mojo and fitness apply ONLY to user-played games. AI-simulated games do not run mojo/fitness calculations — they use baseline stat performance.

### 14.1 Mojo Levels

Five-level scale with internal values -2 to +2:

| Level | Value | Enum | Stat Effect | Visual |
|-------|-------|------|-------------|--------|
| Jacked | +2 | VERY_HIGH | +15-20% | 🔥🔥🔥 |
| Locked In | +1 | HIGH | +8-10% | 🔥🔥 |
| Normal | 0 | NEUTRAL | Baseline | ➖ |
| Tense | -1 | LOW | -8-10% | 😰 |
| Rattled | -2 | VERY_LOW | -15-20%, hard to escape | 😱 |

### 14.2 Mojo Carryover

```typescript
const MOJO_CARRYOVER_RATE = 0.3;  // 30% of excess carries

function calculateStartingMojo(endOfLastGame: number): number {
  const carryover = endOfLastGame * MOJO_CARRYOVER_RATE;
  return Math.round(carryover);
  // +2 → +1 (Locked In), -2 → -1 (Tense), ±1 → 0 (Normal)
}
```

### 14.3 Mojo Amplification

High-pressure situations amplify mojo effects:

| Situation | Amplification |
|-----------|---------------|
| Tie game, late innings (8th/9th) | 1.5× |
| RISP, 2 outs | 1.3× |
| Close game (1-2 runs) | 1.2× |
| Playoff game | 1.5× |
| Bases loaded | 1.4× |

### 14.4 Fitness States

Six categorical states:

| State | Internal | Multiplier | Playable | Description |
|-------|----------|------------|----------|-------------|
| Juiced | 120% | 1.20× | ✅ | Peak condition |
| Fit | 100% | 1.00× | ✅ | Normal, healthy |
| Well | 80% | 0.95× | ✅ | Minor fatigue |
| Strained | 60% | 0.85× | ⚠️ | Risky to play |
| Weak | 40% | 0.70× | ⚠️ | High injury risk |
| Hurt | 0% | N/A | ❌ | On IL |

### 14.5 Fitness Decay

```typescript
interface FitnessDecay {
  positionPlayer: {
    started: -3,
    pinchHit: -1,
    defensiveReplacement: -1,
    didNotPlay: +2,
  },
  pitcher: {
    starter: { base: -15, perInning: -2, highPitchCount: -5 },  // 100+ pitches
    reliever: { base: -5, perInning: -3, backToBack: -3 },
    closer: { base: -8, perInning: -2, backToBack: -5 },
    didNotPlay: +5,
  },
  catcher: {
    started: -5,
    perInning: -0.5,
    didNotPlay: +3,
  }
}
```

### 14.6 Fitness Recovery

```typescript
const DAILY_RECOVERY = {
  positionPlayer: 5,   // +5% per rest day
  pitcher: 8,          // +8% per rest day
  catcher: 6,          // +6% per rest day
};
const MAX_DAILY_RECOVERY = 15;

const TRAIT_MODIFIERS = {
  'Durable': 1.5,       // 50% faster
  'Injury Prone': 0.7,  // 30% slower
};

const CONSECUTIVE_REST_BONUS = {
  2: 1.10,   // 2 days off = +10%
  3: 1.20,   // 3 days off = +20%
  4: 1.25,   // 4+ days off = +25% (cap)
};

function calculateRecovery(player: Player, daysOff: number, currentFitness: number): number {
  let base = DAILY_RECOVERY[player.positionType];
  if (player.traits.includes('Durable')) base *= 1.5;
  else if (player.traits.includes('Injury Prone')) base *= 0.7;
  const restBonus = CONSECUTIVE_REST_BONUS[Math.min(daysOff, 4)] || 1;
  base *= restBonus;
  base = Math.min(base, MAX_DAILY_RECOVERY);
  return Math.min(currentFitness + base, 100);  // Cannot exceed Fit through natural recovery
}
```

### 14.7 Juiced State

**Per C-092:** Juiced is NOT achieved through rest. The 5+ consecutive days rest path is REMOVED.

Juiced (120%) is achieved ONLY through:

| Method | Duration |
|--------|----------|
| Random Event ("Hot Streak") | 5 games |
| Trait trigger | Varies |
| Narrative event | Varies |

```typescript
function checkJuicedEligibility(player: Player): boolean {
  return (
    player.fitness === 100 &&            // Must be Fit
    player.recentlyJuiced === false       // 20-game cooldown
  );
}
```

### 14.8 Injury Risk

| Fitness State | Chance/Game | Severity |
|---------------|-------------|----------|
| Juiced | 0.5% | 0.5× (quick) |
| Fit | 1% | 1.0× |
| Well | 2% | 1.0× |
| Strained | 5% | 1.5× |
| Weak | 15% | 2.0× |

**Modifiers:** Catcher ×1.3, Pitcher ×1.1, Durable ×0.6, Injury Prone ×1.8, Age 35+ ×1.3, Age 38+ ×1.6.

### 14.9 Fame Integration

**Juiced Fame Penalty:** Every game played while Juiced = **-1 Fame Boner**. All Fame-worthy events while Juiced receive **50% credit**.

**Mojo-Based Fame Modifiers:**

```typescript
function getMojoFameModifier(mojo: number): number {
  const MODIFIERS = { [-2]: 1.30, [-1]: 1.15, [0]: 1.00, [1]: 0.90, [2]: 0.80 };
  return MODIFIERS[mojo] || 1.00;
}
// Rattled +30% (overcoming pressure), Jacked -20% (easy when hot)
```

**Combined Calculation:**

```typescript
function calculateAdjustedFame(baseFame: number, mojo: number, fitness: FitnessState): number {
  let adjusted = baseFame * getMojoFameModifier(mojo);
  if (fitness === 'JUICED') adjusted *= 0.5;
  if (fitness === 'STRAINED') adjusted *= 1.15;  // Playing hurt bonus
  if (fitness === 'WEAK') adjusted *= 1.25;       // Gutsy performance
  return Math.round(adjusted);
}
```

### 14.10 WAR & Clutch Adjustments

```typescript
function getWARMultiplier(mojo: number, fitness: FitnessState): number {
  let mult = 1.0;
  // Mojo: Rattled +15%, Tense +7%, Normal 0%, Locked In -5%, Jacked -10%
  const mojoMult = { [-2]: 1.15, [-1]: 1.07, [0]: 1.00, [1]: 0.95, [2]: 0.90 };
  mult *= mojoMult[mojo] || 1.00;
  // Fitness: Juiced -15%, Strained +10%, Weak +20%
  if (fitness === 'JUICED') mult *= 0.85;
  else if (fitness === 'STRAINED') mult *= 1.10;
  else if (fitness === 'WEAK') mult *= 1.20;
  return mult;
}

function getClutchMultiplier(mojo: number): number {
  const mults = { [-2]: 1.30, [-1]: 1.15, [0]: 1.00, [1]: 0.90, [2]: 0.85 };
  return mults[mojo] || 1.00;
}
```

### 14.11 Mojo/Fitness Data Schema

```typescript
interface PlayerMojoFitness {
  playerId: string;
  currentMojo: number;                       // -2 to +2
  currentFitness: FitnessState;
  mojoHistory: MojoEntry[];
  fitnessHistory: FitnessEntry[];
  gamesAtJuiced: number;
  lastJuicedGame: number | null;
  juicedCooldown: number;                    // Games until can be Juiced again
  consecutiveDaysOff: number;
  battingSplitsByMojo: Map<number, BattingStats>;
  battingSplitsByFitness: Map<FitnessState, BattingStats>;
  pitchingSplitsByMojo?: Map<number, PitchingStats>;
  pitchingSplitsByFitness?: Map<FitnessState, PitchingStats>;
}

interface MojoEntry {
  gameId: string;
  startingMojo: number;
  endingMojo: number;
  peakMojo: number;
  lowMojo: number;
  events: MojoChangeEvent[];
}

interface FitnessEntry {
  date: string;
  state: FitnessState;
  reason: 'GAME_PLAYED' | 'REST_DAY' | 'INJURY' | 'RECOVERY' | 'RANDOM_EVENT';
}

type FitnessState = 'JUICED' | 'FIT' | 'WELL' | 'STRAINED' | 'WEAK' | 'HURT';
```

---

## 15. Modifier Registry & Special Events

**Per C-089:** All special events are rewritten as modifier registry entries. The modifier registry is the single system for all temporary and permanent stat/state modifications.

### 15.1 Modifier Structure

```typescript
interface Modifier {
  id: string;
  name: string;
  category: ModifierCategory;
  scope: ModifierScope;
  trigger: ModifierTrigger;
  probability: number;             // 0-1
  conditions: ModifierCondition[];
  effects: ModifierEffect[];
  duration: number | 'permanent';  // games or permanent
  stackable: boolean;
  maxStacks: number;
  title: string;
  descriptions: string[];
  narrativeTag: string;
}

type ModifierCategory =
  | 'MOJO_FITNESS' | 'RATING' | 'RELATIONSHIP'
  | 'PERSONALITY' | 'FAME' | 'MORALE' | 'NARRATIVE';

type ModifierScope = 'PLAYER' | 'TEAM' | 'LEAGUE';

type ModifierTrigger =
  | 'MILESTONE' | 'GAME_RESULT' | 'PERFORMANCE_THRESHOLD'
  | 'RANDOM_EVENT' | 'RELATIONSHIP_CHANGE' | 'NARRATIVE_EVENT';
```

### 15.2 Effect System

```typescript
interface ModifierEffect {
  type: EffectType;
  target: EffectTarget;
  value: number | string;
  formula?: string;
}

type EffectType =
  | 'STAT_BOOST' | 'STAT_PENALTY'
  | 'MOJO_CHANGE' | 'FITNESS_CHANGE'
  | 'FAME_BONUS' | 'FAME_BONER'
  | 'MORALE_CHANGE'
  | 'RELATIONSHIP_FORM' | 'RELATIONSHIP_STRAIN'
  | 'TRAIT_GAIN' | 'TRAIT_REMOVE'
  | 'NARRATIVE_TRIGGER';

type EffectTarget =
  | 'POW' | 'CON' | 'SPD' | 'FLD' | 'ARM'     // Position player stats
  | 'VEL' | 'JNK' | 'ACC'                       // Pitcher stats
  | 'ALL' | 'MOJO' | 'FITNESS'
  | 'FAME' | 'MORALE' | 'PERSONALITY' | 'TRAIT';
```

### 15.3 Registry Evaluation

When multiple modifiers are active:

1. **Same-target stacking:** Additive within same category, multiplicative across categories.
2. **Duration tracking:** Decrement game-based durations after each game. Remove expired modifiers.
3. **Conflict resolution:** If two modifiers target the same stat with opposite signs, apply net value (no cancellation floor).
4. **Cap:** Total modifier effect on any single stat capped at ±30%.

### 15.4 Example Registry Entries

```typescript
// Hot Streak event → Juiced modifier
const HOT_STREAK: Modifier = {
  id: 'MOD_HOT_STREAK',
  name: 'Hot Streak',
  category: 'MOJO_FITNESS',
  scope: 'PLAYER',
  trigger: 'RANDOM_EVENT',
  probability: 0.02,  // 2% per game
  conditions: [{ type: 'FITNESS_STATE', value: 'FIT' }],
  effects: [{ type: 'FITNESS_CHANGE', target: 'FITNESS', value: 'JUICED' }],
  duration: 5,
  stackable: false,
  maxStacks: 1,
  title: 'Hot Streak!',
  descriptions: ['{player} is feeling absolutely locked in lately...'],
  narrativeTag: 'HOT_STREAK'
};
```

---

## 16. Narrative System

### 16.1 Beat Reporter Entity

Each team has one beat reporter. The reporter's hidden personality drives narrative tone and fan morale influence.

```typescript
interface BeatReporter {
  // Canonical interface — aligned with SPINE_ARCHITECTURE.md §12
  id: string;
  firstName: string;
  lastName: string;
  teamId: string;
  personality: ReporterPersonality;       // Hidden from user
  alignment: 'FRIENDLY' | 'NEUTRAL' | 'HOSTILE';
  revealLevel: 'SURFACE' | 'BEAT' | 'INSIDER';  // INSIDER = permanent per C-068
  trustScore: number;                     // 0–100
  moraleInfluence: number;                // Cumulative this season, capped ±3 per game (C-069)
  tenure: number;                         // Seasons covering this team
  reputation: 'ROOKIE' | 'ESTABLISHED' | 'VETERAN' | 'LEGENDARY';
  storiesWritten: number;
  hiredDate: FictionalDate;
}

type ReporterPersonality =
  | 'OPTIMIST' | 'PESSIMIST' | 'BALANCED' | 'DRAMATIC' | 'ANALYTICAL'
  | 'HOMER' | 'CONTRARIAN' | 'INSIDER' | 'OLD_SCHOOL' | 'HOT_TAKE';
```

### 16.2 Personality Distribution

```typescript
const REPORTER_PERSONALITY_WEIGHTS = {
  OPTIMIST: 15, PESSIMIST: 10, BALANCED: 20, DRAMATIC: 12,
  ANALYTICAL: 10, HOMER: 8, CONTRARIAN: 8, INSIDER: 7,
  OLD_SCHOOL: 5, HOT_TAKE: 5
};
```

### 16.3 INSIDER Reveal Mechanic (Per C-068)

The INSIDER personality has a unique mechanic: when assigned to your team, the reporter **permanently** reveals a hidden player attribute.

- **Trigger:** First season with an INSIDER reporter on your team.
- **Reveal:** User sees the actual 0-100 value for one hidden trait (e.g., Loyalty, Charisma) for ONE player per season.
- **Permanence:** Once revealed, the value stays visible forever — it does NOT re-hide if the reporter leaves.
- **Selection:** Player with highest combined (hidden trait uncertainty × narrative impact) is chosen.

### 16.4 Reporter Morale Influence

**The 80/20 Rule:** Reporters align with their personality 80% of the time, go "off-brand" 20%.

```typescript
const PERSONALITY_ALIGNMENT_RATE = 0.80;

const REPORTER_MORALE_INFLUENCE = {
  OPTIMIST:   { basePerStory: +0.5, winBoost: +1,  lossBuffer: +0.5, streakAmplifier: 1.2 },
  PESSIMIST:  { basePerStory: -0.5, winBoost: 0,   lossBuffer: -1,   streakAmplifier: 0.8 },
  BALANCED:   { basePerStory: 0,    winBoost: +0.5, lossBuffer: -0.5, streakAmplifier: 1.0 },
  DRAMATIC:   { basePerStory: 0,    winBoost: +2,   lossBuffer: -2,   streakAmplifier: 1.5 },
  HOMER:      { basePerStory: +1,   winBoost: +2,   lossBuffer: 0,    streakAmplifier: 1.3 },
  HOT_TAKE:   { basePerStory: 0,    winBoost: random(+1,+3), lossBuffer: random(-3,0), streakAmplifier: random(0.5,2.0) },
  // ANALYTICAL, CONTRARIAN, INSIDER, OLD_SCHOOL follow similar pattern
};
```

**Per C-069:** Reporter morale influence capped at **±3 points per game**. No single reporter story or combination of stories can swing fan morale more than 3 points in either direction within one game day.

**Tenure Modifier:** Veteran reporters have more influence: `moraleChange *= (1 + Math.min(tenure * 0.1, 0.5))`.

### 16.5 Captain Storylines (Per C-067)

Beat reporter storylines reference the Team Captain (§17.6) in:

- **Leadership moments:** Captain's clutch hits/strikeouts get amplified narrative treatment (±50% morale swing magnitude).
- **Team chemistry:** Captain's relationships with teammates surface in storylines.
- **Morale events:** When Captain performs well → extra positive morale boost. When Captain struggles → amplified negative morale.
- **Locker room dynamics:** Captain's personality type colors team chemistry narratives.

### 16.6 Reporter Firing & Hiring

```typescript
const REPORTER_FIRING_CONFIG = {
  baseProbability: 0.05,  // 5% per season
  modifiers: {
    lowFanMorale: +0.03,
    highTenure: -0.02,
    hotTakePersonality: +0.05,
    homerPersonality: +0.02,
    pessimistWithWinningTeam: +0.04,
  },
  checkFrequency: 'MONTHLY'
};

// Firing triggers
type ReporterFiringTrigger =
  | 'CONTROVERSIAL_TAKE' | 'TEAM_COMPLAINT' | 'FAN_BACKLASH'
  | 'PUBLICATION_RESTRUCTURE' | 'RETIREMENT' | 'POACHED' | 'SCANDAL';
```

On firing, a new reporter is hired immediately with `tenure: 0`, `reputation: 'ROOKIE'`, and a randomly-weighted personality.

### 16.7 LLM Routing (50/50 Split)

```typescript
const CLOUD_ROUTING_PERCENTAGE = 0.50;

const NARRATIVE_ROUTING = {
  LOCAL_ONLY: ['BASIC_STAT_LINE', 'SIMPLE_SCORE_UPDATE', 'ROUTINE_LINEUP'],
  CLOUD_ONLY: [
    'NO_HITTER', 'PERFECT_GAME', 'MILESTONE', 'HISTORICAL_CALLBACK',
    'CONTROVERSY', 'TRADE_AFTERMATH', 'PLAYOFF_CLINCH', 'CHAMPIONSHIP'
  ],
  SHARED_POOL: [
    'GAME_RECAP', 'WALK_OFF', 'BLOWOUT_WIN', 'BLOWOUT_LOSS',
    'CLOSE_GAME', 'PLAYER_HIGHLIGHT', 'STREAK_UPDATE',
    'STANDINGS_IMPACT', 'RIVALRY_GAME', 'EMOTIONAL_MOMENT',
    'LINEUP_ANALYSIS', 'PRE_GAME_PREVIEW', 'POST_GAME_QUOTE'
  ]
};
```

### 16.8 Player Quotes

**80/20 Rule:** Players align with hidden personality 80% of the time, go off-brand 20%.

```typescript
function generatePlayerQuote(player: Player, situation: QuoteSituation, useLLM: boolean): PlayerQuote {
  const effectivePersonality = Math.random() < 0.80
    ? player.hiddenPersonality
    : getOffBrandPersonality(player);

  if (!useLLM) {
    return { quote: pickRandom(QUOTE_TEMPLATES[effectivePersonality][situation.type]) };
  }
  return llm.generateQuote({ playerName: player.name, personality: effectivePersonality, situation });
}
```

### 16.9 Narrative Data Model

```typescript
interface Narrative {
  id: string;
  type: NarrativeType;
  scope: 'LEAGUE' | 'TEAM' | 'PLAYER' | 'GAME';
  headline: string;
  body: string;
  quotes?: PlayerQuote[];
  author: BeatReporter;
  tone: NarrativeTone;
  priority: 1 | 2 | 3;
  relatedEntities: string[];
  tags: string[];
  historicalReferences?: string[];
  generatedAt: GameDate;
  publishedAt: GameDate;
  expiresAt: GameDate;
  moraleInfluence: number;
  applied: boolean;
}

type NarrativeType =
  | 'PRE_GAME_MAIN' | 'PRE_GAME_SUB'
  | 'POST_GAME_RECAP' | 'POST_GAME_SPOTLIGHT'
  | 'IN_GAME_MOMENT' | 'LEAGUE_HEADLINE' | 'LEAGUE_UPDATE'
  | 'RUMOR' | 'FEATURE' | 'INSIDER_SCOOP'
  | 'OFFSEASON_CEREMONY' | 'MILESTONE' | 'TRADE_REACTION' | 'LINEUP_NOTE';

type NarrativeTone =
  | 'CELEBRATORY' | 'CRITICAL' | 'NEUTRAL' | 'DRAMATIC'
  | 'ANALYTICAL' | 'HOPEFUL' | 'CONCERNED' | 'NOSTALGIC';
```

---

## 17. Dynamic Designations

Six designation types that update during the season, influencing fan morale, Fame, narrative, and free agency.

### 17.1 Team MVP

- **Criteria:** Highest total WAR on team.
- **Min Games:** 20% of season (min 5 for 32-game seasons).
- **Mid-Season:** Dotted border badge, "Proj. MVP".
- **Season End:** Solid border badge, "Team MVP" → earns Cornerstone.
- **Fame:** +1.5 at season end.
- **Carries Over:** No.

### 17.2 Ace

- **Criteria:** Highest pWAR among team pitchers.
- **Min Games:** 20% of season as pitcher (min 4).
- **Min pWAR:** 0.5 (prevents meaningless designation on bad teams).
- **Mid-Season:** Dotted border badge, "Proj. Ace".
- **Season End:** Solid border badge, "Ace".
- **Fame:** +1.0 at season end.
- **Carries Over:** No.

### 17.3 Fan Favorite

- **Criteria:** Highest positive Value Delta (True Value − Contract).
- **Min Games:** 10% of season (min 3).
- **Mid-Season:** Dotted border badge, "Proj. Fan Fav".
- **Season End:** Solid border badge, "Fan Favorite".
- **Fame:** +2 at season end.
- **Carries Over:** Yes, until 10% of new season completes.

### 17.4 Albatross

- **Criteria:** Most negative Value Delta (True Value − Contract).
- **Min Games:** 10% of season (min 3).
- **Mid-Season:** Dotted border badge, "Proj. Albatross".
- **Season End:** Solid border badge, "Albatross".
- **Fame:** -1 at season end.
- **Per C-056:** 15% trade discount (not 30%) — other teams demand 15% less in trade value when acquiring an Albatross.
- **Carries Over:** Yes, until 10% of new season completes.

### 17.5 Cornerstone

- **Criteria:** Awarded to previous season's Team MVP.
- **Display:** Solid border badge, "Cornerstone".
- **Fame:** +1.0 (new), +0.3 (retained each season).
- **FA Effect:** +10% retention bonus.
- **Carries Over:** Yes, permanently while player remains on team.
- **Multiple:** A team can have multiple Cornerstones.

### 17.6 Team Captain (Per C-057)

- **Criteria:** Highest combined (Loyalty + Charisma) modifier on team.
- **No Minimums:** No minimum tenure or trait value required.
- **Tiebreaker:** (1) More seasons on team, (2) higher current-season WAR.
- **Assignment:** Calculated at season start. Does NOT change mid-season.
- **Display:** Solid border badge, "Captain" (visible even though Charisma is hidden).
- **Uniqueness:** Only one per team.
- **Effect on Charisma:** Captain's Charisma counts **double** toward teammate morale effects.
- **Effect on Narrative:** Per C-067, Captain referenced in leadership/chemistry storylines with ±50% morale swing amplification.

### 17.7 Young Player Designation (Per C-047)

- **Criteria:** Random selection from team's top-3 farm prospects.
- **Purpose:** Highlights promising youth for narrative and fan engagement.
- **Assignment:** At season start, one prospect per team is designated "Young Player to Watch".
- **Display:** Informational badge — no mechanical effects on stats.
- **Narrative:** Beat reporter references in prospect/development storylines.

### 17.8 Badge Visual Design

| Designation | Border Color | Background |
|-------------|-------------|------------|
| Team MVP | Gold (#FFD700) | Light gold |
| Ace | Royal Blue (#4169E1) | Light blue |
| Fan Favorite | Green (#22C55E) | Light green |
| Albatross | Red (#EF4444) | Light red |
| Cornerstone | Bronze (#CD7F32) | Gold→bronze gradient |
| Team Captain | Purple (#7C3AED) | Light purple |

Mid-season: dotted border. Locked (season end): solid border.

### 17.9 Change Notifications

```typescript
interface DesignationChangeEvent {
  type: 'MVP' | 'ACE' | 'FAN_FAVORITE' | 'ALBATROSS';
  teamId: string;
  previousHolder: { playerId: string; playerName: string; value: number } | null;
  newHolder: { playerId: string; playerName: string; value: number };
  margin: number;
  gamesPlayed: number;
  seasonPercentComplete: number;
}
```

**Rules:** Only fire when designation changes hands. Suppress in first 5% of season (too volatile). Include margin to show closeness of race.

### 17.10 In-Season Fan Morale Effects (Per C-055)

```typescript
const DESIGNATION_HAPPINESS = {
  mvp:         { bigGame: +1, clutchHit: +0.5, collapseGame: -0.5 },
  ace:         { qualityStart: +0.5, dominantStart: +1, blownStart: -0.5, blownSave: -1 },
  fanFavorite: { bigGame: +0.75, clutchHit: +1, walkoff: +2 },
  albatross:   { bigGame: 0, clutchFailure: -0.75, costlyError: -1, benchedForYounger: -0.5 },
  cornerstone: { bigGame: +0.5, clutchHit: +0.75, milestone: +1.5, slump: 0, collapseGame: 0 },
  // Cornerstone: NO PENALTY for slumps — earned trust
};
```

### 17.11 Establishment Multiplier (Per C-055)

Controls how much designation effects matter based on season progress and playoff position:

```typescript
function getEstablishmentMultiplier(seasonPct: number, playoffStatus: PlayoffStatus): number {
  let base = seasonPct < 0.30 ? 0.5 : 1.0;  // Early season = 50% weight
  if (seasonPct >= 0.60) base *= getPlayoffContextModifier(seasonPct, playoffStatus);
  return base;
}
```

| Playoff Status | Late (60-90%) | Final Stretch (90%+) |
|----------------|---------------|----------------------|
| Clinched | ×0.75 | ×0.50 |
| In Hunt (≤5 GB) | ×1.25 | ×1.50 |
| Fringe (5-10 GB) | ×1.00 | ×1.15 |
| Fading (>10 GB) | ×0.85 | ×0.75 |
| Eliminated | ×0.50 | ×0.50 |

### 17.12 Cornerstone Baseline Bonus

```typescript
function getCornerstoneBaselineBonus(count: number): number {
  if (count === 0) return 0;
  let bonus = 3;  // First Cornerstone: +3
  for (let i = 1; i < count; i++) bonus += 1.5;  // Each additional: +1.5
  return Math.min(8, bonus);  // Cap at +8
}
```

### 17.13 Designation Data Schema

```typescript
interface PlayerDesignationStatus {
  playerId: string;
  playerName: string;
  teamId: string;
  seasonId: string;
  projectedMVPRank: number | null;
  projectedAceRank: number | null;
  projectedFanFavoriteRank: number | null;
  projectedAlbatrossRank: number | null;
  currentWAR: number;
  currentPWAR: number;
  currentValueDelta: number;
  gamesPlayed: number;
  gamesAsQualifyingPitcher: number;
  lockedDesignations: { teamMVP: boolean; ace: boolean; fanFavorite: boolean; albatross: boolean };
  isCornerstone: boolean;
  cornerstoneEarnedSeasonId: string | null;
}

interface TeamDesignationState {
  teamId: string;
  seasonId: string;
  projectedMVP: { playerId: string; playerName: string; war: number } | null;
  projectedAce: { playerId: string; playerName: string; pwar: number } | null;
  projectedFanFavorite: { playerId: string; playerName: string; valueDelta: number } | null;
  projectedAlbatross: { playerId: string; playerName: string; valueDelta: number } | null;
  lockedMVP: string | null;
  lockedAce: string | null;
  lockedFanFavorite: string | null;
  lockedAlbatross: string | null;
  cornerstones: Array<{ playerId: string; playerName: string; earnedSeasonId: string }>;
  captain: { playerId: string; playerName: string } | null;
  previousFanFavorite: string | null;
  previousAlbatross: string | null;
  carryoverCleared: boolean;
}
```

---

## 18. Milestone System

Milestones are achievement thresholds at three scopes — single-game, season, and career — that drive Fame (Bonus/Boner), narrative, fan morale, and player morale.

### 18.1 Adaptive Threshold Scaling

All thresholds stored as MLB baselines, scaled at runtime using dual-factor system:

```typescript
interface MilestoneConfig {
  gamesPerSeason: number;    // e.g., 128 for SMB4
  inningsPerGame: number;    // e.g., 6 for SMB4
}

const MLB_BASELINE_GAMES = 162;
const MLB_BASELINE_INNINGS = 9;

function getSeasonScalingFactor(config: MilestoneConfig): number {
  return config.gamesPerSeason / MLB_BASELINE_GAMES;  // 128/162 = 0.79
}

function getInningsScalingFactor(config: MilestoneConfig): number {
  return config.inningsPerGame / MLB_BASELINE_INNINGS;  // 6/9 = 0.67
}

function getCombinedScalingFactor(config: MilestoneConfig): number {
  return getSeasonScalingFactor(config) * getInningsScalingFactor(config);  // 0.53
}
```

**Scaling Types:**

| Type | Formula | Use Case |
|------|---------|----------|
| `counting` | `threshold × seasonFactor` | HR, Hits, RBI, Wins, Saves |
| `innings` | `threshold × combinedFactor` | IP, Pitcher K, Wild Pitches |
| `none` | No scaling | No-hitters, Awards |

### 18.2 Single-Game Milestones (Selected)

**Positive (Fame Bonus):**

| Milestone | Requirement | Fame | Celebration |
|-----------|-------------|------|-------------|
| Perfect Game | 9+ IP, 27 up 27 down | +10.0 | Legendary |
| No-Hitter | 9+ IP, 0 H | +6.0 | Legendary |
| 4 HR Game | 4 HR | +4.0 | Legendary |
| Cycle | 1B+2B+3B+HR | +2.0 | Major |
| Walk-Off Grand Slam | Bases-loaded walk-off HR | +3.0 | Major |
| Immaculate Inning | 3K on 9 pitches | +1.5 | Major |
| Unassisted Triple Play | 3 outs solo | +5.0 | Legendary |

**Negative (Fame Boner):**

| Milestone | Requirement | Fame | Notes |
|-----------|-------------|------|-------|
| Titanium Sombrero | 6 K | -3.0 | Historic futility |
| 4+ Error Game | 4+ errors | -3.0 | Defensive meltdown |
| Epic Blown Save | Blow 3+ run lead in 9th | -1.5 | Devastating |
| Wild Pitch Walk-Off | WP scores winning run | -1.5 | Crushing |

### 18.3 Season Milestones (Selected, Scaled for 128g/6inn)

**Batting Clubs (literal scaled numbers):**

| Club | Requirement | Fame | MLB Equivalent |
|------|-------------|------|----------------|
| 25-25 Club | 25 HR + 25 SB | +2.0 | ~32-32 |
| 30-30 Club | 30 HR + 30 SB | +3.5 | ~38-38 |
| 40-40 Club | 40 HR + 40 SB | +6.0 | ~51-51 |
| .400 Season | .400+ BA | +6.0 | Rate stat |
| Triple Crown | Lead AVG+HR+RBI | +8.0 | Same |

**WAR-Based Season Milestones (NO scaling — WAR already time-adjusted):**

| Milestone | Threshold | Fame |
|-----------|-----------|------|
| 5 WAR Season | 5.0+ total | +1.5 |
| 7 WAR Season | 7.0+ total | +3.0 |
| 10 WAR Season | 10.0+ total | +5.0 |
| 12+ WAR Season | 12.0+ total | +8.0 |

### 18.4 Career Milestones

**Per C-065:** Career WAR milestones scale with `opportunityFactor` because career accumulation depends on season length. Season WAR milestones do NOT scale (already rate-adjusted).

**Dual-Threshold System:**

1. **Dynamic Top 10%** (primary) — calculated from franchise history after 10+ completed careers.
2. **Fixed Floor** (secondary) — pre-scaled MLB baselines, prevents too-easy HOF in early years.

```typescript
function getEffectiveThreshold(stat: string, franchiseHistory: FranchiseHistory): number {
  const dynamic = calculateTop10Percentile(franchiseHistory.getAllCareerValues(stat));
  const fixedFloor = FIXED_THRESHOLD_FLOORS[stat];
  return Math.max(dynamic, fixedFloor);  // Whichever is MORE demanding
}
```

**Career HR Fixed Floors (scaled ×0.79):** 20, 40, 80, 120, 160, 200, 240, 315, 395, 475, 555.
**Career WAR (scaled by opportunityFactor):** 10, 20, 30, 40, 50, 60, 70, 80, 100.
**Awards (no scaling):** Career All-Stars, MVPs, Cy Youngs.

### 18.5 Franchise Firsts & Leaders

**Franchise Firsts:** First player to achieve any milestone gets bonus Fame (+0.5 to +3.0).

**Franchise Leaders:** Taking the lead in a career stat category = +0.75 to +1.5 Fame. Holding the lead at season end = +0.2 to +0.3 annual bonus.

### 18.6 Legacy Status Tiers

| Status | Seasons | WAR | Awards | HOF | Fame |
|--------|---------|-----|--------|-----|------|
| Franchise Cornerstone | 2+ | 5+ | — | — | +2.0 |
| Franchise Icon | 3+ | 10+ | 1+ | — | +4.0 |
| Franchise Legend | 5+ | 18+ | 2+ | Yes | +8.0 |

WAR accumulated with same team only. Evaluated at season end. Persists after retirement.

### 18.7 Team Milestones

| Milestone | Requirement (scaled) | All-Player Fame | Fan Morale |
|-----------|---------------------|-----------------|------------|
| 100-Win Season | 79+ wins | +0.5 | +15% |
| Division Title | Win division | +0.5 | +10% |
| World Series Win | Win championship | +3.0 | +40% |
| Dynasty | 3+ titles in 5yr | +8.0 | +60% |
| 100-Loss Season | 79+ losses | -0.5 | -20% |
| Blown 3-0 Lead | Lose series after 3-0 | -2.0 | -30% |

### 18.8 Milestone Data Structures

```typescript
type MilestoneScope = 'single_game' | 'season' | 'career';
type MilestonePolarity = 'positive' | 'negative';

interface MilestoneDefinition {
  id: string;
  scope: MilestoneScope;
  polarity: MilestonePolarity;
  category: 'batting' | 'pitching' | 'fielding' | 'team' | 'aggregate';
  name: string;
  statKey: string;
  threshold: number;
  thresholds?: number[];        // Multi-tier career milestones
  fameChange: number;
  celebrationTier: 'minor' | 'major' | 'legendary';
  scalingType: 'counting' | 'innings' | 'none';
}

interface AchievedMilestone {
  id: string;
  definitionId: string;
  playerId: string;
  teamId: string;
  scope: MilestoneScope;
  threshold: number;
  actualValue: number;
  achievedAt: { seasonId: string; gameId?: string; inning?: number };
  isFirstInFranchise: boolean;
  famePointsAwarded: number;
  wasSimulated: boolean;
}
```

---

## 19. Fan Favorite & Albatross Trade Mechanics

### 19.1 Albatross Trade Discount (Per C-056)

When a player carries the Albatross designation, other teams demand **15% less** in trade value to acquire them.

```typescript
function getAlbatrossTradeDiscount(player: Player): number {
  if (player.designation === 'ALBATROSS') return 0.15;  // 15% discount
  return 0;
}

function calculateTradeValue(player: Player, baseValue: number): number {
  const discount = getAlbatrossTradeDiscount(player);
  return baseValue * (1 - discount);
}
```

**Rationale:** 15% (not 30%) keeps Albatross players tradeable without making them too easy to dump.

### 19.2 Fan Favorite Trade Protection

Fan Favorites traded away trigger amplified negative fan morale (-10 base, -5 additional for Fan Favorite status). The departed Fan Favorite's designation carries over to the acquiring team for the remainder of that season.

---

## 20. Fan Morale System

### 20.1 Core Formula

```typescript
function calculateFanMorale(team: Team, season: Season): number {
  const performanceGap = calculatePerformanceGap(team, season) * 0.60;
  const designationScore = calculateDesignationScore(team) * 0.20;
  const beatReporterScore = calculateBeatReporterSentiment(team) * 0.10;
  const rosterRandomScore = calculateRosterAndRandom(team, season) * 0.10;
  return clamp(Math.round(performanceGap + designationScore + beatReporterScore + rosterRandomScore), 0, 99);
}
```

**Weights:** 60% performance gap, 20% designations, 10% beat reporter, 10% roster + random events.

### 20.2 Fan Morale Scale

```typescript
interface FanMorale {
  current: number;           // 0-99
  previous: number;
  trend: 'RISING' | 'STABLE' | 'FALLING';
  streak: number;
  state: FanState;
  riskLevel: 'SAFE' | 'WATCH' | 'DANGER' | 'CRITICAL';
}

type FanState =
  | 'EUPHORIC'      // 90-99: Championship fever
  | 'EXCITED'       // 75-89: Playoff buzz
  | 'CONTENT'       // 55-74: Satisfied
  | 'RESTLESS'      // 40-54: Growing impatient
  | 'FRUSTRATED'    // 25-39: Angry but loyal
  | 'APATHETIC'     // 10-24: Checked out
  | 'HOSTILE';      // 0-9:  Demanding change
```

### 20.3 Event Catalog (Selected)

**Game Results:** Win +1, Loss -1, Walk-off ±3, No-hitter +5, Shutout ±2.
**Streaks:** 3-game ±2, 5-game ±5, 7+ game ±8/±10.
**Trades:** Acquire star +8, Trade away star -10, Salary dump -8.
**Roster:** Top prospect call-up +5, Star to IL -5, Star returns +5.
**Milestones:** Player milestone +4, Clinch playoff +15, Division title +20, Eliminated -15.

### 20.4 Contextual Modifiers

**Performance vs Expectations:**
- Vastly exceeding: positive events ×1.5, negative ×0.5
- Vastly under: positive events ×0.5, negative ×1.5

**Timing:** September playoff race ×1.5, Eliminated ×0.5, Early season ×0.8, Trade deadline week ×1.3.

### 20.5 Trade Scrutiny System

14-game tracking period after each trade. Fan verdict evolves: TOO_EARLY → LOOKING_GOOD / JURY_OUT / LOOKING_BAD / DISASTER. Wins/losses during scrutiny are amplified based on verdict direction.

### 20.6 Morale Decay & Recovery

Natural drift toward baseline (determined by expected wins differential + standings + history). Drift 1-2 points per series. Momentum builds with consecutive same-direction changes (up to 50% amplification).

### 20.7 Franchise Health Warning (Per C-084)

**Per C-084:** Two consequence mechanisms for low morale:

1. **Franchise Health Warning** (visual) — below 25 morale triggers warning indicators. Below 10 = CRITICAL.
2. **EOS Modifier** (mechanical) — end-of-season modifier affects offseason outcomes.

```typescript
function getFranchiseHealthWarning(team: Team): FranchiseWarning | null {
  if (team.fanMorale.current >= 25) return null;
  return {
    level: team.fanMorale.current < 10 ? 'CRITICAL' : 'WARNING',
    effects: ['FA destination penalty', 'Player morale drag', 'Negative reporter coverage']
  };
}
```

### 20.8 Consequences of Morale

**Player Morale:** Fan morale ≥80 → +3 player morale adjustment. ≤30 → -3. Personality modifiers apply (Egotistical ×1.5, Relaxed ×0.5).

**FA Attractiveness (Per C-093):** Baseline formula only — `(fanMorale - 50) × 0.5`. State-based bonuses REMOVED per C-093. Euphoric = +5 bonus, Hostile = -10 penalty. No state-based FA bonuses beyond the baseline formula.

**Narrative:** Morale state drives beat reporter tone and coverage intensity.

### 20.9 Fan Morale Data Model

```typescript
interface TeamFanMorale {
  teamId: string;
  current: number;
  previous: number;
  trend: 'RISING' | 'STABLE' | 'FALLING';
  trendStreak: number;
  state: FanState;
  baseline: number;
  lastUpdated: GameDate;
  eventHistory: MoraleEvent[];
  dailySnapshots: DailyMoraleSnapshot[];
  activeTradeAftermaths: TradeAftermath[];
  seasonHigh: number;
  seasonLow: number;
  averageMorale: number;
}

type MoraleEventType =
  | 'WIN' | 'LOSS' | 'WALK_OFF_WIN' | 'WALK_OFF_LOSS'
  | 'NO_HITTER' | 'GOT_NO_HIT' | 'SHUTOUT_WIN' | 'SHUTOUT_LOSS'
  | 'WIN_STREAK_3' | 'WIN_STREAK_5' | 'WIN_STREAK_7'
  | 'LOSE_STREAK_3' | 'LOSE_STREAK_5' | 'LOSE_STREAK_7'
  | 'TRADE_ACQUIRE_STAR' | 'TRADE_LOSE_STAR' | 'TRADE_SALARY_DUMP'
  | 'CALL_UP_TOP_PROSPECT' | 'STAR_TO_IL' | 'STAR_RETURNS'
  | 'PLAYER_MILESTONE' | 'CLINCH_PLAYOFF' | 'CLINCH_DIVISION' | 'ELIMINATED'
  | 'OPENING_DAY' | 'RIVALRY_SWEEP' | 'SWEPT_BY_RIVAL'
  | 'EXPECTED_WINS_UPDATE' | 'NATURAL_DRIFT' | 'SEASON_ASSESSMENT';
```

---

## 21. Standings & Playoffs

### 21.1 Division Structure

League structure defined in Mode 1 (League Builder). Mode 2 computes standings from game results.

```typescript
interface Standings {
  divisionId: string;
  teams: StandingsEntry[];
  lastUpdated: GameDate;
}

interface StandingsEntry {
  teamId: string;
  wins: number;
  losses: number;
  winPct: number;
  gamesBack: number;
  streak: { type: 'W' | 'L'; count: number };
  last10: { wins: number; losses: number };
  homeRecord: { wins: number; losses: number };
  awayRecord: { wins: number; losses: number };
  divisionRecord: { wins: number; losses: number };
  runsScored: number;
  runsAllowed: number;
  runDifferential: number;
  pythagoreanWinPct: number;
  magicNumber: number | null;        // null if not applicable
  eliminationNumber: number | null;
  playoffStatus: PlayoffStatus;
}

type PlayoffStatus =
  | 'CLINCHED_DIVISION' | 'CLINCHED_WILDCARD' | 'CLINCHED_PLAYOFF'
  | 'IN_HUNT' | 'FRINGE' | 'FADING' | 'ELIMINATED';
```

### 21.2 Tiebreakers

When teams finish with identical records:

1. Head-to-head record
2. Division record (if same division)
3. Record vs common opponents
4. Run differential
5. Last 20 games record
6. Coin flip (randomized)

### 21.3 Playoff Bracket

Playoff structure configurable in Mode 1. Standard format:

- **Wild Card Round:** Best-of-3
- **Division Series:** Best-of-5
- **Championship Series:** Best-of-7
- **World Series:** Best-of-7

Home-field advantage to higher seed. Reseeding after each round.

### 21.4 Magic Number / Elimination Number

```typescript
function calculateMagicNumber(team: StandingsEntry, secondPlace: StandingsEntry, gamesRemaining: number): number | null {
  if (team.wins <= secondPlace.wins) return null;  // Not leading
  return gamesRemaining + 1 - (team.wins - secondPlace.wins);
}

function calculateEliminationNumber(team: StandingsEntry, firstPlace: StandingsEntry, gamesRemaining: number): number | null {
  const maxWins = team.wins + gamesRemaining;
  if (maxWins >= firstPlace.wins) return null;  // Still alive
  return firstPlace.wins - maxWins;
}
```

### 21.5 Standings Computation Timing

Standings recompute after every completed game. Playoff clinch/elimination events trigger fan morale events (§20) and narrative stories (§16).

---

## 22. Schedule System

### 22.1 Schedule Generation (Per C-079)

**Per C-079:** Schedule is **pre-generated + editable**. Generated at season start based on league structure, then user can manually adjust.

```typescript
interface ScheduleEntry {
  gameNumber: number;
  dayNumber: number;
  date: GameDate;
  time?: string;
  awayTeamId: string;
  homeTeamId: string;
  status: GameStatus;
  result?: GameResult;
}

type GameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SIMULATED' | 'SKIPPED';
```

### 22.2 Auto-Pull Logic

```typescript
function getNextScheduledGame(schedule: ScheduleEntry[], teamId?: string): ScheduleEntry | null {
  return schedule
    .filter(g => g.status === 'SCHEDULED')
    .filter(g => !teamId || g.awayTeamId === teamId || g.homeTeamId === teamId)
    .sort((a, b) => a.gameNumber - b.gameNumber)[0] || null;
}
```

### 22.3 SIMULATE Button (Per C-080)

**Per C-080:** SIMULATE button scoped to AI-controlled games ONLY.

- **User games** (user's team playing): Show "SCORE GAME" → opens GameTracker.
- **AI games** (two AI teams): Show "SIMULATE" → runs AI Game Engine (§25).
- **Mixed view:** Schedule shows both buttons appropriately per game type.

### 22.4 Season Classification

```typescript
type SeasonClassification = 'PRIMARY' | 'MIXED' | 'SIMULATED';
// PRIMARY: 75%+ games manually played
// MIXED: 25-74% manually played
// SIMULATED: <25% manually played
```

### 22.5 Game Increment

New games auto-increment: `newGameNumber = maxGameNumber + 1`. Empty state (season start): 0 games, filled via Add Game modal or schedule generation.

---

## 23. Adaptive Standards Engine

The foundational system that calculates league baselines, replacement level, and contextually appropriate thresholds. All thresholds in KBL are MLB baselines scaled at runtime.

### 23.1 Opportunity Factor

```typescript
const MLB_BASELINE_GAMES = 162;
const MLB_BASELINE_INNINGS = 9;

function calculateOpportunityFactor(config: FranchiseConfig): number {
  return (config.gamesPerTeam * config.inningsPerGame) / (MLB_BASELINE_GAMES * MLB_BASELINE_INNINGS);
}

function calculateScalingFactors(config: FranchiseConfig): ScalingFactors {
  const gameFactor = config.gamesPerTeam / 162;
  const inningsFactor = config.inningsPerGame / 9;
  return {
    opportunityFactor: gameFactor * inningsFactor,
    gameFactor,
    inningsFactor,
  };
}
```

**Scaling Examples (128g × 6inn, factor = 0.53):**

| MLB Threshold | Scaled | Type |
|---------------|--------|------|
| 500 HR career | 265 HR | counting |
| 3000 Hits career | 1,590 Hits | counting |
| 200 K pitcher season | 106 K | innings |
| 40 HR season (counting) | 32 HR | counting |
| .300 AVG | .300 | none (rate stat) |
| 3.00 ERA | 3.00 | none (rate stat) |

### 23.2 Scaling Rules

| Stat Type | Scales? | Factor | Reason |
|-----------|---------|--------|--------|
| Counting (HR, Hits, RBI, W, SV) | ✅ | opportunityFactor | Accumulate over innings |
| Pitcher counting (K, IP, WP) | ✅ | combinedFactor | Innings-dependent |
| Rate (AVG, ERA, OBP, WHIP) | ❌ | none | Already per-opportunity |
| Per-9 (K/9, HR/9) | ❌ | none | Already per-inning |
| Games played | ✅ | gameFactor only | Not innings-dependent |
| PA/IP qualification | ✅ | opportunityFactor | Opportunity-based |
| WAR thresholds (career) | ✅ | opportunityFactor | Per C-065 |
| WAR thresholds (season) | ❌ | none | Already rate-adjusted |

### 23.3 SMB4 Static Defaults (v1)

```typescript
const SMB4_DEFAULTS = {
  leagueAVG: 0.288,
  leagueOBP: 0.340,
  leagueSLG: 0.445,
  leagueERA: 4.04,
  leagueWOBA: 0.329,         // Per C-058
  wOBAScale: 1.7821,          // Per C-058
  FIPConstant: 3.28,           // Per C-059
  runsPerWin: 10,              // Scaled: 10 × (seasonGames / 162)
  replacementLevelWinPct: 0.294,
  replacementLevelBatting: -0.020,  // R/PA
  replacementLevelPitching: 5.5,     // RA9
};
```

### 23.4 Qualification Thresholds

```typescript
function getQualifyingPA(config: FranchiseConfig): number {
  return Math.floor(3.1 * config.gamesPerTeam);
}

function getQualifyingIP(config: FranchiseConfig): number {
  return config.gamesPerTeam;  // 1 IP per team game
}
```

### 23.5 Minimum Floors

```typescript
const MINIMUM_FLOORS = {
  seasonHR: 5,       // Never less than 5 HR for season milestone
  seasonHits: 20,    // Never less than 20 hits
  seasonWins: 3,     // Never less than 3 pitcher wins
  careerHR: 20,      // Never less than 20 career HR
  clubMinimum: 5,    // Any "X-Y Club" requires at least 5 in each category
};
```

### 23.6 Position-Specific Adjustments

```typescript
const POSITIONAL_MULTIPLIERS = {
  C: 1.20,    // Catcher premium
  SS: 1.10,   // Shortstop premium
  CF: 1.05,   // Center field premium
  '2B': 1.05, // Second base premium
  '3B': 1.00, // Third base neutral
  LF: 0.95,   // Left field discount
  RF: 0.95,   // Right field discount
  '1B': 0.90, // First base discount
  DH: 0.85,   // DH discount
};
```

---

## 24. Stadium Analytics & Park Factors

### 24.1 Park Factor Structure

```typescript
interface ParkFactors {
  overall: number;           // 0.85-1.15 typical
  runs: number;
  homeRuns: number;
  hits: number;
  doubles: number;
  triples: number;
  strikeouts: number;
  walks: number;
  leftHandedHR: number;     // Handedness splits
  rightHandedHR: number;
  leftHandedAVG: number;
  rightHandedAVG: number;
  directionFactors: Record<Direction, number>;  // Spray zone direction factors
  gamesIncluded: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  source: 'SEED' | 'CALCULATED' | 'BLENDED';
}
```

### 24.2 Activation & Confidence (Per C-088)

**Per C-088:** Confidence-based blending between seed and calculated factors.

- **Activation:** Park factors activate after **40% of season** played (sufficient home/away data).
- **Before activation:** No park adjustments applied.

```typescript
const PARK_FACTOR_CONFIG = {
  ACTIVATION_THRESHOLD: 0.40,              // 40% of season
  MIN_GAMES_LOW_CONFIDENCE: 10,
  MIN_GAMES_MEDIUM_CONFIDENCE: 30,
  MIN_GAMES_HIGH_CONFIDENCE: 81,
  SEED_BLEND_WEIGHT: {
    LOW: 0.70,       // 70% seed, 30% calculated
    MEDIUM: 0.30,    // 30% seed, 70% calculated
    HIGH: 0.00       // 100% calculated
  }
};
```

### 24.3 Calculation Formula

```
Park Factor = (homeStatRate / homeGames) / (roadStatRate / roadGames)
```

For individual stats: `Stat PF = (statAtHome / homeG) / (statOnRoad / roadG)`.

### 24.4 Seed Park Factors

Stadium dimensions sourced from BillyYank Super Mega Baseball Guide (3rd Edition). Seed factors derived from physical characteristics:

- **Avg distance** → HR factor (shorter = more HR).
- **Wall height** → HR adjustment.
- **Foul territory** → AVG adjustment (Small +2%, Large -3%).

### 24.5 Spray Chart System

7 spray zones: LEFT_LINE, LEFT_FIELD, LEFT_CENTER, CENTER, RIGHT_CENTER, RIGHT_FIELD, RIGHT_LINE. Each batted ball event records zone, distance, angle, outcome, exit velocity (optional), and batter handedness. Spray charts support heat map visualization with filters for handedness, time range, and individual players.

### 24.6 Stadium Records

Track single-game records (most runs, most HR), HR distance records by zone, career records at each stadium, and team records. Record-breaking events feed into the narrative system.

### 24.7 WAR Integration

Park factors are essential for fair WAR comparisons. Home stats are adjusted by park factor; road stats remain unadjusted (assumed neutral aggregate). Multi-team players receive weighted park adjustments per stint.

---

## 25. AI Game Engine (Per C-048 / C-082)

**Per C-048:** Game simulation renamed to **AI Game Engine**. **Per C-082:** Scoped to **AI-controlled games ONLY** — never user-played games.

### 25.1 Scope

The AI Game Engine simulates games between two AI-controlled teams. It does NOT:
- Replace user gameplay (GameTracker handles user games)
- Run mojo/fitness calculations (per C-081)
- Generate enrichment data (spray charts, fielding sequences)

It DOES:
- Generate realistic box scores from player ratings
- Produce stats that flow through the same pipeline as manual games
- Trigger Fame events, milestones, and narrative when warranted
- Use park factors to modify outcome probabilities

### 25.2 Simulation Architecture

```typescript
interface AIGameEngine {
  simulateGame(
    game: ScheduleEntry,
    awayRoster: SimRoster,
    homeRoster: SimRoster,
    options?: SimulationOptions
  ): Promise<SimulatedGameResult>;
}

interface SimulationOptions {
  seed?: number;               // Mulberry32 seeded PRNG for reproducibility
  varianceFactor?: number;     // 0.15-0.25 (default 0.20)
}

interface SimRoster {
  teamId: string;
  lineup: SimPlayer[];         // 9 batters in order
  startingPitcher: SimPlayer;
  bench: SimPlayer[];
  bullpen: SimPlayer[];
}

interface SimPlayer {
  playerId: string;
  position: Position;
  ratings: PlayerRatings;      // From roster data
}
```

### 25.3 Probability Model

```typescript
function resolveAtBat(batter: SimPlayer, pitcher: SimPlayer, stadium: Stadium, context: GameContext): AtBatResult {
  // Base probabilities from batter contact/power/eye vs pitcher stuff/control
  const baseProbs = calculateBaseOutcomeProbabilities(batter, pitcher, context);

  // Apply park factor modifiers
  const parkMods = getSimulationModifiers(stadium);
  const handedness = batter.bats;

  const adjustedProbs = {
    homeRun: baseProbs.homeRun * parkMods.byHandedness[handedness].homeRunChance,
    triple: baseProbs.triple * parkMods.tripleChance,
    double: baseProbs.double * parkMods.doubleChance,
    single: baseProbs.single * parkMods.hitChance,
    walk: baseProbs.walk * parkMods.walkChance,
    strikeout: baseProbs.strikeout * parkMods.strikeoutChance,
  };

  return selectOutcome(normalizeProbabilities(adjustedProbs));
}
```

### 25.4 PRNG

Mulberry32 seeded PRNG for deterministic, reproducible simulation results. Seed derived from gameId + seasonId.

### 25.5 Variance Configuration

`varianceFactor` controls outcome randomness (15-25%). Higher = more upsets. Lower = ratings-dominated. Default 20%.

### 25.6 Output Contract

Simulated games produce the same `GameRecord` structure as manual games (§2), with `source: 'SIMULATED'`. Stats flow through the same pipeline (§8-§11) but skip enrichment-dependent calculations.

### 25.7 Unsimulate

Users can reverse a simulated game (mark as SCHEDULED again) as long as no subsequent game has been played manually. All stats from the reversed game are removed.

---

## 26. Franchise Data Flow

### 26.1 Event Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MODE 2 DATA FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  GameTracker (1-Tap)                                            │
│       ↓                                                         │
│  AtBatEvent + BetweenPlayEvent (immutable streams)              │
│       ↓                                                         │
│  ┌─── Game Stats (Layer 1) ───┐                                │
│  │ Counting stats per game    │                                 │
│  └─────────────┬──────────────┘                                │
│                ↓                                                │
│  ┌─── Season Stats (Layer 2) ──┐                               │
│  │ Accumulated from game stats  │                               │
│  └─────────────┬───────────────┘                               │
│                ↓                                                │
│  ┌── Derived Stats (Layer 3) ──┐                               │
│  │ WAR, Clutch, LI, Park-Adj  │                                │
│  └─────────────┬───────────────┘                               │
│                ↓                                                │
│  ┌── Display Stats (Layer 4) ──┐                               │
│  │ Formatted for UI views      │                                │
│  └─────────────────────────────┘                               │
│                                                                 │
│  Parallel Consumers:                                            │
│  ├── Standings (game results → W/L/pct/GB)                      │
│  ├── Milestones (stats → threshold checks → Fame)               │
│  ├── Designations (WAR/valueDelta → projected holders)          │
│  ├── Fan Morale (events → morale changes)                       │
│  ├── Narrative (events → stories → reporter coverage)           │
│  ├── Mojo/Fitness (game participation → state changes)          │
│  └── Modifier Registry (triggers → active modifiers)            │
│                                                                 │
│  TransactionEvent (trades, call-ups, DFA, IL)                   │
│       ↓                                                         │
│  ├── Roster updates                                             │
│  ├── Expected Wins recalculation                                │
│  ├── Fan Morale trade scrutiny                                  │
│  └── Narrative trade reaction stories                           │
│                                                                 │
│  Season End →                                                   │
│  ├── Lock designations (MVP, Ace, Fan Fav, Albatross)           │
│  ├── Award Cornerstone status                                   │
│  ├── Calculate final standings                                  │
│  ├── Archive season stats                                       │
│  ├── Snapshot park factors                                      │
│  └── Hand off to Mode 3 (OffseasonEvent stream begins)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 26.2 Storage Tiers

| Tier | Contents | Persistence |
|------|----------|-------------|
| Hot (IndexedDB) | Current game state, active season stats | Always loaded |
| Warm (IndexedDB) | Season history, career stats, park factors | Loaded on demand |
| Cold (Export) | Multi-season archives, franchise history | User-initiated export |

### 26.3 Mode 2 → Mode 3 Handoff

At season end, Mode 2 produces a `SeasonSummary` object consumed by Mode 3 (Offseason Workshop). **Per C-076:** Handoff is **copy-not-reference** — Mode 3 receives a snapshot, not a live reference. Changes in Mode 3 do not retroactively modify Mode 2 season data.

```typescript
interface SeasonSummary {
  seasonId: string;
  finalStandings: Standings[];
  playoffResults: PlayoffBracket;
  allPlayerSeasonStats: PlayerSeasonStats[];
  allPlayerCareerStats: PlayerCareerStats[];
  designations: TeamDesignationState[];
  fanMorale: TeamFanMorale[];
  milestones: AchievedMilestone[];
  parkFactors: Record<string, ParkFactors>;
  seasonClassification: SeasonClassification;
  narrativeHighlights: Narrative[];
}
```

---

## 27. V2 / Deferred Material

The following features are documented in input specs but explicitly deferred from v1:

| Feature | Reason | Decision |
|---------|--------|----------|
| Contraction | Removed from v1 | C-072 |
| WAR configurable weights | Removed — WAR uses fixed formula | C-075 |
| Full adaptive learning (ASE) | Static v1 defaults sufficient | Spec status |
| Weather effects on park factors | N/A — not in SMB4 | Stadium spec |
| Detailed exit velocity tracking | Optional enrichment, not core | Event model |
| Pitch-by-pitch simulation | Beyond v1 scope | Game sim spec |
| Real-time multiplayer | Beyond v1 scope | Architecture |
| Franchise relocation | Beyond v1 scope | Offseason spec |
| Custom awards | Beyond v1 scope | Milestone spec |

---

## 28. Decision Traceability

All STEP4 decisions consumed during Mode 2 gospel drafting:

| Decision ID | Topic | Section(s) Applied | Status |
|-------------|-------|-------------------|--------|
| C-002 | Pinch hitter 2 entry points | §7.2 | ✅ Applied |
| C-004 | Balk as manual between-play event | §5 | ✅ Applied |
| C-005 | WP_K / PB_K hybrid types kept | §2 (enums) | ✅ Applied |
| C-011 | Triple play in overflow menu | §3 | ✅ Applied |
| C-017 | GO→DP correction via play log | §3, §4 | ✅ Applied |
| C-025 | CQ weighted by leverage index | §13 | ✅ Applied |
| C-027 | IBB excluded from FIP | §11.2 | ✅ Applied |
| C-033 | armFactor in clutch calculations | §13.5 | ✅ Applied |
| C-047 | Young Player from top-3 farm | §17.7 | ✅ Applied |
| C-048 | Game sim → AI Game Engine rename | §25 | ✅ Applied |
| C-054 | Trait visibility (hidden attributes) | §16.3, §17.6 | ✅ Applied |
| C-055 | Establishment multiplier values | §17.10, §17.11 | ✅ Applied |
| C-056 | Albatross 15% trade discount | §17.4, §19 | ✅ Applied |
| C-057 | Team Captain in designations | §17.6 | ✅ Applied |
| C-058 | wOBA scale = 1.7821 (SMB4) | §11.1, §23.3 | ✅ Applied |
| C-059 | FIP constant = 3.28 | §11.2, §23.3 | ✅ Applied |
| C-060 | Fielding chance vs fWAR boundary | §10, §11.3 | ✅ Applied |
| C-061 | impactMultiplier removed from fWAR | §11.3 | ✅ Applied |
| C-062 | mWAR 70% unattributed reconciliation | §11.5 | ✅ Applied |
| C-065 | HOF WAR scales with opportunityFactor | §18.4 | ✅ Applied |
| C-067 | Captain storylines in narrative | §16.5 | ✅ Applied |
| C-068 | INSIDER reveal permanent | §16.3 | ✅ Applied |
| C-069 | Reporter morale cap ±3/game | §16.4 | ✅ Applied |
| C-079 | Schedule pre-generated + editable | §22.1 | ✅ Applied |
| C-080 | SIMULATE button AI-only | §22.3 | ✅ Applied |
| C-081 | Remove mojo/fitness simulation section | §14 (header) | ✅ Applied |
| C-082 | AI Game Engine AI-only scope | §25.1 | ✅ Applied |
| C-084 | Franchise Health Warning + EOS modifier | §20.7 | ✅ Applied |
| C-088 | Park factor confidence-based blending | §24.2 | ✅ Applied |
| C-089 | Special Events → Modifier Registry | §15 (header) | ✅ Applied |
| C-092 | Juiced only via events/traits, remove rest path | §14.7 | ✅ Applied |
| C-093 | FA Attractiveness remove state bonuses | §20.8 | ✅ Applied |

### Cross-Cutting Decisions Referenced

| Decision ID | Topic | Reference |
|-------------|-------|-----------|
| C-045 | Spine = standalone 5th document | See SPINE_ARCHITECTURE.md |
| C-054 | Trait visibility (hidden attributes) | §16.3, §17.6 |
| C-076 | Handoff = copy-not-reference | §26.3 |

### Decisions from STEP4 NOT in Mode 2 Scope

| Decision ID | Topic | Routed To |
|-------------|-------|-----------|
| C-049 | Offseason = 13 phases | MODE_3_OFFSEASON_WORKSHOP.md |
| C-070 | Personality = 7 types | MODE_1_LEAGUE_BUILDER.md |
| C-072 | No contraction in v1 | §27 (deferred), MODE_3 |
| C-074 | 13-grade scale | MODE_1_LEAGUE_BUILDER.md |
| C-075 | No WAR configurable weights | §27 (deferred) |
| C-078 | Fame = FameLevel dropdown | MODE_1_LEAGUE_BUILDER.md |
| C-086 | Trait assignment = wheel spin | MODE_1_LEAGUE_BUILDER.md |
| C-087 | 13-grade scale authoritative | MODE_1_LEAGUE_BUILDER.md |

---

*MODE_2_FRANCHISE_SEASON.md — Gospel v1.0 — 2026-02-23*
*Consolidates 39 input specs and 33 decision IDs into the authoritative Mode 2 reference.*
