/**
 * Manual Backup/Restore Utility
 *
 * Modern v2 backup format for launch-era IndexedDB data.
 * Legacy pre-launch backup JSON is intentionally unsupported because local
 * save data will be cleared before launch and should not be migrated forward.
 */

// ============================================
// TYPES
// ============================================

type KeyPath = string | string[];

interface IndexSchema {
  name: string;
  keyPath: KeyPath;
  options?: IDBIndexParameters;
}

interface StoreSchema {
  keyPath: KeyPath;
  indexes?: IndexSchema[];
  optional?: boolean;
}

interface DatabaseSchema {
  version: number;
  stores: Record<string, StoreSchema>;
  includedStores?: string[];
}

interface OpenDatabaseWithSchemaOptions {
  allowRecreate?: boolean;
  requireDeclaredVersion?: boolean;
}

export interface BackupData {
  kblBackupVersion: number;
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

export const KBL_BACKUP_VERSION = 2;

const DYNAMIC_ELIMINATION_DB_PREFIX = 'kbl-elimination-';

const trackerStores: Record<string, StoreSchema> = {
  currentGame: { keyPath: 'id' },
  completedGames: {
    keyPath: 'gameId',
    indexes: [
      { name: 'date', keyPath: 'date' },
      { name: 'seasonId', keyPath: 'seasonId' },
    ],
  },
  playerGameStats: {
    keyPath: ['gameId', 'playerId'],
    indexes: [
      { name: 'playerId', keyPath: 'playerId' },
      { name: 'gameId', keyPath: 'gameId' },
    ],
  },
  pitcherGameStats: {
    keyPath: ['gameId', 'pitcherId'],
    indexes: [
      { name: 'pitcherId', keyPath: 'pitcherId' },
      { name: 'gameId', keyPath: 'gameId' },
    ],
  },
  playerSeasonBatting: {
    keyPath: ['seasonId', 'playerId'],
    indexes: [
      { name: 'playerId', keyPath: 'playerId' },
      { name: 'seasonId', keyPath: 'seasonId' },
      { name: 'teamId', keyPath: 'teamId' },
    ],
  },
  playerSeasonPitching: {
    keyPath: ['seasonId', 'playerId'],
    indexes: [
      { name: 'playerId', keyPath: 'playerId' },
      { name: 'seasonId', keyPath: 'seasonId' },
      { name: 'teamId', keyPath: 'teamId' },
    ],
  },
  playerSeasonFielding: {
    keyPath: ['seasonId', 'playerId'],
    indexes: [
      { name: 'playerId', keyPath: 'playerId' },
      { name: 'seasonId', keyPath: 'seasonId' },
    ],
  },
  seasonMetadata: {
    keyPath: 'seasonId',
    indexes: [{ name: 'status', keyPath: 'status' }],
  },
  playerCareerBatting: {
    keyPath: 'playerId',
    indexes: [
      { name: 'teamId', keyPath: 'teamId' },
      { name: 'homeRuns', keyPath: 'homeRuns' },
      { name: 'hits', keyPath: 'hits' },
    ],
  },
  playerCareerPitching: {
    keyPath: 'playerId',
    indexes: [
      { name: 'teamId', keyPath: 'teamId' },
      { name: 'wins', keyPath: 'wins' },
      { name: 'strikeouts', keyPath: 'strikeouts' },
    ],
  },
  playerCareerFielding: {
    keyPath: 'playerId',
    indexes: [{ name: 'teamId', keyPath: 'teamId' }],
  },
  careerMilestones: {
    keyPath: 'id',
    indexes: [
      { name: 'playerId', keyPath: 'playerId' },
      { name: 'milestoneType', keyPath: 'milestoneType' },
      { name: 'achievedDate', keyPath: 'achievedDate' },
    ],
  },
  rosterSnapshots: {
    keyPath: 'key',
    indexes: [
      { name: 'eliminationId', keyPath: 'eliminationId' },
      { name: 'teamId', keyPath: 'teamId' },
    ],
  },
  mojoFitnessSnapshots: {
    keyPath: ['eliminationId', 'playerId'],
    indexes: [{ name: 'eliminationId', keyPath: 'eliminationId' }],
  },
  almanacCanonicalPlayers: {
    keyPath: 'canonicalId',
    indexes: [{ name: 'playerName', keyPath: 'playerName' }],
  },
  eliminationRunFameAggregates: { keyPath: 'runId' },
  eliminationAllTimePlayerStats: { keyPath: 'playerId' },
  reporterPlayerAlmanacCaches: {
    keyPath: 'cacheKey',
    indexes: [
      { name: 'playerId', keyPath: 'playerId' },
      { name: 'instanceId', keyPath: 'instanceId' },
    ],
  },
  reporterTeamAlmanacCaches: {
    keyPath: 'cacheKey',
    indexes: [
      { name: 'teamId', keyPath: 'teamId' },
      { name: 'instanceId', keyPath: 'instanceId' },
    ],
  },
  reporterAlmanacEntries: {
    keyPath: 'id',
    indexes: [
      { name: 'entityKey', keyPath: 'entityKey' },
      { name: 'entityType', keyPath: 'entityType' },
      { name: 'entityId', keyPath: 'entityId' },
      { name: 'timestamp', keyPath: 'timestamp' },
    ],
  },
  reporterLegacySummaryJobs: {
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'entityKey', keyPath: 'entityKey' },
      { name: 'queuedAt', keyPath: 'queuedAt' },
    ],
  },
  llmUsageLog: {
    keyPath: 'id',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'gameId', keyPath: 'gameId' },
      { name: 'mode', keyPath: 'mode' },
      { name: 'intensity', keyPath: 'intensity' },
      { name: 'model', keyPath: 'model' },
      { name: 'purpose', keyPath: 'purpose' },
    ],
  },
  userPreferences: { keyPath: 'key' },
  reporters: {
    keyPath: 'id',
    indexes: [
      { name: 'teamId', keyPath: 'teamId' },
      { name: 'leagueId', keyPath: 'leagueId' },
      { name: 'changed_at', keyPath: 'changed_at' },
    ],
  },
  gameStories: {
    keyPath: 'id',
    indexes: [
      { name: 'gameId', keyPath: 'gameId' },
      { name: 'reporterId', keyPath: 'reporterId' },
      { name: 'teamId', keyPath: 'teamId' },
      { name: 'leagueId', keyPath: 'leagueId' },
      { name: 'opponentTeamId', keyPath: 'opponentTeamId' },
      { name: 'gameMode', keyPath: 'gameMode' },
      { name: 'gameDate', keyPath: 'gameDate' },
      { name: 'changed_at', keyPath: 'changed_at' },
    ],
  },
  narrativeContext: {
    keyPath: 'id',
    indexes: [
      { name: 'teamId', keyPath: 'teamId' },
      { name: 'leagueId', keyPath: 'leagueId' },
      { name: 'gameMode', keyPath: 'gameMode' },
      { name: 'teamId_gameMode', keyPath: ['teamId', 'gameMode'] },
      { name: 'changed_at', keyPath: 'changed_at' },
    ],
  },
  rivalryScores: {
    keyPath: 'id',
    indexes: [
      { name: 'teamId', keyPath: 'teamId' },
      { name: 'leagueId', keyPath: 'leagueId' },
      { name: 'rivalTeamId', keyPath: 'rivalTeamId' },
      { name: 'teamId_rivalTeamId', keyPath: ['teamId', 'rivalTeamId'] },
      { name: 'changed_at', keyPath: 'changed_at' },
    ],
  },
  commentaryFeedEntries: {
    keyPath: 'id',
    indexes: [
      { name: 'gameId', keyPath: 'gameId' },
      { name: 'reporterId', keyPath: 'reporterId' },
      { name: 'leagueId', keyPath: 'leagueId' },
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'changed_at', keyPath: 'changed_at' },
      { name: 'gameId_timestamp', keyPath: ['gameId', 'timestamp'] },
    ],
  },
};

