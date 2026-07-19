import type { SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;
type RpcResponse = Promise<{ data: unknown; error: { message: string } | null }>;

interface QueryFilter {
  field: string;
  op: 'eq' | 'gt';
  value: unknown;
}

interface SubscriptionRegistration {
  table: string;
  event: 'INSERT' | 'UPDATE';
  filter: string;
  callback: (payload: { new: Row }) => void;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function error(message: string): { data: null; error: { message: string } } {
  return { data: null, error: { message } };
}

class TestQuery implements PromiseLike<{ data: unknown; error: null }> {
  private readonly filters: QueryFilter[] = [];
  private ascending = true;
  private readonly server: SnakeLiveRoomTestServer;
  private readonly table: string;

  constructor(server: SnakeLiveRoomTestServer, table: string) {
    this.server = server;
    this.table = table;
  }

  select(): this {
    return this;
  }

  eq(field: string, value: unknown): this {
    this.filters.push({ field, op: 'eq', value });
    return this;
  }

  gt(field: string, value: unknown): this {
    this.filters.push({ field, op: 'gt', value });
    return this;
  }

  order(_field: string, options?: { ascending?: boolean }): this {
    this.ascending = options?.ascending !== false;
    return this;
  }

  async maybeSingle(): Promise<{ data: Row | null; error: null }> {
    const rows = this.resolve();
    return { data: rows[0] ?? null, error: null };
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.resolve(), error: null }).then(onfulfilled, onrejected);
  }

  private resolve(): Row[] {
    const rows = this.server.rows(this.table).filter((row) => this.filters.every((filter) => {
      if (filter.op === 'eq') return row[filter.field] === filter.value;
      const rowValue = row[filter.field];
      return typeof rowValue === 'number'
        && typeof filter.value === 'number'
        && rowValue > filter.value;
    }));
    rows.sort((left, right) => {
      const delta = Number(left.id ?? 0) - Number(right.id ?? 0);
      return this.ascending ? delta : -delta;
    });
    return clone(rows);
  }
}

class TestChannel {
  readonly registrations: SubscriptionRegistration[] = [];

  on(
    _type: string,
    filter: { event: 'INSERT' | 'UPDATE'; table: string; filter: string },
    callback: (payload: { new: Row }) => void,
  ): this {
    this.registrations.push({
      table: filter.table,
      event: filter.event,
      filter: filter.filter,
      callback,
    });
    return this;
  }

  subscribe(callback: (status: string, error?: Error) => void): this {
    callback('SUBSCRIBED');
    return this;
  }
}

/**
 * Deterministic server for the dedicated Snake service contract.
 * Each createClient call returns a separate client object. The server is the
 * only shared state. This prevents tests from simulating devices by mutating
 * one global device variable.
 */
export class SnakeLiveRoomTestServer {
  private readonly rooms = new Map<string, Row>();
  private readonly hostTokens = new Map<string, string>();
  private readonly claims = new Map<string, Row>();
  private readonly deviceTokens = new Map<string, string>();
  private readonly boards = new Map<string, Row>();
  private readonly intents = new Map<string, Row>();
  private readonly events: Row[] = [];
  private readonly idempotent = new Map<string, { args: Row; result: Row }>();
  private readonly channels = new Set<TestChannel>();
  private roomSequence = 0;
  private claimSequence = 0;
  private intentSequence = 0;
  private eventSequence = 0;

  createClient(clientId: string): SupabaseClient {
    return {
      rpc: (functionName: string, args: Row): RpcResponse => (
        this.rpc(clientId, functionName, clone(args))
      ),
      from: (table: string) => new TestQuery(this, table),
      channel: (name: string) => {
        void name;
        const channel = new TestChannel();
        this.channels.add(channel);
        return channel;
      },
      removeChannel: async (channel: TestChannel) => {
        this.channels.delete(channel);
        return 'ok';
      },
    } as unknown as SupabaseClient;
  }

