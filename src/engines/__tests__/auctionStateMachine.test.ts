import { describe, expect, test } from 'vitest';

import {
  recordBid,
  type AuctionPlayer,
  type AuctionSession,
  nextBidTurn,
  seededNominationOrder,
} from '../auctionStateMachine';

describe('auctionStateMachine pure helpers', () => {
  test('nextBidTurn wraps cyclically through nomination order', () => {
    expect(nextBidTurn(['A', 'B', 'C'], ['A', 'C'], 'C', 'C')).toBe('A');
    expect(nextBidTurn(['A', 'B', 'C'], ['A', 'C'], 'A', 'A')).toBe('C');
    expect(nextBidTurn(['A', 'B', 'C'], ['C'], 'A', 'C')).toBeNull();
    expect(nextBidTurn(['A', 'B', 'C'], ['B', 'C'], 'missing', null)).toBe('B');
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

  test('an empty roster can place the first enriched MLB bid when the pool contains a CP', () => {
    const hitter = (id: string, position: string, secondaryPosition: string | null = 'IF'): AuctionPlayer => ({
      playerId: id,
      iv: 10_000,
      ivPercentile: 50,
      pos: { isPitcher: false, position, secondaryPosition },
    });
    const arm = (id: string, role: string, iv = 10_000): AuctionPlayer => ({
      playerId: id,
      iv,
      ivPercentile: 50,
      pos: { isPitcher: true, position: 'P', role },
    });
    const candidate = hitter('lot-c', 'C', null);
    const remaining: AuctionPlayer[] = [
      hitter('primary-1b', '1B', '1B/OF'),
      hitter('primary-2b', '2B', 'IF'),
      hitter('primary-3b', '3B', 'IF'),
      hitter('primary-ss', 'SS', 'IF'),
      hitter('primary-lf', 'LF', 'OF'),
      hitter('primary-cf', 'CF', 'OF'),
      hitter('primary-rf', 'RF', 'OF'),
      hitter('backup-c', 'C', null),
      hitter('bench-1b', '1B', '1B/OF'),
      hitter('bench-2b', '2B', 'IF/OF'),
      hitter('bench-lf', 'LF', 'OF'),
      hitter('bench-cf', 'CF', 'OF'),
      hitter('bench-ss', 'SS', 'IF'),
      arm('sp-1', 'SP'),
      arm('sp-2', 'SP'),
      arm('sp-3', 'SP'),
      arm('sp-4', 'SP'),
      arm('rp-1', 'RP', 5_000),
      arm('rp-2', 'RP', 5_000),
      arm('rp-3', 'RP', 5_000),
      arm('rp-4', 'RP', 5_000),
      arm('cp-pricier', 'CP', 8_000),
    ];
    const session: AuctionSession = {
      state: 'OPEN_BIDDING',
      config: {
        format: 'auction',
        bidIncrement: 1_000,
        turnTimerSeconds: null,
        nominationOrderSeed: 'closer-first-bid',
        flatReserveFloor: null,
        cpuShillCount: 0,
        excludeFromLeague: true,
      },
      teams: [
        {
          teamId: 'team-a',
          budgetRemaining: 500_000,
          rosterSlotsRemaining: 22,
          minSalary: 1_000,
          projectedTax: 0,
          roster: [],
        },
        {
          teamId: 'team-b',
          budgetRemaining: 500_000,
          rosterSlotsRemaining: 22,
          minSalary: 1_000,
          projectedTax: 0,
          roster: [],
        },
      ],
      nominationOrder: ['team-a', 'team-b'],
      nominationIndex: 0,
      nominationRound: 0,
      players: Object.fromEntries([candidate, ...remaining].map((player) => [player.playerId, player])),
      playerOrder: [candidate, ...remaining].map((player) => player.playerId),
      availablePlayerIds: remaining.map((player) => player.playerId),
      currentLot: {
        playerId: candidate.playerId,
        nominatorTeamId: 'team-a',
        openingAsk: 1_000,
        highBid: null,
        highBidder: null,
        stillIn: ['team-a', 'team-b'],
        bidTurnTeamId: 'team-a',
        bidLog: [],
      },
      pendingClaim: null,
      results: [],
      saleCount: 0,
    };

    const result = recordBid(session, 'team-a', 1_000);
    expect(result.ok).toBe(true);
    if (!result.ok) expect(result.reason).not.toBe('bid-strands-roster');
  });
});
