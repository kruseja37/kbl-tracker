import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { RosterSlotPlayer } from '../../../../../../data/rosterConstruction';
import type { LeagueBuilderMlbDraftSession } from '../../../../../../utils/leagueBuilderStorage';
import {
  playSnakeRationalRoomProgressively,
  snakeScarcityWitnessAuthTag,
  type SnakeScarcityWitnessPayload,
} from '../../../../../../engines/snakeRationalRoom';
import { DeskCandidateRow } from '../DeskCandidateRow';
import {
  runSnakeScarcityVerifierWorkerRequest,
  type SnakeScarcityVerifierWorkerRequest,
} from '../../../../workers/snakeScarcityVerifier.worker';
import {
  buildSnakeRationalRiskRequest,
  type SnakeRationalRiskRequest,
  type SnakeRationalRiskWorkerResponse,
  useSnakeRationalRisks,
  validSnakeRationalRiskWorkerResponse,
} from '../useSnakeRationalRisks';

class FakeWorker {
  static instances: FakeWorker[] = [];
  static verifierInstances: FakeWorker[] = [];
  static autoVerify = true;

  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  private readonly verifier: boolean;

  constructor(url?: string | URL) {
    this.verifier = String(url ?? '').includes('snakeScarcityVerifier.worker');
    if (this.verifier) FakeWorker.verifierInstances.push(this);
    else FakeWorker.instances.push(this);
  }

  postMessage(value: unknown) {
    this.posted.push(value);
    if (this.verifier && FakeWorker.autoVerify) {
      this.onmessage?.({
        data: runSnakeScarcityVerifierWorkerRequest(value as SnakeScarcityVerifierWorkerRequest),
      } as MessageEvent<unknown>);
    }
  }

  terminate() {
    this.terminated = true;
  }
}

function construction(id: string, shape: RosterSlotPlayer) {
  return {
    id,
    isPitcher: shape.isPitcher,
    role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
    bat: { POW: 50, CON: 50, SPD: 50, FLD: 50, ARM: 50 },
    ...(shape.isPitcher ? { pit: { VEL: 50, JNK: 50, ACC: 50 } } : {}),
  };
}

function legalTwentyOne(prefix: string) {
  const shapes: RosterSlotPlayer[] = [
    { isPitcher: false, position: 'C' },
    { isPitcher: false, position: '1B' },
    { isPitcher: false, position: '2B' },
    { isPitcher: false, position: '3B' },
    { isPitcher: false, position: 'SS' },
    { isPitcher: false, position: 'LF', secondaryPosition: 'C' },
    { isPitcher: false, position: 'CF' },
    { isPitcher: false, position: 'RF' },
    ...Array.from({ length: 5 }, () => ({ isPitcher: false, position: 'CF' } as RosterSlotPlayer)),
    ...Array.from({ length: 4 }, () => ({ isPitcher: true, position: 'SP', role: 'SP' } as RosterSlotPlayer)),
    ...Array.from({ length: 4 }, (_, index) => ({
      isPitcher: true,
      position: index === 0 ? 'CP' : 'RP',
      role: index === 0 ? 'CP' : 'RP',
    } as RosterSlotPlayer)),
  ];
  return shapes.map((shape, index) => ({
    playerId: `${prefix}-${index}`,
    sourceId: `stock:${prefix}-${index}`,
    price: 1,
    shape,
    construction: construction(`${prefix}-${index}`, shape),
  }));
}

