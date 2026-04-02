/**
 * Bug R3-02: Runner base destination change doesn't update live bases
 *
 * Scenario: WP_K runner auto-advances from 2B to 3B. User changes destination back to 2B.
 * Expected: bases = { first: false, second: true, third: false }
 * Actual (before fix): bases unchanged (still shows 3B)
 *
 * Tests the nextRunnersAfter computation logic — when a runner's toBase changes,
 * the runnersAfter object must reflect the corrected destination.
 */
import { describe, it, expect } from 'vitest';
import {
  runnerOutcomeCountsAsRun,
  runnerOutcomeCountsAsOut,
} from '../../app/utils/gameTrackerRunnerCorrection';

describe('Bug R3-02: Runner destination change updates bases', () => {
  it('should compute correct nextRunnersAfter when runner held at 2B instead of advancing to 3B', () => {
    // Simulate the runnersAfter computation from handleRunnerEnrichmentUpdate
    // This mirrors the logic at ~line 4672-4689 of GameTracker.tsx

    const runnerId = 'runner-1';
    const runnerName = 'Test Runner';
    const pitcherId = 'pitcher-1';

    // existingAtBat.runnersAfter BEFORE correction: runner on 3B
    const existingRunnersAfter = {
      first: null as null | { runnerId: string; runnerName: string; responsiblePitcherId: string },
      second: null as null | { runnerId: string; runnerName: string; responsiblePitcherId: string },
      third: { runnerId, runnerName, responsiblePitcherId: pitcherId },
    };

    // Previous outcome: runner advanced to 3B
    const previousOutcome = { toBase: 'third' as const, runnerId, runnerName, isOutAdvancing: false, isTootblan: false };
    // Next outcome: runner held at 2B (correction)
    const nextOutcome = { toBase: 'second' as const, runnerId, runnerName, isOutAdvancing: false, isTootblan: false };

    const nextOutCounted = runnerOutcomeCountsAsOut(nextOutcome);

    // Step 1: Clear runner from all bases (mirror handler logic)
    const nextRunnersAfter = {
      ...existingRunnersAfter,
      first: existingRunnersAfter.first?.runnerId === runnerId ? null : existingRunnersAfter.first,
      second: existingRunnersAfter.second?.runnerId === runnerId ? null : existingRunnersAfter.second,
      third: existingRunnersAfter.third?.runnerId === runnerId ? null : existingRunnersAfter.third,
    };

    // Step 2: Place runner at new destination (if safe)
    if (['first', 'second', 'third'].includes(nextOutcome.toBase) && !nextOutCounted) {
      const destinationKey = nextOutcome.toBase as 'first' | 'second' | 'third';
      nextRunnersAfter[destinationKey] = {
        runnerId,
        runnerName,
        responsiblePitcherId: pitcherId,
      };
    }

    // Verify bases from nextRunnersAfter
    const bases = {
      first: !!nextRunnersAfter.first,
      second: !!nextRunnersAfter.second,
      third: !!nextRunnersAfter.third,
    };

    expect(bases.first).toBe(false);
    expect(bases.second).toBe(true);  // Runner held at 2B
    expect(bases.third).toBe(false);  // Runner NOT at 3B anymore
  });

  it('should compute correct nextRunnersAfter when runner changed from out to safe at 2B', () => {
    const runnerId = 'runner-1';
    const runnerName = 'Test Runner';
    const pitcherId = 'pitcher-1';

    // existingAtBat.runnersAfter BEFORE correction: runner is out (not on any base)
    const existingRunnersAfter = {
      first: null as null | { runnerId: string; runnerName: string; responsiblePitcherId: string },
      second: null as null | { runnerId: string; runnerName: string; responsiblePitcherId: string },
      third: null as null | { runnerId: string; runnerName: string; responsiblePitcherId: string },
    };

    const nextOutcome = { toBase: 'second' as const, runnerId, runnerName, isOutAdvancing: false, isTootblan: false };
    const nextOutCounted = runnerOutcomeCountsAsOut(nextOutcome);

    const nextRunnersAfter = {
      ...existingRunnersAfter,
      first: existingRunnersAfter.first?.runnerId === runnerId ? null : existingRunnersAfter.first,
      second: existingRunnersAfter.second?.runnerId === runnerId ? null : existingRunnersAfter.second,
      third: existingRunnersAfter.third?.runnerId === runnerId ? null : existingRunnersAfter.third,
    };

    if (['first', 'second', 'third'].includes(nextOutcome.toBase) && !nextOutCounted) {
      const destinationKey = nextOutcome.toBase as 'first' | 'second' | 'third';
      nextRunnersAfter[destinationKey] = {
        runnerId,
        runnerName,
        responsiblePitcherId: pitcherId,
      };
    }

    const bases = {
      first: !!nextRunnersAfter.first,
      second: !!nextRunnersAfter.second,
      third: !!nextRunnersAfter.third,
    };

    expect(bases.second).toBe(true);
    expect(bases.first).toBe(false);
    expect(bases.third).toBe(false);
  });

  it('should clear runner from bases when destination changed to out', () => {
    const runnerId = 'runner-1';
    const runnerName = 'Test Runner';
    const pitcherId = 'pitcher-1';

    const existingRunnersAfter = {
      first: null as null | { runnerId: string; runnerName: string; responsiblePitcherId: string },
      second: { runnerId, runnerName, responsiblePitcherId: pitcherId },
      third: null as null | { runnerId: string; runnerName: string; responsiblePitcherId: string },
    };

    const nextOutcome = { toBase: 'out' as const, runnerId, runnerName, isOutAdvancing: false, isTootblan: false };
    const nextOutCounted = runnerOutcomeCountsAsOut(nextOutcome);

    const nextRunnersAfter = {
      ...existingRunnersAfter,
      first: existingRunnersAfter.first?.runnerId === runnerId ? null : existingRunnersAfter.first,
      second: existingRunnersAfter.second?.runnerId === runnerId ? null : existingRunnersAfter.second,
      third: existingRunnersAfter.third?.runnerId === runnerId ? null : existingRunnersAfter.third,
    };

    if (['first', 'second', 'third'].includes(nextOutcome.toBase) && !nextOutCounted) {
      const destinationKey = nextOutcome.toBase as 'first' | 'second' | 'third';
      nextRunnersAfter[destinationKey] = {
        runnerId,
        runnerName,
        responsiblePitcherId: pitcherId,
      };
    }

    const bases = {
      first: !!nextRunnersAfter.first,
      second: !!nextRunnersAfter.second,
      third: !!nextRunnersAfter.third,
    };

    expect(bases.first).toBe(false);
    expect(bases.second).toBe(false);  // Runner removed from 2B
    expect(bases.third).toBe(false);
  });

  it('should treat inning-end runner removal as neither an out nor an occupied base', () => {
    const runnerId = 'runner-1';
    const runnerName = 'Test Runner';
    const pitcherId = 'pitcher-1';

    const nextOutcome = {
      toBase: 'end' as const,
      runnerId,
      runnerName,
      isOutAdvancing: false,
      isTootblan: false,
    };

    expect(runnerOutcomeCountsAsOut(nextOutcome)).toBe(false);
    expect(runnerOutcomeCountsAsRun(nextOutcome)).toBe(false);

    const nextRunnersAfter = {
      first: null as null | { runnerId: string; runnerName: string; responsiblePitcherId: string },
      second: null as null | { runnerId: string; runnerName: string; responsiblePitcherId: string },
      third: null as null | { runnerId: string; runnerName: string; responsiblePitcherId: string },
    };

    if (['first', 'second', 'third'].includes(nextOutcome.toBase)) {
      const destinationKey = nextOutcome.toBase as 'first' | 'second' | 'third';
      nextRunnersAfter[destinationKey] = {
        runnerId,
        runnerName,
        responsiblePitcherId: pitcherId,
      };
    }

    expect(nextRunnersAfter).toEqual({
      first: null,
      second: null,
      third: null,
    });
  });
});
