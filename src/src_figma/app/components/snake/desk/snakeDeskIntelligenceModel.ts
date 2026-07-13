import { buildDefaultDesignSlots, type DesignSlot } from '../../../../../engines/rosterDesignFeasibility';
import {
  buildSnakeAssistantBoard,
  type SnakeAssistantBoardInput,
  type SnakeAssistantUnavailableReason,
} from '../../../../../engines/snakeAssistantBoard';
import { buildChemistryStrip, buildPlanLedger, type ChemistryStripRow, type DraftMoneyLedger } from './draftTruthModel';

export interface SnakeAssistantPrivateIdentity {
  sessionId: string;
  sessionRevision: number;
  teamId: string;
  seatId: string;
  deviceId: string;
  privateEpoch: number;
  boardRevision: number;
}

export interface SnakeAssistantBoardRequest {
  key: string;
  input: SnakeAssistantBoardInput;
}

export interface DerivedSnakeAssistantBoard {
  kind: 'snake-assistant-board';
  teamId: string;
  slots: ReadonlyArray<{ slotId: string; playerId: string; pinned: boolean }>;
  playerIds: readonly string[];
  recommendationOrder: readonly string[];
  ledger: DraftMoneyLedger;
  chemistry: readonly ChemistryStripRow[];
}

export type SnakeAssistantBoardRunResult =
  | { status: 'ready'; board: DerivedSnakeAssistantBoard }
  | { status: 'unavailable'; reason: SnakeAssistantUnavailableReason };

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]));
  }
  return value;
}

function requestHash(value: unknown): string {
  const source = JSON.stringify(stableValue(value));
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193) >>> 0;
    right = Math.imul(right ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `${left.toString(36)}${right.toString(36)}`;
}

function cloneSerializable<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch (cause) {
    throw new Error('Snake assistant input must be structured-clone serializable.', { cause });
  }
}

export function resolveAssistantDesignSlots(savedSlots?: readonly DesignSlot[] | null): DesignSlot[] {
  if (savedSlots?.length === 22
    && new Set(savedSlots.map((slot) => slot.slotId)).size === 22
    && savedSlots.every((slot) => Boolean(slot.slotId))) {
    return savedSlots.map((slot) => ({
      ...slot,
      ...(slot.preference ? { preference: {
        ...slot.preference,
        ...(slot.preference.tags ? { tags: { ...slot.preference.tags } } : {}),
      } } : {}),
    }));
  }
  return buildDefaultDesignSlots();
}

export function buildSnakeAssistantBoardRequest(input: {
  identity: SnakeAssistantPrivateIdentity;
  frozenPoolIdentity: string;
  engineInput: Omit<SnakeAssistantBoardInput, 'teamId' | 'slots'>;
  savedDesignSlots?: readonly DesignSlot[] | null;
}): SnakeAssistantBoardRequest {
  const engineInput = cloneSerializable<SnakeAssistantBoardInput>({
    ...input.engineInput,
    teamId: input.identity.teamId,
    slots: resolveAssistantDesignSlots(input.savedDesignSlots),
  });
  const identity = cloneSerializable(input.identity);
  const key = requestHash({
    identity,
    frozenPoolIdentity: input.frozenPoolIdentity,
    engineInput,
  });
  return { key, input: engineInput };
}

export function runSnakeAssistantBoardRequest(request: SnakeAssistantBoardRequest): SnakeAssistantBoardRunResult {
  const result = buildSnakeAssistantBoard(request.input);
  if (result.status === 'unavailable') return result;
  const storedById = new Map(request.input.activePool.map((player) => [player.playerId, player.stored]));
  const storedPlayers = result.playerIds.map((playerId) => storedById.get(playerId));
  if (storedPlayers.some((player) => !player)) return { status: 'unavailable', reason: 'INVALID_POOL' };
  return {
    status: 'ready',
    board: {
      kind: 'snake-assistant-board',
      teamId: result.teamId,
      slots: result.slots,
      playerIds: result.playerIds,
      recommendationOrder: result.recommendationOrder,
      ledger: buildPlanLedger(result.plan),
      chemistry: buildChemistryStrip(storedPlayers as NonNullable<(typeof storedPlayers)[number]>[]),
    },
  };
}
