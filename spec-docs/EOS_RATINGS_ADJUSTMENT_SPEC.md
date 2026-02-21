# End-of-Season Ratings Adjustment System v4.1

## Scalable Position Detection Criteria

All criteria scale based on **season length** (games per team). The formulas use a 162-game MLB season as the baseline and scale proportionally.

### Season Setup Parameter

```javascript
const seasonSetup = {
  gamesPerTeam: 40,  // User-configurable in Season Setup menu
};
```

### Scaling Formula

```javascript
function scaleThreshold(mlbThreshold, mlbGames = 162) {
  const scaleFactor = seasonSetup.gamesPerTeam / mlbGames;
  return Math.round(mlbThreshold * scaleFactor);
}
```

---

## Position Detection Thresholds

### MLB Baseline (162-game season) vs Your 40-Game Season

| Criteria | MLB (162 games) | 40 Games | Formula |
|----------|-----------------|----------|---------|
| **SP: Minimum Starts** | 20 starts | 5 starts | `round(20 × 40/162)` |
| **SP/RP: Minimum Starts** | 10 starts | 2 starts | `round(10 × 40/162)` |
| **RP: Minimum Relief Apps** | 40 appearances | 10 appearances | `round(40 × 40/162)` |
| **CP: Minimum Saves** | 20 saves | 5 saves | `round(20 × 40/162)` |
| **UTIL: Games per Position** | 25 games | 6 games | `round(25 × 40/162)` |
| **TWO-WAY: Min Pitching Games** | 20 games | 5 games | `round(20 × 40/162)` |
| **TWO-WAY: Min Plate Appearances** | 200 PA | 49 PA | `round(200 × 40/162)` |
| **Starter: % of Team Games** | 50% | 50% | Fixed percentage |
| **UTIL: Max % at Single Position** | 60% | 60% | Fixed percentage |

### Dynamic Threshold Calculator

```javascript
function getPositionThresholds(gamesPerTeam) {
  const scale = gamesPerTeam / 162;

  return {
    // Starting Pitcher
    SP_MIN_STARTS: Math.round(20 * scale),           // 5 for 40 games
    SP_STARTS_GT_RELIEF: true,                       // starts > relief apps

    // Swingman (SP/RP)
    SPSP_MIN_STARTS: Math.round(10 * scale),         // 2 for 40 games
    SPSP_RELIEF_RATIO: 0.5,                          // relief >= 50% of starts

    // Relief Pitcher
    RP_MIN_RELIEF: Math.round(40 * scale),           // 10 for 40 games
    RP_MAX_SAVES: Math.round(20 * scale) - 1,        // <5 for 40 games (otherwise CP)

    // Closer
    CP_MIN_SAVES: Math.round(20 * scale),            // 5 for 40 games

    // Utility Player
    UTIL_MIN_POSITIONS: 3,                           // Fixed: 3+ positions
    UTIL_MIN_GAMES_PER_POS: Math.round(25 * scale),  // 6 for 40 games
    UTIL_MAX_PCT_SINGLE: 0.60,                       // Fixed: no position >60%

    // Bench Player
    BENCH_MAX_PCT: 0.50,                             // <50% of team games at primary

    // Two-Way Player
    TWOWAY_MIN_PITCH_GAMES: Math.round(20 * scale),  // 5 for 40 games
    TWOWAY_MIN_PA: Math.round(200 * scale),          // 49 for 40 games

    // Starter threshold
    STARTER_MIN_PCT: 0.50,                           // 50% of team games
  };
}
```

---

## Complete Position Detection Algorithm

