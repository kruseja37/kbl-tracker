import { describe, expect, test } from 'vitest';

import {
  planFranchisePhase11RosterFromRecords,
} from '../franchisePhase11RosterPlanner';
import type { FranchiseFarmRecord } from '../franchiseFarmStorage';
import type { Player, Team } from '../franchisePlayerStorage';
import type { FranchisePhase11RosterLockResult } from '../franchiseRosterLockValidator';

function makePlayer(id: string, teamId: string, rosterStatus: string): Player {
  return {
    id,
    firstName: 'Test',
    lastName: id,
    gender: 'M',
    age: 24,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'C',
    personality: 'Jolly',
    chemistry: 'Spirited',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1000000,
    leagueAssignments: [{ leagueId: 'league-1', teamId, rosterStatus } as never],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
  };
}

function farmRecord(franchiseId: string, seasonId: string, teamId: string, playerId: string): FranchiseFarmRecord {
  return {
    id: `${franchiseId}:${seasonId}:${teamId}:${playerId}`,
    franchiseId,
    seasonId,
    seasonNumber: 4,
    teamId,
    playerId,
    rosterLevel: 'AAA',
    rosterStatus: 'FARM',
    optionsUsed: 0,
    optionDates: [],
    ratingRevealState: 'hidden',
    assignedAt: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
  };
}

function lock(overrides: Partial<FranchisePhase11RosterLockResult>): FranchisePhase11RosterLockResult {
  return {
    valid: true,
    franchiseId: 'franchise-a',
    seasonId: 'franchise-a-season-4',
    checkedTeamIds: ['team-a'],
    countsByTeam: [{ teamId: 'team-a', mlbCount: 22, farmCount: 10, totalCount: 32, excludedCount: 0 }],
    issues: [],
    ...overrides,
  };
}

describe('franchise Phase 11 roster planner', () => {
  test('reports valid 22 MLB / 10 FARM / 32 total as pass', () => {
    const franchiseId = 'franchise-a';
    const seasonId = 'franchise-a-season-4';
    const teamId = 'team-a';
    const players = [
      ...Array.from({ length: 22 }, (_, index) => makePlayer(`mlb-${index}`, teamId, 'MLB')),
      ...Array.from({ length: 10 }, (_, index) => makePlayer(`farm-${index}`, teamId, 'FARM')),
    ];
    const farms = players
      .filter((player) => player.id.startsWith('farm-'))
      .map((player) => farmRecord(franchiseId, seasonId, teamId, player.id));

    const plan = planFranchisePhase11RosterFromRecords({
      franchiseId,
      seasonId,
      players,
      teams: [{ id: teamId, name: 'Alpha' } as Team],
      farmRecords: farms,
      rosterLock: lock({ valid: true }),
    });

    expect(plan.valid).toBe(true);
    expect(plan.teams).toEqual([
      expect.objectContaining({
        teamId,
        mlbCount: 22,
        farmCount: 10,
        totalCount: 32,
        requirements: [],
      }),
    ]);
    expect(plan.totals).toMatchObject({ mlbCount: 22, farmCount: 10, totalCount: 32, requiredCuts: 0, requiredSignings: 0 });
  });

  test('reports too many or too few MLB/FARM players and total mismatch', () => {
    const plan = planFranchisePhase11RosterFromRecords({
      franchiseId: 'franchise-a',
      seasonId: 'franchise-a-season-4',
      players: [
        ...Array.from({ length: 24 }, (_, index) => makePlayer(`mlb-${index}`, 'team-a', 'MLB')),
        ...Array.from({ length: 8 }, (_, index) => makePlayer(`farm-${index}`, 'team-a', 'FARM')),
      ],
      farmRecords: Array.from({ length: 8 }, (_, index) =>
        farmRecord('franchise-a', 'franchise-a-season-4', 'team-a', `farm-${index}`),
      ),
      rosterLock: lock({
        valid: false,
        countsByTeam: [{ teamId: 'team-a', mlbCount: 24, farmCount: 8, totalCount: 32, excludedCount: 0 }],
        issues: [
          { code: 'MLB_COUNT_MISMATCH', severity: 'error', teamId: 'team-a', message: 'too many MLB' },
          { code: 'FARM_COUNT_MISMATCH', severity: 'error', teamId: 'team-a', message: 'too few farm' },
        ],
      }),
    });

    expect(plan.valid).toBe(false);
    expect(plan.teams[0].requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'CUT_MLB', count: 2 }),
        expect.objectContaining({ action: 'SIGN_FARM', count: 2 }),
      ]),
    );
    expect(plan.blockingLockIssues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['MLB_COUNT_MISMATCH', 'FARM_COUNT_MISMATCH']),
    );
  });

  test('surfaces damaged farm/player status issues as repair requirements', () => {
    const plan = planFranchisePhase11RosterFromRecords({
      franchiseId: 'franchise-a',
      seasonId: 'franchise-a-season-4',
      players: [makePlayer('farm-bad', 'team-a', 'MLB')],
      farmRecords: [farmRecord('franchise-a', 'franchise-a-season-4', 'team-a', 'farm-bad')],
      rosterLock: lock({
        valid: false,
        issues: [
          {
            code: 'FARM_RECORD_STATUS_MISMATCH',
            severity: 'error',
            teamId: 'team-a',
            playerId: 'farm-bad',
            message: 'farm/player mismatch',
          },
        ],
      }),
    });

    expect(plan.valid).toBe(false);
    expect(plan.teams[0].requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'REPAIR_STATUS', count: 1 }),
      ]),
    );
  });
});
