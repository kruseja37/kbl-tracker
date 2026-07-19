/**
 * Durable, account-owned storage for pending cloud-sync operations.
 *
 * The outbox is separate from product databases. A queue checkpoint replaces
 * one account's active rows in one IndexedDB transaction. Rows from a signed-
 * out or replaced account move to quarantine. They never become another
 * account's pending work.
 */

export const SYNC_OUTBOX_DATABASE = 'kbl-sync-outbox';

const DATABASE_VERSION = 2;
const ACTIVE_STORE = 'activeOperations';
const QUARANTINE_STORE = 'quarantinedOperations';
const ACCOUNT_STATE_STORE = 'accountState';
const QUARANTINED_ACCOUNT_STATE_STORE = 'quarantinedAccountState';
const OWNER_INDEX = 'ownerUserId';

export type SyncOutboxKind = 'store' | 'localStorage';

export interface SyncOutboxRecord {
  id: string;
  ownerUserId: string;
  kind: SyncOutboxKind;
  queueKey: string;
  operation: unknown;
  updatedAt: number;
}

export interface QuarantinedSyncOutboxRecord extends SyncOutboxRecord {
  quarantineId: string;
  quarantinedAt: number;
  reason: string;
}

export interface SyncAccountStateRecord {
  ownerUserId: string;
  storeWriteBases: Array<[string, { receivedAt: string; id: string }]>;
  localWriteBases: Array<[string, { receivedAt: string; key: string }]>;
  updatedAt: number;
}

export interface QuarantinedSyncAccountStateRecord extends SyncAccountStateRecord {
  quarantineId: string;
  quarantinedAt: number;
  reason: string;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
  });
}

export function syncOutboxRecordId(
  ownerUserId: string,
  kind: SyncOutboxKind,
  queueKey: string,
): string {
  return `${ownerUserId}\u0000${kind}\u0000${queueKey}`;
}

class SyncOutboxStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(SYNC_OUTBOX_DATABASE, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(ACTIVE_STORE)) {
          const active = database.createObjectStore(ACTIVE_STORE, { keyPath: 'id' });
          active.createIndex(OWNER_INDEX, OWNER_INDEX, { unique: false });
        }
        if (!database.objectStoreNames.contains(QUARANTINE_STORE)) {
          const quarantine = database.createObjectStore(QUARANTINE_STORE, { keyPath: 'quarantineId' });
          quarantine.createIndex(OWNER_INDEX, OWNER_INDEX, { unique: false });
        }
        if (!database.objectStoreNames.contains(ACCOUNT_STATE_STORE)) {
          database.createObjectStore(ACCOUNT_STATE_STORE, { keyPath: 'ownerUserId' });
        }
        if (!database.objectStoreNames.contains(QUARANTINED_ACCOUNT_STATE_STORE)) {
          const quarantine = database.createObjectStore(
            QUARANTINED_ACCOUNT_STATE_STORE,
            { keyPath: 'quarantineId' },
          );
          quarantine.createIndex(OWNER_INDEX, OWNER_INDEX, { unique: false });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          this.databasePromise = null;
        };
        resolve(database);
      };
      request.onerror = () => {
        this.databasePromise = null;
        reject(request.error ?? new Error('Could not open the sync outbox.'));
      };
      request.onblocked = () => {
        this.databasePromise = null;
        reject(new Error('The sync outbox upgrade is blocked by another tab.'));
      };
    });

    return this.databasePromise;
  }

  async loadOwner(ownerUserId: string): Promise<SyncOutboxRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(ACTIVE_STORE, 'readonly');
    const done = transactionDone(transaction);
    const records = await requestResult(
      transaction.objectStore(ACTIVE_STORE).index(OWNER_INDEX).getAll(ownerUserId),
    ) as SyncOutboxRecord[];
    await done;
    return records;
  }

  async replaceOwnerSnapshot(ownerUserId: string, records: SyncOutboxRecord[]): Promise<void> {
    if (records.some((record) => record.ownerUserId !== ownerUserId)) {
      throw new Error('A sync outbox checkpoint contains an operation for another account.');
    }

    const database = await this.open();
    const transaction = database.transaction(ACTIVE_STORE, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(ACTIVE_STORE);
    const ownerIndex = store.index(OWNER_INDEX);
    const cursorRequest = ownerIndex.openKeyCursor(IDBKeyRange.only(ownerUserId));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        for (const record of records) store.put(record);
        return;
      }
      store.delete(cursor.primaryKey);
      cursor.continue();
    };
    await done;
  }

  async importOwnedRecords(records: SyncOutboxRecord[]): Promise<void> {
    if (records.length === 0) return;
    const database = await this.open();
    const transaction = database.transaction(ACTIVE_STORE, 'readwrite');
    const store = transaction.objectStore(ACTIVE_STORE);
    for (const record of records) store.put(record);
    await transactionDone(transaction);
  }

  async quarantineOwner(ownerUserId: string, reason: string): Promise<number> {
    const records = await this.loadOwner(ownerUserId);
    if (records.length === 0) return 0;

    const database = await this.open();
    const transaction = database.transaction([ACTIVE_STORE, QUARANTINE_STORE], 'readwrite');
    const active = transaction.objectStore(ACTIVE_STORE);
    const quarantine = transaction.objectStore(QUARANTINE_STORE);
    const quarantinedAt = Date.now();
    records.forEach((record, index) => {
      quarantine.put({
        ...record,
        quarantineId: `${record.id}\u0000${quarantinedAt}\u0000${index}`,
        quarantinedAt,
        reason,
      } satisfies QuarantinedSyncOutboxRecord);
      active.delete(record.id);
    });
    await transactionDone(transaction);
    return records.length;
  }

  async quarantineOtherOwners(ownerUserId: string, reason: string): Promise<number> {
    const database = await this.open();
    const readTransaction = database.transaction(ACTIVE_STORE, 'readonly');
    const readDone = transactionDone(readTransaction);
    const records = await requestResult(readTransaction.objectStore(ACTIVE_STORE).getAll()) as SyncOutboxRecord[];
    await readDone;
    const foreignRecords = records.filter((record) => record.ownerUserId !== ownerUserId);
    if (foreignRecords.length === 0) return 0;

    const transaction = database.transaction([ACTIVE_STORE, QUARANTINE_STORE], 'readwrite');
    const active = transaction.objectStore(ACTIVE_STORE);
    const quarantine = transaction.objectStore(QUARANTINE_STORE);
    const quarantinedAt = Date.now();
    foreignRecords.forEach((record, index) => {
      quarantine.put({
        ...record,
        quarantineId: `${record.id}\u0000${quarantinedAt}\u0000${index}`,
        quarantinedAt,
        reason,
      } satisfies QuarantinedSyncOutboxRecord);
      active.delete(record.id);
    });
    await transactionDone(transaction);
    return foreignRecords.length;
  }

  async quarantineRecords(
    records: SyncOutboxRecord[],
    reason: string,
  ): Promise<number> {
    if (records.length === 0) return 0;
    const database = await this.open();
    const transaction = database.transaction(QUARANTINE_STORE, 'readwrite');
    const quarantine = transaction.objectStore(QUARANTINE_STORE);
    const quarantinedAt = Date.now();
    records.forEach((record, index) => {
      quarantine.put({
        ...record,
        quarantineId: `${record.id}\u0000${quarantinedAt}\u0000${index}`,
        quarantinedAt,
        reason,
      } satisfies QuarantinedSyncOutboxRecord);
    });
    await transactionDone(transaction);
    return records.length;
  }

  async listQuarantined(): Promise<QuarantinedSyncOutboxRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(QUARANTINE_STORE, 'readonly');
    const done = transactionDone(transaction);
    const records = await requestResult(
      transaction.objectStore(QUARANTINE_STORE).getAll(),
    ) as QuarantinedSyncOutboxRecord[];
    await done;
    return records;
  }

  async loadAccountState(ownerUserId: string): Promise<SyncAccountStateRecord | null> {
    const database = await this.open();
    const transaction = database.transaction(ACCOUNT_STATE_STORE, 'readonly');
    const done = transactionDone(transaction);
    const record = await requestResult(
      transaction.objectStore(ACCOUNT_STATE_STORE).get(ownerUserId),
    ) as SyncAccountStateRecord | undefined;
    await done;
    return record ?? null;
  }

  async replaceAccountState(record: SyncAccountStateRecord): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(ACCOUNT_STATE_STORE, 'readwrite');
    transaction.objectStore(ACCOUNT_STATE_STORE).put(record);
    await transactionDone(transaction);
  }

  async quarantineAccountState(ownerUserId: string, reason: string): Promise<number> {
    const record = await this.loadAccountState(ownerUserId);
    if (!record) return 0;

    const database = await this.open();
    const transaction = database.transaction(
      [ACCOUNT_STATE_STORE, QUARANTINED_ACCOUNT_STATE_STORE],
      'readwrite',
    );
    const quarantinedAt = Date.now();
    transaction.objectStore(QUARANTINED_ACCOUNT_STATE_STORE).put({
      ...record,
      quarantineId: `${ownerUserId}\u0000${quarantinedAt}`,
      quarantinedAt,
      reason,
    } satisfies QuarantinedSyncAccountStateRecord);
    transaction.objectStore(ACCOUNT_STATE_STORE).delete(ownerUserId);
    await transactionDone(transaction);
    return 1;
  }

  async quarantineOtherAccountStates(ownerUserId: string, reason: string): Promise<number> {
    const database = await this.open();
    const readTransaction = database.transaction(ACCOUNT_STATE_STORE, 'readonly');
    const readDone = transactionDone(readTransaction);
    const records = await requestResult(
      readTransaction.objectStore(ACCOUNT_STATE_STORE).getAll(),
    ) as SyncAccountStateRecord[];
    await readDone;
    const foreignRecords = records.filter((record) => record.ownerUserId !== ownerUserId);
    if (foreignRecords.length === 0) return 0;

    const transaction = database.transaction(
      [ACCOUNT_STATE_STORE, QUARANTINED_ACCOUNT_STATE_STORE],
      'readwrite',
    );
    const active = transaction.objectStore(ACCOUNT_STATE_STORE);
    const quarantine = transaction.objectStore(QUARANTINED_ACCOUNT_STATE_STORE);
    const quarantinedAt = Date.now();
    foreignRecords.forEach((record, index) => {
      quarantine.put({
        ...record,
        quarantineId: `${record.ownerUserId}\u0000${quarantinedAt}\u0000${index}`,
        quarantinedAt,
        reason,
      } satisfies QuarantinedSyncAccountStateRecord);
      active.delete(record.ownerUserId);
    });
    await transactionDone(transaction);
    return foreignRecords.length;
  }

  async quarantineAccountStateRecord(
    record: SyncAccountStateRecord,
    reason: string,
  ): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(QUARANTINED_ACCOUNT_STATE_STORE, 'readwrite');
    const quarantinedAt = Date.now();
    transaction.objectStore(QUARANTINED_ACCOUNT_STATE_STORE).put({
      ...record,
      quarantineId: `${record.ownerUserId}\u0000${quarantinedAt}`,
      quarantinedAt,
      reason,
    } satisfies QuarantinedSyncAccountStateRecord);
    await transactionDone(transaction);
  }

  async listQuarantinedAccountStates(): Promise<QuarantinedSyncAccountStateRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(QUARANTINED_ACCOUNT_STATE_STORE, 'readonly');
    const done = transactionDone(transaction);
    const records = await requestResult(
      transaction.objectStore(QUARANTINED_ACCOUNT_STATE_STORE).getAll(),
    ) as QuarantinedSyncAccountStateRecord[];
    await done;
    return records;
  }

  close(): void {
    void this.databasePromise?.then((database) => database.close()).catch(() => undefined);
    this.databasePromise = null;
  }
}

export const syncOutboxStore = new SyncOutboxStore();
