import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type {
  CreateSnakeLiveRoomInput,
  PublishSnakeLiveRoomInput,
  RecoverSnakeLiveHostInput,
  ResolveSnakeLiveClaimInput,
  ResolveSnakeLiveIntentInput,
  RestoreSnakeLivePublicStateInput,
  SeedSnakeLiveBoardAsHostInput,
  SnakeLiveBoardSeedReceipt,
  SnakeLiveClaim,
  SnakeLiveCatalog,
  SnakeLiveDeviceAccess,
  SnakeLiveHostAccess,
  SnakeLiveIntent,
  SnakeLiveJsonObject,
  SnakeLivePublicEvent,
  SnakeLiveRoom,
  SnakeLiveRoomTransport,
  SnakeLiveSeatBoard,
  SnakeLiveSubscription,
  SnakeLiveSubscriptionHandlers,
  SnakeLiveTeamAccess,
  SubmitSnakeLiveClaimInput,
  SubmitSnakeLiveHostTradeIntentInput,
  SubmitSnakeLiveIntentInput,
  WriteSnakeLiveBoardInput,
} from './snakeLiveRoomTypes';
import { SnakeLiveTransportError } from './snakeLiveRoomTypes';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isJsonObject(value: unknown): value is SnakeLiveJsonObject {
  return isRecord(value);
}

function requiredString(row: UnknownRecord, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw invalidResponse(`Missing string field ${key}.`, row);
  return value;
}

function optionalString(row: UnknownRecord, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw invalidResponse(`Invalid string field ${key}.`, row);
  return value;
}

function requiredNumber(row: UnknownRecord, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalidResponse(`Missing number field ${key}.`, row);
  }
  return value;
}

function requiredBoolean(row: UnknownRecord, key: string): boolean {
  const value = row[key];
  if (typeof value !== 'boolean') throw invalidResponse(`Missing boolean field ${key}.`, row);
  return value;
}

function invalidResponse(message: string, value: unknown): SnakeLiveTransportError {
  return new SnakeLiveTransportError('invalid-response', message, value);
}

function asRoom(value: unknown): SnakeLiveRoom {
  if (!isRecord(value)) throw invalidResponse('The live-room response is malformed.', value);
  const publicState = value.public_state;
  if (!isJsonObject(publicState)) throw invalidResponse('The live-room public state is malformed.', value);
  const phase = requiredString(value, 'phase');
  const status = requiredString(value, 'status');
  if (phase !== 'MLB' && phase !== 'FARM') throw invalidResponse('The live-room phase is malformed.', value);
  if (status !== 'open' && status !== 'complete' && status !== 'closed') {
    throw invalidResponse('The live-room status is malformed.', value);
  }
  return {
    id: requiredString(value, 'id'),
    ownerUserId: requiredString(value, 'owner_user_id'),
    sessionId: requiredString(value, 'session_id'),
    roomCode: requiredString(value, 'room_code'),
    phase,
    status,
    publicRevision: requiredNumber(value, 'public_revision'),
    publicState,
    correctionAvailable: requiredBoolean(value, 'correction_available'),
    hostDeviceId: requiredString(value, 'host_device_id'),
    createdAt: requiredString(value, 'created_at'),
    updatedAt: requiredString(value, 'updated_at'),
  };
}

function asClaim(value: unknown): SnakeLiveClaim {
  if (!isRecord(value)) throw invalidResponse('The live claim response is malformed.', value);
  const status = requiredString(value, 'status');
  if (status !== 'pending' && status !== 'approved' && status !== 'revoked') {
    throw invalidResponse('The live claim status is malformed.', value);
  }
  return {
    id: requiredString(value, 'id'),
    roomId: requiredString(value, 'room_id'),
    requestKey: requiredString(value, 'request_key'),
    deviceId: requiredString(value, 'device_id'),
    gmName: requiredString(value, 'gm_name'),
    teamId: requiredString(value, 'team_id'),
    status,
    revision: requiredNumber(value, 'revision'),
    createdAt: requiredString(value, 'created_at'),
    resolvedAt: optionalString(value, 'resolved_at'),
  };
}

function asBoard(value: unknown): SnakeLiveSeatBoard {
  if (!isRecord(value)) throw invalidResponse('The live board response is malformed.', value);
  if (!isJsonObject(value.board)) throw invalidResponse('The live board payload is malformed.', value);
  return {
    roomId: requiredString(value, 'room_id'),
    teamId: requiredString(value, 'team_id'),
    boardRevision: requiredNumber(value, 'board_revision'),
    board: value.board,
    updatedByDeviceId: requiredString(value, 'updated_by_device_id'),
    updatedAt: requiredString(value, 'updated_at'),
  };
}

