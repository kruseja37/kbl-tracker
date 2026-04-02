import { describe, expect, test } from 'vitest';

import {
  reconcileTeamPitchersWithLineupSnapshot,
  reconcileTeamPlayersWithLineupSnapshot,
} from '../../app/utils/gameTrackerRosterSync';
import type { Pitcher, Player } from '../../app/components/TeamRoster';
import type { TeamLineupSnapshot } from '../../hooks/useGameState';

const getRosterEntityId = (
  entity: { name: string; playerId?: string },
): string => entity.playerId ?? entity.name;

describe('gameTrackerRosterSync pitcher reconciliation', () => {
  test('rebuilds player display from the lineup snapshot without retaining dummy placeholders', () => {
    const existingPlayers: Player[] = [
      {
        name: 'P. HERNANDEZ',
        playerId: 'dummy-1',
        position: 'CF',
        battingOrder: 1,
        stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
        battingHand: 'L',
      },
      {
        name: 'K. WASHINGTON',
        playerId: 'real-ss',
        position: 'SS',
        battingOrder: 2,
        stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
        battingHand: 'R',
      },
      {
        name: 'S. WHITE',
        playerId: 'dummy-p',
        position: 'P',
        battingOrder: 9,
        stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
        battingHand: 'R',
      },
    ];
    const snapshot: TeamLineupSnapshot = {
      lineup: [
        {
          playerId: 'real-cf',
          playerName: 'Tugboat Thomas',
          position: 'CF',
          battingOrder: 1,
          enteredInning: 1,
          isStarter: true,
        },
        {
          playerId: 'real-ss',
          playerName: 'Kerry Cartman',
          position: 'SS',
          battingOrder: 2,
          enteredInning: 1,
          isStarter: true,
        },
      ],
      bench: [
        {
          playerId: 'bench-ut',
          playerName: 'Linda Hand',
          positions: ['OF'],
          isAvailable: true,
        },
      ],
      usedPlayers: [],
      currentPitcher: {
        playerId: 'real-p',
        playerName: 'Rufus Zumar',
        position: 'P',
        battingOrder: 9,
        enteredInning: 1,
        isStarter: true,
      },
    };

    expect(
      reconcileTeamPlayersWithLineupSnapshot(
        existingPlayers,
        snapshot,
        'home',
        (entity) => getRosterEntityId(entity),
      ).map((player) => player.name),
    ).toEqual(['Tugboat Thomas', 'Kerry Cartman', 'Rufus Zumar', 'Linda Hand']);
  });

  test('preserves the bullpen when the current pitcher changes', () => {
    const existingPitchers: Pitcher[] = [
      {
        name: 'Away Starter',
        playerId: 'away-sp',
        stats: { ip: '5.0', h: 3, r: 1, er: 1, bb: 1, k: 4, pitches: 78 },
        throwingHand: 'R',
        isStarter: true,
        isActive: true,
        isOutOfGame: false,
      },
      {
        name: 'Away Reliever',
        playerId: 'away-rp',
        stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
        throwingHand: 'L',
        isStarter: false,
        isActive: false,
        isOutOfGame: false,
      },
    ];
    const players: Player[] = [];
    const snapshot: TeamLineupSnapshot = {
      lineup: [],
      bench: [
        {
          playerId: 'away-rp',
          playerName: 'Away Reliever',
          positions: ['P'],
          isAvailable: true,
        },
        {
          playerId: 'away-lrp',
          playerName: 'Away Long Reliever',
          positions: ['RP'],
          isAvailable: true,
        },
      ],
      usedPlayers: ['away-sp'],
      currentPitcher: {
        playerId: 'away-rp',
        playerName: 'Away Reliever',
        position: 'P',
        battingOrder: 9,
        enteredInning: 6,
      },
    };

    expect(
      reconcileTeamPitchersWithLineupSnapshot(
        existingPitchers,
        players,
        snapshot,
        'away',
        (entity) => getRosterEntityId(entity),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 'away-rp',
          isActive: true,
          isOutOfGame: false,
        }),
        expect.objectContaining({
          playerId: 'away-sp',
          isActive: false,
          isOutOfGame: true,
        }),
        expect.objectContaining({
          playerId: 'away-lrp',
          isActive: false,
          isOutOfGame: false,
        }),
      ]),
    );
  });

  test('drops unmatched dummy pitchers while preserving real bullpen arms from the snapshot', () => {
    const existingPitchers: Pitcher[] = [
      {
        name: 'S. WHITE',
        playerId: 'dummy-p',
        stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
        throwingHand: 'R',
        isStarter: true,
        isActive: false,
        isOutOfGame: false,
      },
      {
        name: 'Rufus Zumar',
        playerId: 'real-p',
        stats: { ip: '2.0', h: 1, r: 0, er: 0, bb: 1, k: 2, pitches: 31 },
        throwingHand: 'R',
        isStarter: false,
        isActive: true,
        isOutOfGame: false,
      },
    ];
    const players: Player[] = [];
    const snapshot: TeamLineupSnapshot = {
      lineup: [],
      bench: [
        {
          playerId: 'bullpen-1',
          playerName: 'Terrok Smith',
          positions: ['RP'],
          isAvailable: true,
        },
      ],
      usedPlayers: [],
      currentPitcher: {
        playerId: 'real-p',
        playerName: 'Rufus Zumar',
        position: 'P',
        battingOrder: 9,
        enteredInning: 6,
      },
    };

    expect(
      reconcileTeamPitchersWithLineupSnapshot(
        existingPitchers,
        players,
        snapshot,
        'home',
        (entity) => getRosterEntityId(entity),
      ).map((pitcher) => pitcher.name),
    ).toEqual(['Rufus Zumar', 'Terrok Smith']);
  });
});
