import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import type { LuxuryCapRow } from '../../../../../data/tierParams';
import type { ConstructionPlayer } from '../../../../../engines/leagueConstruction';
import type { SnakeRiskRead } from '../../../../../engines/snakeRationalRoom';
import {
  SNAKE_BOARD_SLOT_IDS,
  type SnakeBoardSlotId,
  type SnakeSeatBoardRecord,
} from '../../../../../utils/leagueBuilderStorage';

export interface DeskCandidate {
  id: string;
  name: string;
  position: TaxonomyPosition;
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

function eligibleForSlot(slotId: SnakeBoardSlotId, candidate: DeskCandidate): boolean {
  if (slotId === 'BACKUP_C') return candidate.position === 'C';
  if (slotId.startsWith('SP')) return candidate.position === 'SP' || candidate.position === 'SP/RP';
  if (slotId.startsWith('RP')) return candidate.position === 'RP' || candidate.position === 'SP/RP';
  if (slotId === 'SWING') return candidate.position === 'SP/RP';
  if (slotId.startsWith('FLEX')) return true;
  return candidate.position === slotId;
}

export function isCandidateEligibleForBoardSlot(slotId: SnakeBoardSlotId, candidate: DeskCandidate): boolean {
  return eligibleForSlot(slotId, candidate);
}

export function seedPositionalRankings(
  candidates: readonly DeskCandidate[],
): Partial<Record<TaxonomyPosition, string[]>> {
  return Object.fromEntries(POSITION_ORDER.map((position) => [
    position,
    sortedByAdvisorWorth(candidates.filter((candidate) => candidate.position === position)).map((candidate) => candidate.id),
  ]));
}

/** Advisor seed only. This creates no recommendation/search API; the GM confirms it in the UI. */
export function buildSeededSeatBoard(candidates: readonly DeskCandidate[]): {
  board: SnakeSeatBoardRecord | null;
  brokenSlots: SnakeBoardSlotId[];
} {
  const rankings = seedPositionalRankings(candidates);
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const used = new Set<string>();
  const slots = {} as Record<SnakeBoardSlotId, string>;
  const brokenSlots: SnakeBoardSlotId[] = [];

  for (const slotId of SNAKE_BOARD_SLOT_IDS) {
    const ranked = sortedByAdvisorWorth(candidates.filter((candidate) => eligibleForSlot(slotId, candidate)))
      .map((candidate) => candidate.id);
    const playerId = ranked.find((id) => !used.has(id) && byId.has(id));
    if (!playerId) {
      brokenSlots.push(slotId);
      continue;
    }
    slots[slotId] = playerId;
    used.add(playerId);
  }

  if (brokenSlots.length > 0) return { board: null, brokenSlots };
  return {
    board: {
      slots,
      rankings: {
        byPosition: rankings,
        global: sortedByAdvisorWorth(candidates).map((candidate) => candidate.id),
        frozenPlayerIds: [],
      },
      revision: 0,
    },
    brokenSlots: [],
  };
}

function backfillPosition(
  slotId: SnakeBoardSlotId,
  gonePlayerId: string,
  byId: ReadonlyMap<string, DeskCandidate>,
): TaxonomyPosition | null {
  return byId.get(gonePlayerId)?.position ?? boardSlotPosition(slotId) ?? null;
}

function rankedBackfillIds(input: {
  slotId: SnakeBoardSlotId;
  board: SnakeSeatBoardRecord;
  candidates: readonly DeskCandidate[];
}): string[] {
  const eligibleIds = new Set(input.candidates.filter((candidate) => eligibleForSlot(input.slotId, candidate)).map((candidate) => candidate.id));
  const position = backfillPosition(input.slotId, input.board.slots[input.slotId], new Map(input.candidates.map((candidate) => [candidate.id, candidate])));
  const ownPositionOrder = position ? input.board.rankings.byPosition?.[position] ?? [] : [];
  return [...new Set([
    ...ownPositionOrder.filter((id) => eligibleIds.has(id)),
    ...(input.board.rankings.global ?? []).filter((id) => eligibleIds.has(id)),
  ])];
}

/** Frozen-touch law: only the unavailable slot changes; rankings and every survivor stay byte-stable. */
export function reconcileBoardAvailability(input: {
  board: SnakeSeatBoardRecord;
  candidates: readonly DeskCandidate[];
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

function belongs(player: ConstructionPlayer, group: LuxuryCapRow['group']): boolean {
  if (group === 'hitters') return !player.isPitcher;
  if (group === 'rotation') return player.isPitcher && (player.role === 'SP' || player.role === 'SP/RP');
  return player.isPitcher && (player.role === 'RP' || player.role === 'CP' || player.role === 'SP/RP');
}

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
  return input.caps.map((cap) => {
    const groupWord = cap.group === 'hitters' ? 'HITTERS' : cap.group === 'rotation' ? 'STARTERS' : 'BULLPEN ARMS';
    const core = players
      .filter((candidate) => belongs(candidate.construction, cap.group))
      .sort((left, right) => rating(right.construction, cap.stat) - rating(left.construction, cap.stat) || left.id.localeCompare(right.id))
      .slice(0, cap.topN);
    return {
      key: `${cap.group}:${cap.stat}`,
      label: `YOUR TOP ${cap.topN} ${groupWord} BY ${statWord(cap.stat)}`,
      playerNames: core.map((candidate) => candidate.name),
    };
  });
}
