import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  validateFranchiseOffseasonScope: vi.fn(),
  saveFranchisePlayer: vi.fn(),
  savePlayer: vi.fn(),
  getAllPlayers: vi.fn(),
}));

vi.mock('../franchiseOffseasonDataAccess', () => ({
  validateFranchiseOffseasonScope: mocks.validateFranchiseOffseasonScope,
}));

vi.mock('../franchisePlayerStorage', () => ({
  saveFranchisePlayer: mocks.saveFranchisePlayer,
}));

vi.mock('../leagueBuilderStorage', () => ({
  savePlayer: mocks.savePlayer,
  getAllPlayers: mocks.getAllPlayers,
}));

import {
  FRANCHISE_RATINGS_SALARY_CALCULATION_VERSION,
  franchiseRatingsSalaryRecalculationAdapter,
  runFranchiseRatingsSalaryRecalculation,
} from '../franchiseRatingsSalaryAdapter';
import * as leagueBuilderStorage from '../leagueBuilderStorage';
import type { Player } from '../franchisePlayerStorage';

const context = {
  franchiseId: 'franchise-a',
  seasonId: 'franchise-a-season-3',
  seasonNumber: 3,
  offseasonStateId: 'offseason-franchise-a-season-3',
  phase: 'RATINGS_ADJUSTMENTS' as const,
};

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    id: overrides.id,
    firstName: 'Test',
    lastName: 'Player',
    gender: 'M',
    age: 26,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    power: 80,
    contact: 80,
    speed: 80,
    fielding: 80,
    arm: 80,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'D',
    personality: 'Jolly',
    chemistry: 'Spirited',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 0.5,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
    ...overrides,
  };
}

function seedValidation(players: Player[]) {
  seedValidationWithIssues(players, []);
}

function seedValidationWithIssues(players: Player[], issues: Array<Record<string, unknown>>) {
  mocks.validateFranchiseOffseasonScope.mockResolvedValue({
    valid: issues.every((issue) => issue.severity !== 'error'),
    context,
    issues,
    counts: { players: players.length, teams: 1 },
    scope: {
      context,
      offseasonState: {
        id: context.offseasonStateId,
        franchiseId: context.franchiseId,
        seasonId: context.seasonId,
        seasonNumber: context.seasonNumber,
        currentPhase: 'RATINGS_ADJUSTMENTS',
        phasesCompleted: [],
        status: 'IN_PROGRESS',
        startedAt: 1,
      },
      players,
      teams: [{ id: 'team-a' }],
      farmRecords: [],
      seasonSummary: null,
      transitionJournals: [],
      phase11RosterLock: null,
    },
  });
}

