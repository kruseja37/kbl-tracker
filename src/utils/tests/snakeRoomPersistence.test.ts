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
  type LeagueBuilderMlbDraftSession,
  type FarmSeatBoardRecord,
  type SnakeSeatBoardRecord,
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
      ...session(),
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

  test('different seat edits and a main-room pick survive regardless of transaction order', async () => {
    const base = await saveMlbDraftSession({
      ...session(),
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
      farmSlotSalaries: [10],
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
    const completed = {
      ...session(),
      completedPicks: [{ round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a', settledSalary: 100 }],
      currentPickIndex: 1,
      seatBoards: { 'team-a': board(1, 'old-board') },
      snakeCompanions: { roomCode: '4821', claims: [] },
    };
    await saveRegisteredPool(pool);
    const stale = await saveMlbDraftSession(completed);
    const frozen = freezeSnakeDraftSession({ session: stale, expectedPhase: 'MLB', poolPlayerIds: ['player-a'], salaryByPlayerId: new Map([['player-a', 100]]), frozenAt: '2026-07-12T12:00:00.000Z' });
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
