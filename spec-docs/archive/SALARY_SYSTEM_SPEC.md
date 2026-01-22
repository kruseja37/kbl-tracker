# KBL XHD Tracker - Salary System Specification

## Overview

The salary system adds economic depth to roster management without a salary cap (because BASEBALL!). Player salaries reflect actual value based on ratings AND performance, creating strategic opportunities for roster building.

---

## Core Concept: Dynamic Salary Value

Salary is NOT just a reflection of grade. It's calculated from:

1. **Base Rating Value** (weighted ratings)
2. **Performance Modifier** (WAR vs expectations)
3. **Fame Modifier** (narrative value)
4. **Personality Modifier** (free agency behavior)
5. **Age/Experience Factor**

This creates scenarios where:
- A B+ player playing like an A- has a higher salary than their grade suggests
- An A-grade player having a bad year sees their salary drop
- A fan favorite commands premium salary
- A young breakout player becomes a bargain

---

## Salary Calculation

### Base Salary from Ratings

Weighted rating calculation (Power weighted most heavily):

```javascript
function calculateBaseRatingSalary(player) {
  const weights = {
    powerL: 0.20,
    powerR: 0.20,
    contactL: 0.15,
    contactR: 0.15,
    speed: 0.10,
    fielding: 0.10,
    arm: 0.10
  };

  // For pitchers, use pitching ratings
  const pitcherWeights = {
    velocity: 0.35,
    junk: 0.35,
    accuracy: 0.30
  };

  let weightedRating;

  if (isPitcher(player)) {
    weightedRating = (
      player.ratings.velocity * pitcherWeights.velocity +
      player.ratings.junk * pitcherWeights.junk +
      player.ratings.accuracy * pitcherWeights.accuracy
    );
  } else {
    weightedRating = (
      player.ratings.powerL * weights.powerL +
      player.ratings.powerR * weights.powerR +
      player.ratings.contactL * weights.contactL +
      player.ratings.contactR * weights.contactR +
      player.ratings.speed * weights.speed +
      player.ratings.fielding * weights.fielding +
      player.ratings.arm * weights.arm
    );
  }

  // Convert rating (0-100) to salary ($1M - $50M range)
  // Non-linear scale: elite players are exponentially more expensive
  const baseSalary = Math.pow(weightedRating / 100, 2.5) * 50;

  return Math.round(baseSalary * 10) / 10;  // Round to nearest $100K
}
```

### Rating-to-Salary Scale (Position Players)

| Weighted Rating | Approximate Salary |
|-----------------|-------------------|
| 95+ | $45-50M |
| 90-94 | $35-44M |
| 85-89 | $25-34M |
| 80-84 | $18-24M |
| 75-79 | $12-17M |
| 70-74 | $8-11M |
| 65-69 | $5-7M |
| 60-64 | $3-4M |
| 55-59 | $2-3M |
| 50-54 | $1-2M |
| <50 | $0.5-1M |

### Performance Modifier

Salary adjusts based on actual WAR vs expected WAR:

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

**Examples:**
- +2.0 WAR above expectations = 1.20x salary (20% raise)
- -1.5 WAR below expectations = 0.85x salary (15% pay cut)
- +5.0 WAR above expectations = 1.50x salary (capped at 50% raise)

### Fame Modifier

Fame affects perceived market value:

```javascript
function calculateFameModifier(player) {
  const fame = player.currentFame;

  // Fame ranges typically from -5 to +10
  // Each point of fame = +/- 3% salary
  const modifier = 1 + (fame * 0.03);

  // Cap at +/- 30%
  return Math.max(0.7, Math.min(1.3, modifier));
}
```

**Examples:**
- +5 Fame (fan favorite) = 1.15x salary
- +10 Fame (legend) = 1.30x salary (capped)
- -3 Fame (villain/bust) = 0.91x salary

### Personality Modifier (Free Agency)

Personality affects salary when changing teams:

