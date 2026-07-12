import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import type { LuxuryCapRow } from '../../../../../data/tierParams';
import {
  assignLuxuryTaxPitchingGroups,
  type ConstructionPlayer,
} from '../../../../../engines/leagueConstruction';
import type { SnakeRiskRead } from '../../../../../engines/snakeRationalRoom';
import {
  SNAKE_BOARD_SLOT_IDS,
  type SnakeBoardSlotId,
  type SnakeSeatBoardRecord,
} from '../../../../../utils/leagueBuilderStorage';

export interface DeskEligibilityCandidate {
  id: string;
  position: TaxonomyPosition;
  eligiblePositions?: readonly TaxonomyPosition[];
}

export interface DeskCandidate extends DeskEligibilityCandidate {
  name: string;
  advisorWorth: number;
  iv: number;
  marginalTax: number;
  trueCost: number;
  archetypeChip: string;
  fitWord: string;
  risk: SnakeRiskRead;
  riskReason?: string;
  legalFinishLine: string;
  boardFallout?: string;
  construction: ConstructionPlayer;
  drafted?: boolean;
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
}

const POSITION_ORDER: readonly TaxonomyPosition[] = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP',
];

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
  if (slotId === 'SWING') return 'SP/RP';
  return null;
}

function sortedByAdvisorWorth(candidates: readonly DeskCandidate[]): DeskCandidate[] {
  return [...candidates].sort((left, right) => (
    right.advisorWorth - left.advisorWorth || left.id.localeCompare(right.id)
  ));
}

function eligibleForSlot(slotId: SnakeBoardSlotId, candidate: DeskEligibilityCandidate): boolean {
  const eligible = candidate.eligiblePositions ?? [candidate.position];
  if (slotId === 'BACKUP_C') return eligible.includes('C');
  if (slotId.startsWith('SP')) return eligible.includes('SP') || eligible.includes('SP/RP');
  if (slotId.startsWith('RP')) return eligible.includes('RP') || eligible.includes('SP/RP');
  if (slotId === 'SWING') return eligible.includes('SP/RP');
  if (slotId.startsWith('FLEX')) return true;
  return eligible.includes(slotId as TaxonomyPosition);
}

