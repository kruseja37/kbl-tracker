import { useMemo, useReducer, useState, type ReactNode } from 'react';

import type { TaxonomyPosition } from '../../../data/playerArchetypeTaxonomy';
import type { PickValue } from '../../../engines/leagueConstruction';
import type { SimultaneousSnakeSeatingInput } from '../../../engines/snakeSeatingProof';
import type { SnakeGuidePackage } from '../../../engines/snakeGuideTrade';
import {
  SNAKE_BOARD_SLOT_IDS,
  type LeagueBuilderMlbDraftSession,
  type SnakeOpenTradeOffer,
  type SnakeSeatBoardRecord,
} from '../../../utils/leagueBuilderStorage';
import { SnakeDraftRoomView } from '../components/snake/SnakeDraftRoomView';
import { CompanionCoveredScreen, SnakeCompanionFrame } from '../components/snake/companion/SnakeCompanionFrame';
import { DraftTruthStrip } from '../components/snake/desk/DraftTruthStrip';
import { PrivateDesk } from '../components/snake/desk/PrivateDesk';
import { SelectedPlayerCard } from '../components/snake/desk/SelectedPlayerCard';
import { SnakeCommissionerTrade } from '../components/snake/trade/SnakeCommissionerTrade';
import { SnakeTradeGuide } from '../components/snake/trade/SnakeTradeGuide';
import {
  executeAskedPickTrade,
  guideForAskedPick,
  type AskedPickGuideResult,
  type ExecutedAskedPickTrade,
} from '../components/snake/trade/tradeGuideModel';
import {
  PREVIEW_CANDIDATES,
  PREVIEW_PLAYERS,
  PREVIEW_TEAMS,
  createPreviewBoard,
  previewCandidates,
  previewAssistantBoard,
  previewBoardPlayerIds,
  previewChemistry,
  previewPlanBill,
  previewRosterTruth,
  previewSelectedConsequence,
  reconcilePreviewBoardAvailability,
  reorderPreviewBoard,
} from './snakeResponsivePreviewFixture';

const PREVIEW_PICK_VALUE_CHART: readonly PickValue[] = Array.from({ length: 44 }, (_, index) => {
  const pick = index + 1;
  const value = pick <= 19
    ? 130 + (19 - pick) * 10
    : pick <= 24
      ? 130 - (pick - 19) * 2
      : pick <= 36
        ? 120 - Math.round(((pick - 24) * 50) / 12)
        : pick <= 41
          ? 70 - (pick - 36) * 4
          : 50 - (pick - 41) * 2;
  return { pick, value };
});

const initialOwnedPicks: Readonly<Record<string, readonly number[]>> = {
  bew: [20, 21, 24, 36],
  buz: [19, 22, 23, 41],
};

const BASE_ORDER = [
  { pick: 19, teamId: 'buz' },
  { pick: 20, teamId: 'bew' },
  { pick: 21, teamId: 'bew', endpoint: true },
  { pick: 22, teamId: 'buz' },
  { pick: 23, teamId: 'buz', endpoint: true },
  { pick: 24, teamId: 'bew' },
] as const;

const previewGuideCompletionIds = previewBoardPlayerIds(createPreviewBoard());
function previewGuideLegalRoster(teamId: string) {
  return previewGuideCompletionIds.map((playerId) => {
    const candidate = PREVIEW_CANDIDATES.find((row) => row.id === playerId);
    if (!candidate?.rosterShape) throw new Error(`Preview guide player ${playerId} has no roster shape.`);
    const copyId = `guide-${teamId}-${playerId}`;
    return {
      playerId: copyId,
      sourceId: copyId,
      versionGroupId: copyId,
      price: candidate.iv,
      shape: candidate.rosterShape,
      construction: { ...candidate.construction, id: copyId },
    };
  });
}

const PREVIEW_GUIDE_SEATING_INPUT: SimultaneousSnakeSeatingInput = {
  clubs: PREVIEW_TEAMS.map((team) => {
    const roster = previewGuideLegalRoster(team.id);
    return {
      teamId: team.id,
      roster,
      budgetRemaining: 10_000_000,
      committedConstruction: roster.map((player) => player.construction),
    };
  }),
  pool: [],
  baseCaps: [],
  realTeamCount: PREVIEW_TEAMS.length,
};

function previewGuideSession(
  ownedPicks: Readonly<Record<string, readonly number[]>>,
  currentPickIndex = 0,
): LeagueBuilderMlbDraftSession {
  const ownerByPick = new Map<number, string>();
  for (const [teamId, picks] of Object.entries(ownedPicks)) {
    for (const pick of picks) ownerByPick.set(pick, teamId);
  }
  return {
    id: 'snake-responsive-preview-guide',
    leagueId: 'snake-responsive-preview',
    seasonNumber: 1,
    seed: 'snake-responsive-preview-guide',
    workflowVersion: 'snake-v1',
    engineMethodVersion: 'snake-guide-preview-v1',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: 22,
    draftPhase: 'MLB',
    pickOrder: [...ownerByPick.entries()]
      .sort(([left], [right]) => left - right)
      .map(([pick, teamId]) => ({ round: Math.ceil(pick / PREVIEW_TEAMS.length), pick, teamId })),
    completedPicks: [],
    currentPickIndex,
    revision: 7,
    createdDate: '2026-07-14T12:00:00.000Z',
    lastModified: '2026-07-14T12:00:00.000Z',
  };
}

function previewGuideForAskedPick(input: {
  ownedPicks: Readonly<Record<string, readonly number[]>>;
  buyerTeamId: string;
  targetPick: number;
  currentPickIndex?: number;
}): AskedPickGuideResult {
  return guideForAskedPick({
    session: previewGuideSession(input.ownedPicks, input.currentPickIndex),
    pickValueChart: PREVIEW_PICK_VALUE_CHART,
    seatingProofInput: PREVIEW_GUIDE_SEATING_INPUT,
    buyerTeamId: input.buyerTeamId,
    targetPick: input.targetPick,
  });
}

