import { describe, expect, it, vi } from 'vitest';

import type { Player } from '../../../../../../utils/leagueBuilderStorage';
import { SNAKE_BOARD_SLOT_IDS, type SnakeSeatBoardRecord } from '../../../../../../utils/leagueBuilderStorage';
import { LUXURY_CAP_TABLES } from '../../../../../../data/tierParams';
import type { TaxonomyPosition } from '../../../../../../data/playerArchetypeTaxonomy';
import type { SnakeAssistantBoardInput, SnakeAssistantBoardPlayer } from '../../../../../../engines/snakeAssistantBoard';
import { buildDefaultDesignSlots } from '../../../../../../engines/rosterDesignFeasibility';
import type { ShapeClassification } from '../../../../../../engines/playerArchetypeClassifier';

const playerIds = Array.from({ length: 22 }, (_, index) => `p-${index}`);

vi.mock('../../../../../../engines/snakeAssistantBoard', async (loadOriginal) => {
  const original = await loadOriginal<typeof import('../../../../../../engines/snakeAssistantBoard')>();
  return {
    ...original,
    buildSnakeAssistantBoard: vi.fn(() => ({
      status: 'ready',
      teamId: 'team-a',
      slots: playerIds.map((playerId, index) => ({ slotId: index === 8 ? 'backupC' : `slot-${index}`, playerId, pinned: index === 0 })),
      playerIds,
      recommendationOrder: [...playerIds].reverse(),
      plan: { planCost: 2200, planTax: 50, planCushion: 750, playerIds },
    })),
  };
});

import {
  buildSnakeAssistantBoardRequest,
  buildSelectedPlayerConsequence,
  resolveAssistantDesignSlots,
  runSnakeAssistantBoardRequest,
  type SnakeAssistantPrivateIdentity,
} from '../snakeDeskIntelligenceModel';

const identity: SnakeAssistantPrivateIdentity = {
  sessionId: 'session', sessionRevision: 2, teamId: 'team-a', seatId: 'seat-a',
  deviceId: 'device-a', privateEpoch: 3, boardRevision: 4,
};

const GENERATED_TAX_CAPS = [{
  group: 'hitters', stat: 'POW', topN: 1, cap: 0,
  penaltyCurve: 1, penaltyPer100: 1_000, minAdder: 0,
}] as const;

function stored(id: string, chemistry: Player['chemistry']): Player {
  return { id, chemistry } as Player;
}

function engineInput(): Omit<SnakeAssistantBoardInput, 'teamId' | 'slots'> {
  return {
    activePool: playerIds.map((playerId, index) => ({
      playerId,
      frozenIv: 100 + index,
      stored: stored(playerId, index % 2 ? 'Crafty' : 'Competitive'),
      simPlayer: {} as SnakeAssistantBoardInput['activePool'][number]['simPlayer'],
      seating: {} as SnakeAssistantBoardInput['activePool'][number]['seating'],
      classification: {} as SnakeAssistantBoardInput['activePool'][number]['classification'],
    })),
    completedPicks: [],
    archetype: { name: 'Balanced', rawShift: {} },
    ownBandPriorities: { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 },
    tier: 'standard', budget: 3000, baseCaps: [], realTeamCount: 2,
  };
}

function request(overrides: Partial<Parameters<typeof buildSnakeAssistantBoardRequest>[0]> = {}) {
  return buildSnakeAssistantBoardRequest({
    identity,
    frozenPoolIdentity: 'frozen-pool',
    engineInput: engineInput(),
    ...overrides,
  });
}

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

