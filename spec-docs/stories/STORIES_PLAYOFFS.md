# Playoffs Tab - User Stories

> **Phase**: Post-Regular Season (before Offseason Phase 1)
> **Trigger**: Regular season complete (`gameNumber >= totalGames`) AND playoffs configured
> **Purpose**: Manage playoff bracket, track series, determine champion
> **Next Phase**: Season End Processing (Phase 1)

---

## Overview

The Playoffs tab manages the postseason tournament from bracket generation through championship determination. It supports multiple playoff formats, tracks series progress, and handles all playoff-specific game tracking.

**Key Operations:**
1. Playoff qualification and seeding
2. Bracket generation and visualization
3. Series management and game tracking
4. Clinch/elimination detection
5. Championship determination
6. Series MVP awards

**Reference**: PLAYOFF_SYSTEM_SPEC.md for full system details

---

## User Stories

### S-PLY001: Playoff Configuration

**As a** league manager,
**I want** to configure the playoff format before the season,
**So that** the postseason structure matches my league preferences.

**Acceptance Criteria:**
1. AC-1: Configure number of playoff teams (4, 6, 8, 10, or 12)
2. AC-2: Select seeding method (Best Records, Division Winners + Wildcards, Conference Seeds)
3. AC-3: Choose series lengths per round (3, 5, or 7 games)
4. AC-4: Set home field advantage pattern (2-3-2, 2-2-1-1-1, or none)
5. AC-5: Configuration saved and displayed on league settings

**Technical Notes:**
```typescript
interface PlayoffConfig {
  teamCount: 4 | 6 | 8 | 10 | 12;
  seedingMethod: 'BEST_RECORDS' | 'DIVISION_WINNERS_PLUS_WILDCARDS' | 'CONFERENCE_SEEDS';
  rounds: {
    name: PlayoffRound;
    seriesLength: 3 | 5 | 7;
  }[];
  homeFieldPattern: '2-3-2' | '2-2-1-1-1' | 'ALTERNATING' | 'NONE';
  byeRounds?: number;  // For 6 or 10 team formats
}
```

---

### S-PLY002: Playoff Qualification

**As a** league manager,
**I want** teams to automatically qualify for playoffs based on final standings,
**So that** the bracket reflects competitive results.

**Acceptance Criteria:**
1. AC-1: Division winners automatically qualify with top seeds
2. AC-2: Remaining spots filled by best records (wildcards)
3. AC-3: Tiebreakers applied: Head-to-head → Division record → Run differential
4. AC-4: Qualification displayed on standings with playoff indicators
5. AC-5: Non-qualifying teams shown as eliminated

**Seeding Logic:**
```typescript
function determinePlayoffSeeds(
  standings: TeamStanding[],
  config: PlayoffConfig
): PlayoffSeed[] {
  // 1. Division winners get top seeds
  const divisionWinners = getDivisionWinners(standings);

  // 2. Sort remaining by record
  const remaining = standings.filter(t => !divisionWinners.includes(t));
  const wildcards = remaining
    .sort((a, b) => compareRecords(a, b))
    .slice(0, config.teamCount - divisionWinners.length);

  // 3. Apply tiebreakers and assign seeds
  return assignSeeds([...divisionWinners, ...wildcards]);
}
```

---

### S-PLY003: Bracket Generation

**As a** league manager,
**I want** the playoff bracket to be automatically generated from seeding,
**So that** matchups are set correctly.

**Acceptance Criteria:**
1. AC-1: Bracket generated with correct matchups (1 vs 8, 2 vs 7, etc.)
2. AC-2: Higher seed has home field advantage
3. AC-3: Bracket shows all rounds with TBD placeholders
4. AC-4: Bye rounds indicated for 6 or 10 team formats
5. AC-5: Bracket can be regenerated if needed before first game

