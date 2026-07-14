import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import { buildSnakeOrder, derivePickValueChart } from '../leagueConstruction';
import {
  evaluateSnakeLegalFinish,
  evaluateSnakeBills,
  evaluateSnakePlan,
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
