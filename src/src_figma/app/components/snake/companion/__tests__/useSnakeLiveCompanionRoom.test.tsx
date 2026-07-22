import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LeagueBuilderMlbDraftSession } from '../../../../../../utils/leagueBuilderStorage';
import type { SnakeLiveCompanionResume } from '../../../../../../utils/snakeLiveCapabilityStore';
import { buildSnakeLivePublicState } from '../../../../../../utils/snakeLiveRoomSession';
import {
  SnakeLiveTransportError,
  type SnakeLiveCatalog,
  type SnakeLiveClaim,
  type SnakeLiveIntent,
  type SnakeLiveJsonObject,
  type SnakeLivePublicEvent,
  type SnakeLiveRoom,
  type SnakeLiveRoomTransport,
  type SnakeLiveSeatBoard,
  type SnakeLiveSubscriptionHandlers,
} from '../../../../../../utils/snakeLiveRoomTypes';
import {
  useSnakeLiveCompanionRoom,
  type SnakeLiveCompanionCapabilityApi,
} from '../useSnakeLiveCompanionRoom';

function liveCatalogReceipt(): SnakeLiveCatalog {
  return {
    roomId: 'room-1',
    catalogRevision: 1,
    catalog: {
      formatVersion: 'snake-live-catalog-v1',
      league: { id: 'league', name: 'Test League', teamIds: ['team-a', 'team-b', 'team-c'] },
      teams: [
        { id: 'team-a', name: 'Team A' },
        { id: 'team-b', name: 'Team B' },
        { id: 'team-c', name: 'Team C' },
      ],
      players: [{ id: 'p1', firstName: 'Player', lastName: 'One' }],
      registeredPool: { leagueId: 'league', players: [{ id: 'p1', iv: 1 }] },
    },
    createdAt: '2026-07-19T00:00:00.000Z',
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
      clubs: [
        { teamId: 'team-a', hotseat: false, gmName: 'Poke Foster' },
        { teamId: 'team-b', hotseat: false, gmName: 'Poke Foster' },
        { teamId: 'team-c', hotseat: false, gmName: 'Another GM' },
      ],
    },
  } as unknown as LeagueBuilderMlbDraftSession;
}

function room(overrides: Partial<SnakeLiveRoom> = {}): SnakeLiveRoom {
  return {
    id: 'room-1', ownerUserId: 'user', sessionId: 'league:1:snake', roomCode: '2468', phase: 'MLB',
    status: 'open', publicRevision: 1, publicState: buildSnakeLivePublicState(session()),
    hostDeviceId: 'host-device', createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z', ...overrides,
  };
}

function liveClaim(
  teamId: string,
  status: SnakeLiveClaim['status'] = 'pending',
  requestKey = `claim:league:1:snake:companion-device:${teamId}`,
): SnakeLiveClaim {
  return {
    id: `claim-${teamId}`, roomId: 'room-1', requestKey,
    deviceId: 'companion-device', gmName: 'Poke Foster', teamId, status, revision: 1,
    createdAt: '2026-07-19T00:00:00.000Z', resolvedAt: status === 'pending' ? null : '2026-07-19T00:00:01.000Z',
  };
}

function board(teamId: string, revision: number): SnakeLiveSeatBoard {
  return {
    roomId: 'room-1', teamId, boardRevision: revision, board: { teamId, revision },
    updatedByDeviceId: 'companion-device', updatedAt: '2026-07-19T00:00:01.000Z',
  };
}