```javascript
function detectPosition(player, seasonStats, thresholds) {
  const {
    gamesStartedPitching,
    gamesRelieved,
    saves,
    plateAppearances,
    gamesAtPosition,  // { 'SS': 20, '2B': 15, 'LF': 8 }
    teamGames,
  } = seasonStats;

  const T = thresholds;

  // ========================================
  // PITCHER DETECTION (check first)
  // ========================================

  const totalPitchingGames = (gamesStartedPitching || 0) + (gamesRelieved || 0);

  // Two-Way Player: significant pitching AND batting
  if (totalPitchingGames >= T.TWOWAY_MIN_PITCH_GAMES &&
      plateAppearances >= T.TWOWAY_MIN_PA) {
    return 'TWO-WAY';
  }

  // Starting Pitcher: enough starts, more starts than relief
  if (gamesStartedPitching >= T.SP_MIN_STARTS &&
      gamesStartedPitching > (gamesRelieved || 0)) {
    return 'SP';
  }

  // Swingman (SP/RP): some starts, significant relief work
  if (gamesStartedPitching >= T.SPSP_MIN_STARTS &&
      (gamesRelieved || 0) >= gamesStartedPitching * T.SPSP_RELIEF_RATIO) {
    return 'SP/RP';
  }

  // Closer: enough saves
  if (saves >= T.CP_MIN_SAVES) {
    return 'CP';
  }

  // Relief Pitcher: enough relief appearances, not enough saves for CP
  if (gamesRelieved >= T.RP_MIN_RELIEF) {
    return 'RP';
  }

  // Spot starter/emergency reliever - falls into SP/RP
  if (gamesStartedPitching >= 1 && gamesRelieved >= 1) {
    return 'SP/RP';
  }

  // Pure reliever with few appearances
  if (gamesRelieved >= Math.round(T.RP_MIN_RELIEF / 2)) {
    return 'RP';
  }

  // ========================================
  // POSITION PLAYER DETECTION
  // ========================================

  // Filter out pitching from position games
  const fieldingPositions = Object.entries(gamesAtPosition || {})
    .filter(([pos]) => !['P'].includes(pos))
    .sort((a, b) => b[1] - a[1]);

  if (fieldingPositions.length === 0) {
    // No fielding games - must be DH
    return 'DH';
  }

  // Calculate totals
  const totalFieldingGames = fieldingPositions.reduce((sum, [_, g]) => sum + g, 0);
  const [primaryPos, primaryGames] = fieldingPositions[0];

  // Utility Player: 3+ positions, each with minimum games, none dominant
  const significantPositions = fieldingPositions
    .filter(([pos, games]) => games >= T.UTIL_MIN_GAMES_PER_POS && pos !== 'DH');

  if (significantPositions.length >= T.UTIL_MIN_POSITIONS) {
    const maxGamesAtOne = Math.max(...significantPositions.map(([_, g]) => g));
    if (maxGamesAtOne <= totalFieldingGames * T.UTIL_MAX_PCT_SINGLE) {
      return 'UTIL';
    }
  }

  // Bench Player: less than 50% of team games at primary position
  if (primaryGames < teamGames * T.BENCH_MAX_PCT) {
    return 'BENCH';
  }

  // DH Check: if primary position is DH
  if (primaryPos === 'DH') {
    return 'DH';
  }

  // Regular starter at their primary position
  return primaryPos;  // 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'
}
```

---

## Threshold Examples by Season Length

| Season Length | SP Starts | SP/RP Starts | RP Apps | CP Saves | UTIL Games/Pos | TWO-WAY Pitch | TWO-WAY PA |
|---------------|-----------|--------------|---------|----------|----------------|---------------|------------|
| **20 games** | 2 | 1 | 5 | 2 | 3 | 2 | 25 |
| **40 games** | 5 | 2 | 10 | 5 | 6 | 5 | 49 |
| **60 games** | 7 | 4 | 15 | 7 | 9 | 7 | 74 |
| **82 games** | 10 | 5 | 20 | 10 | 13 | 10 | 101 |
| **162 games** | 20 | 10 | 40 | 20 | 25 | 20 | 200 |

---

## Primary Position Determination

When a player qualifies as a regular starter (not UTIL, not BENCH), their **primary position** is simply the position where they played the most games:

```javascript
function getPrimaryPosition(player) {
  const fieldingGames = Object.entries(player.gamesAtPosition || {})
    .filter(([pos]) => pos !== 'P')
    .sort((a, b) => b[1] - a[1]);

  if (fieldingGames.length === 0) return 'DH';

  return fieldingGames[0][0];  // Position with most games
}
```

**Tie-breaker**: If two positions have equal games, use alphabetical order (or user preference in settings).

---

## Minimum Position Pool Size

For **ratings adjustment peer comparisons** to be meaningful, position categories need enough players (minimum 6). If a category has fewer than 6 players, they merge with similar positions for adjustment calculations.

