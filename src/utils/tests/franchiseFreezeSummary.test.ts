import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getFranchiseConfig: vi.fn(),
  getAllFranchisePlayers: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
  listFranchiseMoraleSnapshots: vi.fn(),
  getFranchiseTrueValueRows: vi.fn(),
}));

vi.mock('../franchiseManager', () => ({
  getFranchiseConfig: mocks.getFranchiseConfig,
}));

vi.mock('../franchisePlayerStorage', () => ({
  getAllFranchisePlayers: mocks.getAllFranchisePlayers,
  getAllFranchiseTeams: mocks.getAllFranchiseTeams,
}));

vi.mock('../franchiseMoraleState', () => ({
  listFranchiseMoraleSnapshots: mocks.listFranchiseMoraleSnapshots,
}));

vi.mock('../franchiseTrueValueStorage', () => ({
  getFranchiseTrueValueRows: mocks.getFranchiseTrueValueRows,
}));

import { loadFranchiseFreezeSummary } from '../franchiseFreezeSummary';

describe('franchise freeze summary reader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFranchiseConfig.mockResolvedValue({
      leagueDetails: { name: 'Fixture League' },
      rosterRequirements: {
        teamCounts: {
          'team-a': { MLB: 22, FARM: 10 },
          'team-b': { MLB: 22, FARM: 10 },
        },
      },
      salaryBaseline: {
        teamPayrolls: {
          'team-a': 120000,
          'team-b': 98000,
        },
      },
    });
    mocks.getAllFranchiseTeams.mockResolvedValue([
      { id: 'team-a', name: 'Alpha Club' },
      { id: 'team-b', name: 'Beta Club' },
    ]);
    mocks.getAllFranchisePlayers.mockResolvedValue([
      {
        id: 'player-a',
        settledSalary: 25000,
        leagueAssignments: [{ teamId: 'team-a', rosterStatus: 'MLB' }],
      },
      {
        id: 'player-b',
        leagueAssignments: [{ teamId: 'team-a', rosterStatus: 'FARM' }],
      },
    ]);
    mocks.listFranchiseMoraleSnapshots.mockResolvedValue([
      { targetType: 'player', playerId: 'player-a', baselineValue: 58 },
      { targetType: 'player', playerId: 'player-b', baselineValue: 46 },
      { targetType: 'team-fan', teamId: 'team-a', baselineValue: 53 },
      { targetType: 'team-fan', teamId: 'team-b', baselineValue: 47 },
    ]);
    mocks.getFranchiseTrueValueRows.mockResolvedValue([
      { playerId: 'player-a', contractValue: 25000 },
      { playerId: 'player-b', contractValue: 14000 },
    ]);
  });

  test('loads post-freeze display data only from persisted franchise stores', async () => {
    const summary = await loadFranchiseFreezeSummary('franchise-fixture');

    expect(mocks.getFranchiseConfig).toHaveBeenCalledWith('franchise-fixture');
    expect(mocks.getAllFranchisePlayers).toHaveBeenCalledWith('franchise-fixture');
    expect(mocks.getAllFranchiseTeams).toHaveBeenCalledWith('franchise-fixture');
    expect(mocks.listFranchiseMoraleSnapshots).toHaveBeenCalledWith(
      'franchise-fixture',
      'franchise-fixture-season-1',
      'franchise-fixture-season-1',
      1,
    );
    expect(mocks.getFranchiseTrueValueRows).toHaveBeenCalledWith({
      franchiseId: 'franchise-fixture',
      seasonId: 'franchise-fixture-season-1',
      statsScopeId: 'draft-baseline',
    });

    expect(summary).toMatchObject({
      franchiseId: 'franchise-fixture',
      seasonId: 'franchise-fixture-season-1',
      leagueName: 'Fixture League',
      frozenPlayerRows: 2,
      settledSalaryPlayerRows: 1,
      draftBaselineRows: 2,
      draftBaselineContractRows: 2,
      rosterTotals: {
        mlb: 44,
        farm: 20,
      },
      morale: {
        playerCount: 2,
        playerAverage: 52,
        playerMin: 46,
        playerMax: 58,
        teamFanCount: 2,
        teamFanAverage: 50,
        teamFanMin: 47,
        teamFanMax: 53,
      },
    });
    expect(summary.teams).toEqual([
      expect.objectContaining({
        teamId: 'team-a',
        teamName: 'Alpha Club',
        payrollBaseline: 120000,
        mlbRosterCount: 22,
        farmRosterCount: 10,
        fanMoraleBaseline: 53,
      }),
      expect.objectContaining({
        teamId: 'team-b',
        teamName: 'Beta Club',
        payrollBaseline: 98000,
        mlbRosterCount: 22,
        farmRosterCount: 10,
        fanMoraleBaseline: 47,
      }),
    ]);
    expect(summary.notDisplayable.join(' ')).toMatch(/team payroll totals are not persisted/i);
    expect(summary.notDisplayable.join(' ')).toMatch(/slot class and pay class are not persisted/i);
  });
});
