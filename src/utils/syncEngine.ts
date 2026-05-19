/**
 * Sync Engine — Offline-first cloud sync via Supabase
 *
 * Architecture:
 * - Local IndexedDB is the primary store (fast, offline-capable)
 * - Supabase is the sync target for cross-device access
 * - Push: after local writes, queue for background Supabase upsert
 * - Pull: on startup + periodically, fetch changes since last cursor
 * - Conflict resolution: last-write-wins via client-supplied changed_at
 *
 * Key safety features:
 * - suppressSync flag prevents echo loops during pull-apply
 * - Push queue coalesces repeated edits to same record
 * - Cursor only advances after full page of records is applied
 * - Offline queue persists to localStorage for iPad/Safari resilience
 */

import { supabase } from '../supabase';
import {
  SYNC_REGISTRY,
  DYNAMIC_DB_PREFIX,
  DYNAMIC_DB_STORES,
  DYNAMIC_ELIMINATION_DB_PREFIX,
  DYNAMIC_ELIMINATION_DB_STORES,
  SYNCED_LOCAL_STORAGE_KEYS,
  shouldSyncLocalStorageKey,
  serializeKey,
} from './syncConfig';
import { STATIC_DATABASE_SCHEMAS, openDatabaseWithSchema } from './backupRestore';

// ============================================================
// Types
// ============================================================

interface PendingOp {
  dbName: string;
  storeName: string;
  recordKey: string; // JSON.stringify'd
  data: unknown;
  changedAt: number;
  deleted: boolean;
}

interface PendingLocalOp {
  key: string;
  data: unknown;
  changedAt: number;
  deleted: boolean;
}

interface SyncCursor {
  changedAt: number;
  id: string | null;
}

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline' | 'disabled';

export interface SyncStatus {
  state: SyncState;
  lastPullAt: number;
  pendingCount: number;
  error: string | null;
}

type SyncEventDetail = { type: 'sync-complete' | 'status-change' };

// ============================================================
// Constants
// ============================================================

const DEVICE_ID_KEY = 'kbl-sync-device-id';
const QUEUE_PERSIST_KEY = 'kbl-sync-queue';
const LOCAL_QUEUE_PERSIST_KEY = 'kbl-sync-local-queue';
const DRAIN_INTERVAL_MS = 5_000;
const PULL_INTERVAL_MS = 60_000;
const PULL_PAGE_SIZE = 500;
const PUSH_BATCH_SIZE = 100;
const UPLOAD_BATCH_SIZE = 200;

// ============================================================
// Sync Engine Singleton
// ============================================================