function intent(teamId: string): SnakeLiveIntent {
  return {
    id: `intent-${teamId}`, roomId: 'room-1', idempotencyKey: `intent-key-${teamId}`,
    deviceId: 'companion-device', teamId, kind: 'pick', status: 'pending', intentRevision: 1,
    expectedRoomRevision: 1, payload: { playerId: 'p1' },
    createdAt: '2026-07-19T00:00:02.000Z', resolvedAt: null,
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

function transportHarness(initialRoom: SnakeLiveRoom = room()) {
  let handlers: SnakeLiveSubscriptionHandlers | null = null;
  let registered = false;
  let claims: SnakeLiveClaim[] = [];
  let intents: SnakeLiveIntent[] = [];
  let currentRoom = initialRoom;
  let currentCatalog: SnakeLiveCatalog | null = liveCatalogReceipt();
  let nextEventId = 1;
  const boards: Record<string, SnakeLiveSeatBoard> = {};
  const serverEvents: SnakeLivePublicEvent[] = [];
  const callOrder: string[] = [];
  const addEvent = (
    kind = 'CLAIM_ACTIVITY',
    publicPayload: SnakeLiveJsonObject = { changed: true },
    suppliedId?: number,
  ): SnakeLivePublicEvent => {
    const event: SnakeLivePublicEvent = {
      id: suppliedId ?? nextEventId, roomId: 'room-1', roomRevision: currentRoom.publicRevision,
      kind, publicPayload,
      createdAt: '2026-07-19T00:00:03.000Z',
    };
    nextEventId = Math.max(nextEventId + 1, event.id + 1);
    serverEvents.push(event);
    return event;
  };
  const transport = {
    createRoom: vi.fn(),
    findRoomBySession: vi.fn(),
    findRoomByCode: vi.fn(async (code: string) => code === '2468' ? currentRoom : null),
    getRoom: vi.fn(async () => currentRoom),
    seedCatalog: vi.fn(),
    getCatalog: vi.fn(async () => currentCatalog),
    listEvents: vi.fn(async (_roomId: string, afterEventId = 0) => (
      serverEvents.filter((event) => event.id > afterEventId)
    )),
    submitClaim: vi.fn(async (input) => {
      callOrder.push(`submit:${input.teamId}`);
      registered = true;
      const existing = claims.find((entry) => entry.requestKey === input.requestKey);
      if (existing) return existing;
      const receipt = liveClaim(input.teamId, 'pending', input.requestKey);
      claims = [...claims, receipt];
      return receipt;
    }),
    listClaims: vi.fn(),
    listDeviceClaims: vi.fn(async () => {
      callOrder.push('list-claims');
      if (!registered) throw new SnakeLiveTransportError('forbidden', 'THE DEVICE IS NOT REGISTERED.');
      return claims;
    }),
    resolveClaim: vi.fn(),
    getBoard: vi.fn(async (access) => boards[access.teamId] ?? null),
    writeBoard: vi.fn(async (input) => {
      const receipt = board(input.teamId, input.expectedBoardRevision + 1);
      boards[input.teamId] = receipt;
      return receipt;
    }),
    submitIntent: vi.fn(async (input) => {
      const receipt = intent(input.teamId);
      intents = [...intents.filter((entry) => entry.id !== receipt.id), receipt];
      return receipt;
    }),
    submitIntentAsHost: vi.fn(),
    listIntents: vi.fn(),
    listDeviceIntents: vi.fn(async () => {
      if (!registered) throw new SnakeLiveTransportError('forbidden', 'THE DEVICE IS NOT REGISTERED.');
      return intents;
    }),
    resolveIntent: vi.fn(),
    publishRoom: vi.fn(),
    closeRoom: vi.fn(),
    subscribe: vi.fn((_roomId, nextHandlers) => {
      handlers = nextHandlers;
      return { unsubscribe: vi.fn(async () => undefined) };
    }),
  } as unknown as SnakeLiveRoomTransport;
  return {
    transport,
    callOrder,
    approveAll() {
      registered = true;
      claims = ['team-a', 'team-b'].map((teamId) => liveClaim(teamId, 'approved'));
      boards['team-a'] = board('team-a', 2);
      boards['team-b'] = board('team-b', 4);
    },
    setBoard(teamId: string, revision: number) { boards[teamId] = board(teamId, revision); },
    setCatalog(nextCatalog: SnakeLiveCatalog | null) { currentCatalog = nextCatalog; },
    advanceRoom() { currentRoom = room({ ...currentRoom, publicRevision: 2 }); },
    addEvent,
    emitEvent(kind?: string, publicPayload?: SnakeLiveJsonObject) {
      handlers?.onEvent(addEvent(kind, publicPayload));
    },
    deliverEvent(event: SnakeLivePublicEvent) { handlers?.onEvent(event); },
    emitStatus(status: string) { handlers?.onStatus(status); },
  };
}

function capabilityHarness(initial: Record<string, SnakeLiveCompanionResume> = {}) {
  const resumes = new Map(Object.entries(initial));
  const api: SnakeLiveCompanionCapabilityApi = {
    getDeviceId: vi.fn(async () => 'companion-device'),
    getRoomCredentials: vi.fn(async (_roomId, deviceId) => ({ deviceId, deviceToken: 'device-token' })),
    readResume: vi.fn(async (ownerUserId) => resumes.get(ownerUserId) ?? null),
    saveResume: vi.fn(async (ownerUserId, resume) => { resumes.set(ownerUserId, resume); }),
    clearResume: vi.fn(async (ownerUserId, roomId, deviceId) => {
      const current = resumes.get(ownerUserId);
      if (roomId && current?.roomId !== roomId) return;
      if (deviceId && current?.deviceId !== deviceId) return;
      resumes.delete(ownerUserId);
    }),
  };
  return { api, resumes };
}

const savedResume: SnakeLiveCompanionResume = {
  roomId: 'room-1', roomCode: '2468', deviceId: 'companion-device', gmName: 'Poke Foster',
};

describe('useSnakeLiveCompanionRoom', () => {
  afterEach(() => vi.useRealTimers());

  it('registers a first device by submitting stable claims before any scoped read', async () => {
    const harness = transportHarness();
    const capability = capabilityHarness();
    const { result } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await act(async () => {
      await result.current.claimDesk('  POKE FOSTER ', '2468');
    });
    expect(harness.callOrder).toEqual(['submit:team-a', 'submit:team-b', 'list-claims']);
    expect(harness.transport.submitClaim).toHaveBeenCalledTimes(2);
    expect(vi.mocked(harness.transport.submitClaim).mock.calls.map(([input]) => input.requestKey))
      .toEqual([
        'claim:league:1:snake:companion-device:team-a',
        'claim:league:1:snake:companion-device:team-b',
      ]);
    expect(capability.api.saveResume).toHaveBeenCalledWith('user', {
      ...savedResume,
      gmName: 'POKE FOSTER',
    });
    expect(result.current.activeRoomId).toBe('room-1');
    expect(result.current.accessReady).toBe(true);
    expect(result.current.status).toBe('waiting');
    expect(result.current.claims).toHaveLength(2);
  });

  it('uses the same claim keys on retry and does not create duplicate claims', async () => {
    const harness = transportHarness();
    const capability = capabilityHarness();
    const { result } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await act(async () => { await result.current.claimDesk('Poke Foster', '2468'); });
    await act(async () => { await result.current.claimDesk('Poke Foster', '2468'); });

    const requestKeys = vi.mocked(harness.transport.submitClaim).mock.calls.map(([input]) => input.requestKey);
    expect(requestKeys).toEqual([
      'claim:league:1:snake:companion-device:team-a',
      'claim:league:1:snake:companion-device:team-b',
      'claim:league:1:snake:companion-device:team-a',
      'claim:league:1:snake:companion-device:team-b',
    ]);
    expect(result.current.claims).toHaveLength(2);
  });

  it('auto-resumes the signed-in owner and recovers only approved private boards', async () => {
    const harness = transportHarness();
    harness.approveAll();
    const capability = capabilityHarness({ user: savedResume });
    const { result } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));

    await waitFor(() => expect(result.current.accessReady).toBe(true));
    expect(result.current.status).toBe('live');
    expect(result.current.activeRoomId).toBe('room-1');
    expect(result.current.catalog?.catalogRevision).toBe(1);
    expect(harness.transport.getCatalog).toHaveBeenCalledOnce();
    expect(Object.keys(result.current.boardsByTeamId).sort()).toEqual(['team-a', 'team-b']);
    expect(harness.transport.submitClaim).not.toHaveBeenCalled();
  });

  it('hides the old owner desk at once when the signed-in account changes', async () => {
    const harness = transportHarness(room({ ownerUserId: 'owner-a' }));
    harness.approveAll();
    const capability = capabilityHarness({ 'owner-a': savedResume });
    const { result, rerender } = renderHook(
      ({ ownerUserId }) => useSnakeLiveCompanionRoom({
        ownerUserId, transport: harness.transport, capabilities: capability.api,
      }),
      { initialProps: { ownerUserId: 'owner-a' as string | null } },
    );
    await waitFor(() => expect(result.current.accessReady).toBe(true));
    expect(Object.keys(result.current.boardsByTeamId)).toHaveLength(2);

    rerender({ ownerUserId: 'owner-b' });
    expect(result.current.accessReady).toBe(false);
    expect(result.current.activeRoomId).toBeNull();
    expect(result.current.boardsByTeamId).toEqual({});
    expect(result.current.status).toBe('idle');
    await waitFor(() => expect(capability.api.readResume).toHaveBeenCalledWith('owner-b'));
  });

  it('disconnects locally and can rejoin the same room with the retained device key', async () => {
    const harness = transportHarness();
    harness.approveAll();
    const capability = capabilityHarness({ user: savedResume });
    const { result } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await waitFor(() => expect(result.current.accessReady).toBe(true));

    await act(async () => { await result.current.disconnect(); });
    expect(capability.api.clearResume).toHaveBeenCalledWith('user', 'room-1', 'companion-device');
    expect(result.current.accessReady).toBe(false);
    expect(result.current.activeRoomId).toBeNull();
    expect(result.current.boardsByTeamId).toEqual({});

    await act(async () => { await result.current.claimDesk('Poke Foster', '2468'); });
    expect(result.current.accessReady).toBe(true);
    expect(result.current.activeRoomId).toBe('room-1');
    expect(result.current.status).toBe('live');
    expect(harness.transport.submitClaim).toHaveBeenCalledTimes(2);
    expect(capability.api.getRoomCredentials).toHaveBeenLastCalledWith('room-1', 'companion-device');
  });

  it('treats a live event as a nudge and reloads public truth plus approved private boards', async () => {
    const harness = transportHarness();
    const capability = capabilityHarness();
    const { result } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await act(async () => { await result.current.claimDesk('Poke Foster', '2468'); });
    await waitFor(() => expect(harness.transport.subscribe).toHaveBeenCalledOnce());
    harness.approveAll();
    harness.advanceRoom();
    act(() => harness.emitEvent());

    await waitFor(() => expect(result.current.status).toBe('live'));
    expect(result.current.room?.publicRevision).toBe(2);
    expect(Object.keys(result.current.boardsByTeamId).sort()).toEqual(['team-a', 'team-b']);
    expect(result.current.boardsByTeamId['team-b']?.boardRevision).toBe(4);
    expect(harness.transport.getRoom).toHaveBeenCalled();
    expect(harness.transport.listDeviceClaims).toHaveBeenCalled();
    expect(harness.transport.listDeviceIntents).toHaveBeenCalled();
  });

  it('reloads current companion state when Realtime misses an update', async () => {
    vi.useFakeTimers();
    const harness = transportHarness();
    harness.approveAll();
    const capability = capabilityHarness({ user: savedResume });
    const { result, unmount } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await flushMicrotasks();
    expect(result.current.accessReady).toBe(true);
    harness.advanceRoom();
    harness.addEvent('CLAIM_ACTIVITY', { teamId: 'team-a' });

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.room?.publicRevision).toBe(2);
    expect(Object.keys(result.current.boardsByTeamId).sort()).toEqual(['team-a', 'team-b']);
    unmount();
  });

  it('reloads current companion state after Realtime reconnect when an older event was missed', async () => {
    const harness = transportHarness();
    harness.approveAll();
    harness.addEvent('ROOM_CREATED', { roomRevision: 0, phase: 'MLB' }, 100);
    const capability = capabilityHarness({ user: savedResume });
    const { result } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await waitFor(() => expect(result.current.accessReady).toBe(true));
    await waitFor(() => expect(result.current.events.map((event) => event.id)).toEqual([100]));

    harness.setBoard('team-a', 5);
    const newer = harness.addEvent('BOARD_ACTIVITY', { teamId: 'team-a', boardRevision: 5 }, 102);
    act(() => harness.deliverEvent(newer));
    await waitFor(() => expect(result.current.events.map((event) => event.id)).toEqual([100, 102]));
    harness.addEvent('CLAIM_ACTIVITY', { teamId: 'team-b' }, 101);
    harness.advanceRoom();
    vi.mocked(harness.transport.listEvents).mockClear();
    act(() => harness.emitStatus('SUBSCRIBED'));

    await waitFor(() => expect(result.current.room?.publicRevision).toBe(2));
    expect(result.current.boardsByTeamId['team-a']?.boardRevision).toBe(5);
    expect(result.current.events.map((event) => event.id)).toEqual([100, 102]);
    expect(harness.transport.listEvents).not.toHaveBeenCalled();
  });

  it('reloads bounded current companion state without replaying event history on an idle tick', async () => {
    vi.useFakeTimers();
    const harness = transportHarness();
    harness.approveAll();
    const capability = capabilityHarness({ user: savedResume });
    const { result, unmount } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await flushMicrotasks();
    expect(result.current.accessReady).toBe(true);
    vi.mocked(harness.transport.listEvents).mockClear();
    vi.mocked(harness.transport.getRoom).mockClear();
    vi.mocked(harness.transport.listDeviceClaims).mockClear();
    vi.mocked(harness.transport.listDeviceIntents).mockClear();
    vi.mocked(harness.transport.getBoard).mockClear();
    vi.mocked(harness.transport.getCatalog).mockClear();

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(harness.transport.listEvents).not.toHaveBeenCalled();
    expect(harness.transport.getRoom).toHaveBeenCalledOnce();
    expect(harness.transport.listDeviceClaims).toHaveBeenCalledOnce();
    expect(harness.transport.listDeviceIntents).toHaveBeenCalledOnce();
    expect(harness.transport.getBoard).toHaveBeenCalledTimes(2);
    expect(harness.transport.getCatalog).not.toHaveBeenCalled();
    unmount();
  });

  it('replaces an invalid resumed catalog after the host repairs the live room', async () => {
    vi.useFakeTimers();
    const harness = transportHarness();
    harness.approveAll();
    const invalid = liveCatalogReceipt();
    invalid.catalog = { ...invalid.catalog, teams: [{ id: 'team-a', name: 'Team A' }] };
    vi.mocked(harness.transport.getCatalog)
      .mockResolvedValueOnce(invalid)
      .mockResolvedValue(liveCatalogReceipt());
    const capability = capabilityHarness({ user: savedResume });
    const { result, unmount } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await flushMicrotasks();
    expect(result.current.accessReady).toBe(true);

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(harness.transport.getCatalog).toHaveBeenCalledTimes(2);
    expect(result.current.catalog).toEqual(liveCatalogReceipt());
    unmount();
  });

  it('keeps a resumed companion live while a missing catalog is repaired', async () => {
    vi.useFakeTimers();
    const harness = transportHarness();
    harness.approveAll();
    harness.setCatalog(null);
    const capability = capabilityHarness({ user: savedResume });
    const { result, unmount } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await flushMicrotasks();

    expect(result.current.accessReady).toBe(true);
    expect(result.current.activeRoomId).toBe('room-1');
    expect(result.current.catalog).toBeNull();
    expect(result.current.error).toBe('THE LIVE PLAYER CATALOG IS NOT AVAILABLE YET.');

    harness.setCatalog(liveCatalogReceipt());
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.catalog).toEqual(liveCatalogReceipt());
    expect(result.current.error).toBeNull();
    expect(result.current.accessReady).toBe(true);
    unmount();
  });

  it('refreshes only an approved team board for board activity', async () => {
    const harness = transportHarness();
    harness.approveAll();
    const capability = capabilityHarness({ user: savedResume });
    const { result } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await waitFor(() => expect(result.current.accessReady).toBe(true));
    vi.mocked(harness.transport.getRoom).mockClear();
    vi.mocked(harness.transport.listDeviceClaims).mockClear();
    vi.mocked(harness.transport.listDeviceIntents).mockClear();
    vi.mocked(harness.transport.getBoard).mockClear();
    harness.setBoard('team-a', 5);

    act(() => harness.emitEvent('BOARD_ACTIVITY', { teamId: 'team-a', boardRevision: 5 }));
    await waitFor(() => expect(result.current.boardsByTeamId['team-a']?.boardRevision).toBe(5));
    expect(harness.transport.getBoard).toHaveBeenCalledOnce();
    expect(harness.transport.getBoard).toHaveBeenCalledWith(expect.objectContaining({ teamId: 'team-a' }));
    expect(harness.transport.getRoom).not.toHaveBeenCalled();
    expect(harness.transport.listDeviceClaims).not.toHaveBeenCalled();
    expect(harness.transport.listDeviceIntents).not.toHaveBeenCalled();

    vi.mocked(harness.transport.getBoard).mockClear();
    act(() => harness.emitEvent('BOARD_ACTIVITY', { teamId: 'team-c', boardRevision: 9 }));
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    expect(harness.transport.getBoard).not.toHaveBeenCalled();
    expect(harness.transport.getRoom).not.toHaveBeenCalled();
  });

  it('keeps one companion current-state refresh in flight across repeated ticks', async () => {
    vi.useFakeTimers();
    const harness = transportHarness();
    harness.approveAll();
    const capability = capabilityHarness({ user: savedResume });
    const { result, unmount } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await flushMicrotasks();
    expect(result.current.accessReady).toBe(true);

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

  it('writes an approved team board only after the server returns a receipt', async () => {
    const harness = transportHarness();
    harness.approveAll();
    const capability = capabilityHarness({ user: savedResume });
    const { result } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await waitFor(() => expect(result.current.status).toBe('live'));

    let receipt: SnakeLiveSeatBoard | undefined;
    await act(async () => {
      receipt = await result.current.writeBoard({
        teamId: 'team-a', expectedBoardRevision: 2, board: { changed: true }, idempotencyKey: 'board-1',
      });
    });
    expect(receipt?.boardRevision).toBe(3);
    expect(result.current.boardsByTeamId['team-a']?.boardRevision).toBe(3);
    expect(harness.transport.writeBoard).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 'room-1', deviceId: 'companion-device', deviceToken: 'device-token',
      teamId: 'team-a', expectedBoardRevision: 2, idempotencyKey: 'board-1',
    }));

    await act(async () => {
      await result.current.submitIntent({
        teamId: 'team-a', kind: 'pick', payload: { playerId: 'p1' },
        expectedRoomRevision: 1, idempotencyKey: 'pick-1',
      });
    });
    expect(harness.transport.submitIntent).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 'room-1', teamId: 'team-a', kind: 'pick',
      expectedRoomRevision: 1, idempotencyKey: 'pick-1',
    }));
    expect(result.current.intents).toHaveLength(1);
  });

  it('does not create a claim when the GM name has no team in the room', async () => {
    const harness = transportHarness();
    const capability = capabilityHarness();
    const { result } = renderHook(() => useSnakeLiveCompanionRoom({
      ownerUserId: 'user', transport: harness.transport, capabilities: capability.api,
    }));
    await expect(act(async () => result.current.claimDesk('Missing GM', '2468')))
      .rejects.toThrow('DOES NOT HAVE A COMPANION TEAM');
    expect(harness.transport.submitClaim).not.toHaveBeenCalled();
    expect(result.current.accessReady).toBe(false);
  });
});
