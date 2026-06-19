import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  allStarRosterSeam,
  persistFranchiseAllStarRosterForCompletedGame,
  type AllStarRosterScope,
} from '../franchiseAllStarRosterCompute';
import { setFranchisePhase2L12EnabledForTests } from '../franchisePhase2Flags';
import {
  franchiseAllStarRosterId,
  type FranchiseAllStarRosterRow,
  type FranchiseAllStarSelection,
} from '../franchiseAllStarRostersStorage';
import {
  computeFranchiseAllStarRoster,
  type AllStarCandidate,
} from '../../engines/franchiseAllStarSelector';
import type { PersistedGameState } from '../gameStorage';

const gameState = {
  id: 'current',
  gameId: 'all-star-game-1',
  savedAt: 1720000000000,
  inning: 9,
  halfInning: 'BOTTOM',
  outs: 3,
  homeScore: 5,
  awayScore: 2,
  bases: { first: null, second: null, third: null },
  currentBatterIndex: 0,
  atBatCount: 36,
  awayTeamId: 'team-away',
  homeTeamId: 'team-home',
  awayTeamName: 'Away',
  homeTeamName: 'Home',
  seasonNumber: 1,
  playerStats: {},
  pitcherGameStats: [],
} as unknown as PersistedGameState;

const rosterScope = {
  franchiseId: 'franchise-asg',
  seasonId: 'season-asg',
  statsScopeId: 'stats-asg',
};

const scope: AllStarRosterScope = {
  ...rosterScope,
  seasonNumber: 1,
};

function candidate(overrides: Partial<AllStarCandidate> & Pick<AllStarCandidate, 'playerId'>): AllStarCandidate {
  return {
    playerId: overrides.playerId,
    teamId: `team-${overrides.playerId}`,
    rawPosition: 'C',
    hittingMerit: 1,
    battingWar: 1,
    startingMerit: null,
    reliefMerit: null,
    gamesStarted: 0,
    qualifiedAsHitter: true,
    qualifiedAsPitcher: false,
    fameHeat: 0,
    fameReachFloor: 0,
    ...overrides,
  };
}

function candidates(): AllStarCandidate[] {
  return [
    candidate({
      playerId: 'catcher-fame',
      rawPosition: 'C',
      hittingMerit: 3,
      battingWar: 3,
      fameHeat: 12,
      fameReachFloor: 1,
    }),
    candidate({
      playerId: 'shortstop-merit',
      rawPosition: 'SS',
      hittingMerit: 5,
      battingWar: 5,
      fameHeat: 1,
      fameReachFloor: 0,
    }),
    candidate({
      playerId: 'starter-ace',
      rawPosition: 'SP',
      hittingMerit: null,
      battingWar: null,
      startingMerit: 4,
      reliefMerit: null,
      gamesStarted: 8,
      qualifiedAsHitter: false,
      qualifiedAsPitcher: true,
    }),
  ];
}

function expectedSelections(allStarCandidates: AllStarCandidate[]): FranchiseAllStarSelection[] {
  return computeFranchiseAllStarRoster({ candidates: allStarCandidates }).map((selection) => ({
    playerId: selection.playerId,
    teamId: selection.teamId,
    position: selection.position,
    role: selection.role,
    selectionScore: selection.selectionScore,
  }));
}

function rosterRow(overrides: Partial<FranchiseAllStarRosterRow> = {}): FranchiseAllStarRosterRow {
  return {
    ...rosterScope,
    id: franchiseAllStarRosterId(rosterScope),
    seasonNumber: scope.seasonNumber,
    selections: [],
    locked: false,
    lockedAtGameNumber: null,
    createdAt: 111,
    updatedAt: 222,
    ...overrides,
  };
}

function seasonMetadata(totalGames: number) {
  return { totalGames } as Awaited<ReturnType<typeof allStarRosterSeam.getSeasonMetadata>>;
}

