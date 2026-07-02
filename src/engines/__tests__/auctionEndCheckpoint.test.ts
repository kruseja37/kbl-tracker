import { describe, expect, test } from 'vitest';

import {
  advanceLot,
  claimLoneSurvivor,
  getTeamAuctionMaxBid,
  initAuctionSession,
  passBid,
  recordBid,
  resolveLot,
  surfaceNextPlayer,
  type AuctionSession,
} from '../auctionStateMachine';

/**
 * FABLE-C3 END-CHECKPOINT (audit FS-3): teams in `config.nonCompletingTeamIds` — the
 * pure-pressure shills — never block auction completion, are never force-filled, and carry a
 * full-budget ceiling. Sessions WITHOUT the field keep the historical everyone-must-fill
 * semantics (the saved-session compatibility pin).
 */

function drive(result: { ok: boolean; session: AuctionSession; reason?: string }): AuctionSession {
  expect(result.ok, result.ok ? undefined : `rejected: ${result.reason}`).toBe(true);
  return result.session;
}

const PLAYERS = [
  { playerId: 'p1', iv: 40_000, ivPercentile: 80 },
  { playerId: 'p2', iv: 30_000, ivPercentile: 50 },
  { playerId: 'p3', iv: 20_000, ivPercentile: 20 },
];

function makeSession(nonCompleting: boolean): AuctionSession {
  return initAuctionSession({
    teams: [
      { teamId: 'real-1', budgetRemaining: 500_000, rosterSlotsRemaining: 1 },
      { teamId: 'shill-1', budgetRemaining: 500_000, rosterSlotsRemaining: 22 },
    ],
    players: PLAYERS,
    nominationOrder: ['real-1', 'shill-1'],
    config: {
      bidIncrement: 1_000,
      nominationOrderSeed: 'end-checkpoint',
      ...(nonCompleting ? { nonCompletingTeamIds: ['shill-1'] } : {}),
    },
  });
}

describe('the end-checkpoint', () => {
  test('the auction completes when every COMPLETING team is full, shill slots open', () => {
    let session = makeSession(true);
    session = drive(surfaceNextPlayer(session));
    const ask = session.currentLot!.openingAsk;
    session = drive(recordBid(session, 'real-1', ask));
    session = drive(passBid(session, 'shill-1'));
    session = drive(resolveLot(session));

    // The one real seat is filled → complete, despite the shill's 22 open slots.
    expect(session.state).toBe('AUCTION_COMPLETE');
    expect(session.teams.find((t) => t.teamId === 'shill-1')!.rosterSlotsRemaining).toBe(22);
  });

  test('saved-session compatibility: without the field, the shill still blocks completion', () => {
    let session = makeSession(false);
    session = drive(surfaceNextPlayer(session));
    const ask = session.currentLot!.openingAsk;
    session = drive(recordBid(session, 'real-1', ask));
    session = drive(passBid(session, 'shill-1'));
    session = drive(resolveLot(session));

    expect(session.state).toBe('SOLD');
    expect(session.state).not.toBe('AUCTION_COMPLETE');
  });

  test('a shill can win lots but is never FORCE-fed a no-bid lot', () => {
    // Real team full from the start → only the shill has slots. A no-bid lot must pass out
    // permanently rather than be forced onto the pure-pressure shill.
    let session = initAuctionSession({
      teams: [
        { teamId: 'real-1', budgetRemaining: 500_000, rosterSlotsRemaining: 0 },
        { teamId: 'shill-1', budgetRemaining: 500_000, rosterSlotsRemaining: 22 },
      ],
      players: PLAYERS,
      nominationOrder: ['real-1', 'shill-1'],
      config: {
        bidIncrement: 1_000,
        nominationOrderSeed: 'forced-skip',
        nonCompletingTeamIds: ['shill-1'],
      },
    });
    // With the end-checkpoint, this session is complete at init (the only completing team is full).
    expect(session.state).toBe('AUCTION_COMPLETE');
  });

  test('shill ceiling is its full remaining budget; a real team keeps the completion reserve', () => {
    let session = makeSession(true);
    session = drive(surfaceNextPlayer(session));
    expect(getTeamAuctionMaxBid(session, 'shill-1')).toBe(500_000);
    // The real team has 1 slot and a lot open → candidate-aware ceiling = full budget too
    // (nothing left to reserve), but via the completion path, not the shill bypass.
    expect(getTeamAuctionMaxBid(session, 'real-1')).toBeGreaterThan(0);
  });

  test('a shill outbidding the real team still leaves the draft finishable (pool covers both)', () => {
    let session = initAuctionSession({
      teams: [
        { teamId: 'real-1', budgetRemaining: 500_000, rosterSlotsRemaining: 1 },
        { teamId: 'shill-1', budgetRemaining: 500_000, rosterSlotsRemaining: 22 },
      ],
      players: PLAYERS,
      nominationOrder: ['real-1', 'shill-1'],
      config: {
        bidIncrement: 1_000,
        nominationOrderSeed: 'shill-wins',
        nonCompletingTeamIds: ['shill-1'],
      },
    });
    // Lot 1: the shill outbids and wins.
    session = drive(surfaceNextPlayer(session));
    const ask1 = session.currentLot!.openingAsk;
    const first = session.currentLot!.bidTurnTeamId!;
    const second = session.currentLot!.stillIn.find((id) => id !== first)!;
    session = drive(recordBid(session, first, ask1));
    session = drive(recordBid(session, second, ask1 + 1_000));
    const shillBid = session.currentLot!.highBidder === 'shill-1'
      ? session
      : drive(recordBid(session, 'shill-1', session.currentLot!.highBid! + 1_000));
    session = drive(passBid(shillBid, 'real-1'));
    session = drive(resolveLot(session));
    expect(session.state).toBe('SOLD');
    expect(session.results.at(-1)!.winnerTeamId).toBe('shill-1');
    session = drive(advanceLot(session));

    // Lot 2: the real team claims as lone survivor → complete.
    session = drive(surfaceNextPlayer(session));
    session = drive(passBid(session, 'shill-1'));
    session = drive(resolveLot(session));
    expect(session.pendingClaim?.teamId).toBe('real-1');
    session = drive(claimLoneSurvivor(session));
    expect(session.state).toBe('AUCTION_COMPLETE');
    expect(session.teams.find((t) => t.teamId === 'real-1')!.rosterSlotsRemaining).toBe(0);
  });
});
