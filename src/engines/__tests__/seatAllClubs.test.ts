import { describe, expect, it } from 'vitest';
import {
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
const HITTER_POSITIONS: Player['primaryPosition'][] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

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
  for (const position of HITTER_POSITIONS) {
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

const STRANDING_BUDGET = 412_000;

function makeStrandingFixture(): Player[] {
  nextId = 0;
  const players: Player[] = [];
  for (const position of HITTER_POSITIONS) {
    for (let index = 0; index < 2; index += 1) {
      players.push(makePlayer({
        id: `cheap-${position}-${index}`,
        primaryPosition: position,
        salary: 1_000,
      }));
    }
    for (let index = 0; index < 2; index += 1) {
      players.push(makePlayer({
        id: `expensive-${position}-${index}`,
        primaryPosition: position,
        salary: 40_000,
      }));
    }
  }
  for (let index = 0; index < 4; index += 1) {
    players.push(makePlayer({ id: `cheap-sp-${index}`, primaryPosition: 'SP', salary: 1_000 }));
    players.push(makePlayer({ id: `expensive-sp-${index}`, primaryPosition: 'SP', salary: 40_000 }));
    const reliefPosition = index === 3 ? 'CP' : 'RP';
    players.push(makePlayer({ id: `cheap-${reliefPosition.toLowerCase()}-${index}`, primaryPosition: reliefPosition, salary: 1_000 }));
    players.push(makePlayer({ id: `expensive-${reliefPosition.toLowerCase()}-${index}`, primaryPosition: reliefPosition, salary: 40_000 }));
  }
  return players;
}

function makeLegalRosterFixture(prefix: string, salary: number): Player[] {
  return [
    ...HITTER_POSITIONS.map((position) =>
      makePlayer({ id: `${prefix}-${position}`, primaryPosition: position, salary }),
    ),
    makePlayer({ id: `${prefix}-backup-c`, primaryPosition: '1B', secondaryPosition: 'C', salary }),
    makePlayer({ id: `${prefix}-flex-1`, primaryPosition: 'LF', salary }),
    makePlayer({ id: `${prefix}-flex-2`, primaryPosition: 'CF', salary }),
    makePlayer({ id: `${prefix}-flex-3`, primaryPosition: 'RF', salary }),
    makePlayer({ id: `${prefix}-flex-4`, primaryPosition: '3B', salary }),
    makePlayer({ id: `${prefix}-swing`, primaryPosition: '2B', salary }),
    ...Array.from({ length: 4 }, (_, index) =>
      makePlayer({ id: `${prefix}-sp-${index}`, primaryPosition: 'SP', salary }),
    ),
    ...Array.from({ length: 3 }, (_, index) =>
      makePlayer({ id: `${prefix}-rp-${index}`, primaryPosition: 'RP', salary }),
    ),
    makePlayer({ id: `${prefix}-cp`, primaryPosition: 'CP', salary }),
  ];
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
  it('balances the symmetric cheap bodies that the old sequential drain stranded', () => {
    const pool = buildRosterDesignPool(makeStrandingFixture());

    const result = seatAllClubs(pool, 2, STRANDING_BUDGET);

    // Old greedy failure: club 1 could take the cheap starters, cheap bench/flex bodies,
    // and all cheap arms first, leaving club 2 with the expensive leftovers and a cap miss.
    expect(result.holds).toBe(true);
    expect(result.seated).toBe(2);
    expect(result.assemblies).toHaveLength(2);
    expect(new Set(result.assemblies.flat()).size).toBe(44);
    expect(Math.max(...result.costs)).toBeLessThanOrEqual(STRANDING_BUDGET);
  });

  it('keeps the verdict and per-club max cost invariant under pool input order', () => {
    const pool = buildRosterDesignPool(makeStrandingFixture());
    const forward = seatAllClubs(pool, 2, STRANDING_BUDGET);
    const reversed = seatAllClubs([...pool].reverse(), 2, STRANDING_BUDGET);

    expect(reversed.holds).toBe(forward.holds);
    expect(Math.max(...reversed.costs)).toBe(Math.max(...forward.costs));
  });

  it('holds exactly at the disjoint legal-roster partition budget and fails one dollar below', () => {
    nextId = 0;
    const clubs = 3;
    const salary = 5_000;
    const budget = 22 * salary;
    const source = Array.from({ length: clubs }, (_, index) =>
      makeLegalRosterFixture(`partition-${index}`, salary),
    ).flat();
    const pool = buildRosterDesignPool(source);

    const atBudget = seatAllClubs(pool, clubs, budget);
    expect(atBudget.holds).toBe(true);
    expect(atBudget.costs).toEqual([budget, budget, budget]);

    const oneDollarShort = seatAllClubs(pool, clubs, budget - 1);
    expect(oneDollarShort.holds).toBe(false);
    expect(oneDollarShort.failing?.overrun).toBe(1);
    expect(Math.max(...oneDollarShort.costs)).toBe(budget);
  });

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
        // This fixture proves persisted-set parity for a known G1-holding extraction, not the
        // CAPFIX production-surplus tune (covered by the rebuild viability matrix).
        poolSizeMultiplier: 1.25,
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
