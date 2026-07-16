import type {
  LeagueBuilderMlbDraftSession,
  SnakeSeatBoardRecord,
} from '../../../../../utils/leagueBuilderStorage';

export const COMPANION_ROOM_FULL_COPY = 'THIS ROOM ALREADY HAS 3 COMPANIONS. USE THE MAIN DEVICE OR HOTSEAT.';
export const COMPANION_STALE_COPY = 'THE DRAFT MOVED ON — REFRESH';
export const COMPANION_DRAFT_COMPLETE_COPY = 'THIS DRAFT IS COMPLETE.';
export const COMPANION_PICKS_COMPLETE_COPY = 'PICKS COMPLETE — WAITING FOR COMMISSIONER.';

export type CompanionClaim = NonNullable<LeagueBuilderMlbDraftSession['snakeCompanions']>['claims'][number];
export type CompanionClaimIdentity = Pick<CompanionClaim, 'deviceId' | 'teamId' | 'status'> & {
  claimId?: string;
  claimVersion: number;
  gmName: string;
};

export type CompanionResult = {
  ok: boolean;
  message: string;
  session: LeagueBuilderMlbDraftSession | null;
};

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function isRoomCode(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}$/.test(value));
}

export function isCompanionDraftComplete(session: LeagueBuilderMlbDraftSession): boolean {
  return Boolean(session.rosterHandoff);
}

export function isCompanionPicksComplete(session: LeagueBuilderMlbDraftSession): boolean {
  return session.pickOrder.length > 0 && session.currentPickIndex >= session.pickOrder.length;
}

export function isCompanionRoomOpen(session: LeagueBuilderMlbDraftSession | null | undefined): session is LeagueBuilderMlbDraftSession {
  return Boolean(session
    && isRoomCode(session.snakeCompanions?.roomCode)
    && hasClaimableCompanionSeat(session)
    && !isCompanionDraftComplete(session));
}

function isCompanionClub(club: NonNullable<LeagueBuilderMlbDraftSession['snakeSetup']>['clubs'][number]): boolean {
  const legacySeatMode = (club as typeof club & { seatMode?: string }).seatMode;
  return club.hotseat === false || legacySeatMode === 'companion';
}

function hasClaimableCompanionSeat(session: LeagueBuilderMlbDraftSession): boolean {
  return (session.snakeSetup?.clubs ?? []).some((club) => (
    isCompanionClub(club) && Boolean(club.gmName?.trim())
  ));
}

export function ensureCompanionRoom(
  session: LeagueBuilderMlbDraftSession,
  createCode: () => string = () => String(Math.floor(1000 + Math.random() * 9000)),
): LeagueBuilderMlbDraftSession {
  if (isRoomCode(session.snakeCompanions?.roomCode)) return session;
  const roomCode = createCode();
  if (!isRoomCode(roomCode)) throw new Error('Companion room codes must contain exactly four digits.');
  return {
    ...session,
    snakeCompanions: { roomCode, claims: session.snakeCompanions?.claims ?? [] },
    revision: (session.revision ?? 0) + 1,
  };
}

export function approvedClaimForDevice(
  session: LeagueBuilderMlbDraftSession,
  deviceId: string,
): CompanionClaim | null {
  return session.snakeCompanions?.claims.find((claim) => (
    claim.deviceId === deviceId && claim.status === 'approved'
  )) ?? null;
}

export function approvedClaimsForDevice(
  session: LeagueBuilderMlbDraftSession,
  deviceId: string,
): CompanionClaim[] {
  return (session.snakeCompanions?.claims ?? []).filter((claim) => (
    claim.deviceId === deviceId && claim.status === 'approved'
  ));
}

export function approvedClaimForDeviceTeam(
  session: LeagueBuilderMlbDraftSession,
  deviceId: string,
  teamId: string,
): CompanionClaim | null {
  return session.snakeCompanions?.claims.find((claim) => (
    claim.deviceId === deviceId && claim.teamId === teamId && claim.status === 'approved'
  )) ?? null;
}

export function claimForDevice(
  session: LeagueBuilderMlbDraftSession,
  deviceId: string,
): CompanionClaim | null {
  return session.snakeCompanions?.claims.find((claim) => (
    claim.deviceId === deviceId && claim.status !== 'revoked'
  )) ?? null;
}