function previewTradeNudge(input: {
  ownedPicks: Readonly<Record<string, readonly number[]>>;
  order: PreviewDraftState['order'];
  currentPickIndex: number;
  buyerTeamId: string;
}): SnakeGuidePackage | null {
  for (const slot of input.order.slice(input.currentPickIndex)) {
    if (slot.teamId === input.buyerTeamId) continue;
    const answer = previewGuideForAskedPick({
      ownedPicks: input.ownedPicks,
      buyerTeamId: input.buyerTeamId,
      targetPick: slot.pick,
      currentPickIndex: input.currentPickIndex,
    });
    if (answer.proposal) return answer.proposal;
  }
  return null;
}

const initialGuideAnswer = previewGuideForAskedPick({
  ownedPicks: initialOwnedPicks,
  buyerTeamId: 'bew',
  targetPick: 19,
});
if (!initialGuideAnswer.proposal) {
  throw new Error('The Snake responsive preview requires one engine-verified opening trade.');
}
const proposal: SnakeGuidePackage = initialGuideAnswer.proposal;

const initialOffer: SnakeOpenTradeOffer = {
  id: 'responsive-offer',
  phase: 'MLB',
  buyerTeamId: proposal.buyerTeamId,
  sellerTeamId: proposal.sellerTeamId,
  targetPick: proposal.targetPick,
  offerPickNumbers: [...proposal.offerPickNumbers],
  receivePickNumbers: [...proposal.receivePickNumbers],
  offerValue: proposal.offerValue,
  receiveValue: proposal.receiveValue,
  sellerPremium: proposal.sellerPremium,
  postedSessionRevision: proposal.sessionRevision,
  buyerNod: false,
  sellerNod: false,
  postedAt: '2026-07-14T12:00:00.000Z',
};

type PreviewRosterEntry = { id: string; name: string; position: string };
type PreviewRecordedPick = PreviewRosterEntry & { pick: number; teamId: string };
type PreviewKeepTransaction = {
  playerId: string;
  beforeBoard: SnakeSeatBoardRecord;
  afterBoardRevision: number;
};

type PreviewDraftState = {
  activeSeatId: string;
  privateEpoch: number;
  selectedByTeam: Record<string, string>;
  boards: Record<string, SnakeSeatBoardRecord>;
  lastKeeps: Record<string, PreviewKeepTransaction | null>;
  assistantPins: Record<string, string | null>;
  assistantOptimizeRevisions: Record<string, number>;
  tradePrefillKey: string | null;
  offers: SnakeOpenTradeOffer[];
  ownedPicks: Readonly<Record<string, readonly number[]>>;
  tradeRevision: number;
  tradeReceipts: Record<string, string>;
  order: Array<{ pick: number; teamId: string; endpoint?: boolean }>;
  rosters: Record<string, PreviewRosterEntry[]>;
  recordedPicks: PreviewRecordedPick[];
  currentPickIndex: number;
  recap: boolean;
};

type PreviewDraftAction =
  | { type: 'SWITCH_TEAM'; teamId: string }
  | { type: 'SELECT_PLAYER'; teamId: string; playerId: string }
  | { type: 'REORDER'; teamId: string; view: 'OVERALL' | TaxonomyPosition; orderedIds: readonly string[] }
  | { type: 'KEEP_SELECTED'; teamId: string }
  | { type: 'REVERT_KEEP'; teamId: string; playerId: string }
  | { type: 'OPTIMIZE'; teamId: string; playerId: string }
  | { type: 'TRADE_PREFILL'; key: string | null }
  | { type: 'POST_OFFER'; proposal: SnakeGuidePackage }
  | { type: 'NOD_OFFER'; offerId: string; teamId: string }
  | { type: 'CLOSE_OFFER'; offerId: string }
  | { type: 'EXECUTE_TRADE'; offerId: string }
  | { type: 'RECORD_PICK'; teamId: string; playerId: string }
  | { type: 'ROTATE_PRIVATE_EPOCH'; teamId: string }
  | { type: 'RESET_PRIVATE' };

function unavailableIds(rosters: Readonly<Record<string, readonly PreviewRosterEntry[]>>): Set<string> {
  return new Set(Object.values(rosters).flatMap((roster) => roster.map((player) => player.id)));
}

function rosterEntry(playerId: string): PreviewRosterEntry {
  const candidate = PREVIEW_CANDIDATES.find((entry) => entry.id === playerId);
  if (!candidate) throw new Error(`Unknown preview player ${playerId}.`);
  return { id: candidate.id, name: candidate.name, position: candidate.position };
}

function createPreviewDraftState(terminal = false): PreviewDraftState {
  const rosters: Record<string, PreviewRosterEntry[]> = {
    bew: [rosterEntry('core-ss')],
    buz: [rosterEntry('core-c')],
  };
  const recordedPicks: PreviewRecordedPick[] = [];
  if (terminal) {
    const terminalPlayerIds = ['slugger', 'catcher', 'jovita', 'taylor', 'nora'];
    terminalPlayerIds.forEach((playerId, index) => {
      const slot = BASE_ORDER[index];
      const player = rosterEntry(playerId);
      rosters[slot.teamId] = [...rosters[slot.teamId], player];
      recordedPicks.push({ ...player, pick: slot.pick, teamId: slot.teamId });
    });
  }
  const unavailable = unavailableIds(rosters);
  const board = createPreviewBoard(unavailable);
  return {
    activeSeatId: terminal ? BASE_ORDER.at(-1)!.teamId : 'bew',
    privateEpoch: 1,
    selectedByTeam: terminal ? { bew: 'quinn', buz: 'reserve-flex' } : { bew: 'jovita', buz: 'catcher' },
    boards: { bew: structuredClone(board), buz: structuredClone(board) },
    lastKeeps: { bew: null, buz: null },
    assistantPins: { bew: null, buz: null },
    assistantOptimizeRevisions: { bew: 0, buz: 0 },
    tradePrefillKey: null,
    offers: terminal ? [] : [structuredClone(initialOffer)],
    ownedPicks: structuredClone(initialOwnedPicks),
    tradeRevision: 0,
    tradeReceipts: {},
    order: BASE_ORDER.map((slot) => ({ ...slot })),
    rosters,
    recordedPicks,
    currentPickIndex: terminal ? BASE_ORDER.length - 1 : 0,
    recap: false,
  };
}

