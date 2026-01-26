# KBL XHD Tracker - Fan Favorite & Albatross System Specification v1.1

## Overview

The Fan Favorite & Albatross system captures the emotional connection between fans and players—separate from pure performance metrics like MVP or Ace. A scrappy utility player making league minimum who overperforms can be more beloved than a high-paid star who merely meets expectations.

> **Why "Albatross"?** In sports, an "albatross contract" refers to a burdensome, overpaid deal that weighs down a team—derived from the famous poem where a sailor must wear a dead albatross around his neck as penance. It's evocative without being as harsh as "scapegoat."

> **See Also:** [DYNAMIC_DESIGNATIONS_SPEC.md](./DYNAMIC_DESIGNATIONS_SPEC.md) for the mid-season projection system

**Key Principles:**
- **Value Over Contract** (Option B): Fan Favorite = highest positive Value Delta on team
- **Position-relative**: Compares players only to peers at their position
- **One per team**: Each team has exactly one Fan Favorite and one Albatross
- **Dynamic tracking**: "Projected" status updates after every game (dotted border badge)
- **Season-locked**: Final designation locked at season end (solid border badge)
- **Carries over**: Fan Favorite and Albatross persist into next season until 10% mark (when new projections begin)
- **Influences**: Fan Morale, Trade decisions, Narrative/News, Contract negotiations

---

## Core Calculation

### Value Delta (from Salary System v3)

```javascript
// True Value = what their salary SHOULD be based on actual performance
// Contract Value = what they're actually being paid (opening day salary)
// Value Delta = True Value - Contract Value

const { trueValue, contractValue, valueDelta } = calculateTrueValue(player, seasonStats, leagueContext);

// Positive Delta = BARGAIN (Fan Favorite candidate)
// Negative Delta = OVERPAID (Albatross candidate)
```

### Fan Favorite Detection

```javascript
function detectFanFavorite(team, seasonStats, leagueContext) {
  const eligiblePlayers = team.roster.filter(p => {
    const stats = seasonStats[p.id];
    // Must have minimum playing time to qualify
    return stats && stats.gamesPlayed >= getMinGamesForQualification(leagueContext.config);
  });

  if (eligiblePlayers.length === 0) return null;

  // Calculate Value Delta for each player
  const playerDeltas = eligiblePlayers.map(player => {
    const stats = seasonStats[player.id];
    const { trueValue, contractValue, valueDelta, warPercentile } =
      calculateTrueValue(player, stats, leagueContext);

    return {
      playerId: player.id,
      playerName: player.name,
      position: player.detectedPosition || player.primaryPosition,
      salary: contractValue,
      actualWAR: stats.war.total,
      trueValue,
      valueDelta,
      valueOverContractPct: (valueDelta / contractValue) * 100,
      warPercentile,
    };
  });

  // Fan Favorite = highest positive Value Delta
  const sortedByDelta = [...playerDeltas].sort((a, b) => b.valueDelta - a.valueDelta);
  const topCandidate = sortedByDelta[0];

  // Must have positive delta to be Fan Favorite (can't be overpaid)
  if (topCandidate.valueDelta <= 0) {
    return null; // No Fan Favorite this season - everyone is fairly paid or overpaid
  }

  return {
    ...topCandidate,
    designation: 'FAN_FAVORITE',
    reason: generateFanFavoriteReason(topCandidate),
  };
}

function getMinGamesForQualification(config) {
  // 10% of season to qualify for Fan Favorite/Albatross
  // (Lower threshold than MVP/Ace which require 20%)
  // MINIMUM: 3 games for 32-game seasons (prevents 0-game qualification)
  const calculated = Math.floor(config.gamesPerTeam * 0.10);
  return Math.max(calculated, 3); // Floor of 3 games minimum
}

function generateFanFavoriteReason(candidate) {
  const overPct = Math.round(candidate.valueOverContractPct);

  if (overPct >= 500) {
    return `Producing like a $${(candidate.trueValue).toFixed(1)}M player on a $${candidate.salary.toFixed(1)}M salary - an absolute steal!`;
  } else if (overPct >= 200) {
    return `Massively outperforming his contract with ${candidate.actualWAR.toFixed(1)} WAR`;
  } else if (overPct >= 100) {
    return `Giving the team double the value of his salary`;
  } else {
    return `Consistently exceeding expectations all season`;
  }
}
```

