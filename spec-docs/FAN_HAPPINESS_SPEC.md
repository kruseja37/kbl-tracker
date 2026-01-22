# Fan Happiness System Specification

> **Purpose**: Define the complete Fan Happiness system including player Fame tracking and team-level happiness calculation
> **Related Specs**:
> - `SPECIAL_EVENTS_SPEC.md` - Fame Bonus/Boner event definitions
> - `fame_and_events_system.md` - Fame in awards/voting
> - `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` §22 - Team Fan Happiness UI
> - `LEVERAGE_INDEX_SPEC.md` - LI-weighted clutch (separate from Fame)
> **SMB4 Reference**: `SMB4_GAME_MECHANICS.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Player Fame System](#2-player-fame-system)
3. [Fame Event Categories](#3-fame-event-categories)
4. [Auto-Detection Rules](#4-auto-detection-rules)
5. [Manual Fame Recording](#5-manual-fame-recording)
6. [In-Game Fame Display](#6-in-game-fame-display)
7. [Team Fan Happiness](#7-team-fan-happiness)
8. [Fan Happiness Effects](#8-fan-happiness-effects)
9. [Data Schema](#9-data-schema)
10. [UI Components](#10-ui-components)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. Overview

### 1.1 Two-Layer System

The Fan Happiness system operates at two levels:

| Layer | Scope | Updates | Purpose |
|-------|-------|---------|---------|
| **Player Fame** | Per-player | During games | Track memorable moments, narrative standing |
| **Team Fan Happiness** | Per-team | After games/season events | Fan satisfaction, affects FA/contraction |

### 1.2 Key Principles

1. **Fame is NARRATIVE only** - It does NOT affect WAR/mWAR calculations
2. **No double-counting** - Clutch plays are weighted via LI in mWAR; Fame is separate
3. **Fame affects subjective awards** - All-Star (6.67%), MVP/Cy Young (5%)
4. **Team Happiness aggregates Fame** - Plus performance vs expectations
5. **Fun over formality** - Celebrate highs, laugh at lows

### 1.3 Net Fame Calculation

```typescript
Net Fame = Σ(Fame Bonuses) - Σ(Fame Boners)
```

Each Fame Bonus is typically +1 (some events give more), each Fame Boner is typically -1.

---

## 2. Player Fame System

### 2.1 Fame Types

| Type | Symbol | Value | Description |
|------|--------|-------|-------------|
| **Fame Bonus** | ⭐ | +1 to +5 | Positive narrative moment - awesome plays, clutch performances |
| **Fame Boner** | 💀 | -1 to -2 | Embarrassing moment - failures, mental errors, choking |

### 2.2 Fame Per Game

Each player's game-level Fame is tracked:

```typescript
interface PlayerGameFame {
  playerId: string;
  playerName: string;
  bonuses: FameEvent[];    // All positive events this game
  boners: FameEvent[];     // All negative events this game
  netFame: number;         // Sum of all events
}
```

### 2.3 Fame in Awards (from fame_and_events_system.md)

| Award | Fame Weight | Notes |
|-------|-------------|-------|
| All-Star Voting | 6.67% | Within Traditional/Milestone/Narrative bucket |
| MVP | 5% | Narrative component |
| Cy Young | 5% | Narrative component |
| Gold Glove | 0% | Uses fWAR + LI-weighted clutch, NOT Fame |

---

## 3. Fame Event Categories

### 3.1 Fame Bonus Events (Positive)

#### Walk-Off Events

| Event | Fame | Auto-Detect? | Recipient | Target |
|-------|------|--------------|-----------|--------|
| Walk-Off Hit | +1 | ✅ Yes | Batter | player |
| Walk-Off HR | +1.5 | ✅ Yes | Batter | player |
| Walk-Off Grand Slam | +3 | ✅ Yes | Batter | player |

#### Defensive Highlights

| Event | Fame | Auto-Detect? | Recipient | Target |
|-------|------|--------------|-----------|--------|
| Web Gem (diving/wall catch) | +0.75 | ❌ Manual | Fielder | fielder |
| Robbery (HR-saving catch) | +1.5 | ❌ Manual | Fielder | fielder |
| Robbery (Grand Slam saved) | +2.5 | ❌ Manual | Fielder | fielder |
| Inside-the-Park HR | +1.5 | ❌ Manual | Batter | player |
| Triple Play | +2 | ❌ Manual | Defense | team |
| Unassisted Triple Play | +3 | ❌ Manual | Fielder | fielder |
| Throw Out at Home (OF assist) | +1 | ❌ Manual | Fielder | fielder |

#### Home Run Events

| Event | Fame | Auto-Detect? | Recipient | Target |
|-------|------|--------------|-----------|--------|
| Leadoff HR (first batter of game) | +1 | ✅ Yes | Batter | player |
| Pinch Hit HR | +1 | ✅ Yes | Batter | player |
| Go-Ahead HR | +1 | ✅ Yes | Batter | player |
| Grand Slam | +1.5 | ✅ Yes | Batter | player |
| Clutch Grand Slam | +2 | ⚠️ Semi | Batter | player |
| Back-to-Back HRs | +0.5 | ✅ Yes | Each batter | player |
| Back-to-Back-to-Back HRs | +1 | ✅ Yes | Third batter | player |

#### Multi-Hit Achievements

| Event | Fame | Auto-Detect? | Recipient | Target |
|-------|------|--------------|-----------|--------|
| Cycle | +3 | ✅ Yes | Batter | player |
| Natural Cycle (1B→2B→3B→HR order) | +4 | ✅ Yes | Batter | player |
| 5-Hit Game | +1 | ✅ Yes | Batter | player |
| Multi-HR (2 HR) | +1 | ✅ Yes | Batter | player |
| Multi-HR (3 HR) | +2.5 | ✅ Yes | Batter | player |
| Multi-HR (4+ HR) | +5 | ✅ Yes | Batter | player |
| First Career HR/Hit | +0.5 | ❌ Manual | Batter | player |
| Career Milestone | +1 | ❌ Manual | Player | player |

#### Pitching Achievements

| Event | Fame | Auto-Detect? | Recipient | Target |
|-------|------|--------------|-----------|--------|
| No-Hitter | +3 | ✅ Yes | Pitcher | pitcher |
| Perfect Game | +5 | ✅ Yes | Pitcher | pitcher |
| Maddux (CGSO < threshold) | +3 | ⚠️ Semi | Pitcher | pitcher |
| Strike Out the Side (3K in inning) | +0.5 | ✅ Yes | Pitcher | pitcher |
| Immaculate Inning (9 pitch, 3K) | +2 | ⚠️ Semi | Pitcher | pitcher |
| 9-Pitch Inning (non-immaculate) | +1 | ⚠️ Semi | Pitcher | pitcher |
| 10K Game | +1 | ✅ Yes | Pitcher | pitcher |
| 15K Game | +2 | ✅ Yes | Pitcher | pitcher |
| Escape Artist (bases loaded, 0 runs) | +1 | ❌ Manual | Pitcher | pitcher |
| Shutdown Inning (escaped jam) | +1 | ❌ Manual | Pitcher | pitcher |

#### Intimidation/Dominance

| Event | Fame | Auto-Detect? | Recipient |
|-------|------|--------------|-----------|
| Nut Shot (delivered) | +1 | ❌ Manual | Batter (always) |
| Nut Shot (made play anyway) | +1 | ❌ Manual | Fielder (replaces boner) |
| Killed Pitcher | +3 | ❌ Manual | Batter |
| Stayed in after being hit | +1 | ❌ Manual | Pitcher |

#### Position Player Pitching

| Event | Fame | Auto-Detect? | Recipient |
|-------|------|--------------|-----------|
| Clean inning | +1 | ❌ Manual | Position player |
| Multiple clean innings | +2 | ❌ Manual | Position player |
| Got a strikeout | +1 | ❌ Manual | Position player |

#### Team/Game Events

| Event | Fame | Auto-Detect? | Recipient | Target |
|-------|------|--------------|-----------|--------|
| Comeback Win (3+ run deficit) | +1 | ✅ Yes | Team | team |
| Comeback Win (5+ run deficit) | +2 | ✅ Yes | Team | team |
| Comeback Win (7+ run deficit) | +3 | ✅ Yes | Team | team |
| Comeback Hero | +1 | ⚠️ Semi | Key contributors | player |
| Rally Starter (led to lead) | +1 | ⚠️ Semi | Batter | player |

### 3.2 Fame Boner Events (Negative)

#### Strikeout Shame

| Event | Fame | Auto-Detect? | Recipient | Target |
|-------|------|--------------|-----------|--------|
| Hat Trick (3 K) | -0.5 | ✅ Yes | Batter | player |
| Golden Sombrero (4 K) | -1 | ✅ Yes | Batter | player |
| Platinum Sombrero (5 K) | -2 | ✅ Yes | Batter | player |
| Titanium Sombrero (6 K) | -3 | ✅ Yes | Batter | player |
| IBB Strikeout (swing at pitchout) | -2 | ❌ Manual | Batter | player |
| Meatball Whiff (K on center pitch in clutch) | -1 | ❌ Manual | Batter | player |

#### Batting Failures

| Event | Fame | Auto-Detect? | Recipient | Target |
|-------|------|--------------|-----------|--------|
| LOB King (5+ LOB in game) | -1 | ✅ Yes | Batter | player |
| Multiple GIDP (2+ in game) | -1 | ✅ Yes | Batter | player |
| Hit Into Triple Play | -1 | ⚠️ Semi | Batter | player |
| Bases Loaded K or DP (0 RBI) | -1 | ⚠️ Semi | Batter | player |

#### Pitching Failures

| Event | Fame | Auto-Detect? | Recipient | Target |
|-------|------|--------------|-----------|--------|
| Meltdown (6+ runs allowed) | -1 | ✅ Yes | Pitcher | pitcher |
| Meltdown (10+ runs allowed) | -2 | ✅ Yes | Pitcher | pitcher |
| First Inning Disaster (5+ runs in 1st) | -2 | ✅ Yes | Pitcher | pitcher |
| Walked in Run (bases loaded BB) | -1 | ❌ Manual | Pitcher | pitcher |
| Back-to-back-to-back HRs allowed | -1 | ✅ Yes | Pitcher | pitcher |
| Blown Save | -1 | ⚠️ Semi | Pitcher | pitcher |
| Blown Save + Loss | -2 | ⚠️ Semi | Pitcher | pitcher |
| Blown Lead (3+ run lead lost) | -1 | ✅ Yes | Pitcher | pitcher |
| Blown Lead (5+ run lead lost) | -2 | ✅ Yes | Pitcher | pitcher |
| Position Player Pitching (3+ runs) | -1 | ❌ Manual | Position player | player |

#### Fielding Failures

| Event | Fame | Auto-Detect? | Recipient |
|-------|------|--------------|-----------|
| Nut Shot (didn't make play) | -1 | ❌ Manual | Fielder |
| Dropped Routine Fly Ball | -1 | ❌ Manual | Fielder |
| Dropped Fly in Clutch + Runs | -2 | ❌ Manual | Fielder |
| Booted Easy Grounder | -1 | ❌ Manual | Fielder |
| Throwing to Wrong Base | -1 | ❌ Manual | Fielder |
| Passed Ball Allowing Run | -1 | ⚠️ Semi | Catcher |
| Passed Ball Allowing Winning Run | -2 | ⚠️ Semi | Catcher |

#### Baserunning Failures

| Event | Fame | Auto-Detect? | Recipient |
|-------|------|--------------|-----------|
| TOOTBLAN | -1 | ❌ Manual | Runner |
| TOOTBLAN (rally killer) | -2 | ❌ Manual | Runner |
| Picked Off to End Game | -2 | ⚠️ Semi | Runner |
| Picked Off to End Inning | -1 | ⚠️ Semi | Runner |
| Batter Out Stretching (thrown out at 3B) | -1 | ✅ Yes | Batter |

---

## 4. Auto-Detection Rules

### 4.1 Detection Timing

| When | What to Check |
|------|---------------|
| After each at-bat | Walk-off, cycle progress, multi-HR, strikeout count, runs allowed |
| After each inning | Pitcher stats (hits, runs, pitch count), 9-pitch innings |
| End of game | No-hitter, perfect game, Maddux, comeback win, final sombrero counts |
| After runner out | Picked off situations, TOOTBLAN candidates |

### 4.2 Auto-Detection Logic

```typescript
interface AutoDetectionConfig {
  enabled: boolean;                    // Master toggle
  showToasts: boolean;                 // Show toast notifications
  requireConfirmation: boolean;        // Require user to confirm auto-detected events
}

