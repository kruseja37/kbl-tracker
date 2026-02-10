/**
 * Franchise Manager
 *
 * Per FRANCHISE_MODE_SPEC.md §2.2 and §4:
 * - Separate IndexedDB per franchise: kbl-franchise-{id}/
 * - Shared app-meta DB: kbl-app-meta/ for franchise list and app settings
 * - Full CRUD + export/import + active franchise tracking
 *
 * DB Naming:
 *   kbl-app-meta       → franchiseList, appSettings, lastUsedFranchise
 *   kbl-franchise-{id} → gameHeaders, atBatEvents, seasonStats, careerStats, ...
 */

// ============================================
// TYPES
// ============================================

import type { StoredFranchiseConfig } from '../types/franchise';

export type FranchiseId = string;

export interface FranchiseMetadata {
  franchiseId: FranchiseId;
  name: string;
  createdAt: number;
  lastPlayedAt: number;
  schemaVersion: number;
  appVersionCreated: string;
  // Enhanced fields for franchise display
  leagueName?: string;
  leagueId?: string;
  controlledTeamId?: string;
  controlledTeamName?: string;
  currentSeason?: number;
}

export interface FranchiseSummary {
  id: FranchiseId;
  name: string;
  createdAt: number;
  lastPlayedAt: number;
  currentSeason: number;
  totalSeasons: number;
  storageUsedBytes: number;
  leagueName?: string;
  controlledTeamName?: string;
}

export interface FranchiseStats {
  totalGames: number;
  totalAtBats: number;
  totalFameEvents: number;
  seasons: SeasonSummary[];
}

export interface SeasonSummary {
  seasonId: string;
  seasonNumber: number;
  gamesPlayed: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
}

export interface AppSettings {
  lastUsedFranchise: FranchiseId | null;
  theme?: string;
}

// ============================================
// CONSTANTS
// ============================================

const META_DB_NAME = 'kbl-app-meta';
const META_DB_VERSION = 2;
const DB_PREFIX = 'kbl-franchise-';
const CURRENT_SCHEMA_VERSION = 1;
const APP_VERSION = '1.0.0';

const META_STORES = {
  franchiseList: 'franchiseList',
  appSettings: 'appSettings',
  franchiseConfigs: 'franchiseConfigs',
};

// ============================================
// DB NAMING HELPERS
// ============================================

export function getFranchiseDBName(franchiseId: FranchiseId): string {
  return `${DB_PREFIX}${franchiseId}`;
}

function generateFranchiseId(): FranchiseId {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// APP-META DATABASE
// ============================================

let metaDbPromise: Promise<IDBDatabase> | null = null;

export async function initMetaDatabase(): Promise<IDBDatabase> {
  if (metaDbPromise) return metaDbPromise;

  metaDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(META_DB_NAME, META_DB_VERSION);

    request.onerror = () => {
      metaDbPromise = null;
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(META_STORES.franchiseList)) {
        db.createObjectStore(META_STORES.franchiseList, { keyPath: 'franchiseId' });
      }

      if (!db.objectStoreNames.contains(META_STORES.appSettings)) {
        db.createObjectStore(META_STORES.appSettings, { keyPath: 'key' });
      }

      // v2: Add franchiseConfigs store
      if (!db.objectStoreNames.contains(META_STORES.franchiseConfigs)) {
        db.createObjectStore(META_STORES.franchiseConfigs, { keyPath: 'franchiseId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });

  return metaDbPromise;
}

// ============================================
// FRANCHISE CRUD
// ============================================

/**
 * Create a new franchise. Returns the new franchise ID.
 */
export async function createFranchise(name: string): Promise<FranchiseId> {
  const db = await initMetaDatabase();
  const franchiseId = generateFranchiseId();

  const metadata: FranchiseMetadata = {
    franchiseId,
    name,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersionCreated: APP_VERSION,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORES.franchiseList, 'readwrite');
    const store = tx.objectStore(META_STORES.franchiseList);
    const request = store.put(metadata);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(franchiseId);
  });
}

/**
 * Load franchise metadata by ID.
 */
export async function loadFranchise(franchiseId: FranchiseId): Promise<FranchiseMetadata | null> {
  const db = await initMetaDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORES.franchiseList, 'readonly');
    const store = tx.objectStore(META_STORES.franchiseList);
    const request = store.get(franchiseId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Delete a franchise and its IndexedDB.
 */
export async function deleteFranchise(franchiseId: FranchiseId): Promise<void> {
  const db = await initMetaDatabase();

  // Remove from meta DB (franchise metadata)
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORES.franchiseList, 'readwrite');
    const store = tx.objectStore(META_STORES.franchiseList);
    const request = store.delete(franchiseId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });

  // Remove franchise config from meta DB
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORES.franchiseConfigs, 'readwrite');
      const store = tx.objectStore(META_STORES.franchiseConfigs);
      const request = store.delete(franchiseId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // Config store may not exist in v1 databases — ignore
  }

  // Clear franchise-scoped schedule data
  try {
    const { clearFranchiseSchedule } = await import('./scheduleStorage');
    await clearFranchiseSchedule(franchiseId);
  } catch {
    // Schedule storage may not be initialized — ignore
  }

  // Delete the franchise's IndexedDB
  const dbName = getFranchiseDBName(franchiseId);
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => {
      console.warn(`[franchiseManager] deleteDatabase blocked for ${dbName}`);
      resolve(); // Continue — DB will be deleted when connections close
    };
  });
}

