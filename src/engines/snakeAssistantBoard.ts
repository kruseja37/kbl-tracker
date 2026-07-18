import { canCover, canRelieve, canStart, isCloser, isLegalRoster } from '../data/rosterConstruction';
import type { TaxonomyPosition } from '../data/playerArchetypeTaxonomy';
import type { LuxuryCapRow, TierKey } from '../data/tierParams';
import type { Player, SnakeVersionState } from '../utils/leagueBuilderStorage';
import type { SimArchetype, SimPlayer } from './archetypeBalanceSimulator';
import { computeOwnValue } from './auctionMarketModel';
import { constructionArchetypeFitMultiplier } from './archetypeIdentity';
import { buildBest22Target } from './best22Target';
import { shiftLuxuryCaps, type BandPriorities, type TeamCapIdentity } from './leagueConstruction';
import type { ShapeClassification } from './playerArchetypeClassifier';
import { assembleBoard, type BoardRankOverrides } from './rosterIntelligencePayload';
import { rosterNeedBreakdown } from './rosterNeed';
import {
  isDesignPlayerEligibleForSlot,
  type DesignSlot,
} from './rosterDesignFeasibility';
import { evaluateSnakeLegalFinish, evaluateSnakePlan, type SnakePlanBill } from './snakeEconomics';
import { snakeMoneyNonnegative } from './snakeMoney';
import { snakeLuxuryCaps } from './snakeLuxuryTax';
import type { SnakeSeatingPlayer } from './snakeSeatingProof';
import { deriveVersionGroupId, unavailableVersionPlayerIds } from './snakeVersioning';

export interface SnakeAssistantBoardPlayer {
  playerId: string;
  sourceId?: string | null;
  versionGroupId?: string | null;
  frozenIv: number;
  stored: Player;
  simPlayer: Omit<SimPlayer, 'id' | 'iv' | 'salary'>;
  seating: Omit<SnakeSeatingPlayer, 'playerId' | 'sourceId' | 'versionGroupId' | 'price'>;
  classification: ShapeClassification;
  archetypeWeights?: Partial<Record<keyof BandPriorities, number>>;
}

/** Economic value used by the Assistant GM's 90% floor; never contextualized. */
export function assistantValueFloorIv(
  player: Pick<SnakeAssistantBoardPlayer, 'frozenIv'>,
): number {
  return player.frozenIv;
}

export interface SnakeAssistantCompletedPick {
  teamId: string;
  playerId: string;
  settledSalary?: number;
}

export interface SnakeAssistantBoardInput {
  teamId: string;
  activePool: readonly SnakeAssistantBoardPlayer[];
  completedPicks: readonly SnakeAssistantCompletedPick[];
  versionState?: SnakeVersionState;
  versionSelections?: Readonly<Record<string, string>>;
  slots: readonly DesignSlot[];
  selectedPinPlayerId?: string | null;
  archetype: SimArchetype;
  ownBandPriorities: BandPriorities;
  gmRankOverrides?: BoardRankOverrides;
  /** Private seat exclusions. Own drafted players remain roster truth and cannot be excluded. */
  zeroInterestPlayerIds?: readonly string[];
  /** Current shared-room certificate reservation for this club; independently revalidated here. */
  certifiedCompletionPlayerIds?: readonly string[];
  tier: TierKey;
  budget: number;
  baseCaps: readonly LuxuryCapRow[];
  realTeamCount: number;
  capIdentity?: TeamCapIdentity;
}

export type SnakeAssistantUnavailableReason =
  | 'MISSING_INPUT'
  | 'INVALID_POOL'
  | 'INVALID_NUMERIC_INPUT'
  | 'VERSION_CONFLICT'
  | 'MISSING_SETTLED_SALARY'
  | 'PIN_UNAVAILABLE'
  | 'PIN_UNMATCHED'
  | 'DROPPED_PIN'
  | 'INCOMPLETE_BOARD'
  | 'ILLEGAL_BOARD'
  | 'INSOLVENT_BOARD';

