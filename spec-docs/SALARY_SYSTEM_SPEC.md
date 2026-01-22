# KBL XHD Tracker - Salary System Specification v2

## Overview

The salary system adds economic depth to roster management. Player salaries reflect actual value based on ratings, performance, position, and traits - creating strategic opportunities for roster building.

**Key Principles:**
- Single-season salaries (recalculated after year-end awards/adjustments)
- Real-time updates when triggers occur (traits, fame, performance)
- Position matters (C/SS more valuable than corner OF)
- Traits affect salary (tiered impact)
- Fan happiness tied to payroll expectations
- No salary cap, but soft cap affects fan pressure

---

## Salary Calculation Formula

### Complete Formula

```javascript
function calculateSalary(player, seasonStats = null, expectations = null, isNewTeam = false) {
  // 1. Base salary from ratings (position-specific)
  let salary = calculateBaseRatingSalary(player);

  // 2. Position multiplier
  salary *= getPositionMultiplier(player.primaryPosition);

  // 3. Age factor
  salary *= calculateAgeFactor(player);

  // 4. Trait modifier
  salary *= calculateTraitModifier(player);

  // 5. Performance modifier (if season data available)
  if (seasonStats && expectations) {
    salary *= calculatePerformanceModifier(player, seasonStats, expectations);
  }

  // 6. Fame modifier
  salary *= calculateFameModifier(player);

  // 7. Personality modifier (only when joining new team)
  if (isNewTeam) {
    salary *= getPersonalityModifier(player.personality);
  }

  // Minimum salary: $500K
  return Math.max(0.5, Math.round(salary * 10) / 10);
}
```

---

## Base Salary from Ratings

### Position Player Ratings

**Corrected weights** (Power is single rating, not L/R split):

```javascript
function calculatePositionPlayerBaseSalary(player) {
  const weights = {
    power: 0.40,      // Most important for salary
    contact: 0.30,    // Second most important
    speed: 0.10,
    fielding: 0.10,
    arm: 0.10
  };

  const weightedRating = (
    player.ratings.power * weights.power +
    player.ratings.contact * weights.contact +
    player.ratings.speed * weights.speed +
    player.ratings.fielding * weights.fielding +
    player.ratings.arm * weights.arm
  );

  // Convert rating (0-100) to salary ($0.5M - $50M range)
  // Non-linear scale: elite players exponentially more expensive
  return Math.pow(weightedRating / 100, 2.5) * 50;
}
```

### Pitcher Ratings

Pitchers valued on pitching ratings only (unless two-way):

```javascript
function calculatePitcherBaseSalary(player) {
  const weights = {
    velocity: 0.35,
    junk: 0.35,
    accuracy: 0.30
  };

  const weightedRating = (
    player.ratings.velocity * weights.velocity +
    player.ratings.junk * weights.junk +
    player.ratings.accuracy * weights.accuracy
  );

  return Math.pow(weightedRating / 100, 2.5) * 50;
}
```

### Two-Way Player Ratings

Two-way players are extremely valuable - combine both:

```javascript
function calculateTwoWayBaseSalary(player) {
  const positionSalary = calculatePositionPlayerBaseSalary(player);
  const pitcherSalary = calculatePitcherBaseSalary(player);

  // Two-way premium: not just additive, multiplicative bonus
  const combinedSalary = (positionSalary + pitcherSalary) * 1.25;

  return combinedSalary;
}
```

### Base Salary Router

```javascript
function calculateBaseRatingSalary(player) {
  if (player.primaryPosition === 'TWO-WAY') {
    return calculateTwoWayBaseSalary(player);
  } else if (isPitcher(player.primaryPosition)) {
    return calculatePitcherBaseSalary(player);
  } else {
    return calculatePositionPlayerBaseSalary(player);
  }
}
```

---

## Position Multipliers

Premium defensive positions command higher salaries (mild impact 5-15%):

