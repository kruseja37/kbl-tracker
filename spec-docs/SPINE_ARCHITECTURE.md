# SPINE_ARCHITECTURE.md — KBL Tracker Shared Data Contracts

**Version:** 1.0
**Created:** 2026-02-23
**Status:** GOSPEL — Authoritative specification for cross-mode data contracts
**STEP4 Decision:** C-045 (Spine = standalone 5th document)
**Cross-references:** MODE_1_LEAGUE_BUILDER.md, MODE_2_FRANCHISE_SEASON.md, MODE_3_OFFSEASON_WORKSHOP.md, ALMANAC.md

---

## 1. Purpose

This document defines the shared data contracts, storage boundaries, entity models, and handoff interfaces that connect KBL Tracker's four gospel documents. Every gospel references this document for types that cross mode boundaries.

Per C-045: The Spine is a standalone 5th document. All four gospels are self-contained for their mode-specific logic but reference this document for shared entity definitions, storage layout, and inter-mode contracts.

### 1.1 What the Spine Defines

- **Core entity models** — Player, Team, League, Franchise, Season
- **Storage architecture** — Global vs. franchise-scoped databases
- **Event streams** — The three immutable event types that flow between modes
- **Handoff contracts** — Data passed at mode transitions (Mode 1→2, Mode 2→3, Mode 3→2)
- **Shared enumerations** — Grades, positions, phases, stat categories
- **IndexedDB schema** — Store names, key paths, indexes

### 1.2 What the Spine Does NOT Define

- Mode-specific logic (GameTracker mechanics, offseason phase ordering, Almanac queries)
- UI components, layouts, or navigation
- Engine algorithms (WAR formulas, clutch calculations, mojo decay)
- Any behavior — the Spine is pure data shape

---

## 2. Three-Mode Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KBL TRACKER                                  │
│                                                                     │
│   ┌────────────┐    ┌────────────────┐    ┌──────────────────┐     │
│   │  MODE 1    │    │    MODE 2      │    │     MODE 3       │     │
│   │  League    │───▶│   Franchise    │───▶│    Offseason     │     │
│   │  Builder   │    │    Season      │    │    Workshop      │     │
│   └────────────┘    └───────┬────────┘    └───────┬──────────┘     │
│        │                    │                      │                 │
│        │                    │                      │                 │
│        │              ┌─────▼──────┐               │                 │
│        │              │  ALMANAC   │◀──────────────┘                 │
│        │              │ (read-only)│                                 │
│        │              └────────────┘                                 │
│        │                    ▲                                        │
│        └────────────────────┘                                        │
│                                                                     │
│   ════════════════════════════════════════════════════════════       │
│   ║              SPINE (this document)                      ║       │
│   ║  Shared entities, storage schema, handoff contracts     ║       │
│   ════════════════════════════════════════════════════════════       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Mode lifecycle:**

| Mode | When Active | What It Does | Gospel |
|------|------------|-------------|--------|
| Mode 1 | Franchise creation (once) | Creates league, teams, players, rosters, rules, schedule | MODE_1_LEAGUE_BUILDER.md |
| Mode 2 | During season + playoffs | Records games, accumulates stats, tracks standings | MODE_2_FRANCHISE_SEASON.md |
| Mode 3 | Between seasons | Awards, salary, draft, trades, retirements, farm recon | MODE_3_OFFSEASON_WORKSHOP.md |
| Almanac | Always available | Read-only historical reference | ALMANAC.md |

---

## 3. Core Entity Models

### 3.1 Player

The Player entity is the most shared contract in KBL. Every mode reads and/or writes player data.

```typescript
interface Player {
  // Identity
  id: string;                    // Unique across franchise
  name: string;
  position: Position;
  jerseyNumber: number;

  // Ratings (0–99 scale) — grade is NOT stored; derive via computeGrade(batterRatings, pitcherRatings)
  batterRatings: BatterRatings;
  pitcherRatings: PitcherRatings;

  // Personality & Traits (per MODE_1 §6)
  personality: PersonalityType;  // 7 types
  hiddenModifiers: {
    loyalty: number;             // 0–100: FA preference, trade request likelihood
    ambition: number;            // 0–100: Development speed, willingness to change teams
    resilience: number;          // 0–100: Morale recovery, retirement probability
    charisma: number;            // 0–100: Teammate morale, captain selection, mentorship
  };
  traits: PlayerTrait[];         // Assigned in Mode 3 awards ceremony

  // Contract & Status
  teamId: string;
  salary: number;
  contractYears: number;
  status: PlayerStatus;
  fameLevel: FameLevel;          // Always starts Unknown; earned through gameplay (C-078 dropdown for display only)

  // In-game transient (Mode 2 only, not persisted between games)
  mojoLevel?: MojoLevel;         // Rattled → Jacked (see §3.6 for enum + numeric mapping)
  fitnessState?: FitnessState;   // Hurt through Juiced (Fit is neutral default)

  // Stats (accumulated per-season — reset each season, career stats carry forward)
  seasonStats: {
    batting: BattingStats;
    pitching: PitchingStats;
    fielding: FieldingStats;
    running: RunningStats;
  };
  gameStats: {
    batting: BattingStats;
    pitching: PitchingStats;
    fielding: FieldingStats;
    running: RunningStats;
  };
  careerStats?: CareerStats;     // Written by stats pipeline
}
```

**Owned by:** Mode 1 (creation), Mode 2 (in-game stats, mojo/fitness), Mode 3 (ratings, salary, traits, status changes)
**Read by:** Almanac (career profile, leaderboards)

### 3.2 Team

```typescript
interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  controlledBy: 'human' | 'ai';  // Per FRANCHISE_TYPE_DESIGN_NOTE
  stadiumId: string;

  // Live season data
  wins: number;
  losses: number;
  roster: Player[];

  // Historical
  retiredNumbers: { number: number; playerId: string; playerName: string }[];
}
```

**Owned by:** Mode 1 (creation, controlledBy), Mode 2 (wins/losses, roster changes), Mode 3 (roster transactions)
**Read by:** Almanac (team history)

### 3.3 League

