import { useCallback, useEffect, useMemo, useRef } from 'react';

import type {
  SimultaneousSnakeSeatingInput,
  SnakeIdentitySupportCertificate,
  SnakeSeatingProof,
} from '../../../../../engines/snakeSeatingProof';

export interface SnakeSetupProofRunOptions {
  signal?: AbortSignal;
  onIdentitySupportCertificate?: (certificate: SnakeIdentitySupportCertificate | null) => void;
}

export type SnakeSetupProofRunner = (
  input: SimultaneousSnakeSeatingInput,
  options?: SnakeSetupProofRunOptions,
) => Promise<SnakeSeatingProof>;

export interface SnakeSetupProofWorkerRequest {
  key: string;
  input: SimultaneousSnakeSeatingInput;
}

export type SnakeSetupProofWorkerResponse = {
  key: string;
  ok: true;
  proof: SnakeSeatingProof;
  identitySupportCertificate: SnakeIdentitySupportCertificate | null;
} | {
  key: string;
  ok: false;
  error: string;
};

export interface SnakeSetupProofWorkerLike {
  onmessage: ((event: MessageEvent<SnakeSetupProofWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: SnakeSetupProofWorkerRequest): void;
  terminate(): void;
}

type WorkerFactory = () => SnakeSetupProofWorkerLike;

interface Subscriber {
  resolve: (proof: SnakeSeatingProof) => void;
  reject: (error: Error) => void;
  detachAbort: () => void;
  onIdentitySupportCertificate?: (certificate: SnakeIdentitySupportCertificate | null) => void;
}

interface InFlightJob {
  key: string;
  input: SimultaneousSnakeSeatingInput;
  worker: SnakeSetupProofWorkerLike | null;
  subscribers: Map<symbol, Subscriber>;
  settled: boolean;
}

export interface SnakeSetupProofClientOptions {
  workerFactory?: WorkerFactory;
  fallbackRunner?: (input: SimultaneousSnakeSeatingInput) => Promise<{
    proof: SnakeSeatingProof;
    identitySupportCertificate: SnakeIdentitySupportCertificate | null;
  }>;
  cacheSize?: number;
}

const DEFAULT_CACHE_SIZE = 8;

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, current) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
    return Object.keys(current as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((sorted, key) => {
        const entry = (current as Record<string, unknown>)[key];
        if (entry !== undefined) sorted[key] = entry;
        return sorted;
      }, {});
  });
}

/** Complete, deterministic proof identity. Arrays retain order because proof search may consume it. */
export function fingerprintSnakeSetupProofInput(input: SimultaneousSnakeSeatingInput): string {
  return `snake-setup-proof-v1:${canonicalJson(input)}`;
}

function abortError(): Error {
  if (typeof DOMException !== 'undefined') return new DOMException('Snake setup proof cancelled.', 'AbortError');
  const error = new Error('Snake setup proof cancelled.');
  error.name = 'AbortError';
  return error;
}

function validProof(value: unknown): value is SnakeSeatingProof {
  if (!value || typeof value !== 'object') return false;
  const proof = value as Partial<SnakeSeatingProof>;
  return typeof proof.feasible === 'boolean'
    && Array.isArray(proof.assignments)
    && typeof proof.message === 'string'
    && (proof.shortfall === null || (typeof proof.shortfall === 'object' && proof.shortfall !== null));
}

function defaultWorkerFactory(): SnakeSetupProofWorkerLike {
  if (typeof Worker === 'undefined') throw new Error('This browser cannot run the Snake setup proof worker.');
  return new Worker(new URL('../../../workers/snakeSetupProof.worker.ts', import.meta.url), {
    type: 'module',
  });
}

async function testOnlyFallback(input: SimultaneousSnakeSeatingInput): Promise<{
  proof: SnakeSeatingProof;
  identitySupportCertificate: SnakeIdentitySupportCertificate | null;
}> {
  const engine = await import('../../../../../engines/snakeSeatingProof');
  const proof = engine.proveSimultaneousSnakeSeating(input);
  return {
    proof,
    identitySupportCertificate: engine.createSnakeIdentitySupportCertificate(input, proof),
  };
}

export class SnakeSetupProofClient {
  private readonly workerFactory: WorkerFactory;
  private readonly fallbackRunner: SnakeSetupProofClientOptions['fallbackRunner'];
  private readonly cacheSize: number;
  private readonly cache = new Map<string, {
    proof: SnakeSeatingProof;
    identitySupportCertificate: SnakeIdentitySupportCertificate | null;
  }>();
  private readonly inFlight = new Map<string, InFlightJob>();

  constructor(options: SnakeSetupProofClientOptions = {}) {
    this.workerFactory = options.workerFactory ?? defaultWorkerFactory;
    this.fallbackRunner = options.fallbackRunner;
    this.cacheSize = Math.max(1, Math.floor(options.cacheSize ?? DEFAULT_CACHE_SIZE));
  }