function consequencePlayer(input: {
  id: string;
  position: Player['primaryPosition'];
  secondary?: Player['secondaryPosition'];
  role?: 'SP' | 'SP/RP' | 'RP' | 'CP';
  price?: number;
  chemistry?: Player['chemistry'];
  worth?: number;
}): SnakeAssistantBoardPlayer & { advisorWorth: number; fitWord: string; eligiblePositions: readonly TaxonomyPosition[] } {
  const pitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(input.position);
  const shape = {
    isPitcher: pitcher,
    position: input.position,
    ...(input.role ? { role: input.role } : {}),
    ...(!pitcher ? { secondaryPosition: input.secondary ?? null } : {}),
  };
  const construction = {
    id: input.id, isPitcher: pitcher, role: input.role,
    bat: { POW: 10, CON: 10, SPD: 10, FLD: 10, ARM: 10 },
    ...(pitcher ? { pit: { VEL: 10, JNK: 10, ACC: 10 } } : {}),
  };
  const storedPlayer = {
    id: input.id, firstName: input.id, lastName: 'Player', gender: 'M', age: 27, bats: 'R', throws: 'R',
    primaryPosition: input.position, secondaryPosition: input.secondary,
    power: 10, contact: 10, speed: 10, fielding: 10, arm: 10,
    velocity: 10, junk: 10, accuracy: 10, arsenal: pitcher ? ['4F'] : [], overallGrade: 'C',
    personality: 'Competitive', chemistry: input.chemistry ?? 'Competitive', morale: 50, mojo: 'Normal',
    fame: 0, salary: 999_999, leagueAssignments: [], createdDate: '', lastModified: '', isCustom: false,
  } as Player;
  return {
    playerId: input.id, frozenIv: input.price ?? 100, stored: storedPlayer,
    simPlayer: { ...construction, position: input.position, secondaryPosition: input.secondary ?? null },
    seating: { shape, construction }, classification: classification(),
    archetypeWeights: { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 },
    advisorWorth: input.worth ?? input.price ?? 100,
    fitWord: input.id.startsWith('new') ? 'STRONG FIT' : 'SOLID FIT',
    eligiblePositions: [input.position as TaxonomyPosition],
  };
}

function consequenceFixture(extra?: ReturnType<typeof consequencePlayer>) {
  const players = [
    consequencePlayer({ id: 'c', position: 'C' }), consequencePlayer({ id: '1b', position: '1B' }),
    consequencePlayer({ id: '2b', position: '2B' }), consequencePlayer({ id: '3b', position: '3B' }),
    consequencePlayer({ id: 'ss', position: 'SS' }), consequencePlayer({ id: 'lf', position: 'LF' }),
    consequencePlayer({ id: 'cf', position: 'CF' }), consequencePlayer({ id: 'rf', position: 'RF' }),
    consequencePlayer({ id: 'backup-c', position: '1B', secondary: 'C' }),
    ...Array.from({ length: 5 }, (_, index) => consequencePlayer({ id: `bench-${index}`, position: 'LF', worth: 90 - index })),
    ...Array.from({ length: 4 }, (_, index) => consequencePlayer({ id: `sp-${index}`, position: 'SP', role: 'SP' })),
    consequencePlayer({ id: 'swing-arm', position: 'SP/RP', role: 'SP/RP' }),
    consequencePlayer({ id: 'rp-1', position: 'RP', role: 'RP' }),
    consequencePlayer({ id: 'rp-2', position: 'RP', role: 'RP' }),
    consequencePlayer({ id: 'cp', position: 'CP', role: 'CP' }),
    ...(extra ? [extra] : []),
  ];
  const ids = ['c', '1b', '2b', '3b', 'ss', 'lf', 'cf', 'rf', 'backup-c',
    'sp-0', 'sp-1', 'sp-2', 'sp-3', 'swing-arm', 'rp-1', 'rp-2', 'cp',
    'bench-0', 'bench-1', 'bench-2', 'bench-3', 'bench-4'];
  const slots = Object.fromEntries(SNAKE_BOARD_SLOT_IDS.map((slotId, index) => [slotId, ids[index]])) as SnakeSeatBoardRecord['slots'];
  const board: SnakeSeatBoardRecord = {
    slots,
    rankings: {
      global: ids,
      byPosition: {
        C: ['c', 'backup-c'], '1B': ['1b', 'backup-c'], '2B': ['2b'], '3B': ['3b'], SS: ['ss'],
        LF: ['lf', 'bench-0', 'bench-1', 'bench-2', 'bench-3', 'bench-4'], CF: ['cf'], RF: ['rf'],
        SP: ['sp-0', 'sp-1', 'sp-2', 'sp-3', 'swing-arm'],
        RP: ['swing-arm', 'rp-1', 'rp-2', 'cp'],
        CP: ['cp'],
      },
    },
    revision: 4,
  };
  return { players, board };
}