**Bracket Structure:**
```typescript
interface PlayoffBracket {
  seasonId: number;
  config: PlayoffConfig;
  rounds: BracketRound[];
  status: 'GENERATED' | 'IN_PROGRESS' | 'COMPLETE';
  championId?: string;
}

interface BracketRound {
  name: 'WILD_CARD' | 'DIVISIONAL' | 'CHAMPIONSHIP' | 'WORLD_SERIES';
  seriesLength: 3 | 5 | 7;
  matchups: BracketMatchup[];
}

interface BracketMatchup {
  matchupId: string;
  higherSeed: { teamId: string; seed: number };
  lowerSeed: { teamId: string; seed: number };
  series: SeriesState;
  winnerId?: string;
  advancesTo?: string;  // Next matchup ID
}
```

---

### S-PLY004: Bracket Visualization

**As a** league manager,
**I want** to see the full playoff bracket in a visual format,
**So that** I can track tournament progress at a glance.

**Acceptance Criteria:**
1. AC-1: Multi-column bracket layout (rounds left to right)
2. AC-2: Each matchup shows team names, seeds, and series score
3. AC-3: Current series highlighted with "LIVE" indicator
4. AC-4: Completed matchups show winner advancing
5. AC-5: TBD placeholders for future matchups
6. AC-6: Champion shown with trophy icon when determined

**Display Format:**
```
WILD CARD          DIVISION SERIES      CHAMPIONSHIP       WORLD SERIES
─────────          ───────────────      ────────────       ────────────
[1] Hawks
    BYE ──────────┐
                  ├── [1] Hawks ────┐
[4] Storm         │       vs        │
   2-1 ───────────┘   [4] Storm     ├── [1] Hawks ────┐
[5] Wolves                          │       vs        │
   1-2                              │   [2] Cats      │
                                    │                 │
[2] Cats                            │                 ├── 🏆 CHAMPION
    BYE ──────────┐                 │                 │
                  ├── [2] Cats ─────┘                 │
[3] Giants        │       vs                          │
   1-2 ───────────┘   [3] Giants                      │
[6] Bears                                             │
   2-1                                                │
```

---

### S-PLY005: Series State Management

**As a** league manager,
**I want** each playoff series to track wins and game results,
**So that** I know who is leading and when a series ends.

**Acceptance Criteria:**
1. AC-1: Series tracks wins for each team
2. AC-2: Games needed to win calculated from series length
3. AC-3: Series status: NOT_STARTED → IN_PROGRESS → COMPLETE
4. AC-4: Individual game results stored (score, winner, pitchers)
5. AC-5: Series leader shown in bracket view

**Series State:**
```typescript
interface SeriesState {
  seriesId: string;
  round: PlayoffRound;
  homeTeam: { id: string; seed: number };
  awayTeam: { id: string; seed: number };
  seriesLength: 3 | 5 | 7;
  winsNeeded: number;  // (seriesLength + 1) / 2

  homeWins: number;
  awayWins: number;
  currentGame: number;

  games: SeriesGame[];

  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  winnerId?: string;
  isClinchGame: boolean;
  isEliminationGame: boolean;
}

interface SeriesGame {
  gameNumber: number;
  homeTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerId: string;
  winningPitcher?: string;
  losingPitcher?: string;
  savePitcher?: string;
}
```

---

### S-PLY006: Home Field Advantage

**As a** league manager,
**I want** home field advantage applied correctly per series format,
**So that** the higher seed benefits appropriately.

**Acceptance Criteria:**
1. AC-1: 2-3-2 pattern for 7-game series (Games 1-2, 6-7 at higher seed)
2. AC-2: 2-2-1 pattern for 5-game series (Games 1-2, 5 at higher seed)
3. AC-3: 2-1 pattern for 3-game series (Games 1, 3 at higher seed)
4. AC-4: Current game location displayed clearly
5. AC-5: Home team listed second in matchup display (Away @ Home)

**Home Field Pattern:**
```typescript
function getHomeTeam(
  series: SeriesState,
  gameNumber: number,
  pattern: HomeFieldPattern
): string {
  const patterns: Record<number, boolean[]> = {
    3: [true, false, true],           // Higher seed: G1, G3
    5: [true, true, false, false, true],  // Higher seed: G1-2, G5
    7: [true, true, false, false, false, true, true]  // 2-3-2
  };

  const isHigherSeedHome = patterns[series.seriesLength][gameNumber - 1];
  return isHigherSeedHome ? series.homeTeam.id : series.awayTeam.id;
}
```