```javascript
const POSITION_MULTIPLIERS = {
  // Premium positions
  'C':   1.15,    // Most valuable - demands defensive + game management
  'SS':  1.12,    // Premium up-the-middle defense

  // Above average
  'CF':  1.08,    // Covers most ground
  '2B':  1.05,    // Up-the-middle, double play pivot

  // Average
  '3B':  1.02,    // Hot corner reflexes
  'SP':  1.00,    // Baseline for pitchers
  'CP':  1.00,    // Closers

  // Below average (offense-first positions)
  'RF':  0.98,
  'LF':  0.95,
  '1B':  0.92,    // Least defensive value
  'DH':  0.88,    // No defensive value

  // Relievers (less innings = less value)
  'RP':  0.85,
  'SP/RP': 0.92,

  // Utility (versatility has value)
  'UTIL': 1.05,
  'BENCH': 0.80
};

function getPositionMultiplier(position) {
  return POSITION_MULTIPLIERS[position] || 1.00;
}
```

### Example Impact

| Player | Weighted Rating | Base Salary | Position | Multiplier | Final Base |
|--------|-----------------|-------------|----------|------------|------------|
| Johnny Bench | 85 | $28.0M | C | 1.15x | $32.2M |
| Similar OF | 85 | $28.0M | LF | 0.95x | $26.6M |
| Elite SS | 90 | $38.0M | SS | 1.12x | $42.6M |
| Elite 1B | 90 | $38.0M | 1B | 0.92x | $35.0M |

---

## Trait Salary Modifiers

Traits are categorized into tiers with different salary impacts:

### Positive Trait Tiers

```javascript
const ELITE_POSITIVE_TRAITS = [
  // Game-changing traits
  'Clutch',           // Performs in big moments
  'Two Way',          // Extremely rare and valuable
  'Utility',          // Roster flexibility
  'Durable',          // Availability
  'Composed',         // Consistent performance
];

const GOOD_POSITIVE_TRAITS = [
  // Strong situational advantages
  'Cannon Arm',
  'Stealer',
  'Magic Hands',
  'Dive Wizard',
  'K Collector',
  'Rally Stopper',
  'RBI Hero',
  'Gets Ahead',
  'Tough Out',
  'First Pitch Slayer',
  'Sprinter',
];

const MINOR_POSITIVE_TRAITS = [
  // Helpful but situational
  'Pinch Perfect',
  'Base Rounder',
  'Stimulated',
  'Specialist',
  'Reverse Splits',
  'Pick Officer',
  'Sign Stealer',
  'Mind Gamer',
  'Distractor',
  'Bad Ball Hitter',
  'Fastball Hitter',
  'Off-Speed Hitter',
  'Low Pitch',
  'High Pitch',
  'Inside Pitch',
  'Outside Pitch',
  'Metal Head',
  'Consistent',
  'Rally Starter',
  'CON vs LHP',
  'CON vs RHP',
  'POW vs LHP',
  'POW vs RHP',
  'Ace Exterminator',
  'Bunter',
  'Big Hack',
  'Little Hack',
  'Elite 4F',
  'Elite 2F',
  'Elite CF',
  'Elite FK',
  'Elite SL',
  'Elite CB',
  'Elite CH',
  'Elite SB',
];
```

### Negative Trait Tiers

```javascript
const SEVERE_NEGATIVE_TRAITS = [
  // Significantly hurts value
  'Choker',           // Fails in big moments
  'Meltdown',         // Complete collapse risk
  'Injury Prone',     // Availability concerns
  'Volatile',         // Inconsistent
];

const MODERATE_NEGATIVE_TRAITS = [
  // Notable disadvantages
  'Whiffer',
  'Butter Fingers',
  'Noodle Arm',
  'Wild Thrower',
  'BB Prone',
  'Wild Thing',
  'Falls Behind',
  'K Neglecter',
  'Slow Poke',
];

const MINOR_NEGATIVE_TRAITS = [
  // Situational disadvantages
  'First Pitch Prayer',
  'Bad Jumps',
  'Easy Jumps',
  'Easy Target',
  'Base Jogger',
  'Surrounded',
  'RBI Zero',
  'Crossed Up',
];
```

### Trait Modifier Calculation

