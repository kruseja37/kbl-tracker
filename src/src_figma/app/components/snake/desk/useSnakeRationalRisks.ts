import { useEffect, useRef, useState } from 'react';

import {
  validateSnakeScarcityWitness,
  type SnakeScarcityWitness,
  type PlaySnakeRationalRoomInput,
  type SnakeRationalRoomStatus,
  type SnakeRationalScenario,
  type SnakeRiskRow,
  type SnakeScarcityRow,
} from '../../../../../engines/snakeRationalRoom';
import type { LeagueBuilderMlbDraftSession } from '../../../../../utils/leagueBuilderStorage';
import { deriveVersionGroupId } from '../../../../../engines/snakeVersioning';
import {
  rationalRiskCacheKey,
  type DeskRoomPlayer,
} from './deskRoomModel';
import type { SnakeRationalSeat } from '../../../../../engines/snakeRationalRoom';
import type {
  SnakeScarcityVerifierWorkerRequest,
} from '../../../workers/snakeScarcityVerifier.worker';

export interface SnakeRationalRiskRequest {
  key: string;
  input: PlaySnakeRationalRoomInput;
}

export interface SnakeRationalRiskWorkerRequest extends SnakeRationalRiskRequest {
  witnessSecret: string;
}

export interface SnakeRationalRiskWorkerResponse {
  key: string;
  phase: 'decision' | 'complete';
  status: SnakeRationalRoomStatus;
  risks: SnakeRiskRow[];
  scarcity: SnakeScarcityRow[] | null;
  scarcityWitness: SnakeScarcityWitness | null;
  scenarios: SnakeRationalScenario[];
  nextPick: number | null;
}

export interface SnakeRationalRiskState {
  risks: readonly SnakeRiskRow[] | null;
  scarcity: readonly SnakeScarcityRow[] | null;
  scenarios: readonly SnakeRationalScenario[] | null;
  nextPick: number | null;
  status: 'idle' | 'pending' | 'ready' | 'unavailable';
  scarcityPending: boolean;
}

