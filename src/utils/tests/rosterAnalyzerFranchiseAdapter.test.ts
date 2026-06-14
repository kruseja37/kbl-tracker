import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetFranchiseTeam: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
  mockGetFranchiseFarmRoster: vi.fn(),
  mockGetFranchiseTrueValueRows: vi.fn(),
}));

vi.mock('../franchisePlayerStorage', () => ({
  getFranchiseTeam: mocks.mockGetFranchiseTeam,
  getAllFranchisePlayers: mocks.mockGetAllFranchisePlayers,
}));

vi.mock('../franchiseFarmStorage', () => ({
  getFranchiseFarmRoster: mocks.mockGetFranchiseFarmRoster,
}));

vi.mock('../franchiseTrueValueStorage', () => ({
  getFranchiseTrueValueRows: mocks.mockGetFranchiseTrueValueRows,
}));

import {
  analyzeFranchiseTeamRoster,
  analyzeFranchiseTeamRosterFromStorage,
  buildFranchiseTeamAnalyzerInput,
} from '../rosterAnalyzerFranchiseAdapter';
import type { FranchiseFarmRecord } from '../franchiseFarmStorage';
import type { Player, Team } from '../leagueBuilderStorage';

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Franchise Club',
    abbreviation: 'FRC',
    location: 'Franchise',
    nickname: 'Club',
    colors: { primary: '#111111', secondary: '#ffffff' },
    stadium: 'Franchise Park',
    leagueIds: ['league-1'],
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: [],
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
    ...overrides,
  };
}

function makePlayer(overrides: Partial<Player> & { id: string; primaryPosition?: Player['primaryPosition'] }): Player {
  return {
    id: overrides.id,
    firstName: overrides.firstName ?? overrides.id,
    lastName: overrides.lastName ?? 'Player',
    gender: 'M',
    age: 28,
    bats: 'R',
    throws: 'R',
    primaryPosition: overrides.primaryPosition ?? 'SS',
    secondaryPosition: overrides.secondaryPosition,
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    optionsUsedBySeason: {},
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
    isCustom: true,
    ...overrides,
  };
}

