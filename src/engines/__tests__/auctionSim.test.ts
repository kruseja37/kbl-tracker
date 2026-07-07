import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import {
  buildPoolMetrics,
  buildReserveFeasibilityDiagnostics,
  adaptEconomyPlayer,
  bestProjectedCompletionValue,
  cheapestLegalCompletionCost,
  clearAuctionLot,
  evaluateMarginalValueBid,
  evaluateMarginalValueV2LiquidityBid,
  maxLegalBidForPlayer,
  qualityAdjustedCompletionCost,
  reservePrice,
  roundToAuctionIncrement,
  simulateAuction,
  type AuctionSimConfig,
  type AuctionSimPlayer,
  type AuctionSimRosterEntry,
  type AuctionSimTeamState,
} from '../auctionSim';

const BASE_CONFIG: AuctionSimConfig = {
  teamCount: 2,
  rosterSize: 22,
  budgetPerTeam: 1_000_000,
  bidIncrement: 1_000,
  reserveFractionK: 1,
  autoFillPriceMode: 'reserve',
  nominationPolicy: 'starFirst',
  biddingPolicy: 'rationalBaseline',
  seed: 'auction-sim-test',
  spotBudgetCheckpoint: 11,
  minimumCompletionPrice: 0,
};

function hitter(position: string, secondaryPosition: string | null = null): RosterSlotPlayer {
  return { isPitcher: false, position, secondaryPosition };
}

function pitcher(role: string): RosterSlotPlayer {
  return { isPitcher: true, position: role, role };
}

function player(playerId: string, iv: number, pos?: RosterSlotPlayer, grade = 'B-'): AuctionSimPlayer {
  const numericByGrade: Record<string, number> = {
    A: 86,
    'B+': 75,
    'B-': 66,
    'C+': 62,
    C: 57,
    'D+': 48,
  };
  return { playerId, iv, grade, numericGrade: numericByGrade[grade] ?? 66, pos };
}

function entry(source: AuctionSimPlayer): AuctionSimRosterEntry {
  return {
    playerId: source.playerId,
    iv: source.iv,
    numericGrade: source.numericGrade ?? null,
    letterGrade: source.grade,
    grade: source.grade,
    gradeBand: 'core',
    salary: 0,
    source: 'auction',
    pos: source.pos,
  };
}

function team(teamId: string, budgetRemaining: number, roster: readonly AuctionSimPlayer[] = []): AuctionSimTeamState {
  return {
    teamId,
    budgetRemaining,
    roster: roster.map(entry),
    budgetAtRosterSpot11: null,
    completionSurplusAtRosterSpot11: null,
    qualityCompletionSurplusAtRosterSpot11: null,
  };
}

function nearlyCompleteRoster(): AuctionSimPlayer[] {
  return [
    player('C1', 10_000, hitter('C')),
    player('1B1', 10_000, hitter('1B')),
    player('2B1', 10_000, hitter('2B')),
    player('3B1', 10_000, hitter('3B')),
    player('LF1', 10_000, hitter('LF')),
    player('CF1', 10_000, hitter('CF')),
    player('RF1', 10_000, hitter('RF')),
    player('C2', 10_000, hitter('C')),
    player('B1', 10_000, hitter('1B')),
    player('B2', 10_000, hitter('2B')),
    player('B3', 10_000, hitter('3B')),
    player('B4', 10_000, hitter('LF')),
    player('SP1', 10_000, pitcher('SP')),
    player('SP2', 10_000, pitcher('SP')),
    player('SP3', 10_000, pitcher('SP')),
    player('SP4', 10_000, pitcher('SP')),
    player('RP1', 10_000, pitcher('RP')),
    player('RP2', 10_000, pitcher('RP')),
    player('RP3', 10_000, pitcher('RP')),
    player('CP1', 10_000, pitcher('CP')),
  ];
}

