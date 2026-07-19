import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const syncMockState = vi.hoisted(() => ({
  suppressed: true,
  upsert: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => syncMockState.suppressed,
    upsert: syncMockState.upsert,
    remove: syncMockState.remove,
  },
}));

import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  createMlbDraftSessionId,
  freezeMlbDraftRoomSessionWithRegisteredPool,
  getMlbDraftSession,
  getRegisteredPool,
  markSnakeRosterHandoff,
  patchMlbDraftSessionFarmSeatBoard,
  patchMlbDraftSessionSeatBoard,
  patchMlbDraftSessionSnakeCompanions,
  postApprovedCompanionTradeOffer,
  resetCompletedDraftArcAtomically,
  saveLeagueTemplate,
  saveRegisteredPool,
  saveMlbDraftRoomSession,
  saveMlbDraftSession,
  SNAKE_SEAT_BOARD_AUTHORITY_FORMAT,
  updateMlbDraftSessionAtomically,
  type LeagueBuilderMlbDraftSession,
  type FarmSeatBoardRecord,
  type SnakeSeatBoardRecord,
  type SnakeSeatBoardStoreRecord,
} from '../leagueBuilderStorage';
import {
  ensureCompanionRoom,
  submitCompanionClaim,
} from '../../src_figma/app/components/snake/companion/companionModel';
import { buildSnakeOrder } from '../../engines/leagueConstruction';
import { buildSnakeRosterHandoff, freezeSnakeDraftSession } from '../snakeDraftManifest';
import { applySnakePickWithCorrection, restoreLatestSnakeCorrection } from '../../engines/snakeSession';
import { createFarmSnakeSession, FARM_SNAKE_SESSION_NUMBER } from '../../engines/snakeFarmSlots';
import {
  nodSnakeTradeOffer,
  postSnakeTradeOffer,
  proposalFromOpenSnakeOffer,
} from '../../engines/snakeTradeOffers';

function session(): LeagueBuilderMlbDraftSession {
  return {
    id: createMlbDraftSessionId('perfroom-league', 1),
    leagueId: 'perfroom-league',
    seasonNumber: 1,
    seed: 'perfroom-seed',
    workflowVersion: 'snake-v1',
    engineMethodVersion: 'snake-s1a',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: 22,
    pickOrder: [{ round: 1, pick: 1, teamId: 'team-a' }],
    completedPicks: [],
    snakeSetup: {
      poolPlayerIds: ['player-a'],
      versionSelections: {},
      clubs: [{ teamId: 'team-a', gmName: 'Alex', hotseat: false }],
      orderSeed: 'order',
    },
    revision: 0,
    currentPickIndex: 0,
    createdDate: '2026-07-11T00:00:00.000Z',
    lastModified: '2026-07-11T00:00:00.000Z',
  };
}

function sessionWithFrozenClubs(...teamIds: string[]): LeagueBuilderMlbDraftSession {
  const value = session();
  return {
    ...value,
    snakeSetup: {
      ...value.snakeSetup!,
      clubs: teamIds.map((teamId) => ({ teamId, hotseat: false })),
    },
  };
}

function board(revision: number, marker: string): SnakeSeatBoardRecord {
  return {
    slots: { marker } as unknown as SnakeSeatBoardRecord['slots'],
    rankings: { global: [marker] },
    revision,
  };
}

function farmBoard(revision: number, marker: string): FarmSeatBoardRecord {
  return {
    overall: [marker],
    byPosition: { CF: [marker] },
    frozenProspectIds: [marker],
    plannedProspectIds: [marker],
    revision,
  };
}

function openLeagueBuilderDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kbl-league-builder');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putRawRecord(storeName: 'mlbDraftSessions' | 'snakeSeatBoards', value: unknown): Promise<void> {
  const db = await openLeagueBuilderDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function getRawRecord<T>(storeName: 'mlbDraftSessions' | 'snakeSeatBoards', id: string): Promise<T | undefined> {
  const db = await openLeagueBuilderDatabase();
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

async function getRawSessionAndBoards(sessionId: string): Promise<string> {
  const db = await openLeagueBuilderDatabase();
  const value = await new Promise<{ session: unknown; boards: unknown[] }>((resolve, reject) => {
    const tx = db.transaction(['mlbDraftSessions', 'snakeSeatBoards'], 'readonly');
    const sessionRequest = tx.objectStore('mlbDraftSessions').get(sessionId);
    const boardsRequest = tx.objectStore('snakeSeatBoards').index('sessionId').getAll(sessionId);
    let reads = 0;
    const finish = () => {
      reads += 1;
      if (reads !== 2) return;
      resolve({
        session: sessionRequest.result,
        boards: [...boardsRequest.result].sort((left, right) => String(left.id).localeCompare(String(right.id))),
      });
    };
    sessionRequest.onsuccess = finish;
    boardsRequest.onsuccess = finish;
    sessionRequest.onerror = () => reject(sessionRequest.error);
    boardsRequest.onerror = () => reject(boardsRequest.error);
  });
  db.close();
  return JSON.stringify(value);
}

function seatBoardStoreId(sessionId: string, phase: 'MLB' | 'FARM', teamId: string): string {
  return `${sessionId}::${phase.toLowerCase()}-seat::${teamId}`;
}

function legacyRawSession(
  session: LeagueBuilderMlbDraftSession,
): LeagueBuilderMlbDraftSession {
  const legacy = structuredClone(session);
  delete legacy.seatBoardAuthorityFormat;
  return legacy;
}

function expectStandaloneAuthority(session: LeagueBuilderMlbDraftSession | undefined): void {
  expect(session?.seatBoardAuthorityFormat).toBe(SNAKE_SEAT_BOARD_AUTHORITY_FORMAT);
  expect(session).not.toHaveProperty('seatBoards');
  expect(session).not.toHaveProperty('farmSeatBoards');
}

async function resetStorage(): Promise<void> {
  __resetLeagueBuilderDatabaseForTests();
  await clearAllLeagueBuilderData().catch(() => undefined);
  __resetLeagueBuilderDatabaseForTests();
}

function canonicalCompletedMlbSession(input?: {
  seatBoards?: LeagueBuilderMlbDraftSession['seatBoards'];
}): LeagueBuilderMlbDraftSession {
  const pickOrder = buildSnakeOrder(['team-a'], 22);
  const playerIds = pickOrder.map((slot) => `player-${slot.pick}`);
  return {
    ...session(),
    pickOrder,
    completedPicks: pickOrder.map((slot, index) => ({
      ...slot,
      playerId: playerIds[index],
      settledSalary: 100,
    })),
    snakeSetup: {
      ...session().snakeSetup!,
      poolPlayerIds: playerIds,
    },
    trades: [],
    currentPickIndex: pickOrder.length,
    ...(input?.seatBoards ? { seatBoards: input.seatBoards } : {}),
  };
}

function completedMlbAuthorityFixture(): LeagueBuilderMlbDraftSession {
  const completed = canonicalCompletedMlbSession();
  const frozen = freezeSnakeDraftSession({
    session: completed,
    expectedPhase: 'MLB',
    poolPlayerIds: completed.snakeSetup!.poolPlayerIds,
    salaryByPlayerId: new Map(completed.snakeSetup!.poolPlayerIds.map((playerId) => [playerId, 100])),
    frozenAt: '2026-07-14T11:00:00.000Z',
  });
  return {
    ...frozen,
    rosterHandoff: buildSnakeRosterHandoff(frozen, 'MLB', '2026-07-14T11:01:00.000Z'),
  };
}

async function persistCompletedMlbAuthority(input?: {
  seatBoards?: LeagueBuilderMlbDraftSession['seatBoards'];
  handoff?: boolean;
}): Promise<LeagueBuilderMlbDraftSession> {
  const completed = canonicalCompletedMlbSession(input);
  const pool = {
    leagueId: 'perfroom-league', tier: 'standard' as const, balanceMode: 'taxed' as const,
    players: completed.snakeSetup!.poolPlayerIds.map((id) => ({ id, iv: 100, salary: 100 })),
    tierCap: 10_000,
    luxuryCaps: [], pickValueChart: [], totalSlots: 22, poolSurplusWarning: false, locked: true,
  };
  await saveRegisteredPool(pool);
  await saveMlbDraftSession(completed);
  const frozen = freezeSnakeDraftSession({
    session: completed,
    expectedPhase: 'MLB',
    poolPlayerIds: completed.snakeSetup!.poolPlayerIds,
    salaryByPlayerId: new Map(completed.snakeSetup!.poolPlayerIds.map((playerId) => [playerId, 100])),
    frozenAt: '2026-07-14T11:00:00.000Z',
  });
  const persisted = await freezeMlbDraftRoomSessionWithRegisteredPool({
    session: frozen,
    registeredPool: pool,
    expectedRevision: 0,
  });
  if (input?.handoff === false) return persisted;
  return markSnakeRosterHandoff({
    leagueId: persisted.leagueId,
    seasonNumber: persisted.seasonNumber,
    phase: 'MLB',
    sourceSessionId: persisted.draftManifest!.source.sessionId,
    manifestPoolIdentity: persisted.draftManifest!.pool.identity,
    committedAt: '2026-07-14T11:01:00.000Z',
  });
}

function farmCandidateFrom(mlbSession: LeagueBuilderMlbDraftSession): LeagueBuilderMlbDraftSession {
  return createFarmSnakeSession({
    mlbSession,
    teamOrder: ['team-a'],
    existingFarmRosterCountsByTeamId: { 'team-a': 8 },
    farmBudgetsByTeamId: { 'team-a': 96_000 },
    farmArchetypeIdByTeamId: { 'team-a': 'farm-balanced' },
    prospectIds: ['prospect-a', 'prospect-b'],
    prospects: [{ id: 'prospect-a' }, { id: 'prospect-b' }] as never,
    now: '2026-07-14T12:00:00.000Z',
  });
}

async function seedRawFarmAuthority(input?: {
  pickOrder?: LeagueBuilderMlbDraftSession['pickOrder'];
  farmSeatBoard?: FarmSeatBoardRecord;
}): Promise<LeagueBuilderMlbDraftSession> {
  const pickOrder = input?.pickOrder ?? [
    { round: 1, pick: 1, teamId: 'team-a' },
    { round: 2, pick: 2, teamId: 'team-a' },
  ];
  const value: LeagueBuilderMlbDraftSession = {
    ...session(),
    id: createMlbDraftSessionId('perfroom-league', FARM_SNAKE_SESSION_NUMBER),
    seasonNumber: FARM_SNAKE_SESSION_NUMBER,
    draftPhase: 'FARM',
    workflowVersion: 'snake-v1-farm',
    engineMethodVersion: 'snake-s6',
    rounds: 10,
    pickOrder,
    farmSlotSalaries: pickOrder.map((_, index) => (pickOrder.length - index) * 1_000),
    farmProspectSnapshot: pickOrder.map((slot) => ({ id: `player-${slot.pick}` } as never)),
    snakeSetup: {
      poolPlayerIds: pickOrder.map((slot) => `player-${slot.pick}`),
      versionSelections: {},
      orderSeed: 'perfroom-farm-order',
      clubs: [{ teamId: 'team-a', gmName: 'Alex', hotseat: false }],
    },
    trades: [],
    correctionSnapshots: [],
    completedPicks: [],
    currentPickIndex: 0,
    revision: 0,
    ...(input?.farmSeatBoard ? { farmSeatBoards: { 'team-a': input.farmSeatBoard } } : {}),
  };
  await putRawRecord('mlbDraftSessions', value);
  if (input?.farmSeatBoard) {
    await putRawRecord('snakeSeatBoards', {
      id: seatBoardStoreId(value.id, 'FARM', 'team-a'),
      sessionId: value.id,
      leagueId: value.leagueId,
      seasonNumber: value.seasonNumber,
      teamId: 'team-a',
      phase: 'FARM',
      board: input.farmSeatBoard,
      revision: input.farmSeatBoard.revision,
      lastModified: value.lastModified,
    } satisfies SnakeSeatBoardStoreRecord);
  }
  return (await getMlbDraftSession(value.leagueId, value.seasonNumber))!;
}

describe('PERFROOM room-session persistence', () => {
  beforeEach(async () => {
    syncMockState.suppressed = true;
    syncMockState.upsert.mockClear();
    syncMockState.remove.mockClear();
    await resetStorage();
  });
  afterEach(async () => {
    syncMockState.suppressed = true;
    await resetStorage();
  });

  test('main posting preserves the authoritative premium through persistence, reload, nods, and proposal reconstruction', async () => {
    const source = {
      ...session(),
      pickOrder: [
        { round: 1, pick: 1, teamId: 'team-b' },
        { round: 1, pick: 2, teamId: 'team-a' },
      ],
    };
    const proposal = {
      buyerTeamId: 'team-a', sellerTeamId: 'team-b', targetPick: 1,
      offerPickNumbers: [2], receivePickNumbers: [1],
      offerValue: 117, receiveValue: 100, sellerPremium: 17, sessionRevision: 0,
    };
    const posted = postSnakeTradeOffer({ session: source, phase: 'MLB', proposal, postedAt: '2026-07-13T10:00:00.000Z' });
    expect(posted.openTradeOffers?.[0].sellerPremium).toBe(17);
    await saveMlbDraftSession(posted);
    const loaded = (await getMlbDraftSession(source.leagueId, source.seasonNumber))!;
    expect(loaded.openTradeOffers?.[0].sellerPremium).toBe(17);
    const buyerNod = nodSnakeTradeOffer(loaded, loaded.openTradeOffers![0].id, 'team-a');
    const bothNod = nodSnakeTradeOffer(buyerNod, buyerNod.openTradeOffers![0].id, 'team-b');
    expect(proposalFromOpenSnakeOffer(bothNod, bothNod.openTradeOffers![0]).sellerPremium).toBe(17);
  });

  test('approved companion posting preserves the exact authoritative premium through persistence and reload', async () => {
    await saveMlbDraftSession({
      ...session(),
      pickOrder: [
        { round: 1, pick: 1, teamId: 'team-b' },
        { round: 1, pick: 2, teamId: 'team-a' },
      ],
      snakeCompanions: {
        roomCode: '4821',
        claims: [{ deviceId: 'ipad-a', gmName: 'Alex', teamId: 'team-a', status: 'approved' }],
      },
    });
    const proposal = {
      buyerTeamId: 'team-a', sellerTeamId: 'team-b', targetPick: 1,
      offerPickNumbers: [2], receivePickNumbers: [1],
      offerValue: 117, receiveValue: 100, sellerPremium: 17, sessionRevision: 0,
    };
    const posted = await postApprovedCompanionTradeOffer({
      leagueId: 'perfroom-league', seasonNumber: 1, deviceId: 'ipad-a', teamId: 'team-a',
      proposal, postedAt: '2026-07-13T10:00:00.000Z',
    });
    expect(posted.openTradeOffers?.[0].sellerPremium).toBe(17);
    expect((await getMlbDraftSession('perfroom-league', 1))?.openTradeOffers?.[0].sellerPremium).toBe(17);
  });

  test('a stale room pick-save cannot replace an existing room code or erase a companion claim', async () => {
    const staleRoomCopy = await saveMlbDraftSession(session());

    const opened = await patchMlbDraftSessionSnakeCompanions({
      leagueId: staleRoomCopy.leagueId,
      patch: (current) => ensureCompanionRoom(
        { ...staleRoomCopy, snakeCompanions: current },
        () => '4821',
      ).snakeCompanions!,
    });
    const claim = submitCompanionClaim(opened, {
      deviceId: 'phone-a',
      gmName: 'Alex',
      roomCode: '4821',
    });
    expect(claim.ok).toBe(true);
    await patchMlbDraftSessionSnakeCompanions({
      leagueId: staleRoomCopy.leagueId,
      patch: () => claim.session!.snakeCompanions!,
    });

    await saveMlbDraftRoomSession({
      ...staleRoomCopy,
      completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a' }],
      currentPickIndex: 1,
      revision: 1,
    }, 0);

    const clobbered = (await getMlbDraftSession('perfroom-league', 1))!;
    await patchMlbDraftSessionSnakeCompanions({
      leagueId: clobbered.leagueId,
      patch: (current) => ensureCompanionRoom(
        { ...clobbered, snakeCompanions: current },
        () => '7354',
      ).snakeCompanions!,
    });

    const stored = await getMlbDraftSession('perfroom-league', 1);
    expect(stored?.snakeCompanions?.roomCode).toBe('4821');
    expect(stored?.snakeCompanions?.claims).toEqual([
      expect.objectContaining({ deviceId: 'phone-a', status: 'pending' }),
    ]);
    expect(stored?.completedPicks).toHaveLength(1);
  });

  test('a whole-room save keeps the newest revision of every companion-edited seat board', async () => {
    const staleRoomCopy = await saveMlbDraftSession({
      ...sessionWithFrozenClubs('team-a', 'team-b'),
      snakeCompanions: { roomCode: '4821', claims: [] },
      seatBoards: { 'team-a': board(1, 'room-a-1'), 'team-b': board(1, 'room-b-1') },
    });
    await patchMlbDraftSessionSnakeCompanions({
      leagueId: staleRoomCopy.leagueId,
      patch: () => ({
        roomCode: '4821',
        claims: [{ deviceId: 'phone-b', gmName: 'Blair', teamId: 'team-b', status: 'approved' }],
      }),
    });
    await patchMlbDraftSessionSeatBoard({
      leagueId: staleRoomCopy.leagueId,
      teamId: 'team-b',
      board: board(2, 'phone-b-2'),
      expectedBoardRevision: 1,
    });

    const saved = await saveMlbDraftRoomSession({
      ...staleRoomCopy,
      seatBoards: { ...staleRoomCopy.seatBoards, 'team-a': board(2, 'room-a-2') },
      revision: 1,
    }, 0);

    expect(saved.snakeCompanions?.claims).toEqual([
      expect.objectContaining({ deviceId: 'phone-b', status: 'approved' }),
    ]);
    expect(saved.seatBoards?.['team-a']).toEqual(board(2, 'room-a-2'));
    expect(saved.seatBoards?.['team-b']).toEqual(board(2, 'phone-b-2'));
    expect(saved.revision).toBe(1);
  });

  test('a seat-board patch ignores unrelated session revision changes and rejects a stale board revision', async () => {
    await saveMlbDraftSession({
      ...sessionWithFrozenClubs('team-a', 'team-b'),
      pickOrder: [
        { round: 1, pick: 1, teamId: 'team-b' },
        { round: 1, pick: 2, teamId: 'team-a' },
      ],
      seatBoards: { 'team-a': board(1, 'board-a-1'), 'team-b': board(4, 'board-b-4') },
      completedPicks: [{ round: 1, pick: 1, teamId: 'team-b', playerId: 'new-main-pick' }],
      currentPickIndex: 1,
      revision: 9,
    });

    const saved = await patchMlbDraftSessionSeatBoard({
      leagueId: 'perfroom-league',
      teamId: 'team-a',
      board: board(2, 'phone-board-a-2'),
      expectedBoardRevision: 1,
    });

    expect(saved.completedPicks).toEqual([
      expect.objectContaining({ playerId: 'new-main-pick' }),
    ]);
    expect(saved.seatBoards?.['team-a']).toEqual(board(2, 'phone-board-a-2'));
    expect(saved.seatBoards?.['team-b']).toEqual(board(4, 'board-b-4'));
    expect(saved.revision).toBe(9);

    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: 'perfroom-league',
      teamId: 'team-a',
      board: board(3, 'stale-overwrite'),
      expectedBoardRevision: 1,
    })).rejects.toThrow('Seat board team-a changed before it could be saved.');
    expect((await getMlbDraftSession('perfroom-league', 1))?.seatBoards?.['team-a'])
      .toEqual(board(2, 'phone-board-a-2'));
    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: 'perfroom-league', teamId: 'team-a',
      board: board(2, 'same-revision-overwrite'), expectedBoardRevision: 2,
    })).rejects.toThrow('invalid next revision');
  });

  test('an independent seat-board patch queues only its board row and never an older whole-room snapshot', async () => {
    await saveMlbDraftSession({
      ...sessionWithFrozenClubs('team-a'),
      seatBoards: { 'team-a': board(1, 'embedded-board-1') },
    });
    syncMockState.upsert.mockClear();
    syncMockState.suppressed = false;

    const saved = await patchMlbDraftSessionSeatBoard({
      leagueId: 'perfroom-league',
      teamId: 'team-a',
      board: board(2, 'companion-board-2'),
      expectedBoardRevision: 1,
    });

    expect(saved.seatBoards?.['team-a']).toEqual(board(2, 'companion-board-2'));
    expect(syncMockState.upsert).toHaveBeenCalledWith(
      'kbl-league-builder',
      'snakeSeatBoards',
      expect.stringContaining('::mlb-seat::team-a'),
      expect.objectContaining({
        teamId: 'team-a',
        revision: 2,
        board: board(2, 'companion-board-2'),
      }),
    );
    expect(syncMockState.upsert).not.toHaveBeenCalledWith(
      'kbl-league-builder',
      'mlbDraftSessions',
      expect.anything(),
      expect.anything(),
    );
  });

  test('an embedded-only legacy board is staged before the room is stripped', async () => {
    const legacy = {
      ...session(),
      seatBoards: { 'team-a': board(12, 'legacy-only') },
    };
    await putRawRecord('mlbDraftSessions', legacy);
    syncMockState.upsert.mockClear();
    syncMockState.suppressed = false;

    const loaded = await getMlbDraftSession(legacy.leagueId, legacy.seasonNumber);

    expect(loaded?.seatBoards?.['team-a']).toEqual(board(12, 'legacy-only'));
    const rawSession = await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', legacy.id);
    const rawBoard = await getRawRecord<SnakeSeatBoardStoreRecord>(
      'snakeSeatBoards',
      seatBoardStoreId(legacy.id, 'MLB', 'team-a'),
    );
    expectStandaloneAuthority(rawSession);
    expect(rawBoard?.board).toEqual(board(12, 'legacy-only'));
    const boardSyncOrder = syncMockState.upsert.mock.invocationCallOrder.find((_, index) => (
      syncMockState.upsert.mock.calls[index]?.[1] === 'snakeSeatBoards'
    ));
    const roomSyncOrder = syncMockState.upsert.mock.invocationCallOrder.find((_, index) => (
      syncMockState.upsert.mock.calls[index]?.[1] === 'mlbDraftSessions'
    ));
    expect(boardSyncOrder!).toBeLessThan(roomSyncOrder!);
  });

  test('standalone-only and equal-identical legacy boards migrate without a second authority', async () => {
    const standaloneOnly = session();
    const standaloneId = seatBoardStoreId(standaloneOnly.id, 'MLB', 'team-a');
    await putRawRecord('mlbDraftSessions', standaloneOnly);
    await putRawRecord('snakeSeatBoards', {
      id: standaloneId,
      sessionId: standaloneOnly.id,
      leagueId: standaloneOnly.leagueId,
      seasonNumber: standaloneOnly.seasonNumber,
      teamId: 'team-a',
      phase: 'MLB',
      board: board(7, 'standalone-only'),
      revision: 7,
      lastModified: standaloneOnly.lastModified,
    } satisfies SnakeSeatBoardStoreRecord);

    expect((await getMlbDraftSession(standaloneOnly.leagueId, 1))?.seatBoards?.['team-a'])
      .toEqual(board(7, 'standalone-only'));
    expectStandaloneAuthority(await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', standaloneOnly.id));

    const equalIdentical = {
      ...legacyRawSession((await getMlbDraftSession(standaloneOnly.leagueId, 1))!),
      seatBoards: { 'team-a': board(7, 'standalone-only') },
    };
    await putRawRecord('mlbDraftSessions', equalIdentical);
    expect((await getMlbDraftSession(equalIdentical.leagueId, 1))?.seatBoards?.['team-a'])
      .toEqual(board(7, 'standalone-only'));
    expectStandaloneAuthority(await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', equalIdentical.id));
  });

  test('embedded rev2 beats standalone rev1 and the successful rev3 write converges both copies', async () => {
    const stored = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'standalone-old') },
    });
    await putRawRecord('mlbDraftSessions', {
      ...legacyRawSession(stored),
      seatBoards: { 'team-a': board(2, 'embedded-new') },
    });

    expect((await getMlbDraftSession(stored.leagueId, 1))?.seatBoards?.['team-a'])
      .toEqual(board(2, 'embedded-new'));
    await patchMlbDraftSessionSeatBoard({
      leagueId: stored.leagueId,
      teamId: 'team-a',
      expectedBoardRevision: 2,
      board: board(3, 'converged'),
    });

    const rawSession = await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stored.id);
    const rawBoard = await getRawRecord<{ board: SnakeSeatBoardRecord }>(
      'snakeSeatBoards',
      seatBoardStoreId(stored.id, 'MLB', 'team-a'),
    );
    expectStandaloneAuthority(rawSession);
    expect(rawBoard?.board).toEqual(board(3, 'converged'));
  });

  test('standalone rev2 beats embedded rev1 and the successful rev3 write converges both copies', async () => {
    const stored = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'embedded-old') },
    });
    const rowId = seatBoardStoreId(stored.id, 'MLB', 'team-a');
    await putRawRecord('mlbDraftSessions', legacyRawSession(stored));
    const rawBoard = await getRawRecord<Record<string, unknown>>('snakeSeatBoards', rowId);
    await putRawRecord('snakeSeatBoards', {
      ...rawBoard,
      board: board(2, 'standalone-new'),
      revision: 2,
    });

    expect((await getMlbDraftSession(stored.leagueId, 1))?.seatBoards?.['team-a'])
      .toEqual(board(2, 'standalone-new'));
    await patchMlbDraftSessionSeatBoard({
      leagueId: stored.leagueId,
      teamId: 'team-a',
      expectedBoardRevision: 2,
      board: board(3, 'converged'),
    });

    const rawSession = await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stored.id);
    const convergedRow = await getRawRecord<{ board: SnakeSeatBoardRecord }>('snakeSeatBoards', rowId);
    expectStandaloneAuthority(rawSession);
    expect(convergedRow?.board).toEqual(board(3, 'converged'));
  });

  test('equal-revision unequal seat-board payloads fail reads and writes closed', async () => {
    const stored = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(2, 'embedded') },
    });
    const rowId = seatBoardStoreId(stored.id, 'MLB', 'team-a');
    await putRawRecord('mlbDraftSessions', legacyRawSession(stored));
    const rawBoard = await getRawRecord<Record<string, unknown>>('snakeSeatBoards', rowId);
    await putRawRecord('snakeSeatBoards', {
      ...rawBoard,
      board: board(2, 'standalone-conflict'),
      revision: 2,
    });

    await expect(getMlbDraftSession(stored.leagueId, 1)).rejects.toThrow(/corrupt/i);
    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: stored.leagueId,
      teamId: 'team-a',
      expectedBoardRevision: 2,
      board: board(3, 'must-not-write'),
    })).rejects.toThrow(/corrupt/i);
    expect((await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stored.id))?.seatBoards?.['team-a'])
      .toEqual(board(2, 'embedded'));
    expect((await getRawRecord<{ board: SnakeSeatBoardRecord }>('snakeSeatBoards', rowId))?.board)
      .toEqual(board(2, 'standalone-conflict'));
  });

  test('a generic session save resolves the authoritative standalone board and atomically converges both copies', async () => {
    const stale = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'embedded-old') },
    });
    const rowId = seatBoardStoreId(stale.id, 'MLB', 'team-a');
    const rawBoard = await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId);
    await putRawRecord('snakeSeatBoards', {
      ...rawBoard,
      board: board(2, 'standalone-new'),
      revision: 2,
    });

    const saved = await saveMlbDraftSession({ ...stale, paused: true });

    expect(saved.seatBoards?.['team-a']).toEqual(board(2, 'standalone-new'));
    expectStandaloneAuthority(await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stale.id));
    expect((await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId))?.board)
      .toEqual(board(2, 'standalone-new'));
  });

  test('initial session creation resolves a board-first standalone copy before writing either store', async () => {
    const candidate = {
      ...session(),
      seatBoards: { 'team-a': board(1, 'embedded-late') },
    };
    const rowId = seatBoardStoreId(candidate.id, 'MLB', 'team-a');
    await putRawRecord('snakeSeatBoards', {
      id: rowId,
      sessionId: candidate.id,
      leagueId: candidate.leagueId,
      seasonNumber: candidate.seasonNumber,
      teamId: 'team-a',
      phase: 'MLB',
      board: board(2, 'standalone-first'),
      revision: 2,
      lastModified: '2026-07-13T00:00:00.000Z',
    } satisfies SnakeSeatBoardStoreRecord);

    const saved = await saveMlbDraftSession(candidate);

    expect(saved.seatBoards?.['team-a']).toEqual(board(2, 'standalone-first'));
    expectStandaloneAuthority(await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', candidate.id));
    expect((await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId))?.board)
      .toEqual(board(2, 'standalone-first'));
  });

  test('a generic save conflict aborts before changing either raw store', async () => {
    const stored = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(2, 'embedded') },
    });
    const rowId = seatBoardStoreId(stored.id, 'MLB', 'team-a');
    await putRawRecord('mlbDraftSessions', legacyRawSession(stored));
    const rawBoard = await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId);
    await putRawRecord('snakeSeatBoards', {
      ...rawBoard,
      board: board(2, 'standalone-conflict'),
      revision: 2,
    });
    const rawSessionBefore = await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stored.id);
    const rawBoardBefore = await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId);

    await expect(saveMlbDraftSession({
      ...stored,
      paused: true,
      seatBoards: { 'team-a': board(3, 'must-not-write') },
    })).rejects.toThrow(/corrupt/i);

    expect(JSON.stringify(await getRawRecord('mlbDraftSessions', stored.id)))
      .toBe(JSON.stringify(rawSessionBefore));
    expect(JSON.stringify(await getRawRecord('snakeSeatBoards', rowId)))
      .toBe(JSON.stringify(rawBoardBefore));
  });

  test('generic writers cannot bypass completion, phase, or frozen-club board authorization', async () => {
    const base = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'authorized') },
    });

    await expect(saveMlbDraftSession({
      ...base,
      seatBoards: { ...base.seatBoards, 'team-b': board(1, 'not-frozen') },
    })).rejects.toThrow(/frozen MLB snake clubs/i);

    await expect(updateMlbDraftSessionAtomically(base.leagueId, base.seasonNumber, (current) => ({
      ...current,
      farmSeatBoards: { 'team-a': farmBoard(1, 'wrong-phase') },
    }))).rejects.toThrow(/MLB phase/i);

    const rawBase = (await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', base.id))!;
    const completed = { ...rawBase, currentPickIndex: base.pickOrder.length };
    await putRawRecord('mlbDraftSessions', completed);
    const sessionBefore = await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', base.id);
    const rowId = seatBoardStoreId(base.id, 'MLB', 'team-a');
    const boardBefore = await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId);
    await expect(saveMlbDraftRoomSession({
      ...completed,
      seatBoards: { 'team-a': board(2, 'after-complete') },
      revision: 1,
    }, 0)).rejects.toThrow('THIS DRAFT IS COMPLETE.');
    expect(await getRawRecord('mlbDraftSessions', base.id)).toEqual(sessionBefore);
    expect(await getRawRecord('snakeSeatBoards', rowId)).toEqual(boardBefore);
  });

  test('storage-boundary validation rejects phase/payload mismatches and invalid initial board keys', async () => {
    await expect(saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-b': board(1, 'not-frozen') },
    })).rejects.toThrow(/frozen MLB snake clubs/i);
    expect(await getRawRecord('mlbDraftSessions', createMlbDraftSessionId('perfroom-league', 1)))
      .toBeUndefined();

    const stored = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'valid') },
    });
    const rowId = seatBoardStoreId(stored.id, 'MLB', 'team-a');
    const rawBoard = await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId);
    await putRawRecord('snakeSeatBoards', {
      ...rawBoard,
      phase: 'BROKEN',
    });
    await expect(getMlbDraftSession(stored.leagueId, stored.seasonNumber)).rejects.toThrow(/phase is malformed/i);
    await expect(saveMlbDraftSession({ ...stored, paused: true })).rejects.toThrow(/phase is malformed/i);

    await putRawRecord('snakeSeatBoards', {
      ...rawBoard,
      board: farmBoard(2, 'wrong-payload-shape'),
      revision: 2,
    });

    await expect(getMlbDraftSession(stored.leagueId, stored.seasonNumber)).rejects.toThrow(/payload/i);
    await expect(saveMlbDraftSession({ ...stored, paused: true })).rejects.toThrow(/payload/i);
  });

  test('valid initial board creation and a final-pick board reconciliation still succeed', async () => {
    const initial = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'initial') },
    });
    const rowId = seatBoardStoreId(initial.id, 'MLB', 'team-a');
    expect((await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId))?.board)
      .toEqual(board(1, 'initial'));

    const completed = await updateMlbDraftSessionAtomically(initial.leagueId, initial.seasonNumber, (current) => ({
      ...current,
      completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a' }],
      currentPickIndex: 1,
      seatBoards: { 'team-a': board(2, 'post-final-pick') },
    }));

    expect(completed.currentPickIndex).toBe(1);
    expect(completed.seatBoards?.['team-a']).toEqual(board(2, 'post-final-pick'));
    expect((await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId))?.board)
      .toEqual(board(2, 'post-final-pick'));
  });

  test('a two-transaction frozen-club expansion then board-creation attack fails without changing raw stores', async () => {
    const initial = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'authoritative') },
    });
    const rawBefore = await getRawSessionAndBoards(initial.id);

    const expansionError = await updateMlbDraftSessionAtomically(
      initial.leagueId,
      initial.seasonNumber,
      (working) => ({
        ...working,
        snakeSetup: {
          ...working.snakeSetup!,
          clubs: [
            ...working.snakeSetup!.clubs,
            { teamId: 'team-b', gmName: 'Injected', hotseat: false },
          ],
        },
      }),
    ).then(() => null, (error: unknown) => error);
    const rawAfterExpansion = await getRawSessionAndBoards(initial.id);

    const boardCreationError = await updateMlbDraftSessionAtomically(
      initial.leagueId,
      initial.seasonNumber,
      (working) => ({
        ...working,
        seatBoards: { ...working.seatBoards, 'team-b': board(1, 'injected-board') },
      }),
    ).then(() => null, (error: unknown) => error);
    const rawAfterBoardCreation = await getRawSessionAndBoards(initial.id);

    expect(expansionError).toBeInstanceOf(Error);
    expect(String(expansionError)).toMatch(/frozen club/i);
    expect(boardCreationError).toBeInstanceOf(Error);
    expect(String(boardCreationError)).toMatch(/frozen MLB snake clubs/i);
    expect(rawAfterExpansion).toBe(rawBefore);
    expect(rawAfterBoardCreation).toBe(rawBefore);

    const metadataOnly = await updateMlbDraftSessionAtomically(
      initial.leagueId,
      initial.seasonNumber,
      (working) => ({
        ...working,
        snakeSetup: {
          ...working.snakeSetup!,
          clubs: working.snakeSetup!.clubs.map((club) => (
            club.teamId === 'team-a' ? { ...club, gmName: 'Updated Alex', hotseat: true } : club
          )),
        },
      }),
    );
    expect(metadataOnly.snakeSetup?.clubs).toEqual([
      expect.objectContaining({ teamId: 'team-a', gmName: 'Updated Alex', hotseat: true }),
    ]);
  });

  test('a two-transaction manifest removal/reset then completed-board attack fails without changing raw stores', async () => {
    const pool = {
      leagueId: 'perfroom-league', tier: 'standard' as const, balanceMode: 'taxed' as const,
      players: [{ id: 'player-a', iv: 100, salary: 100 }], tierCap: 1_000,
      luxuryCaps: [], pickValueChart: [], totalSlots: 1, poolSurplusWarning: false, locked: true,
    };
    await saveRegisteredPool(pool);
    const completed = {
      ...session(),
      completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a', settledSalary: 100 }],
      currentPickIndex: 1,
      seatBoards: { 'team-a': board(1, 'authoritative') },
    };
    const frozen = freezeSnakeDraftSession({
      session: completed,
      expectedPhase: 'MLB',
      poolPlayerIds: ['player-a'],
      salaryByPlayerId: new Map([['player-a', 100]]),
      frozenAt: '2026-07-13T12:00:00.000Z',
    });
    await saveMlbDraftSession(completed);
    await freezeMlbDraftRoomSessionWithRegisteredPool({ session: frozen, registeredPool: pool, expectedRevision: 0 });
    const rawBefore = await getRawSessionAndBoards(frozen.id);

    const resetError = await updateMlbDraftSessionAtomically(
      frozen.leagueId,
      frozen.seasonNumber,
      (working) => ({
        ...working,
        draftManifest: undefined,
        completedPicks: [],
        currentPickIndex: 0,
      }),
    ).then(() => null, (error: unknown) => error);
    const rawAfterReset = await getRawSessionAndBoards(frozen.id);

    const boardMutationError = await updateMlbDraftSessionAtomically(
      frozen.leagueId,
      frozen.seasonNumber,
      (working) => ({
        ...working,
        seatBoards: { 'team-a': board(2, 'post-reset-board') },
      }),
    ).then(() => null, (error: unknown) => error);
    const rawAfterBoardMutation = await getRawSessionAndBoards(frozen.id);

    expect(resetError).toBeInstanceOf(Error);
    expect(String(resetError)).toMatch(/manifest/i);
    expect(boardMutationError).toBeInstanceOf(Error);
    expect(String(boardMutationError)).toMatch(/THIS DRAFT IS COMPLETE/);
    expect(rawAfterReset).toBe(rawBefore);
    expect(rawAfterBoardMutation).toBe(rawBefore);
  });

  test('a present manifest missing phase fails hydration and every generic writer without changing raw stores', async () => {
    const pool = {
      leagueId: 'perfroom-league', tier: 'standard' as const, balanceMode: 'taxed' as const,
      players: [{ id: 'player-a', iv: 100, salary: 100 }], tierCap: 1_000,
      luxuryCaps: [], pickValueChart: [], totalSlots: 1, poolSurplusWarning: false, locked: true,
    };
    await saveRegisteredPool(pool);
    const initial = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'authoritative') },
    });
    const rawInitial = (await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', initial.id))!;
    await putRawRecord('mlbDraftSessions', {
      ...rawInitial,
      draftManifest: {},
    });
    const rawBefore = await getRawSessionAndBoards(initial.id);
    const assertRawUnchanged = async () => expect(await getRawSessionAndBoards(initial.id)).toBe(rawBefore);

    await expect(getMlbDraftSession(initial.leagueId, initial.seasonNumber)).rejects.toThrow(/manifest phase is malformed/i);
    await assertRawUnchanged();
    await expect(saveMlbDraftSession({ ...initial, paused: true })).rejects.toThrow(/manifest phase is malformed/i);
    await assertRawUnchanged();
    await expect(updateMlbDraftSessionAtomically(initial.leagueId, initial.seasonNumber, (working) => ({
      ...working,
      paused: true,
    }))).rejects.toThrow(/manifest phase is malformed/i);
    await assertRawUnchanged();
    await expect(saveMlbDraftRoomSession({ ...initial, paused: true, revision: 1 }, 0))
      .rejects.toThrow(/manifest phase is malformed/i);
    await assertRawUnchanged();
    await expect(freezeMlbDraftRoomSessionWithRegisteredPool({
      session: initial,
      registeredPool: pool,
      expectedRevision: 0,
    })).rejects.toThrow(/manifest phase is malformed/i);
    await assertRawUnchanged();
  });

  test.each([
    {
      label: 'completion state',
      prepare: (value: LeagueBuilderMlbDraftSession) => ({ ...value, currentPickIndex: value.pickOrder.length }),
      mutate: (working: LeagueBuilderMlbDraftSession) => {
        working.currentPickIndex = 0;
        working.seatBoards!['team-a'] = board(2, 'completion-bypass');
      },
      error: /THIS DRAFT IS COMPLETE/,
    },
    {
      label: 'session phase',
      prepare: (value: LeagueBuilderMlbDraftSession) => value,
      mutate: (working: LeagueBuilderMlbDraftSession) => {
        working.draftPhase = 'FARM';
        working.farmSeatBoards = { 'team-a': farmBoard(1, 'phase-bypass') };
      },
      error: /MLB phase|session phase/,
    },
    {
      label: 'nonmember board key',
      prepare: (value: LeagueBuilderMlbDraftSession) => value,
      mutate: (working: LeagueBuilderMlbDraftSession) => {
        working.seatBoards!['team-b'] = board(1, 'nonmember-bypass');
      },
      error: /frozen MLB snake clubs/,
    },
    {
      label: 'frozen club list',
      prepare: (value: LeagueBuilderMlbDraftSession) => value,
      mutate: (working: LeagueBuilderMlbDraftSession) => {
        working.snakeSetup!.clubs = [{ teamId: 'team-b', hotseat: false }];
        working.seatBoards = { 'team-b': board(2, 'club-list-bypass') };
      },
      error: /frozen club/i,
    },
  ])('an in-place atomic callback cannot rewrite $label to bypass pre-action authorization', async ({ prepare, mutate, error }) => {
    const initial = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'authoritative') },
    });
    const authoritative = prepare(initial);
    if (authoritative !== initial) {
      const rawInitial = (await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', initial.id))!;
      await putRawRecord('mlbDraftSessions', {
        ...rawInitial,
        currentPickIndex: authoritative.currentPickIndex,
      });
    }
    const rawBefore = await getRawSessionAndBoards(initial.id);

    await expect(updateMlbDraftSessionAtomically(initial.leagueId, initial.seasonNumber, (working) => {
      mutate(working);
      return working;
    })).rejects.toThrow(error);

    expect(await getRawSessionAndBoards(initial.id)).toBe(rawBefore);
  });

  test.each([
    {
      label: 'wrong session phase',
      row: (value: LeagueBuilderMlbDraftSession) => ({
        id: seatBoardStoreId(value.id, 'FARM', 'team-a'),
        sessionId: value.id,
        leagueId: value.leagueId,
        seasonNumber: value.seasonNumber,
        teamId: 'team-a',
        phase: 'FARM',
        board: farmBoard(1, 'wrong-phase'),
        revision: 1,
        lastModified: '2026-07-13T00:00:00.000Z',
      }),
    },
    {
      label: 'nonmember team',
      row: (value: LeagueBuilderMlbDraftSession) => ({
        id: seatBoardStoreId(value.id, 'MLB', 'team-b'),
        sessionId: value.id,
        leagueId: value.leagueId,
        seasonNumber: value.seasonNumber,
        teamId: 'team-b',
        phase: 'MLB',
        board: board(1, 'nonmember'),
        revision: 1,
        lastModified: '2026-07-13T00:00:00.000Z',
      }),
    },
    {
      label: 'empty team key',
      row: (value: LeagueBuilderMlbDraftSession) => ({
        id: seatBoardStoreId(value.id, 'MLB', ''),
        sessionId: value.id,
        leagueId: value.leagueId,
        seasonNumber: value.seasonNumber,
        teamId: '',
        phase: 'MLB',
        board: board(1, 'empty-key'),
        revision: 1,
        lastModified: '2026-07-13T00:00:00.000Z',
      }),
    },
    {
      label: 'non-string team key',
      row: (value: LeagueBuilderMlbDraftSession) => ({
        id: seatBoardStoreId(value.id, 'MLB', '42'),
        sessionId: value.id,
        leagueId: value.leagueId,
        seasonNumber: value.seasonNumber,
        teamId: 42,
        phase: 'MLB',
        board: board(1, 'numeric-key'),
        revision: 1,
        lastModified: '2026-07-13T00:00:00.000Z',
      }),
    },
    {
      label: 'mismatched record identity',
      row: (value: LeagueBuilderMlbDraftSession) => ({
        id: seatBoardStoreId(value.id, 'MLB', 'team-a'),
        sessionId: value.id,
        leagueId: 'different-league',
        seasonNumber: value.seasonNumber,
        teamId: 'team-a',
        phase: 'MLB',
        board: board(2, 'wrong-record-identity'),
        revision: 2,
        lastModified: '2026-07-13T00:00:00.000Z',
      }),
    },
  ])('a raw standalone row with $label fails every generic writer without changing raw stores', async ({ row }) => {
    const pool = {
      leagueId: 'perfroom-league', tier: 'standard' as const, balanceMode: 'taxed' as const,
      players: [{ id: 'player-a', iv: 100, salary: 100 }], tierCap: 1_000,
      luxuryCaps: [], pickValueChart: [], totalSlots: 1, poolSurplusWarning: false, locked: true,
    };
    await saveRegisteredPool(pool);
    const initial = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'authoritative') },
    });
    await putRawRecord('snakeSeatBoards', row(initial));
    const rawBefore = await getRawSessionAndBoards(initial.id);
    const assertRawUnchanged = async () => expect(await getRawSessionAndBoards(initial.id)).toBe(rawBefore);

    await expect(saveMlbDraftSession({ ...initial, paused: true })).rejects.toThrow(/corrupt/i);
    await assertRawUnchanged();
    await expect(updateMlbDraftSessionAtomically(initial.leagueId, initial.seasonNumber, (working) => ({
      ...working,
      paused: true,
    }))).rejects.toThrow(/corrupt/i);
    await assertRawUnchanged();
    await expect(saveMlbDraftRoomSession({ ...initial, paused: true, revision: 1 }, 0)).rejects.toThrow(/corrupt/i);
    await assertRawUnchanged();
    await expect(freezeMlbDraftRoomSessionWithRegisteredPool({
      session: initial,
      registeredPool: pool,
      expectedRevision: 0,
    })).rejects.toThrow(/corrupt/i);
    await assertRawUnchanged();
  });

  test('FARM boards use the same authoritative revision and corruption rules as MLB boards', async () => {
    const stored = await seedRawFarmAuthority({ farmSeatBoard: farmBoard(1, 'embedded-old') });
    const rowId = seatBoardStoreId(stored.id, 'FARM', 'team-a');
    const rawBoard = await getRawRecord<Record<string, unknown>>('snakeSeatBoards', rowId);
    await putRawRecord('snakeSeatBoards', {
      ...rawBoard,
      board: farmBoard(2, 'standalone-new'),
      revision: 2,
    });

    expect((await getMlbDraftSession(stored.leagueId, 2))?.farmSeatBoards?.['team-a'])
      .toEqual(farmBoard(2, 'standalone-new'));
    await patchMlbDraftSessionFarmSeatBoard({
      leagueId: stored.leagueId,
      seasonNumber: 2,
      teamId: 'team-a',
      expectedBoardRevision: 2,
      board: farmBoard(3, 'converged'),
    });
    expectStandaloneAuthority(await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stored.id));
    expect((await getRawRecord<{ board: FarmSeatBoardRecord }>('snakeSeatBoards', rowId))?.board)
      .toEqual(farmBoard(3, 'converged'));

    const rawSession = await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stored.id);
    await putRawRecord('mlbDraftSessions', {
      ...legacyRawSession({ ...stored, ...rawSession }),
      farmSeatBoards: { 'team-a': farmBoard(3, 'embedded-conflict') },
    });
    await expect(getMlbDraftSession(stored.leagueId, 2)).rejects.toThrow(/corrupt/i);
  });

  test('a FARM transition rejects a valid-looking candidate when no completed MLB authority is persisted', async () => {
    const farmCandidate = farmCandidateFrom(completedMlbAuthorityFixture());

    await expect(saveMlbDraftSession(
      farmCandidate,
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/completed MLB authority/i);
    expect(await getRawRecord('mlbDraftSessions', farmCandidate.id)).toBeUndefined();
  });

  test('a FARM transition rejects a persisted MLB manifest without its roster handoff', async () => {
    const frozenMlb = await persistCompletedMlbAuthority({ handoff: false });
    const farmCandidate = farmCandidateFrom({
      ...frozenMlb,
      rosterHandoff: buildSnakeRosterHandoff(frozenMlb, 'MLB', '2026-07-14T11:01:00.000Z'),
    });

    await expect(saveMlbDraftSession(
      farmCandidate,
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/completed MLB authority/i);
    expect(await getRawRecord('mlbDraftSessions', farmCandidate.id)).toBeUndefined();
  });

  test('a one-pick FARM transition persists its deterministic single-slot salary', async () => {
    const completedMlb = await persistCompletedMlbAuthority();
    const candidate = createFarmSnakeSession({
      mlbSession: completedMlb,
      teamOrder: ['team-a'],
      existingFarmRosterCountsByTeamId: { 'team-a': 9 },
      farmBudgetsByTeamId: { 'team-a': 96_000 },
      farmArchetypeIdByTeamId: { 'team-a': 'farm-balanced' },
      prospectIds: ['prospect-only'],
      prospects: [{ id: 'prospect-only' }] as never,
      now: '2026-07-14T12:00:00.000Z',
    });

    expect(candidate.pickOrder).toEqual([{ round: 1, pick: 1, teamId: 'team-a' }]);
    expect(candidate.farmSlotSalaries).toEqual([72_000]);
    const stored = await saveMlbDraftSession(candidate, { phaseTransition: 'MLB_TO_FARM' });
    expect(stored.farmSlotSalaries).toEqual([72_000]);
    expect((await getMlbDraftSession(stored.leagueId, FARM_SNAKE_SESSION_NUMBER))?.pickOrder).toHaveLength(1);
  });

  test('a zero-pick FARM transition persists and freezes a completed authority for every full club', async () => {
    const completedMlb = await persistCompletedMlbAuthority();
    const candidate = createFarmSnakeSession({
      mlbSession: completedMlb,
      teamOrder: ['team-a'],
      existingFarmRosterCountsByTeamId: { 'team-a': 10 },
      farmBudgetsByTeamId: { 'team-a': 96_000 },
      farmArchetypeIdByTeamId: { 'team-a': 'farm-balanced' },
      prospectIds: ['unused-reserve'],
      prospects: [{ id: 'unused-reserve' }] as never,
      now: '2026-07-14T12:00:00.000Z',
    });

    expect(candidate.pickOrder).toEqual([]);
    expect(candidate.farmSlotSalaries).toEqual([]);
    const stored = await saveMlbDraftSession(candidate, { phaseTransition: 'MLB_TO_FARM' });
    const frozen = freezeSnakeDraftSession({
      session: stored,
      expectedPhase: 'FARM',
      poolPlayerIds: ['unused-reserve'],
      frozenAt: '2026-07-14T12:01:00.000Z',
    });
    const persisted = await saveMlbDraftSession(frozen);

    expect(persisted.draftManifest?.lockedClubs.map((club) => club.teamId)).toEqual(['team-a']);
    expect(persisted.draftManifest?.pickOrder).toEqual([]);
    expect(persisted.draftManifest?.completedPicks).toEqual([]);
    expect((await getMlbDraftSession(stored.leagueId, FARM_SNAKE_SESSION_NUMBER))?.draftManifest)
      .toEqual(persisted.draftManifest);
  });

  test('all local writers reject FARM pick trades and companion trade access', async () => {
    const completedMlb = await persistCompletedMlbAuthority();
    const stored = await saveMlbDraftSession(farmCandidateFrom(completedMlb), { phaseTransition: 'MLB_TO_FARM' });
    const trade = {
      id: 'forged-farm-trade', atPickIndex: 0, humanTeamId: 'team-a', cpuTeamId: 'team-b',
      humanPickNumbers: [1], cpuPickNumbers: [2], humanValue: 10, cpuValue: 10, greedMargin: 0,
    };

    await expect(saveMlbDraftSession({ ...stored, trades: [trade] }))
      .rejects.toThrow(/FARM.*cannot contain.*trades/i);
    await expect(updateMlbDraftSessionAtomically(stored.leagueId, stored.seasonNumber, (current) => ({
      ...current,
      openTradeOffers: [{ id: 'forged-farm-offer' }] as never,
    }))).rejects.toThrow(/FARM.*cannot contain.*trade offers/i);
    await expect(postApprovedCompanionTradeOffer({
      leagueId: stored.leagueId,
      seasonNumber: FARM_SNAKE_SESSION_NUMBER,
      deviceId: 'farm-companion',
      teamId: 'team-a',
      proposal: {
        buyerTeamId: 'team-a', sellerTeamId: 'team-b', targetPick: 1,
        offerPickNumbers: [2], receivePickNumbers: [1], offerValue: 10, receiveValue: 10,
        sellerPremium: 0, sessionRevision: stored.revision ?? 0,
      },
      postedAt: '2026-07-14T12:02:00.000Z',
    })).rejects.toThrow(/FARM.*do not allow pick trades/i);
    const unchanged = await getMlbDraftSession(stored.leagueId, stored.seasonNumber);
    expect(unchanged?.trades).toEqual([]);
    expect(unchanged?.openTradeOffers).toBeUndefined();
  });

  test('generic, atomic, and room writers reject FARM phase erasure and creation-envelope mutation byte-unchanged', async () => {
    const completedMlb = await persistCompletedMlbAuthority();
    const stored = await saveMlbDraftSession(
      farmCandidateFrom(completedMlb),
      { phaseTransition: 'MLB_TO_FARM' },
    );
    const originalBytes = await getRawSessionAndBoards(stored.id);

    const phaseErased = {
      ...stored,
      trades: [{
        id: 'phase-erasure-trade', atPickIndex: 0,
        humanTeamId: 'team-a', cpuTeamId: 'team-b',
        humanPickNumbers: [1], cpuPickNumbers: [2],
        humanValue: 1, cpuValue: 1, greedMargin: 0,
      }],
    };
    delete phaseErased.draftPhase;
    await expect(saveMlbDraftSession(phaseErased)).rejects.toThrow(/phase cannot be removed|FARM.*trades/i);
    expect(await getRawSessionAndBoards(stored.id)).toBe(originalBytes);

    const envelopeMutations: Array<[string, LeagueBuilderMlbDraftSession]> = [
      ['seed', { ...stored, seed: `${stored.seed}:changed` }],
      ['workflow', { ...stored, workflowVersion: 'snake-v1-farm-changed' }],
      ['engine', { ...stored, engineMethodVersion: 'snake-s6-changed' }],
      ['rounds', { ...stored, rounds: 9 }],
      ['tier', { ...stored, tier: 'juiced' }],
      ['balance', { ...stored, balanceMode: 'off' }],
      ['pick order', { ...stored, pickOrder: [...stored.pickOrder].reverse() }],
      ['slot salaries', { ...stored, farmSlotSalaries: stored.farmSlotSalaries?.map((value) => value + 1_000) }],
      ['prospect snapshot', {
        ...stored,
        farmProspectSnapshot: stored.farmProspectSnapshot?.map((prospect) => ({ ...prospect, firstName: 'Changed' })),
      }],
      ['pool', { ...stored, snakeSetup: { ...stored.snakeSetup!, poolPlayerIds: ['replacement'] } }],
      ['clubs', {
        ...stored,
        snakeSetup: {
          ...stored.snakeSetup!,
          clubs: stored.snakeSetup!.clubs.map((club) => ({ ...club, gmName: 'Changed' })),
        },
      }],
    ];
    for (const [label, candidate] of envelopeMutations) {
      await expect(saveMlbDraftSession(candidate), label)
        .rejects.toThrow(/frozen FARM creation envelope|frozen farm prospect snapshot/i);
      expect(await getRawSessionAndBoards(stored.id), label).toBe(originalBytes);
    }

    await expect(updateMlbDraftSessionAtomically(stored.leagueId, stored.seasonNumber, (current) => ({
      ...current,
      farmSlotSalaries: current.farmSlotSalaries?.map((value) => value + 1_000),
    }))).rejects.toThrow(/frozen FARM creation envelope/i);
    expect(await getRawSessionAndBoards(stored.id)).toBe(originalBytes);

    await expect(saveMlbDraftRoomSession({
      ...stored,
      snakeSetup: { ...stored.snakeSetup!, orderSeed: 'changed-order-seed' },
      revision: (stored.revision ?? 0) + 1,
    }, stored.revision ?? 0)).rejects.toThrow(/frozen FARM creation envelope/i);
    expect(await getRawSessionAndBoards(stored.id)).toBe(originalBytes);

    const live = await updateMlbDraftSessionAtomically(stored.leagueId, stored.seasonNumber, (current) => ({
      ...current,
      paused: true,
      roomLogByTeamId: {
        'team-a': [{ id: 'live-log', kind: 'PICK', text: 'LIVE PROGRESS', createdAt: '2026-07-14T12:10:00.000Z' }],
      },
      revision: (current.revision ?? 0) + 1,
    }));
    expect(live.paused).toBe(true);
    expect(live.roomLogByTeamId?.['team-a']?.[0]?.id).toBe('live-log');
  });

  test('generic save cannot create a FARM authority outside the sanctioned transition', async () => {
    const candidate = farmCandidateFrom(completedMlbAuthorityFixture());
    await expect(saveMlbDraftSession(candidate)).rejects.toThrow(/sanctioned MLB-to-FARM transition/i);
    expect(await getRawRecord('mlbDraftSessions', candidate.id)).toBeUndefined();
  });

  test('a FARM transition rejects candidate clubs and order fabricated outside the persisted MLB authority', async () => {
    const completedMlb = await persistCompletedMlbAuthority();
    const farmCandidate = farmCandidateFrom(completedMlb);
    const fabricated = {
      ...farmCandidate,
      pickOrder: farmCandidate.pickOrder.map((slot) => ({ ...slot, teamId: 'team-fake' })),
      snakeSetup: {
        ...farmCandidate.snakeSetup!,
        clubs: [{ teamId: 'team-fake', hotseat: false }],
      },
    };

    await expect(saveMlbDraftSession(
      fabricated,
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/transition is malformed/i);
    expect(await getRawRecord('mlbDraftSessions', farmCandidate.id)).toBeUndefined();
  });

  test('a FARM transition rejects seed provenance fabricated outside the persisted MLB authority', async () => {
    const completedMlb = await persistCompletedMlbAuthority();
    const farmCandidate = farmCandidateFrom(completedMlb);

    await expect(saveMlbDraftSession(
      {
        ...farmCandidate,
        seed: 'fabricated-seed:farm',
        snakeSetup: { ...farmCandidate.snakeSetup!, orderSeed: 'fabricated-seed' },
      },
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/transition is malformed/i);
    expect(await getRawRecord('mlbDraftSessions', farmCandidate.id)).toBeUndefined();
  });

  test.each([
    ['round', (candidate: LeagueBuilderMlbDraftSession) => ({
      ...candidate,
      pickOrder: candidate.pickOrder.map((slot) => ({ ...slot, round: 11 })),
    })],
    ['slot-salary', (candidate: LeagueBuilderMlbDraftSession) => ({
      ...candidate,
      farmSlotSalaries: candidate.pickOrder.map(() => 1),
    })],
  ])('a FARM transition rejects malformed %s geometry', async (_label, mutate) => {
    const completedMlb = await persistCompletedMlbAuthority();
    const farmCandidate = farmCandidateFrom(completedMlb);

    await expect(saveMlbDraftSession(
      mutate(farmCandidate),
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/transition is malformed/i);
    expect(await getRawRecord('mlbDraftSessions', farmCandidate.id)).toBeUndefined();
  });

  test.each([
    ['revision zero', (candidate: LeagueBuilderMlbDraftSession) => ({ ...candidate, revision: 1 })],
    ['the pause property to be absent', (candidate: LeagueBuilderMlbDraftSession) => ({ ...candidate, paused: false })],
  ])('a FARM transition requires %s', async (_label, mutate) => {
    const completedMlb = await persistCompletedMlbAuthority();
    const farmCandidate = farmCandidateFrom(completedMlb);

    await expect(saveMlbDraftSession(
      mutate(farmCandidate),
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/transition is malformed/i);
    expect(await getRawRecord('mlbDraftSessions', farmCandidate.id)).toBeUndefined();
  });

  test.each(['trades', 'correctionSnapshots'] as const)(
    'a FARM transition requires an explicit empty %s array',
    async (field) => {
      const completedMlb = await persistCompletedMlbAuthority();
      const farmCandidate = farmCandidateFrom(completedMlb);
      const malformed = { ...farmCandidate };
      delete malformed[field];

      await expect(saveMlbDraftSession(
        malformed,
        { phaseTransition: 'MLB_TO_FARM' },
      )).rejects.toThrow(/transition is malformed/i);
      expect(await getRawRecord('mlbDraftSessions', farmCandidate.id)).toBeUndefined();
    },
  );

  test.each([
    ['row key', { id: 'alien-board-key' }],
    ['league', { leagueId: 'other-league' }],
    ['season', { seasonNumber: 3 }],
    ['phase', { phase: 'BROKEN' }],
    ['frozen team', { id: 'TEAM_ID', teamId: 'team-fake' }],
  ])('a FARM transition preserves an orphan row with mismatched %s metadata', async (_label, override) => {
    const completedMlb = await persistCompletedMlbAuthority();
    const farmCandidate = farmCandidateFrom(completedMlb);
    const defaultId = seatBoardStoreId(farmCandidate.id, 'MLB', 'team-a');
    const row = {
      id: defaultId,
      sessionId: farmCandidate.id,
      leagueId: farmCandidate.leagueId,
      seasonNumber: farmCandidate.seasonNumber,
      teamId: 'team-a',
      phase: 'MLB',
      board: board(9, 'mismatched-orphan'),
      revision: 9,
      lastModified: '2026-07-14T11:59:00.000Z',
      ...override,
    } as SnakeSeatBoardStoreRecord;
    if (row.id === 'TEAM_ID') row.id = seatBoardStoreId(farmCandidate.id, 'MLB', row.teamId);
    await putRawRecord('snakeSeatBoards', row);

    syncMockState.suppressed = false;
    await expect(saveMlbDraftSession(
      farmCandidate,
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/standalone.*metadata/i);

    expect(await getRawRecord('snakeSeatBoards', row.id)).toBeDefined();
    expect(await getRawRecord('mlbDraftSessions', farmCandidate.id)).toBeUndefined();
    expect(syncMockState.remove).not.toHaveBeenCalled();
  });

  test('a fresh FARM transition removes validated orphaned MLB board authority, emits its tombstone, and preserves season-1 bytes', async () => {
    const completedMlb = await persistCompletedMlbAuthority({
      seatBoards: { 'team-a': board(3, 'mlb-private-plan') },
    });
    const farmCandidate = farmCandidateFrom(completedMlb);
    const mlbBytesBefore = await getRawSessionAndBoards(completedMlb.id);
    const staleMlbRowId = seatBoardStoreId(farmCandidate.id, 'MLB', 'team-a');
    await putRawRecord('snakeSeatBoards', {
      id: staleMlbRowId,
      sessionId: farmCandidate.id,
      leagueId: farmCandidate.leagueId,
      seasonNumber: farmCandidate.seasonNumber,
      teamId: 'team-a',
      phase: 'MLB',
      board: board(9, 'orphaned-mlb-plan'),
      revision: 9,
      lastModified: '2026-07-14T11:59:00.000Z',
    } satisfies SnakeSeatBoardStoreRecord);

    const wrongSeasonCandidate = {
      ...farmCandidate,
      id: createMlbDraftSessionId(farmCandidate.leagueId, 3),
      seasonNumber: 3,
    };
    const wrongSeasonRowId = seatBoardStoreId(wrongSeasonCandidate.id, 'MLB', 'team-a');
    await putRawRecord('snakeSeatBoards', {
      id: wrongSeasonRowId,
      sessionId: wrongSeasonCandidate.id,
      leagueId: wrongSeasonCandidate.leagueId,
      seasonNumber: wrongSeasonCandidate.seasonNumber,
      teamId: 'team-a',
      phase: 'MLB',
      board: board(7, 'wrong-season-orphan'),
      revision: 7,
      lastModified: '2026-07-14T11:58:00.000Z',
    } satisfies SnakeSeatBoardStoreRecord);
    await expect(saveMlbDraftSession(
      wrongSeasonCandidate,
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/transition is malformed/i);
    expect(await getRawRecord('snakeSeatBoards', wrongSeasonRowId)).toBeDefined();
    expect(await getRawRecord('mlbDraftSessions', wrongSeasonCandidate.id)).toBeUndefined();

    await expect(saveMlbDraftSession(
      { ...farmCandidate, workflowVersion: 'snake-practice' },
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/transition is malformed/i);
    expect(await getRawRecord('snakeSeatBoards', staleMlbRowId)).toBeDefined();

    await expect(saveMlbDraftSession(
      { ...farmCandidate, paused: true },
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/transition is malformed/i);
    expect(await getRawRecord('snakeSeatBoards', staleMlbRowId)).toBeDefined();

    syncMockState.remove.mockClear();
    syncMockState.suppressed = false;
    const storedFarm = await saveMlbDraftSession(farmCandidate, { phaseTransition: 'MLB_TO_FARM' });
    const reloadedFarm = await getMlbDraftSession(farmCandidate.leagueId, 2);
    const reloadedMlb = await getMlbDraftSession(completedMlb.leagueId, 1);

    expect(storedFarm.draftPhase).toBe('FARM');
    expect(storedFarm).not.toHaveProperty('seatBoards');
    expect(storedFarm).not.toHaveProperty('farmSeatBoards');
    expect(reloadedFarm).not.toHaveProperty('seatBoards');
    expect(reloadedFarm).not.toHaveProperty('farmSeatBoards');
    expect(reloadedFarm).not.toHaveProperty('openTradeOffers');
    expect(reloadedFarm).not.toHaveProperty('roomLogByTeamId');
    expect(reloadedFarm).not.toHaveProperty('snakeCompanions');
    expect(reloadedFarm).not.toHaveProperty('paused');
    expect(reloadedFarm?.snakeSetup).not.toHaveProperty('seatingCertificate');
    expect(reloadedFarm?.trades).toEqual([]);
    expect(reloadedFarm?.correctionSnapshots).toEqual([]);
    expect(await getRawRecord('snakeSeatBoards', staleMlbRowId)).toBeUndefined();
    expect(syncMockState.remove).toHaveBeenCalledWith(
      'kbl-league-builder',
      'snakeSeatBoards',
      staleMlbRowId,
    );
    expect(await getRawSessionAndBoards(completedMlb.id)).toBe(mlbBytesBefore);
    expect(reloadedMlb?.completedPicks).toEqual(completedMlb.completedPicks);
    expect(reloadedMlb?.pickOrder).toEqual(completedMlb.pickOrder);
    expect(reloadedMlb?.seatBoards).toEqual(completedMlb.seatBoards);
  });

  test('a second FARM transition cannot replace an existing season-2 authority', async () => {
    const completedMlb = await persistCompletedMlbAuthority();
    const farmCandidate = farmCandidateFrom(completedMlb);
    await saveMlbDraftSession(farmCandidate, { phaseTransition: 'MLB_TO_FARM' });
    const bytesBefore = await getRawSessionAndBoards(farmCandidate.id);

    await expect(saveMlbDraftSession(
      farmCandidate,
      { phaseTransition: 'MLB_TO_FARM' },
    )).rejects.toThrow(/already exists/i);
    expect(await getRawSessionAndBoards(farmCandidate.id)).toBe(bytesBefore);
  });

  test('a generic FARM session save also converges a newer standalone board', async () => {
    const stale = await seedRawFarmAuthority({ farmSeatBoard: farmBoard(1, 'embedded-old') });
    const rowId = seatBoardStoreId(stale.id, 'FARM', 'team-a');
    const rawBoard = await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId);
    await putRawRecord('snakeSeatBoards', {
      ...rawBoard,
      board: farmBoard(2, 'standalone-new'),
      revision: 2,
    });

    const saved = await saveMlbDraftSession({ ...stale, paused: true });

    expect(saved.farmSeatBoards?.['team-a']).toEqual(farmBoard(2, 'standalone-new'));
    expectStandaloneAuthority(await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stale.id));
    expect((await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId))?.board)
      .toEqual(farmBoard(2, 'standalone-new'));
  });

  test('main-device MLB and FARM board writes enforce phase, completion, and frozen-club membership in-transaction', async () => {
    await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'mlb') },
    });
    await expect(patchMlbDraftSessionFarmSeatBoard({
      leagueId: 'perfroom-league', seasonNumber: 1, teamId: 'team-a',
      expectedBoardRevision: 1, board: farmBoard(2, 'wrong-phase'),
    })).rejects.toThrow(/MLB phase/i);
    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: 'perfroom-league', teamId: 'team-b',
      expectedBoardRevision: 1, board: board(2, 'not-frozen'),
    })).rejects.toThrow(/frozen MLB snake clubs/i);

    const completedMlb = {
      ...(await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', createMlbDraftSessionId('perfroom-league', 1)))!,
      currentPickIndex: 1,
    };
    await putRawRecord('mlbDraftSessions', completedMlb);
    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: 'perfroom-league', teamId: 'team-a',
      expectedBoardRevision: 1, board: board(2, 'after-complete'),
    })).rejects.toThrow('THIS DRAFT IS COMPLETE.');

    await putRawRecord('mlbDraftSessions', {
      ...completedMlb,
      currentPickIndex: 0,
      draftManifest: { phase: 'MLB' },
    });
    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: 'perfroom-league', teamId: 'team-a',
      expectedBoardRevision: 1, board: board(2, 'after-manifest'),
    })).rejects.toThrow('THIS DRAFT IS COMPLETE.');

    const farm = await seedRawFarmAuthority({
      pickOrder: [{ round: 1, pick: 1, teamId: 'team-a' }],
      farmSeatBoard: farmBoard(1, 'farm'),
    });
    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: farm.leagueId, seasonNumber: 2, teamId: 'team-a',
      expectedBoardRevision: 1, board: board(2, 'wrong-phase'),
    })).rejects.toThrow(/FARM phase/i);
    await expect(patchMlbDraftSessionFarmSeatBoard({
      leagueId: farm.leagueId, seasonNumber: 2, teamId: 'team-b',
      expectedBoardRevision: 1, board: farmBoard(2, 'not-frozen'),
    })).rejects.toThrow(/frozen FARM snake clubs/i);

    const rawFarm = (await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', farm.id))!;
    await putRawRecord('mlbDraftSessions', { ...rawFarm, currentPickIndex: 1 });
    await expect(patchMlbDraftSessionFarmSeatBoard({
      leagueId: farm.leagueId, seasonNumber: 2, teamId: 'team-a',
      expectedBoardRevision: 1, board: farmBoard(2, 'after-complete'),
    })).rejects.toThrow('THIS DRAFT IS COMPLETE.');

    const practice = await saveMlbDraftSession({
      ...session(),
      id: createMlbDraftSessionId('perfroom-league', 99),
      seasonNumber: 99,
      workflowVersion: 'snake-practice',
      seatBoards: { 'team-a': board(1, 'practice') },
    });
    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: practice.leagueId, seasonNumber: 99, teamId: 'team-a',
      expectedBoardRevision: 1, board: board(2, 'practice-saved'),
    })).resolves.toMatchObject({
      workflowVersion: 'snake-practice',
      seatBoards: { 'team-a': board(2, 'practice-saved') },
    });
  });

  test('different seat edits and a main-room pick survive regardless of transaction order', async () => {
    const base = await saveMlbDraftSession({
      ...sessionWithFrozenClubs('team-a', 'team-b'),
      pickOrder: [
        { round: 1, pick: 1, teamId: 'team-a' },
        { round: 1, pick: 2, teamId: 'team-b' },
      ],
      seatBoards: { 'team-a': board(1, 'a-1'), 'team-b': board(1, 'b-1') },
    });

    await Promise.all([
      patchMlbDraftSessionSeatBoard({
        leagueId: base.leagueId,
        teamId: 'team-a',
        board: board(2, 'a-2'),
        expectedBoardRevision: 1,
      }),
      patchMlbDraftSessionSeatBoard({
        leagueId: base.leagueId,
        teamId: 'team-b',
        board: board(2, 'b-2'),
        expectedBoardRevision: 1,
      }),
      saveMlbDraftRoomSession({
        ...base,
        completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'picked' }],
        currentPickIndex: 1,
        revision: 1,
      }, 0),
    ]);

    const stored = await getMlbDraftSession(base.leagueId, 1);
    expect(stored?.completedPicks).toEqual([expect.objectContaining({ playerId: 'picked' })]);
    expect(stored?.seatBoards?.['team-a']).toEqual(board(2, 'a-2'));
    expect(stored?.seatBoards?.['team-b']).toEqual(board(2, 'b-2'));
  });

  test('a companion rev12-to-13 edit and a Hotseat rev12-to-13 pick cannot create two board authorities', async () => {
    const base = await saveMlbDraftSession({
      ...session(),
      pickOrder: [
        { round: 1, pick: 1, teamId: 'team-a' },
        { round: 1, pick: 2, teamId: 'team-a' },
      ],
      seatBoards: { 'team-a': board(12, 'shared-rev-12') },
    });

    const results = await Promise.allSettled([
      patchMlbDraftSessionSeatBoard({
        leagueId: base.leagueId,
        teamId: 'team-a',
        board: board(13, 'companion-rev-13'),
        expectedBoardRevision: 12,
      }),
      saveMlbDraftRoomSession({
        ...base,
        completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'drafted-player' }],
        currentPickIndex: 1,
        seatBoards: { 'team-a': board(13, 'hotseat-rev-13') },
        revision: 1,
      }, 0),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);

    let current = (await getMlbDraftSession(base.leagueId, 1))!;
    const rawAfterRace = await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', base.id);
    expectStandaloneAuthority(rawAfterRace);
    expect((await getRawRecord<SnakeSeatBoardStoreRecord>(
      'snakeSeatBoards',
      seatBoardStoreId(base.id, 'MLB', 'team-a'),
    ))?.board).toEqual(current.seatBoards?.['team-a']);

    if (current.completedPicks.length === 0) {
      current = await saveMlbDraftRoomSession({
        ...current,
        completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'drafted-player' }],
        currentPickIndex: 1,
        seatBoards: { 'team-a': board(14, 'hotseat-retry-rev-14') },
        revision: 1,
      }, 0);
    }

    expect(current.completedPicks).toEqual([expect.objectContaining({ playerId: 'drafted-player' })]);
    expect(current.currentPickIndex).toBe(1);
    expectStandaloneAuthority(await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', base.id));
    expect((await getRawRecord<SnakeSeatBoardStoreRecord>(
      'snakeSeatBoards',
      seatBoardStoreId(base.id, 'MLB', 'team-a'),
    ))?.board).toEqual(current.seatBoards?.['team-a']);
  });

  test('a stale phone board cannot resurrect a player after the main room reconciles that seat', async () => {
    const base = await saveMlbDraftSession({
      ...session(),
      pickOrder: [
        { round: 1, pick: 1, teamId: 'team-a' },
        { round: 1, pick: 2, teamId: 'team-a' },
      ],
      seatBoards: { 'team-a': board(1, 'draft-target') },
    });
    await saveMlbDraftRoomSession({
      ...base,
      completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'draft-target' }],
      currentPickIndex: 1,
      seatBoards: { 'team-a': board(2, 'next-legal-player') },
      revision: 1,
    }, 0);

    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: base.leagueId,
      teamId: 'team-a',
      board: board(2, 'draft-target'),
      expectedBoardRevision: 1,
    })).rejects.toThrow('changed before it could be saved');
    expect((await getMlbDraftSession(base.leagueId, 1))?.seatBoards?.['team-a'])
      .toEqual(board(2, 'next-legal-player'));
  });

  test('Run It Back clears independent private boards before a deterministic session id is reused', async () => {
    await saveLeagueTemplate({
      id: 'perfroom-league',
      name: 'Perfroom',
      teamIds: [],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      draftFormat: 'snake',
    });
    await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'old-private-plan') },
    });

    await resetCompletedDraftArcAtomically('perfroom-league');
    const rerun = await saveMlbDraftSession(session());

    expect(rerun.seatBoards).toBeUndefined();
    expect((await getMlbDraftSession('perfroom-league', 1))?.seatBoards).toBeUndefined();
  });

  test('persisted manifest truth cannot be removed or replaced by generic or stale-room writes', async () => {
    const pool = {
      leagueId: 'perfroom-league', tier: 'standard' as const, balanceMode: 'taxed' as const,
      players: [{ id: 'player-a', iv: 100, salary: 100 }], tierCap: 1_000,
      luxuryCaps: [], pickValueChart: [], totalSlots: 1, poolSurplusWarning: false, locked: true,
    };
    await saveRegisteredPool(pool);
    const completed = {
      ...session(),
      completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a', settledSalary: 100 }],
      currentPickIndex: 1,
    };
    const frozen = freezeSnakeDraftSession({
      session: completed,
      expectedPhase: 'MLB',
      poolPlayerIds: ['player-a'],
      salaryByPlayerId: new Map([['player-a', 100]]),
      frozenAt: '2026-07-12T12:00:00.000Z',
    });
    await saveMlbDraftSession(completed);
    await freezeMlbDraftRoomSessionWithRegisteredPool({ session: frozen, registeredPool: pool, expectedRevision: 0 });

    await expect(saveMlbDraftSession(completed)).rejects.toThrow(/manifest/i);
    await expect(saveMlbDraftRoomSession(completed, 0)).rejects.toThrow(/manifest/i);

    const replaced = {
      ...frozen,
      draftManifest: { ...frozen.draftManifest!, frozenAt: '2026-07-13T12:00:00.000Z' },
    };
    await expect(saveMlbDraftSession(replaced)).rejects.toThrow(/manifest/i);
    const concurrentWinner = await freezeMlbDraftRoomSessionWithRegisteredPool({
      session: replaced, registeredPool: pool, expectedRevision: 0,
    });
    expect(JSON.stringify(concurrentWinner.draftManifest)).toBe(JSON.stringify(frozen.draftManifest));

    const retry = await saveMlbDraftSession({ ...frozen, paused: true });
    expect(JSON.stringify(retry.draftManifest)).toBe(JSON.stringify(frozen.draftManifest));
    expect(JSON.stringify((await getMlbDraftSession(frozen.leagueId, frozen.seasonNumber))?.draftManifest))
      .toBe(JSON.stringify(frozen.draftManifest));
  });

  test('a stale whole-room action is rejected instead of clobbering the winner', async () => {
    const base = await saveMlbDraftSession(session());
    await saveMlbDraftRoomSession({ ...base, paused: true, revision: 1 }, 0);

    await expect(saveMlbDraftRoomSession({
      ...base,
      completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'stale-pick' }],
      currentPickIndex: 1,
      revision: 1,
    }, 0)).rejects.toThrow('The draft moved before this action could be saved.');

    await expect(getMlbDraftSession(base.leagueId, 1)).resolves.toMatchObject({
      paused: true,
      completedPicks: [],
      currentPickIndex: 0,
      revision: 1,
    });
  });

  test('a correction preserves a newer off-clock farm board revision', async () => {
    const base = await seedRawFarmAuthority({ farmSeatBoard: farmBoard(1, 'old-order') });
    const picked = applySnakePickWithCorrection({
      session: base,
      player: { playerId: 'player-a' },
      settledSalary: base.farmSlotSalaries![0],
      marginalTax: 0,
      versionPool: [{ playerId: 'player-a' }],
    });
    const afterPick = await saveMlbDraftRoomSession(picked, 0);
    await patchMlbDraftSessionFarmSeatBoard({
      leagueId: base.leagueId,
      seasonNumber: 2,
      teamId: 'team-a',
      board: farmBoard(2, 'new-order'),
      expectedBoardRevision: 1,
    });
    await expect(patchMlbDraftSessionFarmSeatBoard({
      leagueId: base.leagueId, seasonNumber: 2, teamId: 'team-a',
      board: farmBoard(2, 'same-revision'), expectedBoardRevision: 2,
    })).rejects.toThrow('invalid next revision');

    const corrected = await saveMlbDraftRoomSession(restoreLatestSnakeCorrection(afterPick), 1);
    expect(corrected.completedPicks).toEqual([]);
    expect(corrected.currentPickIndex).toBe(0);
    expect(corrected.farmSeatBoards?.['team-a']).toEqual(farmBoard(2, 'new-order'));
    expect(corrected.revision).toBe(2);
  });

  test('a completed manifest makes its RegisteredPool immutable until reset', async () => {
    const pool = {
      leagueId: 'perfroom-league', tier: 'standard' as const, balanceMode: 'taxed' as const,
      players: [{ id: 'player-a', iv: 100, salary: 100 }], tierCap: 1_000,
      luxuryCaps: [], pickValueChart: [], totalSlots: 1, poolSurplusWarning: false, locked: true,
    };
    await saveRegisteredPool(pool);
    const completed = {
      ...session(),
      completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a', settledSalary: 100 }],
      currentPickIndex: 1,
    };
    const frozen = freezeSnakeDraftSession({
      session: completed,
      expectedPhase: 'MLB',
      poolPlayerIds: ['player-a'],
      salaryByPlayerId: new Map([['player-a', 100]]),
      frozenAt: '2026-07-12T12:00:00.000Z',
    });
    await saveMlbDraftSession(completed);
    await freezeMlbDraftRoomSessionWithRegisteredPool({ session: frozen, registeredPool: pool, expectedRevision: 0 });

    await expect(saveRegisteredPool({ ...pool, players: [{ id: 'player-a', iv: 99, salary: 100 }] }))
      .rejects.toThrow('Run It Back');
    await expect(saveRegisteredPool(pool)).resolves.toBeUndefined();
    expect((await getRegisteredPool(pool.leagueId))?.players[0].iv).toBe(100);
  });

  test('pool edit racing MLB confirmation cannot produce a mismatched manifest pair', async () => {
    const pool = {
      leagueId: 'perfroom-league', tier: 'standard' as const, balanceMode: 'taxed' as const,
      players: [{ id: 'player-a', iv: 100, salary: 100 }], tierCap: 1_000,
      luxuryCaps: [], pickValueChart: [], totalSlots: 1, poolSurplusWarning: false, locked: true,
    };
    const completed = { ...session(), completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a', settledSalary: 100 }], currentPickIndex: 1 };
    await saveRegisteredPool(pool);
    await saveMlbDraftSession(completed);
    const frozen = freezeSnakeDraftSession({ session: completed, expectedPhase: 'MLB', poolPlayerIds: ['player-a'], salaryByPlayerId: new Map([['player-a', 100]]), frozenAt: '2026-07-12T12:00:00.000Z' });
    const results = await Promise.allSettled([
      freezeMlbDraftRoomSessionWithRegisteredPool({ session: frozen, registeredPool: pool, expectedRevision: 0 }),
      saveRegisteredPool({ ...pool, players: [{ id: 'player-a', iv: 99, salary: 100 }] }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const storedSession = await getMlbDraftSession(pool.leagueId, 1);
    const storedPool = await getRegisteredPool(pool.leagueId);
    if (storedSession?.draftManifest) {
      expect(storedPool?.players).toEqual(pool.players);
      expect(storedSession.draftManifest.pool.mlbIvByPlayerId?.['player-a']).toBe(storedPool?.players[0].iv);
    } else {
      expect(storedPool?.players[0].iv).toBe(99);
    }
  });

  test('MLB confirmation preserves companion consent and the newest seat-board revision', async () => {
    const pool = {
      leagueId: 'perfroom-league', tier: 'standard' as const, balanceMode: 'taxed' as const,
      players: [{ id: 'player-a', iv: 100, salary: 100 }], tierCap: 1_000,
      luxuryCaps: [], pickValueChart: [], totalSlots: 1, poolSurplusWarning: false, locked: true,
    };
    const incomplete = {
      ...session(),
      seatBoards: { 'team-a': board(1, 'old-board') },
      snakeCompanions: { roomCode: '4821', claims: [] },
    };
    await saveRegisteredPool(pool);
    const stale = await saveMlbDraftSession(incomplete);
    const frozen = freezeSnakeDraftSession({
      session: {
        ...stale,
        completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a', settledSalary: 100 }],
        currentPickIndex: 1,
      },
      expectedPhase: 'MLB',
      poolPlayerIds: ['player-a'],
      salaryByPlayerId: new Map([['player-a', 100]]),
      frozenAt: '2026-07-12T12:00:00.000Z',
    });
    await patchMlbDraftSessionSeatBoard({
      leagueId: pool.leagueId, teamId: 'team-a', board: board(2, 'new-board'), expectedBoardRevision: 1,
    });
    await patchMlbDraftSessionSnakeCompanions({
      leagueId: pool.leagueId,
      patch: () => ({ roomCode: '4821', claims: [{ deviceId: 'phone', gmName: 'Alex', teamId: 'team-a', status: 'revoked' }] }),
    });
    const saved = await freezeMlbDraftRoomSessionWithRegisteredPool({ session: frozen, registeredPool: pool, expectedRevision: 0 });
    expect(saved.seatBoards?.['team-a']).toEqual(board(2, 'new-board'));
    expect(saved.snakeCompanions?.claims).toEqual([expect.objectContaining({ deviceId: 'phone', status: 'revoked' })]);
  });
});
