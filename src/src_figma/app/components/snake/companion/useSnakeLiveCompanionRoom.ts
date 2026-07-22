import { useCallback, useEffect, useRef, useState } from 'react';

import type { LeagueBuilderMlbDraftSession } from '../../../../../utils/leagueBuilderStorage';
import {
  clearSnakeLiveCompanionResume,
  getOrCreateSnakeLiveDeviceCredentials,
  getOrCreateSnakeLiveDeviceId,
  readSnakeLiveCompanionResume,
  saveSnakeLiveCompanionResume,
  type SnakeLiveCompanionResume,
  type SnakeLiveDeviceCredentials,
} from '../../../../../utils/snakeLiveCapabilityStore';
import { readSnakeLiveCatalogForPhase } from '../../../../../utils/snakeLiveCatalog';
import { readSnakeLivePublicSession } from '../../../../../utils/snakeLiveRoomSession';
import { createSnakeLiveRoomTransport } from '../../../../../utils/snakeLiveRoomTransport';
import type {
  SnakeLiveClaim,
  SnakeLiveCatalog,
  SnakeLiveDeviceAccess,
  SnakeLiveIntent,
  SnakeLiveIntentKind,
  SnakeLiveJsonObject,
  SnakeLivePublicEvent,
  SnakeLiveRoom,
  SnakeLiveRoomTransport,
  SnakeLiveSeatBoard,
} from '../../../../../utils/snakeLiveRoomTypes';

const DEFAULT_TRANSPORT = createSnakeLiveRoomTransport();
const FALLBACK_REFRESH_INTERVAL_MS = 5_000;

export type SnakeLiveCompanionRoomStatus = 'idle' | 'connecting' | 'waiting' | 'live' | 'closed' | 'error';

export interface SnakeLiveCompanionCapabilityApi {
  getDeviceId(legacyDeviceId?: string | null): Promise<string>;
  getRoomCredentials(roomId: string, deviceId: string): Promise<SnakeLiveDeviceCredentials>;
  readResume(ownerUserId: string): Promise<SnakeLiveCompanionResume | null>;
  saveResume(ownerUserId: string, resume: SnakeLiveCompanionResume): Promise<void>;
  clearResume(ownerUserId: string, roomId?: string, deviceId?: string): Promise<void>;
}

const DEFAULT_CAPABILITIES: SnakeLiveCompanionCapabilityApi = {
  getDeviceId: getOrCreateSnakeLiveDeviceId,
  getRoomCredentials: getOrCreateSnakeLiveDeviceCredentials,
  readResume: readSnakeLiveCompanionResume,
  saveResume: saveSnakeLiveCompanionResume,
  clearResume: clearSnakeLiveCompanionResume,
};

export interface UseSnakeLiveCompanionRoomOptions {
  ownerUserId: string | null;
  enabled?: boolean;
  legacyDeviceId?: string | null;
  transport?: SnakeLiveRoomTransport;
  capabilities?: SnakeLiveCompanionCapabilityApi;
}

export interface SnakeLiveCompanionBoardWriteInput {
  teamId: string;
  expectedBoardRevision: number;
  board: SnakeLiveJsonObject;
  idempotencyKey?: string;
}

export interface SnakeLiveCompanionIntentInput {
  teamId: string;
  kind: SnakeLiveIntentKind;
  payload: SnakeLiveJsonObject;
  expectedRoomRevision?: number;
  idempotencyKey?: string;
}

export interface UseSnakeLiveCompanionRoomResult {
  room: SnakeLiveRoom | null;
  catalog: SnakeLiveCatalog | null;
  activeRoomId: string | null;
  publicSession: LeagueBuilderMlbDraftSession | null;
  deviceId: string | null;
  claims: SnakeLiveClaim[];
  intents: SnakeLiveIntent[];
  boardsByTeamId: Readonly<Record<string, SnakeLiveSeatBoard>>;
  events: SnakeLivePublicEvent[];
  status: SnakeLiveCompanionRoomStatus;
  subscriptionStatus: string | null;
  error: string | null;
  working: boolean;
  accessReady: boolean;
  resumedFromCapability: boolean;
  refresh(): Promise<void>;
  claimDesk(gmName: string, roomCode: string): Promise<SnakeLiveClaim[]>;
  writeBoard(input: SnakeLiveCompanionBoardWriteInput): Promise<SnakeLiveSeatBoard>;
  submitIntent(input: SnakeLiveCompanionIntentInput): Promise<SnakeLiveIntent>;
  disconnect(): Promise<void>;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'THE LIVE ROOM REQUEST FAILED.';
}

