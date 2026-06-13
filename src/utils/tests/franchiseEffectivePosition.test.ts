import { describe, expect, test } from 'vitest';
import type { GameHeader } from '../eventLog';
import {
  FRANCHISE_TRUE_VALUE_RESERVE_POOL,
  RESERVE_STARTS_SHARE_THRESHOLD,
  resolveFranchiseEffectivePositionsFromHeaders,
} from '../franchiseEffectivePosition';

function header(
  gameId: string,
  date: number,
  homeLineup: GameHeader['startingLineups']['home'] = [],
): GameHeader {
  return {
    gameId,
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    franchiseId: 'franchise-1',
    date,
    awayTeamId: `away-${gameId}`,
    awayTeamName: `Away ${gameId}`,
    homeTeamId: 'team-1',
    homeTeamName: 'Home Team',
    startingLineups: {
      away: [],
      home: homeLineup,
    },
    finalScore: { away: 0, home: 1 },
    finalInning: 9,
    isComplete: true,
    aggregated: true,
    aggregatedAt: date + 1,
    aggregationError: null,
    eventCount: 1,
    checksum: gameId,
  };
}

function starter(playerId: string, position: string, battingOrder = 1): GameHeader['startingLineups']['home'][number] {
  return {
    playerId,
    playerName: playerId,
    position,
    battingOrder,
  };
}

describe('franchise effective position resolver', () => {
  test('replays starts in date/game order so an outright SS lead holds a later 3-3 tie by incumbency', () => {
    const report = resolveFranchiseEffectivePositionsFromHeaders({
      players: [{
        playerId: 'path-dependent',
        profilePosition: '2B',
        currentTeamId: 'team-1',
      }],
      headers: [
        header('g6', 6, [starter('path-dependent', '3B')]),
        header('g2', 2, [starter('path-dependent', 'SS')]),
        header('g4', 4, [starter('path-dependent', '3B')]),
        header('g1', 1, [starter('path-dependent', 'SS')]),
        header('g5', 5, [starter('path-dependent', '3B')]),
        header('g3', 3, [starter('path-dependent', 'SS')]),
      ],
    });

    expect(report.orderedGameIds).toEqual(['g1', 'g2', 'g3', 'g4', 'g5', 'g6']);
    expect(report.playerPositions['path-dependent']).toMatchObject({
      valuePosition: 'SS',
      effectivePosition: 'SS',
      starts: 6,
      currentTeamStarts: 6,
      teamCompletedGames: 6,
      isReserve: false,
    });
  });

  test('counts starts only; bench or defensive-sub appearance data does not alter plurality', () => {
    const report = resolveFranchiseEffectivePositionsFromHeaders({
      players: [{
        playerId: 'bench-sub',
        profilePosition: '2B',
        currentTeamId: 'team-1',
      }],
      headers: [
        {
          ...header('sub-game', 1, [starter('other-player', 'SS')]),
          benchRosters: {
            away: [],
            home: [{ playerId: 'bench-sub', playerName: 'Bench Sub', positions: ['SS', '3B'] }],
          },
        },
      ],
    });

    expect(report.playerPositions['bench-sub']).toMatchObject({
      valuePosition: '2B',
      starts: 0,
      currentTeamStarts: 0,
      teamCompletedGames: 1,
      startsShare: 0,
      isReserve: true,
      poolPosition: FRANCHISE_TRUE_VALUE_RESERVE_POOL,
    });
  });

  test('anchors zero-start Two Way (IF) holders to 2B for bat-side True Value', () => {
    const report = resolveFranchiseEffectivePositionsFromHeaders({
      players: [{
        playerId: 'two-way-if',
        profilePosition: 'SP/RP',
        currentTeamId: 'team-1',
        trait1: 'Two Way (IF)',
      }],
      headers: [],
    });

    expect(report.playerPositions['two-way-if']).toMatchObject({
      valuationMode: 'two-way-composite',
      valuePosition: '2B',
      effectivePosition: '2B',
      twoWayTrait: 'Two Way (IF)',
      twoWayBatPosition: '2B',
      twoWayArmPosition: 'SP/RP',
      isReserve: false,
      startsShare: null,
    });
  });

  test('uses a 0.40 completed-team-game starts share as the Reserve cutoff', () => {
    const lowShare = resolveFranchiseEffectivePositionsFromHeaders({
      players: [{
        playerId: 'reserve',
        profilePosition: 'SS',
        currentTeamId: 'team-1',
      }],
      headers: [
        header('r1', 1, [starter('reserve', 'SS')]),
        header('r2', 2),
        header('r3', 3),
        header('r4', 4),
        header('r5', 5),
      ],
    });
    const thresholdShare = resolveFranchiseEffectivePositionsFromHeaders({
      players: [{
        playerId: 'threshold',
        profilePosition: 'SS',
        currentTeamId: 'team-1',
      }],
      headers: [
        header('t1', 1, [starter('threshold', 'SS')]),
        header('t2', 2, [starter('threshold', 'SS')]),
        header('t3', 3),
        header('t4', 4),
        header('t5', 5),
      ],
    });

    expect(RESERVE_STARTS_SHARE_THRESHOLD).toBe(0.4);
    expect(lowShare.playerPositions.reserve).toMatchObject({
      startsShare: 0.2,
      valuationMode: 'reserve',
      poolPosition: FRANCHISE_TRUE_VALUE_RESERVE_POOL,
    });
    expect(thresholdShare.playerPositions.threshold).toMatchObject({
      startsShare: 0.4,
      valuationMode: 'single-position',
      poolPosition: 'SS',
    });
  });

  test('excludes emergency cross-domain lineup cameos from effective-position changes', () => {
    const report = resolveFranchiseEffectivePositionsFromHeaders({
      players: [
        { playerId: 'pitcher-cameo', profilePosition: 'SP/RP', currentTeamId: 'team-1' },
        { playerId: 'hitter-cameo', profilePosition: 'CF', currentTeamId: 'team-1' },
      ],
      headers: [
        header('cameo-1', 1, [
          starter('pitcher-cameo', 'RF', 1),
          starter('hitter-cameo', 'P', 2),
        ]),
      ],
    });

    expect(report.playerPositions['pitcher-cameo']).toMatchObject({
      valuePosition: 'SP/RP',
      starts: 0,
      valuationMode: 'single-position',
    });
    expect(report.playerPositions['hitter-cameo']).toMatchObject({
      valuePosition: 'CF',
      starts: 0,
      valuationMode: 'reserve',
    });
  });
});