```typescript
interface League {
  id: string;
  name: string;
  conferences: Conference[];     // Each contains divisions
  teams: string[];               // Team IDs
}

interface Conference {
  name: string;
  divisions: Division[];
}

interface Division {
  name: string;
  teamIds: string[];
}
```

**Owned by:** Mode 1 (creation only — immutable after franchise start)

### 3.4 Franchise

```typescript
interface FranchiseMetadata {
  franchiseId: string;
  franchiseName: string;
  franchiseType: 'solo' | 'coop' | 'custom';
  createdAt: number;             // Timestamp
  currentSeason: number;
  currentPhase: SeasonPhase;
  humanTeamIds: string[];        // Teams controlled by humans

  // Rules snapshot (immutable copy from Mode 1)
  rules: RulesPreset;
}

interface RulesPreset {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isEditable: boolean;               // Built-in presets are read-only

  // Game Settings
  game: {
    inningsPerGame: number;          // 1–9 (fully custom)
    extraInningsRule: 'standard' | 'runner_on_second' | 'none';
    mercyRule: { enabled: boolean; runDifferential: number; afterInning: number };
    pitchCounts: { enabled: boolean; starterLimit: number; relieverLimit: number };
    moundVisits: { enabled: boolean; perGame: number };
  };

  // Season Settings — gamesPerTeam is user-input (2–200), no preset enum
  season: {
    gamesPerTeam: number;            // 2–200 (user inputs any number)
    allStarGame: boolean;
    allStarTiming: number;           // Percentage of season (0.6 = 60%)
    tradeDeadline: { enabled: boolean; timing: number };  // Percentage of season (0.7 = 70%)
  };

  // Playoff Settings
  playoffs: {
    teamsQualify: 2 | 4 | 6 | 8 | 10 | 12;
    format: 'bracket' | 'pool' | 'best_record_bye';
    wildcardSeries: { games: 1 | 3 | 5 | 7 | 9; homeGames: number };
    divisionSeries: { games: 1 | 3 | 5 | 7 | 9; homeGames: number };
    championshipSeries: { games: 1 | 3 | 5 | 7 | 9; homeGames: number };
    worldSeries: { games: 1 | 3 | 5 | 7 | 9; homeGames: number };
    homeFieldAdvantage: '2-3-2' | '2-2-1' | 'alternating';
    tiebreakers: 'run_differential';  // If still tied, prompt user to decide
  };

  // Designated Hitter
  dh: {
    rule: 'always' | 'never' | 'league_specific';
    leagueSettings?: Record<string, boolean>;  // conferenceId → DH enabled
  };

  // Roster Rules
  roster: {
    mlbRosterSize: number;           // Default: 22
    farmRosterSize: number;          // Default: 10
  };

  // Awards Ceremony
  awardsCeremony: 'full' | 'team_only' | 'off';

  // AI Behavior (Sliders)
  ai: {
    tradeAggressiveness: number;
    tradeAcceptanceThreshold: number;
    rebuildThreshold: number;
    prospectValuation: number;
    winNowBias: number;
    positionScarcityAwareness: number;
  };

  // Offseason
  offseason: {
    draftEnabled: boolean;
    draftRounds: number;
    draftOrder: 'inverse_salary' | 'lottery' | 'snake';
    freeAgencyEnabled: boolean;
    freeAgencyDuration: number;
    ratingsAdjustmentEnabled: boolean;
    retirementEnabled: boolean;
    expansionEnabled: boolean;       // Expansion only (no contraction in v1)
  };
}
```

**Owned by:** Mode 1 (creation), Mode 2 (currentSeason, currentPhase), Mode 3 (season advance)
**Read by:** Almanac (franchise context)

### 3.5 Season

```typescript
interface SeasonState {
  seasonId: string;              // e.g., "season-3"
  seasonNumber: number;
  franchiseId: string;
  phase: SeasonPhase;
  gamesPlayed: number;
  gamesRemaining: number;

  schedule: ScheduleGame[];
  standings: StandingsEntry[];
}

type FictionalDate = string;     // Format: "Month Day, Year N" (e.g., "April 3, Year 1")

interface ScheduleGame {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  gameNumber: number;            // 1-based within season
  fictionalDate: FictionalDate;  // Human-readable fictional date (per MODE_1 §10)
  isComplete: boolean;
  result?: GameResult;
  isPlayoff: boolean;
}
// NOTE: Schedule is created manually via schedule wizard or populated from uploaded CSV.
// Engine does NOT auto-generate schedules (supersedes C-079).

interface GameResult {
  homeScore: number;
  awayScore: number;
  winningPitcherId?: string;
  losingPitcherId?: string;
  savePitcherId?: string;
  innings: number;
}

interface StandingsEntry {
  teamId: string;
  wins: number;
  losses: number;
  pct: number;
  gamesBack: number;
  runDifferential: number;       // Tiebreaker per F-128
  streak: string;                // e.g., "W3", "L2"
  last10: { wins: number; losses: number };
  divisionId: string;
  conferenceId: string;
}
```

**Owned by:** Mode 1 (schedule generation), Mode 2 (game results, standings updates), Mode 3 (season archive)
**Read by:** Almanac (season-by-season records)

### 3.6 Shared Enumerations