const STATIC_DATABASE_SCHEMAS: Record<string, DatabaseSchema> = {
  'kbl-tracker': {
    version: 11,
    stores: trackerStores,
  },
  'kbl-playoffs': {
    version: 3,
    stores: {
      playoffs: {
        keyPath: 'id',
        indexes: [
          { name: 'seasonNumber', keyPath: 'seasonNumber' },
          { name: 'status', keyPath: 'status' },
        ],
      },
      series: {
        keyPath: 'id',
        indexes: [
          { name: 'playoffId', keyPath: 'playoffId' },
          { name: 'round', keyPath: 'round' },
          { name: 'status', keyPath: 'status' },
        ],
      },
      playoffGames: {
        keyPath: 'id',
        indexes: [
          { name: 'playoffId', keyPath: 'playoffId' },
          { name: 'seriesId', keyPath: 'seriesId' },
        ],
      },
      playoffStats: {
        keyPath: 'id',
        indexes: [
          { name: 'playoffId', keyPath: 'playoffId' },
          { name: 'playerId', keyPath: 'playerId' },
          { name: 'teamId', keyPath: 'teamId' },
        ],
      },
    },
  },
  'kbl-event-log': {
    version: 3,
    stores: {
      gameHeaders: {
        keyPath: 'gameId',
        indexes: [
          { name: 'seasonId', keyPath: 'seasonId' },
          { name: 'date', keyPath: 'date' },
          { name: 'aggregated', keyPath: 'aggregated' },
          { name: 'seasonId_aggregated', keyPath: ['seasonId', 'aggregated'] },
        ],
      },
      atBatEvents: {
        keyPath: 'eventId',
        indexes: [
          { name: 'gameId', keyPath: 'gameId' },
          { name: 'gameId_eventIndex', keyPath: ['gameId', 'eventIndex'], options: { unique: true } },
          { name: 'batterId', keyPath: 'batterId' },
          { name: 'pitcherId', keyPath: 'pitcherId' },
        ],
      },
      pitchingAppearances: {
        keyPath: 'appearanceId',
        indexes: [
          { name: 'gameId', keyPath: 'gameId' },
          { name: 'pitcherId', keyPath: 'pitcherId' },
        ],
      },
      fieldingEvents: {
        keyPath: 'fieldingEventId',
        indexes: [
          { name: 'gameId', keyPath: 'gameId' },
          { name: 'playerId', keyPath: 'playerId' },
          { name: 'atBatEventId', keyPath: 'atBatEventId' },
        ],
      },
      betweenPlayEvents: {
        keyPath: 'eventId',
        indexes: [
          { name: 'gameId', keyPath: 'gameId' },
          { name: 'type', keyPath: 'type' },
        ],
      },
    },
  },
  'kbl-app-meta': {
    version: 3,
    stores: {
      franchiseList: { keyPath: 'franchiseId' },
      appSettings: { keyPath: 'key' },
      franchiseConfigs: { keyPath: 'franchiseId' },
      eliminationList: { keyPath: 'eliminationId' },
    },
    includedStores: ['eliminationList'],
  },
  'kbl-manager-identity': {
    version: 1,
    stores: {
      managerProfiles: {
        keyPath: 'managerId',
        indexes: [
          { name: 'displayName', keyPath: 'displayName' },
          { name: 'defaultManager', keyPath: 'defaultManager' },
        ],
      },
      managerAssignments: {
        keyPath: ['mode', 'instanceId', 'teamId'],
        indexes: [
          { name: 'managerId', keyPath: 'managerId' },
          { name: 'teamId', keyPath: 'teamId' },
          { name: 'mode_instanceId', keyPath: ['mode', 'instanceId'] },
        ],
      },
    },
  },
  'kbl-league-builder': {
    version: 4,
    stores: {
      leagueTemplates: {
        keyPath: 'id',
        indexes: [{ name: 'name', keyPath: 'name' }],
      },
      globalTeams: {
        keyPath: 'id',
        indexes: [
          { name: 'name', keyPath: 'name' },
          { name: 'abbreviation', keyPath: 'abbreviation' },
        ],
      },
      globalPlayers: {
        keyPath: 'id',
        indexes: [
          { name: 'lastName', keyPath: 'lastName' },
          { name: 'primaryPosition', keyPath: 'primaryPosition' },
          { name: 'overallGrade', keyPath: 'overallGrade' },
        ],
      },
      rulesPresets: {
        keyPath: 'id',
        indexes: [
          { name: 'name', keyPath: 'name' },
          { name: 'isDefault', keyPath: 'isDefault' },
        ],
      },
      teamRosters: { keyPath: 'teamId' },
      leaguePlayerOverrides: {
        keyPath: 'id',
        indexes: [
          { name: 'leagueId', keyPath: 'leagueId' },
          { name: 'playerId', keyPath: 'playerId' },
        ],
      },
    },
    includedStores: ['leaguePlayerOverrides'],
  },
};

