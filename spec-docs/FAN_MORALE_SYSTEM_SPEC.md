# KBL Fan Morale System Specification

**Version**: 1.1
**Status**: Draft
**Last Updated**: February 2026

---

## Terminology Note

> **"Fan Morale"** is the official term used throughout all KBL specifications. Previous references to "fan happiness" should be considered synonymous and have been consolidated under "Fan Morale" for consistency. This parallels "Player Morale" and sounds more natural when describing rises and falls.

---

## 0. Simplified Core Formula (v1.1)

> **UPDATE February 2026**: The granular event-driven system described in sections below is the FULL specification. For implementation priority, Fan Morale can be approximated by this simplified weighted formula:

### 0.1 Core Weights

```typescript
function calculateFanMorale(team: Team, season: Season): number {
  // 60% - Performance Gap (actual vs expected wins)
  const performanceGap = calculatePerformanceGap(team, season);
  
  // 20% - Designations (fan favorites and scapegoats)
  const designationScore = calculateDesignationScore(team);
  
  // 10% - Beat Reporter Sentiment
  const beatReporterScore = calculateBeatReporterSentiment(team);
  
  // 10% - Roster Composition + Random Events
  const rosterRandomScore = calculateRosterAndRandom(team, season);
  
  const morale = (
    performanceGap * 0.60 +
    designationScore * 0.20 +
    beatReporterScore * 0.10 +
    rosterRandomScore * 0.10
  );
  
  return clamp(Math.round(morale), 0, 99);
}
```

### 0.2 Performance Gap (60%)

The dominant factor. Compares actual win percentage to expected win percentage based on roster True Value.

```typescript
function calculatePerformanceGap(team: Team, season: Season): number {
  const expectedWinPct = getExpectedWinPctFromRosterValue(team);
  const actualWinPct = team.wins / (team.wins + team.losses);
  
  // Delta in games above/below expectation
  const gamesPlayed = team.wins + team.losses;
  const expectedWins = Math.round(expectedWinPct * gamesPlayed);
  const gamesAboveExpected = team.wins - expectedWins;
  
  // Convert to 0-99 scale: 50 = meeting expectations
  // Each game above/below = ~3 points
  return clamp(50 + (gamesAboveExpected * 3), 0, 99);
}
```

### 0.3 Designations (20%)

Fan favorites (outperforming contract) boost morale; scapegoats (underperforming) drain it.

```typescript
function calculateDesignationScore(team: Team): number {
  let score = 50;  // Neutral baseline
  
  const fanFavorites = team.roster.filter(p => p.designation === 'FAN_FAVORITE');
  const scapegoats = team.roster.filter(p => p.designation === 'SCAPEGOAT');
  
  // Each fan favorite: +5 morale
  score += fanFavorites.length * 5;
  
  // Each scapegoat: -8 morale (negativity bias)
  score -= scapegoats.length * 8;
  
  return clamp(score, 0, 99);
}
```

### 0.4 Beat Reporter Sentiment (10%)

Average tone of recent beat reporter coverage.

```typescript
function calculateBeatReporterSentiment(team: Team): number {
  const recentArticles = getRecentBeatReporterArticles(team, 10);
  if (recentArticles.length === 0) return 50;
  
  const avgSentiment = average(recentArticles.map(a => a.sentimentScore));
  // sentimentScore is already 0-99
  return avgSentiment;
}
```

### 0.5 Roster Composition + Random Events (10%)

Star acquisitions, popular call-ups, salary dumps, and random flavor events.

```typescript
function calculateRosterAndRandom(team: Team, season: Season): number {
  let score = 50;
  
  // Recent star acquisitions boost
  const recentAcquisitions = getRecentTransactions(team, 30, 'ACQUIRED');
  for (const acq of recentAcquisitions) {
    if (acq.player.grade >= 'B+') score += 5;
    else if (acq.player.grade >= 'B') score += 2;
  }
  
  // Recent prospect call-ups boost
  const recentCallUps = getRecentTransactions(team, 14, 'CALL_UP');
  score += recentCallUps.length * 3;
  
  // Salary dump penalty
  const recentSalaryDumps = getRecentTransactions(team, 30, 'SALARY_DUMP');
  score -= recentSalaryDumps.length * 8;
  
  // Random events (±2 per event, max ±10 total)
  score += getRandomEventAdjustment(team, season);
  
  return clamp(score, 0, 99);
}
```

> **Note**: The detailed event-driven system (sections below) provides granular precision for each individual event. The simplified formula above is the recommended starting point for implementation. Both approaches should converge to similar results.

---

## 1. Overview

Fan Morale is a **dynamic, event-driven metric** that changes constantly throughout the season. Every game, trade, call-up, milestone, and roster move triggers a recalculation, making Fan Morale a living indicator of franchise health that's always fun to monitor.

### 1.1 Design Philosophy

- **Always moving**: Fan morale should rarely be static for more than a few games
- **Reactive**: Fans respond immediately to events, then adjust over time
- **Logical**: Changes make intuitive sense (winning = happy, salary dumps during contention = suspicious)
- **Story-driven**: Morale creates narratives ("fans turning on management", "bandwagon filling up")
- **Consequential**: Low morale affects player morale, free agency, and narrative tone

