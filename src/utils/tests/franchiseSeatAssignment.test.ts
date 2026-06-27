import { describe, expect, test } from 'vitest';

import type { FranchiseConfig } from '../../types/franchise';
import {
  buildTeamControlSnapshot,
  deriveFranchiseType,
} from '../franchiseInitializer';
import type { ScheduleTeam } from '../scheduleGenerator';

function makeConfig(partialTeams: Partial<FranchiseConfig['teams']> = {}): FranchiseConfig {
  return {
    league: 'league-1',
    leagueDetails: {
      name: 'Test League',
      teams: 4,
      conferences: 1,
      divisions: 1,
    },
    season: {
      gamesPerTeam: 12,
      inningsPerGame: 9,
      extraInningsRule: 'standard',
      scheduleType: 'manual',
      allStarGame: true,
      tradeDeadline: true,
      mercyRule: false,
    },
    playoffs: {
      teamsQualifying: 2,
      format: 'single-elimination',
      seriesLengths: {
        wildCard: '1',
        divisionSeries: '3',
        championship: '3',
        worldSeries: '5',
      },
      homeFieldAdvantage: 'higher-seed',
    },
    teams: {
      selectedTeams: ['t1'],
      mode: 'single',
      playerAssignments: {},
      ...partialTeams,
    },
    roster: {
      mode: 'existing',
    },
    franchiseName: 'Test Franchise',
  };
}

function makeTeams(count: number): ScheduleTeam[] {
  return Array.from({ length: count }, (_, index) => {
    const teamNumber = index + 1;
    return {
      teamId: `t${teamNumber}`,
      teamName: `Team ${teamNumber}`,
    };
  });
}

describe('franchise seat assignment ownership spine', () => {
  test('seat assignments control teams and two distinct seats derive couch-coop', () => {
    const teams = makeTeams(4);
    const config = makeConfig({
      selectedTeams: ['t4'],
      mode: 'multiplayer',
      seats: [
        { id: 's1', name: 'GM One' },
        { id: 's2', name: 'GM Two' },
      ],
      playerAssignments: {
        t1: 's1',
        t2: 's1',
        t3: 's2',
        t4: 'cpu',
      },
    });

    const snapshot = buildTeamControlSnapshot(config, teams);

    expect(snapshot.teamControl).toEqual({
      t1: 'human',
      t2: 'human',
      t3: 'human',
      t4: 'ai',
    });
    expect(snapshot.controlledTeams.map((team) => team.teamId)).toEqual(['t1', 't2', 't3']);
    expect(deriveFranchiseType(config, ['t1', 't2', 't3'], teams)).toBe('couch-coop');
  });

  test('one seat owning multiple but not all teams derives custom, not couch-coop', () => {
    const teams = makeTeams(4);
    const config = makeConfig({
      mode: 'multiplayer',
      seats: [{ id: 's1', name: 'GM One' }],
      playerAssignments: {
        t1: 's1',
        t2: 's1',
        t3: 'cpu',
        t4: 'cpu',
      },
    });

    const snapshot = buildTeamControlSnapshot(config, teams);

    expect(snapshot.controlledTeams.map((team) => team.teamId)).toEqual(['t1', 't2']);
    expect(snapshot.franchiseType).toBe('custom');
    expect(deriveFranchiseType(config, ['t1', 't2'], teams)).toBe('custom');
  });

  test('empty player assignments preserve selectedTeams behavior', () => {
    const teams = makeTeams(3);
    const soloConfig = makeConfig({
      selectedTeams: ['t1'],
      playerAssignments: {},
    });
    const allHumanConfig = makeConfig({
      selectedTeams: ['t1', 't2', 't3'],
      playerAssignments: {},
    });

    const soloSnapshot = buildTeamControlSnapshot(soloConfig, teams);

    expect(soloSnapshot.teamControl).toEqual({
      t1: 'human',
      t2: 'ai',
      t3: 'ai',
    });
    expect(soloSnapshot.franchiseType).toBe('solo');
    expect(deriveFranchiseType(soloConfig, ['t1'], teams)).toBe('solo');
    expect(deriveFranchiseType(allHumanConfig, ['t1', 't2', 't3'], teams)).toBe('couch-coop');
  });

  test('cpu and unmapped teams resolve to ai when seat data exists', () => {
    const teams = makeTeams(4);
    const config = makeConfig({
      selectedTeams: ['t1', 't2', 't3', 't4'],
      seats: [{ id: 's1', name: 'GM One' }],
      playerAssignments: {
        t1: 's1',
        t2: 'cpu',
      },
    });

    const snapshot = buildTeamControlSnapshot(config, teams);

    expect(snapshot.teamControl).toEqual({
      t1: 'human',
      t2: 'ai',
      t3: 'ai',
      t4: 'ai',
    });
    expect(snapshot.controlledTeams.map((team) => team.teamId)).toEqual(['t1']);
  });
});