  rows(table: string): Row[] {
    if (table === 'snake_live_rooms') return [...this.rooms.values()];
    if (table === 'snake_live_events') return this.events;
    return [];
  }

  private async rpc(_clientId: string, functionName: string, args: Row): RpcResponse {
    try {
      switch (functionName) {
        case 'kbl_snake_live_create_room': return this.createRoom(args);
        case 'kbl_snake_live_get_room': return this.getRoom(args);
        case 'kbl_snake_live_get_room_by_session': return this.getRoomBySession(args);
        case 'kbl_snake_live_find_open_room_by_code': return this.findOpenRoomByCode(args);
        case 'kbl_snake_live_list_events': return this.listEvents(args);
        case 'kbl_snake_live_submit_claim': return this.submitClaim(args);
        case 'kbl_snake_live_list_claims': return this.listClaims(args);
        case 'kbl_snake_live_list_device_claims': return this.listDeviceClaims(args);
        case 'kbl_snake_live_resolve_claim': return this.resolveClaim(args);
        case 'kbl_snake_live_read_board': return this.readBoard(args);
        case 'kbl_snake_live_write_board': return this.writeBoard(args);
        case 'kbl_snake_live_seed_board_as_host': return this.seedBoardAsHost(args);
        case 'kbl_snake_live_submit_intent': return this.submitIntent(args);
        case 'kbl_snake_live_submit_host_trade_intent': return this.submitHostTradeIntent(args);
        case 'kbl_snake_live_list_intents': return this.listIntents(args);
        case 'kbl_snake_live_list_device_intents': return this.listDeviceIntents(args);
        case 'kbl_snake_live_resolve_intent': return this.resolveIntent(args);
        case 'kbl_snake_live_publish_room': return this.publishRoom(args);
        case 'kbl_snake_live_close_room': return this.closeRoom(args);
        default: return error(`Unknown RPC ${functionName}.`);
      }
    } catch (caught) {
      return error(caught instanceof Error ? caught.message : String(caught));
    }
  }

  private createRoom(args: Row): RpcResponse {
    assertCapabilityToken(args.p_host_token);
    const identity = `create:${args.p_session_id}`;
    const replay = this.idempotentResult(identity, args);
    if (replay) {
      return Promise.resolve({
        data: clone(this.rooms.get(String(replay.id)) ?? replay),
        error: null,
      });
    }
    const existing = [...this.rooms.values()].find((row) => (
      row.session_id === args.p_session_id
    ));
    if (existing) return Promise.resolve(error('Idempotency conflict: this session has another room.'));
    const id = `room-${++this.roomSequence}`;
    const now = `2026-07-19T00:00:${String(this.roomSequence).padStart(2, '0')}.000Z`;
    const room: Row = {
      id,
      owner_user_id: 'test-owner',
      session_id: args.p_session_id,
      room_code: args.p_room_code,
      phase: args.p_phase,
      status: 'open',
      public_revision: 0,
      public_state: clone(args.p_public_state),
      host_device_id: args.p_host_device_id,
      created_at: now,
      updated_at: now,
    };
    this.rooms.set(id, room);
    this.hostTokens.set(id, String(args.p_host_token));
    this.emitPublicEvent(room, 'ROOM_CREATED', {
      roomRevision: 0,
      phase: args.p_phase,
    });
    this.remember(identity, args, room);
    return Promise.resolve({ data: clone(room), error: null });
  }

  private getRoom(args: Row): RpcResponse {
    return Promise.resolve({
      data: clone(this.rooms.get(String(args.p_room_id)) ?? null),
      error: null,
    });
  }

  private getRoomBySession(args: Row): RpcResponse {
    const room = [...this.rooms.values()].find((row) => row.session_id === args.p_session_id) ?? null;
    return Promise.resolve({ data: clone(room), error: null });
  }

  private findOpenRoomByCode(args: Row): RpcResponse {
    const room = [...this.rooms.values()].find((row) => (
      row.room_code === args.p_room_code && row.status === 'open'
    )) ?? null;
    return Promise.resolve({ data: clone(room), error: null });
  }

