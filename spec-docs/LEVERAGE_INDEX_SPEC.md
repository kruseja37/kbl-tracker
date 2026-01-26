# Leverage Index (LI) and Clutch System Specification

> **Source**: Based on Tom Tango's Leverage Index methodology
> **Purpose**: Automate clutch/choke scoring using real-time game state tracking
> **Integration**: Replaces binary "close game" checks with granular LI-weighted values
> **Related Specs**: PWAR_CALCULATION_SPEC.md (reliever LI), KBL_XHD_TRACKER_MASTER_SPEC_v3.md §6

---

## Table of Contents

1. [Overview](#1-overview)
2. [What is Leverage Index?](#2-what-is-leverage-index)
3. [Game State Tracking](#3-game-state-tracking)
4. [LI Calculation](#4-li-calculation)
5. [Base-Out LI Tables](#5-base-out-li-tables)
6. [Full LI Lookup Tables](#6-full-li-lookup-tables)
7. [Clutch/Choke Integration](#7-clutchchoke-integration)
8. [Net Clutch Rating Formula](#8-net-clutch-rating-formula)
9. [Implementation Examples](#9-implementation-examples)
10. [SMB4 Adaptations](#10-smb4-adaptations)
11. [Tracking Requirements](#11-tracking-requirements)
12. [Reference Tables](#12-reference-tables)

---

## 1. Overview

### The Problem with Binary Clutch

The current system uses a simple "close game" check:

```javascript
// Old approach
function isCloseGame(scoreDifferential) {
  return Math.abs(scoreDifferential) <= 2;
}
```

This misses important nuance:
- Tie game in 9th with bases loaded ≠ Tie game in 1st with no runners
- 1-run lead in 9th, 2 outs, bases loaded ≠ 1-run lead in 5th, 0 outs, empty

### The Solution: Leverage Index

**Leverage Index (LI)** quantifies exactly how critical any moment is based on:
- Inning (late innings = higher leverage)
- Score differential (close games = higher leverage)
- Outs (2 outs often higher than 0 outs)
- Base state (runners in scoring position = higher leverage)

### Benefits for KBL Tracker

1. **Automated clutch detection** - No manual "clutch situation" badges needed
2. **Proportional rewards** - Walk-off grand slam in 9th worth more than go-ahead single in 5th
3. **Fair choke penalties** - K with bases loaded in 9th penalized more than in 3rd
4. **Net Clutch Rating** - Single number summarizing clutch performance
5. **Reliever pWAR** - Accurate leverage multiplier for pitching WAR

---

## 2. What is Leverage Index?

### Definition

Leverage Index measures the **potential swing in win probability** at any game state, normalized so that the average situation = 1.0.

```
LI = (Potential WP Swing at Current State) / (Average WP Swing Across All States)
```

### LI Scale

| LI Value | Category | Description | Frequency |
|----------|----------|-------------|-----------|
| 0.0-0.85 | Low | Blowout, early innings | ~60% of PAs |
| 0.85-2.0 | Medium | Competitive game | ~30% of PAs |
| 2.0-5.0 | High | Critical moment | ~9% of PAs |
| 5.0+ | Extreme | Game on the line | ~1% of PAs |

### Extreme Examples

| Situation | Approx LI |
|-----------|-----------|
| 1st inning, 0-0, no runners, 0 out | 0.9 |
| 5th inning, down 5, bases empty | 0.2 |
| 9th inning, tie game, bases loaded, 2 out | 10.0+ |
| 9th inning, up 1, bases loaded, 2 out (closer) | 8.0+ |
| 7th inning, down 1, RISP, 2 out | 3.5 |

---

## 3. Game State Tracking

### Required State Variables

To calculate LI, we need to track these at every plate appearance:

```typescript
interface GameState {
  // Inning state
  inning: number;           // 1-9+ (extras)
  halfInning: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2;

  // Base state (8 possible states)
  runners: {
    first: boolean;
    second: boolean;
    third: boolean;
  };

  // Score state
  homeScore: number;
  awayScore: number;

  // Derived
  scoreDifferential: number;  // From batting team's perspective
  isHomeTeamBatting: boolean;
}
```

### Base State Encoding

For compact lookup tables, encode base state as 0-7:

```javascript
const BASE_STATE = {
  EMPTY: 0,           // ___
  FIRST: 1,           // 1__
  SECOND: 2,          // _2_
  FIRST_SECOND: 3,    // 12_
  THIRD: 4,           // __3
  FIRST_THIRD: 5,     // 1_3
  SECOND_THIRD: 6,    // _23
  LOADED: 7           // 123
};

function encodeBaseState(runners) {
  let state = 0;
  if (runners.first) state += 1;
  if (runners.second) state += 2;
  if (runners.third) state += 4;
  return state;
}
```

---

## 4. LI Calculation

### Conceptual Formula

```
LI = Σ(P(outcome) × |WP_after - WP_before|) / Average_WP_Swing
```

Where:
- P(outcome) = probability of each possible outcome (K, walk, single, HR, etc.)
- WP_after = win probability after that outcome
- WP_before = win probability before the PA
- Average_WP_Swing ≈ 0.0346 (league average)

### Practical Approach: Lookup Tables

Rather than calculate LI from scratch, we use pre-computed tables based on historical data.

```javascript
function getLeverageIndex(gameState) {
  const { inning, halfInning, outs, runners, scoreDifferential } = gameState;

  const baseState = encodeBaseState(runners);
  const clampedDiff = Math.max(-8, Math.min(8, scoreDifferential));

  // Look up from pre-computed table
  return LI_TABLE[inning][halfInning][outs][baseState][clampedDiff + 8];
}
```

---

## 5. Base-Out LI Tables

### Base-Out Leverage Index (boLI)

This is the simpler version—just base state + outs, ignoring inning and score.

| Base State | 0 Outs | 1 Out | 2 Outs |
|------------|--------|-------|--------|
| Empty (___) | 0.86 | 0.90 | 0.93 |
| 1st only (1__) | 1.07 | 1.10 | 1.24 |
| 2nd only (_2_) | 1.15 | 1.40 | 1.56 |
| 1st & 2nd (12_) | 1.35 | 1.55 | 1.93 |
| 3rd only (__3) | 1.08 | 1.65 | 1.88 |
| 1st & 3rd (1_3) | 1.32 | 1.85 | 2.25 |
| 2nd & 3rd (_23) | 1.45 | 2.10 | 2.50 |
| Loaded (123) | 1.60 | 2.25 | **2.67** |

**Note**: These are baseline multipliers. Full LI applies inning and score context on top.

### JavaScript Implementation

```javascript
const BASE_OUT_LI = [
  // 0 outs, 1 out, 2 outs
  [0.86, 0.90, 0.93],  // Empty
  [1.07, 1.10, 1.24],  // 1st
  [1.15, 1.40, 1.56],  // 2nd
  [1.35, 1.55, 1.93],  // 1st+2nd
  [1.08, 1.65, 1.88],  // 3rd
  [1.32, 1.85, 2.25],  // 1st+3rd
  [1.45, 2.10, 2.50],  // 2nd+3rd
  [1.60, 2.25, 2.67]   // Loaded
];

function getBaseOutLI(baseState, outs) {
  return BASE_OUT_LI[baseState][outs];
}
```

---

## 6. Full LI Lookup Tables

### Table Structure

Full LI accounts for inning, half, outs, base state, and score differential.

```javascript
// LI_TABLE[inning][halfInning][outs][baseState][scoreDiff+8]
// Dimensions: 12 innings × 2 halves × 3 outs × 8 base states × 17 score diffs (-8 to +8)
// Total: 12 × 2 × 3 × 8 × 17 = 9,792 values
```

### Simplified LI Approximation

For SMB4, we can use a simplified formula that captures the key dynamics:

```javascript
function approximateLI(gameState) {
  const { inning, outs, runners, scoreDifferential, halfInning } = gameState;

  // 1. Base-out component
  const baseState = encodeBaseState(runners);
  const boLI = BASE_OUT_LI[baseState][outs];

  // 2. Inning multiplier (late innings matter more)
  const inningMultiplier = getInningMultiplier(inning, halfInning);

  // 3. Score differential dampener (blowouts reduce leverage)
  const scoreDampener = getScoreDampener(scoreDifferential, inning);

  // 4. Combine
  const rawLI = boLI * inningMultiplier * scoreDampener;

  // 5. Clamp to reasonable range
  return Math.max(0.1, Math.min(10.0, rawLI));
}

function getInningMultiplier(inning, halfInning) {
  // Late innings = higher leverage
  const inningMult = {
    1: 0.7, 2: 0.75, 3: 0.8, 4: 0.85, 5: 0.9,
    6: 1.0, 7: 1.2, 8: 1.5, 9: 2.0
  };

  let mult = inningMult[Math.min(inning, 9)] || 2.0;

  // Bottom of 9th (or later) with home team batting AND tied/trailing = walk-off potential
  // NOTE: Must also check scoreDiff <= 0 (tied or trailing) per Appendix implementation
  if (inning >= 9 && halfInning === 'BOTTOM' && scoreDiff <= 0) {
    mult *= 1.4;
  }

  return mult;
}

function getScoreDampener(scoreDiff, inning) {
  const absDiff = Math.abs(scoreDiff);

  // Blowouts reduce leverage significantly
  if (absDiff >= 7) return 0.1;
  if (absDiff >= 5) return 0.25;
  if (absDiff >= 4) return 0.4;

  // Close games: full leverage
  // But early-inning deficits are less severe
  if (absDiff === 0) return 1.0;  // Tie game
  if (absDiff === 1) return 0.95;
  if (absDiff === 2) return 0.85;
  // 3-run deficit: scale from 0.60 (early) to 0.72 (late)
  if (absDiff === 3) return 0.60 + (0.12 * Math.min(inning, 9) / 9);

  return 0.5;
}
```

### Example LI Values (Approximated)

| Situation | boLI | Inn Mult | Score Damp | **Final LI** |
|-----------|------|----------|------------|--------------|
| 1st inn, 0-0, empty, 0 out | 0.86 | 0.70 | 1.00 | **0.60** |
| 5th inn, down 5, empty, 1 out | 0.90 | 0.90 | 0.25 | **0.20** |
| 7th inn, tie, RISP, 2 out | 1.56 | 1.20 | 1.00 | **1.87** |
| 9th inn, up 1, bases loaded, 2 out | 2.67 | 2.00 | 0.95 | **5.07** |
| 9th inn (B), tie, bases loaded, 2 out | 2.67 | 2.60 | 1.00 | **6.94** |
| 9th inn (B), down 3, loaded, 2 out | 2.67 | 2.60 | 0.72 | **5.00** |

---

## 7. Clutch/Choke Integration

### From Binary to Continuous

**Old system**: Clutch value was fixed (+1, +2, etc.) if "close game" = true

**New system**: Clutch value = Base Value × LI Factor

```javascript
function calculateClutchValue(baseClutchValue, leverageIndex) {
  // LI Factor: 1.0 at average (LI=1), scales proportionally
  const liFactor = Math.sqrt(leverageIndex);  // Dampened scaling

  return baseClutchValue * liFactor;
}
```

### Updated Clutch Triggers

| Trigger | Base Value | At LI=1.0 | At LI=3.0 | At LI=6.0 |
|---------|------------|-----------|-----------|-----------|
| Go-ahead RBI | +1.0 | +1.0 | +1.73 | +2.45 |
| 2-out RBI | +1.0 | +1.0 | +1.73 | +2.45 |
| Walk-off HR | +3.0 | +3.0 | +5.20 | +7.35 |
| GIDP with RISP | -1.0 | -1.0 | -1.73 | -2.45 |
| K with bases loaded | -2.0 | -2.0 | -3.46 | -4.90 |
| Blown save | -2.0 | -2.0 | -3.46 | -4.90 |

### Automatic Clutch Detection

Instead of manually checking triggers, we can auto-detect clutch situations:

```javascript
function isClutchSituation(leverageIndex) {
  return leverageIndex >= 1.5;  // Above average = clutch
}

function isHighLeverageSituation(leverageIndex) {
  return leverageIndex >= 2.5;  // High stakes
}

function isExtremeLeverageSituation(leverageIndex) {
  return leverageIndex >= 5.0;  // Game on the line
}
```

### Removing "Close Game" Checks

The old master spec has many triggers that say "Close Game Required: Yes". With LI, these become automatic:

```javascript
// OLD
if (isGoAheadRBI && inning >= 7 && isCloseGame(scoreDiff)) {
  clutchValue += 1;
}

// NEW
if (isGoAheadRBI && inning >= 7) {
  clutchValue += 1.0 * Math.sqrt(getLeverageIndex(gameState));
}
```

Low-leverage situations (blowouts) will naturally produce minimal clutch/choke values.

---

## 8. Net Clutch Rating Formula

### The Core Metric

**Net Clutch Rating (NCR)** = Total Clutch Points - Total Choke Points

This is the number used for All-Star voting and awards.

### Per-Event Accumulation

```javascript
function accumulateClutchEvent(playerStats, eventType, baseValue, gameState) {
  const li = getLeverageIndex(gameState);
  const weightedValue = baseValue * Math.sqrt(li);

  if (baseValue > 0) {
    playerStats.clutchPoints += weightedValue;
    playerStats.clutchMoments += 1;
  } else {
    playerStats.chokePoints += Math.abs(weightedValue);
    playerStats.chokeMoments += 1;
  }

  playerStats.netClutch = playerStats.clutchPoints - playerStats.chokePoints;

  // Track LI for reliever pWAR
  playerStats.totalLI += li;
  playerStats.plateAppearancesWithLI += 1;
}
```

### Season Net Clutch Example

| Player | Clutch Moments | Clutch Pts | Choke Moments | Choke Pts | **Net Clutch** |
|--------|----------------|------------|---------------|-----------|----------------|
| Mays | 8 | +12.5 | 2 | -3.2 | **+9.3** |
| Crawford | 5 | +7.8 | 1 | -1.5 | **+6.3** |
| Simmons | 4 | +5.5 | 3 | -4.2 | **+1.3** |
| Torres | 2 | +2.1 | 5 | -6.8 | **-4.7** |

### Integration with All-Star Voting

From master spec, the voting formula is:
```
votes = (warScaled * 0.50) + (clutchScaled * 0.30) + (narrativeScaled * 0.20)
```

Net Clutch Rating directly feeds into `clutchScaled`.

---

## 9. Implementation Examples

### Example 1: Go-Ahead HR in 7th

```javascript
const gameState = {
  inning: 7,
  halfInning: 'TOP',
  outs: 1,
  runners: { first: true, second: false, third: false },
  scoreDifferential: -1,  // Down 1
  homeScore: 3,
  awayScore: 4
};

// Calculate LI
const li = approximateLI(gameState);
// boLI(1st, 1 out) = 1.10
// inningMult(7th) = 1.20
// scoreDamp(down 1) = 0.95
// LI = 1.10 × 1.20 × 0.95 = 1.25

// 2-run HR makes it 5-4 (go-ahead)
const baseClutch = 1.0;  // Go-ahead RBI in 7th+
const clutchValue = baseClutch * Math.sqrt(1.25);  // = 1.12

console.log(`Go-ahead HR: +${clutchValue.toFixed(2)} clutch`);
// Output: "Go-ahead HR: +1.12 clutch"
```

### Example 2: Bases Loaded K in 9th

```javascript
const gameState = {
  inning: 9,
  halfInning: 'BOTTOM',
  outs: 2,
  runners: { first: true, second: true, third: true },
  scoreDifferential: -2,  // Down 2 (could tie with grand slam)
  homeScore: 5,
  awayScore: 7
};

// Calculate LI
const li = approximateLI(gameState);
// boLI(loaded, 2 out) = 2.67
// inningMult(9th bottom) = 2.60
// scoreDamp(down 2) = 0.85
// LI = 2.67 × 2.60 × 0.85 = 5.90

// Batter strikes out (game over)
const baseChoke = -2.0;  // K with bases loaded
const chokeValue = baseChoke * Math.sqrt(5.90);  // = -4.86

console.log(`Bases loaded K: ${chokeValue.toFixed(2)} choke`);
// Output: "Bases loaded K: -4.86 choke"
```

### Example 3: Reliever Average LI for pWAR

```javascript
const closerSeasonStats = {
  appearances: 25,
  liPerAppearance: [2.1, 1.8, 2.5, 1.9, 2.3, /* ... */],  // Tracked per outing
};

// Calculate season gmLI (average leverage)
const totalLI = closerSeasonStats.liPerAppearance.reduce((a, b) => a + b, 0);
const avgLI = totalLI / closerSeasonStats.appearances;
// avgLI ≈ 1.85

// For pWAR leverage multiplier (per PWAR_CALCULATION_SPEC.md §7)
const liMultiplier = (avgLI + 1) / 2;  // = 1.425

console.log(`Closer gmLI: ${avgLI.toFixed(2)}, pWAR multiplier: ${liMultiplier.toFixed(2)}`);
// Output: "Closer gmLI: 1.85, pWAR multiplier: 1.43"
```

---

## 10. SMB4 Adaptations

### Shorter Games

SMB4 games are typically 5-7 innings. Adjust inning multipliers:

```javascript
function getInningMultiplierSMB4(inning, totalInnings, halfInning) {
  // Scale based on game progress
  const gameProgress = inning / totalInnings;

  if (gameProgress < 0.33) return 0.75;       // Early game
  if (gameProgress < 0.66) return 1.0;        // Mid game
  if (gameProgress < 0.85) return 1.3;        // Late game

  // Final inning
  let mult = 1.8;
  // Walk-off potential: only when tied or trailing in bottom of final inning
  // NOTE: This simplified version doesn't have scoreDiff access, see full implementation in Appendix
  if (halfInning === 'BOTTOM') mult *= 1.4;

  return mult;
}
```

### What We Can Track Now

| Component | Status | Notes |
|-----------|--------|-------|
| Inning | ✅ Tracked | Current implementation |
| Half inning | ✅ Tracked | TOP/BOTTOM |
| Outs | ✅ Tracked | 0-2 |
| Runners | ✅ Tracked | Base state |
| Score | ✅ Tracked | Home/Away |
| **LI calculation** | ✅ **IMPLEMENTED** | January 2026 |

### Implementation Status (January 2026)

The full Leverage Index calculation has been implemented in `useFameDetection.ts`:

```typescript
// Implemented in useFameDetection.ts
export const getLeverageIndex = (gameContext: {
  inning: number;
  outs: number;
  runners: { first: boolean; second: boolean; third: boolean };
  homeScore: number;
  awayScore: number;
  halfInning: 'TOP' | 'BOTTOM';
  totalInnings?: number;
}): number => {
  // Uses BASE_OUT_LI lookup table
  // Applies inning multipliers (late innings = higher leverage)
  // Applies score dampener (blowouts = reduced leverage)
  // Clamps result to [0.1, 10.0] range
};
```

**Key implementation details:**
- BASE_OUT_LI lookup table with 8 base states × 3 out states
- Inning multiplier scales from 0.75 (early) to 2.0+ (9th inning)
- Walk-off potential adds 1.4× boost in bottom of final inning when trailing/tied
- Score dampener reduces leverage in blowouts (5+ run differential = 0.25× or less)
- Win probability calculation also implemented using LI

### What This Enables

1. **Automatic clutch/choke tagging** - No manual "clutch situation" badge
2. **Proportional clutch values** - More important moments = bigger rewards/penalties
3. **Accurate reliever pWAR** - Real gmLI instead of save-based estimation
4. **Net Clutch Rating** - Feeds directly into All-Star/Award voting

---

## 10.5 Revenge Arc LI Modifier

> **⚠️ FUTURE FEATURE**: The Revenge Arc LI modifier is fully specified below but NOT YET IMPLEMENTED in code. This is a planned enhancement for the narrative system.

When players face former teammates with whom they had significant relationships (romantic breakup, mentor/protege, bully/victim), their emotional investment increases the situation's importance.

### Revenge Arc Types and Modifiers

| Arc Type | Source Relationship | LI Multiplier | Description |
|----------|---------------------|---------------|-------------|
| **SCORNED_LOVER** | ROMANTIC (ended) | 1.5× | Facing ex after breakup or trade |
| **ESTRANGED_FRIEND** | BEST_FRIENDS (ended) | 1.25× | Former best friend on opposing team |
| **SURPASSED_MENTOR** | MENTOR_PROTEGE | 1.3× | Protege facing former mentor |
| **VICTIM_REVENGE** | BULLY_VICTIM | 1.75× | Victim facing former bully |
| **BULLY_CONFRONTED** | BULLY_VICTIM | 0.9× | Bully facing improved former victim |

### Implementation

```typescript
/**
 * Apply revenge arc modifier to base LI
 * Called during LI calculation for any PA
 */
function getRevengeArcModifier(
  batterId: string,
  pitcherId: string,
  gameRevengeArcs: RevengeArc[]
): number {
  let modifier = 1.0;

  for (const arc of gameRevengeArcs) {
    // Check if current batter or pitcher is part of this revenge arc
    const isInvolved = arc.player.id === batterId || arc.player.id === pitcherId;
    const isFacingFormerPartner =
      (arc.player.id === batterId && arc.formerPartner.id === pitcherId) ||
      (arc.player.id === pitcherId && arc.formerPartner.id === batterId);

    if (isInvolved && isFacingFormerPartner) {
      // Use highest modifier if multiple arcs apply
      modifier = Math.max(modifier, arc.config.liMultiplier);
    }
  }

  return modifier;
}

// Integration with main LI calculation
function calculateLeverageIndexWithContext(gameContext, batterId, pitcherId) {
  const baseLI = getLeverageIndex(gameContext);
  const revengeArcs = getRevengeArcsForGame(gameContext.homeTeam, gameContext.awayTeam);
  const revengeModifier = getRevengeArcModifier(batterId, pitcherId, revengeArcs);

  return Math.min(10.0, baseLI * revengeModifier);  // Cap at 10.0
}
```

### Morale Effects from Revenge Situations

After each PA in a revenge arc context:

| Outcome | Morale Change (Revenge Player) |
|---------|-------------------------------|
| Success (hit, RBI, K as pitcher) | +10 to +15 (varies by arc type) |
| Failure (K, GIDP, hit allowed) | -6 to -12 (varies by arc type) |

### Narrative Integration

Beat reporters generate special commentary when revenge arcs are active:

- **Pre-game**: "Tonight marks the first time {player} faces {formerPartner} since the {event}."
- **During**: "The tension is palpable as {player} steps in against {formerPartner}."
- **Post-success**: "Revenge is sweet. {player} delivered when it mattered most."
- **Post-failure**: "The much-anticipated showdown didn't go as planned for {player}."

> **Cross-Reference**: See `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` §REVENGE_ARC_SYSTEM for full relationship system integration.

---

## 10.6 Cross-Team Romantic Matchup LI Modifier

> **⚠️ FUTURE FEATURE**: The Romantic Matchup LI modifier is fully specified below but NOT YET IMPLEMENTED in code. This is a planned enhancement for the narrative system.

When players face their romantic partner (dating, married) or ex-spouse on the opposing team, the emotional stakes are elevated. This creates memorable moments and narrative opportunities.

### Romantic Matchup Types and Modifiers

| Matchup Type | Relationship Status | LI Multiplier | Morale Effect |
|--------------|---------------------|---------------|---------------|
| **LOVERS_RIVALRY** | DATING (active) | 1.3× | +5 both on success |
| **MARRIED_OPPONENTS** | MARRIED (active) | 1.4× | +8 both on success |
| **EX_SPOUSE_REVENGE** | DIVORCED | 1.6× | +12 winner, -8 loser |

### Implementation

```typescript
/**
 * Cross-team romantic matchup types
 */
const ROMANTIC_MATCHUP_CONFIG = {
  LOVERS_RIVALRY: {
    relTypes: ['DATING'],
    liMultiplier: 1.3,
    moraleOnSuccess: { both: +5 },
    narrativeTag: 'LOVERS_SHOWDOWN'
  },
  MARRIED_OPPONENTS: {
    relTypes: ['MARRIED'],
    liMultiplier: 1.4,
    moraleOnSuccess: { both: +8 },
    moraleOnFailure: { both: -3 },  // Both sad when one struggles
    narrativeTag: 'SPOUSE_SHOWDOWN'
  },
  EX_SPOUSE_REVENGE: {
    relTypes: ['DIVORCED'],
    liMultiplier: 1.6,
    moraleOnSuccess: { winner: +12 },
    moraleOnFailure: { loser: -8 },
    narrativeTag: 'EX_SHOWDOWN'
  }
};

/**
 * Get romantic matchup modifier for current PA
 */
function getRomanticMatchupModifier(
  batterId: string,
  pitcherId: string,
  gameRomanticMatchups: RomanticMatchup[]
): number {
  let modifier = 1.0;

  for (const matchup of gameRomanticMatchups) {
    const { playerA, playerB, type } = matchup;

    // Check if batter/pitcher are the romantic pair
    const isPairInvolved =
      (playerA.id === batterId && playerB.id === pitcherId) ||
      (playerA.id === pitcherId && playerB.id === batterId);

    if (isPairInvolved) {
      const config = ROMANTIC_MATCHUP_CONFIG[matchup.narrativeAngle];
      if (config) {
        modifier = Math.max(modifier, config.liMultiplier);
      }
    }
  }

  return modifier;
}

/**
 * Home game family LI modifier
 * Players married to non-players get boosted at home (family in the stands!)
 * Additional boost for each child
 */
const HOME_FAMILY_LI_CONFIG = {
  NON_PLAYER_SPOUSE: 1.1,         // 1.1× LI at home if married to non-player
  PER_CHILD: 0.1,                 // +0.1× per child (additive)
  MAX_CHILD_BONUS: 0.5            // Cap at +0.5 (5 kids max effect)
};

function getFamilyHomeLIModifier(player, isHomeGame) {
  if (!isHomeGame) return 1.0;

  let modifier = 1.0;

  // Check for non-player spouse
  const marriage = getActiveRelationship(player, 'MARRIED');
  if (marriage && marriage.nonPlayerPartner) {
    modifier = HOME_FAMILY_LI_CONFIG.NON_PLAYER_SPOUSE;  // 1.1×

    // Add child bonus (+0.1 per kid, max +0.5)
    const childCount = marriage.children?.length || 0;
    if (childCount > 0) {
      const childBonus = Math.min(
        childCount * HOME_FAMILY_LI_CONFIG.PER_CHILD,
        HOME_FAMILY_LI_CONFIG.MAX_CHILD_BONUS
      );
      modifier += childBonus;  // e.g., 1.1 + 0.3 = 1.4× for 3 kids
    }
  }

  return modifier;
}

/**
 * Enhanced LI calculation including ALL relationship modifiers
 */
function calculateLeverageIndexWithAllModifiers(
  gameContext,
  batterId,
  pitcherId
) {
  const baseLI = getLeverageIndex(gameContext);
  const batter = getPlayer(batterId);
  const pitcher = getPlayer(pitcherId);

  // Get all relationship-based modifiers
  const revengeArcs = getRevengeArcsForGame(gameContext.homeTeam, gameContext.awayTeam);
  const romanticMatchups = detectCrossTeamRomanticMatchups(gameContext.homeTeam, gameContext.awayTeam);

  const revengeModifier = getRevengeArcModifier(batterId, pitcherId, revengeArcs);
  const romanticModifier = getRomanticMatchupModifier(batterId, pitcherId, romanticMatchups);

  // Home game family bonus (non-player spouse + kids)
  const isHomeGame = gameContext.halfInning === 'BOTTOM';
  const batterFamilyMod = isHomeGame ? getFamilyHomeLIModifier(batter, true) : 1.0;
  const pitcherFamilyMod = !isHomeGame ? getFamilyHomeLIModifier(pitcher, true) : 1.0;

  // Relationship modifiers use highest (don't stack with each other)
  const relationshipModifier = Math.max(revengeModifier, romanticModifier);

  // Family modifier stacks with relationship modifier
  const familyModifier = Math.max(batterFamilyMod, pitcherFamilyMod);

  // Final calculation: base × relationship × family
  const finalLI = baseLI * relationshipModifier * familyModifier;

  return Math.min(10.0, finalLI);  // Cap at 10.0
}
```

### Narrative Integration

Beat reporters generate special commentary for romantic matchups:

**LOVERS_RIVALRY (Dating)**:
- Pre-game: "{playerA} and {playerB}, currently dating, will be on opposite sides tonight."
- During PA: "Must be awkward at the dinner table after this one."
- Post-success: "Love conquers all? {player} just dominated their partner."

**MARRIED_OPPONENTS (Married)**:
- Pre-game: "In a unique twist, {playerA} faces spouse {playerB} tonight."
- During PA: "The {lastName} household will have some interesting conversations."
- Post-success: "Marriage counseling might be needed after that at-bat."

**EX_SPOUSE_REVENGE (Divorced)**:
- Pre-game: "The fallout continues. {playerA} faces ex-spouse {playerB} for the first time since the divorce."
- During PA: "The tension is thick as former spouses lock eyes."
- Post-success: "Living well is the best revenge, and {player} is living very well right now."

> **Cross-Reference**: See `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` §MARRIAGE_SYSTEM for full marriage/divorce mechanics.

---

## 10.7 Family Home Game LI Modifier

> **⚠️ FUTURE FEATURE**: The Family Home Game LI modifier is fully specified below but NOT YET IMPLEMENTED in code. This is a planned enhancement for the narrative system.

Players married to non-players (spouses outside the league) get an LI boost at home games - their family is in the stands cheering them on! This makes home games feel more meaningful for players with families.

### Family LI Modifiers

| Family Situation | Home Game LI Modifier |
|------------------|----------------------|
| **Married to non-player** | 1.1× base |
| **+ 1 child** | 1.2× base |
| **+ 2 children** | 1.3× base |
| **+ 3 children** | 1.4× base |
| **+ 4 children** | 1.5× base |
| **+ 5+ children** | 1.6× base (capped) |

### Example Calculation

```
Base LI: 2.5 (bases loaded, 2 outs, tie game)
Player: Juan Martinez (married to non-player wife, 2 kids)
Location: Home game (bottom of inning)

Family Modifier: 1.1 (spouse) + 0.2 (2 kids) = 1.3×
Final LI: 2.5 × 1.3 = 3.25
```

### Narrative Integration

Beat reporters can reference family in home game coverage:
- "With his wife Maria and their two kids watching from the family section, Martinez steps up in a huge spot."
- "You can see the extra motivation when the family's in the stands."
- "This ballpark means a little more to {player} - it's where his kids learned to love the game."

### Child Birth Events

Children are born through AI-driven events. Requirements:
- Player must be married (to player or non-player)
- Marriage must be 20+ games old
- 5% chance per season for eligible married players
- Each birth adds morale boost (+10) and creates narrative moment

> **Note**: This only applies to non-player spouses. When both spouses are players, they don't get the home game family bonus (since the spouse is on the field, not in the stands!).

---

## 11. Tracking Requirements

### Per-Plate Appearance Data

```typescript
interface PlateAppearanceContext {
  // Standard tracking (already implemented)
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  runners: { first: boolean; second: boolean; third: boolean };
  homeScore: number;
  awayScore: number;

  // NEW: LI tracking
  leverageIndex: number;  // Calculated at PA start

  // Result and clutch impact
  result: AtBatResult;
  clutchValue: number;    // Calculated after result
  chokeValue: number;
}
```

### Player Season Aggregates

```typescript
interface PlayerClutchStats {
  // Accumulated values
  clutchPoints: number;      // Sum of positive clutch values
  chokePoints: number;       // Sum of negative choke values (as positive)
  netClutch: number;         // clutchPoints - chokePoints

  // Counts
  clutchMoments: number;     // Number of clutch events
  chokeMoments: number;      // Number of choke events

  // For reliever pWAR
  totalLI: number;           // Sum of LI across all appearances
  plateAppearances: number;  // For calculating gmLI
  gmLI: number;              // totalLI / plateAppearances
}
```

### Game State Snapshot

```javascript
function captureGameState() {
  return {
    inning: gameState.inning,
    halfInning: gameState.halfInning,
    outs: gameState.outs,
    runners: { ...gameState.runners },
    homeScore: gameState.homeScore,
    awayScore: gameState.awayScore,
    battingTeam: gameState.halfInning === 'TOP' ? 'away' : 'home',
    scoreDifferential: calculateScoreDiff(gameState),
    leverageIndex: approximateLI(gameState)
  };
}
```

---

## 12. Reference Tables

### Quick LI Reference by Situation Type

| Situation | Typical LI Range |
|-----------|------------------|
| 1st inning, standard | 0.5 - 0.9 |
| Mid-game, close | 1.0 - 1.5 |
| 7th+ inning, close, RISP | 2.0 - 3.5 |
| 9th inning, 1-run game | 3.0 - 6.0 |
| Walk-off situation | 4.0 - 8.0 |
| Bases loaded, 2 out, tie, 9th | 7.0 - 10.0+ |
| Blowout (5+ run diff) | 0.1 - 0.3 |

### Clutch Value Multipliers

| LI Range | sqrt(LI) Multiplier | Clutch Impact |
|----------|---------------------|---------------|
| 0.0 - 0.5 | 0.0 - 0.71 | Minimal |
| 0.5 - 1.0 | 0.71 - 1.00 | Below average |
| 1.0 - 2.0 | 1.00 - 1.41 | Average to above |
| 2.0 - 4.0 | 1.41 - 2.00 | High leverage |
| 4.0 - 8.0 | 2.00 - 2.83 | Very high |
| 8.0+ | 2.83+ | Extreme |

### Base Choke/Clutch Values (for LI multiplication)

| Event | Base Value |
|-------|------------|
| Walk-off HR | +3.0 |
| Walk-off hit | +2.0 |
| Grand slam | +2.0 |
| Go-ahead RBI (7th+) | +1.0 |
| 2-out RBI | +1.0 |
| K with bases loaded | -2.0 |
| Blown save | -2.0 |
| GIDP with RISP | -1.0 |
| K with RISP | -1.0 |
| Error allowing run | -1.0 |

---

## Appendix: Complete LI Calculator

```javascript
// Complete implementation for copy/paste

const BASE_OUT_LI = [
  [0.86, 0.90, 0.93],  // Empty
  [1.07, 1.10, 1.24],  // 1st
  [1.15, 1.40, 1.56],  // 2nd
  [1.35, 1.55, 1.93],  // 1st+2nd
  [1.08, 1.65, 1.88],  // 3rd
  [1.32, 1.85, 2.25],  // 1st+3rd
  [1.45, 2.10, 2.50],  // 2nd+3rd
  [1.60, 2.25, 2.67]   // Loaded
];

function encodeBaseState(runners) {
  let state = 0;
  if (runners.first) state += 1;
  if (runners.second) state += 2;
  if (runners.third) state += 4;
  return state;
}

function getLeverageIndex(gameState, config = { totalInnings: 9 }) {
  const { inning, halfInning, outs, runners, homeScore, awayScore } = gameState;
  const { totalInnings } = config;

  const battingTeam = halfInning === 'TOP' ? 'away' : 'home';
  const scoreDiff = battingTeam === 'home'
    ? homeScore - awayScore
    : awayScore - homeScore;

  // 1. Base-out leverage
  const baseState = encodeBaseState(runners);
  const boLI = BASE_OUT_LI[baseState][outs];

  // 2. Inning multiplier
  const gameProgress = inning / totalInnings;
  let inningMult;
  if (gameProgress < 0.33) inningMult = 0.75;
  else if (gameProgress < 0.66) inningMult = 1.0;
  else if (gameProgress < 0.85) inningMult = 1.3;
  else inningMult = 1.8;

  // Walk-off potential boost
  if (inning >= totalInnings && halfInning === 'BOTTOM' && scoreDiff <= 0) {
    inningMult *= 1.4;
  }

  // 3. Score dampener
  const absDiff = Math.abs(scoreDiff);
  let scoreDamp;
  if (absDiff >= 7) scoreDamp = 0.1;
  else if (absDiff >= 5) scoreDamp = 0.25;
  else if (absDiff >= 4) scoreDamp = 0.4;
  else if (absDiff === 3) scoreDamp = 0.6;
  else if (absDiff === 2) scoreDamp = 0.85;
  else if (absDiff === 1) scoreDamp = 0.95;
  else scoreDamp = 1.0;

  // 4. Combine and clamp
  const li = boLI * inningMult * scoreDamp;
  return Math.max(0.1, Math.min(10.0, li));
}

function calculateClutchValue(baseValue, leverageIndex) {
  return baseValue * Math.sqrt(leverageIndex);
}

// Export for use
module.exports = { getLeverageIndex, calculateClutchValue, encodeBaseState };
```

---

*Last Updated: January 22, 2026*
*Version: 1.1 - Implementation status updated, core LI calculation now fully implemented in useFameDetection.ts*
