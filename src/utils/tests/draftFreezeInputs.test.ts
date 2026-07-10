import { describe, expect, test } from 'vitest';

import { perceivedValueRange } from '../../engines/scoutValueRange';
import type {
  AuctionPlayer,
  AuctionResult,
  AuctionSession,
} from '../../engines/auctionStateMachine';
import {
  computeDraftFreeze,
} from '../../engines/draftFreeze';
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
      iv: 100,
      settledSalary: 75,
      personality: 'Competitive',
      modifiers,
    });
    expect(inputs[1]).toMatchObject({
      playerId: 'mlb-b',
      teamId: 'team-b',
      iv: 120,
      settledSalary: 130,
      personality: undefined,
      modifiers,
    });
    expect(inputs[2]).toMatchObject({
      playerId: 'missing-meta',
      teamId: 'team-c',
      iv: 90,
      settledSalary: 95,
      personality: undefined,
      position: null,
      modifiers: neutralModifiers,
    });
    expect(inputs[3]).toMatchObject({
      playerId: 'farm-a',
      teamId: 'team-a',
      iv: 80,
      settledSalary: 35,
      personality: 'Relaxed',
      modifiers,
    });
    expect(inputs.every((input) => !Object.prototype.hasOwnProperty.call(input, 'payClassOverride'))).toBe(true);
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

  test('excludes caller-specified shill winners while preserving default freeze inputs', () => {
    const mlbSession = session({
      players: {
        'shill-win': auctionPlayer('shill-win', 90_000),
        'real-win': auctionPlayer('real-win', 95_000),
      },
      results: [
        sold('shill-win', 'shill-team', 91_000),
        sold('real-win', 'real-team', 96_000),
      ],
    });

    const defaultInputs = buildDraftFreezeInputs({
      mlbSession,
      farmSession: null,
      metaByPlayerId: new Map(),
    });
    const filteredInputs = buildDraftFreezeInputs({
      mlbSession,
      farmSession: null,
      metaByPlayerId: new Map(),
      mlbExcludedTeamIds: new Set(['shill-team']),
    });

    expect(defaultInputs.map((input) => [input.playerId, input.teamId])).toEqual([
      ['shill-win', 'shill-team'],
      ['real-win', 'real-team'],
    ]);
    expect(filteredInputs.map((input) => [input.playerId, input.teamId])).toEqual([
      ['real-win', 'real-team'],
    ]);
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

  test('D1 snake adapter maps IV-rank threshold boundaries without setting auction exclusions', () => {
    const rankedIds = ['rank-1', 'rank-2', 'rank-3', 'rank-4', 'rank-5', 'rank-6'];
    const pickIds = ['rank-4', 'rank-2', 'rank-3', 'rank-1', 'rank-5', 'rank-6'];
    const pickOrder = pickIds.map((_, index) => ({
      round: index + 1,
      pick: index + 1,
      teamId: index % 2 === 0 ? 'team-a' : 'team-b',
    }));
    const snakeSession = {
      id: 'snake-threshold::startup-mlb-draft::1',
      leagueId: 'snake-threshold',
      seasonNumber: 1,
      seed: 'snake-threshold',
      workflowVersion: 'startup-mlb-draft-v1',
      engineMethodVersion: 'leagueConstruction.t8d-1',
      tier: 'standard' as const,
      balanceMode: 'taxed' as const,
      rounds: 6,
      pickOrder,
      completedPicks: pickOrder.map((pick, index) => ({ ...pick, playerId: pickIds[index] })),
      currentPickIndex: pickOrder.length,
      createdDate: '2026-01-01',
      lastModified: '2026-01-01',
    };
    const pool = {
      leagueId: 'snake-threshold',
      tier: 'standard' as const,
      balanceMode: 'taxed' as const,
      players: rankedIds.map((id, index) => ({ id, iv: 600 - (index * 100), salary: 1 })),
      tierCap: 10_000,
      luxuryCaps: [],
      pickValueChart: [],
      totalSlots: 6,
      poolSurplusWarning: false,
    };

    const inputs = buildDraftFreezeInputs({
      mlbSession: null,
      mlbSnakeSession: snakeSession,
      mlbRegisteredPool: pool,
      farmSession: null,
      metaByPlayerId: new Map(),
      mlbExcludedTeamIds: new Set(['team-a', 'team-b']),
    });

    expect(inputs.map((input) => [input.playerId, input.payClassOverride])).toEqual([
      ['rank-4', 'above'],
      ['rank-2', 'within'],
      ['rank-3', 'within'],
      ['rank-1', 'below'],
      ['rank-5', 'within'],
      ['rank-6', 'within'],
    ]);
    expect(inputs.map((input) => input.settledSalary)).toEqual([300, 500, 400, 600, 200, 100]);
    const freeze = computeDraftFreeze(inputs);
    expect(freeze.players.find((player) => player.playerId === 'rank-4')?.morale.payBase).toBe(10);
    expect(freeze.players.find((player) => player.playerId === 'rank-1')?.morale.payBase).toBe(-10);
  });
});
