import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Player, Team } from "../leagueBuilderStorage";
import {
  buildSnakeDraftResetReceipt,
  buildSnakeRosterHandoff,
  freezeSnakeDraftSession,
} from "../snakeDraftManifest";

interface StoreRow {
  id?: string;
  user_id: string;
  db_name: string;
  store_name: string;
  record_key: string;
  data: unknown;
  changed_at: number;
  received_at?: string | null;
  deleted: boolean;
}

type LocalStorageRow = {
  user_id?: string;
  key: string;
  data: unknown;
  changed_at?: number;
  received_at?: string | null;
  deleted: boolean;
};

type AtomicStoreRow = StoreRow & {
  op_id?: string | null;
  base_received_at?: string | null;
  base_id?: string | null;
};
type AtomicLocalStorageRow = LocalStorageRow & {
  op_id?: string | null;
  base_received_at?: string | null;
  base_key?: string | null;
};

const mockState = vi.hoisted(() => ({
  cloudRows: [] as StoreRow[],
  localRows: [] as LocalStorageRow[],
  metaRows: [] as Array<{
    user_id: string;
    device_id: string;
    last_pull_changed_at: number;
    last_pull_id: string | null;
    last_pull_received_at?: string | null;
    last_pull_local_received_at?: string | null;
    last_pull_local_key?: string | null;
  }>,
  appliedOps: new Set<string>(),
  appliedOpMetadata: new Map<string, {
    target_table: string;
    target_key: string;
    changed_at: number;
    deleted?: boolean | null;
    payload_fingerprint?: string | null;
  }>(),
  kblStoreUpserts: [] as StoreRow[],
  updates: [] as Array<{ table: string; payload: unknown }>,
  nextId: 1,
  failNextUpsertTable: null as string | null,
  failNextUpsertRecordKey: null as string | null,
  nextRpcResponse: null as { table: string; data: unknown; error?: { message: string } | null } | null,
  failNextSelectTable: null as string | null,
  corruptStoreRecordKey: null as string | null,
  blockNextUpsertTable: null as string | null,
  blockedUpsertStarted: null as Promise<void> | null,
  resolveBlockedUpsertStarted: null as (() => void) | null,
  releaseBlockedUpsert: null as (() => void) | null,
  blockNextSelectTable: null as string | null,
  blockedSelectStarted: null as Promise<void> | null,
  resolveBlockedSelectStarted: null as (() => void) | null,
  releaseBlockedSelect: null as (() => void) | null,
  afterSelect: null as ((table: string, rows: Array<Record<string, unknown>>) => void) | null,
  sessionUserId: "user-1" as string | null,
  afterGetSession: null as ((userId: string | null) => void) | null,
  reset() {
    this.cloudRows = [];
    this.localRows = [];
    this.metaRows = [];
    this.appliedOps = new Set<string>();
    this.appliedOpMetadata = new Map<string, {
      target_table: string;
      target_key: string;
      changed_at: number;
      deleted?: boolean | null;
      payload_fingerprint?: string | null;
    }>();
    this.kblStoreUpserts = [];
    this.updates = [];
    this.nextId = 1;
    this.failNextUpsertTable = null;
    this.failNextUpsertRecordKey = null;
    this.nextRpcResponse = null;
    this.failNextSelectTable = null;
    this.corruptStoreRecordKey = null;
    this.blockNextUpsertTable = null;
    this.blockedUpsertStarted = null;
    this.resolveBlockedUpsertStarted = null;
    this.releaseBlockedUpsert = null;
    this.blockNextSelectTable = null;
    this.blockedSelectStarted = null;
    this.resolveBlockedSelectStarted = null;
    this.releaseBlockedSelect = null;
    this.afterSelect = null;
    this.sessionUserId = "user-1";
    this.afterGetSession = null;
  },
  blockNextUpsert(table: string) {
    this.blockNextUpsertTable = table;
    this.blockedUpsertStarted = new Promise<void>((resolve) => {
      this.resolveBlockedUpsertStarted = resolve;
    });
  },
  blockNextSelect(table: string) {
    this.blockNextSelectTable = table;
    this.blockedSelectStarted = new Promise<void>((resolve) => {
      this.resolveBlockedSelectStarted = resolve;
    });
  },
}));

interface MockQueryState {
  filters: Array<{ field: string; value: unknown }>;
  gtFilters: Array<{ field: string; value: unknown }>;
  orders: Array<{ field: string; ascending: boolean }>;
  orExpression?: string;
  limit?: number;
  range?: { from: number; to: number };
}

function makeThenable<T>(resultFactory: (state: MockQueryState) => T | Promise<T>) {
  const state: MockQueryState = { filters: [], gtFilters: [], orders: [] };
  return {
    eq(field: string, value: unknown) {
      state.filters.push({ field, value });
      return this;
    },
    gt(field: string, value: unknown) {
      state.gtFilters.push({ field, value });
      return this;
    },
    limit(value: number) {
      state.limit = value;
      return this;
    },
    order(field: string, options?: { ascending?: boolean }) {
      state.orders.push({ field, ascending: options?.ascending !== false });
      return this;
    },
    or(expression: string) {
      state.orExpression = expression;
      return this;
    },
    range(from: number, to: number) {
      state.range = { from, to };
      return this;
    },
    maybeSingle() {
      return Promise.resolve()
        .then(() => resultFactory(state))
        .then((result) => {
          if (
            result &&
            typeof result === "object" &&
            "data" in result &&
            Array.isArray((result as { data?: unknown }).data)
          ) {
            const typedResult = result as { data: unknown[]; error?: unknown };
            if (typedResult.data.length > 1) {
              return {
                ...typedResult,
                data: null,
                error: { message: "JSON object requested, multiple (or no) rows returned" },
              };
            }
            return {
              ...typedResult,
              data: typedResult.data[0] ?? null,
            };
          }
          return result;
        });
    },
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve()
        .then(() => resultFactory(state))
        .then(onfulfilled, onrejected);
    },
  };
}

function applyFilters<T extends Record<string, unknown>>(rows: T[], state: MockQueryState): T[] {
  return rows.filter((row) =>
    state.filters.every(({ field, value }) => row[field] === value) &&
    state.gtFilters.every(({ field, value }) => {
      const rowValue = row[field];
      if (typeof rowValue === "number" && typeof value === "number") {
        return rowValue > value;
      }
      return String(rowValue) > String(value);
    }) &&
    matchesOrExpression(row, state.orExpression)
  );
}

function matchesOrExpression(row: Record<string, unknown>, expression?: string): boolean {
  if (!expression) return true;

  const receivedAtGt = expression.match(/received_at\.gt\.([^,]+)/);
  const receivedAtEq = expression.match(/received_at\.eq\.([^,)]+)/);
  const receivedAtIdGt = expression.match(/id\.gt\.([^)]+)/);
  if (receivedAtGt || receivedAtEq) {
    if (!receivedAtGt && !(receivedAtEq && receivedAtIdGt)) {
      throw new Error(`Unsupported mock Supabase .or() expression: ${expression}`);
    }
    const receivedAt = String(row.received_at ?? "");
    if (receivedAtGt && receivedAt > receivedAtGt[1]) {
      return true;
    }
    if (receivedAtEq && receivedAtIdGt) {
      return receivedAt === receivedAtEq[1] && String(row.id) > receivedAtIdGt[1];
    }
    return false;
  }

  const changedAtGt = expression.match(/changed_at\.gt\.([^,]+)/);
  const changedAtEq = expression.match(/changed_at\.eq\.([^,)]+)/);
  const idGt = expression.match(/id\.gt\.([^)]+)/);
  if (!changedAtGt && !(changedAtEq && idGt)) {
    throw new Error(`Unsupported mock Supabase .or() expression: ${expression}`);
  }
  const changedAt = Number(row.changed_at);

  if (changedAtGt && changedAt > Number(changedAtGt[1])) {
    return true;
  }

  if (changedAtEq && idGt) {
    return changedAt === Number(changedAtEq[1]) && String(row.id) > idGt[1];
  }

  return false;
}

function receivedAtForChangedAt(changedAt: number): string {
  return new Date(changedAt).toISOString();
}

function withReceivedAt(row: StoreRow): StoreRow {
  return {
    ...row,
    received_at: row.received_at ?? receivedAtForChangedAt(row.changed_at),
  };
}

function withLocalReceivedAt(row: LocalStorageRow): LocalStorageRow {
  return {
    ...row,
    received_at: row.received_at ?? receivedAtForChangedAt(row.changed_at ?? 0),
  };
}

function isStoreRowAtOrBeforeBase(existing: StoreRow, row: AtomicStoreRow): boolean {
  const baseReceivedAt = row.base_received_at ?? null;
  const baseId = row.base_id ?? null;
  if (!baseReceivedAt || !baseId) return false;
  const receivedAt = existing.received_at ?? receivedAtForChangedAt(existing.changed_at);
  return receivedAt < baseReceivedAt || (receivedAt === baseReceivedAt && String(existing.id) <= baseId);
}

function isLocalRowAtOrBeforeBase(existing: LocalStorageRow, row: AtomicLocalStorageRow): boolean {
  const baseReceivedAt = row.base_received_at ?? null;
  const baseKey = row.base_key ?? null;
  if (!baseReceivedAt || !baseKey) return false;
  const receivedAt = existing.received_at ?? receivedAtForChangedAt(existing.changed_at ?? 0);
  return receivedAt < baseReceivedAt || (receivedAt === baseReceivedAt && existing.key <= baseKey);
}

function applyOrdering<T extends Record<string, unknown>>(rows: T[], state: MockQueryState): T[] {
  if (state.orders.length === 0) return rows;

  return [...rows].sort((left, right) => {
    for (const { field, ascending } of state.orders) {
      const leftValue = left[field];
      const rightValue = right[field];
      const comparison = typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : String(leftValue) < String(rightValue)
          ? -1
          : String(leftValue) > String(rightValue)
            ? 1
            : 0;
      if (comparison !== 0) {
        return ascending ? comparison : -comparison;
      }
    }
    return 0;
  });
}

function applyWindow<T>(rows: T[], state: MockQueryState): T[] {
  let next = rows;
  if (state.range) {
    next = next.slice(state.range.from, state.range.to + 1);
  }
  if (typeof state.limit === "number") {
    next = next.slice(0, state.limit);
  }
  return next;
}

function applyQuery<T extends Record<string, unknown>>(rows: T[], state: MockQueryState): T[] {
  return applyWindow(applyOrdering(applyFilters(rows, state), state), state);
}

function maybeBlockSelect<T>(table: string, resultFactory: () => T): T | Promise<T> {
  if (mockState.failNextSelectTable === table) {
    mockState.failNextSelectTable = null;
    return {
      data: null,
      error: { message: `${table} select failed intentionally` },
    } as T;
  }

  if (mockState.blockNextSelectTable !== table) {
    return resultFactory();
  }

  mockState.blockNextSelectTable = null;
  mockState.resolveBlockedSelectStarted?.();
  return new Promise((resolve) => {
    mockState.releaseBlockedSelect = () => {
      mockState.releaseBlockedSelect = null;
      resolve(resultFactory());
    };
  });
}

function selectResult<T extends { data: Array<Record<string, unknown>> | null; error: unknown }>(
  table: string,
  result: T,
): T {
  if (Array.isArray(result.data)) {
    mockState.afterSelect?.(table, result.data);
  }
  return result;
}

function upsertCloudRows(rows: StoreRow[]): void {
  for (const row of rows) {
    const rowToStore = mockState.corruptStoreRecordKey === row.record_key
      ? {
          ...row,
          data: {
            ...(row.data as Record<string, unknown>),
            syncCorruptionProbe: true,
          },
        }
      : row;
    const existingIndex = mockState.cloudRows.findIndex(
      (existing) =>
        existing.user_id === rowToStore.user_id &&
        existing.db_name === rowToStore.db_name &&
        existing.store_name === rowToStore.store_name &&
        existing.record_key === rowToStore.record_key,
    );
    const stored = {
      ...(existingIndex >= 0 ? mockState.cloudRows[existingIndex] : {}),
      ...rowToStore,
      id: existingIndex >= 0
        ? mockState.cloudRows[existingIndex].id
        : `cloud-row-${mockState.nextId++}`,
      received_at: rowToStore.received_at ?? receivedAtForChangedAt(rowToStore.changed_at),
    };
    if (existingIndex >= 0) {
      mockState.cloudRows[existingIndex] = stored;
    } else {
      mockState.cloudRows.push(stored);
    }
  }
}

function atomicOpKey(userId: string | undefined, opId: string | null | undefined): string | null {
  return userId && opId ? `${userId}|${opId}` : null;
}

function stableTestStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableTestStringify).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableTestStringify(record[key])}`)
    .join(",")}}`;
}

function payloadFingerprint(value: unknown): string {
  return stableTestStringify(value);
}

function storeAppliedOpTarget(row: AtomicStoreRow): {
  target_table: string;
  target_key: string;
  changed_at: number;
  deleted: boolean;
  payload_fingerprint: string;
} {
  return {
    target_table: "kbl_stores",
    target_key: `${row.db_name}|${row.store_name}|${row.record_key}`,
    changed_at: row.changed_at,
    deleted: row.deleted,
    payload_fingerprint: payloadFingerprint(row.deleted ? {} : row.data),
  };
}

function localAppliedOpTarget(row: AtomicLocalStorageRow): {
  target_table: string;
  target_key: string;
  changed_at: number;
  deleted: boolean;
  payload_fingerprint: string;
} {
  return {
    target_table: "kbl_local_storage",
    target_key: row.key,
    changed_at: row.changed_at ?? 0,
    deleted: row.deleted,
    payload_fingerprint: payloadFingerprint(row.deleted ? {} : row.data),
  };
}

function appliedOpTargetMatches(
  opKey: string,
  target: {
    target_table: string;
    target_key: string;
    changed_at: number;
    deleted: boolean;
    payload_fingerprint: string;
  },
): boolean {
  const stored = mockState.appliedOpMetadata.get(opKey);
  const legacyPayloadMetadata = stored?.deleted == null && stored?.payload_fingerprint == null;
  return !stored || (
    stored.target_table === target.target_table &&
    stored.target_key === target.target_key &&
    stored.changed_at === target.changed_at &&
    (
      legacyPayloadMetadata ||
      (
        stored.deleted === target.deleted &&
        stored.payload_fingerprint === target.payload_fingerprint
      )
    )
  );
}

function recordAppliedOp(
  opKey: string,
  target: {
    target_table: string;
    target_key: string;
    changed_at: number;
    deleted: boolean;
    payload_fingerprint: string;
  },
): void {
  mockState.appliedOps.add(opKey);
  mockState.appliedOpMetadata.set(opKey, target);
}

function atomicUpsertCloudRows(rows: AtomicStoreRow[]) {
  const statuses: Array<{ row_index: number; status: "accepted" | "skipped" | "duplicate" }> = [];

  for (const [rowIndex, row] of rows.entries()) {
    const opKey = atomicOpKey(row.user_id, row.op_id);
    if (opKey && mockState.appliedOps.has(opKey)) {
      statuses.push({
        row_index: rowIndex,
        status: appliedOpTargetMatches(opKey, storeAppliedOpTarget(row)) ? "duplicate" : "skipped",
      });
      continue;
    }

    const existing = mockState.cloudRows.find(
      (candidate) =>
        candidate.user_id === row.user_id &&
        candidate.db_name === row.db_name &&
        candidate.store_name === row.store_name &&
        candidate.record_key === row.record_key,
    );
    if (existing && (row.changed_at <= existing.changed_at || !isStoreRowAtOrBeforeBase(existing, row))) {
      statuses.push({ row_index: rowIndex, status: "skipped" });
      continue;
    }

    const storeRow: StoreRow = {
      id: row.id,
      user_id: row.user_id,
      db_name: row.db_name,
      store_name: row.store_name,
      record_key: row.record_key,
      data: row.data,
      changed_at: row.changed_at,
      received_at: row.received_at,
      deleted: row.deleted,
    };
    mockState.kblStoreUpserts.push(storeRow);
    upsertCloudRows([storeRow]);
    if (opKey) {
      recordAppliedOp(opKey, storeAppliedOpTarget(row));
    }
    statuses.push({ row_index: rowIndex, status: "accepted" });
  }

  return {
    data: statuses,
    error: null,
  };
}

function commitUpsert(table: string, rows: unknown[]) {
  if (table === "kbl_stores") {
    mockState.kblStoreUpserts.push(...(rows as StoreRow[]));
    upsertCloudRows(rows as StoreRow[]);
  }
  if (table === "kbl_local_storage") {
    upsertLocalRows(rows as LocalStorageRow[]);
  }
  if (table === "kbl_sync_meta") {
    upsertMetaRows(rows as Array<{
      user_id: string;
      device_id: string;
	      last_pull_changed_at: number;
	      last_pull_id: string | null;
	      last_pull_received_at?: string | null;
	      last_pull_local_received_at?: string | null;
	      last_pull_local_key?: string | null;
	    }>);
  }
  return { data: null, error: null };
}

function shouldFailUpsert(table: string, rows: unknown[]): boolean {
  if (mockState.failNextUpsertTable === table) {
    mockState.failNextUpsertTable = null;
    return true;
  }

  if (
    table === "kbl_stores" &&
    mockState.failNextUpsertRecordKey &&
    (rows as StoreRow[]).some((row) => row.record_key === mockState.failNextUpsertRecordKey)
  ) {
    mockState.failNextUpsertRecordKey = null;
    return true;
  }

  return false;
}

function upsertLocalRows(rows: LocalStorageRow[]): void {
  for (const row of rows) {
    const existingIndex = mockState.localRows.findIndex(
      (existing) => existing.user_id === row.user_id && existing.key === row.key,
    );
    const stored = {
      ...(existingIndex >= 0 ? mockState.localRows[existingIndex] : {}),
      ...row,
      received_at: row.received_at ?? receivedAtForChangedAt(row.changed_at ?? 0),
    };
    if (existingIndex >= 0) {
      mockState.localRows[existingIndex] = stored;
    } else {
      mockState.localRows.push(stored);
    }
  }
}

function atomicUpsertLocalRows(rows: AtomicLocalStorageRow[]) {
  const statuses: Array<{ row_index: number; status: "accepted" | "skipped" | "duplicate" }> = [];

  for (const [rowIndex, row] of rows.entries()) {
    const opKey = atomicOpKey(row.user_id, row.op_id);
    if (opKey && mockState.appliedOps.has(opKey)) {
      statuses.push({
        row_index: rowIndex,
        status: appliedOpTargetMatches(opKey, localAppliedOpTarget(row)) ? "duplicate" : "skipped",
      });
      continue;
    }

    const existing = mockState.localRows.find(
      (candidate) => candidate.user_id === row.user_id && candidate.key === row.key,
    );
    if (
      existing &&
      ((row.changed_at ?? 0) <= (existing.changed_at ?? 0) || !isLocalRowAtOrBeforeBase(existing, row))
    ) {
      statuses.push({ row_index: rowIndex, status: "skipped" });
      continue;
    }

    const localRow: LocalStorageRow = {
      user_id: row.user_id,
      key: row.key,
      data: row.data,
      changed_at: row.changed_at,
      received_at: row.received_at,
      deleted: row.deleted,
    };
    upsertLocalRows([localRow]);
    if (opKey) {
      recordAppliedOp(opKey, localAppliedOpTarget(row));
    }
    statuses.push({ row_index: rowIndex, status: "accepted" });
  }

  return {
    data: statuses,
    error: null,
  };
}

function upsertMetaRows(rows: Array<{
  user_id: string;
  device_id: string;
  last_pull_changed_at: number;
  last_pull_id: string | null;
  last_pull_received_at?: string | null;
  last_pull_local_received_at?: string | null;
  last_pull_local_key?: string | null;
}>): void {
  for (const row of rows) {
    const existingIndex = mockState.metaRows.findIndex(
      (existing) => existing.user_id === row.user_id && existing.device_id === row.device_id,
    );
    if (existingIndex >= 0) {
      mockState.metaRows[existingIndex] = { ...mockState.metaRows[existingIndex], ...row };
    } else {
      mockState.metaRows.push(row);
    }
  }
}

