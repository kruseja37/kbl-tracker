import { describe, expect, test } from 'vitest';

import {
  evaluateResolve,
  initAuctionSession,
  nominatePlayer,
  passBid,
  recordBid,
  rotateNomination,
  type AuctionSession,
  type AuctionTeamInput,
  type AuctionTransitionResult,
} from '../auctionStateMachine';
import {
  bargainInterestProbability,
  cpuBidOnLot,
  cpuDecideLoneSurvivor,
  evaluateCpuArchetypeFit,
  evaluateCpuInterest,
  evaluateCpuValuation,
  resolveCpuNomination,
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
} = {}): CpuShillAuctionSession {
  const shill = overrides.shill ?? POWER_SHILL;
  return {
    ...initAuctionSession({
      config: BASE_CONFIG,
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

describe('cpuShillBidding AUC-2.2 pure policy', () => {
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
    let session: CpuShillAuctionSession = makeSession();
    session = ok(nominatePlayer(session, 'star')) as CpuShillAuctionSession;

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

  test('a shill never bids above its private valuation', () => {
    const cautious: CpuShillProfile = {
      teamId: 'cpu',
      personality: 'sniper',
      bandPriorities: { ...NEUTRAL_PRIORITIES, Power: 1 },
      personalityBias: 1,
      interestAggression: 2,
      maxInterestProbability: 1,
    };
    let session: CpuShillAuctionSession = makeSession({ shill: cautious });
    session = ok(nominatePlayer(session, 'star')) as CpuShillAuctionSession;
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
    session = ok(nominatePlayer(session, 'star')) as CpuShillAuctionSession;

    const decision = cpuBidOnLot(session, 'cpu', 'budget-cap');

    expect(decision.kind).toBe('pass');
    if (decision.kind === 'pass') {
      expect(decision.reason).toBe('over-budget');
      expect(decision.minimumBid).toBe(700);
      expect(decision.maxBid).toBe(600);
    }
  });

  test('cheap lots do not create a deterministic floor across many seeds', () => {
    let session: CpuShillAuctionSession = makeSession();
    session = ok(nominatePlayer(session, 'cheap')) as CpuShillAuctionSession;

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

    session = ok(nominatePlayer(session, 'first')) as CpuShillAuctionSession;
    session = ok(recordBid(session, 'cpu', 500)) as CpuShillAuctionSession;
    session = ok(passBid(session, 'human')) as CpuShillAuctionSession;
    session = ok(passBid(session, 'other')) as CpuShillAuctionSession;
    session = ok(evaluateResolve(session)) as CpuShillAuctionSession;

    expect(session.teams.find((team) => team.teamId === 'cpu')?.budgetRemaining).toBe(500);

    session = ok(rotateNomination(session)) as CpuShillAuctionSession;
    session = ok(nominatePlayer(session, 'second')) as CpuShillAuctionSession;

    const decision = cpuBidOnLot(session, 'cpu', 'after-budget-depletion');

    expect(decision.kind).toBe('pass');
    if (decision.kind === 'pass') {
      expect(decision.reason).toBe('over-budget');
      expect(decision.minimumBid).toBe(600);
      expect(decision.maxBid).toBe(500);
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

    session = ok(nominatePlayer(session, 'star')) as CpuShillAuctionSession;
    session = ok(passBid(session, 'human')) as CpuShillAuctionSession;
    session = ok(evaluateResolve(session)) as CpuShillAuctionSession;

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

    session = ok(nominatePlayer(session, 'star')) as CpuShillAuctionSession;
    session = ok(passBid(session, 'human')) as CpuShillAuctionSession;
    session = ok(evaluateResolve(session)) as CpuShillAuctionSession;

    const decision = cpuDecideLoneSurvivor(session, 'cpu', 'lone-survivor-over-valuation');

    expect(decision.kind).toBe('pass');
    if (decision.kind === 'pass') {
      expect(decision.reason).toBe('over-valuation');
      expect(decision.valuation).not.toBeNull();
      expect(decision.valuation!).toBeLessThanOrEqual(700);
      expect(decision.maxBid).toBe(20_000);
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

  test('CPU nomination returns a deterministic legal player without mutating the session', () => {
    const session = makeSession({ nominationOrder: ['cpu', 'human', 'other'] });
    const beforeAvailable = [...session.availablePlayerIds];

    const first = resolveCpuNomination(session, 'cpu', 'nomination-seed');
    const second = resolveCpuNomination(session, 'cpu', 'nomination-seed');

    expect(first).toEqual(second);
    expect(first.kind).toBe('nominate');
    if (first.kind === 'nominate') {
      expect(session.availablePlayerIds).toContain(first.playerId);
      expect(nominatePlayer(session, first.playerId).ok).toBe(true);
    }
    expect(session.availablePlayerIds).toEqual(beforeAvailable);
  });
});
