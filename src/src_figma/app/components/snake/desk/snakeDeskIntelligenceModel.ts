import { isLegalRoster } from '../../../../../data/rosterConstruction';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import type { LuxuryCapRow } from '../../../../../data/tierParams';
import type { TeamCapIdentity } from '../../../../../engines/leagueConstruction';
import type { BandPriorities } from '../../../../../engines/leagueConstruction';
import { classifyPlayerArchetype } from '../../../../../engines/playerArchetypeClassifier';
import {
  buildDefaultDesignSlots,
  isDesignPlayerEligibleForSlot,
  type DesignSlot,
} from '../../../../../engines/rosterDesignFeasibility';
import {
  buildSnakeAssistantBoard,
  type SnakeAssistantBoardInput,
  type SnakeAssistantUnavailableReason,
} from '../../../../../engines/snakeAssistantBoard';
import {
  evaluateSnakeLegalFinish,
  evaluateSnakePlan,
  snakeMoneyNonnegative,
} from '../../../../../engines/snakeEconomics';
import type { SnakeSeatingPlayer } from '../../../../../engines/snakeSeatingProof';
import { deriveVersionGroupId, unavailableVersionPlayerIds } from '../../../../../engines/snakeVersioning';
import {
  SNAKE_BOARD_SLOT_IDS,
  type SnakeBoardSlotId,
  type SnakeSeatBoardRecord,
  type SnakeVersionState,
  type Player,
} from '../../../../../utils/leagueBuilderStorage';
import { demandPlayerFromLeaguePlayer } from '../../../engines/leaguePlayerAdapter';
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

export type SelectedPlayerConsequencePlayer = SnakeAssistantBoardInput['activePool'][number] & {
  advisorWorth: number;
  fitWord: string;
  eligiblePositions: readonly TaxonomyPosition[];
};

export interface SelectedPlayerLegalFinish {
  feasible: boolean;
  moneyLeft: number | null;
  affordability?: 'AFFORDABLE' | 'BLOCKED' | 'OPEN';
}

export interface SelectedPlayerConsequenceReady {
  status: 'ready';
  identity: SnakeAssistantPrivateIdentity;
  selectedPlayerId: string;
  displacedPlayerId: string;
  displacedPlayerName: string;
  displacedSlotId: SnakeBoardSlotId;
  reassignedSlotIds: readonly SnakeBoardSlotId[];
  board: SnakeSeatBoardRecord;
  before: {
    ledger: DraftMoneyLedger;
    chemistry: readonly ChemistryStripRow[];
    legalFinish: SelectedPlayerLegalFinish;
    fitWord: string;
  };
  after: {
    ledger: DraftMoneyLedger;
    chemistry: readonly ChemistryStripRow[];
    legalFinish: SelectedPlayerLegalFinish;
    fitWord: string;
  };
}

export type SelectedPlayerConsequence =
  | SelectedPlayerConsequenceReady
  | { status: 'already-on-board'; selectedPlayerId: string }
  | { status: 'unavailable'; selectedPlayerId: string | null };

export interface SelectedPlayerConsequenceInput {
  identity: SnakeAssistantPrivateIdentity;
  selectedPlayerId: string | null;
  teamId: string;
  board: SnakeSeatBoardRecord;
  designSlots?: readonly DesignSlot[] | null;
  players: readonly SelectedPlayerConsequencePlayer[];
  completedPicks: SnakeAssistantBoardInput['completedPicks'];
  versionState?: SnakeVersionState;
  versionSelections?: Readonly<Record<string, string>>;
  budget: number;
  baseCaps: readonly LuxuryCapRow[];
  realTeamCount: number;
  capIdentity?: TeamCapIdentity;
}

export function buildSnakeAssistantLivePlayer(input: {
  player: Player;
  frozenIv: number;
  seating: SnakeSeatingPlayer;
  archetypeWeights?: Partial<Record<keyof BandPriorities, number>>;
}): SnakeAssistantBoardInput['activePool'][number] {
  const demand = demandPlayerFromLeaguePlayer(input.player);
  const profile = demand.profile;
  const simPlayer = Object.fromEntries(Object.entries(demand).filter(([key]) => (
    !['id', 'iv', 'salary', 'name', 'profile'].includes(key)
  ))) as SnakeAssistantBoardInput['activePool'][number]['simPlayer'];
  const seating = Object.fromEntries(Object.entries(input.seating).filter(([key]) => (
    !['playerId', 'sourceId', 'versionGroupId', 'price'].includes(key)
  ))) as SnakeAssistantBoardInput['activePool'][number]['seating'];
  return {
    playerId: input.player.id,
    sourceId: input.seating.sourceId,
    versionGroupId: input.seating.versionGroupId,
    frozenIv: input.frozenIv,
    stored: input.player,
    simPlayer,
    seating,
    classification: classifyPlayerArchetype(profile),
    archetypeWeights: input.archetypeWeights,
  };
}

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

