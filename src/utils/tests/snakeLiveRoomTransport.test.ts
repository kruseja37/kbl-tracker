import type { SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import {
  createSnakeLiveCapabilityToken,
  createSnakeLiveRoomTransport,
} from '../snakeLiveRoomTransport';
import { SnakeLiveTransportError } from '../snakeLiveRoomTypes';

const roomRow = {
  id: 'room-1',
  owner_user_id: 'user-1',
  session_id: 'session-1',
  room_code: '4821',
  phase: 'MLB',
  status: 'open',
  public_revision: 7,
  public_state: { currentPickIndex: 4 },
  correction_available: true,
  host_device_id: 'host-1',
  created_at: '2026-07-19T00:00:00.000Z',
  updated_at: '2026-07-19T00:01:00.000Z',
};

const claimRow = {
  id: 'claim-1', room_id: 'room-1', request_key: 'claim-op', device_id: 'desk-1',
  gm_name: 'Poke Foster', team_id: 'team-a', status: 'approved', revision: 2,
  created_at: '2026-07-19T00:00:00.000Z', resolved_at: '2026-07-19T00:01:00.000Z',
};

const boardRow = {
  room_id: 'room-1', team_id: 'team-a', board_revision: 3,
  board: { slots: { SP1: 'player-1' } }, updated_by_device_id: 'desk-1',
  updated_at: '2026-07-19T00:01:00.000Z',
};

const boardSeedRow = {
  room_id: 'room-1', team_id: 'team-a', board_revision: 1, seeded: true,
};

const intentRow = {
  id: 'intent-1', room_id: 'room-1', idempotency_key: 'intent-op', device_id: 'desk-1',
  team_id: 'team-a', kind: 'pick', status: 'pending', intent_revision: 1,
  expected_room_revision: 7, payload: { playerId: 'player-1', pick: 8, sessionRevision: 7 },
  created_at: '2026-07-19T00:00:00.000Z', resolved_at: null,
};

const eventRow = {
  id: 12, room_id: 'room-1', room_revision: 7,
  kind: 'PICK_COMMITTED', public_payload: { teamId: 'team-a', playerId: 'player-1', pick: 8 },
  created_at: '2026-07-19T00:01:00.000Z',
};

const catalogPayload = {
  formatVersion: 'snake-live-catalog-v1',
  league: { id: 'league-1', teamIds: ['team-a'] },
  teams: [{ id: 'team-a', name: 'Beewolves' }],
  players: [{ id: 'player-1', firstName: 'Jovita', lastName: 'Pulo' }],
  registeredPool: { leagueId: 'league-1', players: [{ id: 'player-1', iv: 42000, salary: 42000 }] },
};

const catalogRow = {
  room_id: 'room-1', catalog_revision: 1, catalog: catalogPayload,
  created_at: '2026-07-19T00:00:30.000Z',
};

interface MockState {
  rpcResults: Record<string, unknown>;
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  tableRows: Record<string, unknown[]>;
  channels: MockChannel[];
  removed: MockChannel[];
  rpcError?: { message: string };
}

class MockQuery {
  private readonly filters: Array<[string, unknown]> = [];
  private gtValue = 0;

  constructor(private readonly rows: unknown[]) {}
  select(): this { return this; }
  eq(field: string, value: unknown): this { this.filters.push([field, value]); return this; }
  gt(_field: string, value: number): this { this.gtValue = value; return this; }
  order(): Promise<{ data: unknown[]; error: null }> {
    return Promise.resolve({
      data: this.filtered().filter((row) => Number((row as Record<string, unknown>).id) > this.gtValue),
      error: null,
    });
  }
  maybeSingle(): Promise<{ data: unknown | null; error: null }> {
    return Promise.resolve({ data: this.filtered()[0] ?? null, error: null });
  }
  private filtered(): unknown[] {
    return this.rows.filter((row) => this.filters.every(([field, value]) => (
      (row as Record<string, unknown>)[field] === value
    )));
  }
}

class MockChannel {
  readonly handlers: Array<{ table: string; callback: (payload: { new: unknown }) => void }> = [];
  statusCallback?: (status: string, error?: Error) => void;
  on(
    _type: string,
    filter: { table: string },
    callback: (payload: { new: unknown }) => void,
  ): this {
    this.handlers.push({ table: filter.table, callback });
    return this;
  }
  subscribe(callback: (status: string, error?: Error) => void): this {
    this.statusCallback = callback;
    callback('SUBSCRIBED');
    return this;
  }
  emit(table: string, value: unknown): void {
    this.handlers.find((handler) => handler.table === table)?.callback({ new: value });
  }
}

function mockClient(overrides: Partial<MockState> = {}): { client: SupabaseClient; state: MockState } {
  const state: MockState = {
    rpcResults: {}, rpcCalls: [], tableRows: { snake_live_rooms: [roomRow], snake_live_events: [eventRow] },
    channels: [], removed: [], ...overrides,
  };
  const client = {
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ name, args });
      return state.rpcError
        ? { data: null, error: state.rpcError }
        : { data: state.rpcResults[name], error: null };
    }),
    from: vi.fn((table: string) => new MockQuery(state.tableRows[table] ?? [])),
    channel: vi.fn(() => {
      const channel = new MockChannel();
      state.channels.push(channel);
      return channel;
    }),
    removeChannel: vi.fn(async (channel: MockChannel) => {
      state.removed.push(channel);
      return 'ok';
    }),
  } as unknown as SupabaseClient;
  return { client, state };
}

