/**
 * Test for EXH-019: Pre-game lineup substitution
 * Verifies that when a bench player replaces a lineup player:
 * 1. Bench player gets lineup player's battingOrder and position
 * 2. Lineup player goes to bench (battingOrder: undefined, position: undefined)
 */

import { describe, it, expect } from 'vitest';

interface Player {
  name: string;
  position?: string;
  battingOrder?: number;
}

// Simulates ExhibitionGame's handleAwaySubstitution
function handleSubstitution(
  players: Player[],
  benchPlayerName: string,
  lineupPlayerName: string
): Player[] {
  const benchIndex = players.findIndex(p => p.name === benchPlayerName);
  const lineupIndex = players.findIndex(p => p.name === lineupPlayerName);

  if (benchIndex === -1 || lineupIndex === -1) {
    return players;
  }

  return players.map((player, i) => {
    if (i === benchIndex) {
      // Bench player enters lineup with lineup player's spot
      return {
        ...player,
        battingOrder: players[lineupIndex].battingOrder,
        position: players[lineupIndex].position,
      };
    }
    if (i === lineupIndex) {
      // Lineup player goes to bench (no batting order, no position)
      return {
        ...player,
        battingOrder: undefined,
        position: undefined,
      };
    }
    return player;
  });
}

describe('Pre-game lineup substitution (EXH-019)', () => {
  it('should swap bench player into lineup correctly', () => {
    const players: Player[] = [
      { name: 'Smack Avery', battingOrder: 1, position: 'CP' },
      { name: 'Benny Balmer', battingOrder: 2, position: 'LF' },
      { name: 'Billy LeBoink', battingOrder: undefined, position: undefined }, // bench
    ];

    const result = handleSubstitution(players, 'Billy LeBoink', 'Smack Avery');

    // Billy LeBoink should now be in lineup with Smack's spot
    const billyAfter = result.find(p => p.name === 'Billy LeBoink');
    expect(billyAfter?.battingOrder).toBe(1);
    expect(billyAfter?.position).toBe('CP');

    // Smack Avery should now be on bench
    const smackAfter = result.find(p => p.name === 'Smack Avery');
    expect(smackAfter?.battingOrder).toBeUndefined();
    expect(smackAfter?.position).toBeUndefined();

    // Benny should be unchanged
    const bennyAfter = result.find(p => p.name === 'Benny Balmer');
    expect(bennyAfter?.battingOrder).toBe(2);
    expect(bennyAfter?.position).toBe('LF');
  });

  it('should maintain 9 lineup players after substitution', () => {
    const players: Player[] = [
      { name: 'Player1', battingOrder: 1, position: 'C' },
      { name: 'Player2', battingOrder: 2, position: '1B' },
      { name: 'Player3', battingOrder: 3, position: '2B' },
      { name: 'Player4', battingOrder: 4, position: '3B' },
      { name: 'Player5', battingOrder: 5, position: 'SS' },
      { name: 'Player6', battingOrder: 6, position: 'LF' },
      { name: 'Player7', battingOrder: 7, position: 'CF' },
      { name: 'Player8', battingOrder: 8, position: 'RF' },
      { name: 'Player9', battingOrder: 9, position: 'DH' },
      { name: 'BenchGuy', battingOrder: undefined, position: undefined },
    ];

    const result = handleSubstitution(players, 'BenchGuy', 'Player1');

    const lineupPlayers = result.filter(p => p.battingOrder !== undefined);
    const benchPlayers = result.filter(p => p.battingOrder === undefined);

    expect(lineupPlayers.length).toBe(9);
    expect(benchPlayers.length).toBe(1);
    expect(benchPlayers[0].name).toBe('Player1');
  });
});