### 1.2 Core Metric

```typescript
interface FanMorale {
  current: number;           // 0-99 scale
  previous: number;          // Last recorded value (for trend)
  trend: 'RISING' | 'STABLE' | 'FALLING';
  streak: number;            // Consecutive changes in same direction
  lastUpdated: GameDate;
  lastEvent: MoraleEvent;

  // Computed states
  state: FanState;
  riskLevel: 'SAFE' | 'WATCH' | 'DANGER' | 'CRITICAL';
}

type FanState =
  | 'EUPHORIC'      // 90-99: Championship fever
  | 'EXCITED'       // 75-89: Playoff buzz
  | 'CONTENT'       // 55-74: Satisfied fanbase
  | 'RESTLESS'      // 40-54: Growing impatient
  | 'FRUSTRATED'    // 25-39: Angry but loyal
  | 'APATHETIC'     // 10-24: Checked out
  | 'HOSTILE'       // 0-9:  Demanding change
```

---

## 2. Expected Wins System

Expected Wins is the baseline against which fan morale is measured. It recalculates at key moments, not just in the offseason.

### 2.1 When Expected Wins Recalculates

| Trigger | Timing | Fan Awareness |
|---------|--------|---------------|
| **Season Start** | Offseason Phase 11 | "Preseason projections" |
| **Trade Completed** | Immediately | "Analysts update projections" |
| **Call-up/Send-down** | Immediately | "Roster move impacts outlook" |
| **Injury (Long-term)** | When announced | "Season outlook dims" |
| **Injury Return** | When activated | "Key player back!" |
| **All-Star Break** | Mid-season | "Second-half projections" |
| **Trade Deadline** | After deadline passes | "Final roster set" |

### 2.2 Expected Wins Calculation

```typescript
interface ExpectedWins {
  preseason: number;         // Original projection
  current: number;           // Latest projection
  gamesPlayed: number;
  actualWins: number;
  remainingExpected: number; // Projected wins for rest of season

  // Performance vs expectation
  pace: 'EXCEEDING' | 'MEETING' | 'BELOW';
  differential: number;      // Actual - Expected (can be negative)
}

function calculateExpectedWins(team: Team): number {
  // Sum of all roster True Values, converted to win expectation
  const totalTrueValue = team.roster.reduce(
    (sum, player) => sum + player.trueValue, 0
  );

  // League average True Value per team (baseline = 81 wins)
  const leagueAvgTV = getLeagueAverageTrueValue();

  // Each point above/below average = ~0.5 wins
  const winAdjustment = (totalTrueValue - leagueAvgTV) * 0.5;

  return Math.round(81 + winAdjustment);
}

function recalculateExpectedWins(
  team: Team,
  trigger: ExpectedWinsTrigger
): ExpectedWinsUpdate {
  const oldExpected = team.expectedWins.current;
  const newExpected = calculateExpectedWins(team);

  // Pro-rate for games remaining
  const gamesRemaining = 162 - team.gamesPlayed;
  const winRateNeeded = (newExpected - team.actualWins) / gamesRemaining;

  return {
    previousExpected: oldExpected,
    newExpected: newExpected,
    change: newExpected - oldExpected,
    trigger: trigger,
    projectedFinal: team.actualWins + (gamesRemaining * winRateNeeded),
    fanReaction: determineFanReaction(oldExpected, newExpected, trigger)
  };
}
```

### 2.3 Fan Reaction to Expected Wins Changes

```typescript
function determineFanReaction(
  oldExpected: number,
  newExpected: number,
  trigger: ExpectedWinsTrigger
): FanReaction {
  const change = newExpected - oldExpected;

  // Context matters!
  if (trigger === 'TRADE') {
    if (change > 0) {
      return {
        type: 'OPTIMISTIC',
        message: "Fans excited about trade improving team",
        moraleImpact: change * 2  // Trades get amplified reaction
      };
    } else if (change < -3) {
      return {
        type: 'SUSPICIOUS',
        message: "Fans questioning front office commitment",
        moraleImpact: change * 3  // Salary dumps hit harder
      };
    } else {
      return {
        type: 'WAIT_AND_SEE',
        message: "Fans reserving judgment on trade",
        moraleImpact: 0
      };
    }
  }

  if (trigger === 'CALL_UP') {
    return {
      type: 'HOPEFUL',
      message: "Fans excited to see prospect debut",
      moraleImpact: Math.max(change * 1.5, 2)  // Always some optimism
    };
  }

  if (trigger === 'INJURY') {
    return {
      type: 'CONCERNED',
      message: "Fans worried about season outlook",
      moraleImpact: change * 1.5
    };
  }

  // Default
  return {
    type: 'NEUTRAL',
    message: "Projections updated",
    moraleImpact: change
  };
}
```

---

## 3. Morale Event Triggers

### 3.1 Complete Event Catalog

