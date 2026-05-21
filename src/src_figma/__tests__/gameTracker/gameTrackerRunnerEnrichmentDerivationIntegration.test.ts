import { describe, expect, test } from 'vitest';

import type { AtBatEvent } from '../../../utils/eventLog';
import { createRunnerTrackingState } from '../../app/engines/inheritedRunnerTracker';
import {
  completeRunnerOutcomesForDerivation,
  deriveEnrichedAtBatState,
  type PersistedRunnerOutcome,
} from '../../app/utils/enrichedAtBatStateDerivation';
import { reconcileRunnerTrackerFromRunnersAfter } from '../../app/utils/liveBaseCorrection';

function runner(
  runnerId: string,
  runnerName: string,
  responsiblePitcherId = 'pitcher-1',
): NonNullable<AtBatEvent['runnersAfter']['first']> {
  return {
    runnerId,
    runnerName,
    responsiblePitcherId,
  };
}

function createAtBatEvent(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: 'game-1_1',
    gameId: 'game-1',
    eventIndex: 1,
    timestamp: 100,
    batterId: 'batter-1',
    batterName: 'Batter One',
    batterTeamId: 'away',
    pitcherId: 'pitcher-1',
    pitcherName: 'Pitcher One',
    pitcherTeamId: 'home',
    result: 'DP',
    rbiCount: 0,
    runsScored: 0,
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 0,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.5,
    wpa: 0,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: false,
    isWalkOff: false,
    ...overrides,
  };
}

function outcome(
  value: Pick<PersistedRunnerOutcome, 'runnerId' | 'runnerName' | 'fromBase' | 'toBase'> &
    Partial<PersistedRunnerOutcome>,
): PersistedRunnerOutcome {
  return value;
}

function deriveBatterOutAdvancingEdit(
  existingAtBat: AtBatEvent,
  nextBatterOutAdvancing: boolean,
) {
  const runnerOutcomesForCompletion = nextBatterOutAdvancing
    ? existingAtBat.runnerOutcomes || []
    : (existingAtBat.runnerOutcomes || []).filter(
        (runnerOutcome) => runnerOutcome.fromBase !== 'batter',
      );
  const completed = completeRunnerOutcomesForDerivation(
    existingAtBat,
    runnerOutcomesForCompletion,
  );
  const nextRunnerOutcomes = [...completed.runnerOutcomes];
  const batterOutcomeIndex = nextRunnerOutcomes.findIndex(
    (runnerOutcome) => runnerOutcome.fromBase === 'batter',
  );

  expect(batterOutcomeIndex).toBeGreaterThanOrEqual(0);

  const currentBatterOutcome = nextRunnerOutcomes[batterOutcomeIndex]!;
  nextRunnerOutcomes[batterOutcomeIndex] = {
    ...currentBatterOutcome,
    runnerId: existingAtBat.batterId,
    runnerName: existingAtBat.batterName,
    fromBase: 'batter',
    toBase: nextBatterOutAdvancing ? 'out' : currentBatterOutcome.toBase,
    isOutAdvancing: nextBatterOutAdvancing ? true : undefined,
    errorType: nextBatterOutAdvancing
      ? undefined
      : currentBatterOutcome.errorType,
    errorChargedTo: nextBatterOutAdvancing
      ? undefined
      : currentBatterOutcome.errorChargedTo,
  };

  return deriveEnrichedAtBatState({
    existingAtBat,
    runnerOutcomes: nextRunnerOutcomes,
    result: existingAtBat.result,
  });
}

function deriveFieldingSequenceEdit(existingAtBat: AtBatEvent) {
  const completed = completeRunnerOutcomesForDerivation(
    existingAtBat,
    existingAtBat.runnerOutcomes || [],
  );

  return deriveEnrichedAtBatState({
    existingAtBat,
    runnerOutcomes: completed.runnerOutcomes,
    result: existingAtBat.result,
  });
}