```javascript
const TRAIT_SALARY_IMPACT = {
  ELITE_POSITIVE: 1.10,     // +10%
  GOOD_POSITIVE: 1.05,      // +5%
  MINOR_POSITIVE: 1.02,     // +2%
  MINOR_NEGATIVE: 0.98,     // -2%
  MODERATE_NEGATIVE: 0.95,  // -5%
  SEVERE_NEGATIVE: 0.90,    // -10%
};

function calculateTraitModifier(player) {
  let modifier = 1.0;

  for (const trait of player.traits) {
    if (ELITE_POSITIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.ELITE_POSITIVE;
    } else if (GOOD_POSITIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.GOOD_POSITIVE;
    } else if (MINOR_POSITIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.MINOR_POSITIVE;
    } else if (SEVERE_NEGATIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.SEVERE_NEGATIVE;
    } else if (MODERATE_NEGATIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.MODERATE_NEGATIVE;
    } else if (MINOR_NEGATIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.MINOR_NEGATIVE;
    }
  }

  return modifier;
}
```

### Example: Trait Impact on Salary

| Player | Base Salary | Traits | Modifier | Final |
|--------|-------------|--------|----------|-------|
| Star A | $30.0M | Clutch (+10%), Durable (+10%) | 1.21x | $36.3M |
| Star B | $30.0M | Choker (-10%), Whiffer (-5%) | 0.855x | $25.7M |
| Star C | $30.0M | Utility (+10%), Injury Prone (-10%) | 0.99x | $29.7M |

---

## Age Factor

```javascript
function calculateAgeFactor(player) {
  const age = player.age;

  if (age <= 24) return 0.70;       // Rookie scale
  if (age <= 26) return 0.85;       // Pre-arb
  if (age <= 29) return 1.00;       // Prime
  if (age <= 32) return 1.10;       // Peak earning
  if (age <= 35) return 1.00;       // Veteran
  if (age <= 38) return 0.85;       // Declining
  return 0.70;                       // Twilight
}
```

---

## Performance Modifier

```javascript
function calculatePerformanceModifier(player, seasonStats, expectations) {
  const actualWAR = seasonStats.war.total;
  const expectedWAR = expectations.total;
  const delta = actualWAR - expectedWAR;

  // Each WAR above/below expectation = +/- 10% salary
  const modifier = 1 + (delta * 0.10);

  // Cap at +/- 50%
  return Math.max(0.5, Math.min(1.5, modifier));
}
```

---

## Fame Modifier

```javascript
function calculateFameModifier(player) {
  const fame = player.currentFame;

  // Each point of fame = +/- 3% salary
  const modifier = 1 + (fame * 0.03);

  // Cap at +/- 30%
  return Math.max(0.7, Math.min(1.3, modifier));
}
```

---

## Personality Modifier (Free Agency Only)

Only applies when joining a new team:

```javascript
const PERSONALITY_SALARY_MODIFIERS = {
  'Egotistical': 1.15,  // Demands premium
  'Competitive': 1.05,  // Wants to win, slightly motivated
  'Tough': 1.00,        // Fair market
  'Relaxed': 0.95,      // Doesn't negotiate hard
  'Jolly': 0.90,        // Happy to be there
  'Timid': 0.85,        // Takes discount to join winner
  'Droopy': 1.00        // N/A (retires)
};

function getPersonalityModifier(personality) {
  return PERSONALITY_SALARY_MODIFIERS[personality] || 1.00;
}
```

---

## Real-Time Salary Updates

### Trigger Events

Salary recalculates immediately when:

| Trigger | Effect |
|---------|--------|
| Game completed | WAR changes → performance modifier updates |
| Fame event | Fame bonus/boner → fame modifier updates |
| Trait added/removed | Trait modifier recalculates |
| All-Star selection | Trait may change → trait modifier updates |
| Random event (ratings) | Base salary recalculates |
| Award received | Ratings/traits may change → full recalc |
| End of season | Full recalculation for next season baseline |

### All-Star Salary Update Example

