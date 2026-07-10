import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import {
  countSnakeSupplyByPosition,
  proveSimultaneousSnakeSeating,
  type SnakeSeatingPlayer,
} from '../snakeSeatingProof';

function construction(id: string, shape: RosterSlotPlayer) {
  return {
    id,
    isPitcher: shape.isPitcher,
    role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
    bat: { POW: 20, CON: 20, SPD: 20, FLD: 20, ARM: 20 },
    ...(shape.isPitcher ? { pit: { VEL: 20, JNK: 20, ACC: 20 } } : {}),
  };
}

function card(playerId: string, shape: RosterSlotPlayer, sourceId = `stock:${playerId}`): SnakeSeatingPlayer {
  return { playerId, sourceId, price: 10, shape, construction: construction(playerId, shape) };
}

function oneClubPool(prefix: string, includeSs = true): SnakeSeatingPlayer[] {
  return [
    card(`${prefix}-C`, { isPitcher: false, position: 'C' }),
    card(`${prefix}-1B`, { isPitcher: false, position: '1B' }),
    card(`${prefix}-2B`, { isPitcher: false, position: '2B' }),
    card(`${prefix}-3B`, { isPitcher: false, position: '3B' }),
    ...(includeSs ? [card(`${prefix}-SS`, { isPitcher: false, position: 'SS' })] : []),
    card(`${prefix}-LF`, { isPitcher: false, position: 'LF', secondaryPosition: 'C' }),
    card(`${prefix}-CF`, { isPitcher: false, position: 'CF' }),
    card(`${prefix}-RF`, { isPitcher: false, position: 'RF' }),
    ...Array.from({ length: 6 }, (_, index) => card(`${prefix}-B${index}`, { isPitcher: false, position: 'CF' })),
    ...Array.from({ length: 4 }, (_, index) => card(`${prefix}-SP${index}`, { isPitcher: true, position: 'SP', role: 'SP' })),
    ...Array.from({ length: 3 }, (_, index) => card(`${prefix}-RP${index}`, { isPitcher: true, position: 'RP', role: 'RP' })),
    card(`${prefix}-CP`, { isPitcher: true, position: 'CP', role: 'CP' }),
  ];
}

function floorSlackExtras(prefix: string, includeSs = true): SnakeSeatingPlayer[] {
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']
    .filter((position) => includeSs || position !== 'SS');
  return [
    ...positions.flatMap((position) => Array.from({ length: 2 }, (_, index) => card(
      `${prefix}-${position}-${index}`,
      { isPitcher: false, position },
    ))),
    ...Array.from({ length: 2 }, (_, index) => card(
      `${prefix}-SP-${index}`,
      { isPitcher: true, position: 'SP', role: 'SP' },
    )),
    ...Array.from({ length: 2 }, (_, index) => card(
      `${prefix}-CP-${index}`,
      { isPitcher: true, position: 'CP', role: 'CP' },
    )),
  ];
}

function partialRosterWithoutCAndSs(prefix: string): SnakeSeatingPlayer[] {
  return oneClubPool(prefix)
    .filter((player) => ![`${prefix}-C`, `${prefix}-SS`].includes(player.playerId))
    .map((player) => player.playerId === `${prefix}-LF`
      ? card(player.playerId, { isPitcher: false, position: 'LF' })
      : player);
}

const clubs = ['a', 'b'].map((teamId) => ({
  teamId,
  roster: [],
  committedConstruction: [],
  budgetRemaining: 1_000,
}));

describe('simultaneous snake seating proof', () => {
  test('shared-scarcity joint-fail: counting passes but both clubs need the same C-covering SS human', () => {
    const sharedFlex = card('shared-flex-SS', {
      isPitcher: false,
      position: 'SS',
      secondaryPosition: 'C',
    });
    const pool = [
      sharedFlex,
      card('plain-SS', { isPitcher: false, position: 'SS' }),
      card('C-a', { isPitcher: false, position: 'C' }),
      card('C-b', { isPitcher: false, position: 'C' }),
      card('two-way-C', { isPitcher: true, position: 'SP', role: 'SP', twoWayVariant: 'C' }),
    ];
    const partialClubs = ['a', 'b'].map((teamId) => ({
      teamId,
      roster: partialRosterWithoutCAndSs(teamId),
      budgetRemaining: 1_000,
    }));
    expect(proveSimultaneousSnakeSeating({ clubs: [partialClubs[0]], pool, baseCaps: [], realTeamCount: 1 }).feasible)
      .toBe(true);
    expect(proveSimultaneousSnakeSeating({ clubs: [partialClubs[1]], pool, baseCaps: [], realTeamCount: 1 }).feasible)
      .toBe(true);

    const joint = proveSimultaneousSnakeSeating({ clubs: partialClubs, pool, baseCaps: [], realTeamCount: 2 });
    expect(joint.feasible).toBe(false);
    expect(joint.shortfall).toMatchObject({
      position: 'CATCHER_DEPTH',
      reason: 'joint-assignment',
      affectedClubs: 2,
    });
    expect(joint.message).toContain('NOT ENOUGH CATCHER DEPTH FOR 2 CLUBS');
  });

  test('versions-count-as-one-human in seating and position supply', () => {
    const ruthA = card('ruth-a', { isPitcher: false, position: 'SS' }, 'lahman:ruthba01');
    const ruthB = card('ruth-b', { isPitcher: false, position: 'SS' }, 'lahman:ruthba01');
    const pool = [
      ...oneClubPool('a', false),
      ...oneClubPool('b', false),
      ...floorSlackExtras('slack-no-ss', false),
      ruthA,
      ruthB,
    ];
    expect(countSnakeSupplyByPosition(pool).SS).toBe(1);
    const result = proveSimultaneousSnakeSeating({ clubs, pool, baseCaps: [], realTeamCount: 2 });
    expect(result.feasible).toBe(false);
    expect(result.shortfall).toMatchObject({ position: 'SS', reason: 'position-floor' });
  });

  test('a successful proof returns disjoint, legal 22-player reservations', () => {
    const result = proveSimultaneousSnakeSeating({
      clubs,
      pool: [...oneClubPool('a'), ...oneClubPool('b'), ...floorSlackExtras('slack')],
      baseCaps: [],
      realTeamCount: 2,
    });
    expect(result.feasible).toBe(true);
    const picks = result.assignments.flatMap((assignment) => assignment.playerIds);
    expect(picks).toHaveLength(44);
    expect(new Set(picks)).toHaveLength(44);
    expect(result.assignments.every((assignment) => assignment.playerIds.length === 22)).toBe(true);
  });
});
