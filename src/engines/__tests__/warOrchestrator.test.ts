import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { ParkFactors } from '../../types/war';
import type {
  PlayerSeasonBatting,
  PlayerSeasonPitching,
} from '../../utils/seasonStorage';

const mocks = vi.hoisted(() => ({
  getSeasonBattingStats: vi.fn(),
  getSeasonPitchingStats: vi.fn(),
  getAllFieldingStats: vi.fn(),
  getSeasonMetadata: vi.fn(),
  updateBattingStats: vi.fn(),
  updatePitchingStats: vi.fn(),
  getFieldingEventsForScope: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
}));

vi.mock('../../utils/seasonStorage', () => ({
  getSeasonBattingStats: mocks.getSeasonBattingStats,
  getSeasonPitchingStats: mocks.getSeasonPitchingStats,
  getAllFieldingStats: mocks.getAllFieldingStats,
  getSeasonMetadata: mocks.getSeasonMetadata,
  updateBattingStats: mocks.updateBattingStats,
  updatePitchingStats: mocks.updatePitchingStats,
}));

vi.mock('../../utils/eventLog', () => ({
  getFieldingEventsForScope: mocks.getFieldingEventsForScope,
}));

vi.mock('../../utils/franchisePlayerStorage', () => ({
  getAllFranchiseTeams: mocks.getAllFranchiseTeams,
}));

import { calculateAndPersistSeasonWAR } from '../../src_figma/app/engines/warOrchestrator';

function createSeedParkFactors(overrides: Partial<ParkFactors> = {}): ParkFactors {
  return {
    stadiumId: 'seed-park',
    stadiumName: 'Seed Park',
    overall: 1,
    runs: 1,
    homeRuns: 1,
    hits: 1,
    doubles: 1,
    triples: 1,
    strikeouts: 1,
    walks: 1,
    leftHandedHR: 1,
    rightHandedHR: 1,
    leftHandedAVG: 1,
    rightHandedAVG: 1,
    gamesIncluded: 0,
    lastUpdated: 'seed',
    confidence: 'LOW',
    source: 'SEED',
    ...overrides,
  };
}

function hitterFriendlySeedPark(): ParkFactors {
  return createSeedParkFactors({
    overall: 1.2,
    runs: 1.2,
    homeRuns: 1.2,
    hits: 1.2,
    leftHandedHR: 1.2,
    rightHandedHR: 1.2,
    leftHandedAVG: 1.2,
    rightHandedAVG: 1.2,
  });
}

function createBattingRow(): PlayerSeasonBatting {
  return {
    seasonId: 'season-1',
    playerId: 'batter-1',
    playerName: 'Batter One',
    teamId: 'team-a',
    games: 25,
    pa: 200,
    ab: 175,
    hits: 60,
    singles: 38,
    doubles: 12,
    triples: 2,
    homeRuns: 8,
    rbi: 32,
    runs: 35,
    walks: 20,
    strikeouts: 34,
    hitByPitch: 3,
    sacFlies: 2,
    sacBunts: 0,
    stolenBases: 4,
    caughtStealing: 1,
    gidp: 3,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    lastUpdated: 1,
  };
}

function createPitchingRow(): PlayerSeasonPitching {
  return {
    seasonId: 'season-1',
    playerId: 'pitcher-1',
    playerName: 'Pitcher One',
    teamId: 'team-a',
    games: 16,
    gamesStarted: 16,
    outsRecorded: 300,
    hitsAllowed: 80,
    runsAllowed: 32,
    earnedRuns: 30,
    walksAllowed: 24,
    strikeouts: 95,
    homeRunsAllowed: 8,
    hitBatters: 3,
    wildPitches: 0,
    wins: 8,
    losses: 3,
    saves: 0,
    holds: 0,
    blownSaves: 0,
    qualityStarts: 10,
    completeGames: 1,
    shutouts: 0,
    noHitters: 0,
    perfectGames: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    lastUpdated: 1,
  };
}

async function runWar(parkFactors?: ParkFactors | null) {
  await calculateAndPersistSeasonWAR(
    'season-1',
    50,
    ['batter-1', 'pitcher-1'],
    new Map([
      ['batter-1', 'SS'],
      ['pitcher-1', 'SP'],
    ]),
    parkFactors === undefined
      ? undefined
      : {
          franchiseId: 'franchise-1',
          homeTeamId: 'team-a',
          stadiumName: parkFactors?.stadiumName ?? null,
          parkFactors,
        },
  );

  return {
    batting: mocks.updateBattingStats.mock.calls.at(-1)?.[0] as PlayerSeasonBatting,
    pitching: mocks.updatePitchingStats.mock.calls.at(-1)?.[0] as PlayerSeasonPitching,
  };
}