describe('GameTracker runner enrichment derivation integration', () => {
  test('production-shape bases-loaded home-to-first DP completion adds missing batter out', () => {
    const existingAtBat = createAtBatEvent({
      runners: {
        first: runner('r1', 'Runner First'),
        second: runner('r2', 'Runner Second'),
        third: runner('r3', 'Runner Third'),
      },
    });
    const completed = completeRunnerOutcomesForDerivation(existingAtBat, [
      outcome({ runnerId: 'r3', runnerName: 'Runner Third', fromBase: 'third', toBase: 'out' }),
      outcome({ runnerId: 'r2', runnerName: 'Runner Second', fromBase: 'second', toBase: 'third' }),
      outcome({ runnerId: 'r1', runnerName: 'Runner First', fromBase: 'first', toBase: 'second' }),
    ]);

    const derived = deriveEnrichedAtBatState({
      existingAtBat,
      runnerOutcomes: completed.runnerOutcomes,
    });

    expect(completed.runnerOutcomes).toContainEqual(
      outcome({ runnerId: 'batter-1', runnerName: 'Batter One', fromBase: 'batter', toBase: 'out' }),
    );
    expect(derived.outsRecorded).toBe(2);
    expect(derived.outsAfter).toBe(2);
    expect(derived.runnersAfter).toEqual({
      first: null,
      second: runner('r1', 'Runner First'),
      third: runner('r2', 'Runner Second'),
    });
  });

  test('sequential production-shape DP correction counts inferred batter out and keeps R2 on third', () => {
    const existingAtBat = createAtBatEvent({
      runners: {
        first: runner('r1', 'Runner First'),
        second: runner('r2', 'Runner Second'),
        third: runner('r3', 'Runner Third'),
      },
      runnerOutcomes: [
        outcome({ runnerId: 'r3', runnerName: 'Runner Third', fromBase: 'third', toBase: 'home' }),
        outcome({ runnerId: 'r2', runnerName: 'Runner Second', fromBase: 'second', toBase: 'third' }),
        outcome({ runnerId: 'r1', runnerName: 'Runner First', fromBase: 'first', toBase: 'out' }),
      ],
      runnersAfter: { first: null, second: null, third: null },
      outsRecorded: 2,
      outsAfter: 2,
    });

    const firstEditOutcomes = existingAtBat.runnerOutcomes!.map((runnerOutcome) =>
      runnerOutcome.runnerId === 'r3'
        ? { ...runnerOutcome, toBase: 'out' as const }
        : runnerOutcome,
    );
    const firstCompleted = completeRunnerOutcomesForDerivation(
      existingAtBat,
      firstEditOutcomes,
    );
    const firstDerived = deriveEnrichedAtBatState({
      existingAtBat,
      runnerOutcomes: firstCompleted.runnerOutcomes,
    });
    const afterFirstEdit = {
      ...existingAtBat,
      runnerOutcomes: firstDerived.runnerOutcomes,
      runnersAfter: firstDerived.runnersAfter,
      outsRecorded: firstDerived.outsRecorded,
      outsAfter: firstDerived.outsAfter,
    };

    const finalOutcomes = afterFirstEdit.runnerOutcomes!.map((runnerOutcome) =>
      runnerOutcome.runnerId === 'r1'
        ? { ...runnerOutcome, toBase: 'second' as const }
        : runnerOutcome,
    );
    const finalCompleted = completeRunnerOutcomesForDerivation(
      afterFirstEdit,
      finalOutcomes,
    );
    const derived = deriveEnrichedAtBatState({
      existingAtBat: afterFirstEdit,
      runnerOutcomes: finalCompleted.runnerOutcomes,
    });

    expect(
      finalCompleted.runnerOutcomes.filter(
        (runnerOutcome) => runnerOutcome.fromBase === 'batter',
      ),
    ).toHaveLength(1);
    expect(derived.outsAfter).toBe(2);
    expect(derived.runnersAfter.second?.runnerId).toBe('r1');
    expect(derived.runnersAfter.third?.runnerId).toBe('r2');
  });

  test('latest-at-bat live base correction rebuilds tracker for the next batter', () => {
    const existingAtBat = createAtBatEvent({
      runners: {
        first: runner('r1', 'Runner First'),
        second: runner('r2', 'Runner Second'),
        third: runner('r3', 'Runner Third'),
      },
    });
    const derived = deriveEnrichedAtBatState({
      existingAtBat,
      runnerOutcomes: [
        outcome({ runnerId: 'r3', runnerName: 'Runner Third', fromBase: 'third', toBase: 'out' }),
        outcome({ runnerId: 'batter-1', runnerName: 'Batter One', fromBase: 'batter', toBase: 'out' }),
        outcome({ runnerId: 'r2', runnerName: 'Runner Second', fromBase: 'second', toBase: 'third' }),
        outcome({ runnerId: 'r1', runnerName: 'Runner First', fromBase: 'first', toBase: 'second' }),
      ],
    });

    const tracker = reconcileRunnerTrackerFromRunnersAfter(
      createRunnerTrackingState('pitcher-1', 'Pitcher One'),
      derived.runnersAfter,
    );

    expect(tracker.runners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ runnerId: 'r1', currentBase: '2B' }),
        expect.objectContaining({ runnerId: 'r2', currentBase: '3B' }),
      ]),
    );
    expect(tracker.runners).toHaveLength(2);
  });

  test('FC safe-at-home production-shape completion remains FC with zero outs and batter on first', () => {
    const existingAtBat = createAtBatEvent({
      result: 'FC',
      runners: {
        first: null,
        second: null,
        third: runner('r3', 'Runner Third'),
      },
      outsAfter: 1,
      runnersAfter: {
        first: null,
        second: null,
        third: null,
      },
    });
    const completed = completeRunnerOutcomesForDerivation(existingAtBat, [
      outcome({ runnerId: 'r3', runnerName: 'Runner Third', fromBase: 'third', toBase: 'home' }),
    ]);

    const derived = deriveEnrichedAtBatState({
      existingAtBat,
      runnerOutcomes: completed.runnerOutcomes,
      result: 'FC',
    });

    expect(completed.runnerOutcomes).toContainEqual(
      outcome({ runnerId: 'batter-1', runnerName: 'Batter One', fromBase: 'batter', toBase: 'first' }),
    );
    expect(derived.result).toBe('FC');
    expect(derived.outsRecorded).toBe(0);
    expect(derived.outsAfter).toBe(0);
    expect(derived.runnersAfter.first?.runnerId).toBe('batter-1');
    expect(derived.runsScored).toEqual(['r3']);
  });

  test('completion preserves an existing batter outcome without duplicating it', () => {
    const existingAtBat = createAtBatEvent({
      result: 'GO',
      runnersAfter: {
        first: runner('batter-1', 'Batter One'),
        second: null,
        third: null,
      },
    });
    const batterOutcome = outcome({
      runnerId: 'batter-1',
      runnerName: 'Batter One',
      fromBase: 'batter',
      toBase: 'first',
      errorType: 'fielding',
      errorChargedTo: 6,
    });

    const completed = completeRunnerOutcomesForDerivation(existingAtBat, [
      batterOutcome,
    ]);

    expect(completed.runnerOutcomes).toEqual([batterOutcome]);
    expect(
      completed.runnerOutcomes.filter(
        (runnerOutcome) => runnerOutcome.fromBase === 'batter',
      ),
    ).toHaveLength(1);
  });

  test('batter out advancing on GO preserves an already-safe runner and adds batter out', () => {
    const existingAtBat = createAtBatEvent({
      result: 'GO',
      runners: {
        first: null,
        second: runner('r2', 'Runner Second'),
        third: null,
      },
      runnerOutcomes: [
        outcome({ runnerId: 'r2', runnerName: 'Runner Second', fromBase: 'second', toBase: 'third' }),
      ],
      runnersAfter: {
        first: null,
        second: null,
        third: runner('r2', 'Runner Second'),
      },
    });

    const derived = deriveBatterOutAdvancingEdit(existingAtBat, true);

    expect(derived.outsRecorded).toBe(1);
    expect(derived.outsAfter).toBe(1);
    expect(derived.runnerOutcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runnerId: 'batter-1',
          runnerName: 'Batter One',
          fromBase: 'batter',
          toBase: 'out',
          isOutAdvancing: true,
        }),
      ]),
    );
    expect(derived.runnersAfter).toEqual({
      first: null,
      second: null,
      third: runner('r2', 'Runner Second'),
    });
  });

  test('batter out advancing off keeps zero-out FC safe at home unless batter is explicitly out', () => {
    const existingAtBat = createAtBatEvent({
      result: 'FC',
      runners: {
        first: null,
        second: null,
        third: runner('r3', 'Runner Third'),
      },
      runnerOutcomes: [
        outcome({ runnerId: 'r3', runnerName: 'Runner Third', fromBase: 'third', toBase: 'home' }),
      ],
      outsAfter: 1,
    });

    const batterSafe = deriveBatterOutAdvancingEdit(existingAtBat, false);
    const batterOut = deriveBatterOutAdvancingEdit(existingAtBat, true);

    expect(batterSafe.result).toBe('FC');
    expect(batterSafe.outsRecorded).toBe(0);
    expect(batterSafe.outsAfter).toBe(0);
    expect(batterSafe.runnersAfter.first?.runnerId).toBe('batter-1');
    expect(batterSafe.runsScored).toEqual(['r3']);

    expect(batterOut.result).toBe('FC');
    expect(batterOut.outsRecorded).toBe(1);
    expect(batterOut.outsAfter).toBe(1);
    expect(batterOut.runnersAfter.first).toBeNull();
  });

  test('batter out advancing clears bases only when the full outcomes create the third out', () => {
    const existingAtBat = createAtBatEvent({
      result: '2B',
      outs: 2,
      outsAfter: 2,
      runners: {
        first: null,
        second: runner('r2', 'Runner Second'),
        third: null,
      },
      runnerOutcomes: [
        outcome({ runnerId: 'r2', runnerName: 'Runner Second', fromBase: 'second', toBase: 'third' }),
      ],
      runnersAfter: {
        first: null,
        second: runner('batter-1', 'Batter One'),
        third: runner('r2', 'Runner Second'),
      },
    });

    const batterSafe = deriveBatterOutAdvancingEdit(existingAtBat, false);
    const batterOut = deriveBatterOutAdvancingEdit(existingAtBat, true);

    expect(batterSafe.outsAfter).toBe(2);
    expect(batterSafe.runnersAfter).toEqual({
      first: null,
      second: runner('batter-1', 'Batter One'),
      third: runner('r2', 'Runner Second'),
    });

    expect(batterOut.outsRecorded).toBe(1);
    expect(batterOut.outsAfter).toBe(3);
    expect(batterOut.runnersAfter).toEqual({
      first: null,
      second: null,
      third: null,
    });
  });

  test('fielding sequence correction on home-to-first DP preserves 2B/3B runner state', () => {
    const existingAtBat = createAtBatEvent({
      result: 'DP',
      runners: {
        first: runner('r1', 'Runner First'),
        second: runner('r2', 'Runner Second'),
        third: runner('r3', 'Runner Third'),
      },
      runnerOutcomes: [
        outcome({ runnerId: 'r3', runnerName: 'Runner Third', fromBase: 'third', toBase: 'out' }),
        outcome({ runnerId: 'batter-1', runnerName: 'Batter One', fromBase: 'batter', toBase: 'out' }),
        outcome({ runnerId: 'r2', runnerName: 'Runner Second', fromBase: 'second', toBase: 'third' }),
        outcome({ runnerId: 'r1', runnerName: 'Runner First', fromBase: 'first', toBase: 'second' }),
      ],
      runnersAfter: { first: null, second: null, third: null },
      outsRecorded: 3,
      outsAfter: 3,
      enrichment: {
        fieldingSequence: [6, 4, 3],
      },
    });

    const derived = deriveFieldingSequenceEdit(existingAtBat);

    expect(derived.result).toBe('DP');
    expect(derived.outsRecorded).toBe(2);
    expect(derived.outsAfter).toBe(2);
    expect(derived.runnersAfter).toEqual({
      first: null,
      second: runner('r1', 'Runner First'),
      third: runner('r2', 'Runner Second'),
    });
  });

  test('fielding sequence correction on zero-out FC keeps FC with no forced out', () => {
    const existingAtBat = createAtBatEvent({
      result: 'FC',
      runners: {
        first: null,
        second: null,
        third: runner('r3', 'Runner Third'),
      },
      runnerOutcomes: [
        outcome({ runnerId: 'r3', runnerName: 'Runner Third', fromBase: 'third', toBase: 'home' }),
      ],
      outsAfter: 1,
      enrichment: {
        fieldingSequence: [5, 2],
      },
    });

    const derived = deriveFieldingSequenceEdit(existingAtBat);

    expect(derived.result).toBe('FC');
    expect(derived.outsRecorded).toBe(0);
    expect(derived.outsAfter).toBe(0);
    expect(derived.runnersAfter.first?.runnerId).toBe('batter-1');
    expect(derived.runsScored).toEqual(['r3']);
  });
});