describe('snake assistant board serializable adapter', () => {
  it('uses a complete selected-club design and falls back canonically when it is incomplete', () => {
    const custom = buildDefaultDesignSlots().map((slot) => ({ ...slot }));
    custom[0] = { ...custom[0], preference: { shape: 'Slugger' } };
    expect(resolveAssistantDesignSlots(custom)[0].preference?.shape).toBe('Slugger');
    expect(resolveAssistantDesignSlots(custom.slice(1))).toEqual(buildDefaultDesignSlots());
  });

  it('binds private identity, revisions, frozen prices, archetype, design and selected pin into the request key', () => {
    const baseline = request();
    expect(request().key).toBe(baseline.key);
    expect(request({ identity: { ...identity, deviceId: 'device-b' } }).key).not.toBe(baseline.key);
    expect(request({ identity: { ...identity, sessionRevision: 9 } }).key).not.toBe(baseline.key);
    expect(request({ identity: { ...identity, boardRevision: 9 } }).key).not.toBe(baseline.key);
    const priceChanged = engineInput();
    priceChanged.activePool[0].frozenIv += 1;
    expect(request({ engineInput: priceChanged }).key).not.toBe(baseline.key);
    const pinChanged = engineInput();
    pinChanged.selectedPinPlayerId = 'p-4';
    expect(request({ engineInput: pinChanged }).key).not.toBe(baseline.key);
    const archetypeChanged = engineInput();
    archetypeChanged.archetype = { name: 'Other', rawShift: { 'hitters/POW': 0.1 } };
    expect(request({ engineInput: archetypeChanged }).key).not.toBe(baseline.key);
    const traitChanged = engineInput();
    traitChanged.activePool[0].stored.trait1 = 'K Collector';
    expect(request({ engineInput: traitChanged }).key).not.toBe(baseline.key);
    const ratingChanged = engineInput();
    ratingChanged.activePool[0].stored.power = 99;
    expect(request({ engineInput: ratingChanged }).key).not.toBe(baseline.key);
    const classificationChanged = engineInput();
    classificationChanged.activePool[0].classification = {
      ...classificationChanged.activePool[0].classification,
      similarity: 0.75,
    };
    expect(request({ engineInput: classificationChanged }).key).not.toBe(baseline.key);
  });

  it('owns an isolated input snapshot so later caller mutation cannot change truth under the same key', () => {
    const source = engineInput();
    const savedSlots = buildDefaultDesignSlots();
    const built = request({ engineInput: source, savedDesignSlots: savedSlots });
    const isolatedInput = structuredClone(built.input);
    const isolatedOutput = runSnakeAssistantBoardRequest(built);

    source.activePool[0].frozenIv = 999_999;
    source.activePool[0].stored.chemistry = 'Disciplined';
    source.activePool[0].stored.trait1 = 'K Collector';
    source.activePool[0].stored.power = 99;
    savedSlots[0].preference = { shape: 'Slugger' };

    expect(built.input).toEqual(isolatedInput);
    expect(runSnakeAssistantBoardRequest(built)).toEqual(isolatedOutput);
    expect(built.key).toBe(request({ engineInput: isolatedInput, savedDesignSlots: isolatedInput.slots }).key);
  });

  it('rejects a request payload that cannot be safely copied to the worker', () => {
    const invalid = engineInput() as ReturnType<typeof engineInput> & { callback?: () => void };
    invalid.callback = () => undefined;
    expect(() => request({ engineInput: invalid })).toThrow('structured-clone serializable');
  });

  it('exposes a read-only derived shape with exact ledger and all five chemistry families, never a board revision', () => {
    const result = runSnakeAssistantBoardRequest(request());
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.board.ledger).toEqual({ rosterCount: 22, salary: 2200, tax: 50, allIn: 2250, moneyLeft: 750 });
    expect(result.board.chemistry).toEqual([
      { family: 'CMP', word: 'Competitive', count: 11, tier: 'L3' },
      { family: 'SPI', word: 'Spirited', count: 0, tier: 'L1' },
      { family: 'CRA', word: 'Crafty', count: 11, tier: 'L3' },
      { family: 'SCH', word: 'Scholarly', count: 0, tier: 'L1' },
      { family: 'DIS', word: 'Disciplined', count: 0, tier: 'L1' },
    ]);
    expect(result.board).not.toHaveProperty('revision');
    expect(result.board.slots).toBeInstanceOf(Array);
    expect(result.board.slots[8].slotId).toBe('BACKUP_C');
    expect(result.board.kind).toBe('snake-assistant-board');
  });

  it('downgrades a raw strong fit when the exact replacement materially raises 22-player tax', () => {
    const selected = consequencePlayer({ id: 'new-ss-tax-heavy', position: 'SS', price: 50 });
    selected.seating.construction.bat.POW = 99;
    selected.simPlayer.bat.POW = 99;
    selected.stored.power = 99;
    const fixture = consequenceFixture(selected);
    const result = buildSelectedPlayerConsequence({
      identity,
      selectedPlayerId: selected.playerId,
      teamId: 'team-a',
      board: fixture.board,
      designSlots: buildDefaultDesignSlots(),
      players: fixture.players,
      completedPicks: [],
      budget: 1_000_000,
      baseCaps: [{
        group: 'hitters', stat: 'POW', topN: 1, cap: 0,
        penaltyCurve: 1, penaltyPer100: 100_000, minAdder: 0,
      }],
      realTeamCount: 2,
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.after.ledger.tax).toBeGreaterThan(result.before.ledger.tax);
    expect(result.after.fitWord).toBe('WEAK FIT');
  });

  it('produces identical request and derived output for main and companion adapters with identical inputs', () => {
    const main = request();
    const companion = request();
    expect(companion).toEqual(main);
    expect(runSnakeAssistantBoardRequest(companion)).toEqual(runSnakeAssistantBoardRequest(main));
  });

  it('prices one deterministic selected-player displacement with exact finance, five chemistry families, and legal-finish deltas', () => {
    const selected = consequencePlayer({ id: 'new-ss', position: 'SS', price: 50, chemistry: 'Scholarly' });
    const fixture = consequenceFixture(selected);
    const result = buildSelectedPlayerConsequence({
      identity,
      selectedPlayerId: selected.playerId,
      teamId: 'team-a',
      board: fixture.board,
      designSlots: buildDefaultDesignSlots(),
      players: fixture.players,
      completedPicks: [],
      budget: 1_000_000,
      baseCaps: GENERATED_TAX_CAPS,
      realTeamCount: 2,
    });
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.displacedPlayerId).toBe('bench-4');
    expect(result.reassignedSlotIds).toHaveLength(1);
    expect(result.before.ledger).toEqual({ rosterCount: 22, salary: 2_200, tax: 100, allIn: 2_300, moneyLeft: 997_700 });
    expect(result.after.ledger).toEqual({ rosterCount: 22, salary: 2_150, tax: 100, allIn: 2_250, moneyLeft: 997_750 });
    expect(result.before.chemistry).toHaveLength(5);
    expect(result.after.chemistry).toHaveLength(5);
    expect(result.after.chemistry.find((row) => row.family === 'SCH')?.count).toBe(1);
    expect(result.before.legalFinish).toEqual({
      feasible: true, moneyLeft: 997_750, affordability: 'AFFORDABLE',
    });
    expect(result.after.legalFinish).toEqual({
      feasible: true, moneyLeft: 997_750, affordability: 'AFFORDABLE',
    });
    expect(result.before.fitWord).toBe('SOLID FIT');
    expect(result.after.fitWord).toBe('STRONG FIT');
    expect(new Set(Object.values(result.board.slots)).size).toBe(22);
    expect(result.board.revision).toBe(fixture.board.revision + 1);
  });

  it('rejects the old permissive FLEX placement for a fifth pure starter and chooses a canonical SP displacement', () => {
    const selected = consequencePlayer({ id: 'new-sp', position: 'SP', role: 'SP', price: 50 });
    const fixture = consequenceFixture(selected);
    const result = buildSelectedPlayerConsequence({
      identity,
      selectedPlayerId: selected.playerId,
      teamId: 'team-a',
      board: fixture.board,
      players: fixture.players,
      completedPicks: [],
      budget: 1_000_000,
      baseCaps: LUXURY_CAP_TABLES.standard,
      realTeamCount: 2,
    });
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.displacedSlotId).toBe('SP4');
    expect(result.board.slots.SP4).toBe(selected.playerId);
    expect(result.board.slots.FLEX1).toBe(fixture.board.slots.FLEX1);
    expect(result.board.slots.FLEX2).toBe(fixture.board.slots.FLEX2);
    expect(result.board.slots.FLEX3).toBe(fixture.board.slots.FLEX3);
    expect(result.board.slots.FLEX4).toBe(fixture.board.slots.FLEX4);
  });

  it('rejects a fifth pure starter inherited in FLEX when no displaced 22 can receive a complete exact-slot matching', () => {
    const selected = consequencePlayer({ id: 'new-sp', position: 'SP', role: 'SP', price: 50 });
    const inheritedFifthStarter = consequencePlayer({ id: 'fifth-sp', position: 'SP', role: 'SP' });
    const fixture = consequenceFixture(selected);
    fixture.players.push(inheritedFifthStarter);
    fixture.board.slots.FLEX1 = inheritedFifthStarter.playerId;
    const result = buildSelectedPlayerConsequence({
      identity,
      selectedPlayerId: selected.playerId,
      teamId: 'team-a',
      board: fixture.board,
      players: fixture.players,
      completedPicks: [],
      budget: 1_000_000,
      baseCaps: LUXURY_CAP_TABLES.standard,
      realTeamCount: 2,
    });
    expect(result).toEqual({ status: 'unavailable', selectedPlayerId: selected.playerId });
  });

  it('repairs a fixable inherited FLEX/SP layout through the minimum-change full canonical matching', () => {
    const selected = consequencePlayer({ id: 'new-ss', position: 'SS', price: 50 });
    const fixture = consequenceFixture(selected);
    const formerSp4 = fixture.board.slots.SP4;
    const formerFlex1 = fixture.board.slots.FLEX1;
    fixture.board.slots.SP4 = formerFlex1;
    fixture.board.slots.FLEX1 = formerSp4;
    const result = buildSelectedPlayerConsequence({
      identity,
      selectedPlayerId: selected.playerId,
      teamId: 'team-a',
      board: fixture.board,
      players: fixture.players,
      completedPicks: [],
      budget: 1_000_000,
      baseCaps: LUXURY_CAP_TABLES.standard,
      realTeamCount: 2,
    });
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.board.slots.SP4).toBe(formerSp4);
    expect(result.board.slots.FLEX1).not.toBe(formerSp4);
    expect(result.reassignedSlotIds).toContain('SP4');
    expect(result.reassignedSlotIds).toContain('FLEX1');
  });

  it('applies overall rank, contextual worth, then canonical slot order after position-rank ties', () => {
    const selectedShortstop = consequencePlayer({ id: 'new-ss', position: 'SS', price: 50 });
    const overallFixture = consequenceFixture(selectedShortstop);
    overallFixture.board.rankings.byPosition = {};
    const overall = buildSelectedPlayerConsequence({
      identity, selectedPlayerId: selectedShortstop.playerId, teamId: 'team-a',
      board: overallFixture.board, players: overallFixture.players, completedPicks: [],
      budget: 1_000_000, baseCaps: LUXURY_CAP_TABLES.standard, realTeamCount: 2,
    });
    expect(overall.status).toBe('ready');
    if (overall.status !== 'ready') return;
    expect(overall.displacedPlayerId).toBe('bench-4');

    const worthFixture = consequenceFixture(selectedShortstop);
    worthFixture.board.rankings.byPosition = {};
    worthFixture.board.rankings.global = [];
    for (const player of worthFixture.players) player.advisorWorth = player.playerId === 'bench-2' ? 1 : 100;
    const worth = buildSelectedPlayerConsequence({
      identity, selectedPlayerId: selectedShortstop.playerId, teamId: 'team-a',
      board: worthFixture.board, players: worthFixture.players, completedPicks: [],
      budget: 1_000_000, baseCaps: LUXURY_CAP_TABLES.standard, realTeamCount: 2,
    });
    expect(worth.status).toBe('ready');
    if (worth.status !== 'ready') return;
    expect(worth.displacedPlayerId).toBe('bench-2');

    const selectedLeftFielder = consequencePlayer({ id: 'new-lf', position: 'LF', price: 50 });
    const slotFixture = consequenceFixture(selectedLeftFielder);
    slotFixture.board.rankings.byPosition = {};
    slotFixture.board.rankings.global = [];
    for (const player of slotFixture.players) player.advisorWorth = 100;
    const slot = buildSelectedPlayerConsequence({
      identity, selectedPlayerId: selectedLeftFielder.playerId, teamId: 'team-a',
      board: slotFixture.board, players: slotFixture.players, completedPicks: [],
      budget: 1_000_000, baseCaps: LUXURY_CAP_TABLES.standard, realTeamCount: 2,
    });
    expect(slot.status).toBe('ready');
    if (slot.status !== 'ready') return;
    expect(slot.displacedSlotId).toBe('LF');
    expect(slot.displacedPlayerId).toBe('lf');
  });

  it('uses the same shortest multi-position reassignment on repeated runs', () => {
    const selected = consequencePlayer({ id: 'new-cp', position: 'CP', role: 'CP', price: 50 });
    const swingReliever = consequencePlayer({ id: 'swing-rp', position: 'RP', role: 'RP' });
    const fixture = consequenceFixture(selected);
    fixture.players.push(swingReliever);
    fixture.board.slots.SWING = swingReliever.playerId;
    fixture.board.rankings.byPosition = {
      ...fixture.board.rankings.byPosition,
      RP: ['swing-rp', 'rp-1', 'rp-2', 'cp', 'swing-arm'],
      'SP/RP': ['swing-arm'],
    };
    const input = {
      identity,
      selectedPlayerId: selected.playerId,
      teamId: 'team-a',
      board: fixture.board,
      players: fixture.players,
      completedPicks: [],
      budget: 1_000_000,
      baseCaps: LUXURY_CAP_TABLES.standard,
      realTeamCount: 2,
    } as const;
    const first = buildSelectedPlayerConsequence(input);
    const second = buildSelectedPlayerConsequence(structuredClone(input));
    expect(first).toEqual(second);
    expect(first.status).toBe('ready');
    if (first.status !== 'ready') return;
    expect(first.displacedSlotId).toBe('SP4');
    expect(first.reassignedSlotIds).toEqual(['SP4', 'RP1']);
    expect(first.board.slots.SP4).toBe('swing-arm');
    expect(first.board.slots.RP1).toBe('new-cp');
  });

  it('offers no replacement for a player already on My Board and fails closed on stale board identity', () => {
    const fixture = consequenceFixture();
    const common = {
      identity,
      teamId: 'team-a',
      board: fixture.board,
      players: fixture.players,
      completedPicks: [],
      budget: 1_000_000,
      baseCaps: LUXURY_CAP_TABLES.standard,
      realTeamCount: 2,
    } as const;
    expect(buildSelectedPlayerConsequence({ ...common, selectedPlayerId: 'ss' })).toEqual({
      status: 'already-on-board', selectedPlayerId: 'ss',
    });
    expect(buildSelectedPlayerConsequence({
      ...common,
      selectedPlayerId: 'ss',
      completedPicks: [{ teamId: 'team-b', playerId: 'ss', settledSalary: 100 }],
    })).toEqual({ status: 'unavailable', selectedPlayerId: 'ss' });
    expect(buildSelectedPlayerConsequence({
      ...common,
      selectedPlayerId: '1b',
      completedPicks: [{ teamId: 'team-b', playerId: 'missing-truth', settledSalary: 100 }],
    })).toEqual({ status: 'unavailable', selectedPlayerId: '1b' });
    expect(buildSelectedPlayerConsequence({
      ...common,
      identity: { ...identity, boardRevision: 3 },
      selectedPlayerId: 'not-there',
    })).toEqual({ status: 'unavailable', selectedPlayerId: 'not-there' });
  });
});