// Default: auto-detect ON, toasts ON, confirmation OFF
const DEFAULT_AUTO_DETECTION: AutoDetectionConfig = {
  enabled: true,
  showToasts: true,
  requireConfirmation: false
};
```

### 4.3 Auto-Detectable Events

**Fully Automatic** (✅):

```typescript
const FULLY_AUTO_EVENTS = {
  // Batting
  WALK_OFF: (game, play) =>
    game.isBottomInning &&
    game.inning >= game.scheduledInnings &&
    play.causedWin,

  CYCLE: (player) =>
    hasAllHitTypes(player, ['1B', '2B', '3B', 'HR']),

  MULTI_HR: (player) =>
    player.gameHR >= 2,

  BACK_TO_BACK_HR: (plays) =>
    plays.lastTwo.every(p => p.result === 'HR'),

  GOLDEN_SOMBRERO: (player) =>
    player.gameStrikeouts >= 4,

  // Pitching
  NO_HITTER: (pitcher, game) =>
    pitcher.hitsAllowed === 0 &&
    game.isComplete &&
    pitcher.startedGame,

  PERFECT_GAME: (pitcher, game) =>
    pitcher.hitsAllowed === 0 &&
    pitcher.walksAllowed === 0 &&
    pitcher.hitBatters === 0 &&
    game.errors === 0 &&
    game.isComplete &&
    pitcher.startedGame,

  B2B2B_HR_ALLOWED: (pitcher) =>
    pitcher.consecutiveHRsAllowed >= 3,

  MELTDOWN: (pitcher) =>
    pitcher.gameRunsAllowed >= 6,

  // Baserunning
  BATTER_OUT_STRETCHING: (play) =>
    play.result === '2B' && play.batterOutAt === '3B'
};
```

**Semi-Automatic** (⚠️) - Detected but may need context:

```typescript
const SEMI_AUTO_EVENTS = {
  MADDUX: (pitcher, game) => {
    // Need to verify CGSO + pitch count < threshold
    if (!pitcher.startedGame || pitcher.runsAllowed > 0) return false;
    const threshold = Math.ceil(game.innings * 9.44);
    return pitcher.pitchCount < threshold && game.isComplete;
  },

  IMMACULATE_INNING: (inningData) => {
    // 9 pitches, 3 outs, 3 K
    return inningData.pitches === 9 &&
           inningData.outs === 3 &&
           inningData.strikeouts === 3;
  },

  BLOWN_SAVE: (pitcher) => {
    // Entered in save situation, gave up tying/lead run
    return pitcher.enteredInSaveSituation &&
           pitcher.blowSaveScored;
  },

  CLUTCH_GRAND_SLAM: (play, game) => {
    return play.result === 'HR' &&
           play.rbi === 4 &&
           (play.tiedGame || play.tookLead);
  },

  COMEBACK_WIN: (game) => {
    return game.won && game.maxDeficitOvercome >= 4;
  }
};
```

### 4.4 Toast Notification System

```typescript
interface FameToast {
  type: 'bonus' | 'boner';
  event: FameEventType;
  player: string;
  value: number;
  message: string;
  autoHide: number;  // ms, 0 = manual dismiss
}