Every event that affects fan morale, organized by category:

#### Game Results

| Event | Base Impact | Modifiers |
|-------|-------------|-----------|
| **Win** | +1 | +1 if vs rival, +2 if comeback, +1 if blowout |
| **Loss** | -1 | -1 if vs rival, -2 if blown lead, -1 if blowout |
| **Walk-off Win** | +3 | +1 if vs rival, +1 if playoff implications |
| **Walk-off Loss** | -3 | -1 if vs rival, -1 if playoff implications |
| **No-hitter** | +5 | +2 if perfect game |
| **Getting No-hit** | -4 | -1 if by rival |
| **Shutout Win** | +2 | |
| **Shutout Loss** | -2 | |

#### Streaks

| Event | Base Impact | Notes |
|-------|-------------|-------|
| **3-game win streak** | +2 | "Team heating up" |
| **5-game win streak** | +5 | "Fans getting excited" |
| **7+ game win streak** | +8 | "Bandwagon filling up" |
| **3-game losing streak** | -2 | "Rough patch" |
| **5-game losing streak** | -5 | "Fans getting restless" |
| **7+ game losing streak** | -10 | "Crisis mode" |
| **Streak broken (win after 5+ losses)** | +4 | Relief bonus |
| **Streak broken (loss after 5+ wins)** | -3 | Disappointment |

#### Trades

| Event | Base Impact | Modifiers |
|-------|-------------|-----------|
| **Acquire star player** | +8 | +3 if fills need, +2 if fan favorite elsewhere |
| **Trade away star** | -10 | -5 if fan favorite, +3 if return is good |
| **Acquire depth piece** | +1 | +2 if fills clear need |
| **Salary dump (obvious)** | -8 | -5 if team is contending |
| **Salary dump (disguised)** | -3 | Fans less sure |
| **Trade prospect for veteran** | +2 | "Going for it" |
| **Trade veteran for prospect** | -3 | "Rebuilding?" |

*Note: These are immediate reactions. Performance after trade modifies further (see Section 4).*

#### Roster Moves

| Event | Base Impact | Modifiers |
|-------|-------------|-----------|
| **Top prospect called up** | +5 | +3 if hyped, +2 if immediate need |
| **Regular prospect called up** | +2 | |
| **Star sent to IL** | -5 | -3 if long-term |
| **Star returns from IL** | +5 | +2 if playoff race |
| **Popular player DFA'd** | -4 | |
| **Unpopular player DFA'd** | +2 | |

#### Milestones & Achievements

| Event | Base Impact | Modifiers |
|-------|-------------|-----------|
| **Player hits milestone** (3000 hits, 500 HR, etc.) | +4 | +2 if franchise player |
| **Player wins weekly award** | +2 | |
| **Player named All-Star** | +3 | +1 per additional All-Star |
| **Team leads division** | +5 | First time bonus +3 |
| **Team clinches playoff spot** | +15 | |
| **Team clinches division** | +20 | |
| **Team eliminated from playoff race** | -15 | |
| **Rival eliminated** | +3 | Schadenfreude |

#### Season Milestones

| Event | Base Impact | Notes |
|-------|-------------|-------|
| **Opening Day** | +10 | Fresh start optimism |
| **Opening Day loss** | -5 | (Cancels some optimism) |
| **First home game** | +5 | |
| **All-Star Break (winning record)** | +5 | |
| **All-Star Break (losing record)** | -5 | |
| **September call-ups** | +3 | Prospect excitement |
| **Fan Appreciation Day** | +2 | |
| **Rivalry series sweep** | +8 | |
| **Swept by rival** | -8 | |

#### Management Actions

| Event | Base Impact | Modifiers |
|-------|-------------|-----------|
| **Popular manager hired** | +5 | |
| **Manager fired mid-season** | ±0 | Depends on context |
| **Ticket prices raised** | -3 | -2 if losing record |
| **Stadium improvements announced** | +3 | |
| **Team announces rebuild** | -10 | But sets lower expectations |
| **Owner makes controversial statement** | -5 | |
| **Team charity event** | +2 | |

### 3.2 Event Processing

```typescript
interface MoraleEvent {
  id: string;
  type: MoraleEventType;
  timestamp: GameDate;
  baseImpact: number;
  modifiers: MoraleModifier[];
  finalImpact: number;
  context: EventContext;
  narrative: string;  // Human-readable description
}

interface MoraleModifier {
  type: string;
  value: number;
  reason: string;
}

function processMoraleEvent(
  team: Team,
  event: MoraleEvent
): MoraleUpdate {
  // Calculate final impact with all modifiers
  let impact = event.baseImpact;

  for (const modifier of event.modifiers) {
    impact += modifier.value;
  }

  // Apply diminishing returns for repeated similar events
  impact = applyDiminishingReturns(team, event, impact);

  // Apply state multipliers (euphoric fans less affected by small losses)
  impact = applyStateMultiplier(team.fanMorale.state, impact);

  // Calculate new morale
  const oldMorale = team.fanMorale.current;
  const newMorale = clamp(oldMorale + impact, 0, 99);

  // Update trend
  const trend = calculateTrend(oldMorale, newMorale, team.fanMorale.trend);

  return {
    previousMorale: oldMorale,
    newMorale: newMorale,
    change: impact,
    event: event,
    trend: trend,
    narrative: generateNarrative(team, event, impact)
  };
}
```