function money(value: number | null): string {
  return value === null ? '—' : `$${Math.round(value).toLocaleString()}`;
}

function transferPicks(
  current: Readonly<Record<string, readonly number[]>>,
  offer: SnakeOpenTradeOffer,
): Record<string, number[]> {
  const offered = new Set(offer.offerPickNumbers);
  const received = new Set(offer.receivePickNumbers);
  return {
    ...Object.fromEntries(Object.entries(current).map(([teamId, picks]) => [teamId, [...picks]])),
    [offer.buyerTeamId]: [
      ...(current[offer.buyerTeamId] ?? []).filter((pick) => !offered.has(pick)),
      ...offer.receivePickNumbers,
    ].sort((left, right) => left - right),
    [offer.sellerTeamId]: [
      ...(current[offer.sellerTeamId] ?? []).filter((pick) => !received.has(pick)),
      ...offer.offerPickNumbers,
    ].sort((left, right) => left - right),
  };
}

function transferOrder(
  order: PreviewDraftState['order'],
  offer: SnakeOpenTradeOffer,
): PreviewDraftState['order'] {
  const buyerPicks = new Set(offer.receivePickNumbers);
  const sellerPicks = new Set(offer.offerPickNumbers);
  return order.map((slot) => buyerPicks.has(slot.pick)
    ? { ...slot, teamId: offer.buyerTeamId }
    : sellerPicks.has(slot.pick)
      ? { ...slot, teamId: offer.sellerTeamId }
      : slot);
}

function nextOwnedLivePick(input: {
  order: PreviewDraftState['order'];
  currentPickIndex: number;
  ownedPicks: Readonly<Record<string, readonly number[]>>;
  teamId: string;
}): number | null {
  const owned = new Set(input.ownedPicks[input.teamId] ?? []);
  return input.order.slice(input.currentPickIndex).find((slot) => (
    slot.teamId === input.teamId && owned.has(slot.pick)
  ))?.pick ?? null;
}

function tradeReceipt(input: {
  gave: readonly number[];
  received: readonly number[];
  nextPick: number | null;
}): string {
  const next = input.nextPick === null ? 'NO PICKS REMAIN.' : `YOUR NEXT PICK: #${input.nextPick}.`;
  return `YOU TRADED PICKS ${input.gave.join('+')} FOR ${input.received.join('+')} — ${next}`;
}

function nodOffer(offers: readonly SnakeOpenTradeOffer[], offerId: string, teamId: string): SnakeOpenTradeOffer[] {
  return offers.map((offer) => offer.id !== offerId ? offer : {
    ...offer,
    buyerNod: offer.buyerNod || teamId === offer.buyerTeamId,
    sellerNod: offer.sellerNod || teamId === offer.sellerTeamId,
  });
}

function nextAvailableSelection(board: SnakeSeatBoardRecord, unavailable: ReadonlySet<string>): string {
  return previewBoardPlayerIds(board).find((playerId) => !unavailable.has(playerId))
    ?? PREVIEW_CANDIDATES.find((candidate) => !unavailable.has(candidate.id))?.id
    ?? '';
}

function neutralPrivateSelection(
  teamId: string,
  rosters: Readonly<Record<string, readonly PreviewRosterEntry[]>>,
): string {
  const unavailable = unavailableIds(rosters);
  const preferred = teamId === 'bew' ? 'jovita' : 'catcher';
  if (!unavailable.has(preferred)) return preferred;
  return PREVIEW_CANDIDATES.find((candidate) => !unavailable.has(candidate.id))?.id ?? '';
}

