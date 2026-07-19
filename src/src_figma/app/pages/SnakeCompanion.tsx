import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { HISTORICAL_ARCHETYPES } from '../../../data/historicalArchetypes';
import { auctionMarginalTaxWithCaps } from '../../../engines/auctionLuxuryTax';
import { snakeLuxuryCaps } from '../../../engines/snakeLuxuryTax';
import { computeOwnValue } from '../../../engines/auctionMarketModel';
import { constructionArchetypeFitMultiplier } from '../../../engines/archetypeIdentity';
import { historicalToSimArchetype } from '../../../engines/draftabilityRanker';
import { derivePickValueChart } from '../../../engines/leagueConstruction';
import { evaluateSnakePlan } from '../../../engines/snakeEconomics';
import type { SnakeGuidePackage } from '../../../engines/snakeGuideTrade';
import { applyCanonicalSnakeRiskTriggers, canonicalSnakeRoleDepth } from '../../../engines/snakeRationalRoom';
import { buildSnakeDraftAlignmentInputs, computeSnakeDraftAlignment, snakeDraftAlignmentRoomRank } from '../../../engines/snakeDraftAlignment';
import type { SimultaneousSnakeSeatingInput, SnakeSeatingPlayer, SnakeSeatingProof } from '../../../engines/snakeSeatingProof';
import { unavailableVersionPlayerIds } from '../../../engines/snakeVersioning';
import { rosterNeedBreakdown, toRosterSlotPlayer } from '../../../engines/rosterNeed';
import { assembleBoard } from '../../../engines/rosterIntelligencePayload';
import * as phaseFlags from '../../../utils/franchisePhase2Flags';
import {
  SNAKE_BOARD_SLOT_IDS,
  type LeagueBuilderMlbDraftSession,
  type SnakeOpenTradeOffer,
  type SnakeBoardSlotId,
  type SnakeSeatBoardRecord,
} from '../../../utils/leagueBuilderStorage';
import type { DesignSlot } from '../../../engines/rosterDesignFeasibility';
import { legacySnakeCompanionState } from '../../../utils/snakeLiveRoomSession';
import { readSnakeLiveCatalog } from '../../../utils/snakeLiveCatalog';
import type { SnakeLiveJsonObject, SnakeLiveSeatBoard } from '../../../utils/snakeLiveRoomTypes';
import {
  buildSnakeLiveTradeActionPayload,
  buildSnakeLiveTradePostPayload,
  projectSnakeLiveTradeOffers,
} from '../../../utils/snakeLiveTradeIntents';
import { useAuth } from '../../../hooks/useAuth';
import { toConstructionPlayer } from '../../hooks/useLeagueBuilderData';
import { CompanionClaimScreen } from '../components/snake/companion/CompanionClaimScreen';
import { CompanionSignInScreen } from '../components/snake/companion/CompanionSignInScreen';
import {
  CompanionAwaitingCommissionerScreen,
  CompanionCompletedScreen,
  CompanionCoveredScreen,
  SnakeCompanionFrame,
} from '../components/snake/companion/SnakeCompanionFrame';
import { safeCompanionLogoUrl } from '../components/snake/companion/companionFrameModel';
import {
  approvedClaimForDeviceTeam,
  approvedClaimsForDevice,
  claimForDevice,
  COMPANION_DRAFT_COMPLETE_COPY,
  COMPANION_STALE_COPY,
  isCompanionDraftComplete,
  isCompanionPicksComplete,
} from '../components/snake/companion/companionModel';
import { useSnakeLiveCompanionRoom } from '../components/snake/companion/useSnakeLiveCompanionRoom';
import {
  buildSnakePlayerIdentityChips,
  snakePlayerSourceId,
  snakePlayerVersionGroupId,
} from '../../../utils/snakePlayerIdentity';
import { PrivateDesk } from '../components/snake/desk/PrivateDesk';
import { DraftTruthStrip } from '../components/snake/desk/DraftTruthStrip';
import { SelectedPlayerCard } from '../components/snake/desk/SelectedPlayerCard';
import {
  buildChemistryStrip,
  buildDraftedRosterLedger,
} from '../components/snake/desk/draftTruthModel';
import {
  boardSlotPosition,
  buildTaxCoreRows,
  isCanonicalSnakeBoard,
  reorderSeatBoardRankings,
  setSeatBoardZeroInterest,
  type DeskCandidate,
  type DeskEligibilityCandidate,
} from '../components/snake/desk/deskModel';
import {
  buildDeskRoomPlayer,
  buildRationalSeats,
  fitWord,
  openRosterSlots,
  reconcileExistingSeatBoards,
  resolveLockedSeat,
} from '../components/snake/desk/deskRoomModel';
import {
  buildSnakeAssistantBoardRequest,
  buildSnakeAssistantLivePlayer,
} from '../components/snake/desk/snakeDeskIntelligenceModel';
import { useSnakeAssistantBoard } from '../components/snake/desk/useSnakeAssistantBoard';
import { useSnakeSelectedConsequences } from '../components/snake/desk/useSnakeSelectedConsequences';
import type { SnakeSelectedConsequencesWorkerRequest } from '../workers/snakeSelectedConsequences.worker';
import { snakeBoardOverBudgetReason } from '../components/snake/desk/snakeDeskMoneyCopy';
import {
  buildSnakeDecisionCandidateFacts,
  buildSnakeGuideRecommendationRequest,
  resolveSnakeDraftDecision,
  snakeGuideThreatPick,
  type SnakeDraftDecision,
} from '../components/snake/desk/snakeDraftDecisionModel';
import { useSnakeGuideRecommendation } from '../components/snake/desk/useSnakeGuideRecommendation';
import {
  buildSnakeRationalRiskRequest,
  useSnakeRationalRisks,
} from '../components/snake/desk/useSnakeRationalRisks';
import {
  buildSnakePickFinishWorkerRequest,
  useSnakePickFinishSafety,
} from '../components/snake/desk/useSnakePickFinishSafety';
import type { SnakeRankingView } from '../components/snake/desk/RankingsView';
import { SnakeTradeGuide } from '../components/snake/trade/SnakeTradeGuide';
import {
  guideForAskedPick as buildAskedPickGuide,
  prefillGuideForPackage,
  type SnakeTradeGuidePrefill,
} from '../components/snake/trade/tradeGuideModel';
import {
  fingerprintSnakeSetupProofInput,
  useSnakeSetupProofClient,
} from '../components/snake/setup/snakeSetupProofClient';

const DEVICE_COVERED_KEY = 'kbl-snake-companion-device-covered';
const DEVICE_COVER_EVENT = 'kbl-snake-companion-device-cover-change';
const UNKNOWN_PLAYER = 'UNKNOWN PLAYER';
const UNKNOWN_TEAM = 'UNKNOWN TEAM';

interface CompanionPrivateIdentity {
  sessionId: string;
  leagueId: string;
  seasonNumber: number;
  teamId: string;
  deviceId: string;
}

interface CompanionPrivateGuard {
  epoch: number;
  identity: CompanionPrivateIdentity;
}

function sameCompanionPrivateIdentity(
  left: CompanionPrivateIdentity | null,
  right: CompanionPrivateIdentity | null,
): boolean {
  return Boolean(left && right
    && left.sessionId === right.sessionId
    && left.leagueId === right.leagueId
    && left.seasonNumber === right.seasonNumber
    && left.teamId === right.teamId
    && left.deviceId === right.deviceId);
}

function companionPrivateIdentity(
  source: LeagueBuilderMlbDraftSession | null,
  ownDeviceId: string,
  teamId: string | null,
): CompanionPrivateIdentity | null {
  if (!source || !teamId) return null;
  const claim = approvedClaimForDeviceTeam(source, ownDeviceId, teamId);
  if (!claim) return null;
  return {
    sessionId: source.id,
    leagueId: source.leagueId,
    seasonNumber: source.seasonNumber,
    teamId: claim.teamId,
    deviceId: ownDeviceId,
  };
}

function snakeEnabled(): boolean {
  const enabled = (phaseFlags as typeof phaseFlags & { isSnakeDraftV1Enabled?: () => boolean }).isSnakeDraftV1Enabled;
  return enabled?.() ?? false;
}

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function readDeviceCovered(): boolean {
  try {
    return localStorage.getItem(DEVICE_COVERED_KEY) === 'true';
  } catch {
    return true;
  }
}

function broadcastDeviceCover(covered: boolean): void {
  try {
    if (covered) localStorage.setItem(DEVICE_COVERED_KEY, 'true');
    else localStorage.removeItem(DEVICE_COVERED_KEY);
  } catch {
    // Privacy still changes in this window when browser storage is full or unavailable.
  }
  window.dispatchEvent(new CustomEvent<boolean>(DEVICE_COVER_EVENT, { detail: covered }));
}

function privateBoardRecord(row: SnakeLiveSeatBoard | undefined): SnakeSeatBoardRecord | null {
  if (!row || !row.board || Array.isArray(row.board)) return null;
  const board = row.board as unknown as SnakeSeatBoardRecord;
  if (!board.slots || !board.rankings) return null;
  return { ...board, revision: row.boardRevision };
}

function privateBoardDesignSlots(row: SnakeLiveSeatBoard | undefined): DesignSlot[] | undefined {
  if (!row?.board || Array.isArray(row.board)) return undefined;
  const slots = (row.board as { designSlots?: unknown }).designSlots;
  return Array.isArray(slots) ? structuredClone(slots) as DesignSlot[] : undefined;
}

function jsonBoard(board: SnakeSeatBoardRecord, designSlots?: readonly DesignSlot[]): SnakeLiveJsonObject {
  return JSON.parse(JSON.stringify({
    ...board,
    ...(designSlots ? { designSlots } : {}),
  })) as SnakeLiveJsonObject;
}

/**
 * Apply public draft truth to private boards for display only.
 *
 * The stored server board stays unchanged. Keeping its revision makes public
 * picks and corrections safe to project many times without creating a private
 * write or a false board revision.
 */
