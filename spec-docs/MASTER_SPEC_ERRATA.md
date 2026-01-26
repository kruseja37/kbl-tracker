# Master Spec v3 Updates - Addressing Feedback

This document contains updates to integrate into the Master Spec v3 based on user feedback.

---

## 1. CONTRACTED TEAM → EXPANSION DRAFT

When a team is contracted, their players contribute to the expansion draft:

```javascript
function processContractedTeam(contractedTeam, expansionDraftPool) {
  const roster = contractedTeam.roster;

  // App AUTO-SELECTS 4 players for expansion draft (same rules as other teams)
  const positionPlayers = roster.filter(p => !isPitcher(p));
  const pitchers = roster.filter(p => isPitcher(p));

  // Select 2 position players within replacement level (+/-10%)
  const eligiblePositionPlayers = positionPlayers.filter(p => {
    const expectedWAR = calculateExpectedWAR(p);
    return Math.abs(expectedWAR) <= REPLACEMENT_LEVEL_THRESHOLD * 1.1;
  });
  const selectedPositionPlayers = autoSelectForExpansion(eligiblePositionPlayers, 2);

  // Select 2 pitchers within replacement level (+/-10%)
  const eligiblePitchers = pitchers.filter(p => {
    const expectedWAR = calculateExpectedWAR(p);
    return Math.abs(expectedWAR) <= REPLACEMENT_LEVEL_THRESHOLD * 1.1;
  });
  const selectedPitchers = autoSelectForExpansion(eligiblePitchers, 2);

  // Add to expansion draft pool
  expansionDraftPool.push(...selectedPositionPlayers, ...selectedPitchers);

  // REMAINING PLAYERS - Three options:
  const remainingPlayers = roster.filter(p =>
    !selectedPositionPlayers.includes(p) &&
    !selectedPitchers.includes(p)
  );

  for (const player of remainingPlayers) {
    // Age-based retirement probability
    const retirementProb = calculateRetirementProbability(player, null);
    const roll = Math.random();

    if (roll < retirementProb) {
      // Player retires
      player.status = 'RETIRED';
      player.retirementReason = 'TEAM_CONTRACTION';
    } else {
      // Player enters general draft pool
      player.status = 'DRAFT_ELIGIBLE';
      addToGeneralDraftPool(player);
    }
  }
}
```

---

## 2. GRADE DERIVATION FORMULA (For Fictional Player Generation)

Based on analysis of 580 SMB4 players:

### Position Player Grade

```javascript
function calculatePositionPlayerGrade(ratings, traits) {
  // Base grade from simple average of 5 ratings
  const avgRating = (
    ratings.power +
    ratings.contact +
    ratings.speed +
    ratings.fielding +
    ratings.arm
  ) / 5;

  // Trait modifier (can bump +/- half grade)
  const traitMod = calculateTraitGradeModifier(traits);
  const adjustedAvg = avgRating + traitMod;

  // Grade thresholds (derived from SMB4 data analysis)
  if (adjustedAvg >= 80) return 'S';
  if (adjustedAvg >= 74) return 'A+';
  if (adjustedAvg >= 68) return 'A';
  if (adjustedAvg >= 62) return 'A-';
  if (adjustedAvg >= 56) return 'B+';
  if (adjustedAvg >= 50) return 'B';
  if (adjustedAvg >= 44) return 'B-';
  if (adjustedAvg >= 38) return 'C+';
  if (adjustedAvg >= 32) return 'C';
  if (adjustedAvg >= 26) return 'C-';
  if (adjustedAvg >= 20) return 'D+';
  return 'D';
}
```

### Pitcher Grade

```javascript
function calculatePitcherGrade(ratings, traits) {
  // Base grade from average of 3 pitching ratings
  const avgRating = (
    ratings.velocity +
    ratings.junk +
    ratings.accuracy
  ) / 3;

  // Trait modifier
  const traitMod = calculateTraitGradeModifier(traits);
  const adjustedAvg = avgRating + traitMod;

  // Grade thresholds (derived from SMB4 data analysis)
  if (adjustedAvg >= 86) return 'S';
  if (adjustedAvg >= 80) return 'A+';
  if (adjustedAvg >= 72) return 'A';
  if (adjustedAvg >= 65) return 'A-';
  if (adjustedAvg >= 58) return 'B+';
  if (adjustedAvg >= 50) return 'B';
  if (adjustedAvg >= 42) return 'B-';
  if (adjustedAvg >= 34) return 'C+';
  if (adjustedAvg >= 26) return 'C';
  if (adjustedAvg >= 18) return 'C-';
  if (adjustedAvg >= 10) return 'D+';
  return 'D';
}
```

### Generating Fictional Draft Players

```javascript
function generateFictionalPlayer(targetGrade, position, namesDatabase) {
  const isPitcher = ['SP', 'RP', 'CP', 'SP/RP'].includes(position);

  // Target average rating based on grade
  const targetAvg = getTargetAvgForGrade(targetGrade, isPitcher);

  // Generate ratings with variance (±15 from target avg)
  const ratings = {};

  if (isPitcher) {
    ratings.velocity = generateRatingNear(targetAvg, 15);
    ratings.junk = generateRatingNear(targetAvg, 15);
    ratings.accuracy = generateRatingNear(targetAvg, 15);
    // Pitchers also have batting stats (typically low)
    ratings.power = generateRatingNear(25, 20);
    ratings.contact = generateRatingNear(25, 20);
    ratings.speed = generateRatingNear(30, 20);
    ratings.fielding = generateRatingNear(50, 20);
    ratings.arm = 0; // Pitchers don't use arm for fielding
  } else {
    ratings.power = generateRatingNear(targetAvg, 20);
    ratings.contact = generateRatingNear(targetAvg, 20);
    ratings.speed = generateRatingNear(targetAvg, 15);
    ratings.fielding = generateRatingNear(targetAvg, 15);
    ratings.arm = generateRatingNear(targetAvg, 15);
    ratings.velocity = 0;
    ratings.junk = 0;
    ratings.accuracy = 0;
  }

  // Clamp all ratings to 0-99
  for (const key in ratings) {
    ratings[key] = Math.max(0, Math.min(99, Math.round(ratings[key])));
  }

  // Generate name
  const firstName = namesDatabase.firstNames[Math.floor(Math.random() * namesDatabase.firstNames.length)];
  const lastName = namesDatabase.lastNames[Math.floor(Math.random() * namesDatabase.lastNames.length)];

  // Calculate actual grade from generated ratings
  const actualGrade = isPitcher
    ? calculatePitcherGrade(ratings, [])
    : calculatePositionPlayerGrade(ratings, []);

  return {
    name: `${firstName} ${lastName}`,
    position,
    grade: actualGrade,
    ratings,
    age: 19 + Math.floor(Math.random() * 6), // 19-24
    personality: randomPersonality(),
    traits: [], // Rookies typically have no traits
    source: 'generated'
  };
}
```

---

## 3. END-OF-SEASON RATINGS ADJUSTMENT ALLOCATION

**Two Options:**

### Option A: Team-by-Team User Allocation (Manual)

