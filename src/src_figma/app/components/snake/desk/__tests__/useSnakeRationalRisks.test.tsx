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
        status: 'ready',
        risks: [{
          playerId: 'player-a',
          risk: 'AT_RISK',
          nextPick: 3,
          earliestSelectingPick: 2,
          latestSelectingPick: 3,
          latestSelectingPickIsAskingTurn: true,
          interestedClubCount: 1,
          draftedAtPick: 2,
          rationalBuyersBeforeTurn: 1,
        }],
        scarcity: [],
        scenarios: [],
        nextPick: 3,
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
      data: { key: 'state-a', status: 'ready', risks: [], scarcity: [], scenarios: [], nextPick: 3 },
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    act(() => liveWorker.onmessage?.({
      data: {
        key: 'state-b',
        status: 'ready',
        risks: [{
          playerId: 'player-a',
          risk: 'LIKELY_GONE',
          nextPick: 3,
          earliestSelectingPick: 2,
          latestSelectingPick: 2,
          latestSelectingPickIsAskingTurn: false,
          interestedClubCount: 1,
          draftedAtPick: 2,
          rationalBuyersBeforeTurn: 1,
        }],
        scarcity: [],
        scenarios: [],
        nextPick: 3,
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

  test('binds the worker key to the exact public session revision', () => {
    const baseSession = {
      id: 'session',
      revision: 1,
      currentPickIndex: 0,
      pickOrder: [{ round: 1, pick: 1, teamId: 'a' }, { round: 1, pick: 2, teamId: 'b' }],
      completedPicks: [],
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

    expect(build({ ...baseSession, revision: 99 })).not.toBe(build(baseSession));
    expect(build({ ...baseSession, currentPickIndex: 1 })).not.toBe(build(baseSession));
  });

  test('treats an engine-declared unavailable result as unavailable, never as a safe empty result', () => {
    render(<Harness request={request('state-a')} />);
    const worker = FakeWorker.instances[0];
    act(() => worker.onmessage?.({
      data: {
        key: 'state-a',
        status: 'unavailable',
        risks: [],
        scarcity: [],
        scenarios: [],
        nextPick: null,
      },
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
  });

  test('removes prior output and actions synchronously when privacy supplies no request', () => {
    const view = render(<Harness request={request('state-a')} />);
    const worker = FakeWorker.instances[0];
    act(() => worker.onmessage?.({
      data: {
        key: 'state-a',
        status: 'ready',
        risks: [{
          playerId: 'player-a', risk: 'AT_RISK', nextPick: 3,
          earliestSelectingPick: 2, latestSelectingPick: 3,
          latestSelectingPickIsAskingTurn: true, interestedClubCount: 1,
          draftedAtPick: 2, rationalBuyersBeforeTurn: 1,
        }],
        scarcity: [], scenarios: [], nextPick: 3,
      },
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('AT_RISK')).toBeInTheDocument();
    view.rerender(<Harness request={null} />);
    expect(screen.getByText('IDLE')).toBeInTheDocument();
  });

  test('treats null cover as a privacy epoch before the same public key can reenter', () => {
    const value = request('state-a');
    const view = render(<Harness request={value} />);
    const preCoverWorker = FakeWorker.instances[0];
    act(() => preCoverWorker.onmessage?.({
      data: {
        key: 'state-a',
        status: 'ready',
        risks: [{
          playerId: 'player-a', risk: 'AT_RISK', nextPick: 3,
          earliestSelectingPick: 2, latestSelectingPick: 3,
          latestSelectingPickIsAskingTurn: true, interestedClubCount: 1,
          draftedAtPick: 2, rationalBuyersBeforeTurn: 1,
        }],
        scarcity: [], scenarios: [], nextPick: 3,
      },
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('AT_RISK')).toBeInTheDocument();

    view.rerender(<Harness request={null} />);
    expect(screen.getByText('IDLE')).toBeInTheDocument();
    view.rerender(<Harness request={{ ...value }} />);

    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.queryByText('AT_RISK')).not.toBeInTheDocument();
    expect(FakeWorker.instances).toHaveLength(2);

    act(() => preCoverWorker.onmessage?.({
      data: {
        key: 'state-a', status: 'ready', risks: [{
          playerId: 'player-a', risk: 'AT_RISK', nextPick: 3,
          earliestSelectingPick: 2, latestSelectingPick: 3,
          latestSelectingPickIsAskingTurn: true, interestedClubCount: 1,
          draftedAtPick: 2, rationalBuyersBeforeTurn: 1,
        }], scarcity: [], scenarios: [], nextPick: 3,
      },
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    act(() => FakeWorker.instances[1].onmessage?.({
      data: {
        key: 'state-a', status: 'ready', risks: [{
          playerId: 'player-a', risk: 'LIKELY_GONE', nextPick: 3,
          earliestSelectingPick: 2, latestSelectingPick: 2,
          latestSelectingPickIsAskingTurn: false, interestedClubCount: 1,
          draftedAtPick: 2, rationalBuyersBeforeTurn: 1,
        }], scarcity: [], scenarios: [], nextPick: 3,
      },
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('LIKELY_GONE')).toBeInTheDocument();
  });

  test('serializes public inputs only and omits every rival-private session surface', () => {
    const privateSession = {
      id: 'session', revision: 7, currentPickIndex: 0,
      pickOrder: [{ round: 1, pick: 1, teamId: 'a' }, { round: 1, pick: 2, teamId: 'b' }],
      completedPicks: [],
      seatBoards: { b: { secret: 'board' } },
      farmSeatBoards: { b: { secret: 'farm-board' } },
      roomLogByTeamId: { b: [{ text: 'private-log' }] },
      snakeCompanions: { roomCode: 'PRIVATE' },
      correctionHistory: [{ secret: 'correction' }],
    } as unknown as LeagueBuilderMlbDraftSession;
    const built = buildSnakeRationalRiskRequest({
      session: privateSession,
      askingTeamId: 'a',
      askedPlayerIds: [],
      availablePlayers: [],
      seats: [],
      baseCaps: [],
      realTeamCount: 2,
    });
    expect(Object.keys(built.input).sort()).toEqual([
      'askedPlayerIds', 'askingTeamId', 'baseCaps', 'currentPickIndex',
      'pickOrder', 'players', 'realTeamCount', 'seats',
    ]);
    expect(JSON.stringify(built.input)).not.toMatch(/seatBoards|farmSeatBoards|private-log|roomCode|correction/i);
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