function previewDraftReducer(state: PreviewDraftState, action: PreviewDraftAction): PreviewDraftState {
  if (action.type === 'RESET_PRIVATE') return createPreviewDraftState(false);
  if (action.type === 'ROTATE_PRIVATE_EPOCH') {
    return {
      ...state,
      selectedByTeam: {
        ...state.selectedByTeam,
        [action.teamId]: neutralPrivateSelection(action.teamId, state.rosters),
      },
      lastKeeps: { ...state.lastKeeps, [action.teamId]: null },
      assistantPins: { ...state.assistantPins, [action.teamId]: null },
      assistantOptimizeRevisions: { ...state.assistantOptimizeRevisions, [action.teamId]: 0 },
      tradePrefillKey: null,
      privateEpoch: state.privateEpoch + 1,
    };
  }
  if (action.type === 'SWITCH_TEAM') {
    if (action.teamId === state.activeSeatId) return state;
    return {
      ...state,
      activeSeatId: action.teamId,
      privateEpoch: state.privateEpoch + 1,
      tradePrefillKey: null,
    };
  }
  if (action.type === 'SELECT_PLAYER') {
    if (unavailableIds(state.rosters).has(action.playerId)) return state;
    return {
      ...state,
      selectedByTeam: { ...state.selectedByTeam, [action.teamId]: action.playerId },
    };
  }
  if (action.type === 'REORDER') {
    const unavailable = unavailableIds(state.rosters);
    const board = reorderPreviewBoard(
      state.boards[action.teamId],
      action.view,
      action.orderedIds,
      unavailable,
    );
    return {
      ...state,
      boards: { ...state.boards, [action.teamId]: board },
      lastKeeps: { ...state.lastKeeps, [action.teamId]: null },
    };
  }
  if (action.type === 'KEEP_SELECTED') {
    const board = state.boards[action.teamId];
    const selectedPlayerId = state.selectedByTeam[action.teamId];
    const consequence = previewSelectedConsequence({
      board,
      selectedPlayerId,
      teamId: action.teamId,
      privateEpoch: state.privateEpoch,
      unavailablePlayerIds: unavailableIds(state.rosters),
    });
    if (consequence.status !== 'ready') return state;
    return {
      ...state,
      boards: { ...state.boards, [action.teamId]: consequence.board },
      lastKeeps: {
        ...state.lastKeeps,
        [action.teamId]: {
          playerId: selectedPlayerId,
          beforeBoard: board,
          afterBoardRevision: consequence.board.revision,
        },
      },
    };
  }
  if (action.type === 'REVERT_KEEP') {
    const transaction = state.lastKeeps[action.teamId];
    const currentBoard = state.boards[action.teamId];
    if (!transaction
      || transaction.playerId !== action.playerId
      || transaction.afterBoardRevision !== currentBoard.revision) return state;
    return {
      ...state,
      boards: { ...state.boards, [action.teamId]: transaction.beforeBoard },
      lastKeeps: { ...state.lastKeeps, [action.teamId]: null },
    };
  }
  if (action.type === 'OPTIMIZE') {
    return {
      ...state,
      assistantPins: { ...state.assistantPins, [action.teamId]: action.playerId },
      assistantOptimizeRevisions: {
        ...state.assistantOptimizeRevisions,
        [action.teamId]: (state.assistantOptimizeRevisions[action.teamId] ?? 0) + 1,
      },
    };
  }
  if (action.type === 'TRADE_PREFILL') return { ...state, tradePrefillKey: action.key };
  if (action.type === 'POST_OFFER') {
    if (state.offers.some((offer) => offer.id === initialOffer.id)) return state;
    return {
      ...state,
      offers: [{ ...initialOffer, ...action.proposal, buyerNod: true, sellerNod: false }],
    };
  }
  if (action.type === 'NOD_OFFER') {
    return { ...state, offers: nodOffer(state.offers, action.offerId, action.teamId) };
  }
  if (action.type === 'CLOSE_OFFER') {
    return { ...state, offers: state.offers.filter((offer) => offer.id !== action.offerId) };
  }
  if (action.type === 'EXECUTE_TRADE') {
    const offer = state.offers.find((entry) => entry.id === action.offerId);
    if (!offer?.buyerNod || !offer.sellerNod) return state;
    const ownedPicks = transferPicks(state.ownedPicks, offer);
    const order = transferOrder(state.order, offer);
    const buyerNextPick = nextOwnedLivePick({ order, currentPickIndex: state.currentPickIndex, ownedPicks, teamId: offer.buyerTeamId });
    const sellerNextPick = nextOwnedLivePick({ order, currentPickIndex: state.currentPickIndex, ownedPicks, teamId: offer.sellerTeamId });
    return {
      ...state,
      offers: state.offers.filter((entry) => entry.id !== offer.id),
      ownedPicks,
      order,
      tradeRevision: state.tradeRevision + 1,
      tradeReceipts: {
        [offer.buyerTeamId]: tradeReceipt({ gave: offer.offerPickNumbers, received: offer.receivePickNumbers, nextPick: buyerNextPick }),
        [offer.sellerTeamId]: tradeReceipt({ gave: offer.receivePickNumbers, received: offer.offerPickNumbers, nextPick: sellerNextPick }),
      },
      tradePrefillKey: null,
      privateEpoch: state.privateEpoch + 1,
    };
  }
  if (action.type === 'RECORD_PICK') {
    const slot = state.order[state.currentPickIndex];
    const unavailableBefore = unavailableIds(state.rosters);
    if (!slot || slot.teamId !== action.teamId || unavailableBefore.has(action.playerId)) return state;
    const player = rosterEntry(action.playerId);
    const rosters = {
      ...state.rosters,
      [slot.teamId]: [...(state.rosters[slot.teamId] ?? []), player],
    };
    const unavailableAfter = unavailableIds(rosters);
    const boards = Object.fromEntries(Object.entries(state.boards).map(([teamId, board]) => [
      teamId,
      reconcilePreviewBoardAvailability(board, unavailableAfter),
    ]));
    const selectedByTeam = Object.fromEntries(Object.entries(state.selectedByTeam).map(([teamId, selected]) => [
      teamId,
      unavailableAfter.has(selected) ? nextAvailableSelection(boards[teamId], unavailableAfter) : selected,
    ]));
    const nextPickIndex = state.currentPickIndex + 1;
    return {
      ...state,
      rosters,
      boards,
      selectedByTeam,
      assistantPins: Object.fromEntries(Object.entries(state.assistantPins).map(([teamId, playerId]) => [
        teamId,
        playerId && unavailableAfter.has(playerId) ? null : playerId,
      ])),
      lastKeeps: { bew: null, buz: null },
      recordedPicks: [...state.recordedPicks, { ...player, pick: slot.pick, teamId: slot.teamId }],
      offers: state.offers.filter((offer) => (
        !offer.offerPickNumbers.includes(slot.pick) && !offer.receivePickNumbers.includes(slot.pick)
      )),
      tradePrefillKey: null,
      currentPickIndex: nextPickIndex,
      recap: nextPickIndex >= state.order.length,
      privateEpoch: state.privateEpoch + 1,
    };
  }
  return state;
}

