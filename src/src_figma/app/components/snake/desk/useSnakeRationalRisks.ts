import { useEffect, useRef, useState } from 'react';

import type {
  PlaySnakeRationalRoomInput,
  SnakeRationalRoomStatus,
  SnakeRationalScenario,
  SnakeRiskRow,
  SnakeScarcityRow,
} from '../../../../../engines/snakeRationalRoom';
import type { LeagueBuilderMlbDraftSession } from '../../../../../utils/leagueBuilderStorage';
import {
  rationalRiskCacheKey,
  type DeskRoomPlayer,
} from './deskRoomModel';
import type { SnakeRationalSeat } from '../../../../../engines/snakeRationalRoom';

export interface SnakeRationalRiskRequest {
  key: string;
  input: PlaySnakeRationalRoomInput;
}

export interface SnakeRationalRiskWorkerResponse {
  key: string;
  status: SnakeRationalRoomStatus;
  risks: SnakeRiskRow[];
  scarcity: SnakeScarcityRow[];
  scenarios: SnakeRationalScenario[];
  nextPick: number | null;
}

export interface SnakeRationalRiskState {
  risks: readonly SnakeRiskRow[] | null;
  scarcity: readonly SnakeScarcityRow[] | null;
  scenarios: readonly SnakeRationalScenario[] | null;
  nextPick: number | null;
  status: 'idle' | 'pending' | 'ready' | 'unavailable';
}

interface RationalRiskHookState {
  epoch: number;
  requestKey: string | null;
  snapshot: SnakeRationalRiskWorkerResponse | null;
}

export function buildSnakeRationalRiskRequest(input: {
  session: LeagueBuilderMlbDraftSession;
  askingTeamId: string;
  askedPlayerIds: readonly string[];
  availablePlayers: readonly DeskRoomPlayer[];
  seats: readonly SnakeRationalSeat[];
  baseCaps: PlaySnakeRationalRoomInput['baseCaps'];
  realTeamCount: number;
}): SnakeRationalRiskRequest {
  return {
    key: rationalRiskCacheKey(input),
    input: {
      currentPickIndex: input.session.currentPickIndex,
      pickOrder: input.session.pickOrder,
      askingTeamId: input.askingTeamId,
      askedPlayerIds: input.askedPlayerIds,
      players: input.availablePlayers,
      seats: input.seats,
      baseCaps: input.baseCaps,
      realTeamCount: input.realTeamCount,
    },
  };
}

/**
 * Runs the deterministic rival playout away from React's main thread. A null
 * result means the current public-state calculation is still in flight.
 */
export function useSnakeRationalRisks(
  request: SnakeRationalRiskRequest | null,
): SnakeRationalRiskState {
  const requestRef = useRef(request);
  const requestKey = request?.key ?? null;
  const [hookState, setHookState] = useState<RationalRiskHookState>(() => ({
    epoch: 0,
    requestKey,
    snapshot: null,
  }));
  const requestEpoch = hookState.requestKey === requestKey
    ? hookState.epoch
    : hookState.epoch + 1;
  if (hookState.requestKey !== requestKey) {
    setHookState({ epoch: requestEpoch, requestKey, snapshot: null });
  }
  const snapshot = hookState.epoch === requestEpoch && hookState.requestKey === requestKey
    ? hookState.snapshot
    : null;

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    const current = requestRef.current;
    if (!requestKey || !current || typeof Worker === 'undefined') return;

    let active = true;
    let worker: Worker | null = null;
    const markUnavailable = () => {
      if (active) setHookState((state) => state.epoch === requestEpoch
        && state.requestKey === requestKey ? {
          ...state,
          snapshot: {
            key: requestKey,
            status: 'unavailable',
            risks: [],
            scarcity: [],
            scenarios: [],
            nextPick: null,
          },
        } : state);
    };
    try {
      worker = new Worker(
        new URL('../../../workers/snakeRationalRoom.worker.ts', import.meta.url),
        { type: 'module' },
      );
    } catch {
      queueMicrotask(markUnavailable);
      return () => {
        active = false;
      };
    }
    worker.onmessage = (event: MessageEvent<SnakeRationalRiskWorkerResponse>) => {
      if (!active || event.data.key !== requestKey) return;
      setHookState((state) => state.epoch === requestEpoch
        && state.requestKey === requestKey
        ? { ...state, snapshot: event.data }
        : state);
      worker?.terminate();
    };
    worker.onerror = () => {
      markUnavailable();
      worker?.terminate();
    };
    try {
      worker.postMessage(current);
    } catch {
      queueMicrotask(markUnavailable);
      worker.terminate();
    }
    return () => {
      active = false;
      worker?.terminate();
    };
  }, [requestEpoch, requestKey]);

  if (!requestKey) return { risks: null, scarcity: null, scenarios: null, nextPick: null, status: 'idle' };
  if (typeof Worker === 'undefined') {
    return { risks: null, scarcity: null, scenarios: null, nextPick: null, status: 'unavailable' };
  }
  if (snapshot?.key !== requestKey) {
    return { risks: null, scarcity: null, scenarios: null, nextPick: null, status: 'pending' };
  }
  if (snapshot.status === 'unavailable') {
    return { risks: null, scarcity: null, scenarios: null, nextPick: null, status: 'unavailable' };
  }
  return {
    risks: snapshot.risks,
    scarcity: snapshot.scarcity,
    scenarios: snapshot.scenarios,
    nextPick: snapshot.nextPick,
    status: 'ready',
  };
}
