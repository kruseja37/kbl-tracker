import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import {
  canCover,
  canRelieve,
  canStart,
  isCloser,
  isLegalRoster,
  type RosterSlotPlayer,
} from '../../../../../data/rosterConstruction';
import type { LuxuryCapRow } from '../../../../../data/tierParams';
import {
  assignLuxuryTaxPitchingGroups,
  luxuryRowPlayerRating,
  luxuryTax,
  playerEligibleForLuxuryRow,
  shiftLuxuryCaps,
  type ConstructionPlayer,
  type TeamCapIdentity,
} from '../../../../../engines/leagueConstruction';
import type { SnakeRiskRead } from '../../../../../engines/snakeRationalRoom';
import { deriveVersionGroupId } from '../../../../../engines/snakeVersioning';
import {
  SNAKE_BOARD_SLOT_IDS,
  type SnakeBoardSlotId,
  type SnakeSeatBoardRecord,
} from '../../../../../utils/leagueBuilderStorage';

export interface DeskEligibilityCandidate {
  id: string;
  /** Frozen Snake IV. This is also the player's draft salary. */
  iv?: number;
  position: TaxonomyPosition;
  eligiblePositions?: readonly TaxonomyPosition[];
  rosterShape?: RosterSlotPlayer;
  sourceId?: string | null;
  versionGroupId?: string | null;
}

export interface DeskCandidate extends DeskEligibilityCandidate {
  name: string;
  identityChips?: readonly string[];
  advisorWorth: number;
  iv: number;
  /** Settled salary for rostered players; frozen IV salary otherwise. */
  salary?: number;
  marginalTax: number;
  trueCost: number;
  archetypeChip: string;
  fitWord: string;
  risk: SnakeRiskRead;
  /** True while the public future-pick playout is running off the UI thread. */
  riskPending?: boolean;
  /** True when the background playout is unavailable; never treat this as safe-to-wait. */
  riskUnavailable?: boolean;
  hasNextPick?: boolean;
  riskReason?: string;
  legalFinishLine: string;
  /** Current shared completion certificate membership; independent from identity FIT. */
  finishStatus?: 'DRAFTABLE' | 'OPEN' | 'BLOCKED';
  boardFallout?: string;
  construction: ConstructionPlayer;
  drafted?: boolean;
  draftedByActiveTeam?: boolean;
  draftedByTeamName?: string;
  consequencesKnown?: boolean;
}

export interface BoardBackfillEvent {
  slotId: SnakeBoardSlotId;
  gonePlayerId: string;
  promotedPlayerId: string | null;
}

export interface AdvisorLogEntry {
  key: string;
  playerId?: string;
  text: string;
  actionable: boolean;
  expired?: boolean;
}

export interface TaxCoreRow {
  key: string;
  label: string;
  playerNames: string[];
  tax?: number;
}