function PrivateTradeGuide(props: {
  teamId: string;
  ownedPicks: Readonly<Record<string, readonly number[]>>;
  currentPickIndex: number;
  offers: readonly SnakeOpenTradeOffer[];
  showHelp?: boolean;
  prefillKey?: string | null;
  prefillProposal?: SnakeGuidePackage | null;
  onPost: (nextProposal: SnakeGuidePackage) => void;
  onNod: (offerId: string, teamId: string) => void;
  onClose: (offerId: string) => void;
}) {
  const prefillAnswer = props.prefillProposal ? previewGuideForAskedPick({
    ownedPicks: props.ownedPicks,
    buyerTeamId: props.teamId,
    targetPick: props.prefillProposal.targetPick,
    currentPickIndex: props.currentPickIndex,
  }) : null;
  const prefill = props.prefillProposal
    && props.teamId === props.prefillProposal.buyerTeamId
    && props.prefillKey
    && prefillAnswer?.proposal
      ? { key: props.prefillKey, result: { ...prefillAnswer, proposal: prefillAnswer.proposal } }
      : null;
  return <SnakeTradeGuide
    teams={PREVIEW_TEAMS}
    fixedBuyerTeamId={props.teamId}
    pickValueChart={PREVIEW_PICK_VALUE_CHART}
    sessionRevision={7}
    showHelp={props.showHelp}
    prefill={prefill}
    openOffers={props.offers}
    onAsk={(buyerTeamId, targetPick) => previewGuideForAskedPick({
      ownedPicks: props.ownedPicks,
      buyerTeamId,
      targetPick,
      currentPickIndex: props.currentPickIndex,
    })}
    onPost={props.onPost}
    onNod={props.onNod}
    onClose={(offerId) => props.onClose(offerId)}
    privateScopeKey={props.teamId}
  />;
}

function PreviewDesk(props: {
  board: SnakeSeatBoardRecord;
  teamId: string;
  privateEpoch: number;
  selectedPlayerId: string;
  assistantPinId?: string | null;
  assistantOptimizationRevision?: number;
  unavailablePlayerIds: ReadonlySet<string>;
  tradeTargetPick?: number | null;
  tradeGuide: ReactNode;
  tradePrefillKey?: string | null;
  showHelp?: boolean;
  onSelect: (playerId: string) => void;
  onReorder: (view: 'OVERALL' | TaxonomyPosition, orderedIds: readonly string[]) => void;
}) {
  const playerIds = previewBoardPlayerIds(props.board);
  const chemistry = previewChemistry(playerIds);
  const candidates = previewCandidates(props.unavailablePlayerIds);
  return <PrivateDesk
    candidates={candidates}
    rankings={props.board.rankings.byPosition ?? {}}
    overallRankings={props.board.rankings.global ?? []}
    boardSlots={props.board.slots}
    brokenSlots={[]}
    planBill={previewPlanBill(props.board)}
    planChemistry={chemistry}
    draftedChemistry={chemistry}
    advisorLog={props.tradeTargetPick === null || props.tradeTargetPick === undefined ? [] : [{
      key: `trade:${props.tradeTargetPick}`,
      text: `PICK ${props.tradeTargetPick} IS AVAILABLE.`,
      actionable: true,
    }]}
    taxCoreRows={[{ key: 'top', label: 'TOP SALARY', playerNames: playerIds.slice(0, 3).map((id) => PREVIEW_CANDIDATES.find((candidate) => candidate.id === id)?.name ?? 'UNKNOWN PLAYER') }]}
    slotDepth={Object.fromEntries(SNAKE_BOARD_SLOT_IDS.map((slotId) => [slotId, 3]))}
    assistantBoard={previewAssistantBoard(props.teamId, props.assistantPinId, props.unavailablePlayerIds)}
    assistantOptimizationKey={props.assistantPinId ? `${props.teamId}:${props.assistantPinId}:${props.assistantOptimizationRevision ?? 0}` : null}
    assistantOptimizationLabel={props.assistantPinId
      ? `OPTIMIZED FOR ${PREVIEW_CANDIDATES.find((candidate) => candidate.id === props.assistantPinId)?.name ?? 'SELECTED PLAYER'}`
      : null}
    tradeGuide={props.tradeGuide}
    tradePrefillKey={props.tradePrefillKey}
    showHelp={props.showHelp}
    selectedCandidateId={props.selectedPlayerId}
    privateScopeKey={`${props.teamId}:${props.privateEpoch}`}
    onSelectCandidate={props.onSelect}
    onReorder={(position, ids) => props.onReorder(position, ids)}
    onReorderOverall={(ids) => props.onReorder('OVERALL', ids)}
  />;
}

function PreviewSelected(props: {
  board: SnakeSeatBoardRecord;
  teamId: string;
  privateEpoch: number;
  selectedPlayerId: string;
  unavailablePlayerIds: ReadonlySet<string>;
  tradeProposal: SnakeGuidePackage | null;
  canRevert: boolean;
  draftAction?: ReactNode;
  onOptimizeAround: () => void;
  onKeep: () => void;
  onRevert: () => void;
  onTradeDecision: () => void;
}) {
  const candidate = PREVIEW_CANDIDATES.find((entry) => entry.id === props.selectedPlayerId) ?? PREVIEW_CANDIDATES[0];
  const player = PREVIEW_PLAYERS[candidate.id];
  const team = PREVIEW_TEAMS.find((entry) => entry.id === props.teamId) ?? PREVIEW_TEAMS[0];
  const consequence = previewSelectedConsequence({
    board: props.board,
    selectedPlayerId: candidate.id,
    teamId: props.teamId,
    privateEpoch: props.privateEpoch,
    unavailablePlayerIds: props.unavailablePlayerIds,
  });
  const actionConsequence = consequence.status === 'ready'
    ? `AFTER THIS KEEP AND A LEGAL FINISH: ${money(consequence.after.legalFinish.moneyLeft)} LEFT.`
    : consequence.status === 'already-on-board'
      ? 'ON MY BOARD.'
      : 'UNAVAILABLE.';
  return <SelectedPlayerCard
    player={player}
    candidate={candidate}
    consequence={consequence}
    teamLogoUrl={team.logoUrl}
    teamName={team.name}
    onOptimizeAround={props.onOptimizeAround}
    onKeep={props.onKeep}
    onRevert={props.canRevert ? props.onRevert : undefined}
    decision={props.tradeProposal ? {
      kind: 'TRADE_TO_PICK',
      playerId: candidate.id,
      targetPick: props.tradeProposal.targetPick,
      proposal: props.tradeProposal,
    } : null}
    onTradeDecision={props.onTradeDecision}
    actionConsequence={actionConsequence}
    draftAction={<>
      {props.draftAction}
      {props.canRevert ? <button
        type="button"
        className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11"
        onClick={props.onRevert}
      >REVERT</button> : null}
    </>}
  />;
}

