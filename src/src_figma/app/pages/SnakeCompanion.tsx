import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { HISTORICAL_ARCHETYPES } from '../../../data/historicalArchetypes';
import { auctionMarginalTaxWithCaps } from '../../../engines/auctionLuxuryTax';
import { snakeLuxuryCaps } from '../../../engines/snakeLuxuryTax';
import { computeOwnValue } from '../../../engines/auctionMarketModel';
import { historicalToSimArchetype } from '../../../engines/draftabilityRanker';
import { derivePickValueChart } from '../../../engines/leagueConstruction';
import { evaluateSnakeLegalFinish, evaluateSnakePlan } from '../../../engines/snakeEconomics';
import { applyCanonicalSnakeRiskTriggers, canonicalSnakeRoleDepth } from '../../../engines/snakeRationalRoom';
import type { SimultaneousSnakeSeatingInput, SnakeSeatingPlayer } from '../../../engines/snakeSeatingProof';
import { unavailableVersionPlayerIds } from '../../../engines/snakeVersioning';
import { rosterNeedBreakdown, toRosterSlotPlayer } from '../../../engines/rosterNeed';
import { assembleBoard } from '../../../engines/rosterIntelligencePayload';
import * as phaseFlags from '../../../utils/franchisePhase2Flags';
import { syncEngine } from '../../../utils/syncEngine';
import {
  getAllLeagueTemplates,
  getMlbDraftSession as readMlbDraftSession,
  patchApprovedCompanionSeatBoard,
  patchMlbDraftSessionSnakeCompanions,
  postApprovedCompanionTradeOffer,
  respondApprovedCompanionTradeOffer,
  submitApprovedCompanionPickRequest,
  SNAKE_BOARD_SLOT_IDS,
  type LeagueBuilderMlbDraftSession,
  type SnakeBoardSlotId,
  type SnakeSeatBoardRecord,
} from '../../../utils/leagueBuilderStorage';
import { useAuth } from '../../../hooks/useAuth';
import { useLeagueBuilderData, toConstructionPlayer } from '../../hooks/useLeagueBuilderData';
import { CompanionClaimScreen } from '../components/snake/companion/CompanionClaimScreen';
import { CompanionSignInScreen } from '../components/snake/companion/CompanionSignInScreen';
import {
  CompanionAwaitingCommissionerScreen,
  CompanionCompletedScreen,
  CompanionCoveredScreen,
  SnakeCompanionFrame,
} from '../components/snake/companion/SnakeCompanionFrame';
import { safeCompanionLogoUrl } from '../components/snake/companion/companionFrameModel';
import { sameDraftSessionSnapshot, startCompanionFreshness } from '../components/snake/companion/companionFreshness';
import { runCompanionTradeWrite } from '../components/snake/companion/companionTradeWrite';
import {
  approvedClaimForDevice,
  claimForDevice,
  COMPANION_DRAFT_COMPLETE_COPY,
  COMPANION_STALE_COPY,
  isCompanionDraftComplete,
  isCompanionPicksComplete,
  isCompanionRoomOpen,
  selectCompanionRecoverySession,
  submitCompanionClaim,
} from '../components/snake/companion/companionModel';
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
  type DeskCandidate,
} from '../components/snake/desk/deskModel';
import {
  buildDeskRoomPlayer,
  buildRationalSeats,
  fitWord,
  openRosterSlots,
  resolveLockedSeat,
} from '../components/snake/desk/deskRoomModel';
import {
  buildSelectedPlayerConsequence,
  buildSnakeAssistantBoardRequest,
  buildSnakeAssistantLivePlayer,
  type SelectedPlayerConsequence,
} from '../components/snake/desk/snakeDeskIntelligenceModel';
import { useSnakeAssistantBoard } from '../components/snake/desk/useSnakeAssistantBoard';
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
import type { SnakeRankingView } from '../components/snake/desk/RankingsView';
import { SnakeTradeGuide } from '../components/snake/trade/SnakeTradeGuide';
import {
  guideForAskedPick as buildAskedPickGuide,
  prefillGuideForPackage,
  type SnakeTradeGuidePrefill,
} from '../components/snake/trade/tradeGuideModel';

