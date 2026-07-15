import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SnakeAssistantBoardRequest } from '../snakeDeskIntelligenceModel';
import type { Player } from '../../../../../../utils/leagueBuilderStorage';
import { LUXURY_CAP_TABLES } from '../../../../../../data/tierParams';
import { buildDefaultDesignSlots } from '../../../../../../engines/rosterDesignFeasibility';
import {
  useSnakeAssistantBoard,
  type SnakeAssistantBoardWorkerResponse,
} from '../useSnakeAssistantBoard';
import { runSnakeAssistantBoardRequest } from '../snakeDeskIntelligenceModel';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<SnakeAssistantBoardWorkerResponse>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(value: unknown) { this.posted.push(value); }
  terminate() { this.terminated = true; }
}

const LIVE_SPECS = [
  ['p-c', 'C'], ['p-1b', '1B'], ['p-2b', '2B'], ['p-3b', '3B'],
  ['p-ss', 'SS'], ['p-lf', 'LF'], ['p-cf', 'CF'], ['p-rf', 'RF'],
  ['p-backup', '1B', undefined, 'C'],
  ...Array.from({ length: 4 }, (_, index) => [`p-sp-${index}`, 'SP', 'SP']),
  ...Array.from({ length: 3 }, (_, index) => [`p-rp-${index}`, 'RP', 'RP']),
  ['p-cp', 'CP', 'CP'],
  ['p-flex-0', '1B'], ['p-flex-1', '2B'], ['p-flex-2', '3B'], ['p-flex-3', 'SS'],
  ['p-swing', 'LF'],
] as const;

function livePlayer(spec: readonly [
  string,
  Player['primaryPosition'],
  ('SP' | 'SP/RP' | 'RP' | 'CP')?,
  Player['secondaryPosition']?,
]): SnakeAssistantBoardRequest['input']['activePool'][number] {
  const [playerId, position, role, secondaryPosition] = spec;
  const isPitcher = Boolean(role);
  const construction = {
    id: playerId,
    isPitcher,
    ...(role ? { role } : {}),
    bat: { POW: 10, CON: 10, SPD: 10, FLD: 10, ARM: 10 },
    ...(isPitcher ? { pit: { VEL: 10, JNK: 10, ACC: 10 } } : {}),
  };
  const stored = {
    id: playerId, sourceId: `stock:${playerId}`, versionGroupId: `version:${playerId}`,
    firstName: playerId, lastName: 'Player', gender: 'M', age: 27, bats: 'R', throws: 'R',
    primaryPosition: position, secondaryPosition,
    power: 10, contact: 10, speed: 10, fielding: 10, arm: 10,
    velocity: 10, junk: 10, accuracy: 10, arsenal: isPitcher ? ['4F'] : [],
    overallGrade: 'C', personality: 'Competitive', chemistry: 'Competitive',
    morale: 50, mojo: 'Normal', fame: 0, salary: 999_999,
    leagueAssignments: [], createdDate: '', lastModified: '', isCustom: false,
  } as Player;
  return {
    playerId,
    sourceId: `stock:${playerId}`,
    versionGroupId: `version:${playerId}`,
    frozenIv: 5,
    stored,
    simPlayer: {
      ...construction,
      position,
      secondaryPosition: secondaryPosition ?? null,
    },
    seating: {
      shape: {
        isPitcher,
        position,
        ...(role ? { role } : { secondaryPosition: secondaryPosition ?? null }),
      },
      construction,
    },
    classification: {
      shape: 'Balanced', similarity: 1, runnerUp: null, runnerUpSimilarity: 0,
      levelStratum: 'regular', toolLevel: 50,
      tags: {
        bats: 'R', leftArm: false, utility: null, twoWay: false, platoonSides: [],
        ageBand: 'prime', deepArsenal: false, personalityGroup: 'STEADY',
      },
    },
    archetypeWeights: { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 },
  };
}