```
+---------------------------------------------------------------------------+
|  END OF SEASON ADJUSTMENTS - Giants                               [1 of 8]|
+---------------------------------------------------------------------------+
|  Player: Willie Mays                                                       |
|  Total Adjustment Earned: +8 points                                        |
|                                                                            |
|  WAR BREAKDOWN:                                                            |
|  • bWAR: +2.1 above expectation → +4 batting points earned                 |
|  • fWAR: +0.8 above expectation → +2 fielding points earned                |
|  • rWAR: +0.5 above expectation → +2 speed points earned                   |
|                                                                            |
|  ALLOCATE BATTING POINTS (+4):                                             |
|  Power:   [+2] v  (Current: 85, New: 87)                                   |
|  Contact: [+2] v  (Current: 90, New: 92)                                   |
|                                                                            |
|  ALLOCATE FIELDING POINTS (+2):                                            |
|  Fielding: [+1] v  (Current: 88, New: 89)                                  |
|  Arm:      [+1] v  (Current: 75, New: 76)                                  |
|                                                                            |
|  ALLOCATE SPEED POINTS (+2):                                               |
|  Speed:    [+2] v  (Current: 70, New: 72)                                  |
|                                                                            |
|  [CONFIRM ALLOCATION] [AUTO-DISTRIBUTE] [SKIP PLAYER]                      |
+---------------------------------------------------------------------------+
```

### Option B: Automatic WAR-Based Distribution (Default)

```javascript
function autoDistributeAdjustments(player, adjustments) {
  const result = { ...player.ratings };

  // bWAR → Split equally between Power and Contact
  if (adjustments.batting !== 0) {
    const half = Math.floor(Math.abs(adjustments.batting) / 2);
    const remainder = Math.abs(adjustments.batting) % 2;
    const sign = adjustments.batting > 0 ? 1 : -1;

    result.power += sign * half;
    result.contact += sign * half;

    // Random assignment for odd point
    if (remainder > 0) {
      if (Math.random() < 0.5) {
        result.power += sign * remainder;
      } else {
        result.contact += sign * remainder;
      }
    }
  }

  // fWAR → Split equally between Fielding and Arm
  if (adjustments.fielding !== 0) {
    const half = Math.floor(Math.abs(adjustments.fielding) / 2);
    const remainder = Math.abs(adjustments.fielding) % 2;
    const sign = adjustments.fielding > 0 ? 1 : -1;

    result.fielding += sign * half;
    result.arm += sign * half;

    if (remainder > 0) {
      if (Math.random() < 0.5) {
        result.fielding += sign * remainder;
      } else {
        result.arm += sign * remainder;
      }
    }
  }

  // rWAR → All to Speed
  if (adjustments.baserunning !== 0) {
    result.speed += adjustments.baserunning;
  }

  // pWAR → Split equally among Velocity, Junk, Accuracy
  if (adjustments.pitching !== 0) {
    const third = Math.floor(Math.abs(adjustments.pitching) / 3);
    const remainder = Math.abs(adjustments.pitching) % 3;
    const sign = adjustments.pitching > 0 ? 1 : -1;

    result.velocity += sign * third;
    result.junk += sign * third;
    result.accuracy += sign * third;

    // Random assignment for remainder
    const pitchingStats = ['velocity', 'junk', 'accuracy'];
    for (let i = 0; i < remainder; i++) {
      const randomStat = pitchingStats[Math.floor(Math.random() * pitchingStats.length)];
      result[randomStat] += sign * 1;
    }
  }

  // Clamp all values to 0-99
  for (const key in result) {
    result[key] = Math.max(0, Math.min(99, result[key]));
  }

  return result;
}
```

---

## 4. FAN MORALE SYSTEM (REFINED)

```javascript
const FAN_MORALE_CONFIG = {
  // Starting point
  BASE_HAPPINESS: 50,

  // Performance vs Payroll Expectation
  PAYROLL_TIERS: {
    TOP_25_PERCENT: { minPercentile: 0.75, expectedWinPct: 0.575 },
    UPPER_HALF: { minPercentile: 0.50, expectedWinPct: 0.525 },
    LOWER_HALF: { minPercentile: 0.25, expectedWinPct: 0.475 },
    BOTTOM_25: { minPercentile: 0.00, expectedWinPct: 0.425 }
  },

  // Happiness modifiers per 10% win pct delta
  WIN_PCT_MODIFIER: 15,  // +/- 15 happiness per 10% win pct above/below expectation

  // HIGH PAYROLL AMPLIFIER (underperformance hurts more)
  AMPLIFIERS: {
    TOP_25_UNDERPERFORM: 1.5,   // 50% worse unhappiness
    UPPER_HALF_UNDERPERFORM: 1.25,  // 25% worse unhappiness
    NORMAL: 1.0
  },

  // Additional modifiers
  CHAMPIONSHIP_BONUS: 20,
  PLAYOFF_APPEARANCE: 10,
  LAST_PLACE_PENALTY: -10,
  LAST_PLACE_HIGH_PAYROLL_PENALTY: -15,  // Additional for top 25% payroll

  // Star player modifiers
  STAR_PLAYER_TRADE: -5,  // Per A- or better player traded
  BELOVED_PLAYER_DEPARTURE: -8, // Fame 3+ player leaves

  // Contraction threshold
  CONTRACTION_RISK_THRESHOLD: 10
};

function calculateFanMorale(team, season) {
  let happiness = FAN_MORALE_CONFIG.BASE_HAPPINESS;

  // 1. Payroll vs Performance
  const payrollPercentile = getPayrollPercentile(team, season);
  const expectedWinPct = getExpectedWinPctFromPayroll(payrollPercentile);
  const actualWinPct = team.wins / (team.wins + team.losses);
  const performanceDelta = actualWinPct - expectedWinPct;

  // Determine amplifier
  let amplifier = FAN_MORALE_CONFIG.AMPLIFIERS.NORMAL;
  if (performanceDelta < 0) {
    if (payrollPercentile >= 0.75) {
      amplifier = FAN_MORALE_CONFIG.AMPLIFIERS.TOP_25_UNDERPERFORM;
    } else if (payrollPercentile >= 0.50) {
      amplifier = FAN_MORALE_CONFIG.AMPLIFIERS.UPPER_HALF_UNDERPERFORM;
    }
  }

  // Apply performance modifier with amplifier
  const performanceModifier = (performanceDelta * 10) * FAN_MORALE_CONFIG.WIN_PCT_MODIFIER * amplifier;
  happiness += performanceModifier;

  // 2. Championship/Playoff modifiers
  if (season.champion === team.id) {
    happiness += FAN_MORALE_CONFIG.CHAMPIONSHIP_BONUS;
  } else if (season.playoffTeams.includes(team.id)) {
    happiness += FAN_MORALE_CONFIG.PLAYOFF_APPEARANCE;
  }

  // 3. Last place penalty
  if (isLastPlace(team, season)) {
    happiness += FAN_MORALE_CONFIG.LAST_PLACE_PENALTY;
    if (payrollPercentile >= 0.75) {
      happiness += FAN_MORALE_CONFIG.LAST_PLACE_HIGH_PAYROLL_PENALTY;
    }
  }

  // 4. Player movement modifiers (from offseason)
  const departedStars = getDepartedStars(team, season);
  happiness += departedStars.traded * FAN_MORALE_CONFIG.STAR_PLAYER_TRADE;
  happiness += departedStars.beloved * FAN_MORALE_CONFIG.BELOVED_PLAYER_DEPARTURE;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(happiness)));
}
```

