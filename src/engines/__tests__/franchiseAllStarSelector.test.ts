import { describe, expect, test } from 'vitest';

import {
  computeFranchiseAllStarRoster,
  V1_ALL_STAR_ROSTER_CONFIG,
  type AllStarCandidate,
  type AllStarRosterConfig,
} from '../franchiseAllStarSelector';

type CandidateOverrides = Partial<Omit<AllStarCandidate, 'playerId' | 'teamId'>> & {
  teamId?: string;
};

function candidate(playerId: string, overrides: CandidateOverrides = {}): AllStarCandidate {
  const { teamId = `team-${playerId}`, ...candidateOverrides } = overrides;

  return {
    playerId,
    teamId,
    rawPosition: 'C',
    hittingMerit: null,
    battingWar: null,
    startingMerit: null,
    reliefMerit: null,
    gamesStarted: 0,
    qualifiedAsHitter: false,
    qualifiedAsPitcher: false,
    fameHeat: 0,
    fameReachFloor: 0,
    ...candidateOverrides,
  };
}

function hitter(
  playerId: string,
  rawPosition: string,
  hittingMerit: number,
  fameHeat = 0,
  overrides: CandidateOverrides = {},
): AllStarCandidate {
  return candidate(playerId, {
    rawPosition,
    hittingMerit,
    battingWar: hittingMerit,
    qualifiedAsHitter: true,
    fameHeat,
    ...overrides,
  });
}

function pitcher(
  playerId: string,
  rawPosition: string,
  gamesStarted: number,
  startingMerit: number | null,
  reliefMerit: number | null,
  overrides: CandidateOverrides = {},
): AllStarCandidate {
  return candidate(playerId, {
    rawPosition,
    gamesStarted,
    startingMerit,
    reliefMerit,
    qualifiedAsPitcher: true,
    ...overrides,
  });
}

function config(overrides: Partial<AllStarRosterConfig> = {}): AllStarRosterConfig {
  return {
    ...V1_ALL_STAR_ROSTER_CONFIG,
    positionStarters: [],
    positionBackups: [],
    startingPitchers: 0,
    backupStartingPitchers: 0,
    relievers: 0,
    backupRelievers: 0,
    wildcards: 0,
    ...overrides,
  };
}

