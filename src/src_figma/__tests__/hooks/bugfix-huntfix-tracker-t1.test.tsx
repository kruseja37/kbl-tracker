import { act } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  initializeGame,
  renderGameStateHook,
  resetHarnessMocks,
} from './huntfixTrackerTestHarness';

async function recordThreeStrikeouts(
  result: ReturnType<typeof renderGameStateHook>['result'],
) {
  for (let index = 0; index < 3; index += 1) {
    await act(async () => {
      await result.current.recordOut('K');
    });
  }
}

async function finishHalfInning(
  result: ReturnType<typeof renderGameStateHook>['result'],
  pitcherId: string,
  cumulativePitchCount: number,
) {
  act(() => result.current.endInning());
  let confirmation: Awaited<ReturnType<typeof result.current.confirmPitchCount>> | undefined;
  await act(async () => {
    confirmation = await result.current.confirmPitchCount(
      pitcherId,
      cumulativePitchCount,
    );
  });
  return confirmation;
}

describe('HUNTFIX-TRACKER-1 T1 immaculate inning pitch delta', () => {
  beforeEach(resetHarnessMocks);

  test('detects a reliever with 15 prior cumulative pitches and a 9-pitch 3K inning', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result);

    act(() => {
      result.current.startGame();
      result.current.changePitcher('home-rp', 'home-sp', 'home', 'Home Reliever', 'Home Starter');
    });
    await act(async () => {
      await result.current.confirmPitchCount('home-sp', 0);
    });

    await recordThreeStrikeouts(result);
    act(() => result.current.endInning());
    await act(async () => {
      await result.current.confirmPitchCount('home-rp', 15);
    });

    act(() => result.current.endInning());
    await act(async () => {
      await result.current.confirmPitchCount('away-sp', 0);
    });

    await recordThreeStrikeouts(result);
    act(() => result.current.endInning());
    let confirmation: Awaited<ReturnType<typeof result.current.confirmPitchCount>> | undefined;
    await act(async () => {
      confirmation = await result.current.confirmPitchCount('home-rp', 24);
    });

    expect(confirmation?.immaculateInning).toMatchObject({
      pitcherId: 'home-rp',
      pitcherName: 'Home Reliever',
    });
  });

  test('does not detect a 10-pitch 3K inning', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't1-ten-pitches');
    act(() => result.current.startGame());
    await recordThreeStrikeouts(result);
    act(() => result.current.endInning());

    let confirmation: Awaited<ReturnType<typeof result.current.confirmPitchCount>> | undefined;
    await act(async () => {
      confirmation = await result.current.confirmPitchCount('home-sp', 10);
    });
    expect(confirmation?.immaculateInning).toBeUndefined();
  });

  test('still detects a starter first-inning 9-pitch 3K inning', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't1-starter');
    act(() => result.current.startGame());
    await recordThreeStrikeouts(result);
    act(() => result.current.endInning());

    let confirmation: Awaited<ReturnType<typeof result.current.confirmPitchCount>> | undefined;
    await act(async () => {
      confirmation = await result.current.confirmPitchCount('home-sp', 9);
    });
    expect(confirmation?.immaculateInning?.pitcherId).toBe('home-sp');
  });

  test('detects a continuing starter throwing an immaculate third inning', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't1-third-inning');
    act(() => result.current.startGame());

    expect(await finishHalfInning(result, 'home-sp', 12)).not.toHaveProperty(
      'immaculateInning',
    );
    expect(await finishHalfInning(result, 'away-sp', 8)).not.toHaveProperty(
      'immaculateInning',
    );
    expect(await finishHalfInning(result, 'home-sp', 21)).not.toHaveProperty(
      'immaculateInning',
    );
    expect(await finishHalfInning(result, 'away-sp', 17)).not.toHaveProperty(
      'immaculateInning',
    );

    await recordThreeStrikeouts(result);
    const confirmation = await finishHalfInning(result, 'home-sp', 30);

    expect(confirmation?.immaculateInning).toMatchObject({
      pitcherId: 'home-sp',
      pitcherName: 'Home Starter',
    });
  });

  test('does not combine three first-inning pitches with six second-inning pitches', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't1-three-plus-six');
    act(() => result.current.startGame());

    await recordThreeStrikeouts(result);
    expect(await finishHalfInning(result, 'home-sp', 3)).not.toHaveProperty(
      'immaculateInning',
    );
    await finishHalfInning(result, 'away-sp', 5);

    const confirmation = await finishHalfInning(result, 'home-sp', 9);
    expect(confirmation?.immaculateInning).toBeUndefined();
  });

  test("does not use one pitcher's half-inning snapshot for the alternating pitcher", async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't1-alternating-pitchers');
    act(() => result.current.startGame());

    await recordThreeStrikeouts(result);
    act(() => result.current.endInning());

    let confirmation: Awaited<ReturnType<typeof result.current.confirmPitchCount>> | undefined;
    await act(async () => {
      confirmation = await result.current.confirmPitchCount('away-sp', 9);
    });

    expect(confirmation?.immaculateInning).toBeUndefined();
  });

  test('does not combine strikeouts across a mid-inning pitching change', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't1-mid-inning-change');
    act(() => result.current.startGame());

    await act(async () => {
      await result.current.recordOut('K');
    });
    act(() => {
      result.current.changePitcher(
        'home-rp',
        'home-sp',
        'home',
        'Home Reliever',
        'Home Starter',
      );
    });
    await act(async () => {
      await result.current.confirmPitchCount('home-sp', 4);
    });

    for (let index = 0; index < 2; index += 1) {
      await act(async () => {
        await result.current.recordOut('K');
      });
    }
    const confirmation = await finishHalfInning(result, 'home-rp', 9);

    expect(confirmation?.immaculateInning).toBeUndefined();
  });
});
