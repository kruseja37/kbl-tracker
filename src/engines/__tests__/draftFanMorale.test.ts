import { describe, expect, test } from 'vitest';

import {
  DRAFT_FAN_MORALE_TUNING,
  computeDraftFanMorale,
  type DraftFanMoraleResult,
} from '../draftFanMorale';

function byTeam(results: DraftFanMoraleResult[]): Map<string, DraftFanMoraleResult> {
  return new Map(results.map((result) => [result.teamId, result]));
}

function rankedLeague(size: number): Array<{ teamId: string; payroll: number }> {
  return Array.from({ length: size }, (_, index) => ({
    teamId: `team-${index}`,
    payroll: index,
  }));
}

describe('draftFanMorale RB-6 payroll-rank starting fan morale engine', () => {
  test('median and threshold-band teams are exactly neutral 50', () => {
    const results = byTeam(computeDraftFanMorale(rankedLeague(5)));

    expect(results.get('team-1')).toMatchObject({
      normalizedRank: 0.25,
      startingFanMorale: 50,
      penalty: 0,
    });
    expect(results.get('team-2')).toMatchObject({
      normalizedRank: 0.5,
      startingFanMorale: 50,
      penalty: 0,
    });
    expect(results.get('team-3')).toMatchObject({
      normalizedRank: 0.75,
      startingFanMorale: 50,
      penalty: 0,
    });
  });

  test('top-payroll team is lowest morale and both payroll extremes fall below 50', () => {
    const results = computeDraftFanMorale(rankedLeague(5));
    const mapped = byTeam(results);
    const bottom = mapped.get('team-0');
    const top = mapped.get('team-4');

    expect(bottom?.startingFanMorale).toBeLessThan(50);
    expect(top?.startingFanMorale).toBeLessThan(50);
    expect(top?.startingFanMorale).toBe(Math.min(...results.map((result) => result.startingFanMorale)));
    expect(top?.startingFanMorale).toBeLessThan(bottom?.startingFanMorale ?? 0);
  });

  test('high side penalty is exactly 2x low side penalty at symmetric extremes', () => {
    const results = byTeam(computeDraftFanMorale(rankedLeague(5)));
    const bottomPenalty = results.get('team-0')?.penalty ?? 0;
    const topPenalty = results.get('team-4')?.penalty ?? 0;

    expect(bottomPenalty).toBe(DRAFT_FAN_MORALE_TUNING.lowSideMaxPenalty);
    expect(topPenalty).toBe(DRAFT_FAN_MORALE_TUNING.highSideMaxPenalty);
    expect(topPenalty).toBeCloseTo(bottomPenalty * 2, 10);
  });

  test('ramp is monotonic on both ends and convex past the high threshold', () => {
    const results = byTeam(computeDraftFanMorale(rankedLeague(9)));
    const lowExtreme = results.get('team-0');
    const lowMid = results.get('team-1');
    const lowThreshold = results.get('team-2');
    const highThreshold = results.get('team-6');
    const highMid = results.get('team-7');
    const highExtreme = results.get('team-8');

    expect(lowExtreme?.normalizedRank).toBe(0);
    expect(lowMid?.normalizedRank).toBe(0.125);
    expect(lowThreshold?.normalizedRank).toBe(0.25);
    expect(lowExtreme?.startingFanMorale).toBeLessThan(lowMid?.startingFanMorale ?? 0);
    expect(lowMid?.startingFanMorale).toBeLessThan(lowThreshold?.startingFanMorale ?? 0);
    expect(lowThreshold?.startingFanMorale).toBe(50);

    expect(highThreshold?.normalizedRank).toBe(0.75);
    expect(highMid?.normalizedRank).toBe(0.875);
    expect(highExtreme?.normalizedRank).toBe(1);
    expect(highMid?.startingFanMorale).toBeLessThan(highThreshold?.startingFanMorale ?? 0);
    expect(highExtreme?.startingFanMorale).toBeLessThan(highMid?.startingFanMorale ?? 0);

    const firstHighJump = (highThreshold?.startingFanMorale ?? 0) - (highMid?.startingFanMorale ?? 0);
    const secondHighJump = (highMid?.startingFanMorale ?? 0) - (highExtreme?.startingFanMorale ?? 0);
    expect(secondHighJump).toBeGreaterThan(firstHighJump);
  });

  test('tied payrolls use average rank', () => {
    const results = byTeam(computeDraftFanMorale([
      { teamId: 'low', payroll: 10 },
      { teamId: 'tie-a', payroll: 20 },
      { teamId: 'tie-b', payroll: 20 },
      { teamId: 'high', payroll: 40 },
    ]));

    expect(results.get('tie-a')).toMatchObject({
      normalizedRank: 0.5,
      startingFanMorale: 50,
      penalty: 0,
    });
    expect(results.get('tie-b')).toMatchObject({
      normalizedRank: 0.5,
      startingFanMorale: 50,
      penalty: 0,
    });
  });

  test('all-equal payroll is degenerate neutral for every team', () => {
    const results = computeDraftFanMorale([
      { teamId: 'a', payroll: 100 },
      { teamId: 'b', payroll: 100 },
      { teamId: 'c', payroll: 100 },
    ]);

    expect(results).toEqual([
      { teamId: 'a', startingFanMorale: 50, normalizedRank: 0.5, penalty: 0 },
      { teamId: 'b', startingFanMorale: 50, normalizedRank: 0.5, penalty: 0 },
      { teamId: 'c', startingFanMorale: 50, normalizedRank: 0.5, penalty: 0 },
    ]);
  });

  test('single-team league is degenerate neutral', () => {
    expect(computeDraftFanMorale([{ teamId: 'only', payroll: 999 }])).toEqual([
      { teamId: 'only', startingFanMorale: 50, normalizedRank: 0.5, penalty: 0 },
    ]);
  });

  test('clamp keeps morale inside [0, 100] with extreme tuning', () => {
    const results = byTeam(computeDraftFanMorale(
      rankedLeague(5),
      {
        ...DRAFT_FAN_MORALE_TUNING,
        neutralMorale: 150,
        lowSideMaxPenalty: 1000,
        highSideMaxPenalty: 2000,
      },
    ));

    expect(results.get('team-0')?.startingFanMorale).toBe(0);
    expect(results.get('team-2')?.startingFanMorale).toBe(100);
    expect(results.get('team-4')?.startingFanMorale).toBe(0);

    for (const result of results.values()) {
      expect(result.startingFanMorale).toBeGreaterThanOrEqual(0);
      expect(result.startingFanMorale).toBeLessThanOrEqual(100);
    }
  });
});