const TOAST_MESSAGES = {
  WALK_OFF: (p) => `🎉 WALK OFF! ${p.name} wins it! (+1 Fame)`,
  CYCLE: (p) => `🔥 CYCLE! ${p.name} has done it all! (+3 Fame)`,
  NO_HITTER: (p) => `⚾ NO-HITTER! ${p.name} makes history! (+3 Fame)`,
  PERFECT_GAME: (p) => `🏆 PERFECT GAME! ${p.name} is perfect! (+5 Fame)`,
  GOLDEN_SOMBRERO: (p) => `😬 Golden Sombrero for ${p.name} (4 K) (-1 Fame)`,
  MELTDOWN: (p) => `💥 Meltdown! ${p.name} gives up 6+ runs (-1 Fame)`,
  // ... etc
};
```

---

## 5. Manual Fame Recording

### 5.1 Quick Access Buttons

During game, show quick access for common manual events:

```
┌─────────────────────────────────────────────────────────────────┐
│  SPECIAL EVENTS                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [🥜 Nut Shot]  [💥 Killed Pitcher]  [🤦 TOOTBLAN]              │
│  [⭐ Web Gem]   [🎭 Robbery]         [📝 Other...]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Fame Event Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  ADD FAME EVENT                                           [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Event Type:                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  FAME BONUSES (+)                                         │  │
│  │  [Walk-Off +1]  [Web Gem +0.75]  [Robbery +1.5]           │  │
│  │  [Inside Park HR +1.5]  [Cycle +3]  [Shutdown +1]         │  │
│  │  [Nut Shot Delivered +1]  [Killed Pitcher +3]             │  │
│  │  [Stayed In After Hit +1]  [Career Milestone +1]          │  │
│  │  [Position Player Clean Inning +1]                        │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  FAME BONERS (-)                                          │  │
│  │  [TOOTBLAN -1]  [TOOTBLAN Rally Killer -2]                │  │
│  │  [Nut Shot Victim -1]  [Dropped Fly -1]                   │  │
│  │  [Wrong Base Throw -1]  [Meatball Whiff -1]               │  │
│  │  [IBB Strikeout -2]  [Booted Grounder -1]                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Player: [Dropdown - Current Players ▼]                         │
│                                                                 │
│  Notes (optional): [________________________________]           │
│                                                                 │
│           [Cancel]                    [Add Fame Event]          │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Context-Specific Modals

Certain events have specialized modals (see SPECIAL_EVENTS_SPEC.md):

- **Nut Shot Modal**: Victim, batter, made play anyway?, severity
- **TOOTBLAN Modal**: Runner, type (picked off, wrong base, etc.)
- **Killed Pitcher Modal**: Hit location, pitcher removed?, play result

---

## 6. In-Game Fame Display

### 6.1 Fame Summary Panel

Show during game in collapsible panel:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⭐ GAME FAME                                              [−]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AWAY TEAM: Giants                           Net: +3            │
│  ├─ W. Mays: +2 (2-HR game, Walk-off)                          │
│  ├─ J. Marichal: +1 (Shutdown inning)                          │
│  └─ O. Cepeda: -1 (TOOTBLAN)                                   │
│                                                                 │
│  HOME TEAM: Dodgers                          Net: -2            │
│  ├─ S. Koufax: -1 (Meltdown - 6 runs)                          │
│  └─ M. Davis: -1 (Golden Sombrero)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Player Card Fame Indicator

In lineup displays, show Fame badge:

```
Willie Mays LF          ⭐+2
.325 / 2 HR / 4 RBI
```

### 6.3 Activity Log Integration

Fame events appear in activity log:

```
T3: Willie Mays: Home run (2-run) to RC. ⭐ 2-HR Game! (+1 Fame)
T5: Orlando Cepeda: TOOTBLAN - picked off 2nd 💀 (-1 Fame)
T9: Willie Mays: Walk-off single! ⭐ (+1 Fame)
```

---

## 7. Team Fan Happiness

### 7.1 Calculation Formula

```typescript
function calculateTeamFanHappiness(team: Team, season: Season): number {
  const baseHappiness = 50;

  // 1. Performance vs Expectations (max ±30)
  const expectedWinPct = calculateExpectedWinPct(team.salary);
  const actualWinPct = team.wins / team.gamesPlayed;
  const performanceDelta = (actualWinPct - expectedWinPct) * 100;

  // High payroll teams get punished more for underperforming
  const payrollMultiplier = getPayrollMultiplier(team.salaryPercentile);
  const performanceImpact = clamp(performanceDelta * payrollMultiplier, -30, 30);

  // 2. Aggregate Player Fame (max ±20)
  const teamNetFame = team.players.reduce((sum, p) => sum + p.seasonNetFame, 0);
  const fameImpact = clamp(teamNetFame * 0.5, -20, 20);  // 0.5 per net Fame point

  // 3. Awards (max +40)
  const awardImpact = calculateAwardImpact(team, season);

  // 4. Milestones (max ±20)
  const milestoneImpact = calculateMilestoneImpact(team, season);

  // 5. Roster Moves (max ±15)
  const rosterImpact = calculateRosterMoveImpact(team, season);

  // 6. Playoff Success (max +25)
  const playoffImpact = calculatePlayoffImpact(team, season);

  return clamp(
    baseHappiness +
    performanceImpact +
    fameImpact +
    awardImpact +
    milestoneImpact +
    rosterImpact +
    playoffImpact,
    0,
    100
  );
}
```

### 7.2 Payroll Expectation Multiplier

```typescript
function getPayrollMultiplier(salaryPercentile: number): number {
  // Top 25% payroll = higher expectations, bigger swings
  // Bottom 25% = lower expectations, bonus for overperforming

  if (salaryPercentile >= 75) return 1.5;  // Top 25%
  if (salaryPercentile >= 50) return 1.25; // Upper middle
  if (salaryPercentile >= 25) return 1.0;  // Lower middle
  return 0.75;                              // Bottom 25%
}
```

### 7.3 Award Impact Table

| Award | Impact | Notes |
|-------|--------|-------|
| World Series Champion | +25 | Maximum single event |
| League Champion | +15 | Lost World Series |
| Division Winner | +8 | |
| Wild Card | +4 | |
| MVP | +10 | Per winner on team |
| Cy Young | +8 | Per winner on team |
| Rookie of the Year | +6 | |
| Gold Glove | +4 | Per winner on team |
| Silver Slugger | +4 | Per winner on team |
| All-Star Selection | +2 | Per selection |
| All-Star MVP | +4 | |
| Manager of the Year | +5 | |

### 7.4 Negative Events

| Event | Impact | Notes |
|-------|--------|-------|
| Lost popular player (trade) | -4 to -12 | Based on player Fame/WAR |
| Losing streak (10+ games) | -6 | |
| Losing streak (15+ games) | -10 | |
| 100+ losses | -15 | Scaled by season length |
| Bust of the Year | -5 | |
| High-paid underperformer | -5 to -15 | Based on salary vs performance |

### 7.5 Fan Happiness Thresholds

| Range | Status | Effect |
|-------|--------|--------|
| 70-100 | 😊 Happy | +10% FA attraction bonus |
| 40-69 | 😐 Content | Neutral |
| 30-39 | 😟 Unhappy | -10% FA attraction penalty |
| 0-29 | 😞 Dismal | Contraction risk |

### 7.6 Contraction Risk

```typescript
function getContractionProbability(happiness: number, consecutiveSeasonsBelow30: number): number {
  if (happiness >= 30) return 0;

  const baseProbability = {
    1: 0.10,   // 10% after 1 season below 30
    2: 0.30,   // 30% after 2 seasons
    3: 0.70,   // 70% after 3 seasons
    4: 0.95    // Near-certain after 4 seasons
  }[consecutiveSeasonsBelow30] || 0.95;

  // Further modified by how far below 30
  const severityMultiplier = happiness < 15 ? 1.5 : happiness < 20 ? 1.25 : 1.0;

  return Math.min(baseProbability * severityMultiplier, 0.99);
}
```

---

## 8. Fan Happiness Effects

### 8.1 Free Agency

```typescript
function calculateFAAttraction(team: Team, player: FreeAgent): number {
  let baseAttraction = calculateBaseAttraction(team, player);

  // Fan Happiness modifier
  if (team.fanHappiness >= 70) {
    baseAttraction *= 1.10;  // +10% for happy fans
  } else if (team.fanHappiness < 30) {
    baseAttraction *= 0.85;  // -15% for dismal
  } else if (team.fanHappiness < 40) {
    baseAttraction *= 0.90;  // -10% for unhappy
  }

  return baseAttraction;
}
```

### 8.2 Season Narrative

Fan Happiness generates narrative text for season summaries:

```typescript
function generateFanNarrative(team: Team): string {
  if (team.fanHappiness >= 85) {
    return `${team.name} fans are ecstatic! This has been a season to remember.`;
  } else if (team.fanHappiness >= 70) {
    return `${team.name} fans are happy with the team's performance.`;
  } else if (team.fanHappiness >= 50) {
    return `${team.name} fans have mixed feelings about the season.`;
  } else if (team.fanHappiness >= 30) {
    return `${team.name} fans are frustrated and demanding changes.`;
  } else {
    return `${team.name} fans have all but given up. Attendance is at rock bottom.`;
  }
}
```

---

## 9. Data Schema

### 9.1 Fame Event Record

```typescript
interface FameEvent {
  id: string;
  gameId: string;
  inning: number;
  halfInning: 'top' | 'bottom';
  timestamp: Date;