function request(key: string, selectedPinPlayerId: string | null = null): SnakeAssistantBoardRequest {
  return {
    key,
    input: {
      teamId: 'team-a',
      selectedPinPlayerId,
      activePool: LIVE_SPECS.map(livePlayer),
      completedPicks: [],
      versionSelections: {},
      slots: buildDefaultDesignSlots(),
      archetype: { name: 'Balanced', rawShift: {} },
      ownBandPriorities: { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 },
      tier: 'standard',
      budget: 1_000,
      baseCaps: LUXURY_CAP_TABLES.standard,
      realTeamCount: 2,
    },
  };
}

function ready(
  key: string,
  teamId = 'team-a',
  selectedPinPlayerId: string | null = null,
): SnakeAssistantBoardWorkerResponse {
  const playerIds = LIVE_SPECS.map(([playerId]) => playerId);
  const designSlots = buildDefaultDesignSlots();
  return {
    key,
    result: {
      status: 'ready',
      board: {
        kind: 'snake-assistant-board', teamId,
        slots: playerIds.map((playerId, index) => ({
          slotId: designSlots[index].slotId,
          playerId,
          pinned: playerId === selectedPinPlayerId,
        })),
        playerIds,
        recommendationOrder: playerIds,
        ledger: { rosterCount: 22, salary: 110, tax: 0, allIn: 110, moneyLeft: 890 },
        chemistry: [
          { family: 'CMP', word: 'Competitive', count: 22, tier: 'L3' },
          { family: 'SPI', word: 'Spirited', count: 0, tier: 'L1' },
          { family: 'CRA', word: 'Crafty', count: 0, tier: 'L1' },
          { family: 'SCH', word: 'Scholarly', count: 0, tier: 'L1' },
          { family: 'DIS', word: 'Disciplined', count: 0, tier: 'L1' },
        ],
      },
    },
  };
}

function Harness({ value }: { value: SnakeAssistantBoardRequest | null }) {
  const state = useSnakeAssistantBoard(value);
  return <p>{state.board?.teamId ?? state.infeasibleReason ?? state.status.toUpperCase()}</p>;
}