export interface SnakeAssistantBoardReady {
  status: 'ready';
  teamId: string;
  slots: ReadonlyArray<{ slotId: string; playerId: string; pinned: boolean }>;
  playerIds: readonly string[];
  recommendationOrder: readonly string[];
  plan: SnakePlanBill;
}

export interface SnakeAssistantBoardUnavailable {
  status: 'unavailable';
  reason: SnakeAssistantUnavailableReason;
}

export type SnakeAssistantBoardCoreResult = SnakeAssistantBoardReady | SnakeAssistantBoardUnavailable;

function unavailable(reason: SnakeAssistantUnavailableReason): SnakeAssistantBoardUnavailable {
  return { status: 'unavailable', reason };
}

function identityOf(player: SnakeAssistantBoardPlayer) {
  return {
    playerId: player.playerId,
    sourceId: player.sourceId,
    versionGroupId: player.versionGroupId,
  };
}

const POSITION_GROUPS: readonly TaxonomyPosition[] =
  ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP'];

function allNumbersFinite(value: unknown, seen = new WeakSet<object>()): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object') return true;
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.values(value).every((entry) => allNumbersFinite(entry, seen));
}

function validLuxuryCaps(caps: readonly LuxuryCapRow[]): boolean {
  return caps.length > 0 && caps.every((row) =>
    Number.isInteger(row.topN) && row.topN > 0
    && Number.isFinite(row.cap) && row.cap >= 0
    && Number.isFinite(row.penaltyCurve) && row.penaltyCurve > 0
    && Number.isFinite(row.penaltyPer100) && row.penaltyPer100 >= 0
    && Number.isFinite(row.minAdder) && row.minAdder >= 0);
}

function storedPlanNumbersFinite(player: Player): boolean {
  return [
    player.power,
    player.contact,
    player.speed,
    player.fielding,
    player.arm,
    player.velocity,
    player.junk,
    player.accuracy,
  ].every(Number.isFinite);
}

function eligibleForDesignSlot(slot: DesignSlot, player: SnakeAssistantBoardPlayer): boolean {
  return isDesignPlayerEligibleForSlot(slot, {
    profile: {
      isPitcher: player.seating.shape.isPitcher,
      primaryPosition: player.seating.shape.position,
    },
    slotPlayer: player.seating.shape,
  });
}

function positionScopesForSlot(slot: DesignSlot): readonly TaxonomyPosition[] {
  switch (slot.kind) {
    case 'pos':
      return slot.position ? [slot.position] : [];
    case 'backupC':
    case 'flex':
      return POSITION_GROUPS.slice(0, 8);
    case 'sp':
      return ['SP', 'SP/RP'];
    case 'rp':
      return ['RP', 'CP', 'SP/RP'];
    case 'cp':
      return ['CP'];
    case 'swing':
      // SWING's positional job is staff flexibility. Hitter bench preferences arrive through the
      // global board; importing C here ties a secondary catcher's backup-C bonus at an unrelated
      // slot and defeats the GM's named job.
      return ['SP', 'SP/RP', 'RP', 'CP'];
  }
}

function optimizerSlotPosition(slot: DesignSlot): string {
  return slot.kind === 'pos' && slot.position ? slot.position : `assistant:${slot.slotId}`;
}

