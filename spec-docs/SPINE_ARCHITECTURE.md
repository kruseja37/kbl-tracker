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

  // Ratings (0–99 scale)
  grade: Grade;                  // Computed from ratings (see §3.7)
  batterRatings: BatterRatings;
  pitcherRatings: PitcherRatings;

  // Personality & Traits (per MODE_1 §6)
  personality: PersonalityType;  // 7 types
  hiddenModifiers: {
    leadership: number;          // 0–100
    charisma: number;            // 0–100
    composure: number;           // 0–100
    ambition: number;            // 0–100
  };
  traits: PlayerTrait[];         // Assigned in Mode 3 awards ceremony

  // Contract & Status
  teamId: string;
  salary: number;
  contractYears: number;
  status: PlayerStatus;
  fameLevel: FameLevel;          // Dropdown, not slider (C-078)

  // In-game transient (Mode 2 only, not persisted between games)
  mojoLevel?: MojoLevel;         // -2 to +2
  fitnessState?: FitnessState;   // Juiced through Hurt

  // Stats (accumulated)
  seasonStats: BattingStats & PitchingStats;
  gameStats: BattingStats & PitchingStats;
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
  gamesPerTeam: number;          // 16 | 32 | 64 | 128 | 162
  inningsPerGame: number;        // Default 9
  extraInningsRule: 'standard' | 'runner_on_second' | 'none';
  dhRule: boolean;
  mercyRule: { enabled: boolean; runDiff: number; afterInning: number };
  tradeDeadline: { enabled: boolean; gameNumber: number };
  playoffFormat: PlayoffFormat;
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

interface ScheduleGame {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  gameNumber: number;            // 1-based within season
  isComplete: boolean;
  result?: GameResult;
  isPlayoff: boolean;
}

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
// Position — 11 positions
type Position = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'SP' | 'RP' | 'DH';

// Grade — 13-tier scale (C-074/C-087)
type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-';

// Personality — 7 types only (C-070)
type PersonalityType = 'Leader' | 'Maverick' | 'Stoic' | 'Fiery' | 'Prankster' | 'Mentor' | 'Enigma';

// Fame — Dropdown levels (C-078)
type FameLevel = 'Unknown' | 'Local' | 'Regional' | 'National' | 'Superstar' | 'Legend';

// Player status
type PlayerStatus = 'active' | 'injured' | 'minors' | 'free_agent' | 'retired';

// Season phase
type SeasonPhase = 'SETUP' | 'PRE_SEASON' | 'REGULAR_SEASON' | 'ALL_STAR_BREAK'
  | 'POST_DEADLINE' | 'PLAYOFFS' | 'OFFSEASON';

// Mojo — 5 levels (per MODE_2 §14)
type MojoLevel = -2 | -1 | 0 | 1 | 2;

// Fitness — 6 states (per MODE_2 §14)
type FitnessState = 'Juiced' | 'Fresh' | 'Normal' | 'Tired' | 'Gassed' | 'Hurt';

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

**Grade derivation** from ratings uses the algorithm defined in MODE_1_LEAGUE_BUILDER.md §5.3. The grade is a display convenience — engines use raw ratings for calculations.

---

## 4. Stats Contracts

### 4.1 Batting Stats

```typescript
interface BattingStats {
  gamesPlayed: number;
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
  stolenBases: number;
  caughtStealing: number;
  errors: number;
  hitByPitch: number;
  sacFlies: number;
  sacBunts: number;
  intentionalWalks: number;
  gidp: number;
  plateAppearances: number;
}
```

### 4.2 Pitching Stats

```typescript
interface PitchingStats {
  gamesStarted: number;
  gamesPitched: number;
  inningsPitched: number;       // Stored as total outs / 3
  pitchCount: number;
  battersFaced: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeoutsPitching: number;
  homeRunsAllowed: number;
  hitBatters: number;
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  completeGames: number;
  shutouts: number;
  qualityStarts: number;
  inheritedRunners: number;
  inheritedRunnersScored: number;
  highLeverageOuts: number;
}
```

### 4.3 Fielding Stats

```typescript
interface FieldingStats {
  games: number;
  innings: number;
  putouts: number;
  assists: number;
  errors: number;
  doublePlays: number;
  divingPlays: number;
  wallCatches: number;
  robbedHRs: number;
  position: Position;
  gamesByPosition: Record<Position, number>;
}
```

### 4.4 Career Stats

