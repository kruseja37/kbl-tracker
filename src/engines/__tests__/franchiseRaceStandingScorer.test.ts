import { describe, expect, test } from 'vitest';

import { FAME_TIER_RANK, resolveFameTier } from '../fameModel';
import {
  computeFranchiseRaceStanding,
  FAN_VOTE_WEIGHTS,
  MERIT_RACE_WEIGHTS,
  type RaceStandingCandidate,
  type RaceWeightProfile,
} from '../franchiseRaceStandingScorer';
import { scoreForCategory } from '../../utils/franchiseAwardsEngine';

function candidate(
  playerId: string,
  meritScore: number,
  fameHeat = 0,
  fameReachFloor = 0,
): RaceStandingCandidate {
  return {
    playerId,
    meritScore,
    fameHeat,
    fameReachFloor,
  };
}

function noFameWeights(overrides: Partial<RaceWeightProfile> = {}): RaceWeightProfile {
  return {
    ...MERIT_RACE_WEIGHTS,
    wFame: 0,
    tiltWindow: 0,
    meritFloor: Number.POSITIVE_INFINITY,
    ...overrides,
  };
}

function selectorRow(warPreviewValues: {
  totalWar?: number | null;
  fieldingWar?: number | null;
}): Parameters<ReturnType<typeof scoreForCategory>>[0] {
  return {
    warPreviewValues: {
      totalWar: 0,
      battingWar: 0,
      pitchingWar: null,
      fieldingWar: 0,
      baserunningWar: 0,
      totalWarSource: 'stat-row',
      trustedForFinalValue: true,
      ...warPreviewValues,
    },
  } as Parameters<ReturnType<typeof scoreForCategory>>[0];
}

