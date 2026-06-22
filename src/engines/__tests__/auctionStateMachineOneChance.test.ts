import { describe, expect, test } from 'vitest';

import { reservePriceCurve } from '../../data/rosterEngineConstants';
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
      teams: [{ teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 10, minSalary: 0 }],
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
        { teamId: 'A', budgetRemaining: 10_000, rosterSlotsRemaining: 3, minSalary: 0 },
        { teamId: 'B', budgetRemaining: 10_000, rosterSlotsRemaining: 3, minSalary: 0 },
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
});