### Albatross Detection

```javascript
function detectAlbatross(team, seasonStats, leagueContext) {
  const eligiblePlayers = team.roster.filter(p => {
    const stats = seasonStats[p.id];
    // Must have minimum playing time AND minimum salary to be albatross
    // (Can't blame the league minimum guy)
    return stats &&
           stats.gamesPlayed >= getMinGamesForQualification(leagueContext.config) &&
           p.salary >= getMinSalaryForAlbatross(leagueContext);
  });

  if (eligiblePlayers.length === 0) return null;

  // Calculate Value Delta for each player
  const playerDeltas = eligiblePlayers.map(player => {
    const stats = seasonStats[player.id];
    const { trueValue, contractValue, valueDelta, warPercentile } =
      calculateTrueValue(player, stats, leagueContext);

    return {
      playerId: player.id,
      playerName: player.name,
      position: player.detectedPosition || player.primaryPosition,
      salary: contractValue,
      actualWAR: stats.war.total,
      trueValue,
      valueDelta,
      valueOverContractPct: (valueDelta / contractValue) * 100,
      warPercentile,
    };
  });

  // Albatross = most negative Value Delta
  const sortedByDelta = [...playerDeltas].sort((a, b) => a.valueDelta - b.valueDelta);
  const bottomCandidate = sortedByDelta[0];

  // Must have significant negative delta to be Albatross
  // Threshold: at least 25% underpaid relative to contract
  if (bottomCandidate.valueDelta >= bottomCandidate.salary * -0.25) {
    return null; // No Albatross - no one is significantly overpaid
  }

  return {
    ...bottomCandidate,
    designation: 'ALBATROSS',
    reason: generateAlbatrossReason(bottomCandidate),
  };
}

function getMinSalaryForAlbatross(leagueContext) {
  // Must make at least 2x league minimum to be a albatross
  // Can't blame the cheap guy
  return leagueContext.leagueMinSalary * 2;
}

function generateAlbatrossReason(candidate) {
  const underPct = Math.abs(Math.round(candidate.valueOverContractPct));

  if (underPct >= 75) {
    return `Being paid $${candidate.salary.toFixed(1)}M but producing like a $${candidate.trueValue.toFixed(1)}M player - a complete bust`;
  } else if (underPct >= 50) {
    return `Severely underperforming his ${candidate.salary.toFixed(1)}M contract with only ${candidate.actualWAR.toFixed(1)} WAR`;
  } else {
    return `Not living up to his expensive contract`;
  }
}
```

---

## Gameplay Effects

### 1. Fan Morale Impact

