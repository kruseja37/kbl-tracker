import { describe, expect, test } from 'vitest';

import {
  buildArchetypeLiftTable,
  estimateMarket,
  leagueScarcityMultiplier,
  nominationOdds,
  ownNeedMultiplier,
  projectBidVsPass,
  shillFitMixture,
  uniformShillPrior,
  MARKET_TUNING,
  type MarketBidderView,
  type MarketLotView,
} from '../auctionMarketModel';
import { rosterNeedBreakdown } from '../rosterNeed';
import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import {
  advanceLot,
  claimLoneSurvivor,
  initAuctionSession,
  passBid,
  recordBid,
  resolveLot,
  surfaceNextPlayer,
  type AuctionSession,
} from '../auctionStateMachine';
import type { Band } from '../leagueConstruction';

const TABLE = buildArchetypeLiftTable();

const POWER_PLAYER: Record<Band, number> = {
  Power: 1, Contact: 0.2, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0,
};

function bidder(overrides: Partial<MarketBidderView> & { teamId: string }): MarketBidderView {
  return {
    kind: 'cpu',
    slotsRemaining: 5,
    maxBid: 1_000_000,
    bandPriorities: null,
    personality: null,
    needMultiplier: 1,
    wouldStrand: false,
    ...overrides,
  };
}

function lotView(overrides: Partial<MarketLotView>): MarketLotView {
  return {
    playerId: 'target',
    iv: 50_000,
    bandWeights: null,
    openingAsk: 20_000,
    bidIncrement: 1_000,
    bidders: [],
    advisedTeamId: null,
    openSlotsTotal: 40,
    availablePlayerCount: 100,
    ...overrides,
  };
}

