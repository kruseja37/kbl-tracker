# End-of-Season Ratings Adjustment System v3.0

## Core Philosophy

Players are compared **against their positional peers**, not the entire league. This creates fair comparisons:
- Elite fielding CF who struggles at the plate competes against other CFs
- DHs compete against other DHs (no fielding penalty)
- Starting pitchers compete against starting pitchers
- Two-way players get **two separate adjustments** (one for each role)

---

## Position Categories for Peer Comparison

| Category | Positions Included | Notes |
|----------|-------------------|-------|
| **Catchers** | C | Unique defensive demands |
| **First Basemen** | 1B | |
| **Second Basemen** | 2B | |
| **Third Basemen** | 3B | |
| **Shortstops** | SS | |
| **Left Fielders** | LF | |
| **Center Fielders** | CF | |
| **Right Fielders** | RF | |
| **Designated Hitters** | DH | No fielding component |
| **Utility Players** | UTIL | 3+ positions, 15+ games each |
| **Starting Pitchers** | SP | 10+ starts |
| **Starter-Relievers** | SP/RP | Swingmen (starts ≈ relief appearances) |
| **Relief Pitchers** | RP | 20+ relief appearances, <10 saves |
| **Closing Pitchers** | CP | 10+ saves |
| **Two-Way Players** | TWO-WAY | 5+ starts AND 100+ PA |
| **Bench Position** | BENCH | <50% of team games at any position |
| **Managers** | MAN | Separate system |

---

## The Formula

```
Peer Median WAR = MEDIAN(WAR of all players at same position)
WAR Difference = Player WAR - Peer Median WAR
Raw Adjustment = WAR Difference × Grade Factor
Final Adjustment = Raw Adjustment (no caps if grade-weighted properly)
```

---

## Grade Factors (CORRECTED Asymmetry)

**Design Principle:**
- **High-grade players (S, A)**: Small rewards for overperformance, HARSH penalties for underperformance
- **Low-grade players (C, D)**: Generous rewards for overperformance, small penalties for underperformance

This reflects reality:
- Stars are EXPECTED to perform well; falling short is unacceptable
- Scrubs overperforming is remarkable and should be rewarded
- Scrubs underperforming is... expected

### Grade Factor Table

| Grade | Positive Factor | Negative Factor | Interpretation |
|-------|-----------------|-----------------|----------------|
| **S** | 0.10 | 2.50 | Legends: tiny upside, huge downside |
| **A+** | 0.15 | 2.00 | |
| **A** | 0.20 | 1.75 | |
| **A-** | 0.30 | 1.50 | |
| **B+** | 0.50 | 1.25 | |
| **B** | 0.75 | 1.00 | Neutral tier |
| **B-** | 1.00 | 0.85 | |
| **C+** | 1.25 | 0.70 | |
| **C** | 1.50 | 0.50 | |
| **C-** | 1.75 | 0.35 | |
| **D+** | 2.00 | 0.25 | Underdogs: big upside, tiny downside |
| **D** | 2.25 | 0.20 | |

### Example Calculations

**Example 1: S-Grade Legend Underperforms**
- Mike Trout (CF, Grade S)
- His WAR: 2.0
- CF Median WAR: 2.5
- WAR Difference: 2.0 - 2.5 = **-0.5** (underperformed)
- Negative Factor for S: 2.50
- **Adjustment: -0.5 × 2.50 = -1.25 rating points**

**Example 2: S-Grade Legend Overperforms**
- Mike Trout (CF, Grade S)
- His WAR: 8.0
- CF Median WAR: 2.5
- WAR Difference: 8.0 - 2.5 = **+5.5** (overperformed)
- Positive Factor for S: 0.10
- **Adjustment: 5.5 × 0.10 = +0.55 rating points** (small reward)

**Example 3: C-Grade Scrub Overperforms (Kara Kawaguchi Candidate)**
- Random backup (2B, Grade C)
- His WAR: 2.5
- 2B Median WAR: 1.8
- WAR Difference: 2.5 - 1.8 = **+0.7** (overperformed)
- Positive Factor for C: 1.50
- **Adjustment: 0.7 × 1.50 = +1.05 rating points** (rewarded!)

**Example 4: C-Grade Scrub Underperforms**
- Same backup (2B, Grade C)
- His WAR: 0.5
- 2B Median WAR: 1.8
- WAR Difference: 0.5 - 1.8 = **-1.3** (underperformed)
- Negative Factor for C: 0.50
- **Adjustment: -1.3 × 0.50 = -0.65 rating points** (mild penalty)

