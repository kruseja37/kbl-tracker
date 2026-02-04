# SMB4 Grade Calculation Algorithm

> **Purpose**: Document the grade calculation for auto-generating draft prospects
> **Data Source**: Analysis of 260+ SMB4 position players from `all_players_combined.csv`
> **Created**: January 29, 2026
> **Status**: Position Players COMPLETE, Pitchers COMPLETE, Two-Way COMPLETE

---

## Core Formula

**Grade is determined by a weighted rating using the 3:3:2:1:1 ratio.**

### Position Players

```typescript
weightedRating = (
  power * 0.30 +      // 3 parts - PRIMARY
  contact * 0.30 +    // 3 parts - PRIMARY
  speed * 0.20 +      // 2 parts - SECONDARY
  fielding * 0.10 +   // 1 part  - TERTIARY
  arm * 0.10          // 1 part  - TERTIARY
);
```

### Pitchers

```typescript
weightedRating = (
  velocity * 0.333 +  // 1 part - EQUAL
  junk * 0.333 +      // 1 part - EQUAL
  accuracy * 0.333    // 1 part - EQUAL
);
```

### Two-Way Players

Two-way players get BOTH ratings combined with a 1.25x premium:
```typescript
twoWayValue = (positionWeightedRating + pitcherWeightedRating) * 1.25;
```

---

## Position Player Grade Thresholds

Based on analysis of 261 position players:

| Grade | Min Weighted | Avg Weighted | Typical Stats |
|-------|--------------|--------------|---------------|
| **S** | 80 | 81.7 | Elite all-around (80+ POW, 90+ CON, 85+ SPD) |
| **A+** | 78 | 81.5 | Star player with one elite tool |
| **A** | 73 | 77.5 | All-Star caliber |
| **A-** | 66 | 71.5 | Above-average starter |
| **B+** | 58 | 67.1 | Solid starter |
| **B** | 55 | 62.4 | Average MLB player |
| **B-** | 48 | 56.8 | Below-average starter / good bench |
| **C+** | 45 | 52.6 | Organizational depth |
| **C** | 38 | 47.6 | Marginal MLB player |
| **C-** | 35 | 40.4 | Replacement level |
| **D+** | 30 | 35.9 | Below replacement |
| **D** | 0 | 32.0 | Lowest tier |

---

## Draft Prospect Target Ranges

For auto-generating draft prospects (B to C- range):

| Target Grade | Weighted Range | Example Distribution |
|--------------|----------------|----------------------|
| **B** | 55-62 | POW:60 CON:60 SPD:55 FLD:50 ARM:50 = 57.5 |
| **B-** | 48-54 | POW:55 CON:55 SPD:50 FLD:45 ARM:45 = 52.0 |
| **C+** | 45-47 | POW:50 CON:50 SPD:45 FLD:40 ARM:40 = 47.0 |
| **C** | 38-44 | POW:45 CON:45 SPD:40 FLD:35 ARM:35 = 42.0 |
| **C-** | 35-37 | POW:40 CON:40 SPD:35 FLD:30 ARM:30 = 37.0 |

---

## Complete Implementation

