# KBL Prospect Generation Specification

**Version**: 1.0
**Status**: Draft
**Last Updated**: February 2026

---

## 1. Overview

KBL generates new prospects for the annual draft from the SMB4 player database. The initial league uses the full 506-player roster. Subsequent drafts generate new prospects using a combination of SMB4's inactive player pool and procedurally generated players.

---

## 2. Initial League Population

### 2.1 Source: SMB4 506-Player Database

The full SMB4 default roster serves as the initial player pool:
- 20 teams × ~25 players = ~500 active players
- ~6 additional inactive/reserve players

### 2.2 Initial Trait Distribution

| Trait Count | Percentage | ~Players |
|-------------|-----------|----------|
| 0 traits | ~30% | ~152 |
| 1 trait | ~50% | ~253 |
| 2 traits | ~20% | ~101 |

### 2.3 Initial Personality Assignment

All 506 players receive personalities at league creation:
- 1 visible type (7 options, weighted — see OFFSEASON_SYSTEM_SPEC.md §14.5)
- 4 hidden modifiers (Gaussian, μ=50, σ=20, clamped [0,100])

---

## 3. Draft Class Generation

### 3.1 Draft Class Size

Each annual draft produces enough prospects to fill roster needs:

```typescript
const DRAFT_CLASS_CONFIG = {
  baseSize: 40,  // ~2 picks per team for 20 teams
  scaleFactor: 2, // multiplier × number of teams
  
  calculateDraftClassSize(numTeams: number): number {
    return Math.max(this.baseSize, numTeams * this.scaleFactor);
  }
};
```

### 3.2 Grade Distribution

Draft prospects follow this grade distribution:

| Grade | Percentage | Notes |
|-------|-----------|-------|
| A+ | 0% | Never in draft (too unrealistic) |
| A | 2% | Generational talent |
| A- | 5% | Elite prospect |
| B+ | 10% | Very good prospect |
| B | 15% | Good prospect |
| B- | 15% | Average prospect |
| C+ | 15% | Below average |
| C | 18% | Filler/depth |
| C- | 12% | Long shot |
| D | 8% | Organizational player |

### 3.3 Position Distribution

Prospects follow realistic positional needs:

```typescript
const POSITION_WEIGHTS = {
  'SP': 20,   // Most needed
  'RP': 12,
  'CP': 3,
  'C': 5,
  '1B': 7,
  '2B': 7,
  'SS': 7,
  '3B': 7,
  'LF': 7,
  'CF': 8,
  'RF': 7,
  'DH': 3,
  'UTIL': 7,
};
```

### 3.4 Trait Distribution for Prospects

Same ratio as initial league:
- ~30% of draft class: 0 traits
- ~50% of draft class: 1 trait
- ~20% of draft class: 2 traits

Traits are position-appropriate (see TRAIT_INTEGRATION_SPEC.md §5.2).

### 3.5 Chemistry Distribution

Chemistry types distributed roughly evenly across each draft class, matching SMB4's 5 actual types:
- ~20% Competitive
- ~20% Crafty
- ~20% Disciplined
- ~20% Spirited
- ~20% Scholarly

---

## 4. Inactive Player Database

### 4.1 Purpose

Players who are released, cut, or retire from active rosters enter the inactive database. Before each draft, the user can optionally add inactive players back to the draft class.

### 4.2 Inactive Sources

| Source | When Added |
|--------|-----------|
| Released players (Phase 11 unclaimed) | End of offseason |
| Retired players | Phase 5 |
| Expansion team cuts | Phase 4 |
| Mid-season releases | During season |

### 4.3 Pre-Draft Prompt

```
Before the draft begins:
"Would you like to add any inactive players to this year's draft class?"
[View Inactive Players]  [Skip — Draft New Prospects Only]
```

---

## 5. Rating Generation

### 5.1 True Ratings

Each prospect has hidden true ratings generated based on their grade:

```typescript
function generateTrueRatings(grade: Grade, position: string): PlayerRatings {
  const gradeCenter = GRADE_RATING_CENTERS[grade];  // e.g., B = 70
  const spread = 8;  // σ for rating distribution
  
  const ratings: PlayerRatings = {};
  for (const stat of getRelevantStats(position)) {
    // Generate around grade center with position-specific bias
    const positionBias = POSITION_STAT_BIAS[position][stat] || 0;
    ratings[stat] = clamp(
      Math.round(gaussianRandom(gradeCenter + positionBias, spread)),
      20, 99
    );
  }
  
  return ratings;
}

const GRADE_RATING_CENTERS: Record<Grade, number> = {
  'A+': 92, 'A': 87, 'A-': 83,
  'B+': 78, 'B': 73, 'B-': 68,
  'C+': 63, 'C': 58, 'C-': 53,
  'D': 45,
};
```

### 5.2 Scouted Grade

The scouted grade shown to the user is the true grade modified by scout accuracy (see SCOUTING_SYSTEM_SPEC.md §3).

---

## 6. Cross-References

| Spec | Relevance |
|------|-----------|
| SCOUTING_SYSTEM_SPEC.md | Scout accuracy and grade deviation |
| TRAIT_INTEGRATION_SPEC.md | Trait assignment rules and Chemistry mapping |
| DRAFT_FIGMA_SPEC.md | Draft UI showing scouted grades |
| OFFSEASON_SYSTEM_SPEC.md §9 | Draft phase (Phase 7) mechanics |
| FARM_SYSTEM_SPEC.md | Where drafted prospects live |

---

*Last Updated: February 20, 2026*
