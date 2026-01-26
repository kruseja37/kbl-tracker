/**
 * Backup/Restore Utility
 * Per Ralph Framework GAP-065
 *
 * Exports all IndexedDB data to JSON and imports it back.
 * Supports all KBL Tracker databases.
 */

// ============================================
// TYPES
// ============================================

export interface BackupData {
  version: number;
  exportedAt: string;
  databases: {
    [dbName: string]: {
      [storeName: string]: unknown[];
    };
  };
}

export interface BackupResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredDatabases?: string[];
  error?: string;
}

// ============================================
// CONSTANTS
// ============================================

const BACKUP_VERSION = 1;

// All KBL Tracker databases and their stores
const KBL_DATABASES: Record<string, string[]> = {
  'kbl-tracker': ['games', 'seasons', 'careers'],
  'kbl-event-log': ['events'],
  'kbl-farm': ['farmPlayers'],
  'kbl-franchise': ['franchises', 'owners'],
  'kbl-player-data': ['players', 'playerRatings'],
  'kbl-relationships': ['relationships'],
  'kbl-transactions': ['transactions'],
};

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Read all data from a single IndexedDB database
 */
async function exportDatabase(
  dbName: string,
  storeNames: string[]
): Promise<Record<string, unknown[]>> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => {
      // Database might not exist yet, return empty
      resolve({});
    };

    request.onsuccess = () => {
      const db = request.result;
      const result: Record<string, unknown[]> = {};

      // Filter to only stores that exist
      const existingStores = storeNames.filter((store) =>
        db.objectStoreNames.contains(store)
      );

      if (existingStores.length === 0) {
        db.close();
        resolve({});
        return;
      }

      let completed = 0;

      for (const storeName of existingStores) {
        try {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const getAllRequest = store.getAll();

          getAllRequest.onsuccess = () => {
            result[storeName] = getAllRequest.result || [];
            completed++;

            if (completed === existingStores.length) {
              db.close();
              resolve(result);
            }
          };

          getAllRequest.onerror = () => {
            result[storeName] = [];
            completed++;

            if (completed === existingStores.length) {
              db.close();
              resolve(result);
            }
          };
        } catch {
          result[storeName] = [];
          completed++;

          if (completed === existingStores.length) {
            db.close();
            resolve(result);
          }
        }
      }
    };
  });
}

/**
 * Export all KBL data to a BackupData object
 */
export async function exportAllData(): Promise<BackupData> {
  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    databases: {},
  };

  for (const [dbName, storeNames] of Object.entries(KBL_DATABASES)) {
    const dbData = await exportDatabase(dbName, storeNames);
    if (Object.keys(dbData).length > 0) {
      backup.databases[dbName] = dbData;
    }
  }

  return backup;
}

/**
 * Export data and trigger download (AC-1)
 */
export async function downloadBackup(): Promise<BackupResult> {
  try {
    const backup = await exportAllData();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0];
    const filename = `kbl-backup-${date}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

// ============================================
// IMPORT FUNCTIONS
// ============================================

/**
 * Restore data to a single IndexedDB database
 */
async function restoreDatabase(
  dbName: string,
  storeNames: string[],
  data: Record<string, unknown[]>
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // First, delete the existing database
    const deleteRequest = indexedDB.deleteDatabase(dbName);

    deleteRequest.onsuccess = () => {
      // Now open and recreate with data
      const openRequest = indexedDB.open(dbName, 1);

      openRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        for (const storeName of storeNames) {
          if (!db.objectStoreNames.contains(storeName)) {
            // Try to determine key path from data
            const storeData = data[storeName];
            let keyPath = 'id';

            if (storeData && storeData.length > 0) {
              const sample = storeData[0] as Record<string, unknown>;
              if (sample.gameId) keyPath = 'gameId';
              else if (sample.seasonId) keyPath = 'seasonId';
              else if (sample.playerId) keyPath = 'playerId';
              else if (sample.eventId) keyPath = 'eventId';
              else if (sample.franchiseId) keyPath = 'franchiseId';
              else if (sample.transactionId) keyPath = 'transactionId';
              else if (sample.relationshipId) keyPath = 'relationshipId';
            }

            db.createObjectStore(storeName, { keyPath });
          }
        }
      };

      openRequest.onsuccess = () => {
        const db = openRequest.result;
        let completed = 0;
        const storesToRestore = Object.keys(data).filter((store) =>
          db.objectStoreNames.contains(store)
        );

        if (storesToRestore.length === 0) {
          db.close();
          resolve(true);
          return;
        }

        for (const storeName of storesToRestore) {
          const storeData = data[storeName];
          if (!storeData || storeData.length === 0) {
            completed++;
            if (completed === storesToRestore.length) {
              db.close();
              resolve(true);
            }
            continue;
          }

          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);

          let itemsCompleted = 0;
          for (const item of storeData) {
            const putRequest = store.put(item);
            putRequest.onsuccess = () => {
              itemsCompleted++;
              if (itemsCompleted === storeData.length) {
                completed++;
                if (completed === storesToRestore.length) {
                  db.close();
                  resolve(true);
                }
              }
            };
            putRequest.onerror = () => {
              itemsCompleted++;
              if (itemsCompleted === storeData.length) {
                completed++;
                if (completed === storesToRestore.length) {
                  db.close();
                  resolve(true);
                }
              }
            };
          }
        }
      };

      openRequest.onerror = () => {
        reject(new Error(`Failed to open database ${dbName}`));
      };
    };

    deleteRequest.onerror = () => {
      reject(new Error(`Failed to delete database ${dbName}`));
    };
  });
}

/**
 * Validate backup file structure
 */
function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;

  const backup = data as BackupData;
  if (typeof backup.version !== 'number') return false;
  if (typeof backup.exportedAt !== 'string') return false;
  if (!backup.databases || typeof backup.databases !== 'object') return false;

  return true;
}

/**
 * Restore all data from a BackupData object
 */
export async function restoreAllData(backup: BackupData): Promise<RestoreResult> {
  if (!validateBackup(backup)) {
    return { success: false, error: 'Invalid backup file format' };
  }

  const restoredDatabases: string[] = [];

  try {
    for (const [dbName, storeNames] of Object.entries(KBL_DATABASES)) {
      const dbData = backup.databases[dbName];
      if (dbData && Object.keys(dbData).length > 0) {
        await restoreDatabase(dbName, storeNames, dbData);
        restoredDatabases.push(dbName);
      }
    }

    return { success: true, restoredDatabases };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Restore failed',
    };
  }
}

/**
 * Read file and restore data (AC-2)
 */
export async function restoreFromFile(file: File): Promise<RestoreResult> {
  try {
    const text = await file.text();
    const backup = JSON.parse(text) as BackupData;

    return await restoreAllData(backup);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read backup file',
    };
  }
}

/**
 * Get backup statistics (for UI display)
 */
export async function getBackupStats(): Promise<{
  databases: number;
  totalRecords: number;
  details: Record<string, number>;
}> {
  const backup = await exportAllData();
  const details: Record<string, number> = {};
  let totalRecords = 0;

  for (const [dbName, stores] of Object.entries(backup.databases)) {
    let dbCount = 0;
    for (const storeData of Object.values(stores)) {
      dbCount += (storeData as unknown[]).length;
    }
    details[dbName] = dbCount;
    totalRecords += dbCount;
  }

  return {
    databases: Object.keys(backup.databases).length,
    totalRecords,
    details,
  };
}
