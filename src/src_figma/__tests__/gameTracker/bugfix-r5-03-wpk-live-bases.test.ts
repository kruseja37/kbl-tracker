import { describe, expect, test } from 'vitest';

import { buildLiveBasesFromRunnerOutcomes } from '../../app/utils/liveBaseCorrection';

describe('bugfix R5-03: WP_K latest-at-bat corrections rebuild live bases from runner outcomes', () => {
  test('moves the held runner back from second to first', () => {
    expect(buildLiveBasesFromRunnerOutcomes([
      {
        runnerId: 'runner-1',
        runnerName: 'Runner One',
        fromBase: 'first',
        toBase: 'first',
      },
    ])).toEqual({
      first: true,
      second: false,
      third: false,
    });
  });

  test('preserves the batter on first when a dropped-third-strike runner is corrected back to second', () => {
    expect(buildLiveBasesFromRunnerOutcomes([
      {
        runnerId: 'runner-2',
        runnerName: 'Runner Two',
        fromBase: 'second',
        toBase: 'second',
      },
    ], {
      result: 'WP_K',
      enrichment: {},
    })).toEqual({
      first: true,
      second: true,
      third: false,
    });
  });
});
