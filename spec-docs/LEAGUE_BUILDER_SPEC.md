# League Builder Specification

> **Purpose**: Central hub for customizing players, teams, leagues, and game rules before starting a franchise
> **Created**: January 29, 2026
> **Status**: DRAFT
> **Related**: SEASON_SETUP_SPEC.md, FRANCHISE_MODE_SPEC.md, GRADE_ALGORITHM_SPEC.md

---

## 1. Overview

The League Builder is a **pre-franchise customization hub** where users configure all game elements before starting a season. It exists outside of any active franchise and provides templates that can be used when creating new franchises.

### 1.1 Key Principles

1. **Teams are reusable** - A team can exist in multiple leagues simultaneously
2. **Players are global** - One player database shared across all leagues
3. **Leagues are templates** - Configurations that can be instantiated into franchises
4. **Non-destructive** - Changes in League Builder don't affect active franchises

### 1.2 Entry Points

- Main Menu → "League Builder" button
- Pre-game setup before any franchise/season

---

## 2. Module Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LEAGUE BUILDER                                │
│                     [← Back]  LEAGUE BUILDER                         │
├────────────────────────┬────────────────────────────────────────────┤
│  ┌──────────────────┐  │  ┌──────────────────┐                      │
│  │     LEAGUES      │  │  │      TEAMS       │                      │
│  │ VIEW•CREATE•EDIT │  │  │  CREATE•ASSIGN   │                      │
│  └──────────────────┘  │  └──────────────────┘                      │
├────────────────────────┼────────────────────────────────────────────┤
│  ┌──────────────────┐  │  ┌──────────────────┐                      │
│  │     PLAYERS      │  │  │     ROSTERS      │                      │
│  │  CREATE•STATS    │  │  │ ASSIGN•DEPTH CHART│                     │
│  └──────────────────┘  │  └──────────────────┘                      │
├────────────────────────┼────────────────────────────────────────────┤
│  ┌──────────────────┐  │  ┌──────────────────┐                      │
│  │      DRAFT       │  │  │      RULES       │                      │
│  │FANTASY SNAKE DRAFT│ │  │  LEAGUE SETTINGS │                      │
│  └──────────────────┘  │  └──────────────────┘                      │
├─────────────────────────────────────────────────────────────────────┤
│  ▶ CURRENT LEAGUES                                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ KRUSE BASEBALL LEAGUE                              16 TEAMS │ ▶  │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ SUMMER LEAGUE                                       8 TEAMS │ ▶  │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ CHAMPIONSHIP SERIES                                 4 TEAMS │ ▶  │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. LEAGUES Module

### 3.1 Purpose

Create and manage league templates that define team groupings, conference/division structure, and default rules.

### 3.2 Features