  // Event details
  eventType: FameEventType;
  fameValue: number;          // +/- value
  fameType: 'bonus' | 'boner';

  // Participants
  playerId: string;
  playerName: string;
  playerTeam: string;

  // Context
  autoDetected: boolean;      // Was this auto-detected?
  description?: string;       // User notes or auto-generated description
  relatedPlayId?: string;     // Link to the at-bat/play that triggered this

  // For events involving multiple players
  secondaryPlayerId?: string; // e.g., batter for nut shot victim
  secondaryPlayerName?: string;
}

type FameEventType =
  // Bonuses
  | 'WALK_OFF'
  | 'WEB_GEM'
  | 'ROBBERY'
  | 'ROBBERY_GRAND_SLAM'
  | 'INSIDE_PARK_HR'
  | 'CYCLE'
  | 'NATURAL_CYCLE'
  | 'MULTI_HR_2'
  | 'MULTI_HR_3'
  | 'MULTI_HR_4PLUS'
  | 'BACK_TO_BACK_HR'
  | 'CLUTCH_GRAND_SLAM'
  | 'NO_HITTER'
  | 'PERFECT_GAME'
  | 'MADDUX'
  | 'IMMACULATE_INNING'
  | 'NINE_PITCH_INNING'
  | 'SHUTDOWN_INNING'
  | 'UNASSISTED_TRIPLE_PLAY'
  | 'NUT_SHOT_DELIVERED'
  | 'NUT_SHOT_TOUGH_GUY'
  | 'KILLED_PITCHER'
  | 'STAYED_IN_AFTER_HIT'
  | 'PP_CLEAN_INNING'
  | 'PP_MULTIPLE_CLEAN'
  | 'PP_GOT_K'
  | 'COMEBACK_HERO'
  | 'RALLY_STARTER'
  | 'FIRST_CAREER'
  | 'CAREER_MILESTONE'
  // Boners
  | 'GOLDEN_SOMBRERO'
  | 'PLATINUM_SOMBRERO'
  | 'IBB_STRIKEOUT'
  | 'HIT_INTO_TRIPLE_PLAY'
  | 'MEATBALL_WHIFF'
  | 'BASES_LOADED_FAILURE'
  | 'MELTDOWN'
  | 'MELTDOWN_SEVERE'
  | 'B2B2B_HR_ALLOWED'
  | 'BLOWN_SAVE'
  | 'BLOWN_SAVE_LOSS'
  | 'NUT_SHOT_VICTIM'
  | 'DROPPED_FLY'
  | 'DROPPED_FLY_CLUTCH'
  | 'BOOTED_GROUNDER'
  | 'WRONG_BASE_THROW'
  | 'PASSED_BALL_RUN'
  | 'PASSED_BALL_WINNING_RUN'
  | 'TOOTBLAN'
  | 'TOOTBLAN_RALLY_KILLER'
  | 'PICKED_OFF_END_GAME'
  | 'PICKED_OFF_END_INNING'
  | 'BATTER_OUT_STRETCHING'
  | 'PP_GAVE_UP_RUNS'
  | 'RALLY_KILLER';
