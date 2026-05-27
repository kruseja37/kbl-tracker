import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  validateFranchiseOffseasonScope: vi.fn(),
  saveFranchisePlayer: vi.fn(),
  saveFranchiseTeam: vi.fn(),
  saveFranchiseFarmRecord: vi.fn(),
  deleteFranchiseFarmRecord: vi.fn(),
  savePlayer: vi.fn(),
  saveTeamRoster: vi.fn(),
  logMode2V1Transaction: vi.fn(),
  logTransaction: vi.fn(),
}));

vi.mock('../franchiseOffseasonDataAccess', () => ({
  validateFranchiseOffseasonScope: mocks.validateFranchiseOffseasonScope,
}));

vi.mock('../franchisePlayerStorage', () => ({
  saveFranchisePlayer: mocks.saveFranchisePlayer,
  saveFranchiseTeam: mocks.saveFranchiseTeam,
}));

vi.mock('../franchiseFarmStorage', () => ({
  saveFranchiseFarmRecord: mocks.saveFranchiseFarmRecord,
  deleteFranchiseFarmRecord: mocks.deleteFranchiseFarmRecord,
}));

vi.mock('../leagueBuilderStorage', () => ({
  savePlayer: mocks.savePlayer,
  saveTeamRoster: mocks.saveTeamRoster,
}));

vi.mock('../transactionStorage', () => ({
  logMode2V1Transaction: mocks.logMode2V1Transaction,
  logTransaction: mocks.logTransaction,
}));

import {
  FRANCHISE_DRAFT_CALCULATION_VERSION,
  runFranchiseDraftDryRun,
} from '../franchiseDraftAdapter';
import * as franchisePlayerStorage from '../franchisePlayerStorage';
import * as franchiseFarmStorage from '../franchiseFarmStorage';
import * as leagueBuilderStorage from '../leagueBuilderStorage';
import * as transactionStorage from '../transactionStorage';
import type { FranchiseFarmRecord } from '../franchiseFarmStorage';
import type { Player, Team } from '../franchisePlayerStorage';

const context = {
  franchiseId: 'franchise-a',
  seasonId: 'franchise-a-season-3',
  seasonNumber: 3,
  offseasonStateId: 'offseason-franchise-a-season-3',
  phase: 'DRAFT' as const,
};

function makePlayer(overrides: Partial<Player> & Record<string, unknown> & { id: string }): Player {
  return {
    id: overrides.id,
    firstName: 'Test',
    lastName: 'Player',
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
    morale: 55,
    mojo: 'Normal',
    fame: 0,
    salary: 1.2,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
    ...overrides,
  } as Player;
}

