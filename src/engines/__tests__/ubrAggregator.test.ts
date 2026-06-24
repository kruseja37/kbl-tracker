import { describe, expect, test } from 'vitest';

import {
  UBR_ON_PLAY_BY_RESULT,
  aggregateUbrFromEvents,
} from '../ubrAggregator';
import type { AtBatEvent, RunnerState } from '../../utils/eventLog';
import type { AtBatResult } from '../../types/game';

type RunnerOutcome = NonNullable<AtBatEvent['runnerOutcomes']>[number];

const noRunners: RunnerState = { first: null, second: null, third: null };

let eventIndex = 0;

function atBat(
  result: AtBatResult,
  runnerOutcomes: RunnerOutcome[] = [],
  overrides: Partial<AtBatEvent> = {},
): AtBatEvent {
  eventIndex += 1;

  return {
    eventId: `ab-${eventIndex}`,
    gameId: 'game-1',
    eventIndex,
    timestamp: eventIndex,
    batterId: 'batter-1',
    batterName: 'Batter 1',
    batterTeamId: 'away',
    pitcherId: 'pitcher-1',
    pitcherName: 'Pitcher 1',
    pitcherTeamId: 'home',
    result,
    rbiCount: 0,
    runsScored: [],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: noRunners,
    awayScore: 0,
    homeScore: 0,
    outsAfter: 0,
    runnersAfter: noRunners,
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
    runnerOutcomes,
    ...overrides,
  };
}

function ro(
  runnerId: string,
  fromBase: RunnerOutcome['fromBase'],
  toBase: RunnerOutcome['toBase'],
  overrides: Partial<RunnerOutcome> = {},
): RunnerOutcome {
  return {
    runnerId,
    runnerName: runnerId.toUpperCase(),
    fromBase,
    toBase,
    ...overrides,
  };
}

function expectOrphanGuardFields(stats: {
  firstToThird?: number;
  secondToHomeOnSingle?: number;
  advancementOpportunities?: number;
}): void {
  expect(typeof stats.firstToThird).toBe('number');
  expect(typeof stats.secondToHomeOnSingle).toBe('number');
  expect(typeof stats.advancementOpportunities).toBe('number');
}

describe('aggregateUbrFromEvents A1.5c-2', () => {
  test('empty input returns an empty aggregate map', () => {
    expect(aggregateUbrFromEvents([])).toEqual({});
  });

  test('maps parent AtBatEvent.result to the UBR onPlay decision table', () => {
    expect(UBR_ON_PLAY_BY_RESULT['1B']).toBe('single');
    expect(UBR_ON_PLAY_BY_RESULT['2B']).toBe('double');
    expect(UBR_ON_PLAY_BY_RESULT.GRD).toBe('double');
    expect(UBR_ON_PLAY_BY_RESULT.FO).toBe('flyOut');
    expect(UBR_ON_PLAY_BY_RESULT.LO).toBe('flyOut');
    expect(UBR_ON_PLAY_BY_RESULT.SF).toBe('sacFly');
    expect(UBR_ON_PLAY_BY_RESULT.HR).toBeNull();
    expect(UBR_ON_PLAY_BY_RESULT.BB).toBeNull();
  });

  test('single with a runner first to third increments firstToThird and UBR is positive', () => {
    const result = aggregateUbrFromEvents([
      atBat('1B', [ro('r1', 'first', 'third')]),
    ]);

    expect(result.r1.advancementStats).toMatchObject({
      firstToThird: 1,
      advancementOpportunities: 1,
    });
    expect(Number.isFinite(result.r1.ubr)).toBe(true);
    expect(result.r1.ubr).toBeGreaterThan(0);
  });

  test('single with a runner second to home increments secondToHomeOnSingle', () => {
    const result = aggregateUbrFromEvents([
      atBat('1B', [ro('r2', 'second', 'home')]),
    ]);

    expect(result.r2.advancementStats).toMatchObject({
      secondToHomeOnSingle: 1,
      advancementOpportunities: 1,
    });
  });

  test('double with a runner first to home increments firstToHomeOnDouble', () => {
    const result = aggregateUbrFromEvents([
      atBat('2B', [ro('r1', 'first', 'home')]),
    ]);

    expect(result.r1.advancementStats).toMatchObject({
      firstToHomeOnDouble: 1,
      advancementOpportunities: 1,
    });
  });

  test('out advancing increments thrownOutAdvancing without extra-base credit', () => {
    const result = aggregateUbrFromEvents([
      atBat('1B', [ro('r1', 'first', 'out', { isOutAdvancing: true })]),
    ]);

    expect(result.r1.advancementStats).toMatchObject({
      thrownOutAdvancing: 1,
      firstToThird: 0,
      firstToHomeOnDouble: 0,
      secondToHomeOnSingle: 0,
      advancementOpportunities: 0,
    });
  });

  test('heldByOf increments held opportunities and advancement opportunities only', () => {
    const result = aggregateUbrFromEvents([
      atBat('1B', [ro('r1', 'first', 'second', { heldByOf: true })]),
    ]);

    expect(result.r1.advancementStats).toMatchObject({
      heldOpportunities: 1,
      advancementOpportunities: 1,
      firstToThird: 0,
    });
  });

  test('forced and dead-ball advances do not earn extra-base UBR credit', () => {
    const walkResult = aggregateUbrFromEvents([
      atBat('BB', [ro('r1', 'first', 'second')]),
    ]);

    expect(walkResult.r1.advancementStats).toMatchObject({
      firstToThird: 0,
      firstToHomeOnDouble: 0,
      secondToHomeOnSingle: 0,
      advancementOpportunities: 0,
      heldOpportunities: 0,
      thrownOutAdvancing: 0,
    });

    const homerResult = aggregateUbrFromEvents([
      atBat('HR', [
        ro('r1', 'first', 'home'),
        ro('r2', 'second', 'home'),
        ro('r3', 'third', 'home'),
        ro('batter-1', 'batter', 'home'),
      ]),
    ]);

    expect(homerResult).toEqual({});
  });

  test('orphan-guard fields are defined numbers for tracked runners', () => {
    const result = aggregateUbrFromEvents([
      atBat('1B', [
        ro('r1', 'first', 'third'),
        ro('r2', 'first', 'second'),
      ]),
    ]);

    expectOrphanGuardFields(result.r1.advancementStats);
    expectOrphanGuardFields(result.r2.advancementStats);
  });

  test('multiple runners in one at-bat remain keyed under their own runnerIds', () => {
    const result = aggregateUbrFromEvents([
      atBat('1B', [
        ro('r1', 'first', 'third'),
        ro('r2', 'second', 'home'),
      ]),
    ]);

    expect(Object.keys(result).sort()).toEqual(['r1', 'r2']);
    expect(result.r1.advancementStats.firstToThird).toBe(1);
    expect(result.r1.advancementStats.secondToHomeOnSingle).toBe(0);
    expect(result.r2.advancementStats.firstToThird).toBe(0);
    expect(result.r2.advancementStats.secondToHomeOnSingle).toBe(1);
  });
});
