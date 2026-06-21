import { describe, expect, test } from 'vitest';

import {
  claimLoneSurvivor,
  evaluateResolve,
  getCurrentBidderTeamId,
  getCurrentNominator,
  initAuctionSession,
  nextBidTurn,
  nominatePlayer,
  passBid,
  passLoneSurvivor,
  recordBid,
  rotateNomination,
  seededNominationOrder,
  type AuctionSession,
  type AuctionTeamInput,
  type AuctionTransitionResult,
  type PassedPlayerTracker,
} from '../auctionStateMachine';

const BASE_CONFIG = {
  format: 'auction' as const,
  bidIncrement: 100,
  turnTimerSeconds: null,
  nominationOrderSeed: 'auction-test-seed',
  cpuShillCount: 0,
  excludeFromLeague: true,
};

const PLAYERS = [
  { playerId: 'star', iv: 1_000, ivPercentile: 90 },
  { playerId: 'cheap', iv: 500, ivPercentile: 0 },
  { playerId: 'filler', iv: 400, ivPercentile: 50 },
] as const;

function makeSession(overrides: {
  teams?: readonly AuctionTeamInput[];
  nominationOrder?: readonly string[];
} = {}): AuctionSession {
  return initAuctionSession({
    config: BASE_CONFIG,
    teams: overrides.teams ?? [
      { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 2, minSalary: 0 },
      { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 2, minSalary: 0 },
      { teamId: 'C', budgetRemaining: 10_000, rosterSlotsRemaining: 2, minSalary: 0 },
    ],
    players: PLAYERS,
    nominationOrder: overrides.nominationOrder ?? ['A', 'B', 'C'],
  });
}

function ok(result: AuctionTransitionResult): AuctionSession {
  if (!result.ok) throw new Error(`Expected transition to succeed, got ${result.reason}`);
  return result.session;
}

function reject(result: AuctionTransitionResult): AuctionTransitionResult & { ok: false } {
  if (result.ok) throw new Error('Expected transition to be rejected');
  return result;
}

function passLotByDecision(session: AuctionSession): AuctionSession {
  let next = session;
  while ((next.currentLot?.stillIn.length ?? 0) > 1) {
    const teamId = next.currentLot?.stillIn[0];
    if (teamId === undefined) throw new Error('Expected a bidder to pass');
    next = ok(passBid(next, teamId));
  }
  next = ok(evaluateResolve(next));
  if (next.pendingClaim !== null) next = ok(passLoneSurvivor(next));
  return next;
}

