import { describe, expect, test } from 'vitest';

import {
  RELATIONSHIP_INTENSITY_TUNING,
  computeRelationshipCumulativeDecay,
  computeRelationshipFormationBaseline,
  computeRelationshipIntensity,
  type RelationshipIntensityTuning,
} from '../relationshipIntensity';
import {
  franchiseRelationshipEdgeId,
  type RelationshipEdgeRow,
} from '../../utils/franchiseRelationshipEdgesStorage';

const scope = {
  franchiseId: 'franchise-intensity',
  seasonId: 'season-intensity',
  statsScopeId: 'scope-intensity',
};

const testTuning: RelationshipIntensityTuning = {
  formationIntensityFloor: 0.7,
  formationIntensityRange: 0,
  baseDecayPerGame: 0.1,
  compoundPerGame: 0,
  maxDecayPerGame: 0.1,
  chargedMatchupBump: 0.2,
  formThreshold: 0.6,
  dissolveThreshold: 0.3,
  precision: 10000,
};

function edge(overrides: Partial<RelationshipEdgeRow> = {}): RelationshipEdgeRow {
  const type = overrides.type ?? 'RIVALRY';
  const player1Id = overrides.player1Id ?? 'player-a';
  const player2Id = overrides.player2Id ?? 'player-b';
  return {
    ...scope,
    id: franchiseRelationshipEdgeId(scope, player1Id, player2Id, type),
    seasonNumber: 1,
    player1Id,
    player2Id,
    type,
    intensity: 0.85,
    potential: false,
    accuracy: 0.9,
    formedAtGameNumber: 10,
    dissolvedAtGameNumber: null,
    createdAt: 1781990400000,
    updatedAt: 1781990400000,
    ...overrides,
  };
}

describe('relationshipIntensity — L13-4 pure lifecycle', () => {
  test('formation baseline is deterministic and in bounds', () => {
    const row = edge();
    const first = computeRelationshipFormationBaseline(row);
    const second = computeRelationshipFormationBaseline(row);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(RELATIONSHIP_INTENSITY_TUNING.formationIntensityFloor);
    expect(first).toBeLessThanOrEqual(1);
  });

  test('lapse decay ramps and clamps like the flashpoint shape', () => {
    const ramping: RelationshipIntensityTuning = {
      ...testTuning,
      baseDecayPerGame: 0.05,
      compoundPerGame: 0.5,
      maxDecayPerGame: 0.09,
    };

    expect(computeRelationshipCumulativeDecay(0, ramping)).toBe(0);
    expect(computeRelationshipCumulativeDecay(2, ramping)).toBe(0.125);
    // Game 3 raw decay would be 0.1, clamped to 0.09.
    expect(computeRelationshipCumulativeDecay(3, ramping)).toBe(0.215);
  });

  test('charged matchup applies a one-game bump and clamps at 1', () => {
    const row = edge({ formedAtGameNumber: 10 });
    const uncharged = computeRelationshipIntensity(
      row,
      { gameNumber: 10, isChargedMatchup: false },
      testTuning,
    );
    const charged = computeRelationshipIntensity(
      row,
      { gameNumber: 10, isChargedMatchup: true },
      testTuning,
    );
    const capped = computeRelationshipIntensity(
      row,
      { gameNumber: 10, isChargedMatchup: true },
      { ...testTuning, formationIntensityFloor: 0.95, chargedMatchupBump: 0.2 },
    );

    expect(uncharged.intensity).toBe(0.7);
    expect(charged.intensity).toBe(0.9);
    expect(charged.chargedMatchupApplied).toBe(true);
    expect(capped.intensity).toBe(1);
  });

  test('hysteresis keeps an already formed edge active below form threshold until dissolve threshold', () => {
    const row = edge({ formedAtGameNumber: 1 });
    const belowFormAboveDissolve = computeRelationshipIntensity(
      row,
      { gameNumber: 3, isChargedMatchup: false },
      testTuning,
    );

    expect(belowFormAboveDissolve.lapsedIntensity).toBe(0.5);
    expect(belowFormAboveDissolve.lapsedIntensity).toBeLessThan(testTuning.formThreshold);
    expect(belowFormAboveDissolve.lapsedIntensity).toBeGreaterThan(testTuning.dissolveThreshold);
    expect(belowFormAboveDissolve.state).toBe('active');
    expect(belowFormAboveDissolve.dissolvedAtGameNumber).toBeNull();
  });

  test('dissolves when lapsed intensity falls below the dissolve threshold', () => {
    const row = edge({ formedAtGameNumber: 1 });
    const result = computeRelationshipIntensity(
      row,
      { gameNumber: 6, isChargedMatchup: false },
      testTuning,
    );

    expect(result.lapsedIntensity).toBe(0.2);
    expect(result.state).toBe('dissolved');
    expect(result.dissolvedAtGameNumber).toBe(6);
  });

  test('preserves an existing dissolvedAtGameNumber after the edge is already dissolved', () => {
    const row = edge({ formedAtGameNumber: 1, dissolvedAtGameNumber: 6 });
    const result = computeRelationshipIntensity(
      row,
      { gameNumber: 8, isChargedMatchup: false },
      testTuning,
    );

    expect(result.state).toBe('dissolved');
    expect(result.dissolvedAtGameNumber).toBe(6);
  });

  test('same-game recompute is idempotent and does not use prior stored intensity as an accumulator', () => {
    const row = edge({ formedAtGameNumber: 1, intensity: 0.7 });
    const first = computeRelationshipIntensity(
      row,
      { gameNumber: 3, isChargedMatchup: false },
      testTuning,
    );
    const replayedRow = { ...row, intensity: first.intensity };
    const replay = computeRelationshipIntensity(
      replayedRow,
      { gameNumber: 3, isChargedMatchup: false },
      testTuning,
    );

    expect(replay).toEqual(first);
  });

  test('potential/unformed rows stay potential and keep current intensity bounded', () => {
    const row = edge({ potential: true, formedAtGameNumber: null, intensity: 1.4 });
    const result = computeRelationshipIntensity(
      row,
      { gameNumber: 10, isChargedMatchup: false },
      testTuning,
    );

    expect(result.state).toBe('potential');
    expect(result.intensity).toBe(1);
    expect(result.dissolvedAtGameNumber).toBeNull();
  });
});
