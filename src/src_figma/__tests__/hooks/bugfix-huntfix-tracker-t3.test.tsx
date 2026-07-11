import { act } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  initializeGame,
  getHarnessMocks,
  renderGameStateHook,
  resetHarnessMocks,
} from './huntfixTrackerTestHarness';

const mocks = getHarnessMocks();

async function seedRunnerOnThird(
  result: ReturnType<typeof renderGameStateHook>['result'],
) {
  await act(async () => {
    await result.current.recordHit('3B', 0);
  });
  mocks.logAtBatEvent.mockClear();
}

describe('HUNTFIX-TRACKER-1 T3 quick error state coherence', () => {
  beforeEach(resetHarnessMocks);

  test('quick error scores R3 and keeps bases, tracker, event, and score aligned', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't3-quick-r3');
    await seedRunnerOnThird(result);

    await act(async () => {
      await result.current.commitPlateAppearance({ type: 'error', rbi: 0 });
    });

    const event = mocks.logAtBatEvent.mock.calls[0][0];
    const tracker = result.current.getRunnerTrackerSnapshot();
    expect(result.current.gameState.awayScore).toBe(1);
    expect(result.current.gameState.bases).toEqual({
      first: true,
      second: false,
      third: false,
    });
    expect(tracker.runners.filter((runner) => runner.currentBase === '3B')).toHaveLength(0);
    expect(tracker.runners.filter((runner) => runner.currentBase === '1B')).toHaveLength(1);
    expect(event).toMatchObject({ runsScored: 1, awayScore: 0, awayScoreAfter: 1 });
  });

  test('quick error with empty bases remains a scoreless batter-to-first play', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't3-empty');

    await act(async () => {
      await result.current.commitPlateAppearance({ type: 'error', rbi: 0 });
    });

    expect(result.current.gameState.awayScore).toBe(0);
    expect(result.current.gameState.bases).toEqual({
      first: true,
      second: false,
      third: false,
    });
    expect(mocks.logAtBatEvent.mock.calls[0][0].runsScored).toBe(0);
  });

  test('detailed error runner data still scores R3 coherently', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't3-detailed');
    await seedRunnerOnThird(result);

    await act(async () => {
      await result.current.commitPlateAppearance({
        type: 'error',
        rbi: 0,
        runnerAdvancement: { fromThird: 'home' },
      });
    });

    expect(result.current.gameState.awayScore).toBe(1);
    expect(result.current.gameState.bases.third).toBe(false);
    const tracker = result.current.getRunnerTrackerSnapshot();
    expect(tracker.runners.some((runner) => runner.currentBase === '3B')).toBe(false);
    expect(tracker.runners.filter((runner) => runner.currentBase === '1B')).toHaveLength(1);
    expect(mocks.logAtBatEvent.mock.calls[0][0]).toMatchObject({
      runsScored: 1,
      awayScoreAfter: 1,
    });
  });
});