export function claimsForDevice(
  session: LeagueBuilderMlbDraftSession,
  deviceId: string,
): CompanionClaim[] {
  return (session.snakeCompanions?.claims ?? []).filter((claim) => (
    claim.deviceId === deviceId && claim.status !== 'revoked'
  ));
}

export function companionClaimIdentity(claim: CompanionClaim): CompanionClaimIdentity {
  return {
    ...(claim.claimId ? { claimId: claim.claimId } : {}),
    claimVersion: claim.claimVersion ?? 0,
    deviceId: claim.deviceId,
    teamId: claim.teamId,
    gmName: claim.gmName,
    status: claim.status,
  };
}

export function selectCompanionRecoverySession(input: {
  sessions: readonly LeagueBuilderMlbDraftSession[];
  deviceId: string;
  forgottenSessionIds?: ReadonlySet<string>;
}): LeagueBuilderMlbDraftSession | null {
  const forgotten = input.forgottenSessionIds ?? new Set<string>();
  const recoverable = input.sessions.filter((session) => (
    !forgotten.has(session.id) && Boolean(claimForDevice(session, input.deviceId))
  ));
  recoverable.sort((left, right) => {
    const leftApproved = approvedClaimsForDevice(left, input.deviceId).length > 0;
    const rightApproved = approvedClaimsForDevice(right, input.deviceId).length > 0;
    const approvalOrder = Number(rightApproved) - Number(leftApproved);
    if (approvalOrder !== 0) return approvalOrder;
    const liveOrder = Number(isCompanionDraftComplete(left)) - Number(isCompanionDraftComplete(right));
    if (liveOrder !== 0) return liveOrder;
    const leftTime = Date.parse(left.lastModified || left.createdDate) || 0;
    const rightTime = Date.parse(right.lastModified || right.createdDate) || 0;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return left.id.localeCompare(right.id);
  });
  return recoverable[0] ?? null;
}

export function submitCompanionClaim(
  session: LeagueBuilderMlbDraftSession,
  input: { deviceId: string; gmName: string; roomCode: string; claimId?: string },
): CompanionResult {
  if (isCompanionDraftComplete(session)) {
    return { ok: false, message: COMPANION_DRAFT_COMPLETE_COPY, session: null };
  }
  if (!input.deviceId.trim() || !input.gmName.trim()) {
    return { ok: false, message: 'ENTER THE GM NAME FOR A COMPANION SEAT.', session: null };
  }
  if (!isRoomCode(input.roomCode) || input.roomCode !== session.snakeCompanions?.roomCode) {
    return { ok: false, message: 'THAT ROOM CODE DOES NOT MATCH.', session: null };
  }
  const matchingClubs = session.snakeSetup?.clubs.filter((entry) => (
    isCompanionClub(entry)
    && entry.gmName
    && normalized(entry.gmName) === normalized(input.gmName)
  )) ?? [];
  if (matchingClubs.length === 0) {
    return { ok: false, message: 'THAT GM NAME IS NOT A COMPANION SEAT IN THIS ROOM.', session: null };
  }
  const claims = session.snakeCompanions?.claims ?? [];
  const packageTeamIds = new Set(matchingClubs.map((club) => club.teamId));
  const claimsAfterTakeover = claims.map((claim) => (
    packageTeamIds.has(claim.teamId)
    && claim.deviceId !== input.deviceId
    && claim.status !== 'revoked'
      ? { ...claim, status: 'revoked' as const, claimVersion: (claim.claimVersion ?? 0) + 1 }
      : claim
  ));
  const claimsAfterPendingRefresh = claimsAfterTakeover.map((claim) => (
    packageTeamIds.has(claim.teamId)
    && claim.deviceId === input.deviceId
    && claim.status === 'pending'
      ? { ...claim, status: 'revoked' as const, claimVersion: (claim.claimVersion ?? 0) + 1 }
      : claim
  ));
  const needsClaim = matchingClubs.filter((club) => !claimsAfterPendingRefresh.some((claim) => (
    claim.deviceId === input.deviceId && claim.teamId === club.teamId && claim.status === 'approved'
  )));
  const projectedDeviceIds = new Set(claimsAfterPendingRefresh.filter((claim) => claim.status !== 'revoked').map((claim) => claim.deviceId));
  if (needsClaim.length > 0) projectedDeviceIds.add(input.deviceId);
  if (projectedDeviceIds.size > 3) {
    return { ok: false, message: COMPANION_ROOM_FULL_COPY, session: null };
  }
  const nextClaims: CompanionClaim[] = [...claimsAfterPendingRefresh];
  for (const [index, club] of needsClaim.entries()) {
    nextClaims.push({
      claimId: input.claimId
        ? (matchingClubs.length === 1 ? input.claimId : `${input.claimId}:${club.teamId}`)
        : globalThis.crypto?.randomUUID?.()
          ?? `${input.deviceId}:${club.teamId}:${Date.now()}:${index}:${Math.random().toString(36).slice(2)}`,
      claimVersion: 1,
      deviceId: input.deviceId,
      gmName: club.gmName?.trim() || input.gmName.trim(),
      teamId: club.teamId,
      status: 'pending',
    });
  }
  const changed = JSON.stringify(nextClaims) !== JSON.stringify(claims);
  return {
    ok: true,
    message: needsClaim.length > 0 ? 'ASK THE MAIN DEVICE TO APPROVE YOUR DESKS.' : 'YOUR DESK REQUEST IS ALREADY ACTIVE.',
    session: changed ? {
      ...session,
      snakeCompanions: { ...session.snakeCompanions!, roomCode: input.roomCode, claims: nextClaims },
      revision: (session.revision ?? 0) + 1,
    } : session,
  };
}