  private listEvents(args: Row): RpcResponse {
    const roomId = String(args.p_room_id);
    const afterEventId = Number(args.p_after_event_id ?? 0);
    const events = this.events.filter((row) => (
      row.room_id === roomId && Number(row.id) > afterEventId
    ));
    return Promise.resolve({ data: clone(events), error: null });
  }

  private submitClaim(args: Row): RpcResponse {
    const room = this.requireOpenRoom(String(args.p_room_id));
    assertCapabilityToken(args.p_device_token);
    if (args.p_device_id === room.host_device_id) {
      return Promise.resolve(error('Forbidden: the host device cannot claim a companion desk.'));
    }
    if (
      !isNonEmptyString(args.p_device_id)
      || !isNonEmptyString(args.p_request_key)
      || !isNonEmptyString(args.p_gm_name)
      || !isNonEmptyString(args.p_team_id)
    ) {
      return Promise.resolve(error('The claim request is incomplete.'));
    }
    const deviceKey = `${args.p_room_id}:${args.p_device_id}`;
    const existingToken = this.deviceTokens.get(deviceKey);
    if (existingToken !== undefined && existingToken !== args.p_device_token) {
      return Promise.resolve(error('Forbidden: the device token does not match.'));
    }
    const requestKey = String(args.p_request_key);
    const identity = `claim:${args.p_room_id}:${requestKey}`;
    const replay = this.idempotentResult(identity, args);
    if (replay) return Promise.resolve({ data: replay, error: null });
    const activeDeviceIds = new Set([...this.claims.values()]
      .filter((row) => (
        row.room_id === args.p_room_id
        && (row.status === 'pending' || row.status === 'approved')
      ))
      .map((row) => String(row.device_id)));
    if (!activeDeviceIds.has(String(args.p_device_id)) && activeDeviceIds.size >= 3) {
      return Promise.resolve(error('Conflict: this room already has three companion devices.'));
    }
    const id = `claim-${++this.claimSequence}`;
    const claim: Row = {
      id,
      room_id: args.p_room_id,
      request_key: requestKey,
      device_id: args.p_device_id,
      gm_name: args.p_gm_name,
      team_id: args.p_team_id,
      status: 'pending',
      revision: 1,
      created_at: `2026-07-19T00:01:${String(this.claimSequence).padStart(2, '0')}.000Z`,
      resolved_at: null,
    };
    this.claims.set(id, claim);
    this.deviceTokens.set(deviceKey, String(args.p_device_token));
    this.emitPublicEvent(room, 'CLAIM_ACTIVITY', {
      teamId: args.p_team_id,
      claimId: claim.id,
      claimRevision: claim.revision,
      action: 'submitted',
    });
    this.remember(identity, args, claim);
    return Promise.resolve({ data: clone(claim), error: null });
  }

  private listClaims(args: Row): RpcResponse {
    this.requireHost(args);
    return Promise.resolve({
      data: clone([...this.claims.values()].filter((row) => row.room_id === args.p_room_id)),
      error: null,
    });
  }

  private listDeviceClaims(args: Row): RpcResponse {
    this.requireDevice(args);
    return Promise.resolve({
      data: clone([...this.claims.values()].filter((row) => (
        row.room_id === args.p_room_id && row.device_id === args.p_device_id
      ))),
      error: null,
    });
  }

