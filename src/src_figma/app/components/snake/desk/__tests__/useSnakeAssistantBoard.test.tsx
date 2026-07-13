import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SnakeAssistantBoardRequest } from '../snakeDeskIntelligenceModel';
import {
  useSnakeAssistantBoard,
  type SnakeAssistantBoardWorkerResponse,
} from '../useSnakeAssistantBoard';

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

function request(key: string): SnakeAssistantBoardRequest {
  return { key, input: {} as SnakeAssistantBoardRequest['input'] };
}

function ready(key: string, teamId: string): SnakeAssistantBoardWorkerResponse {
  return {
    key,
    result: {
      status: 'ready',
      board: {
        kind: 'snake-assistant-board', teamId, slots: [], playerIds: [], recommendationOrder: [],
        ledger: { rosterCount: 22, salary: 1, tax: 0, allIn: 1, moneyLeft: 1 }, chemistry: [],
      },
    },
  };
}

function Harness({ value }: { value: SnakeAssistantBoardRequest | null }) {
  const state = useSnakeAssistantBoard(value);
  return <p>{state.board?.teamId ?? state.status.toUpperCase()}</p>;
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
    act(() => freshWorker.onmessage?.({ data: ready('a', 'team-a-fresh') } as MessageEvent<SnakeAssistantBoardWorkerResponse>));
    expect(screen.getByText('team-a-fresh')).toBeInTheDocument();
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
});