```typescript
// Position — fielding positions + compound roles; DH is a batting-order slot, NOT a position (per MODE_1 §5)
type Position = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF'
  | 'SP' | 'RP' | 'CP'            // Pitching roles (CP = closer)
  | 'IF' | 'OF'                    // Generic infield/outfield
  | 'SP/RP' | 'IF/OF' | '1B/OF'; // Compound dual-role positions
type BattingSlot = Position | 'DH'; // DH is valid in batting order only

// Grade — 13-tier scale (C-074/C-087)
type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-';

// Personality — 7 types only (C-070, SMB4-authentic names)
type PersonalityType = 'Competitive' | 'Relaxed' | 'Droopy' | 'Jolly' | 'Tough' | 'Timid' | 'Egotistical';

// Fame — Dropdown levels (C-078)
type FameLevel = 'Unknown' | 'Local' | 'Regional' | 'National' | 'Superstar' | 'Legend';

// Player status
type PlayerStatus = 'active' | 'injured' | 'minors' | 'free_agent' | 'retired';

// Season phase
type SeasonPhase = 'SETUP' | 'PRE_SEASON' | 'REGULAR_SEASON' | 'ALL_STAR_BREAK'
  | 'POST_DEADLINE' | 'PLAYOFFS' | 'OFFSEASON';

// Mojo — 5 named levels with numeric mapping (per MODE_2 §14)
type MojoLevel = 'Rattled' | 'Tense' | 'Neutral' | 'LockedIn' | 'Jacked';
// Numeric mapping: Rattled = -2, Tense = -1, Neutral = 0, LockedIn = +1, Jacked = +2
const MOJO_VALUES: Record<MojoLevel, number> = {
  Rattled: -2, Tense: -1, Neutral: 0, LockedIn: 1, Jacked: 2
};

// Fitness — 6 states (lowest to highest, Fit is the neutral/default state)
type FitnessState = 'Hurt' | 'Weak' | 'Strained' | 'Well' | 'Fit' | 'Juiced';

// Chemistry — 5 real SMB4 types (F-124)
type ChemistryType = 'Competitive' | 'Crafty' | 'Disciplined' | 'Spirited' | 'Scholarly';

// Batter hand
type BatterHand = 'L' | 'R' | 'S';

// Pitcher hand
type PitcherHand = 'L' | 'R';
```

### 3.7 Ratings

```typescript
interface BatterRatings {
  power: number;       // 0–99
  contact: number;     // 0–99
  speed: number;       // 0–99
  fielding: number;    // 0–99
  arm: number;         // 0–99
}

interface PitcherRatings {
  velocity: number;    // 0–99
  junk: number;        // 0–99
  accuracy: number;    // 0–99
}
```

**Grade derivation** from ratings uses the algorithm defined in MODE_1_LEAGUE_BUILDER.md §5.3. Grade is **never stored** on the Player object — it is always computed via `computeGrade(batterRatings, pitcherRatings)`. Engines use raw ratings for all calculations; grade is a display convenience only.

### 3.8 Core Shared Types

These types are used across multiple interfaces and defined here as the canonical source:

```typescript
// Half-inning
type HalfInning = 'TOP' | 'BOTTOM';

// Base state — which bases are occupied (null = empty)
interface Bases {
  first: string | null;          // playerId or null
  second: string | null;
  third: string | null;
}

// At-bat result — all possible plate appearance outcomes (per MODE_2 §2–3)
type AtBatResult = 'K' | 'Kc' | 'GO' | 'FO' | 'LO' | 'PO'
  | '1B' | '2B' | '3B' | 'HR'
  | 'BB' | 'HBP' | 'IBB'
  | 'E' | 'FC' | 'DP' | 'TP'
  | 'SAC' | 'SF'
  | 'WP_K' | 'PB_K';
// Kc = called strikeout (looking); WP_K/PB_K are hybrid types per C-005; TP per C-011

// Batted ball direction
type Direction = 'LEFT_LINE' | 'LEFT_FIELD' | 'LEFT_CENTER'
  | 'CENTER'
  | 'RIGHT_CENTER' | 'RIGHT_FIELD' | 'RIGHT_LINE';

// Exit type classification
type ExitType = 'GROUND_BALL' | 'LINE_DRIVE' | 'FLY_BALL' | 'POPUP' | 'BUNT';

// Fielding data attached to an AtBatEvent
interface FieldingData {
  fielderId: string;
  playType?: 'diving' | 'leaping' | 'sliding' | 'over_shoulder' | 'robbed_hr' | 'routine';
  putouts: string[];             // playerIds who recorded putouts
  assists: string[];             // playerIds who recorded assists
  errors: string[];              // playerIds who committed errors
}

// Between-play event types (per MODE_2 §5)
type GameEvent = 'stolen_base' | 'caught_stealing' | 'pickoff' | 'wild_pitch'
  | 'passed_ball' | 'balk' | 'defensive_indifference'
  | 'pitcher_change' | 'substitution' | 'position_change'
  | 'mojo_change' | 'fitness_change' | 'injury'
  | 'pitch_count_update' | 'manager_moment';

// Playoff format — full structure per MODE_1 §9
// (PlayoffFormat is an alias for the RulesPreset.playoffs sub-interface)
type PlayoffFormat = RulesPreset['playoffs'];
```

**Types defined in mode-specific gospels (not duplicated here):**

- `PlayoffBracket` — Defined in MODE_2_FRANCHISE_SEASON.md §21 (bracket state machine)
- `SalaryEntry` — Defined in MODE_3_OFFSEASON_WORKSHOP.md §5 (salary ledger record)
- `PlayerSeasonStats` — Defined in MODE_2_FRANCHISE_SEASON.md §8 (per-game accumulator)
- `NarrativeSummary` — Defined in MODE_2_FRANCHISE_SEASON.md §16 (season-end narrative digest)
- `AchievedMilestone` — Defined in MODE_2_FRANCHISE_SEASON.md §18 (milestone record)
- `Storyline` — Defined in MODE_2_FRANCHISE_SEASON.md §16 (multi-game narrative arc)
- `HOFEntry` — Defined in ALMANAC.md §3.4 (Hall of Fame eligibility and records; Almanac-only)

---

## 4. Stats Contracts

### 4.1 Batting Stats

```typescript
interface BattingStats {
  gamesPlayed: number;
  plateAppearances: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  hitByPitch: number;
  sacFlies: number;
  sacBunts: number;
  intentionalWalks: number;
  gidp: number;
  errors: number;                // Batting errors (e.g., running interference)
  // NOTE: stolenBases/caughtStealing moved to RunningStats (§4.4) — no duplication
}
```

### 4.2 Pitching Stats

