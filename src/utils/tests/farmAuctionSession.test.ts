import { describe, expect, test } from 'vitest';

import { FARM_AUCTION_ROSTER_SLOTS_PER_TEAM, buildFarmAuctionPool } from '../farmAuctionPool';
import { buildFarmAuctionSession } from '../farmAuctionSession';
import { computeFarmTierCap } from '../farmAuctionWallet';

const TEAMS = [
  { teamId: 'farm-team-a', teamName: 'Farm Team A' },
  { teamId: 'farm-team-b', teamName: 'Farm Team B' },
  { teamId: 'farm-team-c', teamName: 'Farm Team C' },
] as const;

const BASE_INPUT = {
  leagueId: 'auc-5-1d-farm-session-league',
  seasonNumber: 1,
  teams: TEAMS,
  seed: 'auc-5.1d-farm-session-seed',
  poolMultiplier: 1,
} as const;

function expectedDirectPool() {
  return buildFarmAuctionPool({
    leagueId: BASE_INPUT.leagueId,
    seasonNumber: BASE_INPUT.seasonNumber,
    seed: BASE_INPUT.seed,
    teamDraftOrder: TEAMS.map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
    })),
    poolMultiplier: BASE_INPUT.poolMultiplier,
  });
}

describe('buildFarmAuctionSession AUC-5.1d-1', () => {
  test('initializes the farm pool in the same auction state machine on true IV AuctionPlayers', () => {
    const { session, pool } = buildFarmAuctionSession(BASE_INPUT);

    expect(session.state).toBe('NOMINATION');
    expect(session.playerOrder).toEqual(pool.auctionPlayers.map((player) => player.playerId));
    expect(session.availablePlayerIds).toEqual(session.playerOrder);
    for (const player of pool.auctionPlayers) {
      expect(session.players[player.playerId]).toEqual(player);
      expect(session.players[player.playerId].iv).toBe(player.iv);
    }
  });

  test('derives the farm tier cap from the whole pool and gives empty farm rosters 10 slots', () => {
    const { session, pool, farmTierCap } = buildFarmAuctionSession(BASE_INPUT);
    const expectedFarmTierCap = computeFarmTierCap(pool.auctionPlayers.map((player) => player.iv));

    expect(farmTierCap).toBe(expectedFarmTierCap);
    for (const team of session.teams) {
      expect(team.budgetRemaining).toBe(farmTierCap);
      expect(team.rosterSlotsRemaining).toBe(FARM_AUCTION_ROSTER_SLOTS_PER_TEAM);
      expect(team.roster).toEqual([]);
    }
  });

  test('is deterministic by seed for the carried pool and nomination order', () => {
    const first = buildFarmAuctionSession(BASE_INPUT);
    const second = buildFarmAuctionSession(BASE_INPUT);

    expect(second.pool.prospects.map((prospect) => prospect.id)).toEqual(
      first.pool.prospects.map((prospect) => prospect.id),
    );
    expect(second.pool.auctionPlayers).toEqual(first.pool.auctionPlayers);
    expect(second.session.nominationOrder).toEqual(first.session.nominationOrder);
  });

  test('carries the generated prospect DTO pool through unchanged', () => {
    const result = buildFarmAuctionSession(BASE_INPUT);
    const directPool = expectedDirectPool();

    expect(result.pool.prospects).toEqual(directPool.prospects);
    expect(result.pool.auctionPlayers).toEqual(directPool.auctionPlayers);
  });

  test('uses the farm seed as the auction nomination-order seed while passing config through', () => {
    const { session } = buildFarmAuctionSession({
      ...BASE_INPUT,
      config: {
        nominationOrderSeed: 'ignored-config-seed',
        cpuShillCount: 2,
        bidIncrement: 250,
      },
    });

    expect(session.config.nominationOrderSeed).toBe(BASE_INPUT.seed);
    expect(session.config.cpuShillCount).toBe(2);
    expect(session.config.bidIncrement).toBe(250);
  });

  test('threads per-team MLB carryover into the initialized farm auction wallets', () => {
    const { session, farmTierCap } = buildFarmAuctionSession({
      ...BASE_INPUT,
      teams: [
        {
          ...TEAMS[0],
          farmRosterPlayerIds: ['a-farm-existing'],
          committedFarmSalaries: 7_500,
          mlbBudgetCarryover: 12_500,
        },
        {
          ...TEAMS[1],
          committedFarmSalaries: 0,
          mlbBudgetCarryover: 25_000,
        },
        {
          ...TEAMS[2],
          committedFarmSalaries: 15_000,
        },
      ],
    });

    expect(session.teams.find((team) => team.teamId === TEAMS[0].teamId)?.budgetRemaining)
      .toBe(farmTierCap - 7_500 + 12_500);
    expect(session.teams.find((team) => team.teamId === TEAMS[1].teamId)?.budgetRemaining)
      .toBe(farmTierCap + 25_000);
    expect(session.teams.find((team) => team.teamId === TEAMS[2].teamId)?.budgetRemaining)
      .toBe(farmTierCap - 15_000);
  });
});
