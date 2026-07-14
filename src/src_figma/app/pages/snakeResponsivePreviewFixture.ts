import type { TaxonomyPosition } from '../../../data/playerArchetypeTaxonomy';
import type { SnakePlanBill } from '../../../engines/snakeEconomics';
import {
  SNAKE_BOARD_SLOT_IDS,
  type Player,
  type SnakeBoardSlotId,
  type SnakeSeatBoardRecord,
} from '../../../utils/leagueBuilderStorage';
import type { SnakeRoomTeam } from '../components/snake/SnakeDraftRoomView';
import {
  buildChemistryStrip,
  buildPlanLedger,
  type ChemistryStripRow,
} from '../components/snake/desk/draftTruthModel';
import {
  buildSeededSeatBoard,
  reconcileBoardAvailability,
  refitBoardSlots,
  reorderSeatBoardRankings,
  type DeskCandidate,
} from '../components/snake/desk/deskModel';
import type { SnakeAssistantBoardState } from '../components/snake/desk/useSnakeAssistantBoard';
import type { SelectedPlayerConsequence } from '../components/snake/desk/snakeDeskIntelligenceModel';

export const PREVIEW_TEAMS: readonly SnakeRoomTeam[] = [
  { id: 'bew', name: 'Beewolves', abbreviation: 'BEW', colors: { primary: '#1f6b45', secondary: '#f4d35e', accent: '#16281f' } },
  { id: 'buz', name: 'Buzzards', abbreviation: 'BUZ', colors: { primary: '#7a341e', secondary: '#f2c14e', accent: '#28160f' } },
];

type PreviewSeed = {
  id: string;
  name: string;
  position: TaxonomyPosition;
  eligiblePositions?: readonly TaxonomyPosition[];
  worth: number;
  fit?: 'STRONG FIT' | 'NEUTRAL FIT' | 'WEAK FIT';
  gender?: 'M' | 'F';
};

const seeds: readonly PreviewSeed[] = [
  { id: 'jovita', name: 'JOVITA PULO', position: 'SP', eligiblePositions: ['SP', 'SP/RP'], worth: 120_000, fit: 'STRONG FIT', gender: 'F' },
  { id: 'slugger', name: 'SAM SLUGGER', position: '1B', worth: 119_000, fit: 'NEUTRAL FIT' },
  { id: 'catcher', name: 'MAX BACKSTOP', position: 'C', worth: 118_000, fit: 'WEAK FIT' },
  { id: 'core-c', name: 'CASEY RECEIVER', position: 'C', worth: 110_000 },
  { id: 'backup-c', name: 'BLAKE BACKSTOP', position: 'C', worth: 96_000 },
  { id: 'core-1b', name: 'IAN CORNER', position: '1B', worth: 108_000 },
  { id: 'core-2b', name: 'MASON DOUBLE', position: '2B', worth: 107_000 },
  { id: 'core-3b', name: 'TORI CORNER', position: '3B', worth: 106_000, gender: 'F' },
  { id: 'core-ss', name: 'ELLA GLOVE', position: 'SS', worth: 105_000, gender: 'F' },
  { id: 'core-lf', name: 'LEO LINER', position: 'LF', worth: 104_000 },
  { id: 'core-cf', name: 'NOVA CENTER', position: 'CF', worth: 103_000, gender: 'F' },
  { id: 'core-rf', name: 'RILEY ARM', position: 'RF', worth: 102_000 },
  { id: 'flex-a', name: 'DREW UTILITY', position: '2B', eligiblePositions: ['2B', 'SS'], worth: 94_000 },
  { id: 'flex-b', name: 'MORGAN GAPS', position: 'LF', eligiblePositions: ['LF', 'CF'], worth: 93_000, gender: 'F' },
  { id: 'flex-c', name: 'PARKER GLOVE', position: '3B', eligiblePositions: ['3B', '1B'], worth: 92_000 },
  { id: 'flex-d', name: 'ROBIN ARM', position: 'RF', eligiblePositions: ['RF', 'CF'], worth: 91_000, gender: 'F' },
  { id: 'sp-2', name: 'EVAN STARTER', position: 'SP', worth: 109_000 },
  { id: 'sp-3', name: 'MIA HEAT', position: 'SP', worth: 101_000, gender: 'F' },
  { id: 'sp-4', name: 'OWEN CURVE', position: 'SP', worth: 100_000 },
  { id: 'sp-5', name: 'PRIYA CHANGE', position: 'SP', worth: 99_000, gender: 'F' },
  { id: 'rp-1', name: 'REMY BRIDGE', position: 'RP', worth: 98_000 },
  { id: 'rp-2', name: 'SAGE RELIEF', position: 'RP', worth: 97_000, gender: 'F' },
  { id: 'rp-3', name: 'TONY FIREMAN', position: 'RP', worth: 95_000 },
  { id: 'cp-1', name: 'CORA CLOSER', position: 'CP', worth: 90_000, gender: 'F' },
  { id: 'swing-1', name: 'SKYLER SWING', position: 'SP/RP', eligiblePositions: ['SP/RP', 'SP', 'RP'], worth: 89_000 },
  { id: 'taylor', name: 'TAYLOR UTILITY', position: '1B', eligiblePositions: ['1B', 'LF'], worth: 58_000, fit: 'STRONG FIT', gender: 'F' },
  { id: 'quinn', name: 'QUINN VERSATILE', position: 'RF', eligiblePositions: ['RF', 'CF'], worth: 57_000, fit: 'STRONG FIT' },
  { id: 'nora', name: 'NORA CURVEBALL', position: 'SP', worth: 56_000, fit: 'STRONG FIT', gender: 'F' },
  { id: 'closer-2', name: 'CAM STOPPER', position: 'CP', worth: 55_000 },
  { id: 'reserve-c1', name: 'JORDAN MITT', position: 'C', worth: 54_000 },
  { id: 'reserve-c2', name: 'DANA MASK', position: 'C', worth: 53_000, gender: 'F' },
  { id: 'reserve-sp', name: 'ARI ROTATION', position: 'SP', worth: 52_000 },
  { id: 'reserve-rp', name: 'KAI RELIEF', position: 'RP', worth: 51_000 },
  { id: 'reserve-cp', name: 'ZOE NINTH', position: 'CP', worth: 50_000, gender: 'F' },
  { id: 'reserve-flex', name: 'DEVON EVERYWHERE', position: '2B', eligiblePositions: ['2B', 'SS'], worth: 49_000 },
  { id: 'reserve-ss', name: 'HARPER SHORT', position: 'SS', worth: 48_500, gender: 'F' },
  { id: 'reserve-of', name: 'AVERY OUTFIELD', position: 'LF', eligiblePositions: ['LF', 'CF', 'RF'], worth: 48_000, gender: 'F' },
  { id: 'reserve-corner', name: 'MICAH CORNER', position: '3B', eligiblePositions: ['3B', '1B'], worth: 47_000 },
];

