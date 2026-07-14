import { useEffect, useRef, useState } from 'react';

import type {
  DerivedSnakeAssistantBoard,
  SnakeAssistantBoardRequest,
  SnakeAssistantBoardRunResult,
} from './snakeDeskIntelligenceModel';
import type { SnakeAssistantUnavailableReason } from '../../../../../engines/snakeAssistantBoard';
import {
  CHEMISTRY_CODES,
  CHEMISTRY_CODE_TO_WORD,
  type ChemistryCode,
} from '../../../../../data/chemistryCanonical';
import { isLegalRoster } from '../../../../../data/rosterConstruction';
import { evaluateSnakePlan } from '../../../../../engines/snakeEconomics';
import { isDesignPlayerEligibleForSlot } from '../../../../../engines/rosterDesignFeasibility';
import { deriveVersionGroupId, unavailableVersionPlayerIds } from '../../../../../engines/snakeVersioning';
import { buildChemistryStrip } from './draftTruthModel';

export interface SnakeAssistantBoardWorkerResponse {
  key: string;
  result: SnakeAssistantBoardRunResult;
}

export interface SnakeAssistantBoardState {
  status: 'idle' | 'pending' | 'ready' | 'unavailable';
  board: DerivedSnakeAssistantBoard | null;
  /** Present only when this exact request returned a validated engine infeasibility. */
  infeasibleReason: SnakeAssistantUnavailableReason | null;
}

interface Snapshot extends SnakeAssistantBoardWorkerResponse {
  workerFailed?: boolean;
}

interface BaselineProof {
  /** The pinned request key whose exact input, minus only selectedPinPlayerId, was evaluated. */
  pinnedRequestKey: string;
  ready: boolean;
}

const ASSISTANT_UNAVAILABLE_REASONS = new Set<SnakeAssistantUnavailableReason>([
  'MISSING_INPUT',
  'INVALID_POOL',
  'INVALID_NUMERIC_INPUT',
  'VERSION_CONFLICT',
  'MISSING_SETTLED_SALARY',
  'PIN_UNAVAILABLE',
  'PIN_UNMATCHED',
  'DROPPED_PIN',
  'INCOMPLETE_BOARD',
  'ILLEGAL_BOARD',
  'INSOLVENT_BOARD',
]);

const DIRECT_PIN_INFEASIBLE_REASONS = new Set<SnakeAssistantUnavailableReason>([
  'PIN_UNAVAILABLE',
]);

const BASELINE_PROVEN_PIN_INFEASIBLE_REASONS = new Set<SnakeAssistantUnavailableReason>([
  'PIN_UNMATCHED',
  'DROPPED_PIN',
]);

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== 'string')) return false;
  const keys = (ownKeys as string[]).sort();
  return keys.length === expected.length
    && [...expected].sort().every((key, index) => keys[index] === key);
}

function isChemistryCode(value: unknown): value is ChemistryCode {
  return typeof value === 'string' && CHEMISTRY_CODES.some((code) => code === value);
}

function canonicalChemistryWord(value: unknown): string | null {
  return isChemistryCode(value) ? CHEMISTRY_CODE_TO_WORD[value] : null;
}

function sameFinite(left: number | null, right: number): boolean {
  return typeof left === 'number' && Number.isFinite(left) && Math.abs(left - right) < 1e-9;
}

function playerVersionIdentity(player: SnakeAssistantBoardRequest['input']['activePool'][number]) {
  return {
    playerId: player.playerId,
    sourceId: player.sourceId,
    versionGroupId: player.versionGroupId,
  };
}