```typescript
interface PitchingStats {
  gamesStarted: number;
  gamesPitched: number;
  inningsPitched: number;       // Stored as total outs / 3
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeoutsPitching: number;
  homeRunsAllowed: number;
  hitBatters: number;
  wildPitches: number;
  wins: number;
  losses: number;
  saves: number;
  blownSaves: number;
  holds: number;
  completeGames: number;
  shutouts: number;
  qualityStarts: number;
  inheritedRunners: number;
  inheritedRunnersScored: number;

  // Derived stats (NOT stored — computed from AtBatEvent stream):
  // - pitchCount, battersFaced → tracked per-game, aggregated from events
  // - hitsAllowed by type (singles, doubles, triples, HR) → derivable from event result
  // - strikeoutsLooking (Kc) vs strikeoutsSwinging (Ks) → AtBatResult distinguishes 'K' vs 'Kc'
  // - hit direction distribution → derivable from event direction field
}
```

### 4.3 Fielding Stats

```typescript
interface FieldingStats {
  games: number;
  outsByPosition: Record<Position, number>;  // Track outs (not games) for partial-inning credit; derive innings via outs/3
  putouts: number;
  assists: number;
  errors: number;
  doublePlays: number;
  divingPlays: number;
  missedDives: number;
  webGems: number;
  leapingCatches: number;
  missedLeap: number;
  robbedHRs: number;
  position: Position;               // Primary position
}
```

### 4.4 Running Stats

```typescript
interface RunningStats {
  stolenBases: number;
  caughtStealing: number;
  stolenBaseAttempts: number;
  extraBasesTaken: number;        // Advancing beyond minimum on hits/outs
  extraBasesOpportunities: number;
  firstToThird: number;           // Single → reached third
  firstToHome: number;            // Double → scored from first
  taggedOutAdvancing: number;     // Thrown out trying to take extra base
}
```

### 4.5 Managing Stats

```typescript
interface ManagingStats {
  gamesManaged: number;
  wins: number;
  losses: number;
  challengesUsed: number;
  challengesWon: number;
  pitchingChanges: number;
  defensiveSubstitutions: number;
  pinchHittersUsed: number;
  pinchRunnersUsed: number;
}
```

### 4.6 Career Stats

```typescript
interface CareerStats {
  playerId: string;
  seasonsPlayed: number;
  careerBatting: BattingStats;
  careerPitching: PitchingStats;
  careerFielding: FieldingStats;
  careerRunning: RunningStats;
  careerManaging?: ManagingStats;  // Only for user (manager); stored in mwarDecisions store
  careerWAR: PlayerWAR | ManagerWAR;
  seasonHistory: PlayerSeasonSummary[];
}

// Players accumulate bWAR/pWAR/fWAR/rWAR; managers accumulate mWAR only
interface PlayerWAR {
  type: 'player';
  bWAR: number;
  pWAR: number;
  fWAR: number;
  rWAR: number;
  total: number;
}

interface ManagerWAR {
  type: 'manager';
  mWAR: number;
  total: number;    // Same as mWAR for managers
}

interface PlayerSeasonSummary {
  seasonId: string;
  seasonNumber: number;
  teamId: string;
  batting: BattingStats;
  pitching: PitchingStats;
  fielding: FieldingStats;
  running: RunningStats;
  war: number;                  // Total WAR that season
  awards: string[];             // Award names won
  designations: string[];       // Designations held at season end
}
```

**Written by:** Mode 2 stats pipeline (per-game accumulation)
**Archived by:** Mode 3 season end (Phase 1)
**Read by:** Almanac (career profiles, leaderboards)

---

## 5. Event Streams

KBL Tracker uses three immutable event streams. Events are append-only — they are never modified or deleted after creation.

### 5.1 AtBatEvent

Generated by GameTracker during Mode 2. One event per plate appearance.

```typescript
interface AtBatEvent {
  eventId: string;
  gameId: string;
  seasonId: string;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  batterId: string;
  pitcherId: string;
  result: AtBatResult;
  direction?: Direction;
  exitType?: ExitType;
  fielding?: FieldingData;
  rbiCount: number;
  runnersBefore: Bases;
  runnersAfter: Bases;
  scoreBefore: { away: number; home: number };
  scoreAfter: { away: number; home: number };
  leverageIndex: number;
  winProbabilityBefore: number;
  winProbabilityAfter: number;
  timestamp: number;
}
```

**Source:** MODE_2_FRANCHISE_SEASON.md §2, §3
**Consumers:** Stats pipeline (§8), WAR system (§11), Clutch attribution (§13), Narrative (§16), Milestones (§18)

### 5.2 BetweenPlayEvent

Generated between at-bats for non-AB game events.

```typescript
interface BetweenPlayEvent {
  eventId: string;
  gameId: string;
  seasonId: string;
  inning: number;
  halfInning: HalfInning;
  type: GameEvent;              // SB, CS, WP, PB, PK, BALK, subs
  involvedPlayers: string[];
  runnersBefore: Bases;
  runnersAfter: Bases;
  timestamp: number;
}
```

**Source:** MODE_2_FRANCHISE_SEASON.md §5
**Consumers:** Stats pipeline, Narrative

### 5.3 TransactionEvent

Generated during Mode 2 (in-season) and Mode 3 (offseason) for roster/franchise changes.

```typescript
interface TransactionEvent {
  eventId: string;
  franchiseId: string;
  seasonId: string;
  type: TransactionType;
  involvedPlayers: string[];
  fromTeamId?: string;
  toTeamId?: string;
  details: Record<string, unknown>;  // Type-specific payload
  timestamp: number;
}

type TransactionType =
  // Roster moves (Mode 2 + Mode 3)
  | 'TRADE' | 'FREE_AGENT_SIGNING' | 'DRAFT_PICK' | 'RELEASE'
  | 'DFA' | 'CALL_UP' | 'SEND_DOWN' | 'RETIREMENT'
  | 'IL_MOVE'                        // Covers both placement and return (detail.direction: 'to'|'from')
  | 'WAIVER_CLAIM' | 'EXPANSION_DRAFT'
  | 'CONTRACT_EXTENSION'             // Mid-season or offseason contract extensions
  // Player profile changes (Mode 3 primarily)
  | 'SALARY_CHANGE' | 'TRAIT_ADDED' | 'TRAIT_REMOVED'
  | 'RATINGS_CHANGE' | 'POSITION_CHANGE'
  | 'NAME_CHANGE' | 'NUMBER_CHANGE'
  // Team/franchise changes
  | 'TEAM_RENAME' | 'STADIUM_CHANGE' | 'JERSEY_RETIRED'
  // Designation changes
  | 'DESIGNATION_AWARDED' | 'DESIGNATION_REMOVED';
```

