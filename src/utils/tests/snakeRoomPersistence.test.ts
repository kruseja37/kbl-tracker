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
  getMlbDraftSession,
  patchMlbDraftSessionSeatBoard,
  patchMlbDraftSessionSnakeCompanions,
  saveMlbDraftRoomSession,
  saveMlbDraftSession,
  type LeagueBuilderMlbDraftSession,
  type SnakeSeatBoardRecord,
} from '../leagueBuilderStorage';
import {
  ensureCompanionRoom,
  submitCompanionClaim,
} from '../../src_figma/app/components/snake/companion/companionModel';
import { freezeSnakeDraftSession } from '../snakeDraftManifest';

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
      clubs: [{ teamId: 'team-a', gmName: 'Alex', hotseat: true }],
      orderSeed: 'order',
    },
    revision: 0,
    currentPickIndex: 0,
    createdDate: '2026-07-11T00:00:00.000Z',
    lastModified: '2026-07-11T00:00:00.000Z',
  };
}

function board(revision: number, marker: string): SnakeSeatBoardRecord {
  return {
    slots: { marker } as unknown as SnakeSeatBoardRecord['slots'],
    rankings: { global: [marker] },
    revision,
  };
}

async function resetStorage(): Promise<void> {
  __resetLeagueBuilderDatabaseForTests();
  await clearAllLeagueBuilderData().catch(() => undefined);
  __resetLeagueBuilderDatabaseForTests();
}

describe('PERFROOM room-session persistence', () => {
  beforeEach(resetStorage);
  afterEach(resetStorage);

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
    await saveMlbDraftSession(claim.session!);

    await saveMlbDraftRoomSession({
      ...staleRoomCopy,
      completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a' }],
      currentPickIndex: 1,
      revision: 1,
    });

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
      ...session(),
      snakeCompanions: { roomCode: '4821', claims: [] },
      seatBoards: { 'team-a': board(1, 'room-a-1'), 'team-b': board(1, 'room-b-1') },
    });
    await saveMlbDraftSession({
      ...staleRoomCopy,
      snakeCompanions: {
        roomCode: '4821',
        claims: [{ deviceId: 'phone-b', gmName: 'Blair', teamId: 'team-b', status: 'approved' }],
      },
      seatBoards: { ...staleRoomCopy.seatBoards, 'team-b': board(2, 'phone-b-2') },
      revision: 2,
    });

    const saved = await saveMlbDraftRoomSession({
      ...staleRoomCopy,
      seatBoards: { ...staleRoomCopy.seatBoards, 'team-a': board(2, 'room-a-2') },
      revision: 2,
    });

    expect(saved.snakeCompanions?.claims).toEqual([
      expect.objectContaining({ deviceId: 'phone-b', status: 'approved' }),
    ]);
    expect(saved.seatBoards?.['team-a']).toEqual(board(2, 'room-a-2'));
    expect(saved.seatBoards?.['team-b']).toEqual(board(2, 'phone-b-2'));
    expect(saved.revision).toBe(3);
  });

  test('a seat-board patch ignores unrelated session revision changes and rejects a stale board revision', async () => {
    await saveMlbDraftSession({
      ...session(),
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
    expect(saved.revision).toBe(10);

    await expect(patchMlbDraftSessionSeatBoard({
      leagueId: 'perfroom-league',
      teamId: 'team-a',
      board: board(3, 'stale-overwrite'),
      expectedBoardRevision: 1,
    })).rejects.toThrow('Seat board team-a changed before it could be saved.');
    expect((await getMlbDraftSession('perfroom-league', 1))?.seatBoards?.['team-a'])
      .toEqual(board(2, 'phone-board-a-2'));
  });

  test('persisted manifest truth cannot be removed or replaced by generic or stale-room writes', async () => {
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
    await saveMlbDraftSession(frozen);

    await expect(saveMlbDraftSession(completed)).rejects.toThrow(/manifest/i);
    await expect(saveMlbDraftRoomSession(completed)).rejects.toThrow(/manifest/i);

    const replaced = {
      ...frozen,
      draftManifest: { ...frozen.draftManifest!, frozenAt: '2026-07-13T12:00:00.000Z' },
    };
    await expect(saveMlbDraftSession(replaced)).rejects.toThrow(/manifest/i);
    const concurrentWinner = await saveMlbDraftRoomSession(replaced);
    expect(JSON.stringify(concurrentWinner.draftManifest)).toBe(JSON.stringify(frozen.draftManifest));

    const retry = await saveMlbDraftSession({ ...frozen, paused: true });
    expect(JSON.stringify(retry.draftManifest)).toBe(JSON.stringify(frozen.draftManifest));
    expect(JSON.stringify((await getMlbDraftSession(frozen.leagueId, frozen.seasonNumber))?.draftManifest))
      .toBe(JSON.stringify(frozen.draftManifest));
  });
});
