# KBL XHD - End-of-Season Ratings Adjustment Analysis (Austin's Sandbox)

## Complete Algorithm Extracted

Austin's sandbox uses a **clean, fully automated formula** with consistent logic across all players.

### The Formula

```
EOS Adjustment = (Weighted MVP Rating - Midpoint) × Adjustment Factor
```

Where:
- **Weighted MVP Rating** = MVP Score × MVP Weight Factor (from MVP Race sheet)
- **Midpoint** = Dynamically calculated MEDIAN of all players in that bucket
- **Adjustment Factor** = Selected based on grade AND whether difference is positive or negative

---

## 1. Bucket Assignment (Position Categories)

The bucket is assigned automatically based on position and bench status:

```javascript
function getBucket(position, isBench) {
  if (position === "MAN") return "0";  // Manager
  if (position === "SP") return "2";   // Starting Pitcher
  if (["SP/RP", "RP", "CP"].includes(position)) return "4";  // Relief Pitchers
  if (["1B", "2B", "3B", "SS", "LF", "CF", "RF", "C"].includes(position) && !isBench) {
    return "1";  // Starting Position Player
  }
  return "3";  // Bench Position Player
}
```

| Bucket | Category | Midpoint Source |
|--------|----------|-----------------|
| 0 | Manager | Fixed at 1 (no adjustment logic) |
| 1 | Starting Position Players | Median of all Bucket 1 players |
| 2 | Starting Pitchers (SP) | Median of all Bucket 2 players |
| 3 | Bench Position Players | Median of all Bucket 3 players |
| 4 | Relief Pitchers (SP/RP, RP, CP) | Median of all Bucket 4 players |

---

## 2. Midpoint Calculation (DYNAMIC!)

**Key Insight**: Austin's midpoints are **not fixed values** - they are the **MEDIAN** of all players in each bucket!

```
Midpoint[Bucket] = MEDIAN(Weighted MVP Ratings of all players in that bucket)
```

**Sample midpoints from this dataset:**
| Bucket | Midpoint | Meaning |
|--------|----------|---------|
| 1 (Starting Pos) | 3.18125 | Half of starters scored above, half below |
| 2 (Starting Pitchers) | 6.35 | Half of SPs scored above, half below |
| 3 (Bench Pos) | 4.66875 | Half of bench players scored above, half below |
| 4 (Relief) | 0.4125 | Half of relievers scored above, half below |

**Why this matters**: The midpoint shifts based on the entire population's performance each season. A player who scores 5.0 might be "above average" one season but "below average" another.

---

## 3. Difference Calculation

```
Difference = Weighted MVP Rating - Midpoint[Bucket]
```

- **Positive Difference**: Player overperformed relative to their position group
- **Negative Difference**: Player underperformed relative to their position group

---

## 4. Adjustment Factor Selection

The factor depends on:
1. The player's **current grade**
2. Whether the difference is **positive or negative**

### Positive Adjustment Factors (Overperformance)
Higher grades get SMALLER positive factors (harder to gain points)

| Grade | Positive Factor |
|-------|-----------------|
| S | 0.1 |
| A+ | 0.2 |
| A | 0.3 |
| A- | 0.4 |
| B+ | 0.5 |
| B | 0.75 |
| B- | 1.0 |
| C+ | 1.4 |
| C | 2.0 |
| C- | 2.5 |
| D+ or less | 3.0 |

### Negative Adjustment Factors (Underperformance)
Higher grades get LARGER negative factors (harsher penalties)

| Grade | Negative Factor |
|-------|-----------------|
| S | 10 |
| A+ | 8 |
| A | 7 |
| A- | 5 |
| B+ | 4 |
| B | 3 |
| B- | 2 |
| C+ | 1 |
| C | 0.8 |
| C- | 0.5 |
| D+ or less | 0.3 |

---

## 5. Final Adjustment Calculation

```javascript
function calculateEOSAdjustment(weightedMVP, bucket, grade) {
  // Get midpoint for this bucket
  const midpoint = MIDPOINTS[bucket];

  // Calculate difference
  const difference = weightedMVP - midpoint;

  // Select appropriate factor
  let factor;
  if (difference >= 0) {
    factor = POSITIVE_FACTORS[grade];
  } else {
    factor = NEGATIVE_FACTORS[grade];
  }

  // Calculate adjustment
  return difference * factor;
}
```

---

## Example Calculations

### Example 1: Barry Bonds (LF, Grade A, Bucket 1)
- Weighted MVP Rating: 13.6
- Midpoint (Bucket 1): 3.18125
- Difference: 13.6 - 3.18125 = **+10.41875** (overperformed)
- Factor (A, Positive): 0.3
- **Adjustment: 10.41875 × 0.3 = +3.13** (rounded)

### Example 2: Derek Jeter (SS, Grade B-, Bucket 1)
- Weighted MVP Rating: 0.375
- Midpoint (Bucket 1): 3.18125
- Difference: 0.375 - 3.18125 = **-2.80625** (underperformed)
- Factor (B-, Negative): 2
- **Adjustment: -2.80625 × 2 = -5.61** (rounded)

