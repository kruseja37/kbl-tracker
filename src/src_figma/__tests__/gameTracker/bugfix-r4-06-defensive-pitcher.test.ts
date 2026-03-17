import { describe, expect, test } from 'vitest';

import type { Player } from '../../app/components/TeamRoster';
import type { TeamLineupSnapshot } from '../../hooks/useGameState';
import { reconcileTeamPlayersWithLineupSnapshot } from '../../app/utils/gameTrackerRosterSync';

const player = (
  name: string,
  battingOrder: number,
  position?: string,
  playerId?: string,
): Player => ({
  name,
  playerId,
  position,
  battingOrder,
  stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
  battingHand: 'R',
});

describe('bugfix R4-06: defensive column uses the synced current pitcher', () => {
  test('replaces the old pitcher row with snapshot.currentPitcher when the bullpen arm is not in the lineup', () => {
    const existingPlayers: Player[] = [
      player('Lead Off', 1, 'CF', 'p1'),
      player('Two Hole', 2, 'SS', 'p2'),
      player('Three Hole', 3, '1B', 'p3'),
      player('Cleanup', 4, 'RF', 'p4'),
      player('Five Spot', 5, 'LF', 'p5'),
      player('Six Spot', 6, '3B', 'p6'),
      player('Seven Spot', 7, '2B', 'p7'),
      player('Eight Spot', 8, 'C', 'p8'),
      player('Old Pitcher', 9, 'P', 'old-p'),
    ];

    const snapshot: TeamLineupSnapshot = {
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
    };

    const reconciled = reconcileTeamPlayersWithLineupSnapshot(
      existingPlayers,
      snapshot,
      'home',
      (entity) => entity.playerId || entity.name,
    );

    expect(reconciled.find((entry) => entry.battingOrder === 9)).toMatchObject({
      playerId: 'new-p',
      name: 'New Pitcher',
      position: 'P',
      battingOrder: 9,
      isOutOfGame: false,
    });
  });
});
