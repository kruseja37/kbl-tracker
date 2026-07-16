import { describe, expect, test } from 'vitest';

import {
  FARM_ARCHETYPE_TILT_TUNING,
  FINDING_KIND_TO_BANDS,
  archetypeBandWeights,
  sortByTiltedPriority,
  tiltAnalyzerFindings,
} from '../farmArchetypeTilt';
import { BANDS, type Band, type TeamCapIdentity } from '../leagueConstruction';
import type { AnalyzerConstraintKind, AnalyzerFinding, AnalyzerSeverity } from '../rosterAnalyzerEngine';

const defenseFirstIdentity: TeamCapIdentity = {
  increase: ['Defense First'],
  decrease: [],
};

const powerIdentity: TeamCapIdentity = {
  increase: ['Fence Swingers'],
  decrease: [],
};

function finding(
  id: string,
  kind: AnalyzerConstraintKind,
  severity: AnalyzerSeverity = 'warning',
): AnalyzerFinding {
  return {
    id,
    kind,
    severity,
    trust: 'high',
    title: id,
    detail: id,
    evidence: [],
  };
}

function expectStrictMax(weights: Record<Band, number>, maxKey: Band): void {
  expect(weights[maxKey]).toBe(1);
  for (const band of BANDS) {
    if (band !== maxKey) {
      expect(weights[band]).toBeLessThan(weights[maxKey]);
    }
  }
}

describe('farmArchetypeTilt RB-9b-2 band weights', () => {
  test('keeps Defense first-class through cap-modification element decomposition', () => {
    const weights = archetypeBandWeights(defenseFirstIdentity);

    expect(Object.keys(weights).sort()).toEqual([...BANDS].sort());
    expect(weights).toHaveProperty('Defense');
    expectStrictMax(weights, 'Defense');
  });

  test('falls back to bandPriorities and keeps a Defense-priority archetype Defense-max', () => {
    const weights = archetypeBandWeights({
      increase: [],
      decrease: [],
      bandPriorities: {
        Power: 0,
        Contact: 0,
        Speed: 0,
        Defense: 6,
        Rotation: 0,
        Bullpen: 0,
      },
    });

    expectStrictMax(weights, 'Defense');
  });

  test('normalizes neutral and balanced identities across the six bands', () => {
    const neutral = archetypeBandWeights(undefined);
    expect(BANDS.map((band) => neutral[band])).toEqual(BANDS.map(() => 0));

    const balanced = archetypeBandWeights({
      increase: [],
      decrease: [],
      bandPriorities: {
        Power: 2,
        Contact: 2,
        Speed: 2,
        Defense: 2,
        Rotation: 2,
        Bullpen: 2,
      },
    });
    expect(BANDS.map((band) => balanced[band])).toEqual(BANDS.map(() => 1));
  });

  test('keeps weights one-sided and in range for a power element archetype', () => {
    const weights = archetypeBandWeights(powerIdentity);

    expectStrictMax(weights, 'Power');
    expect(BANDS.every((band) => weights[band] >= 0 && weights[band] <= 1)).toBe(true);
  });

  test('keeps starter batting power in Rotation instead of leaking into lineup Power', () => {
    const weights = archetypeBandWeights({
      increase: ['POW'],
      decrease: [],
      rawShift: { RPOW: 0.1 } as TeamCapIdentity['rawShift'],
    });

    expect(weights.Rotation).toBe(1);
    expect(weights.Power).toBe(0);
  });
});

describe('tiltAnalyzerFindings', () => {
  test('makes Defense holes scream louder under a Defense-max archetype and leaves zero-weight bands untilted', () => {
    const [positionCoverage, rotation] = tiltAnalyzerFindings([
      finding('position-hole', 'position_coverage'),
      finding('rotation-hole', 'rotation'),
    ], defenseFirstIdentity);

    expect(positionCoverage.tiltMultiplier).toBe(1 + FARM_ARCHETYPE_TILT_TUNING.tiltStrength);
    expect(positionCoverage.bandWeight).toBe(1);
    expect(positionCoverage.bands).toEqual(['Defense']);
    expect(rotation.tiltMultiplier).toBe(1);
    expect(rotation.bandWeight).toBe(0);
  });

  test('maps only the five positional and role hole kinds', () => {
    expect(FINDING_KIND_TO_BANDS).toEqual({
      position_coverage: ['Defense'],
      depth_chart: ['Defense'],
      lineup: ['Power', 'Contact', 'Speed'],
      rotation: ['Rotation'],
      bullpen: ['Bullpen'],
    });

    const [unmapped] = tiltAnalyzerFindings([
      finding('chemistry', 'chemistry_balance'),
    ], defenseFirstIdentity);

    expect(unmapped.bands).toEqual([]);
    expect(unmapped.bandWeight).toBe(0);
    expect(unmapped.tiltMultiplier).toBe(1);
  });

  test('gives a power lineup hole the full tilt while unrelated bullpen holes stay neutral', () => {
    const [lineup, bullpen] = tiltAnalyzerFindings([
      finding('lineup-hole', 'lineup'),
      finding('bullpen-hole', 'bullpen'),
    ], powerIdentity);

    expect(lineup.tiltMultiplier).toBe(1 + FARM_ARCHETYPE_TILT_TUNING.tiltStrength);
    expect(lineup.bandWeight).toBe(1);
    expect(bullpen.tiltMultiplier).toBe(1);
    expect(bullpen.bandWeight).toBe(0);
  });
});

describe('sortByTiltedPriority', () => {
  test('sorts by severity first, then tilt multiplier, with stable ties', () => {
    const sorted = sortByTiltedPriority(tiltAnalyzerFindings([
      finding('warning-bullpen', 'bullpen', 'warning'),
      finding('blocker-rotation', 'rotation', 'blocker'),
      finding('warning-lineup-a', 'lineup', 'warning'),
      finding('warning-lineup-b', 'lineup', 'warning'),
    ], powerIdentity));

    expect(sorted.map((row) => row.finding.id)).toEqual([
      'blocker-rotation',
      'warning-lineup-a',
      'warning-lineup-b',
      'warning-bullpen',
    ]);
    expect(sorted[0].tiltMultiplier).toBe(1);
    expect(sorted[1].tiltMultiplier).toBeGreaterThan(sorted[3].tiltMultiplier);
  });
});
