import { describe, expect, test } from 'vitest';

import {
  PLAYERS,
  TEAMS,
  type PlayerData,
} from '../playerDatabase';
import {
  isLegalRoster,
} from '../rosterConstruction';
import { toRosterSlotPlayer } from '../../engines/rosterNeed';
import {
  countSnakeSupplyByPosition,
  proveSimultaneousSnakeSeating,
  type SnakeSeatingPlayer,
} from '../../engines/snakeSeatingProof';

const CORRECTED_CLOSERS = {
  'wpg-ospeciallo': 'wild-pigs',
  'sct-vainer': 'sand-cats',
  'ply-huckster': 'platypi',
  'grp-meggles': 'grapplers',
  'htr-enduck': 'heaters',
  'ovd-nerdwerd': 'overdogs',
} as const;

function primaryPosition(player: PlayerData): string {
  return player.isPitcher ? player.pitcherRole ?? 'SP' : player.primaryPosition;
}

function seatingPlayer(player: PlayerData): SnakeSeatingPlayer {
  const shape = toRosterSlotPlayer({
    primaryPosition: primaryPosition(player),
    secondaryPosition: player.secondaryPosition ?? null,
    traits: [player.traits.trait1, player.traits.trait2],
  });
  return {
    playerId: player.id,
    sourceId: `smb4:${player.id}`,
    price: 1,
    shape,
    construction: {
      id: player.id,
      isPitcher: shape.isPitcher,
      role: shape.role,
      bat: {
        POW: player.batterRatings?.power ?? 0,
        CON: player.batterRatings?.contact ?? 0,
        SPD: player.batterRatings?.speed ?? 0,
        FLD: player.batterRatings?.fielding ?? 0,
        ARM: player.batterRatings?.arm ?? 0,
      },
      ...(shape.isPitcher ? {
        pit: {
          VEL: player.pitcherRatings?.velocity ?? 0,
          JNK: player.pitcherRatings?.junk ?? 0,
          ACC: player.pitcherRatings?.accuracy ?? 0,
        },
      } : {}),
    },
  };
}

describe('stock Super Mega League closer source', () => {
  test('the six designated bullpen chairs are true CP records', () => {
    for (const [playerId, teamId] of Object.entries(CORRECTED_CLOSERS)) {
      expect(PLAYERS[playerId]).toEqual(expect.objectContaining({
        id: playerId,
        teamId,
        isPitcher: true,
        pitcherRole: 'CP',
        role: 'BULLPEN',
      }));
    }
  });

  test('all twenty stock clubs own a CP and the complete stock universe constructively seats twenty legal rosters', () => {
    const clubs = Object.values(TEAMS).filter((team) => team.id !== 'free-agent');
    expect(clubs).toHaveLength(20);

    for (const club of clubs) {
      const closers = club.rosterIds
        .map((playerId) => PLAYERS[playerId])
        .filter((player) => player?.pitcherRole === 'CP');
      expect(closers, `${club.name} must own a true closer`).toHaveLength(1);
      const roster = club.rosterIds.map((playerId) => seatingPlayer(PLAYERS[playerId]).shape);
      expect(roster).toHaveLength(22);
      expect(isLegalRoster(roster), `${club.name} stock roster must be a legal 22`).toBe(true);
    }

    const pool = Object.values(PLAYERS).map(seatingPlayer);
    expect(countSnakeSupplyByPosition(pool).CP).toBe(
      Object.values(PLAYERS).filter((player) => player.pitcherRole === 'CP').length,
    );
    const proof = proveSimultaneousSnakeSeating({
      clubs: clubs.map((team) => ({
        teamId: team.id,
        roster: [],
        committedConstruction: [],
        budgetRemaining: 1_000_000,
      })),
      pool,
      baseCaps: [],
      realTeamCount: clubs.length,
    });

    expect(proof.feasible, proof.message).toBe(true);
    expect(proof.assignments).toHaveLength(20);
    for (const assignment of proof.assignments) {
      const assigned = assignment.playerIds
        .map((playerId) => PLAYERS[playerId])
        .map((player) => seatingPlayer(player).shape);
      expect(assigned).toHaveLength(22);
      expect(isLegalRoster(assigned), `${assignment.teamId} must receive a legal 22`).toBe(true);
    }
  });
});