function LocalDraftRecap(props: { state: PreviewDraftState; onRestart: () => void }) {
  return <main className="ballpark-page min-h-screen" data-testid="local-draft-recap">
    <section className="ballpark-panel mx-auto max-w-4xl">
      <p className="text-xs font-black tracking-[0.18em] text-[var(--ballpark-brass)]">LOCAL TEST DRIVE</p>
      <h1 className="ballpark-title mt-1 text-3xl">DRAFT RECAP</h1>
      <p className="mt-3 font-black">{props.state.recordedPicks.length} PICKS RECORDED</p>
      <ol className="mt-5 grid gap-2 sm:grid-cols-2">
        {props.state.recordedPicks.map((pick) => <li key={`${pick.pick}:${pick.id}`} className="border-4 border-[var(--ballpark-panel-border)] p-3 font-black">
          #{pick.pick} · {PREVIEW_TEAMS.find((team) => team.id === pick.teamId)?.abbreviation ?? pick.teamId.toUpperCase()} · {pick.name}
        </li>)}
      </ol>
      <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-gold mt-5 min-h-11" onClick={props.onRestart}>RESTART TEST DRIVE</button>
    </section>
  </main>;
}

function MainPreview() {
  const terminal = new URLSearchParams(window.location.search).get('terminal') === '1';
  const [state, dispatch] = useReducer(previewDraftReducer, terminal, createPreviewDraftState);
  const [paused, setPaused] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const unavailable = useMemo(() => unavailableIds(state.rosters), [state.rosters]);
  const activeSeatId = state.activeSeatId;
  const board = state.boards[activeSeatId];
  const selectedPlayerId = state.selectedByTeam[activeSeatId] ?? nextAvailableSelection(board, unavailable);
  const candidates = useMemo(() => previewCandidates(unavailable), [unavailable]);
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedPlayerId)
    ?? candidates.find((candidate) => !candidate.drafted)
    ?? candidates[0];
  const currentSlot = state.order[state.currentPickIndex];
  const tradeProposal = useMemo(() => previewTradeNudge({
    ownedPicks: state.ownedPicks,
    order: state.order,
    currentPickIndex: state.currentPickIndex,
    buyerTeamId: activeSeatId,
  }), [activeSeatId, state.currentPickIndex, state.order, state.ownedPicks]);
  const canDraftSelected = Boolean(currentSlot
    && currentSlot.teamId === activeSeatId
    && !unavailable.has(selectedCandidate.id));
  const ticker = state.recordedPicks.slice().reverse().slice(0, 4).map((pick) => ({
    id: `pick-${pick.pick}`,
    teamId: pick.teamId,
    text: `${PREVIEW_TEAMS.find((team) => team.id === pick.teamId)?.name.toUpperCase() ?? 'UNKNOWN TEAM'} SELECTED ${pick.name}`,
  }));
  const postOffer = (nextProposal: SnakeGuidePackage) => dispatch({ type: 'POST_OFFER', proposal: nextProposal });
  const closeOffer = (offerId: string) => dispatch({ type: 'CLOSE_OFFER', offerId });
  const executeOffer = (offer: SnakeOpenTradeOffer): ExecutedAskedPickTrade => {
    if (!offer.buyerNod || !offer.sellerNod) {
      return { valid: false, message: 'BOTH CLUBS MUST NOD.', session: null, livePickMoved: false, receipts: [] };
    }
    const verified = executeAskedPickTrade({
      session: previewGuideSession(state.ownedPicks, state.currentPickIndex),
      pickValueChart: PREVIEW_PICK_VALUE_CHART,
      seatingProofInput: PREVIEW_GUIDE_SEATING_INPUT,
      proposal: {
        buyerTeamId: offer.buyerTeamId,
        sellerTeamId: offer.sellerTeamId,
        targetPick: offer.targetPick,
        offerPickNumbers: [...offer.offerPickNumbers],
        receivePickNumbers: [...offer.receivePickNumbers],
        offerValue: offer.offerValue,
        receiveValue: offer.receiveValue,
        sellerPremium: offer.sellerPremium ?? offer.offerValue - offer.receiveValue,
        sessionRevision: offer.postedSessionRevision,
      },
    });
    if (!verified.valid) return verified;
    dispatch({ type: 'EXECUTE_TRADE', offerId: offer.id });
    const buyer = PREVIEW_TEAMS.find((team) => team.id === offer.buyerTeamId)?.name.toUpperCase()
      ?? offer.buyerTeamId.toUpperCase();
    return {
      valid: true,
      message: `TRADE EXECUTED — ${buyer} TRADED PICKS ${offer.offerPickNumbers.join('+')} FOR ${offer.receivePickNumbers.join('+')}.`,
      session: verified.session,
      livePickMoved: verified.livePickMoved,
      receipts: verified.receipts,
    };
  };
  const recordPick = (playerId: string) => {
    if (!currentSlot || currentSlot.teamId !== activeSeatId) throw new Error('Only the club on the clock can record this pick.');
    if (unavailable.has(playerId)) throw new Error('The selected player is already drafted.');
    dispatch({ type: 'RECORD_PICK', teamId: activeSeatId, playerId });
  };

  if (state.recap) return <LocalDraftRecap state={state} onRestart={() => dispatch({ type: 'RESET_PRIVATE' })} />;

  const privateGuide = <PrivateTradeGuide
    teamId={activeSeatId}
    ownedPicks={state.ownedPicks}
    currentPickIndex={state.currentPickIndex}
    offers={state.offers}
    prefillKey={state.tradePrefillKey}
    prefillProposal={tradeProposal}
    onPost={postOffer}
    onNod={(offerId, teamId) => dispatch({ type: 'NOD_OFFER', offerId, teamId })}
    onClose={closeOffer}
  />;

  return <div
    data-testid="snake-responsive-preview"
    data-surface="main"
    data-trade-revision={state.tradeRevision}
    data-current-pick-team={currentSlot?.teamId ?? 'complete'}
  >
    <div className="sr-only" aria-live="polite">LOCAL TEST DRIVE</div>
    <SnakeDraftRoomView
      teams={PREVIEW_TEAMS}
      order={state.order}
      totalPickCount={PREVIEW_TEAMS.length * 22}
      currentPickIndex={state.currentPickIndex}
      ticker={ticker}
      rostersByTeamId={state.rosters}
      ownedPicksByTeamId={state.ownedPicks}
      activeSeatId={activeSeatId}
      canDraftFromActiveSeat={canDraftSelected}
      candidate={{
        id: selectedCandidate.id,
        name: selectedCandidate.name,
        position: selectedCandidate.position,
        consequence: selectedCandidate.legalFinishLine,
      }}
      candidateProfile={PREVIEW_PLAYERS[selectedCandidate.id]}
      selectedPlayerCard={(draftAction) => <PreviewSelected
        board={board}
        teamId={activeSeatId}
        privateEpoch={state.privateEpoch}
        selectedPlayerId={selectedCandidate.id}
        unavailablePlayerIds={unavailable}
        tradeProposal={tradeProposal}
        canRevert={Boolean(
          state.lastKeeps[activeSeatId]?.playerId === selectedCandidate.id
          && state.lastKeeps[activeSeatId]?.afterBoardRevision === board.revision
        )}
        draftAction={draftAction}
        onOptimizeAround={() => dispatch({ type: 'OPTIMIZE', teamId: activeSeatId, playerId: selectedCandidate.id })}
        onKeep={() => dispatch({ type: 'KEEP_SELECTED', teamId: activeSeatId })}
        onRevert={() => dispatch({ type: 'REVERT_KEEP', teamId: activeSeatId, playerId: selectedCandidate.id })}
        onTradeDecision={() => dispatch({
          type: 'TRADE_PREFILL',
          key: tradeProposal ? `${activeSeatId}:${selectedCandidate.id}:${tradeProposal.targetPick}` : null,
        })}
      />}
      selectedFitLabel={`FIT · ${selectedCandidate.fitWord}`}
      draftActionLabel="DRAFT PLAYER"
      paused={paused}
      soundsEnabled={soundsEnabled}
      correctionAvailable={false}
      tradeRevision={state.tradeRevision}
      consolidatedMlb
      privateDesk={(showHelp) => <PreviewDesk
        board={board}
        teamId={activeSeatId}
        privateEpoch={state.privateEpoch}
        selectedPlayerId={selectedCandidate.id}
        assistantPinId={state.assistantPins[activeSeatId]}
        assistantOptimizationRevision={state.assistantOptimizeRevisions[activeSeatId]}
        unavailablePlayerIds={unavailable}
        tradeTargetPick={tradeProposal?.targetPick ?? null}
        tradeGuide={<PrivateTradeGuide
          teamId={activeSeatId}
          ownedPicks={state.ownedPicks}
          currentPickIndex={state.currentPickIndex}
          offers={state.offers}
          showHelp={showHelp}
          prefillKey={state.tradePrefillKey}
          prefillProposal={tradeProposal}
          onPost={postOffer}
          onNod={(offerId, teamId) => dispatch({ type: 'NOD_OFFER', offerId, teamId })}
          onClose={closeOffer}
        />}
        tradePrefillKey={state.tradePrefillKey}
        showHelp={showHelp}
        onSelect={(playerId) => dispatch({ type: 'SELECT_PLAYER', teamId: activeSeatId, playerId })}
        onReorder={(view, ids) => dispatch({ type: 'REORDER', teamId: activeSeatId, view, orderedIds: ids })}
      />}
      tradeGuide={privateGuide}
      commissionerTrade={(showHelp) => <SnakeCommissionerTrade
        teams={PREVIEW_TEAMS}
        ownedPicksByTeamId={state.ownedPicks}
        sessionRevision={7}
        openOffers={state.offers}
        showHelp={showHelp}
        onAsk={(buyerTeamId, targetPick) => previewGuideForAskedPick({
          ownedPicks: state.ownedPicks,
          buyerTeamId,
          targetPick,
          currentPickIndex: state.currentPickIndex,
        })}
        onPost={postOffer}
        onNod={(offerId, teamId) => dispatch({ type: 'NOD_OFFER', offerId, teamId })}
        onClose={(offerId) => closeOffer(offerId)}
        onExecute={executeOffer}
      />}
      companionApproval={<div className="border-4 border-[var(--ballpark-panel-border)] p-3 font-black">NO PENDING COMPANION CLAIMS.</div>}
      publicTruthByTeamId={Object.fromEntries(PREVIEW_TEAMS.map((team) => [
        team.id,
        previewRosterTruth((state.rosters[team.id] ?? []).map((player) => player.id)),
      ]))}
      onPauseChange={(nextPaused) => setPaused(nextPaused)}
      onRecordPick={recordPick}
      onSoundsEnabledChange={setSoundsEnabled}
      onActiveSeatChange={(teamId) => dispatch({ type: 'SWITCH_TEAM', teamId })}
    />
    {Object.keys(state.tradeReceipts).length > 0 ? <section className="ballpark-panel mt-4" aria-label="Trade receipts" data-testid="preview-trade-receipts">
      <h2 className="ballpark-title text-xl">TRADE RECEIPTS</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {Object.entries(state.tradeReceipts).map(([teamId, receipt]) => <p key={teamId} className="border-2 border-[var(--ballpark-panel-border)] p-2 font-black">
          {PREVIEW_TEAMS.find((team) => team.id === teamId)?.abbreviation ?? teamId.toUpperCase()} · {receipt}
        </p>)}
      </div>
    </section> : null}
  </div>;
}