/**
 * Rename a franchise.
 */
export async function renameFranchise(
  franchiseId: FranchiseId,
  newName: string
): Promise<void> {
  const metadata = await loadFranchise(franchiseId);
  if (!metadata) throw new Error(`Franchise ${franchiseId} not found`);

  metadata.name = newName;

  const db = await initMetaDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORES.franchiseList, 'readwrite');
    const store = tx.objectStore(META_STORES.franchiseList);
    const request = store.put(metadata);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * List all franchises as summaries.
 */
export async function listFranchises(): Promise<FranchiseSummary[]> {
  const db = await initMetaDatabase();

  const metadataList: FranchiseMetadata[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORES.franchiseList, 'readonly');
    const store = tx.objectStore(META_STORES.franchiseList);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });

  // Convert metadata to summaries using enhanced fields
  return metadataList.map((meta) => ({
    id: meta.franchiseId,
    name: meta.name,
    createdAt: meta.createdAt,
    lastPlayedAt: meta.lastPlayedAt,
    currentSeason: meta.currentSeason ?? 1,
    totalSeasons: meta.currentSeason ?? 1,
    storageUsedBytes: 0, // Updated via estimateStorageUsage()
    leagueName: meta.leagueName,
    controlledTeamName: meta.controlledTeamName,
  }));
}

// ============================================
// ACTIVE FRANCHISE
// ============================================

/**
 * Get the last-used (active) franchise ID.
 */
export async function getActiveFranchise(): Promise<FranchiseId | null> {
  const db = await initMetaDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORES.appSettings, 'readonly');
    const store = tx.objectStore(META_STORES.appSettings);
    const request = store.get('activeFranchise');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result?.value ?? null);
    };
  });
}

/**
 * Set the active franchise and update lastPlayedAt.
 */
export async function setActiveFranchise(franchiseId: FranchiseId): Promise<void> {
  const db = await initMetaDatabase();

  // Save to appSettings
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORES.appSettings, 'readwrite');
    const store = tx.objectStore(META_STORES.appSettings);
    const request = store.put({ key: 'activeFranchise', value: franchiseId });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });

  // Update lastPlayedAt on the franchise
  const metadata = await loadFranchise(franchiseId);
  if (metadata) {
    metadata.lastPlayedAt = Date.now();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORES.franchiseList, 'readwrite');
      const store = tx.objectStore(META_STORES.franchiseList);
      const request = store.put(metadata);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// ============================================
// FRANCHISE CONFIG STORAGE
// ============================================

/**
 * Save the full franchise configuration to kbl-app-meta.
 */
export async function saveFranchiseConfig(config: StoredFranchiseConfig): Promise<void> {
  const db = await initMetaDatabase();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORES.franchiseConfigs, 'readwrite');
    const store = tx.objectStore(META_STORES.franchiseConfigs);
    const request = store.put(config);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Load the full franchise configuration from kbl-app-meta.
 */
