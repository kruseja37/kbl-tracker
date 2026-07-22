/**
 * Transport-only JSON types for the dedicated Snake live-room service.
 * Baseball rules remain in the client engines. The service only protects
 * authority, revisions, idempotency, and private/public data boundaries.
 */
export type SnakeLiveJsonPrimitive = string | number | boolean | null;

export type SnakeLiveJsonValue =
  | SnakeLiveJsonPrimitive
  | SnakeLiveJsonValue[]
  | { [key: string]: SnakeLiveJsonValue };

export type SnakeLiveJsonObject = { [key: string]: SnakeLiveJsonValue };

export type SnakeLiveRoomPhase = 'MLB' | 'FARM';
export type SnakeLiveRoomStatus = 'open' | 'complete' | 'closed';
export type SnakeLiveClaimStatus = 'pending' | 'approved' | 'revoked';
export type SnakeLiveIntentStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type SnakeLiveIntentKind = 'pick' | 'trade';

export interface SnakeLiveRoom {
  id: string;
  ownerUserId: string;
  sessionId: string;
  roomCode: string;
  phase: SnakeLiveRoomPhase;
  status: SnakeLiveRoomStatus;
  publicRevision: number;
  publicState: SnakeLiveJsonObject;
  correctionAvailable: boolean;
  hostDeviceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnakeLiveClaim {
  id: string;
  roomId: string;
  requestKey: string;
  deviceId: string;
  gmName: string;
  teamId: string;
  status: SnakeLiveClaimStatus;
  revision: number;
  createdAt: string;
  resolvedAt: string | null;
}

export interface SnakeLiveSeatBoard {
  roomId: string;
  teamId: string;
  boardRevision: number;
  board: SnakeLiveJsonObject;
  updatedByDeviceId: string;
  updatedAt: string;
}

export interface SnakeLiveIntent {
  id: string;
  roomId: string;
  idempotencyKey: string;
  deviceId: string;
  teamId: string;
  kind: SnakeLiveIntentKind;
  status: SnakeLiveIntentStatus;
  intentRevision: number;
  expectedRoomRevision: number;
  payload: SnakeLiveJsonObject;
  createdAt: string;
  resolvedAt: string | null;
}

export interface SnakeLivePublicEvent {
  id: number;
  roomId: string;
  roomRevision: number;
  kind: string;
  publicPayload: SnakeLiveJsonObject;
  createdAt: string;
}

/**
 * Immutable public data that a companion needs to render a live draft.
 * The host creates revision 1 once. Picks and trades do not rewrite it.
 */
export interface SnakeLiveCatalog {
  roomId: string;
  catalogRevision: number;
  catalog: SnakeLiveJsonObject;
  createdAt: string;
}

export interface SnakeLiveHostCapability {
  room: SnakeLiveRoom;
  hostToken: string;
}

export interface SnakeLiveDeviceCapability {
  roomId: string;
  deviceId: string;
  deviceToken: string;
}

export interface SnakeLiveSubscription {
  unsubscribe(): Promise<void>;
}

export interface SnakeLiveSubscriptionHandlers {
  onEvent(event: SnakeLivePublicEvent): void;
  onStatus?(status: string): void;
  onError?(error: Error): void;
}

export type SnakeLiveTransportErrorCode =
  | 'not-configured'
  | 'not-authenticated'
  | 'not-found'
  | 'stale-revision'
  | 'forbidden'
  | 'conflict'
  | 'invalid-response'
  | 'service-error';

export class SnakeLiveTransportError extends Error {
  readonly code: SnakeLiveTransportErrorCode;
  readonly causeValue: unknown;

