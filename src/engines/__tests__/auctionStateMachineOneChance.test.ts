import { describe, expect, test } from 'vitest';

import { LEAGUE_MINIMUM_SALARY, reservePriceCurve } from '../../data/rosterEngineConstants';
import {
  advanceLot,
  initAuctionSession,
  passBid,
  passLoneSurvivorOut,
  recordBid,
  resolveLot,
  selectNextNominee,
  surfaceNextPlayer,
  type AuctionPlayer,
  type AuctionResult,
  type AuctionSession,
  type AuctionTeamInput,
  type AuctionTransitionResult,
} from '../auctionStateMachine';

const BASE_CONFIG = {
  format: 'auction' as const,
  bidIncrement: 100,
  turnTimerSeconds: null,
  nominationOrderSeed: 'one-chance-seed',
  cpuShillCount: 0,
  excludeFromLeague: true,
};

const PLAYERS = [
  { playerId: 'low', iv: 400, ivPercentile: 5 },
  { playerId: 'mid', iv: 700, ivPercentile: 45 },
  { playerId: 'high', iv: 1_000, ivPercentile: 98 },
] as const;

function makeSession(overrides: {
  seed?: string;
  flatReserveFloor?: number;
  nominationWeightExponent?: number;
  teams?: readonly AuctionTeamInput[];
  players?: readonly AuctionPlayer[];
  nominationOrder?: readonly string[];
} = {}): AuctionSession {
  return initAuctionSession({
    config: {
      ...BASE_CONFIG,
      nominationOrderSeed: overrides.seed ?? BASE_CONFIG.nominationOrderSeed,
      nominationWeightExponent: overrides.nominationWeightExponent,
      flatReserveFloor: overrides.flatReserveFloor,
    },
    teams: overrides.teams ?? [
      { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 3, minSalary: 0 },
      { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 3, minSalary: 0 },
      { teamId: 'C', budgetRemaining: 10_000, rosterSlotsRemaining: 3, minSalary: 0 },
    ],
    players: overrides.players ?? PLAYERS,
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

function permanentNoBidPass(session: AuctionSession): AuctionSession {
  const bidder = session.currentLot?.bidTurnTeamId;
  if (bidder === null || bidder === undefined) throw new Error('Expected a bidder to pass');
  let next = ok(passBid(session, bidder));
  next = ok(resolveLot(next));
  return next;
}

function passAllNoBidActors(session: AuctionSession): AuctionSession {
  let next = session;

  while (next.state === 'OPEN_BIDDING') {
    const bidder = next.currentLot?.bidTurnTeamId;
    if (bidder === null || bidder === undefined) throw new Error('Expected a bidder to pass');
    next = ok(passBid(next, bidder));
  }

  if (next.state === 'RESOLVE') {
    next = ok(resolveLot(next));
  }
  if (next.state === 'RESOLVE' && next.pendingClaim !== null) {
    next = ok(passLoneSurvivorOut(next));
  }

  return next;
}

function drainAllPassAuction(session: AuctionSession): AuctionSession {
  let next = session;

  while (next.state !== 'AUCTION_COMPLETE') {
    next = ok(surfaceNextPlayer(next));
    if (next.state === 'AUCTION_COMPLETE') break;
    next = passAllNoBidActors(next);
    if (next.state !== 'AUCTION_COMPLETE') {
      next = ok(advanceLot(next));
    }
  }

  return next;
}

const PRIOR_RESULT: AuctionResult = {
  playerId: 'already-surfaced',
  disposition: 'PASSED',
  nominatorTeamId: 'A',
  winnerTeamId: null,
  salary: null,
};

describe('auctionStateMachine one-chance engine path', () => {
  test('selectNextNominee is deterministic and favors high percentile players with a high exponent', () => {
    const session = makeSession({ nominationWeightExponent: 8 });

    expect(selectNextNominee(session)).toBe('high');
    expect(selectNextNominee(session)).toBe('high');
    expect(selectNextNominee({ ...session, availablePlayerIds: [...session.availablePlayerIds] })).toBe('high');
  });

  test('surface resolve advance drains every pool player exactly once', () => {
    let session = makeSession({
      teams: [{ teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 10, minSalary: 0 }],
      nominationOrder: ['A'],
    });
    const surfaced: string[] = [];

    while (session.state !== 'AUCTION_COMPLETE') {
      session = ok(surfaceNextPlayer(session));
      if (session.state === 'AUCTION_COMPLETE') break;

      const playerId = session.currentLot?.playerId;
      if (playerId === undefined) throw new Error('Expected a surfaced player');
      surfaced.push(playerId);

      session = permanentNoBidPass(session);
      session = ok(advanceLot(session));
    }

    expect(surfaced).toHaveLength(PLAYERS.length);
    expect(new Set(surfaced).size).toBe(PLAYERS.length);
    expect(surfaced.sort()).toEqual(PLAYERS.map((player) => player.playerId).sort());
    expect(session.results).toHaveLength(PLAYERS.length);
    expect(session.availablePlayerIds).toEqual([]);
  });

  test('surfaceNextPlayer opens an engine-selected reserve lot and rejects invalid states', () => {
    const session = makeSession({ nominationOrder: ['B', 'C', 'A'] });
    const selectedPlayerId = selectNextNominee(session);
    if (selectedPlayerId === null) throw new Error('Expected a nominee');
    const selectedPlayer = session.players[selectedPlayerId];

    const opened = ok(surfaceNextPlayer(session));

    expect(opened.state).toBe('OPEN_BIDDING');
    expect(opened.currentLot).toMatchObject({
      playerId: selectedPlayerId,
      nominatorTeamId: 'B',
      openingAsk: reservePriceCurve(selectedPlayer.ivPercentile) * selectedPlayer.iv,
      highBid: null,
      highBidder: null,
      stillIn: ['A', 'B', 'C'],
      bidTurnTeamId: 'B',
    });
    expect(opened.availablePlayerIds).not.toContain(selectedPlayerId);
    expect(opened.pendingClaim).toBeNull();

    expect(reject(surfaceNextPlayer(opened)).reason).toBe('expected-nomination');
    expect(reject(surfaceNextPlayer({ ...session, currentLot: opened.currentLot })).reason).toBe('current-lot-open');
    expect(reject(surfaceNextPlayer({ ...session, state: 'AUCTION_COMPLETE' })).reason).toBe('auction-complete');
  });

  test('a no-bid player is permanently out and never re-surfaces', () => {
    let session = makeSession({
      teams: [{ teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 0 }],
      nominationOrder: ['A'],
    });

    session = ok(surfaceNextPlayer(session));
    const passedPlayerId = session.currentLot?.playerId;
    if (passedPlayerId === undefined) throw new Error('Expected first surfaced player');

    session = permanentNoBidPass(session);

    expect(session.state).toBe('PASSED');
    expect(session.results).toHaveLength(1);
    expect(session.results[0]).toMatchObject({
      playerId: passedPlayerId,
      disposition: 'PASSED',
      winnerTeamId: null,
      salary: null,
    });
    expect(session.passedTracker[passedPlayerId]).toBeUndefined();
    expect(session.availablePlayerIds).not.toContain(passedPlayerId);
    expect(session.setAsidePlayerIds).not.toContain(passedPlayerId);

    session = ok(advanceLot(session));
    session = ok(surfaceNextPlayer(session));

    expect(session.currentLot?.playerId).not.toBe(passedPlayerId);
  });

  test('resume-safe selection depends on the seed and persisted result count', () => {
    const first = {
      ...makeSession({ seed: 'resume-seed' }),
      results: [PRIOR_RESULT],
    };
    const second = {
      ...makeSession({ seed: 'resume-seed' }),
      results: [PRIOR_RESULT],
    };

    expect(selectNextNominee(first)).toBe('mid');
    expect(selectNextNominee(second)).toBe('mid');
  });

  test('advanceLot completes when the pool is empty', () => {
    let session = makeSession({
      teams: [{ teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 10, minSalary: 0 }],
      players: [{ playerId: 'only', iv: 500, ivPercentile: 50 }],
      nominationOrder: ['A'],
    });

    session = ok(surfaceNextPlayer(session));
    session = permanentNoBidPass(session);
    session = ok(advanceLot(session));

    expect(session.state).toBe('AUCTION_COMPLETE');
    expect(session.currentLot).toBeNull();
    expect(session.pendingClaim).toBeNull();
  });

  test('advanceLot completes when all teams are full', () => {
    let session = makeSession({
      teams: [{ teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 0 }],
      nominationOrder: ['A'],
    });

    session = ok(surfaceNextPlayer(session));
    const lot = session.currentLot;
    if (lot === null || lot.bidTurnTeamId === null) throw new Error('Expected a bidder');
    session = ok(recordBid(session, lot.bidTurnTeamId, lot.openingAsk));
    session = ok(resolveLot(session));

    expect(session.state).toBe('AUCTION_COMPLETE');
    expect(session.passedTracker).toEqual({});
    expect(session.setAsidePlayerIds).toEqual([]);
    expect(ok(advanceLot(session)).state).toBe('AUCTION_COMPLETE');
  });

  test('passLoneSurvivorOut permanently passes a pending one-chance claim', () => {
    let session = makeSession({
      teams: [
        { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 0 },
        { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 0 },
      ],
      nominationOrder: ['A', 'B'],
    });

    session = ok(surfaceNextPlayer(session));
    const playerId = session.currentLot?.playerId;
    if (playerId === undefined) throw new Error('Expected a surfaced player');
    session = ok(passBid(session, 'B'));
    session = ok(resolveLot(session));

    expect(session.state).toBe('RESOLVE');
    expect(session.pendingClaim).toMatchObject({ playerId, teamId: 'A' });

    session = ok(passLoneSurvivorOut(session));

    expect(session.state).toBe('PASSED');
    expect(session.passedTracker[playerId]).toBeUndefined();
    expect(session.availablePlayerIds).not.toContain(playerId);
  });

  test('flatReserveFloor opens every surfaced farm player at the same floor', () => {
    const players = [
      { playerId: 'low-prospect', iv: 250, ivPercentile: 3 },
      { playerId: 'elite-prospect', iv: 4_000, ivPercentile: 99 },
    ];
    let session = makeSession({
      flatReserveFloor: LEAGUE_MINIMUM_SALARY,
      teams: [{ teamId: 'A', budgetRemaining: 20_000, rosterSlotsRemaining: 2 }],
      players,
      nominationOrder: ['A'],
    });
    const openingAsks: number[] = [];

    for (let i = 0; i < players.length; i += 1) {
      session = ok(surfaceNextPlayer(session));
      if (session.currentLot === null) throw new Error('Expected a surfaced farm player');
      openingAsks.push(session.currentLot.openingAsk);
      session = passAllNoBidActors(session);
      if (session.state !== 'AUCTION_COMPLETE') {
        session = ok(advanceLot(session));
      }
    }

    expect(openingAsks).toEqual([LEAGUE_MINIMUM_SALARY, LEAGUE_MINIMUM_SALARY]);

    const curveSession = makeSession({ players, nominationOrder: ['A'] });
    const selectedPlayerId = selectNextNominee(curveSession);
    if (selectedPlayerId === null) throw new Error('Expected a curve-priced nominee');
    const opened = ok(surfaceNextPlayer(curveSession));
    const selectedPlayer = curveSession.players[selectedPlayerId];

    expect(opened.currentLot?.openingAsk).toBe(
      reservePriceCurve(selectedPlayer.ivPercentile) * selectedPlayer.iv,
    );
  });

  test('tight all-pass one-chance auction force-claims every player and fills every roster', () => {
    const session = drainAllPassAuction(makeSession({
      flatReserveFloor: LEAGUE_MINIMUM_SALARY,
      teams: [
        { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 1 },
        { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 1 },
      ],
      players: [
        { playerId: 'filler-1', iv: 1_000, ivPercentile: 10 },
        { playerId: 'filler-2', iv: 2_000, ivPercentile: 90 },
      ],
      nominationOrder: ['A', 'B'],
    }));

    expect(session.state).toBe('AUCTION_COMPLETE');
    expect(session.teams.map((team) => team.rosterSlotsRemaining)).toEqual([0, 0]);
    expect(session.results).toHaveLength(2);
    expect(session.results.every((result) => result.disposition === 'SOLD')).toBe(true);
    expect(session.results.filter((result) => result.disposition === 'PASSED')).toHaveLength(0);
  });

  test('non-tight all-pass lot remains a permanent one-chance pass', () => {
    let session = makeSession({
      flatReserveFloor: LEAGUE_MINIMUM_SALARY,
      teams: [
        { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 1 },
        { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 1 },
      ],
      players: [
        { playerId: 'extra-1', iv: 1_000, ivPercentile: 10 },
        { playerId: 'extra-2', iv: 2_000, ivPercentile: 50 },
        { playerId: 'extra-3', iv: 3_000, ivPercentile: 90 },
      ],
      nominationOrder: ['A', 'B'],
    });

    session = ok(surfaceNextPlayer(session));
    const passedPlayerId = session.currentLot?.playerId;
    session = passAllNoBidActors(session);

    expect(session.state).toBe('PASSED');
    expect(session.results).toHaveLength(1);
    expect(session.results[0]).toMatchObject({
      playerId: passedPlayerId,
      disposition: 'PASSED',
      winnerTeamId: null,
      salary: null,
    });
  });

  test('tight lone-survivor pass force-claims to the neediest eligible team', () => {
    let session = makeSession({
      flatReserveFloor: LEAGUE_MINIMUM_SALARY,
      teams: [
        { teamId: 'A', budgetRemaining: 20_000, rosterSlotsRemaining: 2 },
        { teamId: 'B', budgetRemaining: 20_000, rosterSlotsRemaining: 1 },
      ],
      players: [
        { playerId: 'needed-1', iv: 1_000, ivPercentile: 10 },
        { playerId: 'needed-2', iv: 2_000, ivPercentile: 50 },
        { playerId: 'needed-3', iv: 3_000, ivPercentile: 90 },
      ],
      nominationOrder: ['A', 'B'],
    });

    session = ok(surfaceNextPlayer(session));
    const playerId = session.currentLot?.playerId;
    if (playerId === undefined) throw new Error('Expected a surfaced player');
    session = ok(passBid(session, 'A'));
    session = ok(resolveLot(session));

    expect(session.state).toBe('RESOLVE');
    expect(session.pendingClaim).toMatchObject({ playerId, teamId: 'B' });

    session = ok(passLoneSurvivorOut(session));

    expect(session.state).toBe('SOLD');
    expect(session.results).toHaveLength(1);
    expect(session.results[0]).toMatchObject({
      playerId,
      disposition: 'SOLD',
      winnerTeamId: 'A',
      salary: LEAGUE_MINIMUM_SALARY,
    });
    expect(session.teams.find((team) => team.teamId === 'A')?.rosterSlotsRemaining).toBe(1);
    expect(session.teams.find((team) => team.teamId === 'B')?.rosterSlotsRemaining).toBe(1);
  });
});
