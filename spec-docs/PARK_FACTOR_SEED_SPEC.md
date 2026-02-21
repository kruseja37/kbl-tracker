# KBL Park Factor Seed Specification

**Version**: 1.0
**Status**: Draft
**Last Updated**: February 2026

---

## 1. Overview

Park factors adjust offensive statistics based on stadium characteristics. KBL uses SMB4's 23 stadiums (documented in the BillyYank Super Mega Baseball Guide) as the source of truth for park dimensions and characteristics.

> **Key Principle**: Park factors are SEEDED from BillyYank's stadium data, not calculated from KBL game results. This ensures consistency with the SMB4 gameplay experience.

---

## 2. Activation Trigger

Park factors are NOT active from Season 1. They activate after sufficient data accumulates:

```typescript
const PARK_FACTOR_CONFIG = {
  activationThreshold: 0.40,  // 40% of season must be played
  recalculationFrequency: 'AFTER_EACH_GAME',
  
  isActive(gamesPlayed: number, gamesPerSeason: number): boolean {
    return gamesPlayed / gamesPerSeason >= this.activationThreshold;
  }
};
```

### 2.1 Why 40%?

Before 40% of the season, sample sizes are too small for meaningful park adjustments. After 40%, enough home/away data exists to apply park factors meaningfully.

---

## 3. Stadium Data Source

### 3.1 BillyYank's 23 Stadiums

Park dimensions and characteristics come from the BillyYank Super Mega Baseball Guide (3rd Edition). See SMB4_PARK_DIMENSIONS.md for the full dataset.

### 3.2 Park Factor Categories

Each stadium has factors for:

```typescript
interface ParkFactors {
  stadiumId: string;
  stadiumName: string;
  
  // Offensive factors (1.00 = neutral)
  runFactor: number;      // Overall run scoring
  hrFactor: number;       // Home run frequency
  hitFactor: number;      // Hit frequency
  doubleFactor: number;   // Doubles/triples frequency
  
  // Derived from stadium dimensions
  lfDistance: number;      // Left field wall distance
  cfDistance: number;      // Center field wall distance
  rfDistance: number;      // Right field wall distance
  wallHeight: number;     // Average wall height
  
  // Qualitative
  surfaceType: 'GRASS' | 'TURF';
  altitude: 'LOW' | 'NORMAL' | 'HIGH';  // Affects ball flight
}
```

### 3.3 Seed Values

Park factors are SEEDED (initial values from BillyYank data), then optionally refined by actual KBL game data over time:

```typescript
function getInitialParkFactor(stadiumId: string): ParkFactors {
  return BILLYYANK_PARK_DATA[stadiumId];
}

function getRefinedParkFactor(
  stadiumId: string,
  seasonGames: GameResult[]
): ParkFactors {
  const seed = getInitialParkFactor(stadiumId);
  const homeGames = seasonGames.filter(g => g.homeStadium === stadiumId);
  
  if (homeGames.length < 10) return seed;  // Not enough data
  
  // Blend seed with observed data (70% seed, 30% observed)
  return blendFactors(seed, calculateObservedFactors(homeGames), 0.70);
}
```

---

## 4. Application to Stats

### 4.1 Adjusted Stats

Park factors adjust counting stats for comparison purposes:

| Stat | Adjustment |
|------|-----------|
| HR | ÷ hrFactor |
| Runs | ÷ runFactor |
| Hits | ÷ hitFactor |
| ERA | × runFactor |

### 4.2 WAR Impact

Park factors feed into WAR calculations through the run environment:

```typescript
function getParkAdjustedRuns(
  runs: number, 
  homeStadium: string,
  gamesPlayed: number,
  gamesPerSeason: number
): number {
  if (!PARK_FACTOR_CONFIG.isActive(gamesPlayed, gamesPerSeason)) {
    return runs;  // No adjustment before 40%
  }
  
  const parkFactor = getRefinedParkFactor(homeStadium, getSeasonGames());
  return runs / parkFactor.runFactor;
}
```

---

## 5. Cross-References

| Spec | Relevance |
|------|-----------|
| SMB4_PARK_DIMENSIONS.md | Full stadium data from BillyYank guide |
| STADIUM_ANALYTICS_SPEC.md | Stadium analytics display |
| BWAR_CALCULATION_SPEC.md | Park-adjusted WAR calculations |
| BillyYank Super Mega Baseball Guide | Source document for dimensions |

---

*Last Updated: February 20, 2026*
