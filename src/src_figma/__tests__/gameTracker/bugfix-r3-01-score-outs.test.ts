/**
 * Bug R3-01: Runner "out" correction doesn't update score or outs
 *
 * Scenario: Runner scores on a hit. User taps runner sub-entry, toggles "Out Advancing" ON.
 * Expected: scoreDelta = -1, outDelta = +1
 * Actual (before fix): ScoreBug score and outs unchanged
 *
 * Tests the ACTUAL production functions that compute deltas and verify the logic chain.
 */
import { describe, it, expect } from 'vitest';
import {
  runnerOutcomeCountsAsRun,
  runnerOutcomeCountsAsOut,
  type PersistedRunnerOutcome,
} from '../../app/utils/gameTrackerRunnerCorrection';

describe('Bug R3-01: Runner correction score + outs delta', () => {
  // Scenario: Runner was at home (scored), user toggles "Out Advancing" ON
  it('should produce scoreDelta=-1 and outDelta=+1 when runner changes from scored to out-advancing', () => {
    const previousOutcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'> = {
      toBase: 'home',
      isTootblan: false,
      isOutAdvancing: false,
    };
    const nextOutcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'> = {
      toBase: 'home',
      isTootblan: false,
      isOutAdvancing: true,
    };

    const previousRunCounted = runnerOutcomeCountsAsRun(previousOutcome);
    const nextRunCounted = runnerOutcomeCountsAsRun(nextOutcome);
    const previousOutCounted = runnerOutcomeCountsAsOut(previousOutcome);
    const nextOutCounted = runnerOutcomeCountsAsOut(nextOutcome);

    const scoreDelta = Number(nextRunCounted) - Number(previousRunCounted);
    const outDelta = Number(nextOutCounted) - Number(previousOutCounted);

    // Before: runner scored (run=true, out=false)
    expect(previousRunCounted).toBe(true);
    expect(previousOutCounted).toBe(false);

    // After: runner out advancing (run=false, out=true)
    expect(nextRunCounted).toBe(false);
    expect(nextOutCounted).toBe(true);

    // Deltas
    expect(scoreDelta).toBe(-1); // Score should decrement
    expect(outDelta).toBe(1);    // Outs should increment
  });

  // Scenario: Runner was out advancing, user toggles "Out Advancing" OFF (restore)
  it('should produce scoreDelta=+1 and outDelta=-1 when runner changes from out-advancing back to scored', () => {
    const previousOutcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'> = {
      toBase: 'home',
      isTootblan: false,
      isOutAdvancing: true,
    };
    const nextOutcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'> = {
      toBase: 'home',
      isTootblan: false,
      isOutAdvancing: false,
    };

    const scoreDelta = Number(runnerOutcomeCountsAsRun(nextOutcome)) - Number(runnerOutcomeCountsAsRun(previousOutcome));
    const outDelta = Number(runnerOutcomeCountsAsOut(nextOutcome)) - Number(runnerOutcomeCountsAsOut(previousOutcome));

    expect(scoreDelta).toBe(1);  // Score should restore (increment)
    expect(outDelta).toBe(-1);   // Outs should decrement
  });

  // Scenario: Runner destination changed from 'home' to 'out'
  it('should produce scoreDelta=-1 and outDelta=+1 when runner changes from home to out', () => {
    const previousOutcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'> = {
      toBase: 'home',
      isTootblan: false,
      isOutAdvancing: false,
    };
    const nextOutcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'> = {
      toBase: 'out',
      isTootblan: false,
      isOutAdvancing: false,
    };

    const scoreDelta = Number(runnerOutcomeCountsAsRun(nextOutcome)) - Number(runnerOutcomeCountsAsRun(previousOutcome));
    const outDelta = Number(runnerOutcomeCountsAsOut(nextOutcome)) - Number(runnerOutcomeCountsAsOut(previousOutcome));

    expect(scoreDelta).toBe(-1);
    expect(outDelta).toBe(1);
  });

  // Scenario: Runner changed from safe at 2B to out (no score change, outs +1)
  it('should produce scoreDelta=0 and outDelta=+1 when runner changes from safe at 2B to out', () => {
    const previousOutcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'> = {
      toBase: 'second',
      isTootblan: false,
      isOutAdvancing: false,
    };
    const nextOutcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'> = {
      toBase: 'out',
      isTootblan: false,
      isOutAdvancing: false,
    };

    const scoreDelta = Number(runnerOutcomeCountsAsRun(nextOutcome)) - Number(runnerOutcomeCountsAsRun(previousOutcome));
    const outDelta = Number(runnerOutcomeCountsAsOut(nextOutcome)) - Number(runnerOutcomeCountsAsOut(previousOutcome));

    expect(scoreDelta).toBe(0);  // Runner wasn't scoring, so no score change
    expect(outDelta).toBe(1);    // But they are now out
  });
});
