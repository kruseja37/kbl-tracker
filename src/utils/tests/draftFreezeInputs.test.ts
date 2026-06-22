import { describe, expect, test } from 'vitest';

import { perceivedValueRange } from '../../engines/scoutValueRange';
import type {
  AuctionPlayer,
  AuctionResult,
  AuctionSession,
} from '../../engines/auctionStateMachine';
import {
  DEFAULT_FREEZE_SCOUT_ACCURACY,
  buildDraftFreezeInputs,
} from '../draftFreezeInputs';
import type { HiddenModifiers } from '../../types/game';

const neutralModifiers: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

function sold(
  playerId: string,
  winnerTeamId: string | null,
  salary: number | null,
): AuctionResult {
  return {
    playerId,
    disposition: 'SOLD',
    nominatorTeamId: 'nominator',
    winnerTeamId,
    salary,
  };
}

function result(
  playerId: string,
  disposition: AuctionResult['disposition'],
): AuctionResult {
  return {
    playerId,
    disposition,
    nominatorTeamId: 'nominator',
    winnerTeamId: null,
    salary: null,
  };
}

function auctionPlayer(playerId: string, iv: number): AuctionPlayer {
  return {
    playerId,
    iv,
    ivPercentile: 0.5,
  };
}

function session(args: {
  players: Record<string, AuctionPlayer>;
  results: AuctionResult[];
}): AuctionSession {
  return {
    state: 'AUCTION_COMPLETE',
    config: {} as AuctionSession['config'],
    teams: [],
    nominationOrder: [],
    nominationIndex: 0,
    nominationRound: 0,
    players: args.players,
    playerOrder: Object.keys(args.players),
    availablePlayerIds: [],
    currentLot: null,
    pendingClaim: null,
    results: args.results,
    saleCount: args.results.filter((row) => row.disposition === 'SOLD').length,
  };
}

describe('buildDraftFreezeInputs RB-7b adapter', () => {
  test('filters to priced SOLD results and preserves won order with MLB before farm', () => {
    const modifiers: HiddenModifiers = {
      loyalty: 80,
      ambition: 40,
      resilience: 60,
      charisma: 70,
    };
    const mlbSession = session({
      players: {
        'mlb-a': auctionPlayer('mlb-a', 100),
        'mlb-b': auctionPlayer('mlb-b', 120),
        'missing-meta': auctionPlayer('missing-meta', 90),
        'zero-iv': auctionPlayer('zero-iv', 0),
      },
      results: [
        sold('mlb-a', 'team-a', 75),
        result('passed', 'PASSED'),
        sold('missing-iv', 'team-skip', 88),
        sold('zero-iv', 'team-skip', 99),
        sold('null-winner', null, 100),
        sold('null-salary', 'team-a', null),
        result('set-aside', 'SET_ASIDE'),
        sold('mlb-b', 'team-b', 130),
        sold('missing-meta', 'team-c', 95),
      ],
    });
    const farmSession = session({
      players: {
        'farm-a': auctionPlayer('farm-a', 80),
      },
      results: [
        sold('farm-a', 'team-a', 35),
      ],
    });

    const inputs = buildDraftFreezeInputs({
      mlbSession,
      farmSession,
      metaByPlayerId: new Map([
        ['mlb-a', { personality: 'Competitive', modifiers }],
        ['mlb-b', { personality: undefined, modifiers }],
        ['farm-a', { personality: 'Relaxed', modifiers }],
      ]),
    });

    expect(inputs.map((input) => input.playerId)).toEqual([
      'mlb-a',
      'mlb-b',
      'missing-meta',
      'farm-a',
    ]);
    expect(inputs.map((input) => input.tier)).toEqual(['MLB', 'MLB', 'MLB', 'FARM']);
    expect(inputs[0]).toMatchObject({
      playerId: 'mlb-a',
      teamId: 'team-a',
      settledSalary: 75,
      personality: 'Competitive',
      modifiers,
    });
    expect(inputs[1]).toMatchObject({
      playerId: 'mlb-b',
      teamId: 'team-b',
      settledSalary: 130,
      personality: undefined,
      modifiers,
    });
    expect(inputs[2]).toMatchObject({
      playerId: 'missing-meta',
      teamId: 'team-c',
      settledSalary: 95,
      personality: undefined,
      modifiers: neutralModifiers,
    });
    expect(inputs[3]).toMatchObject({
      playerId: 'farm-a',
      teamId: 'team-a',
      settledSalary: 35,
      personality: 'Relaxed',
      modifiers,
    });
  });

  test('reconstructs deterministic IV-centered scout ranges with the freeze default accuracy', () => {
    const mlbSession = session({
      players: {
        'range-check': auctionPlayer('range-check', 100_000),
      },
      results: [
        sold('range-check', 'team-a', 110_000),
      ],
    });

    const [input] = buildDraftFreezeInputs({
      mlbSession,
      farmSession: null,
      metaByPlayerId: new Map(),
    });
    const expected = perceivedValueRange(
      100_000,
      DEFAULT_FREEZE_SCOUT_ACCURACY,
      'freeze:range-check',
    );

    expect(input.scoutRange.low).toBeCloseTo(expected.low, 10);
    expect(input.scoutRange.high).toBeCloseTo(expected.high, 10);
  });

  test('allows a caller-supplied scout accuracy without touching displayed estimate randomness', () => {
    const mlbSession = session({
      players: {
        custom: auctionPlayer('custom', 200_000),
      },
      results: [
        sold('custom', 'team-a', 205_000),
      ],
    });

    const [input] = buildDraftFreezeInputs({
      mlbSession,
      farmSession: null,
      metaByPlayerId: new Map(),
      defaultScoutAccuracy: 90,
    });
    const expected = perceivedValueRange(200_000, 90, 'freeze:custom');

    expect(input.scoutRange).toEqual({
      low: expected.low,
      high: expected.high,
    });
  });

  test('returns an empty input list when no auction sessions are supplied', () => {
    expect(buildDraftFreezeInputs({
      mlbSession: null,
      farmSession: null,
      metaByPlayerId: new Map(),
    })).toEqual([]);
  });
});