function readyBoardMatchesRequest(
  board: DerivedSnakeAssistantBoard,
  request: SnakeAssistantBoardRequest,
): boolean {
  const input = request.input;
  if (!Array.isArray(input.activePool) || !Array.isArray(input.completedPicks)
    || !Array.isArray(input.slots) || input.slots.length !== 22) return false;
  const poolById = new Map(input.activePool.map((player) => [player.playerId, player]));
  if (poolById.size !== input.activePool.length
    || input.completedPicks.some((pick) => !poolById.has(pick.playerId))) return false;
  const selectedByGroup = input.versionSelections ?? {};
  const versionValidPool = input.activePool.filter((player) => {
    const selectedId = selectedByGroup[deriveVersionGroupId(playerVersionIdentity(player))];
    return !selectedId || selectedId === player.playerId;
  });
  const versionValidGroups = versionValidPool.map((player) => deriveVersionGroupId(playerVersionIdentity(player)));
  if (new Set(versionValidGroups).size !== versionValidGroups.length) return false;
  const pickedIds = new Set(input.completedPicks.map((pick) => pick.playerId));
  const draftedGroups = new Set(input.completedPicks.map((pick) => (
    deriveVersionGroupId(playerVersionIdentity(poolById.get(pick.playerId)!))
  )));
  const retiredIds = unavailableVersionPlayerIds(input.versionState);
  const ownPickById = new Map(input.completedPicks
    .filter((pick) => pick.teamId === input.teamId)
    .map((pick) => [pick.playerId, pick]));
  if ([...ownPickById.values()].some((pick) => !Number.isFinite(pick.settledSalary)
    || (pick.settledSalary ?? -1) < 0)) return false;
  const allowedIds = new Set([
    ...ownPickById.keys(),
    ...versionValidPool.filter((player) => !pickedIds.has(player.playerId)
      && !retiredIds.has(player.playerId)
      && !draftedGroups.has(deriveVersionGroupId(playerVersionIdentity(player))))
      .map((player) => player.playerId),
  ]);
  const selectedPlayers = board.playerIds.map((playerId) => poolById.get(playerId));
  if (selectedPlayers.some((player) => !player)
    || board.playerIds.some((playerId) => !allowedIds.has(playerId))) return false;
  const currentPlayers = selectedPlayers as NonNullable<(typeof selectedPlayers)[number]>[];
  const selectedGroups = currentPlayers.map((player) => deriveVersionGroupId(playerVersionIdentity(player)));
  if (new Set(selectedGroups).size !== selectedGroups.length
    || !isLegalRoster(currentPlayers.map((player) => player.seating.shape))) return false;
  const designById = new Map(input.slots.map((slot) => [slot.slotId, slot]));
  if (designById.size !== 22 || board.slots.some((slot) => {
    const design = designById.get(slot.slotId);
    const player = poolById.get(slot.playerId);
    return !design || !player || !isDesignPlayerEligibleForSlot(design, {
      profile: {
        isPitcher: player.seating.shape.isPitcher,
        primaryPosition: player.seating.shape.position,
      },
      slotPlayer: player.seating.shape,
    });
  })) return false;
  const selectedPin = input.selectedPinPlayerId ?? null;
  const expectedPinnedIds = new Set([
    ...ownPickById.keys(),
    ...(selectedPin ? [selectedPin] : []),
  ]);
  if ([...expectedPinnedIds].some((playerId) => !board.playerIds.includes(playerId))
    || board.slots.some((slot) => slot.pinned !== expectedPinnedIds.has(slot.playerId))) return false;
  if (board.recommendationOrder.length === 0
    || new Set(board.recommendationOrder).size !== board.recommendationOrder.length
    || board.recommendationOrder.some((playerId) => !allowedIds.has(playerId))
    || board.playerIds.some((playerId) => !board.recommendationOrder.includes(playerId))) return false;
  const recommendationGroups = board.recommendationOrder.map((playerId) => (
    deriveVersionGroupId(playerVersionIdentity(poolById.get(playerId)!))
  ));
  if (new Set(recommendationGroups).size !== recommendationGroups.length) return false;
  let plan;
  try {
    plan = evaluateSnakePlan({
      boardPlayerIds: board.playerIds,
      players: currentPlayers.map((player) => ({
        ...player.seating,
        playerId: player.playerId,
        sourceId: player.sourceId ?? undefined,
        versionGroupId: player.versionGroupId ?? undefined,
        price: ownPickById.get(player.playerId)?.settledSalary ?? player.frozenIv,
      })),
      budget: input.budget,
      baseCaps: input.baseCaps,
      realTeamCount: input.realTeamCount,
      capIdentity: input.capIdentity,
    });
  } catch {
    return false;
  }
  if (plan.playerIds.length !== 22 || plan.planCushion < -1e-9
    || !sameFinite(board.ledger.salary, plan.planCost)
    || !sameFinite(board.ledger.tax, plan.planTax)
    || !sameFinite(board.ledger.allIn, plan.planCost + plan.planTax)
    || !sameFinite(board.ledger.moneyLeft, plan.planCushion)) return false;
  return JSON.stringify(board.chemistry) === JSON.stringify(
    buildChemistryStrip(currentPlayers.map((player) => player.stored)),
  );
}