**Source:** MODE_2_FRANCHISE_SEASON.md §26, MODE_3_OFFSEASON_WORKSHOP.md §6–§9
**Consumers:** Roster state, Fan Morale, Narrative, Almanac transaction history

---

## 6. Storage Architecture

### 6.1 Two-Database Model

KBL Tracker uses two categories of IndexedDB databases:

```
kbl-app-meta/                    # GLOBAL — shared across all franchises
  ├── franchiseList              # All franchise metadata
  ├── leagueTemplates            # Reusable league configurations
  ├── teamPool                   # Global team definitions (pre-franchise)
  ├── playerPool                 # Global player definitions (pre-franchise)
  ├── playerNamePool             # SMB4 Names Database for player name generation (first/last names SMB4 can announce)
  ├── rulesPresets               # Saved rules configurations
  ├── appSettings                # App-level preferences
  └── lastUsedFranchise          # Quick-resume pointer

kbl-franchise-{id}/              # PER-FRANCHISE — isolated per franchise
  ├── metadata                   # FranchiseMetadata
  ├── teams                      # Team[]
  ├── players                    # Player[]
  ├── rosters                    # Per-team roster assignments
  ├── schedule                   # ScheduleGame[]
  ├── gameHeaders                # Game completion status
  ├── atBatEvents                # AtBatEvent[] (immutable)
  ├── betweenPlayEvents          # BetweenPlayEvent[] (immutable)
  ├── transactionEvents          # TransactionEvent[] (immutable)
  ├── seasonStats                # Per-player per-season stats
  ├── careerStats                # Per-player career totals
  ├── standings                  # StandingsEntry[]
  ├── salaryLedger               # Salary history
  ├── awardsHistory              # Award winners by season
  ├── designations               # Active designations
  ├── milestones                 # Achieved milestones
  ├── narrativeState             # Reporter relationships, storylines
  ├── fanMorale                  # Per-team fan morale state
  ├── stadiums                   # Stadium entities (dimensions, parkFactors, historicalFactors, records, spray charts)
  #                               NOTE: parkFactors live ON the Stadium entity (§13.1); no separate parkFactors store
  ├── playerMorale               # Per-player morale state (distinct from team-level fanMorale)
  ├── relationships              # Player-to-player and player-to-team relationships (rivals, mentors, married, etc.)
  ├── mwarDecisions              # Manager decision log
  ├── currentGame                # Active game snapshot (autosave)
  └── completedGames             # Archived game results
```

### 6.2 Franchise Isolation (C-076)

Per C-076, franchise creation uses **copy-not-reference**:

- Mode 1 creates entities in `kbl-app-meta` (global pool)
- "Start Franchise" copies all relevant data into a new `kbl-franchise-{id}` database
- After creation, the franchise database is fully independent
- Changes to the global pool do NOT propagate to existing franchises
- Deleting a franchise deletes its entire IndexedDB — no orphaned data

### 6.3 Storage Estimates

| Seasons | Estimated Size | Notes |
|---------|---------------|-------|
| 1 | ~19 MB | First season with full event log |
| 5 | ~95 MB | Typical active franchise |
| 10 | ~190 MB | Long-running franchise |
| 20 | ~380 MB | Dynasty franchise |

Primary storage consumers: AtBatEvent stream (~70%), season stats (~15%), everything else (~15%).

---

## 7. Mode Transition Contracts

### 7.1 Mode 1 → Mode 2 (Franchise Handoff)

When Mode 1 completes, it produces the initial franchise state:

```typescript
interface FranchiseHandoff {
  // From League Builder
  franchise: FranchiseMetadata;
  league: League;
  teams: Team[];
  players: Player[];              // With grades, personality, initial traits
  rosters: Record<string, string[]>;  // teamId → playerIds
  schedule: ScheduleGame[];       // Pre-generated for season 1
  rules: RulesPreset;

  // Initialized by handoff (per C-076)
  standings: StandingsEntry[];    // All zeros
  salaryLedger: SalaryEntry[];    // Initial salaries (draft-round-based per F-127)
  emptyStatsStores: true;         // Season/career stats initialized empty
  franchiseId: string;            // Unique ID assigned at creation
}
```

**Defined in:** MODE_1_LEAGUE_BUILDER.md §12
**Consumed by:** Mode 2 (first season start)

### 7.2 Mode 2 → Mode 3 (Season End)

When the regular season + playoffs complete, Mode 2 hands off to Mode 3:

```typescript
interface SeasonSummary {
  seasonId: string;
  seasonNumber: number;
  franchiseId: string;

  // Final state
  finalStandings: StandingsEntry[];
  playoffResults: PlayoffBracket;

  // Stats snapshots
  allPlayerSeasonStats: PlayerSeasonStats[];
  allPlayerCareerStats: CareerStats[];

  // Subsystem state
  designations: DesignationState[];    // Per §10
  fanMorale: TeamFanMorale[];
  milestones: AchievedMilestone[];
  parkFactors: Record<string, ParkFactors>;
  narrativeHighlights: NarrativeSummary[];

  // Classification for awards
  seasonClassification: SeasonClassification;
}

interface SeasonClassification {
  mvpCandidates: { playerId: string; war: number }[];
  cyYoungCandidates: { playerId: string; pWAR: number }[];
  rookieOfYearCandidates: { playerId: string; war: number }[];
  managerOfYearCandidates: { managerId: string; mWAR: number }[];
  relieverOfYearCandidates: { playerId: string; saves: number; holds: number; era: number }[];
  comebackPlayerCandidates: { playerId: string; warDelta: number }[];
  goldGloveCandidates: Record<Position, { playerId: string; fWAR: number }[]>;
  silverSluggerCandidates: Record<Position, { playerId: string; ops: number }[]>;
  platinumGloveCandidates: { playerId: string; fWAR: number }[];            // Best overall fielder (from Gold Glove winners)
  boogerGloveCandidates: { playerId: string; errors: number; fWAR: number }[]; // Worst fielder
  benchPlayerCandidates: { playerId: string; war: number; startPct: number }[]; // <50% starts eligible
  karaKawaguchiCandidates: { playerId: string; warPerMillion: number }[];   // Best value (highest WAR/$M)
  bustOfYearCandidates: { playerId: string; warPerMillion: number; salary: number }[]; // Worst value (high salary, low WAR)
}
```