### Fan Morale Effects

| Happiness | Status | Effects |
|-----------|--------|---------|
| 80-100 | **Ecstatic** | Immunity from contraction, +5% FA attraction bonus |
| 60-79 | **Happy** | Normal operations, +2% FA attraction bonus |
| 40-59 | **Neutral** | Normal operations |
| 20-39 | **Unhappy** | Manager hot seat (+15% fire chance), -5% FA attraction |
| 10-19 | **Angry** | Manager very hot seat (+30% fire chance), -10% FA attraction |
| 0-9 | **Furious** | **CONTRACTION RISK** at season end, -20% FA attraction |

---

## 5. PITCHER SALARY: HITTING ABILITY BONUS

Pitchers who can hit should be compensated for that value:

```javascript
function calculatePitcherSalary(player, seasonStats, expectations) {
  // Base pitching salary
  let salary = calculateBasePitcherSalary(player);

  // HITTING BONUS for pitchers
  const hittingBonus = calculatePitcherHittingBonus(player);
  salary *= (1 + hittingBonus);

  // Apply other modifiers...
  salary *= getPositionMultiplier(player.primaryPosition);
  salary *= calculateAgeFactor(player);
  salary *= calculateTraitModifier(player);
  salary *= calculatePerformanceModifier(player, seasonStats, expectations);
  salary *= calculateFameModifier(player);

  return Math.max(0.5, Math.round(salary * 10) / 10);
}

function calculatePitcherHittingBonus(player) {
  // Check for Two-Way trait (major bonus)
  const hasTwoWay = player.traits.some(t => t.name === 'Two Way');

  // Calculate batting potential
  const battingAvg = (player.ratings.power + player.ratings.contact) / 2;

  // Thresholds
  // Average pitcher batting: ~20 combined
  // Good hitting pitcher: ~40 combined
  // Excellent (Shohei-level): ~70+ combined

  if (hasTwoWay) {
    // Two-Way trait = significant bonus based on batting
    if (battingAvg >= 70) return 0.50;  // +50% salary (elite two-way)
    if (battingAvg >= 55) return 0.35;  // +35% salary (very good)
    if (battingAvg >= 40) return 0.25;  // +25% salary (good)
    return 0.15;  // +15% salary (has trait but mediocre batting)
  }

  // No Two-Way trait but still has hitting ability
  if (battingAvg >= 70) return 0.20;  // +20% (exceptional hitter for pitcher)
  if (battingAvg >= 55) return 0.12;  // +12% (good hitter)
  if (battingAvg >= 40) return 0.05;  // +5% (decent hitter)
  return 0;  // No bonus for typical pitcher
}
```

### Example: Babe Ruth-Level Pitcher

```
Babe Ruth (Hypothetical SP):
- VEL: 70, JNK: 65, ACC: 70 → Pitching Avg: 68.3
- POW: 95, CON: 85 → Batting Avg: 90
- Has Two-Way (IF) trait

Base Pitcher Salary: $8.5M (from pitching ratings)
Hitting Bonus: +50% (Two-Way + elite batting)
Final Base: $12.75M

This properly values a pitcher who can also DH/bat effectively.
```

---

## 6. TRAIT SALARY TIERS (REVISED per Billy Yank Guide)

Based on strategic analysis from Billy Yank's guide, traits are re-tiered:

### ELITE POSITIVE TRAITS (+10% salary)

**Position Player:**
- Clutch (huge in high leverage)
- RBI Hero (constant advantage in key situations)
- Two Way (roster flexibility + production)
- Utility (roster flexibility)
- Magic Hands (always good for fielders)
- Bad Ball Hitter (expands effective zone)

**Pitcher:**
- Rally Stopper (+10/+20 all skills with runners on)
- Clutch (deploy strategically)
- K Collector (+15/+30 stats in 2-strike counts)
- Specialist (devastates same-handed batters)
- Pick Officer (shuts down running game)

### GOOD POSITIVE TRAITS (+5% salary)

**Position Player:**
- Base Rounder (always useful)
- Stealer (creates opportunities)
- Cannon Arm (key positions)
- Mind Gamer (tanks pitcher accuracy)
- Distractor (situational but powerful)
- Rally Starter (+25/+50 contact when down)
- Dive Wizard (faster recovery)
- Fastball Hitter / Off-Speed Hitter
- Big Hack / Little Hack (at level 2+)
- Ace Exterminator

**Pitcher:**
- Composed (+25/+50 accuracy in 3-ball counts)
- Gets Ahead (+stats when ahead)
- Elite [Any Pitch] (enhances arsenal)
- Reverse Splits (neutralizes platoon)

### MINOR POSITIVE TRAITS (+2% salary)

**Position Player:**
- Bunter (very situational)
- Sign Stealer (inconsistent)
- Low/High/Inside/Outside Pitch
- CON vs LHP / CON vs RHP
- POW vs LHP / POW vs RHP
- Metal Head (random protection)

**Pitcher:**
- Consistent (double-edged)

---

### SEVERE NEGATIVE TRAITS (-10% salary)

**Position Player:**
- Choker (worse when it matters)
- RBI Zero (-30 POW/-20 CON in scoring position)
- Easy Target (+30 accuracy to pitchers)

**Pitcher:**
- Choker (worst on relievers)
- Surrounded (-20 all skills with runners on)
- Meltdown (-100 accuracy after 4 consecutive baserunners)
- Easy Jumps (gifts stolen bases)

### MODERATE NEGATIVE TRAITS (-5% salary)

**Position Player:**
- Whiffer (more strikeouts)
- Butter Fingers (+50% missed catch on dives)
- Wild Thrower (+10% errant throws)
- Bad Jumps (limits baserunning)

**Pitcher:**
- BB Prone (-50 accuracy in 3-ball counts)
- Wild Thing (power pitch problems)
- Volatile (unpredictable - can be positive on stars)
- K Neglecter (-30 VEL/-30 JNK in 2-strike counts)
- Falls Behind (-stats when behind)

### MINOR NEGATIVE TRAITS (-2% salary)

**Position Player:**
- Base Jogger (situational slowdown)
- Slow Poke
- First Pitch Prayer (situational)
- Big Hack / Little Hack (at level 1 only)

**Pitcher:**
- Crossed Up (inconsistent)

---

## 7. PERSONALITY SYSTEM (HIDDEN + RANDOM)

Personalities are determined by the app and kept hidden from users until revealed during Free Agency or Random Events.

```javascript
// Personalities assigned randomly at player creation
function assignPersonality(player) {
  const personalities = [
    { type: 'Competitive', weight: 20 },
    { type: 'Relaxed', weight: 20 },
    { type: 'Droopy', weight: 5 },      // Rare
    { type: 'Jolly', weight: 20 },
    { type: 'Tough', weight: 15 },
    { type: 'Timid', weight: 10 },
    { type: 'Egotistical', weight: 10 }
  ];

  return weightedRandom(personalities);
}

// Personalities can CHANGE year-over-year (small chance)
function maybeChangePersonality(player, seasonEvents) {
  const CHANGE_PROBABILITY = 0.10;  // 10% base chance

  // Events can influence personality changes
  let modifier = 1.0;
  if (seasonEvents.wonChampionship) modifier *= 0.5;  // Less likely to change if happy
  if (seasonEvents.hadBadSeason) modifier *= 1.5;     // More likely if unhappy
  if (seasonEvents.wasBenched) modifier *= 2.0;       // Much more likely if benched

  if (Math.random() < CHANGE_PROBABILITY * modifier) {
    const oldPersonality = player.personality;
    player.personality = assignPersonality(player);  // Re-roll

    // Log for narrative purposes (but don't show until FA)
    player.personalityChangeHistory.push({
      season: currentSeason,
      from: oldPersonality,
      to: player.personality,
      trigger: determineTrigger(seasonEvents)
    });
  }
}
```