---

## 4. Contextual Modifiers

### 4.1 Performance vs Expectations

The biggest modifier: how is the team doing relative to Expected Wins?

```typescript
interface PerformanceContext {
  expectedWinPct: number;    // What we should be at
  actualWinPct: number;      // What we actually are
  differential: number;      // Games above/below .500 vs expected
  classification: PerformanceClass;
}

type PerformanceClass =
  | 'VASTLY_EXCEEDING'   // 10+ games better
  | 'EXCEEDING'          // 5-9 games better
  | 'SLIGHTLY_ABOVE'     // 1-4 games better
  | 'MEETING'            // Within 1 game
  | 'SLIGHTLY_BELOW'     // 1-4 games worse
  | 'UNDERPERFORMING'    // 5-9 games worse
  | 'VASTLY_UNDER'       // 10+ games worse

function getPerformanceMultiplier(
  context: PerformanceContext,
  eventType: MoraleEventType,
  eventImpact: number
): number {
  // Positive events amplified when exceeding expectations
  if (eventImpact > 0) {
    switch (context.classification) {
      case 'VASTLY_EXCEEDING': return 1.5;  // "This team is magic!"
      case 'EXCEEDING': return 1.3;
      case 'SLIGHTLY_ABOVE': return 1.1;
      case 'MEETING': return 1.0;
      case 'SLIGHTLY_BELOW': return 0.9;
      case 'UNDERPERFORMING': return 0.7;   // "Finally something good"
      case 'VASTLY_UNDER': return 0.5;      // "Too little too late"
    }
  }

  // Negative events amplified when underperforming
  if (eventImpact < 0) {
    switch (context.classification) {
      case 'VASTLY_EXCEEDING': return 0.5;  // "Can't win em all"
      case 'EXCEEDING': return 0.7;
      case 'SLIGHTLY_ABOVE': return 0.9;
      case 'MEETING': return 1.0;
      case 'SLIGHTLY_BELOW': return 1.1;
      case 'UNDERPERFORMING': return 1.3;   // "Here we go again"
      case 'VASTLY_UNDER': return 1.5;      // "Of course"
    }
  }

  return 1.0;
}
```

### 4.2 Timing Modifiers

When something happens matters:

```typescript
function getTimingMultiplier(
  event: MoraleEvent,
  seasonContext: SeasonContext
): number {
  // Playoff race intensifies everything
  if (seasonContext.inPlayoffRace && seasonContext.month >= 8) {
    return 1.5;  // September games matter more
  }

  // Already eliminated = fans checked out
  if (seasonContext.eliminated) {
    return 0.5;  // Less emotional investment
  }

  // Early season optimism
  if (seasonContext.gamesPlayed < 20) {
    return 0.8;  // "It's early"
  }

  // Trade deadline buzz
  if (seasonContext.isTradeDeadlineWeek) {
    return 1.3;  // Extra attention on roster moves
  }

  return 1.0;
}
```

### 4.3 Recent History Modifiers

What happened recently affects reaction to now:

```typescript
function getHistoryModifier(
  event: MoraleEvent,
  recentHistory: MoraleEvent[]
): number {
  // Post-trade scrutiny period
  const recentTrade = recentHistory.find(
    e => e.type === 'TRADE' && daysSince(e.timestamp) < 14
  );

  if (recentTrade) {
    // First few games after trade are CRUCIAL
    if (event.type === 'WIN') {
      return 1.5;  // "Trade already paying off!"
    }
    if (event.type === 'LOSS') {
      return 1.5;  // "Knew that trade was bad!"
    }
  }

  // Post-call-up spotlight
  const recentCallUp = recentHistory.find(
    e => e.type === 'CALL_UP' && daysSince(e.timestamp) < 7
  );

  if (recentCallUp && event.type === 'PLAYER_MILESTONE') {
    if (event.playerId === recentCallUp.playerId) {
      return 2.0;  // "Called it! This kid is special!"
    }
  }

  // Diminishing returns on repeated events
  const similarEvents = recentHistory.filter(
    e => e.type === event.type && daysSince(e.timestamp) < 7
  );

  if (similarEvents.length > 2) {
    return 0.7;  // "Yeah yeah, another one"
  }

  return 1.0;
}
```

---

## 5. The Trade Scrutiny System

Special handling for the scenario you described: trade → immediate performance.

### 5.1 Trade Aftermath Tracking

