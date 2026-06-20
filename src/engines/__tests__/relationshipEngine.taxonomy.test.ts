import { describe, expect, test } from 'vitest';

import {
  map9To6,
  RELATIONSHIP_6_TO_9_COVERAGE,
  RELATIONSHIP_9_TO_6_MAP,
  RelationshipType,
} from '../relationshipEngine';

describe('relationshipEngine L13-2 taxonomy map', () => {
  test('maps every legacy 9-literal relationship type to a canonical L13 edge type', () => {
    const legacyTypes = Object.values(RelationshipType);

    expect(Object.keys(RELATIONSHIP_9_TO_6_MAP).sort()).toEqual([...legacyTypes].sort());
    expect(legacyTypes.map((type) => [type, map9To6(type)])).toEqual([
      [RelationshipType.DATING, 'ROMANCE'],
      [RelationshipType.MARRIED, 'ROMANCE'],
      [RelationshipType.DIVORCED, 'ROMANCE'],
      [RelationshipType.BEST_FRIENDS, 'FRIENDSHIP'],
      [RelationshipType.MENTOR_PROTEGE, 'MENTORSHIP'],
      [RelationshipType.RIVALS, 'RIVALRY'],
      [RelationshipType.BULLY_VICTIM, 'FEUD'],
      [RelationshipType.JEALOUS, 'RIVALRY'],
      [RelationshipType.CRUSH, 'ROMANCE'],
    ]);
  });

  test('keeps inverse coverage for the five legacy collapse groups plus empty History', () => {
    expect(RELATIONSHIP_6_TO_9_COVERAGE).toEqual({
      RIVALRY: [RelationshipType.RIVALS, RelationshipType.JEALOUS],
      FEUD: [RelationshipType.BULLY_VICTIM],
      MENTORSHIP: [RelationshipType.MENTOR_PROTEGE],
      FRIENDSHIP: [RelationshipType.BEST_FRIENDS],
      ROMANCE: [
        RelationshipType.DATING,
        RelationshipType.MARRIED,
        RelationshipType.DIVORCED,
        RelationshipType.CRUSH,
      ],
      HISTORY: [],
    });

    const inverseLegacyTypes = Object.values(RELATIONSHIP_6_TO_9_COVERAGE).flat();
    expect([...inverseLegacyTypes].sort()).toEqual([...Object.values(RelationshipType)].sort());
  });
});