```typescript
interface CareerStats {
  playerId: string;
  seasonsPlayed: number;
  careerBatting: BattingStats;
  careerPitching: PitchingStats;
  careerFielding: FieldingStats;
  careerWAR: {
    bWAR: number;
    pWAR: number;
    fWAR: number;
    rWAR: number;
    mWAR: number;
    total: number;
  };
  seasonHistory: PlayerSeasonSummary[];
}

interface PlayerSeasonSummary {
  seasonId: string;
  seasonNumber: number;
  teamId: string;
  batting: BattingStats;
  pitching: PitchingStats;
  fielding: FieldingStats;
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

type TransactionType = 'TRADE' | 'FREE_AGENT_SIGNING' | 'DRAFT_PICK' | 'RELEASE'
  | 'DFA' | 'CALL_UP' | 'SEND_DOWN' | 'RETIREMENT' | 'IL_PLACEMENT' | 'IL_RETURN'
  | 'WAIVER_CLAIM' | 'EXPANSION_DRAFT';
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
  ├── parkFactors                # Stadium park factors by season
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
  designations: TeamDesignationState[];
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
  goldGloveCandidates: Record<Position, { playerId: string; fWAR: number }[]>;
  silverSluggerCandidates: Record<Position, { playerId: string; ops: number }[]>;
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

### 8.2 WAR Scaling

```typescript
const runsPerWin = 10 * (seasonGames / 162);
```

WAR grades normalize to 162-game equivalents for display. Raw WAR uses actual season length.

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
  tier: 'gold' | 'silver' | 'bronze';
  potency: number;               // Numeric strength value
  effects: TraitEffect[];
}

interface TraitEffect {
  target: string;                // Which stat/system is affected
  modifier: number;              // How much
  condition?: string;            // When it applies (optional)
}
```

### 9.2 Trait Lifecycle

| Phase | Mode | What Happens |
|-------|------|-------------|
| Initial assignment | Mode 1 | 30/50/20 distribution (gold/silver/bronze) per team chemistry |
| Hidden on farm | Mode 1 + Mode 2 | Traits exist but are not revealed to user (C-054) |
| Revealed at call-up | Mode 2 | When prospect promoted to active roster |
| Added/removed | Mode 3 | Awards ceremony wheel spin (C-086), potency-only |
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
  youngPlayer: string | null;    // Per C-047 — top-3 farm prospect
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
  reporters: ReporterState[];    // Personality, alignment, trust level
  activeStorylines: Storyline[]; // In-progress multi-game arcs
  revealedInsiders: string[];    // Reporter IDs with permanent INSIDER status (C-068)
}

interface ReporterState {
  reporterId: string;
  personality: ReporterPersonality;  // 10 types
  alignment: 'FRIENDLY' | 'NEUTRAL' | 'HOSTILE';
  moraleInfluence: number;       // Capped ±3 per game (C-069)
  revealLevel: 'SURFACE' | 'BEAT' | 'INSIDER';
  trustScore: number;
}
```

**Owned by:** Mode 2 (per-game updates)
**Carried over:** Mode 3 → Mode 2 (relationships persist)
**Read by:** Almanac (narrative highlights)

---

## 13. Park Factor Contract

```typescript
interface ParkFactors {
  stadiumId: string;
  overall: number;               // 0.80–1.20 scale
  runs: number;
  homeRuns: number;
  leftHandedHR: number;
  rightHandedHR: number;
  leftHandedAVG: number;
  rightHandedAVG: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

**Seeded by:** Mode 1 (from PARK_FACTOR_SEED_SPEC)
**Updated by:** Mode 2 (confidence-based blending per C-088: LOW=70% seed, MEDIUM=30% seed, HIGH=0% seed)
**Snapshotted by:** Mode 3 season end (archived per season)
**Read by:** Almanac (historical park factors)

---

## 14. Cross-References

### Gospel Documents

| Document | Lines | Sections | Decisions |
|----------|-------|----------|-----------|
| MODE_1_LEAGUE_BUILDER.md | ~1,767 | 16 | 12 (10 Mode 1 + 2 cross-cutting) |
| MODE_2_FRANCHISE_SEASON.md | ~3,269 | 28 | 33 + 3 cross-cutting |
| MODE_3_OFFSEASON_WORKSHOP.md | ~1,319 | 21 | 17 + 8 findings |
| ALMANAC.md | ~350 | 10 | 0 (read-only consumer) |
| SPINE_ARCHITECTURE.md (this) | ~550 | 14 | 1 (C-045) |

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
| F-124 | Reconciliation | §3.6 (5 SMB4 chemistry types) |
| F-127 | Reconciliation | §7.1 (draft-round-based salary) |
| F-128 | Reconciliation | §3.5 (run differential tiebreaker) |

---

*This document is the authoritative specification for KBL Tracker's shared data contracts. All four mode-specific gospels reference this document for cross-mode entity definitions, storage schema, and handoff interfaces. Per C-045, this is a standalone 5th gospel document.*