describe('auctionStateMachine AUC-2.1 pure reducer', () => {
  test('SOLD path uses reserve opening ask and awards lone survivor who already bid', () => {
    let session = makeSession();

    session = ok(nominatePlayer(session, 'star'));
    expect(session.currentLot).toMatchObject({
      playerId: 'star',
      nominatorTeamId: 'A',
      openingAsk: 700,
      highBid: null,
      stillIn: ['A', 'B', 'C'],
      bidTurnTeamId: 'A',
    });

    session = ok(recordBid(session, 'B', 700));
    session = ok(passBid(session, 'A'));
    session = ok(passBid(session, 'C'));
    expect(session.state).toBe('RESOLVE');

    session = ok(evaluateResolve(session));

    expect(session.state).toBe('SOLD');
    expect(session.results).toEqual([
      {
        playerId: 'star',
        disposition: 'SOLD',
        nominatorTeamId: 'A',
        winnerTeamId: 'B',
        salary: 700,
      },
    ]);
    expect(session.teams.find((team) => team.teamId === 'B')).toMatchObject({
      budgetRemaining: 9_300,
      rosterSlotsRemaining: 1,
      roster: [{ playerId: 'star', salary: 700 }],
    });
  });

  test('opens a lot with the nominator on the bidding clock', () => {
    let session = makeSession({ nominationOrder: ['B', 'C', 'A'] });

    expect(getCurrentNominator(session)).toBe('B');

    session = ok(nominatePlayer(session, 'star'));

    expect(session.currentLot?.bidTurnTeamId).toBe('B');
    expect(getCurrentBidderTeamId(session)).toBe('B');
  });

  test('after a bid, the bidding clock advances to the next still-in team and skips the high bidder', () => {
    let session = makeSession();

    session = ok(nominatePlayer(session, 'star'));
    session = ok(recordBid(session, 'A', 700));

    expect(session.currentLot?.highBidder).toBe('A');
    expect(session.currentLot?.bidTurnTeamId).toBe('B');
    expect(getCurrentBidderTeamId(session)).toBe('B');

    session = ok(recordBid(session, 'B', 800));

    expect(session.currentLot?.highBidder).toBe('B');
    expect(session.currentLot?.bidTurnTeamId).toBe('C');
    expect(getCurrentBidderTeamId(session)).toBe('C');
  });

  test('round-robin bidding never lands on the current high bidder while challengers remain', () => {
    let session = makeSession();

    session = ok(nominatePlayer(session, 'star'));
    expect(getCurrentBidderTeamId(session)).toBe('A');

    session = ok(recordBid(session, 'A', 700));
    expect(getCurrentBidderTeamId(session)).toBe('B');
    expect(getCurrentBidderTeamId(session)).not.toBe(session.currentLot?.highBidder);

    session = ok(recordBid(session, 'B', 800));
    expect(getCurrentBidderTeamId(session)).toBe('C');
    expect(getCurrentBidderTeamId(session)).not.toBe(session.currentLot?.highBidder);

    session = ok(passBid(session, 'C'));
    expect(session.currentLot?.stillIn).toEqual(['A', 'B']);
    expect(getCurrentBidderTeamId(session)).toBe('A');
    expect(getCurrentBidderTeamId(session)).not.toBe(session.currentLot?.highBidder);

    session = ok(recordBid(session, 'A', 900));
    expect(getCurrentBidderTeamId(session)).toBe('B');
    expect(getCurrentBidderTeamId(session)).not.toBe(session.currentLot?.highBidder);

    session = ok(passBid(session, 'B'));
    expect(session.state).toBe('RESOLVE');
    expect(session.currentLot?.bidTurnTeamId).toBeNull();

    session = ok(evaluateResolve(session));

    expect(session.state).toBe('SOLD');
    expect(session.results.at(-1)).toMatchObject({
      playerId: 'star',
      disposition: 'SOLD',
      winnerTeamId: 'A',
      salary: 900,
    });
  });

  test('nextBidTurn wraps cyclically through nomination order', () => {
    expect(nextBidTurn(['A', 'B', 'C'], ['A', 'C'], 'C', 'C')).toBe('A');
    expect(nextBidTurn(['A', 'B', 'C'], ['A', 'C'], 'A', 'A')).toBe('C');
    expect(nextBidTurn(['A', 'B', 'C'], ['C'], 'A', 'C')).toBeNull();
    expect(nextBidTurn(['A', 'B', 'C'], ['B', 'C'], 'missing', null)).toBe('B');
  });

  test('PASSED path records no winner when every bidder passes before a bid', () => {
    let session = makeSession();

    session = ok(nominatePlayer(session, 'star'));
    session = passLotByDecision(session);

    expect(session.state).toBe('PASSED');
    expect(session.results[0]).toMatchObject({
      playerId: 'star',
      disposition: 'PASSED',
      winnerTeamId: null,
      salary: null,
    });
    expect(session.passedTracker.star).toMatchObject({
      totalPasses: 1,
      passCountSinceLastSale: 1,
      blockedUntilSaleCount: 1,
      setAside: false,
    });
    expect(session.availablePlayerIds).not.toContain('star');
  });

  test('lone survivor with no bid must tap to claim before SOLD at reserve', () => {
    let session = makeSession({
      teams: [
        { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 0 },
        { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 0 },
      ],
      nominationOrder: ['A', 'B'],
    });

    session = ok(nominatePlayer(session, 'star'));
    session = ok(passBid(session, 'B'));
    session = ok(evaluateResolve(session));

    expect(session.state).toBe('RESOLVE');
    expect(session.pendingClaim).toEqual({ playerId: 'star', teamId: 'A', price: 700 });

    session = ok(claimLoneSurvivor(session));

    expect(session.state).toBe('SOLD');
    expect(session.results[0]).toMatchObject({
      playerId: 'star',
      disposition: 'SOLD',
      winnerTeamId: 'A',
      salary: 700,
    });
  });

  test('lone survivor with no bid can tap pass and force PASSED', () => {
    let session = makeSession({
      teams: [
        { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 2, minSalary: 0 },
        { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 2, minSalary: 0 },
      ],
      nominationOrder: ['A', 'B'],
    });

    session = ok(nominatePlayer(session, 'star'));
    session = ok(passBid(session, 'B'));
    session = ok(evaluateResolve(session));
    session = ok(passLoneSurvivor(session));

    expect(session.state).toBe('PASSED');
    expect(session.results[0]).toMatchObject({
      playerId: 'star',
      disposition: 'PASSED',
      winnerTeamId: null,
      salary: null,
    });
  });

  test('rejects bids below the increment and above the solvency cap without changing the lot', () => {
    let session = makeSession({
      teams: [
        { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 2, minSalary: 0 },
        { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 2, minSalary: 0 },
        { teamId: 'C', budgetRemaining: 750, rosterSlotsRemaining: 1, minSalary: 0 },
      ],
    });

    session = ok(nominatePlayer(session, 'star'));
    session = ok(recordBid(session, 'A', 700));

    const belowIncrement = reject(recordBid(session, 'B', 799));
    expect(belowIncrement.reason).toBe('bid-below-minimum');
    expect(belowIncrement.session.currentLot?.highBid).toBe(700);

    const aboveCap = reject(recordBid(session, 'C', 800));
    expect(aboveCap.reason).toBe('bid-above-solvency-cap');
    expect(aboveCap.session.currentLot?.highBidder).toBe('A');
  });

  test('pass is out-for-this-lot and stillIn only shrinks', () => {
    let session = makeSession();

    session = ok(nominatePlayer(session, 'star'));
    expect(session.currentLot?.stillIn).toEqual(['A', 'B', 'C']);

    session = ok(passBid(session, 'B'));
    expect(session.currentLot?.stillIn).toEqual(['A', 'C']);

    const duplicatePass = reject(passBid(session, 'B'));
    expect(duplicatePass.reason).toBe('team-not-in-lot');
    expect(duplicatePass.session.currentLot?.stillIn).toEqual(['A', 'C']);
  });

  test('a passed player is not re-nominatable until another player sells', () => {
    let session = makeSession();

    session = ok(nominatePlayer(session, 'star'));
    session = passLotByDecision(session);
    session = ok(rotateNomination(session));

    const beforeSale = reject(nominatePlayer(session, 'star'));
    expect(beforeSale.reason).toBe('player-blocked-until-sale');

    session = ok(nominatePlayer(session, 'cheap'));
    session = ok(recordBid(session, 'B', 250));
    session = ok(passBid(session, 'A'));
    session = ok(passBid(session, 'C'));
    session = ok(evaluateResolve(session));
    expect(session.saleCount).toBe(1);
    expect(session.availablePlayerIds).toContain('star');

    session = ok(rotateNomination(session));
    expect(getCurrentNominator(session)).toBe('C');
    session = ok(nominatePlayer(session, 'star'));
    expect(session.currentLot?.playerId).toBe('star');
  });

  test('a second pass in the same no-sale window sets the player aside', () => {
    let session = makeSession();

    session = ok(nominatePlayer(session, 'star'));
    session = passLotByDecision(session);

    const restoredNoSaleWindow: AuctionSession = {
      ...session,
      state: 'NOMINATION',
      currentLot: null,
      nominationIndex: 1,
      availablePlayerIds: ['star', 'cheap', 'filler'],
    };

    session = ok(nominatePlayer(restoredNoSaleWindow, 'star'));
    session = passLotByDecision(session);

    expect(session.state).toBe('PASSED');
    expect(session.passedTracker.star).toMatchObject({
      totalPasses: 2,
      passCountSinceLastSale: 2,
      setAside: true,
    });
    expect(session.setAsidePlayerIds).toContain('star');
    expect(session.results.at(-1)).toMatchObject({
      playerId: 'star',
      disposition: 'SET_ASIDE',
    });
  });

  test('the nominator cannot self-re-nominate a just-passed player in the same rotation cycle', () => {
    const previousPass: PassedPlayerTracker = {
      totalPasses: 1,
      passCountSinceLastSale: 1,
      lastPassSaleCount: 0,
      blockedUntilSaleCount: 1,
      lastPassNominatorTeamId: 'A',
      lastPassNominationRound: 0,
      setAside: false,
    };
    const session: AuctionSession = {
      ...makeSession(),
      saleCount: 1,
      nominationRound: 0,
      availablePlayerIds: ['star', 'cheap', 'filler'],
      passedTracker: { star: previousPass },
    };

    const result = reject(nominatePlayer(session, 'star'));

    expect(result.reason).toBe('player-blocked-by-nominator-cycle');
  });

  test('auction completes immediately when the last open roster slot is filled', () => {
    let session = makeSession({
      teams: [
        { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 0 },
        { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 0 },
      ],
      nominationOrder: ['A', 'B'],
    });

    session = ok(nominatePlayer(session, 'star'));
    session = ok(recordBid(session, 'A', 700));
    session = ok(passBid(session, 'B'));
    session = ok(evaluateResolve(session));
    expect(session.state).toBe('SOLD');
    session = ok(rotateNomination(session));

    session = ok(nominatePlayer(session, 'cheap'));
    session = ok(recordBid(session, 'B', 250));
    session = ok(evaluateResolve(session));

    expect(session.state).toBe('AUCTION_COMPLETE');
    expect(session.teams.every((team) => team.rosterSlotsRemaining === 0)).toBe(true);
  });

  test('fixed-cyclic nomination rotation skips teams with full rosters', () => {
    let session = makeSession({
      teams: [
        { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 0 },
        { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 0, minSalary: 0 },
        { teamId: 'C', budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 0 },
      ],
      nominationOrder: ['A', 'B', 'C'],
    });

    expect(getCurrentNominator(session)).toBe('A');

    session = ok(nominatePlayer(session, 'star'));
    session = ok(recordBid(session, 'A', 700));
    session = ok(passBid(session, 'C'));
    session = ok(evaluateResolve(session));
    session = ok(rotateNomination(session));

    expect(session.state).toBe('NOMINATION');
    expect(getCurrentNominator(session)).toBe('C');
  });

  test('seeded nomination order is deterministic and fixed after setup', () => {
    const first = seededNominationOrder(['A', 'B', 'C', 'D'], 'seed-1');
    const second = seededNominationOrder(['A', 'B', 'C', 'D'], 'seed-1');
    const differentSeed = seededNominationOrder(['A', 'B', 'C', 'D'], 'seed-2');

    expect(first).toEqual(second);
    expect(first).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));
    expect(differentSeed).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));
    expect(new Set(first).size).toBe(4);
  });
});