export async function getFranchiseConfig(franchiseId: FranchiseId): Promise<StoredFranchiseConfig | null> {
  const db = await initMetaDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORES.franchiseConfigs, 'readonly');
    const store = tx.objectStore(META_STORES.franchiseConfigs);
    const request = store.get(franchiseId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Update franchise metadata with enhanced fields (league, team, season).
 */
export async function updateFranchiseMetadata(
  franchiseId: FranchiseId,
  updates: Partial<Pick<FranchiseMetadata, 'leagueName' | 'leagueId' | 'controlledTeamId' | 'controlledTeamName' | 'currentSeason'>>
): Promise<void> {
  const metadata = await loadFranchise(franchiseId);
  if (!metadata) throw new Error(`Franchise ${franchiseId} not found`);

  Object.assign(metadata, updates);

  const db = await initMetaDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORES.franchiseList, 'readwrite');
    const store = tx.objectStore(META_STORES.franchiseList);
    const request = store.put(metadata);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================
// EXPORT / IMPORT (GAP-B5-005)
// ============================================

/**
 * Export a franchise as a JSON Blob containing all its data.
 * Reads all object stores from the franchise's IndexedDB.
 */
export async function exportFranchise(franchiseId: FranchiseId): Promise<Blob> {
  const metadata = await loadFranchise(franchiseId);
  if (!metadata) throw new Error(`Franchise ${franchiseId} not found`);

  const dbName = getFranchiseDBName(franchiseId);

  // Open the franchise DB
  const franchiseDb = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  // Read all stores
  const exportData: Record<string, unknown[]> = {};
  const storeNames = Array.from(franchiseDb.objectStoreNames);

  for (const storeName of storeNames) {
    const records: unknown[] = await new Promise((resolve, reject) => {
      const tx = franchiseDb.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
    exportData[storeName] = records;
  }

  franchiseDb.close();

  const blob = new Blob(
    [JSON.stringify({ metadata, stores: exportData, exportedAt: Date.now() })],
    { type: 'application/json' }
  );

  return blob;
}

/**
 * Import a franchise from a JSON Blob.
 * Creates a new franchise ID and populates its IndexedDB.
 */
export async function importFranchise(data: Blob): Promise<FranchiseId> {
  const text = await data.text();
  const parsed = JSON.parse(text) as {
    metadata: FranchiseMetadata;
    stores: Record<string, unknown[]>;
    exportedAt: number;
  };

  // Create new franchise with imported name
  const newId = await createFranchise(`${parsed.metadata.name} (imported)`);
  const dbName = getFranchiseDBName(newId);

  // Open/create the franchise DB with the needed stores
  const storeNames = Object.keys(parsed.stores);
  if (storeNames.length > 0) {
    const franchiseDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const storeName of storeNames) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { autoIncrement: true });
          }
        }
      };

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    // Write data to each store
    for (const [storeName, records] of Object.entries(parsed.stores)) {
      if (records.length === 0) continue;
      await new Promise<void>((resolve, reject) => {
        const tx = franchiseDb.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const record of records) {
          store.put(record);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    franchiseDb.close();
  }

  return newId;
}

// ============================================
// STORAGE MONITORING (GAP-B5-008)
// ============================================

/**
 * Estimate storage used by a franchise's IndexedDB.
 * Uses the StorageManager API when available, falls back to 0.
 */
export async function estimateStorageUsage(
  _franchiseId: FranchiseId
): Promise<number> {
  // StorageManager.estimate() gives total origin usage, not per-DB.
  // For per-franchise estimates, we'd need to read all records and sum sizes.
  // This is expensive, so we return 0 and update when franchise is loaded.
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    // Return total usage divided by franchise count as rough estimate
    const franchises = await listFranchises();
    const count = Math.max(franchises.length, 1);
    return Math.round((estimate.usage ?? 0) / count);
  }
  return 0;
}

// ============================================
// FRANCHISE SWITCHING (GAP-B5-003)
// ============================================

// Track the currently open franchise DB connection
let activeFranchiseDb: IDBDatabase | null = null;
let activeFranchiseId: FranchiseId | null = null;

/**
 * Close current franchise DB and open a new one.
 * Per spec §6.2:
 *   1. Close current franchise DB connection
 *   2. Clear in-memory state (caller handles React reset)
 *   3. Open new franchise DB
 *   4. Run integrity check (caller handles)
 *   5. Load initial state (caller handles)
 *
 * Returns the opened IDBDatabase for the new franchise.
 */
