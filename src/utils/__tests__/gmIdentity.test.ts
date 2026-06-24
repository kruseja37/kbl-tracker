import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { StoredFranchiseConfig } from '../../types/franchise';
import { buildGmProfile, getGmProfile } from '../gmIdentity';
import { resetMetaDb, saveFranchiseConfig } from '../franchiseManager';

const META_DB_NAME = 'kbl-app-meta';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function makeStoredConfig(franchiseId: string): StoredFranchiseConfig {
  return {
    franchiseId,
    createdAt: 1,
    franchiseName: 'GM Test Franchise',
    league: 'league-1',
    leagueDetails: {
      name: 'League One',
      teams: 2,
      conferences: 1,
      divisions: 1,
    },
    season: {
      gamesPerTeam: 1,
      inningsPerGame: 9,
      extraInningsRule: 'standard',
      scheduleType: 'balanced',
      useDH: true,
      allStarGame: false,
      tradeDeadline: false,
      mercyRule: false,
    },
    playoffs: {
      teamsQualifying: 2,
      format: 'conference',
      seriesLengths: {
        wildCard: 'best-of-3',
        divisionSeries: 'best-of-5',
        championship: 'best-of-7',
        worldSeries: 'best-of-7',
      },
      homeFieldAdvantage: 'higher-seed',
    },
    teams: {
      selectedTeams: ['team-a'],
      mode: 'single',
      playerAssignments: {},
    },
    roster: {
      mode: 'existing',
    },
    franchiseType: 'solo',
    teamControl: {
      'team-a': 'human',
    },
    controlledTeams: [
      {
        teamId: 'team-a',
        teamName: 'Team A',
        controlledBy: 'human',
      },
    ],
    rulesSnapshot: {
      gamesPerTeam: 1,
      inningsPerGame: 9,
      extraInningsRule: 'standard',
      scheduleType: 'balanced',
      useDH: true,
      allStarGame: false,
      tradeDeadline: false,
      mercyRule: false,
    },
    playoffSetupSnapshot: {
      teamsQualifying: 2,
      format: 'conference',
      seriesLengths: {
        wildCard: 'best-of-3',
        divisionSeries: 'best-of-5',
        championship: 'best-of-7',
        worldSeries: 'best-of-7',
      },
      homeFieldAdvantage: 'higher-seed',
    },
    seasonLength: {
      gamesPerTeam: 1,
      expectedRegularSeasonGamesPerTeam: 1,
      inningsPerGame: 9,
      adaptiveStandardsInningsPerGame: 9,
    },
    schedulePolicy: {
      policy: 'empty-manual-user-supplied',
      generatedSchedulesAllowed: false,
      initialScheduleRows: 0,
      allowedSources: ['manual', 'csv'],
    },
    rosterRequirements: {
      mlbPlayersPerTeam: 22,
      farmPlayersPerTeam: 10,
      validationStatus: 'passed',
      teamCounts: {},
    },
    stadiums: [],
    salaryBaseline: {
      calculationVersion: 'franchise-salary-v1-spec-multifactor-hidden-safe',
      playerCount: 0,
      salariedPlayerCount: 0,
      totalSalary: 0,
      averageSalary: 0,
    },
    handoffContract: {
      version: 'mode1-mode2-v1',
      franchiseType: 'solo',
      teamControl: {
        franchiseType: 'solo',
        teamControl: {
          'team-a': 'human',
        },
        controlledTeams: [
          {
            teamId: 'team-a',
            teamName: 'Team A',
            controlledBy: 'human',
          },
        ],
      },
      rulesSnapshot: {
        gamesPerTeam: 1,
        inningsPerGame: 9,
        extraInningsRule: 'standard',
        scheduleType: 'balanced',
        useDH: true,
        allStarGame: false,
        tradeDeadline: false,
        mercyRule: false,
      },
      playoffSetupSnapshot: {
        teamsQualifying: 2,
        format: 'conference',
        seriesLengths: {
          wildCard: 'best-of-3',
          divisionSeries: 'best-of-5',
          championship: 'best-of-7',
          worldSeries: 'best-of-7',
        },
        homeFieldAdvantage: 'higher-seed',
      },
      seasonLength: {
        gamesPerTeam: 1,
        expectedRegularSeasonGamesPerTeam: 1,
        inningsPerGame: 9,
        adaptiveStandardsInningsPerGame: 9,
      },
      schedulePolicy: {
        policy: 'empty-manual-user-supplied',
        generatedSchedulesAllowed: false,
        initialScheduleRows: 0,
        allowedSources: ['manual', 'csv'],
      },
      rosterRequirements: {
        mlbPlayersPerTeam: 22,
        farmPlayersPerTeam: 10,
        validationStatus: 'passed',
        teamCounts: {},
      },
      stadiums: [],
      salaryBaseline: {
        calculationVersion: 'franchise-salary-v1-spec-multifactor-hidden-safe',
        playerCount: 0,
        salariedPlayerCount: 0,
        totalSalary: 0,
        averageSalary: 0,
      },
    },
  };
}

describe('GM identity', () => {
  beforeEach(async () => {
    resetMetaDb();
    await deleteDatabase(META_DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    resetMetaDb();
    await deleteDatabase(META_DB_NAME).catch(() => undefined);
  });

  test('uses a trimmed user GM name and marks the profile user-created', () => {
    const profile = buildGmProfile({
      franchiseId: 'franchise-user',
      controlledTeamId: 'team-a',
      gmName: '  Jordan Rally  ',
    });

    expect(profile).toEqual({
      gmId: 'franchise-user-gm',
      displayName: 'Jordan Rally',
      createdByUser: true,
      teamId: 'team-a',
    });
  });

  test('generates a stable SMB4-style default name from franchiseId', () => {
    const first = buildGmProfile({ franchiseId: 'franchise-default', controlledTeamId: 'team-a' });
    const second = buildGmProfile({ franchiseId: 'franchise-default', controlledTeamId: 'team-b' });
    const other = buildGmProfile({ franchiseId: 'franchise-other', controlledTeamId: 'team-a' });

    expect(first.displayName.trim().length).toBeGreaterThan(0);
    expect(first.displayName).toBe(second.displayName);
    expect(first.createdByUser).toBe(false);
    expect(other.displayName.trim().length).toBeGreaterThan(0);
  });

  test('falls through to the generated default for blank user input', () => {
    const blank = buildGmProfile({ franchiseId: 'franchise-blank', gmName: '   ' });
    const generated = buildGmProfile({ franchiseId: 'franchise-blank' });

    expect(blank.createdByUser).toBe(false);
    expect(blank.displayName).toBe(generated.displayName);
  });

  test('reads the persisted GM profile from the stored franchise config', async () => {
    const franchiseId = 'franchise-persisted';
    const gm = buildGmProfile({
      franchiseId,
      controlledTeamId: 'team-a',
      gmName: 'Casey Ledger',
    });

    await saveFranchiseConfig({
      ...makeStoredConfig(franchiseId),
      gm,
    });

    await expect(getGmProfile(franchiseId)).resolves.toEqual(gm);
    await expect(getGmProfile('missing-franchise')).resolves.toBeNull();
  });
});
