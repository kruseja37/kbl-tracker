import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { fireManager, managerFiringSeam, type FireManagerParams } from '../franchiseManagerFiring';
import {
  getFranchiseMoraleSnapshot,
  resetFranchiseMoraleDatabaseForTests,
} from '../franchiseMoraleState';
import {
  deleteFranchiseDatabase,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from '../franchisePlayerStorage';
import {
  resetFranchiseTrueValueDatabaseForTests,
  saveFranchiseTrueValueRows,
  type FranchiseTrueValueRow,
} from '../franchiseTrueValueStorage';
import {
  getManagerAssignment,
  getManagerProfile,
  listManagerAssignments,
  resetManagerIdentityDatabaseForTests,
  saveManagerAssignment,
  saveManagerProfile,
} from '../managerIdentityStorage';
import { setFranchisePhase2L11EnabledForTests } from '../franchisePhase2Flags';
import { syncEngine } from '../syncEngine';
import type { Player, Team } from '../leagueBuilderStorage';
import { TRUE_VALUE_CALCULATION_VERSION } from '../../engines/salaryCalculator';

const TRACKER_DB_NAME = 'kbl-tracker';
const MANAGER_DB_NAME = 'kbl-manager-identity';
const MORALE_DB_NAME = 'kbl-franchise-morale';

const scope = {
  franchiseId: 'franchise-l11',
  seasonId: 'season-l11',
  statsScopeId: 'scope-l11',
  seasonNumber: 1,
};

const baseParams: FireManagerParams = {
  ...scope,
  leagueId: 'league-l11',
  teamId: 'team-alpha',
  mode: 'franchise',
  instanceId: 'season-l11-instance',
  reason: 'user',
  endDate: '2026-06-19T00:00:00.000Z',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

async function resetDatabases(): Promise<void> {
  resetManagerIdentityDatabaseForTests();
  resetFranchiseMoraleDatabaseForTests();
  resetFranchiseTrueValueDatabaseForTests();
  await Promise.all([
    deleteDatabase(TRACKER_DB_NAME),
    deleteDatabase(MANAGER_DB_NAME),
    deleteDatabase(MORALE_DB_NAME),
    deleteFranchiseDatabase(scope.franchiseId).catch(() => undefined),
  ]);
}

function team(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-alpha',
    name: 'Alpha',
    abbreviation: 'ALP',
    location: 'Boulder',
    nickname: 'Switchbacks',
    colors: { primary: '#111111', secondary: '#eeeeee' },
    stadium: 'Alpha Park',
    leagueIds: ['league-l11'],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function player(overrides: Partial<Player> & { id: string }): Player {
  return {
    id: overrides.id,
    firstName: 'Test',
    lastName: overrides.id,
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1000000,
    leagueAssignments: [{ leagueId: 'league-l11', teamId: 'team-alpha', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    ...overrides,
  };
}

function trueValueRow(playerId: string, valueDelta: number): FranchiseTrueValueRow {
  return {
    ...scope,
    playerId,
    trueValue: 1000000 + valueDelta,
    contractValue: 1000000,
    valueDelta,
    warPercentile: 0.5,
    position: 'SS',
    peerPoolSize: 12,
    calculationVersion: TRUE_VALUE_CALCULATION_VERSION,
    computedAt: '2026-06-18T12:00:00.000Z',
  };
}

async function seedActiveManager(): Promise<void> {
  await saveManagerProfile({
    managerId: 'manager-incumbent',
    displayName: 'Incumbent Manager',
    createdByUser: true,
    defaultManager: false,
  });
  await saveManagerAssignment({
    managerId: 'manager-incumbent',
    teamId: baseParams.teamId,
    mode: 'franchise',
    instanceId: baseParams.instanceId,
    startDate: '2026-01-01T00:00:00.000Z',
  });
}

async function seedRosterAndValue(): Promise<void> {
  await saveFranchiseTeam(scope.franchiseId, team());
  await saveFranchisePlayer(scope.franchiseId, player({
    id: 'player-negative',
    personality: 'Timid',
    hiddenPersonalityModifiers: { loyalty: 90, ambition: 50, resilience: 10, charisma: 50 },
  }));
  await saveFranchisePlayer(scope.franchiseId, player({
    id: 'player-positive',
    personality: 'Egotistical',
  }));
  await saveFranchisePlayer(scope.franchiseId, player({
    id: 'player-farm',
    leagueAssignments: [{ leagueId: 'league-l11', teamId: 'team-alpha', rosterStatus: 'FARM' }],
  }));
  await saveFranchiseTrueValueRows([
    trueValueRow('player-negative', -200000),
    trueValueRow('player-positive', 150000),
  ]);
}

describe('fireManager', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetDatabases();
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
    setFranchisePhase2L11EnabledForTests(null);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setFranchisePhase2L11EnabledForTests(null);
    await resetDatabases();
  });

  test('flag off returns dark-noop without loading assignments, roster, compute, or writes', async () => {
    setFranchisePhase2L11EnabledForTests(false);
    const assignmentSpy = vi.spyOn(await import('../managerIdentityStorage'), 'getManagerAssignment');
    const resolveSpy = vi.spyOn(managerFiringSeam, 'resolveFiringSnapshot');
    const computeSpy = vi.spyOn(managerFiringSeam, 'computeFranchiseL11Firing');
    const writeSpy = vi.spyOn(managerFiringSeam, 'applyFranchiseMoraleEffect');

    const result = await fireManager(baseParams);

    expect(result).toEqual({
      status: 'dark-noop',
      reliefApplied: false,
      ripplesApplied: 0,
      reason: 'Phase-2 L11 disabled.',
    });
    expect(assignmentSpy).not.toHaveBeenCalled();
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(computeSpy).not.toHaveBeenCalled();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test('flag on with active manager fires, writes morale, closes legacy, and creates a successor assignment', async () => {
    setFranchisePhase2L11EnabledForTests(true);
    await seedActiveManager();
    await seedRosterAndValue();
    const upsertSpy = vi.spyOn(syncEngine, 'upsert');
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(false);
    upsertSpy.mockClear();

    const result = await fireManager(baseParams);

    expect(result.status).toBe('fired');
    expect(result.firedManagerId).toBe('manager-incumbent');
    expect(result.successorManagerId).toBe('team-alpha-manager');
    expect(result.reliefApplied).toBe(true);
    expect(result.ripplesApplied).toBe(1);
    expect(result.firingReport?.playerRipples).toEqual([
      expect.objectContaining({ playerId: 'player-negative', untouchable: false }),
      expect.objectContaining({ playerId: 'player-positive', moraleDelta: 0, untouchable: true }),
    ]);
    expect(upsertSpy).toHaveBeenCalledWith(
      'kbl-manager-identity',
      'managerAssignments',
      ['franchise', baseParams.instanceId, baseParams.teamId],
      expect.objectContaining({
        managerId: 'manager-incumbent',
        fired: true,
        endDate: baseParams.endDate,
        firedReason: 'user',
      }),
    );
    expect(upsertSpy).toHaveBeenCalledWith(
      'kbl-manager-identity',
      'managerAssignments',
      ['franchise', baseParams.instanceId, baseParams.teamId],
      expect.objectContaining({
        managerId: 'team-alpha-manager',
        startDate: baseParams.endDate,
      }),
    );

    await expect(getManagerAssignment({
      teamId: baseParams.teamId,
      mode: 'franchise',
      instanceId: baseParams.instanceId,
    })).resolves.toMatchObject({
      managerId: 'team-alpha-manager',
      startDate: baseParams.endDate,
    });

    const assignments = await listManagerAssignments({
      mode: 'franchise',
      instanceId: baseParams.instanceId,
      teamId: baseParams.teamId,
    });
    expect(assignments).toHaveLength(1);
    expect(assignments[0].managerId).toBe('team-alpha-manager');

    // L11-4: the fired tenure-end is durably persisted on the fired manager's
    // profile (survives the successor overwriting the team-keyed assignment).
    const firedProfile = await getManagerProfile('manager-incumbent');
    expect(firedProfile?.tenureRecords).toEqual([
      {
        teamId: baseParams.teamId,
        mode: 'franchise',
        instanceId: baseParams.instanceId,
        hireDate: '2026-01-01T00:00:00.000Z',
        endDate: baseParams.endDate,
        endReason: 'fired',
      },
    ]);

    const fanSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', baseParams.teamId);
    const negativeSnapshot = await getFranchiseMoraleSnapshot(scope, 'player', 'player-negative');
    const positiveSnapshot = await getFranchiseMoraleSnapshot(scope, 'player', 'player-positive');

    expect(fanSnapshot?.currentValue).toBeGreaterThan(50);
    expect(fanSnapshot?.history[0]).toMatchObject({
      sourceEventId: `manager-fired:${baseParams.teamId}:${baseParams.seasonId}:${baseParams.instanceId}`,
      reason: 'manager.fired.relief',
      timestamp: baseParams.endDate,
    });
    expect(negativeSnapshot?.currentValue).toBeLessThan(50);
    expect(negativeSnapshot?.history[0]).toMatchObject({
      sourceEventId: `manager-fired:${baseParams.teamId}:${baseParams.seasonId}:${baseParams.instanceId}:player-negative`,
      reason: 'manager.fired.ripple',
      timestamp: baseParams.endDate,
    });
    expect(positiveSnapshot).toBeNull();
  });

  test('suppressFanReliefBump skips fan relief but still applies player ripples', async () => {
    setFranchisePhase2L11EnabledForTests(true);
    await seedActiveManager();
    await seedRosterAndValue();

    const result = await fireManager({ ...baseParams, suppressFanReliefBump: true });

    expect(result.status).toBe('fired');
    expect(result.reliefApplied).toBe(false);
    expect(result.ripplesApplied).toBe(1);
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', baseParams.teamId)).resolves.toBeNull();
    await expect(getFranchiseMoraleSnapshot(scope, 'player', 'player-negative')).resolves.toMatchObject({
      currentValue: expect.any(Number),
    });
  });

  test('no active manager returns no-active-manager without writes', async () => {
    setFranchisePhase2L11EnabledForTests(true);
    await seedRosterAndValue();
    const resolveSpy = vi.spyOn(managerFiringSeam, 'resolveFiringSnapshot');

    const result = await fireManager(baseParams);

    expect(result).toEqual({ status: 'no-active-manager', reliefApplied: false, ripplesApplied: 0 });
    expect(resolveSpy).not.toHaveBeenCalled();
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', baseParams.teamId)).resolves.toBeNull();
    await expect(listManagerAssignments({ mode: 'franchise', instanceId: baseParams.instanceId })).resolves.toEqual([]);
  });

  test('same inputs with fixed endDate produce the same result and write sequence', async () => {
    setFranchisePhase2L11EnabledForTests(true);
    const writes: unknown[] = [];
    vi.spyOn(managerFiringSeam, 'resolveFiringSnapshot').mockResolvedValue({
      teamFanMorale: 30,
      teamIdentity: { id: 'team-alpha', name: 'Alpha' },
      players: [
        { id: 'player-negative', valueDelta: -200000, personality: 'TIMID', loyalty: 90, resilience: 10 },
        { id: 'player-positive', valueDelta: 150000, personality: 'EGOTISTICAL' },
      ],
    });
    vi.spyOn(managerFiringSeam, 'applyFranchiseMoraleEffect').mockImplementation(async (input) => {
      writes.push(input);
      return true;
    });
    await seedActiveManager();

    const first = await fireManager(baseParams);
    const firstWrites = [...writes];

    writes.length = 0;
    await resetDatabases();
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
    await seedActiveManager();
    setFranchisePhase2L11EnabledForTests(true);

    const second = await fireManager(baseParams);

    expect(second).toEqual(first);
    expect(writes).toEqual(firstWrites);
  });
});