const DYNAMIC_ELIMINATION_SCHEMA: DatabaseSchema = {
  version: 1,
  stores: {
    players: { keyPath: 'id' },
    teams: { keyPath: 'id' },
  },
};

// ============================================
// SCHEMA HELPERS
// ============================================

function getIncludedStoreNames(schema: DatabaseSchema): string[] {
  return schema.includedStores ?? Object.keys(schema.stores);
}

function getRequiredPayloadStoreNames(schema: DatabaseSchema): string[] {
  return getIncludedStoreNames(schema).filter((storeName) => !schema.stores[storeName]?.optional);
}

function canSafelyRecreateDatabase(schema: DatabaseSchema): boolean {
  const includedStoreNames = getIncludedStoreNames(schema);
  const allStoreNames = Object.keys(schema.stores);
  return (
    includedStoreNames.length === allStoreNames.length &&
    allStoreNames.every((storeName) => includedStoreNames.includes(storeName))
  );
}

function keyPathsEqual(left: IDBValidKey | string[] | null, right: KeyPath): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function indexMatches(index: IDBIndex, schema: IndexSchema): boolean {
  return (
    keyPathsEqual(index.keyPath, schema.keyPath) &&
    index.unique === Boolean(schema.options?.unique) &&
    index.multiEntry === Boolean(schema.options?.multiEntry)
  );
}

