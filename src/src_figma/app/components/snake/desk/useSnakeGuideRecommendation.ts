import { useEffect, useRef, useState } from 'react';

import {
  validateSnakeGuideRecommendationPackage,
  type SnakeGuideRecommendationRequest,
  type SnakeGuideRecommendationRunResult,
  type SnakeGuideRecommendationState,
} from './snakeDraftDecisionModel';

export interface SnakeGuideRecommendationWorkerResponse {
  key: string;
  result: SnakeGuideRecommendationRunResult;
}

interface Snapshot extends SnakeGuideRecommendationWorkerResponse {
  privateKey: string;
  failed?: boolean;
}

interface HookState {
  epoch: number;
  activeKey: string | null;
  snapshot: Snapshot | null;
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== 'string')) return false;
  const keys = (ownKeys as string[]).sort();
  return keys.length === expected.length
    && [...expected].sort().every((key, index) => keys[index] === key);
}

function validResponse(
  value: unknown,
  request: SnakeGuideRecommendationRequest,
): value is SnakeGuideRecommendationWorkerResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as SnakeGuideRecommendationWorkerResponse;
  if (!hasExactKeys(value, ['key', 'result'])
    || response.key !== request.key || !response.result || typeof response.result !== 'object') return false;
  if (response.result.status === 'unavailable') return hasExactKeys(response.result, ['status']);
  return response.result.status === 'ready'
    && hasExactKeys(response.result, ['status', 'proposal'])
    && validateSnakeGuideRecommendationPackage(request, response.result.proposal);
}

/**
 * The worker receives only public draft facts. `privateKey` never crosses postMessage; it is the
 * render-time identity fence that prevents an old club/claim/seat result from becoming visible.
 */
export function useSnakeGuideRecommendation(
  request: SnakeGuideRecommendationRequest | null,
  privateKey: string | null,
): SnakeGuideRecommendationState {
  const requestRef = useRef(request);
  const requestKey = request?.key ?? null;
  const activeKey = requestKey && privateKey ? `${privateKey}::${requestKey}` : null;
  const [hookState, setHookState] = useState<HookState>(() => ({
    epoch: 0,
    activeKey,
    snapshot: null,
  }));
  const requestEpoch = hookState.activeKey === activeKey
    ? hookState.epoch
    : hookState.epoch + 1;
  if (hookState.activeKey !== activeKey) {
    setHookState({ epoch: requestEpoch, activeKey, snapshot: null });
  }
  const snapshot = hookState.epoch === requestEpoch && hookState.activeKey === activeKey
    ? hookState.snapshot
    : null;

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    const current = requestRef.current;
    if (!activeKey || !requestKey || !privateKey || !current || typeof Worker === 'undefined') return;
    let active = true;
    let worker: Worker | null = null;
    const fail = () => {
      if (active) setHookState((state) => state.epoch === requestEpoch && state.activeKey === activeKey ? {
        ...state,
        snapshot: {
          key: requestKey,
          privateKey,
          result: { status: 'unavailable' },
          failed: true,
        },
      } : state);
    };
    try {
      worker = new Worker(
        new URL('../../../workers/snakeGuideRecommendation.worker.ts', import.meta.url),
        { type: 'module' },
      );
    } catch {
      queueMicrotask(fail);
      return () => { active = false; };
    }
    worker.onmessage = (event: MessageEvent<SnakeGuideRecommendationWorkerResponse>) => {
      if (!active || event.data.key !== requestKey) return;
      if (!validResponse(event.data, current)) {
        fail();
        worker?.terminate();
        return;
      }
      setHookState((state) => state.epoch === requestEpoch && state.activeKey === activeKey
        ? { ...state, snapshot: { ...event.data, privateKey } }
        : state);
      worker?.terminate();
    };
    worker.onerror = () => {
      fail();
      worker?.terminate();
    };
    try {
      worker.postMessage(current);
    } catch {
      queueMicrotask(fail);
      worker.terminate();
    }
    return () => {
      active = false;
      worker?.terminate();
    };
  }, [activeKey, privateKey, requestEpoch, requestKey]);

  if (!activeKey || !requestKey || !privateKey) return { status: 'idle', proposal: null };
  if (typeof Worker === 'undefined') return { status: 'unavailable', proposal: null };
  if (!snapshot || snapshot.key !== requestKey || snapshot.privateKey !== privateKey) {
    return { status: 'pending', proposal: null };
  }
  if (snapshot.failed || snapshot.result.status === 'unavailable') {
    return { status: 'unavailable', proposal: null };
  }
  return { status: 'ready', proposal: snapshot.result.proposal };
}
