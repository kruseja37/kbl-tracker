import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveFranchisePlayer: vi.fn(),
  savePlayer: vi.fn(),
}));

vi.mock('../franchisePlayerStorage', () => ({
  saveFranchisePlayer: mocks.saveFranchisePlayer,
}));

vi.mock('../leagueBuilderStorage', () => ({
  savePlayer: mocks.savePlayer,
}));

import {
  FRANCHISE_ACTIVE_DESIGNATION_CALCULATION_VERSION,
  persistFranchiseDesignationsForPlayers,
  syncActiveTeamMvpAceDesignationsFromEligibility,
  type FranchisePlayerDesignationRecord,
} from '../franchiseDesignations';
import {
  FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION,
  type FranchiseDesignationEligibilityRecord,
  type FranchiseDesignationEligibilityReport,
} from '../franchiseDesignationEligibility';
import type { Player } from '../franchisePlayerStorage';
import * as leagueBuilderStorage from '../leagueBuilderStorage';

function makePlayer(id: string): Player {
  return {
    id,
    firstName: id,
    lastName: 'Persist',
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    power: 70,
    contact: 70,
    speed: 70,
    fielding: 70,
    arm: 70,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 5,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
  };
}

function designation(playerId: string): FranchisePlayerDesignationRecord {
  return {
    franchiseId: 'franchise-a',
    seasonId: 'franchise-a-season-1',
    seasonNumber: 1,
    teamId: 'team-a',
    playerId,
    playerName: playerId,
    type: 'FAN_FAVORITE',
    status: 'projected',
    sourceInputs: { valueDelta: 5 },
    calculationVersion: 'test',
    calculatedAt: '2026-05-27T00:00:00.000Z',
  };
}

function activeEligibilityRecord(overrides: Partial<FranchiseDesignationEligibilityRecord> = {}): FranchiseDesignationEligibilityRecord {
  return {
    contractVersion: FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION,
    franchiseId: 'franchise-a',
    seasonId: 'franchise-a-season-1',
    statsScopeId: 'franchise-a-season-1',
    seasonNumber: 1,
    playerId: 'player-a',
    playerName: 'player-a Persist',
    teamId: 'team-a',
    rosterStatus: 'MLB',
    designationType: 'TEAM_MVP',
    status: 'active',
    persistable: true,
    reasons: ['TEAM_MVP ranked active v1 designation has positive team-relative performance evidence and scoped WAR consumer trust.'],
    limitations: ['Season-end locking/carryover, awards, morale mutation, relationships, salary movement, and Mode 3 remain blocked.'],
    sourceInputs: {
      salaryBaselineAvailable: true,
      teamSalaryBaselineAvailable: true,
      seasonStatsAvailable: true,
      warPreviewInputAvailable: true,
      pitchingWarPreviewInputAvailable: false,
      totalWar: 1.8,
      pitchingWar: null,
      teamMvpWarTrusted: true,
      aceWarTrusted: false,
      wpaAvailable: false,
      wpaTrustedForFinalValue: false,
      trueValueAvailable: false,
      moraleAvailable: false,
      relationshipInputsAvailable: false,
      awardInputsFinalized: false,
      seedParkFactorsAvailable: true,
      parkAdjustedValueInputsAvailable: false,
      seasonMetadataAvailable: true,
    },
    ...overrides,
  };
}

function eligibilityReport(records: FranchiseDesignationEligibilityRecord[]): FranchiseDesignationEligibilityReport {
  return {
    contractVersion: FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION,
    franchiseId: 'franchise-a',
    seasonId: 'franchise-a-season-1',
    statsScopeId: 'franchise-a-season-1',
    seasonNumber: 1,
    valueInputContractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    generatedAt: 1,
    records,
    anyPersistable: records.some((record) => record.persistable),
    limitations: [],
  };
}

