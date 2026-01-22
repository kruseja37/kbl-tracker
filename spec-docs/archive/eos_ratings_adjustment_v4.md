# End-of-Season Ratings Adjustment System v4.0

## Core Philosophy

Each WAR component maps to specific rating categories. Players are compared against positional peers, and adjustments are **automatically applied** to the ratings that make sense for each skill area.

---

## WAR Component → Rating Category Mapping

| WAR Component | What It Measures | Rating Categories Affected | Cap |
|---------------|------------------|---------------------------|-----|
| **bWAR** | Batting value | Power (L/R), Contact (L/R) | ±10 total |
| **rWAR** | Baserunning value | Speed | ±10 |
| **fWAR** | Fielding value | Fielding, Arm | ±10 total |
| **pWAR** | Pitching value | Velocity, Junk, Accuracy | ±10 total |

### How It Works for Different Player Types

**Position Players:**
- bWAR → Power/Contact adjustments
- rWAR → Speed adjustment
- fWAR → Fielding/Arm adjustments

**Pitchers:**
- pWAR → Velocity/Junk/Accuracy adjustments
- fWAR → Fielding adjustment (pitchers field too!)
- bWAR → Power/Contact adjustments (if they bat)
- rWAR → Speed adjustment (if they run bases)

**Two-Way Players:**
- All four components apply naturally!