```

### 9.2 Game Fame Summary

```typescript
interface GameFameSummary {
  gameId: string;

  // By team
  awayTeam: {
    teamId: string;
    teamName: string;
    netFame: number;
    events: FameEvent[];
  };

  homeTeam: {
    teamId: string;
    teamName: string;
    netFame: number;
    events: FameEvent[];
  };

  // Highlights for end-of-game display
  topBonuses: FameEvent[];    // Top 3 positive events
  topBoners: FameEvent[];     // Top 3 negative events
}
```

### 9.3 Player Season Fame

```typescript
interface PlayerSeasonFame {
  playerId: string;
  seasonId: string;

  totalBonuses: number;       // Sum of all bonus values
  totalBoners: number;        // Sum of all boner values (absolute)
  netFame: number;            // totalBonuses - totalBoners

  eventCount: {
    [key in FameEventType]?: number;
  };

  events: FameEvent[];        // All events this season
}
```

### 9.4 Team Fan Happiness

```typescript
interface TeamFanHappiness {
  teamId: string;
  seasonId: string;

  currentHappiness: number;   // 0-100
  previousSeasonHappiness: number;

  // Breakdown
  breakdown: {
    base: 50;
    performanceVsExpectation: number;
    aggregateFame: number;
    awards: number;
    milestones: number;
    rosterMoves: number;
    playoffs: number;
  };

