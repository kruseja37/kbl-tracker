import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POOL_SIZE_MULTIPLIER,
  extractPoolFromDemand,
  type TeamDesignInput,
} from '../poolFromDemand';
import {
  buildDefaultDesignSlots,
  evaluateRosterDesign,
  seatAllClubs,
  type DesignPoolPlayer,
} from '../rosterDesignFeasibility';
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';
import type { Player } from '../../utils/leagueBuilderStorage';
import {
  buildRosterDesignPool,
  demandUniverseFromPlayers,
} from '../../src_figma/app/engines/leaguePlayerAdapter';

let nextId = 0;

function makePlayer(
  overrides: Partial<Player> & { primaryPosition: Player['primaryPosition']; salary: number },
): Player {
  nextId += 1;
  const pitcher = ['SP', 'SP/RP', 'RP', 'CP', 'P', 'TWO-WAY'].includes(overrides.primaryPosition);
  return {
    id: overrides.id ?? `seat-player-${nextId}`,
    firstName: 'Seat',
    lastName: String(nextId),
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    armSlot: 'High',
    primaryPosition: overrides.primaryPosition,
    secondaryPosition: overrides.secondaryPosition,
    power: overrides.power ?? (pitcher ? 20 : 60),
    contact: overrides.contact ?? (pitcher ? 20 : 60),
    speed: overrides.speed ?? (pitcher ? 20 : 55),
    fielding: overrides.fielding ?? (pitcher ? 20 : 60),
    arm: overrides.arm ?? (pitcher ? 20 : 60),
    velocity: overrides.velocity ?? (pitcher ? 62 : 0),
    junk: overrides.junk ?? (pitcher ? 60 : 0),
    accuracy: overrides.accuracy ?? (pitcher ? 61 : 0),
    arsenal: pitcher ? ['4F', 'SL', 'CH'] : [],
    overallGrade: 'B',
    trait1: overrides.trait1,
    trait2: overrides.trait2,
    personality: 'Competitive',
    chemistry: 'Neutral',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: overrides.salary,
    createdDate: '2026-07-03T00:00:00.000Z',
    lastModified: '2026-07-03T00:00:00.000Z',
    isCustom: true,
    ...overrides,
  } as Player;
}

function makeSeatabilityUniverse(): Player[] {
  nextId = 0;
  const players: Player[] = [];
  const hitterPositions: Player['primaryPosition'][] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  for (const position of hitterPositions) {
    for (let index = 0; index < 8; index += 1) {
      players.push(makePlayer({ primaryPosition: position, salary: 3_000 + index * 200 }));
    }
  }
  for (let index = 0; index < 8; index += 1) {
    players.push(makePlayer({ primaryPosition: '1B', secondaryPosition: 'C', salary: 3_000 + index * 150 }));
  }
  for (let index = 0; index < 40; index += 1) {
    players.push(makePlayer({ primaryPosition: 'SP', salary: 3_000 + index * 100 }));
  }
  for (let index = 0; index < 40; index += 1) {
    players.push(makePlayer({ primaryPosition: 'RP', salary: 3_000 + index * 90 }));
  }
  for (let index = 0; index < 10; index += 1) {
    players.push(makePlayer({ primaryPosition: 'CP', salary: 3_000 + index * 120 }));
  }
  for (let index = 0; index < 10; index += 1) {
    players.push(makePlayer({ primaryPosition: 'SP/RP', salary: 3_000 + index * 110 }));
  }
  return players;
}

function referenceFloorVerdict(
  pool: readonly DesignPoolPlayer[],
  clubs: number,
  budget: number,
): { holds: boolean; seated: number } {
  const remaining = new Map(pool.map((player) => [player.id, player]));
  const slots = buildDefaultDesignSlots();
  for (let pass = 1; pass <= clubs; pass += 1) {
    const result = evaluateRosterDesign(slots, [...remaining.values()], budget);
    if (!result.feasible) return { holds: false, seated: pass - 1 };
    for (const id of result.slots.map((slot) => slot.playerId).filter((id): id is string => Boolean(id))) {
      remaining.delete(id);
    }
  }
  return { holds: true, seated: clubs };
}

describe('seatAllClubs', () => {
  it.each([
    { clubs: 1, budget: 90_000 },
    { clubs: 3, budget: 200_000 },
    { clubs: 4, budget: 60_000 },
  ])('matches the floor verdict on the same pool (clubs=$clubs, budget=$budget)', ({ clubs, budget }) => {
    const pool = buildRosterDesignPool(makeSeatabilityUniverse());

    const shared = seatAllClubs(pool, clubs, budget);
    const floor = referenceFloorVerdict(pool, clubs, budget);

    expect(shared.holds).toBe(floor.holds);
    expect(shared.seated).toBe(floor.seated);
  });

  it('the persisted extracted set holds under the same cap and club count when G1 holds', () => {
    const source = makeSeatabilityUniverse();
    const byId = new Map(source.map((player) => [player.id, player]));
    const clubs = 4;
    const cap = 200_000;
    const designs: TeamDesignInput[] = Array.from({ length: clubs }, (_, index) => ({
      teamId: `team-${index + 1}`,
      slots: buildDefaultDesignSlots(),
    }));

    const result = extractPoolFromDemand(
      demandUniverseFromPlayers(source),
      designs,
      HISTORICAL_ARCHETYPES.slice(0, clubs),
      'standard',
      {
        teams: clubs,
        shills: 0,
        budgetPerTeam: cap,
        poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
      },
    );

    expect(result.g1?.holds).toBe(true);
    const extractedPlayers = result.players
      .map((player) => byId.get(player.id))
      .filter((player): player is Player => Boolean(player));

    const floor = seatAllClubs(buildRosterDesignPool(extractedPlayers), clubs, cap);
    expect(floor.holds).toBe(true);
    expect(floor.seated).toBe(clubs);
  });
});
