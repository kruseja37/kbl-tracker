import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  validateFranchiseOffseasonScope: vi.fn(),
  saveFranchisePlayer: vi.fn(),
  deleteFranchiseFarmRecord: vi.fn(),
  saveFranchiseFarmRecord: vi.fn(),
  savePlayer: vi.fn(),
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

vi.mock('../franchiseFarmStorage', () => ({
  deleteFranchiseFarmRecord: mocks.deleteFranchiseFarmRecord,
  saveFranchiseFarmRecord: mocks.saveFranchiseFarmRecord,
}));

vi.mock('../leagueBuilderStorage', () => ({
  savePlayer: mocks.savePlayer,
  retirePlayer: mocks.retirePlayer,
}));

vi.mock('../transactionStorage', () => ({
  logMode2V1Transaction: mocks.logMode2V1Transaction,
  logTransaction: mocks.logTransaction,
}));

import {
  FRANCHISE_RETIREMENT_CALCULATION_VERSION,
  FRANCHISE_RETIREMENT_APPLY_VERSION,
  calculateFranchiseRetirementProbability,
  runFranchiseRetirementDryRun,
} from '../franchiseRetirementAdapter';
import * as franchisePlayerStorage from '../franchisePlayerStorage';
import * as franchiseFarmStorage from '../franchiseFarmStorage';
import * as leagueBuilderStorage from '../leagueBuilderStorage';
import * as transactionStorage from '../transactionStorage';
import type { Player } from '../franchisePlayerStorage';

const context = {
  franchiseId: 'franchise-a',
  seasonId: 'franchise-a-season-3',
  statsScopeId: 'franchise-a-season-3',
  seasonNumber: 3,
  offseasonStateId: 'offseason-franchise-a-season-3',
  phase: 'RETIREMENTS' as const,
};

function makePlayer(overrides: Partial<Player> & Record<string, unknown> & { id: string }): Player {
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
    salary: 1.2,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
    ...overrides,
  } as Player;
}

function makeFarmRecord(playerId = 'farm-veteran', teamId = 'team-a') {
  return {
    id: `franchise-a:franchise-a-season-3:${teamId}:${playerId}`,
    franchiseId: context.franchiseId,
    seasonId: context.seasonId,
    seasonNumber: context.seasonNumber,
    teamId,
    playerId,
    rosterLevel: 'AAA',
    rosterStatus: 'FARM',
    optionsUsed: 1,
    optionDates: ['2026-05-01T00:00:00.000Z'],
    ratingRevealState: 'hidden',
    assignedAt: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
  };
}

function makeCeremonyProvenance(overrides: Record<string, unknown> = {}) {
  return {
    methodVersion: 'franchise-retirement-ceremony-v1-reverse-age-roll',
    outcomeType: 'retiree',
    revealIndex: 0,
    seedNamespace: 'franchise-retirement-ceremony-preview',
    candidatePoolHash: 'pool-hash-alpha',
    seedHash: 'seed-hash-alpha',
    roll: 12.34,
    revealBucket: {
      type: 'retiree',
      playerId: 'mlb-veteran',
    },
    candidateProbability: 50,
    selectedPlayerIds: ['mlb-veteran'],
    limitations: ['Pure preview only: no writes, no persistence, no transactions, and no auto-apply.'],
    ...overrides,
  };
}

function seedValidation(
  players: Player[],
  issues: Array<Record<string, unknown>> = [],
  farmRecords: Array<Record<string, unknown>> = [],
) {
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
        currentPhase: 'RETIREMENTS',
        phasesCompleted: [],
        status: 'IN_PROGRESS',
        startedAt: 1,
      },
      players,
      teams: [{ id: 'team-a' }],
      farmRecords,
      seasonSummary: null,
      transitionJournals: [],
      phase11RosterLock: null,
    },
  });
}