  private resolveClaim(args: Row): RpcResponse {
    this.requireHost(args);
    const identity = `resolve-claim:${args.p_room_id}:${args.p_idempotency_key}`;
    const replay = this.idempotentResult(identity, args);
    if (replay) return Promise.resolve({ data: replay, error: null });
    const claim = this.claims.get(String(args.p_claim_id));
    if (!claim || claim.room_id !== args.p_room_id) return Promise.resolve(error('Claim not found.'));
    if (claim.revision !== args.p_expected_claim_revision) return Promise.resolve(error('Stale claim revision.'));
    if (args.p_status === 'approved') {
      for (const other of this.claims.values()) {
        if (
          other.id !== claim.id
          && other.room_id === args.p_room_id
          && other.team_id === claim.team_id
          && other.status === 'approved'
        ) {
          other.status = 'revoked';
          other.revision = Number(other.revision) + 1;
          other.resolved_at = '2026-07-19T00:02:00.000Z';
        }
      }
    }
    claim.status = args.p_status;
    claim.revision = Number(claim.revision) + 1;
    claim.resolved_at = '2026-07-19T00:02:00.000Z';
    this.remember(identity, args, claim);
    this.emitPublicEvent(this.requireRoom(String(args.p_room_id)), 'CLAIM_ACTIVITY', {
      teamId: claim.team_id,
      claimId: claim.id,
      claimRevision: claim.revision,
      action: args.p_status,
    });
    return Promise.resolve({ data: clone(claim), error: null });
  }

  private readBoard(args: Row): RpcResponse {
    this.requireTeam(args);
    return Promise.resolve({
      data: clone(this.boards.get(`${args.p_room_id}:${args.p_team_id}`) ?? null),
      error: null,
    });
  }

  private writeBoard(args: Row): RpcResponse {
    this.requireTeam(args);
    if (
      !isRow(args.p_board)
      || !isNonEmptyString(args.p_idempotency_key)
      || !isNonNegativeInteger(args.p_expected_board_revision)
      || Number(args.p_expected_board_revision) < 1
    ) {
      return Promise.resolve(error('The board write is invalid.'));
    }
    const identity = `board:${args.p_room_id}:${args.p_team_id}:${args.p_idempotency_key}`;
    const replay = this.idempotentResult(identity, args);
    if (replay) return Promise.resolve({ data: replay, error: null });
    const key = `${args.p_room_id}:${args.p_team_id}`;
    const current = this.boards.get(key);
    if (!current) {
      return Promise.resolve(error('The private board has not been seeded.'));
    }
    const revision = Number(current.board_revision);
    if (revision !== args.p_expected_board_revision) return Promise.resolve(error('Stale board revision.'));
    const board: Row = {
      room_id: args.p_room_id,
      team_id: args.p_team_id,
      board_revision: revision + 1,
      board: clone(args.p_board),
      updated_by_device_id: args.p_device_id,
      updated_at: `2026-07-19T00:03:${String(revision + 1).padStart(2, '0')}.000Z`,
    };
    this.boards.set(key, board);
    this.remember(identity, args, board);
    this.emitPublicEvent(this.requireRoom(String(args.p_room_id)), 'BOARD_ACTIVITY', {
      teamId: args.p_team_id,
      boardRevision: board.board_revision,
      action: 'changed',
    });
    return Promise.resolve({ data: clone(board), error: null });
  }

  private seedBoardAsHost(args: Row): RpcResponse {
    this.requireHost(args);
    const identity = `seed-board:${args.p_room_id}:${args.p_team_id}:${args.p_idempotency_key}`;
    const replay = this.idempotentResult(identity, args);
    if (replay) return Promise.resolve({ data: replay, error: null });
    const key = `${args.p_room_id}:${args.p_team_id}`;
    const existing = this.boards.get(key);
    if (existing) {
      const receipt: Row = {
        room_id: args.p_room_id,
        team_id: args.p_team_id,
        board_revision: existing.board_revision,
        seeded: false,
      };
      this.remember(identity, args, receipt);
      return Promise.resolve({ data: clone(receipt), error: null });
    }
    const board: Row = {
      room_id: args.p_room_id,
      team_id: args.p_team_id,
      board_revision: 1,
      board: clone(args.p_board),
      updated_by_device_id: args.p_host_device_id,
      updated_at: '2026-07-19T00:03:00.000Z',
    };
    this.boards.set(key, board);
    const receipt: Row = {
      room_id: args.p_room_id,
      team_id: args.p_team_id,
      board_revision: 1,
      seeded: true,
    };
    this.remember(identity, args, receipt);
    return Promise.resolve({ data: clone(receipt), error: null });
  }