function projectSnakeCompanionDisplaySession(input: {
  session: LeagueBuilderMlbDraftSession;
  candidates: readonly DeskEligibilityCandidate[];
  unavailablePlayerIds: ReadonlySet<string>;
}): LeagueBuilderMlbDraftSession {
  const projected = reconcileExistingSeatBoards(input);
  if (!projected.changed) return input.session;
  const savedBoards = input.session.seatBoards ?? {};
  const displayBoards = Object.fromEntries(Object.entries(projected.session.seatBoards ?? {}).map(([teamId, board]) => [
    teamId,
    {
      ...board,
      revision: savedBoards[teamId]?.revision ?? board.revision,
    },
  ]));
  return {
    ...projected.session,
    revision: input.session.revision,
    seatBoards: displayBoards,
  };
}

function mergeProtectedRanking(
  saved: readonly string[],
  edited: readonly string[],
  protectedPlayerIds: ReadonlySet<string>,
): string[] {
  const editable = edited.filter((playerId) => !protectedPlayerIds.has(playerId));
  let editableIndex = 0;
  const merged = saved.map((playerId) => {
    if (protectedPlayerIds.has(playerId)) return playerId;
    const replacement = editable[editableIndex];
    editableIndex += 1;
    return replacement ?? playerId;
  });
  for (; editableIndex < editable.length; editableIndex += 1) {
    const playerId = editable[editableIndex];
    if (!merged.includes(playerId)) merged.push(playerId);
  }
  return merged;
}

/** Preserve private preferences that public draft truth hid from the display. */
function mergeSnakeCompanionDisplayEdit(input: {
  savedBoard: SnakeSeatBoardRecord;
  projectedBoard: SnakeSeatBoardRecord;
  editedBoard: SnakeSeatBoardRecord;
  publicUnavailablePlayerIds: ReadonlySet<string>;
}): SnakeSeatBoardRecord {
  const slots = { ...input.editedBoard.slots };
  for (const slotId of SNAKE_BOARD_SLOT_IDS) {
    if (input.savedBoard.slots[slotId] !== input.projectedBoard.slots[slotId]) {
      slots[slotId] = input.savedBoard.slots[slotId];
    }
  }
  const positionKeys = new Set([
    ...Object.keys(input.savedBoard.rankings.byPosition ?? {}),
    ...Object.keys(input.editedBoard.rankings.byPosition ?? {}),
  ]);
  const byPosition = Object.fromEntries([...positionKeys].map((position) => [
    position,
    mergeProtectedRanking(
      input.savedBoard.rankings.byPosition?.[position as keyof typeof input.savedBoard.rankings.byPosition] ?? [],
      input.editedBoard.rankings.byPosition?.[position as keyof typeof input.editedBoard.rankings.byPosition] ?? [],
      input.publicUnavailablePlayerIds,
    ),
  ]));
  return {
    ...input.editedBoard,
    slots,
    rankings: {
      ...input.editedBoard.rankings,
      global: mergeProtectedRanking(
        input.savedBoard.rankings.global ?? [],
        input.editedBoard.rankings.global ?? [],
        input.publicUnavailablePlayerIds,
      ),
      byPosition,
    },
  };
}

function pendingPickIntent(input: {
  intents: ReturnType<typeof useSnakeLiveCompanionRoom>['intents'];
  teamId: string;
  publicRevision: number;
}) {
  return input.intents.find((intent) => (
    intent.kind === 'pick'
    && intent.status === 'pending'
    && intent.teamId === input.teamId
    && intent.expectedRoomRevision === input.publicRevision
  )) ?? null;
}