function finiteLedger(board: DerivedSnakeAssistantBoard): boolean {
  if (!board.ledger || typeof board.ledger !== 'object'
    || !hasExactKeys(board.ledger, ['rosterCount', 'salary', 'tax', 'allIn', 'moneyLeft'])) return false;
  const values = [
    board.ledger.rosterCount,
    board.ledger.salary,
    board.ledger.tax,
    board.ledger.allIn,
    board.ledger.moneyLeft,
  ];
  return values.every((value) => typeof value === 'number' && Number.isFinite(value))
    && board.ledger.rosterCount === 22
    && Math.abs(board.ledger.allIn! - (board.ledger.salary! + board.ledger.tax!)) < 1e-9
    && board.ledger.moneyLeft! >= -1e-9;
}

function validReadyBoard(value: unknown, request: SnakeAssistantBoardRequest): value is DerivedSnakeAssistantBoard {
  if (!value || typeof value !== 'object') return false;
  const board = value as DerivedSnakeAssistantBoard;
  if (!hasExactKeys(value, ['kind', 'teamId', 'slots', 'playerIds', 'recommendationOrder', 'ledger', 'chemistry'])
    || board.kind !== 'snake-assistant-board' || board.teamId !== request.input.teamId) return false;
  if (!Array.isArray(board.slots) || board.slots.length !== 22
    || !Array.isArray(board.playerIds) || board.playerIds.length !== 22
    || !Array.isArray(board.recommendationOrder)
    || !Array.isArray(board.chemistry) || board.chemistry.length !== 5) return false;
  const slotIds = new Set<string>();
  const slotPlayers = new Set<string>();
  for (const slot of board.slots) {
    if (!slot || typeof slot !== 'object' || !hasExactKeys(slot, ['slotId', 'playerId', 'pinned'])
      || typeof slot.slotId !== 'string' || !slot.slotId
      || typeof slot.playerId !== 'string' || !slot.playerId
      || typeof slot.pinned !== 'boolean'
      || slotIds.has(slot.slotId) || slotPlayers.has(slot.playerId)) return false;
    slotIds.add(slot.slotId);
    slotPlayers.add(slot.playerId);
  }
  const recommendationOrder = new Set(board.recommendationOrder);
  const requestSlotIds = new Set(request.input.slots?.map((slot) => slot.slotId) ?? []);
  if (requestSlotIds.size !== 22 || [...requestSlotIds].some((slotId) => !slotIds.has(slotId))
    || new Set(board.playerIds).size !== 22
    || board.playerIds.some((playerId) => typeof playerId !== 'string' || !slotPlayers.has(playerId))
    || recommendationOrder.size !== board.recommendationOrder.length
    || board.recommendationOrder.some((playerId) => typeof playerId !== 'string' || !playerId)
    || !finiteLedger(board)) return false;
  const families = new Set<string>();
  for (const row of board.chemistry) {
    if (!row || typeof row !== 'object' || !hasExactKeys(row, ['family', 'word', 'count', 'tier'])
      || typeof row.family !== 'string' || families.has(row.family)
      || row.word !== canonicalChemistryWord(row.family)
      || !Number.isInteger(row.count) || row.count! < 0
      || !['L1', 'L2', 'L3'].includes(row.tier ?? '')) return false;
    families.add(row.family);
  }
  return CHEMISTRY_CODES.every((family) => families.has(family))
    && readyBoardMatchesRequest(board, request);
}

function validWorkerResponse(
  value: unknown,
  request: SnakeAssistantBoardRequest,
): value is SnakeAssistantBoardWorkerResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as SnakeAssistantBoardWorkerResponse;
  if (!hasExactKeys(value, ['key', 'result'])
    || response.key !== request.key || !response.result || typeof response.result !== 'object') return false;
  if (response.result.status === 'ready') return hasExactKeys(response.result, ['status', 'board'])
    && validReadyBoard(response.result.board, request);
  return response.result.status === 'unavailable'
    && hasExactKeys(response.result, ['status', 'reason'])
    && ASSISTANT_UNAVAILABLE_REASONS.has(response.result.reason);
}