const personalities = ['Competitive', 'Tough', 'Relaxed', 'Egotistical', 'Jolly', 'Timid', 'Droopy'] as const;
const chemistries = ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined'] as const;

function candidateFromSeed(seed: PreviewSeed, index: number): DeskCandidate {
  const isPitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(seed.position);
  const pitcherRole = isPitcher ? seed.position as 'SP' | 'SP/RP' | 'RP' | 'CP' : undefined;
  const iv = 44_000 + index * 1_750;
  const marginalTax = seed.fit === 'WEAK FIT' ? 9_000 : seed.fit === 'STRONG FIT' ? -2_000 : 2_500;
  const eligiblePositions = seed.eligiblePositions ?? [seed.position];
  return {
    id: seed.id,
    name: seed.name,
    position: seed.position,
    eligiblePositions,
    rosterShape: {
      isPitcher,
      position: seed.position,
      role: pitcherRole,
      secondaryPosition: isPitcher ? null : eligiblePositions.find((position) => position !== seed.position) ?? null,
    },
    identityChips: [isPitcher ? 'PITCHER' : 'BAT', chemistries[index % chemistries.length].toUpperCase()],
    advisorWorth: seed.worth,
    iv,
    marginalTax,
    trueCost: iv + marginalTax,
    archetypeChip: 'BALANCED',
    fitWord: seed.fit ?? 'NEUTRAL FIT',
    risk: index % 3 === 0 ? 'AT_RISK' : index % 3 === 1 ? 'SAFE_TO_WAIT' : 'LIKELY_GONE',
    hasNextPick: true,
    legalFinishLine: `AFTER THIS PICK AND A LEGAL FINISH: $${Math.max(0, 260_000 - index * 2_000).toLocaleString()} LEFT.`,
    construction: {
      id: seed.id,
      isPitcher,
      role: pitcherRole,
      bat: {
        POW: isPitcher ? 8 : 60 + index % 28,
        CON: isPitcher ? 12 : 58 + index % 30,
        SPD: isPitcher ? 20 : 45 + index % 38,
        FLD: 61 + index % 31,
        ARM: 63 + index % 29,
      },
      pit: {
        VEL: isPitcher ? 72 + index % 24 : 0,
        JNK: isPitcher ? 69 + index % 27 : 0,
        ACC: isPitcher ? 68 + index % 25 : 0,
      },
    },
  };
}

