import { describe, expect, it } from 'vitest';

import type { LeagueBuilderMlbDraftSession, SnakeSeatBoardRecord } from '../../../../../../utils/leagueBuilderStorage';
import {
  approveCompanionClaim,
  approvedClaimsForDevice,
  COMPANION_ROOM_FULL_COPY,
  companionClaimIdentity,
  isCompanionDraftComplete,
  isCompanionRoomOpen,
  selectCompanionRecoverySession,
  ensureCompanionRoom,
  submitCompanionClaim,
  updateApprovedCompanionBoard,
} from '../companionModel';

function transition(
  value: LeagueBuilderMlbDraftSession,
  deviceId: string,
  status: 'approved' | 'revoked',
): LeagueBuilderMlbDraftSession {
  const claim = value.snakeCompanions?.claims.find((row) => row.deviceId === deviceId && row.status !== 'revoked');
  if (!claim) throw new Error(`Missing active claim for ${deviceId}.`);
  return approveCompanionClaim(value, companionClaimIdentity(claim), status);
}

function transitionTeam(
  value: LeagueBuilderMlbDraftSession,
  deviceId: string,
  teamId: string,
  status: 'approved' | 'revoked',
): LeagueBuilderMlbDraftSession {
  const claim = value.snakeCompanions?.claims.find((row) => (
    row.deviceId === deviceId && row.teamId === teamId && row.status !== 'revoked'
  ));
  if (!claim) throw new Error(`Missing active claim for ${deviceId}:${teamId}.`);
  return approveCompanionClaim(value, companionClaimIdentity(claim), status);
}

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

    const approved = transition(pending.session!, 'ipad-a', 'approved');
    expect(approved.snakeCompanions?.claims[0]?.status).toBe('approved');
    const revoked = transition(approved, 'ipad-a', 'revoked');
    const write = updateApprovedCompanionBoard({
      session: revoked, deviceId: 'ipad-a', teamId: 'team-a', expectedSessionRevision: 4,
      expectedBoardRevision: 1, board: board(2),
    });
    expect(write.ok).toBe(false);
    expect(write.message).toMatch(/APPROVAL/i);
  });

  it('claims, approves, resubmits, and revokes a two-team package without losing its sibling', () => {
    const packageSession = {
      ...session(),
      snakeSetup: {
        ...session().snakeSetup!,
        clubs: session().snakeSetup!.clubs.map((club) => (
          club.teamId === 'team-b' ? { ...club, gmName: ' alex ' } : club
        )),
      },
    };
    const opened = ensureCompanionRoom(packageSession, () => '4821');
    const requested = submitCompanionClaim(opened, {
      deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821', claimId: 'package-1',
    });
    expect(requested.ok).toBe(true);
    expect(requested.session?.snakeCompanions?.claims).toEqual(expect.arrayContaining([
      expect.objectContaining({ claimId: 'package-1:team-a', teamId: 'team-a', status: 'pending' }),
      expect.objectContaining({ claimId: 'package-1:team-b', teamId: 'team-b', status: 'pending' }),
    ]));

    const oneApproved = transitionTeam(requested.session!, 'ipad-a', 'team-a', 'approved');
    const resubmitted = submitCompanionClaim(oneApproved, {
      deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821', claimId: 'package-2',
    });
    expect(resubmitted.session?.snakeCompanions?.claims.filter((claim) => claim.status !== 'revoked')).toHaveLength(2);
    expect(resubmitted.session?.snakeCompanions?.claims.find((claim) => claim.teamId === 'team-a')?.status).toBe('approved');
    expect(resubmitted.session?.snakeCompanions?.claims.filter((claim) => claim.teamId === 'team-b').map((claim) => claim.status)).toEqual(['revoked', 'pending']);

    const bothApproved = transitionTeam(resubmitted.session!, 'ipad-a', 'team-b', 'approved');
    expect(approvedClaimsForDevice(bothApproved, 'ipad-a').map((claim) => claim.teamId).sort()).toEqual(['team-a', 'team-b']);
    const oneRevoked = transitionTeam(bothApproved, 'ipad-a', 'team-a', 'revoked');
    expect(approvedClaimsForDevice(oneRevoked, 'ipad-a').map((claim) => claim.teamId)).toEqual(['team-b']);
  });

  it('refuses a fourth active device with plain copy and a new approved claim replaces the old device for that seat', () => {
    let current = ensureCompanionRoom(session(), () => '4821');
    for (const [deviceId, gmName] of [['one', 'Alex'], ['two', 'Blair']] as const) {
      const result = submitCompanionClaim(current, { deviceId, gmName, roomCode: '4821' });
      current = transition(result.session!, deviceId, 'approved');
    }
    const third = submitCompanionClaim(current, { deviceId: 'three', gmName: 'Casey', roomCode: '4821' });
    current = transition(third.session!, 'three', 'approved');
    const fourth = submitCompanionClaim(current, { deviceId: 'four', gmName: 'Dana', roomCode: '4821' });
    expect(fourth.ok).toBe(false);
    expect(fourth.message).toBe('THIS ROOM ALREADY HAS 3 COMPANIONS. USE THE MAIN DEVICE OR HOTSEAT.');

    const staleAlexIdentity = companionClaimIdentity(current.snakeCompanions!.claims.find((claim) => claim.deviceId === 'one')!);
    const replacement = submitCompanionClaim(current, { deviceId: 'new-ipad', gmName: 'Alex', roomCode: '4821', claimId: 'alex-replacement' });
    expect(replacement.ok).toBe(true);
    expect(replacement.session?.snakeCompanions?.claims.find((claim) => claim.deviceId === 'one')?.status).toBe('revoked');
    expect(replacement.session?.snakeCompanions?.claims.find((claim) => claim.deviceId === 'new-ipad')?.status).toBe('pending');
    expect(() => approveCompanionClaim(replacement.session!, staleAlexIdentity, 'approved')).toThrow(/STALE/);

    const approvedReplacement = transition(replacement.session!, 'new-ipad', 'approved');
    const active = approvedReplacement.snakeCompanions!.claims.filter((claim) => claim.status !== 'revoked');
    expect(new Set(active.map((claim) => claim.deviceId)).size).toBe(3);
    expect(active.filter((claim) => claim.teamId === 'team-a')).toHaveLength(1);
    expect(active.find((claim) => claim.teamId === 'team-a')).toMatchObject({
      claimId: 'alex-replacement',
      status: 'approved',
    });
  });

  it('allows a ceiling takeover only when the replaced package frees a distinct device slot', () => {
    let current = ensureCompanionRoom(session(), () => '4821');
    for (const [deviceId, gmName] of [['one', 'Alex'], ['one', 'Dana'], ['two', 'Blair'], ['three', 'Casey']] as const) {
      const result = submitCompanionClaim(current, { deviceId, gmName, roomCode: '4821' });
      expect(result.ok).toBe(true);
      current = transitionTeam(result.session!, deviceId, result.session!.snakeSetup!.clubs.find((club) => (
        club.gmName === gmName
      ))!.teamId, 'approved');
    }
    expect(new Set(current.snakeCompanions!.claims.filter((claim) => claim.status !== 'revoked').map((claim) => claim.deviceId)).size).toBe(3);

    const blocked = submitCompanionClaim(current, { deviceId: 'new', gmName: 'Alex', roomCode: '4821' });
    expect(blocked).toMatchObject({ ok: false, message: COMPANION_ROOM_FULL_COPY });
    expect(current.snakeCompanions!.claims.find((claim) => claim.deviceId === 'one' && claim.teamId === 'team-a')?.status).toBe('approved');

    current = transitionTeam(current, 'one', 'team-d', 'revoked');
    const allowed = submitCompanionClaim(current, { deviceId: 'new', gmName: 'Alex', roomCode: '4821' });
    expect(allowed.ok).toBe(true);
    expect(allowed.session?.snakeCompanions?.claims.find((claim) => claim.deviceId === 'one' && claim.teamId === 'team-a')?.status).toBe('revoked');
    expect(allowed.session?.snakeCompanions?.claims.find((claim) => claim.deviceId === 'new' && claim.teamId === 'team-a')?.status).toBe('pending');
  });

  it('writes only the approved seat board and refuses stale session or board revisions', () => {
    const pending = submitCompanionClaim(ensureCompanionRoom(session(), () => '4821'), {
      deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821',
    });
    const approved = transition(pending.session!, 'ipad-a', 'approved');
    const stale = updateApprovedCompanionBoard({
      session: approved, deviceId: 'ipad-a', teamId: 'team-a', expectedSessionRevision: (approved.revision ?? 0) - 1,
      expectedBoardRevision: 1, board: board(2),
    });
    expect(stale).toMatchObject({ ok: false, message: 'THE DRAFT MOVED ON — REFRESH' });

    const saved = updateApprovedCompanionBoard({
      session: approved, deviceId: 'ipad-a', teamId: 'team-a', expectedSessionRevision: approved.revision ?? 0,
      expectedBoardRevision: 1, board: board(2),
    });
    expect(saved.ok).toBe(true);
    expect(saved.session?.seatBoards?.['team-a'].revision).toBe(2);
    expect(saved.session?.seatBoards?.['team-b'].rankings.global).toEqual(['player-b']);
  });

  it('refuses approval when another active claim already occupies the same team', () => {
    const first = submitCompanionClaim(ensureCompanionRoom(session(), () => '4821'), {
      deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821', claimId: 'claim-a',
    }).session!;
    const conflicting = {
      ...first,
      snakeCompanions: {
        ...first.snakeCompanions!,
        claims: [
          ...first.snakeCompanions!.claims,
          { claimId: 'claim-b', claimVersion: 1, deviceId: 'ipad-b', gmName: 'Alex', teamId: 'team-a', status: 'pending' as const },
        ],
      },
    };
    expect(() => approveCompanionClaim(
      conflicting,
      companionClaimIdentity(conflicting.snakeCompanions.claims[0]),
      'approved',
    )).toThrow(/CONFLICTS WITH AN ACTIVE SEAT/);
    expect(conflicting.snakeCompanions.claims.every((claim) => claim.status === 'pending')).toBe(true);
  });

  it('rejects blank, hotseat, duplicate, and completed-room claims fail-closed', () => {
    const opened = ensureCompanionRoom(session(), () => '4821');
    expect(submitCompanionClaim(opened, { deviceId: '', gmName: 'Alex', roomCode: '4821' })).toMatchObject({ ok: false });

    const hotseat = {
      ...opened,
      snakeSetup: {
        ...opened.snakeSetup!,
        clubs: opened.snakeSetup!.clubs.map((club) => ({ ...club, hotseat: true })),
      },
    };
    expect(isCompanionRoomOpen(hotseat)).toBe(false);
    expect(submitCompanionClaim(hotseat, { deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821' })).toMatchObject({
      ok: false,
      message: 'THAT GM NAME IS NOT A COMPANION SEAT IN THIS ROOM.',
    });

    const duplicate = {
      ...opened,
      snakeSetup: {
        ...opened.snakeSetup!,
        clubs: opened.snakeSetup!.clubs.map((club) => club.teamId === 'team-b' ? { ...club, gmName: ' alex ' } : club),
      },
    };
    const packageClaim = submitCompanionClaim(duplicate, { deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821' });
    expect(packageClaim.ok).toBe(true);
    expect(packageClaim.session?.snakeCompanions?.claims.map((claim) => claim.teamId).sort()).toEqual(['team-a', 'team-b']);

    const picksComplete = { ...opened, currentPickIndex: opened.pickOrder.length };
    expect(isCompanionDraftComplete(picksComplete)).toBe(false);
    expect(isCompanionRoomOpen(picksComplete)).toBe(true);
    const complete = {
      ...picksComplete,
      rosterHandoff: {
        formatVersion: 'snake-roster-handoff-v1' as const,
        phase: 'MLB' as const,
        sourceSessionId: picksComplete.id,
        manifestPoolIdentity: 'pool',
        manifestIdentity: 'manifest',
        committedAt: '2026-07-12T15:00:00.000Z',
      },
    };
    expect(isCompanionDraftComplete(complete)).toBe(true);
    expect(isCompanionRoomOpen(complete)).toBe(false);
    expect(submitCompanionClaim(complete, { deviceId: 'ipad-a', gmName: 'Alex', roomCode: '4821' })).toMatchObject({
      ok: false,
      message: 'THIS DRAFT IS COMPLETE.',
    });
  });

  it('recovers approved before pending, live before completed, newest next, and honors forget', () => {
    const candidate = (
      id: string,
      status: 'pending' | 'approved',
      complete: boolean,
      lastModified: string,
    ): LeagueBuilderMlbDraftSession => ({
      ...ensureCompanionRoom(session(), () => '4821'),
      id,
      leagueId: id,
      currentPickIndex: complete ? 1 : 0,
      rosterHandoff: complete ? {
        formatVersion: 'snake-roster-handoff-v1',
        phase: 'MLB',
        sourceSessionId: id,
        manifestPoolIdentity: 'pool',
        manifestIdentity: 'manifest',
        committedAt: lastModified,
      } : undefined,
      lastModified,
      snakeCompanions: {
        roomCode: '4821',
        claims: [{ deviceId: 'ipad-a', gmName: 'Alex', teamId: 'team-a', status }],
      },
    });
    const pendingNewest = candidate('pending-new', 'pending', false, '2026-07-12T15:00:00.000Z');
    const approvedComplete = candidate('approved-complete', 'approved', true, '2026-07-12T14:00:00.000Z');
    const approvedLiveOld = candidate('approved-live-old', 'approved', false, '2026-07-12T12:00:00.000Z');
    const approvedLiveNew = candidate('approved-live-new', 'approved', false, '2026-07-12T13:00:00.000Z');

    expect(selectCompanionRecoverySession({
      sessions: [pendingNewest, approvedComplete, approvedLiveOld, approvedLiveNew],
      deviceId: 'ipad-a',
    })?.id).toBe('approved-live-new');
    expect(selectCompanionRecoverySession({
      sessions: [pendingNewest, approvedComplete, approvedLiveOld, approvedLiveNew],
      deviceId: 'ipad-a',
      forgottenSessionIds: new Set(['approved-live-new']),
    })?.id).toBe('approved-live-old');
  });
});
