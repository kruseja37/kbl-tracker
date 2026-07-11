import { describe, expect, it } from 'vitest';

import type { LeagueBuilderMlbDraftSession, SnakeSeatBoardRecord } from '../../../../../../utils/leagueBuilderStorage';
import {
  approveCompanionClaim,
  ensureCompanionRoom,
  submitCompanionClaim,
  updateApprovedCompanionBoard,
} from '../companionModel';

function board(revision = 1): SnakeSeatBoardRecord {
  return {
    slots: {} as SnakeSeatBoardRecord['slots'],
    rankings: { global: ['player-a'] },
    revision,
  };
}

function session(): LeagueBuilderMlbDraftSession {
  return {
    id: 'mlb-draft-league-1-1', leagueId: 'league-1', seasonNumber: 1,
    seed: 'seed', workflowVersion: 'snake-v2', engineMethodVersion: 'snake-v2',
    tier: 'standard', balanceMode: 'balanced', rounds: 22,
    pickOrder: [{ round: 1, pick: 1, teamId: 'team-a' }], completedPicks: [],
    currentPickIndex: 0, createdDate: '2026-07-10', lastModified: '2026-07-10', revision: 4,
    snakeSetup: {
      poolPlayerIds: ['player-a'], versionSelections: {}, orderSeed: 'order',
      clubs: [
        { teamId: 'team-a', gmName: 'Alex', hotseat: false },
        { teamId: 'team-b', gmName: 'Blair', hotseat: false },
        { teamId: 'team-c', gmName: 'Casey', hotseat: false },
        { teamId: 'team-d', gmName: 'Dana', hotseat: false },
      ],
    },
    seatBoards: { 'team-a': board(), 'team-b': { ...board(), rankings: { global: ['player-b'] } } },
  };
}

describe('S5 companion lifecycle', () => {
  it('stays fail-closed until main approval and revoke removes access immediately', () => {
    const opened = ensureCompanionRoom(session(), () => '4821');
    const pending = submitCompanionClaim(opened, { deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821' });
    expect(pending.ok).toBe(true);
    expect(pending.session && pending.session.snakeCompanions?.claims[0]?.status).toBe('pending');
    expect(pending.session && pending.session.snakeCompanions?.claims[0]?.teamId).toBe('team-a');

    const approved = approveCompanionClaim(pending.session!, 'ipad-a', 'approved');
    expect(approved.snakeCompanions?.claims[0]?.status).toBe('approved');
    const revoked = approveCompanionClaim(approved, 'ipad-a', 'revoked');
    const write = updateApprovedCompanionBoard({
      session: revoked, deviceId: 'ipad-a', expectedSessionRevision: 4,
      expectedBoardRevision: 1, board: board(2),
    });
    expect(write.ok).toBe(false);
    expect(write.message).toMatch(/APPROVAL/i);
  });

  it('refuses a fourth active device with plain copy and a new approved claim replaces the old device for that seat', () => {
    let current = ensureCompanionRoom(session(), () => '4821');
    for (const [deviceId, gmName] of [['one', 'Alex'], ['two', 'Blair']] as const) {
      const result = submitCompanionClaim(current, { deviceId, gmName, roomCode: '4821' });
      current = approveCompanionClaim(result.session!, deviceId, 'approved');
    }
    const third = submitCompanionClaim(current, { deviceId: 'three', gmName: 'Casey', roomCode: '4821' });
    current = approveCompanionClaim(third.session!, 'three', 'approved');
    const fourth = submitCompanionClaim(current, { deviceId: 'four', gmName: 'Dana', roomCode: '4821' });
    expect(fourth.ok).toBe(false);
    expect(fourth.message).toBe('THIS ROOM ALREADY HAS 3 COMPANIONS. USE THE MAIN DEVICE OR HOTSEAT.');

    const replacement = submitCompanionClaim(current, { deviceId: 'new-ipad', gmName: 'Alex', roomCode: '4821' });
    expect(replacement.ok).toBe(true);
    expect(replacement.session?.snakeCompanions?.claims.find((claim) => claim.deviceId === 'one')?.status).toBe('revoked');
    expect(replacement.session?.snakeCompanions?.claims.find((claim) => claim.deviceId === 'new-ipad')?.status).toBe('pending');
  });

  it('writes only the approved seat board and refuses stale session or board revisions', () => {
    const pending = submitCompanionClaim(ensureCompanionRoom(session(), () => '4821'), {
      deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821',
    });
    const approved = approveCompanionClaim(pending.session!, 'ipad-a', 'approved');
    const stale = updateApprovedCompanionBoard({
      session: approved, deviceId: 'ipad-a', expectedSessionRevision: (approved.revision ?? 0) - 1,
      expectedBoardRevision: 1, board: board(2),
    });
    expect(stale).toMatchObject({ ok: false, message: 'THE DRAFT MOVED ON — REFRESH' });

    const saved = updateApprovedCompanionBoard({
      session: approved, deviceId: 'ipad-a', expectedSessionRevision: approved.revision ?? 0,
      expectedBoardRevision: 1, board: board(2),
    });
    expect(saved.ok).toBe(true);
    expect(saved.session?.seatBoards?.['team-a'].revision).toBe(2);
    expect(saved.session?.seatBoards?.['team-b'].rankings.global).toEqual(['player-b']);
  });
});
