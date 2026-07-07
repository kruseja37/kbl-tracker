import { describe, expect, test } from 'vitest';

import {
  advanceLot,
  initAuctionSession,
  passBid,
  recordBid,
  resolveLot,
  surfaceNextPlayer,
  type AuctionSession,
  type AuctionTeamInput,
  type AuctionTransitionResult,
} from '../auctionStateMachine';
import {
  bargainInterestProbability,
  buildClubCpuProfile,
  cpuBidOnLot,
  cpuDecideLoneSurvivor,
  evaluateCpuArchetypeFit,
  evaluateCpuInterest,
  evaluateCpuValuation,
  shillNoiseMultiplier,
  type CpuShillAuctionPlayer,
  type CpuShillAuctionSession,
  type CpuShillProfile,
} from '../cpuShillBidding';
import type { BandPriorities } from '../leagueConstruction';

const BASE_CONFIG = {
  format: 'auction' as const,
  bidIncrement: 100,
  turnTimerSeconds: null,
  nominationOrderSeed: 'cpu-shill-test-seed',
  cpuShillCount: 1,
  excludeFromLeague: true,
};

const NEUTRAL_PRIORITIES: BandPriorities = {
  Power: 0,
  Contact: 0,
  Speed: 0,
  Defense: 0,
  Rotation: 0,
  Bullpen: 0,
};

const POWER_SHILL: CpuShillProfile = {
  teamId: 'cpu',
  personality: 'spender',
  bandPriorities: { ...NEUTRAL_PRIORITIES, Power: 1 },
  personalityBias: 1.07,
  interestAggression: 1.1,
  maxInterestProbability: 0.88,
};

const PLAYERS: readonly CpuShillAuctionPlayer[] = [
  { playerId: 'star', iv: 1_000, ivPercentile: 90, archetypeWeights: { Power: 1 } },
  { playerId: 'cheap', iv: 1_000, ivPercentile: 0, archetypeWeights: { Power: 1 } },
  { playerId: 'filler', iv: 600, ivPercentile: 0, archetypeWeights: { Defense: 1 } },
];

function makeSession(overrides: {
  teams?: readonly AuctionTeamInput[];
  players?: readonly CpuShillAuctionPlayer[];
  nominationOrder?: readonly string[];
  shill?: CpuShillProfile;
  reserveFractionK?: number;
} = {}): CpuShillAuctionSession {
  const shill = overrides.shill ?? POWER_SHILL;
  return {
    ...initAuctionSession({
      config: {
        ...BASE_CONFIG,
        reserveFractionK: overrides.reserveFractionK,
      },
      teams: overrides.teams ?? [
        { teamId: 'human', budgetRemaining: 20_000, rosterSlotsRemaining: 2, minSalary: 0 },
        { teamId: 'cpu', budgetRemaining: 20_000, rosterSlotsRemaining: 2, minSalary: 0 },
        { teamId: 'other', budgetRemaining: 20_000, rosterSlotsRemaining: 2, minSalary: 0 },
      ],
      players: overrides.players ?? PLAYERS,
      nominationOrder: overrides.nominationOrder ?? ['human', 'cpu', 'other'],
    }),
    cpuShills: { [shill.teamId]: shill },
  };
}

function ok(result: AuctionTransitionResult): AuctionSession {
  if (!result.ok) throw new Error(`Expected transition to succeed, got ${result.reason}`);
  return result.session;
}

function openEngineLot(session: CpuShillAuctionSession): CpuShillAuctionSession {
  return ok(surfaceNextPlayer(session)) as CpuShillAuctionSession;
}

