/**
 * Bug R3-03: Toggle Out Advancing OFF doesn't restore the run
 *
 * Tests bidirectional toggle: ON → score -1, OFF → score +1
 * Verifies the delta is correct in BOTH directions and that
 * the full ON→OFF cycle returns to the original deltas.
 */
import { describe, it, expect } from 'vitest';
import {
  runnerOutcomeCountsAsRun,
  runnerOutcomeCountsAsOut,
} from '../../app/utils/gameTrackerRunnerCorrection';

describe('Bug R3-03: Out Advancing bidirectional toggle', () => {
  it('should produce opposite deltas for ON vs OFF toggle', () => {
    const baseOutcome = { toBase: 'home' as const, isTootblan: false };

    // Toggle ON: isOutAdvancing false → true
    const onPrev = { ...baseOutcome, isOutAdvancing: false };
    const onNext = { ...baseOutcome, isOutAdvancing: true };
    const onScoreDelta = Number(runnerOutcomeCountsAsRun(onNext)) - Number(runnerOutcomeCountsAsRun(onPrev));
    const onOutDelta = Number(runnerOutcomeCountsAsOut(onNext)) - Number(runnerOutcomeCountsAsOut(onPrev));

    // Toggle OFF: isOutAdvancing true → false
    const offPrev = { ...baseOutcome, isOutAdvancing: true };
    const offNext = { ...baseOutcome, isOutAdvancing: false };
    const offScoreDelta = Number(runnerOutcomeCountsAsRun(offNext)) - Number(runnerOutcomeCountsAsRun(offPrev));
    const offOutDelta = Number(runnerOutcomeCountsAsOut(offNext)) - Number(runnerOutcomeCountsAsOut(offPrev));

    // ON: score -1, outs +1
    expect(onScoreDelta).toBe(-1);
    expect(onOutDelta).toBe(1);

    // OFF: score +1, outs -1 (exact opposite)
    expect(offScoreDelta).toBe(1);
    expect(offOutDelta).toBe(-1);

    // Net effect of ON then OFF = 0
    expect(onScoreDelta + offScoreDelta).toBe(0);
    expect(onOutDelta + offOutDelta).toBe(0);
  });

  it('should handle TOOTBLAN toggle the same way', () => {
    const baseOutcome = { toBase: 'home' as const, isOutAdvancing: false };

    // TOOTBLAN ON: runner was scoring, now out
    const tPrev = { ...baseOutcome, isTootblan: false };
    const tNext = { ...baseOutcome, isTootblan: true };
    const scoreDelta = Number(runnerOutcomeCountsAsRun(tNext)) - Number(runnerOutcomeCountsAsRun(tPrev));
    const outDelta = Number(runnerOutcomeCountsAsOut(tNext)) - Number(runnerOutcomeCountsAsOut(tPrev));

    expect(scoreDelta).toBe(-1);
    expect(outDelta).toBe(1);
  });
});