  private submitIntent(args: Row): RpcResponse {
    this.requireTeam(args);
    const payload = args.p_payload;
    if (
      !isRow(payload)
      || (args.p_kind !== 'pick' && args.p_kind !== 'trade')
      || !isNonEmptyString(args.p_idempotency_key)
    ) {
      return Promise.resolve(error('The companion intent is invalid.'));
    }
    if (args.p_kind === 'pick' && !isValidPickPayload(payload)) {
      return Promise.resolve(error('The private pick intent is invalid.'));
    }
    if (args.p_kind === 'trade' && !isValidTradePayload(payload, String(args.p_team_id))) {
      return Promise.resolve(error('The private trade intent is invalid.'));
    }
    const identity = `intent:${args.p_room_id}:${args.p_idempotency_key}`;
    const replay = this.idempotentResult(identity, args);
    if (replay) return Promise.resolve({ data: replay, error: null });
    const room = this.requireOpenRoom(String(args.p_room_id));
    if (room.public_revision !== args.p_expected_room_revision) {
      return Promise.resolve(error('Stale expected room revision.'));
    }
    const intent: Row = {
      id: `intent-${++this.intentSequence}`,
      room_id: args.p_room_id,
      idempotency_key: args.p_idempotency_key,
      device_id: args.p_device_id,
      team_id: args.p_team_id,
      kind: args.p_kind,
      status: 'pending',
      intent_revision: 1,
      expected_room_revision: args.p_expected_room_revision,
      payload: clone(args.p_payload),
      created_at: `2026-07-19T00:04:${String(this.intentSequence).padStart(2, '0')}.000Z`,
      resolved_at: null,
    };
    this.intents.set(String(intent.id), intent);
    this.remember(identity, args, intent);
    this.emitPublicEvent(room, 'INTENT_ACTIVITY', {
      teamId: args.p_team_id,
      intentId: intent.id,
      intentRevision: intent.intent_revision,
      kind: args.p_kind,
      action: 'submitted',
    });
    return Promise.resolve({ data: clone(intent), error: null });
  }

  private submitHostTradeIntent(args: Row): RpcResponse {
    this.requireHost(args);
    const payload = args.p_payload;
    if (
      !isRow(payload)
      || !isNonEmptyString(args.p_idempotency_key)
      || !isValidTradePayload(payload, String(args.p_team_id))
    ) {
      return Promise.resolve(error('The private host trade intent is invalid.'));
    }
    const identity = `intent:${args.p_room_id}:${args.p_idempotency_key}`;
    const replay = this.idempotentResult(identity, args);
    if (replay) return Promise.resolve({ data: replay, error: null });
    const room = this.requireOpenRoom(String(args.p_room_id));
    if (room.public_revision !== args.p_expected_room_revision) {
      return Promise.resolve(error('Stale expected room revision.'));
    }
    const intent: Row = {
      id: `intent-${++this.intentSequence}`,
      room_id: args.p_room_id,
      idempotency_key: args.p_idempotency_key,
      device_id: args.p_host_device_id,
      team_id: args.p_team_id,
      kind: 'trade',
      status: 'pending',
      intent_revision: 1,
      expected_room_revision: args.p_expected_room_revision,
      payload: clone(payload),
      created_at: `2026-07-19T00:04:${String(this.intentSequence).padStart(2, '0')}.000Z`,
      resolved_at: null,
    };
    this.intents.set(String(intent.id), intent);
    this.remember(identity, args, intent);
    this.emitPublicEvent(room, 'INTENT_ACTIVITY', {
      teamId: args.p_team_id,
      intentId: intent.id,
      intentRevision: intent.intent_revision,
      kind: 'trade',
      action: 'submitted',
    });
    return Promise.resolve({ data: clone(intent), error: null });
  }

  private listIntents(args: Row): RpcResponse {
    this.requireHost(args);
    return Promise.resolve({
      data: clone([...this.intents.values()].filter((row) => row.room_id === args.p_room_id)),
      error: null,
    });
  }