describe('cpuShillBidding AUC-2.2 pure policy', () => {
  test('DJ-03 builds stable complete real-club profiles without shill-only fields', () => {
    const bandPriorities = { ...NEUTRAL_PRIORITIES, Power: 1 };
    const first = buildClubCpuProfile({
      teamId: 'cpu-club',
      leagueId: 'league-1',
      bandPriorities,
      archetypeId: 'murderers-row',
    });
    const second = buildClubCpuProfile({
      teamId: 'cpu-club',
      leagueId: 'league-1',
      bandPriorities,
      archetypeId: 'murderers-row',
    });

    expect(second).toEqual(first);
    expect(first.bandPriorities).toBe(bandPriorities);
    expect(first.archetypeId).toBe('murderers-row');
    expect(first.shillMaxWins).toBeUndefined();
    expect(first.personalityBias).toBeUndefined();
    expect(first.interestAggression).toBeUndefined();
    expect(first.maxInterestProbability).toBeUndefined();
  });

  test('DJ-03 per-decision seeds only change valuation noise for a profiled real club', () => {
    const profile = buildClubCpuProfile({
      teamId: 'cpu',
      leagueId: 'league-1',
      bandPriorities: { ...NEUTRAL_PRIORITIES, Power: 1 },
      archetypeId: 'murderers-row',
    });
    const player = PLAYERS[0];
    const fit = evaluateCpuArchetypeFit(player, profile);
    const bias = profile.personality === 'spender' ? 1.08 : profile.personality === 'zealot' ? 1.02 : 0.98;

    for (const seed of ['decision:0:open', 'decision:5:high-bid', 'decision:9:still-in']) {
      const valuation = evaluateCpuValuation(player, profile, seed);
      expect(valuation / (player.iv * fit * bias)).toBeGreaterThanOrEqual(0.88);
      expect(valuation / (player.iv * fit * bias)).toBeLessThanOrEqual(1.12);
      expect(profile.bandPriorities).toEqual({ ...NEUTRAL_PRIORITIES, Power: 1 });
      expect(profile.archetypeId).toBe('murderers-row');
    }
  });

  test('valuation is IV x archetypeFit(composeIdentity) x personalityBias x seeded noise within +/-12%', () => {
    const player = PLAYERS[0];
    const seed = 'valuation-proof';
    const fit = evaluateCpuArchetypeFit(player, POWER_SHILL);
    const noise = shillNoiseMultiplier(`${seed}:${POWER_SHILL.teamId}:${player.playerId}:valuation`);
    const valuation = evaluateCpuValuation(player, POWER_SHILL, seed);

    expect(fit).toBeGreaterThan(1);
    expect(noise).toBeGreaterThanOrEqual(0.88);
    expect(noise).toBeLessThanOrEqual(1.12);
    expect(valuation).toBeCloseTo(player.iv * fit * POWER_SHILL.personalityBias! * noise, 8);
  });

  test('interest is probabilistic by seed instead of constant', () => {
    const lot = {
      playerId: 'star',
      currentAsk: 700,
      valuation: 1_150,
      maxBid: 2_000,
    };
    const probability = bargainInterestProbability(lot, POWER_SHILL);
    const decisions = Array.from({ length: 160 }, (_, index) =>
      evaluateCpuInterest(lot, POWER_SHILL, `interest-seed-${index}`),
    );

    expect(probability).toBeGreaterThan(0);
    expect(probability).toBeLessThan(1);
    expect(decisions).toContain(true);
    expect(decisions).toContain(false);
  });

  test('cpuBidOnLot bids the minimum legal raise only when interested and legal', () => {
    let session: CpuShillAuctionSession = makeSession({ players: [PLAYERS[0]] });
    session = openEngineLot(session);

    const biddingSeed = Array.from({ length: 300 }, (_, index) => `bid-hit-${index}`).find(
      (seed) => cpuBidOnLot(session, 'cpu', seed).kind === 'bid',
    );
    expect(biddingSeed).toBeDefined();

    const decision = cpuBidOnLot(session, 'cpu', biddingSeed!);
    expect(decision.kind).toBe('bid');
    if (decision.kind === 'bid') {
      expect(decision.bid).toBe(700);
      expect(decision.bid).toBe(decision.minimumBid);
      expect(decision.bid).toBeLessThan(decision.valuation);
      expect(decision.bid).toBeLessThanOrEqual(decision.maxBid);
    }
  });

  test('cpuBidOnLot floors opening bids at the configured reserve price', () => {
    const reservePlayer: CpuShillAuctionPlayer = {
      playerId: 'reserve-star',
      iv: 10_001,
      ivPercentile: 5,
      archetypeWeights: { Power: 1 },
    };
    let session: CpuShillAuctionSession = makeSession({
      reserveFractionK: 0.65,
      players: [reservePlayer],
      teams: [
        { teamId: 'human', budgetRemaining: 100_000, rosterSlotsRemaining: 1, minSalary: 0 },
        { teamId: 'cpu', budgetRemaining: 100_000, rosterSlotsRemaining: 1, minSalary: 0 },
      ],
      nominationOrder: ['human', 'cpu'],
    });
    session = openEngineLot(session);

    const biddingSeed = Array.from({ length: 300 }, (_, index) => `reserve-bid-${index}`).find(
      (seed) => cpuBidOnLot(session, 'cpu', seed).kind === 'bid',
    );
    expect(biddingSeed).toBeDefined();
    const decision = cpuBidOnLot(session, 'cpu', biddingSeed!);

    expect(session.currentLot?.openingAsk).toBe(6_501);
    expect(decision.kind).toBe('bid');
    if (decision.kind === 'bid') {
      expect(decision.minimumBid).toBe(6_501);
      expect(decision.bid).toBe(6_501);
    }
  });

  test('a shill never bids above its private valuation', () => {
    const cautious: CpuShillProfile = {
      teamId: 'cpu',
      personality: 'sniper',
      bandPriorities: { ...NEUTRAL_PRIORITIES, Power: 1 },
      personalityBias: 1,
      interestAggression: 2,
      maxInterestProbability: 1,
    };
    let session: CpuShillAuctionSession = makeSession({ players: [PLAYERS[0]], shill: cautious });
    session = openEngineLot(session);
    session = ok(recordBid(session, 'human', 1_300)) as CpuShillAuctionSession;

    const decision = cpuBidOnLot(session, 'cpu', 'valuation-cap');

    expect(decision.kind).toBe('pass');
    if (decision.kind === 'pass') {
      expect(decision.reason).toBe('over-valuation');
      expect(decision.minimumBid).toBe(1_400);
      expect(decision.valuation).toBeLessThan(decision.minimumBid!);
    }
  });

  test('a shill never bids when the minimum legal raise exceeds its depletable budget', () => {
    let session: CpuShillAuctionSession = makeSession({
      teams: [
        { teamId: 'human', budgetRemaining: 20_000, rosterSlotsRemaining: 2, minSalary: 0 },
        { teamId: 'cpu', budgetRemaining: 600, rosterSlotsRemaining: 1, minSalary: 0 },
        { teamId: 'other', budgetRemaining: 20_000, rosterSlotsRemaining: 2, minSalary: 0 },
      ],
    });
    session = openEngineLot({ ...session, playerOrder: ['star'], availablePlayerIds: ['star'] });

    const decision = cpuBidOnLot(session, 'cpu', 'budget-cap');

    expect(decision.kind).toBe('pass');
    if (decision.kind === 'pass') {
      expect(decision.reason).toBe('over-budget');
      expect(decision.minimumBid).toBe(700);
      expect(decision.maxBid).toBe(600);
    }
  });

  test('cheap lots do not create a deterministic floor across many seeds', () => {
    let session: CpuShillAuctionSession = makeSession({ players: [PLAYERS[1]] });
    session = openEngineLot(session);

    const decisions = Array.from({ length: 220 }, (_, index) =>
      cpuBidOnLot(session, 'cpu', `cheap-lot-${index}`).kind,
    );

    expect(decisions).toContain('bid');
    expect(decisions).toContain('pass');
  });

  test('budget depletion from an earlier CPU win is enforced on the next lot', () => {
    let session: CpuShillAuctionSession = makeSession({
      teams: [
        { teamId: 'human', budgetRemaining: 20_000, rosterSlotsRemaining: 2, minSalary: 0 },
        { teamId: 'cpu', budgetRemaining: 1_000, rosterSlotsRemaining: 2, minSalary: 0 },
        { teamId: 'other', budgetRemaining: 20_000, rosterSlotsRemaining: 2, minSalary: 0 },
      ],
      players: [
        { playerId: 'first', iv: 1_000, ivPercentile: 0, archetypeWeights: { Power: 1 } },
        { playerId: 'second', iv: 1_200, ivPercentile: 0, archetypeWeights: { Power: 1 } },
      ],
    });

    session = openEngineLot(session);
    const firstAsk = session.currentLot?.openingAsk;
    expect(firstAsk).toEqual(expect.any(Number));
    session = ok(recordBid(session, 'cpu', firstAsk!)) as CpuShillAuctionSession;
    session = ok(passBid(session, 'human')) as CpuShillAuctionSession;
    session = ok(passBid(session, 'other')) as CpuShillAuctionSession;
    session = ok(resolveLot(session)) as CpuShillAuctionSession;

    expect(session.teams.find((team) => team.teamId === 'cpu')?.budgetRemaining).toBe(500);

    session = ok(advanceLot(session)) as CpuShillAuctionSession;
    session = openEngineLot(session);

    const decision = cpuBidOnLot(session, 'cpu', 'after-budget-depletion');

    expect(decision.kind).toBe('pass');
    if (decision.kind === 'pass') {
      expect(decision.reason).toBe('over-budget');
      expect(decision.minimumBid).toBeGreaterThan(decision.maxBid!);
    }
  });

  test('CPU lone survivor claims at reserve when valuation exceeds price', () => {
    let session: CpuShillAuctionSession = makeSession({
      teams: [
        { teamId: 'human', budgetRemaining: 20_000, rosterSlotsRemaining: 1, minSalary: 0 },
        { teamId: 'cpu', budgetRemaining: 20_000, rosterSlotsRemaining: 1, minSalary: 0 },
      ],
      nominationOrder: ['human', 'cpu'],
    });

    session = openEngineLot({ ...session, playerOrder: ['star'], availablePlayerIds: ['star'] });
    session = ok(passBid(session, 'human')) as CpuShillAuctionSession;
    session = ok(resolveLot(session)) as CpuShillAuctionSession;

    expect(session.pendingClaim).toEqual({ playerId: 'star', teamId: 'cpu', price: 700 });

    const decision = cpuDecideLoneSurvivor(session, 'cpu', 'lone-survivor-claim');

    expect(decision.kind).toBe('claim');
    if (decision.kind === 'claim') {
      expect(decision.price).toBe(700);
      expect(decision.valuation).toBeGreaterThan(decision.price);
      expect(decision.maxBid).toBeGreaterThanOrEqual(decision.price);
    }
  });

  test('CPU lone survivor passes over-valuation when valuation is not above reserve', () => {
    const lowValueShill: CpuShillProfile = {
      ...POWER_SHILL,
      personalityBias: 0.2,
      interestAggression: 2,
      maxInterestProbability: 1,
    };
    let session: CpuShillAuctionSession = makeSession({
      teams: [
        { teamId: 'human', budgetRemaining: 20_000, rosterSlotsRemaining: 1, minSalary: 0 },
        { teamId: 'cpu', budgetRemaining: 20_000, rosterSlotsRemaining: 1, minSalary: 0 },
      ],
      nominationOrder: ['human', 'cpu'],
      shill: lowValueShill,
    });

    session = openEngineLot({ ...session, playerOrder: ['star'], availablePlayerIds: ['star'] });
    session = ok(passBid(session, 'human')) as CpuShillAuctionSession;
    session = ok(resolveLot(session)) as CpuShillAuctionSession;

    const decision = cpuDecideLoneSurvivor(session, 'cpu', 'lone-survivor-over-valuation');

    expect(decision.kind).toBe('pass');
    if (decision.kind === 'pass') {
      expect(decision.reason).toBe('over-valuation');
      expect(decision.valuation).not.toBeNull();
      expect(decision.valuation!).toBeLessThanOrEqual(700);
      expect(decision.maxBid).toBeLessThan(decision.valuation! + 1);
      expect(decision.liquidity?.priceRead).toBe('pass');
    }
  });

  test('CPU lone-survivor decision reports guard branches without claiming', () => {
    const base = makeSession();

    expect(cpuDecideLoneSurvivor(base, 'cpu', 'wrong-state')).toMatchObject({
      kind: 'pass',
      reason: 'not-resolve',
      playerId: null,
      valuation: null,
      maxBid: null,
    });

    expect(cpuDecideLoneSurvivor({ ...base, state: 'RESOLVE', pendingClaim: null }, 'cpu', 'no-claim')).toMatchObject({
      kind: 'pass',
      reason: 'no-pending-claim',
      playerId: null,
    });

    expect(
      cpuDecideLoneSurvivor(
        { ...base, state: 'RESOLVE', pendingClaim: { playerId: 'star', teamId: 'human', price: 700 } },
        'cpu',
        'wrong-team',
      ),
    ).toMatchObject({
      kind: 'pass',
      reason: 'not-this-team',
      playerId: 'star',
    });

    const fullCpu = makeSession({
      teams: [
        { teamId: 'human', budgetRemaining: 20_000, rosterSlotsRemaining: 1, minSalary: 0 },
        { teamId: 'cpu', budgetRemaining: 20_000, rosterSlotsRemaining: 0, minSalary: 0 },
      ],
      nominationOrder: ['human', 'cpu'],
    });
    expect(
      cpuDecideLoneSurvivor(
        { ...fullCpu, state: 'RESOLVE', pendingClaim: { playerId: 'star', teamId: 'cpu', price: 700 } },
        'cpu',
        'full-team',
      ),
    ).toMatchObject({
      kind: 'pass',
      reason: 'team-full',
      playerId: 'star',
    });

    expect(
      cpuDecideLoneSurvivor(
        { ...base, state: 'RESOLVE', pendingClaim: { playerId: 'missing', teamId: 'cpu', price: 700 } },
        'cpu',
        'unknown-player',
      ),
    ).toMatchObject({
      kind: 'pass',
      reason: 'unknown-player',
      playerId: 'missing',
    });
  });

});