```typescript
interface TradeAftermath {
  tradeId: string;
  completedAt: GameDate;
  expectedWinsChange: number;
  salarySent: number;
  salaryReceived: number;

  // Tracking period (14 games after trade)
  scrutinyPeriod: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    runDifferential: number;
  };

  // Acquired player performance
  acquiredPlayers: {
    playerId: string;
    gamesPlayed: number;
    warContributed: number;
    keyMoments: string[];  // "Game-winning HR", "7IP 0ER", etc.
  }[];

  // Fan verdict (evolves over scrutiny period)
  fanVerdict: 'TOO_EARLY' | 'LOOKING_GOOD' | 'JURY_OUT' | 'LOOKING_BAD' | 'DISASTER';
}

function updateTradeAftermath(
  aftermath: TradeAftermath,
  gameResult: GameResult
): TradeAftermath {
  aftermath.scrutinyPeriod.gamesPlayed++;

  if (gameResult.won) {
    aftermath.scrutinyPeriod.wins++;
  } else {
    aftermath.scrutinyPeriod.losses++;
  }

  // Track acquired player contributions
  for (const acquired of aftermath.acquiredPlayers) {
    const playerGame = gameResult.playerPerformances.find(
      p => p.playerId === acquired.playerId
    );
    if (playerGame) {
      acquired.gamesPlayed++;
      acquired.warContributed += playerGame.gameWAR;
      if (playerGame.keyMoment) {
        acquired.keyMoments.push(playerGame.keyMoment);
      }
    }
  }

  // Update fan verdict
  aftermath.fanVerdict = calculateFanVerdict(aftermath);

  return aftermath;
}
```

### 5.2 Trade Verdict Logic

```typescript
function calculateFanVerdict(aftermath: TradeAftermath): FanVerdict {
  const { scrutinyPeriod, expectedWinsChange, acquiredPlayers } = aftermath;

  if (scrutinyPeriod.gamesPlayed < 5) {
    return 'TOO_EARLY';
  }

  const winPct = scrutinyPeriod.wins / scrutinyPeriod.gamesPlayed;
  const acquiredContributions = acquiredPlayers.reduce(
    (sum, p) => sum + p.keyMoments.length, 0
  );

  // Salary dump trades get harsher judgment
  const wasSalaryDump = expectedWinsChange < -3;

  if (wasSalaryDump) {
    // Fans were already suspicious
    if (winPct >= 0.6 && acquiredContributions > 0) {
      return 'LOOKING_GOOD';  // "Maybe they knew something"
    } else if (winPct < 0.4) {
      return 'DISASTER';  // "We knew it, they gave up on us"
    } else {
      return 'JURY_OUT';
    }
  } else {
    // Normal trade
    if (winPct >= 0.6) {
      return 'LOOKING_GOOD';
    } else if (winPct >= 0.4) {
      return 'JURY_OUT';
    } else if (acquiredContributions > 2) {
      return 'JURY_OUT';  // New guys producing but still losing
    } else {
      return 'LOOKING_BAD';
    }
  }
}
```

### 5.3 Trade-Triggered Morale Events

```typescript
function getPostTradeGameImpact(
  aftermath: TradeAftermath,
  gameResult: GameResult,
  baseImpact: number
): number {
  // First game after trade
  if (aftermath.scrutinyPeriod.gamesPlayed === 1) {
    if (gameResult.won) {
      return baseImpact * 2;  // "Great start to new era!"
    } else {
      return baseImpact * 2;  // "Ugh, not a good sign"
    }
  }

  // During scrutiny period (first 14 games)
  if (aftermath.scrutinyPeriod.gamesPlayed <= 14) {
    switch (aftermath.fanVerdict) {
      case 'LOOKING_GOOD':
        // Wins amplified, losses dampened
        return gameResult.won ? baseImpact * 1.5 : baseImpact * 0.7;

      case 'LOOKING_BAD':
      case 'DISASTER':
        // Losses amplified, wins dampened
        return gameResult.won ? baseImpact * 0.7 : baseImpact * 1.5;

      default:
        return baseImpact * 1.2;  // Everything slightly amplified
    }
  }

  return baseImpact;
}
```

---

## 6. Morale Decay & Recovery

### 6.1 Natural Drift

Morale slowly drifts toward a "baseline" determined by team performance:

```typescript
function calculateMoraleBaseline(team: Team): number {
  const performanceFactor = team.expectedWins.differential * 2;
  const standingsFactor = getStandingsBonus(team.divisionRank);
  const historyFactor = getRecentHistoryFactor(team);

  // Baseline is 50 (neutral) modified by factors
  return clamp(50 + performanceFactor + standingsFactor + historyFactor, 20, 80);
}

function applyMoraleDrift(team: Team): number {
  const baseline = calculateMoraleBaseline(team);
  const current = team.fanMorale.current;

  // Drift 1-2 points per series toward baseline
  if (current > baseline + 5) {
    return -1;  // Slowly come down from highs
  } else if (current < baseline - 5) {
    return +1;  // Slowly recover from lows
  }

  return 0;
}
```

### 6.2 Morale Momentum

Consecutive changes in the same direction build momentum:

```typescript
function applyMomentum(
  currentTrend: MoraleTrend,
  consecutiveChanges: number,
  newChange: number
): number {
  // If change continues the trend, it's amplified
  if (currentTrend === 'RISING' && newChange > 0) {
    return newChange * (1 + consecutiveChanges * 0.1);  // Up to 50% boost
  }

  if (currentTrend === 'FALLING' && newChange < 0) {
    return newChange * (1 + consecutiveChanges * 0.1);  // Spiral effect
  }

  // Breaking a trend has its own impact
  if (currentTrend === 'RISING' && newChange < 0 && consecutiveChanges > 3) {
    return newChange * 1.3;  // "Bubble burst"
  }

  if (currentTrend === 'FALLING' && newChange > 0 && consecutiveChanges > 3) {
    return newChange * 1.5;  // "Finally turning around!"
  }

  return newChange;
}
```

---

## 7. Integration Points

### 7.1 Game Processing Integration

```typescript
// In game result processing
function processGameResult(game: GameResult): void {
  // ... existing game logic ...

  // === FAN MORALE UPDATE ===
  const moraleEvent = createGameMoraleEvent(game);
  const moraleUpdate = processMoraleEvent(game.team, moraleEvent);

  // Check for streak events
  const streakEvent = checkForStreakEvent(game.team);
  if (streakEvent) {
    processMoraleEvent(game.team, streakEvent);
  }

  // Check trade aftermath
  const activeTrades = getActiveTradeAftermaths(game.team);
  for (const aftermath of activeTrades) {
    updateTradeAftermath(aftermath, game);
    const tradeImpact = getPostTradeGameImpact(aftermath, game, moraleEvent.baseImpact);
    // Apply additional trade-context impact
  }

  // Apply natural drift (every 3 games)
  if (game.team.gamesPlayed % 3 === 0) {
    const drift = applyMoraleDrift(game.team);
    if (drift !== 0) {
      processMoraleEvent(game.team, createDriftEvent(drift));
    }
  }
}
```

### 7.2 Trade System Integration

```typescript
// In TRADE_SYSTEM_SPEC.md processing
function processTrade(trade: Trade): void {
  // ... existing trade logic ...

  // === FAN MORALE UPDATE ===

  // 1. Immediate reaction to trade
  const immediateReaction = calculateTradeReaction(trade);
  processMoraleEvent(trade.team, createTradeEvent(trade, immediateReaction));

  // 2. Expected Wins recalculation
  const expectedWinsUpdate = recalculateExpectedWins(trade.team, 'TRADE');
  const ewReaction = determineFanReaction(
    expectedWinsUpdate.previousExpected,
    expectedWinsUpdate.newExpected,
    'TRADE'
  );
  processMoraleEvent(trade.team, createExpectedWinsEvent(ewReaction));

  // 3. Start trade aftermath tracking
  startTradeAftermath(trade);
}
```

### 7.3 Roster Move Integration

```typescript
// Call-up processing
function processCallUp(callUp: CallUp): void {
  // ... existing call-up logic ...

  // === FAN MORALE UPDATE ===
  const moraleEvent = createCallUpEvent(callUp);
  processMoraleEvent(callUp.team, moraleEvent);

  // Recalculate Expected Wins
  const ewUpdate = recalculateExpectedWins(callUp.team, 'CALL_UP');
  if (Math.abs(ewUpdate.change) >= 1) {
    processMoraleEvent(callUp.team, createExpectedWinsEvent(ewUpdate));
  }

  // Start prospect spotlight tracking
  startProspectSpotlight(callUp);
}
```

### 7.4 Offseason Integration

```typescript
// In OFFSEASON_SYSTEM_SPEC.md
function processOffseasonPhase(phase: OffseasonPhase): void {
  switch (phase) {
    case 'SEASON_END':
      // Final season assessment
      const seasonAssessment = assessSeason(team);
      processMoraleEvent(team, createSeasonEndEvent(seasonAssessment));
      break;

    case 'FREE_AGENCY':
      // Each FA signing
      for (const signing of signings) {
        processMoraleEvent(team, createSigningEvent(signing));
      }
      break;

    case 'DRAFT':
      // Draft excitement
      for (const pick of picks) {
        processMoraleEvent(team, createDraftPickEvent(pick));
      }
      break;

    case 'NEW_SEASON_PREP':
      // Opening Day optimism reset
      processMoraleEvent(team, createOpeningDayEvent());
      break;
  }
}
```

---

## 8. UI Display

### 8.1 Morale Widget (Always Visible)

```
┌─────────────────────────────────────┐
│ FAN MORALE                          │
│                                     │
│  ████████████████░░░░  78 😊        │
│                        ▲ RISING     │
│                                     │
│  "Fans buzzing after 5-game streak" │
│                                     │
│  vs Expected: +4 wins (EXCEEDING)   │
└─────────────────────────────────────┘
```

### 8.2 Morale History Graph

```
Fan Morale - Last 30 Games
100 ┤
 90 ┤                              ╭──
 80 ┤                    ╭────╮   ╯
 70 ┤        ╭──────────╯    ╰──╯
 60 ┤   ╭───╯
 50 ┼──╯
 40 ┤ ▲ Trade    ▲ Call-up   ▲ Win streak
 30 ┤
    └─────────────────────────────────
      W1  W2  W3  W4  W5  W6  W7  W8
```