  private listDeviceIntents(args: Row): RpcResponse {
    this.requireDevice(args);
    const controlledTeamIds = new Set([...this.claims.values()]
      .filter((row) => (
        row.room_id === args.p_room_id
        && row.device_id === args.p_device_id
        && row.status === 'approved'
      ))
      .map((row) => String(row.team_id)));
    return Promise.resolve({
      data: clone([...this.intents.values()].filter((row) => {
        if (row.room_id !== args.p_room_id) return false;
        if (row.device_id === args.p_device_id) return true;
        if (row.kind !== 'trade' || !isRow(row.payload)) return false;
        return controlledTeamIds.has(String(row.payload.buyerTeamId))
          || controlledTeamIds.has(String(row.payload.sellerTeamId));
      })),
      error: null,
    });
  }

  private resolveIntent(args: Row): RpcResponse {
    this.requireHost(args);
    const identity = `resolve-intent:${args.p_room_id}:${args.p_idempotency_key}`;
    const replay = this.idempotentResult(identity, args);
    if (replay) return Promise.resolve({ data: replay, error: null });
    const intent = this.intents.get(String(args.p_intent_id));
    if (!intent || intent.room_id !== args.p_room_id) return Promise.resolve(error('Intent not found.'));
    if (intent.intent_revision !== args.p_expected_intent_revision) {
      return Promise.resolve(error('Stale intent revision.'));
    }
    intent.status = args.p_status;
    intent.intent_revision = Number(intent.intent_revision) + 1;
    intent.resolved_at = '2026-07-19T00:05:00.000Z';
    this.remember(identity, args, intent);
    this.emitPublicEvent(this.requireRoom(String(args.p_room_id)), 'INTENT_ACTIVITY', {
      teamId: intent.team_id,
      intentId: intent.id,
      intentRevision: intent.intent_revision,
      kind: intent.kind,
      action: args.p_status,
    });
    return Promise.resolve({ data: clone(intent), error: null });
  }

  private publishRoom(args: Row): RpcResponse {
    this.requireHost(args);
    const identity = `publish:${args.p_room_id}:${args.p_idempotency_key}`;
    const replay = this.idempotentResult(identity, args);
    if (replay) {
      return Promise.resolve({
        data: clone(this.rooms.get(String(args.p_room_id)) ?? replay),
        error: null,
      });
    }
    const room = this.requireOpenRoom(String(args.p_room_id));
    if (room.public_revision !== args.p_expected_room_revision) {
      return Promise.resolve(error('Stale expected room revision.'));
    }
    room.public_revision = Number(room.public_revision) + 1;
    room.public_state = clone(args.p_public_state);
    if (args.p_status) room.status = args.p_status;
    room.updated_at = `2026-07-19T00:06:${String(room.public_revision).padStart(2, '0')}.000Z`;
    this.emitPublicEvent(
      room,
      String(args.p_event_kind),
      clone(args.p_public_event) as Row,
      String(room.updated_at),
    );
    this.remember(identity, args, room);
    return Promise.resolve({ data: clone(room), error: null });
  }

  private closeRoom(args: Row): RpcResponse {
    this.requireHost(args);
    const identity = `publish:${args.p_room_id}:${args.p_idempotency_key}`;
    const replay = this.idempotentResult(identity, args);
    if (replay) {
      return Promise.resolve({ data: clone(this.requireRoom(String(args.p_room_id))), error: null });
    }
    const room = this.requireRoom(String(args.p_room_id));
    if (room.public_revision !== args.p_expected_room_revision) {
      return Promise.resolve(error('Stale expected room revision.'));
    }
    room.public_revision = Number(room.public_revision) + 1;
    room.status = 'closed';
    room.updated_at = `2026-07-19T00:06:${String(room.public_revision).padStart(2, '0')}.000Z`;
    this.emitPublicEvent(room, 'ROOM_CLOSED', { roomRevision: room.public_revision }, String(room.updated_at));
    this.remember(identity, args, room);
    return Promise.resolve({ data: clone(room), error: null });
  }