describe('auctionSim reserve prices', () => {
  test('rounds k × IV up to the auction increment', () => {
    expect(roundToAuctionIncrement(64_001, 1_000)).toBe(65_000);
    expect(reservePrice(player('p1', 100_000), 0.65, 1_000)).toBe(65_000);
    expect(reservePrice(player('p2', 100_000), 0, 1_000)).toBe(0);
  });

  test('reserve feasibility preflight reports IV basis and k max estimates', () => {
    const legalPool = [
      ...nearlyCompleteRoster().map((source, index) => ({
        ...source,
        playerId: `legal-${index}`,
        iv: 100_000,
      })),
      player('legal-ss', 100_000, hitter('SS')),
      player('legal-bench', 100_000, hitter('LF')),
    ];

    const diagnostics = buildReserveFeasibilityDiagnostics(
      legalPool,
      [{ teamId: 't1' }],
      {
        ...BASE_CONFIG,
        teamCount: 1,
        reserveFractionK: 0.65,
        autoFillPriceMode: 'reserve',
      },
    );

    expect(diagnostics.reserveBasisAudit).toEqual({
      status: 'RESOLVED',
      basis: 'IV',
      formula: 'reservePrice = k x IV, rounded up to the auction increment',
    });
    expect(diagnostics.reserveFeasible).toBe(false);
    expect(diagnostics.feasibilityStatus).toBe('LEAGUE_COMPLETION_UNAFFORDABLE');
    expect(diagnostics.kMaxBindingReason).toBe('LEAGUE_AGGREGATE');
    expect(diagnostics.kMaxLeagueAggregate).toBe(diagnostics.kMaxFeasibleGlobal);
    expect(diagnostics.kMaxWorstTeam).toBe(diagnostics.kMaxFeasibleGlobal);
    expect(diagnostics.kMaxFeasibleGlobal).toBeGreaterThan(0.44);
    expect(diagnostics.kMaxFeasibleGlobal).toBeLessThan(0.46);
  });
});

describe('auctionSim legal completion cost', () => {
  test('max legal bid reserves the cheapest position-aware completion after the candidate is added', () => {
    const roster = [
      player('C1', 1_000, hitter('C')),
      player('1B1', 1_000, hitter('1B')),
      player('2B1', 1_000, hitter('2B')),
      player('3B1', 1_000, hitter('3B')),
      player('SS1', 1_000, hitter('SS')),
      player('LF1', 1_000, hitter('LF')),
      player('CF1', 1_000, hitter('CF')),
      player('RF1', 1_000, hitter('RF')),
      player('C2', 1_000, hitter('C')),
      player('B1', 1_000, hitter('1B')),
      player('B2', 1_000, hitter('2B')),
      player('B3', 1_000, hitter('RF')),
      player('SP1', 1_000, pitcher('SP')),
      player('SP2', 1_000, pitcher('SP')),
      player('SP3', 1_000, pitcher('SP')),
      player('SP4', 1_000, pitcher('SP')),
      player('RP1', 1_000, pitcher('RP')),
      player('RP2', 1_000, pitcher('RP')),
      player('RP3', 1_000, pitcher('RP')),
      player('CP1', 1_000, pitcher('CP')),
    ];
    const candidate = player('bench-candidate', 75_000, hitter('3B'));
    const remaining = [
      player('cheap-bench', 40_000, hitter('LF')),
      player('expensive-bench', 60_000, hitter('CF')),
    ];

    const result = maxLegalBidForPlayer(
      team('t1', 100_000, roster),
      candidate,
      remaining,
      BASE_CONFIG,
    );

    expect(result.feasible).toBe(true);
    expect(result.completionCost).toBe(40_000);
    expect(result.maxBid).toBe(60_000);
  });

  test('max legal bid is infeasible when completion is unaffordable even at zero price', () => {
    const roster = nearlyCompleteRoster();
    const candidate = player('needed-ss', 20_000, hitter('SS'));
    const remaining = [player('last-bench', 80_000, hitter('LF'))];

    const result = maxLegalBidForPlayer(
      team('t1', 40_000, roster),
      candidate,
      remaining,
      { ...BASE_CONFIG, reserveFractionK: 1 },
    );

    expect(result.feasible).toBe(false);
    expect(result.maxBid).toBe(0);
    expect(result.completionCost).toBe(80_000);
  });

  test('completion diagnostics report missing legal roles instead of silently repairing', () => {
    const roster = nearlyCompleteRoster().map(entry);
    const value = cheapestLegalCompletionCost(
      roster,
      [player('not-a-shortstop', 10_000, hitter('LF'))],
      1_000_000,
      BASE_CONFIG,
    );

    expect(value.feasible).toBe(false);
    expect(value.warnings.some((warning) => warning.includes('SIM_SHORTFALL missing primary SS'))).toBe(true);
  });

  test('quality-adjusted completion uses numeric grades and reports below-target risk', () => {
    const roster = nearlyCompleteRoster();
    const remaining = [
      player('low-grade-ss', 20_000, hitter('SS'), 'C'),
      player('core-bench', 20_000, hitter('LF'), 'B+'),
    ];
    const quality = qualityAdjustedCompletionCost(roster, remaining, 500_000, {
      ...BASE_CONFIG,
      reserveFractionK: 0,
      autoFillPriceMode: 'zero',
      qualityCompletionTargetPercentile: 0.5,
    });

    expect(quality.feasible).toBe(true);
    expect(quality.cheapestLegalCompletionCost).toBe(0);
    expect(quality.qualityAdjustedCompletionCost).toBeGreaterThan(quality.cheapestLegalCompletionCost);
    expect(quality.belowTargetPickCount).toBeGreaterThan(0);
    expect(quality.warnings.some((warning) => warning.includes('SIM_QUALITY_SHORTFALL'))).toBe(true);
  });
});