describe('franchise designation persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('writes only franchise-owned player records and never League Builder/global players', async () => {
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId: string, player: Player) => player);

    const saved = await persistFranchiseDesignationsForPlayers(
      'franchise-a',
      [makePlayer('player-a'), makePlayer('player-b')],
      [designation('player-a')],
    );

    expect(saved).toHaveLength(1);
    expect(mocks.saveFranchisePlayer).toHaveBeenCalledWith(
      'franchise-a',
      expect.objectContaining({
        id: 'player-a',
        franchiseDesignations: [expect.objectContaining({ playerId: 'player-a' })],
      }),
    );
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalledWith(
      'franchise-a',
      expect.objectContaining({ id: 'player-b' }),
    );
    expect(leagueBuilderStorage.savePlayer).not.toHaveBeenCalled();
  });

  test('syncs active TEAM_MVP/ACE designations onto franchise players and emits typed events without morale mutation', async () => {
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId: string, player: Player) => player);

    const saved = await syncActiveTeamMvpAceDesignationsFromEligibility(
      eligibilityReport([
        activeEligibilityRecord(),
        activeEligibilityRecord({
          playerId: 'player-b',
          playerName: 'player-b Persist',
          designationType: 'ACE',
          sourceInputs: {
            ...activeEligibilityRecord().sourceInputs,
            totalWar: 1.1,
            pitchingWar: 1.1,
            teamMvpWarTrusted: false,
            aceWarTrusted: true,
            pitchingWarPreviewInputAvailable: true,
          },
        }),
        activeEligibilityRecord({
          playerId: 'player-a',
          designationType: 'FAN_FAVORITE',
          status: 'blocked',
          persistable: false,
          reasons: ['FAN_FAVORITE requires canonical True Value and value-delta inputs.'],
        }),
      ]),
      {
        players: [makePlayer('player-a'), makePlayer('player-b')],
        calculatedAt: '2026-06-08T00:00:00.000Z',
      },
    );

    expect(saved.activeDesignations).toHaveLength(2);
    expect(saved.activeDesignations.map((designation) => [designation.type, designation.playerId])).toEqual([
      ['TEAM_MVP', 'player-a'],
      ['ACE', 'player-b'],
    ]);
    expect(saved.activeDesignations[0]).toMatchObject({
      status: 'active',
      statsScopeId: 'franchise-a-season-1',
      calculationVersion: FRANCHISE_ACTIVE_DESIGNATION_CALCULATION_VERSION,
    });
    expect(saved.designationEvents).toEqual([
      expect.objectContaining({
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-1',
        statsScopeId: 'franchise-a-season-1',
        teamId: 'team-a',
        playerId: 'player-a',
        designationType: 'TEAM_MVP',
        previousState: null,
        effectCategory: 'designation-earned',
        createdAt: '2026-06-08T00:00:00.000Z',
      }),
      expect.objectContaining({
        playerId: 'player-b',
        designationType: 'ACE',
      }),
    ]);
    expect(saved.moraleMutationApplied).toBe(false);
    expect(saved.relationshipMutationApplied).toBe(false);
    expect(saved.salaryMovementApplied).toBe(false);
    expect(saved.mode3HandoffApplied).toBe(false);
    expect(mocks.saveFranchisePlayer).toHaveBeenCalledTimes(2);
    expect(leagueBuilderStorage.savePlayer).not.toHaveBeenCalled();
  });

  test('re-running identical active TEAM_MVP/ACE sync preserves metadata and performs no writes or events', async () => {
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId: string, player: Player) => player);
    const report = eligibilityReport([
      activeEligibilityRecord(),
      activeEligibilityRecord({
        playerId: 'player-b',
        playerName: 'player-b Persist',
        designationType: 'ACE',
        sourceInputs: {
          ...activeEligibilityRecord().sourceInputs,
          totalWar: 1.1,
          pitchingWar: 1.1,
          teamMvpWarTrusted: false,
          aceWarTrusted: true,
          pitchingWarPreviewInputAvailable: true,
        },
      }),
    ]);

    const first = await syncActiveTeamMvpAceDesignationsFromEligibility(
      report,
      {
        players: [makePlayer('player-a'), makePlayer('player-b')],
        calculatedAt: '2026-06-08T00:00:00.000Z',
      },
    );

    expect(first.savedPlayers).toHaveLength(2);
    expect(first.designationEvents).toHaveLength(2);
    expect(first.activeDesignations.map((designation) => designation.calculatedAt)).toEqual([
      '2026-06-08T00:00:00.000Z',
      '2026-06-08T00:00:00.000Z',
    ]);

    mocks.saveFranchisePlayer.mockClear();

    const second = await syncActiveTeamMvpAceDesignationsFromEligibility(
      report,
      {
        players: first.savedPlayers,
        calculatedAt: '2026-06-09T00:00:00.000Z',
      },
    );

    expect(second.savedPlayers).toEqual([]);
    expect(second.designationEvents).toEqual([]);
    expect(second.activeDesignations.map((designation) => designation.calculatedAt)).toEqual([
      '2026-06-08T00:00:00.000Z',
      '2026-06-08T00:00:00.000Z',
    ]);
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(leagueBuilderStorage.savePlayer).not.toHaveBeenCalled();
  });

  test('changed active designation evidence updates the player and emits a changed event', async () => {
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId: string, player: Player) => player);
    const first = await syncActiveTeamMvpAceDesignationsFromEligibility(
      eligibilityReport([activeEligibilityRecord()]),
      {
        players: [makePlayer('player-a')],
        calculatedAt: '2026-06-08T00:00:00.000Z',
      },
    );

    mocks.saveFranchisePlayer.mockClear();

    const changed = await syncActiveTeamMvpAceDesignationsFromEligibility(
      eligibilityReport([
        activeEligibilityRecord({
          reasons: ['TEAM_MVP ranked active v1 designation moved after updated scoped WAR evidence.'],
          sourceInputs: {
            ...activeEligibilityRecord().sourceInputs,
            totalWar: 2.4,
          },
        }),
      ]),
      {
        players: first.savedPlayers,
        calculatedAt: '2026-06-09T00:00:00.000Z',
      },
    );

    expect(changed.savedPlayers).toHaveLength(1);
    expect(changed.activeDesignations[0]).toMatchObject({
      playerId: 'player-a',
      calculatedAt: '2026-06-09T00:00:00.000Z',
      sourceInputs: expect.objectContaining({ totalWAR: 2.4 }),
    });
    expect(changed.designationEvents).toEqual([
      expect.objectContaining({
        playerId: 'player-a',
        designationType: 'TEAM_MVP',
        effectCategory: 'designation-changed',
        previousState: expect.objectContaining({
          playerId: 'player-a',
          calculatedAt: '2026-06-08T00:00:00.000Z',
        }),
        newState: expect.objectContaining({
          playerId: 'player-a',
          calculatedAt: '2026-06-09T00:00:00.000Z',
          sourceInputs: expect.objectContaining({ totalWAR: 2.4 }),
        }),
      }),
    ]);
    expect(mocks.saveFranchisePlayer).toHaveBeenCalledTimes(1);
  });

  test('changed active designation winner removes the old holder and persists the new holder', async () => {
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId: string, player: Player) => player);
    const first = await syncActiveTeamMvpAceDesignationsFromEligibility(
      eligibilityReport([activeEligibilityRecord()]),
      {
        players: [makePlayer('player-a'), makePlayer('player-c')],
        calculatedAt: '2026-06-08T00:00:00.000Z',
      },
    );
    const playerAAfterFirst = first.savedPlayers.find((player) => player.id === 'player-a')!;
    const playerCAfterFirst = makePlayer('player-c');

    mocks.saveFranchisePlayer.mockClear();

    const changed = await syncActiveTeamMvpAceDesignationsFromEligibility(
      eligibilityReport([
        activeEligibilityRecord({
          playerId: 'player-c',
          playerName: 'player-c Persist',
          sourceInputs: {
            ...activeEligibilityRecord().sourceInputs,
            totalWar: 2.8,
          },
        }),
      ]),
      {
        players: [playerAAfterFirst, playerCAfterFirst],
        calculatedAt: '2026-06-09T00:00:00.000Z',
      },
    );

    expect(changed.savedPlayers.map((player) => player.id).sort()).toEqual(['player-a', 'player-c']);
    expect((changed.savedPlayers.find((player) => player.id === 'player-a') as Player & {
      franchiseDesignations?: FranchisePlayerDesignationRecord[];
    }).franchiseDesignations ?? []).toEqual([]);
    expect((changed.savedPlayers.find((player) => player.id === 'player-c') as Player & {
      franchiseDesignations?: FranchisePlayerDesignationRecord[];
    }).franchiseDesignations).toEqual([
      expect.objectContaining({
        playerId: 'player-c',
        type: 'TEAM_MVP',
        calculatedAt: '2026-06-09T00:00:00.000Z',
      }),
    ]);
    expect(changed.designationEvents).toEqual([
      expect.objectContaining({
        playerId: 'player-c',
        designationType: 'TEAM_MVP',
        effectCategory: 'designation-changed',
        previousState: expect.objectContaining({ playerId: 'player-a' }),
        newState: expect.objectContaining({ playerId: 'player-c' }),
      }),
    ]);
  });
});