  private requireRoom(roomId: string): Row {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found.');
    return room;
  }

  private requireOpenRoom(roomId: string): Row {
    const room = this.requireRoom(roomId);
    if (room.status !== 'open') throw new Error('Room is not open.');
    return room;
  }

  private requireHost(args: Row): void {
    const room = this.rooms.get(String(args.p_room_id));
    if (!room) throw new Error('Room not found.');
    assertCapabilityToken(args.p_host_token);
    if (room.host_device_id !== args.p_host_device_id || this.hostTokens.get(String(room.id)) !== args.p_host_token) {
      throw new Error('Forbidden host token.');
    }
  }

  private requireTeam(args: Row): void {
    this.requireOpenRoom(String(args.p_room_id));
    this.requireDevice(args);
    const approved = [...this.claims.values()].some((claim) => (
      claim.room_id === args.p_room_id
      && claim.device_id === args.p_device_id
      && claim.team_id === args.p_team_id
      && claim.status === 'approved'
    ));
    if (!approved) throw new Error('Device is not approved for this team.');
  }

  private requireDevice(args: Row): void {
    this.requireOpenRoom(String(args.p_room_id));
    assertCapabilityToken(args.p_device_token);
    const token = this.deviceTokens.get(`${args.p_room_id}:${args.p_device_id}`);
    if (token !== args.p_device_token) throw new Error('Forbidden device token.');
  }

  private idempotentResult(identity: string, args: Row): Row | null {
    const existing = this.idempotent.get(identity);
    if (!existing) return null;
    if (!sameValue(existing.args, args)) throw new Error('Idempotency conflict.');
    return clone(existing.result);
  }

  private remember(identity: string, args: Row, result: Row): void {
    this.idempotent.set(identity, { args: clone(args), result: clone(result) });
  }

  private emitPublicEvent(room: Row, kind: string, publicPayload: Row, createdAt?: string): Row {
    const event: Row = {
      id: ++this.eventSequence,
      room_id: room.id,
      owner_user_id: room.owner_user_id,
      room_revision: room.public_revision,
      kind,
      public_payload: clone(publicPayload),
      created_at: createdAt ?? `2026-07-19T00:07:${String(this.eventSequence).padStart(2, '0')}.000Z`,
    };
    this.events.push(event);
    this.emit('snake_live_events', 'INSERT', event);
    return event;
  }

  private emit(table: string, event: 'INSERT' | 'UPDATE', row: Row): void {
    for (const channel of this.channels) {
      for (const registration of channel.registrations) {
        if (registration.table !== table || registration.event !== event) continue;
        const [field, expected] = registration.filter.split('=eq.');
        if (String(row[field]) !== expected) continue;
        queueMicrotask(() => registration.callback({ new: clone(row) }));
      }
    }
  }
}

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertCapabilityToken(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length < 32) {
    throw new Error('A capability token must contain at least 32 characters.');
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isValidPickPayload(payload: Row): boolean {
  return typeof payload.playerId === 'string'
    && payload.playerId.trim().length > 0
    && isNonNegativeInteger(payload.pick)
    && Number(payload.pick) > 0
    && isNonNegativeInteger(payload.sessionRevision);
}

function isValidTradePayload(payload: Row, teamId: string): boolean {
  const action = payload.action;
  const offerId = payload.offerId;
  const buyerTeamId = payload.buyerTeamId;
  const sellerTeamId = payload.sellerTeamId;
  return typeof action === 'string'
    && ['POST', 'NOD', 'WITHDRAW', 'DECLINE'].includes(action)
    && typeof offerId === 'string'
    && offerId.trim().length > 0
    && typeof buyerTeamId === 'string'
    && buyerTeamId.trim().length > 0
    && typeof sellerTeamId === 'string'
    && sellerTeamId.trim().length > 0
    && buyerTeamId !== sellerTeamId
    && (teamId === buyerTeamId || teamId === sellerTeamId);
}
