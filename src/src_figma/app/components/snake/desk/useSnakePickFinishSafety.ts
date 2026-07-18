import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  SnakePickFinishSafetyRow,
} from '../../../../../engines/snakeSeatingProof';
import type {
  SnakePickFinishWorkerRequest,
  SnakePickFinishWorkerResponse,
} from '../../../workers/snakePickFinish.worker';

export type SnakePickFinishSafetyState =
  | { status: 'idle' | 'pending' | 'unavailable'; rows: ReadonlyMap<string, SnakePickFinishSafetyRow> }
  | { status: 'ready'; rows: ReadonlyMap<string, SnakePickFinishSafetyRow> };

const CACHE_LIMIT = 12;
const resolvedCache = new Map<string, SnakePickFinishSafetyRow[]>();

function fnv1a(parts: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= 0xff;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Stable semantic key: one worker proof per room state, team, and exact candidate universe. */
export function buildSnakePickFinishWorkerRequest(input: Omit<SnakePickFinishWorkerRequest, 'key'>): SnakePickFinishWorkerRequest {
  const clubParts = input.current.clubs.map((club) => [
    club.teamId,
    String(club.budgetRemaining),
    JSON.stringify(club.capIdentity ?? null),
    club.roster.map((player) => `${player.playerId}:${player.price}`).join(','),
  ].join('|'));
  const poolParts = input.current.pool.map((player) => (
    `${player.playerId}:${player.sourceId ?? ''}:${player.versionGroupId ?? ''}:${player.price}`
  ));
  const proofParts = input.proof.assignments.map((assignment) => (
    `${assignment.teamId}:${assignment.playerIds.join(',')}:${assignment.allInCost}`
  ));
  return {
    ...input,
    key: `snake-finish:${fnv1a([
      input.teamId,
      String(input.current.realTeamCount),
      ...clubParts,
      ...poolParts,
      ...proofParts,
      ...[...input.candidatePlayerIds].sort(),
    ])}`,
  };
}

function validResponse(
  value: unknown,
  request: SnakePickFinishWorkerRequest,
): value is SnakePickFinishWorkerResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<SnakePickFinishWorkerResponse>;
  if (response.key !== request.key || response.error !== undefined
    || (response.phase !== 'progress' && response.phase !== 'complete')
    || !Array.isArray(response.rows)) return false;
  const expected = new Set(request.candidatePlayerIds);
  const seen = new Set<string>();
  const finiteOrNull = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value));
  for (const row of response.rows) {
    if (!row || typeof row.playerId !== 'string' || !expected.has(row.playerId)
      || seen.has(row.playerId) || !['DRAFTABLE', 'OPEN', 'BLOCKED'].includes(row.status)
      || typeof row.message !== 'string' || !finiteOrNull(row.finalSalary)
      || !finiteOrNull(row.finalTax) || !finiteOrNull(row.moneyLeft)
      || (row.status === 'DRAFTABLE' && (row.finalSalary === null || row.finalTax === null || row.moneyLeft === null))
      || (row.status !== 'DRAFTABLE' && (row.finalSalary !== null || row.finalTax !== null || row.moneyLeft !== null))) return false;
    seen.add(row.playerId);
  }
  return response.phase === 'complete' ? seen.size === expected.size : seen.size > 0;
}

function remember(key: string, rows: SnakePickFinishSafetyRow[]): void {
  resolvedCache.delete(key);
  resolvedCache.set(key, rows);
  while (resolvedCache.size > CACHE_LIMIT) {
    const oldest = resolvedCache.keys().next().value as string | undefined;
    if (!oldest) break;
    resolvedCache.delete(oldest);
  }
}

function rowMap(rows: readonly SnakePickFinishSafetyRow[] | undefined): ReadonlyMap<string, SnakePickFinishSafetyRow> {
  return new Map((rows ?? []).map((row) => [row.playerId, row]));
}

export function useSnakePickFinishSafety(
  request: SnakePickFinishWorkerRequest | null,
): SnakePickFinishSafetyState {
  const requestRef = useRef(request);
  const requestKey = request?.key ?? null;
  const [snapshot, setSnapshot] = useState<{
    key: string | null;
    status: SnakePickFinishSafetyState['status'];
    rows: SnakePickFinishSafetyRow[];
  }>({ key: null, status: 'idle', rows: [] });

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    const request = requestRef.current;
    if (!request) return undefined;
    const hit = resolvedCache.get(request.key);
    if (hit) return undefined;
    let cancelled = false;
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../../../workers/snakePickFinish.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      queueMicrotask(() => {
        if (!cancelled) setSnapshot({ key: request.key, status: 'unavailable', rows: [] });
      });
      return () => { cancelled = true; };
    }
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (cancelled) return;
      const response = event.data;
      if (!validResponse(response, request)) {
        setSnapshot({ key: request.key, status: 'unavailable', rows: [] });
        worker?.terminate();
        return;
      }
      if (response.phase === 'progress') {
        setSnapshot((current) => {
          const merged = new Map((current.key === request.key ? current.rows : [])
            .map((row) => [row.playerId, row]));
          response.rows.forEach((row) => merged.set(row.playerId, row));
          return { key: request.key, status: 'pending', rows: [...merged.values()] };
        });
        return;
      }
      remember(request.key, response.rows);
      setSnapshot({ key: request.key, status: 'ready', rows: response.rows });
      worker?.terminate();
    };
    worker.onerror = () => {
      if (cancelled) return;
      setSnapshot({ key: request.key, status: 'unavailable', rows: [] });
      worker?.terminate();
    };
    try {
      worker.postMessage(request);
    } catch {
      queueMicrotask(() => {
        if (!cancelled) setSnapshot({ key: request.key, status: 'unavailable', rows: [] });
      });
      worker.terminate();
    }
    return () => {
      cancelled = true;
      worker?.terminate();
    };
  }, [requestKey]);

  return useMemo(() => {
    if (!request) return { status: 'idle' as const, rows: rowMap(undefined) };
    const rows = snapshot.key === request.key ? snapshot.rows : resolvedCache.get(request.key);
    const status = snapshot.key === request.key
      ? snapshot.status
      : rows ? 'ready' : 'pending';
    return { status, rows: rowMap(rows) } as SnakePickFinishSafetyState;
  }, [request, snapshot]);
}

export const __snakePickFinishSafetyTestUtils = {
  clearCache: () => resolvedCache.clear(),
  validResponse,
};