---

### S-PLY007: Start Playoff Game

**As a** league manager,
**I want** to start a playoff game from the bracket or series view,
**So that** I can begin tracking the game.

**Acceptance Criteria:**
1. AC-1: [Start Game] button on current series
2. AC-2: Game number and matchup displayed before starting
3. AC-3: Home/away teams set based on home field pattern
4. AC-4: Playoff game uses same tracking UI as regular season
5. AC-5: Clutch multipliers automatically applied based on round

**Clutch Multipliers by Round:**
```typescript
const PLAYOFF_CLUTCH_MULTIPLIERS: Record<PlayoffRound, number> = {
  WILD_CARD: 1.5,
  DIVISIONAL: 1.75,
  CHAMPIONSHIP: 2.0,
  WORLD_SERIES: 2.5
};

const SITUATION_BONUSES = {
  ELIMINATION_GAME: 0.5,
  CLINCH_GAME: 0.25
};
```

---

### S-PLY008: Clinch and Elimination Detection

**As a** league manager,
**I want** the system to identify clinch and elimination games,
**So that** high-stakes situations are highlighted.

**Acceptance Criteria:**
1. AC-1: Clinch game: One team is 1 win from advancing
2. AC-2: Elimination game: One team cannot lose another game
3. AC-3: Visual indicator on game card (⭐ CLINCH / ⚠️ ELIMINATION)
4. AC-4: Both flags can be true simultaneously (e.g., Game 7)
5. AC-5: Clutch multiplier bonuses applied to these games

**Detection Logic:**
```typescript
function detectGameStakes(series: SeriesState): GameStakes {
  const { homeWins, awayWins, winsNeeded } = series;

  const homeClinch = homeWins === winsNeeded - 1;
  const awayClinch = awayWins === winsNeeded - 1;
  const homeElimination = awayWins === winsNeeded - 1;
  const awayElimination = homeWins === winsNeeded - 1;

  return {
    isClinchGame: homeClinch || awayClinch,
    isEliminationGame: homeElimination || awayElimination,
    clinchTeam: homeClinch ? series.homeTeam.id : (awayClinch ? series.awayTeam.id : null),
    eliminationTeam: homeElimination ? series.homeTeam.id : (awayElimination ? series.awayTeam.id : null)
  };
}
```

---

### S-PLY009: Record Playoff Game Result

**As a** league manager,
**I want** to record the result of a playoff game,
**So that** the series updates and bracket progresses.

**Acceptance Criteria:**
1. AC-1: Final score recorded for both teams
2. AC-2: Winner's series wins incremented
3. AC-3: Winning/losing/save pitchers recorded
4. AC-4: Key plays recorded (HR, walk-offs, etc.)
5. AC-5: Series status checked for completion
6. AC-6: If series complete, winner advances in bracket

**Game Result Flow:**
```typescript
function recordPlayoffGameResult(
  series: SeriesState,
  result: GameResult
): SeriesState {
  // 1. Add game to series
  series.games.push(result);

  // 2. Update wins
  if (result.winnerId === series.homeTeam.id) {
    series.homeWins++;
  } else {
    series.awayWins++;
  }

  // 3. Check for series completion
  if (series.homeWins >= series.winsNeeded) {
    series.status = 'COMPLETE';
    series.winnerId = series.homeTeam.id;
  } else if (series.awayWins >= series.winsNeeded) {
    series.status = 'COMPLETE';
    series.winnerId = series.awayTeam.id;
  } else {
    series.currentGame++;
    series.isClinchGame = detectClinch(series);
    series.isEliminationGame = detectElimination(series);
  }

  return series;
}
```

---

### S-PLY010: Series Completion and Advancement

**As a** league manager,
**I want** the winning team to automatically advance to the next round,
**So that** the bracket progresses correctly.

