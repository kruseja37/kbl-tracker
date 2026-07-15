import { describe, expect, it } from 'vitest';

import { LUXURY_CAP_TABLES } from '../../data/tierParams';
import { isLegalRoster } from '../../data/rosterConstruction';
import type { Player } from '../../utils/leagueBuilderStorage';
import type { ShapeClassification } from '../playerArchetypeClassifier';
import { buildDefaultDesignSlots, isDesignPlayerEligibleForSlot } from '../rosterDesignFeasibility';
import {
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
    bat: { POW: 10, CON: 10, SPD: 10, FLD: 10, ARM: 10 },
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
    power: 10, contact: 10, speed: 10, fielding: 10, arm: 10,
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

  it('fails closed when a selected pin cannot match any canonical slot', () => {
    const invalid = candidate({ id: 'roleless-arm', position: 'P' });
    const result = buildSnakeAssistantBoard(engineInput({
      activePool: [...legalPool(), invalid],
      selectedPinPlayerId: invalid.playerId,
    }));
    expect(result).toEqual({ status: 'unavailable', reason: 'PIN_UNMATCHED' });
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