```javascript
function handleAllStarTraitChange(player, oldTrait, newTrait) {
  const previousSalary = player.currentSalary;

  // Recalculate with new trait
  player.currentSalary = calculateSalary(player, seasonStats, expectations, false);

  const change = player.currentSalary - previousSalary;

  // Log the change
  logSalaryChange(player, {
    trigger: 'ALL_STAR_TRAIT_CHANGE',
    oldTrait,
    newTrait,
    previousSalary,
    newSalary: player.currentSalary,
    change
  });

  // Example: Empty slot replaced by Choker trait
  // Base $25M → Choker (-10%) → New salary $22.5M
}
```

---

## Fan Happiness System

### Fan Happiness Calculation

```javascript
function calculateFanHappiness(team, season) {
  let happiness = 50;  // Start neutral (0-100 scale)

  // Payroll expectations
  const payrollPercentile = getPayrollPercentile(team, season);
  const expectedWinPct = getExpectedWinPctFromPayroll(payrollPercentile);
  const actualWinPct = team.wins / (team.wins + team.losses);

  // Performance vs expectations (biggest factor)
  const performanceDelta = actualWinPct - expectedWinPct;

  // HIGH PAYROLL AMPLIFIER: Top payroll teams get amplified unhappiness
  // A top-25% payroll team underperforming loses MORE fan happiness
  let amplifier = 1.0;
  if (payrollPercentile >= 0.75 && performanceDelta < 0) {
    amplifier = 1.5;  // 50% worse for high-payroll underperformers
  } else if (payrollPercentile >= 0.50 && performanceDelta < 0) {
    amplifier = 1.25;  // 25% worse for above-average payroll
  }

  happiness += performanceDelta * 100 * amplifier;  // Amplified for high payroll

  // Recent trend (last 10 games)
  const recentWinPct = team.last10.wins / 10;
  if (recentWinPct >= 0.7) happiness += 10;
  else if (recentWinPct <= 0.3) happiness -= 10 * amplifier;  // Also amplified

  // Star player performance (high payroll teams have more stars to disappoint)
  const topSalaryPlayers = getTopPaidPlayers(team, 3);  // Top 3 earners
  for (const player of topSalaryPlayers) {
    if (player.seasonWAR < player.expectedWAR * 0.5) {
      happiness -= 5 * amplifier;  // Each underperforming star hurts
    }
  }

  // Playoff position
  if (isInPlayoffPosition(team)) happiness += 10;
  if (isLastPlace(team)) {
    happiness -= 10;
    // EXTRA PENALTY: Last place with top payroll is catastrophic
    if (payrollPercentile >= 0.75) {
      happiness -= 15;  // Additional penalty
    }
  }

  // Cap at 0-100
  return Math.max(0, Math.min(100, happiness));
}
```

### Payroll-Based Expectations

```javascript
function getExpectedWinPctFromPayroll(payrollPercentile) {
  // Higher payroll = higher expectations
  if (payrollPercentile >= 0.875) return 0.600;  // Top 12.5% → expect 60% wins
  if (payrollPercentile >= 0.750) return 0.550;  // Top 25% → expect 55%
  if (payrollPercentile >= 0.500) return 0.500;  // Top 50% → expect .500
  if (payrollPercentile >= 0.250) return 0.450;  // Bottom 50% → expect 45%
  return 0.400;                                   // Bottom 25% → expect 40%
}
```

### Fan Happiness Thresholds

| Happiness | Status | Effects |
|-----------|--------|---------|
| 80-100 | Ecstatic | No negative effects, immunity from contraction |
| 60-79 | Happy | Normal operations |
| 40-59 | Neutral | Normal operations |
| 20-39 | Unhappy | Manager hot seat (+10% mid-season fire chance) |
| 10-19 | Angry | Manager very hot seat (+25% fire chance) |
| 0-9 | **Furious** | Contraction risk at season end |

### Mid-Season Manager Firing