function playerFromSeed(seed: PreviewSeed, index: number): Player {
  const candidate = candidateFromSeed(seed, index);
  const [firstName, ...rest] = seed.name.split(' ');
  const isPitcher = candidate.construction.isPitcher;
  return {
    id: seed.id,
    firstName: firstName[0] + firstName.slice(1).toLocaleLowerCase(),
    lastName: rest.join(' ')[0] + rest.join(' ').slice(1).toLocaleLowerCase(),
    gender: seed.gender ?? 'M',
    age: 22 + index % 12,
    bats: index % 3 === 0 ? 'L' : 'R',
    throws: index % 4 === 0 ? 'L' : 'R',
    primaryPosition: seed.position,
    secondaryPosition: seed.eligiblePositions?.find((position) => position !== seed.position),
    power: candidate.construction.bat.POW,
    contact: candidate.construction.bat.CON,
    speed: candidate.construction.bat.SPD,
    fielding: candidate.construction.bat.FLD,
    arm: candidate.construction.bat.ARM,
    velocity: candidate.construction.pit?.VEL ?? 0,
    junk: candidate.construction.pit?.JNK ?? 0,
    accuracy: candidate.construction.pit?.ACC ?? 0,
    arsenal: isPitcher ? ['4F', 'SL', 'CH'] : [],
    overallGrade: index < 3 ? 'A-' : index < 16 ? 'B+' : 'B',
    personality: personalities[index % personalities.length],
    chemistry: chemistries[index % chemistries.length],
    trait1: isPitcher ? 'Workhorse' : 'Tough Out',
    trait2: index % 2 === 0 ? 'Volatile' : 'Clutch',
    playerArchetype: isPitcher ? 'Effectively-Wild' : 'Contact Specialist',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: candidate.iv,
    leagueAssignments: [],
    createdDate: '2026-07-14',
    lastModified: '2026-07-14',
    isCustom: true,
  } as Player;
}

export const PREVIEW_CANDIDATES: readonly DeskCandidate[] = seeds.map(candidateFromSeed);
export const PREVIEW_PLAYERS: Readonly<Record<string, Player>> = Object.fromEntries(
  seeds.map((seed, index) => [seed.id, playerFromSeed(seed, index)]),
);

const candidateById = new Map(PREVIEW_CANDIDATES.map((candidate) => [candidate.id, candidate]));

export function previewCandidates(unavailablePlayerIds: ReadonlySet<string> = new Set()): DeskCandidate[] {
  return PREVIEW_CANDIDATES.map((candidate) => ({
    ...candidate,
    drafted: unavailablePlayerIds.has(candidate.id),
  }));
}

export function createPreviewBoard(unavailablePlayerIds: ReadonlySet<string> = new Set()): SnakeSeatBoardRecord {
  const seeded = buildSeededSeatBoard(PREVIEW_CANDIDATES);
  if (!seeded.board) throw new Error(`Preview board fixture is illegal: ${seeded.brokenSlots.join(', ')}`);
  if (unavailablePlayerIds.size === 0) return structuredClone(seeded.board);
  const refit = refitBoardSlots({
    rankings: seeded.board.rankings,
    candidates: PREVIEW_CANDIDATES,
    unavailablePlayerIds,
  });
  if (refit.brokenSlots.length > 0 || refit.invalidRoster) {
    throw new Error(`Preview board fixture cannot exclude drafted players: ${refit.brokenSlots.join(', ') || 'INVALID ROSTER'}`);
  }
  return {
    ...structuredClone(seeded.board),
    slots: refit.slots as Record<SnakeBoardSlotId, string>,
  };
}

export function reorderPreviewBoard(
  board: SnakeSeatBoardRecord,
  view: 'OVERALL' | TaxonomyPosition,
  orderedIds: readonly string[],
  unavailablePlayerIds: ReadonlySet<string> = new Set(),
): SnakeSeatBoardRecord {
  const result = reorderSeatBoardRankings({
    board,
    view,
    orderedIds,
    candidates: PREVIEW_CANDIDATES,
    unavailablePlayerIds,
  });
  if (!result.board) throw new Error(`Preview refit failed: ${result.brokenSlots.join(', ') || 'INVALID ROSTER'}`);
  return result.board;
}

