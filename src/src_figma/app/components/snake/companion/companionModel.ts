import type {
  LeagueBuilderMlbDraftSession,
  SnakeSeatBoardRecord,
} from '../../../../../utils/leagueBuilderStorage';

export const COMPANION_ROOM_FULL_COPY = 'THIS ROOM ALREADY HAS 3 COMPANIONS. USE THE MAIN DEVICE OR HOTSEAT.';
export const COMPANION_STALE_COPY = 'THE DRAFT MOVED ON — REFRESH';

export type CompanionClaim = NonNullable<LeagueBuilderMlbDraftSession['snakeCompanions']>['claims'][number];

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

export function submitCompanionClaim(
  session: LeagueBuilderMlbDraftSession,
  input: { deviceId: string; gmName: string; roomCode: string },
): CompanionResult {
  if (!isRoomCode(input.roomCode) || input.roomCode !== session.snakeCompanions?.roomCode) {
    return { ok: false, message: 'THAT ROOM CODE DOES NOT MATCH.', session: null };
  }
  const club = session.snakeSetup?.clubs.find((entry) => (
    entry.gmName && normalized(entry.gmName) === normalized(input.gmName)
  ));
  if (!club) return { ok: false, message: 'THAT GM NAME IS NOT IN THIS ROOM.', session: null };

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
      ? { ...claim, status: 'revoked' as const }
      : claim);
  nextClaims.push({
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
  deviceId: string,
  status: 'approved' | 'revoked',
): LeagueBuilderMlbDraftSession {
  return {
    ...session,
    snakeCompanions: session.snakeCompanions && {
      ...session.snakeCompanions,
      claims: session.snakeCompanions.claims.map((claim) => (
        claim.deviceId === deviceId ? { ...claim, status } : claim
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