export function canonicalSnakeAssistantSlotId(slotId: string): string {
  const normalized = slotId.replace(/_/g, '').toUpperCase();
  return SNAKE_BOARD_SLOT_IDS.find((candidate) => (
    candidate.replace(/_/g, '').toUpperCase() === normalized
  )) ?? slotId;
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
  const slots = result.slots.map((slot) => ({
    ...slot,
    slotId: canonicalSnakeAssistantSlotId(slot.slotId),
  }));
  const storedById = new Map(request.input.activePool.map((player) => [player.playerId, player.stored]));
  const storedPlayers = result.playerIds.map((playerId) => storedById.get(playerId));
  if (storedPlayers.some((player) => !player)) return { status: 'unavailable', reason: 'INVALID_POOL' };
  return {
    status: 'ready',
    board: {
      kind: 'snake-assistant-board',
      teamId: result.teamId,
      slots,
      playerIds: result.playerIds,
      recommendationOrder: result.recommendationOrder,
      ledger: buildPlanLedger(result.plan),
      chemistry: buildChemistryStrip(storedPlayers as NonNullable<(typeof storedPlayers)[number]>[]),
    },
  };
}

function designSlotsByBoardSlot(savedSlots?: readonly DesignSlot[] | null): Map<SnakeBoardSlotId, DesignSlot> {
  const slots = resolveAssistantDesignSlots(savedSlots);
  const byId = new Map(slots.map((slot) => [slot.slotId.toUpperCase(), slot]));
  return new Map(SNAKE_BOARD_SLOT_IDS.map((boardSlotId, index) => {
    const normalized = boardSlotId === 'BACKUP_C' ? 'BACKUPC' : boardSlotId;
    return [boardSlotId, byId.get(normalized) ?? slots[index]];
  }));
}

function consequenceIdentity(player: SelectedPlayerConsequencePlayer) {
  return {
    playerId: player.playerId,
    sourceId: player.sourceId,
    versionGroupId: player.versionGroupId,
  };
}

function seatingPlayer(player: SelectedPlayerConsequencePlayer, price: number): SnakeSeatingPlayer {
  return {
    ...player.seating,
    playerId: player.playerId,
    sourceId: player.sourceId ?? undefined,
    versionGroupId: player.versionGroupId ?? undefined,
    price,
  };
}

function legalFinish(value: ReturnType<typeof evaluateSnakeLegalFinish>): SelectedPlayerLegalFinish {
  return {
    feasible: value.feasible && snakeMoneyNonnegative(value.legalFinishCushion),
    moneyLeft: Number.isFinite(value.legalFinishCushion) ? value.legalFinishCushion : null,
    affordability: value.affordability,
  };
}

function planAwareFitWord(
  rawFitWord: string,
  before: ReturnType<typeof evaluateSnakePlan>,
  after: ReturnType<typeof evaluateSnakePlan>,
  playerValue: number,
): string {
  if (!snakeMoneyNonnegative(after.planCushion) && snakeMoneyNonnegative(before.planCushion)) return 'WEAK FIT';
  const taxDelta = after.planTax - before.planTax;
  const materialTax = Math.max(1_000, playerValue * 0.1);
  if (taxDelta > materialTax) return 'WEAK FIT';
  if (rawFitWord === 'STRONG FIT' && taxDelta > Math.max(1_000, playerValue * 0.03)) return 'SOLID FIT';
  if (rawFitWord === 'SOLID FIT' && taxDelta < -materialTax) return 'STRONG FIT';
  return rawFitWord;
}

function positionRank(
  board: SnakeSeatBoardRecord,
  player: SelectedPlayerConsequencePlayer,
): number {
  const ranks = player.eligiblePositions.map((position) => board.rankings.byPosition?.[position]?.indexOf(player.playerId) ?? -1);
  const present = ranks.filter((rank) => rank >= 0);
  return present.length ? Math.max(...present) : Number.MAX_SAFE_INTEGER;
}