function applyStoreSchema(
  db: IDBDatabase,
  tx: IDBTransaction,
  storeName: string,
  schema: StoreSchema,
): void {
  let store: IDBObjectStore;

  if (db.objectStoreNames.contains(storeName)) {
    store = tx.objectStore(storeName);
    if (!keyPathsEqual(store.keyPath, schema.keyPath)) {
      db.deleteObjectStore(storeName);
      store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
    }
  } else {
    store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
  }

  for (const indexSchema of schema.indexes ?? []) {
    if (store.indexNames.contains(indexSchema.name)) {
      const existing = store.index(indexSchema.name);
      if (!indexMatches(existing, indexSchema)) {
        store.deleteIndex(indexSchema.name);
      } else {
        continue;
      }
    }

    store.createIndex(indexSchema.name, indexSchema.keyPath, indexSchema.options);
  }
}

function applyDatabaseSchema(
  db: IDBDatabase,
  tx: IDBTransaction,
  schema: DatabaseSchema,
): void {
  for (const [storeName, storeSchema] of Object.entries(schema.stores)) {
    applyStoreSchema(db, tx, storeName, storeSchema);
  }
}

function getSchemaIssues(dbName: string, db: IDBDatabase, schema: DatabaseSchema): string[] {
  const issues: string[] = [];
  const requiredStoreNames = Object.entries(schema.stores)
    .filter(([, storeSchema]) => !storeSchema.optional)
    .map(([storeName]) => storeName);
  const existingRequiredStoreNames = requiredStoreNames.filter((storeName) =>
    db.objectStoreNames.contains(storeName),
  );
  const tx =
    existingRequiredStoreNames.length > 0
      ? db.transaction(existingRequiredStoreNames, 'readonly')
      : undefined;

  for (const storeName of requiredStoreNames) {
    const storeSchema = schema.stores[storeName];
    if (!db.objectStoreNames.contains(storeName)) {
      issues.push(`${dbName}.${storeName} store is missing`);
      continue;
    }

    const store = tx?.objectStore(storeName);
    if (!store) {
      issues.push(`${dbName}.${storeName} store could not be inspected`);
      continue;
    }

    if (!keyPathsEqual(store.keyPath, storeSchema.keyPath)) {
      issues.push(`${dbName}.${storeName} keyPath is invalid`);
    }

    for (const indexSchema of storeSchema.indexes ?? []) {
      if (!store.indexNames.contains(indexSchema.name)) {
        issues.push(`${dbName}.${storeName}.${indexSchema.name} index is missing`);
        continue;
      }

      const index = store.index(indexSchema.name);
      if (!indexMatches(index, indexSchema)) {
        issues.push(`${dbName}.${storeName}.${indexSchema.name} index is invalid`);
      }
    }
  }

  return issues;
}

