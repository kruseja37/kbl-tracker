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
  const [snapshot, setSnapshot] = useState<SnakeRationalRiskWorkerResponse | null>(null);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    const current = requestRef.current;
    if (!requestKey || !current || typeof Worker === 'undefined') return;

    let active = true;
    let worker: Worker | null = null;
    const markUnavailable = () => {
      if (active) setSnapshot({
        key: requestKey,
        status: 'unavailable',
        risks: [],
        scarcity: [],
        scenarios: [],
        nextPick: null,
      });
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
      setSnapshot(event.data);
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
  }, [requestKey]);

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