const host = { roomId: 'room-1', hostDeviceId: 'host-1', hostToken: 'h'.repeat(64) };
const device = { roomId: 'room-1', deviceId: 'desk-1', deviceToken: 'd'.repeat(64) };
const team = { ...device, teamId: 'team-a' };

describe('Snake live-room transport', () => {
  test('migration keeps private payloads RPC-only and out of public events', () => {
    const sql = readFileSync('supabase/migrations/009_snake_live_rooms.sql', 'utf8');
    for (const privateKey of [
      'roomlogbyteamid', 'opentradeoffers', 'snakecompanions', 'companionroompublication',
      'correctionsnapshots', 'farmprospectsnapshot', 'seatingcertificate', 'seatboards',
      'rankings', 'designslots', 'zerointerestplayerids', 'recoveryslot', 'recoveryslots', 'priorpublicstate',
      'hosttokenhash', 'creationhash', 'requesthash', 'eventkey',
    ]) {
      expect(sql).toContain(`'${privateKey}'`);
    }
    expect(sql).toContain("v_key_norm LIKE '%hash'");
    expect(sql).toContain('REVOKE ALL ON public.snake_live_rooms, public.snake_live_catalogs, public.snake_live_devices');
    expect(sql).not.toMatch(/GRANT SELECT ON public\.snake_live_rooms TO (?:anon|authenticated)/);
    expect(sql).toContain('ALTER PUBLICATION supabase_realtime DROP TABLE public.snake_live_rooms');
    expect(sql).toContain('ALTER PUBLICATION supabase_realtime DROP TABLE public.snake_live_catalogs');
    expect(sql).not.toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.snake_live_rooms');
    expect(sql).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.snake_live_events');
    expect(sql).not.toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.snake_live_seat_boards');
    expect(sql).not.toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.snake_live_catalogs');
    expect(sql).not.toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.snake_live_recovery_slots');
    expect(sql).not.toContain('kbl_snake_live_read_board_as_host');
    expect(sql).not.toContain('kbl_snake_live_write_board_as_host');
    expect(sql).not.toContain('kbl_snake_live_publish_room_with_boards');
    expect(sql).not.toContain('kbl_snake_live_rotate_host_token');
    expect(sql).toContain('kbl_snake_live_seed_board_as_host');
    expect(sql).toContain('kbl_snake_live_get_room_by_session');
    expect(sql).toContain('kbl_snake_live_find_open_room_by_code');
    expect(sql).toContain('kbl_snake_live_list_events');
    expect(sql).toContain('kbl_snake_live_seed_catalog');
    expect(sql).toContain('kbl_snake_live_get_catalog');
    expect(sql).toContain("kbl_snake_live_catalog_matches_active_pool(p_catalog,r.public_state#>'{session,snakeSetup,poolPlayerIds}')");
    expect(sql).toContain("kbl_snake_live_catalog_matches_active_teams(p_catalog,r.public_state#>'{session,snakeSetup,clubs}')");
    expect(sql).toContain('ALTER TABLE public.snake_live_catalogs ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE public.snake_live_recovery_slots ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('REVOKE ALL ON public.snake_live_rooms, public.snake_live_catalogs');
    expect(sql).not.toMatch(/GRANT SELECT ON public\.snake_live_catalogs/);
    expect(sql).not.toMatch(/GRANT SELECT ON public\.snake_live_recovery_slots/);
    expect(sql).toContain('kbl_snake_live_restore_previous_public_state');
    for (const forbiddenCatalogKey of [
      'hiddenpersonalitymodifiers', 'salaryfactors', 'prospectprofile', 'backstory',
      'historicallegend', 'edithistory', 'rosterdesign', 'boardrankoverrides', 'rankoverrides',
    ]) {
      expect(sql).toContain(`'${forbiddenCatalogKey}'`);
    }

    const eventTable = sql.slice(
      sql.indexOf('CREATE TABLE public.snake_live_events ('),
      sql.indexOf('CREATE TABLE public.snake_live_event_receipts ('),
    );
    for (const forbiddenRawColumn of ['host_token_hash', 'creation_hash', 'request_hash', 'event_key']) {
      expect(eventTable).not.toContain(forbiddenRawColumn);
    }
    expect(eventTable).toContain('owner_user_id UUID NOT NULL');
    expect(eventTable).toContain('public_payload JSONB NOT NULL');
    const privateReceipts = sql.slice(
      sql.indexOf('CREATE TABLE public.snake_live_event_receipts ('),
      sql.indexOf('CREATE INDEX snake_live_events_room_id_order'),
    );
    expect(privateReceipts).toContain('event_key TEXT NOT NULL');
    expect(privateReceipts).toContain('request_hash BYTEA NOT NULL');
    expect(sql).not.toMatch(/GRANT SELECT ON public\.snake_live_event_receipts/);

    const roomJson = sql.slice(
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_room_json'),
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_claim_json'),
    );
    expect(roomJson).toContain("'host_device_id',p.host_device_id");
    expect(roomJson).toContain("'correction_available',EXISTS");
    for (const forbiddenRawColumn of [
      'host_token_hash', 'creation_hash', 'request_hash', 'event_key',
      'prior_public_state', 'prior_status', 'source_event_kind',
    ]) {
      expect(roomJson).not.toContain(forbiddenRawColumn);
    }
    const eventJson = sql.slice(
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_event_json'),
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_assert_owner'),
    );
    for (const forbiddenRawColumn of ['host_token_hash', 'creation_hash', 'request_hash', 'event_key']) {
      expect(eventJson).not.toContain(forbiddenRawColumn);
    }
    const boardWrite = sql.slice(
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_write_board_core'),
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_write_board('),
    );
    expect(boardWrite).not.toContain('WHERE id=p_room_id FOR UPDATE');
    expect(boardWrite).not.toContain('INSERT INTO public.snake_live_seat_boards');
    expect(boardWrite).toContain('The private board has not been seeded.');
    expect(boardWrite).not.toContain('BOARD_ACTIVITY');
    const boardSeed = sql.slice(
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_seed_board_as_host'),
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_submit_intent'),
    );
    expect(boardSeed).toContain('IF FOUND THEN');
    expect(boardSeed).not.toContain('UPDATE public.snake_live_seat_boards');
    expect(boardSeed).toContain("'seeded',FALSE");
    expect(boardSeed).toContain("'seeded',TRUE");
    const roomPublish = sql.slice(
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_publish_room'),
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_restore_previous_public_state'),
    );
    expect(roomPublish).toContain("p_event_kind IN ('PICK_RECORDED','TRADE_EXECUTED')");
    expect(roomPublish).toContain('INSERT INTO public.snake_live_recovery_slots');
    const roomRestore = sql.slice(
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_restore_previous_public_state'),
      sql.indexOf('CREATE OR REPLACE FUNCTION public.kbl_snake_live_close_room'),
    );
    expect(roomRestore).toContain('DELETE FROM public.snake_live_recovery_slots');
    expect(roomRestore).toContain("'CORRECTION_APPLIED'");
    expect(roomRestore).not.toContain("'priorPublicState'");
    expect(sql).toContain('Forbidden: the host device cannot claim a companion desk.');
    expect(sql).toContain('Forbidden: the host device cannot read a companion board.');
    expect(sql).toContain('Forbidden: the host device cannot write a companion board.');
    expect(sql).toContain("jsonb_typeof(p_payload->'pick')<>'number'");
    expect(sql).toContain("COALESCE(p_payload->>'pick','') !~ '^[1-9][0-9]*$'");
    expect(sql).toContain("jsonb_typeof(p_payload->'sessionRevision')<>'number'");
    expect(sql).toContain("COALESCE(p_payload->>'sessionRevision','') !~ '^(0|[1-9][0-9]*)$'");
  });

  test('recovery migration allows the owner to restore an open or completed room', () => {
    const sql = readFileSync(
      'supabase/migrations/20260720143326_recover_completed_snake_live_room.sql',
      'utf8',
    );
    expect(sql).toContain('kbl_snake_live_find_recoverable_room_by_code');
    expect(sql).toContain("status IN ('open','complete')");
    expect(sql).toContain('owner_user_id=u');
    expect(sql).toContain('TO authenticated');
    expect(sql).toContain('FROM PUBLIC, anon, authenticated');
  });

  test('host recovery migration rotates only owner authority and repairs a phase catalog', () => {
    const sql = readFileSync(
      'supabase/migrations/20260721173000_snake_live_host_recovery.sql',
      'utf8',
    );
    expect(sql).toContain('kbl_snake_live_recover_host');
    expect(sql).toContain('kbl_snake_live_assert_owner');
    expect(sql).toContain("r.status NOT IN ('open', 'complete')");
    expect(sql).toContain('kbl_snake_live_catalog_matches_phase');
    expect(sql).toContain("SET host_device_id = p_new_host_device_id");
    expect(sql).toContain('TO authenticated');
    expect(sql).not.toContain('public_revision = public_revision + 1');
  });

  test('fails clearly when Supabase is not configured', async () => {
    const transport = createSnakeLiveRoomTransport(null);
    await expect(transport.getRoom('room-1')).rejects.toMatchObject({ code: 'not-configured' });
    expect(() => transport.subscribe('room-1', { onEvent: vi.fn() }))
      .toThrow(SnakeLiveTransportError);
  });

  test('creates a 256-bit capability token', () => {
    expect(createSnakeLiveCapabilityToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  test('maps public room and event rows', async () => {
    const { client, state } = mockClient({ rpcResults: {
      kbl_snake_live_get_room_by_session: roomRow,
      kbl_snake_live_find_recoverable_room_by_code: roomRow,
      kbl_snake_live_get_room: roomRow,
      kbl_snake_live_list_events: [eventRow],
    } });
    const transport = createSnakeLiveRoomTransport(client);
    await expect(transport.findRoomBySession('session-1')).resolves.toMatchObject({ id: 'room-1', status: 'open' });
    await expect(transport.findRoomByCode('4821')).resolves.toMatchObject({ id: 'room-1', publicRevision: 7 });
    await expect(transport.getRoom('room-1')).resolves.toMatchObject({ roomCode: '4821' });
    await expect(transport.listEvents('room-1', 0)).resolves.toEqual([
      expect.objectContaining({ id: 12, publicPayload: { teamId: 'team-a', playerId: 'player-1', pick: 8 } }),
    ]);
    expect(state.rpcCalls.map((call) => call.name)).toEqual([
      'kbl_snake_live_get_room_by_session',
      'kbl_snake_live_find_recoverable_room_by_code',
      'kbl_snake_live_get_room',
      'kbl_snake_live_list_events',
    ]);
    expect(client.from).not.toHaveBeenCalled();
  });

  test('uses the stable claim RPCs and sends the first-use device token', async () => {
    const { client, state } = mockClient({
      rpcResults: {
        kbl_snake_live_submit_claim: claimRow,
        kbl_snake_live_list_claims: [claimRow],
        kbl_snake_live_list_device_claims: [claimRow],
        kbl_snake_live_resolve_claim: claimRow,
      },
    });
    const transport = createSnakeLiveRoomTransport(client);
    await transport.submitClaim({ ...device, requestKey: 'claim-op', gmName: 'Poke Foster', teamId: 'team-a' });
    await transport.listClaims(host);
    await transport.listDeviceClaims(device);
    await transport.resolveClaim({ ...host, claimId: 'claim-1', expectedClaimRevision: 1, idempotencyKey: 'resolve-1', status: 'approved' });
    expect(state.rpcCalls.map((call) => call.name)).toEqual([
      'kbl_snake_live_submit_claim', 'kbl_snake_live_list_claims',
      'kbl_snake_live_list_device_claims', 'kbl_snake_live_resolve_claim',
    ]);
    expect(state.rpcCalls[0].args.p_device_token).toBe(device.deviceToken);
    expect(state.rpcCalls[3].args.p_idempotency_key).toBe('resolve-1');
  });

  test('seeds and reads one immutable public catalog through RPCs', async () => {
    const { client, state } = mockClient({ rpcResults: {
      kbl_snake_live_seed_catalog: catalogRow,
      kbl_snake_live_get_catalog: catalogRow,
    } });
    const transport = createSnakeLiveRoomTransport(client);
    await expect(transport.seedCatalog({ ...host, catalog: catalogPayload })).resolves.toEqual({
      roomId: 'room-1', catalogRevision: 1, catalog: catalogPayload,
      createdAt: '2026-07-19T00:00:30.000Z',
    });
    await expect(transport.getCatalog('room-1')).resolves.toEqual({
      roomId: 'room-1', catalogRevision: 1, catalog: catalogPayload,
      createdAt: '2026-07-19T00:00:30.000Z',
    });
    expect(state.rpcCalls).toEqual([
      { name: 'kbl_snake_live_seed_catalog', args: expect.objectContaining({ p_catalog: catalogPayload }) },
      { name: 'kbl_snake_live_get_catalog', args: { p_room_id: 'room-1' } },
    ]);
    expect(client.from).not.toHaveBeenCalled();
  });

  test('maps explicit owner host recovery without changing public state locally', async () => {
    const recoveredRoom = { ...roomRow, host_device_id: 'host-recovered' };
    const { client, state } = mockClient({ rpcResults: {
      kbl_snake_live_recover_host: recoveredRoom,
    } });
    const transport = createSnakeLiveRoomTransport(client);
    await expect(transport.recoverHost({
      roomId: 'room-1',
      roomCode: '4821',
      expectedRoomRevision: 7,
      hostDeviceId: 'host-recovered',
      hostToken: 'recovered-token'.padEnd(48, 'x'),
      catalog: catalogPayload,
    })).resolves.toMatchObject({ hostDeviceId: 'host-recovered', publicRevision: 7 });
    expect(state.rpcCalls).toEqual([{
      name: 'kbl_snake_live_recover_host',
      args: expect.objectContaining({
        p_room_code: '4821',
        p_expected_room_revision: 7,
        p_new_host_device_id: 'host-recovered',
        p_catalog: catalogPayload,
      }),
    }]);
  });

  test('uses a token-scoped board RPC and an insert-only host seed RPC', async () => {
    const { client, state } = mockClient({ rpcResults: {
      kbl_snake_live_read_board: boardRow,
      kbl_snake_live_write_board: boardRow,
      kbl_snake_live_seed_board_as_host: boardSeedRow,
    } });
    const transport = createSnakeLiveRoomTransport(client);
    await transport.getBoard(team);
    await transport.writeBoard({ ...team, expectedBoardRevision: 2, idempotencyKey: 'board-1', board: boardRow.board });
    await expect(transport.seedBoardAsHost({
      ...host, teamId: 'team-a', idempotencyKey: 'board-seed-1', board: boardRow.board,
    })).resolves.toEqual({ roomId: 'room-1', teamId: 'team-a', boardRevision: 1, seeded: true });
    expect(state.rpcCalls.map((call) => call.name)).toEqual([
      'kbl_snake_live_read_board', 'kbl_snake_live_write_board', 'kbl_snake_live_seed_board_as_host',
    ]);
    expect(state.rpcCalls[2].args).toEqual(expect.objectContaining({
      p_team_id: 'team-a', p_idempotency_key: 'board-seed-1', p_board: boardRow.board,
    }));
  });

  test('returns only seed metadata when a host board already exists', async () => {
    const { client } = mockClient({ rpcResults: {
      kbl_snake_live_seed_board_as_host: {
        ...boardSeedRow, board_revision: 4, seeded: false, board: { private: true },
      },
    } });
    await expect(createSnakeLiveRoomTransport(client).seedBoardAsHost({
      ...host, teamId: 'team-a', idempotencyKey: 'board-seed-retry', board: boardRow.board,
    })).resolves.toEqual({ roomId: 'room-1', teamId: 'team-a', boardRevision: 4, seeded: false });
  });

  test('uses host and device intent recovery RPCs', async () => {
    const { client, state } = mockClient({ rpcResults: {
      kbl_snake_live_submit_intent: intentRow,
      kbl_snake_live_submit_host_trade_intent: { ...intentRow, kind: 'trade' },
      kbl_snake_live_list_intents: [intentRow],
      kbl_snake_live_list_device_intents: [intentRow],
      kbl_snake_live_resolve_intent: intentRow,
    } });
    const transport = createSnakeLiveRoomTransport(client);
    await transport.submitIntent({ ...team, idempotencyKey: 'intent-op', kind: 'pick', expectedRoomRevision: 7, payload: intentRow.payload });
    await transport.submitIntentAsHost({
      ...host,
      teamId: 'team-a',
      idempotencyKey: 'trade-op',
      kind: 'trade',
      expectedRoomRevision: 7,
      payload: { action: 'POST', offerId: 'offer-1', buyerTeamId: 'team-a', sellerTeamId: 'team-b' },
    });
    await transport.listIntents(host);
    await transport.listDeviceIntents(device);
    await transport.resolveIntent({ ...host, intentId: 'intent-1', expectedIntentRevision: 1, idempotencyKey: 'resolve-intent', status: 'accepted' });
    expect(state.rpcCalls.map((call) => call.name)).toEqual([
      'kbl_snake_live_submit_intent', 'kbl_snake_live_submit_host_trade_intent', 'kbl_snake_live_list_intents',
      'kbl_snake_live_list_device_intents', 'kbl_snake_live_resolve_intent',
    ]);
  });

  test.each([
    [{ pick: 8, sessionRevision: 7 }, 'missing player'],
    [{ playerId: ' ', pick: 8, sessionRevision: 7 }, 'blank player'],
    [{ playerId: 'player-1', pick: 0, sessionRevision: 7 }, 'zero pick'],
    [{ playerId: 'player-1', pick: 1.5, sessionRevision: 7 }, 'fractional pick'],
    [{ playerId: 'player-1', pick: 8, sessionRevision: -1 }, 'negative revision'],
    [{ playerId: 'player-1', pick: 8, sessionRevision: 1.5 }, 'fractional revision'],
  ])('surfaces server rejection for a malformed pick intent (%s)', async (payload) => {
    const { client, state } = mockClient({ rpcError: { message: 'The private pick intent is invalid.' } });
    await expect(createSnakeLiveRoomTransport(client).submitIntent({
      ...team,
      idempotencyKey: 'invalid-pick',
      kind: 'pick',
      expectedRoomRevision: 7,
      payload,
    })).rejects.toThrow('The private pick intent is invalid.');
    expect(state.rpcCalls).toHaveLength(1);
  });

  test('publishes, restores one prior public state, and closes through host authority RPCs', async () => {
    const { client, state } = mockClient({ rpcResults: {
      kbl_snake_live_publish_room: roomRow,
      kbl_snake_live_restore_previous_public_state: { ...roomRow, public_revision: 8 },
      kbl_snake_live_close_room: { ...roomRow, status: 'closed', public_revision: 8 },
    } });
    const transport = createSnakeLiveRoomTransport(client);
    await transport.publishRoom({ ...host, expectedRoomRevision: 7, idempotencyKey: 'public-1', publicState: {}, eventKind: 'TRADE_EXECUTED', publicEvent: {} });
    await transport.restorePreviousPublicState({ ...host, expectedRoomRevision: 8, idempotencyKey: 'correct-1' });
    await transport.closeRoom(host, 8, 'close-1');
    expect(state.rpcCalls.map((call) => call.name)).toEqual([
      'kbl_snake_live_publish_room', 'kbl_snake_live_restore_previous_public_state',
      'kbl_snake_live_close_room',
    ]);
    expect(state.rpcCalls[1].args).toEqual({
      p_room_id: 'room-1', p_host_device_id: 'host-1', p_host_token: 'h'.repeat(64),
      p_expected_room_revision: 8, p_idempotency_key: 'correct-1',
    });
  });

  test('maps stale service errors to a stable transport error', async () => {
    const { client } = mockClient({ rpcError: { message: 'Stale expected revision for the room.' } });
    await expect(createSnakeLiveRoomTransport(client).createRoom({
      sessionId: 'session-1', roomCode: '4821', phase: 'MLB', hostDeviceId: 'host-1',
      hostToken: 'h'.repeat(64), publicState: {},
    })).rejects.toMatchObject({ code: 'stale-revision' });
  });

  test('subscribes only to the safe event row and removes the channel', async () => {
    const { client, state } = mockClient();
    const onEvent = vi.fn();
    const onStatus = vi.fn();
    const subscription = createSnakeLiveRoomTransport(client).subscribe('room-1', { onEvent, onStatus });
    expect(state.channels[0].handlers.map((handler) => handler.table)).toEqual(['snake_live_events']);
    state.channels[0].emit('snake_live_rooms', roomRow);
    state.channels[0].emit('snake_live_events', eventRow);
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }));
    expect(onStatus).toHaveBeenCalledWith('SUBSCRIBED');
    await subscription.unsubscribe();
    expect(state.removed).toEqual([state.channels[0]]);
  });
});
