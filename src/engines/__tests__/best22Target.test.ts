import { describe, expect, it } from 'vitest';
import { buildIdentityRoster, type SimArchetype, type SimPlayer } from '../archetypeBalanceSimulator';
import { BEST22_TUNING, buildBest22Target } from '../best22Target';
import { normalizeAuctionLuxuryCapsForLeagueSize } from '../auctionLuxuryTax';
import { luxuryTax } from '../leagueConstruction';
import { LUXURY_CAP_TABLES } from '../../data/tierParams';
import { canCover, canRelieve, canStart, isCloser, type FieldPosition } from '../../data/rosterConstruction';
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
  name?: string,
): SimPlayer {
  return {
    id,
    iv: 10_000,
    salary: 10_000,
    bat: { POW: ratings, CON: ratings, SPD: ratings, FLD: ratings, ARM: ratings },
    pit: shape.isPitcher ? { VEL: ratings, JNK: ratings, ACC: ratings } : undefined,
    ...(name ? { name } : {}),
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

function legalPool(extra: SimPlayer[] = [], names: Record<string, string> = {}): SimPlayer[] {
  return [
    simPlayer('c', { position: 'C', isPitcher: false }, 60, names.c),
    simPlayer('1b', { position: '1B', isPitcher: false }, 60, names['1b']),
    simPlayer('2b', { position: '2B', isPitcher: false }, 60, names['2b']),
    simPlayer('3b', { position: '3B', isPitcher: false }, 60, names['3b']),
    simPlayer('ss', { position: 'SS', isPitcher: false }, 60, names.ss),
    simPlayer('lf', { position: 'LF', isPitcher: false }, 60, names.lf),
    simPlayer('cf', { position: 'CF', isPitcher: false }, 60, names.cf),
    simPlayer('rf', { position: 'RF', isPitcher: false }, 60, names.rf),
    simPlayer('backup-c', { position: '1B', isPitcher: false, secondaryPosition: 'C' }, 60, names['backup-c']),
    ...Array.from({ length: 5 }, (_, index) => simPlayer(`bench-${index}`, { position: 'LF', isPitcher: false }, 60, names[`bench-${index}`])),
    ...Array.from({ length: 4 }, (_, index) => simPlayer(`sp-${index}`, { position: 'SP', isPitcher: true, role: 'SP' }, 60, names[`sp-${index}`])),
    ...Array.from({ length: 3 }, (_, index) => simPlayer(`rp-${index}`, { position: 'RP', isPitcher: true, role: 'RP' }, 60, names[`rp-${index}`])),
    simPlayer('cp-0', { position: 'CP', isPitcher: true, role: 'CP' }, 60, names['cp-0']),
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

function playerIdsForKind(
  picks: readonly { playerId: string }[],
  slots: readonly DesignSlot[],
  kind: DesignSlot['kind'],
): string[] {
  return slots.flatMap((slot, index) => (slot.kind === kind ? [picks[index].playerId] : []));
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
    case 'cp':
      expect(isCloser(player), `${slot.slotId} should hold a true closer, got ${player.id}`).toBe(true);
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
  it('NORMWIRE repro: a 2-team identity target charges the same tax as normalized settlement', () => {
    const pool = legalPool();
    const build = buildIdentityRoster(
      pool,
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      { posture: 'optimal', realTeamCount: 2 },
    );
    const normalizedCaps = normalizeAuctionLuxuryCapsForLeagueSize(LUXURY_CAP_TABLES[TIER], 2);
    const settlementTax = luxuryTax(build.players, normalizedCaps, 'taxed').charged;
    const stockCapTax = luxuryTax(build.players, LUXURY_CAP_TABLES[TIER], 'taxed').charged;

    expect(stockCapTax).toBeGreaterThan(settlementTax);
    expect(build.totalTax).toBe(settlementTax);
  });

  it('A1: all-ANY asks are byte-identical to plain buildIdentityRoster picks', () => {
    const pool = legalPool();
    const slots = buildDefaultDesignSlots();
    const plain = buildIdentityRoster(pool, NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET, { realTeamCount: 20, posture: 'optimal' });
    const target = buildBest22Target(slots, pool, classifiedById(pool), NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET, 20);

    expect(BEST22_TUNING.bonusCap).toBe(3);
    expect(target.picks.map((pick) => pick.playerId)).toEqual(plain.players.map((player) => player.id));
    expect(target.totalSalary).toBe(plain.totalSalary);
    expect(target.totalTax).toBe(plain.totalTax);
    expect(target.asksHonored).toEqual({ honored: 0, asked: 0 });
    expect(target.pins).toEqual({ honored: [], dropped: [] });
    expect(target.picks.every((pick) => pick.pinned === false)).toBe(true);
  });

  it('P1: absent and empty pins are byte-identical for identity roster and BEST-22 target picks', () => {
    const pool = legalPool();
    const slots = buildDefaultDesignSlots();
    const plainIdentity = buildIdentityRoster(pool, NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET, { realTeamCount: 20, posture: 'optimal' });
    const emptyPinnedIdentity = buildIdentityRoster(pool, NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET, {
      realTeamCount: 20,
      posture: 'optimal',
      pinned: [],
    });
    const noPinsTarget = buildBest22Target(slots, pool, classifiedById(pool), NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET, 20);
    const emptyPinsTarget = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map(),
    );

    expect(emptyPinnedIdentity).toEqual(plainIdentity);
    expect(emptyPinsTarget.picks).toEqual(noPinsTarget.picks);
    expect(emptyPinsTarget.pins).toEqual({ honored: [], dropped: [] });
    expect(emptyPinsTarget.picks.every((pick) => pick.pinned === false)).toBe(true);
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
      20,
    );

    const ssPick = target.picks[4];
    expect(ssPick.slotId).toBe('SS');
    expect(ssPick.playerId).toBe('asked-ss');
    expect(ssPick.honorsAsk).toBe(true);
    expect(target.asksHonored).toEqual({ honored: 1, asked: 1 });
    expect(target.feasible).toBe(true);
  });

  it('A2b: forwards present sim player names to target picks', () => {
    const pool = legalPool([], { ss: 'Simone Short', 'sp-0': 'Avery Ace' });
    const slots = buildDefaultDesignSlots();
    const target = buildBest22Target(slots, pool, classifiedById(pool), NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET, 20);

    expect(target.picks.find((pick) => pick.playerId === 'ss')?.playerName).toBe('Simone Short');
    expect(target.picks.find((pick) => pick.playerId === 'sp-0')?.playerName).toBe('Avery Ace');
  });

  it('R1: rankOverrides strongly nudges a comparable candidate into the GM-ranked position slot', () => {
    const gmPreferred = simPlayer('gm-preferred-ss', { position: 'SS', isPitcher: false });
    const pool = legalPool([gmPreferred]);
    const slots = buildDefaultDesignSlots();
    const baseline = buildBest22Target(slots, pool, classifiedById(pool), NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET, 20);
    const nudged = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      undefined,
      new Map([['SS', ['gm-preferred-ss', 'ss']]]),
    );

    expect(BEST22_TUNING.gmPreferenceWeight).toBe(2.5);
    expect(baseline.picks[4]).toMatchObject({ slotId: 'SS', playerId: 'ss' });
    expect(nudged.picks[4]).toMatchObject({ slotId: 'SS', playerId: 'gm-preferred-ss' });
    expect(nudged.feasible).toBe(true);
  });

  it('R2: rankOverrides are not a hard constraint when raw fit is clearly superior', () => {
    const fitArchetype: SimArchetype = {
      name: 'Power Fit',
      rawShift: { 'hitters/POW': 1 },
    };
    const superior = {
      ...simPlayer('superior-fit-ss', { position: 'SS', isPitcher: false }, 60),
      bat: { POW: 99, CON: 60, SPD: 60, FLD: 60, ARM: 60 },
    } as SimPlayer;
    const pool = legalPool([superior]).map((player) =>
      player.id === 'ss'
        ? ({ ...player, bat: { POW: 1, CON: 60, SPD: 60, FLD: 60, ARM: 60 } } as SimPlayer)
        : player,
    );
    const slots = buildDefaultDesignSlots();
    const target = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      fitArchetype,
      TIER,
      SOLVENT_BUDGET,
      20,
      undefined,
      new Map([['SS', ['ss', 'superior-fit-ss']]]),
    );

    expect(target.picks[4]).toMatchObject({ slotId: 'SS', playerId: 'superior-fit-ss' });
    expect(target.feasible).toBe(true);
  });

  it('R3: absent rankOverrides leave the existing best-22 target byte-identical', () => {
    const askedSS = simPlayer('asked-ss', { position: 'SS', isPitcher: false });
    const pool = legalPool([askedSS]);
    const slots = buildDefaultDesignSlots().map((slot) =>
      slot.slotId === 'SS' ? { ...slot, preference: { shape: 'Defensive-Wizard', allowRunnerUp: false } } : slot,
    );
    const classes = classifiedById(pool, { 'asked-ss': classification('Defensive-Wizard') });
    const noRankOverrides = buildBest22Target(
      slots,
      pool,
      classes,
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([['FLEX1', 'bench-4']]),
    );
    const emptyRankOverrides = buildBest22Target(
      slots,
      pool,
      classes,
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([['FLEX1', 'bench-4']]),
      new Map(),
    );

    expect(noRankOverrides).toEqual(emptyRankOverrides);
    expect(noRankOverrides.picks.map((pick) => pick.playerId)).toEqual(emptyRankOverrides.picks.map((pick) => pick.playerId));
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
      20,
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
      { kind: 'cp', position: null },
      { kind: 'flex', position: null },
      { kind: 'flex', position: null },
      { kind: 'flex', position: null },
      { kind: 'flex', position: null },
      { kind: 'swing', position: null },
    ]);
  });

  it('P2: an eligible pin lands in exactly that slot and nowhere else', () => {
    const pool = legalPool();
    const slots = buildDefaultDesignSlots();
    const target = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([['FLEX1', 'bench-4']]),
    );

    const flex = target.picks[17];
    expect(target.pins).toEqual({ honored: [{ slotId: 'FLEX1', playerId: 'bench-4' }], dropped: [] });
    expect(flex).toMatchObject({ slotId: 'FLEX1', playerId: 'bench-4', pinned: true });
    expect(target.picks.filter((pick) => pick.playerId === 'bench-4')).toHaveLength(1);
  });

  it('P3: an expensive pin is counted in spend and the rest recomputes around the fixed slot', () => {
    const expensive = { ...simPlayer('expensive-flex', { position: 'LF', isPitcher: false }), salary: 500_000 };
    const pool = legalPool([expensive]);
    const slots = buildDefaultDesignSlots();
    const unpinned = buildBest22Target(slots, pool, classifiedById(pool), NEUTRAL_ARCHETYPE, TIER, 600_000, 20);
    const pinned = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      600_000,
      20,
      new Map([['FLEX1', 'expensive-flex']]),
    );

    expect(pinned.picks[17]).toMatchObject({ slotId: 'FLEX1', playerId: 'expensive-flex', pinned: true });
    expect(pinned.totalSalary).toBeGreaterThanOrEqual(expensive.salary);
    expect(pinned.allIn).toBeGreaterThan(pinned.budget);
    expect(pinned.feasible).toBe(false);
    expect(pinned.picks.map((pick) => pick.playerId)).not.toEqual(unpinned.picks.map((pick) => pick.playerId));
    expect(pinned.picks.filter((pick) => pick.playerId && pick.playerId !== 'expensive-flex')).toHaveLength(21);
  });

  it('P4: invalid pins are dropped with out-of-pool, ineligible, and duplicate reasons', () => {
    const pool = legalPool();
    const slots = buildDefaultDesignSlots();
    const target = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([
        ['SS', 'missing-player'],
        ['SP1', 'ss'],
        ['FLEX1', 'bench-4'],
        ['FLEX2', 'bench-4'],
      ]),
    );

    expect(target.pins.honored).toEqual([{ slotId: 'FLEX1', playerId: 'bench-4' }]);
    expect(target.pins.dropped).toEqual([
      { slotId: 'SS', playerId: 'missing-player', reason: 'out-of-pool' },
      { slotId: 'SP1', playerId: 'ss', reason: 'ineligible' },
      { slotId: 'FLEX2', playerId: 'bench-4', reason: 'duplicate' },
    ]);
    expect(target.picks[17]).toMatchObject({ slotId: 'FLEX1', playerId: 'bench-4', pinned: true });
    expect(target.picks.filter((pick) => pick.playerId === 'missing-player' || pick.playerId === 'ss' && pick.slotId === 'SP1'))
      .toHaveLength(0);
  });

  it('P4b: pins.honored only reports pins that the engine actually placed', () => {
    const rolelessStarter = simPlayer('roleless-starter', { position: 'SP', isPitcher: true });
    const pool = legalPool([rolelessStarter]);
    const slots = buildDefaultDesignSlots();
    const rolelessPin = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([['SP1', 'roleless-starter']]),
    );
    const normalPin = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([['SP1', 'sp-0']]),
    );

    expect(rolelessPin.pins.honored).toEqual([]);
    expect(rolelessPin.pins.dropped).toEqual([
      { slotId: 'SP1', playerId: 'roleless-starter', reason: 'ineligible' },
    ]);
    expect(rolelessPin.picks[9]).toMatchObject({ slotId: 'SP1', pinned: false });
    expect(rolelessPin.picks[9].playerId).not.toBe('roleless-starter');
    expect(normalPin.pins).toEqual({ honored: [{ slotId: 'SP1', playerId: 'sp-0' }], dropped: [] });
    expect(normalPin.picks[9]).toMatchObject({ slotId: 'SP1', playerId: 'sp-0', pinned: true });
  });

  it('P5: pins are target-only; evaluateRosterDesign stays byte-identical with any pin set', () => {
    const pool = legalPool();
    const slots = buildDefaultDesignSlots();
    const floorPool = designPoolFromSim(pool);
    const before = evaluateRosterDesign(slots, floorPool, SOLVENT_BUDGET);
    buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([['SS', 'ss']]),
    );
    const after = evaluateRosterDesign(slots, floorPool, SOLVENT_BUDGET);

    expect(after).toEqual(before);
  });

  it('P6: pins outrank asks, but honorsAsk stays honest for matching and mismatching pins', () => {
    const pool = legalPool();
    const slots = buildDefaultDesignSlots().map((slot) =>
      slot.slotId === 'SS' ? { ...slot, preference: { shape: 'Defensive-Wizard', allowRunnerUp: false } } : slot,
    );
    const mismatch = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([['SS', 'ss']]),
    );
    const match = buildBest22Target(
      slots,
      pool,
      classifiedById(pool, { ss: classification('Defensive-Wizard') }),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([['SS', 'ss']]),
    );

    expect(mismatch.picks[4]).toMatchObject({ slotId: 'SS', playerId: 'ss', pinned: true, honorsAsk: false });
    expect(mismatch.asksHonored).toEqual({ honored: 0, asked: 1 });
    expect(match.picks[4]).toMatchObject({ slotId: 'SS', playerId: 'ss', pinned: true, honorsAsk: true });
    expect(match.asksHonored).toEqual({ honored: 1, asked: 1 });
  });

  it('A5: arm slots display best-first by IV without changing selection, totals, pins, or non-arm slots', () => {
    const slots = buildDefaultDesignSlots();
    const armFitArchetype: SimArchetype = {
      name: 'Arm Fit',
      rawShift: {
        'rotation/VEL': 1,
        'bullpen/VEL': 1,
      },
    };
    const armSpecs: Record<string, { iv: number; salary: number; velocity: number }> = {
      'sp-0': { iv: 40_000, salary: 10_000, velocity: 10 },
      'sp-1': { iv: 10_000, salary: 10_000, velocity: 100 },
      'sp-2': { iv: 30_000, salary: 10_000, velocity: 30 },
      'sp-3': { iv: 20_000, salary: 10_000, velocity: 70 },
      'rp-0': { iv: 40_000, salary: 10_000, velocity: 10 },
      'rp-1': { iv: 10_000, salary: 10_000, velocity: 100 },
      'rp-2': { iv: 30_000, salary: 20_000, velocity: 30 },
      'cp-0': { iv: 30_000, salary: 10_000, velocity: 70 },
    };
    const pool = legalPool().map((player) => {
      const spec = armSpecs[player.id];
      return spec
        ? ({ ...player, iv: spec.iv, salary: spec.salary, pit: { VEL: spec.velocity, JNK: 0, ACC: 0 } } as SimPlayer)
        : player;
    });
    const pinMap = new Map([['SP2', 'sp-3']]);
    const rawBuild = buildIdentityRoster(pool, armFitArchetype, TIER, SOLVENT_BUDGET, {
      realTeamCount: 20,
      posture: 'optimal',
      pinned: [{ slotIndex: 10, playerId: 'sp-3' }],
    });
    const rawBySlotIndex = new Map(rawBuild.slotPicks.map((slotPick) => [slotPick.slotIndex, slotPick.player]));
    const rawPicks = slots.map((slot, index) => {
      const player = rawBySlotIndex.get(index);
      return {
        slotId: slot.slotId ?? String(index),
        playerId: player?.id ?? '',
        salary: player?.salary ?? 0,
        honorsAsk: Boolean(player),
        pinned: index === 10 && player?.id === 'sp-3',
      };
    });
    const target = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      armFitArchetype,
      TIER,
      SOLVENT_BUDGET,
      20,
      pinMap,
    );

    expect(playerIdsForKind(rawPicks, slots, 'sp')).toEqual(['sp-1', 'sp-3', 'sp-2', 'sp-0']);
    expect(playerIdsForKind(rawPicks, slots, 'rp')).toEqual(['rp-1', 'rp-2', 'rp-0']);
    expect(playerIdsForKind(rawPicks, slots, 'cp')).toEqual(['cp-0']);
    expect(playerIdsForKind(target.picks, slots, 'sp')).toEqual(['sp-0', 'sp-2', 'sp-3', 'sp-1']);
    expect(playerIdsForKind(target.picks, slots, 'rp')).toEqual(['rp-0', 'rp-2', 'rp-1']);
    expect(playerIdsForKind(target.picks, slots, 'cp')).toEqual(['cp-0']);
    expect(target.picks[11]).toMatchObject({ slotId: 'SP3', playerId: 'sp-3', pinned: true });
    expect(target.pins).toEqual({ honored: [{ slotId: 'SP2', playerId: 'sp-3' }], dropped: [] });

    const nonArmTarget = target.picks
      .map((pick, index) => ({ kind: slots[index].kind, ...pick }))
      .filter((pick) => pick.kind !== 'sp' && pick.kind !== 'rp' && pick.kind !== 'cp')
      .map((pick) => ({
        slotId: pick.slotId,
        playerId: pick.playerId,
        salary: pick.salary,
        honorsAsk: pick.honorsAsk,
        pinned: pick.pinned,
      }));
    const nonArmRaw = rawPicks.filter((_, index) =>
      slots[index].kind !== 'sp' && slots[index].kind !== 'rp' && slots[index].kind !== 'cp',
    );
    expect(nonArmTarget).toEqual(nonArmRaw);

    const targetPlayerIds = target.picks.map((pick) => pick.playerId).filter(Boolean).sort();
    const rawPlayerIds = rawBuild.players.map((player) => player.id).sort();
    expect(targetPlayerIds).toEqual(rawPlayerIds);
    expect(new Set(targetPlayerIds).size).toBe(rawBuild.players.length);
    expect(target.totalSalary).toBe(rawBuild.totalSalary);
    expect(target.allIn).toBe(rawBuild.totalSalary + rawBuild.totalTax);
    expect(target.feasible).toBe(rawBuild.legalRoster && rawBuild.solvent && rawBuild.floorMet);
    expect(target.asksHonored).toEqual({ honored: 0, asked: 0 });
  });

  it('A6: presentation puts the highest-IV legal catcher first without changing pinned membership', () => {
    const slots = buildDefaultDesignSlots();
    const pool = legalPool()
      .filter((player) => player.id !== 'backup-c')
      .map((player) => player.id === 'c' ? { ...player, iv: 10_000 } : player)
      .concat(simPlayer('c-high', { position: 'C', isPitcher: false }, 60));
    pool.find((player) => player.id === 'c-high')!.iv = 90_000;
    const target = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([['C', 'c'], ['backupC', 'c-high']]),
    );

    expect(target.picks[0]).toMatchObject({ slotId: 'C', playerId: 'c-high', pinned: true });
    expect(target.picks[8]).toMatchObject({ slotId: 'backupC', playerId: 'c', pinned: true });
    expect(new Set(target.picks.map((pick) => pick.playerId)).size).toBe(22);
  });

  it('A7: presentation puts a higher-IV same-position flex player in the starter slot', () => {
    const slots = buildDefaultDesignSlots();
    const pool = legalPool().map((player) => {
      if (player.id === '1b') return { ...player, iv: 10_000 };
      if (player.id === 'backup-c') return { ...player, iv: 90_000 };
      return player;
    });
    const target = buildBest22Target(
      slots,
      pool,
      classifiedById(pool),
      NEUTRAL_ARCHETYPE,
      TIER,
      SOLVENT_BUDGET,
      20,
      new Map([['1B', '1b'], ['FLEX1', 'backup-c']]),
    );

    expect(target.picks[1]).toMatchObject({ slotId: '1B', playerId: 'backup-c', pinned: true });
    expect(target.picks[17]).toMatchObject({ slotId: 'FLEX1', playerId: '1b', pinned: true });
    expect(new Set(target.picks.map((pick) => pick.playerId)).size).toBe(22);
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
        20,
      );

      if (target.feasible) feasibleBuilds += 1;
      expectStructuralSlotAlignment(target, slots, pool);
    }

    expect(feasibleBuilds).toBeGreaterThan(0);
  }, 60_000);

  it('B2: starved catcher pools keep the C slot unfilled instead of index-shifting another player into it', () => {
    const pool = legalPool().filter((player) => player.position !== 'C' && player.secondaryPosition !== 'C');
    const slots = buildDefaultDesignSlots();
    const target = buildBest22Target(slots, pool, classifiedById(pool), NEUTRAL_ARCHETYPE, TIER, SOLVENT_BUDGET, 20);
    const catcherPick = target.picks[0];
    const catcherPlayer = pool.find((player) => player.id === catcherPick.playerId);

    expect(target.feasible).toBe(false);
    expect(target.picks).toHaveLength(slots.length);
    expect(catcherPick.slotId).toBe('C');
    expect(catcherPick.playerId === '' || Boolean(catcherPlayer && !catcherPlayer.isPitcher && canCover(catcherPlayer, 'C')))
      .toBe(true);
  });
});
