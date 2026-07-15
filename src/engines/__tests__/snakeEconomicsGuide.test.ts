import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import { buildSnakeOrder, derivePickValueChart } from '../leagueConstruction';
import {
  evaluateSnakeLegalFinish,
  evaluateSnakeBills,
  evaluateSnakePlan,
  snakeMoneyNonnegative,
} from '../snakeEconomics';
import {
  executeSnakeGuidePackage,
  revalidateSnakeGuidePackage,
  searchSnakeGuidePackage,
  searchSnakeGuidePackageBruteForce,
  type SnakeGuidePackage,
} from '../snakeGuideTrade';
import {
  closeSnakeTradeOffer,
  nodSnakeTradeOffer,
  postSnakeTradeOffer,
  proposalFromOpenSnakeOffer,
} from '../snakeTradeOffers';
import { restoreLatestSnakeCorrection } from '../snakeSession';
import { proveSimultaneousSnakeSeating, type SnakeSeatingPlayer } from '../snakeSeatingProof';
import {
  recoverCanonicalMlbSnakePickOrder,
  type LeagueBuilderMlbDraftSession,
} from '../../utils/leagueBuilderStorage';

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

function precisionArm(
  playerId: string,
  price: number,
  role: 'SP' | 'SP/RP' | 'RP' | 'CP',
  [VEL, JNK, ACC]: readonly [number, number, number],
): SnakeSeatingPlayer {
  return {
    playerId,
    sourceId: `stock:${playerId}`,
    price,
    shape: { isPitcher: true, position: role, role },
    construction: {
      id: playerId,
      isPitcher: true,
      role,
      bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
      pit: { VEL, JNK, ACC },
    },
  };
}

function precisionCurrentRoster(): SnakeSeatingPlayer[] {
  const hitter = (playerId: string, position: string, secondaryPosition?: string): SnakeSeatingPlayer => ({
    playerId,
    sourceId: `stock:${playerId}`,
    price: 0,
    shape: { isPitcher: false, position, secondaryPosition },
    construction: {
      id: playerId,
      isPitcher: false,
      bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
    },
  });
  return [
    hitter('precision-C', 'C'),
    hitter('precision-1B', '1B'),
    hitter('precision-2B', '2B'),
    hitter('precision-3B', '3B'),
    hitter('precision-SS', 'SS'),
    hitter('precision-LF', 'LF', 'C'),
    hitter('precision-CF', 'CF'),
    hitter('precision-RF', 'RF'),
    ...Array.from({ length: 5 }, (_, index) => hitter(`precision-B${index}`, 'CF')),
    precisionArm('precision-sp-0', 0, 'SP', [36, 81, 16]),
    precisionArm('precision-sp-1', 0, 'SP', [80, 55, 99]),
    precisionArm('precision-sp-2', 0, 'SP', [13, 23, 43]),
    precisionArm('precision-rp', 0, 'RP', [94, 91, 54]),
    precisionArm('precision-cp', 0, 'CP', [72, 82, 22]),
  ];
}

function chart(values: readonly number[]) {
  return values.map((value, index) => ({ pick: index + 1, value }));
}

function sessionWithOwners(input: {
  id: string;
  pickCount: number;
  owners: Readonly<Record<number, string>>;
  revision?: number;
}): LeagueBuilderMlbDraftSession {
  return {
    id: input.id,
    leagueId: 'league',
    seasonNumber: 1,
    seed: input.id,
    workflowVersion: 'v2',
    engineMethodVersion: 'snakeFoundations.v1',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: input.pickCount,
    pickOrder: Array.from({ length: input.pickCount }, (_, index) => ({
      round: index + 1,
      pick: index + 1,
      teamId: input.owners[index + 1] ?? `other-${index + 1}`,
    })),
    completedPicks: [],
    currentPickIndex: 0,
    revision: input.revision ?? 7,
    createdDate: '2026-07-10',
    lastModified: '2026-07-10',
  };
}