function request(key: string): SnakeRationalRiskRequest {
  const lockedArchetype = { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 } as const;
  const player = (id: string, position: 'C' | 'SS' = 'C') => ({
    playerId: id,
    sourceId: `stock:${id}`,
    price: 10,
    worth: 10,
    shape: { isPitcher: false as const, position },
    construction: construction(id, { isPitcher: false, position }),
  });
  return {
    key,
    input: {
      currentPickIndex: 0,
      pickOrder: [
        { pick: 1, teamId: 'a' },
        { pick: 2, teamId: 'b' },
        { pick: 3, teamId: 'a' },
      ],
      askingTeamId: 'a',
      askedPlayerIds: ['player-a'],
      players: [player('player-a'), player('player-b'), player('player-c', 'SS')],
      seats: ['a', 'b'].map((teamId) => {
        const roster = legalTwentyOne(teamId);
        return {
          teamId,
          roster,
          settledRosterPrices: roster.map((row) => ({ playerId: row.playerId, settledPrice: row.price })),
          committedSpent: roster.length,
          budget: 1_000,
          lockedArchetype,
        };
      }),
      baseCaps: [],
      realTeamCount: 2,
    },
  };
}

function readyResponse(input: {
  key: string;
  risk: 'SAFE_TO_WAIT' | 'AT_RISK' | 'LIKELY_GONE';
  phase?: 'decision' | 'complete';
  witnessSecret?: string;
}): SnakeRationalRiskWorkerResponse {
  const phase = input.phase ?? 'complete';
  const pick = (playerId: string) => ({
    pick: 2,
    pickIndex: 1,
    teamId: 'b',
    playerId,
    versionGroupId: `source:${playerId}`,
    interest: 10,
  });
  const basePlayerId = input.risk === 'SAFE_TO_WAIT' ? 'player-b' : 'player-a';
  const secondPlayerId = input.risk === 'LIKELY_GONE' ? 'player-a' : 'player-b';
  const selected = input.risk === 'SAFE_TO_WAIT' ? 0 : 1;
  const risks = [{
      playerId: 'player-a',
      risk: input.risk,
      nextPick: 3,
      earliestSelectingPick: selected ? 2 : null,
      latestSelectingPick: input.risk === 'LIKELY_GONE' ? 2 : 3,
      latestSelectingPickIsAskingTurn: input.risk !== 'LIKELY_GONE',
      interestedClubCount: selected,
      draftedAtPick: selected ? 2 : null,
      rationalBuyersBeforeTurn: selected,
    }];
  const scenarios = [
    { id: 'BASE' as const, status: 'valid' as const, picks: [pick(basePlayerId)] },
    { id: 'RIVAL_SECOND:b' as const, status: 'valid' as const, picks: [pick(secondPlayerId)] },
  ];
  if (phase === 'decision' || !input.witnessSecret) return {
    key: input.key,
    phase,
    status: 'ready',
    risks,
    scarcity: phase === 'decision' ? null : [],
    scarcityWitness: null,
    scenarios,
    nextPick: 3,
  };
  const source = request(input.key);
  const generated = playSnakeRationalRoomProgressively(
    { ...source.input, includeScarcity: true },
    undefined,
    { requestKey: input.key, witnessSecret: input.witnessSecret },
  );
  if (generated.status !== 'ready' || !generated.scarcityWitness) {
    throw new Error('Expected a complete fixture witness');
  }
  const scarcity = generated.scarcity;
  const payload: SnakeScarcityWitnessPayload = {
    schemaVersion: 2,
    requestKey: input.key,
    decision: { nextPick: 3, risks, scenarios },
    rootProof: generated.scarcityWitness.rootProof,
    cards: generated.scarcityWitness.cards,
    rowIdentities: generated.scarcityWitness.rowIdentities,
    roles: generated.scarcityWitness.roles,
  };
  return {
    key: input.key,
    phase: 'complete',
    status: 'ready',
    risks,
    scarcity,
    scarcityWitness: {
      ...payload,
      authTag: snakeScarcityWitnessAuthTag(payload, input.witnessSecret),
    },
    scenarios,
    nextPick: 3,
  };
}

function unavailableResponse(key: string): SnakeRationalRiskWorkerResponse {
  return {
    key,
    phase: 'complete',
    status: 'unavailable',
    risks: [],
    scarcity: [],
    scarcityWitness: null,
    scenarios: [],
    nextPick: null,
  };
}