> **See Also:** [DYNAMIC_DESIGNATIONS_SPEC.md](./DYNAMIC_DESIGNATIONS_SPEC.md#in-season-fan-happiness-effects) for per-game happiness effects

#### In-Season Performance Effects

Fan Favorite and Albatross performance directly affects fan morale each game:

```javascript
const IN_SEASON_HAPPINESS_EFFECTS = {
  // Fan Favorite - fans love seeing the bargain guy deliver
  FAN_FAVORITE_BIG_GAME: +0.75,    // Standout performance
  FAN_FAVORITE_CLUTCH_HIT: +1.0,   // Go-ahead hit in 7th+
  FAN_FAVORITE_WALKOFF: +2.0,      // Maximum joy - the underdog hero!

  // Albatross - fans notice every failure
  ALBATROSS_CLUTCH_FAILURE: -0.75, // GIDP, K with RISP in key spot
  ALBATROSS_COSTLY_ERROR: -1.0,    // Error leads to runs in close game
  ALBATROSS_BENCHED: -0.5,         // Cheaper player outperforms sitting albatross

  // NOTE: Albatross gets NO happiness bonus for good games
  // "That's what you're SUPPOSED to do for that money!"
};

// Effects scale with season progress (see DYNAMIC_DESIGNATIONS_SPEC)
// Early season: ×0.5 | Mid-season: ×1.0 | Late season: ×1.25 | Final stretch: ×1.5
```

#### Roster Transaction Effects

```javascript
const TRANSACTION_HAPPINESS_EFFECTS = {
  // Losing Fan Favorite
  TRADED_FAN_FAVORITE: -15,        // Major unhappiness hit
  RELEASED_FAN_FAVORITE: -20,      // Even worse - felt unnecessary
  FAN_FAVORITE_RETIRES: -5,        // Sad but understood
  FAN_FAVORITE_FREE_AGENCY_LOSS: -10, // "Management let him walk"

  // Losing Albatross
  TRADED_ALBATROSS: +10,           // "Finally got rid of that bum"
  RELEASED_ALBATROSS: +15,         // "Should have done it sooner"
  ALBATROSS_RETIRES: +5,           // Relief
  ALBATROSS_FREE_AGENCY_LOSS: +8,  // "Good riddance"
};

function applyTransactionHappinessEffect(team, event, player) {
  const effect = TRANSACTION_HAPPINESS_EFFECTS[event];
  if (!effect) return;

  team.fanMorale = Math.max(0, Math.min(100, team.fanMorale + effect));

  // Log the event for narrative
  logFanFavoriteEvent(team, event, player, effect);
}
```

### 2. Trade Value Modifier

```javascript
function calculateTradeValue(player, seasonStats, leagueContext, team) {
  // Base trade value from WAR and contract
  let tradeValue = calculateBaseTradeValue(player, seasonStats);

  // Fan Favorite/Albatross modifiers
  const fanFavorite = detectFanFavorite(team, seasonStats, leagueContext);
  const albatross = detectAlbatross(team, seasonStats, leagueContext);

  if (fanFavorite && fanFavorite.playerId === player.id) {
    // Fan Favorite commands a PREMIUM - sending team demands more
    // because they're giving up a beloved player (and taking happiness hit)
    tradeValue *= 1.15;  // 15% premium to acquire
  }

  if (albatross && albatross.playerId === player.id) {
    // Albatross has REDUCED trade value (damaged goods perception)
    // Sending team is motivated to move him, receiving team skeptical
    tradeValue *= 0.70;  // 30% discount
  }

  return tradeValue;
}
```

### 3. Contract Negotiation Impact

```javascript
function calculateFreeAgencyDemand(player, seasonStats, leagueContext, previousTeam) {
  let baseDemand = calculateBaseSalaryDemand(player, seasonStats);

  const fanFavorite = detectFanFavorite(previousTeam, seasonStats, leagueContext);
  const albatross = detectAlbatross(previousTeam, seasonStats, leagueContext);

  if (fanFavorite && fanFavorite.playerId === player.id) {
    // Fan Favorite knows their worth - demands premium
    baseDemand *= 1.15;  // +15% salary demand

    // More likely to want to stay with current team
    player.loyaltyBonus = 0.10;  // 10% discount to re-sign with same team
  }

  if (albatross && albatross.playerId === player.id) {
    // Albatross may take discount to escape
    baseDemand *= 0.90;  // -10% salary demand

    // Wants to leave - no loyalty to current team
    player.loyaltyBonus = 0;
  }

  return baseDemand;
}
```

### 4. Narrative/News Generation

```javascript
const FAN_FAVORITE_HEADLINES = {
  NEW_FAN_FAVORITE: [
    "{player} emerges as fan favorite with incredible value",
    "Bargain hunter's dream: {player} outperforming contract by {pct}%",
    "{team} fans fall in love with overperforming {player}",
  ],
  FAN_FAVORITE_TRADED: [
    "SHOCK: {team} trades beloved {player} - fans outraged",
    "Fan favorite {player} shipped out in controversial move",
    "Social media explodes as {team} deals {player}",
  ],
  ALBATROSS_EMERGES: [
    "{player}'s struggles making him target of fan frustration",
    "Overpaid and underperforming: {player} becomes lightning rod",
    "{team} fans turning on expensive disappointment {player}",
  ],
  ALBATROSS_TRADED: [
    "{team} finally moves on from disappointing {player}",
    "Fans celebrate as {player} traded away",
    "Addition by subtraction: {team} dumps {player}'s contract",
  ],
};

function generateFanFavoriteHeadline(event, player, team, details) {
  const templates = FAN_FAVORITE_HEADLINES[event];
  const template = templates[Math.floor(Math.random() * templates.length)];

  return template
    .replace('{player}', player.name)
    .replace('{team}', team.name)
    .replace('{pct}', details.valueOverContractPct?.toFixed(0) || '');
}
```

---

## UI Display

### Fame Exponent Display

Each player shows a small superscript number indicating their Value Delta status:

```
+------------+--------+------------------+
| Player     | WAR    | Salary           |
+------------+--------+------------------+
| J. Smith^+12.8M | 3.5  | $1.2M  ⭐ FAN FAV |
| M. Jones^-2.1M  | 2.0  | $15.0M           |
| T. Brown^+0.5M  | 1.8  | $8.0M            |
| R. Davis^-19.8M | 1.5  | $28.0M  💀 ALBATROSS |
+------------+--------+------------------+
```

### Value Delta Color Coding

```javascript
function getValueDeltaColor(valueDelta, contractValue) {
  const pct = (valueDelta / contractValue) * 100;

  if (pct >= 100) return 'green-bright';   // 🟢 Massive bargain
  if (pct >= 25) return 'green';           // 🟢 Good value
  if (pct >= -25) return 'gray';           // ⚪ Fair
  if (pct >= -50) return 'orange';         // 🟠 Overpaid
  return 'red';                             // 🔴 Grossly overpaid
}
```

### Roster View Integration

```
+---------------------------------------------------------------------------+
|  TEAM ROSTER - Giants                           Fan Morale: 72 😊       |
+---------------------------------------------------------------------------+
|                                                                            |
|  ⭐ FAN FAVORITE: Johnny Rookie (SS)                                       |
|     $1.2M salary → $14.0M true value (+$12.8M, +1067%)                     |
|     "Producing like a $14M player on a rookie deal - an absolute steal!"  |
|                                                                            |
|  💀 ALBATROSS: Big Contract Bob (1B)                                       |
|     $28.0M salary → $8.2M true value (-$19.8M, -71%)                       |
|     "Being paid $28M but producing like an $8M player - a complete bust"  |
|                                                                            |
+---------------------------------------------------------------------------+
```

---

## Detection Timing

### When to Recalculate

```javascript
const DETECTION_TRIGGERS = {
  // Full recalculation
  GAME_END: true,           // After every game
  TRADE_COMPLETED: true,    // Roster changed
  PLAYER_INJURED: true,     // Playing time affected

  // No recalculation needed
  FAME_EVENT: false,        // Fame doesn't affect Value Delta
  MOJO_CHANGE: false,       // Temporary rating changes don't affect salary
};

function shouldRecalculateFanFavorite(event) {
  return DETECTION_TRIGGERS[event] === true;
}
```

### Minimum Games Threshold

Players must play **10%** of the season to qualify for Fan Favorite or Albatross.
This is lower than MVP/Ace (20%) because value-over-contract can be meaningful
even with a smaller sample size, and we want the dynamic projection to engage
earlier in the season.

---

## Relationship to Other Designations

| Designation | Basis | Can Overlap? |
|-------------|-------|--------------|
| **MVP** | Highest WAR (league-wide) | Yes - MVP can be Fan Favorite |
| **Ace** | Highest pWAR on team | Yes - Ace can be Fan Favorite |
| **Cornerstone** | Sustained production over seasons | Yes - Cornerstone can be Fan Favorite |
| **Fan Favorite** | Highest Value Delta on team | Unique designation |
| **Albatross** | Lowest Value Delta on team | Cannot overlap with Fan Favorite |

### Typical Scenarios

| Player Type | Likely Designation |
|-------------|-------------------|
| Rookie Star on minimum salary | Fan Favorite |
| Overpaid declining veteran | Albatross |
| Fairly paid star (WAR ≈ expected) | MVP/Ace but NOT Fan Favorite |
| Underperforming high-priced FA | Albatross |
| Mid-level producer on bargain deal | Fan Favorite candidate |

---

## Fame Events

```javascript
// New Fame event types for Fan Favorite system
const FAN_FAVORITE_FAME_EVENTS = {
  NAMED_FAN_FAVORITE: {
    eventType: 'FAN_FAVORITE_NAMED',
    fameValue: 2,           // Bonus fame for being beloved
    description: 'Named team Fan Favorite',
  },
  NAMED_ALBATROSS: {
    eventType: 'ALBATROSS_NAMED',
    fameValue: -1,          // Small negative (it's already bad to be overpaid)
    description: 'Named team Albatross',
  },
  FAN_FAVORITE_CLUTCH: {
    eventType: 'FAN_FAVORITE_CLUTCH',
    fameValue: 1.5,         // Bonus multiplier for clutch plays by Fan Favorite
    description: 'Clutch play by Fan Favorite',
  },
  ALBATROSS_FAILURE: {
    eventType: 'ALBATROSS_FAILURE',
    fameValue: -1.5,        // Extra negative for Albatross failures
    description: 'Key failure by Albatross',
  },
};
```

---

## End of Season Processing

```javascript
function processEndOfSeasonFanFavorite(team, seasonStats, leagueContext) {
  const fanFavorite = detectFanFavorite(team, seasonStats, leagueContext);
  const albatross = detectAlbatross(team, seasonStats, leagueContext);

  const results = {
    fanFavorite: null,
    albatross: null,
    fameEvents: [],
    happinessEffects: [],
  };

  if (fanFavorite) {
    results.fanFavorite = fanFavorite;

    // Award Fame bonus
    results.fameEvents.push({
      playerId: fanFavorite.playerId,
      ...FAN_FAVORITE_FAME_EVENTS.NAMED_FAN_FAVORITE,
    });

    // Record in player history
    addToPlayerHistory(fanFavorite.playerId, {
      type: 'FAN_FAVORITE',
      seasonId: leagueContext.currentSeasonId,
      teamId: team.id,
      valueDelta: fanFavorite.valueDelta,
    });
  }

  if (albatross) {
    results.albatross = albatross;

    // Apply Fame penalty
    results.fameEvents.push({
      playerId: albatross.playerId,
      ...FAN_FAVORITE_FAME_EVENTS.NAMED_ALBATROSS,
    });

    // Record in player history
    addToPlayerHistory(albatross.playerId, {
      type: 'ALBATROSS',
      seasonId: leagueContext.currentSeasonId,
      teamId: team.id,
      valueDelta: albatross.valueDelta,
    });
  }

  return results;
}
```

---

## Summary

| Component | Description |
|-----------|-------------|
| **Fan Favorite** | Highest positive Value Delta on team |
| **Albatross** | Most negative Value Delta on team (min salary threshold) |
| **Value Delta** | True Value - Contract Value (position-relative) |
| **Qualification** | 10% of season played; Albatross requires 2x league minimum salary |
| **Happiness Impact** | Trading Fan Favorite: -15; Trading Albatross: +10 |
| **Trade Value** | Fan Favorite: 15% premium; Albatross: 30% discount |
| **Contract Impact** | Fan Favorite demands +15%; Albatross accepts -10% |
| **Fame** | Fan Favorite: +2; Albatross: -1 |

---

*End of Fan Favorite & Albatross System Specification v1*
