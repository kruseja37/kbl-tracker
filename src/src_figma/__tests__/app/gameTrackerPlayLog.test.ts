import { describe, expect, test } from 'vitest';

import {
  mapAtBatEventToPlayLogEntry,
} from '../../app/utils/gameTrackerPlayLog';
import type { AtBatEvent } from '../../../utils/eventLog';

function createBaseEvent(overrides: Partial<AtBatEvent>): AtBatEvent {
  return {
    eventId: 'event-1',
    gameId: 'game-1',
    eventIndex: 1,
    timestamp: 1,
    batterId: 'batter-1',
    batterName: 'Batter One',
    batterTeamId: 'away-team',
    pitcherId: 'pitcher-1',
    pitcherName: 'Pitcher One',
    pitcherTeamId: 'home-team',
    result: 'FO',
    rbiCount: 0,
    runsScored: 0,
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: {
      first: null,
      second: null,
      third: null,
    },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 1,
    runnersAfter: {
      first: null,
      second: null,
      third: null,
    },
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

describe('gameTrackerPlayLog runner sub-entries', () => {
  test('keeps held runners visible on fly outs so tag-up corrections remain possible', () => {
    const entry = mapAtBatEventToPlayLogEntry(
      createBaseEvent({
        result: 'FO',
        runners: {
          first: {
            runnerId: 'runner-1',
            runnerName: 'Runner One',
            responsiblePitcherId: 'pitcher-1',
          },
          second: {
            runnerId: 'runner-2',
            runnerName: 'Runner Two',
            responsiblePitcherId: 'pitcher-1',
          },
          third: null,
        },
        runnersAfter: {
          first: {
            runnerId: 'runner-1',
            runnerName: 'Runner One',
            responsiblePitcherId: 'pitcher-1',
          },
          second: {
            runnerId: 'runner-2',
            runnerName: 'Runner Two',
            responsiblePitcherId: 'pitcher-1',
          },
          third: null,
        },
      }),
    );

    expect(entry.runnerSubEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runnerId: 'runner-1',
          runnerName: 'Runner One',
          fromBase: 'first',
          toBase: 'first',
          transitionLabel: '1B→1B',
        }),
        expect.objectContaining({
          runnerId: 'runner-2',
          runnerName: 'Runner Two',
          fromBase: 'second',
          toBase: 'second',
          transitionLabel: '2B→2B',
        }),
      ]),
    );
  });

  test('adds held runner rows on sac flies when only the runner from third scores', () => {
    const entry = mapAtBatEventToPlayLogEntry(
      createBaseEvent({
        result: 'SF',
        rbiCount: 1,
        runsScored: 1,
        runners: {
          first: {
            runnerId: 'runner-1',
            runnerName: 'Runner One',
            responsiblePitcherId: 'pitcher-1',
          },
          second: {
            runnerId: 'runner-2',
            runnerName: 'Runner Two',
            responsiblePitcherId: 'pitcher-1',
          },
          third: {
            runnerId: 'runner-3',
            runnerName: 'Runner Three',
            responsiblePitcherId: 'pitcher-1',
          },
        },
        runnersAfter: {
          first: {
            runnerId: 'runner-1',
            runnerName: 'Runner One',
            responsiblePitcherId: 'pitcher-1',
          },
          second: {
            runnerId: 'runner-2',
            runnerName: 'Runner Two',
            responsiblePitcherId: 'pitcher-1',
          },
          third: null,
        },
        runnerOutcomes: [
          {
            runnerId: 'runner-3',
            runnerName: 'Runner Three',
            fromBase: 'third',
            toBase: 'home',
          },
        ],
      }),
    );

    expect(entry.runnerSubEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runnerId: 'runner-3',
          fromBase: 'third',
          toBase: 'home',
        }),
        expect.objectContaining({
          runnerId: 'runner-1',
          fromBase: 'first',
          toBase: 'first',
        }),
        expect.objectContaining({
          runnerId: 'runner-2',
          fromBase: 'second',
          toBase: 'second',
        }),
      ]),
    );
  });
});