class SyncEngine {
  private pushQueue = new Map<string, PendingOp>();
  private localQueue = new Map<string, PendingLocalOp>();
  private deviceId: string;
  private cursor: SyncCursor = { changedAt: 0, id: null };
  private _isSyncing = false;
  private _suppressSync = false;
  private _enabled = true;
  private _error: string | null = null;
  private drainTimer: ReturnType<typeof setInterval> | null = null;
  private pullTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.restoreQueues();
  }

  // ============================================================
  // Initialization
  // ============================================================

  async init(): Promise<void> {
    if (this.initialized) return;
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Load cursor from Supabase
    await this.loadCursor();

    // Start drain and pull timers
    this.drainTimer = setInterval(() => this.drainQueue(), DRAIN_INTERVAL_MS);
    this.pullTimer = setInterval(() => this.pull(), PULL_INTERVAL_MS);

    // Event listeners for flush/online
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush();
      });
      window.addEventListener('pagehide', () => this.flush());
      window.addEventListener('online', () => {
        this.restoreQueues();
        this.drainQueue();
        this.pull();
      });
    }

    this.initialized = true;

    // Initial pull
    this.pull();
  }

  // ============================================================
  // Public API — IndexedDB Records
  // ============================================================

  upsert(dbName: string, storeName: string, recordKey: unknown, data: unknown): void {
    if (!this._enabled || this._suppressSync || !supabase) return;

    const keyStr = serializeKey(recordKey);
    const queueKey = `${dbName}|${storeName}|${keyStr}`;

    this.pushQueue.set(queueKey, {
      dbName,
      storeName,
      recordKey: keyStr,
      data,
      changedAt: Date.now(),
      deleted: false,
    });
  }

  remove(dbName: string, storeName: string, recordKey: unknown): void {
    if (!this._enabled || this._suppressSync || !supabase) return;

    const keyStr = serializeKey(recordKey);
    const queueKey = `${dbName}|${storeName}|${keyStr}`;

    this.pushQueue.set(queueKey, {
      dbName,
      storeName,
      recordKey: keyStr,
      data: {},
      changedAt: Date.now(),
      deleted: true,
    });
  }

  // ============================================================
  // Public API — localStorage
  // ============================================================

  upsertLocal(key: string, data: unknown): void {
    if (!this._enabled || this._suppressSync || !supabase) return;

    this.localQueue.set(key, {
      key,
      data,
      changedAt: Date.now(),
      deleted: false,
    });
  }

  removeLocal(key: string): void {
    if (!this._enabled || this._suppressSync || !supabase) return;

    this.localQueue.set(key, {
      key,
      data: {},
      changedAt: Date.now(),
      deleted: true,
    });
  }

  // ============================================================
  // Public API — Sync Operations
  // ============================================================

  /**
   * Incremental pull — fetch changes since last cursor position.
   */
  async pull(): Promise<void> {
    if (!supabase || this._isSyncing || !this._enabled) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    this._isSyncing = true;
    this.emitStatusChange();

    try {
      // Pull IndexedDB records in pages
      let hasMore = true;
      while (hasMore) {
        const page = await this.pullPage();
        if (page.length < PULL_PAGE_SIZE) {
          hasMore = false;
        }
        if (page.length > 0) {
          await this.applyPage(page);
          // Advance cursor only after successful apply
          const last = page[page.length - 1];
          this.cursor = { changedAt: last.changed_at, id: last.id };
        }
      }

      // Save cursor
      await this.saveCursor();

      // Pull localStorage (always fetch all — small dataset)
      await this.pullLocalStorage();

      this._error = null;
      this.emitEvent('sync-complete');
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Pull failed';
      console.error('[syncEngine] Pull error:', err);
    } finally {
      this._isSyncing = false;
      this.emitStatusChange();
    }
  }

  /**
   * Destructive pull — clear all local synced data, then full pull from cloud.
   */
  async replaceLocalWithCloud(): Promise<void> {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    this._isSyncing = true;
    this._suppressSync = true;
    this.emitStatusChange();

    try {
      // Collect dynamic DB IDs BEFORE clearing meta stores.
      const franchiseIds = await this.getFranchiseIds();
      const eliminationIds = await this.getEliminationIds();

      // Clear all synced IndexedDB stores
      for (const [dbName, stores] of Object.entries(SYNC_REGISTRY)) {
        await this.clearLocalStores(dbName, Object.keys(stores));
      }

      // Clear dynamic franchise DBs
      for (const fId of franchiseIds) {
        const dbName = `${DYNAMIC_DB_PREFIX}${fId}`;
        try {
          await this.deleteDatabase(dbName);
        } catch {
          // DB may not exist
        }
      }

      // Clear dynamic elimination copied DBs
      for (const eliminationId of eliminationIds) {
        const dbName = `${DYNAMIC_ELIMINATION_DB_PREFIX}${eliminationId}`;
        try {
          await this.deleteDatabase(dbName);
        } catch {
          // DB may not exist
        }
      }

      // Clear synced localStorage keys
      for (const key of this.getSyncedLocalStorageKeys()) {
        localStorage.removeItem(key);
      }

      // Reset cursor and pull everything
      this.cursor = { changedAt: 0, id: null };
      this.pushQueue.clear();
      this.localQueue.clear();
      this.persistQueues();

      // pull() checks _isSyncing and would bail — call internal pull logic directly
      this._isSyncing = false;
      await this.pull();
    } finally {
      this._suppressSync = false;
      this._isSyncing = false;
      this.emitStatusChange();
    }
  }

  /**
   * Destructive upload — tombstone all remote data, then upload all local data.
   */
  async replaceCloudWithLocal(
    onProgress?: (dbName: string, storeName: string, sent: number, total: number) => void
  ): Promise<void> {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    this._isSyncing = true;
    this.emitStatusChange();

    try {
      const userId = session.user.id;
      const now = Date.now();

      // Tombstone all existing remote data
      await supabase
        .from('kbl_stores')
        .update({ deleted: true, changed_at: now })
        .eq('user_id', userId)
        .eq('deleted', false);

      await supabase
        .from('kbl_local_storage')
        .update({ deleted: true, changed_at: now })
        .eq('user_id', userId)
        .eq('deleted', false);

      // Upload all synced IndexedDB stores
      for (const [dbName, stores] of Object.entries(SYNC_REGISTRY)) {
        for (const [storeName, keyPath] of Object.entries(stores)) {
          await this.uploadStore(dbName, storeName, keyPath, userId, onProgress);
        }
      }

      // Upload dynamic franchise DBs
      const franchiseIds = await this.getFranchiseIds();
      for (const fId of franchiseIds) {
        const dbName = `${DYNAMIC_DB_PREFIX}${fId}`;
        for (const [storeName, keyPath] of Object.entries(DYNAMIC_DB_STORES)) {
          await this.uploadStore(dbName, storeName, keyPath, userId, onProgress);
        }
      }

      // Upload dynamic elimination copied DBs
      const eliminationIds = await this.getEliminationIds();
      for (const eliminationId of eliminationIds) {
        const dbName = `${DYNAMIC_ELIMINATION_DB_PREFIX}${eliminationId}`;
        for (const [storeName, keyPath] of Object.entries(DYNAMIC_ELIMINATION_DB_STORES)) {
          await this.uploadStore(dbName, storeName, keyPath, userId, onProgress);
        }
      }

      // Upload synced localStorage keys
      const localRows = this.getSyncedLocalStorageKeys()
        .map(key => {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          try {
            return {
              user_id: userId,
              key,
              data: JSON.parse(raw),
              changed_at: now,
              deleted: false,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (localRows.length > 0) {
        await supabase
          .from('kbl_local_storage')
          .upsert(localRows, { onConflict: 'user_id,key' });
      }

      // Update cursor to now (everything is synced)
      this.cursor = { changedAt: now, id: null };
      await this.saveCursor();

      this._error = null;
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Upload failed';
      console.error('[syncEngine] Upload error:', err);
    } finally {
      this._isSyncing = false;
      this.emitStatusChange();
    }
  }

  /**
   * Drain push queue immediately.
   */
  async flush(): Promise<void> {
    await this.drainQueue();
    await this.drainLocalQueue();
  }

  // ============================================================
  // Public API — Status
  // ============================================================

  isSuppressed(): boolean {
    return this._suppressSync;
  }

  getStatus(): SyncStatus {
    return {
      state: this.getState(),
      lastPullAt: this.cursor.changedAt,
      pendingCount: this.pushQueue.size + this.localQueue.size,
      error: this._error,
    };
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.emitStatusChange();
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  // ============================================================
  // Private — Push Queue
  // ============================================================

  private async drainQueue(): Promise<void> {
    if (!supabase || this.pushQueue.size === 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const ops = Array.from(this.pushQueue.values());
    this.pushQueue.clear();

    // Process in batches
    for (let i = 0; i < ops.length; i += PUSH_BATCH_SIZE) {
      const batch = ops.slice(i, i + PUSH_BATCH_SIZE);
      const rows = batch.map(op => ({
        user_id: session.user.id,
        db_name: op.dbName,
        store_name: op.storeName,
        record_key: op.recordKey,
        data: op.data,
        changed_at: op.changedAt,
        deleted: op.deleted,
      }));

      const { error } = await supabase
        .from('kbl_stores')
        .upsert(rows, { onConflict: 'user_id,db_name,store_name,record_key' });

      if (error) {
        // Re-queue failed ops
        for (const op of batch) {
          const queueKey = `${op.dbName}|${op.storeName}|${op.recordKey}`;
          if (!this.pushQueue.has(queueKey)) {
            this.pushQueue.set(queueKey, op);
          }
        }
        console.error('[syncEngine] Push error:', error.message);
        this._error = error.message;
      }
    }

    this.persistQueues();
    this.emitStatusChange();
  }

  private async drainLocalQueue(): Promise<void> {
    if (!supabase || this.localQueue.size === 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const ops = Array.from(this.localQueue.values());
    this.localQueue.clear();

    const rows = ops.map(op => ({
      user_id: session.user.id,
      key: op.key,
      data: op.data,
      changed_at: op.changedAt,
      deleted: op.deleted,
    }));

    const { error } = await supabase
      .from('kbl_local_storage')
      .upsert(rows, { onConflict: 'user_id,key' });

    if (error) {
      // Re-queue
      for (const op of ops) {
        if (!this.localQueue.has(op.key)) {
          this.localQueue.set(op.key, op);
        }
      }
      console.error('[syncEngine] Local push error:', error.message);
    }

    this.persistQueues();
  }

  // ============================================================
  // Private — Pull
  // ============================================================

  private async pullPage(): Promise<Array<{
    id: string;
    db_name: string;
    store_name: string;
    record_key: string;
    data: unknown;
    changed_at: number;
    deleted: boolean;
  }>> {
    if (!supabase) return [];

    let query = supabase
      .from('kbl_stores')
      .select('id, db_name, store_name, record_key, data, changed_at, deleted')
      .order('changed_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PULL_PAGE_SIZE);

    if (this.cursor.id) {
      // Subsequent pull — use composite cursor
      query = query.or(
        `changed_at.gt.${this.cursor.changedAt},` +
        `and(changed_at.eq.${this.cursor.changedAt},id.gt.${this.cursor.id})`
      );
    } else if (this.cursor.changedAt > 0) {
      // Edge case: have changedAt but no id (shouldn't happen, but safe)
      query = query.gt('changed_at', this.cursor.changedAt);
    }
    // First pull (changedAt === 0, id === null): no filter, gets everything

    const { data, error } = await query;

    if (error) {
      throw new Error(`Pull query failed: ${error.message}`);
    }

    return data ?? [];
  }

  private async applyPage(page: Array<{
    db_name: string;
    store_name: string;
    record_key: string;
    data: unknown;
    deleted: boolean;
  }>): Promise<void> {
    const wasSuppressed = this._suppressSync;
    this._suppressSync = true;

    try {
      // Group by database for efficient transaction batching
      const byDb = new Map<string, typeof page>();
      for (const record of page) {
        const key = record.db_name;
        if (!byDb.has(key)) byDb.set(key, []);
        byDb.get(key)!.push(record);
      }

      for (const [dbName, records] of byDb) {
        // Group by store within this DB
        const byStore = new Map<string, typeof records>();
        for (const r of records) {
          if (!byStore.has(r.store_name)) byStore.set(r.store_name, []);
          byStore.get(r.store_name)!.push(r);
        }

        let db: IDBDatabase;
        try {
          db = await this.openDatabase(dbName);
        } catch {
          console.warn(`[syncEngine] Could not open DB ${dbName} for pull, skipping`);
          continue;
        }

        try {
          for (const [storeName, storeRecords] of byStore) {
            if (!db.objectStoreNames.contains(storeName)) {
              console.warn(`[syncEngine] Store ${storeName} not found in ${dbName}, skipping`);
              continue;
            }

            try {
              const tx = db.transaction(storeName, 'readwrite');
              const store = tx.objectStore(storeName);

              for (const record of storeRecords) {
                if (record.deleted) {
                  const idbKey = JSON.parse(record.record_key);
                  store.delete(idbKey);
                } else {
                  store.put(record.data);
                }
              }

              await new Promise<void>((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
              });
            } catch (err) {
              console.error(`[syncEngine] Failed to apply records to ${dbName}.${storeName}:`, err);
              throw err; // Propagate so cursor is not advanced
            }
          }
        } finally {
          db.close();
        }
      }
    } finally {
      this._suppressSync = wasSuppressed;
    }
  }

  private async pullLocalStorage(): Promise<void> {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('kbl_local_storage')
      .select('key, data, deleted');

    if (error) {
      console.error('[syncEngine] localStorage pull error:', error.message);
      return;
    }

    const wasSuppressed = this._suppressSync;
    this._suppressSync = true;
    try {
      for (const row of data ?? []) {
        if (!shouldSyncLocalStorageKey(row.key)) continue;

        if (row.deleted) {
          localStorage.removeItem(row.key);
        } else {
          localStorage.setItem(
            row.key,
            typeof row.data === 'string' ? row.data : JSON.stringify(row.data),
          );
        }
      }
    } finally {
      this._suppressSync = wasSuppressed;
    }
  }

  // ============================================================
  // Private — Destructive Operations Helpers
  // ============================================================

  private async clearLocalStores(dbName: string, storeNames: string[]): Promise<void> {
    let db: IDBDatabase;
    try {
      db = await this.openDatabase(dbName);
    } catch {
      return; // DB doesn't exist
    }

    try {
      for (const storeName of storeNames) {
        if (!db.objectStoreNames.contains(storeName)) continue;
        try {
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).clear();
          await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
        } catch (err) {
          console.warn(`[syncEngine] Failed to clear ${dbName}.${storeName}:`, err);
        }
      }
    } finally {
      db.close();
    }
  }

  private async uploadStore(
    dbName: string,
    storeName: string,
    keyPath: string | string[],
    userId: string,
    onProgress?: (dbName: string, storeName: string, sent: number, total: number) => void
  ): Promise<void> {
    if (!supabase) return;

    let db: IDBDatabase;
    try {
      db = await this.openDatabase(dbName);
    } catch {
      return; // DB doesn't exist
    }

    try {
      if (!db.objectStoreNames.contains(storeName)) return;

      const records: unknown[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (records.length === 0) return;

      const now = Date.now();
      for (let i = 0; i < records.length; i += UPLOAD_BATCH_SIZE) {
        const batch = records.slice(i, i + UPLOAD_BATCH_SIZE);
        const rows = batch.map(record => {
          const rec = record as Record<string, unknown>;
          const key = Array.isArray(keyPath)
            ? keyPath.map(k => rec[k])
            : rec[keyPath];

          return {
            user_id: userId,
            db_name: dbName,
            store_name: storeName,
            record_key: serializeKey(key),
            data: record,
            changed_at: now,
            deleted: false,
          };
        });

        await supabase
          .from('kbl_stores')
          .upsert(rows, { onConflict: 'user_id,db_name,store_name,record_key' });

        onProgress?.(dbName, storeName, Math.min(i + UPLOAD_BATCH_SIZE, records.length), records.length);
      }
    } finally {
      db.close();
    }
  }

  // ============================================================
  // Private — Cursor Management
  // ============================================================

  private async loadCursor(): Promise<void> {
    if (!supabase) return;

    const { data } = await supabase
      .from('kbl_sync_meta')
      .select('last_pull_changed_at, last_pull_id')
      .eq('device_id', this.deviceId)
      .maybeSingle();

    if (data) {
      this.cursor = {
        changedAt: data.last_pull_changed_at,
        id: data.last_pull_id,
      };
    }
  }

  private async saveCursor(): Promise<void> {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('kbl_sync_meta')
      .upsert({
        user_id: session.user.id,
        device_id: this.deviceId,
        last_pull_changed_at: this.cursor.changedAt,
        last_pull_id: this.cursor.id,
      }, { onConflict: 'user_id,device_id' });
  }

  // ============================================================
  // Private — Queue Persistence (offline safety net)
  // ============================================================

  private persistQueues(): void {
    try {
      if (this.pushQueue.size > 0) {
        localStorage.setItem(QUEUE_PERSIST_KEY, JSON.stringify(Array.from(this.pushQueue.entries())));
      } else {
        localStorage.removeItem(QUEUE_PERSIST_KEY);
      }

      if (this.localQueue.size > 0) {
        localStorage.setItem(LOCAL_QUEUE_PERSIST_KEY, JSON.stringify(Array.from(this.localQueue.entries())));
      } else {
        localStorage.removeItem(LOCAL_QUEUE_PERSIST_KEY);
      }
    } catch {
      // localStorage may be full
    }
  }

  private restoreQueues(): void {
    try {
      const pushData = localStorage.getItem(QUEUE_PERSIST_KEY);
      if (pushData) {
        const entries = JSON.parse(pushData) as [string, PendingOp][];
        for (const [key, op] of entries) {
          if (!this.pushQueue.has(key)) {
            this.pushQueue.set(key, op);
          }
        }
        localStorage.removeItem(QUEUE_PERSIST_KEY);
      }

      const localData = localStorage.getItem(LOCAL_QUEUE_PERSIST_KEY);
      if (localData) {
        const entries = JSON.parse(localData) as [string, PendingLocalOp][];
        for (const [key, op] of entries) {
          if (!this.localQueue.has(key)) {
            this.localQueue.set(key, op);
          }
        }
        localStorage.removeItem(LOCAL_QUEUE_PERSIST_KEY);
      }
    } catch {
      // Corrupt data, ignore
    }
  }

  // ============================================================
  // Private — Helpers
  // ============================================================

  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  private getState(): SyncState {
    if (!this._enabled) return 'disabled';
    if (!navigator.onLine) return 'offline';
    if (this._isSyncing) return 'syncing';
    if (this._error) return 'error';
    return 'idle';
  }

  private async getFranchiseIds(): Promise<string[]> {
    try {
      const db = await this.openDatabase('kbl-app-meta');
      try {
        if (!db.objectStoreNames.contains('franchiseList')) return [];

        const records: Array<{ franchiseId: string }> = await new Promise((resolve, reject) => {
          const tx = db.transaction('franchiseList', 'readonly');
          const store = tx.objectStore('franchiseList');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        return records.map(r => r.franchiseId);
      } finally {
        db.close();
      }
    } catch {
      return [];
    }
  }

  private async getEliminationIds(): Promise<string[]> {
    try {
      const db = await this.openDatabase('kbl-app-meta');
      try {
        if (!db.objectStoreNames.contains('eliminationList')) return [];

        const records: Array<{ eliminationId: string }> = await new Promise((resolve, reject) => {
          const tx = db.transaction('eliminationList', 'readonly');
          const store = tx.objectStore('eliminationList');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        return records.map(r => r.eliminationId);
      } finally {
        db.close();
      }
    } catch {
      return [];
    }
  }

  private openDatabase(dbName: string): Promise<IDBDatabase> {
    const staticSchema = STATIC_DATABASE_SCHEMAS[dbName];
    if (staticSchema) {
      return openDatabaseWithSchema(dbName, staticSchema);
    }

    return new Promise((resolve, reject) => {
      const dynamicStores = this.getDynamicStoresForDb(dbName);
      const request = dynamicStores
        ? indexedDB.open(dbName, 1)
        : indexedDB.open(dbName);

      request.onupgradeneeded = () => {
        if (!dynamicStores) return;
        const db = request.result;
        for (const [storeName, keyPath] of Object.entries(dynamicStores)) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath });
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private getDynamicStoresForDb(dbName: string): Record<string, string> | null {
    if (dbName.startsWith(DYNAMIC_DB_PREFIX)) {
      return DYNAMIC_DB_STORES;
    }
    if (dbName.startsWith(DYNAMIC_ELIMINATION_DB_PREFIX)) {
      return DYNAMIC_ELIMINATION_DB_STORES;
    }
    return null;
  }

  private getSyncedLocalStorageKeys(): string[] {
    const keys = new Set(SYNCED_LOCAL_STORAGE_KEYS);
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && shouldSyncLocalStorageKey(key)) {
        keys.add(key);
      }
    }
    return Array.from(keys);
  }

  private deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private emitEvent(type: SyncEventDetail['type']): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(type));
    }
  }

  private emitStatusChange(): void {
    this.emitEvent('status-change');
  }

  destroy(): void {
    if (this.drainTimer) clearInterval(this.drainTimer);
    if (this.pullTimer) clearInterval(this.pullTimer);
    this.persistQueues();
  }
}

// Singleton export
export const syncEngine = new SyncEngine();