**Important distinction:**
- **Ratings Adjustments**: Require 6+ players for meaningful comparison; merge if smaller
- **Gold Glove Awards**: Even 1 qualifier wins (UTIL Gold Glove is valid with 1 utility player)

```javascript
const MIN_POOL_SIZE = 6;

function getComparisonPool(position, allPlayers) {
  const posPlayers = allPlayers.filter(p => p.detectedPosition === position);

  // If pool is too small, merge with similar positions for adjustment calculations
  if (posPlayers.length < MIN_POOL_SIZE) {
    return getMergedPool(position, allPlayers);
  }

  return posPlayers;
}

function getMergedPool(position, allPlayers) {
  const mergeGroups = {
    // Pitchers merge together
    'CP': ['CP', 'RP'],
    'RP': ['RP', 'CP'],
    'SP/RP': ['SP/RP', 'SP', 'RP'],

    // Corner infielders merge
    '1B': ['1B', '3B'],
    '3B': ['3B', '1B'],

    // Middle infielders merge
    '2B': ['2B', 'SS'],
    'SS': ['SS', '2B'],

    // Outfielders merge
    'LF': ['LF', 'RF', 'CF'],
    'RF': ['RF', 'LF', 'CF'],
    'CF': ['CF', 'LF', 'RF'],

    // UTIL merges with BENCH (both are non-primary starters)
    'UTIL': ['UTIL', 'BENCH'],
    'BENCH': ['BENCH', 'UTIL'],
  };

  const positionsToInclude = mergeGroups[position] || [position];
  return allPlayers.filter(p => positionsToInclude.includes(p.detectedPosition));
}
```

### Two-Way Player Comparisons

Two-way players are compared differently for each WAR component:
- **pWAR**: Compared against their pitching peer group (SP, SP/RP, RP, or CP based on role)
- **bWAR, rWAR, fWAR**: Compared against the position they played most (e.g., RF, 1B, etc.)
```

---

## WAR Component → Rating Category Mapping (Unchanged)

| WAR Component | Rating Categories | Cap |
|---------------|-------------------|-----|
| **bWAR** | Power (L/R), Contact (L/R) | ±10 total |
| **rWAR** | Speed | ±10 |
| **fWAR** | Fielding, Arm | ±10 total |
| **pWAR** | Velocity, Junk, Accuracy | ±10 total |

---

## DH Handling for fWAR

DHs don't field, so they have no fWAR:

```javascript
function calculateAdjustments(player, peerMedians) {
  const adjustments = {
    batting: calculateWARCategoryAdjustment(player.bWAR, peerMedians.bWAR, player),
    baserunning: calculateWARCategoryAdjustment(player.rWAR, peerMedians.rWAR, player),
    pitching: calculateWARCategoryAdjustment(player.pWAR, peerMedians.pWAR, player),
  };

  // DHs: exclude fWAR from calculation, display as N/A
  if (player.detectedPosition === 'DH') {
    adjustments.fielding = null;  // Will display as "N/A"
  } else {
    adjustments.fielding = calculateWARCategoryAdjustment(player.fWAR, peerMedians.fWAR, player);
  }

  return adjustments;
}
```

**Display:**
```
┌─────────────────────────────────────────┐
│ RATINGS ADJUSTMENT - Big Papi (DH)      │
├─────────────────────────────────────────┤
│ Batting:     +4                         │
│ Baserunning: -1                         │
│ Fielding:    N/A (DH - no fielding)     │
│ Pitching:    0                          │
└─────────────────────────────────────────┘
```

---

## Grade Factors (Corrected Asymmetry)

| Grade | Positive Factor | Negative Factor |
|-------|-----------------|-----------------|
| **S** | 0.10 | 2.50 |
| **A+** | 0.15 | 2.00 |
| **A** | 0.20 | 1.75 |
| **A-** | 0.30 | 1.50 |
| **B+** | 0.50 | 1.25 |
| **B** | 0.75 | 1.00 |
| **B-** | 1.00 | 0.85 |
| **C+** | 1.25 | 0.70 |
| **C** | 1.50 | 0.50 |
| **C-** | 1.75 | 0.35 |
| **D+** | 2.00 | 0.25 |
| **D** | 2.25 | 0.20 |

---

## Manager Adjustment System

### Manager Pool Calculation

```javascript
function calculateManagerPool(manager, allManagers) {
  const BASE_POOL = 20;  // All managers get ±20 to distribute

  // mWAR-based bonus/penalty
  const leagueMedianMWAR = median(allManagers.map(m => m.mWAR));
  const mwarDiff = manager.mWAR - leagueMedianMWAR;

  const gradeFactor = getTimeWeightedGradeFactor(manager);
  const factor = mwarDiff >= 0 ? gradeFactor.positive : gradeFactor.negative;
  const mwarBonus = Math.round(mwarDiff * factor * 5);

  // Manager of the Year bonus
  const moyBonus = manager.isManagerOfYear ? 5 : 0;

  return {
    basePool: BASE_POOL,
    mwarBonus: mwarBonus,
    moyBonus: moyBonus,
    totalPool: BASE_POOL + mwarBonus + moyBonus,
  };
}
```

### Manager Distribution Rules

1. **Total distributed must equal pool**
2. **Max 50% to any single player**
3. **Can be positive OR negative** to any player
4. **Can target any rating category**
5. **Negative pools must be distributed** (poor managers penalize their team)

---

## Season Setup UI

```
┌─────────────────────────────────────────────────────────────┐
│  SEASON SETUP                                               │
├─────────────────────────────────────────────────────────────┤
│  Season Name: [KBL Season 3                              ]  │
│                                                             │
│  Games Per Team: [40] ▼                                     │
│    Options: 20, 40, 60, 82, 100, 162                        │
│                                                             │
│  ─────────────────────────────────────────                  │
│  AUTO-CALCULATED THRESHOLDS:                                │
│                                                             │
│  Pitching:                                                  │
│    • Starting Pitcher (SP): 5+ starts                       │
│    • Swingman (SP/RP): 2+ starts with relief work           │
│    • Relief Pitcher (RP): 10+ relief appearances            │
│    • Closer (CP): 5+ saves                                  │
│                                                             │
│  Position Players:                                          │
│    • Starter: 20+ games at primary position (50%)           │
│    • Utility (UTIL): 3+ positions, 6+ games each            │
│    • Bench: <20 games at any position                       │
│                                                             │
│  Two-Way:                                                   │
│    • 5+ pitching games AND 49+ plate appearances            │
│                                                             │
│                                    [SAVE] [CANCEL]          │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