export function useSnakeAssistantBoard(request: SnakeAssistantBoardRequest | null): SnakeAssistantBoardState {
  const requestRef = useRef(request);
  const requestKey = request?.key ?? null;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [baselineProof, setBaselineProof] = useState<BaselineProof | null>(null);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    if (requestKey) return;
    // Privacy exception: a covered desk must discard the prior private payload before the same
    // request object can be revealed again. Deferring this reset can resurrect a same-key result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(null);
    setBaselineProof(null);
  }, [requestKey]);

  useEffect(() => {
    const current = requestRef.current;
    if (!requestKey || !current || typeof Worker === 'undefined') return;
    let active = true;
    let worker: Worker | null = null;
    let pinnedSettled = false;
    const selectedPinPlayerId = current.input.selectedPinPlayerId ?? null;
    const baselineRequest: SnakeAssistantBoardRequest | null = selectedPinPlayerId ? {
      key: `${requestKey}:unpinned-baseline`,
      input: { ...current.input, selectedPinPlayerId: null },
    } : null;
    let baselineSettled = !baselineRequest;
    const terminateIfSettled = () => {
      if (pinnedSettled && baselineSettled) worker?.terminate();
    };
    const fail = () => {
      if (active) {
        pinnedSettled = true;
        baselineSettled = true;
        setSnapshot({
          key: requestKey,
          result: { status: 'unavailable', reason: 'MISSING_INPUT' },
          workerFailed: true,
        });
        setBaselineProof({ pinnedRequestKey: requestKey, ready: false });
      }
      worker?.terminate();
    };
    const settleBaseline = (ready: boolean) => {
      if (!active) return;
      baselineSettled = true;
      setBaselineProof({ pinnedRequestKey: requestKey, ready });
      terminateIfSettled();
    };
    try {
      worker = new Worker(new URL('../../../workers/snakeAssistantBoard.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      queueMicrotask(fail);
      return () => { active = false; };
    }
    worker.onmessage = (event: MessageEvent<SnakeAssistantBoardWorkerResponse>) => {
      if (!active) return;
      if (baselineRequest && event.data.key === baselineRequest.key) {
        settleBaseline(validWorkerResponse(event.data, baselineRequest)
          && event.data.result.status === 'ready');
        return;
      }
      if (event.data.key !== requestKey) return;
      pinnedSettled = true;
      if (!validWorkerResponse(event.data, current)) {
        fail();
        return;
      }
      setSnapshot(event.data);
      if (baselineRequest && event.data.result.status === 'unavailable'
        && BASELINE_PROVEN_PIN_INFEASIBLE_REASONS.has(event.data.result.reason)) {
        try {
          worker?.postMessage(baselineRequest);
        } catch {
          queueMicrotask(() => settleBaseline(false));
        }
        return;
      }
      baselineSettled = true;
      terminateIfSettled();
    };
    worker.onerror = fail;
    try {
      worker.postMessage(current);
    } catch {
      queueMicrotask(fail);
      worker.terminate();
      return () => { active = false; };
    }
    return () => {
      active = false;
      worker?.terminate();
    };
  }, [requestKey]);

  if (!requestKey) return { status: 'idle', board: null, infeasibleReason: null };
  if (typeof Worker === 'undefined') return { status: 'unavailable', board: null, infeasibleReason: null };
  if (snapshot?.key !== requestKey) return { status: 'pending', board: null, infeasibleReason: null };
  if (snapshot.workerFailed) return { status: 'unavailable', board: null, infeasibleReason: null };
  if (snapshot.result.status === 'unavailable') {
    const directPinFailure = DIRECT_PIN_INFEASIBLE_REASONS.has(snapshot.result.reason);
    const baselineProvesPinFailure = BASELINE_PROVEN_PIN_INFEASIBLE_REASONS.has(snapshot.result.reason)
      && baselineProof?.pinnedRequestKey === requestKey
      && baselineProof.ready;
    const reason = request?.input.selectedPinPlayerId && (directPinFailure || baselineProvesPinFailure)
      ? snapshot.result.reason : null;
    return { status: 'unavailable', board: null, infeasibleReason: reason };
  }
  return { status: 'ready', board: snapshot.result.board, infeasibleReason: null };
}