```javascript
function checkManagerFireRisk(team, season) {
  const happiness = calculateFanHappiness(team, season);
  const gamesPlayed = team.wins + team.losses;
  const minGamesForFire = Math.floor(season.config.gamesPerTeam * 0.25);

  if (gamesPlayed < minGamesForFire) return 0;  // Too early

  let fireChance = 0;

  if (happiness < 10) fireChance = 0.25;       // 25% per check
  else if (happiness < 20) fireChance = 0.15;  // 15%
  else if (happiness < 30) fireChance = 0.10;  // 10%
  else if (happiness < 40) fireChance = 0.05;  // 5%

  // Firing manager boosts happiness by 15 points
  return fireChance;
}

function fireManager(team) {
  const firedManager = team.manager;

  // Replace with generic interim manager
  team.manager = generateInterimManager();

  // Happiness boost
  team.fanHappiness = Math.min(100, team.fanHappiness + 15);

  return {
    firedManager,
    newManager: team.manager,
    happinessBoost: 15
  };
}
```

---

## Contraction System

### Contraction Risk Check (End of Season)

```javascript
function checkContractionRisk(team, season) {
  const finalHappiness = calculateFanHappiness(team, season);

  if (finalHappiness >= 10) {
    return { atRisk: false };
  }

  // Fan happiness below 10 = contraction risk
  return {
    atRisk: true,
    currentHappiness: finalHappiness,
    canRecover: true,  // Offseason moves can save them
    recoveryThreshold: 10
  };
}
```

### Contraction Prevention (Offseason)

Teams at risk can recover during offseason:

```javascript
function checkContractionRecovery(team, offseasonMoves) {
  let happinessGain = 0;

  // Retirement of overpaid underperformer
  for (const retirement of offseasonMoves.retirements) {
    if (retirement.wasUnderperformer) happinessGain += 5;
  }

  // Acquiring popular free agent
  for (const acquisition of offseasonMoves.freeAgencyAcquisitions) {
    if (acquisition.player.fame >= 3) happinessGain += 5;
    if (acquisition.player.grade >= 'A-') happinessGain += 3;
  }

  // Shedding bad contracts
  for (const loss of offseasonMoves.freeAgencyLosses) {
    if (loss.wasOverpaid) happinessGain += 3;
  }

  const newHappiness = team.fanHappiness + happinessGain;

  if (newHappiness >= 10) {
    return {
      recovered: true,
      newHappiness,
      message: `${team.name} fans have renewed hope! Team avoids contraction.`
    };
  }

  return {
    recovered: false,
    newHappiness,
    message: `${team.name} will be contracted. Players enter expansion draft pool.`
  };
}
```

---

## Expansion Draft System

When a team is contracted OR a new expansion team is added:

### Step 1: Player Availability

Each existing team must make available:
- **2 position players**
- **2 pitchers**

All made-available players must be **within +/- 10% of replacement level WAR**.

```javascript
function getReplacementLevelWAR(position, gamesPerSeason) {
  // Replacement level is roughly 0 WAR for a full season
  // Scale by season length
  const scaleFactor = gamesPerSeason / 162;

  // Position adjustments (catchers have lower replacement level)
  const positionAdjustments = {
    'C': -0.2, 'SS': 0, 'CF': 0, '2B': 0,
    '3B': 0.1, 'RF': 0.1, 'LF': 0.1, '1B': 0.2, 'DH': 0.3,
    'SP': 0, 'RP': 0.1, 'CP': 0
  };

  const baseReplacement = 0;
  const adjustment = positionAdjustments[position] || 0;

  return (baseReplacement + adjustment) * scaleFactor;
}

function isWithinReplacementRange(player, seasonStats, gamesPerSeason) {
  const replacementWAR = getReplacementLevelWAR(player.primaryPosition, gamesPerSeason);
  const playerWAR = seasonStats.war.total;

  const lowerBound = replacementWAR * 0.9;
  const upperBound = replacementWAR * 1.1;

  // Since replacement is ~0, use absolute range
  return playerWAR >= -0.5 && playerWAR <= 0.5;
}
```

### Step 2: Team Makes Players Available