describe('estimateMarket — the Second-Price core', () => {
  test('median = ask + shrink × (second price − ask); low anchors at the ask floor', () => {
    const view = lotView({
      bidders: [
        bidder({ teamId: 't1', needMultiplier: 1.2 }), // 60k
        bidder({ teamId: 't2' }),                       // 50k — the runner-up sets the clearing gap
        bidder({ teamId: 't3', needMultiplier: 0.9 }),  // 45k — irrelevant to the clearing point
      ],
    });
    const market = estimateMarket(view, TABLE);
    // gap 30k over a 1k increment saturates the step factor → shrink = base + stepWeight.
    const shrink = MARKET_TUNING.shrinkBase + MARKET_TUNING.shrinkStepWeight;
    expect(market.band.median).toBeCloseTo(20_000 + shrink * 30_000, 6);
    expect(market.band.low).toBe(20_000); // no lot can clear below its ask
    expect(market.interestedTeams).toBe(3);
    expect(market.likelyPass).toBe(false);
    expect(market.band.high).toBeGreaterThan(market.band.median);
  });

  test('solvency clamps the runner-up to his ceiling, shrinking the clearing gap', () => {
    const clamped = estimateMarket(
      lotView({
        bidders: [
          bidder({ teamId: 't1', needMultiplier: 1.2 }),
          bidder({ teamId: 't2', maxBid: 30_000 }), // wants 50k, can pay 30k
        ],
      }),
      TABLE,
    );
    const rich = estimateMarket(
      lotView({
        bidders: [bidder({ teamId: 't1', needMultiplier: 1.2 }), bidder({ teamId: 't2' })],
      }),
      TABLE,
    );
    // The clamped runner-up drops at his CEILING, not his wish → a cheaper predicted clearing.
    expect(clamped.band.median).toBeLessThan(rich.band.median);
    const shrink =
      MARKET_TUNING.shrinkBase +
      MARKET_TUNING.shrinkStepWeight * Math.min(1, 10 / MARKET_TUNING.stepNorm);
    expect(clamped.band.median).toBeCloseTo(20_000 + shrink * 10_000, 6);
  });

  test('one suitor clears at the ask; zero suitors flags a likely pass', () => {
    const solo = estimateMarket(lotView({ bidders: [bidder({ teamId: 't1' })] }), TABLE);
    expect(solo.band.median).toBe(20_000);
    expect(solo.likelyPass).toBe(false);

    const nobody = estimateMarket(
      lotView({ bidders: [bidder({ teamId: 't1', maxBid: 5_000 })] }),
      TABLE,
    );
    expect(nobody.likelyPass).toBe(true);
    expect(nobody.band.median).toBe(20_000);
  });

  test('stranding and full teams are never suitors', () => {
    const view = lotView({
      bidders: [
        bidder({ teamId: 't1', wouldStrand: true }),
        bidder({ teamId: 't2', slotsRemaining: 0 }),
        bidder({ teamId: 't3' }),
      ],
    });
    expect(estimateMarket(view, TABLE).interestedTeams).toBe(1);
  });

  test('CONTESTED fires on 2+ near-top rivals, excludes the advised GM, and never leaks a number', () => {
    const view = lotView({
      advisedTeamId: 'me',
      bidders: [
        bidder({ teamId: 'me', needMultiplier: 1.2 }),
        bidder({ teamId: 'r1', needMultiplier: 1.18 }),
        bidder({ teamId: 'r2', needMultiplier: 1.15 }),
        bidder({ teamId: 'r3', needMultiplier: 0.5 }), // far from the top
      ],
    });
    const market = estimateMarket(view, TABLE);
    expect(market.contested).not.toBeNull();
    expect(market.contested!.rivalCount).toBe(2);
    expect(market.contested!.message).toBe(
      '2 other teams also want this profile — expect near-ceiling, or plan a fallback',
    );
    // Privacy by construction: the signal exposes exactly a count and a message.
    expect(Object.keys(market.contested!).sort()).toEqual(['message', 'rivalCount']);

    const lonely = estimateMarket(
      lotView({
        advisedTeamId: 'me',
        bidders: [bidder({ teamId: 'me', needMultiplier: 1.2 }), bidder({ teamId: 'r1' })],
      }),
      TABLE,
    );
    expect(lonely.contested).toBeNull();
  });

  test('shill uncertainty widens the band (distribution, not a fixed extra bidder)', () => {
    const noShill = estimateMarket(
      lotView({
        bandWeights: POWER_PLAYER,
        bidders: [bidder({ teamId: 't1' }), bidder({ teamId: 't2' })],
      }),
      TABLE,
    );
    const withShill = estimateMarket(
      lotView({
        bandWeights: POWER_PLAYER,
        bidders: [bidder({ teamId: 't1' }), bidder({ teamId: 't2' }), bidder({ teamId: 's1', kind: 'shill' })],
      }),
      TABLE,
    );
    const rel = (m: typeof noShill) => (m.band.high - m.band.low) / m.band.median;
    expect(rel(withShill)).toBeGreaterThan(rel(noShill));
  });

  test('determinism: identical inputs give identical bands', () => {
    const view = lotView({
      bandWeights: POWER_PLAYER,
      bidders: [bidder({ teamId: 't1' }), bidder({ teamId: 's1', kind: 'shill' })],
    });
    expect(estimateMarket(view, TABLE)).toEqual(estimateMarket(view, TABLE));
  });
});

