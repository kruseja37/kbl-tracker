import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LeagueBuilderMlbDraftSession } from '../../../../../../utils/leagueBuilderStorage';
import {
  buildSnakeLivePublicState,
  snakeLiveRoomRunKey,
} from '../../../../../../utils/snakeLiveRoomSession';
import {
  SnakeLiveTransportError,
  type SnakeLiveCatalog,
  type SnakeLiveClaim,
  type SnakeLiveJsonObject,
  type SnakeLivePublicEvent,
  type SnakeLiveRoom,
  type SnakeLiveRoomTransport,
  type SnakeLiveSubscriptionHandlers,
} from '../../../../../../utils/snakeLiveRoomTypes';
import {
  useSnakeLiveHostRoom,
  type SnakeLiveHostCapabilityApi,
} from '../useSnakeLiveHostRoom';

function liveCatalogPayload(): SnakeLiveJsonObject {
  return {
    formatVersion: 'snake-live-catalog-v1',
    league: { id: 'league', name: 'Test League', teamIds: ['team-a'] },
    teams: [{ id: 'team-a', name: 'Team A' }],
    players: [{ id: 'p1', firstName: 'Player', lastName: 'One' }],
    registeredPool: { leagueId: 'league', players: [{ id: 'p1', iv: 1 }] },
  };
}

function liveCatalogReceipt(): SnakeLiveCatalog {
  return {
    roomId: 'room-1',
    catalogRevision: 1,
    catalog: liveCatalogPayload(),
    createdAt: '2026-07-19T00:00:00.000Z',
  };
}

function farmCatalogPayload(): SnakeLiveJsonObject {
  return {
    formatVersion: 'snake-live-farm-catalog-v1',
    league: { id: 'league', name: 'Test League', teamIds: ['team-a'] },
    teams: [{
      id: 'team-a', name: 'Team A', abbreviation: 'TMA',
      colors: { primary: '#123456', secondary: '#ffffff' },
      farmArchetypeKey: 'web-gems',
    }],
    prospects: [{ id: 'p1', firstName: 'Prospect', lastName: 'One', primaryPosition: 'SS' }],
    existingFarmRostersByTeamId: { 'team-a': [] },
    farmTarget: 10,
  };
}

function session(): LeagueBuilderMlbDraftSession {
  return {
    id: 'league:1:snake', leagueId: 'league', seasonNumber: 1, seed: 'seed',
    workflowVersion: 'test', engineMethodVersion: 'test', tier: 'standard', balanceMode: 'STANDARD',
    rounds: 22, pickOrder: [{ round: 1, pick: 1, teamId: 'team-a' }], completedPicks: [],
    currentPickIndex: 0, createdDate: '2026-07-19T00:00:00.000Z', lastModified: '2026-07-19T00:00:00.000Z',
    snakeCompanions: { roomCode: '2468', claims: [] },
    snakeSetup: {
      poolPlayerIds: ['p1'], versionSelections: {}, orderSeed: 'order',
      clubs: [{ teamId: 'team-a', hotseat: true, gmName: 'Host' }],
    },
  } as unknown as LeagueBuilderMlbDraftSession;
}

function farmSession(): LeagueBuilderMlbDraftSession {
  return {
    ...session(),
    id: 'league:2:snake-farm',
    seasonNumber: 2,
    draftPhase: 'FARM',
    workflowVersion: 'snake-v1-farm',
    engineMethodVersion: 'snake-s6',
  };
}

function completedSession(): LeagueBuilderMlbDraftSession {
  const completed = session();
  completed.pickOrder = Array.from({ length: 176 }, (_, index) => ({
    round: Math.floor(index / 8) + 1,
    pick: index + 1,
    teamId: `team-${(index % 8) + 1}`,
  }));
  completed.completedPicks = completed.pickOrder.map((slot, index) => ({
    ...slot,
    pickIndex: index,
    playerId: `player-${index + 1}`,
  })) as LeagueBuilderMlbDraftSession['completedPicks'];
  completed.currentPickIndex = 176;
  return completed;
}

