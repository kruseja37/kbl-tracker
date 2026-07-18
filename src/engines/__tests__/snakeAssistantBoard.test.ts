import { describe, expect, it } from 'vitest';

import { LUXURY_CAP_TABLES } from '../../data/tierParams';
import type { LuxuryCapRow } from '../../data/tierParams';
import { isLegalRoster } from '../../data/rosterConstruction';
import type { Player } from '../../utils/leagueBuilderStorage';
import { luxuryTax } from '../leagueConstruction';
import type { ShapeClassification } from '../playerArchetypeClassifier';
import { buildDefaultDesignSlots, isDesignPlayerEligibleForSlot } from '../rosterDesignFeasibility';
import {
  assistantValueFloorIv,
  buildSnakeAssistantBoard,
  type SnakeAssistantBoardInput,
  type SnakeAssistantBoardPlayer,
} from '../snakeAssistantBoard';

const PRIORITIES = {
  Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1,
} as const;

function classification(): ShapeClassification {
  return {
    shape: 'Balanced', similarity: 1, runnerUp: null, runnerUpSimilarity: 0,
    levelStratum: 'regular', toolLevel: 50,
    tags: {
      bats: 'R', leftArm: false, utility: null, twoWay: false, platoonSides: [],
      ageBand: 'prime', deepArsenal: false, personalityGroup: 'STEADY',
    },
  };
}

function candidate(input: {
  id: string;
  position: Player['primaryPosition'];
  secondary?: Player['secondaryPosition'];
  role?: 'SP' | 'SP/RP' | 'RP' | 'CP';
  power?: number;
  contact?: number;
  frozenIv?: number;
  storedSalary?: number;
  sourceId?: string;
  versionGroupId?: string;
}): SnakeAssistantBoardPlayer {
  const isPitcher = ['P', 'SP', 'SP/RP', 'RP', 'CP'].includes(input.position);
  const construction = {
    id: input.id,
    isPitcher,
    role: input.role,
    bat: { POW: input.power ?? 10, CON: input.contact ?? 10, SPD: 10, FLD: 10, ARM: 10 },
    ...(isPitcher ? { pit: { VEL: 10, JNK: 10, ACC: 10 } } : {}),
  };
  const shape = {
    isPitcher,
    position: input.position,
    ...(input.role ? { role: input.role } : {}),
    ...(!isPitcher ? { secondaryPosition: input.secondary ?? null } : {}),
  };
  const stored = {
    id: input.id, sourceId: input.sourceId, versionGroupId: input.versionGroupId,
    firstName: input.id, lastName: 'Player', gender: 'M', age: 27, bats: 'R', throws: 'R',
    primaryPosition: input.position, secondaryPosition: input.secondary,
    power: input.power ?? 10, contact: input.contact ?? 10, speed: 10, fielding: 10, arm: 10,
    velocity: 10, junk: 10, accuracy: 10, arsenal: isPitcher ? ['4F'] : [],
    overallGrade: 'C', personality: 'Competitive', chemistry: 'Competitive',
    morale: 50, mojo: 'Normal', fame: 0, salary: input.storedSalary ?? 999_999,
    createdDate: '', lastModified: '', isCustom: false,
  } as Player;
  return {
    playerId: input.id,
    sourceId: input.sourceId,
    versionGroupId: input.versionGroupId,
    frozenIv: input.frozenIv ?? 100,
    stored,
    simPlayer: {
      ...construction,
      position: input.position,
      secondaryPosition: input.secondary ?? null,
    },
    seating: { shape, construction },
    classification: classification(),
    archetypeWeights: PRIORITIES,
  };
}

function legalPool(): SnakeAssistantBoardPlayer[] {
  return [
    candidate({ id: 'c', position: 'C' }),
    candidate({ id: '1b', position: '1B' }),
    candidate({ id: '2b', position: '2B' }),
    candidate({ id: '3b', position: '3B' }),
    candidate({ id: 'ss', position: 'SS' }),
    candidate({ id: 'lf', position: 'LF' }),
    candidate({ id: 'cf', position: 'CF' }),
    candidate({ id: 'rf', position: 'RF' }),
    candidate({ id: 'backup-c', position: '1B', secondary: 'C' }),
    ...Array.from({ length: 5 }, (_, index) => candidate({ id: `bench-${index}`, position: 'LF' })),
    ...Array.from({ length: 4 }, (_, index) => candidate({ id: `sp-${index}`, position: 'SP', role: 'SP' })),
    ...Array.from({ length: 3 }, (_, index) => candidate({ id: `rp-${index}`, position: 'RP', role: 'RP' })),
    candidate({ id: 'cp', position: 'CP', role: 'CP' }),
  ];
}

