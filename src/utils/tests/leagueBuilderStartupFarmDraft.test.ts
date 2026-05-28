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
  applyLeagueBuilderStartupFarmDraft,
  createLeagueBuilderStartupFarmDraftPreview,
  LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION,
} from '../leagueBuilderStartupFarmDraft';
import { PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION } from '../prospectScoutingDraftEngine';
import { validatePreparedLeagueBuilderFarmScoutingState } from '../leagueBuilderFarmScoutingHandoff';
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

const LEAGUE_ID = 'startup-farm-draft-league';
const TEAM_A = 'farm-draft-team-a';
const TEAM_B = 'farm-draft-team-b';

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

function makePlayer(
  teamId: string,
  index: number,
  rosterStatus: 'MLB' | 'FARM',
  overrides: Partial<Player> = {},
): Omit<Player, 'createdDate' | 'lastModified'> {
  const position: Position = rosterStatus === 'MLB'
    ? index <= 11 ? 'C' : 'SP'
    : 'CF';
  return {
    id: `${teamId}-${rosterStatus.toLowerCase()}-${index}`,
    firstName: rosterStatus,
    lastName: `${teamId}-${index}`,
    gender: 'M',
    jerseyNumber: index,
    age: rosterStatus === 'MLB' ? 28 : 20,
    bats: 'R',
    throws: 'R',
    primaryPosition: position,
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 40,
    junk: 40,
    accuracy: 40,
    arsenal: rosterStatus === 'MLB' ? ['4F'] : [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 60,
    mojo: 'Normal',
    fame: 0,
    salary: rosterStatus === 'MLB' ? teamId === TEAM_A ? 2 : 4 : 0.5,
    leagueAssignments: [{ leagueId: LEAGUE_ID, teamId, rosterStatus }],
    ratingRevealState: rosterStatus === 'FARM' ? 'hidden' : undefined,
    isCustom: true,
    sourceDatabase: rosterStatus === 'FARM' ? 'startup-prospect-draft' : 'test',
    ...(rosterStatus === 'FARM'
      ? {
          prospectProfile: {
            source: 'league-builder-startup',
            methodVersion: 'prepared-test',
            scoutedGrade: 'B',
            potentialGrade: 'B+',
          },
        }
      : {}),
    ...overrides,
  };
}

async function seedLeague(options: { farmCount?: number } = {}): Promise<void> {
  const farmCount = options.farmCount ?? 0;
  await saveLeagueTemplate({
    id: LEAGUE_ID,
    name: 'Startup Farm Draft League',
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
      abbreviation: teamId.slice(-3).toUpperCase(),
      location: 'Test',
      nickname: teamId,
      colors: { primary: '#111111', secondary: '#eeeeee' },
      stadium: `${teamId} Park`,
      leagueIds: [LEAGUE_ID],
    });
    for (let index = 1; index <= 22; index += 1) {
      await savePlayer(makePlayer(teamId, index, 'MLB'));
    }

    const farmIds: string[] = [];
    for (let index = 1; index <= farmCount; index += 1) {
      const farmPlayer = makePlayer(teamId, index, 'FARM');
      await savePlayer(farmPlayer);
      farmIds.push(farmPlayer.id!);
    }
    await saveTeamRoster(makeRoster(teamId, farmIds));
  }
}