function room(overrides: Partial<SnakeLiveRoom> = {}): SnakeLiveRoom {
  const source = session();
  return {
    id: 'room-1', ownerUserId: 'user', sessionId: snakeLiveRoomRunKey(source), roomCode: '2468', phase: 'MLB',
    status: 'open', publicRevision: 1, publicState: buildSnakeLivePublicState(source),
    correctionAvailable: false,
    hostDeviceId: 'host-device', createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z', ...overrides,
  };
}

function farmRoom(): SnakeLiveRoom {
  const source = farmSession();
  return {
    ...room(),
    sessionId: snakeLiveRoomRunKey(source),
    phase: 'FARM',
    publicState: buildSnakeLivePublicState(source),
  };
}

function claim(): SnakeLiveClaim {
  return {
    id: 'claim-1', roomId: 'room-1', requestKey: 'request-1', deviceId: 'companion-1',
    gmName: 'GM', teamId: 'team-a', status: 'pending', revision: 1,
    createdAt: '2026-07-19T00:00:00.000Z', resolvedAt: null,
  };
}

function deferredVoid(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
  });
}

function transportHarness(existing: SnakeLiveRoom | null = null) {
  let handlers: SnakeLiveSubscriptionHandlers | null = null;
  let claims: SnakeLiveClaim[] = [];
  let currentRoom = existing ?? room();
  let nextEventId = 1;
  const serverEvents: SnakeLivePublicEvent[] = [];
  const addEvent = (
    kind = 'CLAIM_ACTIVITY',
    publicPayload: SnakeLiveJsonObject = { changed: true },
    suppliedId?: number,
  ): SnakeLivePublicEvent => {
    const event: SnakeLivePublicEvent = {
      id: suppliedId ?? nextEventId, roomId: 'room-1', roomRevision: currentRoom.publicRevision,
      kind, publicPayload,
      createdAt: '2026-07-19T00:00:01.000Z',
    };
    nextEventId = Math.max(nextEventId + 1, event.id + 1);
    serverEvents.push(event);
    return event;
  };
  const transport = {
    createRoom: vi.fn(async () => currentRoom),
    recoverHost: vi.fn(async (input) => {
      currentRoom = room({ ...currentRoom, hostDeviceId: input.hostDeviceId });
      return currentRoom;
    }),
    findRoomBySession: vi.fn(async () => existing),
    findRoomByCode: vi.fn(async () => existing),
    getRoom: vi.fn(async () => currentRoom),
    seedCatalog: vi.fn(async () => liveCatalogReceipt()),
    getCatalog: vi.fn(async () => liveCatalogReceipt()),
    listEvents: vi.fn(async (_roomId: string, afterEventId = 0) => (
      serverEvents.filter((event) => event.id > afterEventId)
    )),
    listClaims: vi.fn(async () => claims),
    listDeviceClaims: vi.fn(),
    submitClaim: vi.fn(),
    resolveClaim: vi.fn(async (input) => ({ ...claim(), id: input.claimId, status: input.status, revision: 2 })),
    getBoard: vi.fn(),
    writeBoard: vi.fn(),
    seedBoardAsHost: vi.fn(async (input) => ({
      roomId: input.roomId, teamId: input.teamId, boardRevision: 1, seeded: true,
    })),
    submitIntent: vi.fn(),
    submitIntentAsHost: vi.fn(async (input) => ({
      id: 'trade-1', roomId: input.roomId, idempotencyKey: input.idempotencyKey,
      deviceId: input.hostDeviceId, teamId: input.teamId, kind: 'trade', status: 'pending',
      intentRevision: 1, expectedRoomRevision: input.expectedRoomRevision, payload: input.payload,
      createdAt: '2026-07-19T00:00:02.000Z', resolvedAt: null,
    })),
    listIntents: vi.fn(async () => []),
    listDeviceIntents: vi.fn(),
    resolveIntent: vi.fn(),
    publishRoom: vi.fn(async () => room({ publicRevision: 2 })),
    restorePreviousPublicState: vi.fn(async () => room({ publicRevision: 2 })),
    closeRoom: vi.fn(async () => room({ status: 'closed', publicRevision: 2 })),
    subscribe: vi.fn((_roomId, nextHandlers) => {
      handlers = nextHandlers;
      return { unsubscribe: vi.fn(async () => undefined) };
    }),
  } as unknown as SnakeLiveRoomTransport;
  return {
    transport,
    setClaims(next: SnakeLiveClaim[]) { claims = next; },
    advanceRoom() { currentRoom = room({ ...currentRoom, publicRevision: 2 }); },
    addEvent,
    emitEvent(kind?: string, publicPayload?: SnakeLiveJsonObject) {
      handlers?.onEvent(addEvent(kind, publicPayload));
    },
    deliverEvent(event: SnakeLivePublicEvent) { handlers?.onEvent(event); },
    emitStatus(status: string) { handlers?.onStatus(status); },
  };
}