**DHs:**
- bWAR → Power/Contact adjustments
- rWAR → Speed adjustment
- fWAR → None (they don't field)

---

## Position Detection Parameters

### Primary Position Determination

A player's **primary position** is determined by where they played the most games:

```javascript
function getPrimaryPosition(player) {
  const positionGames = player.gamesAtPosition; // { 'SS': 80, '2B': 30, '3B': 10 }

  // Sort by games played descending
  const sorted = Object.entries(positionGames)
    .filter(([pos]) => pos !== 'P') // Exclude pitching for position players
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return 'DH';

  return sorted[0][0]; // Position with most games
}
```

### Utility Player (UTIL) Detection

**Parameters:**
- Must have played **3+ different positions**
- Must have **15+ games at each** of those positions
- No single position exceeds **60%** of their total fielding games

```javascript
function isUtilityPlayer(player) {
  const positionGames = player.gamesAtPosition;
  const totalFieldingGames = Object.values(positionGames).reduce((a, b) => a + b, 0);

  // Count positions with 15+ games
  const significantPositions = Object.entries(positionGames)
    .filter(([pos, games]) => games >= 15 && pos !== 'P' && pos !== 'DH');

  if (significantPositions.length < 3) return false;

  // Check that no single position dominates (>60%)
  const maxGames = Math.max(...significantPositions.map(([_, g]) => g));
  if (maxGames > totalFieldingGames * 0.60) return false;

  return true;
}
```

**Example UTIL Player:**
- SS: 35 games (29%)
- 2B: 40 games (33%)
- 3B: 25 games (21%)
- LF: 20 games (17%)
- Total: 120 games, 4 positions with 15+, none >60% → **UTIL**

### Bench Player Detection

**Parameters:**
- Played **less than 50%** of team's total games at their primary position
- AND not a UTIL player (UTIL is a distinct category)

```javascript
function isBenchPlayer(player, teamTotalGames) {
  if (isUtilityPlayer(player)) return false; // UTIL takes precedence

  const primaryPos = getPrimaryPosition(player);
  const gamesAtPrimary = player.gamesAtPosition[primaryPos] || 0;

  return gamesAtPrimary < teamTotalGames * 0.50;
}
```

**Example Bench Player:**
- Team played 82 games
- Player's primary position: C with 35 games (43%)
- 35 < 41 (50% of 82) → **BENCH**

### Pitcher Category Detection

```javascript
function getPitcherCategory(player) {
  const { gamesStartedPitching, gamesRelieved, saves } = player.seasonStats;

  // Starting Pitcher: 10+ starts, starts > relief appearances
  if (gamesStartedPitching >= 10 && gamesStartedPitching > gamesRelieved) {
    return 'SP';
  }

  // Swingman (SP/RP): 10+ starts AND significant relief work
  if (gamesStartedPitching >= 10 && gamesRelieved >= gamesStartedPitching * 0.5) {
    return 'SP/RP';
  }

  // Closer: 10+ saves
  if (saves >= 10) {
    return 'CP';
  }

  // Relief Pitcher: 20+ relief appearances
  if (gamesRelieved >= 20) {
    return 'RP';
  }

  // Spot starter/long reliever - falls into SP/RP
  if (gamesStartedPitching >= 5) {
    return 'SP/RP';
  }

  return 'RP'; // Default for pitchers
}
```

### Two-Way Player Detection

```javascript
function isTwoWayPlayer(player) {
  const { gamesStartedPitching, gamesRelieved, plateAppearances } = player.seasonStats;

  // Must have meaningful contributions in BOTH roles
  const pitchingGames = gamesStartedPitching + gamesRelieved;

  return pitchingGames >= 10 && plateAppearances >= 100;
}
```

---

## Complete Position Category Summary

| Category | Detection Criteria |
|----------|-------------------|
| **C** | Primary position = C, started 50%+ of team games |
| **1B** | Primary position = 1B, started 50%+ of team games |
| **2B** | Primary position = 2B, started 50%+ of team games |
| **3B** | Primary position = 3B, started 50%+ of team games |
| **SS** | Primary position = SS, started 50%+ of team games |
| **LF** | Primary position = LF, started 50%+ of team games |
| **CF** | Primary position = CF, started 50%+ of team games |
| **RF** | Primary position = RF, started 50%+ of team games |
| **DH** | Primary position = DH, started 50%+ of team games |
| **UTIL** | 3+ positions with 15+ games each, none >60% |
| **BENCH** | <50% of team games at primary position, not UTIL |
| **SP** | 10+ starts, starts > relief appearances |
| **SP/RP** | 10+ starts, relief ≥ 50% of starts |
| **RP** | 20+ relief appearances, <10 saves |
| **CP** | 10+ saves |
| **TWO-WAY** | 10+ pitching games AND 100+ PA |

---

## The Adjustment Formula

### Step 1: Calculate Peer Medians

For each WAR component, calculate the median among positional peers:

```javascript
function calculatePeerMedians(players) {
  const medians = {};

  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH',
                     'UTIL', 'BENCH', 'SP', 'SP/RP', 'RP', 'CP', 'TWO-WAY'];

  const warComponents = ['bWAR', 'rWAR', 'fWAR', 'pWAR'];

  for (const pos of positions) {
    medians[pos] = {};
    const posPlayers = players.filter(p => p.detectedPosition === pos);

    for (const component of warComponents) {
      const values = posPlayers
        .map(p => p[component] || 0)
        .filter(v => v !== 0 || posPlayers.some(p => p[component] !== undefined));

      medians[pos][component] = values.length > 0 ? median(values) : 0;
    }
  }

  return medians;
}
```

### Step 2: Calculate Raw Difference

```javascript
function calculateWARDifference(player, peerMedians) {
  const pos = player.detectedPosition;

  return {
    bWAR: (player.bWAR || 0) - (peerMedians[pos].bWAR || 0),
    rWAR: (player.rWAR || 0) - (peerMedians[pos].rWAR || 0),
    fWAR: (player.fWAR || 0) - (peerMedians[pos].fWAR || 0),
    pWAR: (player.pWAR || 0) - (peerMedians[pos].pWAR || 0),
  };
}
```

### Step 3: Apply Grade Factor (Time-Weighted)

```javascript
const GRADE_FACTORS = {
  'S':  { positive: 0.10, negative: 2.50 },
  'A+': { positive: 0.15, negative: 2.00 },
  'A':  { positive: 0.20, negative: 1.75 },
  'A-': { positive: 0.30, negative: 1.50 },
  'B+': { positive: 0.50, negative: 1.25 },
  'B':  { positive: 0.75, negative: 1.00 },
  'B-': { positive: 1.00, negative: 0.85 },
  'C+': { positive: 1.25, negative: 0.70 },
  'C':  { positive: 1.50, negative: 0.50 },
  'C-': { positive: 1.75, negative: 0.35 },
  'D+': { positive: 2.00, negative: 0.25 },
  'D':  { positive: 2.25, negative: 0.20 },
};

function applyGradeFactor(difference, gradeFactor) {
  const factor = difference >= 0 ? gradeFactor.positive : gradeFactor.negative;
  return difference * factor;
}
```

### Step 4: Apply Caps and Round

```javascript
function applyCapAndRound(adjustment, cap = 10) {
  // Cap at ±10 (or specified cap)
  const capped = Math.max(-cap, Math.min(cap, adjustment));

  // Round to nearest whole number
  return Math.round(capped);
}
```

### Step 5: Scale to Bell Curve (±20 max league-wide)

To ensure adjustments form a reasonable bell curve with ±20 as the extremes:

```javascript
function scaleToLeagueBellCurve(allPlayerAdjustments) {
  // Find the max absolute adjustment in the league (per category)
  const categories = ['batting', 'baserunning', 'fielding', 'pitching'];

  for (const category of categories) {
    const adjustments = allPlayerAdjustments.map(p => p[category] || 0);
    const maxAbs = Math.max(...adjustments.map(Math.abs));

    if (maxAbs > 0) {
      // Scale so max = 10 (per category cap)
      const scaleFactor = Math.min(1, 10 / maxAbs);

      allPlayerAdjustments.forEach(p => {
        if (p[category]) {
          p[category] = Math.round(p[category] * scaleFactor);
        }
      });
    }
  }

  return allPlayerAdjustments;
}
```

---

## Complete Adjustment Calculation

```javascript
function calculateAllAdjustments(players) {
  // Step 1: Detect positions
  players.forEach(p => {
    p.detectedPosition = detectPosition(p);
  });

  // Step 2: Calculate peer medians
  const peerMedians = calculatePeerMedians(players);

  // Step 3: Calculate adjustments for each player
  players.forEach(p => {
    const gradeFactor = getTimeWeightedGradeFactor(p);
    const warDiff = calculateWARDifference(p, peerMedians);

    // Calculate raw adjustments per category
    const rawBatting = applyGradeFactor(warDiff.bWAR, gradeFactor);
    const rawBaserunning = applyGradeFactor(warDiff.rWAR, gradeFactor);
    const rawFielding = applyGradeFactor(warDiff.fWAR, gradeFactor);
    const rawPitching = applyGradeFactor(warDiff.pWAR, gradeFactor);

    // Apply caps (±10 per category) and round
    p.adjustments = {
      batting: applyCapAndRound(rawBatting, 10),      // → Power, Contact
      baserunning: applyCapAndRound(rawBaserunning, 10), // → Speed
      fielding: applyCapAndRound(rawFielding, 10),    // → Fielding, Arm
      pitching: applyCapAndRound(rawPitching, 10),    // → Velocity, Junk, Accuracy
    };
  });

  // Step 4: Optional - scale to league bell curve
  // scaleToLeagueBellCurve(players);

  return players;
}
```

---

## Distributing Adjustments Within Categories

Each category adjustment gets split across its ratings. Player chooses distribution:

### Batting Adjustment (bWAR → Power/Contact)

```
Total: +6
┌─────────────────────────────────────────┐
│ Distribute +6 points:                   │
│                                         │
│ Power (L):   [+1] ▼    Current: 65 → 66 │
│ Power (R):   [+2] ▼    Current: 70 → 72 │
│ Contact (L): [+1] ▼    Current: 60 → 61 │
│ Contact (R): [+2] ▼    Current: 75 → 77 │
│                                         │
│ Remaining: 0                            │
└─────────────────────────────────────────┘
```

### Baserunning Adjustment (rWAR → Speed)

```
Total: +3
┌─────────────────────────────────────────┐
│ Speed: 70 → 73 (+3)                     │
│ (Auto-applied - only one rating)        │
└─────────────────────────────────────────┘
```

### Fielding Adjustment (fWAR → Fielding/Arm)

```
Total: +4
┌─────────────────────────────────────────┐
│ Distribute +4 points:                   │
│                                         │
│ Fielding: [+2] ▼    Current: 80 → 82    │
│ Arm:      [+2] ▼    Current: 75 → 77    │
│                                         │
│ Remaining: 0                            │
└─────────────────────────────────────────┘
```

### Pitching Adjustment (pWAR → Velocity/Junk/Accuracy)

```
Total: -5
┌─────────────────────────────────────────┐
│ Distribute -5 points:                   │
│                                         │
│ Velocity: [-2] ▼    Current: 85 → 83    │
│ Junk:     [-2] ▼    Current: 70 → 68    │
│ Accuracy: [-1] ▼    Current: 75 → 74    │
│                                         │
│ Remaining: 0                            │
└─────────────────────────────────────────┘
```

---

## Manager Adjustment System

### Base Manager Pool

Managers receive a **base pool of ±20 points** to distribute, PLUS a bonus/penalty based on their mWAR performance.

```javascript
function calculateManagerPool(manager, allManagers) {
  const BASE_POOL = 20; // All managers get this to distribute

  // Calculate mWAR-based bonus/penalty
  const leagueMedianMWAR = median(allManagers.map(m => m.mWAR));
  const mwarDiff = manager.mWAR - leagueMedianMWAR;

  const gradeFactor = getTimeWeightedGradeFactor(manager);
  const factor = mwarDiff >= 0 ? gradeFactor.positive : gradeFactor.negative;
  const mwarBonus = Math.round(mwarDiff * factor * 5); // Scale mWAR impact

  // Manager of the Year bonus
  const moyBonus = manager.isManagerOfYear ? 5 : 0;

  // Total pool (can be negative if very poor manager!)
  const totalPool = BASE_POOL + mwarBonus + moyBonus;

  return {
    basePool: BASE_POOL,
    mwarBonus: mwarBonus,
    moyBonus: moyBonus,
    totalPool: totalPool,
  };
}
```

### Manager Distribution Rules

1. **Total distributed must equal pool** (use it or lose it)
2. **Max 50% to any single player** (e.g., max ±10 if pool is ±20)
3. **Can apply positive OR negative** to any player (manager's strategic choice)
4. **Can target any rating category** (batting, baserunning, fielding, pitching)

### Manager Distribution UI

```
┌─────────────────────────────────────────────────────────────┐
│  MANAGER ADJUSTMENT - Joe Manager (Twins)                   │
├─────────────────────────────────────────────────────────────┤
│  Base Pool:         +20                                     │
│  mWAR Bonus:        +4  (Above median)                      │
│  Manager of Year:   +5                                      │
│  ─────────────────────────────────────────                  │
│  TOTAL POOL:        +29 points                              │
│  Max per player:    +14 (50%)                               │
├─────────────────────────────────────────────────────────────┤
│  Player             Category      Adjustment                │
│  ─────────────────────────────────────────                  │
│  Mike Trout         Batting       [+5] ▼                    │
│  Shohei Ohtani      Pitching      [+8] ▼                    │
│  Derek Jeter        Fielding      [+3] ▼                    │
│  Random Scrub       Speed         [+2] ▼                    │
│  Struggling Vet     Batting       [-2] ▼  (yes, negative!)  │
│  ...                                                        │
│                                                             │
│  Remaining: +13                    [ADD PLAYER] [CONFIRM]   │
└─────────────────────────────────────────────────────────────┘
```

---

## Example: Full Player Adjustment

### Jacob deGrom (SP, Grade A-)

**WAR Components:**
- bWAR: 0.3 (he bats occasionally)
- rWAR: 0.1
- fWAR: 0.2
- pWAR: 6.8

**SP Peer Medians:**
- bWAR: 0.1
- rWAR: 0.0
- fWAR: 0.1
- pWAR: 2.5

**WAR Differences:**
- bWAR: +0.2
- rWAR: +0.1
- fWAR: +0.1
- pWAR: +4.3

**Grade Factor (A-):**
- Positive: 0.30
- Negative: 1.50

**Raw Adjustments:**
- Batting: 0.2 × 0.30 = +0.06 → rounds to **0**
- Baserunning: 0.1 × 0.30 = +0.03 → rounds to **0**
- Fielding: 0.1 × 0.30 = +0.03 → rounds to **0**
- Pitching: 4.3 × 0.30 = +1.29 → rounds to **+1**

**Final Adjustments for deGrom:**
- Batting: 0
- Baserunning: 0
- Fielding: 0
- Pitching: +1 (distributes across Velocity/Junk/Accuracy)

*Note: Even with great pWAR, his A- grade limits upside to +1. This is intentional - he's already elite!*

---

### Kara Kawaguchi Candidate (Backup 2B, Grade C-)

**WAR Components:**
- bWAR: 1.8
- rWAR: 0.5
- fWAR: 0.8
- pWAR: 0.0

**BENCH Peer Medians:**
- bWAR: 0.5
- rWAR: 0.1
- fWAR: 0.2
- pWAR: 0.0

**WAR Differences:**
- bWAR: +1.3
- rWAR: +0.4
- fWAR: +0.6
- pWAR: 0.0

**Grade Factor (C-):**
- Positive: 1.75
- Negative: 0.35

**Raw Adjustments:**
- Batting: 1.3 × 1.75 = +2.28 → rounds to **+2**
- Baserunning: 0.4 × 1.75 = +0.70 → rounds to **+1**
- Fielding: 0.6 × 1.75 = +1.05 → rounds to **+1**
- Pitching: 0

**Final Adjustments:**
- Batting: +2 (distributes across Power/Contact)
- Baserunning: +1 (auto-applied to Speed)
- Fielding: +1 (distributes across Fielding/Arm)
- Pitching: 0

*Note: This scrub overperformed and gets rewarded! C- grade means big multiplier on positive.*

---

### Struggling Legend (CF, Grade S)

**WAR Components:**
- bWAR: 1.5
- rWAR: 0.2
- fWAR: 0.5
- pWAR: 0.0

**CF Peer Medians:**
- bWAR: 2.8
- rWAR: 0.4
- fWAR: 0.8
- pWAR: 0.0

**WAR Differences:**
- bWAR: -1.3
- rWAR: -0.2
- fWAR: -0.3
- pWAR: 0.0

**Grade Factor (S):**
- Positive: 0.10
- Negative: 2.50

**Raw Adjustments:**
- Batting: -1.3 × 2.50 = -3.25 → rounds to **-3**
- Baserunning: -0.2 × 2.50 = -0.50 → rounds to **-1** (rounds away from zero at 0.5)
- Fielding: -0.3 × 2.50 = -0.75 → rounds to **-1**
- Pitching: 0

**Final Adjustments:**
- Batting: -3 (distributes across Power/Contact - ouch!)
- Baserunning: -1 (auto-applied to Speed)
- Fielding: -1 (distributes across Fielding/Arm)
- Pitching: 0

*Note: S-grade legend underperformed and gets HAMMERED. 2.50 negative multiplier is brutal!*

---

## Summary: v4.0 System

| Aspect | Approach |
|--------|----------|
| **Comparison** | Position-to-position peers |
| **Metric** | Individual WAR components (bWAR, rWAR, fWAR, pWAR) |
| **Mapping** | Each component → specific rating categories |
| **Grade Asymmetry** | High grade = tiny up, huge down; Low grade = big up, tiny down |
| **Time Weighting** | Grade factor weighted by games at each grade |
| **Caps** | ±10 per category |
| **Rounding** | Nearest whole number |
| **Manager Pool** | ±20 base + mWAR bonus + MOY bonus |
| **Manager Max** | 50% of pool to any single player |
| **Timing** | End of season only |

---

## Position Detection Summary

| Category | Criteria |
|----------|----------|
| **Primary Position** | Position with most games played |
| **UTIL** | 3+ positions, 15+ games each, none >60% |
| **BENCH** | <50% of team games at primary position |
| **SP** | 10+ starts, starts > relief appearances |
| **SP/RP** | 10+ starts, relief ≥ 50% of starts |
| **RP** | 20+ relief, <10 saves |
| **CP** | 10+ saves |
| **TWO-WAY** | 10+ pitching games AND 100+ PA |

---

## Open Questions

1. **Rounding at 0.5**: Should -0.5 round to 0 or -1? (Currently rounding away from zero)

2. **DHs and fWAR**: DHs have no fWAR. Should they get 0 fielding adjustment, or should we exclude that category entirely for them?

3. **Very small positions**: What if there are only 2 CPs in the league? Is median of 2 meaningful, or should we group them with RPs?

4. **Negative pools for bad managers**: If a manager's pool is negative (poor mWAR), they MUST apply penalties to their team. Is that the intended behavior?