| Personality | Modifier When Joining New Team |
|-------------|-------------------------------|
| Egotistical | 1.15x (demands premium) |
| Competitive | 1.05x (wants to win, but motivated) |
| Tough | 1.00x (fair market) |
| Relaxed | 0.95x (doesn't negotiate hard) |
| Jolly | 0.90x (happy to be there) |
| Timid | 0.85x (takes discount to join winner) |
| Droopy | N/A (retires) |

```javascript
function applyPersonalityModifier(salary, player, isNewTeam) {
  if (!isNewTeam) return salary;  // No modifier if staying

  const modifiers = {
    'Egotistical': 1.15,
    'Competitive': 1.05,
    'Tough': 1.00,
    'Relaxed': 0.95,
    'Jolly': 0.90,
    'Timid': 0.85,
    'Droopy': 1.00  // Won't matter, they retire
  };

  return salary * (modifiers[player.personality] || 1.0);
}
```

### Age/Experience Factor

Young players are cheaper; veterans command premium until decline:

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

### Complete Salary Calculation

```javascript
function calculateSalary(player, seasonStats = null, expectations = null, isNewTeam = false) {
  // 1. Base salary from ratings
  let salary = calculateBaseRatingSalary(player);

  // 2. Age factor
  salary *= calculateAgeFactor(player);

  // 3. Performance modifier (if season data available)
  if (seasonStats && expectations) {
    salary *= calculatePerformanceModifier(player, seasonStats, expectations);
  }

  // 4. Fame modifier
  salary *= calculateFameModifier(player);

  // 5. Personality modifier (only when joining new team)
  salary = applyPersonalityModifier(salary, player, isNewTeam);

  // Minimum salary: $500K
  return Math.max(0.5, Math.round(salary * 10) / 10);
}
```

---

## Real-Time Salary Updates

Salary updates dynamically throughout the season:

### Triggers for Salary Recalculation

1. **After each game** - WAR changes affect performance modifier
2. **Fame events** - Fame bonus/boner immediately affects salary
3. **Trait changes** - New trait may affect ratings → base salary
4. **Random events** - Rating changes affect base salary
5. **All-Star selection** - Fame boost → salary increase

### Real-Time Update Logic

```javascript
function updatePlayerSalary(player, gameResult, season) {
  const previousSalary = player.currentSalary;

  // Recalculate based on current state
  const newSalary = calculateSalary(
    player,
    season.playerSeasonStats[player.id],
    season.preSeasonExpectations[player.teamId][player.id],
    false  // Not a new team
  );

  // Track salary history
  player.salaryHistory.push({
    game: season.currentGame,
    salary: newSalary,
    change: newSalary - previousSalary,
    trigger: gameResult.salaryTrigger || 'game_update'
  });

  player.currentSalary = newSalary;

  return {
    previousSalary,
    newSalary,
    change: newSalary - previousSalary
  };
}
```

---

## Free Agency with Salary-Based Swaps

### Replace Grade-Based Swaps with Salary Matching

Instead of "better team must return equal or better grade," use salary:

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

**Example:**
- Giants (28-12) lose Barry Bonds ($35M salary due to great performance)
- Marlins (15-25) receive him
- Marlins (worse team) can send back player worth $24.5M - $35M
- This could be a high-grade underperformer or multiple lower-value players

### UI Update for Swap Selection

```
+---------------------------------------------------------------------------+
|  PLAYER SWAP - Marlins receive Barry Bonds                                 |
+---------------------------------------------------------------------------+
|                                                                            |
|  INCOMING: Barry Bonds (LF, A grade)                                       |
|  Current Salary: $35.0M                                                    |
|  (High due to +2.1 WAR overperformance, +5 Fame)                           |
|                                                                            |
|  SALARY MATCH REQUIRED: $24.5M - $35.0M                                    |
|  (Marlins had worse record, so 70-100% range)                              |
|                                                                            |
|  ELIGIBLE PLAYERS TO SEND (Outfielders):                                   |
|  +-------------------+-------+----------+--------+-------------------------+
|  | Player            | Grade | Salary   | WAR    | Notes                   |
|  +-------------------+-------+----------+--------+-------------------------+
|  | Gary Sheffield    | A-    | $28.5M   | +0.5   | Within range ✓          |
|  | Cliff Floyd       | B+    | $22.0M   | -0.8   | Below min ($24.5M) ✗    |
|  | Preston Wilson    | B     | $18.5M   | +0.3   | Below min ✗             |
|  +-------------------+-------+----------+--------+-------------------------+
|                                                                            |
|  Or send MULTIPLE players totaling $24.5M - $35.0M:                        |
|  [ ] Cliff Floyd ($22.0M) + [Select another player]                        |
|                                                                            |
+---------------------------------------------------------------------------+
```

### Multi-Player Swaps

Allow sending multiple players to match salary:

```javascript
function validateMultiPlayerSwap(outgoingPlayer, incomingPlayers, salaryRange) {
  const totalIncomingSalary = incomingPlayers.reduce((sum, p) => sum + p.currentSalary, 0);

  if (totalIncomingSalary < salaryRange.min || totalIncomingSalary > salaryRange.max) {
    return {
      valid: false,
      reason: `Total salary $${totalIncomingSalary}M outside range $${salaryRange.min}M - $${salaryRange.max}M`
    };
  }

  // Check position type match (pitcher for pitcher, position for position)
  const outgoingIsPitcher = isPitcher(outgoingPlayer);
  const hasMatchingType = incomingPlayers.some(p => isPitcher(p) === outgoingIsPitcher);

  if (!hasMatchingType) {
    return {
      valid: false,
      reason: 'At least one player must match position type (pitcher/position player)'
    };
  }

  return { valid: true };
}
```

---

## Draft Budget System

### Team Draft Budget

Each team has a draft budget based on:
- Salary freed up from retirements
- Salary freed up from released players
- Base draft allocation

```javascript
function calculateDraftBudget(team, season) {
  // Salary freed from retirements
  const retirementSavings = team.retiredPlayers.reduce(
    (sum, p) => sum + p.currentSalary, 0
  );

  // Salary freed from released players
  const releaseSavings = team.releasedPlayers.reduce(
    (sum, p) => sum + p.currentSalary, 0
  );

  // Base allocation (everyone gets this)
  const baseAllocation = 5.0;  // $5M base

  // Bonus for worse teams (reverse order of standings)
  const standingsBonus = (totalTeams - team.standingsPosition) * 0.5;

  return {
    fromRetirements: retirementSavings,
    fromReleases: releaseSavings,
    baseAllocation,
    standingsBonus,
    total: retirementSavings + releaseSavings + baseAllocation + standingsBonus
  };
}
```

### Draft Pick Costs

Drafted players have salaries based on their ratings:

```javascript
function getDraftPickCost(player) {
  // Rookies get age discount applied
  return calculateSalary(player, null, null, false);
}
```

### Draft UI with Budget

```
+---------------------------------------------------------------------------+
|  DRAFT - Season 5                                                          |
+---------------------------------------------------------------------------+
|  ON THE CLOCK: Marlins                                                     |
|                                                                            |
|  DRAFT BUDGET                                                              |
|  +---------------------------+----------+                                  |
|  | Source                    | Amount   |                                  |
|  +---------------------------+----------+                                  |
|  | Retired Players           | $42.0M   |                                  |
|  | Released Players          | $8.5M    |                                  |
|  | Base Allocation           | $5.0M    |                                  |
|  | Standings Bonus (#8)      | $3.5M    |                                  |
|  +---------------------------+----------+                                  |
|  | TOTAL BUDGET              | $59.0M   |                                  |
|  | Already Drafted           | $12.5M   |                                  |
|  | REMAINING                 | $46.5M   |                                  |
|  +---------------------------+----------+                                  |
|                                                                            |
|  AVAILABLE PLAYERS                                                         |
|  +-------------------+------+-------+----------+---------------------------+
|  | Player            | Pos  | Grade | Salary   | Affordable?               |
|  +-------------------+------+-------+----------+---------------------------+
|  | Roberto Clemente  | RF   | A-    | $18.5M   | ✓ Yes                     |
|  | Johnny Prospect   | SS   | B+    | $8.2M    | ✓ Yes                     |
|  | Mike Rookie       | SP   | B     | $4.5M    | ✓ Yes                     |
|  | Sam Upstart       | CF   | B     | $5.1M    | ✓ Yes                     |
|  +-------------------+------+-------+----------+---------------------------+
|                                                                            |
+---------------------------------------------------------------------------+
```

---

## Team Payroll & Fan Expectations

### Team Payroll Tracking

```javascript
const teamPayroll = {
  teamId: 'team-giants',
  seasonId: 'season-4',

  totalPayroll: 185.5,  // $185.5M
  leagueRank: 2,        // 2nd highest payroll

  byPosition: {
    SP: 45.2,
    RP: 18.5,
    C: 8.2,
    '1B': 22.0,
    // ...
  },

  topEarners: [
    { playerId: 'p001', name: 'Barry Bonds', salary: 35.0 },
    { playerId: 'p015', name: 'Tom Seaver', salary: 28.5 },
    // ...
  ],

  bargains: [  // Best ROI (WAR per $M)
    { playerId: 'p032', name: 'Rookie Star', salary: 2.5, war: 2.8, roi: 1.12 },
    // ...
  ],

  busts: [  // Worst ROI
    { playerId: 'p008', name: 'Big Contract', salary: 25.0, war: 0.5, roi: 0.02 },
    // ...
  ]
};
```

### Fan Expectations Based on Payroll

Higher payroll = higher expectations = more pressure:

```javascript
function calculateFanExpectations(team, leagueData) {
  const payrollRank = team.payrollRank;
  const totalTeams = leagueData.teams.length;

  // Top 25% payroll = high expectations
  // Bottom 25% = low expectations
  const payrollPercentile = 1 - (payrollRank / totalTeams);

  let expectationLevel;
  if (payrollPercentile >= 0.75) expectationLevel = 'Championship or Bust';
  else if (payrollPercentile >= 0.50) expectationLevel = 'Playoff Contender';
  else if (payrollPercentile >= 0.25) expectationLevel = 'Competitive';
  else expectationLevel = 'Rebuilding';

  return {
    level: expectationLevel,
    payrollPercentile,
    minExpectedWins: calculateMinExpectedWins(payrollPercentile, leagueData.gamesPerSeason),

    // Effects on random events
    managerFireProbability: payrollPercentile >= 0.75 ? 0.15 : 0.05,
    fanRevoltProbability: payrollPercentile >= 0.75 ? 0.10 : 0.02,
    contractionRisk: payrollPercentile <= 0.25 ? 0.05 : 0.00
  };
}
```

---

## ROI Leaderboards

### Best Value Players (Highest WAR per $M)

```
+---------------------------------------------------------------------------+
|  BEST VALUE PLAYERS - Season 4                                             |
+---------------------------------------------------------------------------+
|  Rank | Player            | Team    | Salary  | WAR   | ROI (WAR/$M)       |
+---------------------------------------------------------------------------+
|  1    | Dusty Rhodes      | Giants  | $2.5M   | 2.8   | 1.12               |
|  2    | Ricky Henderson   | A's     | $8.0M   | 4.5   | 0.56               |
|  3    | Tom Glavine       | Braves  | $12.0M  | 5.2   | 0.43               |
|  4    | Joe Carter        | Jays    | $15.5M  | 6.1   | 0.39               |
|  5    | Cal Ripken        | O's     | $18.0M  | 5.8   | 0.32               |
+---------------------------------------------------------------------------+
```

### Worst Value Players (Lowest WAR per $M)

```
+---------------------------------------------------------------------------+
|  WORST VALUE PLAYERS - Season 4                                            |
+---------------------------------------------------------------------------+
|  Rank | Player            | Team    | Salary  | WAR   | ROI (WAR/$M)       |
+---------------------------------------------------------------------------+
|  1    | Big Contract      | Yankees | $32.0M  | 0.2   | 0.006              |
|  2    | Aging Star        | Dodgers | $28.5M  | 0.8   | 0.028              |
|  3    | Injured Ace       | Mets    | $25.0M  | 1.0   | 0.040              |
|  4    | Slumping Slugger  | Cubs    | $22.0M  | 1.2   | 0.055              |
|  5    | Former MVP        | Cards   | $30.0M  | 1.8   | 0.060              |
+---------------------------------------------------------------------------+
```

---

## Random Events: Salary Impact

### New Salary-Related Random Events

| Event | Effect |
|-------|--------|
| **Contract Extension** | Player's salary locked for 2 seasons (no decrease) |
| **Hometown Discount** | Player takes 15% pay cut to stay with team |
| **Holdout** | Player demands 20% raise or -2 Mojo |
| **Endorsement Deal** | +10% salary (fame-related income) |
| **Scandal** | -20% salary, -2 Fame |
| **Team-Friendly Deal** | Player voluntarily takes 10% cut for contender |

### Fame → Salary Event Triggers

```javascript
function checkFameSalaryEvents(player, fameEvent) {
  const fameChange = fameEvent.value;

  // Big fame swing can trigger salary event
  if (fameChange >= 3) {
    // Positive fame surge → potential endorsement
    if (Math.random() < 0.30) {
      return { type: 'ENDORSEMENT_DEAL', salaryModifier: 1.10 };
    }
  }

  if (fameChange <= -3) {
    // Negative fame crash → potential scandal
    if (Math.random() < 0.20) {
      return { type: 'SCANDAL', salaryModifier: 0.80, fameModifier: -2 };
    }
  }

  return null;
}
```

---

## Integration with Existing Systems

### Manager of the Year

Payroll affects expectations → affects overperformance calculation:

```javascript
function calculateManagerOverperformanceWithPayroll(team, season) {
  const baseOverperformance = calculateManagerOverperformance(team, season);

  // Adjust for payroll expectations
  const payrollPercentile = team.payrollRank / season.teams.length;

  // High payroll = higher bar for "overperformance"
  // Low payroll = lower bar
  const payrollAdjustment = (0.50 - payrollPercentile) * 2;  // -1 to +1

  return baseOverperformance + payrollAdjustment;
}
```

### Bust/Comeback of the Year

Factor in salary:

```javascript
function calculateBustScoreWithSalary(player, seasonStats) {
  const baseScore = calculateBustScore(player, seasonStats);

  // High salary + underperformance = bigger bust
  const salaryFactor = player.currentSalary / 20;  // Normalize around $20M

  return baseScore.bustScore * salaryFactor;
}
```

A $35M player underperforming is a bigger bust than a $5M player underperforming by the same WAR.

---

## UI: Player Card with Salary

```
+---------------------------------------------------------------------------+
|  BARRY BONDS - Giants                                                      |
+---------------------------------------------------------------------------+
|  Position: LF | Grade: A | Age: 34                                         |
|                                                                            |
|  SALARY: $35.0M                                                            |
|  +---------------------------+----------+                                  |
|  | Component                 | Effect   |                                  |
|  +---------------------------+----------+                                  |
|  | Base (Ratings)            | $28.5M   |                                  |
|  | Age Factor (Prime)        | x1.00    |                                  |
|  | Performance (+2.1 WAR)    | x1.21    |                                  |
|  | Fame (+5)                 | x1.15    |                                  |
|  | Personality (Competitive) | x1.00    |                                  |
|  +---------------------------+----------+                                  |
|  | FINAL SALARY              | $35.0M   |                                  |
|  +---------------------------+----------+                                  |
|                                                                            |
|  SALARY TREND                                                              |
|  G1: $28.5M → G20: $31.2M → G40: $35.0M  [↑ $6.5M this season]            |
|                                                                            |
|  ROI: 0.31 WAR/$M (League Avg: 0.25)                                       |
|  Value Rating: ⭐⭐⭐⭐ (Above Average)                                    |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

## Summary: Salary System Benefits

| Benefit | Description |
|---------|-------------|
| **Fairer FA Swaps** | Based on actual value, not just grade |
| **Dynamic Value** | Performance, fame, traits affect salary in real-time |
| **Strategic Depth** | Trade high-salary underperformers, keep bargains |
| **Draft Flexibility** | Release overpaid players to afford draft picks |
| **Narrative** | High payroll creates drama, pressure, expectations |
| **ROI Tracking** | Identify bargains and busts |
| **Personality Impact** | Egotistical costs more, Timid costs less |
| **Fan Element** | Payroll affects expectations, random events |

---

## Implementation Priority

1. **Phase 1**: Base salary calculation (ratings + age)
2. **Phase 2**: Performance and fame modifiers
3. **Phase 3**: Free agency salary matching (replace grade-based)
4. **Phase 4**: Draft budget system
5. **Phase 5**: ROI leaderboards
6. **Phase 6**: Fan expectations and random events
7. **Phase 7**: UI integration throughout app

---

## Open Questions

1. Should salary affect All-Star voting at all? (Higher paid = more exposure?)
2. Multi-year contracts or just single-season salary?
3. Should teams have a "soft cap" that affects fan expectations more severely?
4. Revenue sharing between high/low payroll teams?

---

*End of Salary System Specification*
