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
import {
  clearFranchiseSeasonLedgerDatabaseForTests,
  getFranchiseSeasonLedgerRow,
  resetFranchiseSeasonLedgerDatabaseForTests,
  upsertFranchiseSeasonLedgerRow,
} from '../franchiseSeasonLedgerStorage';
import { ROOKIE_SCALE_FACTOR } from '../../engines/salaryCalculator';

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
    resetFranchiseSeasonLedgerDatabaseForTests();
  });

  afterEach(async () => {
    await clearFranchiseSeasonLedgerDatabaseForTests();
    resetFranchiseSeasonLedgerDatabaseForTests();
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
    const mlbPlayerIds = [
      mlbPlayerId,
      ...Array.from({ length: 21 }, (_, index) => nextId(`mlb-handoff-${index + 2}`)),
    ];
    const farmPlayerIds = [
      farmPlayerId,
      ...Array.from({ length: 9 }, (_, index) => nextId(`farm-handoff-${index + 2}`)),
    ];

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
    for (const [index, playerId] of mlbPlayerIds.entries()) {
      await leagueBuilderStorage.savePlayer(makePlayer({
        id: playerId,
        primaryPosition: index >= 13 ? 'SP' : 'SS',
        leagueAssignments: [{ leagueId, teamId, rosterStatus: 'MLB' }],
      }));
    }
    for (const [index, playerId] of farmPlayerIds.entries()) {
      await leagueBuilderStorage.savePlayer(makePlayer({
        id: playerId,
        primaryPosition: index >= 8 ? 'SP' : 'SS',
        leagueAssignments: [{ leagueId, teamId, rosterStatus: 'MLB' }],
      }));
    }
    for (let index = 1; index <= 1; index += 1) {
      await leagueBuilderStorage.saveScoutProfile({
        id: nextId(`scout-handoff-${index}`),
        leagueId,
        teamId,
        name: `Handoff Scout ${index}`,
        specialties: index === 1 ? ['infield'] : ['pitching'],
        weaknesses: index === 1 ? ['CP'] : ['1B'],
        accuracyByPosition: { SS: 82, SP: 78, CP: 55 },
        seed: `handoff-scout-${index}`,
      });
    }
    await leagueBuilderStorage.saveTeamRoster({
      teamId,
      mlbRoster: mlbPlayerIds,
      farmRoster: farmPlayerIds,
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
    expect(sendDown.rosterMoveEvent).toEqual(expect.objectContaining({
      eventType: 'roster-move',
      movementType: 'send_down',
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      sourceRosterStatus: 'MLB',
      targetRosterStatus: 'FARM',
      optionsUsed: 1,
      rosterLevel: 'AAA',
      transactionId: sendDown.transactionId,
      moraleMutationApplied: false,
      relationshipMutationApplied: false,
      salaryMovementApplied: true,
      mode3HandoffApplied: false,
    }));
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
        ratingRevealState: 'revealed',
      }),
    ]);
    expect(sendDown.player?.ratingRevealState).toBe('revealed');

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
    expect(callUp.rosterMoveEvent).toEqual(expect.objectContaining({
      eventType: 'roster-move',
      movementType: 'call_up',
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber: 4,
      teamId: 'team-1',
      playerId,
      sourceRosterStatus: 'FARM',
      targetRosterStatus: 'MLB',
      ratingRevealState: 'revealed',
      transactionId: callUp.transactionId,
      moraleMutationApplied: false,
      relationshipMutationApplied: false,
      salaryMovementApplied: true,
      mode3HandoffApplied: false,
    }));
    expect(updatedPlayer?.ratingRevealState).toBe('revealed');
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(0);

    const transactions = await getTransactionsByFranchiseSeason(franchiseId, seasonId);
    expect(transactions.map((transaction) => transaction.type)).toEqual(
      expect.arrayContaining(['send_down', 'call_up']),
    );
    const loggedSendDown = transactions.find((transaction) => transaction.type === 'send_down');
    const loggedCallUp = transactions.find((transaction) => transaction.type === 'call_up');
    const loggedSendDownEvent = loggedSendDown?.data.rosterMoveEvent as { transactionId?: string } | undefined;
    const loggedCallUpEvent = loggedCallUp?.data.rosterMoveEvent as { transactionId?: string } | undefined;
    expect(loggedSendDownEvent?.transactionId).toBe(loggedSendDown?.id);
    expect(sendDown.rosterMoveEvent?.transactionId).toBe(loggedSendDownEvent?.transactionId);
    expect(loggedCallUpEvent?.transactionId).toBe(loggedCallUp?.id);
    expect(callUp.rosterMoveEvent?.transactionId).toBe(loggedCallUpEvent?.transactionId);
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
            rosterMoveEvent: expect.objectContaining({
              movementType: 'send_down',
              sourceRosterStatus: 'MLB',
              targetRosterStatus: 'FARM',
              transactionId: loggedSendDown?.id,
              moraleMutationApplied: false,
            }),
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
            rosterMoveEvent: expect.objectContaining({
              movementType: 'call_up',
              sourceRosterStatus: 'FARM',
              targetRosterStatus: 'MLB',
              transactionId: loggedCallUp?.id,
              moraleMutationApplied: false,
            }),
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

  test('call-up and send-down produce season salary ledger rows with rookie-scale salary and dead money', async () => {
    const franchiseId = nextId('franchise-ledger-producer');
    const seasonId = `${franchiseId}-season-1`;
    const playerId = 'rookie-ledger-player';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      age: 21,
      power: 90,
      contact: 90,
      speed: 75,
      fielding: 80,
      arm: 80,
      salary: 1_000_000,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      ratingRevealState: 'hidden',
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId,
      optionsUsed: 0,
      ratingRevealState: 'hidden',
    });

    const callUp = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'REGULAR_SEASON',
    });

    expect(callUp.success).toBe(true);
    expect(callUp.rosterMoveEvent?.salaryMovementApplied).toBe(true);
    expect(callUp.player?.rookieScaleActiveBySeason?.[seasonId]).toBe(true);
    expect(callUp.player?.salaryFactors?.rookieScaleActive).toBe(true);
    expect(callUp.player?.salaryFactors?.ageFactor).toBe(ROOKIE_SCALE_FACTOR);
    const activeLedger = await getFranchiseSeasonLedgerRow({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      playerId,
    });
    expect(activeLedger).toEqual(expect.objectContaining({
      playerId,
      salary: callUp.player?.salary,
      status: 'active',
      capCharge: callUp.player?.salary,
    }));

    const sendDown = await sendDownFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'REGULAR_SEASON',
    });
    expect(sendDown.success).toBe(true);
    expect(sendDown.rosterMoveEvent?.salaryMovementApplied).toBe(true);
    const deadLedger = await getFranchiseSeasonLedgerRow({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      playerId,
    });
    expect(deadLedger).toEqual(expect.objectContaining({
      salary: activeLedger?.salary,
      status: 'deadMoney',
      capCharge: (activeLedger?.salary ?? 0) * 0.75,
    }));

    const recall = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'REGULAR_SEASON',
    });
    expect(recall.success).toBe(true);
    expect(recall.player?.salary).toBe(activeLedger?.salary);
    const recalledLedger = await getFranchiseSeasonLedgerRow({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      playerId,
    });
    expect(recalledLedger).toEqual(expect.objectContaining({
      salary: activeLedger?.salary,
      status: 'active',
      capCharge: activeLedger?.salary,
    }));
  });

  test('drafted farm prospect first call-up stamps rookie status for the active season', async () => {
    const franchiseId = nextId('franchise-rookie-drafted');
    const seasonId = `${franchiseId}-season-1`;
    const playerId = 'drafted-rookie-first-call-up';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      draftedAsFarmProspect: true,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      ratingRevealState: 'hidden',
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId,
      optionsUsed: 0,
      ratingRevealState: 'hidden',
    });

    const callUp = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'REGULAR_SEASON',
    });

    expect(callUp.success).toBe(true);
    expect(callUp.player?.rookieStatus?.activatedSeasonId).toBe(seasonId);
  });

  test('non-drafted player first call-up does not stamp rookie status', async () => {
    const franchiseId = nextId('franchise-rookie-non-drafted');
    const seasonId = `${franchiseId}-season-1`;
    const playerId = 'non-drafted-first-call-up';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      ratingRevealState: 'hidden',
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId,
      optionsUsed: 0,
      ratingRevealState: 'hidden',
    });

    const callUp = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'REGULAR_SEASON',
    });

    expect(callUp.success).toBe(true);
    expect(callUp.player?.rookieStatus).toBeUndefined();
  });

  test('recalled veteran with a prior ledger row does not stamp rookie status', async () => {
    const franchiseId = nextId('franchise-rookie-recall');
    const seasonId = `${franchiseId}-season-1`;
    const playerId = 'recalled-veteran-no-rookie';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      draftedAsFarmProspect: true,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      ratingRevealState: 'revealed',
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId,
      optionsUsed: 1,
      ratingRevealState: 'revealed',
    });
    await upsertFranchiseSeasonLedgerRow({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      playerId,
      salary: 1_000_000,
      status: 'deadMoney',
      capCharge: 750_000,
      calculationVersion: 'test-existing-ledger',
      computedAt: '2026-01-01T00:00:00.000Z',
    });

    const recall = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 1,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'REGULAR_SEASON',
    });

    expect(recall.success).toBe(true);
    expect(recall.player?.rookieStatus).toBeUndefined();
  });

  test('drafted prospect with prior rookie activation is not re-stamped in a later season', async () => {
    const franchiseId = nextId('franchise-rookie-prior-activation');
    const debutSeasonId = `${franchiseId}-season-1`;
    const seasonId = `${franchiseId}-season-2`;
    const playerId = 'prior-activation-no-restamp';
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: playerId,
      draftedAsFarmProspect: true,
      rookieStatus: { activatedSeasonId: debutSeasonId },
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      ratingRevealState: 'revealed',
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 2,
      teamId: 'team-1',
      playerId,
      optionsUsed: 0,
      ratingRevealState: 'revealed',
    });

    const callUp = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 2,
      teamId: 'team-1',
      playerId,
      leagueId: 'league-1',
      rosterMovementPhase: 'REGULAR_SEASON',
    });

    expect(callUp.success).toBe(true);
    expect(callUp.player?.rookieStatus?.activatedSeasonId).toBe(debutSeasonId);
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

  test('call-up blocks when the MLB roster is already at the v1 cap', async () => {
    const franchiseId = nextId('franchise-mlb-cap');
    const seasonId = `${franchiseId}-season-5`;
    const farmPlayerId = 'player-call-up-cap';
    for (let index = 0; index < 22; index += 1) {
      await saveFranchisePlayer(franchiseId, makePlayer({
        id: `mlb-cap-${index}`,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      }));
    }
    await saveFranchisePlayer(franchiseId, makePlayer({
      id: farmPlayerId,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
    }));
    await saveFranchiseFarmRecord({
      franchiseId,
      seasonId,
      seasonNumber: 5,
      teamId: 'team-1',
      playerId: farmPlayerId,
      optionsUsed: 0,
    });

    const result = await callUpFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 5,
      teamId: 'team-1',
      playerId: farmPlayerId,
      leagueId: 'league-1',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'MLB_ROSTER_CAP_EXCEEDED',
      affectedPlayerId: farmPlayerId,
      affectedTeamId: 'team-1',
    });
    expect((await getFranchisePlayer(franchiseId, farmPlayerId))?.leagueAssignments?.[0].rosterStatus).toBe('FARM');
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(1);
  });

  test('send-down is allowed when the FARM roster is already at startup depth', async () => {
    const franchiseId = nextId('franchise-farm-cap');
    const seasonId = `${franchiseId}-season-5`;
    const mlbPlayerId = 'player-send-down-cap';
    await saveFranchisePlayer(franchiseId, makePlayer({ id: mlbPlayerId }));
    for (let index = 0; index < 10; index += 1) {
      const farmPlayerId = `farm-cap-${index}`;
      await saveFranchisePlayer(franchiseId, makePlayer({
        id: farmPlayerId,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      }));
      await saveFranchiseFarmRecord({
        franchiseId,
        seasonId,
        seasonNumber: 5,
        teamId: 'team-1',
        playerId: farmPlayerId,
        optionsUsed: 0,
      });
    }

    const result = await sendDownFranchisePlayer({
      franchiseId,
      seasonId,
      seasonNumber: 5,
      teamId: 'team-1',
      playerId: mlbPlayerId,
      leagueId: 'league-1',
    });

    expect(result).toMatchObject({
      success: true,
      affectedPlayerId: mlbPlayerId,
      affectedTeamId: 'team-1',
    });
    expect(result.rosterMoveEvent).toMatchObject({
      movementType: 'send_down',
      sourceRosterStatus: 'MLB',
      targetRosterStatus: 'FARM',
      moraleMutationApplied: false,
      relationshipMutationApplied: false,
      salaryMovementApplied: true,
      mode3HandoffApplied: false,
    });
    expect((await getFranchisePlayer(franchiseId, mlbPlayerId))?.leagueAssignments?.[0].rosterStatus).toBe('FARM');
    expect(await getFranchiseFarmRoster(franchiseId, seasonId, 'team-1')).toHaveLength(11);
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
