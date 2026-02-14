# Playoff System Specification

> **Related Specifications**:
> - `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` - Playoff config in Season Setup, bracket UI
> - `FRANCHISE_MODE_SPEC.md` - Season flow integration
> - `FAN_MORALE_SYSTEM_SPEC.md` - Playoff morale impacts
> - `CLUTCH_ATTRIBUTION_SPEC.md` - Playoff clutch multipliers

---

## Table of Contents

1. [Overview](#1-overview)
2. [Game Modes](#2-game-modes)
3. [Playoff Configuration](#3-playoff-configuration)
4. [Bracket System](#4-bracket-system)
5. [Series Flow](#5-series-flow)
6. [Playoff-Specific Rules](#6-playoff-specific-rules)
7. [Exhibition Mode](#7-exhibition-mode)
8. [Standalone Playoff Series](#8-standalone-playoff-series)
9. [Awards & Recognition](#9-awards--recognition)
10. [Data Structures](#10-data-structures)

---

## 1. Overview

The playoff system supports three distinct game modes:

| Mode | Description | Stats Tracked | Awards |
|------|-------------|---------------|--------|
| **Franchise** | Full season with playoffs at end | Full season + playoff stats | All awards |
| **Exhibition** | Single standalone game | Temporary (optional save) | None |
| **Playoff Series** | Standalone 3/5/7 game series | Series stats only | Series MVP |

---

## 2. Game Modes

### 2.1 Game Mode Selection (Main Menu)

```
┌─────────────────────────────────────────────────────────────────┐
│  KBL XHD TRACKER                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  GAME MODE                                                      │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🏆 FRANCHISE MODE                                         │  │
│  │    Continue Season 4 (Game 47 of 60)                      │  │
│  │    Giants vs Yankees tonight                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ⚾ EXHIBITION GAME                                        │  │
│  │    Play a one-off game (no season impact)                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🎯 PLAYOFF SERIES                                         │  │
│  │    Play a standalone best-of series                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ⚙️ NEW FRANCHISE                                          │  │
│  │    Start a fresh franchise                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Mode Differences

| Feature | Franchise | Exhibition | Playoff Series |
|---------|-----------|------------|----------------|
| Season stats | ✅ Full | ❌ None | ❌ Series only |
| Career stats | ✅ Updated | ❌ No impact | ❌ No impact |
| Fame/Clutch | ✅ Full tracking | ❌ Disabled | ✅ Series tracking |
| Awards | ✅ All | ❌ None | ✅ Series MVP only |
| Roster | From franchise | Custom teams | Custom teams |
| Save game | ✅ Auto-save | ⚠️ Optional | ✅ Series progress |

---

## 3. Playoff Configuration

### 3.1 Season Setup Options

```javascript
const PlayoffConfig = {
  // Number of teams in playoffs
  numTeams: 8,  // 4, 6, 8, 10, 12

  // Playoff format
  format: 'BRACKET',  // 'BRACKET' | 'POOL'

  // Seeding method
  seedingMethod: 'DIVISION_WINNERS_PLUS_WILDCARDS',
  // Options:
  // - 'BEST_RECORDS' - Top N records regardless of division
  // - 'DIVISION_WINNERS_PLUS_WILDCARDS' - Division winners + best remaining
  // - 'CONFERENCE_SEEDS' - Separate seeding per conference

  // Series lengths by round
  seriesLength: {
    wildCard: 3,      // Best-of-3
    divisional: 5,    // Best-of-5
    championship: 7,  // Best-of-7 (LCS)
    worldSeries: 7    // Best-of-7
  },

  // Home field advantage
  homeFieldAdvantage: 'BETTER_SEED',  // 'BETTER_SEED' | 'ALTERNATING' | 'NONE'

  // Game schedule pattern (for 7-game series)
  schedulePattern: '2-3-2',  // '2-3-2' | '2-2-1-1-1'

  // Bye rounds (for 4 or 6 team formats)
  byeRounds: 0  // 0, 1
};
```

### 3.2 Playoff Formats

**8-Team Bracket (Default):**
```
Wild Card Round (Best-of-3)
├─ (1) Division Winner A vs (4) Wild Card 2
├─ (2) Division Winner B vs (3) Wild Card 1
├─ (5) Division Winner C vs (8) Wild Card 4
└─ (6) Division Winner D vs (7) Wild Card 3

Division Series (Best-of-5)
├─ WC Winner 1 vs WC Winner 2
└─ WC Winner 3 vs WC Winner 4

Championship Series (Best-of-7)
├─ DS Winner 1 vs DS Winner 2

World Series (Best-of-7)
└─ Champion A vs Champion B
```

**6-Team Bracket (Top 2 seeds get bye):**
```
Wild Card Round (Best-of-3)
├─ (3) vs (6)
└─ (4) vs (5)

Division Series (Best-of-5)
├─ (1) vs WC Winner (lower seed)
└─ (2) vs WC Winner (higher seed)

Championship Series → World Series
```

**4-Team Bracket:**
```
Championship Series (Best-of-7)
├─ (1) vs (4)
└─ (2) vs (3)

World Series (Best-of-7)
```

---

## 4. Bracket System

### 4.1 Bracket Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEASON 4 PLAYOFFS                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WILD CARD           DIVISION SERIES      CHAMPIONSHIP      WORLD SERIES   │
│  ─────────           ───────────────      ────────────      ────────────   │
│                                                                             │
│  (1) Giants ──┐                                                             │
│               ├── Giants ──┐                                                │
│  (4) Padres ──┘             │                                               │
│                             ├── Giants ──┐                                  │
│  (2) Dodgers ─┐             │             │                                 │
│               ├── Dodgers ──┘             │                                 │
│  (3) Mets ────┘                           ├── ? ──┐                         │
│                                           │       │                         │
│  ─────────────────────────────────────────│───────│─────────────────────   │
│                                           │       │                         │
│  (5) Yankees ─┐                           │       ├── 🏆 CHAMPION           │
│               ├── Yankees ─┐              │       │                         │
│  (8) Twins ───┘             │             │       │                         │
│                             ├── ? ────────┘       │                         │
│  (6) Red Sox ─┐             │                     │                         │
│               ├── ? ────────┘                     │                         │
│  (7) Rays ────┘                                   │                         │
│                                                   │                         │
│  ─────────────────────────────────────────────────────────────────          │
│                                                                             │
│  CURRENT: Division Series Game 3 - Giants (2-0) vs Dodgers                  │
│  Giants can clinch with a win tonight!                                      │
│                                                                             │
│  [Start Game]  [View Full Bracket]  [Series Stats]                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Series Detail View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DIVISION SERIES: Giants vs Dodgers                          Giants lead 2-0│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GAME 1: Giants 5, Dodgers 3  (@ San Francisco)                             │
│    WP: Cole (1-0)  LP: Kershaw (0-1)  SV: Jansen (1)                        │
│    HR: Mays (1), Judge (1)                                                  │
│                                                                             │
│  GAME 2: Giants 8, Dodgers 2  (@ San Francisco)                             │
│    WP: Simmons (1-0)  LP: Urias (0-1)                                       │
│    HR: Mays (2), Stanton 2 (2)                                              │
│                                                                             │
│  GAME 3: Tonight  (@ Los Angeles)     ⭐ CLINCH GAME                        │
│    Giants can advance with a win                                            │
│    Probable: Webb vs Gonsolin                                               │
│                                                                             │
│  GAME 4: If necessary  (@ Los Angeles)                                      │
│  GAME 5: If necessary  (@ San Francisco)                                    │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────          │
│                                                                             │
│  SERIES LEADERS                                                             │
│  ┌──────────────────────────┐ ┌──────────────────────────────────┐         │
│  │ BATTING                   │ │ PITCHING                          │         │
│  │ W. Mays      .500 2 HR   │ │ G. Cole      1-0, 0.00 ERA, 8 K  │         │
│  │ G. Stanton   .375 2 HR   │ │ M. Simmons   1-0, 1.50 ERA, 6 K  │         │
│  │ A. Judge     .250 1 HR   │ │                                   │         │
│  └──────────────────────────┘ └──────────────────────────────────┘         │
│                                                                             │
│  [Start Game 3]  [Back to Bracket]                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Series Flow

### 5.1 Home Field Pattern

**Best-of-7 (2-3-2 Pattern):**
| Game | Location |
|------|----------|
| 1-2 | Higher seed home |
| 3-4-5 | Lower seed home |
| 6-7 | Higher seed home |

**Best-of-5 (2-2-1 Pattern):**
| Game | Location |
|------|----------|
| 1-2 | Higher seed home |
| 3-4 | Lower seed home |
| 5 | Higher seed home |

**Best-of-3:**
| Game | Location |
|------|----------|
| 1 | Higher seed home |
| 2 | Lower seed home |
| 3 | Higher seed home |

### 5.2 Series State Machine

```javascript
const SeriesState = {
  seriesId: 'ds-1-s4',
  round: 'DIVISIONAL',
  homeTeam: { id: 'giants', seed: 1 },
  awayTeam: { id: 'dodgers', seed: 2 },
  seriesLength: 5,
  winsNeeded: 3,

  // Current state
  homeWins: 2,
  awayWins: 0,
  currentGame: 3,

  // Game results
  games: [
    { game: 1, home: 'giants', homeScore: 5, awayScore: 3, winner: 'giants' },
    { game: 2, home: 'giants', homeScore: 8, awayScore: 2, winner: 'giants' },
    { game: 3, home: 'dodgers', homeScore: null, awayScore: null, winner: null },
  ],

  // Status
  status: 'IN_PROGRESS',  // 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'
  winner: null,
  isClinchGame: true,
  isEliminationGame: false
};
```

### 5.3 Series Completion

```javascript
function checkSeriesResult(seriesState, gameResult) {
  const { homeWins, awayWins, winsNeeded } = seriesState;

  if (homeWins >= winsNeeded) {
    return {
      seriesComplete: true,
      winner: seriesState.homeTeam,
      loser: seriesState.awayTeam,
      gamesPlayed: seriesState.currentGame,
      finalScore: `${homeWins}-${awayWins}`
    };
  }

  if (awayWins >= winsNeeded) {
    return {
      seriesComplete: true,
      winner: seriesState.awayTeam,
      loser: seriesState.homeTeam,
      gamesPlayed: seriesState.currentGame,
      finalScore: `${awayWins}-${homeWins}`
    };
  }

  // Series continues
  const gamesRemaining = seriesState.seriesLength - seriesState.currentGame;
  const homeCanWin = homeWins + gamesRemaining >= winsNeeded;
  const awayCanWin = awayWins + gamesRemaining >= winsNeeded;

  return {
    seriesComplete: false,
    isClinchGame: homeWins === winsNeeded - 1 || awayWins === winsNeeded - 1,
    isEliminationGame: !homeCanWin || !awayCanWin,
    nextGame: seriesState.currentGame + 1
  };
}
```

---

## 6. Playoff-Specific Rules

### 6.1 Clutch Multipliers

| Round | Base Multiplier | Elimination Game | Clinch Game |
|-------|-----------------|------------------|-------------|
| Wild Card | 1.5x | +0.25x | +0.25x |
| Division Series | 1.75x | +0.25x | +0.25x |
| Championship | 2.0x | +0.5x | +0.25x |
| World Series | 2.5x | +0.75x | +0.5x |

**Example**: Walk-off HR in World Series Game 7 (elimination):
- Base clutch: +3.0
- World Series multiplier: 2.5x → +7.5
- Elimination bonus: +0.75x → +2.25
- **Total**: +9.75 clutch points

### 6.2 Fame Multipliers

| Event | Regular Season | Playoffs | World Series |
|-------|----------------|----------|--------------|
| Home Run | +1.0 | +1.5 | +2.0 |
| Walk-Off HR | +2.0 | +3.0 | +5.0 |
| Complete Game | +1.0 | +2.0 | +3.0 |
| No-Hitter | +3.0 | +5.0 | +10.0 |

### 6.3 Roster Rules

```javascript
const PlayoffRosterRules = {
  // Roster size per round
  rosterSize: {
    wildCard: 26,
    divisional: 26,
    championship: 26,
    worldSeries: 26
  },

  // Roster changes between rounds
  rosterChanges: {
    allowed: true,
    maxChanges: 2,  // Per round
    injuryExempt: true  // Injury replacements don't count
  },

  // Eligibility
  eligibility: {
    mustBeOnRosterBy: 'TRADE_DEADLINE',  // Or 'SEPTEMBER_1'
    exceptions: ['INJURY_REPLACEMENT', 'CALLED_UP_BEFORE_CUTOFF']
  }
};
```

---

## 7. Exhibition Mode

### 7.1 Exhibition Setup

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚾ EXHIBITION GAME SETUP                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HOME TEAM                        AWAY TEAM                     │
│  ┌────────────────────────────┐  ┌────────────────────────────┐ │
│  │ [Giants ▼]                 │  │ [Yankees ▼]                │ │
│  │                            │  │                            │ │
│  │ Load from:                 │  │ Load from:                 │ │
│  │ ○ Current Franchise        │  │ ○ Current Franchise        │ │
│  │ ○ Fresh SMB4 Roster        │  │ ○ Fresh SMB4 Roster        │ │
│  │ ○ Custom Roster            │  │ ○ Custom Roster            │ │
│  └────────────────────────────┘  └────────────────────────────┘ │
│                                                                 │
│  STADIUM: [Oracle Park ▼]                                       │
│                                                                 │
│  OPTIONS:                                                       │
│  ☐ Day Game  ☑ Night Game                                       │
│  ☐ DH Rule   ☑ No DH                                            │
│  ☑ Track stats (save to exhibition history)                     │
│  ☐ Apply Mojo/Fitness effects                                   │
│                                                                 │
│                [Cancel]  [Start Exhibition]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Exhibition Features

- **No impact** on franchise season stats or career stats
- **Optional** stat tracking to exhibition history (for fun records)
- **Simplified** tracking - no clutch/choke, no fame (unless opted in)
- **Quick play** - skip narrative elements
- **Custom rosters** - mix and match players

### 7.3 Exhibition Data

```javascript
const ExhibitionGame = {
  exhibitionId: 'exh-2024-01-15-001',
  date: '2024-01-15',
  homeTeam: 'giants',
  awayTeam: 'yankees',
  stadium: 'oracle-park',

  // Results
  finalScore: { home: 5, away: 3 },
  innings: 9,
  duration: '2:15:32',

  // Stats (if tracking enabled)
  trackStats: true,
  playerStats: [/* individual game stats */],

  // Game highlights (optional)
  highlights: [
    { player: 'Mays', event: 'HR', inning: 3 }
  ]
};
```

---

## 8. Standalone Playoff Series

### 8.1 Series Setup

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 STANDALONE PLAYOFF SERIES                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SERIES FORMAT                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                   │
│  │ Best of 3  │ │ Best of 5  │ │ Best of 7  │                   │
│  └────────────┘ └────────────┘ └────────────┘                   │
│                      ▲ selected                                 │
│                                                                 │
│  SERIES NAME (optional): [World Series Rematch        ]         │
│                                                                 │
│  TEAM 1 (Higher Seed)           TEAM 2                          │
│  ┌────────────────────────────┐ ┌────────────────────────────┐  │
│  │ [Giants ▼]                 │ │ [Yankees ▼]                │  │
│  │ Load from: Franchise S4    │ │ Load from: Franchise S4    │  │
│  └────────────────────────────┘ └────────────────────────────┘  │
│                                                                 │
│  HOME FIELD: [2-3-2 ▼]                                          │
│  (Team 1 has home field advantage)                              │
│                                                                 │
│  OPTIONS:                                                       │
│  ☑ Apply clutch multipliers (playoff intensity)                 │
│  ☑ Award Series MVP                                             │
│  ☐ Apply Mojo/Fitness effects                                   │
│                                                                 │
│                [Cancel]  [Start Series]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Standalone Series Tracking

```javascript
const StandaloneSeries = {
  seriesId: 'standalone-2024-01-15',
  seriesName: 'World Series Rematch',
  format: 5,  // Best-of-5
  homeFieldPattern: '2-2-1',

  team1: { id: 'giants', name: 'Giants', seed: 1 },
  team2: { id: 'yankees', name: 'Yankees', seed: 2 },

  // Current state
  team1Wins: 2,
  team2Wins: 1,
  currentGame: 4,
  status: 'IN_PROGRESS',

  // Game history
  games: [
    { game: 1, winner: 'giants', score: '5-3', home: 'giants' },
    { game: 2, winner: 'giants', score: '8-2', home: 'giants' },
    { game: 3, winner: 'yankees', score: '6-4', home: 'yankees' },
  ],

  // Series stats
  seriesStats: {
    batting: [/* player batting stats */],
    pitching: [/* player pitching stats */]
  },

  // Settings
  applyClutchMultipliers: true,
  awardSeriesMVP: true,

  // Results (when complete)
  winner: null,
  seriesMVP: null,
  completedAt: null
};
```

### 8.3 Series MVP Calculation

```javascript
function calculateSeriesMVP(series) {
  const allPlayers = [
    ...series.seriesStats.batting,
    ...series.seriesStats.pitching
  ];

  // Calculate MVP score
  const mvpScores = allPlayers.map(player => {
    let score = 0;

    // Batting contribution
    if (player.batting) {
      score += player.batting.hits * 1;
      score += player.batting.hr * 3;
      score += player.batting.rbi * 1.5;
      score += player.batting.runs * 1;
      score += (player.batting.avg - 0.250) * 20;  // Bonus for high avg
    }

    // Pitching contribution
    if (player.pitching) {
      score += player.pitching.wins * 5;
      score += player.pitching.saves * 4;
      score += player.pitching.strikeouts * 0.5;
      score += (4.00 - player.pitching.era) * 2;  // Bonus for low ERA
      score += player.pitching.ip * 0.5;
    }

    // Clutch bonus
    score += (player.clutchPoints || 0) * 0.5;

    return { player: player.id, score };
  });

  // Winner is player with highest score from winning team
  const winningTeamPlayers = mvpScores.filter(
    p => getPlayerTeam(p.player) === series.winner.id
  );

  return winningTeamPlayers.sort((a, b) => b.score - a.score)[0];
}
```

---

## 9. Awards & Recognition

### 9.1 Playoff Awards

| Award | Criteria | Fame Bonus |
|-------|----------|------------|
| **World Series MVP** | Best performer in WS (winning team) | +3.0 |
| **Championship Series MVP** | Best performer in LCS (winning team) | +1.5 |
| **Playoff MVP** | Best overall playoff performer | +2.0 |

### 9.2 Playoff Records

Track separately from regular season:
- Most HR in a playoff series
- Most RBI in a playoff series
- Most wins in a single postseason
- Most saves in a single postseason
- Longest hitting streak in playoffs
- Most consecutive scoreless innings (playoffs)

### 9.3 Franchise Playoff History

```javascript
const FranchisePlayoffHistory = {
  teamId: 'giants',
  appearances: 4,
  championships: 1,
  pennants: 2,  // League championships
  results: [
    { season: 1, result: 'WILD_CARD_LOSS' },
    { season: 2, result: 'WORLD_SERIES_WIN', opponent: 'yankees' },
    { season: 3, result: 'DIVISION_SERIES_LOSS' },
    { season: 4, result: 'IN_PROGRESS' }
  ],
  mvpAwards: [
    { season: 2, award: 'WORLD_SERIES_MVP', player: 'mays' }
  ]
};
```

---

## 10. Data Structures

### 10.1 Complete Playoff State

```typescript
interface PlayoffState {
  season: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';

  // Configuration
  config: PlayoffConfig;

  // Teams
  qualifiedTeams: PlayoffTeam[];
  bracket: PlayoffBracket;

  // Series tracking
  activeSeries: SeriesState[];
  completedSeries: SeriesState[];

  // Stats
  playoffStats: {
    batting: PlayerPlayoffStats[];
    pitching: PlayerPlayoffStats[];
  };

  // Results
  champion: string | null;
  runnerUp: string | null;
  awards: PlayoffAward[];
}

interface PlayoffTeam {
  teamId: string;
  seed: number;
  record: { wins: number; losses: number };
  qualificationType: 'DIVISION_WINNER' | 'WILD_CARD';
  conference: string;
}

interface PlayoffBracket {
  rounds: BracketRound[];
}

interface BracketRound {
  name: string;  // 'WILD_CARD', 'DIVISIONAL', 'CHAMPIONSHIP', 'WORLD_SERIES'
  seriesLength: number;
  matchups: BracketMatchup[];
}

interface BracketMatchup {
  matchupId: string;
  team1Seed: number | null;  // null if TBD
  team2Seed: number | null;
  team1Id: string | null;
  team2Id: string | null;
  series: SeriesState | null;
  winnerId: string | null;
  advancesToMatchup: string | null;  // Next matchup ID
}
```

### 10.2 Integration Points

```javascript
// Season setup includes playoff config
function initializeSeason(config) {
  return {
    // ... other season fields
    playoffConfig: config.playoffs,
    playoffState: null  // Created when playoffs begin
  };
}

// Trigger playoff initialization
function startPlayoffs(season) {
  const standings = calculateFinalStandings(season);
  const qualifiedTeams = determinePlayoffTeams(standings, season.playoffConfig);

  season.playoffState = {
    status: 'IN_PROGRESS',
    config: season.playoffConfig,
    qualifiedTeams,
    bracket: generateBracket(qualifiedTeams, season.playoffConfig),
    activeSeries: [],
    completedSeries: [],
    playoffStats: { batting: [], pitching: [] },
    champion: null,
    runnerUp: null,
    awards: []
  };

  // Start first round
  initializeRound(season.playoffState, 0);
}
```

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-01-23 | Initial specification created. Includes playoff bracket system, exhibition mode, standalone playoff series, series flow, clutch/fame multipliers, and all data structures. |

---

*End of Playoff System Specification*