function buildOptimizerRankings(
  slots: readonly DesignSlot[],
  universe: readonly SnakeAssistantBoardPlayer[],
  assembledPlayerIds: readonly string[],
  gmRanks: BoardRankOverrides | undefined,
): { slots: DesignSlot[]; ranks: ReadonlyMap<string, readonly string[]> } {
  const playerById = new Map(universe.map((player) => [player.playerId, player]));
  const optimizerSlots = slots.map((slot) => slot.kind === 'pos'
    ? { ...slot }
    : { ...slot, position: optimizerSlotPosition(slot) as TaxonomyPosition });
  const ranks = new Map<string, readonly string[]>();

  slots.forEach((slot, slotIndex) => {
    const optimizerPosition = optimizerSlotPosition(slot);
    if (ranks.has(optimizerPosition)) return;
    const positionRanked = positionScopesForSlot(slot).flatMap((position) => gmRanks?.byPosition?.[position] ?? []);
    const ordered = [
      // Generic FLEX membership follows the global board first. Otherwise a player ranked for a
      // specific job (notably a secondary catcher on the C board) receives the same rank bonus in
      // FLEX and can tie away the exact slot the GM named.
      ...(slot.kind === 'flex' ? gmRanks?.global ?? [] : positionRanked),
      ...(slot.kind === 'flex' ? positionRanked : gmRanks?.global ?? []),
      ...assembledPlayerIds,
    ];
    const seen = new Set<string>();
    ranks.set(optimizerPosition, ordered.filter((playerId) => {
      if (seen.has(playerId)) return false;
      seen.add(playerId);
      const player = playerById.get(playerId);
      return Boolean(player && eligibleForDesignSlot(slots[slotIndex], player));
    }));
  });

  return { slots: optimizerSlots, ranks };
}

function deterministicPinMatching(
  slots: readonly DesignSlot[],
  requiredPlayers: readonly SnakeAssistantBoardPlayer[],
): Map<string, string> | null {
  const eligibleSlotIndices = new Map(requiredPlayers.map((player) => [
    player.playerId,
    slots.flatMap((slot, index) => isDesignPlayerEligibleForSlot(slot, {
      profile: {
        isPitcher: player.seating.shape.isPitcher,
        primaryPosition: player.seating.shape.position,
      },
      slotPlayer: player.seating.shape,
    }) ? [index] : []),
  ]));
  const orderedPlayers = [...requiredPlayers].sort((left, right) => left.playerId.localeCompare(right.playerId));
  const playerById = new Map(requiredPlayers.map((player) => [player.playerId, player]));
  const occupantBySlot = new Map<number, string>();

  // Committed roster truth owns the named closer job. If Optimize Around adds a
  // higher-IV closer, that higher-value closer becomes CP and the already-owned
  // lower closer remains pinned as legal bullpen depth.
  const requiredClosers = requiredPlayers
    .filter((player) => player.seating.shape.role === 'CP')
    .sort((left, right) => right.frozenIv - left.frozenIv || left.playerId.localeCompare(right.playerId));
  const cpSlotIndex = slots.findIndex((slot) => slot.kind === 'cp');
  const primaryCloser = requiredClosers[0];
  if (primaryCloser) {
    if (cpSlotIndex < 0 || !(eligibleSlotIndices.get(primaryCloser.playerId) ?? []).includes(cpSlotIndex)) return null;
    occupantBySlot.set(cpSlotIndex, primaryCloser.playerId);
    for (const closer of requiredClosers.slice(1)) {
      eligibleSlotIndices.set(closer.playerId, (eligibleSlotIndices.get(closer.playerId) ?? [])
        .filter((slotIndex) => slotIndex !== cpSlotIndex));
    }
  }

  const augment = (playerId: string, seenSlots: Set<number>): boolean => {
    for (const slotIndex of eligibleSlotIndices.get(playerId) ?? []) {
      if (seenSlots.has(slotIndex)) continue;
      seenSlots.add(slotIndex);
      const occupant = occupantBySlot.get(slotIndex);
      if (!occupant || augment(occupant, seenSlots)) {
        occupantBySlot.set(slotIndex, playerId);
        return true;
      }
    }
    return false;
  };

  for (const player of orderedPlayers.filter((entry) => entry.playerId !== primaryCloser?.playerId)) {
    if (!playerById.has(player.playerId) || !augment(player.playerId, new Set())) return null;
  }
  return new Map([...occupantBySlot.entries()]
    .sort(([left], [right]) => left - right)
    .map(([slotIndex, playerId]) => [slots[slotIndex].slotId, playerId]));
}

/**
 * A legal-finish certificate proves roster membership, not a rigid design-slot assignment.
 * Materialize that exact legal 22 into the familiar desk rows without turning surplus starters,
 * closers, or a Two Way catcher into a false Assistant-unavailable result.
 */