function legalSeating() {
  return {
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
}

describe('snake two-bills economics and guide packages', () => {
  test('shared money tolerance treats sub-cent floating residue as affordable', () => {
    expect(snakeMoneyNonnegative(-1.8189894035458565e-12)).toBe(true);
    expect(snakeMoneyNonnegative(-0.01)).toBe(false);
  });

  test('an exact tax-boundary roster is AFFORDABLE despite floating residue', () => {
    const finish = evaluateSnakeLegalFinish({
      currentRoster: precisionCurrentRoster(),
      committedSpent: 0,
      availablePool: [
        precisionArm('t19-p0', 1_389, 'RP', [8, 97, 29]),
        precisionArm('t19-p1', 427, 'SP', [79, 18, 46]),
        precisionArm('t19-p2', 58, 'SP/RP', [60, 12, 98]),
        precisionArm('t19-p3', 7, 'SP', [46, 15, 8]),
        precisionArm('t19-p4', 1_477, 'SP/RP', [26, 52, 21]),
        precisionArm('t19-p5', 282, 'SP', [5, 57, 75]),
        precisionArm('t19-p6', 1_622, 'RP', [36, 25, 50]),
        precisionArm('t19-p7', 1_047, 'SP/RP', [18, 9, 38]),
        precisionArm('t19-p8', 1_836, 'SP/RP', [80, 65, 9]),
        precisionArm('t19-p9', 2_081, 'RP', [62, 5, 48]),
      ],
      budget: 21_285.189,
      baseCaps: [
        { group: 'rotation', stat: 'VEL', topN: 4, cap: 119, penaltyCurve: 2, penaltyPer100: 42_502, minAdder: 0 },
        { group: 'rotation', stat: 'JNK', topN: 4, cap: 262, penaltyCurve: 1, penaltyPer100: 154_021, minAdder: 0 },
        { group: 'rotation', stat: 'ACC', topN: 4, cap: 245, penaltyCurve: 1, penaltyPer100: 115_386, minAdder: 0 },
        { group: 'bullpen', stat: 'VEL', topN: 4, cap: 230, penaltyCurve: 2, penaltyPer100: 14_843, minAdder: 0 },
        { group: 'bullpen', stat: 'JNK', topN: 4, cap: 135, penaltyCurve: 2, penaltyPer100: 26_198, minAdder: 0 },
        { group: 'bullpen', stat: 'ACC', topN: 4, cap: 202, penaltyCurve: 1, penaltyPer100: 173_114, minAdder: 0 },
      ],
      realTeamCount: 8,
    });

    expect([...finish.completionPlayerIds].sort()).toEqual(['t19-p5', 't19-p6', 't19-p7', 't19-p9']);
    expect(finish.completionCost).toBe(5_032);
    expect(finish.legalFinishCushion).toBeCloseTo(0, 9);
    expect(finish.affordability).toBe('AFFORDABLE');
  });

  test('rejects every guide and offer operation at the FARM engine boundary', () => {
    const session = {
      ...sessionWithOwners({
        id: 'farm-guide-rejected',
        pickCount: 4,
        owners: { 1: 'seller', 2: 'buyer', 3: 'seller', 4: 'buyer' },
      }),
      seasonNumber: 2,
      draftPhase: 'FARM' as const,
    };
    const pickValueChart = chart([100, 100, 100, 100]);
    const seatingProofInput = legalSeating();
    const proposal: SnakeGuidePackage = {
      buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 1,
      offerPickNumbers: [2], receivePickNumbers: [1],
      offerValue: 100, receiveValue: 100, sellerPremium: 0,
      sessionRevision: session.revision ?? 0,
    };
    const offer = {
      id: 'forged-farm-offer', phase: 'FARM' as const,
      buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 1,
      offerPickNumbers: [2], receivePickNumbers: [1],
      offerValue: 100, receiveValue: 100, sellerPremium: 0,
      postedSessionRevision: session.revision ?? 0,
      buyerNod: true, sellerNod: true, postedAt: '2026-07-14T12:00:00.000Z',
    };
    const withOffer = { ...session, openTradeOffers: [offer] };

    expect(() => searchSnakeGuidePackage({
      session, buyerTeamId: 'buyer', targetPick: 1, pickValueChart, seatingProofInput,
    })).toThrow(/FARM.*do not allow pick trades/i);
    expect(() => searchSnakeGuidePackageBruteForce({
      session, buyerTeamId: 'buyer', targetPick: 1, pickValueChart, seatingProofInput,
    })).toThrow(/FARM.*do not allow pick trades/i);
    expect(() => revalidateSnakeGuidePackage({ session, proposal, pickValueChart, seatingProofInput }))
      .toThrow(/FARM.*do not allow pick trades/i);
    expect(() => executeSnakeGuidePackage({ session, proposal, pickValueChart, seatingProofInput }))
      .toThrow(/FARM.*do not allow pick trades/i);
    expect(() => postSnakeTradeOffer({
      session, phase: 'FARM' as never, proposal, postedAt: '2026-07-14T12:00:00.000Z',
    })).toThrow(/FARM.*do not allow pick trades/i);
    expect(() => nodSnakeTradeOffer(withOffer, offer.id, 'buyer'))
      .toThrow(/FARM.*do not allow pick trades/i);
    expect(() => closeSnakeTradeOffer(withOffer, offer.id))
      .toThrow(/FARM.*do not allow pick trades/i);
    expect(() => proposalFromOpenSnakeOffer(withOffer, offer))
      .toThrow(/FARM.*do not allow pick trades/i);
  });

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

  test('legal finish preserves a negative TAXSWING settlement delta as available budget', () => {
    const taxCaps = (['VEL', 'JNK', 'ACC'] as const).flatMap((stat) => [
      { group: 'rotation' as const, stat, topN: 4, cap: 0, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0 },
      { group: 'bullpen' as const, stat, topN: 4, cap: 10_000, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0 },
    ]);
    const swingId = 'tax-refund-current-SP3';
    const omittedRelieverId = 'tax-refund-current-RP2';
    const currentRoster = legalPlayers('tax-refund-current', 10)
      .filter((row) => row.playerId !== omittedRelieverId)
      .map((row) => row.playerId === swingId ? {
        ...row,
        shape: { isPitcher: true, position: 'SP/RP', role: 'SP/RP' },
        construction: {
          ...row.construction,
          role: 'SP/RP' as const,
          pit: { VEL: 99, JNK: 99, ACC: 99 },
        },
      } : row);
    const fourthPureStarter = player(
      'tax-refund-fourth-sp',
      10,
      { isPitcher: true, position: 'SP', role: 'SP' },
    );
    const committedSpent = currentRoster.reduce((sum, row) => sum + row.price, 0);

    const finish = evaluateSnakeLegalFinish({
      currentRoster,
      committedSpent,
      availablePool: [fourthPureStarter],
      budget: committedSpent + fourthPureStarter.price + 120,
      baseCaps: taxCaps,
      realTeamCount: 2,
    });

    expect(finish.feasible).toBe(true);
    expect(finish.completionPlayerIds).toEqual([fourthPureStarter.playerId]);
    expect(finish.completionCost).toBe(10);
    expect(finish.completionTax).toBe(-267);
    expect(finish.legalFinishCushion).toBe(0);
  });

  test('legal finish chooses a lower all-in roster instead of blocking on the salary-cheapest taxed roster', () => {
    const taxCaps = [{
      group: 'hitters' as const,
      stat: 'POW' as const,
      topN: 8,
      cap: 0,
      penaltyCurve: 1,
      penaltyPer100: 100,
      minAdder: 0,
    }];
    const salaryCheap = legalPlayers('salary-cheap-tax-heavy', 1).map((row) => ({
      ...row,
      construction: {
        ...row.construction,
        bat: { POW: 99, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
        ...(row.shape.isPitcher ? { pit: { VEL: 0, JNK: 0, ACC: 0 } } : {}),
      },
    }));
    const allInCheap = legalPlayers('all-in-cheap', 2).map((row) => ({
      ...row,
      construction: {
        ...row.construction,
        bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
        ...(row.shape.isPitcher ? { pit: { VEL: 0, JNK: 0, ACC: 0 } } : {}),
      },
    }));

    const finish = evaluateSnakeLegalFinish({
      currentRoster: [],
      committedSpent: 0,
      availablePool: [...salaryCheap, ...allInCheap],
      budget: 100,
      baseCaps: taxCaps,
      realTeamCount: 2,
    });

    expect(finish.feasible).toBe(true);
    expect(finish.legalFinishCushion).toBeGreaterThanOrEqual(0);
    expect(finish.completionTax).toBe(0);
    expect(finish.completionPlayerIds.filter((id) => id.startsWith('all-in-cheap'))).toHaveLength(14);
  });

  test('legal finish exact settlement sees a pure starter demote a taxed swing arm', () => {
    const exactPlayer = (
      playerId: string,
      price: number,
      shape: RosterSlotPlayer,
      velocity = 0,
    ): SnakeSeatingPlayer => ({
      playerId,
      sourceId: `stock:${playerId}`,
      price,
      shape,
      construction: {
        id: playerId,
        isPitcher: shape.isPitcher,
        role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
        bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
        ...(shape.isPitcher ? { pit: { VEL: velocity, JNK: 0, ACC: 0 } } : {}),
      },
    });
    const fixed = [
      exactPlayer('fixed-C', 0, { isPitcher: false, position: 'C' }),
      exactPlayer('fixed-1B', 0, { isPitcher: false, position: '1B' }),
      exactPlayer('fixed-2B', 0, { isPitcher: false, position: '2B' }),
      exactPlayer('fixed-3B', 0, { isPitcher: false, position: '3B' }),
      exactPlayer('fixed-SS', 0, { isPitcher: false, position: 'SS' }),
      exactPlayer('fixed-LF', 0, { isPitcher: false, position: 'LF', secondaryPosition: 'C' }),
      exactPlayer('fixed-CF', 0, { isPitcher: false, position: 'CF' }),
      exactPlayer('fixed-RF', 0, { isPitcher: false, position: 'RF' }),
      ...Array.from({ length: 5 }, (_, index) => exactPlayer(`fixed-B${index}`, 0, { isPitcher: false, position: 'CF' })),
      ...Array.from({ length: 3 }, (_, index) => exactPlayer(`fixed-SP${index}`, 0, { isPitcher: true, position: 'SP', role: 'SP' }, 1)),
      ...Array.from({ length: 3 }, (_, index) => exactPlayer(`fixed-RP${index}`, 0, { isPitcher: true, position: 'RP', role: 'RP' })),
      exactPlayer('fixed-CP', 0, { isPitcher: true, position: 'CP', role: 'CP' }),
    ];
    const finish = evaluateSnakeLegalFinish({
      currentRoster: [exactPlayer('tax-swing', 0, { isPitcher: true, position: 'SP/RP', role: 'SP/RP' }, 99)],
      committedSpent: 0,
      availablePool: [
        ...fixed,
        exactPlayer('affordable-pure-sp', 10, { isPitcher: true, position: 'SP', role: 'SP' }, 1),
        exactPlayer('cheap-salary-taxed', 5, { isPitcher: true, position: 'SP/RP', role: 'SP/RP' }, 1),
      ],
      budget: 100,
      baseCaps: [{ group: 'rotation', stat: 'VEL', topN: 4, cap: 101, penaltyCurve: 1, penaltyPer100: 590_000, minAdder: 0 }],
      realTeamCount: 8,
    });

    expect(finish.completionPlayerIds).toContain('affordable-pure-sp');
    expect(finish.completionPlayerIds).not.toContain('cheap-salary-taxed');
    expect(finish.legalFinishCushion).toBe(90);
  });

  test('legal finish escapes a two-swap tax local minimum before declaring BLOCKED', () => {
    const exactArm = (
      playerId: string,
      price: number,
      role: 'SP' | 'SP/RP' | 'RP' | 'CP',
      [VEL, JNK, ACC]: readonly [number, number, number],
    ): SnakeSeatingPlayer => ({
      playerId,
      sourceId: `stock:${playerId}`,
      price,
      shape: { isPitcher: true, position: role, role },
      construction: {
        id: playerId,
        isPitcher: true,
        role,
        bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
        pit: { VEL, JNK, ACC },
      },
    });
    const zeroHitter = (
      playerId: string,
      position: RosterSlotPlayer['position'],
      secondaryPosition?: string,
    ): SnakeSeatingPlayer => ({
      playerId,
      sourceId: `stock:${playerId}`,
      price: 0,
      shape: { isPitcher: false, position, secondaryPosition },
      construction: {
        id: playerId,
        isPitcher: false,
        bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
      },
    });
    const currentRoster = [
      zeroHitter('t27-C', 'C'),
      zeroHitter('t27-1B', '1B'),
      zeroHitter('t27-2B', '2B'),
      zeroHitter('t27-3B', '3B'),
      zeroHitter('t27-SS', 'SS'),
      zeroHitter('t27-LF', 'LF', 'C'),
      zeroHitter('t27-CF', 'CF'),
      zeroHitter('t27-RF', 'RF'),
      ...Array.from({ length: 5 }, (_, index) => zeroHitter(`t27-B${index}`, 'CF')),
      exactArm('cur-sp-0', 0, 'SP', [36, 81, 16]),
      exactArm('cur-sp-1', 0, 'SP', [80, 55, 99]),
      exactArm('cur-sp-2', 0, 'SP', [13, 23, 43]),
      exactArm('cur-rp', 0, 'RP', [94, 91, 54]),
      exactArm('cur-cp', 0, 'CP', [72, 82, 22]),
    ];
    const availablePool = [
      exactArm('t27-p0', 1_537, 'SP/RP', [0, 74, 9]),
      exactArm('t27-p1', 965, 'SP/RP', [8, 85, 66]),
      exactArm('t27-p2', 1_461, 'RP', [95, 99, 53]),
      exactArm('t27-p3', 1_454, 'SP/RP', [73, 20, 58]),
      exactArm('t27-p4', 584, 'SP', [9, 83, 2]),
      exactArm('t27-p5', 1_067, 'SP', [43, 88, 8]),
      exactArm('t27-p6', 792, 'RP', [57, 5, 98]),
      exactArm('t27-p7', 702, 'SP', [24, 13, 52]),
      exactArm('t27-p8', 2_124, 'SP/RP', [76, 52, 67]),
      exactArm('t27-p9', 313, 'RP', [64, 19, 33]),
    ];
    const baseCaps = [
      { group: 'rotation' as const, stat: 'VEL' as const, topN: 4, cap: 183, penaltyCurve: 1, penaltyPer100: 58_520, minAdder: 0 },
      { group: 'rotation' as const, stat: 'JNK' as const, topN: 4, cap: 82, penaltyCurve: 1, penaltyPer100: 30_488, minAdder: 0 },
      { group: 'rotation' as const, stat: 'ACC' as const, topN: 4, cap: 115, penaltyCurve: 2, penaltyPer100: 73_089, minAdder: 0 },
      { group: 'bullpen' as const, stat: 'VEL' as const, topN: 4, cap: 203, penaltyCurve: 2, penaltyPer100: 50_628, minAdder: 0 },
      { group: 'bullpen' as const, stat: 'JNK' as const, topN: 4, cap: 242, penaltyCurve: 1, penaltyPer100: 170_841, minAdder: 0 },
      { group: 'bullpen' as const, stat: 'ACC' as const, topN: 4, cap: 227, penaltyCurve: 2, penaltyPer100: 192_512, minAdder: 0 },
    ];
    const budget = 110_697.6689;
    const finish = evaluateSnakeLegalFinish({
      currentRoster,
      committedSpent: 0,
      availablePool,
      budget,
      baseCaps,
      realTeamCount: 8,
    });

    expect([...finish.completionPlayerIds].sort()).toEqual(['t27-p0', 't27-p4', 't27-p5', 't27-p6']);
    expect(finish.completionCost).toBe(3_980);
    expect(budget - finish.legalFinishCushion).toBeCloseTo(110_697.6689, 3);
    expect(finish.legalFinishCushion).toBeGreaterThanOrEqual(-1e-3);
  });

  test('a bounded early-draft search stays OPEN instead of turning an unproved tax gap into BLOCKED', () => {
    const finish = evaluateSnakeLegalFinish({
      currentRoster: [],
      committedSpent: 0,
      availablePool: [
        ...legalPlayers('global-open-a', 1),
        ...legalPlayers('global-open-b', 1),
      ],
      budget: 0,
      baseCaps: [{
        group: 'hitters', stat: 'POW', topN: 8, cap: 0,
        penaltyCurve: 1, penaltyPer100: 10_000, minAdder: 0,
      }],
      realTeamCount: 8,
    });

    expect(finish.feasible).toBe(true);
    expect(finish.legalFinishCushion).toBeLessThan(0);
    expect(finish.affordability).toBe('OPEN');
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

  test('the same roster and archetype produce identical tax in 2-, 8-, and 20-club rooms', () => {
    const plan = legalPlayers('mock-tax', 99);
    const baseCaps = [{
      group: 'hitters' as const,
      stat: 'POW' as const,
      topN: 8,
      cap: 300,
      penaltyPer100: 1_000,
      penaltyCurve: 1,
      minAdder: 0,
    }];
    const twoClub = evaluateSnakePlan({
      boardPlayerIds: plan.map((row) => row.playerId), players: plan,
      budget: 1_000_000, baseCaps, realTeamCount: 2,
    });
    const eightClub = evaluateSnakePlan({
      boardPlayerIds: plan.map((row) => row.playerId), players: plan,
      budget: 1_000_000, baseCaps, realTeamCount: 8,
    });
    const twentyClub = evaluateSnakePlan({
      boardPlayerIds: plan.map((row) => row.playerId), players: plan,
      budget: 1_000_000, baseCaps, realTeamCount: 20,
    });
    expect(twoClub.planTax).toBeGreaterThan(0);
    expect(twoClub.planTax).toBe(eightClub.planTax);
    expect(twoClub.planTax).toBe(twentyClub.planTax);
  });

  test('plan economics refuses authoritative money for a complete nine-hitter, thirteen-pitcher board', () => {
    const legal = legalPlayers('illegal-plan', 10);
    const hitters = legal.filter((row) => !row.shape.isPitcher).slice(0, 9);
    const canonicalPitchers = legal.filter((row) => row.shape.isPitcher);
    const extraStarters = Array.from({ length: 5 }, (_, index) => player(
      `illegal-plan-extra-sp-${index + 1}`,
      10,
      { isPitcher: true, position: 'SP', role: 'SP' },
    ));
    const illegalPlan = [...hitters, ...canonicalPitchers, ...extraStarters];

    expect(illegalPlan).toHaveLength(22);
    expect(() => evaluateSnakePlan({
      boardPlayerIds: illegalPlan.map((row) => row.playerId),
      players: illegalPlan,
      budget: 1_000,
      baseCaps: [],
      realTeamCount: 2,
    })).toThrow('PLAN COST needs a canonically legal 22-player roster.');
  });

  test('guide search finds a balancing-return package from a generated surplus chart', () => {
    const values = Array.from({ length: 32 }, (_, index) => Math.round(1_000 * (0.91 ** index)));
    const pickValueChart = derivePickValueChart(values, 20, 4);
    const session = sessionWithOwners({
      id: 'generated-guide',
      pickCount: 20,
      owners: { 2: 'seller', 4: 'buyer', 12: 'buyer', 20: 'seller' },
    });
    const seatingProofInput = legalSeating();
    const found = searchSnakeGuidePackage({
      session,
      buyerTeamId: 'buyer',
      targetPick: 2,
      pickValueChart,
      seatingProofInput,
    });
    expect(proveSimultaneousSnakeSeating(seatingProofInput).shortfall).toBeNull();
    expect(found.package).toMatchObject({ offerPickNumbers: [4, 12], receivePickNumbers: [2, 20] });
    expect(found.package!.offerValue).toBeGreaterThanOrEqual(found.package!.receiveValue);
    expect((found.package as SnakeGuidePackage & { sellerPremium?: number }).sellerPremium)
      .toBe(found.package!.offerValue - found.package!.receiveValue);
    const executed = executeSnakeGuidePackage({
      session,
      proposal: found.package!,
      pickValueChart,
      seatingProofInput,
    });
    expect(executed.valid).toBe(true);
    expect(restoreLatestSnakeCorrection(executed.proposedSession!)).toEqual(session);
    expect(revalidateSnakeGuidePackage({
      session: { ...session, revision: 8 },
      proposal: found.package!,
      pickValueChart,
      seatingProofInput,
    }).message).toContain('draft moved on');

    expect(searchSnakeGuidePackage({
      session,
      buyerTeamId: 'buyer',
      targetPick: 2,
      pickValueChart,
      seatingProofInput: { ...seatingProofInput, pool: [] },
    })).toEqual({ package: null, message: 'No legal guide trade reaches pick 2.' });
  });

  test('FARM launch order is not derived from mutable round-one ownership after a guide trade', () => {
    const pickOrder = buildSnakeOrder(['seller', 'buyer'], 22);
    const session: LeagueBuilderMlbDraftSession = {
      id: 'farm-order-trade-repro',
      leagueId: 'league',
      seasonNumber: 1,
      seed: 'farm-order-seed',
      workflowVersion: 'snake-v1',
      engineMethodVersion: 'snake-s1a',
      tier: 'standard',
      balanceMode: 'taxed',
      rounds: 22,
      pickOrder,
      completedPicks: [],
      trades: [],
      snakeSetup: {
        poolPlayerIds: ['player-a'],
        versionSelections: {},
        clubs: [{ teamId: 'buyer', hotseat: false }, { teamId: 'seller', hotseat: false }],
        orderSeed: 'ranked-club-order-is-not-draft-order',
      },
      currentPickIndex: 0,
      revision: 0,
      createdDate: '2026-07-14T10:00:00.000Z',
      lastModified: '2026-07-14T10:00:00.000Z',
    };
    const executed = executeSnakeGuidePackage({
      session,
      proposal: {
        buyerTeamId: 'buyer',
        sellerTeamId: 'seller',
        targetPick: 1,
        offerPickNumbers: [3],
        receivePickNumbers: [1],
        offerValue: 100,
        receiveValue: 100,
        sellerPremium: 0,
        sessionRevision: 0,
      },
      pickValueChart: chart(pickOrder.map(() => 100)),
      seatingProofInput: legalSeating(),
    });

    expect(executed.valid).toBe(true);
    expect(executed.proposedSession!.pickOrder.slice(0, 2).map((slot) => slot.teamId))
      .toEqual(['buyer', 'buyer']);
    expect(recoverCanonicalMlbSnakePickOrder(executed.proposedSession!)).toEqual(pickOrder);

    const second = executeSnakeGuidePackage({
      session: executed.proposedSession!,
      proposal: {
        buyerTeamId: 'buyer',
        sellerTeamId: 'seller',
        targetPick: 4,
        offerPickNumbers: [1],
        receivePickNumbers: [4],
        offerValue: 100,
        receiveValue: 100,
        sellerPremium: 0,
        sessionRevision: 1,
      },
      pickValueChart: chart(pickOrder.map(() => 100)),
      seatingProofInput: legalSeating(),
    });
    expect(second.valid).toBe(true);
    expect(recoverCanonicalMlbSnakePickOrder(second.proposedSession!)).toEqual(pickOrder);

    const twiceTraded = second.proposedSession!;
    const corruptions: LeagueBuilderMlbDraftSession[] = [
      { ...twiceTraded, trades: [...twiceTraded.trades!].reverse() },
      {
        ...twiceTraded,
        trades: twiceTraded.trades!.map((trade, index) => index === 1
          ? { ...trade, humanPickNumbers: [1, 1], cpuPickNumbers: [4, 2] }
          : trade),
      },
      {
        ...twiceTraded,
        trades: twiceTraded.trades!.map((trade, index) => index === 1
          ? { ...trade, humanPickNumbers: [pickOrder.length + 1] }
          : trade),
      },
      {
        ...twiceTraded,
        pickOrder: twiceTraded.pickOrder.map((slot) => slot.pick === 3
          ? { ...slot, teamId: 'buyer' }
          : slot),
      },
      {
        ...twiceTraded,
        trades: twiceTraded.trades!.map((trade, index) => index === 1
          ? { ...trade, id: twiceTraded.trades![0].id }
          : trade),
      },
    ];
    for (const corrupt of corruptions) {
      expect(() => recoverCanonicalMlbSnakePickOrder(corrupt)).toThrow(/trade history is corrupt/i);
    }
  });

  test('a canonical production MLB session with no trade property still recovers its order', () => {
    const pickOrder = buildSnakeOrder(['seller', 'buyer'], 22);
    const noTradeSession: LeagueBuilderMlbDraftSession = {
      id: 'farm-order-no-trade', leagueId: 'league', seasonNumber: 1, seed: 'seed',
      workflowVersion: 'snake-v1', engineMethodVersion: 'snake-s1a', tier: 'standard', balanceMode: 'taxed',
      rounds: 22, pickOrder, completedPicks: [], currentPickIndex: 0,
      snakeSetup: {
        poolPlayerIds: ['player-a'], versionSelections: {}, orderSeed: 'seed',
        clubs: [{ teamId: 'buyer', hotseat: false }, { teamId: 'seller', hotseat: false }],
      },
      createdDate: '2026-07-14T10:00:00.000Z', lastModified: '2026-07-14T10:00:00.000Z',
    };

    expect(noTradeSession).not.toHaveProperty('trades');
    expect(recoverCanonicalMlbSnakePickOrder(noTradeSession)).toEqual(pickOrder);
    expect(() => recoverCanonicalMlbSnakePickOrder({ ...noTradeSession, trades: null as never }))
      .toThrow(/trade history is corrupt/i);
  });

  test('carries a nonzero authoritative seller premium and rejects missing, malformed, or tampered premium snapshots', () => {
    const pickValueChart = chart([100, 105]);
    const session = sessionWithOwners({ id: 'premium-integrity', pickCount: 2, owners: { 1: 'seller', 2: 'buyer' } });
    const input = {
      session,
      buyerTeamId: 'buyer',
      targetPick: 1,
      pickValueChart,
      seatingProofInput: legalSeating(),
    };
    const found = searchSnakeGuidePackage(input);
    expect(found.package).not.toBeNull();
    const proposal = found.package as SnakeGuidePackage & { sellerPremium?: number };
    expect(proposal.sellerPremium).toBe(5);
    expect(revalidateSnakeGuidePackage({ ...input, proposal })).toMatchObject({ valid: true });

    const { sellerPremium: _removed, ...missingPremium } = proposal;
    expect(_removed).toBe(5);
    for (const mutation of [
      missingPremium,
      { ...proposal, sellerPremium: Number.NaN },
      { ...proposal, sellerPremium: Number.POSITIVE_INFINITY },
      { ...proposal, sellerPremium: 4 },
    ]) {
      expect(revalidateSnakeGuidePackage({ ...input, proposal: mutation as SnakeGuidePackage }))
        .toMatchObject({ valid: false, guideMatched: false, proposedSession: null });
      expect(executeSnakeGuidePackage({ ...input, proposal: mutation as SnakeGuidePackage }))
        .toMatchObject({ valid: false, guideMatched: false, proposedSession: null });
    }
  });

  test('searches every package size and chooses value gap before complexity', () => {
    const pickValueChart = chart([110, 100, 80, 70, 60, 50, 40, 30, 25, 20, 20, 10]);
    const session = sessionWithOwners({
      id: 'all-sizes',
      pickCount: 12,
      owners: { 2: 'seller', 4: 'buyer', 5: 'buyer', 10: 'seller', 11: 'seller', 12: 'buyer' },
    });
    const input = {
      session,
      buyerTeamId: 'buyer',
      targetPick: 2,
      pickValueChart,
      seatingProofInput: legalSeating(),
    };
    expect(searchSnakeGuidePackage(input).package).toMatchObject({
      offerPickNumbers: [4, 5, 12],
      receivePickNumbers: [2, 10, 11],
      offerValue: 140,
      receiveValue: 140,
    });
    expect(searchSnakeGuidePackage(input)).toEqual(searchSnakeGuidePackageBruteForce(input));
  });

  test('rejects a buyer underpay that shared 15% validation still considers balanced', () => {
    const pickValueChart = chart([100, 90]);
    const session = sessionWithOwners({ id: 'underpay', pickCount: 2, owners: { 1: 'seller', 2: 'buyer' } });
    const result = revalidateSnakeGuidePackage({
      session,
      proposal: {
        buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 1,
        offerPickNumbers: [2], receivePickNumbers: [1], offerValue: 90, receiveValue: 100, sellerPremium: -10,
        sessionRevision: session.revision ?? 0,
      },
      pickValueChart,
      seatingProofInput: legalSeating(),
    });
    expect(result).toMatchObject({ valid: false, guideMatched: false, proposedSession: null });
  });

  test('returns no package when the buyer lacks enough posted capital', () => {
    const pickValueChart = chart([100, 80, 70, 60, 50, 40, 35, 30, 25, 20, 10, 5]);
    const session = sessionWithOwners({
      id: 'insufficient-capital',
      pickCount: 12,
      owners: { 1: 'seller', 8: 'seller', 9: 'seller', 10: 'buyer', 11: 'buyer', 12: 'buyer' },
    });
    expect(searchSnakeGuidePackage({
      session,
      buyerTeamId: 'buyer',
      targetPick: 1,
      pickValueChart,
      seatingProofInput: legalSeating(),
    }).package).toBeNull();
  });

  test('execution uses the exact immutable proposal snapshot that passed revalidation', () => {
    const pickValueChart = chart([100, 100, 1]);
    const session = sessionWithOwners({
      id: 'mutable-proposal',
      pickCount: 3,
      owners: { 1: 'seller', 2: 'buyer', 3: 'buyer' },
    });
    let offerReads = 0;
    const proposal = {
      buyerTeamId: 'buyer',
      sellerTeamId: 'seller',
      targetPick: 1,
      get offerPickNumbers() {
        offerReads += 1;
        return offerReads <= 8 ? [2] : [3];
      },
      receivePickNumbers: [1],
      offerValue: 100,
      receiveValue: 100,
      sellerPremium: 0,
      sessionRevision: 7,
    } as SnakeGuidePackage;

    const executed = executeSnakeGuidePackage({
      session,
      proposal,
      pickValueChart,
      seatingProofInput: legalSeating(),
    });
    expect(executed.valid).toBe(true);
    expect(executed.proposedSession?.pickOrder.find((slot) => slot.pick === 2)?.teamId).toBe('seller');
    expect(executed.proposedSession?.pickOrder.find((slot) => slot.pick === 3)?.teamId).toBe('buyer');
    expect(executed.proposedSession?.trades?.at(-1)).toMatchObject({
      humanPickNumbers: [2],
      cpuPickNumbers: [1],
      humanValue: 100,
      cpuValue: 100,
    });
    expect(offerReads).toBe(1);
  });

  test('optimized guide answers are byte-identical to the original search across 40 deterministic fixtures', () => {
    let state = 0x5eed1234;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
    for (let fixtureIndex = 0; fixtureIndex < 40; fixtureIndex += 1) {
      const teamIds = ['buyer', 'seller', 'third', 'fourth'];
      const pickOrder = buildSnakeOrder(teamIds, 5);
      const values = Array.from({ length: pickOrder.length }, () => 10 + Math.floor(random() * 990));
      const chart = derivePickValueChart(values, pickOrder.length, teamIds.length);
      const session: LeagueBuilderMlbDraftSession = {
        id: `property-${fixtureIndex}`, leagueId: 'league', seasonNumber: 1, seed: `seed-${fixtureIndex}`,
        workflowVersion: 'v2', engineMethodVersion: 'snakeFoundations.v1', tier: 'standard', balanceMode: 'taxed', rounds: 5,
        pickOrder, completedPicks: [], currentPickIndex: fixtureIndex % 3, revision: fixtureIndex,
        createdDate: '2026-07-11', lastModified: '2026-07-11',
      };
      const targetPick = session.pickOrder.slice(session.currentPickIndex).find((slot) => slot.teamId === 'seller')!.pick;
      const seatingProofInput = { clubs: [], pool: [], baseCaps: [], realTeamCount: teamIds.length };
      const input = { session, buyerTeamId: 'buyer', targetPick, pickValueChart: chart, seatingProofInput };
      expect(searchSnakeGuidePackage(input)).toEqual(searchSnakeGuidePackageBruteForce(input));
    }
  });
});