function formatSchemaError(prefix: string, dbName: string, issues: string[]): Error {
  return new Error(`${prefix} for ${dbName}: ${issues.join('; ')}`);
}

function isVersionError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'VersionError'
    : typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name?: unknown }).name === 'VersionError';
}

function openIndexedDatabase(
  dbName: string,
  version?: number,
  onUpgradeNeeded?: (db: IDBDatabase, tx: IDBTransaction) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request =
      typeof version === 'number'
        ? indexedDB.open(dbName, version)
        : indexedDB.open(dbName);

    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      if (!tx || !onUpgradeNeeded) return;
      onUpgradeNeeded(db, tx);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error(`Failed to open database ${dbName}`));
    request.onblocked = () => reject(new Error(`Opening database ${dbName} was blocked`));
  });
}

function deleteDatabase(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error(`Failed to delete database ${dbName}`));
    request.onblocked = () => reject(new Error(`Deleting database ${dbName} was blocked`));
  });
}

async function recreateDatabaseWithSchema(
  dbName: string,
  schema: DatabaseSchema,
): Promise<IDBDatabase> {
  await deleteDatabase(dbName);
  return openIndexedDatabase(dbName, schema.version, (upgradeDb, tx) => {
    applyDatabaseSchema(upgradeDb, tx, schema);
  });
}

function openDatabaseWithSchema(
  dbName: string,
  schema: DatabaseSchema,
  options: OpenDatabaseWithSchemaOptions = {},
): Promise<IDBDatabase> {
  return openDatabaseWithSchemaRepair(dbName, schema, options);
}

async function openDatabaseWithSchemaRepair(
  dbName: string,
  schema: DatabaseSchema,
  options: OpenDatabaseWithSchemaOptions,
): Promise<IDBDatabase> {
  let db: IDBDatabase;

  try {
    db = await openIndexedDatabase(dbName, schema.version, (upgradeDb, tx) => {
      applyDatabaseSchema(upgradeDb, tx, schema);
    });
  } catch (error) {
    if (!isVersionError(error)) throw error;
    db = await openIndexedDatabase(dbName);
  }

  const issues = getSchemaIssues(dbName, db, schema);
  if (options.requireDeclaredVersion && db.version !== schema.version) {
    issues.push(`${dbName} version ${db.version} does not match expected ${schema.version}`);
  }

  if (issues.length === 0) return db;

  if (options.allowRecreate && canSafelyRecreateDatabase(schema)) {
    db.close();
    const recreatedDb = await recreateDatabaseWithSchema(dbName, schema);
    const recreateIssues = getSchemaIssues(dbName, recreatedDb, schema);

    if (recreateIssues.length > 0) {
      recreatedDb.close();
      throw formatSchemaError('Failed to repair IndexedDB schema', dbName, recreateIssues);
    }

    return recreatedDb;
  }

  db.close();

  throw formatSchemaError('IndexedDB schema validation failed', dbName, issues);
}