describe('auctionSim clearing', () => {
  test('highest WTP wins and pays one increment over the runner-up when possible', () => {
    const config: AuctionSimConfig = {
      ...BASE_CONFIG,
      rosterSize: 1,
      reserveFractionK: 0.2,
      biddingPolicy: 'naive',
    };
    const target = player('target', 100_000);
    const result = clearAuctionLot(
      target,
      [team('t1', 70_000), team('t2', 55_000), team('t3', 10_000)],
      [],
      config,
    );

    expect(result.disposition).toBe('sold');
    expect(result.winnerTeamId).toBe('t1');
    expect(result.reserve).toBe(20_000);
    expect(result.price).toBe(56_000);
  });

  test('clearing does not sell when the winner cannot afford completion', () => {
    const config: AuctionSimConfig = {
      ...BASE_CONFIG,
      reserveFractionK: 1,
      biddingPolicy: 'rationalBaseline',
    };
    const result = clearAuctionLot(
      player('needed-ss', 20_000, hitter('SS')),
      [team('t1', 40_000, nearlyCompleteRoster())],
      [player('last-bench', 80_000, hitter('LF'))],
      config,
    );

    expect(result.disposition).toBe('unsold');
    expect(result.winnerTeamId).toBeNull();
    expect(result.bids[0].eligible).toBe(false);
  });

  test('reserve runs report zero below-reserve sales and flag no invariant when prices clear at reserve or higher', () => {
    const result = simulateAuction(
      [
        player('target-a', 100_000, undefined, 'A'),
        player('target-b', 80_000, undefined, 'B+'),
      ],
      [team('t1', 1_000_000), team('t2', 1_000_000)],
      {
        ...BASE_CONFIG,
        rosterSize: 1,
        reserveFractionK: 0.65,
        autoFillPriceMode: 'reserve',
        biddingPolicy: 'naive',
      },
    );

    const sold = result.pickLog.filter((entry) => entry.disposition === 'sold');
    expect(sold.length).toBeGreaterThan(0);
    for (const entry of sold) {
      expect(entry.price).not.toBeNull();
      expect(entry.price!).toBeGreaterThanOrEqual(entry.reserve);
    }
    expect(result.economyDiagnostics.belowReserveSaleCount).toBe(0);
    expect(
      result.economyDiagnostics.invariantFailures.filter(
        (failure) => failure.invariantName === 'soldBelowReserve',
      ),
    ).toEqual([]);
  });
});