function overallRank(board: SnakeSeatBoardRecord, playerId: string): number {
  const rank = board.rankings.global?.indexOf(playerId) ?? -1;
  return rank >= 0 ? rank : Number.MAX_SAFE_INTEGER;
}

const SNAKE_SLOT_ORDER = new Map(SNAKE_BOARD_SLOT_IDS.map((slotId, index) => [slotId, index]));

function isEligibleForExactDesignSlot(
  player: SelectedPlayerConsequencePlayer,
  designSlot: DesignSlot,
): boolean {
  return isDesignPlayerEligibleForSlot(designSlot, {
    profile: {
      isPitcher: player.seating.shape.isPitcher,
      primaryPosition: player.seating.shape.position,
    },
    slotPlayer: player.seating.shape,
  });
}

/**
 * Finds the shortest alternating reassignment path from the selected player to the hole left by
 * one displaced incumbent. Every edge delegates eligibility to canonical roster-design law.
 */
function minimalReassignment(input: {
  selectedPlayerId: string;
  displacedSlotId: SnakeBoardSlotId;
  board: SnakeSeatBoardRecord;
  playerById: ReadonlyMap<string, SelectedPlayerConsequencePlayer>;
  designByBoardSlot: ReadonlyMap<SnakeBoardSlotId, DesignSlot>;
}): Record<SnakeBoardSlotId, string> | null {
  const occupantBySlot = new Map<SnakeBoardSlotId, string>(
    SNAKE_BOARD_SLOT_IDS
      .filter((slotId) => slotId !== input.displacedSlotId)
      .map((slotId) => [slotId, input.board.slots[slotId]]),
  );
  const queue = [input.selectedPlayerId];
  const seenPlayers = new Set(queue);
  const seenSlots = new Set<SnakeBoardSlotId>();
  const parentByPlayer = new Map<string, { slotId: SnakeBoardSlotId; priorPlayerId: string }>();
  while (queue.length) {
    const currentPlayerId = queue.shift()!;
    const player = input.playerById.get(currentPlayerId);
    if (!player) continue;
    for (const slotId of SNAKE_BOARD_SLOT_IDS) {
      if (seenSlots.has(slotId)) continue;
      const designSlot = input.designByBoardSlot.get(slotId);
      if (!designSlot || !isEligibleForExactDesignSlot(player, designSlot)) continue;
      seenSlots.add(slotId);
      const occupant = occupantBySlot.get(slotId);
      if (!occupant) {
        const next = { ...input.board.slots };
        let assignmentSlot = slotId;
        let assignmentPlayerId = currentPlayerId;
        while (true) {
          next[assignmentSlot] = assignmentPlayerId;
          const parent = parentByPlayer.get(assignmentPlayerId);
          if (!parent) break;
          assignmentSlot = parent.slotId;
          assignmentPlayerId = parent.priorPlayerId;
        }
        return next;
      }
      if (seenPlayers.has(occupant)) continue;
      seenPlayers.add(occupant);
      parentByPlayer.set(occupant, { slotId, priorPlayerId: currentPlayerId });
      queue.push(occupant);
    }
  }
  return null;
}

/**
 * Deterministic 22x22 Hungarian assignment. Canonical slot order owns rows and stable player-id
 * order owns columns. The primary objective preserves as many valid current slot assignments as
 * possible; the proven shortest alternating path is a secondary tie preference only.
 */
