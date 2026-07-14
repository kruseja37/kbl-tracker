import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SnakeGuideRecommendationRequest } from '../snakeDraftDecisionModel';
import {
  useSnakeGuideRecommendation,
  type SnakeGuideRecommendationWorkerResponse,
} from '../useSnakeGuideRecommendation';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<SnakeGuideRecommendationWorkerResponse>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(value: unknown) { this.posted.push(value); }
  terminate() { this.terminated = true; }
}

function request(key = 'public-a', revision = 3): SnakeGuideRecommendationRequest {
  return {
    key,
    input: {
      session: {
        id: 'session', revision, currentPickIndex: 0,
        pickOrder: [
          { round: 1, pick: 9, teamId: 'seller' },
          { round: 1, pick: 12, teamId: 'buyer' },
        ],
        completedPicks: [], lockedClubs: [{ teamId: 'buyer' }, { teamId: 'seller' }],
      },
      buyerTeamId: 'buyer', earliestThreatPick: 10,
      pickValueChart: Array.from({ length: 12 }, (_, index) => ({ pick: index + 1, value: 100 })),
      seatingProofInput: {
        clubs: [
          { teamId: 'buyer', roster: [], budgetRemaining: 0 },
          { teamId: 'seller', roster: [], budgetRemaining: 0 },
        ],
        pool: [], baseCaps: [], realTeamCount: 2,
      },
    },
  };
}

function ready(key = 'public-a', overrides: Record<string, unknown> = {}): SnakeGuideRecommendationWorkerResponse {
  return {
    key,
    result: {
      status: 'ready',
      proposal: {
        buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 9,
        offerPickNumbers: [12], receivePickNumbers: [9],
        offerValue: 100, receiveValue: 100, sellerPremium: 0, sessionRevision: 3,
        ...overrides,
      },
    },
  };
}

function Harness(props: { request: SnakeGuideRecommendationRequest | null; privateKey: string | null }) {
  const state = useSnakeGuideRecommendation(props.request, props.privateKey);
  return <p>{state.proposal ? `PICK ${state.proposal.targetPick}` : state.status.toUpperCase()}</p>;
}

describe('snake guide recommendation worker hook', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('posts only the sanitized public request and binds the result to a local private key', () => {
    const value = request();
    const view = render(<Harness request={value} privateKey="private-seat-a" />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(FakeWorker.instances[0].posted).toEqual([value]);
    expect(JSON.stringify(FakeWorker.instances[0].posted)).not.toContain('private-seat-a');
    act(() => FakeWorker.instances[0].onmessage?.({ data: ready() } as MessageEvent<SnakeGuideRecommendationWorkerResponse>));
    expect(screen.getByText('PICK 9')).toBeInTheDocument();

    view.rerender(<Harness request={value} privateKey="private-seat-b" />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(FakeWorker.instances).toHaveLength(2);
    act(() => FakeWorker.instances[0].onmessage?.({ data: ready() } as MessageEvent<SnakeGuideRecommendationWorkerResponse>));
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    act(() => FakeWorker.instances[1].onmessage?.({ data: ready() } as MessageEvent<SnakeGuideRecommendationWorkerResponse>));
    expect(screen.getByText('PICK 9')).toBeInTheDocument();

    view.rerender(<Harness request={null} privateKey={null} />);
    expect(screen.getByText('IDLE')).toBeInTheDocument();
    expect(screen.queryByText('PICK 9')).not.toBeInTheDocument();
  });

  it.each([
    ['forged later target', { targetPick: 12 }],
    ['four picks per side', { offerPickNumbers: [12, 13, 14, 15], receivePickNumbers: [9, 8, 7, 6] }],
    ['stale revision', { sessionRevision: 2 }],
    ['tampered total', { offerValue: 99 }],
    ['extra package field', { unexpectedPackageTruth: true }],
  ])('fails closed on a malformed current %s response', (_name, overrides) => {
    render(<Harness request={request()} privateKey="private" />);
    act(() => FakeWorker.instances[0].onmessage?.({
      data: ready('public-a', overrides),
    } as MessageEvent<SnakeGuideRecommendationWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByText(/PICK/)).not.toBeInTheDocument();
  });

  it('rejects extra own keys on the worker response and ready result envelopes', () => {
    const view = render(<Harness request={request('outer-extra')} privateKey="private" />);
    const outer = ready('outer-extra') as SnakeGuideRecommendationWorkerResponse & { unexpectedWorkerTruth?: boolean };
    outer.unexpectedWorkerTruth = true;
    act(() => FakeWorker.instances.at(-1)?.onmessage?.({
      data: outer,
    } as MessageEvent<SnakeGuideRecommendationWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();

    view.rerender(<Harness request={request('result-extra')} privateKey="private" />);
    const result = ready('result-extra') as SnakeGuideRecommendationWorkerResponse & {
      result: SnakeGuideRecommendationWorkerResponse['result'] & { unexpectedResultTruth?: boolean };
    };
    result.result.unexpectedResultTruth = true;
    act(() => FakeWorker.instances.at(-1)?.onmessage?.({
      data: result,
    } as MessageEvent<SnakeGuideRecommendationWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
  });

  it('fails closed on worker errors and ignores a stale public key', () => {
    const view = render(<Harness request={request('a')} privateKey="private" />);
    const oldWorker = FakeWorker.instances[0];
    view.rerender(<Harness request={request('b')} privateKey="private" />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    act(() => oldWorker.onmessage?.({ data: ready('a') } as MessageEvent<SnakeGuideRecommendationWorkerResponse>));
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    act(() => FakeWorker.instances[1].onerror?.(new Event('error')));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
  });
});
