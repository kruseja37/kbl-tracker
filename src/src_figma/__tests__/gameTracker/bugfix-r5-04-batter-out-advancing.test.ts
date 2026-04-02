import { describe, expect, test } from 'vitest';

import { createRunnerTrackingState, addRunner } from '../../app/engines/inheritedRunnerTracker';
import {
  buildLiveBasesFromRunnersAfter,
  reconcileRunnerTrackerFromRunnersAfter,
} from '../../app/utils/liveBaseCorrection';

describe('bugfix R5-04: batter out-advancing live correction', () => {
  test('removes the batter from the hit base when marked out advancing', () => {
    let tracker = createRunnerTrackingState('pitcher-1', 'Pitcher One');
    tracker = addRunner(tracker, 'runner-3', 'Runner Three', '3B', 'hit');
    tracker = addRunner(tracker, 'batter-1', 'Batter One', '2B', 'hit');

    const runnersAfter = {
      first: null,
      second: null,
      third: {
        runnerId: 'runner-3',
        runnerName: 'Runner Three',
        responsiblePitcherId: 'pitcher-1',
      },
    };

    const reconciled = reconcileRunnerTrackerFromRunnersAfter(tracker, runnersAfter);

    expect(buildLiveBasesFromRunnersAfter(runnersAfter)).toEqual({ first: false, second: false, third: true });
    expect(reconciled.runners.map((runner) => runner.runnerId)).toEqual(['runner-3']);
    expect(reconciled.runners[0]?.currentBase).toBe('3B');
  });

  test('restores the batter identity when batter out advancing is toggled back off', () => {
    let tracker = createRunnerTrackingState('pitcher-1', 'Pitcher One');
    tracker = addRunner(tracker, 'runner-3', 'Runner Three', '3B', 'hit');

    const runnersAfter = {
      first: null,
      second: {
        runnerId: 'batter-1',
        runnerName: 'Batter One',
        responsiblePitcherId: 'pitcher-1',
      },
      third: {
        runnerId: 'runner-3',
        runnerName: 'Runner Three',
        responsiblePitcherId: 'pitcher-1',
      },
    };

    const reconciled = reconcileRunnerTrackerFromRunnersAfter(tracker, runnersAfter);

    expect(buildLiveBasesFromRunnersAfter(runnersAfter)).toEqual({ first: false, second: true, third: true });
    expect(reconciled.runners.map((runner) => `${runner.runnerId}:${runner.currentBase}`)).toEqual([
      'runner-3:3B',
      'batter-1:2B',
    ]);
    expect(reconciled.runners[1]?.runnerName).toBe('Batter One');
  });

  test('uses the provided howReached override for newly reconciled runners', () => {
    const tracker = createRunnerTrackingState('pitcher-1', 'Pitcher One');
    const runnersAfter = {
      first: {
        runnerId: 'batter-1',
        runnerName: 'Batter One',
        responsiblePitcherId: 'pitcher-1',
      },
      second: null,
      third: null,
    };

    const reconciled = reconcileRunnerTrackerFromRunnersAfter(
      tracker,
      runnersAfter,
      'error',
    );

    expect(reconciled.runners).toHaveLength(1);
    expect(reconciled.runners[0]?.runnerId).toBe('batter-1');
    expect(reconciled.runners[0]?.howReached).toBe('error');
  });
});