function asCatalog(value: unknown): SnakeLiveCatalog {
  if (!isRecord(value)) throw invalidResponse('The live catalog response is malformed.', value);
  if (!isJsonObject(value.catalog)) throw invalidResponse('The live catalog payload is malformed.', value);
  return {
    roomId: requiredString(value, 'room_id'),
    catalogRevision: requiredNumber(value, 'catalog_revision'),
    catalog: value.catalog,
    createdAt: requiredString(value, 'created_at'),
  };
}

function asBoardSeedReceipt(value: unknown): SnakeLiveBoardSeedReceipt {
  if (!isRecord(value)) throw invalidResponse('The live board seed response is malformed.', value);
  return {
    roomId: requiredString(value, 'room_id'),
    teamId: requiredString(value, 'team_id'),
    boardRevision: requiredNumber(value, 'board_revision'),
    seeded: requiredBoolean(value, 'seeded'),
  };
}

function asIntent(value: unknown): SnakeLiveIntent {
  if (!isRecord(value)) throw invalidResponse('The live intent response is malformed.', value);
  const kind = requiredString(value, 'kind');
  const status = requiredString(value, 'status');
  if (kind !== 'pick' && kind !== 'trade') throw invalidResponse('The live intent kind is malformed.', value);
  if (status !== 'pending' && status !== 'accepted' && status !== 'rejected' && status !== 'cancelled') {
    throw invalidResponse('The live intent status is malformed.', value);
  }
  if (!isJsonObject(value.payload)) throw invalidResponse('The live intent payload is malformed.', value);
  return {
    id: requiredString(value, 'id'),
    roomId: requiredString(value, 'room_id'),
    idempotencyKey: requiredString(value, 'idempotency_key'),
    deviceId: requiredString(value, 'device_id'),
    teamId: requiredString(value, 'team_id'),
    kind,
    status,
    intentRevision: requiredNumber(value, 'intent_revision'),
    expectedRoomRevision: requiredNumber(value, 'expected_room_revision'),
    payload: value.payload,
    createdAt: requiredString(value, 'created_at'),
    resolvedAt: optionalString(value, 'resolved_at'),
  };
}

function asEvent(value: unknown): SnakeLivePublicEvent {
  if (!isRecord(value)) throw invalidResponse('The live event response is malformed.', value);
  if (!isJsonObject(value.public_payload)) throw invalidResponse('The live event payload is malformed.', value);
  return {
    id: requiredNumber(value, 'id'),
    roomId: requiredString(value, 'room_id'),
    roomRevision: requiredNumber(value, 'room_revision'),
    kind: requiredString(value, 'kind'),
    publicPayload: value.public_payload,
    createdAt: requiredString(value, 'created_at'),
  };
}

function asArray<T>(value: unknown, convert: (entry: unknown) => T, label: string): T[] {
  if (!Array.isArray(value)) throw invalidResponse(`${label} response is malformed.`, value);
  return value.map(convert);
}

function serviceError(error: unknown): SnakeLiveTransportError {
  if (error instanceof SnakeLiveTransportError) return error;
  const message = isRecord(error) && typeof error.message === 'string'
    ? error.message
    : error instanceof Error
      ? error.message
      : 'The Snake live-room service failed.';
  const normalized = message.toLocaleLowerCase();
  if (normalized.includes('not authenticated')) return new SnakeLiveTransportError('not-authenticated', message, error);
  if (normalized.includes('stale') || normalized.includes('expected revision')) {
    return new SnakeLiveTransportError('stale-revision', message, error);
  }
  if (normalized.includes('forbidden') || normalized.includes('token') || normalized.includes('not approved')) {
    return new SnakeLiveTransportError('forbidden', message, error);
  }
  if (normalized.includes('not found')) return new SnakeLiveTransportError('not-found', message, error);
  if (normalized.includes('conflict') || normalized.includes('idempotency')) {
    return new SnakeLiveTransportError('conflict', message, error);
  }
  return new SnakeLiveTransportError('service-error', message, error);
}

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) {
    throw new SnakeLiveTransportError(
      'not-configured',
      'The Snake live-room service is not configured on this device.',
    );
  }
  return client;
}

async function rpc(client: SupabaseClient | null, functionName: string, args: UnknownRecord): Promise<unknown> {
  try {
    const response = await requireClient(client).rpc(functionName, args);
    if (response.error) throw response.error;
    return response.data;
  } catch (error) {
    throw serviceError(error);
  }
}

function hostArgs(access: SnakeLiveHostAccess): UnknownRecord {
  return {
    p_room_id: access.roomId,
    p_host_device_id: access.hostDeviceId,
    p_host_token: access.hostToken,
  };
}

function teamArgs(access: SnakeLiveTeamAccess): UnknownRecord {
  return {
    p_room_id: access.roomId,
    p_device_id: access.deviceId,
    p_device_token: access.deviceToken,
    p_team_id: access.teamId,
  };
}

export function createSnakeLiveCapabilityToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function createSnakeLiveRoomTransport(
  client: SupabaseClient | null = supabase,
): SnakeLiveRoomTransport {
  return {
    async createRoom(input: CreateSnakeLiveRoomInput): Promise<SnakeLiveRoom> {
      return asRoom(await rpc(client, 'kbl_snake_live_create_room', {
        p_session_id: input.sessionId,
        p_room_code: input.roomCode,
        p_phase: input.phase,
        p_host_device_id: input.hostDeviceId,
        p_host_token: input.hostToken,
        p_public_state: input.publicState,
      }));
    },

    async recoverHost(input: RecoverSnakeLiveHostInput): Promise<SnakeLiveRoom> {
      return asRoom(await rpc(client, 'kbl_snake_live_recover_host', {
        p_room_id: input.roomId,
        p_room_code: input.roomCode,
        p_expected_room_revision: input.expectedRoomRevision,
        p_new_host_device_id: input.hostDeviceId,
        p_new_host_token: input.hostToken,
        p_catalog: input.catalog,
      }));
    },

    async findRoomBySession(sessionId: string): Promise<SnakeLiveRoom | null> {
      const value = await rpc(client, 'kbl_snake_live_get_room_by_session', {
        p_session_id: sessionId,
      });
      return value === null ? null : asRoom(value);
    },

    async findRoomByCode(roomCode: string): Promise<SnakeLiveRoom | null> {
      const value = await rpc(client, 'kbl_snake_live_find_recoverable_room_by_code', {
        p_room_code: roomCode,
      });
      return value === null ? null : asRoom(value);
    },

    async getRoom(roomId: string): Promise<SnakeLiveRoom | null> {
      const value = await rpc(client, 'kbl_snake_live_get_room', { p_room_id: roomId });
      return value === null ? null : asRoom(value);
    },

    async seedCatalog(input: SnakeLiveHostAccess & { catalog: SnakeLiveJsonObject }): Promise<SnakeLiveCatalog> {
      return asCatalog(await rpc(client, 'kbl_snake_live_seed_catalog', {
        ...hostArgs(input),
        p_catalog: input.catalog,
      }));
    },

    async getCatalog(roomId: string): Promise<SnakeLiveCatalog | null> {
      const value = await rpc(client, 'kbl_snake_live_get_catalog', { p_room_id: roomId });
      return value === null ? null : asCatalog(value);
    },

    async listEvents(roomId: string, afterEventId = 0): Promise<SnakeLivePublicEvent[]> {
      return asArray(
        await rpc(client, 'kbl_snake_live_list_events', {
          p_room_id: roomId,
          p_after_event_id: afterEventId,
        }),
        asEvent,
        'The live event list',
      );
    },

    async submitClaim(input: SubmitSnakeLiveClaimInput): Promise<SnakeLiveClaim> {
      return asClaim(await rpc(client, 'kbl_snake_live_submit_claim', {
        p_room_id: input.roomId,
        p_device_id: input.deviceId,
        p_device_token: input.deviceToken,
        p_request_key: input.requestKey,
        p_gm_name: input.gmName,
        p_team_id: input.teamId,
      }));
    },

    async listClaims(access: SnakeLiveHostAccess): Promise<SnakeLiveClaim[]> {
      return asArray(
        await rpc(client, 'kbl_snake_live_list_claims', hostArgs(access)),
        asClaim,
        'The live claim list',
      );
    },

    async listDeviceClaims(access: SnakeLiveDeviceAccess): Promise<SnakeLiveClaim[]> {
      return asArray(
        await rpc(client, 'kbl_snake_live_list_device_claims', {
          p_room_id: access.roomId,
          p_device_id: access.deviceId,
          p_device_token: access.deviceToken,
        }),
        asClaim,
        'The device claim list',
      );
    },

    async resolveClaim(input: ResolveSnakeLiveClaimInput): Promise<SnakeLiveClaim> {
      return asClaim(await rpc(client, 'kbl_snake_live_resolve_claim', {
        ...hostArgs(input),
        p_claim_id: input.claimId,
        p_expected_claim_revision: input.expectedClaimRevision,
        p_idempotency_key: input.idempotencyKey,
        p_status: input.status,
      }));
    },

    async getBoard(access: SnakeLiveTeamAccess): Promise<SnakeLiveSeatBoard | null> {
      const value = await rpc(client, 'kbl_snake_live_read_board', teamArgs(access));
      return value === null ? null : asBoard(value);
    },

    async writeBoard(input: WriteSnakeLiveBoardInput): Promise<SnakeLiveSeatBoard> {
      return asBoard(await rpc(client, 'kbl_snake_live_write_board', {
        ...teamArgs(input),
        p_expected_board_revision: input.expectedBoardRevision,
        p_idempotency_key: input.idempotencyKey,
        p_board: input.board,
      }));
    },

    async seedBoardAsHost(input: SeedSnakeLiveBoardAsHostInput): Promise<SnakeLiveBoardSeedReceipt> {
      return asBoardSeedReceipt(await rpc(client, 'kbl_snake_live_seed_board_as_host', {
        ...hostArgs(input),
        p_team_id: input.teamId,
        p_idempotency_key: input.idempotencyKey,
        p_board: input.board,
      }));
    },

    async submitIntent(input: SubmitSnakeLiveIntentInput): Promise<SnakeLiveIntent> {
      return asIntent(await rpc(client, 'kbl_snake_live_submit_intent', {
        ...teamArgs(input),
        p_idempotency_key: input.idempotencyKey,
        p_kind: input.kind,
        p_expected_room_revision: input.expectedRoomRevision,
        p_payload: input.payload,
      }));
    },

    async submitIntentAsHost(input: SubmitSnakeLiveHostTradeIntentInput): Promise<SnakeLiveIntent> {
      return asIntent(await rpc(client, 'kbl_snake_live_submit_host_trade_intent', {
        ...hostArgs(input),
        p_team_id: input.teamId,
        p_idempotency_key: input.idempotencyKey,
        p_expected_room_revision: input.expectedRoomRevision,
        p_payload: input.payload,
      }));
    },

    async listIntents(access: SnakeLiveHostAccess): Promise<SnakeLiveIntent[]> {
      return asArray(
        await rpc(client, 'kbl_snake_live_list_intents', hostArgs(access)),
        asIntent,
        'The live intent list',
      );
    },

    async listDeviceIntents(access: SnakeLiveDeviceAccess): Promise<SnakeLiveIntent[]> {
      return asArray(
        await rpc(client, 'kbl_snake_live_list_device_intents', {
          p_room_id: access.roomId,
          p_device_id: access.deviceId,
          p_device_token: access.deviceToken,
        }),
        asIntent,
        'The device intent list',
      );
    },

    async resolveIntent(input: ResolveSnakeLiveIntentInput): Promise<SnakeLiveIntent> {
      return asIntent(await rpc(client, 'kbl_snake_live_resolve_intent', {
        ...hostArgs(input),
        p_intent_id: input.intentId,
        p_expected_intent_revision: input.expectedIntentRevision,
        p_idempotency_key: input.idempotencyKey,
        p_status: input.status,
      }));
    },

    async publishRoom(input: PublishSnakeLiveRoomInput): Promise<SnakeLiveRoom> {
      return asRoom(await rpc(client, 'kbl_snake_live_publish_room', {
        ...hostArgs(input),
        p_expected_room_revision: input.expectedRoomRevision,
        p_idempotency_key: input.idempotencyKey,
        p_public_state: input.publicState,
        p_event_kind: input.eventKind,
        p_public_event: input.publicEvent,
        p_status: input.status ?? null,
      }));
    },

    async restorePreviousPublicState(input: RestoreSnakeLivePublicStateInput): Promise<SnakeLiveRoom> {
      return asRoom(await rpc(client, 'kbl_snake_live_restore_previous_public_state', {
        ...hostArgs(input),
        p_expected_room_revision: input.expectedRoomRevision,
        p_idempotency_key: input.idempotencyKey,
      }));
    },

    async closeRoom(
      access: SnakeLiveHostAccess,
      expectedRoomRevision: number,
      idempotencyKey: string,
    ): Promise<SnakeLiveRoom> {
      return asRoom(await rpc(client, 'kbl_snake_live_close_room', {
        ...hostArgs(access),
        p_expected_room_revision: expectedRoomRevision,
        p_idempotency_key: idempotencyKey,
      }));
    },

    subscribe(roomId: string, handlers: SnakeLiveSubscriptionHandlers): SnakeLiveSubscription {
      const liveClient = requireClient(client);
      const channel: RealtimeChannel = liveClient
        .channel(`snake-live-room:${roomId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'snake_live_events', filter: `room_id=eq.${roomId}` },
          (payload) => {
            try {
              handlers.onEvent(asEvent(payload.new));
            } catch (error) {
              handlers.onError?.(serviceError(error));
            }
          },
        )
        .subscribe((status, error) => {
          handlers.onStatus?.(status);
          if (error) handlers.onError?.(serviceError(error));
        });
      return {
        async unsubscribe(): Promise<void> {
          await liveClient.removeChannel(channel);
        },
      };
    },
  };
}

export type {
  SnakeLiveRoomTransport,
  SnakeLiveSubscription,
  SnakeLiveSubscriptionHandlers,
} from './snakeLiveRoomTypes';
