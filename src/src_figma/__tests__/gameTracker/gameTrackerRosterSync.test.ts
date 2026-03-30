import { describe, expect, test } from 'vitest';

import type { Player } from '../../app/components/TeamRoster';
import type { TeamLineupSnapshot } from '../../hooks/useGameState';
import type { Pitcher } from '../../app/components/TeamRoster';
import { reconcileTeamPitchersWithLineupSnapshot, reconcileTeamPlayersWithLineupSnapshot } from '../../app/utils/gameTrackerRosterSync';

function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    name: 'Player',
    playerId: 'player-1',
    position: 'SS',
    battingOrder: 1,
    stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
    battingHand: 'R',
    ...overrides,
  };
}

function createSnapshot(overrides: Partial<TeamLineupSnapshot> = {}): TeamLineupSnapshot {
  return {
    lineup: [
      {
        playerId: 'player-1',
        playerName: 'Starter One',
        position: 'SS',
        battingOrder: 1,
        enteredInning: 1,
        isStarter: true,
      },
    ],
    bench: [
      {
        playerId: 'bench-1',
        playerName: 'Bench One',
        positions: ['IF'],
        isAvailable: true,
      },
    ],
    usedPlayers: [],
    currentPitcher: null,
    ...overrides,
  };
}

function createPitcher(overrides: Partial<Pitcher> = {}): Pitcher {
  return {
    name: 'Pitcher One',
    playerId: 'pitcher-1',
    stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
    throwingHand: 'R',
    isStarter: true,
    isActive: true,
    ...overrides,
  };
}