describe('auctionSim auto-fill', () => {
  test('zero mode charges nothing; reserve mode charges each player reserve', () => {
    const pool = [player('p1', 10_000), player('p2', 20_000)];
    const zero = simulateAuction(pool, [{ teamId: 't1' }], {
      ...BASE_CONFIG,
      rosterSize: 2,
      maxLots: 0,
      reserveFractionK: 0.5,
      autoFillPriceMode: 'zero',
    });
    const reserve = simulateAuction(pool, [{ teamId: 't1' }], {
      ...BASE_CONFIG,
      rosterSize: 2,
      maxLots: 0,
      reserveFractionK: 0.5,
      autoFillPriceMode: 'reserve',
    });

    expect(zero.autoFillLog.map((row) => row.price)).toEqual([0, 0]);
    expect(reserve.autoFillLog.map((row) => row.price)).toEqual([5_000, 10_000]);
    expect(reserve.economyDiagnostics.paidAutoFillCount).toBe(2);
  });

  test('auto-fill does not silently repair an impossible legal completion', () => {
    const noShortstopPool = [
      player('C1', 10_000, hitter('C')),
      player('1B1', 10_000, hitter('1B')),
      player('2B1', 10_000, hitter('2B')),
      player('3B1', 10_000, hitter('3B')),
      player('LF1', 10_000, hitter('LF')),
      player('CF1', 10_000, hitter('CF')),
      player('RF1', 10_000, hitter('RF')),
      player('C2', 10_000, hitter('C')),
      player('SP1', 10_000, pitcher('SP')),
      player('SP2', 10_000, pitcher('SP')),
      player('SP3', 10_000, pitcher('SP')),
      player('SP4', 10_000, pitcher('SP')),
      player('RP1', 10_000, pitcher('RP')),
      player('RP2', 10_000, pitcher('RP')),
      player('RP3', 10_000, pitcher('RP')),
      player('CP1', 10_000, pitcher('CP')),
    ];
    const result = simulateAuction(noShortstopPool, [{ teamId: 't1' }], {
      ...BASE_CONFIG,
      maxLots: 0,
      reserveFractionK: 0,
      autoFillPriceMode: 'zero',
    });

    expect(result.autoFillLog).toEqual([]);
    expect(result.rosters.t1).toHaveLength(0);
    expect(result.economyDiagnostics.invariantFailures).toEqual([]);
    expect(result.economyDiagnostics.finalCompletionSurplusRatio).toBeLessThan(0);
  });
});

