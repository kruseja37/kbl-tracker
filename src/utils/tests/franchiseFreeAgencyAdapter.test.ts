import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  validateFranchiseOffseasonScope: vi.fn(),
  saveFranchisePlayer: vi.fn(),
  savePlayer: vi.fn(),
  transferPlayer: vi.fn(),
  retirePlayer: vi.fn(),
  logMode2V1Transaction: vi.fn(),
  logTransaction: vi.fn(),
}));

vi.mock('../franchiseOffseasonDataAccess', () => ({
  validateFranchiseOffseasonScope: mocks.validateFranchiseOffseasonScope,
}));

vi.mock('../franchisePlayerStorage', () => ({
  saveFranchisePlayer: mocks.saveFranchisePlayer,
}));

vi.mock('../leagueBuilderStorage', () => ({
  savePlayer: mocks.savePlayer,
  transferPlayer: mocks.transferPlayer,
  retirePlayer: mocks.retirePlayer,
}));

vi.mock('../transactionStorage', () => ({
  logMode2V1Transaction: mocks.logMode2V1Transaction,
  logTransaction: mocks.logTransaction,
}));

import {
  FRANCHISE_FREE_AGENCY_CALCULATION_VERSION,
  runFranchiseFreeAgencyDryRun,
} from '../franchiseFreeAgencyAdapter';
import * as franchisePlayerStorage from '../franchisePlayerStorage';
import * as leagueBuilderStorage from '../leagueBuilderStorage';
import * as transactionStorage from '../transactionStorage';
import type { Player } from '../franchisePlayerStorage';

const context = {
  franchiseId: 'franchise-a',
  seasonId: 'franchise-a-season-3',
  seasonNumber: 3,
  offseasonStateId: 'offseason-franchise-a-season-3',
  phase: 'FREE_AGENCY' as const,
};