async function validateDatabaseSchemaAfterRestore(
  dbName: string,
  schema: DatabaseSchema,
): Promise<void> {
  const db = await openIndexedDatabase(dbName);

  try {
    const issues = getSchemaIssues(dbName, db, schema);
    if (issues.length > 0) {
      throw formatSchemaError('Post-restore schema validation failed', dbName, issues);
    }
  } finally {
    db.close();
  }
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

async function exportDatabase(
  dbName: string,
  schema: DatabaseSchema,
): Promise<Record<string, unknown[]>> {
  let db: IDBDatabase;
  try {
    db = await openDatabaseWithSchema(dbName, schema);
  } catch {
    return {};
  }

  try {
    const result: Record<string, unknown[]> = {};
    for (const storeName of getIncludedStoreNames(schema)) {
      if (!db.objectStoreNames.contains(storeName)) {
        result[storeName] = [];
        continue;
      }

      const tx = db.transaction(storeName, 'readonly');
      const records = await requestToPromise(tx.objectStore(storeName).getAll());
      await transactionToPromise(tx);
      result[storeName] = records ?? [];
    }
    return result;
  } finally {
    db.close();
  }
}

function getEliminationIdsFromBackup(backup: BackupData): string[] {
  const records = backup.databases['kbl-app-meta']?.eliminationList ?? [];
  return records
    .map((record) =>
      typeof record === 'object' && record !== null
        ? (record as { eliminationId?: unknown }).eliminationId
        : undefined
    )
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function hasStorePayload(data: Record<string, unknown[]> | undefined, storeName: string): boolean {
  return Boolean(data && Object.prototype.hasOwnProperty.call(data, storeName));
}

function getDatabasePayloadValidationError(
  dbName: string,
  schema: DatabaseSchema,
  data: Record<string, unknown[]> | undefined,
): string | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return `Backup is missing required database payload for ${dbName}`;
  }

  for (const storeName of getRequiredPayloadStoreNames(schema)) {
    if (!hasStorePayload(data, storeName)) {
      return `Backup is missing required store payload ${dbName}.${storeName}`;
    }
  }

  for (const storeName of getIncludedStoreNames(schema)) {
    if (!hasStorePayload(data, storeName)) continue;
    if (!Array.isArray(data[storeName])) {
      return `Backup store payload ${dbName}.${storeName} must be an array`;
    }
  }

  return undefined;
}

function getBackupPayloadValidationError(backup: BackupData): string | undefined {
  for (const [dbName, schema] of Object.entries(STATIC_DATABASE_SCHEMAS)) {
    const error = getDatabasePayloadValidationError(dbName, schema, backup.databases[dbName]);
    if (error) return error;
  }

  for (const eliminationId of getEliminationIdsFromBackup(backup)) {
    const dbName = `${DYNAMIC_ELIMINATION_DB_PREFIX}${eliminationId}`;
    const error = getDatabasePayloadValidationError(
      dbName,
      DYNAMIC_ELIMINATION_SCHEMA,
      backup.databases[dbName],
    );
    if (error) return error;
  }

  return undefined;
}

/**
 * Export all launch-era KBL data to a modern BackupData object.
 */
export async function exportAllData(): Promise<BackupData> {
  const backup: BackupData = {
    kblBackupVersion: KBL_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    databases: {},
  };

  for (const [dbName, schema] of Object.entries(STATIC_DATABASE_SCHEMAS)) {
    backup.databases[dbName] = await exportDatabase(dbName, schema);
  }

  for (const eliminationId of getEliminationIdsFromBackup(backup)) {
    const dbName = `${DYNAMIC_ELIMINATION_DB_PREFIX}${eliminationId}`;
    backup.databases[dbName] = await exportDatabase(dbName, DYNAMIC_ELIMINATION_SCHEMA);
  }

  return backup;
}