describe('snake assistant board worker hook', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('publishes only a matching background result', () => {
    render(<Harness value={request('a')} />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    const worker = FakeWorker.instances[0];
    act(() => worker.onmessage?.({ data: ready('a', 'team-a') } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('team-a')).toBeInTheDocument();
    expect(worker.terminated).toBe(true);
  });

  it('keeps pending and ready state bound to the semantic key across cloned request objects', () => {
    const original = request('semantic-a');
    const view = render(<Harness value={original} />);
    const worker = FakeWorker.instances[0];

    view.rerender(<Harness value={{ ...original }} />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(FakeWorker.instances).toHaveLength(1);

    act(() => worker.onmessage?.({
      data: ready('semantic-a', 'team-a'),
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('team-a')).toBeInTheDocument();

    view.rerender(<Harness value={{ ...original }} />);
    expect(screen.getByText('team-a')).toBeInTheDocument();
    expect(FakeWorker.instances).toHaveLength(1);
  });

  it('cancels rapid request churn and lets only the newest board settle', () => {
    const view = render(<Harness value={request('rank-a')} />);
    const first = FakeWorker.instances[0];

    view.rerender(<Harness value={request('rank-b')} />);
    const second = FakeWorker.instances[1];
    view.rerender(<Harness value={request('rank-c')} />);
    const latest = FakeWorker.instances[2];

    expect(first.terminated).toBe(true);
    expect(second.terminated).toBe(true);
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    act(() => first.onmessage?.({ data: ready('rank-a') } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    act(() => second.onmessage?.({ data: ready('rank-b') } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    act(() => latest.onmessage?.({ data: ready('rank-c') } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('team-a')).toBeInTheDocument();
    expect(latest.terminated).toBe(true);
  });

  it('accepts a real canonical READY result whose recommendation includes unslotted available players', () => {
    const value = request('canonical-extra-candidates');
    value.input.activePool = [
      ...LIVE_SPECS,
      ['p-extra-lf', 'LF'],
      ['p-extra-rp', 'RP', 'RP'],
    ].map((spec) => livePlayer(spec as Parameters<typeof livePlayer>[0]));
    const result = runSnakeAssistantBoardRequest(value);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.board.playerIds).toHaveLength(22);
    expect(result.board.recommendationOrder.length).toBeGreaterThan(22);
    expect(result.board.recommendationOrder.every((playerId) => (
      value.input.activePool.some((player) => player.playerId === playerId)
    ))).toBe(true);

    render(<Harness value={value} />);
    act(() => FakeWorker.instances[0].onmessage?.({
      data: { key: value.key, result },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('team-a')).toBeInTheDocument();
  });

  it('clears prior private truth and recomputes even when cover re-enters with the exact same key object', () => {
    const sameRequest = request('a');
    const view = render(<Harness value={sameRequest} />);
    const oldWorker = FakeWorker.instances[0];
    act(() => oldWorker.onmessage?.({ data: ready('a', 'team-a') } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('team-a')).toBeInTheDocument();

    view.rerender(<Harness value={null} />);
    expect(screen.getByText('IDLE')).toBeInTheDocument();
    expect(screen.queryByText('team-a')).not.toBeInTheDocument();

    view.rerender(<Harness value={sameRequest} />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.queryByText('team-a')).not.toBeInTheDocument();
    expect(FakeWorker.instances).toHaveLength(2);
    const freshWorker = FakeWorker.instances[1];
    act(() => oldWorker.onmessage?.({ data: ready('a', 'leaked-team') } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    act(() => freshWorker.onmessage?.({ data: ready('a') } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('team-a')).toBeInTheDocument();
  });

  it('fails closed on worker error or missing worker support', () => {
    const view = render(<Harness value={request('a')} />);
    act(() => FakeWorker.instances[0].onerror?.(new Event('error')));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    cleanup();
    vi.stubGlobal('Worker', undefined);
    view.unmount();
    render(<Harness value={request('b')} />);
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
  });

  it('exposes an ambiguous pin infeasibility only after the exact unpinned baseline is READY', () => {
    const view = render(<Harness value={request('pin', 'p-c')} />);
    const worker = FakeWorker.instances[0];
    expect(worker.posted).toEqual([request('pin', 'p-c')]);
    act(() => worker.onmessage?.({
      data: { key: 'pin', result: { status: 'unavailable', reason: 'PIN_UNMATCHED' } },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(worker.posted).toEqual([
      request('pin', 'p-c'),
      { ...request('pin', 'p-c'), key: 'pin:unpinned-baseline', input: { ...request('pin', 'p-c').input, selectedPinPlayerId: null } },
    ]);
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByText('PIN_UNMATCHED')).not.toBeInTheDocument();
    act(() => worker.onmessage?.({
      data: ready('pin:unpinned-baseline'),
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('PIN_UNMATCHED')).toBeInTheDocument();

    view.rerender(<Harness value={request('generic', 'p-c')} />);
    act(() => FakeWorker.instances[1].onmessage?.({
      data: { key: 'generic', result: { status: 'unavailable', reason: 'INSOLVENT_BOARD' } },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByText('INSOLVENT_BOARD')).not.toBeInTheDocument();

    view.rerender(<Harness value={request('transport', 'p-c')} />);
    act(() => FakeWorker.instances[2].onerror?.(new Event('error')));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByText('PIN_UNMATCHED')).not.toBeInTheDocument();

    view.rerender(<Harness value={request('no-pin')} />);
    act(() => FakeWorker.instances[3].onmessage?.({
      data: { key: 'no-pin', result: { status: 'unavailable', reason: 'INSOLVENT_BOARD' } },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
  });

  it('requires the unpinned baseline to preserve only exact own-pick pins', () => {
    const selectedStillPinned = request('baseline-selected-still-pinned', 'p-c');
    let view = render(<Harness value={selectedStillPinned} />);
    let worker = FakeWorker.instances.at(-1)!;
    act(() => worker.onmessage?.({
      data: { key: selectedStillPinned.key, result: { status: 'unavailable', reason: 'PIN_UNMATCHED' } },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    act(() => worker.onmessage?.({
      data: ready(`${selectedStillPinned.key}:unpinned-baseline`, 'team-a', 'p-c'),
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByText('PIN_UNMATCHED')).not.toBeInTheDocument();

    view.unmount();
    const ownPickDropped = request('baseline-own-pick-dropped', 'p-1b');
    ownPickDropped.input.completedPicks = [{ teamId: 'team-a', playerId: 'p-c', settledSalary: 5 }];
    view = render(<Harness value={ownPickDropped} />);
    worker = FakeWorker.instances.at(-1)!;
    act(() => worker.onmessage?.({
      data: { key: ownPickDropped.key, result: { status: 'unavailable', reason: 'DROPPED_PIN' } },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    act(() => worker.onmessage?.({
      data: ready(`${ownPickDropped.key}:unpinned-baseline`),
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByText('DROPPED_PIN')).not.toBeInTheDocument();

    view.unmount();
    const clean = request('baseline-exact-own-pin', 'p-1b');
    clean.input.completedPicks = [{ teamId: 'team-a', playerId: 'p-c', settledSalary: 5 }];
    render(<Harness value={clean} />);
    worker = FakeWorker.instances.at(-1)!;
    act(() => worker.onmessage?.({
      data: { key: clean.key, result: { status: 'unavailable', reason: 'PIN_UNMATCHED' } },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    act(() => worker.onmessage?.({
      data: ready(`${clean.key}:unpinned-baseline`, 'team-a', 'p-c'),
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('PIN_UNMATCHED')).toBeInTheDocument();
  });

  it('does not let an own-pick matching failure, stale baseline, or malformed unavailable payload prove selected-pin causality', () => {
    const ownPickFailure = request('own-pick-failure', 'p-c');
    ownPickFailure.input.completedPicks = [{ teamId: 'team-a', playerId: 'p-c', settledSalary: 5 }];
    const view = render(<Harness value={ownPickFailure} />);
    const ownWorker = FakeWorker.instances[0];
    act(() => ownWorker.onmessage?.({
      data: { key: ownPickFailure.key, result: { status: 'unavailable', reason: 'PIN_UNMATCHED' } },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    act(() => ownWorker.onmessage?.({
      data: { key: `${ownPickFailure.key}:unpinned-baseline`, result: { status: 'unavailable', reason: 'PIN_UNMATCHED' } },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByText('PIN_UNMATCHED')).not.toBeInTheDocument();

    view.rerender(<Harness value={request('fresh-pin', 'p-c')} />);
    const freshWorker = FakeWorker.instances[1];
    act(() => freshWorker.onmessage?.({
      data: { key: 'fresh-pin', result: { status: 'unavailable', reason: 'DROPPED_PIN' } },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    act(() => freshWorker.onmessage?.({
      data: ready(`${ownPickFailure.key}:unpinned-baseline`),
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();

    view.rerender(<Harness value={request('malformed-pin', 'p-c')} />);
    const malformedWorker = FakeWorker.instances[2];
    act(() => malformedWorker.onmessage?.({
      data: {
        key: 'malformed-pin',
        result: { status: 'unavailable', reason: 'PIN_UNMATCHED', board: ready('malformed-pin').result },
      },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByText('PIN_UNMATCHED')).not.toBeInTheDocument();
  });

  it('rejects a malformed current ready result and never revives a stale result', () => {
    const view = render(<Harness value={request('a')} />);
    const first = FakeWorker.instances[0];
    act(() => first.onmessage?.({
      data: {
        ...ready('a'),
        result: { ...ready('a').result, board: { ...(ready('a').result as { status: 'ready'; board: object }).board, slots: [] } },
      },
    } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();

    view.rerender(<Harness value={request('b')} />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    act(() => first.onmessage?.({ data: ready('a') } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('rejects incomplete recommendation, ledger, and chemistry shapes', () => {
    const malformed = [
      { recommendationOrder: ['p-0'] },
      { ledger: { rosterCount: 21, salary: 1, tax: 0, allIn: 1, moneyLeft: 1 } },
      { chemistry: [
        { family: 'CMP', word: 'Spirited', count: 1, tier: 'L1' },
        { family: 'SPI', word: 'Spirited', count: 1, tier: 'L1' },
        { family: 'CRA', word: 'Crafty', count: 1, tier: 'L1' },
        { family: 'SCH', word: 'Scholarly', count: 1, tier: 'L1' },
        { family: 'DIS', word: 'Disciplined', count: 1, tier: 'L1' },
      ] },
    ];
    malformed.forEach((boardOverride, index) => {
      cleanup();
      render(<Harness value={request(`bad-${index}`)} />);
      const response = ready(`bad-${index}`);
      if (response.result.status !== 'ready') throw new Error('Expected ready fixture.');
      act(() => FakeWorker.instances.at(-1)?.onmessage?.({
        data: { ...response, result: { ...response.result, board: { ...response.result.board, ...boardOverride } } },
      } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
      expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    });
  });

  it('rejects arbitrary extra own keys throughout a READY worker payload', () => {
    const mutate = [
      (response: SnakeAssistantBoardWorkerResponse) => ({
        ...response,
        result: { ...response.result, unexpectedResultTruth: true },
      }),
      (response: SnakeAssistantBoardWorkerResponse) => {
        if (response.result.status !== 'ready') throw new Error('Expected ready fixture.');
        return { ...response, result: { ...response.result, board: { ...response.result.board, unexpectedBoardTruth: true } } };
      },
      (response: SnakeAssistantBoardWorkerResponse) => {
        if (response.result.status !== 'ready') throw new Error('Expected ready fixture.');
        return {
          ...response,
          result: {
            ...response.result,
            board: {
              ...response.result.board,
              slots: response.result.board.slots.map((slot, index) => (
                index === 0 ? { ...slot, unexpectedSlotTruth: true } : slot
              )),
            },
          },
        };
      },
      (response: SnakeAssistantBoardWorkerResponse) => {
        if (response.result.status !== 'ready') throw new Error('Expected ready fixture.');
        return {
          ...response,
          result: {
            ...response.result,
            board: {
              ...response.result.board,
              ledger: { ...response.result.board.ledger, unexpectedLedgerTruth: true },
            },
          },
        };
      },
    ];
    mutate.forEach((mutation, index) => {
      cleanup();
      const key = `extra-key-${index}`;
      render(<Harness value={request(key)} />);
      act(() => FakeWorker.instances.at(-1)?.onmessage?.({
        data: mutation(ready(key)),
      } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
      expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    });
  });

  it('rejects a current READY result with foreign identity, duplicate version, illegal shape, wrong money, or an unhonored optimize pin', () => {
    const cases = [
      () => {
        const value = request('foreign');
        const response = ready('foreign');
        if (response.result.status !== 'ready') throw new Error('Expected ready fixture.');
        response.result.board.playerIds = ['invented', ...response.result.board.playerIds.slice(1)];
        response.result.board.slots = response.result.board.slots.map((slot, index) => (
          index === 0 ? { ...slot, playerId: 'invented' } : slot
        ));
        response.result.board.recommendationOrder = ['invented', ...response.result.board.recommendationOrder.slice(1)];
        return { value, response };
      },
      () => {
        const value = request('duplicate-version');
        value.input.activePool[1].versionGroupId = value.input.activePool[0].versionGroupId;
        return { value, response: ready('duplicate-version') };
      },
      () => {
        const value = request('illegal');
        value.input.activePool[0].seating.shape = { isPitcher: false, position: '1B' };
        return { value, response: ready('illegal') };
      },
      () => {
        const value = request('money');
        const response = ready('money');
        if (response.result.status !== 'ready') throw new Error('Expected ready fixture.');
        response.result.board.ledger = { ...response.result.board.ledger, salary: 111, allIn: 111 };
        return { value, response };
      },
      () => ({ value: request('unpinned', 'p-c'), response: ready('unpinned') }),
    ];
    cases.forEach((build) => {
      cleanup();
      const { value, response } = build();
      render(<Harness value={value} />);
      act(() => FakeWorker.instances.at(-1)?.onmessage?.({ data: response } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
      expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    });
  });
});
