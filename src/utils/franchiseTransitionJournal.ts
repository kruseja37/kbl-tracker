import { clearFranchiseSeasonSchedule } from './scheduleStorage';
import { deleteSeasonMetadata } from './seasonStorage';
import { syncEngine } from './syncEngine';

const DB_NAME = 'kbl-franchise-transition-journal';
const DB_VERSION = 1;
const STORE_NAME = 'transitionJournals';

export type FranchiseTransitionJournalStatus =
  | 'pending'
  | 'committed'
  | 'rolled_back'
  | 'failed';

export interface FranchiseTransitionJournalError {
  stage: string;
  message: string;
}

export interface FranchiseTransitionJournalDiagnostics {
  failedStage?: string;
  transitionResultSummary?: Record<string, unknown>;
  transitionSteps?: Array<Record<string, unknown>>;
  playerSideEffectsPossible?: boolean;
  metadataRollbackAttempted?: boolean;
  metadataRollbackSucceeded?: boolean;
  metadataRollbackError?: string;
  rollbackCleanupErrors?: string[];
}

export interface FranchiseTransitionJournalRecord {
  id: string;
  franchiseId: string;
  fromSeasonNumber: number;
  toSeasonNumber: number;
  fromSeasonId: string;
  toSeasonId: string;
  createdSummaryId?: string;
  stagedScheduleIds: string[];
  stagedSeasonMetadataId?: string;
  status: FranchiseTransitionJournalStatus;
  error?: FranchiseTransitionJournalError;
  diagnostics?: FranchiseTransitionJournalDiagnostics;
  createdAt: number;
  updatedAt: number;
  committedAt?: number;
  rolledBackAt?: number;
  failedAt?: number;
}

export interface FranchiseTransitionReadiness {
  status: 'clear' | 'attention_required';
  journals: FranchiseTransitionJournalRecord[];
}

let dbInstance: IDBDatabase | null = null;

