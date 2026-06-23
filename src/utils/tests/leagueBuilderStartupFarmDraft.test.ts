import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FIRST_NAMES as SMB4_FIRST_NAMES, LAST_NAMES as SMB4_LAST_NAMES } from '../../data/nameDatabase';

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
import {
  PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION,
  prospectSalaryForDraftRound,
} from '../prospectScoutingDraftEngine';
import { validatePreparedLeagueBuilderFarmScoutingState } from '../leagueBuilderFarmScoutingHandoff';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  getAllPlayers,
  getStartupDraftSession,
  getScoutProfilesForLeague,
  getTeamRoster,
  deleteScoutProfilesForLeague,
  saveLeagueTemplate,
  savePlayer,
  saveScoutProfile,
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

async function seedScouts(): Promise<void> {
  for (const teamId of [TEAM_A, TEAM_B]) {
    for (let index = 1; index <= 1; index += 1) {
      await saveScoutProfile({
        id: `${teamId}-scout-${index}`,
        leagueId: LEAGUE_ID,
        teamId,
        name: `Scout ${teamId} ${index}`,
        specialties: index === 1 ? ['outfield'] : ['pitching'],
        weaknesses: index === 1 ? ['CP'] : ['1B'],
        accuracyByPosition: { CF: 82, SP: 78, CP: 58 },
        seed: `test-scout-${teamId}-${index}`,
        createdDate: '2026-01-01',
        lastModified: '2026-01-01',
      });
    }
  }
}