describe('franchiseRaceStandingScorer L12-3a race standings', () => {
  test('merit-dominant weights keep a clear merit leader ahead of a high-fame non-close player', () => {
    const standing = computeFranchiseRaceStanding({
      candidates: [
        candidate('clear-merit-leader', 10, -20),
        candidate('low-merit-famous', 1, 40),
        candidate('middle-merit', 5),
      ],
      weights: MERIT_RACE_WEIGHTS,
    });

    expect(standing[0].playerId).toBe('clear-merit-leader');
    expect(standing.find((row) => row.playerId === 'low-merit-famous')?.fameActive)
      .toBe(false);
    expect(standing.find((row) => row.playerId === 'low-merit-famous')?.rank)
      .toBeGreaterThan(1);
  });

  test('Q3 close-race fame tilt can promote the higher-fame contender but is gated by the merit floor', () => {
    const tilted = computeFranchiseRaceStanding({
      candidates: [
        candidate('merit-leader', 5, -20),
        candidate('famous-close-contender', 4.8, 40),
        candidate('filler-1', 4.4),
        candidate('filler-2', 4.3),
        candidate('filler-3', 4.2),
        candidate('filler-4', 4.1),
        candidate('filler-5', 4),
        candidate('filler-6', 3),
        candidate('filler-7', 2),
        candidate('filler-8', 1),
      ],
      weights: MERIT_RACE_WEIGHTS,
    });

    expect(tilted[0].playerId).toBe('famous-close-contender');
    expect(tilted.find((row) => row.playerId === 'famous-close-contender')?.fameActive)
      .toBe(true);
    expect(tilted.find((row) => row.playerId === 'merit-leader')?.fameActive)
      .toBe(true);
    expect(tilted.find((row) => row.playerId === 'famous-close-contender')?.rank)
      .toBeLessThan(tilted.find((row) => row.playerId === 'merit-leader')?.rank ?? 0);

    const belowFloor = computeFranchiseRaceStanding({
      candidates: [
        candidate('below-floor-leader', 0.9, -20),
        candidate('below-floor-famous', 0.7, 40),
      ],
      weights: MERIT_RACE_WEIGHTS,
    });

    expect(belowFloor.map((row) => row.playerId)).toEqual([
      'below-floor-leader',
      'below-floor-famous',
    ]);
    expect(belowFloor.every((row) => row.fameActive)).toBe(false);
  });

  test('Q3 close-race fame tilt is gated by the strict tilt window', () => {
    const standing = computeFranchiseRaceStanding({
      candidates: [
        candidate('window-merit-leader', 5, -20),
        candidate('window-famous-contender', 4.5, 40),
        candidate('window-filler-1', 4.4),
        candidate('window-filler-2', 4.3),
        candidate('window-filler-3', 4.2),
        candidate('window-filler-4', 4.1),
        candidate('window-filler-5', 4),
        candidate('window-filler-6', 3),
        candidate('window-filler-7', 2),
        candidate('window-filler-8', 1),
      ],
      weights: MERIT_RACE_WEIGHTS,
    });

    expect(standing[0].playerId).toBe('window-merit-leader');
    expect(standing.find((row) => row.playerId === 'window-famous-contender')?.marginToWinner)
      .toBe(-0.5);
    expect(standing.find((row) => row.playerId === 'window-famous-contender')?.fameActive)
      .toBe(false);
  });

  test('fan-vote weights are fame-led and keep fame active for every candidate', () => {
    const standing = computeFranchiseRaceStanding({
      candidates: [
        candidate('low-fame-high-merit', 10, -20),
        candidate('high-fame-mid-merit', 8, 40),
      ],
      weights: FAN_VOTE_WEIGHTS,
    });

    expect(standing.map((row) => row.playerId)).toEqual([
      'high-fame-mid-merit',
      'low-fame-high-merit',
    ]);
    expect(standing.every((row) => row.fameActive)).toBe(true);
  });

  test('score gaps create clustering bands while tight gaps share a band', () => {
    const standing = computeFranchiseRaceStanding({
      candidates: [
        candidate('top', 4),
        candidate('cluster-b', 3),
        candidate('cluster-a', 3),
        candidate('distant', 1),
      ],
      weights: noFameWeights({ bandGap: 0.3 }),
    });

    expect(standing.map((row) => [row.playerId, row.composite, row.band])).toEqual([
      ['top', 1, 1],
      ['cluster-a', 0.75, 1],
      ['cluster-b', 0.75, 1],
      ['distant', 0.25, 2],
    ]);
  });

  test('fameRank resolves UNKNOWN for no fame record and increases for high heat', () => {
    const standing = computeFranchiseRaceStanding({
      candidates: [
        candidate('unknown-fame', 2, 0, 0),
        candidate('heat-legend', 1, 40, 0),
      ],
      weights: FAN_VOTE_WEIGHTS,
    });

    const unknown = standing.find((row) => row.playerId === 'unknown-fame');
    const legend = standing.find((row) => row.playerId === 'heat-legend');

    expect(unknown?.fameRank).toBe(0);
    expect(legend?.fameRank).toBe(FAME_TIER_RANK[resolveFameTier(40, 0)]);
    expect(legend?.fameRank).toBeGreaterThan(unknown?.fameRank ?? 0);
  });

  test('same input is deterministic and equal composite plus equal merit ties break by playerId', () => {
    const input = {
      candidates: [
        candidate('b-player', 2),
        candidate('a-player', 2),
      ],
      weights: noFameWeights(),
    };

    const first = computeFranchiseRaceStanding(input);
    const second = computeFranchiseRaceStanding(input);

    expect(second).toEqual(first);
    expect(first.map((row) => [row.playerId, row.rank])).toEqual([
      ['a-player', 1],
      ['b-player', 2],
    ]);
  });

  test('empty candidates return an empty standing', () => {
    expect(computeFranchiseRaceStanding({
      candidates: [],
      weights: MERIT_RACE_WEIGHTS,
    })).toEqual([]);
  });
});

describe('franchiseAwardsEngine L12-3a merit selectors', () => {
  test('Bench Player selector uses total WAR', () => {
    const selector = scoreForCategory('BENCH_PLAYER');

    expect(selector(selectorRow({ totalWar: 3.75 }))).toBe(3.75);
  });

  test('Booger Glove selector inverts finite fielding WAR and null-guards missing fielding WAR', () => {
    const selector = scoreForCategory('BOOGER_GLOVE');

    expect(selector(selectorRow({ fieldingWar: 1.25 }))).toBe(-1.25);
    expect(selector(selectorRow({ fieldingWar: null }))).toBeNull();
  });
});
