import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  STARTUP_PROSPECT_DRAFT_VERSION,
  runStartupProspectDraftForLeague,
} from '../franchiseStartupProspectDraft';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  getAllPlayers,
  getTeamRoster,
  saveLeagueTemplate,
  savePlayer,
  saveTeam,
  saveTeamRoster,
  type Player,
  type Position,
  type TeamRoster,
} from '../leagueBuilderStorage';

const LEAGUE_ID = 'startup-draft-league';
const TEAM_A = 'team-a';
const TEAM_B = 'team-b';

function makePlayer(teamId: string, index: number, position: Position = 'C'): Omit<Player, 'createdDate' | 'lastModified'> {
  return {
    id: `${teamId}-mlb-${index}`,
    firstName: `MLB${index}`,
    lastName: teamId,
    gender: 'M',
    jerseyNumber: index,
    age: 28,
    bats: 'R',
    throws: 'R',
    primaryPosition: position,
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 30,
    junk: 30,
    accuracy: 30,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 60,
    mojo: 'Normal',
    fame: 0,
    salary: teamId === TEAM_A ? 10 : 20,
    leagueAssignments: [{ leagueId: LEAGUE_ID, teamId, rosterStatus: 'MLB' }],
    isCustom: true,
    sourceDatabase: 'test',
  };
}

function makeRoster(teamId: string, farmRoster: string[] = []): TeamRoster {
  return {
    teamId,
    mlbRoster: Array.from({ length: 22 }, (_, index) => `${teamId}-mlb-${index + 1}`),
    farmRoster,
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: [],
    longRelievers: [],
    closingPitcher: '',
    setupPitchers: [],
    depthChart: {
      C: [],
      '1B': [],
      '2B': [],
      SS: [],
      '3B': [],
      LF: [],
      CF: [],
      RF: [],
      DH: [],
      SP: [],
      RP: [],
      CP: [],
    },
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
    lastModified: '2026-01-01T00:00:00.000Z',
  };
}

async function seedLeague(): Promise<void> {
  await saveLeagueTemplate({
    id: LEAGUE_ID,
    name: 'Startup Draft League',
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
    teamIds: [TEAM_A, TEAM_B],
    conferences: [],
    divisions: [],
    defaultRulesPreset: 'standard',
  });
  for (const teamId of [TEAM_A, TEAM_B]) {
    await saveTeam({
      id: teamId,
      name: teamId,
      abbreviation: teamId.toUpperCase(),
      location: 'Test',
      nickname: teamId,
      colors: { primary: '#111111', secondary: '#eeeeee' },
      stadium: `${teamId} Park`,
      leagueIds: [LEAGUE_ID],
    });
    for (let index = 1; index <= 22; index += 1) {
      await savePlayer(makePlayer(teamId, index, index <= 10 ? 'C' : 'SP'));
    }
    await saveTeamRoster(makeRoster(teamId));
  }
}

describe('startup prospect draft', () => {
  beforeEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await clearAllLeagueBuilderData();
    await seedLeague();
  });

  afterEach(async () => {
    await clearAllLeagueBuilderData();
    __resetLeagueBuilderDatabaseForTests();
  });

  test('fills missing farm rosters with hidden rookie prospects', async () => {
    const report = await runStartupProspectDraftForLeague(LEAGUE_ID, {
      seed: 'test-seed',
      seasonNumber: 1,
    });

    expect(report.methodVersion).toBe(STARTUP_PROSPECT_DRAFT_VERSION);
    expect(report.valid).toBe(true);
    expect(report.totalVacancies).toBe(20);
    expect(report.picks).toHaveLength(20);
    expect(report.teamFarmCounts[TEAM_A]).toEqual({ before: 0, after: 10, added: 10 });
    expect(report.teamFarmCounts[TEAM_B]).toEqual({ before: 0, after: 10, added: 10 });

    const rosterA = await getTeamRoster(TEAM_A);
    const rosterB = await getTeamRoster(TEAM_B);
    expect(rosterA?.farmRoster).toHaveLength(10);
    expect(rosterB?.farmRoster).toHaveLength(10);

    const players = await getAllPlayers();
    const prospects = players.filter((player) => player.sourceDatabase === 'startup-prospect-draft');
    expect(prospects).toHaveLength(20);
    expect(prospects.every((player) => player.ratingRevealState === 'hidden')).toBe(true);
    expect(prospects.every((player) => player.salary >= 0.5 && player.salary <= 2)).toBe(true);
    expect(prospects.every((player) =>
      player.leagueAssignments?.some((assignment) =>
        assignment.leagueId === LEAGUE_ID &&
        assignment.rosterStatus === 'FARM',
      ),
    )).toBe(true);
  });

  test('is idempotent when farm rosters are already full', async () => {
    await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'test-seed' });
    const secondReport = await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'test-seed' });

    expect(secondReport.totalVacancies).toBe(0);
    expect(secondReport.picks).toHaveLength(0);
    const prospects = (await getAllPlayers()).filter((player) => player.sourceDatabase === 'startup-prospect-draft');
    expect(prospects).toHaveLength(20);
  });

  test('uses lower payroll team first in round one and snake order in round two', async () => {
    const report = await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'order-seed' });

    expect(report.picks[0]).toMatchObject({ round: 1, teamId: TEAM_A });
    expect(report.picks[1]).toMatchObject({ round: 1, teamId: TEAM_B });
    expect(report.picks[2]).toMatchObject({ round: 2, teamId: TEAM_B });
    expect(report.picks[3]).toMatchObject({ round: 2, teamId: TEAM_A });
  });
});
