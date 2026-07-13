import { useEffect, useRef, useState } from 'react';

import type {
  DerivedSnakeAssistantBoard,
  SnakeAssistantBoardRequest,
  SnakeAssistantBoardRunResult,
} from './snakeDeskIntelligenceModel';

export interface SnakeAssistantBoardWorkerResponse {
  key: string;
  result: SnakeAssistantBoardRunResult;
}

export interface SnakeAssistantBoardState {
  status: 'idle' | 'pending' | 'ready' | 'unavailable';
  board: DerivedSnakeAssistantBoard | null;
}

interface Snapshot extends SnakeAssistantBoardWorkerResponse {
  workerFailed?: boolean;
}

export function useSnakeAssistantBoard(request: SnakeAssistantBoardRequest | null): SnakeAssistantBoardState {
  const requestRef = useRef(request);
  const requestKey = request?.key ?? null;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    if (requestKey) return;
    // Privacy exception: a covered desk must discard the prior private payload before the same
    // request object can be revealed again. Deferring this reset can resurrect a same-key result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(null);
  }, [requestKey]);

  useEffect(() => {
    const current = requestRef.current;
    if (!requestKey || !current || typeof Worker === 'undefined') return;
    let active = true;
    let worker: Worker | null = null;
    const fail = () => {
      if (active) setSnapshot({
        key: requestKey,
        result: { status: 'unavailable', reason: 'MISSING_INPUT' },
        workerFailed: true,
      });
    };
    try {
      worker = new Worker(new URL('../../../workers/snakeAssistantBoard.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      queueMicrotask(fail);
      return () => { active = false; };
    }
    worker.onmessage = (event: MessageEvent<SnakeAssistantBoardWorkerResponse>) => {
      if (!active || event.data.key !== requestKey) return;
      setSnapshot(event.data);
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
  }, [requestKey]);

  if (!requestKey) return { status: 'idle', board: null };
  if (typeof Worker === 'undefined') return { status: 'unavailable', board: null };
  if (snapshot?.key !== requestKey) return { status: 'pending', board: null };
  if (snapshot.workerFailed || snapshot.result.status === 'unavailable') return { status: 'unavailable', board: null };
  return { status: 'ready', board: snapshot.result.board };
}
