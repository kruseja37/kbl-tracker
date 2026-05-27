import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  getFranchiseFarmRecord,
  getFranchiseFarmRecordsForSeason,
  getFranchiseFarmRoster,
  saveFranchiseFarmRecord,
} from '../franchiseFarmStorage';
import * as franchiseFarmStorage from '../franchiseFarmStorage';
import {
  callUpFranchisePlayer,
  sendDownFranchisePlayer,
  validateFranchiseRosterMovementEligibility,
} from '../franchiseRosterMovement';
import {
  deepCopyLeagueToFranchise,
  getFranchisePlayer,
  getFranchiseTeam,
  saveFranchisePlayer,
  type Player,
} from '../franchisePlayerStorage';
import * as franchisePlayerStorage from '../franchisePlayerStorage';
import {
  validateFranchisePhase11RosterLock,
} from '../franchiseRosterLockValidator';
import { getTransactionsByFranchiseSeason } from '../transactionStorage';
import * as transactionStorage from '../transactionStorage';
import * as leagueBuilderStorage from '../leagueBuilderStorage';

let counter = 0;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
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
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1000000,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    ...overrides,
  };
}

describe('franchise roster movement boundary', () => {
  beforeEach(() => {
    counter = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('franchise farm records are scoped and isolated by franchise', async () => {
    const seasonId = 'season-same';
    await saveFranchiseFarmRecord({
      franchiseId: 'franchise-a',
      seasonId,
      seasonNumber: 2,
      teamId: 'team-1',
      playerId: 'player-1',
      optionsUsed: 1,
    });
    await saveFranchiseFarmRecord({
      franchiseId: 'franchise-b',
      seasonId,
      seasonNumber: 2,
      teamId: 'team-1',
      playerId: 'player-1',
      optionsUsed: 2,
    });

    const rosterA = await getFranchiseFarmRoster('franchise-a', seasonId, 'team-1');
    const rosterB = await getFranchiseFarmRoster('franchise-b', seasonId, 'team-1');

    expect(rosterA).toHaveLength(1);
    expect(rosterA[0]).toMatchObject({ franchiseId: 'franchise-a', optionsUsed: 1 });
    expect(rosterB).toHaveLength(1);
    expect(rosterB[0]).toMatchObject({ franchiseId: 'franchise-b', optionsUsed: 2 });
  });

  test('Mode 1 farm roster assignments initialize durable franchise farm records for season 1', async () => {
    const franchiseId = nextId('franchise-handoff');
    const leagueId = nextId('league-handoff');
    const teamId = nextId('team-handoff');
    const mlbPlayerId = nextId('mlb-handoff');
    const farmPlayerId = nextId('farm-handoff');

    await leagueBuilderStorage.saveLeagueTemplate({
      id: leagueId,
      name: 'Farm Handoff League',
      teamIds: [teamId],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'rules-default',
    });
    await leagueBuilderStorage.saveTeam({
      id: teamId,
      name: 'Handoff Club',
      abbreviation: 'HFC',
      location: 'Denver',
      nickname: 'Club',
      colors: { primary: '#111111', secondary: '#eeeeee' },
      stadium: 'Handoff Park',
      leagueIds: [leagueId],
    });
    await leagueBuilderStorage.savePlayer(makePlayer({
      id: mlbPlayerId,
      leagueAssignments: [{ leagueId, teamId, rosterStatus: 'MLB' }],
    }));
    await leagueBuilderStorage.savePlayer(makePlayer({
      id: farmPlayerId,
      leagueAssignments: [{ leagueId, teamId, rosterStatus: 'MLB' }],
    }));
    await leagueBuilderStorage.saveTeamRoster({
      teamId,
      mlbRoster: [mlbPlayerId],
      farmRoster: [farmPlayerId],
      lineupWithDH: [{ battingOrder: 1, playerId: mlbPlayerId, fieldingPosition: 'SS' }],
      lineupWithoutDH: [{ battingOrder: 1, playerId: mlbPlayerId, fieldingPosition: 'SS' }],
      startingRotation: [],
      longRelievers: [],
      closingPitcher: '',
      setupPitchers: [],
      depthChart: {
        C: [],
        '1B': [],
        '2B': [],
        SS: [mlbPlayerId],
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
      lastModified: '2026-01-01T00:00:00.000Z',
    });

    await deepCopyLeagueToFranchise(franchiseId, leagueId, {
      seasonId: `${franchiseId}-season-1`,
      seasonNumber: 1,
    });

    const farmPlayer = await getFranchisePlayer(franchiseId, farmPlayerId);
    const mlbPlayer = await getFranchisePlayer(franchiseId, mlbPlayerId);
    const farmRecord = await getFranchiseFarmRecord(
      franchiseId,
      `${franchiseId}-season-1`,
      teamId,
      farmPlayerId,
    );
    const franchiseTeam = await getFranchiseTeam(franchiseId, teamId);

    expect(farmPlayer?.leagueAssignments?.[0]).toMatchObject({ teamId, rosterStatus: 'FARM' });
    expect(mlbPlayer?.leagueAssignments?.[0]).toMatchObject({ teamId, rosterStatus: 'MLB' });
    expect(farmRecord).toMatchObject({
      franchiseId,
      seasonId: `${franchiseId}-season-1`,
      seasonNumber: 1,
      teamId,
      playerId: farmPlayerId,
      rosterStatus: 'FARM',
    });
    expect(franchiseTeam?.lineupWithDH?.[0]).toMatchObject({ playerId: mlbPlayerId });
  });

  test('farm records carry forward to a new franchise season while seasonal option usage resets', async () => {
    const franchiseId = nextId('franchise-farm-carryover');
    const fromSeasonId = `${franchiseId}-season-1`;
    const toSeasonId = `${franchiseId}-season-2`;
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId: fromSeasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId: 'farm-carryover-player',
      rosterLevel: 'AA',
      optionsUsed: 2,
      optionDates: ['2026-04-01T00:00:00.000Z'],
      ratingRevealState: 'revealed',
    });

    const { carryOverFranchiseFarmRecordsToSeason } = await import('../franchiseFarmStorage');
    const result = await carryOverFranchiseFarmRecordsToSeason({
      franchiseId,
      fromSeasonId,
      toSeasonId,
      toSeasonNumber: 2,
    });

    expect(result.carriedPlayerIds).toEqual(['farm-carryover-player']);
    expect(await getFranchiseFarmRecordsForSeason(franchiseId, fromSeasonId)).toEqual([
      expect.objectContaining({ playerId: 'farm-carryover-player', optionsUsed: 2 }),
    ]);
    expect(await getFranchiseFarmRecordsForSeason(franchiseId, toSeasonId)).toEqual([
      expect.objectContaining({
        playerId: 'farm-carryover-player',
        seasonNumber: 2,
        rosterLevel: 'AA',
        optionsUsed: 0,
        optionDates: [],
        ratingRevealState: 'revealed',
      }),
    ]);
  });

  test('send-down and call-up update franchise player state and log canonical transactions', async () => {
    const franchiseId = nextId('franchise');
    const seasonId = `${franchiseId}-season-4`;
    const playerId = 'player-move';
    await saveFranchisePlayer(franchiseId, makePlayer({ id: playerId }));

    const sendDown = await sendDownFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterLevel: 'AAA',
    });

    expect(sendDown.success).toBe(true);
    expect(sendDown.transactionId).toBe(sendDown.transaction?.id);
    expect(sendDown.player?.leagueAssignments?.[0].rosterStatus).toBe('FARM');
    expect(sendDown.player?.optionsUsedBySeason?.[seasonId]).toBe(1);
    const farmRoster = await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1');
    expect(farmRoster).toEqual([
      expect.objectContaining({
        franchiseId,
        seasonId,
        teamId: 'team-1',
        playerId,
        rosterStatus: 'FARM',
        rosterLevel: 'AAA',
        optionsUsed: 1,
      }),
    ]);

    const callUp = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'PHASE_11_FINALIZE',
    });

    const updatedPlayer = await getFranchisePlayer(franchiseId, playerId);
    expect(callUp.success).toBe(true);
    expect(callUp.player?.leagueAssignments?.[0].rosterStatus).toBe('MLB');
    expect(updatedPlayer?.ratingRevealState).toBe('revealed');
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(0);

    const transactions = await getTransactionsByFranchiseSeason(franchiseId, seasonId);
    expect(transactions.map((transaction) => transaction.type)).toEqual(
      expect.arrayContaining(['send_down', 'call_up']),
    );
    expect(transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'send_down',
          franchiseId,
          seasonId,
          statsScopeId: seasonId,
          season: 4,
          data: expect.objectContaining({
            movementType: 'send_down',
            playerId,
            playerIds: [playerId],
            teamId: 'team-1',
            sourceTeamId: 'team-1',
            targetTeamId: 'team-1',
            sourceRosterStatus: 'MLB',
            targetRosterStatus: 'FARM',
            optionsUsed: 1,
            rosterMovementPhase: 'OFFSEASON',
          }),
        }),
        expect.objectContaining({
          type: 'call_up',
          franchiseId,
          seasonId,
          statsScopeId: seasonId,
          season: 4,
          data: expect.objectContaining({
            movementType: 'call_up',
            playerId,
            playerIds: [playerId],
            teamId: 'team-1',
            sourceTeamId: 'team-1',
            targetTeamId: 'team-1',
            sourceRosterStatus: 'FARM',
            targetRosterStatus: 'MLB',
            ratingRevealState: 'revealed',
            rosterMovementPhase: 'PHASE_11_FINALIZE',
          }),
        }),
      ]),
    );
  });

  test('regular-season roster movement logs REGULAR_SEASON phase while preserving movement context', async () => {
    const franchiseId = nextId('franchise-regular-season');
    const seasonId = `${franchiseId}-season-4`;
    const playerId = 'player-regular-season';
    await saveFranchisePlayer(franchiseId, makePlayer({ id: playerId }));

    const sendDown = await sendDownFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'REGULAR_SEASON',
    });
    expect(sendDown.success).toBe(true);

    const callUp = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'REGULAR_SEASON',
    });
    expect(callUp.success).toBe(true);

    const transactions = await getTransactionsByFranchiseSeason(franchiseId, seasonId);
    expect(transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'send_down',
          phase: 'REGULAR_SEASON',
          data: expect.objectContaining({ rosterMovementPhase: 'REGULAR_SEASON' }),
        }),
        expect.objectContaining({
          type: 'call_up',
          phase: 'REGULAR_SEASON',
          data: expect.objectContaining({ rosterMovementPhase: 'REGULAR_SEASON' }),
        }),
      ]),
    );
  });


  test('send-down blocks a fourth option in the same franchise season', async () => {
    const franchiseId = nextId('franchise-options');
    const seasonId = `${franchiseId}-season-5`;
    const playerId = 'player-options';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      optionsUsedBySeason: { [seasonId]: 3 },
    }));

    const result = await sendDownFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 5,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'OPTION_LIMIT_EXCEEDED',
      affectedPlayerId: playerId,
      affectedTeamId: 'team-1',
    });

    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0].rosterStatus).toBe('MLB');
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(0);
  });

  test('eligibility helper rejects inactive statuses and allows legacy send-down compatibility only for unknown active assignments', async () => {
    const base = makePlayer({ id: 'eligibility-base' });
    expect(validateFranchiseRosterMovementEligibility({
      player: base,
      movement: 'send_down',
      teamId: 'team-1',
      leagueId: 'league-1',
      seasonId: 'season-eligibility',
    })).toMatchObject({ eligible: true, rosterStatus: 'MLB' });

    const legacyUnknown = makePlayer({
      id: 'eligibility-legacy',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1' } as any],
    });
    expect(validateFranchiseRosterMovementEligibility({
      player: legacyUnknown,
      movement: 'send_down',
      teamId: 'team-1',
      leagueId: 'league-1',
      seasonId: 'season-eligibility',
    })).toMatchObject({ eligible: true, rosterStatus: 'UNKNOWN' });

    for (const rosterStatus of ['FARM', 'FREE_AGENT', 'RELEASED', 'RETIRED', 'INACTIVE', 'UNASSIGNED'] as const) {
      const result = validateFranchiseRosterMovementEligibility({
        player: makePlayer({
          id: `eligibility-${rosterStatus}`,
          leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus } as any],
        }),
        movement: 'send_down',
        teamId: 'team-1',
        leagueId: 'league-1',
        seasonId: 'season-eligibility',
      });

      expect(result).toMatchObject({
        eligible: false,
        errorCode: 'INVALID_ROSTER_STATUS',
        rosterStatus,
      });
    }
  });

  test('send-down rolls back player mutation when farm write fails', async () => {
    const franchiseId = nextId('franchise-rollback-send');
    const seasonId = `${franchiseId}-season-6`;
    const playerId = 'player-send-rollback';
    await saveFranchisePlayer(franchiseId, makePlayer({ id: playerId }));
    const farmSpy = vi
      .spyOn(franchiseFarmStorage, 'saveFranchiseFarmRecord')
      .mockRejectedValueOnce(new Error('farm write failed'));

    const result = await sendDownFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 6,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'FARM_SAVE_FAILED',
      rollbackStatus: { attempted: true, success: true },
    });
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0].rosterStatus).toBe('MLB');
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(0);
    farmSpy.mockRestore();
  });

  test('send-down reports player save failure without mutating farm state', async () => {
    const franchiseId = nextId('franchise-player-save-fail');
    const seasonId = `${franchiseId}-season-6`;
    const playerId = 'player-save-fail';
    await saveFranchisePlayer(franchiseId, makePlayer({ id: playerId }));
    const playerSaveSpy = vi
      .spyOn(franchisePlayerStorage, 'saveFranchisePlayer')
      .mockRejectedValueOnce(new Error('player save failed'));

    const result = await sendDownFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 6,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'PLAYER_SAVE_FAILED',
      rollbackStatus: { attempted: false, success: true },
    });
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(0);
    playerSaveSpy.mockRestore();
  });

  test('call-up rolls back player and farm state when transaction logging fails', async () => {
    const franchiseId = nextId('franchise-rollback-call');
    const seasonId = `${franchiseId}-season-7`;
    const playerId = 'player-call-rollback';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 7,
      teamId: 'team-1',
      playerId,
      optionsUsed: 1,
    });
    const transactionSpy = vi
      .spyOn(transactionStorage, 'logMode2V1Transaction')
      .mockRejectedValueOnce(new Error('transaction write failed'));

    const result = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 7,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'PHASE_11_FINALIZE',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'TRANSACTION_LOG_FAILED',
      rollbackStatus: { attempted: true, success: true },
    });
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0].rosterStatus).toBe('FARM');
    expect(player?.ratingRevealState).toBeUndefined();
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toEqual([
      expect.objectContaining({ playerId, optionsUsed: 1 }),
    ]);
    transactionSpy.mockRestore();
  });

  test('send-down rolls back player and farm state when transaction logging fails', async () => {
    const franchiseId = nextId('franchise-senddown-transaction-rollback');
    const seasonId = `${franchiseId}-season-7`;
    const playerId = 'player-senddown-transaction-rollback';
    await saveFranchisePlayer(franchiseId, makePlayer({ id: playerId }));
    const transactionSpy = vi
      .spyOn(transactionStorage, 'logMode2V1Transaction')
      .mockRejectedValueOnce(new Error('transaction write failed'));

    const result = await sendDownFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 7,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'REGULAR_SEASON',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'TRANSACTION_LOG_FAILED',
      rollbackStatus: { attempted: true, success: true },
    });
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0].rosterStatus).toBe('MLB');
    expect(player?.optionsUsedBySeason?.[seasonId]).toBeUndefined();
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(0);
    transactionSpy.mockRestore();
  });

  test('rollback failure returns ROLLBACK_FAILED with rollback error details', async () => {
    const franchiseId = nextId('franchise-rollback-failure');
    const seasonId = `${franchiseId}-season-7`;
    const playerId = 'player-rollback-failure';
    await saveFranchisePlayer(franchiseId, makePlayer({ id: playerId }));
    const actualSaveFranchisePlayer = franchisePlayerStorage.saveFranchisePlayer;
    const transactionSpy = vi
      .spyOn(transactionStorage, 'logMode2V1Transaction')
      .mockRejectedValueOnce(new Error('transaction write failed'));
    const saveSpy = vi
      .spyOn(franchisePlayerStorage, 'saveFranchisePlayer')
      .mockImplementationOnce(actualSaveFranchisePlayer)
      .mockRejectedValueOnce(new Error('rollback player failed'));

    const result = await sendDownFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 7,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('ROLLBACK_FAILED');
    expect(result.rollbackStatus).toMatchObject({
      attempted: true,
      success: false,
    });
    expect(result.rollbackStatus?.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('rollback player failed')]),
    );
    transactionSpy.mockRestore();
    saveSpy.mockRestore();
  });


  test('call-up rolls back player state when farm delete fails', async () => {
    const franchiseId = nextId('franchise-delete-rollback');
    const seasonId = `${franchiseId}-season-7`;
    const playerId = 'player-delete-rollback';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 7,
      teamId: 'team-1',
      playerId,
      optionsUsed: 1,
    });
    const deleteSpy = vi
      .spyOn(franchiseFarmStorage, 'deleteFranchiseFarmRecord')
      .mockRejectedValueOnce(new Error('farm delete failed'));

    const result = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 7,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'FARM_DELETE_FAILED',
      rollbackStatus: { attempted: true, success: true },
    });
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0].rosterStatus).toBe('FARM');
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(1);
    deleteSpy.mockRestore();
  });

  test('Phase 11 roster lock validates exact franchise-owned 22 MLB and 10 farm records without League Builder reads', async () => {
    const franchiseId = nextId('franchise-lock-pass');
    const seasonId = `${franchiseId}-season-8`;
    const leagueReadSpy = vi.spyOn(leagueBuilderStorage, 'getAllPlayers');

    for (let index = 0; index < 22; index += 1) {
      await saveFranchisePlayer(franchiseId, makePlayer({
        id: `mlb-${index}`,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      }));
    }

    for (let index = 0; index < 10; index += 1) {
      const playerId = `farm-${index}`;
      await saveFranchisePlayer(franchiseId, makePlayer({
        id: playerId,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      }));
      await saveFranchiseFarmRecord({
        franchiseId,
        seasonId,
        seasonNumber: 8,
        teamId: 'team-1',
        playerId,
        optionsUsed: 1,
      });
    }

    const result = await validateFranchisePhase11RosterLock({
      franchiseId,
      seasonId,
      teamIds: ['team-1'],
    });

    expect(result.valid).toBe(true);
    expect(result.countsByTeam).toEqual([
      expect.objectContaining({ teamId: 'team-1', mlbCount: 22, farmCount: 10, totalCount: 32 }),
    ]);
    expect(leagueReadSpy).not.toHaveBeenCalled();
    leagueReadSpy.mockRestore();
  });

  test('Phase 11 roster lock fails with only franchise-owned counts and excludes inactive/global-looking rows', async () => {
    const franchiseId = nextId('franchise-lock-fail');
    const seasonId = `${franchiseId}-season-9`;
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: 'mlb-only',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    }));
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: 'released-player',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'RELEASED' } as any],
    }));
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: 'legacy-unknown',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1' } as any],
    }));

    const result = await validateFranchisePhase11RosterLock({
      franchiseId,
      seasonId,
      teamIds: ['team-1'],
    });

    expect(result.valid).toBe(false);
    expect(result.countsByTeam[0]).toMatchObject({
      mlbCount: 1,
      farmCount: 0,
      totalCount: 1,
    });
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'MLB_COUNT_MISMATCH',
        'FARM_COUNT_MISMATCH',
        'TOTAL_COUNT_MISMATCH',
        'DAMAGED_LEGACY_STATUS',
        'INACTIVE_STATUS_INCLUDED',
      ]),
    );
  });

  test('Phase 11 roster lock rejects farm records when player assignment status is not FARM', async () => {
    const franchiseId = nextId('franchise-lock-status-mismatch');
    const seasonId = `${franchiseId}-season-10`;
    const statuses = ['MLB', 'FREE_AGENT', 'RELEASED', 'RETIRED', 'INACTIVE', 'UNASSIGNED', undefined] as const;

    for (const [index, rosterStatus] of statuses.entries()) {
      const playerId = `farm-mismatch-${index}`;
      await saveFranchisePlayer(franchiseId, makePlayer({
        id: playerId,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus } as any],
      }));
      await saveFranchiseFarmRecord({
        franchiseId,
        seasonId,
        seasonNumber: 10,
        teamId: 'team-1',
        playerId,
        optionsUsed: 1,
      });
    }

    const result = await validateFranchisePhase11RosterLock({
      franchiseId,
      seasonId,
      teamIds: ['team-1'],
    });

    const mismatchIssues = result.issues.filter((issue) => issue.code === 'FARM_RECORD_STATUS_MISMATCH');
    expect(result.valid).toBe(false);
    expect(mismatchIssues).toHaveLength(statuses.length);
    expect(mismatchIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 'farm-mismatch-0',
          actualRosterStatus: 'MLB',
          farmRecordId: expect.stringContaining('farm-mismatch-0'),
        }),
        expect.objectContaining({
          playerId: 'farm-mismatch-1',
          actualRosterStatus: 'FREE_AGENT',
        }),
        expect.objectContaining({
          playerId: 'farm-mismatch-6',
          actualRosterStatus: 'UNKNOWN',
        }),
      ]),
    );
  });
});
