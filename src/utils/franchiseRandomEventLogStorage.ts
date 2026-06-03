import {
  type FranchiseRandomEventLogEntry,
  type FranchiseRandomEventLogEntryKind,
  type FranchiseRandomEventLogReport,
  type FranchiseRandomEventManualConfirmation,
} from './franchiseRandomEventLog';
import {
  applyFranchiseMoraleEffect,
  type ApplyFranchiseMoraleEffectResult,
  type FranchiseMoraleScope,
  type FranchiseMoraleTargetType,
} from './franchiseMoraleState';
import { syncEngine } from './syncEngine';

export const FRANCHISE_RANDOM_EVENT_LOG_STORAGE_VERSION = 'franchise-random-event-log-storage-v1';

export type FranchiseRandomEventConfirmationState = 'unconfirmed' | 'confirmed' | 'dismissed';
export type FranchiseRandomEventAppliedEffectState = 'none' | 'applied' | 'skipped' | 'failed';

export interface FranchiseRandomEventAppliedEffect {
  state: FranchiseRandomEventAppliedEffectState;
  targetType?: FranchiseMoraleTargetType;
  teamId?: string;
  playerId?: string;
  previousValue?: number | null;
  currentValue?: number | null;
  delta?: number;
  reason: string;
  blockers: string[];
  appliedAt?: string;
}

export interface FranchiseRandomEventLogRecord extends FranchiseMoraleScope {
  id: string;
  storageVersion: typeof FRANCHISE_RANDOM_EVENT_LOG_STORAGE_VERSION;
  kind: FranchiseRandomEventLogEntryKind;
  entry: FranchiseRandomEventLogEntry;
  confirmation: FranchiseRandomEventManualConfirmation;
  appliedEffect: FranchiseRandomEventAppliedEffect;
  narrativeReadableStatus: string;
  hiddenSafe: true;
  createdAt: string;
  lastModified: string;
}

export interface FranchiseRandomEventSafeEffectPreview {
  allowed: boolean;
  targetType?: FranchiseMoraleTargetType;
  teamId?: string;
  playerId?: string;
  delta: number;
  reason: string;
  warnings: string[];
  blockers: string[];
}

export interface FranchiseRandomEventSafeEffectTarget {
  targetTeamId?: string;
  targetPlayerId?: string;
  targetPlayerRevealState?: 'hidden' | 'revealed';
  targetPlayerCurrent?: boolean;
}

export interface ConfirmFranchiseRandomEventInput extends FranchiseRandomEventSafeEffectTarget {
  recordId: string;
  actorDisplayName?: string;
  note?: string;
  timestamp?: string;
}

const DB_NAME = 'kbl-franchise-random-events';
const DB_VERSION = 1;
const STORES = {
  RECORDS: 'randomEventEntries',
} as const;

let dbInstance: IDBDatabase | null = null;

export function resetFranchiseRandomEventLogDatabaseForTests(): void {
  dbInstance?.close();
  dbInstance = null;
}

function nowISO(): string {
  return new Date().toISOString();
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function ensureIndex(
  store: IDBObjectStore,
  name: string,
  keyPath: string | string[],
  options?: IDBIndexParameters,
): void {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, options);
  }
}

export async function initFranchiseRandomEventLogDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.RECORDS)) {
        store = db.createObjectStore(STORES.RECORDS, { keyPath: 'id' });
      } else {
        store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORES.RECORDS);
      }
      ensureIndex(store, 'by_franchise', 'franchiseId', { unique: false });
      ensureIndex(store, 'by_franchise_season', ['franchiseId', 'seasonId'], { unique: false });
      ensureIndex(store, 'by_scope_kind', ['franchiseId', 'seasonId', 'statsScopeId', 'kind'], { unique: false });
      ensureIndex(store, 'by_confirmation', ['franchiseId', 'seasonId', 'confirmation.state'], { unique: false });
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };
  });
}

function defaultAppliedEffect(): FranchiseRandomEventAppliedEffect {
  return {
    state: 'none',
    reason: 'No confirmed effect has been applied.',
    blockers: [],
  };
}

function confirmationStatus(confirmation: FranchiseRandomEventManualConfirmation): string {
  if (confirmation.state === 'confirmed') {
    return 'Confirmed by user. Narrative readers may use this prompt as confirmed context.';
  }
  if (confirmation.state === 'dismissed') {
    return 'Dismissed by user. Narrative readers should ignore this prompt.';
  }
  return 'Awaiting user review. No effects have been applied.';
}

