import { act } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  initializeGame,
  getHarnessMocks,
  renderGameStateHook,
  resetHarnessMocks,
} from './huntfixTrackerTestHarness';

const mocks = getHarnessMocks();

describe('HUNTFIX-TRACKER-1 T2 D3K event run truth', () => {
  beforeEach(resetHarnessMocks);

  test('persists the R3 run and a score-after delta on dropped third strike', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't2-d3k');

    await act(async () => {
      await result.current.recordHit('3B', 0);
    });
    mocks.logAtBatEvent.mockClear();

    await act(async () => {
      await result.current.recordD3K(
        true,
        { fromThird: 'home' },
        3,
        'wild_pitch',
      );
    });

    const event = mocks.logAtBatEvent.mock.calls[0][0];
    expect(event.rbiCount).toBe(0);
    expect(event.runsScored).toBe(1);
    expect(event.awayScoreAfter - event.awayScore).toBe(1);
    expect(event.homeScoreAfter - event.homeScore).toBe(0);
  });
});
