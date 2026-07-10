import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import { derivePickValueChart } from '../leagueConstruction';
import {
  evaluateSnakeBills,
  evaluateSnakePlan,
} from '../snakeEconomics';
import {
  executeSnakeGuidePackage,
  revalidateSnakeGuidePackage,
  searchSnakeGuidePackage,
} from '../snakeGuideTrade';
import { restoreLatestSnakeCorrection } from '../snakeSession';
import { proveSimultaneousSnakeSeating, type SnakeSeatingPlayer } from '../snakeSeatingProof';
import type { LeagueBuilderMlbDraftSession } from '../../utils/leagueBuilderStorage';

function player(playerId: string, price: number, shape: RosterSlotPlayer): SnakeSeatingPlayer {
  return {
    playerId,
    sourceId: `stock:${playerId}`,
    price,
    shape,
    construction: {
      id: playerId,
      isPitcher: shape.isPitcher,
      role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
      bat: { POW: price, CON: price, SPD: price, FLD: price, ARM: price },
      ...(shape.isPitcher ? { pit: { VEL: price, JNK: price, ACC: price } } : {}),
    },
  };
}

function legalPlayers(prefix: string, price: number): SnakeSeatingPlayer[] {
  return [
    player(`${prefix}-C`, price, { isPitcher: false, position: 'C' }),
    player(`${prefix}-1B`, price, { isPitcher: false, position: '1B' }),
    player(`${prefix}-2B`, price, { isPitcher: false, position: '2B' }),
    player(`${prefix}-3B`, price, { isPitcher: false, position: '3B' }),
    player(`${prefix}-SS`, price, { isPitcher: false, position: 'SS' }),
    player(`${prefix}-LF`, price, { isPitcher: false, position: 'LF', secondaryPosition: 'C' }),
    player(`${prefix}-CF`, price, { isPitcher: false, position: 'CF' }),
    player(`${prefix}-RF`, price, { isPitcher: false, position: 'RF' }),
    ...Array.from({ length: 6 }, (_, i) => player(`${prefix}-B${i}`, price, { isPitcher: false, position: 'CF' })),
    ...Array.from({ length: 4 }, (_, i) => player(`${prefix}-SP${i}`, price, { isPitcher: true, position: 'SP', role: 'SP' })),
    ...Array.from({ length: 3 }, (_, i) => player(`${prefix}-RP${i}`, price, { isPitcher: true, position: 'RP', role: 'RP' })),
    player(`${prefix}-CP`, price, { isPitcher: true, position: 'CP', role: 'CP' }),
  ];
}

