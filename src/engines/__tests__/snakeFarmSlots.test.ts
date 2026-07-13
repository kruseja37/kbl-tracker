import { describe, expect, test } from 'vitest';

import {
  buildFarmSlotTable,
  createFarmSnakeSession,
  executeFarmGuidePackage,
  buildFarmMoneyLedger,
  farmPickSalary,
  validateFarmPickTrade,
} from '../snakeFarmSlots';
import type { LeagueBuilderMlbDraftSession } from '../../utils/leagueBuilderStorage';

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
  test('calibrates a frozen geometric table to 3x endpoints and 75% of league budgets', () => {
    const table = buildFarmSlotTable(40, [1_000_000, 900_000, 1_100_000, 1_000_000]);

    expect(table).toHaveLength(40);
    expect(table[0]).toBe(3 * table.at(-1)!);
    expect(table.reduce((sum, salary) => sum + salary, 0)).toBe(3_000_000);
    expect(table.every((salary) => salary % 1_000 === 0)).toBe(true);
    expect(table.every((salary, index) => index === 0 || salary <= table[index - 1])).toBe(true);
  });

  test('uses the absolute pick slot and never recomputes after ownership changes', () => {
    const session = farmSession();
    expect(farmPickSalary(session, 1)).toBe(30_000);
    expect(farmPickSalary(session, 4)).toBe(10_000);

    const traded = {
      ...session,
      pickOrder: session.pickOrder.map((slot) => slot.pick === 1 ? { ...slot, teamId: 'b' } : slot),
    };
    expect(farmPickSalary(traded, 1)).toBe(30_000);
  });

  test('keeps drafted and planned money distinct after a pick ownership trade', () => {
    const source = {
      ...farmSession(),
      currentPickIndex: 1,
      completedPicks: [{ round: 1, pick: 1, teamId: 'a', playerId: 'p1', settledSalary: 30_000 }],
    };
    const before = buildFarmMoneyLedger(source, 'a', 100_000);
    const traded = {
      ...source,
      pickOrder: source.pickOrder.map((slot) => slot.pick === 4 ? { ...slot, teamId: 'b' } : slot),
    };
    const after = buildFarmMoneyLedger(traded, 'a', 100_000);

    expect(before).toEqual({ draftedCount: 1, draftedSpend: 30_000, moneyLeft: 70_000, plannedCount: 1, futureSlotCost: 10_000, moneyAfterOwedSlots: 60_000 });
    expect(after).toEqual({ draftedCount: 1, draftedSpend: 30_000, moneyLeft: 70_000, plannedCount: 0, futureSlotCost: 0, moneyAfterOwedSlots: 70_000 });
  });

  test('creates the farm session once from the completed MLB session and freezes its table', () => {
    const mlb = {
      ...farmSession(), draftPhase: 'MLB' as const, currentPickIndex: 4,
      draftManifest: { phase: 'MLB', seed: 'frozen-seed', lockedClubs: [] } as never,
      snakeSetup: {
        poolPlayerIds: ['mlb'], versionSelections: {}, orderSeed: 'order',
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
    expect(created.farmSlotSalaries?.reduce((sum, value) => sum + value, 0)).toBe(1_500_000);
    expect(created.snakeSetup?.poolPlayerIds).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(created.farmProspectSnapshot?.map((prospect) => prospect.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(created.snakeSetup?.orderSeed).toBe('frozen-seed');
    expect(created.snakeSetup?.clubs.map((club) => [club.teamId, club.archetypeId])).toEqual([
      ['a', 'farm-speed'],
      ['b', 'farm-defense'],
    ]);
    expect(created.draftManifest).toBeUndefined();
  });

  test('rejects a trade that overruns a farm wallet and accepts one that fits', () => {
    const session = farmSession();
    const over = validateFarmPickTrade({
      session,
      buyerTeamId: 'a',
      sellerTeamId: 'b',
      offerPickNumbers: [4],
      receivePickNumbers: [2],
      farmBudgetsByTeamId: { a: 20_000, b: 50_000 },
      remainingUniqueProspects: 20,
    });
    expect(over).toEqual(expect.objectContaining({ valid: false, reason: expect.stringMatching(/budget/i) }));

    const fits = validateFarmPickTrade({
      session,
      buyerTeamId: 'a',
      sellerTeamId: 'b',
      offerPickNumbers: [4],
      receivePickNumbers: [3],
      farmBudgetsByTeamId: { a: 50_000, b: 50_000 },
      remainingUniqueProspects: 20,
    });
    expect(fits.valid).toBe(true);
  });

  test('executes a guide trade only when the frozen-slot farm money gate still fits', () => {
    const session = { ...farmSession(), farmSlotSalaries: [10_000, 10_000, 10_000, 10_000] };
    const proposal = {
      buyerTeamId: 'a', sellerTeamId: 'b', targetPick: 3,
      offerPickNumbers: [4], receivePickNumbers: [3],
      offerValue: 10_000, receiveValue: 10_000, sessionRevision: 0,
    };
    const result = executeFarmGuidePackage({
      session,
      proposal,
      farmBudgetsByTeamId: { a: 30_000, b: 30_000 },
      remainingUniqueProspects: 10,
    });
    expect(result.valid).toBe(true);
    expect(result.session?.pickOrder.find((slot) => slot.pick === 3)?.teamId).toBe('a');
    expect(result.session?.pickOrder.find((slot) => slot.pick === 4)?.teamId).toBe('b');
    expect(result.session?.farmSlotSalaries).toEqual(session.farmSlotSalaries);
  });
});