const SEASON_NUMBER = 1;
const DEVICE_KEY = 'kbl-snake-companion-device-id';
const DEVICE_COVERED_KEY = 'kbl-snake-companion-device-covered';
const DEVICE_COVER_EVENT = 'kbl-snake-companion-device-cover-change';
const LEFT_SESSIONS_KEY = 'kbl-snake-companion-left-session-ids';
const FRESHNESS_MS = 5_000;
const NO_OPEN_ROOM_COPY = 'NO OPEN SNAKE ROOM FOUND ON THIS ACCOUNT.';
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
): CompanionPrivateIdentity | null {
  if (!source) return null;
  const claim = approvedClaimForDevice(source, ownDeviceId);
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

function deviceId(): string {
  const saved = localStorage.getItem(DEVICE_KEY);
  if (saved) return saved;
  const created = globalThis.crypto?.randomUUID?.() ?? `companion-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function readLeftSessionIds(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEFT_SESSIONS_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []);
  } catch {
    return new Set();
  }
}

function rememberLeftSession(sessionId: string): void {
  const next = [...readLeftSessionIds().add(sessionId)].slice(-24);
  localStorage.setItem(LEFT_SESSIONS_KEY, JSON.stringify(next));
}

function rememberReclaimedSession(sessionId: string): void {
  const next = [...readLeftSessionIds()].filter((id) => id !== sessionId);
  localStorage.setItem(LEFT_SESSIONS_KEY, JSON.stringify(next));
}

function broadcastDeviceCover(covered: boolean): void {
  if (covered) localStorage.setItem(DEVICE_COVERED_KEY, 'true');
  else localStorage.removeItem(DEVICE_COVERED_KEY);
  window.dispatchEvent(new CustomEvent<boolean>(DEVICE_COVER_EVENT, { detail: covered }));
}

export default function SnakeCompanion() {
  const auth = useAuth();
  const {
    leagues, teams, players, isLoading, error,
    getRegisteredPool, getMlbDraftSession, refresh,
  } = useLeagueBuilderData();
  const [ownDeviceId] = useState(deviceId);
  const [session, setSession] = useState<LeagueBuilderMlbDraftSession | null>(null);
  const [deviceCovered, setDeviceCovered] = useState(() => localStorage.getItem(DEVICE_COVERED_KEY) === 'true');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [poolResult, setPoolResult] = useState<{
    leagueId: string;
    value: Awaited<ReturnType<typeof getRegisteredPool>>;
  } | null>(null);
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
  const [pullState, setPullState] = useState<{
    userId: string;
    status: 'complete' | 'error';
  } | null>(null);
  const [pullAttempt, setPullAttempt] = useState(0);
  const [roomAvailabilityResult, setRoomAvailabilityResult] = useState<{
    key: string;
    value: 'open' | 'empty';
  } | null>(null);
  const pulledUserId = useRef<string | null>(null);
  const privacyEpochRef = useRef(0);
  const deviceCoveredRef = useRef(deviceCovered);
  const privateIdentityRef = useRef<CompanionPrivateIdentity | null>(null);
  const privateIdentityKeyRef = useRef<string | null>(null);
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
  const authenticatedUserId = auth.isAuthenticated ? auth.user?.id ?? null : null;
  const initialPull = authenticatedUserId && pullState?.userId === authenticatedUserId
    ? pullState.status
    : 'idle';
  const roomAvailabilityKey = `${authenticatedUserId ?? 'signed-out'}|${pullAttempt}|${leagues.map((league) => league.id).join('|')}`;
  const roomAvailability = roomAvailabilityResult?.key === roomAvailabilityKey
    ? roomAvailabilityResult.value
    : 'checking';
  const pool = session && poolResult?.leagueId === session.leagueId ? poolResult.value : null;
  const sessionLeagueId = session?.leagueId ?? null;

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

  useEffect(() => {
    const userId = authenticatedUserId;
    if (!userId) {
      pulledUserId.current = null;
      return;
    }
    if (pulledUserId.current === userId) return;
    pulledUserId.current = userId;
    let cancelled = false;
    void syncEngine.pull({ throwOnError: true })
      .then(refresh)
      .then(() => {
        if (!cancelled) setPullState({ userId, status: 'complete' });
      })
      .catch((cause) => {
        if (cancelled) return;
        pulledUserId.current = null;
        setMessage(cause instanceof Error ? cause.message : String(cause));
        setPullState({ userId, status: 'error' });
      });
    return () => { cancelled = true; };
  }, [authenticatedUserId, pullAttempt, refresh]);

  const findDeviceSession = useCallback(async () => {
    const left = readLeftSessionIds();
    const freshLeagues = await getAllLeagueTemplates();
    const sessions = (await Promise.all(freshLeagues.map((league) => (
      readMlbDraftSession(league.id, SEASON_NUMBER)
    )))).filter((candidate): candidate is LeagueBuilderMlbDraftSession => Boolean(candidate));
    return selectCompanionRecoverySession({
      sessions,
      deviceId: ownDeviceId,
      forgottenSessionIds: left,
    });
  }, [ownDeviceId]);

  const hasOpenRoom = useCallback(async () => {
    const freshLeagues = await getAllLeagueTemplates();
    for (const league of freshLeagues) {
      const candidate = await readMlbDraftSession(league.id, SEASON_NUMBER);
      if (isCompanionRoomOpen(candidate)) return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated || initialPull !== 'complete' || isLoading) return;
    let cancelled = false;
    void hasOpenRoom()
      .then((open) => {
        if (!cancelled) setRoomAvailabilityResult({ key: roomAvailabilityKey, value: open ? 'open' : 'empty' });
      })
      .catch((cause) => { if (!cancelled) setMessage(cause instanceof Error ? cause.message : String(cause)); });
    return () => { cancelled = true; };
  }, [auth.isAuthenticated, hasOpenRoom, initialPull, isLoading, roomAvailabilityKey]);

  useEffect(() => {
    if (!auth.isAuthenticated || initialPull !== 'complete' || isLoading || deviceCovered) return;
    const requestEpoch = privacyEpochRef.current;
    void findDeviceSession().then((found) => {
      if (privacyEpochRef.current === requestEpoch && !deviceCoveredRef.current) setSession(found);
    }).catch((cause) => {
      if (privacyEpochRef.current === requestEpoch && !deviceCoveredRef.current) {
        setMessage(cause instanceof Error ? cause.message : String(cause));
      }
    });
  }, [auth.isAuthenticated, deviceCovered, findDeviceSession, initialPull, isLoading]);

  const refreshSession = useCallback(async () => {
    const requestEpoch = privacyEpochRef.current;
    try {
      await syncEngine.pull({ throwOnError: true });
      if (privacyEpochRef.current !== requestEpoch || deviceCoveredRef.current) return;
      if (session) {
        const fresh = await readMlbDraftSession(session.leagueId, session.seasonNumber);
        if (privacyEpochRef.current === requestEpoch && !deviceCoveredRef.current) {
          setSession((current) => {
            if (!current || !fresh) return fresh;
            if ((fresh.revision ?? 0) < (current.revision ?? 0)) return current;
            return sameDraftSessionSnapshot(current, fresh) ? current : fresh;
          });
        }
      } else {
        const recovered = await findDeviceSession();
        const open = await hasOpenRoom();
        if (privacyEpochRef.current === requestEpoch && !deviceCoveredRef.current) {
          setSession(recovered);
          setRoomAvailabilityResult({ key: roomAvailabilityKey, value: open ? 'open' : 'empty' });
        }
      }
    } catch (cause) {
      if (privacyEpochRef.current !== requestEpoch || deviceCoveredRef.current) return;
      const detail = cause instanceof Error ? cause.message : String(cause);
      setMessage(`LIVE ROOM SYNC FAILED — ${detail}`);
    }
  }, [findDeviceSession, hasOpenRoom, roomAvailabilityKey, session]);

  useEffect(() => {
    if (!auth.isAuthenticated
      || initialPull !== 'complete'
      || deviceCovered) return;
    return startCompanionFreshness({ pullAndRefresh: refreshSession, intervalMs: FRESHNESS_MS });
  }, [auth.isAuthenticated, deviceCovered, initialPull, refreshSession]);

  useEffect(() => {
    if (!sessionLeagueId) return;
    const requestEpoch = privacyEpochRef.current;
    void getRegisteredPool(sessionLeagueId)
      .then((value) => {
        if (privacyEpochRef.current === requestEpoch) setPoolResult({ leagueId: sessionLeagueId, value });
      })
      .catch((cause) => {
        if (privacyEpochRef.current === requestEpoch && !deviceCoveredRef.current) {
          setMessage(cause instanceof Error ? cause.message : String(cause));
        }
      });
  }, [getRegisteredPool, sessionLeagueId]);

  const claimDesk = useCallback(async (gmName: string, roomCode: string) => {
    invalidatePrivateContext();
    try {
      await syncEngine.pull({ throwOnError: true });
      await refresh();
      const freshLeagues = await getAllLeagueTemplates();
      let foundOpenRoom = false;
      for (const league of freshLeagues) {
        const candidate = await readMlbDraftSession(league.id, SEASON_NUMBER);
        if (isCompanionRoomOpen(candidate)) foundOpenRoom = true;
        if (!isCompanionRoomOpen(candidate)) continue;
        if (candidate?.snakeCompanions?.roomCode !== roomCode) continue;
        let claimMessage = 'ASK THE MAIN DEVICE TO APPROVE THIS DESK.';
        const saved = await patchMlbDraftSessionSnakeCompanions({
          leagueId: candidate.leagueId,
          seasonNumber: candidate.seasonNumber,
          patch: (current, freshSession) => {
            const result = submitCompanionClaim(
              { ...freshSession, snakeCompanions: current },
              { deviceId: ownDeviceId, gmName, roomCode },
            );
            if (!result.ok || !result.session?.snakeCompanions) throw new Error(result.message);
            claimMessage = result.message;
            return result.session.snakeCompanions;
          },
        });
        rememberReclaimedSession(saved.id);
        setSession(saved);
        setMessage(claimMessage);
        return;
      }
      setMessage(foundOpenRoom ? 'THAT ROOM CODE DOES NOT MATCH.' : NO_OPEN_ROOM_COPY);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }, [invalidatePrivateContext, ownDeviceId, refresh]);

  const authSignOut = auth.signOut;
  const signOut = useCallback(async () => {
    deviceCoveredRef.current = true;
    invalidatePrivateContext();
    await authSignOut();
    pulledUserId.current = null;
    setPullState(null);
    setRoomAvailabilityResult(null);
    setSession(null);
    setPoolResult(null);
  }, [authSignOut, invalidatePrivateContext]);

  const coverDevice = useCallback(() => {
    broadcastDeviceCover(true);
  }, []);

  const returnToDesk = useCallback(async () => {
    deviceCoveredRef.current = true;
    invalidatePrivateContext();
    const recoveryEpoch = privacyEpochRef.current;
    try {
      await syncEngine.pull({ throwOnError: true });
      const recovered = await findDeviceSession();
      if (privacyEpochRef.current !== recoveryEpoch || !deviceCoveredRef.current) return;
      broadcastDeviceCover(false);
      setSession(recovered);
    } catch (cause) {
      if (privacyEpochRef.current === recoveryEpoch) {
        setMessage(cause instanceof Error ? cause.message : String(cause));
      }
    }
  }, [findDeviceSession, invalidatePrivateContext]);

  const forgetCurrentRoom = useCallback(async () => {
    if (!session) return;
    invalidatePrivateContext();
    rememberLeftSession(session.id);
    setSession(null);
    setPoolResult(null);
    const open = await hasOpenRoom();
    setRoomAvailabilityResult({ key: roomAvailabilityKey, value: open ? 'open' : 'empty' });
  }, [hasOpenRoom, invalidatePrivateContext, roomAvailabilityKey, session]);

  const approved = session ? approvedClaimForDevice(session, ownDeviceId) : null;
  const activeClaim = session ? claimForDevice(session, ownDeviceId) : null;
  const league = leagues.find((entry) => entry.id === session?.leagueId) ?? null;
  const leagueTeams = useMemo(() => league?.teamIds.flatMap((id) => {
    const team = teams.find((entry) => entry.id === id);
    return team ? [team] : [];
  }) ?? [], [league, teams]);
  const team = leagueTeams.find((entry) => entry.id === approved?.teamId) ?? null;
  const currentPrivateIdentity = team ? companionPrivateIdentity(session, ownDeviceId) : null;
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
  useLayoutEffect(() => {
    setSelectedPlayerId(null);
    setMessage(null);
    setAssistantOptimizePlayerId(null);
    setBoardUndo(null);
    undoOperationRef.current = null;
    setUndoWorking(false);
  }, [currentPrivateIdentityKey]);
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
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
  const board = team ? session?.seatBoards?.[team.id] ?? null : null;

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
    const candidates: DeskCandidate[] = deskPlayers.flatMap((entry) => {
      const advisorWorth = advisorWorthById.get(entry.playerId);
      if (!contextualWorthComplete || !Number.isFinite(advisorWorth)) return [];
      const marginalTax = auctionMarginalTaxWithCaps(ownSeat.roster.map((row) => row.construction), entry.construction, locked.capIdentity, caps);
      const risk = riskById.get(entry.playerId);
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
        marginalTax,
        trueCost: entry.price + marginalTax,
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
        legalFinishLine: '',
        construction: entry.construction,
        drafted: unavailable.has(entry.playerId),
      }];
    });
    const brokenSlots = SNAKE_BOARD_SLOT_IDS.filter((slotId) => !board.slots[slotId] || unavailable.has(board.slots[slotId]));
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
    const draftedMoneyComplete = draftedPlayersComplete && teamPicks.every((pick) => Number.isFinite(
      pick.settledSalary ?? poolById.get(pick.playerId)?.iv,
    ));
    const cheapestFinish = draftedMoneyComplete ? evaluateSnakeLegalFinish({
      currentRoster: ownSeat.roster,
      committedSpent: ownSeat.committedSpent,
      availablePool: available,
      budget: pool.tierCap,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
      capIdentity: locked.capIdentity,
    }) : null;
    const cheapestDepthByPlayerId = new Map((cheapestFinish?.completionPlayerIds ?? []).flatMap((playerId) => {
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
      return [slotId, position ? (board.rankings.byPosition?.[position] ?? []).filter((id) => !unavailable.has(id)).length : 0];
    }));
    return {
      assistantWorthComplete: candidates.length === deskPlayers.length,
      candidates: displayCandidates, brokenSlots, planBill, slotDepth,
      draftedLedger,
      draftedChemistry,
      planChemistry,
      assistantNeed: draftedPlayersComplete ? need : null,
      taxCoreRows: buildTaxCoreRows({ candidates, boardPlayerIds: Object.values(board.slots), caps }),
      advisorLog: brokenSlots.map((slotId) => ({ key: `broken:${slotId}`, text: `YOUR ${slotId} PLAN IS BROKEN — YOUR RANKING HAS NO AVAILABLE NAME.`, actionable: true })),
    };
  }, [activePoolRows, askedRiskIds, board, boardEligibilityCandidates, deskById, deskPlayers, leagueTeams, playerById, pool, poolById, rationalRiskState.risks, rationalRiskState.status, session, team, unavailable]);

  const defaultSelectedPlayerId = useMemo(() => {
    if (!board || !deskState) return null;
    return (board.rankings.global ?? []).find((id) => (
      !unavailable.has(id) && deskState.candidates.some((candidate) => candidate.id === id)
    )) ?? deskState.candidates.find((candidate) => !unavailable.has(candidate.id))?.id ?? null;
  }, [board, deskState, unavailable]);
  const selectedCandidateId = selectedPlayerId
    && !unavailable.has(selectedPlayerId)
    && deskState?.candidates.some((candidate) => candidate.id === selectedPlayerId)
      ? selectedPlayerId
      : defaultSelectedPlayerId;
  const selectedCandidate = deskState?.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;
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
        tier: league.tier ?? 'juiced',
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: resolveLockedSeat({ team, session }).capIdentity,
      },
      savedDesignSlots: team.rosterDesign?.slots,
    });
  }, [assistantIdentity, assistantLivePlayers, assistantOptimizePlayerId, board, deskState, deviceCovered, league, leagueTeams.length, pool, session, team]);
  const assistantBoardState = useSnakeAssistantBoard(assistantRequest);
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
  const selectedConsequence = useMemo<SelectedPlayerConsequence | null>(() => {
    if (!assistantIdentity || !session || !pool || !team || !board || !deskState) return null;
    return buildSelectedPlayerConsequence({
      identity: assistantIdentity,
      selectedPlayerId: selectedCandidateId,
      teamId: team.id,
      board,
      designSlots: team.rosterDesign?.slots,
      players: consequencePlayers,
      completedPicks: session.completedPicks.map((pick) => ({
        teamId: pick.teamId,
        playerId: pick.playerId,
        settledSalary: pick.settledSalary,
      })),
      versionState: session.versionState,
      versionSelections: session.snakeSetup?.versionSelections,
      budget: pool.tierCap,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
      capIdentity: resolveLockedSeat({ team, session }).capIdentity,
    });
  }, [assistantIdentity, board, consequencePlayers, deskState, leagueTeams.length, pool, selectedCandidateId, session, team]);

  const selectedRisk = useMemo(() => rationalRiskState.status === 'ready' && selectedCandidateId
    ? rationalRiskState.risks?.find((row) => row.playerId === selectedCandidateId) ?? null
    : null, [rationalRiskState.risks, rationalRiskState.status, selectedCandidateId]);
  const selectedScarcity = useMemo(() => rationalRiskState.status === 'ready' && selectedCandidateId
    ? rationalRiskState.scarcity?.filter((row) => row.playerId === selectedCandidateId) ?? null
    : null, [rationalRiskState.scarcity, rationalRiskState.status, selectedCandidateId]);
  const selectedDecisionFacts = useMemo(() => buildSnakeDecisionCandidateFacts({
    playerId: selectedCandidateId ?? '',
    candidate: selectedCandidate,
    consequence: selectedConsequence,
  }), [selectedCandidate, selectedCandidateId, selectedConsequence]);
  const replacementDecisionFacts = useMemo(() => {
    if (!assistantIdentity || !session || !pool || !team || !board || !deskState
      || !selectedCandidateId || !selectedScarcity || deviceCovered) return null;
    const candidatesById = new Map(deskState.candidates.map((candidate) => [candidate.id, candidate]));
    const replacementIds = [...new Set(selectedScarcity.flatMap((row) => (
      row.replacementState === 'AVAILABLE'
      && row.replacementPlayerId
      && row.replacementPlayerId !== selectedCandidateId
      && !unavailable.has(row.replacementPlayerId)
        ? [row.replacementPlayerId]
        : []
    )))];
    return replacementIds.flatMap((replacementId) => {
      const consequence = buildSelectedPlayerConsequence({
        identity: assistantIdentity,
        selectedPlayerId: replacementId,
        teamId: team.id,
        board,
        designSlots: team.rosterDesign?.slots,
        players: consequencePlayers,
        completedPicks: session.completedPicks.map((pick) => ({
          teamId: pick.teamId,
          playerId: pick.playerId,
          settledSalary: pick.settledSalary,
        })),
        versionState: session.versionState,
        versionSelections: session.snakeSetup?.versionSelections,
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: resolveLockedSeat({ team, session }).capIdentity,
      });
      return buildSnakeDecisionCandidateFacts({
        playerId: replacementId,
        candidate: candidatesById.get(replacementId) ?? null,
        consequence,
      }) ?? [];
    });
  }, [assistantIdentity, board, consequencePlayers, deskState, deviceCovered, leagueTeams.length, pool, selectedCandidateId, selectedScarcity, session, team, unavailable]);
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
  ): Promise<{ saved: LeagueBuilderMlbDraftSession; privateContextStillCurrent: boolean } | null> => {
    if (!session || !board || !team) return null;
    if (!isCanonicalSnakeBoard({ slots: nextBoard.slots, candidates: boardEligibilityCandidates })) {
      if (privateContextIsCurrent(guard)) {
        setMessage('MY BOARD COULD NOT BE SAVED — THE RESULT IS NOT A LEGAL 22-PLAYER ROSTER.');
      }
      return null;
    }
    try {
      await syncEngine.pull({ throwOnError: true });
      const saved = await patchApprovedCompanionSeatBoard({
        leagueId: session.leagueId,
        seasonNumber: session.seasonNumber,
        deviceId: ownDeviceId,
        teamId: team.id,
        board: nextBoard,
        expectedBoardRevision: board.revision,
      });
      const guardStillCurrent = privateContextIsCurrent(guard);
      const privateContextStillCurrent = guardStillCurrent
        && sameCompanionPrivateIdentity(companionPrivateIdentity(saved, ownDeviceId), guard.identity);
      if (privateContextStillCurrent) {
        setSession(saved);
        if (successMessage) setMessage(successMessage);
      } else if (guardStillCurrent) {
        // The write returned canonical truth for a different private identity.
        // Re-read that truth instead of installing a response born from the old desk.
        await refreshSession();
      }
      return { saved, privateContextStillCurrent };
    } catch (cause) {
      if (privateContextIsCurrent(guard)) {
        const copy = cause instanceof Error ? cause.message : '';
        setMessage(copy === COMPANION_DRAFT_COMPLETE_COPY || copy === 'MAIN-DEVICE APPROVAL IS REQUIRED.'
          ? copy
          : COMPANION_STALE_COPY);
        await refreshSession();
      }
      return null;
    }
  }, [board, boardEligibilityCandidates, ownDeviceId, privateContextIsCurrent, refreshSession, session, team]);

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
      unavailablePlayerIds: unavailable,
    });
    if (!reordered.board) {
      setMessage(reordered.invalidRoster
        ? 'MY BOARD COULD NOT REFIT — THE RESULT IS NOT A LEGAL 22-PLAYER ROSTER.'
        : `MY BOARD COULD NOT REFIT — ${reordered.brokenSlots.join(', ')} HAS NO AVAILABLE PLAYER.`);
      return;
    }
    const outcome = await saveBoard(reordered.board, null, guard);
    const savedBoard = outcome?.saved.seatBoards?.[guard.identity.teamId];
    if (!outcome?.privateContextStillCurrent || !savedBoard || !privateContextIsCurrent(guard)) return;
    setBoardUndo({
      board: priorBoard,
      expectedBoardRevision: savedBoard.revision,
      identity: guard.identity,
      changedSlotCount: reordered.changedSlotCount,
    });
  }, [board, capturePrivateContext, deskState, privateContextIsCurrent, saveBoard, team?.id, unavailable]);

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
    try {
      await syncEngine.pull({ throwOnError: true });
      const fresh = await getMlbDraftSession(session.leagueId, session.seasonNumber);
      if (!fresh
        || (fresh.revision ?? 0) !== previewIdentity.sessionRevision
        || fresh.seatBoards?.[team.id]?.revision !== previewIdentity.boardRevision
        || !sameCompanionPrivateIdentity(companionPrivateIdentity(fresh, ownDeviceId), guard.identity)) {
        setMessage(COMPANION_STALE_COPY);
        await refreshSession();
        return;
      }
      if (!privateContextIsCurrent(guard)) {
        await refreshSession();
        return;
      }
      const saved = await patchApprovedCompanionSeatBoard({
        leagueId: session.leagueId,
        seasonNumber: session.seasonNumber,
        deviceId: ownDeviceId,
        teamId: team.id,
        board: selectedConsequence.board,
        expectedBoardRevision: previewIdentity.boardRevision,
      });
      if (!privateContextIsCurrent(guard)
        || !sameCompanionPrivateIdentity(companionPrivateIdentity(saved, ownDeviceId), guard.identity)) {
        await refreshSession();
        return;
      }
      setSession(saved);
    } catch {
      if (privateContextIsCurrent(guard)) {
        setMessage(COMPANION_STALE_COPY);
        await refreshSession();
      }
    }
  }, [board, boardEligibilityCandidates, capturePrivateContext, getMlbDraftSession, ownDeviceId, privateContextIsCurrent, refreshSession, selectedConsequence, session, team]);

  const pickValueChart = useMemo(() => derivePickValueChart(
    activePoolRows.map((row) => row.iv),
    session?.pickOrder.length ?? 0,
    Math.max(1, leagueTeams.length),
  ), [activePoolRows, leagueTeams.length, session?.pickOrder.length]);
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
        };
      }),
      pool: seatingPlayers.filter((entry) => !unavailable.has(entry.playerId)),
      baseCaps: pool.luxuryCaps, realTeamCount: leagueTeams.length, versionState: session.versionState,
    };
  }, [leagueTeams, pool, poolById, seatingById, seatingPlayers, session, unavailable]);
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
  const postTradeOffer = useCallback(async (proposal: Parameters<typeof postApprovedCompanionTradeOffer>[0]['proposal']) => {
    if (!session || !team) return;
    try {
      const saved = await runCompanionTradeWrite({
        pull: () => syncEngine.pull({ throwOnError: true }),
        write: () => postApprovedCompanionTradeOffer({
          leagueId: session.leagueId,
          seasonNumber: session.seasonNumber,
          deviceId: ownDeviceId,
          teamId: team.id,
          proposal,
          postedAt: new Date().toISOString(),
        }),
        refreshAfterFailure: refreshSession,
      });
      setSession(saved);
      setMessage('THE OFFER IS POSTED.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  }, [ownDeviceId, refreshSession, session, team]);
  const respondToTradeOffer = useCallback(async (offerId: string, action: 'NOD' | 'WITHDRAW' | 'DECLINE') => {
    if (!session || !team) return;
    try {
      const saved = await runCompanionTradeWrite({
        pull: () => syncEngine.pull({ throwOnError: true }),
        write: () => respondApprovedCompanionTradeOffer({
          leagueId: session.leagueId,
          seasonNumber: session.seasonNumber,
          deviceId: ownDeviceId,
          teamId: team.id,
          offerId,
          action,
        }),
        refreshAfterFailure: refreshSession,
      });
      setSession(saved);
      setMessage(action === 'NOD' ? 'YOUR NOD IS RECORDED.' : 'THE OFFER IS CLOSED.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  }, [ownDeviceId, refreshSession, session, team]);
  const submitPickRequest = useCallback(async (playerId: string) => {
    if (!session || !team) return;
    try {
      await syncEngine.pull({ throwOnError: true });
      const saved = await submitApprovedCompanionPickRequest({
        leagueId: session.leagueId,
        seasonNumber: session.seasonNumber,
        deviceId: ownDeviceId,
        teamId: team.id,
        playerId,
        expectedSessionRevision: session.revision ?? 0,
        submittedAt: new Date().toISOString(),
      });
      setSession(saved);
      setMessage('PICK SENT TO HOTSEAT.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
      await refreshSession();
    }
  }, [ownDeviceId, refreshSession, session, team]);

  if (!snakeEnabled()) return <main className="ballpark-page"><h1 className="ballpark-title">PAGE NOT FOUND</h1></main>;
  if (auth.isLoading) return <main className="ballpark-page"><p>CHECKING YOUR ACCOUNT…</p></main>;
  if (!auth.isAuthenticated) return <CompanionSignInScreen error={auth.error} onSignIn={auth.signIn} />;
  if (initialPull === 'idle') return <main className="ballpark-page"><p>PULLING YOUR LEAGUES…</p></main>;
  if (initialPull === 'error') return <main className="ballpark-page"><section className="ballpark-panel"><p role="alert">{message ?? 'COULD NOT PULL YOUR LEAGUES.'}</p><button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default mt-3 min-h-11" onClick={() => { pulledUserId.current = null; setPullState(null); setPullAttempt((attempt) => attempt + 1); }}>TRY AGAIN</button></section></main>;
  if (isLoading) return <main className="ballpark-page"><p>OPENING THE COMPANION…</p></main>;
  if (error) return <main className="ballpark-page"><p className="uppercase">{error}</p></main>;
  if (deviceCovered) {
    return <CompanionCoveredScreen onReturn={returnToDesk} onSignOut={signOut} onForgetRoom={session ? forgetCurrentRoom : undefined} message={message} />;
  }
  if (!approved || !team || !session) {
    return <>
      <CompanionClaimScreen
        pending={activeClaim?.status === 'pending'}
        message={message ?? (roomAvailability === 'empty' ? NO_OPEN_ROOM_COPY : null)}
        accountEmail={auth.user?.email ?? ''}
        onSignOut={signOut}
        onClaim={claimDesk}
      />
      {activeClaim && session ? <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default fixed bottom-4 right-4 min-h-11" onClick={() => void forgetCurrentRoom()}>FORGET ROOM</button> : null}
    </>;
  }
  if (isCompanionDraftComplete(session)) {
    return <CompanionCompletedScreen teamName={team.name} onLeave={forgetCurrentRoom} onSignOut={signOut} />;
  }
  if (isCompanionPicksComplete(session)) {
    return <CompanionAwaitingCommissionerScreen teamName={team.name} onCover={coverDevice} onSignOut={signOut} />;
  }
  if (!pool || !board || !deskState) return <main className="ballpark-page"><section className="ballpark-panel"><h1 className="ballpark-title">YOUR DESK IS NOT READY</h1><p className="mt-3">OPEN THIS CLUB'S DESK ON THE MAIN DEVICE FIRST.</p><button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default mt-4 min-h-11" onClick={() => void forgetCurrentRoom()}>FORGET ROOM</button></section></main>;

  const ticker = session.completedPicks.slice(-6).reverse().map((pick) => {
    const pickTeam = leagueTeams.find((entry) => entry.id === pick.teamId);
    const player = playerById.get(pick.playerId);
    return `${(pickTeam?.name ?? UNKNOWN_TEAM).toUpperCase()} SELECTED ${(player ? fullName(player.firstName, player.lastName) : UNKNOWN_PLAYER).toUpperCase()}`;
  });
  const liveSlot = session.pickOrder[session.currentPickIndex];
  const pickRequest = session.snakeCompanions?.pickRequest;
  return <SnakeCompanionFrame
    team={{ id: team.id, name: team.name, abbreviation: team.abbreviation, logoUrl: team.logoUrl, colors: team.colors }}
    currentPick={session.pickOrder[session.currentPickIndex]?.pick ?? session.currentPickIndex + 1}
    order={session.pickOrder.slice(session.currentPickIndex, session.currentPickIndex + 8).map((slot) => ({ pick: slot.pick, teamName: leagueTeams.find((entry) => entry.id === slot.teamId)?.name ?? UNKNOWN_TEAM }))}
    ticker={ticker}
    message={message}
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
      draftAction={liveSlot?.teamId === team.id ? (
        pickRequest ? (
          <span className="flex min-h-11 items-center border-2 border-[var(--ballpark-brass)] px-3 text-xs font-black" data-testid="companion-pick-waiting">PICK #{pickRequest.pick} WAITING FOR HOTSEAT</span>
        ) : (
          <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11" disabled={Boolean(session.paused)} onClick={() => void submitPickRequest(selectedCandidate.id)}>SEND PICK TO HOTSEAT</button>
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
      advisorLog={[
        ...(session.roomLogByTeamId?.[team.id] ?? []).map((entry) => ({ key: entry.id, text: entry.text, actionable: entry.actionable, expired: entry.expired })),
        ...deskState.advisorLog.filter((entry) => !(session.roomLogByTeamId?.[team.id] ?? []).some((row) => row.id.endsWith(`:${entry.key}`))),
      ]}
      taxCoreRows={deskState.taxCoreRows}
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
      tradeGuide={<SnakeTradeGuide
        teams={leagueTeams.map((entry) => ({ id: entry.id, name: entry.name }))}
        fixedBuyerTeamId={team.id}
        pickValueChart={pickValueChart}
        sessionRevision={session.revision ?? 0}
        privateScopeKey={currentPrivateScopeKey}
        onAsk={askGuide}
        onPost={postTradeOffer}
        openOffers={(session.openTradeOffers ?? []).filter((offer) => offer.phase === 'MLB' && (offer.buyerTeamId === team.id || offer.sellerTeamId === team.id))}
        onNod={(offerId) => respondToTradeOffer(offerId, 'NOD')}
        onClose={(offerId, action) => respondToTradeOffer(offerId, action === 'WITHDRAWN' ? 'WITHDRAW' : 'DECLINE')}
        prefill={activeGuidePrefill}
      />}
      />
    </>}
  />;
}