describe('snake two-bills economics and guide packages', () => {
  test('two-bills-never-equal-by-construction in both pressure directions', () => {
    const expensivePlan = legalPlayers('plan-expensive', 30);
    const cheapPool = legalPlayers('pool-cheap', 5);
    const planTight = evaluateSnakeBills({
      boardPlayerIds: expensivePlan.map((row) => row.playerId),
      players: [...expensivePlan, ...cheapPool],
      currentRoster: [],
      committedSpent: 0,
      availablePool: cheapPool,
      budget: 700,
      baseCaps: [],
      realTeamCount: 2,
    });
    expect(planTight.plan.planCushion).toBe(40);
    expect(planTight.legalFinish.legalFinishCushion).toBe(590);

    const cheapPlan = legalPlayers('plan-cheap', 5);
    const expensivePool = legalPlayers('pool-expensive', 30);
    const finishTight = evaluateSnakeBills({
      boardPlayerIds: cheapPlan.map((row) => row.playerId),
      players: [...cheapPlan, ...expensivePool],
      currentRoster: [],
      committedSpent: 0,
      availablePool: expensivePool,
      budget: 700,
      baseCaps: [],
      realTeamCount: 2,
    });
    expect(finishTight.plan.planCushion).toBe(590);
    expect(finishTight.legalFinish.legalFinishCushion).toBe(40);
  });

  test('slot reassignment never changes plan tax because membership is unchanged', () => {
    const plan = legalPlayers('same-members', 10);
    const first = evaluateSnakePlan({
      boardPlayerIds: plan.map((row) => row.playerId),
      players: plan,
      budget: 1_000,
      baseCaps: [{ group: 'hitters', stat: 'POW', topN: 8, cap: 1, penaltyPer100: 10, penaltyCurve: 1, minAdder: 0 }],
      realTeamCount: 2,
    });
    const second = evaluateSnakePlan({
      boardPlayerIds: [...plan].reverse().map((row) => row.playerId),
      players: plan,
      budget: 1_000,
      baseCaps: [{ group: 'hitters', stat: 'POW', topN: 8, cap: 1, penaltyPer100: 10, penaltyCurve: 1, minAdder: 0 }],
      realTeamCount: 2,
    });
    expect(second.planTax).toBe(first.planTax);
  });

  test('guide search finds OFFER 14+41 / RECEIVE 9+62 and refuses a stranding package', () => {
    const values = Array.from({ length: 70 }, (_, index) => 200 - index);
    values[8] = 150;
    values[13] = 120;
    values[40] = 60;
    values[61] = 30;
    values.sort((a, b) => b - a);
    const chart = derivePickValueChart(values);
    // Pin the documented posted-price relationship without bypassing derivePickValueChart.
    chart[8].value = 150;
    chart[13].value = 120;
    chart[40].value = 60;
    chart[61].value = 30;

    const pickOrder = Array.from({ length: 70 }, (_, index) => ({
      round: Math.floor(index / 2) + 1,
      pick: index + 1,
      teamId: [14, 41].includes(index + 1) ? 'buyer' : [9, 62].includes(index + 1) ? 'seller' : `other-${index}`,
    }));
    const session: LeagueBuilderMlbDraftSession = {
      id: 'guide', leagueId: 'league', seasonNumber: 1, seed: 'guide', workflowVersion: 'v2',
      engineMethodVersion: 'snakeFoundations.v1', tier: 'standard', balanceMode: 'taxed', rounds: 35,
      pickOrder, completedPicks: [], currentPickIndex: 0, revision: 7,
      createdDate: '2026-07-10', lastModified: '2026-07-10',
    };
    const legalSeating = {
      clubs: ['buyer', 'seller'].map((teamId) => ({
        teamId,
        roster: [],
        budgetRemaining: 10_000,
      })),
      pool: [
        ...legalPlayers('guide-a', 5),
        ...legalPlayers('guide-b', 5),
        ...legalPlayers('guide-slack-a', 5),
        ...legalPlayers('guide-slack-b', 5),
      ],
      baseCaps: [],
      realTeamCount: 2,
    };
    const found = searchSnakeGuidePackage({
      session,
      buyerTeamId: 'buyer',
      targetPick: 9,
      pickValueChart: chart,
      seatingProofInput: legalSeating,
    });
    expect(proveSimultaneousSnakeSeating(legalSeating).shortfall).toBeNull();
    expect(found.package).toMatchObject({ offerPickNumbers: [14, 41], receivePickNumbers: [9, 62] });
    expect(found.message).toContain('OFFER 14+41; RECEIVE 9+62');
    const executed = executeSnakeGuidePackage({
      session,
      proposal: found.package!,
      pickValueChart: chart,
      seatingProofInput: legalSeating,
    });
    expect(executed.valid).toBe(true);
    expect(restoreLatestSnakeCorrection(executed.proposedSession!)).toEqual(session);
    expect(revalidateSnakeGuidePackage({
      session: { ...session, revision: 8 },
      proposal: found.package!,
      pickValueChart: chart,
      seatingProofInput: legalSeating,
    }).message).toContain('draft moved on');

    expect(searchSnakeGuidePackage({
      session,
      buyerTeamId: 'buyer',
      targetPick: 9,
      pickValueChart: chart,
      seatingProofInput: { ...legalSeating, pool: [] },
    })).toEqual({ package: null, message: 'No legal guide trade reaches pick 9.' });
  });
});
