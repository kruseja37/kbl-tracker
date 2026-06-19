import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type {
  FranchiseRaceCandidateScore,
  FranchiseWarAwardCategory,
} from '../franchiseAwardsEngine';
import {
  L12_GG_DEFENSIVE_FAME_SHARE,
  raceStandingsSeam,
  recomputeFranchiseL12StandingsForCompletedGame,
  type FranchiseL12TrueValueScope,
} from '../franchiseRaceStandingsCompute';
import { setFranchisePhase2L12EnabledForTests } from '../franchisePhase2Flags';
import type { FranchiseFameRecordRow } from '../franchiseFameRecordsStorage';
import type { FranchiseTrueValueRow } from '../franchiseTrueValueStorage';
import type { FranchiseTrueValueSnapshotRow } from '../franchiseTrueValueSnapshotsStorage';
import type { PersistedGameState } from '../gameStorage';

const gameState = {
  id: 'current',
  gameId: 'l12-game-1',
  savedAt: 1,
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

function trueValueScope(rows: Array<Pick<FranchiseTrueValueRow, 'playerId' | 'valueDelta' | 'trueValue'>>): FranchiseL12TrueValueScope {
  return {
    franchiseId: 'franchise-l12',
    seasonId: 'season-l12',
    statsScopeId: 'stats-l12',
    seasonNumber: 1,
    rows: rows as FranchiseTrueValueRow[],
  };
}

function candidateRows(
  candidates: Array<{ playerId: string; score: number }>,
): FranchiseRaceCandidateScore[] {
  const winnerScore = candidates[0]?.score ?? 0;
  return candidates.map((candidate) => ({
    ...candidate,
    marginToWinner: candidate.score - winnerScore,
  }));
}

function candidateRowsByCategory(
  rows: Partial<Record<FranchiseWarAwardCategory, FranchiseRaceCandidateScore[]>>,
): Partial<Record<FranchiseWarAwardCategory, FranchiseRaceCandidateScore[]>> {
  return rows;
}

function fameRow(playerId: string, overrides: Partial<FranchiseFameRecordRow> = {}): FranchiseFameRecordRow {
  return {
    franchiseId: 'franchise-l12',
    seasonId: 'season-l12',
    statsScopeId: 'stats-l12',
    playerId,
    heat: 0,
    reachFloor: 0,
    wasNegative: false,
    channelTotal: 0,
    channelByChannel: {
      wpa_spine: 0,
      defensive: 0,
      role_player: 0,
      iconic_event: 0,
      status: 0,
    },
    defensiveFame: 0,
    rolePlayerFame: 0,
    updatedAtCheckpoint: 'l12-game-1',
    ...overrides,
  };
}

function snapshotRow(
  playerId: string,
  checkpoint: string | number,
  trueValue: number,
): FranchiseTrueValueSnapshotRow {
  return {
    franchiseId: 'franchise-l12',
    seasonId: 'season-l12',
    statsScopeId: 'stats-l12',
    playerId,
    checkpoint,
    trueValue,
    valueDelta: 0,
    warPercentile: 0,
    computedAt: 'static-snapshot-time',
  };
}

describe('recomputeFranchiseL12StandingsForCompletedGame', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2L12EnabledForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2L12EnabledForTests(null);
  });

  test('flag off returns dark-noop before any seam loader runs', async () => {
    setFranchisePhase2L12EnabledForTests(false);
    const previewSpy = vi.spyOn(raceStandingsSeam, 'computeRaceCandidateRows');
    const fameSpy = vi.spyOn(raceStandingsSeam, 'getFameRows');
    const snapshotSpy = vi.spyOn(raceStandingsSeam, 'getSnapshotRows');

    const result = await recomputeFranchiseL12StandingsForCompletedGame(
      gameState,
      trueValueScope([]),
    );

    expect(result).toEqual({
      status: 'dark-noop',
      reason: 'Phase-2 L12 disabled.',
    });
    expect(previewSpy).not.toHaveBeenCalled();
    expect(fameSpy).not.toHaveBeenCalled();
    expect(snapshotSpy).not.toHaveBeenCalled();
  });

  test('flag on ranks merit preview rows, applies GG defensive-fame blend, and defaults missing fame to rank zero', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    vi.spyOn(raceStandingsSeam, 'computeRaceCandidateRows').mockResolvedValue(candidateRowsByCategory({
      MVP: candidateRows([
        { playerId: 'mvp-leader', score: 9 },
        { playerId: 'mvp-no-fame', score: 6 },
        { playerId: 'mvp-third', score: 3 },
      ]),
      GOLD_GLOVE: candidateRows([
        { playerId: 'gg-defender', score: 2 },
      ]),
      BENCH_PLAYER: candidateRows([
        { playerId: 'bench-reserve-top', score: 1.8 },
        { playerId: 'bench-reserve-next', score: 1.2 },
      ]),
      BOOGER_GLOVE: candidateRows([
        { playerId: 'booger-worst-fielder', score: 1.5 },
        { playerId: 'booger-next-worst', score: 0.4 },
      ]),
    }));
    vi.spyOn(raceStandingsSeam, 'getFameRows').mockResolvedValue([
      fameRow('mvp-leader', { heat: 8, reachFloor: 1 }),
      fameRow('mvp-third', { heat: 4, reachFloor: 0 }),
      fameRow('gg-defender', { defensiveFame: 5 }),
    ]);
    vi.spyOn(raceStandingsSeam, 'getSnapshotRows').mockResolvedValue([]);

    const result = await recomputeFranchiseL12StandingsForCompletedGame(
      gameState,
      trueValueScope([]),
    );

    expect(result.status).toBe('computed');
    const standings = result.standings;
    expect(standings?.meritRaces.MVP).toHaveLength(3);
    expect(standings?.meritRaces.MVP?.map((row) => row.rank)).toEqual([1, 2, 3]);
    expect(standings?.meritRaces.MVP?.find((row) => row.playerId === 'mvp-no-fame')?.fameRank)
      .toBe(0);
    expect(standings?.meritRaces.GOLD_GLOVE?.[0]).toMatchObject({
      playerId: 'gg-defender',
      meritScore: 2 + (L12_GG_DEFENSIVE_FAME_SHARE * 5),
    });
    expect(standings?.meritRaces.BENCH_PLAYER?.map((row) => [row.rank, row.playerId])).toEqual([
      [1, 'bench-reserve-top'],
      [2, 'bench-reserve-next'],
    ]);
    expect(standings?.meritRaces.BOOGER_GLOVE?.map((row) => [row.rank, row.playerId])).toEqual([
      [1, 'booger-worst-fielder'],
      [2, 'booger-next-worst'],
    ]);
  });

  test('flag on computes TV-family KK, Bust, and Comeback from true-value rows and snapshots', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    vi.spyOn(raceStandingsSeam, 'computeRaceCandidateRows').mockResolvedValue({});
    vi.spyOn(raceStandingsSeam, 'getFameRows').mockResolvedValue([]);
    vi.spyOn(raceStandingsSeam, 'getSnapshotRows').mockResolvedValue([
      snapshotRow('comeback-leader', 'early', 40),
      snapshotRow('comeback-leader', 'mid', 70),
      snapshotRow('kk-leader', 'early', 60),
    ]);

    const result = await recomputeFranchiseL12StandingsForCompletedGame(
      gameState,
      trueValueScope([
        { playerId: 'kk-leader', valueDelta: 20000, trueValue: 65 },
        { playerId: 'bust-leader', valueDelta: -15000, trueValue: 25 },
        { playerId: 'comeback-leader', valueDelta: 1000, trueValue: 80 },
      ]),
    );

    expect(result.status).toBe('computed');
    expect(result.standings?.meritRaces).toEqual({});
    expect(result.standings?.tvFamily.kk[0]).toMatchObject({
      playerId: 'kk-leader',
      score: 20000,
      rank: 1,
    });
    expect(result.standings?.tvFamily.bust[0]).toMatchObject({
      playerId: 'bust-leader',
      score: 15000,
      rank: 1,
    });
    expect(result.standings?.tvFamily.comeback[0]).toMatchObject({
      playerId: 'comeback-leader',
      score: 40,
      rank: 1,
    });
  });

  test('flag on with empty preview returns computed empty merit races without throwing', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    vi.spyOn(raceStandingsSeam, 'computeRaceCandidateRows').mockResolvedValue({});
    vi.spyOn(raceStandingsSeam, 'getFameRows').mockResolvedValue([]);
    vi.spyOn(raceStandingsSeam, 'getSnapshotRows').mockResolvedValue([]);

    const result = await recomputeFranchiseL12StandingsForCompletedGame(
      gameState,
      trueValueScope([]),
    );

    expect(result).toEqual({
      status: 'computed',
      standings: {
        meritRaces: {},
        tvFamily: {
          kk: [],
          bust: [],
          comeback: [],
        },
      },
    });
  });

  test('flag on degrades loader failures to empty computed standings', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    vi.spyOn(raceStandingsSeam, 'computeRaceCandidateRows').mockRejectedValue(new Error('preview unavailable'));
    vi.spyOn(raceStandingsSeam, 'getFameRows').mockRejectedValue(new Error('fame unavailable'));
    vi.spyOn(raceStandingsSeam, 'getSnapshotRows').mockRejectedValue(new Error('snapshots unavailable'));

    await expect(recomputeFranchiseL12StandingsForCompletedGame(
      gameState,
      trueValueScope([]),
    )).resolves.toEqual({
      status: 'computed',
      standings: {
        meritRaces: {},
        tvFamily: {
          kk: [],
          bust: [],
          comeback: [],
        },
      },
    });
  });
});