**Defined in:** MODE_2_FRANCHISE_SEASON.md §26.3
**Consumed by:** Mode 3 Phase 1 (Season End) and Phase 2 (Awards)

### 7.3 Mode 3 → Mode 2 (New Season Start)

When offseason completes, Mode 3 produces the next season's initial state:

```typescript
interface NewSeasonHandoff {
  seasonId: string;
  seasonNumber: number;
  franchiseId: string;

  // Updated rosters (after FA, draft, trades, retirements, farm recon)
  teams: Team[];
  players: Player[];              // Updated ratings, salaries, traits, status
  rosters: Record<string, string[]>;

  // New season infrastructure
  schedule: ScheduleGame[];       // Generated for new season
  standings: StandingsEntry[];    // Reset to zeros
  emptySeasonStats: true;         // Season stats reset (career stats carry forward)

  // Carryover state
  parkFactors: Record<string, ParkFactors>;
  narrativeState: NarrativeCarryover;  // Reporter relationships persist
  fanMorale: TeamFanMorale[];     // Morale carries with decay

  // EOS modifiers (from Mode 3 salary recalc)
  eosModifiers: Record<string, number>;  // playerId → salary modifier
}
```

**Defined in:** MODE_3_OFFSEASON_WORKSHOP.md §13 (Finalize & Advance)
**Consumed by:** Mode 2 (next season start)

---

## 8. Adaptive Scaling

### 8.1 Opportunity Factor

All stat thresholds, qualifying minimums, and milestone targets scale with season length:

```typescript
const opportunityFactor = (gamesPerTeam * inningsPerGame) / (162 * 9);
```

This single value normalizes all comparisons to a 162-game, 9-inning baseline. It is:

- Computed once at franchise creation from `RulesPreset`
- Stored in `FranchiseMetadata`
- Referenced by: Mode 2 (milestones, designations, adaptive standards), Mode 3 (awards thresholds), Almanac (qualifying minimums)

### 8.2 WAR Scaling & Grades

```typescript
const runsPerWin = 10 * (seasonGames / 162);
```

WAR grades normalize to 162-game equivalents for display. Raw WAR uses actual season length.

**WAR Grade Thresholds (162-game equivalent):**

| Grade | WAR Range | Meaning |
|-------|-----------|---------|
| MVP | 7.0+ | Generational season |
| Superstar | 5.0–6.9 | All-Star starter |
| All-Star | 3.5–4.9 | All-Star caliber |
| Starter | 2.0–3.4 | Quality regular |
| Role Player | 1.0–1.9 | Platoon/utility |
| Bench | 0.0–0.9 | Replacement-level contributor |
| Liability | < 0.0 | Below replacement |

For shortened seasons, multiply thresholds by `opportunityFactor`.

### 8.3 SMB4-Calibrated Constants

These constants are calibrated for SMB4's game environment and are **not** MLB values:

| Constant | Value | Decision |
|----------|-------|----------|
| wOBA Scale | 1.7821 | C-058 |
| FIP Constant | 3.28 | C-059 |

---

## 9. Shared Trait Contract

### 9.1 Trait Structure

```typescript
interface PlayerTrait {
  traitId: string;
  name: string;
  chemistryType: ChemistryType;  // Which of 5 types (F-124)
  effects: TraitEffect[];        // Base effects before potency scaling
}

interface TraitEffect {
  target: string;                // Which stat/system is affected (e.g., 'mojo', 'clutch', 'speed')
  baseModifier: number;          // Base effect magnitude before potency scaling
  condition?: string;            // When it applies (e.g., 'high_leverage', 'home_games')
}
```

### 9.2 Chemistry & Potency Mechanics

Chemistry is a **team-level property** derived from the collective chemistry types of all rostered players. It determines how strong traits are — never which traits are available (C-086/C-064).

```typescript
interface TeamChemistry {
  teamId: string;
  composition: Record<ChemistryType, number>;  // Count per type
  percentages: Record<ChemistryType, number>;  // Percentage per type
  dominantType: ChemistryType;                 // Plurality winner
  tier: ChemistryTier;                         // Based on concentration
  potencyMultiplier: number;                   // Applied to all trait effects
}

type ChemistryTier = 1 | 2 | 3 | 4;
```

**Chemistry Tiers (determined by concentration of dominant type):**

| Tier | Condition | Potency Multiplier | Meaning |
|------|-----------|-------------------|---------|
| 1 | No type > 30% | 1.00× (no bonus) | Mixed roster, no chemistry synergy |
| 2 | One type 30–44% | 1.25× | Emerging identity |
| 3 | One type 45–59% | 1.50× | Strong team identity |
| 4 | One type ≥ 60% | 1.75× | Elite chemistry synergy |

**How potency works:**

1. Each trait has a `baseModifier` on each of its effects (e.g., +5 to clutch).
2. The player's team chemistry tier determines the `potencyMultiplier`.
3. **Effective modifier = baseModifier × potencyMultiplier** (rounded to nearest integer).
4. Chemistry affects **all traits equally** — not just traits matching the dominant type.
5. When a player is traded mid-season, their traits immediately recalculate potency based on the new team's chemistry.

**Example:** A trait with `baseModifier: +8 clutch` on a Tier 3 team (1.50×) produces an effective +12 clutch bonus. Same trait on a Tier 1 team produces +8 (no bonus).

**Potency in salary calculation (Mode 3 §5):** Trait modifier in salary formula is scaled by potency multiplier: Elite +10%, Good +5%, Minor +2% — each multiplied by team chemistry tier.

### 9.3 Trait Distribution (initial assignment)

Distribution at player creation (Mode 1): 30% gold / 50% silver / 20% bronze.