function minimumChangedCanonicalAssignment(input: {
  playerIds: readonly string[];
  board: SnakeSeatBoardRecord;
  playerById: ReadonlyMap<string, SelectedPlayerConsequencePlayer>;
  designByBoardSlot: ReadonlyMap<SnakeBoardSlotId, DesignSlot>;
  preferredSlots: Readonly<Record<SnakeBoardSlotId, string>> | null;
}): Record<SnakeBoardSlotId, string> | null {
  if (input.playerIds.length !== 22 || new Set(input.playerIds).size !== 22) return null;
  const playerIds = [...input.playerIds].sort((left, right) => left.localeCompare(right));
  if (playerIds.some((playerId) => !input.playerById.has(playerId))) return null;

  const size = SNAKE_BOARD_SLOT_IDS.length;
  const primaryWeight = size + 1;
  const forbidden = primaryWeight * (size + 1);
  const costs = SNAKE_BOARD_SLOT_IDS.map((slotId) => {
    const designSlot = input.designByBoardSlot.get(slotId);
    return playerIds.map((playerId) => {
      const player = input.playerById.get(playerId)!;
      if (!designSlot || !isEligibleForExactDesignSlot(player, designSlot)) return forbidden;
      const moved = input.board.slots[slotId] === playerId ? 0 : 1;
      const differsFromPreferred = input.preferredSlots?.[slotId] === playerId ? 0 : 1;
      return moved * primaryWeight + differsFromPreferred;
    });
  });

  const rowPotential = Array<number>(size + 1).fill(0);
  const columnPotential = Array<number>(size + 1).fill(0);
  const rowForColumn = Array<number>(size + 1).fill(0);
  const previousColumn = Array<number>(size + 1).fill(0);
  for (let row = 1; row <= size; row += 1) {
    rowForColumn[0] = row;
    const minValue = Array<number>(size + 1).fill(Number.POSITIVE_INFINITY);
    const used = Array<boolean>(size + 1).fill(false);
    let column = 0;
    do {
      used[column] = true;
      const activeRow = rowForColumn[column];
      let delta = Number.POSITIVE_INFINITY;
      let nextColumn = 0;
      for (let candidateColumn = 1; candidateColumn <= size; candidateColumn += 1) {
        if (used[candidateColumn]) continue;
        const reduced = costs[activeRow - 1][candidateColumn - 1]
          - rowPotential[activeRow]
          - columnPotential[candidateColumn];
        if (reduced < minValue[candidateColumn]) {
          minValue[candidateColumn] = reduced;
          previousColumn[candidateColumn] = column;
        }
        if (minValue[candidateColumn] < delta) {
          delta = minValue[candidateColumn];
          nextColumn = candidateColumn;
        }
      }
      if (!Number.isFinite(delta)) return null;
      for (let candidateColumn = 0; candidateColumn <= size; candidateColumn += 1) {
        if (used[candidateColumn]) {
          rowPotential[rowForColumn[candidateColumn]] += delta;
          columnPotential[candidateColumn] -= delta;
        } else {
          minValue[candidateColumn] -= delta;
        }
      }
      column = nextColumn;
    } while (rowForColumn[column] !== 0);

    do {
      const priorColumn = previousColumn[column];
      rowForColumn[column] = rowForColumn[priorColumn];
      column = priorColumn;
    } while (column !== 0);
  }

  const columnForRow = Array<number>(size + 1).fill(0);
  for (let column = 1; column <= size; column += 1) columnForRow[rowForColumn[column]] = column;
  const slots = {} as Record<SnakeBoardSlotId, string>;
  for (let row = 1; row <= size; row += 1) {
    const slotId = SNAKE_BOARD_SLOT_IDS[row - 1];
    const column = columnForRow[row];
    if (!column || costs[row - 1][column - 1] >= forbidden) return null;
    slots[slotId] = playerIds[column - 1];
  }
  const assignedPlayers = SNAKE_BOARD_SLOT_IDS.map((slotId) => input.playerById.get(slots[slotId]));
  if (assignedPlayers.some((player) => !player)
    || new Set(Object.values(slots)).size !== 22
    || new Set((assignedPlayers as SelectedPlayerConsequencePlayer[]).map((player) => (
      deriveVersionGroupId(consequenceIdentity(player))
    ))).size !== 22
    || !isLegalRoster((assignedPlayers as SelectedPlayerConsequencePlayer[]).map((player) => player.seating.shape))) {
    return null;
  }
  return slots;
}

