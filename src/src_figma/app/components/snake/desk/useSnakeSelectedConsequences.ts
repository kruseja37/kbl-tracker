import { useEffect, useMemo, useRef, useState } from 'react';

import type { SelectedPlayerConsequence } from './snakeDeskIntelligenceModel';
import type {
  SnakeSelectedConsequencesWorkerRequest,
  SnakeSelectedConsequencesWorkerResponse,
} from '../../../workers/snakeSelectedConsequences.worker';

export interface SnakeSelectedConsequencesState {
  status: 'idle' | 'pending' | 'ready' | 'unavailable';
  consequenceByPlayerId: ReadonlyMap<string, SelectedPlayerConsequence>;
}

const CACHE_LIMIT = 16;
const cache = new Map<string, SelectedPlayerConsequence[]>();

function validResponse(
  value: unknown,
  request: SnakeSelectedConsequencesWorkerRequest,
): value is SnakeSelectedConsequencesWorkerResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<SnakeSelectedConsequencesWorkerResponse>;
  if (response.key !== request.key || response.error !== undefined || !Array.isArray(response.results)
    || response.results.length !== request.selectedPlayerIds.length) return false;
  return response.results.every((result, index) => Boolean(result)
    && ['ready', 'already-on-board', 'unavailable'].includes(result.status)
    && result.selectedPlayerId === request.selectedPlayerIds[index]);
}

function remember(key: string, results: SelectedPlayerConsequence[]): void {
  cache.delete(key);
  cache.set(key, results);
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

export function useSnakeSelectedConsequences(
  request: SnakeSelectedConsequencesWorkerRequest | null,
): SnakeSelectedConsequencesState {
  const key = request?.key ?? null;
  const requestRef = useRef(request);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    status: 'ready' | 'unavailable';
    results: SelectedPlayerConsequence[];
  } | null>(null);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    const request = requestRef.current;
    if (!request || cache.has(request.key)) return undefined;
    let cancelled = false;
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../../../workers/snakeSelectedConsequences.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      queueMicrotask(() => {
        if (!cancelled) setSnapshot({ key: request.key, status: 'unavailable', results: [] });
      });
      return () => { cancelled = true; };
    }
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (cancelled) return;
      if (!validResponse(event.data, request)) {
        setSnapshot({ key: request.key, status: 'unavailable', results: [] });
      } else {
        remember(request.key, event.data.results);
        setSnapshot({ key: request.key, status: 'ready', results: event.data.results });
      }
      worker?.terminate();
    };
    worker.onerror = () => {
      if (!cancelled) setSnapshot({ key: request.key, status: 'unavailable', results: [] });
      worker?.terminate();
    };
    try {
      worker.postMessage(request);
    } catch {
      queueMicrotask(() => {
        if (!cancelled) setSnapshot({ key: request.key, status: 'unavailable', results: [] });
      });
      worker.terminate();
    }
    return () => {
      cancelled = true;
      worker?.terminate();
    };
  }, [key]);

  return useMemo(() => {
    if (!request) return { status: 'idle' as const, consequenceByPlayerId: new Map() };
    const hit = cache.get(request.key);
    const results = hit ?? (snapshot?.key === request.key ? snapshot.results : []);
    const status = hit ? 'ready' : snapshot?.key === request.key ? snapshot.status : 'pending';
    return {
      status,
      consequenceByPlayerId: new Map(results.flatMap((result) => (
        result.selectedPlayerId ? [[result.selectedPlayerId, result] as const] : []
      ))),
    };
  }, [request, snapshot]);
}

export const __snakeSelectedConsequencesTestUtils = { clearCache: () => cache.clear(), validResponse };