function makeFarmRecord(playerId: string, teamId = 'team-a'): FranchiseFarmRecord {
  return {
    id: `farm-${teamId}-${playerId}`,
    franchiseId: context.franchiseId,
    seasonId: context.seasonId,
    seasonNumber: context.seasonNumber,
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

function makePlayers(): Player[] {
  const mlbPositions = ['SS', '2B', '1B', '3B', 'LF', 'CF', 'RF', 'SP', 'SP', 'SP', 'RP', 'RP'];
  const farmPositions = ['SS', 'CF', 'SP', 'RP', '1B', 'LF', '2B', '3B'];
  return [
    ...mlbPositions.map((position, index) =>
      makePlayer({
        id: `mlb-${index + 1}`,
        firstName: 'MLB',
        lastName: `${index + 1}`,
        primaryPosition: position,
        secondaryPosition: '',
      }),
    ),
    ...farmPositions.map((position, index) =>
      makePlayer({
        id: `farm-${index + 1}`,
        firstName: 'Farm',
        lastName: `${index + 1}`,
        primaryPosition: position,
        secondaryPosition: '',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
      }),
    ),
  ];
}

function seedValidation(
  players: Player[] = makePlayers(),
  farmRecords: FranchiseFarmRecord[] = makePlayers()
    .filter((player) => player.id.startsWith('farm-'))
    .map((player) => makeFarmRecord(player.id)),
  issues: Array<Record<string, unknown>> = [],
  teams: Team[] = [{ id: 'team-a', name: 'Alpha' } as Team],
) {
  mocks.validateFranchiseOffseasonScope.mockResolvedValue({
    valid: issues.every((issue) => issue.severity !== 'error'),
    context,
    issues,
    counts: { players: players.length, teams: teams.length, farmRecords: farmRecords.length },
    scope: {
      context,
      offseasonState: {
        id: context.offseasonStateId,
        franchiseId: context.franchiseId,
        seasonId: context.seasonId,
        seasonNumber: context.seasonNumber,
        currentPhase: 'DRAFT',
        phasesCompleted: ['RETIREMENTS', 'FREE_AGENCY'],
        status: 'IN_PROGRESS',
        startedAt: 1,
      },
      players,
      teams,
      farmRecords,
      seasonSummary: null,
      transitionJournals: [],
      phase11RosterLock: null,
    },
  });
}

describe('franchise draft dry-run adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedValidation();
  });

  test('dry-run returns team readiness from franchise-owned roster and farm data without writes', async () => {
    const result = await runFranchiseDraftDryRun(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.data).toMatchObject({
      calculationVersion: FRANCHISE_DRAFT_CALCULATION_VERSION,
      draftClassPreviewUnavailable: true,
      teamIds: ['team-a'],
      limitations: expect.arrayContaining([
        'No draft decisions are finalized by this adapter.',
        'No prospects are generated or persisted.',
        'No players are drafted, released, signed, replaced, retired, or written.',
        'No transactions are logged.',
      ]),
    });
    expect(result.data?.teamReports[0]).toMatchObject({
      teamId: 'team-a',
      teamName: 'Alpha',
      mlbCount: 12,
      farmCount: 8,
      totalCount: 20,
      mlbVacancies: 10,
      farmVacancies: 2,
      totalVacancies: 12,
      draftUrgency: 'high',
      draftClassPreviewUnavailable: true,
      evidence: expect.arrayContaining([
        'MLB roster count: 12/22.',
        'Farm record count: 8/10.',
        'Total roster count: 20/32.',
        'This team would need 2 draft/farm additions to reach 10 farm players.',
      ]),
    });
    expect(result.data?.teamReports[0].positionNeeds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'Catcher depth', severity: 'medium' }),
        expect.objectContaining({ role: 'Relief pitching depth' }),
      ]),
    );
    expect(mocks.validateFranchiseOffseasonScope).toHaveBeenCalledWith(context, {
      requireCurrentPhase: true,
      includeFarmRecords: true,
      includeTransitionJournals: true,
    });
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchisePlayerStorage.saveFranchiseTeam).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.saveFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.savePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.saveTeamRoster).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
    expect(transactionStorage.logTransaction).not.toHaveBeenCalled();
  });

  test('can filter readiness to requested franchise-owned teams', async () => {
    seedValidation(
      makePlayers(),
      makePlayers().filter((player) => player.id.startsWith('farm-')).map((player) => makeFarmRecord(player.id)),
      [],
      [
        { id: 'team-a', name: 'Alpha' } as Team,
        { id: 'team-b', name: 'Beta' } as Team,
      ],
    );

    const result = await runFranchiseDraftDryRun(context, {
      dryRun: true,
      teamIds: ['team-b'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.teamIds).toEqual(['team-b']);
    expect(result.data?.teamReports[0]).toMatchObject({
      teamId: 'team-b',
      mlbCount: 0,
      farmCount: 0,
      draftUrgency: 'unknown',
      limitations: expect.arrayContaining([
        'No franchise-owned farm records were found for this team; farm vacancy confidence is limited.',
      ]),
    });
  });

  test('wrong franchise/offseason context fails validation and writes nothing', async () => {
    mocks.validateFranchiseOffseasonScope.mockResolvedValue({
      valid: false,
      context,
      issues: [
        {
          code: 'OFFSEASON_FRANCHISE_MISMATCH',
          severity: 'error',
          message: 'Wrong franchise.',
        },
      ],
      scope: null,
    });

    const result = await runFranchiseDraftDryRun(context, { dryRun: true });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('OFFSEASON_FRANCHISE_MISMATCH');
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.saveFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('phase mismatch fails explicit draft validation', async () => {
    const wrongPhaseContext = { ...context, phase: 'FREE_AGENCY' as const };

    const result = await runFranchiseDraftDryRun(wrongPhaseContext, { dryRun: true });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('OFFSEASON_PHASE_MISMATCH');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OFFSEASON_PHASE_MISMATCH',
          message: 'Draft dry-run requires the DRAFT offseason phase.',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('transition journal warnings surface but remain non-blocking', async () => {
    seedValidation(
      makePlayers(),
      makePlayers().filter((player) => player.id.startsWith('farm-')).map((player) => makeFarmRecord(player.id)),
      [
        {
          code: 'TRANSITION_ATTENTION_REQUIRED',
          severity: 'warning',
          message: 'Pending transition journal needs review.',
          details: { journalId: 'journal-pending', status: 'pending' },
        },
      ],
    );

    const result = await runFranchiseDraftDryRun(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TRANSITION_ATTENTION_REQUIRED', severity: 'warning' }),
      ]),
    );
    expect(result.data?.teamIds).toEqual(['team-a']);
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('missing farm and position data produce limitations instead of confident results', async () => {
    seedValidation([
      makePlayer({
        id: 'damaged-player',
        firstName: 'Damaged',
        lastName: 'Record',
        primaryPosition: undefined,
        secondaryPosition: undefined,
      } as Partial<Player> & Record<string, unknown> & { id: string }),
    ], []);

    const result = await runFranchiseDraftDryRun(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.data?.teamReports[0]).toMatchObject({
      teamId: 'team-a',
      farmCount: 0,
      draftUrgency: 'unknown',
      trustLevel: 'low',
      limitations: expect.arrayContaining([
        'No franchise-owned farm records were found for this team; farm vacancy confidence is limited.',
        'One or more franchise players are missing position data; position need confidence is limited.',
      ]),
    });
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('missing requested team fails validation and writes nothing', async () => {
    const result = await runFranchiseDraftDryRun(context, {
      dryRun: true,
      teamIds: ['missing-team'],
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TEAM_NOT_FOUND');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TEAM_NOT_FOUND',
          teamId: 'missing-team',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.saveFranchiseFarmRecord).not.toHaveBeenCalled();
  });

  test('method version and draft-class limitations are present', async () => {
    const result = await runFranchiseDraftDryRun(context, { dryRun: true });

    expect(result.data?.calculationVersion).toBe('franchise-draft-v1-roster-readiness-dry-run');
    expect(result.data?.method).toMatch(/Dry-run only: franchise-owned roster\/farm readiness preview/);
    expect(result.data?.draftClassPreviewUnavailable).toBe(true);
    expect(result.data?.limitations).toEqual(
      expect.arrayContaining([
        'Draft class generation, pick execution, replacement rules, and post-draft salary recalculation are deferred.',
      ]),
    );
  });

  test('apply attempts are rejected because the adapter is dry-run only', async () => {
    const result = await runFranchiseDraftDryRun(context, { apply: true });

    expect(result.success).toBe(false);
    expect(result.dryRun).toBe(true);
    expect(result.errorCode).toBe('ADAPTER_NOT_IMPLEMENTED');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ADAPTER_NOT_IMPLEMENTED',
          message: 'Franchise draft apply/commit is not implemented; this adapter is dry-run only.',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.saveFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });
});