**Acceptance Criteria:**
1. AC-1: Winner populates next round matchup
2. AC-2: Bracket updates visually to show advancement
3. AC-3: Series MVP calculated for completed series
4. AC-4: If championship round, trigger championship processing
5. AC-5: Celebration animation for series win

**Advancement Logic:**
```typescript
function advanceWinner(
  bracket: PlayoffBracket,
  completedMatchup: BracketMatchup
): PlayoffBracket {
  if (!completedMatchup.advancesTo) {
    // This was the championship - set champion
    bracket.championId = completedMatchup.winnerId;
    bracket.status = 'COMPLETE';
    return bracket;
  }

  // Find next matchup and populate with winner
  const nextMatchup = findMatchup(bracket, completedMatchup.advancesTo);
  if (nextMatchup.higherSeed.teamId === null) {
    nextMatchup.higherSeed.teamId = completedMatchup.winnerId;
  } else {
    nextMatchup.lowerSeed.teamId = completedMatchup.winnerId;
  }

  return bracket;
}
```

---

### S-PLY011: Series Detail View

**As a** league manager,
**I want** to see detailed information about a series,
**So that** I can review game-by-game results and stats.

**Acceptance Criteria:**
1. AC-1: Series header shows matchup and current score (e.g., "Hawks lead 2-1")
2. AC-2: Game-by-game results with scores and locations
3. AC-3: Winning/losing/save pitchers for each game
4. AC-4: Key plays per game (HR, walk-offs)
5. AC-5: Series leaders (batting and pitching stats)
6. AC-6: Upcoming game info (probable pitchers, location)

**Series Leaders Display:**
```
SERIES LEADERS
────────────────────────────────────────
BATTING                  PITCHING
M. Johnson  .455  5 RBI  R. Martinez  2-0  1.50 ERA
D. Chen     .400  3 HR   T. Williams  1-0  2.25 ERA
J. Davis    .385  4 R    K. Brown     0-1  3.60 ERA
```

---

### S-PLY012: Series MVP Award

**As a** league manager,
**I want** a Series MVP to be calculated when a series ends,
**So that** the best performer is recognized.

**Acceptance Criteria:**
1. AC-1: MVP calculated from winning team only
2. AC-2: Score factors: Hits, HR, RBI, Runs, AVG, Wins, Saves, K, ERA, IP, Clutch
3. AC-3: MVP displayed on series completion screen
4. AC-4: MVP recorded in playoff history
5. AC-5: World Series MVP gets +3.0 Fame bonus

**MVP Calculation:**
```typescript
function calculateSeriesMVP(
  series: SeriesState,
  playerStats: Map<string, SeriesStats>
): string {
  const winningTeamPlayers = getWinningTeamPlayers(series);

  let mvpScore = 0;
  let mvpId = '';

  for (const playerId of winningTeamPlayers) {
    const stats = playerStats.get(playerId);
    const score =
      (stats.hits * 1) +
      (stats.hr * 3) +
      (stats.rbi * 1.5) +
      (stats.runs * 1) +
      ((stats.avg - 0.250) * 20) +
      (stats.wins * 5) +
      (stats.saves * 4) +
      (stats.strikeouts * 0.5) +
      ((4.00 - stats.era) * 2) +
      (stats.ip * 0.5) +
      (stats.clutchPoints * 0.5);

    if (score > mvpScore) {
      mvpScore = score;
      mvpId = playerId;
    }
  }

  return mvpId;
}
```

---

### S-PLY013: Championship Determination

**As a** league manager,
**I want** the championship winner to be clearly identified,
**So that** Season End Processing can apply bonuses.

**Acceptance Criteria:**
1. AC-1: Championship series completion triggers champion declaration
2. AC-2: Trophy animation and celebration screen
3. AC-3: Championship roster captured (for fame bonuses)
4. AC-4: World Series MVP calculated and displayed
5. AC-5: [Proceed to Season End] button appears