### 8.3 Morale Event Feed

```
╔═══════════════════════════════════════════════════════════════╗
║                    RECENT FAN REACTIONS                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  📈 +3  Walk-off win vs Rival Dodgers           (78 → 81)    ║
║  📈 +2  5-game winning streak!                   (76 → 78)    ║
║  📈 +1  Win vs Padres                            (75 → 76)    ║
║  📈 +1  Win vs Padres                            (74 → 75)    ║
║  📉 -2  Expected Wins down after trade           (76 → 74)    ║
║  📈 +4  "Trade paying off early!" (post-trade W) (72 → 76)    ║
║  📉 -5  Salary dump trade completed              (77 → 72)    ║
║  📈 +1  Win vs Giants                            (76 → 77)    ║
║                                                                ║
║  [View Full History]                                           ║
╚═══════════════════════════════════════════════════════════════╝
```

### 8.4 Morale State Indicators

```typescript
const MoraleStateConfig = {
  EUPHORIC: {
    range: [90, 99],
    emoji: '🤩',
    color: '#00FF00',
    label: 'Championship Fever',
    description: 'Fans are ALL IN. Merchandise flying off shelves.'
  },
  EXCITED: {
    range: [75, 89],
    emoji: '😊',
    color: '#7FFF00',
    label: 'Playoff Buzz',
    description: 'Strong engagement. Fans showing up and loud.'
  },
  CONTENT: {
    range: [55, 74],
    emoji: '🙂',
    color: '#FFFF00',
    label: 'Satisfied',
    description: 'Fans are engaged but not emotionally invested.'
  },
  RESTLESS: {
    range: [40, 54],
    emoji: '😐',
    color: '#FFA500',
    label: 'Growing Impatient',
    description: 'Attendance dipping. Murmurs about management.'
  },
  FRUSTRATED: {
    range: [25, 39],
    emoji: '😤',
    color: '#FF4500',
    label: 'Frustrated',
    description: 'Boos heard. Trade demands. Media criticism.'
  },
  APATHETIC: {
    range: [10, 24],
    emoji: '😑',
    color: '#FF0000',
    label: 'Checked Out',
    description: 'Empty seats. Fans stopped caring.'
  },
  HOSTILE: {
    range: [0, 9],
    emoji: '😡',
    color: '#8B0000',
    label: 'Hostile',
    description: 'Protests. Ownership under fire.'
  }
};
```

---

## 9. Consequences of Morale

> **Note**: Contraction has been REMOVED from v1 (see OFFSEASON_SYSTEM_SPEC.md). Low morale no longer triggers contraction risk. Instead, morale consequences focus on player morale, free agency attractiveness, and narrative tone.

### 9.1 Franchise Health Warning

Very low morale triggers warning indicators but no mechanical contraction:

```typescript
function getFranchiseHealthWarning(team: Team): FranchiseWarning | null {
  if (team.fanMorale.current >= 25) return null;
  
  return {
    level: team.fanMorale.current < 10 ? 'CRITICAL' : 'WARNING',
    message: team.fanMorale.current < 10 
      ? 'Franchise in crisis — fans demanding change'
      : 'Fan patience wearing thin',
    effects: [
      'Free agent destination penalty (see 9.3)',
      'Player morale drag (see 9.2)',
      'Beat reporter negative coverage increase'
    ]
  };
}
```

### 9.2 Player Morale Influence

Team fan morale affects player morale:

```typescript
function applyFanMoraleToPlayers(team: Team): void {
  const fanMorale = team.fanMorale.current;

  for (const player of team.roster) {
    let adjustment = 0;

    // Players feel the fan energy
    if (fanMorale >= 80) {
      adjustment = 3;  // Energizing
    } else if (fanMorale >= 60) {
      adjustment = 1;
    } else if (fanMorale <= 30) {
      adjustment = -3;  // Draining
    } else if (fanMorale <= 45) {
      adjustment = -1;
    }

    // Personality modifiers
    if (player.personality === 'EGOTISTICAL') {
      adjustment *= 1.5;  // Feeds on crowd energy
    }
    if (player.personality === 'RELAXED') {
      adjustment *= 0.5;  // Less affected by external
    }

    player.morale = clamp(player.morale + adjustment, 0, 99);
  }
}
```

### 9.3 Free Agency Attractiveness

```typescript
function calculateFAAttractiveness(team: Team): number {
  // Fan morale is a factor in FA destination weights
  const moraleBonus = (team.fanMorale.current - 50) * 0.5;

  // Players want to play for passionate fanbases
  // But not hostile ones
  if (team.fanMorale.state === 'EUPHORIC') {
    return moraleBonus + 5;  // Exciting destination
  }
  if (team.fanMorale.state === 'HOSTILE') {
    return moraleBonus - 10;  // Toxic environment
  }

  return moraleBonus;
}
```

---

## 10. Data Models

### 10.1 Core Types