  // History
  historyByGame: {
    gameNumber: number;
    happiness: number;
    event?: string;
  }[];

  // Contraction risk
  consecutiveSeasonsBelow30: number;
  contractionRisk: number;    // 0-1 probability
}
```

---

## 10. UI Components

### 10.1 Component Hierarchy

```
GameTracker/
├── FamePanel/                    # Collapsible game Fame summary
│   ├── TeamFameSection           # Per-team Fame display
│   └── FameEventList             # List of events
├── FameEventModal/               # Add manual Fame event
│   ├── EventTypeSelector         # Choose event type
│   ├── PlayerSelector            # Choose player
│   └── EventDetails              # Event-specific fields
├── FameToast/                    # Auto-detection notifications
├── SpecialEventModals/           # Existing modals from SPECIAL_EVENTS_SPEC
│   ├── NutShotModal
│   ├── TootblanModal
│   └── KilledPitcherModal
└── EndGameFameSummary/           # End-of-game Fame recap
```

### 10.2 Settings Panel Addition

```
┌─────────────────────────────────────────────────────────────────┐
│  GAME SETTINGS                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Fame Auto-Detection:                                           │
│  [✓] Enable auto-detection of Fame events                       │
│  [✓] Show toast notifications for Fame events                   │
│  [ ] Require confirmation for auto-detected events              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Implementation Phases

