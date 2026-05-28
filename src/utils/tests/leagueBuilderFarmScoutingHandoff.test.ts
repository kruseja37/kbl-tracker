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
  validatePreparedLeagueBuilderFarmScoutingState,
} from '../leagueBuilderFarmScoutingHandoff';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  saveLeagueTemplate,
  savePlayer,
  saveTeam,
  saveTeamRoster,
  type Player,
  type Position,
  type TeamRoster,
} from '../leagueBuilderStorage';
import {
  deepCopyLeagueToFranchise,
  deleteFranchiseDatabase,
  getAllFranchisePlayers,
} from '../franchisePlayerStorage';
import { getFranchiseFarmRoster } from '../franchiseFarmStorage';
import { getFranchiseSeasonId } from '../franchisePersistenceContract';

const LEAGUE_ID = 'farm-scouting-handoff-league';
const FRANCHISE_ID = 'farm-scouting-franchise';
const TEAM_IDS = ['farm-scouting-away', 'farm-scouting-home'];

function makeRoster(teamId: string, farmRoster: string[]): TeamRoster {
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
  const position: Position = rosterStatus === 'FARM' ? 'CF' : index <= 11 ? 'C' : 'SP';
  return {
    id: `${teamId}-${rosterStatus.toLowerCase()}-${index}`,
    firstName: rosterStatus,
    lastName: `${teamId}-${index}`,
    gender: 'M',
    jerseyNumber: index,
    age: rosterStatus === 'FARM' ? 20 : 28,
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
    arsenal: rosterStatus === 'FARM' ? [] : ['4F'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 60,
    mojo: 'Normal',
    fame: 0,
    salary: rosterStatus === 'FARM' ? 0.5 : 4,
    leagueAssignments: [{ leagueId: LEAGUE_ID, teamId, rosterStatus }],
    ratingRevealState: rosterStatus === 'FARM' ? 'hidden' : undefined,
    isCustom: true,
    sourceDatabase: rosterStatus === 'FARM' ? 'startup-prospect-draft' : 'test',
    ...overrides,
  };
}

async function seedLeague(options: {
  farmCount?: number;
  farmMetadata?: boolean;
  revealedFarm?: boolean;
} = {}): Promise<void> {
  const farmCount = options.farmCount ?? 10;
  await saveLeagueTemplate({
    id: LEAGUE_ID,
    name: 'Farm Scouting Handoff League',
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
    teamIds: TEAM_IDS,
    conferences: [],
    divisions: [],
    defaultRulesPreset: 'standard',
  });

  for (const teamId of TEAM_IDS) {
    await saveTeam({
      id: teamId,
      name: teamId,
      abbreviation: teamId.slice(-4).toUpperCase(),
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
      const player = makePlayer(teamId, index, 'FARM', {
        ratingRevealState: options.revealedFarm && index === 1 ? 'revealed' : 'hidden',
        ...(options.farmMetadata === false
          ? { sourceDatabase: 'test' }
          : {
              prospectProfile: {
                source: 'league-builder-startup',
                methodVersion: 'prepared-test',
                scoutedGrade: 'B',
                potentialGrade: 'B+',
              },
            }),
      } as Partial<Player>);
      await savePlayer(player);
      farmIds.push(player.id!);
    }

    await saveTeamRoster(makeRoster(teamId, farmIds));
  }
}

describe('League Builder farm/scouting handoff validation', () => {
  beforeEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await clearAllLeagueBuilderData();
  });

  afterEach(async () => {
    await clearAllLeagueBuilderData();
    await deleteFranchiseDatabase(FRANCHISE_ID).catch(() => undefined);
    __resetLeagueBuilderDatabaseForTests();
  });

  test('prepared league with 22 MLB and 10 FARM per team passes without bridge need', async () => {
    await seedLeague();

    const report = await validatePreparedLeagueBuilderFarmScoutingState(LEAGUE_ID);

    expect(report.status).toBe('prepared');
    expect(report.bridgeRequired).toBe(false);
    expect(report.teams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          teamId: TEAM_IDS[0],
          MLB: 22,
          FARM: 10,
          hiddenFarm: 10,
          visibleSafeMetadata: 10,
        }),
      ]),
    );
    expect(report.limitations.join(' ')).toMatch(/scout profiles/i);
  });

  test('incomplete farm state is reported as repairable by the temporary bridge', async () => {
    await seedLeague({ farmCount: 4 });

    const report = await validatePreparedLeagueBuilderFarmScoutingState(LEAGUE_ID);

    expect(report.status).toBe('repairable-by-bridge');
    expect(report.bridgeRequired).toBe(true);
    expect(report.bridgeAllowed).toBe(true);
    expect(report.warnings.join(' ')).toMatch(/temporary bridge can fill missing slots/i);
  });

  test('revealed FARM ratings block the v1 handoff', async () => {
    await seedLeague({ revealedFarm: true });

    const report = await validatePreparedLeagueBuilderFarmScoutingState(LEAGUE_ID);

    expect(report.status).toBe('blocked');
    expect(report.bridgeAllowed).toBe(false);
    expect(report.blockers.join(' ')).toMatch(/revealed ratings before call-up/i);
  });

  test('missing scout profiles and visible-safe metadata are warnings or limitations, not blockers', async () => {
    await seedLeague({ farmMetadata: false });

    const report = await validatePreparedLeagueBuilderFarmScoutingState(LEAGUE_ID);

    expect(report.status).toBe('prepared');
    expect(report.warnings.join(' ')).toMatch(/visible-safe prospect\/scouting metadata/i);
    expect(report.limitations.join(' ')).toMatch(/scout profiles/i);
  });

  test('franchise copy preserves FARM reveal state and prospect metadata', async () => {
    await seedLeague();

    const result = await deepCopyLeagueToFranchise(FRANCHISE_ID, LEAGUE_ID, {
      seasonId: getFranchiseSeasonId(FRANCHISE_ID, 1),
      seasonNumber: 1,
      farmScoutingBridgeRepairApplied: false,
    });
    const franchisePlayers = await getAllFranchisePlayers(FRANCHISE_ID);
    const farmPlayer = franchisePlayers.find((player) => player.id === `${TEAM_IDS[0]}-farm-1`) as
      | (Player & { prospectProfile?: { scoutedGrade?: string; potentialGrade?: string } })
      | undefined;
    const farmRecords = await getFranchiseFarmRoster(
      FRANCHISE_ID,
      getFranchiseSeasonId(FRANCHISE_ID, 1),
      TEAM_IDS[0],
    );

    expect(result.rosterRequirements.farmScouting).toEqual(
      expect.objectContaining({
        ownership: 'league-builder-mode-1',
        preparedInLeagueBuilder: true,
        bridgeRepairApplied: false,
        scoutProfilesRequired: false,
      }),
    );
    expect(farmPlayer?.ratingRevealState).toBe('hidden');
    expect(farmPlayer?.prospectProfile).toEqual(
      expect.objectContaining({
        scoutedGrade: 'B',
        potentialGrade: 'B+',
      }),
    );
    expect(farmRecords.find((record) => record.playerId === farmPlayer?.id)?.ratingRevealState).toBe('hidden');
  });
});
