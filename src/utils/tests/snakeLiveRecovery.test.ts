import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const syncMocks = vi.hoisted(() => ({
  suppressed: true,
  batchMutations: vi.fn(async <T>(work: () => Promise<T>) => work()),
}));

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => syncMocks.suppressed,
    upsert: vi.fn(),
    remove: vi.fn(),
    batchMutations: syncMocks.batchMutations,
  },
}));

import type { RegisteredPool } from '../../engines/leagueConstruction';
import { buildSnakeOrder } from '../../engines/leagueConstruction';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  createMlbDraftSessionId,
  getAllPlayers,
  getAllTeams,
  getLeagueTemplate,
  getMlbDraftSession,
  getPlayer,
  getRegisteredPool,
  getTeamRoster,
  restoreSnakeLiveRoomLocally,
  type LeagueBuilderMlbDraftSession,
  type LeagueTemplate,
  type Player,
  type Team,
} from '../leagueBuilderStorage';
import { finalizeCompletedSnakeSessionToLeagueRosters } from '../leagueBuilderAuctionPipeline';
import { buildSnakeLiveCatalog, readSnakeLiveCatalog } from '../snakeLiveCatalog';
import { freezeSnakeDraftSession } from '../snakeDraftManifest';
import { assertSnakeRosterHandoffReady } from '../snakeRosterHandoff';

const league: LeagueTemplate = {
  id: 'recovery-league', name: 'Test Mock', createdDate: '2026-07-20T00:00:00.000Z', lastModified: '2026-07-20T00:00:00.000Z',
  teamIds: ['team-a', 'team-b'], conferences: [], divisions: [], defaultRulesPreset: 'standard', draftFormat: 'snake', tier: 'standard', salaryCap: 1_000_000, balanceMode: 'taxed',
};

function team(id: string): Team {
  return {
    id, name: id, abbreviation: id.toUpperCase(), location: 'Test', nickname: id,
    colors: { primary: '#006a8e', secondary: '#ffcf2f' }, stadium: 'Founders Field', leagueIds: [league.id],
    createdDate: league.createdDate, lastModified: league.lastModified,
  };
}

function player(id: string): Player {
  return {
    id, sourceId: id, versionGroupId: id, firstName: 'Test', lastName: id, age: 25, gender: 'M', bats: 'R', throws: 'R', primaryPosition: id === 'player-a' ? 'C' : 'SP',
    power: 50, contact: 50, speed: 50, fielding: 50, arm: 50, velocity: 50, junk: 50, accuracy: 50, arsenal: ['4F'], overallGrade: 'C',
    personality: 'Competitive', chemistry: 'Competitive', morale: 50, mojo: 'Normal', fame: 50, salary: 50_000, createdDate: league.createdDate, lastModified: league.lastModified, isCustom: false,
  };
}

const pool: RegisteredPool = {
  leagueId: league.id, tier: 'standard', balanceMode: 'taxed', players: [
    { id: 'player-a', iv: 50_000, salary: 50_000 }, { id: 'player-b', iv: 49_000, salary: 49_000 },
  ], tierCap: 1_000_000, luxuryCaps: [], pickValueChart: [], totalSlots: 44, poolSurplusWarning: false, locked: true,
};

function session(): LeagueBuilderMlbDraftSession {
  return {
    id: createMlbDraftSessionId(league.id, 1), leagueId: league.id, seasonNumber: 1, seed: 'recovery-seed', workflowVersion: 'snake-v1', engineMethodVersion: 'snake-v1', tier: 'standard', balanceMode: 'taxed', rounds: 22,
    pickOrder: [{ round: 1, pick: 1, teamId: 'team-a' }, { round: 1, pick: 2, teamId: 'team-b' }], completedPicks: [],
    snakeSetup: { poolPlayerIds: ['player-a', 'player-b'], versionSelections: {}, clubs: [{ teamId: 'team-a', hotseat: true }, { teamId: 'team-b', hotseat: false }], orderSeed: 'recovery-order' },
    currentPickIndex: 0, createdDate: league.createdDate, lastModified: league.lastModified,
  };
}

beforeEach(() => {
  syncMocks.suppressed = true;
  syncMocks.batchMutations.mockReset().mockImplementation(async <T>(work: () => Promise<T>) => work());
  __resetLeagueBuilderDatabaseForTests();
});
afterEach(async () => { await clearAllLeagueBuilderData(); __resetLeagueBuilderDatabaseForTests(); });

