import { describe, expect, it } from 'vitest';

import type {
  SimultaneousSnakeSeatingInput,
  SnakeSeatingProof,
} from '../../../../../../engines/snakeSeatingProof';
import {
  fingerprintSnakeSetupProofInput,
  SnakeSetupProofClient,
  type SnakeSetupProofWorkerLike,
  type SnakeSetupProofWorkerRequest,
  type SnakeSetupProofWorkerResponse,
} from '../snakeSetupProofClient';

const READY_PROOF: SnakeSeatingProof = {
  feasible: true,
  assignments: [],
  shortfall: null,
  message: 'READY',
};

function proofPlayer(id: string) {
  return {
    playerId: id,
    sourceId: `source:${id}`,
    versionGroupId: `person:${id}`,
    price: 10_000,
    shape: { isPitcher: false, position: 'C' },
    construction: {
      id,
      isPitcher: false,
      bat: { POW: 50, CON: 50, SPD: 50, FLD: 50, ARM: 50 },
    },
  } satisfies SimultaneousSnakeSeatingInput['pool'][number];
}

function proofInput(teamId = 'team-a', options: {
  poolIds?: readonly string[];
  referenceIds?: readonly string[];
  identityName?: string;
} = {}): SimultaneousSnakeSeatingInput {
  return {
    clubs: [{
      teamId,
      roster: [],
      budgetRemaining: 1_000_000,
      ...(options.identityName
        ? { identityArchetype: { name: options.identityName, rawShift: { 'hitters/POW': 0.1 } } }
        : {}),
    }],
    pool: (options.poolIds ?? ['base-card']).map(proofPlayer),
    ...(options.referenceIds ? { identityReferencePool: options.referenceIds.map(proofPlayer) } : {}),
    baseCaps: [],
    realTeamCount: 1,
    tier: 'standard',
  };
}

