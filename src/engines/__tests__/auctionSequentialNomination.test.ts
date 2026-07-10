import { describe, expect, test } from 'vitest';

import { LEAGUE_MINIMUM_SALARY } from '../../data/rosterEngineConstants';
import {
  advanceLot,
  getCurrentNominatorTeamId,
  initAuctionSession,
  nominatePlayer,
  passBid,
  recordBid,
  resolveLot,
  surfaceNextPlayer,
  type AuctionSession,
  type AuctionTransitionResult,
} from '../auctionStateMachine';
import {
  buildClubCpuProfile,
  cpuBidOnLot,
  selectCpuNomination,
  type CpuShillAuctionSession,
} from '../cpuShillBidding';

const PLAYERS = [
  { playerId: 'star', iv: 100_000, ivPercentile: 99 },
  { playerId: 'regular', iv: 50_000, ivPercentile: 50 },
  { playerId: 'depth', iv: 20_000, ivPercentile: 10 },
] as const;

function makeSession(overrides: {
  teams?: Parameters<typeof initAuctionSession>[0]['teams'];
  nominationOrder?: readonly string[];
  nonCompletingTeamIds?: readonly string[];
  reserveFractionK?: number;
} = {}): AuctionSession {
  return initAuctionSession({
    teams: overrides.teams ?? [
      { teamId: 'A', budgetRemaining: 500_000, rosterSlotsRemaining: 2 },
      { teamId: 'B', budgetRemaining: 500_000, rosterSlotsRemaining: 2 },
    ],
    players: PLAYERS,
    nominationOrder: overrides.nominationOrder ?? ['A', 'B'],
    config: {
      bidIncrement: 1_000,
      nominationOrderSeed: 'sequential-nomination',
      reserveFractionK: overrides.reserveFractionK ?? 0.9,
      sequentialNomination: true,
      nonCompletingTeamIds: overrides.nonCompletingTeamIds,
    },
  });
}

function ok(result: AuctionTransitionResult): AuctionSession {
  if (!result.ok) throw new Error(`expected transition success, got ${result.reason}`);
  return result.session;
}

function reject(result: AuctionTransitionResult): AuctionTransitionResult & { ok: false } {
  if (result.ok) throw new Error('expected transition rejection');
  return result;
}