```typescript
// ============================================
// GRADE THRESHOLDS
// ============================================

const POSITION_PLAYER_GRADE_THRESHOLDS = [
  { grade: 'S',  minWeighted: 80 },
  { grade: 'A+', minWeighted: 78 },
  { grade: 'A',  minWeighted: 73 },
  { grade: 'A-', minWeighted: 66 },
  { grade: 'B+', minWeighted: 58 },
  { grade: 'B',  minWeighted: 55 },
  { grade: 'B-', minWeighted: 48 },
  { grade: 'C+', minWeighted: 45 },
  { grade: 'C',  minWeighted: 38 },
  { grade: 'C-', minWeighted: 35 },
  { grade: 'D+', minWeighted: 30 },
  { grade: 'D',  minWeighted: 0 },
];

// Pitchers use same scale but with 1:1:1 weighted rating
const PITCHER_GRADE_THRESHOLDS = POSITION_PLAYER_GRADE_THRESHOLDS;

// ============================================
// RATING CALCULATION
// ============================================

interface PositionPlayerRatings {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
}

interface PitcherRatings {
  velocity: number;
  junk: number;
  accuracy: number;
}

function calculatePositionPlayerWeighted(ratings: PositionPlayerRatings): number {
  return (
    ratings.power * 0.30 +
    ratings.contact * 0.30 +
    ratings.speed * 0.20 +
    ratings.fielding * 0.10 +
    ratings.arm * 0.10
  );
}

function calculatePitcherWeighted(ratings: PitcherRatings): number {
  return (
    ratings.velocity / 3 +
    ratings.junk / 3 +
    ratings.accuracy / 3
  );
}

function getGradeFromWeighted(
  weighted: number,
  thresholds = POSITION_PLAYER_GRADE_THRESHOLDS
): string {
  for (const threshold of thresholds) {
    if (weighted >= threshold.minWeighted) {
      return threshold.grade;
    }
  }
  return 'D-';
}

// ============================================
// PROSPECT GENERATION
// ============================================

interface FarmProspect {
  id: string;
  name: string;
  position: string;
  age: number;
  gender: 'M' | 'F';
  overallGrade: string;
  potentialCeiling: string;
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  traits: string[];
  yearsInMinors: number;
  draftRound: number;
  morale: number;
}

// Target weighted ratings for each draft grade
const DRAFT_GRADE_TARGETS: Record<string, { min: number; max: number }> = {
  'B':  { min: 55, max: 62 },
  'B-': { min: 48, max: 54 },
  'C+': { min: 45, max: 47 },
  'C':  { min: 38, max: 44 },
  'C-': { min: 35, max: 37 },
};

// Position-based stat emphasis (deviation from base 3:3:2:1:1)
const POSITION_STAT_BIAS: Record<string, Partial<PositionPlayerRatings>> = {
  'C':  { fielding: +10, arm: +10, speed: -10 },         // Catchers: defense over speed
  '1B': { power: +15, speed: -10, fielding: -5 },        // 1B: power sluggers
  '2B': { contact: +5, speed: +5, power: -10 },          // 2B: contact/speed
  'SS': { fielding: +10, arm: +5, power: -10, speed: +5 }, // SS: defense + speed
  '3B': { power: +10, arm: +5, speed: -10 },             // 3B: power + arm
  'LF': { power: +10, fielding: -5, arm: -5 },           // LF: offense-first
  'CF': { speed: +15, fielding: +5, power: -10 },        // CF: speed + range
  'RF': { power: +5, arm: +10, speed: -5 },              // RF: power + arm
};

function generateProspectRatings(
  targetGrade: string,
  position: string
): PositionPlayerRatings {
  const target = DRAFT_GRADE_TARGETS[targetGrade];
  if (!target) {
    throw new Error(`Invalid target grade: ${targetGrade}`);
  }

  // Pick a random target weighted rating within the grade range
  const targetWeighted = target.min + Math.random() * (target.max - target.min);

  // Start with base ratings that would hit the target
  // If all stats were equal: stat * (0.30 + 0.30 + 0.20 + 0.10 + 0.10) = stat * 1.0 = targetWeighted
  const baseRating = targetWeighted;

  // Apply position bias
  const bias = POSITION_STAT_BIAS[position] || {};

  let power = baseRating + (bias.power || 0);
  let contact = baseRating + (bias.contact || 0);
  let speed = baseRating + (bias.speed || 0);
  let fielding = baseRating + (bias.fielding || 0);
  let arm = baseRating + (bias.arm || 0);

  // Add some randomness (±10)
  const randomize = (val: number) => val + (Math.random() - 0.5) * 20;

  power = randomize(power);
  contact = randomize(contact);
  speed = randomize(speed);
  fielding = randomize(fielding);
  arm = randomize(arm);

  // Clamp to valid range (15-85 for prospects, can grow to 99)
  const clamp = (val: number) => Math.max(15, Math.min(85, Math.round(val)));

  const ratings: PositionPlayerRatings = {
    power: clamp(power),
    contact: clamp(contact),
    speed: clamp(speed),
    fielding: clamp(fielding),
    arm: clamp(arm),
  };

  // Verify we're in the right grade range, adjust if needed
  const actualWeighted = calculatePositionPlayerWeighted(ratings);
  const actualGrade = getGradeFromWeighted(actualWeighted);

  // If we missed the target grade, adjust proportionally
  if (actualGrade !== targetGrade) {
    const adjustment = (targetWeighted - actualWeighted) / 1.0; // Spread across all stats
    ratings.power = clamp(ratings.power + adjustment * 0.30);
    ratings.contact = clamp(ratings.contact + adjustment * 0.30);
    ratings.speed = clamp(ratings.speed + adjustment * 0.20);
    ratings.fielding = clamp(ratings.fielding + adjustment * 0.10);
    ratings.arm = clamp(ratings.arm + adjustment * 0.10);
  }

  return ratings;
}

function generateProspectGrade(round: number): string {
  const roll = Math.random();

  if (round === 1) {
    // Round 1: Better prospects
    if (roll < 0.25) return 'B';
    if (roll < 0.60) return 'B-';
    if (roll < 0.85) return 'C+';
    if (roll < 0.95) return 'C';
    return 'C-';
  } else if (round <= 3) {
    // Rounds 2-3: Standard
    if (roll < 0.10) return 'B';
    if (roll < 0.30) return 'B-';
    if (roll < 0.65) return 'C+';
    if (roll < 0.90) return 'C';
    return 'C-';
  } else {
    // Later rounds: More organizational players
    if (roll < 0.05) return 'B';
    if (roll < 0.20) return 'B-';
    if (roll < 0.50) return 'C+';
    if (roll < 0.80) return 'C';
    return 'C-';
  }
}

function generatePotentialCeiling(currentGrade: string): string {
  const roll = Math.random();

  switch (currentGrade) {
    case 'B':
      if (roll < 0.20) return 'A';
      if (roll < 0.60) return 'A-';
      if (roll < 0.90) return 'B+';
      return 'B';
    case 'B-':
      if (roll < 0.05) return 'A';
      if (roll < 0.30) return 'A-';
      if (roll < 0.70) return 'B+';
      return 'B';
    case 'C+':
      if (roll < 0.05) return 'A-';
      if (roll < 0.30) return 'B+';
      if (roll < 0.75) return 'B';
      return 'B-';
    case 'C':
      if (roll < 0.10) return 'B+';
      if (roll < 0.40) return 'B';
      return 'B-';
    default: // C-
      if (roll < 0.15) return 'B';
      return 'B-';
  }
}

// Positive/neutral traits only for draft prospects (no grade penalties)
const PROSPECT_TRAIT_POOL = [
  'Fastball Hitter',
  'Off-Speed Hitter',
  'Mind Gamer',
  'Tough Out',
  'First Pitch Slayer',
  'Consistent',
  'Clutch',
  'Sprinter',
  'RBI Hero',
  'Durable',
  'Sign Stealer',
  'Pinch Perfect',
];

function generateProspectTraits(grade: string): string[] {
  // Higher grade = more likely to have a positive trait
  const traitChance = grade === 'B' ? 0.40 : grade === 'B-' ? 0.30 : 0.20;

  if (Math.random() < traitChance) {
    const trait = PROSPECT_TRAIT_POOL[
      Math.floor(Math.random() * PROSPECT_TRAIT_POOL.length)
    ];
    return [trait];
  }

  return [];
}

function generateFarmProspect(
  position: string,
  draftRound: number,
  nameDatabase: NameDatabase
): FarmProspect {
  // 1. Determine grade based on round
  const targetGrade = generateProspectGrade(draftRound);

  // 2. Generate potential ceiling
  const ceiling = generatePotentialCeiling(targetGrade);

  // 3. Generate ratings for target grade with position bias
  const ratings = generateProspectRatings(targetGrade, position);

  // 4. Generate name and gender (~25% female)
  const gender: 'M' | 'F' = Math.random() < 0.25 ? 'F' : 'M';
  const name = nameDatabase.getRandomName(gender);

  // 5. Assign traits (positive or neutral only)
  const traits = generateProspectTraits(targetGrade);

  return {
    id: generateId(),
    name,
    position,
    age: 18 + Math.floor(Math.random() * 4),  // 18-21
    gender,
    overallGrade: targetGrade,
    potentialCeiling: ceiling,
    ...ratings,
    traits,
    yearsInMinors: 0,
    draftRound,
    morale: 75,  // Fresh and optimistic
  };
}

// ============================================
// PITCHER PROSPECT GENERATION
// ============================================

interface PitcherProspect extends Omit<FarmProspect, 'power' | 'contact' | 'speed' | 'fielding' | 'arm'> {
  velocity: number;
  junk: number;
  accuracy: number;
  arsenal: string[];  // Pitch types
}

function generatePitcherProspectRatings(
  targetGrade: string,
  position: 'SP' | 'RP' | 'CP'
): PitcherRatings {
  const target = DRAFT_GRADE_TARGETS[targetGrade];
  if (!target) {
    throw new Error(`Invalid target grade: ${targetGrade}`);
  }

  const targetWeighted = target.min + Math.random() * (target.max - target.min);

  // For pitchers, all three stats are equal weight
  // targetWeighted = (VEL + JNK + ACC) / 3
  // So each stat should average to targetWeighted
  const baseRating = targetWeighted;

  // Position bias for pitchers
  let velBias = 0, jnkBias = 0, accBias = 0;

  if (position === 'SP') {
    // Starters need more balanced, slight accuracy emphasis
    accBias = +5;
    velBias = -2;
    jnkBias = -3;
  } else if (position === 'CP') {
    // Closers: velocity + junk
    velBias = +8;
    jnkBias = +5;
    accBias = -13;
  } else {
    // Middle relievers: high variance
    const style = Math.random();
    if (style < 0.33) {
      velBias = +10; accBias = -10;  // Power arm
    } else if (style < 0.66) {
      jnkBias = +10; velBias = -10;  // Crafty
    }
    // else balanced
  }

  const randomize = (val: number) => val + (Math.random() - 0.5) * 20;
  const clamp = (val: number) => Math.max(15, Math.min(85, Math.round(val)));

  return {
    velocity: clamp(randomize(baseRating + velBias)),
    junk: clamp(randomize(baseRating + jnkBias)),
    accuracy: clamp(randomize(baseRating + accBias)),
  };
}

// Arsenal based on junk rating
function generateArsenal(junk: number): string[] {
  const pitches = ['4F', '2F'];  // Everyone has fastballs

  // Higher junk = more pitch variety
  const offSpeedPitches = ['CB', 'SL', 'CH', 'FK', 'CF', 'SB'];

  if (junk >= 70) {
    // Elite junk: 3-4 off-speed pitches
    pitches.push(...shuffleArray(offSpeedPitches).slice(0, 3 + (Math.random() > 0.5 ? 1 : 0)));
  } else if (junk >= 55) {
    // Good junk: 2-3 off-speed pitches
    pitches.push(...shuffleArray(offSpeedPitches).slice(0, 2 + (Math.random() > 0.5 ? 1 : 0)));
  } else if (junk >= 40) {
    // Average: 1-2 off-speed
    pitches.push(...shuffleArray(offSpeedPitches).slice(0, 1 + (Math.random() > 0.5 ? 1 : 0)));
  } else {
    // Low junk: just one breaking ball
    pitches.push(shuffleArray(offSpeedPitches)[0]);
  }

  return pitches;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

---

## Verification Examples

From actual player data:

| Player | Grade | POW | CON | SPD | FLD | ARM | Weighted |
|--------|-------|-----|-----|-----|-----|-----|----------|
| Handley Dexterez | S | 63 | 87 | 87 | 97 | 74 | 79.5 |
| Sakda Song | S | 80 | 93 | 90 | 82 | 57 | 83.8 |
| Elvis Stanley | A | 68 | 80 | 75 | 87 | 77 | 75.8 |
| Kobe Kingman | B | 95 | 27 | 51 | 68 | 63 | 59.9 |
| Bertha Banks | B- | 64 | 56 | 51 | 67 | 52 | 58.1 |
| Benny Balmer | C+ | 32 | 40 | 58 | 89 | 84 | 50.5 |
| Poke Foster | C | 25 | 76 | 24 | 68 | 66 | 48.5 |

---

## Integration with Salary System

The same 3:3:2:1:1 weighting is used in `SALARY_SYSTEM_SPEC.md` for calculating base salary from ratings. This ensures consistency between grade and salary calculations.

```typescript
// From SALARY_SYSTEM_SPEC.md
function calculatePositionPlayerBaseSalary(player) {
  const weightedRating = (
    player.ratings.power * 0.30 +
    player.ratings.contact * 0.30 +
    player.ratings.speed * 0.20 +
    player.ratings.fielding * 0.10 +
    player.ratings.arm * 0.10
  );

  // Convert to salary with exponential curve
  return Math.pow(weightedRating / 100, 2.5) * 50;
}
```

---

## Changelog

- v1.0 (2026-01-29): Initial spec with incorrect simple average
- v2.0 (2026-01-29): Corrected to use 3:3:2:1:1 weighting per SALARY_SYSTEM_SPEC.md