function materializeLegalRoster(
  slots: readonly DesignSlot[],
  players: readonly SnakeAssistantBoardPlayer[],
  pinnedPlayerIds: ReadonlySet<string>,
): SnakeAssistantBoardReady['slots'] | null {
  if (slots.length !== 22 || players.length !== 22
    || new Set(players.map((player) => player.playerId)).size !== 22
    || !isLegalRoster(players.map((player) => player.seating.shape))) return null;

  const remaining = new Map(players.map((player) => [player.playerId, player]));
  const assignments = new Map<string, SnakeAssistantBoardPlayer>();
  const ordered = [...players].sort((left, right) => (
    right.frozenIv - left.frozenIv || left.playerId.localeCompare(right.playerId)
  ));
  const take = (
    slot: DesignSlot | undefined,
    predicate: (player: SnakeAssistantBoardPlayer) => boolean,
    order: readonly SnakeAssistantBoardPlayer[] = ordered,
  ): boolean => {
    if (!slot) return false;
    const player = order.find((candidate) => remaining.has(candidate.playerId) && predicate(candidate));
    if (!player) return false;
    assignments.set(slot.slotId, player);
    remaining.delete(player.playerId);
    return true;
  };

  for (const slot of slots.filter((candidate) => candidate.kind === 'pos')) {
    if (!take(slot, (player) => !player.seating.shape.isPitcher
      && player.seating.shape.position === slot.position)) return null;
  }

  const closerSlot = slots.find((slot) => slot.kind === 'cp');
  if (!take(closerSlot, (player) => isCloser(player.seating.shape))) return null;

  const starterOrder = [...ordered].sort((left, right) => {
    const leftPure = left.seating.shape.role === 'SP' ? 0 : 1;
    const rightPure = right.seating.shape.role === 'SP' ? 0 : 1;
    return leftPure - rightPure || right.frozenIv - left.frozenIv
      || left.playerId.localeCompare(right.playerId);
  });
  for (const slot of slots.filter((candidate) => candidate.kind === 'sp')) {
    if (!take(slot, (player) => canStart(player.seating.shape), starterOrder)) return null;
  }

  const backupSlot = slots.find((slot) => slot.kind === 'backupC');
  const backupCatcher = ordered.find((player) => remaining.has(player.playerId)
    && !player.seating.shape.isPitcher && canCover(player.seating.shape, 'C'));
  if (!take(backupSlot, (player) => !player.seating.shape.isPitcher,
    backupCatcher ? [backupCatcher, ...ordered.filter((player) => player !== backupCatcher)] : ordered)) return null;

  for (const slot of slots.filter((candidate) => candidate.kind === 'flex')) {
    if (!take(slot, (player) => !player.seating.shape.isPitcher)) return null;
  }

  const reliefOrder = [...ordered].sort((left, right) => {
    const leftRelief = canRelieve(left.seating.shape) ? 0 : 1;
    const rightRelief = canRelieve(right.seating.shape) ? 0 : 1;
    return leftRelief - rightRelief || right.frozenIv - left.frozenIv
      || left.playerId.localeCompare(right.playerId);
  });
  for (const slot of slots.filter((candidate) => candidate.kind === 'rp')) {
    if (!take(slot, (player) => player.seating.shape.isPitcher, reliefOrder)) return null;
  }

  const swingSlot = slots.find((slot) => slot.kind === 'swing');
  const finalPlayer = [...remaining.values()];
  if (!swingSlot || finalPlayer.length !== 1) return null;
  assignments.set(swingSlot.slotId, finalPlayer[0]);
  remaining.clear();

  if (assignments.size !== slots.length) return null;
  return slots.map((slot) => {
    const player = assignments.get(slot.slotId)!;
    return {
      slotId: slot.slotId,
      playerId: player.playerId,
      pinned: pinnedPlayerIds.has(player.playerId),
    };
  });
}