| Feature | Implementation |
|---------|----------------|
| **Position Thresholds** | Scale with season length (162-game baseline) |
| **UTIL Detection** | 3+ positions, 10+ games each (for 40-game season: 6 games) |
| **BENCH Detection** | <50% of team games at primary position |
| **Min Pool Size** | 6 players for adjustments; merge similar positions if smaller |
| **WAR → Ratings** | bWAR→Power/Contact, rWAR→Speed, fWAR→Fielding/Arm, pWAR→Pitching |
| **DH fWAR** | N/A (excluded from calculation) |
| **Manager Pool** | ±20 base + mWAR bonus + MOY bonus |
| **Negative Pools** | Must be distributed (poor managers penalize team) |
| **Rounding** | Nearest whole number, -0.5 rounds to -1 |

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| UTIL games threshold | 10 games per position (scaled: 6 for 40 games) |
| Small position pools | Merge similar positions if <6 for adjustments (awards are separate) |
| DH fWAR | Display "N/A", exclude from calculation |
| Negative manager pools | Must distribute (intended behavior) |


---

## End-of-Season Trait Assignment

> **NEW February 2026**: Traits are assigned during the Awards Ceremony (Phase 2) as part of end-of-season processing. This section defines the rules for trait assignment, Chemistry mechanics, and the award-appropriate trait pools.

### Trait Assignment Timing

Traits are assigned AFTER ratings adjustments, during the Awards Ceremony phase. The ceremony includes a "Trait Wheel Spin" reveal for each eligible player.

### Eligibility

Players eligible for trait assignment at end of season:
- Players with 0 or 1 current traits (max 2 traits per player)
- Players who meet position-appropriate criteria for the trait pool
- Players nominated via the "eye test" ranking system (user-driven, allows equal rankings)