describe('franchise ratings/salary recalculation adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedValidation([makePlayer({ id: 'player-a' })]);
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId: string, player: Player) => player);
  });

  test('dry-run returns proposed grade/salary changes and writes nothing', async () => {
    const result = await runFranchiseRatingsSalaryRecalculation(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.data).toMatchObject({
      calculationVersion: FRANCHISE_RATINGS_SALARY_CALCULATION_VERSION,
      changedPlayerIds: ['player-a'],
      appliedPlayerIds: [],
      rollbackStatus: 'not_needed',
    });
    expect(result.data?.proposals[0]).toMatchObject({
      playerId: 'player-a',
      changed: true,
      changes: {
        overallGrade: { before: 'D', after: 'S' },
      },
    });
    expect(result.data?.proposals[0].changes.salary?.after).toBeGreaterThan(0.5);
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.savePlayer).not.toHaveBeenCalled();
    expect(mocks.validateFranchiseOffseasonScope).toHaveBeenCalledWith(context, {
      requireCurrentPhase: true,
      includeTransitionJournals: true,
    });
  });

  test('apply updates franchise-owned players only', async () => {
    const result = await runFranchiseRatingsSalaryRecalculation(context, { apply: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.data?.appliedPlayerIds).toEqual(['player-a']);
    expect(mocks.saveFranchisePlayer).toHaveBeenCalledTimes(1);
    expect(mocks.saveFranchisePlayer).toHaveBeenCalledWith(
      'franchise-a',
      expect.objectContaining({
        id: 'player-a',
        overallGrade: 'S',
        salary: expect.any(Number),
        power: 80,
        contact: 80,
        speed: 80,
        fielding: 80,
        arm: 80,
        velocity: 0,
        junk: 0,
        accuracy: 0,
      }),
    );
    expect(leagueBuilderStorage.savePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.getAllPlayers).not.toHaveBeenCalled();
  });

  test('dry-run returns pending and failed transition journal warnings without blocking success', async () => {
    seedValidationWithIssues(
      [makePlayer({ id: 'player-a' })],
      [
        {
          code: 'TRANSITION_ATTENTION_REQUIRED',
          severity: 'warning',
          message: 'Pending transition journal needs review.',
          details: { journalId: 'journal-pending', status: 'pending' },
        },
        {
          code: 'TRANSITION_ATTENTION_REQUIRED',
          severity: 'warning',
          message: 'Failed transition journal needs review.',
          details: { journalId: 'journal-failed', status: 'failed' },
        },
      ],
    );

    const result = await runFranchiseRatingsSalaryRecalculation(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.issues).toEqual(
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
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('apply returns transition journal warnings and still writes when warnings are non-blocking', async () => {
    seedValidationWithIssues(
      [makePlayer({ id: 'player-a' })],
      [
        {
          code: 'TRANSITION_ATTENTION_REQUIRED',
          severity: 'warning',
          message: 'Pending transition journal needs review.',
          details: { journalId: 'journal-pending', status: 'pending' },
        },
        {
          code: 'TRANSITION_ATTENTION_REQUIRED',
          severity: 'warning',
          message: 'Failed transition journal needs review.',
          details: { journalId: 'journal-failed', status: 'failed' },
        },
      ],
    );

    const result = await runFranchiseRatingsSalaryRecalculation(context, { apply: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.issues.filter((issue) => issue.code === 'TRANSITION_ATTENTION_REQUIRED')).toHaveLength(2);
    expect(mocks.saveFranchisePlayer).toHaveBeenCalledTimes(1);
  });

  test('wrong franchise or phase scope fails validation and writes nothing', async () => {
    mocks.validateFranchiseOffseasonScope.mockResolvedValue({
      valid: false,
      context,
      issues: [
        {
          code: 'OFFSEASON_FRANCHISE_MISMATCH',
          severity: 'error',
          message: 'Wrong franchise.',
          franchiseId: 'franchise-a',
          seasonId: 'franchise-a-season-3',
          seasonNumber: 3,
          offseasonStateId: context.offseasonStateId,
          phase: 'RATINGS_ADJUSTMENTS',
        },
      ],
      scope: null,
    });

    const result = await runFranchiseRatingsSalaryRecalculation(context, { apply: true });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('OFFSEASON_FRANCHISE_MISMATCH');
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('requested player ids must exist in franchise-owned player scope', async () => {
    const result = await runFranchiseRatingsSalaryRecalculation(
      context,
      { apply: true, playerIds: ['missing-player'] },
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PLAYER_NOT_FOUND');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PLAYER_NOT_FOUND',
          playerId: 'missing-player',
        }),
      ]),
    );
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('adapter requires RATINGS_ADJUSTMENTS phase', async () => {
    seedValidation([makePlayer({ id: 'player-a' })]);

    const result = await runFranchiseRatingsSalaryRecalculation(
      { ...context, phase: 'FREE_AGENCY' },
      { apply: true },
    );

    expect(result.success).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OFFSEASON_PHASE_MISMATCH',
          details: expect.objectContaining({ requiredPhase: 'RATINGS_ADJUSTMENTS' }),
        }),
      ]),
    );
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('write failure compensates by restoring prior player writes', async () => {
    const playerA = makePlayer({ id: 'player-a', firstName: 'One' });
    const playerB = makePlayer({ id: 'player-b', firstName: 'Two' });
    seedValidation([playerA, playerB]);
    mocks.saveFranchisePlayer
      .mockResolvedValueOnce({ ...playerA, overallGrade: 'S' })
      .mockRejectedValueOnce(new Error('save failed'))
      .mockResolvedValueOnce(playerA);

    const result = await runFranchiseRatingsSalaryRecalculation(context, { apply: true });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PLAYER_WRITE_FAILED');
    expect(result.data?.rollbackStatus).toBe('rolled_back');
    expect(result.data?.appliedPlayerIds).toEqual(['player-a']);
    expect(mocks.saveFranchisePlayer).toHaveBeenNthCalledWith(
      3,
      'franchise-a',
      expect.objectContaining({ id: 'player-a', overallGrade: 'D', salary: 0.5 }),
    );
  });

  test('rollback failure returns structured failure details', async () => {
    const playerA = makePlayer({ id: 'player-a', firstName: 'One' });
    const playerB = makePlayer({ id: 'player-b', firstName: 'Two' });
    seedValidation([playerA, playerB]);
    mocks.saveFranchisePlayer
      .mockResolvedValueOnce({ ...playerA, overallGrade: 'S' })
      .mockRejectedValueOnce(new Error('save failed'))
      .mockRejectedValueOnce(new Error('rollback failed'));

    const result = await franchiseRatingsSalaryRecalculationAdapter.execute(context, { apply: true });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PLAYER_ROLLBACK_FAILED');
    expect(result.data?.rollbackStatus).toBe('rollback_failed');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'PLAYER_WRITE_FAILED', playerId: 'player-b' }),
        expect.objectContaining({
          code: 'PLAYER_ROLLBACK_FAILED',
          details: expect.objectContaining({
            rollbackErrors: [
              expect.objectContaining({
                playerId: 'player-a',
                message: 'rollback failed',
              }),
            ],
          }),
        }),
      ]),
    );
  });
});