> **NOTE:** The 30/50/20 distribution is pending re-analysis against the 506 standard league players once that data is imported. Ratios may be adjusted.

**Gold/silver/bronze is a trait quality label, NOT the same as chemistry tier:**

| Quality | Meaning | Typical baseModifier range |
|---------|---------|--------------------------|
| Gold | Elite trait — strong base effects | ±8–12 |
| Silver | Standard trait — moderate effects | ±4–7 |
| Bronze | Minor trait — small effects | ±1–3 |

Quality is intrinsic to the trait itself (defined in the trait catalogue). Chemistry potency then scales the effective modifier.

### 9.4 Trait Lifecycle

| Phase | Mode | What Happens |
|-------|------|-------------|
| Initial assignment | Mode 1 | Traits assigned from catalogue; quality (gold/silver/bronze) comes from catalogue |
| Hidden on farm | Mode 1 + Mode 2 | Traits exist but are not revealed to user (C-054) |
| Revealed at call-up | Mode 2 | When prospect promoted to active roster |
| Potency recalculated | Mode 2 + Mode 3 | On roster change or chemistry rebalancing (Phase 12) |
| Added/removed | Mode 3 | Awards ceremony wheel spin (C-086), potency-only — chemistry affects strength not eligibility |
| Career display | Almanac | All traits ever held shown in player profile |

---

## 10. Designation Contract

Designations are shared between Mode 2 (in-season tracking) and Mode 3 (awards processing).

```typescript
interface DesignationState {
  teamId: string;
  seasonId: string;
  mvp: string | null;            // playerId
  ace: string | null;
  fanFavorite: string | null;
  albatross: string | null;
  cornerstone: string[];         // Multiple allowed
  teamCaptain: string | null;    // Per C-057
  fanHopeful: string | null;     // Per C-047 — top-3 farm prospect (renamed from youngPlayer)
}
```

**Written by:** Mode 2 designation engine (recalculated after every game)
**Locked by:** Mode 2 season end (final designations become permanent for that season)
**Consumed by:** Mode 3 (awards ceremony uses MVP/Ace as award candidates), Almanac (awards history)

---

## 11. Fan Morale Contract

Fan morale crosses Mode 2 and Mode 3.

```typescript
interface TeamFanMorale {
  teamId: string;
  morale: number;                // 0–100 scale
  components: {
    performanceGap: number;      // 60% weight
    designations: number;        // 20% weight
    beatReporter: number;        // 10% weight
    rosterMoves: number;         // 10% weight
  };
  tradeScrutiny: {
    active: boolean;
    expiresAfterGames: number;
  };
}
```

**Written by:** Mode 2 fan morale engine (after every game + transaction)
**Modified by:** Mode 3 (EOS modifier at low morale per C-084: 0.7× salary multiplier)
**Carried over:** Mode 3 → Mode 2 with decay

---

## 12. Narrative Contract

Narrative state persists across seasons.

```typescript
interface NarrativeCarryover {
  reporters: BeatReporter[];     // Full reporter state (persists across seasons)
  activeStorylines: Storyline[]; // In-progress multi-game arcs (defined in MODE_2 §16)
  revealedInsiders: string[];    // Reporter IDs with permanent INSIDER status (C-068)
}

// Reporter personality — 10 types (hidden from user)
type ReporterPersonality =
  | 'OPTIMIST' | 'PESSIMIST' | 'BALANCED' | 'DRAMATIC' | 'ANALYTICAL'
  | 'HOMER' | 'CONTRARIAN' | 'INSIDER' | 'OLD_SCHOOL' | 'HOT_TAKE';

// Canonical reporter entity — merges Spine and Mode 2 fields
interface BeatReporter {
  id: string;
  firstName: string;
  lastName: string;
  teamId: string;
  personality: ReporterPersonality;     // Hidden from user
  alignment: 'FRIENDLY' | 'NEUTRAL' | 'HOSTILE';
  revealLevel: 'SURFACE' | 'BEAT' | 'INSIDER';  // INSIDER = permanent per C-068
  trustScore: number;                   // 0–100
  moraleInfluence: number;              // Cumulative this season, capped ±3 per game (C-069)
  tenure: number;                       // Seasons covering this team
  reputation: 'ROOKIE' | 'ESTABLISHED' | 'VETERAN' | 'LEGENDARY';
  storiesWritten: number;
  hiredDate: FictionalDate;
}
```

**Owned by:** Mode 2 (per-game updates to alignment, revealLevel, trustScore, moraleInfluence)
**Carried over:** Mode 3 → Mode 2 (reporter relationships persist; moraleInfluence resets)
**Read by:** Almanac (narrative highlights)

---

## 13. Stadium & Park Factor Contracts

### 13.1 Stadium Entity

The Stadium is a shared entity — created in Mode 1, live-updated in Mode 2, archived for Almanac.

```typescript
interface Stadium {
  id: string;
  name: string;
  teamId: string;

  // Physical dimensions (immutable after creation)
  dimensions: StadiumDimensions;

  // Live park factors (recalculated during Mode 2)
  parkFactors: ParkFactors;

  // Historical snapshots (one per season)
  historicalFactors: SeasonParkFactors[];

  // Spray chart aggregate data
  sprayChart: SprayChartData;

  // Stadium records (single-game, career, HR distance)
  records: StadiumRecords;

  // Metadata
  surface: 'Grass' | 'Turf';
  roofType: 'Open' | 'Retractable' | 'Dome';
}
```

**Owned by:** Mode 1 (creation, dimensions), Mode 2 (parkFactors, sprayChart, records), Mode 3 (season snapshot)
**Read by:** Almanac (historical factors, records, career stats at stadium)

### 13.2 Stadium Dimensions

```typescript
interface StadiumDimensions {
  leftField: DimensionZone;
  leftCenter: DimensionZone;
  center: DimensionZone;
  rightCenter: DimensionZone;
  rightField: DimensionZone;
  foulTerritory: 'Small' | 'Medium' | 'Large';
  features: StadiumFeature[];     // Named quirks (e.g., 'Green Monster', 'The Cove')
}

interface DimensionZone {
  distance: number;                // Feet to wall
  wallHeight: 'Low' | 'Med' | 'High' | 'Monster';
  wallHeightFeet?: number;         // Specific height if notable
}

interface StadiumFeature {
  name: string;
  zone: SprayZone;
  effect: string;                  // Description of gameplay impact
}
```