function workerSecret(worker: FakeWorker): string {
  return (worker.posted[0] as { witnessSecret: string }).witnessSecret;
}

function resignWitness(response: SnakeRationalRiskWorkerResponse, secret: string): void {
  if (!response.scarcityWitness) throw new Error('Expected a scarcity witness');
  const payload: SnakeScarcityWitnessPayload = {
    schemaVersion: response.scarcityWitness.schemaVersion,
    requestKey: response.scarcityWitness.requestKey,
    decision: response.scarcityWitness.decision,
    rootProof: response.scarcityWitness.rootProof,
    cards: response.scarcityWitness.cards,
    rowIdentities: response.scarcityWitness.rowIdentities,
    roles: response.scarcityWitness.roles,
  };
  response.scarcityWitness.authTag = snakeScarcityWitnessAuthTag(payload, secret);
}

function Harness(props: { request: SnakeRationalRiskRequest | null }) {
  const state = useSnakeRationalRisks(props.request);
  return <p>{state.risks?.[0]?.risk ?? state.status.toUpperCase()}</p>;
}

function ProgressiveHarness(props: { request: SnakeRationalRiskRequest | null }) {
  const state = useSnakeRationalRisks(props.request);
  return <p>{`${state.status}:${state.risks?.[0]?.risk ?? '-'}:${state.scarcityPending ? 'SCARCITY_PENDING' : 'SCARCITY_SETTLED'}`}</p>;
}

