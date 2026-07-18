import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __snakePickFinishSafetyTestUtils,
  buildSnakePickFinishWorkerRequest,
  useSnakePickFinishSafety,
} from '../useSnakePickFinishSafety';
import type {
  SnakePickFinishWorkerRequest,
  SnakePickFinishWorkerResponse,
} from '../../../../workers/snakePickFinish.worker';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(value: unknown) { this.posted.push(value); }
  terminate() { this.terminated = true; }
}

function request(key: string): SnakePickFinishWorkerRequest {
  return {
    key,
    current: {
      clubs: [{ teamId: 'team', roster: [], budgetRemaining: 1_000 }],
      pool: [], baseCaps: [], realTeamCount: 1,
    },
    proof: { feasible: true, assignments: [], shortfall: null, message: 'READY' },
    teamId: 'team',
    candidatePlayerIds: ['p-a', 'p-b'],
  };
}

function response(key: string): SnakePickFinishWorkerResponse {
  return {
    key,
    phase: 'complete',
    rows: [
      { playerId: 'p-a', status: 'DRAFTABLE', message: 'SAFE', finalSalary: 100, finalTax: 0, moneyLeft: 900 },
      { playerId: 'p-b', status: 'BLOCKED', message: 'NO', finalSalary: null, finalTax: null, moneyLeft: null },
    ],
  };
}

function Harness(props: { request: SnakePickFinishWorkerRequest | null }) {
  const result = useSnakePickFinishSafety(props.request);
  return <p>{result.status.toUpperCase()}:{result.rows.get('p-b')?.status ?? 'NONE'}</p>;
}

describe('snake pick finish-safety worker hook', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    __snakePickFinishSafetyTestUtils.clearCache();
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('runs one worker per semantic key and reuses the exact resolved classification', () => {
    const first = request('state-a');
    const view = render(<Harness request={first} />);
    expect(screen.getByText('PENDING:NONE')).toBeInTheDocument();
    expect(FakeWorker.instances).toHaveLength(1);
    expect(FakeWorker.instances[0].posted).toEqual([first]);

    act(() => FakeWorker.instances[0].onmessage?.({
      data: { key: 'state-a', phase: 'progress', rows: [response('state-a').rows[1]] },
    } as MessageEvent<unknown>));
    expect(screen.getByText('PENDING:NONE')).toBeInTheDocument();

    view.rerender(<Harness request={{ ...first }} />);
    expect(FakeWorker.instances).toHaveLength(1);
    act(() => FakeWorker.instances[0].onmessage?.({ data: response('state-a') } as MessageEvent<unknown>));
    expect(screen.getByText('READY:BLOCKED')).toBeInTheDocument();

    view.rerender(<Harness request={{ ...first }} />);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(screen.getByText('READY:BLOCKED')).toBeInTheDocument();
  });

  it('fingerprints every tax, roster-shape, and construction input used by the classifier', () => {
    const player = {
      playerId: 'p-a', sourceId: 'stock:p-a', price: 100,
      shape: { isPitcher: false, position: 'C' as const },
      construction: {
        id: 'p-a', isPitcher: false,
        bat: { POW: 10, CON: 20, SPD: 30, FLD: 40, ARM: 50 },
      },
    };
    const base = {
      current: {
        clubs: [{
          teamId: 'team', roster: [player], budgetRemaining: 1_000,
          committedConstruction: [player.construction],
        }],
        pool: [{ ...player, playerId: 'p-b', construction: { ...player.construction, id: 'p-b' } }],
        baseCaps: [{
          group: 'hitters' as const, stat: 'POW' as const, topN: 8, cap: 100,
          penaltyCurve: 1, penaltyPer100: 100, minAdder: 0,
        }],
        realTeamCount: 1,
      },
      proof: {
        feasible: true,
        assignments: [{
          teamId: 'team', playerIds: ['p-b'], salaryCost: 100, addedTax: 0, allInCost: 100,
        }],
        shortfall: null,
        message: 'READY',
      },
      teamId: 'team', candidatePlayerIds: ['p-b'],
    };
    const key = buildSnakePickFinishWorkerRequest(base).key;
    expect(buildSnakePickFinishWorkerRequest({
      ...base, current: { ...base.current, baseCaps: [{ ...base.current.baseCaps[0], cap: 99 }] },
    }).key).not.toBe(key);
    expect(buildSnakePickFinishWorkerRequest({
      ...base,
      current: {
        ...base.current,
        pool: base.current.pool.map((entry) => ({ ...entry, shape: { ...entry.shape, secondaryPosition: '1B' as const } })),
      },
    }).key).not.toBe(key);
    expect(buildSnakePickFinishWorkerRequest({
      ...base,
      current: {
        ...base.current,
        pool: base.current.pool.map((entry) => ({
          ...entry,
          construction: { ...entry.construction, bat: { ...entry.construction.bat, POW: 11 } },
        })),
      },
    }).key).not.toBe(key);
    expect(buildSnakePickFinishWorkerRequest({
      ...base,
      current: {
        ...base.current,
        clubs: base.current.clubs.map((club) => ({
          ...club,
          committedConstruction: club.committedConstruction.map((entry) => ({
            ...entry, bat: { ...entry.bat, CON: 21 },
          })),
        })),
      },
    }).key).not.toBe(key);
    expect(buildSnakePickFinishWorkerRequest({
      ...base, proof: { ...base.proof, feasible: false },
    }).key).not.toBe(key);
    expect(buildSnakePickFinishWorkerRequest({
      ...base,
      proof: {
        ...base.proof,
        assignments: base.proof.assignments.map((assignment) => ({ ...assignment, salaryCost: 99 })),
      },
    }).key).not.toBe(key);
    expect(buildSnakePickFinishWorkerRequest({
      ...base,
      proof: {
        ...base.proof,
        assignments: base.proof.assignments.map((assignment) => ({ ...assignment, addedTax: 1 })),
      },
    }).key).not.toBe(key);
    expect(buildSnakePickFinishWorkerRequest({
      ...base, proof: { ...base.proof, message: 'DIFFERENT RECEIPT' },
    }).key).not.toBe(key);
  });

  it('cancels stale work and rejects incomplete or wrong-key worker truth', () => {
    const view = render(<Harness request={request('state-a')} />);
    const stale = FakeWorker.instances[0];
    view.rerender(<Harness request={request('state-b')} />);
    expect(stale.terminated).toBe(true);
    expect(FakeWorker.instances).toHaveLength(2);

    act(() => stale.onmessage?.({ data: response('state-a') } as MessageEvent<unknown>));
    expect(screen.getByText('PENDING:NONE')).toBeInTheDocument();
    act(() => FakeWorker.instances[1].onmessage?.({
      data: { key: 'state-b', phase: 'complete', rows: response('state-b').rows.slice(0, 1) },
    } as MessageEvent<unknown>));
    expect(screen.getByText('UNAVAILABLE:NONE')).toBeInTheDocument();
  });
});