function recordFromEntry(
  entry: FranchiseRandomEventLogEntry,
  timestamp: string,
  existing?: FranchiseRandomEventLogRecord,
): FranchiseRandomEventLogRecord {
  const confirmation = existing?.confirmation ?? entry.confirmation;
  const appliedEffect = existing?.appliedEffect ?? defaultAppliedEffect();
  return {
    id: entry.id,
    storageVersion: FRANCHISE_RANDOM_EVENT_LOG_STORAGE_VERSION,
    franchiseId: entry.franchiseId,
    seasonId: entry.seasonId,
    statsScopeId: entry.statsScopeId,
    seasonNumber: entry.seasonNumber,
    kind: entry.kind,
    entry,
    confirmation,
    appliedEffect,
    narrativeReadableStatus: confirmationStatus(confirmation),
    hiddenSafe: true,
    createdAt: existing?.createdAt ?? timestamp,
    lastModified: existing?.lastModified ?? timestamp,
  };
}

async function saveRecord(record: FranchiseRandomEventLogRecord): Promise<FranchiseRandomEventLogRecord> {
  const db = await initFranchiseRandomEventLogDatabase();
  const tx = db.transaction(STORES.RECORDS, 'readwrite');
  tx.objectStore(STORES.RECORDS).put(record);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORES.RECORDS, record.id, record);
  }

  return record;
}

export async function getFranchiseRandomEventLogRecord(
  recordId: string,
): Promise<FranchiseRandomEventLogRecord | null> {
  const db = await initFranchiseRandomEventLogDatabase();
  const tx = db.transaction(STORES.RECORDS, 'readonly');
  const record = await requestToPromise<FranchiseRandomEventLogRecord | undefined>(
    tx.objectStore(STORES.RECORDS).get(recordId),
  );
  return record ?? null;
}