| Function | Description |
|----------|-------------|
| **View** | Browse existing league templates |
| **Create** | New league with name, team selection, structure |
| **Edit** | Modify existing league configuration |
| **Delete** | Remove league template (doesn't affect active franchises) |
| **Duplicate** | Copy league as starting point for new one |

### 3.3 League Configuration

```typescript
interface LeagueTemplate {
  id: string;
  name: string;
  description?: string;
  createdDate: string;
  lastModified: string;

  // Team Membership (references to global teams)
  teamIds: string[];

  // Structure
  conferences: Conference[];
  divisions: Division[];

  // Default Rules (can be overridden at franchise creation)
  defaultRulesPreset: string;  // Reference to rules preset

  // Metadata
  logoUrl?: string;
  color?: string;  // Theme color for UI
}

interface Conference {
  id: string;
  name: string;          // "American League", "National League"
  abbreviation: string;  // "AL", "NL"
  divisionIds: string[];
}

interface Division {
  id: string;
  name: string;          // "East", "West", "Central"
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

---

## 4. TEAMS Module

### 4.1 Purpose

Create, edit, and manage teams. Teams are global entities that can be assigned to multiple leagues.

### 4.2 Features

| Function | Description |
|----------|-------------|
| **Create** | New team with full customization |
| **Edit** | Modify team details |
| **Assign** | Add/remove team from leagues |
| **Import** | Upload teams via CSV |
| **Delete** | Remove team (with confirmation if in leagues) |

### 4.3 Team Data Model

```typescript
interface Team {
  id: string;
  name: string;              // "San Francisco Giants"
  abbreviation: string;      // "SFG"
  location: string;          // "San Francisco"
  nickname: string;          // "Giants"

  // Branding
  colors: {
    primary: string;         // Hex code "#FD5A1E"
    secondary: string;       // Hex code "#27251F"
    accent?: string;         // Optional third color
  };
  logoUrl?: string;          // Path to logo image

  // Venue
  stadium: string;           // "Oracle Park"
  stadiumCapacity?: number;

  // League Membership
  leagueIds: string[];       // Can be in multiple leagues

  // Metadata
  foundedYear?: number;
  championships?: number;
  retiredNumbers?: number[];

  // Timestamps
  createdDate: string;
  lastModified: string;
}
```

### 4.4 Team CSV Import

**CSV Format:**
```csv
name,abbreviation,location,nickname,primaryColor,secondaryColor,accentColor,logoUrl,stadium
San Francisco Giants,SFG,San Francisco,Giants,#FD5A1E,#27251F,#FFFFFF,/logos/sfg.png,Oracle Park
New York Yankees,NYY,New York,Yankees,#003087,#E4002C,,/logos/nyy.png,Yankee Stadium
```

**Import Flow:**
1. Upload CSV file
2. Preview parsed data
3. Validate (check for duplicates, required fields)
4. Confirm import
5. Teams added to global pool

---

## 5. PLAYERS Module

### 5.1 Purpose

Create, edit, and manage the global player database. All players exist in one pool and are assigned to teams via the Rosters module.

### 5.2 Features

| Function | Description |
|----------|-------------|
| **Create** | New player with full attribute editor |
| **Edit** | Modify any player attribute |
| **Stats** | View/edit career statistics |
| **Generate** | Create fictional players using grade algorithm |
| **Import** | Upload players via CSV |
| **Delete** | Remove player from database |

### 5.3 Complete Player Data Model

```typescript
interface Player {
  // Identity
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  gender: 'M' | 'F';

  // Physical
  age: number;
  bats: 'L' | 'R' | 'S';      // Left, Right, Switch
  throws: 'L' | 'R';

  // Position
  primaryPosition: Position;
  secondaryPosition?: Position;

  // POSITION PLAYER RATINGS (0-99)
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;

  // PITCHER RATINGS (0-99)
  velocity: number;
  junk: number;
  accuracy: number;

  // PITCHER ARSENAL
  arsenal: PitchType[];  // ['4F', '2F', 'CB', 'SL', 'CH']

  // GRADE (calculated from weighted ratings)
  overallGrade: Grade;  // 'S' | 'A+' | 'A' | ... | 'D-'

  // TRAITS (up to 2)
  trait1?: Trait;
  trait2?: Trait;

  // PERSONALITY & CHEMISTRY
  personality: Personality;
  chemistry: Chemistry;

  // STATUS
  morale: number;       // 0-100
  mojo: MojoState;      // 'On Fire' | 'Hot' | 'Normal' | 'Cold' | 'Ice Cold'
  fame: number;         // -10 to +10

  // CONTRACT
  salary: number;       // In millions
  contractYears?: number;

  // TEAM ASSIGNMENT
  currentTeamId: string | null;  // null = free agent
  rosterStatus: 'MLB' | 'FARM' | 'FREE_AGENT';

  // METADATA
  createdDate: string;
  lastModified: string;
  isCustom: boolean;    // User-created vs imported
  sourceDatabase?: string;  // "SMB4", "Custom", etc.
}

type Position = 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF' | 'DH' |
                'SP' | 'RP' | 'CP' | 'SP/RP' | 'TWO-WAY';

type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-';

type PitchType = '4F' | '2F' | 'CB' | 'SL' | 'CH' | 'FK' | 'CF' | 'SB' | 'SC' | 'KN';

type Personality = 'Competitive' | 'Spirited' | 'Crafty' | 'Scholarly' |
                   'Disciplined' | 'Tough' | 'Relaxed' | 'Egotistical' |
                   'Jolly' | 'Timid' | 'Droopy';

type Chemistry = 'Competitive' | 'Spirited' | 'Crafty' | 'Scholarly' | 'Disciplined';

type MojoState = 'On Fire' | 'Hot' | 'Normal' | 'Cold' | 'Ice Cold';

type Trait =
  // Positive Batting
  | 'Clutch' | 'RBI Hero' | 'Rally Starter' | 'Tough Out' | 'First Pitch Slayer'
  | 'Bad Ball Hitter' | 'Fastball Hitter' | 'Off-Speed Hitter' | 'Contact Hitter'
  | 'Bunter' | 'Big Hack' | 'Little Hack' | 'Mind Gamer' | 'Sign Stealer'
  | 'POW vs LHP' | 'POW vs RHP' | 'CON vs LHP' | 'CON vs RHP'
  | 'High Pitch' | 'Low Pitch' | 'Inside Pitch' | 'Outside Pitch'
  // Positive Fielding
  | 'Magic Hands' | 'Dive Wizard' | 'Cannon Arm' | 'Pick Officer'
  // Positive Running
  | 'Stealer' | 'Sprinter' | 'Base Rounder'
  // Positive Pitching
  | 'K Collector' | 'Gets Ahead' | 'Rally Stopper' | 'Composed'
  | 'Elite 4F' | 'Elite 2F' | 'Elite CB' | 'Elite SL' | 'Elite CH'
  | 'Elite FK' | 'Elite CF' | 'Elite SB'
  // Positive General
  | 'Utility' | 'Two Way' | 'Durable' | 'Consistent' | 'Pinch Perfect'
  | 'Stimulated' | 'Metal Head' | 'Ace Exterminator'
  // Negative Batting
  | 'Choker' | 'RBI Zero' | 'First Pitch Prayer' | 'Whiffer'
  // Negative Fielding
  | 'Butter Fingers' | 'Bad Jumps' | 'Noodle Arm' | 'Wild Thrower' | 'Easy Target'
  // Negative Running
  | 'Base Jogger' | 'Slow Poke'
  // Negative Pitching
  | 'K Neglecter' | 'Falls Behind' | 'BB Prone' | 'Wild Thing' | 'Meltdown'
  // Negative General
  | 'Volatile' | 'Injury Prone' | 'Surrounded' | 'Crossed Up';
```

### 5.4 Player Editor UI

```
┌─────────────────────────────────────────────────────────────────────┐
│  PLAYER EDITOR                                     [Save] [Cancel]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  Name: [Derek                ] [Jeter             ]│
│  │             │  Age:  [32    ]  Gender: [M ▼]                     │
│  │   [Photo]   │  Bats: [R ▼]    Throws: [R ▼]                      │
│  │             │                                                     │
│  └─────────────┘  Position: [SS ▼]  Secondary: [-- ▼]               │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  RATINGS                                   Grade: [A-] (Auto-calc)   │
│  ─────────────────────────────────────────────────────────────────  │
│  BATTING                          │  PITCHING (if applicable)        │
│  Power:    [████████░░] 72        │  Velocity: [░░░░░░░░░░] --       │
│  Contact:  [█████████░] 85        │  Junk:     [░░░░░░░░░░] --       │
│  Speed:    [███████░░░] 68        │  Accuracy: [░░░░░░░░░░] --       │
│  Fielding: [█████████░] 88        │                                  │
│  Arm:      [████████░░] 78        │  Arsenal: [N/A - Position Player]│
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  TRAITS                                                              │
│  Trait 1: [Clutch           ▼]                                       │
│  Trait 2: [--               ▼]                                       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  PERSONALITY & STATUS                                                │
│  Personality: [Competitive ▼]    Chemistry: [Competitive ▼]         │
│  Morale:      [████████░░] 75    Mojo: [Normal ▼]                   │
│  Fame:        [-2 ───●─── +2]    Salary: [$18.5  ]M                 │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  TEAM ASSIGNMENT                                                     │
│  Team: [San Francisco Giants ▼]   Status: [MLB ▼]                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.5 Fictional Player Generation

Uses `GRADE_ALGORITHM_SPEC.md` to generate players matching target grade:

```typescript
interface GeneratePlayersConfig {
  count: number;
  targetGrade: Grade;
  positionDistribution: 'balanced' | 'random' | Position;
  genderRatio: number;  // 0.25 = 25% female
  ageRange: { min: number; max: number };
  includeTraits: boolean;
  traitPool: 'positive_only' | 'neutral' | 'any';
}

// Example: Generate 10 C+ prospects for draft
generatePlayers({
  count: 10,
  targetGrade: 'C+',
  positionDistribution: 'balanced',
  genderRatio: 0.25,
  ageRange: { min: 18, max: 21 },
  includeTraits: true,
  traitPool: 'positive_only'
});
```

---

## 6. ROSTERS Module

### 6.1 Purpose

Assign players to teams and manage lineup configurations.

### 6.2 Features

| Function | Description |
|----------|-------------|
| **Assign** | Move players between teams/free agency |
| **Depth Chart** | Set batting order, fielding positions |
| **Lineup** | Configure starting lineup vs L/R pitchers |
| **Validate** | Check roster compliance (22 MLB, 10 Farm) |

### 6.3 Roster Data Model

```typescript
interface TeamRoster {
  teamId: string;

  // Player Lists
  mlbRoster: string[];   // Player IDs (max 22)
  farmRoster: string[];  // Player IDs (max 10)

  // Lineup Configuration
  lineupVsRHP: LineupSlot[];  // Batting order vs right-handed pitchers
  lineupVsLHP: LineupSlot[];  // Batting order vs left-handed pitchers

  // Pitching Rotation
  startingRotation: string[];  // SP player IDs in order
  closingPitcher: string;
  setupPitchers: string[];

  // Depth Chart
  depthChart: DepthChart;

  // Bench Preferences
  pinchHitOrder: string[];     // Preferred PH order
  pinchRunOrder: string[];     // Preferred PR order
  defensiveSubOrder: string[]; // Preferred defensive subs
}

interface LineupSlot {
  battingOrder: number;  // 1-9
  playerId: string;
  fieldingPosition: Position;
}

interface DepthChart {
  C: string[];   // Catchers in order of preference
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

### 6.4 Roster Validation Rules

```typescript
const ROSTER_RULES = {
  mlbRosterMin: 22,
  mlbRosterMax: 22,
  farmRosterMin: 0,
  farmRosterMax: 10,

  positionMinimums: {
    C: 2,
    '1B': 1,
    '2B': 1,
    SS: 1,
    '3B': 1,
    LF: 1,
    CF: 1,
    RF: 1,
    SP: 4,
    RP: 3,
  },

  lineupRequirements: {
    uniquePositions: true,  // No duplicate fielding positions
    pitcherBatsNinth: true, // Unless DH
    validPositionForPlayer: true,
  }
};
```

---

## 7. DRAFT Module

### 7.1 Purpose

Configure and run fantasy snake drafts for creating new team rosters.

### 7.2 Features

| Function | Description |
|----------|-------------|
| **Setup** | Configure draft settings |
| **Player Pool** | Select source database |
| **Run Draft** | Execute snake draft with user picks |
| **Auto-Draft** | AI picks for non-user teams |

### 7.3 Draft Configuration

```typescript
interface DraftConfig {
  // League Selection
  leagueId: string;           // Which league template to use

  // Player Pool Source
  playerPoolSource:
    | { type: 'league'; leagueId: string }  // Players from specific league
    | { type: 'all' }                        // All players in database
    | { type: 'generated'; config: GeneratePlayersConfig };  // New fictional players

  // Draft Format
  format: 'snake' | 'straight' | 'auction';
  rounds: number;
  timePerPick: number;  // Seconds (0 = unlimited)

  // Team Order
  draftOrder: string[];  // Team IDs in pick order

  // User Control
  userControlledTeams: string[];  // Which teams user drafts for

  // AI Settings
  aiDraftStrategy: 'best_available' | 'position_need' | 'balanced';
}
```

### 7.4 Integration

Links to existing `STORIES_DRAFT.md` for detailed draft flow and prospect generation.

---

## 8. RULES Module

### 8.1 Purpose

Create and manage rules presets that define gameplay, season, and simulation settings.

### 8.2 Rules Preset Structure

```typescript
interface RulesPreset {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isEditable: boolean;  // Built-in presets are read-only

  // ═══════════════════════════════════════════════════════════════
  // GAME SETTINGS
  // ═══════════════════════════════════════════════════════════════
  game: {
    inningsPerGame: 6 | 7 | 9;
    extraInningsRule: 'standard' | 'runner_on_second' | 'sudden_death';
    mercyRule: {
      enabled: boolean;
      runDifferential: number;  // e.g., 10
      afterInning: number;      // e.g., 5
    };
    pitchCounts: {
      enabled: boolean;
      starterLimit: number;     // e.g., 100
      relieverLimit: number;    // e.g., 40
    };
    moundVisits: {
      enabled: boolean;
      perGame: number;
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // SEASON SETTINGS
  // ═══════════════════════════════════════════════════════════════
  season: {
    gamesPerTeam: number;       // 32 (standard), 40, 80, 162
    scheduleType: 'balanced' | 'division_heavy' | 'rivalry_focused';
    allStarGame: boolean;
    allStarTiming: number;      // Percentage of season (0.6 = 60%)
    tradeDeadline: {
      enabled: boolean;
      timing: number;           // Percentage of season (0.7 = 70%)
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // PLAYOFF SETTINGS
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // DESIGNATED HITTER
  // ═══════════════════════════════════════════════════════════════
  dh: {
    rule: 'always' | 'never' | 'league_specific';
    leagueSettings?: {
      [leagueId: string]: boolean;  // true = uses DH
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // ROSTER RULES
  // ═══════════════════════════════════════════════════════════════
  roster: {
    mlbRosterSize: number;      // Default: 22
    farmRosterSize: number;     // Default: 10
    minorsCallUpLimit: number;  // Per season
    optionsRemaining: boolean;  // Track minor league options
  };

  // ═══════════════════════════════════════════════════════════════
  // ECONOMICS
  // ═══════════════════════════════════════════════════════════════
  economics: {
    salaryCap: {
      enabled: boolean;
      amount: number;           // In millions
      type: 'hard' | 'soft';
    };
    luxuryTax: {
      enabled: boolean;
      threshold: number;
      penaltyRate: number;      // e.g., 0.20 = 20%
    };
    salaryFloor: {
      enabled: boolean;
      amount: number;
    };
    revenueSharing: boolean;
  };

  // ═══════════════════════════════════════════════════════════════
  // DEVELOPMENT (Sliders 0-100)
  // ═══════════════════════════════════════════════════════════════
  development: {
    prospectDevelopmentSpeed: number;   // 50 = normal, 100 = fast
    regressionAge: number;              // Age when decline starts (default: 32)
    peakYearsLength: number;            // Years in prime (default: 5)
    injuryFrequency: number;            // 50 = normal, 0 = none, 100 = frequent
    injuryRecoverySpeed: number;        // 50 = normal
    bustRate: number;                   // Chance prospects fail to develop
    breakoutRate: number;               // Chance players exceed ceiling
  };

  // ═══════════════════════════════════════════════════════════════
  // NARRATIVE (Toggle + Sliders)
  // ═══════════════════════════════════════════════════════════════
  narrative: {
    enabled: boolean;
    randomEventFrequency: number;       // 50 = normal
    chemistryImpact: number;            // How much chemistry affects performance
    personalityEffects: number;         // How much personality affects events
    mediaStoriesEnabled: boolean;       // Generate news headlines
    rivalryIntensity: number;           // Impact of team rivalries
    clutchMomentFrequency: number;      // High-stakes situations
  };

  // ═══════════════════════════════════════════════════════════════
  // STATS & CALCULATIONS (Sliders)
  // ═══════════════════════════════════════════════════════════════
  stats: {
    warCalculationWeights: {
      batting: number;    // bWAR weight
      running: number;    // rWAR weight
      fielding: number;   // fWAR weight
      pitching: number;   // pWAR weight
    };
    clutchMultiplier: number;           // Impact of clutch situations
    mojoVolatility: number;             // How quickly mojo changes
    streakSensitivity: number;          // Hot/cold streak detection
    homeFieldAdvantage: number;         // Boost for home team
  };

  // ═══════════════════════════════════════════════════════════════
  // AI BEHAVIOR (Sliders)
  // ═══════════════════════════════════════════════════════════════
  ai: {
    tradeAggressiveness: number;        // How often AI proposes trades
    tradeAcceptanceThreshold: number;   // How good a deal AI needs
    freeAgencySpending: number;         // AI willingness to spend
    rebuildThreshold: number;           // When AI decides to rebuild
    prospectValuation: number;          // How much AI values prospects
    winNowBias: number;                 // AI preference for vets vs prospects
    positionScarcityAwareness: number;  // AI understanding of position value
    salaryCapManagement: number;        // AI financial planning skill
  };

  // ═══════════════════════════════════════════════════════════════
  // OFFSEASON
  // ═══════════════════════════════════════════════════════════════
  offseason: {
    draftEnabled: boolean;
    draftRounds: number;
    draftOrder: 'inverse_standings' | 'lottery' | 'snake';
    freeAgencyEnabled: boolean;
    freeAgencyDuration: number;         // Simulated days
    arbitrationEnabled: boolean;
    contractMaxYears: number;
    ratingsAdjustmentEnabled: boolean;  // End-of-season adjustments
    retirementEnabled: boolean;
    expansionContractionEnabled: boolean;
  };
}
```

### 8.3 Default Presets

```typescript
const DEFAULT_PRESETS: RulesPreset[] = [
  {
    id: 'standard',
    name: 'Standard Season',
    description: '32 games, 7 innings, 4-team playoffs',
    isDefault: true,
    isEditable: false,
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
    dh: { rule: 'league_specific' },
    roster: {
      mlbRosterSize: 22,
      farmRosterSize: 10,
      minorsCallUpLimit: 10,
      optionsRemaining: true,
    },
    economics: {
      salaryCap: { enabled: false, amount: 200, type: 'soft' },
      luxuryTax: { enabled: true, threshold: 180, penaltyRate: 0.20 },
      salaryFloor: { enabled: false, amount: 80 },
      revenueSharing: true,
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
    narrative: {
      enabled: true,
      randomEventFrequency: 50,
      chemistryImpact: 50,
      personalityEffects: 50,
      mediaStoriesEnabled: true,
      rivalryIntensity: 50,
      clutchMomentFrequency: 50,
    },
    stats: {
      warCalculationWeights: { batting: 1.0, running: 1.0, fielding: 1.0, pitching: 1.0 },
      clutchMultiplier: 50,
      mojoVolatility: 50,
      streakSensitivity: 50,
      homeFieldAdvantage: 50,
    },
    ai: {
      tradeAggressiveness: 50,
      tradeAcceptanceThreshold: 50,
      freeAgencySpending: 50,
      rebuildThreshold: 50,
      prospectValuation: 50,
      winNowBias: 50,
      positionScarcityAwareness: 50,
      salaryCapManagement: 50,
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
      expansionContractionEnabled: false,
    },
  },

  {
    id: 'quick_play',
    name: 'Quick Play',
    description: '16 games, 6 innings, 4-team playoffs, fast development',
    // ... abbreviated settings
  },

  {
    id: 'full_simulation',
    name: 'Full Simulation',
    description: '162 games, 9 innings, 12-team playoffs, all features',
    // ... full realistic settings
  },

  {
    id: 'arcade',
    name: 'Arcade Mode',
    description: 'High scoring, frequent events, volatile mojo',
    // ... fun/casual settings
  },
];
```

---

## 9. Data Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GLOBAL DATA                                   │
│  (Shared across all leagues, exists in League Builder)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐                   │
│  │ PLAYERS  │──────│  TEAMS   │──────│ LEAGUES  │                   │
│  │ Database │ N:1  │  (many)  │ N:M  │(templates)│                   │
│  └──────────┘      └──────────┘      └──────────┘                   │
│       │                 │                  │                         │
│       │                 │                  │                         │
│       ▼                 ▼                  ▼                         │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐                   │
│  │ ROSTERS  │      │  RULES   │      │ PRESETS  │                   │
│  │(per-team)│      │ (custom) │      │(built-in)│                   │
│  └──────────┘      └──────────┘      └──────────┘                   │
│                                                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ "New Franchise" / "Playoff Mode"
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FRANCHISE INSTANCE                              │
│  (Created from League Builder templates, isolated save slot)         │
├─────────────────────────────────────────────────────────────────────┤
│  - Copies team rosters at creation time                              │
│  - Copies rules preset (can be modified)                             │
│  - Accumulates seasons, stats, history                               │
│  - Changes don't affect League Builder                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Changelog

- v1.0 (2026-01-29): Initial specification
- v1.1 (2026-02-20): Added personality system integration, cross-references to new specs

### v1.1 Updates (February 2026)

**Personality Assignment at League Creation**

When the league is built (either from SMB4 import or custom), all players receive:
- 1 visible personality type (7 options, weighted distribution)
- 4 hidden modifiers (Loyalty, Ambition, Resilience, Charisma) on 0-100 scale

See PERSONALITY_SYSTEM_SPEC.md for full details.

---

## 9. Startup Prospect Draft

### 9.1 Purpose

Before Season 1 begins, farm teams start empty. The Startup Prospect Draft populates all farm rosters so that teams begin with a realistic prospect pipeline. This draft runs at the end of the League Builder flow, after rosters are finalized.

### 9.2 Draft Format

- **Format**: Snake draft (mirrors the annual in-season draft format)
- **Order**: Reverse of the user-assigned team quality/standings — weaker teams draft first
- **Rounds**: Configurable (default: 5 rounds per team; 20 teams = 100 total picks)
- **Prospect Pool**: Generated by PROSPECT_GENERATION_SPEC.md §3 (same bell curve distribution as annual drafts). Pool size = 3× the number of picks to ensure choice.
- **User Control**: User drafts for all user-controlled teams; AI auto-drafts for CPU teams

### 9.3 Scout Application

Scouts are assigned at League Builder creation (or default to balanced accuracy). Scout accuracy applies to the startup draft exactly as it does to annual drafts — prospects have hidden true ratings; the user sees only scouted grades.

### 9.4 Salary Assignment

Rookie salary is set at draft time per FARM_SYSTEM_SPEC.md §Rookie Salary Calculation (by draft round). The startup draft uses the same round-based salary table.

### 9.5 Prospect Pool Generation

```typescript
function generateStartupProspectPool(numTeams: number, roundsPerTeam: number): FarmPlayer[] {
  const totalPicks = numTeams * roundsPerTeam;
  const poolSize = totalPicks * 3;  // 3× picks ensures meaningful choice

  return PROSPECT_GENERATION_SPEC.generateDraftClass({
    size: poolSize,
    gradeDistribution: 'bell_curve',   // A through D, centered B/B-/C+
    positionDistribution: 'balanced',
    chemistryDistribution: 'even_5',   // ~20% each of 5 SMB4 chemistry types
    ageRange: { min: 18, max: 23 },
    includeInactivePlayers: false,      // Clean start — no retired/released players
  });
}
```

### 9.6 Flow Position in League Builder

The Startup Prospect Draft is the final step before "Save & Start Franchise":

```
Step 1: Configure League
Step 2: Assign Teams & Players
Step 3: Configure Rules
Step 4: Startup Prospect Draft  ← NEW
Step 5: Save & Start Franchise
```

### 9.7 Skip Option

If the user opts to skip the Startup Prospect Draft, all farm rosters begin empty. The first annual draft (end of Season 1) will be the first chance to populate farms. This is a valid choice for users who want a clean, no-farm start.

---

**Cross-References Added**

| New Spec | Relevance to League Builder |
|----------|---------------------------|
| PERSONALITY_SYSTEM_SPEC.md | Personality assignment at import |
| TRAIT_INTEGRATION_SPEC.md | Initial trait distribution (~30%/50%/20%) |
| PROSPECT_GENERATION_SPEC.md | Initial player pool from 506-player database; startup prospect pool generation |
| SEPARATED_MODES_ARCHITECTURE.md | League Builder = Mode 1 |
| FARM_SYSTEM_SPEC.md | Startup prospect draft → farm roster population |
| SCOUTING_SYSTEM_SPEC.md | Scout accuracy applies at startup draft |
