import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: { isSuppressed: () => true, upsert: vi.fn(), remove: vi.fn() },
}));

import type { RegisteredPool } from '../../engines/leagueConstruction';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  createMlbDraftSessionId,
  getAllPlayers,
  getAllTeams,
  getLeagueTemplate,
  getMlbDraftSession,
  getRegisteredPool,
  restoreSnakeLiveRoomLocally,
  type LeagueBuilderMlbDraftSession,
  type LeagueTemplate,
  type Player,
  type Team,
} from '../leagueBuilderStorage';
import { buildSnakeLiveCatalog, readSnakeLiveCatalog } from '../snakeLiveCatalog';

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

beforeEach(() => __resetLeagueBuilderDatabaseForTests());
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
});