---

## Time-Weighted Grade Factors

Since grades can change mid-season (random events, All-Star traits), we weight by games played at each grade:

```javascript
function getTimeWeightedGradeFactor(player) {
  // player.gradeHistory = [
  //   { grade: 'C+', startGame: 1, endGame: 37 },   // 37 games at C+
  //   { grade: 'B-', startGame: 38, endGame: 82 }   // 45 games at B- (random event)
  // ]

  const totalGames = player.gamesPlayed;

  let weightedPositive = 0;
  let weightedNegative = 0;

  for (const period of player.gradeHistory) {
    const gamesAtGrade = period.endGame - period.startGame + 1;
    const weight = gamesAtGrade / totalGames;
    const factors = GRADE_FACTORS[period.grade];

    weightedPositive += factors.positive * weight;
    weightedNegative += factors.negative * weight;
  }

  return { positive: weightedPositive, negative: weightedNegative };
}
```

### Example: Grade Changed After Random Event

Player was C+ for 37 games, then B- for 45 games after a positive random event.

| Grade | Games | Weight | Pos Factor | Neg Factor |
|-------|-------|--------|------------|------------|
| C+ | 37 | 0.451 | 1.25 | 0.70 |
| B- | 45 | 0.549 | 1.00 | 0.85 |

**Weighted Positive Factor**: (1.25 × 0.451) + (1.00 × 0.549) = 0.564 + 0.549 = **1.11**
**Weighted Negative Factor**: (0.70 × 0.451) + (0.85 × 0.549) = 0.316 + 0.467 = **0.78**

---

## Two-Way Player Dual Adjustments

Two-way players receive **two separate adjustments**:
1. **Batting/Fielding Adjustment**: bWAR + fWAR compared to position player peers
2. **Pitching Adjustment**: pWAR compared to pitching peers

### Position Peer Selection for Two-Way Players

The position peer group is determined by where they played most:

```javascript
function getTwoWayPositionPeers(player) {
  // Find their primary position (excluding pitcher)
  const fieldingPositions = player.gamesAtPosition; // { 'RF': 45, '1B': 20, 'DH': 15 }
  const primaryPosition = Object.entries(fieldingPositions)
    .filter(([pos]) => pos !== 'P')
    .sort((a, b) => b[1] - a[1])[0][0];

  return primaryPosition; // Compare to other RFs for batting/fielding
}
```

### Pitching Peer Selection for Two-Way Players

```javascript
function getTwoWayPitchingPeers(player) {
  if (player.gamesStartedPitching >= 10) {
    if (player.gamesRelieved >= player.gamesStartedPitching) {
      return 'SP/RP';
    }
    return 'SP';
  }
  if (player.saves >= 10) return 'CP';
  return 'RP';
}
```

### Two-Way Adjustment Example: Babe Ruth

**Babe Ruth** (Two-Way, Grade S)
- Primary Position: RF (45 games)
- Pitching Role: SP (15 starts)

**Batting/Fielding Adjustment:**
- His bWAR + fWAR: 6.5
- RF Median (bWAR + fWAR): 2.8
- Difference: +3.7 (overperformed)
- S Positive Factor: 0.10
- **Batting Adjustment: +0.37**

**Pitching Adjustment:**
- His pWAR: 1.8
- SP Median pWAR: 2.5
- Difference: -0.7 (underperformed as SP)
- S Negative Factor: 2.50
- **Pitching Adjustment: -1.75**

**Total Adjustments for Babe Ruth:**
- +0.37 to apply to batting/fielding ratings
- -1.75 to apply to pitching ratings

*The manager decides which specific ratings to adjust within each category.*

---

## Manager System

### Manager Performance Adjustment

Managers are evaluated using **mWAR** (Manager WAR). Their performance creates a **team-wide bonus pool**.

```javascript
function calculateManagerBonus(manager) {
  const leagueMedianMWAR = getMedian(allManagers.map(m => m.mWAR));
  const difference = manager.mWAR - leagueMedianMWAR;

  // Manager's grade affects their factor too
  const factor = difference >= 0
    ? GRADE_FACTORS[manager.grade].positive
    : GRADE_FACTORS[manager.grade].negative;

  return difference * factor;
}
```

### Manager Choice System

The manager receives a **pool of adjustment points** (positive or negative) to distribute among their players.