**Championship Result:**
```typescript
interface ChampionshipResult {
  seasonId: number;
  championId: string;
  championName: string;
  opponentId: string;
  opponentName: string;
  seriesResult: string;  // e.g., "4-2"
  worldSeriesMVP: {
    playerId: string;
    playerName: string;
    stats: SeriesStats;
  };
  championshipRoster: string[];  // All player IDs at time of win
}
```

---

### S-PLY014: Playoff Stats Tracking

**As a** league manager,
**I want** playoff stats tracked separately from regular season,
**So that** postseason performance is properly measured.

**Acceptance Criteria:**
1. AC-1: All batting/pitching stats tracked for playoffs
2. AC-2: Playoff stats separate from regular season totals
3. AC-3: Postseason WAR calculated from playoff games
4. AC-4: Clutch points accumulated with playoff multipliers
5. AC-5: Playoff stats available in player profile

**Playoff Stats:**
```typescript
interface PlayoffStats {
  playerId: string;
  seasonId: number;
  gamesPlayed: number;

  // Batting
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  avg: number;
  ops: number;

  // Pitching
  wins: number;
  losses: number;
  saves: number;
  inningsPitched: number;
  earnedRuns: number;
  era: number;
  strikeoutsP: number;
  walksP: number;
  whip: number;

  // Advanced
  postseasonWAR: number;
  clutchPoints: number;
}
```

---

### S-PLY015: Playoff Roster Management

**As a** league manager,
**I want** to manage my playoff roster between rounds,
**So that** I can adjust for injuries or matchups.

**Acceptance Criteria:**
1. AC-1: Roster locked during active series
2. AC-2: Up to 2 roster changes allowed between rounds
3. AC-3: Injury replacements don't count against limit
4. AC-4: Players must have been on roster by trade deadline or Sept 1
5. AC-5: Roster changes displayed in transaction log

**Roster Rules:**
```typescript
interface PlayoffRosterRules {
  rosterSize: 26;
  maxChangesBetweenRounds: 2;
  eligibilityCutoff: 'TRADE_DEADLINE' | 'SEPTEMBER_1';
  injuryExemption: true;
}

function validateRosterChange(
  player: Player,
  season: Season
): RosterChangeValidation {
  const isEligible =
    player.addedToRosterDate <= season.tradeDeadline ||
    player.addedToRosterDate <= season.september1;

  return {
    valid: isEligible,
    reason: isEligible ? null : 'Player not eligible for playoff roster'
  };
}
```

---

### S-PLY016: Exhibition Playoff Series

**As a** league manager,
**I want** to play standalone playoff series outside of franchise mode,
**So that** I can have playoff experiences without a full season.

**Acceptance Criteria:**
1. AC-1: Select any two teams for series
2. AC-2: Choose series length (3, 5, or 7 games)
3. AC-3: Home field assigned to selected team
4. AC-4: Stats tracked to exhibition history (optional)
5. AC-5: Series MVP calculated at completion
6. AC-6: No impact on franchise records

**Exhibition Series:**
```typescript
interface ExhibitionPlayoffSeries {
  type: 'EXHIBITION';
  homeTeam: Team;
  awayTeam: Team;
  seriesLength: 3 | 5 | 7;
  homeFieldAdvantage: 'HOME_TEAM' | 'AWAY_TEAM';
  trackStats: boolean;
  applyClutchMultipliers: boolean;
  series: SeriesState;
}
```

---

### S-PLY017: Playoff Records

**As a** league manager,
**I want** playoff records tracked and displayed,
**So that** historic performances are preserved.

**Acceptance Criteria:**
1. AC-1: Most HR in a playoff series
2. AC-2: Most RBI in a playoff series
3. AC-3: Most wins in a single postseason
4. AC-4: Most saves in a single postseason
5. AC-5: Longest hitting streak in playoffs
6. AC-6: Most consecutive scoreless innings
7. AC-7: Records displayed in Museum/History

**Record Tracking:**
```typescript
interface PlayoffRecord {
  category: string;
  value: number;
  playerId: string;
  playerName: string;
  teamId: string;
  seasonId: number;
  description: string;
}

const PLAYOFF_RECORD_CATEGORIES = [
  'SERIES_HR',
  'SERIES_RBI',
  'POSTSEASON_WINS',
  'POSTSEASON_SAVES',
  'HITTING_STREAK',
  'SCORELESS_INNINGS'
];
```

