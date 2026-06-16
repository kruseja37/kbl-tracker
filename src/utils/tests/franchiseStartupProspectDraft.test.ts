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
  rollbackStartupProspectDraftForLeague,
  runStartupProspectDraftForLeague,
} from '../franchiseStartupProspectDraft';
import { PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION } from '../prospectScoutingDraftEngine';
import { validatePreparedLeagueBuilderFarmScoutingState } from '../leagueBuilderFarmScoutingHandoff';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  deleteTeamRoster,
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

function makeFarmPlayer(teamId: string, index: number): Omit<Player, 'createdDate' | 'lastModified'> {
  return {
    ...makePlayer(teamId, index, 'CF'),
    id: `${teamId}-farm-${index}`,
    firstName: `FARM${index}`,
    salary: 0.5,
    leagueAssignments: [{ leagueId: LEAGUE_ID, teamId, rosterStatus: 'FARM' }],
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
    expect(report.bridgeMethodVersion).toBe(STARTUP_PROSPECT_DRAFT_VERSION);
    expect(report.engineMethodVersion).toBe(PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION);
    expect(report.seed).toBe('test-seed');
    expect(report.bridgeRepairApplied).toBe(true);
    expect(report.valid).toBe(true);
    expect(report.totalVacancies).toBe(20);
    expect(report.picks).toHaveLength(20);
    expect(report.teamFarmCounts[TEAM_A]).toEqual({ before: 0, after: 10, added: 10 });
    expect(report.teamFarmCounts[TEAM_B]).toEqual({ before: 0, after: 10, added: 10 });
    expect(report.visibleReports).toHaveLength(20);
    expect(report.visibleReports[0]).toEqual(expect.objectContaining({
      playerId: report.picks[0].playerId,
      scoutedGrade: expect.any(String),
      potentialGrade: expect.any(String),
      scoutConfidence: expect.stringMatching(/^(low|medium|high)$/),
      scoutSpecialtiesVisible: expect.any(Array),
      scoutWeaknessesVisible: expect.any(Array),
    }));

    const rosterA = await getTeamRoster(TEAM_A);
    const rosterB = await getTeamRoster(TEAM_B);
    expect(rosterA?.farmRoster).toHaveLength(10);
    expect(rosterB?.farmRoster).toHaveLength(10);

    const players = await getAllPlayers();
    const prospects = players.filter((player) => player.sourceDatabase === 'startup-prospect-draft');
    expect(prospects).toHaveLength(20);
    expect(prospects.every((player) => player.ratingRevealState === 'hidden')).toBe(true);
    expect(prospects.every((player) => player.salary >= 1666.49 && player.salary <= 6665.94)).toBe(true);
    expect(prospects.every((player) =>
      player.leagueAssignments?.some((assignment) =>
        assignment.leagueId === LEAGUE_ID &&
        assignment.rosterStatus === 'FARM',
      ),
    )).toBe(true);

    const generatedProspect = prospects[0] as Player & {
      prospectProfile?: {
        methodVersion?: string;
        source?: string;
        scoutConfidence?: string;
        scoutSpecialtiesVisible?: unknown[];
        scoutWeaknessesVisible?: unknown[];
      };
      hiddenPersonalityModifiers?: Record<string, number>;
    };
    expect(generatedProspect.prospectProfile).toEqual(expect.objectContaining({
      methodVersion: PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION,
      source: 'league-builder-startup-prospect-draft',
      scoutConfidence: expect.stringMatching(/^(low|medium|high)$/),
      scoutSpecialtiesVisible: expect.any(Array),
      scoutWeaknessesVisible: expect.any(Array),
    }));
    expect(generatedProspect.hiddenPersonalityModifiers).toEqual(expect.objectContaining({
      loyalty: expect.any(Number),
      ambition: expect.any(Number),
      resilience: expect.any(Number),
      charisma: expect.any(Number),
    }));
  });

  test('is idempotent when farm rosters are already full', async () => {
    await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'test-seed' });
    const secondReport = await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'test-seed' });

    expect(secondReport.totalVacancies).toBe(0);
    expect(secondReport.picks).toHaveLength(0);
    expect(secondReport.bridgeRepairApplied).toBe(false);
    expect(secondReport.engineMethodVersion).toBe(PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION);
    const prospects = (await getAllPlayers()).filter((player) => player.sourceDatabase === 'startup-prospect-draft');
    expect(prospects).toHaveLength(20);
  });

  test('fills only actual assignment-backed farm vacancies on partial farms', async () => {
    const farmIds = ['team-a-farm-1', 'team-a-farm-2', 'team-a-farm-3'];
    for (let index = 1; index <= 3; index += 1) {
      await savePlayer(makeFarmPlayer(TEAM_A, index));
    }
    await saveTeamRoster(makeRoster(TEAM_A, farmIds));

    const report = await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'partial-seed' });

    expect(report.valid).toBe(true);
    expect(report.teamFarmCounts[TEAM_A]).toEqual({ before: 3, after: 10, added: 7 });
    expect(report.picks.filter((pick) => pick.teamId === TEAM_A)).toHaveLength(7);
    expect(report.picks.filter((pick) => pick.teamId === TEAM_B)).toHaveLength(10);
    expect((await getTeamRoster(TEAM_A))?.farmRoster).toHaveLength(10);
    expect((await getTeamRoster(TEAM_B))?.farmRoster).toHaveLength(10);
  });

  test('blocks stale farm roster ids before writing prospects', async () => {
    await saveTeamRoster(makeRoster(TEAM_A, ['missing-farm-player']));

    const report = await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'stale-roster' });

    expect(report.valid).toBe(false);
    expect(report.issues.join(' ')).toMatch(/FARM roster does not match player FARM assignments/i);
    const prospects = (await getAllPlayers()).filter((player) => player.sourceDatabase === 'startup-prospect-draft');
    expect(prospects).toHaveLength(0);
  });

  test('blocks farm assignments that are absent from the team roster before writing prospects', async () => {
    await savePlayer(makeFarmPlayer(TEAM_A, 1));

    const report = await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'missing-roster-id' });

    expect(report.valid).toBe(false);
    expect(report.issues.join(' ')).toMatch(/FARM roster does not match player FARM assignments/i);
    const prospects = (await getAllPlayers()).filter((player) => player.sourceDatabase === 'startup-prospect-draft');
    expect(prospects).toHaveLength(0);
  });

  test('blocks missing team rosters before writing prospects', async () => {
    await deleteTeamRoster(TEAM_A);

    const report = await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'missing-roster' });

    expect(report.valid).toBe(false);
    expect(report.issues.join(' ')).toMatch(/missing a League Builder roster/i);
    const prospects = (await getAllPlayers()).filter((player) => player.sourceDatabase === 'startup-prospect-draft');
    expect(prospects).toHaveLength(0);
  });

  test('blocks generated player id collisions before overwriting existing players', async () => {
    const collidingId = `prospect-${LEAGUE_ID}-1-${TEAM_A}-1-1`;
    await savePlayer({
      ...makePlayer(TEAM_A, 99),
      id: collidingId,
      leagueAssignments: [],
    });

    const report = await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'collision-seed' });

    expect(report.valid).toBe(false);
    expect(report.issues.join(' ')).toMatch(/already exists/i);
    const collisionPlayer = (await getAllPlayers()).find((player) => player.id === collidingId);
    expect(collisionPlayer?.sourceDatabase).toBe('test');
  });

  test('legacy bridge fills FARM vacancies but handoff still requires hired scouts', async () => {
    const bridgeReport = await runStartupProspectDraftForLeague(LEAGUE_ID, {
      seed: 'handoff-repair-seed',
      seasonNumber: 1,
    });
    const validation = await validatePreparedLeagueBuilderFarmScoutingState(LEAGUE_ID);

    expect(bridgeReport.valid).toBe(true);
    expect(bridgeReport.bridgeRepairApplied).toBe(true);
    expect(validation.status).toBe('blocked');
    expect(validation.bridgeRequired).toBe(false);
    expect(validation.blockers.join(' ')).toMatch(/expected 2 hired scouts/i);
    expect(validation.teams).toEqual(expect.arrayContaining([
      expect.objectContaining({
        teamId: TEAM_A,
        MLB: 22,
        FARM: 10,
        hiddenFarm: 10,
        visibleSafeMetadata: 10,
      }),
    ]));
  });

  test('can roll back a completed startup prospect draft after downstream setup failure', async () => {
    const report = await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'rollback-seed' });

    const rollback = await rollbackStartupProspectDraftForLeague(LEAGUE_ID, report);

    expect(rollback.valid).toBe(true);
    expect(rollback.attemptedPlayerIds).toHaveLength(20);
    expect((await getTeamRoster(TEAM_A))?.farmRoster).toHaveLength(0);
    expect((await getTeamRoster(TEAM_B))?.farmRoster).toHaveLength(0);
    const prospects = (await getAllPlayers()).filter((player) => player.sourceDatabase === 'startup-prospect-draft');
    expect(prospects).toHaveLength(0);
  });

  test('uses lower payroll team first in round one and snake order in round two', async () => {
    const report = await runStartupProspectDraftForLeague(LEAGUE_ID, { seed: 'order-seed' });

    expect(report.picks[0]).toMatchObject({ round: 1, teamId: TEAM_A });
    expect(report.picks[1]).toMatchObject({ round: 1, teamId: TEAM_B });
    expect(report.picks[2]).toMatchObject({ round: 2, teamId: TEAM_B });
    expect(report.picks[3]).toMatchObject({ round: 2, teamId: TEAM_A });
  });
});
