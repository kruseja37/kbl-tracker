import { describe, expect, test } from 'vitest';

import {
  computeFranchiseTvFamilyRaces,
  type TvFamilyValueInput,
  type TvFamilySnapshotInput,
} from '../franchiseTvFamilyScorer';

function values(overrides: TvFamilyValueInput[] = []): TvFamilyValueInput[] {
  return overrides;
}

function snapshots(overrides: TvFamilySnapshotInput[] = []): TvFamilySnapshotInput[] {
  return overrides;
}

describe('franchiseTvFamilyScorer L12-2 pure TV-family races', () => {
  test('KK orders by valueDelta descending with 1-based ranks', () => {
    const result = computeFranchiseTvFamilyRaces({
      values: values([
        { playerId: 'player-mid', valueDelta: 5000, trueValue: 100000 },
        { playerId: 'player-top', valueDelta: 25000, trueValue: 125000 },
        { playerId: 'player-low', valueDelta: -10000, trueValue: 90000 },
      ]),
      snapshots: snapshots([]),
    });

    expect(result.kk.map((candidate) => candidate.playerId)).toEqual([
      'player-top',
      'player-mid',
      'player-low',
    ]);
    expect(result.kk.map((candidate) => candidate.rank)).toEqual([1, 2, 3]);
    expect(result.kk[0]).toMatchObject({
      playerId: 'player-top',
      score: 25000,
      rank: 1,
    });
  });

  test('Bust inverts KK so the most negative valueDelta wins', () => {
    const inputValues = values([
      { playerId: 'underpaid-star', valueDelta: 30000, trueValue: 130000 },
      { playerId: 'neutral-player', valueDelta: 0, trueValue: 100000 },
      { playerId: 'overpaid-bust', valueDelta: -45000, trueValue: 55000 },
      { playerId: 'mild-overpay', valueDelta: -5000, trueValue: 95000 },
    ]);

    const result = computeFranchiseTvFamilyRaces({
      values: inputValues,
      snapshots: snapshots([]),
    });

    const valueDeltaAscending = [...inputValues]
      .sort((left, right) => left.valueDelta - right.valueDelta || left.playerId.localeCompare(right.playerId))
      .map((value) => value.playerId);

    expect(result.bust.map((candidate) => candidate.playerId)).toEqual(valueDeltaAscending);
    expect(result.bust[0]).toMatchObject({
      playerId: 'overpaid-bust',
      score: 45000,
      rank: 1,
    });
    expect(result.bust[0].playerId).not.toBe(result.kk[0].playerId);
  });

  test('Comeback uses currentTV minus seasonLow, not max rise over checkpoints', () => {
    const result = computeFranchiseTvFamilyRaces({
      values: values([
        { playerId: 'gave-it-back', valueDelta: 0, trueValue: 30 },
        { playerId: 'currently-recovered', valueDelta: 0, trueValue: 48 },
      ]),
      snapshots: snapshots([
        { playerId: 'gave-it-back', checkpoint: 1, trueValue: 50 },
        { playerId: 'gave-it-back', checkpoint: 2, trueValue: 20 },
        { playerId: 'gave-it-back', checkpoint: 3, trueValue: 45 },
        { playerId: 'gave-it-back', checkpoint: 4, trueValue: 30 },
        { playerId: 'currently-recovered', checkpoint: 1, trueValue: 50 },
        { playerId: 'currently-recovered', checkpoint: 2, trueValue: 20 },
      ]),
    });

    expect(result.comeback.map((candidate) => ({
      playerId: candidate.playerId,
      score: candidate.score,
    }))).toEqual([
      { playerId: 'currently-recovered', score: 28 },
      { playerId: 'gave-it-back', score: 10 },
    ]);
    expect(result.comeback[0].score).toBeGreaterThan(result.comeback[1].score);
  });

  test('Comeback gives a snapshotless player a zero score and keeps them rankable', () => {
    const result = computeFranchiseTvFamilyRaces({
      values: values([
        { playerId: 'has-trough', valueDelta: 0, trueValue: 25 },
        { playerId: 'snapshotless', valueDelta: 0, trueValue: 40 },
      ]),
      snapshots: snapshots([
        { playerId: 'has-trough', checkpoint: 'late', trueValue: 10 },
      ]),
    });

    expect(result.comeback).toHaveLength(2);
    expect(result.comeback[0]).toMatchObject({
      playerId: 'has-trough',
      score: 15,
      rank: 1,
    });
    expect(result.comeback[1]).toMatchObject({
      playerId: 'snapshotless',
      score: 0,
      rank: 2,
    });
  });

  test('same input twice produces identical deterministic output', () => {
    const input = {
      values: values([
        { playerId: 'b-player', valueDelta: 10, trueValue: 100 },
        { playerId: 'a-player', valueDelta: 10, trueValue: 80 },
        { playerId: 'c-player', valueDelta: -10, trueValue: 70 },
      ]),
      snapshots: snapshots([
        { playerId: 'b-player', checkpoint: '2', trueValue: 90 },
        { playerId: 'a-player', checkpoint: '1', trueValue: 60 },
        { playerId: 'c-player', checkpoint: '3', trueValue: 50 },
      ]),
    };

    const first = computeFranchiseTvFamilyRaces(input);
    const second = computeFranchiseTvFamilyRaces(input);

    expect(second).toEqual(first);
  });

  test('equal scores are ordered by playerId and receive distinct ranks', () => {
    const result = computeFranchiseTvFamilyRaces({
      values: values([
        { playerId: 'z-player', valueDelta: 1000, trueValue: 10 },
        { playerId: 'a-player', valueDelta: 1000, trueValue: 10 },
      ]),
      snapshots: snapshots([]),
    });

    expect(result.kk.map((candidate) => [candidate.playerId, candidate.rank])).toEqual([
      ['a-player', 1],
      ['z-player', 2],
    ]);
    expect(result.comeback.map((candidate) => [candidate.playerId, candidate.score, candidate.rank])).toEqual([
      ['a-player', 0, 1],
      ['z-player', 0, 2],
    ]);
  });

  test('percentiles are monotonic with score and remain within [0, 1]', () => {
    const result = computeFranchiseTvFamilyRaces({
      values: values([
        { playerId: 'low', valueDelta: -10, trueValue: 100 },
        { playerId: 'middle', valueDelta: 0, trueValue: 100 },
        { playerId: 'high', valueDelta: 10, trueValue: 100 },
      ]),
      snapshots: snapshots([]),
    });

    for (const category of [result.kk, result.bust, result.comeback]) {
      for (const candidate of category) {
        expect(candidate.percentile).toBeGreaterThanOrEqual(0);
        expect(candidate.percentile).toBeLessThanOrEqual(1);
      }
    }

    expect(result.kk[0].percentile).toBeGreaterThan(result.kk[1].percentile);
    expect(result.kk[1].percentile).toBeGreaterThan(result.kk[2].percentile);
  });

  test('empty values return empty categories and one candidate follows getPercentile single-element behavior', () => {
    const empty = computeFranchiseTvFamilyRaces({
      values: values([]),
      snapshots: snapshots([
        { playerId: 'ignored', checkpoint: 1, trueValue: 10 },
      ]),
    });

    expect(empty).toEqual({
      kk: [],
      bust: [],
      comeback: [],
    });

    const single = computeFranchiseTvFamilyRaces({
      values: values([{ playerId: 'only-player', valueDelta: 42, trueValue: 100 }]),
      snapshots: snapshots([]),
    });

    expect(single.kk[0]).toMatchObject({
      playerId: 'only-player',
      score: 42,
      percentile: 1,
      rank: 1,
    });
    expect(single.bust[0]).toMatchObject({
      playerId: 'only-player',
      score: -42,
      percentile: 1,
      rank: 1,
    });
    expect(single.comeback[0]).toMatchObject({
      playerId: 'only-player',
      score: 0,
      percentile: 1,
      rank: 1,
    });
  });
});
