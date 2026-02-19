# KBL XHD - End-of-Season Ratings Adjustment Analysis

## Current System Analysis

### The Algorithm (As Documented)
```
EOS Adjustment = (Weighted MVP Rating - Midpoint) × Adjustment Factor
```

### Midpoints by Position Type
| Position Type | Midpoint |
|---------------|----------|
| Starting Position Players | 9.5 |
| Bench Position Players | 2.1 |
| Starting Pitchers (SP) | 7.0 |
| SP/RPs, RPs, CPs | 0.7 |

### Adjustment Factors by Grade
| Grade | MVP Weight | Positive Factor | Negative Factor |
|-------|------------|-----------------|-----------------|
| S | 0.5 | 0.1 | 10 |
| A+ | 0.6 | 0.2 | 8 |
| A | 0.7 | 0.3 | 7 |
| A- | 0.8 | 0.4 | 5 |
| B+ | 0.9 | 0.5 | 4 |
| B | 1.0 | 0.75 | 3 |
| B- | 1.1 | 1.0 | 2 |
| C+ | 1.2 | 1.4 | 1 |
| C | 1.3 | 2.0 | 0.8 |
| C- | 1.4 | 2.5 | 0.5 |
| D+ (or less) | 1.5 | 3.0 | 0.3 |

---

## What I Found in the Spreadsheet

**The formulas are NOT consistently automated.** Each player has a manually-entered formula with specific cell references that don't always follow the documented rules.

### Examples of Inconsistency:

1. **Dave Stieb (SP, Grade B+)**
   - Formula uses `$B$5` (Starting Pos midpoint = 9.5)
   - Should use `$D$5` (SP midpoint = 7.0)
   - Factor uses `C14` (B positive = 0.75), close but not exact match for B+

2. **Kyle Seager (3B Starter, Grade B-)**
   - Formula uses `$C$5` (Bench midpoint = 2.1)
   - Should use `$B$5` (Starting Pos midpoint = 9.5)
   - This creates a huge swing in the calculation

3. **Alexandria Kemp (SS Bench, Grade C+)**
   - Formula uses `$B$5` (Starting midpoint = 9.5)
   - Should use `$C$5` (Bench midpoint = 2.1)

4. **Jacob deGrom (SP, Grade A-)**
   - Uses C+ positive factor (1.4) instead of A- factor (0.4)
   - This appears intentional but doesn't match the documented algorithm

### Interpretation

The current system appears to be **semi-manual** with:
- Judgment calls on which midpoint to use
- Judgment calls on which factor to apply
- Some averaging of factors (Angels Manager uses average of two factors)
- The "New Grade" column suggests grade changes influence factor selection

---

## Questions Before Recommending an Approach

1. **Is the manual customization intentional?**
   - Are you deliberately choosing factors based on context (narrative, expectations)?
   - Or were these errors/experiments that accumulated over time?

2. **What should determine the midpoint?**
   - Strictly by position category?
   - Or can you override (e.g., bench player who played like a starter)?

3. **What should determine the factor?**
   - Current (pre-season) grade?
   - New (post-adjustment) grade?
   - Or the grade they "should" be based on performance?

4. **The MVP Weight column** - is this used anywhere?
   - It appears in the table but I don't see it in the formulas
   - Was it intended for calculating "Weighted MVP Rating" upstream?

---

## Recommendation Options

### Option A: Strict Algorithmic Approach

Fully automate with no judgment calls:

```javascript
function calculateAdjustment(player) {
  // 1. Determine midpoint by position
  let midpoint;
  if (player.position === 'SP') {
    midpoint = 7.0;
  } else if (['SP/RP', 'RP', 'CP'].includes(player.position)) {
    midpoint = 0.7;
  } else if (player.isBench) {
    midpoint = 2.1;
  } else {
    midpoint = 9.5;
  }

  // 2. Calculate difference
  const diff = player.weightedMVP - midpoint;

  // 3. Select factor based on CURRENT grade
  let factor;
  if (diff >= 0) {
    factor = POSITIVE_FACTORS[player.grade];
  } else {
    factor = NEGATIVE_FACTORS[player.grade];
  }

  // 4. Calculate adjustment
  return diff * factor;
}
```

**Pros**: Consistent, predictable, easy to audit
**Cons**: No room for narrative/context, may produce "unfair" results

---

### Option B: Guided Manual Approach (Current Style)