### Example 3: Jacob deGrom (SP, Grade A-, Bucket 2)
- Weighted MVP Rating: 18.275
- Midpoint (Bucket 2): 6.35
- Difference: 18.275 - 6.35 = **+11.925** (overperformed)
- Factor (A-, Positive): 0.4
- **Adjustment: 11.925 × 0.4 = +4.77**

### Example 4: Babe Ruth (Two Way, Grade S, Bucket 3 - Bench)
- Weighted MVP Rating: 2.03
- Midpoint (Bucket 3): 4.66875
- Difference: 2.03 - 4.66875 = **-2.63875** (underperformed)
- Factor (S, Negative): 10
- **Adjustment: -2.63875 × 10 = -26.39**
- Note in spreadsheet: "How DARE we!!!!" (even legends can be penalized!)

---

## Design Philosophy

### The Grade-Based Asymmetry

The system creates **asymmetric incentives** based on player quality:

**High-Grade Players (S, A+, A):**
- Small rewards for overperformance (factors 0.1-0.3)
- Harsh penalties for underperformance (factors 7-10)
- *Interpretation*: Stars are expected to perform well. Exceeding expectations is hard; failing them is devastating.

**Low-Grade Players (C, C-, D+):**
- Large rewards for overperformance (factors 2.0-3.0)
- Minimal penalties for underperformance (factors 0.3-0.8)
- *Interpretation*: Scrubs aren't expected to do much. Overperforming is a big deal; underperforming is... expected.

**Middle-Grade Players (B+, B, B-):**
- Moderate rewards and penalties
- The "prove yourself" tier where performance swings matter most

---

## Comparison to Original Tab

| Aspect | Original Tab | Austin's Sandbox |
|--------|--------------|------------------|
| Midpoints | Fixed values (9.5, 2.1, 7.0, 0.7) | Dynamic MEDIAN per bucket |
| Bucket Assignment | Manual selection | Formula-driven |
| Factor Selection | Some manual overrides | Fully automated by grade |
| Consistency | Inconsistent formulas | Uniform formulas for all |
| Audit Trail | Difficult | Easy to verify |

---

## Remaining Questions (Fewer Now!)

1. **Manager adjustment**: Managers use midpoint of 1 and seem to use a different path. How should manager performance affect ratings (if at all)?

2. **"Two Way" position**: Babe Ruth is listed as "Two Way" but falls into Bucket 3 (Bench). Is this intentional? Should two-way players have their own bucket or formula?

3. **Grade ambiguity**: Some players show grades like "B B-" or "B- B" - are these:
   - Pre-season vs post-season grades?
   - Current vs projected grades?
   - Should the factor use an average of both grades' factors?

4. **Bench designation**: Players with "Y" in the bench column go to Bucket 3 even if they have a starting position. Is this correct for your intended design?

---

## Recommended Implementation

Based on Austin's cleaner logic:

```javascript
const POSITIVE_FACTORS = {
  'S': 0.1, 'A+': 0.2, 'A': 0.3, 'A-': 0.4, 'B+': 0.5,
  'B': 0.75, 'B-': 1.0, 'C+': 1.4, 'C': 2.0, 'C-': 2.5, 'D+': 3.0
};

const NEGATIVE_FACTORS = {
  'S': 10, 'A+': 8, 'A': 7, 'A-': 5, 'B+': 4,
  'B': 3, 'B-': 2, 'C+': 1, 'C': 0.8, 'C-': 0.5, 'D+': 0.3
};

function calculateEOSAdjustment(players) {
  // Step 1: Assign buckets
  players.forEach(p => p.bucket = getBucket(p.position, p.isBench));

  // Step 2: Calculate midpoints per bucket (MEDIAN)
  const midpoints = {};
  for (const bucket of ['1', '2', '3', '4']) {
    const bucketPlayers = players.filter(p => p.bucket === bucket);
    const scores = bucketPlayers.map(p => p.weightedMVP).sort((a, b) => a - b);
    midpoints[bucket] = median(scores);
  }
  midpoints['0'] = 1; // Manager midpoint

  // Step 3: Calculate adjustments
  players.forEach(p => {
    const midpoint = midpoints[p.bucket];
    const difference = p.weightedMVP - midpoint;

    // Handle multi-grade entries (e.g., "B B-")
    const primaryGrade = p.grade.split(' ')[0];

    const factor = difference >= 0
      ? POSITIVE_FACTORS[primaryGrade]
      : NEGATIVE_FACTORS[primaryGrade];

    p.eosAdjustment = difference * factor;
  });

  return players;
}

function median(arr) {
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function getBucket(position, isBench) {
  if (position === "MAN") return "0";
  if (position === "SP") return "2";
  if (["SP/RP", "RP", "CP"].includes(position)) return "4";
  if (["1B", "2B", "3B", "SS", "LF", "CF", "RF", "C"].includes(position) && !isBench) {
    return "1";
  }
  return "3";
}
```

---

## Summary

Austin's sandbox provides a **clean, consistent, fully-automated algorithm** that:

1. Uses **dynamic midpoints** (MEDIAN of each bucket)
2. Assigns **buckets automatically** by position and bench status
3. Applies **grade-based factors** consistently
4. Creates **asymmetric incentives** (stars penalized heavily for underperformance, scrubs rewarded heavily for overperformance)

This is ready to implement directly once you clarify the 3-4 edge case questions above!
