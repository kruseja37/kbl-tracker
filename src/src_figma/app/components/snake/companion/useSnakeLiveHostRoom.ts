import { useCallback, useEffect, useRef, useState } from 'react';

import type { LeagueBuilderMlbDraftSession } from '../../../../../utils/leagueBuilderStorage';
import {
  getOrCreateSnakeLiveHostCredentials,
  type SnakeLiveHostCredentials,
} from '../../../../../utils/snakeLiveCapabilityStore';
import {
  buildSnakeLivePublicState,
  readSnakeLivePublicSession,
  snakeLiveRoomRunKey,
} from '../../../../../utils/snakeLiveRoomSession';
import { readSnakeLiveCatalog } from '../../../../../utils/snakeLiveCatalog';
import { createSnakeLiveRoomTransport } from '../../../../../utils/snakeLiveRoomTransport';
import {
  SnakeLiveTransportError,
  type SnakeLiveBoardSeedReceipt,
  type SnakeLiveCatalog,
  type SnakeLiveClaim,
  type SnakeLiveHostAccess,
  type SnakeLiveIntent,
  type SnakeLiveIntentStatus,
  type SnakeLiveJsonObject,
  type SnakeLivePublicEvent,
  type SnakeLiveRoom,
  type SnakeLiveRoomStatus,
  type SnakeLiveRoomTransport,
} from '../../../../../utils/snakeLiveRoomTypes';

const DEFAULT_TRANSPORT = createSnakeLiveRoomTransport();
const FALLBACK_REFRESH_INTERVAL_MS = 5_000;

export type SnakeLiveHostRoomStatus = 'idle' | 'connecting' | 'live' | 'closed' | 'error';

export interface SnakeLiveHostCapabilityApi {
  get(sessionId: string, hostDeviceId: string): Promise<SnakeLiveHostCredentials>;
}

const DEFAULT_CAPABILITIES: SnakeLiveHostCapabilityApi = {
  get: getOrCreateSnakeLiveHostCredentials,
};

export interface UseSnakeLiveHostRoomOptions {
  session: LeagueBuilderMlbDraftSession | null;
  hostDeviceId: string | null;
  catalog: SnakeLiveJsonObject | null;
  enabled?: boolean;
  transport?: SnakeLiveRoomTransport;
  capabilities?: SnakeLiveHostCapabilityApi;
}

export interface SnakeLiveHostPublishInput {
  session: LeagueBuilderMlbDraftSession;
  eventKind: string;
  publicEvent: SnakeLiveJsonObject;
  status?: SnakeLiveRoomStatus;
  expectedRoomRevision?: number;
  idempotencyKey?: string;
}

export interface SnakeLiveHostBoardSeedInput {
  teamId: string;
  board: SnakeLiveJsonObject;
  idempotencyKey?: string;
}

export interface SnakeLiveHostTradeIntentInput {
  teamId: string;
  payload: SnakeLiveJsonObject;
  expectedRoomRevision?: number;
  idempotencyKey?: string;
}

export interface SnakeLiveHostCorrectionInput {
  expectedRoomRevision?: number;
  idempotencyKey?: string;
}