/**
 * Export data and trigger download.
 */
export async function downloadBackup(): Promise<BackupResult> {
  try {
    const backup = await exportAllData();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0];
    const filename = `kbl-backup-v${KBL_BACKUP_VERSION}-${date}.json`;

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

async function restoreDatabase(
  dbName: string,
  schema: DatabaseSchema,
  data: Record<string, unknown[]>,
): Promise<void> {
  const db = await openDatabaseWithSchema(dbName, schema, {
    allowRecreate: true,
    requireDeclaredVersion: true,
  });

  try {
    const schemaIssues = getSchemaIssues(dbName, db, schema);
    if (schemaIssues.length > 0) {
      throw formatSchemaError('IndexedDB schema is invalid before restore', dbName, schemaIssues);
    }

    const storeNames = getIncludedStoreNames(schema);

    for (const storeName of storeNames) {
      if (!hasStorePayload(data, storeName) && !schema.stores[storeName]?.optional) {
        throw new Error(`Backup is missing required store payload ${dbName}.${storeName}`);
      }

      const rows = hasStorePayload(data, storeName) ? data[storeName] : [];
      if (!Array.isArray(rows)) {
        throw new Error(`Backup store payload ${dbName}.${storeName} must be an array`);
      }

      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();

      for (const item of rows) {
        store.put(item);
      }

      await transactionToPromise(tx);
    }
  } finally {
    db.close();
  }
}

function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;

  const backup = data as Partial<BackupData> & { version?: unknown };
  if (backup.kblBackupVersion !== KBL_BACKUP_VERSION) return false;
  if (typeof backup.exportedAt !== 'string') return false;
  if (!backup.databases || typeof backup.databases !== 'object') return false;

  return true;
}

function getRestoreValidationError(data: unknown): string {
  if (
    data &&
    typeof data === 'object' &&
    'version' in data &&
    !('kblBackupVersion' in data)
  ) {
    return 'Legacy backup format is not supported for modern v2 restore.';
  }

  if (
    data &&
    typeof data === 'object' &&
    'kblBackupVersion' in data &&
    (data as { kblBackupVersion?: unknown }).kblBackupVersion !== KBL_BACKUP_VERSION
  ) {
    return `Unsupported backup format version. Expected ${KBL_BACKUP_VERSION}.`;
  }

  return 'Invalid backup file format';
}

/**
 * Restore all data from a modern BackupData object.
 */
export async function restoreAllData(backup: BackupData): Promise<RestoreResult> {
  if (!validateBackup(backup)) {
    return { success: false, error: getRestoreValidationError(backup) };
  }

  const payloadError = getBackupPayloadValidationError(backup);
  if (payloadError) {
    return { success: false, error: payloadError };
  }

  const restoredDatabases: string[] = [];
  const restoredSchemas: Array<{ dbName: string; schema: DatabaseSchema }> = [];

  try {
    for (const [dbName, schema] of Object.entries(STATIC_DATABASE_SCHEMAS)) {
      const dbData = backup.databases[dbName];

      await restoreDatabase(dbName, schema, dbData);
      restoredDatabases.push(dbName);
      restoredSchemas.push({ dbName, schema });
    }

    for (const eliminationId of getEliminationIdsFromBackup(backup)) {
      const dbName = `${DYNAMIC_ELIMINATION_DB_PREFIX}${eliminationId}`;
      const dbData = backup.databases[dbName];

      await restoreDatabase(dbName, DYNAMIC_ELIMINATION_SCHEMA, dbData);
      restoredDatabases.push(dbName);
      restoredSchemas.push({ dbName, schema: DYNAMIC_ELIMINATION_SCHEMA });
    }

    for (const { dbName, schema } of restoredSchemas) {
      await validateDatabaseSchemaAfterRestore(dbName, schema);
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
 * Read file and restore data.
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
 * Get backup statistics for UI display.
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
