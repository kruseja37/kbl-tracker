# KBL XHD Tracker - Master Specification CORRECTIONS v2

This document addresses all corrections and clarifications from feedback on v2.0.

---

## 1. Pitcher vs Position Player Traits

**ADDITION:** Logic must distinguish which traits apply to pitchers only, position players only, or both.

### Pitcher-Only Traits

| Trait | Category | Type |
|-------|----------|------|
| K Collector | Competitive | Positive |
| K Neglecter | Competitive | Negative |
| Gets Ahead | Scholarly | Positive |
| Falls Behind | Scholarly | Negative |
| Elite 4F | Scholarly | Positive |
| Elite 2F | Scholarly | Positive |
| Elite CF | Scholarly | Positive |
| Elite FK | Scholarly | Positive |
| Elite SL | Scholarly | Positive |
| Elite CB | Scholarly | Positive |
| Elite CH | Scholarly | Positive |
| Elite SB | Scholarly | Positive |
| BB Prone | Disciplined | Negative |
| Wild Thing | Spirited | Negative |
| Rally Stopper | Spirited | Positive |
| Meltdown | Spirited | Negative |

### Position Player-Only Traits

| Trait | Category | Type |
|-------|----------|------|
| Stealer | Crafty | Positive |
| Easy Target | Crafty | Negative |
| Base Rounder | Disciplined | Positive |
| Base Jogger | Disciplined | Negative |
| Pinch Perfect | Disciplined | Positive |
| Fastball Hitter | Disciplined | Positive |
| Off-Speed Hitter | Disciplined | Positive |
| Low Pitch | Disciplined | Positive |
| High Pitch | Disciplined | Positive |
| Inside Pitch | Disciplined | Positive |
| Outside Pitch | Disciplined | Positive |
| Metal Head | Disciplined | Positive |
| Rally Starter | Spirited | Positive |
| RBI Hero | Spirited | Positive |
| RBI Zero | Spirited | Negative |
| CON vs LHP | Spirited | Positive |
| CON vs RHP | Spirited | Positive |
| POW vs LHP | Spirited | Positive |
| POW vs RHP | Spirited | Positive |
| Ace Exterminator | Scholarly | Positive |
| Bunter | Scholarly | Positive |
| Big Hack | Scholarly | Positive |
| Little Hack | Scholarly | Positive |

### Universal Traits (Both Pitchers and Position Players)

| Trait | Category | Type |
|-------|----------|------|
| Cannon Arm | Competitive | Positive |
| Noodle Arm | Competitive | Negative |
| Durable | Competitive | Positive |
| Injury Prone | Competitive | Negative |
| First Pitch Slayer | Competitive | Positive |
| First Pitch Prayer | Competitive | Negative |
| Sprinter | Competitive | Positive |
| Slow Poke | Competitive | Negative |
| Tough Out | Competitive | Positive |
| Whiffer | Competitive | Negative |
| Stimulated | Crafty | Positive |
| Specialist | Crafty | Positive |
| Reverse Splits | Crafty | Positive |
| Pick Officer | Crafty | Positive |
| Sign Stealer | Crafty | Positive |
| Mind Gamer | Crafty | Positive |
| Distractor | Crafty | Positive |
| Bad Ball Hitter | Crafty | Positive |
| Bad Jumps | Crafty | Negative |
| Easy Jumps | Crafty | Negative |
| Wild Thrower | Crafty | Negative |
| Composed | Disciplined | Positive |
| Magic Hands | Disciplined | Positive |
| Consistent | Disciplined | Positive |
| Butter Fingers | Disciplined | Negative |
| Volatile | Disciplined | Negative |
| Two Way | Spirited | Positive |
| Clutch | Spirited | Positive |
| Choker | Spirited | Negative |
| Dive Wizard | Spirited | Positive |
| Surrounded | Spirited | Negative |
| Utility | Scholarly | Positive |
| Crossed Up | Scholarly | Negative |

### Implementation

```javascript
const PITCHER_ONLY_TRAITS = [
  'K Collector', 'K Neglecter', 'Gets Ahead', 'Falls Behind',
  'Elite 4F', 'Elite 2F', 'Elite CF', 'Elite FK', 'Elite SL',
  'Elite CB', 'Elite CH', 'Elite SB', 'BB Prone', 'Wild Thing',
  'Rally Stopper', 'Meltdown'
];

const POSITION_PLAYER_ONLY_TRAITS = [
  'Stealer', 'Easy Target', 'Base Rounder', 'Base Jogger', 'Pinch Perfect',
  'Fastball Hitter', 'Off-Speed Hitter', 'Low Pitch', 'High Pitch',
  'Inside Pitch', 'Outside Pitch', 'Metal Head', 'Rally Starter',
  'RBI Hero', 'RBI Zero', 'CON vs LHP', 'CON vs RHP', 'POW vs LHP',
  'POW vs RHP', 'Ace Exterminator', 'Bunter', 'Big Hack', 'Little Hack'
];

function getEligibleTraits(player, traitType = 'all') {
  const isPitcher = player.primaryPosition === 'SP' ||
                    player.primaryPosition === 'RP' ||
                    player.primaryPosition === 'CP' ||
                    player.primaryPosition === 'SP/RP';
  const isTwoWay = player.primaryPosition === 'TWO-WAY';

  let eligiblePool = ALL_TRAITS;

  if (isPitcher && !isTwoWay) {
    eligiblePool = eligiblePool.filter(t => !POSITION_PLAYER_ONLY_TRAITS.includes(t.name));
  } else if (!isPitcher && !isTwoWay) {
    eligiblePool = eligiblePool.filter(t => !PITCHER_ONLY_TRAITS.includes(t.name));
  }
  // Two-way players can receive any trait

  if (traitType === 'positive') {
    eligiblePool = eligiblePool.filter(t => t.type === 'positive');
  } else if (traitType === 'negative') {
    eligiblePool = eligiblePool.filter(t => t.type === 'negative');
  }

  return eligiblePool.filter(t => !player.traits.includes(t.name));
}
```

---

## 2. Between-Season Roster Alterations

**ADDITION:** Before beginning Season 2, 3, 4, etc., allow roster modifications.

### Pre-Season Roster Management Screen

```
+---------------------------------------------------------------------------+
|  PRE-SEASON ROSTER MANAGEMENT - Season 4                                   |
+---------------------------------------------------------------------------+
|  Review and update rosters before the new season begins.                   |
|                                                                            |
|  TEAM: [Giants v]                                                          |
|                                                                            |
|  CURRENT ROSTER (25 players)                                               |
|  +-----------------+-------+-----+----------------------------------------+
|  | Player          | Pos   | Grd | Actions                                |
|  +-----------------+-------+-----+----------------------------------------+
|  | Barry Bonds     | LF    | A   | [Edit] [Trade] [Release] [Retire]      |
|  | Tom Seaver      | SP    | A+  | [Edit] [Trade] [Release] [Retire]      |
|  | ...             | ...   | ... | ...                                    |
|  +-----------------+-------+-----+----------------------------------------+
|                                                                            |
|  ACTIONS:                                                                  |
|  [+ ADD FREE AGENT]  [+ CREATE NEW PLAYER]  [IMPORT PLAYERS]               |
|                                                                            |
|  TRANSACTIONS THIS OFFSEASON:                                              |
|  * Released: Joe Smith (C)                                                 |
|  * Added: Mike Johnson (FA) to fill C spot                                 |
|  * Retired: Ken Griffey Jr. (elected to HOF)                               |
|                                                                            |
|                            [SAVE & CONTINUE TO SEASON]                     |
+---------------------------------------------------------------------------+
```

### Actions Available

1. **Edit Player** - Modify ratings, traits, positions (if needed)
2. **Trade** - Move player to another team
3. **Release** - Remove from roster (returns to free agent pool)
4. **Retire** - End player's career (triggers HOF/number retirement options)
5. **Add Free Agent** - Sign from available free agents
6. **Create New Player** - Add brand new player to database
7. **Import Players** - Bulk import from CSV

### Minimum Roster Requirements

Before starting the season:
- Each team must have minimum roster size (e.g., 25 players)
- Each team must have minimum pitchers (e.g., 5 SP + 4 RP minimum)
- Warning if roster imbalanced but allow override

---

## 3. Expanded Park Factors and Stadium Stats

**CORRECTION:** Stadium tracking needs to be more comprehensive, including spray charts.

### Stadium Data Structure

```javascript
const stadiumData = {
  id: 'stadium-001',
  name: 'Oracle Park',

  // Physical dimensions
  dimensions: {
    leftField: { distance: 339, wallHeight: 'High' },
    leftCenter: { distance: 364, wallHeight: 'Med' },
    center: { distance: 399, wallHeight: 'Med' },
    rightCenter: { distance: 365, wallHeight: 'Med' },
    rightField: { distance: 309, wallHeight: 'High' },
    foulTerritory: 'Large'  // Small, Medium, Large
  },

  // Park Factors (calculated from actual game data)
  parkFactors: {
    overall: 0.92,
    runs: 0.90,
    homeRuns: 0.85,
    hits: 0.97,
    doubles: 1.02,
    triples: 1.15,
    strikeouts: 1.03,
    walks: 0.98,
    // By handedness
    leftHandedHR: 0.78,  // Tough for LH hitters
    rightHandedHR: 0.92,
    // By field zone
    pullHR_LH: 0.95,     // LH pulling to RF
    pullHR_RH: 0.75,     // RH pulling to LF (deep with high wall)
    oppositeHR_LH: 0.70,
    oppositeHR_RH: 1.05,
  },

  // Aggregate stats at this stadium
  stats: {
    gamesPlayed: 45,

    // Batting
    batting: {
      avg: 0.258,
      obp: 0.325,
      slg: 0.410,
      ops: 0.735,
      homeRuns: 67,
      homeRunsPerGame: 1.49,
      runsPerGame: 4.2,
      hitsPerGame: 8.5,
      doublesPerGame: 1.8,
      triplesPerGame: 0.3,
    },

    // Pitching
    pitching: {
      era: 3.45,
      whip: 1.21,
      k9: 8.5,
      bb9: 2.8,
      hr9: 1.0,
    },

    // Hit distribution (for spray chart)
    hitDistribution: {
      groundBalls: 0.44,
      flyBalls: 0.35,
      lineDrives: 0.21,
      // By zone (9-zone grid)
      zones: {
        leftField: { hits: 89, hr: 12, avg: .285 },
        leftCenter: { hits: 72, hr: 8, avg: .275 },
        center: { hits: 68, hr: 15, avg: .270 },
        rightCenter: { hits: 75, hr: 10, avg: .280 },
        rightField: { hits: 82, hr: 22, avg: .290 },
      }
    }
  },

  // Notable events
  notableMoments: [
    { type: 'longestHR', distance: 465, playerId: 'p001', gameId: 'g023', date: '2024-06-15' },
    { type: 'noHitter', pitcherId: 'p015', gameId: 'g031', date: '2024-07-02' },
    { type: 'walkOff', playerId: 'p008', gameId: 'g018', type: 'HR', date: '2024-05-28' },
    { type: 'biggestBlowout', score: '15-2', winnerId: 'team-giants', gameId: 'g041' },
  ],

  // Records at this stadium
  records: {
    mostHRsGame: { value: 3, playerId: 'p001', date: '2024-04-12' },
    mostRBIsGame: { value: 7, playerId: 'p003', date: '2024-05-20' },
    mostKsGame: { value: 14, pitcherId: 'p015', date: '2024-07-02' },
    longestHR: { value: 465, playerId: 'p001', date: '2024-06-15' },
  }
};
```

### Stadium Stats UI