function makeJournalId(franchiseId: string, fromSeasonNumber: number, toSeasonNumber: number): string {
  return `transition-${franchiseId}-${fromSeasonNumber}-${toSeasonNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeError(stage: string, error: unknown): FranchiseTransitionJournalError {
  return {
    stage,
    message: error instanceof Error ? error.message : String(error || 'Unknown transition error'),
  };
}

async function initTransitionJournalDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('franchiseId', 'franchiseId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('franchiseStatus', ['franchiseId', 'status'], { unique: false });
      }
    };
  });
}

async function putJournal(record: FranchiseTransitionJournalRecord): Promise<FranchiseTransitionJournalRecord> {
  const db = await initTransitionJournalDatabase();
  const next = { ...record, updatedAt: Date.now() };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(next);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) {
        syncEngine.upsert(DB_NAME, STORE_NAME, next.id, next);
      }
      resolve(next);
    };
  });
}

export async function createFranchiseTransitionJournal(input: {
  franchiseId: string;
  fromSeasonNumber: number;
  toSeasonNumber: number;
  fromSeasonId: string;
  toSeasonId: string;
}): Promise<FranchiseTransitionJournalRecord> {
  const now = Date.now();
  const record: FranchiseTransitionJournalRecord = {
    id: makeJournalId(input.franchiseId, input.fromSeasonNumber, input.toSeasonNumber),
    franchiseId: input.franchiseId,
    fromSeasonNumber: input.fromSeasonNumber,
    toSeasonNumber: input.toSeasonNumber,
    fromSeasonId: input.fromSeasonId,
    toSeasonId: input.toSeasonId,
    stagedScheduleIds: [],
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  return putJournal(record);
}

export async function getFranchiseTransitionJournal(
  journalId: string,
): Promise<FranchiseTransitionJournalRecord | null> {
  const db = await initTransitionJournalDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(journalId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function listFranchiseTransitionJournals(
  franchiseId: string,
): Promise<FranchiseTransitionJournalRecord[]> {
  const db = await initTransitionJournalDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const records = (request.result || [])
        .filter((record: FranchiseTransitionJournalRecord) => record.franchiseId === franchiseId)
        .sort((a: FranchiseTransitionJournalRecord, b: FranchiseTransitionJournalRecord) => b.createdAt - a.createdAt);
      resolve(records);
    };
  });
}

export async function recordTransitionSummary(
  journalId: string,
  createdSummaryId: string,
): Promise<FranchiseTransitionJournalRecord> {
  const record = await getFranchiseTransitionJournal(journalId);
  if (!record) throw new Error(`Transition journal not found: ${journalId}`);
  return putJournal({ ...record, createdSummaryId });
}

export async function recordTransitionStaging(
  journalId: string,
  staging: {
    stagedScheduleIds?: string[];
    stagedSeasonMetadataId?: string;
  },
): Promise<FranchiseTransitionJournalRecord> {
  const record = await getFranchiseTransitionJournal(journalId);
  if (!record) throw new Error(`Transition journal not found: ${journalId}`);
  return putJournal({
    ...record,
    stagedScheduleIds: staging.stagedScheduleIds ?? record.stagedScheduleIds,
    stagedSeasonMetadataId: staging.stagedSeasonMetadataId ?? record.stagedSeasonMetadataId,
  });
}

export async function commitFranchiseTransitionJournal(
  journalId: string,
): Promise<FranchiseTransitionJournalRecord> {
  const record = await getFranchiseTransitionJournal(journalId);
  if (!record) throw new Error(`Transition journal not found: ${journalId}`);
  const committedAt = Date.now();
  return putJournal({
    ...record,
    status: 'committed',
    committedAt,
    error: undefined,
  });
}

export async function failFranchiseTransitionJournal(
  journalId: string,
  stage: string,
  error: unknown,
  diagnostics?: FranchiseTransitionJournalDiagnostics,
): Promise<FranchiseTransitionJournalRecord> {
  const record = await getFranchiseTransitionJournal(journalId);
  if (!record) throw new Error(`Transition journal not found: ${journalId}`);
  const failedAt = Date.now();
  return putJournal({
    ...record,
    status: 'failed',
    failedAt,
    error: normalizeError(stage, error),
    diagnostics: diagnostics ? { ...record.diagnostics, ...diagnostics, failedStage: stage } : record.diagnostics,
  });
}

export async function rollbackFranchiseTransitionStaging(
  journalIdOrRecord: string | FranchiseTransitionJournalRecord,
  stage: string,
  error?: unknown,
  diagnostics?: FranchiseTransitionJournalDiagnostics,
): Promise<FranchiseTransitionJournalRecord> {
  const record = typeof journalIdOrRecord === 'string'
    ? await getFranchiseTransitionJournal(journalIdOrRecord)
    : journalIdOrRecord;
  if (!record) throw new Error(`Transition journal not found: ${journalIdOrRecord}`);

  const cleanupErrors: string[] = [];
  try {
    await clearFranchiseSeasonSchedule(record.franchiseId, record.toSeasonNumber);
  } catch (cleanupErr) {
    cleanupErrors.push(normalizeError('rollback.schedule', cleanupErr).message);
  }

  try {
    await deleteSeasonMetadata(record.toSeasonId);
  } catch (cleanupErr) {
    cleanupErrors.push(normalizeError('rollback.seasonMetadata', cleanupErr).message);
  }

  const rolledBackAt = Date.now();
  const metadataRollbackFailed = diagnostics?.metadataRollbackAttempted === true
    && diagnostics.metadataRollbackSucceeded !== true;
  const failure = cleanupErrors.length > 0
    ? new Error(`${normalizeError(stage, error).message}; rollback cleanup failed: ${cleanupErrors.join('; ')}`)
    : metadataRollbackFailed
      ? new Error(`${normalizeError(stage, error).message}; metadata rollback failed: ${diagnostics?.metadataRollbackError || 'unknown error'}`)
    : error;

  return putJournal({
    ...record,
    status: cleanupErrors.length > 0 || metadataRollbackFailed ? 'failed' : 'rolled_back',
    rolledBackAt: cleanupErrors.length > 0 || metadataRollbackFailed ? undefined : rolledBackAt,
    failedAt: cleanupErrors.length > 0 || metadataRollbackFailed ? rolledBackAt : record.failedAt,
    error: failure ? normalizeError(stage, failure) : record.error,
    diagnostics: {
      ...record.diagnostics,
      ...diagnostics,
      failedStage: stage,
      rollbackCleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : diagnostics?.rollbackCleanupErrors,
    },
  });
}

export async function getFranchiseTransitionReadiness(
  franchiseId: string,
): Promise<FranchiseTransitionReadiness> {
  const records = await listFranchiseTransitionJournals(franchiseId);
  const actionable = records.filter((record) => (
    record.status === 'pending' || record.status === 'failed'
  ));

  return {
    status: actionable.length > 0 ? 'attention_required' : 'clear',
    journals: actionable,
  };
}

export async function resetFranchiseTransitionJournalDatabaseForTests(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
  });
}