const capabilities: SnakeLiveHostCapabilityApi = {
  get: vi.fn(async (_sessionId, hostDeviceId) => ({ hostDeviceId, hostToken: 'host-token' })),
};

describe('useSnakeLiveHostRoom', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('publishes only public room state and seeds a private board without reading it', async () => {
    const harness = transportHarness();
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));

    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));
    expect(result.current.hostAccessReady).toBe(true);
    expect(harness.transport.createRoom).toHaveBeenCalledOnce();
    expect(harness.transport.seedCatalog).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 'room-1',
      hostDeviceId: 'host-device',
      catalog: liveCatalogPayload(),
    }));
    expect(result.current.catalog?.catalogRevision).toBe(1);

    await act(async () => {
      await result.current.publishSession({
        session: session(), eventKind: 'pick', publicEvent: { pick: 1 },
        idempotencyKey: 'publish-1',
      });
    });
    expect(harness.transport.publishRoom).toHaveBeenCalledWith(expect.objectContaining({
      expectedRoomRevision: 1,
      idempotencyKey: 'publish-1',
    }));
    expect(result.current.room?.publicRevision).toBe(2);

    await act(async () => {
      await expect(result.current.seedBoard({
        teamId: 'team-a', board: { revision: 1 }, idempotencyKey: 'seed-1',
      })).resolves.toEqual({ roomId: 'room-1', teamId: 'team-a', boardRevision: 1, seeded: true });
    });
    expect(harness.transport.seedBoardAsHost).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 'room-1', teamId: 'team-a', board: { revision: 1 }, idempotencyKey: 'seed-1',
    }));

    await act(async () => {
      await result.current.submitTradeIntent({
        teamId: 'team-a', payload: { action: 'POST', offerId: 'offer-1' },
        expectedRoomRevision: 2, idempotencyKey: 'trade-1',
      });
    });
    expect(harness.transport.submitIntentAsHost).toHaveBeenCalledWith(expect.objectContaining({
      teamId: 'team-a', kind: 'trade', expectedRoomRevision: 2, idempotencyKey: 'trade-1',
    }));
  });

  it('creates a FARM room with the FARM public catalog', async () => {
    const harness = transportHarness();
    const created = farmRoom();
    vi.mocked(harness.transport.createRoom).mockResolvedValue(created);
    vi.mocked(harness.transport.seedCatalog).mockResolvedValue({
      roomId: created.id,
      catalogRevision: 1,
      catalog: farmCatalogPayload(),
      createdAt: '2026-07-19T00:00:00.000Z',
    });
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: farmSession(),
      hostDeviceId: 'host-device',
      catalog: farmCatalogPayload(),
      transport: harness.transport,
      capabilities,
    }));

    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));
    expect(harness.transport.createRoom).toHaveBeenCalledWith(expect.objectContaining({ phase: 'FARM' }));
    expect(harness.transport.seedCatalog).toHaveBeenCalledWith(expect.objectContaining({
      roomId: created.id,
      catalog: farmCatalogPayload(),
    }));
    expect(result.current.publicSession?.draftPhase).toBe('FARM');
  });

  it('recovers Hotseat authority only when room-code recovery is explicit', async () => {
    const existing = room({ hostDeviceId: 'lost-host-device' });
    const harness = transportHarness(existing);
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(),
      hostDeviceId: 'recovered-host-device',
      catalog: liveCatalogPayload(),
      recoverHost: true,
      transport: harness.transport,
      capabilities,
    }));

    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));
    expect(harness.transport.recoverHost).toHaveBeenCalledWith(expect.objectContaining({
      roomId: existing.id,
      roomCode: existing.roomCode,
      expectedRoomRevision: existing.publicRevision,
      hostDeviceId: 'recovered-host-device',
      catalog: liveCatalogPayload(),
    }));
    expect(harness.transport.createRoom).not.toHaveBeenCalled();
    expect(result.current.room?.hostDeviceId).toBe('recovered-host-device');
  });

  it('uses a live event only as a nudge, then reads scoped claims from the server', async () => {
    const harness = transportHarness(room());
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));
    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));
    harness.setClaims([claim()]);
    act(() => harness.emitEvent());
    await waitFor(() => expect(result.current.claims).toHaveLength(1));
    expect(harness.transport.getRoom).toHaveBeenCalled();
    expect(harness.transport.listClaims).toHaveBeenCalled();
    expect(result.current.claims[0]?.id).toBe('claim-1');

  });

  it('restores the server recovery slot and adopts the returned public room', async () => {
    const restored = room({ publicRevision: 2, correctionAvailable: false });
    const harness = transportHarness(room({ correctionAvailable: true }));
    vi.mocked(harness.transport.restorePreviousPublicState).mockResolvedValue(restored);
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));
    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));

    await act(async () => {
      await expect(result.current.restorePreviousPublicState({
        expectedRoomRevision: 1,
        idempotencyKey: 'room-1:1',
      })).resolves.toEqual(restored);
    });

    expect(harness.transport.restorePreviousPublicState).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 'room-1',
      expectedRoomRevision: 1,
      idempotencyKey: expect.stringContaining('room-1:1'),
    }));
    expect(result.current.room?.publicRevision).toBe(2);
    expect(result.current.room?.correctionAvailable).toBe(false);
  });

  it('uses the immutable cloud catalog on reconnect and does not reseed when local metadata changes', async () => {
    const harness = transportHarness(room());
    const originalLocalCatalog = liveCatalogPayload();
    const changedLocalCatalog = {
      ...liveCatalogPayload(),
      league: { id: 'league', name: 'Changed Local League Name', teamIds: ['team-a'] },
    } satisfies SnakeLiveJsonObject;
    const initialSession = session();
    const advancedSession = { ...initialSession, currentPickIndex: 1, revision: 2 };
    const { result, rerender } = renderHook(({ localCatalog, currentSession }) => useSnakeLiveHostRoom({
      session: currentSession,
      hostDeviceId: 'host-device',
      catalog: localCatalog,
      transport: harness.transport,
      capabilities,
    }), { initialProps: { localCatalog: originalLocalCatalog, currentSession: initialSession } });

    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));
    expect(harness.transport.getCatalog).toHaveBeenCalledWith('room-1');
    expect(harness.transport.seedCatalog).not.toHaveBeenCalled();
    expect(result.current.catalog).toEqual(liveCatalogReceipt());

    rerender({ localCatalog: changedLocalCatalog, currentSession: advancedSession });
    await act(async () => { await Promise.resolve(); });

    expect(harness.transport.getCatalog).toHaveBeenCalledOnce();
    expect(harness.transport.seedCatalog).not.toHaveBeenCalled();
    expect(result.current.catalog).toEqual(liveCatalogReceipt());
  });

  it('reconnects from the immutable cloud catalog when the local catalog is unavailable', async () => {
    const harness = transportHarness(room());
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(),
      hostDeviceId: 'host-device',
      catalog: null,
      transport: harness.transport,
      capabilities,
    }));

    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));
    expect(harness.transport.getCatalog).toHaveBeenCalledWith('room-1');
    expect(harness.transport.seedCatalog).not.toHaveBeenCalled();
    expect(result.current.catalog).toEqual(liveCatalogReceipt());
  });

  it('repairs a room created before its catalog write completed', async () => {
    const harness = transportHarness(room());
    vi.mocked(harness.transport.getCatalog).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(),
      hostDeviceId: 'host-device',
      catalog: liveCatalogPayload(),
      transport: harness.transport,
      capabilities,
    }));

    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));
    expect(harness.transport.getCatalog).toHaveBeenCalledWith('room-1');
    expect(harness.transport.seedCatalog).toHaveBeenCalledOnce();
    expect(harness.transport.seedCatalog).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 'room-1',
      catalog: liveCatalogPayload(),
    }));
  });

  it('uses the fallback timer when Realtime misses a host update', async () => {
    vi.useFakeTimers();
    const harness = transportHarness(room());
    const { result, unmount } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));
    await flushMicrotasks();
    expect(result.current.liveRoomReady).toBe(true);
    harness.setClaims([claim()]);
    harness.advanceRoom();
    harness.addEvent('CLAIM_ACTIVITY', { teamId: 'team-a' });

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.room?.publicRevision).toBe(2);
    expect(result.current.claims).toHaveLength(1);
    unmount();
  });

  it.each([
    [101, 102],
    [102, 101],
  ])('keeps both Realtime events when delivery order is %s then %s', async (firstId, secondId) => {
    const harness = transportHarness(room());
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));
    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));
    harness.setClaims([claim()]);
    harness.advanceRoom();
    vi.mocked(harness.transport.listEvents).mockClear();

    const first = harness.addEvent('CLAIM_ACTIVITY', { teamId: 'team-a' }, firstId);
    act(() => harness.deliverEvent(first));
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    const second = harness.addEvent('INTENT_ACTIVITY', { teamId: 'team-b' }, secondId);
    act(() => harness.deliverEvent(second));

    await waitFor(() => expect(result.current.events.map((event) => event.id)).toEqual([101, 102]));
    expect(result.current.room?.publicRevision).toBe(2);
    expect(result.current.claims).toHaveLength(1);
    expect(harness.transport.listEvents).not.toHaveBeenCalled();
  });

  it('reloads current host state after Realtime reconnect even when an older event was missed', async () => {
    const harness = transportHarness(room());
    harness.addEvent('ROOM_CREATED', { roomRevision: 0, phase: 'MLB' }, 100);
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));
    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));
    await waitFor(() => expect(result.current.events.map((event) => event.id)).toEqual([100]));

    const newer = harness.addEvent('BOARD_ACTIVITY', { teamId: 'team-a' }, 102);
    act(() => harness.deliverEvent(newer));
    await waitFor(() => expect(result.current.events.map((event) => event.id)).toEqual([100, 102]));
    harness.addEvent('CLAIM_ACTIVITY', { teamId: 'team-b' }, 101);
    harness.setClaims([claim()]);
    harness.advanceRoom();
    vi.mocked(harness.transport.listEvents).mockClear();
    act(() => harness.emitStatus('SUBSCRIBED'));

    await waitFor(() => expect(result.current.room?.publicRevision).toBe(2));
    expect(result.current.claims).toHaveLength(1);
    expect(result.current.events.map((event) => event.id)).toEqual([100, 102]);
    expect(harness.transport.listEvents).not.toHaveBeenCalled();
  });

  it('reloads current host state on fallback when an older event was missed', async () => {
    vi.useFakeTimers();
    const harness = transportHarness(room());
    harness.addEvent('ROOM_CREATED', { roomRevision: 0, phase: 'MLB' }, 200);
    const { result, unmount } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));
    await flushMicrotasks();
    expect(result.current.liveRoomReady).toBe(true);
    const newer = harness.addEvent('BOARD_ACTIVITY', { teamId: 'team-a' }, 202);
    act(() => harness.deliverEvent(newer));
    await flushMicrotasks();
    harness.addEvent('INTENT_ACTIVITY', { teamId: 'team-b' }, 201);
    harness.setClaims([claim()]);
    harness.advanceRoom();
    vi.mocked(harness.transport.listEvents).mockClear();

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.room?.publicRevision).toBe(2);
    expect(result.current.claims).toHaveLength(1);
    expect(result.current.events.map((event) => event.id)).toEqual([200, 202]);
    expect(harness.transport.listEvents).not.toHaveBeenCalled();
    unmount();
  });

  it('reloads bounded current host state without replaying event history on an idle tick', async () => {
    vi.useFakeTimers();
    const harness = transportHarness(room());
    const { result, unmount } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));
    await flushMicrotasks();
    expect(result.current.liveRoomReady).toBe(true);
    vi.mocked(harness.transport.listEvents).mockClear();
    vi.mocked(harness.transport.getRoom).mockClear();
    vi.mocked(harness.transport.listClaims).mockClear();
    vi.mocked(harness.transport.listIntents).mockClear();

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(harness.transport.listEvents).not.toHaveBeenCalled();
    expect(harness.transport.getRoom).toHaveBeenCalledOnce();
    expect(harness.transport.listClaims).toHaveBeenCalledOnce();
    expect(harness.transport.listIntents).toHaveBeenCalledOnce();
    unmount();
  });

  it('merges host board activity without refreshing public claims or intents', async () => {
    const harness = transportHarness(room());
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));
    await waitFor(() => expect(result.current.liveRoomReady).toBe(true));
    vi.mocked(harness.transport.getRoom).mockClear();
    vi.mocked(harness.transport.listClaims).mockClear();
    vi.mocked(harness.transport.listIntents).mockClear();

    act(() => harness.emitEvent('BOARD_ACTIVITY', { teamId: 'team-a', boardRevision: 2 }));
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    expect(harness.transport.getRoom).not.toHaveBeenCalled();
    expect(harness.transport.listClaims).not.toHaveBeenCalled();
    expect(harness.transport.listIntents).not.toHaveBeenCalled();
  });

  it('coalesces repeated host fallback ticks into serialized refreshes', async () => {
    vi.useFakeTimers();
    const harness = transportHarness(room());
    const { result, unmount } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));
    await flushMicrotasks();
    expect(result.current.liveRoomReady).toBe(true);

    const gate = deferredVoid();
    let inFlight = 0;
    let maxInFlight = 0;
    let calls = 0;
    vi.mocked(harness.transport.getRoom).mockClear().mockImplementation(async () => {
      calls += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      if (calls === 1) await gate.promise;
      inFlight -= 1;
      return room();
    });

    act(() => { vi.advanceTimersByTime(20_000); });
    expect(harness.transport.getRoom).toHaveBeenCalledOnce();
    expect(maxInFlight).toBe(1);

    await act(async () => {
      gate.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(harness.transport.getRoom).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(harness.transport.getRoom).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBe(1);
    unmount();
  });

  it('does not let a second same-account device become the public host', async () => {
    const harness = transportHarness(room({ hostDeviceId: 'other-host' }));
    const localCapabilities: SnakeLiveHostCapabilityApi = {
      get: vi.fn(async () => ({ hostDeviceId: 'host-device', hostToken: 'first-token' })),
    };
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport,
      capabilities: localCapabilities,
    }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(
      'THIS DRAFT IS OPEN ON ANOTHER HOST DEVICE. USE THE ORIGINAL HOST BROWSER.',
    );
    expect(harness.transport.listClaims).not.toHaveBeenCalled();
    expect(harness.transport.publishRoom).not.toHaveBeenCalled();
  });

  it('reloads the owner session after all 176 picks without creating another room', async () => {
    const complete = completedSession();
    const completedRoom = room({
      roomCode: '9753',
      status: 'complete',
      publicRevision: 176,
      publicState: buildSnakeLivePublicState(complete),
    });
    const harness = transportHarness(completedRoom);
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport, capabilities,
    }));
    await waitFor(() => expect(result.current.hostAccessReady).toBe(true));
    expect(result.current.room).toMatchObject({ status: 'complete', publicRevision: 176, roomCode: '9753' });
    expect(result.current.publicSession?.completedPicks).toHaveLength(176);
    expect(harness.transport.findRoomBySession).toHaveBeenCalledWith(snakeLiveRoomRunKey(session()));
    expect(harness.transport.findRoomByCode).not.toHaveBeenCalled();
    expect(harness.transport.createRoom).not.toHaveBeenCalled();
  });

  it('fails closed when the saved host key does not match', async () => {
    const harness = transportHarness(room());
    vi.mocked(harness.transport.listClaims)
      .mockRejectedValueOnce(new SnakeLiveTransportError('forbidden', 'BAD HOST TOKEN'));
    const localCapabilities: SnakeLiveHostCapabilityApi = {
      get: vi.fn(async () => ({ hostDeviceId: 'host-device', hostToken: 'lost-token' })),
    };
    const { result } = renderHook(() => useSnakeLiveHostRoom({
      session: session(), hostDeviceId: 'host-device', catalog: liveCatalogPayload(), transport: harness.transport,
      capabilities: localCapabilities,
    }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(
      'THE HOST KEY DOES NOT MATCH THIS LIVE ROOM. USE THE ORIGINAL HOST BROWSER.',
    );
    expect(harness.transport.listClaims).toHaveBeenCalledOnce();
    expect(harness.transport.publishRoom).not.toHaveBeenCalled();
  });
});