export function reconcilePreviewBoardAvailability(
  board: SnakeSeatBoardRecord,
  unavailablePlayerIds: ReadonlySet<string>,
): SnakeSeatBoardRecord {
  const result = reconcileBoardAvailability({
    board,
    candidates: PREVIEW_CANDIDATES,
    unavailablePlayerIds,
  });
  if (result.brokenSlots.length > 0) {
    throw new Error(`Preview availability refit failed: ${result.brokenSlots.join(', ')}`);
  }
  return result.board;
}

function billForPlayerIds(playerIds: readonly string[]): SnakePlanBill {
  const planCost = playerIds.reduce((sum, id) => sum + (candidateById.get(id)?.iv ?? 0), 0);
  const planTax = Math.max(0, playerIds.reduce((sum, id) => sum + (candidateById.get(id)?.marginalTax ?? 0), 0));
  return {
    planCost,
    planTax,
    planCushion: 1_650_000 - planCost - planTax,
    playerIds: [...playerIds],
  };
}

export function previewBoardPlayerIds(board: SnakeSeatBoardRecord): string[] {
  return SNAKE_BOARD_SLOT_IDS.map((slotId) => board.slots[slotId]);
}

export function previewPlanBill(board: SnakeSeatBoardRecord): SnakePlanBill {
  return billForPlayerIds(previewBoardPlayerIds(board));
}

export function previewRosterTruth(playerIds: readonly string[]) {
  const bill = billForPlayerIds(playerIds);
  return {
    ledger: buildPlanLedger(bill),
    chemistry: previewChemistry(playerIds),
  };
}

export function previewChemistry(playerIds: readonly string[]): ChemistryStripRow[] {
  return buildChemistryStrip(playerIds.flatMap((id) => PREVIEW_PLAYERS[id] ?? []));
}

function moveToFront(ids: readonly string[], promoted: readonly string[]): string[] {
  const promotedSet = new Set(promoted);
  return [...promoted.filter((id) => ids.includes(id)), ...ids.filter((id) => !promotedSet.has(id))];
}

export function previewAssistantBoard(
  teamId: string,
  selectedPinId?: string | null,
  unavailablePlayerIds: ReadonlySet<string> = new Set(),
): SnakeAssistantBoardState {
  const base = createPreviewBoard(unavailablePlayerIds);
  const rankings: SnakeSeatBoardRecord['rankings'] = {
    ...base.rankings,
    global: moveToFront(base.rankings.global ?? [], [selectedPinId ?? '', 'quinn', 'taylor', 'nora']),
    byPosition: {
      ...base.rankings.byPosition,
      SP: moveToFront(base.rankings.byPosition?.SP ?? [], [selectedPinId ?? '', 'nora']),
      RF: moveToFront(base.rankings.byPosition?.RF ?? [], [selectedPinId ?? '', 'quinn']),
      CF: moveToFront(base.rankings.byPosition?.CF ?? [], [selectedPinId ?? '', 'quinn']),
      '1B': moveToFront(base.rankings.byPosition?.['1B'] ?? [], [selectedPinId ?? '', 'taylor']),
    },
  };
  const refit = refitBoardSlots({ rankings, candidates: PREVIEW_CANDIDATES, unavailablePlayerIds });
  if (refit.brokenSlots.length > 0 || refit.invalidRoster) {
    return { status: 'unavailable', board: null, infeasibleReason: 'ILLEGAL_BOARD' };
  }
  const slots = refit.slots as Record<SnakeBoardSlotId, string>;
  const playerIds = SNAKE_BOARD_SLOT_IDS.map((slotId) => slots[slotId]);
  const bill = billForPlayerIds(playerIds);
  return {
    status: 'ready',
    infeasibleReason: null,
    board: {
      kind: 'snake-assistant-board',
      teamId,
      slots: SNAKE_BOARD_SLOT_IDS.map((slotId) => ({ slotId, playerId: slots[slotId], pinned: slots[slotId] === selectedPinId })),
      playerIds,
      recommendationOrder: rankings.global ?? [],
      ledger: buildPlanLedger(bill),
      chemistry: previewChemistry(playerIds),
    },
  };
}