class FakeWorker implements SnakeSetupProofWorkerLike {
  onmessage: ((event: MessageEvent<SnakeSetupProofWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: SnakeSetupProofWorkerRequest[] = [];
  terminated = false;
  postError: Error | null = null;

  postMessage(message: SnakeSetupProofWorkerRequest): void {
    if (this.postError) throw this.postError;
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(response: SnakeSetupProofWorkerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<SnakeSetupProofWorkerResponse>);
  }
}

function clientHarness(cacheSize = 8) {
  const workers: FakeWorker[] = [];
  const client = new SnakeSetupProofClient({
    cacheSize,
    workerFactory: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  });
  return { client, workers };
}

describe('SnakeSetupProofClient', () => {
  it('fingerprints complete equivalent inputs deterministically', () => {
    const left = proofInput();
    const right = {
      tier: left.tier,
      realTeamCount: left.realTeamCount,
      baseCaps: left.baseCaps,
      pool: left.pool,
      clubs: left.clubs,
    } as SimultaneousSnakeSeatingInput;
    expect(fingerprintSnakeSetupProofInput(left)).toBe(fingerprintSnakeSetupProofInput(right));
    expect(fingerprintSnakeSetupProofInput(proofInput('team-b')))
      .not.toBe(fingerprintSnakeSetupProofInput(left));
  });

  it('fingerprints source, team, archetype, and resolved preset membership as semantic proof inputs', () => {
    const base = fingerprintSnakeSetupProofInput(proofInput());
    const changed = {
      source: proofInput('team-a', { referenceIds: ['source-card'] }),
      team: proofInput('team-b'),
      archetype: proofInput('team-a', { identityName: "Murderers' Row" }),
      preset: proofInput('team-a', { poolIds: ['base-card', 'wider-preset-card'] }),
    };

    for (const [name, input] of Object.entries(changed)) {
      expect(fingerprintSnakeSetupProofInput(input), name).not.toBe(base);
    }
    expect(new Set(Object.values(changed).map(fingerprintSnakeSetupProofInput))).toHaveLength(4);
  });

  it('shares one in-flight worker and reuses the resolved proof for the same fingerprint', async () => {
    const { client, workers } = clientHarness();
    const received: unknown[] = [];
    const certificate = {
      version: 1 as const,
      sourceFingerprint: 'full-source',
      assignmentFingerprint: 'full-source-assignments',
      assignments: [],
    };
    const first = client.run(proofInput(), {
      onIdentitySupportCertificate: (value) => received.push(value),
    });
    const second = client.run(proofInput());
    expect(workers).toHaveLength(1);
    expect(workers[0].messages).toHaveLength(1);
    const key = workers[0].messages[0].key;
    workers[0].emit({ key, ok: true, proof: READY_PROOF, identitySupportCertificate: certificate });
    await expect(Promise.all([first, second])).resolves.toEqual([READY_PROOF, READY_PROOF]);
    await expect(client.run(proofInput(), {
      onIdentitySupportCertificate: (value) => received.push(value),
    })).resolves.toBe(READY_PROOF);
    expect(received).toEqual([certificate, certificate]);
    expect(workers).toHaveLength(1);
  });

  it('starts a distinct worker when any proof input changes', async () => {
    const { client, workers } = clientHarness();
    const first = client.run(proofInput('team-a'));
    const second = client.run(proofInput('team-b'));
    expect(workers).toHaveLength(2);
    workers[0].emit({ key: workers[0].messages[0].key, ok: true, proof: READY_PROOF, identitySupportCertificate: null });
    workers[1].emit({ key: workers[1].messages[0].key, ok: true, proof: READY_PROOF, identitySupportCertificate: null });
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  });

  it('terminates a stale job only after its final subscriber cancels', async () => {
    const { client, workers } = clientHarness();
    const firstAbort = new AbortController();
    const secondAbort = new AbortController();
    const first = client.run(proofInput(), { signal: firstAbort.signal });
    const second = client.run(proofInput(), { signal: secondAbort.signal });
    const firstRejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    const secondRejected = expect(second).rejects.toMatchObject({ name: 'AbortError' });

    firstAbort.abort();
    expect(workers[0].terminated).toBe(false);
    secondAbort.abort();
    expect(workers[0].terminated).toBe(true);
    await firstRejected;
    await secondRejected;

    // A late response from the terminated worker is stale and cannot populate the cache.
    workers[0].emit({ key: workers[0].messages[0].key, ok: true, proof: READY_PROOF, identitySupportCertificate: null });
    const retry = client.run(proofInput());
    expect(workers).toHaveLength(2);
    workers[1].emit({ key: workers[1].messages[0].key, ok: true, proof: READY_PROOF, identitySupportCertificate: null });
    await expect(retry).resolves.toBe(READY_PROOF);
  });

  it('cancels superseded fingerprints while preserving an identical in-flight proof', async () => {
    const { client, workers } = clientHarness();
    const stale = client.run(proofInput('team-a'));
    const current = client.run(proofInput('team-b'));
    const staleRejected = expect(stale).rejects.toMatchObject({ name: 'AbortError' });
    const currentKey = fingerprintSnakeSetupProofInput(proofInput('team-b'));

    client.cancelPending(currentKey);
    expect(workers[0].terminated).toBe(true);
    expect(workers[1].terminated).toBe(false);
    workers[1].emit({ key: workers[1].messages[0].key, ok: true, proof: READY_PROOF, identitySupportCertificate: null });
    await staleRejected;
    await expect(current).resolves.toBe(READY_PROOF);
  });

  it.each([
    ['source', () => proofInput('team-a', { referenceIds: ['source-card'] })],
    ['team', () => proofInput('team-b')],
    ['archetype', () => proofInput('team-a', { identityName: "Murderers' Row" })],
    ['preset', () => proofInput('team-a', { poolIds: ['base-card', 'wider-preset-card'] })],
  ] as const)('cancels stale %s work and ignores its late result', async (_name, currentInput) => {
    const { client, workers } = clientHarness();
    const stale = client.run(proofInput());
    const current = client.run(currentInput());
    const staleRejected = expect(stale).rejects.toMatchObject({ name: 'AbortError' });
    const currentKey = fingerprintSnakeSetupProofInput(currentInput());

    client.cancelPending(currentKey);
    expect(workers).toHaveLength(2);
    expect(workers[0].terminated).toBe(true);
    expect(workers[1].terminated).toBe(false);
    workers[0].emit({ key: workers[0].messages[0].key, ok: true, proof: READY_PROOF, identitySupportCertificate: null });
    workers[1].emit({ key: workers[1].messages[0].key, ok: true, proof: READY_PROOF, identitySupportCertificate: null });

    await staleRejected;
    await expect(current).resolves.toBe(READY_PROOF);
  });

  it('bounds resolved reuse and evicts the least-recent proof', async () => {
    const { client, workers } = clientHarness(1);
    const first = client.run(proofInput('team-a'));
    workers[0].emit({ key: workers[0].messages[0].key, ok: true, proof: READY_PROOF, identitySupportCertificate: null });
    await first;
    const second = client.run(proofInput('team-b'));
    workers[1].emit({ key: workers[1].messages[0].key, ok: true, proof: READY_PROOF, identitySupportCertificate: null });
    await second;

    const retry = client.run(proofInput('team-a'));
    expect(workers).toHaveLength(3);
    workers[2].emit({ key: workers[2].messages[0].key, ok: true, proof: READY_PROOF, identitySupportCertificate: null });
    await retry;
  });

  it('fails closed on worker transport and invalid result errors', async () => {
    const broken = new SnakeSetupProofClient({
      workerFactory: () => {
        const worker = new FakeWorker();
        worker.postError = new Error('clone failed');
        return worker;
      },
    });
    await expect(broken.run(proofInput())).rejects.toThrow('clone failed');

    const { client, workers } = clientHarness();
    const pending = client.run(proofInput());
    workers[0].emit({
      key: workers[0].messages[0].key,
      ok: true,
      proof: { ...READY_PROOF, message: undefined } as unknown as SnakeSeatingProof,
      identitySupportCertificate: null,
    });
    await expect(pending).rejects.toThrow('invalid result');
  });
});