describe('shared snake rational-risk worker seam', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    FakeWorker.verifierInstances = [];
    FakeWorker.autoVerify = true;
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
    expect(worker.posted).toEqual([{ ...request('state-a'), witnessSecret: expect.stringMatching(/^[0-9a-f]{64}$/) }]);

    act(() => worker.onmessage?.({
      data: readyResponse({ key: 'state-a', risk: 'AT_RISK', witnessSecret: workerSecret(worker) }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));

    expect(screen.getByText('AT_RISK')).toBeInTheDocument();
    expect(worker.terminated).toBe(true);
  });

  test('publishes exact decision risk before scarcity expansion without terminating the live worker', () => {
    render(<ProgressiveHarness request={request('progressive')} />);
    const worker = FakeWorker.instances[0];
    act(() => worker.onmessage?.({
      data: readyResponse({ key: 'progressive', risk: 'AT_RISK', phase: 'decision' }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('ready:AT_RISK:SCARCITY_PENDING')).toBeInTheDocument();
    expect(worker.terminated).toBe(false);

    act(() => worker.onmessage?.({
      data: readyResponse({ key: 'progressive', risk: 'AT_RISK', witnessSecret: workerSecret(worker) }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('ready:AT_RISK:SCARCITY_SETTLED')).toBeInTheDocument();
    expect(worker.terminated).toBe(true);
  });

  test('retains a valid decision and closes scarcity fail-closed when the late phase is unavailable', () => {
    render(<ProgressiveHarness request={request('late-unavailable')} />);
    const worker = FakeWorker.instances[0];
    act(() => worker.onmessage?.({
      data: readyResponse({ key: 'late-unavailable', risk: 'AT_RISK', phase: 'decision' }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    act(() => worker.onmessage?.({
      data: unavailableResponse('late-unavailable'),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));

    expect(screen.getByText('ready:AT_RISK:SCARCITY_SETTLED')).toBeInTheDocument();
    expect(worker.terminated).toBe(true);
  });

  test('retains a valid decision when a malformed or identity-changing same-key completion arrives', () => {
    const view = render(<ProgressiveHarness request={request('malformed-complete')} />);
    let worker = FakeWorker.instances[0];
    act(() => worker.onmessage?.({
      data: readyResponse({ key: 'malformed-complete', risk: 'AT_RISK', phase: 'decision' }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    const malformed = readyResponse({ key: 'malformed-complete', risk: 'AT_RISK' });
    malformed.scarcity = [{ playerId: 'player-a', role: 'C', viablePeopleLeft: Number.NaN }] as never;
    act(() => worker.onmessage?.({ data: malformed } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('ready:AT_RISK:SCARCITY_SETTLED')).toBeInTheDocument();
    expect(worker.terminated).toBe(true);

    view.rerender(<ProgressiveHarness request={request('changed-identity')} />);
    worker = FakeWorker.instances[1];
    act(() => worker.onmessage?.({
      data: readyResponse({ key: 'changed-identity', risk: 'AT_RISK', phase: 'decision' }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    act(() => worker.onmessage?.({
      data: readyResponse({ key: 'changed-identity', risk: 'LIKELY_GONE', witnessSecret: workerSecret(worker) }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('ready:AT_RISK:SCARCITY_SETTLED')).toBeInTheDocument();
    expect(worker.terminated).toBe(true);
  });

  test('strictly rejects nonfinite, wrong-key, and non-canonical worker mutations', () => {
    const current = request('validated');
    const secret = 'a'.repeat(64);
    const valid = readyResponse({ key: 'validated', risk: 'AT_RISK', witnessSecret: secret });
    expect(validSnakeRationalRiskWorkerResponse(valid, current, secret)).toBe(true);

    expect(validSnakeRationalRiskWorkerResponse({ ...valid, key: 'other' }, current, secret)).toBe(false);
    expect(validSnakeRationalRiskWorkerResponse({ ...valid, phase: undefined }, current, secret)).toBe(false);
    expect(validSnakeRationalRiskWorkerResponse({
      ...valid,
      risks: [{ ...valid.risks[0], latestSelectingPick: Number.POSITIVE_INFINITY }],
    }, current, secret)).toBe(false);
    expect(validSnakeRationalRiskWorkerResponse({
      ...valid,
      scenarios: [{ ...valid.scenarios[0], picks: [{ ...valid.scenarios[0].picks[0], interest: Number.NaN }] }],
    }, current, secret)).toBe(false);
    expect(validSnakeRationalRiskWorkerResponse({ ...valid, scarcity: null }, current, secret)).toBe(false);
  });

  test('rejects forged scarcity semantics even when the row shapes and witness tag look valid', () => {
    const current = request('semantic-proof');
    const secret = 'b'.repeat(64);
    const source = readyResponse({ key: current.key, risk: 'AT_RISK', witnessSecret: secret });
    const accepts = (response: SnakeRationalRiskWorkerResponse) => (
      validSnakeRationalRiskWorkerResponse(response, current, secret)
    );
    expect(accepts(source)).toBe(true);

    const empty = structuredClone(source);
    empty.scarcity = [];
    expect(accepts(empty)).toBe(false);

    const wrongRole = structuredClone(source);
    wrongRole.scarcity![0].role = 'SS';
    wrongRole.scarcityWitness!.rowIdentities[0].role = 'SS';
    wrongRole.scarcityWitness!.roles[0].role = 'SS';
    resignWitness(wrongRole, secret);
    expect(accepts(wrongRole)).toBe(false);

    const inventedAggregates = structuredClone(source);
    inventedAggregates.scarcity![0] = {
      ...inventedAggregates.scarcity![0],
      viablePeopleLeft: 99,
      lowestViableTrueCost: 123,
      highestViableTrueCost: 123,
      targetContextualWorth: 456,
      replacementContextualWorth: 456,
      contextualWorthDrop: 0,
    };
    expect(accepts(inventedAggregates)).toBe(false);

    const invalidReplacementRole = structuredClone(source);
    invalidReplacementRole.scarcity![0].replacementPlayerId = 'player-c';
    expect(accepts(invalidReplacementRole)).toBe(false);

    const numericWitnessTamper = structuredClone(source);
    numericWitnessTamper.scarcityWitness!.cards[0].trueCost = 999;
    expect(accepts(numericWitnessTamper)).toBe(false);

    const staleKey = structuredClone(source);
    staleKey.scarcityWitness!.requestKey = 'older-request';
    resignWitness(staleKey, secret);
    expect(accepts(staleKey)).toBe(false);

    const staleDecision = structuredClone(source);
    staleDecision.scarcityWitness!.decision.nextPick = 4;
    resignWitness(staleDecision, secret);
    expect(accepts(staleDecision)).toBe(false);

    const duplicateIdentity = structuredClone(source);
    duplicateIdentity.scarcityWitness!.rowIdentities.push({
      ...duplicateIdentity.scarcityWitness!.rowIdentities[0],
    });
    resignWitness(duplicateIdentity, secret);
    expect(accepts(duplicateIdentity)).toBe(false);

    const missingIdentity = structuredClone(source);
    missingIdentity.scarcityWitness!.rowIdentities.pop();
    resignWitness(missingIdentity, secret);
    expect(accepts(missingIdentity)).toBe(false);

    const extraRoleIdentity = structuredClone(source);
    extraRoleIdentity.scarcityWitness!.roles.push(structuredClone(extraRoleIdentity.scarcityWitness!.roles[0]));
    resignWitness(extraRoleIdentity, secret);
    expect(accepts(extraRoleIdentity)).toBe(false);

    const missingCardIdentity = structuredClone(source);
    missingCardIdentity.scarcityWitness!.cards.pop();
    resignWitness(missingCardIdentity, secret);
    expect(accepts(missingCardIdentity)).toBe(false);

    const invalidVersionIdentity = structuredClone(source);
    invalidVersionIdentity.scarcityWitness!.cards[0].versionGroupId = 'source:somebody-else';
    resignWitness(invalidVersionIdentity, secret);
    expect(accepts(invalidVersionIdentity)).toBe(false);
  });

  test('terminates old work and discards a stale result after public state changes', () => {
    const view = render(<Harness request={request('state-a')} />);
    const oldWorker = FakeWorker.instances[0];
    view.rerender(<Harness request={request('state-b')} />);
    const liveWorker = FakeWorker.instances[1];
    expect(oldWorker.terminated).toBe(true);

    act(() => oldWorker.onmessage?.({
      data: readyResponse({ key: 'state-a', risk: 'AT_RISK' }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    act(() => liveWorker.onmessage?.({
      data: readyResponse({ key: 'state-b', risk: 'LIKELY_GONE', witnessSecret: workerSecret(liveWorker) }),
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
      data: unavailableResponse('state-a'),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
  });

  test('removes prior output and actions synchronously when privacy supplies no request', () => {
    const view = render(<Harness request={request('state-a')} />);
    const worker = FakeWorker.instances[0];
    act(() => worker.onmessage?.({
      data: readyResponse({ key: 'state-a', risk: 'AT_RISK', witnessSecret: workerSecret(worker) }),
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
      data: readyResponse({ key: 'state-a', risk: 'AT_RISK', witnessSecret: workerSecret(preCoverWorker) }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('AT_RISK')).toBeInTheDocument();

    view.rerender(<Harness request={null} />);
    expect(screen.getByText('IDLE')).toBeInTheDocument();
    view.rerender(<Harness request={{ ...value }} />);

    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.queryByText('AT_RISK')).not.toBeInTheDocument();
    expect(FakeWorker.instances).toHaveLength(2);

    act(() => preCoverWorker.onmessage?.({
      data: readyResponse({ key: 'state-a', risk: 'AT_RISK' }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    act(() => FakeWorker.instances[1].onmessage?.({
      data: readyResponse({
        key: 'state-a',
        risk: 'LIKELY_GONE',
        witnessSecret: workerSecret(FakeWorker.instances[1]),
      }),
    } as MessageEvent<SnakeRationalRiskWorkerResponse>));
    expect(screen.getByText('LIKELY_GONE')).toBeInTheDocument();
  });

  test('cover stays one-frame immediate and kills an in-flight semantic verifier', () => {
    FakeWorker.autoVerify = false;
    const current = request('verifier-cover');
    const view = render(<Harness request={current} />);
    const primary = FakeWorker.instances[0];
    const completion = readyResponse({
      key: current.key,
      risk: 'AT_RISK',
      witnessSecret: workerSecret(primary),
    });
    act(() => primary.onmessage?.({ data: completion } as MessageEvent<unknown>));
    const verifier = FakeWorker.verifierInstances[0];
    expect(verifier).toBeDefined();
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    const coverStartedAt = performance.now();
    view.rerender(<Harness request={null} />);
    const coverElapsedMs = performance.now() - coverStartedAt;
    expect(screen.getByText('IDLE')).toBeInTheDocument();
    expect(coverElapsedMs).toBeLessThan(16.7);
    expect(primary.terminated).toBe(true);
    expect(verifier.terminated).toBe(true);

    const verifierRequest = verifier.posted[0] as SnakeScarcityVerifierWorkerRequest;
    act(() => verifier.onmessage?.({
      data: runSnakeScarcityVerifierWorkerRequest(verifierRequest),
    } as MessageEvent<unknown>));
    expect(screen.getByText('IDLE')).toBeInTheDocument();
  });

  test('a selection or tab request switch stays one-frame immediate during verification', () => {
    FakeWorker.autoVerify = false;
    const current = request('verifier-selection-a');
    const view = render(<Harness request={current} />);
    const primary = FakeWorker.instances[0];
    act(() => primary.onmessage?.({
      data: readyResponse({
        key: current.key,
        risk: 'AT_RISK',
        witnessSecret: workerSecret(primary),
      }),
    } as MessageEvent<unknown>));
    const verifier = FakeWorker.verifierInstances[0];
    const switchStartedAt = performance.now();
    view.rerender(<Harness request={request('verifier-selection-b')} />);
    const switchElapsedMs = performance.now() - switchStartedAt;
    expect(switchElapsedMs).toBeLessThan(16.7);
    expect(primary.terminated).toBe(true);
    expect(verifier.terminated).toBe(true);
    expect(FakeWorker.instances).toHaveLength(2);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  test('a malformed verifier verdict preserves the accepted decision and closes scarcity', () => {
    FakeWorker.autoVerify = false;
    const current = request('bad-verifier-verdict');
    render(<ProgressiveHarness request={current} />);
    const primary = FakeWorker.instances[0];
    act(() => primary.onmessage?.({
      data: readyResponse({ key: current.key, risk: 'AT_RISK', phase: 'decision' }),
    } as MessageEvent<unknown>));
    const completion = readyResponse({
      key: current.key,
      risk: 'AT_RISK',
      witnessSecret: workerSecret(primary),
    });
    act(() => primary.onmessage?.({ data: completion } as MessageEvent<unknown>));
    const verifier = FakeWorker.verifierInstances[0];
    expect(screen.getByText('ready:AT_RISK:SCARCITY_PENDING')).toBeInTheDocument();
    const validVerdict = runSnakeScarcityVerifierWorkerRequest(
      verifier.posted[0] as SnakeScarcityVerifierWorkerRequest,
    );
    act(() => verifier.onmessage?.({
      data: { ...validVerdict, witnessAuthTag: 'wrong-response' },
    } as MessageEvent<unknown>));
    expect(screen.getByText('ready:AT_RISK:SCARCITY_SETTLED')).toBeInTheDocument();
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

  test('does not repeat an unfinished worker state on every player row', () => {
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

    expect(screen.queryByText(/CALCULATING/)).not.toBeInTheDocument();
    expect(screen.queryByText(/SAFE TO WAIT/)).not.toBeInTheDocument();
  });

  test('does not repeat a failed worker state on every player row', () => {
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

    expect(screen.queryByText(/RISK UNAVAILABLE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/SAFE TO WAIT|CALCULATING/)).not.toBeInTheDocument();
  });
});
