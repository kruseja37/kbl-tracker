/**
 * Sync Engine — Offline-first cloud sync via Supabase
 *
 * Architecture:
 * - Local IndexedDB is the primary store (fast, offline-capable)
 * - Supabase is the sync target for cross-device access
 * - Push: after local writes, queue for background Supabase upsert
 * - Pull: on startup + periodically, fetch changes since last cursor
 * - Conflict resolution: database-side atomic writes reject older changed_at rows
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
  opId?: string;
  baseReceivedAt?: string | null;
  baseId?: string | null;
  dbName: string;
  storeName: string;
  recordKey: string; // JSON.stringify'd
  data: unknown;
  changedAt: number;
  deleted: boolean;
}

interface PendingLocalOp {
  opId?: string;
  baseReceivedAt?: string | null;
  baseKey?: string | null;
  key: string;
  data: unknown;
  changedAt: number;
  deleted: boolean;
}

interface CloudStoreWriteRow {
  user_id: string;
  db_name: string;
  store_name: string;
  record_key: string;
  data: unknown;
  changed_at: number;
  deleted: boolean;
  op_id?: string;
  base_received_at?: string | null;
  base_id?: string | null;
}

interface CloudLocalStorageWriteRow {
  user_id: string;
  key: string;
  data: unknown;
  changed_at: number;
  deleted: boolean;
  op_id?: string;
  base_received_at?: string | null;
  base_key?: string | null;
}

interface AtomicUpsertResultRow {
  row_index?: number;
  status?: 'accepted' | 'skipped' | 'duplicate';
  accepted_count?: number;
  skipped_count?: number;
  duplicate_count?: number;
}

interface CloudStoreCountRow {
  db_name: string;
  store_name: string;
}

interface CloudStoreIdentityRow extends CloudStoreCountRow {
  record_key: string;
}

interface CloudStoreDataRow extends CloudStoreIdentityRow {
  data: unknown;
}

interface CloudStoreVerifiedDataRow extends CloudStoreDataRow {
  id: string;
  received_at?: string | null;
}

interface CloudStoreWriteBaseRow extends CloudStoreVerifiedDataRow {
  changed_at: number;
  deleted: boolean;
}

interface CloudLocalStorageIdentityRow {
  key: string;
}

interface CloudLocalStorageDataRow extends CloudLocalStorageIdentityRow {
  data: unknown;
}

interface CloudLocalStorageVerifiedDataRow extends CloudLocalStorageDataRow {
  received_at?: string | null;
}

interface CloudLocalStorageWriteBaseRow extends CloudLocalStorageVerifiedDataRow {
  changed_at: number;
  deleted: boolean;
}

interface CloudStoreChangedAtRow extends CloudStoreIdentityRow {
  changed_at: number;
}

interface CloudStoreCursorRow extends CloudStoreChangedAtRow {
  id: string;
  received_at?: string | null;
}

interface CloudLocalStorageChangedAtRow extends CloudLocalStorageIdentityRow {
  changed_at: number;
}

interface CloudLocalStorageCursorRow extends CloudLocalStorageChangedAtRow {
  received_at?: string | null;
}

interface SyncCursor {
  changedAt: number;
  id: string | null;
  receivedAt?: string | null;
  localReceivedAt?: string | null;
  localKey?: string | null;
}

interface CloudStoreRow {
  id: string;
  db_name: string;
  store_name: string;
  record_key: string;
  data: unknown;
  changed_at: number;
  received_at?: string | null;
  deleted: boolean;
}

interface PullApplyResult {
  appliedCursor: SyncCursor | null;
  skippedConflicts: boolean;
}

interface QueueSnapshot {
  pushQueue: Map<string, PendingOp>;
  localQueue: Map<string, PendingLocalOp>;
}

interface LocalStoreSnapshot {
  dbName: string;
  storeName: string;
  records: unknown[];
}

interface LocalDownloadSnapshot extends QueueSnapshot {
  cursor: SyncCursor;
  localStorage: Map<string, string>;
  stores: LocalStoreSnapshot[];
  dynamicDbNames: string[];
}

interface VerifiedWriteBases {
  stores: Map<string, { receivedAt: string; id: string }>;
  localStorage: Map<string, { receivedAt: string; key: string }>;
}

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline' | 'disabled';

export interface SyncStatus {
  state: SyncState;
  lastPullAt: number;
  pendingCount: number;
  error: string | null;
}

export interface SyncStoreDiagnostic {
  dbName: string;
  storeName: string;
  localCount: number | null;
  cloudCount: number | null;
  status: 'matched' | 'local_only' | 'cloud_only' | 'mismatch' | 'unknown';
}

export interface SyncDiagnosticsSnapshot {
  deviceId: string;
  generatedAt: number;
  build: {
    id?: string;
    mode?: string;
    version?: string;
    sha?: string;
    builtAt?: string;
    serviceWorkerControlled?: boolean;
    serviceWorkerScriptURL?: string;
    serviceWorkerActiveScriptURL?: string;
    serviceWorkerWaiting?: boolean;
    serviceWorkerWaitingScriptURL?: string;
    serviceWorkerInstalling?: boolean;
    serviceWorkerScope?: string;
    serviceWorkerCacheNames?: string[];
    serviceWorkerError?: string;
    latest?: {
      id?: string;
      version?: string;
      sha?: string;
      builtAt?: string;
      fetchedAt: number;
      matchesCurrent: boolean | null;
      error?: string;
    };
  };
  lastPullAt: number;
  pendingCount: number;
  stores: SyncStoreDiagnostic[];
  localStorage: {
    localCount: number;
    cloudCount: number | null;
    status: 'matched' | 'local_only' | 'cloud_only' | 'mismatch' | 'unknown';
  };
  warnings: string[];
}

type SyncEventDetail = { type: 'sync-complete' | 'status-change' };

// ============================================================
// Constants
// ============================================================

const DEVICE_ID_KEY = 'kbl-sync-device-id';
const QUEUE_PERSIST_KEY = 'kbl-sync-queue';
const LOCAL_QUEUE_PERSIST_KEY = 'kbl-sync-local-queue';
const STORE_WRITE_BASES_PERSIST_KEY = 'kbl-sync-store-write-bases';
const LOCAL_WRITE_BASES_PERSIST_KEY = 'kbl-sync-local-write-bases';
const LAST_WRITE_TIME_KEY = 'kbl-sync-last-write-time';
const DRAIN_INTERVAL_MS = 5_000;
const PULL_INTERVAL_MS = 60_000;
const PULL_PAGE_SIZE = 500;
const PUSH_BATCH_SIZE = 100;
const UPLOAD_BATCH_SIZE = 200;
const CLOUD_PAGE_SIZE = 1_000;

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
  private queuePersistenceError: string | null = null;
  private writeBasePersistenceError: string | null = null;
  private drainTimer: ReturnType<typeof setInterval> | null = null;
  private pullTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private queueDrainsBlocked = false;
  private activeSyncOperation: Promise<void> | null = null;
  private syncOperationQueue: Promise<void> = Promise.resolve();
  private queuedSyncOperationCount = 0;
  private drainQueuePromise: Promise<void> | null = null;
  private drainLocalQueuePromise: Promise<void> | null = null;
  private inFlightPushDrainOps = new Map<string, PendingOp>();
  private inFlightLocalDrainOps = new Map<string, PendingLocalOp>();
  private localMutationGeneration = 0;
  private storeMutationGenerations = new Map<string, number>();
  private localStorageMutationGenerations = new Map<string, number>();
  private storeWriteBaseOverrides = new Map<string, { receivedAt: string; id: string }>();
  private localWriteBaseOverrides = new Map<string, { receivedAt: string; key: string }>();
  private restoredPushQueueKeys = new Set<string>();
  private restoredLocalQueueKeys = new Set<string>();
  private lastGeneratedChangedAt = 0;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.restoreWriteBaseOverrides();
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

    // Load cursor before any pull. If this fails, an initial pull from zero
    // could replay stale cloud rows, so leave sync unstarted until retry.
    try {
      await this.loadCursor();
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Failed to load sync cursor';
      this.emitStatusChange();
      return;
    }
    if (!this.queuePersistenceError && !this.writeBasePersistenceError) {
      this._error = null;
    }

    // Start drain and pull timers
    this.drainTimer = setInterval(() => this.flush(), DRAIN_INTERVAL_MS);
    this.pullTimer = setInterval(() => this.pull(), PULL_INTERVAL_MS);

    // Event listeners for flush/online
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush();
      });
      window.addEventListener('pagehide', () => this.flush());
      window.addEventListener('online', () => {
        this.restoreQueues();
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
    this.rememberStoreMutation(queueKey);
    this.restoredPushQueueKeys.delete(queueKey);

    this.pushQueue.set(queueKey, {
      opId: this.createQueueOpId('store'),
      ...this.pendingStoreBaseForIdentity(this.storeIdentityKey(dbName, storeName, keyStr)),
      dbName,
      storeName,
      recordKey: keyStr,
      data,
      changedAt: this.nextChangedAt(this.cursor.changedAt + 1),
      deleted: false,
    });
    this.persistQueues();
    this.emitStatusChange();
  }

  remove(dbName: string, storeName: string, recordKey: unknown): void {
    if (!this._enabled || this._suppressSync || !supabase) return;

    const keyStr = serializeKey(recordKey);
    const queueKey = `${dbName}|${storeName}|${keyStr}`;
    this.rememberStoreMutation(queueKey);
    this.restoredPushQueueKeys.delete(queueKey);

    this.pushQueue.set(queueKey, {
      opId: this.createQueueOpId('store'),
      ...this.pendingStoreBaseForIdentity(this.storeIdentityKey(dbName, storeName, keyStr)),
      dbName,
      storeName,
      recordKey: keyStr,
      data: {},
      changedAt: this.nextChangedAt(this.cursor.changedAt + 1),
      deleted: true,
    });
    this.persistQueues();
    this.emitStatusChange();
  }

  // ============================================================
  // Public API — localStorage
  // ============================================================

  upsertLocal(key: string, data: unknown): void {
    if (!this._enabled || this._suppressSync || !supabase) return;

    this.rememberLocalStorageMutation(key);
    this.restoredLocalQueueKeys.delete(key);
    this.localQueue.set(key, {
      opId: this.createQueueOpId('local'),
      ...this.pendingLocalBaseForKey(key),
      key,
      data: this.toLocalStorageWireValue(data),
      changedAt: this.nextChangedAt(this.cursor.changedAt + 1),
      deleted: false,
    });
    this.persistQueues();
    this.emitStatusChange();
  }

  removeLocal(key: string): void {
    if (!this._enabled || this._suppressSync || !supabase) return;

    this.rememberLocalStorageMutation(key);
    this.restoredLocalQueueKeys.delete(key);
    this.localQueue.set(key, {
      opId: this.createQueueOpId('local'),
      ...this.pendingLocalBaseForKey(key),
      key,
      data: {},
      changedAt: this.nextChangedAt(this.cursor.changedAt + 1),
      deleted: true,
    });
    this.persistQueues();
    this.emitStatusChange();
  }

  // ============================================================
  // Public API — Sync Operations
  // ============================================================

  /**
   * Incremental pull — fetch changes since last cursor position.
   */
  async pull(options: { throwOnError?: boolean } = {}): Promise<void> {
    if (!supabase || !this._enabled) return;
    const client = supabase;

    await this.runSyncOperation(false, async () => {
      const { data: { session } } = await client.auth.getSession();
      if (!session) return;

      try {
        await this.loadCursor();
        await this.flush();
        await this.pullForUser(session.user.id);
      } catch (err) {
        this._error = err instanceof Error ? err.message : 'Pull failed';
        console.error('[syncEngine] Pull error:', err);
        if (options.throwOnError) {
          throw err;
        }
      }
    });
  }

  /**
   * Destructive pull — clear all local synced data, then full pull from cloud.
   */
  async replaceLocalWithCloud(): Promise<void> {
    if (!supabase) return;
    const client = supabase;

    await this.runSyncOperation(true, async () => {
      let rollbackSnapshot: LocalDownloadSnapshot | null = null;
      let queuesAtOperationStart: QueueSnapshot | null = null;
      try {
        this.queueDrainsBlocked = true;
        queuesAtOperationStart = this.snapshotQueues();
        await this.waitForQueueDrains();

        const { data: { session } } = await client.auth.getSession();
        if (!session) return;
        await this.loadCursor();

        // Collect dynamic DB IDs BEFORE clearing meta stores.
        const franchiseIds = await this.getFranchiseIds({ throwOnError: true });
        const eliminationIds = await this.getEliminationIds({ throwOnError: true });
        const cloudDynamicDbNames = await this.getCloudDynamicDbNames(session.user.id);

        rollbackSnapshot = await this.captureLocalDownloadSnapshot(
          franchiseIds,
          eliminationIds,
          cloudDynamicDbNames,
        );

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
        this.cursor = {
          changedAt: 0,
          id: null,
          receivedAt: null,
          localReceivedAt: null,
          localKey: null,
        };
        await this.pullForUser(session.user.id, { emitComplete: false });

        // A successful destructive cloud download supersedes local pending sync work
        // that existed before it began, including failed in-flight drain requeues.
        this.discardUnchangedQueuedOps(queuesAtOperationStart);
        await this.reapplyQueuedWritesToLocal();
        this.queueDrainsBlocked = false;
        this.persistQueues();
        rollbackSnapshot = null;
        await this.flush({ throwOnPending: true });
        this._error = null;
        this.emitEvent('sync-complete');
      } catch (err) {
        let rollbackError: unknown = null;
        if (rollbackSnapshot) {
          const currentQueues = this.snapshotQueues();
          try {
            await this.restoreLocalDownloadSnapshot(rollbackSnapshot, currentQueues);
          } catch (restoreErr) {
            rollbackError = restoreErr;
            console.error('[syncEngine] Download rollback error:', restoreErr);
          }
        }
        const originalMessage = err instanceof Error ? err.message : 'Download failed';
        if (rollbackError) {
          const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
          this._error = `Download failed and rollback failed: ${originalMessage}; rollback: ${rollbackMessage}`;
          console.error('[syncEngine] Download error:', err);
          throw new Error(this._error);
        }
        this._error = originalMessage;
        console.error('[syncEngine] Download error:', err);
        throw err;
      } finally {
        this.queueDrainsBlocked = false;
      }
    });
  }

  /**
   * Full upload — upload all local data, then tombstone remote rows that no
   * longer exist locally. This avoids wiping a good cloud snapshot before we
   * know every replacement batch was accepted.
   */
  async replaceCloudWithLocal(
    onProgress?: (dbName: string, storeName: string, sent: number, total: number) => void
  ): Promise<void> {
    if (!supabase) return;
    const client = supabase;

    await this.runSyncOperation(true, async () => {
      let queuesAtOperationStart: QueueSnapshot | null = null;
      try {
        this.queueDrainsBlocked = true;
        queuesAtOperationStart = this.snapshotQueues();
        await this.waitForQueueDrains();

        const { data: { session } } = await client.auth.getSession();
        if (!session) return;
        await this.loadCursor();

        const playLogWarnings = await this.getLocalPlayLogIntegrityWarnings({ throwOnReadError: true });
        const blockingPlayLogWarnings = playLogWarnings.filter((warning) =>
          this.isBlockingPlayLogUploadWarning(warning),
        );
        if (blockingPlayLogWarnings.length > 0) {
          const suffix = blockingPlayLogWarnings.length > 3 ? `; +${blockingPlayLogWarnings.length - 3} more` : '';
          throw new Error(`Cannot upload incomplete play-log data: ${blockingPlayLogWarnings.slice(0, 3).join('; ')}${suffix}`);
        }

        const userId = session.user.id;
        const franchiseIds = await this.getFranchiseIds({ throwOnError: true });
        const eliminationIds = await this.getEliminationIds({ throwOnError: true });
        const replacementStoreScopes = new Set(
          this.getReplacementStoreRefs(franchiseIds, eliminationIds)
            .flatMap(({ dbName, storeNames }) =>
              storeNames.map((storeName) => this.storeCountKey(dbName, storeName))
            ),
        );
        const operationBaseCursor = { ...this.cursor };
        await this.assertCloudUnchangedSinceCursor(
          userId,
          replacementStoreScopes,
          operationBaseCursor,
        );

        const now = this.nextChangedAt(this.cursor.changedAt + 1);
        const expectedStoreKeys = new Set<string>();
        const expectedStoreFingerprints = new Map<string, string>();
        const scannedStoreScopes = new Set<string>();
        const rememberUpload = (
          dbName: string,
          storeName: string,
          result: { identities: Set<string>; fingerprints: Map<string, string> },
        ) => {
          scannedStoreScopes.add(this.storeCountKey(dbName, storeName));
          for (const identity of result.identities) {
            expectedStoreKeys.add(identity);
          }
          for (const [identity, fingerprint] of result.fingerprints) {
            expectedStoreFingerprints.set(identity, fingerprint);
          }
        };

        // Upload all synced IndexedDB stores
        for (const [dbName, stores] of Object.entries(SYNC_REGISTRY)) {
          for (const [storeName, keyPath] of Object.entries(stores)) {
            rememberUpload(
              dbName,
              storeName,
              await this.uploadStore(dbName, storeName, keyPath, userId, now, operationBaseCursor, onProgress),
            );
          }
        }

        // Upload dynamic franchise DBs
        for (const fId of franchiseIds) {
          const dbName = `${DYNAMIC_DB_PREFIX}${fId}`;
          for (const [storeName, keyPath] of Object.entries(DYNAMIC_DB_STORES)) {
            rememberUpload(
              dbName,
              storeName,
              await this.uploadStore(dbName, storeName, keyPath, userId, now, operationBaseCursor, onProgress),
            );
          }
        }

        // Upload dynamic elimination copied DBs
        for (const eliminationId of eliminationIds) {
          const dbName = `${DYNAMIC_ELIMINATION_DB_PREFIX}${eliminationId}`;
          for (const [storeName, keyPath] of Object.entries(DYNAMIC_ELIMINATION_DB_STORES)) {
            rememberUpload(
              dbName,
              storeName,
              await this.uploadStore(dbName, storeName, keyPath, userId, now, operationBaseCursor, onProgress),
            );
          }
        }

        // Upload synced localStorage keys
        const {
          rows: localRows,
          expectedKeys: expectedLocalKeys,
          expectedLocalFingerprints,
        } =
          this.buildLocalStorageUploadRows(userId, now, operationBaseCursor);

        if (localRows.length > 0) {
          await this.atomicUpsertLocalStorageRows(localRows, 'localStorage upload failed');
        }

        await this.tombstoneStaleCloudStoreRows(
          userId,
          expectedStoreKeys,
          scannedStoreScopes,
          now,
          operationBaseCursor,
        );
        await this.tombstoneStaleCloudLocalStorageRows(
          userId,
          expectedLocalKeys,
          now,
          operationBaseCursor,
        );
        const verifiedWriteBases = await this.verifyCloudMatchesExpected(
          userId,
          expectedStoreFingerprints,
          expectedLocalFingerprints,
          scannedStoreScopes,
        );
        this.rememberStoreWriteBaseOverrides(verifiedWriteBases.stores);
        this.rememberLocalStorageWriteBaseOverrides(verifiedWriteBases.localStorage);
        if (!this.persistWriteBaseOverrides()) {
          throw new Error('Upload completed cloud verification but could not persist write bases for reload-safe edits');
        }

        this.cursor = operationBaseCursor;
        await this.saveCursor();

        this.queueDrainsBlocked = false;
        // A successful full replacement supersedes any incremental operations queued
        // before it, including failed in-flight drain requeues.
        this.discardUnchangedQueuedOps(queuesAtOperationStart);
        this.rebaseQueuedOpsFromWriteBaseOverrides();
        this.persistQueues();
        await this.flush({ throwOnPending: true });
        this._error = null;
        this.emitEvent('sync-complete');
      } catch (err) {
        const currentQueues = this.snapshotQueues();
        this.pushQueue = new Map(queuesAtOperationStart?.pushQueue ?? []);
        this.localQueue = new Map(queuesAtOperationStart?.localQueue ?? []);
        this.mergeQueuedOps(currentQueues);
        this.persistQueues();
        this._error = err instanceof Error ? err.message : 'Upload failed';
        console.error('[syncEngine] Upload error:', err);
        throw err;
      } finally {
        this.queueDrainsBlocked = false;
      }
    });
  }

  /**
   * Drain push queue immediately.
   */
  async flush(options: { throwOnPending?: boolean } = {}): Promise<void> {
    await this.drainQueue();
    await this.drainLocalQueue();
    const pendingCount = this.getPendingOperationCount();
    const durabilityError = this.writeBasePersistenceError ?? this.queuePersistenceError;
    if (options.throwOnPending && (pendingCount > 0 || durabilityError)) {
      throw new Error(
        this._error || durabilityError
          ? `Final sync flush incomplete with ${pendingCount} pending operation(s): ${this._error ?? durabilityError}`
          : `Final sync flush incomplete with ${pendingCount} pending operation(s)`,
      );
    }
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
      pendingCount: this.getPendingOperationCount(),
      error: this._error,
    };
  }

  async getDiagnostics(): Promise<SyncDiagnosticsSnapshot> {
    const requestedStores: Array<{ dbName: string; storeName: string; keyPath: string | string[] }> = [];
    for (const [dbName, stores] of Object.entries(SYNC_REGISTRY)) {
      for (const [storeName, keyPath] of Object.entries(stores)) {
        requestedStores.push({ dbName, storeName, keyPath });
      }
    }

    const [franchiseIds, eliminationIds] = await Promise.all([
      this.getFranchiseIds(),
      this.getEliminationIds(),
    ]);

    for (const franchiseId of franchiseIds) {
      for (const [storeName, keyPath] of Object.entries(DYNAMIC_DB_STORES)) {
        requestedStores.push({ dbName: `${DYNAMIC_DB_PREFIX}${franchiseId}`, storeName, keyPath });
      }
    }

    for (const eliminationId of eliminationIds) {
      for (const [storeName, keyPath] of Object.entries(DYNAMIC_ELIMINATION_DB_STORES)) {
        requestedStores.push({ dbName: `${DYNAMIC_ELIMINATION_DB_PREFIX}${eliminationId}`, storeName, keyPath });
      }
    }

    const localFingerprints = new Map<string, Map<string, string> | null>();
    await Promise.all(requestedStores.map(async ({ dbName, storeName, keyPath }) => {
      localFingerprints.set(
        this.storeCountKey(dbName, storeName),
        await this.getLocalStoreFingerprints(dbName, storeName, keyPath),
      );
    }));

    let cloudFingerprints = new Map<string, string>();
    let cloudStoreDataAvailable = false;
    let cloudLocalStorageFingerprints: Map<string, string> | null = null;

    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          cloudStoreDataAvailable = true;
          cloudFingerprints = await this.getCloudStoreFingerprints(session.user.id);
        } catch (error) {
          cloudStoreDataAvailable = false;
          console.error('[syncEngine] diagnostics store data error:', error);
        }

        try {
          cloudLocalStorageFingerprints = await this.getCloudLocalStorageFingerprints(session.user.id);
        } catch (error) {
          cloudLocalStorageFingerprints = null;
          console.error('[syncEngine] diagnostics localStorage data error:', error);
        }
      }
    }

    const stores = requestedStores.map(({ dbName, storeName }): SyncStoreDiagnostic => {
      const key = this.storeCountKey(dbName, storeName);
      const local = localFingerprints.get(key) ?? null;
      const cloud = cloudStoreDataAvailable
        ? this.filterStoreFingerprints(cloudFingerprints, dbName, storeName)
        : null;
      const localCount = local?.size ?? null;
      const cloudCount = cloud?.size ?? null;
      let status: SyncStoreDiagnostic['status'] = 'unknown';
      if (localCount === null || cloudCount === null) {
        status = localCount === null && cloudCount === null ? 'unknown' : localCount === null ? 'cloud_only' : 'local_only';
      } else if (local && cloud && this.fingerprintMapsEqual(local, cloud)) {
        status = 'matched';
      } else {
        status = 'mismatch';
      }
      return { dbName, storeName, localCount, cloudCount, status };
    });

    if (cloudStoreDataAvailable) {
      const requestedStoreKeys = new Set(
        requestedStores.map(({ dbName, storeName }) => this.storeCountKey(dbName, storeName)),
      );
      const cloudOnlyDynamicStores = new Map<string, { dbName: string; storeName: string; count: number }>();
      for (const identity of cloudFingerprints.keys()) {
        const [dbName, storeName] = identity.split('\u0000');
        const key = this.storeCountKey(dbName, storeName);
        if (
          !requestedStoreKeys.has(key) &&
          (dbName.startsWith(DYNAMIC_DB_PREFIX) || dbName.startsWith(DYNAMIC_ELIMINATION_DB_PREFIX))
        ) {
          const existing = cloudOnlyDynamicStores.get(key);
          cloudOnlyDynamicStores.set(key, {
            dbName,
            storeName,
            count: (existing?.count ?? 0) + 1,
          });
        }
      }

      for (const { dbName, storeName, count } of cloudOnlyDynamicStores.values()) {
        stores.push({
          dbName,
          storeName,
          localCount: null,
          cloudCount: count,
          status: 'cloud_only',
        });
      }
    }

    const localStorageFingerprints = this.getLocalStorageFingerprints();
    const localStorageStatus = this.getDiagnosticStatus(localStorageFingerprints, cloudLocalStorageFingerprints);
    const warnings = await this.getLocalPlayLogIntegrityWarnings();
    if (this.queuePersistenceError) {
      warnings.push(this.queuePersistenceError);
    }
    if (this.writeBasePersistenceError) {
      warnings.push(this.writeBasePersistenceError);
    }
    const currentBuild = {
      id: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_BUILD_ID : undefined,
      mode: typeof import.meta !== 'undefined' ? import.meta.env?.MODE : undefined,
      version: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_APP_VERSION : undefined,
      sha: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_BUILD_SHA : undefined,
      builtAt: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_BUILD_TIME : undefined,
    };
    const [serviceWorkerDiagnostics, latestBuildDiagnostics] = await Promise.all([
      this.getServiceWorkerDiagnostics(),
      this.getLatestBuildDiagnostics(currentBuild),
    ]);

    return {
      deviceId: this.deviceId,
      generatedAt: Date.now(),
      build: {
        ...currentBuild,
        ...serviceWorkerDiagnostics,
        latest: latestBuildDiagnostics,
      },
      lastPullAt: this.cursor.changedAt,
      pendingCount: this.getPendingOperationCount(),
      stores,
      localStorage: {
        localCount: localStorageFingerprints.size,
        cloudCount: cloudLocalStorageFingerprints?.size ?? null,
        status: localStorageStatus,
      },
      warnings,
    };
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.emitStatusChange();
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  private async runSyncOperation(
    waitForActive: boolean,
    operation: () => Promise<void>,
  ): Promise<void> {
    const hasActiveOrQueuedOperation =
      Boolean(this.activeSyncOperation) || this.queuedSyncOperationCount > 0;
    if (!waitForActive && hasActiveOrQueuedOperation) {
      return;
    }

    this.queuedSyncOperationCount += 1;
    const execute = async () => {
      let releaseActiveOperation: () => void = () => {};
      const activeOperation = new Promise<void>((resolve) => {
        releaseActiveOperation = resolve;
      });

      this.activeSyncOperation = activeOperation;
      this._isSyncing = true;
      this.emitStatusChange();

      try {
        await operation();
      } finally {
        if (this.activeSyncOperation === activeOperation) {
          this.activeSyncOperation = null;
        }
        releaseActiveOperation();
        this._isSyncing = false;
        this.emitStatusChange();
      }
    };

    const queuedRun = hasActiveOrQueuedOperation
      ? this.syncOperationQueue.catch(() => undefined).then(execute)
      : execute();

    this.syncOperationQueue = queuedRun.catch(() => undefined);

    try {
      await queuedRun;
    } finally {
      this.queuedSyncOperationCount -= 1;
    }
  }

  // ============================================================
  // Private — Push Queue
  // ============================================================

  private async drainQueue(): Promise<void> {
    if (this.drainQueuePromise) return this.drainQueuePromise;

    const promise = this.drainQueueOnce().finally(() => {
      if (this.drainQueuePromise === promise) {
        this.drainQueuePromise = null;
      }
    });
    this.drainQueuePromise = promise;
    return promise;
  }

  private async drainQueueOnce(): Promise<void> {
    if (this.queueDrainsBlocked) return;
    if (!supabase || this.pushQueue.size === 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const ops = Array.from(this.pushQueue.values());
    const inFlightOps = new Map(ops.map((op) => [this.pushQueueKey(op), op]));
    this.inFlightPushDrainOps = inFlightOps;
    this.pushQueue.clear();

    try {
      // Process in batches
      for (let i = 0; i < ops.length; i += PUSH_BATCH_SIZE) {
        const batch = ops.slice(i, i + PUSH_BATCH_SIZE);
        const liveBatch = batch;
        if (liveBatch.length === 0) continue;

        const rows = liveBatch.map(op => ({
          user_id: session.user.id,
          db_name: op.dbName,
          store_name: op.storeName,
          record_key: op.recordKey,
          data: op.data,
          changed_at: op.changedAt,
          deleted: op.deleted,
          base_received_at: op.baseReceivedAt ?? null,
          base_id: op.baseId ?? null,
          ...(op.opId ? { op_id: op.opId } : {}),
        }));

        let statuses: AtomicUpsertResultRow[];
        try {
          statuses = await this.atomicUpsertStoreRows(rows, 'Push failed');
        } catch (error) {
          // Re-queue failed ops
          this.requeueStoreOps(liveBatch);
          const message = error instanceof Error ? error.message : 'Push failed';
          console.error('[syncEngine] Push error:', message);
          this._error = message;
          continue;
        }

        const skippedOps: PendingOp[] = [];
        const acceptedFingerprints = new Map<string, string>();
        for (const op of liveBatch) {
          const rowIndex = rows.findIndex((row) =>
            row.db_name === op.dbName &&
            row.store_name === op.storeName &&
            row.record_key === op.recordKey
          );
          const status = statuses.find((row) => row.row_index === rowIndex)?.status ?? 'accepted';
          if (status === 'skipped') {
            skippedOps.push(op);
          } else {
            this.restoredPushQueueKeys.delete(this.pushQueueKey(op));
            if (status === 'accepted' || status === 'duplicate') {
              acceptedFingerprints.set(
                this.storeIdentityKey(op.dbName, op.storeName, op.recordKey),
                this.fingerprintStoreWriteState(op.data, op.deleted),
              );
            }
          }
        }
        if (skippedOps.length > 0) {
          this.requeueStoreOps(skippedOps);
          this._error = `Push blocked by ${skippedOps.length} stale write(s); cloud has newer rows`;
        }
        if (acceptedFingerprints.size > 0) {
          try {
            await this.refreshStoreWriteBaseOverrides(session.user.id, acceptedFingerprints);
            this.rebaseQueuedOpsFromWriteBaseOverrides(new Set(acceptedFingerprints.keys()));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to refresh store write bases';
            console.error('[syncEngine] Store write base refresh error:', message);
            this._error = message;
          }
        }
      }
    } finally {
      if (this.inFlightPushDrainOps === inFlightOps) {
        this.inFlightPushDrainOps = new Map();
      }
    }

    this.persistQueues();
    this.emitStatusChange();
  }

  private async drainLocalQueue(): Promise<void> {
    if (this.drainLocalQueuePromise) return this.drainLocalQueuePromise;

    const promise = this.drainLocalQueueOnce().finally(() => {
      if (this.drainLocalQueuePromise === promise) {
        this.drainLocalQueuePromise = null;
      }
    });
    this.drainLocalQueuePromise = promise;
    return promise;
  }

  private async drainLocalQueueOnce(): Promise<void> {
    if (this.queueDrainsBlocked) return;
    if (!supabase || this.localQueue.size === 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const ops = Array.from(this.localQueue.values());
    const inFlightOps = new Map(ops.map((op) => [op.key, op]));
    this.inFlightLocalDrainOps = inFlightOps;
    this.localQueue.clear();

    try {
      const liveOps = ops;
      if (liveOps.length === 0) return;

      const rows = liveOps.map(op => ({
        user_id: session.user.id,
        key: op.key,
        data: op.deleted ? {} : this.toLocalStorageWireValue(op.data),
        changed_at: op.changedAt,
        deleted: op.deleted,
        base_received_at: op.baseReceivedAt ?? null,
        base_key: op.baseKey ?? null,
        ...(op.opId ? { op_id: op.opId } : {}),
      }));

      let statuses: AtomicUpsertResultRow[];
      try {
        statuses = await this.atomicUpsertLocalStorageRows(rows, 'Local push failed');
      } catch (error) {
        // Re-queue
        this.requeueLocalStorageOps(liveOps);
        const message = error instanceof Error ? error.message : 'Local push failed';
        console.error('[syncEngine] Local push error:', message);
        this._error = message;
        return;
      }

      const skippedOps: PendingLocalOp[] = [];
      const acceptedFingerprints = new Map<string, string>();
      for (const op of liveOps) {
        const rowIndex = rows.findIndex((row) => row.key === op.key);
        const status = statuses.find((row) => row.row_index === rowIndex)?.status ?? 'accepted';
        if (status === 'skipped') {
          skippedOps.push(op);
        } else {
          this.restoredLocalQueueKeys.delete(op.key);
          if (status === 'accepted' || status === 'duplicate') {
            acceptedFingerprints.set(op.key, this.fingerprintLocalWriteState(op.data, op.deleted));
          }
        }
      }
      if (skippedOps.length > 0) {
        this.requeueLocalStorageOps(skippedOps);
        this._error = `Local push blocked by ${skippedOps.length} stale write(s); cloud has newer rows`;
      }
      if (acceptedFingerprints.size > 0) {
        try {
          await this.refreshLocalStorageWriteBaseOverrides(session.user.id, acceptedFingerprints);
          this.rebaseQueuedOpsFromWriteBaseOverrides(undefined, new Set(acceptedFingerprints.keys()));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to refresh localStorage write bases';
          console.error('[syncEngine] Local write base refresh error:', message);
          this._error = message;
        }
      }
    } finally {
      if (this.inFlightLocalDrainOps === inFlightOps) {
        this.inFlightLocalDrainOps = new Map();
      }
    }

    this.persistQueues();
    this.emitStatusChange();
  }

  private requeueStoreOps(ops: PendingOp[]): void {
    for (const op of ops) {
      const queueKey = this.pushQueueKey(op);
      if (!this.pushQueue.has(queueKey)) {
        this.pushQueue.set(queueKey, op);
      }
    }
  }

  private requeueLocalStorageOps(ops: PendingLocalOp[]): void {
    for (const op of ops) {
      if (!this.localQueue.has(op.key)) {
        this.localQueue.set(op.key, op);
      }
    }
  }

  private async filterOutStaleStoreOps(userId: string, ops: PendingOp[]): Promise<PendingOp[]> {
    const restoredOps = ops.filter((op) => this.restoredPushQueueKeys.has(this.pushQueueKey(op)));
    if (restoredOps.length === 0) return ops;

    const cloudRows = await this.fetchStoreChangedAtRows(userId);
    const cloudChangedAtByIdentity = new Map(
      cloudRows.map((row) => [
        this.storeIdentityKey(row.db_name, row.store_name, row.record_key),
        row.changed_at,
      ]),
    );

    return ops.filter((op) => {
      if (!this.restoredPushQueueKeys.has(this.pushQueueKey(op))) return true;
      const cloudChangedAt = cloudChangedAtByIdentity.get(
        this.storeIdentityKey(op.dbName, op.storeName, op.recordKey),
      );
      return cloudChangedAt === undefined || cloudChangedAt <= op.changedAt;
    });
  }

  private async filterOutStaleLocalStorageOps(userId: string, ops: PendingLocalOp[]): Promise<PendingLocalOp[]> {
    const restoredOps = ops.filter((op) => this.restoredLocalQueueKeys.has(op.key));
    if (restoredOps.length === 0) return ops;

    const cloudRows = await this.fetchLocalStorageChangedAtRows(userId);
    const cloudChangedAtByKey = new Map(cloudRows.map((row) => [row.key, row.changed_at]));

    return ops.filter((op) => {
      if (!this.restoredLocalQueueKeys.has(op.key)) return true;
      const cloudChangedAt = cloudChangedAtByKey.get(op.key);
      return cloudChangedAt === undefined || cloudChangedAt <= op.changedAt;
    });
  }

  private async waitForQueueDrains(): Promise<void> {
    await Promise.allSettled(
      [this.drainQueuePromise, this.drainLocalQueuePromise]
        .filter((promise): promise is Promise<void> => promise !== null),
    );
  }

  private snapshotQueues(): QueueSnapshot {
    return {
      pushQueue: new Map([...this.pushQueue, ...this.inFlightPushDrainOps]),
      localQueue: new Map([...this.localQueue, ...this.inFlightLocalDrainOps]),
    };
  }

  private discardUnchangedQueuedOps(snapshot: QueueSnapshot): void {
    for (const [key, op] of snapshot.pushQueue) {
      if (this.pushQueue.get(key) === op) {
        this.pushQueue.delete(key);
        this.restoredPushQueueKeys.delete(key);
      }
    }

    for (const [key, op] of snapshot.localQueue) {
      if (this.localQueue.get(key) === op) {
        this.localQueue.delete(key);
        this.restoredLocalQueueKeys.delete(key);
      }
    }
  }

  private rebaseQueuedOpsFromWriteBaseOverrides(storeIdentities?: Set<string>, localKeys?: Set<string>): void {
    for (const [queueKey, op] of this.pushQueue) {
      const identity = this.storeIdentityKey(op.dbName, op.storeName, op.recordKey);
      if (storeIdentities && !storeIdentities.has(identity)) continue;
      const override = this.storeWriteBaseOverrides.get(identity);
      if (!override) continue;
      this.pushQueue.set(queueKey, {
        ...op,
        baseReceivedAt: override.receivedAt,
        baseId: override.id,
      });
    }

    for (const [key, op] of this.localQueue) {
      if (localKeys && !localKeys.has(key)) continue;
      const override = this.localWriteBaseOverrides.get(key);
      if (!override) continue;
      this.localQueue.set(key, {
        ...op,
        baseReceivedAt: override.receivedAt,
        baseKey: override.key,
      });
    }
  }

  private mergeQueuedOps(snapshot: QueueSnapshot): void {
    for (const [key, op] of snapshot.pushQueue) {
      this.pushQueue.set(key, op);
    }

    for (const [key, op] of snapshot.localQueue) {
      this.localQueue.set(key, op);
    }
  }

  // ============================================================
  // Private — Pull
  // ============================================================

  private async pullForUser(
    userId: string,
    options: { emitComplete?: boolean } = {},
  ): Promise<void> {
    // Pull IndexedDB records in pages
    let hasMore = true;
    let blockedByConflict = false;
    while (hasMore) {
      const pageMutationBaseline = this.localMutationGeneration;
      const page = await this.pullPage(userId);
      if (page.length < PULL_PAGE_SIZE) {
        hasMore = false;
      }
      if (page.length > 0) {
        const applyResult = await this.applyPage(page, pageMutationBaseline);
        if (applyResult.appliedCursor) {
          this.cursor = { ...this.cursor, ...applyResult.appliedCursor };
        }
        if (applyResult.skippedConflicts) {
          hasMore = false;
          blockedByConflict = true;
        }
      }
    }

    // Pull localStorage before persisting the cursor, so a failure cannot make
    // the next run skip IndexedDB rows that are about to be rolled back.
    const localStorageMutationBaseline = this.localMutationGeneration;
    const localStorageBlockedByConflict = await this.pullLocalStorage(userId, localStorageMutationBaseline);

    // Save only the safe cursor. Queued local conflicts act as a cursor barrier
    // so future-dated stale cloud rows cannot hide later normal rows.
    await this.saveCursor();

    if (!this.queuePersistenceError && !this.writeBasePersistenceError) {
      this._error = null;
    }
    if (
      options.emitComplete !== false &&
      !blockedByConflict &&
      !localStorageBlockedByConflict &&
      this.getPendingOperationCount() === 0
    ) {
      this.emitEvent('sync-complete');
    }
  }

  private async pullPage(userId: string): Promise<CloudStoreRow[]> {
    if (!supabase) return [];

    let query = supabase
      .from('kbl_stores')
      .select('id, db_name, store_name, record_key, data, changed_at, received_at, deleted')
      .eq('user_id', userId)
      .order('received_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PULL_PAGE_SIZE);

    if (this.cursor.receivedAt && this.cursor.id) {
      // Subsequent pull — use server-side receipt order, not client timestamps.
      query = query.or(
        `received_at.gt.${this.cursor.receivedAt},` +
        `and(received_at.eq.${this.cursor.receivedAt},id.gt.${this.cursor.id})`
      );
    } else if (this.cursor.receivedAt) {
      query = query.gt('received_at', this.cursor.receivedAt);
    } else {
      // First pull, or first pull after migrating from the legacy changed_at
      // cursor: scan all rows once so late same-changed_at rows with lower UUIDs
      // are not lost.
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Pull query failed: ${error.message}`);
    }

    return data ?? [];
  }

  private async applyPage(
    page: CloudStoreRow[],
    mutationBaseline: number,
  ): Promise<PullApplyResult> {
    const pageIndexes = new Map(page.map((record, index) => [record, index]));
    let firstSkippedIndex = -1;
    const markSkippedConflict = (record: CloudStoreRow) => {
      const index = pageIndexes.get(record);
      if (index === undefined) return;
      if (firstSkippedIndex === -1 || index < firstSkippedIndex) {
        firstSkippedIndex = index;
      }
    };
    const recordsToApply = page.filter((record) => {
      if (this.hasQueuedStoreWrite(record, mutationBaseline)) {
        markSkippedConflict(record);
        return false;
      }
      return true;
    });
    let writeBasesChanged = false;

    // Group by database for efficient transaction batching
    const byDb = new Map<string, typeof recordsToApply>();
    for (const record of recordsToApply) {
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
      } catch (err) {
        throw new Error(`Could not open DB ${dbName} for pull: ${err instanceof Error ? err.message : String(err)}`);
      }

      try {
        for (const [storeName, storeRecords] of byStore) {
          if (!db.objectStoreNames.contains(storeName)) {
            throw new Error(`Store ${storeName} not found in ${dbName} while applying cloud pull`);
          }

          try {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const appliedBases = new Map<string, { receivedAt: string; id: string }>();

            for (const record of storeRecords) {
              if (this.hasQueuedStoreWrite(record, mutationBaseline)) {
                markSkippedConflict(record);
                continue;
              }
              if (record.deleted) {
                const idbKey = JSON.parse(record.record_key);
                store.delete(idbKey);
              } else {
                store.put(record.data);
              }
              if (record.received_at) {
                appliedBases.set(
                  this.storeIdentityKey(record.db_name, record.store_name, record.record_key),
                  { receivedAt: record.received_at, id: record.id },
                );
              }
            }

            await new Promise<void>((resolve, reject) => {
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
              tx.onabort = () => reject(tx.error);
            });
            if (appliedBases.size > 0) {
              this.rememberStoreWriteBaseOverrides(appliedBases);
              writeBasesChanged = true;
            }
          } catch (err) {
            console.error(`[syncEngine] Failed to apply records to ${dbName}.${storeName}:`, err);
            throw err; // Propagate so cursor is not advanced
          }
        }
      } finally {
        db.close();
      }
    }
    if (writeBasesChanged) {
      this.persistWriteBaseOverrides();
    }

    const skippedConflicts = firstSkippedIndex >= 0;
    const appliedCursorSource = skippedConflicts
      ? firstSkippedIndex > 0
        ? page[firstSkippedIndex - 1]
        : null
      : page[page.length - 1] ?? null;
    const appliedCursorIndex = appliedCursorSource ? pageIndexes.get(appliedCursorSource) ?? -1 : -1;
    const appliedChangedAt = appliedCursorIndex >= 0
      ? page
          .slice(0, appliedCursorIndex + 1)
          .reduce((max, record) => Math.max(max, record.changed_at), this.cursor.changedAt)
      : this.cursor.changedAt;

    return {
      appliedCursor: appliedCursorSource
        ? {
            changedAt: appliedChangedAt,
            id: appliedCursorSource.id,
            receivedAt: appliedCursorSource.received_at ?? null,
          }
        : null,
      skippedConflicts,
    };
  }

  private async pullLocalStorage(userId: string, mutationBaseline: number): Promise<boolean> {
    if (!supabase) return false;

    const data = await this.fetchLocalStoragePullRows(userId);
    let appliedCursor: CloudLocalStorageCursorRow | null = null;
    let writeBasesChanged = false;

    for (const row of data) {
      if (!shouldSyncLocalStorageKey(row.key)) continue;
      if (this.hasQueuedLocalStorageWrite(row.key, mutationBaseline)) {
        if (writeBasesChanged) {
          this.persistWriteBaseOverrides();
        }
        if (appliedCursor) {
          this.cursor = {
            ...this.cursor,
            changedAt: Math.max(this.cursor.changedAt, appliedCursor.changed_at),
            localReceivedAt: appliedCursor.received_at ?? null,
            localKey: appliedCursor.key,
          };
        }
        return true;
      }

      if (row.deleted) {
        localStorage.removeItem(row.key);
      } else {
        localStorage.setItem(row.key, this.toLocalStorageWireValue(row.data));
      }
      if (row.received_at) {
        this.rememberLocalStorageWriteBaseOverrides(new Map([
          [row.key, { receivedAt: row.received_at, key: row.key }],
        ]));
        writeBasesChanged = true;
      }
      appliedCursor = row;
    }

    if (appliedCursor) {
      this.cursor = {
        ...this.cursor,
        changedAt: Math.max(this.cursor.changedAt, appliedCursor.changed_at),
        localReceivedAt: appliedCursor.received_at ?? null,
        localKey: appliedCursor.key,
      };
    }
    if (writeBasesChanged) {
      this.persistWriteBaseOverrides();
    }
    return false;
  }

  // ============================================================
  // Private — Destructive Operations Helpers
  // ============================================================

  private getReplacementStoreRefs(
    franchiseIds: string[],
    eliminationIds: string[],
  ): Array<{ dbName: string; storeNames: string[] }> {
    const refs = Object.entries(SYNC_REGISTRY).map(([dbName, stores]) => ({
      dbName,
      storeNames: Object.keys(stores),
    }));

    for (const franchiseId of franchiseIds) {
      refs.push({
        dbName: `${DYNAMIC_DB_PREFIX}${franchiseId}`,
        storeNames: Object.keys(DYNAMIC_DB_STORES),
      });
    }

    for (const eliminationId of eliminationIds) {
      refs.push({
        dbName: `${DYNAMIC_ELIMINATION_DB_PREFIX}${eliminationId}`,
        storeNames: Object.keys(DYNAMIC_ELIMINATION_DB_STORES),
      });
    }

    return refs;
  }

  private async assertCloudUnchangedSinceCursor(
    userId: string,
    replacementStoreScopes: Set<string>,
    baseCursor: SyncCursor,
  ): Promise<void> {
    const scopedStoreRows = (await this.fetchStoreWriteBaseRows(userId))
      .filter((row) => replacementStoreScopes.has(this.storeCountKey(row.db_name, row.store_name)));
    if (scopedStoreRows.length > 0 && !baseCursor.receivedAt) {
      await this.assertUnbasedCloudStoreRowsMatchLocal(scopedStoreRows);
    }

    const localStorageRows = await this.fetchLocalStorageWriteBaseRows(userId);
    if (localStorageRows.length > 0 && !baseCursor.localReceivedAt) {
      this.assertUnbasedCloudLocalStorageRowsMatchLocal(localStorageRows);
    }

    const newerStores = (baseCursor.receivedAt ? scopedStoreRows : [])
      .filter((row) => this.isAfterStoreReceivedCursor(row, baseCursor));

    const newerLocalStorage = (baseCursor.localReceivedAt ? localStorageRows : [])
      .filter((row) => this.isAfterLocalStorageReceivedCursor(row, baseCursor));

    if (newerStores.length === 0 && newerLocalStorage.length === 0) return;

    const storeExamples = newerStores
      .slice(0, 4)
      .map((row) => `${row.db_name}.${row.store_name}[${row.record_key}]@${row.changed_at}`);
    const localExamples = newerLocalStorage
      .slice(0, 4)
      .map((row) => `localStorage ${row.key}@${row.changed_at}`);
    const examples = [...storeExamples, ...localExamples];
    const total = newerStores.length + newerLocalStorage.length;
    const suffix = total > examples.length ? `; +${total - examples.length} more` : '';
    throw new Error(
      `Cloud changed since this device last downloaded; run download/diagnostics before full upload: ${examples.join('; ')}${suffix}`,
    );
  }

  private async assertUnbasedCloudStoreRowsMatchLocal(rows: CloudStoreWriteBaseRow[]): Promise<void> {
    const fingerprintsByStore = new Map<string, Map<string, string> | null>();
    const mismatches: string[] = [];

    for (const row of rows) {
      const storeKey = this.storeCountKey(row.db_name, row.store_name);
      if (!fingerprintsByStore.has(storeKey)) {
        const keyPath = this.getSyncStoreKeyPath(row.db_name, row.store_name);
        fingerprintsByStore.set(
          storeKey,
          keyPath ? await this.getLocalStoreFingerprints(row.db_name, row.store_name, keyPath) : null,
        );
      }

      const localFingerprints = fingerprintsByStore.get(storeKey);
      const identity = this.storeIdentityKey(row.db_name, row.store_name, row.record_key);
      const localFingerprint = localFingerprints?.get(identity);
      if (row.deleted) {
        if (localFingerprint) mismatches.push(`${this.formatStoreIdentity(identity)} is deleted in cloud`);
        continue;
      }
      if (!localFingerprint || localFingerprint !== this.fingerprintValue(row.data)) {
        mismatches.push(this.formatStoreIdentity(identity));
      }
    }

    if (mismatches.length === 0) return;

    const examples = mismatches.slice(0, 4);
    const suffix = mismatches.length > examples.length ? `; +${mismatches.length - examples.length} more` : '';
    throw new Error(
      `Cannot full upload before this device has a server-received store cursor; existing cloud rows are not locally matched: ${examples.join('; ')}${suffix}`,
    );
  }

  private assertUnbasedCloudLocalStorageRowsMatchLocal(rows: CloudLocalStorageWriteBaseRow[]): void {
    const mismatches: string[] = [];

    for (const row of rows) {
      const raw = localStorage.getItem(row.key);
      if (row.deleted) {
        if (raw !== null) mismatches.push(`localStorage ${row.key} is deleted in cloud`);
        continue;
      }
      if (raw === null || this.fingerprintValue(raw) !== this.fingerprintValue(this.toLocalStorageWireValue(row.data))) {
        mismatches.push(`localStorage ${row.key}`);
      }
    }

    if (mismatches.length === 0) return;

    const examples = mismatches.slice(0, 4);
    const suffix = mismatches.length > examples.length ? `; +${mismatches.length - examples.length} more` : '';
    throw new Error(
      `Cannot full upload before this device has a server-received localStorage cursor; existing cloud keys are not locally matched: ${examples.join('; ')}${suffix}`,
    );
  }

  private isAfterCursor(changedAt: number, id: string | null, cursor: SyncCursor): boolean {
    if (changedAt > cursor.changedAt) return true;
    if (changedAt < cursor.changedAt) return false;
    return Boolean(cursor.id && id && id > cursor.id);
  }

  private isAfterStoreReceivedCursor(row: CloudStoreCursorRow, cursor: SyncCursor): boolean {
    if (!cursor.receivedAt || !row.received_at) return true;
    if (row.received_at > cursor.receivedAt) return true;
    if (row.received_at < cursor.receivedAt) return false;
    return Boolean(cursor.id && row.id > cursor.id);
  }

  private isAfterLocalStorageReceivedCursor(row: CloudLocalStorageCursorRow, cursor: SyncCursor): boolean {
    if (!cursor.localReceivedAt || !row.received_at) return true;
    if (row.received_at > cursor.localReceivedAt) return true;
    if (row.received_at < cursor.localReceivedAt) return false;
    return Boolean(cursor.localKey && row.key > cursor.localKey);
  }

  private async captureLocalDownloadSnapshot(
    franchiseIds: string[],
    eliminationIds: string[],
    extraDynamicDbNames: string[] = [],
  ): Promise<LocalDownloadSnapshot> {
    const stores: LocalStoreSnapshot[] = [];
    for (const { dbName, storeNames } of this.getReplacementStoreRefs(franchiseIds, eliminationIds)) {
      for (const storeName of storeNames) {
        stores.push({
          dbName,
          storeName,
          records: await this.captureStoreRecords(dbName, storeName),
        });
      }
    }

    const localStorageSnapshot = new Map<string, string>();
    for (const key of this.getSyncedLocalStorageKeys()) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        localStorageSnapshot.set(key, raw);
      }
    }

    const dynamicDbNames = new Set([
      ...franchiseIds.map((franchiseId) => `${DYNAMIC_DB_PREFIX}${franchiseId}`),
      ...eliminationIds.map((eliminationId) => `${DYNAMIC_ELIMINATION_DB_PREFIX}${eliminationId}`),
      ...extraDynamicDbNames,
    ]);

    return {
      ...this.snapshotQueues(),
      cursor: { ...this.cursor },
      localStorage: localStorageSnapshot,
      stores,
      dynamicDbNames: Array.from(dynamicDbNames),
    };
  }

  private async captureStoreRecords(dbName: string, storeName: string): Promise<unknown[]> {
    let db: IDBDatabase;
    try {
      db = await this.openDatabase(dbName);
    } catch (err) {
      throw new Error(`Could not snapshot ${dbName}.${storeName}: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      if (!db.objectStoreNames.contains(storeName)) return [];
      const records = await new Promise<unknown[]>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return records.map((record) => this.cloneValue(record));
    } catch (err) {
      throw new Error(`Could not snapshot ${dbName}.${storeName}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      db.close();
    }
  }

  private async restoreLocalDownloadSnapshot(
    snapshot: LocalDownloadSnapshot,
    queuedDuringFailure: QueueSnapshot,
  ): Promise<void> {
    for (const dbName of snapshot.dynamicDbNames) {
      try {
        await this.deleteDatabase(dbName);
      } catch {
        // The DB may not exist, or may already have been removed before the failure.
      }
    }

    for (const storeSnapshot of snapshot.stores) {
      await this.restoreStoreRecords(storeSnapshot);
    }

    for (const key of this.getSyncedLocalStorageKeys()) {
      localStorage.removeItem(key);
    }
    for (const [key, raw] of snapshot.localStorage) {
      localStorage.setItem(key, raw);
    }

    this.cursor = { ...snapshot.cursor };
    this.pushQueue = new Map(snapshot.pushQueue);
    this.localQueue = new Map(snapshot.localQueue);
    this.mergeQueuedOps(queuedDuringFailure);
    await this.reapplyQueuedWritesToLocal();
    this.persistQueues();
    try {
      await this.saveCursor();
    } catch (err) {
      throw new Error(
        `Rollback restored local stores, localStorage, queues, and in-memory cursor but failed to persist restored cursor: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async restoreStoreRecords(snapshot: LocalStoreSnapshot): Promise<void> {
    const db = await this.openDatabase(snapshot.dbName);
    try {
      if (!db.objectStoreNames.contains(snapshot.storeName)) {
        throw new Error(`Cannot restore missing store ${snapshot.dbName}.${snapshot.storeName}`);
      }

      const tx = db.transaction(snapshot.storeName, 'readwrite');
      const store = tx.objectStore(snapshot.storeName);
      store.clear();
      for (const record of snapshot.records) {
        store.put(this.cloneValue(record));
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

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
          throw new Error(`Failed to clear ${dbName}.${storeName}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } finally {
      db.close();
    }
  }

  private async reapplyQueuedWritesToLocal(): Promise<void> {
    const queuedOps = Array.from(this.pushQueue.values());
    const byDb = new Map<string, PendingOp[]>();
    for (const op of queuedOps) {
      if (!byDb.has(op.dbName)) byDb.set(op.dbName, []);
      byDb.get(op.dbName)!.push(op);
    }

    for (const [dbName, ops] of byDb) {
      const byStore = new Map<string, PendingOp[]>();
      for (const op of ops) {
        if (!byStore.has(op.storeName)) byStore.set(op.storeName, []);
        byStore.get(op.storeName)!.push(op);
      }

      const db = await this.openDatabase(dbName);
      try {
        for (const [storeName, storeOps] of byStore) {
          if (!db.objectStoreNames.contains(storeName)) {
            throw new Error(`Cannot reapply queued write: store ${storeName} not found in ${dbName}`);
          }

          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          for (const op of storeOps) {
            if (op.deleted) {
              store.delete(JSON.parse(op.recordKey));
            } else {
              store.put(op.data);
            }
          }
          await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
          });
        }
      } finally {
        db.close();
      }
    }

    for (const op of this.localQueue.values()) {
      if (op.deleted) {
        localStorage.removeItem(op.key);
      } else {
        localStorage.setItem(op.key, this.toLocalStorageWireValue(op.data));
      }
    }
  }

  private storeCountKey(dbName: string, storeName: string): string {
    return `${dbName}.${storeName}`;
  }

  private pushQueueKey(op: Pick<PendingOp, 'dbName' | 'storeName' | 'recordKey'>): string {
    return `${op.dbName}|${op.storeName}|${op.recordKey}`;
  }

  private getPendingOperationCount(): number {
    const storeKeys = new Set([...this.pushQueue.keys(), ...this.inFlightPushDrainOps.keys()]);
    const localStorageKeys = new Set([...this.localQueue.keys(), ...this.inFlightLocalDrainOps.keys()]);
    return storeKeys.size + localStorageKeys.size;
  }

  private rememberStoreMutation(queueKey: string): void {
    this.localMutationGeneration += 1;
    this.storeMutationGenerations.set(queueKey, this.localMutationGeneration);
  }

  private rememberLocalStorageMutation(key: string): void {
    this.localMutationGeneration += 1;
    this.localStorageMutationGenerations.set(key, this.localMutationGeneration);
  }

  private hasQueuedStoreWrite(record: {
    db_name: string;
    store_name: string;
    record_key: string;
  }, mutationBaseline?: number): boolean {
    const queueKey = `${record.db_name}|${record.store_name}|${record.record_key}`;
    const op = this.pushQueue.get(queueKey) ?? this.inFlightPushDrainOps.get(queueKey);
    if (op) return true;
    return mutationBaseline !== undefined && (this.storeMutationGenerations.get(queueKey) ?? 0) > mutationBaseline;
  }

  private hasQueuedLocalStorageWrite(key: string, mutationBaseline?: number): boolean {
    const op = this.localQueue.get(key) ?? this.inFlightLocalDrainOps.get(key);
    if (op) return true;
    return mutationBaseline !== undefined && (this.localStorageMutationGenerations.get(key) ?? 0) > mutationBaseline;
  }

  private storeIdentityKey(dbName: string, storeName: string, recordKey: string): string {
    return `${dbName}\u0000${storeName}\u0000${recordKey}`;
  }

  private getSyncStoreKeyPath(dbName: string, storeName: string): string | string[] | null {
    const staticStores = SYNC_REGISTRY[dbName];
    if (staticStores?.[storeName]) return staticStores[storeName];

    if (dbName.startsWith(DYNAMIC_DB_PREFIX)) {
      return DYNAMIC_DB_STORES[storeName] ?? null;
    }
    if (dbName.startsWith(DYNAMIC_ELIMINATION_DB_PREFIX)) {
      return DYNAMIC_ELIMINATION_DB_STORES[storeName] ?? null;
    }
    return null;
  }

  private assertNoSupabaseError(error: { message?: string } | null | undefined, message: string): void {
    if (error) {
      throw new Error(`${message}: ${error.message ?? 'Unknown Supabase error'}`);
    }
  }

  private async atomicUpsertStoreRows(
    rows: CloudStoreWriteRow[],
    message: string,
    options: { throwOnSkipped?: boolean } = {},
  ): Promise<AtomicUpsertResultRow[]> {
    if (!supabase || rows.length === 0) return [];

    const { data, error } = await supabase.rpc('kbl_atomic_upsert_store_rows', {
      p_rows: rows,
    });
    this.assertNoSupabaseError(error, message);
    const statuses = this.normalizeAtomicUpsertRows(data, rows.length);
    this.handleAtomicSkippedRows(statuses, message, options.throwOnSkipped === true);
    return statuses;
  }

  private async atomicUpsertLocalStorageRows(
    rows: CloudLocalStorageWriteRow[],
    message: string,
    options: { throwOnSkipped?: boolean } = {},
  ): Promise<AtomicUpsertResultRow[]> {
    if (!supabase || rows.length === 0) return [];

    const { data, error } = await supabase.rpc('kbl_atomic_upsert_local_storage_rows', {
      p_rows: rows,
    });
    this.assertNoSupabaseError(error, message);
    const statuses = this.normalizeAtomicUpsertRows(data, rows.length);
    this.handleAtomicSkippedRows(statuses, message, options.throwOnSkipped === true);
    return statuses;
  }

  private normalizeAtomicUpsertRows(data: unknown, rowCount: number): AtomicUpsertResultRow[] {
    const rows = Array.isArray(data)
      ? data as AtomicUpsertResultRow[]
      : data
        ? [data as AtomicUpsertResultRow]
        : [];

    if (rows.some((row) => row.status)) {
      if (rows.length !== rowCount) {
        throw new Error(`Atomic upsert returned ${rows.length} row status(es) for ${rowCount} input row(s)`);
      }
      const seen = new Set<number>();
      for (const row of rows) {
        if (
          !Number.isInteger(row.row_index) ||
          row.row_index === undefined ||
          row.row_index < 0 ||
          row.row_index >= rowCount
        ) {
          throw new Error('Atomic upsert returned an invalid row_index');
        }
        if (seen.has(row.row_index)) {
          throw new Error('Atomic upsert returned a duplicate row_index');
        }
        if (row.status !== 'accepted' && row.status !== 'skipped' && row.status !== 'duplicate') {
          throw new Error(`Atomic upsert returned an unknown status: ${String(row.status)}`);
        }
        seen.add(row.row_index);
      }
      return rows;
    }

    const summary = rows[0];
    const accepted = summary?.accepted_count;
    const skipped = summary?.skipped_count ?? 0;
    const duplicates = summary?.duplicate_count ?? 0;
    if (
      typeof accepted === 'number' &&
      accepted === rowCount &&
      skipped === 0 &&
      duplicates === 0
    ) {
      return Array.from({ length: rowCount }, (_, rowIndex) => ({
        row_index: rowIndex,
        status: 'accepted',
      }));
    }
    throw new Error('Atomic upsert returned an invalid or incomplete success response');
  }

  private handleAtomicSkippedRows(
    statuses: AtomicUpsertResultRow[],
    message: string,
    throwOnSkipped: boolean,
  ): void {
    const skipped = statuses.filter((row) => row.status === 'skipped').length;
    const duplicates = statuses.filter((row) => row.status === 'duplicate').length;
    if (skipped > 0 || duplicates > 0) {
      console.warn(
        `[syncEngine] ${message}: atomic write skipped ${skipped} stale row(s), ${duplicates} duplicate op(s)`,
      );
    }
    if (throwOnSkipped && skipped > 0) {
      throw new Error(`${message}: ${skipped} stale cloud row(s) rejected the replacement write`);
    }
  }

  private async getLatestBuildDiagnostics(currentBuild: {
    id?: string;
    version?: string;
    sha?: string;
    builtAt?: string;
  }): Promise<SyncDiagnosticsSnapshot['build']['latest']> {
    const mode = typeof import.meta !== 'undefined' ? import.meta.env?.MODE : undefined;
    if (mode === 'development' || mode === 'test') {
      return undefined;
    }
    if (typeof window === 'undefined' || typeof fetch === 'undefined') {
      return undefined;
    }

    const fetchedAt = Date.now();
    try {
      const baseUrl = typeof import.meta !== 'undefined'
        ? import.meta.env?.BASE_URL ?? '/'
        : '/';
      const metadataPath = `${baseUrl.replace(/\/$/, '')}/build-meta.json`;
      const metadataUrl = new URL(metadataPath, window.location.origin);
      metadataUrl.searchParams.set('fresh', String(fetchedAt));
      const response = await fetch(metadataUrl.toString(), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const metadata = await response.json() as Record<string, unknown>;
      const latest = {
        id: this.optionalString(metadata.id),
        version: this.optionalString(metadata.version),
        sha: this.optionalString(metadata.sha),
        builtAt: this.optionalString(metadata.builtAt),
      };

      return {
        ...latest,
        fetchedAt,
        matchesCurrent: this.buildMetadataMatches(currentBuild, latest),
      };
    } catch (err) {
      return {
        fetchedAt,
        matchesCurrent: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private buildMetadataMatches(
    current: { id?: string; version?: string; sha?: string; builtAt?: string },
    latest: { id?: string; version?: string; sha?: string; builtAt?: string },
  ): boolean | null {
    if (current.id && latest.id) return current.id === latest.id;
    if (current.sha && latest.sha && current.builtAt && latest.builtAt) {
      return current.sha === latest.sha && current.builtAt === latest.builtAt;
    }
    if (current.sha && latest.sha) return current.sha === latest.sha;
    if (current.version && latest.version) return current.version === latest.version;
    return null;
  }

  private async getServiceWorkerDiagnostics(): Promise<Partial<SyncDiagnosticsSnapshot['build']>> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return {};
    }

    const diagnostics: Partial<SyncDiagnosticsSnapshot['build']> = {
      serviceWorkerControlled: Boolean(navigator.serviceWorker.controller),
      serviceWorkerScriptURL: navigator.serviceWorker.controller?.scriptURL,
    };

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      diagnostics.serviceWorkerScope = registration?.scope;
      diagnostics.serviceWorkerActiveScriptURL = registration?.active?.scriptURL;
      diagnostics.serviceWorkerWaiting = Boolean(registration?.waiting);
      diagnostics.serviceWorkerWaitingScriptURL = registration?.waiting?.scriptURL;
      diagnostics.serviceWorkerInstalling = Boolean(registration?.installing);
      diagnostics.serviceWorkerScriptURL =
        diagnostics.serviceWorkerScriptURL || registration?.active?.scriptURL;
    } catch (err) {
      diagnostics.serviceWorkerError = err instanceof Error ? err.message : String(err);
    }

    if (typeof caches !== 'undefined') {
      try {
        diagnostics.serviceWorkerCacheNames = await caches.keys();
      } catch (err) {
        diagnostics.serviceWorkerError = [
          diagnostics.serviceWorkerError,
          `Cache read failed: ${err instanceof Error ? err.message : String(err)}`,
        ].filter(Boolean).join('; ');
      }
    }

    return diagnostics;
  }

  private async fetchActiveStoreRows<T extends CloudStoreCountRow>(
    userId: string,
    select: string,
  ): Promise<T[]> {
    if (!supabase) return [];

    const rows: T[] = [];
    for (let from = 0; ; from += CLOUD_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('kbl_stores')
        .select(select)
        .eq('user_id', userId)
        .eq('deleted', false)
        .order('db_name', { ascending: true })
        .order('store_name', { ascending: true })
        .order('record_key', { ascending: true })
        .range(from, from + CLOUD_PAGE_SIZE - 1);
      this.assertNoSupabaseError(error, 'Cloud store fetch failed');

      const page = (data ?? []) as unknown as T[];
      rows.push(...page);
      if (page.length < CLOUD_PAGE_SIZE) break;
    }

    return rows;
  }

  private async fetchStoreCursorRows(userId: string): Promise<CloudStoreCursorRow[]> {
    if (!supabase) return [];

    const rows: CloudStoreCursorRow[] = [];
    for (let from = 0; ; from += CLOUD_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('kbl_stores')
        .select('id, db_name, store_name, record_key, changed_at, received_at')
        .eq('user_id', userId)
        .order('received_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + CLOUD_PAGE_SIZE - 1);
      this.assertNoSupabaseError(error, 'Cloud store cursor fetch failed');

      const page = (data ?? []) as unknown as CloudStoreCursorRow[];
      rows.push(...page);
      if (page.length < CLOUD_PAGE_SIZE) break;
    }

    return rows;
  }

  private async fetchStoreChangedAtRows(userId: string): Promise<CloudStoreChangedAtRow[]> {
    if (!supabase) return [];

    const rows: CloudStoreChangedAtRow[] = [];
    for (let from = 0; ; from += CLOUD_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('kbl_stores')
        .select('db_name, store_name, record_key, changed_at')
        .eq('user_id', userId)
        .order('db_name', { ascending: true })
        .order('store_name', { ascending: true })
        .order('record_key', { ascending: true })
        .range(from, from + CLOUD_PAGE_SIZE - 1);
      this.assertNoSupabaseError(error, 'Cloud store changed_at fetch failed');

      const page = (data ?? []) as unknown as CloudStoreChangedAtRow[];
      rows.push(...page);
      if (page.length < CLOUD_PAGE_SIZE) break;
    }

    return rows;
  }

  private async fetchLocalStorageRows<T extends { key: string }>(
    userId: string,
    select: string,
    activeOnly: boolean,
  ): Promise<T[]> {
    if (!supabase) return [];

    const rows: T[] = [];
    for (let from = 0; ; from += CLOUD_PAGE_SIZE) {
      let query = supabase
        .from('kbl_local_storage')
        .select(select)
        .eq('user_id', userId);
      if (activeOnly) {
        query = query.eq('deleted', false);
      }
      const { data, error } = await query
        .order('key', { ascending: true })
        .range(from, from + CLOUD_PAGE_SIZE - 1);
      this.assertNoSupabaseError(error, 'Cloud localStorage fetch failed');

      const page = (data ?? []) as unknown as T[];
      rows.push(...page);
      if (page.length < CLOUD_PAGE_SIZE) break;
    }

    return rows;
  }

  private async fetchLocalStorageCursorRows(userId: string): Promise<CloudLocalStorageCursorRow[]> {
    if (!supabase) return [];

    const rows: CloudLocalStorageCursorRow[] = [];
    for (let from = 0; ; from += CLOUD_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('kbl_local_storage')
        .select('key, changed_at, received_at')
        .eq('user_id', userId)
        .order('received_at', { ascending: true })
        .order('key', { ascending: true })
        .range(from, from + CLOUD_PAGE_SIZE - 1);
      this.assertNoSupabaseError(error, 'Cloud localStorage cursor fetch failed');

      const page = (data ?? []) as unknown as CloudLocalStorageCursorRow[];
      rows.push(...page);
      if (page.length < CLOUD_PAGE_SIZE) break;
    }

    return rows;
  }

  private async fetchStoreWriteBaseRows(userId: string): Promise<CloudStoreWriteBaseRow[]> {
    if (!supabase) return [];

    const rows: CloudStoreWriteBaseRow[] = [];
    for (let from = 0; ; from += CLOUD_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('kbl_stores')
        .select('id, db_name, store_name, record_key, data, changed_at, received_at, deleted')
        .eq('user_id', userId)
        .order('received_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + CLOUD_PAGE_SIZE - 1);
      this.assertNoSupabaseError(error, 'Cloud store write-base fetch failed');

      const page = (data ?? []) as unknown as CloudStoreWriteBaseRow[];
      rows.push(...page);
      if (page.length < CLOUD_PAGE_SIZE) break;
    }

    return rows;
  }

  private async fetchLocalStorageWriteBaseRows(userId: string): Promise<CloudLocalStorageWriteBaseRow[]> {
    if (!supabase) return [];

    const rows: CloudLocalStorageWriteBaseRow[] = [];
    for (let from = 0; ; from += CLOUD_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('kbl_local_storage')
        .select('key, data, changed_at, received_at, deleted')
        .eq('user_id', userId)
        .order('received_at', { ascending: true })
        .order('key', { ascending: true })
        .range(from, from + CLOUD_PAGE_SIZE - 1);
      this.assertNoSupabaseError(error, 'Cloud localStorage write-base fetch failed');

      const page = (data ?? []) as unknown as CloudLocalStorageWriteBaseRow[];
      rows.push(...page);
      if (page.length < CLOUD_PAGE_SIZE) break;
    }

    return rows;
  }

  private async refreshStoreWriteBaseOverrides(
    userId: string,
    expectedFingerprints: Map<string, string>,
  ): Promise<void> {
    if (expectedFingerprints.size === 0) return;

    const seen = new Set<string>();
    const cursorRows = await this.fetchStoreWriteBaseRows(userId);
    for (const row of cursorRows) {
      if (!row.received_at) continue;
      const identity = this.storeIdentityKey(row.db_name, row.store_name, row.record_key);
      const expectedFingerprint = expectedFingerprints.get(identity);
      if (!expectedFingerprint) continue;
      seen.add(identity);
      if (this.fingerprintStoreWriteState(row.data, row.deleted) !== expectedFingerprint) {
        this.storeWriteBaseOverrides.delete(identity);
        continue;
      }
      this.storeWriteBaseOverrides.set(identity, {
        receivedAt: row.received_at,
        id: row.id,
      });
    }
    for (const identity of expectedFingerprints.keys()) {
      if (!seen.has(identity)) {
        this.storeWriteBaseOverrides.delete(identity);
      }
    }
    this.persistWriteBaseOverrides();
  }

  private async refreshLocalStorageWriteBaseOverrides(
    userId: string,
    expectedFingerprints: Map<string, string>,
  ): Promise<void> {
    if (expectedFingerprints.size === 0) return;

    const seen = new Set<string>();
    const cursorRows = await this.fetchLocalStorageWriteBaseRows(userId);
    for (const row of cursorRows) {
      if (!row.received_at) continue;
      const expectedFingerprint = expectedFingerprints.get(row.key);
      if (!expectedFingerprint) continue;
      seen.add(row.key);
      if (this.fingerprintLocalWriteState(row.data, row.deleted) !== expectedFingerprint) {
        this.localWriteBaseOverrides.delete(row.key);
        continue;
      }
      this.localWriteBaseOverrides.set(row.key, {
        receivedAt: row.received_at,
        key: row.key,
      });
    }
    for (const key of expectedFingerprints.keys()) {
      if (!seen.has(key)) {
        this.localWriteBaseOverrides.delete(key);
      }
    }
    this.persistWriteBaseOverrides();
  }

  private async fetchLocalStoragePullRows(userId: string): Promise<Array<CloudLocalStorageCursorRow & {
    data: unknown;
    deleted: boolean;
  }>> {
    if (!supabase) return [];

    const rows: Array<CloudLocalStorageCursorRow & { data: unknown; deleted: boolean }> = [];
    for (let from = 0; ; from += CLOUD_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('kbl_local_storage')
        .select('key, data, changed_at, received_at, deleted')
        .eq('user_id', userId)
        .order('received_at', { ascending: true })
        .order('key', { ascending: true })
        .range(from, from + CLOUD_PAGE_SIZE - 1);
      this.assertNoSupabaseError(error, 'Cloud localStorage fetch failed');

      const page = (data ?? []) as Array<CloudLocalStorageCursorRow & { data: unknown; deleted: boolean }>;
      rows.push(...page);
      if (page.length < CLOUD_PAGE_SIZE) break;
    }

    return rows;
  }

  private async fetchLocalStorageChangedAtRows(userId: string): Promise<CloudLocalStorageChangedAtRow[]> {
    if (!supabase) return [];

    const rows: CloudLocalStorageChangedAtRow[] = [];
    for (let from = 0; ; from += CLOUD_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('kbl_local_storage')
        .select('key, changed_at')
        .eq('user_id', userId)
        .order('key', { ascending: true })
        .range(from, from + CLOUD_PAGE_SIZE - 1);
      this.assertNoSupabaseError(error, 'Cloud localStorage changed_at fetch failed');

      const page = (data ?? []) as unknown as CloudLocalStorageChangedAtRow[];
      rows.push(...page);
      if (page.length < CLOUD_PAGE_SIZE) break;
    }

    return rows;
  }

  private async getCloudStoreCounts(userId: string): Promise<Map<string, number>> {
    const rows = await this.fetchActiveStoreRows<CloudStoreCountRow>(
      userId,
      'db_name, store_name',
    );
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = this.storeCountKey(row.db_name, row.store_name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }

  private async getCloudStoreFingerprints(userId: string): Promise<Map<string, string>> {
    const rows = await this.fetchActiveStoreRows<CloudStoreDataRow>(
      userId,
      'db_name, store_name, record_key, data',
    );
    const fingerprints = new Map<string, string>();
    for (const row of rows) {
      fingerprints.set(
        this.storeIdentityKey(row.db_name, row.store_name, row.record_key),
        this.fingerprintValue(row.data),
      );
    }
    return fingerprints;
  }

  private async getCloudDynamicDbNames(userId: string): Promise<string[]> {
    const rows = await this.fetchActiveStoreRows<CloudStoreCountRow>(
      userId,
      'db_name, store_name',
    );
    const dbNames = new Set<string>();
    for (const row of rows) {
      if (
        row.db_name.startsWith(DYNAMIC_DB_PREFIX) ||
        row.db_name.startsWith(DYNAMIC_ELIMINATION_DB_PREFIX)
      ) {
        dbNames.add(row.db_name);
      }
    }
    return Array.from(dbNames);
  }

  private async getCloudLocalStorageCount(userId: string): Promise<number> {
    const rows = await this.fetchLocalStorageRows<CloudLocalStorageIdentityRow>(
      userId,
      'key',
      true,
    );
    return rows.length;
  }

  private async getCloudLocalStorageFingerprints(userId: string): Promise<Map<string, string>> {
    const rows = await this.fetchLocalStorageRows<CloudLocalStorageDataRow>(
      userId,
      'key, data',
      true,
    );
    const fingerprints = new Map<string, string>();
    for (const row of rows) {
      fingerprints.set(row.key, this.fingerprintValue(this.toLocalStorageWireValue(row.data)));
    }
    return fingerprints;
  }

  private buildLocalStorageUploadRows(
    userId: string,
    changedAt: number,
    baseCursor: SyncCursor,
  ): {
    rows: CloudLocalStorageWriteRow[];
    expectedKeys: Set<string>;
    expectedLocalFingerprints: Map<string, string>;
  } {
    const expectedKeys = new Set<string>();
    const expectedLocalFingerprints = new Map<string, string>();
    const rows = this.getSyncedLocalStorageKeys()
      .map(key => {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        const row = {
          user_id: userId,
          key,
          data: raw,
          changed_at: changedAt,
          deleted: false,
          ...this.localWriteBaseFromCursor(baseCursor),
        };
        expectedKeys.add(key);
        expectedLocalFingerprints.set(key, this.fingerprintValue(raw));
        return row;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return { rows, expectedKeys, expectedLocalFingerprints };
  }

  private async tombstoneStaleCloudStoreRows(
    userId: string,
    expectedStoreKeys: Set<string>,
    scannedStoreScopes: Set<string>,
    changedAt: number,
    baseCursor: SyncCursor,
  ): Promise<void> {
    if (!supabase) return;

    const activeRows = await this.fetchActiveStoreRows<CloudStoreIdentityRow>(
      userId,
      'db_name, store_name, record_key',
    );
    const tombstones = activeRows
      .filter(row => scannedStoreScopes.has(this.storeCountKey(row.db_name, row.store_name)))
      .filter(row => !expectedStoreKeys.has(this.storeIdentityKey(row.db_name, row.store_name, row.record_key)))
      .map(row => ({
        user_id: userId,
        db_name: row.db_name,
        store_name: row.store_name,
        record_key: row.record_key,
          data: {},
          changed_at: changedAt,
          deleted: true,
        ...this.storeWriteBaseFromCursor(baseCursor),
      }));

    for (let i = 0; i < tombstones.length; i += PUSH_BATCH_SIZE) {
      const batch = tombstones.slice(i, i + PUSH_BATCH_SIZE);
      await this.atomicUpsertStoreRows(batch, 'Cloud stale-store tombstone failed', {
        throwOnSkipped: true,
      });
    }
  }

  private async tombstoneStaleCloudLocalStorageRows(
    userId: string,
    expectedLocalKeys: Set<string>,
    changedAt: number,
    baseCursor: SyncCursor,
  ): Promise<void> {
    if (!supabase) return;

    const activeRows = await this.fetchLocalStorageRows<CloudLocalStorageIdentityRow>(
      userId,
      'key',
      true,
    );
    const tombstones = activeRows
      .filter(row => !expectedLocalKeys.has(row.key))
      .map(row => ({
        user_id: userId,
        key: row.key,
        data: {},
        changed_at: changedAt,
        deleted: true,
        ...this.localWriteBaseFromCursor(baseCursor),
      }));

    for (let i = 0; i < tombstones.length; i += PUSH_BATCH_SIZE) {
      const batch = tombstones.slice(i, i + PUSH_BATCH_SIZE);
      await this.atomicUpsertLocalStorageRows(batch, 'Cloud stale-localStorage tombstone failed', {
        throwOnSkipped: true,
      });
    }
  }

  private async verifyCloudMatchesExpected(
    userId: string,
    expectedStoreFingerprints: Map<string, string>,
    expectedLocalStorageFingerprints: Map<string, string>,
    scannedStoreScopes: Set<string>,
  ): Promise<VerifiedWriteBases> {
    const cloudStoreRows = (await this.fetchActiveStoreRows<CloudStoreVerifiedDataRow>(
      userId,
      'id, db_name, store_name, record_key, data, received_at',
    )).filter((row) => scannedStoreScopes.has(this.storeCountKey(row.db_name, row.store_name)));
    const cloudStoreFingerprints = new Map<string, string>();
    const cloudStoreRowsByIdentity = new Map<string, CloudStoreVerifiedDataRow>();
    for (const row of cloudStoreRows) {
      const identity = this.storeIdentityKey(row.db_name, row.store_name, row.record_key);
      cloudStoreFingerprints.set(identity, this.fingerprintValue(row.data));
      cloudStoreRowsByIdentity.set(identity, row);
    }
    const mismatches: string[] = [];
    const verifiedStoreBases = new Map<string, { receivedAt: string; id: string }>();
    const verifiedLocalStorageBases = new Map<string, { receivedAt: string; key: string }>();

    if (cloudStoreFingerprints.size !== expectedStoreFingerprints.size) {
      mismatches.push(`store rows expected ${expectedStoreFingerprints.size}, got ${cloudStoreFingerprints.size}`);
    }

    for (const [identity, expectedFingerprint] of expectedStoreFingerprints) {
      const actualFingerprint = cloudStoreFingerprints.get(identity);
      if (actualFingerprint === undefined) {
        mismatches.push(`${this.formatStoreIdentity(identity)} missing from cloud`);
      } else if (actualFingerprint !== expectedFingerprint) {
        mismatches.push(`${this.formatStoreIdentity(identity)} content mismatch`);
      } else {
        const row = cloudStoreRowsByIdentity.get(identity);
        if (row?.received_at) {
          verifiedStoreBases.set(identity, { receivedAt: row.received_at, id: row.id });
        }
      }
    }

    for (const identity of cloudStoreFingerprints.keys()) {
      if (!expectedStoreFingerprints.has(identity)) {
        mismatches.push(`${this.formatStoreIdentity(identity)} unexpected in cloud`);
      }
    }

    const cloudLocalStorageRows = await this.fetchLocalStorageRows<CloudLocalStorageVerifiedDataRow>(
      userId,
      'key, data, received_at',
      true,
    );
    const cloudLocalStorageFingerprints = new Map<string, string>();
    const cloudLocalStorageRowsByKey = new Map<string, CloudLocalStorageVerifiedDataRow>();
    for (const row of cloudLocalStorageRows) {
      cloudLocalStorageFingerprints.set(row.key, this.fingerprintValue(this.toLocalStorageWireValue(row.data)));
      cloudLocalStorageRowsByKey.set(row.key, row);
    }
    if (cloudLocalStorageFingerprints.size !== expectedLocalStorageFingerprints.size) {
      mismatches.push(`localStorage rows expected ${expectedLocalStorageFingerprints.size}, got ${cloudLocalStorageFingerprints.size}`);
    }

    for (const [key, expectedFingerprint] of expectedLocalStorageFingerprints) {
      const actualFingerprint = cloudLocalStorageFingerprints.get(key);
      if (actualFingerprint === undefined) {
        mismatches.push(`localStorage ${key} missing from cloud`);
      } else if (actualFingerprint !== expectedFingerprint) {
        mismatches.push(`localStorage ${key} content mismatch`);
      } else {
        const row = cloudLocalStorageRowsByKey.get(key);
        if (row?.received_at) {
          verifiedLocalStorageBases.set(key, { receivedAt: row.received_at, key });
        }
      }
    }

    for (const key of cloudLocalStorageFingerprints.keys()) {
      if (!expectedLocalStorageFingerprints.has(key)) {
        mismatches.push(`localStorage ${key} unexpected in cloud`);
      }
    }

    if (mismatches.length > 0) {
      const suffix = mismatches.length > 8 ? `; +${mismatches.length - 8} more` : '';
      throw new Error(`Cloud verification failed: ${mismatches.slice(0, 8).join('; ')}${suffix}`);
    }

    return {
      stores: verifiedStoreBases,
      localStorage: verifiedLocalStorageBases,
    };
  }

  private async uploadStore(
    dbName: string,
    storeName: string,
    keyPath: string | string[],
    userId: string,
    changedAt: number,
    baseCursor: SyncCursor,
    onProgress?: (dbName: string, storeName: string, sent: number, total: number) => void
  ): Promise<{ count: number; identities: Set<string>; fingerprints: Map<string, string> }> {
    const identities = new Set<string>();
    const fingerprints = new Map<string, string>();
    if (!supabase) return { count: 0, identities, fingerprints };

    let db: IDBDatabase;
    try {
      db = await this.openDatabase(dbName);
    } catch (err) {
      throw new Error(`Could not read local sync store ${dbName}.${storeName}: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      if (!db.objectStoreNames.contains(storeName)) {
        throw new Error(`Could not read local sync store ${dbName}.${storeName}: store missing`);
      }

      const records: unknown[] = await new Promise<unknown[]>((resolve, reject) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        } catch (err) {
          reject(err);
        }
      }).catch((err) => {
        throw new Error(`Could not read local sync store ${dbName}.${storeName}: ${err instanceof Error ? err.message : String(err)}`);
      });

      if (records.length === 0) return { count: 0, identities, fingerprints };

      for (let i = 0; i < records.length; i += UPLOAD_BATCH_SIZE) {
        const batch = records.slice(i, i + UPLOAD_BATCH_SIZE);
        const rows = batch.map(record => {
          const rec = record as Record<string, unknown>;
          const key = Array.isArray(keyPath)
            ? keyPath.map(k => rec[k])
            : rec[keyPath];
          const recordKey = serializeKey(key);
          if (typeof recordKey !== 'string') {
            throw new Error(`Cannot sync ${dbName}.${storeName}: missing key ${JSON.stringify(keyPath)}`);
          }
          const identity = this.storeIdentityKey(dbName, storeName, recordKey);
          identities.add(identity);
          fingerprints.set(identity, this.fingerprintValue(record));

          return {
            user_id: userId,
            db_name: dbName,
            store_name: storeName,
            record_key: recordKey,
            data: record,
            changed_at: changedAt,
            deleted: false,
            ...this.storeWriteBaseFromCursor(baseCursor),
          };
        });

        await this.atomicUpsertStoreRows(rows, `Store upload failed for ${dbName}.${storeName}`);

        onProgress?.(dbName, storeName, Math.min(i + UPLOAD_BATCH_SIZE, records.length), records.length);
      }
      return { count: records.length, identities, fingerprints };
    } finally {
      db.close();
    }
  }

  private async countLocalStore(dbName: string, storeName: string): Promise<number | null> {
    let db: IDBDatabase;
    try {
      db = await this.openDatabase(dbName);
    } catch {
      return null;
    }

    try {
      if (!db.objectStoreNames.contains(storeName)) return null;
      return await new Promise<number>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    } finally {
      db.close();
    }
  }

  private async getLocalStoreFingerprints(
    dbName: string,
    storeName: string,
    keyPath: string | string[],
  ): Promise<Map<string, string> | null> {
    let db: IDBDatabase;
    try {
      db = await this.openDatabase(dbName);
    } catch {
      return null;
    }

    try {
      if (!db.objectStoreNames.contains(storeName)) return null;
      const records: unknown[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const fingerprints = new Map<string, string>();
      for (const record of records) {
        const rec = record as Record<string, unknown>;
        const key = Array.isArray(keyPath)
          ? keyPath.map(k => rec[k])
          : rec[keyPath];
        const recordKey = serializeKey(key);
        if (typeof recordKey !== 'string') {
          throw new Error(`Cannot diagnose ${dbName}.${storeName}: missing key ${JSON.stringify(keyPath)}`);
        }
        fingerprints.set(
          this.storeIdentityKey(dbName, storeName, recordKey),
          this.fingerprintValue(record),
        );
      }
      return fingerprints;
    } catch {
      return null;
    } finally {
      db.close();
    }
  }

  private async getLocalStoreRecords<T>(dbName: string, storeName: string): Promise<T[] | null> {
    let db: IDBDatabase;
    try {
      db = await this.openDatabase(dbName);
    } catch {
      return null;
    }

    try {
      if (!db.objectStoreNames.contains(storeName)) return null;
      return await new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    } finally {
      db.close();
    }
  }

  private getLocalStorageFingerprints(): Map<string, string> {
    const fingerprints = new Map<string, string>();
    for (const key of this.getSyncedLocalStorageKeys()) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      fingerprints.set(key, this.fingerprintValue(raw));
    }
    return fingerprints;
  }

  private getDiagnosticStatus(
    local: Map<string, string> | null,
    cloud: Map<string, string> | null,
  ): 'matched' | 'local_only' | 'cloud_only' | 'mismatch' | 'unknown' {
    if (local === null || cloud === null) {
      return local === null && cloud === null ? 'unknown' : local === null ? 'cloud_only' : 'local_only';
    }
    return this.fingerprintMapsEqual(local, cloud) ? 'matched' : 'mismatch';
  }

  private async getLocalPlayLogIntegrityWarnings(
    options: { throwOnReadError?: boolean } = {},
  ): Promise<string[]> {
    const completedGames = await this.getLocalStoreRecords<{ gameId?: string }>(
      'kbl-tracker',
      'completedGames',
    );
    if (!completedGames && options.throwOnReadError) {
      throw new Error('Could not read local sync store kbl-tracker.completedGames');
    }
    if (!completedGames || completedGames.length === 0) return [];

    const gameHeaders = await this.getLocalStoreRecords<{ gameId?: string; eventCount?: number }>(
      'kbl-event-log',
      'gameHeaders',
    );
    if (!gameHeaders && options.throwOnReadError) {
      throw new Error('Could not read local sync store kbl-event-log.gameHeaders');
    }
    const atBatEvents = await this.getLocalStoreRecords<{
      eventId?: string;
      gameId?: string;
      batterReachedOnError?: boolean;
      batterErrorChargedToPosition?: number;
      enrichment?: {
        fieldingSequence?: unknown[];
        fieldingPlayType?: string;
        putouts?: unknown[];
        assists?: unknown[];
        errors?: unknown[];
        savedRun?: boolean;
        extraGemCreditPositions?: unknown[];
        rescuedThrow?: boolean;
      };
      runnerOutcomes?: Array<{
        fieldingSequence?: unknown[];
        fielderId?: string;
        baseSaved?: string;
        errorAttributions?: unknown[];
      }>;
    }>(
      'kbl-event-log',
      'atBatEvents',
    );
    if (!atBatEvents && options.throwOnReadError) {
      throw new Error('Could not read local sync store kbl-event-log.atBatEvents');
    }
    const fieldingEvents = await this.getLocalStoreRecords<{ gameId?: string; atBatEventId?: string }>(
      'kbl-event-log',
      'fieldingEvents',
    );
    if (!fieldingEvents && options.throwOnReadError) {
      throw new Error('Could not read local sync store kbl-event-log.fieldingEvents');
    }
    const betweenPlayEvents = await this.getLocalStoreRecords<{ gameId?: string }>(
      'kbl-event-log',
      'betweenPlayEvents',
    );
    if (!betweenPlayEvents && options.throwOnReadError) {
      throw new Error('Could not read local sync store kbl-event-log.betweenPlayEvents');
    }

    const headerByGameId = new Map<string, { eventCount?: number }>();
    for (const header of gameHeaders ?? []) {
      if (header.gameId) headerByGameId.set(header.gameId, header);
    }

    const atBatCounts = new Map<string, number>();
    for (const event of atBatEvents ?? []) {
      if (!event.gameId) continue;
      atBatCounts.set(event.gameId, (atBatCounts.get(event.gameId) ?? 0) + 1);
    }
    const fieldingCountsByAtBatId = new Map<string, number>();
    for (const event of fieldingEvents ?? []) {
      if (!event.atBatEventId) continue;
      fieldingCountsByAtBatId.set(event.atBatEventId, (fieldingCountsByAtBatId.get(event.atBatEventId) ?? 0) + 1);
    }

    const atBatNeedsFieldingSideRows = (event: NonNullable<typeof atBatEvents>[number]): boolean => {
      const enrichment = event.enrichment;
      const hasEnrichedFielding =
        !!enrichment?.fieldingPlayType ||
        (enrichment?.fieldingSequence?.length ?? 0) > 0 ||
        (enrichment?.putouts?.length ?? 0) > 0 ||
        (enrichment?.assists?.length ?? 0) > 0 ||
        (enrichment?.errors?.length ?? 0) > 0 ||
        !!enrichment?.savedRun ||
        (enrichment?.extraGemCreditPositions?.length ?? 0) > 0 ||
        !!enrichment?.rescuedThrow;
      const hasRunnerFielding =
        event.runnerOutcomes?.some((outcome) =>
          (outcome.fieldingSequence?.length ?? 0) > 0 ||
          !!outcome.fielderId ||
          !!outcome.baseSaved ||
          (outcome.errorAttributions?.length ?? 0) > 0,
        ) ?? false;
      return hasEnrichedFielding || hasRunnerFielding || !!event.batterReachedOnError || !!event.batterErrorChargedToPosition;
    };

    const warnings: string[] = [];
    for (const game of completedGames) {
      if (!game.gameId) continue;
      const header = headerByGameId.get(game.gameId);
      const atBatCount = atBatCounts.get(game.gameId) ?? 0;
      if (!header && atBatCount === 0) {
        warnings.push(`completed game ${game.gameId} has no event-log header or at-bat events`);
      } else if (!header) {
        warnings.push(`completed game ${game.gameId} has ${atBatCount} at-bat events but no event-log header`);
      } else if (header && (header.eventCount ?? 0) > 0 && atBatCount === 0) {
        warnings.push(`completed game ${game.gameId} has event-log header count ${header.eventCount} but no at-bat events`);
      } else if (header && typeof header.eventCount === 'number' && header.eventCount !== atBatCount) {
        warnings.push(`completed game ${game.gameId} event-log count mismatch: header ${header.eventCount}, at-bats ${atBatCount}`);
      }
      for (const event of atBatEvents ?? []) {
        if (event.gameId !== game.gameId || !event.eventId || !atBatNeedsFieldingSideRows(event)) continue;
        if ((fieldingCountsByAtBatId.get(event.eventId) ?? 0) === 0) {
          warnings.push(`completed game ${game.gameId} at-bat ${event.eventId} has fielding enrichment but no fieldingEvents rows`);
        }
      }
    }

    return warnings;
  }

  private isBlockingPlayLogUploadWarning(warning: string): boolean {
    return (
      warning.includes('has no event-log header or at-bat events') ||
      warning.includes('but no event-log header') ||
      warning.includes('but no at-bat events')
    );
  }

  private filterStoreFingerprints(
    fingerprints: Map<string, string>,
    dbName: string,
    storeName: string,
  ): Map<string, string> {
    const prefix = `${dbName}\u0000${storeName}\u0000`;
    const filtered = new Map<string, string>();
    for (const [identity, fingerprint] of fingerprints) {
      if (identity.startsWith(prefix)) {
        filtered.set(identity, fingerprint);
      }
    }
    return filtered;
  }

  private filterStoreFingerprintsByScopes(
    fingerprints: Map<string, string>,
    storeScopes: Set<string>,
  ): Map<string, string> {
    const filtered = new Map<string, string>();
    for (const [identity, fingerprint] of fingerprints) {
      const [dbName, storeName] = identity.split('\u0000');
      if (storeScopes.has(this.storeCountKey(dbName, storeName))) {
        filtered.set(identity, fingerprint);
      }
    }
    return filtered;
  }

  private fingerprintMapsEqual(left: Map<string, string>, right: Map<string, string>): boolean {
    if (left.size !== right.size) return false;
    for (const [key, value] of left) {
      if (right.get(key) !== value) return false;
    }
    return true;
  }

  private formatStoreIdentity(identity: string): string {
    const [dbName, storeName, recordKey] = identity.split('\u0000');
    return `${dbName}.${storeName}[${recordKey}]`;
  }

  private fingerprintValue(value: unknown): string {
    return this.stableStringify(this.toJsonComparable(value));
  }

  private fingerprintStoreWriteState(data: unknown, deleted: boolean): string {
    return this.fingerprintValue({
      deleted,
      data: deleted ? {} : data,
    });
  }

  private fingerprintLocalWriteState(data: unknown, deleted: boolean): string {
    return this.fingerprintValue({
      deleted,
      data: deleted ? {} : this.toLocalStorageWireValue(data),
    });
  }

  private toLocalStorageWireValue(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value) ?? 'null';
  }

  private cloneValue<T>(value: T): T {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private toJsonComparable(value: unknown): unknown {
    try {
      const encoded = JSON.stringify(value);
      return encoded === undefined ? null : JSON.parse(encoded);
    } catch {
      return value;
    }
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(item => this.stableStringify(item)).join(',')}]`;
    }

    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`)
      .join(',')}}`;
  }

  // ============================================================
  // Private — Cursor Management
  // ============================================================

  private async loadCursor(): Promise<void> {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('kbl_sync_meta')
      .select('last_pull_changed_at, last_pull_id, last_pull_received_at, last_pull_local_received_at, last_pull_local_key')
      .eq('user_id', session.user.id)
      .eq('device_id', this.deviceId)
      .maybeSingle();

    this.assertNoSupabaseError(error, 'Failed to load sync cursor');

    if (data) {
      this.cursor = {
        changedAt: data.last_pull_changed_at,
        id: data.last_pull_id,
        receivedAt: data.last_pull_received_at ?? null,
        localReceivedAt: data.last_pull_local_received_at ?? null,
        localKey: data.last_pull_local_key ?? null,
      };
    }
  }

  private async saveCursor(): Promise<void> {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('kbl_sync_meta')
      .upsert({
        user_id: session.user.id,
        device_id: this.deviceId,
        last_pull_changed_at: this.cursor.changedAt,
        last_pull_id: this.cursor.id,
        last_pull_received_at: this.cursor.receivedAt ?? null,
        last_pull_local_received_at: this.cursor.localReceivedAt ?? null,
        last_pull_local_key: this.cursor.localKey ?? null,
      }, { onConflict: 'user_id,device_id' });
    this.assertNoSupabaseError(error, 'Sync cursor save failed');
  }

  // ============================================================
  // Private — Queue Persistence (offline safety net)
  // ============================================================

  private persistQueues(): boolean {
    try {
      const previousPersistenceError = this.queuePersistenceError;
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
      if (this._error === previousPersistenceError) {
        this._error = null;
      }
      this.queuePersistenceError = null;
      return true;
    } catch (error) {
      const message = `Sync queue persistence failed: ${error instanceof Error ? error.message : String(error)}`;
      this.queuePersistenceError = message;
      this._error = message;
      return false;
    }
  }

  private restoreQueues(): void {
    try {
      let restored = false;
      const pushData = localStorage.getItem(QUEUE_PERSIST_KEY);
      if (pushData) {
        const entries = JSON.parse(pushData) as [string, PendingOp][];
        for (const [key, op] of entries) {
          const restoredOp = {
            ...op,
            opId: op.opId ?? this.createQueueOpId('store'),
          };
          if (!this.pushQueue.has(key)) {
            this.pushQueue.set(key, restoredOp);
            restored = true;
          }
          this.restoredPushQueueKeys.add(key);
        }
      }

      const localData = localStorage.getItem(LOCAL_QUEUE_PERSIST_KEY);
      if (localData) {
        const entries = JSON.parse(localData) as [string, PendingLocalOp][];
        for (const [key, op] of entries) {
          const restoredOp = {
            ...op,
            opId: op.opId ?? this.createQueueOpId('local'),
          };
          if (!this.localQueue.has(key)) {
            this.localQueue.set(key, restoredOp);
            restored = true;
          }
          this.restoredLocalQueueKeys.add(key);
        }
      }
      if (restored) {
        this.emitStatusChange();
      }
    } catch {
      // Corrupt data, ignore
    }
  }

  private restoreWriteBaseOverrides(): void {
    try {
      const storeData = localStorage.getItem(STORE_WRITE_BASES_PERSIST_KEY);
      if (storeData) {
        const entries = JSON.parse(storeData) as Array<[string, { receivedAt?: string; id?: string }]>;
        for (const [identity, base] of entries) {
          if (typeof base.receivedAt === 'string' && typeof base.id === 'string') {
            this.storeWriteBaseOverrides.set(identity, { receivedAt: base.receivedAt, id: base.id });
          }
        }
      }

      const localData = localStorage.getItem(LOCAL_WRITE_BASES_PERSIST_KEY);
      if (localData) {
        const entries = JSON.parse(localData) as Array<[string, { receivedAt?: string; key?: string }]>;
        for (const [key, base] of entries) {
          if (typeof base.receivedAt === 'string' && typeof base.key === 'string') {
            this.localWriteBaseOverrides.set(key, { receivedAt: base.receivedAt, key: base.key });
          }
        }
      }
    } catch {
      this.storeWriteBaseOverrides.clear();
      this.localWriteBaseOverrides.clear();
    }
  }

  private persistWriteBaseOverrides(): boolean {
    try {
      const previousPersistenceError = this.writeBasePersistenceError;
      if (this.storeWriteBaseOverrides.size > 0) {
        localStorage.setItem(
          STORE_WRITE_BASES_PERSIST_KEY,
          JSON.stringify(Array.from(this.storeWriteBaseOverrides.entries())),
        );
      } else {
        localStorage.removeItem(STORE_WRITE_BASES_PERSIST_KEY);
      }

      if (this.localWriteBaseOverrides.size > 0) {
        localStorage.setItem(
          LOCAL_WRITE_BASES_PERSIST_KEY,
          JSON.stringify(Array.from(this.localWriteBaseOverrides.entries())),
        );
      } else {
        localStorage.removeItem(LOCAL_WRITE_BASES_PERSIST_KEY);
      }
      if (this._error === previousPersistenceError) {
        this._error = null;
      }
      this.writeBasePersistenceError = null;
      return true;
    } catch (error) {
      const message = `Sync write-base persistence failed: ${error instanceof Error ? error.message : String(error)}`;
      this.writeBasePersistenceError = message;
      this._error = message;
      return false;
    }
  }

  private rememberStoreWriteBaseOverrides(bases: Map<string, { receivedAt: string; id: string }>): void {
    for (const [identity, base] of bases) {
      this.storeWriteBaseOverrides.delete(identity);
      this.storeWriteBaseOverrides.set(identity, base);
    }
  }

  private rememberLocalStorageWriteBaseOverrides(bases: Map<string, { receivedAt: string; key: string }>): void {
    for (const [key, base] of bases) {
      this.localWriteBaseOverrides.delete(key);
      this.localWriteBaseOverrides.set(key, base);
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

  private nextChangedAt(minimum = 0): number {
    const persisted = Number(localStorage.getItem(LAST_WRITE_TIME_KEY) ?? 0);
    const next = Math.max(Date.now(), this.lastGeneratedChangedAt + 1, persisted + 1, minimum);
    this.lastGeneratedChangedAt = next;
    try {
      localStorage.setItem(LAST_WRITE_TIME_KEY, String(next));
    } catch {
      // Queue persistence reports storage failures separately. This in-memory
      // monotonic guard still protects the current session.
    }
    return next;
  }

  private storeWriteBaseFromCursor(cursor: SyncCursor): Pick<CloudStoreWriteRow, 'base_received_at' | 'base_id'> {
    return {
      base_received_at: cursor.receivedAt ?? null,
      base_id: cursor.id ?? null,
    };
  }

  private pendingStoreBaseFromCursor(cursor: SyncCursor): Pick<PendingOp, 'baseReceivedAt' | 'baseId'> {
    return {
      baseReceivedAt: cursor.receivedAt ?? null,
      baseId: cursor.id ?? null,
    };
  }

  private pendingStoreBaseForIdentity(identity: string): Pick<PendingOp, 'baseReceivedAt' | 'baseId'> {
    const override = this.storeWriteBaseOverrides.get(identity);
    if (override && this.isStoreOverrideAfterCursor(override, this.cursor)) {
      return {
        baseReceivedAt: override.receivedAt,
        baseId: override.id,
      };
    }
    return this.pendingStoreBaseFromCursor(this.cursor);
  }

  private localWriteBaseFromCursor(cursor: SyncCursor): Pick<CloudLocalStorageWriteRow, 'base_received_at' | 'base_key'> {
    return {
      base_received_at: cursor.localReceivedAt ?? null,
      base_key: cursor.localKey ?? null,
    };
  }

  private pendingLocalBaseFromCursor(cursor: SyncCursor): Pick<PendingLocalOp, 'baseReceivedAt' | 'baseKey'> {
    return {
      baseReceivedAt: cursor.localReceivedAt ?? null,
      baseKey: cursor.localKey ?? null,
    };
  }

  private pendingLocalBaseForKey(key: string): Pick<PendingLocalOp, 'baseReceivedAt' | 'baseKey'> {
    const override = this.localWriteBaseOverrides.get(key);
    if (override && this.isLocalOverrideAfterCursor(override, this.cursor)) {
      return {
        baseReceivedAt: override.receivedAt,
        baseKey: override.key,
      };
    }
    return this.pendingLocalBaseFromCursor(this.cursor);
  }

  private isStoreOverrideAfterCursor(
    override: { receivedAt: string; id: string },
    cursor: SyncCursor,
  ): boolean {
    if (!cursor.receivedAt) return true;
    if (override.receivedAt > cursor.receivedAt) return true;
    if (override.receivedAt < cursor.receivedAt) return false;
    return !cursor.id || override.id > cursor.id;
  }

  private isLocalOverrideAfterCursor(
    override: { receivedAt: string; key: string },
    cursor: SyncCursor,
  ): boolean {
    if (!cursor.localReceivedAt) return true;
    if (override.receivedAt > cursor.localReceivedAt) return true;
    if (override.receivedAt < cursor.localReceivedAt) return false;
    return !cursor.localKey || override.key > cursor.localKey;
  }

  private createQueueOpId(scope: 'store' | 'local'): string {
    const random =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 12);
    return `${this.deviceId}:${scope}:${Date.now()}:${random}`;
  }

  private getState(): SyncState {
    if (!this._enabled) return 'disabled';
    if (!navigator.onLine) return 'offline';
    if (this._isSyncing) return 'syncing';
    if (this._error) return 'error';
    return 'idle';
  }

  private async getFranchiseIds(options: { throwOnError?: boolean } = {}): Promise<string[]> {
    try {
      const db = await this.openDatabase('kbl-app-meta');
      try {
        if (!db.objectStoreNames.contains('franchiseList')) {
          if (options.throwOnError) {
            throw new Error('franchiseList store missing');
          }
          return [];
        }

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
    } catch (err) {
      if (options.throwOnError) {
        throw new Error(`Could not read franchise IDs for sync: ${err instanceof Error ? err.message : String(err)}`);
      }
      return [];
    }
  }

  private async getEliminationIds(options: { throwOnError?: boolean } = {}): Promise<string[]> {
    try {
      const db = await this.openDatabase('kbl-app-meta');
      try {
        if (!db.objectStoreNames.contains('eliminationList')) {
          if (options.throwOnError) {
            throw new Error('eliminationList store missing');
          }
          return [];
        }

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
    } catch (err) {
      if (options.throwOnError) {
        throw new Error(`Could not read elimination IDs for sync: ${err instanceof Error ? err.message : String(err)}`);
      }
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
