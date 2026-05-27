import 'fake-indexeddb/auto';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  getFranchiseFarmRoster,
  saveFranchiseFarmRecord,
} from '../franchiseFarmStorage';
import * as franchiseFarmStorage from '../franchiseFarmStorage';
import {
  getFranchisePlayer,
  saveFranchisePlayer,
  type Player,
} from '../franchisePlayerStorage';
import * as franchisePlayerStorage from '../franchisePlayerStorage';
import {
  releaseFranchisePhase11Player,
  signFranchisePhase11Player,
} from '../franchisePhase11RosterActions';
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
    firstName: 'Phase',
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

describe('franchise Phase 11 roster actions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('release updates only franchise-owned player/farm state and logs canonical Phase 11 transaction context', async () => {
    const franchiseId = nextId('franchise-phase11-release');
    const seasonId = `${franchiseId}-season-4`;
    const playerId = 'release-farm-player';
    const leagueReadSpy = vi.spyOn(leagueBuilderStorage, 'getAllPlayers');
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      optionsUsed: 1,
    });

    const result = await releaseFranchisePhase11Player({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber: 4,
      offseasonStateId: `offseason-${seasonId}`,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
    });

    expect(result.success).toBe(true);
    expect(result.phaseContext).toBe('PHASE_11_FINALIZE');
    expect(result.transactionId).toBe(result.transaction?.id);
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0].rosterStatus).toBe('RELEASED');
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(0);

    const transactions = await getTransactionsByFranchiseSeason(franchiseId, seasonId);
    expect(transactions).toEqual([
      expect.objectContaining({
        type: 'release',
        franchiseId,
        seasonId,
        statsScopeId: seasonId,
        season: 4,
        phase: 'OFFSEASON',
        data: expect.objectContaining({
          playerId,
          teamId: 'team-1',
          previousRosterStatus: 'FARM',
          rosterMovementPhase: 'PHASE_11_FINALIZE',
          offseasonStateId: `offseason-${seasonId}`,
        }),
      }),
    ]);
    expect(leagueReadSpy).not.toHaveBeenCalled();
    leagueReadSpy.mockRestore();
  });

  test('signing uses only franchise-owned free-agent player state and can fill MLB or FARM', async () => {
    const franchiseId = nextId('franchise-phase11-sign');
    const seasonId = `${franchiseId}-season-4`;
    const playerId = 'franchise-owned-free-agent';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: '', rosterStatus: 'FREE_AGENT' }],
    }));

    const result = await signFranchisePhase11Player({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber: 4,
      offseasonStateId: `offseason-${seasonId}`,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      targetRosterStatus: 'MLB',
    });

    expect(result.success).toBe(true);
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0]).toMatchObject({ teamId: 'team-1', rosterStatus: 'MLB' });
    expect(player?.ratingRevealState).toBe('revealed');

    const transactions = await getTransactionsByFranchiseSeason(franchiseId, seasonId);
    expect(transactions).toEqual([
      expect.objectContaining({
        type: 'free_agent_signing',
        franchiseId,
        seasonId,
        data: expect.objectContaining({
          playerId,
          targetRosterStatus: 'MLB',
          rosterMovementPhase: 'PHASE_11_FINALIZE',
        }),
      }),
    ]);
  });

  test.each([
    ['RELEASED'],
    ['RETIRED'],
    ['INACTIVE'],
  ] as const)('signing rejects empty-team %s assignments', async (rosterStatus) => {
    const franchiseId = nextId(`franchise-phase11-reject-${rosterStatus}`);
    const seasonId = `${franchiseId}-season-4`;
    const playerId = `blocked-${rosterStatus}`;
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: '', rosterStatus } as never],
    }));

    const result = await signFranchisePhase11Player({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      targetRosterStatus: 'MLB',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'INVALID_ROSTER_STATUS',
    });
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0]).toMatchObject({ teamId: '', rosterStatus });
  });

  test('signing allows empty-team UNASSIGNED assignments', async () => {
    const franchiseId = nextId('franchise-phase11-unassigned');
    const seasonId = `${franchiseId}-season-4`;
    const playerId = 'unassigned-fill';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: '', rosterStatus: 'UNASSIGNED' } as never],
    }));

    const result = await signFranchisePhase11Player({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      targetRosterStatus: 'MLB',
    });

    expect(result.success).toBe(true);
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0]).toMatchObject({ teamId: 'team-1', rosterStatus: 'MLB' });
  });

  test.each([
    ['MLB', 'PLAYER_NOT_AVAILABLE'],
    ['FARM', 'PLAYER_NOT_AVAILABLE'],
  ] as const)('signing rejects existing %s assignments', async (rosterStatus, errorCode) => {
    const franchiseId = nextId(`franchise-phase11-active-${rosterStatus}`);
    const seasonId = `${franchiseId}-season-4`;
    const playerId = `active-${rosterStatus}`;
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus } as never],
    }));

    const result = await signFranchisePhase11Player({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      targetRosterStatus: 'MLB',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode,
    });
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0]).toMatchObject({ teamId: 'team-1', rosterStatus });
  });

  test('MLB signing rejects stale farm records instead of leaving inconsistent farm state', async () => {
    const franchiseId = nextId('franchise-phase11-stale-farm');
    const seasonId = `${franchiseId}-season-4`;
    const playerId = 'stale-farm-free-agent';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: '', rosterStatus: 'FREE_AGENT' }],
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
    });

    const result = await signFranchisePhase11Player({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      targetRosterStatus: 'MLB',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'INVALID_ROSTER_STATUS',
    });
    expect(result.errorMessage).toMatch(/stale franchise farm record/i);
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0]).toMatchObject({ teamId: '', rosterStatus: 'FREE_AGENT' });
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toEqual([
      expect.objectContaining({ playerId }),
    ]);
  });

  test.each([
    ['missing status', [{ leagueId: 'league-1', teamId: '' }]],
    ['unexpected status', [{ leagueId: 'league-1', teamId: '', rosterStatus: 'WAIVED' }]],
  ] as const)('signing rejects damaged/unknown assignment state: %s', async (_label, leagueAssignments) => {
    const franchiseId = nextId('franchise-phase11-damaged-status');
    const seasonId = `${franchiseId}-season-4`;
    const playerId = `damaged-status-${counter}`;
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: leagueAssignments as never,
    }));
    const playerSaveSpy = vi.spyOn(franchisePlayerStorage, 'saveFranchisePlayer');
    const farmSaveSpy = vi.spyOn(franchiseFarmStorage, 'saveFranchiseFarmRecord');
    const farmDeleteSpy = vi.spyOn(franchiseFarmStorage, 'deleteFranchiseFarmRecord');
    const transactionSpy = vi.spyOn(transactionStorage, 'logMode2V1Transaction');

    const result = await signFranchisePhase11Player({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      targetRosterStatus: 'MLB',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'INVALID_ROSTER_STATUS',
    });
    expect(playerSaveSpy).not.toHaveBeenCalled();
    expect(farmSaveSpy).not.toHaveBeenCalled();
    expect(farmDeleteSpy).not.toHaveBeenCalled();
    expect(transactionSpy).not.toHaveBeenCalled();
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments).toEqual(leagueAssignments);
  });

  test.each([
    [
      'FREE_AGENT plus RELEASED',
      [
        { leagueId: 'league-1', teamId: '', rosterStatus: 'FREE_AGENT' },
        { leagueId: 'league-2', teamId: '', rosterStatus: 'RELEASED' },
      ],
      'INVALID_ROSTER_STATUS',
    ],
    [
      'UNASSIGNED plus INACTIVE',
      [
        { leagueId: 'league-1', teamId: '', rosterStatus: 'UNASSIGNED' },
        { leagueId: 'league-2', teamId: '', rosterStatus: 'INACTIVE' },
      ],
      'INVALID_ROSTER_STATUS',
    ],
    [
      'FREE_AGENT plus MLB',
      [
        { leagueId: 'league-1', teamId: '', rosterStatus: 'FREE_AGENT' },
        { leagueId: 'league-2', teamId: 'team-2', rosterStatus: 'MLB' },
      ],
      'PLAYER_NOT_AVAILABLE',
    ],
  ] as const)('signing rejects mixed assignment set: %s', async (_label, leagueAssignments, errorCode) => {
    const franchiseId = nextId('franchise-phase11-mixed-status');
    const seasonId = `${franchiseId}-season-4`;
    const playerId = `mixed-status-${counter}`;
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: leagueAssignments as never,
    }));
    const playerSaveSpy = vi.spyOn(franchisePlayerStorage, 'saveFranchisePlayer');
    const farmSaveSpy = vi.spyOn(franchiseFarmStorage, 'saveFranchiseFarmRecord');
    const farmDeleteSpy = vi.spyOn(franchiseFarmStorage, 'deleteFranchiseFarmRecord');
    const transactionSpy = vi.spyOn(transactionStorage, 'logMode2V1Transaction');

    const result = await signFranchisePhase11Player({
      franchiseId,
      seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      targetRosterStatus: 'MLB',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode,
    });
    expect(playerSaveSpy).not.toHaveBeenCalled();
    expect(farmSaveSpy).not.toHaveBeenCalled();
    expect(farmDeleteSpy).not.toHaveBeenCalled();
    expect(transactionSpy).not.toHaveBeenCalled();
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments).toEqual(leagueAssignments);
  });

  test.each([
    ['no assignments', []],
    [
      'all FREE_AGENT',
      [
        { leagueId: 'league-1', teamId: '', rosterStatus: 'FREE_AGENT' },
        { leagueId: 'league-2', teamId: '', rosterStatus: 'FREE_AGENT' },
      ],
    ],
    [
      'all UNASSIGNED',
      [
        { leagueId: 'league-1', teamId: '', rosterStatus: 'UNASSIGNED' },
        { leagueId: 'league-2', teamId: '', rosterStatus: 'UNASSIGNED' },
      ],
    ],
  ] as const)('signing preserves allowed assignment set: %s', async (_label, leagueAssignments) => {
    const franchiseId = nextId('franchise-phase11-allowed-status');
    const seasonId = `${franchiseId}-season-4`;
    const playerId = `allowed-status-${counter}`;
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: leagueAssignments as never,
    }));

    const result = await signFranchisePhase11Player({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      targetRosterStatus: 'MLB',
    });

    expect(result.success).toBe(true);
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.some((assignment) =>
      assignment.teamId === 'team-1' && assignment.rosterStatus === 'MLB',
    )).toBe(true);
    const transactions = await getTransactionsByFranchiseSeason(franchiseId, seasonId);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      type: 'free_agent_signing',
      franchiseId,
      seasonId,
    });
  });

  test('signing to FARM creates a franchise farm record without global/template reads', async () => {
    const franchiseId = nextId('franchise-phase11-farm-sign');
    const seasonId = `${franchiseId}-season-5`;
    const playerId = 'franchise-owned-farm-fill';
    const leagueReadSpy = vi.spyOn(leagueBuilderStorage, 'getAllPlayers');
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [],
    }));

    const result = await signFranchisePhase11Player({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber: 5,
      offseasonStateId: `offseason-${seasonId}`,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      targetRosterStatus: 'FARM',
      rosterLevel: 'AA',
    });

    expect(result.success).toBe(true);
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0]).toMatchObject({ teamId: 'team-1', rosterStatus: 'FARM' });
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toEqual([
      expect.objectContaining({ playerId, rosterStatus: 'FARM', rosterLevel: 'AA' }),
    ]);
    expect(leagueReadSpy).not.toHaveBeenCalled();
    leagueReadSpy.mockRestore();
  });

  test('release writer failure rolls back prior player and farm state', async () => {
    const franchiseId = nextId('franchise-phase11-release-rollback');
    const seasonId = `${franchiseId}-season-6`;
    const playerId = 'release-rollback-player';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 6,
      teamId: 'team-1',
      playerId,
      optionsUsed: 1,
    });
    const transactionSpy = vi
      .spyOn(transactionStorage, 'logMode2V1Transaction')
      .mockRejectedValueOnce(new Error('transaction failed'));

    const result = await releaseFranchisePhase11Player({
      franchiseId,
      seasonId,
      seasonNumber: 6,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'TRANSACTION_LOG_FAILED',
      rollbackStatus: { attempted: true, success: true },
    });
    const player = await getFranchisePlayer(franchiseId, playerId);
    expect(player?.leagueAssignments?.[0].rosterStatus).toBe('FARM');
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(1);
    transactionSpy.mockRestore();
  });

  test('rollback failure returns ROLLBACK_FAILED with rollback error details', async () => {
    const franchiseId = nextId('franchise-phase11-rollback-fail');
    const seasonId = `${franchiseId}-season-6`;
    const playerId = 'rollback-failure-player';
    await saveFranchisePlayer(franchiseId, makePlayer({ id: playerId }));
    const actualSaveFranchisePlayer = franchisePlayerStorage.saveFranchisePlayer;
    const transactionSpy = vi
      .spyOn(transactionStorage, 'logMode2V1Transaction')
      .mockRejectedValueOnce(new Error('transaction failed'));
    const saveSpy = vi
      .spyOn(franchisePlayerStorage, 'saveFranchisePlayer')
      .mockImplementationOnce(actualSaveFranchisePlayer)
      .mockRejectedValueOnce(new Error('rollback player failed'));

    const result = await releaseFranchisePhase11Player({
      franchiseId,
      seasonId,
      seasonNumber: 6,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('ROLLBACK_FAILED');
    expect(result.rollbackStatus).toMatchObject({ attempted: true, success: false });
    expect(result.rollbackStatus?.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('rollback player failed')]),
    );
    transactionSpy.mockRestore();
    saveSpy.mockRestore();
  });

  test('signing rejects players already active for another franchise team', async () => {
    const franchiseId = nextId('franchise-phase11-sign-invalid');
    const seasonId = `${franchiseId}-season-7`;
    const playerId = 'active-other-team';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-2', rosterStatus: 'MLB' }],
    }));

    const result = await signFranchisePhase11Player({
      franchiseId,
      seasonId,
      seasonNumber: 7,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      targetRosterStatus: 'MLB',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'PLAYER_NOT_AVAILABLE',
    });
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(0);
  });
});