export function buildSelectedPlayerConsequence(input: SelectedPlayerConsequenceInput): SelectedPlayerConsequence {
  const selectedId = input.selectedPlayerId;
  if (!selectedId || input.teamId !== input.identity.teamId || input.realTeamCount < 1
    || input.identity.boardRevision !== input.board.revision || Object.values(input.board.slots).length !== 22) {
    return { status: 'unavailable', selectedPlayerId: selectedId };
  }
  const originalPlayerIds = SNAKE_BOARD_SLOT_IDS.map((slotId) => input.board.slots[slotId]);
  if (new Set(originalPlayerIds).size !== 22) return { status: 'unavailable', selectedPlayerId: selectedId };

  const playerById = new Map(input.players.map((player) => [player.playerId, player]));
  const selected = playerById.get(selectedId);
  if (!selected || !Number.isFinite(selected.frozenIv)) return { status: 'unavailable', selectedPlayerId: selectedId };
  const selectedVersion = input.versionSelections?.[deriveVersionGroupId(consequenceIdentity(selected))];
  const completedIds = new Set(input.completedPicks.map((pick) => pick.playerId));
  const retired = unavailableVersionPlayerIds(input.versionState);
  if (completedIds.has(selectedId) || retired.has(selectedId)
    || (selectedVersion && selectedVersion !== selectedId)) {
    return { status: 'unavailable', selectedPlayerId: selectedId };
  }
  if (input.completedPicks.some((pick) => !playerById.has(pick.playerId))) {
    return { status: 'unavailable', selectedPlayerId: selectedId };
  }
  const draftedGroups = new Set(input.completedPicks.map((pick) => (
    deriveVersionGroupId(consequenceIdentity(playerById.get(pick.playerId)!))
  )));
  if (draftedGroups.has(deriveVersionGroupId(consequenceIdentity(selected)))) {
    return { status: 'unavailable', selectedPlayerId: selectedId };
  }
  if (originalPlayerIds.some((playerId) => {
    const player = playerById.get(playerId);
    if (!player || completedIds.has(playerId) || retired.has(playerId)
      || draftedGroups.has(deriveVersionGroupId(consequenceIdentity(player)))) return true;
    const chosen = input.versionSelections?.[deriveVersionGroupId(consequenceIdentity(player))];
    return Boolean(chosen && chosen !== playerId);
  })) {
    return { status: 'unavailable', selectedPlayerId: selectedId };
  }
  const originalPlayers = originalPlayerIds.map((playerId) => playerById.get(playerId)!);
  if (new Set(originalPlayers.map((player) => deriveVersionGroupId(consequenceIdentity(player)))).size !== 22
    || !isLegalRoster(originalPlayers.map((player) => player.seating.shape))) {
    return { status: 'unavailable', selectedPlayerId: selectedId };
  }
  if (originalPlayerIds.includes(selectedId)) return { status: 'already-on-board', selectedPlayerId: selectedId };

  const designByBoardSlot = designSlotsByBoardSlot(input.designSlots);
  const displacementOptions = SNAKE_BOARD_SLOT_IDS.flatMap((slotId) => {
    const displacedPlayerId = input.board.slots[slotId];
    const preferredSlots = minimalReassignment({
      selectedPlayerId: selectedId,
      displacedSlotId: slotId,
      board: input.board,
      playerById,
      designByBoardSlot,
    });
    const finalPlayerIds = originalPlayerIds.filter((playerId) => playerId !== displacedPlayerId).concat(selectedId);
    const slots = minimumChangedCanonicalAssignment({
      playerIds: finalPlayerIds,
      board: input.board,
      playerById,
      designByBoardSlot,
      preferredSlots,
    });
    if (!slots) return [];
    const playerIds = SNAKE_BOARD_SLOT_IDS.map((boardSlotId) => slots[boardSlotId]);
    if (new Set(playerIds).size !== 22 || !playerIds.includes(selectedId)) return [];
    const players = playerIds.map((playerId) => playerById.get(playerId));
    if (players.some((player) => !player)) return [];
    if (new Set((players as SelectedPlayerConsequencePlayer[]).map((player) => deriveVersionGroupId(consequenceIdentity(player)))).size !== 22) return [];
    if (!isLegalRoster((players as SelectedPlayerConsequencePlayer[]).map((player) => player.seating.shape))) return [];
    const displaced = playerById.get(displacedPlayerId)!;
    return [{
      slotId,
      displacedPlayerId,
      slots,
      reassignedSlotIds: SNAKE_BOARD_SLOT_IDS.filter((boardSlotId) => slots[boardSlotId] !== input.board.slots[boardSlotId]),
      positionRank: positionRank(input.board, displaced),
      overallRank: overallRank(input.board, displacedPlayerId),
      worth: displaced.advisorWorth,
    }];
  }).sort((left, right) => (
    right.positionRank - left.positionRank
    || right.overallRank - left.overallRank
    || left.worth - right.worth
    || (SNAKE_SLOT_ORDER.get(left.slotId) ?? Number.MAX_SAFE_INTEGER)
      - (SNAKE_SLOT_ORDER.get(right.slotId) ?? Number.MAX_SAFE_INTEGER)
    || left.displacedPlayerId.localeCompare(right.displacedPlayerId)
  ));
  const replacement = displacementOptions[0];
  if (!replacement) return { status: 'unavailable', selectedPlayerId: selectedId };

  const ownPicks = input.completedPicks.filter((pick) => pick.teamId === input.teamId);
  if (ownPicks.some((pick) => !Number.isFinite(pick.settledSalary))) return { status: 'unavailable', selectedPlayerId: selectedId };
  const ownRoster = ownPicks.map((pick) => playerById.get(pick.playerId));
  if (ownRoster.some((player) => !player)) return { status: 'unavailable', selectedPlayerId: selectedId };
  const committedSpent = ownPicks.reduce((sum, pick) => sum + pick.settledSalary!, 0);
  const available = input.players.filter((player) => {
    const chosen = input.versionSelections?.[deriveVersionGroupId(consequenceIdentity(player))];
    return !completedIds.has(player.playerId) && !retired.has(player.playerId)
      && !draftedGroups.has(deriveVersionGroupId(consequenceIdentity(player)))
      && (!chosen || chosen === player.playerId);
  });

  try {
    const beforePlan = evaluateSnakePlan({
      boardPlayerIds: originalPlayerIds,
      players: input.players.map((player) => seatingPlayer(player, player.frozenIv)),
      budget: input.budget,
      baseCaps: input.baseCaps,
      realTeamCount: input.realTeamCount,
      capIdentity: input.capIdentity,
    });
    const afterPlayerIds = SNAKE_BOARD_SLOT_IDS.map((slotId) => replacement.slots[slotId]);
    const afterPlan = evaluateSnakePlan({
      boardPlayerIds: afterPlayerIds,
      players: input.players.map((player) => seatingPlayer(player, player.frozenIv)),
      budget: input.budget,
      baseCaps: input.baseCaps,
      realTeamCount: input.realTeamCount,
      capIdentity: input.capIdentity,
    });
    const beforeFinish = evaluateSnakeLegalFinish({
      currentRoster: (ownRoster as SelectedPlayerConsequencePlayer[]).map((player, index) => seatingPlayer(player, ownPicks[index].settledSalary!)),
      committedSpent,
      availablePool: available.map((player) => seatingPlayer(player, player.frozenIv)),
      budget: input.budget,
      baseCaps: input.baseCaps,
      realTeamCount: input.realTeamCount,
      capIdentity: input.capIdentity,
    });
    const afterFinish = evaluateSnakeLegalFinish({
      currentRoster: [
        ...(ownRoster as SelectedPlayerConsequencePlayer[]).map((player, index) => seatingPlayer(player, ownPicks[index].settledSalary!)),
        seatingPlayer(selected, selected.frozenIv),
      ],
      committedSpent: committedSpent + selected.frozenIv,
      availablePool: available.filter((player) => player.playerId !== selectedId).map((player) => seatingPlayer(player, player.frozenIv)),
      budget: input.budget,
      baseCaps: input.baseCaps,
      realTeamCount: input.realTeamCount,
      capIdentity: input.capIdentity,
    });
    const displaced = playerById.get(replacement.displacedPlayerId)!;
    return {
      status: 'ready',
      identity: { ...input.identity },
      selectedPlayerId: selectedId,
      displacedPlayerId: replacement.displacedPlayerId,
      displacedPlayerName: `${displaced.stored.firstName} ${displaced.stored.lastName}`.trim(),
      displacedSlotId: replacement.slotId,
      reassignedSlotIds: replacement.reassignedSlotIds,
      board: {
        ...structuredClone(input.board),
        slots: replacement.slots,
        revision: input.board.revision + 1,
      },
      before: {
        ledger: buildPlanLedger(beforePlan),
        chemistry: buildChemistryStrip(originalPlayerIds.map((playerId) => playerById.get(playerId)!.stored)),
        legalFinish: legalFinish(beforeFinish),
        fitWord: planAwareFitWord(displaced.fitWord, afterPlan, beforePlan, displaced.frozenIv),
      },
      after: {
        ledger: buildPlanLedger(afterPlan),
        chemistry: buildChemistryStrip(afterPlayerIds.map((playerId) => playerById.get(playerId)!.stored)),
        legalFinish: legalFinish(afterFinish),
        fitWord: planAwareFitWord(selected.fitWord, beforePlan, afterPlan, selected.frozenIv),
      },
    };
  } catch {
    return { status: 'unavailable', selectedPlayerId: selectedId };
  }
}
