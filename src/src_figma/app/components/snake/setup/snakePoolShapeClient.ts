import {
  extractPoolFromDemand,
  type DemandUniversePlayer,
  type PoolFromDemandResult,
  type TeamDesignInput,
} from '../../../../../engines/poolFromDemand';
import type { HistoricalArchetype } from '../../../../../data/historicalArchetypes';
import type { TierKey } from '../../../../../data/tierParams';

export interface SnakePoolShapeInput {
  universe: DemandUniversePlayer[];
  designs: TeamDesignInput[];
  selectedArchetypes: HistoricalArchetype[];
  tier: TierKey;
  options: NonNullable<Parameters<typeof extractPoolFromDemand>[4]>;
}

export type SnakePoolShapeWorkerResponse = {
  ok: true;
  result: PoolFromDemandResult;
} | {
  ok: false;
  error: string;
};

export interface SnakePoolShapeWorkerLike {
  onmessage: ((event: MessageEvent<SnakePoolShapeWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: SnakePoolShapeInput): void;
  terminate(): void;
}

interface RunSnakePoolShapeOptions {
  signal?: AbortSignal;
  workerFactory?: () => SnakePoolShapeWorkerLike;
}

function abortError(): Error {
  if (typeof DOMException !== 'undefined') return new DOMException('Snake pool build cancelled.', 'AbortError');
  const error = new Error('Snake pool build cancelled.');
  error.name = 'AbortError';
  return error;
}

function defaultWorkerFactory(): SnakePoolShapeWorkerLike {
  if (typeof Worker === 'undefined') throw new Error('This browser cannot run the Snake pool builder.');
  return new Worker(new URL('../../../workers/snakePoolShape.worker.ts', import.meta.url), {
    type: 'module',
  });
}

function shapeOnCurrentThread(input: SnakePoolShapeInput): PoolFromDemandResult {
  return extractPoolFromDemand(
    input.universe,
    input.designs,
    input.selectedArchetypes,
    input.tier,
    input.options,
  );
}

/** Keep production pool shaping off the UI thread; Vitest retains a deterministic no-Worker seam. */
export function runSnakePoolShape(
  input: SnakePoolShapeInput,
  options: RunSnakePoolShapeOptions = {},
): Promise<PoolFromDemandResult> {
  if (options.signal?.aborted) return Promise.reject(abortError());
  if (typeof Worker === 'undefined' && !options.workerFactory) {
    if (import.meta.env.MODE === 'test') return Promise.resolve(shapeOnCurrentThread(input));
    return Promise.reject(new Error('This browser cannot run the Snake pool builder.'));
  }

  return new Promise<PoolFromDemandResult>((resolve, reject) => {
    let settled = false;
    let worker: SnakePoolShapeWorkerLike | null = null;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener('abort', onAbort);
      worker?.terminate();
      callback();
    };
    const onAbort = () => finish(() => reject(abortError()));
    try {
      worker = (options.workerFactory ?? defaultWorkerFactory)();
      worker.onmessage = (event) => finish(() => {
        if (event.data.ok) resolve(event.data.result);
        else reject(new Error(event.data.error || 'Snake pool builder failed.'));
      });
      worker.onerror = (event) => finish(() => reject(new Error(event.message || 'Snake pool builder failed.')));
      options.signal?.addEventListener('abort', onAbort, { once: true });
      worker.postMessage(input);
    } catch (error) {
      worker?.terminate();
      settled = true;
      options.signal?.removeEventListener('abort', onAbort);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
