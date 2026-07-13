import { useEffect, useRef, useState } from 'react';

import type {
  PlaySnakeRationalRoomInput,
  SnakeRiskRow,
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
  risks: SnakeRiskRow[];
}

export interface SnakeRationalRiskState {
  risks: readonly SnakeRiskRow[] | null;
  status: 'idle' | 'pending' | 'ready' | 'unavailable';
}

interface SnakeRationalRiskSnapshot extends SnakeRationalRiskWorkerResponse {
  unavailable?: boolean;
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
  const [snapshot, setSnapshot] = useState<SnakeRationalRiskSnapshot | null>(null);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    const current = requestRef.current;
    if (!requestKey || !current || typeof Worker === 'undefined') return;

    let active = true;
    let worker: Worker | null = null;
    const markUnavailable = () => {
      if (active) setSnapshot({ key: requestKey, risks: [], unavailable: true });
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

  if (!requestKey) return { risks: null, status: 'idle' };
  if (typeof Worker === 'undefined') return { risks: null, status: 'unavailable' };
  if (snapshot?.key !== requestKey) return { risks: null, status: 'pending' };
  if (snapshot.unavailable) return { risks: null, status: 'unavailable' };
  return { risks: snapshot.risks, status: 'ready' };
}