const POSITION_ORDER: readonly TaxonomyPosition[] = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP',
];
const PRIMARY_FIELD_SLOTS = new Set<SnakeBoardSlotId>(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']);

export function canonicalDeskEligiblePositions(primary: unknown, secondary?: unknown): TaxonomyPosition[] {
  const eligible: TaxonomyPosition[] = [];
  for (const position of [primary, secondary]) {
    if (typeof position !== 'string' || !POSITION_ORDER.includes(position as TaxonomyPosition)) continue;
    if (!eligible.includes(position as TaxonomyPosition)) eligible.push(position as TaxonomyPosition);
  }
  return eligible;
}

export function boardSlotPosition(slotId: SnakeBoardSlotId): TaxonomyPosition | null {
  if (POSITION_ORDER.includes(slotId as TaxonomyPosition)) return slotId as TaxonomyPosition;
  if (slotId === 'BACKUP_C') return 'C';
  if (slotId.startsWith('SP')) return 'SP';
  if (slotId.startsWith('RP')) return 'RP';
  // Canonical roster law swings the 22nd body between a fifth bench bat and a
  // fifth reliever. It does not require an SP/RP player.
  if (slotId === 'SWING') return null;
  return null;
}

function sortedByAdvisorWorth(candidates: readonly DeskCandidate[]): DeskCandidate[] {
  return [...candidates].sort((left, right) => (
    right.advisorWorth - left.advisorWorth || left.id.localeCompare(right.id)
  ));
}

function eligibleForSlot(
  slotId: SnakeBoardSlotId,
  candidate: DeskEligibilityCandidate,
  committedPlayerIds: ReadonlySet<string> = new Set<string>(),
): boolean {
  const eligible = candidate.eligiblePositions ?? [candidate.position];
  const committedCloser = candidate.position === 'CP' && committedPlayerIds.has(candidate.id);
  // Canonical roster law requires each starting field slot to be covered by a
  // player whose primary position matches. Secondary eligibility is depth,
  // never permission to build an invalid 22-player board.
  if (PRIMARY_FIELD_SLOTS.has(slotId)) return candidate.position === slotId;
  // BACKUP_C is the fifth bench-body seat in a 14/8 roster. Normally the
  // second catcher occupies it. When catcher depth comes from a Two Way (C)
  // pitcher in a staff slot, this seat must remain available to the fifth
  // position player; whole-roster legality below still proves two C coverers.
  if (slotId === 'BACKUP_C') return eligible.includes('C') || !(candidate.rosterShape?.isPitcher
    ?? ['SP', 'SP/RP', 'RP', 'CP'].includes(candidate.position));
  if (slotId.startsWith('SP')) return eligible.includes('SP') || eligible.includes('SP/RP');
  if (slotId.startsWith('RP')) return eligible.includes('RP') || eligible.includes('SP/RP') || committedCloser;
  if (slotId === 'SWING') {
    return !['SP', 'SP/RP', 'RP', 'CP'].includes(candidate.position)
      || eligible.some((position) => ['SP/RP', 'RP'].includes(position))
      || committedCloser;
  }
  if (slotId.startsWith('FLEX')) return !(candidate.rosterShape?.isPitcher
    ?? ['SP', 'SP/RP', 'RP', 'CP'].includes(candidate.position));
  return eligible.includes(slotId as TaxonomyPosition);
}

export function isCandidateEligibleForBoardSlot(slotId: SnakeBoardSlotId, candidate: DeskEligibilityCandidate): boolean {
  return eligibleForSlot(slotId, candidate);
}

function candidateRosterShape(candidate: DeskEligibilityCandidate): RosterSlotPlayer {
  if (candidate.rosterShape) return candidate.rosterShape;
  const isPitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(candidate.position);
  return {
    isPitcher,
    position: candidate.position,
    role: isPitcher ? candidate.position : undefined,
    secondaryPosition: isPitcher
      ? null
      : (candidate.eligiblePositions ?? []).find((position) => position !== candidate.position) ?? null,
  };
}

function candidateVersionGroupId(candidate: DeskEligibilityCandidate): string {
  return deriveVersionGroupId({
    playerId: candidate.id,
    sourceId: candidate.sourceId,
    versionGroupId: candidate.versionGroupId,
  });
}

export function isCanonicalSnakeBoard(input: {
  slots: Partial<Record<SnakeBoardSlotId, string>>;
  candidates: readonly DeskEligibilityCandidate[];
}): boolean {
  const playerIds = SNAKE_BOARD_SLOT_IDS.map((slotId) => input.slots[slotId]);
  if (playerIds.some((playerId) => !playerId)) return false;
  const completePlayerIds = playerIds as string[];
  if (new Set(completePlayerIds).size !== SNAKE_BOARD_SLOT_IDS.length) return false;
  const byId = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const players = completePlayerIds.map((playerId) => byId.get(playerId));
  if (players.some((player) => !player)) return false;
  const completePlayers = players as DeskEligibilityCandidate[];
  if (new Set(completePlayers.map(candidateVersionGroupId)).size !== completePlayers.length) return false;
  return isLegalRoster(completePlayers.map(candidateRosterShape));
}

export function seedPositionalRankings(
  candidates: readonly DeskCandidate[],
): Partial<Record<TaxonomyPosition, string[]>> {
  return Object.fromEntries(POSITION_ORDER.map((position) => [
    position,
    sortedByAdvisorWorth(candidates.filter((candidate) => (
      candidate.eligiblePositions ?? [candidate.position]
    ).includes(position))).map((candidate) => candidate.id),
  ]));
}

export function seedBoardRankings(candidates: readonly DeskCandidate[]): SnakeSeatBoardRecord['rankings'] {
  return {
    byPosition: seedPositionalRankings(candidates),
    global: sortedByAdvisorWorth(candidates).map((candidate) => candidate.id),
    frozenPlayerIds: [],
  };
}

export function setSeatBoardZeroInterest(
  board: SnakeSeatBoardRecord,
  playerId: string,
  zeroInterest: boolean,
): SnakeSeatBoardRecord {
  const current = new Set(board.rankings.zeroInterestPlayerIds ?? []);
  if (zeroInterest) current.add(playerId);
  else current.delete(playerId);
  return {
    ...structuredClone(board),
    rankings: {
      ...structuredClone(board.rankings),
      zeroInterestPlayerIds: [...current].sort(),
    },
    revision: board.revision + 1,
  };
}

/**
 * A seating certificate proves one exact legal 22 as a roster set. Board row ids are stable UI
 * storage, not a second roster law: SP/RP can satisfy both aggregate staff minima, while a ninth
 * pitcher may be a surplus starter or closer. Materialize the certified set deterministically and
 * let the unchanged whole-roster validator remain authoritative.
 */
export function buildCertifiedSeatBoard(candidates: readonly DeskCandidate[]): {
  board: SnakeSeatBoardRecord | null;
  brokenSlots: SnakeBoardSlotId[];
} {
  const rankings = seedBoardRankings(candidates);
  const ordered = sortedByAdvisorWorth(candidates);
  if (ordered.length !== SNAKE_BOARD_SLOT_IDS.length) {
    return { board: null, brokenSlots: [...SNAKE_BOARD_SLOT_IDS] };
  }
  if (new Set(ordered.map((candidate) => candidate.id)).size !== ordered.length) {
    return { board: null, brokenSlots: [...SNAKE_BOARD_SLOT_IDS] };
  }
  if (new Set(ordered.map(candidateVersionGroupId)).size !== ordered.length) {
    return { board: null, brokenSlots: [...SNAKE_BOARD_SLOT_IDS] };
  }
  if (!isLegalRoster(ordered.map(candidateRosterShape))) {
    return { board: null, brokenSlots: [...SNAKE_BOARD_SLOT_IDS] };
  }

  const remaining = new Map(ordered.map((candidate) => [candidate.id, candidate]));
  const slots: Partial<Record<SnakeBoardSlotId, string>> = {};
  const take = (
    slotId: SnakeBoardSlotId,
    predicate: (candidate: DeskCandidate) => boolean,
    preferredOrder: readonly DeskCandidate[] = ordered,
  ): boolean => {
    const candidate = preferredOrder.find((entry) => remaining.has(entry.id) && predicate(entry));
    if (!candidate) return false;
    slots[slotId] = candidate.id;
    remaining.delete(candidate.id);
    return true;
  };

  for (const slotId of ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const) {
    if (!take(slotId, (candidate) => {
      const shape = candidateRosterShape(candidate);
      return !shape.isPitcher && shape.position === slotId;
    })) return { board: null, brokenSlots: [slotId] };
  }

  if (!take('CP', (candidate) => isCloser(candidateRosterShape(candidate)))) {
    return { board: null, brokenSlots: ['CP'] };
  }

  const starterOrder = [...ordered].sort((left, right) => {
    const leftShape = candidateRosterShape(left);
    const rightShape = candidateRosterShape(right);
    const leftPure = leftShape.role === 'SP' ? 0 : 1;
    const rightPure = rightShape.role === 'SP' ? 0 : 1;
    return leftPure - rightPure || right.advisorWorth - left.advisorWorth || left.id.localeCompare(right.id);
  });
  for (const slotId of ['SP1', 'SP2', 'SP3', 'SP4'] as const) {
    if (!take(slotId, (candidate) => canStart(candidateRosterShape(candidate)), starterOrder)) {
      return { board: null, brokenSlots: [slotId] };
    }
  }

  const remainingHitters = () => ordered.filter((candidate) => (
    remaining.has(candidate.id) && !candidateRosterShape(candidate).isPitcher
  ));
  const backupC = remainingHitters().find((candidate) => canCover(candidateRosterShape(candidate), 'C'));
  if (!take('BACKUP_C', (candidate) => !candidateRosterShape(candidate).isPitcher, backupC
    ? [backupC, ...ordered.filter((candidate) => candidate.id !== backupC.id)]
    : ordered)) {
    return { board: null, brokenSlots: ['BACKUP_C'] };
  }
  for (const slotId of ['FLEX1', 'FLEX2', 'FLEX3', 'FLEX4'] as const) {
    if (!take(slotId, (candidate) => !candidateRosterShape(candidate).isPitcher)) {
      return { board: null, brokenSlots: [slotId] };
    }
  }

  const reliefDepthOrder = [...ordered].sort((left, right) => {
    const leftShape = candidateRosterShape(left);
    const rightShape = candidateRosterShape(right);
    const leftRelief = canRelieve(leftShape) ? 0 : 1;
    const rightRelief = canRelieve(rightShape) ? 0 : 1;
    return leftRelief - rightRelief || right.advisorWorth - left.advisorWorth || left.id.localeCompare(right.id);
  });
  for (const slotId of ['RP1', 'RP2', 'RP3'] as const) {
    if (!take(slotId, (candidate) => candidateRosterShape(candidate).isPitcher, reliefDepthOrder)) {
      return { board: null, brokenSlots: [slotId] };
    }
  }

  const finalCandidate = [...remaining.values()];
  if (finalCandidate.length !== 1) {
    return { board: null, brokenSlots: ['SWING'] };
  }
  slots.SWING = finalCandidate[0].id;

  if (!isCanonicalSnakeBoard({ slots, candidates })) {
    return { board: null, brokenSlots: [...SNAKE_BOARD_SLOT_IDS] };
  }
  return {
    board: { slots: slots as Record<SnakeBoardSlotId, string>, rankings, revision: 0 },
    brokenSlots: [],
  };
}

export function refitBoardSlots(input: {
  rankings: SnakeSeatBoardRecord['rankings'];
  candidates: readonly DeskEligibilityCandidate[];
  unavailablePlayerIds?: ReadonlySet<string>;
  committedPlayerIds?: ReadonlySet<string>;
}): {
  slots: Partial<Record<SnakeBoardSlotId, string>>;
  brokenSlots: SnakeBoardSlotId[];
  invalidRoster: boolean;
} {
  const byId = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const unavailable = input.unavailablePlayerIds ?? new Set<string>();
  const committed = input.committedPlayerIds ?? new Set<string>();
  const canonicalIndex = new Map(SNAKE_BOARD_SLOT_IDS.map((slotId, index) => [slotId, index]));
  const rankedBySlot = new Map<SnakeBoardSlotId, string[]>();
  for (const slotId of SNAKE_BOARD_SLOT_IDS) {
    const position = boardSlotPosition(slotId);
    const rankedIds = [...new Set([
      ...[...committed].sort((leftId, rightId) => {
        const left = byId.get(leftId);
        const right = byId.get(rightId);
        return (right?.iv ?? 0) - (left?.iv ?? 0) || leftId.localeCompare(rightId);
      }),
      ...(position ? input.rankings.byPosition?.[position] ?? [] : []),
      ...(input.rankings.global ?? []),
    ])].filter((id) => {
      const candidate = byId.get(id);
      return Boolean(candidate && !unavailable.has(id) && eligibleForSlot(slotId, candidate, committed));
    });
    rankedBySlot.set(slotId, rankedIds);
  }

  const assignmentOrder = [...SNAKE_BOARD_SLOT_IDS].sort((left, right) => (
    (rankedBySlot.get(left)?.length ?? 0) - (rankedBySlot.get(right)?.length ?? 0)
      || (canonicalIndex.get(left) ?? 0) - (canonicalIndex.get(right) ?? 0)
  ));

  // FINDING-217: a version group, not a card id, is the scarce matching resource.
  // Different sibling cards may expose different positions, so the augmenting path still
  // walks cards while ownership is reserved at the one-person group level.
  const versionGroupByPlayerId = new Map([...byId.entries()].map(([playerId, candidate]) => [
    playerId,
    candidateVersionGroupId(candidate),
  ]));
  const canMatchEverySlot = (slotIds: readonly SnakeBoardSlotId[], reservedGroups: ReadonlySet<string>): boolean => {
    const groupOwner = new Map<string, SnakeBoardSlotId>();
    const tryAssign = (slotId: SnakeBoardSlotId, visitedGroups: Set<string>): boolean => {
      for (const playerId of rankedBySlot.get(slotId) ?? []) {
        const groupId = versionGroupByPlayerId.get(playerId);
        if (!groupId || reservedGroups.has(groupId) || visitedGroups.has(groupId)) continue;
        visitedGroups.add(groupId);
        const owner = groupOwner.get(groupId);
        if (owner && !tryAssign(owner, visitedGroups)) continue;
        groupOwner.set(groupId, slotId);
        return true;
      }
      return false;
    };
    return slotIds.every((slotId) => tryAssign(slotId, new Set()));
  };

  const assigned = new Map<SnakeBoardSlotId, string>();
  const usedGroups = new Set<string>();

  // A drafted player is roster truth, not another recommendation candidate. Match every
  // committed player before filling the future plan. The highest-IV owned closer owns CP;
  // any additional committed closer may use legal relief depth, while undrafted closers may not.
  const committedCandidates = [...committed].flatMap((playerId) => {
    const candidate = byId.get(playerId);
    return candidate ? [candidate] : [];
  });
  let committedMatched = committedCandidates.length === committed.size
    && committedCandidates.every((candidate) => !unavailable.has(candidate.id));
  if (committedMatched && new Set(committedCandidates.map(candidateVersionGroupId)).size !== committedCandidates.length) {
    committedMatched = false;
  }
  const committedClosers = committedCandidates
    .filter((candidate) => candidate.position === 'CP')
    .sort((left, right) => (right.iv ?? 0) - (left.iv ?? 0) || left.id.localeCompare(right.id));
  const primaryCloser = committedClosers[0];
  if (committedMatched && primaryCloser) {
    assigned.set('CP', primaryCloser.id);
    usedGroups.add(candidateVersionGroupId(primaryCloser));
  }
  const remainingCommitted = committedCandidates.filter((candidate) => candidate.id !== primaryCloser?.id);
  let committedSearchNodes = 0;
  const matchCommitted = (remaining: readonly DeskEligibilityCandidate[]): boolean => {
    committedSearchNodes += 1;
    if (committedSearchNodes > 25_000) return false;
    if (remaining.length === 0) {
      return canMatchEverySlot(assignmentOrder.filter((slotId) => !assigned.has(slotId)), usedGroups);
    }
    const ranked = [...remaining].sort((left, right) => {
      const leftOptions = assignmentOrder.filter((slotId) => !assigned.has(slotId) && eligibleForSlot(slotId, left, committed)).length;
      const rightOptions = assignmentOrder.filter((slotId) => !assigned.has(slotId) && eligibleForSlot(slotId, right, committed)).length;
      return leftOptions - rightOptions || (right.iv ?? 0) - (left.iv ?? 0) || left.id.localeCompare(right.id);
    });
    const candidate = ranked[0];
    const rest = remaining.filter((entry) => entry.id !== candidate.id);
    const candidateGroup = candidateVersionGroupId(candidate);
    const preferredSlots = assignmentOrder
      .filter((slotId) => !assigned.has(slotId) && eligibleForSlot(slotId, candidate, committed))
      .sort((left, right) => {
        const preferred = (slotId: SnakeBoardSlotId) => {
          if (candidate.position === 'CP') return slotId.startsWith('RP') ? 0 : slotId === 'SWING' ? 1 : 2;
          if (candidate.position === 'SP' || candidate.position === 'SP/RP') return slotId.startsWith('SP') ? 0 : slotId.startsWith('RP') ? 1 : 2;
          if (candidate.position === 'RP') return slotId.startsWith('RP') ? 0 : 1;
          if (slotId === candidate.position) return 0;
          if (slotId === 'BACKUP_C') return 1;
          if (slotId.startsWith('FLEX')) return 2;
          return 3;
        };
        return preferred(left) - preferred(right)
          || (canonicalIndex.get(left) ?? 0) - (canonicalIndex.get(right) ?? 0);
      });
    for (const slotId of preferredSlots) {
      if (usedGroups.has(candidateGroup)) continue;
      assigned.set(slotId, candidate.id);
      usedGroups.add(candidateGroup);
      if (matchCommitted(rest)) return true;
      usedGroups.delete(candidateGroup);
      assigned.delete(slotId);
    }
    return false;
  };
  committedMatched = committedMatched && (
    committedCandidates.length === 0 || matchCommitted(remainingCommitted)
  );
  if (!committedMatched) {
    return { slots: {}, brokenSlots: [...SNAKE_BOARD_SLOT_IDS], invalidRoster: false };
  }

  const remainingAssignmentOrder = assignmentOrder.filter((slotId) => !assigned.has(slotId));
  const fullyFeasible = canMatchEverySlot(remainingAssignmentOrder, usedGroups);
  for (const [index, slotId] of remainingAssignmentOrder.entries()) {
    const remainingSlots = remainingAssignmentOrder.slice(index + 1);
    for (const playerId of rankedBySlot.get(slotId) ?? []) {
      const groupId = versionGroupByPlayerId.get(playerId);
      if (!groupId || usedGroups.has(groupId)) continue;
      if (fullyFeasible) {
        usedGroups.add(groupId);
        if (!canMatchEverySlot(remainingSlots, usedGroups)) {
          usedGroups.delete(groupId);
          continue;
        }
      } else {
        usedGroups.add(groupId);
      }
      assigned.set(slotId, playerId);
      break;
    }
  }

  const slots: Partial<Record<SnakeBoardSlotId, string>> = {};
  for (const slotId of SNAKE_BOARD_SLOT_IDS) {
    const playerId = assigned.get(slotId);
    if (playerId) slots[slotId] = playerId;
  }
  const brokenSlots = SNAKE_BOARD_SLOT_IDS.filter((slotId) => !assigned.has(slotId));
  const invalidRoster = brokenSlots.length === 0 && !isCanonicalSnakeBoard({ slots, candidates: input.candidates });
  return { slots, brokenSlots, invalidRoster };
}

export function reorderSeatBoardRankings(input: {
  board: SnakeSeatBoardRecord;
  view: 'OVERALL' | TaxonomyPosition;
  orderedIds: readonly string[];
  candidates: readonly DeskEligibilityCandidate[];
  unavailablePlayerIds?: ReadonlySet<string>;
  committedPlayerIds?: ReadonlySet<string>;
}): {
  board: SnakeSeatBoardRecord | null;
  changedSlotCount: number;
  brokenSlots: SnakeBoardSlotId[];
  invalidRoster: boolean;
} {
  const priorOrder = input.view === 'OVERALL'
    ? input.board.rankings.global ?? []
    : input.board.rankings.byPosition?.[input.view] ?? [];
  const changedIds = new Set<string>();
  const maxLength = Math.max(priorOrder.length, input.orderedIds.length);
  for (let index = 0; index < maxLength; index += 1) {
    const prior = priorOrder[index];
    const next = input.orderedIds[index];
    if (prior === next) continue;
    if (prior) changedIds.add(prior);
    if (next) changedIds.add(next);
  }
  const frozenPlayerIds = [...new Set([
    ...(input.board.rankings.frozenPlayerIds ?? []),
    ...changedIds,
  ])];
  const rankings: SnakeSeatBoardRecord['rankings'] = input.view === 'OVERALL'
    ? {
        ...input.board.rankings,
        global: [...input.orderedIds],
        frozenPlayerIds,
      }
    : {
        ...input.board.rankings,
        byPosition: {
          ...input.board.rankings.byPosition,
          [input.view]: [...input.orderedIds],
        },
        frozenPlayerIds,
      };
  const refit = refitBoardSlots({
    rankings,
    candidates: input.candidates,
    unavailablePlayerIds: input.unavailablePlayerIds,
    committedPlayerIds: input.committedPlayerIds,
  });
  if (refit.brokenSlots.length > 0 || refit.invalidRoster) {
    return { board: null, changedSlotCount: 0, brokenSlots: refit.brokenSlots, invalidRoster: refit.invalidRoster };
  }
  const slots = refit.slots as Record<SnakeBoardSlotId, string>;
  const changedSlotCount = SNAKE_BOARD_SLOT_IDS.reduce((count, slotId) => (
    count + (slots[slotId] === input.board.slots[slotId] ? 0 : 1)
  ), 0);
  return {
    board: {
      ...input.board,
      slots,
      rankings,
      revision: input.board.revision + 1,
    },
    changedSlotCount,
    brokenSlots: [],
    invalidRoster: false,
  };
}

/** Advisor seed only. This creates no recommendation/search API; the GM confirms it in the UI. */
export function buildSeededSeatBoard(candidates: readonly DeskCandidate[]): {
  board: SnakeSeatBoardRecord | null;
  brokenSlots: SnakeBoardSlotId[];
} {
  const fullRankings = seedBoardRankings(candidates);
  const refit = refitBoardSlots({ rankings: fullRankings, candidates });

  if (refit.brokenSlots.length > 0 || refit.invalidRoster) return { board: null, brokenSlots: refit.brokenSlots };
  return {
    board: {
      slots: refit.slots as Record<SnakeBoardSlotId, string>,
      rankings: fullRankings,
      revision: 0,
    },
    brokenSlots: [],
  };
}

function rankedBackfillIds(input: {
  slotId: SnakeBoardSlotId;
  board: SnakeSeatBoardRecord;
  candidates: readonly DeskEligibilityCandidate[];
}): string[] {
  const eligibleIds = new Set(input.candidates.filter((candidate) => (
    eligibleForSlot(input.slotId, candidate)
      || (input.slotId === 'SWING' && candidate.position === 'SP')
  )).map((candidate) => candidate.id));
  const position = boardSlotPosition(input.slotId);
  const ownPositionOrder = position ? input.board.rankings.byPosition?.[position] ?? [] : [];
  return [...new Set([
    ...ownPositionOrder.filter((id) => eligibleIds.has(id)),
    ...(input.board.rankings.global ?? []).filter((id) => eligibleIds.has(id)),
  ])];
}

/** Frozen-touch law: only the unavailable slot changes; rankings and every survivor stay byte-stable. */
export function reconcileBoardAvailability(input: {
  board: SnakeSeatBoardRecord;
  candidates: readonly DeskEligibilityCandidate[];
  unavailablePlayerIds: ReadonlySet<string>;
}): { board: SnakeSeatBoardRecord; events: BoardBackfillEvent[]; brokenSlots: SnakeBoardSlotId[] } {
  const byId = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const targetSlots = SNAKE_BOARD_SLOT_IDS.filter((slotId) => (
    input.unavailablePlayerIds.has(input.board.slots[slotId])
  ));
  if (targetSlots.length === 0) return { board: input.board, events: [], brokenSlots: [] };

  const targetSet = new Set<SnakeBoardSlotId>(targetSlots);
  const survivingPlayerIds = SNAKE_BOARD_SLOT_IDS
    .filter((slotId) => !targetSet.has(slotId))
    .map((slotId) => input.board.slots[slotId]);
  const survivingPlayers = survivingPlayerIds.map((playerId) => byId.get(playerId));
  const survivingVersionGroups = survivingPlayers.flatMap((player) => player ? [candidateVersionGroupId(player)] : []);
  const survivorsAreProvable = new Set(survivingPlayerIds).size === survivingPlayerIds.length
    && survivingPlayers.length === survivingPlayerIds.length
    && survivingPlayers.every(Boolean)
    && new Set(survivingVersionGroups).size === survivingPlayerIds.length;
  const slots = { ...input.board.slots };
  const usedPlayerIds = new Set(survivingPlayerIds);
  const usedVersionGroups = new Set(survivingVersionGroups);
  const promotedBySlot = new Map<SnakeBoardSlotId, string>();

  const assignBackfills = (index: number): boolean => {
    if (index === targetSlots.length) {
      return isCanonicalSnakeBoard({ slots, candidates: input.candidates });
    }
    const slotId = targetSlots[index];
    for (const playerId of rankedBackfillIds({ slotId, board: input.board, candidates: input.candidates })) {
      const candidate = byId.get(playerId);
      if (!candidate || input.unavailablePlayerIds.has(playerId) || usedPlayerIds.has(playerId)) continue;
      const versionGroupId = candidateVersionGroupId(candidate);
      if (usedVersionGroups.has(versionGroupId)) continue;
      slots[slotId] = playerId;
      usedPlayerIds.add(playerId);
      usedVersionGroups.add(versionGroupId);
      promotedBySlot.set(slotId, playerId);
      if (assignBackfills(index + 1)) return true;
      promotedBySlot.delete(slotId);
      usedVersionGroups.delete(versionGroupId);
      usedPlayerIds.delete(playerId);
      slots[slotId] = input.board.slots[slotId];
    }
    return false;
  };

  const fullyReconciled = survivorsAreProvable && assignBackfills(0);
  const events = targetSlots.map((slotId): BoardBackfillEvent => ({
    slotId,
    gonePlayerId: input.board.slots[slotId],
    promotedPlayerId: fullyReconciled ? promotedBySlot.get(slotId) ?? null : null,
  }));
  if (!fullyReconciled) {
    return { board: input.board, events, brokenSlots: targetSlots };
  }

  return {
    board: { ...input.board, slots, revision: input.board.revision + 1 },
    events,
    brokenSlots: [],
  };
}

export function buildAdvisorLog(
  previous: readonly AdvisorLogEntry[],
  active: readonly AdvisorLogEntry[],
): AdvisorLogEntry[] {
  const activeByKey = new Map(active.filter((entry) => entry.actionable).map((entry) => [entry.key, entry]));
  const priorKeys = new Set(previous.map((entry) => entry.key));
  return [
    ...active.filter((entry) => entry.actionable && !priorKeys.has(entry.key)).map((entry) => ({ ...entry, expired: false })),
    ...previous.map((entry) => activeByKey.has(entry.key) ? { ...entry, ...activeByKey.get(entry.key), expired: false } : { ...entry, expired: true }),
  ];
}

// The explainer names arms exactly the way the settled tax groups them
// (assignLuxuryTaxPitchingGroups — TAXSWING single assignment; a swing arm is never
// listed in both groups).

function statWord(stat: LuxuryCapRow['stat']): string {
  return ({ POW: 'POWER', CON: 'CONTACT', SPD: 'SPEED', FLD: 'FIELDING', ARM: 'ARM', VEL: 'VELOCITY', JNK: 'JUNK', ACC: 'ACCURACY' })[stat];
}

export function buildTaxCoreRows(input: {
  candidates: readonly DeskCandidate[];
  boardPlayerIds: readonly string[];
  caps: readonly LuxuryCapRow[];
  capIdentity?: TeamCapIdentity;
}): TaxCoreRow[] {
  const boardIds = new Set(input.boardPlayerIds);
  const players = input.candidates.filter((candidate) => boardIds.has(candidate.id));
  const settledCaps = input.capIdentity ? shiftLuxuryCaps([...input.caps], input.capIdentity) : [...input.caps];
  const construction = players.map((candidate) => candidate.construction);
  const pitchingGroups = assignLuxuryTaxPitchingGroups(construction);
  const rotationIds = new Set(pitchingGroups.rotation.map((player) => player.id));
  const bullpenIds = new Set(pitchingGroups.bullpen.map((player) => player.id));
  const inGroup = (player: ConstructionPlayer, group: LuxuryCapRow['group']): boolean => {
    if (group === 'hitters') return true;
    if (group === 'rotation') return rotationIds.has(player.id);
    return bullpenIds.has(player.id);
  };
  const bindingByKey = new Map(luxuryTax(construction, settledCaps, 'taxed').binding.map((row) => [
    `${row.group}:${row.stat}`, row.tax,
  ]));
  return settledCaps.map((cap) => {
    const groupWord = cap.group === 'hitters' ? 'HITTERS' : cap.group === 'rotation' ? 'STARTERS' : 'BULLPEN ARMS';
    const core = players
      .filter((candidate) => inGroup(candidate.construction, cap.group)
        && playerEligibleForLuxuryRow(candidate.construction, cap, input.caps))
      .sort((left, right) => luxuryRowPlayerRating(right.construction, cap, input.caps)
        - luxuryRowPlayerRating(left.construction, cap, input.caps)
        || left.id.localeCompare(right.id))
      .slice(0, cap.topN);
    return {
      key: `${cap.group}:${cap.stat}`,
      label: `YOUR TOP ${cap.topN} ${groupWord} BY ${statWord(cap.stat)}`,
      playerNames: core.map((candidate) => candidate.name),
      tax: bindingByKey.get(`${cap.group}:${cap.stat}`) ?? 0,
    };
  });
}