function makeFarmRecord(overrides: Partial<FranchiseFarmRecord> & { playerId: string }): FranchiseFarmRecord {
  return {
    id: `franchise-1:franchise-1-season-2:team-1:${overrides.playerId}`,
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    seasonNumber: 2,
    teamId: 'team-1',
    playerId: overrides.playerId,
    rosterLevel: 'AAA',
    rosterStatus: 'FARM',
    optionsUsed: 1,
    optionDates: ['2026-05-01'],
    ratingRevealState: 'hidden',
    assignedAt: '2026-05-01',
    lastModified: '2026-05-01',
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

describe('rosterAnalyzerFranchiseAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('filters excluded franchise statuses while preserving missing active and farm IDs for integrity findings', () => {
    const team = makeTeam({
      lineupWithDH: [
        { battingOrder: 1, playerId: 'active-1', fieldingPosition: 'SS' },
        { battingOrder: 2, playerId: 'missing-active-1', fieldingPosition: 'CF' },
        { battingOrder: 3, playerId: 'free-agent-1', fieldingPosition: 'RF' },
      ],
      startingRotation: ['active-1'],
    });
    const players = [
      makePlayer({ id: 'active-1', primaryPosition: 'SS' }),
      makePlayer({
        id: 'farm-1',
        primaryPosition: 'CF',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      }),
      makePlayer({
        id: 'free-agent-1',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FREE_AGENT' }],
      }),
      makePlayer({
        id: 'retired-1',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'RETIRED' } as never],
      }),
      makePlayer({
        id: 'damaged-1',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1' } as never],
      }),
      makePlayer({
        id: 'other-team-1',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-2', rosterStatus: 'MLB' }],
      }),
    ];
    const farmRecords = [
      makeFarmRecord({ playerId: 'farm-1' }),
      makeFarmRecord({ playerId: 'missing-farm-1' }),
      makeFarmRecord({ playerId: 'retired-1' }),
    ];
    const before = JSON.parse(JSON.stringify({ team, players, farmRecords }));

    deepFreeze(team);
    deepFreeze(players);
    deepFreeze(farmRecords);

    const input = buildFranchiseTeamAnalyzerInput({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      seasonNumber: 2,
      statsScopeId: 'franchise-1-season-2',
      leagueId: 'league-1',
      team,
      players,
      farmRecords,
      config: { rosterTargets: { activeMlb: 2, farm: 2, total: 4 } },
    });
    const report = analyzeFranchiseTeamRoster({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      seasonNumber: 2,
      statsScopeId: 'franchise-1-season-2',
      leagueId: 'league-1',
      team,
      players,
      farmRecords,
      config: { rosterTargets: { activeMlb: 2, farm: 2, total: 4 } },
    });

    expect(input.players.map((player) => [player.id, player.rosterStatus])).toEqual(
      expect.arrayContaining([
        ['active-1', 'MLB'],
        ['farm-1', 'FARM'],
        ['free-agent-1', 'FREE_AGENT'],
        ['retired-1', 'RETIRED'],
        ['damaged-1', 'UNKNOWN'],
      ]),
    );
    expect(input.players.some((player) => player.id === 'other-team-1')).toBe(false);
    expect(input.roster.activePlayerIds).toEqual(['active-1', 'missing-active-1']);
    expect(input.roster.activePlayerIds).not.toContain('free-agent-1');
    expect(input.roster.farmPlayerIds).toEqual(['farm-1', 'missing-farm-1']);
    expect(input.roster.farmPlayerIds).not.toContain('retired-1');
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Active roster references missing players',
          affectedPlayerIds: ['missing-active-1'],
        }),
        expect.objectContaining({
          title: 'Farm roster references missing players',
          affectedPlayerIds: ['missing-farm-1'],
        }),
      ]),
    );
    expect(report.profile.limitations).toContain('Season/performance stats are missing or unavailable for at least one active player.');
    expect(JSON.parse(JSON.stringify({ team, players, farmRecords }))).toEqual(before);
  });

  test('storage helper reads franchise-owned team players and farm records without writes', async () => {
    const team = makeTeam();
    const players = [
      makePlayer({ id: 'active-1', primaryPosition: 'C' }),
      makePlayer({
        id: 'farm-1',
        primaryPosition: 'IF',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      }),
    ];
    const farmRecords = [makeFarmRecord({ playerId: 'farm-1' })];
    mocks.mockGetFranchiseTeam.mockResolvedValue(team);
    mocks.mockGetAllFranchisePlayers.mockResolvedValue(players);
    mocks.mockGetFranchiseFarmRoster.mockResolvedValue(farmRecords);
    mocks.mockGetFranchiseTrueValueRows.mockResolvedValue([{ playerId: 'active-1', valueDelta: -500 }]);

    const report = await analyzeFranchiseTeamRosterFromStorage({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      seasonNumber: 2,
      statsScopeId: 'franchise-1-season-2',
      leagueId: 'league-1',
      teamId: 'team-1',
      config: { rosterTargets: { activeMlb: 1, farm: 1, total: 2 } },
    });

    expect(mocks.mockGetFranchiseTeam).toHaveBeenCalledWith('franchise-1', 'team-1');
    expect(mocks.mockGetAllFranchisePlayers).toHaveBeenCalledWith('franchise-1');
    expect(mocks.mockGetFranchiseFarmRoster).toHaveBeenCalledWith('franchise-1', 'franchise-1-season-2', 'team-1');
    expect(mocks.mockGetFranchiseTrueValueRows).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
    });
    expect(report.summary.readOnly).toBe(true);
    expect(report.identity).toMatchObject({
      mode: 'franchise',
      surface: 'franchise_team_hub',
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      teamId: 'team-1',
    });
    expect(report.profile).toMatchObject({
      activeCount: 1,
      farmCount: 1,
      totalCount: 2,
    });
  });

  test('maps franchise status matrix and farm option/reveal data into analyzer DTOs', () => {
    const statuses = ['MLB', 'FARM', 'FREE_AGENT', 'RELEASED', 'RETIRED', 'INACTIVE', 'UNASSIGNED', undefined] as const;
    const players = statuses.map((rosterStatus, index) =>
      makePlayer({
        id: `status-${index}`,
        primaryPosition: index === 1 ? 'CF' : 'SS',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus } as never],
        ratingRevealState: index === 1 ? 'revealed' : undefined,
      }),
    );
    const team = makeTeam({
      lineupWithDH: statuses.map((_, index) => ({
        battingOrder: index + 1,
        playerId: `status-${index}`,
        fieldingPosition: 'SS',
      })),
    });
    const farmRecords = [
      makeFarmRecord({
        playerId: 'status-1',
        optionsUsed: 2,
        ratingRevealState: 'hidden',
      }),
    ];
    players[1] = {
      ...players[1],
      ratingRevealState: 'hidden',
      prospectProfile: {
        scoutedGrade: 'B+',
        scoutConfidence: 'high',
      },
    } as Player;

    const input = buildFranchiseTeamAnalyzerInput({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      seasonNumber: 2,
      leagueId: 'league-1',
      team,
      players,
      farmRecords,
      config: { rosterTargets: { activeMlb: 1, farm: 1, total: 2 } },
    });

    expect(input.players.map((player) => [player.id, player.rosterStatus])).toEqual([
      ['status-0', 'MLB'],
      ['status-1', 'FARM'],
      ['status-2', 'FREE_AGENT'],
      ['status-3', 'RELEASED'],
      ['status-4', 'RETIRED'],
      ['status-5', 'INACTIVE'],
      ['status-6', 'UNASSIGNED'],
      ['status-7', 'UNKNOWN'],
    ]);
    expect(input.roster.activePlayerIds).toEqual(['status-0']);
    expect(input.roster.farmPlayerIds).toEqual(['status-1']);
    expect(input.players.find((player) => player.id === 'status-1')?.optionState).toMatchObject({
      seasonOptionsUsed: 2,
      maxSeasonOptions: 3,
      ratingRevealState: 'hidden',
      eligibleForCallUp: true,
      eligibleForSendDown: false,
      scoutedGrade: 'B+',
      scoutConfidence: 'high',
    });
    expect(input.players.find((player) => player.id === 'status-1')?.ratings).toEqual({});
    expect(input.players.find((player) => player.id === 'status-0')?.optionState).toMatchObject({
      eligibleForSendDown: true,
    });
  });
});
