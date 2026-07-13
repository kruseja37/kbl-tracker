import type {
  LeagueBuilderMlbDraftSession,
  SnakeSeatBoardRecord,
} from '../../../../../utils/leagueBuilderStorage';

export const COMPANION_ROOM_FULL_COPY = 'THIS ROOM ALREADY HAS 3 COMPANIONS. USE THE MAIN DEVICE OR HOTSEAT.';
export const COMPANION_STALE_COPY = 'THE DRAFT MOVED ON — REFRESH';
export const COMPANION_DRAFT_COMPLETE_COPY = 'THIS DRAFT IS COMPLETE.';

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
  return Boolean(session.draftManifest)
    || (session.pickOrder.length > 0 && session.currentPickIndex >= session.pickOrder.length);
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
  const names = (session.snakeSetup?.clubs ?? [])
    .filter(isCompanionClub)
    .map((club) => club.gmName?.trim().toLocaleLowerCase() ?? '')
    .filter(Boolean);
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts.values()].some((count) => count === 1);
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

export function claimForDevice(
  session: LeagueBuilderMlbDraftSession,
  deviceId: string,
): CompanionClaim | null {
  return session.snakeCompanions?.claims.find((claim) => (
    claim.deviceId === deviceId && claim.status !== 'revoked'
  )) ?? null;
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
    const leftClaim = claimForDevice(left, input.deviceId)!;
    const rightClaim = claimForDevice(right, input.deviceId)!;
    const approvalOrder = Number(rightClaim.status === 'approved') - Number(leftClaim.status === 'approved');
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
  if (matchingClubs.length > 1) {
    return { ok: false, message: 'THAT GM NAME DOES NOT IDENTIFY ONE COMPANION SEAT.', session: null };
  }
  const club = matchingClubs[0];

  const claims = session.snakeCompanions?.claims ?? [];
  const otherActiveDevices = new Set(claims.filter((claim) => (
    claim.status !== 'revoked' && claim.deviceId !== input.deviceId
  )).map((claim) => claim.deviceId));
  const replacingSeatDevice = claims.some((claim) => (
    claim.status !== 'revoked' && claim.teamId === club.teamId && claim.deviceId !== input.deviceId
  ));
  if (otherActiveDevices.size >= 3 && !replacingSeatDevice) {
    return { ok: false, message: COMPANION_ROOM_FULL_COPY, session: null };
  }

  const nextClaims: CompanionClaim[] = claims
    .filter((claim) => claim.deviceId !== input.deviceId)
    .map((claim) => claim.teamId === club.teamId && claim.status !== 'revoked'
      ? { ...claim, status: 'revoked' as const, claimVersion: (claim.claimVersion ?? 0) + 1 }
      : claim);
  nextClaims.push({
    claimId: input.claimId
      ?? globalThis.crypto?.randomUUID?.()
      ?? `${input.deviceId}:${club.teamId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    claimVersion: 1,
    deviceId: input.deviceId,
    gmName: club.gmName?.trim() || input.gmName.trim(),
    teamId: club.teamId,
    status: 'pending',
  });
  return {
    ok: true,
    message: 'ASK THE MAIN DEVICE TO APPROVE THIS DESK.',
    session: {
      ...session,
      snakeCompanions: { roomCode: input.roomCode, claims: nextClaims },
      revision: (session.revision ?? 0) + 1,
    },
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
      || claims.some((claim, index) => index !== targetIndex && claim.status !== 'revoked' && (
        claim.teamId === target.teamId || claim.deviceId === target.deviceId
      ))) {
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
  expectedSessionRevision: number;
  expectedBoardRevision: number;
  board: SnakeSeatBoardRecord;
}): CompanionResult {
  const claim = approvedClaimForDevice(input.session, input.deviceId);
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
