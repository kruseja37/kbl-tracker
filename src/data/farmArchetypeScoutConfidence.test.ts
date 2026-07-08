import { describe, expect, test } from 'vitest';

import { HISTORICAL_ARCHETYPES } from './historicalArchetypes';
import {
  FARM_ARCHETYPE_SCOUT_CONFIDENCE,
  scoutConfidenceBandForArea,
} from './farmArchetypeScoutConfidence';

describe('farm archetype scout confidence table', () => {
  test('is bijective with historical archetype ids and only uses 3/5/7 bands', () => {
    const archetypeIds = HISTORICAL_ARCHETYPES.map((archetype) => archetype.id).sort();
    const confidenceIds = Object.keys(FARM_ARCHETYPE_SCOUT_CONFIDENCE).sort();

    expect(confidenceIds).toEqual(archetypeIds);
    expect(confidenceIds).toHaveLength(24);

    for (const row of Object.values(FARM_ARCHETYPE_SCOUT_CONFIDENCE)) {
      expect(row.archetypeKey).toBeTruthy();
      expect(row.rationale).toBeTruthy();
      expect(Object.values(row.bands).every((band) => band === 3 || band === 5 || band === 7)).toBe(true);
    }
  });

  test('falls back to medium confidence for missing or unknown farm archetypes', () => {
    expect(scoutConfidenceBandForArea(undefined, 'power')).toBe(5);
    expect(scoutConfidenceBandForArea('does-not-exist', 'fielding')).toBe(5);
  });
});