export async function switchFranchise(
  franchiseId: FranchiseId
): Promise<IDBDatabase> {
  // Step 1: Close current DB
  if (activeFranchiseDb) {
    activeFranchiseDb.close();
    activeFranchiseDb = null;
    activeFranchiseId = null;
  }

  // Step 2: Caller must clear React state (e.g., key prop change, context reset)

  // Step 3: Open new franchise DB
  const dbName = getFranchiseDBName(franchiseId);
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  activeFranchiseDb = db;
  activeFranchiseId = franchiseId;

  // Update active franchise in meta
  await setActiveFranchise(franchiseId);

  return db;
}

/**
 * Get the currently active franchise DB connection.
 */
export function getActiveFranchiseDb(): IDBDatabase | null {
  return activeFranchiseDb;
}

/**
 * Get the currently active franchise ID (in-memory).
 */
export function getActiveFranchiseIdSync(): FranchiseId | null {
  return activeFranchiseId;
}

// ============================================
// LEGACY DATA MIGRATION (GAP-B5-004)
// ============================================

/**
 * Check if legacy (pre-franchise) data exists.
 * Legacy data uses the old DB name patterns without franchise prefix.
 */
export async function hasLegacyData(): Promise<boolean> {
  // Check for legacy DBs that don't have the franchise prefix
  const databases = await indexedDB.databases();
  const legacyPatterns = ['kbl-tracker', 'kbl-offseason', 'kbl-seasons', 'kbl-events'];

  return databases.some(
    (dbInfo) => dbInfo.name && legacyPatterns.some((p) => dbInfo.name === p)
  );
}

/**
 * Migrate legacy data into a "Default Franchise".
 * Per spec §7:
 *   1. Detect legacy data on first launch
 *   2. Create "Default Franchise"
 *   3. Migrate all data into it
 *   4. Show migration complete message
 *   5. Continue with franchise mode
 *
 * Returns the new franchise ID if migration occurred, null if no legacy data.
 */
export async function migrateLegacyData(): Promise<FranchiseId | null> {
  if (!(await hasLegacyData())) return null;

  // Create "Default Franchise"
  const franchiseId = await createFranchise('Default Franchise');
  const newDbName = getFranchiseDBName(franchiseId);

  // Get all legacy DB names
  const databases = await indexedDB.databases();
  const legacyDbs = databases.filter(
    (dbInfo) =>
      dbInfo.name &&
      !dbInfo.name.startsWith(DB_PREFIX) &&
      dbInfo.name !== META_DB_NAME &&
      dbInfo.name.startsWith('kbl-')
  );

  // Open each legacy DB and copy all stores into the new franchise DB
  for (const legacyDbInfo of legacyDbs) {
    if (!legacyDbInfo.name) continue;

    try {
      const legacyDb = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(legacyDbInfo.name!);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });

      const storeNames = Array.from(legacyDb.objectStoreNames);
      if (storeNames.length === 0) {
        legacyDb.close();
        continue;
      }

      // Read all data from legacy DB
      const legacyData: Record<string, unknown[]> = {};
      for (const storeName of storeNames) {
        const records: unknown[] = await new Promise((resolve, reject) => {
          const tx = legacyDb.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.getAll();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result || []);
        });
        legacyData[storeName] = records;
      }

      legacyDb.close();

      // Write to new franchise DB — we need to handle the case where
      // the new DB may not have these stores yet
      const newDb = await new Promise<IDBDatabase>((resolve, reject) => {
        const currentVersion = legacyDbInfo.version ?? 1;
        const request = indexedDB.open(newDbName, currentVersion);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          for (const storeName of storeNames) {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { autoIncrement: true });
            }
          }
        };

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });

      for (const [storeName, records] of Object.entries(legacyData)) {
        if (records.length === 0) continue;
        if (!newDb.objectStoreNames.contains(storeName)) continue;

        await new Promise<void>((resolve, reject) => {
          const tx = newDb.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          for (const record of records) {
            store.put(record);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      newDb.close();
    } catch (err) {
      console.warn(`[franchiseManager] Failed to migrate ${legacyDbInfo.name}:`, err);
      // Continue with other DBs — partial migration is better than none
    }
  }

  // Set as active franchise
  await setActiveFranchise(franchiseId);

  return franchiseId;
}

// ============================================
// RESET (for testing)
// ============================================

/**
 * Reset the meta DB singleton (useful for tests).
 */
export function resetMetaDb(): void {
  metaDbPromise = null;
  activeFranchiseDb = null;
  activeFranchiseId = null;
}