  run: SnakeSetupProofRunner = (input, options = {}) => {
    if (options.signal?.aborted) return Promise.reject(abortError());
    const key = fingerprintSnakeSetupProofInput(input);
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      options.onIdentitySupportCertificate?.(cached.identitySupportCertificate);
      return Promise.resolve(cached.proof);
    }

    let job = this.inFlight.get(key);
    const created = !job;
    if (!job) {
      job = { key, input, worker: null, subscribers: new Map(), settled: false };
      this.inFlight.set(key, job);
    }

    const token = Symbol(key);
    const result = new Promise<SnakeSeatingProof>((resolve, reject) => {
      const onAbort = () => {
        const subscriber = job!.subscribers.get(token);
        if (!subscriber) return;
        subscriber.detachAbort();
        job!.subscribers.delete(token);
        reject(abortError());
        if (job!.subscribers.size === 0) this.cancelJob(job!, abortError());
      };
      options.signal?.addEventListener('abort', onAbort, { once: true });
      job!.subscribers.set(token, {
        resolve,
        reject,
        detachAbort: () => options.signal?.removeEventListener('abort', onAbort),
        onIdentitySupportCertificate: options.onIdentitySupportCertificate,
      });
    });

    if (created) this.startJob(job);
    return result;
  };

  cancelPending(exceptFingerprint?: string): void {
    for (const job of [...this.inFlight.values()]) {
      if (job.key === exceptFingerprint) continue;
      this.cancelJob(job, abortError());
    }
  }

  private startJob(job: InFlightJob): void {
    try {
      job.worker = this.workerFactory();
      job.worker.onmessage = (event) => {
        if (job.settled || this.inFlight.get(job.key) !== job) return;
        const response = event.data;
        if (!response || response.key !== job.key) return;
        if (!response.ok) {
          this.rejectJob(job, new Error(response.error || 'Snake setup proof worker failed.'));
          return;
        }
        if (!validProof(response.proof)) {
          this.rejectJob(job, new Error('Snake setup proof worker returned an invalid result.'));
          return;
        }
        this.resolveJob(job, response.proof, response.identitySupportCertificate ?? null);
      };
      job.worker.onerror = (event) => {
        this.rejectJob(job, new Error(event.message || 'Snake setup proof worker failed.'));
      };
      job.worker.postMessage({ key: job.key, input: job.input });
    } catch (error) {
      job.worker?.terminate();
      job.worker = null;
      if (!this.fallbackRunner) {
        this.rejectJob(job, error instanceof Error ? error : new Error(String(error)));
        return;
      }
      void this.fallbackRunner(job.input).then(
        (result) => validProof(result.proof)
          ? this.resolveJob(job, result.proof, result.identitySupportCertificate)
          : this.rejectJob(job, new Error('Snake setup proof fallback returned an invalid result.')),
        (fallbackError) => this.rejectJob(
          job,
          fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
        ),
      );
    }
  }

  private resolveJob(
    job: InFlightJob,
    proof: SnakeSeatingProof,
    identitySupportCertificate: SnakeIdentitySupportCertificate | null,
  ): void {
    if (job.settled || this.inFlight.get(job.key) !== job) return;
    job.settled = true;
    this.inFlight.delete(job.key);
    job.worker?.terminate();
    this.cache.set(job.key, { proof, identitySupportCertificate });
    while (this.cache.size > this.cacheSize) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
    for (const subscriber of job.subscribers.values()) {
      subscriber.detachAbort();
      subscriber.onIdentitySupportCertificate?.(identitySupportCertificate);
      subscriber.resolve(proof);
    }
    job.subscribers.clear();
  }

  private rejectJob(job: InFlightJob, error: Error): void {
    if (job.settled || this.inFlight.get(job.key) !== job) return;
    job.settled = true;
    this.inFlight.delete(job.key);
    job.worker?.terminate();
    for (const subscriber of job.subscribers.values()) {
      subscriber.detachAbort();
      subscriber.reject(error);
    }
    job.subscribers.clear();
  }

  private cancelJob(job: InFlightJob, error: Error): void {
    this.rejectJob(job, error);
  }
}

export function useSnakeSetupProofClient(): {
  runProof: SnakeSetupProofRunner;
  cancelPendingProofs: (exceptFingerprint?: string) => void;
} {
  const clientRef = useRef<SnakeSetupProofClient | null>(null);
  if (clientRef.current == null) {
    clientRef.current = new SnakeSetupProofClient({
      // Production must fail closed rather than repeat the original main-thread freeze. Vitest has
      // no Worker, so its existing engine mocks remain available through this explicit test seam.
      fallbackRunner: import.meta.env.MODE === 'test' ? testOnlyFallback : undefined,
    });
  }
  useEffect(() => () => clientRef.current?.cancelPending(), []);
  const runProof = useCallback<SnakeSetupProofRunner>(
    (input, options) => clientRef.current!.run(input, options),
    [],
  );
  const cancelPendingProofs = useCallback(
    (exceptFingerprint?: string) => clientRef.current?.cancelPending(exceptFingerprint),
    [],
  );
  return useMemo(() => ({ runProof, cancelPendingProofs }), [cancelPendingProofs, runProof]);
}