### Free Agency Personality Reveal UI

```
+---------------------------------------------------------------------------+
|  FREE AGENCY DICE ROLL - Giants                                            |
+---------------------------------------------------------------------------+
|  RESULT: 9 - Riley Reliable (SP, B) is leaving!                            |
|                                                                            |
|  ┌─────────────────────────────────────────────────────────────────────┐  |
|  │  PERSONALITY REVEAL                                                  │  |
|  │                                                                       │  |
|  │  What is Riley Reliable's personality?                               │  |
|  │                                                                       │  |
|  │  ○ Competitive  (→ Goes to rival team)                               │  |
|  │  ○ Relaxed      (→ Random team via dice)                             │  |
|  │  ○ Droopy       (→ Retires immediately)                              │  |
|  │  ● Jolly        (→ Stays with current team!)                         │  |
|  │  ○ Tough        (→ Best OPS team)                                    │  |
|  │  ○ Timid        (→ Champion team)                                    │  |
|  │  ○ Egotistical  (→ Worst team - wants spotlight)                     │  |
|  │                                                                       │  |
|  │  [CONFIRM PERSONALITY]                                                │  |
|  └─────────────────────────────────────────────────────────────────────┘  |
|                                                                            |
+---------------------------------------------------------------------------+
```

**Alternative: Auto-Reveal from Hidden System**

If using hidden personality system, the app reveals automatically:

```
RESULT: 9 - Riley Reliable (SP, B) is leaving!

🎭 PERSONALITY REVEALED: RELAXED
Riley goes wherever the wind takes him...

Destination: Random team via dice roll

[🎲🎲 ROLL FOR DESTINATION]
```

---

## 8. FREE AGENCY SALARY MATCHING (NOT GRADE)

**CRITICAL:** Free agency swaps use **salary matching (+/-10%)**, not grades.

```javascript
function calculateSwapRequirement(outgoingPlayer, receivingRecord, sendingRecord) {
  const outgoingSalary = outgoingPlayer.currentSalary;

  // Salary must match within +/-10%
  const minSalary = outgoingSalary * 0.90;
  const maxSalary = outgoingSalary * 1.10;

  // Record comparison only affects WHO SELECTS, not grade matching
  // Better team receiving = worse team gets to choose who they send
  // Worse team receiving = better team gets to choose who they send

  return {
    minSalary,
    maxSalary,
    whoSelects: receivingRecord.winPct >= sendingRecord.winPct
      ? sendingRecord.teamName  // Worse team selects
      : receivingRecord.teamName  // Better team selects
  };
}

// Multi-player swaps allowed
function validateSwap(outgoingPlayers, incomingPlayer) {
  const totalOutgoingSalary = outgoingPlayers.reduce((sum, p) => sum + p.currentSalary, 0);
  const incomingSalary = incomingPlayer.currentSalary;

  // Must be within +/-10%
  const minAllowed = incomingSalary * 0.90;
  const maxAllowed = incomingSalary * 1.10;

  return totalOutgoingSalary >= minAllowed && totalOutgoingSalary <= maxAllowed;
}
```

### Swap UI (Salary-Based)

```
+---------------------------------------------------------------------------+
|  PLAYER SWAP - Braves receive Riley Reliable                               |
+---------------------------------------------------------------------------+
|  Incoming: Riley Reliable (SP, B) - Salary: $6.2M                          |
|                                                                            |
|  Required return salary: $5.58M - $6.82M (+/-10%)                           |
|                                                                            |
|  ELIGIBLE PLAYERS TO SEND:                                                 |
|  [Select one or more to match salary]                                      |
|                                                                            |
|  ☑ Mark Wohlers    RP    $3.1M     Running Total: $3.1M                   |
|  ☑ Steve Avery     SP    $3.2M     Running Total: $6.3M ✓ VALID           |
|  ☐ John Smoltz     SP    $8.5M     (Would exceed max)                      |
|  ☐ Greg Maddux     SP    $12.2M    (Would exceed max)                      |
|                                                                            |
|  Selected total: $6.3M (within $5.58M - $6.82M range)                      |
|                                                                            |
|  [CONFIRM SWAP: Mark Wohlers + Steve Avery → Giants]                       |
+---------------------------------------------------------------------------+
```

---

## 9. MUSEUM / HISTORICAL DATA STRUCTURE

The **Museum** becomes the central hub for all historical data:

### Museum Tabs

1. **Hall of Fame** - Inducted players with full career stats
2. **50 Greatest Players** - All-time leaderboard using MVP voting formula
3. **League Records** - Career and single-season records
4. **Championship History** - Season-by-season champions
5. **All-Time Stats** - Career stat leaders by category

**Team Historical Data** stays on Team Tab (team-specific focus).

```javascript
const museum = {
  hallOfFame: [{
    player: playerData,
    inductionSeason: 4,
    careerStats: { /* full career stats */ },
    highlights: ['2x MVP', '8x All-Star'],
    teams: ['Giants (S1-S4)']
  }],

  fiftyGreatest: [
    // Calculated using MVP voting formula
    // WAR 50% + Clutch 25% + Narrative/Fame 20% + Championships 5%
  ],

  leagueRecords: {
    career: {
      homeRuns: { player: 'Babe Ruth', value: 714 },
      hits: { player: 'Pete Rose', value: 4256 },
      // ...
    },
    singleSeason: {
      homeRuns: { player: 'Barry Bonds', value: 73, season: 2 },
      // ...
    },
    singleGame: {
      strikeouts: { player: 'Roger Clemens', value: 20, date: '...' },
      // ...
    }
  },

  championshipHistory: [
    { season: 1, champion: 'Giants', runner_up: 'Dodgers', mvp: 'Willie Mays' },
    { season: 2, champion: 'Yankees', runner_up: 'Giants', mvp: 'Babe Ruth' },
  ]
};

// 50 Greatest calculation
function calculate50Greatest(allPlayers) {
  return allPlayers
    .filter(p => p.status === 'RETIRED' || p.careerSeasons >= 3)
    .map(p => ({
      player: p,
      score: calculateGreatestScore(p)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

function calculateGreatestScore(player) {
  // Same weights as MVP voting
  const warScore = normalizeToRange(player.careerWAR, allCareerWARs) * 0.50;
  const clutchScore = normalizeToRange(player.careerClutch, allClutchScores) * 0.25;
  const fameScore = normalizeToRange(player.peakFame, allFameScores) * 0.20;
  const champScore = player.championships * 2;  // 2 points per ring, capped at 5%

  return warScore + clutchScore + fameScore + Math.min(champScore, 5);
}
```

