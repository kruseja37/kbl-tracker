import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { applyRebrandFameReset } from '../../engines/franchiseRebrandCascade';
import { executeRebrandCascade } from '../franchiseRebrandApply';
import {
  getFranchiseDesignationRows,
  saveFranchiseDesignationRows,
  type FranchiseDesignationScopeInput,
} from '../franchiseDesignationStorage';
import type { FranchisePlayerDesignationRecord } from '../franchiseDesignations';
import {
  getFranchiseFameRecordRowsByScope,
  saveFranchiseFameRecordRows,
  type FranchiseFameRecordRow,
} from '../franchiseFameRecordsStorage';
import {
  saveFranchiseFarmRecord,
} from '../franchiseFarmStorage';
import {
  applyFranchiseMoraleEffect,
  getFranchiseMoraleSnapshot,
  resetFranchiseMoraleDatabaseForTests,
} from '../franchiseMoraleState';
import {
  deleteFranchiseDatabase,
  getFranchiseTeam,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from '../franchisePlayerStorage';
import { getFranchiseDatabaseName } from '../franchisePersistenceContract';
import { resetTrackerDbForTests } from '../trackerDb';
import { syncEngine } from '../syncEngine';
import type { Player, Team } from '../leagueBuilderStorage';

const scope = {
  franchiseId: 'franchise-l14-2b',
  seasonId: 'franchise-l14-2b-season-1',
  statsScopeId: 'franchise-l14-2b-season-1',
  seasonNumber: 1,
};

const designationScope: FranchiseDesignationScopeInput = {
  franchiseId: scope.franchiseId,
  seasonId: scope.seasonId,
  statsScopeId: scope.statsScopeId,
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
  resetTrackerDbForTests();
  resetFranchiseMoraleDatabaseForTests();
  await Promise.all([
    deleteDatabase('kbl-tracker'),
    deleteDatabase('kbl-franchise-morale'),
    deleteDatabase('kbl-franchise-farm'),
    deleteDatabase(getFranchiseDatabaseName(scope.franchiseId)),
  ]);
  await deleteFranchiseDatabase(scope.franchiseId).catch(() => undefined);
}

function team(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-alpha',
    name: 'Old Alpha',
    abbreviation: 'ALP',
    location: 'Boulder',
    nickname: 'Switchbacks',
    colors: { primary: '#111111', secondary: '#eeeeee' },
    stadium: 'Apple Field',
    stadiumId: 'apple-field',
    controlledBy: 'human',
    leagueIds: ['league-l14'],
    fanHopefulPlayerId: 'old-hopeful',
    captainPlayerId: 'captain-alpha',
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function player(
  overrides: Partial<Player> & {
    id: string;
    teamId?: string;
    rosterStatus?: 'MLB' | 'FARM' | 'FREE_AGENT';
    scoutedGrade?: string;
  },
): Player & { prospectProfile?: { scoutedGrade: string } } {
  const teamId = overrides.teamId ?? 'team-alpha';
  const rosterStatus = overrides.rosterStatus ?? 'MLB';
  return {
    id: overrides.id,
    firstName: 'Test',
    lastName: overrides.id,
    gender: 'M',
    age: 24,
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
    leagueAssignments: [{ leagueId: 'league-l14', teamId, rosterStatus }],
    prospectProfile: overrides.scoutedGrade ? { scoutedGrade: overrides.scoutedGrade } : undefined,
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    ...overrides,
  };
}

function designation(teamId: string, type: FranchisePlayerDesignationRecord['type'], playerId: string): FranchisePlayerDesignationRecord {
  return {
    ...scope,
    teamId,
    playerId,
    playerName: playerId,
    type,
    status: 'active',
    sourceInputs: {},
    calculationVersion: 'test',
    calculatedAt: '2026-06-21T00:00:00.000Z',
    lockedAt: null,
    carryover: {
      carriesOver: false,
      untilSeasonProgress: null,
      previousSeasonId: null,
      previousPlayerId: null,
      note: null,
    },
  };
}

function channels(): FranchiseFameRecordRow['channelByChannel'] {
  return {
    wpa_spine: 0,
    iconic_event: 0,
    status: 0,
    defensive: 0,
    role_player: 0,
  };
}

function fameRow(playerId: string, overrides: Partial<FranchiseFameRecordRow> = {}): FranchiseFameRecordRow {
  return {
    ...designationScope,
    playerId,
    heat: 80,
    reachFloor: 4,
    wasNegative: false,
    channelTotal: 0,
    channelByChannel: channels(),
    defensiveFame: 0,
    rolePlayerFame: 0,
    updatedAtCheckpoint: '2026-06-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('executeRebrandCascade', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
    await resetDatabases();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await resetDatabases();
  });

  test('applies the L14 cascade once and no-ops on the idempotency marker', async () => {
    await saveFranchiseTeam(scope.franchiseId, team());
    await saveFranchiseTeam(scope.franchiseId, team({
      id: 'team-beta',
      name: 'Beta',
      abbreviation: 'BET',
      location: 'Denver',
      nickname: 'Peaks',
      fanHopefulPlayerId: 'beta-hopeful',
    }));

    await Promise.all([
      saveFranchisePlayer(scope.franchiseId, player({ id: 'roster-one' })),
      saveFranchisePlayer(scope.franchiseId, player({ id: 'roster-two', primaryPosition: 'SP' })),
      saveFranchisePlayer(scope.franchiseId, player({ id: 'beta-roster', teamId: 'team-beta' })),
      saveFranchisePlayer(scope.franchiseId, player({ id: 'farm-a', rosterStatus: 'FARM', scoutedGrade: 'A' })),
      saveFranchisePlayer(scope.franchiseId, player({ id: 'farm-b', rosterStatus: 'FARM', scoutedGrade: 'A-' })),
      saveFranchisePlayer(scope.franchiseId, player({ id: 'farm-c', rosterStatus: 'FARM', scoutedGrade: 'B' })),
      saveFranchisePlayer(scope.franchiseId, player({ id: 'farm-hidden-s', rosterStatus: 'FARM' })),
    ]);

    await Promise.all(['farm-a', 'farm-b', 'farm-c', 'farm-hidden-s'].map((playerId) =>
      saveFranchiseFarmRecord({
        franchiseId: scope.franchiseId,
        seasonId: scope.seasonId,
        seasonNumber: scope.seasonNumber,
        teamId: 'team-alpha',
        playerId,
      }),
    ));

    await saveFranchiseDesignationRows([
      designation('team-alpha', 'TEAM_MVP', 'roster-one'),
      designation('team-alpha', 'ACE', 'roster-two'),
      designation('team-alpha', 'ALBATROSS', 'roster-one'),
      designation('team-alpha', 'FAN_FAVORITE', 'roster-two'),
      designation('team-beta', 'TEAM_MVP', 'beta-roster'),
      designation('team-beta', 'FAN_FAVORITE', 'beta-roster'),
    ]);

    const rosterOneFame = fameRow('roster-one', { heat: 90, reachFloor: 5 });
    const rosterTwoFame = fameRow('roster-two', { heat: 60, reachFloor: 3 });
    const betaFame = fameRow('beta-roster', { heat: 70, reachFloor: 4 });
    await saveFranchiseFameRecordRows([rosterOneFame, rosterTwoFame, betaFame]);

    await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'team-fan',
      teamId: 'team-alpha',
      delta: -19,
      reason: 'seed low morale',
      sourceEventId: 'seed:team-alpha:low-morale',
      sourceKind: 'manual-override',
      timestamp: '2026-06-21T00:00:00.000Z',
    });

    const input = {
      scope,
      teamId: 'team-alpha',
      newTeamName: 'New Alpha',
      newCity: 'Fort Collins',
      seasonNumber: 1,
      gameNumber: 42,
      seed: 'l14-2b-test-seed',
    };

    const first = await executeRebrandCascade(input);

    expect(first.status).toBe('applied');
    expect(first.clearedDesignationCount).toBe(4);
    expect(first.fameResetCount).toBe(2);
    expect(['farm-a', 'farm-b', 'farm-c']).toContain(first.fanHopefulPlayerId);
    expect(first.idempotencyKey).toBe('rebrand:team-alpha:1:42');

    const designationsAfterFirst = await getFranchiseDesignationRows(designationScope);
    expect(designationsAfterFirst.map((row) => `${row.teamId}:${row.type}`).sort()).toEqual([
      'team-beta:FAN_FAVORITE',
      'team-beta:TEAM_MVP',
    ]);

    const fameAfterFirst = await getFranchiseFameRecordRowsByScope(designationScope);
    expect(fameAfterFirst.find((row) => row.playerId === 'roster-one')).toMatchObject(
      applyRebrandFameReset(rosterOneFame),
    );
    expect(fameAfterFirst.find((row) => row.playerId === 'roster-two')).toMatchObject(
      applyRebrandFameReset(rosterTwoFame),
    );
    expect(fameAfterFirst.find((row) => row.playerId === 'beta-roster')).toMatchObject(betaFame);

    const moraleAfterFirst = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-alpha');
    expect(moraleAfterFirst?.currentValue).toBe(70);
    expect(moraleAfterFirst?.history.at(-1)).toMatchObject({
      sourceEventId: 'rebrand:team-alpha:1:42',
      sourceKind: 'rebrand-reset',
      previousValue: 31,
      currentValue: 70,
    });

    const teamAfterFirst = await getFranchiseTeam(scope.franchiseId, 'team-alpha');
    expect(teamAfterFirst).toMatchObject({
      name: 'New Alpha',
      location: 'Fort Collins',
      fanHopefulPlayerId: first.fanHopefulPlayerId,
    });
    expect(teamAfterFirst?.stadium).not.toBe('Apple Field');
    expect(teamAfterFirst?.stadiumDimensions?.name).toBe(teamAfterFirst?.stadium);
    expect(teamAfterFirst?.parkFactors?.source).toBe('SEED');
    expect(teamAfterFirst?.captainPlayerId).toBe('captain-alpha');
    expect(teamAfterFirst?.teamHistory).toEqual([
      {
        formerTeamName: 'Old Alpha',
        formerStadiumName: 'Apple Field',
        relocatedAtSeason: 1,
        relocatedAtGame: 42,
      },
    ]);

    const second = await executeRebrandCascade(input);

    expect(second.status).toBe('already-applied');
    expect(second.idempotencyKey).toBe('rebrand:team-alpha:1:42');
    expect(await getFranchiseDesignationRows(designationScope)).toEqual(designationsAfterFirst);
    expect(await getFranchiseFameRecordRowsByScope(designationScope)).toEqual(fameAfterFirst);
    expect((await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-alpha'))?.history).toHaveLength(2);
    expect((await getFranchiseTeam(scope.franchiseId, 'team-alpha'))?.teamHistory).toHaveLength(1);
  });
});