function paddedCyclePool(variablePositions: ReadonlySet<Player['primaryPosition']>): SnakeAssistantBoardPlayer[] {
  const fixedHitters = (['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const)
    .filter((position) => !variablePositions.has(position))
    .map((position) => candidate({ id: `fixed-${position}`, position, frozenIv: 1_000 }));
  return [
    ...fixedHitters,
    candidate({ id: 'fixed-backup-c', position: '1B', secondary: 'C', frozenIv: 1_000 }),
    ...Array.from({ length: 5 }, (_, index) =>
      candidate({ id: `fixed-bench-${index}`, position: 'DH', frozenIv: 1_000 })),
    ...Array.from({ length: 4 }, (_, index) =>
      candidate({ id: `fixed-sp-${index}`, position: 'SP', role: 'SP', frozenIv: 1_000 })),
    ...Array.from({ length: 3 }, (_, index) =>
      candidate({ id: `fixed-rp-${index}`, position: 'RP', role: 'RP', frozenIv: 1_000 })),
    candidate({ id: 'fixed-cp', position: 'CP', role: 'CP', frozenIv: 1_000 }),
  ];
}

const TAX_CYCLE_CAPS: LuxuryCapRow[] = [{
  group: 'hitters', stat: 'POW', topN: 8, cap: 100,
  penaltyCurve: 1, penaltyPer100: 1_000, minAdder: 0,
}];

function engineInput(overrides: Partial<SnakeAssistantBoardInput> = {}): SnakeAssistantBoardInput {
  return {
    teamId: 'mine',
    activePool: legalPool(),
    completedPicks: [{ teamId: 'mine', playerId: 'c', settledSalary: 37 }],
    slots: buildDefaultDesignSlots(),
    archetype: { name: 'Balanced', rawShift: {} },
    ownBandPriorities: PRIORITIES,
    tier: 'standard',
    budget: 1_000_000,
    baseCaps: LUXURY_CAP_TABLES.standard,
    realTeamCount: 2,
    ...overrides,
  };
}

describe('shared snake assistant board core', () => {
  it('anchors the advertised value floor to frozen IV, not contextual own-value', () => {
    const player = candidate({ id: 'floor-check', position: 'SS', frozenIv: 123_456, storedSalary: 999_999 });
    player.archetypeWeights = { Power: 999, Contact: 0, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0 };
    expect(assistantValueFloorIv(player)).toBe(123_456);
  });

  it('pins every own pick and returns an exact unique legal solvent 22', () => {
    const input = engineInput();
    const result = buildSnakeAssistantBoard(input);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).toHaveLength(22);
    expect(new Set(result.playerIds).size).toBe(22);
    expect(result.slots.find((slot) => slot.playerId === 'c')?.pinned).toBe(true);
    const byId = new Map(input.activePool.map((player) => [player.playerId, player]));
    expect(isLegalRoster(result.playerIds.map((id) => byId.get(id)!.seating.shape))).toBe(true);
    expect(result.plan.planCushion).toBeGreaterThanOrEqual(0);
  });

  it('keeps the owned closer at CP, excludes an extra available closer, and only replaces CP for an explicit higher-IV pin', () => {
    const activePool = [
      ...legalPool(),
      candidate({ id: 'higher-cp', position: 'CP', role: 'CP', frozenIv: 150 }),
    ];
    const normal = buildSnakeAssistantBoard(engineInput({
      activePool,
      completedPicks: [{ teamId: 'mine', playerId: 'cp', settledSalary: 100 }],
    }));
    expect(normal.status).toBe('ready');
    if (normal.status !== 'ready') return;
    expect(normal.slots.find((slot) => slot.slotId === 'CP')?.playerId).toBe('cp');
    expect(normal.playerIds).not.toContain('higher-cp');

    const optimized = buildSnakeAssistantBoard(engineInput({
      activePool,
      completedPicks: [{ teamId: 'mine', playerId: 'cp', settledSalary: 100 }],
      selectedPinPlayerId: 'higher-cp',
    }));
    expect(optimized.status).toBe('ready');
    if (optimized.status !== 'ready') return;
    expect(optimized.slots.find((slot) => slot.slotId === 'CP')?.playerId).toBe('higher-cp');
    expect(optimized.playerIds).toContain('cp');
    expect(optimized.playerIds).toContain('higher-cp');
  });

  it('uses exact starter-batting fit in its recommendation and final 22', () => {
    const activePool = legalPool().filter((player) => player.playerId !== 'sp-3');
    activePool.push(
      candidate({ id: 'sp-high-bat', position: 'SP', role: 'SP', frozenIv: 100, power: 90, contact: 90 }),
      candidate({ id: 'sp-low-bat', position: 'SP', role: 'SP', frozenIv: 100, power: 1, contact: 1 }),
    );
    const input = engineInput({
      activePool,
      archetype: { name: 'Starter Bats', rawShift: { 'rotation/POW': 0.1, 'rotation/CON': 0.1 } },
      capIdentity: {
        increase: [], decrease: [],
        rawShift: { RPOW: 0.1, RCON: 0.1 } as NonNullable<SnakeAssistantBoardInput['capIdentity']>['rawShift'],
      },
    });
    const result = buildSnakeAssistantBoard(input);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).toContain('sp-high-bat');
    expect(result.playerIds).not.toContain('sp-low-bat');
    expect(result.recommendationOrder.indexOf('sp-high-bat')).toBeLessThan(
      result.recommendationOrder.indexOf('sp-low-bat'),
    );
  });

  it('keeps relievers neutral when a real identity has only rotation axes', () => {
    const activePool = legalPool().filter((player) => player.playerId !== 'rp-2');
    const neutralRp = candidate({ id: 'a-neutral-rp', position: 'RP', role: 'RP', frozenIv: 100 });
    neutralRp.archetypeWeights = {
      Power: 0, Contact: 0, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 1,
    };
    const genericRotationRp = candidate({ id: 'z-generic-rotation-rp', position: 'RP', role: 'RP', frozenIv: 100 });
    genericRotationRp.archetypeWeights = {
      Power: 0, Contact: 0, Speed: 0, Defense: 0, Rotation: 1, Bullpen: 0,
    };
    activePool.push(neutralRp, genericRotationRp);

    const result = buildSnakeAssistantBoard(engineInput({
      activePool,
      archetype: {
        name: 'Flamethrowers',
        rawShift: { 'rotation/POW': 0.1, 'rotation/CON': 0.1, 'rotation/VEL': 0.32 },
      },
      capIdentity: {
        increase: [], decrease: [],
        rawShift: { RPOW: 0.1, RCON: 0.1, RVEL: 0.32 } as NonNullable<SnakeAssistantBoardInput['capIdentity']>['rawShift'],
      },
      ownBandPriorities: {
        Power: 0, Contact: 0, Speed: 0, Defense: 0, Rotation: 10, Bullpen: 0,
      },
    }));

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.recommendationOrder.indexOf('a-neutral-rp')).toBeLessThan(
      result.recommendationOrder.indexOf('z-generic-rotation-rp'),
    );
    expect(result.playerIds).toContain('a-neutral-rp');
    expect(result.playerIds).not.toContain('z-generic-rotation-rp');
  });

  it('keeps a sub-cent-negative plan ready under the canonical Snake money law', () => {
    const result = buildSnakeAssistantBoard(engineInput({ budget: 2_136.9999995 }));
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.plan.planCost).toBe(2_137);
    expect(result.plan.planCushion).toBeCloseTo(-0.0000005, 9);
  });

  it('uses settled salary for drafted players and frozen IV for available players, never stored salary', () => {
    const result = buildSnakeAssistantBoard(engineInput());
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.plan.planCost).toBe(37 + 21 * 100);
    expect(result.plan.planCost).not.toBe(22 * 999_999);
  });

  it('fails closed when any own pick lacks a settled salary', () => {
    const result = buildSnakeAssistantBoard(engineInput({
      completedPicks: [{ teamId: 'mine', playerId: 'c' }],
    }));
    expect(result).toEqual({ status: 'unavailable', reason: 'MISSING_SETTLED_SALARY' });
  });

  it('excludes rival picks and alternate versions of a drafted human', () => {
    const pool = legalPool();
    const own = pool.find((player) => player.playerId === 'c')!;
    own.versionGroupId = 'human-c';
    own.stored.versionGroupId = 'human-c';
    const alternate = candidate({ id: 'c-alt', position: 'C', versionGroupId: 'human-c', frozenIv: 999_000 });
    const rival = candidate({ id: 'rival-star', position: 'LF', frozenIv: 999_000 });
    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...pool, alternate, rival],
      completedPicks: [
        { teamId: 'mine', playerId: 'c', settledSalary: 37 },
        { teamId: 'rival', playerId: 'rival-star', settledSalary: 50 },
      ],
      versionSelections: { 'human-c': 'c' },
    }));
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).not.toContain('c-alt');
    expect(result.playerIds).not.toContain('rival-star');
  });

  it('keeps sibling cards in recommendations while the 22-plan uses one person once', () => {
    const pool = legalPool();
    const original = pool.find((player) => player.playerId === 'c')!;
    original.versionGroupId = 'historical:catcher';
    original.stored.versionGroupId = 'historical:catcher';
    const alternate = candidate({
      id: 'c-peak',
      position: 'C',
      versionGroupId: 'historical:catcher',
      frozenIv: original.frozenIv + 25,
    });

    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...pool, alternate],
      completedPicks: [],
      versionSelections: {},
    }));

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.recommendationOrder).toContain(original.playerId);
    expect(result.recommendationOrder).toContain(alternate.playerId);
    expect(result.playerIds.filter((id) => id === original.playerId || id === alternate.playerId)).toHaveLength(1);
  });

  it('retains the lower-worth sibling when that card is required to cover a design slot', () => {
    const pool = legalPool().filter((player) => player.playerId !== 'c');
    const peakBat = candidate({
      id: 'two-way-peak-bat',
      position: '1B',
      versionGroupId: 'historical:two-way-star',
      frozenIv: 500,
    });
    const catcherVersion = candidate({
      id: 'two-way-catcher',
      position: 'C',
      versionGroupId: 'historical:two-way-star',
      frozenIv: 5,
    });

    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...pool, peakBat, catcherVersion],
      completedPicks: [],
      versionSelections: {},
    }));

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).toContain(catcherVersion.playerId);
    expect(result.playerIds).not.toContain(peakBat.playerId);
    expect(result.recommendationOrder).toContain(catcherVersion.playerId);
    expect(result.recommendationOrder).toContain(peakBat.playerId);
  });

  it('solves the weighted sibling alternating cycle globally instead of keeping a legal 198-point collapse', () => {
    const fixedPool = [
      ...(['C', '1B', 'LF', 'CF', 'RF'] as const).map((position) =>
        candidate({ id: `fixed-${position}`, position, frozenIv: 1_000, power: 1_000 })),
      candidate({ id: 'fixed-backup-c', position: '1B', secondary: 'C', frozenIv: 1_000, power: 1_000 }),
      ...Array.from({ length: 5 }, (_, index) =>
        candidate({ id: `fixed-bench-${index}`, position: 'DH', frozenIv: 1_000, power: 1_000 })),
      ...Array.from({ length: 4 }, (_, index) =>
        candidate({ id: `fixed-sp-${index}`, position: 'SP', role: 'SP', frozenIv: 1_000 })),
      ...Array.from({ length: 3 }, (_, index) =>
        candidate({ id: `fixed-rp-${index}`, position: 'RP', role: 'RP', frozenIv: 1_000 })),
      candidate({ id: 'fixed-cp', position: 'CP', role: 'CP', frozenIv: 1_000 }),
    ];
    const alternatives = [
      candidate({ id: 'a-g1', position: '2B', versionGroupId: 'person-a', frozenIv: 100, power: 100 }),
      candidate({ id: 'a-g2', position: '3B', versionGroupId: 'person-a', frozenIv: 99, power: 99 }),
      candidate({ id: 'b-g1', position: '2B', versionGroupId: 'person-b', frozenIv: 98, power: 98 }),
      candidate({ id: 'b-g3', position: 'SS', versionGroupId: 'person-b', frozenIv: 1, power: 1 }),
      candidate({ id: 'c-g2', position: '3B', versionGroupId: 'person-c', frozenIv: 97, power: 97 }),
      candidate({ id: 'c-g3', position: 'SS', versionGroupId: 'person-c', frozenIv: 96, power: 96 }),
    ];
    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...fixedPool, ...alternatives],
      completedPicks: [],
      versionSelections: {},
      archetype: { name: 'Power Cycle', rawShift: { 'hitters/POW': 0.1 } },
      budget: 1_000_000_000,
    }));

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    const selectedAlternatives = result.playerIds.filter((playerId) =>
      alternatives.some((player) => player.playerId === playerId));
    expect(selectedAlternatives.sort()).toEqual(['a-g2', 'b-g1', 'c-g3']);
    expect(selectedAlternatives.reduce(
      (sum, playerId) => sum + alternatives.find((player) => player.playerId === playerId)!.frozenIv,
      0,
    )).toBe(293);
  });

  it('rotates a nonlinear tax 2-cycle when the additive maximum is insolvent', () => {
    const fixedPool = paddedCyclePool(new Set(['2B', '3B']));
    const highA = candidate({
      id: 'tax-a-high', position: '2B', versionGroupId: 'tax-person-a', frozenIv: 100, power: 100,
    });
    const lowA = candidate({
      id: 'tax-a-low', position: '3B', versionGroupId: 'tax-person-a', frozenIv: 98, power: 1,
    });
    const highB = candidate({
      id: 'tax-b-high', position: '3B', versionGroupId: 'tax-person-b', frozenIv: 99, power: 99,
    });
    const lowB = candidate({
      id: 'tax-b-low', position: '2B', versionGroupId: 'tax-person-b', frozenIv: 97, power: 1,
    });
    const alternatives = [highA, lowA, highB, lowB];
    const budget = fixedPool.reduce((sum, player) => sum + player.frozenIv, 0)
      + lowA.frozenIv + lowB.frozenIv;
    const additiveMaximum = [...fixedPool, highA, highB];
    const additiveMaximumTax = luxuryTax(
      additiveMaximum.map((player) => player.simPlayer), TAX_CYCLE_CAPS, 'taxed',
    ).charged;

    expect(isLegalRoster(additiveMaximum.map((player) => player.seating.shape))).toBe(true);
    expect(additiveMaximumTax).toBeGreaterThan(0);
    expect(additiveMaximum.reduce((sum, player) => sum + player.frozenIv, 0) + additiveMaximumTax)
      .toBeGreaterThan(budget);

    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...fixedPool, ...alternatives],
      completedPicks: [],
      versionSelections: {},
      budget,
      baseCaps: TAX_CYCLE_CAPS,
    }));

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).toContain(lowA.playerId);
    expect(result.playerIds).toContain(lowB.playerId);
    expect(result.playerIds).not.toContain(highA.playerId);
    expect(result.playerIds).not.toContain(highB.playerId);
    expect(result.plan.planTax).toBe(0);
    expect(result.plan.planCushion).toBeGreaterThanOrEqual(0);
  });

  it('exhausts and applies a four-group tax cycle with no improving 2- or 3-cycle', () => {
    const fixedPool = paddedCyclePool(new Set(['2B', '3B', 'SS', 'LF']));
    const highCards = [
      candidate({ id: 'four-a-high', position: '2B', versionGroupId: 'four-person-a', frozenIv: 100, power: 100 }),
      candidate({ id: 'four-b-high', position: '3B', versionGroupId: 'four-person-b', frozenIv: 99, power: 99 }),
      candidate({ id: 'four-c-high', position: 'SS', versionGroupId: 'four-person-c', frozenIv: 98, power: 98 }),
      candidate({ id: 'four-d-high', position: 'LF', versionGroupId: 'four-person-d', frozenIv: 97, power: 97 }),
    ];
    const lowCards = [
      candidate({ id: 'four-a-low', position: '3B', versionGroupId: 'four-person-a', frozenIv: 90, power: 1 }),
      candidate({ id: 'four-b-low', position: 'SS', versionGroupId: 'four-person-b', frozenIv: 89, power: 1 }),
      candidate({ id: 'four-c-low', position: 'LF', versionGroupId: 'four-person-c', frozenIv: 88, power: 1 }),
      candidate({ id: 'four-d-low', position: '2B', versionGroupId: 'four-person-d', frozenIv: 87, power: 1 }),
    ];
    const budget = fixedPool.reduce((sum, player) => sum + player.frozenIv, 0)
      + lowCards.reduce((sum, player) => sum + player.frozenIv, 0);
    const additiveMaximum = [...fixedPool, ...highCards];
    const additiveMaximumTax = luxuryTax(
      additiveMaximum.map((player) => player.simPlayer), TAX_CYCLE_CAPS, 'taxed',
    ).charged;

    expect(isLegalRoster(additiveMaximum.map((player) => player.seating.shape))).toBe(true);
    expect(additiveMaximumTax).toBeGreaterThan(0);
    expect(additiveMaximum.reduce((sum, player) => sum + player.frozenIv, 0) + additiveMaximumTax)
      .toBeGreaterThan(budget);

    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...fixedPool, ...highCards, ...lowCards],
      completedPicks: [],
      versionSelections: {},
      budget,
      baseCaps: TAX_CYCLE_CAPS,
    }));

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds.filter((playerId) => lowCards.some((player) => player.playerId === playerId)).sort())
      .toEqual(lowCards.map((player) => player.playerId).sort());
    expect(result.playerIds.some((playerId) => highCards.some((player) => player.playerId === playerId))).toBe(false);
    expect(result.plan.planTax).toBe(0);
    expect(result.plan.planCushion).toBeGreaterThanOrEqual(0);
  });

  it('fails closed when the deterministic arbitrary-cycle proof cap is exhausted', () => {
    const hitterPositions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
    const universalHitterVersions = Array.from({ length: 14 }, (_, groupIndex) =>
      hitterPositions.map((position, positionIndex) => candidate({
        id: `cap-person-${groupIndex}-${position}`,
        position,
        versionGroupId: `cap-person-${groupIndex}`,
        frozenIv: 10_000 - groupIndex * 100 - positionIndex,
      }))).flat();
    const fixedPitchers = [
      ...Array.from({ length: 4 }, (_, index) =>
        candidate({ id: `cap-sp-${index}`, position: 'SP', role: 'SP', frozenIv: 1_000 })),
      ...Array.from({ length: 3 }, (_, index) =>
        candidate({ id: `cap-rp-${index}`, position: 'RP', role: 'RP', frozenIv: 1_000 })),
      candidate({ id: 'cap-cp', position: 'CP', role: 'CP', frozenIv: 1_000 }),
    ];

    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...universalHitterVersions, ...fixedPitchers],
      completedPicks: [],
      versionSelections: {},
      budget: 1_000_000_000,
      baseCaps: TAX_CYCLE_CAPS,
    }));

    expect(result).toEqual({ status: 'unavailable', reason: 'INCOMPLETE_BOARD' });
  });

  it('uses a revalidated shared-room completion when preference search exhausts its cap', () => {
    const hitterPositions = ['C', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'DH', 'DH', 'DH', 'DH'] as const;
    const universalHitterVersions = Array.from({ length: 14 }, (_, groupIndex) =>
      (['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const).map((position, positionIndex) => candidate({
        id: `cert-person-${groupIndex}-${position}`,
        position,
        versionGroupId: `cert-person-${groupIndex}`,
        frozenIv: 10_000 - groupIndex * 100 - positionIndex,
      }))).flat();
    const fixedPitchers = [
      ...Array.from({ length: 4 }, (_, index) =>
        candidate({ id: `cert-sp-${index}`, position: 'SP', role: 'SP', frozenIv: 1_000 })),
      ...Array.from({ length: 3 }, (_, index) =>
        candidate({ id: `cert-rp-${index}`, position: 'RP', role: 'RP', frozenIv: 1_000 })),
      candidate({ id: 'cert-cp', position: 'CP', role: 'CP', frozenIv: 1_000 }),
    ];
    const certifiedCompletionPlayerIds = [
      ...hitterPositions.map((position, groupIndex) => `cert-person-${groupIndex}-${position}`),
      ...fixedPitchers.map((player) => player.playerId),
    ];
    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...universalHitterVersions, ...fixedPitchers],
      completedPicks: [],
      versionSelections: {},
      budget: 1_000_000_000,
      baseCaps: TAX_CYCLE_CAPS,
      certifiedCompletionPlayerIds,
    }));

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).toEqual(expect.arrayContaining(certifiedCompletionPlayerIds));
    expect(result.playerIds).toHaveLength(22);
    expect(result.plan.planCushion).toBeGreaterThanOrEqual(0);
  });

  it('keeps zero-interest private preference out of plans without deleting a committed pick', () => {
    const replacement = candidate({ id: 'replacement-bench', position: 'LF', frozenIv: 90 });
    const excluded = buildSnakeAssistantBoard(engineInput({
      activePool: [...legalPool(), replacement],
      zeroInterestPlayerIds: ['bench-0'],
    }));
    expect(excluded.status).toBe('ready');
    if (excluded.status !== 'ready') return;
    expect(excluded.playerIds).not.toContain('bench-0');
    expect(excluded.playerIds).toContain(replacement.playerId);

    const committed = buildSnakeAssistantBoard(engineInput({
      activePool: [...legalPool(), replacement],
      completedPicks: [
        { teamId: 'mine', playerId: 'c', settledSalary: 37 },
        { teamId: 'mine', playerId: 'bench-0', settledSalary: 50 },
      ],
      zeroInterestPlayerIds: ['bench-0'],
    }));
    expect(committed.status).toBe('ready');
    if (committed.status !== 'ready') return;
    expect(committed.playerIds).toContain('bench-0');
  });

  it('falls back to an exact solvent legal 22 when only the secondary preference start exhausts its cycle cap', () => {
    const fixedBoard = paddedCyclePool(new Set());
    const hitterPositions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
    const fitOnlyVersions = Array.from({ length: 14 }, (_, groupIndex) =>
      hitterPositions.map((position, positionIndex) => candidate({
        id: `z-baseline-fit-${groupIndex}-${position}`,
        position,
        versionGroupId: `z-baseline-fit-${groupIndex}`,
        frozenIv: 1_000,
        power: 100 - positionIndex,
      }))).flat();

    // Equal-IV fixed cards win the baseline value tie and are all pinned in the identity phase.
    // The lower-priority fit baseline alone selects the dense sibling graph and hits the proof cap.
    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...fixedBoard, ...fitOnlyVersions],
      completedPicks: fixedBoard.map((player) => ({
        teamId: 'mine', playerId: player.playerId, settledSalary: 1,
      })),
      versionSelections: {},
      archetype: { name: 'Power Cap', rawShift: { 'hitters/POW': 0.1 } },
      budget: 1_000_000_000,
      baseCaps: TAX_CYCLE_CAPS,
    }));

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).toHaveLength(22);
    expect(result.playerIds).toEqual(expect.arrayContaining(fixedBoard.map((player) => player.playerId)));
    expect(result.plan.planCushion).toBeGreaterThanOrEqual(0);
  });

  it('falls back to an exact solvent legal 22 when an unselected identity start exhausts its cycle cap', () => {
    const cyclePositions = ['C', '1B', '2B', '3B', 'SS', 'LF'] as const;
    const fixedBoard = paddedCyclePool(new Set(cyclePositions));
    const rankedHighCards = cyclePositions.map((position, index) => candidate({
      id: `z-identity-high-${index}-${position}`,
      position,
      versionGroupId: `identity-cycle-${index}`,
      frozenIv: 990,
      power: 20,
    }));
    const lowCycleCards = cyclePositions.flatMap((_, index) => {
      const nextPosition = cyclePositions[(index + 1) % cyclePositions.length];
      return Array.from({ length: 9 }, (_, versionIndex) => candidate({
        id: `a-identity-low-${index}-${versionIndex}-${nextPosition}`,
        position: nextPosition,
        versionGroupId: `identity-cycle-${index}`,
        frozenIv: 1_000,
        power: 1,
      }));
    });
    const scaleDecoys = Array.from({ length: 60 }, (_, index) => candidate({
      id: `identity-scale-decoy-${index}`,
      position: 'DH',
      frozenIv: 1,
      power: 100,
    }));
    const lowBoardCost = fixedBoard.reduce((sum, player) => sum + player.frozenIv, 0)
      + cyclePositions.length * 1_000;

    // Value and negative-POW baseline starts both use the low-power rotated cards and exhaust their
    // one-choice reverse cycle. Slot ranks make the identity fit start use the six high-power cards;
    // its 9^6 sibling rotation caps, but that board is tax-insolvent and loses to the completed value
    // identity start. Completion must still propagate from the unselected start.
    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...fixedBoard, ...rankedHighCards, ...lowCycleCards, ...scaleDecoys],
      completedPicks: [],
      versionSelections: {},
      archetype: { name: 'Low Power', rawShift: { 'hitters/POW': -0.01 } },
      gmRankOverrides: {
        byPosition: Object.fromEntries(rankedHighCards.map((player) => [
          player.stored.primaryPosition, [player.playerId],
        ])),
      },
      budget: lowBoardCost,
      baseCaps: TAX_CYCLE_CAPS,
    }));

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).toHaveLength(22);
    expect(new Set(result.playerIds).size).toBe(22);
    expect(result.plan.planCushion).toBeGreaterThanOrEqual(0);
  }, 10_000);

  it('uses an augmenting path when first-free pin matching would strand a reliever', () => {
    const pool = [...legalPool(), candidate({ id: 'extra-rp', position: 'RP', role: 'RP' })];
    const pinnedIds = ['cp', 'extra-rp', 'rp-0', 'rp-1', 'rp-2'];
    const picks = pinnedIds.map((playerId) => ({ teamId: 'mine', playerId, settledSalary: 11 }));
    const slots = buildDefaultDesignSlots();
    const usedByFirstFree = new Set<string>();
    let firstFreeMatches = 0;
    for (const playerId of [...pinnedIds].sort()) {
      const player = pool.find((entry) => entry.playerId === playerId)!;
      const slot = slots.find((candidateSlot) => !usedByFirstFree.has(candidateSlot.slotId)
        && isDesignPlayerEligibleForSlot(candidateSlot, {
          profile: {
            isPitcher: player.seating.shape.isPitcher,
            primaryPosition: player.seating.shape.position,
          },
          slotPlayer: player.seating.shape,
        }));
      if (slot) {
        usedByFirstFree.add(slot.slotId);
        firstFreeMatches += 1;
      }
    }
    expect(firstFreeMatches).toBe(4);

    const first = buildSnakeAssistantBoard(engineInput({
      activePool: pool,
      completedPicks: picks,
    }));
    const second = buildSnakeAssistantBoard(engineInput({
      activePool: [...pool].reverse(),
      completedPicks: [...picks].reverse(),
    }));
    expect(first.status).toBe('ready');
    expect(second.status).toBe('ready');
    if (first.status !== 'ready' || second.status !== 'ready') return;
    expect(first.slots).toEqual(second.slots);
    expect(first.slots.filter((slot) => slot.pinned).map((slot) => slot.playerId).sort()).toEqual([...pinnedIds].sort());
    expect(first.slots.find((slot) => slot.slotId === 'CP')).toEqual(expect.objectContaining({ playerId: 'cp' }));
  });

  it('lets a complete global board softly change FLEX membership where no position board decides', () => {
    const preferred = candidate({ id: 'zz-flex-dh', position: 'DH', frozenIv: 99 });
    const activePool = [...legalPool(), preferred];
    const preferredLast = activePool.map((player) => player.playerId);
    const preferredFirst = [preferred.playerId, ...preferredLast.filter((playerId) => playerId !== preferred.playerId)];
    const baseline = buildSnakeAssistantBoard(engineInput({
      activePool,
      gmRankOverrides: { global: preferredLast },
    }));
    const ranked = buildSnakeAssistantBoard(engineInput({
      activePool,
      gmRankOverrides: { global: preferredFirst },
    }));
    expect(baseline.status).toBe('ready');
    expect(ranked.status).toBe('ready');
    if (baseline.status !== 'ready' || ranked.status !== 'ready') return;
    expect(baseline.playerIds).not.toContain(preferred.playerId);
    expect(ranked.playerIds).toContain(preferred.playerId);
    expect(ranked.slots.find((slot) => slot.playerId === preferred.playerId)?.slotId).toMatch(/^FLEX/);
  });

  it('uses applicable positional GM ranks for SP, RP, and CP roster membership', () => {
    const preferred = [
      candidate({ id: 'zz-sp', position: 'SP', role: 'SP', frozenIv: 99 }),
      candidate({ id: 'zz-rp', position: 'RP', role: 'RP', frozenIv: 99 }),
      candidate({ id: 'zz-cp', position: 'CP', role: 'CP', frozenIv: 99 }),
    ];
    const activePool = [...legalPool(), ...preferred];
    const completeGlobal = activePool.map((player) => player.playerId);
    const baseline = buildSnakeAssistantBoard(engineInput({
      activePool,
      gmRankOverrides: { global: completeGlobal },
    }));
    const ranked = buildSnakeAssistantBoard(engineInput({
      activePool,
      gmRankOverrides: {
        global: completeGlobal,
        byPosition: { SP: ['zz-sp'], RP: ['zz-rp'], CP: ['zz-cp'] },
      },
    }));
    expect(baseline.status).toBe('ready');
    expect(ranked.status).toBe('ready');
    if (baseline.status !== 'ready' || ranked.status !== 'ready') return;
    for (const player of preferred) {
      expect(baseline.playerIds).not.toContain(player.playerId);
      expect(ranked.playerIds).toContain(player.playerId);
    }
  });

  it('honors secondary catcher eligibility when the GM ranks the player on the C board', () => {
    const preferred = candidate({
      id: 'zz-secondary-c', position: '1B', secondary: 'C', frozenIv: 99,
    });
    const activePool = [...legalPool(), preferred];
    const completeGlobal = activePool.map((player) => player.playerId);
    const baseline = buildSnakeAssistantBoard(engineInput({
      activePool,
      gmRankOverrides: { global: completeGlobal },
    }));
    const ranked = buildSnakeAssistantBoard(engineInput({
      activePool,
      gmRankOverrides: { global: completeGlobal, byPosition: { C: [preferred.playerId] } },
    }));
    expect(baseline.status).toBe('ready');
    expect(ranked.status).toBe('ready');
    if (baseline.status !== 'ready' || ranked.status !== 'ready') return;
    expect(baseline.playerIds).not.toContain(preferred.playerId);
    expect(ranked.slots.find((slot) => slot.slotId === 'backupC')).toEqual(expect.objectContaining({
      playerId: preferred.playerId,
    }));
  });

  it('can spend an SP/RP GM preference on SWING after the drafted staff is pinned', () => {
    const preferred = candidate({ id: 'zz-swing', position: 'SP/RP', role: 'SP/RP', frozenIv: 99 });
    const activePool = [...legalPool(), preferred];
    const staffIds = ['sp-0', 'sp-1', 'sp-2', 'sp-3', 'rp-0', 'rp-1', 'rp-2', 'cp'];
    const completedPicks = staffIds.map((playerId) => ({ teamId: 'mine', playerId, settledSalary: 11 }));
    const completeGlobal = activePool.map((player) => player.playerId);
    const baseline = buildSnakeAssistantBoard(engineInput({
      activePool,
      completedPicks,
      gmRankOverrides: { global: completeGlobal },
    }));
    const ranked = buildSnakeAssistantBoard(engineInput({
      activePool,
      completedPicks,
      gmRankOverrides: { global: completeGlobal, byPosition: { 'SP/RP': [preferred.playerId] } },
    }));
    expect(baseline.status).toBe('ready');
    expect(ranked.status).toBe('ready');
    if (baseline.status !== 'ready' || ranked.status !== 'ready') return;
    expect(baseline.playerIds).not.toContain(preferred.playerId);
    expect(ranked.slots.find((slot) => slot.slotId === 'SWING')).toEqual(expect.objectContaining({
      playerId: preferred.playerId,
    }));
  });

  it('keeps GM rankings soft when their first player is ineligible for every roster slot', () => {
    const ineligible = candidate({ id: 'roleless-arm', position: 'P' });
    const activePool = [...legalPool(), ineligible];
    const result = buildSnakeAssistantBoard(engineInput({
      activePool,
      gmRankOverrides: {
        global: [ineligible.playerId, ...activePool
          .filter((player) => player.playerId !== ineligible.playerId)
          .map((player) => player.playerId)],
        byPosition: { SP: [ineligible.playerId] },
      },
    }));
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).not.toContain(ineligible.playerId);
  });

  it('keeps a legal selected pin when membership is valid even if the rigid preference frame has no slot', () => {
    const invalid = candidate({ id: 'roleless-arm', position: 'P' });
    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...legalPool(), invalid],
      selectedPinPlayerId: invalid.playerId,
    }));
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).toContain(invalid.playerId);
    expect(result.slots.find((slot) => slot.playerId === invalid.playerId)?.pinned).toBe(true);
  });

  it('keeps the Assistant available after a fifth pure starter is drafted', () => {
    const extraStarter = candidate({ id: 'sp-5', position: 'SP', role: 'SP', frozenIv: 90 });
    const activePool = [...legalPool(), extraStarter];
    const completedPicks = ['sp-0', 'sp-1', 'sp-2', 'sp-3', 'sp-5'].map((playerId) => ({
      teamId: 'mine', playerId, settledSalary: 50,
    }));
    const result = buildSnakeAssistantBoard(engineInput({ activePool, completedPicks }));
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.playerIds).toEqual(expect.arrayContaining(completedPicks.map((pick) => pick.playerId)));
    expect(result.playerIds).toHaveLength(22);
    expect(result.plan.planCushion).toBeGreaterThanOrEqual(0);
  });

  it('fails closed on non-finite tax inputs before an optimizer can manufacture a board', () => {
    const caps = LUXURY_CAP_TABLES.standard.map((row, index) => index === 0 ? { ...row, cap: Number.NaN } : row);
    expect(buildSnakeAssistantBoard(engineInput({ baseCaps: caps }))).toEqual({
      status: 'unavailable', reason: 'INVALID_NUMERIC_INPUT',
    });
    expect(buildSnakeAssistantBoard(engineInput({
      capIdentity: { increase: [], decrease: [], rawShift: { POW: Number.POSITIVE_INFINITY } },
    }))).toEqual({ status: 'unavailable', reason: 'INVALID_NUMERIC_INPUT' });
  });

  it('does not mutate My Board, rankings, candidates, or any other input bytes', () => {
    const input = engineInput({ gmRankOverrides: { global: ['rf', 'ss', 'c'] } });
    const before = JSON.stringify(input);
    buildSnakeAssistantBoard(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('returns byte-identical derived truth for identical main and companion inputs', () => {
    const mainInput = engineInput({ gmRankOverrides: { global: ['rf', 'ss', 'c'] } });
    const companionInput = structuredClone(mainInput);
    expect(buildSnakeAssistantBoard(mainInput)).toEqual(buildSnakeAssistantBoard(companionInput));
  });
});
