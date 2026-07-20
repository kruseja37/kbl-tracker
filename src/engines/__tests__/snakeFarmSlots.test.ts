import { describe, expect, test } from 'vitest';

import {
  buildFarmSlotTable,
  createFarmSnakeSession,
  buildFarmMoneyLedger,
  farmPickSalary,
  resolveFarmArchetypeIdsForSnakeTransition,
} from '../snakeFarmSlots';
import type { LeagueBuilderMlbDraftSession } from '../../utils/leagueBuilderStorage';
import { freezeSnakeDraftSession } from '../../utils/snakeDraftManifest';

function farmSession(): LeagueBuilderMlbDraftSession {
  return {
    id: 'farm-session',
    leagueId: 'league-1',
    seasonNumber: 1,
    seed: 'farm-seed',
    workflowVersion: 'snake-v1-farm',
    engineMethodVersion: 'snake-s6',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: 2,
    draftPhase: 'FARM',
    pickOrder: [
      { round: 1, pick: 1, teamId: 'a' },
      { round: 1, pick: 2, teamId: 'b' },
      { round: 2, pick: 3, teamId: 'b' },
      { round: 2, pick: 4, teamId: 'a' },
    ],
    completedPicks: [],
    farmSlotSalaries: [30_000, 22_000, 18_000, 10_000],
    currentPickIndex: 0,
    createdDate: '2026-07-10T00:00:00.000Z',
    lastModified: '2026-07-10T00:00:00.000Z',
  };
}