function CompanionPreview() {
  const [state, dispatch] = useReducer(previewDraftReducer, false, createPreviewDraftState);
  const [privacy, setPrivacy] = useState<{ covered: boolean; epoch: number; message: string | null }>({
    covered: true,
    epoch: 0,
    message: null,
  });
  const teamId = 'bew';
  const board = state.boards[teamId];
  const unavailable = useMemo(() => unavailableIds(state.rosters), [state.rosters]);
  const selectedPlayerId = state.selectedByTeam[teamId] ?? nextAvailableSelection(board, unavailable);
  const candidates = useMemo(() => previewCandidates(unavailable), [unavailable]);
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedPlayerId)
    ?? candidates.find((candidate) => !candidate.drafted)
    ?? candidates[0];
  const tradeProposal = useMemo(() => previewTradeNudge({
    ownedPicks: state.ownedPicks,
    order: state.order,
    currentPickIndex: state.currentPickIndex,
    buyerTeamId: teamId,
  }), [state.currentPickIndex, state.order, state.ownedPicks, teamId]);
  const draftedTruth = previewRosterTruth((state.rosters[teamId] ?? []).map((player) => player.id));
  const privateGuide = (showHelp?: boolean) => <PrivateTradeGuide
    teamId={teamId}
    ownedPicks={state.ownedPicks}
    currentPickIndex={state.currentPickIndex}
    offers={state.offers}
    showHelp={showHelp}
    prefillKey={state.tradePrefillKey}
    prefillProposal={tradeProposal}
    onPost={(nextProposal) => dispatch({ type: 'POST_OFFER', proposal: nextProposal })}
    onNod={(offerId, noddingTeamId) => dispatch({ type: 'NOD_OFFER', offerId, teamId: noddingTeamId })}
    onClose={(offerId) => dispatch({ type: 'CLOSE_OFFER', offerId })}
  />;
  const resetAndCover = (message: string) => {
    dispatch({ type: 'RESET_PRIVATE' });
    setPrivacy({ covered: true, epoch: 0, message });
  };
  const coverPrivateDesk = () => {
    dispatch({ type: 'ROTATE_PRIVATE_EPOCH', teamId });
    setPrivacy((current) => ({
      ...current,
      covered: true,
      epoch: Math.max(1, current.epoch + 1),
      message: null,
    }));
  };

  return <div data-testid="snake-responsive-preview" data-surface="companion">
    {privacy.covered ? <CompanionCoveredScreen
      onReturn={() => {
        setPrivacy((current) => ({
          covered: false,
          epoch: Math.max(1, current.epoch),
          message: null,
        }));
      }}
      onForgetRoom={() => resetAndCover('ROOM FORGOTTEN. PRIVATE DESK RESET.')}
      onSignOut={() => resetAndCover('SIGNED OUT. PRIVATE DESK RESET.')}
      message={privacy.message}
    /> : <div data-testid="companion-private-epoch" data-private-epoch={privacy.epoch} key={privacy.epoch}>
      <SnakeCompanionFrame
        team={PREVIEW_TEAMS[0]}
        currentPick={state.order[state.currentPickIndex]?.pick ?? state.order.at(-1)?.pick ?? 0}
        order={state.order.slice(state.currentPickIndex, state.currentPickIndex + 3).map((slot) => ({
          pick: slot.pick,
          teamName: PREVIEW_TEAMS.find((team) => team.id === slot.teamId)?.name ?? slot.teamId,
        }))}
        ticker={state.recordedPicks.slice(-3).reverse().map((pick) => `${PREVIEW_TEAMS.find((team) => team.id === pick.teamId)?.name.toUpperCase() ?? pick.teamId.toUpperCase()} SELECTED ${pick.name}`)}
        selectedPlayer={<PreviewSelected
          board={board}
          teamId={teamId}
          privateEpoch={privacy.epoch}
          selectedPlayerId={selectedCandidate.id}
          unavailablePlayerIds={unavailable}
          tradeProposal={tradeProposal}
          canRevert={Boolean(
            state.lastKeeps[teamId]?.playerId === selectedCandidate.id
            && state.lastKeeps[teamId]?.afterBoardRevision === board.revision
          )}
          onOptimizeAround={() => dispatch({ type: 'OPTIMIZE', teamId, playerId: selectedCandidate.id })}
          onKeep={() => dispatch({ type: 'KEEP_SELECTED', teamId })}
          onRevert={() => dispatch({ type: 'REVERT_KEEP', teamId, playerId: selectedCandidate.id })}
          onTradeDecision={() => dispatch({
            type: 'TRADE_PREFILL',
            key: tradeProposal ? `${teamId}:${selectedCandidate.id}:${tradeProposal.targetPick}` : null,
          })}
        />}
        draftedTruth={<DraftTruthStrip
          title="DRAFTED ROSTER"
          ledger={draftedTruth.ledger}
          chemistry={draftedTruth.chemistry}
          testId="companion-drafted-truth-bew"
          compact
        />}
        privateDesk={(showHelp) => <PreviewDesk
          board={board}
          teamId={teamId}
          privateEpoch={privacy.epoch}
          selectedPlayerId={selectedCandidate.id}
          assistantPinId={state.assistantPins[teamId]}
          assistantOptimizationRevision={state.assistantOptimizeRevisions[teamId]}
          unavailablePlayerIds={unavailable}
          tradeTargetPick={tradeProposal?.targetPick ?? null}
          tradeGuide={privateGuide(showHelp)}
          tradePrefillKey={state.tradePrefillKey}
          showHelp={showHelp}
          onSelect={(playerId) => dispatch({ type: 'SELECT_PLAYER', teamId, playerId })}
          onReorder={(view, orderedIds) => dispatch({ type: 'REORDER', teamId, view, orderedIds })}
        />}
        helpNotes={['TRADE PICKS OPENS ONLY THIS CLUB\'S PRIVATE GUIDE.']}
        onCover={coverPrivateDesk}
      />
    </div>}
  </div>;
}

export function SnakeResponsivePreview() {
  const surface = new URLSearchParams(window.location.search).get('surface');
  return surface === 'companion' ? <CompanionPreview /> : <MainPreview />;
}
