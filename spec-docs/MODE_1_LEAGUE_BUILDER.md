# MODE 1: LEAGUE BUILDER — Gospel Specification

**Version:** 1.0 (Gospel)
**Status:** CANONICAL — This document is the single source of truth for Mode 1
**Created:** 2026-02-22
**Supersedes:** LEAGUE_BUILDER_SPEC.md, SEASON_SETUP_SPEC.md, portions of FRANCHISE_MODE_SPEC.md, GRADE_ALGORITHM_SPEC.md, PROSPECT_GENERATION_SPEC.md, SCOUTING_SYSTEM_SPEC.md, PERSONALITY_SYSTEM_SPEC.md (assignment only), TRAIT_INTEGRATION_SPEC.md (initial distribution only), SCHEDULE_SYSTEM_FIGMA_SPEC.md (setup only), LEAGUE_BUILDER_FIGMA_SPEC.md, SEASON_SETUP_FIGMA_SPEC.md, SMB4_GAME_REFERENCE.md (import mapping), smb4_traits_reference.md (import mapping)
**Cross-references:** SPINE_ARCHITECTURE.md (shared data contracts), MODE_2_FRANCHISE_SEASON.md (what Mode 1 hands off to), MODE_3_OFFSEASON_WORKSHOP.md (prospect generation reused at annual draft)

**STEP4 Decisions Applied:** C-070, C-071, C-072, C-073, C-074, C-075, C-076, C-077, C-078, C-087. Cross-cutting: C-045, C-054.

---

## 1. Overview & Mode Definition

### 1.1 What Mode 1 Is

Mode 1 — the League Builder — is the **one-time setup hub** where users configure everything before a franchise begins. It runs exactly once per franchise. Once the user clicks "Start Franchise," Mode 1's work is complete and control passes to Mode 2 (Franchise Season).

> **Per C-073:** The League Builder is explicitly Mode 1 of KBL's three-mode architecture. Mode 2 is the Franchise Season (play games, track stats). Mode 3 is the Offseason Workshop (between-season processing). The Almanac is a read-only historical layer available at all times. See SPINE_ARCHITECTURE.md for the shared data contracts connecting all three modes.

### 1.2 What Mode 1 Produces

When Mode 1 completes, it has created:

1. A **franchise save slot** — an isolated IndexedDB instance containing all franchise data
2. **League structure** — conferences, divisions, team assignments
3. **Complete team roster data** — all players with ratings, traits, personalities, salaries
4. **Farm rosters** — populated via Startup Prospect Draft (or empty if skipped)
5. **Rules configuration** — season length, playoffs, roster rules, narrative toggles
6. **Schedule** — pre-generated, user-editable game schedule
7. **Franchise type** — Solo, Couch Co-Op, or Custom (which teams are human vs AI)
8. **Initialized subsystems** — standings tables, salary ledger, empty stats stores

### 1.3 What Mode 1 Does NOT Do

