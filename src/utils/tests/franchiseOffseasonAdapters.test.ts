import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAllFranchisePlayers: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
  getFranchisePlayer: vi.fn(),
  getFranchiseTeam: vi.fn(),
  getFranchiseFarmRecordsForSeason: vi.fn(),
  getOffseasonState: vi.fn(),
  getFranchiseSeasonSummary: vi.fn(),
  listFranchiseTransitionJournals: vi.fn(),
  validateFranchisePhase11RosterLock: vi.fn(),
  getAllPlayers: vi.fn(),
  getAllTeams: vi.fn(),
  getLeagueTemplate: vi.fn(),
}));

vi.mock('../franchisePlayerStorage', () => ({
  getAllFranchisePlayers: mocks.getAllFranchisePlayers,
  getAllFranchiseTeams: mocks.getAllFranchiseTeams,
  getFranchisePlayer: mocks.getFranchisePlayer,
  getFranchiseTeam: mocks.getFranchiseTeam,
}));

vi.mock('../franchiseFarmStorage', () => ({
  getFranchiseFarmRecordsForSeason: mocks.getFranchiseFarmRecordsForSeason,
}));

vi.mock('../offseasonStorage', async () => {
  const actual = await vi.importActual<typeof import('../offseasonStorage')>('../offseasonStorage');
  return {
    ...actual,
    getOffseasonState: mocks.getOffseasonState,
  };
});

vi.mock('../franchiseSeasonSummaryStorage', () => ({
  getFranchiseSeasonSummary: mocks.getFranchiseSeasonSummary,
}));

vi.mock('../franchiseTransitionJournal', () => ({
  listFranchiseTransitionJournals: mocks.listFranchiseTransitionJournals,
}));

vi.mock('../franchiseRosterLockValidator', () => ({
  validateFranchisePhase11RosterLock: mocks.validateFranchisePhase11RosterLock,
}));

vi.mock('../leagueBuilderStorage', () => ({
  getAllPlayers: mocks.getAllPlayers,
  getAllTeams: mocks.getAllTeams,
  getLeagueTemplate: mocks.getLeagueTemplate,
}));

import {
  createUnavailableFranchiseOffseasonAdapter,
  makeFranchiseOffseasonAdapterContext,
  validateFranchiseOffseasonAdapterContext,
} from '../franchiseOffseasonAdapters';
import {
  loadFranchiseOffseasonAdapterScope,
  validateFranchiseOffseasonScope,
} from '../franchiseOffseasonDataAccess';
import * as leagueBuilderStorage from '../leagueBuilderStorage';

function makeContext(overrides = {}) {
  return makeFranchiseOffseasonAdapterContext({
    franchiseId: 'franchise-a',
    seasonId: 'franchise-a-season-3',
    seasonNumber: 3,
    phase: 'RETIREMENTS',
    ...overrides,
  });
}

function seedHealthyScope() {
  mocks.getOffseasonState.mockResolvedValue({
    id: 'offseason-franchise-a-season-3',
    franchiseId: 'franchise-a',
    seasonId: 'franchise-a-season-3',
    seasonNumber: 3,
    currentPhase: 'RETIREMENTS',
    phasesCompleted: [],
    status: 'IN_PROGRESS',
    startedAt: 1,
  });
  mocks.getAllFranchisePlayers.mockResolvedValue([
    {
      id: 'player-a',
      leagueAssignments: [{ teamId: 'team-a', rosterStatus: 'MLB' }],
    },
    {
      id: 'farm-player-a',
      leagueAssignments: [{ teamId: 'team-a', rosterStatus: 'FARM' }],
    },
  ]);
  mocks.getAllFranchiseTeams.mockResolvedValue([{ id: 'team-a', name: 'Alpha' }]);
  mocks.getFranchisePlayer.mockResolvedValue(null);
  mocks.getFranchiseTeam.mockResolvedValue(null);
  mocks.getFranchiseFarmRecordsForSeason.mockResolvedValue([
    {
      id: 'farm-a',
      franchiseId: 'franchise-a',
      seasonId: 'franchise-a-season-3',
      seasonNumber: 3,
      teamId: 'team-a',
      playerId: 'farm-player-a',
      rosterStatus: 'FARM',
    },
  ]);
  mocks.getFranchiseSeasonSummary.mockResolvedValue({
    franchiseId: 'franchise-a',
    seasonId: 'franchise-a-season-3',
    seasonNumber: 3,
  });
  mocks.listFranchiseTransitionJournals.mockResolvedValue([]);
  mocks.validateFranchisePhase11RosterLock.mockResolvedValue({
    valid: true,
    franchiseId: 'franchise-a',
    seasonId: 'franchise-a-season-3',
    checkedTeamIds: ['team-a'],
    countsByTeam: [],
    issues: [],
  });
}