export function buildSnakeAssistantBoard(input: SnakeAssistantBoardInput): SnakeAssistantBoardCoreResult {
  if (!input.teamId || input.slots.length !== 22 || !Number.isInteger(input.realTeamCount) || input.realTeamCount < 1
    || !Number.isFinite(input.budget) || input.budget < 0) {
    return unavailable('MISSING_INPUT');
  }
  if (!(['juiced', 'standard', 'nerfed'] as const).includes(input.tier)
    || !validLuxuryCaps(input.baseCaps)
    || !allNumbersFinite(input.archetype)
    || !allNumbersFinite(input.ownBandPriorities)
    || !allNumbersFinite(input.capIdentity)) {
    return unavailable('INVALID_NUMERIC_INPUT');
  }
  if (new Set(input.slots.map((slot) => slot.slotId)).size !== input.slots.length) {
    return unavailable('MISSING_INPUT');
  }

  const pool = [...input.activePool].sort((left, right) => left.playerId.localeCompare(right.playerId));
  if (input.zeroInterestPlayerIds !== undefined
    && (!Array.isArray(input.zeroInterestPlayerIds)
      || input.zeroInterestPlayerIds.some((playerId) => typeof playerId !== 'string' || !playerId))) {
    return unavailable('MISSING_INPUT');
  }
  if (input.certifiedCompletionPlayerIds !== undefined
    && (!Array.isArray(input.certifiedCompletionPlayerIds)
      || new Set(input.certifiedCompletionPlayerIds).size !== input.certifiedCompletionPlayerIds.length
      || input.certifiedCompletionPlayerIds.some((playerId) => typeof playerId !== 'string' || !playerId))) {
    return unavailable('MISSING_INPUT');
  }
  if (pool.length < 22 || new Set(pool.map((player) => player.playerId)).size !== pool.length
    || pool.some((player) => player.stored.id !== player.playerId
      || !Number.isFinite(player.frozenIv) || player.frozenIv < 0
      || !allNumbersFinite(player.simPlayer)
      || !allNumbersFinite(player.seating)
      || !allNumbersFinite(player.classification)
      || !allNumbersFinite(player.archetypeWeights)
      || !storedPlanNumbersFinite(player.stored))) {
    return unavailable('INVALID_POOL');
  }
  const byId = new Map(pool.map((player) => [player.playerId, player]));
  if (input.completedPicks.some((pick) => !byId.has(pick.playerId))) return unavailable('INVALID_POOL');

  const selectedByGroup = input.versionSelections ?? {};
  const versionValidPool = pool.filter((player) => {
    const selectedId = selectedByGroup[deriveVersionGroupId(identityOf(player))];
    return !selectedId || selectedId === player.playerId;
  });

  const picksById = new Map(input.completedPicks.map((pick) => [pick.playerId, pick]));
  const ownPicks = input.completedPicks.filter((pick) => pick.teamId === input.teamId);
  if (ownPicks.some((pick) => !Number.isFinite(pick.settledSalary) || (pick.settledSalary ?? -1) < 0)) {
    return unavailable('MISSING_SETTLED_SALARY');
  }
  const draftedGroups = new Set(input.completedPicks.map((pick) => deriveVersionGroupId(identityOf(byId.get(pick.playerId)!))));
  const retiredIds = unavailableVersionPlayerIds(input.versionState);
  const ownIds = new Set(ownPicks.map((pick) => pick.playerId));
  const rivalIds = new Set(input.completedPicks.filter((pick) => pick.teamId !== input.teamId).map((pick) => pick.playerId));
  const selectedPin = input.selectedPinPlayerId ?? null;
  const zeroInterestIds = new Set(input.zeroInterestPlayerIds ?? []);
  const ownsCloser = ownPicks.some((pick) => byId.get(pick.playerId)?.seating.shape.role === 'CP');
  const legallyAvailable = versionValidPool.filter((player) => !picksById.has(player.playerId)
    && !retiredIds.has(player.playerId)
    && !draftedGroups.has(deriveVersionGroupId(identityOf(player)))
    && (!ownsCloser || player.seating.shape.role !== 'CP' || player.playerId === selectedPin));
  // Zero interest is a GM preference, never a legality rule. Keep those cards out of the
  // optimized recommendation universe, but retain them for the exact legal-finish fallback so a
  // preference cannot strand a club or make the Assistant disappear late in the draft.
  const available = legallyAvailable.filter((player) => !zeroInterestIds.has(player.playerId));
  const universe = [...ownPicks.map((pick) => byId.get(pick.playerId)!), ...available];

  if (universe.some((player) => rivalIds.has(player.playerId))) {
    return unavailable('VERSION_CONFLICT');
  }
  if (selectedPin && !universe.some((player) => player.playerId === selectedPin)) {
    return unavailable('PIN_UNAVAILABLE');
  }
  const requiredIds = [...new Set([...ownIds, ...(selectedPin ? [selectedPin] : [])])].sort();
  const requiredPlayers = requiredIds.map((playerId) => byId.get(playerId)).filter((player): player is SnakeAssistantBoardPlayer => Boolean(player));
  if (requiredPlayers.length !== requiredIds.length) return unavailable('PIN_UNAVAILABLE');
  if (new Set(requiredPlayers.map((player) => deriveVersionGroupId(identityOf(player)))).size !== requiredPlayers.length) {
    return unavailable('PIN_UNMATCHED');
  }
  const pins = deterministicPinMatching(input.slots, requiredPlayers);
  const rigidPinsMatch = Boolean(pins && pins.size === requiredIds.length);

  const ownStoredPlayers = ownPicks.map((pick) => byId.get(pick.playerId)!.stored);
  const need = rosterNeedBreakdown(ownPicks.map((pick) => byId.get(pick.playerId)!.seating.shape));
  const worthById = new Map(universe.map((player) => [player.playerId, computeOwnValue({
    iv: player.frozenIv,
    archetypeWeights: player.archetypeWeights,
    ownBandPriorities: input.ownBandPriorities,
    archetypeFitMultiplierOverride: constructionArchetypeFitMultiplier(
      input.capIdentity,
      player.seating.construction,
    ),
    needBreakdown: need,
    shape: player.seating.shape,
    openSlots: Math.max(1, 22 - ownPicks.length),
  })]));
  // The weighted 22-player optimizer receives every sibling card plus an exact one-capacity group
  // constraint. No feasibility-only representative pass may discard the globally better card
  // combination before the Assistant objective sees it.
  const optimizerUniverse = universe;
  const exclusiveGroupByPlayerId = new Map(optimizerUniverse.map((player) => [
    player.playerId,
    deriveVersionGroupId(identityOf(player)),
  ]));
  const assembled = assembleBoard({
    candidates: universe.map((player) => ({
      playerId: player.playerId,
      iv: worthById.get(player.playerId) ?? player.frozenIv,
      candidate: player.stored,
      shape: player.seating.shape,
    })),
    rosterPlayers: ownStoredPlayers,
    need,
    rankOverrides: input.gmRankOverrides,
  });
  const optimizer = buildOptimizerRankings(
    input.slots,
    optimizerUniverse,
    assembled.map((entry) => entry.playerId),
    input.gmRankOverrides,
  );
  const simPool: SimPlayer[] = optimizerUniverse.map((player) => ({
    ...player.simPlayer,
    id: player.playerId,
    // The identity optimizer's 90% value floor is literal frozen IV. Contextual
    // own-value still drives the recommendation/rank preference above, but it
    // cannot redefine the economic baseline advertised to the GM.
    iv: assistantValueFloorIv(player),
    salary: ownIds.has(player.playerId)
      ? ownPicks.find((pick) => pick.playerId === player.playerId)!.settledSalary!
      : player.frozenIv,
  }));
  const classifiedById = new Map(optimizerUniverse.map((player) => [player.playerId, player.classification]));

  const assembledIds = new Set(assembled.map((entry) => entry.playerId));
  const recommendationOrder = [
    ...assembled.map((entry) => entry.playerId),
    ...universe
      .map((player) => player.playerId)
      .filter((playerId) => !assembledIds.has(playerId)),
  ];
  const legalFallback = (): SnakeAssistantBoardReady | null => {
    const requiredGroups = new Set(requiredPlayers.map((player) => deriveVersionGroupId(identityOf(player))));
    const currentRoster = requiredPlayers.map((player): SnakeSeatingPlayer => ({
      ...player.seating,
      playerId: player.playerId,
      sourceId: player.sourceId ?? undefined,
      versionGroupId: player.versionGroupId ?? undefined,
      price: ownIds.has(player.playerId)
        ? ownPicks.find((pick) => pick.playerId === player.playerId)!.settledSalary!
        : player.frozenIv,
    }));
    const committedSpent = currentRoster.reduce((sum, player) => sum + player.price, 0);
    const completionPool = legallyAvailable
      .filter((player) => !requiredGroups.has(deriveVersionGroupId(identityOf(player))))
      .map((player): SnakeSeatingPlayer => ({
        ...player.seating,
        playerId: player.playerId,
        sourceId: player.sourceId ?? undefined,
        versionGroupId: player.versionGroupId ?? undefined,
        price: player.frozenIv,
      }));
    const buildReady = (completionPlayerIds: readonly string[]): SnakeAssistantBoardReady | null => {
      const playerIds = [...requiredIds, ...completionPlayerIds.filter((playerId) => !requiredIds.includes(playerId))];
      if (playerIds.length !== 22 || new Set(playerIds).size !== 22) return null;
      const selectedPlayers = playerIds.map((playerId) => byId.get(playerId));
      if (selectedPlayers.some((player) => !player)) return null;
      const selected = selectedPlayers as SnakeAssistantBoardPlayer[];
      const selectedGroups = selected.map((player) => deriveVersionGroupId(identityOf(player)));
      if (new Set(selectedGroups).size !== selectedGroups.length
        || selected.some((player) => rivalIds.has(player.playerId) || retiredIds.has(player.playerId))
        || selected.some((player) => {
          const selectedVersionId = selectedByGroup[deriveVersionGroupId(identityOf(player))];
          return Boolean(selectedVersionId && selectedVersionId !== player.playerId);
        })
        || !isLegalRoster(selected.map((player) => player.seating.shape))) return null;
      const materialized = materializeLegalRoster(input.slots, selected, new Set(requiredIds));
      if (!materialized) return null;
      const planPlayers = selected.map((player): SnakeSeatingPlayer => ({
        ...player.seating,
        playerId: player.playerId,
        sourceId: player.sourceId ?? undefined,
        versionGroupId: player.versionGroupId ?? undefined,
        price: ownIds.has(player.playerId)
          ? ownPicks.find((pick) => pick.playerId === player.playerId)!.settledSalary!
          : player.frozenIv,
      }));
      let plan: SnakePlanBill;
      try {
        plan = evaluateSnakePlan({
          boardPlayerIds: playerIds,
          players: planPlayers,
          budget: input.budget,
          baseCaps: input.baseCaps,
          realTeamCount: input.realTeamCount,
          capIdentity: input.capIdentity,
        });
      } catch {
        return null;
      }
      if (!allNumbersFinite(plan) || !snakeMoneyNonnegative(plan.planCushion)) return null;
      const recommendationIds = new Set(recommendationOrder);
      return {
        status: 'ready',
        teamId: input.teamId,
        slots: materialized,
        playerIds,
        recommendationOrder: [
          ...recommendationOrder,
          ...playerIds.filter((playerId) => !recommendationIds.has(playerId)),
        ],
        plan,
      };
    };

    // The shared certificate has already proved all clubs simultaneously. It is still treated as
    // untrusted input here: recheck current ownership, version law, roster law and exact money
    // before using it as the Assistant's fail-safe board.
    if (input.certifiedCompletionPlayerIds) {
      const certified = buildReady(input.certifiedCompletionPlayerIds);
      if (certified) return certified;
    }
    let finish;
    try {
      finish = evaluateSnakeLegalFinish({
        currentRoster,
        committedSpent,
        availablePool: completionPool,
        budget: input.budget,
        baseCaps: input.baseCaps,
        realTeamCount: input.realTeamCount,
        capIdentity: input.capIdentity,
      });
    } catch {
      return null;
    }
    if (!finish.feasible || finish.affordability !== 'AFFORDABLE'
      || !snakeMoneyNonnegative(finish.legalFinishCushion)) return null;
    return buildReady(finish.completionPlayerIds);
  };

  if (!rigidPinsMatch) return legalFallback() ?? unavailable('PIN_UNMATCHED');

  let target;
  try {
    const taxCaps = input.capIdentity
      ? shiftLuxuryCaps(snakeLuxuryCaps([...input.baseCaps]), input.capIdentity)
      : snakeLuxuryCaps([...input.baseCaps]);
    target = buildBest22Target(optimizer.slots, simPool, classifiedById, input.archetype, input.tier,
      input.budget, input.realTeamCount, pins!, optimizer.ranks, taxCaps,
      new Map(optimizerUniverse.map((player) => [player.playerId, player.frozenIv])), 'snake-money',
      exclusiveGroupByPlayerId);
  } catch {
    return legalFallback() ?? unavailable('INCOMPLETE_BOARD');
  }
  if (!allNumbersFinite(target)) return unavailable('INVALID_NUMERIC_INPUT');
  if (target.optimizationComplete === false) return legalFallback() ?? unavailable('INCOMPLETE_BOARD');
  if (target.pins.dropped.length || target.pins.honored.length !== requiredIds.length) {
    return legalFallback() ?? unavailable('DROPPED_PIN');
  }
  const playerIds = target.picks.map((pick) => pick.playerId);
  if (playerIds.length !== 22 || playerIds.some((playerId) => !playerId)
    || new Set(playerIds).size !== playerIds.length
    || new Set(playerIds.map((playerId) => deriveVersionGroupId(identityOf(byId.get(playerId)!)))).size !== playerIds.length) {
    return legalFallback() ?? unavailable('INCOMPLETE_BOARD');
  }
  if (playerIds.some((playerId) => !ownIds.has(playerId) && !available.some((player) => player.playerId === playerId))) {
    return legalFallback() ?? unavailable('INCOMPLETE_BOARD');
  }
  const selectedPlayers = playerIds.map((playerId) => byId.get(playerId)!);
  if (!isLegalRoster(selectedPlayers.map((player) => player.seating.shape))) {
    return legalFallback() ?? unavailable('ILLEGAL_BOARD');
  }

  let plan: SnakePlanBill;
  try {
    plan = evaluateSnakePlan({
      boardPlayerIds: playerIds,
      players: universe.map((player): SnakeSeatingPlayer => ({
        ...player.seating,
        playerId: player.playerId,
        sourceId: player.sourceId ?? undefined,
        versionGroupId: player.versionGroupId ?? undefined,
        price: ownIds.has(player.playerId)
          ? ownPicks.find((pick) => pick.playerId === player.playerId)!.settledSalary!
          : player.frozenIv,
      })),
      budget: input.budget,
      baseCaps: input.baseCaps,
      realTeamCount: input.realTeamCount,
      capIdentity: input.capIdentity,
    });
  } catch {
    return legalFallback() ?? unavailable('ILLEGAL_BOARD');
  }
  if (!allNumbersFinite(plan)) return unavailable('INVALID_NUMERIC_INPUT');
  if (!target.feasible || !snakeMoneyNonnegative(plan.planCushion)) {
    return legalFallback() ?? unavailable('INSOLVENT_BOARD');
  }
  if (input.certifiedCompletionPlayerIds?.length
    && !input.certifiedCompletionPlayerIds.some((playerId) => playerIds.includes(playerId))) {
    // A locally excellent board is not useful if every displayed future card conflicts with the
    // room's simultaneous finish. Preserve the optimizer whenever it contains a certified choice;
    // otherwise show the exact shared-room completion so the GM always has an actionable safe pick.
    return legalFallback() ?? unavailable('INCOMPLETE_BOARD');
  }

  return {
    status: 'ready',
    teamId: input.teamId,
    slots: target.picks.map((pick) => ({ slotId: pick.slotId, playerId: pick.playerId, pinned: pick.pinned })),
    playerIds,
    recommendationOrder,
    plan,
  };
}