```
+---------------------------------------------------------------------------+
|  EXPANSION DRAFT - Player Availability                                     |
+---------------------------------------------------------------------------+
|  Team: Giants                                                              |
|                                                                            |
|  Select 2 POSITION PLAYERS to make available:                              |
|  (Must be within replacement level +/- 10%)                                |
|                                                                            |
|  ELIGIBLE PLAYERS:                                                         |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Player            | Pos  | Grade | WAR    | Select                      |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Joe Backup        | UTIL | C+    | +0.2   | [x] Selected                |
|  | Sam Bench         | OF   | C     | -0.1   | [x] Selected                |
|  | Pat Platoon       | 1B   | C+    | +0.4   | [ ] Eligible                |
|  | Chris Reserve     | IF   | C     | +0.1   | [ ] Eligible                |
|  +-------------------+------+-------+--------+-----------------------------+
|                                                                            |
|  Select 2 PITCHERS to make available:                                      |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Player            | Pos  | Grade | WAR    | Select                      |
|  +-------------------+------+-------+--------+-----------------------------+
|  | Mike Mopup        | RP   | C     | +0.1   | [x] Selected                |
|  | Tom Longman       | RP   | C+    | +0.3   | [x] Selected                |
|  +-------------------+------+-------+--------+-----------------------------+
|                                                                            |
|                    [CONFIRM SELECTIONS]                                    |
+---------------------------------------------------------------------------+
```

### Step 3: Expansion Team Drafts

```javascript
const EXPANSION_DRAFT_RULES = {
  maxPicks: 20,           // Draft up to 20 players
  rosterTarget: 22,       // Need 22 total
  remainingFromDraft: 2,  // Get rest in regular draft

  // Salary constraints
  salaryFloor: null,      // Calculated based on league average
  salaryCeiling: null,    // Calculated based on league average

  // Can't take more than 2 from any one team
  maxPerTeam: 2
};

function calculateExpansionSalaryLimits(leagueData) {
  const avgTeamSalary = leagueData.totalLeagueSalary / leagueData.teams.length;

  return {
    floor: avgTeamSalary * 0.60,    // At least 60% of average
    ceiling: avgTeamSalary * 0.90   // No more than 90% of average
  };
}
```

### Step 4: Expansion Draft UI

```
+---------------------------------------------------------------------------+
|  EXPANSION DRAFT - New Team: Nashville Stars                               |
+---------------------------------------------------------------------------+
|                                                                            |
|  SALARY CONSTRAINTS                                                        |
|  League Average Payroll: $120M                                             |
|  Your Floor: $72M (must reach)                                             |
|  Your Ceiling: $108M (cannot exceed)                                       |
|  Current Payroll: $45.2M                                                   |
|                                                                            |
|  ROSTER: 12/22 players (8 remaining picks, then regular draft)             |
|                                                                            |
|  AVAILABLE PLAYERS (Pick 13 of 20)                                         |
|  +-------------------+------+-------+--------+----------+------------------+
|  | Player            | Team | Grade | Salary | WAR      | Picks from Team  |
|  +-------------------+------+-------+--------+----------+------------------+
|  | Joe Backup        | SFG  | C+    | $2.5M  | +0.2     | 1 of 2 max       |
|  | Sam Bench         | SFG  | C     | $1.8M  | -0.1     | 1 of 2 max       |
|  | Mike Mopup        | NYY  | C     | $1.5M  | +0.1     | 0 of 2 max       |
|  | Tom Longman       | NYY  | C+    | $2.2M  | +0.3     | 0 of 2 max       |
|  | ...               | ...  | ...   | ...    | ...      | ...              |
|  +-------------------+------+-------+--------+----------+------------------+
|                                                                            |
|  [Sort: Salary ▼]  [Filter: Position ▼]                                    |
|                                                                            |
|                    [DRAFT SELECTED PLAYER]  [PASS - Fill in Regular Draft] |
+---------------------------------------------------------------------------+
```

### Step 5: Regular Draft Completion

After expansion draft, expansion team:
- Picks first in regular draft (worst expected WAR)
- Gets extra picks to fill remaining roster slots
- Must stay within salary ceiling

---

## Salary Integration with Free Agency

### Replace Grade-Based with Salary-Based Swaps

