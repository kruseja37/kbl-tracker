# Mojo & Fitness System Specification

> **Purpose**: Complete specification for SMB4 Mojo and Fitness tracking, effects on ratings, Fame integration, and recovery mechanics
> **Created**: January 23, 2026
> **Status**: Active
>
> **Related Specs**:
> - `SMB4_GAME_REFERENCE.md` - Core SMB4 game mechanics
> - `FAME_SYSTEM_TRACKING.md` - Fame bonus/boner integration
> - `SPECIAL_EVENTS_SPEC.md` - Events that affect Mojo
> - `GAME_SIMULATION_SPEC.md` - Simulation probability adjustments

---

## Table of Contents

1. [Overview](#1-overview)
2. [Mojo System](#2-mojo-system)
3. [Fitness System](#3-fitness-system)
4. [Fame Integration](#4-fame-integration)
5. [Performance Weighting](#5-performance-weighting)
6. [In-Game Tracking](#6-in-game-tracking)
7. [Between-Game Management](#7-between-game-management)
8. [Simulation Integration](#8-simulation-integration)
9. [UI Components](#9-ui-components)
10. [Data Schema](#10-data-schema)

---

## 1. Overview

### What Are Mojo and Fitness?

SMB4 has two "meta-stats" that affect player performance beyond their base ratings:

| System | Description | Range | Persistence |
|--------|-------------|-------|-------------|
| **Mojo** | In-game confidence/momentum | 5 levels (-2 to +2) | Resets each game (with carryover) |
| **Fitness** | Physical condition/fatigue | 6 categorical states | Persists across games |

### Design Philosophy

1. **Track, don't simulate** - We record the user-reported Mojo/Fitness states from the game
2. **Contextual value** - Achievements while disadvantaged are worth MORE
3. **Narrative hooks** - Mojo swings and Fitness states create story opportunities
4. **Fair adjustments** - Juiced players get scrutiny (like PEDs in real baseball)

---

## 2. Mojo System

### 2.1 Mojo Levels

**Mojo uses a 5-level scale from -2 to +2:**

| Level | Internal Value | Enum Name | In-Game Effect | Visual Indicator |
|-------|----------------|-----------|----------------|------------------|
| **Jacked** | +2 | VERY_HIGH | Huge stat boosts (~+15-20%) | 🔥🔥🔥 |
| **Locked In** | +1 | HIGH | Good boosts (~+8-10%) | 🔥🔥 |
| **Normal** | 0 | NEUTRAL | Baseline performance | ➖ |
| **Tense** | -1 | LOW | Decreased stats (~-8-10%) | 😰 |
| **Rattled** | -2 | VERY_LOW | Significant penalties (~-15-20%), hard to escape | 😱 |

> **Important Terminology**: "Locked In" is the display/narrative name for the +1 Mojo state (HIGH). Some documentation may also refer to this state as "On Fire" - they are the same level. The system uses 5 levels total, not 6.

> **Note**: Rattled is the worst Mojo state in SMB4. Once a player gets Rattled, it's very difficult to climb back out - they need multiple positive events to recover.

### 2.2 Mojo Triggers (SMB4 Behavior)

**Positive (Mojo Up)**:
| Event | Typical Mojo Change | Notes |
|-------|---------------------|-------|
| Getting a hit | +0.5 to +1 | Extra-base hits give more |
| Home run | +1 to +2 | Big boost |
| RBI | +0.5 | Stacks with hit boost |
| Stolen base | +0.5 | Success builds confidence |
| Making outs (pitcher) | +0.3 | Routine success |
| Strikeout (pitcher) | +0.5 to +1 | Dominance |
| Great defensive play | +0.5 | Diving catch, etc. |

**Negative (Mojo Down)**:
| Event | Typical Mojo Change | Notes |
|-------|---------------------|-------|
| Strikeout (batter) | -0.5 to -1 | Especially on bad pitches |
| Making outs (batter) | -0.3 | Routine failure |
| Committing error | -1 to -2 | Bigger if allows runs |
| Caught stealing | -1 | Embarrassing |
| Allowing walk (pitcher) | -0.5 | Loss of control |
| Allowing hit (pitcher) | -0.3 to -1 | Extra-base worse |
| Allowing run (pitcher) | -1 | Especially earned runs |
| Wild pitch | -0.5 | Mental error |

### 2.3 Mojo Amplification

Mojo effects are **amplified** in high-pressure situations:

| Situation | Amplification | Example |
|-----------|---------------|---------|
| Tie game, late innings | 1.5x | 8th/9th inning, tied |
| RISP, 2 outs | 1.3x | Classic pressure |
| Close game (1-2 runs) | 1.2x | Every AB matters |
| Playoff game | 1.5x | Maximum stakes |
| Bases loaded | 1.4x | High leverage |

### 2.4 Mojo Carryover

Between games, Mojo partially carries over:

```typescript
interface MojoCarryover {
  // End-of-game Mojo affects next game starting state
  carryoverRate: 0.3;  // 30% of excess Mojo carries

  // Example: Ended game at +2, next game starts at:
  // 0 + (2 * 0.3) = 0.6 → rounds to +1 (Locked In)

  // Example: Ended game at -2, next game starts at:
  // 0 + (-2 * 0.3) = -0.6 → rounds to -1 (Tense)
}

function calculateStartingMojo(endOfLastGame: number): number {
  const carryover = endOfLastGame * 0.3;
  return Math.round(carryover);  // Clamp to valid range
}
```

---

## 3. Fitness System

### 3.1 Fitness States

Categorical system representing physical condition:

| State | Internal Value | Effect Multiplier | Can Play? | Description |
|-------|----------------|-------------------|-----------|-------------|
| **Juiced** 💉 | 120% | 1.20x | ✅ | Peak condition, performance boost |
| **Fit** | 100% | 1.00x | ✅ | Normal, healthy |
| **Well** | 80% | 0.95x | ✅ | Minor fatigue, slight penalty |
| **Strained** | 60% | 0.85x | ⚠️ | Moderate fatigue, risky to play |
| **Weak** | 40% | 0.70x | ⚠️ | Significant issues, high injury risk |
| **Hurt** | 0% | N/A | ❌ | Injured, on IL |

> **IMPORTANT: Dual-Purpose Modifiers**
>
> The "Effect Multiplier" above is a **stat performance boost** used primarily in simulated games (and optionally for WAR context). It is **NOT** the Fame credit modifier.
>
> For Fame credit modifiers, see Section 4 (Fame Integration). Example:
> - Juiced: 1.20x stat boost BUT 0.50x Fame credit (achievements are scrutinized)
> - Strained: 0.85x stat boost BUT 1.15x Fame credit (playing through pain is admired)
>
> Both systems apply to all games (simulated and user-played), but stat boosts are most relevant for simulation while Fame credit applies to achievement recognition.

### 3.2 Fitness Decay

Fitness degrades based on activity:

```typescript
interface FitnessDecay {
  // Per-game decay for position players
  positionPlayer: {
    started: -3,      // Started the game
    pinchHit: -1,     // Pinch hit appearance
    defensiveReplacement: -1,
    didNotPlay: +2,   // Rest day recovery
  },

  // Per-game decay for pitchers
  pitcher: {
    starter: {
      base: -15,                  // Base decay for start
      perInning: -2,              // Additional per IP
      highPitchCount: -5,         // 100+ pitches bonus penalty
    },
    reliever: {
      base: -5,                   // Base decay for appearance
      perInning: -3,              // Higher per-inning cost
      backToBack: -3,             // Penalty for consecutive days
    },
    closer: {
      base: -8,                   // Higher stress role
      perInning: -2,
      backToBack: -5,             // Closers need rest
    },
    didNotPlay: +5,               // Rest day recovery
  },

  // Catcher-specific (they're special)
  catcher: {
    started: -5,      // Catchers wear down faster
    perInning: -0.5,  // Additional per inning caught
    didNotPlay: +3,   // Recover slightly faster (tough position)
  }
}
```

### 3.3 Fitness Recovery

```typescript
interface FitnessRecovery {
  // Daily recovery rates (when not playing)
  dailyRecovery: {
    positionPlayer: 5,     // +5% per rest day
    pitcher: 8,            // +8% per rest day
    catcher: 6,            // +6% per rest day
  },

  // Maximum recovery per day
  maxDailyRecovery: 15,

  // Trait modifiers
  traitModifiers: {
    'Durable': 1.5,        // 50% faster recovery
    'Injury Prone': 0.7,   // 30% slower recovery
  },

  // Days off streak bonus
  consecutiveRestBonus: {
    2: 1.1,   // 2 days off = 10% bonus
    3: 1.2,   // 3 days off = 20% bonus
    4: 1.25,  // 4+ days off = 25% bonus (max)
  }
}

function calculateRecovery(
  player: Player,
  daysOff: number,
  currentFitness: number
): number {
  let baseRecovery = RECOVERY_RATES[player.position];

  // Apply trait modifier
  if (player.traits.includes('Durable')) {
    baseRecovery *= 1.5;
  } else if (player.traits.includes('Injury Prone')) {
    baseRecovery *= 0.7;
  }

  // Apply consecutive rest bonus
  const restBonus = CONSECUTIVE_REST_BONUS[Math.min(daysOff, 4)] || 1;
  baseRecovery *= restBonus;

  // Cap at max daily recovery
  baseRecovery = Math.min(baseRecovery, MAX_DAILY_RECOVERY);

  // Can't exceed 100% (Fit) through natural recovery
  // Juiced requires special circumstances
  return Math.min(currentFitness + baseRecovery, 100);
}
```

### 3.4 Achieving Juiced Status

**Juiced** (120%) is special - it's NOT achieved through normal recovery:

| Method | Description | Duration |
|--------|-------------|----------|
| **Extended Rest** | 5+ consecutive days off while at Fit | 3 games |
| **All-Star Break** | If rested through break | Rest of first half |
| **Offseason** | Fresh start each season | First 10 games |
| **Random Event** | "Hot Streak" random event | 5 games |

```typescript
function checkJuicedEligibility(player: Player): boolean {
  return (
    player.fitness === 100 &&  // Must be Fit
    player.consecutiveDaysOff >= 5 &&  // Extended rest
    !player.recentlyJuiced  // Cooldown (can't be Juiced twice in 20 games)
  );
}
```

### 3.5 Injury Risk

Playing at low Fitness increases injury probability:

| Fitness State | Injury Chance per Game | Severity Modifier |
|---------------|------------------------|-------------------|
| Juiced | 0.5% | 0.5x (quick recovery) |
| Fit | 1% | 1.0x |
| Well | 2% | 1.0x |
| Strained | 5% | 1.5x |
| Weak | 15% | 2.0x |

```typescript
function calculateInjuryRisk(player: Player): InjuryRisk {
  const baseRisk = INJURY_RISK_BY_FITNESS[player.fitnessState];

  let modifiedRisk = baseRisk;

  // Position modifiers
  if (player.position === 'C') modifiedRisk *= 1.3;  // Catchers more injury-prone
  if (player.position === 'P') modifiedRisk *= 1.1;  // Pitchers slightly elevated

  // Trait modifiers
  if (player.traits.includes('Durable')) modifiedRisk *= 0.6;
  if (player.traits.includes('Injury Prone')) modifiedRisk *= 1.8;

  // Age modifiers
  if (player.age >= 35) modifiedRisk *= 1.3;
  if (player.age >= 38) modifiedRisk *= 1.6;

  return {
    chance: modifiedRisk,
    severityModifier: SEVERITY_BY_FITNESS[player.fitnessState]
  };
}
```

---

## 4. Fame Integration

### 4.1 Juiced Fame Boner ("PED Stigma")

**Key Design Decision**: Juiced is RARE in SMB4 - most players will never reach it, and even the best-rested players might hit it 2-3 times per season max. Because of this rarity, EVERY Juiced game gets Fame scrutiny, simulating real-world PED stigma.

**Per-Game Penalty**: Every game played while Juiced = **-1 Fame Boner**

```typescript
interface JuicedGamePenalty {
  trigger: 'GAME_PLAYED_WHILE_JUICED';
  fameBoner: -1;
  narrativeTag: 'PED_SUSPICION';
  descriptions: [
    "Fans notice {player} looking suspiciously spry...",
    "{player}'s 'fitness regimen' raising eyebrows in the stands",
    "What's in {player}'s protein shake? Fans want to know",
    "Beat writer notes {player} seems 'unnaturally fresh'"
  ];
}
```

**Achievement Reduction**: All Fame-worthy events while Juiced receive 50% credit:

| Achievement While Juiced | Normal Fame | Juiced Fame (50%) | Reasoning |
|--------------------------|-------------|-------------------|-----------|
| Home Run | +0 | +0 | No Fame bonus normally |
| Multi-HR Game | +1 | +0.5 | Tainted achievement |
| Cycle | +2 | +1 | Reduced credit |
| Walk-off | +2 | +1 | Still clutch, but... |
| 10+ K (pitcher) | +1 | +0.5 | "Juiced to the gills" |
| CGSO | +2 | +1 | Reduced credit |
| Perfect Game | +5 | +2.5 | Still amazing, but asterisk |

> **Note**: The -1 Fame Boner for playing while Juiced is applied ON TOP of the 50% achievement reduction.

> **Example Season**: A star player reaches Juiced status 3 times all season. That's -3 Fame Boners just for being Juiced, plus reduced credit on any achievements during those games. The message: suspicious performance gets scrutinized.

### 4.2 Mojo-Based Fame Modifiers

Achievements while disadvantaged are MORE impressive:

| Mojo State | Fame Modifier | Narrative Hook |
|------------|---------------|----------------|
| Rattled (-2) | +30% bonus | "Overcoming the pressure when it seemed impossible" |
| Tense (-1) | +15% bonus | "Fighting through adversity" |
| Normal (0) | No modifier | Standard |
| Locked In (+1) | -10% credit | "Easy when you're hot" |
| Jacked (+2) | -20% credit | "Anyone could do it feeling like that" |

> **Note**: Rattled is particularly impressive to overcome because it's so hard to escape once you're there.

```typescript
function getMojoFameModifier(mojo: number): number {
  const MODIFIERS = {
    [-2]: 1.30,  // +30% for Rattled (hardest to overcome)
    [-1]: 1.15,  // +15% for Tense
    [0]: 1.00,   // Baseline
    [1]: 0.90,   // -10% for Locked In
    [2]: 0.80,   // -20% for Jacked
  };
  return MODIFIERS[mojo] || 1.00;
}
```

### 4.3 Combined Fitness + Mojo Fame

When both factors apply:

```typescript
function calculateAdjustedFame(
  baseFame: number,
  mojo: number,
  fitness: FitnessState
): number {
  let adjusted = baseFame;

  // Apply Mojo modifier
  adjusted *= getMojoFameModifier(mojo);

  // Apply Juiced penalty
  if (fitness === 'JUICED') {
    adjusted *= 0.5;  // 50% Fame credit when Juiced
  }

  // Bonus for performing while physically compromised
  if (fitness === 'STRAINED') adjusted *= 1.15;  // +15% "playing hurt"
  if (fitness === 'WEAK') adjusted *= 1.25;      // +25% "gutsy performance"

  return Math.round(adjusted);
}
```

---

## 5. Performance Weighting

### 5.1 WAR Adjustments

Achievements are weighted based on Mojo/Fitness context:

```typescript
function getWARMultiplier(mojo: number, fitness: FitnessState): number {
  let multiplier = 1.0;

  // Mojo adjustment - Rattled is hardest to overcome
  if (mojo === -2) multiplier *= 1.15;      // +15% for overcoming Rattled
  else if (mojo === -1) multiplier *= 1.07; // +7% for Tense
  else if (mojo === 0) multiplier *= 1.00;  // Normal baseline
  else if (mojo === 1) multiplier *= 0.95;  // -5% for Locked In
  else if (mojo === 2) multiplier *= 0.90;  // -10% for Jacked

  // Fitness adjustment
  switch (fitness) {
    case 'JUICED':
      multiplier *= 0.85;  // -15% for enhanced performance
      break;
    case 'FIT':
    case 'WELL':
      // No adjustment
      break;
    case 'STRAINED':
      multiplier *= 1.10;  // +10% for playing through pain
      break;
    case 'WEAK':
      multiplier *= 1.20;  // +20% for gutsy performance
      break;
  }

  return multiplier;
}
```

### 5.2 Clutch Score Adjustments

Clutch moments are also context-weighted:

```typescript
function getClutchMultiplier(mojo: number): number {
  // Being clutch when Rattled is MORE impressive (and hard to do!)
  // Being clutch when Jacked is expected
  if (mojo === -2) return 1.30;  // +30% clutch credit for Rattled
  if (mojo === -1) return 1.15;  // +15% for Tense
  if (mojo === 0) return 1.00;   // Normal baseline
  if (mojo === 1) return 0.90;   // -10% for Locked In
  if (mojo === 2) return 0.85;   // -15% clutch credit for Jacked
  return 1.00;
}
```

---

## 6. In-Game Tracking

### 6.1 What to Track

| Data Point | When Captured | Storage |
|------------|---------------|---------|
| Starting Mojo | Game start | Per-game record |
| Mojo Changes | After significant events | Event log |
| Ending Mojo | Game end | Per-game record |
| Fitness State | Game start | Snapshot in box score |
| Fitness Change | Post-game calculation | Player record |
| **Mojo at each PA** | Every plate appearance | Per-event record |
| **Fitness at game start** | Game start | Per-game snapshot |

### 6.2 Mojo/Fitness Stat Splits

**Critical Feature**: Track player performance broken down by Mojo and Fitness states. This enables analysis like "How does this player hit when Tense?" or "What's their OPS when Juiced vs Fit?"

#### Batting Splits by Mojo

| Mojo State | PA | AB | H | 2B | 3B | HR | RBI | BB | K | AVG | OBP | SLG | OPS |
|------------|----|----|---|----|----|----|----|----|----|-----|-----|-----|-----|
| Jacked (+2) | 15 | 12 | 5 | 1 | 0 | 2 | 6 | 3 | 2 | .417 | .533 | .917 | 1.450 |
| Locked In (+1) | 45 | 40 | 14 | 3 | 1 | 3 | 10 | 4 | 8 | .350 | .400 | .625 | 1.025 |
| Normal (0) | 180 | 160 | 48 | 10 | 2 | 8 | 30 | 18 | 35 | .300 | .367 | .500 | .867 |
| Tense (-1) | 60 | 55 | 12 | 2 | 0 | 1 | 5 | 4 | 18 | .218 | .267 | .291 | .558 |
| Rattled (-2) | 20 | 18 | 2 | 0 | 0 | 0 | 1 | 1 | 9 | .111 | .150 | .111 | .261 |

#### Batting Splits by Fitness

| Fitness | PA | AB | H | HR | AVG | OPS | Notes |
|---------|----|----|---|----|----|-----|-------|
| Juiced | 12 | 10 | 4 | 2 | .400 | 1.200 | Rare but dominant |
| Fit | 200 | 175 | 52 | 10 | .297 | .850 | Baseline |
| Well | 80 | 72 | 20 | 3 | .278 | .780 | Slight decline |
| Strained | 25 | 22 | 4 | 0 | .182 | .450 | Playing hurt |
| Weak | 3 | 3 | 0 | 0 | .000 | .000 | Should be resting |

#### Pitching Splits by Mojo

| Mojo State | IP | H | ER | BB | K | ERA | WHIP | K/9 |
|------------|-----|---|----|----|---|-----|------|-----|
| Jacked (+2) | 8.0 | 3 | 0 | 1 | 12 | 0.00 | 0.50 | 13.5 |
| Locked In (+1) | 25.0 | 18 | 5 | 6 | 30 | 1.80 | 0.96 | 10.8 |
| Normal (0) | 80.0 | 72 | 28 | 22 | 75 | 3.15 | 1.18 | 8.4 |
| Tense (-1) | 15.0 | 18 | 10 | 8 | 10 | 6.00 | 1.73 | 6.0 |
| Rattled (-2) | 4.0 | 8 | 7 | 4 | 2 | 15.75 | 3.00 | 4.5 |

#### Implementation

```typescript
interface MojoFitnessSplits {
  playerId: string;
  season: number;

  // Batting splits by Mojo
  battingByMojo: {
    [mojoLevel: number]: BattingStats;  // -2 to +2
  };

  // Batting splits by Fitness
  battingByFitness: {
    [fitnessState: string]: BattingStats;
  };

  // Pitching splits by Mojo (for pitchers)
  pitchingByMojo?: {
    [mojoLevel: number]: PitchingStats;
  };

  // Pitching splits by Fitness
  pitchingByFitness?: {
    [fitnessState: string]: PitchingStats;
  };
}

// Called on every plate appearance
function recordPAWithContext(
  pa: PlateAppearance,
  batterMojo: number,
  batterFitness: FitnessState,
  pitcherMojo?: number,
  pitcherFitness?: FitnessState
): void {
  // Store Mojo/Fitness snapshot with the PA
  pa.context = {
    batterMojo,
    batterFitness,
    pitcherMojo,
    pitcherFitness,
    timestamp: Date.now()
  };

  // Update split accumulators
  updateBattingSplits(pa.batterId, batterMojo, batterFitness, pa.result);
  if (pitcherMojo !== undefined) {
    updatePitchingSplits(pa.pitcherId, pitcherMojo, pitcherFitness, pa.result);
  }
}
```

#### UI Display: Player Card Splits

```
┌─────────────────────────────────────────────────────────────────┐
│  Mike Trout - Batting Splits                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BY MOJO STATE                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Jacked (+2)     .417 / .533 / .917  (1.450 OPS)   15 PA  🔥   │
│  Locked In (+1)  .350 / .400 / .625  (1.025 OPS)   45 PA  🔥   │
│  Normal (0)      .300 / .367 / .500  ( .867 OPS)  180 PA       │
│  Tense (-1)      .218 / .267 / .291  ( .558 OPS)   60 PA  😰   │
│  Rattled (-2)    .111 / .150 / .111  ( .261 OPS)   20 PA  😱   │
│                                                                 │
│  BY FITNESS                                                     │
│  ─────────────────────────────────────────────────────────────  │
│  Juiced         .400 / .500 / .700  (1.200 OPS)   12 PA  💉    │
│  Fit            .297 / .365 / .485  ( .850 OPS)  200 PA  ✓     │
│  Well           .278 / .340 / .440  ( .780 OPS)   80 PA  ~     │
│  Strained       .182 / .230 / .220  ( .450 OPS)   25 PA  ⚠️    │
│                                                                 │
│  INSIGHT: Trout struggles when Tense (-309 OPS vs Normal)      │
│           but is elite when Locked In (+158 OPS vs Normal)     │
└─────────────────────────────────────────────────────────────────┘
```

#### Narrative Integration

These splits feed into the Narrative System for contextual storytelling:

- *"Mike Trout is hitting .111 when Rattled this season - he really struggles under pressure"*
- *"When Juiced, Slugger McPower is batting .400 with 2 HRs in just 12 PA - suspicious numbers"*
- *"Ace McThrow has a 15.75 ERA when Rattled - get him out of there fast"*
- *"Contact King is Locked In right now - he's hitting .350 in that state this season"*

### 6.3 User Entry Points

The tracker captures Mojo/Fitness at key moments:

**Pre-Game Setup**:
```
┌─────────────────────────────────────────────────────────────────┐
│  STARTING LINEUP - Giants vs Beewolves                         │
├─────────────────────────────────────────────────────────────────┤
│  1. Speedy McFast     CF    [Fit]  [Normal]   ✏️               │
│  2. Contact King      2B    [Fit]  [Locked In] ✏️              │
│  3. Power Slugger     1B    [Well] [Normal]   ✏️               │
│  4. Hot Streak        LF    [Juiced] [Locked In] ✏️  ⚠️        │
│  ...                                                            │
│                                                                 │
│  ⚠️ Hot Streak is JUICED - Fame penalties apply                 │
└─────────────────────────────────────────────────────────────────┘
```

**Mid-Game Updates** (optional quick entry):
```
┌─────────────────────────────────────────────────────────────────┐
│  MOJO UPDATE - Contact King                                     │
├─────────────────────────────────────────────────────────────────┤
│  Current: Locked In (+1)                                        │
│                                                                 │
│  [Jacked] [Locked In] [Normal] [Tense] [Rattled]               │
│                         ▲                                       │
│                     (current)                                   │
│                                                                 │
│  Reason: ○ Hot hitting  ○ Big play  ○ Error  ○ Slump  ○ Other  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Auto-Inference

The system can SUGGEST Mojo changes based on tracked events:

```typescript
function suggestMojoChange(player: Player, events: GameEvent[]): MojoSuggestion {
  let suggestedDelta = 0;

  for (const event of events.filter(e => e.playerId === player.id)) {
    switch (event.type) {
      case 'HOME_RUN':
        suggestedDelta += 1.5;
        break;
      case 'STRIKEOUT_BATTING':
        suggestedDelta -= 0.5;
        break;
      case 'ERROR':
        suggestedDelta -= 1;
        break;
      // ... etc
    }
  }

  return {
    currentMojo: player.mojo,
    suggestedMojo: clampMojo(player.mojo + Math.round(suggestedDelta)),
    confidence: calculateConfidence(events.length),
    reason: generateReason(events)
  };
}
```

---

## 7. Between-Game Management

### 7.1 Team Page Mojo/Fitness Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  TEAM MANAGEMENT - Mojo & Fitness                               │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [All] [Pitchers] [Position Players] [Needs Rest]      │
│                                                                 │
│  Player           Pos   Mojo      Fitness    Last Played       │
│  ─────────────────────────────────────────────────────────────  │
│  Ace McThrow      SP    Normal    Strained   Yesterday         │
│                         [▼]       [▼]        ⚠️ Needs Rest     │
│                                                                 │
│  Setup Guy        RP    Tense     Well       2 days ago        │
│                         [▼]       [▼]                           │
│                                                                 │
│  Power Slugger    1B    Locked In Juiced     Yesterday         │
│                         [▼]       [▼]        💉 PED Watch       │
│                                                                 │
│  [Apply Recovery] [Simulate Rest Day] [Reset All to Normal]    │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Recovery Projection

```typescript
interface RecoveryProjection {
  player: Player;
  currentFitness: FitnessState;
  daysToFit: number;
  daysToJuiced: number | null;  // null if not possible
  recommendedRestDays: number;
  injuryRiskIfPlayed: number;
}

function projectRecovery(player: Player): RecoveryProjection {
  const current = FITNESS_VALUES[player.fitnessState];
  const toFit = 100 - current;
  const dailyRecovery = calculateDailyRecovery(player);

  return {
    player,
    currentFitness: player.fitnessState,
    daysToFit: Math.ceil(toFit / dailyRecovery),
    daysToJuiced: current >= 100 ? 5 : null,  // Need 5 days at Fit
    recommendedRestDays: getRecommendedRest(player),
    injuryRiskIfPlayed: calculateInjuryRisk(player).chance
  };
}
```

---

## 8. Simulation Integration

### 8.1 Game Simulation Probability Modifiers

When simulating games, Mojo/Fitness affect outcome probabilities:

```typescript
interface SimulationModifiers {
  // Batting modifiers
  batting: {
    hitProbability: (base: number, mojo: number, fitness: FitnessState) => number;
    powerModifier: (base: number, mojo: number, fitness: FitnessState) => number;
    strikeoutRate: (base: number, mojo: number, fitness: FitnessState) => number;
  };

  // Pitching modifiers
  pitching: {
    strikeoutRate: (base: number, mojo: number, fitness: FitnessState) => number;
    walkRate: (base: number, mojo: number, fitness: FitnessState) => number;
    hitRate: (base: number, mojo: number, fitness: FitnessState) => number;
  };

  // Fielding modifiers
  fielding: {
    errorRate: (base: number, mojo: number, fitness: FitnessState) => number;
    rangeBonus: (base: number, mojo: number, fitness: FitnessState) => number;
  };
}

function applyMojoFitnessToSimulation(
  baseStats: PlayerStats,
  mojo: number,
  fitness: FitnessState
): AdjustedStats {
  const mojoMultiplier = getMojoStatMultiplier(mojo);
  const fitnessMultiplier = getFitnessStatMultiplier(fitness);
  const combined = mojoMultiplier * fitnessMultiplier;

  return {
    power: baseStats.power * combined,
    contact: baseStats.contact * combined,
    speed: baseStats.speed * fitnessMultiplier,  // Fitness only for speed
    fielding: baseStats.fielding * combined,
    velocity: baseStats.velocity * combined,
    junk: baseStats.junk * mojoMultiplier,       // Mojo only for junk
    accuracy: baseStats.accuracy * combined
  };
}

function getMojoStatMultiplier(mojo: number): number {
  // Maps mojo level to stat multiplier (5 levels: -2 to +2)
  const multipliers = {
    2: 1.18,   // Jacked (VERY_HIGH): +18%
    1: 1.10,   // Locked In (HIGH): +10%
    0: 1.00,   // Normal (NEUTRAL): baseline
    [-1]: 0.90, // Tense (LOW): -10%
    [-2]: 0.82  // Rattled (VERY_LOW): -18% (hard to escape!)
  };
  return multipliers[mojo] || 1.0;
}

function getFitnessStatMultiplier(fitness: FitnessState): number {
  const multipliers = {
    'JUICED': 1.20,
    'FIT': 1.00,
    'WELL': 0.95,
    'STRAINED': 0.85,
    'WEAK': 0.70,
    'HURT': 0.00  // Can't play
  };
  return multipliers[fitness];
}
```

---

## 9. UI Components

### 9.1 Mojo Indicator (In-Game)

```
┌──────────────────┐
│  Mike Trout      │
│  ████████░░ +2   │  ← Mojo bar (Jacked)
│  🔥🔥            │
└──────────────────┘
```

### 9.2 Fitness Badge

| State | Badge | Color |
|-------|-------|-------|
| Juiced | 💉 or ⚡ | Purple |
| Fit | ✓ | Green |
| Well | ~ | Light Green |
| Strained | ⚠️ | Yellow |
| Weak | ⛔ | Orange |
| Hurt | 🏥 | Red |

### 9.3 Combined Player Card

```
┌─────────────────────────────────────────────────────────────────┐
│  Mike Trout                                    CF  Beewolves   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POW: 95  CON: 88  SPD: 75  FLD: 82  ARM: 78                   │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │ MOJO: +2    │  │ FITNESS     │                              │
│  │ 🔥 Jacked   │  │ 💉 Juiced   │                              │
│  │ ████████░░  │  │ ████████████│                              │
│  └─────────────┘  └─────────────┘                              │
│                                                                 │
│  ⚠️ JUICED: Fame penalties active (-50% credit)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.4 Narrative Feed Integration

```
┌─────────────────────────────────────────────────────────────────┐
│  📰 LEAGUE NEWS                                                 │
├─────────────────────────────────────────────────────────────────┤
│  🔥 Mike Trout is LOCKED IN! Third straight multi-hit game.    │
│                                                                 │
│  💉 Fans raising eyebrows at Power Slugger's "fitness regimen" │
│     after his 3rd Juiced game this month.                       │
│                                                                 │
│  😰 Star pitcher looking RATTLED after giving up back-to-back  │
│     homers in the 5th.                                          │
│                                                                 │
│  💪 Utility Player gutting it out at STRAINED fitness -        │
│     that's a gamer right there.                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Data Schema

### 10.1 Player Mojo/Fitness Record

```typescript
interface PlayerMojoFitness {
  playerId: string;

  // Current state
  currentMojo: number;           // -2 to +2
  currentFitness: FitnessState;  // Enum

  // History
  mojoHistory: MojoEntry[];
  fitnessHistory: FitnessEntry[];

  // Tracking
  gamesAtJuiced: number;         // This season
  lastJuicedGame: number | null; // Game number
  juicedCooldown: number;        // Games until can be Juiced again
  consecutiveDaysOff: number;

  // Season totals for Juiced Fame penalty
  juicedAchievements: JuicedAchievement[];

  // Stat splits by Mojo/Fitness (see Section 6.2)
  battingSplitsByMojo: Map<number, BattingStats>;      // -2 to +2
  battingSplitsByFitness: Map<FitnessState, BattingStats>;
  pitchingSplitsByMojo?: Map<number, PitchingStats>;   // For pitchers
  pitchingSplitsByFitness?: Map<FitnessState, PitchingStats>;
}

interface MojoEntry {
  gameId: string;
  startingMojo: number;
  endingMojo: number;
  peakMojo: number;
  lowMojo: number;
  events: MojoChangeEvent[];
}

interface FitnessEntry {
  date: string;
  state: FitnessState;
  reason: 'GAME_PLAYED' | 'REST_DAY' | 'INJURY' | 'RECOVERY' | 'RANDOM_EVENT';
}

interface JuicedAchievement {
  gameId: string;
  type: 'HOME_RUN' | 'MULTI_HIT' | 'RBI' | 'PITCHER_WIN' | 'STRIKEOUTS' | etc;
  normalFame: number;
  adjustedFame: number;  // After Juiced penalty
}

type FitnessState = 'JUICED' | 'FIT' | 'WELL' | 'STRAINED' | 'WEAK' | 'HURT';
```

### 10.2 Game Record Integration

```typescript
interface GameBoxScore {
  // ... existing fields ...

  mojoFitnessSnapshot: {
    [playerId: string]: {
      startingMojo: number;
      endingMojo: number;
      fitness: FitnessState;
    }
  };
}
```

---

## Appendix: Fame Boner Summary for Juiced

> **Key Insight**: Juiced is RARE. Most players never hit it. A star might reach Juiced 2-3 times per season max. Every instance is scrutinized.

| Trigger | Fame Boner | Notes |
|---------|------------|-------|
| **Every game played while Juiced** | -1 | "What's in that protein shake?" |
| Achievement while Juiced | 50% credit | Applied to all Fame-worthy events |
| Hitting milestone while Juiced | -1 additional | "Tainted record" |
| MVP/Award voting while Juiced | -20% votes | Voters skeptical |

**Example**: Star player has a monster game while Juiced - 3 HR, 7 RBI, cycle.
- Normal Fame: +1 (Multi-HR) + 2 (Cycle) = **+3 Fame Bonus**
- Juiced Fame: +0.5 (Multi-HR × 50%) + 1 (Cycle × 50%) - 1 (Juiced game) = **+0.5 net Fame**
- Narrative: "Incredible performance, but fans note he looked 'unusually fresh'"

---

*This specification should be read alongside SMB4_GAME_REFERENCE.md for the underlying game mechanics.*

*Last Updated: January 23, 2026*