---

## 10. FAN MORALE: MILESTONE & AWARD EFFECTS

Fan morale is affected by memorable moments throughout the season—both positive and negative. Fans remember the highs and can't forget the lows.

### Season Length Scaling

All qualifying thresholds are based on a 162-game MLB season and must be scaled proportionally:

```javascript
const BASE_SEASON_LENGTH = 162;

// Scale any threshold to current season length
function scaleThreshold(baseValue, seasonLength) {
  return Math.round(baseValue * (seasonLength / BASE_SEASON_LENGTH));
}

// Example scaling for common SMB4 season lengths:
//
// SEASON THRESHOLDS:
// Threshold (162g)  | 64 games | 48 games | 32 games | 16 games
// ------------------|----------|----------|----------|----------
// 200 AB            | 79 AB    | 59 AB    | 40 AB    | 20 AB
// 80 IP             | 32 IP    | 24 IP    | 16 IP    | 8 IP
// 150 IP            | 59 IP    | 44 IP    | 30 IP    | 15 IP
// 50 HR             | 20 HR    | 15 HR    | 10 HR    | 5 HR
// 60 HR             | 24 HR    | 18 HR    | 12 HR    | 6 HR
// 200 Hits          | 79 Hits  | 59 Hits  | 40 Hits  | 20 Hits
// 20 Wins           | 8 Wins   | 6 Wins   | 4 Wins   | 2 Wins
// 25 Wins           | 10 Wins  | 7 Wins   | 5 Wins   | 2 Wins
// 300 K             | 119 K    | 89 K     | 59 K     | 30 K
// 100 Losses        | 40 L     | 30 L     | 20 L     | 10 L
// 20 Losses         | 8 L      | 6 L      | 4 L      | 2 L
// 10 Blown Saves    | 4 BS     | 3 BS     | 2 BS     | 1 BS
// 40 Errors         | 16 Err   | 12 Err   | 8 Err    | 4 Err
// 15-game L streak  | 6 games  | 4 games  | 3 games  | 2 games
// 20-game L streak  | 8 games  | 6 games  | 4 games  | 2 games
//
// CAREER THRESHOLDS:
// Threshold (162g)  | 64 games | 48 games | 32 games | 16 games
// ------------------|----------|----------|----------|----------
// 300 HR            | 119 HR   | 89 HR    | 59 HR    | 30 HR
// 500 HR            | 198 HR   | 148 HR   | 99 HR    | 49 HR
// 600 HR            | 237 HR   | 178 HR   | 119 HR   | 59 HR
// 3000 Hits         | 1185 H   | 889 H    | 593 H    | 296 H
// 2000 RBI          | 790 RBI  | 593 RBI  | 395 RBI  | 198 RBI
// 300 Wins          | 119 W    | 89 W     | 59 W     | 30 W
// 3000 K (pitcher)  | 1185 K   | 889 K    | 593 K    | 296 K
// 400 Saves         | 158 SV   | 119 SV   | 79 SV    | 40 SV
// 200 Losses        | 79 L     | 59 L     | 40 L     | 20 L
// 2000 K (batting)  | 790 K    | 593 K    | 395 K    | 198 K

// Milestone thresholds object with base (162-game) values
const MILESTONE_THRESHOLDS = {
  // Batting qualifiers
  MIN_AB_FOR_AVG: 200,           // Minimum AB to qualify for batting avg milestones

  // Pitching qualifiers
  MIN_IP_STARTER: 80,            // Minimum IP for ERA milestones (starters)
  MIN_IP_ELITE_ERA: 150,         // Minimum IP for sub-2.00 ERA milestone

  // Season achievements
  HR_50_SEASON: 50,
  HR_60_SEASON: 60,
  HITS_200_SEASON: 200,
  WINS_20_SEASON: 20,
  WINS_25_SEASON: 25,
  K_300_SEASON: 300,
  LOSSES_20_SEASON: 20,
  BLOWN_SAVES_10: 10,
  ERRORS_40_SEASON: 40,

  // Team thresholds
  TEAM_100_LOSSES: 100,
  TEAM_110_LOSSES: 110,
  TEAM_100_WINS: 100,
  LOSING_STREAK_15: 15,
  LOSING_STREAK_20: 20,

  // Career thresholds (also scale with season length)
  CAREER_HR_TIER_1: 300,
  CAREER_HR_TIER_2: 400,
  CAREER_HR_TIER_3: 500,
  CAREER_HR_TIER_4: 600,
  CAREER_HITS_TIER_1: 1500,
  CAREER_HITS_TIER_2: 2000,
  CAREER_HITS_TIER_3: 2500,
  CAREER_HITS_TIER_4: 3000,
  CAREER_RBI_TIER_1: 1000,
  CAREER_RBI_TIER_2: 1500,
  CAREER_RBI_TIER_3: 2000,
  CAREER_SB_TIER_1: 300,
  CAREER_SB_TIER_2: 500,
  CAREER_WINS_TIER_1: 100,
  CAREER_WINS_TIER_2: 150,
  CAREER_WINS_TIER_3: 200,
  CAREER_WINS_TIER_4: 250,
  CAREER_WINS_TIER_5: 300,
  CAREER_K_PITCHER_TIER_1: 1500,
  CAREER_K_PITCHER_TIER_2: 2000,
  CAREER_K_PITCHER_TIER_3: 2500,
  CAREER_K_PITCHER_TIER_4: 3000,
  CAREER_SAVES_TIER_1: 50,
  CAREER_SAVES_TIER_2: 100,
  CAREER_SAVES_TIER_3: 200,
  CAREER_SAVES_TIER_4: 300,
  CAREER_SAVES_TIER_5: 400,
  // Negative career thresholds
  CAREER_K_BATTING_TIER_1: 1500,
  CAREER_K_BATTING_TIER_2: 2000,
  CAREER_GIDP_TIER_1: 500,
  CAREER_LOSSES_TIER_1: 100,
  CAREER_LOSSES_TIER_2: 150,
  CAREER_LOSSES_TIER_3: 200,
  CAREER_HR_ALLOWED_TIER_1: 500,
  CAREER_HR_ALLOWED_TIER_2: 600,
  CAREER_BB_TIER_1: 1000,
  CAREER_ERRORS_TIER_1: 100,
  CAREER_ERRORS_TIER_2: 150,
};

// Get scaled threshold for current season
function getScaledThreshold(thresholdKey, seasonLength) {
  const baseValue = MILESTONE_THRESHOLDS[thresholdKey];
  return scaleThreshold(baseValue, seasonLength);
}

// Example usage:
// const seasonLength = 48; // SMB4 48-game season
// const minAB = getScaledThreshold('MIN_AB_FOR_AVG', seasonLength); // Returns 59
// const hr50 = getScaledThreshold('HR_50_SEASON', seasonLength);     // Returns 15
```

### Milestone Effects (Base Values for 162-Game Season)

