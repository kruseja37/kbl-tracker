import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { LeagueBuilderMlbDraftSession } from '../../../../../../utils/leagueBuilderStorage';
import { DeskCandidateRow } from '../DeskCandidateRow';
import {
  buildSnakeRationalRiskRequest,
  type SnakeRationalRiskRequest,
  type SnakeRationalRiskWorkerResponse,
  useSnakeRationalRisks,
} from '../useSnakeRationalRisks';

class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent<SnakeRationalRiskWorkerResponse>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(value: unknown) {
    this.posted.push(value);
  }

  terminate() {
    this.terminated = true;
  }
}

function request(key: string): SnakeRationalRiskRequest {
  return {
    key,
    input: {
      currentPickIndex: 0,
      pickOrder: [{ pick: 1, teamId: 'a' }, { pick: 2, teamId: 'b' }],
      askingTeamId: 'a',
      askedPlayerIds: ['player-a'],
      players: [],
      seats: [],
      baseCaps: [],
      realTeamCount: 2,
    },
  };
}

function Harness(props: { request: SnakeRationalRiskRequest | null }) {
  const state = useSnakeRationalRisks(props.request);
  return <p>{state.risks?.[0]?.risk ?? state.status.toUpperCase()}</p>;
}

describe('shared snake rational-risk worker seam', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('posts the public-state request and publishes the matching background result', () => {
    render(<Harness request={request('state-a')} />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    const worker = FakeWorker.instances[0];
    expect(worker.posted).toEqual([request('state-a')]);

    act(() => worker.onmessage?.({
      data: {
        key: 'state-a',
        risks: [{
          playerId: 'player-a',
          risk: 'AT_RISK',
          nextPick: 3,
          draftedAtPick: 2,
          rationalBuyersBeforeTurn: 1,
        }],
      },
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));

    expect(screen.getByText('AT_RISK')).toBeInTheDocument();
    expect(worker.terminated).toBe(true);
  });

  test('terminates old work and discards a stale result after public state changes', () => {
    const view = render(<Harness request={request('state-a')} />);
    const oldWorker = FakeWorker.instances[0];
    view.rerender(<Harness request={request('state-b')} />);
    const liveWorker = FakeWorker.instances[1];
    expect(oldWorker.terminated).toBe(true);

    act(() => oldWorker.onmessage?.({
      data: { key: 'state-a', risks: [] },
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    act(() => liveWorker.onmessage?.({
      data: {
        key: 'state-b',
        risks: [{
          playerId: 'player-a',
          risk: 'LIKELY_GONE',
          nextPick: 3,
          draftedAtPick: 2,
          rationalBuyersBeforeTurn: 1,
        }],
      },
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('LIKELY_GONE')).toBeInTheDocument();
  });

  test('reports an unavailable read instead of hanging or running the playout on the UI thread', () => {
    render(<Harness request={request('state-a')} />);
    const worker = FakeWorker.instances[0];
    act(() => worker.onerror?.(new Event('error')));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(worker.terminated).toBe(true);
  });

  test('reports unavailable immediately when the browser has no Worker support', () => {
    vi.stubGlobal('Worker', undefined);
    render(<Harness request={request('state-a')} />);
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
  });

  test('keys only public draft state, not unrelated session revisions', () => {
    const baseSession = {
      id: 'session',
      revision: 1,
      currentPickIndex: 0,
      pickOrder: [{ round: 1, pick: 1, teamId: 'a' }, { round: 1, pick: 2, teamId: 'b' }],
    } as LeagueBuilderMlbDraftSession;
    const build = (session: LeagueBuilderMlbDraftSession) => buildSnakeRationalRiskRequest({
      session,
      askingTeamId: 'a',
      askedPlayerIds: [],
      availablePlayers: [],
      seats: [],
      baseCaps: [],
      realTeamCount: 2,
    }).key;

    expect(build({ ...baseSession, revision: 99 })).toBe(build(baseSession));
    expect(build({ ...baseSession, currentPickIndex: 1 })).not.toBe(build(baseSession));
  });

  test('labels an unfinished worker read as calculating rather than safe', () => {
    cleanup();
    render(<DeskCandidateRow candidate={{
      id: 'player-a',
      name: 'Player A',
      position: 'C',
      advisorWorth: 10,
      iv: 10,
      marginalTax: 0,
      trueCost: 10,
      archetypeChip: 'BALANCED',
      fitWord: 'SOLID FIT',
      risk: 'SAFE_TO_WAIT',
      riskPending: true,
      legalFinishLine: '',
      construction: { id: 'player-a', isPitcher: false, bat: { POW: 50, CON: 50, SPD: 50, FLD: 50, ARM: 50 } },
    }} />);

    expect(screen.getByText(/CALCULATING/)).toBeInTheDocument();
    expect(screen.queryByText(/SAFE TO WAIT/)).not.toBeInTheDocument();
  });

  test('labels a failed worker read as unavailable rather than safe or calculating', () => {
    cleanup();
    render(<DeskCandidateRow candidate={{
      id: 'player-a',
      name: 'Player A',
      position: 'C',
      advisorWorth: 10,
      iv: 10,
      marginalTax: 0,
      trueCost: 10,
      archetypeChip: 'BALANCED',
      fitWord: 'SOLID FIT',
      risk: 'SAFE_TO_WAIT',
      riskUnavailable: true,
      legalFinishLine: '',
      construction: { id: 'player-a', isPitcher: false, bat: { POW: 50, CON: 50, SPD: 50, FLD: 50, ARM: 50 } },
    }} />);

    expect(screen.getByText(/RISK UNAVAILABLE/)).toBeInTheDocument();
    expect(screen.queryByText(/SAFE TO WAIT|CALCULATING/)).not.toBeInTheDocument();
  });
});