interface RationalRiskHookState {
  epoch: number;
  requestKey: string | null;
  snapshot: SnakeRationalRiskWorkerResponse | null;
  scarcityClosed: boolean;
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function nonnegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function finiteOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function createWitnessSecret(): string | null {
  if (!globalThis.crypto?.getRandomValues) return null;
  const words = new Uint32Array(8);
  globalThis.crypto.getRandomValues(words);
  return [...words].map((word) => word.toString(16).padStart(8, '0')).join('');
}

function expectedNextPick(request: SnakeRationalRiskRequest): { index: number; pick: number } | null {
  const index = request.input.pickOrder.findIndex((slot, slotIndex) => (
    slotIndex > request.input.currentPickIndex && slot.teamId === request.input.askingTeamId
  ));
  const pick = request.input.pickOrder[index]?.pick;
  return index >= 0 && positiveInteger(pick) ? { index, pick } : null;
}

function validScenarioArray(
  value: unknown,
  request: SnakeRationalRiskRequest,
  nextPick: number | null,
): value is SnakeRationalScenario[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true;
  const next = expectedNextPick(request);
  if (!next || nextPick !== next.pick) return false;
  const startIndex = request.input.pickOrder[request.input.currentPickIndex]?.teamId === request.input.askingTeamId
    ? request.input.currentPickIndex + 1
    : request.input.currentPickIndex;
  const interval = request.input.pickOrder.slice(startIndex, next.index);
  const expectedIds = new Set<string>(['BASE']);
  for (const slot of interval) expectedIds.add(`RIVAL_SECOND:${slot.teamId}`);
  const playerById = new Map(request.input.players.map((player) => [player.playerId, player]));
  const seenIds = new Set<string>();
  for (const rawScenario of value) {
    const scenario = record(rawScenario);
    if (!scenario || typeof scenario.id !== 'string' || !expectedIds.has(scenario.id)
      || seenIds.has(scenario.id) || (scenario.status !== 'valid' && scenario.status !== 'invalid')
      || !Array.isArray(scenario.picks)) return false;
    seenIds.add(scenario.id);
    if (scenario.status === 'invalid') {
      if (scenario.picks.length !== 0) return false;
      continue;
    }
    if (scenario.picks.length !== interval.length) return false;
    const selectedGroups = new Set<string>();
    for (let index = 0; index < scenario.picks.length; index += 1) {
      const pick = record(scenario.picks[index]);
      const slot = interval[index];
      if (!pick || !slot || pick.pick !== slot.pick || pick.pickIndex !== startIndex + index
        || pick.teamId !== slot.teamId || typeof pick.playerId !== 'string'
        || typeof pick.versionGroupId !== 'string' || typeof pick.interest !== 'number'
        || !Number.isFinite(pick.interest)) return false;
      const player = playerById.get(pick.playerId);
      if (!player || deriveVersionGroupId(player) !== pick.versionGroupId
        || selectedGroups.has(pick.versionGroupId)) return false;
      selectedGroups.add(pick.versionGroupId);
    }
  }
  return seenIds.size === expectedIds.size && [...expectedIds].every((id) => seenIds.has(id));
}

function validRiskArray(
  value: unknown,
  request: SnakeRationalRiskRequest,
  scenarios: readonly SnakeRationalScenario[],
  nextPick: number,
): value is SnakeRiskRow[] {
  if (!Array.isArray(value)) return false;
  const askedIds = [...new Set(request.input.askedPlayerIds)];
  if (value.length !== askedIds.length) return false;
  const playerById = new Map(request.input.players.map((player) => [player.playerId, player]));
  const validScenarios = scenarios.filter((scenario) => scenario.status === 'valid');
  const base = scenarios.find((scenario) => scenario.id === 'BASE');
  if (!base || base.status !== 'valid' || validScenarios.length === 0) return false;
  const seen = new Set<string>();
  for (const rawRisk of value) {
    const risk = record(rawRisk);
    if (!risk || typeof risk.playerId !== 'string' || !askedIds.includes(risk.playerId)
      || seen.has(risk.playerId) || !['SAFE_TO_WAIT', 'AT_RISK', 'LIKELY_GONE'].includes(String(risk.risk))
      || risk.nextPick !== nextPick || !finiteOrNull(risk.earliestSelectingPick)
      || !positiveInteger(risk.latestSelectingPick) || typeof risk.latestSelectingPickIsAskingTurn !== 'boolean'
      || !nonnegativeInteger(risk.interestedClubCount) || !finiteOrNull(risk.draftedAtPick)
      || !nonnegativeInteger(risk.rationalBuyersBeforeTurn)) return false;
    const player = playerById.get(risk.playerId);
    if (!player) return false;
    const groupId = deriveVersionGroupId(player);
    const selected = validScenarios.flatMap((scenario) => (
      scenario.picks.find((pick) => pick.versionGroupId === groupId) ?? []
    ));
    const expectedRisk = selected.length === 0
      ? 'SAFE_TO_WAIT'
      : selected.length === validScenarios.length ? 'LIKELY_GONE' : 'AT_RISK';
    const interestedClubCount = new Set(selected.map((pick) => pick.teamId)).size;
    const baseSelection = base.picks.find((pick) => pick.versionGroupId === groupId) ?? null;
    if (risk.risk !== expectedRisk
      || risk.earliestSelectingPick !== (selected.length > 0 ? Math.min(...selected.map((pick) => pick.pick)) : null)
      || risk.latestSelectingPick !== (selected.length === validScenarios.length
        ? Math.max(...selected.map((pick) => pick.pick)) : nextPick)
      || risk.latestSelectingPickIsAskingTurn !== (selected.length !== validScenarios.length)
      || risk.interestedClubCount !== interestedClubCount
      || risk.draftedAtPick !== (baseSelection?.pick ?? null)
      || risk.rationalBuyersBeforeTurn !== interestedClubCount) return false;
    seen.add(risk.playerId);
  }
  return askedIds.every((id) => seen.has(id));
}

function validScarcityArray(
  value: unknown,
  request: SnakeRationalRiskRequest,
): value is SnakeScarcityRow[] {
  if (!Array.isArray(value)) return false;
  const askedIds = new Set(request.input.askedPlayerIds);
  const playerIds = new Set(request.input.players.map((player) => player.playerId));
  const roles = new Set(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'CATCHER_DEPTH', 'SP', 'RP', 'CP']);
  const seen = new Set<string>();
  for (const rawRow of value) {
    const row = record(rawRow);
    if (!row || typeof row.playerId !== 'string' || !askedIds.has(row.playerId)
      || typeof row.role !== 'string' || !roles.has(row.role)
      || !nonnegativeInteger(row.viablePeopleLeft) || !nonnegativeInteger(row.clubsStillNeeding)
      || row.clubsStillNeeding > request.input.realTeamCount
      || !finiteOrNull(row.lowestViableTrueCost) || !finiteOrNull(row.highestViableTrueCost)
      || !finiteOrNull(row.targetContextualWorth) || !finiteOrNull(row.replacementContextualWorth)
      || !finiteOrNull(row.contextualWorthDrop)
      || (row.replacementState !== 'AVAILABLE' && row.replacementState !== 'NO_REPLACEMENT')) return false;
    const identity = `${row.playerId}:${row.role}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    if ((row.lowestViableTrueCost === null) !== (row.highestViableTrueCost === null)
      || (row.viablePeopleLeft === 0) !== (row.lowestViableTrueCost === null)
      || (typeof row.lowestViableTrueCost === 'number' && typeof row.highestViableTrueCost === 'number'
        && row.lowestViableTrueCost > row.highestViableTrueCost)) return false;
    if (row.replacementState === 'AVAILABLE') {
      if (typeof row.replacementPlayerId !== 'string' || !playerIds.has(row.replacementPlayerId)
        || row.replacementPlayerId === row.playerId
        || typeof row.replacementContextualWorth !== 'number'
        || (typeof row.targetContextualWorth === 'number'
          && row.contextualWorthDrop !== row.targetContextualWorth - row.replacementContextualWorth)) return false;
    } else if (row.replacementPlayerId !== null || row.replacementContextualWorth !== null
      || row.contextualWorthDrop !== null) return false;
  }
  return true;
}

/** Cheap main-thread shape/decision gate; semantic scarcity proof runs in the verifier worker. */
export function validSnakeRationalRiskWorkerResponseShape(
  value: unknown,
  request: SnakeRationalRiskRequest,
): value is SnakeRationalRiskWorkerResponse {
  const response = record(value);
  if (!response || response.key !== request.key
    || (response.phase !== 'decision' && response.phase !== 'complete')
    || (response.status !== 'ready' && response.status !== 'unavailable')
    || !finiteOrNull(response.nextPick)
    || !validScenarioArray(response.scenarios, request, response.nextPick as number | null)) return false;
  if (response.status === 'unavailable') {
    return response.phase === 'complete' && Array.isArray(response.risks) && response.risks.length === 0
      && Array.isArray(response.scarcity) && response.scarcity.length === 0
      && response.scarcityWitness === null
      && (response.nextPick === null || positiveInteger(response.nextPick));
  }
  const next = expectedNextPick(request);
  if (!next || response.nextPick !== next.pick
    || !validRiskArray(response.risks, request, response.scenarios as SnakeRationalScenario[], next.pick)) return false;
  if (response.phase === 'decision') {
    return response.scarcity === null && response.scarcityWitness === null;
  }
  return validScarcityArray(response.scarcity, request)
    && response.scarcityWitness !== null;
}

/** Reject malformed, non-canonical, stale-key, identity-incoherent, or unproved worker payloads. */
export function validSnakeRationalRiskWorkerResponse(
  value: unknown,
  request: SnakeRationalRiskRequest,
  witnessSecret: string | null = null,
): value is SnakeRationalRiskWorkerResponse {
  if (!validSnakeRationalRiskWorkerResponseShape(value, request)) return false;
  if (value.status === 'unavailable' || value.phase === 'decision') return true;
  return witnessSecret !== null
    && validateSnakeScarcityWitness({
      requestKey: request.key,
      witnessSecret,
      room: request.input,
      nextPick: value.nextPick!,
      risks: value.risks,
      scenarios: value.scenarios,
      scarcity: value.scarcity!,
      witness: value.scarcityWitness,
    });
}

function sameDecisionIdentity(
  left: SnakeRationalRiskWorkerResponse,
  right: SnakeRationalRiskWorkerResponse,
): boolean {
  return left.nextPick === right.nextPick
    && JSON.stringify(left.risks) === JSON.stringify(right.risks)
    && JSON.stringify(left.scenarios) === JSON.stringify(right.scenarios);
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
    scarcityClosed: false,
  }));
  const requestEpoch = hookState.requestKey === requestKey
    ? hookState.epoch
    : hookState.epoch + 1;
  if (hookState.requestKey !== requestKey) {
    setHookState({ epoch: requestEpoch, requestKey, snapshot: null, scarcityClosed: false });
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
    let verifier: Worker | null = null;
    let acceptedDecision: SnakeRationalRiskWorkerResponse | null = null;
    let scarcityClosed = false;
    const markUnavailable = () => {
      if (active) setHookState((state) => state.epoch === requestEpoch
        && state.requestKey === requestKey
        ? state.snapshot?.status === 'ready'
          ? { ...state, scarcityClosed: true }
          : {
            ...state,
            scarcityClosed: true,
            snapshot: {
              key: requestKey,
              phase: 'complete',
              status: 'unavailable',
              risks: [],
              scarcity: [],
              scarcityWitness: null,
              scenarios: [],
              nextPick: null,
            },
          }
        : state);
    };
    const witnessSecret = createWitnessSecret();
    if (!witnessSecret) {
      queueMicrotask(markUnavailable);
      return () => {
        active = false;
      };
    }
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
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (!active) return;
      const raw = record(event.data);
      if (raw?.key !== requestKey) return;
      const valid = validSnakeRationalRiskWorkerResponseShape(event.data, current);
      if (!valid) {
        scarcityClosed = true;
        markUnavailable();
        worker?.terminate();
        return;
      }
      const incoming = event.data;
      if (incoming.phase === 'decision') {
        if (acceptedDecision || scarcityClosed) {
          scarcityClosed = true;
          markUnavailable();
          worker?.terminate();
          return;
        }
        acceptedDecision = incoming;
        setHookState((state) => state.epoch === requestEpoch && state.requestKey === requestKey
          ? { ...state, snapshot: incoming, scarcityClosed: false }
          : state);
        return;
      }
      scarcityClosed = true;
      if (incoming.status === 'unavailable') {
        if (acceptedDecision) markUnavailable();
        else {
          setHookState((state) => state.epoch === requestEpoch && state.requestKey === requestKey
            ? { ...state, scarcityClosed: true, snapshot: incoming }
            : state);
        }
        worker?.terminate();
        return;
      }
      if (acceptedDecision && !sameDecisionIdentity(acceptedDecision, incoming)) {
        markUnavailable();
        worker?.terminate();
        return;
      }
      worker?.terminate();
      try {
        verifier = new Worker(
          new URL('../../../workers/snakeScarcityVerifier.worker.ts', import.meta.url),
          { type: 'module' },
        );
      } catch {
        markUnavailable();
        return;
      }
      const completion = incoming;
      verifier.onmessage = (verificationEvent: MessageEvent<unknown>) => {
        if (!active) return;
        const verdict = record(verificationEvent.data);
        const expectedAuthTag = completion.scarcityWitness?.authTag ?? null;
        const validVerdict = verdict?.verifierEpoch === requestEpoch
          && verdict.requestKey === requestKey
          && verdict.responseKey === completion.key
          && verdict.phase === 'complete'
          && verdict.witnessAuthTag === expectedAuthTag
          && verdict.valid === true;
        if (!validVerdict) {
          markUnavailable();
          verifier?.terminate();
          return;
        }
        if (acceptedDecision) {
          const decision = acceptedDecision;
          setHookState((state) => state.epoch === requestEpoch && state.requestKey === requestKey
            ? {
              ...state,
              scarcityClosed: true,
              snapshot: {
                ...decision,
                phase: 'complete',
                scarcity: completion.scarcity,
                scarcityWitness: completion.scarcityWitness,
              },
            }
            : state);
        } else {
          setHookState((state) => state.epoch === requestEpoch && state.requestKey === requestKey
            ? { ...state, scarcityClosed: true, snapshot: completion }
            : state);
        }
        verifier?.terminate();
      };
      verifier.onerror = () => {
        markUnavailable();
        verifier?.terminate();
      };
      try {
        verifier.postMessage({
          verifierEpoch: requestEpoch,
          request: current,
          completion,
          witnessSecret,
        } satisfies SnakeScarcityVerifierWorkerRequest);
      } catch {
        markUnavailable();
        verifier.terminate();
      }
    };
    worker.onerror = () => {
      markUnavailable();
      worker?.terminate();
    };
    try {
      worker.postMessage({ ...current, witnessSecret } satisfies SnakeRationalRiskWorkerRequest);
    } catch {
      queueMicrotask(markUnavailable);
      worker.terminate();
    }
    return () => {
      active = false;
      worker?.terminate();
      verifier?.terminate();
    };
  }, [requestEpoch, requestKey]);

  if (!requestKey) {
    return { risks: null, scarcity: null, scenarios: null, nextPick: null, status: 'idle', scarcityPending: false };
  }
  if (typeof Worker === 'undefined') {
    return { risks: null, scarcity: null, scenarios: null, nextPick: null, status: 'unavailable', scarcityPending: false };
  }
  if (snapshot?.key !== requestKey) {
    return { risks: null, scarcity: null, scenarios: null, nextPick: null, status: 'pending', scarcityPending: true };
  }
  if (snapshot.status === 'unavailable') {
    return { risks: null, scarcity: null, scenarios: null, nextPick: null, status: 'unavailable', scarcityPending: false };
  }
  return {
    risks: snapshot.risks,
    scarcity: snapshot.phase === 'complete' ? snapshot.scarcity : null,
    scenarios: snapshot.scenarios,
    nextPick: snapshot.nextPick,
    status: 'ready',
    scarcityPending: snapshot.phase === 'decision' && !hookState.scarcityClosed,
  };
}