```javascript
function calculateSwapRequirement(outgoingPlayer, receivingTeamRecord, sendingTeamRecord) {
  const outgoingSalary = outgoingPlayer.currentSalary;

  const receivingWinPct = receivingTeamRecord.wins / (receivingTeamRecord.wins + receivingTeamRecord.losses);
  const sendingWinPct = sendingTeamRecord.wins / (sendingTeamRecord.wins + sendingTeamRecord.losses);

  let salaryRange;

  if (receivingWinPct >= sendingWinPct) {
    // Better team receiving: must return 90-110% of salary value
    salaryRange = {
      min: outgoingSalary * 0.90,
      max: outgoingSalary * 1.10
    };
  } else {
    // Worse team receiving: can return 70-100% of salary value
    salaryRange = {
      min: outgoingSalary * 0.70,
      max: outgoingSalary * 1.00
    };
  }

  return salaryRange;
}
```

### Multi-Player Swaps Allowed

Teams can send multiple players to match salary requirements.

---

## Year-End Salary Reset

At season end, after all awards and adjustments:

```javascript
function calculateNextSeasonBaseSalary(player, completedSeason) {
  // Full recalculation with updated ratings, traits, etc.
  const newSalary = calculateSalary(
    player,
    completedSeason.playerSeasonStats[player.id],
    completedSeason.preSeasonExpectations[player.teamId][player.id],
    false
  );

  // This becomes their baseline for next season
  player.nextSeasonSalary = newSalary;

  return newSalary;
}
```

This updated salary:
- Makes overperformers more attractive trade targets
- Makes underperformers easier to move
- Creates interesting draft/FA decisions

---

## ROI Leaderboards

### Best Value (WAR per $M)

```javascript
function calculateROI(player, seasonStats) {
  const war = seasonStats.war.total;
  const salary = player.currentSalary;

  if (salary <= 0) return 0;

  return war / salary;
}
```

### Leaderboard Display

```
+---------------------------------------------------------------------------+
|  BEST VALUE PLAYERS - Season 4                         [Worst Value →]     |
+---------------------------------------------------------------------------+
|  Rank | Player            | Team    | Salary  | WAR   | ROI (WAR/$M)       |
+---------------------------------------------------------------------------+
|  1    | Rookie Star       | MIA     | $1.2M   | 2.8   | 2.33               |
|  2    | Bargain Vet       | OAK     | $3.5M   | 3.2   | 0.91               |
|  3    | Young Gun         | TB      | $2.0M   | 1.8   | 0.90               |
+---------------------------------------------------------------------------+

+---------------------------------------------------------------------------+
|  WORST VALUE PLAYERS - Season 4                        [Best Value →]      |
+---------------------------------------------------------------------------+
|  Rank | Player            | Team    | Salary  | WAR   | ROI (WAR/$M)       |
+---------------------------------------------------------------------------+
|  1    | Aging Star        | NYY     | $38.0M  | 0.3   | 0.008              |
|  2    | Injured Ace       | LAD     | $32.0M  | 0.5   | 0.016              |
|  3    | Slumping Slugger  | BOS     | $28.0M  | 0.8   | 0.029              |
+---------------------------------------------------------------------------+
```

---

## Summary: Complete Salary System

| Component | Impact |
|-----------|--------|
| **Base Ratings** | Power 40%, Contact 30%, Speed/Field/Arm 10% each |
| **Position** | C +15%, SS +12%, CF +8%, 1B -8%, DH -12% |
| **Age** | Rookie 70%, Prime 100%, Peak 110%, Twilight 70% |
| **Traits** | Elite +10%, Good +5%, Minor +2% (inverse for negative) |
| **Performance** | +/-10% per WAR vs expectations (capped +/-50%) |
| **Fame** | +/-3% per fame point (capped +/-30%) |
| **Personality** | Egotistical +15%, Timid -15% (FA only) |
| **Fan Happiness** | Payroll sets expectations, affects manager/contraction |
| **Expansion** | 2 position + 2 pitchers per team, replacement level only |

---

*End of Salary System Specification v2*