### Phase 1: In-Game Fame Tracking (Current Priority)

**Status: 🔜 Ready to Implement**

| Component | Description | Priority |
|-----------|-------------|----------|
| `FameEvent` types | Add to game.ts | HIGH |
| `FameEventModal` | Manual event recording | HIGH |
| Auto-detection | Walk-off, cycle, multi-HR, etc. | HIGH |
| `FameToast` | Toast notifications | MEDIUM |
| `FamePanel` | Game Fame display | MEDIUM |
| Activity log integration | Fame in log entries | MEDIUM |

**Dependencies**: None (uses existing game state)

### Phase 2: End-of-Game Summary

**Status: 🔜 After Phase 1**

| Component | Description | Priority |
|-----------|-------------|----------|
| `EndGameFameSummary` | Recap modal | MEDIUM |
| Fame history export | Include in game data | MEDIUM |

**Dependencies**: Phase 1

### Phase 3: Season Fame Aggregation

**Status: ⏸️ Requires Data Persistence**

| Component | Description | Priority |
|-----------|-------------|----------|
| Player season Fame | Aggregate across games | MEDIUM |
| Season Fame dashboard | View/filter Fame events | LOW |

**Dependencies**: Data persistence system

### Phase 4: Team Fan Happiness

**Status: ⏸️ Requires Data Persistence + Season System**