```
+---------------------------------------------------------------------------+
|  STADIUM - Oracle Park                                               [Edit]|
+---------------------------------------------------------------------------+
|                                                                            |
|  DIMENSIONS                          PARK FACTORS                          |
|  +-------------------------+         +---------------------------+         |
|  |    LF    LC   CF   RC  RF|        | Category    | Factor      |         |
|  |   339   364  399  365  309|        +-------------+-------------+         |
|  |  High   Med  Med  Med High|        | Overall     | 0.92        |         |
|  |                          |        | Runs        | 0.90        |         |
|  | Foul Territory: Large    |        | Home Runs   | 0.85        |         |
|  +-------------------------+         | Hits        | 0.97        |         |
|                                      | Doubles     | 1.02        |         |
|                                      | Triples     | 1.15        |         |
|                                      +---------------------------+         |
|                                                                            |
+---------------------------------------------------------------------------+
|  BATTING AT THIS PARK               PITCHING AT THIS PARK                  |
|  +---------------------------+      +---------------------------+          |
|  | AVG    | .258             |      | ERA    | 3.45             |          |
|  | OBP    | .325             |      | WHIP   | 1.21             |          |
|  | SLG    | .410             |      | K/9    | 8.5              |          |
|  | OPS    | .735             |      | BB/9   | 2.8              |          |
|  | HR/G   | 1.49             |      | HR/9   | 1.0              |          |
|  | R/G    | 4.2              |      |                          |          |
|  +---------------------------+      +---------------------------+          |
|                                                                            |
+---------------------------------------------------------------------------+
|  HIT DISTRIBUTION SPRAY CHART                                              |
|  +-----------------------------------------------------------+            |
|  |                         CF                                 |            |
|  |                    68 H / 15 HR                            |            |
|  |                      .270 AVG                              |            |
|  |                                                            |            |
|  |      LC                                    RC              |            |
|  |  72 H / 8 HR                          75 H / 10 HR         |            |
|  |   .275 AVG                              .280 AVG           |            |
|  |                                                            |            |
|  |  LF                                              RF        |            |
|  |  89 H / 12 HR                              82 H / 22 HR    |            |
|  |   .285 AVG                                  .290 AVG       |            |
|  |                                                            |            |
|  +-----------------------------------------------------------+            |
|                                                                            |
+---------------------------------------------------------------------------+
|  RECORDS AT THIS STADIUM                                                   |
|  * Most HRs (Game): 3 - Barry Bonds (4/12/24)                              |
|  * Most RBIs (Game): 7 - Ken Griffey Jr (5/20/24)                          |
|  * Most Ks (Game): 14 - Tom Seaver (7/2/24)                                |
|  * Longest HR: 465 ft - Barry Bonds (6/15/24)                              |
|                                                                            |
+---------------------------------------------------------------------------+
|  NOTABLE MOMENTS                                                           |
|  * No-Hitter: Tom Seaver (7/2/24)                                          |
|  * Walk-Off HR: Joe Carter (5/28/24)                                       |
|  * Biggest Blowout: Giants 15, Yankees 2 (8/10/24)                         |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

## 4. Player and Team Spray Charts

**ADDITION:** Spray charts for individual players and teams.

### Player Spray Chart Data

```javascript
const playerSprayChart = {
  playerId: 'player-001',
  seasonId: 'season-3',

  // Overall hit distribution
  overall: {
    totalBattedBalls: 245,
    groundBalls: 98,      // 40%
    lineDrives: 54,       // 22%
    flyBalls: 93,         // 38%
  },

  // By field zone (5 zones: LF, LC, C, RC, RF)
  byZone: {
    leftField: {
      battedBalls: 62,
      hits: 28,
      singles: 18,
      doubles: 6,
      triples: 1,
      homeRuns: 3,
      avg: .452,
      slg: .774,
    },
    leftCenter: {
      battedBalls: 48,
      hits: 19,
      singles: 12,
      doubles: 5,
      triples: 1,
      homeRuns: 1,
      avg: .396,
      slg: .604,
    },
    center: {
      battedBalls: 45,
      hits: 15,
      singles: 9,
      doubles: 3,
      triples: 0,
      homeRuns: 3,
      avg: .333,
      slg: .600,
    },
    rightCenter: {
      battedBalls: 42,
      hits: 16,
      singles: 10,
      doubles: 4,
      triples: 0,
      homeRuns: 2,
      avg: .381,
      slg: .619,
    },
    rightField: {
      battedBalls: 48,
      hits: 22,
      singles: 14,
      doubles: 5,
      triples: 0,
      homeRuns: 3,
      avg: .458,
      slg: .729,
    },
  },

  // Pull/Center/Opposite tendencies
  tendency: {
    pull: 0.42,       // % of batted balls to pull side
    center: 0.22,     // % to center
    opposite: 0.36,   // % to opposite field
  },

  // Home runs by distance
  homeRunsByDistance: [
    { distance: 380, zone: 'leftField', date: '2024-04-15' },
    { distance: 425, zone: 'center', date: '2024-05-02' },
    // ...
  ],
};
```

### Player Spray Chart UI

```
+---------------------------------------------------------------------------+
|  SPRAY CHART - Barry Bonds (Season 3)                                      |
+---------------------------------------------------------------------------+
|                                                                            |
|  BATTED BALL DISTRIBUTION                                                  |
|  Ground Balls: 40% | Line Drives: 22% | Fly Balls: 38%                     |
|                                                                            |
|  Pull: 42% | Center: 22% | Opposite: 36%                                   |
|                                                                            |
|  +-----------------------------------------------------------+            |
|  |                         CF                                 |            |
|  |                    15 H / 3 HR                             |            |
|  |                     .333 / .600                            |            |
|  |                                                            |            |
|  |      LC                                    RC              |            |
|  |  19 H / 1 HR                          16 H / 2 HR          |            |
|  |  .396 / .604                          .381 / .619          |            |
|  |                                                            |            |
|  |  LF (Pull)                                   RF (Oppo)     |            |
|  |  28 H / 3 HR                              22 H / 3 HR      |            |
|  |  .452 / .774                              .458 / .729      |            |
|  |                                                            |            |
|  +-----------------------------------------------------------+            |
|                                                                            |
|  HOME RUN DISTANCES                                                        |
|  Avg: 412 ft | Max: 465 ft | Min: 355 ft                                   |
|                                                                            |
|  [View by Stadium] [View Career] [Compare to League Avg]                   |
+---------------------------------------------------------------------------+
```

### Team Spray Chart

Similar structure but aggregated across all batters on the team.

---

## 5. Retired Numbers and Hall of Fame

**ADDITION:** Add to Team History Tab.

### Team History Tab - Retired Numbers Section

```
+---------------------------------------------------------------------------+
|  TEAM HISTORY - Giants                                                     |
+---------------------------------------------------------------------------+
|  [Championships] [Season Records] [Retired Numbers] [Hall of Fame]         |
+---------------------------------------------------------------------------+
|                                                                            |
|  RETIRED NUMBERS                                                           |
|  +-------+-------------------+------------+----------------------------+   |
|  | #     | Player            | Years      | Ceremony Date              |   |
|  +-------+-------------------+------------+----------------------------+   |
|  | 24    | Willie Mays       | 1951-1972  | Retired S1                 |   |
|  | 25    | Barry Bonds       | 1986-2007  | Retired S3                 |   |
|  | 44    | Willie McCovey    | 1959-1980  | Retired S1                 |   |
|  +-------+-------------------+------------+----------------------------+   |
|                                                         [RETIRE A NUMBER]  |
|                                                                            |
+---------------------------------------------------------------------------+
|                                                                            |
|  HALL OF FAME INDUCTEES (from this team)                                   |
|  +-------------------+------------+---------------+----------------------+ |
|  | Player            | Position   | Career WAR    | Inducted             | |
|  +-------------------+------------+---------------+----------------------+ |
|  | Willie Mays       | CF         | 156.2         | S1 (Charter)         | |
|  | Barry Bonds       | LF         | 162.8         | S3                   | |
|  +-------------------+------------+---------------+----------------------+ |
|                                                                            |
+---------------------------------------------------------------------------+
```

### Retire Number Flow

When a player retires:

```
+---------------------------------------------------------------------------+
|  PLAYER RETIREMENT - Barry Bonds                                           |
+---------------------------------------------------------------------------+
|  Barry Bonds has retired after 22 seasons.                                 |
|                                                                            |
|  Career Highlights:                                                        |
|  * WAR: 162.8 (1st all-time)                                               |
|  * Home Runs: 762 (1st all-time)                                           |
|  * MVPs: 7                                                                 |
|  * All-Star Selections: 14                                                 |
|                                                                            |
|  RETIREMENT OPTIONS:                                                       |
|                                                                            |
|  [ ] Retire Jersey Number (#25) for Giants                                 |
|  [ ] Elect to Hall of Fame                                                 |
|                                                                            |
|  Note: Hall of Fame eligibility typically requires exceptional career      |
|  numbers. This player's WAR of 162.8 qualifies.                            |
|                                                                            |
|                            [SKIP]  [CONFIRM SELECTIONS]                    |
+---------------------------------------------------------------------------+
```

### Hall of Fame Criteria (Suggested)

| Threshold | Requirement |
|-----------|-------------|
| Career WAR | 50+ |
| MVP Awards | 1+ |
| All-Star Selections | 5+ |
| Or | User override (any player) |

---

## 6. POG Incorporated into Fame/Narrative

**CORRECTION:** POG should contribute to Fame/Narrative for All-Star and awards voting.

### POG Fame Integration

```javascript
function calculatePOGFameBonus(player, seasonStats) {
  let pogFameBonus = 0;

  // 1st place POG finishes
  if (seasonStats.pogFirstPlace >= 10) pogFameBonus += 2;
  else if (seasonStats.pogFirstPlace >= 5) pogFameBonus += 1;

  // Top 3 POG finishes total
  const totalTop3 = seasonStats.pogFirstPlace + seasonStats.pogSecondPlace + seasonStats.pogThirdPlace;
  if (totalTop3 >= 20) pogFameBonus += 1;

  // Season POG leader bonus
  if (player.isSeasonPOGLeader) pogFameBonus += 2;

  return pogFameBonus;
}
```

### POG Tracking in Narrative Component

| POG Achievement | Fame Bonus |
|-----------------|------------|
| 5+ 1st place POG finishes | +1 |
| 10+ 1st place POG finishes | +2 (total, not additional) |
| 20+ total top-3 POG finishes | +1 |
| Season POG Leader | +2 |

---

## 7. Clutch Trigger Corrections

### REMOVE: "Hit in 3-0 or 3-1 count"

**REMOVED:** This is not a clutch moment. A hitter's count does not inherently create pressure.

### ADD: Close Game Qualifier

**CORRECTION:** Most situational clutch moments should be qualified by close game (within 2 runs).

```javascript
function isCloseGame(scoreDifferential) {
  return Math.abs(scoreDifferential) <= 2;
}

function qualifiesForSituationalClutch(gameState, triggerType) {
  // These triggers REQUIRE close game
  const closeGameRequired = [
    'goAheadRBI_7thPlus',
    'gameTyingRBI_9thPlus',
    'basesLoadedHit',
    'twoOutRBI_RISP',
    'shutdownInning',
    'divingCatchOut',
    'sacFlyRunner_goAhead'
  ];

  // These triggers do NOT require close game
  const alwaysClutch = [
    'walkOff',        // By definition, game-ending
    'grandSlam',      // Always clutch
    'noHitter',
    'perfectGame',
    'completeGame',
    'saveConversion',
  ];

  if (alwaysClutch.includes(triggerType)) return true;
  if (closeGameRequired.includes(triggerType)) return isCloseGame(gameState.scoreDiff);
  return true;  // Default: allow
}
```

### Updated Clutch Triggers

| Trigger | Clutch Value | Close Game Required? |
|---------|--------------|----------------------|
| Walk-off single | +2 | No (inherent) |
| Walk-off XBH | +2 | No |
| Walk-off HR | +3 | No |
| Walk-off walk/HBP | +1 | No |
| Go-ahead RBI in 7th+ | +1 | **Yes** |
| Game-tying RBI in 9th+ | +2 | **Yes** |
| 2-out RBI (any inning) | +1 | **Yes** |
| Bases loaded hit | +1 | **Yes** |
| Grand slam | +2 | No |
| RBI with 2 outs and RISP | +1 | **Yes** |
| ~~Hit in 3-0 or 3-1 count~~ | ~~+1~~ | **REMOVED** |
| Hit on 0-2 count | +1 | **Yes** |

### NEW: Reliever Long Relief Clutch

**ADDITION:** Reliever throws 3+ innings giving up 1 run or less.

| Trigger | Clutch Value | Notes |
|---------|--------------|-------|
| Reliever 3+ IP, 0-1 ER | +2 | Bullpen saver, valuable even in blowouts |

```javascript
const longReliefClutch = {
  type: 'LONG_RELIEF_QUALITY',
  criteria: {
    isReliever: true,
    inningsPitched: { min: 3 },
    earnedRuns: { max: 1 }
  },
  clutchValue: 2,
  closeGameRequired: false,  // Valuable in ANY situation
  description: 'Quality long relief to save bullpen'
};
```

### Extended Hold Definition (7th Inning)

**CORRECTION:** Extend Hold designation to include 7th inning relievers.

```javascript
function qualifiesForHold(relieverStats, gameState) {
  return (
    relieverStats.enteredWith === 'lead' &&
    relieverStats.enteredInning >= 7 &&  // Changed from 8
    relieverStats.enteredInning <= 8 &&  // Not the save situation
    relieverStats.maintainedLead === true &&
    gameState.leadSize <= 3
  );
}
```

**Example Scenario:**
- 1-run lead entering 7th
- Reliever A pitches 7th (scoreless) -> **Hold + Clutch (+1 each)**
- Reliever B pitches 8th (scoreless) -> **Hold + Clutch (+1 each)**
- Reliever C pitches 9th (scoreless) -> **Save + Clutch (+1 each)**

If Reliever A pitches both 7th and 8th:
- **Hold** for getting through both
- **Clutch +2** for 2 scoreless innings in close game

### NEW: Inherited Runner Escape

**ADDITION:** Reliever comes in with RISP in close game and escapes clean.

| Trigger | Clutch Value | Close Game Required? |
|---------|--------------|----------------------|
| Reliever inherits RISP, escapes 0 runs | +1 | Yes |
| Reliever inherits bases loaded, escapes 0 runs | +2 | Yes |

```javascript
const inheritedRunnerEscape = {
  type: 'INHERITED_RUNNER_ESCAPE',
  criteria: {
    isReliever: true,
    inheritedRunnersScoring: { position: 'RISP' },
    inheritedRunnersAllowed: 0
  },
  clutchValue: 1,  // +2 if bases loaded
  closeGameRequired: true,
  description: 'Reliever escapes inherited jam'
};
```

### Defensive Clutch Adjustments

**CORRECTION:** Diving play clutch values need calibration.

| Trigger | Clutch Value | Notes |
|---------|--------------|-------|
| Diving play for out (close game, no RISP) | +0.5 | Good effort play |
| Diving play saves run (any situation) | +1 | Prevents damage |
| Diving play saves game-tying/go-ahead run (late innings) | +2 | Critical moment |
| Robbed home run | +2 | Always clutch |

```javascript
function calculateDivingPlayClutch(playContext) {
  if (!playContext.isDivingPlay) return 0;
  if (!playContext.isCloseGame) return 0;  // Require close game for any clutch

  if (playContext.robbedHomeRun) return 2;

  if (playContext.savedRun) {
    // Late innings (7+) with game-tying or go-ahead run
    if (playContext.inning >= 7 && playContext.wasGoAheadOrTyingRun) {
      return 2;
    }
    return 1;  // Saved a run in close game
  }

  return 0.5;  // Diving play for out in close game, no run saved
}
```

### NEW: Sac Fly Runner Clutch

**ADDITION:** Being the runner that scores on a sac fly for go-ahead/tying run in late innings.

| Trigger | Clutch Value | Close Game Required? |
|---------|--------------|----------------------|
| Score tying/go-ahead run on sac fly (7th+) | +0.5 | Yes |

```javascript
const sacFlyRunnerClutch = {
  type: 'SAC_FLY_RUNNER',
  criteria: {
    isRunner: true,
    scoredOn: 'sacFly',
    inning: { min: 7 },
    runType: ['tying', 'goAhead']
  },
  clutchValue: 0.5,
  closeGameRequired: true,
  description: 'Tag-up score on sac fly for tying/go-ahead run'
};
```

### REMOVE: Impossible SMB4 Plays

**REMOVED:** These are not possible in SMB4:

| Trigger | Status |
|---------|--------|
| Balk allowing run | **REMOVED** |
| Catcher interference | **REMOVED** |
| Manager ejection (narrative) | **REMOVED** |

### FIX: Pickoff Duplicate

**CORRECTION:** "Picked off with 2 outs" and "Picked off to end inning" are the same thing.

**Old:**
- Picked off with 2 outs: +1 choke
- Picked off to end inning: +2 choke

**New:**
- Picked off to end inning: +2 choke (only entry needed)
- Picked off (not ending inning): +1 choke

---

## 8. Fame Trigger Adjustments

### Walk-Off HR Fame

**CORRECTION:** Since Walk-Off HR is heavily valued as Clutch (+3), keep Fame bonus to +2.

| Trigger | Fame Value | Clutch Value |
|---------|------------|--------------|
| Walk-off single | +1 | +2 |
| Walk-off XBH | +1 | +2 |
| Walk-off HR | +2 | +3 |
| Walk-off grand slam | +3 | +3 |

### Diving Catch Fame

**CORRECTION:** Only award Fame bonus when it saves a run in a close game.

| Trigger | Fame Value | Condition |
|---------|------------|-----------|
| Diving catch | +0 | No fame unless saves run |
| Diving catch saves run (close game) | +1 | Must be close game |
| Diving catch saves game (game-ending situation) | +2 | Walk-off defense |

---

## 9. Voting Formula Normalization

**QUESTION:** Are WAR, Clutch, and Narrative on similar scales?

### Analysis

The current formula is:
```
Votes = (WAR x 0.50 + Clutch x 0.30 + Narrative x 0.20) x 10
```

**Problem:** These components may not be on similar scales.

**Example in a 40-game season:**
- Top WAR: ~4.0 (exceptional player)
- Top Net Clutch: ~15-20 (many clutch moments)
- Top Narrative/Fame: ~10-15 (milestones, Fame bonuses)

**Raw calculation:**
```
Top player: (4.0 x 0.50) + (20 x 0.30) + (15 x 0.20) = 2.0 + 6.0 + 3.0 = 11.0
```

**Issue:** Clutch (6.0) dominates WAR (2.0) despite WAR having higher weight (50% vs 30%).

### Solution: Normalize to Z-Scores or Percentiles

```javascript
function normalizeComponent(playerValue, allPlayerValues) {
  const mean = allPlayerValues.reduce((a, b) => a + b) / allPlayerValues.length;
  const stdDev = Math.sqrt(
    allPlayerValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / allPlayerValues.length
  );

  // Z-score: how many standard deviations from mean
  return (playerValue - mean) / stdDev;
}

function calculateVotes(player, allPlayers) {
  // Get all values for normalization
  const allWAR = allPlayers.map(p => p.war);
  const allClutch = allPlayers.map(p => p.netClutch);
  const allNarrative = allPlayers.map(p => p.narrative);

  // Normalize to z-scores
  const warZ = normalizeComponent(player.war, allWAR);
  const clutchZ = normalizeComponent(player.netClutch, allClutch);
  const narrativeZ = normalizeComponent(player.narrative, allNarrative);

  // Apply weights to normalized scores
  const rawScore = (warZ * 0.50) + (clutchZ * 0.30) + (narrativeZ * 0.20);

  // Convert to positive vote total (scale to 0-100 range)
  const votes = Math.round((rawScore + 3) * 15);  // Shift and scale

  return Math.max(0, votes);  // No negative votes
}
```

### Alternative: Scale to 0-100 Each

```javascript
function scaleToRange(value, min, max, targetMin = 0, targetMax = 100) {
  return ((value - min) / (max - min)) * (targetMax - targetMin) + targetMin;
}

function calculateVotesScaled(player, allPlayers) {
  // Get min/max for each component
  const warMin = Math.min(...allPlayers.map(p => p.war));
  const warMax = Math.max(...allPlayers.map(p => p.war));
  const clutchMin = Math.min(...allPlayers.map(p => p.netClutch));
  const clutchMax = Math.max(...allPlayers.map(p => p.netClutch));
  const narrativeMin = Math.min(...allPlayers.map(p => p.narrative));
  const narrativeMax = Math.max(...allPlayers.map(p => p.narrative));

  // Scale each to 0-100
  const warScaled = scaleToRange(player.war, warMin, warMax);
  const clutchScaled = scaleToRange(player.netClutch, clutchMin, clutchMax);
  const narrativeScaled = scaleToRange(player.narrative, narrativeMin, narrativeMax);

  // Apply weights (all now on 0-100 scale)
  const votes = (warScaled * 0.50) + (clutchScaled * 0.30) + (narrativeScaled * 0.20);

  return Math.round(votes);
}
```

**Recommendation:** Use the 0-100 scaling approach. It's more intuitive and ensures:
- Best WAR player gets 50 max from WAR component
- Best Clutch player gets 30 max from Clutch component
- Best Narrative player gets 20 max from Narrative component
- Maximum possible vote total: 100

---

## 10. Award Rewards - Complete Revision

### MVP

**Winner:**
- Random **positive** trait

**Runners-up (2nd and 3rd):**
- Random trait (70% positive, 30% negative)

**NO ratings boosts.**

### Cy Young

**Winner:**
- Random **positive** trait

**Runners-up (2nd and 3rd):**
- Random trait (70% positive, 30% negative)

**NO ratings boosts.**

### Gold Glove

**Winner:**
- +5 to Fielding rating
- **NO arm bonus**

**Platinum Glove** (highest fWAR among Gold Glove winners):
- Recognition only, no additional bonus

### Silver Slugger

**Winner:**
- +5 to Contact OR Power (player's choice)
- +3 to the other
- Random trait (70% positive, 30% negative)

### Rookie of the Year

**Winner:**
- Random trait (70% positive, 30% negative)

**NO ratings boosts.**

### Reliever of the Year

**Winner:**
- **Clutch trait** added (or replace existing trait if at 2)

**NO ratings boosts.**

### Kara Kawaguchi Award

**Winner:**
- Random **positive** trait

**NO ratings boosts.**

### Bench Player of the Year

**Winner:**
- **Pinch Perfect** OR **Utility** trait (manager's choice)

**NO ratings boosts.**

---

## 11. League Leader Rewards - Complete Revision

| Category | Reward |
|----------|--------|
| HR Leader | +5 Power (L and R) |
| AVG Leader | +5 Contact (L and R) |
| RBI Leader | +3 Power, +2 Contact |
| SB Leader | +5 Speed |
| Runs Scored Leader | +5 Speed |
| **ERA Leader** | +3 Accuracy, +2 Junk |
| **Lowest WHIP** | +5 to Accuracy, Junk, OR Velocity (player choice) |
| **Most Pitching Ks** | +5 to Junk OR Velocity (player choice) |
| **Most Saves** | Clutch trait (no ratings boost) |
| Wins Leader | +2 to any pitching rating |
| **Most Batting Ks** | **Whiffer trait added** |
| **Most Batting BBs** | +5 Speed |
| **Most Pitching BBs** | **BB Prone trait added** |
| **Best Hitting Pitcher** | +15 Power, +15 Contact |
| WAR Leader | ~~+3 to any two ratings~~ **No boost (will win other awards)** |

### NEW: Bust of the Year

**Definition:** Player who underperformed the most against expectations.

**CRITICAL:** Must use rating-specific WAR expectations, NOT overall grade.

A C+ player with 90 Power/Contact but 30 Speed/Fielding should have HIGH bWAR expectations but LOW rWAR/fWAR expectations. Using overall grade would incorrectly set low expectations across the board.

**Rating-to-Expected-WAR Mapping:**

```javascript
// Expected WAR component based on relevant rating average
// These are per-162-game values, scale by (gamesPlayed / 162)

function getExpectedBWAR(player) {
  // bWAR driven by Power and Contact
  const avgBattingRating = (
    player.ratings.powerL +
    player.ratings.powerR +
    player.ratings.contactL +
    player.ratings.contactR
  ) / 4;

  return ratingToExpectedWAR(avgBattingRating, 'batting');
}

function getExpectedRWAR(player) {
  // rWAR driven by Speed
  return ratingToExpectedWAR(player.ratings.speed, 'baserunning');
}

function getExpectedFWAR(player) {
  // fWAR driven by Fielding and Arm
  const avgFieldingRating = (player.ratings.fielding + player.ratings.arm) / 2;
  return ratingToExpectedWAR(avgFieldingRating, 'fielding');
}

function getExpectedPWAR(player) {
  // pWAR driven by Velocity, Junk, Accuracy
  const avgPitchingRating = (
    player.ratings.velocity +
    player.ratings.junk +
    player.ratings.accuracy
  ) / 3;

  return ratingToExpectedWAR(avgPitchingRating, 'pitching');
}

// Convert rating (0-100) to expected WAR component
function ratingToExpectedWAR(rating, category) {
  // Base expectations per 162 games
  const expectations = {
    batting: {
      // Rating -> Expected bWAR
      95: 6.0,   // Elite hitter
      90: 5.0,
      85: 4.0,
      80: 3.0,
      75: 2.5,
      70: 2.0,
      65: 1.5,
      60: 1.0,
      55: 0.5,
      50: 0.0,
      45: -0.5,
      40: -1.0,
      35: -1.5,
      30: -2.0,
    },
    baserunning: {
      // Rating -> Expected rWAR
      95: 1.5,
      90: 1.2,
      85: 0.9,
      80: 0.6,
      70: 0.3,
      60: 0.0,
      50: -0.2,
      40: -0.5,
      30: -0.8,
    },
    fielding: {
      // Rating -> Expected fWAR
      95: 2.5,
      90: 2.0,
      85: 1.5,
      80: 1.0,
      75: 0.7,
      70: 0.4,
      65: 0.2,
      60: 0.0,
      55: -0.2,
      50: -0.5,
      45: -0.8,
      40: -1.0,
      30: -1.5,
    },
    pitching: {
      // Rating -> Expected pWAR
      95: 7.0,   // Ace
      90: 5.5,
      85: 4.0,
      80: 3.0,
      75: 2.0,
      70: 1.5,
      65: 1.0,
      60: 0.5,
      55: 0.0,
      50: -0.5,
      45: -1.0,
      40: -2.0,
    }
  };

  // Interpolate between defined points
  const table = expectations[category];
  const ratings = Object.keys(table).map(Number).sort((a, b) => b - a);

  for (let i = 0; i < ratings.length - 1; i++) {
    if (rating >= ratings[i + 1]) {
      const high = ratings[i];
      const low = ratings[i + 1];
      const ratio = (rating - low) / (high - low);
      return table[low] + ratio * (table[high] - table[low]);
    }
  }

  return table[ratings[ratings.length - 1]];
}
```

**Combined Expected WAR Calculation:**

```javascript
function calculateExpectedWAR(player, gamesPlayed, gamesInSeason) {
  const scaleFactor = gamesPlayed / 162;

  const isPitcher = ['SP', 'RP', 'CP', 'SP/RP'].includes(player.primaryPosition);
  const isTwoWay = player.primaryPosition === 'TWO-WAY';
  const isDH = player.primaryPosition === 'DH';

  let expectedWAR = {
    bWAR: 0,
    rWAR: 0,
    fWAR: 0,
    pWAR: 0,
    total: 0
  };

  if (!isPitcher || isTwoWay) {
    // Position player or two-way
    expectedWAR.bWAR = getExpectedBWAR(player) * scaleFactor;
    expectedWAR.rWAR = getExpectedRWAR(player) * scaleFactor;

    if (!isDH) {
      expectedWAR.fWAR = getExpectedFWAR(player) * scaleFactor;
    }
  }

  if (isPitcher || isTwoWay) {
    expectedWAR.pWAR = getExpectedPWAR(player) * scaleFactor;
  }

  expectedWAR.total = expectedWAR.bWAR + expectedWAR.rWAR +
                      expectedWAR.fWAR + expectedWAR.pWAR;

  return expectedWAR;
}
```

**Bust Score Calculation:**

```javascript
function calculateBustScore(player, seasonStats) {
  const expected = calculateExpectedWAR(
    player,
    seasonStats.gamesPlayed,
    season.config.gamesPerTeam
  );

  const actual = {
    bWAR: seasonStats.war.bWAR || 0,
    rWAR: seasonStats.war.rWAR || 0,
    fWAR: seasonStats.war.fWAR || 0,
    pWAR: seasonStats.war.pWAR || 0,
    total: seasonStats.war.total || 0
  };

  // Underperformance by component
  const underperformance = {
    bWAR: expected.bWAR - actual.bWAR,
    rWAR: expected.rWAR - actual.rWAR,
    fWAR: expected.fWAR - actual.fWAR,
    pWAR: expected.pWAR - actual.pWAR,
    total: expected.total - actual.total
  };

  return {
    expected,
    actual,
    underperformance,
    bustScore: underperformance.total  // Higher = bigger bust
  };
}
```

**Example: Knox Oxensocksen (B+ grade, no power)**

| Rating Category | Rating | Expected WAR |
|-----------------|--------|--------------|
| Power (L/R avg) | 35 | -1.5 bWAR contribution |
| Contact (L/R avg) | 75 | +2.5 bWAR contribution |
| **Net bWAR Expected** | - | **~1.0** |
| Speed | 85 | +0.9 rWAR |
| Fielding/Arm avg | 80 | +1.0 fWAR |
| **Total Expected** | - | **~2.9 WAR** |

If Knox actually produces 2.5 WAR, he's only -0.4 below expectations (not a bust).

If a player with 90/90 Power/Contact but 30 Speed/30 Fielding (also B+ grade) produces 2.5 WAR, they're a much bigger bust because their expected bWAR alone was ~5.0.

**Penalty:** **Choker trait** added

---

### NEW: Comeback Player of the Year

**Season 1 Definition:** Player who outperformed expectations the most (opposite of Bust).

```javascript
function calculateComebackScoreSeason1(player, seasonStats) {
  const result = calculateBustScore(player, seasonStats);

  // Flip the sign - overperformance is positive
  return {
    expected: result.expected,
    actual: result.actual,
    overperformance: {
      bWAR: result.actual.bWAR - result.expected.bWAR,
      rWAR: result.actual.rWAR - result.expected.rWAR,
      fWAR: result.actual.fWAR - result.expected.fWAR,
      pWAR: result.actual.pWAR - result.expected.pWAR,
      total: result.actual.total - result.expected.total
    },
    comebackScore: -result.bustScore  // Higher = bigger comeback
  };
}
```

**Season 2+ Definition:** Player with biggest improvement from prior year.

```javascript
function calculateComebackScoreSeason2Plus(player, currentSeasonStats, previousSeasonStats) {
  // Compare actual WAR year-over-year
  const currentWAR = currentSeasonStats.war.total || 0;
  const previousWAR = previousSeasonStats?.war.total || 0;

  const improvement = currentWAR - previousWAR;

  // Also factor in if they were below expectations last year
  // (true comeback = was bad, now good)
  const lastYearExpected = calculateExpectedWAR(player, previousSeasonStats.gamesPlayed);
  const wasUnderperformer = previousWAR < lastYearExpected.total;

  return {
    currentWAR,
    previousWAR,
    improvement,
    wasUnderperformerLastYear: wasUnderperformer,
    comebackScore: wasUnderperformer ? improvement * 1.25 : improvement  // Bonus for true comebacks
  };
}
```

**Reward:** **Clutch trait** added

---

### Expected WAR Calculation Timing & Learning

**IMPORTANT:** Expected WAR must be calculated and stored at season start, then refined over time.

#### When to Calculate

```javascript
// Called during Season Setup (Step 5: Confirmation & Start)
function initializeSeasonExpectations(season, rosters) {
  const expectations = {};

  for (const [teamId, playerIds] of Object.entries(rosters)) {
    expectations[teamId] = {};

    for (const playerId of playerIds) {
      const player = getPlayer(playerId);
      expectations[teamId][playerId] = calculateExpectedWAR(
        player,
        season.config.gamesPerTeam,  // Assume full season
        season.config.gamesPerTeam
      );
    }
  }

  // Store with season data
  season.preSeasonExpectations = expectations;

  return expectations;
}
```

#### Data Structure

```javascript
// Stored in season object
season.preSeasonExpectations = {
  'team-giants': {
    'player-001': {
      bWAR: 1.2,
      rWAR: 0.4,
      fWAR: 0.5,
      pWAR: 0,
      total: 2.1,
      calculatedAt: '2024-03-01',
      ratingsSnapshot: {
        powerL: 85, powerR: 80, contactL: 70, contactR: 75,
        speed: 65, fielding: 70, arm: 60
      }
    },
    // ... more players
  },
  // ... more teams
};
```

#### Learning System (Optional Enhancement)

Over multiple seasons, we can refine the rating-to-WAR expectations by comparing predictions to actuals:

```javascript
// After each season ends, update our knowledge
function updateExpectationModel(completedSeasons) {
  const dataPoints = [];

  for (const season of completedSeasons) {
    for (const [teamId, players] of Object.entries(season.preSeasonExpectations)) {
      for (const [playerId, expected] of Object.entries(players)) {
        const actual = season.playerSeasonStats[playerId]?.war;
        if (!actual) continue;

        // Store the prediction vs reality
        dataPoints.push({
          ratings: expected.ratingsSnapshot,
          expectedWAR: expected,
          actualWAR: actual,
          gamesPlayed: season.playerSeasonStats[playerId].gamesPlayed
        });
      }
    }
  }

  // Calculate adjustment factors
  // If our model consistently over/under-predicts for certain rating ranges,
  // we can adjust the ratingToExpectedWAR tables

  return calculateAdjustmentFactors(dataPoints);
}

// Example: After 3 seasons, we might learn that:
// - 90+ Power players produce 10% less bWAR than expected (pitching is good in our league)
// - 80+ Speed players produce 20% more rWAR than expected (we run a lot)
// These adjustments get applied to future season expectations
```

#### Season-Over-Season Comparison

```javascript
function getExpectationForBustCalculation(player, season) {
  // Always use the expectations that were set at season start
  // This prevents retroactive changes from affecting awards
  const teamId = getPlayerTeam(player.id, season);
  return season.preSeasonExpectations[teamId][player.id];
}
```

#### UI: Pre-Season Expectations Review

```
+---------------------------------------------------------------------------+
|  PRE-SEASON WAR EXPECTATIONS - Season 4                                    |
+---------------------------------------------------------------------------+
|  Calculated from current ratings. Will be locked when season starts.       |
|                                                                            |
|  TEAM: [Giants v]                                                          |
|                                                                            |
|  +-------------------+-------+-------+-------+-------+-------+----------+ |
|  | Player            | bWAR  | rWAR  | fWAR  | pWAR  | Total | Grade    | |
|  +-------------------+-------+-------+-------+-------+-------+----------+ |
|  | Barry Bonds       | 2.8   | 0.3   | 0.5   | -     | 3.6   | A        | |
|  | Knox Oxensocksen  | 0.8   | 0.6   | 0.6   | -     | 2.0   | B+       | |
|  | Tom Seaver        | -     | -     | 0.1   | 3.2   | 3.3   | A-       | |
|  | Joe Average       | 0.5   | 0.2   | 0.3   | -     | 1.0   | B-       | |
|  +-------------------+-------+-------+-------+-------+-------+----------+ |
|                                                                            |
|  Note: Expectations based on S3 model accuracy: 87%                        |
|  Model has been adjusted +5% for bWAR based on prior seasons.              |
|                                                                            |
|                            [EXPORT]  [LOCK & START SEASON]                 |
+---------------------------------------------------------------------------+
```

#### Benefits of This Approach

1. **Fair Bust/Comeback evaluation** - Uses expectations set BEFORE the season, not hindsight
2. **Transparency** - Players can see their expected WAR at season start
3. **Learning** - Model improves over time as we gather league-specific data
4. **Accountability** - Ratings snapshot prevents "but my ratings changed" disputes

---

### Real-Time Expectations vs Actuals Tracker

**ADDITION:** Live comparison view available throughout the season.

#### Pace-Adjusted Expectations

Scale expectations based on games played so far:

```javascript
function getProRatedExpectation(player, season, currentGame) {
  const fullSeasonExpectation = season.preSeasonExpectations[player.teamId][player.id];
  const gamesPlayed = season.playerSeasonStats[player.id]?.gamesPlayed || 0;
  const totalGames = season.config.gamesPerTeam;

  // Pro-rate based on games played (not season progress)
  // A player who missed 10 games shouldn't be compared to full-season expectations
  const proRateFactor = gamesPlayed / totalGames;

  return {
    bWAR: fullSeasonExpectation.bWAR * proRateFactor,
    rWAR: fullSeasonExpectation.rWAR * proRateFactor,
    fWAR: fullSeasonExpectation.fWAR * proRateFactor,
    pWAR: fullSeasonExpectation.pWAR * proRateFactor,
    total: fullSeasonExpectation.total * proRateFactor,
    gamesPlayed,
    fullSeasonProjection: fullSeasonExpectation.total
  };
}

function calculateCurrentDelta(player, season) {
  const proRated = getProRatedExpectation(player, season);
  const actual = season.playerSeasonStats[player.id]?.war || { bWAR: 0, rWAR: 0, fWAR: 0, pWAR: 0, total: 0 };

  return {
    expected: proRated,
    actual: actual,
    delta: {
      bWAR: actual.bWAR - proRated.bWAR,
      rWAR: actual.rWAR - proRated.rWAR,
      fWAR: actual.fWAR - proRated.fWAR,
      pWAR: actual.pWAR - proRated.pWAR,
      total: actual.total - proRated.total
    },
    // Project to full season at current pace
    projectedFinalWAR: proRated.gamesPlayed > 0
      ? (actual.total / proRated.gamesPlayed) * season.config.gamesPerTeam
      : 0,
    projectedDelta: null  // Calculated below
  };
}
```

#### UI: In-Season Performance Tracker

**League-Wide View:**

```
+---------------------------------------------------------------------------+
|  EXPECTATIONS vs ACTUALS - Season 4 (Game 24 of 40)                        |
+---------------------------------------------------------------------------+
|  [All Players v]  [Position: All v]  [Team: All v]  [Sort: Delta v]        |
|                                                                            |
|  OVERPERFORMERS (Top 10)                                                   |
|  +-------------------+------+--------+--------+--------+--------+---------+
|  | Player            | Team | ExpWAR | ActWAR | Delta  | Proj   | Status  |
|  +-------------------+------+--------+--------+--------+--------+---------+
|  | Dusty Rhodes      | NYG  | 0.8    | 1.9    | +1.1   | 3.2    | 🔥 Hot  |
|  | Ricky Henderson   | OAK  | 1.2    | 2.1    | +0.9   | 3.5    | 🔥 Hot  |
|  | Tom Glavine       | ATL  | 1.5    | 2.3    | +0.8   | 3.8    | ⬆️ Up   |
|  | Joe Carter        | TOR  | 0.9    | 1.6    | +0.7   | 2.7    | ⬆️ Up   |
|  +-------------------+------+--------+--------+--------+--------+---------+
|                                                                            |
|  UNDERPERFORMERS (Bottom 10)                                               |
|  +-------------------+------+--------+--------+--------+--------+---------+
|  | Player            | Team | ExpWAR | ActWAR | Delta  | Proj   | Status  |
|  +-------------------+------+--------+--------+--------+--------+---------+
|  | Barry Bonds       | SFG  | 2.2    | 1.1    | -1.1   | 1.8    | ⬇️ Down |
|  | Roger Clemens     | BOS  | 2.0    | 1.0    | -1.0   | 1.7    | ❄️ Cold |
|  | Ken Griffey Jr    | SEA  | 1.8    | 1.0    | -0.8   | 1.7    | ⬇️ Down |
|  +-------------------+------+--------+--------+--------+--------+---------+
|                                                                            |
|  Legend: 🔥 >+0.8 delta | ⬆️ >+0.3 delta | ➡️ within ±0.3 |               |
|          ⬇️ <-0.3 delta | ❄️ <-0.8 delta                                   |
+---------------------------------------------------------------------------+
```

**Individual Player Detail View:**

```
+---------------------------------------------------------------------------+
|  PERFORMANCE TRACKER - Barry Bonds (Season 4)                              |
+---------------------------------------------------------------------------+
|                                                                            |
|  SEASON PROGRESS: Game 24 of 40 (60%)                                      |
|  [============================....................] 60%                    |
|                                                                            |
|  WAR COMPARISON                                                            |
|  +-------------+----------+----------+----------+-------------------------+
|  | Component   | Expected | Actual   | Delta    | Full Season Projection  |
|  +-------------+----------+----------+----------+-------------------------+
|  | bWAR        | 1.50     | 0.80     | -0.70    | 1.33 (exp: 2.50)        |
|  | rWAR        | 0.18     | 0.15     | -0.03    | 0.25 (exp: 0.30)        |
|  | fWAR        | 0.30     | 0.10     | -0.20    | 0.17 (exp: 0.50)        |
|  | pWAR        | -        | -        | -        | -                       |
|  +-------------+----------+----------+----------+-------------------------+
|  | TOTAL       | 1.98     | 1.05     | -0.93    | 1.75 (exp: 3.30)        |
|  +-------------+----------+----------+----------+-------------------------+
|                                                                            |
|  STATUS: ⬇️ Underperforming (-0.93 WAR below pace)                         |
|                                                                            |
|  TREND (Last 10 Games):                                                    |
|  [Chart showing WAR accumulation vs expected pace]                         |
|                                                                            |
|  G15: ▓▓▓▓▓▓░░░░  Exp: 0.82  Act: 0.65  (-0.17)                           |
|  G20: ▓▓▓▓▓▓▓░░░  Exp: 1.32  Act: 0.85  (-0.47)                           |
|  G24: ▓▓▓▓▓▓▓▓░░  Exp: 1.98  Act: 1.05  (-0.93)  <- Current               |
|                                                                            |
|  COMPONENT BREAKDOWN:                                                      |
|  bWAR: ████████░░░░░░░░░░░░  53% of expected pace                         |
|  rWAR: ████████████████░░░░  83% of expected pace                         |
|  fWAR: ██████░░░░░░░░░░░░░░  33% of expected pace                         |
|                                                                            |
|  BUST/COMEBACK PROJECTION:                                                 |
|  At current pace: #3 candidate for Bust of the Year (-1.55 projected)     |
|                                                                            |
+---------------------------------------------------------------------------+
```

**Team Summary View:**

```
+---------------------------------------------------------------------------+
|  TEAM PERFORMANCE TRACKER - Giants (Season 4, Game 24)                     |
+---------------------------------------------------------------------------+
|                                                                            |
|  TEAM WAR SUMMARY                                                          |
|  Expected Team WAR (pro-rated): 18.5                                       |
|  Actual Team WAR: 16.2                                                     |
|  Team Delta: -2.3 WAR                                                      |
|                                                                            |
|  ROSTER BREAKDOWN                                                          |
|  +-------------------+------+--------+--------+--------+---------+        |
|  | Player            | Pos  | ExpWAR | ActWAR | Delta  | Status  |        |
|  +-------------------+------+--------+--------+--------+---------+        |
|  | Barry Bonds       | LF   | 1.98   | 1.05   | -0.93  | ⬇️      |        |
|  | Will Clark        | 1B   | 1.20   | 1.45   | +0.25  | ➡️      |        |
|  | Matt Williams     | 3B   | 1.10   | 0.95   | -0.15  | ➡️      |        |
|  | Robby Thompson    | 2B   | 0.85   | 1.20   | +0.35  | ⬆️      |        |
|  | John Burkett      | SP   | 1.50   | 1.30   | -0.20  | ➡️      |        |
|  | Rod Beck          | CP   | 0.60   | 0.90   | +0.30  | ⬆️      |        |
|  | ...               | ...  | ...    | ...    | ...    | ...     |        |
|  +-------------------+------+--------+--------+--------+---------+        |
|                                                                            |
|  KEY INSIGHTS:                                                             |
|  * Biggest underperformer: Barry Bonds (-0.93)                            |
|  * Biggest overperformer: Robby Thompson (+0.35)                          |
|  * Pitching staff: +0.4 above expectations                                |
|  * Position players: -2.7 below expectations                              |
|                                                                            |
+---------------------------------------------------------------------------+
```

#### Sorting & Filtering Options

```javascript
const sortOptions = [
  { value: 'delta_desc', label: 'Delta (High to Low)' },      // Overperformers first
  { value: 'delta_asc', label: 'Delta (Low to High)' },       // Underperformers first
  { value: 'actual_desc', label: 'Actual WAR (High to Low)' },
  { value: 'expected_desc', label: 'Expected WAR (High to Low)' },
  { value: 'projected_desc', label: 'Projected Final (High to Low)' },
  { value: 'name_asc', label: 'Name (A-Z)' },
];

const filterOptions = {
  position: ['All', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CP'],
  team: ['All', ...teamList],
  status: ['All', 'Overperforming', 'On Pace', 'Underperforming'],
  minGames: 10,  // Exclude players with fewer games for meaningful comparison
};
```

#### Dashboard Widget

For the main dashboard, show a condensed version:

```
+---------------------------------------+
|  📊 PERFORMANCE WATCH (G24/40)        |
+---------------------------------------+
|  🔥 HOT                               |
|  Dusty Rhodes      +1.1 WAR vs exp    |
|  Ricky Henderson   +0.9 WAR vs exp    |
|                                       |
|  ❄️ COLD                              |
|  Barry Bonds       -0.9 WAR vs exp    |
|  Roger Clemens     -1.0 WAR vs exp    |
|                                       |
|  [View Full Tracker →]                |
+---------------------------------------+
```

---

## 12. Grade Factors - Double Again

**CORRECTION:** Double the grade factors for more meaningful end-of-season adjustments.

**Previous v2.0 factors (already 5x from original):**

| Grade | Positive | Negative |
|-------|----------|----------|
| S | 0.5 | 5.0 |
| A+ | 0.75 | 4.0 |
| ... | ... | ... |

**New factors (doubled again = 10x from original):**

| Grade | Positive Factor | Negative Factor |
|-------|-----------------|-----------------|
| **S** | 1.0 | 10.0 |
| **A+** | 1.5 | 8.0 |
| **A** | 2.0 | 7.0 |
| **A-** | 3.0 | 6.0 |
| **B+** | 4.0 | 5.0 |
| **B** | 5.0 | 4.0 |
| **B-** | 6.0 | 3.0 |
| **C+** | 7.0 | 2.0 |
| **C** | 8.0 | 1.5 |
| **C-** | 9.0 | 1.0 |
| **D+** | 10.0 | 0.8 |
| **D** | 11.0 | 0.6 |

```javascript
const GRADE_FACTORS = {
  'S':  { positive: 1.0, negative: 10.0 },
  'A+': { positive: 1.5, negative: 8.0 },
  'A':  { positive: 2.0, negative: 7.0 },
  'A-': { positive: 3.0, negative: 6.0 },
  'B+': { positive: 4.0, negative: 5.0 },
  'B':  { positive: 5.0, negative: 4.0 },
  'B-': { positive: 6.0, negative: 3.0 },
  'C+': { positive: 7.0, negative: 2.0 },
  'C':  { positive: 8.0, negative: 1.5 },
  'C-': { positive: 9.0, negative: 1.0 },
  'D+': { positive: 10.0, negative: 0.8 },
  'D':  { positive: 11.0, negative: 0.6 },
};
```

### Sample Calculations with New Factors

| Player | WAR Diff | Grade | Factor | Raw Adj | Capped |
|--------|----------|-------|--------|---------|--------|
| Star CF | +2.0 | A- | 3.0 | +6.0 | +6 |
| Average SS | +0.2 | B | 5.0 | +1.0 | +1 |
| Scrub 1B | +1.0 | C | 8.0 | +8.0 | +8 |
| Bad Pitcher | -2.0 | B | 4.0 | -8.0 | -8 |
| Legend | +1.3 | S | 1.0 | +1.3 | +1 |
| Legend Bad | -1.0 | S | 10.0 | -10.0 | -10 |

**Result:** Clear differentiation between performers. C-grade player outperforming by 1 WAR gets +8, while S-grade legend underperforming by 1 WAR gets -10.

---

## 13. Two-Way Player Fame Safeguard

**ADDITION:** Prevent Fame inflation for two-way players getting hits.

### Problem

Two-way players (like Shohei Ohtani) should be good hitters. Giving them Fame bonus for "pitcher getting a hit" would unfairly inflate their Fame.

### Solution

```javascript
function checkPitcherHitFame(player, hitEvent) {
  // Two-way players don't get Fame for hits (expected to hit well)
  if (player.primaryPosition === 'TWO-WAY') {
    return 0;  // No Fame bonus
  }

  // Regular pitchers get Fame for hits
  if (isPitcher(player.primaryPosition)) {
    if (hitEvent.type === 'HR') return 2;  // Pitcher HR is still special
    return 1;  // Pitcher single/double/triple
  }

  return 0;  // Position players don't get this bonus
}

function isPitcher(position) {
  return ['SP', 'RP', 'CP', 'SP/RP'].includes(position);
}
```

### Two-Way Player Fame Rules

| Event | Regular Pitcher Fame | Two-Way Player Fame |
|-------|---------------------|---------------------|
| Getting a hit | +1 | **No bonus** |
| Hitting a HR | +2 | **+1** (reduced) |
| Hitting a grand slam | +2 | +1 |
| Walk-off hit | Normal | Normal |

---

## Summary of All Changes in v2 Corrections

| Item | Change |
|------|--------|
| Trait assignment | Added pitcher-only and position-player-only trait logic |
| Pre-season roster | Added between-season roster management screen |
| Stadium stats | Expanded with spray charts, park factors by zone, records |
| Player spray charts | Added per-player hit distribution visualization |
| Team spray charts | Added per-team aggregate spray data |
| Retired numbers | Added to Team History tab |
| Hall of Fame | Added induction system for retired players |
| POG Fame integration | POG finishes contribute to Narrative component |
| "Hit in 3-0/3-1" | **REMOVED** - not a clutch moment |
| Close game qualifier | Most clutch triggers require game within 2 runs |
| Long relief clutch | Added 3+ IP, 0-1 ER for relievers |
| Hold extension | Extended to 7th inning (was 8th) |
| Inherited runner escape | Added reliever escaping jam as clutch |
| Diving play calibration | Tiered 0.5/1/2 based on situation |
| Sac fly runner clutch | Added +0.5 for scoring tying/go-ahead run |
| Balk/catcher interference | **REMOVED** - not in SMB4 |
| Manager ejection | **REMOVED** - not in SMB4 |
| Pickoff duplicate | Fixed - only one entry needed |
| Walk-off HR Fame | Capped at +2 (was +2-3) |
| Diving catch Fame | Only +1 when saves run in close game |
| Voting normalization | Added 0-100 scaling for fair component weighting |
| MVP/Cy Young rewards | Positive trait only, no ratings |
| Gold Glove | +5 Fielding only, no arm bonus |
| ROY rewards | Random trait only, no ratings |
| Reliever of Year | Clutch trait only |
| Kara Kawaguchi | Positive trait only |
| Bench Player | Pinch Perfect OR Utility (choice) |
| League leader rewards | Complete revision with new categories |
| Bust of the Year | **NEW** - Choker trait penalty |
| Comeback Player | **NEW** - Clutch trait reward |
| Grade factors | Doubled again (now 10x original) |
| Two-way player Fame | Safeguard against hit-related Fame inflation |

---

## 14. Manager Win Expectations Calculation

**ADDITION:** Define how pre-season win expectations are calculated for Manager of the Year evaluation.

### Combination Approach

Win expectations use a weighted combination of:
1. **Grade-Based Projection** (roster strength)
2. **Prior Season Record** (if available)

### Grade-Based Win Expectation

Calculate expected win percentage from roster average grade:

```javascript
const GRADE_WIN_EXPECTATIONS = {
  'S':  0.700,  // 70% win rate expected
  'A+': 0.625,
  'A':  0.575,
  'A-': 0.540,
  'B+': 0.520,
  'B':  0.500,  // League average
  'B-': 0.480,
  'C+': 0.460,
  'C':  0.425,
  'C-': 0.375,
  'D+': 0.350,
  'D':  0.300,
};

function calculateRosterAverageGrade(team, roster) {
  const gradeValues = {
    'S': 12, 'A+': 11, 'A': 10, 'A-': 9,
    'B+': 8, 'B': 7, 'B-': 6,
    'C+': 5, 'C': 4, 'C-': 3,
    'D+': 2, 'D': 1
  };

  const players = roster.filter(p => p.teamId === team.id);
  const totalValue = players.reduce((sum, p) => sum + gradeValues[p.grade], 0);
  const avgValue = totalValue / players.length;

  // Convert back to grade
  const grades = Object.entries(gradeValues).sort((a, b) => b[1] - a[1]);
  for (const [grade, value] of grades) {
    if (avgValue >= value - 0.5) return grade;
  }
  return 'D';
}

function getGradeBasedWinPct(team, roster) {
  const avgGrade = calculateRosterAverageGrade(team, roster);
  return GRADE_WIN_EXPECTATIONS[avgGrade];
}
```

### Prior Season Record

```javascript
function getPriorSeasonWinPct(team, previousSeason) {
  if (!previousSeason) return null;

  const teamRecord = previousSeason.standings[team.id];
  if (!teamRecord) return null;

  return teamRecord.wins / (teamRecord.wins + teamRecord.losses);
}
```

### Combined Expectation Formula

```javascript
function calculateWinExpectation(team, roster, previousSeason, gamesInSeason) {
  const gradeWinPct = getGradeBasedWinPct(team, roster);
  const priorWinPct = getPriorSeasonWinPct(team, previousSeason);

  let expectedWinPct;

  if (priorWinPct === null) {
    // Season 1: Use grade-based only
    expectedWinPct = gradeWinPct;
  } else {
    // Season 2+: Weight 60% grade-based, 40% prior record
    // (Grade matters more since rosters can change significantly)
    expectedWinPct = (gradeWinPct * 0.60) + (priorWinPct * 0.40);
  }

  const expectedWins = Math.round(expectedWinPct * gamesInSeason);

  return {
    expectedWinPct,
    expectedWins,
    gradeComponent: gradeWinPct,
    priorComponent: priorWinPct
  };
}
```

### Manager of the Year Calculation

```javascript
function calculateManagerOverperformance(manager, team, season) {
  const expectation = calculateWinExpectation(
    team,
    season.rosters[team.id],
    getPreviousSeason(season),
    season.config.gamesPerTeam
  );

  const actualWins = season.standings[team.id].wins;
  const expectedWins = expectation.expectedWins;

  const overperformance = actualWins - expectedWins;
  const overperformancePct = (actualWins / season.config.gamesPerTeam) - expectation.expectedWinPct;

  return {
    actualWins,
    expectedWins,
    overperformance,           // Raw wins above expectation
    overperformancePct,        // Percentage points above expectation
    expectationDetails: expectation
  };
}
```

### Example Calculation

**Season 3, 40-game season:**

| Team | Avg Grade | Grade Exp | S2 Record | S2 Win% | Combined Exp | Actual | Over/Under |
|------|-----------|-----------|-----------|---------|--------------|--------|------------|
| Giants | A- | 54% | 25-15 | 62.5% | 57.4% | 28-12 (70%) | **+5.0 wins** |
| Yankees | B+ | 52% | 22-18 | 55.0% | 53.2% | 20-20 (50%) | -1.3 wins |
| Marlins | C | 42.5% | 15-25 | 37.5% | 40.5% | 22-18 (55%) | **+5.8 wins** |

In this example, the Marlins manager would have stronger MoY consideration (+5.8 overperformance) than the Giants (+5.0) despite the Giants having a better record.

### Pre-Season Display

```
+---------------------------------------------------------------------------+
|  PRE-SEASON PROJECTIONS - Season 4                                         |
+---------------------------------------------------------------------------+
|  Team        | Avg Grade | Last Year | Expected Wins | Expected Win%      |
+---------------------------------------------------------------------------+
|  Giants      | A-        | 28-12     | 23 wins       | 57.5%              |
|  Yankees     | B+        | 20-20     | 21 wins       | 52.5%              |
|  Marlins     | B-        | 22-18     | 20 wins       | 50.0%              |
|  Mets        | C+        | 18-22     | 18 wins       | 45.0%              |
+---------------------------------------------------------------------------+
```

---

## 15. Offseason System: Retirements, Free Agency, and Draft

**ADDITION:** Complete offseason flow between seasons.

---

### Overview: Offseason Flow

```
Season Ends
    ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: RETIREMENTS                                           │
│  • 1-2 players per team retire (age + performance based)        │
│  • Jersey retirement decisions                                  │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: FREE AGENCY (2 Rounds)                                │
│  • Each team: protect 1 player, roll for who leaves             │
│  • Personality determines destination                           │
│  • Receiving team swaps back a player                           │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: EXPANSION/CONTRACTION                                 │
│  • Add or remove teams for next season                          │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4: DRAFT                                                 │
│  • Generate draft class (3x roster gaps)                        │
│  • Snake draft in reverse expected WAR order                    │
│  • Fill all rosters to 22 players                               │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 5: MANUAL ADJUSTMENTS                                    │
│  • Trades, roster moves                                         │
│  • Final review                                                 │
└─────────────────────────────────────────────────────────────────┘
    ↓
Archive Season → Launch New Season
```

---

### PHASE 1: RETIREMENTS

#### Retirement Probability Calculation

Probability based on **Age** (primary) and **Current Season Performance** (secondary):

```javascript
function calculateRetirementProbability(player, seasonStats) {
  const age = player.age;

  // Base probability by age
  let baseProbability;
  if (age >= 40) baseProbability = 0.70;
  else if (age >= 38) baseProbability = 0.50;
  else if (age >= 36) baseProbability = 0.35;
  else if (age >= 34) baseProbability = 0.20;
  else if (age >= 32) baseProbability = 0.10;
  else if (age >= 30) baseProbability = 0.05;
  else if (age >= 28) baseProbability = 0.02;
  else baseProbability = 0.01;  // Young players rarely retire

  // Performance modifier (bad season increases retirement chance)
  const expectedWAR = getExpectationForBustCalculation(player, season);
  const actualWAR = seasonStats.war.total;
  const performanceDelta = actualWAR - expectedWAR.total;

  // Underperformance increases retirement chance
  let performanceModifier = 1.0;
  if (performanceDelta < -1.5) performanceModifier = 1.5;      // Very bad season
  else if (performanceDelta < -0.5) performanceModifier = 1.25; // Bad season
  else if (performanceDelta > 1.0) performanceModifier = 0.75;  // Great season (less likely to retire)

  const finalProbability = Math.min(0.90, baseProbability * performanceModifier);

  return {
    probability: finalProbability,
    age,
    performanceDelta,
    performanceModifier
  };
}
```

#### Retirement UI Flow

```
+---------------------------------------------------------------------------+
|  RETIREMENTS - Season 4 Offseason                                          |
+---------------------------------------------------------------------------+
|  Team: Giants                                                     [1 of 8] |
|                                                                            |
|  ROSTER RETIREMENT PROBABILITIES                                           |
|  +-------------------+-----+--------+-------------+------------------------+
|  | Player            | Age | WAR    | Performance | Retirement Probability |
|  +-------------------+-----+--------+-------------+------------------------+
|  | Willie Mays       | 42  | 1.2    | -2.1 below  | ████████████████ 85%   |
|  | Tom Seaver        | 38  | 2.8    | -0.2 below  | ██████████░░░░░░ 52%   |
|  | Barry Bonds       | 34  | 3.5    | +0.8 above  | ███░░░░░░░░░░░░░ 15%   |
|  | Ken Griffey Jr    | 30  | 2.1    | +0.1 above  | █░░░░░░░░░░░░░░░ 5%    |
|  | Mike Trout        | 26  | 4.2    | +1.2 above  | ░░░░░░░░░░░░░░░░ 1%    |
|  | ...               | ... | ...    | ...         | ...                    |
|  +-------------------+-----+--------+-------------+------------------------+
|                                                                            |
|  Retirements processed: 0 of 1-2 expected                                  |
|                                                                            |
|  Chance of NO retirement this roll: 12%                                    |
|  Chance of retirement this roll: 88%                                       |
|                                                                            |
|                    [ 🎲 ROLL FOR RETIREMENT ]                              |
|                                                                            |
+---------------------------------------------------------------------------+
```

#### Retirement Result

```
+---------------------------------------------------------------------------+
|  RETIREMENT ANNOUNCEMENT                                                   |
+---------------------------------------------------------------------------+
|                                                                            |
|  ⚾ WILLIE MAYS RETIRES ⚾                                                  |
|                                                                            |
|  After 22 illustrious seasons, Willie Mays has announced his retirement.   |
|                                                                            |
|  Career Highlights:                                                        |
|  • WAR: 156.2 (1st all-time)                                               |
|  • Home Runs: 660                                                          |
|  • MVPs: 2                                                                 |
|  • All-Star Selections: 24                                                 |
|  • Gold Gloves: 12                                                         |
|                                                                            |
|  +---------------------------------------------------------------+        |
|  |  RETIRE JERSEY NUMBER?                                        |        |
|  |                                                                |        |
|  |  [ ] Yes, retire #24 for the Giants                           |        |
|  |  [ ] No, keep #24 available                                   |        |
|  +---------------------------------------------------------------+        |
|                                                                            |
|                    [CONTINUE TO NEXT RETIREMENT ROLL]                      |
|                                                                            |
+---------------------------------------------------------------------------+
```

#### After Retirements - Updated Roster

```
+---------------------------------------------------------------------------+
|  RETIREMENTS COMPLETE - Giants                                             |
+---------------------------------------------------------------------------+
|                                                                            |
|  Retired Players:                                                          |
|  • Willie Mays (CF) - Jersey #24 RETIRED                                   |
|  • Tom Seaver (SP) - Jersey #41 not retired                                |
|                                                                            |
|  Roster Status: 20/22 players (2 empty slots)                              |
|                                                                            |
|                    [CONTINUE TO NEXT TEAM] or [PROCEED TO FREE AGENCY]     |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

### Retired Jersey Display (Team Page)

```
+---------------------------------------------------------------------------+
|  GIANTS - RETIRED NUMBERS                                                  |
+---------------------------------------------------------------------------+
|                                                                            |
|   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐               |
|   │  MAYS   │    │ McCOVEY │    │  BONDS  │    │  MARIC  │               |
|   │         │    │         │    │         │    │  HAL    │               |
|   │   24    │    │   44    │    │   25    │    │   27    │               |
|   │ ─────── │    │ ─────── │    │ ─────── │    │ ─────── │               |
|   │ GIANTS  │    │ GIANTS  │    │ GIANTS  │    │ GIANTS  │               |
|   └─────────┘    └─────────┘    └─────────┘    └─────────┘               |
|    S1 - S4        S1 - S2        S2 - S4        S1 - S3                   |
|                                                                            |
|  [View Full Career Stats]                                                  |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

### Hall of Fame Museum (Separate Tab)

Accessible anytime, not tied to retirement:

```
+---------------------------------------------------------------------------+
|  HALL OF FAME MUSEUM                                                       |
+---------------------------------------------------------------------------+
|  [Inductees] [Nominees] [Statistics] [Add Player]                          |
+---------------------------------------------------------------------------+
|                                                                            |
|  CLASS OF SEASON 4                                                         |
|  +-------------------+----------+----------+--------+---------------------+
|  | Player            | Position | WAR      | Teams  | Career Highlights   |
|  +-------------------+----------+----------+--------+---------------------+
|  | Willie Mays       | CF       | 156.2    | Giants | 2x MVP, 24x AS      |
|  | Hank Aaron        | RF       | 143.0    | Braves | 755 HR, 3x GG       |
|  +-------------------+----------+----------+--------+---------------------+
|                                                                            |
|  ALL INDUCTEES (12 total)                                                  |
|  [View Full List →]                                                        |
|                                                                            |
|  SUGGESTED CANDIDATES (Career WAR 50+, Retired)                            |
|  +-------------------+----------+----------+--------+---------------------+
|  | Tom Seaver        | SP       | 98.5     | Giants | 3x Cy Young         |
|  +-------------------+----------+----------+--------+---------------------+
|  [+ INDUCT PLAYER]                                                         |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

### PHASE 2: FREE AGENCY

#### Step 1: Protect One Player

```
+---------------------------------------------------------------------------+
|  FREE AGENCY - Round 1 of 2                                                |
+---------------------------------------------------------------------------+
|  Team: Giants                                                     [1 of 8] |
|                                                                            |
|  SELECT ONE PLAYER TO PROTECT FROM FREE AGENCY                             |
|                                                                            |
|  +-------------------+------+-------+--------+-------------+--------------+
|  | Player            | Pos  | Grade | WAR    | Personality | Protect      |
|  +-------------------+------+-------+--------+-------------+--------------+
|  | Barry Bonds       | LF   | A     | 3.5    | Competitive | ( )          |
|  | Ken Griffey Jr    | CF   | A-    | 2.1    | Jolly       | ( )          |
|  | Mike Trout        | RF   | A+    | 4.2    | Relaxed     | (●) ← Selected|
|  | ...               | ...  | ...   | ...    | ...         | ( )          |
|  +-------------------+------+-------+--------+-------------+--------------+
|                                                                            |
|                    [CONFIRM PROTECTION]                                    |
|                                                                            |
+---------------------------------------------------------------------------+
```

#### Step 2: Dice Assignment Display

After protection, show the 11 at-risk players with dice assignments:

```
+---------------------------------------------------------------------------+
|  FREE AGENCY DICE ASSIGNMENT - Giants                                      |
+---------------------------------------------------------------------------+
|                                                                            |
|  Protected: Mike Trout                                                     |
|                                                                            |
|  AT-RISK PLAYERS (Sorted by desirability - 7 = most likely to leave)       |
|                                                                            |
|  +------+-------------------+------+-------+-------------+-----------------+
|  | Dice | Player            | Pos  | Grade | Personality | If Leaves...    |
|  +------+-------------------+------+-------+-------------+-----------------+
|  |  2   | Joe Scrub         | C    | C     | Droopy      | Retires         |
|  |  3   | Jane Backup       | UTIL | C+    | Relaxed     | Random team     |
|  |  4   | Sam Serviceable   | 2B   | B-    | Timid       | → Champions     |
|  |  5   | Pat Prospect      | SS   | B     | Competitive | → Rival         |
|  |  6   | Chris Contributor | 3B   | B     | Tough       | → Best OPS      |
|  |  7   | Alex Allstar      | 1B   | B+    | Egotistical | → Worst WAR     |
|  |  8   | Morgan Mainstay   | RF   | B+    | Jolly       | STAYS           |
|  |  9   | Riley Reliable    | SP   | B     | Relaxed     | Random team     |
|  | 10   | Taylor Trusty     | RP   | B+    | Competitive | → Rival         |
|  | 11   | Jordan Journeyman | CP   | B     | Timid       | → Champions     |
|  | 12   | Casey Clutch      | DH   | A-    | Jolly       | STAYS           |
|  +------+-------------------+------+-------+-------------+-----------------+
|                                                                            |
|  Note: Dice value 7 is most probable (16.7%), 2 and 12 are least (2.8%)    |
|                                                                            |
|                    [ 🎲🎲 ROLL THE DICE ]                                  |
|                                                                            |
+---------------------------------------------------------------------------+
```

#### Step 3: Animated Dice Roll

```
+---------------------------------------------------------------------------+
|  FREE AGENCY DICE ROLL - Giants                                            |
+---------------------------------------------------------------------------+
|                                                                            |
|                         ┌───────┐   ┌───────┐                              |
|                         │ ● ● ● │   │   ●   │                              |
|                         │   ●   │   │   ●   │                              |
|                         │ ● ● ● │   │   ●   │                              |
|                         └───────┘   └───────┘                              |
|                             6    +     3     =  9                          |
|                                                                            |
|  ══════════════════════════════════════════════════════════════════════   |
|                                                                            |
|  RESULT: Riley Reliable (SP, B, Relaxed) is leaving!                       |
|                                                                            |
|  Destination: Rolling for random team...                                   |
|                                                                            |
|                    [ 🎲🎲 ROLL FOR DESTINATION ]                           |
|                                                                            |
+---------------------------------------------------------------------------+
```

#### Step 4: Destination Roll (for Relaxed personality)

```
+---------------------------------------------------------------------------+
|  FREE AGENCY DESTINATION - Riley Reliable                                  |
+---------------------------------------------------------------------------+
|                                                                            |
|  Personality: Relaxed (goes to random team)                                |
|                                                                            |
|  Team Assignment:                                                          |
|  +------+-------------------+                                              |
|  | Dice | Team              |                                              |
|  +------+-------------------+                                              |
|  |  2   | Yankees           |                                              |
|  |  3   | Red Sox           |                                              |
|  |  4   | Dodgers           |                                              |
|  |  5   | Cubs              |                                              |
|  |  6   | Cardinals         |                                              |
|  |  7   | Giants (STAYS!)   |                                              |
|  |  8   | Mets              |                                              |
|  |  9   | Braves            |                                              |
|  | 10   | Astros            |                                              |
|  | 11   | Mariners          |                                              |
|  | 12   | Padres            |                                              |
|  +------+-------------------+                                              |
|                                                                            |
|                         ┌───────┐   ┌───────┐                              |
|                         │ ●   ● │   │   ●   │                              |
|                         │   ●   │   │ ●   ● │                              |
|                         │ ●   ● │   │   ●   │                              |
|                         └───────┘   └───────┘                              |
|                             5    +     4     =  9                          |
|                                                                            |
|  RESULT: Riley Reliable is going to the BRAVES!                            |
|                                                                            |
|                    [CONTINUE TO PLAYER SWAP]                               |
|                                                                            |
+---------------------------------------------------------------------------+
```

#### Step 5: Player Swap Selection

```
+---------------------------------------------------------------------------+
|  PLAYER SWAP - Braves receive Riley Reliable (SP, B)                       |
+---------------------------------------------------------------------------+
|                                                                            |
|  The Braves must send a PITCHER back to the Giants.                        |
|                                                                            |
|  Record comparison:                                                        |
|  • Giants: 28-12 (BETTER record)                                           |
|  • Braves: 22-18 (WORSE record)                                            |
|                                                                            |
|  Rule: Worse team can send back a player up to HALF GRADE lower.           |
|  Riley Reliable is grade B, so Braves can send back B- or better.          |
|                                                                            |
|  ELIGIBLE PITCHERS TO SEND:                                                |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Player            | Pos  | Grade | WAR    | Select                      |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Greg Maddux       | SP   | A     | 3.2    | ( ) Exceeds requirement     |
|  | John Smoltz       | SP   | B+    | 2.1    | ( ) Meets requirement       |
|  | Tom Glavine       | SP   | B     | 1.8    | ( ) Meets requirement       |
|  | Mark Wohlers      | RP   | B-    | 0.9    | (●) Minimum allowed ←       |
|  | Steve Avery       | SP   | C+    | 0.5    | (X) Below minimum           |
|  +-------------------+------+-------+--------+-----------------------------+
|                                                                            |
|                    [CONFIRM SWAP: Mark Wohlers → Giants]                   |
|                                                                            |
+---------------------------------------------------------------------------+
```

#### Personality Destination Summary

| Personality | Destination Logic |
|-------------|-------------------|
| **Competitive** | Team's rival (closest H2H record to .500 all-time) |
| **Relaxed** | Random team via dice roll (current team included - stays free if rolled) |
| **Droopy** | Retires immediately (additional retirement, no swap) |
| **Jolly** | Stays with current team (no move) |
| **Tough** | Team with highest team OPS this season |
| **Timid** | Team that won the championship |
| **Egotistical** | Worst team by total team WAR this season |

```javascript
function determineDestination(player, sourceTeam, leagueData) {
  const personality = player.personality;

  switch (personality) {
    case 'Competitive':
      return findRival(sourceTeam, leagueData.allTimeHeadToHead);

    case 'Relaxed':
      return null;  // Requires dice roll, includes current team

    case 'Droopy':
      return 'RETIRES';  // Additional retirement

    case 'Jolly':
      return sourceTeam;  // Stays

    case 'Tough':
      return getTeamWithHighestOPS(leagueData.seasonStats);

    case 'Timid':
      return leagueData.champion;

    case 'Egotistical':
      return getTeamWithLowestWAR(leagueData.seasonStats);

    default:
      return null;
  }
}

function findRival(team, headToHeadRecords) {
  // Find team with H2H record closest to .500
  let closestRival = null;
  let closestDiff = Infinity;

  for (const [opponentId, record] of Object.entries(headToHeadRecords[team.id])) {
    const winPct = record.wins / (record.wins + record.losses);
    const diffFrom500 = Math.abs(winPct - 0.500);

    if (diffFrom500 < closestDiff) {
      closestDiff = diffFrom500;
      closestRival = opponentId;
    }
  }

  return closestRival;
}
```

#### Player Swap Grade Rules

```javascript
function getMinimumReturnGrade(incomingPlayerGrade, receivingTeamRecord, sendingTeamRecord) {
  const gradeOrder = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
  const incomingIndex = gradeOrder.indexOf(incomingPlayerGrade);

  const receivingWinPct = receivingTeamRecord.wins / (receivingTeamRecord.wins + receivingTeamRecord.losses);
  const sendingWinPct = sendingTeamRecord.wins / (sendingTeamRecord.wins + sendingTeamRecord.losses);

  if (receivingWinPct >= sendingWinPct) {
    // Better team receiving: must return EQUAL OR BETTER grade
    return incomingPlayerGrade;
  } else {
    // Worse team receiving: can return up to HALF GRADE worse
    // Half grade = 1 step down in our grade order
    const minIndex = Math.min(incomingIndex + 1, gradeOrder.length - 1);
    return gradeOrder[minIndex];
  }
}
```

---

### PHASE 3: EXPANSION/CONTRACTION

```
+---------------------------------------------------------------------------+
|  LEAGUE STRUCTURE - Season 5                                               |
+---------------------------------------------------------------------------+
|                                                                            |
|  Current Teams (8):                                                        |
|  [x] Giants    [x] Yankees    [x] Dodgers    [x] Red Sox                   |
|  [x] Cubs      [x] Cardinals  [x] Braves     [x] Mets                      |
|                                                                            |
|  EXPANSION OPTIONS:                                                        |
|  [ ] Add Expansion Team(s)                                                 |
|      [+ Add Team]                                                          |
|                                                                            |
|  CONTRACTION OPTIONS:                                                      |
|  [ ] Remove Team(s)                                                        |
|      Warning: Players will enter free agent pool                           |
|                                                                            |
|                    [CONFIRM LEAGUE STRUCTURE]                              |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

### PHASE 4: DRAFT

#### Step 1: Add Inactive Players to Draft

```
+---------------------------------------------------------------------------+
|  DRAFT CLASS SETUP - Season 5                                              |
+---------------------------------------------------------------------------+
|                                                                            |
|  Total Roster Gaps: 12 players needed across all teams                     |
|  Draft Class Size: 36 players (3x roster gaps)                             |
|                                                                            |
|  ADD FROM INACTIVE PLAYER DATABASE:                                        |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Player            | Pos  | Grade | Age    | Add to Draft?               |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Roberto Clemente  | RF   | A     | 28     | [x] Added                   |
|  | Sandy Koufax      | SP   | A+    | 26     | [ ] Add                     |
|  | Jackie Robinson   | 2B   | A-    | 30     | [ ] Add                     |
|  | ...               | ...  | ...   | ...    | ...                         |
|  +-------------------+------+-------+--------+-----------------------------+
|                                                                            |
|  Manually added: 1                                                         |
|  Auto-generated needed: 35                                                 |
|                                                                            |
|                    [GENERATE DRAFT CLASS]                                  |
|                                                                            |
+---------------------------------------------------------------------------+
```

#### Step 2: Generated Draft Class

```javascript
function generateDraftClass(rosterGaps, namesDatabase, existingPlayers) {
  const targetSize = rosterGaps * 3;
  const draftClass = [];

  // Grade distribution (max A-, average B-)
  const gradeDistribution = {
    'A-': 0.05,   // 5% - rare prospects
    'B+': 0.15,   // 15%
    'B':  0.25,   // 25%
    'B-': 0.30,   // 30% - most common
    'C+': 0.15,   // 15%
    'C':  0.10,   // 10%
  };

  // Position distribution (at least 2 per position)
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'];
  const minPerPosition = 2;

  // Ensure minimum coverage
  for (const position of positions) {
    for (let i = 0; i < minPerPosition; i++) {
      const player = generatePlayer(position, gradeDistribution, namesDatabase);
      draftClass.push(player);
    }
  }

  // Fill remaining slots randomly
  while (draftClass.length < targetSize) {
    const position = positions[Math.floor(Math.random() * positions.length)];
    const player = generatePlayer(position, gradeDistribution, namesDatabase);
    draftClass.push(player);
  }

  return draftClass;
}

function generatePlayer(position, gradeDistribution, namesDatabase) {
  const firstName = namesDatabase.firstNames[Math.floor(Math.random() * namesDatabase.firstNames.length)];
  const lastName = namesDatabase.lastNames[Math.floor(Math.random() * namesDatabase.lastNames.length)];
  const grade = weightedRandomGrade(gradeDistribution);
  const age = 19 + Math.floor(Math.random() * 6);  // 19-24 years old
  const ratings = generateRatingsForGrade(grade, position);
  const personality = randomPersonality();

  return {
    name: `${firstName} ${lastName}`,
    position,
    grade,
    age,
    ratings,
    personality,
    isRookie: true,
    source: 'draft'
  };
}
```

#### Step 3: Draft Order Calculation

```javascript
function calculateDraftOrder(teams, season) {
  // Calculate average expected WAR per player for each team
  const teamExpectations = teams.map(team => {
    const roster = season.rosters[team.id];
    const totalExpectedWAR = roster.reduce((sum, playerId) => {
      const expected = season.preSeasonExpectations[team.id][playerId];
      return sum + (expected?.total || 0);
    }, 0);

    const avgExpectedWAR = totalExpectedWAR / roster.length;

    return {
      teamId: team.id,
      teamName: team.name,
      rosterSize: roster.length,
      avgExpectedWAR
    };
  });

  // Sort by average expected WAR (lowest first = picks first)
  teamExpectations.sort((a, b) => a.avgExpectedWAR - b.avgExpectedWAR);

  return teamExpectations.map((t, index) => ({
    ...t,
    draftPosition: index + 1
  }));
}
```

#### Draft UI

```
+---------------------------------------------------------------------------+
|  DRAFT - Season 5                                                          |
+---------------------------------------------------------------------------+
|  Round 1, Pick 3 of 8                                                      |
|                                                                            |
|  ON THE CLOCK: Marlins (Avg Exp WAR: 1.2)                                  |
|  Roster: 20/22 (2 slots open)                                              |
|                                                                            |
|  AVAILABLE PLAYERS                                                         |
|  +-------------------+------+-------+-----+-------------+------------------+
|  | Player            | Pos  | Grade | Age | Personality | Proj WAR         |
|  +-------------------+------+-------+-----+-------------+------------------+
|  | Roberto Clemente  | RF   | A-    | 28  | Competitive | 2.8              |
|  | Johnny Prospect   | SS   | B+    | 21  | Relaxed     | 1.9              |
|  | Mike Rookie       | SP   | B     | 20  | Tough       | 1.5              |
|  | Sam Upstart       | CF   | B     | 22  | Jolly       | 1.4              |
|  | Pat Newcomer      | 3B   | B-    | 19  | Timid       | 1.1              |
|  | ...               | ...  | ...   | ... | ...         | ...              |
|  +-------------------+------+-------+-----+-------------+------------------+
|                                                                            |
|  [Sort: Proj WAR ▼]  [Filter: All Positions ▼]                             |
|                                                                            |
|  Selected: Roberto Clemente (RF, A-)                                       |
|                                                                            |
|                    [DRAFT PLAYER]  [PASS (Full Roster Only)]               |
|                                                                            |
+---------------------------------------------------------------------------+
```

#### Draft Rules

```javascript
const DRAFT_RULES = {
  rosterSize: 22,

  // Every team must draft at least once
  minimumPicks: 1,

  // If team has full roster and drafts, must release someone
  releaseRules: {
    // Drafted player must be same grade or worse than released player
    gradeConstraint: 'SAME_OR_WORSE'
  },

  // Teams can opt out after round 1 if roster is full
  canPassAfterRound1: true,

  // Released players go back into draft pool
  releasedPlayersAvailable: true,

  // Undrafted players at end retire
  undraftedRetire: true
};

function canDraftPlayer(team, player, playerToRelease = null) {
  const currentRosterSize = team.roster.length;

  if (currentRosterSize < DRAFT_RULES.rosterSize) {
    // Has open slot, can draft anyone
    return { allowed: true };
  }

  if (!playerToRelease) {
    return { allowed: false, reason: 'Must select a player to release' };
  }

  // Check grade constraint
  const draftedGradeIndex = GRADE_ORDER.indexOf(player.grade);
  const releasedGradeIndex = GRADE_ORDER.indexOf(playerToRelease.grade);

  if (draftedGradeIndex < releasedGradeIndex) {
    return {
      allowed: false,
      reason: `Cannot draft ${player.grade} player while releasing ${playerToRelease.grade} player. Drafted player must be same grade or worse.`
    };
  }

  return { allowed: true };
}
```

#### Draft Complete - Released Players

```
+---------------------------------------------------------------------------+
|  DRAFT COMPLETE                                                            |
+---------------------------------------------------------------------------+
|                                                                            |
|  All teams now have 22 players.                                            |
|                                                                            |
|  RELEASED DURING DRAFT (Not Picked Up):                                    |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Player            | Pos  | Grade | Age    | Status                      |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Old Timer         | C    | C-    | 38     | RETIRED (undrafted)         |
|  | Washed Up         | RP   | D+    | 35     | RETIRED (undrafted)         |
|  +-------------------+------+-------+--------+-----------------------------+
|                                                                            |
|  UNDRAFTED PROSPECTS (Return to Inactive Pool):                            |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Player            | Pos  | Grade | Age    | Status                      |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Young Buck        | 2B   | C+    | 20     | Available next draft        |
|  | Raw Talent        | SP   | C     | 19     | Available next draft        |
|  +-------------------+------+-------+--------+-----------------------------+
|                                                                            |
|                    [PROCEED TO MANUAL ADJUSTMENTS]                         |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

### PHASE 5: MANUAL ADJUSTMENTS

```
+---------------------------------------------------------------------------+
|  MANUAL ROSTER ADJUSTMENTS - Season 5                                      |
+---------------------------------------------------------------------------+
|                                                                            |
|  Make any final trades or roster moves before the season begins.           |
|                                                                            |
|  OPTIONS:                                                                  |
|                                                                            |
|  [EXECUTE TRADE]                                                           |
|  Move players between teams manually.                                      |
|                                                                            |
|  [EDIT PLAYER]                                                             |
|  Modify ratings, traits, or attributes.                                    |
|                                                                            |
|  [ADD FREE AGENT]                                                          |
|  Sign a player from the inactive pool.                                     |
|                                                                            |
|  [RELEASE PLAYER]                                                          |
|  Remove a player from a roster.                                            |
|                                                                            |
|  [VIEW ALL ROSTERS]                                                        |
|  Review current team compositions.                                         |
|                                                                            |
|  ─────────────────────────────────────────────────────────────────────────|
|                                                                            |
|  All teams at 22 players: ✓                                                |
|  Minimum pitchers per team: ✓                                              |
|  Ready for Season 5: ✓                                                     |
|                                                                            |
|         [CONTINUE ADJUSTMENTS]    [FINALIZE & START SEASON 5]              |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

### Season Archive & Launch

```
+---------------------------------------------------------------------------+
|  SEASON 5 READY TO LAUNCH                                                  |
+---------------------------------------------------------------------------+
|                                                                            |
|  ARCHIVING SEASON 4:                                                       |
|  ✓ Final standings saved                                                   |
|  ✓ All player stats archived                                               |
|  ✓ Awards and milestones recorded                                          |
|  ✓ Records updated                                                         |
|  ✓ Career stats aggregated                                                 |
|                                                                            |
|  SEASON 5 SETUP:                                                           |
|  ✓ 8 teams confirmed                                                       |
|  ✓ All rosters at 22 players                                               |
|  ✓ Expected WAR calculated                                                 |
|  ✓ Schedule generated                                                      |
|  ✓ Random events scheduled (20)                                            |
|  ✓ All-Star break set (Game 24 of 40)                                      |
|                                                                            |
|                    [ 🏟️ PLAY BALL! LAUNCH SEASON 5 ]                       |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

## Summary of Offseason System

| Phase | Key Actions |
|-------|-------------|
| **1. Retirements** | 1-2 per team, age+performance probability, jersey retirement option |
| **2. Free Agency** | 2 rounds, protect 1, dice roll (2-12), personality-based destination, player swap |
| **3. Expansion** | Add/remove teams |
| **4. Draft** | 3x roster gaps, reverse expected WAR order, min 1 pick per team |
| **5. Manual** | Trades, edits, final adjustments |
| **Launch** | Archive old season, start new |

---

## Still To Address

- **Names document** for fictional player generation (user will provide)
- Any additional feedback from this corrections document

---

*End of Corrections Document v2*