export function approveCompanionClaim(
  session: LeagueBuilderMlbDraftSession,
  identity: CompanionClaimIdentity,
  status: 'approved' | 'revoked',
): LeagueBuilderMlbDraftSession {
  const claims = session.snakeCompanions?.claims ?? [];
  const matchesIdentity = (claim: CompanionClaim): boolean => {
    if (identity.claimId) return claim.claimId === identity.claimId;
    return !claim.claimId
      && claim.deviceId === identity.deviceId
      && claim.teamId === identity.teamId
      && normalized(claim.gmName) === normalized(identity.gmName);
  };
  const matchingIndexes = claims.flatMap((claim, index) => (
    matchesIdentity(claim)
      && (claim.claimVersion ?? 0) === identity.claimVersion
      && claim.status === identity.status
        ? [index]
        : []
  ));
  if (matchingIndexes.length !== 1) {
    throw new Error('THAT COMPANION REQUEST IS STALE. REFRESH.');
  }
  const targetIndex = matchingIndexes[0];
  const target = claims[targetIndex];
  if (status === 'approved' && target.status !== 'pending') {
    throw new Error('THAT COMPANION REQUEST IS STALE. REFRESH.');
  }
  if (status === 'approved') {
    const active = claims.filter((claim) => claim.status !== 'revoked');
    if (new Set(active.map((claim) => claim.deviceId)).size > 3
      || claims.some((claim, index) => index !== targetIndex
        && claim.status !== 'revoked'
        && claim.teamId === target.teamId)) {
      throw new Error('THAT COMPANION REQUEST CONFLICTS WITH AN ACTIVE SEAT. REFRESH.');
    }
  }
  return {
    ...session,
    snakeCompanions: session.snakeCompanions && {
      ...session.snakeCompanions,
      claims: session.snakeCompanions.claims.map((claim, index) => (
        index === targetIndex
          ? { ...claim, status, claimVersion: (claim.claimVersion ?? 0) + 1 }
          : claim
      )),
    },
    revision: (session.revision ?? 0) + 1,
  };
}

export function updateApprovedCompanionBoard(input: {
  session: LeagueBuilderMlbDraftSession;
  deviceId: string;
  teamId: string;
  expectedSessionRevision: number;
  expectedBoardRevision: number;
  board: SnakeSeatBoardRecord;
}): CompanionResult {
  const claim = approvedClaimForDeviceTeam(input.session, input.deviceId, input.teamId);
  if (!claim) return { ok: false, message: 'MAIN-DEVICE APPROVAL IS REQUIRED.', session: null };
  const currentBoard = input.session.seatBoards?.[claim.teamId];
  if ((input.session.revision ?? 0) !== input.expectedSessionRevision
    || !currentBoard
    || currentBoard.revision !== input.expectedBoardRevision) {
    return { ok: false, message: COMPANION_STALE_COPY, session: null };
  }
  return {
    ok: true,
    message: 'SAVED.',
    session: {
      ...input.session,
      seatBoards: { ...input.session.seatBoards, [claim.teamId]: input.board },
      revision: (input.session.revision ?? 0) + 1,
    },
  };
}
