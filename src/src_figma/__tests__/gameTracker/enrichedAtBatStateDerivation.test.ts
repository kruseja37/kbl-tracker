import { describe, expect, test } from 'vitest';

import type { AtBatEvent } from '../../../utils/eventLog';
import {
  deriveEnrichedAtBatState,
  type PersistedRunnerOutcome,
} from '../../app/utils/enrichedAtBatStateDerivation';

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
    result: 'GO',
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
  overrides: Partial<PersistedRunnerOutcome> & Pick<PersistedRunnerOutcome, 'runnerId' | 'runnerName' | 'fromBase' | 'toBase'>,
): PersistedRunnerOutcome {
  return overrides;
}

describe('deriveEnrichedAtBatState', () => {
  test('derives bases-loaded home-to-first DP from complete runner outcomes', () => {
    const existingAtBat = createAtBatEvent({
      result: 'DP',
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

    expect(derived.outsRecorded).toBe(2);
    expect(derived.outsAfter).toBe(2);
    expect(derived.runnersAfter).toEqual({
      first: null,
      second: runner('r1', 'Runner First'),
      third: runner('r2', 'Runner Second'),
    });
    expect(derived.runsScored).toEqual([]);
    expect(derived.diagnostics).toEqual([]);
  });

  test('keeps unchanged safe runners during sequential DP correction final state', () => {
    const existingAtBat = createAtBatEvent({
      result: 'DP',
      runners: {
        first: runner('r1', 'Runner First'),
        second: runner('r2', 'Runner Second'),
        third: runner('r3', 'Runner Third'),
      },
      runnersAfter: { first: null, second: null, third: null },
      outsRecorded: 3,
      outsAfter: 3,
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

    expect(derived.outsAfter).toBe(2);
    expect(derived.runnersAfter.second?.runnerId).toBe('r1');
    expect(derived.runnersAfter.third?.runnerId).toBe('r2');
  });

  test('allows FC with no outs when everyone is safe', () => {
    const existingAtBat = createAtBatEvent({
      result: 'FC',
      runners: {
        first: null,
        second: null,
        third: runner('r3', 'Runner Third'),
      },
    });

    const derived = deriveEnrichedAtBatState({
      existingAtBat,
      runnerOutcomes: [
        outcome({ runnerId: 'r3', runnerName: 'Runner Third', fromBase: 'third', toBase: 'home' }),
        outcome({ runnerId: 'batter-1', runnerName: 'Batter One', fromBase: 'batter', toBase: 'first' }),
      ],
    });

    expect(derived.result).toBe('FC');
    expect(derived.outsRecorded).toBe(0);
    expect(derived.outsAfter).toBe(0);
    expect(derived.runnersAfter).toEqual({
      first: runner('batter-1', 'Batter One'),
      second: null,
      third: null,
    });
    expect(derived.runsScored).toEqual(['r3']);
    expect(derived.awayScoreAfter).toBe(1);
    expect(derived.rbiCount).toBe(1);
  });

  test('derives FC runner out at home with batter safe at first', () => {
    const existingAtBat = createAtBatEvent({
      result: 'FC',
      runners: {
        first: runner('r1', 'Runner First'),
        second: null,
        third: runner('r3', 'Runner Third'),
      },
    });

    const derived = deriveEnrichedAtBatState({
      existingAtBat,
      runnerOutcomes: [
        outcome({ runnerId: 'r3', runnerName: 'Runner Third', fromBase: 'third', toBase: 'out' }),
        outcome({ runnerId: 'r1', runnerName: 'Runner First', fromBase: 'first', toBase: 'second' }),
        outcome({ runnerId: 'batter-1', runnerName: 'Batter One', fromBase: 'batter', toBase: 'first' }),
      ],
    });

    expect(derived.outsRecorded).toBe(1);
    expect(derived.outsAfter).toBe(1);
    expect(derived.runnersAfter).toEqual({
      first: runner('batter-1', 'Batter One'),
      second: runner('r1', 'Runner First'),
      third: null,
    });
    expect(derived.runsScored).toEqual([]);
  });

  test('counts GO with a runner out advancing as two outs', () => {
    const existingAtBat = createAtBatEvent({
      result: 'GO',
      runners: {
        first: null,
        second: runner('r2', 'Runner Second'),
        third: null,
      },
    });

    const derived = deriveEnrichedAtBatState({
      existingAtBat,
      runnerOutcomes: [
        outcome({ runnerId: 'batter-1', runnerName: 'Batter One', fromBase: 'batter', toBase: 'out' }),
        outcome({
          runnerId: 'r2',
          runnerName: 'Runner Second',
          fromBase: 'second',
          toBase: 'home',
          isOutAdvancing: true,
        }),
      ],
    });

    expect(derived.outsRecorded).toBe(2);
    expect(derived.outsAfter).toBe(2);
    expect(derived.runnersAfter).toEqual({ first: null, second: null, third: null });
    expect(derived.runsScored).toEqual([]);
  });

  test('derives error metadata while preserving safe runner advancement', () => {
    const existingAtBat = createAtBatEvent({
      result: 'GO',
      runners: {
        first: runner('r1', 'Runner First'),
        second: null,
        third: null,
      },
    });

    const derived = deriveEnrichedAtBatState({
      existingAtBat,
      runnerOutcomes: [
        outcome({
          runnerId: 'batter-1',
          runnerName: 'Batter One',
          fromBase: 'batter',
          toBase: 'first',
          errorType: 'fielding',
          errorChargedTo: 6,
        }),
        outcome({ runnerId: 'r1', runnerName: 'Runner First', fromBase: 'first', toBase: 'third' }),
      ],
    });

    expect(derived.result).toBe('E');
    expect(derived.batterReachedOnError).toBe(true);
    expect(derived.batterErrorType).toBe('fielding');
    expect(derived.batterErrorChargedToPosition).toBe(6);
    expect(derived.batterCorrectionOriginalResult).toBe('GO');
    expect(derived.outsRecorded).toBe(0);
    expect(derived.runnersAfter).toEqual({
      first: runner('batter-1', 'Batter One'),
      second: null,
      third: runner('r1', 'Runner First'),
    });
    expect(derived.rbiCount).toBe(0);
  });

  test('clears bases only when the complete final outcome set records the third out', () => {
    const existingAtBat = createAtBatEvent({
      result: 'DP',
      outs: 1,
      outsAfter: 1,
      runners: {
        first: runner('r1', 'Runner First'),
        second: null,
        third: null,
      },
    });

    const derived = deriveEnrichedAtBatState({
      existingAtBat,
      runnerOutcomes: [
        outcome({ runnerId: 'batter-1', runnerName: 'Batter One', fromBase: 'batter', toBase: 'out' }),
        outcome({ runnerId: 'r1', runnerName: 'Runner First', fromBase: 'first', toBase: 'out' }),
      ],
    });

    expect(derived.outsRecorded).toBe(2);
    expect(derived.outsAfter).toBe(3);
    expect(derived.runnersAfter).toEqual({ first: null, second: null, third: null });
  });

  test('reports destination conflicts without overwriting the first deterministic occupant', () => {
    const existingAtBat = createAtBatEvent({
      result: '1B',
      runners: {
        first: runner('r1', 'Runner First'),
        second: runner('r2', 'Runner Second'),
        third: null,
      },
    });

    const derived = deriveEnrichedAtBatState({
      existingAtBat,
      runnerOutcomes: [
        outcome({ runnerId: 'r1', runnerName: 'Runner First', fromBase: 'first', toBase: 'second' }),
        outcome({ runnerId: 'r2', runnerName: 'Runner Second', fromBase: 'second', toBase: 'second' }),
      ],
    });

    expect(derived.runnersAfter.second?.runnerId).toBe('r1');
    expect(derived.diagnostics).toEqual([
      'Destination conflict at second: kept Runner First, ignored Runner Second',
    ]);
  });
});