describe('franchiseAllStarSelector L12-4a pure roster selection', () => {
  test('fame-led starter can snub a higher-WAR teammate at the same position', () => {
    const roster = computeFranchiseAllStarRoster({
      candidates: [
        hitter('famous-low-war', '1B', 1, 40),
        hitter('anonymous-war-star', '1B', 10, -20),
      ],
    });

    expect(roster.find((selection) => selection.position === '1B' && selection.role === 'starter'))
      .toMatchObject({
        playerId: 'famous-low-war',
        position: '1B',
        role: 'starter',
      });
    expect(roster.find((selection) => selection.playerId === 'anonymous-war-star'))
      .toMatchObject({
        position: '1B',
        role: 'reserve',
        selectionScore: 10,
      });
  });

  test('position backups fill family slots by merit and never double-pick starters', () => {
    const roster = computeFranchiseAllStarRoster({
      config: config({
        positionStarters: V1_ALL_STAR_ROSTER_CONFIG.positionStarters,
        positionBackups: V1_ALL_STAR_ROSTER_CONFIG.positionBackups,
      }),
      candidates: [
        hitter('starter-c', 'C', 1, 40),
        hitter('backup-c', 'C', 9, -20),
        hitter('starter-1b', '1B', 1, 40),
        hitter('corner-best', '1B/OF', 20, -20),
        hitter('starter-3b', '3B', 1, 40),
        hitter('corner-second', '3B', 10, -20),
        hitter('starter-2b', '2B', 1, 40),
        hitter('starter-ss', 'SS', 1, 40),
        hitter('middle-best', 'IF', 18, -20),
        hitter('starter-lf', 'LF', 99, 40),
        hitter('starter-cf', 'CF', 35, 40),
        hitter('starter-rf', 'RF', 1, 40),
        hitter('of-best', 'OF', 30, -20),
        hitter('of-second', 'IF/OF', 25, -20),
        hitter('of-third', 'LF', 20, -20),
      ],
    });

    const reserves = roster.filter((selection) => selection.role === 'reserve');

    expect(reserves.map((selection) => [selection.playerId, selection.position])).toEqual([
      ['backup-c', 'C'],
      ['corner-best', '1B'],
      ['middle-best', 'SS'],
      ['of-best', 'CF'],
      ['of-second', 'CF'],
    ]);
    expect(roster.filter((selection) => selection.playerId === 'starter-lf')).toHaveLength(1);
    expect(new Set(roster.map((selection) => selection.playerId)).size).toBe(roster.length);
  });

  test('pitchers use gamesStarted pools, SP merit, RP merit, and exclude null-relief relievers', () => {
    const roster = computeFranchiseAllStarRoster({
      config: config({
        startingPitchers: 4,
        backupStartingPitchers: 1,
        relievers: 5,
        backupRelievers: 2,
      }),
      candidates: [
        pitcher('starter-labeled-rp', 'RP', 3, 10, 99),
        pitcher('sp-a', 'SP', 1, 9, null),
        pitcher('sp-b', 'SP', 1, 8, null),
        pitcher('sp-c', 'SP', 1, 7, null),
        pitcher('sp-d', 'SP', 1, 6, null),
        pitcher('sp-e', 'SP', 1, 5, null),
        pitcher('sp-null', 'SP', 1, null, null),
        pitcher('reliever-labeled-sp', 'SP', 0, 99, 11),
        pitcher('rp-a', 'RP', 0, null, 10),
        pitcher('rp-b', 'RP', 0, null, 9),
        pitcher('rp-c', 'RP', 0, null, 8),
        pitcher('rp-d', 'RP', 0, null, 7),
        pitcher('rp-e', 'RP', 0, null, 6),
        pitcher('rp-f', 'RP', 0, null, 5),
        pitcher('rp-null', 'RP', 0, null, null),
      ],
    });

    const spSelections = roster.filter((selection) => selection.position === 'SP');
    const rpSelections = roster.filter((selection) => selection.position === 'RP');

    expect(spSelections.map((selection) => [selection.playerId, selection.role])).toEqual([
      ['starter-labeled-rp', 'starter'],
      ['sp-a', 'starter'],
      ['sp-b', 'starter'],
      ['sp-c', 'starter'],
      ['sp-d', 'reserve'],
    ]);
    expect(rpSelections.map((selection) => [selection.playerId, selection.role])).toEqual([
      ['reliever-labeled-sp', 'starter'],
      ['rp-a', 'starter'],
      ['rp-b', 'starter'],
      ['rp-c', 'starter'],
      ['rp-d', 'starter'],
      ['rp-e', 'reserve'],
      ['rp-f', 'reserve'],
    ]);
    expect(rpSelections.some((selection) => selection.playerId === 'starter-labeled-rp')).toBe(false);
    expect(spSelections.some((selection) => selection.playerId === 'reliever-labeled-sp')).toBe(false);
    expect(rpSelections.some((selection) => selection.playerId === 'rp-null')).toBe(false);
  });

  test('two-way candidates keep only the stronger side and never enter both pools', () => {
    const roster = computeFranchiseAllStarRoster({
      config: config({
        positionStarters: ['1B'],
        startingPitchers: 2,
      }),
      candidates: [
        candidate('two-way-bat', {
          rawPosition: '1B/SP',
          hittingMerit: 6,
          battingWar: 5,
          startingMerit: 4,
          gamesStarted: 1,
          qualifiedAsHitter: true,
          qualifiedAsPitcher: true,
          fameHeat: 40,
        }),
        candidate('two-way-arm', {
          rawPosition: '1B/SP',
          hittingMerit: 99,
          battingWar: 2,
          startingMerit: 8,
          gamesStarted: 1,
          qualifiedAsHitter: true,
          qualifiedAsPitcher: true,
          fameHeat: 40,
        }),
      ],
    });

    expect(roster.find((selection) => selection.playerId === 'two-way-bat'))
      .toMatchObject({
        position: '1B',
        role: 'starter',
      });
    expect(roster.find((selection) => selection.playerId === 'two-way-arm'))
      .toMatchObject({
        position: 'SP',
        role: 'starter',
        selectionScore: 8,
      });
    expect(roster.filter((selection) => selection.playerId === 'two-way-bat')).toHaveLength(1);
    expect(roster.filter((selection) => selection.playerId === 'two-way-arm')).toHaveLength(1);
  });

  test('wildcard is the highest-fame qualified non-selected player regardless of WAR', () => {
    const roster = computeFranchiseAllStarRoster({
      config: config({
        positionStarters: ['1B'],
        wildcards: 1,
      }),
      candidates: [
        hitter('starter-same-fame-more-war', '1B', 10, 40),
        hitter('wildcard-famous-low-war', '1B', 0, 40),
        hitter('anonymous-war-monster', '1B', 99, -20),
      ],
    });

    expect(roster).toHaveLength(2);
    expect(roster[0]).toMatchObject({
      playerId: 'starter-same-fame-more-war',
      position: '1B',
      role: 'starter',
    });
    expect(roster[1]).toMatchObject({
      playerId: 'wildcard-famous-low-war',
      position: 'WILDCARD',
      role: 'starter',
    });
    expect(roster.some((selection) => selection.playerId === 'anonymous-war-monster')).toBe(false);
    expect(new Set(roster.map((selection) => selection.playerId)).size).toBe(roster.length);
  });

  test('DH-only candidates are hitter-ineligible in the no-DH v1 roster', () => {
    const roster = computeFranchiseAllStarRoster({
      candidates: [
        hitter('dh-only-star', 'DH', 50, 40),
      ],
    });

    expect(roster).toEqual([]);
  });

  test('under-supplied slots are left empty without throwing', () => {
    const run = (): ReturnType<typeof computeFranchiseAllStarRoster> => computeFranchiseAllStarRoster({
      candidates: [
        hitter('only-catcher', 'C', 5, 40),
      ],
    });

    expect(run).not.toThrow();
    const roster = run();

    expect(roster).toEqual([
      {
        playerId: 'only-catcher',
        teamId: 'team-only-catcher',
        position: 'C',
        role: 'starter',
        selectionScore: 1,
      },
    ]);
    expect(roster).toHaveLength(1);
  });

  test('identical input is deterministic and ties resolve by playerId', () => {
    const input = {
      config: config({
        positionStarters: ['C'],
        positionBackups: [{ slot: 'C', eligible: ['C'], count: 1 }],
      }),
      candidates: [
        hitter('b-player', 'C', 5, 0),
        hitter('a-player', 'C', 5, 0),
      ],
    };

    const first = computeFranchiseAllStarRoster(input);
    const second = computeFranchiseAllStarRoster(input);

    expect(second).toEqual(first);
    expect(first.map((selection) => [selection.playerId, selection.role])).toEqual([
      ['a-player', 'starter'],
      ['b-player', 'reserve'],
    ]);
  });
});