function promoteCandidateRankings(
  board: SnakeSeatBoardRecord,
  candidate: DeskCandidate,
): SnakeSeatBoardRecord['rankings'] {
  const eligible = candidate.eligiblePositions ?? [candidate.position];
  return {
    ...board.rankings,
    global: moveToFront(board.rankings.global ?? [], [candidate.id]),
    byPosition: Object.fromEntries(Object.entries(board.rankings.byPosition ?? {}).map(([position, ids]) => [
      position,
      eligible.includes(position as TaxonomyPosition) ? moveToFront(ids ?? [], [candidate.id]) : [...(ids ?? [])],
    ])),
    frozenPlayerIds: [...new Set([...(board.rankings.frozenPlayerIds ?? []), candidate.id])],
  };
}

export function previewSelectedConsequence(input: {
  board: SnakeSeatBoardRecord;
  selectedPlayerId: string;
  teamId: string;
  privateEpoch: number;
  unavailablePlayerIds?: ReadonlySet<string>;
}): SelectedPlayerConsequence {
  const playerIds = previewBoardPlayerIds(input.board);
  const unavailablePlayerIds = input.unavailablePlayerIds ?? new Set<string>();
  if (unavailablePlayerIds.has(input.selectedPlayerId)) {
    return { status: 'unavailable', selectedPlayerId: input.selectedPlayerId };
  }
  if (playerIds.includes(input.selectedPlayerId)) {
    return { status: 'already-on-board', selectedPlayerId: input.selectedPlayerId };
  }
  const candidate = candidateById.get(input.selectedPlayerId);
  if (!candidate) return { status: 'unavailable', selectedPlayerId: input.selectedPlayerId };
  const rankings = promoteCandidateRankings(input.board, candidate);
  const refit = refitBoardSlots({ rankings, candidates: PREVIEW_CANDIDATES, unavailablePlayerIds });
  if (refit.brokenSlots.length > 0 || refit.invalidRoster) {
    return { status: 'unavailable', selectedPlayerId: input.selectedPlayerId };
  }
  const slots = refit.slots as Record<SnakeBoardSlotId, string>;
  const afterBoard: SnakeSeatBoardRecord = {
    ...structuredClone(input.board),
    rankings,
    slots,
    revision: input.board.revision + 1,
  };
  const afterPlayerIds = previewBoardPlayerIds(afterBoard);
  if (!afterPlayerIds.includes(input.selectedPlayerId)) {
    return { status: 'unavailable', selectedPlayerId: input.selectedPlayerId };
  }
  const removedIds = playerIds.filter((playerId) => !afterPlayerIds.includes(playerId));
  if (removedIds.length !== 1) {
    return { status: 'unavailable', selectedPlayerId: input.selectedPlayerId };
  }
  const displacedPlayerId = removedIds[0];
  const displacedSlotId = SNAKE_BOARD_SLOT_IDS.find((slotId) => input.board.slots[slotId] === displacedPlayerId);
  if (!displacedSlotId) return { status: 'unavailable', selectedPlayerId: input.selectedPlayerId };
  const displaced = candidateById.get(displacedPlayerId);
  const reassignedSlotIds = SNAKE_BOARD_SLOT_IDS.filter((slotId) => afterBoard.slots[slotId] !== input.board.slots[slotId]);
  if (reassignedSlotIds.length === 0) return { status: 'unavailable', selectedPlayerId: input.selectedPlayerId };
  const beforeBill = billForPlayerIds(playerIds);
  const afterBill = billForPlayerIds(afterPlayerIds);
  return {
    status: 'ready',
    identity: {
      sessionId: 'responsive-session',
      sessionRevision: 7,
      teamId: input.teamId,
      seatId: input.teamId,
      deviceId: 'responsive-device',
      privateEpoch: input.privateEpoch,
      boardRevision: input.board.revision,
    },
    selectedPlayerId: input.selectedPlayerId,
    displacedPlayerId,
    displacedPlayerName: displaced?.name ?? 'UNKNOWN PLAYER',
    displacedSlotId,
    reassignedSlotIds,
    board: afterBoard,
    before: {
      ledger: buildPlanLedger(beforeBill),
      chemistry: previewChemistry(playerIds),
      legalFinish: { feasible: true, moneyLeft: beforeBill.planCushion },
      fitWord: displaced?.fitWord ?? 'NEUTRAL FIT',
    },
    after: {
      ledger: buildPlanLedger(afterBill),
      chemistry: previewChemistry(afterPlayerIds),
      legalFinish: { feasible: true, moneyLeft: afterBill.planCushion },
      fitWord: candidate.fitWord,
    },
  };
}