async function seedLeague(options: { farmCount?: number; scouts?: boolean } = {}): Promise<void> {
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
  if (options.scouts) {
    await seedScouts();
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
    expect(preview.visibleReports.every((report) => {
      const pick = preview.selectedPicks.find((candidate) => candidate.playerId === report.playerId);
      return pick?.player.salary === report.salary && pick.salary === report.salary;
    })).toBe(true);
    expect(report.applied).toBe(true);
    expect(drafted).toHaveLength(20);
    for (const pick of preview.selectedPicks) {
      const saved = drafted.find((player) => player.id === pick.playerId);
      expect(saved?.salary).toBe(prospectSalaryForDraftRound(pick.round));
      expect(saved?.salary).toBe(pick.visibleReport.salary);
    }
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
      loyalty: expect.any(Number),
      ambition: expect.any(Number),
      resilience: expect.any(Number),
      charisma: expect.any(Number),
    }));
    expect(handoff.status).toBe('blocked');
    expect(handoff.blockers.join(' ')).toMatch(/expected 1 hired scouts/i);
  });

  test('session scout draft creates deterministic scout pool and persists one scout per team', async () => {
    const {
      createLeagueBuilderStartupDraftSession,
      draftLeagueBuilderScout,
      STARTUP_SCOUTS_PER_TEAM,
      STARTUP_SCOUT_POOL_MULTIPLIER,
    } = await import('../leagueBuilderStartupFarmDraft');
    await seedLeague();

    let view = await createLeagueBuilderStartupDraftSession({
      leagueId: LEAGUE_ID,
      seed: 'scout-session-seed',
      scoutOrder: [TEAM_B, TEAM_A],
    });

    expect(view.session?.scoutPool).toHaveLength(2 * STARTUP_SCOUTS_PER_TEAM * STARTUP_SCOUT_POOL_MULTIPLIER);
    expect(view.currentScoutPick?.teamId).toBe(TEAM_B);
    expect(view.session?.scoutPool.every((scout) =>
      Object.values(scout.accuracyByPosition).every((accuracy) => accuracy < 100),
    )).toBe(true);
    expect(view.session?.scoutPool.every((scout) =>
      !scout.specialties.includes('DH') &&
      !scout.weaknesses.includes('DH') &&
      !Object.keys(scout.accuracyByPosition).includes('DH'),
    )).toBe(true);
    const draftPositions = new Set<string>(['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'SP', 'RP', 'CP']);
    expect(view.session?.scoutPool.every((scout) => {
      const tierPositions = [...scout.specialties, ...scout.weaknesses];
      return scout.specialties.length === 2 &&
        scout.weaknesses.length === 2 &&
        new Set(tierPositions).size === 4 &&
        tierPositions.every((position) => draftPositions.has(position) && position !== 'DH');
    })).toBe(true);
    expect(view.session?.scoutPool.every((scout) => {
      const [firstName, ...lastNameParts] = scout.name.split(' ');
      return SMB4_FIRST_NAMES.includes(firstName) &&
        SMB4_LAST_NAMES.includes(lastNameParts.join(' '));
    })).toBe(true);
    expect(new Set(view.session?.scoutPool.map((scout) => scout.name)).size).toBe(view.session?.scoutPool.length);

    while (!view.scoutDraftComplete) {
      const scout = view.availableScouts[0];
      view = await draftLeagueBuilderScout({
        leagueId: LEAGUE_ID,
        scoutId: scout.id,
      });
    }

    const storedScouts = await getScoutProfilesForLeague(LEAGUE_ID);
    expect(storedScouts).toHaveLength(2);
    expect(storedScouts.filter((scout) => scout.teamId === TEAM_A)).toHaveLength(1);
    expect(storedScouts.filter((scout) => scout.teamId === TEAM_B)).toHaveLength(1);
    expect(view.scoutDraftComplete).toBe(true);
  });

  test('prepared league cannot start a destructive new scout draft session', async () => {
    const { createLeagueBuilderStartupDraftSession } = await import('../leagueBuilderStartupFarmDraft');
    await seedLeague({ farmCount: 10, scouts: true });
    const beforeScouts = await getScoutProfilesForLeague(LEAGUE_ID);

    await expect(createLeagueBuilderStartupDraftSession({
      leagueId: LEAGUE_ID,
      seed: 'blocked-prepared-restart',
      scoutOrder: [TEAM_A, TEAM_B],
    })).rejects.toThrow(/restart is blocked/i);

    const afterScouts = await getScoutProfilesForLeague(LEAGUE_ID);
    expect(afterScouts.map((scout) => scout.id).sort()).toEqual(beforeScouts.map((scout) => scout.id).sort());
    expect(await getStartupDraftSession(LEAGUE_ID, 1)).toBeNull();
  });

  test('session create failure does not delete existing durable scout profiles', async () => {
    const { createLeagueBuilderStartupDraftSession } = await import('../leagueBuilderStartupFarmDraft');
    await seedLeague({ scouts: true });
    const beforeScouts = await getScoutProfilesForLeague(LEAGUE_ID);

    await expect(createLeagueBuilderStartupDraftSession({
      leagueId: LEAGUE_ID,
      seed: 'blocked-durable-scout-restart',
      scoutOrder: [TEAM_A, TEAM_B],
    })).rejects.toThrow(/durable scout profiles already exist/i);

    const afterScouts = await getScoutProfilesForLeague(LEAGUE_ID);
    expect(afterScouts.map((scout) => scout.id).sort()).toEqual(beforeScouts.map((scout) => scout.id).sort());
  });

  test('scout session save failure rolls back the just-hired durable scout', async () => {
    const {
      createLeagueBuilderStartupDraftSession,
      draftLeagueBuilderScout,
    } = await import('../leagueBuilderStartupFarmDraft');
    await seedLeague();

    let view = await createLeagueBuilderStartupDraftSession({
      leagueId: LEAGUE_ID,
      seed: 'scout-rollback-seed',
      scoutOrder: [TEAM_A, TEAM_B],
    });
    const firstPickTeamId = view.currentScoutPick?.teamId;
    const firstScoutId = view.availableScouts[0].id;
    view = await draftLeagueBuilderScout({
      leagueId: LEAGUE_ID,
      scoutId: firstScoutId,
    });
    expect((await getScoutProfilesForLeague(LEAGUE_ID)).map((scout) => scout.id)).toEqual([firstScoutId]);

    const secondPickTeamId = view.currentScoutPick?.teamId;
    const secondScoutId = view.availableScouts[0].id;
    await expect(draftLeagueBuilderScout({
      leagueId: LEAGUE_ID,
      scoutId: secondScoutId,
    }, {
      saveStartupDraftSession: async () => {
        throw new Error('forced scout session write failure');
      },
    })).rejects.toThrow(/forced scout session write failure/i);

    const storedScouts = await getScoutProfilesForLeague(LEAGUE_ID);
    const session = await getStartupDraftSession(LEAGUE_ID, 1);

    expect(storedScouts.map((scout) => scout.id)).toEqual([firstScoutId]);
    expect(session?.hiredScoutIdsByTeamId[firstPickTeamId!]).toEqual([firstScoutId]);
    expect(session?.hiredScoutIdsByTeamId[secondPickTeamId!]).not.toContain(secondScoutId);
  });

  test('pick-by-pick prospect board is team-specific and confirmed picks persist one player to FARM', async () => {
    const {
      createLeagueBuilderStartupDraftSession,
      draftLeagueBuilderScout,
      confirmLeagueBuilderProspectPick,
    } = await import('../leagueBuilderStartupFarmDraft');
    await seedLeague();

    let view = await createLeagueBuilderStartupDraftSession({
      leagueId: LEAGUE_ID,
      seed: 'prospect-session-seed',
      scoutOrder: [TEAM_A, TEAM_B],
    });
    while (!view.scoutDraftComplete) {
      view = await draftLeagueBuilderScout({
        leagueId: LEAGUE_ID,
        scoutId: view.availableScouts[0].id,
      });
    }

    expect(view.currentProspectPick?.teamId).toBe(TEAM_A);
    const candidate = view.prospectBoard[0];
    expect(candidate.salary).toBe(prospectSalaryForDraftRound(view.currentProspectPick!.round));
    expect(candidate.reports).toHaveLength(1);
    expect(candidate.reports.every((report) => report.salary === candidate.salary)).toBe(true);
    expect(candidate.reports.every((report) =>
      report.scoutId === view.session?.hiredScoutIdsByTeamId[TEAM_A][0],
    )).toBe(true);
    expect(JSON.stringify(candidate)).not.toMatch(/hiddenPersonalityModifiers|trueGrade|power|contact|velocity/i);

    view = await confirmLeagueBuilderProspectPick({
      leagueId: LEAGUE_ID,
      candidateId: candidate.candidateId,
    });

    const players = await getAllPlayers();
    const drafted = players.filter((player) => player.sourceDatabase === 'league-builder-startup-prospect-draft');
    const rosterA = await getTeamRoster(TEAM_A);

    expect(drafted).toHaveLength(1);
    expect(rosterA?.farmRoster).toContain(drafted[0].id);
    expect(drafted[0].salary).toBe(candidate.salary);
    expect(view.completedPicks[0].salary).toBe(candidate.salary);
    expect(drafted[0].ratingRevealState).toBe('hidden');
    expect(view.completedPicks).toHaveLength(1);
    expect(view.currentProspectPick?.teamId).toBe(TEAM_B);
  });

  test('legacy completed picks without stored salary fall back to round-based salary', async () => {
    const {
      createLeagueBuilderStartupDraftSession,
      getLeagueBuilderStartupDraftView,
    } = await import('../leagueBuilderStartupFarmDraft');
    await seedLeague();

    const view = await createLeagueBuilderStartupDraftSession({
      leagueId: LEAGUE_ID,
      seed: 'legacy-completed-pick-salary-seed',
      scoutOrder: [TEAM_A, TEAM_B],
    });
    const legacySession = {
      ...view.session!,
      completedPicks: [{
        round: 2,
        pickNumber: 3,
        teamId: TEAM_A,
        candidateId: 'legacy-candidate',
        playerId: 'legacy-player',
        playerName: 'Legacy Prospect',
        position: 'CF',
        scoutedGrade: 'B',
        potentialGrade: 'A',
        scoutReports: [],
      }],
    };

    const legacyView = await getLeagueBuilderStartupDraftView(LEAGUE_ID, 1, legacySession);

    expect(legacyView.completedPicks[0].salary).toBe(prospectSalaryForDraftRound(2));
  });

  test('reverse-payroll prospect ordering uses active MLB payroll and ignores existing FARM salaries', async () => {
    await seedLeague({ farmCount: 1 });
    await savePlayer(makePlayer(TEAM_A, 1, 'FARM', { salary: 999 }));

    const preview = await createLeagueBuilderStartupFarmDraftPreview(LEAGUE_ID, {
      seed: 'mlb-payroll-order-seed',
      seasonNumber: 1,
    });

    expect(preview.valid).toBe(true);
    expect(preview.selectedPicks[0]).toMatchObject({ round: 1, teamId: TEAM_A });
    expect(preview.selectedPicks[1]).toMatchObject({ round: 1, teamId: TEAM_B });
    expect(preview.selectedPicks[2]).toMatchObject({ round: 2, teamId: TEAM_B });
    expect(preview.selectedPicks[3]).toMatchObject({ round: 2, teamId: TEAM_A });
  });

  test('full FARM rosters without durable scouts are not reported prepared in startup draft view', async () => {
    const { getLeagueBuilderStartupDraftView } = await import('../leagueBuilderStartupFarmDraft');
    await seedLeague({ farmCount: 10 });

    const view = await getLeagueBuilderStartupDraftView(LEAGUE_ID);

    expect(view.prepared).toBe(false);
    expect(view.blockers.join(' ')).toMatch(/expected 1 hired scouts/i);
  });

  test('deleted durable scouts block prospect picks before writes', async () => {
    const {
      createLeagueBuilderStartupDraftSession,
      draftLeagueBuilderScout,
      confirmLeagueBuilderProspectPick,
    } = await import('../leagueBuilderStartupFarmDraft');
    await seedLeague();

    let view = await createLeagueBuilderStartupDraftSession({
      leagueId: LEAGUE_ID,
      seed: 'stale-scout-session-seed',
      scoutOrder: [TEAM_A, TEAM_B],
    });
    while (!view.scoutDraftComplete) {
      view = await draftLeagueBuilderScout({
        leagueId: LEAGUE_ID,
        scoutId: view.availableScouts[0].id,
      });
    }
    const candidate = view.prospectBoard[0];
    await deleteScoutProfilesForLeague(LEAGUE_ID);

    await expect(confirmLeagueBuilderProspectPick({
      leagueId: LEAGUE_ID,
      candidateId: candidate.candidateId,
    })).rejects.toThrow(/scout state changed/i);

    const drafted = (await getAllPlayers()).filter((player) =>
      player.sourceDatabase === 'league-builder-startup-prospect-draft',
    );
    expect(drafted).toHaveLength(0);
    expect((await getTeamRoster(TEAM_A))?.farmRoster).toHaveLength(0);
  });

  test('session persistence failure rolls back confirmed prospect player and roster writes', async () => {
    const {
      createLeagueBuilderStartupDraftSession,
      draftLeagueBuilderScout,
      confirmLeagueBuilderProspectPick,
    } = await import('../leagueBuilderStartupFarmDraft');
    await seedLeague();

    let view = await createLeagueBuilderStartupDraftSession({
      leagueId: LEAGUE_ID,
      seed: 'session-rollback-seed',
      scoutOrder: [TEAM_A, TEAM_B],
    });
    while (!view.scoutDraftComplete) {
      view = await draftLeagueBuilderScout({
        leagueId: LEAGUE_ID,
        scoutId: view.availableScouts[0].id,
      });
    }
    const candidate = view.prospectBoard[0];

    await expect(confirmLeagueBuilderProspectPick({
      leagueId: LEAGUE_ID,
      candidateId: candidate.candidateId,
    }, {
      saveStartupDraftSession: async () => {
        throw new Error('forced session write failure');
      },
    })).rejects.toThrow(/forced session write failure/i);

    const drafted = (await getAllPlayers()).filter((player) =>
      player.sourceDatabase === 'league-builder-startup-prospect-draft',
    );
    const session = await getStartupDraftSession(LEAGUE_ID, 1);

    expect(drafted).toHaveLength(0);
    expect((await getTeamRoster(TEAM_A))?.farmRoster).toHaveLength(0);
    expect(session?.currentPickIndex).toBe(0);
    expect(session?.completedPicks).toHaveLength(0);
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