describe('franchise retirement dry-run adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId: string, player: Player) => player);
    mocks.saveFranchiseFarmRecord.mockImplementation(async (record: Record<string, unknown>) => record);
    mocks.deleteFranchiseFarmRecord.mockResolvedValue(undefined);
    mocks.logMode2V1Transaction.mockResolvedValue({
      id: 'txn-retirement',
      timestamp: '2026-05-25T00:00:00.000Z',
      season: context.seasonNumber,
      gameNumber: null,
      phase: 'OFFSEASON',
      franchiseId: context.franchiseId,
      seasonId: context.seasonId,
      statsScopeId: context.seasonId,
      type: 'retirement',
      actor: 'USER',
      data: {},
      previousState: null,
      undone: false,
      undoneAt: null,
      undoneBy: null,
    });
    seedValidation([
      makePlayer({ id: 'veteran', firstName: 'Old', lastName: 'Timer', age: 40, seasons: 16, overallGrade: 'A', salary: 8 }),
      makePlayer({ id: 'young-player', firstName: 'Young', lastName: 'Core', age: 24, seasons: 2 }),
    ]);
  });

  test('uses the existing age-based prototype retirement probability curve', () => {
    expect(calculateFranchiseRetirementProbability(40)).toBe(38);
    expect(calculateFranchiseRetirementProbability(35)).toBe(19);
    expect(calculateFranchiseRetirementProbability(24)).toBe(2);
  });

  test('dry-run returns candidates from franchise-owned players and writes nothing', async () => {
    const result = await runFranchiseRetirementDryRun(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.data).toMatchObject({
      calculationVersion: FRANCHISE_RETIREMENT_CALCULATION_VERSION,
      candidatePlayerIds: ['veteran'],
      limitations: expect.arrayContaining([
        'No retirement decisions are finalized by this adapter.',
        'No players are removed, retired, or written.',
        'No transactions are logged.',
      ]),
    });
    expect(result.data?.candidates[0]).toMatchObject({
      playerId: 'veteran',
      playerName: 'Old Timer',
      teamId: 'team-a',
      rosterStatus: 'MLB',
      age: 40,
      seasons: 16,
      salary: 8,
      overallGrade: 'A',
      probabilityScore: 38,
      probabilityBand: 'high',
      trustLevel: 'high',
      evidence: expect.arrayContaining([
        'Age 40 maps to the v1 prototype retirement probability curve.',
        'Roster status: MLB.',
      ]),
    });
    expect(mocks.validateFranchiseOffseasonScope).toHaveBeenCalledWith(context, {
      requireCurrentPhase: true,
      includeTransitionJournals: true,
    });
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.savePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.retirePlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
    expect(transactionStorage.logTransaction).not.toHaveBeenCalled();
  });

  test('can include low-risk players when requested', async () => {
    const result = await runFranchiseRetirementDryRun(context, {
      dryRun: true,
      includeLowRisk: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.candidatePlayerIds).toEqual(['veteran', 'young-player']);
    expect(result.data?.candidates.find((candidate) => candidate.playerId === 'young-player')).toMatchObject({
      probabilityBand: 'low',
      probabilityScore: 2,
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

    const result = await runFranchiseRetirementDryRun(context, { dryRun: true });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('OFFSEASON_FRANCHISE_MISMATCH');
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.retirePlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('transition journal warnings surface but remain non-blocking', async () => {
    seedValidation(
      [makePlayer({ id: 'veteran', age: 39, seasons: 12 })],
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

    const result = await runFranchiseRetirementDryRun(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.issues.filter((issue) => issue.code === 'TRANSITION_ATTENTION_REQUIRED')).toHaveLength(2);
    expect(result.data?.candidatePlayerIds).toEqual(['veteran']);
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('method/version and limitations are present', async () => {
    const result = await runFranchiseRetirementDryRun(context, { dryRun: true });

    expect(result.data?.calculationVersion).toBe('franchise-retirement-v1-age-risk-dry-run');
    expect(result.data?.method).toMatch(/Dry-run only: age-based v1 retirement risk curve/);
    expect(result.data?.limitations).toEqual(
      expect.arrayContaining([
        'This is not a full retirement probability model with morale, injuries, contract state, or narrative systems.',
      ]),
    );
  });

  test('missing age and service fields produce limitations instead of confident results', async () => {
    seedValidation([
      makePlayer({
        id: 'damaged-player',
        firstName: 'Damaged',
        lastName: 'Record',
        age: undefined,
        seasons: undefined,
        leagueAssignments: [],
      } as Partial<Player> & Record<string, unknown> & { id: string }),
    ]);

    const result = await runFranchiseRetirementDryRun(context, {
      dryRun: true,
      includeLowRisk: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.candidates[0]).toMatchObject({
      playerId: 'damaged-player',
      probabilityScore: null,
      probabilityBand: 'unknown',
      trustLevel: 'low',
      rosterStatus: 'UNKNOWN',
      limitations: expect.arrayContaining([
        'Missing or invalid age prevents confident retirement risk scoring.',
        'Missing franchise team assignment limits team-scoped retirement context.',
        'Missing or damaged roster status limits retirement context.',
        'Service/seasons data is unavailable; dry-run does not infer career tenure.',
      ]),
    });
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('apply with no selected players fails without writes', async () => {
    const result = await runFranchiseRetirementDryRun(context, { apply: true });

    expect(result.success).toBe(false);
    expect(result.dryRun).toBe(false);
    expect(result.errorCode).toBe('RETIREMENT_SELECTION_REQUIRED');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RETIREMENT_SELECTION_REQUIRED',
          message: 'Franchise retirement apply requires explicit selected player IDs.',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.retirePlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('apply with missing statsScopeId fails before writes', async () => {
    const player = makePlayer({ id: 'mlb-veteran' });
    seedValidation([player]);
    const { statsScopeId: _statsScopeId, ...contextWithoutStatsScope } = context;

    const result = await runFranchiseRetirementDryRun(contextWithoutStatsScope, {
      apply: true,
      playerIds: ['mlb-veteran'],
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('STATS_SCOPE_MISMATCH');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'STATS_SCOPE_MISMATCH',
          details: expect.objectContaining({
            expectedStatsScopeId: context.seasonId,
            actualStatsScopeId: null,
          }),
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('apply with wrong statsScopeId fails before writes', async () => {
    const player = makePlayer({ id: 'mlb-veteran' });
    seedValidation([player]);

    const result = await runFranchiseRetirementDryRun(
      { ...context, statsScopeId: 'elimination-something' },
      {
        apply: true,
        playerIds: ['mlb-veteran'],
      },
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('STATS_SCOPE_MISMATCH');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'STATS_SCOPE_MISMATCH',
          details: expect.objectContaining({
            expectedStatsScopeId: context.seasonId,
            actualStatsScopeId: 'elimination-something',
          }),
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('selected MLB player retires and logs canonical transaction', async () => {
    const player = makePlayer({ id: 'mlb-veteran', firstName: 'Mlb', lastName: 'Veteran', age: 41 });
    seedValidation([player]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['mlb-veteran'],
    });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.data).toMatchObject({
      calculationVersion: FRANCHISE_RETIREMENT_APPLY_VERSION,
      retiredPlayerIds: ['mlb-veteran'],
      rollbackStatus: 'applied',
    });
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'mlb-veteran',
        retiredSeasonId: context.seasonId,
        retiredSeasonNumber: context.seasonNumber,
        retirementMethodVersion: FRANCHISE_RETIREMENT_APPLY_VERSION,
        leagueAssignments: [
          expect.objectContaining({
            teamId: 'team-a',
            rosterStatus: 'RETIRED',
            retiredFromTeamId: 'team-a',
          }),
        ],
      }),
    );
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retirement',
        actor: 'USER',
        season: context.seasonNumber,
        gameNumber: null,
        phase: 'OFFSEASON',
        franchiseId: context.franchiseId,
        seasonId: context.seasonId,
        statsScopeId: context.seasonId,
        data: expect.objectContaining({
          playerId: 'mlb-veteran',
          retiredFromTeamId: 'team-a',
          previousRosterStatus: 'MLB',
          rosterMovementPhase: 'RETIREMENTS',
          offseasonStateId: context.offseasonStateId,
          methodVersion: FRANCHISE_RETIREMENT_APPLY_VERSION,
          selectedSource: 'manual',
        }),
      }),
    );
    expect(leagueBuilderStorage.retirePlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logTransaction).not.toHaveBeenCalled();
  });

  test('manual retirement transaction records manual source without ceremony provenance', async () => {
    const player = makePlayer({ id: 'manual-veteran', firstName: 'Manual', lastName: 'Veteran', age: 41 });
    seedValidation([player]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['manual-veteran'],
      selectedSource: 'manual',
    });

    expect(result.success).toBe(true);
    const transactionInput = mocks.logMode2V1Transaction.mock.calls[0][0];
    expect(transactionInput.data).toMatchObject({
      playerId: 'manual-veteran',
      selectedSource: 'manual',
    });
    expect(transactionInput.data).not.toHaveProperty('ceremonyProvenance');
  });

  test('ceremony-selected retirement transaction includes sanitized ceremony provenance', async () => {
    const player = makePlayer({ id: 'mlb-veteran', firstName: 'Mlb', lastName: 'Veteran', age: 41 });
    seedValidation([player]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['mlb-veteran'],
      selectedSource: 'ceremony',
      ceremonyProvenance: makeCeremonyProvenance(),
    });

    expect(result.success).toBe(true);
    expect(transactionStorage.logMode2V1Transaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retirement',
        data: expect.objectContaining({
          playerId: 'mlb-veteran',
          selectedSource: 'ceremony',
          ceremonyProvenance: expect.objectContaining({
            selectedSource: 'ceremony',
            methodVersion: 'franchise-retirement-ceremony-v1-reverse-age-roll',
            outcomeType: 'retiree',
            revealIndex: 0,
            seedNamespace: 'franchise-retirement-ceremony-preview',
            candidatePoolHash: 'pool-hash-alpha',
            seedHash: 'seed-hash-alpha',
            roll: 12.34,
            revealBucketType: 'retiree',
            revealBucketPlayerId: 'mlb-veteran',
            candidateProbability: 50,
            selectedPlayerIds: ['mlb-veteran'],
            limitations: expect.arrayContaining([
              'Ceremony reveal results are not persisted as separate storage.',
              'Ceremony provenance is recorded only on the retirement transaction payload.',
            ]),
          }),
        }),
      }),
    );
  });

  test('mismatched ceremony metadata fails before writes', async () => {
    const player = makePlayer({ id: 'mlb-veteran', firstName: 'Mlb', lastName: 'Veteran', age: 41 });
    seedValidation([player]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['mlb-veteran'],
      selectedSource: 'ceremony',
      ceremonyProvenance: makeCeremonyProvenance({
        selectedPlayerIds: ['other-player'],
        revealBucket: { type: 'retiree', playerId: 'other-player' },
      }),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('RETIREMENT_CEREMONY_METADATA_MISMATCH');
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('malformed ceremony metadata fails safely before writes', async () => {
    const player = makePlayer({ id: 'mlb-veteran', firstName: 'Mlb', lastName: 'Veteran', age: 41 });
    seedValidation([player]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['mlb-veteran'],
      selectedSource: 'ceremony',
      ceremonyProvenance: makeCeremonyProvenance({
        seedHash: '',
        outcomeType: 'no_retirement',
      }),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('RETIREMENT_CEREMONY_METADATA_INVALID');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RETIREMENT_CEREMONY_METADATA_INVALID',
          severity: 'error',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test.each([
    ['no-retirement bucket', { revealBucket: { type: 'no_retirement', playerId: 'mlb-veteran' } }],
    ['missing bucket player id', { revealBucket: { type: 'retiree' } }],
    ['wrong method version', { methodVersion: 'franchise-retirement-ceremony-v0' }],
    ['roll below zero', { roll: -0.01 }],
    ['roll above one hundred', { roll: 100.01 }],
    ['candidate probability below zero', { candidateProbability: -1 }],
    ['candidate probability above one hundred', { candidateProbability: 101 }],
  ])('rejects contradictory ceremony provenance: %s', async (_label, overrides) => {
    const player = makePlayer({ id: 'mlb-veteran', firstName: 'Mlb', lastName: 'Veteran', age: 41 });
    seedValidation([player]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['mlb-veteran'],
      selectedSource: 'ceremony',
      ceremonyProvenance: makeCeremonyProvenance(overrides),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('RETIREMENT_CEREMONY_METADATA_INVALID');
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('selected FARM player retires, removes farm record, and logs canonical transaction', async () => {
    const player = makePlayer({
      id: 'farm-veteran',
      firstName: 'Farm',
      lastName: 'Veteran',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
      age: 39,
    });
    seedValidation([player], [], [makeFarmRecord('farm-veteran')]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['farm-veteran'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.retiredPlayers?.[0]).toMatchObject({
      playerId: 'farm-veteran',
      previousRosterStatus: 'FARM',
      farmRecordRemoved: true,
    });
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).toHaveBeenCalledWith(
      context.franchiseId,
      context.seasonId,
      'team-a',
      'farm-veteran',
    );
    expect(transactionStorage.logMode2V1Transaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retirement',
        data: expect.objectContaining({
          playerId: 'farm-veteran',
          previousRosterStatus: 'FARM',
        }),
        previousState: expect.objectContaining({
          player,
          farmRecord: expect.objectContaining({ playerId: 'farm-veteran' }),
        }),
      }),
    );
  });

  test('selected FARM player without matching farm record fails before writes', async () => {
    const player = makePlayer({
      id: 'farm-missing-record',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
    });
    seedValidation([player]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['farm-missing-record'],
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FARM_RECORD_MISSING');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FARM_RECORD_MISSING',
          playerId: 'farm-missing-record',
          teamId: 'team-a',
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test.each([
    'FREE_AGENT',
    'UNASSIGNED',
    'RELEASED',
    'RETIRED',
    'INACTIVE',
    undefined,
    'BROKEN',
  ])('rejects selected player with invalid retirement status %s', async (status) => {
    const player = makePlayer({
      id: `status-${String(status ?? 'missing').toLowerCase()}`,
      leagueAssignments: [
        {
          leagueId: 'league-1',
          teamId: status === 'FREE_AGENT' || status === 'UNASSIGNED' ? '' : 'team-a',
          ...(status === undefined ? {} : { rosterStatus: status }),
        } as never,
      ],
    });
    seedValidation([player]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: [player.id],
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PLAYER_STATUS_INVALID');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PLAYER_STATUS_INVALID',
          playerId: player.id,
        }),
      ]),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('rejects selected player assigned to a team outside franchise scope', async () => {
    const player = makePlayer({
      id: 'wrong-team',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-z', rosterStatus: 'MLB' }],
    });
    seedValidation([player]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['wrong-team'],
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PLAYER_SCOPE_MISMATCH');
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('missing selected player is rejected as franchise-owned scope failure', async () => {
    seedValidation([makePlayer({ id: 'known-player' })]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['missing-player'],
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PLAYER_NOT_FOUND');
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('mixed valid and invalid selected players fail before mutating the valid player', async () => {
    const validPlayer = makePlayer({ id: 'valid-mlb' });
    const invalidPlayer = makePlayer({
      id: 'invalid-free-agent',
      leagueAssignments: [{ leagueId: 'league-1', teamId: '', rosterStatus: 'FREE_AGENT' }],
    });
    seedValidation([validPlayer, invalidPlayer]);

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['valid-mlb', 'invalid-free-agent'],
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PLAYER_STATUS_INVALID');
    expect(result.data?.retiredPlayerIds).toEqual([]);
    expect(result.data?.skippedPlayerIds).toContain('invalid-free-agent');
    expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  });

  test('transaction failure rolls back player and farm state', async () => {
    const player = makePlayer({
      id: 'farm-rollback',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
    });
    const farmRecord = makeFarmRecord('farm-rollback');
    seedValidation([player], [], [farmRecord]);
    mocks.logMode2V1Transaction.mockRejectedValueOnce(new Error('transaction down'));

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['farm-rollback'],
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TRANSACTION_LOG_FAILED');
    expect(result.data?.rollbackStatus).toBe('rolled_back');
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({ id: 'farm-rollback', retirementMethodVersion: FRANCHISE_RETIREMENT_APPLY_VERSION }),
    );
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).toHaveBeenCalledWith(
      context.franchiseId,
      context.seasonId,
      'team-a',
      'farm-rollback',
    );
    expect(franchiseFarmStorage.saveFranchiseFarmRecord).toHaveBeenCalledWith(farmRecord);
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenLastCalledWith(context.franchiseId, player);
  });

  test('rollback failure returns structured rollback details', async () => {
    const player = makePlayer({ id: 'mlb-rollback-fail' });
    seedValidation([player]);
    mocks.logMode2V1Transaction.mockRejectedValueOnce(new Error('transaction down'));
    mocks.saveFranchisePlayer
      .mockResolvedValueOnce(player)
      .mockRejectedValueOnce(new Error('restore failed'));

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['mlb-rollback-fail'],
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PLAYER_ROLLBACK_FAILED');
    expect(result.data?.rollbackStatus).toBe('rollback_failed');
    expect(result.data?.rollbackErrors).toEqual([
      expect.objectContaining({
        playerId: 'mlb-rollback-fail',
        message: expect.stringContaining('restore failed'),
      }),
    ]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PLAYER_ROLLBACK_FAILED',
          playerId: 'mlb-rollback-fail',
        }),
      ]),
    );
  });

  test('transition journal warnings remain non-blocking during apply', async () => {
    seedValidation(
      [makePlayer({ id: 'warn-veteran', age: 38 })],
      [
        {
          code: 'TRANSITION_ATTENTION_REQUIRED',
          severity: 'warning',
          message: 'Pending transition journal needs review.',
          details: { journalId: 'journal-pending', status: 'pending' },
        },
      ],
    );

    const result = await runFranchiseRetirementDryRun(context, {
      apply: true,
      playerIds: ['warn-veteran'],
    });

    expect(result.success).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TRANSITION_ATTENTION_REQUIRED', severity: 'warning' }),
      ]),
    );
    expect(result.data?.retiredPlayerIds).toEqual(['warn-veteran']);
  });
});