vi.mock("../../supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => {
        const userId = mockState.sessionUserId;
        mockState.afterGetSession?.(userId);
        return {
          data: {
            session: userId
              ? { user: { id: userId } }
              : null,
          },
        };
      }),
    },
    rpc(functionName: string, args: { p_rows?: unknown[] }) {
      const table = functionName === "kbl_atomic_upsert_store_rows"
        ? "kbl_stores"
        : functionName === "kbl_atomic_upsert_local_storage_rows"
          ? "kbl_local_storage"
          : functionName;
      const rows = Array.isArray(args?.p_rows) ? args.p_rows : [];
      const commitAtomic = () => {
        if (functionName === "kbl_atomic_upsert_store_rows") {
          return atomicUpsertCloudRows(rows as AtomicStoreRow[]);
        }
        if (functionName === "kbl_atomic_upsert_local_storage_rows") {
          return atomicUpsertLocalRows(rows as AtomicLocalStorageRow[]);
        }
        return { data: null, error: { message: `${functionName} rpc not mocked` } };
      };

      if (mockState.blockNextUpsertTable === table) {
        mockState.blockNextUpsertTable = null;
        mockState.resolveBlockedUpsertStarted?.();
        return new Promise((resolve) => {
          mockState.releaseBlockedUpsert = () => {
            mockState.releaseBlockedUpsert = null;
            if (shouldFailUpsert(table, rows)) {
              resolve({ data: null, error: { message: `${table} upsert failed intentionally` } });
              return;
            }
            resolve(commitAtomic());
          };
        });
      }
      if (shouldFailUpsert(table, rows)) {
        return Promise.resolve({ data: null, error: { message: `${table} upsert failed intentionally` } });
      }
      if (mockState.nextRpcResponse?.table === table) {
        const response = mockState.nextRpcResponse;
        mockState.nextRpcResponse = null;
        return Promise.resolve({
          data: response.data,
          error: response.error ?? null,
        });
      }
      return Promise.resolve(commitAtomic());
    },
    from(table: string) {
      return {
        delete() {
          return makeThenable((state) => {
            const userId = state.filters.find(({ field }) => field === "user_id")?.value;
            if (table === "kbl_stores") {
              mockState.cloudRows = mockState.cloudRows.filter((row) => row.user_id !== userId);
            } else if (table === "kbl_local_storage") {
              mockState.localRows = mockState.localRows.filter((row) => row.user_id !== userId);
            } else if (table === "kbl_sync_meta") {
              mockState.metaRows = mockState.metaRows.filter((row) => row.user_id !== userId);
            } else if (table === "kbl_sync_applied_ops") {
              mockState.appliedOps.clear();
              mockState.appliedOpMetadata.clear();
            }
            return { data: null, error: null };
          });
        },
        update(payload: unknown) {
          mockState.updates.push({ table, payload });
          return makeThenable(() => ({ data: null, error: null }));
        },
        upsert(payload: unknown) {
          const rows = Array.isArray(payload) ? payload : [payload];
          if (mockState.blockNextUpsertTable === table) {
            mockState.blockNextUpsertTable = null;
            mockState.resolveBlockedUpsertStarted?.();
            return new Promise((resolve) => {
              mockState.releaseBlockedUpsert = () => {
                mockState.releaseBlockedUpsert = null;
                if (shouldFailUpsert(table, rows)) {
                  resolve({ data: null, error: { message: `${table} upsert failed intentionally` } });
                  return;
                }
                resolve(commitUpsert(table, rows));
              };
            });
          }
          if (shouldFailUpsert(table, rows)) {
            return Promise.resolve({ data: null, error: { message: `${table} upsert failed intentionally` } });
          }
          return Promise.resolve(commitUpsert(table, rows));
        },
        select() {
          if (table === "kbl_stores") {
            return makeThenable((state) =>
              maybeBlockSelect(table, () => selectResult(table, {
                data: applyQuery(mockState.cloudRows.map(withReceivedAt), state),
                error: null,
              }))
            );
          }
	          if (table === "kbl_local_storage") {
	            return makeThenable((state) =>
	              maybeBlockSelect(table, () => selectResult(table, {
	                data: applyQuery(mockState.localRows.map(withLocalReceivedAt) as Array<Record<string, unknown>>, state),
	                error: null,
	              }))
	            );
          }
          if (table === "kbl_sync_meta") {
            return makeThenable((state) =>
              maybeBlockSelect(table, () => selectResult(table, {
                data: applyQuery(mockState.metaRows as Array<Record<string, unknown>>, state),
                error: null,
              }))
            );
          }
          return makeThenable(() => ({ data: null, error: null }));
        },
      };
    },
  },
}));

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function openAppMetaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("kbl-app-meta", 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("franchiseList")) {
        db.createObjectStore("franchiseList", { keyPath: "franchiseId" });
      }
      if (!db.objectStoreNames.contains("appSettings")) {
        db.createObjectStore("appSettings", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("franchiseConfigs")) {
        db.createObjectStore("franchiseConfigs", { keyPath: "franchiseId" });
      }
      if (!db.objectStoreNames.contains("eliminationList")) {
        db.createObjectStore("eliminationList", { keyPath: "eliminationId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function seedEliminationMeta(eliminationId: string): Promise<void> {
  const db = await openAppMetaDb();
  const tx = db.transaction("eliminationList", "readwrite");
  tx.objectStore("eliminationList").put({
    eliminationId,
    name: "Cloud Cup",
    leagueId: "league-1",
    leagueName: "League One",
    status: "IN_PROGRESS",
    createdAt: 1,
    lastPlayedAt: 1,
    teamsCount: 4,
    currentRound: 1,
  });
  await transactionToPromise(tx);
  db.close();
}

async function seedFranchiseMeta(franchiseId: string): Promise<void> {
  const db = await openAppMetaDb();
  const tx = db.transaction("franchiseList", "readwrite");
  tx.objectStore("franchiseList").put({
    franchiseId,
    name: "Franchise",
    createdAt: 1,
    lastPlayedAt: 1,
    schemaVersion: 1,
    appVersionCreated: "1.0.0",
  });
  await transactionToPromise(tx);
  db.close();
}

function buildPlayer(id: string, teamId: string): Player {
  return {
    id,
    firstName: "Ivy",
    lastName: "Runner",
    baseFameTier: 4,
    gender: "F",
    age: 24,
    bats: "R",
    throws: "R",
    primaryPosition: "SS",
    power: 70,
    contact: 71,
    speed: 72,
    fielding: 73,
    arm: 74,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: "B",
    personality: "Relaxed",
    chemistry: "Disciplined",
    morale: 0,
    mojo: "Normal",
    fame: 0,
    salary: 1000000,
    leagueAssignments: [{ leagueId: "league-1", teamId, rosterStatus: "MLB" }],
    createdDate: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
    isCustom: true,
    editHistory: [],
  };
}

function buildTeam(id: string): Team {
  return {
    id,
    name: "Cloud Captains",
    abbreviation: "CLC",
    location: "Denver",
    nickname: "Captains",
    colors: { primary: "#112233", secondary: "#445566" },
    stadium: "Cloud Park",
    leagueIds: ["league-1"],
    managerId: "manager-cloud",
    managerName: "Casey Cloud",
    createdDate: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
  };
}

async function getAllRecords<T>(dbName: string, storeName: string): Promise<T[]> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (!db.objectStoreNames.contains(storeName)) {
    db.close();
    return [];
  }
  const records = await new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => {
      const result = request.result as T[];
      db.close();
      resolve(result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
  return records;
}

async function seedCompletedGameWithEventLog(gameId: string): Promise<void> {
  const { STATIC_DATABASE_SCHEMAS, openDatabaseWithSchema } = await import("../backupRestore");
  const trackerDb = await openDatabaseWithSchema("kbl-tracker", STATIC_DATABASE_SCHEMAS["kbl-tracker"]);
  const trackerTx = trackerDb.transaction("completedGames", "readwrite");
  trackerTx.objectStore("completedGames").put({
    gameId,
    date: 123,
    seasonId: "season-1",
    awayTeamId: "away",
    homeTeamId: "home",
    awayTeamName: "Away",
    homeTeamName: "Home",
    finalScore: { away: 3, home: 4 },
    innings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    activityLog: ["game ended"],
    inningScores: [],
  });
  await transactionToPromise(trackerTx);
  trackerDb.close();

  const eventDb = await openDatabaseWithSchema("kbl-event-log", STATIC_DATABASE_SCHEMAS["kbl-event-log"]);
  const eventTx = eventDb.transaction(["gameHeaders", "atBatEvents"], "readwrite");
  eventTx.objectStore("gameHeaders").put({
    gameId,
    seasonId: "season-1",
    date: 123,
    awayTeamId: "away",
    awayTeamName: "Away",
    homeTeamId: "home",
    homeTeamName: "Home",
    finalScore: { away: 3, home: 4 },
    finalInning: 9,
    isComplete: true,
    aggregated: true,
    aggregatedAt: 456,
    aggregationError: null,
    eventCount: 2,
    checksum: "",
  });
  for (let index = 1; index <= 2; index += 1) {
    eventTx.objectStore("atBatEvents").put({
      eventId: `${gameId}-ab-${index}`,
      gameId,
      eventIndex: index,
      timestamp: 123 + index,
      batterId: `batter-${index}`,
      batterName: `Batter ${index}`,
      batterTeamId: "away",
      pitcherId: "pitcher-1",
      pitcherName: "Pitcher 1",
      pitcherTeamId: "home",
      result: index === 1 ? "SINGLE" : "OUT",
      rbiCount: index === 1 ? 1 : 0,
      runsScored: index === 1 ? ["runner-1"] : [],
      inning: 1,
      halfInning: "TOP",
      outs: index - 1,
      runners: { first: null, second: null, third: null },
      awayScore: index === 1 ? 0 : 1,
      homeScore: 0,
      outsAfter: index,
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: index === 1 ? 1 : 1,
      homeScoreAfter: 0,
      leverageIndex: 1,
      winProbabilityBefore: 0.5,
      winProbabilityAfter: 0.48,
      wpa: index === 1 ? 0.02 : -0.01,
      ballInPlay: null,
      fameEvents: [],
      isLeadoff: index === 1,
      isClutch: false,
      isWalkOff: false,
      version: 1,
      editHistory: [],
    });
  }
  await transactionToPromise(eventTx);
  eventDb.close();
}

async function putCompletedGameRecord(record: Record<string, unknown> & { gameId: string }): Promise<void> {
  const { STATIC_DATABASE_SCHEMAS, openDatabaseWithSchema } = await import("../backupRestore");
  const trackerDb = await openDatabaseWithSchema("kbl-tracker", STATIC_DATABASE_SCHEMAS["kbl-tracker"]);
  const tx = trackerDb.transaction("completedGames", "readwrite");
  tx.objectStore("completedGames").put(record);
  await transactionToPromise(tx);
  trackerDb.close();
}

async function deleteCompletedGameRecord(gameId: string): Promise<void> {
  const { STATIC_DATABASE_SCHEMAS, openDatabaseWithSchema } = await import("../backupRestore");
  const trackerDb = await openDatabaseWithSchema("kbl-tracker", STATIC_DATABASE_SCHEMAS["kbl-tracker"]);
  const tx = trackerDb.transaction("completedGames", "readwrite");
  tx.objectStore("completedGames").delete(gameId);
  await transactionToPromise(tx);
  trackerDb.close();
}

async function putAtBatEventRecord(record: Record<string, unknown> & { eventId: string }): Promise<void> {
  const { STATIC_DATABASE_SCHEMAS, openDatabaseWithSchema } = await import("../backupRestore");
  const db = await openDatabaseWithSchema("kbl-event-log", STATIC_DATABASE_SCHEMAS["kbl-event-log"]);
  const tx = db.transaction("atBatEvents", "readwrite");
  tx.objectStore("atBatEvents").put(record);
  await transactionToPromise(tx);
  db.close();
}

async function deleteGameHeader(gameId: string): Promise<void> {
  const { STATIC_DATABASE_SCHEMAS, openDatabaseWithSchema } = await import("../backupRestore");
  const eventDb = await openDatabaseWithSchema("kbl-event-log", STATIC_DATABASE_SCHEMAS["kbl-event-log"]);
  const tx = eventDb.transaction("gameHeaders", "readwrite");
  tx.objectStore("gameHeaders").delete(gameId);
  await transactionToPromise(tx);
  eventDb.close();
}

async function seedCopiedDb(
  dbName: string,
  players: Player[] = [],
  teams: Team[] = [],
): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const upgradeDb = request.result;
      if (!upgradeDb.objectStoreNames.contains("players")) {
        upgradeDb.createObjectStore("players", { keyPath: "id" });
      }
      if (!upgradeDb.objectStoreNames.contains("teams")) {
        upgradeDb.createObjectStore("teams", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction(["players", "teams"], "readwrite");
  for (const player of players) tx.objectStore("players").put(player);
  for (const team of teams) tx.objectStore("teams").put(team);
  await transactionToPromise(tx);
  db.close();
}

async function loadFreshSyncEngine() {
  vi.resetModules();
  const { syncEngine } = await import("../syncEngine");
  return syncEngine;
}

function snakeRestoreRows(input: {
  leagueId: string;
  sessionReceivedAt: string;
  poolReceivedAt: string;
}): { session: StoreRow; pool: StoreRow } {
  const playerId = `${input.leagueId}-player`;
  const pool = {
    leagueId: input.leagueId,
    players: [{ id: playerId, iv: 100 }],
  };
  const sessionId = `${input.leagueId}::startup-mlb-draft::1`;
  return {
    session: {
      id: `${input.leagueId}-session-cloud-row`,
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "mlbDraftSessions",
      record_key: JSON.stringify(sessionId),
      data: {
        id: sessionId,
        leagueId: input.leagueId,
        seasonNumber: 1,
        draftManifest: {
          formatVersion: "snake-draft-manifest-v1",
          phase: "MLB",
          leagueId: input.leagueId,
          source: { sessionId },
          pool: {
            identity: `pool:${input.leagueId}`,
            playerIds: [playerId],
            mlbIvByPlayerId: { [playerId]: 100 },
          },
        },
      },
      changed_at: Date.parse(input.sessionReceivedAt),
      received_at: input.sessionReceivedAt,
      deleted: false,
    },
    pool: {
      id: `${input.leagueId}-pool-cloud-row`,
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "registeredPools",
      record_key: JSON.stringify(input.leagueId),
      data: pool,
      changed_at: Date.parse(input.poolReceivedAt),
      received_at: input.poolReceivedAt,
      deleted: false,
    },
  };
}

async function canonicalFarmRestoreRows(input: {
  leagueId: string;
  receivedAt: { pool: string; mlb: string; farm: string };
  farmState?: "created" | "in-progress" | "handed-off";
}): Promise<{
  pool: StoreRow;
  mlb: StoreRow;
  farm: StoreRow;
  resetReceipt: ReturnType<typeof buildSnakeDraftResetReceipt> | null;
}> {
  const teamId = `${input.leagueId}-team`;
  const seed = `${input.leagueId}-seed`;
  const mlbSessionId = `${input.leagueId}::startup-mlb-draft::1`;
  const farmSessionId = `${input.leagueId}::startup-mlb-draft::2`;
  const mlbPickOrder = Array.from({ length: 22 }, (_, index) => ({
    round: index + 1,
    pick: index + 1,
    teamId,
  }));
  const mlbPlayers = mlbPickOrder.map((slot) => ({
    id: `${input.leagueId}-mlb-${slot.pick}`,
    iv: 100_000 + slot.pick,
  }));
  const mutableMlb = {
    id: mlbSessionId,
    leagueId: input.leagueId,
    seasonNumber: 1,
    seed,
    workflowVersion: "snake-v1",
    engineMethodVersion: "snake-s1a",
    tier: "standard" as const,
    balanceMode: "taxed" as const,
    rounds: 22,
    pickOrder: mlbPickOrder,
    completedPicks: mlbPickOrder.map((slot, index) => ({
      ...slot,
      playerId: mlbPlayers[index].id,
      settledSalary: mlbPlayers[index].iv,
    })),
    trades: [],
    correctionSnapshots: [],
    currentPickIndex: mlbPickOrder.length,
    revision: 0,
    snakeSetup: {
      poolPlayerIds: mlbPlayers.map((player) => player.id),
      versionSelections: {},
      clubs: [{ teamId, gmName: "GM", hotseat: true }],
      orderSeed: seed,
    },
    createdDate: "2026-07-14T12:00:00.000Z",
    lastModified: "2026-07-14T12:00:00.000Z",
  };
  const frozenMlb = freezeSnakeDraftSession({
    session: mutableMlb,
    expectedPhase: "MLB",
    poolPlayerIds: mlbPlayers.map((player) => player.id),
    salaryByPlayerId: new Map(mlbPlayers.map((player) => [player.id, player.iv])),
    frozenAt: "2026-07-14T12:01:00.000Z",
  });
  const handedOffMlb = {
    ...frozenMlb,
    rosterHandoff: buildSnakeRosterHandoff(frozenMlb, "MLB", "2026-07-14T12:02:00.000Z"),
  };
  const prospect = { id: `${input.leagueId}-prospect`, firstName: "Farm", lastName: "Prospect" };
  const createdFarm = {
    id: farmSessionId,
    leagueId: input.leagueId,
    seasonNumber: 2,
    seed: `${seed}:farm`,
    workflowVersion: "snake-v1-farm",
    engineMethodVersion: "snake-s6",
    tier: "standard" as const,
    balanceMode: "taxed" as const,
    rounds: 10,
    draftPhase: "FARM" as const,
    farmSlotSalaries: [75_000],
    farmProspectSnapshot: [prospect] as never,
    pickOrder: [{ round: 1, pick: 1, teamId }],
    completedPicks: [] as Array<{
      round: number;
      pick: number;
      teamId: string;
      playerId: string;
      settledSalary: number;
    }>,
    trades: [],
    correctionSnapshots: [],
    currentPickIndex: 0,
    revision: 0,
    snakeSetup: {
      poolPlayerIds: [prospect.id],
      versionSelections: {},
      clubs: [{ teamId, gmName: "GM", hotseat: true }],
      orderSeed: seed,
    },
    createdDate: "2026-07-14T12:03:00.000Z",
    lastModified: "2026-07-14T12:03:00.000Z",
  };
  const progressedFarm = input.farmState === "created" || input.farmState === undefined
    ? createdFarm
    : {
        ...createdFarm,
        completedPicks: [{
          ...createdFarm.pickOrder[0],
          playerId: prospect.id,
          settledSalary: createdFarm.farmSlotSalaries[0],
        }],
        currentPickIndex: 1,
        revision: 1,
      };
  const farmSession = input.farmState === "handed-off"
    ? (() => {
        const frozenFarm = freezeSnakeDraftSession({
          session: progressedFarm,
          expectedPhase: "FARM",
          poolPlayerIds: [prospect.id],
          frozenAt: "2026-07-14T12:04:00.000Z",
        });
        return {
          ...frozenFarm,
          rosterHandoff: buildSnakeRosterHandoff(frozenFarm, "FARM", "2026-07-14T12:05:00.000Z"),
        };
      })()
    : progressedFarm;
  const resetReceipt = farmSession.rosterHandoff
    ? buildSnakeDraftResetReceipt(farmSession, "2026-07-14T12:06:00.000Z")
    : null;
  const makeRow = (
    id: string,
    storeName: string,
    recordKey: string,
    data: unknown,
    receivedAt: string,
  ): StoreRow => ({
    id,
    user_id: "user-1",
    db_name: "kbl-league-builder",
    store_name: storeName,
    record_key: JSON.stringify(recordKey),
    data,
    changed_at: Date.parse(receivedAt),
    received_at: receivedAt,
    deleted: false,
  });
  return {
    pool: makeRow(
      `${input.leagueId}-pool-row`,
      "registeredPools",
      input.leagueId,
      { leagueId: input.leagueId, players: mlbPlayers },
      input.receivedAt.pool,
    ),
    mlb: makeRow(
      `${input.leagueId}-mlb-row`,
      "mlbDraftSessions",
      mlbSessionId,
      handedOffMlb,
      input.receivedAt.mlb,
    ),
    farm: makeRow(
      `${input.leagueId}-farm-row`,
      "mlbDraftSessions",
      farmSessionId,
      farmSession,
      input.receivedAt.farm,
    ),
    resetReceipt,
  };
}

function snakeSeatBoardSyncRows(input: {
  leagueId: string;
  sessionBoardRevision: number;
  standaloneBoardRevision: number;
  sessionReceivedAt: string;
  boardReceivedAt: string;
}): { session: StoreRow; board: StoreRow } {
  const sessionId = `${input.leagueId}::startup-mlb-draft::1`;
  const teamId = "team-a";
  const makeBoard = (revision: number, source: string) => ({
    slots: {},
    rankings: { global: [`${source}-${revision}`] },
    revision,
  });
  const embeddedBoard = makeBoard(input.sessionBoardRevision, "embedded");
  const standaloneBoard = makeBoard(input.standaloneBoardRevision, "standalone");
  const boardId = `${sessionId}::mlb-seat::${teamId}`;
  return {
    session: {
      id: `${input.leagueId}-session-row`,
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "mlbDraftSessions",
      record_key: JSON.stringify(sessionId),
      data: {
        id: sessionId,
        leagueId: input.leagueId,
        seasonNumber: 1,
        seed: "seat-sync-seed",
        workflowVersion: "snake-v1",
        engineMethodVersion: "snake-s1a",
        tier: "standard",
        balanceMode: "taxed",
        rounds: 1,
        pickOrder: [{ round: 1, pick: 1, teamId }],
        completedPicks: [],
        currentPickIndex: 0,
        revision: 0,
        seatBoards: { [teamId]: embeddedBoard },
        snakeSetup: {
          poolPlayerIds: ["player-a"],
          versionSelections: {},
          clubs: [{ teamId, hotseat: false }],
          orderSeed: "order",
        },
        createdDate: "2026-07-13T01:00:00.000Z",
        lastModified: "2026-07-13T01:00:00.000Z",
      },
      changed_at: Date.parse(input.sessionReceivedAt),
      received_at: input.sessionReceivedAt,
      deleted: false,
    },
    board: {
      id: `${input.leagueId}-board-row`,
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "snakeSeatBoards",
      record_key: JSON.stringify(boardId),
      data: {
        id: boardId,
        sessionId,
        leagueId: input.leagueId,
        seasonNumber: 1,
        teamId,
        phase: "MLB",
        board: standaloneBoard,
        revision: input.standaloneBoardRevision,
        lastModified: "2026-07-13T01:00:00.000Z",
      },
      changed_at: Date.parse(input.boardReceivedAt),
      received_at: input.boardReceivedAt,
      deleted: false,
    },
  };
}

describe("syncEngine dynamic elimination copied DBs", () => {
  beforeEach(async () => {
    mockState.reset();
    vi.doUnmock("../leagueBuilderStorage");
    vi.doUnmock("../playerOverrides");
    localStorage.clear();
    await Promise.allSettled([
      deleteDatabase("kbl-app-meta"),
      deleteDatabase("kbl-elimination-elim-copy"),
      deleteDatabase("kbl-elimination-elim-sync"),
      deleteDatabase("kbl-elimination-elim-cloud"),
      deleteDatabase("kbl-elimination-elim-stale"),
      deleteDatabase("kbl-franchise-franchise-cloud"),
      deleteDatabase("kbl-manager-identity"),
      deleteDatabase("kbl-event-log"),
      deleteDatabase("kbl-tracker"),
      deleteDatabase("kbl-league-builder"),
    ]);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.doUnmock("../leagueBuilderStorage");
    vi.doUnmock("../playerOverrides");
    await Promise.allSettled([
      deleteDatabase("kbl-app-meta"),
      deleteDatabase("kbl-elimination-elim-copy"),
      deleteDatabase("kbl-elimination-elim-sync"),
      deleteDatabase("kbl-elimination-elim-cloud"),
      deleteDatabase("kbl-elimination-elim-stale"),
      deleteDatabase("kbl-franchise-franchise-cloud"),
      deleteDatabase("kbl-manager-identity"),
      deleteDatabase("kbl-event-log"),
      deleteDatabase("kbl-tracker"),
      deleteDatabase("kbl-league-builder"),
    ]);
  });

  test.each([
    ["session-first", "2026-07-12T01:00:00.000Z", "2026-07-12T01:00:01.000Z"],
    ["pool-first", "2026-07-12T01:00:01.000Z", "2026-07-12T01:00:00.000Z"],
  ])("restores a cold-device snake manifest atomically when the cloud pair is %s", async (
    order,
    sessionReceivedAt,
    poolReceivedAt,
  ) => {
    const leagueId = `snake-${order}`;
    const rows = snakeRestoreRows({ leagueId, sessionReceivedAt, poolReceivedAt });
    mockState.cloudRows.push(rows.session, rows.pool);
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();

    await syncEngine.pull({ throwOnError: true });

    expect(await storage.getMlbDraftSession(leagueId, 1)).toEqual(
      expect.objectContaining({ leagueId, draftManifest: expect.objectContaining({ phase: "MLB" }) }),
    );
    expect(await storage.getRegisteredPool(leagueId)).toEqual(rows.pool.data);
    expect(localStorage.getItem("kbl-sync-deferred-snake-protected-rows")).toBeNull();
    syncEngine.destroy();
  });

  test.each([
    ["session-first", 2, 1],
    ["standalone-board-first", 1, 2],
  ])("standalone seat-board sync stays authoritative without rewriting room progress when %s", async (
    order,
    sessionBoardRevision,
    standaloneBoardRevision,
  ) => {
    const leagueId = `seat-sync-${order}`;
    const rows = snakeSeatBoardSyncRows({
      leagueId,
      sessionBoardRevision,
      standaloneBoardRevision,
      sessionReceivedAt: order === "session-first"
        ? "2026-07-13T01:00:00.000Z"
        : "2026-07-13T01:00:01.000Z",
      boardReceivedAt: order === "session-first"
        ? "2026-07-13T01:00:01.000Z"
        : "2026-07-13T01:00:00.000Z",
    });
    const first = order === "session-first" ? rows.session : rows.board;
    const second = order === "session-first" ? rows.board : rows.session;
    mockState.cloudRows.push(first);
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();

    await syncEngine.pull({ throwOnError: true });
    mockState.cloudRows.push(second);
    await syncEngine.pull({ throwOnError: true });

    const loaded = await storage.getMlbDraftSession(leagueId, 1);
    const loadedBoard = loaded?.seatBoards?.["team-a"];
    expect(loadedBoard?.revision).toBe(2);
    if (!loadedBoard) throw new Error("The authoritative team-a seat board did not arrive.");
    const saved = await storage.patchMlbDraftSessionSeatBoard({
      leagueId,
      seasonNumber: 1,
      teamId: "team-a",
      expectedBoardRevision: 2,
      board: {
        ...loadedBoard,
        rankings: { global: ["converged-3"] },
        revision: 3,
      },
    });
    expect(saved.seatBoards?.["team-a"]?.revision).toBe(3);
    await syncEngine.flush({ throwOnPending: true });

    const cloudSession = mockState.cloudRows.find((row) => (
      row.store_name === "mlbDraftSessions"
      && row.record_key === JSON.stringify(storage.createMlbDraftSessionId(leagueId, 1))
    ));
    const cloudBoard = mockState.cloudRows.find((row) => (
      row.store_name === "snakeSeatBoards"
      && row.record_key === JSON.stringify(`${storage.createMlbDraftSessionId(leagueId, 1)}::mlb-seat::team-a`)
    ));
    if (!cloudSession || !cloudBoard) throw new Error("The room and independent seat-board rows must both remain in cloud storage.");
    expect((cloudSession.data as import("../leagueBuilderStorage").LeagueBuilderMlbDraftSession)
      .seatBoards?.["team-a"]?.revision).toBe(sessionBoardRevision);
    expect((cloudBoard.data as import("../leagueBuilderStorage").SnakeSeatBoardStoreRecord)
      .board.revision).toBe(3);
    syncEngine.destroy();

    await storage.__resetLeagueBuilderDatabaseForTests();
    await Promise.all([
      deleteDatabase("kbl-app-meta"),
      deleteDatabase("kbl-league-builder"),
    ]);
    localStorage.clear();
    const freshEngine = await loadFreshSyncEngine();
    const freshStorage = await import("../leagueBuilderStorage");
    await freshStorage.initLeagueBuilderDatabase();
    await freshEngine.pull({ throwOnError: true });
    expect((await freshStorage.getMlbDraftSession(leagueId, 1))?.seatBoards?.["team-a"]?.revision).toBe(3);
    freshEngine.destroy();
  });

  test("does not trust a noncanonical season-2 FARM authority on a cold device", async () => {
    const leagueId = "snake-farm-cold-upsert";
    const sessionId = `${leagueId}::startup-mlb-draft::2`;
    mockState.cloudRows.push({
      id: "snake-farm-cold-upsert-row",
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "mlbDraftSessions",
      record_key: JSON.stringify(sessionId),
      data: {
        id: sessionId,
        leagueId,
        seasonNumber: 2,
        draftManifest: {
          formatVersion: "snake-draft-manifest-v1",
          phase: "FARM",
          leagueId,
          source: { sessionId },
          pool: { identity: `farm-pool:${leagueId}` },
        },
      },
      changed_at: Date.parse("2026-07-12T01:30:00.000Z"),
      received_at: "2026-07-12T01:30:00.000Z",
      deleted: false,
    });
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();

    await syncEngine.pull({ throwOnError: true });

    expect(await storage.getMlbDraftSession(leagueId, 2)).toBeNull();
    expect(localStorage.getItem("kbl-sync-deferred-snake-protected-rows")).not.toBeNull();
    expect(mockState.metaRows[0]?.last_pull_id).toBe("snake-farm-cold-upsert-row");
    syncEngine.destroy();
  });

  test.each([
    ["FARM-first", { farm: "2026-07-14T13:00:00.000Z", mlb: "2026-07-14T13:00:01.000Z", pool: "2026-07-14T13:00:02.000Z" }],
    ["MLB-first", { mlb: "2026-07-14T13:01:00.000Z", pool: "2026-07-14T13:01:01.000Z", farm: "2026-07-14T13:01:02.000Z" }],
  ])("restores a canonical clean-device MLB/pool/FARM set in %s record order", async (_order, receivedAt) => {
    const leagueId = `snake-farm-paired-${_order}`;
    const rows = await canonicalFarmRestoreRows({ leagueId, receivedAt });
    mockState.cloudRows.push(rows.farm, rows.mlb, rows.pool);
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();

    await syncEngine.pull({ throwOnError: true });

    expect(await storage.getRegisteredPool(leagueId)).toEqual(rows.pool.data);
    expect(await storage.getMlbDraftSession(leagueId, 1)).toEqual(rows.mlb.data);
    expect(await storage.getMlbDraftSession(leagueId, 2)).toEqual(rows.farm.data);
    expect(localStorage.getItem("kbl-sync-deferred-snake-protected-rows")).toBeNull();
    syncEngine.destroy();
  });

  test("defers FARM-first bootstrap without mutation, then applies it when MLB and pool arrive", async () => {
    const leagueId = "snake-farm-deferred-bootstrap";
    const rows = await canonicalFarmRestoreRows({
      leagueId,
      receivedAt: {
        farm: "2026-07-14T13:02:00.000Z",
        mlb: "2026-07-14T13:02:01.000Z",
        pool: "2026-07-14T13:02:02.000Z",
      },
    });
    mockState.cloudRows.push(rows.farm);
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();

    await syncEngine.pull({ throwOnError: true });
    expect(await storage.getMlbDraftSession(leagueId, 2)).toBeNull();
    expect(localStorage.getItem("kbl-sync-deferred-snake-protected-rows")).toContain(rows.farm.id);

    mockState.cloudRows.push(rows.mlb, rows.pool);
    await syncEngine.pull({ throwOnError: true });
    expect(await storage.getMlbDraftSession(leagueId, 1)).toEqual(rows.mlb.data);
    expect(await storage.getMlbDraftSession(leagueId, 2)).toEqual(rows.farm.data);
    expect(localStorage.getItem("kbl-sync-deferred-snake-protected-rows")).toBeNull();
    syncEngine.destroy();
  });

  test("rejects a noncanonical FARM bootstrap atomically when its MLB and pool prerequisites exist", async () => {
    const leagueId = "snake-farm-forged-bootstrap";
    const rows = await canonicalFarmRestoreRows({
      leagueId,
      receivedAt: {
        mlb: "2026-07-14T13:03:00.000Z",
        pool: "2026-07-14T13:03:01.000Z",
        farm: "2026-07-14T13:03:02.000Z",
      },
    });
    rows.farm.data = { ...(rows.farm.data as Record<string, unknown>), seed: "forged-farm-seed" };
    mockState.cloudRows.push(rows.mlb, rows.pool, rows.farm);
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();

    await expect(syncEngine.pull({ throwOnError: true })).rejects.toThrow(/noncanonical FARM authority/i);
    expect(await storage.getRegisteredPool(leagueId)).toBeNull();
    expect(await storage.getMlbDraftSession(leagueId, 1)).toBeNull();
    expect(await storage.getMlbDraftSession(leagueId, 2)).toBeNull();
    syncEngine.destroy();
  });

  test("bootstraps a canonical in-progress FARM row on a clean device", async () => {
    const leagueId = "snake-farm-direct-progress-bootstrap";
    const rows = await canonicalFarmRestoreRows({
      leagueId,
      farmState: "in-progress",
      receivedAt: {
        mlb: "2026-07-14T13:03:10.000Z",
        pool: "2026-07-14T13:03:11.000Z",
        farm: "2026-07-14T13:03:12.000Z",
      },
    });
    mockState.cloudRows.push(rows.mlb, rows.pool, rows.farm);
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();

    await syncEngine.pull({ throwOnError: true });

    expect(await storage.getMlbDraftSession(leagueId, 1)).toEqual(rows.mlb.data);
    expect(await storage.getMlbDraftSession(leagueId, 2)).toEqual(rows.farm.data);
    expect(localStorage.getItem("kbl-sync-deferred-snake-protected-rows")).toBeNull();
    syncEngine.destroy();
  });

  test("accepts later canonical FARM progress after pristine bootstrap", async () => {
    const leagueId = "snake-farm-progress-bootstrap";
    const createdRows = await canonicalFarmRestoreRows({
      leagueId,
      receivedAt: {
        mlb: "2026-07-14T13:04:00.000Z",
        pool: "2026-07-14T13:04:01.000Z",
        farm: "2026-07-14T13:04:02.000Z",
      },
    });
    mockState.cloudRows.push(createdRows.mlb, createdRows.pool, createdRows.farm);
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });

    const progressedRows = await canonicalFarmRestoreRows({
      leagueId,
      farmState: "in-progress",
      receivedAt: {
        mlb: "2026-07-14T13:04:03.000Z",
        pool: "2026-07-14T13:04:04.000Z",
        farm: "2026-07-14T13:04:05.000Z",
      },
    });
    mockState.cloudRows.push(progressedRows.farm);
    await syncEngine.pull({ throwOnError: true });
    expect(await storage.getMlbDraftSession(leagueId, 2)).toEqual(progressedRows.farm.data);
    syncEngine.destroy();
  });

  test.each([
    ["phase", (farm: Record<string, unknown>) => ({ ...farm, draftPhase: "MLB" })],
    ["trade", (farm: Record<string, unknown>) => ({ ...farm, trades: [{ id: "forged-trade" }] })],
    ["creation envelope", (farm: Record<string, unknown>) => ({ ...farm, seed: "mutated-frozen-seed" })],
  ])("rejects a canonical FARM authority's inbound %s mutation without changing storage", async (_label, mutate) => {
    const leagueId = `snake-farm-mutation-${_label.replace(" ", "-")}`;
    const rows = await canonicalFarmRestoreRows({
      leagueId,
      receivedAt: {
        mlb: "2026-07-14T13:05:00.000Z",
        pool: "2026-07-14T13:05:01.000Z",
        farm: "2026-07-14T13:05:02.000Z",
      },
    });
    mockState.cloudRows.push(rows.mlb, rows.pool, rows.farm);
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });
    const before = JSON.stringify(await storage.getMlbDraftSession(leagueId, 2));

    mockState.cloudRows.push({
      ...rows.farm,
      id: `${rows.farm.id}-mutation`,
      data: mutate(rows.farm.data as Record<string, unknown>),
      changed_at: Date.parse("2026-07-14T13:05:03.000Z"),
      received_at: "2026-07-14T13:05:03.000Z",
    });
    await expect(syncEngine.pull({ throwOnError: true })).rejects.toThrow();
    expect(JSON.stringify(await storage.getMlbDraftSession(leagueId, 2))).toBe(before);
    syncEngine.destroy();
  });

  test("applies a season-2 FARM reset tombstone after a canonical frozen handoff", async () => {
    const leagueId = "snake-farm-tombstone";
    const sessionId = `${leagueId}::startup-mlb-draft::2`;
    const rows = await canonicalFarmRestoreRows({
      leagueId,
      farmState: "handed-off",
      receivedAt: {
        mlb: "2026-07-14T13:06:00.000Z",
        pool: "2026-07-14T13:06:01.000Z",
        farm: "2026-07-14T13:06:02.000Z",
      },
    });
    if (!rows.resetReceipt) throw new Error("Canonical FARM handoff did not produce a reset receipt.");
    mockState.cloudRows.push(rows.mlb, rows.pool, rows.farm);
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });
    expect(await storage.getMlbDraftSession(leagueId, 2)).toEqual(rows.farm.data);
    mockState.cloudRows.push({
      id: "snake-farm-tombstone-row",
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "mlbDraftSessions",
      record_key: JSON.stringify(sessionId),
      data: rows.resetReceipt,
      changed_at: Date.parse("2026-07-14T13:06:03.000Z"),
      received_at: "2026-07-14T13:06:03.000Z",
      deleted: true,
    });

    await syncEngine.pull({ throwOnError: true });

    expect(await storage.getMlbDraftSession(leagueId, 2)).toBeNull();
    expect(mockState.metaRows[0]?.last_pull_id).toBe("snake-farm-tombstone-row");
    syncEngine.destroy();
  });

  test("restores a session-first pair split at the 500-row page boundary", async () => {
    const leagueId = "snake-page-boundary";
    const base = Date.parse("2026-07-12T02:00:00.000Z");
    const receivedAt = (offset: number) => new Date(base + offset).toISOString();
    const rows = snakeRestoreRows({
      leagueId,
      sessionReceivedAt: receivedAt(0),
      poolReceivedAt: receivedAt(500),
    });
    mockState.cloudRows.push(rows.session);
    for (let index = 1; index < 500; index += 1) {
      mockState.cloudRows.push({
        id: `snake-boundary-filler-${String(index).padStart(3, "0")}`,
        user_id: "user-1",
        db_name: "kbl-league-builder",
        store_name: "leagueTemplates",
        record_key: JSON.stringify(`snake-boundary-filler-${index}`),
        data: {
          id: `snake-boundary-filler-${index}`,
          name: `Filler ${index}`,
          teamIds: [],
          rulesPresetId: "rules",
        },
        changed_at: base + index,
        received_at: receivedAt(index),
        deleted: false,
      });
    }
    mockState.cloudRows.push(rows.pool);
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();

    await syncEngine.pull({ throwOnError: true });

    expect(await storage.getMlbDraftSession(leagueId, 1)).toEqual(
      expect.objectContaining({ leagueId, draftManifest: expect.objectContaining({ phase: "MLB" }) }),
    );
    expect(await storage.getRegisteredPool(leagueId)).toEqual(rows.pool.data);
    expect(mockState.metaRows[0]?.last_pull_id).toBe(rows.pool.id);
    expect(localStorage.getItem("kbl-sync-deferred-snake-protected-rows")).toBeNull();
    syncEngine.destroy();
  });

  test("persists a deferred manifest across a cursor save and process retry", async () => {
    const leagueId = "snake-cursor-retry";
    const rows = snakeRestoreRows({
      leagueId,
      sessionReceivedAt: "2026-07-12T03:00:00.000Z",
      poolReceivedAt: "2026-07-12T03:00:01.000Z",
    });
    mockState.cloudRows.push(rows.session);
    let syncEngine = await loadFreshSyncEngine();
    let storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();

    await syncEngine.pull({ throwOnError: true });

    expect(await storage.getMlbDraftSession(leagueId, 1)).toBeNull();
    expect(mockState.metaRows[0]?.last_pull_id).toBe(rows.session.id);
    expect(localStorage.getItem("kbl-sync-deferred-snake-protected-rows")).not.toBeNull();

    storage.__resetLeagueBuilderDatabaseForTests();
    syncEngine.destroy();
    mockState.cloudRows.push(rows.pool);
    syncEngine = await loadFreshSyncEngine();
    storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });

    expect(await storage.getMlbDraftSession(leagueId, 1)).toEqual(
      expect.objectContaining({ leagueId, draftManifest: expect.objectContaining({ phase: "MLB" }) }),
    );
    expect(await storage.getRegisteredPool(leagueId)).toEqual(rows.pool.data);
    expect(mockState.metaRows[0]?.last_pull_id).toBe(rows.pool.id);
    expect(localStorage.getItem("kbl-sync-deferred-snake-protected-rows")).toBeNull();
    syncEngine.destroy();
  });

  test("companion claim and approval round-trip across isolated device stores", async () => {
    let syncEngine = await loadFreshSyncEngine();
    let storage = await import("../leagueBuilderStorage");
    const { approveCompanionClaim, companionClaimIdentity, submitCompanionClaim } = await import(
      "../../src_figma/app/components/snake/companion/companionModel"
    );
    const { applySnakePickWithCorrection } = await import("../../engines/snakeSession");
    const initialBoard = {
      slots: {},
      rankings: { global: ["player-board-old"] },
      revision: 1,
    } as unknown as import("../leagueBuilderStorage").SnakeSeatBoardRecord;

    await storage.saveLeagueTemplate({
      id: "companion-league",
      name: "Companion Sync League",
      description: "",
      teamIds: ["team-a"],
      rulesPresetId: "rules-1",
    });
    await storage.saveMlbDraftSession({
      id: storage.createMlbDraftSessionId("companion-league", 1),
      leagueId: "companion-league",
      seasonNumber: 1,
      seed: "companion-seed",
      workflowVersion: "snake-v2",
      engineMethodVersion: "snake-v2",
      tier: "standard",
      balanceMode: "balanced",
      rounds: 22,
      pickOrder: [
        { round: 1, pick: 1, teamId: "team-a" },
        { round: 2, pick: 2, teamId: "team-a" },
      ],
      completedPicks: [],
      currentPickIndex: 0,
      revision: 1,
      seatBoards: { "team-a": initialBoard },
      snakeSetup: {
        poolPlayerIds: ["player-main-pick", "player-board-old", "player-board-new"],
        clubs: [{ teamId: "team-a", gmName: "Alex", seatMode: "companion" }],
        draftOrderTeamIds: ["team-a"],
      },
      snakeCompanions: { roomCode: "4821", claims: [] },
    });
    await syncEngine.flush({ throwOnPending: true });

    expect(mockState.cloudRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        user_id: "user-1",
        db_name: "kbl-league-builder",
        store_name: "leagueTemplates",
        record_key: JSON.stringify("companion-league"),
      }),
      expect.objectContaining({
        user_id: "user-1",
        db_name: "kbl-league-builder",
        store_name: "mlbDraftSessions",
        record_key: JSON.stringify(storage.createMlbDraftSessionId("companion-league", 1)),
      }),
    ]));

    storage.__resetLeagueBuilderDatabaseForTests();
    syncEngine.destroy();
    await deleteDatabase("kbl-league-builder");
    localStorage.clear();
    syncEngine = await loadFreshSyncEngine();
    storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });

    expect((await storage.getAllLeagueTemplates()).map((entry) => entry.id)).toContain("companion-league");
    const phoneSession = await storage.getMlbDraftSession("companion-league", 1);
    expect(phoneSession?.snakeCompanions?.roomCode).toBe("4821");
    const claim = submitCompanionClaim(phoneSession!, {
      deviceId: "phone-device",
      gmName: "Alex",
      roomCode: "4821",
    });
    expect(claim.ok).toBe(true);
    await storage.patchMlbDraftSessionSnakeCompanions({
      leagueId: "companion-league",
      seasonNumber: 1,
      patch: () => claim.session!.snakeCompanions!,
    });
    await syncEngine.flush({ throwOnPending: true });
    expect(mockState.cloudRows.find((row) => (
      row.store_name === "mlbDraftSessions" && row.record_key === JSON.stringify(storage.createMlbDraftSessionId("companion-league", 1))
    ))?.data).toEqual(expect.objectContaining({
      snakeCompanions: expect.objectContaining({
        claims: [expect.objectContaining({ deviceId: "phone-device", status: "pending" })],
      }),
    }));

    storage.__resetLeagueBuilderDatabaseForTests();
    syncEngine.destroy();
    await deleteDatabase("kbl-league-builder");
    localStorage.clear();
    syncEngine = await loadFreshSyncEngine();
    storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });
    const mainSession = await storage.getMlbDraftSession("companion-league", 1);
    expect(mainSession?.snakeCompanions?.claims[0]?.status).toBe("pending");
    await storage.patchMlbDraftSessionSnakeCompanions({
      leagueId: "companion-league",
      seasonNumber: 1,
      patch: (current, fresh) => {
        const value = { ...fresh, snakeCompanions: current };
        const pending = value.snakeCompanions?.claims.find((claim) => claim.deviceId === "phone-device");
        if (!pending) throw new Error("The pending phone claim disappeared before approval.");
        return approveCompanionClaim(
          value,
          companionClaimIdentity(pending),
          "approved",
        ).snakeCompanions!;
      },
    });
    await syncEngine.flush({ throwOnPending: true });

    storage.__resetLeagueBuilderDatabaseForTests();
    syncEngine.destroy();
    await deleteDatabase("kbl-league-builder");
    localStorage.clear();
    syncEngine = await loadFreshSyncEngine();
    storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });
    const approvedOnPhone = await storage.getMlbDraftSession("companion-league", 1);
    expect(approvedOnPhone?.snakeCompanions?.claims).toEqual([
      expect.objectContaining({ deviceId: "phone-device", status: "approved" }),
    ]);

    // The phone now holds a stale copy. Switch to the main device, record a pick,
    // and push it before the phone attempts its board edit.
    const stalePhoneSession = structuredClone(approvedOnPhone!);
    storage.__resetLeagueBuilderDatabaseForTests();
    syncEngine.destroy();
    await deleteDatabase("kbl-league-builder");
    localStorage.clear();
    syncEngine = await loadFreshSyncEngine();
    storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });
    const beforeMainPick = await storage.getMlbDraftSession("companion-league", 1);
    const afterMainPick = applySnakePickWithCorrection({
      session: beforeMainPick!,
      player: { playerId: "player-main-pick" },
      settledSalary: 42_000,
      marginalTax: 0,
      versionPool: [{ playerId: "player-main-pick" }],
    });
    await storage.saveMlbDraftRoomSession(afterMainPick, beforeMainPick?.revision ?? 0);
    await syncEngine.flush({ throwOnPending: true });

    // Restore the phone's pre-pick local snapshot without queueing a cloud write.
    // Its production flow pulls first, then patches only its own board field.
    storage.__resetLeagueBuilderDatabaseForTests();
    syncEngine.destroy();
    await deleteDatabase("kbl-league-builder");
    localStorage.clear();
    syncEngine = await loadFreshSyncEngine();
    storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    const suppressPhoneSeed = vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(true);
    await storage.saveMlbDraftSession(stalePhoneSession);
    suppressPhoneSeed.mockRestore();
    await syncEngine.pull({ throwOnError: true });
    const phoneAfterPull = await storage.getMlbDraftSession("companion-league", 1);
    expect(phoneAfterPull?.completedPicks).toEqual([
      expect.objectContaining({ playerId: "player-main-pick" }),
    ]);
    // Discriminator: the board payload deliberately comes from the phone's STALE
    // UI snapshot (pre-pick), exactly as the old whole-session save path would have
    // used it. The patch's internal fresh re-read must carry the main pick forward;
    // a whole-session save built from this snapshot drops the pick and fails below.
    const phoneBoard = stalePhoneSession.seatBoards?.["team-a"];
    expect(phoneBoard?.revision).toBe(1);
    expect(phoneAfterPull?.seatBoards?.["team-a"]?.revision).toBe(1);
    await storage.patchMlbDraftSessionSeatBoard({
      leagueId: "companion-league",
      seasonNumber: 1,
      teamId: "team-a",
      expectedBoardRevision: phoneBoard!.revision,
      board: {
        ...phoneBoard!,
        rankings: { ...phoneBoard!.rankings, global: ["player-board-new"] },
        revision: phoneBoard!.revision + 1,
      },
    });
    await syncEngine.flush({ throwOnPending: true });

    // Both origins pull the converged cloud row: neither the main pick nor the
    // phone's board edit may disappear.
    storage.__resetLeagueBuilderDatabaseForTests();
    syncEngine.destroy();
    await deleteDatabase("kbl-league-builder");
    localStorage.clear();
    syncEngine = await loadFreshSyncEngine();
    storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });
    const mainAfterPull = await storage.getMlbDraftSession("companion-league", 1);
    expect(mainAfterPull?.completedPicks).toEqual([
      expect.objectContaining({ playerId: "player-main-pick" }),
    ]);
    expect(mainAfterPull?.seatBoards?.["team-a"].rankings.global).toEqual(["player-board-new"]);

    storage.__resetLeagueBuilderDatabaseForTests();
    syncEngine.destroy();
    await deleteDatabase("kbl-league-builder");
    localStorage.clear();
    syncEngine = await loadFreshSyncEngine();
    storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });
    const phoneAfterFinalPull = await storage.getMlbDraftSession("companion-league", 1);
    expect(phoneAfterFinalPull?.completedPicks).toEqual([
      expect.objectContaining({ playerId: "player-main-pick" }),
    ]);
    expect(phoneAfterFinalPull?.seatBoards?.["team-a"].rankings.global).toEqual(["player-board-new"]);
  });

  test("replaceCloudWithLocal uploads copied elimination players and teams", async () => {
    await seedEliminationMeta("elim-sync");
    await seedCopiedDb(
      "kbl-elimination-elim-sync",
      [buildPlayer("player-sync", "team-sync")],
      [buildTeam("team-sync")],
    );
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceCloudWithLocal();

    expect(mockState.kblStoreUpserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          db_name: "kbl-elimination-elim-sync",
          store_name: "players",
          record_key: JSON.stringify("player-sync"),
          data: expect.objectContaining({ id: "player-sync", firstName: "Ivy" }),
          deleted: false,
        }),
        expect.objectContaining({
          db_name: "kbl-elimination-elim-sync",
          store_name: "teams",
          record_key: JSON.stringify("team-sync"),
          data: expect.objectContaining({ id: "team-sync", name: "Cloud Captains" }),
          deleted: false,
        }),
      ]),
    );
  });

  test("copied elimination save and delete helpers queue incremental sync operations", async () => {
    const syncEngine = await loadFreshSyncEngine();
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);
    const upsertSpy = vi.spyOn(syncEngine, "upsert");
    const removeSpy = vi.spyOn(syncEngine, "remove");
    const {
      deleteEliminationDatabase,
      saveEliminationPlayer,
      saveEliminationTeam,
    } = await import("../eliminationPlayerStorage");

    await saveEliminationPlayer("elim-sync", buildPlayer("player-sync", "team-sync"));
    await saveEliminationTeam("elim-sync", buildTeam("team-sync"));

    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-elimination-elim-sync",
      "players",
      "player-sync",
      expect.objectContaining({ id: "player-sync" }),
    );
    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-elimination-elim-sync",
      "teams",
      "team-sync",
      expect.objectContaining({ id: "team-sync" }),
    );

    await deleteEliminationDatabase("elim-sync");

    expect(removeSpy).toHaveBeenCalledWith("kbl-elimination-elim-sync", "players", "player-sync");
    expect(removeSpy).toHaveBeenCalledWith("kbl-elimination-elim-sync", "teams", "team-sync");
  });

  test("deepCopyLeagueToBracket queues copied elimination replacements", async () => {
    vi.doMock("../leagueBuilderStorage", () => ({
      getAllPlayers: vi.fn(async () => [buildPlayer("player-copy", "team-copy")]),
      getAllTeams: vi.fn(async () => [buildTeam("team-copy")]),
      getLeagueTemplate: vi.fn(async () => ({
        id: "league-1",
        name: "League One",
        createdDate: "2026-01-01T00:00:00.000Z",
        lastModified: "2026-01-01T00:00:00.000Z",
        teamIds: ["team-copy"],
        conferences: [],
        divisions: [],
        defaultRulesPreset: "rules-1",
      })),
    }));
    vi.doMock("../playerOverrides", () => ({
      getEffectivePlayer: vi.fn(async () => buildPlayer("player-copy", "team-copy")),
    }));
    await seedCopiedDb(
      "kbl-elimination-elim-copy",
      [buildPlayer("old-player", "team-copy")],
      [buildTeam("old-team")],
    );
    const syncEngine = await loadFreshSyncEngine();
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);
    const upsertSpy = vi.spyOn(syncEngine, "upsert");
    const removeSpy = vi.spyOn(syncEngine, "remove");
    const { deepCopyLeagueToBracket } = await import("../eliminationPlayerStorage");

    await deepCopyLeagueToBracket("elim-copy", "league-1");

    expect(removeSpy).toHaveBeenCalledWith("kbl-elimination-elim-copy", "players", "old-player");
    expect(removeSpy).toHaveBeenCalledWith("kbl-elimination-elim-copy", "teams", "old-team");
    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-elimination-elim-copy",
      "players",
      "player-copy",
      expect.objectContaining({ id: "player-copy" }),
    );
    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-elimination-elim-copy",
      "teams",
      "team-copy",
      expect.objectContaining({ id: "team-copy" }),
    );
  });

  test("replaceLocalWithCloud recreates elimination copied DBs in an empty local environment", async () => {
    mockState.cloudRows = [
      {
        id: "remote-player",
        user_id: "user-1",
        db_name: "kbl-elimination-elim-cloud",
        store_name: "players",
        record_key: JSON.stringify("player-cloud"),
        data: buildPlayer("player-cloud", "team-cloud"),
        changed_at: 10,
        deleted: false,
      },
      {
        id: "remote-team",
        user_id: "user-1",
        db_name: "kbl-elimination-elim-cloud",
        store_name: "teams",
        record_key: JSON.stringify("team-cloud"),
        data: buildTeam("team-cloud"),
        changed_at: 11,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    await expect(getAllRecords<Player>("kbl-elimination-elim-cloud", "players")).resolves.toEqual([
      expect.objectContaining({ id: "player-cloud", firstName: "Ivy" }),
    ]);
    await expect(getAllRecords<Team>("kbl-elimination-elim-cloud", "teams")).resolves.toEqual([
      expect.objectContaining({ id: "team-cloud", name: "Cloud Captains" }),
    ]);
  });

  test("replaceLocalWithCloud clears stale copied elimination rows before applying cloud rows", async () => {
    await seedEliminationMeta("elim-stale");
    await seedCopiedDb(
      "kbl-elimination-elim-stale",
      [buildPlayer("stale-player", "team-stale")],
      [],
    );
    mockState.cloudRows = [
      {
        id: "remote-fresh-player",
        user_id: "user-1",
        db_name: "kbl-elimination-elim-stale",
        store_name: "players",
        record_key: JSON.stringify("fresh-player"),
        data: buildPlayer("fresh-player", "team-stale"),
        changed_at: 10,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    await expect(getAllRecords<Player>("kbl-elimination-elim-stale", "players")).resolves.toEqual([
      expect.objectContaining({ id: "fresh-player" }),
    ]);
  });

  test("replaceLocalWithCloud still creates dynamic franchise copied DB stores", async () => {
    mockState.cloudRows = [
      {
        id: "remote-franchise-player",
        user_id: "user-1",
        db_name: "kbl-franchise-franchise-cloud",
        store_name: "players",
        record_key: JSON.stringify("franchise-player"),
        data: buildPlayer("franchise-player", "team-franchise"),
        changed_at: 10,
        deleted: false,
      },
    ];
    await seedFranchiseMeta("franchise-cloud");
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    await expect(getAllRecords<Player>("kbl-franchise-franchise-cloud", "players")).resolves.toEqual([
      expect.objectContaining({ id: "franchise-player" }),
    ]);
  });

  test("replaceLocalWithCloud recreates manager identity stores in an empty local environment", async () => {
    mockState.cloudRows = [
      {
        id: "remote-manager-profile",
        user_id: "user-1",
        db_name: "kbl-manager-identity",
        store_name: "managerProfiles",
        record_key: JSON.stringify("manager-cloud"),
        data: {
          managerId: "manager-cloud",
          displayName: "Casey Cloud",
          createdByUser: true,
          defaultManager: false,
        },
        changed_at: 10,
        deleted: false,
      },
      {
        id: "remote-manager-assignment",
        user_id: "user-1",
        db_name: "kbl-manager-identity",
        store_name: "managerAssignments",
        record_key: JSON.stringify(["exhibition", "sml", "beewolves"]),
        data: {
          managerId: "manager-cloud",
          teamId: "beewolves",
          mode: "exhibition",
          instanceId: "sml",
        },
        changed_at: 11,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    await expect(
      getAllRecords<Record<string, unknown>>("kbl-manager-identity", "managerProfiles"),
    ).resolves.toEqual([
      expect.objectContaining({ managerId: "manager-cloud", displayName: "Casey Cloud" }),
    ]);
    await expect(
      getAllRecords<Record<string, unknown>>("kbl-manager-identity", "managerAssignments"),
    ).resolves.toEqual([
      expect.objectContaining({
        managerId: "manager-cloud",
        teamId: "beewolves",
        mode: "exhibition",
        instanceId: "sml",
      }),
    ]);
  });

  test("replaceLocalWithCloud recreates static schemas with required indexes", async () => {
    mockState.cloudRows = [
      {
        id: "remote-game-header",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "gameHeaders",
        record_key: JSON.stringify("game-1"),
        data: {
          gameId: "game-1",
          date: 1,
          awayTeamId: "away",
          awayTeamName: "Away",
          homeTeamId: "home",
          homeTeamName: "Home",
          finalScore: null,
          finalInning: 1,
          isComplete: false,
          aggregated: false,
          aggregatedAt: null,
          aggregationError: null,
          eventCount: 0,
          checksum: "",
        },
        changed_at: 10,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    await expect(getAllRecords<Record<string, unknown>>("kbl-event-log", "gameHeaders")).resolves.toEqual([
      expect.objectContaining({ gameId: "game-1", awayTeamId: "away" }),
    ]);

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kbl-event-log");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("gameHeaders", "readonly");
    const indexNames = Array.from(tx.objectStore("gameHeaders").indexNames);
    db.close();
    expect(indexNames).toEqual(expect.arrayContaining(["seasonId", "date", "aggregated", "seasonId_aggregated"]));
  });

  test("diagnostics paginates cloud rows instead of undercounting after Supabase's default page size", async () => {
    mockState.cloudRows = Array.from({ length: 1205 }, (_, index): StoreRow => ({
      id: `player-${index}`,
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "globalPlayers",
      record_key: JSON.stringify(`player-${index}`),
      data: { id: `player-${index}` },
      changed_at: index,
      deleted: false,
    }));
    const syncEngine = await loadFreshSyncEngine();

    const diagnostics = await syncEngine.getDiagnostics();
    const globalPlayers = diagnostics.stores.find(
      (store) => store.dbName === "kbl-league-builder" && store.storeName === "globalPlayers",
    );

    expect(globalPlayers?.cloudCount).toBe(1205);
  });

  test("queued writes survive a fresh engine before any drain runs", async () => {
    let syncEngine = await loadFreshSyncEngine();
    syncEngine.upsert("kbl-event-log", "atBatEvents", "reload-event-1", {
      eventId: "reload-event-1",
      gameId: "reload-game",
      result: "DOUBLE",
    });
    syncEngine.upsertLocal("kbl-current-season", "reload-season");

    expect(syncEngine.getStatus().pendingCount).toBe(2);
    expect(localStorage.getItem("kbl-sync-queue")).toContain("reload-event-1");
    expect(localStorage.getItem("kbl-sync-local-queue")).toContain("kbl-current-season");

    syncEngine.destroy();
    syncEngine = await loadFreshSyncEngine();

    expect(syncEngine.getStatus().pendingCount).toBe(2);
    await syncEngine.flush();

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(localStorage.getItem("kbl-sync-queue")).toBeNull();
    expect(localStorage.getItem("kbl-sync-local-queue")).toBeNull();
    expect(mockState.cloudRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          db_name: "kbl-event-log",
          store_name: "atBatEvents",
          record_key: JSON.stringify("reload-event-1"),
          deleted: false,
        }),
      ]),
    );
    expect(mockState.localRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "kbl-current-season",
          data: "reload-season",
          deleted: false,
        }),
      ]),
    );
  });

  test("stale durable queue replays do not overwrite newer cloud rows", async () => {
    const staleUpsert: StoreRow = {
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify("stale-upsert-event"),
      data: { eventId: "stale-upsert-event", result: "SINGLE" },
      changed_at: 10,
      deleted: false,
    };
    const staleDelete: StoreRow = {
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify("stale-delete-event"),
      data: {},
      changed_at: 11,
      deleted: true,
    };
    localStorage.setItem("kbl-sync-queue", JSON.stringify([
      [`${staleUpsert.db_name}|${staleUpsert.store_name}|${staleUpsert.record_key}`, {
        dbName: staleUpsert.db_name,
        storeName: staleUpsert.store_name,
        recordKey: staleUpsert.record_key,
        data: staleUpsert.data,
        changedAt: staleUpsert.changed_at,
        deleted: staleUpsert.deleted,
      }],
      [`${staleDelete.db_name}|${staleDelete.store_name}|${staleDelete.record_key}`, {
        dbName: staleDelete.db_name,
        storeName: staleDelete.store_name,
        recordKey: staleDelete.record_key,
        data: staleDelete.data,
        changedAt: staleDelete.changed_at,
        deleted: staleDelete.deleted,
      }],
    ]));
    localStorage.setItem("kbl-sync-local-queue", JSON.stringify([
      ["kbl-current-season", {
        key: "kbl-current-season",
        data: "stale-season",
        changedAt: 12,
        deleted: false,
      }],
      ["kbl-app-state", {
        key: "kbl-app-state",
        data: {},
        changedAt: 13,
        deleted: true,
      }],
    ]));
    mockState.cloudRows = [
      {
        id: "cloud-newer-upsert",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: staleUpsert.record_key,
        data: { eventId: "stale-upsert-event", result: "TRIPLE" },
        changed_at: 20,
        deleted: false,
      },
      {
        id: "cloud-newer-delete-target",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: staleDelete.record_key,
        data: { eventId: "stale-delete-event", result: "DOUBLE" },
        changed_at: 21,
        deleted: false,
      },
    ];
    mockState.localRows = [
      {
        user_id: "user-1",
        key: "kbl-current-season",
        data: "newer-season",
        changed_at: 22,
        deleted: false,
      },
      {
        user_id: "user-1",
        key: "kbl-app-state",
        data: JSON.stringify({ screen: "lineup" }),
        changed_at: 23,
        deleted: false,
      },
    ];

    const syncEngine = await loadFreshSyncEngine();
    expect(syncEngine.getStatus().pendingCount).toBe(4);

    await syncEngine.flush();

    expect(syncEngine.getStatus().pendingCount).toBe(4);
    expect(syncEngine.getStatus().error).toContain("cloud has newer rows");
    expect(mockState.cloudRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          record_key: staleUpsert.record_key,
          data: expect.objectContaining({ result: "TRIPLE" }),
          changed_at: 20,
          deleted: false,
        }),
        expect.objectContaining({
          record_key: staleDelete.record_key,
          data: expect.objectContaining({ result: "DOUBLE" }),
          changed_at: 21,
          deleted: false,
        }),
      ]),
    );
    expect(mockState.localRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "kbl-current-season", data: "newer-season", changed_at: 22, deleted: false }),
        expect.objectContaining({ key: "kbl-app-state", data: JSON.stringify({ screen: "lineup" }), changed_at: 23, deleted: false }),
      ]),
    );
  });

  test("accepted durable queue replays are idempotent even when their timestamp is higher", async () => {
    localStorage.setItem("kbl-sync-queue", JSON.stringify([
      ["kbl-event-log|atBatEvents|\"accepted-replay-event\"", {
        opId: "accepted-store-op",
        dbName: "kbl-event-log",
        storeName: "atBatEvents",
        recordKey: JSON.stringify("accepted-replay-event"),
        data: { eventId: "accepted-replay-event", result: "SINGLE" },
        changedAt: 100,
        deleted: false,
      }],
    ]));
    localStorage.setItem("kbl-sync-local-queue", JSON.stringify([
      ["kbl-current-season", {
        opId: "accepted-local-op",
        key: "kbl-current-season",
        data: "stale-season",
        changedAt: 100,
        deleted: false,
      }],
    ]));
    mockState.appliedOps.add("user-1|accepted-store-op");
    mockState.appliedOps.add("user-1|accepted-local-op");
    mockState.cloudRows = [
      {
        id: "cloud-newer-logical-event",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("accepted-replay-event"),
        data: { eventId: "accepted-replay-event", result: "TRIPLE" },
        changed_at: 60,
        deleted: false,
      },
    ];
    mockState.localRows = [
      {
        user_id: "user-1",
        key: "kbl-current-season",
        data: "newer-season",
        changed_at: 60,
        deleted: false,
      },
    ];

    const syncEngine = await loadFreshSyncEngine();
    await syncEngine.flush();

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(mockState.cloudRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          record_key: JSON.stringify("accepted-replay-event"),
          data: expect.objectContaining({ result: "TRIPLE" }),
          changed_at: 60,
          deleted: false,
        }),
      ]),
    );
    expect(mockState.localRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "kbl-current-season",
          data: "newer-season",
          changed_at: 60,
          deleted: false,
        }),
      ]),
    );
  });

  test("accepted durable queue replays from before payload metadata stay idempotent", async () => {
    localStorage.setItem("kbl-sync-queue", JSON.stringify([
      ["kbl-event-log|atBatEvents|\"legacy-accepted-replay-event\"", {
        opId: "legacy-accepted-store-op",
        dbName: "kbl-event-log",
        storeName: "atBatEvents",
        recordKey: JSON.stringify("legacy-accepted-replay-event"),
        data: { eventId: "legacy-accepted-replay-event", result: "SINGLE" },
        changedAt: 100,
        deleted: false,
      }],
    ]));
    localStorage.setItem("kbl-sync-local-queue", JSON.stringify([
      ["kbl-current-season", {
        opId: "legacy-accepted-local-op",
        key: "kbl-current-season",
        data: "legacy-season",
        changedAt: 100,
        deleted: false,
      }],
    ]));
    mockState.appliedOps.add("user-1|legacy-accepted-store-op");
    mockState.appliedOpMetadata.set("user-1|legacy-accepted-store-op", {
      target_table: "kbl_stores",
      target_key: `kbl-event-log|atBatEvents|${JSON.stringify("legacy-accepted-replay-event")}`,
      changed_at: 100,
      deleted: null,
      payload_fingerprint: null,
    });
    mockState.appliedOps.add("user-1|legacy-accepted-local-op");
    mockState.appliedOpMetadata.set("user-1|legacy-accepted-local-op", {
      target_table: "kbl_local_storage",
      target_key: "kbl-current-season",
      changed_at: 100,
      deleted: null,
      payload_fingerprint: null,
    });
    mockState.cloudRows = [
      {
        id: "cloud-legacy-accepted-event",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("legacy-accepted-replay-event"),
        data: { eventId: "legacy-accepted-replay-event", result: "TRIPLE" },
        changed_at: 60,
        deleted: false,
      },
    ];
    mockState.localRows = [
      {
        user_id: "user-1",
        key: "kbl-current-season",
        data: "remote-season",
        changed_at: 60,
        deleted: false,
      },
    ];

    const syncEngine = await loadFreshSyncEngine();
    await syncEngine.flush();

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(mockState.cloudRows.find((row) => row.record_key === JSON.stringify("legacy-accepted-replay-event"))).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ result: "TRIPLE" }),
        changed_at: 60,
      }),
    );
    expect(mockState.localRows.find((row) => row.key === "kbl-current-season")).toEqual(
      expect.objectContaining({ data: "remote-season", changed_at: 60 }),
    );
  });

  test("duplicate store replay restores the write base for an immediate same-record edit", async () => {
    localStorage.setItem("kbl-sync-queue", JSON.stringify([
      ["kbl-event-log|atBatEvents|\"duplicate-base-event\"", {
        opId: "duplicate-base-store-op",
        dbName: "kbl-event-log",
        storeName: "atBatEvents",
        recordKey: JSON.stringify("duplicate-base-event"),
        data: { eventId: "duplicate-base-event", gameId: "duplicate-base-game", result: "SINGLE" },
        changedAt: 100,
        deleted: false,
      }],
    ]));
    mockState.appliedOps.add("user-1|duplicate-base-store-op");
    mockState.cloudRows = [
      {
        id: "cloud-duplicate-base-event",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("duplicate-base-event"),
        data: { eventId: "duplicate-base-event", gameId: "duplicate-base-game", result: "SINGLE" },
        changed_at: 100,
        received_at: "2026-01-01T00:00:00.100Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.flush({ throwOnPending: true });
    syncEngine.upsert("kbl-event-log", "atBatEvents", "duplicate-base-event", {
      eventId: "duplicate-base-event",
      gameId: "duplicate-base-game",
      result: "DOUBLE_AFTER_DUPLICATE",
    });
    await syncEngine.flush({ throwOnPending: true });

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(mockState.cloudRows.find((row) => row.record_key === JSON.stringify("duplicate-base-event"))).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ result: "DOUBLE_AFTER_DUPLICATE" }),
        deleted: false,
      }),
    );
  });

  test("duplicate localStorage replay restores the write base for an immediate same-key edit", async () => {
    localStorage.setItem("kbl-sync-local-queue", JSON.stringify([
      ["kbl-current-season", {
        opId: "duplicate-base-local-op",
        key: "kbl-current-season",
        data: "2",
        changedAt: 100,
        deleted: false,
      }],
    ]));
    mockState.appliedOps.add("user-1|duplicate-base-local-op");
    mockState.localRows = [
      {
        user_id: "user-1",
        key: "kbl-current-season",
        data: "2",
        changed_at: 100,
        received_at: "2026-01-01T00:00:00.100Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.flush({ throwOnPending: true });
    localStorage.setItem("kbl-current-season", "3");
    syncEngine.upsertLocal("kbl-current-season", "3");
    await syncEngine.flush({ throwOnPending: true });

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(mockState.localRows.find((row) => row.key === "kbl-current-season")).toEqual(
      expect.objectContaining({
        data: "3",
        deleted: false,
      }),
    );
  });

  test("duplicate op ids with mismatched targets stay pending instead of clearing", async () => {
    localStorage.setItem("kbl-sync-queue", JSON.stringify([
      ["kbl-event-log|atBatEvents|\"op-collision-new-event\"", {
        opId: "collided-store-op",
        dbName: "kbl-event-log",
        storeName: "atBatEvents",
        recordKey: JSON.stringify("op-collision-new-event"),
        data: { eventId: "op-collision-new-event", result: "DOUBLE" },
        changedAt: 100,
        deleted: false,
      }],
    ]));
    localStorage.setItem("kbl-sync-local-queue", JSON.stringify([
      ["kbl-current-season", {
        opId: "collided-local-op",
        key: "kbl-current-season",
        data: "2",
        changedAt: 100,
        deleted: false,
      }],
    ]));
    recordAppliedOp("user-1|collided-store-op", {
      target_table: "kbl_stores",
      target_key: `kbl-event-log|atBatEvents|${JSON.stringify("different-event")}`,
      changed_at: 100,
      deleted: false,
      payload_fingerprint: payloadFingerprint({ eventId: "different-event", result: "SINGLE" }),
    });
    recordAppliedOp("user-1|collided-local-op", {
      target_table: "kbl_local_storage",
      target_key: "kbl-app-state",
      changed_at: 100,
      deleted: false,
      payload_fingerprint: payloadFingerprint(JSON.stringify({ screen: "home" })),
    });

    const syncEngine = await loadFreshSyncEngine();
    await syncEngine.flush();

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      state: "error",
      pendingCount: 2,
    }));
    expect(
      mockState.cloudRows.find((row) => row.record_key === JSON.stringify("op-collision-new-event")),
    ).toBeUndefined();
    expect(mockState.localRows.find((row) => row.key === "kbl-current-season")).toBeUndefined();
  });

  test("duplicate op ids with mismatched payloads stay pending instead of clearing", async () => {
    localStorage.setItem("kbl-sync-queue", JSON.stringify([
      ["kbl-event-log|atBatEvents|\"same-target-payload-event\"", {
        opId: "same-target-store-op",
        dbName: "kbl-event-log",
        storeName: "atBatEvents",
        recordKey: JSON.stringify("same-target-payload-event"),
        data: { eventId: "same-target-payload-event", result: "DOUBLE" },
        changedAt: 100,
        deleted: false,
      }],
    ]));
    localStorage.setItem("kbl-sync-local-queue", JSON.stringify([
      ["kbl-current-season", {
        opId: "same-target-local-op",
        key: "kbl-current-season",
        data: "2",
        changedAt: 100,
        deleted: false,
      }],
    ]));
    recordAppliedOp("user-1|same-target-store-op", {
      target_table: "kbl_stores",
      target_key: `kbl-event-log|atBatEvents|${JSON.stringify("same-target-payload-event")}`,
      changed_at: 100,
      deleted: false,
      payload_fingerprint: payloadFingerprint({ eventId: "same-target-payload-event", result: "SINGLE" }),
    });
    recordAppliedOp("user-1|same-target-local-op", {
      target_table: "kbl_local_storage",
      target_key: "kbl-current-season",
      changed_at: 100,
      deleted: true,
      payload_fingerprint: payloadFingerprint({}),
    });

    const syncEngine = await loadFreshSyncEngine();
    await syncEngine.flush();

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      state: "error",
      pendingCount: 2,
    }));
  });

  test("atomic cloud writes reject stale live queue operations", async () => {
    const syncEngine = await loadFreshSyncEngine();
    mockState.cloudRows = [
      {
        id: "cloud-live-stale-upsert-target",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("live-stale-upsert"),
        data: { eventId: "live-stale-upsert", result: "TRIPLE" },
        changed_at: 20,
        deleted: false,
      },
      {
        id: "cloud-live-stale-delete-target",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("live-stale-delete"),
        data: { eventId: "live-stale-delete", result: "DOUBLE" },
        changed_at: 21,
        deleted: false,
      },
    ];
    mockState.localRows = [
      {
        user_id: "user-1",
        key: "kbl-current-season",
        data: "newer-season",
        changed_at: 22,
        deleted: false,
      },
    ];

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(10);
    syncEngine.upsert("kbl-event-log", "atBatEvents", "live-stale-upsert", {
      eventId: "live-stale-upsert",
      result: "SINGLE",
    });
    syncEngine.remove("kbl-event-log", "atBatEvents", "live-stale-delete");
    syncEngine.upsertLocal("kbl-current-season", "stale-season");
    nowSpy.mockRestore();

    await syncEngine.flush();

    expect(syncEngine.getStatus().pendingCount).toBe(3);
    expect(syncEngine.getStatus().error).toContain("cloud has newer rows");
    expect(mockState.cloudRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          record_key: JSON.stringify("live-stale-upsert"),
          data: expect.objectContaining({ result: "TRIPLE" }),
          changed_at: 20,
          deleted: false,
        }),
        expect.objectContaining({
          record_key: JSON.stringify("live-stale-delete"),
          data: expect.objectContaining({ result: "DOUBLE" }),
          changed_at: 21,
          deleted: false,
        }),
      ]),
    );
    expect(mockState.localRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "kbl-current-season",
          data: "newer-season",
          changed_at: 22,
          deleted: false,
        }),
      ]),
    );
  });

  test("commissioner room recovery republishes only the current snake room over its exact stale cloud base", async () => {
    const roomId = "league-recovery::startup-mlb-draft::1";
    const cloudRoom = {
      id: roomId,
      leagueId: "league-recovery",
      seasonNumber: 1,
      seed: "seed",
      workflowVersion: "snake-v2",
      engineMethodVersion: "snake-v2",
      tier: "standard" as const,
      balanceMode: "taxed" as const,
      rounds: 22,
      pickOrder: [
        { round: 1, pick: 1, teamId: "team-a" },
        { round: 1, pick: 2, teamId: "team-b" },
      ],
      completedPicks: [],
      currentPickIndex: 0,
      createdDate: "2026-07-17T12:00:00.000Z",
      lastModified: "2026-07-17T12:00:00.000Z",
      revision: 2,
    };
    const localRoom = {
      ...cloudRoom,
      pickOrder: [
        { round: 1, pick: 1, teamId: "team-b" },
        { round: 1, pick: 2, teamId: "team-a" },
      ],
      trades: [{ id: "trade-1", status: "executed" }],
      lastModified: "2026-07-17T12:05:00.000Z",
      revision: 4,
      companionRoomPublication: {
        formatVersion: "snake-companion-room-publication-v1" as const,
        publicationId: "publication-hotseat-recovery",
        supersedesRevision: 3,
        publishedRevision: 4,
        publishedAt: "2026-07-17T12:05:00.000Z",
      },
    };
    mockState.cloudRows = [
      {
        id: "cloud-room-row",
        user_id: "user-1",
        db_name: "kbl-league-builder",
        store_name: "mlbDraftSessions",
        record_key: JSON.stringify(roomId),
        data: cloudRoom,
        changed_at: 200,
        received_at: "2026-07-17T12:00:00.000Z",
        deleted: false,
      },
      {
        id: "cloud-unrelated-row",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("unrelated-stale-write"),
        data: { eventId: "unrelated-stale-write", result: "TRIPLE" },
        changed_at: 201,
        received_at: "2026-07-17T12:00:01.000Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(300);
    syncEngine.upsert("kbl-league-builder", "mlbDraftSessions", roomId, localRoom);
    syncEngine.upsert("kbl-event-log", "atBatEvents", "unrelated-stale-write", {
      eventId: "unrelated-stale-write",
      result: "SINGLE",
    });
    nowSpy.mockRestore();
    await syncEngine.flush();
    expect(syncEngine.getStatus().pendingCount).toBe(2);

    await syncEngine.publishCommissionerSnakeRoom(localRoom);

    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(mockState.cloudRows.find((row) => row.id === "cloud-room-row")?.data).toEqual(localRoom);
    expect(mockState.cloudRows.find((row) => row.id === "cloud-unrelated-row")?.data).toEqual({
      eventId: "unrelated-stale-write",
      result: "TRIPLE",
    });
  });

  test("commissioner publication releases a second device from only its legacy embedded-board room write", async () => {
    const leagueId = "league-second-device-recovery";
    const roomId = `${leagueId}::startup-mlb-draft::1`;
    const initialBoard = {
      slots: {},
      rankings: { global: ["player-old"] },
      revision: 1,
    } as unknown as import("../leagueBuilderStorage").SnakeSeatBoardRecord;
    const cloudRoom = {
      id: roomId,
      leagueId,
      seasonNumber: 1,
      seed: "seed",
      workflowVersion: "snake-v2",
      engineMethodVersion: "snake-v2",
      tier: "standard" as const,
      balanceMode: "taxed" as const,
      rounds: 22,
      pickOrder: [
        { round: 1, pick: 1, teamId: "team-a" },
        { round: 1, pick: 2, teamId: "team-b" },
      ],
      completedPicks: [],
      currentPickIndex: 0,
      seatBoards: { "team-a": initialBoard },
      snakeSetup: {
        poolPlayerIds: ["player-old", "player-new"],
        versionSelections: {},
        clubs: [
          { teamId: "team-a", hotseat: false },
          { teamId: "team-b", hotseat: true },
        ],
        orderSeed: "order",
      },
      snakeCompanions: {
        roomCode: "4821",
        claims: [{
          claimId: "claim-phone",
          claimVersion: 1,
          deviceId: "phone-device",
          gmName: "Alex",
          teamId: "team-a",
          status: "approved" as const,
        }],
      },
      createdDate: "2026-07-17T12:00:00.000Z",
      lastModified: "2026-07-17T12:00:00.000Z",
      revision: 2,
    };
    mockState.cloudRows = [
      {
        id: "cloud-second-device-room",
        user_id: "user-1",
        db_name: "kbl-league-builder",
        store_name: "mlbDraftSessions",
        record_key: JSON.stringify(roomId),
        data: cloudRoom,
        changed_at: 200,
        received_at: "2026-07-17T12:00:00.000Z",
        deleted: false,
      },
      {
        id: "cloud-second-device-unrelated",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("unrelated-second-device"),
        data: { eventId: "unrelated-second-device", result: "TRIPLE" },
        changed_at: 201,
        received_at: "2026-07-17T12:00:01.000Z",
        deleted: false,
      },
    ];

    // Companion device: pull the room, edit its private board, then reproduce
    // the retired pre-Contract-42 whole-room board queue entry.
    let syncEngine = await loadFreshSyncEngine();
    let storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });
    const companionRoom = await storage.patchMlbDraftSessionSeatBoard({
      leagueId,
      seasonNumber: 1,
      teamId: "team-a",
      expectedBoardRevision: 1,
      board: {
        ...initialBoard,
        rankings: { global: ["player-new"] },
        revision: 2,
      },
    });
    syncEngine.upsert("kbl-league-builder", "mlbDraftSessions", roomId, companionRoom);
    syncEngine.upsert("kbl-event-log", "atBatEvents", "unrelated-second-device", {
      eventId: "unrelated-second-device",
      result: "SINGLE",
    });
    expect(syncEngine.getStatus().pendingCount).toBe(3);
    syncEngine.destroy();
    storage.__resetLeagueBuilderDatabaseForTests();
    const companionLocalStorage = new Map<string, string>();
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key !== null) companionLocalStorage.set(key, localStorage.getItem(key) ?? "");
    }

    // Hotseat device: it has the already-completed trade and publishes that
    // exact room over the cloud row without seeing the companion's local queue.
    localStorage.clear();
    syncEngine = await loadFreshSyncEngine();
    const publishedRoom = {
      ...cloudRoom,
      pickOrder: [
        { round: 1, pick: 1, teamId: "team-b" },
        { round: 1, pick: 2, teamId: "team-a" },
      ],
      trades: [{
        id: "trade-second-device",
        atPickIndex: 0,
        humanTeamId: "team-a",
        cpuTeamId: "team-b",
        humanPickNumbers: [1],
        cpuPickNumbers: [2],
        humanValue: 100,
        cpuValue: 100,
        greedMargin: 0,
      }],
      lastModified: "2026-07-17T12:05:00.000Z",
      revision: 4,
      companionRoomPublication: {
        formatVersion: "snake-companion-room-publication-v1" as const,
        publicationId: "publication-second-device",
        supersedesRevision: 3,
        publishedRevision: 4,
        publishedAt: "2026-07-17T12:05:00.000Z",
      },
    };
    await syncEngine.publishCommissionerSnakeRoom(publishedRoom);
    syncEngine.destroy();

    // The unrelated cloud row also advances. Recovery must not clear that
    // companion-side pending write while adopting the published room.
    const unrelatedCloud = mockState.cloudRows.find((row) => row.id === "cloud-second-device-unrelated")!;
    unrelatedCloud.data = { eventId: "unrelated-second-device", result: "DOUBLE" };
    unrelatedCloud.changed_at = 999_999;
    unrelatedCloud.received_at = "2099-07-17T12:06:00.000Z";

    // Return to the companion device with its original durable queue and local
    // private board. Its normal poll must retire only the legacy room op.
    localStorage.clear();
    for (const [key, value] of companionLocalStorage) localStorage.setItem(key, value);
    syncEngine = await loadFreshSyncEngine();
    storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });
    await syncEngine.pull({ throwOnError: true });

    const recovered = await storage.getMlbDraftSession(leagueId, 1);
    expect(recovered?.pickOrder).toEqual(publishedRoom.pickOrder);
    expect(recovered?.trades).toEqual(publishedRoom.trades);
    expect(recovered?.seatBoards?.["team-a"].rankings.global).toEqual(["player-new"]);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(mockState.cloudRows.find((row) => row.id === "cloud-second-device-unrelated")?.data).toEqual({
      eventId: "unrelated-second-device",
      result: "DOUBLE",
    });
    syncEngine.destroy();
    storage.__resetLeagueBuilderDatabaseForTests();
  });

  test("commissioner publication does not discard an unpublished companion pick request", async () => {
    const leagueId = "league-recovery-unpublished-request";
    const roomId = `${leagueId}::startup-mlb-draft::1`;
    const initialBoard = {
      slots: {},
      rankings: { global: ["player-old"] },
      revision: 1,
    } as unknown as import("../leagueBuilderStorage").SnakeSeatBoardRecord;
    const baseRoom = {
      id: roomId,
      leagueId,
      seasonNumber: 1,
      seed: "seed",
      workflowVersion: "snake-v2",
      engineMethodVersion: "snake-v2",
      tier: "standard" as const,
      balanceMode: "taxed" as const,
      rounds: 22,
      pickOrder: [{ round: 1, pick: 1, teamId: "team-a" }],
      completedPicks: [],
      currentPickIndex: 0,
      seatBoards: { "team-a": initialBoard },
      snakeSetup: {
        poolPlayerIds: ["player-old", "player-new"],
        versionSelections: {},
        clubs: [{ teamId: "team-a", hotseat: false }],
        orderSeed: "order",
      },
      snakeCompanions: {
        roomCode: "4821",
        claims: [{
          claimId: "claim-phone",
          claimVersion: 1,
          deviceId: "phone-device",
          gmName: "Alex",
          teamId: "team-a",
          status: "approved" as const,
        }],
      },
      createdDate: "2026-07-17T12:00:00.000Z",
      lastModified: "2026-07-17T12:00:00.000Z",
      revision: 2,
    };
    mockState.cloudRows = [{
      id: "cloud-unpublished-request-room",
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "mlbDraftSessions",
      record_key: JSON.stringify(roomId),
      data: baseRoom,
      changed_at: 200,
      received_at: "2026-07-17T12:00:00.000Z",
      deleted: false,
    }];
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });
    const companionRoom = await storage.patchMlbDraftSessionSeatBoard({
      leagueId,
      seasonNumber: 1,
      teamId: "team-a",
      expectedBoardRevision: 1,
      board: {
        ...initialBoard,
        rankings: { global: ["player-new"] },
        revision: 2,
      },
    });
    const queuedWithRequest = {
      ...companionRoom,
      snakeCompanions: {
        ...companionRoom.snakeCompanions!,
        pickRequest: {
          id: "unpublished-request",
          teamId: "team-a",
          playerId: "player-new",
          pick: 1,
          submittedAt: companionRoom.lastModified,
          deviceId: "phone-device",
          claimId: "claim-phone",
          sessionRevision: 2,
        },
      },
      revision: 3,
    };
    syncEngine.upsert("kbl-league-builder", "mlbDraftSessions", roomId, queuedWithRequest);

    const publishedRoom = {
      ...baseRoom,
      revision: 4,
      lastModified: "2026-07-17T12:05:00.000Z",
      companionRoomPublication: {
        formatVersion: "snake-companion-room-publication-v1" as const,
        publicationId: "publication-without-request",
        supersedesRevision: 3,
        publishedRevision: 4,
        publishedAt: "2026-07-17T12:05:00.000Z",
      },
    };
    mockState.cloudRows[0] = {
      ...mockState.cloudRows[0],
      data: publishedRoom,
      changed_at: 500,
      received_at: "2026-07-17T12:05:00.000Z",
    };

    await syncEngine.pull({ throwOnError: true });
    await syncEngine.pull({ throwOnError: true });

    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect((await storage.getMlbDraftSession(leagueId, 1))?.companionRoomPublication).toBeUndefined();
    syncEngine.destroy();
    storage.__resetLeagueBuilderDatabaseForTests();
  });

  test("commissioner publication does not resurrect an offer after an unpublished companion decline", async () => {
    const leagueId = "league-recovery-unpublished-decline";
    const roomId = `${leagueId}::startup-mlb-draft::1`;
    const initialBoard = {
      slots: {},
      rankings: { global: ["player-old"] },
      revision: 1,
    } as unknown as import("../leagueBuilderStorage").SnakeSeatBoardRecord;
    const openOffer = {
      id: "offer-unpublished-decline",
      phase: "MLB" as const,
      buyerTeamId: "team-a",
      sellerTeamId: "team-b",
      targetPick: 2,
      offerPickNumbers: [1],
      receivePickNumbers: [2],
      offerValue: 100,
      receiveValue: 100,
      sellerPremium: 0,
      postedSessionRevision: 1,
      buyerNod: true,
      sellerNod: false,
      postedAt: "2026-07-17T12:00:00.000Z",
    };
    const baseRoom = {
      id: roomId,
      leagueId,
      seasonNumber: 1,
      seed: "seed",
      workflowVersion: "snake-v2",
      engineMethodVersion: "snake-v2",
      tier: "standard" as const,
      balanceMode: "taxed" as const,
      rounds: 22,
      pickOrder: [
        { round: 1, pick: 1, teamId: "team-a" },
        { round: 1, pick: 2, teamId: "team-b" },
      ],
      completedPicks: [],
      currentPickIndex: 0,
      seatBoards: { "team-a": initialBoard },
      snakeSetup: {
        poolPlayerIds: ["player-old", "player-new"],
        versionSelections: {},
        clubs: [
          { teamId: "team-a", hotseat: false },
          { teamId: "team-b", hotseat: true },
        ],
        orderSeed: "order",
      },
      snakeCompanions: {
        roomCode: "4821",
        claims: [{
          claimId: "claim-phone",
          claimVersion: 1,
          deviceId: "phone-device",
          gmName: "Alex",
          teamId: "team-a",
          status: "approved" as const,
        }],
      },
      openTradeOffers: [openOffer],
      createdDate: "2026-07-17T12:00:00.000Z",
      lastModified: "2026-07-17T12:00:00.000Z",
      revision: 2,
    };
    mockState.cloudRows = [{
      id: "cloud-unpublished-decline-room",
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "mlbDraftSessions",
      record_key: JSON.stringify(roomId),
      data: baseRoom,
      changed_at: 200,
      received_at: "2026-07-17T12:00:00.000Z",
      deleted: false,
    }];
    const syncEngine = await loadFreshSyncEngine();
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    await syncEngine.pull({ throwOnError: true });

    const declineClock = vi.spyOn(Date, "now").mockReturnValue(300);
    const declined = await storage.respondApprovedCompanionTradeOffer({
      leagueId,
      seasonNumber: 1,
      deviceId: "phone-device",
      teamId: "team-a",
      offerId: openOffer.id,
      action: "DECLINE",
    });
    declineClock.mockRestore();
    expect(declined.openTradeOffers).toEqual([]);
    expect(declined.revision).toBe(3);

    // A later ordinary board edit creates the same newer standalone-board
    // evidence that exposed the false-positive retirement in audit.
    const boardClock = vi.spyOn(Date, "now").mockReturnValue(400);
    await storage.patchMlbDraftSessionSeatBoard({
      leagueId,
      seasonNumber: 1,
      teamId: "team-a",
      expectedBoardRevision: 1,
      board: {
        ...initialBoard,
        rankings: { global: ["player-new"] },
        revision: 2,
      },
    });
    boardClock.mockRestore();

    const publishedRoom = {
      ...baseRoom,
      revision: 4,
      lastModified: "2026-07-17T12:05:00.000Z",
      companionRoomPublication: {
        formatVersion: "snake-companion-room-publication-v1" as const,
        publicationId: "publication-with-still-open-offer",
        supersedesRevision: 3,
        publishedRevision: 4,
        publishedAt: "2026-07-17T12:05:00.000Z",
      },
    };
    mockState.cloudRows[0] = {
      ...mockState.cloudRows[0],
      data: publishedRoom,
      changed_at: 500,
      received_at: "2026-07-17T12:05:00.000Z",
    };

    await syncEngine.pull({ throwOnError: true });
    await syncEngine.pull({ throwOnError: true });

    const stillDeclined = await storage.getMlbDraftSession(leagueId, 1);
    expect(stillDeclined?.openTradeOffers).toEqual([]);
    expect(stillDeclined?.companionRoomPublication).toBeUndefined();
    expect(syncEngine.getStatus().pendingCount).toBe(1);
    syncEngine.destroy();
    storage.__resetLeagueBuilderDatabaseForTests();
  });

  test("commissioner room recovery fails closed and retains the pending room write when the atomic publish is rejected", async () => {
    const room = {
      id: "league-recovery-fail::startup-mlb-draft::1",
      leagueId: "league-recovery-fail",
      seasonNumber: 1,
      seed: "seed",
      workflowVersion: "snake-v2",
      engineMethodVersion: "snake-v2",
      tier: "standard" as const,
      balanceMode: "taxed" as const,
      rounds: 22,
      pickOrder: [{ round: 1, pick: 1, teamId: "team-a" }],
      completedPicks: [],
      currentPickIndex: 0,
      createdDate: "2026-07-17T12:00:00.000Z",
      lastModified: "2026-07-17T12:05:00.000Z",
      revision: 4,
      companionRoomPublication: {
        formatVersion: "snake-companion-room-publication-v1" as const,
        publicationId: "publication-hotseat-recovery-fail",
        supersedesRevision: 3,
        publishedRevision: 4,
        publishedAt: "2026-07-17T12:05:00.000Z",
      },
    };
    mockState.cloudRows = [{
      id: "cloud-room-fail-row",
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "mlbDraftSessions",
      record_key: JSON.stringify(room.id),
      data: { ...room, revision: 2 },
      changed_at: 200,
      received_at: "2026-07-17T12:00:00.000Z",
      deleted: false,
    }];
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.upsert("kbl-league-builder", "mlbDraftSessions", room.id, room);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
    mockState.nextRpcResponse = {
      table: "kbl_stores",
      data: [{ row_index: 0, status: "skipped" }],
    };

    await expect(syncEngine.publishCommissionerSnakeRoom(room)).rejects.toThrow(/rejected|stale/i);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(mockState.cloudRows[0].data).toEqual(expect.objectContaining({ revision: 2 }));
  });

  test("commissioner room recovery refuses to overwrite unseen cloud companion activity", async () => {
    const roomId = "league-recovery-cloud-intent::startup-mlb-draft::1";
    const approvedClaim = {
      claimId: "claim-cloud-intent",
      claimVersion: 1,
      deviceId: "phone-device",
      gmName: "Alex",
      teamId: "team-a",
      status: "approved" as const,
    };
    const cloudRoom = {
      id: roomId,
      leagueId: "league-recovery-cloud-intent",
      seasonNumber: 1,
      seed: "seed",
      workflowVersion: "snake-v2",
      engineMethodVersion: "snake-v2",
      tier: "standard" as const,
      balanceMode: "taxed" as const,
      rounds: 22,
      pickOrder: [{ round: 1, pick: 1, teamId: "team-a" }],
      completedPicks: [],
      currentPickIndex: 0,
      snakeSetup: {
        poolPlayerIds: ["player-requested"],
        versionSelections: {},
        clubs: [{ teamId: "team-a", hotseat: false }],
        orderSeed: "order",
      },
      snakeCompanions: {
        roomCode: "4821",
        claims: [approvedClaim],
        pickRequest: {
          id: "cloud-only-request",
          teamId: "team-a",
          playerId: "player-requested",
          pick: 1,
          submittedAt: "2026-07-17T12:04:00.000Z",
          deviceId: "phone-device",
          claimId: "claim-cloud-intent",
          sessionRevision: 2,
        },
      },
      createdDate: "2026-07-17T12:00:00.000Z",
      lastModified: "2026-07-17T12:04:00.000Z",
      revision: 3,
    };
    const localRoom = {
      ...cloudRoom,
      snakeCompanions: {
        roomCode: "4821",
        claims: [approvedClaim],
      },
      lastModified: "2026-07-17T12:05:00.000Z",
      revision: 4,
      companionRoomPublication: {
        formatVersion: "snake-companion-room-publication-v1" as const,
        publicationId: "publication-missing-cloud-intent",
        supersedesRevision: 3,
        publishedRevision: 4,
        publishedAt: "2026-07-17T12:05:00.000Z",
      },
    };
    mockState.cloudRows = [{
      id: "cloud-room-with-unseen-intent",
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "mlbDraftSessions",
      record_key: JSON.stringify(roomId),
      data: cloudRoom,
      changed_at: 300,
      received_at: "2026-07-17T12:04:00.000Z",
      deleted: false,
    }];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.publishCommissionerSnakeRoom(localRoom)).rejects.toThrow(
      /new companion activity/i,
    );
    expect(mockState.cloudRows[0].data).toEqual(cloudRoom);
  });

  test("equal-millisecond writes advance with a monotonic timestamp instead of skipping forever", async () => {
    localStorage.setItem("kbl-sync-device-id", "device-equal-ms");
    mockState.cloudRows = [
      {
        id: "equal-ms-existing-row",
        user_id: "user-1",
        db_name: "kbl-tracker",
        store_name: "completedGames",
        record_key: JSON.stringify("equal-ms-game"),
        data: { gameId: "equal-ms-game", activityLog: ["cloud v1"] },
        changed_at: 100,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.pull({ throwOnError: true });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(100);
    syncEngine.upsert("kbl-tracker", "completedGames", "equal-ms-game", {
      gameId: "equal-ms-game",
      activityLog: ["local v2"],
    });
    syncEngine.upsertLocal("kbl-current-season", "equal-ms-season");
    nowSpy.mockRestore();

    await syncEngine.flush();

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(
      mockState.cloudRows.find((row) => row.record_key === JSON.stringify("equal-ms-game")),
    ).toEqual(expect.objectContaining({
      data: expect.objectContaining({ activityLog: ["local v2"] }),
      changed_at: 101,
    }));
    expect(mockState.localRows.find((row) => row.key === "kbl-current-season")).toEqual(
      expect.objectContaining({ data: "equal-ms-season", changed_at: 102 }),
    );
  });

  test("malformed atomic RPC success responses keep writes pending", async () => {
    const syncEngine = await loadFreshSyncEngine();
    mockState.nextRpcResponse = { table: "kbl_stores", data: [] };

    syncEngine.upsert("kbl-event-log", "atBatEvents", "malformed-rpc-event", {
      eventId: "malformed-rpc-event",
      result: "DOUBLE",
    });
    await syncEngine.flush();

    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(syncEngine.getStatus().error).toContain("invalid or incomplete success response");
    expect(mockState.cloudRows.find((row) => row.record_key === JSON.stringify("malformed-rpc-event"))).toBeUndefined();
  });

  test("queue persistence failures surface as sync errors and diagnostics warnings", async () => {
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-queue") {
        throw new Error("quota exceeded intentionally");
      }
      return originalSetItem.call(this, key, value);
    });

    syncEngine.upsert("kbl-event-log", "atBatEvents", "quota-event", {
      eventId: "quota-event",
      gameId: "quota-game",
      result: "SINGLE",
    });

    expect(syncEngine.getStatus()).toEqual(
      expect.objectContaining({
        state: "error",
        pendingCount: 1,
        error: expect.stringContaining("Sync queue persistence failed"),
      }),
    );

    const diagnostics = await syncEngine.getDiagnostics();
    expect(diagnostics.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Sync queue persistence failed"),
      ]),
    );
  });

  test("quota recovery evicts only rebuildable bases and drains every queued record", async () => {
    const syncEngine = await loadFreshSyncEngine();
    localStorage.setItem("kbl-sync-queue", "old-durable-queue-occupying-quota");
    localStorage.setItem("kbl-sync-store-write-bases", JSON.stringify([
      ["derived-base", { receivedAt: "2026-07-18T00:00:00.000Z", id: "derived-row" }],
    ]));
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-queue" && this.getItem("kbl-sync-store-write-bases")) {
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      if (key === "kbl-sync-store-write-bases" && this.getItem("kbl-sync-queue")) {
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    syncEngine.upsert("kbl-event-log", "atBatEvents", "quota-recovery-1", {
      eventId: "quota-recovery-1",
      result: "SINGLE",
    });
    syncEngine.upsert("kbl-event-log", "atBatEvents", "quota-recovery-2", {
      eventId: "quota-recovery-2",
      result: "DOUBLE",
    });

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      state: "error",
      pendingCount: 2,
      error: expect.stringContaining("exceeded the quota"),
      quotaRecoveryAvailable: true,
    }));

    // The first cloud batch fails transiently. Recovery must continue from
    // the still-durable queue rather than requiring another browser click.
    mockState.failNextUpsertTable = "kbl_stores";
    await syncEngine.recoverQuotaBlockedQueue();

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      pendingCount: 0,
      quotaRecoveryAvailable: false,
    }));
    expect(mockState.cloudRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ record_key: JSON.stringify("quota-recovery-1"), deleted: false }),
      expect.objectContaining({ record_key: JSON.stringify("quota-recovery-2"), deleted: false }),
    ]));
    expect(localStorage.getItem("kbl-sync-queue")).toBeNull();
  });

  test("partial quota recovery stays resumable without dropping a genuine stale write", async () => {
    mockState.localRows.push({
      user_id: "user-1",
      key: "kbl-app-state",
      data: { selectedLeague: "cloud-newer" },
      changed_at: Date.now() + 10_000,
      received_at: "2026-07-18T18:00:00.000Z",
      deleted: false,
    });
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    let rejectFirstQueueSave = true;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-local-queue" && rejectFirstQueueSave) {
        rejectFirstQueueSave = false;
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    syncEngine.upsertLocal("kbl-app-state", { selectedLeague: "local-pending" });
    expect(syncEngine.getStatus().quotaRecoveryAvailable).toBe(true);

    await expect(syncEngine.recoverQuotaBlockedQueue()).rejects.toThrow(
      "paused safely with 1 pending operation",
    );

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      pendingCount: 1,
      quotaRecoveryAvailable: true,
      protectedConflictCount: 1,
      error: expect.stringContaining("not exact matches across this device and cloud"),
    }));
    expect(localStorage.getItem("kbl-sync-local-queue")).toContain("kbl-app-state");
    expect(mockState.localRows[0]).toEqual(expect.objectContaining({
      data: { selectedLeague: "cloud-newer" },
    }));
  });

  test("quota recovery retires an exact localStorage state already present in newer cloud", async () => {
    mockState.localRows.push({
      user_id: "user-1",
      key: "kbl-app-state",
      data: JSON.stringify({ selectedLeague: "same-league" }),
      changed_at: Date.now() + 10_000,
      received_at: "2026-07-18T18:05:00.000Z",
      deleted: false,
    });
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    let rejectFirstQueueSave = true;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-local-queue" && rejectFirstQueueSave) {
        rejectFirstQueueSave = false;
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    localStorage.setItem("kbl-app-state", JSON.stringify({ selectedLeague: "same-league" }));
    syncEngine.upsertLocal("kbl-app-state", { selectedLeague: "same-league" });
    expect(syncEngine.getStatus().quotaRecoveryAvailable).toBe(true);

    await syncEngine.recoverQuotaBlockedQueue();

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      pendingCount: 0,
      protectedConflictCount: 0,
      quotaRecoveryAvailable: false,
      error: null,
    }));
    expect(localStorage.getItem("kbl-sync-local-queue")).toBeNull();
    expect(mockState.localRows).toHaveLength(1);
    expect(mockState.localRows[0]).toEqual(expect.objectContaining({
      data: JSON.stringify({ selectedLeague: "same-league" }),
      changed_at: expect.any(Number),
    }));
  });

  test("quota recovery retires exact rows and publishes still-current queued rows over their exact cloud bases", async () => {
    const now = Date.now();
    mockState.cloudRows.push(
      {
        id: "cloud-exact-restored-event",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("exact-restored-event"),
        data: { eventId: "exact-restored-event", result: "DOUBLE" },
        changed_at: now + 10_000,
        received_at: "2026-07-18T18:10:00.000Z",
        deleted: false,
      },
      {
        id: "cloud-different-restored-event",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("different-restored-event"),
        data: { eventId: "different-restored-event", result: "HOME_RUN" },
        changed_at: now + 10_001,
        received_at: "2026-07-18T18:10:01.000Z",
        deleted: false,
      },
    );
    const syncEngine = await loadFreshSyncEngine();
    await putAtBatEventRecord({
      eventId: "exact-restored-event",
      result: "DOUBLE",
    });
    await putAtBatEventRecord({
      eventId: "different-restored-event",
      result: "SINGLE",
    });
    const originalSetItem = Storage.prototype.setItem;
    let rejectedQueueSaves = 0;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-queue" && rejectedQueueSaves < 2) {
        rejectedQueueSaves += 1;
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    syncEngine.upsert("kbl-event-log", "atBatEvents", "exact-restored-event", {
      eventId: "exact-restored-event",
      result: "DOUBLE",
    });
    syncEngine.upsert("kbl-event-log", "atBatEvents", "different-restored-event", {
      eventId: "different-restored-event",
      result: "SINGLE",
    });

    await syncEngine.recoverQuotaBlockedQueue();

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      pendingCount: 0,
      protectedConflictCount: 0,
      quotaRecoveryAvailable: false,
    }));
    const durableQueue = localStorage.getItem("kbl-sync-queue");
    expect(durableQueue).toBeNull();
    expect(mockState.cloudRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        record_key: JSON.stringify("exact-restored-event"),
        data: { eventId: "exact-restored-event", result: "DOUBLE" },
      }),
      expect.objectContaining({
        record_key: JSON.stringify("different-restored-event"),
        data: { eventId: "different-restored-event", result: "SINGLE" },
      }),
    ]));
  });

  test("quota recovery publishes a still-current queued localStorage value over its exact cloud base", async () => {
    mockState.localRows.push({
      user_id: "user-1",
      key: "kbl-app-state",
      data: JSON.stringify({ selectedLeague: "cloud-league" }),
      changed_at: Date.now() + 10_000,
      received_at: "2026-07-18T18:12:00.000Z",
      deleted: false,
    });
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    let rejectFirstQueueSave = true;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-local-queue" && rejectFirstQueueSave) {
        rejectFirstQueueSave = false;
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    localStorage.setItem("kbl-app-state", JSON.stringify({ selectedLeague: "local-league" }));
    syncEngine.upsertLocal("kbl-app-state", { selectedLeague: "local-league" });

    await syncEngine.recoverQuotaBlockedQueue();

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      pendingCount: 0,
      protectedConflictCount: 0,
      quotaRecoveryAvailable: false,
    }));
    expect(localStorage.getItem("kbl-sync-local-queue")).toBeNull();
    expect(mockState.localRows).toEqual([
      expect.objectContaining({
        key: "kbl-app-state",
        data: JSON.stringify({ selectedLeague: "local-league" }),
        deleted: false,
      }),
    ]);
  });

  test("quota recovery drains only rebased identities and keeps a locally obsolete peer protected", async () => {
    const now = Date.now();
    mockState.cloudRows.push({
      id: "cloud-safe-rebase",
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify("safe-rebase"),
      data: { eventId: "safe-rebase", result: "SINGLE" },
      changed_at: now + 10_000,
      received_at: "2026-07-18T19:00:00.000Z",
      deleted: false,
    });
    await putAtBatEventRecord({ eventId: "safe-rebase", result: "DOUBLE" });
    await putAtBatEventRecord({ eventId: "obsolete-peer", result: "TRIPLE" });
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    let rejectedQueueSaves = 0;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-queue" && rejectedQueueSaves < 2) {
        rejectedQueueSaves += 1;
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });
    syncEngine.upsert("kbl-event-log", "atBatEvents", "safe-rebase", {
      eventId: "safe-rebase",
      result: "DOUBLE",
    });
    syncEngine.upsert("kbl-event-log", "atBatEvents", "obsolete-peer", {
      eventId: "obsolete-peer",
      result: "SINGLE",
    });
    mockState.failNextUpsertTable = "kbl_stores";
    mockState.nextRpcResponse = {
      table: "kbl_stores",
      data: null,
      error: { message: "second transient failure" },
    };

    await expect(syncEngine.recoverQuotaBlockedQueue()).rejects.toThrow(
      "1 operation(s) are not exact matches across this device and cloud and remain protected",
    );

    expect(mockState.cloudRows.some((row) =>
      row.record_key === JSON.stringify("obsolete-peer")
      && (row.data as { result?: string }).result === "SINGLE"
    )).toBe(false);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
  });

  test("quota recovery does not tombstone a live snake room with unseen companion intent", async () => {
    const leagueId = "audit-room-delete";
    const roomId = `${leagueId}::startup-mlb-draft::1`;
    const cloudRoom = {
      id: roomId,
      leagueId,
      seasonNumber: 1,
      seed: "audit-seed",
      workflowVersion: "audit",
      engineMethodVersion: "audit",
      tier: "Standard" as const,
      balanceMode: "taxed" as const,
      rounds: 22,
      pickOrder: [{ round: 1, pick: 1, teamId: "team-a" }],
      completedPicks: [],
      currentPickIndex: 0,
      snakeCompanions: {
        roomCode: "4821",
        claims: [{
          claimId: "unseen-claim",
          claimVersion: 1,
          deviceId: "phone",
          gmName: "Alex",
          teamId: "team-a",
          status: "pending" as const,
        }],
      },
      createdDate: "2026-07-18T19:00:00.000Z",
      lastModified: "2026-07-18T19:00:00.000Z",
      revision: 1,
    };
    mockState.cloudRows.push({
      id: "cloud-room-delete",
      user_id: "user-1",
      db_name: "kbl-league-builder",
      store_name: "mlbDraftSessions",
      record_key: JSON.stringify(roomId),
      data: cloudRoom,
      changed_at: 100,
      received_at: "2026-07-18T19:00:00.000Z",
      deleted: false,
    });
    const storage = await import("../leagueBuilderStorage");
    await storage.initLeagueBuilderDatabase();
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    let rejectFirstQueueSave = true;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-queue" && rejectFirstQueueSave) {
        rejectFirstQueueSave = false;
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });
    syncEngine.remove("kbl-league-builder", "mlbDraftSessions", roomId);
    mockState.failNextUpsertTable = "kbl_stores";
    mockState.nextRpcResponse = {
      table: "kbl_stores",
      data: null,
      error: { message: "second transient failure" },
    };

    await expect(syncEngine.recoverQuotaBlockedQueue()).rejects.toThrow(
      "1 operation(s) are not exact matches across this device and cloud and remain protected",
    );

    expect(mockState.cloudRows[0]).toEqual(expect.objectContaining({ deleted: false }));
    expect(syncEngine.getStatus().pendingCount).toBe(1);
    syncEngine.destroy();
    storage.__resetLeagueBuilderDatabaseForTests();
  });

  test("quota recovery keeps current local intent queued when cloud changes after its rebase snapshot", async () => {
    const localData = { eventId: "rebase-race-event", result: "DOUBLE" };
    mockState.cloudRows.push({
      id: "cloud-rebase-race-event",
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify("rebase-race-event"),
      data: { eventId: "rebase-race-event", result: "SINGLE" },
      changed_at: 100,
      received_at: "2026-07-18T18:13:00.000Z",
      deleted: false,
    });
    await putAtBatEventRecord(localData);
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    let rejectFirstQueueSave = true;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-queue" && rejectFirstQueueSave) {
        rejectFirstQueueSave = false;
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });
    syncEngine.upsert("kbl-event-log", "atBatEvents", "rebase-race-event", localData);

    let storeSelects = 0;
    mockState.afterSelect = (table) => {
      if (table !== "kbl_stores") return;
      storeSelects += 1;
      if (storeSelects === 2) {
        mockState.cloudRows[0] = {
          ...mockState.cloudRows[0],
          data: { eventId: "rebase-race-event", result: "HOME_RUN" },
          changed_at: 10_000,
          received_at: "2026-07-18T18:13:30.000Z",
        };
      }
    };

    await expect(syncEngine.recoverQuotaBlockedQueue()).rejects.toThrow(
      "1 operation(s) are not exact matches across this device and cloud and remain protected",
    );

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      pendingCount: 1,
      protectedConflictCount: 1,
    }));
    expect(localStorage.getItem("kbl-sync-queue")).toContain("rebase-race-event");
    expect(mockState.cloudRows[0]).toEqual(expect.objectContaining({
      data: { eventId: "rebase-race-event", result: "HOME_RUN" },
    }));
  });

  test("quota recovery preserves a cloud-matching queue entry when its current local source changed", async () => {
    const cloudData = { eventId: "source-drift-event", result: "DOUBLE" };
    mockState.cloudRows.push({
      id: "cloud-source-drift-event",
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify("source-drift-event"),
      data: cloudData,
      changed_at: Date.now() + 10_000,
      received_at: "2026-07-18T18:15:00.000Z",
      deleted: false,
    });
    await putAtBatEventRecord(cloudData);
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    let rejectFirstQueueSave = true;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-queue" && rejectFirstQueueSave) {
        rejectFirstQueueSave = false;
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    syncEngine.upsert("kbl-event-log", "atBatEvents", "source-drift-event", cloudData);
    await putAtBatEventRecord({ eventId: "source-drift-event", result: "TRIPLE" });

    await expect(syncEngine.recoverQuotaBlockedQueue()).rejects.toThrow(
      "not exact matches across this device and cloud",
    );

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      pendingCount: 1,
      protectedConflictCount: 1,
    }));
    expect(mockState.cloudRows[0]).toEqual(expect.objectContaining({ data: cloudData }));
    const localFingerprints = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const request = indexedDB.open("kbl-event-log");
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("atBatEvents", "readonly");
        const getAll = tx.objectStore("atBatEvents").getAll();
        getAll.onsuccess = () => {
          db.close();
          resolve(getAll.result as Array<Record<string, unknown>>);
        };
        getAll.onerror = () => reject(getAll.error);
      };
      request.onerror = () => reject(request.error);
    });
    expect(localFingerprints).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventId: "source-drift-event", result: "TRIPLE" }),
    ]));
  });

  test("exact reconciliation keeps its queue when the signed-in account changes", async () => {
    const exactData = { eventId: "account-switch-recovery", result: "DOUBLE" };
    mockState.cloudRows.push({
      id: "cloud-account-switch-recovery",
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify("account-switch-recovery"),
      data: exactData,
      changed_at: Date.now() + 10_000,
      received_at: "2026-07-18T18:20:00.000Z",
      deleted: false,
    });
    await putAtBatEventRecord(exactData);
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    let rejectFirstQueueSave = true;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-queue" && rejectFirstQueueSave) {
        rejectFirstQueueSave = false;
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });
    syncEngine.upsert("kbl-event-log", "atBatEvents", "account-switch-recovery", exactData);
    mockState.afterSelect = (table) => {
      if (table === "kbl_stores") mockState.sessionUserId = "user-2";
    };

    await expect(syncEngine.recoverQuotaBlockedQueue()).rejects.toThrow(
      "signed-in account changed during sync",
    );

    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(localStorage.getItem("kbl-sync-queue")).toContain("account-switch-recovery");
    expect(mockState.cloudRows[0]).toEqual(expect.objectContaining({ data: exactData }));
  });

  test("quota recovery never drains a captured account queue after the signed-in account changes", async () => {
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    let rejectFirstQueueSave = true;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-queue" && rejectFirstQueueSave) {
        rejectFirstQueueSave = false;
        throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    syncEngine.upsert("kbl-event-log", "atBatEvents", "account-switch-before-drain", {
      eventId: "account-switch-before-drain",
      result: "DOUBLE",
    });
    expect(syncEngine.getStatus().quotaRecoveryAvailable).toBe(true);

    let sessionReads = 0;
    mockState.afterGetSession = (userId) => {
      sessionReads += 1;
      if (sessionReads === 1 && userId === "user-1") {
        mockState.sessionUserId = "user-2";
      }
    };

    await expect(syncEngine.recoverQuotaBlockedQueue()).rejects.toThrow(
      "signed-in account changed during sync",
    );

    expect(sessionReads).toBeGreaterThanOrEqual(2);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(localStorage.getItem("kbl-sync-queue")).toContain("account-switch-before-drain");
    expect(mockState.cloudRows).toEqual([]);
  });

  test("a reloaded large restored queue without bases still exposes safe recovery", async () => {
    const entries = Array.from({ length: 100 }, (_, index) => {
      const op = {
        opId: `restored-op-${index}`,
        dbName: "kbl-event-log",
        storeName: "atBatEvents",
        recordKey: JSON.stringify(`restored-event-${index}`),
        data: { eventId: `restored-event-${index}` },
        changedAt: index + 1,
        deleted: false,
      };
      return [`kbl-event-log|atBatEvents|${op.recordKey}`, op] as const;
    });
    localStorage.setItem("kbl-sync-queue", JSON.stringify(entries));

    const syncEngine = await loadFreshSyncEngine();

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      pendingCount: 100,
      quotaRecoveryAvailable: true,
    }));

    await syncEngine.recoverQuotaBlockedQueue();

    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      pendingCount: 0,
      quotaRecoveryAvailable: false,
    }));
    expect(mockState.cloudRows).toHaveLength(100);
  });

  test("auth loss before cursor save leaves restored write bases durable and fails closed", async () => {
    const cloudRow: StoreRow = {
      id: "cloud-auth-loss-event",
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify("auth-loss-event"),
      data: { eventId: "auth-loss-event", result: "DOUBLE" },
      changed_at: 50,
      received_at: "2026-07-18T12:00:00.000Z",
      deleted: false,
    };
    mockState.cloudRows.push(cloudRow);
    const baseIdentity = [
      "kbl-event-log",
      "atBatEvents",
      JSON.stringify("auth-loss-event"),
    ].join("\u0000");
    const persistedBases = JSON.stringify([
      [baseIdentity, { receivedAt: cloudRow.received_at, id: cloudRow.id }],
    ]);
    localStorage.setItem("kbl-sync-store-write-bases", persistedBases);
    const syncEngine = await loadFreshSyncEngine();
    mockState.afterSelect = (table) => {
      if (table === "kbl_local_storage") mockState.sessionUserId = null;
    };

    await expect(syncEngine.pull({ throwOnError: true })).rejects.toThrow(
      "signed out during sync",
    );

    expect(mockState.metaRows).toHaveLength(0);
    expect(localStorage.getItem("kbl-sync-store-write-bases")).toBe(persistedBases);
  });

  test("strict incremental store flush rejects when accepted write bases cannot be persisted", async () => {
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-store-write-bases") {
        throw new Error("store write-base quota exceeded intentionally");
      }
      return originalSetItem.call(this, key, value);
    });

    syncEngine.upsert("kbl-event-log", "atBatEvents", "accepted-store-no-base-cache", {
      eventId: "accepted-store-no-base-cache",
      gameId: "game-store-no-base-cache",
      result: "DOUBLE",
    });

    await expect(syncEngine.flush({ throwOnPending: true })).rejects.toThrow(
      "Sync write-base persistence failed",
    );
    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      state: "error",
      pendingCount: 0,
      error: expect.stringContaining("Sync write-base persistence failed"),
    }));
    expect(mockState.cloudRows.find((row) => row.record_key === JSON.stringify("accepted-store-no-base-cache"))).toEqual(
      expect.objectContaining({ deleted: false }),
    );
  });

  test("strict incremental localStorage flush rejects when accepted write bases cannot be persisted", async () => {
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-local-write-bases") {
        throw new Error("local write-base quota exceeded intentionally");
      }
      return originalSetItem.call(this, key, value);
    });

    localStorage.setItem("kbl-current-season", "strict-local-base");
    syncEngine.upsertLocal("kbl-current-season", "strict-local-base");

    await expect(syncEngine.flush({ throwOnPending: true })).rejects.toThrow(
      "Sync write-base persistence failed",
    );
    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      state: "error",
      pendingCount: 0,
      error: expect.stringContaining("Sync write-base persistence failed"),
    }));
    expect(mockState.localRows.find((row) => row.key === "kbl-current-season")).toEqual(
      expect.objectContaining({ data: "strict-local-base", deleted: false }),
    );
  });

  test("in-flight drains count as pending and block sync-complete", async () => {
    const syncEngine = await loadFreshSyncEngine();
    const completeSpy = vi.fn();
    window.addEventListener("sync-complete", completeSpy);

    mockState.blockNextSelect("kbl_stores");
    const pullPromise = syncEngine.pull();
    await mockState.blockedSelectStarted;

    syncEngine.upsert("kbl-tracker", "completedGames", "in-flight-pending-game", {
      gameId: "in-flight-pending-game",
      date: 9001,
    });
    mockState.blockNextUpsert("kbl_stores");
    const flushPromise = syncEngine.flush();
    await mockState.blockedUpsertStarted;

    expect(syncEngine.getStatus().pendingCount).toBe(1);
    await expect(syncEngine.getDiagnostics()).resolves.toEqual(
      expect.objectContaining({ pendingCount: 1 }),
    );

    mockState.releaseBlockedSelect?.();
    await pullPromise;

    expect(completeSpy).not.toHaveBeenCalled();

    mockState.releaseBlockedUpsert?.();
    await flushPromise;
    window.removeEventListener("sync-complete", completeSpy);

    expect(syncEngine.getStatus().pendingCount).toBe(0);
  });

  test("replaceCloudWithLocal fails loudly when a cloud store batch is rejected", async () => {
    await seedCompletedGameWithEventLog("game-failed-upload");
    mockState.failNextUpsertTable = "kbl_stores";
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "kbl_stores upsert failed intentionally",
    );
    expect(syncEngine.getStatus().state).toBe("error");
  });

  test("replaceCloudWithLocal fails closed instead of tombstoning cloud rows when a local store read fails", async () => {
    await seedCompletedGameWithEventLog("game-read-failure");
    mockState.cloudRows = [
      {
        id: "remote-existing-header",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "gameHeaders",
        record_key: JSON.stringify("game-read-failure"),
        data: { gameId: "game-read-failure", eventCount: 2 },
        changed_at: 10,
        deleted: false,
      },
    ];
    const originalGetAll = IDBObjectStore.prototype.getAll;
    vi.spyOn(IDBObjectStore.prototype, "getAll").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore["getAll"]>
    ) {
      if (this.name === "gameHeaders") {
        throw new Error("event log read blocked intentionally");
      }
      return originalGetAll.apply(this, args);
    });
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "Could not read local sync store kbl-event-log.gameHeaders",
    );

    expect(
      mockState.cloudRows.find((row) => row.id === "remote-existing-header"),
    ).toEqual(expect.objectContaining({ deleted: false }));
  });

  test("replaceCloudWithLocal rejects when cloud changed after this device's base cursor", async () => {
    await seedCompletedGameWithEventLog("game-stale-device-upload");
    localStorage.setItem("kbl-sync-device-id", "device-stale-upload");
    mockState.metaRows = [
      {
        user_id: "user-1",
        device_id: "device-stale-upload",
        last_pull_changed_at: 100,
        last_pull_id: "base-store-row",
        last_pull_received_at: "2026-01-01T00:00:00.001Z",
      },
    ];
    mockState.cloudRows = [
      {
        id: "newer-cloud-play-log-row",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("game-stale-device-upload-ab-newer"),
        data: {
          eventId: "game-stale-device-upload-ab-newer",
          gameId: "game-stale-device-upload",
          result: "DOUBLE",
        },
        changed_at: 500,
        received_at: "2026-01-01T00:00:00.002Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "Cloud changed since this device last downloaded",
    );
    expect(mockState.cloudRows).toEqual([
      expect.objectContaining({
        id: "newer-cloud-play-log-row",
        deleted: false,
        data: expect.objectContaining({ result: "DOUBLE" }),
      }),
    ]);
  });

  test("confirmed replacement removes stale cloud data and uploads this device's snapshot", async () => {
    await seedCompletedGameWithEventLog("game-confirmed-replacement");
    mockState.cloudRows = [
      {
        id: "stale-cloud-only-row",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("stale-cloud-only-event"),
        data: { eventId: "stale-cloud-only-event", gameId: "old-game", result: "DOUBLE" },
        changed_at: 500,
        received_at: "2026-01-01T00:00:00.002Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(
      syncEngine.replaceCloudWithLocal(undefined, { replaceExisting: true }),
    ).resolves.toBeUndefined();

    expect(mockState.cloudRows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "stale-cloud-only-row" }),
      ]),
    );
    expect(mockState.cloudRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          db_name: "kbl-event-log",
          store_name: "gameHeaders",
          record_key: JSON.stringify("game-confirmed-replacement"),
          deleted: false,
        }),
      ]),
    );
  });

  test("confirmed replacement restores the prior cloud snapshot when the replacement upload fails", async () => {
    await seedCompletedGameWithEventLog("game-confirmed-rollback");
    const priorCloudRow: StoreRow = {
      id: "prior-cloud-row",
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify("prior-cloud-event"),
      data: { eventId: "prior-cloud-event", gameId: "prior-game", result: "DOUBLE" },
      changed_at: 500,
      received_at: "2026-01-01T00:00:00.002Z",
      deleted: false,
    };
    mockState.cloudRows = [priorCloudRow];
    mockState.localRows = [{
      user_id: "user-1",
      key: "kbl-test-local",
      data: "prior-local-value",
      changed_at: 500,
      received_at: "2026-01-01T00:00:00.002Z",
      deleted: false,
    }];
    mockState.failNextUpsertTable = "kbl_stores";
    const syncEngine = await loadFreshSyncEngine();

    await expect(
      syncEngine.replaceCloudWithLocal(undefined, { replaceExisting: true }),
    ).rejects.toThrow("kbl_stores upsert failed intentionally");

    expect(mockState.cloudRows).toEqual([
      expect.objectContaining({
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("prior-cloud-event"),
        data: expect.objectContaining({ result: "DOUBLE" }),
        deleted: false,
      }),
    ]);
    expect(mockState.localRows).toEqual([
      expect.objectContaining({ key: "kbl-test-local", data: "prior-local-value", deleted: false }),
    ]);
  });

  test("replaceCloudWithLocal refuses non-empty cloud replacement without a server-received base cursor", async () => {
    await seedCompletedGameWithEventLog("game-no-server-base");
    mockState.cloudRows = [
      {
        id: "cloud-row-without-local-base",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("game-no-server-base-ab-remote"),
        data: {
          eventId: "game-no-server-base-ab-remote",
          gameId: "game-no-server-base",
          result: "SINGLE",
        },
        changed_at: 200,
        received_at: "2026-01-01T00:00:00.002Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "Cannot full upload before this device has a server-received store cursor",
    );
    expect(mockState.cloudRows).toEqual([
      expect.objectContaining({
        id: "cloud-row-without-local-base",
        deleted: false,
      }),
    ]);
  });

  test("replaceCloudWithLocal refuses no-base replacement even when queued ops cover cloud identities", async () => {
    const gameId = "game-no-base-queued-cover";
    const eventId = `${gameId}-ab-1`;
    await seedCompletedGameWithEventLog(gameId);
    localStorage.setItem("kbl-sync-queue", JSON.stringify([
      [`kbl-event-log|atBatEvents|${JSON.stringify(eventId)}`, {
        dbName: "kbl-event-log",
        storeName: "atBatEvents",
        recordKey: JSON.stringify(eventId),
        data: { eventId, gameId, result: "TRIPLE" },
        changedAt: 10_000,
        deleted: false,
      }],
    ]));
    mockState.cloudRows = [
      {
        id: "cloud-row-covered-by-queued-op-without-base",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify(eventId),
        data: { eventId, gameId, result: "DOUBLE" },
        changed_at: 200,
        received_at: "2026-01-01T00:00:00.002Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "Cannot full upload before this device has a server-received store cursor",
    );
    expect(mockState.cloudRows).toEqual([
      expect.objectContaining({
        id: "cloud-row-covered-by-queued-op-without-base",
        deleted: false,
        data: expect.objectContaining({ result: "DOUBLE" }),
      }),
    ]);
  });

  test("replaceCloudWithLocal allows no-base source upload when existing cloud rows already match local", async () => {
    const gameId = "game-no-base-matched-cloud";
    await seedCompletedGameWithEventLog(gameId);
    const [completedGame] = await getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames");
    mockState.cloudRows = [
      {
        id: "cloud-matching-completed-game",
        user_id: "user-1",
        db_name: "kbl-tracker",
        store_name: "completedGames",
        record_key: JSON.stringify(gameId),
        data: completedGame,
        changed_at: 200,
        received_at: "2026-01-01T00:00:00.002Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).resolves.toBeUndefined();

    expect(mockState.cloudRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          db_name: "kbl-event-log",
          store_name: "gameHeaders",
          record_key: JSON.stringify(gameId),
          deleted: false,
        }),
        expect.objectContaining({
          db_name: "kbl-event-log",
          store_name: "atBatEvents",
          record_key: JSON.stringify(`${gameId}-ab-1`),
          deleted: false,
        }),
      ]),
    );
  });

  test("replaceCloudWithLocal rejects same-identity queued writes when cloud was received after the op base", async () => {
    const gameId = "game-stale-queued-same-identity";
    const eventId = `${gameId}-ab-1`;
    await seedCompletedGameWithEventLog(gameId);
    localStorage.setItem("kbl-sync-device-id", "device-stale-queued-same-identity");
    localStorage.setItem("kbl-sync-queue", JSON.stringify([
      [`kbl-event-log|atBatEvents|${JSON.stringify(eventId)}`, {
        dbName: "kbl-event-log",
        storeName: "atBatEvents",
        recordKey: JSON.stringify(eventId),
        data: { eventId, gameId, result: "TRIPLE" },
        changedAt: 10_000,
        deleted: false,
        baseReceivedAt: "2026-01-01T00:00:00.001Z",
        baseId: "base-store-row",
      }],
    ]));
    await putAtBatEventRecord({
      eventId,
      gameId,
      eventIndex: 1,
      result: "TRIPLE",
    });
    mockState.metaRows = [
      {
        user_id: "user-1",
        device_id: "device-stale-queued-same-identity",
        last_pull_changed_at: 100,
        last_pull_id: "base-store-row",
        last_pull_received_at: "2026-01-01T00:00:00.001Z",
      },
    ];
    mockState.cloudRows = [
      {
        id: "server-newer-same-identity-lower-client-time",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify(eventId),
        data: { eventId, gameId, result: "DOUBLE" },
        changed_at: 500,
        received_at: "2026-01-01T00:00:00.002Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "Cloud changed since this device last downloaded",
    );
    expect(mockState.cloudRows).toEqual([
      expect.objectContaining({
        id: "server-newer-same-identity-lower-client-time",
        deleted: false,
        data: expect.objectContaining({ result: "DOUBLE" }),
      }),
    ]);
  });

  test("replaceCloudWithLocal rejects when cloud has a newer tombstone after this device's base cursor", async () => {
    await seedCompletedGameWithEventLog("game-stale-device-upload-delete");
    localStorage.setItem("kbl-sync-device-id", "device-stale-delete");
    mockState.metaRows = [
      {
        user_id: "user-1",
        device_id: "device-stale-delete",
        last_pull_changed_at: 100,
        last_pull_id: "base-store-row",
        last_pull_received_at: "2026-01-01T00:00:00.001Z",
      },
    ];
    mockState.cloudRows = [
      {
        id: "newer-cloud-deleted-at-bat",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("game-stale-device-upload-delete-ab-1"),
        data: {},
        changed_at: 500,
        received_at: "2026-01-01T00:00:00.002Z",
        deleted: true,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "Cloud changed since this device last downloaded",
    );
    expect(mockState.cloudRows).toEqual([
      expect.objectContaining({
        id: "newer-cloud-deleted-at-bat",
        deleted: true,
        changed_at: 500,
      }),
    ]);
  });

  test("replaceCloudWithLocal rejects when cloud localStorage has a newer tombstone after this device's base cursor", async () => {
    await seedCompletedGameWithEventLog("game-local-storage-tombstone-base");
    localStorage.setItem("kbl-sync-device-id", "device-local-tombstone");
    localStorage.setItem("kbl-current-season", "1");
    mockState.metaRows = [
      {
        user_id: "user-1",
        device_id: "device-local-tombstone",
        last_pull_changed_at: 100,
        last_pull_id: null,
        last_pull_received_at: null,
        last_pull_local_received_at: "2026-01-01T00:00:00.001Z",
        last_pull_local_key: "kbl-current-season",
      },
    ];
    mockState.localRows = [
      {
        user_id: "user-1",
        key: "kbl-current-season",
        data: {},
        changed_at: 500,
        received_at: "2026-01-01T00:00:00.002Z",
        deleted: true,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "Cloud changed since this device last downloaded",
    );
    expect(mockState.localRows).toEqual([
      expect.objectContaining({
        key: "kbl-current-season",
        deleted: true,
        changed_at: 500,
      }),
    ]);
  });

  test("replaceCloudWithLocal rejects same-key localStorage queue writes when cloud was received after the op base", async () => {
    await seedCompletedGameWithEventLog("game-local-storage-stale-queued");
    localStorage.setItem("kbl-sync-device-id", "device-local-stale-queued");
    localStorage.setItem("kbl-current-season", "local-season");
    localStorage.setItem("kbl-sync-local-queue", JSON.stringify([
      ["kbl-current-season", {
        key: "kbl-current-season",
        data: "local-season",
        changedAt: 10_000,
        deleted: false,
        baseReceivedAt: "2026-01-01T00:00:00.001Z",
        baseKey: "kbl-current-season",
      }],
    ]));
    mockState.metaRows = [
      {
        user_id: "user-1",
        device_id: "device-local-stale-queued",
        last_pull_changed_at: 100,
        last_pull_id: null,
        last_pull_received_at: null,
        last_pull_local_received_at: "2026-01-01T00:00:00.001Z",
        last_pull_local_key: "kbl-current-season",
      },
    ];
    mockState.localRows = [
      {
        user_id: "user-1",
        key: "kbl-current-season",
        data: "cloud-season",
        changed_at: 500,
        received_at: "2026-01-01T00:00:00.002Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "Cloud changed since this device last downloaded",
    );
    expect(mockState.localRows).toEqual([
      expect.objectContaining({
        key: "kbl-current-season",
        deleted: false,
        data: "cloud-season",
      }),
    ]);
  });

  test("replaceCloudWithLocal rejects when a cloud row arrives after the base check but before tombstoning", async () => {
    await seedCompletedGameWithEventLog("game-after-base-race");
    localStorage.setItem("kbl-sync-device-id", "device-after-base-race");
    mockState.metaRows = [
      {
        user_id: "user-1",
        device_id: "device-after-base-race",
        last_pull_changed_at: 100,
        last_pull_id: "base-store-row",
        last_pull_received_at: "2026-01-01T00:00:00.001Z",
      },
    ];
    const syncEngine = await loadFreshSyncEngine();
    let injectedRaceRow = false;

    await expect(syncEngine.replaceCloudWithLocal(() => {
      if (injectedRaceRow) return;
      injectedRaceRow = true;
      mockState.cloudRows.push({
        id: "cloud-row-after-base-before-tombstone",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("game-after-base-race-ab-remote"),
        data: {
          eventId: "game-after-base-race-ab-remote",
          gameId: "game-after-base-race",
          result: "DOUBLE",
        },
        changed_at: 250,
        received_at: "2026-01-01T00:00:00.002Z",
        deleted: false,
      });
    })).rejects.toThrow("Cloud stale-store tombstone failed");

    expect(
      mockState.cloudRows.find((row) => row.id === "cloud-row-after-base-before-tombstone"),
    ).toEqual(expect.objectContaining({
      deleted: false,
      data: expect.objectContaining({ result: "DOUBLE" }),
    }));
  });

  test("replaceCloudWithLocal keeps the base cursor so later cloud rows are still pulled", async () => {
    const gameId = "game-post-upload-cursor";
    const remoteEventId = `${gameId}-ab-remote`;
    await seedCompletedGameWithEventLog(gameId);
    localStorage.setItem("kbl-sync-device-id", "device-post-upload-cursor");
    mockState.metaRows = [
      {
        user_id: "user-1",
        device_id: "device-post-upload-cursor",
        last_pull_changed_at: 100,
        last_pull_id: "base-store-row",
        last_pull_received_at: "2026-01-01T00:00:00.001Z",
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceCloudWithLocal();

    expect(mockState.metaRows[0]).toEqual(expect.objectContaining({
      last_pull_changed_at: 100,
      last_pull_id: "base-store-row",
      last_pull_received_at: "2026-01-01T00:00:00.001Z",
    }));

    mockState.cloudRows.push({
      id: "cloud-row-after-upload-complete",
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify(remoteEventId),
      data: {
        eventId: remoteEventId,
        gameId,
        eventIndex: 99,
        result: "DOUBLE",
      },
      changed_at: 250,
      received_at: "2099-01-01T00:00:00.000Z",
      deleted: false,
    });

    await syncEngine.pull({ throwOnError: true });

    await expect(getAllRecords<Record<string, unknown>>("kbl-event-log", "atBatEvents")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventId: remoteEventId, result: "DOUBLE" }),
      ]),
    );
  });

  test("replaceCloudWithLocal establishes accepted store-row bases for immediate same-record edits", async () => {
    const gameId = "game-post-upload-same-store-edit";
    const eventId = `${gameId}-ab-1`;
    await seedCompletedGameWithEventLog(gameId);
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceCloudWithLocal();

    syncEngine.upsert("kbl-event-log", "atBatEvents", eventId, {
      eventId,
      gameId,
      eventIndex: 1,
      result: "DOUBLE",
      version: 2,
    });
    await syncEngine.flush({ throwOnPending: true });

    syncEngine.upsert("kbl-event-log", "atBatEvents", eventId, {
      eventId,
      gameId,
      eventIndex: 1,
      result: "TRIPLE",
      version: 3,
    });
    await syncEngine.flush({ throwOnPending: true });

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-event-log" &&
          row.store_name === "atBatEvents" &&
          row.record_key === JSON.stringify(eventId),
      ),
    ).toEqual(expect.objectContaining({
      deleted: false,
      data: expect.objectContaining({ result: "TRIPLE", version: 3 }),
    }));
  });

  test("replaceCloudWithLocal establishes accepted localStorage bases for immediate same-key edits", async () => {
    localStorage.setItem("kbl-current-season", "1");
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceCloudWithLocal();

    localStorage.setItem("kbl-current-season", "2");
    syncEngine.upsertLocal("kbl-current-season", "2");
    await syncEngine.flush({ throwOnPending: true });

    localStorage.setItem("kbl-current-season", "3");
    syncEngine.upsertLocal("kbl-current-season", "3");
    await syncEngine.flush({ throwOnPending: true });

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(mockState.localRows.find((row) => row.key === "kbl-current-season")).toEqual(
      expect.objectContaining({
        deleted: false,
      data: "3",
      }),
    );
  });

  test("replaceCloudWithLocal does not authorize same-record cloud changes that arrive after verification", async () => {
    const gameId = "game-post-verify-race";
    const eventId = `${gameId}-ab-1`;
    await seedCompletedGameWithEventLog(gameId);
    const syncEngine = await loadFreshSyncEngine();
    let queuedConcurrentWrite = false;
    let storeSelects = 0;
    let injectedRemoteUpdate = false;

    mockState.afterSelect = (table) => {
      if (table !== "kbl_stores") return;
      storeSelects += 1;
      if (storeSelects !== 3 || injectedRemoteUpdate) return;
      const row = mockState.cloudRows.find(
        (candidate) =>
          candidate.db_name === "kbl-event-log" &&
          candidate.store_name === "atBatEvents" &&
          candidate.record_key === JSON.stringify(eventId),
      );
      if (!row) return;
      injectedRemoteUpdate = true;
      row.data = { ...(row.data as Record<string, unknown>), result: "REMOTE_DOUBLE", version: 99 };
      row.changed_at = 1;
      row.received_at = "2099-01-01T00:00:00.000Z";
    };

    await expect(syncEngine.replaceCloudWithLocal((dbName, storeName) => {
      if (!queuedConcurrentWrite && dbName === "kbl-event-log" && storeName === "atBatEvents") {
        queuedConcurrentWrite = true;
        syncEngine.upsert("kbl-event-log", "atBatEvents", eventId, {
          eventId,
          gameId,
          eventIndex: 1,
          result: "LOCAL_HOME_RUN",
          version: 2,
        });
      }
    })).rejects.toThrow("Final sync flush incomplete");

    expect(injectedRemoteUpdate).toBe(true);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-event-log" &&
          row.store_name === "atBatEvents" &&
          row.record_key === JSON.stringify(eventId),
      ),
    ).toEqual(expect.objectContaining({
      data: expect.objectContaining({ result: "REMOTE_DOUBLE", version: 99 }),
    }));
  });

  test("replaceCloudWithLocal does not authorize same-key localStorage changes that arrive after verification", async () => {
    localStorage.setItem("kbl-current-season", "1");
    const syncEngine = await loadFreshSyncEngine();
    let localSelects = 0;
    let injectedRemoteUpdate = false;

    mockState.afterSelect = (table) => {
      if (table !== "kbl_local_storage") return;
      localSelects += 1;
      if (localSelects !== 3 || injectedRemoteUpdate) return;
      const row = mockState.localRows.find((candidate) => candidate.key === "kbl-current-season");
      if (!row) return;
      injectedRemoteUpdate = true;
      row.data = "remote-season";
      row.changed_at = 1;
      row.received_at = "2099-01-01T00:00:00.000Z";
    };

    await syncEngine.replaceCloudWithLocal();

    expect(injectedRemoteUpdate).toBe(true);
    localStorage.setItem("kbl-current-season", "2");
    syncEngine.upsertLocal("kbl-current-season", "2");
    await expect(syncEngine.flush({ throwOnPending: true })).rejects.toThrow("Final sync flush incomplete");

    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(mockState.localRows.find((row) => row.key === "kbl-current-season")).toEqual(
      expect.objectContaining({ data: "remote-season" }),
    );
  });

  test("same-record edits after reload use the persisted accepted upload base", async () => {
    const gameId = "game-post-upload-reload-edit";
    const eventId = `${gameId}-ab-1`;
    await seedCompletedGameWithEventLog(gameId);
    let syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceCloudWithLocal();
    syncEngine.destroy();
    syncEngine = await loadFreshSyncEngine();

    syncEngine.upsert("kbl-event-log", "atBatEvents", eventId, {
      eventId,
      gameId,
      eventIndex: 1,
      result: "DOUBLE_AFTER_RELOAD",
      version: 2,
    });
    await syncEngine.flush({ throwOnPending: true });

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-event-log" &&
          row.store_name === "atBatEvents" &&
          row.record_key === JSON.stringify(eventId),
      ),
    ).toEqual(expect.objectContaining({
      data: expect.objectContaining({ result: "DOUBLE_AFTER_RELOAD", version: 2 }),
    }));
  });

  test("same-key localStorage edits after reload use the persisted accepted upload base", async () => {
    localStorage.setItem("kbl-current-season", "1");
    let syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceCloudWithLocal();
    syncEngine.destroy();
    syncEngine = await loadFreshSyncEngine();

    localStorage.setItem("kbl-current-season", "2");
    syncEngine.upsertLocal("kbl-current-season", "2");
    await syncEngine.flush({ throwOnPending: true });

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(mockState.localRows.find((row) => row.key === "kbl-current-season")).toEqual(
      expect.objectContaining({
        deleted: false,
        data: "2",
      }),
    );
  });

  test("replaceCloudWithLocal fails closed when verified write bases cannot be persisted", async () => {
    const gameId = "game-write-base-quota";
    await seedCompletedGameWithEventLog(gameId);
    const syncEngine = await loadFreshSyncEngine();
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "kbl-sync-store-write-bases") {
        throw new Error("write base quota exceeded intentionally");
      }
      return originalSetItem.call(this, key, value);
    });

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "could not persist write bases for reload-safe edits",
    );
    expect(syncEngine.getStatus()).toEqual(expect.objectContaining({
      state: "error",
      error: expect.stringContaining("write bases"),
    }));

    const diagnostics = await syncEngine.getDiagnostics();
    expect(diagnostics.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Sync write-base persistence failed"),
      ]),
    );
  });

  test("same-record edits after pull use the pulled row as the write base", async () => {
    const gameId = "game-pull-updates-write-base";
    const eventId = `${gameId}-ab-1`;
    await seedCompletedGameWithEventLog(gameId);
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceCloudWithLocal();
    const row = mockState.cloudRows.find(
      (candidate) =>
        candidate.db_name === "kbl-event-log" &&
        candidate.store_name === "atBatEvents" &&
        candidate.record_key === JSON.stringify(eventId),
    );
    expect(row).toBeDefined();
    Object.assign(row!, {
      data: { eventId, gameId, eventIndex: 1, result: "REMOTE_AFTER_UPLOAD", version: 3 },
      changed_at: 1,
      received_at: "2099-01-01T00:00:00.000Z",
    });

    await syncEngine.pull({ throwOnError: true });

    syncEngine.upsert("kbl-event-log", "atBatEvents", eventId, {
      eventId,
      gameId,
      eventIndex: 1,
      result: "LOCAL_AFTER_PULL",
      version: 4,
    });
    await syncEngine.flush({ throwOnPending: true });

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(
      mockState.cloudRows.find(
        (candidate) =>
          candidate.db_name === "kbl-event-log" &&
          candidate.store_name === "atBatEvents" &&
          candidate.record_key === JSON.stringify(eventId),
      ),
    ).toEqual(expect.objectContaining({
      data: expect.objectContaining({ result: "LOCAL_AFTER_PULL", version: 4 }),
    }));
  });

  test("replaceCloudWithLocal clears stale pending ops so they cannot overwrite the verified snapshot", async () => {
    await seedCompletedGameWithEventLog("game-clears-queue");
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.remove("kbl-tracker", "completedGames", "game-clears-queue");

    expect(syncEngine.getStatus().pendingCount).toBe(1);

    await syncEngine.replaceCloudWithLocal();

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-tracker" &&
          row.store_name === "completedGames" &&
          row.record_key === JSON.stringify("game-clears-queue"),
      ),
    ).toEqual(expect.objectContaining({ deleted: false }));
  });

  test("replaceCloudWithLocal fails closed when an in-flight queue drain changes cloud after the base", async () => {
    await seedCompletedGameWithEventLog("game-in-flight-drain");
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.remove("kbl-tracker", "completedGames", "game-in-flight-drain");
    mockState.blockNextUpsert("kbl_stores");

    const flushPromise = syncEngine.flush();
    await mockState.blockedUpsertStarted;

    const uploadPromise = syncEngine.replaceCloudWithLocal();
    await Promise.resolve();

    mockState.releaseBlockedUpsert?.();
    await flushPromise;
    await expect(uploadPromise).rejects.toThrow(
      "Cannot full upload before this device has a server-received store cursor",
    );

    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-tracker" &&
          row.store_name === "completedGames" &&
          row.record_key === JSON.stringify("game-in-flight-drain"),
      ),
    ).toEqual(expect.objectContaining({ deleted: true }));
  });

  test("replaceCloudWithLocal discards stale ops requeued by a failed in-flight drain", async () => {
    await seedCompletedGameWithEventLog("game-failed-drain-requeue");
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.remove("kbl-tracker", "completedGames", "game-failed-drain-requeue");
    mockState.blockNextUpsert("kbl_stores");
    mockState.failNextUpsertTable = "kbl_stores";

    const flushPromise = syncEngine.flush();
    await mockState.blockedUpsertStarted;

    const uploadPromise = syncEngine.replaceCloudWithLocal();
    await Promise.resolve();

    mockState.releaseBlockedUpsert?.();
    await flushPromise;
    await uploadPromise;

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-tracker" &&
          row.store_name === "completedGames" &&
          row.record_key === JSON.stringify("game-failed-drain-requeue"),
      ),
    ).toEqual(expect.objectContaining({ deleted: false }));
  });

  test("replaceCloudWithLocal discards stale localStorage ops requeued by a failed in-flight local drain", async () => {
    localStorage.setItem("kbl-current-season", "2");
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.removeLocal("kbl-current-season");
    mockState.blockNextUpsert("kbl_local_storage");
    mockState.failNextUpsertTable = "kbl_local_storage";

    const flushPromise = syncEngine.flush();
    await mockState.blockedUpsertStarted;

    const uploadPromise = syncEngine.replaceCloudWithLocal();
    await Promise.resolve();

    mockState.releaseBlockedUpsert?.();
    await flushPromise;
    await uploadPromise;

    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(
      mockState.localRows.find((row) => row.key === "kbl-current-season"),
    ).toEqual(expect.objectContaining({ data: "2", deleted: false }));
  });

  test("replaceCloudWithLocal restores pending queues when the full upload fails", async () => {
    await seedCompletedGameWithEventLog("game-upload-fails-with-pending-queue");
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.upsert("kbl-tracker", "completedGames", "game-pending-after-failed-upload", {
      gameId: "game-pending-after-failed-upload",
      date: 1000,
    });
    mockState.failNextUpsertTable = "kbl_stores";

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "kbl_stores upsert failed intentionally",
    );

    expect(syncEngine.getStatus().pendingCount).toBe(1);
    await syncEngine.flush();
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-tracker" &&
          row.store_name === "completedGames" &&
          row.record_key === JSON.stringify("game-pending-after-failed-upload"),
      ),
    ).toEqual(expect.objectContaining({ deleted: false }));
  });

  test("replaceCloudWithLocal refuses to tombstone cloud play logs when local play-log stores are incomplete", async () => {
    await seedCompletedGameWithEventLog("game-incomplete-local-playlog");
    await deleteDatabase("kbl-event-log");
    mockState.cloudRows = [
      {
        id: "remote-existing-at-bat",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("game-incomplete-local-playlog-ab-1"),
        data: { eventId: "game-incomplete-local-playlog-ab-1", gameId: "game-incomplete-local-playlog" },
        changed_at: 10,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow(
      "Cannot upload incomplete play-log data",
    );

    expect(
      mockState.cloudRows.find((row) => row.id === "remote-existing-at-bat"),
    ).toEqual(expect.objectContaining({ deleted: false }));
  });

  test("replaceCloudWithLocal uploads legacy play-log warning rows instead of trapping them locally", async () => {
    const gameId = "game-legacy-playlog-warnings";
    await seedCompletedGameWithEventLog(gameId);
    await putAtBatEventRecord({
      eventId: `${gameId}-ab-3`,
      gameId,
      eventIndex: 3,
      timestamp: 126,
      result: "OUT",
      enrichment: {
        fieldingSequence: [8],
        fieldingPlayType: "diving",
      },
    });
    const syncEngine = await loadFreshSyncEngine();

    const diagnosticsBefore = await syncEngine.getDiagnostics();
    expect(diagnosticsBefore.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("event-log count mismatch"),
        expect.stringContaining("fielding enrichment but no fieldingEvents rows"),
      ]),
    );

    await expect(syncEngine.replaceCloudWithLocal()).resolves.toBeUndefined();

    expect(mockState.cloudRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          db_name: "kbl-event-log",
          store_name: "atBatEvents",
          record_key: JSON.stringify(`${gameId}-ab-3`),
          deleted: false,
        }),
      ]),
    );
  });

  test("replaceCloudWithLocal waits for an active pull before reading the local replacement snapshot", async () => {
    await seedCompletedGameWithEventLog("game-waits-for-pull");
    const syncEngine = await loadFreshSyncEngine();
    mockState.blockNextSelect("kbl_stores");

    const pullPromise = syncEngine.pull({ throwOnError: true });
    await mockState.blockedSelectStarted;

    const uploadPromise = syncEngine.replaceCloudWithLocal();
    await Promise.resolve();

    expect(mockState.kblStoreUpserts).toHaveLength(0);

    mockState.releaseBlockedSelect?.();
    await pullPromise;
    await uploadPromise;

    expect(mockState.kblStoreUpserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          db_name: "kbl-tracker",
          store_name: "completedGames",
          record_key: JSON.stringify("game-waits-for-pull"),
          deleted: false,
        }),
      ]),
    );
  });

  test("serializes multiple full replacements queued behind one active operation", async () => {
    await seedCompletedGameWithEventLog("game-serialized-replacement");
    const syncEngine = await loadFreshSyncEngine();
    mockState.blockNextSelect("kbl_stores");

    const pullPromise = syncEngine.pull({ throwOnError: true });
    await mockState.blockedSelectStarted;

    mockState.blockNextUpsert("kbl_stores");
    const firstUploadPromise = syncEngine.replaceCloudWithLocal();
    const secondUploadPromise = syncEngine.replaceCloudWithLocal();
    await Promise.resolve();

    expect(mockState.kblStoreUpserts).toHaveLength(0);

    mockState.releaseBlockedSelect?.();
    await pullPromise;
    await mockState.blockedUpsertStarted;
    await Promise.resolve();

    expect(mockState.kblStoreUpserts).toHaveLength(0);

    mockState.releaseBlockedUpsert?.();
    await firstUploadPromise;
    await expect(secondUploadPromise).resolves.toBeUndefined();

    const completedGameUploads = mockState.kblStoreUpserts.filter(
      (row) =>
        row.db_name === "kbl-tracker" &&
        row.store_name === "completedGames" &&
        row.record_key === JSON.stringify("game-serialized-replacement"),
    );
    expect(completedGameUploads).toHaveLength(1);
  });

  test("incremental pull does not overwrite a newer local IndexedDB write that remains queued", async () => {
    const futureCloudChangedAt = Date.now() + 1_000_000_000;
    await seedCompletedGameWithEventLog("game-local-pending-wins");
    await putCompletedGameRecord({
      gameId: "game-local-pending-wins",
      date: 999,
      activityLog: ["local v2"],
    });
    mockState.cloudRows = [
      {
        id: "remote-stale-completed-game",
        user_id: "user-1",
        db_name: "kbl-tracker",
        store_name: "completedGames",
        record_key: JSON.stringify("game-local-pending-wins"),
        data: {
          gameId: "game-local-pending-wins",
          date: 111,
          activityLog: ["cloud v1"],
        },
        changed_at: futureCloudChangedAt,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.upsert("kbl-tracker", "completedGames", "game-local-pending-wins", {
      gameId: "game-local-pending-wins",
      date: 999,
      activityLog: ["local v2"],
    });
    mockState.failNextUpsertTable = "kbl_stores";

    await syncEngine.pull({ throwOnError: true });

    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gameId: "game-local-pending-wins",
          date: 999,
          activityLog: ["local v2"],
        }),
      ]),
    );
    expect(syncEngine.getStatus().pendingCount).toBe(1);
  });

  test("incremental pull does not resurrect a cloud row over a queued local delete with a skewed clock", async () => {
    const futureCloudChangedAt = Date.now() + 1_000_000_000;
    await seedCompletedGameWithEventLog("game-local-delete-wins");
    await deleteCompletedGameRecord("game-local-delete-wins");
    mockState.cloudRows = [
      {
        id: "remote-future-deleted-locally",
        user_id: "user-1",
        db_name: "kbl-tracker",
        store_name: "completedGames",
        record_key: JSON.stringify("game-local-delete-wins"),
        data: {
          gameId: "game-local-delete-wins",
          date: 111,
          activityLog: ["cloud stale row"],
        },
        changed_at: futureCloudChangedAt,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.remove("kbl-tracker", "completedGames", "game-local-delete-wins");
    mockState.failNextUpsertTable = "kbl_stores";

    await syncEngine.pull({ throwOnError: true });

    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual([]);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
  });

  test("incremental pull does not advance the cursor past a skipped future-dated conflict", async () => {
    const futureCloudChangedAt = Date.now() + 1_000_000_000;
    const normalCloudChangedAt = Date.now() + 1_000;
    await seedCompletedGameWithEventLog("game-cursor-barrier");
    await putCompletedGameRecord({
      gameId: "game-cursor-barrier",
      date: 999,
      activityLog: ["local v2"],
    });
    mockState.cloudRows = [
      {
        id: "remote-future-conflict",
        user_id: "user-1",
        db_name: "kbl-tracker",
        store_name: "completedGames",
        record_key: JSON.stringify("game-cursor-barrier"),
        data: {
          gameId: "game-cursor-barrier",
          date: 111,
          activityLog: ["cloud stale row"],
        },
        changed_at: futureCloudChangedAt,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();
    const completeSpy = vi.fn();
    window.addEventListener("sync-complete", completeSpy);
    syncEngine.upsert("kbl-tracker", "completedGames", "game-cursor-barrier", {
      gameId: "game-cursor-barrier",
      date: 999,
      activityLog: ["local v2"],
    });
    mockState.failNextUpsertTable = "kbl_stores";

    await syncEngine.pull({ throwOnError: true });

    expect(mockState.metaRows[0]).toEqual(
      expect.objectContaining({
        last_pull_changed_at: 0,
        last_pull_id: null,
      }),
    );
    expect(completeSpy).not.toHaveBeenCalled();

    mockState.cloudRows.push({
      id: "remote-normal-atbat-after-conflict",
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify("game-cursor-barrier-ab-normal"),
      data: {
        eventId: "game-cursor-barrier-ab-normal",
        gameId: "game-cursor-barrier",
        eventIndex: 3,
        result: "SINGLE",
      },
      changed_at: normalCloudChangedAt,
      deleted: false,
    });

    await syncEngine.pull({ throwOnError: true });

    await expect(getAllRecords<Record<string, unknown>>("kbl-event-log", "atBatEvents")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventId: "game-cursor-barrier-ab-normal" }),
      ]),
    );
    expect(mockState.metaRows[0].last_pull_changed_at).toBeLessThan(futureCloudChangedAt);
    window.removeEventListener("sync-complete", completeSpy);
  });

  test("incremental pull rechecks queued writes immediately before applying cloud rows", async () => {
    const gameId = "game-mid-apply";
    const eventId = `${gameId}-ab-1`;
    let releaseEventLogOpen: (() => void) | null = null;
    let resolveOpenStarted: (() => void) | null = null;
    const eventLogOpenStarted = new Promise<void>((resolve) => {
      resolveOpenStarted = resolve;
    });

    await seedCompletedGameWithEventLog(gameId);
    vi.doMock("../backupRestore", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../backupRestore")>();
      let blockedEventLogOpen = false;
      return {
        ...actual,
        openDatabaseWithSchema: vi.fn((...args: Parameters<typeof actual.openDatabaseWithSchema>) => {
          const [dbName, schema, options] = args;
          if (dbName === "kbl-event-log" && !blockedEventLogOpen) {
            blockedEventLogOpen = true;
            resolveOpenStarted?.();
            return new Promise<IDBDatabase>((resolve, reject) => {
              releaseEventLogOpen = () => {
                actual.openDatabaseWithSchema(dbName, schema, options).then(resolve, reject);
              };
            });
          }
          return actual.openDatabaseWithSchema(dbName, schema, options);
        }),
      };
    });
    mockState.cloudRows = [
      {
        id: "remote-stale-mid-apply",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify(eventId),
        data: {
          eventId,
          gameId,
          eventIndex: 1,
          result: "OUT",
        },
        changed_at: Date.now() + 1_000_000,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    const pullPromise = syncEngine.pull({ throwOnError: true });
    await eventLogOpenStarted;

    const localEvent = {
      eventId,
      gameId,
      eventIndex: 1,
      result: "DOUBLE",
    };
    await putAtBatEventRecord(localEvent);
    syncEngine.upsert("kbl-event-log", "atBatEvents", eventId, localEvent);
    releaseEventLogOpen?.();
    await pullPromise;

    await expect(getAllRecords<Record<string, unknown>>("kbl-event-log", "atBatEvents")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventId, result: "DOUBLE" }),
      ]),
    );
    expect(mockState.metaRows[0]).toEqual(
      expect.objectContaining({
        last_pull_changed_at: 0,
        last_pull_id: null,
      }),
    );
    expect(syncEngine.getStatus().pendingCount).toBe(1);
  });

  test("incremental pull does not overwrite a local write that flushes during the pull-apply window", async () => {
    const gameId = "game-mid-apply-flushed";
    const eventId = `${gameId}-ab-1`;
    let releaseEventLogOpen: (() => void) | null = null;
    let resolveOpenStarted: (() => void) | null = null;
    const eventLogOpenStarted = new Promise<void>((resolve) => {
      resolveOpenStarted = resolve;
    });

    await seedCompletedGameWithEventLog(gameId);
    vi.doMock("../backupRestore", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../backupRestore")>();
      let blockedEventLogOpen = false;
      return {
        ...actual,
        openDatabaseWithSchema: vi.fn((...args: Parameters<typeof actual.openDatabaseWithSchema>) => {
          const [dbName, schema, options] = args;
          if (dbName === "kbl-event-log" && !blockedEventLogOpen) {
            blockedEventLogOpen = true;
            resolveOpenStarted?.();
            return new Promise<IDBDatabase>((resolve, reject) => {
              releaseEventLogOpen = () => {
                actual.openDatabaseWithSchema(dbName, schema, options).then(resolve, reject);
              };
            });
          }
          return actual.openDatabaseWithSchema(dbName, schema, options);
        }),
      };
    });
    const staleCloudChangedAt = 1;
    mockState.cloudRows = [
      {
        id: "remote-stale-mid-apply-flushed",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify(eventId),
        data: {
          eventId,
          gameId,
          eventIndex: 1,
          result: "OUT",
        },
        changed_at: staleCloudChangedAt,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    const pullPromise = syncEngine.pull({ throwOnError: true });
    await eventLogOpenStarted;

    const localEvent = {
      eventId,
      gameId,
      eventIndex: 1,
      result: "TRIPLE",
    };
    await putAtBatEventRecord(localEvent);
    syncEngine.upsert("kbl-event-log", "atBatEvents", eventId, localEvent);
    await syncEngine.flush();
    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(syncEngine.getStatus().error).toContain("cloud has newer rows");

    releaseEventLogOpen?.();
    await pullPromise;

    await expect(getAllRecords<Record<string, unknown>>("kbl-event-log", "atBatEvents")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventId, result: "TRIPLE" }),
      ]),
    );
    expect(mockState.metaRows[0].last_pull_changed_at).toBeLessThan(staleCloudChangedAt);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
  });

  test("incremental pull does not overwrite a newer localStorage write that remains queued", async () => {
    const futureCloudChangedAt = Date.now() + 1_000_000_000;
    mockState.localRows = [
      {
        user_id: "user-1",
        key: "kbl-current-season",
        data: "cloud-v1",
        changed_at: futureCloudChangedAt,
        deleted: false,
      },
    ];
    localStorage.setItem("kbl-current-season", "local-v2");
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.upsertLocal("kbl-current-season", "local-v2");
    mockState.failNextUpsertTable = "kbl_local_storage";

    await syncEngine.pull({ throwOnError: true });

    expect(localStorage.getItem("kbl-current-season")).toBe("local-v2");
    expect(syncEngine.getStatus().pendingCount).toBe(1);
  });

  test("replaceCloudWithLocal drains new writes queued during the replacement instead of discarding them", async () => {
    await seedCompletedGameWithEventLog("game-upload-base");
    const syncEngine = await loadFreshSyncEngine();
    let queuedConcurrentWrite = false;

    await syncEngine.replaceCloudWithLocal((dbName, storeName) => {
      if (!queuedConcurrentWrite && dbName === "kbl-tracker" && storeName === "completedGames") {
        queuedConcurrentWrite = true;
        syncEngine.upsert("kbl-tracker", "completedGames", "game-written-during-upload", {
          gameId: "game-written-during-upload",
          date: 999,
        });
      }
    });

    expect(queuedConcurrentWrite).toBe(true);
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-tracker" &&
          row.store_name === "completedGames" &&
          row.record_key === JSON.stringify("game-written-during-upload"),
      ),
    ).toEqual(expect.objectContaining({ deleted: false, data: expect.objectContaining({ gameId: "game-written-during-upload" }) }));
  });

  test("replaceCloudWithLocal drains same-record writes queued during replacement with the uploaded row base", async () => {
    const gameId = "game-upload-same-record-tail";
    const eventId = `${gameId}-ab-1`;
    await seedCompletedGameWithEventLog(gameId);
    const syncEngine = await loadFreshSyncEngine();
    let queuedConcurrentWrite = false;

    await syncEngine.replaceCloudWithLocal((dbName, storeName) => {
      if (!queuedConcurrentWrite && dbName === "kbl-event-log" && storeName === "atBatEvents") {
        queuedConcurrentWrite = true;
        syncEngine.upsert("kbl-event-log", "atBatEvents", eventId, {
          eventId,
          gameId,
          eventIndex: 1,
          result: "HOME_RUN",
          version: 2,
        });
      }
    });

    expect(queuedConcurrentWrite).toBe(true);
    expect(syncEngine.getStatus().pendingCount).toBe(0);
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-event-log" &&
          row.store_name === "atBatEvents" &&
          row.record_key === JSON.stringify(eventId),
      ),
    ).toEqual(expect.objectContaining({
      deleted: false,
      data: expect.objectContaining({ result: "HOME_RUN", version: 2 }),
    }));
  });

  test("replaceCloudWithLocal rejects when the final flush for writes queued during upload fails", async () => {
    await seedCompletedGameWithEventLog("game-upload-tail-flush-base");
    const syncEngine = await loadFreshSyncEngine();
    let queuedConcurrentWrite = false;
    mockState.failNextUpsertRecordKey = JSON.stringify("game-upload-tail-flush-fails");

    await expect(syncEngine.replaceCloudWithLocal((dbName, storeName) => {
      if (!queuedConcurrentWrite && dbName === "kbl-tracker" && storeName === "completedGames") {
        queuedConcurrentWrite = true;
        syncEngine.upsert("kbl-tracker", "completedGames", "game-upload-tail-flush-fails", {
          gameId: "game-upload-tail-flush-fails",
          date: 1002,
          activityLog: ["queued during upload tail"],
        });
      }
    })).rejects.toThrow("Final sync flush incomplete");

    expect(queuedConcurrentWrite).toBe(true);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-tracker" &&
          row.store_name === "completedGames" &&
          row.record_key === JSON.stringify("game-upload-tail-flush-fails"),
      ),
    ).toBeUndefined();
  });

  test("replaceLocalWithCloud reapplies and flushes writes queued during the download window", async () => {
    const syncEngine = await loadFreshSyncEngine();
    mockState.blockNextSelect("kbl_stores");

    const downloadPromise = syncEngine.replaceLocalWithCloud();
    await mockState.blockedSelectStarted;

    syncEngine.upsert("kbl-tracker", "completedGames", "game-written-during-download", {
      gameId: "game-written-during-download",
      date: 1000,
      activityLog: ["queued during download"],
    });

    mockState.releaseBlockedSelect?.();
    await downloadPromise;

    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual([
      expect.objectContaining({ gameId: "game-written-during-download" }),
    ]);
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-tracker" &&
          row.store_name === "completedGames" &&
          row.record_key === JSON.stringify("game-written-during-download"),
      ),
    ).toEqual(expect.objectContaining({ deleted: false }));
  });

  test("replaceLocalWithCloud rejects but keeps local data when the final queued-write flush fails", async () => {
    const syncEngine = await loadFreshSyncEngine();
    mockState.blockNextSelect("kbl_stores");
    mockState.failNextUpsertRecordKey = JSON.stringify("game-download-tail-flush-fails");

    const downloadPromise = syncEngine.replaceLocalWithCloud();
    await mockState.blockedSelectStarted;

    syncEngine.upsert("kbl-tracker", "completedGames", "game-download-tail-flush-fails", {
      gameId: "game-download-tail-flush-fails",
      date: 1003,
      activityLog: ["queued during download tail"],
    });

    mockState.releaseBlockedSelect?.();
    await expect(downloadPromise).rejects.toThrow("Final sync flush incomplete");

    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual([
      expect.objectContaining({ gameId: "game-download-tail-flush-fails" }),
    ]);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-tracker" &&
          row.store_name === "completedGames" &&
          row.record_key === JSON.stringify("game-download-tail-flush-fails"),
      ),
    ).toBeUndefined();
  });

  test("replaceLocalWithCloud preserves writes queued before the queue-clear window", async () => {
    await seedCompletedGameWithEventLog("game-existing-before-download");
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.upsert("kbl-tracker", "completedGames", "game-existing-before-download", {
      gameId: "game-existing-before-download",
      date: 100,
    });
    mockState.blockNextUpsert("kbl_stores");

    const flushPromise = syncEngine.flush();
    await mockState.blockedUpsertStarted;

    const downloadPromise = syncEngine.replaceLocalWithCloud();
    await Promise.resolve();
    syncEngine.upsert("kbl-tracker", "completedGames", "game-queued-before-clear", {
      gameId: "game-queued-before-clear",
      date: 1001,
      activityLog: ["queued before clear"],
    });

    mockState.releaseBlockedUpsert?.();
    await flushPromise;
    await downloadPromise;

    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gameId: "game-queued-before-clear" }),
      ]),
    );
    expect(
      mockState.cloudRows.find(
        (row) =>
          row.db_name === "kbl-tracker" &&
          row.store_name === "completedGames" &&
          row.record_key === JSON.stringify("game-queued-before-clear"),
      ),
    ).toEqual(expect.objectContaining({ deleted: false }));
  });

  test("replaceLocalWithCloud restores local data and queues when the cloud pull fails", async () => {
    await seedCompletedGameWithEventLog("game-survives-failed-download");
    mockState.cloudRows = [
      {
        id: "remote-unknown-store",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "unknownEvents",
        record_key: JSON.stringify("event-1"),
        data: { eventId: "event-1" },
        changed_at: 10,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();
    syncEngine.upsert("kbl-tracker", "completedGames", "game-pending-before-failed-download", {
      gameId: "game-pending-before-failed-download",
      date: 777,
    });

    await expect(syncEngine.replaceLocalWithCloud()).rejects.toThrow(
      "Store unknownEvents not found in kbl-event-log",
    );

    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gameId: "game-survives-failed-download" }),
        expect.objectContaining({ gameId: "game-pending-before-failed-download" }),
      ]),
    );
    expect(syncEngine.getStatus().pendingCount).toBe(1);
  });

  test("replaceLocalWithCloud does not persist an advanced cursor when localStorage pull fails after IndexedDB apply", async () => {
    mockState.cloudRows = [
      {
        id: "remote-completed-after-local-failure",
        user_id: "user-1",
        db_name: "kbl-tracker",
        store_name: "completedGames",
        record_key: JSON.stringify("game-after-local-failure"),
        data: { gameId: "game-after-local-failure", date: 888 },
        changed_at: 10,
        deleted: false,
      },
      {
        id: "remote-header-after-local-failure",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "gameHeaders",
        record_key: JSON.stringify("game-after-local-failure"),
        data: { gameId: "game-after-local-failure", eventCount: 1 },
        changed_at: 11,
        deleted: false,
      },
      {
        id: "remote-atbat-after-local-failure",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("game-after-local-failure-ab-1"),
        data: {
          eventId: "game-after-local-failure-ab-1",
          gameId: "game-after-local-failure",
          eventIndex: 1,
        },
        changed_at: 12,
        deleted: false,
      },
    ];
    mockState.localRows = [
      {
        user_id: "user-1",
        key: "kbl-current-season",
        data: "2",
        changed_at: 13,
        deleted: false,
      },
    ];
    mockState.failNextSelectTable = "kbl_local_storage";
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceLocalWithCloud()).rejects.toThrow(
      "Cloud localStorage fetch failed",
    );

    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual([]);
    expect(mockState.metaRows[0]).toEqual(
      expect.objectContaining({
        last_pull_changed_at: 0,
        last_pull_id: null,
      }),
    );

    const freshSyncEngine = await loadFreshSyncEngine();
    await freshSyncEngine.replaceLocalWithCloud();

    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gameId: "game-after-local-failure" }),
      ]),
    );
    await expect(getAllRecords<Record<string, unknown>>("kbl-event-log", "atBatEvents")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventId: "game-after-local-failure-ab-1" }),
      ]),
    );
    expect(mockState.metaRows[0]).toEqual(
      expect.objectContaining({
        last_pull_changed_at: 13,
        last_pull_id: "remote-atbat-after-local-failure",
        last_pull_local_key: "kbl-current-season",
      }),
    );
    expect(localStorage.getItem("kbl-current-season")).toBe("2");
  });

  test("init does not start pulling when the persisted cursor cannot be loaded", async () => {
    mockState.metaRows = [
      {
        user_id: "user-1",
        device_id: "device-1",
        last_pull_changed_at: 10,
        last_pull_id: "cursor-a",
      },
      {
        user_id: "user-1",
        device_id: "device-1",
        last_pull_changed_at: 11,
        last_pull_id: "cursor-b",
      },
    ];
    mockState.cloudRows = [
      {
        id: "remote-should-not-apply",
        user_id: "user-1",
        db_name: "kbl-tracker",
        store_name: "completedGames",
        record_key: JSON.stringify("game-should-not-apply"),
        data: { gameId: "game-should-not-apply", date: 999 },
        changed_at: 12,
        deleted: false,
      },
    ];
    localStorage.setItem("kbl-sync-device-id", "device-1");
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.init()).resolves.toBeUndefined();

    expect(syncEngine.getStatus().error).toContain("Failed to load sync cursor");
    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual([]);
  });

  test("replaceLocalWithCloud reports rollback failure instead of hiding partial restore risk", async () => {
    await seedCompletedGameWithEventLog("game-rollback-fails");
    mockState.cloudRows = [
      {
        id: "remote-unknown-store-rollback",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "unknownEvents",
        record_key: JSON.stringify("event-rollback"),
        data: { eventId: "event-rollback" },
        changed_at: 10,
        deleted: false,
      },
    ];
    const originalPut = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      if (this.name === "completedGames") {
        throw new Error("restore blocked intentionally");
      }
      return originalPut.apply(this, args);
    });
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceLocalWithCloud()).rejects.toThrow(
      "Download failed and rollback failed",
    );
    expect(syncEngine.getStatus().error).toContain("rollback failed");
  });

  test("replaceLocalWithCloud reports when rollback restores data but cannot persist the cursor", async () => {
    await seedCompletedGameWithEventLog("game-rollback-cursor-fails");
    mockState.cloudRows = [
      {
        id: "remote-unknown-store-cursor-rollback",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "unknownEvents",
        record_key: JSON.stringify("event-cursor-rollback"),
        data: { eventId: "event-cursor-rollback" },
        changed_at: 10,
        deleted: false,
      },
    ];
    mockState.failNextUpsertTable = "kbl_sync_meta";
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceLocalWithCloud()).rejects.toThrow(
      "Rollback restored local stores, localStorage, queues, and in-memory cursor but failed to persist restored cursor",
    );
    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual([
      expect.objectContaining({ gameId: "game-rollback-cursor-fails" }),
    ]);
    expect(syncEngine.getStatus().error).toContain("failed to persist restored cursor");
  });

  test("replaceLocalWithCloud rollback cannot save the old account cursor after an account switch", async () => {
    await seedCompletedGameWithEventLog("game-account-switch-rollback");
    mockState.cloudRows = [
      {
        id: "remote-unknown-store-account-switch",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "unknownEvents",
        record_key: JSON.stringify("event-account-switch"),
        data: { eventId: "event-account-switch" },
        changed_at: 10,
        deleted: false,
      },
    ];
    mockState.afterSelect = (table) => {
      if (table === "kbl_stores") mockState.sessionUserId = "user-2";
    };
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceLocalWithCloud()).rejects.toThrow(
      "signed-in account changed during sync",
    );

    expect(mockState.metaRows).toHaveLength(0);
    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual([
      expect.objectContaining({ gameId: "game-account-switch-rollback" }),
    ]);
  });

  test("replaceCloudWithLocal fails verification when the accepted cloud row content differs from local", async () => {
    await seedCompletedGameWithEventLog("game-corrupt-cloud");
    mockState.corruptStoreRecordKey = JSON.stringify("game-corrupt-cloud");
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceCloudWithLocal()).rejects.toThrow("content mismatch");
    expect(syncEngine.getStatus().state).toBe("error");
  });

  test("diagnostics marks equal-count stores as mismatched when row identities differ", async () => {
    await seedCompletedGameWithEventLog("game-local-only");
    mockState.cloudRows = [
      {
        id: "remote-different-game",
        user_id: "user-1",
        db_name: "kbl-tracker",
        store_name: "completedGames",
        record_key: JSON.stringify("game-cloud-only"),
        data: { gameId: "game-cloud-only", date: 321 },
        changed_at: 10,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    const diagnostics = await syncEngine.getDiagnostics();
    const completedGames = diagnostics.stores.find(
      (store) => store.dbName === "kbl-tracker" && store.storeName === "completedGames",
    );

    expect(completedGames).toEqual(
      expect.objectContaining({
        localCount: 1,
        cloudCount: 1,
        status: "mismatch",
      }),
    );
  });

  test("diagnostics surfaces cloud-only dynamic DB rows missing from local meta", async () => {
    mockState.cloudRows = [
      {
        id: "remote-cloud-only-franchise-player",
        user_id: "user-1",
        db_name: "kbl-franchise-cloud-only",
        store_name: "players",
        record_key: JSON.stringify("cloud-only-player"),
        data: buildPlayer("cloud-only-player", "team-cloud-only"),
        changed_at: 10,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    const diagnostics = await syncEngine.getDiagnostics();
    const cloudOnlyStore = diagnostics.stores.find(
      (store) => store.dbName === "kbl-franchise-cloud-only" && store.storeName === "players",
    );

    expect(cloudOnlyStore).toEqual(
      expect.objectContaining({
        localCount: null,
        cloudCount: 1,
        status: "cloud_only",
      }),
    );
  });

  test("diagnostics warns when completed games have no structured play-log event rows", async () => {
    await seedCompletedGameWithEventLog("game-missing-playlog");
    await deleteDatabase("kbl-event-log");
    const syncEngine = await loadFreshSyncEngine();

    const diagnostics = await syncEngine.getDiagnostics();

    expect(diagnostics.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("game-missing-playlog"),
      ]),
    );
  });

  test("diagnostics warns when at-bat events exist without their event-log header", async () => {
    await seedCompletedGameWithEventLog("game-missing-header");
    await deleteGameHeader("game-missing-header");
    const syncEngine = await loadFreshSyncEngine();

    const diagnostics = await syncEngine.getDiagnostics();

    expect(diagnostics.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("no event-log header"),
      ]),
    );
  });

  test("diagnostics warns when fielding-enriched at-bats have no fieldingEvents rows", async () => {
    const gameId = "game-missing-fielding-side-row";
    const eventId = `${gameId}-ab-1`;
    await seedCompletedGameWithEventLog(gameId);
    await putAtBatEventRecord({
      eventId,
      gameId,
      eventIndex: 1,
      enrichment: {
        fieldingSequence: [8],
        fieldingPlayType: "diving",
      },
    });
    const syncEngine = await loadFreshSyncEngine();

    const diagnostics = await syncEngine.getDiagnostics();

    expect(diagnostics.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("fielding enrichment but no fieldingEvents rows"),
      ]),
    );
  });

  test("replaceCloudWithLocal syncs empty-string localStorage values instead of tombstoning them", async () => {
    localStorage.setItem("kbl-current-season", "");
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceCloudWithLocal();

    expect(
      mockState.localRows.find((row) => row.key === "kbl-current-season"),
    ).toEqual(expect.objectContaining({ data: "", deleted: false }));

    const diagnostics = await syncEngine.getDiagnostics();
    expect(diagnostics.localStorage.status).toBe("matched");
  });

  test("incremental localStorage sync uses the same raw-string normalization as full upload and diagnostics", async () => {
    localStorage.setItem("kbl-current-season", "2");
    localStorage.setItem("kbl-app-state", JSON.stringify({ selectedTeamId: "team-1" }));
    const syncEngine = await loadFreshSyncEngine();

    syncEngine.upsertLocal("kbl-current-season", "2");
    syncEngine.upsertLocal("kbl-app-state", { selectedTeamId: "team-1" });
    await syncEngine.flush();

    expect(mockState.localRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "kbl-current-season", data: "2", deleted: false }),
        expect.objectContaining({
          key: "kbl-app-state",
          data: JSON.stringify({ selectedTeamId: "team-1" }),
          deleted: false,
        }),
      ]),
    );

    const diagnostics = await syncEngine.getDiagnostics();
    expect(diagnostics.localStorage.status).toBe("matched");
  });

  test("replaceLocalWithCloud fails instead of advancing past a cloud row for a missing store", async () => {
    mockState.cloudRows = [
      {
        id: "remote-unknown-store",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "unknownEvents",
        record_key: JSON.stringify("event-1"),
        data: { eventId: "event-1" },
        changed_at: 10,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await expect(syncEngine.replaceLocalWithCloud()).rejects.toThrow(
      "Store unknownEvents not found in kbl-event-log",
    );
  });

  test("replaceLocalWithCloud applies cloud pulls across multiple cursor pages", async () => {
    mockState.cloudRows = Array.from({ length: 1205 }, (_, index): StoreRow => ({
      id: `remote-at-bat-${index.toString().padStart(4, "0")}`,
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify(`event-${index}`),
      data: {
        eventId: `event-${index}`,
        gameId: "game-big-pull",
        eventIndex: index,
      },
      changed_at: index + 1,
      deleted: false,
    }));
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    const events = await getAllRecords<Record<string, unknown>>("kbl-event-log", "atBatEvents");
    expect(events).toHaveLength(1205);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventId: "event-0", gameId: "game-big-pull" }),
        expect.objectContaining({ eventId: "event-1204", gameId: "game-big-pull" }),
      ]),
    );
  });

  test("incremental pull fetches late same-changed_at rows with lower ids using received_at cursor", async () => {
    mockState.cloudRows = [
      {
        id: "z-same-time-row",
        user_id: "user-1",
        db_name: "kbl-event-log",
        store_name: "atBatEvents",
        record_key: JSON.stringify("same-time-late-z"),
        data: { eventId: "same-time-late-z", gameId: "game-same-time", result: "SINGLE" },
        changed_at: 100,
        received_at: "2026-01-01T00:00:00.001Z",
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.pull({ throwOnError: true });
    expect(mockState.metaRows[0]).toEqual(expect.objectContaining({
      last_pull_changed_at: 100,
      last_pull_id: "z-same-time-row",
      last_pull_received_at: "2026-01-01T00:00:00.001Z",
    }));

    mockState.cloudRows.push({
      id: "a-same-time-row",
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify("same-time-late-a"),
      data: { eventId: "same-time-late-a", gameId: "game-same-time", result: "DOUBLE" },
      changed_at: 100,
      received_at: "2026-01-01T00:00:00.002Z",
      deleted: false,
    });

    await syncEngine.pull({ throwOnError: true });

    await expect(getAllRecords<Record<string, unknown>>("kbl-event-log", "atBatEvents")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventId: "same-time-late-z", result: "SINGLE" }),
        expect.objectContaining({ eventId: "same-time-late-a", result: "DOUBLE" }),
      ]),
    );
    expect(mockState.metaRows[0]).toEqual(expect.objectContaining({
      last_pull_changed_at: 100,
      last_pull_id: "a-same-time-row",
      last_pull_received_at: "2026-01-01T00:00:00.002Z",
    }));
  });

  test("replaceLocalWithCloud paginates cloud pulls with identical changed_at values using id tie-breaking", async () => {
    mockState.cloudRows = Array.from({ length: 1205 }, (_, index): StoreRow => ({
      id: `same-time-row-${index.toString().padStart(4, "0")}`,
      user_id: "user-1",
      db_name: "kbl-event-log",
      store_name: "atBatEvents",
      record_key: JSON.stringify(`same-time-event-${index}`),
      data: {
        eventId: `same-time-event-${index}`,
        gameId: "game-same-time-pull",
        eventIndex: index,
      },
      changed_at: 123,
      deleted: false,
    }));
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    const events = await getAllRecords<Record<string, unknown>>("kbl-event-log", "atBatEvents");
    expect(events).toHaveLength(1205);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventId: "same-time-event-0" }),
        expect.objectContaining({ eventId: "same-time-event-1204" }),
      ]),
    );
  });

  test("full upload and full download preserve completed games plus the structured play log event rows", async () => {
    await seedCompletedGameWithEventLog("game-round-trip");
    let syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceCloudWithLocal();

    await Promise.allSettled([
      deleteDatabase("kbl-tracker"),
      deleteDatabase("kbl-event-log"),
    ]);
    syncEngine.destroy();
    syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    await expect(getAllRecords<Record<string, unknown>>("kbl-tracker", "completedGames")).resolves.toEqual([
      expect.objectContaining({ gameId: "game-round-trip" }),
    ]);
    await expect(getAllRecords<Record<string, unknown>>("kbl-event-log", "gameHeaders")).resolves.toEqual([
      expect.objectContaining({ gameId: "game-round-trip", eventCount: 2 }),
    ]);
    await expect(getAllRecords<Record<string, unknown>>("kbl-event-log", "atBatEvents")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventId: "game-round-trip-ab-1", gameId: "game-round-trip", result: "SINGLE" }),
        expect.objectContaining({ eventId: "game-round-trip-ab-2", gameId: "game-round-trip", result: "OUT" }),
      ]),
    );
  });
});
