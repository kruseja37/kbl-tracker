import { describe, expect, it } from 'vitest';
import { buildIdentityRoster, type SimArchetype, type SimPlayer } from '../archetypeBalanceSimulator';
import { BEST22_TUNING, buildBest22Target } from '../best22Target';
import { canCover, canRelieve, canStart, type FieldPosition } from '../../data/rosterConstruction';
import { archetypeCapShift, HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';
import {
  buildDefaultDesignSlots,
  evaluateRosterDesign,
  type DesignPoolPlayer,
  type DesignSlot,
} from '../rosterDesignFeasibility';
import type { ShapeClassification } from '../playerArchetypeClassifier';

const NEUTRAL_ARCHETYPE: SimArchetype = { name: 'Neutral', rawShift: {} };
const TIER = 'standard' as const;
const SOLVENT_BUDGET = 20_000_000;

function simPlayer(
  id: string,
  shape: Partial<SimPlayer> & { position: string; isPitcher: boolean },
  ratings = 60,
): SimPlayer {
  return {
    id,
    iv: 10_000,
    salary: 10_000,
    bat: { POW: ratings, CON: ratings, SPD: ratings, FLD: ratings, ARM: ratings },
    pit: shape.isPitcher ? { VEL: ratings, JNK: ratings, ACC: ratings } : undefined,
    ...shape,
  } as SimPlayer;
}

function classification(shape = 'Balanced'): ShapeClassification {
  return {
    shape,
    similarity: 1,
    runnerUp: null,
    runnerUpSimilarity: 0,
    levelStratum: 'regular',
    toolLevel: 60,
    tags: {
      bats: 'R',
      leftArm: false,
      utility: null,
      twoWay: false,
      platoonSides: [],
      ageBand: 'prime',
      deepArsenal: false,
      personalityGroup: 'UNKNOWN',
    },
  };
}

function legalPool(extra: SimPlayer[] = []): SimPlayer[] {
  return [
    simPlayer('c', { position: 'C', isPitcher: false }),
    simPlayer('1b', { position: '1B', isPitcher: false }),
    simPlayer('2b', { position: '2B', isPitcher: false }),
    simPlayer('3b', { position: '3B', isPitcher: false }),
    simPlayer('ss', { position: 'SS', isPitcher: false }),
    simPlayer('lf', { position: 'LF', isPitcher: false }),
    simPlayer('cf', { position: 'CF', isPitcher: false }),
    simPlayer('rf', { position: 'RF', isPitcher: false }),
    simPlayer('backup-c', { position: '1B', isPitcher: false, secondaryPosition: 'C' }),
    ...Array.from({ length: 5 }, (_, index) => simPlayer(`bench-${index}`, { position: 'LF', isPitcher: false })),
    ...Array.from({ length: 4 }, (_, index) => simPlayer(`sp-${index}`, { position: 'SP', isPitcher: true, role: 'SP' })),
    ...Array.from({ length: 4 }, (_, index) => simPlayer(`rp-${index}`, { position: 'RP', isPitcher: true, role: 'RP' })),
    ...extra,
  ];
}

function designPoolFromSim(pool: readonly SimPlayer[]): DesignPoolPlayer[] {
  return pool.map((player) => ({
    id: player.id,
    name: player.id,
    salary: player.salary,
    profile: {
      isPitcher: player.isPitcher,
      primaryPosition: player.position,
      secondaryPosition: player.secondaryPosition ?? null,
      bats: 'R',
      throws: 'R',
      age: 27,
      power: player.bat.POW,
      contact: player.bat.CON,
      speed: player.bat.SPD,
      fielding: player.bat.FLD,
      arm: player.bat.ARM,
      velocity: player.pit?.VEL,
      junk: player.pit?.JNK,
      accuracy: player.pit?.ACC,
      traits: [],
      arsenal: player.isPitcher ? ['4F', 'SL', 'CH'] : undefined,
    },
    slotPlayer: {
      isPitcher: player.isPitcher,
      position: player.position,
      role: player.role,
      secondaryPosition: player.secondaryPosition ?? null,
      twoWayVariant: player.twoWayVariant ?? null,
    },
  }));
}

function classifiedById(pool: readonly SimPlayer[], overrides: Record<string, ShapeClassification> = {}) {
  return new Map(pool.map((player) => [player.id, overrides[player.id] ?? classification()]));
}

function expectPickFitsSlot(
  pick: { playerId: string },
  slot: DesignSlot,
  poolById: ReadonlyMap<string, SimPlayer>,
): void {
  if (pick.playerId === '') return;
  const player = poolById.get(pick.playerId);
  expect(player, `${slot.slotId} pick ${pick.playerId} exists`).toBeDefined();
  if (!player) return;

  switch (slot.kind) {
    case 'pos':
      expect(player.isPitcher, `${slot.slotId} should not hold pitcher ${player.id}`).toBe(false);
      expect(player.position, `${slot.slotId} primary position`).toBe(slot.position);
      break;
    case 'backupC':
      expect(player.isPitcher, `${slot.slotId} should hold a catcher-covering hitter`).toBe(false);
      expect(canCover(player, 'C'), `${slot.slotId} catcher coverage`).toBe(true);
      break;
    case 'sp':
      expect(canStart(player), `${slot.slotId} should hold a startable pitcher, got ${player.id}`).toBe(true);
      break;
    case 'rp':
      expect(canRelieve(player), `${slot.slotId} should hold a relievable pitcher, got ${player.id}`).toBe(true);
      break;
    case 'flex':
      expect(player.isPitcher, `${slot.slotId} should hold a position player, got ${player.id}`).toBe(false);
      break;
    case 'swing':
      expect(!player.isPitcher || canRelieve(player), `${slot.slotId} swing eligibility for ${player.id}`).toBe(true);
      break;
  }
}

function expectStructuralSlotAlignment(
  target: ReturnType<typeof buildBest22Target>,
  slots: readonly DesignSlot[],
  pool: readonly SimPlayer[],
): void {
  const poolById = new Map(pool.map((player) => [player.id, player]));
  expect(target.picks).toHaveLength(slots.length);
  target.picks.forEach((pick, index) => expectPickFitsSlot(pick, slots[index], poolById));
}

function historicalSimArchetype(index: number): SimArchetype {
  const archetype = HISTORICAL_ARCHETYPES[index % HISTORICAL_ARCHETYPES.length];
  return { name: archetype.name, rawShift: archetypeCapShift(archetype) };
}

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomRatings(next: () => number): number {
  return 25 + Math.floor(next() * 71);
}

function randomizedLegalPool(seed: number): SimPlayer[] {
  const next = lcg(seed);
  const pool: SimPlayer[] = [];
  const addHitter = (id: string, position: FieldPosition, secondaryPosition?: FieldPosition) => {
    const ratings = {
      POW: randomRatings(next),
      CON: randomRatings(next),
      SPD: randomRatings(next),
      FLD: randomRatings(next),
      ARM: randomRatings(next),
    };
    pool.push({
      id,
      isPitcher: false,
      position,
      secondaryPosition: secondaryPosition ?? null,
      bat: ratings,
      iv: 2_500 + Math.floor(next() * 18_000),
      salary: 10_000,
    } as SimPlayer);
  };
  const addPitcher = (id: string, role: 'SP' | 'RP' | 'CP' | 'SP/RP') => {
    const ratings = {
      VEL: randomRatings(next),
      JNK: randomRatings(next),
      ACC: randomRatings(next),
    };
    pool.push({
      id,
      isPitcher: true,
      position: role,
      role,
      bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
      pit: ratings,
      iv: 2_500 + Math.floor(next() * 18_000),
      salary: 10_000,
    } as SimPlayer);
  };

  const positions: FieldPosition[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  for (let copy = 0; copy < 4; copy += 1) {
    positions.forEach((position) => addHitter(`s${seed}-h-${position}-${copy}`, position));
    addHitter(`s${seed}-backup-c-${copy}`, copy % 2 === 0 ? '1B' : 'LF', 'C');
  }
  for (let index = 0; index < 10; index += 1) {
    addPitcher(`s${seed}-sp-${index}`, index % 4 === 3 ? 'SP/RP' : 'SP');
    addPitcher(`s${seed}-rp-${index}`, index % 5 === 4 ? 'CP' : 'RP');
  }
  return pool;
}

describe('buildBest22Target', () => {
  it('A1: all-ANY asks are byte-identical to plain buildIdentityRoster picks', () => {
    const pool = legalPool();
    const slots = buildDefaultDesignSlots();
    const plain = buildIdentityRoster(pool, NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET, { posture: 'optimal' });
    const target = buildBest22Target(slots, pool, classifiedById(pool), NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET);

    expect(BEST22_TUNING.bonusCap).toBe(3);
    expect(target.picks.map((pick) => pick.playerId)).toEqual(plain.players.map((player) => player.id));
    expect(target.totalSalary).toBe(plain.totalSalary);
    expect(target.totalTax).toBe(plain.totalTax);
    expect(target.asksHonored).toEqual({ honored: 0, asked: 0 });
  });

  it('A2: an available asked shape lands in the asked slot and honorsAsk is true', () => {
    const askedSS = simPlayer('asked-ss', { position: 'SS', isPitcher: false });
    const pool = legalPool([askedSS]);
    const slots = buildDefaultDesignSlots().map((slot) =>
      slot.slotId === 'SS' ? { ...slot, preference: { shape: 'Defensive-Wizard', allowRunnerUp: false } } : slot,
    );
    const target = buildBest22Target(
      slots,
      pool,
      classifiedById(pool, { 'asked-ss': classification('Defensive-Wizard') }),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
    );

    const ssPick = target.picks[4];
    expect(ssPick.slotId).toBe('SS');
    expect(ssPick.playerId).toBe('asked-ss');
    expect(ssPick.honorsAsk).toBe(true);
    expect(target.asksHonored).toEqual({ honored: 1, asked: 1 });
    expect(target.feasible).toBe(true);
  });

  it('A3: an ask that would break solvency stays advisory and the floor verdict is unchanged', () => {
    const expensiveFlex = { ...simPlayer('expensive-flex', { position: 'LF', isPitcher: false }), salary: 100_000_000 };
    const pool = legalPool([expensiveFlex]);
    const slots: DesignSlot[] = buildDefaultDesignSlots().map((slot) =>
      slot.slotId === 'FLEX1' ? { ...slot, preference: { shape: 'Defensive-Wizard', allowRunnerUp: false } } : slot,
    );
    const floorPool = designPoolFromSim(pool);
    const beforeFloor = evaluateRosterDesign(slots, floorPool, SOLVENT_BUDGET);
    const target = buildBest22Target(
      slots,
      pool,
      classifiedById(pool, { 'expensive-flex': classification('Defensive-Wizard') }),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
    );
    const afterFloor = evaluateRosterDesign(slots, floorPool, SOLVENT_BUDGET);

    expect(target.feasible).toBe(true);
    expect(target.picks[17]).toMatchObject({ slotId: 'FLEX1', honorsAsk: false });
    expect(target.picks[17].playerId).not.toBe('expensive-flex');
    expect(target.asksHonored).toEqual({ honored: 0, asked: 1 });
    expect(afterFloor).toEqual(beforeFloor);
  });

  it('A4: the design frame stays index-aligned with the identity slot plan', () => {
    expect(buildDefaultDesignSlots().map((slot) => ({ kind: slot.kind, position: slot.position ?? null }))).toEqual([
      { kind: 'pos', position: 'C' },
      { kind: 'pos', position: '1B' },
      { kind: 'pos', position: '2B' },
      { kind: 'pos', position: '3B' },
      { kind: 'pos', position: 'SS' },
      { kind: 'pos', position: 'LF' },
      { kind: 'pos', position: 'CF' },
      { kind: 'pos', position: 'RF' },
      { kind: 'backupC', position: null },
      { kind: 'sp', position: null },
      { kind: 'sp', position: null },
      { kind: 'sp', position: null },
      { kind: 'sp', position: null },
      { kind: 'rp', position: null },
      { kind: 'rp', position: null },
      { kind: 'rp', position: null },
      { kind: 'rp', position: null },
      { kind: 'flex', position: null },
      { kind: 'flex', position: null },
      { kind: 'flex', position: null },
      { kind: 'flex', position: null },
      { kind: 'swing', position: null },
    ]);
  });

  it('B1: value-seeded builds report each player under their true identity slot', () => {
    const slots = buildDefaultDesignSlots();
    let feasibleBuilds = 0;

    for (let seed = 1; seed <= 72; seed += 1) {
      const pool = randomizedLegalPool(seed);
      const target = buildBest22Target(
        slots,
        pool,
        classifiedById(pool),
        historicalSimArchetype(seed),
        TIER,
        SOLVENT_BUDGET,
      );

      if (target.feasible) feasibleBuilds += 1;
      expectStructuralSlotAlignment(target, slots, pool);
    }

    expect(feasibleBuilds).toBeGreaterThan(0);
  }, 60_000);

  it('B2: starved catcher pools keep the C slot unfilled instead of index-shifting another player into it', () => {
    const pool = legalPool().filter((player) => player.position !== 'C' && player.secondaryPosition !== 'C');
    const slots = buildDefaultDesignSlots();
    const target = buildBest22Target(slots, pool, classifiedById(pool), NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET);
    const catcherPick = target.picks[0];
    const catcherPlayer = pool.find((player) => player.id === catcherPick.playerId);

    expect(target.feasible).toBe(false);
    expect(target.picks).toHaveLength(slots.length);
    expect(catcherPick.slotId).toBe('C');
    expect(catcherPick.playerId === '' || Boolean(catcherPlayer && !catcherPlayer.isPitcher && canCover(catcherPlayer, 'C')))
      .toBe(true);
  });
});