describe('auctionSim marginal value V1', () => {
  test('economy adapter keeps salary, reserve, base value, grade, and tax concepts separate', () => {
    const adapted = adaptEconomyPlayer(
      {
        ...player('explicit', 80_000, hitter('SS'), 'B+'),
        salary: 44_000,
        capHit: 45_000,
        baseValue: 82_000,
      },
      BASE_CONFIG,
      { archetypeAdjustedValue: 90_000, auctionPrice: 51_000 },
    );

    expect(adapted.salary).toBe(44_000);
    expect(adapted.capHit).toBe(45_000);
    expect(adapted.baseValue).toBe(82_000);
    expect(adapted.archetypeAdjustedValue).toBe(90_000);
    expect(adapted.auctionPrice).toBe(51_000);
    expect(adapted.reservePrice).toBe(80_000);
    expect(adapted.numericGrade).toBe(75);
    expect(adapted.letterGrade).toBe('B+');
    expect(adapted.taxExposure).toBeNull();
  });

  test('completion value reports impossible legal completion without silent repair', () => {
    const roster = nearlyCompleteRoster().map(entry);
    const noShortstopPool = [
      player('bench-only', 30_000, hitter('1B')),
      player('arm-only', 30_000, pitcher('RP')),
    ];

    const quote = cheapestLegalCompletionCost(roster, noShortstopPool, 500_000, BASE_CONFIG);

    expect(quote.feasible).toBe(false);
    expect(quote.pickIds).toEqual([]);
    expect(quote.warnings.some((warning) => warning.includes('no verified legal completion'))).toBe(true);
  });

  test('position-aware marginal value favors a hard-need player over a blocked duplicate', () => {
    const roster = nearlyCompleteRoster();
    const currentTeam = team('t1', 500_000, roster);
    const neededShortstop = player('needed-ss', 55_000, hitter('SS'));
    const blockedFirstBase = player('blocked-1b', 55_000, hitter('1B'));
    const filler = player('filler', 10_000, hitter('LF'));

    const ssBid = evaluateMarginalValueBid(
      neededShortstop,
      currentTeam,
      [blockedFirstBase, filler],
      { ...BASE_CONFIG, reserveFractionK: 0, biddingPolicy: 'marginalValueV1' },
    );
    const blockedBid = evaluateMarginalValueBid(
      blockedFirstBase,
      currentTeam,
      [neededShortstop, filler],
      { ...BASE_CONFIG, reserveFractionK: 0, biddingPolicy: 'marginalValueV1' },
    );

    expect(ssBid.eligible).toBe(true);
    expect(ssBid.wtp).toBeGreaterThan(blockedBid.wtp);
  });

  test('best projected completion value is reserve-aware and preserves completion surplus', () => {
    const roster = [
      ...nearlyCompleteRoster(),
      player('SS1', 10_000, hitter('SS')),
    ].map(entry);
    const teamState = team('t1', 500_000, roster.map((row) => ({
      playerId: row.playerId,
      iv: row.iv,
      grade: row.grade,
      numericGrade: row.numericGrade ?? undefined,
      pos: row.pos,
    })));
    const completion = bestProjectedCompletionValue(
      roster,
      500_000,
      [player('last-bench', 100_000, hitter('RF'))],
      { ...BASE_CONFIG, reserveFractionK: 0.5 },
      teamState,
    );

    expect(completion.feasible).toBe(true);
    expect(completion.completionCost).toBe(50_000);
    expect(completion.completionSurplus).toBe(450_000);
    expect(completion.selectedPlayerIds).toEqual(['last-bench']);
  });

  test('marginalValueV1 simulation is deterministic under the same seed', () => {
    const pool = [
      player('p1', 90_000, undefined, 'A'),
      player('p2', 80_000, undefined, 'B+'),
      player('p3', 70_000, undefined, 'B-'),
      player('p4', 60_000, undefined, 'C+'),
      player('p5', 50_000, undefined, 'C'),
      player('p6', 40_000, undefined, 'D+'),
    ];
    const config = {
      ...BASE_CONFIG,
      rosterSize: 3,
      reserveFractionK: 0.25,
      seed: 'marginal-same',
      biddingPolicy: 'marginalValueV1' as const,
    };

    const first = simulateAuction(pool, [{ teamId: 't1' }, { teamId: 't2' }], config);
    const second = simulateAuction(pool, [{ teamId: 't1' }, { teamId: 't2' }], config);

    expect(first.pickLog).toEqual(second.pickLog);
    expect(first.rosters).toEqual(second.rosters);
  });

  test('marginalValueV2Liquidity lowers WTP when early quality liquidity is at risk', () => {
    const target = player('early-star', 300_000, undefined, 'A');
    const remaining = [
      player('core-1', 120_000, undefined, 'B-'),
      player('core-2', 120_000, undefined, 'B-'),
    ];
    const currentTeam = team('t1', 500_000);
    const sharedConfig: AuctionSimConfig = {
      ...BASE_CONFIG,
      teamCount: 1,
      rosterSize: 3,
      budgetPerTeam: 500_000,
      reserveFractionK: 0,
      autoFillPriceMode: 'zero',
      spotBudgetCheckpoint: 2,
      completionSearchMode: 'beam',
      rosterProjectionMode: 'completionQuote',
      marginalBidSearchMode: 'singlePass',
      qualityCompletionTargetPercentile: 0.5,
      targetSpot11CashRatio: 0.40,
      minQualitySurplusRatio: 0.20,
      openSlotPenaltyExponent: 1.25,
    };

    const v1 = evaluateMarginalValueBid(target, currentTeam, remaining, {
      ...sharedConfig,
      biddingPolicy: 'marginalValueV1',
      liquidityPenaltyWeight: 0,
    });
    const v2 = evaluateMarginalValueV2LiquidityBid(target, currentTeam, remaining, {
      ...sharedConfig,
      biddingPolicy: 'marginalValueV2Liquidity',
      liquidityPenaltyWeight: 1,
    });

    expect(v1.eligible).toBe(true);
    expect(v2.eligible).toBe(true);
    expect(v2.wtp).toBeLessThan(v1.wtp);
    expect(v2.liquidityAudit?.liquidityCapApplied).toBe(true);
    expect(v2.liquidityAudit?.liquidityPenaltyShape).toBe('linear');
    expect(v2.modelWarnings?.some((warning) => warning.includes('single-pass liquidity WTP'))).toBe(true);
  });

  test('marginalValueV2Liquidity reports V1 WTP reduction and alternative penalty shape', () => {
    const target = player('early-star', 300_000, undefined, 'A');
    const remaining = [
      player('core-1', 120_000, undefined, 'B-'),
      player('core-2', 120_000, undefined, 'B-'),
    ];
    const currentTeam = team('t1', 500_000);
    const sharedConfig: AuctionSimConfig = {
      ...BASE_CONFIG,
      teamCount: 1,
      rosterSize: 3,
      budgetPerTeam: 500_000,
      reserveFractionK: 0,
      autoFillPriceMode: 'zero',
      spotBudgetCheckpoint: 2,
      completionSearchMode: 'beam',
      rosterProjectionMode: 'completionQuote',
      marginalBidSearchMode: 'singlePass',
      qualityCompletionTargetPercentile: 0.5,
      targetSpot11CashRatio: 0.40,
      minQualitySurplusRatio: 0.20,
      openSlotPenaltyExponent: 1.25,
      liquidityPenaltyShape: 'softplus',
    };

    const v1 = evaluateMarginalValueBid(target, currentTeam, remaining, {
      ...sharedConfig,
      biddingPolicy: 'marginalValueV1',
      liquidityPenaltyWeight: 0,
    });
    const v2 = evaluateMarginalValueV2LiquidityBid(target, currentTeam, remaining, {
      ...sharedConfig,
      biddingPolicy: 'marginalValueV2Liquidity',
      liquidityPenaltyWeight: 0.75,
    }, v1.wtp);

    expect(v2.liquidityAudit?.liquidityPenaltyShape).toBe('softplus');
    expect(v2.wtpReductionVsV1).toBe(v1.wtp - v2.wtp);
    expect(v2.liquidityRosterSlotNumber).toBe(1);
    expect(v2.passLiquidityAudit?.openSlotPressure).toBeGreaterThan(0);
  });
});