export interface UseSnakeLiveHostRoomResult {
  room: SnakeLiveRoom | null;
  publicSession: LeagueBuilderMlbDraftSession | null;
  claims: SnakeLiveClaim[];
  intents: SnakeLiveIntent[];
  events: SnakeLivePublicEvent[];
  status: SnakeLiveHostRoomStatus;
  subscriptionStatus: string | null;
  error: string | null;
  working: boolean;
  hostAccessReady: boolean;
  liveRoomReady: boolean;
  catalog: SnakeLiveCatalog | null;
  refresh(): Promise<void>;
  publishSession(input: SnakeLiveHostPublishInput): Promise<SnakeLiveRoom>;
  resolveClaim(
    claim: SnakeLiveClaim,
    status: 'approved' | 'revoked',
    idempotencyKey?: string,
  ): Promise<SnakeLiveClaim>;
  resolveIntent(
    intent: SnakeLiveIntent,
    status: Extract<SnakeLiveIntentStatus, 'accepted' | 'rejected'>,
    idempotencyKey?: string,
  ): Promise<SnakeLiveIntent>;
  submitTradeIntent(input: SnakeLiveHostTradeIntentInput): Promise<SnakeLiveIntent>;
  restorePreviousPublicState(input?: SnakeLiveHostCorrectionInput): Promise<SnakeLiveRoom>;
  seedBoard(input: SnakeLiveHostBoardSeedInput): Promise<SnakeLiveBoardSeedReceipt>;
  closeRoom(idempotencyKey?: string): Promise<SnakeLiveRoom>;
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

export function useSnakeLiveHostRoom(
  options: UseSnakeLiveHostRoomOptions,
): UseSnakeLiveHostRoomResult {
  const transport = options.transport ?? DEFAULT_TRANSPORT;
  const capabilities = options.capabilities ?? DEFAULT_CAPABILITIES;
  const enabled = options.enabled ?? true;
  const roomCode = options.session?.snakeCompanions?.roomCode ?? '';
  const sessionId = options.session ? snakeLiveRoomRunKey(options.session) : '';
  const phase = options.session?.draftPhase ?? 'MLB';
  const latestSessionRef = useRef(options.session);
  latestSessionRef.current = options.session;
  const latestCatalogRef = useRef(options.catalog);
  latestCatalogRef.current = options.catalog;
  const catalogAvailable = Boolean(options.catalog);

  const [room, setRoom] = useState<SnakeLiveRoom | null>(null);
  const [publicSession, setPublicSession] = useState<LeagueBuilderMlbDraftSession | null>(null);
  const [claims, setClaims] = useState<SnakeLiveClaim[]>([]);
  const [intents, setIntents] = useState<SnakeLiveIntent[]>([]);
  const [events, setEvents] = useState<SnakeLivePublicEvent[]>([]);
  const [status, setStatus] = useState<SnakeLiveHostRoomStatus>('idle');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workingCount, setWorkingCount] = useState(0);
  const [access, setAccess] = useState<SnakeLiveHostAccess | null>(null);
  const [hostAccessReady, setHostAccessReady] = useState(false);
  const [catalog, setCatalog] = useState<SnakeLiveCatalog | null>(null);

  const generationRef = useRef(0);
  const roomRef = useRef<SnakeLiveRoom | null>(null);
  const accessRef = useRef<SnakeLiveHostAccess | null>(null);
  const eventsRef = useRef<SnakeLivePublicEvent[]>([]);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const refreshRequestedRef = useRef(false);
  roomRef.current = room;
  accessRef.current = access;
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