function actionKey(prefix: string, supplied?: string): string {
  if (supplied?.trim()) return supplied;
  const value = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${value}`;
}

function mergeEvents(
  current: readonly SnakeLivePublicEvent[],
  received: readonly SnakeLivePublicEvent[],
): SnakeLivePublicEvent[] {
  const byId = new Map(current.map((event) => [event.id, event]));
  for (const event of received) byId.set(event.id, event);
  return [...byId.values()].sort((left, right) => left.id - right.id);
}

function isCompanionClub(
  club: NonNullable<LeagueBuilderMlbDraftSession['snakeSetup']>['clubs'][number],
): boolean {
  const legacySeatMode = (club as typeof club & { seatMode?: string }).seatMode;
  return club.hotseat === false || legacySeatMode === 'companion';
}

function matchingTeamIds(session: LeagueBuilderMlbDraftSession, gmName: string): string[] {
  const requested = normalized(gmName);
  return [...new Set((session.snakeSetup?.clubs ?? [])
    .filter((club) => isCompanionClub(club)
      && Boolean(club.gmName?.trim())
      && normalized(club.gmName ?? '') === requested)
    .map((club) => club.teamId))];
}

function roomStatus(room: SnakeLiveRoom, claims: readonly SnakeLiveClaim[]): SnakeLiveCompanionRoomStatus {
  if (room.status === 'closed') return 'closed';
  return claims.some((claim) => claim.status === 'approved') ? 'live' : 'waiting';
}

export function useSnakeLiveCompanionRoom(
  options: UseSnakeLiveCompanionRoomOptions,
): UseSnakeLiveCompanionRoomResult {
  const transport = options.transport ?? DEFAULT_TRANSPORT;
  const capabilities = options.capabilities ?? DEFAULT_CAPABILITIES;
  const enabled = options.enabled ?? true;

  const [room, setRoom] = useState<SnakeLiveRoom | null>(null);
  const [catalog, setCatalog] = useState<SnakeLiveCatalog | null>(null);
  const [publicSession, setPublicSession] = useState<LeagueBuilderMlbDraftSession | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [claims, setClaims] = useState<SnakeLiveClaim[]>([]);
  const [intents, setIntents] = useState<SnakeLiveIntent[]>([]);
  const [boardsByTeamId, setBoardsByTeamId] = useState<Record<string, SnakeLiveSeatBoard>>({});
  const [events, setEvents] = useState<SnakeLivePublicEvent[]>([]);
  const [status, setStatus] = useState<SnakeLiveCompanionRoomStatus>('idle');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workingCount, setWorkingCount] = useState(0);
  const [access, setAccess] = useState<SnakeLiveDeviceAccess | null>(null);
  const [accessReady, setAccessReady] = useState(false);
  const [resumedFromCapability, setResumedFromCapability] = useState(false);
  const [activeOwnerUserId, setActiveOwnerUserId] = useState<string | null>(null);

  const generationRef = useRef(0);
  const roomRef = useRef<SnakeLiveRoom | null>(null);
  const accessRef = useRef<SnakeLiveDeviceAccess | null>(null);
  const claimsRef = useRef<SnakeLiveClaim[]>([]);
  const catalogRef = useRef<SnakeLiveCatalog | null>(null);
  const eventsRef = useRef<SnakeLivePublicEvent[]>([]);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const refreshRequestedRef = useRef(false);
  roomRef.current = room;
  accessRef.current = access;
  claimsRef.current = claims;
  catalogRef.current = catalog;
  eventsRef.current = events;

  const runMutation = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setWorkingCount((count) => count + 1);
    setError(null);
    try {
      return await operation();
    } catch (cause) {
      setError(errorText(cause));
      throw cause;
    } finally {
      setWorkingCount((count) => Math.max(0, count - 1));
    }
  }, []);

  const clearClientState = useCallback(() => {
    refreshRequestedRef.current = false;
    roomRef.current = null;
    accessRef.current = null;
    claimsRef.current = [];
    catalogRef.current = null;
    eventsRef.current = [];
    setRoom(null);
    setCatalog(null);
    setPublicSession(null);
    setDeviceId(null);
    setClaims([]);
    setIntents([]);
    setBoardsByTeamId({});
    setEvents([]);
    setAccess(null);
    setAccessReady(false);
    setResumedFromCapability(false);
    setActiveOwnerUserId(null);
    setSubscriptionStatus(null);
    setStatus('idle');
    setError(null);
  }, []);

  const loadScopedState = useCallback(async (
    activeAccess: SnakeLiveDeviceAccess,
    generation: number,
    includeEventHistory = false,
    refreshCatalog = false,
  ): Promise<void> => {
    const [nextRoom, nextCatalog, nextClaims, nextIntents, nextEvents] = await Promise.all([
      transport.getRoom(activeAccess.roomId),
      refreshCatalog ? transport.getCatalog(activeAccess.roomId) : Promise.resolve(catalogRef.current),
      transport.listDeviceClaims(activeAccess),
      transport.listDeviceIntents(activeAccess),
      includeEventHistory ? transport.listEvents(activeAccess.roomId) : Promise.resolve(null),
    ]);
    if (generation !== generationRef.current || accessRef.current?.roomId !== activeAccess.roomId) return;
    if (!nextRoom) throw new Error('THE LIVE ROOM IS NOT AVAILABLE.');
    const approvedTeamIds = [...new Set(nextClaims
      .filter((claim) => claim.status === 'approved')
      .map((claim) => claim.teamId))];
    const boards = await Promise.all(approvedTeamIds.map(async (teamId) => {
      const board = await transport.getBoard({ ...activeAccess, teamId });
      return [teamId, board] as const;
    }));
    if (generation !== generationRef.current || accessRef.current?.roomId !== activeAccess.roomId) return;
    roomRef.current = nextRoom;
    catalogRef.current = nextCatalog;
    claimsRef.current = nextClaims;
    setRoom(nextRoom);
    setCatalog(nextCatalog);
    setPublicSession(readSnakeLivePublicSession(nextRoom));
    setClaims(nextClaims);
    setIntents(nextIntents);
    setBoardsByTeamId(Object.fromEntries(boards.filter((entry): entry is readonly [string, SnakeLiveSeatBoard] => (
      Boolean(entry[1])
    ))));
    if (nextEvents) setEvents((current) => mergeEvents(current, nextEvents));
    setStatus(roomStatus(nextRoom, nextClaims));
    setError(null);
  }, [transport]);

  const refresh = useCallback((): Promise<void> => {
    refreshRequestedRef.current = true;
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const promise = (async () => {
      while (refreshRequestedRef.current) {
        refreshRequestedRef.current = false;
        const activeAccess = accessRef.current;
        const generation = generationRef.current;
        if (!activeAccess) return;
        const activeRoom = roomRef.current;
        const activeCatalog = catalogRef.current;
        const catalogNeedsRepair = Boolean(activeRoom && (
          !activeCatalog || !readSnakeLiveCatalogForPhase(activeCatalog.catalog, activeRoom.phase)
        ));
        await loadScopedState(activeAccess, generation, false, catalogNeedsRepair);
      }
    })().catch((cause) => {
      setError(errorText(cause));
      throw cause;
    }).finally(() => {
      if (refreshPromiseRef.current === promise) refreshPromiseRef.current = null;
    });
    refreshPromiseRef.current = promise;
    return promise;
  }, [loadScopedState]);

  const refreshApprovedBoard = useCallback(async (teamId: string): Promise<void> => {
    const activeAccess = accessRef.current;
    const generation = generationRef.current;
    const approved = claimsRef.current.some((claim) => (
      claim.teamId === teamId && claim.status === 'approved'
    ));
    if (!activeAccess || !approved) return;
    const nextBoard = await transport.getBoard({ ...activeAccess, teamId });
    if (generation !== generationRef.current
      || accessRef.current?.roomId !== activeAccess.roomId
      || !claimsRef.current.some((claim) => claim.teamId === teamId && claim.status === 'approved')
      || !nextBoard) return;
    setBoardsByTeamId((current) => {
      const currentBoard = current[teamId];
      return currentBoard && currentBoard.boardRevision >= nextBoard.boardRevision
        ? current
        : { ...current, [teamId]: nextBoard };
    });
  }, [transport]);

  const processReceivedEvents = useCallback(async (
    received: readonly SnakeLivePublicEvent[],
  ): Promise<void> => {
    const knownIds = new Set(eventsRef.current.map((event) => event.id));
    const unseen = received.filter((event) => !knownIds.has(event.id));
    if (unseen.length === 0) return;
    const merged = mergeEvents(eventsRef.current, unseen);
    eventsRef.current = merged;
    setEvents(merged);
    if (unseen.some((event) => event.kind !== 'BOARD_ACTIVITY')) {
      await refresh();
      return;
    }
    const approvedTeamIds = new Set(claimsRef.current
      .filter((claim) => claim.status === 'approved')
      .map((claim) => claim.teamId));
    const changedTeamIds = [...new Set(unseen
      .map((event) => event.publicPayload.teamId)
      .filter((teamId): teamId is string => typeof teamId === 'string' && approvedTeamIds.has(teamId)))];
    await Promise.all(changedTeamIds.map(refreshApprovedBoard));
  }, [refresh, refreshApprovedBoard]);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    clearClientState();
    const ownerUserId = options.ownerUserId?.trim() ?? '';
    if (!enabled || !ownerUserId) return;

    void (async () => {
      const resume = await capabilities.readResume(ownerUserId);
      if (generation !== generationRef.current || !resume) return;
      setStatus('connecting');
      const [receivedRoom, receivedCatalog] = await Promise.all([
        transport.getRoom(resume.roomId),
        transport.getCatalog(resume.roomId),
      ]);
      if (!receivedRoom
        || receivedRoom.ownerUserId !== ownerUserId
        || receivedRoom.roomCode !== resume.roomCode) {
        await capabilities.clearResume(ownerUserId, resume.roomId, resume.deviceId);
        if (generation === generationRef.current) setStatus('idle');
        return;
      }
      const credentials = await capabilities.getRoomCredentials(receivedRoom.id, resume.deviceId);
      const nextAccess: SnakeLiveDeviceAccess = {
        roomId: receivedRoom.id,
        deviceId: resume.deviceId,
        deviceToken: credentials.deviceToken,
      };
      roomRef.current = receivedRoom;
      catalogRef.current = receivedCatalog;
      accessRef.current = nextAccess;
      setAccess(nextAccess);
      setDeviceId(resume.deviceId);
      setCatalog(receivedCatalog);
      setActiveOwnerUserId(ownerUserId);
      await loadScopedState(nextAccess, generation, true, !receivedCatalog);
      if (generation !== generationRef.current) return;
      setAccessReady(true);
      setResumedFromCapability(true);
      if (!catalogRef.current) setError('THE LIVE PLAYER CATALOG IS NOT AVAILABLE YET.');
    })().catch((cause) => {
      if (generation !== generationRef.current) return;
      accessRef.current = null;
      setAccess(null);
      setAccessReady(false);
      setStatus('error');
      setError(errorText(cause));
    });

    return () => {
      if (generationRef.current === generation) generationRef.current += 1;
    };
  }, [capabilities, clearClientState, enabled, loadScopedState, options.ownerUserId, transport]);

  useEffect(() => {
    if (!enabled || !access || !accessReady) return;
    const generation = generationRef.current;
    let subscription;
    try {
      subscription = transport.subscribe(access.roomId, {
        onEvent: (receivedEvent) => {
          if (generation !== generationRef.current) return;
          void processReceivedEvents([receivedEvent]).catch((cause) => setError(errorText(cause)));
        },
        onStatus: (nextStatus) => {
          setSubscriptionStatus(nextStatus);
          if (nextStatus === 'SUBSCRIBED') void refresh().catch(() => undefined);
        },
        onError: (cause) => setError(errorText(cause)),
      });
    } catch (cause) {
      setError(errorText(cause));
      return;
    }
    return () => { void subscription.unsubscribe().catch(() => undefined); };
  }, [access, accessReady, enabled, processReceivedEvents, refresh, transport]);

  useEffect(() => {
    if (!enabled || !access || !accessReady) return;
    const requestRefresh = () => { void refresh().catch(() => undefined); };
    const intervalId = window.setInterval(requestRefresh, FALLBACK_REFRESH_INTERVAL_MS);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') requestRefresh();
    };
    window.addEventListener('online', requestRefresh);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', requestRefresh);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [access, accessReady, enabled, refresh]);

  const claimDesk = useCallback(async (
    gmName: string,
    requestedRoomCode: string,
  ): Promise<SnakeLiveClaim[]> => {
    try {
      return await runMutation(async () => {
        if (!enabled) throw new Error('THE LIVE ROOM IS NOT AVAILABLE.');
        const ownerUserId = options.ownerUserId?.trim() ?? '';
        if (!ownerUserId) throw new Error('SIGN IN BEFORE YOU JOIN THE LIVE ROOM.');
        const cleanName = gmName.trim();
        const cleanCode = requestedRoomCode.trim();
        if (!cleanName) throw new Error('ENTER THE GM NAME.');
        if (!/^\d{4}$/.test(cleanCode)) throw new Error('ENTER THE FOUR-DIGIT ROOM CODE.');
        generationRef.current += 1;
        const generation = generationRef.current;
        clearClientState();
        setStatus('connecting');

        const receivedRoom = await transport.findRoomByCode(cleanCode);
        if (!receivedRoom) throw new Error('NO OPEN SNAKE ROOM MATCHES THAT CODE.');
        if (receivedRoom.ownerUserId !== ownerUserId) {
          throw new Error('THIS LIVE ROOM BELONGS TO ANOTHER ACCOUNT.');
        }
        const receivedCatalog = await transport.getCatalog(receivedRoom.id);
        if (!receivedCatalog) throw new Error('THE LIVE PLAYER CATALOG IS NOT AVAILABLE.');
        const nextPublicSession = readSnakeLivePublicSession(receivedRoom);
        const teamIds = matchingTeamIds(nextPublicSession, cleanName);
        if (teamIds.length === 0) {
          throw new Error('THAT GM NAME DOES NOT HAVE A COMPANION TEAM IN THIS ROOM.');
        }
        const nextDeviceId = await capabilities.getDeviceId(options.legacyDeviceId);
        const credentials = await capabilities.getRoomCredentials(receivedRoom.id, nextDeviceId);
        const nextAccess: SnakeLiveDeviceAccess = {
          roomId: receivedRoom.id,
          deviceId: nextDeviceId,
          deviceToken: credentials.deviceToken,
        };

        // The first claim registers this device token. Do not run a scoped read first.
        for (const teamId of teamIds) {
          await transport.submitClaim({
            ...nextAccess,
            requestKey: `claim:${receivedRoom.sessionId}:${nextDeviceId}:${teamId}`,
            gmName: cleanName,
            teamId,
          });
        }
        const [nextClaims, nextIntents, nextEvents] = await Promise.all([
          transport.listDeviceClaims(nextAccess),
          transport.listDeviceIntents(nextAccess),
          transport.listEvents(receivedRoom.id),
        ]);
        const approvedTeamIds = [...new Set(nextClaims
          .filter((claim) => claim.status === 'approved')
          .map((claim) => claim.teamId))];
        const boardEntries = await Promise.all(approvedTeamIds.map(async (teamId) => (
          [teamId, await transport.getBoard({ ...nextAccess, teamId })] as const
        )));
        if (generation !== generationRef.current) return [];
        await capabilities.saveResume(ownerUserId, {
          roomId: receivedRoom.id,
          roomCode: receivedRoom.roomCode,
          deviceId: nextDeviceId,
          gmName: cleanName,
        });
        if (generation !== generationRef.current) return [];
        setDeviceId(nextDeviceId);
        setRoom(receivedRoom);
        setCatalog(receivedCatalog);
        setPublicSession(nextPublicSession);
        setClaims(nextClaims);
        setIntents(nextIntents);
        setBoardsByTeamId(Object.fromEntries(boardEntries.filter(
          (entry): entry is readonly [string, SnakeLiveSeatBoard] => Boolean(entry[1]),
        )));
        setEvents(nextEvents);
        setAccess(nextAccess);
        setActiveOwnerUserId(ownerUserId);
        setAccessReady(true);
        setResumedFromCapability(false);
        setStatus(roomStatus(receivedRoom, nextClaims));
        setError(null);
        return nextClaims;
      });
    } catch (cause) {
      setStatus('error');
      throw cause;
    }
  }, [capabilities, clearClientState, enabled, options.legacyDeviceId, options.ownerUserId, runMutation, transport]);

  const requireTeamAccess = useCallback((teamId: string) => {
    const activeAccess = accessRef.current;
    const activeRoom = roomRef.current;
    const approved = claimsRef.current.some((claim) => (
      claim.teamId === teamId && claim.status === 'approved'
    ));
    const ownerUserId = options.ownerUserId?.trim() ?? '';
    if (!ownerUserId
      || activeOwnerUserId !== ownerUserId
      || !accessReady
      || !activeAccess
      || !activeRoom) {
      throw new Error('THE COMPANION LIVE ROOM IS NOT READY.');
    }
    if (!approved) throw new Error('THE HOST MUST APPROVE THIS TEAM.');
    return { access: { ...activeAccess, teamId }, room: activeRoom };
  }, [accessReady, activeOwnerUserId, options.ownerUserId]);

  const writeBoard = useCallback((input: SnakeLiveCompanionBoardWriteInput): Promise<SnakeLiveSeatBoard> => (
    runMutation(async () => {
      const active = requireTeamAccess(input.teamId);
      const receipt = await transport.writeBoard({
        ...active.access,
        expectedBoardRevision: input.expectedBoardRevision,
        idempotencyKey: actionKey('board', input.idempotencyKey),
        board: input.board,
      });
      setBoardsByTeamId((current) => ({ ...current, [receipt.teamId]: receipt }));
      return receipt;
    })
  ), [requireTeamAccess, runMutation, transport]);

  const submitIntent = useCallback((input: SnakeLiveCompanionIntentInput): Promise<SnakeLiveIntent> => (
    runMutation(async () => {
      const active = requireTeamAccess(input.teamId);
      const receipt = await transport.submitIntent({
        ...active.access,
        idempotencyKey: actionKey(input.kind, input.idempotencyKey),
        kind: input.kind,
        expectedRoomRevision: input.expectedRoomRevision ?? active.room.publicRevision,
        payload: input.payload,
      });
      setIntents((current) => [...current.filter((entry) => entry.id !== receipt.id), receipt]);
      return receipt;
    })
  ), [requireTeamAccess, runMutation, transport]);

  const disconnect = useCallback((): Promise<void> => runMutation(async () => {
    const ownerUserId = activeOwnerUserId;
    const activeAccess = accessRef.current;
    generationRef.current += 1;
    clearClientState();
    if (!ownerUserId) return;
    await capabilities.clearResume(
      ownerUserId,
      activeAccess?.roomId,
      activeAccess?.deviceId,
    );
  }), [activeOwnerUserId, capabilities, clearClientState, runMutation]);

  const ownerUserId = options.ownerUserId?.trim() ?? '';
  const ownerMatches = Boolean(ownerUserId && activeOwnerUserId === ownerUserId);
  const staleOwnerState = Boolean(activeOwnerUserId && !ownerMatches);

  return {
    room: ownerMatches ? room : null,
    catalog: ownerMatches ? catalog : null,
    activeRoomId: ownerMatches ? room?.id ?? null : null,
    publicSession: ownerMatches ? publicSession : null,
    deviceId: ownerMatches ? deviceId : null,
    claims: ownerMatches ? claims : [],
    intents: ownerMatches ? intents : [],
    boardsByTeamId: ownerMatches ? boardsByTeamId : {},
    events: ownerMatches ? events : [],
    status: staleOwnerState ? 'idle' : status,
    subscriptionStatus: staleOwnerState ? null : subscriptionStatus,
    error: staleOwnerState ? null : error,
    working: workingCount > 0,
    accessReady: ownerMatches && accessReady,
    resumedFromCapability: ownerMatches && resumedFromCapability,
    refresh,
    claimDesk,
    writeBoard,
    submitIntent,
    disconnect,
  };
}