### 13.3 Spray Zones

```typescript
type SprayZone =
  | 'LEFT_LINE' | 'LEFT_FIELD' | 'LEFT_CENTER'
  | 'CENTER'
  | 'RIGHT_CENTER' | 'RIGHT_FIELD' | 'RIGHT_LINE';
```

### 13.4 Park Factors

```typescript
interface ParkFactors {
  stadiumId: string;

  // Overall composite
  overall: number;                 // 0.80–1.20 typical range

  // Offensive factors
  runs: number;
  homeRuns: number;
  hits: number;                    // BABIP-ish
  doubles: number;
  triples: number;

  // Plate discipline
  strikeouts: number;
  walks: number;

  // Handedness splits
  leftHandedHR: number;
  rightHandedHR: number;
  leftHandedAVG: number;
  rightHandedAVG: number;

  // Hit direction factors (per spray zone, derived from spray chart data)
  directionFactors: Record<SprayZone, number>;

  // Confidence — determines blend ratio between seed and calculated values
  // LOW (<10 home games): 70% seed / 30% calculated
  // MEDIUM (10–80 home games): 30% seed / 70% calculated
  // HIGH (81+ home games): 0% seed / 100% calculated (per C-088)
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  gamesIncluded: number;
  source: 'SEED' | 'CALCULATED' | 'BLENDED';
}

interface SeasonParkFactors {
  seasonNumber: number;
  parkFactors: ParkFactors;
  gamesPlayed: number;
}
```

**Seeded by:** Mode 1 (dimensions-derived via PARK_FACTOR_SEED_SPEC; wall height per zone feeds HR/hit factors)
**Updated by:** Mode 2 (recalculated after every home game; confidence-based blending per C-088)
**Snapshotted by:** Mode 3 season end (archived per season)
**Read by:** Almanac (historical park factors, cross-season trends)

### 13.5 Stadium Records

```typescript
interface StadiumRecords {
  singleGame: {
    mostRuns: RecordEntry;
    mostHits: RecordEntry;
    mostHomeRuns: RecordEntry;
    mostHitsByPlayer: RecordEntry;
    mostRBIsByPlayer: RecordEntry;
    mostHRsByPlayer: RecordEntry;
    mostStrikeouts: RecordEntry;
  };
  homeRuns: {
    longestOverall: HRDistanceRecord;
    longestByZone: Record<SprayZone, HRDistanceRecord>;
    mostCareerHRs: { playerId: string; count: number }[];
    grandSlams: { playerId: string; gameId: string; inning: number; season: number }[];
  };
}

interface RecordEntry {
  value: number;
  holderId: string;
  holderName: string;
  gameId: string;
  seasonNumber: number;
}

interface HRDistanceRecord {
  distance: number;
  playerId: string;
  zone: SprayZone;
  gameId: string;
  seasonNumber: number;
}
```

### 13.6 Spray Chart Data

```typescript
interface SprayChartData {
  zones: Record<SprayZone, SprayZoneStats>;
  byHandedness: {
    left: Record<SprayZone, SprayZoneStats>;
    right: Record<SprayZone, SprayZoneStats>;
  };
}

interface SprayZoneStats {
  totalBattedBalls: number;
  hits: number;
  outs: number;
  homeRuns: number;
  doubles: number;
  triples: number;
}
```

---

## 14. Cross-References

### Gospel Documents

| Document | Sections | Decisions |
|----------|----------|-----------|
| MODE_1_LEAGUE_BUILDER.md | 16 | 12 (10 Mode 1 + 2 cross-cutting) |
| MODE_2_FRANCHISE_SEASON.md | 28 | 33 + 3 cross-cutting |
| MODE_3_OFFSEASON_WORKSHOP.md | 21 | 17 + 8 findings |
| ALMANAC.md | 10 | 0 (read-only consumer) |
| SPINE_ARCHITECTURE.md (this) | 14 | 1 (C-045) |

### STEP4 Decision in This Document

| ID | Decision | Where Applied |
|----|----------|--------------|
| C-045 | Spine = standalone 5th document | This entire document |

### Decisions Referenced (owned by other gospels)

| ID | Owner Gospel | Referenced In |
|----|-------------|--------------|
| C-054 | Mode 1 + Mode 2 | §9.2 (trait visibility) |
| C-057 | Mode 2 | §10 (Team Captain designation) |
| C-058/C-059 | Mode 2 | §8.3 (SMB4 constants) |
| C-070 | Mode 1 | §3.6 (7 personality types) |
| C-074/C-087 | Mode 1 | §3.6 (13-grade scale) |
| C-076 | Mode 1 | §6.2 (copy-not-reference) |
| C-078 | Mode 1 | §3.6 (FameLevel dropdown) |
| C-084 | Mode 2 + Mode 3 | §11 (fan morale EOS modifier) |
| C-086 | Mode 3 | §9.2 (trait wheel spin) |
| C-088 | Mode 2 | §13 (park factor blending) |
| C-005 | Mode 2 | §3.8 (WP_K/PB_K hybrid types) |
| C-011 | Mode 2 | §3.8 (TP in overflow menu) |
| C-068 | Mode 2 | §12 (INSIDER = permanent) |
| C-069 | Mode 2 | §12 (morale influence ±3 cap) |
| C-071 | Mode 1 | §3.4 (gamesPerTeam: 2–200 custom) |
| F-124 | Reconciliation | §3.6 (5 SMB4 chemistry types) |
| F-127 | Reconciliation | §7.1 (draft-round-based salary) |
| F-128 | Reconciliation | §3.5 (run differential tiebreaker) |

---

*This document is the authoritative specification for KBL Tracker's shared data contracts. All four mode-specific gospels reference this document for cross-mode entity definitions, storage schema, and handoff interfaces. Per C-045, this is a standalone 5th gospel document.*
