import { describe, expect, test } from 'vitest';

import {
  aggregateExtraBasesAllowed,
  outfieldArmRate,
} from '../extraBasesAllowedAggregator';
import type { AtBatEvent, RunnerState } from '../../utils/eventLog';
import type { AtBatResult } from '../../types/game';

type RunnerOutcome = NonNullable<AtBatEvent['runnerOutcomes']>[number];

const noRunners: RunnerState = { first: null, second: null, third: null };

let eventIndex = 0;

function atBat(
  runnerOutcomes: RunnerOutcome[] = [],
  overrides: Partial<AtBatEvent> = {},
): AtBatEvent {
  eventIndex += 1;
  const result = overrides.result ?? '1B';

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
    result: result as AtBatResult,
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

describe('aggregateExtraBasesAllowed A1.5c-3', () => {
  test('LF allows first to third and is charged by stamped fielderId', () => {
    const result = aggregateExtraBasesAllowed([
      atBat([
        ro('r1', 'first', 'third', {
          fielderId: 'of7',
          fielderPosition: 'LF',
          heldByOf: false,
        }),
      ]),
    ]);

    expect(result).toEqual({
      of7: { extraBasesAllowed: 1, position: 'LF' },
    });
  });

  test('second to home on a single counts under the Fork #4 >=2-base default', () => {
    const result = aggregateExtraBasesAllowed([
      atBat([
        ro('r2', 'second', 'home', {
          fielderId: 'of8',
          fielderPosition: 'CF',
          heldByOf: false,
        }),
      ]),
    ]);

    // §16 / RA-2 may later refine this over-count edge for routine 2nd->home singles.
    expect(result).toEqual({
      of8: { extraBasesAllowed: 1, position: 'CF' },
    });
  });

  test('heldByOf true is held by the OF, not extra bases allowed', () => {
    const result = aggregateExtraBasesAllowed([
      atBat([
        ro('r1', 'first', 'third', {
          fielderId: 'of7',
          fielderPosition: 'LF',
          heldByOf: true,
        }),
      ]),
    ]);

    expect(result).toEqual({});
  });

  test('runner thrown out advancing is not charged as extra bases allowed', () => {
    expect(aggregateExtraBasesAllowed([
      atBat([
        ro('r1', 'first', 'out', {
          fielderId: 'of9',
          fielderPosition: 'RF',
        }),
      ]),
    ])).toEqual({});

    expect(aggregateExtraBasesAllowed([
      atBat([
        ro('r1', 'first', 'third', {
          fielderId: 'of9',
          fielderPosition: 'RF',
          isOutAdvancing: true,
        }),
      ]),
    ])).toEqual({});
  });

  test('routine one-base advance does not count', () => {
    const result = aggregateExtraBasesAllowed([
      atBat([
        ro('r1', 'first', 'second', {
          fielderId: 'of7',
          fielderPosition: 'LF',
          heldByOf: false,
        }),
      ]),
    ]);

    expect(result).toEqual({});
  });

  test('infield-fielded and missing-fielder plays have no OF attribution', () => {
    const infieldPosition = 'SS' as unknown as RunnerOutcome['fielderPosition'];

    const result = aggregateExtraBasesAllowed([
      atBat([
        ro('r1', 'first', 'third', {
          fielderId: 'ss6',
          fielderPosition: infieldPosition,
        }),
        ro('r2', 'second', 'home', {
          fielderPosition: 'CF',
        }),
        ro('r3', 'first', 'third', {
          fielderId: 'of8',
        }),
      ]),
    ]);

    expect(result).toEqual({});
  });

  test('batter stretching their own hit is excluded by the baserunner-only default', () => {
    const result = aggregateExtraBasesAllowed([
      atBat([
        ro('batter-1', 'batter', 'third', {
          fielderId: 'of7',
          fielderPosition: 'LF',
        }),
      ], { result: '3B' }),
    ]);

    expect(result).toEqual({});
  });

  test('multiple OFs across at-bats stay keyed by their own fielderIds and empty input is empty', () => {
    expect(aggregateExtraBasesAllowed([])).toEqual({});

    const result = aggregateExtraBasesAllowed([
      atBat([
        ro('r1', 'first', 'third', {
          fielderId: 'of7',
          fielderPosition: 'LF',
        }),
      ]),
      atBat([
        ro('r2', 'second', 'home', {
          fielderId: 'of8',
          fielderPosition: 'CF',
        }),
      ]),
      atBat([
        ro('r3', 'first', 'home', {
          fielderId: 'of7',
          fielderPosition: 'RF',
        }),
      ]),
    ]);

    expect(result).toEqual({
      of7: { extraBasesAllowed: 2, position: 'RF' },
      of8: { extraBasesAllowed: 1, position: 'CF' },
    });
  });

  test('outfieldArmRate computes the decoupled §9 rate and returns null for zero denominator', () => {
    expect(outfieldArmRate({
      outfieldAssists: 2,
      baserunnersHeld: 1,
      extraBasesAllowed: 1,
    })).toBe(0.75);

    expect(outfieldArmRate({
      outfieldAssists: 0,
      baserunnersHeld: 0,
      extraBasesAllowed: 0,
    })).toBeNull();
  });
});
