import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  SYNC_OUTBOX_DATABASE,
  syncOutboxRecordId,
  syncOutboxStore,
  type SyncOutboxRecord,
} from '../syncOutboxStore';

function deleteOutbox(): Promise<void> {
  syncOutboxStore.close();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(SYNC_OUTBOX_DATABASE);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Sync outbox delete was blocked.'));
  });
}

function record(ownerUserId: string, queueKey: string): SyncOutboxRecord {
  const operation = {
    ownerUserId,
    dbName: 'kbl-event-log',
    storeName: 'atBatEvents',
    recordKey: JSON.stringify(queueKey),
    data: { eventId: queueKey },
    changedAt: 1,
    deleted: false,
  };
  return {
    id: syncOutboxRecordId(ownerUserId, 'store', queueKey),
    ownerUserId,
    kind: 'store',
    queueKey,
    operation,
    updatedAt: 1,
  };
}

describe('sync outbox account boundary', () => {
  beforeEach(deleteOutbox);
  afterEach(deleteOutbox);

  test('replaces one account snapshot without changing another account', async () => {
    await syncOutboxStore.importOwnedRecords([
      record('account-a', 'a-old'),
      record('account-b', 'b-kept'),
    ]);

    await syncOutboxStore.replaceOwnerSnapshot('account-a', [record('account-a', 'a-new')]);

    await expect(syncOutboxStore.loadOwner('account-a')).resolves.toEqual([
      expect.objectContaining({ ownerUserId: 'account-a', queueKey: 'a-new' }),
    ]);
    await expect(syncOutboxStore.loadOwner('account-b')).resolves.toEqual([
      expect.objectContaining({ ownerUserId: 'account-b', queueKey: 'b-kept' }),
    ]);
  });

  test('rejects a checkpoint that contains another account owner', async () => {
    await expect(
      syncOutboxStore.replaceOwnerSnapshot('account-a', [record('account-b', 'wrong-owner')]),
    ).rejects.toThrow('another account');
    await expect(syncOutboxStore.loadOwner('account-a')).resolves.toEqual([]);
    await expect(syncOutboxStore.loadOwner('account-b')).resolves.toEqual([]);
  });

  test('moves old-account rows to quarantine and never returns them as active', async () => {
    await syncOutboxStore.importOwnedRecords([
      record('account-a', 'a-pending'),
      record('account-b', 'b-pending'),
    ]);

    await expect(
      syncOutboxStore.quarantineOtherOwners('account-b', 'account changed'),
    ).resolves.toBe(1);

    await expect(syncOutboxStore.loadOwner('account-a')).resolves.toEqual([]);
    await expect(syncOutboxStore.loadOwner('account-b')).resolves.toHaveLength(1);
    await expect(syncOutboxStore.listQuarantined()).resolves.toEqual([
      expect.objectContaining({
        ownerUserId: 'account-a',
        queueKey: 'a-pending',
        reason: 'account changed',
      }),
    ]);
  });

  test('keeps write bases account-owned and quarantines foreign account state', async () => {
    await syncOutboxStore.replaceAccountState({
      ownerUserId: 'account-a',
      storeWriteBases: [['store-a', { receivedAt: '2026-01-01T00:00:00Z', id: 'row-a' }]],
      localWriteBases: [],
      updatedAt: 1,
    });
    await syncOutboxStore.replaceAccountState({
      ownerUserId: 'account-b',
      storeWriteBases: [],
      localWriteBases: [['local-b', { receivedAt: '2026-01-02T00:00:00Z', key: 'local-b' }]],
      updatedAt: 2,
    });

    await expect(
      syncOutboxStore.quarantineOtherAccountStates('account-b', 'account changed'),
    ).resolves.toBe(1);

    await expect(syncOutboxStore.loadAccountState('account-a')).resolves.toBeNull();
    await expect(syncOutboxStore.loadAccountState('account-b')).resolves.toEqual(
      expect.objectContaining({ ownerUserId: 'account-b' }),
    );
    await expect(syncOutboxStore.listQuarantinedAccountStates()).resolves.toEqual([
      expect.objectContaining({
        ownerUserId: 'account-a',
        reason: 'account changed',
      }),
    ]);
  });
});