describe('gameTrackerRosterSync', () => {
  test('updates displayed lineup positions from replayed lineup state', () => {
    const players = [
      createPlayer({ name: 'Starter One', playerId: 'player-1', position: 'SS', battingOrder: 1 }),
    ];

    const nextPlayers = reconcileTeamPlayersWithLineupSnapshot(
      players,
      createSnapshot({
        lineup: [
          {
            playerId: 'player-1',
            playerName: 'Starter One',
            position: '3B',
            battingOrder: 1,
            enteredInning: 1,
            isStarter: true,
          },
        ],
      }),
      'away',
      (entity) => entity.playerId || entity.name,
    );

    expect(nextPlayers[0]).toMatchObject({
      playerId: 'player-1',
      position: '3B',
      battingOrder: 1,
      isOutOfGame: false,
    });
  });

  test('marks removed players out of game and promotes bench replacements into lineup', () => {
    const players = [
      createPlayer({ name: 'Starter One', playerId: 'player-1', position: 'SS', battingOrder: 1 }),
      createPlayer({ name: 'Bench One', playerId: 'bench-1', position: 'IF', battingOrder: undefined }),
    ];

    const nextPlayers = reconcileTeamPlayersWithLineupSnapshot(
      players,
      createSnapshot({
        lineup: [
          {
            playerId: 'bench-1',
            playerName: 'Bench One',
            position: 'SS',
            battingOrder: 1,
            enteredInning: 5,
            enteredFor: 'Starter One',
            isStarter: false,
          },
        ],
        bench: [],
        usedPlayers: ['player-1'],
      }),
      'away',
      (entity) => entity.playerId || entity.name,
    );

    expect(nextPlayers.find((player) => player.playerId === 'bench-1')).toMatchObject({
      position: 'SS',
      battingOrder: 1,
      isOutOfGame: false,
    });
    expect(nextPlayers.find((player) => player.playerId === 'player-1')).toMatchObject({
      battingOrder: undefined,
      isOutOfGame: true,
    });
  });

  test('syncs active and used pitchers from replayed lineup snapshot', () => {
    const pitchers = [
      createPitcher({ name: 'Starter', playerId: 'starter-1', isStarter: true, isActive: true }),
      createPitcher({ name: 'Reliever', playerId: 'reliever-1', isStarter: false, isActive: false }),
    ];
    const players = [
      createPlayer({ name: 'Starter', playerId: 'starter-1', position: 'P' }),
      createPlayer({ name: 'Reliever', playerId: 'reliever-1', position: 'P' }),
    ];

    const nextPitchers = reconcileTeamPitchersWithLineupSnapshot(
      pitchers,
      players,
      createSnapshot({
        usedPlayers: ['starter-1'],
        currentPitcher: {
          playerId: 'reliever-1',
          playerName: 'Reliever',
          position: 'P',
          battingOrder: 9,
          enteredInning: 7,
          isStarter: false,
        },
      }),
      'away',
      (entity) => entity.playerId || entity.name,
    );

    expect(nextPitchers.find((pitcher) => pitcher.playerId === 'starter-1')).toMatchObject({
      isActive: false,
      isOutOfGame: true,
    });
    expect(nextPitchers.find((pitcher) => pitcher.playerId === 'reliever-1')).toMatchObject({
      isActive: true,
      isOutOfGame: false,
    });
  });

  test('replaces a pre-game starting pitcher without creating a duplicate ninth hitter', () => {
    const players = [
      createPlayer({ name: 'Lead Off', playerId: 'p1', position: 'CF', battingOrder: 1 }),
      createPlayer({ name: 'Two Hole', playerId: 'p2', position: 'SS', battingOrder: 2 }),
      createPlayer({ name: 'Three Hole', playerId: 'p3', position: '1B', battingOrder: 3 }),
      createPlayer({ name: 'Cleanup', playerId: 'p4', position: 'RF', battingOrder: 4 }),
      createPlayer({ name: 'Five Spot', playerId: 'p5', position: 'LF', battingOrder: 5 }),
      createPlayer({ name: 'Six Spot', playerId: 'p6', position: '3B', battingOrder: 6 }),
      createPlayer({ name: 'Seven Spot', playerId: 'p7', position: '2B', battingOrder: 7 }),
      createPlayer({ name: 'Eight Spot', playerId: 'p8', position: 'C', battingOrder: 8 }),
      createPlayer({ name: 'Old Pitcher', playerId: 'old-p', position: 'P', battingOrder: 9 }),
      createPlayer({ name: 'New Pitcher', playerId: 'new-p', position: 'P' }),
    ];

    const nextPlayers = reconcileTeamPlayersWithLineupSnapshot(
      players,
      createSnapshot({
        lineup: [
          { playerId: 'p1', playerName: 'Lead Off', position: 'CF', battingOrder: 1, enteredInning: 1, isStarter: true },
          { playerId: 'p2', playerName: 'Two Hole', position: 'SS', battingOrder: 2, enteredInning: 1, isStarter: true },
          { playerId: 'p3', playerName: 'Three Hole', position: '1B', battingOrder: 3, enteredInning: 1, isStarter: true },
          { playerId: 'p4', playerName: 'Cleanup', position: 'RF', battingOrder: 4, enteredInning: 1, isStarter: true },
          { playerId: 'p5', playerName: 'Five Spot', position: 'LF', battingOrder: 5, enteredInning: 1, isStarter: true },
          { playerId: 'p6', playerName: 'Six Spot', position: '3B', battingOrder: 6, enteredInning: 1, isStarter: true },
          { playerId: 'p7', playerName: 'Seven Spot', position: '2B', battingOrder: 7, enteredInning: 1, isStarter: true },
          { playerId: 'p8', playerName: 'Eight Spot', position: 'C', battingOrder: 8, enteredInning: 1, isStarter: true },
          { playerId: 'old-p', playerName: 'Old Pitcher', position: 'P', battingOrder: 9, enteredInning: 1, isStarter: true },
        ],
        bench: [
          { playerId: 'new-p', playerName: 'New Pitcher', positions: ['P'], isAvailable: true },
        ],
        usedPlayers: ['old-p'],
        currentPitcher: {
          playerId: 'new-p',
          playerName: 'New Pitcher',
          position: 'P',
          battingOrder: 9,
          enteredInning: 1,
          enteredFor: 'Old Pitcher',
          isStarter: true,
        },
      }),
      'home',
      (entity) => entity.playerId || entity.name,
    );

    expect(nextPlayers).toHaveLength(9);
    expect(nextPlayers.filter((player) => player.position === 'P')).toHaveLength(1);
    expect(nextPlayers.find((player) => player.battingOrder === 9)).toMatchObject({
      playerId: 'new-p',
      name: 'New Pitcher',
      position: 'P',
    });
    expect(nextPlayers.some((player) => player.playerId === 'old-p')).toBe(false);
  });

  test('rebuilds stale refreshed rosters from the persisted lineup snapshot', () => {
    const stalePlayers = [
      createPlayer({ name: 'Fallback Pitcher', playerId: 'fallback-p', position: 'P', battingOrder: 9 }),
      createPlayer({ name: 'Fallback Bench', playerId: 'fallback-bench', position: 'IF' }),
    ];

    const nextPlayers = reconcileTeamPlayersWithLineupSnapshot(
      stalePlayers,
      createSnapshot({
        lineup: [
          { playerId: 'p1', playerName: 'Lead Off', position: 'CF', battingOrder: 1, enteredInning: 1, isStarter: true },
          { playerId: 'p2', playerName: 'Two Hole', position: 'SS', battingOrder: 2, enteredInning: 1, isStarter: true },
          { playerId: 'p3', playerName: 'Three Hole', position: '1B', battingOrder: 3, enteredInning: 1, isStarter: true },
          { playerId: 'p4', playerName: 'Cleanup', position: 'RF', battingOrder: 4, enteredInning: 1, isStarter: true },
          { playerId: 'p5', playerName: 'Five Spot', position: 'LF', battingOrder: 5, enteredInning: 1, isStarter: true },
          { playerId: 'p6', playerName: 'Six Spot', position: '3B', battingOrder: 6, enteredInning: 1, isStarter: true },
          { playerId: 'p7', playerName: 'Seven Spot', position: '2B', battingOrder: 7, enteredInning: 1, isStarter: true },
          { playerId: 'p8', playerName: 'Eight Spot', position: 'C', battingOrder: 8, enteredInning: 1, isStarter: true },
          { playerId: 'old-p', playerName: 'Old Pitcher', position: 'P', battingOrder: 9, enteredInning: 1, isStarter: true },
        ],
        bench: [],
        usedPlayers: ['old-p'],
        currentPitcher: {
          playerId: 'new-p',
          playerName: 'New Pitcher',
          position: 'P',
          battingOrder: 9,
          enteredInning: 7,
          enteredFor: 'Old Pitcher',
          isStarter: false,
        },
      }),
      'away',
      (entity) => entity.playerId || entity.name,
    );

    expect(nextPlayers).toHaveLength(9);
    expect(nextPlayers.some((player) => player.playerId === 'fallback-p')).toBe(false);
    expect(nextPlayers.find((player) => player.battingOrder === 9)).toMatchObject({
      playerId: 'new-p',
      name: 'New Pitcher',
    });
  });
});