| Component | Description | Priority |
|-----------|-------------|----------|
| Team happiness calculation | Full formula | LOW |
| Fan Happiness dashboard | Per master spec UI | LOW |
| FA attraction modifier | Integrate with FA system | LOW |
| Contraction system | Risk calculation | LOW |

**Dependencies**: Data persistence, season/multi-game tracking, roster management

---

## Appendix: Quick Reference

### Fame Value Summary

**Top Bonuses:**
- Perfect Game: +5
- Cycle (Natural): +4
- Multi-HR (4+): +5
- No-Hitter: +3
- Maddux: +3
- Killed Pitcher: +3
- Unassisted Triple Play: +3
- Cycle: +3

**Top Boners:**
- IBB Strikeout: -2
- Platinum Sombrero: -2
- TOOTBLAN Rally Killer: -2
- Blown Save + Loss: -2
- Picked Off End Game: -2
- Meltdown (10+ runs): -2
- Dropped Fly Clutch + Runs: -2
- Passed Ball Winning Run: -2

### Auto-Detection Checklist

| Event | Check After | Data Needed |
|-------|-------------|-------------|
| Walk-Off | Each play | isBottomInning, inning, gameWon |
| Cycle | Each hit | player hit types |
| Multi-HR | Each HR | player game HR count |
| Back-to-Back HR | Each HR | previous play result |
| Golden/Platinum Sombrero | Each K | player game K count |
| No-Hitter | End of game | pitcher hits allowed, game complete |
| Perfect Game | End of game | hits, walks, HBP, errors, complete |
| Maddux | End of game | CGSO, pitch count, innings |
| Meltdown | Pitcher exit | pitcher runs allowed |
| B2B2B HR Allowed | Each HR | pitcher consecutive HR count |
| Batter Out Stretching | Runner out | result = 2B, out at 3B |

---

*Last Updated: January 22, 2026*
*Version: 1.0 - Initial comprehensive spec*
