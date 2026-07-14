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
  patchApprovedCompanionSeatBoard,
  patchMlbDraftSessionSnakeCompanions,
  saveRegisteredPool,
  saveMlbDraftSession,
  type LeagueBuilderMlbDraftSession,
  type RegisteredPool,
  type SnakeSeatBoardRecord,
} from '../leagueBuilderStorage';
import {
  approveCompanionClaim,
  companionClaimIdentity,
  ensureCompanionRoom,
  submitCompanionClaim,
} from '../../src_figma/app/components/snake/companion/companionModel';
import { freezeSnakeDraftSession } from '../snakeDraftManifest';

function transition(
  value: LeagueBuilderMlbDraftSession,
  deviceId: string,
  status: 'approved' | 'revoked',
): LeagueBuilderMlbDraftSession {
  const claim = value.snakeCompanions?.claims.find((row) => row.deviceId === deviceId && row.status !== 'revoked');
  if (!claim) throw new Error(`Missing active claim for ${deviceId}.`);
  return approveCompanionClaim(value, companionClaimIdentity(claim), status);
}

function board(revision: number, playerId: string): SnakeSeatBoardRecord {
  return {
    slots: { C: playerId } as SnakeSeatBoardRecord['slots'],
    rankings: { global: [playerId] },
    revision,
  };
}

function session(): LeagueBuilderMlbDraftSession {
  const clubs = ['a', 'b', 'c', 'd'].map((id, index) => ({
    teamId: `team-${id}`,
    gmName: ['Alex', 'Blair', 'Casey', 'Dana'][index],
    hotseat: false,
  }));
  return {
    id: createMlbDraftSessionId('companion-atomic', 1),
    leagueId: 'companion-atomic',
    seasonNumber: 1,
    seed: 'seed',
    workflowVersion: 'snake-v1',
    engineMethodVersion: 'snake-s1a',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: 1,
    pickOrder: [
      { round: 1, pick: 1, teamId: 'team-a' },
      { round: 1, pick: 2, teamId: 'team-b' },
    ],
    completedPicks: [],
    currentPickIndex: 0,
    seatBoards: Object.fromEntries(clubs.map((club) => [club.teamId, board(1, `${club.teamId}-old`)])),
    snakeSetup: {
      poolPlayerIds: [],
      versionSelections: {},
      clubs,
      orderSeed: 'seed',
    },
    revision: 0,
    createdDate: '2026-07-12T00:00:00.000Z',
    lastModified: '2026-07-12T00:00:00.000Z',
  };
}

async function resetStorage(): Promise<void> {
  __resetLeagueBuilderDatabaseForTests();
  await clearAllLeagueBuilderData().catch(() => undefined);
  __resetLeagueBuilderDatabaseForTests();
}

async function submitAtomicClaim(deviceId: string, gmName: string): Promise<LeagueBuilderMlbDraftSession> {
  return patchMlbDraftSessionSnakeCompanions({
    leagueId: 'companion-atomic',
    patch: (companions, fresh) => {
      const result = submitCompanionClaim(
        { ...fresh, snakeCompanions: companions },
        { deviceId, gmName, roomCode: '4821' },
      );
      if (!result.ok || !result.session?.snakeCompanions) throw new Error(result.message);
      return result.session.snakeCompanions;
    },
  });
}