```javascript
const MILESTONE_HAPPINESS_EFFECTS = {
  // ============================================
  // SINGLE-GAME POSITIVE MILESTONES
  // NOTE: Single-game milestones do NOT scale - a perfect game
  //       is a perfect game regardless of season length
  // ============================================
  SINGLE_GAME_POSITIVE: {
    WALK_OFF_HIT: 3,
    WALK_OFF_HR: 5,
    GRAND_SLAM: 4,
    WALK_OFF_GRAND_SLAM: 10,
    CYCLE: 6,
    4_HR_GAME: 8,
    NO_HITTER: 10,
    PERFECT_GAME: 15,
    20_STRIKEOUT_GAME: 8,
    IMMACULATE_INNING: 5,
    INSIDE_THE_PARK_HR: 3,
    POSITION_PLAYER_PITCHING_WIN: 4,  // Comedy gold
    PITCHER_HITS_HR: 4,
  },

  // ============================================
  // SINGLE-GAME NEGATIVE MILESTONES
  // "Paper bag on head" moments
  // NOTE: Single-game milestones do NOT scale
  // ============================================
  SINGLE_GAME_NEGATIVE: {
    TEAM_NO_HIT: -5,
    TEAM_PERFECT_GAMED: -8,
    BLOWN_SAVE_WALKOFF: -4,
    LOSS_AFTER_LEADING_BY_10_PLUS: -6,
    POSITION_PLAYER_PITCHES_IN_BLOWOUT_LOSS: -3,
    HIT_INTO_TRIPLE_PLAY: -2,
    5_ERRORS_IN_GAME: -4,
    PITCHER_ALLOWS_4_HR_IN_INNING: -4,
    PITCHER_ALLOWS_10_RUNS_BEFORE_RECORDING_OUT: -5,
  },

  // ============================================
  // SEASON POSITIVE MILESTONES
  // NOTE: Thresholds use BASE (162-game) values and must be scaled
  // ============================================
  SEASON_POSITIVE: {
    PLAYER_HR_LEADER_ELITE: 8,         // Scaled 50 HR equivalent
    PLAYER_HR_LEADER_HISTORIC: 12,     // Scaled 60 HR equivalent
    PLAYER_HITS_LEADER: 6,             // Scaled 200 hits equivalent
    PLAYER_TRIPLE_CROWN: 15,           // Led league in AVG, HR, RBI
    PITCHER_WINS_LEADER: 8,            // Scaled 20 wins equivalent
    PITCHER_WINS_DOMINANT: 12,         // Scaled 25 wins equivalent
    PITCHER_K_LEADER: 8,               // Scaled 300 K equivalent
    PITCHER_ELITE_ERA: 10,             // Sub-2.00 ERA (min scaled IP)
    TEAM_CLINCHES_PLAYOFF: 5,
    TEAM_CLINCHES_DIVISION: 7,
    TEAM_DOMINANT_RECORD: 10,          // Scaled 100-win equivalent
    TEAM_BEST_RECORD_IN_LEAGUE: 5,
  },

  // ============================================
  // SEASON NEGATIVE MILESTONES
  // "The fans are wearing paper bags"
  // NOTE: All thresholds below use BASE (162-game) values
  //       and must be scaled via getScaledThreshold()
  // ============================================
  SEASON_NEGATIVE: {
    PLAYER_BATTING_UNDER_150: -4,      // Historic futility (min scaled AB)
    PLAYER_BATTING_UNDER_200: -2,      // Very bad season (min scaled AB)
    PLAYER_ERRORS_LEADER: -3,          // Defensive liability (scaled threshold)
    PITCHER_ERA_OVER_7: -4,            // Dumpster fire (min scaled IP)
    PITCHER_ERA_OVER_6: -2,            // Very rough season (min scaled IP)
    PITCHER_LOSSES_LEADER: -5,         // Historic futility (scaled threshold)
    CLOSER_BLOWN_SAVES_LEADER: -4,     // Can't close (scaled threshold)
    TEAM_ON_PACE_FOR_WORST: -3,        // Checked when 50%+ games played
    TEAM_WORST_RECORD: -8,             // Scaled 100-loss equivalent
    TEAM_HISTORICALLY_BAD: -12,        // Scaled 110-loss equivalent
    TEAM_WORST_IN_LEAGUE: -5,
    TEAM_SWEPT_BY_RIVAL: -2,
    TEAM_MAJOR_LOSING_STREAK: -5,      // Scaled 15-game equivalent
    TEAM_HISTORIC_LOSING_STREAK: -10,  // Scaled 20-game equivalent
    STAR_PLAYER_DEMANDS_TRADE: -5,     // A- or better player unhappy
  },

  // ============================================
  // CAREER POSITIVE MILESTONES
  // NOTE: Career milestones SCALE with season length.
  //       Use getScaledThreshold() with CAREER_* keys.
  //       See CAREER THRESHOLDS table above for reference values.
  // ============================================
  CAREER_POSITIVE: {
    PLAYER_CAREER_HR_TIER_1: 5,      // 300 HR base (use CAREER_HR_TIER_1)
    PLAYER_CAREER_HR_TIER_2: 8,      // 400 HR base (use CAREER_HR_TIER_2)
    PLAYER_CAREER_HR_TIER_3: 10,     // 500 HR base (use CAREER_HR_TIER_3)
    PLAYER_CAREER_HR_TIER_4: 12,     // 600 HR base (use CAREER_HR_TIER_4)
    PLAYER_CAREER_HITS_TIER_1: 3,    // 1500 hits base
    PLAYER_CAREER_HITS_TIER_2: 6,    // 2000 hits base
    PLAYER_CAREER_HITS_TIER_3: 8,    // 2500 hits base
    PLAYER_CAREER_HITS_TIER_4: 15,   // 3000 hits base
    PLAYER_CAREER_RBI_TIER_1: 4,     // 1000 RBI base
    PLAYER_CAREER_RBI_TIER_2: 8,     // 1500 RBI base
    PLAYER_CAREER_RBI_TIER_3: 12,    // 2000 RBI base
    PLAYER_CAREER_SB_TIER_1: 5,      // 300 SB base
    PLAYER_CAREER_SB_TIER_2: 8,      // 500 SB base
    PITCHER_CAREER_WINS_TIER_1: 3,   // 100 wins base
    PITCHER_CAREER_WINS_TIER_2: 5,   // 150 wins base
    PITCHER_CAREER_WINS_TIER_3: 8,   // 200 wins base
    PITCHER_CAREER_WINS_TIER_4: 10,  // 250 wins base
    PITCHER_CAREER_WINS_TIER_5: 15,  // 300 wins base
    PITCHER_CAREER_K_TIER_1: 4,      // 1500 K base
    PITCHER_CAREER_K_TIER_2: 6,      // 2000 K base
    PITCHER_CAREER_K_TIER_3: 8,      // 2500 K base
    PITCHER_CAREER_K_TIER_4: 12,     // 3000 K base
    PITCHER_CAREER_SAVES_TIER_1: 3,  // 50 saves base
    PITCHER_CAREER_SAVES_TIER_2: 5,  // 100 saves base
    PITCHER_CAREER_SAVES_TIER_3: 8,  // 200 saves base
    PITCHER_CAREER_SAVES_TIER_4: 10, // 300 saves base
    PITCHER_CAREER_SAVES_TIER_5: 12, // 400 saves base
  },

  // ============================================
  // CAREER NEGATIVE MILESTONES
  // "The franchise's dark legacy"
  // NOTE: Career milestones SCALE with season length.
  //       Use getScaledThreshold() with CAREER_* keys.
  // ============================================
  CAREER_NEGATIVE: {
    PLAYER_CAREER_K_BATTING_TIER_1: -3,    // 1500 K base
    PLAYER_CAREER_K_BATTING_TIER_2: -5,    // 2000 K base
    PLAYER_CAREER_GIDP_TIER_1: -2,         // 500 GIDP base
    PITCHER_CAREER_LOSSES_TIER_1: -2,      // 100 losses base
    PITCHER_CAREER_LOSSES_TIER_2: -4,      // 150 losses base
    PITCHER_CAREER_LOSSES_TIER_3: -6,      // 200 losses base
    PITCHER_CAREER_HR_ALLOWED_TIER_1: -3,  // 500 HR allowed base
    PITCHER_CAREER_HR_ALLOWED_TIER_2: -5,  // 600 HR allowed base
    PITCHER_CAREER_BB_TIER_1: -2,          // 1000 BB base
    PLAYER_CAREER_ERRORS_TIER_1: -2,       // 100 errors base
    PLAYER_CAREER_ERRORS_TIER_2: -4,       // 150 errors base
  }
};

// ============================================
// AWARD HAPPINESS EFFECTS
// ============================================
const AWARD_HAPPINESS_EFFECTS = {
  MVP: {
    WINNER: 10,
    RUNNER_UP: 3,
    THIRD_PLACE: 1
  },

  CY_YOUNG: {
    WINNER: 8,
    RUNNER_UP: 3,    // NEW: Runner-up Cy Young with similar rewards to MVP runner-up
    THIRD_PLACE: 1
  },

  GOLD_GLOVE: {
    WINNER: 4        // Per position, max 9 per team theoretically
  },

  SILVER_SLUGGER: {
    WINNER: 4        // Per position
  },

  ROOKIE_OF_YEAR: {
    WINNER: 6,
    RUNNER_UP: 2
  },

  RELIEVER_OF_YEAR: {
    WINNER: 5,
    RUNNER_UP: 2
  },

  COMEBACK_PLAYER: {
    WINNER: 5        // Great story for fans
  },

  BATTING_TITLE: {
    WINNER: 5
  },

  HOME_RUN_LEADER: {
    WINNER: 6
  },

  RBI_LEADER: {
    WINNER: 4
  },

  STOLEN_BASE_LEADER: {
    WINNER: 3
  },

  ERA_LEADER: {
    WINNER: 5
  },

  WINS_LEADER: {
    WINNER: 4
  },

  STRIKEOUT_LEADER: {
    WINNER: 4
  },

  SAVES_LEADER: {
    WINNER: 4
  },

  ALL_STAR: {
    SELECTION: 2     // Per player selected
  },

  ALL_STAR_MVP: {
    WINNER: 4
  },

  WORLD_SERIES_MVP: {
    WINNER: 8
  },

  // NEGATIVE AWARDS (Dubious honors)
  GOLDEN_SOMBRERO_LEADER: {
    HOLDER: -2       // Most 4-strikeout games
  },

  ERRORS_LEADER: {
    HOLDER: -3       // Led league in errors
  }
};

// ============================================
// PAYROLL AMPLIFIER FOR AWARDS
// High-payroll teams get less credit for awards (expected)
// Low-payroll teams get bonus credit (exceeded expectations)
// ============================================
function applyPayrollAmplifierToAward(baseEffect, payrollPercentile, isPositiveEffect) {
  if (isPositiveEffect) {
    // Low payroll = extra credit for achievements
    if (payrollPercentile < 0.25) return baseEffect * 1.5;
    if (payrollPercentile < 0.50) return baseEffect * 1.25;
    // High payroll = expected, less credit
    if (payrollPercentile >= 0.75) return baseEffect * 0.75;
    return baseEffect; // Normal
  } else {
    // Negative effects: high payroll = amplified shame
    if (payrollPercentile >= 0.75) return baseEffect * 1.5;
    if (payrollPercentile >= 0.50) return baseEffect * 1.25;
    return baseEffect;
  }
}

// ============================================
// APPLYING MILESTONE EFFECTS
// ============================================
function applyMilestoneToFanMorale(team, milestone, payrollPercentile) {
  let effect = 0;

  // Find the milestone effect
  for (const category of Object.values(MILESTONE_HAPPINESS_EFFECTS)) {
    if (category[milestone.type] !== undefined) {
      effect = category[milestone.type];
      break;
    }
  }

  if (effect === 0) return 0;

  // Apply payroll amplifier
  const isPositive = effect > 0;
  effect = applyPayrollAmplifierToAward(effect, payrollPercentile, isPositive);

  // Log milestone for narrative
  team.seasonMilestones.push({
    type: milestone.type,
    effect: Math.round(effect),
    player: milestone.player,
    gameNumber: milestone.gameNumber,
    details: milestone.details
  });

  return Math.round(effect);
}

// ============================================
// FAN MORALE UI WITH MILESTONE TRACKING
// ============================================
function getFanMoraleDisplay(happiness, recentMilestones) {
  const emoji = happiness >= 80 ? '😍' :
                happiness >= 60 ? '😊' :
                happiness >= 40 ? '😐' :
                happiness >= 20 ? '😟' :
                happiness >= 10 ? '😠' : '💀';

  const status = happiness >= 80 ? 'ECSTATIC' :
                 happiness >= 60 ? 'HAPPY' :
                 happiness >= 40 ? 'NEUTRAL' :
                 happiness >= 20 ? 'UNHAPPY' :
                 happiness >= 10 ? 'ANGRY' : 'FURIOUS';

  // Paper bag indicator for extremely low happiness
  const paperBag = happiness < 15 ? ' 🛍️' : '';  // Fans wearing bags

  return {
    emoji: emoji + paperBag,
    status,
    value: happiness,
    color: happiness >= 60 ? '#4CAF50' :   // Green
           happiness >= 40 ? '#FFC107' :    // Yellow
           happiness >= 20 ? '#FF9800' :    // Orange
           '#F44336',                        // Red
    recentMilestones: recentMilestones.slice(-3).map(m => ({
      text: getMilestoneText(m),
      effect: m.effect > 0 ? `+${m.effect}` : `${m.effect}`
    }))
  };
}
```