export default function SnakeCompanion() {
  const auth = useAuth();
  const authenticatedUserId = auth.isAuthenticated ? auth.user?.id ?? null : null;
  const liveRoom = useSnakeLiveCompanionRoom({
    ownerUserId: authenticatedUserId,
    enabled: auth.isAuthenticated,
  });
  const { runProof: runSeatingProof } = useSnakeSetupProofClient();
  const ownDeviceId = liveRoom.deviceId ?? '';
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [deviceCovered, setDeviceCovered] = useState(readDeviceCovered);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [assistantOptimizePlayerId, setAssistantOptimizePlayerId] = useState<string | null>(null);
  const [assistantOptimizeRevision, setAssistantOptimizeRevision] = useState(0);
  const [guidePrefillState, setGuidePrefillState] = useState<{
    scopeKey: string;
    prefill: SnakeTradeGuidePrefill;
  } | null>(null);
  const [boardUndo, setBoardUndo] = useState<{
    board: SnakeSeatBoardRecord;
    expectedBoardRevision: number;
    identity: CompanionPrivateIdentity;
    changedSlotCount: number;
  } | null>(null);
  const [undoWorking, setUndoWorking] = useState(false);
  const privacyEpochRef = useRef(0);
  const deviceCoveredRef = useRef(deviceCovered);
  const privateIdentityRef = useRef<CompanionPrivateIdentity | null>(null);
  const privateIdentityKeyRef = useRef<string | null>(null);
  const returningToDeskRef = useRef(false);
  const returnAttemptRef = useRef<object | null>(null);
  const autoResumeCoverRef = useRef<string | null>(null);
  const undoOperationRef = useRef<object | null>(null);
  deviceCoveredRef.current = deviceCovered;
  const invalidatePrivateContext = useCallback(() => {
    privacyEpochRef.current += 1;
    setSelectedPlayerId(null);
    setMessage(null);
    setAssistantOptimizePlayerId(null);
    setAssistantOptimizeRevision(0);
    setGuidePrefillState(null);
    setBoardUndo(null);
    undoOperationRef.current = null;
    setUndoWorking(false);
  }, []);
  const capturePrivateContext = useCallback((): CompanionPrivateGuard | null => {
    const identity = privateIdentityRef.current;
    if (deviceCoveredRef.current || !identity) return null;
    return { epoch: privacyEpochRef.current, identity: { ...identity } };
  }, []);
  const privateContextIsCurrent = useCallback((guard: CompanionPrivateGuard): boolean => (
    !deviceCoveredRef.current
    && privacyEpochRef.current === guard.epoch
    && sameCompanionPrivateIdentity(privateIdentityRef.current, guard.identity)
  ), []);
  const projectedTrades = useMemo(() => projectSnakeLiveTradeOffers(
    liveRoom.intents,
    liveRoom.room?.publicRevision ?? -1,
  ), [liveRoom.intents, liveRoom.room?.publicRevision]);
  const privateBoards = useMemo(() => Object.fromEntries(Object.entries(liveRoom.boardsByTeamId)
    .flatMap(([teamId, row]) => {
      const board = privateBoardRecord(row);
      return board ? [[teamId, board] as const] : [];
    })), [liveRoom.boardsByTeamId]);
  const session = useMemo<LeagueBuilderMlbDraftSession | null>(() => {
    if (!liveRoom.publicSession || !liveRoom.room) return null;
    return {
      ...liveRoom.publicSession,
      seatBoards: privateBoards,
      snakeCompanions: legacySnakeCompanionState({
        roomCode: liveRoom.room.roomCode,
        claims: liveRoom.claims,
        intents: liveRoom.intents,
      }),
    };
  }, [liveRoom.claims, liveRoom.intents, liveRoom.publicSession, liveRoom.room, privateBoards]);
  const catalog = useMemo(
    () => liveRoom.catalog ? readSnakeLiveCatalog(liveRoom.catalog.catalog) : null,
    [liveRoom.catalog],
  );
  const { league, leagueTeams, players, pool } = useMemo(() => ({
    league: catalog?.league ?? null,
    leagueTeams: catalog?.teams ?? [],
    players: catalog?.players ?? [],
    pool: catalog?.registeredPool ?? null,
  }), [catalog]);

  useEffect(() => {
    const syncCover = (covered: boolean) => {
      deviceCoveredRef.current = covered;
      invalidatePrivateContext();
      setDeviceCovered(covered);
    };
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === DEVICE_COVERED_KEY) syncCover(event.newValue === 'true');
    };
    const syncFromSameWindow = (event: Event) => {
      syncCover(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(DEVICE_COVER_EVENT, syncFromSameWindow);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(DEVICE_COVER_EVENT, syncFromSameWindow);
    };
  }, [invalidatePrivateContext]);

  const refreshSession = useCallback(async () => {
    try {
      await liveRoom.refresh();
    } catch (cause) {
      if (!deviceCoveredRef.current) {
        setMessage(cause instanceof Error ? cause.message : 'THE LIVE ROOM COULD NOT REFRESH.');
      }
    }
  }, [liveRoom]);

  const claimDesk = useCallback(async (gmName: string, roomCode: string) => {
    invalidatePrivateContext();
    try {
      const claims = await liveRoom.claimDesk(gmName, roomCode);
      setMessage(claims.some((claim) => claim.status === 'approved')
        ? 'YOUR DESK IS OPEN.'
        : 'ASK THE MAIN DEVICE TO APPROVE THIS DESK.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }, [invalidatePrivateContext, liveRoom]);

  const authSignOut = auth.signOut;
  const signOut = useCallback(async () => {
    returnAttemptRef.current = null;
    autoResumeCoverRef.current = null;
    deviceCoveredRef.current = true;
    invalidatePrivateContext();
    await liveRoom.disconnect();
    await authSignOut();
    setActiveTeamId(null);
  }, [authSignOut, invalidatePrivateContext, liveRoom]);

  const coverDevice = useCallback(() => {
    returnAttemptRef.current = null;
    broadcastDeviceCover(true);
  }, []);

  const returnToDesk = useCallback(async () => {
    const attempt = {};
    returnAttemptRef.current = attempt;
    deviceCoveredRef.current = true;
    returningToDeskRef.current = true;
    invalidatePrivateContext();
    try {
      await liveRoom.refresh();
      if (returnAttemptRef.current !== attempt || !deviceCoveredRef.current) {
        returningToDeskRef.current = false;
        return;
      }
      returnAttemptRef.current = null;
      broadcastDeviceCover(false);
    } catch (cause) {
      if (returnAttemptRef.current === attempt) {
        returnAttemptRef.current = null;
        returningToDeskRef.current = false;
        setMessage(cause instanceof Error ? cause.message : String(cause));
      }
    }
  }, [invalidatePrivateContext, liveRoom]);

  const forgetCurrentRoom = useCallback(async () => {
    returnAttemptRef.current = null;
    autoResumeCoverRef.current = null;
    deviceCoveredRef.current = true;
    invalidatePrivateContext();
    await liveRoom.disconnect();
    setActiveTeamId(null);
  }, [invalidatePrivateContext, liveRoom]);

  const approvedClaims = useMemo(
    () => session ? approvedClaimsForDevice(session, ownDeviceId) : [],
    [ownDeviceId, session],
  );
  const approved = session
    ? activeTeamId === null
      ? approvedClaims[0] ?? null
      : approvedClaimForDeviceTeam(session, ownDeviceId, activeTeamId)
    : null;
  const activeClaim = session ? claimForDevice(session, ownDeviceId) : null;
  const team = leagueTeams.find((entry) => entry.id === approved?.teamId) ?? null;
  const currentPrivateIdentity = team ? companionPrivateIdentity(session, ownDeviceId, team.id) : null;
  const currentPrivateIdentityKey = currentPrivateIdentity
    ? `${currentPrivateIdentity.sessionId}|${currentPrivateIdentity.leagueId}|${currentPrivateIdentity.seasonNumber}|${currentPrivateIdentity.teamId}|${currentPrivateIdentity.deviceId}`
    : null;
  if (privateIdentityKeyRef.current !== currentPrivateIdentityKey) {
    privateIdentityKeyRef.current = currentPrivateIdentityKey;
    privacyEpochRef.current += 1;
  }
  const currentPrivateScopeKey = currentPrivateIdentityKey
    ? `${currentPrivateIdentityKey}|${approved?.claimId ?? ''}|${privacyEpochRef.current}`
    : null;
  privateIdentityRef.current = currentPrivateIdentity;
  const approvedTeamIdsKey = approvedClaims.map((claim) => claim.teamId).sort().join('|');
  useLayoutEffect(() => {
    if (!liveRoom.resumedFromCapability || !liveRoom.activeRoomId || approvedClaims.length === 0) return;
    const key = `${liveRoom.activeRoomId}:${ownDeviceId}`;
    if (autoResumeCoverRef.current === key) return;
    autoResumeCoverRef.current = key;
    deviceCoveredRef.current = true;
    setDeviceCovered(true);
    broadcastDeviceCover(true);
  }, [approvedClaims.length, liveRoom.activeRoomId, liveRoom.resumedFromCapability, ownDeviceId]);
  useLayoutEffect(() => {
    if (!session) return;
    if (activeTeamId === null) {
      if (approvedClaims[0]) setActiveTeamId(approvedClaims[0].teamId);
      return;
    }
    if (approvedClaims.some((claim) => claim.teamId === activeTeamId)) return;
    invalidatePrivateContext();
    const fallbackTeamId = approvedClaims[0]?.teamId ?? null;
    setActiveTeamId(fallbackTeamId);
    if (!fallbackTeamId) return;
    if (returningToDeskRef.current) return;
    if (deviceCoveredRef.current) return;
    deviceCoveredRef.current = true;
    broadcastDeviceCover(true);
  }, [activeTeamId, approvedClaims, approvedTeamIdsKey, invalidatePrivateContext, session]);
  useEffect(() => {
    if (!deviceCovered) returningToDeskRef.current = false;
  }, [currentPrivateIdentityKey, deviceCovered]);
  useLayoutEffect(() => {
    setSelectedPlayerId(null);
    setMessage(null);
    setAssistantOptimizePlayerId(null);
    setBoardUndo(null);
    undoOperationRef.current = null;
    setUndoWorking(false);
  }, [currentPrivateIdentityKey]);
  const switchActiveTeam = useCallback((teamId: string) => {
    if (!session || teamId === activeTeamId || !approvedClaimForDeviceTeam(session, ownDeviceId, teamId)) return;
    returnAttemptRef.current = null;
    deviceCoveredRef.current = true;
    invalidatePrivateContext();
    setActiveTeamId(teamId);
    broadcastDeviceCover(true);
  }, [activeTeamId, invalidatePrivateContext, ownDeviceId, session]);
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const liveAlignment = useMemo(() => session
    && session.completedPicks.every((pick) => playerById.has(pick.playerId))
    ? computeSnakeDraftAlignment(buildSnakeDraftAlignmentInputs({ session, playersById: playerById }))
    : [], [playerById, session]);
  const teamAlignment = team
    ? liveAlignment.find((row) => row.teamId === team.id) ?? null
    : null;
  const activePoolRows = useMemo(() => {
    const selected = session?.snakeSetup?.poolPlayerIds;
    if (!selected?.length) return pool?.players ?? [];
    const selectedIds = new Set(selected);
    return (pool?.players ?? []).filter((row) => selectedIds.has(row.id));
  }, [pool, session?.snakeSetup?.poolPlayerIds]);
  const poolById = useMemo(() => new Map(activePoolRows.map((row) => [row.id, row])), [activePoolRows]);
  const seatingPlayers = useMemo(() => activePoolRows.flatMap((row): SnakeSeatingPlayer[] => {
    const player = playerById.get(row.id);
    if (!player) return [];
    return [{
      playerId: player.id,
      sourceId: snakePlayerSourceId(player),
      versionGroupId: snakePlayerVersionGroupId(player),
      price: row.iv,
      shape: toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        traits: [player.trait1, player.trait2],
      }),
      construction: toConstructionPlayer(player),
    }];
  }), [activePoolRows, playerById]);
  const seatingById = useMemo(() => new Map(seatingPlayers.map((entry) => [entry.playerId, entry])), [seatingPlayers]);
  const deskPlayers = useMemo(() => activePoolRows.flatMap((row) => {
    const player = playerById.get(row.id);
    const seating = seatingById.get(row.id);
    if (!player || !seating) return [];
    const built = buildDeskRoomPlayer({ player, price: row.iv, seating });
    return built ? [built] : [];
  }), [activePoolRows, playerById, seatingById]);
  const deskById = useMemo(() => new Map(deskPlayers.map((entry) => [entry.playerId, entry])), [deskPlayers]);
  const boardEligibilityCandidates = useMemo(() => deskPlayers.map((player) => ({
    id: player.playerId,
    iv: player.price,
    position: player.position,
    eligiblePositions: player.eligiblePositions,
    rosterShape: player.shape,
    sourceId: player.sourceId,
    versionGroupId: player.versionGroupId,
  })), [deskPlayers]);
  const assistantLivePlayers = useMemo(() => activePoolRows.flatMap((row) => {
    const player = playerById.get(row.id);
    const seating = seatingById.get(row.id);
    const deskPlayer = deskById.get(row.id);
    if (!player || !seating || !deskPlayer) return [];
    return [buildSnakeAssistantLivePlayer({
      player,
      frozenIv: row.iv,
      seating,
      archetypeWeights: deskPlayer.archetypeWeights,
    })];
  }), [activePoolRows, deskById, playerById, seatingById]);
  const unavailable = useMemo(() => {
    const ids = new Set(session?.completedPicks.map((pick) => pick.playerId) ?? []);
    for (const id of unavailableVersionPlayerIds(session?.versionState)) ids.add(id);
    return ids;
  }, [session]);
  const ownCommittedPlayerIds = useMemo(() => new Set(
    session?.completedPicks.filter((pick) => pick.teamId === team?.id).map((pick) => pick.playerId) ?? [],
  ), [session, team?.id]);
  const boardUnavailable = useMemo(() => new Set(
    [...unavailable].filter((playerId) => !ownCommittedPlayerIds.has(playerId)),
  ), [ownCommittedPlayerIds, unavailable]);
  const displaySession = useMemo(() => session ? projectSnakeCompanionDisplaySession({
    session,
    candidates: boardEligibilityCandidates,
    unavailablePlayerIds: unavailable,
  }) : null, [boardEligibilityCandidates, session, unavailable]);
  const storedBoard = team ? session?.seatBoards?.[team.id] ?? null : null;
  const board = team ? displaySession?.seatBoards?.[team.id] ?? null : null;
  const designSlots = team ? privateBoardDesignSlots(liveRoom.boardsByTeamId[team.id]) : undefined;
  const seatingProofInput = useMemo<SimultaneousSnakeSeatingInput | null>(() => {
    if (!session || !pool) return null;
    return {
      clubs: leagueTeams.map((entry) => {
        const completed = session.completedPicks.filter((pick) => pick.teamId === entry.id);
        const roster = completed.flatMap((pick) => seatingById.get(pick.playerId) ?? []);
        return {
          teamId: entry.id, roster,
          budgetRemaining: pool.tierCap - completed.reduce((sum, pick) => sum + (pick.settledSalary ?? poolById.get(pick.playerId)?.iv ?? 0) + (pick.marginalTax ?? 0), 0),
          committedConstruction: roster.map((row) => row.construction),
          capIdentity: resolveLockedSeat({ team: entry, session }).capIdentity,
          identityArchetype: (() => {
            const archetypeId = session.snakeSetup?.clubs.find((club) => club.teamId === entry.id)?.archetypeId
              ?? entry.mlbArchetypeKey;
            const historical = HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === archetypeId);
            return historical ? historicalToSimArchetype(historical) : undefined;
          })(),
        };
      }),
      pool: seatingPlayers.filter((entry) => !unavailable.has(entry.playerId)),
      identityReferencePool: seatingPlayers,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
      tier: session.tier,
      versionState: session.versionState,
    };
  }, [leagueTeams, pool, poolById, seatingById, seatingPlayers, session, unavailable]);
  const seatingProofFingerprint = useMemo(() => (
    seatingProofInput ? fingerprintSnakeSetupProofInput(seatingProofInput) : null
  ), [seatingProofInput]);
  const [seatingProofSnapshot, setSeatingProofSnapshot] = useState<{
    fingerprint: string;
    proof: SnakeSeatingProof | null;
  } | null>(null);
  useEffect(() => {
    if (!seatingProofInput || !seatingProofFingerprint || deviceCovered) return;
    let active = true;
    const controller = new AbortController();
    void runSeatingProof(seatingProofInput, { signal: controller.signal })
      .then((proof) => {
        if (active) setSeatingProofSnapshot({ fingerprint: seatingProofFingerprint, proof });
      })
      .catch((cause) => {
        if (!active || (cause instanceof Error && cause.name === 'AbortError')) return;
        setSeatingProofSnapshot({ fingerprint: seatingProofFingerprint, proof: null });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [deviceCovered, runSeatingProof, seatingProofFingerprint, seatingProofInput]);
  const seatingProofResult = seatingProofSnapshot?.fingerprint === seatingProofFingerprint
    ? seatingProofSnapshot.proof
    : null;
  const finishSafetyRequest = useMemo(() => {
    const proof = seatingProofResult;
    if (deviceCovered || !team || !seatingProofInput || !proof?.feasible) return null;
    const availableIds = new Set(deskPlayers
      .filter((player) => !unavailable.has(player.playerId))
      .map((player) => player.playerId));
    return buildSnakePickFinishWorkerRequest({
      current: seatingProofInput,
      proof,
      teamId: team.id,
      candidatePlayerIds: [...new Set([
        ...Object.values(board?.slots ?? {}),
        ...(board?.rankings.global ?? []),
        ...deskPlayers.map((player) => player.playerId),
      ].filter((playerId): playerId is string => Boolean(playerId) && availableIds.has(playerId)))],
    });
  }, [board, deskPlayers, deviceCovered, seatingProofInput, seatingProofResult, team, unavailable]);
  const finishSafety = useSnakePickFinishSafety(finishSafetyRequest);

  const rationalRiskRequest = useMemo(() => {
    if (deviceCovered || !session || !pool || !team || !board) return null;
    const available = deskPlayers.filter((entry) => !unavailable.has(entry.playerId));
    const seats = buildRationalSeats({
      teams: leagueTeams,
      session,
      playersById: deskById,
      budget: pool.tierCap,
    });
    return buildSnakeRationalRiskRequest({
      session,
      askingTeamId: team.id,
      askedPlayerIds: [...new Set([
        selectedPlayerId,
        ...Object.values(board.slots),
        ...(board.rankings.global ?? []).slice(0, 22),
      ].filter((playerId): playerId is string => Boolean(playerId)
        && available.some((player) => player.playerId === playerId)))],
      availablePlayers: available,
      seats,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
    });
  }, [board, deskById, deskPlayers, deviceCovered, leagueTeams, pool, selectedPlayerId, session, team, unavailable]);
  const rationalRiskState = useSnakeRationalRisks(rationalRiskRequest);
  const askedRiskIds = useMemo(
    () => new Set(rationalRiskRequest?.input.askedPlayerIds ?? []),
    [rationalRiskRequest],
  );

  const deskState = useMemo(() => {
    if (!session || !pool || !team || !board) return null;
    const locked = resolveLockedSeat({ team, session });
    const caps = snakeLuxuryCaps(pool.luxuryCaps);
    const seats = buildRationalSeats({ teams: leagueTeams, session, playersById: deskById, budget: pool.tierCap });
    const ownSeat = seats.find((seat) => seat.teamId === team.id);
    if (!ownSeat) return null;
    const need = rosterNeedBreakdown(ownSeat.roster.map((entry) => entry.shape));
    const openSlots = openRosterSlots(session, team.id);
    const available = deskPlayers.filter((entry) => !unavailable.has(entry.playerId));
    const risks = rationalRiskState.risks ?? [];
    const riskById = new Map(risks.map((risk) => [risk.playerId, risk]));
    const fitWorthById = new Map(deskPlayers.map((player) => [player.playerId, computeOwnValue({
      iv: player.price,
      archetypeWeights: player.archetypeWeights,
      ownBandPriorities: locked.priorities,
      archetypeFitMultiplierOverride: constructionArchetypeFitMultiplier(
        locked.capIdentity,
        player.construction,
      ),
      needBreakdown: need,
      shape: player.shape,
      openSlots,
    })]));
    const contextualCandidates = deskPlayers.flatMap((player) => {
      const contextualWorth = fitWorthById.get(player.playerId);
      return Number.isFinite(contextualWorth) ? [{
        playerId: player.playerId,
        iv: contextualWorth!,
        candidate: player.stored,
        shape: player.shape,
      }] : [];
    });
    const contextualWorthComplete = contextualCandidates.length === deskPlayers.length;
    const assembled = assembleBoard({
      candidates: contextualCandidates,
      rosterPlayers: ownSeat.roster.flatMap((player) => playerById.get(player.playerId) ?? []),
      need,
    });
    const advisorWorthById = new Map(assembled.map((row) => [row.playerId, row.worth]));
    const completedPickByPlayerId = new Map(session.completedPicks.map((pick) => [pick.playerId, pick]));
    const teamNameById = new Map(leagueTeams.map((entry) => [entry.id, entry.name]));
    const candidates: DeskCandidate[] = deskPlayers.flatMap((entry) => {
      const advisorWorth = advisorWorthById.get(entry.playerId);
      if (!contextualWorthComplete || !Number.isFinite(advisorWorth)) return [];
      const completedPick = completedPickByPlayerId.get(entry.playerId);
      const draftedByActiveTeam = completedPick?.teamId === team.id;
      const committedRosterForTax = draftedByActiveTeam
        ? ownSeat.roster.filter((row) => row.playerId !== entry.playerId)
        : ownSeat.roster;
      const marginalTax = auctionMarginalTaxWithCaps(
        committedRosterForTax.map((row) => row.construction),
        entry.construction,
        locked.capIdentity,
        caps,
      );
      const displayedSalary = draftedByActiveTeam
        ? completedPick?.settledSalary ?? entry.price
        : entry.price;
      const risk = riskById.get(entry.playerId);
      const finish = finishSafety.rows.get(entry.playerId);
      return [{
        id: entry.playerId,
        name: fullName(entry.stored.firstName, entry.stored.lastName).toUpperCase(),
        identityChips: buildSnakePlayerIdentityChips(entry.stored, deskPlayers.map((row) => row.stored)),
        position: entry.position,
        eligiblePositions: entry.eligiblePositions,
        rosterShape: entry.shape,
        sourceId: entry.sourceId,
        versionGroupId: entry.versionGroupId,
        advisorWorth: advisorWorth!,
        iv: entry.price,
        salary: displayedSalary,
        marginalTax,
        trueCost: displayedSalary + marginalTax,
        archetypeChip: locked.archetypeName,
        fitWord: fitWord({
          player: entry,
          priorities: locked.priorities,
          capIdentity: locked.capIdentity,
          baseCaps: pool.luxuryCaps,
          need,
          openSlots,
        }),
        risk: risk?.risk ?? 'SAFE_TO_WAIT',
        riskPending: askedRiskIds.has(entry.playerId) && (rationalRiskState.status === 'pending'
          || (rationalRiskState.status === 'ready' && !risk)),
        riskUnavailable: askedRiskIds.has(entry.playerId) && rationalRiskState.status === 'unavailable',
        hasNextPick: risk?.nextPick !== null,
        riskReason: risk
          ? `${risk.rationalBuyersBeforeTurn} ${risk.rationalBuyersBeforeTurn === 1 ? 'CLUB COULD' : 'CLUBS COULD'} TAKE THIS PLAYER BEFORE YOUR TURN.`
          : rationalRiskState.status === 'unavailable'
            ? 'NEXT-TURN RISK IS UNAVAILABLE.'
            : 'NEXT-TURN RISK CALCULATING.',
        legalFinishLine: completedPick ? '' : finish?.message
          ?? (finishSafety.status === 'pending' ? 'FINISH CHECK CALCULATING.' : 'FINISH PROOF UNAVAILABLE.'),
        finishStatus: completedPick ? undefined : finish?.status ?? 'OPEN',
        construction: entry.construction,
        drafted: Boolean(completedPick),
        draftedByActiveTeam,
        draftedByTeamName: completedPick ? teamNameById.get(completedPick.teamId) : undefined,
      }];
    });
    const brokenSlots = SNAKE_BOARD_SLOT_IDS.filter((slotId) => !board.slots[slotId] || boardUnavailable.has(board.slots[slotId]));
    const boardIsCanonical = isCanonicalSnakeBoard({
      slots: board.slots,
      candidates: boardEligibilityCandidates,
    });
    const planBill = brokenSlots.length || !boardIsCanonical ? null : evaluateSnakePlan({
      boardPlayerIds: Object.values(board.slots), players: deskPlayers, budget: pool.tierCap,
      baseCaps: pool.luxuryCaps, realTeamCount: leagueTeams.length, capIdentity: locked.capIdentity,
    });
    const teamPicks = session.completedPicks.filter((pick) => pick.teamId === team.id);
    const draftedStoredPlayers = teamPicks.flatMap((pick) => playerById.get(pick.playerId) ?? []);
    const draftedPlayersComplete = draftedStoredPlayers.length === teamPicks.length
      && ownSeat.roster.length === teamPicks.length;
    const certifiedCompletionPlayerIds = seatingProofResult?.feasible
      ? seatingProofResult.assignments.find((assignment) => assignment.teamId === team.id)?.playerIds ?? []
      : [];
    const cheapestDepthByPlayerId = new Map(certifiedCompletionPlayerIds.flatMap((playerId) => {
      const player = deskById.get(playerId);
      return player ? [[playerId, canonicalSnakeRoleDepth(player.shape, available.map((entry) => entry.shape))] as const] : [];
    }));
    const displayCandidates = candidates.map((candidate): DeskCandidate => {
      const canonicalRisk = applyCanonicalSnakeRiskTriggers({
        playoutRisk: candidate.risk,
        planCushion: planBill?.planCushion ?? null,
        cheapestFinishPositionDepth: cheapestDepthByPlayerId.get(candidate.id) ?? null,
      });
      return {
        ...candidate,
        risk: canonicalRisk,
        riskPending: candidate.riskPending && canonicalRisk === 'SAFE_TO_WAIT',
        riskReason: snakeBoardOverBudgetReason(planBill?.planCushion ?? null)
          ?? ((cheapestDepthByPlayerId.get(candidate.id) ?? Number.POSITIVE_INFINITY) <= 2
            ? `ONLY ${cheapestDepthByPlayerId.get(candidate.id)} CANONICAL ROLE OPTIONS REMAIN FOR THE CHEAPEST LEGAL FINISH.`
            : candidate.riskReason),
      };
    });
    const truthPlayersById = new Map(deskPlayers.map((entry) => [
      entry.playerId,
      { player: entry.stored, construction: entry.construction },
    ]));
    const frozenIvById = new Map(activePoolRows.map((row) => [row.id, row.iv]));
    const draftedLedger = buildDraftedRosterLedger({
      picks: teamPicks,
      playersById: truthPlayersById,
      frozenIvById,
      budget: pool.tierCap,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
      capIdentity: locked.capIdentity,
    });
    const draftedChemistry = buildChemistryStrip(draftedPlayersComplete ? draftedStoredPlayers : null);
    const planStoredPlayers = planBill?.playerIds.flatMap((playerId) => playerById.get(playerId) ?? []) ?? [];
    const planChemistry = buildChemistryStrip(
      planBill && planStoredPlayers.length === planBill.playerIds.length ? planStoredPlayers : null,
    );
    const candidateById = new Map(displayCandidates.map((candidate) => [candidate.id, candidate]));
    const slotDepth = Object.fromEntries(Object.keys(board.slots).map((slotId) => {
      const position = boardSlotPosition(slotId as SnakeBoardSlotId) ?? candidateById.get(board.slots[slotId as SnakeBoardSlotId])?.position;
      return [slotId, position ? (board.rankings.byPosition?.[position] ?? []).filter((id) => !boardUnavailable.has(id)).length : 0];
    }));
    return {
      assistantWorthComplete: candidates.length === deskPlayers.length,
      candidates: displayCandidates, brokenSlots, planBill, slotDepth,
      draftedLedger,
      draftedChemistry,
      planChemistry,
      assistantNeed: draftedPlayersComplete ? need : null,
      taxCoreRows: buildTaxCoreRows({ candidates, boardPlayerIds: Object.values(board.slots), caps, capIdentity: locked.capIdentity }),
      advisorLog: brokenSlots.map((slotId) => ({ key: `broken:${slotId}`, text: `YOUR ${slotId} PLAN IS BROKEN — YOUR RANKING HAS NO AVAILABLE NAME.`, actionable: true })),
    };
  }, [activePoolRows, askedRiskIds, board, boardEligibilityCandidates, boardUnavailable, deskById, deskPlayers, finishSafety, leagueTeams, playerById, pool, rationalRiskState.risks, rationalRiskState.status, seatingProofResult, session, team, unavailable]);

  const defaultSelectedPlayerId = useMemo(() => {
    if (!board || !deskState) return null;
    return (board.rankings.global ?? []).find((id) => (
      !boardUnavailable.has(id) && deskState.candidates.some((candidate) => candidate.id === id)
    )) ?? deskState.candidates.find((candidate) => !boardUnavailable.has(candidate.id))?.id ?? null;
  }, [board, boardUnavailable, deskState]);
  const selectedCandidateId = selectedPlayerId
    && (!boardUnavailable.has(selectedPlayerId) || session?.completedPicks.some((pick) => pick.playerId === selectedPlayerId))
    && deskState?.candidates.some((candidate) => candidate.id === selectedPlayerId)
      ? selectedPlayerId
      : defaultSelectedPlayerId;
  const selectedCandidate = deskState?.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;
  const selectedFinishSafety = selectedCandidateId ? finishSafety.rows.get(selectedCandidateId) ?? null : null;
  const selectedStoredPlayer = selectedCandidateId ? playerById.get(selectedCandidateId) ?? null : null;
  const assistantIdentity = useMemo(() => session && team && board && !deviceCovered ? {
    sessionId: session.id,
    sessionRevision: session.revision ?? 0,
    teamId: team.id,
    seatId: approved?.claimId ?? team.gmSeatId ?? team.id,
    deviceId: ownDeviceId,
    privateEpoch: privacyEpochRef.current,
    boardRevision: board.revision,
  } : null, [approved?.claimId, board, deviceCovered, ownDeviceId, session, team]);
  const assistantRequest = useMemo(() => {
    if (!session || !pool || !league || !team || !board || !deskState
      || !deskState.assistantWorthComplete || !assistantIdentity || deviceCovered) return null;
    const archetypeId = session.snakeSetup?.clubs.find((club) => club.teamId === team.id)?.archetypeId
      ?? team.mlbArchetypeKey;
    const historical = HISTORICAL_ARCHETYPES.find((entry) => entry.id === archetypeId);
    return buildSnakeAssistantBoardRequest({
      identity: assistantIdentity,
      frozenPoolIdentity: `${session.id}:${session.snakeSetup?.orderSeed ?? ''}`,
      engineInput: {
        activePool: assistantLivePlayers,
        completedPicks: session.completedPicks.map((pick) => ({
          teamId: pick.teamId,
          playerId: pick.playerId,
          settledSalary: pick.settledSalary,
        })),
        versionState: session.versionState,
        versionSelections: session.snakeSetup?.versionSelections,
        selectedPinPlayerId: assistantOptimizePlayerId,
        archetype: historical ? historicalToSimArchetype(historical) : { name: 'Balanced', rawShift: {} },
        ownBandPriorities: resolveLockedSeat({ team, session }).priorities,
        gmRankOverrides: board.rankings,
        zeroInterestPlayerIds: board.rankings.zeroInterestPlayerIds,
        certifiedCompletionPlayerIds: seatingProofResult?.feasible
          ? seatingProofResult.assignments
            .find((assignment) => assignment.teamId === team.id)?.playerIds
          : undefined,
        tier: league.tier ?? 'juiced',
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: resolveLockedSeat({ team, session }).capIdentity,
      },
      savedDesignSlots: designSlots,
    });
  }, [assistantIdentity, assistantLivePlayers, assistantOptimizePlayerId, board, designSlots, deskState, deviceCovered, league, leagueTeams.length, pool, seatingProofResult, session, team]);
  const assistantBoardState = useSnakeAssistantBoard(assistantRequest);
  const assistantTaxCoreRows = useMemo(() => {
    if (assistantBoardState.status !== 'ready' || !assistantBoardState.board || !deskState || !pool || !team || !session) return [];
    return buildTaxCoreRows({
      candidates: deskState.candidates,
      boardPlayerIds: assistantBoardState.board.slots.map((slot) => slot.playerId),
      caps: snakeLuxuryCaps(pool.luxuryCaps),
      capIdentity: resolveLockedSeat({ team, session }).capIdentity,
    });
  }, [assistantBoardState.board, assistantBoardState.status, deskState, pool, session, team]);
  const consequencePlayers = useMemo(() => {
    const candidateById = new Map((deskState?.candidates ?? []).map((entry) => [entry.id, entry]));
    return assistantLivePlayers.flatMap((player) => {
      const candidate = candidateById.get(player.playerId);
      return candidate ? [{
        ...player,
        advisorWorth: candidate.advisorWorth,
        fitWord: candidate.fitWord,
        eligiblePositions: candidate.eligiblePositions ?? [candidate.position],
      }] : [];
    });
  }, [assistantLivePlayers, deskState?.candidates]);
  const selectedRisk = useMemo(() => rationalRiskState.status === 'ready' && selectedCandidateId
    ? rationalRiskState.risks?.find((row) => row.playerId === selectedCandidateId) ?? null
    : null, [rationalRiskState.risks, rationalRiskState.status, selectedCandidateId]);
  const selectedScarcity = useMemo(() => rationalRiskState.status === 'ready' && selectedCandidateId
    ? rationalRiskState.scarcity?.filter((row) => row.playerId === selectedCandidateId) ?? null
    : null, [rationalRiskState.scarcity, rationalRiskState.status, selectedCandidateId]);
  const replacementConsequencePlayerIds = useMemo(() => [...new Set((selectedScarcity ?? []).flatMap((row) => (
    row.replacementState === 'AVAILABLE'
    && row.replacementPlayerId
    && row.replacementPlayerId !== selectedCandidateId
    && !unavailable.has(row.replacementPlayerId)
      ? [row.replacementPlayerId]
      : []
  )))], [selectedCandidateId, selectedScarcity, unavailable]);
  const consequenceRequest = useMemo<SnakeSelectedConsequencesWorkerRequest | null>(() => {
    if (!assistantIdentity || !session || !pool || !team || !board || !deskState || !selectedCandidateId) return null;
    const selectedPlayerIds = [selectedCandidateId, ...replacementConsequencePlayerIds];
    return {
      key: `snake-consequence:${assistantIdentity.sessionId}:${assistantIdentity.sessionRevision}:${assistantIdentity.teamId}:${assistantIdentity.boardRevision}:${selectedPlayerIds.join(',')}`,
      selectedPlayerIds,
      input: {
        identity: assistantIdentity,
        teamId: team.id,
        board,
        designSlots,
        players: consequencePlayers,
        completedPicks: session.completedPicks.map((pick) => ({
          teamId: pick.teamId, playerId: pick.playerId, settledSalary: pick.settledSalary,
        })),
        versionState: session.versionState,
        versionSelections: session.snakeSetup?.versionSelections,
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: resolveLockedSeat({ team, session }).capIdentity,
      },
    };
  }, [assistantIdentity, board, consequencePlayers, designSlots, deskState, leagueTeams.length, pool, replacementConsequencePlayerIds, selectedCandidateId, session, team]);
  const consequenceState = useSnakeSelectedConsequences(consequenceRequest);
  const selectedConsequence = selectedCandidateId
    ? consequenceState.consequenceByPlayerId.get(selectedCandidateId) ?? null
    : null;
  const selectedDecisionFacts = useMemo(() => buildSnakeDecisionCandidateFacts({
    playerId: selectedCandidateId ?? '',
    candidate: selectedCandidate,
    consequence: selectedConsequence,
  }), [selectedCandidate, selectedCandidateId, selectedConsequence]);
  const replacementDecisionFacts = useMemo(() => {
    if (!assistantIdentity || !session || !pool || !team || !board || !deskState
      || !selectedCandidateId || !selectedScarcity || deviceCovered) return null;
    const candidatesById = new Map(deskState.candidates.map((candidate) => [candidate.id, candidate]));
    return replacementConsequencePlayerIds.flatMap((replacementId) => {
      const consequence = consequenceState.consequenceByPlayerId.get(replacementId) ?? null;
      return buildSnakeDecisionCandidateFacts({
        playerId: replacementId,
        candidate: candidatesById.get(replacementId) ?? null,
        consequence,
      }) ?? [];
    });
  }, [assistantIdentity, board, consequenceState.consequenceByPlayerId, deskState, deviceCovered, pool, replacementConsequencePlayerIds, selectedCandidateId, selectedScarcity, session, team]);
  const assistantPriorityPlayerIds = assistantBoardState.status === 'ready'
    ? assistantBoardState.board?.playerIds ?? null
    : null;
  const infeasibleForPlayerId = assistantBoardState.infeasibleReason
    && assistantOptimizePlayerId === selectedCandidateId
      ? selectedCandidateId
      : null;
  const guideThreatPick = snakeGuideThreatPick({
    selectedPlayerId: selectedCandidateId,
    askingTeamId: team?.id ?? null,
    livePickTeamId: session?.pickOrder[session.currentPickIndex]?.teamId ?? null,
    assistantPriorityPlayerIds,
    assistantInfeasibleReason: assistantBoardState.infeasibleReason,
    infeasibleForPlayerId,
    selected: selectedDecisionFacts,
    risk: selectedRisk,
    scarcity: selectedScarcity,
  });

  const saveBoard = useCallback(async (
    nextBoard: SnakeSeatBoardRecord,
    successMessage: string | null,
    guard: CompanionPrivateGuard,
  ): Promise<{ savedBoard: SnakeSeatBoardRecord; privateContextStillCurrent: boolean } | null> => {
    if (!session || !board || !storedBoard || !team) return null;
    if (!isCanonicalSnakeBoard({ slots: nextBoard.slots, candidates: boardEligibilityCandidates })) {
      if (privateContextIsCurrent(guard)) {
        setMessage('MY BOARD COULD NOT BE SAVED — THE RESULT IS NOT A LEGAL 22-PLAYER ROSTER.');
      }
      return null;
    }
    try {
      if (!privateContextIsCurrent(guard)) return null;
      const authoritative = liveRoom.boardsByTeamId[team.id];
      const authoritativeBoard = privateBoardRecord(authoritative);
      if (!authoritativeBoard
        || authoritative.boardRevision !== storedBoard.revision
        || authoritativeBoard.revision !== storedBoard.revision) {
        throw new Error(COMPANION_STALE_COPY);
      }
      const baseEdit = mergeSnakeCompanionDisplayEdit({
        savedBoard: authoritativeBoard,
        projectedBoard: board,
        editedBoard: nextBoard,
        publicUnavailablePlayerIds: unavailable,
      });
      if (!isCanonicalSnakeBoard({ slots: baseEdit.slots, candidates: boardEligibilityCandidates })) {
        throw new Error('MY BOARD COULD NOT BE SAVED — THE BASE BOARD IS NOT A LEGAL 22-PLAYER ROSTER.');
      }
      const submittedBoard: SnakeSeatBoardRecord = {
        ...baseEdit,
        revision: authoritative.boardRevision + 1,
      };
      const receipt = await liveRoom.writeBoard({
        teamId: team.id,
        board: jsonBoard(submittedBoard, privateBoardDesignSlots(authoritative)),
        expectedBoardRevision: authoritative.boardRevision,
        idempotencyKey: `board:${session.id}:${team.id}:${authoritative.boardRevision + 1}`,
      });
      const guardStillCurrent = privateContextIsCurrent(guard);
      const savedBoard = privateBoardRecord(receipt);
      const privateContextStillCurrent = guardStillCurrent && Boolean(savedBoard);
      if (privateContextStillCurrent) {
        if (successMessage) setMessage(successMessage);
      } else if (guardStillCurrent) {
        await refreshSession();
      }
      return savedBoard ? { savedBoard, privateContextStillCurrent } : null;
    } catch (cause) {
      if (privateContextIsCurrent(guard)) {
        const copy = cause instanceof Error ? cause.message : '';
        setMessage(copy === COMPANION_DRAFT_COMPLETE_COPY || copy.includes('APPROVE')
          ? copy
          : copy.toLocaleLowerCase().includes('stale')
              || copy.toLocaleLowerCase().includes('revision changed')
              || copy === COMPANION_STALE_COPY
            ? COMPANION_STALE_COPY
            : copy || 'MY BOARD COULD NOT BE SAVED.');
        await refreshSession();
      }
      return null;
    }
  }, [board, boardEligibilityCandidates, liveRoom, privateContextIsCurrent, refreshSession, session, storedBoard, team, unavailable]);

  const reorder = useCallback(async (view: SnakeRankingView, orderedIds: readonly string[]) => {
    if (!board || !deskState) return;
    const guard = capturePrivateContext();
    if (!guard || guard.identity.teamId !== team?.id) return;
    const priorBoard = structuredClone(board);
    const reordered = reorderSeatBoardRankings({
      board,
      view,
      orderedIds,
      candidates: deskState.candidates,
      unavailablePlayerIds: boardUnavailable,
      committedPlayerIds: ownCommittedPlayerIds,
    });
    if (!reordered.board) {
      setMessage(reordered.invalidRoster
        ? 'MY BOARD COULD NOT REFIT — THE RESULT IS NOT A LEGAL 22-PLAYER ROSTER.'
        : `MY BOARD COULD NOT REFIT — ${reordered.brokenSlots.join(', ')} HAS NO AVAILABLE PLAYER.`);
      return;
    }
    const outcome = await saveBoard(reordered.board, null, guard);
    const savedBoard = outcome?.savedBoard;
    if (!outcome?.privateContextStillCurrent || !savedBoard || !privateContextIsCurrent(guard)) return;
    setBoardUndo({
      board: priorBoard,
      expectedBoardRevision: savedBoard.revision,
      identity: guard.identity,
      changedSlotCount: reordered.changedSlotCount,
    });
  }, [board, boardUnavailable, capturePrivateContext, deskState, ownCommittedPlayerIds, privateContextIsCurrent, saveBoard, team?.id]);

  const undoBoardUpdate = useCallback(async () => {
    if (!board || !boardUndo || undoOperationRef.current) return;
    const guard = capturePrivateContext();
    if (!guard || !sameCompanionPrivateIdentity(guard.identity, boardUndo.identity)) {
      setBoardUndo(null);
      return;
    }
    if (board.revision !== boardUndo.expectedBoardRevision) {
      setBoardUndo(null);
      setMessage(COMPANION_STALE_COPY);
      await refreshSession();
      return;
    }
    const operation = {};
    undoOperationRef.current = operation;
    setUndoWorking(true);
    const restoredBoard: SnakeSeatBoardRecord = {
      ...structuredClone(boardUndo.board),
      revision: board.revision + 1,
    };
    try {
      const outcome = await saveBoard(restoredBoard, null, guard);
      if (outcome?.privateContextStillCurrent && privateContextIsCurrent(guard)) setBoardUndo(null);
    } finally {
      if (undoOperationRef.current === operation) {
        undoOperationRef.current = null;
        setUndoWorking(false);
      }
    }
  }, [board, boardUndo, capturePrivateContext, privateContextIsCurrent, refreshSession, saveBoard]);

  const selectCandidate = useCallback((playerId: string) => {
    setAssistantOptimizePlayerId(null);
    setSelectedPlayerId(playerId);
  }, []);

  const keepSelectedConsequence = useCallback(async () => {
    if (selectedConsequence?.status !== 'ready' || !session || !team || !board) return;
    const guard = capturePrivateContext();
    const previewIdentity = selectedConsequence.identity;
    if (!guard
      || guard.epoch !== previewIdentity.privateEpoch
      || !sameCompanionPrivateIdentity(guard.identity, {
        sessionId: previewIdentity.sessionId,
        leagueId: session.leagueId,
        seasonNumber: session.seasonNumber,
        teamId: previewIdentity.teamId,
        deviceId: previewIdentity.deviceId,
      })
      || (session.revision ?? 0) !== previewIdentity.sessionRevision
      || board.revision !== previewIdentity.boardRevision) {
      setMessage(COMPANION_STALE_COPY);
      await refreshSession();
      return;
    }
    if (!isCanonicalSnakeBoard({ slots: selectedConsequence.board.slots, candidates: boardEligibilityCandidates })) {
      setMessage('MY BOARD COULD NOT BE SAVED — THE RESULT IS NOT A LEGAL 22-PLAYER ROSTER.');
      return;
    }
    await saveBoard(selectedConsequence.board, null, guard);
  }, [board, boardEligibilityCandidates, capturePrivateContext, refreshSession, saveBoard, selectedConsequence, session, team]);

  const setSelectedZeroInterest = useCallback(async (zeroInterest: boolean) => {
    if (!selectedCandidateId || !board) return;
    const guard = capturePrivateContext();
    if (!guard || guard.identity.teamId !== team?.id) return;
    const outcome = await saveBoard(
      setSeatBoardZeroInterest(board, selectedCandidateId, zeroInterest),
      null,
      guard,
    );
    if (outcome?.privateContextStillCurrent) setAssistantOptimizePlayerId(null);
  }, [board, capturePrivateContext, saveBoard, selectedCandidateId, team?.id]);

  const pickValueChart = useMemo(() => derivePickValueChart(
    activePoolRows.map((row) => row.iv),
    session?.pickOrder.length ?? 0,
    Math.max(1, leagueTeams.length),
  ), [activePoolRows, leagueTeams.length, session?.pickOrder.length]);
  const guideRecommendationRequest = useMemo(() => {
    if (!session || !team || !seatingProofInput || guideThreatPick === null || deviceCovered) return null;
    return buildSnakeGuideRecommendationRequest({
      session,
      buyerTeamId: team.id,
      earliestThreatPick: guideThreatPick,
      pickValueChart,
      seatingProofInput,
    });
  }, [deviceCovered, guideThreatPick, pickValueChart, seatingProofInput, session, team]);
  const guideRecommendation = useSnakeGuideRecommendation(
    guideRecommendationRequest,
    assistantRequest?.key ?? null,
  );
  const draftDecision = resolveSnakeDraftDecision({
    selectedPlayerId: selectedCandidateId,
    askingTeamId: team?.id ?? null,
    livePickTeamId: session?.pickOrder[session.currentPickIndex]?.teamId ?? null,
    assistantPriorityPlayerIds,
    assistantInfeasibleReason: assistantBoardState.infeasibleReason,
    infeasibleForPlayerId,
    selected: selectedDecisionFacts,
    replacements: replacementDecisionFacts,
    risk: selectedRisk,
    scarcity: selectedScarcity,
    guide: guideRecommendation,
  });
  const guideDecisionKey = draftDecision?.kind === 'TRADE_TO_PICK'
    ? [
        draftDecision.playerId,
        draftDecision.targetPick,
        draftDecision.proposal.sessionRevision,
        draftDecision.proposal.offerPickNumbers.join(','),
        draftDecision.proposal.receivePickNumbers.join(','),
      ].join(':')
    : null;
  const currentGuideScopeKey = assistantRequest && session && team && guideDecisionKey
    ? `${assistantRequest.key}|${session.revision ?? 0}|${team.id}|${guideDecisionKey}`
    : null;
  const activeGuidePrefill = currentGuideScopeKey
    && guidePrefillState?.scopeKey === currentGuideScopeKey
      ? guidePrefillState.prefill
      : null;
  const prefillTradeDecision = useCallback((decision: Extract<SnakeDraftDecision, { kind: 'TRADE_TO_PICK' }>) => {
    if (!session || !currentGuideScopeKey || draftDecision?.kind !== 'TRADE_TO_PICK'
      || decision.playerId !== draftDecision.playerId
      || decision.targetPick !== draftDecision.targetPick) return;
    setGuidePrefillState({
      scopeKey: currentGuideScopeKey,
      prefill: prefillGuideForPackage({ session, proposal: decision.proposal }),
    });
  }, [currentGuideScopeKey, draftDecision, session]);
  const askGuide = useCallback((buyerTeamId: string, targetPick: number) => {
    if (!session || !seatingProofInput) return { message: `No legal guide trade reaches pick ${targetPick}.`, proposal: null, nextPickMoves: [] };
    return buildAskedPickGuide({ session, pickValueChart, seatingProofInput, buyerTeamId, targetPick });
  }, [pickValueChart, seatingProofInput, session]);
  const postTradeOffer = useCallback(async (proposal: SnakeGuidePackage) => {
    if (!session || !team || !liveRoom.room) return;
    const guard = capturePrivateContext();
    if (!guard || guard.identity.teamId !== team.id) return;
    try {
      if (!privateContextIsCurrent(guard)) throw new Error(COMPANION_STALE_COPY);
      if (proposal.buyerTeamId !== team.id || proposal.sessionRevision !== (session.revision ?? 0)) {
        throw new Error(COMPANION_STALE_COPY);
      }
      const offer: SnakeOpenTradeOffer = {
        id: [
          'snake-offer-live', session.id, team.id, proposal.sellerTeamId,
          proposal.targetPick, proposal.offerPickNumbers.join('-'), proposal.receivePickNumbers.join('-'),
        ].join(':'),
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
        buyerNod: true,
        sellerNod: false,
        postedAt: new Date().toISOString(),
      };
      await liveRoom.submitIntent({
        teamId: team.id,
        kind: 'trade',
        expectedRoomRevision: liveRoom.room.publicRevision,
        idempotencyKey: `trade:POST:${offer.id}:${liveRoom.room.publicRevision}`,
        payload: buildSnakeLiveTradePostPayload(offer),
      });
      if (!privateContextIsCurrent(guard)) return;
      setMessage('THE OFFER IS POSTED.');
    } catch (cause) {
      if (privateContextIsCurrent(guard)) setMessage(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  }, [capturePrivateContext, liveRoom, privateContextIsCurrent, session, team]);
  const respondToTradeOffer = useCallback(async (offerId: string, action: 'NOD' | 'WITHDRAW' | 'DECLINE') => {
    if (!session || !team || !liveRoom.room) return;
    const guard = capturePrivateContext();
    if (!guard || guard.identity.teamId !== team.id) return;
    try {
      if (!privateContextIsCurrent(guard)) throw new Error(COMPANION_STALE_COPY);
      const offer = projectedTrades.openOffers.find((entry) => entry.id === offerId);
      if (!offer || (offer.buyerTeamId !== team.id && offer.sellerTeamId !== team.id)) {
        throw new Error('THIS OFFER IS NO LONGER OPEN.');
      }
      await liveRoom.submitIntent({
        teamId: team.id,
        kind: 'trade',
        expectedRoomRevision: liveRoom.room.publicRevision,
        idempotencyKey: `trade:${action}:${offer.id}:${team.id}:${liveRoom.room.publicRevision}`,
        payload: buildSnakeLiveTradeActionPayload(action, offer),
      });
      if (!privateContextIsCurrent(guard)) return;
      setMessage(action === 'NOD' ? 'YOUR NOD IS RECORDED.' : 'THE OFFER IS CLOSED.');
    } catch (cause) {
      if (privateContextIsCurrent(guard)) setMessage(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  }, [capturePrivateContext, liveRoom, privateContextIsCurrent, projectedTrades.openOffers, session, team]);
  const submitPickRequest = useCallback(async (playerId: string) => {
    if (!session || !team || !liveRoom.room) return;
    const guard = capturePrivateContext();
    if (!guard || guard.identity.teamId !== team.id) return;
    try {
      if (!privateContextIsCurrent(guard)) throw new Error(COMPANION_STALE_COPY);
      const livePick = session.pickOrder[session.currentPickIndex];
      if (!livePick || livePick.teamId !== team.id) throw new Error('THIS CLUB IS NOT ON THE CLOCK.');
      const submittedAt = new Date().toISOString();
      await liveRoom.submitIntent({
        teamId: guard.identity.teamId,
        kind: 'pick',
        expectedRoomRevision: liveRoom.room.publicRevision,
        idempotencyKey: `pick:${session.id}:${liveRoom.room.publicRevision}:${team.id}:${playerId}`,
        payload: {
          playerId,
          pick: livePick.pick,
          submittedAt,
          sessionRevision: session.revision ?? 0,
        },
      });
      if (!privateContextIsCurrent(guard)) return;
      setMessage('PICK SENT TO HOTSEAT.');
    } catch (cause) {
      if (privateContextIsCurrent(guard)) {
        setMessage(cause instanceof Error ? cause.message : String(cause));
        await refreshSession();
      }
    }
  }, [capturePrivateContext, liveRoom, privateContextIsCurrent, refreshSession, session, team]);

  if (!snakeEnabled()) return <main className="ballpark-page"><h1 className="ballpark-title">PAGE NOT FOUND</h1></main>;
  if (auth.isLoading) return <main className="ballpark-page"><p>CHECKING YOUR ACCOUNT…</p></main>;
  if (!auth.isAuthenticated) return <CompanionSignInScreen error={auth.error} onSignIn={auth.signIn} />;
  if (liveRoom.status === 'connecting' && !session) return <main className="ballpark-page"><p>OPENING THE LIVE ROOM…</p></main>;
  if (!approved || !session) {
    return <>
      <CompanionClaimScreen
        pending={activeClaim?.status === 'pending'}
        message={message ?? liveRoom.error}
        accountEmail={auth.user?.email ?? ''}
        onSignOut={signOut}
        onClaim={claimDesk}
      />
      {activeClaim && session ? <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default fixed bottom-4 right-4 min-h-11" onClick={() => void forgetCurrentRoom()}>FORGET ROOM</button> : null}
    </>;
  }
  if (liveRoom.room?.status === 'closed' && team) {
    return <CompanionCompletedScreen teamName={team.name} onLeave={forgetCurrentRoom} onSignOut={signOut} />;
  }
  if (deviceCovered) {
    const coveredTeam = leagueTeams.find((entry) => entry.id === activeTeamId);
    return <CompanionCoveredScreen openTeamName={coveredTeam?.name} onReturn={returnToDesk} onSignOut={signOut} onForgetRoom={forgetCurrentRoom} message={message ?? liveRoom.error} />;
  }
  if (!team || !league || !catalog) return <main className="ballpark-page"><section className="ballpark-panel">
    <h1 className="ballpark-title">PLAYER DATA IS NOT READY</h1>
    <p className="mt-3" role="alert">{liveRoom.error ?? 'THE LIVE PLAYER CATALOG IS INVALID.'}</p>
    <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default mt-4 min-h-11" onClick={() => void forgetCurrentRoom()}>FORGET ROOM</button>
  </section></main>;
  if (isCompanionDraftComplete(session)) {
    return <CompanionCompletedScreen teamName={team.name} onLeave={forgetCurrentRoom} onSignOut={signOut} />;
  }
  if (isCompanionPicksComplete(session)) {
    return <CompanionAwaitingCommissionerScreen teamName={team.name} onCover={coverDevice} onSignOut={signOut} />;
  }
  if (!pool || !board || !deskState) return <main className="ballpark-page"><section className="ballpark-panel"><h1 className="ballpark-title">YOUR DESK IS NOT READY</h1><p className="mt-3">WAIT FOR THE HOST TO OPEN THIS DESK.</p><button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default mt-4 min-h-11" onClick={() => void refreshSession()}>REFRESH LIVE ROOM</button><button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default ml-2 mt-4 min-h-11" onClick={() => void forgetCurrentRoom()}>FORGET ROOM</button></section></main>;

  const ticker = session.completedPicks.slice(-6).reverse().map((pick) => {
    const pickTeam = leagueTeams.find((entry) => entry.id === pick.teamId);
    const player = playerById.get(pick.playerId);
    return `${(pickTeam?.name ?? UNKNOWN_TEAM).toUpperCase()} SELECTED ${(player ? fullName(player.firstName, player.lastName) : UNKNOWN_PLAYER).toUpperCase()}`;
  });
  const liveSlot = session.pickOrder[session.currentPickIndex];
  const pickRequest = liveRoom.room && team
    ? pendingPickIntent({ intents: liveRoom.intents, teamId: team.id, publicRevision: liveRoom.room.publicRevision })
    : null;
  return <SnakeCompanionFrame
    team={{ id: team.id, name: team.name, abbreviation: team.abbreviation, logoUrl: team.logoUrl, colors: team.colors }}
    authorizedTeams={approvedClaims.flatMap((claim) => {
      const entry = leagueTeams.find((candidate) => candidate.id === claim.teamId);
      return entry ? [{ id: entry.id, name: entry.name }] : [];
    })}
    onSwitchTeam={switchActiveTeam}
    currentPick={session.pickOrder[session.currentPickIndex]?.pick ?? session.currentPickIndex + 1}
    onClockTeam={(() => {
      const liveTeam = leagueTeams.find((entry) => entry.id === liveSlot?.teamId);
      return liveTeam ? { name: liveTeam.name, colors: liveTeam.colors } : undefined;
    })()}
    order={session.pickOrder.slice(session.currentPickIndex, session.currentPickIndex + 8).map((slot) => ({ pick: slot.pick, teamName: leagueTeams.find((entry) => entry.id === slot.teamId)?.name ?? UNKNOWN_TEAM }))}
    ticker={ticker}
    message={message ?? liveRoom.error}
    onCover={coverDevice}
    helpNotes={['TRADE PICKS OPENS ONLY THIS CLUB\'S PRIVATE GUIDE.']}
    selectedPlayer={selectedCandidate && selectedStoredPlayer ? <SelectedPlayerCard
      player={selectedStoredPlayer}
      candidate={selectedCandidate}
      consequence={selectedConsequence}
      teamLogoUrl={safeCompanionLogoUrl(team.logoUrl) ?? undefined}
      teamName={team.name}
      onOptimizeAround={() => {
        setAssistantOptimizePlayerId(selectedCandidateId);
        setAssistantOptimizeRevision((revision) => revision + 1);
      }}
      onKeep={() => { void keepSelectedConsequence(); }}
      zeroInterest={board.rankings.zeroInterestPlayerIds?.includes(selectedCandidateId ?? '') ?? false}
      onSetZeroInterest={(zeroInterest) => { void setSelectedZeroInterest(zeroInterest); }}
      actionConsequence={selectedFinishSafety?.status === 'DRAFTABLE'
        ? `LEGAL 22 · $${Math.round(selectedFinishSafety.finalSalary ?? 0).toLocaleString()} SALARY · $${Math.round(selectedFinishSafety.finalTax ?? 0).toLocaleString()} TAX · $${Math.round(selectedFinishSafety.moneyLeft ?? 0).toLocaleString()} LEFT.`
        : selectedFinishSafety?.status === 'OPEN' ? selectedFinishSafety.message : null}
      blockReason={selectedFinishSafety?.status === 'BLOCKED'
        ? selectedFinishSafety.message
        : !selectedFinishSafety ? (finishSafety.status === 'pending' ? 'FINISH CHECK CALCULATING.' : 'FINISH PROOF UNAVAILABLE.') : null}
      draftAction={liveSlot?.teamId === team.id ? (
        pickRequest ? (
          <span className="flex min-h-11 items-center border-2 border-[var(--ballpark-brass)] px-3 text-xs font-black" data-testid="companion-pick-waiting">PICK #{liveSlot.pick} WAITING FOR HOTSEAT</span>
        ) : (
          <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11" disabled={Boolean(session.paused) || !selectedFinishSafety || selectedFinishSafety.status === 'BLOCKED'} onClick={() => void submitPickRequest(selectedCandidate.id)}>SEND PICK TO HOTSEAT</button>
        )
      ) : undefined}
      decision={draftDecision}
      onTradeDecision={prefillTradeDecision}
    /> : undefined}
    draftedTruth={<DraftTruthStrip
      title="DRAFTED ROSTER"
      ledger={deskState.draftedLedger}
      chemistry={deskState.draftedChemistry}
      testId="companion-drafted-truth"
    />}
    privateDesk={(showHelp) => <>
      {boardUndo
        && sameCompanionPrivateIdentity(boardUndo.identity, currentPrivateIdentity)
        && boardUndo.expectedBoardRevision === board.revision ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--ballpark-status-warn)] bg-[var(--ballpark-warn-panel)] p-3" data-testid="companion-board-update-banner">
          <p className="font-bold" role="status">MY BOARD UPDATED — {boardUndo.changedSlotCount} SLOT{boardUndo.changedSlotCount === 1 ? '' : 'S'} CHANGED.</p>
          <button
            type="button"
            className="ballpark-press-button ballpark-press-sm ballpark-press-action min-h-11"
            disabled={undoWorking}
            onClick={() => void undoBoardUpdate()}
          >{undoWorking ? 'UNDOING…' : 'UNDO BOARD UPDATE'}</button>
        </div>
      ) : null}
      {teamAlignment ? (
        <section
          className="mb-3 border-2 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3"
          aria-label="Private roster archetype alignment"
          data-testid="companion-private-roster-alignment"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 font-black">
            <span>ARCHETYPE ALIGNMENT · {teamAlignment.alignmentGrade}</span>
            <span>
              ROOM {snakeDraftAlignmentRoomRank(liveAlignment, teamAlignment.teamId) ?? '—'}/{liveAlignment.length}
              {' · '}FAN {teamAlignment.delta >= 0 ? '+' : ''}{teamAlignment.delta}
            </span>
          </div>
          <p className="mt-1 text-[10px] font-bold text-[var(--ballpark-chalk)]/70">
            {teamAlignment.pickCount}/22 PICKS · FIT {teamAlignment.alignmentScore.toFixed(3)}
          </p>
          {showHelp ? (
            <p className="mt-2 border-t border-[var(--ballpark-brass)]/40 pt-2 text-xs font-bold">
              FAN IS THE LIVE SNAKE-DRAFT PROJECTION FROM THIS CLUB'S CUMULATIVE ARCHETYPE FIT.
            </p>
          ) : null}
        </section>
      ) : null}
      <PrivateDesk
      candidates={deskState.candidates}
      rankings={board.rankings.byPosition ?? {}}
      overallRankings={board.rankings.global ?? []}
      boardSlots={board.slots}
      brokenSlots={deskState.brokenSlots}
      planBill={deskState.planBill}
      planChemistry={deskState.planChemistry}
      draftedChemistry={deskState.draftedChemistry}
      assistantNeed={deskState.assistantNeed ?? undefined}
      logScopeId={team.id}
      advisorLog={deskState.advisorLog}
      taxCoreRows={deskState.taxCoreRows}
      assistantTaxCoreRows={assistantTaxCoreRows}
      slotDepth={deskState.slotDepth}
      assistantBoard={assistantBoardState}
      assistantOptimizationKey={assistantOptimizePlayerId
        ? `${currentPrivateScopeKey ?? team.id}:${assistantOptimizePlayerId}:${assistantOptimizeRevision}`
        : null}
      assistantOptimizationLabel={assistantOptimizePlayerId
        ? `OPTIMIZED FOR ${deskState.candidates.find((entry) => entry.id === assistantOptimizePlayerId)?.name ?? 'SELECTED PLAYER'}`
        : null}
      privateScopeKey={currentPrivateScopeKey ?? undefined}
      tradePrefillKey={activeGuidePrefill?.key ?? null}
      showHelp={showHelp}
      selectedCandidateId={selectedCandidateId}
      onSelectCandidate={selectCandidate}
      onReorder={(position, orderedIds) => { void reorder(position, orderedIds); }}
      onReorderOverall={(orderedIds) => { void reorder('OVERALL', orderedIds); }}
      draftLog={session.completedPicks.map((pick) => {
        const pickedPlayer = playerById.get(pick.playerId);
        return {
          pick: pick.pick,
          teamName: leagueTeams.find((entry) => entry.id === pick.teamId)?.name ?? UNKNOWN_TEAM,
          playerId: pick.playerId,
          playerName: pickedPlayer ? fullName(pickedPlayer.firstName, pickedPlayer.lastName).toUpperCase() : UNKNOWN_PLAYER,
          position: pickedPlayer?.primaryPosition ?? '—',
        };
      })}
      teamColors={team.colors}
      tradeGuide={<SnakeTradeGuide
        teams={leagueTeams.map((entry) => ({ id: entry.id, name: entry.name }))}
        fixedBuyerTeamId={team.id}
        pickValueChart={pickValueChart}
        sessionRevision={session.revision ?? 0}
        privateScopeKey={currentPrivateScopeKey}
        onAsk={askGuide}
        onPost={postTradeOffer}
        openOffers={projectedTrades.openOffers.filter((offer) => offer.phase === 'MLB' && (offer.buyerTeamId === team.id || offer.sellerTeamId === team.id))}
        onNod={(offerId) => respondToTradeOffer(offerId, 'NOD')}
        onClose={(offerId, action) => respondToTradeOffer(offerId, action === 'WITHDRAWN' ? 'WITHDRAW' : 'DECLINE')}
        prefill={activeGuidePrefill}
      />}
      />
    </>}
  />;
}