  const refresh = useCallback((): Promise<void> => {
    refreshRequestedRef.current = true;
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const promise = (async () => {
      while (refreshRequestedRef.current) {
        refreshRequestedRef.current = false;
        const activeAccess = accessRef.current;
        const activeRoom = roomRef.current;
        const generation = generationRef.current;
        if (!activeAccess || !activeRoom) return;
        const [nextRoom, nextClaims, nextIntents] = await Promise.all([
          transport.getRoom(activeAccess.roomId),
          transport.listClaims(activeAccess),
          transport.listIntents(activeAccess),
        ]);
        if (generation !== generationRef.current || accessRef.current?.roomId !== activeAccess.roomId) return;
        if (!nextRoom) throw new Error('THE LIVE ROOM IS NOT AVAILABLE.');
        setRoom(nextRoom);
        setPublicSession(readSnakeLivePublicSession(nextRoom));
        setClaims(nextClaims);
        setIntents(nextIntents);
        setStatus(nextRoom.status === 'closed' ? 'closed' : 'live');
        setError(null);
      }
    })().catch((cause) => {
      setError(errorText(cause));
      throw cause;
    }).finally(() => {
      if (refreshPromiseRef.current === promise) refreshPromiseRef.current = null;
    });
    refreshPromiseRef.current = promise;
    return promise;
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
    if (unseen.some((event) => event.kind !== 'BOARD_ACTIVITY')) await refresh();
  }, [refresh]);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    refreshRequestedRef.current = false;
    setAccess(null);
    setHostAccessReady(false);
    setCatalog(null);
    setSubscriptionStatus(null);
    const sourceSession = latestSessionRef.current;
    if (!enabled || !sourceSession || !options.hostDeviceId) {
      setRoom(null);
      setPublicSession(null);
      setClaims([]);
      setIntents([]);
      setEvents([]);
      setStatus('idle');
      setError(null);
      return;
    }
    if (!/^\d{4}$/.test(roomCode)) {
      setStatus('error');
      setError('THE LIVE ROOM CODE MUST HAVE FOUR DIGITS.');
      return;
    }
    setStatus('connecting');
    setError(null);
    const hostDeviceId = options.hostDeviceId;
    void (async () => {
      const credentials = await capabilities.get(sessionId, hostDeviceId);
      let receivedRoom = await transport.findRoomBySession(sessionId);
      const existingRoom = Boolean(receivedRoom);
      let catalogForNewRoom: SnakeLiveJsonObject | null = null;
      if (receivedRoom) {
        if (receivedRoom.hostDeviceId !== hostDeviceId) {
          throw new Error('THIS DRAFT IS OPEN ON ANOTHER HOST DEVICE. USE THE ORIGINAL HOST BROWSER.');
        }
      } else {
        catalogForNewRoom = latestCatalogRef.current;
        if (!catalogForNewRoom) {
          throw new Error('THE LIVE ROOM PLAYER CATALOG COULD NOT BE BUILT. CHECK THE LOCKED DRAFT POOL.');
        }
        receivedRoom = await transport.createRoom({
          sessionId,
          roomCode,
          phase,
          hostDeviceId,
          hostToken: credentials.hostToken,
          publicState: buildSnakeLivePublicState(sourceSession),
        });
      }

      const nextAccess: SnakeLiveHostAccess = {
        roomId: receivedRoom.id,
        hostDeviceId,
        hostToken: credentials.hostToken,
      };
      let receivedCatalog = existingRoom
        ? await transport.getCatalog(receivedRoom.id)
        : await transport.seedCatalog({
            ...nextAccess,
            catalog: catalogForNewRoom!,
          });
      if (existingRoom && !receivedCatalog && latestCatalogRef.current) {
        receivedCatalog = await transport.seedCatalog({
          ...nextAccess,
          catalog: latestCatalogRef.current,
        });
      }
      if (!receivedCatalog || !readSnakeLiveCatalog(receivedCatalog.catalog)) {
        throw new Error('THE LIVE ROOM PLAYER CATALOG IS NOT AVAILABLE. START A NEW DRAFT ROOM.');
      }
      let nextClaims: SnakeLiveClaim[];
      try {
        nextClaims = await transport.listClaims(nextAccess);
      } catch (cause) {
        if (!(cause instanceof SnakeLiveTransportError) || cause.code !== 'forbidden') throw cause;
        throw new Error('THE HOST KEY DOES NOT MATCH THIS LIVE ROOM. USE THE ORIGINAL HOST BROWSER.');
      }
      const [nextIntents, nextEvents] = await Promise.all([
        transport.listIntents(nextAccess),
        transport.listEvents(receivedRoom.id),
      ]);
      if (generation !== generationRef.current) return;
      setRoom(receivedRoom);
      setPublicSession(readSnakeLivePublicSession(receivedRoom));
      setClaims(nextClaims);
      setIntents(nextIntents);
      setEvents(nextEvents);
      setAccess(nextAccess);
      setCatalog(receivedCatalog);
      setHostAccessReady(true);
      setStatus(receivedRoom.status === 'closed' ? 'closed' : 'live');
      setError(null);
    })().catch((cause) => {
      if (generation !== generationRef.current) return;
      setStatus('error');
      setError(errorText(cause));
    });
    return () => {
      if (generationRef.current === generation) generationRef.current += 1;
    };
  }, [capabilities, catalogAvailable, enabled, options.hostDeviceId, phase, roomCode, sessionId, transport]);

  useEffect(() => {
    if (!access || !hostAccessReady) return;
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
  }, [access, hostAccessReady, processReceivedEvents, refresh, transport]);

  useEffect(() => {
    if (!enabled || !access || !hostAccessReady) return;
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
  }, [access, enabled, hostAccessReady, refresh]);

  const requireAccess = useCallback((): { access: SnakeLiveHostAccess; room: SnakeLiveRoom } => {
    const activeAccess = accessRef.current;
    const activeRoom = roomRef.current;
    if (!activeAccess || !activeRoom || !hostAccessReady) {
      throw new Error('THE HOST LIVE ROOM IS NOT READY.');
    }
    return { access: activeAccess, room: activeRoom };
  }, [hostAccessReady]);

  const publishSession = useCallback((input: SnakeLiveHostPublishInput): Promise<SnakeLiveRoom> => (
    runMutation(async () => {
      const active = requireAccess();
      const receipt = await transport.publishRoom({
        ...active.access,
        expectedRoomRevision: input.expectedRoomRevision ?? active.room.publicRevision,
        idempotencyKey: actionKey('room', input.idempotencyKey),
        publicState: buildSnakeLivePublicState(input.session),
        eventKind: input.eventKind,
        publicEvent: input.publicEvent,
        ...(input.status ? { status: input.status } : {}),
      });
      setRoom(receipt);
      setPublicSession(readSnakeLivePublicSession(receipt));
      setStatus(receipt.status === 'closed' ? 'closed' : 'live');
      return receipt;
    })
  ), [requireAccess, runMutation, transport]);

  const resolveClaim = useCallback((
    claim: SnakeLiveClaim,
    nextStatus: 'approved' | 'revoked',
    idempotencyKey?: string,
  ): Promise<SnakeLiveClaim> => runMutation(async () => {
    const active = requireAccess();
    const receipt = await transport.resolveClaim({
      ...active.access,
      claimId: claim.id,
      expectedClaimRevision: claim.revision,
      idempotencyKey: actionKey('claim', idempotencyKey),
      status: nextStatus,
    });
    setClaims((current) => current.map((entry) => entry.id === receipt.id ? receipt : entry));
    return receipt;
  }), [requireAccess, runMutation, transport]);

  const resolveIntent = useCallback((
    intent: SnakeLiveIntent,
    nextStatus: Extract<SnakeLiveIntentStatus, 'accepted' | 'rejected'>,
    idempotencyKey?: string,
  ): Promise<SnakeLiveIntent> => runMutation(async () => {
    const active = requireAccess();
    const receipt = await transport.resolveIntent({
      ...active.access,
      intentId: intent.id,
      expectedIntentRevision: intent.intentRevision,
      idempotencyKey: actionKey('intent', idempotencyKey),
      status: nextStatus,
    });
    setIntents((current) => current.map((entry) => entry.id === receipt.id ? receipt : entry));
    return receipt;
  }), [requireAccess, runMutation, transport]);

  const submitTradeIntent = useCallback((input: SnakeLiveHostTradeIntentInput): Promise<SnakeLiveIntent> => (
    runMutation(async () => {
      const active = requireAccess();
      const receipt = await transport.submitIntentAsHost({
        ...active.access,
        teamId: input.teamId,
        idempotencyKey: actionKey('trade', input.idempotencyKey),
        kind: 'trade',
        expectedRoomRevision: input.expectedRoomRevision ?? active.room.publicRevision,
        payload: input.payload,
      });
      setIntents((current) => [...current.filter((entry) => entry.id !== receipt.id), receipt]);
      return receipt;
    })
  ), [requireAccess, runMutation, transport]);

  const seedBoard = useCallback((input: SnakeLiveHostBoardSeedInput): Promise<SnakeLiveBoardSeedReceipt> => (
    runMutation(async () => {
      const active = requireAccess();
      return transport.seedBoardAsHost({
        ...active.access,
        teamId: input.teamId,
        idempotencyKey: actionKey('board-seed', input.idempotencyKey),
        board: input.board,
      });
    })
  ), [requireAccess, runMutation, transport]);

  const restorePreviousPublicState = useCallback((
    input: SnakeLiveHostCorrectionInput = {},
  ): Promise<SnakeLiveRoom> => runMutation(async () => {
    const active = requireAccess();
    const receipt = await transport.restorePreviousPublicState({
      ...active.access,
      expectedRoomRevision: input.expectedRoomRevision ?? active.room.publicRevision,
      idempotencyKey: actionKey('correct', input.idempotencyKey),
    });
    setRoom(receipt);
    setPublicSession(readSnakeLivePublicSession(receipt));
    setStatus(receipt.status === 'closed' ? 'closed' : 'live');
    return receipt;
  }), [requireAccess, runMutation, transport]);

  const closeRoom = useCallback((idempotencyKey?: string): Promise<SnakeLiveRoom> => (
    runMutation(async () => {
      const active = requireAccess();
      const receipt = await transport.closeRoom(
        active.access,
        active.room.publicRevision,
        actionKey('close', idempotencyKey),
      );
      setRoom(receipt);
      setPublicSession(readSnakeLivePublicSession(receipt));
      setStatus('closed');
      return receipt;
    })
  ), [requireAccess, runMutation, transport]);

  return {
    room,
    publicSession,
    claims,
    intents,
    events,
    status,
    subscriptionStatus,
    error,
    working: workingCount > 0,
    hostAccessReady,
    liveRoomReady: hostAccessReady && Boolean(room) && status === 'live',
    catalog,
    refresh,
    publishSession,
    resolveClaim,
    resolveIntent,
    submitTradeIntent,
    restorePreviousPublicState,
    seedBoard,
    closeRoom,
  };
}