describe('companion atomic persistence', () => {
  beforeEach(resetStorage);
  afterEach(resetStorage);

  test('fresh transaction authorization rejects revoke, team switch, completion, and invalid next revision', async () => {
    const opened = ensureCompanionRoom(session(), () => '4821');
    const pending = submitCompanionClaim(opened, { deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821' });
    await saveMlbDraftSession(transition(pending.session!, 'ipad-a', 'approved'));

    await patchMlbDraftSessionSnakeCompanions({
      leagueId: 'companion-atomic',
      patch: (companions, fresh) => {
        const current = { ...fresh, snakeCompanions: companions };
        return transition(current, 'ipad-a', 'revoked').snakeCompanions!;
      },
    });
    await expect(patchApprovedCompanionSeatBoard({
      leagueId: 'companion-atomic', deviceId: 'ipad-a', teamId: 'team-a',
      expectedBoardRevision: 1, board: board(2, 'must-not-save'),
    })).rejects.toThrow('MAIN-DEVICE APPROVAL IS REQUIRED.');

    await patchMlbDraftSessionSnakeCompanions({
      leagueId: 'companion-atomic',
      patch: (companions, fresh) => {
        const current = { ...fresh, snakeCompanions: companions };
        const result = submitCompanionClaim(current, {
          deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821', claimId: 'ipad-a-reclaim',
        });
        if (!result.ok || !result.session?.snakeCompanions) throw new Error(result.message);
        return result.session.snakeCompanions;
      },
    });
    await patchMlbDraftSessionSnakeCompanions({
      leagueId: 'companion-atomic',
      patch: (companions, fresh) => {
        const current = { ...fresh, snakeCompanions: companions };
        const claim = current.snakeCompanions?.claims.find((row) => row.claimId === 'ipad-a-reclaim');
        if (!claim) throw new Error('Reclaimed companion claim was not found.');
        return approveCompanionClaim(
          current,
          companionClaimIdentity(claim),
          'approved',
        ).snakeCompanions!;
      },
    });
    await expect(patchApprovedCompanionSeatBoard({
      leagueId: 'companion-atomic', deviceId: 'ipad-a', teamId: 'team-b',
      expectedBoardRevision: 1, board: board(2, 'wrong-team'),
    })).rejects.toThrow('MAIN-DEVICE APPROVAL IS REQUIRED.');
    await expect(patchApprovedCompanionSeatBoard({
      leagueId: 'companion-atomic', deviceId: 'ipad-a', teamId: 'team-a',
      expectedBoardRevision: 1, board: board(4, 'skipped-revision'),
    })).rejects.toThrow('invalid next revision');

    const beforeComplete = (await getMlbDraftSession('companion-atomic', 1))!;
    await saveMlbDraftSession({ ...beforeComplete, currentPickIndex: beforeComplete.pickOrder.length });
    await expect(patchApprovedCompanionSeatBoard({
      leagueId: 'companion-atomic', deviceId: 'ipad-a', teamId: 'team-a',
      expectedBoardRevision: 1, board: board(2, 'after-complete'),
    })).rejects.toThrow('THIS DRAFT IS COMPLETE.');
    expect((await getMlbDraftSession('companion-atomic', 1))?.seatBoards?.['team-a']).toEqual(board(1, 'team-a-old'));
  });

  test('concurrent claim submissions merge on fresh state and the fourth cannot cross the cap', async () => {
    await saveMlbDraftSession(ensureCompanionRoom(session(), () => '4821'));
    await Promise.all([
      submitAtomicClaim('ipad-a', 'Alex'),
      submitAtomicClaim('ipad-b', 'Blair'),
      submitAtomicClaim('ipad-c', 'Casey'),
    ]);
    const stored = await getMlbDraftSession('companion-atomic', 1);
    expect(stored?.snakeCompanions?.claims.filter((claim) => claim.status !== 'revoked')).toHaveLength(3);
    expect(new Set(stored?.snakeCompanions?.claims.map((claim) => claim.deviceId))).toEqual(new Set(['ipad-a', 'ipad-b', 'ipad-c']));

    await expect(submitAtomicClaim('ipad-d', 'Dana')).rejects.toThrow('THIS ROOM ALREADY HAS 3 COMPANIONS.');
    expect((await getMlbDraftSession('companion-atomic', 1))?.snakeCompanions?.claims.filter((claim) => claim.status !== 'revoked')).toHaveLength(3);
  });

  test('fresh claim, board edit, and revoke survive a final MLB freeze from a stale main-room copy', async () => {
    const registeredPool: RegisteredPool = {
      leagueId: 'companion-atomic',
      tier: 'standard',
      balanceMode: 'taxed',
      players: [
        { id: 'player-a', iv: 10_000, salary: 10_000 },
        { id: 'player-b', iv: 11_000, salary: 11_000 },
      ],
      tierCap: 1_000_000,
      luxuryCaps: [],
      pickValueChart: [],
      totalSlots: 2,
      poolSurplusWarning: false,
      locked: true,
    };
    await saveRegisteredPool(registeredPool);
    const staleMainCopy = await saveMlbDraftSession(ensureCompanionRoom(session(), () => '4821'));

    await submitAtomicClaim('ipad-a', 'Alex');
    await patchMlbDraftSessionSnakeCompanions({
      leagueId: 'companion-atomic',
      patch: (companions, fresh) => {
        const value = { ...fresh, snakeCompanions: companions };
        const pending = value.snakeCompanions!.claims.find((claim) => claim.deviceId === 'ipad-a')!;
        return approveCompanionClaim(value, companionClaimIdentity(pending), 'approved').snakeCompanions!;
      },
    });
    await patchApprovedCompanionSeatBoard({
      leagueId: 'companion-atomic',
      deviceId: 'ipad-a',
      teamId: 'team-a',
      expectedBoardRevision: 1,
      board: board(2, 'phone-board'),
    });
    await patchMlbDraftSessionSnakeCompanions({
      leagueId: 'companion-atomic',
      patch: (companions, fresh) => {
        const value = { ...fresh, snakeCompanions: companions };
        return transition(value, 'ipad-a', 'revoked').snakeCompanions!;
      },
    });

    const completedStaleCopy: LeagueBuilderMlbDraftSession = {
      ...staleMainCopy,
      completedPicks: [
        { round: 1, pick: 1, teamId: 'team-a', playerId: 'player-a', settledSalary: 10_000, marginalTax: 0 },
        { round: 1, pick: 2, teamId: 'team-b', playerId: 'player-b', settledSalary: 11_000, marginalTax: 0 },
      ],
      currentPickIndex: 2,
    };
    const frozen = freezeSnakeDraftSession({
      session: completedStaleCopy,
      expectedPhase: 'MLB',
      poolPlayerIds: ['player-a', 'player-b'],
      salaryByPlayerId: new Map([['player-a', 10_000], ['player-b', 11_000]]),
      frozenAt: '2026-07-12T20:00:00.000Z',
    });
    const saved = await freezeMlbDraftRoomSessionWithRegisteredPool({
      session: frozen,
      registeredPool,
      expectedRevision: staleMainCopy.revision ?? 0,
    });

    expect(saved.draftManifest?.phase).toBe('MLB');
    expect(saved.snakeCompanions?.claims).toEqual([
      expect.objectContaining({ deviceId: 'ipad-a', status: 'revoked' }),
    ]);
    expect(saved.seatBoards?.['team-a']).toEqual(board(2, 'phone-board'));
  });
});