function makePlayer(overrides: Partial<Player> & Record<string, unknown> & { id: string }): Player {
  return {
    id: overrides.id,
    firstName: 'Test',
    lastName: 'Player',
    gender: 'M',
    age: 27,
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

function makeTeamPlayers(): Player[] {
  const grades = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
  const teamAPlayers = grades.map((grade, index) =>
    makePlayer({
      id: `team-a-player-${index + 1}`,
      firstName: `Player`,
      lastName: `${index + 1}`,
      overallGrade: grade,
      salary: 10 - index * 0.5,
      age: 26 + index,
      contractYears: 1,
      controlYears: 2,
      serviceYears: 4,
    }),
  );

  return [
    ...teamAPlayers,
    makePlayer({
      id: 'team-b-player-1',
      firstName: 'Team',
      lastName: 'Bee',
      overallGrade: 'A',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-b', rosterStatus: 'MLB' }],
    }),
    makePlayer({
      id: 'team-a-farm-player',
      firstName: 'Farm',
      lastName: 'Hand',
      overallGrade: 'A',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
    }),
  ];
}

function seedValidation(players: Player[], issues: Array<Record<string, unknown>> = []) {
  mocks.validateFranchiseOffseasonScope.mockResolvedValue({
    valid: issues.every((issue) => issue.severity !== 'error'),
    context,
    issues,
    counts: { players: players.length, teams: 2, farmRecords: 1 },
    scope: {
      context,
      offseasonState: {
        id: context.offseasonStateId,
        franchiseId: context.franchiseId,
        seasonId: context.seasonId,
        seasonNumber: context.seasonNumber,
        currentPhase: 'FREE_AGENCY',
        phasesCompleted: ['RETIREMENTS'],
        status: 'IN_PROGRESS',
        startedAt: 1,
      },
      players,
      teams: [{ id: 'team-a' }, { id: 'team-b' }],
      farmRecords: [
        {
          id: 'farm-record-1',
          franchiseId: context.franchiseId,
          seasonId: context.seasonId,
          seasonNumber: context.seasonNumber,
          teamId: 'team-a',
          playerId: 'farm-player',
          rosterStatus: 'FARM',
          level: 'AAA',
          updatedAt: 1,
        },
      ],
      seasonSummary: null,
      transitionJournals: [],
      phase11RosterLock: null,
    },
  });
}

describe('franchise free-agency dry-run adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedValidation(makeTeamPlayers());
  });

  test('dry-run returns candidates from franchise-owned players and writes nothing', async () => {
    const result = await runFranchiseFreeAgencyDryRun(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.data).toMatchObject({
      calculationVersion: FRANCHISE_FREE_AGENCY_CALCULATION_VERSION,
      limitations: expect.arrayContaining([
        'No free-agent decisions are finalized by this adapter.',
        'No players are released, moved, exchanged, signed, retired, or written.',
        'No transactions are logged.',
      ]),
    });
    expect(result.data?.candidatePlayerIds).toEqual([
      'team-a-player-1',
      'team-b-player-1',
      'team-a-player-2',
      'team-a-player-3',
      'team-a-player-4',
      'team-a-player-5',
      'team-a-player-6',
      'team-a-player-7',
    ]);
    expect(result.data?.teamPreviews[0]).toMatchObject({
      teamId: 'team-a',
      eligiblePlayerCount: 11,
      diceBoardPlayerIds: expect.arrayContaining(['team-a-player-1', 'team-a-player-11']),
    });
    expect(result.data?.candidates[0]).toMatchObject({
      playerId: 'team-a-player-1',
      playerName: 'Player 1',
      teamId: 'team-a',
      rosterStatus: 'MLB',
      overallGrade: 'S',
      diceValue: 7,
      probabilityScore: 16.67,
      probabilityBand: 'high',
      finalFreeAgencyModelDeferred: true,
      evidence: expect.arrayContaining([
        'Spec dice board value 7 carries 16.67% departure-roll probability.',
        'Roster status: MLB.',
        'Overall grade S was used for dice-board ordering.',
      ]),
      limitations: expect.arrayContaining([
        'Final destination selection, dice execution, player exchange, and movement are deferred.',
        'Personality destination rules are recognized but not executed in this dry-run.',
        'Morale data is present but morale-based free-agency modifiers are deferred.',
      ]),
    });
    expect(mocks.validateFranchiseOffseasonScope).toHaveBeenCalledWith(context, {
      requireCurrentPhase: true,
      includeFarmRecords: true,
      includeTransitionJournals: true,
    });
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.savePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.transferPlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.retirePlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
    expect(transactionStorage.logTransaction).not.toHaveBeenCalled();
  });

  test('protected players are excluded from the dice-board preview', async () => {
    const result = await runFranchiseFreeAgencyDryRun(context, {
      dryRun: true,
      protectedPlayerIdsByTeam: { 'team-a': 'team-a-player-1' },
    });

    expect(result.success).toBe(true);
    expect(result.data?.teamPreviews[0]).toMatchObject({
      protectedPlayerId: 'team-a-player-1',
      diceBoardPlayerIds: expect.not.arrayContaining(['team-a-player-1']),
    });
    expect(result.data?.candidatePlayerIds).not.toContain('team-a-player-1');
    expect(result.data?.candidatePlayerIds[0]).toBe('team-a-player-2');
  });

  test('invalid protected team fails validation and writes nothing', async () => {
    const result = await runFranchiseFreeAgencyDryRun(context, {
      dryRun: true,
      protectedPlayerIdsByTeam: { 'missing-team': 'team-a-player-1' },
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PROTECTED_TEAM_NOT_FOUND');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PROTECTED_TEAM_NOT_FOUND',
          teamId: 'missing-team',
          playerId: 'team-a-player-1',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.transferPlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('missing protected player fails validation and writes nothing', async () => {
    const result = await runFranchiseFreeAgencyDryRun(context, {
      dryRun: true,
      protectedPlayerIdsByTeam: { 'team-a': 'missing-player' },
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PROTECTED_PLAYER_NOT_FOUND');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PROTECTED_PLAYER_NOT_FOUND',
          teamId: 'team-a',
          playerId: 'missing-player',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.transferPlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logTransaction).not.toHaveBeenCalled();
  });

  test('wrong-team protected player fails validation and writes nothing', async () => {
    const result = await runFranchiseFreeAgencyDryRun(context, {
      dryRun: true,
      protectedPlayerIdsByTeam: { 'team-a': 'team-b-player-1' },
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PROTECTED_PLAYER_TEAM_MISMATCH');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PROTECTED_PLAYER_TEAM_MISMATCH',
          teamId: 'team-a',
          playerId: 'team-b-player-1',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.transferPlayer).not.toHaveBeenCalled();
  });

  test('non-MLB protected player fails validation and writes nothing', async () => {
    const result = await runFranchiseFreeAgencyDryRun(context, {
      dryRun: true,
      protectedPlayerIdsByTeam: { 'team-a': 'team-a-farm-player' },
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PROTECTED_PLAYER_STATUS_INVALID');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PROTECTED_PLAYER_STATUS_INVALID',
          teamId: 'team-a',
          playerId: 'team-a-farm-player',
          details: expect.objectContaining({ actualRosterStatus: 'FARM' }),
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.transferPlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
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

    const result = await runFranchiseFreeAgencyDryRun(context, { dryRun: true });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('OFFSEASON_FRANCHISE_MISMATCH');
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.transferPlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('wrong phase fails explicit free-agency validation', async () => {
    const wrongPhaseContext = { ...context, phase: 'RETIREMENTS' as const };

    const result = await runFranchiseFreeAgencyDryRun(wrongPhaseContext, { dryRun: true });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('OFFSEASON_PHASE_MISMATCH');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OFFSEASON_PHASE_MISMATCH',
          message: 'Free-agency dry-run requires the FREE_AGENCY offseason phase.',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('transition journal warnings surface but remain non-blocking', async () => {
    seedValidation(
      makeTeamPlayers(),
      [
        {
          code: 'TRANSITION_ATTENTION_REQUIRED',
          severity: 'warning',
          message: 'Pending transition journal needs review.',
          details: { journalId: 'journal-pending', status: 'pending' },
        },
      ],
    );

    const result = await runFranchiseFreeAgencyDryRun(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TRANSITION_ATTENTION_REQUIRED', severity: 'warning' }),
      ]),
    );
    expect(result.data?.candidatePlayerIds.length).toBeGreaterThan(0);
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('method/version and limitations are present', async () => {
    const result = await runFranchiseFreeAgencyDryRun(context, { dryRun: true });

    expect(result.data?.calculationVersion).toBe('franchise-free-agency-v1-dice-board-dry-run');
    expect(result.data?.method).toMatch(/Dry-run only: spec-inspired top-11 team dice-board exposure preview/);
    expect(result.data?.limitations).toEqual(
      expect.arrayContaining([
        'Destination selection, dice-roll ceremony execution, return-player exchange, morale, contract, and narrative systems are deferred.',
      ]),
    );
  });

  test('missing contract control personality morale and service fields produce limitations instead of confident results', async () => {
    seedValidation([
      makePlayer({
        id: 'damaged-free-agent-risk',
        firstName: 'Damaged',
        lastName: 'Candidate',
        overallGrade: 'S',
        personality: undefined,
        morale: undefined,
        contractYears: undefined,
        controlYears: undefined,
        serviceYears: undefined,
        seasons: undefined,
        yearsOfService: undefined,
      } as Partial<Player> & Record<string, unknown> & { id: string }),
    ]);

    const result = await runFranchiseFreeAgencyDryRun(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.data?.candidates[0]).toMatchObject({
      playerId: 'damaged-free-agent-risk',
      trustLevel: 'low',
      limitations: expect.arrayContaining([
        'Missing personality/morale context prevents destination-style confidence.',
        'Morale data is unavailable; dry-run does not apply morale-based free-agency modifiers.',
        'Contract/control years are unavailable; free-agency exposure is advisory only.',
        'Service-time data is unavailable; dry-run does not infer free-agency eligibility.',
      ]),
    });
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('apply attempts are rejected because the adapter is dry-run only', async () => {
    const result = await runFranchiseFreeAgencyDryRun(context, { apply: true });

    expect(result.success).toBe(false);
    expect(result.dryRun).toBe(true);
    expect(result.errorCode).toBe('ADAPTER_NOT_IMPLEMENTED');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ADAPTER_NOT_IMPLEMENTED',
          message: 'Franchise free-agency apply/commit is not implemented; this adapter is dry-run only.',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.transferPlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });
});
