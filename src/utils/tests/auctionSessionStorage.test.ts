import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import type { CpuShillAuctionSession } from '../../engines/cpuShillBidding';
import {
  __resetLeagueBuilderDatabaseForTests,
  createAuctionSessionId,
  deleteAuctionSession,
  getAuctionSession,
  saveAuctionSession,
} from '../leagueBuilderStorage';

const DB_NAME = 'kbl-league-builder';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function waitForTimestampTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

function buildMidAuctionSession(): CpuShillAuctionSession {
  return {
    state: 'OPEN_BIDDING',
    config: {
      format: 'auction',
      bidIncrement: 5_000,
      turnTimerSeconds: null,
      nominationOrderSeed: 'nomination-seed-auc-3-1',
      cpuShillCount: 2,
      excludeFromLeague: true,
    },
    teams: [
      {
        teamId: 'team-a',
        budgetRemaining: 115_000,
        rosterSlotsRemaining: 20,
        minSalary: 5_000,
        projectedTax: 0,
        roster: [{ playerId: 'sold-prior-a', salary: 35_000 }],
      },
      {
        teamId: 'team-b',
        budgetRemaining: 80_000,
        rosterSlotsRemaining: 19,
        minSalary: 5_000,
        projectedTax: 12_500,
        roster: [
          { playerId: 'sold-prior-b', salary: 40_000 },
          { playerId: 'sold-prior-c', salary: 25_000 },
        ],
      },
      {
        teamId: 'team-c',
        budgetRemaining: 145_000,
        rosterSlotsRemaining: 21,
        minSalary: 5_000,
        projectedTax: 0,
        roster: [],
      },
    ],
    nominationOrder: ['team-b', 'team-c', 'team-a'],
    nominationIndex: 1,
    nominationRound: 2,
    players: {
      'lot-player': {
        playerId: 'lot-player',
        iv: 90_000,
        ivPercentile: 0.91,
      },
      'available-player': {
        playerId: 'available-player',
        iv: 72_000,
        ivPercentile: 0.74,
      },
      'passed-player': {
        playerId: 'passed-player',
        iv: 48_000,
        ivPercentile: 0.38,
      },
      'set-aside-player': {
        playerId: 'set-aside-player',
        iv: 38_000,
        ivPercentile: 0.24,
      },
    },
    playerOrder: ['lot-player', 'available-player', 'passed-player', 'set-aside-player'],
    availablePlayerIds: ['available-player', 'passed-player'],
    currentLot: {
      playerId: 'lot-player',
      nominatorTeamId: 'team-c',
      openingAsk: 30_000,
      highBid: 55_000,
      highBidder: 'team-a',
      stillIn: ['team-a', 'team-b'],
    },
    pendingClaim: null,
    results: [
      {
        playerId: 'sold-prior-a',
        disposition: 'SOLD',
        nominatorTeamId: 'team-b',
        winnerTeamId: 'team-a',
        salary: 35_000,
      },
      {
        playerId: 'set-aside-player',
        disposition: 'SET_ASIDE',
        nominatorTeamId: 'team-c',
        winnerTeamId: null,
        salary: null,
      },
    ],
    saleCount: 1,
    cpuShills: {
      'team-b': {
        teamId: 'team-b',
        personality: 'sniper',
        bandPriorities: {
          Power: 4,
          Contact: 3,
          Speed: 1,
          Defense: 5,
          Rotation: 2,
          Bullpen: 0,
        },
        personalityBias: 0.96,
        interestAggression: 0.72,
        maxInterestProbability: 0.68,
      },
      'team-c': {
        teamId: 'team-c',
        personality: 'zealot',
        bandPriorities: {
          Power: 5,
          Contact: 1,
          Speed: 2,
          Defense: 0,
          Rotation: 4,
          Bullpen: 3,
        },
        personalityBias: 1.14,
        interestAggression: 1.22,
        maxInterestProbability: 0.89,
      },
    },
  };
}

describe('auction session storage', () => {
  beforeEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test('saveAuctionSession, getAuctionSession, and deleteAuctionSession preserve the full CpuShillAuctionSession blob', async () => {
    const session = buildMidAuctionSession();
    const row = {
      id: createAuctionSessionId('league-auction', 2),
      leagueId: 'league-auction',
      seasonNumber: 2,
      seed: session.config.nominationOrderSeed,
      session,
    };

    const saved = await saveAuctionSession(row);
    expect(saved.id).toBe('league-auction::startup-auction-draft::2');
    expect(saved.seed).toBe(session.config.nominationOrderSeed);
    expect(saved.session).toEqual(session);

    const loaded = await getAuctionSession(row.leagueId, row.seasonNumber);
    expect(loaded).toEqual(saved);
    expect(loaded?.session).toEqual(session);

    await waitForTimestampTick();
    const resaved = await saveAuctionSession({
      id: row.id,
      leagueId: row.leagueId,
      seasonNumber: row.seasonNumber,
      seed: row.seed,
      session: {
        ...session,
        nominationIndex: 2,
        currentLot: {
          ...session.currentLot!,
          highBid: 60_000,
          highBidder: 'team-b',
          stillIn: ['team-b'],
        },
        saleCount: 2,
      },
    });

    expect(resaved.createdDate).toBe(saved.createdDate);
    expect(new Date(resaved.lastModified).getTime()).toBeGreaterThan(new Date(saved.lastModified).getTime());
    expect(resaved.session.nominationIndex).toBe(2);
    expect(resaved.session.currentLot?.highBid).toBe(60_000);
    expect(resaved.session.cpuShills).toEqual(session.cpuShills);

    await deleteAuctionSession(row.leagueId, row.seasonNumber);
    await expect(getAuctionSession(row.leagueId, row.seasonNumber)).resolves.toBeNull();
  });
});