```typescript
interface TeamFanMorale {
  teamId: string;
  current: number;
  previous: number;
  trend: 'RISING' | 'STABLE' | 'FALLING';
  trendStreak: number;
  state: FanState;
  baseline: number;
  lastUpdated: GameDate;

  // History
  eventHistory: MoraleEvent[];
  dailySnapshots: DailyMoraleSnapshot[];

  // Active tracking
  activeTradeAftermaths: TradeAftermath[];
  activeProspectSpotlights: ProspectSpotlight[];

  // Computed
  seasonHigh: number;
  seasonLow: number;
  averageMorale: number;
}

interface DailyMoraleSnapshot {
  date: GameDate;
  morale: number;
  events: string[];  // Event IDs that occurred
  expectedWins: number;
  actualWins: number;
}

interface MoraleEvent {
  id: string;
  type: MoraleEventType;
  timestamp: GameDate;
  baseImpact: number;
  modifiers: MoraleModifier[];
  finalImpact: number;
  previousMorale: number;
  newMorale: number;
  narrative: string;
  relatedEntities: {
    playerId?: string;
    tradeId?: string;
    gameId?: string;
  };
}

type MoraleEventType =
  // Game events
  | 'WIN' | 'LOSS' | 'WALK_OFF_WIN' | 'WALK_OFF_LOSS'
  | 'NO_HITTER' | 'GOT_NO_HIT' | 'SHUTOUT_WIN' | 'SHUTOUT_LOSS'
  // Streak events
  | 'WIN_STREAK_3' | 'WIN_STREAK_5' | 'WIN_STREAK_7'
  | 'LOSE_STREAK_3' | 'LOSE_STREAK_5' | 'LOSE_STREAK_7'
  | 'WIN_STREAK_BROKEN' | 'LOSE_STREAK_BROKEN'
  // Trade events
  | 'TRADE_ACQUIRE_STAR' | 'TRADE_LOSE_STAR'
  | 'TRADE_SALARY_DUMP' | 'TRADE_DEPTH'
  // Roster events
  | 'CALL_UP_TOP_PROSPECT' | 'CALL_UP_REGULAR'
  | 'STAR_TO_IL' | 'STAR_RETURNS' | 'PLAYER_DFA'
  // Milestone events
  | 'PLAYER_MILESTONE' | 'WEEKLY_AWARD' | 'ALL_STAR_SELECTION'
  | 'LEAD_DIVISION' | 'CLINCH_PLAYOFF' | 'CLINCH_DIVISION' | 'ELIMINATED'
  // Season events
  | 'OPENING_DAY' | 'ALL_STAR_BREAK' | 'RIVALRY_SWEEP' | 'SWEPT_BY_RIVAL'
  // System events
  | 'EXPECTED_WINS_UPDATE' | 'NATURAL_DRIFT' | 'SEASON_ASSESSMENT';
```

### 10.2 Configuration

```typescript
const FanMoraleConfig = {
  // Base impacts
  gameWin: 1,
  gameLoss: -1,
  walkOffMultiplier: 3,
  rivalMultiplier: 1.5,
  blowoutThreshold: 7,  // Run differential for blowout

  // Streak thresholds
  streakLevels: [3, 5, 7],
  streakImpacts: [2, 5, 8],

  // Trade impacts
  starTradeImpact: 8,
  salaryDumpImpact: -8,
  tradeScrutinyGames: 14,

  // Drift settings
  driftFrequency: 3,  // Every N games
  driftAmount: 1,
  baselineRange: 5,   // How far from baseline before drift kicks in

  // Momentum settings
  maxMomentumBonus: 0.5,  // 50% max amplification
  momentumPerStreak: 0.1,  // 10% per consecutive change

  // State thresholds
  states: {
    EUPHORIC: 90,
    EXCITED: 75,
    CONTENT: 55,
    RESTLESS: 40,
    FRUSTRATED: 25,
    APATHETIC: 10,
    HOSTILE: 0
  }
};
```

---

## 11. Summary

### What Makes This System Work

1. **Constant Updates**: Something affects morale almost every game
2. **Contextual Reactions**: Same event can have different impact based on situation
3. **Interconnected Systems**: Trades → Expected Wins → Performance → Morale → Contraction
4. **Narrative Generation**: Every change has a story ("Fans questioning FO after salary dump")
5. **Visible Consequences**: Morale affects player happiness, FA attractiveness, contraction risk

### Key Scenarios Handled

✅ Winning streak → rising morale
✅ Trade salary dump → suspicious fans
✅ Post-trade winning → "trade paying off!"
✅ Post-trade losing → "knew it was bad"
✅ Call-up → hope + spotlight tracking
✅ Exceeding expectations → amplified positives
✅ Underperforming → amplified negatives
✅ September playoff race → everything matters more
✅ Eliminated team → fans check out

### Integration Complete With

- ✅ Trade System (TRADE_SYSTEM_SPEC.md)
- ✅ Offseason System (OFFSEASON_SYSTEM_SPEC.md)
- ✅ Expected Wins calculations
- ✅ Contraction risk
- ✅ Player morale system
- ✅ FA destination weighting