describe('Snake live-room local recovery', () => {
  test('restores a recoverable room catalog without placing a generic sync write', async () => {
    const catalog = readSnakeLiveCatalog(buildSnakeLiveCatalog({
      league, teams: [team('team-a'), team('team-b')], players: [player('player-a'), player('player-b')], registeredPool: pool,
      activeTeamIds: league.teamIds, activePoolPlayerIds: pool.players.map((entry) => entry.id),
    }));
    expect(catalog).not.toBeNull();
    const result = await restoreSnakeLiveRoomLocally({
      catalog: catalog!,
      session: session(),
      recovery: { roomId: 'room-1', roomCode: '4352', publicRevision: 7 },
    });
    expect(result).toMatchObject({ leagueId: league.id, restoredLeague: true, restoredTeams: 2, restoredPlayers: 2, restoredPool: true, restoredSession: true });
    expect((await getLeagueTemplate(league.id))?.name).toBe('Test Mock');
    expect((await getAllTeams()).map((entry) => entry.id)).toEqual(['team-a', 'team-b']);
    expect((await getAllPlayers()).map((entry) => entry.id)).toEqual(['player-a', 'player-b']);
    expect((await getRegisteredPool(league.id))?.players).toHaveLength(2);
    expect(await getMlbDraftSession(league.id, 1)).toMatchObject({
      id: session().id,
      liveRoomRecovery: { roomId: 'room-1', roomCode: '4352', publicRevision: 7 },
    });
  });

  test('finalizes a recovered completed room without pre-existing roster rows', async () => {
    const pickOrder = buildSnakeOrder(league.teamIds, 22);
    const legalPositions: Player['primaryPosition'][] = [
      'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', '1B', '2B', 'SS', 'LF', 'RF',
      'SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP', 'RP',
    ];
    const pickIndexByTeam = new Map(league.teamIds.map((teamId) => [teamId, 0]));
    const recoveredPlayers: Player[] = [];
    const completedPicks = pickOrder.map((slot) => {
      const index = pickIndexByTeam.get(slot.teamId) ?? 0;
      pickIndexByTeam.set(slot.teamId, index + 1);
      const id = `${slot.teamId}-recovered-${index + 1}`;
      recoveredPlayers.push({
        ...player(id),
        primaryPosition: legalPositions[index],
        secondaryPosition: index === 8 ? 'C' : undefined,
      });
      return { ...slot, playerId: id, settledSalary: 40_000 + slot.pick };
    });
    const recoveredPool: RegisteredPool = {
      ...pool,
      players: completedPicks.map((pick) => ({ id: pick.playerId, iv: pick.settledSalary, salary: pick.settledSalary })),
      totalSlots: pickOrder.length,
    };
    const completed: LeagueBuilderMlbDraftSession = {
      ...session(),
      pickOrder,
      completedPicks,
      currentPickIndex: pickOrder.length,
      rounds: 22,
      revision: 9,
      snakeSetup: {
        poolPlayerIds: recoveredPool.players.map((row) => row.id),
        versionSelections: {},
        clubs: league.teamIds.map((teamId) => ({ teamId, hotseat: true })),
        orderSeed: 'recovered-complete-order',
      },
    };
    const catalog = readSnakeLiveCatalog(buildSnakeLiveCatalog({
      league,
      teams: league.teamIds.map(team),
      players: recoveredPlayers,
      registeredPool: recoveredPool,
      activeTeamIds: league.teamIds,
      activePoolPlayerIds: recoveredPool.players.map((entry) => entry.id),
    }));
    expect(catalog).not.toBeNull();
    await restoreSnakeLiveRoomLocally({
      catalog: catalog!,
      session: completed,
      recovery: { roomId: 'room-complete', roomCode: '4352', publicRevision: 89 },
    });
    for (const teamId of league.teamIds) await expect(getTeamRoster(teamId)).resolves.toBeNull();
    const restored = await getMlbDraftSession(league.id, 1);
    if (!restored) throw new Error('Recovered completed session was not saved.');
    const frozen = freezeSnakeDraftSession({
      session: restored,
      expectedPhase: 'MLB',
      poolPlayerIds: recoveredPool.players.map((row) => row.id),
      salaryByPlayerId: new Map(recoveredPool.players.map((row) => [row.id, row.iv])),
      frozenAt: '2026-07-20T01:00:00.000Z',
    });
    syncMocks.suppressed = false;
    syncMocks.batchMutations.mockRejectedValueOnce(new Error('backup queue quota'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const finalized = await finalizeCompletedSnakeSessionToLeagueRosters({
      leagueId: league.id,
      session: frozen,
      pool: recoveredPool,
      expectedRevision: restored.revision ?? 0,
      committedAt: '2026-07-20T01:01:00.000Z',
    });
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
      'MLB snake roster handoff backup sync did not queue.',
      expect.objectContaining({ message: 'backup queue quota' }),
    ));
    await expect(assertSnakeRosterHandoffReady(finalized.session, 'MLB')).resolves.toEqual({
      phase: 'MLB', ready: true, playerCount: 44, teamCount: 2,
    });
    for (const teamId of league.teamIds) {
      await expect(getTeamRoster(teamId)).resolves.toEqual(expect.objectContaining({
        mlbRoster: completedPicks.filter((pick) => pick.teamId === teamId).map((pick) => pick.playerId),
      }));
    }
    await expect(getPlayer(completedPicks[0].playerId)).resolves.toEqual(expect.objectContaining({
      settledSalary: completedPicks[0].settledSalary,
      leagueAssignments: [{ leagueId: league.id, teamId: completedPicks[0].teamId, rosterStatus: 'MLB' }],
    }));
  });
});
