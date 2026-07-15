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
import type { LeagueBuilderProspectPlayerDto } from '../prospectScoutingDraftEngine';

const neutralModifiers: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

function farmProspect(id: string, rating: number): LeagueBuilderProspectPlayerDto {
  return {
    id,
    firstName: id,
    lastName: 'Prospect',
    gender: 'M',
    jerseyNumber: 1,
    age: 20,
    bats: 'R',
    throws: 'R',
    armSlot: null,
    primaryPosition: 'CF',
    secondaryPosition: 'LF',
    power: rating,
    contact: rating,
    speed: rating,
    fielding: rating,
    arm: rating,
    velocity: 20,
    junk: 20,
    accuracy: 20,
    arsenal: ['4F'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Spirited',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 0,
    contractYears: 1,
    leagueAssignments: [],
    ratingRevealState: 'hidden',
    isCustom: false,
    sourceDatabase: 'league-builder-startup-prospect-draft',
    hometown: { city: 'Test', state: 'CO' },
    prospectProfile: {
      scoutId: 'scout',
      scoutName: 'Scout',
      scoutedGrade: 'B',
      trueGrade: 'B',
      potentialGrade: 'B',
      scoutAccuracy: 70,
      scoutConfidence: 'medium',
      reportText: 'test',
    },
    hiddenPersonalityModifiers: neutralModifiers,
  };
}

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

    expect(inputs.map((input) => [input.playerId, input.slotClassOverride, input.payClassOverride])).toEqual([
      ['rank-4', 'early', 'within'],
      ['rank-2', 'middle', 'within'],
      ['rank-3', 'middle', 'within'],
      ['rank-1', 'late', 'within'],
      ['rank-5', 'middle', 'within'],
      ['rank-6', 'middle', 'within'],
    ]);
    expect(inputs.map((input) => input.settledSalary)).toEqual([300, 500, 400, 600, 200, 100]);
    const freeze = computeDraftFreeze(inputs);
    expect(freeze.players.find((player) => player.playerId === 'rank-4')?.morale).toMatchObject({ slotBase: 15, payBase: 0 });
    expect(freeze.players.find((player) => player.playerId === 'rank-1')?.morale).toMatchObject({ slotBase: -15, payBase: 0 });
  });

  test('S7 farm snake adapter uses absolute slot salary and slot-vs-talent rank without mutable ownership', () => {
    const pickOrder = Array.from({ length: 6 }, (_, index) => ({
      round: index + 1,
      pick: index + 1,
      teamId: index % 2 === 0 ? 'team-a' : 'team-b',
    }));
    const farmSnakeSession = {
      id: 'snake-threshold::startup-mlb-draft::2',
      leagueId: 'snake-threshold',
      seasonNumber: 2,
      seed: 'snake-threshold:farm',
      workflowVersion: 'snake-v1-farm',
      engineMethodVersion: 'snake-s6',
      tier: 'standard' as const,
      balanceMode: 'taxed' as const,
      rounds: 6,
      draftPhase: 'FARM' as const,
      farmSlotSalaries: [600, 500, 400, 300, 200, 100],
      farmProspectSnapshot: [
        farmProspect('undrafted-1', 99),
        farmProspect('undrafted-2', 98),
        farmProspect('talent-1', 97),
        farmProspect('talent-2', 80),
        farmProspect('talent-3', 70),
        farmProspect('talent-4', 60),
        farmProspect('talent-5', 50),
        farmProspect('talent-6', 40),
      ],
      pickOrder,
      completedPicks: [
        { ...pickOrder[3], playerId: 'talent-1' },
        { ...pickOrder[0], playerId: 'talent-4' },
        { ...pickOrder[1], playerId: 'talent-2' },
        { ...pickOrder[2], playerId: 'talent-3' },
        { ...pickOrder[4], playerId: 'talent-5' },
        { ...pickOrder[5], playerId: 'talent-6' },
      ],
      currentPickIndex: pickOrder.length,
      createdDate: '2026-01-01',
      lastModified: '2026-01-01',
    };
    const metaByPlayerId = new Map(farmSnakeSession.completedPicks.map(({ playerId }) => [playerId, {
      personality: 'Competitive',
      modifiers: neutralModifiers,
    }]));

    const inputs = buildDraftFreezeInputs({
      mlbSession: null,
      farmSession: null,
      farmSnakeSession,
      metaByPlayerId,
    });

    expect(inputs.map((input) => [input.playerId, input.teamId, input.settledSalary])).toEqual([
      ['talent-1', 'team-b', 300],
      ['talent-4', 'team-a', 600],
      ['talent-2', 'team-b', 500],
      ['talent-3', 'team-a', 400],
      ['talent-5', 'team-a', 200],
      ['talent-6', 'team-b', 100],
    ]);
    expect(inputs.map((input) => [input.slotClassOverride, input.payClassOverride])).toEqual([
      ['middle', 'within'],
      ['early', 'within'],
      ['middle', 'within'],
      ['middle', 'within'],
      ['middle', 'within'],
      ['middle', 'within'],
    ]);
    expect(inputs.every((input) => input.tier === 'FARM')).toBe(true);
  });
});