export function isCandidateEligibleForBoardSlot(slotId: SnakeBoardSlotId, candidate: DeskEligibilityCandidate): boolean {
  return eligibleForSlot(slotId, candidate);
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

export function refitBoardSlots(input: {
  rankings: SnakeSeatBoardRecord['rankings'];
  candidates: readonly DeskCandidate[];
  unavailablePlayerIds?: ReadonlySet<string>;
}): { slots: Partial<Record<SnakeBoardSlotId, string>>; brokenSlots: SnakeBoardSlotId[] } {
  const byId = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const unavailable = input.unavailablePlayerIds ?? new Set<string>();
  const canonicalIndex = new Map(SNAKE_BOARD_SLOT_IDS.map((slotId, index) => [slotId, index]));
  const rankedBySlot = new Map<SnakeBoardSlotId, string[]>();
  for (const slotId of SNAKE_BOARD_SLOT_IDS) {
    const position = boardSlotPosition(slotId);
    const rankedIds = [...new Set([
      ...(position ? input.rankings.byPosition?.[position] ?? [] : []),
      ...(input.rankings.global ?? []),
    ])].filter((id) => {
      const candidate = byId.get(id);
      return Boolean(candidate && !unavailable.has(id) && eligibleForSlot(slotId, candidate));
    });
    rankedBySlot.set(slotId, rankedIds);
  }

  const assignmentOrder = [...SNAKE_BOARD_SLOT_IDS].sort((left, right) => (
    (rankedBySlot.get(left)?.length ?? 0) - (rankedBySlot.get(right)?.length ?? 0)
      || (canonicalIndex.get(left) ?? 0) - (canonicalIndex.get(right) ?? 0)
  ));

  const canMatchEverySlot = (slotIds: readonly SnakeBoardSlotId[], reserved: ReadonlySet<string>): boolean => {
    const playerOwner = new Map<string, SnakeBoardSlotId>();
    const tryAssign = (slotId: SnakeBoardSlotId, visitedPlayers: Set<string>): boolean => {
      for (const playerId of rankedBySlot.get(slotId) ?? []) {
        if (reserved.has(playerId) || visitedPlayers.has(playerId)) continue;
        visitedPlayers.add(playerId);
        const owner = playerOwner.get(playerId);
        if (owner && !tryAssign(owner, visitedPlayers)) continue;
        playerOwner.set(playerId, slotId);
        return true;
      }
      return false;
    };
    return slotIds.every((slotId) => tryAssign(slotId, new Set()));
  };

  const assigned = new Map<SnakeBoardSlotId, string>();
  const used = new Set<string>();
  const fullyFeasible = canMatchEverySlot(assignmentOrder, used);
  for (const [index, slotId] of assignmentOrder.entries()) {
    const remainingSlots = assignmentOrder.slice(index + 1);
    for (const playerId of rankedBySlot.get(slotId) ?? []) {
      if (used.has(playerId)) continue;
      if (fullyFeasible) {
        used.add(playerId);
        if (!canMatchEverySlot(remainingSlots, used)) {
          used.delete(playerId);
          continue;
        }
      } else {
        used.add(playerId);
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
  return { slots, brokenSlots };
}

/** Advisor seed only. This creates no recommendation/search API; the GM confirms it in the UI. */
export function buildSeededSeatBoard(candidates: readonly DeskCandidate[]): {
  board: SnakeSeatBoardRecord | null;
  brokenSlots: SnakeBoardSlotId[];
} {
  const rankings = seedPositionalRankings(candidates);
  const fullRankings: SnakeSeatBoardRecord['rankings'] = {
    byPosition: rankings,
    global: sortedByAdvisorWorth(candidates).map((candidate) => candidate.id),
    frozenPlayerIds: [],
  };
  const refit = refitBoardSlots({ rankings: fullRankings, candidates });

  if (refit.brokenSlots.length > 0) return { board: null, brokenSlots: refit.brokenSlots };
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
  const eligibleIds = new Set(input.candidates.filter((candidate) => eligibleForSlot(input.slotId, candidate)).map((candidate) => candidate.id));
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
  const slots = { ...input.board.slots };
  const used = new Set(Object.values(slots).filter((id) => !input.unavailablePlayerIds.has(id)));
  const events: BoardBackfillEvent[] = [];
  const brokenSlots: SnakeBoardSlotId[] = [];

  for (const slotId of SNAKE_BOARD_SLOT_IDS) {
    const gonePlayerId = slots[slotId];
    if (!input.unavailablePlayerIds.has(gonePlayerId)) continue;
    const next = rankedBackfillIds({ slotId, board: input.board, candidates: input.candidates }).find((id) => (
      !input.unavailablePlayerIds.has(id) && !used.has(id) && byId.has(id)
    ));
    if (!next) {
      brokenSlots.push(slotId);
      events.push({ slotId, gonePlayerId, promotedPlayerId: null });
      continue;
    }
    slots[slotId] = next;
    used.add(next);
    events.push({ slotId, gonePlayerId, promotedPlayerId: next });
  }

  return {
    board: events.some((event) => event.promotedPlayerId)
      ? { ...input.board, slots, revision: input.board.revision + 1 }
      : input.board,
    events,
    brokenSlots,
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

function rating(player: ConstructionPlayer, stat: LuxuryCapRow['stat']): number {
  if (stat === 'VEL' || stat === 'JNK' || stat === 'ACC') return player.pit?.[stat] ?? 0;
  return player.bat[stat];
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
}): TaxCoreRow[] {
  const boardIds = new Set(input.boardPlayerIds);
  const players = input.candidates.filter((candidate) => boardIds.has(candidate.id));
  const pitchingGroups = assignLuxuryTaxPitchingGroups(players.map((candidate) => candidate.construction));
  const rotationIds = new Set(pitchingGroups.rotation.map((player) => player.id));
  const bullpenIds = new Set(pitchingGroups.bullpen.map((player) => player.id));
  const inGroup = (player: ConstructionPlayer, group: LuxuryCapRow['group']): boolean => {
    if (group === 'hitters') return !player.isPitcher;
    if (group === 'rotation') return rotationIds.has(player.id);
    return bullpenIds.has(player.id);
  };
  return input.caps.map((cap) => {
    const groupWord = cap.group === 'hitters' ? 'HITTERS' : cap.group === 'rotation' ? 'STARTERS' : 'BULLPEN ARMS';
    const core = players
      .filter((candidate) => inGroup(candidate.construction, cap.group))
      .sort((left, right) => rating(right.construction, cap.stat) - rating(left.construction, cap.stat) || left.id.localeCompare(right.id))
      .slice(0, cap.topN);
    return {
      key: `${cap.group}:${cap.stat}`,
      label: `YOUR TOP ${cap.topN} ${groupWord} BY ${statWord(cap.stat)}`,
      playerNames: core.map((candidate) => candidate.name),
    };
  });
}
