import type {
  LeagueBuilderMlbDraftSession,
  SnakeCompanionState,
} from './leagueBuilderStorage';
import type {
  SnakeLiveClaim,
  SnakeLiveIntent,
  SnakeLiveJsonObject,
  SnakeLiveJsonValue,
  SnakeLiveRoom,
} from './snakeLiveRoomTypes';

export const SNAKE_LIVE_PUBLIC_STATE_FORMAT = 'snake-live-public-state-v1' as const;
export const SNAKE_LIVE_RUN_KEY_FORMAT = 'snake-live-run-v1' as const;

/**
 * The local session id is deterministic and Run It Back can reuse it. The
 * created date identifies one persisted draft run and stays fixed for every
 * reconnect to that run.
 */
export function snakeLiveRoomRunKey(
  session: Pick<LeagueBuilderMlbDraftSession, 'id' | 'createdDate'>,
): string {
  if (!session.id.trim() || !session.createdDate.trim()) {
    throw new Error('THE LIVE ROOM RUN ID IS INVALID.');
  }
  return `${SNAKE_LIVE_RUN_KEY_FORMAT}:${session.id}:${session.createdDate}`;
}

function jsonValue(value: unknown): SnakeLiveJsonValue {
  return JSON.parse(JSON.stringify(value)) as SnakeLiveJsonValue;
}

function jsonObject(value: unknown): SnakeLiveJsonObject {
  const parsed = jsonValue(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('THE LIVE ROOM DATA IS INVALID.');
  }
  return parsed;
}

/**
 * Build the public room payload. Private boards, private logs, open offers,
 * proof assignments, recovery snapshots, and companion controls have their
 * own authority paths and must never be sent in the public room row.
 */
export function buildSnakeLivePublicState(
  session: LeagueBuilderMlbDraftSession,
): SnakeLiveJsonObject {
  const publicSession = { ...session };
  delete publicSession.seatBoards;
  delete publicSession.farmSeatBoards;
  delete publicSession.roomLogByTeamId;
  delete publicSession.openTradeOffers;
  delete publicSession.snakeCompanions;
  delete publicSession.companionRoomPublication;
  delete publicSession.correctionSnapshots;
  delete publicSession.farmProspectSnapshot;
  const snakeSetup = publicSession.snakeSetup;
  delete publicSession.snakeSetup;
  const publicSetup = snakeSetup ? {
    ...snakeSetup,
    seatingCertificate: undefined,
  } : undefined;
  return jsonObject({
    formatVersion: SNAKE_LIVE_PUBLIC_STATE_FORMAT,
    session: {
      ...publicSession,
      ...(publicSetup ? { snakeSetup: publicSetup } : {}),
    },
  });
}

export function readSnakeLivePublicSession(
  room: Pick<SnakeLiveRoom, 'id' | 'sessionId' | 'phase' | 'publicState'>,
): LeagueBuilderMlbDraftSession {
  const formatVersion = room.publicState.formatVersion;
  const raw = room.publicState.session;
  if (formatVersion !== SNAKE_LIVE_PUBLIC_STATE_FORMAT
    || !raw
    || Array.isArray(raw)
    || typeof raw !== 'object') {
    throw new Error('THE LIVE ROOM DATA IS INVALID.');
  }
  const session = raw as unknown as LeagueBuilderMlbDraftSession;
  if (snakeLiveRoomRunKey(session) !== room.sessionId && session.id !== room.sessionId) {
    throw new Error('THE LIVE ROOM DOES NOT MATCH THIS DRAFT.');
  }
  if ((session.draftPhase ?? 'MLB') !== room.phase) {
    throw new Error('THE LIVE ROOM PHASE DOES NOT MATCH THIS DRAFT.');
  }
  if (session.seatBoards || session.farmSeatBoards || session.roomLogByTeamId
    || session.openTradeOffers || session.correctionSnapshots || session.farmProspectSnapshot
    || session.snakeSetup?.seatingCertificate) {
    throw new Error('THE PUBLIC LIVE ROOM CONTAINS PRIVATE DRAFT DATA.');
  }
  return session;
}

function readString(payload: SnakeLiveJsonObject, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function readPositiveInteger(payload: SnakeLiveJsonObject, key: string): number | null {
  const value = payload[key];
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function readNonNegativeInteger(payload: SnakeLiveJsonObject, key: string): number | null {
  const value = payload[key];
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

export function legacySnakeCompanionState(input: {
  roomCode: string;
  claims: readonly SnakeLiveClaim[];
  intents: readonly SnakeLiveIntent[];
}): SnakeCompanionState {
  const pendingPick = [...input.intents]
    .filter((intent) => intent.kind === 'pick' && intent.status === 'pending')
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
  const playerId = pendingPick ? readString(pendingPick.payload, 'playerId') : null;
  const pick = pendingPick ? readPositiveInteger(pendingPick.payload, 'pick') : null;
  const submittedAt = pendingPick ? readString(pendingPick.payload, 'submittedAt') : null;
  const sessionRevision = pendingPick
    ? readNonNegativeInteger(pendingPick.payload, 'sessionRevision')
    : null;
  return {
    roomCode: input.roomCode,
    claims: input.claims.map((claim) => ({
      claimId: claim.id,
      claimVersion: claim.revision,
      deviceId: claim.deviceId,
      gmName: claim.gmName,
      teamId: claim.teamId,
      status: claim.status,
    })),
    ...(pendingPick && playerId && pick && sessionRevision !== null ? {
      pickRequest: {
        id: pendingPick.id,
        teamId: pendingPick.teamId,
        playerId,
        pick,
        submittedAt: submittedAt ?? pendingPick.createdAt,
        deviceId: pendingPick.deviceId,
        sessionRevision,
      },
    } : {}),
  };
}