function mockActiveSeam(params: {
  existing?: FranchiseAllStarRosterRow;
  candidates?: AllStarCandidate[];
  gameNumber?: number | null;
  totalGames?: number | null;
}) {
  const allStarCandidates = params.candidates ?? candidates();
  const getRoster = vi.spyOn(allStarRosterSeam, 'getRoster').mockResolvedValue(params.existing);
  const buildCandidates = vi.spyOn(allStarRosterSeam, 'buildCandidates').mockResolvedValue(allStarCandidates);
  const putRoster = vi.spyOn(allStarRosterSeam, 'putRoster').mockResolvedValue(undefined);
  const resolveGameNumber = vi.spyOn(allStarRosterSeam, 'resolveGameNumber')
    .mockResolvedValue(params.gameNumber ?? 30);
  const getSeasonMetadata = vi.spyOn(allStarRosterSeam, 'getSeasonMetadata')
    .mockResolvedValue(params.totalGames == null ? null : seasonMetadata(params.totalGames));

  return {
    allStarCandidates,
    getRoster,
    buildCandidates,
    putRoster,
    resolveGameNumber,
    getSeasonMetadata,
  };
}

describe('persistFranchiseAllStarRosterForCompletedGame', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2L12EnabledForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2L12EnabledForTests(null);
  });

  test('flag off returns dark-noop before any seam work', async () => {
    setFranchisePhase2L12EnabledForTests(false);
    const getRoster = vi.spyOn(allStarRosterSeam, 'getRoster');
    const buildCandidates = vi.spyOn(allStarRosterSeam, 'buildCandidates');
    const putRoster = vi.spyOn(allStarRosterSeam, 'putRoster');

    const result = await persistFranchiseAllStarRosterForCompletedGame(gameState, scope);

    expect(result).toEqual({
      status: 'dark-noop',
      reason: 'Phase-2 L12 disabled.',
    });
    expect(getRoster).not.toHaveBeenCalled();
    expect(buildCandidates).not.toHaveBeenCalled();
    expect(putRoster).not.toHaveBeenCalled();
  });

  test('flag on freezes when an existing roster is already locked', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const { buildCandidates, putRoster } = mockActiveSeam({
      existing: rosterRow({ locked: true, lockedAtGameNumber: 60 }),
    });

    const result = await persistFranchiseAllStarRosterForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'locked-noop' });
    expect(buildCandidates).not.toHaveBeenCalled();
    expect(putRoster).not.toHaveBeenCalled();
  });

  test('flag on persists an unlocked roster below the 60% lock anchor', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const { allStarCandidates, putRoster } = mockActiveSeam({
      gameNumber: 30,
      totalGames: 100,
    });

    const result = await persistFranchiseAllStarRosterForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'persisted' });
    expect(putRoster).toHaveBeenCalledTimes(1);
    const row = putRoster.mock.calls[0][0];
    expect(row).toMatchObject({
      ...rosterScope,
      id: franchiseAllStarRosterId(rosterScope),
      seasonNumber: scope.seasonNumber,
      locked: false,
      lockedAtGameNumber: null,
      createdAt: gameState.savedAt,
      updatedAt: gameState.savedAt,
    });
    expect(row.selections).toEqual(expectedSelections(allStarCandidates));
  });

  test('flag on persists and locks at or past the 60% lock anchor', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const { putRoster } = mockActiveSeam({
      gameNumber: 60,
      totalGames: 100,
    });

    const result = await persistFranchiseAllStarRosterForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'persisted-locked' });
    expect(putRoster).toHaveBeenCalledTimes(1);
    expect(putRoster.mock.calls[0][0]).toMatchObject({
      locked: true,
      lockedAtGameNumber: 60,
    });
  });

  test('preserves createdAt when rewriting an existing unlocked roster', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const oldCreatedAt = 12345;
    const { putRoster } = mockActiveSeam({
      existing: rosterRow({ createdAt: oldCreatedAt, updatedAt: oldCreatedAt }),
      gameNumber: 30,
      totalGames: 100,
    });

    const result = await persistFranchiseAllStarRosterForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'persisted' });
    expect(putRoster.mock.calls[0][0]).toMatchObject({
      createdAt: oldCreatedAt,
      updatedAt: gameState.savedAt,
    });
  });

  test.each([
    { name: 'unresolved game number', gameNumber: null, totalGames: 100 },
    { name: 'missing season metadata', gameNumber: 70, totalGames: null },
  ])('$name still persists without locking', async ({ gameNumber, totalGames }) => {
    setFranchisePhase2L12EnabledForTests(true);
    const { putRoster } = mockActiveSeam({ gameNumber, totalGames });

    const result = await persistFranchiseAllStarRosterForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'persisted' });
    expect(putRoster).toHaveBeenCalledTimes(1);
    expect(putRoster.mock.calls[0][0]).toMatchObject({
      locked: false,
      lockedAtGameNumber: null,
    });
  });
});