### CORRECTED Chemistry Mechanics

> **CRITICAL**: Traits can come from ANY Chemistry type. A player's own Chemistry type does NOT restrict which traits they can receive. Chemistry affects POTENCY, not eligibility.

```typescript
// CORRECT: Any player can receive any trait
function canReceiveTrait(player: Player, trait: Trait): boolean {
  // Only restrictions: max 2 traits, position-appropriate
  if (player.traits.length >= 2) return false;
  if (!isPositionAppropriate(trait, player.primaryPosition)) return false;
  return true;  // Chemistry type does NOT restrict eligibility
}

// Chemistry affects potency AFTER assignment
function calculateTraitPotency(player: Player, trait: Trait, team: Team): number {
  const traitChemistryType = getTraitChemistryType(trait);
  
  // Count team members with the TRAIT's Chemistry type (not the player's)
  const teamChemistryCount = team.roster.filter(
    p => p.chemistryType === traitChemistryType
  ).length;
  
  // Player's own Chemistry counts if it matches the TRAIT's Chemistry
  // (player is already in team.roster, so self-synergy is automatic)
  
  return getChemistryTier(teamChemistryCount);  // 1-4
}
```

### Position-Appropriate Trait Pools

Not all traits make sense for all positions. The trait pool is filtered by position:

```typescript
const POSITION_TRAIT_POOLS: Record<PositionGroup, string[]> = {
  'HITTER': [
    'Clutch', 'Choker', 'Tough Out', 'Free Swinger', 
    'Whiffer', 'RBI Man', 'Table Setter', 'Power Surge',
    'Contact Machine', 'Rally Killer'
  ],
  'PITCHER': [
    'Clutch', 'Choker', 'K Artist', 'Wild Thing',
    'Groundball Machine', 'Innings Eater', 'Flame Thrower',
    'Crafty Vet', 'Closer Mentality', 'Meltdown'
  ],
  'FIELDER': [
    'Gold Glove', 'Error Prone', 'Range King', 
    'Cannon Arm', 'Wall Climber'
  ],
  'BASERUNNER': [
    'Stealer', 'Station to Station', 'Aggressive Runner',
    'Smart Baserunner'
  ]
};

// A player can receive traits from multiple pools based on their role
function getEligibleTraits(player: Player): string[] {
  const pools: string[] = [];
  
  // All position players get HITTER pool
  if (!isPitcherOnly(player)) {
    pools.push(...POSITION_TRAIT_POOLS['HITTER']);
    pools.push(...POSITION_TRAIT_POOLS['BASERUNNER']);
  }
  
  // Fielders (non-DH) get FIELDER pool
  if (player.primaryPosition !== 'DH') {
    pools.push(...POSITION_TRAIT_POOLS['FIELDER']);
  }
  
  // Pitchers get PITCHER pool
  if (isPitcher(player)) {
    pools.push(...POSITION_TRAIT_POOLS['PITCHER']);
  }
  
  return [...new Set(pools)];  // Deduplicate
}
```

### Award-Appropriate Trait Assignment

Traits assigned during awards should relate to the award earned:

| Award | Likely Trait Pool |
|-------|------------------|
| MVP | Clutch, RBI Man, Power Surge, Table Setter |
| Cy Young | K Artist, Innings Eater, Clutch, Groundball Machine |
| Gold Glove | Gold Glove, Range King, Cannon Arm |
| Silver Slugger | Contact Machine, Power Surge, RBI Man |
| Stolen Base Leader | Stealer, Aggressive Runner |
| Rookie of the Year | Any position-appropriate (weighted toward positive) |

### Trait Distribution Rules

From the 506-player database (initial league):
- ~30% of players: 0 traits
- ~50% of players: 1 trait
- ~20% of players: 2 traits

At end of season, trait assignment is weighted:
- Award winners: 60% chance of gaining a trait (if eligible)
- Top performers (non-award): 30% chance
- Regular players: 5% chance
- Negative traits: 15% of all assigned traits are negative (Choker, Whiffer, Error Prone, etc.)

> **Cross-reference**: See TRAIT_INTEGRATION_SPEC.md for full Chemistry mechanics, potency calculations, and how traits interact with the salary system.