### Milestone Examples

**Positive Milestone Display:**
```
+--------------------------------------------------+
|  MILESTONE! 🎉                                    |
|                                                   |
|  Barry Bonds hits his 500th CAREER HOME RUN!     |
|                                                   |
|  Fan Morale: +10 😍                            |
|  (Payroll bonus: +50% - cheap team overperforms) |
+--------------------------------------------------+
```

**Negative Milestone Display:**
```
+--------------------------------------------------+
|  MILESTONE... 😔                                  |
|                                                   |
|  Giants have now lost 15 STRAIGHT GAMES          |
|                                                   |
|  Fan Morale: -5 😠                             |
|  (Payroll amplifier: +50% - high payroll shame)  |
|                                                   |
|  🛍️ Fans spotted wearing paper bags...            |
+--------------------------------------------------+
```

**Season-End Summary:**
```
+---------------------------------------------------------------------------+
|  SEASON 4 FAN MORALE SUMMARY - Giants                                   |
+---------------------------------------------------------------------------+
|  Starting Happiness: 50                                                    |
|  Final Happiness: 72 😊 HAPPY                                              |
|                                                                            |
|  POSITIVE IMPACTS:                                                         |
|  • Willie Mays wins MVP.......................... +10                       |
|  • Barry Bonds hits 50 HRs...................... +8                        |
|  • Team clinches playoff spot................... +5                        |
|  • Willie McCovey reaches 300 career HRs........ +5                        |
|  • Walk-off HR vs Dodgers...................... +5                         |
|  • 3 All-Star selections (2 each).............. +6                         |
|                                                                            |
|  NEGATIVE IMPACTS:                                                         |
|  • Randy Johnson Runner-up Cy Young............. +3 (positive but close)   |
|  • Blown save in playoffs...................... -4                          |
|  • Lost 8 straight in August................... -3                          |
|                                                                            |
|  PERFORMANCE vs EXPECTATION:                                               |
|  • Payroll: Bottom 25% (expected .425 win%)                                |
|  • Actual: .545 win% (+12% above expectation)                              |
|  • CHEAP TEAM OVERPERFORMANCE BONUS: +18 (1.5x amplifier)                  |
|                                                                            |
|  CONTRACTION RISK: NONE (happiness > 30)                                   |
+---------------------------------------------------------------------------+
```

