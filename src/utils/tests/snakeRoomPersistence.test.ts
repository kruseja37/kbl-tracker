import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  createMlbDraftSessionId,
  freezeMlbDraftRoomSessionWithRegisteredPool,
  getMlbDraftSession,
  getRegisteredPool,
  patchMlbDraftSessionFarmSeatBoard,
  patchMlbDraftSessionSeatBoard,
  patchMlbDraftSessionSnakeCompanions,
  postApprovedCompanionTradeOffer,
  resetCompletedDraftArcAtomically,
  saveLeagueTemplate,
  saveRegisteredPool,
  saveMlbDraftRoomSession,
  saveMlbDraftSession,
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
import { freezeSnakeDraftSession } from '../snakeDraftManifest';
import { applySnakePickWithCorrection, restoreLatestSnakeCorrection } from '../../engines/snakeSession';
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

async function resetStorage(): Promise<void> {
  __resetLeagueBuilderDatabaseForTests();
  await clearAllLeagueBuilderData().catch(() => undefined);
  __resetLeagueBuilderDatabaseForTests();
}

describe('PERFROOM room-session persistence', () => {
  beforeEach(resetStorage);
  afterEach(resetStorage);

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

  test('embedded rev2 beats standalone rev1 and the successful rev3 write converges both copies', async () => {
    const stored = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'standalone-old') },
    });
    await putRawRecord('mlbDraftSessions', {
      ...stored,
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
    expect(rawSession?.seatBoards?.['team-a']).toEqual(board(3, 'converged'));
    expect(rawBoard?.board).toEqual(board(3, 'converged'));
  });

  test('standalone rev2 beats embedded rev1 and the successful rev3 write converges both copies', async () => {
    const stored = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(1, 'embedded-old') },
    });
    const rowId = seatBoardStoreId(stored.id, 'MLB', 'team-a');
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
    expect(rawSession?.seatBoards?.['team-a']).toEqual(board(3, 'converged'));
    expect(convergedRow?.board).toEqual(board(3, 'converged'));
  });

  test('equal-revision unequal seat-board payloads fail reads and writes closed', async () => {
    const stored = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(2, 'embedded') },
    });
    const rowId = seatBoardStoreId(stored.id, 'MLB', 'team-a');
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
    expect((await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stale.id))?.seatBoards?.['team-a'])
      .toEqual(board(2, 'standalone-new'));
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
    expect((await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', candidate.id))?.seatBoards?.['team-a'])
      .toEqual(board(2, 'standalone-first'));
    expect((await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId))?.board)
      .toEqual(board(2, 'standalone-first'));
  });

  test('a generic save conflict aborts before changing either raw store', async () => {
    const stored = await saveMlbDraftSession({
      ...session(),
      seatBoards: { 'team-a': board(2, 'embedded') },
    });
    const rowId = seatBoardStoreId(stored.id, 'MLB', 'team-a');
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

    const completed = { ...base, currentPickIndex: base.pickOrder.length };
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
    await putRawRecord('mlbDraftSessions', {
      ...initial,
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
      error: /MLB phase/,
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
    if (authoritative !== initial) await putRawRecord('mlbDraftSessions', authoritative);
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
    const stored = await saveMlbDraftSession({
      ...session(),
      id: createMlbDraftSessionId('perfroom-league', 2),
      seasonNumber: 2,
      draftPhase: 'FARM',
      workflowVersion: 'snake-v1-farm',
      pickOrder: [
        { round: 1, pick: 1, teamId: 'team-a' },
        { round: 2, pick: 2, teamId: 'team-a' },
      ],
      farmSlotSalaries: [10, 10],
      farmSeatBoards: { 'team-a': farmBoard(1, 'embedded-old') },
    });
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
    expect((await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stored.id))?.farmSeatBoards?.['team-a'])
      .toEqual(farmBoard(3, 'converged'));
    expect((await getRawRecord<{ board: FarmSeatBoardRecord }>('snakeSeatBoards', rowId))?.board)
      .toEqual(farmBoard(3, 'converged'));

    const rawSession = await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stored.id);
    await putRawRecord('mlbDraftSessions', {
      ...rawSession,
      farmSeatBoards: { 'team-a': farmBoard(3, 'embedded-conflict') },
    });
    await expect(getMlbDraftSession(stored.leagueId, 2)).rejects.toThrow(/corrupt/i);
  });

  test('a generic FARM session save also converges a newer standalone board', async () => {
    const stale = await saveMlbDraftSession({
      ...session(),
      id: createMlbDraftSessionId('perfroom-league', 2),
      seasonNumber: 2,
      draftPhase: 'FARM',
      workflowVersion: 'snake-v1-farm',
      farmSlotSalaries: [10],
      farmSeatBoards: { 'team-a': farmBoard(1, 'embedded-old') },
    });
    const rowId = seatBoardStoreId(stale.id, 'FARM', 'team-a');
    const rawBoard = await getRawRecord<SnakeSeatBoardStoreRecord>('snakeSeatBoards', rowId);
    await putRawRecord('snakeSeatBoards', {
      ...rawBoard,
      board: farmBoard(2, 'standalone-new'),
      revision: 2,
    });

    const saved = await saveMlbDraftSession({ ...stale, paused: true });

    expect(saved.farmSeatBoards?.['team-a']).toEqual(farmBoard(2, 'standalone-new'));
    expect((await getRawRecord<LeagueBuilderMlbDraftSession>('mlbDraftSessions', stale.id))?.farmSeatBoards?.['team-a'])
      .toEqual(farmBoard(2, 'standalone-new'));
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

    const farm = await saveMlbDraftSession({
      ...session(),
      id: createMlbDraftSessionId('perfroom-league', 2),
      seasonNumber: 2,
      draftPhase: 'FARM',
      workflowVersion: 'snake-v1-farm',
      farmSlotSalaries: [10],
      farmSeatBoards: { 'team-a': farmBoard(1, 'farm') },
    });
    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: farm.leagueId, seasonNumber: 2, teamId: 'team-a',
      expectedBoardRevision: 1, board: board(2, 'wrong-phase'),
    })).rejects.toThrow(/FARM phase/i);
    await expect(patchMlbDraftSessionFarmSeatBoard({
      leagueId: farm.leagueId, seasonNumber: 2, teamId: 'team-b',
      expectedBoardRevision: 1, board: farmBoard(2, 'not-frozen'),
    })).rejects.toThrow(/frozen FARM snake clubs/i);

    await putRawRecord('mlbDraftSessions', { ...farm, currentPickIndex: 1 });
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
    const base = await saveMlbDraftSession({
      ...session(),
      id: createMlbDraftSessionId('perfroom-league', 2),
      seasonNumber: 2,
      draftPhase: 'FARM',
      pickOrder: [
        { round: 1, pick: 1, teamId: 'team-a' },
        { round: 2, pick: 2, teamId: 'team-a' },
      ],
      farmSlotSalaries: [10, 10],
      farmSeatBoards: { 'team-a': farmBoard(1, 'old-order') },
    });
    const picked = applySnakePickWithCorrection({
      session: base,
      player: { playerId: 'player-a' },
      settledSalary: 10,
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