describe('S6 farm slot salaries', () => {
  test('freezes the exact farm identity for every club and rejects missing or changed values', () => {
    const mlbSession = {
      ...farmSession(),
      draftPhase: 'MLB' as const,
      snakeSetup: {
        poolPlayerIds: ['mlb'],
        versionSelections: {},
        orderSeed: 'mlb-order',
        clubs: [
          { teamId: 'a', hotseat: true, farmArchetypeId: 'web-gems' },
          { teamId: 'b', hotseat: true, farmArchetypeId: 'bomba-squad' },
        ],
      },
    };
    const teams = [
      { id: 'a', name: 'A Club', farmArchetypeKey: 'web-gems' },
      { id: 'b', name: 'B Club', farmArchetypeKey: 'bomba-squad' },
    ];

    expect(resolveFarmArchetypeIdsForSnakeTransition({ mlbSession, teams })).toEqual({
      a: 'web-gems',
      b: 'bomba-squad',
    });
    expect(() => resolveFarmArchetypeIdsForSnakeTransition({
      mlbSession,
      teams: [{ ...teams[0], farmArchetypeKey: 'bomba-squad' }, teams[1]],
    })).toThrow('FARM IDENTITY CHANGED');
    expect(() => resolveFarmArchetypeIdsForSnakeTransition({
      mlbSession: {
        ...mlbSession,
        snakeSetup: {
          ...mlbSession.snakeSetup,
          clubs: mlbSession.snakeSetup.clubs.map((club) => ({ ...club, farmArchetypeId: undefined })),
        },
      },
      teams: teams.map(({ id, name }) => ({ id, name })),
    })).toThrow('FARM IDENTITY MISSING');
  });

  test('calibrates a frozen geometric table to 3x endpoints and 75% of league budgets', () => {
    const table = buildFarmSlotTable(40, [1_000_000, 900_000, 1_100_000, 1_000_000]);

    expect(table).toHaveLength(40);
    expect(table[0]).toBe(3 * table.at(-1)!);
    expect(table.reduce((sum, salary) => sum + salary, 0)).toBe(3_000_000);
    expect(table.every((salary) => salary % 1_000 === 0)).toBe(true);
    expect(table.every((salary, index) => index === 0 || salary <= table[index - 1])).toBe(true);
  });

  test('creates one deterministic FARM pick and freezes every canonical club in the manifest', () => {
    const mlbSession = {
      ...farmSession(),
      draftPhase: 'MLB' as const,
      currentPickIndex: farmSession().pickOrder.length,
      snakeSetup: {
        poolPlayerIds: ['mlb'], versionSelections: {}, orderSeed: 'mlb-order',
        clubs: [{ teamId: 'a', hotseat: true }, { teamId: 'b', hotseat: true }],
      },
    };
    const created = createFarmSnakeSession({
      mlbSession,
      teamOrder: ['a', 'b'],
      existingFarmRosterCountsByTeamId: { a: 9, b: 10 },
      farmBudgetsByTeamId: { a: 100_000, b: 100_000 },
      farmArchetypeIdByTeamId: {},
      prospectIds: ['one-open-prospect'],
      prospects: [{ id: 'one-open-prospect' }] as never,
      now: '2026-07-14T12:00:00.000Z',
    });

    expect(created.pickOrder).toEqual([{ round: 1, pick: 1, teamId: 'a' }]);
    expect(created.farmSlotSalaries).toEqual([75_000]);
    const completed = {
      ...created,
      completedPicks: [{ ...created.pickOrder[0], playerId: 'one-open-prospect', settledSalary: 75_000 }],
      currentPickIndex: 1,
    };
    const frozen = freezeSnakeDraftSession({
      session: completed,
      expectedPhase: 'FARM',
      poolPlayerIds: ['one-open-prospect'],
      frozenAt: '2026-07-14T12:01:00.000Z',
    });
    expect(frozen.draftManifest?.lockedClubs.map((club) => club.teamId)).toEqual(['a', 'b']);
    expect(frozen.draftManifest?.completedPicks).toHaveLength(1);
  });

  test('uses club-local salary curves for the two-pick partial-roster boundaries', () => {
    const mlbSession = {
      ...farmSession(), draftPhase: 'MLB' as const, currentPickIndex: farmSession().pickOrder.length,
      snakeSetup: {
        poolPlayerIds: ['mlb'], versionSelections: {}, orderSeed: 'mlb-order',
        clubs: [{ teamId: 'a', hotseat: true }, { teamId: 'b', hotseat: true }],
      },
    };
    const prospects = ['p1', 'p2'].map((id) => ({ id } as never));
    const oneEach = createFarmSnakeSession({
      mlbSession, teamOrder: ['a', 'b'], existingFarmRosterCountsByTeamId: { a: 9, b: 9 },
      farmBudgetsByTeamId: { a: 100_000, b: 100_000 }, farmArchetypeIdByTeamId: {},
      prospectIds: prospects.map((prospect) => prospect.id), prospects, now: '2026-07-14T12:00:00.000Z',
    });
    const twoForA = createFarmSnakeSession({
      mlbSession, teamOrder: ['a', 'b'], existingFarmRosterCountsByTeamId: { a: 8, b: 10 },
      farmBudgetsByTeamId: { a: 100_000, b: 100_000 }, farmArchetypeIdByTeamId: {},
      prospectIds: prospects.map((prospect) => prospect.id), prospects, now: '2026-07-14T12:00:00.000Z',
    });

    expect(oneEach.farmSlotSalaries).toEqual([75_000, 75_000]);
    expect(twoForA.farmSlotSalaries).toHaveLength(2);
    expect(twoForA.farmSlotSalaries?.reduce((sum, salary) => sum + salary, 0)).toBe(72_000);
    expect(twoForA.farmSlotSalaries?.[0]).toBe(3 * twoForA.farmSlotSalaries![1]);
    expect(twoForA.farmSlotSalaries?.every((salary) => salary > 0 && salary % 1_000 === 0)).toBe(true);
  });

  test('uses separate 75% curves for unequal pristine FARM wallets', () => {
    const mlbSession = {
      ...farmSession(), draftPhase: 'MLB' as const, currentPickIndex: farmSession().pickOrder.length,
      snakeSetup: {
        poolPlayerIds: ['mlb'], versionSelections: {}, orderSeed: 'mlb-order',
        clubs: [{ teamId: 'a', hotseat: true }, { teamId: 'b', hotseat: true }],
      },
    };
    const prospects = Array.from({ length: 20 }, (_, index) => ({ id: `pristine-${index + 1}` } as never));
    const created = createFarmSnakeSession({
      mlbSession,
      teamOrder: ['a', 'b'],
      existingFarmRosterCountsByTeamId: { a: 0, b: 0 },
      farmBudgetsByTeamId: { a: 287_500, b: 787_500 },
      farmArchetypeIdByTeamId: {},
      prospectIds: prospects.map((prospect) => prospect.id),
      prospects,
      now: '2026-07-14T12:00:00.000Z',
    });

    for (const [teamId, budget] of [['a', 287_500], ['b', 787_500]] as const) {
      const salaries = created.pickOrder
        .filter((slot) => slot.teamId === teamId)
        .map((slot) => created.farmSlotSalaries![slot.pick - 1]);
      expect(salaries).toHaveLength(10);
      expect(salaries.reduce((sum, salary) => sum + salary, 0)).toBeLessThanOrEqual(budget * 0.75);
      expect(salaries[0]).toBe(3 * salaries.at(-1)!);
    }
  });

  test('constructs affordable deterministic slots for every two-club partial-roster vector and uneven solvent budgets', () => {
    const mlbSession = {
      ...farmSession(), draftPhase: 'MLB' as const, currentPickIndex: farmSession().pickOrder.length,
      snakeSetup: {
        poolPlayerIds: ['mlb'], versionSelections: {}, orderSeed: 'mlb-order',
        clubs: [{ teamId: 'a', hotseat: true }, { teamId: 'b', hotseat: true }],
      },
    };
    const prospects = Array.from({ length: 20 }, (_, index) => ({ id: `pool-${index + 1}` } as never));

    for (let aCount = 0; aCount <= 10; aCount += 1) {
      for (let bCount = 0; bCount <= 10; bCount += 1) {
        const aOpen = 10 - aCount;
        const bOpen = 10 - bCount;
        for (const scale of [1, 3, 7]) {
          const budgets = {
            a: aOpen === 0 ? 0 : (aOpen * 37_000 * scale) + 17_000,
            b: bOpen === 0 ? 0 : (bOpen * 91_000 * scale) + 23_000,
          };
          const created = createFarmSnakeSession({
            mlbSession,
            teamOrder: ['a', 'b'],
            existingFarmRosterCountsByTeamId: { a: aCount, b: bCount },
            farmBudgetsByTeamId: budgets,
            farmArchetypeIdByTeamId: {},
            prospectIds: prospects.map((prospect) => prospect.id),
            prospects,
            now: '2026-07-14T12:00:00.000Z',
          });
          expect(created.pickOrder.filter((slot) => slot.teamId === 'a')).toHaveLength(aOpen);
          expect(created.pickOrder.filter((slot) => slot.teamId === 'b')).toHaveLength(bOpen);
          expect(created.farmSlotSalaries).toHaveLength(aOpen + bOpen);
          for (const teamId of ['a', 'b'] as const) {
            const owed = created.pickOrder.filter((slot) => slot.teamId === teamId)
              .reduce((sum, slot) => sum + created.farmSlotSalaries![slot.pick - 1], 0);
            const salaries = created.pickOrder.filter((slot) => slot.teamId === teamId)
              .map((slot) => created.farmSlotSalaries![slot.pick - 1]);
            expect(owed).toBeLessThanOrEqual(budgets[teamId] * 0.75);
            if (salaries.length > 1) expect(salaries[0]).toBe(3 * salaries.at(-1)!);
          }
        }
      }
    }
  });

  test('creates a completed zero-pick FARM authority and freezes all full clubs', () => {
    const mlbSession = {
      ...farmSession(),
      draftPhase: 'MLB' as const,
      currentPickIndex: farmSession().pickOrder.length,
      snakeSetup: {
        poolPlayerIds: ['mlb'], versionSelections: {}, orderSeed: 'mlb-order',
        clubs: [{ teamId: 'a', hotseat: true }, { teamId: 'b', hotseat: true }],
      },
    };
    const created = createFarmSnakeSession({
      mlbSession,
      teamOrder: ['a', 'b'],
      existingFarmRosterCountsByTeamId: { a: 10, b: 10 },
      farmBudgetsByTeamId: { a: 100_000, b: 100_000 },
      farmArchetypeIdByTeamId: {},
      prospectIds: ['unused-reserve'],
      prospects: [{ id: 'unused-reserve' }] as never,
      now: '2026-07-14T12:00:00.000Z',
    });

    expect(created.pickOrder).toEqual([]);
    expect(created.completedPicks).toEqual([]);
    expect(created.farmSlotSalaries).toEqual([]);
    expect(created.currentPickIndex).toBe(0);
    const frozen = freezeSnakeDraftSession({
      session: created,
      expectedPhase: 'FARM',
      poolPlayerIds: ['unused-reserve'],
      frozenAt: '2026-07-14T12:01:00.000Z',
    });
    expect(frozen.draftManifest?.lockedClubs.map((club) => club.teamId)).toEqual(['a', 'b']);
    expect(frozen.draftManifest?.pickOrder).toEqual([]);
    expect(frozen.draftManifest?.completedPicks).toEqual([]);
  });

  test('uses each fixed absolute pick slot for its canonical owner', () => {
    const session = farmSession();
    expect(farmPickSalary(session, 1)).toBe(30_000);
    expect(farmPickSalary(session, 2)).toBe(22_000);
    expect(farmPickSalary(session, 3)).toBe(18_000);
    expect(farmPickSalary(session, 4)).toBe(10_000);
  });

  test('keeps drafted and planned money distinct as fixed farm turns are completed', () => {
    const source = {
      ...farmSession(),
      currentPickIndex: 1,
      completedPicks: [{ round: 1, pick: 1, teamId: 'a', playerId: 'p1', settledSalary: 30_000 }],
    };
    const afterFirstPick = buildFarmMoneyLedger(source, 'a', 100_000);
    const complete = {
      ...source,
      currentPickIndex: source.pickOrder.length,
      completedPicks: [
        ...source.completedPicks,
        { round: 2, pick: 4, teamId: 'a', playerId: 'p4', settledSalary: 10_000 },
      ],
    };
    const afterLastPick = buildFarmMoneyLedger(complete, 'a', 100_000);

    expect(afterFirstPick).toEqual({ draftedCount: 1, draftedSpend: 30_000, moneyLeft: 70_000, plannedCount: 1, futureSlotCost: 10_000, moneyAfterOwedSlots: 60_000 });
    expect(afterLastPick).toEqual({ draftedCount: 2, draftedSpend: 40_000, moneyLeft: 60_000, plannedCount: 0, futureSlotCost: 0, moneyAfterOwedSlots: 60_000 });
  });

  test('creates the farm session once from the completed MLB session and freezes its table', () => {
    const mlb = {
      ...farmSession(), draftPhase: 'MLB' as const, currentPickIndex: 4,
      draftManifest: { phase: 'MLB', seed: 'frozen-seed', lockedClubs: [] } as never,
      rosterHandoff: { phase: 'MLB', manifestIdentity: 'mlb-recap' } as never,
      versionState: { unavailablePlayerIds: ['retired-version'] } as never,
      trades: [{ id: 'mlb-trade' }] as never,
      openTradeOffers: [{ id: 'mlb-offer', phase: 'MLB' }] as never,
      roomLogByTeamId: { a: [{ id: 'mlb-note', text: 'private MLB advice' }] } as never,
      snakeCompanions: {
        roomCode: '4821',
        claims: [{ deviceId: 'ipad-a', gmName: 'Alex', teamId: 'a', status: 'approved' as const }],
      },
      paused: true,
      correctionSnapshots: [{ action: 'trade' }] as never,
      seatBoards: {
        a: { slots: { C: 'mlb-a' }, rankings: { global: ['mlb-a'] }, revision: 4 },
      } as never,
      farmSeatBoards: {
        a: {
          overall: ['stale-farm-a'], byPosition: { C: ['stale-farm-a'] },
          frozenProspectIds: ['stale-farm-a'], plannedProspectIds: ['stale-farm-a'], revision: 2,
        },
      },
      snakeSetup: {
        poolPlayerIds: ['mlb'], versionSelections: {}, orderSeed: 'order',
        seatingCertificate: { feasible: true, assignments: [], shortfall: null, message: 'MLB only' },
        clubs: [
          { teamId: 'a', hotseat: true, archetypeId: 'mlb-power' },
          { teamId: 'b', hotseat: true, archetypeId: 'mlb-contact' },
        ],
      },
    };
    const created = createFarmSnakeSession({
      mlbSession: mlb,
      teamOrder: ['a', 'b'],
      existingFarmRosterCountsByTeamId: { a: 8, b: 8 },
      farmBudgetsByTeamId: { a: 1_000_000, b: 1_000_000 },
      farmArchetypeIdByTeamId: { a: 'farm-speed', b: 'farm-defense' },
      prospectIds: ['p1', 'p2', 'p3', 'p4'],
      prospects: ['p1', 'p2', 'p3', 'p4'].map((id) => ({ id } as never)),
      now: '2026-07-10T01:00:00.000Z',
    });
    expect(created).toEqual(expect.objectContaining({
      draftPhase: 'FARM', seasonNumber: 2, currentPickIndex: 0, workflowVersion: 'snake-v1-farm',
    }));
    expect(created.id).not.toBe(mlb.id);
    expect(created.pickOrder).toHaveLength(4);
    expect(created.farmSlotSalaries?.reduce((sum, value) => sum + value, 0)).toBe(1_496_000);
    for (const teamId of ['a', 'b']) {
      const salaries = created.pickOrder.filter((slot) => slot.teamId === teamId)
        .map((slot) => created.farmSlotSalaries![slot.pick - 1]);
      expect(salaries[0]).toBe(3 * salaries[1]);
    }
    expect(created.snakeSetup?.poolPlayerIds).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(created.farmProspectSnapshot?.map((prospect) => prospect.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(created.snakeSetup?.orderSeed).toBe('frozen-seed');
    expect(created.snakeSetup?.clubs.map((club) => [club.teamId, club.archetypeId])).toEqual([
      ['a', 'farm-speed'],
      ['b', 'farm-defense'],
    ]);
    expect(created.draftManifest).toBeUndefined();
    expect(created.rosterHandoff).toBeUndefined();
    expect(created.versionState).toBeUndefined();
    expect(created.trades).toEqual([]);
    expect(created.correctionSnapshots).toEqual([]);
    expect(created).not.toHaveProperty('openTradeOffers');
    expect(created).not.toHaveProperty('roomLogByTeamId');
    expect(created).not.toHaveProperty('snakeCompanions');
    expect(created).not.toHaveProperty('paused');
    expect(created).not.toHaveProperty('seatBoards');
    expect(created).not.toHaveProperty('farmSeatBoards');
    expect(created.snakeSetup).not.toHaveProperty('seatingCertificate');
  });

});
