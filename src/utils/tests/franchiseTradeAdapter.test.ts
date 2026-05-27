import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  validateFranchiseOffseasonScope: vi.fn(),
  getAllFranchisePlayers: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
  getFranchiseFarmRecordsForSeason: vi.fn(),
  saveFranchisePlayer: vi.fn(),
  saveFranchiseTeam: vi.fn(),
  saveFranchiseFarmRecord: vi.fn(),
  deleteFranchiseFarmRecord: vi.fn(),
  savePlayer: vi.fn(),
  saveTeamRoster: vi.fn(),
  logMode2V1Transaction: vi.fn(),
  logTransaction: vi.fn(),
  addTrade: vi.fn(),
  saveTrades: vi.fn(),
}));

vi.mock('../franchiseOffseasonDataAccess', () => ({
  validateFranchiseOffseasonScope: mocks.validateFranchiseOffseasonScope,
}));

vi.mock('../franchisePlayerStorage', () => ({
  getAllFranchisePlayers: mocks.getAllFranchisePlayers,
  getAllFranchiseTeams: mocks.getAllFranchiseTeams,
  saveFranchisePlayer: mocks.saveFranchisePlayer,
  saveFranchiseTeam: mocks.saveFranchiseTeam,
}));

vi.mock('../franchiseFarmStorage', () => ({
  getFranchiseFarmRecordsForSeason: mocks.getFranchiseFarmRecordsForSeason,
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

vi.mock('../offseasonStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../offseasonStorage')>();
  return {
    ...actual,
    addTrade: mocks.addTrade,
    saveTrades: mocks.saveTrades,
  };
});

import {
  executeManualFranchiseTrade,
  FRANCHISE_TRADE_CALCULATION_VERSION,
  runFranchiseTradeDryRun,
} from '../franchiseTradeAdapter';
import * as franchisePlayerStorage from '../franchisePlayerStorage';
import * as franchiseFarmStorage from '../franchiseFarmStorage';
import * as leagueBuilderStorage from '../leagueBuilderStorage';
import * as transactionStorage from '../transactionStorage';
import * as offseasonStorage from '../offseasonStorage';
import type { FranchiseFarmRecord } from '../franchiseFarmStorage';
import type { Player, Team } from '../franchisePlayerStorage';

const context = {
  franchiseId: 'franchise-a',
  seasonId: 'franchise-a-season-3',
  statsScopeId: 'franchise-a-season-3',
  seasonNumber: 3,
  offseasonStateId: 'offseason-franchise-a-season-3',
  phase: 'TRADES' as const,
};

function makePlayer(overrides: Partial<Player> & Record<string, unknown> & { id: string; teamId: string }): Player {
  return {
    id: overrides.id,
    firstName: 'Test',
    lastName: 'Player',
    gender: 'M',
    age: 24,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '',
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
    leagueAssignments: [{ leagueId: 'league-1', teamId: overrides.teamId, rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
    ...overrides,
  } as Player;
}

function makeFarmRecord(playerId: string, teamId: string): FranchiseFarmRecord {
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

function makeOptimalSnapshot(teamId: string, playerId: string) {
  return {
    snapshotId: `snapshot-${teamId}-${playerId}`,
    teamId,
    mode: 'franchise',
    opposingPitcherHand: 'R',
    algorithmVersion: 'test',
    generatedAt: 1,
    generatedFrom: 'team_hub',
    sourceConfidence: 'user_registered',
    dhEnabled: true,
    slots: [
      {
        playerId,
        playerName: playerId,
        battingOrderSlot: 1,
        defensivePosition: 'SS',
        projectedSlotKblWpa: 0,
        projectedValueScore: 0,
        positionalFitScore: 0,
        confidence: 'high',
      },
    ],
    projectedTeamLineupKblWpa: 0,
    confidence: 'high',
  } as const;
}

function makeTeams(): Team[] {
  return [
    {
      id: 'team-a',
      name: 'Alpha',
      lineupWithDH: [{ battingOrder: 1, playerId: 'a-ss-1', fieldingPosition: 'SS' }],
      lineupWithoutDH: [{ battingOrder: 1, playerId: 'a-ss-1', fieldingPosition: 'SS' }],
      startingRotation: ['a-sp-1'],
    } as Team,
    {
      id: 'team-b',
      name: 'Beta',
      lineupWithDH: [{ battingOrder: 1, playerId: 'b-rp-1', fieldingPosition: 'RF' }],
      lineupWithoutDH: [{ battingOrder: 1, playerId: 'b-rp-1', fieldingPosition: 'RF' }],
      startingRotation: ['b-sp-1'],
    } as Team,
  ];
}

function makePlayers(): Player[] {
  return [
    makePlayer({ id: 'a-ss-1', teamId: 'team-a', firstName: 'Alpha', lastName: 'Shortstop 1', primaryPosition: 'SS', overallGrade: 'B', salary: 4 }),
    makePlayer({ id: 'a-ss-2', teamId: 'team-a', firstName: 'Alpha', lastName: 'Shortstop 2', primaryPosition: 'SS', overallGrade: 'B-', salary: 3 }),
    makePlayer({ id: 'a-2b-1', teamId: 'team-a', firstName: 'Alpha', lastName: 'Second 1', primaryPosition: '2B' }),
    makePlayer({ id: 'a-2b-2', teamId: 'team-a', firstName: 'Alpha', lastName: 'Second 2', primaryPosition: '2B' }),
    makePlayer({ id: 'a-c-1', teamId: 'team-a', firstName: 'Alpha', lastName: 'Catcher', primaryPosition: 'C' }),
    makePlayer({ id: 'a-sp-1', teamId: 'team-a', firstName: 'Alpha', lastName: 'Starter', primaryPosition: 'SP' }),
    makePlayer({ id: 'a-farm-1', teamId: 'team-a', firstName: 'Alpha', lastName: 'Farm', primaryPosition: 'SS', leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }] }),
    makePlayer({ id: 'b-c-1', teamId: 'team-b', firstName: 'Beta', lastName: 'Catcher', primaryPosition: 'C' }),
    makePlayer({ id: 'b-sp-1', teamId: 'team-b', firstName: 'Beta', lastName: 'Starter', primaryPosition: 'SP' }),
    makePlayer({ id: 'b-rp-1', teamId: 'team-b', firstName: 'Beta', lastName: 'Reliever', primaryPosition: 'RP' }),
    makePlayer({ id: 'b-farm-1', teamId: 'team-b', firstName: 'Beta', lastName: 'Farm', primaryPosition: 'CF', leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-b', rosterStatus: 'FARM' }] }),
  ];
}

function seedValidation(
  players: Player[] = makePlayers(),
  farmRecords: FranchiseFarmRecord[] = [
    makeFarmRecord('a-farm-1', 'team-a'),
    makeFarmRecord('b-farm-1', 'team-b'),
  ],
  issues: Array<Record<string, unknown>> = [],
  teams: Team[] = makeTeams(),
) {
  mocks.getAllFranchisePlayers.mockResolvedValue(players);
  mocks.getAllFranchiseTeams.mockResolvedValue(teams);
  mocks.getFranchiseFarmRecordsForSeason.mockResolvedValue(farmRecords);
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
        currentPhase: 'TRADES',
        phasesCompleted: ['RETIREMENTS', 'FREE_AGENCY', 'DRAFT'],
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

function expectNoWrites() {
  expect(franchisePlayerStorage.saveFranchisePlayer).not.toHaveBeenCalled();
  expect(franchisePlayerStorage.saveFranchiseTeam).not.toHaveBeenCalled();
  expect(franchiseFarmStorage.saveFranchiseFarmRecord).not.toHaveBeenCalled();
  expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
  expect(leagueBuilderStorage.savePlayer).not.toHaveBeenCalled();
  expect(leagueBuilderStorage.saveTeamRoster).not.toHaveBeenCalled();
  expect(transactionStorage.logMode2V1Transaction).not.toHaveBeenCalled();
  expect(transactionStorage.logTransaction).not.toHaveBeenCalled();
  expect(offseasonStorage.addTrade).not.toHaveBeenCalled();
  expect(offseasonStorage.saveTrades).not.toHaveBeenCalled();
}

describe('franchise trade dry-run adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId: string, player: Player) => player);
    mocks.saveFranchiseTeam.mockImplementation(async (_franchiseId: string, team: Team) => team);
    mocks.saveFranchiseFarmRecord.mockImplementation(async (record: FranchiseFarmRecord) => ({
      ...record,
      id: `${record.franchiseId}:${record.seasonId}:${record.teamId}:${record.playerId}`,
    }));
    mocks.deleteFranchiseFarmRecord.mockResolvedValue(undefined);
    mocks.logMode2V1Transaction.mockImplementation(async (input: Record<string, unknown>) => ({
      id: 'txn-manual-trade',
      timestamp: '2026-01-01T00:00:00.000Z',
      undone: false,
      undoneAt: null,
      undoneBy: null,
      previousState: input.previousState ?? null,
      ...input,
    }));
    seedValidation();
  });

  test('generates dry-run trade-fit previews from franchise-owned scoped teams and players without writes', async () => {
    const result = await runFranchiseTradeDryRun(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.data).toMatchObject({
      calculationVersion: FRANCHISE_TRADE_CALCULATION_VERSION,
      limitations: expect.arrayContaining([
        'Manual execution is available only for explicit user-selected requestedTrade players.',
        'Dry-run preview does not move players or change roster, farm, team, or transaction state.',
        'No transactions, trade state, League Builder data, or franchise offseason state are written.',
        'Trade AI, final acceptance logic, chemistry, morale, injuries, and salary-cap enforcement are deferred.',
        'All fit previews are non-executable advisory previews.',
      ]),
    });
    expect(result.data?.teamReports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          teamId: 'team-a',
          eligibleTradePlayerIds: expect.arrayContaining(['a-ss-1', 'a-ss-2', 'a-farm-1']),
          surpluses: expect.arrayContaining([
            expect.objectContaining({ role: 'Middle infield depth', surplus: 2 }),
          ]),
        }),
        expect.objectContaining({
          teamId: 'team-b',
          needs: expect.arrayContaining([
            expect.objectContaining({ role: 'Middle infield depth', gap: 3 }),
          ]),
        }),
      ]),
    );
    expect(result.data?.fitPreviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceTeamId: 'team-a',
          targetTeamId: 'team-b',
          role: 'Middle infield depth',
          nonExecutable: true,
          candidatePlayerIds: expect.arrayContaining(['a-ss-1']),
        }),
      ]),
    );
    expect(mocks.validateFranchiseOffseasonScope).toHaveBeenCalledWith(context, {
      requireCurrentPhase: true,
      includeFarmRecords: true,
      includeTransitionJournals: true,
    });
    expectNoWrites();
  });

  test('fails when stats scope is missing', async () => {
    const result = await runFranchiseTradeDryRun({ ...context, statsScopeId: undefined }, { dryRun: true });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('MISSING_STATS_SCOPE_ID');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_STATS_SCOPE_ID' }),
      ]),
    );
    expectNoWrites();
  });

  test('fails when stats scope does not match canonical franchise season id', async () => {
    const result = await runFranchiseTradeDryRun(
      { ...context, statsScopeId: 'elimination-something' },
      { dryRun: true },
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('STATS_SCOPE_MISMATCH');
    expect(result.data?.requestedPreview).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'STATS_SCOPE_MISMATCH',
          details: {
            expectedStatsScopeId: context.seasonId,
            actualStatsScopeId: 'elimination-something',
          },
        }),
      ]),
    );
    expectNoWrites();
  });

  test('fails wrong phase with explicit trade phase validation', async () => {
    const result = await runFranchiseTradeDryRun(
      { ...context, phase: 'DRAFT' as const },
      { dryRun: true },
    );

    expect(result.success).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OFFSEASON_PHASE_MISMATCH',
          details: { requiredPhase: 'TRADES' },
        }),
      ]),
    );
    expectNoWrites();
  });

  test('surfaces transition journal warnings without blocking', async () => {
    seedValidation(
      makePlayers(),
      [makeFarmRecord('a-farm-1', 'team-a')],
      [
        {
          code: 'TRANSITION_ATTENTION_REQUIRED',
          severity: 'warning',
          message: 'Pending transition journal needs review.',
          details: { journalId: 'journal-pending' },
        },
      ],
    );

    const result = await runFranchiseTradeDryRun(context, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TRANSITION_ATTENTION_REQUIRED', severity: 'warning' }),
      ]),
    );
    expectNoWrites();
  });

  test('validates invalid requested team inputs', async () => {
    const result = await runFranchiseTradeDryRun(context, {
      dryRun: true,
      requestedTrade: {
        sourceTeamId: 'missing-team',
        targetTeamId: 'team-a',
        outgoingPlayerId: 'a-ss-1',
      },
    });

    expect(result.success).toBe(false);
    expect(result.data?.requestedPreview?.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TRADE_TEAM_NOT_FOUND', teamId: 'missing-team' }),
      ]),
    );
    expectNoWrites();
  });

  test('validates same-team requested trades', async () => {
    const result = await runFranchiseTradeDryRun(context, {
      dryRun: true,
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-a',
        outgoingPlayerId: 'a-ss-1',
      },
    });

    expect(result.success).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TRADE_TEAM_MATCH_INVALID', teamId: 'team-a' }),
      ]),
    );
    expectNoWrites();
  });

  test('validates missing requested players', async () => {
    const result = await runFranchiseTradeDryRun(context, {
      dryRun: true,
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-b',
        outgoingPlayerId: 'missing-player',
      },
    });

    expect(result.success).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TRADE_PLAYER_NOT_FOUND', playerId: 'missing-player' }),
      ]),
    );
    expectNoWrites();
  });

  test('validates requested player team mismatch', async () => {
    const result = await runFranchiseTradeDryRun(context, {
      dryRun: true,
      requestedTrade: {
        sourceTeamId: 'team-b',
        targetTeamId: 'team-a',
        outgoingPlayerId: 'a-ss-1',
      },
    });

    expect(result.success).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TRADE_PLAYER_TEAM_MISMATCH',
          playerId: 'a-ss-1',
          teamId: 'team-b',
        }),
      ]),
    );
    expectNoWrites();
  });

  test('validates requested player status eligibility and reports roster status evidence', async () => {
    const inactivePlayer = makePlayer({
      id: 'inactive-player',
      teamId: 'team-a',
      primaryPosition: 'SS',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'INACTIVE' }],
    });
    seedValidation([...makePlayers(), inactivePlayer]);

    const result = await runFranchiseTradeDryRun(context, {
      dryRun: true,
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-b',
        outgoingPlayerId: 'inactive-player',
      },
    });

    expect(result.success).toBe(false);
    expect(result.data?.requestedPreview?.evidence).toEqual(
      expect.arrayContaining(['outgoing player inactive-player roster status: INACTIVE.']),
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TRADE_PLAYER_STATUS_INVALID',
          playerId: 'inactive-player',
          details: { rosterStatus: 'INACTIVE' },
        }),
      ]),
    );
    expectNoWrites();
  });

  test('valid requested trade preview remains non-executable and surfaces MLB/FARM evidence', async () => {
    const result = await runFranchiseTradeDryRun(context, {
      dryRun: true,
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-b',
        outgoingPlayerId: 'a-farm-1',
        incomingPlayerId: 'b-rp-1',
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.requestedPreview).toMatchObject({
      sourceTeamId: 'team-a',
      targetTeamId: 'team-b',
      valid: true,
      nonExecutable: true,
      outgoingPlayer: expect.objectContaining({ playerId: 'a-farm-1', rosterStatus: 'FARM' }),
      incomingPlayer: expect.objectContaining({ playerId: 'b-rp-1', rosterStatus: 'MLB' }),
      evidence: expect.arrayContaining([
        'outgoing player a-farm-1 roster status: FARM.',
        'incoming player b-rp-1 roster status: MLB.',
      ]),
    });
    expectNoWrites();
  });

  test('executes a manual MLB-for-MLB franchise trade and logs canonical transaction context', async () => {
    const result = await executeManualFranchiseTrade(context, {
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-b',
        outgoingPlayerId: 'a-ss-1',
        incomingPlayerId: 'b-rp-1',
      },
    });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'a-ss-1',
        leagueAssignments: [expect.objectContaining({ teamId: 'team-b', rosterStatus: 'MLB' })],
      }),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'b-rp-1',
        leagueAssignments: [expect.objectContaining({ teamId: 'team-a', rosterStatus: 'MLB' })],
      }),
    );
    expect(franchisePlayerStorage.saveFranchiseTeam).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'team-a',
        lineupWithDH: [],
        lineupWithoutDH: [],
      }),
    );
    expect(franchisePlayerStorage.saveFranchiseTeam).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'team-b',
        lineupWithDH: [],
        lineupWithoutDH: [],
      }),
    );
    expect(franchiseFarmStorage.saveFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).not.toHaveBeenCalled();
    expect(transactionStorage.logMode2V1Transaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'trade',
        actor: 'USER',
        season: context.seasonNumber,
        franchiseId: context.franchiseId,
        seasonId: context.seasonId,
        statsScopeId: context.statsScopeId,
        phase: 'REGULAR_SEASON',
        data: expect.objectContaining({
          movementType: 'trade',
          transactionPhase: 'REGULAR_SEASON',
          seasonNumber: context.seasonNumber,
          sourceTeamId: 'team-a',
          targetTeamId: 'team-b',
          playerIds: ['a-ss-1', 'b-rp-1'],
          playersFromSource: ['a-ss-1'],
          playersFromTarget: ['b-rp-1'],
        }),
      }),
    );
    expect(result.data?.executedTrade).toMatchObject({
      transactionId: 'txn-manual-trade',
      sourceTeamId: 'team-a',
      targetTeamId: 'team-b',
      playersFromSource: ['a-ss-1'],
      playersFromTarget: ['b-rp-1'],
    });
    expect(result.data?.limitations).toEqual(
      expect.arrayContaining([
        'Manual execution moved only explicit user-selected requestedTrade players.',
      ]),
    );
    expect(result.data?.limitations).not.toContain(
      'No transactions, trade state, League Builder data, or franchise offseason state are written.',
    );
  });

  test('manual trade marks optimal lineup snapshots stale when saving cleaned teams', async () => {
    seedValidation(
      makePlayers(),
      [makeFarmRecord('a-farm-1', 'team-a'), makeFarmRecord('b-farm-1', 'team-b')],
      [],
      [
        {
          ...makeTeams()[0],
          optimalLineupVsRHPWithDH: makeOptimalSnapshot('team-a', 'a-ss-1'),
        } as Team,
        {
          ...makeTeams()[1],
          optimalLineupVsRHPWithDH: makeOptimalSnapshot('team-b', 'b-rp-1'),
        } as Team,
      ],
    );

    const result = await executeManualFranchiseTrade(context, {
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-b',
        outgoingPlayerId: 'a-ss-1',
        incomingPlayerId: 'b-rp-1',
      },
    });

    expect(result.success).toBe(true);
    expect(franchisePlayerStorage.saveFranchiseTeam).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'team-a',
        optimalLineupVsRHPWithDH: expect.objectContaining({
          sourceConfidence: 'stale_roster',
          confidence: 'low',
        }),
      }),
    );
    expect(franchisePlayerStorage.saveFranchiseTeam).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'team-b',
        optimalLineupVsRHPWithDH: expect.objectContaining({
          sourceConfidence: 'stale_roster',
          confidence: 'low',
        }),
      }),
    );
  });

  test('executes a manual FARM-for-FARM trade by moving farm records with player assignments', async () => {
    const result = await executeManualFranchiseTrade(context, {
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-b',
        outgoingPlayerId: 'a-farm-1',
        incomingPlayerId: 'b-farm-1',
      },
    });

    expect(result.success).toBe(true);
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'a-farm-1',
        leagueAssignments: [expect.objectContaining({ teamId: 'team-b', rosterStatus: 'FARM' })],
      }),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'b-farm-1',
        leagueAssignments: [expect.objectContaining({ teamId: 'team-a', rosterStatus: 'FARM' })],
      }),
    );
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).toHaveBeenCalledWith(
      context.franchiseId,
      context.seasonId,
      'team-a',
      'a-farm-1',
    );
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).toHaveBeenCalledWith(
      context.franchiseId,
      context.seasonId,
      'team-b',
      'b-farm-1',
    );
    expect(franchiseFarmStorage.saveFranchiseFarmRecord).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: 'a-farm-1', teamId: 'team-b', seasonId: context.seasonId }),
    );
    expect(franchiseFarmStorage.saveFranchiseFarmRecord).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: 'b-farm-1', teamId: 'team-a', seasonId: context.seasonId }),
    );
    expect(transactionStorage.logMode2V1Transaction).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movedFarmPlayerIds: ['a-farm-1', 'b-farm-1'],
        }),
      }),
    );
  });

  test('executes a mixed MLB/FARM manual trade without salary matching', async () => {
    const result = await executeManualFranchiseTrade(context, {
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-b',
        outgoingPlayerId: 'a-farm-1',
        incomingPlayerId: 'b-rp-1',
      },
    });

    expect(result.success).toBe(true);
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'a-farm-1',
        salary: 1.2,
        leagueAssignments: [expect.objectContaining({ teamId: 'team-b', rosterStatus: 'FARM' })],
      }),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'b-rp-1',
        salary: 1.2,
        leagueAssignments: [expect.objectContaining({ teamId: 'team-a', rosterStatus: 'MLB' })],
      }),
    );
    expect(franchiseFarmStorage.saveFranchiseFarmRecord).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: 'a-farm-1', teamId: 'team-b' }),
    );
    expect(transactionStorage.logMode2V1Transaction).toHaveBeenCalledTimes(1);
  });

  test('manual trade preserves player identity and history fields by playerId', async () => {
    const storyPlayer = makePlayer({
      id: 'story-player',
      teamId: 'team-a',
      firstName: 'Story',
      lastName: 'Keeper',
      nickname: 'The Thread',
      backstory: 'Franchise cornerstone.',
      nicknames: ['The Thread'],
      editHistory: [{ field: 'nickname', oldValue: '', newValue: 'The Thread', changedAt: '2026-01-01T00:00:00.000Z', source: 'base' }] as never,
    });
    seedValidation([...makePlayers(), storyPlayer]);

    const result = await executeManualFranchiseTrade(context, {
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-b',
        outgoingPlayerId: 'story-player',
        incomingPlayerId: 'b-rp-1',
      },
    });

    expect(result.success).toBe(true);
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'story-player',
        nickname: 'The Thread',
        backstory: 'Franchise cornerstone.',
        nicknames: ['The Thread'],
        editHistory: expect.arrayContaining([
          expect.objectContaining({ field: 'nickname', newValue: 'The Thread' }),
        ]),
        leagueAssignments: [expect.objectContaining({ teamId: 'team-b', rosterStatus: 'MLB' })],
      }),
    );
    expect(transactionStorage.logMode2V1Transaction).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          playerIds: ['story-player', 'b-rp-1'],
          playersFromSource: ['story-player'],
        }),
      }),
    );
  });

  test('rejects invalid manual trade statuses before any trade write', async () => {
    const inactivePlayer = makePlayer({
      id: 'inactive-player',
      teamId: 'team-a',
      primaryPosition: 'SS',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'INACTIVE' }],
    });
    seedValidation([...makePlayers(), inactivePlayer]);

    const result = await executeManualFranchiseTrade(context, {
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-b',
        outgoingPlayerId: 'inactive-player',
        incomingPlayerId: 'b-rp-1',
      },
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TRADE_PLAYER_STATUS_INVALID');
    expectNoWrites();
  });

  test('rolls back player, farm, and team writes when trade transaction logging fails', async () => {
    mocks.logMode2V1Transaction.mockRejectedValueOnce(new Error('transaction write failed'));

    const result = await executeManualFranchiseTrade(context, {
      requestedTrade: {
        sourceTeamId: 'team-a',
        targetTeamId: 'team-b',
        outgoingPlayerId: 'a-farm-1',
        incomingPlayerId: 'b-rp-1',
      },
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TRADE_WRITE_FAILED');
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'a-farm-1',
        leagueAssignments: [expect.objectContaining({ teamId: 'team-a', rosterStatus: 'FARM' })],
      }),
    );
    expect(franchisePlayerStorage.saveFranchisePlayer).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({
        id: 'b-rp-1',
        leagueAssignments: [expect.objectContaining({ teamId: 'team-b', rosterStatus: 'MLB' })],
      }),
    );
    expect(franchiseFarmStorage.deleteFranchiseFarmRecord).toHaveBeenCalledWith(
      context.franchiseId,
      context.seasonId,
      'team-b',
      'a-farm-1',
    );
    expect(franchiseFarmStorage.saveFranchiseFarmRecord).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: 'a-farm-1', teamId: 'team-a' }),
    );
    expect(franchisePlayerStorage.saveFranchiseTeam).toHaveBeenCalledWith(
      context.franchiseId,
      expect.objectContaining({ id: 'team-b', lineupWithDH: [expect.objectContaining({ playerId: 'b-rp-1' })] }),
    );
  });

  test('keeps dry-run adapter read-only when apply is requested', async () => {
    const result = await runFranchiseTradeDryRun(context, { apply: true });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TRADE_EXECUTION_NOT_IMPLEMENTED');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TRADE_EXECUTION_NOT_IMPLEMENTED',
        }),
      ]),
    );
    expectNoWrites();
  });
});
