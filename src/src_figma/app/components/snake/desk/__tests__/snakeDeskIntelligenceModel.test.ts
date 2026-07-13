import { describe, expect, it, vi } from 'vitest';

import type { Player } from '../../../../../../utils/leagueBuilderStorage';
import type { SnakeAssistantBoardInput } from '../../../../../../engines/snakeAssistantBoard';
import { buildDefaultDesignSlots } from '../../../../../../engines/rosterDesignFeasibility';

const playerIds = Array.from({ length: 22 }, (_, index) => `p-${index}`);

vi.mock('../../../../../../engines/snakeAssistantBoard', async (loadOriginal) => {
  const original = await loadOriginal<typeof import('../../../../../../engines/snakeAssistantBoard')>();
  return {
    ...original,
    buildSnakeAssistantBoard: vi.fn(() => ({
      status: 'ready',
      teamId: 'team-a',
      slots: playerIds.map((playerId, index) => ({ slotId: `slot-${index}`, playerId, pinned: index === 0 })),
      playerIds,
      recommendationOrder: [...playerIds].reverse(),
      plan: { planCost: 2200, planTax: 50, planCushion: 750, playerIds },
    })),
  };
});

import {
  buildSnakeAssistantBoardRequest,
  resolveAssistantDesignSlots,
  runSnakeAssistantBoardRequest,
  type SnakeAssistantPrivateIdentity,
} from '../snakeDeskIntelligenceModel';

const identity: SnakeAssistantPrivateIdentity = {
  sessionId: 'session', sessionRevision: 2, teamId: 'team-a', seatId: 'seat-a',
  deviceId: 'device-a', privateEpoch: 3, boardRevision: 4,
};

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
    expect(result.board.kind).toBe('snake-assistant-board');
  });

  it('produces identical request and derived output for main and companion adapters with identical inputs', () => {
    const main = request();
    const companion = request();
    expect(companion).toEqual(main);
    expect(runSnakeAssistantBoardRequest(companion)).toEqual(runSnakeAssistantBoardRequest(main));
  });
});