---

## 11. CY YOUNG AWARD VOTING (WITH RUNNER-UP)

```javascript
const CY_YOUNG_VOTING = {
  // Voting formula weights (same structure as MVP)
  WEIGHTS: {
    pWAR: 0.50,          // Pitching WAR
    clutchFactor: 0.25,   // Performance in high leverage
    wins: 0.10,           // Traditional win-loss
    narrative: 0.10,      // Story/Fame
    team_success: 0.05    // Team performance
  },

  // Awards given
  AWARDS: {
    WINNER: {
      happiness: 8,
      salary_bonus: 0.15,  // +15% salary
      fame_increase: 1
    },
    RUNNER_UP: {
      happiness: 3,        // NEW: Same as MVP runner-up
      salary_bonus: 0.08,  // +8% salary
      fame_increase: 0     // No fame for second place
    },
    THIRD_PLACE: {
      happiness: 1,
      salary_bonus: 0.03,
      fame_increase: 0
    }
  }
};

function calculateCyYoungVoting(pitchers, season) {
  const eligiblePitchers = pitchers.filter(p =>
    p.seasonStats.inningsPitched >= 100 ||  // Starters
    p.seasonStats.saves >= 20 ||             // Closers
    p.seasonStats.appearances >= 50          // Relievers
  );

  const votingResults = eligiblePitchers.map(p => ({
    player: p,
    score: calculateCyYoungScore(p, season),
    breakdown: {
      pWAR: getPitchingWARScore(p),
      clutch: getClutchScore(p),
      wins: getWinsScore(p),
      narrative: getNarrativeScore(p),
      teamSuccess: getTeamSuccessScore(p, season)
    }
  }));

  // Sort by score
  votingResults.sort((a, b) => b.score - a.score);

  return {
    winner: votingResults[0],
    runnerUp: votingResults[1],      // NEW: Track runner-up
    thirdPlace: votingResults[2],
    allVotes: votingResults
  };
}

// Award ceremony display
function displayCyYoungResults(results, team) {
  const effects = [];

  // Check if team has winner
  if (results.winner.player.team === team.id) {
    effects.push({
      player: results.winner.player.name,
      award: 'CY YOUNG WINNER',
      happiness: CY_YOUNG_VOTING.AWARDS.WINNER.happiness
    });
  }

  // Check if team has runner-up (NEW)
  if (results.runnerUp.player.team === team.id) {
    effects.push({
      player: results.runnerUp.player.name,
      award: 'CY YOUNG RUNNER-UP',
      happiness: CY_YOUNG_VOTING.AWARDS.RUNNER_UP.happiness
    });
  }

  // Check if team has third place
  if (results.thirdPlace.player.team === team.id) {
    effects.push({
      player: results.thirdPlace.player.name,
      award: 'CY YOUNG 3RD PLACE',
      happiness: CY_YOUNG_VOTING.AWARDS.THIRD_PLACE.happiness
    });
  }

  return effects;
}
```

### Cy Young Award UI

```
+---------------------------------------------------------------------------+
|  🏆 CY YOUNG AWARD - Season 4                                              |
+---------------------------------------------------------------------------+
|                                                                            |
|  🥇 WINNER: Sandy Koufax (Dodgers)                                         |
|     pWAR: 8.2 | W-L: 26-8 | ERA: 1.73 | K: 382                            |
|     → Team happiness +8                                                    |
|                                                                            |
|  🥈 RUNNER-UP: Bob Gibson (Cardinals)                                      |
|     pWAR: 7.8 | W-L: 22-9 | ERA: 1.89 | K: 301                            |
|     → Team happiness +3                                                    |
|                                                                            |
|  🥉 THIRD PLACE: Juan Marichal (Giants)                                    |
|     pWAR: 6.5 | W-L: 21-8 | ERA: 2.10 | K: 248                            |
|     → Team happiness +1                                                    |
|                                                                            |
|  VOTING BREAKDOWN:                                                         |
|  ┌────────────────┬───────┬────────┬──────┬───────┬──────┬───────┐        |
|  │ Player         │ pWAR  │ Clutch │ Wins │ Story │ Team │ TOTAL │        |
|  ├────────────────┼───────┼────────┼──────┼───────┼──────┼───────┤        |
|  │ Sandy Koufax   │ 41.0  │ 23.5   │ 9.2  │ 8.8   │ 4.5  │ 87.0  │        |
|  │ Bob Gibson     │ 39.0  │ 22.0   │ 8.5  │ 7.5   │ 4.8  │ 81.8  │        |
|  │ Juan Marichal  │ 32.5  │ 18.0   │ 8.2  │ 6.0   │ 4.2  │ 68.9  │        |
|  └────────────────┴───────┴────────┴──────┴───────┴──────┴───────┘        |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

## Summary of Changes

1. **Contracted teams** → Auto-select 4 players for expansion draft, remainder to draft pool or retire
2. **Grade formula** → Derived from SMB4 data for fictional player generation
3. **EOS Adjustments** → User can allocate or auto-distribute based on WAR type
4. **Fan Morale** → Refined with high-payroll amplifiers, clear thresholds
5. **Pitcher Salary** → Includes hitting bonus (especially for Two-Way)
6. **Trait Tiers** → Revised per Billy Yank strategic analysis
7. **Personalities** → Hidden, random, can change year-over-year
8. **FA Swaps** → Salary matching (+/-10%), not grade matching
9. **Museum** → Central historical hub with 50 Greatest using MVP formula
10. **Milestone Effects** → Complete system for positive AND negative milestones affecting fan morale:
    - Single-game positive (walk-offs, no-hitters, perfect games)
    - Single-game negative (getting no-hit, blown saves, blowout losses)
    - Season positive (50+ HR, 20+ wins, clinching playoff)
    - **Season negative** (sub-.200 batting, 100-loss season, losing streaks) — fans wear paper bags 🛍️
    - Career positive (500 HR, 3000 hits, 300 wins)
    - **Career negative** (2000 career K batting, 150+ career losses, errors leader)
11. **Cy Young Runner-Up** → Added runner-up award with +3 happiness effect (matching MVP runner-up structure)