export async function listFranchiseRandomEventLogRecords(
  franchiseId: string,
  seasonId: string,
  statsScopeId: string,
  seasonNumber: number,
): Promise<FranchiseRandomEventLogRecord[]> {
  const db = await initFranchiseRandomEventLogDatabase();
  const tx = db.transaction(STORES.RECORDS, 'readonly');
  const records = await requestToPromise<FranchiseRandomEventLogRecord[]>(
    tx.objectStore(STORES.RECORDS).index('by_franchise_season').getAll([franchiseId, seasonId]),
  );
  return (records ?? [])
    .filter((record) =>
      record.statsScopeId === statsScopeId &&
      record.seasonNumber === seasonNumber,
    )
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function syncFranchiseRandomEventLogFromReport(
  report: FranchiseRandomEventLogReport,
  timestamp = nowISO(),
): Promise<FranchiseRandomEventLogRecord[]> {
  const saved: FranchiseRandomEventLogRecord[] = [];
  for (const entry of report.entries) {
    const existing = await getFranchiseRandomEventLogRecord(entry.id);
    const record = recordFromEntry(entry, timestamp, existing ?? undefined);
    saved.push(await saveRecord(record));
  }
  return saved;
}

export function classifyFranchiseRandomEventSafeEffect(
  record: FranchiseRandomEventLogRecord,
  target: FranchiseRandomEventSafeEffectTarget = {},
): FranchiseRandomEventSafeEffectPreview {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const targetTeamId = target.targetTeamId ?? record.entry.evidenceReferences.find((ref) => ref.teamId)?.teamId;
  const targetPlayerId = target.targetPlayerId ?? record.entry.evidenceReferences.find((ref) => ref.playerId)?.playerId;

  if (record.entry.status === 'blocked' || record.entry.blockers.length > 0) {
    blockers.push('Prompt is blocked and cannot apply morale effects.');
  }
  if (record.confirmation.state === 'dismissed') {
    blockers.push('Prompt has been dismissed.');
  }
  if (target.targetPlayerRevealState === 'hidden') {
    blockers.push('Unrevealed FARM/prospect hidden truth cannot receive morale effects.');
  }
  if (targetPlayerId && target.targetPlayerCurrent === false) {
    blockers.push('Player morale requires a current/revealed franchise player target.');
  }

  if (record.kind === 'score-only-context') {
    if (targetPlayerId) {
      warnings.push('Score-only confirmation cannot apply player morale.');
    }
    if (!targetTeamId) {
      blockers.push('Score-only confirmation requires an explicit team fan morale target.');
    }
    return {
      allowed: blockers.length === 0,
      targetType: 'team-fan',
      teamId: targetTeamId,
      delta: blockers.length === 0 ? 1 : 0,
      reason: 'Confirmed score-only result context may adjust team fan morale only.',
      warnings,
      blockers,
    };
  }

  if (targetPlayerId && target.targetPlayerRevealState === 'revealed' && target.targetPlayerCurrent !== false) {
    return {
      allowed: blockers.length === 0,
      targetType: 'player',
      playerId: targetPlayerId,
      delta: blockers.length === 0 ? 1 : 0,
      reason: 'Confirmed player-scoped event context may adjust revealed/current player morale.',
      warnings,
      blockers,
    };
  }

  if (targetTeamId) {
    return {
      allowed: blockers.length === 0,
      targetType: 'team-fan',
      teamId: targetTeamId,
      delta: blockers.length === 0 ? 1 : 0,
      reason: record.kind === 'stadium-spray-context'
        ? 'Confirmed stadium spray context may adjust team fan morale as story context.'
        : 'Confirmed team-scoped event context may adjust team fan morale.',
      warnings,
      blockers,
    };
  }

  blockers.push('No explicit team or revealed/current player morale target was provided.');
  return {
    allowed: false,
    delta: 0,
    reason: 'No safe morale effect target is available.',
    warnings,
    blockers,
  };
}

function appliedEffectFromMoraleResult(
  preview: FranchiseRandomEventSafeEffectPreview,
  result: ApplyFranchiseMoraleEffectResult,
  timestamp: string,
): FranchiseRandomEventAppliedEffect {
  return {
    state: result.status,
    targetType: preview.targetType,
    teamId: preview.teamId,
    playerId: preview.playerId,
    previousValue: result.previousValue,
    currentValue: result.currentValue,
    delta: result.delta,
    reason: result.reason,
    blockers: result.blockers,
    appliedAt: timestamp,
  };
}

export async function confirmFranchiseRandomEventLogRecord(
  input: ConfirmFranchiseRandomEventInput,
): Promise<FranchiseRandomEventLogRecord> {
  const record = await getFranchiseRandomEventLogRecord(input.recordId);
  if (!record) {
    throw new Error(`Random event log record not found: ${input.recordId}`);
  }
  if (record.confirmation.state !== 'unconfirmed') {
    return record;
  }

  const timestamp = input.timestamp ?? nowISO();
  const preview = classifyFranchiseRandomEventSafeEffect(record, input);
  let appliedEffect: FranchiseRandomEventAppliedEffect;

  if (preview.allowed && preview.targetType && (preview.teamId || preview.playerId)) {
    const moraleResult = await applyFranchiseMoraleEffect({
      franchiseId: record.franchiseId,
      seasonId: record.seasonId,
      statsScopeId: record.statsScopeId,
      seasonNumber: record.seasonNumber,
      targetType: preview.targetType,
      teamId: preview.teamId,
      playerId: preview.playerId,
      delta: preview.delta,
      reason: preview.reason,
      sourceEventId: record.id,
      sourceKind: 'random-event-confirmation',
      actorDisplayName: input.actorDisplayName ?? 'User',
      timestamp,
    });
    appliedEffect = appliedEffectFromMoraleResult(preview, moraleResult, timestamp);
  } else {
    appliedEffect = {
      state: 'skipped',
      targetType: preview.targetType,
      teamId: preview.teamId,
      playerId: preview.playerId,
      delta: 0,
      reason: preview.reason,
      blockers: preview.blockers,
      appliedAt: timestamp,
    };
  }

  const confirmation: FranchiseRandomEventManualConfirmation = {
    ...record.confirmation,
    state: 'confirmed',
    checked: true,
    confirmedAt: timestamp,
    actorDisplayName: input.actorDisplayName ?? 'User',
    note: input.note,
  };

  return saveRecord({
    ...record,
    confirmation,
    appliedEffect,
    narrativeReadableStatus: confirmationStatus(confirmation),
    lastModified: timestamp,
  });
}

export async function dismissFranchiseRandomEventLogRecord(
  recordId: string,
  actorDisplayName = 'User',
  note?: string,
  timestamp = nowISO(),
): Promise<FranchiseRandomEventLogRecord> {
  const record = await getFranchiseRandomEventLogRecord(recordId);
  if (!record) {
    throw new Error(`Random event log record not found: ${recordId}`);
  }
  if (record.confirmation.state !== 'unconfirmed') {
    return record;
  }
  const confirmation: FranchiseRandomEventManualConfirmation = {
    ...record.confirmation,
    state: 'dismissed',
    checked: false,
    actorDisplayName,
    note,
  };
  return saveRecord({
    ...record,
    confirmation,
    appliedEffect: {
      state: 'skipped',
      reason: 'Prompt dismissed by user.',
      blockers: [],
      appliedAt: timestamp,
    },
    narrativeReadableStatus: confirmationStatus(confirmation),
    lastModified: timestamp,
  });
}
