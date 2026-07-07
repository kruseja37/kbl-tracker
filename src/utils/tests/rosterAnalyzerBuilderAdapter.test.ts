import { describe, expect, test } from 'vitest';

import {
  analyzeBuilderLeagueRosters,
  analyzeBuilderTeamRoster,
  buildBuilderTeamAnalyzerInput,
  normalizeBuilderPlayerStatus,
} from '../rosterAnalyzerBuilderAdapter';
import type { Player, Team, TeamRoster } from '../leagueBuilderStorage';

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Builder Club',
    abbreviation: 'BLC',
    location: 'Builder',
    nickname: 'Club',
    colors: { primary: '#111111', secondary: '#ffffff' },
    stadium: 'Builder Park',
    leagueIds: ['league-1'],
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

function makeRoster(overrides: Partial<TeamRoster> = {}): TeamRoster {
  return {
    teamId: 'team-1',
    mlbRoster: [],
    farmRoster: [],
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
    lastModified: '2026-01-01',
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

describe('rosterAnalyzerBuilderAdapter', () => {
  test('maps Builder roster data into analyzer DTOs without counting excluded or damaged players as active', () => {
    const team = makeTeam();
    const players = [
      makePlayer({ id: 'active-1', primaryPosition: 'SS' }),
      makePlayer({
        id: 'farm-1',
        primaryPosition: 'CF',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
        ratingRevealState: 'hidden',
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
    const roster = makeRoster({
      mlbRoster: ['active-1', 'free-agent-1', 'retired-1', 'damaged-1'],
      farmRoster: ['farm-1'],
    });

    const input = buildBuilderTeamAnalyzerInput({
      leagueId: 'league-1',
      team,
      players,
      roster,
      config: { rosterTargets: { activeMlb: 1, farm: 1, total: 2 } },
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
    expect(input.roster.activePlayerIds).toEqual(['active-1']);
    expect(input.roster.farmPlayerIds).toEqual(['farm-1']);
  });

  test('normalizes damaged roster membership as unknown with an explicit reason', () => {
    const player = makePlayer({
      id: 'damaged-1',
      leagueAssignments: [],
    });
    const roster = makeRoster({ mlbRoster: ['damaged-1'] });

    const normalized = normalizeBuilderPlayerStatus(player, 'team-1', roster, 'league-1');

    expect(normalized).toMatchObject({
      status: 'UNKNOWN',
      relatedToTeam: true,
    });
    expect(normalized.reasons.join(' ')).toContain('no league assignment');
  });

  test('generates a read-only report and does not mutate Builder inputs', () => {
    const team = makeTeam();
    const players = [
      makePlayer({ id: 'active-1', primaryPosition: 'C' }),
      makePlayer({
        id: 'farm-1',
        primaryPosition: 'IF',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      }),
    ];
    const roster = makeRoster({
      mlbRoster: ['active-1'],
      farmRoster: ['farm-1'],
    });
    const before = JSON.parse(JSON.stringify({ team, players, roster }));

    deepFreeze(team);
    deepFreeze(players);
    deepFreeze(roster);

    const report = analyzeBuilderTeamRoster({
      leagueId: 'league-1',
      team,
      players,
      roster,
      config: { rosterTargets: { activeMlb: 1, farm: 1, total: 2 } },
    });

    expect(report.summary.readOnly).toBe(true);
    expect(report.identity).toMatchObject({
      mode: 'builder',
      surface: 'builder_team',
      leagueId: 'league-1',
      teamId: 'team-1',
    });
    expect(report.profile).toMatchObject({
      activeCount: 1,
      farmCount: 1,
      totalCount: 2,
    });
    expect(JSON.parse(JSON.stringify({ team, players, roster }))).toEqual(before);
  });

  test('preserves missing MLB roster IDs so analyzer emits data-integrity findings without mutating inputs', () => {
    const team = makeTeam();
    const players = [
      makePlayer({ id: 'active-1', primaryPosition: 'SS' }),
      makePlayer({
        id: 'free-agent-1',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FREE_AGENT' }],
      }),
    ];
    const roster = makeRoster({
      mlbRoster: ['active-1', 'missing-active-1', 'free-agent-1'],
    });
    const before = JSON.parse(JSON.stringify({ team, players, roster }));

    deepFreeze(team);
    deepFreeze(players);
    deepFreeze(roster);

    const input = buildBuilderTeamAnalyzerInput({
      leagueId: 'league-1',
      team,
      players,
      roster,
      config: { rosterTargets: { activeMlb: 2, farm: 0, total: 2 } },
    });
    const report = analyzeBuilderTeamRoster({
      leagueId: 'league-1',
      team,
      players,
      roster,
      config: { rosterTargets: { activeMlb: 2, farm: 0, total: 2 } },
    });

    expect(input.roster.activePlayerIds).toEqual(['active-1', 'missing-active-1']);
    expect(input.roster.activePlayerIds).not.toContain('free-agent-1');
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'data_integrity',
          title: 'Active roster references missing players',
          affectedPlayerIds: ['missing-active-1'],
        }),
      ]),
    );
    expect(JSON.parse(JSON.stringify({ team, players, roster }))).toEqual(before);
  });

  test('preserves missing farm roster IDs so analyzer emits data-integrity findings without counting excluded players', () => {
    const team = makeTeam();
    const players = [
      makePlayer({
        id: 'farm-1',
        primaryPosition: 'IF',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      }),
      makePlayer({
        id: 'retired-1',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'RETIRED' } as never],
      }),
    ];
    const roster = makeRoster({
      farmRoster: ['farm-1', 'missing-farm-1', 'retired-1'],
    });
    const before = JSON.parse(JSON.stringify({ team, players, roster }));

    deepFreeze(team);
    deepFreeze(players);
    deepFreeze(roster);

    const input = buildBuilderTeamAnalyzerInput({
      leagueId: 'league-1',
      team,
      players,
      roster,
      config: { rosterTargets: { activeMlb: 0, farm: 2, total: 2 } },
    });
    const report = analyzeBuilderTeamRoster({
      leagueId: 'league-1',
      team,
      players,
      roster,
      config: { rosterTargets: { activeMlb: 0, farm: 2, total: 2 } },
    });

    expect(input.roster.farmPlayerIds).toEqual(['farm-1', 'missing-farm-1']);
    expect(input.roster.farmPlayerIds).not.toContain('retired-1');
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'data_integrity',
          title: 'Farm roster references missing players',
          affectedPlayerIds: ['missing-farm-1'],
        }),
      ]),
    );
    expect(JSON.parse(JSON.stringify({ team, players, roster }))).toEqual(before);
  });

  test('generates per-team league reports without mutating inputs', () => {
    const teams = [
      makeTeam({ id: 'team-1', name: 'One' }),
      makeTeam({ id: 'team-2', name: 'Two' }),
      makeTeam({ id: 'team-3', name: 'No Roster' }),
    ];
    const players = [
      makePlayer({ id: 'one-1', leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }] }),
      makePlayer({ id: 'two-1', leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-2', rosterStatus: 'MLB' }] }),
    ];
    const rostersByTeamId = {
      'team-1': makeRoster({ teamId: 'team-1', mlbRoster: ['one-1'] }),
      'team-2': makeRoster({ teamId: 'team-2', mlbRoster: ['two-1'] }),
    };
    const before = JSON.parse(JSON.stringify({ teams, players, rostersByTeamId }));

    deepFreeze(teams);
    deepFreeze(players);
    deepFreeze(rostersByTeamId);

    const reports = analyzeBuilderLeagueRosters({
      leagueId: 'league-1',
      teams,
      players,
      rostersByTeamId,
      config: { rosterTargets: { activeMlb: 1, farm: 0, total: 1 } },
    });

    expect(reports.map((entry) => entry.teamId)).toEqual(['team-1', 'team-2']);
    expect(reports.map((entry) => entry.report.identity.teamId)).toEqual(['team-1', 'team-2']);
    expect(reports.every((entry) => entry.report.summary.readOnly)).toBe(true);
    expect(JSON.parse(JSON.stringify({ teams, players, rostersByTeamId }))).toEqual(before);
  });
});