describe('auction rebuild: sequential committed nominations', () => {
  test('disables the weighted auto-surface path for rebuilt sessions', () => {
    const session = makeSession();

    expect(reject(surfaceNextPlayer(session)).reason).toBe('manual-nomination-required');
    expect(session.currentLot).toBeNull();
    expect(session.availablePlayerIds).toEqual(['star', 'regular', 'depth']);
  });

  test('skips shills and full clubs in the fixed nomination rotation', () => {
    const session = makeSession({
      teams: [
        { teamId: 'shill', budgetRemaining: 500_000, rosterSlotsRemaining: 22 },
        { teamId: 'full', budgetRemaining: 500_000, rosterSlotsRemaining: 0 },
        { teamId: 'open', budgetRemaining: 500_000, rosterSlotsRemaining: 1 },
      ],
      nominationOrder: ['shill', 'full', 'open'],
      nonCompletingTeamIds: ['shill'],
    });

    expect(getCurrentNominatorTeamId(session)).toBe('open');
  });

  test('uses the supplied club order rather than seed-shuffling rebuilt nominations', () => {
    const session = initAuctionSession({
      teams: [
        { teamId: 'first-club', budgetRemaining: 500_000, rosterSlotsRemaining: 1 },
        { teamId: 'second-club', budgetRemaining: 500_000, rosterSlotsRemaining: 1 },
      ],
      players: PLAYERS,
      config: {
        bidIncrement: 1_000,
        nominationOrderSeed: 'a-seed-that-must-not-own-the-club-order',
        sequentialNomination: true,
      },
    });

    expect(session.nominationOrder).toEqual(['first-club', 'second-club']);
    expect(getCurrentNominatorTeamId(session)).toBe('first-club');
  });

  test('accepts a league-minimum open as the nominator committed bid and always sells the lot', () => {
    let session = makeSession({ reserveFractionK: 0.95 });
    session = ok(nominatePlayer(session, 'A', 'star', LEAGUE_MINIMUM_SALARY));

    expect(session.currentLot).toMatchObject({
      playerId: 'star',
      nominatorTeamId: 'A',
      openingAsk: LEAGUE_MINIMUM_SALARY,
      highBid: LEAGUE_MINIMUM_SALARY,
      highBidder: 'A',
    });
    expect(session.currentLot?.bidLog).toEqual([
      { teamId: 'A', action: 'bid', amount: LEAGUE_MINIMUM_SALARY },
    ]);
    expect(session.availablePlayerIds).not.toContain('star');

    session = ok(passBid(session, 'B'));
    session = ok(resolveLot(session));

    expect(session.state).toBe('SOLD');
    expect(session.results).toEqual([
      expect.objectContaining({
        playerId: 'star',
        disposition: 'SOLD',
        winnerTeamId: 'A',
        salary: LEAGUE_MINIMUM_SALARY,
      }),
    ]);
    expect(session.availablePlayerIds).not.toContain('star');
    expect(session.results.some((result) => result.disposition === 'PASSED')).toBe(false);
  });

  test('rotates after a sale and rejects a non-current club or an unaffordable open', () => {
    let session = makeSession();
    expect(reject(nominatePlayer(session, 'B', 'star', LEAGUE_MINIMUM_SALARY)).reason)
      .toBe('not-current-nominator');
    expect(reject(nominatePlayer(session, 'A', 'star', 999_999_999)).reason)
      .toBe('nomination-above-solvency-cap');

    session = ok(nominatePlayer(session, 'A', 'star', LEAGUE_MINIMUM_SALARY));
    session = ok(passBid(session, 'B'));
    session = ok(resolveLot(session));
    session = ok(advanceLot(session));

    expect(session.state).toBe('NOMINATION');
    expect(getCurrentNominatorTeamId(session)).toBe('B');
  });

  test('a shill win stays gone and is never reclaimed or redistributed at completion', () => {
    let session = makeSession({
      teams: [
        { teamId: 'real', budgetRemaining: 500_000, rosterSlotsRemaining: 1 },
        { teamId: 'shill', budgetRemaining: 500_000, rosterSlotsRemaining: 22 },
      ],
      nominationOrder: ['shill', 'real'],
      nonCompletingTeamIds: ['shill'],
    });

    expect(getCurrentNominatorTeamId(session)).toBe('real');
    session = ok(nominatePlayer(session, 'real', 'star', LEAGUE_MINIMUM_SALARY));
    session = ok(recordBid(session, 'shill', LEAGUE_MINIMUM_SALARY + session.config.bidIncrement));
    session = ok(passBid(session, 'real'));
    session = ok(resolveLot(session));
    session = ok(advanceLot(session));

    expect(session.teams.find((team) => team.teamId === 'shill')?.roster.map((row) => row.playerId))
      .toEqual(['star']);
    expect(session.availablePlayerIds).not.toContain('star');

    session = ok(nominatePlayer(session, 'real', 'regular', LEAGUE_MINIMUM_SALARY));
    session = ok(passBid(session, 'shill'));
    session = ok(resolveLot(session));

    expect(session.state).toBe('AUCTION_COMPLETE');
    expect(session.teams.find((team) => team.teamId === 'real')?.roster.map((row) => row.playerId))
      .toEqual(['regular']);
    expect(session.teams.find((team) => team.teamId === 'shill')?.roster.map((row) => row.playerId))
      .toEqual(['star']);
    expect(session.results.every((result) => result.disposition === 'SOLD')).toBe(true);
    expect(session.results.every((result) => result.settled !== true)).toBe(true);
  });

  test('CPU nomination reuses its valuation/fit profile and the configured strategic opening policy', () => {
    const base = makeSession();
    const session: CpuShillAuctionSession = {
      ...base,
      config: { ...base.config, cpuNominationOpenFraction: 0.25 },
      cpuShills: {
        A: buildClubCpuProfile({
          teamId: 'A',
          leagueId: 'sequential-nomination',
          bandPriorities: { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 },
        }),
      },
    };

    const decision = selectCpuNomination(session, 'A', 'cpu-open');
    expect(decision).not.toBeNull();
    expect(decision?.playerId).toBe('star');
    expect(decision?.openingBid).toBeGreaterThanOrEqual(LEAGUE_MINIMUM_SALARY);
    expect(decision?.openingBid).toBeLessThan(decision?.valuation ?? 0);
    expect(decision?.openingBid).toBeLessThanOrEqual(decision?.maxOpeningBid ?? 0);
  });

  test('a rebuilt shill always defends below its value anchor, then stops at the anchor and total-win cap', () => {
    const base = makeSession({
      teams: [
        { teamId: 'real', budgetRemaining: 500_000, rosterSlotsRemaining: 2 },
        { teamId: 'shill', budgetRemaining: 500_000, rosterSlotsRemaining: 22 },
      ],
      nominationOrder: ['real', 'shill'],
      nonCompletingTeamIds: ['shill'],
    });
    let session: CpuShillAuctionSession = {
      ...base,
      config: { ...base.config, shillAnchorFraction: 0.5, shillTotalWinCap: 1 },
      cpuShills: {
        shill: {
          teamId: 'shill',
          personality: 'sniper',
          bandPriorities: { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 },
          shillMaxWins: 2,
        },
      },
    };
    session = ok(nominatePlayer(session, 'real', 'star', LEAGUE_MINIMUM_SALARY)) as CpuShillAuctionSession;

    expect(cpuBidOnLot(session, 'shill', 'anchor-low')).toMatchObject({ kind: 'bid' });

    const aboveAnchor: CpuShillAuctionSession = {
      ...session,
      currentLot: session.currentLot
        ? { ...session.currentLot, highBid: 50_000, highBidder: 'real', bidTurnTeamId: 'shill' }
        : null,
    };
    expect(cpuBidOnLot(aboveAnchor, 'shill', 'anchor-high')).toMatchObject({
      kind: 'pass',
      reason: 'over-valuation',
    });

    const capped: CpuShillAuctionSession = {
      ...session,
      results: [{
        playerId: 'depth',
        disposition: 'SOLD',
        nominatorTeamId: 'real',
        winnerTeamId: 'shill',
        salary: 10_000,
      }],
    };
    expect(cpuBidOnLot(capped, 'shill', 'anchor-cap')).toMatchObject({ kind: 'pass', reason: 'team-full' });
  });
});