---

### S-PLY018: Transition to Season End Processing

**As a** league manager,
**I want** to transition smoothly from playoffs to Season End Processing,
**So that** the offseason can begin properly.

**Acceptance Criteria:**
1. AC-1: [Complete Playoffs] button after championship
2. AC-2: Confirmation modal with playoff summary
3. AC-3: Championship result passed to Season End Processing
4. AC-4: Playoff stats finalized and locked
5. AC-5: Transition to Phase 1 (Season End Processing)

**Transition Data:**
```typescript
interface PlayoffCompletionData {
  seasonId: number;
  champion: ChampionshipResult;
  playoffGames: SeriesGame[];
  seriesMVPs: { round: string; playerId: string }[];
  playoffStats: Map<string, PlayoffStats>;
  postseasonWAR: Map<string, number>;
}

// This data feeds into Season End Processing (Phase 1)
// - Postseason MVP selection uses postseasonWAR
// - Championship processing uses champion.championshipRoster
```

---

## Data Models

### Playoff State

```typescript
interface PlayoffState {
  seasonId: number;
  config: PlayoffConfig;
  bracket: PlayoffBracket;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';

  // Current series tracking
  activeSeries?: SeriesState;
  currentGame?: number;

  // Results
  seriesResults: SeriesResult[];
  seriesMVPs: { seriesId: string; playerId: string }[];
  champion?: ChampionshipResult;

  // Stats
  playerStats: Map<string, PlayoffStats>;
}
```

### Bracket Round Types

```typescript
type PlayoffRound =
  | 'WILD_CARD'
  | 'DIVISIONAL'
  | 'CHAMPIONSHIP'
  | 'WORLD_SERIES';

const ROUND_DISPLAY_NAMES: Record<PlayoffRound, string> = {
  WILD_CARD: 'Wild Card Round',
  DIVISIONAL: 'Division Series',
  CHAMPIONSHIP: 'Championship Series',
  WORLD_SERIES: 'World Series'
};
```

---

## Integration Points

### Upstream Dependencies
- **Regular Season**: Final standings for seeding
- **Roster Management**: Playoff-eligible players
- **Stats System**: Regular season stats baseline

### Downstream Consumers
- **Season End (Phase 1)**: Championship result, postseason WAR
- **Awards (Phase 2)**: Playoff stats for awards voting
- **History/Museum**: Playoff records, series results

---

## Screen Flow

```
Regular Season Complete
         │
         ▼
┌─────────────────────┐
│  Playoff Bracket    │ ◄── View bracket, select series
│  (Main View)        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Series Detail      │ ◄── View series info, start game
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Playoff Game       │ ◄── Same UI as regular season
│  (Today's Game)     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Game Complete      │ ◄── Record result
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
Series        Series
Continues     Complete
    │           │
    │           ▼
    │    ┌─────────────────┐
    │    │  Series MVP     │
    │    │  Award          │
    │    └─────────┬───────┘
    │              │
    │    ┌─────────┴─────────┐
    │    │                   │
    │  More              Championship
    │  Rounds               Complete
    │    │                   │
    │    │                   ▼
    │    │         ┌─────────────────────┐
    │    │         │  Championship       │
    │    │         │  Celebration        │
    │    │         └─────────┬───────────┘
    │    │                   │
    └────┴───────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  Season End         │
         │  Processing (Ph 1)  │
         └─────────────────────┘
```

---

## Edge Cases

1. **Tie games**: Baseball has no ties - extra innings until winner
2. **Rainouts**: SMB4 doesn't have rainouts, N/A
3. **All teams eliminated from one division**: Proceed with remaining bracket
4. **Roster player injury mid-series**: Replacement allowed, counts against limit unless IL
5. **User quits mid-series**: Save state, resume from same point

---

*Last Updated: January 29, 2026*
*Stories: S-PLY001 through S-PLY018*