describe('shill mixture over the 24 archetypes', () => {
  test('a power-heavy player draws a different expected fit than a neutral one, with real spread', () => {
    const mix = shillFitMixture(POWER_PLAYER, TABLE);
    expect(mix.sigma).toBeGreaterThan(0);
    expect(mix.mean).toBeGreaterThan(0.8);
    expect(mix.mean).toBeLessThan(1.2);
  });

  test('the uniform prior covers all 24 archetypes and sums to 1', () => {
    const prior = uniformShillPrior('s1');
    expect(prior.archetypePrior).toHaveLength(24);
    const total = prior.archetypePrior.reduce((sum, entry) => sum + entry.p, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe('needMultiplier building blocks', () => {
  const catcher: RosterSlotPlayer = { isPitcher: false, position: 'C', secondaryPosition: null };

  test('a player filling a hard requirement scores above the merely-eligible 1.0', () => {
    const need = rosterNeedBreakdown([]); // empty roster: everything is a requirement
    expect(ownNeedMultiplier(need, catcher, 22)).toBeGreaterThan(1);
    expect(ownNeedMultiplier(null, catcher, 22)).toBe(1);
    expect(ownNeedMultiplier(need, null, 22)).toBe(1);
  });

  test('league scarcity clamps around the neutral suitors-per-player ratio', () => {
    expect(leagueScarcityMultiplier(8, 2)).toBe(MARKET_TUNING.scarcityMax);
    expect(leagueScarcityMultiplier(0, 10)).toBe(MARKET_TUNING.scarcityMin);
    expect(leagueScarcityMultiplier(1, 2)).toBe(1); // 0.5 suitors per player = neutral
  });

  test('C2B-FIX F2: a pure SP does not fill a generic bullpen deficit; relief classes do', () => {
    const arm = (role: string): RosterSlotPlayer => ({ isPitcher: true, position: 'P', role });
    // 4 SP + 2 RP + 1 CP: the only remaining arm requirement is ONE reliever (bullpen class).
    const need = rosterNeedBreakdown([
      arm('SP'), arm('SP'), arm('SP'), arm('SP'), arm('RP'), arm('RP'), arm('CP'),
    ]);
    expect(need.pitcherNeed).toBe(1);
    expect(need.rotationDeficit).toBe(0);
    expect(need.bullpenDeficit).toBe(1);
    expect(need.closerDeficit).toBe(0);
    expect(need.pitcherFloorNeed).toBe(0);
    // Off-class SP: merely eligible (1.0). On-class RP/CP and the flexible swing: hard-need.
    expect(ownNeedMultiplier(need, arm('SP'), 22)).toBe(1);
    expect(ownNeedMultiplier(need, arm('RP'), 22)).toBeGreaterThan(1);
    expect(ownNeedMultiplier(need, arm('CP'), 22)).toBeGreaterThan(1);
    expect(ownNeedMultiplier(need, arm('SP/RP'), 22)).toBeGreaterThan(1);
  });

  test('a closer-only deficit values CP but not substitutable RP or SP/RP arms', () => {
    const arm = (role: string): RosterSlotPlayer => ({ isPitcher: true, position: 'P', role });
    const need = rosterNeedBreakdown([
      arm('SP'), arm('SP'), arm('SP'), arm('SP'), arm('RP'), arm('RP'), arm('RP'), arm('RP'),
    ]);

    expect(need.pitcherNeed).toBe(1);
    expect(need.rotationDeficit).toBe(0);
    expect(need.bullpenDeficit).toBe(0);
    expect(need.closerDeficit).toBe(1);
    expect(ownNeedMultiplier(need, arm('SP'), 22)).toBe(1);
    expect(ownNeedMultiplier(need, arm('RP'), 22)).toBe(1);
    expect(ownNeedMultiplier(need, arm('SP/RP'), 22)).toBe(1);
    expect(ownNeedMultiplier(need, arm('CP'), 22)).toBeGreaterThan(1);
  });

  test('C2B-FIX F2: a swing-shared deficit keeps BOTH pure classes as hard-need (delta-exact)', () => {
    const arm = (role: string): RosterSlotPlayer => ({ isPitcher: true, position: 'P', role });
    // 3 SP + 2 RP + 1 CP + 1 SP/RP: one more arm of EITHER pure class frees the swing for the
    // other side, so adding either strictly reduces the remaining arm minimum.
    const need = rosterNeedBreakdown([
      arm('SP'), arm('SP'), arm('SP'), arm('RP'), arm('RP'), arm('CP'), arm('SP/RP'),
    ]);
    expect(need.pitcherNeed).toBe(1);
    expect(need.closerDeficit).toBe(0);
    expect(ownNeedMultiplier(need, arm('SP'), 22)).toBeGreaterThan(1);
    expect(ownNeedMultiplier(need, arm('RP'), 22)).toBeGreaterThan(1);
  });
});

describe('nomination-timing odds', () => {
  const pool = [
    { playerId: 'star', ivPercentile: 95 },
    { playerId: 'mid', ivPercentile: 50 },
    { playerId: 'scrub', ivPercentile: 5 },
  ];

  test('pNext follows the engine weighting law and sums to 1 across the pool', () => {
    const odds = nominationOdds(['star', 'mid', 'scrub'], pool, 2, 1);
    expect(odds[0].pNext).toBeGreaterThan(odds[1].pNext);
    expect(odds[1].pNext).toBeGreaterThan(odds[2].pNext);
    const total = odds.reduce((sum, o) => sum + o.pNext, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  test('pWithin grows with the horizon and unknown targets get zero', () => {
    const short = nominationOdds(['star'], pool, 2, 1)[0];
    const long = nominationOdds(['star'], pool, 2, 3)[0];
    expect(long.pWithin).toBeGreaterThanOrEqual(short.pWithin);
    expect(nominationOdds(['ghost'], pool, 2, 2)[0]).toEqual({ playerId: 'ghost', pNext: 0, pWithin: 0 });
  });
});

// ---------------------------------------------------------------------------------------------
// Bid-log infra (audit AUC-3): recorded end-to-end through a real machine drive.
// ---------------------------------------------------------------------------------------------

function drive(result: { ok: boolean; session: AuctionSession }): AuctionSession {
  expect(result.ok).toBe(true);
  return result.session;
}

describe('bid-log infra (AUC-3)', () => {
  test('bids and passes land in the lot log; the sold result carries bidderSet/underbidder/numBidders', () => {
    let session = initAuctionSession({
      teams: [
        { teamId: 'alpha', budgetRemaining: 500_000, rosterSlotsRemaining: 3 },
        { teamId: 'beta', budgetRemaining: 500_000, rosterSlotsRemaining: 3 },
        { teamId: 'gamma', budgetRemaining: 500_000, rosterSlotsRemaining: 3 },
      ],
      players: [
        { playerId: 'p1', iv: 40_000, ivPercentile: 80 },
        { playerId: 'p2', iv: 30_000, ivPercentile: 50 },
        { playerId: 'p3', iv: 20_000, ivPercentile: 20 },
      ],
      nominationOrder: ['alpha', 'beta', 'gamma'],
      config: { bidIncrement: 1_000, nominationOrderSeed: 'bidlog' },
    });

    session = drive(surfaceNextPlayer(session));
    const ask = session.currentLot!.openingAsk;
    const first = session.currentLot!.bidTurnTeamId!;
    const others = session.currentLot!.stillIn.filter((id) => id !== first);

    session = drive(recordBid(session, first, ask));
    session = drive(recordBid(session, others[0], ask + 1_000));
    session = drive(passBid(session, others[1]));
    session = drive(passBid(session, first));

    expect(session.currentLot!.bidLog).toEqual([
      { teamId: first, action: 'bid', amount: ask },
      { teamId: others[0], action: 'bid', amount: ask + 1_000 },
      { teamId: others[1], action: 'pass', amount: null },
      { teamId: first, action: 'pass', amount: null },
    ]);

    session = drive(resolveLot(session));
    const result = session.results.at(-1)!;
    expect(result.disposition).toBe('SOLD');
    expect(result.winnerTeamId).toBe(others[0]);
    expect(result.bidderSet).toEqual([first, others[0]]);
    expect(result.underbidder).toBe(first);
    expect(result.numBidders).toBe(2);
  });

  test('a lone-survivor claim logs the claim and produces a no-underbidder result', () => {
    let session = initAuctionSession({
      teams: [
        { teamId: 'alpha', budgetRemaining: 500_000, rosterSlotsRemaining: 2 },
        { teamId: 'beta', budgetRemaining: 500_000, rosterSlotsRemaining: 2 },
      ],
      players: [
        { playerId: 'p1', iv: 40_000, ivPercentile: 80 },
        { playerId: 'p2', iv: 30_000, ivPercentile: 50 },
        { playerId: 'p3', iv: 20_000, ivPercentile: 20 },
        { playerId: 'p4', iv: 10_000, ivPercentile: 10 },
      ],
      nominationOrder: ['alpha', 'beta'],
      config: { bidIncrement: 1_000, nominationOrderSeed: 'bidlog-claim' },
    });

    session = drive(surfaceNextPlayer(session));
    const survivor = session.currentLot!.stillIn[0];
    const quitter = session.currentLot!.stillIn[1];
    session = drive(passBid(session, quitter));
    session = drive(resolveLot(session));
    expect(session.pendingClaim?.teamId).toBe(survivor);
    session = drive(claimLoneSurvivor(session));

    const result = session.results.at(-1)!;
    expect(result.disposition).toBe('SOLD');
    expect(result.bidderSet).toEqual([survivor]);
    expect(result.underbidder).toBeNull();
    expect(result.numBidders).toBe(1);
    session = drive(advanceLot(session));
    expect(session.state).toBe('NOMINATION');
  });
});

// ---------------------------------------------------------------------------------------------
// Bid-vs-pass — the deterministic re-projection.
// ---------------------------------------------------------------------------------------------

describe('projectBidVsPass', () => {
  test('bid branch spends the money; pass branch keeps it; both stay deterministic', () => {
    let session = initAuctionSession({
      teams: [
        { teamId: 'me', budgetRemaining: 300_000, rosterSlotsRemaining: 4 },
        { teamId: 'rival', budgetRemaining: 300_000, rosterSlotsRemaining: 4 },
      ],
      players: [
        { playerId: 'p1', iv: 40_000, ivPercentile: 90 },
        { playerId: 'p2', iv: 30_000, ivPercentile: 60 },
        { playerId: 'p3', iv: 20_000, ivPercentile: 30 },
        { playerId: 'p4', iv: 10_000, ivPercentile: 10 },
      ],
      nominationOrder: ['me', 'rival'],
      config: { bidIncrement: 1_000, nominationOrderSeed: 'bvp' },
    });
    session = drive(surfaceNextPlayer(session));

    const input = {
      session,
      options: { shillTeamIds: new Set<string>() },
      teamId: 'me',
      bidAmount: 25_000,
      ownBandPriorities: {
        Power: 1, Contact: 0.5, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0,
      },
      topN: 3,
    };
    const projection = projectBidVsPass(input);
    expect(projection).not.toBeNull();
    expect(projection!.bid.budgetAfter).toBe(275_000);
    expect(projection!.pass.budgetAfter).toBe(300_000);
    expect(projection!.bid.targets.length).toBeGreaterThan(0);
    for (const branch of [projection!.bid, projection!.pass]) {
      const surpluses = branch.targets.map((t) => t.surplus);
      expect([...surpluses].sort((l, r) => r - l)).toEqual(surpluses);
    }
    expect(projectBidVsPass(input)).toEqual(projection);
  });

  test('C2B-FIX F3: a target the GM cannot legally sign never surfaces on that branch', () => {
    // 21-man enriched roster: 14 hitters (2 C-coverers) + 7 arms (4 SP + 3 RP, no CP). One slot
    // left, and it must be a closer — a 15th BAT would breach the 14-hitter ceiling on every branch,
    // and on the BID branch (roster full) nothing at all is signable.
    const hitter = (position: string, secondaryPosition: string | null = null): RosterSlotPlayer =>
      ({ isPitcher: false, position, secondaryPosition });
    const arm = (role: string): RosterSlotPlayer => ({ isPitcher: true, position: 'P', role });
    const rosterShapes: RosterSlotPlayer[] = [
      hitter('C'), hitter('1B'), hitter('2B'), hitter('3B'), hitter('SS'),
      hitter('LF'), hitter('CF'), hitter('RF'), hitter('C', '1B'),
      hitter('1B'), hitter('2B'), hitter('LF'), hitter('CF'), hitter('SS'),
      arm('SP'), arm('SP'), arm('SP'), arm('SP'), arm('RP'), arm('RP'), arm('RP'),
    ];
    const rosterIds = rosterShapes.map((_, i) => `r-${i}`);
    const mk = (playerId: string, pos: RosterSlotPlayer) =>
      ({ playerId, iv: 20_000, ivPercentile: 50, pos });
    const players = Object.fromEntries([
      ...rosterShapes.map((shape, i) => [`r-${i}`, mk(`r-${i}`, shape)] as const),
      ['lot-cp', mk('lot-cp', arm('CP'))] as const,
      ['target-bat', mk('target-bat', hitter('2B', 'IF'))] as const,
      ['target-cp', mk('target-cp', arm('CP'))] as const,
      ['target-rp', mk('target-rp', arm('RP'))] as const,
    ]);
    const session: AuctionSession = {
      state: 'OPEN_BIDDING',
      config: {
        format: 'auction',
        bidIncrement: 1_000,
        turnTimerSeconds: null,
        nominationOrderSeed: 'f3-legality',
        flatReserveFloor: 10_000,
        cpuShillCount: 0,
        excludeFromLeague: true,
      },
      teams: [
        {
          teamId: 'me',
          budgetRemaining: 100_000,
          rosterSlotsRemaining: 1,
          minSalary: 1_666.49,
          projectedTax: 0,
          roster: rosterIds.map((playerId) => ({ playerId, salary: 5_000 })),
        },
        {
          teamId: 'rival',
          budgetRemaining: 100_000,
          rosterSlotsRemaining: 1,
          minSalary: 1_666.49,
          projectedTax: 0,
          roster: [],
        },
      ],
      nominationOrder: ['me', 'rival'],
      nominationIndex: 0,
      nominationRound: 0,
      players,
      playerOrder: Object.keys(players),
      availablePlayerIds: ['target-bat', 'target-cp', 'target-rp'],
      currentLot: {
        playerId: 'lot-cp',
        nominatorTeamId: 'me',
        openingAsk: 10_000,
        highBid: null,
        highBidder: null,
        stillIn: ['me', 'rival'],
        bidTurnTeamId: 'me',
      },
      pendingClaim: null,
      results: [],
      saleCount: 0,
    };

    const projection = projectBidVsPass({
      session,
      options: { shillTeamIds: new Set<string>() },
      teamId: 'me',
      bidAmount: 10_000,
      ownBandPriorities: {
        Power: 1, Contact: 0.5, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0,
      },
    });
    expect(projection).not.toBeNull();
    // PASS branch (one slot open): only a CP is legal; the 15th bat and generic RP would strand.
    expect(projection!.pass.targets.map((t) => t.playerId)).toEqual(['target-cp']);
    // BID branch (roster full after the win): nothing is signable at all.
    expect(projection!.bid.targets).toEqual([]);
  });

  test('TAXWIRE Item 1: the BID branch nets projectedTax off budgetAfter -- a target flips unaffordable', () => {
    // Full literal session (no `.pos` on any player, mirroring the F3 fixture's degraded-info
    // path) so sessionBidCeiling stays on its scalar fallback and every bidder's raw valuation is
    // driven purely by IV -- fit/bias/needMultiplier all resolve to 1 uniformly (no
    // archetypeWeights on the candidate, no bandPriorities on the rival teams). 'rival'/'rival2'
    // sit on budgets far above the candidate's IV so their ceilings never bind and 'me' never
    // ranks in the market's top two -- predictedMedian for 'flip' is therefore driven ONLY by
    // rival/rival2 and is IDENTICAL whether 'me' is taxed or not (verified: 43,690 in both
    // branches). The flip below is attributable to the budgetAfter fix alone, not market noise.
    const session: AuctionSession = {
      state: 'OPEN_BIDDING',
      config: {
        format: 'auction',
        bidIncrement: 1_000,
        turnTimerSeconds: null,
        nominationOrderSeed: 'taxwire-flip',
        flatReserveFloor: 5_000,
        cpuShillCount: 0,
        excludeFromLeague: true,
      },
      teams: [
        // 'me' carries a real marginal tax (TAXTEETH's team.projectedTax) for the CURRENT lot's
        // candidate ('lot1').
        { teamId: 'me', budgetRemaining: 60_000, rosterSlotsRemaining: 4, minSalary: 1_666.49, projectedTax: 8_000, roster: [] },
        { teamId: 'rival', budgetRemaining: 300_000, rosterSlotsRemaining: 4, minSalary: 1_666.49, projectedTax: 0, roster: [] },
        { teamId: 'rival2', budgetRemaining: 250_000, rosterSlotsRemaining: 4, minSalary: 1_666.49, projectedTax: 0, roster: [] },
      ],
      nominationOrder: ['me', 'rival', 'rival2'],
      nominationIndex: 0,
      nominationRound: 0,
      players: {
        lot1: { playerId: 'lot1', iv: 5_000, ivPercentile: 20 },
        flip: { playerId: 'flip', iv: 78_000, ivPercentile: 90 },
      },
      playerOrder: ['lot1', 'flip'],
      availablePlayerIds: ['flip'],
      currentLot: {
        playerId: 'lot1',
        nominatorTeamId: 'me',
        openingAsk: 10_000,
        highBid: null,
        highBidder: null,
        stillIn: ['me', 'rival', 'rival2'],
        bidTurnTeamId: 'me',
      },
      pendingClaim: null,
      results: [],
      saleCount: 0,
    };

    const projection = projectBidVsPass({
      session,
      options: { shillTeamIds: new Set<string>() },
      teamId: 'me',
      bidAmount: 10_000,
      ownBandPriorities: {
        Power: 1, Contact: 0.5, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0,
      },
    });
    expect(projection).not.toBeNull();

    // The fix: the BID branch's budgetAfter is budgetRemaining - bidAmount - projectedTax --
    // exactly the settlement math finalizeSoldLot uses (auctionStateMachine.ts:905) -- NOT the
    // pre-fix salary-only figure.
    expect(projection!.bid.budgetAfter).toBe(60_000 - 10_000 - 8_000); // 42,000
    // PASS never owes this lot's tax (no win, no settlement) -- untouched.
    expect(projection!.pass.budgetAfter).toBe(60_000);

    const flipBid = projection!.bid.targets.find((t) => t.playerId === 'flip');
    const flipPass = projection!.pass.targets.find((t) => t.playerId === 'flip');
    expect(flipBid).toBeDefined();
    expect(flipPass).toBeDefined();
    // 'flip' predictedMedian sits strictly between the taxed (42,000) and untaxed (50,000)
    // budgetAfter -- the exact window that proves the correction, not just the raw number.
    expect(flipBid!.predictedMedian).toBeGreaterThan(projection!.bid.budgetAfter);
    expect(flipBid!.predictedMedian).toBeLessThan(60_000 - 10_000); // < the pre-fix, untaxed figure
    // Tax-corrected BID branch: this team could not actually afford 'flip' after settling the
    // current lot's tax bill -- the pre-fix code showed `affordable: true` here (the whole bug,
    // READ-1 in the adversarially-verified whisper tax-awareness audit).
    expect(flipBid!.affordable).toBe(false);
    // The SAME candidate reads affordable on PASS (no tax owed there) -- proves the flip is caused
    // by the tax term, not a market/legality quirk.
    expect(flipPass!.affordable).toBe(true);
  });

  test('TAXWIRE: zero-tax teams are byte-identical to the pre-fix figure (lock)', () => {
    let session = initAuctionSession({
      teams: [
        { teamId: 'me', budgetRemaining: 300_000, rosterSlotsRemaining: 4 },
        { teamId: 'rival', budgetRemaining: 300_000, rosterSlotsRemaining: 4 },
      ],
      players: [
        { playerId: 'p1', iv: 40_000, ivPercentile: 90 },
        { playerId: 'p2', iv: 30_000, ivPercentile: 60 },
      ],
      nominationOrder: ['me', 'rival'],
      config: { bidIncrement: 1_000, nominationOrderSeed: 'bvp-zero-tax' },
    });
    session = drive(surfaceNextPlayer(session));
    // initAuctionSession always normalizes projectedTax to 0 (auctionStateMachine.ts's
    // normalizeTeam) -- the real shape every non-tax-exposed team carries through the live app.
    expect(session.teams.find((t) => t.teamId === 'me')?.projectedTax).toBe(0);

    const projection = projectBidVsPass({
      session,
      options: { shillTeamIds: new Set<string>() },
      teamId: 'me',
      bidAmount: 25_000,
      ownBandPriorities: {
        Power: 1, Contact: 0.5, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0,
      },
    });
    expect(projection).not.toBeNull();
    // budgetRemaining - bidAmount - 0 === budgetRemaining - bidAmount: the fix is a no-op here.
    expect(projection!.bid.budgetAfter).toBe(275_000);
  });
});
