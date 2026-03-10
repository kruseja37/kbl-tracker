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
});