  constructor(code: SnakeLiveTransportErrorCode, message: string, causeValue?: unknown) {
    super(message);
    this.name = 'SnakeLiveTransportError';
    this.code = code;
    this.causeValue = causeValue;
  }
}

export interface CreateSnakeLiveRoomInput {
  sessionId: string;
  roomCode: string;
  phase: SnakeLiveRoomPhase;
  hostDeviceId: string;
  hostToken: string;
  publicState: SnakeLiveJsonObject;
}

export interface SnakeLiveHostAccess {
  roomId: string;
  hostDeviceId: string;
  hostToken: string;
}

/**
 * Explicit account-owner recovery after the Hotseat browser loses its local
 * capability. The server rotates host authority and repairs only a missing or
 * invalid public catalog.
 */
export interface RecoverSnakeLiveHostInput extends SnakeLiveHostAccess {
  roomCode: string;
  expectedRoomRevision: number;
  catalog: SnakeLiveJsonObject;
}

export interface SnakeLiveDeviceAccess {
  roomId: string;
  deviceId: string;
  deviceToken: string;
}

export interface SnakeLiveTeamAccess extends SnakeLiveDeviceAccess {
  teamId: string;
}

export interface SubmitSnakeLiveClaimInput extends SnakeLiveDeviceAccess {
  requestKey: string;
  gmName: string;
  teamId: string;
}

export interface ResolveSnakeLiveClaimInput extends SnakeLiveHostAccess {
  claimId: string;
  expectedClaimRevision: number;
  idempotencyKey: string;
  status: Extract<SnakeLiveClaimStatus, 'approved' | 'revoked'>;
}

export interface WriteSnakeLiveBoardInput extends SnakeLiveTeamAccess {
  expectedBoardRevision: number;
  idempotencyKey: string;
  board: SnakeLiveJsonObject;
}

export interface SeedSnakeLiveBoardAsHostInput extends SnakeLiveHostAccess {
  teamId: string;
  idempotencyKey: string;
  board: SnakeLiveJsonObject;
}

export interface SnakeLiveBoardSeedReceipt {
  roomId: string;
  teamId: string;
  boardRevision: number;
  seeded: boolean;
}

export interface SubmitSnakeLiveIntentInput extends SnakeLiveTeamAccess {
  idempotencyKey: string;
  kind: SnakeLiveIntentKind;
  expectedRoomRevision: number;
  payload: SnakeLiveJsonObject;
}

export interface SubmitSnakeLiveHostTradeIntentInput extends SnakeLiveHostAccess {
  teamId: string;
  idempotencyKey: string;
  kind: 'trade';
  expectedRoomRevision: number;
  payload: SnakeLiveJsonObject;
}

export interface ResolveSnakeLiveIntentInput extends SnakeLiveHostAccess {
  intentId: string;
  expectedIntentRevision: number;
  idempotencyKey: string;
  status: Extract<SnakeLiveIntentStatus, 'accepted' | 'rejected'>;
}

export interface PublishSnakeLiveRoomInput extends SnakeLiveHostAccess {
  expectedRoomRevision: number;
  idempotencyKey: string;
  publicState: SnakeLiveJsonObject;
  eventKind: string;
  publicEvent: SnakeLiveJsonObject;
  status?: SnakeLiveRoomStatus;
}

/**
 * Host-only, one-action recovery for the last completed pick or trade.
 * The prior public state stays on the server and never crosses this API.
 */
export interface RestoreSnakeLivePublicStateInput extends SnakeLiveHostAccess {
  expectedRoomRevision: number;
  idempotencyKey: string;
}

export interface SnakeLiveRoomTransport {
  createRoom(input: CreateSnakeLiveRoomInput): Promise<SnakeLiveRoom>;
  recoverHost(input: RecoverSnakeLiveHostInput): Promise<SnakeLiveRoom>;
  findRoomBySession(sessionId: string): Promise<SnakeLiveRoom | null>;
  findRoomByCode(roomCode: string): Promise<SnakeLiveRoom | null>;
  getRoom(roomId: string): Promise<SnakeLiveRoom | null>;
  seedCatalog(input: SnakeLiveHostAccess & { catalog: SnakeLiveJsonObject }): Promise<SnakeLiveCatalog>;
  getCatalog(roomId: string): Promise<SnakeLiveCatalog | null>;
  listEvents(roomId: string, afterEventId?: number): Promise<SnakeLivePublicEvent[]>;
  submitClaim(input: SubmitSnakeLiveClaimInput): Promise<SnakeLiveClaim>;
  listClaims(access: SnakeLiveHostAccess): Promise<SnakeLiveClaim[]>;
  listDeviceClaims(access: SnakeLiveDeviceAccess): Promise<SnakeLiveClaim[]>;
  resolveClaim(input: ResolveSnakeLiveClaimInput): Promise<SnakeLiveClaim>;
  getBoard(access: SnakeLiveTeamAccess): Promise<SnakeLiveSeatBoard | null>;
  writeBoard(input: WriteSnakeLiveBoardInput): Promise<SnakeLiveSeatBoard>;
  seedBoardAsHost(input: SeedSnakeLiveBoardAsHostInput): Promise<SnakeLiveBoardSeedReceipt>;
  submitIntent(input: SubmitSnakeLiveIntentInput): Promise<SnakeLiveIntent>;
  submitIntentAsHost(input: SubmitSnakeLiveHostTradeIntentInput): Promise<SnakeLiveIntent>;
  listIntents(access: SnakeLiveHostAccess): Promise<SnakeLiveIntent[]>;
  listDeviceIntents(access: SnakeLiveDeviceAccess): Promise<SnakeLiveIntent[]>;
  resolveIntent(input: ResolveSnakeLiveIntentInput): Promise<SnakeLiveIntent>;
  publishRoom(input: PublishSnakeLiveRoomInput): Promise<SnakeLiveRoom>;
  restorePreviousPublicState(input: RestoreSnakeLivePublicStateInput): Promise<SnakeLiveRoom>;
  closeRoom(access: SnakeLiveHostAccess, expectedRoomRevision: number, idempotencyKey: string): Promise<SnakeLiveRoom>;
  subscribe(roomId: string, handlers: SnakeLiveSubscriptionHandlers): SnakeLiveSubscription;
}