describe('League Builder startup farm draft persistence', () => {
  beforeEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await clearAllLeagueBuilderData();
  });

  afterEach(async () => {
    await clearAllLeagueBuilderData();
    __resetLeagueBuilderDatabaseForTests();
  });

  test('generates and applies missing FARM prospects into League Builder storage', async () => {
    await seedLeague();

    const preview = await createLeagueBuilderStartupFarmDraftPreview(LEAGUE_ID, {
      seed: 'slice-4-seed',
      seasonNumber: 1,
    });
    const report = await applyLeagueBuilderStartupFarmDraft(preview);
    const players = await getAllPlayers();
    const drafted = players.filter((player) => player.sourceDatabase === 'league-builder-startup-prospect-draft');
    const rosterA = await getTeamRoster(TEAM_A);
    const handoff = await validatePreparedLeagueBuilderFarmScoutingState(LEAGUE_ID);

    expect(preview.workflowVersion).toBe(LEAGUE_BUILDER_STARTUP_FARM_DRAFT_VERSION);
    expect(preview.engineMethodVersion).toBe(PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION);
    expect(preview.valid).toBe(true);
    expect(preview.totalVacancies).toBe(20);
    expect(preview.visibleReports).toHaveLength(20);
    expect(report.applied).toBe(true);
    expect(drafted).toHaveLength(20);
    expect(rosterA?.farmRoster).toHaveLength(10);
    expect(drafted.every((player) =>
      player.ratingRevealState === 'hidden' &&
      player.leagueAssignments?.some((assignment) =>
        assignment.leagueId === LEAGUE_ID &&
        assignment.rosterStatus === 'FARM',
      ),
    )).toBe(true);

    const storedProspect = drafted[0] as Player & {
      prospectProfile?: { methodVersion?: string; scoutedGrade?: string };
      hiddenPersonalityModifiers?: Record<string, number>;
    };
    expect(storedProspect.prospectProfile).toEqual(expect.objectContaining({
      methodVersion: PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION,
      scoutedGrade: expect.any(String),
    }));
    expect(storedProspect.hiddenPersonalityModifiers).toEqual(expect.objectContaining({
      leadership: expect.any(Number),
      volatility: expect.any(Number),
    }));
    expect(handoff.status).toBe('prepared');
  });

  test('prepared league is a valid no-op with no apply action required', async () => {
    await seedLeague({ farmCount: 10 });

    const preview = await createLeagueBuilderStartupFarmDraftPreview(LEAGUE_ID, {
      seed: 'prepared-seed',
    });
    const report = await applyLeagueBuilderStartupFarmDraft(preview);

    expect(preview.valid).toBe(true);
    expect(preview.prepared).toBe(true);
    expect(preview.totalVacancies).toBe(0);
    expect(preview.selectedPicks).toHaveLength(0);
    expect(report.applied).toBe(false);
    expect(report.issues.join(' ')).toMatch(/already prepared/i);
  });

  test('overfull farm state blocks draft generation', async () => {
    await seedLeague({ farmCount: 11 });

    const preview = await createLeagueBuilderStartupFarmDraftPreview(LEAGUE_ID, {
      seed: 'overfull-seed',
    });

    expect(preview.valid).toBe(false);
    expect(preview.blockers.join(' ')).toMatch(/over the startup limit/i);
    expect(preview.selectedPicks).toHaveLength(0);
  });

  test('mismatched farm roster blocks draft generation', async () => {
    await seedLeague({ farmCount: 1 });
    await saveTeamRoster(makeRoster(TEAM_A, ['missing-farm-id']));

    const preview = await createLeagueBuilderStartupFarmDraftPreview(LEAGUE_ID, {
      seed: 'mismatch-seed',
    });

    expect(preview.valid).toBe(false);
    expect(preview.blockers.join(' ')).toMatch(/does not match player FARM assignments/i);
  });

  test('revealed farm ratings block draft generation', async () => {
    await seedLeague({ farmCount: 1 });
    await savePlayer(makePlayer(TEAM_A, 1, 'FARM', {
      ratingRevealState: 'revealed',
    }));

    const preview = await createLeagueBuilderStartupFarmDraftPreview(LEAGUE_ID, {
      seed: 'revealed-seed',
    });

    expect(preview.valid).toBe(false);
    expect(preview.blockers.join(' ')).toMatch(/revealed ratings before call-up/i);
  });

  test('stale preview with changed farm assignments is blocked before writes', async () => {
    await seedLeague();
    const preview = await createLeagueBuilderStartupFarmDraftPreview(LEAGUE_ID, {
      seed: 'stale-apply-seed',
    });
    await savePlayer(makePlayer(TEAM_A, 1, 'FARM'));
    const savePlayerSpy = vi.fn(savePlayer);
    const saveTeamRosterSpy = vi.fn(saveTeamRoster);

    const report = await applyLeagueBuilderStartupFarmDraft(preview, {
      storage: {
        savePlayer: savePlayerSpy,
        saveTeamRoster: saveTeamRosterSpy,
      },
    });

    const drafted = (await getAllPlayers()).filter((player) =>
      player.sourceDatabase === 'league-builder-startup-prospect-draft',
    );

    expect(report.applied).toBe(false);
    expect(report.issues.join(' ')).toMatch(/preview is stale/i);
    expect(report.issues.join(' ')).toMatch(/does not match player FARM assignments/i);
    expect(savePlayerSpy).not.toHaveBeenCalled();
    expect(saveTeamRosterSpy).not.toHaveBeenCalled();
    expect(drafted).toHaveLength(0);
  });

  test('write failure rolls back created players and restores team farm rosters', async () => {
    await seedLeague();
    const preview = await createLeagueBuilderStartupFarmDraftPreview(LEAGUE_ID, {
      seed: 'rollback-seed',
    });
    let failGeneratedRosterWrite = true;

    const report = await applyLeagueBuilderStartupFarmDraft(preview, {
      storage: {
        saveTeamRoster: async (roster) => {
          if (failGeneratedRosterWrite && roster.farmRoster.some((id) => id.startsWith(`prospect-${LEAGUE_ID}`))) {
            failGeneratedRosterWrite = false;
            throw new Error('forced roster write failure');
          }
          return saveTeamRoster(roster);
        },
      },
    });

    const players = await getAllPlayers();
    const drafted = players.filter((player) => player.sourceDatabase === 'league-builder-startup-prospect-draft');

    expect(report.applied).toBe(false);
    expect(report.issues.join(' ')).toMatch(/forced roster write failure/i);
    expect(report.createdPlayerIds).toHaveLength(20);
    expect(report.rollbackErrors).toHaveLength(0);
    expect(drafted).toHaveLength(0);
    expect((await getTeamRoster(TEAM_A))?.farmRoster).toHaveLength(0);
    expect((await getTeamRoster(TEAM_B))?.farmRoster).toHaveLength(0);
  });
});
