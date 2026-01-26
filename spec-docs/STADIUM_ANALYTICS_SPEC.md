# Stadium Analytics & Park Factors System

> **Version**: 1.0
> **Last Updated**: January 2026
> **Status**: Draft
> **Dependencies**: GAME_SIMULATION_SPEC.md, BWAR_CALCULATION_SPEC.md, PWAR_CALCULATION_SPEC.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [Stadium Data Structure](#2-stadium-data-structure)
3. [Park Factor System](#3-park-factor-system)
4. [Spray Chart Tracking](#4-spray-chart-tracking)
5. [Stadium Records](#5-stadium-records)
6. [WAR Integration](#6-war-integration)
7. [Game Simulation Integration](#7-game-simulation-integration)
8. [UI Components](#8-ui-components)
9. [Data Storage](#9-data-storage)
10. [Open Questions](#10-open-questions)

---

## 1. Overview

### 1.1 Purpose

The Stadium Analytics system tracks how each ballpark affects gameplay, providing:

- **Park Factors**: Quantified impact on offensive/defensive stats
- **Spray Charts**: Visual hit distribution data
- **Stadium Records**: Historical achievements at each venue
- **WAR Adjustments**: Context for player performance evaluation
- **Simulation Input**: Realistic game outcome modeling

### 1.2 Design Philosophy

1. **Data-Driven**: Park factors calculated from actual game results, not arbitrary values
2. **Granular**: Per-stat, per-handedness breakdowns for accuracy
3. **Historical**: Track how stadiums evolve over seasons
4. **Transparent**: Show users how park factors affect stats

### 1.3 Key Concepts

| Term | Definition |
|------|------------|
| **Park Factor (PF)** | Multiplier showing how a stadium affects a stat (1.00 = neutral) |
| **Runs Created** | Total offensive production at a stadium |
| **Handedness Split** | Different factors for LHB vs RHB |
| **Spray Zone** | One of 6 directional areas for hit tracking |
| **Sample Size** | Minimum games required for reliable factors |

---

## 2. Stadium Data Structure

### 2.1 Core Stadium Object

```typescript
interface Stadium {
  // Identity
  id: string;                    // 'stadium-oracle-park'
  name: string;                  // 'Oracle Park'
  teamId: string;                // 'team-giants'

  // Physical Dimensions
  dimensions: StadiumDimensions;

  // Calculated Park Factors (updated after each game)
  parkFactors: ParkFactors;

  // Historical Park Factors by Season
  historicalFactors: SeasonParkFactors[];

  // Spray Chart Data
  sprayChart: SprayChartData;

  // Stadium Records
  records: StadiumRecords;

  // Aggregate Stats
  stats: StadiumStats;

  // Notable Moments
  notableMoments: StadiumMoment[];

  // Metadata
  opened: string;                // 'S1' or specific date
  surface: 'Grass' | 'Turf';
  roofType: 'Open' | 'Retractable' | 'Dome';
}
```

### 2.2 Physical Dimensions

```typescript
interface StadiumDimensions {
  // Distance to wall (in feet)
  leftField: DimensionZone;
  leftCenter: DimensionZone;
  center: DimensionZone;
  rightCenter: DimensionZone;
  rightField: DimensionZone;

  // Foul territory size affects pop-up outs
  foulTerritory: 'Small' | 'Medium' | 'Large';

  // Additional features
  features: StadiumFeature[];
}

interface DimensionZone {
  distance: number;              // Feet to wall
  wallHeight: 'Low' | 'Med' | 'High' | 'Monster';  // Affects HR
  wallHeightFeet?: number;       // Specific height if notable
}

interface StadiumFeature {
  name: string;                  // 'Green Monster', 'Tal's Hill', 'The Cove'
  zone: SprayZone;
  effect: string;               // Description of gameplay impact
}
```

### 2.3 Initial Stadium Data

Stadiums start with **seed park factors** based on dimensions, then adjust dynamically from game data.

```typescript
// Seed factors derived from dimensions
function calculateSeedParkFactors(dimensions: StadiumDimensions): ParkFactors {
  // Base calculations from physical characteristics
  const avgDistance = (
    dimensions.leftField.distance +
    dimensions.leftCenter.distance +
    dimensions.center.distance +
    dimensions.rightCenter.distance +
    dimensions.rightField.distance
  ) / 5;

  // Larger parks = fewer HRs
  const hrFactor = mapRange(avgDistance, 320, 410, 1.15, 0.85);

  // Wall height affects HRs
  const wallAdjustment = calculateWallAdjustment(dimensions);

  // Foul territory affects batting average
  const foulAdjustment = {
    'Small': 1.02,
    'Medium': 1.00,
    'Large': 0.97
  }[dimensions.foulTerritory];

  return {
    overall: 1.00,  // Will be calculated from components
    runs: 1.00,
    homeRuns: hrFactor * wallAdjustment,
    hits: foulAdjustment,
    doubles: calculateDoublesFromDimensions(dimensions),
    triples: calculateTriplesFromDimensions(dimensions),
    strikeouts: 1.00,
    walks: 1.00,
    leftHandedHR: calculateHandednessHR(dimensions, 'left'),
    rightHandedHR: calculateHandednessHR(dimensions, 'right'),
    source: 'SEED'
  };
}
```

---

## 3. Park Factor System

### 3.1 Park Factor Structure

```typescript
interface ParkFactors {
  // Overall factor (weighted composite)
  overall: number;               // 0.85 - 1.15 typical range

  // Offensive factors
  runs: number;                  // Run scoring environment
  homeRuns: number;              // HR rate
  hits: number;                  // Hit rate (BABIP-ish)
  doubles: number;               // Extra-base hits (gaps)
  triples: number;               // Triples (big outfields)

  // Plate discipline factors
  strikeouts: number;            // K rate (visibility, backdrop)
  walks: number;                 // BB rate (usually near 1.00)

  // Handedness splits (critical for accuracy)
  leftHandedHR: number;          // LHB home run factor
  rightHandedHR: number;         // RHB home run factor
  leftHandedAVG: number;         // LHB batting average
  rightHandedAVG: number;        // RHB batting average

  // Metadata
  gamesIncluded: number;         // Sample size
  lastUpdated: string;           // ISO date
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';  // Based on sample size
  source: 'SEED' | 'CALCULATED' | 'BLENDED';
}
```

### 3.2 Dynamic Calculation

Park factors are **recalculated after every home game** using a rolling window approach.

```typescript
const PARK_FACTOR_CONFIG = {
  // Minimum games before factors are "reliable"
  MIN_GAMES_LOW_CONFIDENCE: 10,
  MIN_GAMES_MEDIUM_CONFIDENCE: 30,
  MIN_GAMES_HIGH_CONFIDENCE: 81,  // Half season

  // Rolling window for calculation
  ROLLING_WINDOW_GAMES: 162,     // ~2 seasons of home games

  // Blend with seed factors until sufficient data
  SEED_BLEND_WEIGHT: {
    LOW: 0.70,      // 70% seed, 30% calculated
    MEDIUM: 0.30,   // 30% seed, 70% calculated
    HIGH: 0.00      // 100% calculated
  }
};

function calculateParkFactor(
  stat: StatType,
  stadiumGames: GameResult[],
  leagueAverage: number
): number {
  // Get stat totals at this stadium
  const stadiumTotal = sumStat(stadiumGames, stat);
  const stadiumGamesCount = stadiumGames.length;

  // Get same teams' road stats for comparison
  const roadGames = getRoadGamesForSameTeams(stadiumGames);
  const roadTotal = sumStat(roadGames, stat);
  const roadGamesCount = roadGames.length;

  // Park Factor = (Home stat rate / Road stat rate)
  // This isolates the park effect from team quality
  const homeRate = stadiumTotal / stadiumGamesCount;
  const roadRate = roadTotal / roadGamesCount;

  if (roadRate === 0) return 1.00;

  // Raw park factor
  let parkFactor = homeRate / roadRate;

  // Regress toward 1.00 based on sample size
  const regression = calculateRegression(stadiumGamesCount);
  parkFactor = (parkFactor * (1 - regression)) + (1.00 * regression);

  // Clamp to reasonable range
  return clamp(parkFactor, 0.70, 1.30);
}
```

### 3.3 Calculation Formula (Detailed)

The standard park factor formula compares home performance to road performance:

```
Park Factor = ((homeRS + homeRA) / homeG) / ((roadRS + roadRA) / roadG)

Where:
- homeRS = Runs scored at home
- homeRA = Runs allowed at home
- homeG = Home games
- roadRS = Runs scored on road
- roadRA = Runs allowed on road
- roadG = Road games
```

For single-stat factors (HR, 2B, etc.):

```
Stat PF = (statAtHome / homeG) / (statOnRoad / roadG)
```

### 3.4 Handedness Split Calculation

```typescript
function calculateHandednessParkFactor(
  stadiumGames: GameResult[],
  handedness: 'LEFT' | 'RIGHT',
  stat: 'HR' | 'AVG'
): number {
  // Filter plate appearances by batter handedness
  const homePA = getPlateAppearances(stadiumGames, 'HOME', handedness);
  const roadPA = getPlateAppearances(stadiumGames, 'ROAD', handedness);

  const homeRate = calculateRate(homePA, stat);
  const roadRate = calculateRate(roadPA, stat);

  if (roadRate === 0) return 1.00;

  return homeRate / roadRate;
}

// Example: Oracle Park
// - Short right field (309 ft) favors LHB pull hitters
// - Deep left-center (364 ft) hurts RHB
// Result: leftHandedHR: 1.05, rightHandedHR: 0.82
```

### 3.5 Confidence Levels

```typescript
function determineConfidence(gamesPlayed: number): ConfidenceLevel {
  if (gamesPlayed >= PARK_FACTOR_CONFIG.MIN_GAMES_HIGH_CONFIDENCE) {
    return 'HIGH';
  } else if (gamesPlayed >= PARK_FACTOR_CONFIG.MIN_GAMES_MEDIUM_CONFIDENCE) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

// UI displays confidence indicator
// LOW: "⚠️ Limited data (15 games)"
// MEDIUM: "📊 Moderate confidence (45 games)"
// HIGH: "✅ High confidence (100+ games)"
```

### 3.6 Blending Seed and Calculated Factors

```typescript
function getEffectiveParkFactor(
  stadium: Stadium,
  stat: StatType
): number {
  const seedFactor = stadium.parkFactors.seed[stat];
  const calculatedFactor = stadium.parkFactors.calculated[stat];
  const confidence = stadium.parkFactors.confidence;

  const seedWeight = PARK_FACTOR_CONFIG.SEED_BLEND_WEIGHT[confidence];

  return (seedFactor * seedWeight) + (calculatedFactor * (1 - seedWeight));
}
```

### 3.7 Historical Tracking

```typescript
interface SeasonParkFactors {
  season: number;
  parkFactors: ParkFactors;
  gamesPlayed: number;

  // Track significant changes
  changeFromPrevious?: {
    overall: number;
    significantChanges: string[];  // ['HR factor dropped 8%', 'Triples up 15%']
  };
}

// After each season, snapshot the park factors
function archiveSeasonParkFactors(stadium: Stadium, season: number): void {
  const snapshot: SeasonParkFactors = {
    season,
    parkFactors: { ...stadium.parkFactors },
    gamesPlayed: stadium.stats.homeGames
  };

  // Compare to previous season
  if (stadium.historicalFactors.length > 0) {
    const previous = stadium.historicalFactors[stadium.historicalFactors.length - 1];
    snapshot.changeFromPrevious = calculateFactorChanges(previous.parkFactors, snapshot.parkFactors);
  }

  stadium.historicalFactors.push(snapshot);
}
```

---

## 4. Spray Chart Tracking

### 4.1 Spray Zone Definitions

```typescript
type SprayZone =
  | 'LEFT_LINE'      // Down the left field line
  | 'LEFT_FIELD'     // Standard left field
  | 'LEFT_CENTER'    // Left-center gap
  | 'CENTER'         // Straightaway center
  | 'RIGHT_CENTER'   // Right-center gap
  | 'RIGHT_FIELD'    // Standard right field
  | 'RIGHT_LINE';    // Down the right field line

// Angular definitions (from home plate perspective)
const SPRAY_ZONE_ANGLES = {
  LEFT_LINE:    { min: -45, max: -35 },
  LEFT_FIELD:   { min: -35, max: -15 },
  LEFT_CENTER:  { min: -15, max: -5 },
  CENTER:       { min: -5, max: 5 },
  RIGHT_CENTER: { min: 5, max: 15 },
  RIGHT_FIELD:  { min: 15, max: 35 },
  RIGHT_LINE:   { min: 35, max: 45 }
};
```

### 4.2 Spray Chart Data Structure

```typescript
interface SprayChartData {
  // Aggregate data by zone
  zones: Record<SprayZone, SprayZoneStats>;

  // Individual batted balls (for detailed visualization)
  battedBalls: BattedBallEvent[];

  // Filters
  byHandedness: {
    left: Record<SprayZone, SprayZoneStats>;
    right: Record<SprayZone, SprayZoneStats>;
  };

  byOutcome: {
    hit: Record<SprayZone, number>;
    out: Record<SprayZone, number>;
    homeRun: Record<SprayZone, number>;
  };
}

interface SprayZoneStats {
  totalBattedBalls: number;
  hits: number;
  outs: number;
  homeRuns: number;
  doubles: number;
  triples: number;
  battingAverage: number;        // Hits / (Hits + Outs)
  slugging: number;
  avgExitVelocity?: number;      // If tracked
  avgDistance?: number;          // If tracked
}

interface BattedBallEvent {
  gameId: string;
  inning: number;
  batterId: string;
  pitcherId: string;
  batterHandedness: 'L' | 'R';

  // Location
  zone: SprayZone;
  distance: number;              // Feet from home plate
  angle: number;                 // Degrees from center

  // Outcome
  outcome: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOME_RUN' | 'OUT';
  outType?: 'FLY' | 'GROUND' | 'LINE' | 'POP';

  // Optional advanced data
  exitVelocity?: number;
  launchAngle?: number;
  hangTime?: number;
}
```

### 4.3 Spray Chart Visualization

```typescript
interface SprayChartVisualization {
  // Stadium outline with zones
  stadiumSVG: string;

  // Heat map overlay options
  heatMapMode: 'HITS' | 'HOME_RUNS' | 'BATTING_AVG' | 'EXIT_VELO';

  // Filters
  filters: {
    handedness?: 'L' | 'R' | 'ALL';
    dateRange?: { start: string; end: string };
    batterId?: string;           // Show specific player's spray
    pitcherId?: string;          // Show results vs specific pitcher
  };

  // Display options
  showIndividualDots: boolean;   // Plot each batted ball
  showZoneStats: boolean;        // Overlay stats per zone
  showDistanceRings: boolean;    // Concentric distance markers
}

// Render spray chart with heat map
function renderSprayChart(
  stadium: Stadium,
  options: SprayChartVisualization
): SVGElement {
  // 1. Draw stadium outline with dimensions
  const svg = createStadiumOutline(stadium.dimensions);

  // 2. Add zone overlays with color intensity based on selected metric
  for (const zone of SPRAY_ZONES) {
    const stats = getFilteredZoneStats(stadium.sprayChart, zone, options.filters);
    const intensity = calculateIntensity(stats, options.heatMapMode);
    addZoneOverlay(svg, zone, intensity);
  }

  // 3. Optionally plot individual batted balls
  if (options.showIndividualDots) {
    for (const ball of getFilteredBattedBalls(stadium.sprayChart, options.filters)) {
      addBattedBallDot(svg, ball);
    }
  }

  return svg;
}
```

### 4.4 Spray Chart Updates

```typescript
// Called after each batted ball event
function recordBattedBall(
  stadium: Stadium,
  event: BattedBallEvent
): void {
  // Add to raw events
  stadium.sprayChart.battedBalls.push(event);

  // Update zone aggregates
  updateZoneStats(stadium.sprayChart.zones[event.zone], event);

  // Update handedness splits
  const handednessChart = event.batterHandedness === 'L'
    ? stadium.sprayChart.byHandedness.left
    : stadium.sprayChart.byHandedness.right;
  updateZoneStats(handednessChart[event.zone], event);

  // Update outcome buckets
  if (isHit(event.outcome)) {
    stadium.sprayChart.byOutcome.hit[event.zone]++;
  } else {
    stadium.sprayChart.byOutcome.out[event.zone]++;
  }
  if (event.outcome === 'HOME_RUN') {
    stadium.sprayChart.byOutcome.homeRun[event.zone]++;
  }

  // Trim old events if needed (keep last N games worth)
  trimOldBattedBalls(stadium.sprayChart, MAX_BATTED_BALL_HISTORY);
}
```

---

## 5. Stadium Records

### 5.1 Record Categories

```typescript
interface StadiumRecords {
  // Single-game records
  singleGame: SingleGameRecords;

  // Home run records
  homeRuns: HomeRunRecords;

  // Pitching records
  pitching: PitchingRecords;

  // Career records at this stadium
  career: CareerStadiumRecords;

  // Team records
  team: TeamStadiumRecords;
}

interface SingleGameRecords {
  // Offensive
  mostRuns: RecordEntry;              // Most runs in a game
  mostHits: RecordEntry;              // Most hits in a game
  mostHomeRuns: RecordEntry;          // Most HRs (both teams)
  mostDoubles: RecordEntry;
  mostTriples: RecordEntry;
  mostStolenBases: RecordEntry;

  // Individual
  mostHitsByPlayer: RecordEntry;      // Individual hits
  mostRBIsByPlayer: RecordEntry;      // Individual RBIs
  mostHRsByPlayer: RecordEntry;       // Individual HRs (usually 3-4)

  // Pitching
  mostStrikeouts: RecordEntry;        // Individual K's
  mostInningsPitched: RecordEntry;
}

interface HomeRunRecords {
  // Distance records by zone
  longestByZone: Record<SprayZone, HRDistanceRecord>;

  // Overall longest
  longestOverall: HRDistanceRecord;

  // Most HRs hit at this stadium (career)
  mostCareerHRs: Array<{
    playerId: string;
    playerName: string;
    count: number;
    team: string;
  }>;

  // Total HRs at stadium
  totalHomeRuns: number;

  // Grand slams
  grandSlams: Array<{
    playerId: string;
    playerName: string;
    date: string;
    offPitcher: string;
    inning: number;
    team: string;
  }>;
}

interface HRDistanceRecord {
  distance: number;
  playerId: string;
  playerName: string;
  team: string;
  date: string;
  season: number;
  offPitcher: string;
  pitcherTeam: string;
  situation: string;             // '2-run HR in 7th', 'Walk-off'
  zone: SprayZone;
}
```

### 5.2 Record Entry Structure

```typescript
interface RecordEntry {
  value: number;

  // Could be player, team, or game-based
  holder: {
    type: 'PLAYER' | 'TEAM' | 'GAME';
    id: string;
    name: string;
  };

  // Context
  date: string;
  season: number;
  gameId: string;
  opponent?: string;

  // For player records
  team?: string;

  // Description
  details: string;

  // Previous record (for history)
  previousRecord?: {
    value: number;
    holder: string;
    date: string;
  };
}
```

### 5.3 Record Checking

```typescript
// Called after each game to check for new records
function checkStadiumRecords(
  stadium: Stadium,
  gameResult: GameResult
): RecordUpdate[] {
  const updates: RecordUpdate[] = [];

  // Check single-game records
  if (gameResult.totalRuns > stadium.records.singleGame.mostRuns.value) {
    updates.push(createRecordUpdate('SINGLE_GAME_RUNS', gameResult));
  }

  // Check individual player performances
  for (const player of gameResult.playerStats) {
    if (player.hits > stadium.records.singleGame.mostHitsByPlayer.value) {
      updates.push(createRecordUpdate('PLAYER_HITS', player, gameResult));
    }

    if (player.homeRuns > stadium.records.singleGame.mostHRsByPlayer.value) {
      updates.push(createRecordUpdate('PLAYER_HRS', player, gameResult));
    }
  }

  // Check HR distance records
  for (const hr of gameResult.homeRuns) {
    const zone = hr.zone;
    if (hr.distance > stadium.records.homeRuns.longestByZone[zone].distance) {
      updates.push(createRecordUpdate('HR_DISTANCE_ZONE', hr, zone));
    }

    if (hr.distance > stadium.records.homeRuns.longestOverall.distance) {
      updates.push(createRecordUpdate('HR_DISTANCE_OVERALL', hr));
    }
  }

  return updates;
}
```

### 5.4 Record Notifications

```typescript
interface RecordUpdate {
  recordType: StadiumRecordType;
  newValue: number;
  previousValue: number;
  holder: string;
  details: string;

  // For narrative system
  narrativePriority: 'HIGH' | 'MEDIUM' | 'LOW';
  narrativeHook: string;  // 'STADIUM_RECORD_BROKEN'
}

// Stadium records feed into narrative system
function generateRecordNarrative(update: RecordUpdate): NarrativePrompt {
  return {
    type: 'STADIUM_RECORD',
    priority: update.narrativePriority,
    context: {
      record: update.recordType,
      newValue: update.newValue,
      previousValue: update.previousValue,
      previousHolder: update.details,
      newHolder: update.holder
    }
  };
}
```

---

## 6. WAR Integration

### 6.1 Park-Adjusted WAR

Park factors are essential for fair WAR comparisons between players in different home parks.

```typescript
// From BWAR_CALCULATION_SPEC.md - now fully implemented
function applyParkFactor(
  rawValue: number,
  stat: StatType,
  stadium: Stadium,
  handedness: 'L' | 'R'
): number {
  const parkFactor = getEffectiveParkFactor(stadium, stat, handedness);

  // Adjust raw value to neutral park
  // If parkFactor > 1.00, park inflates stat, so we deflate the value
  // If parkFactor < 1.00, park suppresses stat, so we inflate the value
  return rawValue / parkFactor;
}

// Example: Player hits 35 HR in a hitter-friendly park (PF: 1.15)
// Park-adjusted HR = 35 / 1.15 = 30.4 HR
// This is fairer comparison to players in neutral parks
```

### 6.2 WAR Components Affected

```typescript
interface ParkAdjustedWARComponents {
  // Batting
  wRAA: number;           // Park-adjusted runs above average
  wRC: number;            // Park-adjusted runs created
  wOBA: number;           // Park-adjusted weighted OBA

  // For display
  parkAdjustment: number; // Total runs added/subtracted by park adjustment

  // Home/road splits for context
  homeWAR: number;
  roadWAR: number;
}

function calculateParkAdjustedBWAR(
  player: Player,
  season: Season
): ParkAdjustedWARComponents {
  const homeStadium = getHomeStadium(player.teamId);
  const handedness = player.bats;

  // Get relevant park factors
  const runsFactor = getEffectiveParkFactor(homeStadium, 'runs', handedness);
  const hrFactor = handedness === 'L'
    ? homeStadium.parkFactors.leftHandedHR
    : homeStadium.parkFactors.rightHandedHR;

  // Apply adjustments to home stats only
  const adjustedHomeStats = adjustStatsForPark(player.homeStats, homeStadium, handedness);

  // Road stats stay as-is (assumed neutral aggregate)
  const roadStats = player.roadStats;

  // Combine for total
  const totalAdjustedStats = combineStats(adjustedHomeStats, roadStats);

  // Calculate WAR from adjusted stats
  return calculateWARFromStats(totalAdjustedStats);
}
```

### 6.3 Pitcher Park Adjustments

```typescript
function calculateParkAdjustedPWAR(
  pitcher: Player,
  season: Season
): number {
  const homeStadium = getHomeStadium(pitcher.teamId);

  // ERA adjustment
  const runsFactor = homeStadium.parkFactors.runs;
  const adjustedERA = pitcher.homeERA / runsFactor;

  // FIP adjustment (HR component)
  const hrFactor = homeStadium.parkFactors.homeRuns;
  const adjustedHRRate = pitcher.homeHRRate / hrFactor;

  // Recalculate FIP with adjusted HR rate
  const adjustedFIP = calculateFIP({
    ...pitcher.homeStats,
    hrRate: adjustedHRRate
  });

  // Continue with pWAR calculation using adjusted values
  return calculatePWARFromAdjustedStats(pitcher, adjustedFIP, adjustedERA);
}
```

### 6.4 Multi-Team Players

```typescript
// Players traded mid-season need weighted park adjustments
function calculateMultiTeamParkAdjustment(
  player: Player,
  stints: TeamStint[]
): number {
  let totalAdjustment = 0;

  for (const stint of stints) {
    const stadium = getHomeStadium(stint.teamId);
    const homeGames = stint.homeGames;
    const totalGames = stint.games;

    // Weight by proportion of games at each home park
    const stintAdjustment = calculateParkAdjustment(
      stint.stats,
      stadium,
      player.bats
    );

    totalAdjustment += stintAdjustment * (homeGames / totalGames);
  }

  return totalAdjustment;
}
```

---

## 7. Game Simulation Integration

### 7.1 Simulation Modifiers

Park factors modify outcome probabilities during game simulation.

```typescript
interface SimulationParkModifiers {
  // Batting outcome modifiers
  homeRunChance: number;         // Multiply base HR probability
  doubleChance: number;          // Multiply base 2B probability
  tripleChance: number;          // Multiply base 3B probability
  hitChance: number;             // Multiply base hit probability

  // Per-handedness modifiers
  byHandedness: {
    left: BattingModifiers;
    right: BattingModifiers;
  };

  // Pitching modifiers
  strikeoutChance: number;
  walkChance: number;
}

function getSimulationModifiers(stadium: Stadium): SimulationParkModifiers {
  const pf = stadium.parkFactors;

  return {
    homeRunChance: pf.homeRuns,
    doubleChance: pf.doubles,
    tripleChance: pf.triples,
    hitChance: pf.hits,

    byHandedness: {
      left: {
        homeRunChance: pf.leftHandedHR,
        hitChance: pf.leftHandedAVG
      },
      right: {
        homeRunChance: pf.rightHandedHR,
        hitChance: pf.rightHandedAVG
      }
    },

    strikeoutChance: pf.strikeouts,
    walkChance: pf.walks
  };
}
```

### 7.2 Plate Appearance Resolution

```typescript
// In game simulation, apply park factors to outcome determination
function resolvePlateAppearance(
  batter: Player,
  pitcher: Player,
  stadium: Stadium,
  context: GameContext
): PlateAppearanceResult {
  // Get base probabilities from batter/pitcher matchup
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
    // Out probability adjusts to maintain total = 1.00
  };

  // Normalize probabilities
  const normalized = normalizeProbabilities(adjustedProbs);

  // Roll for outcome
  return selectOutcome(normalized);
}
```

### 7.3 HR Distance Simulation

```typescript
// When HR occurs, simulate distance based on park
function simulateHRDistance(
  batter: Player,
  stadium: Stadium,
  zone: SprayZone
): number {
  // Base distance from batter power rating
  const basePower = batter.ratings.power;  // 0-99
  const baseDistance = 350 + (basePower * 1.5);  // 350-498 range

  // Add randomness
  const variance = gaussianRandom(0, 25);  // ±25 feet typical

  // Wall distance affects "just over" vs "crushed" perception
  const wallDistance = stadium.dimensions[zoneToField(zone)].distance;

  // If barely over wall, cap at wall + small amount
  const rawDistance = baseDistance + variance;
  const effectiveDistance = Math.max(rawDistance, wallDistance + 5);

  return Math.round(effectiveDistance);
}
```

### 7.4 Post-Game Park Factor Update

```typescript
// After each home game, update stadium's park factors
async function postGameParkFactorUpdate(
  stadium: Stadium,
  gameResult: GameResult
): Promise<void> {
  // Add game to stadium history
  stadium.stats.gamesPlayed++;

  // Record batted balls for spray chart
  for (const battedBall of gameResult.battedBalls) {
    recordBattedBall(stadium, battedBall);
  }

  // Recalculate park factors if enough new data
  if (shouldRecalculateParkFactors(stadium)) {
    const newFactors = calculateParkFactors(stadium);

    // Blend with existing (smooths out single-game variance)
    stadium.parkFactors = blendParkFactors(
      stadium.parkFactors,
      newFactors,
      BLEND_WEIGHT_NEW_DATA
    );

    stadium.parkFactors.lastUpdated = new Date().toISOString();
  }

  // Check for stadium records
  const recordUpdates = checkStadiumRecords(stadium, gameResult);
  if (recordUpdates.length > 0) {
    await notifyRecordUpdates(recordUpdates);
  }
}
```

---

## 8. UI Components

### 8.1 Stadium Tab Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ORACLE PARK                                    [Giants Home] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────┐ │
│  │      SPRAY CHART        │  │     PARK FACTORS         │ │
│  │                         │  │                          │ │
│  │    [Stadium Outline     │  │  Overall:    0.92 ▼      │ │
│  │     with heat map]      │  │  Runs:       0.90 ▼      │ │
│  │                         │  │  Home Runs:  0.85 ▼▼     │ │
│  │   LF: 339  CF: 399      │  │  Hits:       0.97 -      │ │
│  │        RF: 309          │  │  Doubles:    1.02 ▲      │ │
│  │                         │  │  Triples:    1.15 ▲▲     │ │
│  │  [Filter: ALL | LHB |   │  │                          │ │
│  │           RHB]          │  │  LHB HR:     0.78 ▼▼     │ │
│  │                         │  │  RHB HR:     0.92 ▼      │ │
│  └─────────────────────────┘  │                          │ │
│                               │  📊 High confidence      │ │
│                               │     (127 games)          │ │
│                               └──────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   STADIUM RECORDS                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  🏠 Longest HR: 485 ft - Giancarlo Stanton (S2)      │  │
│  │  📍 By Zone:                                          │  │
│  │     LF: 472 ft (W. Mays)  CF: 485 ft (Stanton)       │  │
│  │     RF: 425 ft (M. Trout)                            │  │
│  │                                                       │  │
│  │  🏆 Most Career HRs Here:                            │  │
│  │     1. Willie Mays - 23    2. Buster Posey - 18      │  │
│  │     3. Brandon Crawford - 15                          │  │
│  │                                                       │  │
│  │  📊 Single Game Records:                             │  │
│  │     Most Runs: 18 (Giants vs Dodgers, S2)            │  │
│  │     Most HRs: 7 (Giants vs Dodgers, S3)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              HISTORICAL PARK FACTORS                  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Season │ Overall │  HR   │ Runs  │ Notes            │  │
│  │  ───────┼─────────┼───────┼───────┼─────────────────  │  │
│  │    S3   │  0.92   │ 0.85  │ 0.90  │ Current          │  │
│  │    S2   │  0.94   │ 0.88  │ 0.92  │ HR factor ▼3%   │  │
│  │    S1   │  0.93   │ 0.87  │ 0.91  │ First season     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Park Factor Indicators

```typescript
// Visual indicators for park factors
function getParkFactorIndicator(factor: number): string {
  if (factor >= 1.10) return '▲▲';      // Strong hitter's park
  if (factor >= 1.03) return '▲';       // Slight hitter's park
  if (factor <= 0.90) return '▼▼';      // Strong pitcher's park
  if (factor <= 0.97) return '▼';       // Slight pitcher's park
  return '-';                            // Neutral
}

function getParkFactorColor(factor: number): string {
  if (factor >= 1.05) return '#22c55e';  // Green - hitter friendly
  if (factor <= 0.95) return '#ef4444';  // Red - pitcher friendly
  return '#94a3b8';                       // Gray - neutral
}
```

### 8.3 Spray Chart Filters

```typescript
interface SprayChartFilterUI {
  // Handedness toggle
  handedness: 'ALL' | 'LHB' | 'RHB';

  // Heat map mode selector
  heatMapMode: 'HITS' | 'AVG' | 'HR' | 'SLG';

  // Player-specific view
  selectedPlayer?: string;

  // Time range
  timeRange: 'SEASON' | 'ALL_TIME' | 'LAST_30';

  // Show options
  showDots: boolean;
  showZoneStats: boolean;
  showWallDistances: boolean;
}
```

### 8.4 Player Context UI

When viewing a player's stats, show park-adjusted values:

```
┌─────────────────────────────────────────────┐
│ Mike Trout - Season Stats                   │
├─────────────────────────────────────────────┤
│              Raw    Park-Adj   (Home Park)  │
│  HR:         35  →    30        ▼ -5       │
│  AVG:       .280  →  .273       ▼ -7 pts   │
│  OPS:       .920  →  .895       ▼          │
│  wRC+:       145  →   138                   │
│                                             │
│  📍 Home: Angel Stadium (PF: 1.08)         │
│     "Hitter-friendly, inflates HR by 8%"   │
└─────────────────────────────────────────────┘
```

---

## 9. Data Storage

### 9.1 Stadium Collection Schema

```typescript
// Firestore structure
interface StadiumDocument {
  // /stadiums/{stadiumId}
  id: string;
  name: string;
  teamId: string;
  dimensions: StadiumDimensions;
  parkFactors: ParkFactors;
  stats: StadiumStats;
  records: StadiumRecords;
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
}

// Subcollections
// /stadiums/{stadiumId}/seasons/{seasonId} - Historical park factors
// /stadiums/{stadiumId}/battedBalls/{ballId} - Spray chart events (if storing individually)
// /stadiums/{stadiumId}/moments/{momentId} - Notable moments
```

### 9.2 Batted Ball Event Storage

```typescript
// Option A: Store in game results (recommended for most cases)
interface GameResult {
  // ... other fields
  battedBalls: BattedBallEvent[];  // Embedded array
}

// Option B: Separate collection for detailed analysis
// /battedBalls/{eventId}
interface BattedBallDocument {
  stadiumId: string;
  gameId: string;
  // ... event details
}

// Spray chart aggregates are computed and cached
// Recalculated periodically or on-demand
```

### 9.3 Sync Strategy

```typescript
// Stadium data rarely changes, can be cached aggressively
const STADIUM_CACHE_CONFIG = {
  dimensions: 'PERMANENT',           // Never changes
  parkFactors: 'DAILY',              // Update once per day
  sprayChart: 'ON_DEMAND',           // Fetch when viewing stadium tab
  records: 'AFTER_GAME',             // Check after each home game
};
```

---

## 10. Open Questions

### 10.1 Resolved

| Question | Resolution |
|----------|------------|
| Static vs dynamic park factors? | **Dynamic** - calculated from game data, blended with seed values |
| Per-handedness tracking? | **Yes** - separate HR and AVG factors for LHB/RHB |
| Spray chart granularity? | **7 zones** - provides good detail without over-complication |
| Historical tracking? | **Yes** - snapshot park factors each season |

### 10.2 Open

| Question | Options | Notes |
|----------|---------|-------|
| How much batted ball data to store? | (A) All events, (B) Aggregates only, (C) Rolling window | Storage vs analysis tradeoff |
| Allow user to view opponent park factors? | (A) Yes always, (B) Only after playing there, (C) Scouting required | Affects strategy depth |

### 10.2.1 Resolved - SMB4 Limitations (January 23, 2026)

| Question | Resolution | Notes |
|----------|------------|-------|
| Weather effects? | **N/A - Not in SMB4** | SMB4 has no weather elements. Only day/night toggle exists (cosmetic only). |
| Altitude adjustment? | **(A) Baked into park factor** | If relevant, altitude effects are included in overall park factor, not tracked separately. |

### 10.3 Future Enhancements

1. **Day/Night splits** - Some parks may play differently under lights (track but cosmetic in SMB4)
2. ~~**Month-by-month factors** - Weather affects early/late season~~ N/A - No weather in SMB4
3. **Fly ball vs ground ball park types** - More granular pitcher fit analysis
4. **Fan experience factors** - Noise level affecting player performance
5. **Ballpark "quirks"** - Manual override for unusual features (Pesky Pole, etc.)

---

## Appendix A: Sample Stadium Data

```typescript
const ORACLE_PARK: Stadium = {
  id: 'stadium-oracle-park',
  name: 'Oracle Park',
  teamId: 'team-giants',

  dimensions: {
    leftField: { distance: 339, wallHeight: 'High' },
    leftCenter: { distance: 364, wallHeight: 'Med' },
    center: { distance: 399, wallHeight: 'Med' },
    rightCenter: { distance: 365, wallHeight: 'Med' },
    rightField: { distance: 309, wallHeight: 'High', wallHeightFeet: 24 },
    foulTerritory: 'Large',
    features: [
      { name: 'McCovey Cove', zone: 'RIGHT_FIELD', effect: 'Splash hits tracked' },
      { name: 'Triples Alley', zone: 'RIGHT_CENTER', effect: 'Increases triples' }
    ]
  },

  parkFactors: {
    overall: 0.92,
    runs: 0.90,
    homeRuns: 0.85,
    hits: 0.97,
    doubles: 1.02,
    triples: 1.15,
    strikeouts: 1.03,
    walks: 0.98,
    leftHandedHR: 0.78,
    rightHandedHR: 0.92,
    leftHandedAVG: 0.96,
    rightHandedAVG: 0.98,
    gamesIncluded: 127,
    lastUpdated: '2026-01-20',
    confidence: 'HIGH',
    source: 'CALCULATED'
  },

  // ... other fields
};
```

---

## Appendix B: Park Factor Calculation Example

```typescript
// Example: Calculating HR park factor for Oracle Park

// Data from 81 home games:
// - Giants hit 85 HR at home
// - Opponents hit 72 HR at home
// - Total: 157 HR in 81 games = 1.94 HR/game

// Same teams' road games (81 games):
// - Giants hit 102 HR on road
// - Those opponents allowed 95 HR at their parks
// - Total: 197 HR in 81 games = 2.43 HR/game

// Park Factor = Home rate / Road rate
// HR PF = 1.94 / 2.43 = 0.80

// Apply regression (small sample)
// Regressed PF = (0.80 × 0.8) + (1.00 × 0.2) = 0.84

// Final Oracle Park HR factor: 0.84 (strong pitcher's park for HR)
```

---

*This specification defines how stadium analytics enhance the KBL tracker with meaningful park context for player evaluation, game simulation, and historical tracking.*
