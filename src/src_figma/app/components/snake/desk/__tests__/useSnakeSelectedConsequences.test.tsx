import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __snakeSelectedConsequencesTestUtils,
  useSnakeSelectedConsequences,
} from '../useSnakeSelectedConsequences';
import type {
  SnakeSelectedConsequencesWorkerRequest,
  SnakeSelectedConsequencesWorkerResponse,
} from '../../../../workers/snakeSelectedConsequences.worker';

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

function request(key: string, selectedPlayerIds = ['p-a']): SnakeSelectedConsequencesWorkerRequest {
  return {
    key,
    selectedPlayerIds,
    input: {} as SnakeSelectedConsequencesWorkerRequest['input'],
  };
}

function response(key: string, selectedPlayerIds = ['p-a']): SnakeSelectedConsequencesWorkerResponse {
  return {
    key,
    results: selectedPlayerIds.map((selectedPlayerId) => ({ status: 'already-on-board', selectedPlayerId })),
  };
}

function Harness(props: { request: SnakeSelectedConsequencesWorkerRequest | null }) {
  const result = useSnakeSelectedConsequences(props.request);
  return <p>{result.status.toUpperCase()}:{result.consequenceByPlayerId.get('p-a')?.status ?? 'NONE'}</p>;
}

describe('selected-player consequence worker hook', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    __snakeSelectedConsequencesTestUtils.clearCache();
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps expensive board consequences off-thread and caches exact semantic results', () => {
    const value = request('state-a');
    const view = render(<Harness request={value} />);
    expect(screen.getByText('PENDING:NONE')).toBeInTheDocument();
    expect(FakeWorker.instances[0].posted).toEqual([value]);
    act(() => FakeWorker.instances[0].onmessage?.({ data: response('state-a') } as MessageEvent<unknown>));
    expect(screen.getByText('READY:already-on-board')).toBeInTheDocument();

    view.rerender(<Harness request={{ ...value }} />);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(screen.getByText('READY:already-on-board')).toBeInTheDocument();
  });

  it('cancels stale work and rejects a missing result', () => {
    const view = render(<Harness request={request('state-a')} />);
    const stale = FakeWorker.instances[0];
    view.rerender(<Harness request={request('state-b')} />);
    expect(stale.terminated).toBe(true);
    act(() => stale.onmessage?.({ data: response('state-a') } as MessageEvent<unknown>));
    expect(screen.getByText('PENDING:NONE')).toBeInTheDocument();
    act(() => FakeWorker.instances[1].onmessage?.({ data: { key: 'state-b', results: [] } } as MessageEvent<unknown>));
    expect(screen.getByText('UNAVAILABLE:NONE')).toBeInTheDocument();
  });
});
