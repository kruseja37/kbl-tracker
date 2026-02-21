# KBL Scouting System Specification

**Version**: 1.0
**Status**: Draft
**Last Updated**: February 2026

---

## 1. Overview

The scouting system governs how farm and draft prospects are evaluated before they reach the MLB roster. Prospects have hidden true ratings that are only revealed upon call-up. Before that, users see scouted grades with varying accuracy depending on the scout and position.

> **Key Insight**: This creates meaningful uncertainty in roster decisions. A "B" prospect might be an A- player or a C+ player — you won't know until you call them up.

---

## 2. Rating Visibility

### 2.1 Farm Prospects (Pre-Call-Up)

| Data Point | Visible? | Notes |
|-----------|----------|-------|
| Scouted Grade (A+, A, B+, B, B-, C+, C, C-, D) | ✅ Yes | Scout's estimate |
| Position | ✅ Yes | Known |
| Chemistry Type | ✅ Yes | Visible in SMB4 |
| Traits | ✅ Yes | Visible in SMB4 |
| Personality (visible type) | ✅ Yes | 1 of 7 types |
| Personality (hidden modifiers) | ❌ No | Never shown as numbers |
| True numeric ratings | ❌ No | Hidden until call-up |

### 2.2 After Call-Up

All true numeric ratings (Power, Contact, Speed, Arm, Fielding, Velocity, etc.) are revealed immediately upon promotion to the MLB roster.

```typescript
function callUpProspect(prospect: FarmPlayer): MLBPlayer {
  prospect.ratingsRevealed = true;
  prospect.level = 'MLB';
  // True ratings may differ significantly from scouted grade
  return prospect;
}
```

---

## 3. Scout Accuracy

### 3.1 Accuracy by Position

Scouts are better at evaluating some positions than others:

```typescript
const SCOUT_ACCURACY_BY_POSITION: Record<string, number> = {
  // Higher = more accurate (0-100 scale)
  'SP': 75,    // Starters: fairly predictable
  'RP': 65,    // Relievers: smaller sample
  'CP': 60,    // Closers: high variance role
  'C':  70,    // Catchers: defensive tools visible
  '1B': 80,    // First base: power/contact clear
  '2B': 70,    // Second base: moderate
  'SS': 65,    // Shortstop: range hard to evaluate
  '3B': 75,    // Third base: arm/power visible
  'LF': 70,    // Left field: moderate
  'CF': 65,    // Center field: speed/range uncertain
  'RF': 70,    // Right field: arm visible
  'DH': 85,    // DH: only batting to evaluate
};
```

### 3.2 Grade Deviation

When generating a prospect's scouted grade, the true grade is modified by a fat-tail random deviation scaled by scout accuracy. Small misses are most common; large misses are rare but possible.

```typescript
/**
 * Fat-tail scout deviation model.
 *
 * σ is derived from position inaccuracy. Most reports land within ±1 step.
 * Rare outliers can deviate ±3 or ±4 steps — a true B might look like a C-,
 * or a C+ might look like an A-.
 *
 * Implementation:
 *   1. Draw a standard normal Z (Box-Muller or equivalent).
 *   2. Scale by σ = (100 - accuracy) / 22.
 *      - DH (accuracy 85): σ ≈ 0.68  → almost always within ±1 step
 *      - 1B (accuracy 80): σ ≈ 0.91  → usually ±1 step, rare ±2
 *      - CF (accuracy 65): σ ≈ 1.59  → often ±1-2 steps, occasional ±3
 *      - CP (accuracy 60): σ ≈ 1.82  → widest spread, rare ±4 possible
 *   3. Round to nearest integer for grade steps.
 *   4. Hard cap at ±4 steps to prevent impossible grades.
 */
function generateScoutedGrade(trueGrade: Grade, position: string): Grade {
  const accuracy = SCOUT_ACCURACY_BY_POSITION[position] || 70;
  const sigma = (100 - accuracy) / 22;

  // Box-Muller normal sample
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Scale, round, and hard-cap
  const rawDeviation = z * sigma;
  const deviation = Math.max(-4, Math.min(4, Math.round(rawDeviation)));

  return adjustGrade(trueGrade, deviation);
}
```

**Expected deviation distribution by position (approximate):**

| Position | Accuracy | σ | ±0 steps | ±1 step | ±2 steps | ±3+ steps |
|----------|----------|---|----------|---------|---------|----------|
| DH | 85 | 0.68 | ~50% | ~40% | ~9% | ~1% |
| 1B | 80 | 0.91 | ~42% | ~44% | ~12% | ~2% |
| SP, 3B | 75 | 1.14 | ~35% | ~46% | ~15% | ~4% |
| C, 2B, LF, RF | 70 | 1.36 | ~29% | ~46% | ~19% | ~6% |
| SS, CF, RP | 65 | 1.59 | ~24% | ~46% | ~22% | ~8% |
| CP | 60 | 1.82 | ~21% | ~44% | ~24% | ~11% |

> **Note**: The ±4 hard cap prevents impossible grades (e.g., a D prospect cannot be reported as A+). The `adjustGrade()` function also clamps to the valid grade range (D to A).

**Example:**
```
True grade B, position CF (σ = 1.59)
z = -1.8 → deviation = -2 → scouted grade C+
(A two-step miss — scout significantly underestimated this player)

True grade C+, position CF (σ = 1.59)
z = 2.1 → deviation = +2 → scouted grade A-
(Scout was wildly optimistic about a C+ player — rare but possible)
```

---

## 4. Draft Prospect Scouting

### 4.1 Pre-Draft Information

Before the draft, users see:
- Scouted grade (with position-based accuracy)
- Position
- Chemistry type
- Personality (visible type only)
- Traits (if any — ~30% of prospects have 0)

### 4.2 Post-Draft, Pre-Call-Up

Same visibility as farm prospects. True ratings still hidden.

### 4.3 Call-Up Reveal Ceremony

When a prospect is called up, a reveal animation shows the true ratings compared to the scouted grade:

```
╔══════════════════════════════════════════════════════════════╗
║              PROSPECT REVEAL: Jake Morrison (CF)             ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Scouted Grade: B-                                           ║
║  TRUE Grade: B+ ⬆️                                           ║
║                                                               ║
║  "Your scout underestimated this kid's range!"               ║
║                                                               ║
║  ┌──────────────────────────────────────────────────────────┐║
║  │ Power:    62  │ Contact:  78  │ Speed:   85              │║
║  │ Arm:      71  │ Fielding: 80  │ Clutch:  55              │║
║  └──────────────────────────────────────────────────────────┘║
╚══════════════════════════════════════════════════════════════╝
```

---

## 5. Cross-References

| Spec | Relevance |
|------|-----------|
| FARM_SYSTEM_SPEC.md | Farm roster management, call-up/send-down rules |
| PROSPECT_GENERATION_SPEC.md | How prospects are generated for drafts |
| DRAFT_FIGMA_SPEC.md | Draft UI with scouted grades |
| EOS_RATINGS_ADJUSTMENT_SPEC.md | Trait assignment for new players |

---

*Last Updated: February 20, 2026*
