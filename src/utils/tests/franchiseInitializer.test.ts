import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import type { FranchiseConfig } from '../../types/franchise';
import { initializeFranchise } from '../franchiseInitializer';
import { initMetaDatabase, resetMetaDb } from '../franchiseManager';
import {
  deleteFranchiseDatabase,
  getAllFranchisePlayers,
} from '../franchisePlayerStorage';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  saveLeagueTemplate,
  savePlayer,
  saveTeam,
  type Player,
  type Team,
} from '../leagueBuilderStorage';
import { clearAllSchedules } from '../scheduleStorage';

const LEAGUE_ID = 'init-copy-league';
const TEAM_A_ID = 'init-copy-team-a';
const TEAM_B_ID = 'init-copy-team-b';

const createdFranchiseIds: string[] = [];

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function makeTeam(id: string, name: string): Team {
  return {
    id,
    name,
    abbreviation: id === TEAM_A_ID ? 'ITA' : 'ITB',
    location: 'Init',
    nickname: name,
    colors: { primary: '#111111', secondary: '#eeeeee' },
    stadium: 'Init Park',
    controlledBy: id === TEAM_A_ID ? 'human' : 'ai',
    leagueIds: [LEAGUE_ID],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
  };
}

function makePlayer(id: string, teamId: string): Player {
  return {
    id,
    firstName: id,
    lastName: 'Seed',
    gender: 'M',
    age: 24,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 30,
    junk: 30,
    accuracy: 30,
    arsenal: ['4F'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Crafty',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 10_000,
    leagueAssignments: [{ leagueId: LEAGUE_ID, teamId, rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: true,
  };
}

function makeConfig(): FranchiseConfig {
  return {
    league: LEAGUE_ID,
    leagueDetails: {
      name: 'Init Copy League',
      teams: 2,
      conferences: 0,
      divisions: 0,
    },
    season: {
      gamesPerTeam: 2,
      inningsPerGame: 9,
      extraInningsRule: 'classic',
      scheduleType: 'balanced',
      allStarGame: false,
      tradeDeadline: false,
      mercyRule: false,
    },
    playoffs: {
      teamsQualifying: 0,
      format: 'none',
      seriesLengths: {
        wildCard: '1',
        divisionSeries: '1',
        championship: '1',
        worldSeries: '1',
      },
      homeFieldAdvantage: 'higher-seed',
    },
    teams: {
      selectedTeams: [TEAM_A_ID],
      mode: 'single',
      playerAssignments: {},
    },
    roster: { mode: 'draft' },
    franchiseName: 'Init Copy Franchise',
  };
}

async function resetStorage(): Promise<void> {
  __resetLeagueBuilderDatabaseForTests();
  await clearAllLeagueBuilderData().catch(() => undefined);
  await clearAllSchedules().catch(() => undefined);

  for (const franchiseId of createdFranchiseIds.splice(0)) {
    await deleteFranchiseDatabase(franchiseId).catch(() => undefined);
  }

  try {
    const metaDb = await initMetaDatabase();
    metaDb.close();
  } catch {
    // The meta DB may not exist yet.
  }
  resetMetaDb();
  await deleteDatabase('kbl-app-meta').catch(() => undefined);
}

async function seedLeagueBuilderDraft(): Promise<void> {
  await saveTeam(makeTeam(TEAM_A_ID, 'Alpha'));
  await saveTeam(makeTeam(TEAM_B_ID, 'Bravo'));
  await saveLeagueTemplate({
    id: LEAGUE_ID,
    name: 'Init Copy League',
    teamIds: [TEAM_A_ID, TEAM_B_ID],
    conferences: [],
    divisions: [],
    defaultRulesPreset: 'standard',
    draftFormat: 'auction',
  });
  await savePlayer(makePlayer('init-copy-player-a', TEAM_A_ID));
  await savePlayer(makePlayer('init-copy-player-b', TEAM_B_ID));
}

beforeEach(async () => {
  await resetStorage();
});

afterEach(async () => {
  await resetStorage();
});

describe('initializeFranchise', () => {
  test('seeds drafted League Builder players into the franchise database', async () => {
    await seedLeagueBuilderDraft();

    const franchiseId = await initializeFranchise(makeConfig());
    createdFranchiseIds.push(franchiseId);

    const players = await getAllFranchisePlayers(franchiseId);

    expect(players.map((player) => player.id).sort()).toEqual([
      'init-copy-player-a',
      'init-copy-player-b',
    ]);
    expect(players.every((player) =>
      player.leagueAssignments?.some((assignment) => assignment.leagueId === LEAGUE_ID),
    )).toBe(true);
  });
});