Keep manual formula entry but provide guidance:

```
╔══════════════════════════════════════════════════════════════╗
║              RATINGS ADJUSTMENT CALCULATOR                    ║
╠══════════════════════════════════════════════════════════════╣
║  Player: Jacob deGrom                                         ║
║  Position: SP | Grade: A- | Weighted MVP: 18.3               ║
║                                                               ║
║  STEP 1: Select Midpoint                                      ║
║  ○ Starting Pos (9.5) - default for starters                 ║
║  ○ Bench Pos (2.1) - default for bench                       ║
║  ● SP (7.0) - recommended for this position                  ║
║  ○ Relief (0.7) - for RP/CP                                  ║
║  ○ Custom: [___]                                             ║
║                                                               ║
║  STEP 2: Calculate Difference                                 ║
║  18.3 - 7.0 = +11.3 (OVERPERFORMED)                          ║
║                                                               ║
║  STEP 3: Select Adjustment Factor                             ║
║  Suggested: A- Positive = 0.4 (based on current grade)       ║
║  ○ Use suggested (0.4) → Adjustment: +4.52                   ║
║  ○ Use new grade factor [B-] = 1.0 → Adjustment: +11.3       ║
║  ● Custom factor: [1.4] → Adjustment: +15.82                 ║
║                                                               ║
║  STEP 4: Review & Apply                                       ║
║  Final Adjustment: +15.82 points                              ║
║                                                               ║
║  [Cancel] [Apply Adjustment]                                  ║
╚══════════════════════════════════════════════════════════════╝
```

**Pros**: Flexibility, can incorporate narrative/context
**Cons**: Inconsistent, time-consuming, requires judgment

---

### Option C: Hybrid Approach (Recommended)

Auto-calculate with override capability:

```javascript
function calculateAdjustment(player, overrides = {}) {
  // 1. Auto-determine midpoint (with optional override)
  const midpoint = overrides.midpoint ?? getDefaultMidpoint(player);

  // 2. Calculate difference
  const diff = player.weightedMVP - midpoint;

  // 3. Auto-select factor (with optional override)
  // Default: Use CURRENT grade
  // But allow override to use different grade's factor
  const gradeForFactor = overrides.gradeForFactor ?? player.currentGrade;
  const factor = diff >= 0
    ? POSITIVE_FACTORS[gradeForFactor]
    : NEGATIVE_FACTORS[gradeForFactor];

  // 4. Calculate adjustment
  const adjustment = diff * factor;

  // 5. Return with explanation
  return {
    midpoint,
    difference: diff,
    factor,
    adjustment,
    wasOverridden: Object.keys(overrides).length > 0
  };
}
```

**UI Flow:**
1. System calculates default adjustment for all players
2. Show results in a table with flagged "unusual" cases
3. Allow override on individual players with reason logging

**Pros**: Efficient for most cases, flexible for edge cases, auditable
**Cons**: Slightly more complex to implement

---

### Option D: Performance-Based Tiers

Instead of continuous calculation, use performance tiers:

| Performance | Adjustment Range |
|-------------|------------------|
| Elite (MVP candidate) | +10 to +20 |
| Great (All-Star) | +5 to +10 |
| Good (Above expectation) | +1 to +5 |
| Average (Met expectation) | -2 to +2 |
| Below Average | -5 to -2 |
| Poor | -10 to -5 |
| Terrible | -20 to -10 |

Then adjust within the range based on grade (higher grades have narrower positive ranges).

**Pros**: Simpler mental model, easier to explain
**Cons**: Less granular, may feel arbitrary

---

## My Recommendation: Option C (Hybrid)

1. **Default to strict algorithm** for consistency
2. **Flag edge cases** for review (e.g., large adjustments, grade changes)
3. **Allow overrides** with required reason (for audit trail)
4. **Track patterns** - if you're consistently overriding certain positions/grades, adjust the algorithm

### Specific Clarifications Needed:

1. Should SPs use the SP midpoint (7.0) or Starting Pos midpoint (9.5)?
   - Current spreadsheet is inconsistent on this

2. Which grade should determine the factor?
   - Current (beginning of season)?
   - New (end of season)?
   - Or the "expected" grade based on position/salary?

3. Is the "MVP Weight" column supposed to be used?
   - If so, how? (Multiply raw score to get Weighted MVP?)

Let me know your preferences and I'll build out the full logic!