```javascript
const managerBonus = calculateManagerBonus(manager); // e.g., +2.5 points

// Manager distributes this pool across their roster
// Example distribution:
const managerDistribution = [
  { player: 'Mike Trout', adjustment: +0.5, targetRating: 'Contact' },
  { player: 'Shohei Ohtani', adjustment: +0.3, targetRating: 'Velocity' },
  { player: 'Derek Jeter', adjustment: +0.2, targetRating: 'Arm' },
  // ... etc, must sum to managerBonus
];
```

**Rules for Manager Distribution:**
1. Total distributed must equal manager bonus (can't create or destroy points)
2. Each player can receive positive OR negative adjustment (manager's choice)
3. No single player can receive more than 50% of the pool
4. Manager can apply adjustments to any rating category

**If Manager Bonus is Negative:**
- Manager must distribute penalties across their roster
- This represents a poorly-managed team regressing
- Manager might spread it thin (-0.1 to many players) or target specific underperformers

---

## Dynamic Position Detection

Positions are **inferred from playing time**, not fixed:

```javascript
function detectPosition(player, seasonStats) {
  const {
    gamesStartedPitching,
    gamesRelieved,
    saves,
    plateAppearances,
    gamesAtPosition,  // { '1B': 45, 'SS': 20, 'LF': 10 }
    teamGames
  } = seasonStats;

  // Two-Way Detection
  if (gamesStartedPitching >= 5 && plateAppearances >= 100) {
    return 'TWO-WAY';
  }

  // Pitcher Detection
  if (gamesStartedPitching >= 10) {
    if (gamesRelieved >= gamesStartedPitching) return 'SP/RP';
    return 'SP';
  }
  if (gamesRelieved >= 20) {
    if (saves >= 10) return 'CP';
    return 'RP';
  }

  // Position Player Detection
  const positionEntries = Object.entries(gamesAtPosition)
    .filter(([pos]) => !['P', 'DH'].includes(pos) || pos === 'DH')
    .sort((a, b) => b[1] - a[1]);

  if (positionEntries.length === 0) return 'DH';

  // Utility Detection: 3+ positions with 15+ games each
  const significantPositions = positionEntries.filter(([pos, games]) => games >= 15);
  if (significantPositions.length >= 3) return 'UTIL';

  // Bench Detection: <50% of team games at primary position
  const [primaryPos, primaryGames] = positionEntries[0];
  if (primaryGames < teamGames * 0.5) return 'BENCH';

  // DH Detection: Most games at DH
  if (primaryPos === 'DH') return 'DH';

  return primaryPos; // C, 1B, 2B, 3B, SS, LF, CF, RF
}
```

---

## Complete Algorithm

```javascript
// ===========================================
// END-OF-SEASON RATINGS ADJUSTMENT v3.0
// ===========================================

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

function calculateAllAdjustments(players, managers) {
  // Step 1: Detect positions from playing time
  players.forEach(p => {
    p.detectedPosition = detectPosition(p, p.seasonStats);
  });

  // Step 2: Calculate peer medians for each position
  const peerMedians = {};
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL',
                     'SP', 'SP/RP', 'RP', 'CP', 'BENCH'];

  for (const pos of positions) {
    const posPlayers = players.filter(p => p.detectedPosition === pos);
    if (posPlayers.length > 0) {
      // For position players: use bWAR + fWAR
      // For pitchers: use pWAR
      const isPitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(pos);
      const wars = posPlayers.map(p => isPitcher ? p.pWAR : (p.bWAR + (p.fWAR || 0)));
      peerMedians[pos] = median(wars);
    }
  }

  // Step 3: Calculate individual adjustments
  players.forEach(p => {
    const gradeFactor = getTimeWeightedGradeFactor(p);

    if (p.detectedPosition === 'TWO-WAY') {
      // Two adjustments for two-way players
      const battingPos = getTwoWayPositionPeers(p);
      const pitchingPos = getTwoWayPitchingPeers(p);

      // Batting/Fielding adjustment
      const battingWAR = p.bWAR + (p.fWAR || 0);
      const battingDiff = battingWAR - peerMedians[battingPos];
      const battingFactor = battingDiff >= 0 ? gradeFactor.positive : gradeFactor.negative;
      p.battingAdjustment = battingDiff * battingFactor;

      // Pitching adjustment
      const pitchingDiff = p.pWAR - peerMedians[pitchingPos];
      const pitchingFactor = pitchingDiff >= 0 ? gradeFactor.positive : gradeFactor.negative;
      p.pitchingAdjustment = pitchingDiff * pitchingFactor;

      p.totalAdjustment = p.battingAdjustment + p.pitchingAdjustment;

    } else if (['SP', 'SP/RP', 'RP', 'CP'].includes(p.detectedPosition)) {
      // Pitcher adjustment
      const diff = p.pWAR - peerMedians[p.detectedPosition];
      const factor = diff >= 0 ? gradeFactor.positive : gradeFactor.negative;
      p.totalAdjustment = diff * factor;

    } else {
      // Position player adjustment
      const war = p.bWAR + (p.fWAR || 0);
      const diff = war - peerMedians[p.detectedPosition];
      const factor = diff >= 0 ? gradeFactor.positive : gradeFactor.negative;
      p.totalAdjustment = diff * factor;
    }
  });

  // Step 4: Calculate manager bonuses
  const managerMWARs = managers.map(m => m.mWAR);
  const managerMedian = median(managerMWARs);

  managers.forEach(m => {
    const diff = m.mWAR - managerMedian;
    const gradeFactor = getTimeWeightedGradeFactor(m);
    const factor = diff >= 0 ? gradeFactor.positive : gradeFactor.negative;
    m.teamBonusPool = diff * factor;
    // Manager will distribute this pool via UI
  });

  return { players, managers };
}

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
```

---

## Player Choice: Where to Apply Adjustments

After calculating total adjustment, **the player (user) decides** where to apply rating points:

### Position Players Can Adjust:
- **Contact** (L/R)
- **Power** (L/R)
- **Speed**
- **Fielding**
- **Arm**

### Pitchers Can Adjust:
- **Velocity**
- **Junk**
- **Accuracy**
- **Arm Slot** (maybe?)

### Two-Way Players:
- Batting adjustment → position player ratings only
- Pitching adjustment → pitching ratings only

### UI Flow:
```
┌─────────────────────────────────────────────────────────┐
│  END-OF-SEASON RATINGS ADJUSTMENT                       │
│  Mike Trout (CF, Grade S)                               │
├─────────────────────────────────────────────────────────┤
│  Your WAR: 8.2                                          │
│  CF Median WAR: 2.5                                     │
│  Difference: +5.7 (Overperformed!)                      │
│  Grade Factor (S, Positive): 0.10                       │
│  ─────────────────────────────────────────────────      │
│  TOTAL ADJUSTMENT: +0.57 points                         │
├─────────────────────────────────────────────────────────┤
│  Distribute your +0.57 points:                          │
│                                                         │
│  Contact (L):  [+0.00] ▼  Current: 85                   │
│  Contact (R):  [+0.20] ▼  Current: 90 → 90.2            │
│  Power (L):    [+0.00] ▼  Current: 78                   │
│  Power (R):    [+0.17] ▼  Current: 82 → 82.17           │
│  Speed:        [+0.10] ▼  Current: 75 → 75.1            │
│  Fielding:     [+0.10] ▼  Current: 88 → 88.1            │
│  Arm:          [+0.00] ▼  Current: 92                   │
│                                                         │
│  Remaining: 0.00                    [CONFIRM]           │
└─────────────────────────────────────────────────────────┘
```

---

## Do We Need Caps?

**Short answer: Probably not, if grade factors are tuned correctly.**

The grade factors naturally limit extreme adjustments:
- An S-grade player with +8.0 WAR above median only gets +0.8 adjustment
- A D-grade player with +3.0 WAR above median gets +6.75 adjustment (big, but they're a scrub becoming decent)

**However**, we should monitor for edge cases:
- What if a D-grade player puts up +10 WAR? That's +22.5 adjustment (massive)
- This might be rare enough to not need caps, OR
- We could add soft caps that kick in only at extremes

**Recommendation**: Let it drift naturally for a few seasons, then add caps only if needed.

---

## Summary

| Aspect | v3.0 Approach |
|--------|---------------|
| **Comparison** | Position-to-position peers |
| **Baseline** | Median WAR of same position |
| **Metric** | WAR (bWAR+fWAR for hitters, pWAR for pitchers) |
| **Grade Impact** | Time-weighted factors; high grades = small up/big down |
| **Two-Way** | Dual adjustments (one per role) |
| **Managers** | Bonus pool distributed by manager choice |
| **Caps** | None initially; monitor and add if needed |
| **Player Choice** | User decides which ratings to adjust |

---

## Next Steps

1. Integrate with grade tracking system (time-weighted history)
2. Build UI for adjustment distribution
3. Build UI for manager distribution
4. Test with sample data to verify balance
5. Monitor league-wide totals across seasons