describe('franchise offseason adapter foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedHealthyScope();
  });

  test('requires canonical franchise offseason identity fields', () => {
    const issues = validateFranchiseOffseasonAdapterContext({
      seasonNumber: 0,
      phase: 'NOT_A_PHASE' as never,
    });

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'MISSING_FRANCHISE_ID',
        'MISSING_SEASON_ID',
        'MISSING_SEASON_NUMBER',
        'MISSING_OFFSEASON_STATE_ID',
        'INVALID_PHASE',
      ]),
    );
  });

  test('loads franchise-owned offseason scope without League Builder/global reads', async () => {
    const context = makeContext();

    const scope = await loadFranchiseOffseasonAdapterScope(context, {
      includeFarmRecords: true,
      includeSeasonSummary: true,
      includeTransitionJournals: true,
    });

    expect(scope.offseasonState).toMatchObject({ franchiseId: 'franchise-a' });
    expect(scope.players).toHaveLength(2);
    expect(scope.teams).toHaveLength(1);
    expect(scope.farmRecords).toHaveLength(1);
    expect(scope.seasonSummary).toMatchObject({ seasonId: 'franchise-a-season-3' });
    expect(mocks.getAllFranchisePlayers).toHaveBeenCalledWith('franchise-a');
    expect(mocks.getAllFranchiseTeams).toHaveBeenCalledWith('franchise-a');
    expect(mocks.getFranchiseFarmRecordsForSeason).toHaveBeenCalledWith(
      'franchise-a',
      'franchise-a-season-3',
    );
    expect(leagueBuilderStorage.getAllPlayers).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.getAllTeams).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.getLeagueTemplate).not.toHaveBeenCalled();
  });

  test('validates current phase and franchise-owned player/team references', async () => {
    const context = makeContext({
      actorTeamId: 'team-a',
      actorPlayerId: 'player-a',
    });

    const report = await validateFranchiseOffseasonScope(context);

    expect(report.valid).toBe(true);
    expect(report.counts).toMatchObject({ players: 2, teams: 1 });
    expect(report.issues).toEqual([]);
  });

  test('returns structured failures for missing offseason state and missing franchise-owned references', async () => {
    mocks.getOffseasonState.mockResolvedValue(null);
    mocks.getAllFranchisePlayers.mockResolvedValue([]);
    mocks.getAllFranchiseTeams.mockResolvedValue([]);
    mocks.getFranchisePlayer.mockResolvedValue(null);
    mocks.getFranchiseTeam.mockResolvedValue(null);

    const report = await validateFranchiseOffseasonScope(
      makeContext({
        actorTeamId: 'missing-team',
        actorPlayerId: 'missing-player',
      }),
    );

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'OFFSEASON_STATE_NOT_FOUND' }),
        expect.objectContaining({ code: 'TEAM_NOT_FOUND', teamId: 'missing-team' }),
        expect.objectContaining({ code: 'PLAYER_NOT_FOUND', playerId: 'missing-player' }),
      ]),
    );
  });

  test('rejects offseason state owned by another franchise or phase', async () => {
    mocks.getOffseasonState.mockResolvedValue({
      id: 'offseason-other-season-3',
      franchiseId: 'other-franchise',
      seasonId: 'other-franchise-season-3',
      seasonNumber: 3,
      currentPhase: 'DRAFT',
      phasesCompleted: [],
      status: 'IN_PROGRESS',
      startedAt: 1,
    });

    const report = await validateFranchiseOffseasonScope(makeContext());

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'OFFSEASON_STATE_ID_MISMATCH' }),
        expect.objectContaining({ code: 'OFFSEASON_FRANCHISE_MISMATCH' }),
        expect.objectContaining({ code: 'OFFSEASON_SEASON_MISMATCH' }),
        expect.objectContaining({ code: 'OFFSEASON_PHASE_MISMATCH' }),
      ]),
    );
  });

  test('surfaces Phase 11 roster-lock failures without mutating roster state', async () => {
    mocks.getOffseasonState.mockResolvedValue({
      id: 'offseason-franchise-a-season-3',
      franchiseId: 'franchise-a',
      seasonId: 'franchise-a-season-3',
      seasonNumber: 3,
      currentPhase: 'SPRING_TRAINING',
      phasesCompleted: [],
      status: 'IN_PROGRESS',
      startedAt: 1,
    });
    mocks.validateFranchisePhase11RosterLock.mockResolvedValue({
      valid: false,
      franchiseId: 'franchise-a',
      seasonId: 'franchise-a-season-3',
      checkedTeamIds: ['team-a'],
      countsByTeam: [],
      issues: [{ code: 'MLB_COUNT_MISMATCH', severity: 'error', message: 'Need 22 MLB players.' }],
    });

    const report = await validateFranchiseOffseasonScope(
      makeContext({ phase: 'SPRING_TRAINING' }),
      { includePhase11RosterLock: true, rosterLockTeamIds: ['team-a'] },
    );

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PHASE_11_LOCK_FAILED',
          details: expect.objectContaining({
            rosterLockIssues: expect.arrayContaining([
              expect.objectContaining({ code: 'MLB_COUNT_MISMATCH' }),
            ]),
          }),
        }),
      ]),
    );
    expect(mocks.validateFranchisePhase11RosterLock).toHaveBeenCalledWith({
      franchiseId: 'franchise-a',
      seasonId: 'franchise-a-season-3',
      teamIds: ['team-a'],
    });
  });

  test('rejects wrong-scope season summaries when a future adapter requests summary data', async () => {
    mocks.getFranchiseSeasonSummary.mockResolvedValue({
      franchiseId: 'other-franchise',
      seasonId: 'other-franchise-season-99',
      seasonNumber: 99,
    });

    const report = await validateFranchiseOffseasonScope(makeContext(), {
      includeSeasonSummary: true,
    });

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SEASON_SUMMARY_SCOPE_MISMATCH',
          details: expect.objectContaining({
            actual: expect.objectContaining({
              franchiseId: 'other-franchise',
              seasonId: 'other-franchise-season-99',
              seasonNumber: 99,
            }),
          }),
        }),
      ]),
    );
  });

  test('reports missing season summaries when requested by an adapter', async () => {
    mocks.getFranchiseSeasonSummary.mockResolvedValue(null);

    const report = await validateFranchiseOffseasonScope(makeContext(), {
      includeSeasonSummary: true,
    });

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SEASON_SUMMARY_MISSING' }),
      ]),
    );
  });

  test('rejects damaged farm records rather than silently entering adapter scope', async () => {
    mocks.getFranchiseFarmRecordsForSeason.mockResolvedValue([
      {
        id: 'farm-wrong-scope',
        franchiseId: 'other-franchise',
        seasonId: 'other-franchise-season-3',
        seasonNumber: 99,
        teamId: 'missing-team',
        playerId: 'missing-player',
        rosterStatus: 'FARM',
      },
      {
        id: 'farm-status-mismatch',
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-3',
        seasonNumber: 3,
        teamId: 'team-a',
        playerId: 'player-a',
        rosterStatus: 'FARM',
      },
    ]);

    const report = await validateFranchiseOffseasonScope(makeContext(), {
      includeFarmRecords: true,
    });

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FARM_RECORD_SCOPE_MISMATCH',
          details: expect.objectContaining({ farmRecordId: 'farm-wrong-scope' }),
        }),
        expect.objectContaining({
          code: 'FARM_RECORD_PLAYER_MISSING',
          playerId: 'missing-player',
        }),
        expect.objectContaining({
          code: 'FARM_RECORD_TEAM_MISSING',
          teamId: 'missing-team',
        }),
        expect.objectContaining({
          code: 'FARM_RECORD_STATUS_MISMATCH',
          playerId: 'player-a',
          details: expect.objectContaining({ actualRosterStatus: 'MLB' }),
        }),
      ]),
    );
  });

  test('rejects farm records with missing, non-numeric, or mismatched seasonNumber', async () => {
    mocks.getFranchiseFarmRecordsForSeason.mockResolvedValue([
      {
        id: 'farm-missing-season-number',
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-3',
        teamId: 'team-a',
        playerId: 'farm-player-a',
        rosterStatus: 'FARM',
      },
      {
        id: 'farm-non-numeric-season-number',
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-3',
        seasonNumber: '3',
        teamId: 'team-a',
        playerId: 'farm-player-a',
        rosterStatus: 'FARM',
      },
      {
        id: 'farm-mismatched-season-number',
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-3',
        seasonNumber: 4,
        teamId: 'team-a',
        playerId: 'farm-player-a',
        rosterStatus: 'FARM',
      },
    ]);

    const report = await validateFranchiseOffseasonScope(makeContext(), {
      includeFarmRecords: true,
    });

    expect(report.valid).toBe(false);
    const scopeIssues = report.issues.filter(
      (issue) => issue.code === 'FARM_RECORD_SCOPE_MISMATCH',
    );
    expect(scopeIssues).toHaveLength(3);
    expect(scopeIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          details: expect.objectContaining({ farmRecordId: 'farm-missing-season-number' }),
        }),
        expect.objectContaining({
          details: expect.objectContaining({ farmRecordId: 'farm-non-numeric-season-number' }),
        }),
        expect.objectContaining({
          details: expect.objectContaining({ farmRecordId: 'farm-mismatched-season-number' }),
        }),
      ]),
    );
  });

  test('rejects farm records whose own rosterStatus is not FARM', async () => {
    mocks.getFranchiseFarmRecordsForSeason.mockResolvedValue([
      {
        id: 'farm-record-mlb-status',
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-3',
        seasonNumber: 3,
        teamId: 'team-a',
        playerId: 'farm-player-a',
        rosterStatus: 'MLB',
      },
    ]);

    const report = await validateFranchiseOffseasonScope(makeContext(), {
      includeFarmRecords: true,
    });

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FARM_RECORD_STATUS_MISMATCH',
          details: expect.objectContaining({
            farmRecordId: 'farm-record-mlb-status',
            actualFarmRecordStatus: 'MLB',
          }),
        }),
      ]),
    );
  });

  test('surfaces pending and failed transition journals as attention warnings', async () => {
    mocks.listFranchiseTransitionJournals.mockResolvedValue([
      {
        id: 'journal-pending',
        franchiseId: 'franchise-a',
        status: 'pending',
        createdAt: 3,
      },
      {
        id: 'journal-failed',
        franchiseId: 'franchise-a',
        status: 'failed',
        createdAt: 2,
      },
      {
        id: 'journal-committed',
        franchiseId: 'franchise-a',
        status: 'committed',
        createdAt: 1,
      },
    ]);

    const report = await validateFranchiseOffseasonScope(makeContext(), {
      includeTransitionJournals: true,
    });

    expect(report.valid).toBe(true);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TRANSITION_ATTENTION_REQUIRED',
          severity: 'warning',
          details: expect.objectContaining({ journalId: 'journal-pending' }),
        }),
        expect.objectContaining({
          code: 'TRANSITION_ATTENTION_REQUIRED',
          severity: 'warning',
          details: expect.objectContaining({ journalId: 'journal-failed' }),
        }),
      ]),
    );
    expect(
      report.issues.filter((issue) => issue.code === 'TRANSITION_ATTENTION_REQUIRED'),
    ).toHaveLength(2);
  });

  test('unavailable phase adapters expose the v1 non-mutating boundary', async () => {
    const adapter = createUnavailableFranchiseOffseasonAdapter(
      'FREE_AGENCY',
      'Free agency is guarded in Franchise Mode v1.',
    );

    const result = await adapter.execute(makeContext({ phase: 'FREE_AGENCY', dryRun: true }));

    expect(adapter.implemented).toBe(false);
    expect(result).toMatchObject({
      success: false,
      dryRun: true,
      errorCode: 'ADAPTER_NOT_IMPLEMENTED',
    });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ADAPTER_NOT_IMPLEMENTED' }),
      ]),
    );
  });
});