describe('warOrchestrator seed park factors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSeasonBattingStats.mockImplementation(async () => [createBattingRow()]);
    mocks.getSeasonPitchingStats.mockImplementation(async () => [createPitchingRow()]);
    mocks.getAllFieldingStats.mockResolvedValue([]);
    mocks.getSeasonMetadata.mockResolvedValue({
      seasonId: 'season-1',
      gamesPlayed: 25,
      gamesPerTeam: 50,
    });
    mocks.getFieldingEventsForScope.mockResolvedValue([]);
    mocks.updateBattingStats.mockResolvedValue(undefined);
    mocks.updatePitchingStats.mockResolvedValue(undefined);
    mocks.getAllFranchiseTeams.mockResolvedValue([
      {
        id: 'team-a',
        name: 'Team A',
        abbreviation: 'TMA',
        location: 'A City',
        nickname: 'Aces',
        colors: { primary: '#111111', secondary: '#eeeeee' },
        stadium: 'Seed Park',
        parkFactors: hitterFriendlySeedPark(),
        leagueIds: ['league-1'],
      },
    ]);
  });

  test('keeps park-less WAR byte-identical and does not side-load franchise stadiums', async () => {
    const baseline = await runWar(undefined);

    vi.clearAllMocks();
    mocks.getSeasonBattingStats.mockImplementation(async () => [createBattingRow()]);
    mocks.getSeasonPitchingStats.mockImplementation(async () => [createPitchingRow()]);
    mocks.getAllFieldingStats.mockResolvedValue([]);
    mocks.getSeasonMetadata.mockResolvedValue({ seasonId: 'season-1', gamesPlayed: 25, gamesPerTeam: 50 });
    mocks.getFieldingEventsForScope.mockResolvedValue([]);
    mocks.updateBattingStats.mockResolvedValue(undefined);
    mocks.updatePitchingStats.mockResolvedValue(undefined);

    const noSeedContext = await runWar(null);

    expect(noSeedContext.batting.bwar).toBe(baseline.batting.bwar);
    expect(noSeedContext.pitching.pwar).toBe(baseline.pitching.pwar);
    expect(mocks.getAllFranchiseTeams).not.toHaveBeenCalled();
  });

  test('shifts bWAR down and pWAR up when seed park factors are active', async () => {
    const baseline = await runWar(undefined);
    vi.clearAllMocks();
    mocks.getSeasonBattingStats.mockImplementation(async () => [createBattingRow()]);
    mocks.getSeasonPitchingStats.mockImplementation(async () => [createPitchingRow()]);
    mocks.getAllFieldingStats.mockResolvedValue([]);
    mocks.getSeasonMetadata.mockResolvedValue({ seasonId: 'season-1', gamesPlayed: 25, gamesPerTeam: 50 });
    mocks.getFieldingEventsForScope.mockResolvedValue([]);
    mocks.updateBattingStats.mockResolvedValue(undefined);
    mocks.updatePitchingStats.mockResolvedValue(undefined);
    mocks.getAllFranchiseTeams.mockResolvedValue([
      {
        id: 'team-a',
        name: 'Team A',
        abbreviation: 'TMA',
        location: 'A City',
        nickname: 'Aces',
        colors: { primary: '#111111', secondary: '#eeeeee' },
        stadium: 'Seed Park',
        parkFactors: hitterFriendlySeedPark(),
        leagueIds: ['league-1'],
      },
    ]);

    const adjusted = await runWar(hitterFriendlySeedPark());

    expect(adjusted.batting.bwar).toBeLessThan(baseline.batting.bwar ?? 0);
    expect(adjusted.pitching.pwar).toBeGreaterThan(baseline.pitching.pwar ?? 0);
  });

  test('keeps seed park factors inactive before the 40 percent season gate', async () => {
    const baseline = await runWar(undefined);
    vi.clearAllMocks();
    mocks.getSeasonBattingStats.mockImplementation(async () => [createBattingRow()]);
    mocks.getSeasonPitchingStats.mockImplementation(async () => [createPitchingRow()]);
    mocks.getAllFieldingStats.mockResolvedValue([]);
    mocks.getSeasonMetadata.mockResolvedValue({ seasonId: 'season-1', gamesPlayed: 19, gamesPerTeam: 50 });
    mocks.getFieldingEventsForScope.mockResolvedValue([]);
    mocks.updateBattingStats.mockResolvedValue(undefined);
    mocks.updatePitchingStats.mockResolvedValue(undefined);
    mocks.getAllFranchiseTeams.mockResolvedValue([]);

    const inactive = await runWar(hitterFriendlySeedPark());

    expect(inactive.batting.bwar).toBe(baseline.batting.bwar);
    expect(inactive.pitching.pwar).toBe(baseline.pitching.pwar);
    expect(mocks.getAllFranchiseTeams).not.toHaveBeenCalled();
  });
});