describe('auctionSim determinism and metrics', () => {
  test('same seed and inputs return identical pick logs and diagnostics', () => {
    const pool = [
      player('p1', 90_000, undefined, 'A'),
      player('p2', 80_000, undefined, 'B+'),
      player('p3', 70_000, undefined, 'B-'),
      player('p4', 60_000, undefined, 'C+'),
      player('p5', 50_000, undefined, 'C'),
      player('p6', 40_000, undefined, 'D+'),
    ];
    const config = { ...BASE_CONFIG, rosterSize: 3, reserveFractionK: 0.4, seed: 'same' };
    const first = simulateAuction(pool, [{ teamId: 't1' }, { teamId: 't2' }], config);
    const second = simulateAuction(pool, [{ teamId: 't1' }, { teamId: 't2' }], config);

    expect(first.pickLog).toEqual(second.pickLog);
    expect(first.economyDiagnostics).toEqual(second.economyDiagnostics);
  });

  test('pool and economy metrics include grade histogram, spot-11 budget, auto-fill, and strength spread', () => {
    const pool = [
      player('elite', 100_000, undefined, 'A'),
      player('strong', 70_000, undefined, 'B+'),
      player('core-1', 45_000, undefined, 'B-'),
      player('core-2', 40_000, undefined, 'C+'),
      player('filler', 5_000, undefined, 'D+'),
    ];
    const metrics = buildPoolMetrics(pool, 3);
    expect(metrics.gradeBandCounts).toEqual({ elite: 1, strong: 1, core: 2, filler: 1 });
    expect(metrics.highTailShare).toBeCloseTo(0.2);
    expect(metrics.middleMassShare).toBeCloseTo(0.6);

    const fillPool = Array.from({ length: 12 }, (_, index) => player(`p${index}`, 10_000 + index));
    const result = simulateAuction(fillPool, [{ teamId: 't1' }], {
      ...BASE_CONFIG,
      rosterSize: 12,
      maxLots: 0,
      autoFillPriceMode: 'zero',
      spotBudgetCheckpoint: 11,
    });

    expect(result.economyDiagnostics.medianBudgetRemainingAtRosterSpot11Ratio).toBe(1);
    expect(result.economyDiagnostics.autoFillCount).toBe(12);
    expect(result.rosterStrengthMetrics.rosterStrengthSpread).toBe(0);
  });
});