- Track any games or at-bats (that's Mode 2)
- Run any offseason phases (that's Mode 3)
- Store historical data (that's the Almanac)
- Generate narrative content (that's Mode 2's narrative engine)

### 1.4 Entry Points

| Entry | Flow | Description |
|-------|------|-------------|
| Main Menu → "New Franchise" | Full wizard (§11) | Complete 6-step setup |
| Main Menu → "Playoff Mode" | Abbreviated wizard (§11.7) | Skip season settings, go straight to playoffs |
| Main Menu → "League Builder" | Standalone editor | Edit leagues/teams/players without starting a franchise |

### 1.5 Key Principles

1. **Teams are reusable** — A team template can exist in multiple leagues simultaneously
2. **Players are global** — One player database shared across all league templates
3. **Leagues are templates** — Configurations that can be instantiated into franchises
4. **Non-destructive** — Changes in League Builder don't affect active franchises
5. **Copy-on-create** — Franchise creation copies data from templates; subsequent template edits don't propagate (per C-076)

---

## 2. Franchise Type Selection

### 2.1 The Three Franchise Types

Every franchise is one of three types, selected during the creation wizard (§11, Step 4). The type determines which teams are human-controlled vs AI-controlled, which affects the experience layer — not access.

| Type | Human Teams | AI Teams | Default AI Score Entry | Use Case |
|------|------------|----------|----------------------|----------|
| **Solo (1P)** | 1 | Rest of league | Enabled | One user, one team, plays all their games in SMB4 |
| **Couch Co-Op** | All | 0 | N/A (no AI teams) | All teams human-controlled, pure scorebook |
| **Custom** | 2+ | Rest of league | Configurable | Multiple human teams, rest AI |

### 2.2 The `controlledBy` Flag

Every team in a franchise carries a control flag:

```typescript
interface FranchiseTeam {
  // ...all Team fields from §4...
  controlledBy: 'human' | 'ai';
}
```

**What the flag gates — experience, not access:**

| Aspect | Human Team | AI Team |
|--------|-----------|---------|
| Dashboard | Full dashboard with narrative feed, notifications | Accessible but reactive (surfaced when user needs to sync with SMB4) |
| GameTracker | Full event tracking for all games involving this team | Same — user records events for both sides during games vs human teams |
| Roster/Lineup | Full editing (proactive) | Full editing (reactive — sync with SMB4 reality) |
| Mojo/Fitness | Full editing | Full editing |
| Narrative | Rich: beat reporters, storylines, milestones | Limited to appearances in human-team games |
| Designations | Full tracking | Tracked only from human-team game data |
| Stats | Full season stats from all GameTracker events | Stats only from games involving human teams |

**The user is both commissioner and manager.** Commissioner powers (edit anything on any team) are always available. The `controlledBy` flag only determines which teams get the rich, proactive manager experience.

### 2.3 Franchise Type Configuration

```typescript
interface FranchiseTypeConfig {
  type: 'solo' | 'couch-coop' | 'custom';
  humanTeams: string[];       // Team IDs controlled by humans
  aiScoreEntry: boolean;      // Allow manual W/L entry for AI-vs-AI games
  offseasonPhaseScopes: OffseasonPhaseConfig[];  // Per-phase scope (consumed by Mode 3)
}
```

### 2.4 Presets

**Solo:** User selects 1 team → that team is `human`, all others `ai`. AI score entry enabled by default. Offseason phase scopes use defaults from §2.5.

**Couch Co-Op:** All teams set to `human`. No AI score entry toggle (not needed). All offseason phases scoped to `all-teams`. No AI logic required anywhere. Every game fully tracked. Full league standings. Pure scorebook.

**Custom:** User selects 2+ teams as `human`. Configurable AI score entry. Configurable offseason phase scopes (defaults from §2.5).

### 2.5 Offseason Phase Scope Defaults

Each of the 13 offseason phases (see MODE_3_OFFSEASON_WORKSHOP.md) has a default scope:

```typescript
type PhaseScope = 'all-teams' | 'human-only';

interface OffseasonPhaseConfig {
  phase: number;
  name: string;
  scope: PhaseScope;
  aiResolution: 'auto' | 'skip';
}
```

| Phase | Name | Default Scope | Rationale |
|-------|------|--------------|-----------|
| 1 | Season End Processing | all-teams | League ecosystem health |
| 2 | Awards Ceremony | human-only | Requires full season stats |
| 3 | Salary Recalculation #1 | human-only | Requires full season stats |
| 4 | Expansion | all-teams | League structure |
| 5 | Retirements | all-teams | Auto-calculated by age + service |
| 6 | Free Agency | all-teams | Player movement ecosystem |
| 7 | Draft | all-teams | AI teams auto-pick (reverse record, BPA) |
| 8 | Salary Recalculation #2 | human-only | Requires full season stats |
| 9 | Offseason Trades | all-teams | AI available as trade partners |
| 10 | Salary Recalculation #3 | human-only | Requires full season stats |
| 11 | Finalize & Advance | all-teams | Roster compliance |
| 12 | Farm Reconciliation | human-only | Requires full season stats |
| 13 | Chemistry Rebalancing | human-only | Requires full season stats |

**Couch Co-Op override:** All phases forced to `all-teams` (no AI teams exist).

### 2.6 What Franchise Type Does NOT Change

The franchise type is a **configuration layer**, not a structural change. These systems are unchanged regardless of type:

- GameTracker event model
- Stats pipeline (processes whatever events exist)
- WAR calculations (operate on available data)
- Narrative engine (generates from available events)
- Designation system (triggers on available data)
- Offseason phase sequence (just adds scope gating)
- Almanac (stores whatever data exists)

---

## 3. Leagues Module

### 3.1 Purpose

Create and manage league templates that define team groupings, conference/division structure, and default rules. League templates exist in the global League Builder space and can be instantiated into multiple franchises.

### 3.2 Features

| Function | Description |
|----------|-------------|
| **View** | Browse existing league templates |
| **Create** | New league with name, team selection, structure |
| **Edit** | Modify existing league configuration |
| **Delete** | Remove league template (doesn't affect active franchises) |
| **Duplicate** | Copy league as starting point for new one |

### 3.3 League Template Data Model

```typescript
interface LeagueTemplate {
  id: string;
  name: string;                    // "Kruse Baseball League"
  description?: string;
  createdDate: string;
  lastModified: string;

  // Team Membership (references to global team pool)
  teamIds: string[];

  // Structure
  conferences: Conference[];
  divisions: Division[];

  // Default Rules (can be overridden at franchise creation)
  defaultRulesPresetId: string;    // Reference to rules preset (§9)

  // Branding
  logoUrl?: string;
  themeColor?: string;             // Hex code for UI theming
}

interface Conference {
  id: string;
  name: string;                    // "American League", "National League"
  abbreviation: string;            // "AL", "NL"
  divisionIds: string[];
}

interface Division {
  id: string;
  name: string;                    // "East", "West", "Central"
  conferenceId: string;
  teamIds: string[];
}
```

### 3.4 League Creation Flow

```
Step 1: Name & Description
         ↓
Step 2: Select Teams (from global team pool)
         ↓
Step 3: Configure Structure
        - Number of conferences (0, 1, 2)
        - Number of divisions per conference
        - Assign teams to divisions
         ↓
Step 4: Select Default Rules Preset
         ↓
Step 5: Review & Save
```

### 3.5 Structural Constraints

- A league must have at least 2 teams
- Conference count: 0 (flat league), 1, or 2
- Division count per conference: 0 (flat conference), 1, 2, or 3+
- Every team must be assigned to exactly one division (if divisions exist)
- Teams can belong to multiple league templates simultaneously (templates are independent)

---

## 4. Teams Module

### 4.1 Purpose

Create, edit, and manage teams in the global team pool. Teams are reusable across multiple league templates.

### 4.2 Features

| Function | Description |
|----------|-------------|
| **Create** | New team with full customization |
| **Edit** | Modify team details |
| **Assign** | Add/remove team from leagues |
| **Import** | Upload teams via CSV |
| **Delete** | Remove team (with confirmation if assigned to leagues) |

### 4.3 Team Data Model

```typescript
interface Team {
  id: string;
  name: string;                  // "San Francisco Giants"
  abbreviation: string;          // "SFG"
  location: string;              // "San Francisco"
  nickname: string;              // "Giants"

  // Branding
  colors: {
    primary: string;             // Hex code "#FD5A1E"
    secondary: string;           // Hex code "#27251F"
    accent?: string;             // Optional third color
  };
  logoUrl?: string;

  // Venue
  stadium: string;               // "Oracle Park"
  stadiumCapacity?: number;

  // League Membership (global — NOT franchise-specific)
  leagueIds: string[];           // Can be in multiple league templates

  // Metadata
  foundedYear?: number;
  championships?: number;
  retiredNumbers?: number[];
  createdDate: string;
  lastModified: string;
}
```

**Note:** The `controlledBy` flag (§2.2) is NOT part of the global Team model. It is assigned per-franchise during the creation wizard and stored in `FranchiseTeam`, which extends `Team`.

### 4.4 Team CSV Import

```csv
name,abbreviation,location,nickname,primaryColor,secondaryColor,accentColor,logoUrl,stadium
San Francisco Giants,SFG,San Francisco,Giants,#FD5A1E,#27251F,#FFFFFF,/logos/sfg.png,Oracle Park
New York Yankees,NYY,New York,Yankees,#003087,#E4002C,,/logos/nyy.png,Yankee Stadium
```

**Import flow:**
1. Upload CSV file
2. Preview parsed data with validation
3. Check for duplicates (by abbreviation), required fields
4. Confirm import
5. Teams added to global pool

---

## 5. Players Module

### 5.1 Purpose

Create, edit, and manage the global player database. All players exist in one pool and are assigned to teams via the Rosters module (§7). The initial league is populated from the SMB4 506-player database.

### 5.2 Features

| Function | Description |
|----------|-------------|
| **Create** | New player with full attribute editor |
| **Edit** | Modify any player attribute |
| **Stats** | View/edit career statistics |
| **Generate** | Create fictional players using grade algorithm (§5.6) |
| **Import** | Upload players via CSV |
| **Delete** | Remove player from database |

### 5.3 Complete Player Data Model

```typescript
interface Player {
  // ── Identity ──────────────────────────────────────────────
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  gender: 'M' | 'F';

  // ── Physical ──────────────────────────────────────────────
  age: number;
  bats: 'L' | 'R' | 'S';            // Left, Right, Switch
  throws: 'L' | 'R';

  // ── Position ──────────────────────────────────────────────
  primaryPosition: Position;
  secondaryPosition?: Position;

  // ── Position Player Ratings (0-99) ────────────────────────
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;

  // ── Pitcher Ratings (0-99) ────────────────────────────────
  velocity: number;
  junk: number;
  accuracy: number;

  // ── Pitcher Arsenal ───────────────────────────────────────
  arsenal: PitchType[];               // e.g., ['4F', '2F', 'CB', 'SL', 'CH']

  // ── Grade (auto-calculated from ratings per §5.6) ────────
  overallGrade: Grade;

  // ── Traits (max 2) ───────────────────────────────────────
  trait1?: Trait;
  trait2?: Trait;

  // ── Personality (§6) ─────────────────────────────────────
  personality: PersonalityType;       // 1 of 7 visible types
  hiddenModifiers: HiddenModifiers;   // 4 hidden 0-100 values

  // ── Chemistry ─────────────────────────────────────────────
  chemistry: ChemistryType;           // 1 of 5 SMB4 chemistry types

  // ── Status ────────────────────────────────────────────────
  morale: number;                     // 0-100
  mojo: MojoState;
  fameLevel: FameLevel;               // Per C-078: dropdown, not slider

  // ── Contract ──────────────────────────────────────────────
  salary: number;                     // In millions
  contractYears?: number;

  // ── Team Assignment ───────────────────────────────────────
  currentTeamId: string | null;       // null = free agent
  rosterStatus: 'MLB' | 'FARM' | 'FREE_AGENT';

  // ── Metadata ──────────────────────────────────────────────
  createdDate: string;
  lastModified: string;
  isCustom: boolean;                  // User-created vs imported
  sourceDatabase?: string;            // "SMB4", "Custom", etc.
}
```

### 5.4 Type Definitions

```typescript
type Position = 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF' | 'DH' |
                'SP' | 'RP' | 'CP' | 'SP/RP' | 'TWO-WAY';

// Per C-074/C-087: 13 grades, S through D-. This is the authoritative scale.
type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' |
             'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-';

type PitchType = '4F' | '2F' | 'CB' | 'SL' | 'CH' | 'FK' | 'CF' | 'SB' | 'SC' | 'KN';

// Per C-070: 7 personality types only. Chemistry types are separate.
type PersonalityType = 'Competitive' | 'Relaxed' | 'Droopy' | 'Jolly' |
                       'Tough' | 'Timid' | 'Egotistical';

type ChemistryType = 'Competitive' | 'Spirited' | 'Crafty' | 'Scholarly' | 'Disciplined';

type MojoState = 'On Fire' | 'Hot' | 'Normal' | 'Cold' | 'Ice Cold';

// Per C-078: FameLevel replaces the numeric fame slider
type FameLevel = 'Unknown' | 'Local' | 'Regional' | 'National' | 'Superstar' | 'Legend';

interface HiddenModifiers {
  loyalty: number;       // 0-100: FA preference, trade request likelihood
  ambition: number;      // 0-100: Development speed, willingness to change teams
  resilience: number;    // 0-100: Morale recovery, retirement probability
  charisma: number;      // 0-100: Teammate morale, captain selection, mentorship
}
```

### 5.5 Trait Catalogue

Traits are SMB4 assets — KBL wraps them with strategic depth (chemistry potency) but never overrides their in-game behavior. Each trait maps to one of 5 Chemistry types. See TRAIT_INTEGRATION_SPEC.md for the full mapping table.

```typescript
// Positive Batting
type BattingTrait = 'Clutch' | 'RBI Hero' | 'Rally Starter' | 'Tough Out' |
  'First Pitch Slayer' | 'Bad Ball Hitter' | 'Fastball Hitter' | 'Off-Speed Hitter' |
  'Contact Hitter' | 'Bunter' | 'Big Hack' | 'Little Hack' | 'Mind Gamer' |
  'Sign Stealer' | 'POW vs LHP' | 'POW vs RHP' | 'CON vs LHP' | 'CON vs RHP' |
  'High Pitch' | 'Low Pitch' | 'Inside Pitch' | 'Outside Pitch';

// Positive Fielding
type FieldingTrait = 'Magic Hands' | 'Dive Wizard' | 'Cannon Arm' | 'Pick Officer';

// Positive Running
type RunningTrait = 'Stealer' | 'Sprinter' | 'Base Rounder';

// Positive Pitching
type PitchingTrait = 'K Collector' | 'Gets Ahead' | 'Rally Stopper' | 'Composed' |
  'Elite 4F' | 'Elite 2F' | 'Elite CB' | 'Elite SL' | 'Elite CH' |
  'Elite FK' | 'Elite CF' | 'Elite SB';

// Positive General
type GeneralTrait = 'Utility' | 'Two Way' | 'Durable' | 'Consistent' |
  'Pinch Perfect' | 'Stimulated' | 'Metal Head' | 'Ace Exterminator';

// Negative Batting
type NegBattingTrait = 'Choker' | 'RBI Zero' | 'First Pitch Prayer' | 'Whiffer';

// Negative Fielding
type NegFieldingTrait = 'Butter Fingers' | 'Bad Jumps' | 'Noodle Arm' |
  'Wild Thrower' | 'Easy Target';

// Negative Running
type NegRunningTrait = 'Base Jogger' | 'Slow Poke';

// Negative Pitching
type NegPitchingTrait = 'K Neglecter' | 'Falls Behind' | 'BB Prone' |
  'Wild Thing' | 'Meltdown';

// Negative General
type NegGeneralTrait = 'Volatile' | 'Injury Prone' | 'Surrounded' | 'Crossed Up';

type Trait = BattingTrait | FieldingTrait | RunningTrait | PitchingTrait |
  GeneralTrait | NegBattingTrait | NegFieldingTrait | NegRunningTrait |
  NegPitchingTrait | NegGeneralTrait;
```

### 5.6 Grade Calculation Algorithm

Grade is determined by a weighted rating. The same formula is used for grade display, salary calculation, and prospect generation.

**Position Players — 3:3:2:1:1 weighting:**

```typescript
function calculatePositionPlayerWeighted(ratings: {
  power: number; contact: number; speed: number; fielding: number; arm: number;
}): number {
  return (
    ratings.power * 0.30 +
    ratings.contact * 0.30 +
    ratings.speed * 0.20 +
    ratings.fielding * 0.10 +
    ratings.arm * 0.10
  );
}
```

**Pitchers — equal 1:1:1 weighting:**

```typescript
function calculatePitcherWeighted(ratings: {
  velocity: number; junk: number; accuracy: number;
}): number {
  return (ratings.velocity + ratings.junk + ratings.accuracy) / 3;
}
```

**Two-Way Players — both ratings combined with 1.25× premium:**

```typescript
function calculateTwoWayWeighted(posRatings: PositionPlayerRatings, pitchRatings: PitcherRatings): number {
  return (calculatePositionPlayerWeighted(posRatings) + calculatePitcherWeighted(pitchRatings)) * 1.25;
}
```

### 5.7 Grade Thresholds

Per C-074/C-087: 13 grades, S through D-. This is the authoritative scale used everywhere in KBL.

```typescript
const GRADE_THRESHOLDS: { grade: Grade; minWeighted: number }[] = [
  { grade: 'S',  minWeighted: 80 },
  { grade: 'A+', minWeighted: 78 },
  { grade: 'A',  minWeighted: 73 },
  { grade: 'A-', minWeighted: 66 },
  { grade: 'B+', minWeighted: 58 },
  { grade: 'B',  minWeighted: 55 },
  { grade: 'B-', minWeighted: 48 },
  { grade: 'C+', minWeighted: 45 },
  { grade: 'C',  minWeighted: 38 },
  { grade: 'C-', minWeighted: 35 },
  { grade: 'D+', minWeighted: 30 },
  { grade: 'D',  minWeighted: 25 },
  { grade: 'D-', minWeighted: 0 },
];

function getGrade(weighted: number): Grade {
  for (const t of GRADE_THRESHOLDS) {
    if (weighted >= t.minWeighted) return t.grade;
  }
  return 'D-';
}
```

**Verification examples (from SMB4 data):**

| Player | Grade | POW | CON | SPD | FLD | ARM | Weighted |
|--------|-------|-----|-----|-----|-----|-----|----------|
| Sakda Song | S | 80 | 93 | 90 | 82 | 57 | 83.8 |
| Elvis Stanley | A | 68 | 80 | 75 | 87 | 77 | 75.8 |
| Kobe Kingman | B | 95 | 27 | 51 | 68 | 63 | 59.9 |
| Bertha Banks | B- | 64 | 56 | 51 | 67 | 52 | 58.1 |
| Benny Balmer | C+ | 32 | 40 | 58 | 89 | 84 | 50.5 |

### 5.8 Fictional Player Generation

Used both in the League Builder (manual generation) and in the Startup Prospect Draft (§8).

```typescript
interface GeneratePlayersConfig {
  count: number;
  targetGrade: Grade;
  positionDistribution: 'balanced' | 'random' | Position;
  genderRatio: number;             // 0.25 = 25% female
  ageRange: { min: number; max: number };
  includeTraits: boolean;
  traitPool: 'positive_only' | 'neutral' | 'any';
}
```

**Position-based stat bias** — prospects at each position have realistic stat shapes:

| Position | Bias | Rationale |
|----------|------|-----------|
| C | +10 FLD, +10 ARM, -10 SPD | Catchers: defense over speed |
| 1B | +15 POW, -10 SPD, -5 FLD | First base: power sluggers |
| 2B | +5 CON, +5 SPD, -10 POW | Second base: contact/speed |
| SS | +10 FLD, +5 ARM, -10 POW, +5 SPD | Shortstop: defense + speed |
| 3B | +10 POW, +5 ARM, -10 SPD | Third base: power + arm |
| LF | +10 POW, -5 FLD, -5 ARM | Left field: offense-first |
| CF | +15 SPD, +5 FLD, -10 POW | Center field: speed + range |
| RF | +5 POW, +10 ARM, -5 SPD | Right field: power + arm |

**Pitcher prospect stat bias:**

| Role | Bias | Rationale |
|------|------|-----------|
| SP | +5 ACC, -2 VEL, -3 JNK | Starters: balanced, accuracy emphasis |
| CP | +8 VEL, +5 JNK, -13 ACC | Closers: velocity + junk |
| RP | Random archetype (power arm, crafty, or balanced) | High variance |

### 5.9 FameLevel (Per C-078)

Fame is a 6-tier dropdown, not a numeric slider:

```typescript
const FAME_LEVELS: { level: FameLevel; description: string }[] = [
  { level: 'Unknown',    description: 'No public recognition' },
  { level: 'Local',      description: 'Known in team market' },
  { level: 'Regional',   description: 'Known across conference' },
  { level: 'National',   description: 'Nationally recognized' },
  { level: 'Superstar',  description: 'Household name' },
  { level: 'Legend',      description: 'All-time great status' },
];
```

FameLevel is set at import (based on SMB4 fame value mapping) and evolves during the franchise via the narrative engine (Mode 2).

---

## 6. Personality & Traits — Initial Assignment

### 6.1 When Assignment Happens

All 506 players (or however many are imported) receive personality and trait data at league creation. This is a Mode 1 operation — subsequent changes happen in Mode 2 (in-season) and Mode 3 (offseason).

### 6.2 Personality: 7 Visible Types

Per C-070: The personality type union is exactly 7 types. Chemistry types (`Competitive`, `Spirited`, `Crafty`, `Scholarly`, `Disciplined`) are a separate system and must NOT appear in the personality type dropdown.

| Type | Weight | Behavioral Tendency |
|------|--------|---------------------|
| **Competitive** | 20% | Seeks contenders, responds to challenges |
| **Relaxed** | 20% | Comfortable with status quo |
| **Jolly** | 15% | Loves teammates, adventurous |
| **Tough** | 15% | Bounces back, values respect |
| **Timid** | 10% | Fears change, avoids spotlight |
| **Droopy** | 10% | Pessimistic, prone to slumps |
| **Egotistical** | 10% | Wants money and glory |

### 6.3 Personality: 4 Hidden Modifiers

Generated via Gaussian distribution: μ=50, σ=20, clamped [0, 100]. Visible type creates soft bias:

| Personality | Modifier Bias |
|-------------|--------------|
| Competitive | +10 Ambition |
| Relaxed | +10 Resilience |
| Jolly | +10 Charisma |
| Tough | +10 Resilience, +5 Loyalty |
| Timid | -10 Ambition, +5 Loyalty |
| Droopy | -10 Resilience |
| Egotistical | +15 Ambition, -10 Loyalty |

**Hidden modifiers are NEVER shown as numbers to the user.** They surface only through behavioral signals and beat reporter hints (Mode 2). See MODE_2_FRANCHISE_SEASON.md §Narrative for surfacing rules.

### 6.4 Initial Trait Distribution

From the 506-player SMB4 database (and maintained for generated players):

| Trait Count | Percentage |
|-------------|-----------|
| 0 traits | ~30% |
| 1 trait | ~50% |
| 2 traits | ~20% |

**Trait rules at assignment:**
- Max 2 traits per player (hard cap)
- Traits must be position-appropriate (batting/running/fielding traits for position players, pitching traits for pitchers, both for two-way)
- Chemistry type does NOT restrict which traits a player can receive (C-064 resolved by C-086: chemistry affects potency, not eligibility)
- 15% of assigned traits are negative (for generated players — SMB4 imports keep their original traits)

### 6.5 Trait Visibility on Farm (Per C-054)

Per C-054: Traits are visible on farm prospects. True numeric ratings are hidden until call-up. The scouted grade (§8.6) is the user's only indicator of a farm prospect's true ability.

| Data Point | Farm (Pre-Call-Up) | MLB (Post-Call-Up) |
|-----------|-------------------|-------------------|
| Scouted Grade | ✅ Visible | Replaced by true grade |
| Position | ✅ Visible | ✅ Visible |
| Chemistry Type | ✅ Visible | ✅ Visible |
| Traits | ✅ Visible | ✅ Visible |
| Personality (visible type) | ✅ Visible | ✅ Visible |
| Personality (hidden modifiers) | ❌ Hidden | ❌ Hidden (surfaced via narrative) |
| True numeric ratings | ❌ Hidden | ✅ Revealed at call-up |

---

## 7. Rosters Module

### 7.1 Purpose

Assign players to teams and configure lineup/depth chart. Roster assignments in the League Builder are templates — they get copied into the franchise at creation time.

### 7.2 Features

| Function | Description |
|----------|-------------|
| **Assign** | Move players between teams / free agency |
| **Depth Chart** | Set batting order, fielding positions |
| **Lineup** | Configure starting lineup vs L/R pitchers |
| **Validate** | Check roster compliance |

### 7.3 Roster Data Model

```typescript
interface TeamRoster {
  teamId: string;

  // Player Lists
  mlbRoster: string[];             // Player IDs (target: 22)
  farmRoster: string[];            // Player IDs (max: 10)

  // Lineup Configuration
  lineupVsRHP: LineupSlot[];       // Batting order vs right-handed pitchers
  lineupVsLHP: LineupSlot[];       // Batting order vs left-handed pitchers

  // Pitching Rotation
  startingRotation: string[];      // SP player IDs in order
  closingPitcher: string;
  setupPitchers: string[];

  // Depth Chart
  depthChart: DepthChart;

  // Bench Preferences
  pinchHitOrder: string[];
  pinchRunOrder: string[];
  defensiveSubOrder: string[];
}

interface LineupSlot {
  battingOrder: number;            // 1-9
  playerId: string;
  fieldingPosition: Position;
}

interface DepthChart {
  C: string[];
  '1B': string[];
  '2B': string[];
  SS: string[];
  '3B': string[];
  LF: string[];
  CF: string[];
  RF: string[];
  DH: string[];
  SP: string[];
  RP: string[];
  CP: string[];
}
```

### 7.4 Roster Validation Rules

```typescript
const ROSTER_RULES = {
  mlbRosterSize: 22,               // Fixed at 22 for v1
  farmRosterMax: 10,

  positionMinimums: {
    C: 2, '1B': 1, '2B': 1, SS: 1, '3B': 1,
    LF: 1, CF: 1, RF: 1, SP: 4, RP: 3,
  },

  lineupRequirements: {
    uniquePositions: true,         // No duplicate fielding positions in lineup
    pitcherBatsNinth: true,        // Unless DH rule is active
    validPositionForPlayer: true,  // Player must play a position they're capable of
  },
};
```

Validation warnings (non-blocking) appear if a roster doesn't meet minimums. The user can proceed anyway — KBL doesn't force compliance at League Builder level, only warns.

---

## 8. Draft Module

### 8.1 Purpose

Two draft types operate in Mode 1:

1. **Fantasy Draft** — optional alternative to using existing rosters. Snake draft to build MLB rosters from scratch.
2. **Startup Prospect Draft** — populates farm rosters before Season 1. Final step of the creation wizard.

The annual draft (each offseason) reuses the prospect generation and scouting systems defined here. See MODE_3_OFFSEASON_WORKSHOP.md §Phase 7.

### 8.2 Fantasy Draft Configuration

```typescript
interface DraftConfig {
  leagueId: string;

  // Player Pool Source
  playerPoolSource:
    | { type: 'league'; leagueId: string }
    | { type: 'all' }
    | { type: 'generated'; config: GeneratePlayersConfig };

  // Draft Format
  format: 'snake' | 'straight' | 'auction';
  rounds: number;                    // Default: 22 (full MLB roster)
  timePerPick: number;               // Seconds (0 = unlimited)

  // Team Order
  draftOrder: string[];              // Team IDs in pick order

  // User Control
  userControlledTeams: string[];     // Which teams user drafts for

  // AI Settings
  aiDraftStrategy: 'best_available' | 'position_need' | 'balanced';
}
```

### 8.3 Startup Prospect Draft

Runs at the end of the franchise creation wizard (§11, Step 5B). Populates farm rosters so teams begin with realistic prospect pipelines.

**Format:**
- Snake draft (mirrors annual draft format)
- Order: Reverse of user-assigned team quality/standings — weaker teams draft first
- Rounds: Configurable (default: 5 per team)
- Pool size: 3× total picks (ensures meaningful choice)

**User control:**
- User drafts for all human-controlled teams
- AI auto-drafts for AI teams using `best_available` strategy
- Scouts are applied — prospects have scouted grades, not true grades

**Skip option:** If skipped, all farm rosters begin empty. First annual draft (end of Season 1) is the first chance to populate farms.

### 8.4 Prospect Pool Generation

```typescript
function generateStartupProspectPool(
  numTeams: number,
  roundsPerTeam: number
): FarmProspect[] {
  const totalPicks = numTeams * roundsPerTeam;
  const poolSize = totalPicks * 3;

  return generateDraftClass({
    size: poolSize,
    gradeDistribution: 'bell_curve',      // Centered B/B-/C+
    positionDistribution: 'balanced',
    chemistryDistribution: 'even_5',      // ~20% each chemistry type
    ageRange: { min: 18, max: 23 },
    includeInactivePlayers: false,
  });
}
```

### 8.5 Draft Class Grade Distribution

Used for both startup and annual draft classes:

| Grade | % | Notes |
|-------|---|-------|
| A+ | 0% | Never in draft |
| A | 2% | Generational talent |
| A- | 5% | Elite prospect |
| B+ | 10% | Very good |
| B | 15% | Good |
| B- | 15% | Average |
| C+ | 15% | Below average |
| C | 18% | Filler/depth |
| C- | 12% | Long shot |
| D+ | 0% | Not drafted |
| D | 8% | Organizational |
| D- | 0% | Not drafted |

**Round-weighted generation** — earlier rounds produce better prospects:

| Round | B chance | B- | C+ | C | C- |
|-------|----------|----|----|---|----|
| 1 | 25% | 35% | 25% | 10% | 5% |
| 2-3 | 10% | 20% | 35% | 25% | 10% |
| 4+ | 5% | 15% | 30% | 30% | 20% |

### 8.6 Scout Accuracy System

Prospects have hidden true ratings. The user sees only scouted grades with position-based accuracy deviation.

**Accuracy by position:**

| Position | Accuracy | σ | Typical Deviation |
|----------|----------|---|-------------------|
| DH | 85 | 0.68 | Almost always ±1 step |
| 1B | 80 | 0.91 | Usually ±1, rare ±2 |
| SP, 3B | 75 | 1.14 | ±1-2 common |
| C, 2B, LF, RF | 70 | 1.36 | ±1-2 common, occasional ±3 |
| SS, CF, RP | 65 | 1.59 | Often ±2, ±3 possible |
| CP | 60 | 1.82 | Widest spread, ±4 possible |

**Deviation formula:**

```typescript
function generateScoutedGrade(trueGrade: Grade, position: string): Grade {
  const accuracy = SCOUT_ACCURACY_BY_POSITION[position] || 70;
  const sigma = (100 - accuracy) / 22;

  // Box-Muller normal sample
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Scale, round, and hard-cap at ±4 steps
  const deviation = Math.max(-4, Math.min(4, Math.round(z * sigma)));

  return adjustGradeBySteps(trueGrade, deviation);
}
```

σ is derived from `(100 - accuracy) / 22`. The ±4 hard cap prevents impossible grades (a D prospect cannot appear as A+).

### 8.7 Prospect Salary

Rookie salary assigned at draft time per SALARY_SYSTEM_SPEC round-based salary table. The startup draft uses the same table as annual drafts.

### 8.8 Flow Position in Franchise Creation

```
Step 1: Select League
Step 2: Season Settings
Step 3: Playoff Settings
Step 4: Team Control & Franchise Type
Step 5A: Roster Mode (existing rosters OR fantasy draft)
Step 5B: Startup Prospect Draft (if not skipped)
Step 6: Confirm & Start Franchise
```

---

## 9. Rules Configuration

### 9.1 Purpose

Create and manage rules presets that define gameplay, season, and economic settings. Presets are stored in the League Builder and copied into franchises at creation.

### 9.2 Rules Preset Structure

```typescript
interface RulesPreset {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isEditable: boolean;          // Built-in presets are read-only

  // ═══════════════════════════════════════════════════════
  // GAME SETTINGS
  // ═══════════════════════════════════════════════════════
  game: {
    inningsPerGame: 6 | 7 | 9;
    extraInningsRule: 'standard' | 'runner_on_second' | 'sudden_death';
    mercyRule: {
      enabled: boolean;
      runDifferential: number;
      afterInning: number;
    };
    pitchCounts: {
      enabled: boolean;
      starterLimit: number;
      relieverLimit: number;
    };
    moundVisits: {
      enabled: boolean;
      perGame: number;
    };
  };

  // ═══════════════════════════════════════════════════════
  // SEASON SETTINGS
  // Per C-071: gamesPerTeam includes 16 and 128 presets
  // ═══════════════════════════════════════════════════════
  season: {
    gamesPerTeam: number;       // 16 | 32 | 40 | 80 | 128 | 162 | custom
    scheduleType: 'balanced' | 'division_heavy' | 'rivalry_focused';
    allStarGame: boolean;
    allStarTiming: number;      // Percentage of season (0.6 = 60%)
    tradeDeadline: {
      enabled: boolean;
      timing: number;           // Percentage of season (0.7 = 70%)
    };
  };

  // ═══════════════════════════════════════════════════════
  // PLAYOFF SETTINGS
  // ═══════════════════════════════════════════════════════
  playoffs: {
    teamsQualify: 4 | 6 | 8 | 10 | 12;
    format: 'bracket' | 'pool' | 'best_record_bye';
    wildcardSeries: { games: 1 | 3; homeGames: number };
    divisionSeries: { games: 3 | 5; homeGames: number };
    championshipSeries: { games: 5 | 7; homeGames: number };
    worldSeries: { games: 5 | 7; homeGames: number };
    homeFieldAdvantage: '2-3-2' | '2-2-1' | 'alternating';
    tiebreakers: ('head_to_head' | 'division_record' | 'run_differential')[];
  };

  // ═══════════════════════════════════════════════════════
  // DESIGNATED HITTER
  // ═══════════════════════════════════════════════════════
  dh: {
    rule: 'always' | 'never' | 'league_specific';
    leagueSettings?: { [conferenceId: string]: boolean };
  };

  // ═══════════════════════════════════════════════════════
  // ROSTER RULES
  // ═══════════════════════════════════════════════════════
  roster: {
    mlbRosterSize: number;          // Default: 22
    farmRosterSize: number;         // Default: 10
    minorsCallUpLimit: number;      // Per season
    optionsRemaining: boolean;      // Track minor league options
  };

  // ═══════════════════════════════════════════════════════
  // ECONOMICS
  // Per C-051: No salary cap in v1
  // Per C-072: No contraction toggle
  // ═══════════════════════════════════════════════════════
  economics: {
    luxuryTax: {
      enabled: boolean;
      threshold: number;
      penaltyRate: number;          // e.g., 0.20 = 20%
    };
    salaryFloor: {
      enabled: boolean;
      amount: number;
    };
    revenueSharing: boolean;
    // NOTE: salaryCap removed from v1 per C-051
    // NOTE: expansionContractionEnabled removed per C-072
  };

  // ═══════════════════════════════════════════════════════
  // DEVELOPMENT (Sliders 0-100)
  // ═══════════════════════════════════════════════════════
  development: {
    prospectDevelopmentSpeed: number;
    regressionAge: number;
    peakYearsLength: number;
    injuryFrequency: number;
    injuryRecoverySpeed: number;
    bustRate: number;
    breakoutRate: number;
  };

  // ═══════════════════════════════════════════════════════
  // NARRATIVE (Toggle + Sliders)
  // ═══════════════════════════════════════════════════════
  narrative: {
    enabled: boolean;
    randomEventFrequency: number;
    chemistryImpact: number;
    personalityEffects: number;
    mediaStoriesEnabled: boolean;
    rivalryIntensity: number;
    clutchMomentFrequency: number;
  };

  // ═══════════════════════════════════════════════════════
  // STATS & CALCULATIONS
  // Per C-075: warCalculationWeights REMOVED
  // ═══════════════════════════════════════════════════════
  stats: {
    // NOTE: warCalculationWeights removed per C-075.
    // WAR components (bWAR, rWAR, fWAR, pWAR) sum equally. Not configurable.
    clutchMultiplier: number;
    mojoVolatility: number;
    streakSensitivity: number;
    homeFieldAdvantage: number;
  };

  // ═══════════════════════════════════════════════════════
  // AI BEHAVIOR (Sliders)
  // ═══════════════════════════════════════════════════════
  ai: {
    tradeAggressiveness: number;
    tradeAcceptanceThreshold: number;
    freeAgencySpending: number;
    rebuildThreshold: number;
    prospectValuation: number;
    winNowBias: number;
    positionScarcityAwareness: number;
    salaryCapManagement: number;
  };

  // ═══════════════════════════════════════════════════════
  // OFFSEASON
  // Per C-072: expansionContractionEnabled removed
  // ═══════════════════════════════════════════════════════
  offseason: {
    draftEnabled: boolean;
    draftRounds: number;
    draftOrder: 'inverse_standings' | 'lottery' | 'snake';
    freeAgencyEnabled: boolean;
    freeAgencyDuration: number;
    arbitrationEnabled: boolean;
    contractMaxYears: number;
    ratingsAdjustmentEnabled: boolean;
    retirementEnabled: boolean;
    expansionEnabled: boolean;       // Expansion only (no contraction in v1)
  };
}
```

### 9.3 Default Presets

Four built-in presets (read-only, can be duplicated and customized):

| Preset | Games | Innings | Playoffs | Key Features |
|--------|-------|---------|----------|-------------|
| **Standard Season** | 32 | 7 | 4 teams, bracket | Default for most users |
| **Quick Play** | 16 | 6 | 4 teams, bracket | Fast development, abbreviated |
| **Full Simulation** | 162 | 9 | 12 teams, bracket | Realistic MLB-style |
| **Arcade Mode** | 32 | 7 | 4 teams | High scoring, volatile mojo, frequent events |

**Standard Season preset values (reference):**

```typescript
const STANDARD_PRESET: Partial<RulesPreset> = {
  game: {
    inningsPerGame: 7,
    extraInningsRule: 'standard',
    mercyRule: { enabled: true, runDifferential: 10, afterInning: 5 },
    pitchCounts: { enabled: false, starterLimit: 100, relieverLimit: 40 },
    moundVisits: { enabled: false, perGame: 5 },
  },
  season: {
    gamesPerTeam: 32,
    scheduleType: 'balanced',
    allStarGame: true,
    allStarTiming: 0.6,
    tradeDeadline: { enabled: true, timing: 0.7 },
  },
  playoffs: {
    teamsQualify: 4,
    format: 'bracket',
    wildcardSeries: { games: 1, homeGames: 1 },
    divisionSeries: { games: 3, homeGames: 2 },
    championshipSeries: { games: 5, homeGames: 3 },
    worldSeries: { games: 7, homeGames: 4 },
    homeFieldAdvantage: '2-3-2',
    tiebreakers: ['head_to_head', 'division_record', 'run_differential'],
  },
  development: {
    prospectDevelopmentSpeed: 50,
    regressionAge: 32,
    peakYearsLength: 5,
    injuryFrequency: 50,
    injuryRecoverySpeed: 50,
    bustRate: 30,
    breakoutRate: 10,
  },
  offseason: {
    draftEnabled: true,
    draftRounds: 5,
    draftOrder: 'inverse_standings',
    freeAgencyEnabled: true,
    freeAgencyDuration: 30,
    arbitrationEnabled: false,
    contractMaxYears: 5,
    ratingsAdjustmentEnabled: true,
    retirementEnabled: true,
    expansionEnabled: false,
  },
};
```

---

## 10. Schedule Setup

### 10.1 Schedule Model (Per C-079)

KBL generates a schedule at franchise creation. The schedule is **pre-generated and user-editable**.

```typescript
interface ScheduleConfig {
  gamesPerTeam: number;            // From rules preset
  scheduleType: 'balanced' | 'division_heavy' | 'rivalry_focused';
  numTeams: number;
  conferences: Conference[];
  divisions: Division[];
}

interface ScheduledGame {
  id: string;
  gameNumber: number;              // Sequential within schedule
  homeTeamId: string;
  awayTeamId: string;
  fictionalDate: FictionalDate;    // "April 3, Year 1"
  status: 'scheduled' | 'completed' | 'skipped';
  seriesId?: string;               // Auto-grouped into series
}
```

### 10.2 Schedule Types

**Balanced:** Equal games vs all opponents. Clean round-robin approach.

**Division Heavy:** Extra games against division rivals (e.g., 60% intra-division, 40% inter-division). Creates natural rivalries.

**Rivalry Focused:** User-defined rivalry pairs get additional matchups.

### 10.3 Fictional Date System

KBL uses fictional dates, not tied to real-world calendar:
- Season 1 starts "April 1, Year 1"
- Each game advances ~2 days (adjusted for season length to fit April → September)
- Offseason: October → March
- All-Star break and trade deadline placed at configured percentages

### 10.4 User Editing

After generation, users can:
- Swap home/away for any game
- Move games to different dates
- Add/remove games (with validation warning if total changes)
- The schedule view in Mode 2 shows the same data with game results filled in

### 10.5 Franchise Type Impact on Schedule

**Solo/Custom:** Schedule shows all league games. Human team's games are primary. AI-vs-AI games shown in secondary section for optional score entry.

**Couch Co-Op:** Full league schedule. "Next unplayed game" highlights any team's next game.

See §2.2 and MODE_2_FRANCHISE_SEASON.md §Schedule for in-season schedule behavior.

---

## 11. Franchise Creation Wizard

### 11.1 Overview

The wizard is a 6-step flow triggered by "New Franchise" from the main menu. Each step captures configuration that feeds into franchise initialization (§12).

```
Step 1    Step 2    Step 3    Step 4    Step 5    Step 6
[●]───────[○]───────[○]───────[○]───────[○]───────[○]
League    Season    Playoffs   Type &    Rosters   Confirm
                              Teams     & Draft
```

### 11.2 Step 1: Select League

Choose which league template to use as the franchise foundation.

**Data captured:**
```typescript
interface Step1Data {
  selectedLeagueId: string;
  leagueName: string;
  teamCount: number;
  defaultRulesPreset: string;
}
```

Options: select from existing league templates, or jump to League Builder to create a new one. If only one league exists, it's pre-selected.

### 11.3 Step 2: Season Settings

Configure regular season parameters. Starts with the selected league's default rules preset.

**Data captured:**
```typescript
interface Step2Data {
  gamesPerTeam: number;           // 16 | 32 | 40 | 80 | 128 | 162 | custom (C-071)
  inningsPerGame: 6 | 7 | 9;
  extraInningsRule: 'standard' | 'runner_on_second' | 'sudden_death';
  scheduleType: 'balanced' | 'division_heavy' | 'rivalry_focused';
  allStarGame: boolean;
  tradeDeadline: boolean;
  mercyRule: boolean;
}
```

Quick presets available: Standard, Quick Play, Full Season, Custom.

### 11.4 Step 3: Playoff Settings

**Data captured:**
```typescript
interface Step3Data {
  playoffTeams: 4 | 6 | 8 | 10 | 12;
  playoffFormat: 'bracket' | 'pool' | 'best_record_bye';
  wildcardGames: 1 | 3;
  divisionSeriesGames: 3 | 5;
  championshipSeriesGames: 5 | 7;
  worldSeriesGames: 5 | 7;
  homeFieldAdvantage: '2-3-2' | '2-2-1' | 'alternating';
}
```

### 11.5 Step 4: Franchise Type & Team Control

This step combines franchise type selection (§2) with team control assignment.

**Flow:**
1. Select franchise type: Solo / Couch Co-Op / Custom
2. Based on type:
   - **Solo:** Select 1 team as human. Rest become AI.
   - **Couch Co-Op:** All teams are human. No selection needed.
   - **Custom:** Select 2+ teams as human. Optionally assign teams to players for multiplayer.
3. Configure AI score entry toggle (Solo/Custom only)
4. Review offseason phase scopes (advanced — defaults from §2.5)

**Data captured:**
```typescript
interface Step4Data {
  franchiseType: 'solo' | 'couch-coop' | 'custom';
  humanTeamIds: string[];
  aiTeamIds: string[];
  aiScoreEntry: boolean;
  isMultiplayer: boolean;
  playerAssignments?: Record<number, string>;  // Player 1 → teamId
  offseasonPhaseScopes: OffseasonPhaseConfig[];
}
```

**Validation:**
- At least 1 team must be human-controlled
- Solo must have exactly 1 human team
- Couch Co-Op must have all teams human
- Custom must have 2+ human teams

### 11.6 Step 5: Rosters & Draft

Two sub-steps:

**5A: Roster Mode**
- Use existing rosters from League Builder, OR
- Run fantasy draft to build rosters from scratch

**5B: Startup Prospect Draft** (after 5A)
- Run startup prospect draft to populate farm rosters (§8.3), OR
- Skip — farms start empty

**Data captured:**
```typescript
interface Step5Data {
  rosterMode: 'existing' | 'draft';
  draftConfig?: DraftConfig;       // If fantasy draft chosen
  startupDraft: boolean;           // Run startup prospect draft?
  startupDraftRounds?: number;     // Default: 5
}
```

### 11.7 Step 6: Confirm & Start

Review all settings, name the franchise, and start.

**Data captured:**
```typescript
interface Step6Data {
  franchiseName: string;
  confirmed: boolean;
}
```

**On confirm → triggers franchise initialization (§12).**

### 11.8 Playoff Mode (Abbreviated Flow)

When user selects "Playoff Mode" instead of "New Franchise":

| Step | Name | Description |
|------|------|-------------|
| 1 | Select League | Same as New Franchise |
| 2 | Playoff Settings | Same as Step 3 |
| 3 | Team Control | Same as Step 4 (type defaults to Couch Co-Op) |
| 4 | Seeding | Drag teams to set bracket order, or auto-seed |
| 5 | Confirm | Name and start playoffs immediately |

No season settings, no roster mode, no startup draft. Teams use current League Builder rosters.

### 11.9 Navigation Rules

- **Back:** Always available (except Step 1)
- **Next:** Only enabled when current step validates
- **Cancel:** Prompts "Are you sure?" confirmation
- **Jump to step:** Can jump back to completed steps, cannot skip ahead

---

## 12. Franchise Handoff & Initialization

### 12.1 What Happens on "Start Franchise"

Per C-076: The handoff from Mode 1 to Mode 2 must be a **copy, not a reference.** Changes to League Builder templates after franchise creation do NOT propagate to active franchises.

**Initialization sequence:**

```typescript
async function initializeFranchise(setup: FranchiseSetupData): Promise<FranchiseId> {
  // 1. Create franchise save slot (new IndexedDB instance)
  const franchiseId = generateFranchiseId();
  const db = await createFranchiseDB(franchiseId);

  // 2. Copy league structure (conferences, divisions, teams)
  const league = await copyLeagueTemplate(setup.leagueId);
  await db.put('league', league);

  // 3. Copy team data with controlledBy flags
  const teams = await copyTeamsWithFlags(league.teamIds, setup.step4Data);
  await db.putAll('teams', teams);

  // 4. Copy rosters (or redirect to draft if selected)
  if (setup.rosterMode === 'existing') {
    await copyRosters(db, league.teamIds);
  }
  // If 'draft', fantasy draft runs before this point

  // 5. Copy rules preset (snapshot — not a reference)
  const rules = await copyRulesPreset(setup.rulesPresetId);
  await db.put('rules', rules);

  // 6. Initialize salary ledger (per C-076)
  await initializeSalaryLedger(db, teams);

  // 7. Initialize empty standings tables (per C-076)
  await initializeStandings(db, league);

  // 8. Generate schedule
  const schedule = generateSchedule({
    gamesPerTeam: rules.season.gamesPerTeam,
    scheduleType: rules.season.scheduleType,
    teams,
    conferences: league.conferences,
    divisions: league.divisions,
  });
  await db.putAll('schedule', schedule);

  // 9. Initialize empty stats stores
  await initializeStatsStores(db);

  // 10. Initialize franchise metadata
  await db.put('metadata', {
    franchiseId,
    name: setup.franchiseName,
    franchiseType: setup.step4Data.franchiseType,
    humanTeamIds: setup.step4Data.humanTeamIds,
    aiScoreEntry: setup.step4Data.aiScoreEntry,
    offseasonPhaseScopes: setup.step4Data.offseasonPhaseScopes,
    currentSeason: 1,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    schemaVersion: 1,
  });

  // 11. Set as active franchise
  await setActiveFranchise(franchiseId);

  return franchiseId;
}
```

### 12.2 Mode Transition Screen (Per C-077)

After initialization completes, a transition screen appears before entering Mode 2:

```
╔══════════════════════════════════════════════════════════════╗
║                   FRANCHISE CREATED!                        ║
║                                                              ║
║  "Dynasty League — Season 1"                                ║
║                                                              ║
║  16 teams • 32 games • 7 innings                            ║
║  Your team: San Francisco Giants                            ║
║                                                              ║
║  Season starts April 1, Year 1                              ║
║  First game: Giants vs Dodgers                              ║
║                                                              ║
║                    [▶ BEGIN SEASON]                          ║
╚══════════════════════════════════════════════════════════════╝
```

This screen serves as the boundary between Mode 1 and Mode 2. Clicking "Begin Season" navigates to the Mode 2 dashboard.

### 12.3 Subsystem Initialization Detail

**Salary ledger (C-076):**
- Every player gets their initial salary recorded
- Team payroll totals calculated
- Luxury tax / salary floor status computed
- Free agent pool initialized (players without teams)

**Standings tables (C-076):**
- One row per team: W, L, PCT, GB, RS, RA, DIFF, streak, L10
- Conference standings if conferences exist
- Division standings if divisions exist
- All zeros at initialization

**Stats stores:**
- Empty season batting stats table
- Empty season pitching stats table
- Empty season fielding stats table
- Empty event log
- Career stats initialized from import data (if any)

**franchiseId (C-076):**
- Every data record within the franchise includes `franchiseId` as a foreign key
- Prevents data bleed between franchises

---

## 13. Data Architecture

### 13.1 Global vs Franchise Data

```
┌──────────────────────────────────────────────────────────────┐
│                     GLOBAL DATA (League Builder)              │
│  Shared across all franchises, persists in kbl-app-meta DB   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Players ──N:1── Teams ──N:M── Leagues ──1:N── Rules Presets │
│     │              │              │                           │
│     └── Rosters    │              │                           │
│         (per-team) │              │                           │
│                    │              │                           │
└────────────────────┼──────────────┼───────────────────────────┘
                     │              │
                     │  "Start Franchise" (COPY, not reference)
                     ▼              ▼
┌──────────────────────────────────────────────────────────────┐
│              FRANCHISE INSTANCE (per C-076)                   │
│  Isolated IndexedDB: kbl-franchise-{id}                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Franchise Metadata                                          │
│  ├── Name, type, season pointer, humanTeamIds                │
│  ├── Rules snapshot                                          │
│  └── Phase scopes                                            │
│                                                               │
│  Seasons (1, 2, 3...)                                        │
│  ├── Season Stats (batting, pitching, fielding)              │
│  ├── Event Logs (every at-bat with full context)             │
│  ├── Standings & Schedule                                    │
│  └── Playoff Results                                         │
│                                                               │
│  Career Stats (accumulated across seasons)                   │
│  ├── Player career totals                                    │
│  ├── All-time leaderboards                                   │
│  └── Hall of Fame tracking                                   │
│                                                               │
│  Teams & Rosters (with controlledBy flags)                   │
│  ├── Current rosters                                         │
│  ├── Historical rosters by season                            │
│  └── Retired numbers                                         │
│                                                               │
│  Player Data                                                 │
│  ├── Ratings & development history                           │
│  ├── Contract/salary history                                 │
│  └── Awards, designations, personality                       │
│                                                               │
│  Transaction History                                         │
│  ├── Trades, FA signings, draft picks, releases              │
│  └── Retirements                                             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 13.2 Storage Strategy: Separate IndexedDB Per Franchise

Each franchise gets its own IndexedDB instance:

```
kbl-franchise-abc123/     # "Dynasty League"
  ├── metadata
  ├── teams
  ├── players
  ├── rosters
  ├── schedule
  ├── gameHeaders
  ├── atBatEvents
  ├── seasonStats
  ├── careerStats
  ├── standings
  ├── transactions
  └── salaryLedger

kbl-franchise-def456/     # "Experimental League"
  └── (same structure)

kbl-app-meta/             # App-level data (shared)
  ├── franchiseList
  ├── leagueTemplates
  ├── teamPool
  ├── playerPool
  ├── rulesPresets
  ├── appSettings
  └── lastUsedFranchise
```

**Why separate DBs:**
- Complete data isolation — no query discipline needed
- Delete franchise = `deleteDatabase()` — clean and atomic
- Export franchise = export entire DB
- Only one franchise DB open at a time — minimal connection overhead

### 13.3 Storage Estimates

| Data Type | Per-Season Estimate | Formula |
|-----------|-------------------|---------|
| Event Log | ~18MB | (numTeams × gamesPerTeam / 2) × 35KB |
| Season Stats | ~100KB | numPlayers × 500 bytes |
| Game Headers | ~250KB | numGames × 500 bytes |
| Rosters/Teams | ~100KB | Relatively static |
| **Total/Season** | **~19MB** | |

| Seasons | Estimated Size |
|---------|----------------|
| 1 | ~19MB |
| 5 | ~95MB |
| 10 | ~190MB |
| 20 | ~380MB |

IndexedDB limits: Chrome 60% of disk (typically 50GB+), Firefox 50%, Safari 1GB default. Storage is not a concern.

### 13.4 Franchise Management

```typescript
interface FranchiseManager {
  createFranchise(name: string, settings: FranchiseSetupData): Promise<FranchiseId>;
  loadFranchise(id: FranchiseId): Promise<Franchise>;
  deleteFranchise(id: FranchiseId): Promise<void>;
  renameFranchise(id: FranchiseId, newName: string): Promise<void>;
  listFranchises(): Promise<FranchiseSummary[]>;
  exportFranchise(id: FranchiseId): Promise<Blob>;
  importFranchise(data: Blob): Promise<FranchiseId>;
  getActiveFranchise(): FranchiseId | null;
  setActiveFranchise(id: FranchiseId): Promise<void>;
}

interface FranchiseSummary {
  id: FranchiseId;
  name: string;
  franchiseType: 'solo' | 'couch-coop' | 'custom';
  createdAt: Date;
  lastPlayedAt: Date;
  currentSeason: number;
  totalSeasons: number;
  humanTeamNames: string[];
  storageUsedBytes: number;
}
```

### 13.5 App Startup Flow

```
App Start
    │
    ▼
Load kbl-app-meta DB
    │
    ▼
Get Last Used Franchise
    │
    ├── Found → Load Franchise DB
    │              │
    │              ▼
    │           Run Data Integrity Check
    │              │
    │              ▼
    │           Navigate to Mode 2 Dashboard
    │
    └── Not Found → Show Franchise Selector
                         │
                         ├── Select existing franchise
                         ├── New Franchise → Mode 1 Wizard (§11)
                         └── Import Franchise
```

### 13.6 Franchise Switching

1. Close current franchise DB connection
2. Clear in-memory state (React state reset)
3. Open new franchise DB
4. Run integrity check
5. Load initial state → Mode 2 Dashboard

### 13.7 Legacy Data Migration

For users with existing data (pre-franchise mode):
1. On first launch, detect legacy data
2. Create "Default Franchise" and migrate all data
3. Show migration complete message
4. Continue normally with franchise mode

---

## 14. V2 Material (Explicitly Out of Scope)

These features are referenced in source specs but are NOT part of v1:

| Feature | Status | Notes |
|---------|--------|-------|
| Salary cap (hard/soft) | Removed from v1 (C-051) | Soft pressure via fan morale only |
| Contraction | Removed from v1 (C-041/C-072) | Expansion only in v1 |
| Cloud sync / accounts | Future | Would need account system |
| Franchise templates | Future | Pre-configured leagues (MLB, etc.) |
| Archive vs Delete franchise | Future | Read-only archive option |
| Revenue sharing | Future | Economics system |
| Arbitration | Future | Offseason economics |
| Multiplayer turn management | V2 | Couch Co-Op handles coordination via SMB4 game order |

---

## 15. Cross-References

| Document | Relationship |
|----------|-------------|
| **SPINE_ARCHITECTURE.md** | Shared data contracts (Player, Team, Event, etc.) referenced by all gospels |
| **MODE_2_FRANCHISE_SEASON.md** | What Mode 1 hands off to. GameTracker, stats, narrative, schedule view |
| **MODE_3_OFFSEASON_WORKSHOP.md** | Reuses prospect generation (§8) and scouting (§8.6) for annual draft. Phase scopes from §2.5 |
| **ALMANAC.md** | Read-only consumer of all data produced by Modes 1-3 |

### Source Specs Consumed

This gospel supersedes the following specs for Mode 1 purposes:

| Spec | What Was Consumed | Remaining Valid Content |
|------|------------------|----------------------|
| LEAGUE_BUILDER_SPEC.md | Entire spec | None — fully consumed |
| LEAGUE_BUILDER_FIGMA_SPEC.md | UI wireframes | None — fully consumed |
| SEASON_SETUP_SPEC.md | Wizard flow, data models | Playoff Mode flow (§11.8) |
| SEASON_SETUP_FIGMA_SPEC.md | Wizard UI | None — fully consumed |
| GRADE_ALGORITHM_SPEC.md | Grade formula, thresholds, verification | None — fully consumed |
| PROSPECT_GENERATION_SPEC.md | Grade distribution, position weights, pool generation | Annual draft class (shared w/ Mode 3) |
| SCOUTING_SYSTEM_SPEC.md | Accuracy by position, deviation formula, visibility rules | Annual draft scouting (shared w/ Mode 3) |
| PERSONALITY_SYSTEM_SPEC.md | 7 types, 4 modifiers, generation, bias table | Behavioral effects (Mode 2), FA destinations (Mode 3) |
| TRAIT_INTEGRATION_SPEC.md | Initial distribution, eligibility rules, chemistry mapping | Potency effects (Mode 2), EOS assignment (Mode 3) |
| FRANCHISE_MODE_SPEC.md | Save slot creation, DB architecture, franchise management | Active franchise (Mode 2), season archive (Mode 3), cross-season (Almanac) |
| SCHEDULE_SYSTEM_FIGMA_SPEC.md | Schedule setup/generation | In-season schedule view (Mode 2) |
| SMB4_GAME_REFERENCE.md | Import mapping reference | None — fully consumed |
| smb4_traits_reference.md | Trait definitions for import | Trait-chemistry mapping (Mode 2) |

---

## 16. Decision Traceability

Every STEP4 decision applied in this gospel:

| ID | Decision | Section |
|----|----------|---------|
| C-070 | Fix personality to 7 types (not 12) | §5.4, §6.2 |
| C-071 | Add 16 + 128 game count presets | §9.2, §11.3 |
| C-072 | Remove contraction toggle from rules | §9.2 |
| C-073 | Add Mode 1 role description | §1.1 |
| C-074 | 13-grade scale authoritative | §5.4, §5.7 |
| C-075 | Remove WAR configurable weights | §9.2 |
| C-076 | Add missing handoff steps (salary init, standings, franchiseId, copy-not-reference) | §12.1, §12.3 |
| C-077 | Mode Transition screen | §12.2 |
| C-078 | Fame slider → FameLevel dropdown | §5.4, §5.9 |
| C-087 | 13-grade scale (duplicate confirmation of C-074) | §5.7 |
| C-045 | Spine = standalone 5th document | §1.1 |
| C-054 | Traits visible on farm, ratings hidden until call-up | §6.5 |

---

## Changelog

- v1.0 (2026-02-22): Initial gospel draft. Consolidates 13 source specs + 10 STEP4 decisions + Franchise Type Design Note.

---

*This is a GOSPEL document. It is the single source of truth for Mode 1 (League Builder). If any source spec contradicts this document, this document wins. Source specs should be considered superseded for Mode 1 purposes.*
